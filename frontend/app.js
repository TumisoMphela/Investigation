// app.js – Ask LLMs frontend logic
const API_BASE = 'http://localhost:8787';

// --- Models you’re querying ---
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

const promptEl = document.getElementById('prompt');
const askBtn = document.getElementById('askBtn');
const resultsEl = document.getElementById('results');
const statusEl = document.getElementById('status');
const jsonInput = document.getElementById('jsonInput');
const jsonBtn = document.getElementById('jsonBtn');

const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (m) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      }[m])
  );
const cssId = (s) => s.replace(/[^a-z0-9]+/gi, '-').toLowerCase();

/* --- UI Helpers --- */
function cardSkeleton(label) {
  const id = cssId(label);
  return `
    <div id="card-${id}" class="bg-white border rounded-2xl shadow-sm p-4">
      <div class="flex items-center justify-between mb-2">
        <h2 class="font-semibold text-sm">${esc(label)}</h2>
        <span id="chip-${id}" class="text-xs text-gray-500">waiting…</span>
      </div>
      <article id="content-${id}" class="prose prose-sm text-gray-700"><p>Queued…</p></article>
    </div>`;
}
function renderSkeleton() {
  resultsEl.innerHTML = MODELS.map((m) => cardSkeleton(m.label)).join('');
}
function buildAnalysisFooter(a = {}) {
  const scores = a.scores
    ? Object.entries(a.scores)
        .map(
          ([k, v]) => `<li>${esc(k)}: ${v?.toFixed ? v.toFixed(2) : '—'}</li>`
        )
        .join('')
    : '<li>n/a</li>';
  return `<div class="mt-3 text-xs text-gray-700 border-t pt-2">
      <b>Analysis:</b><ul class="list-disc pl-5">${scores}</ul>
      <p class="mt-1"><b>Reasoning:</b> ${esc(a.reasoning || 'n/a')}</p>
    </div>`;
}
function setCard(label, text, analysis, meta) {
  const id = cssId(label);
  const content = document.getElementById('content-' + id);
  const chip = document.getElementById('chip-' + id);
  if (content)
    content.innerHTML = `<p>${esc(text || '')}</p>${buildAnalysisFooter(
      analysis
    )}`;
  if (chip) chip.textContent = meta || 'done';
}

/* --- Chart Renderer --- */
function renderChart(dataObj) {
  if (!dataObj || !Object.keys(dataObj).length) {
    alert('No valid analysis data found to visualize.');
    return;
  }

  const llms = Object.keys(dataObj);
  const categories = Object.keys(Object.values(dataObj)[0]);
  const colors = [
    '#f94144',
    '#f3722c',
    '#f8961e',
    '#f9844a',
    '#f9c74f',
    '#90be6d',
    '#43aa8b',
    '#577590',
    '#277da1',
    '#4d908e',
  ];

  const datasets = categories.map((cat, i) => ({
    label: cat,
    data: llms.map((llm) => dataObj[llm][cat]),
    backgroundColor: colors[i % colors.length],
    borderRadius: 5,
  }));

  const canvas = document.getElementById('analysisChart');
  if (!canvas) return;

  // Destroy previous chart safely
  if (
    window.analysisChart &&
    typeof window.analysisChart.destroy === 'function'
  ) {
    window.analysisChart.destroy();
  }

  const ctx = canvas.getContext('2d');
  window.analysisChart = new Chart(ctx, {
    type: 'bar',
    data: { labels: llms, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: 'Average Ethical Framework Scores Across LLMs',
          font: { size: 18 },
        },
        legend: { display: true, position: 'right' },
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 1,
          title: { display: true, text: 'Score (0–1)' },
        },
        x: { title: { display: true, text: 'LLMs' } },
      },
    },
  });
}

