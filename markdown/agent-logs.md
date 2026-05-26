# Agent Logs

Per-instance activity feed — tool calls, scheduled cron runs, message exchanges, and turn boundaries — for any deployed agent.

## Overview

Every Wiro agent container runs a small **wiro-commands plugin** that appends one structured `ActivityEvent` JSON line per tool call, turn boundary, session boundary, message exchange, and synthesized cron run. The plugin redacts secrets-by-field-name, high-entropy assignment values, internal tool-call IDs, and the API URL/credentials before writing — so what shows up in `Logs` is safe to show end users.

A daily JSONL file is written for each calendar day; files older than 7 days are gzipped, files older than 180 days are deleted by the agent's daily maintenance cron.

The endpoints below are **owner-or-team-member** scoped. Team admins can read any team agent; outside callers receive `useragent-access-denied`.

| Endpoint | Purpose |
|----------|---------|
| `POST /UserAgent/Logs` | Live tail (last N events for today, or a specific date). Cached server-side for 30s on non-admin callers to absorb polling. |
| `POST /UserAgent/LogsList` | List the date strings (`YYYY-MM-DD`) for which an activity file exists. |
| `POST /UserAgent/LogsFile` | Read the **full** JSONL file for a specific date. |
| `POST /UserAgent/LogsDelete` | Delete one date's activity file (and its gzipped sibling). Idempotent. |

> **Activity feed vs `Message/History`.** `Message/History` is a chat-bubble-level read of the conversation. `Logs` is a **runtime** view: every tool call, every scheduled trigger, every session boundary the agent touched. They serve different audiences (`Message/History` for end users, `Logs` for operators / power users).

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
  "cost": { "credits": 5, "skill": "int-wiro-aimodels", "action": "create" },
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
| `ts` | `string` | ISO-8601 UTC datetime when the event was emitted inside the container (e.g. `"2026-05-03T14:00:10.234Z"`). Parse with `Date.parse(ts)` for arithmetic. |
| `kind` | `string` | Fine-grained event class. One of: `"tool_started"`, `"tool_completed"` (one pair per tool invocation); `"turn_started"`, `"turn_ended"` (an LLM turn boundary); `"cron_started"`, `"cron_finished"` (a scheduled-cron tick); `"session_start"`, `"session_end"` (a chat-session boundary); `"user_message"` (user → agent message); `"agent_reply"` (agent → user reply). |
| `tool` | `string?` | Present on `tool_started` / `tool_completed`. Tool family — one of: `"read"`, `"write"`, `"edit"`, `"exec"`, `"web_fetch"`, `"web_search"`, `"sessions_spawn"`, `"message"`. |
| `title` | `string` | Human-readable one-line description of what happened (e.g. `"Posted carousel: \"Brand voice teaser\""`, `"Fetched https://…"`, `"Charged 5 credits · int-wiro-aimodels (create)"`). Always present. |
| `summary` | `object?` | Structured event-specific payload. Opaque on the wire — render as JSON when expanding the row. Plugin pre-redacts `apikey`, `apppassword`, `clientsecret`, `bearer`, `token`, etc. before writing. Common keys: `url`, `status`, `bytes`, `query`, `resultCount`, `path`, `lines`, `interval`, `trigger`, `messageguid`, `wordCount`, `elapsedTime`. |
| `durationMs` | `number?` | Wall-clock duration in milliseconds. Populated on `*_completed` / `*_finished` / `turn_ended` events. |
| `ok` | `boolean?` | `true` for a successful completion, `false` for a failure. Populated on `*_completed` / `*_finished` events. Pair with `error` for failure rows. |
| `error` | `string?` | One-line failure message (when `ok: false`). |
| `cost` | `object?` | Credit deduction attached to the event (`exec` tool calls that drove a per-action charge): `{ credits, skill, action }`. Absent on no-charge events. |
| `userUuid` | `string?` | UUID of the actor who triggered the event. `"system"` for cron / internal events. May be missing on legacy rows from the 180-day retention window pre-attribution rollout — the server falls back to the useragent owner. |
| `user` | `object\|null` | Resolved actor: `{ uuid, firstname, lastname, email, username, avatar, avatarinitials }`. `null` when `userUuid` is `"system"` (automation / cron) or when the user record was deleted. |

> **What is `summary` for?** Tool calls include the input/output summary (URL, status, bytecount, search query); cron ticks include `{ interval, trigger }`; message events include `{ messageguid, wordCount, elapsedTime }`. Treat the object as opaque and render-on-expand — its shape is plugin-version-specific and is allowed to evolve without a docs revision.

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
      "ts": "2026-05-03T14:00:12.481Z",
      "kind": "tool_completed",
      "tool": "exec",
      "title": "Charged 60 credits · int-wordpress-post (create)",
      "summary": { "skill": "int-wordpress-post", "action": "create", "balanceafter": 4940 },
      "durationMs": 92,
      "ok": true,
      "cost": { "credits": 60, "skill": "int-wordpress-post", "action": "create" },
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
      "title": "Cron tick: cs-cron-blog-scanner",
      "summary": { "skill": "cs-cron-blog-scanner", "interval": "0 9 * * *", "trigger": "scheduled" },
      "durationMs": 4210,
      "ok": true,
      "userUuid": "system",
      "user": null
    },
    {
      "ts": "2026-05-03T13:14:42.118Z",
      "kind": "agent_reply",
      "title": "Agent replied (412 words, 8.1s)",
      "summary": {
        "messageguid": "5c41dabf-f2be-4aa8-a5a4-8c9e3d2f3f11",
        "elapsedTime": "8.1s",
        "wordCount": 412
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

> **About the `user` field.** Every event is decorated with the resolved actor: `{ uuid, firstname, lastname, email, username, avatar, avatarinitials }`. It is `null` when:
>
> - The event was triggered by **automation** — `userUuid: "system"` for cron ticks, scheduled-skill runs, automated deductions, agent-initiated tool calls, and similar non-interactive writes (the three system / cron rows above).
> - The actor's user record was deleted or the lookup misses for any reason.
>

| Field | Type | Description |
|-------|------|-------------|
| `date` | `string\|null` | The actual date the events were read from (`YYYY-MM-DD`). |
| `totalLines` | `number` | Total lines in the file (regardless of `lines` cap). |
| `events` | `array<ActivityEvent>` | Newest events last (ascending by `ts`). The frontend usually reverses for display. |

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
      "ts": "2026-05-02T08:00:00.000Z",
      "kind": "session_start",
      "title": "Session started: user-42",
      "summary": { "sessionkey": "user-42" },
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
      "ts": "2026-05-02T08:00:20.142Z",
      "kind": "user_message",
      "title": "User: \"Hi, can you draft a roundup post?\"",
      "summary": { "messageguid": "5c41dabf-…", "wordCount": 8 },
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

The `user` field follows the same resolution rules as the live tail above — see the `Logs` section's "About the `user` field" callout.

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
    lastTs = Date.parse(fresh[fresh.length - 1].ts);
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
print(f"{len(cron_runs)} cron ticks on 2026-05-02")
for e in cron_runs:
    summary = e.get("summary") or {}
    print(f"  [{summary.get('skill')}] interval={summary.get('interval')}")
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
| `useragent-access-denied` | Caller is neither owner, team admin, nor admin |
| `Agent is not assigned to a worker. It may not be running.` | The useragent has no `workerid` (it's never been started, or has been re-allocated) |
| `Worker not found` | The agent's worker row is missing — internal data inconsistency |
| `Failed to fetch activity from worker` | The worker side rejected the request (worker offline, network blip) — retry |
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
