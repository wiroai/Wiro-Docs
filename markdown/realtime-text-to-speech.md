# Realtime Text to Speech

Build streaming text-to-speech apps with realtime AI models.

## Overview

Realtime text-to-speech models convert text into streaming audio. Unlike standard TTS that processes a full prompt and returns an audio file, realtime TTS streams AI-generated speech as a continuous PCM audio stream over a WebSocket connection — in real time. The text prompt is submitted via [POST /Run](/docs/run-a-model), not over the WebSocket. The WebSocket carries only task events (`task_info`, `task_stream_ready`, etc.), binary audio frames, and control messages (`task_session_end`).

No microphone is required. The flow is one-directional: text goes in, audio comes out.

The flow is:

1. **Run** the realtime TTS model via [POST /Run](/docs/run-a-model) with your text prompt in the parameters
2. **Connect** to the WebSocket and send `task_info` with your `socketaccesstoken`
3. **Wait** for `task_stream_ready` — the model has loaded and is generating audio
4. **Receive** AI audio as binary frames and play them
5. **End** the session with `task_session_end` or wait for the stream to finish naturally

## How It Differs from Realtime Voice Conversation

| | Realtime Voice Conversation | Realtime Text to Speech |
|---|---|---|
| Input | Microphone audio (streamed) | Text (sent with the run request) |
| Output | AI audio + transcripts | AI audio only |
| Direction | Bidirectional (client ↔ server) | Server → client only |
| Microphone | Required | Not required |
| Transcripts | `TRANSCRIPT_USER:` / `TRANSCRIPT_AI:` via `task_output` | None |
| Use case | Interactive voice chat | Narration, voiceover, assistants |

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

> **Note:** Both standard and realtime models use `type: "task_info"` with `tasktoken` to register on the WebSocket. The registration flow is identical to [Realtime Voice Conversation](/docs/realtime-voice-conversation).

## Realtime Events

During a realtime TTS session, you'll receive these WebSocket events:

| Event | Description |
|-------|-------------|
| `task_stream_ready` | Session is ready — the model is generating audio and will begin sending chunks |
| `task_stream_end` | The model finished generating audio for the current segment |
| `task_cost` | Cost update — includes `turnCost`, `cumulativeCost`, and `usage` (raw cost breakdown from the model provider) |
| `task_end` | The model process has exited. Post-processing follows — wait for `task_postprocess_end` to close the connection. |
| `task_postprocess_end` | Post-processing is complete. Safe to close the WebSocket connection. |

> **No `task_output` events.** Unlike voice conversation, TTS sessions do not produce transcript events. The input text is already known (you provided it), and the AI output is audio, not text.

### Event Sequence

A typical TTS session produces events in this order:

```
task_stream_ready     ← model is ready, audio chunks start arriving
[binary frames]       ← PCM audio data (many frames)
task_stream_end       ← audio generation complete for this segment
task_cost             ← cost for this segment
task_end              ← model process exiting
task_postprocess_end  ← safe to close WebSocket
```

## Audio Format

Audio flows in one direction only: **server → client**. The client does not send any audio.

| Property | Value |
|----------|-------|
| Format | PCM (raw, uncompressed) |
| Bit depth | 16-bit signed integer (Int16) |
| Sample rate | 24,000 Hz (24 kHz) |
| Channels | Mono (1 channel) |
| Byte order | Little-endian |
| Chunk size | Variable (typically 200 ms = 4,800 samples = 9,600 bytes) |

### Binary Frame Format

Every binary WebSocket frame from the server is structured as:

```
[tasktoken]|[PCM audio data]
```

The pipe character `|` (0x7C) separates the token from the raw audio bytes. To extract the audio:

1. Find the first `|` byte in the binary frame
2. Everything after it is raw PCM Int16 audio data
3. Convert Int16 samples to your playback format (e.g., Float32 for Web Audio API)

