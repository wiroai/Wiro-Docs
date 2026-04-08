# Realtime Voice

Build interactive voice conversation apps with realtime AI models.

## Overview

Realtime voice models enable two-way audio conversations with AI. Unlike standard model runs that process a single input and return a result, realtime sessions maintain a persistent WebSocket connection where you stream microphone audio and receive AI speech in real time.

The flow is:

1. **Run** the realtime model via [POST /Run](/docs/run-a-model) to get a `socketaccesstoken`
2. **Connect** to the WebSocket and send `task_info` with your token
3. **Wait** for `task_stream_ready` — the model is ready to receive audio
4. **Stream** microphone audio as binary frames
5. **Receive** AI audio as binary frames and play them
6. **End** the session with `task_session_end`

## Connection & Registration

After running the task, connect to the WebSocket and register with `task_info` :

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

During a realtime session, you'll receive these WebSocket events:

| Event | Direction | Description |
|-------|-----------|-------------|
| `task_stream_ready` | server → client | Session is ready — start sending microphone audio |
| `task_stream_end` | server → client | AI finished speaking for this turn — you can speak again |
| `task_cost` | server → client | Cost update per turn — includes `turnCost`, `cumulativeCost`, and `usage` (raw cost breakdown from the model provider) |
| `task_output` | server → client | Transcript messages prefixed with `TRANSCRIPT_USER:` or `TRANSCRIPT_AI:` |
| `task_end` | server → client | The model process has exited. Post-processing follows — wait for `task_postprocess_end` to close the connection. |
| `task_session_end` | client → server | Gracefully end the session |
| `task_session_interrupt` | client → server | Interrupt AI speech — stops playback and lets the user speak |

## Audio Format

Both directions (microphone → server, server → client) use the same format:

| Property | Value |
|----------|-------|
| Format | PCM (raw, uncompressed) |
| Bit depth | 16-bit signed integer (Int16) |
| Sample rate | 24,000 Hz (24 kHz) |
| Channels | Mono (1 channel) |
| Byte order | Little-endian |
| Chunk size | 4,800 samples (200 ms) = 9,600 bytes |

### Binary Frame Format

Every binary WebSocket frame (in both directions) is structured as:

```
[tasktoken]|[PCM audio data]
```

The pipe character `|` (0x7C) separates the token from the raw audio bytes.

## Sending Microphone Audio

Capture microphone at 24 kHz using the Web Audio API with an AudioWorklet. Convert Float32 samples to Int16, prepend your task token, and send as a binary frame.

Key steps:

1. Request microphone with `getUserMedia` (enable echo cancellation and noise suppression)
2. Create an `AudioContext` at 24,000 Hz sample rate
3. Use an AudioWorklet to buffer and convert samples to Int16
4. Send each chunk as `tasktoken|pcm_data` binary frame

## Receiving AI Audio

AI responses arrive as binary WebSocket frames in the same PCM Int16 24 kHz format. To play them:

1. Check if the message is a `Blob` (binary) before parsing as JSON
2. Find the pipe `|` separator and extract audio data after it
3. Convert Int16 → Float32 and create an `AudioBuffer`
4. Schedule gapless playback using `AudioBufferSourceNode`

## Transcripts

Both user and AI speech are transcribed automatically. Transcripts arrive as `task_output` messages with a string prefix:

- `TRANSCRIPT_USER:` — what the user said
- `TRANSCRIPT_AI:` — what the AI said

```json
// Example task_output message
{
  "type": "task_output",
  "message": "TRANSCRIPT_USER:What's the weather like today?"
}

{
  "type": "task_output",
  "message": "TRANSCRIPT_AI:I'd be happy to help, but I don't have access to real-time weather data."
}
```

## Interrupting AI Speech

While the AI is speaking, you can interrupt it to take over the conversation. Send `task_session_interrupt`:

```json
{
  "type": "task_session_interrupt",
  "tasktoken": "YOUR_SOCKET_ACCESS_TOKEN"
}
```

When the server receives this:
- The AI immediately stops generating audio
- A final `task_stream_end` is sent for the interrupted turn
- The session continues — the user can speak and the AI will respond to the next input

