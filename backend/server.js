require('dotenv').config(); 
const express = require("express");
const cors = require("cors");
const Docker = require("dockerode");
const fs = require("fs");
const path = require("path");
const fetch = require("node-fetch");

const app = express();
const docker = new Docker();
const port = 8080;

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

app.use(cors());
app.use(express.json());

app.get("/api/runtimes", (req, res) => {
    const runtimes = [
        { language: "python", version: "3.10.0", aliases: ["py"] },
        { language: "cpp", version: "10.2.0", aliases: [] },
        { language: "javascript", version: "18.15.0", aliases: ["js"] },
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
    }[language];
    
    if (!config) return res.status(400).json({ message: `Language '${language}' not supported.` });

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

    } catch (err) { 
        output.stderr = err.toString(); 
    }
    finally { if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath); }
    
    res.json({ run: output });
});

app.post("/api/explain", async (req, res) => {
    const { code, language } = req.body;
    if (!code || !language) return res.status(400).json({ message: "Code and language are required." });
    if (GEMINI_API_KEY === "YOUR_GEMINI_API_KEY") return res.status(400).json({ message: "API key not configured." });
    
    const prompt = `You are an expert code explainer. Analyze the following ${language} code and break it down into logical steps. Explain logical blocks (like loops or conditionals) as a single step. Return ONLY a valid JSON array of objects, where each object has "lineNumber" and "explanation".

Code to explain:
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
        const jsonString = textResponse.match(/\[[\s\S]*\]/)[0];
        const explanation = JSON.parse(jsonString);
        res.json({ explanation });
    } catch (e) {
        res.status(500).json({ message: `An error occurred: ${e.message}` });
    }
});

app.listen(port, () => {
  console.log(`Backend server running at http://localhost:${port}`);
});