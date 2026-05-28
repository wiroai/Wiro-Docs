# Web Voice Channel

Embed a real-time voice conversation with a Wiro agent into your own browser app. Used by the [Voice Receptionist](https://wiro.ai/agents/voice-receptionist) and [Voice Sales Rep](https://wiro.ai/agents/voice-sales-rep) preset agents, and by any custom agent that needs an "Open mic" button on a website.

## Overview

Toggle `util-web-channel` on a useragent and a single REST call (`POST /UserAgent/Realtime/WebStart`) returns everything the browser needs to open an authenticated WebSocket and stream microphone audio straight to the agent. The same agent can also pick up phone calls via [Twilio Voice](/docs/integration-twiliovoice-skills) — the two channels share the same realtime runtime and end up in the same [Call History](/docs/integration-twiliovoice-skills#call-history).

**Skill that powers this channel:**

- `util-web-channel` — browser voice channel. Bundled on the Voice Receptionist and Voice Sales Rep presets; toggle it on for custom builds via `POST /UserAgent/SkillsApply`.

**Agents that typically enable this channel:**

- [Voice Receptionist](https://wiro.ai/agents/voice-receptionist) — phone + browser receptionist.
- [Voice Sales Rep](https://wiro.ai/agents/voice-sales-rep) — outbound sales rep with an "Open mic" CTA.
- Custom agents that need a voice button on a website or web app.

**Web channel vs Twilio channel** — pick by where the caller comes from:

| Channel | Caller comes from | When to use |
|---------|-------------------|-------------|
| Web (this page) | Browser mic on **your** site | "Open mic" button on a product / support / sales page. No phone number, no per-minute Twilio bill. |
| [Twilio](/docs/integration-twiliovoice-skills) | Inbound PSTN phone call | A real phone number ringing. Twilio bills per inbound minute. |

> No third-party billing on this channel. The live call audio is billed through the [`int-wiro-aimodels`](/docs/agent-credentials) skill against your own Wiro AI Models balance (you bring your own Wiro API key) — it is **not** charged to the agent's platform credit pool. Only the post-call text turn is billed as a normal token deduct (`action: "tokens"`) on [`POST /UserAgent/TransactionList`](/docs/agent-transactions#post-useragenttransactionlist).

## Availability

| Mode | Status | Notes |
|------|--------|-------|
| Bearer auth (Wiro-Web operator session) | Available | Origin must be `https://wiro.ai` / `https://www.wiro.ai` (or `http://localhost:3000` / `http://localhost:8080` in non-prod — other dev ports like `:5173` / `:4200` are rejected). |
| `x-api-key` (project API key) | Available | No Origin check. Use this when proxying through your own backend, or when embedding the voice button in a non-Wiro origin. |

## Prerequisites

- **A Wiro API key** — [Authentication](/docs/authentication).
- **A deployed agent** in `status: 4` (Running) — [Agent Overview](/docs/agent-overview). Voice Receptionist / Voice Sales Rep presets work out of the box; for custom agents, enable `util-web-channel` via `POST /UserAgent/SkillsApply`.
- **A browser that can capture microphone audio** at 24 kHz mono PCM (every evergreen browser via `getUserMedia` + Web Audio).

## Setup

### Step 1: Start a session — `POST /UserAgent/Realtime/WebStart`

Issues a short-lived JWT (5 min TTL) bound to a fresh `sessionId` and to your agent. The browser presents that JWT to the WebSocket on first connect — no API key ever needs to reach the browser.

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Realtime/WebStart" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "session_metadata": {
      "page_url": "https://yourapp.com/agents/sales-rep",
      "display_identifier": "Acme Inc."
    }
  }'
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Useragent instance guid. Must be owned by the caller (or a team agent the caller is a member of), must be in `status: 4` (Running), and must have `util-web-channel` enabled. |
| `session_metadata` | object | No | Optional caller context surfaced to the agent + later to [Call History](/docs/integration-twiliovoice-skills#call-history). |
| `session_metadata.page_url` | string | No | The page URL the caller opened the mic from. Up to 2048 chars. Echoed back as `callerInfo.page_url`. |
| `session_metadata.display_identifier` | string | No | Operator-supplied display name (e.g. logged-in customer name, account name). 1–100 chars matching `^[\p{L}\p{N} @._\-'+]+$` (Unicode letters / numbers / spaces / `@ . _ - ' +`). The check is **whole-string** — any character outside the allowlist (newlines, tabs, ampersands, backticks, `$`, etc.) silently rejects the entire field (`callerInfo.display_identifier` ends up `null`). Pre-sanitize on your side if you accept arbitrary input. |

Response:

```json
{
  "result": true,
  "sessionId": "vws-9d2d4b6e-3f6b-4c1a-8a7e-1f5a0b2c3d4e",
  "wsUrl": "wss://socket.wiro.ai/v1/AgentRealtime/Web",
  "sessionToken": "eyJwYXlsb2FkIjoidnNidS05ZDJkLi4ufQ.aGV4LWhtYWMtc2lnbmF0dXJl",
  "expiresAt": 1748212800000,
  "estimatedReadyMs": 8000
}
```

| Field | Description |
|-------|-------------|
| `sessionId` | Opaque `vws-<uuid-v4>` identifier. Use it on `Realtime/Cancel`; the bridge also resolves it from the JWT after WebSocket connect. |
| `wsUrl` | Environment-specific WebSocket URL — pass it back to the browser verbatim, don't hardcode the host. Production lives at `wss://socket.wiro.ai/v1/AgentRealtime/Web`. |
| `sessionToken` | HS256-signed bearer token. **Two-segment, JWT-like** (`<base64url(payload)>.<base64url(hmac)>`) — there is no header segment, so standard JWT libraries (`jsonwebtoken`, `jose`, `PyJWT`) reject it as malformed. Decode the first segment with `base64url → JSON.parse` if you need to inspect it. Payload: `{ sessionId, useragentguid, uuid, callerInfo, rateKey, iat, exp }` — `uuid` is the **useragent's** uuid (not the calling user's), `iat`/`exp` are auto-injected, TTL 300 s. Send the whole token as the **first** WebSocket message body; never reuse after the WS handshake. |
| `expiresAt` | Wallclock JWT expiry in ms since epoch. After this point the browser must call `WebStart` again for a fresh token. |
| `estimatedReadyMs` | Approximate time (ms) until the agent will be ready to speak after WS connect. The real "ready" signal is the `{ type: "ready" }` frame on the WebSocket. |

> The endpoint also kicks off an asynchronous **agent prep** so the realtime model has the agent's system prompt + memory warm by the time the browser finishes the WS handshake. That's why a separate `Realtime/Cancel` call exists — if the browser never makes it to the WS step (mic permission denied, user changed their mind), Cancel tears the prep down immediately instead of leaving the warmed session to idle until the cleanup guard fires.

### Step 2: Connect the WebSocket

Open a WebSocket to the returned `wsUrl` and send the `session_start` JSON frame **within 10 seconds**. After that, frame microphone audio as 24 kHz mono PCM int16 with a `<sessionId>|` text prefix. **Server-sent binary audio frames use the same prefix shape — you must strip it before feeding the bytes to Web Audio.**

The example below boots a working voice call end-to-end: it acquires the mic, mounts an `AudioWorklet` that emits 24 kHz Int16 PCM, opens the WebSocket, presents the JWT, handles every server frame the bridge actually sends, and plays the agent's audio back through `AudioContext`. Drop it into a page paired with the worklet at `audio-processor.js` shown below.

```javascript
// ===== voice-client.js — runs in the browser =====

// 1. POST /UserAgent/Realtime/WebStart from YOUR backend, then pass the
//    sessionId / wsUrl / sessionToken down to the page. Never expose your
//    Wiro API key to the page.
const { sessionId, wsUrl, sessionToken } = await fetch("/api/voice/start").then((r) => r.json());

const audioCtx = new AudioContext({ sampleRate: 24000 });
await audioCtx.audioWorklet.addModule("/audio-processor.js");
let playbackCursor = 0;
const scheduledNodes = new Set();
let interruptActive = false;

function playPcmInt16(pcm) {
  // pcm: Int16Array, 24kHz mono. Convert to Float32 [-1, 1] and schedule.
  const f32 = new Float32Array(pcm.length);
  for (let i = 0; i < pcm.length; i++) f32[i] = pcm[i] / 32768;
  const buf = audioCtx.createBuffer(1, f32.length, 24000);
  buf.copyToChannel(f32, 0);
  const node = audioCtx.createBufferSource();
  node.buffer = buf;
  node.connect(audioCtx.destination);
  const startAt = playbackCursor < audioCtx.currentTime ? audioCtx.currentTime : playbackCursor;
  scheduledNodes.add(node);
  node.onended = () => scheduledNodes.delete(node);
  node.start(startAt);
  playbackCursor = startAt + buf.duration;
}

function flushPlayback() {
  // Used on `clear` (barge-in): cancel everything still pending.
  for (const node of scheduledNodes) { try { node.stop(); } catch {} }
  scheduledNodes.clear();
  playbackCursor = audioCtx.currentTime;
}

// 2. Open the WebSocket and present the token as the first message.
const ws = new WebSocket(wsUrl);
ws.binaryType = "arraybuffer";

ws.addEventListener("open", () => {
  ws.send(JSON.stringify({ type: "session_start", sessionToken }));
});

ws.addEventListener("message", async (event) => {
  if (event.data instanceof ArrayBuffer) {
    // Binary frame: <sessionId>|<pcm-int16-24khz-mono>. STRIP the prefix.
    if (interruptActive) return;
    const u8 = new Uint8Array(event.data);
    const pipe = u8.indexOf(0x7c); // '|'
    if (pipe < 0) return;
    const pcmBytes = u8.subarray(pipe + 1);
    const pcm = new Int16Array(pcmBytes.buffer, pcmBytes.byteOffset, pcmBytes.byteLength / 2);
    playPcmInt16(pcm);
    return;
  }
  // Text frame: control / transcript JSON.
  const msg = JSON.parse(event.data);
  switch (msg.type) {
    case "connecting":   onConnecting?.(); break;
    case "ready":        await startMicCapture(); break;
    case "transcript":
      // { role: "user"|"ai", text: "...", ts: <epoch ms> }
      appendTranscript(msg.role, msg.text, msg.ts);
      break;
    case "clear":        // barge-in: drop the agent's pending audio.
      flushPlayback();
      interruptActive = true;
      break;
    case "resume":       // new agent utterance starting after `clear`.
      interruptActive = false;
      break;
    case "session_end":  // terminal — read msg.reason / msg.message / msg.error
      onEnded?.(msg.reason, msg.message || msg.error);
      try { ws.close(); } catch {}
      break;
  }
});

// 3. Mic capture pipeline — AudioWorkletNode posts 200ms Int16 PCM chunks
//    that we frame as `<sessionId>|<binary>` and ship over the socket.
let micStream, workletNode;
async function startMicCapture() {
  micStream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 24000 },
  });
  const source = audioCtx.createMediaStreamSource(micStream);
  workletNode = new AudioWorkletNode(audioCtx, "pcm-24k-processor");
  source.connect(workletNode);

  const sessionMarker = new TextEncoder().encode(sessionId);
  workletNode.port.onmessage = (e) => {
    const pcmBytes = new Uint8Array(e.data); // ArrayBuffer of Int16 samples
    const frame = new Uint8Array(sessionMarker.length + 1 + pcmBytes.byteLength);
    frame.set(sessionMarker, 0);
    frame[sessionMarker.length] = 0x7c; // '|'
    frame.set(pcmBytes, sessionMarker.length + 1);
    if (ws.readyState === WebSocket.OPEN) ws.send(frame);
  };
}

// 4. UI hooks
function muteMic(on) {
  // Mute is purely client-side — toggle the mic track. The bridge has no
  // server-side mute handler.
  micStream?.getAudioTracks().forEach((t) => (t.enabled = !on));
}
function bargeIn() { ws.send(JSON.stringify({ type: "interrupt" })); }
function endCall() { ws.send(JSON.stringify({ type: "end" })); }
```

```javascript
// ===== audio-processor.js — served from your origin, registered above =====
class PCM24kProcessor extends AudioWorkletProcessor {
  constructor() { super(); this.buffer = new Float32Array(0); }
  process(inputs) {
    const input = inputs[0]?.[0];
    if (!input) return true;
    const merged = new Float32Array(this.buffer.length + input.length);
    merged.set(this.buffer);
    merged.set(input, this.buffer.length);
    this.buffer = merged;
    // Ship 200ms (4800 samples @ 24kHz) chunks to the main thread.
    while (this.buffer.length >= 4800) {
      const chunk = this.buffer.slice(0, 4800);
      this.buffer = this.buffer.slice(4800);
      const i16 = new Int16Array(chunk.length);
      for (let i = 0; i < chunk.length; i++) {
        const s = Math.max(-1, Math.min(1, chunk[i]));
        i16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }
      this.port.postMessage(i16.buffer, [i16.buffer]);
    }
    return true;
  }
}
registerProcessor("pcm-24k-processor", PCM24kProcessor);
```

> **Sample rate trick.** Browsers treat `getUserMedia({audio:{sampleRate:24000}})` as a hint, not a guarantee — most capture at 48 kHz. The `AudioContext({sampleRate: 24000})` wrapper does the resampling for you on the `MediaStreamSource → AudioWorkletNode` graph, so the worklet always sees 24 kHz Float32 input. If you create the context at any other rate you'll ship the wrong sample rate and the agent will sound chipmunked or slowed.

### Step 3 (optional): Cancel a stale session — `POST /UserAgent/Realtime/Cancel`

If the browser can't progress past `WebStart` (mic permission denied, user navigated away, tab crashed), call `Realtime/Cancel` so the server-side agent prep tears down immediately instead of waiting on the 5-minute cleanup guard. Idempotent — safe to call from a beacon / `pagehide` handler.

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Realtime/Cancel" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "sessionId": "vws-9d2d4b6e-3f6b-4c1a-8a7e-1f5a0b2c3d4e",
    "sessionToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sessionId` | string | Yes | The `sessionId` returned by `WebStart`. |
| `sessionToken` | string | Yes | The same JWT `WebStart` returned. Used to prove the caller actually owns this `sessionId` — server verifies the signature with `BRIDGE_JWT_SECRET` and checks `payload.sessionId === body.sessionId`. |

Response:

```json
{ "result": true, "sessionId": "vws-9d2d4b6e-...", "cancelled": true }
```

| HTTP | Error | When |
|------|-------|------|
| 400 | `sessionId and sessionToken required` | Either field missing. |
| 401 | `invalid token` | JWT signature mismatch, expired, or malformed. |
| 403 | `sessionId mismatch` | The JWT's `sessionId` claim doesn't match the body's `sessionId`. |

> No-op when the session is already cleaned up (Bridge teardown, prior Cancel, or 5-min cleanup guard). The endpoint always returns `cancelled: true` on success — there's no separate "already cleaned" signal.

## WebSocket Protocol

The browser bridge lives at `wss://<env>/v1/AgentRealtime/Web`. The same prefix hosts the Twilio Media Streams handler at `/v1/AgentRealtime/Twilio`, but you never call that directly — Twilio's auto-configured `VoiceUrl` points at it.

### First message (text frame)

```json
{ "type": "session_start", "sessionToken": "<jwt-from-WebStart>" }
```

Must arrive within 10 seconds of the WebSocket `open` event. Late or malformed → the server closes the socket with no further messages. The JWT verify resolves the `sessionId` server-side; you never need to put `sessionId` in the URL.

### Audio frames (binary, both directions)

| Field | Format |
|-------|--------|
| Audio | PCM int16, 24 kHz, mono. |
| Frame | `<sessionId>|<binary-pcm>` — UTF-8 text prefix (the same `vws-<uuid>` returned by `WebStart`) + `|` (0x7C) separator + raw PCM bytes. Same shape as the [Realtime Voice Conversation](/docs/realtime-voice-conversation#audio-format) channel. **Both directions** use this prefix — when you receive a binary frame from the server you must locate the first `0x7C` byte and slice everything after it as `Int16Array`. |

The bridge transcodes server-side if a downstream model needs a different sample rate, so you always send 24 kHz from the browser.

### Browser → server control frames (text)

| Body | Effect |
|------|--------|
| `{ "type": "interrupt" }` | Cuts the agent mid-sentence (barge-in). Use this when the user starts speaking again before the agent finishes. The bridge confirms with a `clear` frame back. |
| `{ "type": "end" }` | Graceful disconnect — the bridge flushes its buffers, emits a final transcript + `session_end` frame, then closes. |

> **Mute is client-side, not a server frame.** The bridge has no `mute` handler — toggle the mic `MediaStreamTrack.enabled = false` (or stop posting audio frames from your worklet) instead. Sending `{type:"mute"}` is silently ignored.

### Server → browser frames

| Body / type | Notes |
|-------------|-------|
| `{ "type": "connecting" }` | Sent right after the bridge accepts your `session_start`. Handshake is in progress; the realtime model is being warmed up. UI can show a "connecting" state. |
| `{ "type": "ready" }` | Agent prep + model session are live; start the mic-capture pipeline and send audio frames from this point on. |
| `{ "type": "transcript", "role": "user"\|"ai", "text": "…", "ts": <epoch-ms> }` | Live transcript pair, same content that goes into the operator panel chat. **Note the field name is `text` (not `content`) and the agent role is `"ai"` (not `"agent"`).** `ts` is server time in ms since epoch. |
| `{ "type": "clear" }` | Barge-in confirmation — the bridge has discarded the agent utterance still in flight. Drop every `AudioBufferSourceNode` you've already scheduled and stop appending new audio until you see `resume`. |
| `{ "type": "resume" }` | A new agent utterance is starting after a `clear`. Resume normal binary-frame playback. |
| Binary frame | Agent audio chunk — `<sessionId>|<int16-pcm-24khz-mono>`. Strip the prefix and feed the PCM tail to Web Audio. |
| `{ "type": "session_end", "reason": "...", "message"?: "...", "error"?: "..." }` | Terminal frame, immediately followed by a clean `ws.close(1000, …)`. **All errors and graceful ends arrive here** — there is no separate `error` frame. Common `reason` values: `wiro_completed`, `wiro_cancelled`, `wiro_disconnect`, `wiro_error`, `start_error`, `max_duration`, `concurrent_limit`, `browser_disconnect`, `rejected`. `message` is populated for `reason: "rejected"` (operator-facing reject reason). `error` is populated for `reason: "start_error"` (raw exception message from the realtime model bring-up). |

### Session lifetime

- The JWT is valid for **300 seconds** from issue. Conversations that need to live longer simply call `WebStart` again before the JWT expires — there's no in-band refresh.
- The `WebStart`-armed 5-minute pre-WS cleanup guard is cancelled the moment the bridge accepts your `session_start` frame, so a live call is never torn down by it. Live call audio is billed through `int-wiro-aimodels` against your own Wiro AI Models balance — the pre-WS prep window carries no audio charge.

## Rate Limits

- **60 sessions / hour per operator** (fixed window). The operator identity is hashed (`sha256(tokenUUID).slice(0, 16)`) before it ever hits Redis — no raw uuid logged. Override per environment with `AGENT_WEB_REALTIME_RATE_LIMIT_PER_HOUR`.
- Fast-fail sessions (prep timeout, model rejecting the realtime session, WS upgrade error) **decrement the counter back** so a flaky downstream doesn't burn through quota during an incident.
- **Origin allow-list** (Bearer auth path only) — `https://wiro.ai` / `https://www.wiro.ai` (plus `http://localhost:3000` / `http://localhost:8080` in non-production). The API-key path skips the Origin check because key + IP whitelist already authenticated the caller.

## Common Errors

| HTTP | Error code | Message | When |
|------|------------|---------|------|
| 200  | —          | `useragentguid required` | Missing useragent reference. |
| 403  | `95`       | `useragent-not-found`    | The guid doesn't exist (note: returned as **403**, not 404). |
| 403  | `96`       | `useragent-access-denied`| Caller doesn't own the useragent and isn't a member of its team. |
| 200  | —          | `Agent is not running`   | Useragent is not in `status: 4`. Start it via `POST /UserAgent/Start` first. |
| 200  | —          | `util-web-channel not enabled` | Toggle `util-web-channel` via `POST /UserAgent/SkillsApply` (custom agents) or pick a preset that bundles it (Voice Receptionist / Voice Sales Rep). |
| 403  | —          | `web voice only available from Wiro-Web (Bearer auth) or via API key` | Bearer auth call with an Origin outside the Wiro allow-list. Either switch to API-key auth or call from an allow-listed origin. |
| 429  | —          | `Rate limit: max N web voice sessions per hour` | Operator burned through the per-hour cap. Wait for the fixed-window expiry. |
| 500  | —          | `internal error`         | Unexpected backend failure — check `POST /UserAgent/Logs` for context. |

## Multi-Tenant Architecture

Every WebStart call is scoped by:

- **`sessionId`** (`vws-<uuid-v4>`) — opaque, never reused. Carried inside the JWT, never in the WS URL — same "single endpoint, first-message token" pattern Wiro uses for its native realtime models.
- **`useragentguid` + caller uuid** — written into the JWT payload so the bridge can authorise the connection without re-hitting the DB.
- **Origin allow-list** (Bearer path only) — defence-in-depth against a stolen localStorage Bearer being weaponised from a third-party site.
- **Per-operator rate-limit key** — hashed before hitting Redis, so log inspection can't deanonymise users.
- **Channel-isolated upgrade handlers** — `/v1/AgentRealtime/Web` and `/v1/AgentRealtime/Twilio` are distinct upgrade handlers on the same process; one cannot read the other's session state. Adding a new provider in the future is a single new handler under the same `/v1/AgentRealtime/<NewChannel>` prefix — no nginx config churn.

## Related

- [Twilio Voice](/docs/integration-twiliovoice-skills) — pair the same agent with a real phone number for inbound PSTN calls. Both channels surface in the same [Call History](/docs/integration-twiliovoice-skills#call-history) feed.
- [Realtime Voice Conversation](/docs/realtime-voice-conversation) — the underlying model-level realtime protocol (used by `wiro.ai/models/openai/gpt-realtime-mini`, etc.). Web Channel is the agent-aware wrapper around it.
- [Agent Overview](/docs/agent-overview) — useragent statuses, token-based credit metering, and the rest of the agent surface.
- [Agent Skills](/docs/agent-skills) — toggling `util-web-channel` on a custom build.
- [Agent Use Cases — Voice Receptionist](/docs/agent-use-cases) — preset that ships Web + Twilio channels on by default.
