# Agent WebSocket

Receive real-time agent response streaming via a persistent WebSocket connection.

## Connection URL

```
wss://socket.wiro.ai/v1
```

Connect to this URL after calling the [Message / Send](/docs/agent-messaging) endpoint. Use the `agenttoken` from the send response to subscribe to the agent session. This is the same WebSocket server used for model tasks — you can subscribe to both task events (`task_info`) and agent events (`agent_info`) on the same connection.

No API key or auth header is required on the WebSocket itself. Authorization is enforced via the `agenttoken`, which is issued by `POST /UserAgent/Message/Send` against your API key and is scoped to a single message run.

## Connection Flow

1. **Connect** — open a WebSocket connection to `wss://socket.wiro.ai/v1`.
2. **Receive welcome** — the server pushes a one-shot `connected` frame confirming the upgrade.
3. **Subscribe** — send an `agent_info` frame with your `agenttoken`.
4. **Receive `agent_subscribed`** — the server acknowledges the subscribe and reports the current lifecycle status (plus any already-accumulated `debugoutput`).
5. **Stream** — listen for `agent_start` → many `agent_output` → `agent_end` / `agent_error` / `agent_cancel`.
6. **Receive `agent_usage_report`** — after a successful `agent_end`, a one-shot token-usage/billing frame arrives on the same `agenttoken` (~250–500 ms later). Optional to consume; keep the socket open briefly if you need it.
7. **Close** — disconnect once you've seen the terminal event (and `agent_usage_report`, if you want it), or keep the socket open and subscribe to the next `agenttoken`.

### 1. Welcome frame (server → client)

Right after the WebSocket upgrade succeeds, the server sends this frame on its own. You don't request it; it arrives before you send anything.

```json
{
  "type": "connected",
  "version": "1.0"
}
```

Use it as a signal that the socket is fully ready to receive a subscribe. Most clients can ignore the payload — the `version` field is informational.

### 2. Subscribe frame (client → server)

```json
{
  "type": "agent_info",
  "agenttoken": "aB3xK9mR2pLqWzVn7tYhCd5sFgJkNb"
}
```

