import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// CORS for local dev (frontend runs on 127.0.0.1:5500/http-server)
app.use(cors());

// Allow JSON payloads (single + batch uploads)
app.use(express.json({ limit: '5mb' }));

const PORT = process.env.PORT || 8787;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
if (!OPENROUTER_API_KEY) {
  console.warn('[WARN] OPENROUTER_API_KEY is not set. Put it in .env');
}
