import { BASE_API_URL } from './config.js';

export async function fetchRuntimes() {
    const res = await fetch(`${BASE_API_URL}/runtimes`);
    if (!res.ok) throw new Error('Failed to fetch runtimes from backend');
    const list = await res.json();
    const runtimes = {};
    list.forEach(runtime => {
        runtimes[runtime.language] = runtime.version;
        (runtime.aliases || []).forEach(alias => { runtimes[alias] = runtime.version; });
    });
    return runtimes;
}

export async function executeCode(language, code) {
    const payload = { language, files: [{ content: code }] };
    const res = await fetch(`${BASE_API_URL}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to execute code on backend');
    return data.run;
}

export async function fetchExplanation(language, code) {
    const payload = { language, code };
    const res = await fetch(`${BASE_API_URL}/explain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to get explanation from AI');
    return data;
}