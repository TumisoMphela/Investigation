import 'dotenv/config';
import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));

const PORT = process.env.PORT || 8789;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

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

async function callOpenRouter(model, prompt) {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: 'You are a concise helpful assistant.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.2,
    }),
  });

  const data = await res.json();
  return {
    text: data?.choices?.[0]?.message?.content || '',
    tokens: data?.usage?.total_tokens ?? null,
  };
}

// Health route
app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    models: MODELS.map((m) => m.label),
    uptime: `${process.uptime().toFixed(0)}s`,
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  });
});

// Single ask
app.post('/api/ask', async (req, res) => {
  const prompt = (req.body?.prompt || '').trim();
  if (!prompt) return res.status(400).json({ error: 'Missing prompt' });

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

  res.json({ results });
});

// JSON batch
app.post('/api/ask-json', async (req, res) => {
  let questions = [];
  if (Array.isArray(req.body)) questions = req.body;
  else if (Array.isArray(req.body?.questions)) questions = req.body.questions;

  if (!questions.length)
    return res.status(400).json({ error: 'No questions provided' });

  const batchResults = [];
  for (const q of questions) {
    const question = q?.question || q?.prompt;
    if (!question) continue;

    const answers = await Promise.all(
      MODELS.map(async (m) => {
        try {
          const { text } = await callOpenRouter(m.id, question);
          return { model: m.label, answer: text };
        } catch (err) {
          return { model: m.label, answer: `ERROR: ${err.message}` };
        }
      })
    );
    batchResults.push({ question, answers });
  }

  res.json({ results: batchResults });
});

app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);
