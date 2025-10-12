const API_BASE = 'http://localhost:8787';

document.getElementById('askBtn').addEventListener('click', async () => {
  const prompt = document.getElementById('prompt').value.trim();
  if (!prompt) return;

  const status = document.getElementById('status');
  const results = document.getElementById('results');
  status.textContent = 'Loading...';
  results.innerHTML = '';

  const res = await fetch(`${API_BASE}/api/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  });
  const data = await res.json();

  results.innerHTML = data.models.map((m) => `<div>${m}</div>`).join('');
  status.textContent = 'Done';
});
