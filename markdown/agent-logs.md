# Agent Logs

Per-instance activity feed (tool calls, scheduled cron runs, message exchanges, and turn boundaries) for any deployed agent.

## Overview

Every Wiro agent appends one structured `ActivityEvent` JSON line per tool call, LLM turn boundary, scheduled task run and billed turn, plus each message that arrives on a connected Telegram, Slack or Discord channel. Secrets (matched by field name and by high-entropy value), internal tool-call IDs and API credentials are redacted before an event is written, so what shows up in `Logs` is safe to show end users.

A daily JSONL file is written for each calendar day; files older than 7 days are gzipped, files older than 180 days are deleted by the agent's daily maintenance cron.

The feed also lists what people and API keys did to the agent: starts and stops, renames, skill, connector and billing changes, connections and deleted log days, each with who did it. These [who-did-what rows](#who-did-what-rows) don't depend on the agent running.

The endpoints below are **owner-or-team-admin** scoped. Plain members of the agent's team receive `useragent-team-admin-required` (code `97`); outside callers receive `useragent-access-denied`.

| Endpoint | Purpose |
|----------|---------|
| `POST /UserAgent/Logs` | Live tail (last N events for today, or a specific date). Poll it every 30 seconds or more. |
| `POST /UserAgent/LogsList` | List the days (`YYYY-MM-DD`) that have activity, with the size of each day's log. |
| `POST /UserAgent/LogsFile` | Read the **full** log of a specific date. |
| `POST /UserAgent/LogsDelete` | Delete the agent's own turns and tool calls for one date. Idempotent. |

> **Activity feed vs `Message/History`.** `Message/History` is a chat-bubble-level read of the conversation. `Logs` is a **runtime** view: every tool call, every turn and every scheduled task run. They serve different audiences (`Message/History` for end users, `Logs` for operators / power users).

## ActivityEvent Shape

Every event is a JSON object with this base shape:

```json
{
  "ts": "2026-05-03T14:00:10.234Z",
  "kind": "tool_completed",
  "tool": "web_fetch",
  "title": "Fetched https://blog.example.com/weekly-roundup-12",
  "summary": {
    "url": "https://blog.example.com/weekly-roundup-12",
    "status": 200,
    "bytes": 18432
  },
  "durationMs": 1840,
  "ok": true,
  "userUuid": "ada-uuid",
  "user": {
    "uuid": "ada-uuid",
    "firstname": "Ada",
    "lastname": "Lovelace",
    "email": "ada@example.com",
    "username": "ada",
    "avatar": "https://cdn.wiro.ai/avatars/ada.webp",
    "avatarinitials": "AL"
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `ts` | `string` | ISO-8601 UTC datetime when the event was recorded (e.g. `"2026-05-03T14:00:10.234Z"`). Parse with `Date.parse(ts)` for arithmetic. |
| `kind` | `string` | Fine-grained event class. One of: `"turn_started"`, `"turn_ended"` (an LLM turn boundary); `"tool_started"`, `"tool_completed"` (one pair per tool call); `"tool_blocked"` (a tool call the agent's safety rules refused); `"cron_finished"` (a scheduled task finished); `"user_message"` (a message received on a connected Telegram, Slack or Discord channel, not web chat); `"token_usage"` (a billed turn's token usage: chat / cron / voice post-call); `"token_usage_idempotent"` (a replayed usage report, already billed, informational only); `"media_relay"` (files from a reply were delivered); `"background_reply"` (a result that finished in the background was delivered to the chat). Rows about what was done to the agent have [`AGENT_*` kinds](#who-did-what-rows), and two note rows, `"runtime_log_unavailable"` and `"runtime_log_deleted"`, say what part of a day is missing. Show any kind you don't recognize by its `title`. |
| `tool` | `string?` | Present on `tool_started` / `tool_completed` / `tool_blocked`. The name of the tool the agent used. |
| `title` | `string` | Human-readable one-line description of what happened (e.g. `"Posted carousel: \"Brand voice teaser\""`, `"Fetched https://…"`, `"Token Usage"`). Always present. |
| `summary` | `object?` | Structured event-specific payload. Opaque on the wire, so render it as JSON when expanding the row. Secret values (`apikey`, `apppassword`, `clientsecret`, `bearer`, `token`, …) are masked before the event is written. Common keys: `file`, `method`, `host`, `path`, `preview`, `messageCount`, `jobId`, `status`, `reason`. |
| `durationMs` | `number?` | Wall-clock duration in milliseconds. Populated on `tool_completed`, `turn_ended`, `cron_finished` and `token_usage` events. |
| `ok` | `boolean?` | `true` for a successful completion, `false` for a failure. Populated on `tool_completed`, `turn_ended` and `cron_finished` events, and always `false` on `tool_blocked`. Pair with `error` for failure rows. It is always `true` on `AGENT_*` rows. A `turn_ended` for a turn the caller cancelled has no `ok`, and its title reads `Agent turn cancelled`. |
| `error` | `string?` | One-line failure message (when `ok: false`). |
| `cost` | `object?` | Legacy per-action credit charge, `{ credits, skill, action }`. Only events recorded before agents switched to per-turn token billing can carry it; current events never do. See the `token_usage` event for what a turn cost. |
| `userUuid` | `string?` | UUID of the actor who triggered the event. `"system"` for cron / internal events. May be missing on older rows, in which case the server falls back to the agent owner. |
| `user` | `object\|null` | Resolved actor: `{ uuid, firstname, lastname, email, username, avatar, avatarinitials }`. `null` when `userUuid` is `"system"` (automation / cron) or when the user record was deleted. |

> **What is `summary` for?** Tool events carry a short summary of the call: for example the file path for file tools, the program for `exec`, or the method, host and path for web requests. Turn events carry a short `preview` (plus `messageCount` on `turn_ended`); `cron_finished` carries `{ jobId, status }`; `user_message` carries `{ preview }`; `tool_blocked` carries the `reason`. Treat the object as opaque and render-on-expand, since its shape depends on the tool and may change without a docs revision.

### Token-usage events

A `token_usage` event records the token spend and credit deduction for one billed turn: a chat reply, a cron run, or a voice post-call. A `token_usage_idempotent` event carries the **same shape** for a replayed usage callback that was already billed (informational; it does not deduct again). On top of the base `ActivityEvent` fields, these events add:

| Field | Type | Description |
|-------|------|-------------|
| `model` | `string` | Canonical model slug that served the turn (e.g. `"openai/gpt-5.4"`). |
| `tokens` | `object` | Nested token counts in **camelCase**: `{ input, output, cacheRead, cacheWrite, total }` (each an integer). |
| `tokencost` | `number` | Credits deducted for the turn (1 credit = $0.01). |
| `durationMs` | `number` | Wall-clock duration of the turn in milliseconds. |
| `calls` | `number` | Number of LLM calls made during the turn. |
| `remainingcredits` | `number` | Credit pool remaining after the deduction. |

```json
{
  "ts": "2026-05-03T14:02:55.310Z",
  "kind": "token_usage",
  "title": "Token Usage",
  "model": "openai/gpt-5.4",
  "tokens": { "input": 3450, "output": 820, "cacheRead": 2400, "cacheWrite": 0, "total": 6670 },
  "tokencost": 5,
  "durationMs": 4200,
  "calls": 2,
  "remainingcredits": 9995,
  "userUuid": "system",
  "user": null
}
```

> **Nested vs flat token fields.** The activity-log `token_usage` event nests its counts in **camelCase** under `tokens.{input, output, cacheRead, cacheWrite, total}`. `input` is uncached input and `total` is the exact sum of all four components. This is distinct from the **flat, lowercase** columns on message rows (`inputtokens`, `outputtokens`, `cachereadtokens`, …). Same underlying data, different shape.

> **Credits vs. wallet.** An agent's own credits are spent once per LLM turn: each `token_usage` event is one billed turn, and its `tokencost` is in credits (100 credits = $1). A Wiro model the agent runs, for example through `int-wiro-aimodels`, is billed separately: Wiro charges it to the wallet of the workspace that owns the agent's Wiro API key at the model's usual price, passed through unchanged. That run shows up as an ordinary `tool_completed` event with no credit figure; its cost is the task's `totalcost` (see [Billing & Cost](/docs/tasks#task-billing)).

### Who-did-what rows

`Logs` and `LogsFile` also return what people and API keys did **to** the agent, and `LogsList` lists the days that have such rows. These rows sit in the same `events` list, in time order, with an `AGENT_*` value in `kind`. They come on top of the kinds above, which keep their meaning.

```json
{
  "ts": "2026-05-03T09:12:44.000Z",
  "kind": "AGENT_RENAMED",
  "title": "Agent renamed from \"Inbox Bot\" to \"Inbox Watcher\"",
  "ok": true,
  "summary": { "title": "Inbox Watcher", "previoustitle": "Inbox Bot", "fields": ["title"] },
  "userUuid": "ada-uuid",
  "user": {
    "uuid": "ada-uuid",
    "firstname": "Ada",
    "lastname": "Lovelace",
    "email": "ada@example.com",
    "username": "ada",
    "avatar": "https://cdn.wiro.ai/avatars/ada.webp",
    "avatarinitials": "AL"
  }
}
```

`title` is the line to show. `summary` holds the names and amounts behind it, never a connector value. `userUuid` and `user` name who did it. When an API key made the change, the title ends with `(API key "<project name>")` or `(via API key)`.

| `kind` | Example `title` |
|--------|-----------------|
| `AGENT_STARTED`, `AGENT_STOPPED`, `AGENT_RESTARTED` | `Agent started`, `Agent stopped`, `Agent restarted` |
| `AGENT_RENAMED` | `Agent renamed from "Inbox Bot" to "Inbox Watcher"` |
| `AGENT_UPDATED` | `Agent details updated: description, cover` |
| `AGENT_SETTINGS_UPDATED` | `Agent settings updated: timezone Europe/Istanbul` |
| `AGENT_TRANSFERRED` | `Agent moved to a team workspace`, `Agent moved to the personal workspace` |
| `AGENT_INSTRUCTION_ADDED`, `AGENT_INSTRUCTION_UPDATED`, `AGENT_INSTRUCTION_RENAMED`, `AGENT_INSTRUCTION_DELETED`, `AGENT_INSTRUCTION_REVERTED` | `Custom skill added: cs-brand-voice`, `Scheduled task updated: cs-cron-blog-scanner (text, schedule 0 9 * * 1)`, `Custom skill renamed: cs-brand-voice to cs-house-style`, `Scheduled task deleted: cs-cron-blog-scanner`, `Custom skill reverted to its preset: cs-brand-voice` |
| `AGENT_SKILLS_UPDATED` | `Connectors updated: int-gmail-check on`, `Skills updated: util-web-channel off`, `Connectors and skills updated: int-gmail-check on, util-web-channel off; $1.20 charged` |
| `AGENT_CREDENTIAL_SAVED` | `Connector setting saved: wiro.apikey` |
| `AGENT_OAUTH_CONNECT_STARTED`, `AGENT_OAUTH_CONNECTED`, `AGENT_OAUTH_DISCONNECTED` | `Connection started: instagram (own)`, `Connected: instagram`, `Disconnected: instagram` |
| `AGENT_PLAN_STARTED`, `AGENT_PLAN_RENEWED`, `AGENT_PLAN_CANCELLED`, `AGENT_PLAN_RESUMED` | `Plan started: $9.00 charged`, `Plan renewed: $9.00 charged`, `Plan cancelled, ends 2026-06-01`, `Plan cancellation undone` |
| `AGENT_TIER_UPGRADED` | `Tier upgraded from starter to pro; $40.50 charged` |
| `AGENT_CREDITS_PURCHASED` | `Extra credits bought: small pack, 4500 credits, $45.00 charged` |
| `AGENT_CHECKOUT_CREATED` | `Card checkout link created: plan` |
| `AGENT_LOG_DAY_DELETED` | `Activity log day deleted: 2026-05-02` |

#### Note rows

Two more kinds say what part of a day is missing. They are notes, so they carry a `title` and no `ok`.

| `kind` | `title` | When |
|--------|---------|------|
| `runtime_log_unavailable` | `The agent's own turns and tool calls can be read while it runs` | The agent isn't running, so only its who-did-what rows are listed. |
| `runtime_log_unavailable` | `The agent's own turns and tool calls could not be read just now` | The agent's host did not answer. Read the day again later. |
| `runtime_log_deleted` | `The agent's own turns and tool calls for this day were deleted on 2026-05-04` | The day's log was deleted on a later day with `LogsDelete`. The day's who-did-what rows follow it. |

## **POST** /UserAgent/Logs

Live tail of the agent's activity feed. Returns the last N events for the requested date (defaults to today).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Your UserAgent instance guid. |
| `date` | string | No | `YYYY-MM-DD` to read a specific day's file. Default: today (UTC). |
| `lines` | number | No | Max events to return (max 5000). Default: `200`. |

**Polling:** leave 30 seconds or more between repeated polls.

##### Request

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Logs" \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321", "lines": 200 }'
```

##### Response

```json
{
  "result": true,
  "errors": [],
  "date": "2026-05-03",
  "totalLines": 1428,
  "events": [
    {
      "ts": "2026-05-03T14:02:55.310Z",
      "kind": "token_usage",
      "title": "Token Usage",
      "model": "openai/gpt-5.4",
      "tokens": { "input": 3450, "output": 820, "cacheRead": 2400, "cacheWrite": 0, "total": 6670 },
      "tokencost": 5,
      "durationMs": 4200,
      "calls": 2,
      "remainingcredits": 9995,
      "userUuid": "system",
      "user": null
    },
    {
      "ts": "2026-05-03T14:02:54.902Z",
      "kind": "tool_completed",
      "tool": "exec",
      "title": "POST api.wiro.ai/v1/Run/google/nano-banana",
      "summary": {
        "method": "POST",
        "host": "api.wiro.ai",
        "path": "/v1/Run/google/nano-banana",
        "headers": ["Content-Type: application/json", "x-api-key: ***"],
        "body": { "prompt": "A paper boat on a calm lake at sunrise" }
      },
      "durationMs": 640,
      "ok": true,
      "userUuid": "system",
      "user": null
    },
    {
      "ts": "2026-05-03T14:00:10.305Z",
      "kind": "tool_completed",
      "tool": "exec",
      "title": "Posted: \"Weekly Roundup\"",
      "summary": {
        "title": "Weekly Roundup",
        "url": "https://blog.example.com/weekly-roundup-12",
        "categories": ["AI", "Tutorial"]
      },
      "durationMs": 1840,
      "ok": true,
      "userUuid": "system",
      "user": null
    },
    {
      "ts": "2026-05-03T13:30:00.000Z",
      "kind": "cron_finished",
      "title": "Cron ran: Scheduled Skill (cs-cron-blog-scanner)",
      "summary": { "jobId": "0f3c2a1b-7d4e-4c8f-9a6b-2e5d1c7f8a90", "status": "ok" },
      "durationMs": 4210,
      "ok": true,
      "userUuid": "system",
      "user": null
    },
    {
      "ts": "2026-05-03T13:14:42.118Z",
      "kind": "turn_ended",
      "title": "Agent turn completed",
      "summary": {
        "preview": "Here is this week's roundup draft…",
        "messageCount": 6
      },
      "durationMs": 8104,
      "ok": true,
      "userUuid": "ada-uuid",
      "user": {
        "uuid": "ada-uuid",
        "firstname": "Ada",
        "lastname": "Lovelace",
        "email": "ada@example.com",
        "username": "ada",
        "avatar": "https://cdn.wiro.ai/avatars/ada.webp",
        "avatarinitials": "AL"
      }
    }
  ]
}
```

> **About the `user` field.** Every event is decorated with the resolved actor: `{ uuid, firstname, lastname, email, username, avatar, avatarinitials }`.
>
> - An event with a user's `userUuid` carries that user's profile, or `null` when the user record was deleted.
> - An event triggered by **automation** has `userUuid: "system"` and `user: null`. That covers cron runs, the token usage of scheduled turns, and similar non-interactive writes (the system rows above).
> - An event without a `userUuid` (an incoming channel message, or a row older than user attribution) carries the agent owner's profile, so the row never shows an empty placeholder.

| Field | Type | Description |
|-------|------|-------------|
| `date` | `string\|null` | The actual date the events were read from (`YYYY-MM-DD`). |
| `totalLines` | `number` | Total rows for the day, who-did-what rows and notes included, whatever the `lines` cap. |
| `events` | `array<ActivityEvent>` | Newest first (descending by `ts`): `events[0]` is the most recent event; do not re-reverse. |

With a `lines` cap, older who-did-what rows of the day can take the place of the oldest agent events, up to half of the answer, so a stop from this morning stays in reach on a busy day. The answer stays within `lines`.

**Reading a stopped agent.** When the agent isn't running, or its host doesn't answer, `Logs` still answers `result: true` for a day with who-did-what rows. `events` starts with a `runtime_log_unavailable` note, followed by those rows, and `totalLines` counts the note:

```json
{
  "result": true,
  "errors": [],
  "date": "2026-05-03",
  "totalLines": 3,
  "events": [
    {
      "ts": "2026-05-03T16:20:11.000Z",
      "kind": "runtime_log_unavailable",
      "title": "The agent's own turns and tool calls can be read while it runs",
      "userUuid": "system",
      "user": null
    },
    {
      "ts": "2026-05-03T16:20:11.000Z",
      "kind": "AGENT_STOPPED",
      "title": "Agent stopped",
      "ok": true,
      "userUuid": "ada-uuid",
      "user": { "uuid": "ada-uuid", "firstname": "Ada", "lastname": "Lovelace" }
    },
    {
      "ts": "2026-05-03T09:12:44.000Z",
      "kind": "AGENT_CREDENTIAL_SAVED",
      "title": "Connector setting saved: wiro.apikey",
      "ok": true,
      "summary": { "fields": ["wiro.apikey"] },
      "userUuid": "ada-uuid",
      "user": { "uuid": "ada-uuid", "firstname": "Ada", "lastname": "Lovelace" }
    }
  ]
}
```

A day without such rows answers with one of the errors below.

## **POST** /UserAgent/LogsList

Returns the dates that have activity for this agent: days with a log file and days that only have who-did-what rows. Useful for rendering a date-picker.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Your UserAgent instance guid. |

##### Response

```json
{
  "result": true,
  "errors": [],
  "dates": [
    { "date": "2026-05-03", "sizeBytes": 184220, "compressed": false },
    { "date": "2026-05-02", "sizeBytes": 41280,  "compressed": true  },
    { "date": "2026-05-01", "sizeBytes": 0,      "compressed": false }
  ]
}
```

Each entry exposes `date` (`YYYY-MM-DD`, sorted newest-first), `sizeBytes` (raw byte size on disk; compressed size when `compressed: true`), and `compressed` (`true` once the day's log has been compressed to `<date>.jsonl.gz`; `false` for the active day's plain `.jsonl`). `sizeBytes` is `0` on a day with who-did-what rows and no log file, for example a day whose log was deleted. Reading either form via `LogsFile` returns the same decoded events. The host retains activity files for 180 days (rolling); older dates are removed and won't appear here.

**Reading a stopped agent.** When the agent isn't running, or its host doesn't answer, and it has who-did-what days, `LogsList` still answers `result: true` with those days and two more fields:

```json
{
  "result": true,
  "errors": [],
  "runtimeUnavailable": "not_running",
  "note": "The agent's own log days can be read while it runs, so this list may be missing days.",
  "dates": [
    { "date": "2026-05-03", "sizeBytes": null, "compressed": false },
    { "date": "2026-05-01", "sizeBytes": null, "compressed": false }
  ]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `runtimeUnavailable` | `string` | `"not_running"` or `"no_answer"`. Present only on this answer. |
| `note` | `string` | `The agent's own log days can be read while it runs, so this list may be missing days.` for `not_running`, `The agent's own log days could not be read just now, so this list may be missing days.` for `no_answer`. |
| `dates[].sizeBytes` | `null` | On this answer the size of a day isn't known. |

An agent with no who-did-what days answers with one of the errors below.

## **POST** /UserAgent/LogsFile

Reads the **full** log of a specific date and returns every event in it, who-did-what rows included. A stopped agent and a deleted day read as on `Logs`. Use this for "Download today's activity" buttons or for off-band analysis.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Your UserAgent instance guid. |
| `date` | string | Yes | `YYYY-MM-DD` of the file to read. |

##### Response

```json
{
  "result": true,
  "errors": [],
  "date": "2026-05-02",
  "truncated": false,
  "events": [
    {
      "ts": "2026-05-02T08:00:20.142Z",
      "kind": "turn_started",
      "title": "Agent turn started",
      "summary": { "preview": "Hi, can you draft a roundup post?" },
      "userUuid": "ada-uuid",
      "user": {
        "uuid": "ada-uuid",
        "firstname": "Ada",
        "lastname": "Lovelace",
        "email": "ada@example.com",
        "username": "ada",
        "avatar": "https://cdn.wiro.ai/avatars/ada.webp",
        "avatarinitials": "AL"
      }
    },
    {
      "ts": "2026-05-02T08:00:19.870Z",
      "kind": "user_message",
      "title": "User: Hi, can you draft a roundup post?",
      "summary": { "preview": "Hi, can you draft a roundup post?" },
      "user": {
        "uuid": "ada-uuid",
        "firstname": "Ada",
        "lastname": "Lovelace",
        "email": "ada@example.com",
        "username": "ada",
        "avatar": "https://cdn.wiro.ai/avatars/ada.webp",
        "avatarinitials": "AL"
      }
    }
  ]
}
```

Events are returned **newest first** (descending by `ts`), same as the live tail, so `events[0]` is the most recent; do not re-reverse. The `user` field follows the same resolution rules as the live tail above (see the `Logs` section's "About the `user` field" callout).

> **`truncated`** is `true` when the day's file is larger than 10 MiB. Only its newest 10 MiB of events are returned; older events of that day are not retrievable through this endpoint.

## **POST** /UserAgent/LogsDelete

Deletes the agent's own turns and tool calls for one date: its activity file and the gzipped sibling, if present. Who-did-what rows stay, so the date can stay in `LogsList` with `sizeBytes: 0`. The deletion adds an `AGENT_LOG_DAY_DELETED` row on the day you make it, and reads of an earlier day you deleted start with a `runtime_log_deleted` note that says when. Idempotent: deleting an already-gone date is a success no-op.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Your UserAgent instance guid. |
| `date` | string | Yes | `YYYY-MM-DD` of the day to delete. |

##### Response

```json
{
  "result": true,
  "errors": [],
  "date": "2026-05-01",
  "removed": { "plain": false, "gz": true }
}
```

`removed.{plain,gz}` reports which physical files were actually deleted. Both `false` is also a success (file was already gone).

## Usage Patterns

### Live polling for an in-app activity feed

Polling `Logs` every 30 seconds is the recommended cadence:

```javascript
async function pollActivity(useragentguid, onEvents) {
  let lastTs = 0;

  setInterval(async () => {
    const { data } = await axios.post(
      'https://api.wiro.ai/v1/UserAgent/Logs',
      { useragentguid, lines: 200 },
      { headers: { 'x-api-key': 'YOUR_API_KEY', 'Content-Type': 'application/json' } }
    );

    const fresh = data.events.filter(e => Date.parse(e.ts) > lastTs);
    if (fresh.length === 0) return;

    onEvents(fresh);
    lastTs = Date.parse(fresh[0].ts);
  }, 30_000);
}
```

### Daily download for off-band analysis

```bash
# 1) discover available dates
curl -X POST "https://api.wiro.ai/v1/UserAgent/LogsList" \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321" }'

# 2) download a specific date's full file
curl -X POST "https://api.wiro.ai/v1/UserAgent/LogsFile" \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321", "date": "2026-05-02" }' \
  > logs-2026-05-02.json
```

### Filtering server-side by `kind`

The endpoints don't support server-side filtering, so apply filters client-side:

```python
import requests

resp = requests.post(
    "https://api.wiro.ai/v1/UserAgent/LogsFile",
    headers={"x-api-key": "YOUR_API_KEY", "Content-Type": "application/json"},
    json={"useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321", "date": "2026-05-02"}
).json()

cron_runs = [e for e in resp["events"] if e["kind"] == "cron_finished"]
print(f"{len(cron_runs)} cron runs on 2026-05-02")
for e in cron_runs:
    summary = e.get("summary") or {}
    print(f"  {e['title']} status={summary.get('status')}")
```

### Delete a day

`LogsDelete` removes the agent's own turns and tool calls for one day without waiting for the 180-day rotation. Who did what to the agent that day stays in the log:

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/LogsDelete" \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321", "date": "2026-05-02" }'
```

## Errors

| Error | When |
|-------|------|
| `useragentguid is required` | Missing required parameter |
| `date is required` | `LogsFile` / `LogsDelete` without `date` |
| `useragent-access-denied` | Caller is neither the owner nor on the agent's team |
| `useragent-team-admin-required` | Caller is a member of the agent's team but not a team admin (code `97`) |
| `Agent is not assigned to a worker. It may not be running.` | The agent isn't running on a host (never started, stopped or being moved). Start it and retry |
| `Worker not found` | The agent's host is not available right now. Retry later |
| `Agent is temporarily unavailable. Please try again shortly.` | The agent's host did not answer (offline, network blip). Retry |

`Logs`, `LogsFile` and `LogsList` answer with the last three errors only when there are no who-did-what rows to show. `LogsDelete` needs the agent on a host every time.

## Retention & Rotation

| Period | What happens |
|--------|--------------|
| Day 0-6 | File is plain JSONL (`YYYY-MM-DD.jsonl`). Live tail + LogsFile read it directly. |
| Day 7-180 | File is gzipped (`YYYY-MM-DD.jsonl.gz`). Reads are transparently decompressed; size in `LogsList` reports the on-disk compressed bytes. |
| Day 181+ | File is deleted by the agent's daily maintenance cron. `LogsList` no longer surfaces the date. |

Who-did-what rows are kept for the same 180 days.

> **Persistence is per-agent.** If Wiro re-allocates the agent's runtime (rare; happens during platform maintenance), the activity history starts fresh from that point. For long-term audit trails, schedule a daily `LogsFile` download to your own storage.

## What's Next

- [Agent Transactions](/docs/agent-transactions): Credit ledger for the same useragent, the audit trail of every credit movement
- [Agent Messaging](/docs/agent-messaging): User-facing message exchanges (with full prompts and responses)
- [Agent Overview](/docs/agent-overview): Full agent endpoint catalog
