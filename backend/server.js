import 'dotenv/config';
import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));

const PORT = process.env.PORT || 8788;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

const MODELS = [
  { id: 'openai/gpt-4o-mini', label: 'OpenAI · gpt-4o-mini' },
  { id: 'anthropic/claude-3.5-sonnet', label: 'Anthropic · Claude 3.5 Sonnet' },
  { id: 'qwen/qwen-2.5-72b-instruct', label: 'Qwen · Qwen2.5-72B Instruct' },
  { id: 'deepseek/deepseek-chat', label: 'DeepSeek · Chat' },
  { id: 'meta-llama/llama-3.1-70b-instruct', label: 'Meta · Llama 3.1-70B Instruct' },
  { id: 'cohere/command-r-plus', label: 'Cohere · Command-R+' },
];

// --- Helper to call OpenRouter ---
async function callOpenRouter(model, prompt, temperature = 0.2) {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: prompt },
      ],
      temperature,
      max_tokens: 1000,
    }),
  });

  if (!res.ok) throw new Error(`OpenRouter ${res.status}`);
  const data = await res.json();
  return {
    text: data?.choices?.[0]?.message?.content || '',
    tokens: data?.usage?.total_tokens ?? null,
  };
}

// --- Meta Analysis LLM ---
async function metaAnalyze(responses) {
  const summaryPrompt = `
You are ChatGPT-4, tasked with analyzing multiple LLM outputs on the same prompt.
Summarize their reasoning differences, ethical tone, and overall consensus.

Here are the model responses:
${responses.map((r) => `### ${r.label}:\n${r.text}`).join('\n\n')}

Respond concisely in Markdown with three sections:
1. **Common Themes**
2. **Major Disagreements**
3. **Overall Moral Alignment (0–1 score)**
`;
  return await callOpenRouter('openai/gpt-4', summaryPrompt);
}

// --- Health Route ---
app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    models: MODELS.map((m) => m.label),
    uptime: `${process.uptime().toFixed(0)}s`,
    timestamp: new Date().toISOString(),
  });
});

// --- Main Ask Endpoint (with Meta LLM) ---
app.post('/api/ask', async (req, res) => {
  const prompt = (req.body?.prompt || '').trim();
  if (!prompt) return res.status(400).json({ error: 'Missing prompt' });

  try {
    // Run all base models in parallel
    const results = await Promise.all(
      MODELS.map(async (m) => {
        try {
          const { text, tokens } = await callOpenRouter(m.id, prompt);
          return { model: m.id, label: m.label, text, tokens };
        } catch (err) {
          return { model: m.id, label: m.label, error: err.message };
        }
      })
    );

    // Meta-analysis (GPT-4)
    const successfulResponses = results.filter((r) => r.text);
    const meta = await metaAnalyze(successfulResponses);

    res.json({
      results,
      meta: { label: 'ChatGPT-4 Meta-Analysis', text: meta.text },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
