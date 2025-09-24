const express = require("express");
const cors =require("cors");
const Docker = require("dockerode");
const fs = require("fs");
const path = require("path");
const fetch = require("node-fetch"); // <-- New dependency

const app = express();
const docker = new Docker();
const port = 8080;

// --- IMPORTANT: Paste your Gemini API Key here ---
const GEMINI_API_KEY = "AIzaSyBCGOrHhEjAcLoMGxO7H1RxqjGZamhWyEs"; // <-- PASTE YOUR KEY HERE

app.use(cors());
app.use(express.json());

// (The /api/runtimes and /api/execute endpoints remain unchanged)
// ...
app.get("/api/runtimes", (req, res) => {
  const runtimes = [
    { language: "python", version: "3.10.0", aliases: ["py"] },
    { language: "cpp", version: "10.2.0", aliases: [] },
    { language: "javascript", version: "18.15.0", aliases: ["js"] },
    { language: "java", version: "11.0.19", aliases: [] },
    { language: "c", version: "10.2.0", aliases: [] },
  ];
  res.json(runtimes);
});

app.post("/api/execute", async (req, res) => {
  const { language, files } = req.body;
  const content = files && files[0] ? files[0].content : '';
  if (!content) return res.status(400).json({ message: "No content provided." });

  const config = {
    python: { image: "python:3.10-slim", fileName: "main.py", command: ["python", "main.py"] },
    javascript: { image: "node:18-alpine", fileName: "main.js", command: ["node", "main.js"] },
    cpp: { image: "gcc:latest", fileName: "main.cpp", command: ["/bin/sh", "-c", "g++ main.cpp -o main && ./main"] },
    c: { image: "gcc:latest", fileName: "main.c", command: ["/bin/sh", "-c", "gcc main.c -o main && ./main"] },
    java: { image: "openjdk:11-jdk-slim", fileName: "Main.java", command: ["/bin/sh", "-c", "javac Main.java && java Main"] },
  }[language];
  
  if (!config) return res.status(400).json({ message: `Language '${language}' not supported.` });
  
  // Docker execution logic... (omitted for brevity, it's the same as before)
  const tempDir = path.join(__dirname, "temp");
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
  const tempFilePath = path.join(tempDir, config.fileName);
  fs.writeFileSync(tempFilePath, content);

  let output = { stdout: "", stderr: "" };

  try {
    const container = await docker.createContainer({
      Image: config.image, Cmd: config.command, AttachStdout: true, AttachStderr: true,
      HostConfig: { Binds: [`${tempDir}:/usr/src/app`], NetworkMode: 'none', Memory: 256 * 1024 * 1024 },
      WorkingDir: "/usr/src/app", Tty: false,
    });
    const stream = await container.attach({ stream: true, stdout: true, stderr: true });
    let stdoutChunks = [], stderrChunks = [];
    stream.on('data', (chunk) => chunk[0] === 1 ? stdoutChunks.push(chunk.slice(8)) : stderrChunks.push(chunk.slice(8)));
    const streamEnd = new Promise(resolve => stream.on('end', resolve));
    await container.start();
    const timeout = setTimeout(() => container.stop().catch(() => {}), 8000);
    await container.wait();
    clearTimeout(timeout);
    await streamEnd;
    output.stdout = Buffer.concat(stdoutChunks).toString('utf-8');
    output.stderr = Buffer.concat(stderrChunks).toString('utf-8');
    await container.remove();
  } catch (err) { output.stderr = err.toString(); }
  finally { if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath); }
  res.json({ run: output });
});


// --- NEW: AI Code Explanation Endpoint ---
app.post("/api/explain", async (req, res) => {
    const { code, language } = req.body;

    if (!code || !language) {
        return res.status(400).json({ message: "Code and language are required." });
    }

    if (GEMINI_API_KEY === "YOUR_GEMINI_API_KEY") {
        return res.status(400).json({ message: "API key not configured on the server." });
    }

    const prompt = `You are an expert code explainer for beginners. Analyze the following ${language} code and break it down into a sequence of logical steps. For each step, provide the starting line number and a simple, one-sentence explanation of what that line or block of code does. Do not explain every single line if they are part of a larger logical block (like a for loop declaration). Instead, explain the block as a single step.

Return your response ONLY as a valid JSON array of objects, with no other text before or after the array. Each object must have two keys: "lineNumber" (an integer) and "explanation" (a string).

Example response for a simple Python loop:
[
  { "lineNumber": 1, "explanation": "This line initializes a list of numbers named 'my_list'." },
  { "lineNumber": 3, "explanation": "This begins a loop that will iterate through each 'number' in 'my_list'." },
  { "lineNumber": 4, "explanation": "Inside the loop, this line prints the current number to the console." }
]

Here is the code to explain:
---
${code}
---`;

    try {
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${GEMINI_API_KEY}`;
        const apiRes = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        });

        if (!apiRes.ok) {
            const error = await apiRes.json();
            throw new Error(`Gemini API Error: ${error.error.message}`);
        }

        const data = await apiRes.json();
        const textResponse = data.candidates[0].content.parts[0].text;

        // Clean the response to ensure it is valid JSON
        const jsonString = textResponse.match(/\[[\s\S]*\]/)[0];
        const explanation = JSON.parse(jsonString);

        res.json({ explanation });

    } catch (e) {
        console.error("Error calling Gemini API:", e);
        res.status(500).json({ message: `An error occurred: ${e.message}` });
    }
});


app.listen(port, () => {
  console.log(`🚀 Backend server running at http://localhost:${port}`);
});