- `type` — must be the literal string `"agent_info"`. Other values are ignored (the server routes by type; unknown types are silently dropped).
- `agenttoken` — the token returned by `POST /UserAgent/Message/Send`. Required. If missing or empty, the server responds with an `error` frame (see [Subscribe errors](#subscribe-errors)).

The server keeps the mapping `connection ↔ agenttoken` in memory for the life of the connection. You can send additional `agent_info` frames on the same socket to subscribe to more tokens — see [Multi-session subscription](#multi-session-subscription).

### 3. Subscribe errors

If `agenttoken` is missing or blank, the server replies with:

```json
{
  "type": "error",
  "message": "agenttoken-required",
  "result": false
}
```

The connection stays open — no disconnect. Fix the payload and resend. The same frame is used for any shape-level rejection of a subscribe; message routing failures (unknown types, internal exceptions) are silently dropped and produce no frame at all.

### Multi-session subscription

A single WebSocket connection can hold subscriptions to multiple agent sessions simultaneously. Send one `agent_info` frame per token; the server de-duplicates, so resending the same token is a no-op.

```text
WS connect              →  { "type": "connected", "version": "1.0" }
{ agent_info, token: A } →  { agent_subscribed ... token: A }
{ agent_info, token: B } →  { agent_subscribed ... token: B }
{ agent_info, token: A } →  (no-op — already subscribed)
```

After this, every server-side event for either token is forwarded to this connection. All events carry the `agenttoken` field, so your handler can route them back to the right UI surface.

Typical use cases:

- Multi-tab chat clients that keep several live conversations.
- Dashboards watching several users' agents in parallel.
- Combining task streaming and agent streaming on the same connection — `task_info` and `agent_info` frames both map to the same connection's token list (tasks under `taskTokens`, agents under `agentTokens`).

There is no `unsubscribe` frame. To stop listening to a token without reconnecting, ignore its events client-side; tokens are cleaned up automatically when the connection closes.

## Event Types

Frames flow in two directions. `↓` = server → client, `↑` = client → server.

| Direction | Event Type | Description |
|---|---|---|
| ↓ | `connected` | Welcome frame pushed by the server right after the WebSocket upgrade. Fires exactly once per connection. |
| ↑ | `agent_info` | Client-initiated subscribe frame. Carries the `agenttoken` issued by `Message/Send`. Can be sent multiple times on the same socket (one per token). |
| ↓ | `error` | Server-side rejection of a malformed subscribe (missing `agenttoken`). Connection stays open; retry with a valid frame. |
| ↓ | `agent_subscribed` | Subscribe acknowledged. Carries the current lifecycle `status` plus any accumulated `debugoutput`. If the agent already finished before you subscribed, this frame is your snapshot of the final output and no further events will fire. |
| ↓ | `agent_start` | The bridge has opened an SSE stream to the agent container. The underlying model is now generating. Emits exactly once per message. |
| ↓ | `agent_output` | Streaming chunk. Emits **many times** — each carries the full accumulated `raw` text so far plus real-time metrics (`speed`, `elapsedTime`, `tokenCount`, `wordCount`). Replace (don't append) your UI on each event. |
| ↓ | `agent_end` | Terminal success event. Same payload shape as `agent_output` but contains the final complete text with total metrics. Emits at most once. |
| ↓ | `agent_error` | Terminal failure event. `message` is either a sanitized string ("Agent is temporarily unavailable…" when an exception was caught) or a `progressGenerate` object (when the stream finished but content was a degenerate `"..."` / `"Error: internal error"`). Emits at most once. |
| ↓ | `agent_cancel` | Terminal cancel event. Fires **only** when an already-active message is aborted mid-stream (via `Message/Cancel` or upstream abort). Cancels against a still-queued message do **not** broadcast this event — check `Message/Detail` for those. Emits at most once. |
| ↓ | `agent_usage_report` | Post-terminal usage/billing frame. Fires once, ~250–500 ms after a successful `agent_end`, on the same `agenttoken`. Carries the final token counts, `model`, `tokencost`, and `remainingcredits` for the message identified by `messageguid`. Not emitted for replayed usage callbacks or for turns with no chat message (cron/hook turns). |
| ↓ | `agent_wiroai_runtask` | Model-run discovery frame. Fires whenever the agent itself launches a Wiro model run during a turn (e.g. generating an image or video via `int-wiro-aimodels`). Broadcast on the **session-key** channel (not the per-turn `agenttoken`), carrying the new task's `socketaccesstoken` so you can subscribe to that run's `task_*` lifecycle and collect its outputs. See [Model runs the agent triggers](#model-runs-the-agent-triggers). |

## Message Format

Every WebSocket frame is a JSON object. All **agent lifecycle frames** (`agent_subscribed` / `agent_start` / `agent_output` / `agent_end` / `agent_error` / `agent_cancel`) — plus the post-terminal `agent_usage_report` frame — share this base shape:

```json
{
  "type": "agent_output",
  "agenttoken": "aB3xK9mR2pLqWzVn7tYhCd5sFgJkNb",
  "message": { ... },
  "result": true
}
```

| Field | Type | Description |
|---|---|---|
| `type` | string | Event name. See [Event Types](#event-types) for the full list. |
| `agenttoken` | string | The token you subscribed with. Present on every agent lifecycle frame so multi-token subscribers can route the event to the right session. |
| `message` | varies | Empty string (`""`) for `agent_start`, a `progressGenerate` object for `agent_output` / `agent_end` (and for the object-shaped `agent_error`), a plain string for string-shaped `agent_error` and `agent_cancel`, and a token-usage object for `agent_usage_report`. |
| `result` | boolean | `true` for success-side events (`agent_subscribed` / `agent_start` / `agent_output` / `agent_end` / `agent_usage_report`), `false` for failure-side events (`agent_error` / `agent_cancel`). See [The `result` field](#the-result-field). |

The **control frames** (`connected`, `error`) use a different shape with no `agenttoken`:

```json
// Welcome — one per connection
{ "type": "connected", "version": "1.0" }

// Subscribe rejection — stays connected, just indicates the last agent_info was malformed
{ "type": "error", "message": "agenttoken-required", "result": false }
```

The `agent_subscribed` frame additionally carries `status` (the DB row's current status) and, when the token is known, `debugoutput` (accumulated text so far). When the token is unknown, `status` is `"unknown"` and `debugoutput` is omitted entirely.

### agent_subscribed

Sent immediately after the server accepts your subscription. The `status` field reflects where the agent currently is in its lifecycle.

- If the agenttoken is **valid and pending/active** (known to the server, not yet finished), `debugoutput` is always present — an empty string `""` if nothing has streamed yet, or the accumulated text so far.
- If the agenttoken is **unknown** (typo, expired, already cleaned up from the buffer), `debugoutput` is **omitted entirely** from the payload (no field at all). Always use `"debugoutput" in payload` or `payload.debugoutput !== undefined` to distinguish unknown-token from empty-output, rather than relying on truthiness.

**Valid token, queued** — `debugoutput` present and empty:

```json
{
  "type": "agent_subscribed",
  "agenttoken": "aB3xK9mR2pLqWzVn7tYhCd5sFgJkNb",
  "status": "agent_queue",
  "debugoutput": "",
  "result": true
}
```

**Unknown token** — `status` is `"unknown"` and no `debugoutput` field:

```json
{
  "type": "agent_subscribed",
  "agenttoken": "wrongtoken123",
  "status": "unknown",
  "result": true
}
```

Possible `status` values:

| Status | Meaning |
|---|---|
| `agent_queue` | Message is queued, waiting for the agent to pick it up. |
| `agent_start` | Agent has started processing. |
| `agent_output` | Agent is actively streaming. `debugoutput` will contain accumulated text. |
| `agent_end` | Agent already finished. `debugoutput` contains the complete response. |
| `agent_error` | Agent encountered an error. `debugoutput` may contain partial output. |
| `agent_cancel` | Message was cancelled. `debugoutput` may contain partial output. |
| `agent_done` | Status of a `model_change` marker row — a zero-content separator inserted when the chat model is switched mid-session. It is **only** used for these markers; normal turns terminate at `agent_end` and never carry this status. See [Agent Messaging](/docs/agent-messaging) for model_change markers. |
| `unknown` | Status could not be determined. Treat as an error. |

### agent_start

Signals that the agent has begun generating a response. The `message` field is an empty string:

```json
{
  "type": "agent_start",
  "agenttoken": "aB3xK9mR2pLqWzVn7tYhCd5sFgJkNb",
  "message": "",
  "result": true
}
```

### agent_output (streaming)

Emitted multiple times as the agent generates its response. Each event contains the **full accumulated text** up to that point (not just the delta), along with real-time performance metrics:

```json
{
  "type": "agent_output",
  "agenttoken": "aB3xK9mR2pLqWzVn7tYhCd5sFgJkNb",
  "message": {
    "type": "progressGenerate",
    "task": "Generate",
    "speed": "12.5",
    "speedType": "words/s",
    "elapsedTime": "2.4s",
    "tokenCount": 35,
    "wordCount": 28,
    "raw": "Here is the accumulated response text so far...",
    "thinking": [],
    "answer": ["Here is the accumulated response text so far..."],
    "isThinking": false
  },
  "result": true
}
```

The `raw` field contains the full response as a single string. The `answer` array contains the same text split into segments. To display streaming text, replace your UI content with `raw` (or join `answer`) on each event.

### agent_end

Fires when the agent finishes responding. The structure is identical to `agent_output` — the `message` contains the final complete text with total metrics:

```json
{
  "type": "agent_end",
  "agenttoken": "aB3xK9mR2pLqWzVn7tYhCd5sFgJkNb",
  "message": {
    "type": "progressGenerate",
    "task": "Generate",
    "speed": "14.2",
    "speedType": "words/s",
    "elapsedTime": "8.1s",
    "tokenCount": 156,
    "wordCount": 118,
    "raw": "The complete agent response text...",
    "thinking": [],
    "answer": ["The complete agent response text..."],
    "isThinking": false
  },
  "result": true
}
```

### agent_error

An error occurred during processing. The `message` field can take two forms — a **sanitized string** when the stream is aborted by an exception, or a **progress object** when the stream finished naturally but the model returned a non-response.

**Sanitized string error** — any exception during streaming (bridge timeout, upstream HTTP 5xx, worker crash, SSE read error, etc.) surfaces as a single user-safe sentence:

```json
{
  "type": "agent_error",
  "agenttoken": "aB3xK9mR2pLqWzVn7tYhCd5sFgJkNb",
  "message": "Agent is temporarily unavailable. Please try again shortly.",
  "result": false
}
```

> **The raw runtime error is never broadcast over WebSocket.** Internal failure messages are recorded in `debugoutput` (retrievable via `POST /UserAgent/Message/Detail`) but **replaced with the generic sentence above** before being pushed to subscribed clients. Log the raw `debugoutput` for your own debugging; show the sanitized string from the WebSocket event to end users.

**Progress-object error** — the SSE stream completes normally but the model returns `"..."` or `"Error: internal error"`. In that case Wiro flags the message as `agent_error` and broadcasts the same `progressGenerate` shape as `agent_output` / `agent_end`, so the client can render the non-response to the user:

```json
{
  "type": "agent_error",
  "agenttoken": "aB3xK9mR2pLqWzVn7tYhCd5sFgJkNb",
  "message": {
    "type": "progressGenerate",
    "task": "Generate",
    "speed": "2.5",
    "speedType": "words/s",
    "elapsedTime": "1.2s",
    "tokenCount": 3,
    "wordCount": 1,
    "raw": "...",
    "thinking": [],
    "answer": ["..."],
    "isThinking": false
  },
  "result": false
}
```

Check the runtime type of `message` to branch:

```javascript
if (msg.type === 'agent_error') {
  if (typeof msg.message === 'string') {
    showToast(msg.message)
  } else {
    renderResponse(msg.message.raw)
  }
}
```

### agent_cancel

Sent when the user cancels a message before the agent completes its response (only when the abort hits the bridge mid-flight — queued-state cancels don't broadcast this event):

```json
{
  "type": "agent_cancel",
  "agenttoken": "aB3xK9mR2pLqWzVn7tYhCd5sFgJkNb",
  "message": "AbortError",
  "result": false
}
```

> The `message` field carries the abort reason from the runtime (typically `"AbortError"` or a short technical string). It is **not a fixed user-facing message** — do not parse it for exact strings; use `type === "agent_cancel"` as the signal. Subscribers that cancel from a queued state will receive no event at all (the message is simply marked `agent_cancel` in the database; check with `POST /UserAgent/Message/Detail`).

### agent_usage_report

A post-terminal frame that reports the final token usage and billing for the turn. It arrives shortly **after** `agent_end` (~250–500 ms later, once the turn's token usage has been metered and billed) on the **same** `agenttoken`-keyed channel as `agent_start` / `agent_output` / `agent_end`. A client already subscribed to the turn receives it automatically — no extra subscribe is needed.

```json
{
  "type": "agent_usage_report",
  "agenttoken": "aB3xK9mR2pLqWzVn7tYhCd5sFgJkNb",
  "result": true,
  "message": {
    "messageguid": "c3d4e5f6-a7b8-9012-cdef-345678901234",
    "inputtokens": 3450,
    "outputtokens": 820,
    "cachereadtokens": 2400,
    "cachewritetokens": 0,
    "totaltokens": 4270,
    "model": "openai/gpt-5.4",
    "tokencost": 5,
    "processedms": 4200,
    "remainingcredits": 9995
  }
}
```

The frame's `agenttoken` identifies the turn; the `message.messageguid` identifies the exact assistant message to patch. `result` is always `true`.

| Field | Type | Description |
|---|---|---|
| `messageguid` | string | UUID of the assistant message this usage applies to. **Match it to the message row** you want to update. |
| `inputtokens` | number | Prompt tokens sent to the model for this turn. |
| `outputtokens` | number | Completion tokens generated by the model. |
| `cachereadtokens` | number | Prompt tokens served from the provider's prompt cache (billed at the cache-read rate). |
| `cachewritetokens` | number | Prompt tokens written to the provider's prompt cache during this turn. |
| `totaltokens` | number | Total billable tokens for the turn. |
| `model` | string | Provider/model slug used for this turn (e.g. `"openai/gpt-5.4"`). |
| `tokencost` | number | Credits charged for this turn. |
| `processedms` | number | Server-side processing time for the turn, in milliseconds. |
| `remainingcredits` | number | Your account credit balance after this turn was billed. |

Use it to patch the per-message token columns and the live credit balance **without re-fetching `Message/History`**: when the frame arrives, look up the row by `messageguid` and write the token counts, `model`, `tokencost`, and `remainingcredits` straight onto it.

Like `agent_output`, it is a live broadcast — it is **not** replayed to clients that subscribe after it has already fired. If you reconnect after the fact, read usage from `POST /UserAgent/Message/Detail` (or `Message/History`) instead.

It is **not** emitted for:

- **Idempotent / replayed usage callbacks** — a turn is billed once, and a replayed usage callback does not re-broadcast the frame.
- **Turns with no chat message** — e.g. cron- or hook-triggered turns that produce no assistant message row have no `messageguid` to key on, so no frame is sent.

### Model runs the agent triggers

When the agent **itself** kicks off a Wiro model run during a turn — for example generating an image or a video through the `int-wiro-aimodels` skill — the bridge emits an `agent_wiroai_runtask` discovery frame. It hands you the new model run's `socketaccesstoken` so you can subscribe to that run and stream its progress and final media outputs. This is how a chat product surfaces a "live activity feed" of the media the agent is producing.

```json
{
  "type": "agent_wiroai_runtask",
  "agenttoken": "user-42",
  "message": {
    "taskid": 534574,
    "socketaccesstoken": "eDcCm5yy7Z…",
    "slugowner": "openai",
    "slugproject": "gpt-image-1",
    "categories": ["image"],
    "status": "task_queue",
    "response": { "result": true, "taskid": 534574, "socketaccesstoken": "eDcCm5yy7Z…" }
  },
  "result": true
}
```

| Field | Type | Description |
|---|---|---|
| `taskid` | number | The model run's task id. |
| `socketaccesstoken` | string | The run's task token. Subscribe to it (see below) to stream the model run's lifecycle and outputs. |
| `slugowner` | string | Model owner slug (e.g. `"openai"`, `"black-forest-labs"`). |
| `slugproject` | string | Model slug (e.g. `"gpt-image-1"`). |
| `categories` | array<string> | The model's categories (e.g. `["image"]`, `["video"]`). |
| `status` | string | Always `"task_queue"` at discovery — the run was just enqueued. |
| `response` | object | Convenience echo `{ result, taskid, socketaccesstoken }`. |

**This frame is keyed on the session, not the per-turn token.** Unlike the lifecycle frames above, `agent_wiroai_runtask` is broadcast on the **`sessionkey`** you passed to `Message/Send` (the frame's `agenttoken` field carries that session key, not a per-turn token). To receive it, send a second subscribe frame with your session key as the token:

```json
{ "type": "agent_info", "agenttoken": "user-42" }
```

A single socket can hold both subscriptions at once — the per-turn `agenttoken` (for the chat stream) and the `sessionkey` (for run discovery).

**Then pivot to the task socket for outputs.** Take `message.socketaccesstoken` and subscribe to the standard model-run WebSocket exactly as documented in [WebSocket](/docs/websocket) — send `{ "type": "task_info", "tasktoken": "<socketaccesstoken>" }` and stream `task_queue → task_start → task_output → task_postprocess_end`. The final `task_postprocess_end` carries the output array (media URLs). The model-run `task_*` events are **only** delivered on the task's own `socketaccesstoken` channel — they are never re-broadcast on the agent channel.

> **Only fires for agent-initiated runs.** `agent_wiroai_runtask` is emitted when the *agent* calls a model mid-turn. Model runs you launch yourself with `POST /Run` (your own `x-api-key`) do not produce this frame — you already hold their `socketaccesstoken` from the `/Run` response.

## The `result` Field

Every agent lifecycle event includes a `result` boolean:

| Value | Events |
|---|---|
| `true` | `agent_subscribed`, `agent_start`, `agent_output`, `agent_end`, `agent_usage_report` |
| `false` | `error`, `agent_error`, `agent_cancel` |

Use `result` to quickly determine whether the event represents a successful state. When `result` is `false`, inspect `message` for error details or cancellation context. The welcome `connected` frame has no `result` field — it's a one-shot ack and always implies success (you got the frame, so the upgrade worked).

## Streaming Metrics

Each `agent_output` and `agent_end` event includes real-time performance data in the `message` object:

| Field | Type | Description |
|---|---|---|
| `speed` | string | Current generation speed (e.g. `"12.5"`). |
| `speedType` | string | Speed unit — always `"words/s"` for agent responses. |
| `elapsedTime` | string | Wall-clock time since the stream started (e.g. `"2.4s"`). |
| `tokenCount` | number | Total tokens generated so far. |
| `wordCount` | number | Total words in the accumulated response. |

These metrics update with every `agent_output` event, allowing you to display a live speed indicator or progress bar in your UI.

## Thinking Model Support

When the agent is backed by a thinking-capable model (e.g. DeepSeek-R1, QwQ), the response may include thinking blocks alongside the answer:

```json
{
  "type": "agent_output",
  "agenttoken": "aB3xK9mR2pLqWzVn7tYhCd5sFgJkNb",
  "message": {
    "type": "progressGenerate",
    "task": "Generate",
    "speed": "8.3",
    "speedType": "words/s",
    "elapsedTime": "4.1s",
    "tokenCount": 89,
    "wordCount": 64,
    "raw": "<think>Let me work through this step by step...</think>Based on my analysis...",
    "thinking": ["Let me work through this step by step..."],
    "answer": ["Based on my analysis..."],
    "isThinking": true
  },
  "result": true
}
```

| Field | Description |
|---|---|
| `isThinking` | `true` while the model is in a thinking phase, `false` when emitting the answer. |
| `thinking` | Array of thinking block text segments. Empty if the model does not use thinking. |
| `answer` | Array of answer text segments. This is the user-facing response. |
| `raw` | The unprocessed output including `<think>` tags. Use `thinking` and `answer` instead for display. |

**Rendering guidance:**

- While `isThinking` is `true`, show a "Thinking..." indicator or render the `thinking` text in a collapsible block.
- When `isThinking` becomes `false`, the model has finished reasoning and is now producing the answer.
- On `agent_end`, join the `answer` array for the final display text.

## Full Integration Example

A typical integration follows this pattern: call the REST API to send a message, then subscribe via WebSocket to stream the response.

**Step 1 — Send a message via REST:**

```bash
curl -X POST https://api.wiro.ai/v1/UserAgent/Message/Send \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "message": "Explain quantum computing in simple terms",
    "sessionkey": "user-42"
  }'
```

The response includes an `agenttoken`:

```json
{
  "result": true,
  "errors": [],
  "messageguid": "c3d4e5f6-a7b8-9012-cdef-345678901234",
  "agenttoken": "aB3xK9mR2pLqWzVn7tYhCd5sFgJkNb",
  "status": "agent_queue"
}
```

**Step 2 — Subscribe via WebSocket:**

```javascript
const ws = new WebSocket('wss://socket.wiro.ai/v1');

ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'agent_info',
    agenttoken: 'aB3xK9mR2pLqWzVn7tYhCd5sFgJkNb'
  }));
};
```

**Step 3 — Handle streaming events:**

```
←  connected         { version: "1.0" }
→  agent_info        { agenttoken: "..." }
←  agent_subscribed  { status: "agent_queue", debugoutput: "" }
←  agent_start       { message: "" }
←  agent_output      { message: { raw: "Quantum", wordCount: 1 } }
←  agent_output      { message: { raw: "Quantum computing uses", wordCount: 3 } }
←  agent_output      { message: { raw: "Quantum computing uses qubits...", wordCount: 28 } }
←  agent_end         { message: { raw: "Quantum computing uses qubits that...", wordCount: 118 } }
←  agent_usage_report { result: true, message: { messageguid: "c3d4...", totaltokens: 4270, remainingcredits: 9994 } }
```

`←` = server → client, `→` = client → server. Each `agent_output` contains the full accumulated text. Replace (don't append) your display content on each event.

The full observable wire order for a normal turn is:

```text
agent_queue  →  agent_start  →  agent_output × N  →  agent_end  →  agent_usage_report
```

`agent_queue` is **not** a WebSocket frame — it's the `status` returned synchronously in the `Message/Send` response (and reflected by `agent_subscribed` if you subscribe while the message is still queued). Everything from `agent_start` onward is pushed over the socket. On the failure path, `agent_error` or `agent_cancel` takes the place of `agent_end` as the terminal frame, and **no** `agent_usage_report` follows.

[`agent_wiroai_runtask`](#model-runs-the-agent-triggers) is **not** part of this linear order — it fires out-of-band (zero or more times per turn, whenever the agent launches a model run) on the **session-key** channel rather than the per-turn `agenttoken`.

## Code Examples

### JavaScript

```javascript
const agentToken = 'your-agent-token';

const ws = new WebSocket('wss://socket.wiro.ai/v1');

ws.onopen = () => {
  console.log('Connected');
  ws.send(JSON.stringify({
    type: 'agent_info',
    agenttoken: agentToken
  }));
};

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);

  switch (msg.type) {
    case 'connected':
      // One-shot welcome frame from server. OK to ignore.
      break;

    case 'error':
      // Subscribe shape rejected (e.g. missing agenttoken).
      console.error('Subscribe error:', msg.message);
      ws.close();
      break;

    case 'agent_subscribed':
      if (msg.status === 'unknown') {
        console.error('Unknown token:', msg.agenttoken);
        ws.close();
      } else if (['agent_end', 'agent_error', 'agent_cancel'].includes(msg.status)) {
        // We subscribed late — the agent already finished.
        console.log('Already finished. Snapshot:', msg.debugoutput);
        ws.close();
      }
      break;

    case 'agent_start':
      console.log('Agent started generating');
      break;

    case 'agent_output':
      // message is a progressGenerate object; replace (don't append) your UI.
      console.log('Streaming:', msg.message.raw);
      break;

    case 'agent_end':
      console.log('Final:', msg.message.raw);
      ws.close();
      break;

    case 'agent_error':
      // message is either a sanitized string or a progressGenerate object.
      if (typeof msg.message === 'string') console.error('Error:', msg.message);
      else console.error('Non-response:', msg.message.raw);
      ws.close();
      break;

    case 'agent_cancel':
      console.warn('Cancelled:', msg.message);
      ws.close();
      break;
  }
};

ws.onerror = (err) => console.error('WebSocket error:', err);
ws.onclose = () => console.log('Disconnected');
```

### Python

```python
import asyncio
import websockets
import json

async def listen_agent(agent_token):
    uri = "wss://socket.wiro.ai/v1"

    async with websockets.connect(uri) as ws:
        await ws.send(json.dumps({
            "type": "agent_info",
            "agenttoken": agent_token
        }))
        print("Subscribed to agent session")

        async for message in ws:
            msg = json.loads(message)
            print(f"Event: {msg['type']}")

            if msg["type"] == "agent_output":
                print("Streaming:", msg["message"].get("raw"))
            elif msg["type"] == "agent_end":
                print("Final:", msg["message"].get("raw"))
                break
            elif msg["type"] in ("agent_error", "agent_cancel"):
                print("Error:", msg.get("message"))
                break

asyncio.run(listen_agent("your-agent-token"))
```

### Node.js

```javascript
const WebSocket = require('ws');

const ws = new WebSocket('wss://socket.wiro.ai/v1');

ws.on('open', () => {
  ws.send(JSON.stringify({
    type: 'agent_info',
    agenttoken: 'your-agent-token'
  }));
});

ws.on('message', (data) => {
  const msg = JSON.parse(data.toString());
  console.log('Event:', msg.type);

  if (msg.type === 'agent_output') {
    console.log('Streaming:', msg.message?.raw);
  }
  if (msg.type === 'agent_end') {
    console.log('Final:', msg.message?.raw);
    ws.close();
  }
});

ws.on('error', console.error);
ws.on('close', () => console.log('Disconnected'));
```

### PHP

```php
<?php
// Requires: composer require textalk/websocket
use WebSocket\Client;

$client = new Client("wss://socket.wiro.ai/v1");

$client->send(json_encode([
    "type" => "agent_info",
    "agenttoken" => "your-agent-token"
]));

while (true) {
    $msg = json_decode($client->receive(), true);
    echo "Event: " . $msg["type"] . PHP_EOL;

    if ($msg["type"] === "agent_output") {
        echo "Streaming: " . ($msg["message"]["raw"] ?? "") . PHP_EOL;
    }
    if ($msg["type"] === "agent_end") {
        echo "Final: " . ($msg["message"]["raw"] ?? "") . PHP_EOL;
        break;
    }
}
$client->close();
```

### C\#

```csharp
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;

using var ws = new ClientWebSocket();
await ws.ConnectAsync(
    new Uri("wss://socket.wiro.ai/v1"),
    CancellationToken.None);

var subscribe = JsonSerializer.Serialize(new {
    type = "agent_info",
    agenttoken = "your-agent-token"
});
await ws.SendAsync(
    Encoding.UTF8.GetBytes(subscribe),
    WebSocketMessageType.Text, true,
    CancellationToken.None);

var buffer = new byte[8192];
while (ws.State == WebSocketState.Open) {
    var result = await ws.ReceiveAsync(
        buffer, CancellationToken.None);
    var json = Encoding.UTF8.GetString(
        buffer, 0, result.Count);
    using var doc = JsonDocument.Parse(json);
    var type = doc.RootElement
        .GetProperty("type").GetString();
    Console.WriteLine("Event: " + type);

    if (type == "agent_end") {
        Console.WriteLine("Done!");
        break;
    }
}
```

### Go

```go
package main

import (
    "encoding/json"
    "fmt"
    "log"
    "github.com/gorilla/websocket"
)

func main() {
    conn, _, err := websocket.DefaultDialer.Dial(
        "wss://socket.wiro.ai/v1", nil)
    if err != nil { log.Fatal(err) }
    defer conn.Close()

    sub, _ := json.Marshal(map[string]string{
        "type":       "agent_info",
        "agenttoken": "your-agent-token",
    })
    conn.WriteMessage(websocket.TextMessage, sub)

    for {
        _, message, err := conn.ReadMessage()
        if err != nil { break }
        var msg map[string]interface{}
        json.Unmarshal(message, &msg)
        fmt.Println("Event:", msg["type"])

        if msg["type"] == "agent_end" {
            fmt.Println("Done!")
            break
        }
    }
}
```

### Swift

```swift
import Foundation

let url = URL(string: "wss://socket.wiro.ai/v1")!
let task = URLSession.shared.webSocketTask(with: url)
task.resume()

let subData = try! JSONSerialization.data(
    withJSONObject: [
        "type": "agent_info",
        "agenttoken": "your-agent-token"
    ])
task.send(.string(
    String(data: subData, encoding: .utf8)!
)) { _ in }

func receive() {
    task.receive { result in
        switch result {
        case .success(let message):
            switch message {
            case .string(let text):
                let msg = try! JSONSerialization
                    .jsonObject(with: text.data(
                        using: .utf8)!)
                    as! [String: Any]
                print("Event:", msg["type"] ?? "")
                if msg["type"] as? String == "agent_end" {
                    print("Done!")
                    return
                }
            case .data(let data):
                print("Binary:", data.count, "bytes")
            @unknown default: break
            }
            receive()
        case .failure(let error):
            print("Error:", error)
        }
    }
}
receive()
```

### Kotlin

```kotlin
// Requires: org.java-websocket:Java-WebSocket
import org.java_websocket.client.WebSocketClient
import org.java_websocket.handshake.ServerHandshake
import java.net.URI
import org.json.JSONObject

val client = object : WebSocketClient(
    URI("wss://socket.wiro.ai/v1")) {
    override fun onOpen(h: ServerHandshake) {
        send(JSONObject(mapOf(
            "type" to "agent_info",
            "agenttoken" to "your-agent-token"
        )).toString())
    }
    override fun onMessage(message: String) {
        val msg = JSONObject(message)
        println("Event: " + msg.getString("type"))
        if (msg.getString("type") == "agent_end") {
            println("Done!")
            close()
        }
    }
    override fun onClose(
        code: Int, reason: String, remote: Boolean
    ) { println("Disconnected") }
    override fun onError(ex: Exception) {
        ex.printStackTrace()
    }
}
client.connect()
```

### Dart

```dart
import 'dart:convert';
import 'package:web_socket_channel/web_socket_channel.dart';

final channel = WebSocketChannel.connect(
  Uri.parse('wss://socket.wiro.ai/v1'),
);

channel.sink.add(jsonEncode({
  'type': 'agent_info',
  'agenttoken': 'your-agent-token',
}));

channel.stream.listen((message) {
  final msg = jsonDecode(message);
  print('Event: ' + msg['type'].toString());
  if (msg['type'] == 'agent_output') {
    print('Streaming: ' + (msg['message']?['raw'] ?? ''));
  }
  if (msg['type'] == 'agent_end') {
    print('Done!');
    channel.sink.close();
  }
});
```

## Quick Reference

**`connected` — welcome frame** (server → client, sent once on upgrade):

```json
{
  "type": "connected",
  "version": "1.0"
}
```

**Subscribe frame** (client → server):

```json
{
  "type": "agent_info",
  "agenttoken": "aB3xK9..."
}
```

**`error` — malformed subscribe** (server → client, sent when `agent_info` is missing `agenttoken`):

```json
{
  "type": "error",
  "message": "agenttoken-required",
  "result": false
}
```

**`agent_subscribed` — valid token** (empty `debugoutput`):

```json
{
  "type": "agent_subscribed",
  "agenttoken": "aB3xK9...",
  "status": "agent_queue",
  "debugoutput": "",
  "result": true
}
```

**`agent_subscribed` — unknown token** (`status: "unknown"`, no `debugoutput`):

```json
{
  "type": "agent_subscribed",
  "agenttoken": "wrongtoken",
  "status": "unknown",
  "result": true
}
```

**`agent_start`:**

```json
{
  "type": "agent_start",
  "agenttoken": "aB3xK9...",
  "message": "",
  "result": true
}
```

**`agent_output`** — streaming partials, emitted multiple times:

```json
{
  "type": "agent_output",
  "agenttoken": "aB3xK9...",
  "message": {
    "raw": "Accumulated text...",
    "speed": "12.5",
    "wordCount": 28
  },
  "result": true
}
```

**`agent_end`** — final response:

```json
{
  "type": "agent_end",
  "agenttoken": "aB3xK9...",
  "message": {
    "raw": "Complete response...",
    "speed": "14.2",
    "wordCount": 118
  },
  "result": true
}
```

**`agent_error`** — sanitized string (any exception during streaming):

```json
{
  "type": "agent_error",
  "agenttoken": "aB3xK9...",
  "message": "Agent is temporarily unavailable. Please try again shortly.",
  "result": false
}
```

**`agent_cancel`** — active-processing abort only; queued-state cancels don't broadcast:

```json
{
  "type": "agent_cancel",
  "agenttoken": "aB3xK9...",
  "message": "AbortError",
  "result": false
}
```

**`agent_usage_report`** — post-terminal usage/billing frame, ~250–500 ms after `agent_end`:

```json
{
  "type": "agent_usage_report",
  "agenttoken": "aB3xK9...",
  "result": true,
  "message": {
    "messageguid": "c3d4e5f6-...",
    "totaltokens": 4270,
    "model": "openai/gpt-5.4",
    "tokencost": 5,
    "remainingcredits": 9995
  }
}
```

## Connection Keep-Alive

The Wiro WebSocket server sends a ping every **30 seconds** to keep the connection alive. Most standard WebSocket client libraries respond to pings automatically; if your client implements a custom frame handler, make sure it sends a pong within a few seconds of each ping or the server will drop the connection. After `agent_error` / `agent_cancel` you can close the socket immediately — those are the last frames for that `agenttoken`. After `agent_end`, one more frame (`agent_usage_report`) follows ~250–500 ms later; wait for it if you need the usage/billing data, otherwise close right away.

## Correlating Events With Your Messages

Every agent lifecycle frame (`agent_subscribed` / `agent_start` / `agent_output` / `agent_end` / `agent_error` / `agent_cancel`) carries `agenttoken` — this is the **only** correlation key available on the wire. These frames do **not** include `messageguid`, `sessionkey`, or `useragentguid`. If you need any of those fields to route events back to a specific message in your UI, build the mapping yourself when you call `Message/Send`.

The one exception is the post-terminal `agent_usage_report` frame, whose `message.messageguid` does name the message — but it arrives only after `agent_end`, so you still need the `agenttoken → messageguid` mapping to attribute the streaming frames.

### Why `agenttoken` is the correlation key

- `Message/Send` issues exactly one `agenttoken` per message and returns it alongside `messageguid` in the HTTP response.
- The bridge stamps the same `agenttoken` on every event it emits for that message.
- Multiple connections can subscribe to the same `agenttoken` and each gets the full event stream — so `agenttoken` is also the fan-out key.
- A single socket can hold subscriptions for many `agenttoken`s at once (see [Multi-session subscription](#multi-session-subscription)) — the per-event `agenttoken` lets your handler dispatch into the right UI element.

### Recommended client pattern

1. Call `POST /UserAgent/Message/Send` — you get back `{ messageguid, agenttoken, status: "agent_queue", ... }`.
2. Store the mapping `agenttoken → messageguid` (or `agenttoken → your UI message id`).
3. Send `{ "type": "agent_info", "agenttoken }` on an open socket (new or existing — connections can be reused).
4. In `ws.onmessage`, read `msg.agenttoken` on every agent lifecycle frame, look up your stored mapping, and update the matching UI element.
5. When the turn ends, delete the mapping so it doesn't leak memory across sessions. For successful turns, wait for the trailing `agent_usage_report` (it arrives ~250–500 ms after `agent_end`) before deleting, so you can attribute the usage to the right message; for `agent_error` / `agent_cancel`, delete immediately — no usage report follows.

```javascript
const tokenToMessageId = new Map()

async function sendMessage(text, uiMessageId) {
  const resp = await fetch('https://api.wiro.ai/v1/UserAgent/Message/Send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': 'YOUR_API_KEY' },
    body: JSON.stringify({
      useragentguid: 'your-useragent-guid',
      message: text,
      sessionkey: 'user-42'
    })
  }).then(r => r.json())

  tokenToMessageId.set(resp.agenttoken, uiMessageId)
  ws.send(JSON.stringify({ type: 'agent_info', agenttoken: resp.agenttoken }))
  return { messageguid: resp.messageguid, agenttoken: resp.agenttoken }
}

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data)
  if (!msg.agenttoken) return  // control frames (connected / error) have no token

  const uiMessageId = tokenToMessageId.get(msg.agenttoken)
  if (!uiMessageId) return  // unknown token — probably stale

  switch (msg.type) {
    case 'agent_output':
      updateUI(uiMessageId, { streaming: msg.message.raw })
      break
    case 'agent_end':
      // Keep the mapping — agent_usage_report still follows for successful turns.
      updateUI(uiMessageId, { final: msg.message.raw, status: 'agent_end' })
      break
    case 'agent_usage_report':
      updateUI(uiMessageId, { usage: msg.message, remainingCredits: msg.message.remainingcredits })
      tokenToMessageId.delete(msg.agenttoken)
      break
    case 'agent_error':
    case 'agent_cancel':
      updateUI(uiMessageId, { error: msg.message, status: msg.type })
      tokenToMessageId.delete(msg.agenttoken)
      break
  }
}
```

### Concurrency: multiple in-flight messages on one session

Sending two messages back-to-back in the same `sessionkey` produces two independent `agenttoken`s. Both reach the bridge in queue order; both stream events independently. Your client must:

- Subscribe to **both** `agenttoken`s (one `agent_info` frame each — the server de-duplicates automatically).
- Key all UI updates on `agenttoken`, not on `sessionkey` (which is shared) or timestamps (which can interleave).

The server never mixes streams — every event is stamped with the originating `agenttoken` so routing is unambiguous even when chunks from two messages interleave on the wire.

### Control frames have no `agenttoken`

The welcome frame and the subscribe-error frame are connection-level signals, not per-message events. They intentionally **omit** `agenttoken`:

```json
{ "type": "connected", "version": "1.0" }
```

```json
{ "type": "error", "message": "agenttoken-required", "result": false }
```

Always null-check `msg.agenttoken` before looking it up in your mapping — see the `if (!msg.agenttoken) return` guard in the example above.

## Reconnection & Recovery

The agent keeps running server-side **regardless of whether any client is subscribed**. A disconnected socket never cancels the agent. This means a dropped connection is always recoverable — just reconnect and re-subscribe with the same `agenttoken`.

### Recovery flow

1. **Detect disconnect** — `ws.onclose` / stream exception / ping timeout.
2. **Reconnect** — open a new WebSocket to `wss://socket.wiro.ai/v1`.
3. **Wait for welcome** — receive `{ "type": "connected", "version": "1.0" }` (optional but clean).
4. **Re-subscribe** — send `{ "type": "agent_info", "agenttoken": "..." }` with the same token.
5. **Handle `agent_subscribed`** — the server reports the **current** status. Three cases:
   - `status` is `agent_queue` / `agent_start` / `agent_output` → stream is still live; accumulated text so far is in `debugoutput`. Future events will be forwarded normally.
   - `status` is `agent_end` → the agent already finished. `debugoutput` holds the full final response. **No further WebSocket events will fire.** Fetch `POST /UserAgent/Message/Detail` for the canonical record (including `metadata`, `attachments`, `endedat`), then close the socket.
   - `status` is `agent_error` / `agent_cancel` → the agent already failed / was cancelled. `debugoutput` may contain partial output. No further events. Fetch `POST /UserAgent/Message/Detail` for the persisted error details.

On reconnect you do **not** receive replays of the past `agent_output` frames — only events emitted after re-subscribe. Use the `debugoutput` on `agent_subscribed` as the snapshot of what you missed.

### Example retry strategy

```javascript
const MAX_BACKOFF_MS = 30000
let backoff = 1000

function connect(agenttoken, onStreamingChunk, onFinal, onFailure) {
  const ws = new WebSocket('wss://socket.wiro.ai/v1')
  let finished = false

  ws.onopen = () => {
    backoff = 1000
    ws.send(JSON.stringify({ type: 'agent_info', agenttoken }))
  }

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data)
    if (msg.type === 'connected') return

    if (msg.type === 'agent_subscribed') {
      if (msg.status === 'unknown') {
        finished = true
        onFailure({ reason: 'unknown-token' })
        ws.close()
        return
      }
      if (['agent_end', 'agent_error', 'agent_cancel'].includes(msg.status)) {
        finished = true
        onFinal(msg.debugoutput || '')
        ws.close()
      }
      return
    }

    if (msg.type === 'agent_output') onStreamingChunk(msg.message)
    if (msg.type === 'agent_end') {
      finished = true
      onFinal(msg.message.raw)
      ws.close()
    }
    if (['agent_error', 'agent_cancel'].includes(msg.type)) {
      finished = true
      onFailure({ reason: msg.type, message: msg.message })
      ws.close()
    }
  }

  ws.onclose = () => {
    if (finished) return
    setTimeout(() => connect(agenttoken, onStreamingChunk, onFinal, onFailure), backoff)
    backoff = Math.min(backoff * 2, MAX_BACKOFF_MS)
  }
}
```

Guidance:

- **Exponential backoff**, capped at 30 seconds. The server is usually responsive, so don't hammer it.
- **Stop retrying once you hit a terminal event** (`agent_end` / `agent_error` / `agent_cancel`) or an `unknown` status — the work is either done or the token is gone.
- **Idempotent re-subscribe**: sending the same `agenttoken` again on a fresh socket is always safe.
- **Fall back to polling** if WebSocket is blocked (strict corporate proxies, mobile cellular with long-poll fallbacks). Use `POST /UserAgent/Message/Detail` at 1–2 second intervals until `status` is terminal.

## Token Lifecycle

An `agenttoken` is issued per message by `POST /UserAgent/Message/Send` and stays addressable on the WebSocket for as long as the underlying `agentmessages` row exists (Wiro does not auto-purge rows on a short timer; tokens remain queryable indefinitely after the run ends).

| Event | Effect on token |
|---|---|
| `Message/Send` | Token is minted, row is inserted with `status: "agent_queue"`, broadcast to all queue subscribers. |
| Worker picks up | Emits `agent_start` to every active subscriber. |
| Each SSE chunk | Emits `agent_output` to every active subscriber (with full accumulated `raw`). |
| Stream finishes | Emits `agent_end` (or `agent_error` for `"..."` / internal-error content) with final `progressGenerate` payload; DB row status is updated to terminal. |
| Usage billed | ~250–500 ms after a successful `agent_end`, emits `agent_usage_report` with final token counts, `model`, `tokencost`, and `remainingcredits`. Not emitted for replayed usage callbacks or for turns with no chat message (cron/hook turns). |
| Bridge exception | Emits `agent_error` with sanitized string; DB row status → `agent_error`, raw error in `debugoutput`. |
| `Message/Cancel` during active stream | Bridge aborts, emits `agent_cancel`; DB row status → `agent_cancel`. |
| `Message/Cancel` while queued | DB row status → `agent_cancel` immediately. **No WebSocket event is broadcast** (the bridge never started). Clients checking via the socket must consult `Message/Detail` for queued-state cancels. |

**Multi-subscriber semantics**: multiple WebSocket connections can subscribe to the same `agenttoken` and all receive the same event stream in parallel. The server does not enforce a subscriber limit per token. This is how the Wiro Dashboard shows the same agent chat on multiple tabs for the same user — each tab opens its own socket and subscribes independently.

**Cross-user subscription**: the `agenttoken` alone authenticates subscription — if you leak a token to another user, they can read the stream. Treat tokens like short-lived secrets scoped to the message.
