const BASE_API_URL = "https://emkc.org/api/v2/piston";
const $ = (sel) => document.querySelector(sel);

// Default code templates for each language
const codeTemplates = {
  python: `# Bubble Sort with visualisation
# Emits __VIS__: lines with JSON: {"arr": [...], "i": idx, "j": idx}
import json
arr = [5, 3, 8, 4, 2]
print("Initial:", arr)

def emit(a, i=None, j=None):
    print("__VIS__:" + json.dumps({"arr": a, "i": i, "j": j}))

n = len(arr)
for i in range(n):
    for j in range(0, n - i - 1):
        emit(arr, j, j + 1)
        if arr[j] > arr[j + 1]:
            arr[j], arr[j + 1] = arr[j + 1], arr[j]
            emit(arr, j, j + 1)
print("Sorted:", arr)
`,
  cpp: `// Bubble Sort with simple visual output
// Emits __VIS__: lines: __VIS__:[arr...] i j
#include <iostream>
#include <vector>
#include <algorithm>

void emit(const std::vector<int>& a, int i, int j) {
    std::cout << "__VIS__: [";
    for (size_t k = 0; k < a.size(); ++k) {
        std::cout << a[k] << (k + 1 < a.size() ? "," : "");
    }
    std::cout << "] " << i << " " << j << "\\n";
}

int main() {
    std::vector<int> arr = {5, 3, 8, 4, 2};
    std::cout << "Initial:";
    for (int x : arr) std::cout << " " << x;
    std::cout << "\\n";
    int n = arr.size();
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < n - i - 1; j++) {
            emit(arr, j, j + 1);
            if (arr[j] > arr[j + 1]) {
                std::swap(arr[j], arr[j + 1]);
                emit(arr, j, j + 1);
            }
        }
    }
    std::cout << "Sorted:";
    for (int x : arr) std::cout << " " << x;
    std::cout << "\\n";
    return 0;
}
`,
  javascript: `// Bubble Sort with visualisation.
function emit(a, i = null, j = null) {
    console.log("__VIS__:" + JSON.stringify({ arr: a, i, j }));
}
let arr = [5, 3, 8, 4, 2];
console.log("Initial:", arr);
for (let i = 0; i < arr.length; i++) {
    for (let j = 0; j < arr.length - i - 1; j++) {
        emit(arr, j, j + 1);
        if (arr[j] > arr[j + 1]) {
            const t = arr[j];
            arr[j] = arr[j + 1];
            arr[j + 1] = t;
            emit(arr, j, j + 1);
        }
    }
}
console.log("Sorted:", arr);
`,
};

// App state
let runtimes = {};
let vizSteps = [];
let vizIndex = 0;
let vizTimer = null;
let isRunning = false;

// --- Core Functions ---

async function fetchRuntimes() {
  try {
    const res = await fetch(`${BASE_API_URL}/runtimes`);
    const list = await res.json();
    ["python", "cpp", "javascript"].forEach((lang) => {
      const match = list.find(
        (r) => r.language === lang || (r.aliases || []).includes(lang),
      );
      if (match) runtimes[lang] = match.version;
    });
  } catch (e) {
    console.error("Failed to fetch runtimes", e);
    $("#runtime-version").textContent = "Error";
  }
  updateRuntimeLabel();
}

