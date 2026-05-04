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
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/YTConnect" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "redirecturl": "https://your-app.com/settings/integrations"
  }'
```

After consent the user returns with `?yt_connected=true&yt_channels=[{channelid,channeltitle}]`. Present the channel picker and call `YTSetChannel`:

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/YTSetChannel" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "channelid": "UC...",
    "channeltitle": "My Channel"
  }'
```

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
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/YTConnect" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "redirecturl": "https://your-app.com/settings/integrations",
    "authmethod": "own"
  }'
```

## Disconnect

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/YTDisconnect" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "useragentguid": "your-useragent-guid" }'
```

## Status

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/YTStatus" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "useragentguid": "your-useragent-guid" }'
```

Returns `{ result: true, connected: true, channelid, channeltitle, connectedat }`.

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
| `channelNotFound` | Channel deleted or moved | User re-selects via `YTSetChannel` |
| `invalid_grant` | Refresh token expired | Re-connect via `YTConnect` |
