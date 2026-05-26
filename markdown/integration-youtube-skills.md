# YouTube Integration

Connect your agent to YouTube Data API v3 and YouTube Analytics API v2 for channel videos listing, video asset selection for Google Ads Video/Demand Gen campaigns, and performance analytics.

## Overview

The YouTube integration uses Google OAuth 2.0 with:
- **YouTube Data API v3** — channel info, video listings, upload metadata
- **YouTube Analytics API v2** — view counts, watch time, subscriber metrics

**Skills that use this integration:**

- `int-youtube-manage` — Channel videos listing, video asset selection for Google Ads Video/Demand Gen campaigns, performance analytics

**Agents that typically enable this integration:**

- Google Ads Manager — for creating Video and Demand Gen campaigns that reference existing YouTube videos
- Social Manager — for publishing to YouTube Shorts (roadmap)

## Availability

| Mode | Status | Notes |
|------|--------|-------|
| `"wiro"` | Available | One-click connect using Wiro's Google Cloud project. |
| `"own"` | Available | Own Google Cloud project + OAuth client. |

## Prerequisites

- **A Wiro API key** — [Authentication](/docs/authentication).
- **A deployed agent** — [Agent Overview](/docs/agent-overview).
- **A YouTube channel** the connecting user owns.
- **(Own mode) A Google Cloud project** with YouTube Data API v3 and YouTube Analytics API enabled.
- **An HTTPS callback URL**.

## Wiro Mode

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/OAuthConnect" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "credentialkey": "youtube",
    "redirecturl": "https://your-app.com/settings/integrations"
  }'
```

After consent the user returns with `?yt_connected=true&yt_channels=<URL-encoded-JSON>`. The JSON array entries come straight from the YouTube Data API and carry `{ id, title, customUrl, subscriberCount }` per channel. Map them to the picker's `{ channelid, channeltitle }` shape and call `SetPickerAccounts`:

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/SetPickerAccounts" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "credentialkey": "youtube",
    "accounts": [
      { "channelid": "UC...", "channeltitle": "My Channel" }
    ]
  }'
```

Pass multiple `{ channelid, channeltitle }` entries to authorize the agent against several channels at once.

## Own Mode

### Step 1: Create GCP project + enable YouTube APIs

1. [console.cloud.google.com](https://console.cloud.google.com/) → create a project.
2. **APIs & Services → Library** — enable:
   - [YouTube Data API v3](https://console.cloud.google.com/apis/library/youtube.googleapis.com)
   - [YouTube Analytics API v2](https://console.cloud.google.com/apis/library/youtubeanalytics.googleapis.com)
3. **OAuth consent screen**:
   - **External** user type for multi-tenant use
   - App name, support email
   - Add scopes: `youtube`, `youtube.readonly`, `yt-analytics.readonly`

### Step 2: Create OAuth Client

**APIs & Services → Credentials → Create Credentials → OAuth client ID**:
- Application type: **Web application**
- **Authorized redirect URIs**: `https://api.wiro.ai/v1/UserAgentOAuth/YTCallback`

### Step 3: Connect

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/OAuthConnect" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "credentialkey": "youtube",
    "redirecturl": "https://your-app.com/settings/integrations",
    "authmethod": "own"
  }'
```

After consent, present any returned channels to the user and persist the selection with `SetPickerAccounts` exactly as shown in [Wiro Mode](#wiro-mode) above.

## Disconnect

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/OAuthDisconnect" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "credentialkey": "youtube"
  }'
```

## Status

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/OAuthStatus" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "credentialkey": "youtube"
  }'
```

Response:

```json
{
  "result": true,
  "connected": true,
  "accounts": [
    { "id": "UC...", "name": "My Channel" }
  ],
  "connectedat": "2026-04-17T12:00:00.000Z",
  "tokenexpiresat": "2026-04-17T13:00:00.000Z",
  "errors": []
}
```

`accounts[]` carries one entry per selected channel (`id` = `channelid`, `name` = `channeltitle`).

## API Reference

### POST /UserAgentOAuth/OAuthConnect

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Agent instance GUID. |
| `credentialkey` | string | Yes | `"youtube"`. |
| `redirecturl` | string | Yes | HTTPS URL. |
| `authmethod` | string | No | `"wiro"` (default) or `"own"`. |

### GET /UserAgentOAuth/YTCallback

Query params: `yt_connected=true&yt_channels=<JSON>` (URL-encoded JSON array of `{ id, title, customUrl, subscriberCount }` straight from the YouTube Data API) or `yt_error=<code>`. The callback path is per-provider — YouTube's stays `YTCallback`. When you hand the array off to `SetPickerAccounts`, map each entry to `{ channelid: id, channeltitle: title }` — the picker uses those names for storage.

### POST /UserAgentOAuth/SetPickerAccounts

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Agent instance GUID. |
| `credentialkey` | string | Yes | `"youtube"`. |
| `accounts` | array | Yes | One or more `{ channelid, channeltitle }` entries. |

Response: `{ result, accounts: [{id, name}, ...], errors }`. Triggers agent restart if running.

### POST /UserAgentOAuth/OAuthStatus

Body: `{ useragentguid, credentialkey: "youtube" }`. Response: `connected`, `accounts: [{id, name}, ...]` (one entry per selected channel — `id` = `channelid`, `name` = `channeltitle`), `connectedat`, `tokenexpiresat`.

### POST /UserAgentOAuth/OAuthDisconnect

Body: `{ useragentguid, credentialkey: "youtube" }`. Clears YouTube credentials (no remote revoke).

## What the agent does with this integration

### Channel video listing

Agent lists channel uploads:

```
Operator → "show my last 20 YouTube videos"
Agent → GET /youtube/v3/playlistItems?playlistId=UU{channel}
     returns 20 items with video IDs, titles, dates, durations
```

### Video asset for Google Ads campaigns

Google Ads Manager agent uses this skill to pick video assets for Video and Demand Gen campaigns:

```
Agent → /youtube-manage list last 30 days of videos
     → picks top 3 by views
     → /googleads-manage create Video campaign with these as creatives
```

### Performance analytics

Agent queries video-level metrics:

```
Operator → "which videos performed best last month?"
Agent → POST /youtubeAnalytics/v2/reports
     with dimensions=[video], metrics=[views, averageViewDuration, estimatedMinutesWatched]
```

## Skill reference

- [agent-skills.md](/docs/agent-skills) — custom skill schema and the `int-youtube-manage` key

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| Empty channel list | User has no YouTube channel | User creates a channel |
| `quotaExceeded` | Daily quota hit | Wait 24h or request higher quota from Google |
| `channelNotFound` | Channel deleted or moved | User re-selects via `SetPickerAccounts` |
| `invalid_grant` | Refresh token expired | Re-connect via `OAuthConnect` |
