export let elements = {};

export function initUI() {
    elements = {
        langSelect: document.getElementById('lang-select'),
        algoSelect: document.getElementById('algo-select'),
        codeInput: document.getElementById('code-input'),
        runBtn: document.getElementById('run-btn'),
        visualizeBtn: document.getElementById('visualize-btn'),
        explainBtn: document.getElementById('explain-btn'),
        runtimeVersion: document.getElementById('runtime-version'),
        gutter: document.getElementById('gutter'),
        stdoutLog: document.getElementById('stdout-log'),
        stderrLog: document.getElementById('stderr-log'),
        explanationText: document.getElementById('explanation-text'),
        stepCounter: document.getElementById('step-counter'),
        nextStepBtn: document.getElementById('next-step-btn'),
        prevStepBtn: document.getElementById('prev-step-btn'),
        highlightLayer: document.getElementById('highlight-layer'),
        visualizerPanel: document.getElementById('visualizer-panel'),
        visStepCounter: document.getElementById('vis-step-counter'),
        year: document.getElementById('year'),
    };
    elements.year.textContent = new Date().getFullYear();
}

export function renderGutter() {
    if (!elements.codeInput) return;
    const lines = elements.codeInput.value.split('\n').length;
    elements.gutter.innerHTML = Array.from({ length: lines }, (_, i) => i + 1).join('\n');
}

export function updateButtons(isBusy, explainerState = {}) {
    if (!elements.runBtn) return;
    elements.runBtn.disabled = isBusy;
    elements.visualizeBtn.disabled = isBusy || elements.algoSelect.value === 'none';
    elements.explainBtn.disabled = isBusy;
    
    const { steps = [], currentIndex = 0 } = explainerState;
    const hasSteps = steps.length > 0;
    elements.prevStepBtn.disabled = isBusy || !hasSteps || currentIndex === 0;
    elements.nextStepBtn.disabled = isBusy || !hasSteps || currentIndex === steps.length - 1;
}

export function updateRuntimeLabel(version) {
    if (!elements.runtimeVersion) return;
    elements.runtimeVersion.textContent = version || 'N/A';
}

export function highlightLine(lineNumber) {
    clearLineHighlight();
    const highlightDiv = document.createElement('div');
    highlightDiv.className = 'line-highlight';
    const lineHeight = parseFloat(getComputedStyle(elements.codeInput).lineHeight);
    highlightDiv.style.top = `${(lineNumber - 1) * lineHeight}px`;
    highlightDiv.style.height = `${lineHeight}px`;
    elements.highlightLayer.appendChild(highlightDiv);
}

export function clearLineHighlight() {
    if (!elements.highlightLayer) return;
    elements.highlightLayer.innerHTML = '';
}

export function clearAllPanels() {
    if (!elements.stdoutLog) return;
    elements.stdoutLog.textContent = '';
    elements.stderrLog.textContent = '';
    explainer.reset();
}