On the client side, stop audio playback immediately when the user triggers an interrupt. This gives instant feedback (AI voice cuts off) while the server processes the signal.

> **Tip:** Some models support natural interruption — if the user starts speaking while the AI is talking, the model may stop on its own. The explicit `task_session_interrupt` signal provides a reliable, manual interrupt for all models.

## Ending a Session

To gracefully end a realtime session, send `task_session_end`:

```json
{
  "type": "task_session_end",
  "tasktoken": "YOUR_SOCKET_ACCESS_TOKEN"
}
```

After sending this, the server will process any remaining audio, send final cost/transcript events, and then emit `task_postprocess_end`. Wait for `task_postprocess_end` before closing the WebSocket.

> **Safety:** If the client disconnects without sending `task_session_end`, the server automatically terminates the session to prevent the pipeline from running indefinitely (and the provider from continuing to charge). Always send `task_session_end` explicitly for a clean shutdown.

> **Insufficient balance:** If the wallet runs out of balance during a realtime session, the server automatically stops the session. You will still receive the final `task_cost` and `task_end` events.

## Code Examples

### JavaScript

```javascript
// Realtime Voice Session — Connect and Handle Events

var socketToken = 'YOUR_SOCKET_ACCESS_TOKEN';
var ws = new WebSocket('wss://socket.wiro.ai/v1');

ws.onopen = function() {
  ws.send(JSON.stringify({ type: 'task_info', tasktoken: socketToken }));
};

ws.onmessage = function(event) {
  if (event.data instanceof Blob) {
    handleAudioResponse(event.data);
    return;
  }

  var msg = JSON.parse(event.data);

  if (msg.type === 'task_stream_ready') {
    console.log('Session ready — start microphone');
    startMicrophone(ws, socketToken);
  }

  if (msg.type === 'task_stream_end') {
    console.log('AI finished speaking — listening');
  }

  if (msg.type === 'task_cost') {
    console.log('Turn cost:', msg.turnCost,
      'Total:', msg.cumulativeCost);
  }

  if (msg.type === 'task_output' &&
      typeof msg.message === 'string') {
    if (msg.message.startsWith('TRANSCRIPT_USER:')) {
      console.log('You:', msg.message.substring(16));
    }
    if (msg.message.startsWith('TRANSCRIPT_AI:')) {
      console.log('AI:', msg.message.substring(14));
    }
  }

  if (msg.type === 'task_end') {
    console.log('Session ended');
    stopMicrophone();
    ws.close();
  }
};

function interruptAI() {
  ws.send(JSON.stringify({
    type: 'task_session_interrupt',
    tasktoken: socketToken
  }));
}

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

  // Inline AudioWorklet processor
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
    registerProcessor('p', P);
  `;
  var blob = new Blob([code], { type: 'application/javascript' });
  await audioCtx.audioWorklet.addModule(
    URL.createObjectURL(blob)
  );

  var src = audioCtx.createMediaStreamSource(micStream);
  workletNode = new AudioWorkletNode(audioCtx, 'p');
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

### Play Audio

```javascript
// Receive and play AI audio (PCM Int16 24kHz)

var playCtx = new AudioContext({ sampleRate: 24000 });
var nextPlayTime = 0;

function handleAudioResponse(blob) {
  blob.arrayBuffer().then(function(buffer) {
    var bytes = new Uint8Array(buffer);

    // Find pipe separator
    var pipeIndex = bytes.indexOf(0x7C);
    if (pipeIndex < 0) return;

    var audioData = buffer.slice(pipeIndex + 1);

    // Convert Int16 → Float32
    var int16 = new Int16Array(audioData);
    var float32 = new Float32Array(int16.length);
    for (var i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / 32768.0;
    }

    // Schedule gapless playback
    var audioBuf = playCtx.createBuffer(
      1, float32.length, 24000
    );
    audioBuf.getChannelData(0).set(float32);

    var src = playCtx.createBufferSource();
    src.buffer = audioBuf;
    src.connect(playCtx.destination);

    var now = playCtx.currentTime;
    var t = Math.max(now, nextPlayTime);
    src.start(t);
    nextPlayTime = t + audioBuf.duration;
  });
}
```

