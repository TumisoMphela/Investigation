// --- Config ---
const API_BASE = 'http://localhost:8788'; // backend

const MODELS = [
  { id: 'openai/gpt-4o-mini', label: 'OpenAI · gpt-4o-mini' },
  { id: 'anthropic/claude-3.5-sonnet', label: 'Anthropic · Claude 3.5 Sonnet' },
  { id: 'x-ai/grok-4-fast', label: 'xAI · Grok 4 Fast' },
  {
    id: 'meta-llama/llama-3.1-70b-instruct',
    label: 'Meta · Llama 3.1-70B Instruct',
  },
  { id: 'cohere/command-r7b-12-2024', label: 'Cohere · Command-R+' },
  { id: 'z-ai/glm-4.6', label: 'Z.AI' },
  { id: 'qwen/qwen-2.5-72b-instruct', label: 'Qwen · Qwen2.5-72B Instruct' },
  { id: 'deepseek/deepseek-chat', label: 'DeepSeek · Chat' },
  {
    id: 'baidu/ernie-4.5-21b-a3b-thinking',
    label: 'Baidu · ERNIE 4.5 21B A3B Thinking',
  },
  { id: 'moonshotai/kimi-k2-0905', label: 'MoonshotAI · Kimi K2 0905' },
];

// --- DOM ---
const promptEl = document.getElementById('prompt');
const askBtn = document.getElementById('askBtn');
const resultsEl = document.getElementById('results');
const statusEl = document.getElementById('status');

// --- Helpers ---
const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (m) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[
        m
      ])
  );
const cssId = (s) => s.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
const tf = (v, n = 1) => (typeof v === 'number' ? v.toFixed(n) : '—');

function cardSkeleton(label) {
  const id = cssId(label);
  return `
  <div id="card-${id}" class="bg-white dark:bg-gray-800 border rounded-2xl shadow-sm p-4">
    <div class="flex items-center justify-between mb-2">
      <h2 class="font-semibold text-sm">${esc(label)}</h2>
      <span class="text-xs text-gray-500" id="chip-${id}">waiting…</span>
    </div>
    <article class="prose prose-sm max-w-none" id="content-${id}">
      <p class="text-gray-500">Queued</p>
    </article>
  </div>`;
}

function renderSkeleton() {
  resultsEl.innerHTML = MODELS.map((m) => cardSkeleton(m.label)).join('');
}

function buildAnalysisFooter(a = {}) {
  const scores = a.scores
    ? Object.entries(a.scores)
        .map(([k, v]) => `<li>${esc(k)}: ${tf(v, 2)}</li>`)
        .join('')
    : '<li>n/a</li>';

  return `
    <div class="mt-3 text-xs text-gray-700 dark:text-gray-300 border-t pt-2">
      <b>Analysis:</b>
      <ul class="list-disc pl-5">${scores}</ul>
      <p class="mt-1"><b>Reasoning:</b> ${esc(a.reasoning || 'n/a')}</p>
    </div>`;
}

function setCard(label, text, analysis, meta) {
  const id = cssId(label);
  const content = document.getElementById('content-' + id);
  const chip = document.getElementById('chip-' + id);
  if (content) {
    const answerHTML = `<p>${esc(text || '')}</p>`;
    const footerHTML = buildAnalysisFooter(analysis);
    content.innerHTML = answerHTML + footerHTML;
  }
  if (chip) chip.textContent = meta || 'done';
}

// --- Ask single prompt ---
async function askAll() {
  const prompt = (promptEl?.value || '').trim();
  if (!prompt) return;

  renderSkeleton();
  statusEl.textContent = 'Querying 6 LLMs…';
  const started = performance.now();

  try {
    const res = await fetch(`${API_BASE}/api/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });
    const data = await res.json();

    data.results.forEach((row) =>
      setCard(row.label, row.text, row.analysis, `tokens ${row.tokens || '—'}`)
    );
    statusEl.textContent = `Done in ${Math.round(
      performance.now() - started
    )} ms`;
  } catch (err) {
    console.error(err);
    statusEl.textContent = 'Error: ' + err.message;
  }
}

askBtn.addEventListener('click', askAll);
promptEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) askAll();
});

// --- JSON Upload Logic ---
const jsonInput = document.getElementById('jsonInput');
const jsonBtn = document.getElementById('jsonBtn');

if (jsonBtn && jsonInput) {
  jsonBtn.addEventListener('click', async () => {
    const file = jsonInput.files?.[0];
    if (!file) return alert('Select a JSON file first!');

    try {
      const text = await file.text();
      let payload = JSON.parse(text);

      if (!Array.isArray(payload) && !payload.questions) {
        alert(
          'Invalid JSON format. Expected an array or { "questions": [...] }'
        );
        return;
      }

      statusEl.textContent = 'Uploading batch…';
      const res = await fetch(`${API_BASE}/api/ask-json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'llm_results.json';
      a.click();
      URL.revokeObjectURL(url);

      statusEl.textContent = '✅ Batch complete — results downloaded.';
    } catch (err) {
      console.error(err);
      statusEl.textContent = '❌ Error processing JSON: ' + err.message;
    }
  });
}
