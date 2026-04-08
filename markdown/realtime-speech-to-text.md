# Realtime Speech to Text

Transcribe live microphone audio into text in real time using streaming ASR models.

## Overview

Realtime speech-to-text models convert streaming audio into text transcripts as the user speaks. Unlike [Realtime Voice Conversation](/docs/realtime-voice-conversation) which produces two-way audio, this mode is **audio in → text out** only. There is no AI audio playback — the server returns transcript strings over the WebSocket.

The flow is:

1. **Run** the realtime model via [POST /Run](/docs/run-a-model) to get a `socketaccesstoken`
2. **Connect** to the WebSocket and send `task_info` with your token
3. **Wait** for `task_stream_ready` — the model is ready to receive audio
4. **Stream** microphone audio as binary frames (client → server)
5. **Receive** transcript text as `task_output` messages with `TRANSCRIPT_USER:` prefix
6. **End** the session with `task_session_end`

> **Key difference from Voice Conversation:** No binary audio is sent back from the server. All server → client messages are JSON text events.

## Connection & Registration

After running the task, connect to the WebSocket and register with `task_info`:

```javascript
var ws = new WebSocket("wss://socket.wiro.ai/v1");

ws.onopen = function() {
  ws.send(JSON.stringify({
    type: "task_info",
    tasktoken: "YOUR_SOCKET_ACCESS_TOKEN"
  }));
};
```

> **Note:** Both standard and realtime models use `type: "task_info"` with `tasktoken` to register on the WebSocket.

## Realtime Events

During a realtime speech-to-text session, you'll receive these WebSocket events:

| Event | Direction | Description |
|-------|-----------|-------------|
| `task_stream_ready` | server → client | Session is ready — start sending microphone audio |
| `task_output` | server → client | Transcript text prefixed with `TRANSCRIPT_USER:` |
| `task_stream_end` | server → client | Transcription stream has ended — no more transcripts will arrive |
| `task_cost` | server → client | Cost update — includes `turnCost`, `cumulativeCost`, and `usage` breakdown |
| `task_end` | server → client | The model process has exited. Post-processing follows — wait for `task_postprocess_end` before closing. |
| `task_postprocess_end` | server → client | Post-processing complete — safe to close the WebSocket now. |

> Unlike voice conversation, there are no binary audio frames from the server. Every server message is a JSON text event.

## Audio Format

Audio flows in one direction only: **client → server**.

| Property | Value |
|----------|-------|
| Format | PCM (raw, uncompressed) |
| Bit depth | 16-bit signed integer (Int16) |
| Sample rate | 24,000 Hz (24 kHz) |
| Channels | Mono (1 channel) |
| Byte order | Little-endian |
| Chunk size | 4,800 samples (200 ms) = 9,600 bytes |

> The server internally resamples to the model's native rate (e.g. 16 kHz for Voxtral). Always send at 24 kHz — the server handles conversion.

### Binary Frame Format

Every binary WebSocket frame sent from the client is structured as:

```
[tasktoken]|[PCM audio data]
```

The pipe character `|` (0x7C) separates the token from the raw audio bytes. There are no binary frames from the server — all responses are JSON text.

## Sending Microphone Audio

Capture microphone audio at 24 kHz using the Web Audio API with an AudioWorklet. Convert Float32 samples to Int16, prepend your task token, and send as a binary frame.

Key steps:

1. Request microphone with `getUserMedia` (enable echo cancellation and noise suppression)
2. Create an `AudioContext` at 24,000 Hz sample rate
3. Use an AudioWorklet to buffer and convert samples to Int16
4. Send each chunk as `tasktoken|pcm_data` binary frame
5. Continue sending until you end the session

> **Tip:** You can send audio continuously — the model handles silence detection and only returns transcripts when speech is detected.

## Transcripts

Transcripts arrive as `task_output` messages with the `TRANSCRIPT_USER:` prefix. Each message contains a segment of transcribed speech:

```json
{
  "type": "task_output",
  "message": "TRANSCRIPT_USER:What's the weather like today?"
}

{
  "type": "task_output",
  "message": "TRANSCRIPT_USER:I need to book a flight to New York."
}
```

### Progressive Results

Transcripts arrive progressively as words and phrases are recognized — not just at segment boundaries. The model streams `TRANSCRIPT_USER:` messages word-by-word as speech is detected, so the client can display live, incremental results. To build a full transcript, concatenate all received messages:

```javascript
var fullTranscript = [];

// Inside your message handler
if (msg.type === 'task_output' &&
    typeof msg.message === 'string' &&
    msg.message.startsWith('TRANSCRIPT_USER:')) {
  var segment = msg.message.substring(16);
  fullTranscript.push(segment);
  console.log('Segment:', segment);
  console.log('Full:', fullTranscript.join(' '));
}
```

> **Note:** Unlike voice conversation, there is no `TRANSCRIPT_AI:` prefix. All transcripts are user speech.

## Ending a Session

To gracefully end a realtime session, send `task_session_end`:

```json
{
  "type": "task_session_end",
  "tasktoken": "YOUR_SOCKET_ACCESS_TOKEN"
}
```

