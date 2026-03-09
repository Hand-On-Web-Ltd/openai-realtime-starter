let ws = null;
let audioContext = null;
let mediaStream = null;
let scriptProcessor = null;
let isCallActive = false;

const callBtn = document.getElementById('callBtn');
const status = document.getElementById('status');
const transcript = document.getElementById('transcript');

function toggleCall() {
  if (isCallActive) {
    stopCall();
  } else {
    startCall();
  }
}

async function startCall() {
  try {
    status.textContent = 'Requesting microphone access...';

    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioContext = new AudioContext({ sampleRate: 24000 });

    const source = audioContext.createMediaStreamSource(mediaStream);
    scriptProcessor = audioContext.createScriptProcessor(4096, 1, 1);

    // Connect WebSocket
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(`${protocol}//${location.host}`);

    ws.onopen = () => {
      status.textContent = 'Connected — start talking!';
      isCallActive = true;
      callBtn.textContent = 'End Call';
      callBtn.classList.add('active');
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      handleServerMessage(msg);
    };

    ws.onclose = () => {
      status.textContent = 'Disconnected';
      stopCall();
    };

    ws.onerror = () => {
      status.textContent = 'Connection error';
      stopCall();
    };

    // Send audio chunks
    scriptProcessor.onaudioprocess = (e) => {
      if (!isCallActive || !ws || ws.readyState !== WebSocket.OPEN) return;

      const inputData = e.inputBuffer.getChannelData(0);
      const pcm16 = float32ToPcm16(inputData);
      const base64 = arrayBufferToBase64(pcm16.buffer);

      ws.send(JSON.stringify({
        type: 'input_audio_buffer.append',
        audio: base64,
      }));
    };

    source.connect(scriptProcessor);
    scriptProcessor.connect(audioContext.destination);

  } catch (err) {
    status.textContent = 'Error: ' + err.message;
    console.error(err);
  }
}

function stopCall() {
  isCallActive = false;
  callBtn.textContent = 'Start Call';
  callBtn.classList.remove('active');

  if (ws) { ws.close(); ws = null; }
  if (scriptProcessor) { scriptProcessor.disconnect(); scriptProcessor = null; }
  if (mediaStream) { mediaStream.getTracks().forEach(t => t.stop()); mediaStream = null; }
  if (audioContext) { audioContext.close(); audioContext = null; }
}

function handleServerMessage(msg) {
  switch (msg.type) {
    case 'response.audio.delta':
      playAudioChunk(msg.delta);
      break;
    case 'response.audio_transcript.delta':
      addTranscript('assistant', msg.delta);
      break;
    case 'conversation.item.input_audio_transcription.completed':
      addTranscript('user', msg.transcript);
      break;
    case 'error':
      status.textContent = 'Error: ' + (msg.error?.message || 'Unknown');
      break;
  }
}

function playAudioChunk(base64Audio) {
  if (!audioContext) return;

  const pcm16 = base64ToArrayBuffer(base64Audio);
  const float32 = pcm16ToFloat32(new Int16Array(pcm16));

  const buffer = audioContext.createBuffer(1, float32.length, 24000);
  buffer.getChannelData(0).set(float32);

  const source = audioContext.createBufferSource();
  source.buffer = buffer;
  source.connect(audioContext.destination);
  source.start();
}

function addTranscript(role, text) {
  if (!text) return;
  const div = document.createElement('div');
  div.className = `msg ${role}`;
  div.textContent = `${role === 'user' ? 'You' : 'GPT'}: ${text}`;
  transcript.appendChild(div);
  transcript.scrollTop = transcript.scrollHeight;
}

// Audio conversion helpers
function float32ToPcm16(float32) {
  const pcm16 = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return pcm16;
}

function pcm16ToFloat32(pcm16) {
  const float32 = new Float32Array(pcm16.length);
  for (let i = 0; i < pcm16.length; i++) {
    float32[i] = pcm16[i] / (pcm16[i] < 0 ? 0x8000 : 0x7FFF);
  }
  return float32;
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}
