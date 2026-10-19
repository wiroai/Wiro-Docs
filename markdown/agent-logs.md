# Agent Logs

Per-instance activity feed — tool calls, scheduled cron runs, message exchanges, and turn boundaries — for any deployed agent.

## Overview

Every Wiro agent appends one structured `ActivityEvent` JSON line per tool call, LLM turn boundary, scheduled task run and billed turn, plus each message that arrives on a connected Telegram, Slack or Discord channel. Secrets (matched by field name and by high-entropy value), internal tool-call IDs and API credentials are redacted before an event is written — so what shows up in `Logs` is safe to show end users.

A daily JSONL file is written for each calendar day; files older than 7 days are gzipped, files older than 180 days are deleted by the agent's daily maintenance cron.

The endpoints below are **owner-or-team-admin** scoped. Plain members of the agent's team receive `useragent-team-admin-required` (code `97`); outside callers receive `useragent-access-denied`.

| Endpoint | Purpose |
|----------|---------|
| `POST /UserAgent/Logs` | Live tail (last N events for today, or a specific date). Cached server-side for 30s to absorb polling. |
| `POST /UserAgent/LogsList` | List the date strings (`YYYY-MM-DD`) for which an activity file exists. |
| `POST /UserAgent/LogsFile` | Read the **full** JSONL file for a specific date. |
| `POST /UserAgent/LogsDelete` | Delete one date's activity file (and its gzipped sibling). Idempotent. |

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
| `kind` | `string` | Fine-grained event class. One of: `"turn_started"`, `"turn_ended"` (an LLM turn boundary); `"tool_started"`, `"tool_completed"` (one pair per tool call); `"tool_blocked"` (a tool call the agent's safety rules refused); `"cron_finished"` (a scheduled task finished); `"user_message"` (a message received on a connected Telegram, Slack or Discord channel — web chat messages are not logged here); `"token_usage"` (a billed turn's token usage — chat / cron / voice post-call); `"token_usage_idempotent"` (a replayed usage report, already billed — informational); `"media_relay"` (files from a reply were delivered); `"background_reply"` (a result that finished in the background was delivered to the chat). |
| `tool` | `string?` | Present on `tool_started` / `tool_completed` / `tool_blocked`. The tool's name, e.g. `"exec"`, `"read"`, `"write"`, `"edit"`, `"web_fetch"`, `"browser"`, `"image"`, `"sessions_spawn"`, `"message"`. |
| `title` | `string` | Human-readable one-line description of what happened (e.g. `"Posted carousel: \"Brand voice teaser\""`, `"Fetched https://…"`, `"Token Usage"`). Always present. |
| `summary` | `object?` | Structured event-specific payload. Opaque on the wire — render as JSON when expanding the row. Secret values (`apikey`, `apppassword`, `clientsecret`, `bearer`, `token`, …) are masked before the event is written. Common keys: `file`, `method`, `host`, `path`, `preview`, `messageCount`, `jobId`, `status`, `reason`. |
| `durationMs` | `number?` | Wall-clock duration in milliseconds. Populated on `tool_completed`, `turn_ended`, `cron_finished` and `token_usage` events. |
| `ok` | `boolean?` | `true` for a successful completion, `false` for a failure. Populated on `tool_completed`, `turn_ended` and `cron_finished` events, and always `false` on `tool_blocked`. Pair with `error` for failure rows. |
| `error` | `string?` | One-line failure message (when `ok: false`). |
| `cost` | `object?` | Legacy per-action credit charge, `{ credits, skill, action }`. Only events recorded before agents switched to per-turn token billing can carry it; current events never do. See the `token_usage` event for what a turn cost. |
| `userUuid` | `string?` | UUID of the actor who triggered the event. `"system"` for cron / internal events. May be missing on legacy rows from the 180-day retention window pre-attribution rollout — the server falls back to the useragent owner. |
| `user` | `object\|null` | Resolved actor: `{ uuid, firstname, lastname, email, username, avatar, avatarinitials }`. `null` when `userUuid` is `"system"` (automation / cron) or when the user record was deleted. |

> **What is `summary` for?** Tool events carry a short summary of the call — for example the file path for file tools, the program for `exec`, or the method, host and path for web requests. Turn events carry a short `preview` (plus `messageCount` on `turn_ended`); `cron_finished` carries `{ jobId, status }`; `user_message` carries `{ preview }`; `tool_blocked` carries the `reason`. Treat the object as opaque and render-on-expand — its shape depends on the tool and may change without a docs revision.

### Token-usage events

A `token_usage` event records the token spend and credit deduction for one billed turn — a chat reply, a cron run, or a voice post-call. A `token_usage_idempotent` event carries the **same shape** for a replayed usage callback that was already billed (informational; it does not deduct again). On top of the base `ActivityEvent` fields, these events add:

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

