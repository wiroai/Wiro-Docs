# Agent Messaging

Send messages to AI agents and receive streaming responses in real time.

## How It Works

Agent messaging follows the same async pattern as [model runs](/docs/run-a-model):

1. **Send** a message via REST → get an `agenttoken` immediately
2. **Subscribe** to [Agent WebSocket](/docs/agent-websocket) with the `agenttoken` → receive streaming response chunks
3. **Or poll** via the Detail endpoint to check status and fetch the completed response
4. **Or set** a `callbackurl` to receive a webhook notification when the agent finishes

This decoupled design means your application never blocks waiting for the agent to think. Send the message, hand the `agenttoken` to your frontend, and stream the response as it arrives.

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
| `model` | string | No | Canonical model slug to run **this turn** on (e.g. `"openai/gpt-5.4"`), chosen from the agent's selectable set. Validated server-side — an unknown or non-selectable slug is rejected in `errors[]` and the turn is **not** sent. Omit to use the agent's configured chat model. |
| `attachment` / `attachments[]` | file | No | Multipart only — one or more file attachments that the agent can process. |

> **Per-turn model selection.** `model` selects the chat model for a single turn instead of the agent's configured default. Valid values are the agent's **selectable** slugs — the `tokenRates.models[]` entries where `selectable` is `true`, returned by `UserAgent/Detail` (see [Agent Overview](/docs/agent-overview)). The selectable slugs are `openai/gpt-5.4`, `openai/gpt-5.4-mini`, `openai/gpt-5.5`, `openai/gpt-5.5-pro`, `openai/gpt-5.2`, `openai/gpt-5.1`, `openai/gpt-5`, and `openai/gpt-5-mini` — read the live set from that field. The server forwards the chosen slug to the agent runtime as the `x-agent-model` and `x-openclaw-model` headers for that turn.

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
      "thinking": [],
      "answer": ["Here are the key AI trends for 2026..."],
      "isThinking": false
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
    "totaltokens": 4270,
    "model": "openai/gpt-5.4",
    "tokencost": 6,
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
| `status` | `string` | Current message status (see Message Lifecycle). |
| `metadata` | `object` | Parsed JSON object (API returns it already decoded). Populated from the agent bridge on `agent_end`. Fields produced by the bridge's `finalMessage` builder: `type` — always the literal `"progressGenerate"` (not the message status); `task` — always the literal `"Generate"`; `speed` — numeric words-per-second value (e.g. `14.2`); `speedType` — always `"words/s"`; `elapsedTime` — human string with unit, e.g. `"8.1s"` (NOT a number); `tokenCount`, `wordCount` — integers; `raw` — the full accumulated response text; `thinking` — array of reasoning blocks extracted from `<think>...</think>`; `answer` — array of answer chunks stripped of `<think>`; `isThinking` — always `false` in the final payload. Empty object `{}` for `agent_error`, `agent_cancel`, or when the bridge hasn't finished yet. Message status lives in the top-level `status` field — don't read it from `metadata.type`. |
| `attachments` | `array` | Always present as an array — empty `[]` for text-only messages. When the message was sent via multipart with files, each entry is a resolved `{url, name, type, size}` object (no further file-lookup needed). Identical shape in `Message/History` rows. |
| `deletestatus` | `number` | Internal flag. `0` for normal messages. |
| `createdat` | `number` | Unix timestamp (epoch seconds) when the message was created. |
| `startedat` | `number` | Unix timestamp (epoch seconds) when the agent started processing. |
| `endedat` | `number` | Unix timestamp (epoch seconds) when processing completed. May be empty for `agent_cancel` (cancel only sets `status` and `updatedat`). |
| `inputtokens` | `number\|null` | Billed input (prompt) tokens for this turn's model call. Populated on the assistant turn once it completes; `null` on user-only, cron, legacy, and `model_change` marker rows. |
| `outputtokens` | `number\|null` | Billed output (completion) tokens the model generated this turn. `null` on the same non-assistant / marker / legacy rows. |
| `cachereadtokens` | `number\|null` | Tokens served from the model's prompt cache (billed at the cached-input rate). `0` when the model reported no cache hits; `null` on non-assistant rows. |
| `cachewritetokens` | `number\|null` | Tokens written to the prompt cache this turn. `0` when none; `null` on non-assistant rows. |
| `totaltokens` | `number\|null` | Total tokens attributed to the turn. `null` on non-assistant rows. |
| `model` | `string\|null` | Canonical slug of the chat model that actually ran the turn (e.g. `"openai/gpt-5.4"`), reflecting any per-turn `model` override from Send. `null` on non-assistant / marker / legacy rows. |
| `tokencost` | `number\|null` | Credits deducted for the turn, derived from the token counts and the model's `tokenRates` (see [Agent Overview](/docs/agent-overview)). `null` on non-assistant rows. |
| `processedms` | `number\|null` | Wall-clock model processing time for the turn, in milliseconds. `null` on non-assistant rows. |

