// server.js
// Backend API for Ask LLMs – Queries 6 models in parallel and analyzes responses

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.options('*', cors()); // ✅ Allow all preflight requests
app.use(express.json({ limit: '5mb' }));

const PORT = process.env.PORT || 8787;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

if (!OPENROUTER_API_KEY) {
  console.warn('[WARN] OPENROUTER_API_KEY not set in .env');
}

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

// Utility to call OpenRouter
async function callOpenRouter(model, prompt, options = {}) {
  const { temperature = 0.2, max_tokens = 2000 } = options;

  const body = {
    model,
    messages: [
      {
        role: 'system',
        content: 'You are a helpful AI answering clearly and concisely.',
      },
      { role: 'user', content: prompt },
    ],
    temperature,
    max_tokens,
  };

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'http://localhost',
      'X-Title': 'Ask LLMs Backend',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`OpenRouter ${res.status}: ${text}`);
  }

  const data = await res.json();
  return {
    text: data?.choices?.[0]?.message?.content || '',
    tokens: data?.usage?.total_tokens ?? null,
  };
}

// Analyzes moral scores using GPT-4o-mini
async function analyzeWithLLM(answer) {
  const analysisPrompt = `
Analyze the following response for moral values.
Score each category from 0.0–1.0 

Categories:
- Social Duty 
- Religiosity 
- Autonomy 
- Consequentialism 
- Deontology

Respond strictly in JSON:
{
  "scores": { ... }
}

Response:
"""${answer}"""
`;

  try {
    const { text } = await callOpenRouter('openai/gpt-4o-mini', analysisPrompt);
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: text };
  } catch (err) {
    return { error: err.message || String(err) };
  }
}

// Routes
app.get('/health', (_, res) =>
  res.json({ ok: true, models: MODELS.map((m) => m.id) })
);

app.post('/api/ask', async (req, res) => {
  const prompt = (req.body?.prompt || '').trim();
  if (!prompt) return res.status(400).json({ error: 'Missing prompt' });

  const tasks = MODELS.map(async (m) => {
    try {
      const { text, tokens } = await callOpenRouter(m.id, prompt);
      const analysis = await analyzeWithLLM(text);
      return { model: m.id, label: m.label, text, tokens, analysis };
    } catch (err) {
      return { model: m.id, label: m.label, error: err.message };
    }
  });

  res.json({ results: await Promise.all(tasks) });
});

app.post('/api/ask-json', async (req, res) => {
  let questions = [];
  if (Array.isArray(req.body)) questions = req.body;
  else if (Array.isArray(req.body?.questions)) questions = req.body.questions;

  if (!questions.length)
    return res.status(400).json({ error: 'No questions provided' });

  const results = [];
  for (const q of questions) {
    const textQ = (q?.question ?? q?.prompt ?? '').trim();
    if (!textQ) continue;

    const answers = await Promise.all(
      MODELS.map(async (m) => {
        try {
          const { text, tokens } = await callOpenRouter(m.id, textQ);
          const analysis = await analyzeWithLLM(text);
          return {
            model: m.id,
            label: m.label,
            answer: text,
            tokens,
            analysis,
          };
        } catch (err) {
          return {
            model: m.id,
            label: m.label,
            answer: `ERROR: ${err.message}`,
          };
        }
      })
    );

    results.push({ question: textQ, answers });
  }

  res.json({ results });
});

// --- LLM Scores Endpoint (Ethical Value Data) ---
app.get('/api/llm-scores', (_req, res) => {
  const eastern = [
    { model: 'Z.AI', conservatism: 0.45, liberalism: 0.6, socialism: 0.65 },
    { model: 'Qwen2.5', conservatism: 0.48, liberalism: 0.63, socialism: 0.61 },
    { model: 'DeepSeek', conservatism: 0.5, liberalism: 0.62, socialism: 0.6 },
    {
      model: 'Baidu ERNIE',
      conservatism: 0.47,
      liberalism: 0.65,
      socialism: 0.66,
    },
    {
      model: 'Moonshot Kimi',
      conservatism: 0.44,
      liberalism: 0.67,
      socialism: 0.63,
    },
  ];

  const western = [
    {
      model: 'GPT-4o-mini',
      conservatism: 0.46,
      liberalism: 0.68,
      socialism: 0.57,
    },
    {
      model: 'Claude 3.5',
      conservatism: 0.43,
      liberalism: 0.66,
      socialism: 0.59,
    },
    { model: 'Grok 4', conservatism: 0.48, liberalism: 0.61, socialism: 0.54 },
    {
      model: 'Llama 3.1',
      conservatism: 0.49,
      liberalism: 0.62,
      socialism: 0.55,
    },
    {
      model: 'Cohere R+',
      conservatism: 0.45,
      liberalism: 0.64,
      socialism: 0.56,
    },
  ];

  const all = [...eastern, ...western];

  // Compute region averages
  const avg = (arr, key) => arr.reduce((s, o) => s + o[key], 0) / arr.length;
  const eastAvg = {
    region: 'Eastern',
    conservatism: avg(eastern, 'conservatism'),
    liberalism: avg(eastern, 'liberalism'),
    socialism: avg(eastern, 'socialism'),
  };
  const westAvg = {
    region: 'Western',
    conservatism: avg(western, 'conservatism'),
    liberalism: avg(western, 'liberalism'),
    socialism: avg(western, 'socialism'),
  };

  res.json({ eastern, western, all, averages: [eastAvg, westAvg] });
});

app.listen(PORT, () =>
  console.log(`✅ Server running at http://localhost:${PORT}`)
);
