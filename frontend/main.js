import * as ui from './js/ui.js';
import * as api from './js/api.js';
import { codeTemplates } from './js/config.js';
import * as explainer from './js/explainer.js';
import * as visualizer from './js/visualizer.js';

let state = {
    runtimes: {},
    isBusy: false,
};

function handleSelectionChange() {
    const algo = ui.elements.algoSelect.value;
    const lang = ui.elements.langSelect.value;
    
    if (algo !== 'none' && codeTemplates[algo] && codeTemplates[algo][lang]) {
        ui.elements.codeInput.value = codeTemplates[algo][lang];
    } else if (algo !== 'none') {
        ui.elements.codeInput.value = `// Visualization for this algorithm in ${lang} is not yet available.`;
    } else {
        ui.elements.codeInput.value = '';
    }
    
    ui.updateRuntimeLabel(state.runtimes[lang]);
    ui.renderGutter();
    ui.clearAllPanels();
    visualizer.clear();
}

async function handleRunOrVisualize(isVisualization = false) {
    if (state.isBusy) return;
    state.isBusy = true;
    ui.updateButtons(state.isBusy);
    ui.clearAllPanels();

    try {
        const lang = ui.elements.langSelect.value;
        const code = ui.elements.codeInput.value;
        
        if (isVisualization) {
            const algo = ui.elements.algoSelect.value;
            if (algo === 'none' || !codeTemplates[algo] || !codeTemplates[algo][lang]) {
                throw new Error("Please select a valid algorithm and language to visualize.");
            }
        }

        const result = await api.executeCode(lang, code);

        const fullOutput = result.stdout || "";
        const cleanOutput = fullOutput.split('\n').filter(line => !line.startsWith("__VIS__:")).join('\n');
        
        ui.elements.stdoutLog.textContent = cleanOutput.trim() || "(No output)";
        ui.elements.stderrLog.textContent = result.stderr || "";

        if (isVisualization) {
            const vizSteps = visualizer.parseVizSteps(fullOutput);
            if (vizSteps.length > 0) {
                visualizer.animate(vizSteps);
            } else {
                ui.elements.visStepCounter.textContent = "No visualization steps found in the output.";
            }
        }
    } catch (error) {
        ui.elements.stderrLog.textContent = `Error: ${error.message}`;
    } finally {
        state.isBusy = false;
        ui.updateButtons(state.isBusy);
    }
}

async function handleExplainClick() {
    if (state.isBusy) return;
    state.isBusy = true;
    ui.updateButtons(state.isBusy, explainer.getState());
    explainer.reset();

    try {
        const lang = ui.elements.langSelect.value;
        const code = ui.elements.codeInput.value;
        if (code.trim() === '') {
            throw new Error("Please enter some code to explain.");
        }
        ui.elements.explanationText.textContent = "The AI is analyzing your code...";
        const result = await api.fetchExplanation(lang, code);
        explainer.setExplanationSteps(result.explanation);
    } catch (error) {
        explainer.reset();
        ui.elements.explanationText.textContent = `Error: ${error.message}`;
    } finally {
        state.isBusy = false;
        ui.updateButtons(state.isBusy, explainer.getState());
    }
}

function attachEventListeners() {
    ui.elements.langSelect.addEventListener('change', handleSelectionChange);
    ui.elements.algoSelect.addEventListener('change', handleSelectionChange);
    ui.elements.codeInput.addEventListener('input', ui.renderGutter);
    
    ui.elements.runBtn.addEventListener('click', () => handleRunOrVisualize(false));
    ui.elements.visualizeBtn.addEventListener('click', () => handleRunOrVisualize(true));
    ui.elements.explainBtn.addEventListener('click', handleExplainClick);
    
    ui.elements.nextStepBtn.addEventListener('click', explainer.nextStep);
    ui.elements.prevStepBtn.addEventListener('click', explainer.prevStep);

    document.querySelectorAll(".tab").forEach((tab) => {
        tab.addEventListener("click", () => {
            const tabName = tab.dataset.tab;
            const panelRoot = tab.closest(".panel");
            if (!panelRoot) return;
            panelRoot.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
            panelRoot.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
            tab.classList.add("active");
            const activePanel = panelRoot.querySelector(`#panel-${tabName}`);
            if (activePanel) activePanel.classList.add("active");
        });
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    ui.initUI();
    attachEventListeners();
    
    try {
        const fetchedRuntimes = await api.fetchRuntimes();
        state.runtimes = fetchedRuntimes;
    } catch (error) {
        console.error("Failed to load runtimes:", error);
        ui.elements.runtimeVersion.textContent = 'Error';
    }
    
    handleSelectionChange();
});