async function runCode() {
  if (isRunning) return;
  isRunning = true;
  updateButtons();
  clearAll();

  const lang = $("#lang").value;
  if (!runtimes[lang]) {
    $("#stderr").textContent = `Runtime for ${lang} not available.`;
    isRunning = false;
    updateButtons();
    return;
  }

  const payload = {
    language: lang,
    version: runtimes[lang],
    files: [{ content: $("#code").value }],
    stdin: $("#stdin").value,
  };

  try {
    const res = await fetch(`${BASE_API_URL}/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    $("#stdout").textContent = data.run.stdout || "";
    $("#stderr").textContent = data.run.stderr || "";
    vizSteps = parseVizSteps(data.run.stdout || "");
    vizIndex = 0;
    drawVisualizer();
    startAnimation();
  } catch (e) {
    $("#stderr").textContent = `Error: ${e.message}`;
  } finally {
    isRunning = false;
    updateButtons();
  }
}

// --- UI and Event Handlers ---

function updateRuntimeLabel() {
  const lang = $("#lang").value;
  $("#runtime-version").textContent = runtimes[lang] || "N/A";
}

function setDefaultCode() {
  const lang = $("#lang").value;
  $("#code").value = codeTemplates[lang];
  renderGutter();
  clearAll();
}

function renderGutter() {
  const lines = $("#code").value.split("\n").length;
  $("#gutter").innerHTML = Array.from({ length: lines }, (_, i) => i + 1).join(
    "\n",
  );
}

function updateButtons() {
  $("#run").disabled = isRunning;
  $("#stop").disabled = !isRunning;
}

function clearAll() {
  $("#stdout").textContent = "";
  $("#stderr").textContent = "";
  vizSteps = [];
  vizIndex = 0;
  stopAnimation();
  drawVisualizer();
}

function switchTab(tab) {
  const tabName = tab.dataset.tab;
  const panelRoot = tab.closest(".panel");
  panelRoot
    .querySelectorAll(".tab")
    .forEach((t) => t.classList.remove("active"));
  panelRoot
    .querySelectorAll(".tab-panel")
    .forEach((p) => p.classList.remove("active"));
  tab.classList.add("active");
  $(`#panel-${tabName}`).classList.add("active");
}

// --- Visualizer Logic ---

function parseVizSteps(output) {
  const steps = [];
  for (const line of output.split(/\r?\n/)) {
    if (line.startsWith("__VIS__:")) {
      try {
        const payload = line.substring(8).trim();
        if (payload.startsWith("{")) {
          // JSON format
          const obj = JSON.parse(payload);
          if (Array.isArray(obj.arr))
            steps.push({ arr: obj.arr.map(Number), i: obj.i, j: obj.j });
        } else {
          // Simple C++ format: [1,2,3] 0 1
          const match = payload.match(/^\[(.*)\]\s+(\d+)\s+(\d+)/);
          if (match) {
            const arr = match[1].split(",").map((x) => Number(x.trim()));
            steps.push({ arr, i: Number(match[2]), j: Number(match[3]) });
          }
        }
      } catch (e) {
        console.warn("Failed to parse viz line:", line, e);
      }
    }
  }
  return steps;
}

function drawVisualizer() {
  const root = $("#visualiser");
  root.innerHTML = "";
  if (!vizSteps.length) {
    $("#vis-step").textContent = "No visualization steps found.";
    return;
  }
  const step = vizSteps[Math.min(vizIndex, vizSteps.length - 1)];
  const maxVal = Math.max(1, ...step.arr);
  step.arr.forEach((val, k) => {
    const bar = document.createElement("div");
    bar.className = "bar";
    if (k === step.i || k === step.j) bar.classList.add("active");
    bar.style.height = `${Math.round((val / maxVal) * 100)}%`;
    bar.title = val;
    root.appendChild(bar);
  });
  $("#vis-step").textContent =
    `Step ${Math.min(vizIndex + 1, vizSteps.length)} / ${vizSteps.length}`;
}

function startAnimation() {
  stopAnimation();
  if (!vizSteps.length) return;
  vizTimer = setInterval(() => {
    vizIndex = (vizIndex + 1) % vizSteps.length;
    drawVisualizer();
  }, 400);
}

function stopAnimation() {
  if (vizTimer) clearInterval(vizTimer);
  vizTimer = null;
}

// --- Initialization ---

function initialize() {
  $("#year").textContent = new Date().getFullYear();
  document
    .querySelectorAll(".tab")
    .forEach((tab) => tab.addEventListener("click", () => switchTab(tab)));
  $("#lang").addEventListener("change", () => {
    updateRuntimeLabel();
    setDefaultCode();
  });
  $("#code").addEventListener("input", renderGutter);
  $("#run").addEventListener("click", runCode);
  $("#stop").addEventListener("click", () => {
    // Simple stop, doesn't kill process
    isRunning = false;
    updateButtons();
    stopAnimation();
  });
  $("#clear").addEventListener("click", clearAll);

  setDefaultCode();
  fetchRuntimes();
}

initialize();