> **Client → server:** In TTS mode, you do not send binary audio frames. The only messages you send are `task_info` (to register) and `task_session_end` (to end the session).

## Receiving AI Audio

AI speech arrives as binary WebSocket frames in PCM Int16 24 kHz format. To play them:

1. Check if the incoming message is binary (a `Blob` in JavaScript, `bytes` in Python) before attempting JSON parse
2. Find the pipe `|` separator and extract audio data after it
3. Convert Int16 → Float32 and create an `AudioBuffer`
4. Schedule gapless playback using `AudioBufferSourceNode` to avoid clicks between chunks

### Gapless Playback

Audio arrives in many small chunks. To play them seamlessly:

- Track a `nextPlayTime` variable initialized to `0`
- For each chunk, schedule it at `max(audioContext.currentTime, nextPlayTime)`
- Advance `nextPlayTime` by the chunk's duration
- This ensures chunks play back-to-back with no gaps or overlaps

## Ending a Session

To gracefully end a realtime TTS session, send `task_session_end`:

```json
{
  "type": "task_session_end",
  "tasktoken": "YOUR_SOCKET_ACCESS_TOKEN"
}
```

After sending this, the server will finish any in-progress generation, send final cost events, and then emit `task_postprocess_end`. Wait for `task_postprocess_end` before closing the WebSocket.

For TTS sessions, the stream often ends naturally when the model finishes generating audio for the provided text. In this case, you'll receive `task_stream_end` followed by `task_end` without needing to send `task_session_end`. However, it's good practice to send it explicitly for a clean shutdown, especially if you want to stop playback early.

> **Safety:** If the client disconnects without sending `task_session_end`, the server automatically terminates the session to prevent the pipeline from running indefinitely (and the provider from continuing to charge). Always send `task_session_end` explicitly for a clean shutdown.

> **Insufficient balance:** If the wallet runs out of balance during a realtime session, the server automatically stops the session. You will still receive the final `task_cost` and `task_end` events.

## Code Examples

### JavaScript

```javascript
// Realtime TTS Session — Connect, Receive Audio, and Play

var socketToken = 'YOUR_SOCKET_ACCESS_TOKEN';
var ws = new WebSocket('wss://socket.wiro.ai/v1');

// Audio playback state
var playCtx = new AudioContext({ sampleRate: 24000 });
var nextPlayTime = 0;

ws.onopen = function() {
  ws.send(JSON.stringify({
    type: 'task_info',
    tasktoken: socketToken
  }));
};

ws.onmessage = function(event) {
  if (event.data instanceof Blob) {
    playAudioChunk(event.data); // defined in "Play Audio" section below
    return;
  }

  var msg = JSON.parse(event.data);

  if (msg.type === 'task_stream_ready') {
    console.log('TTS stream ready — audio chunks incoming');
    nextPlayTime = 0;
  }

  if (msg.type === 'task_stream_end') {
    console.log('Audio generation complete');
  }

  if (msg.type === 'task_cost') {
    console.log('Turn cost:', msg.turnCost,
      'Total:', msg.cumulativeCost);
  }

  if (msg.type === 'task_end') {
    console.log('Session ended');
  }

  if (msg.type === 'task_postprocess_end') {
    console.log('Post-processing done — closing');
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

### Play Audio

```javascript
// Receive and play AI audio (PCM Int16 24kHz)
// Gapless scheduling ensures smooth, uninterrupted playback