> **Credits vs. wallet.** An agent's own credits are spent once per LLM turn: each `token_usage` event is one billed turn, and its `tokencost` is in credits (100 credits = $1). A Wiro model the agent runs, for example through `int-wiro-aimodels`, is billed separately: Wiro charges it to the project wallet behind the agent's Wiro API key at the model's usual price, passed through unchanged. That run shows up as an ordinary `tool_completed` event with no credit figure; its cost is the task's `totalcost` (see [Billing & Cost](/docs/tasks#task-billing)).

## **POST** /UserAgent/Logs

Live tail of the agent's activity feed. Returns the last N events for the requested date (defaults to today).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Your UserAgent instance guid. |
| `date` | string | No | `YYYY-MM-DD` to read a specific day's file. Default: today (UTC). Pass `"today"` explicitly for clarity. |
| `lines` | number | No | Max events to return (max 5000). Default: `200`. |

**Caching:** the endpoint is cached server-side for 30 seconds per `(useragentguid, date, lines)` triple to absorb polling bursts. Plan for ≥30 s between repeated polls of the same key — older or differently-keyed reads bypass the cache.

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
> - An event triggered by **automation** has `userUuid: "system"` and `user: null` — cron runs, the token usage of scheduled turns, and similar non-interactive writes (the system rows above).
> - An event without a `userUuid` (an incoming channel message, or a row older than user attribution) carries the agent owner's profile, so the row never shows an empty placeholder.

| Field | Type | Description |
|-------|------|-------------|
| `date` | `string\|null` | The actual date the events were read from (`YYYY-MM-DD`). |
| `totalLines` | `number` | Total lines in the file (regardless of `lines` cap). |
| `events` | `array<ActivityEvent>` | Newest first (descending by `ts`) — `events[0]` is the most recent event; do not re-reverse. |

## **POST** /UserAgent/LogsList

Returns the list of dates for which an activity file exists for this agent. Useful for rendering a date-picker.

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
    { "date": "2026-05-01", "sizeBytes": 38912,  "compressed": true  }
  ]
}
```

Each entry exposes `date` (`YYYY-MM-DD`, sorted newest-first), `sizeBytes` (raw byte size on disk; compressed size when `compressed: true`), and `compressed` (`true` once the worker's daily maintenance cron has gzipped the file to `<date>.jsonl.gz`; `false` for the active day's plain `.jsonl`). Reading either form via `LogsFile` returns the same decoded events. The host retains activity files for 180 days (rolling); older dates are pruned by a worker cron and won't appear here.

## **POST** /UserAgent/LogsFile

Reads the **full** JSONL file for a specific date and returns every event in it. Use this for "Download today's activity" buttons or for off-band analysis.

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

Events are returned **newest first** (descending by `ts`), same as the live tail — `events[0]` is the most recent; do not re-reverse. The `user` field follows the same resolution rules as the live tail above — see the `Logs` section's "About the `user` field" callout.

> **`truncated`** is `true` when the file was capped at the worker's max-line ceiling (~50000 events per file). When `true`, paginate by date — older events for the same day are not retrievable through this endpoint. (Use the live tail with smaller `lines` values for partial reads.)

## **POST** /UserAgent/LogsDelete

Deletes one date's activity file and its gzipped sibling (if present). Idempotent — deleting an already-gone date is a success no-op.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Your UserAgent instance guid. |
| `date` | string | Yes | `YYYY-MM-DD` of the file to remove. |

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

Polling `Logs` every 30 seconds is the recommended cadence — the server-side cache TTL is calibrated for exactly this interval, so faster polling won't return fresher data:

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

The endpoints don't support server-side filtering — apply filters client-side:

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

### GDPR-style "scrub a day"

`LogsDelete` lets the user wipe a specific day's events without waiting for the 180-day rotation:

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
| `Agent is not assigned to a worker. It may not be running.` | The agent isn't running on a host yet (never started, or being moved) — start it and retry |
| `Worker not found` | The agent's host is not available right now — retry later |
| `Failed to fetch activity from worker` | The agent's host did not answer (offline, network blip) — retry |
| `Failed to fetch activity dates from worker` / `Failed to delete activity file from worker` / `Failed to fetch activity file from worker` | Same as above for the matching endpoint |

## Retention & Rotation

| Period | What happens |
|--------|--------------|
| Day 0 — 6 | File is plain JSONL (`YYYY-MM-DD.jsonl`). Live tail + LogsFile read it directly. |
| Day 7 — 180 | File is gzipped (`YYYY-MM-DD.jsonl.gz`). Reads are transparently decompressed; size in `LogsList` reports the on-disk compressed bytes. |
| Day 181+ | File is deleted by the agent's daily maintenance cron. `LogsList` no longer surfaces the date and `LogsFile` returns `Failed to fetch activity file from worker`. |

> **Persistence is per-agent.** If Wiro re-allocates the agent's runtime (rare; happens during platform maintenance), the activity history starts fresh from that point. For long-term audit trails, schedule a daily `LogsFile` download to your own storage.

## What's Next

- [Agent Transactions](/docs/agent-transactions) — Credit ledger for the same useragent — the audit trail of every credit movement
- [Agent Messaging](/docs/agent-messaging) — User-facing message exchanges (with full prompts and responses)
- [Agent Overview](/docs/agent-overview) — Full agent endpoint catalog
