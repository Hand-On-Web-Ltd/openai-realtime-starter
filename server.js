require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const REALTIME_URL = 'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01';

if (!OPENAI_API_KEY) {
  console.error('Missing OPENAI_API_KEY in .env');
  process.exit(1);
}

app.use(express.static('public'));

wss.on('connection', (clientWs) => {
  console.log('Client connected');

  const openaiWs = new WebSocket(REALTIME_URL, {
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'OpenAI-Beta': 'realtime=v1',
    },
  });

  openaiWs.on('open', () => {
    console.log('Connected to OpenAI Realtime API');

    // Configure the session
    openaiWs.send(JSON.stringify({
      type: 'session.update',
      session: {
        modalities: ['text', 'audio'],
        instructions: 'You are a helpful voice assistant. Keep responses short and natural.',
        voice: 'alloy',
        input_audio_format: 'pcm16',
        output_audio_format: 'pcm16',
        turn_detection: {
          type: 'server_vad',
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 500,
        },
      },
    }));
  });

  // Forward messages from OpenAI to the client
  openaiWs.on('message', (data) => {
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(data.toString());
    }
  });

  // Forward messages from the client to OpenAI
  clientWs.on('message', (data) => {
    if (openaiWs.readyState === WebSocket.OPEN) {
      openaiWs.send(data.toString());
    }
  });

  clientWs.on('close', () => {
    console.log('Client disconnected');
    openaiWs.close();
  });

  openaiWs.on('close', () => {
    console.log('OpenAI connection closed');
    clientWs.close();
  });

  openaiWs.on('error', (err) => {
    console.error('OpenAI WebSocket error:', err.message);
    clientWs.close();
  });
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
