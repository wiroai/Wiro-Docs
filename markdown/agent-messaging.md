# Agent Messaging

Send messages to AI agents and receive streaming responses in real time.

## How It Works

Agent messaging follows the same async pattern as [model runs](/docs/run-a-model):

1. **Send** a message via REST → get an `agenttoken` immediately
2. **Subscribe** to [Agent WebSocket](/docs/agent-websocket) with the `agenttoken` → receive ordered `agent_timeline_delta` block updates plus provisional accumulated answer text
3. **Or poll** via the Detail endpoint to check status and fetch the completed response
4. **Or set** a `callbackurl` to receive a webhook notification when the agent finishes

This decoupled design means your application never blocks waiting for the agent to think. Send the message, hand the `agenttoken` to your frontend, and stream the response as it arrives.

### Ordered turn timeline

Every Detail or History message row returns a top-level `timeline[]`. It is the ordered, persisted record of the turn. A turn can contain multiple interleaved blocks, for example:

`Thinking → Answer or Tool → Thinking → Answer`

Each block has an opaque deterministic `blockid`, call/content ordering coordinates, `type` (`reasoning`, `answer`, or `tool`), safe public text or tool state, `phase` (`stream`, `end`, or `error`), its own monotonically increasing `version`, and timestamps. Reasoning text is a provider-supplied OpenAI GPT-5 summary, never raw hidden chain-of-thought. Tool blocks expose only `toollabel` and `toolstatus`, never a tool ID, arguments, results, or other internal execution metadata.

Live WebSocket updates arrive as `agent_timeline_delta` events carrying one public block. Merge by `blockid`, replace that block only when its incoming `version` is strictly newer, then sort by `callindex`, `contentindex`, and `blockid`. `agent_subscribed.timeline` carries the persisted reconnect snapshot. `agent_output` remains provisional cumulative SSE output until the corresponding answer block catches up; after completion or reconnect, `Message/Detail` is authoritative.

## Message Lifecycle

Every agent message progresses through a defined set of stages:

`agent_queue` → `agent_start` → `agent_output` → `agent_end`

### Message Statuses