### Python

```python
import asyncio
import json
import struct
import websockets
import pyaudio

SOCKET_TOKEN = 'YOUR_SOCKET_ACCESS_TOKEN'
SAMPLE_RATE = 24000
CHUNK = 4800  # 200ms

async def realtime_session():
    uri = 'wss://socket.wiro.ai/v1'
    async with websockets.connect(uri) as ws:
        # Register
        await ws.send(json.dumps({
            'type': 'task_info',
            'tasktoken': SOCKET_TOKEN
        }))

        # Audio setup
        pa = pyaudio.PyAudio()
        mic = pa.open(format=pyaudio.paInt16,
            channels=1, rate=SAMPLE_RATE,
            input=True, frames_per_buffer=CHUNK)
        speaker = pa.open(format=pyaudio.paInt16,
            channels=1, rate=SAMPLE_RATE,
            output=True)

        is_listening = False

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
                if isinstance(msg, bytes):
                    pipe = msg.index(0x7C)
                    speaker.write(msg[pipe+1:])
                    continue
                data = json.loads(msg)
                t = data['type']
                if t == 'task_stream_ready':
                    print('Session ready')
                    is_listening = True
                elif t == 'task_stream_end':
                    print('AI finished speaking')
                    is_listening = True
                elif t == 'task_cost':
                    print(f'Cost: {data["cumulativeCost"]}')
                elif t == 'task_output':
                    m = data.get('message', '')
                    if m.startswith('TRANSCRIPT_USER:'):
                        print(f'You: {m[16:]}')
                    elif m.startswith('TRANSCRIPT_AI:'):
                        print(f'AI: {m[14:]}')
                elif t in ('task_end',
                    'task_postprocess_end'):
                    print('Session ended')
                    break

        await asyncio.gather(
            send_audio(), receive())

asyncio.run(realtime_session())
```

### Node.js

```javascript
const WebSocket = require('ws');
const { spawn } = require('child_process');

const SOCKET_TOKEN = 'YOUR_SOCKET_ACCESS_TOKEN';
const ws = new WebSocket('wss://socket.wiro.ai/v1');

ws.on('open', () => {
  ws.send(JSON.stringify({
    type: 'task_info',
    tasktoken: SOCKET_TOKEN
  }));
});

ws.on('message', (data, isBinary) => {
  if (isBinary) {
    const buf = Buffer.from(data);
    const pipe = buf.indexOf(0x7C);
    if (pipe > 0) {
      const audio = buf.slice(pipe + 1);
      // Play via speaker or save to file
      console.log('Audio chunk:', audio.length, 'bytes');
    }
    return;
  }

  const msg = JSON.parse(data.toString());

  if (msg.type === 'task_stream_ready') {
    console.log('Session ready — start sending audio');
    // Start mic capture and send as binary
  }

  if (msg.type === 'task_cost') {
    console.log('Cost:', msg.cumulativeCost);
  }

  if (msg.type === 'task_output' &&
      typeof msg.message === 'string') {
    if (msg.message.startsWith('TRANSCRIPT_USER:'))
      console.log('You:', msg.message.substring(16));
    if (msg.message.startsWith('TRANSCRIPT_AI:'))
      console.log('AI:', msg.message.substring(14));
  }

  if (msg.type === 'task_end') {
    console.log('Done');
    ws.close();
  }
});

// End session
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
  "binary_frame": "tasktoken|pcm_audio_data",
  "recommended_chunk": {
    "samples": 4800,
    "duration_ms": 200,
    "bytes": 9600
  },
  "events": {
    "task_stream_ready": "Start sending audio",
    "task_stream_end": "AI finished speaking",
    "task_cost": "Cost per turn + cumulative",
    "task_output": "TRANSCRIPT_USER: / TRANSCRIPT_AI:",
    "task_session_interrupt": "Send to interrupt AI speech",
    "task_session_end": "Send to end session",
    "task_end": "Server ended session"
  }
}
```