After sending this, the server processes any remaining buffered audio, sends final transcript and cost events, and then emits `task_postprocess_end`. Wait for `task_postprocess_end` before closing the WebSocket.

> **Safety:** If the client disconnects without sending `task_session_end`, the server automatically terminates the session to prevent the pipeline from running indefinitely (and the provider from continuing to charge). Always send `task_session_end` explicitly for a clean shutdown.

> **Insufficient balance:** If the wallet runs out of balance during a realtime session, the server automatically stops the session. You will still receive the final `task_cost` and `task_end` events.

## Code Examples

### JavaScript

```javascript
// Realtime Speech-to-Text — Connect and Receive Transcripts

var socketToken = 'YOUR_SOCKET_ACCESS_TOKEN';
var ws = new WebSocket('wss://socket.wiro.ai/v1');
var fullTranscript = [];

ws.onopen = function() {
  ws.send(JSON.stringify({ type: 'task_info', tasktoken: socketToken }));
};

ws.onmessage = function(event) {
  var msg = JSON.parse(event.data);

  if (msg.type === 'task_stream_ready') {
    console.log('Session ready — start microphone');
    startMicrophone(ws, socketToken);
  }

  if (msg.type === 'task_output' &&
      typeof msg.message === 'string' &&
      msg.message.startsWith('TRANSCRIPT_USER:')) {
    var text = msg.message.substring(16);
    fullTranscript.push(text);
    console.log('Transcript:', text);
  }

  if (msg.type === 'task_stream_end') {
    console.log('Transcription stream ended');
  }

  if (msg.type === 'task_cost') {
    console.log('Turn cost:', msg.turnCost,
      'Total:', msg.cumulativeCost);
  }

  if (msg.type === 'task_end') {
    console.log('Model process ended — waiting for post-processing');
  }

  if (msg.type === 'task_postprocess_end') {
    console.log('Session complete');
    console.log('Full transcript:', fullTranscript.join(' '));
    stopMicrophone();
    ws.close();
  }
};

function endSession() {
  ws.send(JSON.stringify({
    type: 'task_session_end',
    tasktoken: socketToken
  }));
}
```

### Mic Capture

```javascript
// Microphone capture at 24kHz PCM Int16
// Binary frame: tasktoken|pcm_data

var audioCtx, workletNode, micStream;

async function startMicrophone(ws, token) {
  micStream = await navigator.mediaDevices
    .getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true
      }
    });

  audioCtx = new AudioContext({ sampleRate: 24000 });

  var code = `
    class P extends AudioWorkletProcessor {
      constructor() { super(); this.buf = new Float32Array(0); }
      process(inputs) {
        var inp = inputs[0] && inputs[0][0];
        if (!inp) return true;
        var nb = new Float32Array(this.buf.length + inp.length);
        nb.set(this.buf);
        nb.set(inp, this.buf.length);
        this.buf = nb;
        while (this.buf.length >= 4800) {
          var c = this.buf.slice(0, 4800);
          this.buf = this.buf.slice(4800);
          var i16 = new Int16Array(c.length);
          for (var i = 0; i < c.length; i++) {
            var s = Math.max(-1, Math.min(1, c[i]));
            i16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
          }
          this.port.postMessage(i16.buffer, [i16.buffer]);
        }
        return true;
      }
    }
    registerProcessor('pcm-24k-processor', P);
  `;
  var blob = new Blob([code], { type: 'application/javascript' });
  await audioCtx.audioWorklet.addModule(
    URL.createObjectURL(blob)
  );

  var src = audioCtx.createMediaStreamSource(micStream);
  workletNode = new AudioWorkletNode(audioCtx, 'pcm-24k-processor');
  src.connect(workletNode);

  workletNode.port.onmessage = function(e) {
    var tokenBytes = new TextEncoder()
      .encode(token + '|');
    var frame = new Uint8Array(
      tokenBytes.length + e.data.byteLength
    );
    frame.set(tokenBytes, 0);
    frame.set(new Uint8Array(e.data), tokenBytes.length);
    if (ws.readyState === 1) ws.send(frame.buffer);
  };
}

function stopMicrophone() {
  if (workletNode) workletNode.disconnect();
  if (audioCtx) audioCtx.close();
  if (micStream)
    micStream.getTracks().forEach(t => t.stop());
}
```

### Python

