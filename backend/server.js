import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));

const PORT = process.env.PORT || 8790;

// --- Serve frontend ---
app.use(express.static(path.join(__dirname, '../frontend')));

// --- Health check ---
app.get('/health', (_, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// --- Example data for LLM score visualisation ---
app.get('/api/llm-scores', (_, res) => {
  const data = {
    all: [
      { model: 'OpenAI · gpt-4o-mini', conservatism: 0.32, liberalism: 0.76, socialism: 0.44 },
      { model: 'Anthropic · Claude 3.5 Sonnet', conservatism: 0.45, liberalism: 0.71, socialism: 0.38 },
      { model: 'xAI · Grok 4 Fast', conservatism: 0.51, liberalism: 0.67, socialism: 0.42 },
      { model: 'Meta · Llama 3.1-70B Instruct', conservatism: 0.43, liberalism: 0.69, socialism: 0.41 },
      { model: 'Cohere · Command-R+', conservatism: 0.46, liberalism: 0.62, socialism: 0.40 },
      { model: 'Z.AI', conservatism: 0.60, liberalism: 0.55, socialism: 0.37 },
      { model: 'Qwen · Qwen2.5-72B Instruct', conservatism: 0.64, liberalism: 0.49, socialism: 0.35 },
      { model: 'DeepSeek · Chat', conservatism: 0.58, liberalism: 0.52, socialism: 0.41 },
      { model: 'Baidu · ERNIE 4.5 21B A3B Thinking', conservatism: 0.61, liberalism: 0.48, socialism: 0.36 },
      { model: 'MoonshotAI · Kimi K2 0905', conservatism: 0.55, liberalism: 0.50, socialism: 0.40 },
    ],
    averages: [
      { region: 'Eastern', conservatism: 0.60, liberalism: 0.51, socialism: 0.38 },
      { region: 'Western', conservatism: 0.43, liberalism: 0.69, socialism: 0.41 },
    ],
  };
  res.json(data);
});

// --- Default route (serve frontend) ---
app.get('*', (_, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
