import 'dotenv/config';
import express from 'express';
import cors from 'cors';
const app = express();

app.use(cors());
app.use(express.json({ limit: '5mb' }));

const MODELS = [
  { id: 'openai/gpt-4o-mini', label: 'OpenAI · gpt-4o-mini' },
  { id: 'anthropic/claude-3.5-sonnet', label: 'Anthropic · Claude 3.5 Sonnet' },
  { id: 'qwen/qwen-2.5-72b-instruct', label: 'Qwen · Qwen2.5-72B Instruct' },
  { id: 'deepseek/deepseek-chat', label: 'DeepSeek · Chat' },
  { id: 'meta-llama/llama-3.1-70b-instruct', label: 'Meta · Llama 3.1-70B Instruct' },
  { id: 'cohere/command-r-plus', label: 'Cohere · Command-R+' },
];

app.post('/api/ask', async (req, res) => {
  const prompt = req.body?.prompt;
  if (!prompt) return res.status(400).json({ error: 'Missing prompt' });
  res.json({ ok: true, models: MODELS.map(m => m.label), prompt });
});

app.listen(process.env.PORT || 8787, () =>
  console.log(`Server running on http://localhost:${process.env.PORT || 8787}`)
);