/* --- Ask a single question --- */
async function askAll() {
  const prompt = promptEl.value.trim();
  if (!prompt) return alert('Please type a question first!');

  renderSkeleton();
  statusEl.textContent = 'Querying models...';
  const started = performance.now();

  try {
    const res = await fetch(`${API_BASE}/api/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });
    const data = await res.json();
    if (!data.results) throw new Error('Invalid backend response.');

    data.results.forEach((r) =>
      setCard(
        r.label,
        r.text || 'No response',
        r.analysis,
        `tokens ${r.tokens || '—'}`
      )
    );

    const chartData = {};
    data.results.forEach((r) => {
      if (r.analysis?.scores) chartData[r.label] = r.analysis.scores;
    });

    renderChart(chartData);
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

/* --- Upload & auto-visualize JSON --- */
jsonBtn.addEventListener('click', async () => {
  const file = jsonInput.files?.[0];
  if (!file) return alert('Select a JSON file first!');

  const text = await file.text();
  let payload = JSON.parse(text);
  if (!Array.isArray(payload)) payload = { questions: payload.questions };

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

  statusEl.textContent = 'Batch complete — generating chart...';

  // 🔹 Automatically generate averaged chart
  const resultsArray = data.results || [];
  const totals = {},
    counts = {};

  resultsArray.forEach((entry) => {
    const answers = entry.answers || [];
    answers.forEach((ans) => {
      const label = ans.label || ans.model;
      const scores = ans.analysis?.scores;
      if (!scores) return;
      if (!totals[label]) {
        totals[label] = {};
        counts[label] = {};
      }
      for (const [k, v] of Object.entries(scores)) {
        if (typeof v !== 'number') continue;
        totals[label][k] = (totals[label][k] || 0) + v;
        counts[label][k] = (counts[label][k] || 0) + 1;
      }
    });
  });

  const averages = {};
  for (const [label, catVals] of Object.entries(totals)) {
    averages[label] = {};
    for (const [cat, sum] of Object.entries(catVals)) {
      const avg = sum / (counts[label][cat] || 1);
      averages[label][cat] = parseFloat(avg.toFixed(2));
    }
  }

  renderChart(averages);
  statusEl.textContent = 'Chart generated successfully.';
});

// --- Fetch and Visualize LLM Scores ---
async function loadLLMCharts() {
  try {
    const res = await fetch(`${API_BASE}/api/llm-scores`);
    const data = await res.json();

    // 🟩 1. BAR CHART for all models
    const labels = data.all.map((m) => m.model);
    const barData = {
      labels,
      datasets: [
        {
          label: 'Conservatism',
          data: data.all.map((m) => m.conservatism),
          backgroundColor: 'rgba(239, 68, 68, 0.7)',
        },
        {
          label: 'Liberalism',
          data: data.all.map((m) => m.liberalism),
          backgroundColor: 'rgba(34, 197, 94, 0.7)',
        },
        {
          label: 'Socialism',
          data: data.all.map((m) => m.socialism),
          backgroundColor: 'rgba(59, 130, 246, 0.7)',
        },
      ],
    };
    new Chart(document.getElementById('barChart'), {
      type: 'bar',
      data: barData,
      options: {
        responsive: true,
        scales: { y: { beginAtZero: true, max: 1 } },
      },
    });

    // 🟦 2. RADAR per model
    const modelContainer = document.getElementById('modelRadarContainer');
    data.all.forEach((m) => {
      const canvas = document.createElement('canvas');
      canvas.classList.add('bg-white', 'p-3', 'rounded-xl', 'shadow');
      modelContainer.appendChild(canvas);

      new Chart(canvas, {
        type: 'radar',
        data: {
          labels: ['Conservatism', 'Liberalism', 'Socialism'],
          datasets: [
            {
              label: m.model,
              data: [m.conservatism, m.liberalism, m.socialism],
              backgroundColor: 'rgba(37, 99, 235, 0.3)',
              borderColor: 'rgba(37, 99, 235, 0.8)',
              borderWidth: 2,
            },
          ],
        },
        options: { scales: { r: { min: 0, max: 1 } } },
      });
    });

    // 🟨 3. RADAR Eastern vs Western
    const regionRadar = document.getElementById('regionRadar');
    new Chart(regionRadar, {
      type: 'radar',
      data: {
        labels: ['Conservatism', 'Liberalism', 'Socialism'],
        datasets: [
          {
            label: 'Eastern LLMs',
            data: Object.values(data.averages[0]).slice(1),
            backgroundColor: 'rgba(250, 204, 21, 0.3)',
            borderColor: 'rgba(250, 204, 21, 0.8)',
            borderWidth: 2,
          },
          {
            label: 'Western LLMs',
            data: Object.values(data.averages[1]).slice(1),
            backgroundColor: 'rgba(34, 197, 94, 0.3)',
            borderColor: 'rgba(34, 197, 94, 0.8)',
            borderWidth: 2,
          },
        ],
      },
      options: { scales: { r: { min: 0, max: 1 } } },
    });
  } catch (err) {
    console.error('Error loading charts:', err);
  }
}

// Render charts after load
window.addEventListener('DOMContentLoaded', loadLLMCharts);