```python
import asyncio
import json
import websockets
import pyaudio

SOCKET_TOKEN = 'YOUR_SOCKET_ACCESS_TOKEN'
SAMPLE_RATE = 24000
CHUNK = 4800  # 200ms

async def realtime_stt_session():
    uri = 'wss://socket.wiro.ai/v1'
    async with websockets.connect(uri) as ws:
        await ws.send(json.dumps({
            'type': 'task_info',
            'tasktoken': SOCKET_TOKEN
        }))

        pa = pyaudio.PyAudio()
        mic = pa.open(format=pyaudio.paInt16,
            channels=1, rate=SAMPLE_RATE,
            input=True, frames_per_buffer=CHUNK)

        is_listening = False
        full_transcript = []

        async def send_audio():
            while True:
                if is_listening:
                    data = mic.read(CHUNK,
                        exception_on_overflow=False)
                    token = SOCKET_TOKEN.encode() + b'|'
                    await ws.send(token + data)
                await asyncio.sleep(0.01)

        async def receive():
            nonlocal is_listening
            async for msg in ws:
                data = json.loads(msg)
                t = data['type']
                if t == 'task_stream_ready':
                    print('Session ready — sending audio')
                    is_listening = True
                elif t == 'task_stream_end':
                    print('Transcription stream ended')
                    is_listening = False
                elif t == 'task_cost':
                    print(f'Cost: {data["cumulativeCost"]}')
                elif t == 'task_output':
                    m = data.get('message', '')
                    if m.startswith('TRANSCRIPT_USER:'):
                        text = m[16:]
                        full_transcript.append(text)
                        print(f'Transcript: {text}')
                elif t in ('task_end',
                    'task_postprocess_end'):
                    print('Session ended')
                    print(f'Full: {" ".join(full_transcript)}')
                    break

        sender = asyncio.create_task(send_audio())
        try:
            await receive()
        finally:
            sender.cancel()
            try:
                await sender
            except asyncio.CancelledError:
                pass

        mic.stop_stream()
        mic.close()
        pa.terminate()

asyncio.run(realtime_stt_session())
```

### Node.js

```javascript
const WebSocket = require('ws');

const SOCKET_TOKEN = 'YOUR_SOCKET_ACCESS_TOKEN';
const ws = new WebSocket('wss://socket.wiro.ai/v1');
const fullTranscript = [];

ws.on('open', () => {
  ws.send(JSON.stringify({
    type: 'task_info',
    tasktoken: SOCKET_TOKEN
  }));
});

ws.on('message', (data, isBinary) => {
  const msg = JSON.parse(data.toString());

  if (msg.type === 'task_stream_ready') {
    console.log('Session ready — start sending audio');
    startAudioCapture(ws, SOCKET_TOKEN);
  }

  if (msg.type === 'task_output' &&
      typeof msg.message === 'string' &&
      msg.message.startsWith('TRANSCRIPT_USER:')) {
    const text = msg.message.substring(16);
    fullTranscript.push(text);
    console.log('Transcript:', text);
  }

  if (msg.type === 'task_stream_end') {
    console.log('Transcription stream ended');
  }

  if (msg.type === 'task_cost') {
    console.log('Cost:', msg.cumulativeCost);
  }

  if (msg.type === 'task_end') {
    console.log('Model process ended — waiting for post-processing');
  }

  if (msg.type === 'task_postprocess_end') {
    console.log('Done');
    console.log('Full transcript:', fullTranscript.join(' '));
    ws.close();
  }
});

// NOTE: arecord is Linux-only (ALSA). Alternatives:
//   macOS: sox — spawn('sox', ['-d', '-t', 'raw', '-r', '24000', '-b', '16', '-c', '1', '-e', 'signed', '-L', '-'])
//   Windows: sox or ffmpeg — spawn('ffmpeg', ['-f', 'dshow', '-i', 'audio=Microphone', '-ar', '24000', '-ac', '1', '-f', 's16le', '-'])
function startAudioCapture(ws, token) {
  const { spawn } = require('child_process');
  const rec = spawn('arecord', [
    '-f', 'S16_LE', '-r', '24000',
    '-c', '1', '-t', 'raw', '-'
  ]);

  const CHUNK_BYTES = 9600;
  let buffer = Buffer.alloc(0);

  rec.stdout.on('data', (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);
    while (buffer.length >= CHUNK_BYTES) {
      const pcm = buffer.slice(0, CHUNK_BYTES);
      buffer = buffer.slice(CHUNK_BYTES);
      const tokenBuf = Buffer.from(token + '|');
      const frame = Buffer.concat([tokenBuf, pcm]);
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(frame);
      }
    }
  });

  ws.on('close', () => rec.kill());
}

function endSession() {
  ws.send(JSON.stringify({
    type: 'task_session_end',
    tasktoken: SOCKET_TOKEN
  }));
}
```

### Format

```json
{
  "audio_format": {
    "codec": "PCM",
    "bit_depth": "16-bit Int16",
    "sample_rate": 24000,
    "channels": 1,
    "byte_order": "little-endian"
  },
  "binary_frame": {
    "direction": "client → server only",
    "format": "tasktoken|pcm_audio_data"
  },
  "recommended_chunk": {
    "samples": 4800,
    "duration_ms": 200,
    "bytes": 9600
  },
  "events": {
    "task_stream_ready": "Start sending audio",
    "task_stream_end": "Transcription stream ended",
    "task_cost": "Cost per turn + cumulative",
    "task_output": "TRANSCRIPT_USER:<transcribed text>",
    "task_session_end": "Send to end session",
    "task_end": "Server ended session",
    "task_postprocess_end": "Post-processing complete — safe to close"
  },
  "output": {
    "transcript_prefix": "TRANSCRIPT_USER:",
    "audio_playback": false,
    "server_binary_frames": false
  }
}
```
