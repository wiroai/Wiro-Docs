# Agent Messaging

Send messages to AI agents and receive streaming responses in real time.

## How It Works

Agent messaging follows the same async pattern as [model runs](/docs/run-a-model):

1. **Send** a message via REST → get an `agenttoken` immediately
2. **Subscribe** to [Agent WebSocket](/docs/agent-websocket) with the `agenttoken` → receive ordered `agent_timeline_delta` block updates plus provisional accumulated answer text
3. **Or poll** via the Detail endpoint to check status and fetch the completed response
4. **Or set** a `callbackurl` to receive a webhook notification when the agent finishes

This decoupled design means your application never blocks waiting for the agent to think. Send the message, hand the `agenttoken` to your frontend, and stream the response as it arrives.

> **Building a chat in your own product?** [Agent Chat Integration](/docs/agent-chat-integration) walks through the whole cycle with every request and answer: messages, setup cards, connecting each kind of connector, restarts and errors.

### Ordered turn timeline

Every Detail or History message row returns a top-level `timeline[]`. It is the ordered, persisted record of the turn. A turn can contain multiple interleaved blocks, for example:

`Thinking → Answer or Tool → Thinking → Answer`

Each block has an opaque deterministic `blockid`, call/content ordering coordinates, `type` (`reasoning`, `answer`, `tool`, or `setup`), safe public text, tool state or a setup card, `phase` (`stream`, `end`, or `error`), its own monotonically increasing `version`, and timestamps. Reasoning text is a model-provided reasoning summary, never raw hidden chain-of-thought. Tool blocks expose only `toollabel`, `toolstatus`, `toolintegration`, and `toolaction`, never a tool ID, arguments, results, or other internal execution metadata. `toolintegration` and `toolaction` each hold a word from a [closed list](#tool-integration-and-action-values) or `null`. A `setup` block is a setup change the agent proposes; see [Setup From Chat](#setup-from-chat). When a turn ends with `agent_error` or `agent_cancel`, the server closes every block still at `stream` and sends each one as an `agent_timeline_delta`, usually just before that final event. After `agent_end`, open blocks normally close a few seconds later. A tool block that closed with `toolstatus` `requested` was cut off before it finished.

Live WebSocket updates arrive as `agent_timeline_delta` events carrying one public block. Merge by `blockid`, replace that block only when its incoming `version` is strictly newer, then sort by `callindex`, `contentindex`, and `blockid`. `agent_subscribed.timeline` carries the persisted reconnect snapshot. `agent_output` remains provisional cumulative SSE output until the corresponding answer block catches up; after completion or reconnect, `Message/Detail` is authoritative.

## Message Lifecycle

Every agent message progresses through a defined set of stages:

`agent_queue` → `agent_start` → `agent_output` → `agent_end`

### Message Statuses

| Status | Description |
|--------|-------------|
| `agent_queue` | The message is queued and waiting to be picked up by the agent runtime. Emitted once when the message enters the queue. |
| `agent_start` | The agent has accepted the message and begun processing. The underlying LLM call is being prepared. |
| `agent_output` | The agent is producing output. This event is emitted **multiple times**: each chunk of the response arrives as a separate `agent_output` event via WebSocket, enabling real-time streaming. |
| `agent_end` | The agent has finished generating the response. The full output is available in the `response` and `debugoutput` fields. **This is the event you should listen for** to get the final result. |
| `agent_error` | The turn failed. `response` and `debugoutput` hold a coded message that says why; see [Failed turns](#failed-turns). |
| `agent_cancel` | The message was cancelled by the user before completion. Only messages in `agent_queue`, `agent_start`, or `agent_output` status can be cancelled. |
| `agent_done` | **Marker-only terminal status.** Used **exclusively** for `model_change` marker rows (see [Message/History](#post-useragentmessagehistory)), never for a real user or assistant turn. Normal turns terminate at `agent_end` (or `agent_error` / `agent_cancel`). |

### Failed turns

When a turn ends with `agent_error` or `agent_cancel`, `response` and `debugoutput` both hold one message: a code in brackets, then a fixed sentence. [Message/Detail](#post-useragentmessagedetail), [Message/History](#post-useragentmessagehistory), the `agent_error` and `agent_cancel` events of the [Agent WebSocket](/docs/agent-websocket) and the [webhook](/docs/agent-webhooks) carry the same text, and the agent chat on wiro.ai shows its own sentence for the code. The underlying error is never returned.

| Code | Status | What happened | What to do |
|------|--------|---------------|------------|
| `[SECURITY_BLOCKED]` | `agent_error` | The agent's security rules blocked the message. | Change the message and send it again. |
| `[SAFETY_POLICY_BLOCKED]` | `agent_error` | The model's provider declined the request under its usage or safety policy. | Rephrase the request and send it again. |
| `[TURN_INTERRUPTED]` | `agent_error` | The agent restarted while the turn was running. | Send the message again. |
| `[SPEND_LIMIT_REACHED]` | `agent_error` | The agent's own [spend limit](/docs/spend-limits) is used up, so its model calls were refused. | Wait for the limit to reset, or have its owner raise it on the [Spend Limits](https://wiro.ai/panel/wallet/limits) page. |
| `[USAGE_CEILING_REACHED]` | `agent_error` | The agent reached its hourly or daily safety ceiling for AI model calls. | Wait until that hour or day is over. |
| `[MODEL_NOT_ALLOWED]` | `agent_error` | The agent's own [Model Access](/docs/model-access) rule blocks the model it uses, so its model calls were refused. | Have its owner allow the model on the [Model Access](https://wiro.ai/panel/controls/model-access) page, or choose another model for the agent. |
| `[AGENT_UNAVAILABLE]` | `agent_error` | Any other failure. | Try again after a short wait. |
| `[REQUEST_CANCELLED]` | `agent_cancel` | The turn was cancelled, while it ran or while it was still queued. | Nothing to do. |

The full texts:

```text
[SECURITY_BLOCKED] The agent's security rules blocked this message. Change it and send it again.
[SAFETY_POLICY_BLOCKED] The model's provider declined this request under its safety policy. Rephrase it and send it again.
[TURN_INTERRUPTED] This request was interrupted by a restart before it finished. Please send it again.
[SPEND_LIMIT_REACHED] This agent's spend limit is used up, so it paused. It runs again when the limit resets or its owner raises it.
[USAGE_CEILING_REACHED] This agent reached its hourly or daily safety ceiling for AI model calls, so it paused. It runs again when that hour or day is over.
[MODEL_NOT_ALLOWED] This agent's Model Access rule blocks the model it uses, so it stopped. Its owner can allow the model on the Model Access page or choose another one.
[AGENT_UNAVAILABLE] Agent is temporarily unavailable. Please try again shortly.
[REQUEST_CANCELLED] Request cancelled.
```

Match the code in brackets, never the sentence after it, which can change. Turns that failed before the codes existed are returned in the same form.

## **POST** /UserAgent/Message/Send

Sends a user message to a deployed agent. The agent must be in running state (status `4`), except for a setup reply that Wiro answers itself, such as a `yes` that applies a setup card, which works in any status (see [Replies Wiro handles itself](#handled-setup-replies)). Returns immediately with an `agenttoken` that you use to track the response via WebSocket, polling, or webhook.

Accepts either `application/json` (text-only) or `multipart/form-data` (text + file attachments). When sending files, the `message` field can be empty. The agent receives the attachments and any accompanying text.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | The agent instance GUID (from Deploy or MyAgents). |
| `message` | string | Conditional | The user message text. Required unless sending files via multipart. |
| `sessionkey` | string | No | Session identifier for conversation continuity. Defaults to `"default"`. |
| `callbackurl` | string | No | Webhook URL: the system will POST the final response to this URL when the agent finishes. It must be a public `http(s)` address: a host that is, or resolves to, a private, loopback or link-local address gets no webhook. |
| `model` | string | No | Canonical model slug to run **this turn** on (e.g. `"openai/gpt-5.6-sol"`), chosen from the agent's selectable set. Validated server-side: an unknown or non-selectable slug is rejected in `errors[]` and the turn is **not** sent. So is a model that the agent's own [Model Access](/docs/model-access) rule blocks (code `92`). Omit to use the agent's configured chat model. |
| `attachment` / `attachments[]` | file | No | Multipart only: one or more file attachments that the agent can process. |

> **Per-turn model selection.** `model` selects the chat model for a single turn instead of the agent's configured default. Valid values are the agent's **selectable** slugs: the `tokenRates.models[]` entries where `selectable` is `true`, returned by `UserAgent/Detail` (see [Agent Overview](/docs/agent-overview)). The current set includes `openai/gpt-5.6-sol` (the platform chat default), `openai/gpt-5.6-terra`, `openai/gpt-5.6-luna`, `openai/gpt-5.5`, `openai/gpt-5.5-pro`, `openai/gpt-5.4`, `openai/gpt-5.4-mini`, `openai/gpt-5.2`, `openai/gpt-5.1`, `openai/gpt-5`, and `openai/gpt-5-mini`. Always read the live set from that field. The server applies the chosen model to that turn only.

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

> **A successful Send response means the message was accepted and queued, not that it will definitely reach the agent.** After this response the system queues the message for the agent. If that queueing step itself fails (for example, a queue outage), the message's `status` is set to `agent_error` server-side **after** the HTTP response was already sent with `result: true`. Always confirm the final state via `POST /UserAgent/Message/Detail` or the WebSocket stream; don't assume the message progresses to `agent_start` just because Send returned `result: true`.

> **Reserved session keys.** The platform reserves a small set of `sessionkey` prefixes for system-managed threads: `wiro:api`, `voice-prep*`, `voice-call-*`, and `cs-cron-*`. Sending a user message into one of these keys is rejected with `Reserved sessionkey` (the same guard that protects `Message/DeleteSession`). Pick any other identifier for your own threads.

| Field | Type | Description |
|-------|------|-------------|
| `messageguid` | `string` | Unique identifier for this message. Use it with Detail, History, or Cancel. |
| `agenttoken` | `string\|null` | Token for WebSocket subscription and polling. Equivalent to `tasktoken` in model runs. `null` when Wiro handled the message itself (see below). |
| `status` | `string` | Initial status: `"agent_queue"` on success, or `"agent_end"` when Wiro handled the message itself: a setup reply (see [Replies Wiro handles itself](#handled-setup-replies)) or an [unknown or disabled command](#unknown-or-disabled-commands). |
| `modelChangeMarker` | `object\|null` | Present **only** when this turn's `model` selects a different chat model than the session was running, i.e. it rotates the model mid-session. Shape: `{ guid, type: "model_change", fromModel, toModel, createdat }`. The platform also writes a matching marker row into history (see [Message/History](#post-useragentmessagehistory)). Absent on turns that keep the session's model. |
| `content` | `string` | Present when Wiro handled the message itself or removed a key from it: the message text as stored. See [Keys in chat](#keys-in-chat). |
| `contentmasked` | `boolean` | Present (`true`) when Wiro removed a key from the message before the agent saw it; `content` holds the text the agent got. |
| `response` | `string` | Only when Wiro handled the message itself: its result text. |
| `setupresult` | `object` | Only when Wiro handled the message itself as a setup reply: `{ applied, dismissed, failed, restarting, next? }`. See [Replies Wiro handles itself](#handled-setup-replies). |

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
| Agent not running (`status` ≠ 4) | `agentstatus: <int>` | Returned for every message Wiro doesn't answer itself as a setup reply (see [Replies Wiro handles itself](#handled-setup-replies)). Echoes the agent's current `status` so the caller can decide whether to wait, call `Start`, or surface "Setup Required" UI: `0` Stopped (call `Start`), `1` Stopping, `2` Queued and `3` Starting (wait and retry), `5` Error (call `Start` to retry), `6` Setup Required. With status `1`, the error reads `Agent is stopping. Please wait a moment and try again.` when the agent is shutting down to stay stopped, and `Agent is restarting. Please wait a moment and try again.` when it is shutting down to start again, as in a [restart](/docs/agent-overview#automatic-restart). See [UserAgent Statuses](/docs/agent-overview#useragent-statuses). |
| Out of credits | `agentstatus`, `agentbalance: { monthlycredits, extracredits, usedcredits, remainingcredits }` | Returned with the `Agent has no remaining credits…` error. `remainingcredits: 0` is the trigger; surface a "Renew or buy a credit pack" CTA. |

### Unknown or disabled commands

While the agent is running, Wiro answers a slash command the agent doesn't run, such as `/status`, or one of its commands that is turned off in [`enabledcommands`](/docs/agent-overview#post-useragentupdatesettings). No agent turn runs and no credits are used, even when the agent has no credits left. Send answers at once:

```json
{
  "result": true,
  "errors": [],
  "messageguid": "e5f6a7b8-c9d0-1234-ef56-789012345678",
  "agenttoken": null,
  "status": "agent_end",
  "response": "⛔ Unknown or disabled command: /status\nSend /agent_help to see the available commands.",
  "content": "/status"
}
```

`response` names the command in lower case, and its second line comes only when the agent has `agent_help` on. There is no `setupresult`. The message is stored as a finished exchange, like a [reply Wiro handles itself](#handled-setup-replies): Message/Detail and Message/History return it with `status: "agent_end"`, `metadata.type: "setup_result"` and `model: null`. When the Send has a `callbackurl`, Wiro posts the answer to it right away with `status: "agent_end"`, and its `metadata` holds `type: "setup_result"`, `cards: []` and `command`, the command's name. Files sent with the message are not kept.

Wiro finds the command this way:

- A command is a `/` at the start of the message or after a space, tab or line break, followed by a letter or `_`. It counts anywhere in the text: `Check the /pricing page` gets the answer for `/pricing`. A `/` inside a word or before a digit, as in `and/or` or `/2fa`, is plain text.
- Links (`http://` and `https://` addresses) and quoted lines (lines that start with `>`) are left out first, so `see https://example.com/pricing` holds no command.
- A message with one of the agent's enabled commands anywhere in it goes to the agent, which runs the command. A command runs only when it is written in lower case and followed by a space, tab, line break or the end of the message: `/AGENT_STATUS` and `/agent_status.` get the answer.
- Otherwise only the first command counts. When it is `/model` or `/models`, one of `/start`, `/help`, `/settings`, `/app`, `/tmp`, `/run`, `/usr`, `/bin`, `/etc`, `/home` and `/var`, or a name of more than 32 characters, the message goes to the agent as usual: `/usr/bin/env` and `/start /pricing` reach the agent. Any other first command gets the answer.

While the agent isn't running, the message gets the [not-running refusal](#failure-responses) with `agentstatus`, as every message does that Wiro doesn't answer as a setup reply.

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
      "wordCount": 118
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
| `agenttoken` | `string\|null` | The same token issued by `Message/Send` for this message. Lets callers that arrived at the row through `Message/Detail` (or `Message/History`) subscribe to the [Agent WebSocket](/docs/agent-websocket) and pick up an in-flight response. This is useful when a chat UI rehydrates after a reload and finds a message still in `agent_queue` / `agent_start` / `agent_output` status. `null` for very old rows that pre-date the column, and for replies Wiro handles itself (see [Replies Wiro handles itself](#handled-setup-replies)). |
| `user` | `object\|null` | Resolved sender info: `{ uuid, firstname, lastname, email, username, avatar, avatarinitials }`. Decorated server-side from the message's `uuid` so the chat bubble can render avatar / hover-tooltip without an extra `User/Detail` round-trip. `null` when the row was written by automation (sentinel `uuid` like `"system"`) or when the user record was deleted. A message sent with a project API key is the key owner's, whoever typed it: a product of your own shows its own names, not this one. |
| `sessionkey` | `string` | The session this message belongs to. |
| `content` | `string` | The original user message. |
| `response` | `string` | The agent's full response text. Empty until the turn ends. After `agent_error` or `agent_cancel` it holds the failure message; see [Failed turns](#failed-turns). |
| `debugoutput` | `string` | Accumulated output text. Updated during streaming, contains the full response after completion. |
| `timeline` | `array` | Ordered turn blocks. Always an array; `[]` means no public blocks were persisted. Merge live deltas by `blockid` and per-block `version`, then sort by call/content order. |
| `status` | `string` | Current message status (see Message Lifecycle). |
| `metadata` | `object` | Parsed JSON object (API returns it already decoded). Populated from the agent bridge on `agent_end`. Only `type` and a few keys are returned: on a finished turn (`type: "progressGenerate"`) `task`, `speed`, `speedType`, `elapsedTime`, `tokenCount` and `wordCount`; on a `model_change` marker row `fromModel` and `toModel`; on other rows (`setup_result`, `system`, `subagent`) usually `type` alone, and in History `systemcost: true` on a row whose cost came from a scheduled or background run. The answer text is in `response` and `timeline`, never in metadata. Empty object `{}` for `agent_error`, `agent_cancel`, or when the bridge hasn't finished yet. Message status lives in the top-level `status` field, so don't read it from `metadata.type`. |
| `attachments` | `array` | Always present as an array: empty `[]` for text-only messages. When the message was sent via multipart with files, each entry is a resolved `{url, name, type, size}` object (no further file-lookup needed). Identical shape in `Message/History` rows. |
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

Only the fields below are returned in browser-facing REST and WebSocket timeline blocks. `toollabel`, `toolstatus`, `toolintegration`, and `toolaction` appear on tool blocks only, and `setup` on setup blocks only.

| Field | Type | Description |
|-------|------|-------------|
| `blockid` | `string` | Opaque deterministic identity for one logical block (for example `c0:i0`). Use it as the merge key; do not parse its current format. |
| `callindex` | `number` | Zero-based call order within the turn. Primary sort key. |
| `contentindex` | `number` | Zero-based content order within the call. Secondary sort key. |
| `type` | `string` | `reasoning`, `answer`, `tool`, or `setup`. |
| `text` | `string\|null` | Safe public text for `reasoning` and `answer`; `null` for tool and setup blocks. Reasoning text is an OpenAI GPT-5 provider summary, not raw chain-of-thought. |
| `toollabel` | `string` | Tool blocks only. Safe display label for the tool. Arguments and results are never included. |
| `toolstatus` | `string` | Tool blocks only. `requested` while the step runs, then `completed` or `error`. |
| `toolintegration` | `string\|null` | Tool blocks only. The connector the step works in, as its `key` from [`POST /Credentials/List`](/docs/agent-credentials#post-credentialslist), for example `shopify`. `null` when the step doesn't work in a connector. See [Tool integration and action values](#tool-integration-and-action-values). |
| `toolaction` | `string\|null` | Tool blocks only. What the step does, for example `screenshot` or `click`. `null` when no word fits the step, and always `null` when `toolintegration` is set. See [Tool integration and action values](#tool-integration-and-action-values). |
| `setup` | `object` | Setup blocks only. The change the agent proposes and its state; see [The setup block](#setup-blocks). |
| `phase` | `string` | `stream`, `end`, or `error` for this block. A block still at `stream` closes when its turn ends with `agent_error` or `agent_cancel`, and normally a few seconds after `agent_end`. |
| `version` | `number` | Monotonic **within this block**. Ignore a delta whose version is not strictly newer than the stored block's version. |
| `startedat` | `number\|null` | Block start timestamp when available. |
| `updatedat` | `number\|null` | Most recent block update timestamp when available. |

Do not compare `version` across different blocks. Keep a map keyed by `blockid`, apply per-block last-write-wins, and render `callindex ASC, contentindex ASC, blockid ASC`. This makes the result independent of HTTP/WebSocket arrival order.

> **`metadata.tokenCount` vs the billing token columns.** `metadata.tokenCount` is the **live stream counter** emitted inside the `progressGenerate` payload, a running word/token tally for the in-flight response. The flat `inputtokens` / `outputtokens` / `cachereadtokens` / `cachewritetokens` / `totaltokens` / `tokencost` columns are the **final billed usage**, written once the turn completes. They measure different things: use `tokenCount` for a live progress indicator, and the flat columns for accounting and cost.

### Tool integration and action values

`toolintegration` and `toolaction` say which connector a tool step works in and what the step does, so your app can show "Working in Shopify" or "Taking a screenshot" instead of only the tool's name. Each holds a word from a closed list or `null`, never free text, a host, a URL, a path, or an argument.

`toolintegration` is the `key` of the connector the step works in, as [`POST /Credentials/List`](/docs/agent-credentials#post-credentialslist) lists it: `adjust`, `apollo`, `apple-appstore`, `brevo`, `calendarific`, `facebook-pages`, `firebase`, `ga4`, `gmail`, `google-ads`, `google-business`, `google-calendar`, `google-drive`, `google-merchant-center`, `google-play`, `hubspot`, `instagram`, `lemlist`, `linkedin`, `mailchimp`, `meta-ads`, `reddit`, `roasit`, `sendgrid`, `serper`, `shopify`, `telegram`, `tiktok`, `tiktok-ads`, `twitter`, `wiro`, `woocommerce`, `wordpress`, or `youtube`.

`toolaction` is one of these words:

| Value | Meaning |
|-------|---------|
| `screenshot` | Takes a screenshot of a page. |
| `open-page` | Opens a page. |
| `read-page` | Reads the open page. |
| `click` | Clicks on the page. |
| `type` | Types text into the page. |
| `press-key` | Presses a key. |
| `wait` | Waits for the page. |
| `upload` | Uploads a file to the page. |
| `download` | Downloads a file. |
| `read-file` | Reads a file. |
| `edit-media` | Edits a video, an image, or audio. |

A tool block never carries both words: when `toolintegration` is set, `toolaction` is `null`. Both are `null` when no word fits the step and on blocks saved before these fields existed, so fall back to `toollabel` then. The words come with the block's first `requested` update, and every later update of the block carries them. A later update can carry a different word if the step changed, so read the words from the newest version of the block, like its other fields. A block whose step is rewritten and no longer fits a word keeps its last word. More values can be added to either list later, so treat a value you don't know like `null`.

Two tool blocks from a `timeline[]`:

```json
[
  {
    "blockid": "c0:i1",
    "callindex": 0,
    "contentindex": 1,
    "type": "tool",
    "text": null,
    "toollabel": "exec",
    "toolstatus": "completed",
    "toolintegration": "shopify",
    "toolaction": null,
    "phase": "end",
    "version": 3,
    "startedat": 1743350402,
    "updatedat": 1743350406
  },
  {
    "blockid": "c1:i1",
    "callindex": 1,
    "contentindex": 1,
    "type": "tool",
    "text": null,
    "toollabel": "browser",
    "toolstatus": "requested",
    "toolintegration": null,
    "toolaction": "screenshot",
    "phase": "stream",
    "version": 1,
    "startedat": 1743350408,
    "updatedat": 1743350408
  }
]
```

## **POST** /UserAgent/Message/History

Retrieves conversation history for a specific agent and session. Messages are returned **newest-first** with cursor-based pagination.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | The agent instance GUID. |
| `sessionkey` | string | No | Session identifier. Defaults to `"default"`. |
| `limit` | number | No | Maximum number of messages to return. Defaults to `50`, max `200`. |
| `before` | string | No | Message GUID to use as cursor: returns only messages created before this one. Omit for the most recent messages. |

> **Team agents:** If the agent's `teamsessionmode` is `collaborative`, History returns messages from **all team members** in the session, and the agent keeps one shared memory for the team. In `private` mode, History only returns messages sent by the caller's own `uuid` and memory stays per operator. The same visibility rule applies to `Sessions` listing.

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
          "wordCount": 118
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
        "uuid": "ada-uuid",
        "agenttoken": null,
        "user": {
          "uuid": "ada-uuid",
          "firstname": "Ada",
          "lastname": "Lovelace",
          "email": "ada@example.com",
          "username": "ada",
          "avatar": "https://cdn.wiro.ai/avatars/ada.webp",
          "avatarinitials": "AL"
        },
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
    "hasmore": false,
    "sessiontoken": "Lp4vQ8sWn2KxT7cRb1YhZ6mDg9FjA3uEo5iNk0wXyHt"
  }
}
```

> Each message row carries `uuid` (sender) and a server-decorated `user` object with the full sender shape, the same as `Message/Detail`. `user` is `null` for rows with a sentinel `uuid` such as `"system"` (older automation rows) or when the underlying account has been deleted.

> **Resuming an in-flight stream.** Every row carries the original `agenttoken` from `Message/Send`. If a returned message's `status` is non-terminal (`agent_queue`, `agent_start`, or `agent_output`), the agent is still processing it server-side. Hand the `agenttoken` to the [Agent WebSocket](/docs/agent-websocket) (`agent_info` frame) and you'll receive the persisted `agent_subscribed.timeline` snapshot, subsequent `agent_timeline_delta` block updates, remaining provisional `agent_output` snapshots, and the eventual `agent_end` event, with no need to re-send the message.

| Field | Type | Description |
|-------|------|-------------|
| `messages` | `array` | Array of message objects, newest first. Each row has the **fields of `Message/Detail` except `sessionkey`, `startedat` and `endedat`**, including persisted `timeline`, the `uuid` sender, the `agenttoken` (so you can resubscribe over WebSocket if `status` is non-terminal), the decorated `user` object, and the per-turn token columns below. The array can also include `model_change` marker rows (see the note under the table). |
| `count` | `number` | Number of messages in this page. |
| `hasmore` | `boolean` | `true` if there are older messages available. Pass the last message's `guid` as `before` to fetch the next page. |
| `sessiontoken` | `string` | Token for following this session live on the [Agent WebSocket](/docs/agent-websocket#following-a-session): messages added to the session between turns reach you as they are written. Treat it as opaque and keep it private, like an `agenttoken`. It can be absent; then read History again to pick up new messages. |

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

> **Messages added between turns.** Not every row answers a `Message/Send` of yours: the agent can also add a message to the session on its own, such as a scheduled report, files it sends after an answer, or the result of longer work it finished in the background. When it moves work to the background, the turn you sent ends with a short line saying the result will follow, and the result arrives later as a separate row. These rows arrive finished (`status: "agent_end"`) with an empty `content` and the text in `response`. Their `metadata.type` is `"subagent"` for the result of work the agent finished in the background (show it as the agent's reply) and `"system"` for the rest. They have no turn of their own: nothing streams on an `agenttoken` for them and no `callbackurl` is called. Read them with History, or follow the session with `sessiontoken` to receive each one as it is added; see [Following a session](/docs/agent-websocket#following-a-session).

### Pagination

To paginate through a long conversation:

**Page 1** (most recent messages):

```json
{
  "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
  "sessionkey": "default",
  "limit": 50
}
```

**Page 2**, passing the **last** (oldest, smallest `createdat`) message's `guid` from page 1 as the `before` cursor:

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
| `lastmessage` | `string` | The most recent message body: the message's `content` if the user sent a message, falling back to its `response` (assistant reply) when `content` is empty. |
| `name` | `string?` | Optional display name set via [`Message/RenameSession`](#post-useragentmessagerenamesession). Omitted when the session was never named, so fall back to your own default label (e.g. the `sessionkey` or "New chat"). |

> **Named-but-empty sessions appear too.** A session created by [`RenameSession`](#post-useragentmessagerenamesession) before its first `Message/Send` surfaces here with `messagecount: 0`, `lastmessage: ""`, and the `name` you set, so a freshly created chat shows up in the list immediately.

> **Reserved session keys.** The list leaves out the reserved session keys `wiro:api`, `voice-prep*`, `voice-call-*` and `cs-cron-*`. `Message/History` and `DeleteSession` reject them too.

> **Marker rows excluded.** `model_change` marker rows are not real turns. They're skipped when building this list, so they never surface as a session's `lastmessage`.

## **POST** /UserAgent/Message/DeleteSession

Deletes messages in the given session for the **calling user**. This action cannot be undone.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | The agent instance GUID. |
| `sessionkey` | string | Yes | The session key to delete. |
| `rotate` | boolean | No | Default `false`. When `true`, after wiping the rows the server also clears the agent's memory of this session, so the next `Message/Send` on the same `sessionkey` starts a fresh reasoning context. With `false` (or omitted) the message rows are wiped but the agent may still recall them. Any display `name` set via [`RenameSession`](#post-useragentmessagerenamesession) is dropped on delete. |

> **Scope of deletion:** Hard delete. The session's messages are removed permanently, not hidden. Only the caller's own messages in the session are purged. This holds in both private and collaborative team modes. Even when `teamsessionmode: "collaborative"` (e.g. Telegram group-shared sessions) means every member sees the same thread, each member's `DeleteSession` only wipes their own contributions. Compare with `Message/Delete` (per-message), which is a soft delete that hides messages instead of removing them.

> **Reserved session keys.** `wiro:api`, `voice-prep*`, `voice-call-*` and `cs-cron-*` are reserved. Passing one of them as `sessionkey` returns `"Session not found"`, and `Sessions` never lists them.

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
| `sessionkey` | string | Yes | The session to name. Reserved system keys (`wiro:api`, `voice-prep*`, `voice-call-*`, `cs-cron-*`) are rejected with `"Session not found"`, same as `DeleteSession`. |
| `name` | string | Yes | The display name. The server strips control characters, collapses whitespace, trims, and caps the result at **40 characters**. An empty string after sanitization is rejected with `request-parameter-required`. |

> **Doubles as "create a named session".** Calling `RenameSession` with a brand-new `sessionkey`, before any `Message/Send` on it, seeds a named-but-empty session that immediately appears in [`Message/Sessions`](#post-useragentmessagesessions) with `messagecount: 0` and `lastmessage: ""`. This is the canonical way to let a user open a fresh, titled chat before they type anything.

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

Bulk-deletes one or more messages from a session, with **per-side soft-delete** semantics. Each item lets you choose whether to hide the user side of the bubble, the agent side, or both. This supports "delete just my message" / "delete only the response" / "delete the whole bubble" UX without losing the underlying record.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | The agent instance GUID. |
| `items` | array | Yes | One or more `{ messageguid, side }` rows. |

Each item:

| Field | Type | Description |
|-------|------|-------------|
| `messageguid` | string | The message to delete. Must belong to the agent identified by `useragentguid`, and its `uuid` must be yours: any other `messageguid` (for example, another team member's message in a shared session) is skipped silently and the call still returns `result: true`. On a team agent, any active member of the agent's team can call this from the team's workspace; it still hides only your own messages. |
| `side` | string | One of `"user"`, `"agent"`, or `"both"`. Sets these bits in the message's `deletestatus` bitmask: `user → 1`, `agent → 3`, `both → 3`. **`agent` and `both` both produce `3`** (full hide on both sides). There is no `side` value that hides only the agent's view while keeping the row visible to the user. |

> **Soft delete, not hard delete.** Deleted messages are kept with `deletestatus` set rather than erased. `Message/History` only returns messages whose `deletestatus` is **`0`**, i.e. a message is hidden the moment any bit is set, regardless of which side flagged it. To wipe a whole session hard-and-fast (no soft-delete trail), use [`Message/DeleteSession`](#post-useragentmessagedeletesession) instead.

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

The endpoint is best-effort across the items array: invalid `messageguid` rows or invalid `side` values are silently skipped. The call returns `result: true` even when zero rows were updated, so callers should refetch `Message/History` to confirm the new state.

## **POST** /UserAgent/Message/Cancel

Cancels an in-progress message. Only messages in `agent_queue`, `agent_start`, or `agent_output` status can be cancelled. Messages that have already reached `agent_end`, `agent_error`, or `agent_cancel` cannot be cancelled.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `messageguid` | string | No | The message GUID to cancel. |
| `agenttoken` | string | No | The agent token to cancel (alternative to messageguid). |
| `sessionkey` | string | No | Optional session scope. When supplied, the cancel only matches a row in this `sessionkey`. This is useful for shared-owner agents so one end user can't cancel another's in-flight turn. Omit for the default single-user behavior. |

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
> - If the message was **already being processed** by the agent bridge (status `agent_start` or `agent_output`), the bridge's abort handler fires: subscribed WebSocket clients receive an `agent_cancel` event, `debugoutput` / `response` are set to `[REQUEST_CANCELLED] Request cancelled.`, and the `callbackurl` webhook (if set) is triggered with `status: "agent_cancel"`.
> - If the message was **still queued** (status `agent_queue`) when cancelled, no processing attempt had started: the row is marked `agent_cancel`, [Message/Detail](#post-useragentmessagedetail) and [Message/History](#post-useragentmessagehistory) return `[REQUEST_CANCELLED] Request cancelled.` for it, **no WebSocket `agent_cancel` event** is broadcast, and **no webhook** is triggered.
>
> When polling for the final state, check `status === "agent_cancel"`.

## Setup From Chat

An agent can help the people who run it set it up in the chat: add or remove a connector or skill, save a key for a connector or remove it, connect a connector that uses a sign-in, create or change a scheduled task, create or change a custom skill, add to one or undo its last change, or change its time zone. The agent never changes its own setup and never sees a key. It proposes the change as a **setup card**: Wiro checks the card against the agent's current setup and stores it on the message that asked for it, where it shows as a `setup` block in that message's `timeline[]`. Nothing changes until an agent admin (the owner, or an admin of the agent's team) approves the card.

Where cards can be proposed and approved is the agent's `chatsetup` setting. Set it with [`UpdateSettings`](/docs/agent-overview#post-useragentupdatesettings) or at [`Deploy`](/docs/agent-overview#post-useragentdeploy), and read it back as `chatSetup` on [`UserAgent/Detail`](/docs/agent-overview#post-useragentdetail):

| Value | What it allows |
|-------|----------------|
| `all` (default) | Setup cards in the Wiro web chat and in messages sent with a project API key, such as from your backend or an MCP client. |
| `webchat` | Setup cards only in the Wiro web chat on wiro.ai. Messages sent with a project API key never get or approve a card. |
| `off` | No setup cards. The agent tells people that an agent admin makes the change in the agent's settings. |

Messages from Telegram, Slack or Discord never get or approve a card, whatever the setting: there the agent says that an agent admin makes the change in the agent's settings.

> **Agents your customers talk to.** A message sent with your project API key acts with your rights, even when one of your end users typed it. If people who don't manage the agent talk to it through your app, set `chatsetup` to `"webchat"` or `"off"`, so a "yes" from one of them can't change the agent's setup.

> **Setup cards in your own chat.** To show the cards, their connect steps and restarts in your own product, follow [Agent Chat Integration](/docs/agent-chat-integration).

> **Studio and the Workflow Agent.** Setup from chat is always off for them. Each one runs on one setup shared by everyone who uses it, so they never propose setup cards, and their connectors, skills and scheduled tasks are fixed. Asked to remember a rule or to do something on a schedule, they say so in one sentence and help with the request once, as a one-time task.

### The setup block

A setup block has `type: "setup"`, `text: null` and a `setup` object with the proposed change and its state. Setup blocks sort after every other block of the turn, in the order the agent proposed them, and their `phase` is always `end`. A message holds at most three. The card's `status` changes when someone approves or dismisses it. A pending card's block has `version` `1`; once the card is applied, dismissed or failed, its block has `version` `2` with the new `status`, so keep the copy with the higher `version` whichever arrives first. Clients still subscribed to the message's `agenttoken` get the new block as an `agent_timeline_delta`, and [Message/Detail](#post-useragentmessagedetail) and [Message/History](#post-useragentmessagehistory) always return the current state.

A pending `connect` card's block also has `next`, beside `setup`: one entry `{ connector, title, mode }` for the card's own connector, in the shape of an `add` card's `needs`, so a chat in your own product can show its own Connect button. It is gone from the block once the card is applied, dismissed or failed. A `connect` card stored before `next` existed may have none. It still gets one while a pending `add` card on the same message names its connector in `needs`. An `add` card's block has no `next`: its `needs` lists what it brings.

```json
"next": [{ "connector": "serper", "title": "Serper Web Search", "mode": "key" }]
```

```json
{
  "blockid": "s:k3v9q2m8x1za",
  "callindex": 1000000,
  "contentindex": 0,
  "type": "setup",
  "text": null,
  "setup": {
    "v": 1,
    "id": "k3v9q2m8x1za",
    "kind": "schedule",
    "action": "create",
    "key": "cs-cron-morning-summary",
    "title": "Morning summary",
    "cron": "0 9 * * 1-5",
    "instructions": "Every weekday, summarize yesterday's orders and post the summary in the web chat.",
    "requestedby": "ada-uuid",
    "createdat": 1743350406
  },
  "phase": "end",
  "version": 1,
  "startedat": 1743350406,
  "updatedat": 1743350406
}
```

| Field | Type | Description |
|-------|------|-------------|
| `v` | `number` | Card format version, `1`. |
| `id` | `string` | The card's id: 12 lower-case letters and digits. Send it as `cardid` to [`SetupCardApply`](#post-useragentmessagesetupcardapply). |
| `kind` | `string` | `add` (turn on a connector or skill), `remove` (turn one off), `connect` (connect a connector: save its key, or confirm a sign-in made on the card), `disconnect` (remove a connector's saved key), `schedule` (a scheduled task), `skill` (a custom skill) or `timezone`. |
| `action` | `string` | `schedule`: `create`, `update`, `pause`, `resume` or `delete`. `skill`: `create`, `update`, `append` (add text to the end), `revert` (undo the last change), `disable` or `enable`; see [Changing a custom skill](#setup-skill-cards). Absent on `add`, `remove`, `connect`, `disconnect` and `timezone` cards. |
| `connector` | `string` | `connect` and `disconnect` only. The connector's `key`, as [`POST /Credentials/List`](/docs/agent-credentials#post-credentialslist) lists it, for example `serper`. A card never holds a key's value. |
| `key` | `string` | `add`, `remove`, `schedule` and `skill` only. On `add` and `remove`: the name of one connector (`int-<name>`) or skill (`util-<name>`) as [`POST /Skills/List`](/docs/agent-skills#post-skillslist) lists it, up to 64 characters, for example `int-brevo-email`; see [Adding and removing connectors and skills](#setup-add-remove-cards). On `schedule` and `skill`: the scheduled task's key (`cs-cron-<name>`) or the custom skill's key (`cs-<name>`). |
| `title` | `string` | Optional. One line, up to 80 characters. |
| `cron` | `string` | `schedule` only: always on `create`, optional on `update`. A 5-field cron in the agent's time zone. A task set up from chat runs at most once an hour. |
| `instructions` | `string` | `schedule` and `skill` only. On `create` and `update`: the full text of the task or skill, up to 20,000 characters. On `append`: only the text to add, up to 20,000 characters. On `revert`: the text the skill goes back to, which Wiro takes from the skill's history; the agent never writes it. |
| `before` | `string` | `skill` cards with `update`, `append` or `revert` only. The skill's text when Wiro checked the card, written by Wiro, never by the agent. Show it as the text before the change; see [Changing a custom skill](#setup-skill-cards). It can be absent on older cards. |
| `with` | `string[]` | `add` and `remove` only, written by Wiro, never by the agent. The other connectors and skills the card turns on (`add`) or off (`remove`) together with `key`, by name, sorted, at most 12. |
| `pauses` / `resumes` | `string[]` | `add` and `remove` only, written by Wiro. The scheduled tasks (`cs-cron-<name>`) that pause, or run again, with this change, at most 20 each. |
| `needs` | `object[]` | `add` only, written by Wiro. The connectors the change brings that aren't connected yet, at most 3, each `{ connector, title, mode }`: `connector` is the connector's `key`, as a `connect` card names it, `title` is its name, and `mode` says how it is connected: `key` (with a key pasted in the chat or entered on its `connect` card), `signin` (with a sign-in through Wiro's app, on its `connect` card), `appkeys` (with the person's own app keys and then a sign-in, on its `connect` card), `token` (with a token Wiro checks, such as a Meta System User token, on its `connect` card) or `page` (set up outside the chat, with the credential endpoints or on the agent page: no card connects it). Read a mode you don't know as `page`. |
| `timezone` | `string` | `timezone` only. The proposed IANA time zone, for example `Europe/Istanbul`. |
| `note` | `string` | Optional. The agent's one-line note about the change, up to 300 characters. |
| `status` | `string` | `pending`, `applied`, `dismissed` or `failed`. Absent means `pending`. |
| `actedat` | `number` | Unix seconds when the card was applied, dismissed or failed. Absent while pending. |
| `actedby` | `string` | Account UUID of the person who applied or dismissed the card. Absent while pending. |
| `error` | `string` | `failed` only. A plain sentence that says why the change could not be made. When the cause was on Wiro's side, it reads `The change could not be applied. Try again in a moment.` |
| `requestedby` | `string` | Account UUID of the person whose message asked for the change. |
| `createdat` | `number` | Unix seconds when the agent proposed the change. |

Fields that don't apply to a card's kind are absent. More kinds and actions can be added later, so skip a card whose `kind` or `action` you don't know.

### Changing a custom skill

A `skill` card changes one of the agent's custom skills. `create` and `update` carry the skill's full text in `instructions`, and `disable` and `enable` turn the skill off and on. Two more actions keep a change to an existing skill small:

- **`append`** adds text to the end of the skill. `instructions` holds only the text to add, so a new rule goes into a long skill without the whole skill being sent again. Once applied, the skill's text is `before` with the whitespace at its end removed, a blank line, then `instructions`. Wiro refuses the card when the skill already holds that text, or when the skill would get too long to change from chat.
- **`revert`** undoes the skill's last change. The agent names only the skill, and Wiro puts the text to restore in `instructions`: the newest version in the skill's [version history](/docs/agent-overview#post-useragentcustomskillhistory) whose text differs from the current text. When the skill has no earlier version, Wiro refuses the card.

An `update`, `append` or `revert` card also has `before`, the skill's text when Wiro checked the card. Wiro writes it; the agent never does. Show it next to the text after the change, which is `instructions` on `update` and `revert` cards and the joined text on `append` cards: on a pending card as the current and the proposed text, and on an applied card as the text before and after the change. Don't read the skill's live text for this, since it already holds the change once the card is applied. `before` can be absent on older cards.

```json
{
  "v": 1,
  "id": "p7d2m4x9q1ka",
  "kind": "skill",
  "action": "append",
  "key": "cs-blog-writing",
  "instructions": "End every post with three questions readers ask, each with a two-sentence answer.",
  "before": "Write each blog post in a friendly, plain tone.\nKeep posts under 900 words.",
  "requestedby": "ada-uuid",
  "createdat": 1743350406
}
```

Once this card is applied, the skill reads:

```text
Write each blog post in a friendly, plain tone.
Keep posts under 900 words.

End every post with three questions readers ask, each with a two-sentence answer.
```

Wiro applies a card that has `before` only while the skill still holds that text. When the skill's text no longer matches `before` as the card is applied, for example because someone edited the skill on the agent page after the card was made, nothing changes and the card fails with `This skill changed after the card was made. Ask the agent again.`

### Adding and removing connectors and skills

An `add` card turns on one connector (`int-<name>`) or skill (`util-<name>`) that the agent doesn't have, and a `remove` card turns off one it has, as the agent page does. `key` holds its name as [`POST /Skills/List`](/docs/agent-skills#post-skillslist) lists it, one name per card. A change costs nothing: every plan includes every connector and skill, so the plan's price and credits stay the same. Cards work on agents deployed from a template and on custom builds, and once a card is applied, the agent restarts to load the change.

A change can turn on or off more than its `key`, so Wiro works out the rest and writes it on the card, and the person who approves sees the whole change. The agent never writes these fields: a proposal that sends them has them dropped.

- **`with`**: on an `add`, the connectors and skills `key` depends on (`depends_on` in Skills/List) that aren't on yet, which are turned on with it. On a `remove`, the linked partners the agent page turns off together with it (removing `util-video-creator` also turns off `util-motion-effects`), and the supporting parts (`user_invocable: false`) that nothing left on still needs.
- **`pauses`** and **`resumes`**: the scheduled tasks that stop running, or run again, because a connector or skill they use goes off or comes back on. A paused task keeps its text and schedule.
- **`needs`**: on an `add`, the connectors it brings that aren't connected yet. A connector with `mode` `key`, `signin`, `appkeys` or `token` gets a `connect` card, as below. One with `page` is set up outside the chat: no card connects it.

Read a missing list as empty. An `add` card for Brevo Email, which brings two skills it depends on and the Brevo connector:

```json
{
  "v": 1,
  "id": "m5t8c2w6r3pe",
  "kind": "add",
  "key": "int-brevo-email",
  "with": ["util-anti-ai-human-copy", "util-chat-markdown-reporting"],
  "needs": [{ "connector": "brevo", "title": "Brevo", "mode": "key" }],
  "requestedby": "ada-uuid",
  "createdat": 1743350406
}
```

A `remove` card keeps a connector's saved key, as turning a connector off on the agent page does, so adding it back later needs no new key. To remove the key too, use a [`disconnect` card](#setup-disconnect-cards).

**Adding a connector that takes a key.** When an `add` card's `needs` names a connector with `mode: "key"`, Wiro adds a `connect` card for that connector to the same reply, right after the `add` card, so the person sees both cards at once. It leaves the `connect` card out when the reply already has a pending `connect` card for that connector, or has no room for another card (a reply holds at most three). A reply keeps one pending `connect` card per connector, so a `connect` card the agent proposes for that connector afterwards isn't stored again. Wiro checks the `connect` card against the agent's setup as it will be once the `add` card is applied, since the connector isn't on yet. The `add` card goes first: until it is applied, applying the `connect` card changes nothing and answers `Apply card <N> first: it turns on <Title>.`, where `<N>` is the `add` card's number on the reply, and the `connect` card stays pending. In a typed chat, a `yes` applies the `add` card as it does any card other than `connect` (see [Approving a setup card](#approving-setup-cards)). Wiro's answer then ends by asking for the key, naming the connector by its `title` in `needs`: `Next: paste your <Title> key as your reply.` When the agent restarts to load the `add` card, that line goes on with `Send it now and it loads with this same restart.` The key pasted as the next reply applies the `connect` card. The key doesn't have to wait for the restart the `add` card started: Wiro saves it right away, whether it is pasted as the reply or entered on the `connect` card. A key saved while the agent is still stopping or queued for that restart loads with it, so adding and connecting the connector takes one restart; a key saved once the agent is starting or running again restarts it once more. The `add` card can also take the key itself and apply both cards in one step; see [Adding and connecting in one step](#setup-add-and-connect). A connector set up outside the chat (`mode: "page"`) gets no `connect` card: once the `add` card is applied, Wiro's answer says `Connect <Title> in the agent's settings.`, naming each such connector by its `title` in `needs`, and its `next` lists the connector with `mode: "page"` and no card. A connector that uses a sign-in gets one too; see [Connecting a sign-in connector](#setup-signin-cards).

Wiro checks an `add` or `remove` card when the agent proposes it and again when it is applied, and works out `with`, `pauses`, `resumes` and `needs` again. When the agent's connectors or skills changed in between, so that the card would now turn on more than it shows or turn off something else, nothing changes and the card fails with `This agent's connectors or skills changed after the card was made. Ask the agent again.` A dependency in `with` that was turned on in the meantime is not a change. An `add` card whose `key` itself was turned on in the meantime fails with `<Title> is already on.`, and a `remove` card whose `key` was turned off fails with `<Title> is not on this agent.`

Wiro refuses an `add` or `remove` card with one plain sentence when:

- the name isn't a connector or skill Wiro has, or the `add` names one Wiro no longer offers (the sentence names its replacement when there is one);
- it names a channel (Telegram, Slack or Discord), which is connected in the agent's settings, or a connector's key, such as `brevo`, instead of the name that uses it, such as `int-brevo-email`;
- it names a custom skill (`cs-<name>`), which a `skill` card turns on and off;
- it names a supporting part (`user_invocable: false`), which comes with the connectors and skills that need it and isn't turned on or off by itself;
- nothing would change: the `add` names one that is already on, or the `remove` one the agent doesn't have;
- it would change too much at once for a chat card: more than 12 connectors and skills in `with`, or more than 20 scheduled tasks in `pauses` or `resumes`. The sentence reads `<Title> changes too many connectors, skills or scheduled tasks at once for a chat card. Change it in the agent's settings.`;
- two connectors or skills that can't be on together (`conflicts_with`) would both be on;
- the `remove` would take away something that connectors or skills staying on need: remove those first, or keep it;
- voice calls would be left without a channel: with `util-voice-receptionist` on, Twilio Voice Channel (`int-twilio-channel`) or Web Voice Channel (`util-web-channel`) must be on.

A card refused as the agent proposes it is never stored. A card refused as it is applied changes nothing and fails, with the sentence in `error`.

### Adding and connecting in one step

An `add` card can take a key itself when its `needs` names a connector with `mode: "key"` and the same reply has a pending `connect` card for that connector, such as the one Wiro adds right after the `add` card. Wiro then applies the `add` card and, right after it, the `connect` card with the key, so both load with one restart.

**With SetupCardApply.** Send the `add` card's id to [`SetupCardApply`](#post-useragentmessagesetupcardapply) with the key in `values`, as you would send it with the `connect` card:

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Message/SetupCardApply" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "messageguid": "c3d4e5f6-a7b8-9012-cdef-345678901234",
    "cardid": "q4n7s1v8b2xd",
    "action": "apply",
    "values": { "apikey": "YOUR_SERPER_API_KEY" }
  }'
```

Wiro checks the values first, as applying the `connect` card would, against the connector as it will be once the `add` card is applied. When a value is refused, nothing is applied: both cards stay pending, and `errors[0].message` is the `connect` card's sentence, such as `Serper API Key must be at least 20 characters`. When the values pass, Wiro applies both cards and marks each one `applied`, and clients subscribed to the message's `agenttoken` get both new blocks. `setup` is the `add` card after the call, `summary` names both changes, and `paired` holds the `connect` card:

```json
{
  "result": true,
  "errors": [],
  "setup": {
    "v": 1,
    "id": "q4n7s1v8b2xd",
    "kind": "add",
    "key": "int-serper-search",
    "needs": [{ "connector": "serper", "title": "Serper Web Search", "mode": "key" }],
    "requestedby": "ada-uuid",
    "createdat": 1743350406,
    "status": "applied",
    "actedat": 1743350460,
    "actedby": "ada-uuid"
  },
  "restarting": true,
  "summary": "Serper Web Search added. Serper Web Search connected.",
  "paired": [
    {
      "setup": {
        "v": 1,
        "id": "h6w3k9p2m5tc",
        "kind": "connect",
        "connector": "serper",
        "requestedby": "ada-uuid",
        "createdat": 1743350406,
        "status": "applied",
        "actedat": 1743350460,
        "actedby": "ada-uuid"
      },
      "result": true,
      "error": null
    }
  ]
}
```

Send every field the connector needs. A connector with more than one field, such as WooCommerce, WordPress or Gmail, is connected only once all its required fields are saved. When `values` hold only some of them, Wiro still applies the `add` card, and the `connect` card saves the fields it got and stays pending: `result` is `true`, `summary` names only the `add` card, and `paired[0]` has `result: false` and the `error` `Saved <fields> for <Connector>. Still needed: <fields>.` Send the missing fields with the `connect` card to finish it.

When the `add` card fails as it is applied, for example with `Serper Web Search is already on.`, no key is saved. The `connect` card stays pending, and its `error` in `paired` reads `<Connector title> is not connected: <Title> was not added.` When the `add` card has no pending `connect` card to take the key, for example because its connector uses a sign-in or its `connect` card was turned down, Wiro answers `This card takes no key. Apply it without one.` When more than one of its connectors has a pending `connect` card, it answers `This card brings more than one key. Apply it, then add each key on its own card.` In both cases nothing changes and the card stays pending.

**In messages sent with a project API key.** When the only pending cards of the agent's latest reply are an `add` card and its `connect` card, and the key is all that connector needs, the [card listing](#setup-card-listing) ends by offering the key as the reply:

```text
The agent proposes this setup change. Nothing is applied yet.

Card 1: Add Serper Web Search (connector).
Still to connect: Serper Web Search.

Reply with your Serper Web Search key to add Serper Web Search and connect it at once, "yes" to add it now and give the key later, or "no" to turn it down.
```

Once Wiro has listed the `add` card, the key pasted as the reply applies both cards at once. Wiro reads the key from the reply by the same rules as in [Keys in chat](#keys-in-chat) and answers `✅ Applied: Serper Web Search added. Serper Web Search connected.`, followed by `Your agent is restarting to load the change. Continue in about a minute.` when the agent restarts. `setupresult.applied` holds both cards' ids, and the stored message reads `[key saved to Serper Web Search]` in the key's place. A key the check refuses applies neither card, and Wiro answers `⚠️ Not saved: <reason>. Paste the key again as your reply.` A `yes` after the listing applies the `add` card alone, and Wiro's answer ends by asking for the key with the `Next:` line. A key sent before Wiro has listed the `add` card saves nothing, since the person hasn't seen the change yet: the stored message reads `[key removed]` in its place, and Wiro answers with the listing. Send the key again after it. In the Wiro web chat, typed replies keep the two steps of [adding a connector that takes a key](#setup-add-remove-cards). A connector that needs more than its key, such as WooCommerce, WordPress or Gmail, keeps the usual listing: a `yes` applies the `add` card, and its fields go on the `connect` card, in the web chat or as SetupCardApply `values`. To add and connect it at once, send all of its fields as `values` with the `add` card, as above. While the `add` card waits, a key typed as the reply saves nothing.

### Connecting a sign-in connector

A sign-in connector is one with an `oauth_provider` in [`POST /Credentials/List`](/docs/agent-credentials#post-credentialslist), such as Google Analytics 4, Facebook or HubSpot. Its `mode` in `needs` says how its card connects it: `appkeys` takes the person's own app keys and then runs the sign-in, `token` takes a token and has Wiro check it (a Meta System User token, or Shopify's Client ID and Secret), and `signin` runs the sign-in with Wiro's app. Wiro adds its `connect` card to the reply with the `add` card that brings it, as for a key, and the agent can propose one for a sign-in connector that is on but not connected.

The card connects the connector with the endpoints and rules of your own integration: [`CredentialUpsert`](/docs/agent-overview#post-useragentcredentialupsert) for the app keys or the token, [`OAuthConnect`](/docs/agent-credentials#post-useragentoauthoauthconnect) for the sign-in or the check, [`OAuthStatus`](/docs/agent-credentials#post-useragentoauthoauthstatus) for the accounts it listed and [`SetPickerAccounts`](/docs/agent-credentials#post-useragentoauthsetpickeraccounts) for the ones picked. In the Wiro web chat the card does this for an agent admin; the agent never sees a key, a token or an account list, and a value typed into the chat is never saved to the connector.

Applying a sign-in `connect` card writes nothing. Wiro checks that the connector is connected, marks the card `applied` and answers `summary` `<Title> connected` with `restarting: false`, since the connection already restarted the agent if it needed to. Applied before the connection is complete, the card stays pending, with `errorcode: "not_connected"` and `<Title> is not connected yet. Finish the sign-in on the card first.` Sent with `values`, it stays pending with `errorcode: "signin_values"` and `<Title> connects with its sign-in on the card, not with typed values.` On a `token` card, both say `token check` in place of `sign-in`, such as `<Title> is not connected yet. Finish the token check on the card first.`

**Adding and connecting in one step.** Once the connector of an `add` card's sign-in `connect` card is connected, send the `add` card to [`SetupCardApply`](#post-useragentmessagesetupcardapply) with `signin: true`. Wiro first checks that the connector reads connected as the `add` card will leave it; when it doesn't, nothing is applied (`not_connected`). Then it applies the `add` card, which restarts the agent once, and the `connect` card, and answers as for a key: `summary` `<Add title> added. <Connector title> connected.` and the `connect` card in `paired`. A connection made while nothing on the agent used it restarted nothing, so adding and connecting a sign-in connector this way restarts the agent once. When the `add` card itself fails, the `connect` card stays pending and its `error` in `paired` reads `<Connector title> is connected, but <Add title> was not added.` `signin: true` on an `add` card with no pending sign-in `connect` card answers `signin_no_pair`, `This card has no sign-in to finish. Apply it without one.`, and on one that brings more than one, `signin_many`, `This card brings more than one sign-in. Apply it, then connect each on its own card.` `signin_no_pair` says `token check` in place of `sign-in` when every sign-in connector the `add` card names takes a token, and `signin_many` when every pending sign-in `connect` card it brings does. Without `signin`, the `add` card applies alone, as before, and its `connect` card stays pending.

**In messages sent with a project API key**, the connector is connected outside the chat, in your own product: its sign-in, app keys or token never go through the chat. When a `yes` applies an `add` card whose sign-in `connect` card still waits, Wiro's answer ends with `Next: connect <Title> to finish. Its sign-in, app keys or token are entered outside this chat, never in it.` A `yes` while only `connect` cards wait, one of them for a sign-in connector, applies nothing, starts no agent turn and is answered with `A yes cannot connect <Title>. Its sign-in, app keys or token are entered outside this chat, never in it.`, one line per sign-in card. Both answers name each such card in `setupresult.next`, with the connector's `mode`, `cardid` and `messageguid`: connect it with the endpoints above, then apply the card with [`SetupCardApply`](#post-useragentmessagesetupcardapply). A sign-in `connect` card refused with `not_connected` answers the same entry in `next`. Each mode's calls, with every request and answer, are in [Agent Chat Integration](/docs/agent-chat-integration#connecting-a-connector). In the Wiro web chat the same answers read `Next: connect <Title> with its card in this chat.` and `A yes cannot sign in for you. Connect <Title> with its card in this chat.`

### Disconnecting a connector

A `disconnect` card removes a connector's saved key, as clearing it on the agent page does. It names the connector in `connector` and never holds a value. Once it is applied, the agent restarts without the connector's key, and skills that use the connector stop until it is connected again. The `int-<name>` connector that uses the key stays turned on: a `remove` card turns it off.

Wiro takes a `disconnect` card only for a connector that meets all three: it is connected now, it is connected with a key (the kind a `connect` card saves), and the agent can run without it (`optional: true` in the `credentials` of [`UserAgent/Detail`](/docs/agent-overview#post-useragentdetail)). A connector turned off with a `remove` card counts too: its key stays saved, and a `disconnect` card can remove it even though nothing on the agent uses it any more. Connectors that use a sign-in (OAuth), channels (Telegram, Slack or Discord), the Wiro project the agent runs models with and connectors the agent needs to start are disconnected outside the chat, with the credential endpoints or on the agent page. A `yes` applies a `disconnect` card as it does any card other than `connect`.

### Approving a setup card

After proposing a card, the agent asks in one short line whether to apply it, or, for a `connect` card, says how to connect it. An agent admin approves one card at a time, in one of three ways:

1. **Reply yes.** Send a message that is only an approval, such as `yes`, `ok`, `approve`, `go ahead`, `evet` or `👍`, with [`Message/Send`](#post-useragentmessagesend) in the same session. It acts on the pending cards of the agent's latest reply that are less than 30 minutes old, and it applies one card, only one whose exact content Wiro has shown you.
2. **Press Apply** on the card in the Wiro web chat.
3. **Call** [`POST /UserAgent/Message/SetupCardApply`](#post-useragentmessagesetupcardapply) with the card's `id`. This also works after 30 minutes, as long as the card is pending.

What a `yes` does depends on where it is sent and how many cards are pending (`connect` cards don't count; see below):

| Pending cards | What `yes` does |
|---------------|-----------------|
| One, in the Wiro web chat | Applies it. The card is shown under the agent's reply. |
| One, in a message sent with a project API key | The first `yes` applies nothing: Wiro answers with the card's exact content (the [card listing](#setup-card-listing)). A second `yes` applies that card. |
| Several | The first `yes` gets the card listing, which numbers the cards. Then reply `yes` and a number, such as `yes 2`, to apply that card, one card per reply. A plain `yes` never applies one of several cards. In the web chat, the card's Apply button works too. |

A number works only for a card Wiro has listed: `yes 2` sent before the listing gets the listing. A message that says more, such as `yes, but at 10`, is an ordinary message for the agent. A reply such as `no` or `cancel` dismisses the pending cards of the latest reply that are less than 30 minutes old, as a `yes` acts only on those, and goes to the agent as usual. A row added to the session between turns, such as a scheduled task's report, becomes the latest reply, so a `yes` or `no` sent after it finds no cards. While the agent isn't running, Wiro answers such a reply itself when it turned cards down: `The setup change was turned down.` or `The <N> setup changes were turned down.`, with the cards' ids in `setupresult.dismissed`. A `connect` card needs its key or its sign-in, so a `yes` never applies one: when only `connect` cards for keys are pending, `yes` is an ordinary message, and when one of them is for a sign-in connector, Wiro answers the `yes` itself and says the connector is connected outside the chat (see [Connecting a sign-in connector](#setup-signin-cards)).

Wiro applies the stored card, checked again against the agent's current setup, never anything written in the reply. A card is applied at most once. When a `connect` card is applied, the other `connect` cards for the same connector still pending on the same person's messages in that chat from the last 7 days are marked `applied` too. `setup` and `setupresult` name only the card you acted on; History and Detail show the others. Only an agent admin can apply a card: a reply from anyone else changes nothing and gets `Only an agent admin can apply setup changes.` When a change needs a restart, the agent restarts to load it: continue the chat in about a minute. Replies Wiro handles itself don't have to wait for it; see [Replies Wiro handles itself](#handled-setup-replies). Cards that restart a starting or running agent: `add`, `remove`, `connect`, `disconnect` and `timezone` cards, a `schedule` or `skill` card that creates one, a `schedule` card that changes the `cron`, and `pause`, `resume`, `delete`, `disable` and `enable` cards. A card that changes only the text of a custom skill or scheduled task (`append`, `revert`, or an `update` that keeps the schedule) reaches a running agent without a restart, and `restarting` is `false`; if the agent can't take the new text, Wiro restarts it instead.

### The card listing

When a `yes` can't apply a card yet, Wiro answers it with the exact content of the pending cards and applies nothing. Each card has a number, its place on the agent's reply (1 to 3), a first line that says what it does, and the text it carries, each line starting with `> `. For one card, `response` reads:

```text
The agent proposes this setup change. Nothing is applied yet.

Card 1: Create scheduled task cs-cron-morning-summary (title: Morning summary), schedule 0 9 * * 1-5.
Instructions:
> Every weekday, summarize yesterday's orders and post the summary in the web chat.

Reply "yes" to apply exactly this change, or "no" to turn it down.
```

An `append` card's first line reads `Card 1: Add to custom skill <key>.`, followed by only the text it adds. A `revert` card's first line reads `Card 1: Undo the last change to custom skill <key>.`, followed by the text it restores. A `disconnect` card has one line: `Card 1: Disconnect <Connector> (its saved key is removed).`

An `add` or `remove` card names what it changes by title, never by key. Its first line is `Card 1: Add <Title> (connector).`, `Card 1: Add <Title> (skill).`, `Card 1: Remove <Title> (connector).` or `Card 1: Remove <Title> (skill).`, and only the lines that apply follow it: `Also turns on: <titles>.`, `Also turns off: <titles>.`, `Scheduled tasks that pause: <titles>.`, `Scheduled tasks that run again: <titles>.`, `Still to connect: <titles>.`, and `Its saved key stays saved.` for a connector removed while its key is saved. A `connect` card isn't listed: it waits for its key. When a message sent with a project API key gets the listing while the only pending cards are an `add` card and its `connect` card, and the key is all that connector needs, the listing's last line offers the key as the reply instead: `Reply with your <Connector title> key to add <Title> and connect it at once, "yes" to add it now and give the key later, or "no" to turn it down.` A connector that needs more keeps the usual last line. See [Adding and connecting in one step](#setup-add-and-connect).

With several cards, it starts with `The agent proposes these setup changes. Nothing is applied yet.` and ends with `To apply one, reply "yes" and its number, such as "yes 1", one card per reply. Reply "no" to turn them all down.` Show this text, as it is, to the person who approves. The listing is a reply Wiro handles itself (see [below](#handled-setup-replies)), and its `setupresult` lists no card.

### Keys in chat

While setup from chat is on for a message, Wiro keeps keys out of the agent's conversation:

- **A key as the reply.** When the agent's latest reply has one pending `connect` card and its connector takes one key (or has one required key field still empty), an agent admin can paste the key as the reply, a text message of up to 2,000 characters with no attachments. Wiro reads the key for that card only while its connector is on the agent, or a pending `add` card on the same reply names it in `needs` with `mode: "key"`; otherwise the key is only removed, as in any other message. Wiro takes the reply as the key when it is in that connector's own key format, when the whole message is one key-like word, or when the key follows a word such as `key` or `token` (`my key is ...`). A sentence that only holds an id, a URL, an email address or a plain word is an ordinary message, and the card stays pending. While the connector is on the agent, Wiro saves the key to it and marks the card applied. The key never reaches the agent, and the stored message reads `[key saved to <Connector title>]` in its place. A key in another service's format is not saved, and when the connector needs more fields, the card stays pending and Wiro's answer names them; see [Wiro's answers](#setup-reply-lines). A sign-in connector's `connect` card never takes a key from the reply. While a pending `add` card still brings the connector, the key is read for its card but not saved, since the `add` card goes first: Wiro answers `⚠️ Not saved: Apply card <N> first: it turns on <Title>. Paste the key again as your reply.`, the stored message reads `[key removed]` in its place, and both cards stay pending. The one exception is a message sent with a project API key when the only pending cards are that `connect` card and the `add` card that brings its connector, and the key is all that connector needs: once Wiro has listed the `add` card, the key applies both cards, and a key sent before that gets the listing. See [Adding and connecting in one step](#setup-add-and-connect).
- **Keys in other messages.** Wiro removes clear keys: a key format Wiro knows for a provider or connector, and a key written after a word such as `key`, `token`, `secret` or `password`. The stored text and the text the agent gets hold `[key removed]` in their place, and Send returns `contentmasked: true` with that text in `content`. The agent can then propose a `connect` card. Other ids, such as Google Sheet and Drive ids, commit hashes and order numbers, reach the agent unchanged. While a `connect` card of the latest reply waits for its key, every key-like word in any other text message of up to 2,000 characters is removed without being saved.
- From your own backend, save keys with [`POST /UserAgent/CredentialUpsert`](/docs/agent-overview#post-useragentcredentialupsert) instead of sending them in a message. An MCP client saves them with its `set_agent_credentials` tool.

### Replies Wiro handles itself

When Wiro handles a message itself (a `yes` that applies a card or gets the [card listing](#setup-card-listing), a key pasted as the reply, a reply refused because the sender isn't an agent admin, a `yes` while a sign-in `connect` card waits, or a `no` that turned cards down while the agent isn't running), no agent turn runs and no credits are used, even when the agent has no credits left. Wiro does this whatever the agent's status, so these replies also work while the agent is stopped or restarting. [`Message/Send`](#post-useragentmessagesend) answers at once with the result:

```json
{
  "result": true,
  "errors": [],
  "messageguid": "d4e5f6a7-b8c9-0123-def4-567890123456",
  "agenttoken": null,
  "status": "agent_end",
  "content": "yes",
  "response": "✅ Applied: Scheduled task Morning summary created.\nYour agent is restarting to load the change. Continue in about a minute.",
  "setupresult": {
    "applied": ["k3v9q2m8x1za"],
    "dismissed": [],
    "failed": [],
    "restarting": true
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `agenttoken` | `null` | There is no agent turn to follow on the WebSocket. |
| `status` | `string` | `"agent_end"`: the message is already finished. |
| `content` | `string` | The message as stored. A saved key reads `[key saved to <Connector title>]`. |
| `response` | `string` | Wiro's answer, always in English: the lines in [Wiro's answers](#setup-reply-lines), or the [card listing](#setup-card-listing). Read `setupresult` in code, not this text. |
| `setupresult` | `object` | `applied` and `dismissed`: the ids of the cards applied and dismissed. `failed`: `[{ id, error }]`. `restarting`: `true` when the agent restarts to load the change. All three lists are empty for a card listing. `next`: only when the answer leaves connectors to connect, `[{ connector, title, mode, cardid?, messageguid? }]`: first the `connect` cards its last lines name, each with its `cardid` and the `messageguid` of the message it is on, then each connector an applied `add` card brings that no card connects, such as one with `mode: "page"`, without a card. Never on a listing, a refusal or a `no`. |

The message is stored like any finished exchange: Message/Detail and Message/History return it with `status: "agent_end"`, `metadata.type: "setup_result"` and `model: null`. When the Send has a `callbackurl`, Wiro posts the result to it right away with `status: "agent_end"`, as for a finished turn, and its `metadata` holds `type: "setup_result"`, `cards` (the ids of the cards it acted on) and, when there is one, the same `next` as `setupresult`; see [Agent Webhooks](/docs/agent-webhooks).

A card applied while the agent is stopped doesn't start it: the agent loads the change the next time it starts, and `restarting` is `false`. While the agent isn't running, every message Wiro doesn't answer itself gets the [not-running refusal](#failure-responses) with `agentstatus`, a message with attachments or over 2,000 characters included.

### Wiro's answers

The lines Wiro writes in `response`:

| Line | When |
|------|------|
| `✅ Applied: <summary>.` | The card was applied. The summary says what changed, such as `Scheduled task Morning summary created`, `Custom skill Weekly report updated` (also for an `append` card), `Custom skill Weekly report restored`, `Custom skill Weekly report turned off`, `Time zone set to Europe/Istanbul`, `<Connector> connected`, `<Connector> disconnected`, `Brevo Email added` or `Weather removed`. An `add` card applied together with its `connect` card's key names both, as in `✅ Applied: Serper Web Search added. Serper Web Search connected.` An `add` card that brings a connector set up outside the chat, or a sign-in connector with no pending `connect` card on the reply, goes on with `Connect <Title> in the agent's settings.`, naming each such connector by its `title` in `needs`. |
| `⚠️ Not applied: <reason>` | The change failed. The card's `status` is now `failed`, with the same reason in `error`. For example, `This skill changed after the card was made. Ask the agent again.` means the skill's text changed after an `update`, `append` or `revert` card was made. `<Title> is not on this agent: add it first, then connect it.` means a `connect` card's connector comes with a connector that isn't on, `<Title>`, and no pending `add` card on the reply turns it on, for example because that `add` card failed or was turned down. When more than one connector brings it, the sentence names them all and reads `add one first`. |
| `Your agent is restarting to load the change. Continue in about a minute.` or `Your agent is restarting to load the change.` | The change restarts the agent, or loads with a restart already under way, such as the one an `add` card started. The shorter line comes when the answer ends with a `Next:` line, which follows it. |
| `1 more setup change is still pending.` or `<N> more setup changes are still pending.` | Other cards of the same reply still wait. Reply `yes` and a card's number to apply the next one. |
| `Next: paste your <Title> key as your reply.` or `<N> connector cards still need their keys: add each key on its card.` | `connect` cards of the same reply still wait for their keys, such as the `connect` card that came with an `add` card just applied. A sign-in `connect` card is never counted. A `connect` card whose connector still waits for an `add` card that failed or was turned down isn't counted. When one card is counted, the `Next:` line ends the answer. `<Title>` is the connector's `title` in the `needs` of an `add` card on the same reply, or, when no `add` card names it, the connector's name in the agent's setup, such as `Serper Web Search`. When the answer says the agent is restarting, the line goes on with `Send it now and it loads with this same restart.`, since a key saved while the agent is still stopping or queued for that restart loads with it. |
| `Next: connect <Title> to finish. Its sign-in, app keys or token are entered outside this chat, never in it.` or `Next: connect <Title> with its card in this chat.` | A `yes` applied an `add` card whose sign-in `connect` card still waits. In a message sent with a project API key, the connector is connected outside the chat, and `setupresult.next` names its card; in the Wiro web chat, the card connects it. See [Connecting a sign-in connector](#setup-signin-cards). |
| `A yes cannot connect <Title>. Its sign-in, app keys or token are entered outside this chat, never in it.` or `A yes cannot sign in for you. Connect <Title> with its card in this chat.` | A `yes` while only `connect` cards wait, one of them for a sign-in connector. Nothing is applied and no agent turn runs. One line per sign-in card; key cards waiting with them keep their `Next:` line. In a message sent with a project API key, `setupresult.next` names the cards. |
| `Saved <fields> for <Connector>. Still needed: <fields>.` | The pasted key was saved, and the connector needs more fields. The card stays pending: add the rest on the card, or with [`CredentialUpsert`](/docs/agent-overview#post-useragentcredentialupsert). When Wiro can't name the missing fields, the second sentence reads `It is not connected yet: finish it in the agent's settings.` |
| `⚠️ Not saved: <reason>. Paste the key again as your reply.` | The pasted key was refused, for example because it is too short. Nothing was saved and the card stays pending. When the key was for an `add` card and its `connect` card, neither is applied. |
| `⚠️ Not saved: <Title> is still waiting. Reply "yes" to add it, or "no" to turn it down.` | In a chat over a project API key, a key came for an `add` card and its `connect` card after the `connect` card was applied, turned down or settled elsewhere. Nothing was saved, and the `add` card still waits for a `yes` or a `no`. |
| `That does not look like a <Connector> key, so it was not saved. Paste the <Connector> key as your reply.` | The reply holds a key in another service's format, while the latest reply's only pending `connect` card is for a connector that takes a key and is already on the agent. It comes whoever sent the key. Nothing was saved, the stored message reads `[key removed]` in its place, and the card stays pending. When Wiro knows the format, the sentence names it, such as `(it looks like <kind>)`. Before a name that starts with a vowel, `a` becomes `an`, as in `an Apollo key`. While the connector isn't on the agent yet, as while the `add` card that brings it still waits, such a key is only removed, as in any other message. |
| `This setup change is being applied right now. Try again in a moment.` | Someone is applying the same card at this moment, or, for an `add` or `remove` card, another change to the agent's connectors and skills is going through. The card is still pending. |
| `This setup change was already handled.` | The card was applied or dismissed before this reply arrived. |
| `This card is older than 30 minutes. Use the card's button, or ask the agent again.` | The card turned 30 minutes old while the reply was handled. Apply it with its button or [`SetupCardApply`](#post-useragentmessagesetupcardapply). |
| `Only an agent admin can apply setup changes.` | The sender isn't an agent admin. Nothing changed. |
| `The setup change was turned down.` or `The <N> setup changes were turned down.` | A `no` or `cancel` sent while the agent isn't running turned the pending cards down. `setupresult.dismissed` holds their ids. While the agent runs, the `no` goes on to the agent like any other message. |
| `The agent proposes this setup change. Nothing is applied yet.` | The start of the [card listing](#setup-card-listing). Nothing changed. |

## **POST** /UserAgent/Message/SetupCardApply

Applies or dismisses one setup card, or applies an `add` card together with its `connect` card when the key comes with it or its sign-in is done; the card's buttons in the Wiro web chat call it too. Wiro applies the stored card, checked again against the agent's current setup. See [Setup From Chat](#setup-from-chat).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | The agent instance GUID. |
| `messageguid` | string | Yes | The message that holds the card: the row whose `timeline[]` has the `setup` block. |
| `cardid` | string | Yes | The card's `setup.id`. |
| `action` | string | Yes | `"apply"` or `"dismiss"`. |
| `values` | object | No | `connect` cards, and `add` cards that bring a connector with a pending `connect` card: `{ "<fieldname>": "<value>" }` for the connector's fields, as [`POST /Credentials/Detail`](/docs/agent-credentials#post-credentialsdetail) lists them. Only text, password, URL and email fields, up to 4,096 characters each. On an `add` card they are the values of its `connect` card, and Wiro applies both cards in one step. Send every field the connector needs: with only some of them, the `add` card is applied and the `connect` card saves those fields and stays pending. See [Adding and connecting in one step](#setup-add-and-connect). Wiro saves them to the connector; they are never returned and never reach the agent. |
| `signin` | boolean | No | `true`, with `action: "apply"`, on an `add` card whose sign-in `connect` card's connector is now connected: Wiro applies both cards in one step. Never with `values` (`Send values or signin, not both.`). See [Connecting a sign-in connector](#setup-signin-cards). |

**Permission**: applying needs an agent admin (the owner, or an admin of the agent's team). Any member who can see the chat can dismiss. The message must be one you can read with [Message/History](#post-useragentmessagehistory) (in private Chat Mode, your own messages), and the card must be pending: an applied or dismissed card is never applied again.

### Request

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Message/SetupCardApply" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "messageguid": "c3d4e5f6-a7b8-9012-cdef-345678901234",
    "cardid": "k3v9q2m8x1za",
    "action": "apply"
  }'
```

### Response

```json
{
  "result": true,
  "errors": [],
  "setup": {
    "v": 1,
    "id": "k3v9q2m8x1za",
    "kind": "schedule",
    "action": "create",
    "key": "cs-cron-morning-summary",
    "title": "Morning summary",
    "cron": "0 9 * * 1-5",
    "instructions": "Every weekday, summarize yesterday's orders and post the summary in the web chat.",
    "requestedby": "ada-uuid",
    "createdat": 1743350406,
    "status": "applied",
    "actedat": 1743350460,
    "actedby": "ada-uuid"
  },
  "restarting": true,
  "summary": "Scheduled task Morning summary created"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `setup` | `object\|null` | The card after the action, in the same shape as a [setup block](#setup-blocks)'s `setup`. `null` when the call is refused before the card is read: a missing parameter, an agent or message the caller can't reach, Setup From Chat off, a reply still being written, a caller who isn't an agent admin, a card someone else is applying at that moment, or a card that isn't there. |
| `restarting` | `boolean` | `true` when the agent restarts to load the change. Continue the chat in about a minute. |
| `summary` | `string` | A short English phrase that says what changed, such as `Scheduled task Morning summary created` or `Brevo Email added`. An `add` card applied with its `connect` card names both: `Serper Web Search added. Serper Web Search connected.` Empty when nothing was applied. |
| `paired` | `object[]` | Only when `values` or `signin: true` are sent with a pending `add` card: its `connect` card after the call, as `[{ setup, result, error }]`. `setup` has the same shape as above, `result` is `true` when the card was applied with the key, and `error` is `null` or the sentence that says why not, such as `Saved <fields> for <Connector>. Still needed: <fields>.` when `values` held only some of the connector's fields. Empty when there is no single `connect` card to take the key. See [Adding and connecting in one step](#setup-add-and-connect). |
| `errorcode` | `string` | Why a sign-in `connect` card, or an `add` card sent with `signin: true`, wasn't applied: `not_connected`, `signin_values`, `signin_no_pair` or `signin_many`. Absent otherwise. |
| `next` | `object[]` | Only when the call leaves connectors to connect: `[{ connector, title, mode, cardid?, messageguid? }]`. An `add` card applied, alone, with `values` or with `signin: true`, lists its connectors that aren't connected yet, without the one its `connect` card connected in the same call. A sign-in `connect` card refused with `not_connected` or `signin_values` lists its own connector and card. A `connect` card for a connector set up outside the chat lists it with `mode: "page"`. `cardid` and `messageguid` name the pending `connect` card that records the connection once it is made; a `page` entry has neither. Absent on the other refusals and on a dismissal. |

| Error | When |
|-------|------|
| `Setup from chat is off for this agent.` | `chatsetup` is `"off"`, or the call is sent with a project API key and `chatsetup` is `"webchat"`. |
| `Wait until the agent finishes this reply, then apply it.` | `action` is `"apply"` while the reply that holds the card is still being written. `"dismiss"` works at any time. |
| `Only an agent admin can apply setup changes.` | The caller can see the chat but isn't an agent admin. |
| `Saved <fields> for <Connector>. Still needed: <fields>.` | A `connect` card's `values` were saved, and the connector needs more fields. The card stays pending and `restarting` can be `true`. Send the missing fields with the same card to finish it. Sent with an `add` card, the `add` card is applied, `result` is `true`, and this sentence is `paired[0].error` instead. |
| `The change could not be applied. Try again in a moment.` | The change failed on Wiro's side. The card's `status` is now `failed`. |
| `This skill changed after the card was made. Ask the agent again.` | An `update`, `append` or `revert` card whose skill text no longer matches its `before`: someone changed the skill after the card was made. Nothing changed, and the card's `status` is now `failed`. |
| `This agent's connectors or skills changed after the card was made. Ask the agent again.` | An `add` or `remove` card whose change no longer matches the agent's connectors and skills: it would turn on more than it shows, or turn off something else. Nothing changed, and the card's `status` is now `failed`. |
| `Apply card <N> first: it turns on <Title>.` | A `connect` card whose connector comes with an `add` card on the same message that isn't applied yet. Nothing is saved and the card stays pending: apply the `add` card first, or send the values with the `add` card to apply both. |
| `<Title> is not on this agent: add it first, then connect it.` | A `connect` card whose connector comes with a connector that isn't on, `<Title>`, when no pending `add` card on the message turns it on, for example because that `add` card failed or was turned down. Nothing is saved, and the card's `status` is now `failed`. When more than one connector brings it, the sentence names them all and reads `add one first`. |
| `This card takes no key. Apply it without one.` | `values` sent with an `add` card that has no pending `connect` card to take them. Nothing changed and the card stays pending. |
| `This card brings more than one key. Apply it, then add each key on its own card.` | `values` sent with an `add` card that brings more than one connector with a pending `connect` card. Nothing changed and the card stays pending. |
| `<Title> is not connected yet. Finish the sign-in on the card first.` | `errorcode: "not_connected"`. A sign-in `connect` card, or an `add` card sent with `signin: true`, whose connector isn't connected yet. Nothing changed and the cards stay pending. For a `token` connector: `<Title> is not connected yet. Finish the token check on the card first.` On a `connect` card, `next` names its connector and the card. |
| `<Title> connects with its sign-in on the card, not with typed values.` | `errorcode: "signin_values"`. `values` sent with a sign-in `connect` card. The card stays pending. For a `token` connector: `<Title> connects with its token check on the card, not with typed values.` |
| `This card has no sign-in to finish. Apply it without one.` | `errorcode: "signin_no_pair"`. `signin: true` on an `add` card with no pending sign-in `connect` card. Nothing changed. When every sign-in connector the card names takes a token: `This card has no token check to finish. Apply it without one.` |
| `This card brings more than one sign-in. Apply it, then connect each on its own card.` | `errorcode: "signin_many"`. `signin: true` on an `add` card that brings more than one sign-in connector with a pending `connect` card. Nothing changed. When each of those cards is a `token` card: `This card brings more than one token check. Apply it, then connect each on its own card.` |
| `Send values or signin, not both.` | Both were sent with the same call. |
| `<Title> is connected in the agent's settings, not from chat.` | A `connect` card whose connector is set up outside the chat. Nothing changed, the card stays pending, and `next` lists the connector with `mode: "page"`. |
| Another sentence in `errors[0].message` | The message or card wasn't found, the card is no longer pending, a value was refused (nothing is saved and the card stays pending; on an `add` card, neither card is applied), or the change no longer fits the agent's setup. When the change itself fails, the card's `status` becomes `failed` with the sentence in `error`. |

## Session Management

Sessions let you maintain separate conversation threads with the same agent:

- Each `sessionkey` represents a separate conversation: the agent remembers context within a session
- The default session key is `"default"` if you don't specify one
- Use unique session keys per end-user for multi-tenant applications (e.g. `"user-42"`, `"customer-abc"`)
- Sessions persist across API calls: send the same `sessionkey` to continue a conversation
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

Render each reasoning block as its own accessible `Thinking` disclosure at its timeline position. Never combine reasoning blocks across calls, and never move them above or below answer/tool blocks to force an answer-first layout. Every reasoning block contains only the model-provided reasoning summary; raw chain-of-thought is never returned. `agent_output` is still useful for immediate accumulated answer typing, but it does not define the durable block order.

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

**4. Provisional streaming output event** (emitted multiple times, so replace your typing surface with `message.raw` on each event):

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
| `message.speedType` | `string` | Unit for speed: `"words/s"` (words per second). |
| `message.elapsedTime` | `string` | Elapsed time since generation started (e.g. `"3.2s"`). |
| `message.tokenCount` | `number` | Number of answer chunks received so far. Final model tokens arrive separately in `agent_usage_report`. |
| `message.wordCount` | `number` | Number of words generated so far. |
| `message.raw` | `string` | Full accumulated raw output text. |
| `message.answer` | `string[]` | Array of answer blocks: the content to display. |

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