| Status | Description |
|--------|-------------|
| `agent_queue` | The message is queued and waiting to be picked up by the agent runtime. Emitted once when the message enters the queue. |
| `agent_start` | The agent has accepted the message and begun processing. The underlying LLM call is being prepared. |
| `agent_output` | The agent is producing output. This event is emitted **multiple times** — each chunk of the response arrives as a separate `agent_output` event via WebSocket, enabling real-time streaming. |
| `agent_end` | The agent has finished generating the response. The full output is available in the `response` and `debugoutput` fields. **This is the event you should listen for** to get the final result. |
| `agent_error` | The agent encountered an error during processing. The `debugoutput` field contains the error message. |
| `agent_cancel` | The message was cancelled by the user before completion. Only messages in `agent_queue`, `agent_start`, or `agent_output` status can be cancelled. |
| `agent_done` | **Marker-only terminal status.** Used **exclusively** for `model_change` marker rows (see [Message/History](#post-useragentmessagehistory)) — never for a real user or assistant turn. Normal turns terminate at `agent_end` (or `agent_error` / `agent_cancel`). |

## **POST** /UserAgent/Message/Send

Sends a user message to a deployed agent. The agent must be in running state (status `4`). Returns immediately with an `agenttoken` that you use to track the response via WebSocket, polling, or webhook.

Accepts either `application/json` (text-only) or `multipart/form-data` (text + file attachments). When sending files, the `message` field can be empty — the agent receives the attachments and any accompanying text.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | The agent instance GUID (from Deploy or MyAgents). |
| `message` | string | Conditional | The user message text. Required unless sending files via multipart. |
| `sessionkey` | string | No | Session identifier for conversation continuity. Defaults to `"default"`. |
| `callbackurl` | string | No | Webhook URL — the system will POST the final response to this URL when the agent finishes. |
| `model` | string | No | Canonical model slug to run **this turn** on (e.g. `"openai/gpt-5.6-sol"`), chosen from the agent's selectable set. Validated server-side — an unknown or non-selectable slug is rejected in `errors[]` and the turn is **not** sent. Omit to use the agent's configured chat model. |
| `attachment` / `attachments[]` | file | No | Multipart only — one or more file attachments that the agent can process. |

> **Per-turn model selection.** `model` selects the chat model for a single turn instead of the agent's configured default. Valid values are the agent's **selectable** slugs — the `tokenRates.models[]` entries where `selectable` is `true`, returned by `UserAgent/Detail` (see [Agent Overview](/docs/agent-overview)). The current set includes `openai/gpt-5.6-sol` (the platform chat default), `openai/gpt-5.6-terra`, `openai/gpt-5.6-luna`, `openai/gpt-5.5`, `openai/gpt-5.5-pro`, `openai/gpt-5.4`, `openai/gpt-5.4-mini`, `openai/gpt-5.2`, `openai/gpt-5.1`, `openai/gpt-5`, and `openai/gpt-5-mini` — always read the live set from that field. The server forwards the chosen slug to the agent runtime as the `x-agent-model` and `x-openclaw-model` headers for that turn.

### Response

```json
{
  "result": true,
  "errors": [],
  "messageguid": "c3d4e5f6-a7b8-9012-cdef-345678901234",
  "agenttoken": "aB3xK9mR2pLqWzVn7tYhCd5sFgJkNb",
  "status": "agent_queue"
}
```

> **A successful Send response means the message was accepted and queued — not that it will definitely reach the agent.** After this response the system enqueues the job into Redis/BullMQ for the bridge to pick up. If the enqueue step itself fails (queue backpressure, Redis outage), the message row is flipped to `agent_error` server-side **after** the HTTP response was already sent with `result: true`. Always confirm the final state via `POST /UserAgent/Message/Detail` or the WebSocket stream; don't assume the message progresses to `agent_start` just because Send returned `result: true`.

> **Reserved session keys.** The platform reserves a small set of `sessionkey` prefixes for system-managed threads — `wiro:api`, `voice-prep*`, `voice-call-*`, and `cs-cron-*`. Sending a user message into one of these keys is rejected with `Reserved sessionkey` (the same guard that protects `Message/DeleteSession`). Pick any other identifier for your own threads.

| Field | Type | Description |
|-------|------|-------------|
| `messageguid` | `string` | Unique identifier for this message. Use it with Detail, History, or Cancel. |
| `agenttoken` | `string` | Token for WebSocket subscription and polling. Equivalent to `tasktoken` in model runs. |
| `status` | `string` | Initial status — always `"agent_queue"` on success. |
| `modelChangeMarker` | `object\|null` | Present **only** when this turn's `model` selects a different chat model than the session was running — i.e. it rotates the model mid-session. Shape: `{ guid, type: "model_change", fromModel, toModel, createdat }`. The platform also writes a matching marker row into history (see [Message/History](#post-useragentmessagehistory)). Absent on turns that keep the session's model. |

> **`model_change` marker.** When `model` rotates the session to a different chat model, the Send response carries a `modelChangeMarker` describing the switch, and a standalone marker row (status `agent_done`) is written into history at the same time:
>
> ```json
> "modelChangeMarker": {
>   "guid": "b2c3d4e5-f6a7-8901-bcde-f23456789012",
>   "type": "model_change",
>   "fromModel": "openai/gpt-5.4",
>   "toModel": "openai/gpt-5.5",
>   "createdat": 1714694399
> }
> ```
>
> See [`Message/History`](#post-useragentmessagehistory) for the shape and ordering of the marker row it materializes.

#### Failure responses

When `result: false`, the response shape is `{ result: false, errors: [{ code, message }], messageguid: null, agenttoken: null, status: null }`. Two branches add extra context:

| Failure branch | Extra fields | Notes |
|----------------|--------------|-------|
| Agent not running (`status` ≠ 4) | `agentstatus: <int>` | Echoes the current `useragents.status` so the caller can decide whether to wait, call `Start`, or surface "Setup Required" UI. Common codes: `0` initializing, `1` stopping, `2` starting, `3` starting (container booting — wait and retry), `5` upgrading, `6` setup required. |
| Out of credits | `agentstatus`, `agentbalance: { monthlycredits, extracredits, usedcredits, remainingcredits }` | Returned with the `Agent has no remaining credits…` error. `remainingcredits: 0` is the trigger; surface a "Renew or buy a credit pack" CTA. |

## **POST** /UserAgent/Message/Detail

Retrieves the current status and content of a single message. You can query by either `messageguid` or `agenttoken`.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `messageguid` | string | No | The message GUID returned from Send. |
| `agenttoken` | string | No | The agent token returned from Send (alternative to messageguid). |
| `sessionkey` | string | No | Optional session scope. When supplied, the row is additionally constrained to this `sessionkey`, so a shared-owner agent (one API key fronting many end users) can ensure a user only reads their own turn. Omit for the default single-user behavior. |

> **Note:** You must provide at least one of `messageguid` or `agenttoken`.

### Response

```json
{
  "result": true,
  "errors": [],
  "data": {
    "guid": "c3d4e5f6-a7b8-9012-cdef-345678901234",
    "uuid": "ada-uuid",
    "agenttoken": "aB3xK9mR2pLqWzVn7tYhCd5sFgJkNb",
    "user": {
      "uuid": "ada-uuid",
      "firstname": "Ada",
      "lastname": "Lovelace",
      "email": "ada@example.com",
      "username": "ada",
      "avatar": "https://cdn.wiro.ai/avatars/ada.webp",
      "avatarinitials": "AL"
    },
    "sessionkey": "default",
    "content": "What are the latest trends in AI?",
    "response": "Here are the key AI trends for 2026...",
    "debugoutput": "Here are the key AI trends for 2026...",
    "timeline": [
      {
        "blockid": "c0:i0",
        "callindex": 0,
        "contentindex": 0,
        "type": "reasoning",
        "text": "I’ll distinguish deployed capabilities from current research.",
        "toollabel": null,
        "toolstatus": null,
        "phase": "end",
        "version": 3,
        "startedat": 1743350401,
        "updatedat": 1743350405
      },
      {
        "blockid": "c0:i1",
        "callindex": 0,
        "contentindex": 1,
        "type": "answer",
        "text": "Here are the key AI trends for 2026...",
        "toollabel": null,
        "toolstatus": null,
        "phase": "end",
        "version": 8,
        "startedat": 1743350405,
        "updatedat": 1743350408
      }
    ],
    "status": "agent_end",
    "metadata": {
      "type": "progressGenerate",
      "task": "Generate",
      "speed": "14.2",
      "speedType": "words/s",
      "elapsedTime": "8.1s",
      "tokenCount": 105,
      "wordCount": 118,
      "raw": "Here are the key AI trends for 2026...",
      "answer": ["Here are the key AI trends for 2026..."]
    },
    "attachments": [],
    "deletestatus": 0,
    "createdat": 1743350400,
    "startedat": 1743350401,
    "endedat": 1743350408,
    "inputtokens": 3450,
    "outputtokens": 820,
    "cachereadtokens": 2400,
    "cachewritetokens": 0,
    "totaltokens": 6670,
    "model": "openai/gpt-5.6-sol",
    "tokencost": 5,
    "processedms": 4200
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `guid` | `string` | Message GUID. |
| `uuid` | `string` | The account UUID of the user who sent the message. |
| `agenttoken` | `string\|null` | The same token issued by `Message/Send` for this message. Lets callers that arrived at the row through `Message/Detail` (or `Message/History`) subscribe to the [Agent WebSocket](/docs/agent-websocket) and pick up an in-flight response — useful when a chat UI rehydrates after a reload and finds a message still in `agent_queue` / `agent_start` / `agent_output` status. Only `null` for very old rows that pre-date the column. |
| `user` | `object\|null` | Resolved sender info: `{ uuid, firstname, lastname, email, username, avatar, avatarinitials }`. Decorated server-side from `agentmessages.uuid` so the chat bubble can render avatar / hover-tooltip without an extra `User/Detail` round-trip. `null` when the row was written by automation (sentinel `uuid` like `"system"`) or when the user record was deleted. |
| `sessionkey` | `string` | The session this message belongs to. |
| `content` | `string` | The original user message. |
| `response` | `string` | The agent's full response text. Empty until `agent_end`. |
| `debugoutput` | `string` | Accumulated output text. Updated during streaming, contains the full response after completion. |
| `timeline` | `array` | Ordered turn blocks. Always an array; `[]` means no public blocks were persisted. Merge live deltas by `blockid` and per-block `version`, then sort by call/content order. |
| `status` | `string` | Current message status (see Message Lifecycle). |
| `metadata` | `object` | Parsed JSON object (API returns it already decoded). Populated from the agent bridge on `agent_end`. Fields produced by the bridge's final progress builder include `type`, `task`, `speed`, `speedType`, `elapsedTime`, `tokenCount`, `wordCount`, `raw`, and `answer`. Timeline blocks are intentionally not stored in metadata; read the top-level `timeline` field. Empty object `{}` for `agent_error`, `agent_cancel`, or when the bridge hasn't finished yet. Message status lives in the top-level `status` field — don't read it from `metadata.type`. |
| `attachments` | `array` | Always present as an array — empty `[]` for text-only messages. When the message was sent via multipart with files, each entry is a resolved `{url, name, type, size}` object (no further file-lookup needed). Identical shape in `Message/History` rows. |
| `deletestatus` | `number` | Internal flag. `0` for normal messages. |
| `createdat` | `number` | Unix timestamp (epoch seconds) when the message was created. |
| `startedat` | `number` | Unix timestamp (epoch seconds) when the agent started processing. |
| `endedat` | `number` | Unix timestamp (epoch seconds) when processing completed. May be empty for `agent_cancel` (cancel only sets `status` and `updatedat`). |
| `inputtokens` | `number\|null` | Uncached input (prompt) tokens billed at the model's input rate. Populated on the assistant turn once it completes; `null` on user-only, cron, legacy, and `model_change` marker rows. |
| `outputtokens` | `number\|null` | Billed output (completion) tokens the model generated this turn. `null` on the same non-assistant / marker / legacy rows. |
| `cachereadtokens` | `number\|null` | Tokens served from the model's prompt cache (billed at the cached-input rate). `0` when the model reported no cache hits; `null` on non-assistant rows. |
| `cachewritetokens` | `number\|null` | Tokens written to the prompt cache this turn. `0` when none; `null` on non-assistant rows. |
| `totaltokens` | `number\|null` | Exact component sum: `inputtokens + outputtokens + cachereadtokens + cachewritetokens`. `null` on non-assistant rows. |
| `model` | `string\|null` | Canonical slug of the chat model that actually ran the turn (e.g. `"openai/gpt-5.4"`), reflecting any per-turn `model` override from Send. `null` on non-assistant / marker / legacy rows. |
| `tokencost` | `number\|null` | Credits deducted for the turn, derived from the token counts and the model's `tokenRates` (see [Agent Overview](/docs/agent-overview)). `null` on non-assistant rows. |
| `processedms` | `number\|null` | Wall-clock model processing time for the turn, in milliseconds. `null` on non-assistant rows. |

### Public timeline block fields

Only the fields below are returned in browser-facing REST and WebSocket timeline blocks.

| Field | Type | Description |
|-------|------|-------------|
| `blockid` | `string` | Opaque deterministic identity for one logical block (for example `c0:i0`). Use it as the merge key; do not parse its current format. |
| `callindex` | `number` | Zero-based call order within the turn. Primary sort key. |
| `contentindex` | `number` | Zero-based content order within the call. Secondary sort key. |
| `type` | `string` | `reasoning`, `answer`, or `tool`. |
| `text` | `string\|null` | Safe public text for `reasoning` and `answer`; `null` for tool blocks. Reasoning text is an OpenAI GPT-5 provider summary, not raw chain-of-thought. |
| `toollabel` | `string\|null` | Safe display label for a tool block; `null` for reasoning and answer blocks. Arguments and results are never included. |
| `toolstatus` | `string\|null` | Safe public status for a tool block; `null` for reasoning and answer blocks. |
| `phase` | `string` | `stream`, `end`, or `error` for this block. |
| `version` | `number` | Monotonic **within this block**. Ignore a delta whose version is not strictly newer than the stored block's version. |
| `startedat` | `number\|null` | Block start timestamp when available. |
| `updatedat` | `number\|null` | Most recent block update timestamp when available. |

Do not compare `version` across different blocks. Keep a map keyed by `blockid`, apply per-block last-write-wins, and render `callindex ASC, contentindex ASC, blockid ASC`. This makes the result independent of HTTP/WebSocket arrival order.

> **`metadata.tokenCount` vs the billing token columns.** `metadata.tokenCount` is the **live stream counter** emitted inside the `progressGenerate` payload — a running word/token tally for the in-flight response. The flat `inputtokens` / `outputtokens` / `cachereadtokens` / `cachewritetokens` / `totaltokens` / `tokencost` columns are the **final billed usage**, written once the turn completes. They measure different things: use `tokenCount` for a live progress indicator, and the flat columns for accounting and cost.

## **POST** /UserAgent/Message/History

Retrieves conversation history for a specific agent and session. Messages are returned **newest-first** with cursor-based pagination.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | The agent instance GUID. |
| `sessionkey` | string | No | Session identifier. Defaults to `"default"`. |
| `limit` | number | No | Maximum number of messages to return. Defaults to `50`, max `200`. |
| `before` | string | No | Message GUID to use as cursor — returns only messages created before this one. Omit for the most recent messages. |

> **Team agents:** If the agent's `teamsessionmode` is `collaborative`, History returns messages from **all team members** in the session and their turns use one shared native agent-memory session. In `private` mode, History only returns messages sent by the caller's own `uuid` and memory stays per operator. The same visibility rule applies to `Sessions` listing.

### Response

```json
{
  "result": true,
  "errors": [],
  "data": {
    "messages": [
      {
        "guid": "c3d4e5f6-a7b8-9012-cdef-345678901234",
        "uuid": "ada-uuid",
        "agenttoken": "aB3xK9mR2pLqWzVn7tYhCd5sFgJkNb",
        "user": {
          "uuid": "ada-uuid",
          "firstname": "Ada",
          "lastname": "Lovelace",
          "email": "ada@example.com",
          "username": "ada",
          "avatar": "https://cdn.wiro.ai/avatars/ada.webp",
          "avatarinitials": "AL"
        },
        "content": "What are the latest trends in AI?",
        "response": "Here are the key AI trends for 2026...",
        "debugoutput": "Here are the key AI trends for 2026...",
        "timeline": [
          {
            "blockid": "c0:i0",
            "callindex": 0,
            "contentindex": 0,
            "type": "reasoning",
            "text": "I’ll distinguish deployed capabilities from current research.",
            "toollabel": null,
            "toolstatus": null,
            "phase": "end",
            "version": 3,
            "startedat": 1743350401,
            "updatedat": 1743350405
          }
        ],
        "status": "agent_end",
        "metadata": {
          "type": "progressGenerate",
          "task": "Generate",
          "speed": "14.2",
          "speedType": "words/s",
          "elapsedTime": "8.1s",
          "tokenCount": 105,
          "wordCount": 118,
          "raw": "Here are the key AI trends for 2026...",
          "answer": ["Here are the key AI trends for 2026..."]
        },
        "attachments": [],
        "deletestatus": 0,
        "createdat": 1743350400,
        "inputtokens": 3450,
        "outputtokens": 820,
        "cachereadtokens": 2400,
        "cachewritetokens": 0,
        "totaltokens": 6670,
        "model": "openai/gpt-5.6-sol",
        "tokencost": 5,
        "processedms": 4200
      },
      {
        "guid": "b2c3d4e5-f6a7-8901-bcde-f23456789012",
        "uuid": "system",
        "agenttoken": null,
        "user": null,
        "content": "",
        "response": "",
        "debugoutput": "",
        "timeline": [],
        "status": "agent_done",
        "metadata": {
          "type": "model_change",
          "fromModel": "openai/gpt-5.2",
          "toModel": "openai/gpt-5.4"
        },
        "attachments": [],
        "deletestatus": 0,
        "createdat": 1743350399,
        "inputtokens": null,
        "outputtokens": null,
        "cachereadtokens": null,
        "cachewritetokens": null,
        "totaltokens": null,
        "model": null,
        "tokencost": null,
        "processedms": null
      },
      {
        "guid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "uuid": "ada-uuid",
        "agenttoken": "tQ4nL8vY1zMkRpWdH7cXjBg6sFhPmA",
        "user": {
          "uuid": "ada-uuid",
          "firstname": "Ada",
          "lastname": "Lovelace",
          "email": "ada@example.com",
          "username": "ada",
          "avatar": "https://cdn.wiro.ai/avatars/ada.webp",
          "avatarinitials": "AL"
        },
        "content": "Tell me more about multimodal models",
        "response": "Multimodal models combine...",
        "debugoutput": "Multimodal models combine...",
        "timeline": [],
        "status": "agent_end",
        "metadata": {},
        "attachments": [],
        "deletestatus": 0,
        "createdat": 1743350300,
        "inputtokens": 1180,
        "outputtokens": 540,
        "cachereadtokens": 0,
        "cachewritetokens": 0,
        "totaltokens": 1720,
        "model": "openai/gpt-5.2",
        "tokencost": 3,
        "processedms": 3100
      }
    ],
    "count": 3,
    "hasmore": false
  }
}
```

> Each message row carries `uuid` (sender) and a server-decorated `user` object with the full sender shape — same as `Message/Detail`. `user` is `null` for system-inserted rows (e.g. `Message/SystemInsert` writes when `uuid` is `"system"`) or when the underlying account has been deleted.

> **Resuming an in-flight stream.** Every row carries the original `agenttoken` from `Message/Send`. If a returned message's `status` is non-terminal (`agent_queue`, `agent_start`, or `agent_output`), the agent is still processing it server-side. Hand the `agenttoken` to the [Agent WebSocket](/docs/agent-websocket) (`agent_info` frame) and you'll receive the persisted `agent_subscribed.timeline` snapshot, subsequent `agent_timeline_delta` block updates, remaining provisional `agent_output` snapshots, and the eventual `agent_end` event — no need to re-send the message.

| Field | Type | Description |
|-------|------|-------------|
| `messages` | `array` | Array of message objects, newest first. Each row has the **same shape as `Message/Detail`** — including persisted `timeline`, the `uuid` sender, the `agenttoken` (so you can resubscribe over WebSocket if `status` is non-terminal), the decorated `user` object, and the per-turn token columns below. The array can also include `model_change` marker rows (see the note under the table). |
| `count` | `number` | Number of messages in this page. |
| `hasmore` | `boolean` | `true` if there are older messages available. Pass the last message's `guid` as `before` to fetch the next page. |

Each assistant row also carries the per-turn token-accounting columns, identical to [`Message/Detail`](#post-useragentmessagedetail):

| Field | Type | Description |
|-------|------|-------------|
| `inputtokens` | `number\|null` | Uncached input (prompt) tokens billed at the model's input rate. `null` on user-only, cron, legacy, and `model_change` marker rows. |
| `outputtokens` | `number\|null` | Billed output (completion) tokens the model generated. `null` on the same non-assistant / marker / legacy rows. |
| `cachereadtokens` | `number\|null` | Tokens served from the model's prompt cache. `0` when none; `null` on non-assistant rows. |
| `cachewritetokens` | `number\|null` | Tokens written to the prompt cache. `0` when none; `null` on non-assistant rows. |
| `totaltokens` | `number\|null` | Exact component sum: `inputtokens + outputtokens + cachereadtokens + cachewritetokens`. `null` on non-assistant rows. |
| `model` | `string\|null` | Canonical slug of the chat model that ran the turn. `null` on non-assistant / marker / legacy rows. |
| `tokencost` | `number\|null` | Credits deducted for the turn. `null` on non-assistant rows. |
| `processedms` | `number\|null` | Wall-clock model processing time in milliseconds. `null` on non-assistant rows. |

> **`model_change` marker rows.** Switching the chat model (via the [`model`](#post-useragentmessagesend) param) drops a synthetic marker row into history alongside the real turns. A marker row has `status: "agent_done"`, `model: null`, empty `content` / `response` / `debugoutput`, every token column `null`, and `metadata: { "type": "model_change", "fromModel": "…", "toModel": "…" }`. Detect it with `metadata.type === "model_change"` and render it as an inline separator (e.g. "Switched to GPT-5.4") rather than a chat bubble. Its `createdat` is the triggering turn's `createdat` minus one second, so it orders immediately before that turn (in the newest-first response it appears directly after the turn that triggered it).

### Pagination

To paginate through a long conversation:

**Page 1** — most recent messages:

```json
{
  "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
  "sessionkey": "default",
  "limit": 50
}
```

**Page 2** — pass the **last** (oldest, smallest `createdat`) message's `guid` from page 1 as the `before` cursor:

```json
{
  "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
  "sessionkey": "default",
  "limit": 50,
  "before": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

## **POST** /UserAgent/Message/Sessions

Lists all conversation sessions for an agent. Returns each session's key, message count, last activity time, and the most recent message content. Sorted newest-first by `updatedat`.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | The agent instance GUID. |

### Response

```json
{
  "result": true,
  "errors": [],
  "data": {
    "sessions": [
      {
        "sessionkey": "default",
        "messagecount": 24,
        "updatedat": 1743350400,
        "lastmessage": "What are the latest trends in AI?"
      },
      {
        "sessionkey": "user-42-support",
        "messagecount": 8,
        "updatedat": 1743349200,
        "lastmessage": "How do I reset my password?",
        "name": "Password help"
      },
      {
        "sessionkey": "user-99-draft",
        "messagecount": 0,
        "updatedat": 1743348000,
        "lastmessage": "",
        "name": "New chat"
      }
    ]
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `sessionkey` | `string` | The session identifier. |
| `messagecount` | `number` | Total number of messages in this session. |
| `updatedat` | `number` | Unix timestamp (epoch seconds) of the last activity in this session. |
| `lastmessage` | `string` | The most recent message body — `useragentmessages.content` if the user sent a message, falling back to `useragentmessages.response` (assistant reply) when `content` is empty. |
| `name` | `string?` | Optional display name set via [`Message/RenameSession`](#post-useragentmessagerenamesession). Omitted when the session was never named — fall back to your own default label (e.g. the `sessionkey` or "New chat"). |

> **Named-but-empty sessions appear too.** A session created by [`RenameSession`](#post-useragentmessagerenamesession) before its first `Message/Send` surfaces here with `messagecount: 0`, `lastmessage: ""`, and the `name` you set — so a freshly created chat shows up in the list immediately.

> **Reserved sessionkeys filtered out (non-admin only).** The list omits internal sessions used by the runtime: `wiro:api` (gateway hooks default), `voice-prep*` (per-call prep threads), `voice-call-*` (active voice-call rows), and `cs-cron-*` (one thread per scheduled cron skill). These rows still exist on the agent — they're just hidden from operator-facing listings to keep the panel UX clean. Admin callers (`tokenUserRoles` contains `"ADMIN"`) see the full unfiltered list. The same filter is applied on `Message/History` reads and the `DeleteSession` guard.

> **Marker rows excluded.** `model_change` marker rows are not real turns — they're skipped when building this list, so they never surface as a session's `lastmessage`.

## **POST** /UserAgent/Message/DeleteSession

Deletes messages in the given session for the **calling user**. This action cannot be undone.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | The agent instance GUID. |
| `sessionkey` | string | Yes | The session key to delete. |
| `rotate` | boolean | No | Default `false`. When `true`, after wiping the rows the server also rotates the session's memory bucket so the agent's container **forgets** the cleared turns — the next `Message/Send` on the same `sessionkey` starts a fresh reasoning context. With `false` (or omitted) the message rows are wiped but the running container may still recall them. Any display `name` set via [`RenameSession`](#post-useragentmessagerenamesession) is dropped on delete. |

> **Scope of deletion:** Hard delete — the API issues `DELETE FROM useragentmessages WHERE useragentid = … AND sessionkey = …`. For non-admin callers an additional `AND uuid = <caller_uuid>` filter is appended, so only the caller's own rows in the session are purged. This holds in both private and collaborative team modes — even when `teamsessionmode: "collaborative"` (e.g. Telegram group-shared sessions) means every member sees the same thread, each member's `DeleteSession` only wipes their own contributions. Admin callers (`tokenUserRoles` contains `"ADMIN"`) bypass the uuid filter and wipe the entire session for every participant. Compare with `Message/Delete` (per-message), which is a soft-delete bumping the `deletestatus` bitmask.

> **Reserved sessionkeys (non-admin callers).** Wiro-API maintains a handful of internal threads keyed under reserved sessionkeys — `voice-prep` and `voice-prep-<sid>` (per-call prep), `voice-call-<sid>` (voice-call bubble rows), `cs-cron-<slug>` (one thread per scheduled cron skill), and `wiro:api` (gateway hooks default). Non-admin callers passing any of these as `sessionkey` get back `"Session not found"` instead of a delete; the response shape is identical to a missing-session result so there's no information leak about what threads exist. Admin (`tokenUserRoles` contains `"ADMIN"`) bypasses this guard. The same guard also covers `Message/History` reads, so `Sessions` already filters these keys out of the operator's session list — you only encounter the reserved-key error if you hand-craft the body with a known internal key.

### Response

```json
{
  "result": true,
  "errors": []
}
```

## **POST** /UserAgent/Message/RenameSession

Sets a human-readable display **name** on a session without touching its messages or its `sessionkey`. The name is stored in a separate overlay keyed by `(useragentguid, sessionkey)` and surfaces on [`Message/Sessions`](#post-useragentmessagesessions). Because the `sessionkey` is unchanged, the agent's conversation memory is fully preserved across a rename.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | The agent instance GUID. |
| `sessionkey` | string | Yes | The session to name. Reserved system keys (`wiro:api`, `voice-prep*`, `voice-call-*`, `cs-cron-*`) are rejected with `"Session not found"` for non-admin callers, same as `DeleteSession`. |
| `name` | string | Yes | The display name. The server strips control characters, collapses whitespace, trims, and caps the result at **40 characters**. An empty string after sanitization is rejected with `request-parameter-required`. |

> **Doubles as "create a named session".** Calling `RenameSession` with a brand-new `sessionkey` — before any `Message/Send` on it — seeds a named-but-empty session that immediately appears in [`Message/Sessions`](#post-useragentmessagesessions) with `messagecount: 0` and `lastmessage: ""`. This is the canonical way to let a user open a fresh, titled chat before they type anything.

### Request

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Message/RenameSession" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "sessionkey": "user-42-support",
    "name": "Password help"
  }'
```

### Response

```json
{
  "result": true,
  "errors": []
}
```

## **POST** /UserAgent/Message/Delete

Bulk-deletes one or more messages from a session, with **per-side soft-delete** semantics. Each item lets you choose whether to hide the user side of the bubble, the agent side, or both — supporting "delete just my message" / "delete only the response" / "delete the whole bubble" UX without losing the underlying record.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | The agent instance GUID. |
| `items` | array | Yes | One or more `{ messageguid, side }` rows. |

Each item:

| Field | Type | Description |
|-------|------|-------------|
| `messageguid` | string | The message to delete. Must belong to the agent identified by `useragentguid`. |
| `side` | string | One of `"user"`, `"agent"`, or `"both"`. Maps to a bitmask OR'd into the row's `deletestatus` column: `user → 1`, `agent → 3`, `both → 3`. **`agent` and `both` both produce `3`** (full hide on both sides) — there is no `side` value that hides only the agent's view while keeping the row visible to the user. |

> **Soft delete, not hard delete.** Rows are kept in the database with the `deletestatus` flag set so the audit trail (and the admin xyz audit page with `includeDeleted: true`) can still see them. `Message/History` filters them out using **`deletestatus = 0`** — i.e. a row is hidden the moment any bit is set, regardless of which side flagged it. To wipe a whole session hard-and-fast (no soft-delete trail), use [`Message/DeleteSession`](#post-useragentmessagedeletesession) instead.

### Request

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Message/Delete" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "items": [
      { "messageguid": "c3d4e5f6-...", "side": "user" },
      { "messageguid": "d4e5f6a7-...", "side": "agent" },
      { "messageguid": "e5f6a7b8-...", "side": "both" }
    ]
  }'
```

### Response

```json
{ "result": true, "errors": [] }
```

The endpoint is best-effort across the items array — invalid `messageguid` rows or invalid `side` values are silently skipped. The call returns `result: true` even when zero rows were updated, so callers should refetch `Message/History` to confirm the new state.

## **POST** /UserAgent/Message/Cancel

Cancels an in-progress message. Only messages in `agent_queue`, `agent_start`, or `agent_output` status can be cancelled. Messages that have already reached `agent_end`, `agent_error`, or `agent_cancel` cannot be cancelled.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `messageguid` | string | No | The message GUID to cancel. |
| `agenttoken` | string | No | The agent token to cancel (alternative to messageguid). |
| `sessionkey` | string | No | Optional session scope. When supplied, the cancel only matches a row in this `sessionkey` — useful for shared-owner agents so one end user can't cancel another's in-flight turn. Omit for the default single-user behavior. |

> **Note:** You must provide at least one of `messageguid` or `agenttoken`.

### Response

```json
{
  "result": true,
  "errors": []
}
```

On success, the message status changes to `agent_cancel` in the database.

> **Behavior depends on when the cancel hits:**
>
> - If the message was **already being processed** by the agent bridge (status `agent_start` or `agent_output`), the bridge's abort handler fires: subscribed WebSocket clients receive an `agent_cancel` event, `debugoutput` / `response` are populated with the abort reason (typically `"AbortError"` or similar technical message — not guaranteed to be a fixed user-facing string), and the `callbackurl` webhook (if set) is triggered with `status: "agent_cancel"`.
> - If the message was **still queued** (status `agent_queue`) when cancelled, no processing attempt had started: the row is marked `agent_cancel` but `response` and `debugoutput` remain empty strings, **no WebSocket `agent_cancel` event** is broadcast, and **no webhook** is triggered.
>
> When polling for the final state, check `status === "agent_cancel"` rather than relying on non-empty `response` / `debugoutput` (they may be empty for queued-state cancellations).

## **POST** /UserAgent/Message/SystemInsert

Inserts a finished "system" message into the conversation history without running it through the agent. Used by the agent runtime, scheduled cron skills, and external chat-platform bridges (Telegram bot, Slack relay, push-notification webhooks) to drop a pre-rendered message into a session as if the agent had produced it. The endpoint **never** triggers a model call — the supplied `content` is written verbatim to `agentmessages.response` with `status: "agent_end"` and `metadata: {"type":"system"}`.

> **Runtime-only auth.** This endpoint is reserved for the Wiro-managed agent runtime and the platform bridges Wiro ships (Telegram / Slack / cron). API users normally use [`Message/Send`](#post-useragentmessagesend) instead, which goes through the standard auth flow + queue + model call path.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | The target useragent guid. |
| `uuid` | string | Yes | The useragent owner uuid. Must match the row stored in `useragents.uuid` for `useragentguid`. |
| `content` | string | Yes | The message body to insert. Stored verbatim in `response` and `debugoutput`. |
| `sessionkey` | string | No | Conversation thread the message belongs to. Defaults to `"auto"` — the endpoint resolves it to the most recent session for this useragent (falls back to `"default"` for empty histories). Pass an explicit value to insert into a specific named session. |
| `metadata` | object \| string | No | Custom metadata payload to write on the row. Accepts either a JSON object or a JSON-encoded string; invalid JSON falls back to the default `{"type":"system"}`. No schema allowlist is applied — the value is stored verbatim. Used by the realtime voice bridge to seed `{"type":"realtime_session_incoming", "callsid", "callerInfo", "startedAt", "transcript":[]}` rows. |

### Response

```json
{
  "result": true,
  "messageguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
  "sessionkey": "default",
  "agenttoken": "aB3xK9mR2pLqWzVn7tYhCd5sFgJkNb",
  "errors": []
}
```

- `messageguid` is the inserted row's guid — use it to address the message later via `Message/Detail` or to thread replies.
- `sessionkey` echoes the resolved session (matters when the caller passed `"auto"` or omitted the field).
- `agenttoken` is the per-message agent token. The realtime voice bridge subscribes to this token over the [Agent WebSocket](/docs/agent-websocket) to receive POSTCALL hand-off events on the same row.
- The inserted row carries `status: "agent_end"` (or `metadata.type: "system"` by default) so the chat UI renders it as a non-interactive system bubble (no retry / cancel affordances).

## Session Management

Sessions let you maintain separate conversation threads with the same agent:

- Each `sessionkey` represents a separate conversation — the agent remembers context within a session
- The default session key is `"default"` if you don't specify one
- Use unique session keys per end-user for multi-tenant applications (e.g. `"user-42"`, `"customer-abc"`)
- Sessions persist across API calls — send the same `sessionkey` to continue a conversation
- Delete a session with `/UserAgent/Message/DeleteSession` to clear history and free resources

User A's conversation:

```json
{
  "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
  "message": "Hello!",
  "sessionkey": "user-alice"
}
```

User B's separate conversation with the same agent:

```json
{
  "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
  "message": "Hello!",
  "sessionkey": "user-bob"
}
```

## Multiple blocks in one turn

A single turn is not limited to one reasoning disclosure followed by one answer. The authoritative timeline can move through multiple calls:

```text
call 0 / content 0: reasoning  → Thinking
call 0 / content 1: answer     → Initial answer text
call 0 / content 2: tool       → Safe tool label/status
call 1 / content 0: reasoning  → Thinking again
call 1 / content 1: answer     → Final answer text
```

Render each reasoning block as its own accessible `Thinking` disclosure at its timeline position. Never combine reasoning blocks across calls, and never move them above or below answer/tool blocks to force an answer-first layout. Every reasoning block contains only the provider-supplied OpenAI GPT-5 summary; raw chain-of-thought is never returned. `agent_output` is still useful for immediate accumulated answer typing, but it does not define the durable block order.

## Tracking a Message

There are three ways to track message progress after sending:

### 1. WebSocket (Recommended)

Connect to WebSocket and subscribe with the `agenttoken` for real-time streaming. Each `agent_output` event delivers the growing response as it's generated.

**1. Subscribe to agent message updates:**

```json
{
  "type": "agent_info",
  "agenttoken": "aB3xK9mR2pLqWzVn7tYhCd5sFgJkNb"
}
```

**2. Server confirms subscription with current status:**

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

**3. Timeline block delta** (emitted once per changed block):

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
      "text": "I’ll compare verified releases and adoption data.",
      "toollabel": null,
      "toolstatus": null,
      "phase": "stream",
      "version": 2,
      "startedat": 1743350401,
      "updatedat": 1743350403
    }
  },
  "result": true
}
```

Merge `message.block` by `blockid` and accept it only when its `version` is strictly newer than the stored version of that block.

**4. Provisional streaming output event** (emitted multiple times — replace your typing surface with `message.raw` on each event):

```json
{
  "type": "agent_output",
  "agenttoken": "aB3xK9mR2pLqWzVn7tYhCd5sFgJkNb",
  "message": {
    "type": "progressGenerate",
    "task": "Generate",
    "speed": "12.4",
    "speedType": "words/s",
    "elapsedTime": "3.2s",
    "tokenCount": 156,
    "wordCount": 42,
    "raw": "Here are the key AI trends...",
    "answer": ["Here are the key AI trends..."]
  },
  "result": true
}
```

**5. Final answer event** (`agent_end`):

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
    "tokenCount": 412,
    "wordCount": 115,
    "raw": "Here are the key AI trends for 2026...",
    "answer": ["Here are the key AI trends for 2026..."]
  },
  "result": true
}
```

| Field | Type | Description |
|-------|------|-------------|
| `message.type` | `string` | Always `"progressGenerate"` for agent output events. |
| `message.speed` | `string` | Generation speed (e.g. `"12.4"`). |
| `message.speedType` | `string` | Unit for speed — `"words/s"` (words per second). |
| `message.elapsedTime` | `string` | Elapsed time since generation started (e.g. `"3.2s"`). |
| `message.tokenCount` | `number` | Number of answer chunks received so far. Final model tokens arrive separately in `agent_usage_report`. |
| `message.wordCount` | `number` | Number of words generated so far. |
| `message.raw` | `string` | Full accumulated raw output text. |
| `message.answer` | `string[]` | Array of answer blocks — the content to display. |

### 2. Polling via Detail

If you don't need real-time streaming, poll `POST /UserAgent/Message/Detail` at regular intervals until the status reaches a terminal state (`agent_end`, `agent_error`, or `agent_cancel`):

```
POST /UserAgent/Message/Detail { "agenttoken": "aB3xK9mR2pLqWzVn7tYhCd5sFgJkNb" }
→ Check status field
→ If "agent_end": read response/debugoutput
→ If "agent_output": still generating, poll again
→ If "agent_error"/"agent_cancel": handle accordingly
```

### 3. Webhook Callback

Pass a `callbackurl` when sending the message. The system will POST the final result to your URL when the agent finishes (up to 3 retry attempts):

```json
{
  "messageguid": "c3d4e5f6-a7b8-9012-cdef-345678901234",
  "status": "agent_end",
  "content": "What are the latest trends in AI?",
  "response": "Here are the key AI trends for 2026...",
  "debugoutput": "Here are the key AI trends for 2026...",
  "metadata": {
    "type": "progressGenerate",
    "task": "Generate",
    "speed": "14.2",
    "speedType": "words/s",
    "elapsedTime": "8.1s",
    "tokenCount": 105,
    "wordCount": 118,
    "raw": "Here are the key AI trends for 2026...",
    "answer": ["Here are the key AI trends for 2026..."]
  },
  "endedat": 1743350408
}
```

> Payload delivered to your `callbackurl`. `metadata` is decoded into a JSON object. The webhook remains answer-focused and does not embed timeline blocks; call `Message/Detail` with `messageguid` for the authoritative persisted `timeline[]`.

## Code Examples

### curl (Send Message)

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Message/Send" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "message": "What are the latest trends in AI?",
    "sessionkey": "user-42"
  }'
```

### curl (Detail)

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Message/Detail" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{"agenttoken": "aB3xK9mR2pLqWzVn7tYhCd5sFgJkNb"}'
```

### curl (History)

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Message/History" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "sessionkey": "user-42",
    "limit": 50
  }'
```

### curl (Sessions / DeleteSession / Cancel)

```bash
# List sessions
curl -X POST "https://api.wiro.ai/v1/UserAgent/Message/Sessions" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{"useragentguid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"}'

# Delete a session
curl -X POST "https://api.wiro.ai/v1/UserAgent/Message/DeleteSession" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "sessionkey": "user-42"
  }'

# Cancel an in-progress message
curl -X POST "https://api.wiro.ai/v1/UserAgent/Message/Cancel" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{"agenttoken": "aB3xK9mR2pLqWzVn7tYhCd5sFgJkNb"}'
```

### Python

```python
import requests
import time

headers = {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
}

agent_guid = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"

# Send a message
send_resp = requests.post(
    "https://api.wiro.ai/v1/UserAgent/Message/Send",
    headers=headers,
    json={
        "useragentguid": agent_guid,
        "message": "What are the latest trends in AI?",
        "sessionkey": "user-42"
    }
)
send_data = send_resp.json()
agent_token = send_data["agenttoken"]
message_guid = send_data["messageguid"]
print(f"Message queued: {message_guid}")

# Poll until completion
while True:
    detail_resp = requests.post(
        "https://api.wiro.ai/v1/UserAgent/Message/Detail",
        headers=headers,
        json={"agenttoken": agent_token}
    )
    msg = detail_resp.json()["data"]
    status = msg["status"]
    print(f"Status: {status}")

    if status == "agent_end":
        print("Response:", msg["response"])
        break
    elif status in ("agent_error", "agent_cancel"):
        print("Failed or cancelled:", msg["debugoutput"])
        break

    time.sleep(2)

# Get conversation history
history_resp = requests.post(
    "https://api.wiro.ai/v1/UserAgent/Message/History",
    headers=headers,
    json={"useragentguid": agent_guid, "sessionkey": "user-42", "limit": 50}
)
messages = history_resp.json()["data"]["messages"]
for m in messages:
    print(f"[{m['status']}] {m['content'][:60]}...")

# List sessions
sessions_resp = requests.post(
    "https://api.wiro.ai/v1/UserAgent/Message/Sessions",
    headers=headers,
    json={"useragentguid": agent_guid}
)
for s in sessions_resp.json()["data"]["sessions"]:
    print(f"Session: {s['sessionkey']} ({s['messagecount']} messages)")

# Cancel an in-progress message
requests.post(
    "https://api.wiro.ai/v1/UserAgent/Message/Cancel",
    headers=headers,
    json={"agenttoken": agent_token}
)
```

### Node.js

```javascript
const axios = require('axios');

const headers = {
  'x-api-key': 'YOUR_API_KEY',
  'Content-Type': 'application/json'
};

const agentGuid = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

async function sendAndPoll() {
  // Send a message
  const sendResp = await axios.post(
    'https://api.wiro.ai/v1/UserAgent/Message/Send',
    {
      useragentguid: agentGuid,
      message: 'What are the latest trends in AI?',
      sessionkey: 'user-42'
    },
    { headers }
  );

  const { agenttoken, messageguid } = sendResp.data;
  console.log('Message queued:', messageguid);

  // Poll until completion
  while (true) {
    const detailResp = await axios.post(
      'https://api.wiro.ai/v1/UserAgent/Message/Detail',
      { agenttoken },
      { headers }
    );
    const { status, response, debugoutput } = detailResp.data.data;
    console.log('Status:', status);

    if (status === 'agent_end') {
      console.log('Response:', response);
      break;
    }
    if (status === 'agent_error' || status === 'agent_cancel') {
      console.log('Failed or cancelled:', debugoutput);
      break;
    }

    await new Promise(r => setTimeout(r, 2000));
  }
}

async function getHistory() {
  const resp = await axios.post(
    'https://api.wiro.ai/v1/UserAgent/Message/History',
    { useragentguid: agentGuid, sessionkey: 'user-42', limit: 50 },
    { headers }
  );
  const { messages, hasmore } = resp.data.data;
  messages.forEach(m => console.log(`[${m.status}] ${m.content.slice(0, 60)}...`));
  if (hasmore) console.log('More messages available — use "before" cursor to paginate');
}

async function manageSessions() {
  // List sessions
  const sessResp = await axios.post(
    'https://api.wiro.ai/v1/UserAgent/Message/Sessions',
    { useragentguid: agentGuid },
    { headers }
  );
  sessResp.data.data.sessions.forEach(s =>
    console.log(`Session: ${s.sessionkey} (${s.messagecount} messages)`)
  );

  // Delete a session
  await axios.post(
    'https://api.wiro.ai/v1/UserAgent/Message/DeleteSession',
    { useragentguid: agentGuid, sessionkey: 'old-session' },
    { headers }
  );
}

// Cancel an in-progress message
async function cancelMessage(agenttoken) {
  await axios.post(
    'https://api.wiro.ai/v1/UserAgent/Message/Cancel',
    { agenttoken },
    { headers }
  );
}
```

### PHP

```php
<?php
$headers = [
    "Content-Type: application/json",
    "x-api-key: YOUR_API_KEY"
];

$agentGuid = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

// Send a message
$ch = curl_init("https://api.wiro.ai/v1/UserAgent/Message/Send");
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
    "useragentguid" => $agentGuid,
    "message" => "What are the latest trends in AI?",
    "sessionkey" => "user-42"
]));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$response = json_decode(curl_exec($ch), true);
curl_close($ch);

$agentToken = $response["agenttoken"];

// Poll for result
do {
    sleep(2);
    $ch = curl_init("https://api.wiro.ai/v1/UserAgent/Message/Detail");
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(["agenttoken" => $agentToken]));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    $detail = json_decode(curl_exec($ch), true);
    curl_close($ch);

    $status = $detail["data"]["status"];
} while (!in_array($status, ["agent_end", "agent_error", "agent_cancel"]));

echo $detail["data"]["response"];
```

### C#

```csharp
using var client = new HttpClient();
client.DefaultRequestHeaders.Add("x-api-key", "YOUR_API_KEY");

var agentGuid = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

// Send a message
var sendContent = new StringContent(
    JsonSerializer.Serialize(new {
        useragentguid = agentGuid,
        message = "What are the latest trends in AI?",
        sessionkey = "user-42"
    }),
    Encoding.UTF8, "application/json");

var sendResponse = await client.PostAsync(
    "https://api.wiro.ai/v1/UserAgent/Message/Send", sendContent);
var sendResult = JsonSerializer.Deserialize<JsonElement>(
    await sendResponse.Content.ReadAsStringAsync());
var agentToken = sendResult.GetProperty("agenttoken").GetString();

// Poll for result
while (true) {
    await Task.Delay(2000);
    var detailContent = new StringContent(
        JsonSerializer.Serialize(new { agenttoken = agentToken }),
        Encoding.UTF8, "application/json");
    var detailResponse = await client.PostAsync(
        "https://api.wiro.ai/v1/UserAgent/Message/Detail", detailContent);
    var detail = JsonSerializer.Deserialize<JsonElement>(
        await detailResponse.Content.ReadAsStringAsync());
    var status = detail.GetProperty("data").GetProperty("status").GetString();

    if (status == "agent_end") {
        Console.WriteLine(detail.GetProperty("data").GetProperty("response").GetString());
        break;
    }
    if (status is "agent_error" or "agent_cancel") break;
}
```

### Go

```go
package main

import (
    "bytes"
    "encoding/json"
    "fmt"
    "io"
    "net/http"
    "time"
)

func main() {
    agentGuid := "a1b2c3d4-e5f6-7890-abcd-ef1234567890"

    // Send a message
    sendBody, _ := json.Marshal(map[string]string{
        "useragentguid": agentGuid,
        "message":       "What are the latest trends in AI?",
        "sessionkey":    "user-42",
    })
    req, _ := http.NewRequest("POST",
        "https://api.wiro.ai/v1/UserAgent/Message/Send",
        bytes.NewBuffer(sendBody))
    req.Header.Set("Content-Type", "application/json")
    req.Header.Set("x-api-key", "YOUR_API_KEY")

    resp, _ := http.DefaultClient.Do(req)
    defer resp.Body.Close()
    var sendResult map[string]interface{}
    json.NewDecoder(resp.Body).Decode(&sendResult)
    agentToken := sendResult["agenttoken"].(string)

    // Poll for result
    for {
        time.Sleep(2 * time.Second)
        detailBody, _ := json.Marshal(map[string]string{
            "agenttoken": agentToken,
        })
        req, _ := http.NewRequest("POST",
            "https://api.wiro.ai/v1/UserAgent/Message/Detail",
            bytes.NewBuffer(detailBody))
        req.Header.Set("Content-Type", "application/json")
        req.Header.Set("x-api-key", "YOUR_API_KEY")

        resp, _ := http.DefaultClient.Do(req)
        body, _ := io.ReadAll(resp.Body)
        resp.Body.Close()

        var detail map[string]interface{}
        json.Unmarshal(body, &detail)
        data := detail["data"].(map[string]interface{})
        status := data["status"].(string)

        if status == "agent_end" {
            fmt.Println(data["response"])
            break
        }
        if status == "agent_error" || status == "agent_cancel" {
            fmt.Println("Failed:", data["debugoutput"])
            break
        }
    }
}
```