> **`metadata.tokenCount` vs the billing token columns.** `metadata.tokenCount` is the **live stream counter** emitted inside the `progressGenerate` payload — a running word/token tally for the in-flight response. The flat `inputtokens` / `outputtokens` / `cachereadtokens` / `cachewritetokens` / `totaltokens` / `tokencost` columns are the **final billed usage**, written once the turn completes. They measure different things: use `tokenCount` for a live progress indicator, and the flat columns for accounting and cost.

## **POST** /UserAgent/Message/History

Retrieves conversation history for a specific agent and session. Messages are returned **newest-first** with cursor-based pagination.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | The agent instance GUID. |
| `sessionkey` | string | No | Session identifier. Defaults to `"default"`. |
| `limit` | number | No | Maximum number of messages to return. Defaults to `50`, max `200`. |
| `before` | string | No | Message GUID to use as cursor — returns only messages created before this one. Omit for the most recent messages. |

> **Team agents:** If the agent's `teamsessionmode` is `collaborative`, History returns messages from **all team members** in the session. In the default `private` mode, History only returns messages sent by the caller's own `uuid`. Same applies to `Sessions` listing.

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
          "thinking": [],
          "answer": ["Here are the key AI trends for 2026..."],
          "isThinking": false
        },
        "attachments": [],
        "deletestatus": 0,
        "createdat": 1743350400,
        "inputtokens": 3450,
        "outputtokens": 820,
        "cachereadtokens": 2400,
        "cachewritetokens": 0,
        "totaltokens": 4270,
        "model": "openai/gpt-5.4",
        "tokencost": 6,
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
        "tokencost": 4,
        "processedms": 3100
      }
    ],
    "count": 3,
    "hasmore": false
  }
}
```

> Each message row carries `uuid` (sender) and a server-decorated `user` object with the full sender shape — same as `Message/Detail`. `user` is `null` for system-inserted rows (e.g. `Message/SystemInsert` writes when `uuid` is `"system"`) or when the underlying account has been deleted.

> **Resuming an in-flight stream.** Every row carries the original `agenttoken` from `Message/Send`. If a returned message's `status` is non-terminal (`agent_queue`, `agent_start`, or `agent_output`), the agent is still processing it server-side. Hand the `agenttoken` to the [Agent WebSocket](/docs/agent-websocket) (`agent_info` frame) and you'll receive the remaining `agent_output` chunks plus the eventual `agent_end` event — no need to re-send the message. This is exactly how a chat UI can rehydrate live streams after a page reload.

| Field | Type | Description |
|-------|------|-------------|
| `messages` | `array` | Array of message objects, newest first. Each row has the **same shape as `Message/Detail`** — including the `uuid` sender, the `agenttoken` (so you can resubscribe over WebSocket if `status` is non-terminal), the decorated `user` object, and the per-turn token columns below. The array can also include `model_change` marker rows (see the note under the table). |
| `count` | `number` | Number of messages in this page. |
| `hasmore` | `boolean` | `true` if there are older messages available. Pass the last message's `guid` as `before` to fetch the next page. |

Each assistant row also carries the per-turn token-accounting columns, identical to [`Message/Detail`](#post-useragentmessagedetail):

| Field | Type | Description |
|-------|------|-------------|
| `inputtokens` | `number\|null` | Billed input (prompt) tokens for the turn. `null` on user-only, cron, legacy, and `model_change` marker rows. |
| `outputtokens` | `number\|null` | Billed output (completion) tokens the model generated. `null` on the same non-assistant / marker / legacy rows. |
| `cachereadtokens` | `number\|null` | Tokens served from the model's prompt cache. `0` when none; `null` on non-assistant rows. |
| `cachewritetokens` | `number\|null` | Tokens written to the prompt cache. `0` when none; `null` on non-assistant rows. |
| `totaltokens` | `number\|null` | Total tokens attributed to the turn. `null` on non-assistant rows. |
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
        "lastmessage": "How do I reset my password?"
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
| `lastmessage` | `string` | The most recent message body — `agentmessages.content` if the user sent a message, falling back to `agentmessages.response` (assistant reply) when `content` is empty. |

> **Reserved sessionkeys filtered out (non-admin only).** The list omits internal sessions used by the runtime: `wiro:api` (gateway hooks default), `voice-prep*` (per-call prep threads), `voice-call-*` (active voice-call rows), and `cs-cron-*` (one thread per scheduled cron skill). These rows still exist on the agent — they're just hidden from operator-facing listings to keep the panel UX clean. Admin callers (`tokenUserRoles` contains `"ADMIN"`) see the full unfiltered list. The same filter is applied on `Message/History` reads and the `DeleteSession` guard.

> **Marker rows excluded.** `model_change` marker rows are not real turns — they're skipped when building this list, so they never surface as a session's `lastmessage`.

## **POST** /UserAgent/Message/DeleteSession

Deletes messages in the given session for the **calling user**. This action cannot be undone.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | The agent instance GUID. |
| `sessionkey` | string | Yes | The session key to delete. |

> **Scope of deletion:** Hard delete — the API issues `DELETE FROM agentmessages WHERE useragentid = … AND sessionkey = …`. For non-admin callers an additional `AND uuid = <caller_uuid>` filter is appended, so only the caller's own rows in the session are purged. This holds in both private and collaborative team modes — even when `teamsessionmode: "collaborative"` (e.g. Telegram group-shared sessions) means every member sees the same thread, each member's `DeleteSession` only wipes their own contributions. Admin callers (`tokenUserRoles` contains `"ADMIN"`) bypass the uuid filter and wipe the entire session for every participant. Compare with `Message/Delete` (per-message), which is a soft-delete bumping the `deletestatus` bitmask.

> **Reserved sessionkeys (non-admin callers).** Wiro-API maintains a handful of internal threads keyed under reserved sessionkeys — `voice-prep` and `voice-prep-<sid>` (per-call prep), `voice-call-<sid>` (voice-call bubble rows), `cs-cron-<slug>` (one thread per scheduled cron skill), and `wiro:api` (gateway hooks default). Non-admin callers passing any of these as `sessionkey` get back `"Session not found"` instead of a delete; the response shape is identical to a missing-session result so there's no information leak about what threads exist. Admin (`tokenUserRoles` contains `"ADMIN"`) bypasses this guard. The same guard also covers `Message/History` reads, so `Sessions` already filters these keys out of the operator's session list — you only encounter the reserved-key error if you hand-craft the body with a known internal key.

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

## Thinking & Answer Separation

Agent responses may include thinking blocks where the underlying model reasons through the problem before answering. The system automatically parses `<think>...</think>` tags and separates the output into structured arrays:

```json
{
  "thinking": ["Let me analyze the user's question...", "The key factors are..."],
  "answer": ["Based on my analysis, here are the main points..."],
  "isThinking": false,
  "raw": "<think>Let me analyze the user's question...</think>Based on my analysis, here are the main points..."
}
```

- `thinking` — array of reasoning/chain-of-thought blocks. May be empty if the model doesn't use thinking.
- `answer` — array of response chunks. This is the content to show the user.
- `isThinking` — `true` while the model is still in a thinking phase (the `<think>` tag is open but not yet closed), `false` during the answer phase.
- `raw` — the full accumulated raw output text including think tags.

Each `agent_output` WebSocket event contains the **full accumulated** arrays up to that point — not just the new chunk. Simply replace your displayed content with the latest arrays. Use `isThinking` to show a "thinking" indicator in your UI while the model reasons.

> **Tip:** Display thinking content in a collapsible section so users can optionally inspect the model's reasoning process.

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
  "result": true
}
```

**3. Streaming output event** (emitted multiple times — replace your displayed content with `message.answer` on each event):

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
    "thinking": [],
    "answer": ["Here are the key AI trends..."],
    "isThinking": false
  },
  "result": true
}
```

**4. Final event** (agent_end — terminal):

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
    "thinking": [],
    "answer": ["Here are the key AI trends for 2026..."],
    "isThinking": false
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
| `message.tokenCount` | `number` | Number of tokens generated so far. |
| `message.wordCount` | `number` | Number of words generated so far. |
| `message.raw` | `string` | Full accumulated raw output text. |
| `message.thinking` | `string[]` | Array of thinking/reasoning blocks. |
| `message.answer` | `string[]` | Array of answer blocks — the content to display. |
| `message.isThinking` | `boolean` | `true` while the model is in thinking phase. |

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
    "thinking": [],
    "answer": ["Here are the key AI trends for 2026..."],
    "isThinking": false
  },
  "endedat": 1743350408
}
```

> Payload delivered to your `callbackurl`. `metadata` is decoded into a JSON object.

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
