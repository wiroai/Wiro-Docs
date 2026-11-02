# Agent WebSocket

Receive real-time agent response streaming via a persistent WebSocket connection.

## Connection URL

```
wss://socket.wiro.ai/v1
```

Connect to this URL after calling the [Message / Send](/docs/agent-messaging) endpoint. Use the `agenttoken` from the send response to subscribe to the agent session. This is the same WebSocket server used for model tasks, so you can subscribe to both task events (`task_info`) and agent events (`agent_info`) on the same connection.

No API key or auth header is required on the WebSocket itself. Authorization is enforced via the `agenttoken`, which is issued by `POST /UserAgent/Message/Send` against your API key and is scoped to a single message run. To follow a whole session instead, use the `sessiontoken` from `Message/History`; see [Following a session](#following-a-session). To follow an agent's Scheduled Tasks and other background runs, use a `runstreamtoken`; see [Following an agent's background runs](#following-an-agents-background-runs).

## Connection Flow

1. **Connect**: open a WebSocket connection to `wss://socket.wiro.ai/v1`.
2. **Receive welcome**: the server pushes a one-shot `connected` frame confirming the upgrade.
3. **Subscribe**: send an `agent_info` frame with your `agenttoken`.
4. **Receive `agent_subscribed`**: the server acknowledges the subscribe and reports the current lifecycle status, accumulated answer text, and persisted `timeline[]`.
5. **Stream**: listen for `agent_start`, `agent_timeline_delta` block updates, provisional `agent_output` answer snapshots, then `agent_end` / `agent_error` / `agent_cancel`.
6. **Receive `agent_usage_report`**: after a successful `agent_end`, a one-shot token-usage/billing frame arrives on the same `agenttoken` (~250-500 ms later). Optional to consume; keep the socket open briefly if you need it.
7. **Close**: keep the socket open for `agent_usage_report` if needed. After completion or reconnect, read `Message/Detail` for the authoritative persisted timeline and answer.

### 1. Welcome frame (server → client)

Right after the WebSocket upgrade succeeds, the server sends this frame on its own. You don't request it; it arrives before you send anything.

```json
{
  "type": "connected",
  "version": "1.0"
}
```

Use it as a signal that the socket is fully ready to receive a subscribe. Most clients can ignore the payload, since the `version` field is informational.

### 2. Subscribe frame (client → server)

```json
{
  "type": "agent_info",
  "agenttoken": "aB3xK9mR2pLqWzVn7tYhCd5sFgJkNb"
}
```

- `type`: must be the literal string `"agent_info"`. Other values are ignored (the server routes by type; unknown types are silently dropped).
- `agenttoken`: the token returned by `POST /UserAgent/Message/Send`. Required, and only that token is accepted: a 30-character string of letters and digits. If it is missing, empty, or anything else (a session key, for example), the server responds with an `error` frame and subscribes to nothing (see [Subscribe errors](#3-subscribe-errors)).

The server keeps the mapping `connection ↔ agenttoken` in memory for the life of the connection. You can send additional `agent_info` frames on the same socket to subscribe to more tokens (see [Multi-session subscription](#multi-session-subscription)).

### 3. Subscribe errors

If `agenttoken` is missing or blank, the server replies with:

```json
{
  "type": "error",
  "message": "agenttoken-required",
  "result": false
}
```

If `agenttoken` does not look like a `Message/Send` token (a session key, a user id, a number), the server replies with this instead and subscribes to nothing:

```json
{
  "type": "error",
  "message": "agenttoken-invalid",
  "result": false
}
```

The connection stays open: no disconnect. Fix the payload and resend. These two frames cover every shape-level rejection of an `agent_info` subscribe; message routing failures (unknown types, internal exceptions) are silently dropped and produce no frame at all.

### Multi-session subscription

A single WebSocket connection can hold subscriptions to multiple agent sessions simultaneously. Send one `agent_info` frame per token; the server de-duplicates, so resending the same token does not add a second subscription. A connection holds up to 256 tokens: once it is full, each new token drops the oldest one, and a token you send again counts as the newest.

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
- Combining task streaming and agent streaming on the same connection: `task_info` and `agent_info` frames both map to the same connection's token list.

There is no `unsubscribe` frame for `agent_info` tokens. To stop listening to a token without reconnecting, ignore its events client-side; tokens are cleaned up automatically when the connection closes.

## Event Types

Frames flow in two directions. `↓` = server → client, `↑` = client → server.

| Direction | Event Type | Description |
|---|---|---|
| ↓ | `connected` | Welcome frame pushed by the server right after the WebSocket upgrade. Fires exactly once per connection. |
| ↑ | `agent_info` | Client-initiated subscribe frame. Carries the `agenttoken` issued by `Message/Send`. Can be sent multiple times on the same socket (one per token, up to 256). |
| ↓ | `error` | Server-side rejection of a malformed subscribe (a missing or invalid `agenttoken`, or a malformed `sessiontoken`). Connection stays open; retry with a valid frame. An `agent_run_subscribe` can also get `runstreamtoken-invalid` or `runstream-unavailable`, which carry `useragentguid`; see [Run stream errors](#run-stream-errors). |
| ↓ | `agent_subscribed` | Subscribe acknowledged. Carries the current lifecycle `status`, accumulated `debugoutput`, `messageguid`, and persisted `timeline[]`. If the agent already finished before you subscribed, this frame is your reconnect snapshot. |
| ↓ | `agent_start` | The agent has started working on the message. The model is now generating. Emits exactly once per message. |
| ↓ | `agent_timeline_delta` | One ordered public timeline-block update. Carries `messageguid` and one `block`; merge by `blockid` and that block's `version`, then sort by `callindex`, `contentindex`, and `blockid`. |
| ↓ | `agent_output` | Provisional answer snapshot. Emits **many times**, and each carries the full accumulated `raw` answer text so far plus real-time metrics (`speed`, `elapsedTime`, `tokenCount`, `wordCount`). Replace (don't append) the typing surface on each event. |
| ↓ | `agent_end` | Terminal success event. Same payload shape as `agent_output` but contains the final complete text with total metrics. Emits at most once. |
| ↓ | `agent_error` | Terminal failure event. `message` is either a sanitized string ("Agent is temporarily unavailable…" when an exception was caught) or a `progressGenerate` object (when the stream finished but content was a degenerate `"..."` / `"Error: internal error"`). Emits at most once. |
| ↓ | `agent_cancel` | Terminal cancel event. Fires **only** when an already-active message is aborted mid-stream (via `Message/Cancel` or upstream abort). Cancels against a still-queued message do **not** broadcast this event, so check `Message/Detail` for those. Emits at most once. |
| ↓ | `agent_usage_report` | Post-terminal usage/billing frame. Fires once, ~250-500 ms after a successful `agent_end`, on the same `agenttoken`. Carries the final token counts, `model`, `tokencost`, and `remainingcredits` for the message identified by `messageguid`. Not emitted for replayed usage callbacks or for turns with no chat message (cron/hook turns); follow those on the [run stream](#following-an-agents-background-runs). |
| ↓ | `agent_wiroai_runtask` | Model-run discovery frame. Fires whenever the agent itself launches a Wiro model run during a turn (e.g. generating an image or video via `int-wiro-aimodels`). Arrives on the `agenttoken` of the turn that launched the run, carrying the new task's `socketaccesstoken` so you can subscribe to that run's `task_*` lifecycle and collect its outputs. See [Model runs the agent triggers](#model-runs-the-agent-triggers). |
| ↑ | `agent_session_subscribe` | Follow a session with the `sessiontoken` from `Message/History`. See [Following a session](#following-a-session). |
| ↓ | `agent_session_subscribed` | Session follow acknowledged. |
| ↓ | `agent_message_inserted` | A message was added to a followed session between turns (a scheduled report, files sent after an answer, the result of background work). Carries the `sessiontoken` and the new row in `message`. |
| ↑ | `agent_session_unsubscribe` | Stop following a session. No reply. |
| ↑ | `agent_run_subscribe` | Follow an agent's background runs and model runs with the `runstreamtoken` from `POST /UserAgent/RunStreamToken`. See [Following an agent's background runs](#following-an-agents-background-runs). |
| ↓ | `agent_run_subscribed` | Run stream follow acknowledged. Carries `expiresat` and the agent's open runs (`runs`) and model runs (`models`). |
| ↓ | `agent_run_start` | A background run started: a Scheduled Task, a sub-agent, or another run with no chat message. Once per run. |
| ↓ | `agent_run_block` | One step of an open background run changed. Carries one public block with `text: null`. |
| ↓ | `agent_run_end` | A background run ended, with `ok`, `reason`, `durationms`, and `endedat`. Once per run. |
| ↓ | `agent_run_model_start` | The agent started a Wiro model run, in a chat turn or a background run. Once per model run. |
| ↓ | `agent_run_model_end` | A model run the agent started ended, with `ok`, `outcome`, `durationms`, and `endedat`. Once per model run. |
| ↑ | `agent_run_unsubscribe` | Stop following an agent's runs. |
| ↓ | `agent_run_unsubscribed` | Run stream follow stopped. |

## Message Format

Every WebSocket frame is a JSON object. Agent stream frames (`agent_start` / `agent_timeline_delta` / `agent_output` / `agent_end` / `agent_error` / `agent_cancel`), plus the post-terminal `agent_usage_report` frame, share this base shape:

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
| `message` | varies | Empty string (`""`) for `agent_start`, `{ messageguid, block }` for `agent_timeline_delta`, a `progressGenerate` answer object for `agent_output` / `agent_end` (and for the object-shaped `agent_error`), a plain string for string-shaped `agent_error` and `agent_cancel`, and a token-usage object for `agent_usage_report`. |
| `result` | boolean | `true` for success-side events (`agent_subscribed` / `agent_start` / `agent_timeline_delta` / `agent_output` / `agent_end` / `agent_usage_report`), `false` for failure-side events (`agent_error` / `agent_cancel`). See [The `result` field](#the-result-field). |

The **control frames** (`connected`, `error`) use a different shape with no `agenttoken`:

```json
// Welcome — one per connection
{ "type": "connected", "version": "1.0" }

// Subscribe rejection — stays connected, just indicates the last agent_info was malformed
{ "type": "error", "message": "agenttoken-required", "result": false }
```

Run stream frames (`agent_run_*`) and their two errors carry `useragentguid` instead of an `agenttoken`; see [Following an agent's background runs](#following-an-agents-background-runs).

The `agent_subscribed` frame is a snapshot rather than a `message` wrapper. For a known token it carries `status`, `debugoutput`, `messageguid`, and `timeline` at the top level. When the token is unknown, `status` is `"unknown"` and those row-backed fields are omitted.

### agent_subscribed

Sent immediately after the server accepts your subscription. The `status` field reflects where the agent currently is in its lifecycle.

- If the agenttoken is **valid**, `debugoutput` is always present and `timeline` is an array (possibly empty).
- If the agenttoken is **unknown** (typo, expired, already cleaned up from the buffer), `debugoutput` is **omitted entirely** from the payload (no field at all). Always use `"debugoutput" in payload` or `payload.debugoutput !== undefined` to distinguish unknown-token from empty-output, rather than relying on truthiness.

**Valid token, queued** (`debugoutput` present and empty):

```json
{
  "type": "agent_subscribed",
  "agenttoken": "aB3xK9mR2pLqWzVn7tYhCd5sFgJkNb",
  "status": "agent_queue",
  "debugoutput": "",
  "messageguid": "c3d4e5f6-a7b8-9012-cdef-345678901234",
  "timeline": [],
  "result": true
}
```

**Unknown token** (`status` is `"unknown"` and no `debugoutput` field):

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
| `agent_done` | Status of a `model_change` marker row: a zero-content separator inserted when the chat model is switched mid-session. It is **only** used for these markers; normal turns terminate at `agent_end` and never carry this status. See [Agent Messaging](/docs/agent-messaging) for model_change markers. |
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
    "answer": ["Here is the accumulated response text so far..."]
  },
  "result": true
}
```

The `raw` field contains the provisional cumulative SSE response as a single string. The `answer` array contains the same text split into segments. Replace your typing surface with `raw` (or joined `answer`) on each event; keep merging timeline updates independently until the corresponding answer block catches up.

### agent_timeline_delta

Each event carries exactly one changed public block:

```json
{
  "type": "agent_timeline_delta",
  "agenttoken": "aB3xK9mR2pLqWzVn7tYhCd5sFgJkNb",
  "message": {
    "messageguid": "c3d4e5f6-a7b8-9012-cdef-345678901234",
    "block": {
      "blockid": "c0:i0",
      "callindex": 0,
      "contentindex": 0,
      "type": "reasoning",
      "text": "I’ll compare the available evidence before making a recommendation.",
      "phase": "stream",
      "version": 4,
      "startedat": 1743350401,
      "updatedat": 1743350404
    }
  },
  "result": true
}
```

The merge contract is:

1. Treat `blockid` as an opaque deterministic identity.
2. Keep the incoming block only if there is no stored block with that ID, or its `version` is strictly greater than the stored version.
3. Replace only that block; a newer update for one block must never evict another block.
4. Sort the merged values by `callindex ASC`, `contentindex ASC`, then `blockid ASC`.

`version` is per block, not global. A turn can therefore render `Thinking → Answer or Tool → Thinking → Answer` across multiple calls. `reasoning` blocks contain only model-provided reasoning summaries, never raw chain-of-thought. `answer` blocks expose safe answer text. `tool` blocks expose only `toollabel`, `toolstatus`, `toolintegration`, and `toolaction`; their `text` is `null`, and tool IDs, arguments, and results are not public.

The complete public block shape is `blockid`, `callindex`, `contentindex`, `type`, `text`, `phase`, `version`, `startedat`, and `updatedat`, and tool blocks also carry `toollabel`, `toolstatus`, `toolintegration`, and `toolaction`. Reasoning and answer blocks don't have these four fields. `phase` is `stream`, `end`, or `error`; timestamps can be `null` when unavailable. No additional internal correlation or execution metadata is emitted in this block.

Tool blocks carry two closed-list words:

- `toolintegration` names the connector the step works in, as its `key` from [`POST /Credentials/List`](/docs/agent-credentials#post-credentialslist): `adjust`, `apollo`, `apple-appstore`, `brevo`, `calendarific`, `facebook-pages`, `firebase`, `ga4`, `gmail`, `google-ads`, `google-business`, `google-calendar`, `google-drive`, `google-merchant-center`, `google-play`, `hubspot`, `instagram`, `lemlist`, `linkedin`, `mailchimp`, `meta-ads`, `reddit`, `roasit`, `sendgrid`, `serper`, `shopify`, `telegram`, `tiktok`, `tiktok-ads`, `twitter`, `wiro`, `woocommerce`, `wordpress`, or `youtube`.
- `toolaction` names what the step does: `screenshot`, `open-page`, `read-page`, `click`, `type`, `press-key`, `wait`, `upload`, `download`, `read-file`, or `edit-media`.

Each is `null` when no word fits, and a block never has both. The words come with the block's first update, and every later update of the block carries them. A later update can carry a different word if the step changed, so read them from the newest version of the block. A block whose step is rewritten and no longer fits a word keeps its last word. Treat a value you don't know like `null`; [Agent Messaging](/docs/agent-messaging#tool-integration-and-action-values) says what each word means.

A tool block update:

```json
{
  "type": "agent_timeline_delta",
  "agenttoken": "aB3xK9mR2pLqWzVn7tYhCd5sFgJkNb",
  "message": {
    "messageguid": "c3d4e5f6-a7b8-9012-cdef-345678901234",
    "block": {
      "blockid": "c0:i1",
      "callindex": 0,
      "contentindex": 1,
      "type": "tool",
      "text": null,
      "toollabel": "exec",
      "toolstatus": "requested",
      "toolintegration": "shopify",
      "toolaction": null,
      "phase": "stream",
      "version": 1,
      "startedat": 1743350405,
      "updatedat": 1743350405
    }
  },
  "result": true
}
```

### agent_end

Fires when the agent finishes responding. The structure is identical to `agent_output`, but the `message` contains the final complete text with total metrics:

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
    "answer": ["The complete agent response text..."]
  },
  "result": true
}
```

### agent_error

An error occurred during processing. The `message` field can take two forms: a **sanitized string** when the stream is aborted by an exception, or a **progress object** when the stream finished naturally but the model returned a non-response.

**Sanitized string error**: any failure during streaming surfaces as a single user-safe sentence:

```json
{
  "type": "agent_error",
  "agenttoken": "aB3xK9mR2pLqWzVn7tYhCd5sFgJkNb",
  "message": "Agent is temporarily unavailable. Please try again shortly.",
  "result": false
}
```

> **The raw runtime error is never broadcast over WebSocket.** Internal failure messages are recorded in `debugoutput` (retrievable via `POST /UserAgent/Message/Detail`) but **replaced with the generic sentence above** before being pushed to subscribed clients. Log the raw `debugoutput` for your own debugging; show the sanitized string from the WebSocket event to end users.

**Progress-object error**: the SSE stream completes normally but the model returns `"..."` or `"Error: internal error"`. In that case Wiro flags the message as `agent_error` and broadcasts the same `progressGenerate` shape as `agent_output` / `agent_end`, so the client can render the non-response to the user:

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
    "answer": ["..."]
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

Sent when the user cancels a message before the agent completes its response (only when the abort hits the bridge mid-flight, since queued-state cancels don't broadcast this event):

```json
{
  "type": "agent_cancel",
  "agenttoken": "aB3xK9mR2pLqWzVn7tYhCd5sFgJkNb",
  "message": "AbortError",
  "result": false
}
```

> The `message` field carries the abort reason from the runtime (typically `"AbortError"` or a short technical string). It is **not a fixed user-facing message**, so do not parse it for exact strings; use `type === "agent_cancel"` as the signal. Subscribers that cancel from a queued state will receive no event at all (the message is simply marked `agent_cancel` in the database; check with `POST /UserAgent/Message/Detail`).

### agent_usage_report

A post-terminal frame that reports the final token usage and billing for the turn. It arrives shortly **after** `agent_end` (~250-500 ms later, once the turn's token usage has been metered and billed) on the **same** `agenttoken`-keyed channel as `agent_start` / `agent_output` / `agent_end`. A client already subscribed to the turn receives it automatically, with no extra subscribe needed.

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
    "totaltokens": 6670,
    "model": "openai/gpt-5.6-sol",
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
| `inputtokens` | number | Uncached prompt tokens billed at the model's input rate. |
| `outputtokens` | number | Completion tokens generated by the model. |
| `cachereadtokens` | number | Prompt tokens served from the provider's prompt cache (billed at the cache-read rate). |
| `cachewritetokens` | number | Prompt tokens written to the provider's prompt cache during this turn. |
| `totaltokens` | number | Exact sum of input, output, cache-read, and cache-write tokens for the turn. |
| `model` | string | Provider/model slug used for this turn (e.g. `"openai/gpt-5.6-sol"`). |
| `tokencost` | number | Credits charged for this turn. |
| `processedms` | number | Server-side processing time for the turn, in milliseconds. |
| `remainingcredits` | number | Your account credit balance after this turn was billed. |

Use it to patch the per-message token columns and the live credit balance **without re-fetching `Message/History`**: when the frame arrives, look up the row by `messageguid` and write the token counts, `model`, `tokencost`, and `remainingcredits` straight onto it.

Like `agent_output`, it is a live broadcast: it is **not** replayed to clients that subscribe after it has already fired. If you reconnect after the fact, read usage from `POST /UserAgent/Message/Detail` (or `Message/History`) instead.

It is **not** emitted for:

- **Idempotent / replayed usage callbacks**: a turn is billed once, and a replayed usage callback does not re-broadcast the frame.
- **Turns with no chat message**: e.g. cron- or hook-triggered turns that produce no assistant message row have no `messageguid` to key on, so no frame is sent. Follow those runs on the [run stream](#following-an-agents-background-runs) instead.

### Model runs the agent triggers

When the agent **itself** kicks off a Wiro model run during a turn (for example generating an image or a video through the `int-wiro-aimodels` skill), the bridge emits an `agent_wiroai_runtask` discovery frame. It hands you the new model run's `socketaccesstoken` so you can subscribe to that run and stream its progress and final media outputs. This is how a chat product surfaces a "live activity feed" of the media the agent is producing.

```json
{
  "type": "agent_wiroai_runtask",
  "agenttoken": "aB3xK9mR2pLqWzVn7tYhCd5sFgJkNb",
  "message": {
    "taskid": "534574",
    "socketaccesstoken": "eDcCm5yy7Z…",
    "slugowner": "openai",
    "slugproject": "gpt-image-1",
    "categories": ["image"],
    "status": "task_queue",
    "response": { "result": true, "taskid": "534574", "socketaccesstoken": "eDcCm5yy7Z…" }
  },
  "result": true
}
```

| Field | Type | Description |
|---|---|---|
| `taskid` | string | The model run's task id, the same value as `taskid` in a `POST /Run` response. |
| `socketaccesstoken` | string | The run's task token. Subscribe to it (see below) to stream the model run's lifecycle and outputs. |
| `slugowner` | string | Model owner slug (e.g. `"openai"`, `"black-forest-labs"`). |
| `slugproject` | string | Model slug (e.g. `"gpt-image-1"`). |
| `categories` | array<string> | The model's categories (e.g. `["image"]`, `["video"]`). |
| `status` | string | Always `"task_queue"` at discovery: the run was just enqueued. |
| `response` | object | Convenience echo `{ result, taskid, socketaccesstoken }`. |

**This frame arrives on the turn's `agenttoken`.** Like the lifecycle frames above, `agent_wiroai_runtask` goes to the sockets subscribed to the `agenttoken` of the turn in which the agent launched the run, and its `agenttoken` field carries that token. The subscription you already hold for the chat stream receives it, so no extra subscribe is needed. A session key is not a channel: `agent_info` with a session key returns `agenttoken-invalid` and brings nothing.

**Then pivot to the task socket for outputs.** Take `message.socketaccesstoken` and subscribe to the standard model-run WebSocket exactly as documented in [WebSocket](/docs/websocket): send `{ "type": "task_info", "tasktoken": "<socketaccesstoken>" }` and stream `task_queue → task_start → task_output → task_postprocess_end`. The final `task_postprocess_end` carries the output array (media URLs). The model-run `task_*` events are **only** delivered on the task's own `socketaccesstoken` channel. They are never re-broadcast on the agent channel.

> **Only fires for agent-initiated runs.** `agent_wiroai_runtask` is emitted when the *agent* calls a model mid-turn. Model runs you launch yourself with `POST /Run` (your own `x-api-key`) do not produce this frame, because you already hold their `socketaccesstoken` from the `/Run` response. It fires only for model runs the agent starts while answering your `Message/Send` turn. To see every model run the agent starts, Scheduled Tasks included, follow its [run stream](#following-an-agents-background-runs) (`agent_run_model_start` and `agent_run_model_end`).

### Following a session

Some messages are added to a session between turns: a scheduled report, files the agent sends after its answer, or the result of longer work it finished in the background. They belong to no turn, so they never stream on an `agenttoken`. To receive them as they are added, follow the session with the `sessiontoken` that [`Message/History`](/docs/agent-messaging#post-useragentmessagehistory) returns for it:

```json
{
  "type": "agent_session_subscribe",
  "sessiontoken": "Lp4vQ8sWn2KxT7cRb1YhZ6mDg9FjA3uEo5iNk0wXyHt"
}
```

The server acknowledges the follow:

```json
{ "type": "agent_session_subscribed", "result": true }
```

Each message added to that session afterwards arrives as an `agent_message_inserted` frame:

```json
{
  "type": "agent_message_inserted",
  "sessiontoken": "Lp4vQ8sWn2KxT7cRb1YhZ6mDg9FjA3uEo5iNk0wXyHt",
  "message": {
    "guid": "d4e5f6a7-b8c9-0123-def4-567890123456",
    "uuid": "ada-uuid",
    "sessionkey": "user-42",
    "content": "",
    "response": "Your product video is ready: https://cdn.wiro.ai/…/video.mp4",
    "status": "agent_end",
    "metadata": { "type": "subagent" },
    "createdat": 1743350700,
    "startedat": 1743350700,
    "endedat": 1743350700
  },
  "result": true
}
```

| Field | Type | Description |
|---|---|---|
| `guid` | string | The new message's GUID. Add each `guid` once; skip it if History already gave it to you. |
| `uuid` | string | The row's `uuid`, as `Message/History` returns it. |
| `sessionkey` | string | The session the message was added to. |
| `content` | string | Always `""`: no prompt of yours belongs to these messages. |
| `response` | string | The message text. |
| `status` | string | Always `"agent_end"`. |
| `metadata` | object | `type` is `"subagent"` for the result of work the agent finished in the background, `"system"` for the other messages. Other keys may appear; ignore the ones you don't use. |
| `createdat` / `startedat` / `endedat` | number | Unix timestamps in seconds, all set to when the message was added. |

- **What arrives.** A follower receives exactly the new messages its `Message/History` read would show. Turns you start with `Message/Send` keep streaming on their own `agenttoken`; following the session doesn't repeat them.
- **Stop following** with `{ "type": "agent_session_unsubscribe", "sessiontoken": "…" }`. There is no reply.
- **Limit.** One connection follows up to 16 sessions. Following another one drops the oldest follow.
- **Errors.** A malformed `sessiontoken` gets `{ "type": "error", "message": "sessiontoken-invalid", "result": false }`, and the connection stays open. The acknowledgement doesn't check which session a token belongs to, so send the token exactly as History returned it.
- **Reconnects.** Frames aren't replayed, and follows end with the connection. After reconnecting, send `agent_session_subscribe` again and read History once to catch anything added while you were away.
- **Keep the token private.** Whoever holds it receives the session's new messages. Read it from History when you open the session instead of storing it.

### Following an agent's background runs

Some of an agent's work never shows up as a chat turn: its Scheduled Tasks, the sub-agents it starts to work on something in the background, and other runs that have no chat message, such as a reply on a connected Telegram, Slack or Discord channel. The run stream lets you follow them live: when each run starts, each step it takes, and when it ends. It also reports every Wiro model run the agent starts, in chat turns too, from start to end.

The stream carries labels only. Reasoning and answer text never appear on it (a block's `text` is always `null`), and a tool step shows only its label, its status and the two closed-list words a timeline tool block has.

**Who can follow.** The agent's owner and, on a team agent, the team's admins: the same people who can read the agent's [Logs](/docs/agent-logs). With an API key, the check applies to the user who created the key's project, so the owner's project API key works too.

#### Get a run stream token

Call [`POST /UserAgent/RunStreamToken`](/docs/agent-logs#post-useragentrunstreamtoken) with the agent's guid:

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/RunStreamToken" \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321" }'
```

```json
{
  "result": true,
  "runstreamtoken": "Zr8Qm2Kx7VbN4tLpW1sYc9HdF6gJaE3uTo5iRk0nXqM",
  "expiresat": 1793664000,
  "errors": []
}
```

`runstreamtoken` is an opaque token valid until `expiresat`, 24 to 48 hours after it is issued. Send it exactly as you got it, and keep it private: whoever holds it can follow the agent's runs until it expires. When less than 12 hours remain, get a new token and subscribe again with it. A stopped agent gets a token too.

#### Subscribe and unsubscribe

Send `agent_run_subscribe` on a connection to `wss://socket.wiro.ai/v1`. The same connection can carry your `agent_info` subscriptions too:

```json
{
  "type": "agent_run_subscribe",
  "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
  "runstreamtoken": "Zr8Qm2Kx7VbN4tLpW1sYc9HdF6gJaE3uTo5iRk0nXqM"
}
```

The server answers with the runs and model runs that are open right now:

```json
{
  "type": "agent_run_subscribed",
  "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
  "expiresat": 1793664000,
  "runs": [
    {
      "runref": "q2Vt8kXw1bN0aZ3cR5sY7u",
      "runkind": "cron",
      "sessionkey": null,
      "root": "cron",
      "startedat": 1793491800,
      "steps": 3,
      "block": {
        "blockid": "c2:i1",
        "callindex": 2,
        "contentindex": 1,
        "type": "tool",
        "text": null,
        "toollabel": "exec",
        "toolstatus": "requested",
        "toolintegration": "shopify",
        "toolaction": null,
        "phase": "stream",
        "version": 1,
        "startedat": 1793491850,
        "updatedat": 1793491850
      }
    }
  ],
  "models": [
    {
      "modelref": "Hn4pW0sLx9Qe2Tm7Vb1Kd8",
      "runref": "q2Vt8kXw1bN0aZ3cR5sY7u",
      "sessionkey": null,
      "slugowner": "google",
      "slugproject": "nano-banana-pro",
      "categories": ["image-generation"],
      "startedat": 1793491860
    }
  ],
  "dropped": [],
  "result": true
}
```

| Field | Type | Description |
|---|---|---|
| `useragentguid` | string | The agent you subscribed to. |
| `expiresat` | number | Unix seconds when this subscription ends: the `expiresat` of the token you sent. |
| `runs` | array | The agent's open runs, most recently active first, up to 256. Each has `runref`, `runkind`, `sessionkey`, `root`, `startedat`, `steps`, and `block`. |
| `models` | array | The agent's open model runs, newest `startedat` first, up to 256. Each has `modelref`, `runref`, `sessionkey`, `slugowner`, `slugproject`, `categories`, and `startedat`. |
| `dropped` | array | The guids of agents this connection stopped following to make room for this one. Usually empty; see [Run stream limits](#run-stream-limits). |

[Run stream fields](#run-stream-fields) describes each field of a run and a model run. Events can start reaching you as soon as the subscription is in place, so one can arrive just before this reply. Subscribing again on the same connection is fine: the subscription then ends at the `expiresat` of the token you sent, and the reply has fresh lists.

To stop following an agent, send `agent_run_unsubscribe`. It needs no token, and the server answers `agent_run_unsubscribed`:

```json
{
  "type": "agent_run_unsubscribe",
  "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321"
}
```

```json
{
  "type": "agent_run_unsubscribed",
  "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
  "result": true
}
```

The reply comes even for an agent you weren't following. An unsubscribe with a malformed `useragentguid` gets no reply.

#### Run events

Each event carries `type`, `useragentguid`, `message`, and `result`. `result` is always `true`, also for a run that failed, so read `ok`. No event carries an `agenttoken` or any other token.

| Event | `message` keys | When |
|---|---|---|
| `agent_run_start` | `runref`, `runkind`, `sessionkey`, `root`, `startedat` | A background run started. Once per run. |
| `agent_run_block` | `runref`, `runkind`, `sessionkey`, `root`, `block` | A step of an open background run changed. Sent only for a newer `version` of that block. |
| `agent_run_end` | `runref`, `runkind`, `sessionkey`, `root`, `ok`, `reason`, `durationms`, `endedat` | The run ended. Once per run, and nothing follows it. |
| `agent_run_model_start` | `modelref`, `runref`, `sessionkey`, `slugowner`, `slugproject`, `categories`, `startedat` | The agent started a Wiro model run. Once per model run. |
| `agent_run_model_end` | `modelref`, `ok`, `outcome`, `durationms`, `endedat` | That model run ended. Once per model run. |

`agent_run_start`, `agent_run_block`, and `agent_run_end` cover only runs that have no chat message. A chat turn you start with `Message/Send` streams on its `agenttoken` and never shows up here. `agent_run_model_start` and `agent_run_model_end` cover every Wiro model run the agent starts, chat turns included.

A model run can start before its run's `agent_run_start` reaches you, and in rare cases a block can too: treat either one as the run being open.

A sub-agent started from a chat session:

```json
{
  "type": "agent_run_start",
  "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
  "message": {
    "runref": "Lw7cR2nYb5Xq0Tz8Mk3Vh1",
    "runkind": "subagent",
    "sessionkey": "default",
    "root": "chat",
    "startedat": 1793492400
  },
  "result": true
}
```

A step of a Scheduled Task run finished:

```json
{
  "type": "agent_run_block",
  "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
  "message": {
    "runref": "q2Vt8kXw1bN0aZ3cR5sY7u",
    "runkind": "cron",
    "sessionkey": null,
    "root": "cron",
    "block": {
      "blockid": "c2:i1",
      "callindex": 2,
      "contentindex": 1,
      "type": "tool",
      "text": null,
      "toollabel": "exec",
      "toolstatus": "completed",
      "toolintegration": "shopify",
      "toolaction": null,
      "phase": "end",
      "version": 2,
      "startedat": 1793491850,
      "updatedat": 1793491858
    }
  },
  "result": true
}
```

The Scheduled Task run ended:

```json
{
  "type": "agent_run_end",
  "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
  "message": {
    "runref": "q2Vt8kXw1bN0aZ3cR5sY7u",
    "runkind": "cron",
    "sessionkey": null,
    "root": "cron",
    "ok": true,
    "reason": "report",
    "durationms": 147230,
    "endedat": 1793491947
  },
  "result": true
}
```

A model run started in a chat turn, then its end:

```json
{
  "type": "agent_run_model_start",
  "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
  "message": {
    "modelref": "Pz5mT1qXv8Rk3Nw0Yb7Lc2",
    "runref": null,
    "sessionkey": "default",
    "slugowner": "google",
    "slugproject": "nano-banana-pro",
    "categories": ["image-generation"],
    "startedat": 1793492460
  },
  "result": true
}
```

```json
{
  "type": "agent_run_model_end",
  "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
  "message": {
    "modelref": "Pz5mT1qXv8Rk3Nw0Yb7Lc2",
    "ok": true,
    "outcome": "done",
    "durationms": 41000,
    "endedat": 1793492501
  },
  "result": true
}
```

#### Run stream fields

| Field | Type | Description |
|---|---|---|
| `useragentguid` | string | The agent the frame belongs to, for example `"f8e7d6c5-b4a3-2190-fedc-ba0987654321"`. Route frames by it. |
| `runref` | string \| null | Identifies one background run, for example `"q2Vt8kXw1bN0aZ3cR5sY7u"`: 22 letters, digits, `-` or `_`. Every frame of a run carries the same value. Always set on run events and in `runs`. On model events and in `models` it names the run that started the model run, and it is `null` when a chat turn started it. |
| `modelref` | string | Identifies one model run, for example `"Hn4pW0sLx9Qe2Tm7Vb1Kd8"`: 22 letters, digits, `-` or `_`. It is not the model run's `taskid`: this stream never carries a `taskid` or a `socketaccesstoken`. |
| `runkind` | string | What kind of run it is: `cron` (a Scheduled Task), `subagent` (a sub-agent working in the background), `announce` (a run that writes the result of background work back to its chat session), or `other` (any other run with no chat message, such as a reply on a connected channel). It can change while the run is open, for example from `other` to `cron`, but never back to `other`. Every event repeats it; the value on `agent_run_end` is final. Treat a value you don't know as `other`. |
| `root` | string | What the run belongs to: `chat` (a chat session, named in `sessionkey`), `cron` (a Scheduled Task), or `unknown` (not known yet). A later event can fill it in; once it is `chat` or `cron`, it never goes back to `unknown`. Model events don't carry it. Treat a value you don't know as `unknown`. |
| `sessionkey` | string \| null | The key of the chat session the run works for: the `sessionkey` that `Message/Send`, `Message/Sessions` and `Message/History` use, for example `"default"`, not the session's display `name`. Up to 512 characters, and only ASCII letters and digits, `.`, `_`, `:`, `~`, `@`, `+` and `-`: a key with any other character, such as a space or `ü`, reads `null` here. A Scheduled Task run has `null` here, or its `cs-cron-` session key; `root` is `cron` either way. It is also `null` while the session isn't known yet. Once a run has a `sessionkey`, it doesn't go back to `null`. On model events it is the session key sent with the request that started the model run, or `null`. Whoever starts a session or a model run picks its key, so treat `sessionkey` as text from your users: escape it before you show it, and don't rely on it to tell who started a run. |
| `startedat` | number | Unix seconds when the run or model run started, for example `1793491800`. When a run is first seen as it ends, `agent_run_start` and `agent_run_end` come together and `startedat` is worked out from the run's duration. |
| `steps` | number | In `runs` only: how many tool steps the run has taken so far, 0 or more. |
| `block` | object \| null | On `agent_run_block`, the step that changed. In `runs`, the run's newest step, or `null` when it has none yet. See the block shape below. |
| `ok` | boolean \| null | On end events: `true` when the run or model run succeeded, `false` when it failed, and `null` when its result is unknown (`reason` or `outcome` is `lost`). |
| `reason` | string | On `agent_run_end`, how the run ended. `report`: the run reported its own end. `terminal`: after the run's last update to a running step, a step ended (`ok: true`) or failed (`ok: false`), and no step was running again within two minutes. The first step to end or fail after that update sets `ok` and `endedat`; steps that end or fail after it change neither. `lost`: nothing came from the run for 60 minutes, it was still open 48 hours after it started, or the agent stopped, restarted or was deleted while the run was open (`ok: null`). Treat a value you don't know as `lost`. |
| `outcome` | string | On `agent_run_model_end`: `done` (the task reached `task_postprocess_end` with `pexit` `"0"`; `ok: true`), `failed` (`task_error`, or `task_postprocess_end` with another `pexit`; `ok: false`), `cancelled` (`task_cancel`: the task was cancelled or killed; `ok: false`), or `lost` (its end could not be read, for example it was still open after 24 hours; `ok: null`). Treat a value you don't know as `lost`. |
| `durationms` | number | On end events: how long the run or model run took, in milliseconds, for example `147230`. Never `null`. |
| `endedat` | number | On end events: Unix seconds when it ended, for example `1793491947`. With `reason: "terminal"`, it is when that first step ended or failed (see `reason`); with `reason: "lost"`, it is the run's last activity. |
| `slugowner`, `slugproject` | string \| null | The model, as in `POST /Run/{owner-slug}/{model-slug}`, for example `"google"` and `"nano-banana-pro"`. Each is up to 128 letters, digits, `.`, `_` or `-`, or `null` when the slug is anything else. |
| `categories` | array | The model's categories as strings, for example `["image-generation"]`. Up to 16, never `null`: an empty array when none are known. |

Every time is a whole number of Unix seconds and every duration a whole number of milliseconds.

`block` has the shape of an [`agent_timeline_delta`](#agent_timeline_delta) block, with `text` always `null`:

- A tool block has `blockid`, `callindex`, `contentindex`, `type` (`tool`), `text`, `toollabel`, `toolstatus` (`requested`, `completed`, or `error`), `toolintegration`, `toolaction`, `phase`, `version`, `startedat`, and `updatedat`. `toolintegration` and `toolaction` use the same closed lists as timeline tool blocks, and when `toolintegration` is set, `toolaction` is `null`.
- A `reasoning` or `answer` block has `blockid`, `callindex`, `contentindex`, `type`, `text`, `phase`, `version`, `startedat`, and `updatedat`.
- A `blockid` is unique within one run only, so key blocks by `runref` and `blockid` together. `version` starts at 1 and only grows: keep a block only when its `version` is higher than the one you hold.
- `startedat` is when the step was first seen, and `updatedat` is the time of this update.
- `phase` is `stream`, `end`, or `error`. A step that reached `end` or `error` stays there. An update that names no tool word keeps the block's last word.

#### Run stream errors

Both errors are `error` frames that carry `useragentguid`, and the connection stays open:

```json
{
  "type": "error",
  "message": "runstreamtoken-invalid",
  "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
  "result": false
}
```

| `message` | When | What to do |
|---|---|---|
| `runstreamtoken-invalid` | The token is wrong, belongs to another agent or has expired, or the guid or the token is malformed. `useragentguid` is `null` when the guid itself is malformed. | Get a new token, at most once a minute, and subscribe again. |
| `runstream-unavailable` | The agent's open runs could not be read just now, or the run stream is not available. | Keep the runs you hold and subscribe again later. |

When only the lists could not be read, your subscription is in place and events keep coming. The server never sends empty lists in place of `runstream-unavailable`, so empty `runs` and `models` always mean that nothing is open.

#### Run stream limits

- One connection follows up to 256 agents. Subscribing to one more drops the agent whose subscription is the oldest, and the reply lists it in `dropped`. Subscribing again to an agent makes it the newest. Expired subscriptions are removed first and are not listed.
- `runs` and `models` hold up to 256 items each.
- An agent has up to 256 open runs at a time. A run that starts while 256 are open is sent late: at its next step once one of them has ended, or with its end.
- `categories` holds up to 16 items, and `sessionkey` up to 512 characters.
- A run sends `agent_run_block` for up to 512 different blocks. New blocks after that are not sent, and the run's end still comes.
- A subscription ends at its `expiresat`. Nothing arrives after that until you subscribe again with a new token.

#### Client rules

1. Key runs by `runref`, blocks by `runref` and `blockid` (keep a block only when its `version` is higher), and model runs by `modelref`.
2. On `agent_run_subscribed`, replace the agent's open runs and model runs with the lists, except one whose start or first frame reached you after you sent that subscribe: keep it, and let the next reply decide.
3. A run or model run missing from a list has ended, and its result is unknown.
4. After `agent_run_end` or `agent_run_model_end`, keep that `runref` or `modelref` ended for at least 10 minutes: a later list or frame never reopens it.
5. An `agent_run_block` or `agent_run_model_start` for a ref you don't know opens it.
6. After a reconnect, subscribe again for every agent: subscriptions belong to the connection, and frames are not replayed.
7. While an agent has an open run or model run, subscribe again after 30 seconds with no `agent_run_*` frame for it.
8. With no reply to `agent_run_subscribe` within 10 seconds, send it again after 5 seconds, then 15, then 60.
9. On `runstreamtoken-invalid`, get a new token (at most once a minute) and subscribe again. On `runstream-unavailable`, keep what you hold and try again later.
10. When less than 12 hours remain before `expiresat`, get a new token and send `agent_run_subscribe` with it.

## The `result` Field

Every agent lifecycle event includes a `result` boolean:

| Value | Events |
|---|---|
| `true` | `agent_subscribed`, `agent_start`, `agent_timeline_delta`, `agent_output`, `agent_end`, `agent_usage_report`, `agent_session_subscribed`, `agent_message_inserted`, `agent_run_subscribed`, `agent_run_unsubscribed`, `agent_run_start`, `agent_run_block`, `agent_run_end`, `agent_run_model_start`, `agent_run_model_end` |
| `false` | `error` (including the run stream's `runstreamtoken-invalid` and `runstream-unavailable`), `agent_error`, `agent_cancel` |

On `agent_run_end` and `agent_run_model_end`, `result` is `true` even when the run failed: read `ok` for how it went.

Use `result` to quickly determine whether the event represents a successful state. When `result` is `false`, inspect `message` for error details or cancellation context. The welcome `connected` frame has no `result` field. It's a one-shot ack and always implies success (you got the frame, so the upgrade worked).

## Streaming Metrics

Each `agent_output` and `agent_end` event includes real-time performance data in the `message` object:

| Field | Type | Description |
|---|---|---|
| `speed` | string | Current generation speed (e.g. `"12.5"`). |
| `speedType` | string | Speed unit: always `"words/s"` for agent responses. |
| `elapsedTime` | string | Wall-clock time since the stream started (e.g. `"2.4s"`). |
| `tokenCount` | number | Number of answer chunks received so far. Authoritative model token counts arrive in `agent_usage_report`. |
| `wordCount` | number | Total words in the accumulated response. |

These metrics update with every `agent_output` event, allowing you to display a live speed indicator or progress bar in your UI.

## Timeline safety boundary

Public reasoning is available only as `type: "reasoning"` timeline blocks. Wiro publishes provider-authored summaries from supported OpenAI GPT-5 calls, not raw hidden chain-of-thought or generic provider traces. Tool blocks publish only a safe label, a status, and two closed-list words, `toolintegration` and `toolaction`. Wiro does not parse literal `<think>` tags from `agent_output`; treat any such text in `raw` as ordinary provisional answer output.

## Full Integration Example

A typical integration follows this pattern: call the REST API to send a message, then subscribe via WebSocket to stream the response.

**Step 1: Send a message via REST**

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

**Step 2: Subscribe via WebSocket**

```javascript
const ws = new WebSocket('wss://socket.wiro.ai/v1');

ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'agent_info',
    agenttoken: 'aB3xK9mR2pLqWzVn7tYhCd5sFgJkNb'
  }));
};
```

**Step 3: Handle streaming events**

```
←  connected         { version: "1.0" }
→  agent_info        { agenttoken: "..." }
←  agent_subscribed  { status: "agent_queue", debugoutput: "", timeline: [] }
←  agent_start       { message: "" }
←  agent_timeline_delta { message: { messageguid: "c3d4...", block: { blockid: "c0:i0", callindex: 0, contentindex: 0, type: "reasoning", version: 1 } } }
←  agent_output      { message: { raw: "Quantum", wordCount: 1 } }
←  agent_timeline_delta { message: { messageguid: "c3d4...", block: { blockid: "c0:i1", callindex: 0, contentindex: 1, type: "answer", version: 1 } } }
←  agent_output      { message: { raw: "Quantum computing uses qubits...", wordCount: 28 } }
←  agent_end         { message: { raw: "Quantum computing uses qubits that...", wordCount: 118 } }
←  agent_usage_report { result: true, message: { messageguid: "c3d4...", totaltokens: 6670, remainingcredits: 9994 } }
```

`←` = server → client, `→` = client → server. `agent_output` contains provisional full accumulated answer text. Replace (don't append) that typing surface; merge timeline blocks independently.

The full observable wire order for a normal turn is:

```text
agent_queue  →  agent_start  →  (agent_timeline_delta | agent_output) × N  →  agent_end  →  agent_usage_report
```

`agent_queue` is **not** a WebSocket frame: it's the `status` returned synchronously in the `Message/Send` response (and reflected by `agent_subscribed` if you subscribe while the message is still queued). Timeline and provisional answer events can interleave between start and terminal status. On the failure path, `agent_error` or `agent_cancel` takes the place of `agent_end`, and **no** `agent_usage_report` follows. `Message/Detail` is authoritative for the final persisted timeline.

[`agent_wiroai_runtask`](#model-runs-the-agent-triggers) is **not** part of this linear order: it fires out-of-band (zero or more times per turn, whenever the agent launches a model run) on the same `agenttoken` as the turn's other frames.

## Code Examples

### JavaScript

```javascript
const agentToken = 'your-agent-token';

const ws = new WebSocket('wss://socket.wiro.ai/v1');
const timelineByMessage = new Map();

function mergeTimelineBlock(messageguid, block) {
  const byId = timelineByMessage.get(messageguid) || new Map();
  const previous = byId.get(block.blockid);
  if (!previous || block.version > previous.version) {
    byId.set(block.blockid, block);
  }
  timelineByMessage.set(messageguid, byId);
  return [...byId.values()].sort(
    (a, b) => a.callindex - b.callindex
      || a.contentindex - b.contentindex
      || a.blockid.localeCompare(b.blockid)
  );
}

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

    case 'agent_timeline_delta':
      // Merge msg.message.block by blockid + per-block version, then sort
      // by callindex/contentindex. Do not append in arrival order.
      mergeTimelineBlock(msg.message.messageguid, msg.message.block);
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

**`connected`, the welcome frame** (server → client, sent once on upgrade):

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

**`error` for a malformed subscribe** (server → client, sent when `agent_info` is missing `agenttoken`):

```json
{
  "type": "error",
  "message": "agenttoken-required",
  "result": false
}
```

**`error` for a value that is not an agenttoken** (server → client, for example a session key in `agent_info`):

```json
{
  "type": "error",
  "message": "agenttoken-invalid",
  "result": false
}
```

**`agent_subscribed` for a valid token** (empty `debugoutput`):

```json
{
  "type": "agent_subscribed",
  "agenttoken": "aB3xK9...",
  "status": "agent_queue",
  "debugoutput": "",
  "messageguid": "c3d4e5f6-...",
  "timeline": [],
  "result": true
}
```

**`agent_subscribed` for an unknown token** (`status: "unknown"`, no `debugoutput`):

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

**`agent_timeline_delta`** with one public block update:

```json
{
  "type": "agent_timeline_delta",
  "agenttoken": "aB3xK9...",
  "message": {
    "messageguid": "c3d4e5f6-...",
    "block": {
      "blockid": "c0:i0",
      "callindex": 0,
      "contentindex": 0,
      "type": "reasoning",
      "text": "I’ll verify the relevant constraints.",
      "phase": "stream",
      "version": 1,
      "startedat": 1743350401,
      "updatedat": 1743350402
    }
  },
  "result": true
}
```

**`agent_output`** with streaming partials, emitted multiple times:

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

**`agent_end`** with the final response:

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

**`agent_error`** as a sanitized string (any exception during streaming):

```json
{
  "type": "agent_error",
  "agenttoken": "aB3xK9...",
  "message": "Agent is temporarily unavailable. Please try again shortly.",
  "result": false
}
```

**`agent_cancel`**, sent only for an active-processing abort (queued-state cancels don't broadcast):

```json
{
  "type": "agent_cancel",
  "agenttoken": "aB3xK9...",
  "message": "AbortError",
  "result": false
}
```

**`agent_usage_report`**, the post-terminal usage/billing frame, ~250-500 ms after `agent_end`:

```json
{
  "type": "agent_usage_report",
  "agenttoken": "aB3xK9...",
  "result": true,
  "message": {
    "messageguid": "c3d4e5f6-...",
    "totaltokens": 6670,
    "model": "openai/gpt-5.4",
    "tokencost": 5,
    "remainingcredits": 9995
  }
}
```

**`agent_run_subscribe`**, to follow an agent's background runs (client → server). Its reply, events, and errors are in [Following an agent's background runs](#following-an-agents-background-runs):

```json
{
  "type": "agent_run_subscribe",
  "useragentguid": "f8e7d6c5-...",
  "runstreamtoken": "Zr8Qm2..."
}
```

## Connection Keep-Alive

The Wiro WebSocket server sends a ping every **30 seconds** to keep the connection alive. Most standard WebSocket client libraries respond to pings automatically; if your client implements a custom frame handler, make sure it sends a pong within a few seconds of each ping or the server will drop the connection. After `agent_error` / `agent_cancel` you can close the socket immediately. After `agent_end`, one more frame (`agent_usage_report`) follows ~250-500 ms later; wait for it if you need usage/billing data. Read `Message/Detail` whenever you need the authoritative completed timeline.

## Correlating Events With Your Messages

Every agent lifecycle frame carries `agenttoken`, so keep the mapping returned by `Message/Send`. Most stream frames do not include `messageguid`; `agent_timeline_delta` additionally carries `message.messageguid`, and `agent_subscribed` carries top-level `messageguid`. No chat stream frame carries `useragentguid`; only the [run stream](#following-an-agents-background-runs) frames (`agent_run_*`) do.

The post-terminal `agent_usage_report` also names `message.messageguid`, but it arrives only after `agent_end`, so you still need the `agenttoken → messageguid` mapping for start/output/end/error/cancel routing.

### Why `agenttoken` is the correlation key

- `Message/Send` issues exactly one `agenttoken` per message and returns it alongside `messageguid` in the HTTP response.
- The bridge stamps the same `agenttoken` on every event it emits for that message.
- Multiple connections can subscribe to the same `agenttoken` and each gets the full event stream, so `agenttoken` is also the fan-out key.
- A single socket can hold subscriptions for many `agenttoken`s at once (see [Multi-session subscription](#multi-session-subscription)), and the per-event `agenttoken` lets your handler dispatch into the right UI element.

### Recommended client pattern

1. Call `POST /UserAgent/Message/Send`: you get back `{ messageguid, agenttoken, status: "agent_queue", ... }`.
2. Store the mapping `agenttoken → messageguid` (or `agenttoken → your UI message id`).
3. Send `{ "type": "agent_info", "agenttoken }` on an open socket (new or existing, since connections can be reused).
4. In `ws.onmessage`, read `msg.agenttoken` on every lifecycle frame. For `agent_timeline_delta`, merge `msg.message.block` by `blockid` and strictly newer per-block `version`; never append in arrival order.
5. When the turn ends, delete the mapping so it doesn't leak memory across sessions. For successful turns, wait for the trailing `agent_usage_report` (it arrives ~250-500 ms after `agent_end`) before deleting, so you can attribute the usage to the right message; for `agent_error` / `agent_cancel`, delete immediately, since no usage report follows.

```javascript
const tokenToMessageId = new Map()
const timelineByMessageId = new Map()

function mergeTimelineBlock(uiMessageId, block) {
  const byId = timelineByMessageId.get(uiMessageId) || new Map()
  const previous = byId.get(block.blockid)
  if (!previous || block.version > previous.version) byId.set(block.blockid, block)
  timelineByMessageId.set(uiMessageId, byId)
  const timeline = [...byId.values()].sort(
    (a, b) => a.callindex - b.callindex
      || a.contentindex - b.contentindex
      || a.blockid.localeCompare(b.blockid)
  )
  updateUI(uiMessageId, { timeline })
}

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
    case 'agent_timeline_delta':
      mergeTimelineBlock(uiMessageId, msg.message.block)
      break
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

- Subscribe to **both** `agenttoken`s (one `agent_info` frame each, and the server de-duplicates automatically).
- Key all UI updates on `agenttoken`, not on `sessionkey` (which is shared) or timestamps (which can interleave).

The server never mixes streams: every event is stamped with the originating `agenttoken` so routing is unambiguous even when chunks from two messages interleave on the wire.

### Control frames have no `agenttoken`

The welcome frame and the subscribe-error frame are connection-level signals, not per-message events. They intentionally **omit** `agenttoken`:

```json
{ "type": "connected", "version": "1.0" }
```

```json
{ "type": "error", "message": "agenttoken-required", "result": false }
```

Always null-check `msg.agenttoken` before looking it up in your mapping (see the `if (!msg.agenttoken) return` guard in the example above).

## Reconnection & Recovery

The agent keeps running server-side **regardless of whether any client is subscribed**. A disconnected socket never cancels the agent. This means a dropped connection is always recoverable: just reconnect and re-subscribe with the same `agenttoken`.

### Recovery flow

1. **Detect disconnect**: `ws.onclose` / stream exception / ping timeout.
2. **Reconnect**: open a new WebSocket to `wss://socket.wiro.ai/v1`.
3. **Wait for welcome**: receive `{ "type": "connected", "version": "1.0" }` (optional but clean).
4. **Re-subscribe**: send `{ "type": "agent_info", "agenttoken": "..." }` with the same token.
5. **Handle `agent_subscribed`**: the server reports the **current** status and persisted `timeline[]`. Three cases:
   - `status` is `agent_queue` / `agent_start` / `agent_output` → stream is still live; accumulated provisional answer text is in `debugoutput`. Seed your block map from `timeline`, then merge future deltas.
   - `status` is `agent_end` → the agent already finished. `debugoutput` holds the full final response. Fetch `POST /UserAgent/Message/Detail` for the canonical record (including complete `timeline`, `metadata`, attachments, and timestamps), then close the socket.
   - `status` is `agent_error` / `agent_cancel` → the agent already failed / was cancelled. `debugoutput` may contain partial output. No further events. Fetch `POST /UserAgent/Message/Detail` for the persisted error details.

On reconnect you do **not** receive replays of past `agent_output` or `agent_timeline_delta` frames. Use `debugoutput` and `timeline` on `agent_subscribed` as the snapshot of what you missed.

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
- **Stop retrying once you hit a terminal event** (`agent_end` / `agent_error` / `agent_cancel`) or an `unknown` status, since the work is either done or the token is gone.
- **Idempotent re-subscribe**: sending the same `agenttoken` again on a fresh socket is always safe.
- **Fall back to polling** if WebSocket is blocked (strict corporate proxies, mobile cellular with long-poll fallbacks). Use `POST /UserAgent/Message/Detail` at 1-2 second intervals until `status` is terminal.

## Token Lifecycle

An `agenttoken` is issued per message by `POST /UserAgent/Message/Send` and stays addressable on the WebSocket for as long as the underlying message exists (Wiro does not auto-purge messages on a short timer; tokens remain queryable indefinitely after the run ends).

| Event | Effect on token |
|---|---|
| `Message/Send` | Token is minted, row is inserted with `status: "agent_queue"`, broadcast to all queue subscribers. |
| Agent starts working | Emits `agent_start` to every active subscriber. |
| Timeline block changes | Emits one `agent_timeline_delta` update with `{ messageguid, block }`; the persisted row keeps the merged ordered timeline. |
| Each SSE chunk | Emits `agent_output` to every active subscriber (with full accumulated `raw`). |
| Stream finishes | Emits `agent_end` (or `agent_error` for `"..."` / internal-error content) with final `progressGenerate` payload; the message's `status` becomes terminal. |
| Usage billed | ~250-500 ms after a successful `agent_end`, emits `agent_usage_report` with final token counts, `model`, `tokencost`, and `remainingcredits`. Not emitted for replayed usage callbacks or for turns with no chat message (cron/hook turns), which you follow on the [run stream](#following-an-agents-background-runs). |
| Bridge exception | Emits `agent_error` with sanitized string; the message's `status` becomes `agent_error`, raw error in `debugoutput`. |
| `Message/Cancel` during active stream | Bridge aborts, emits `agent_cancel`; the message's `status` becomes `agent_cancel`. |
| `Message/Cancel` while queued | The message's `status` becomes `agent_cancel` immediately. **No WebSocket event is broadcast** (the bridge never started). Clients checking via the socket must consult `Message/Detail` for queued-state cancels. |

**Multi-subscriber semantics**: multiple WebSocket connections can subscribe to the same `agenttoken` and all receive the same event stream in parallel. The server does not enforce a subscriber limit per token. This is how the Wiro Dashboard shows the same agent chat on multiple tabs for the same user: each tab opens its own socket and subscribes independently.

**Cross-user subscription**: the `agenttoken` alone authenticates subscription, so if you leak a token to another user, they can read the stream. Treat tokens like short-lived secrets scoped to the message.
