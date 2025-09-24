import { elements, updateButtons, highlightLine, clearLineHighlight } from './ui.js';

let state = {
    steps: [],
    currentIndex: 0,
};

export function getState() {
    return state;
}

export function setExplanationSteps(steps = []) {
    state.steps = steps;
    state.currentIndex = 0;
    renderStep();
}

function renderStep() {
    if (state.steps.length === 0) {
        elements.explanationText.textContent = 'The AI could not generate an explanation for this code.';
        elements.stepCounter.textContent = 'Step 0 / 0';
        clearLineHighlight();
    } else {
        const step = state.steps[state.currentIndex];
        elements.explanationText.textContent = step.explanation;
        elements.stepCounter.textContent = `Step ${state.currentIndex + 1} / ${state.steps.length}`;
        highlightLine(step.lineNumber);
    }
    updateButtons(false, state);
}

export function nextStep() {
    if (state.currentIndex < state.steps.length - 1) {
        state.currentIndex++;
        renderStep();
    }
}

export function prevStep() {
    if (state.currentIndex > 0) {
        state.currentIndex--;
        renderStep();
    }
}

export function reset() {
    state.steps = [];
    state.currentIndex = 0;
    elements.explanationText.textContent = 'Write some code and click "Explain Code" to get a breakdown.';
    elements.stepCounter.textContent = 'Step 0 / 0';
    clearLineHighlight();
    updateButtons(false, state);
}