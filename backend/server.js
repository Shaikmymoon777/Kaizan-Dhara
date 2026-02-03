const express = require('express');
const cors = require('cors');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const API_KEY = process.env.OLLAMA_API_KEY;

app.post('/api/generate', async (req, res) => {
  try {
    const { model, prompt, system, format, options } = req.body;

    // Construct the Ollama request body
    // Note: Ollama's /api/generate takes 'prompt', 'system', 'template', 'context', etc.
    // If you are using the 'chat' endpoint: /api/chat takes 'messages'
    // Based on the frontend logic we'll build, we might use simple generation or chat.
    // The gemini service uses 'generateContent'. 

    // Let's assume we map the Gemini-style 'contents' to Ollama 'prompt' or 'messages'.
    // For simplicity and alignment with the proposed 'ollamaService.ts', we will forward 
    // what the service sends.

    // If the service sends 'messages' (for chat capabilities), we should use /api/chat
    // If it sends 'prompt', use /api/generate

    const endpoint = req.body.messages ? '/api/chat' : '/api/generate';
    const url = `${OLLAMA_URL}${endpoint}`;

    console.log(`Forwarding to ${url} with model ${model}`);

    const headers = {
      'Content-Type': 'application/json',
    };

    if (API_KEY) {
      headers['Authorization'] = `Bearer ${API_KEY}`;
    }

    const payload = { ...req.body };
    // Remove stream=false if we want streaming, but for now let's assume non-streaming for simplicity 
    // unless the frontend handles streaming. The original App.tsx waits for the full response.
    // So we'll force stream: false for now to make it an easy drop-in replacement.
    payload.stream = false;

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Ollama Error:', response.status, errorText);
      return res.status(response.status).json({ error: errorText });
    }

    const data = await response.json();
    res.json(data);

  } catch (error) {
    console.error('Proxy Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/api/tags', async (req, res) => {
  try {
    const url = `${OLLAMA_URL}/api/tags`;
    console.log(`Forwarding to ${url}`);

    const headers = {};
    if (API_KEY) {
      headers['Authorization'] = `Bearer ${API_KEY}`;
    }

    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Proxy Tags Error:', error);
    res.status(500).json({ error: 'Failed to fetch models' });
  }
});

app.listen(port, () => {
  console.log(`Backend proxy running on http://localhost:${port}`);
  console.log(`Targeting Ollama at: ${OLLAMA_URL}`);
});
