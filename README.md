# OpenAI Realtime API Starter

A simple boilerplate for building voice agents with the OpenAI Realtime API. Hook up a microphone, hit "Start Call", and talk to GPT in real time.

Built with Node.js, Express, and WebSockets. Nothing fancy — just the bare minimum to get a voice agent running.

## What it does

- Opens a WebSocket connection to the OpenAI Realtime API
- Streams microphone audio from the browser to GPT
- Plays back GPT's spoken responses through Web Audio API
- Express server acts as a proxy so your API key stays on the server

## Quick start

```bash
git clone https://github.com/Hand-On-Web-Ltd/openai-realtime-starter.git
cd openai-realtime-starter
npm install
cp .env.example .env
# Add your OpenAI API key to .env
npm start
```

Open `http://localhost:3000` and click "Start Call".

## Project structure

```
├── server.js          # Express + WebSocket proxy
├── public/
│   ├── index.html     # Simple UI
│   └── app.js         # Client-side audio + WebSocket
├── package.json
├── .env.example
└── LICENSE
```

## Environment variables

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | Your OpenAI API key |
| `PORT` | Server port (default: 3000) |

## How it works

1. The browser captures microphone audio using the Web Audio API
2. Audio chunks are sent to the Express server via WebSocket
3. The server forwards them to OpenAI's Realtime API
4. GPT's audio responses come back the same way and get played in the browser

That's it. No frameworks, no build step, no magic.

## About Hand On Web
We build AI chatbots, voice agents, and automation tools for businesses.
- 🌐 [handonweb.com](https://www.handonweb.com)
- 📧 outreach@handonweb.com
- 📍 Chester, UK

## Licence
MIT
