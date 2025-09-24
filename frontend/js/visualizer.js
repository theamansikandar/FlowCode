import { elements } from './ui.js';

let currentBars = [];

export function parseVizSteps(output) {
    const steps = [];
    for (const line of output.split(/\r?\n/)) {
        if (line.startsWith("__VIS__:")) {
            try {
                steps.push(JSON.parse(line.substring(8).trim()));
            } catch (e) { console.warn("Failed to parse viz line:", line, e); }
        }
    }
    return steps;
}

function createInitialBars(step) {
    elements.visualizerPanel.innerHTML = '';
    currentBars = [];
    const maxVal = Math.max(1, ...step.arr);
    const panelWidth = elements.visualizerPanel.clientWidth;
    const barWidth = Math.max(10, (panelWidth / step.arr.length) - 4);

    step.arr.forEach((val, i) => {
        const bar = document.createElement("div");
        bar.className = "bar";
        bar.dataset.id = i; // Use a simple index as ID
        bar.style.height = `${Math.round((val / maxVal) * 90)}%`;
        bar.style.width = `${barWidth}px`;
        bar.style.left = `${i * (barWidth + 4)}px`;
        bar.innerHTML = `<span>${val}</span>`;
        elements.visualizerPanel.appendChild(bar);
        currentBars.push(bar);
    });
}

async function animateSortStep(step) {
    if (!step) return;

    currentBars.forEach(bar => bar.classList.remove('active'));
    if (step.i !== null && step.i < currentBars.length) currentBars[step.i].classList.add('active');
    if (step.j !== null && step.j < currentBars.length) currentBars[step.j].classList.add('active');
    
    if (step.swap) {
        const bar1 = currentBars.find(b => parseInt(b.dataset.id) === step.i);
        const bar2 = currentBars.find(b => parseInt(b.dataset.id) === step.j);
        
        if (bar1 && bar2) {
            const pos1 = bar1.style.left;
            const pos2 = bar2.style.left;

            await anime({
                targets: [bar1, bar2],
                left: (el) => el === bar1 ? pos2 : pos1,
                duration: 400,
                easing: 'easeOutQuad'
            }).finished;
        }
    }
}

function drawSearchStep(step) {
    currentBars.forEach((bar, k) => {
        bar.classList.remove("active");
        bar.style.background = 'var(--primary)';
        bar.style.opacity = '0.2';

        if (k >= step.low && k <= step.high) {
            bar.style.opacity = '0.6';
        }
        if (k === step.mid) {
            bar.classList.add("active");
        }
        if (step.found === true && k === step.mid) {
            bar.style.background = '#4CAF50';
        }
    });
}

export async function animate(steps) {
    if (!steps || steps.length === 0) return;
    createInitialBars(steps[0]);

    for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        elements.visStepCounter.textContent = `Step ${i + 1} / ${steps.length}`;
        
        if (step.type === 'search') {
            drawSearchStep(step);
        } else {
            await animateSortStep(step);
        }
        
        await new Promise(resolve => setTimeout(resolve, 450));
    }
    elements.visStepCounter.textContent = `Animation Complete (${steps.length} steps)`;
}

export function clear() {
    elements.visualizerPanel.innerHTML = '';
    elements.visStepCounter.textContent = '';
    currentBars = [];
}