function playAudioChunk(blob) {
  blob.arrayBuffer().then(function(buffer) {
    var bytes = new Uint8Array(buffer);

    // Find pipe separator between token and audio
    var pipeIndex = bytes.indexOf(0x7C);
    if (pipeIndex < 0) return;

    var audioData = buffer.slice(pipeIndex + 1);
    if (audioData.byteLength === 0) return;

    // Convert Int16 → Float32 for Web Audio API
    var int16 = new Int16Array(audioData);
    var float32 = new Float32Array(int16.length);
    for (var i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / 32768.0;
    }

    // Create AudioBuffer and schedule gapless playback
    var audioBuf = playCtx.createBuffer(
      1, float32.length, 24000
    );
    audioBuf.getChannelData(0).set(float32);

    var src = playCtx.createBufferSource();
    src.buffer = audioBuf;
    src.connect(playCtx.destination);

    var now = playCtx.currentTime;
    var startAt = Math.max(now, nextPlayTime);
    src.start(startAt);
    nextPlayTime = startAt + audioBuf.duration;
  });
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

async def tts_session():
    uri = 'wss://socket.wiro.ai/v1'
    async with websockets.connect(uri) as ws:
        # Register
        await ws.send(json.dumps({
            'type': 'task_info',
            'tasktoken': SOCKET_TOKEN
        }))

        # Audio output setup (speaker only — no mic needed)
        pa = pyaudio.PyAudio()
        speaker = pa.open(
            format=pyaudio.paInt16,
            channels=1,
            rate=SAMPLE_RATE,
            output=True
        )

        session_active = True

        async def receive():
            nonlocal session_active
            async for msg in ws:
                if isinstance(msg, bytes):
                    # Binary frame: tasktoken|pcm_data
                    pipe = msg.find(0x7C)
                    if pipe == -1:
                        continue
                    audio = msg[pipe + 1:]
                    speaker.write(audio)
                    continue

                data = json.loads(msg)
                t = data['type']

                if t == 'task_stream_ready':
                    print('TTS stream ready', flush=True)

                elif t == 'task_stream_end':
                    print('Audio generation complete', flush=True)

                elif t == 'task_cost':
                    print(f'Cost: {data["cumulativeCost"]}', flush=True)

                elif t in ('task_end', 'task_postprocess_end'):
                    print('Session ended', flush=True)
                    session_active = False
                    break

        try:
            await receive()
        finally:
            speaker.stop_stream()
            speaker.close()
            pa.terminate()

asyncio.run(tts_session())
```

### Node.js

```javascript
const WebSocket = require('ws');

const SOCKET_TOKEN = 'YOUR_SOCKET_ACCESS_TOKEN';
const ws = new WebSocket('wss://socket.wiro.ai/v1');

var audioChunks = [];

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
    if (pipe !== -1) {
      const audio = buf.slice(pipe + 1);
      audioChunks.push(audio);
      console.log('Audio chunk:', audio.length, 'bytes');
    }
    return;
  }

  const msg = JSON.parse(data.toString());

  if (msg.type === 'task_stream_ready') {
    console.log('TTS stream ready — receiving audio');
    audioChunks = [];
  }

  if (msg.type === 'task_stream_end') {
    console.log('Audio complete:',
      audioChunks.length, 'chunks received');
    // Concatenate and save or pipe to speaker
    var total = Buffer.concat(audioChunks);
    console.log('Total audio:', total.length, 'bytes',
      '(' + (total.length / 2 / 24000).toFixed(1) + 's)');
  }

  if (msg.type === 'task_cost') {
    console.log('Cost:', msg.cumulativeCost);
  }

  if (msg.type === 'task_end') {
    console.log('Done');
  }

  if (msg.type === 'task_postprocess_end') {
    ws.close();
  }
});

// End session early (optional — stream ends naturally)
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
    "direction": "server → client",
    "format": "tasktoken|pcm_audio_data",
    "separator": "|",
    "separator_byte": "0x7C"
  },
  "typical_chunk": {
    "samples": 4800,
    "duration_ms": 200,
    "bytes": 9600
  },
  "events": {
    "task_stream_ready": "Audio generation started",
    "task_stream_end": "Audio generation complete",
    "task_cost": "Cost per turn + cumulative",
    "task_session_end": "Send to end session early",
    "task_end": "Server ended session",
    "task_postprocess_end": "Post-processing complete — safe to close"
  }
}
```
