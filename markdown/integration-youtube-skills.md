# YouTube Integration

Connect your agent to a YouTube channel to upload and publish videos and Shorts, edit their details and playlists, list the channel's videos, report performance, and pick video assets for Google Ads Video/Demand Gen campaigns.

## Overview

The YouTube integration uses Google OAuth 2.0 with:
- **YouTube Data API v3** — channel info, video listings, uploads, video details, playlists, and thumbnails
- **YouTube Analytics API v2** — view counts, watch time, subscriber metrics

**Skills that use this integration:**

- `int-youtube-manage` — Uploads and publishes videos and Shorts (title, description, tags, visibility or a scheduled release, playlist, thumbnail), lists channel videos, edits video details and playlists, reports performance, and picks video assets for Google Ads Video/Demand Gen campaigns

**Agents that typically enable this integration:**

- Video Creator — to publish the videos it makes to your channel. Add `int-youtube-manage` with [`SkillsApply`](/docs/agent-skills#toggling-integration-skills); it adds $1 a month to the Starter price. Video Creator then publishes a finished video when the request asks for it or a `YouTube` line in its `video-preferences` says to, and otherwise offers to.
- Google Ads Manager — for creating Video and Demand Gen campaigns that reference existing YouTube videos

## Availability

| Mode | Status | Notes |
|------|--------|-------|
| `"own"` | Available | Your own Google Cloud project and OAuth client. |
| `"wiro"` | Coming soon | Wiro's shared Google Cloud project is awaiting Google's review. Until then, `OAuthConnect` in Wiro mode, which is also what you get when you leave out `authmethod`, returns `Wiro-managed OAuth is not enabled for YouTube`. |

## Prerequisites

- **A Wiro API key** — [Authentication](/docs/authentication).
- **A deployed agent** — [Agent Overview](/docs/agent-overview).
- **A YouTube channel** the connecting Google account owns or manages.
- **A Google Cloud project** with YouTube Data API v3 and YouTube Analytics API enabled.
- **An HTTPS callback URL**.

## Connect

### Step 1: Create a Google Cloud project and enable the YouTube APIs

1. [console.cloud.google.com](https://console.cloud.google.com/) → create a project.
2. **APIs & Services → Library** — enable:
   - [YouTube Data API v3](https://console.cloud.google.com/apis/library/youtube.googleapis.com)
   - [YouTube Analytics API v2](https://console.cloud.google.com/apis/library/youtubeanalytics.googleapis.com)
3. **OAuth consent screen**:
   - **External** user type for multi-tenant use
   - App name, support email
   - Add scopes: `youtube`, `youtube.readonly`, `yt-analytics.readonly`
   - Publish the app (**In production**). While it is in **Testing**, Google expires its refresh tokens after 7 days and the agent loses the channel.

### Step 2: Create the OAuth client

**APIs & Services → Credentials → Create Credentials → OAuth client ID**:
- Application type: **Web application**
- **Authorized redirect URIs**: `https://api.wiro.ai/v1/UserAgentOAuth/YTCallback`

Copy the client ID and the client secret. If you missed the secret, open the client and use **Reset secret**.

### Step 3: Save the OAuth client to Wiro

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/CredentialUpsert" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "fields": [
      { "credentialkey": "youtube", "fieldname": "clientid", "fieldvalue": "123-abc.apps.googleusercontent.com" },
      { "credentialkey": "youtube", "fieldname": "clientsecret", "fieldvalue": "YOUR_CLIENT_SECRET" },
      { "credentialkey": "youtube", "fieldname": "authmethod", "fieldvalue": "own" }
    ]
  }'
```

### Step 4: Start the connection

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

Send the user to the returned `authorizeUrl`.

### Step 5: Save the channel selection

After consent the user returns with `?yt_connected=true&yt_channels=<URL-encoded-JSON>`. The JSON array entries come straight from the YouTube Data API and carry `{ id, title, customUrl, subscriberCount }` per channel. When the Google account has a single channel, Wiro selects it for you. Otherwise map the user's choice to the picker's `{ channelid, channeltitle }` shape and call `SetPickerAccounts`:

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
| `authmethod` | string | No | `"own"`. Omitted, it means `"wiro"`, which is not available yet. |

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

### Uploading and publishing videos

Ask the agent to put a video on YouTube, for example one it made with Video Creator. It uploads the video to the selected channel and replies with the link.

- **Regular videos and Shorts.** One upload covers both: YouTube files a vertical (9:16) or square video of up to 3 minutes as a Short and anything else as a regular video. A Short needs no `#Shorts` tag.
- **Details.** Title (up to 100 characters), description (up to 5,000), tags, category, language, the made-for-kids setting, and visibility: public, unlisted, private, or a scheduled release time. A video that shows realistic AI-generated people or scenes is marked as altered or synthetic content, and YouTube labels it.
- **Playlist and thumbnail.** The agent can add the video to a playlist and set a frame of it as the thumbnail. YouTube accepts custom thumbnails for regular videos on verified channels.
- **Approval.** Uploads go through the agent's approval policy (the `approval-policy` custom skill). A request that already says to upload or publish is the approval; otherwise the agent shows the title, description, tags, playlist and visibility first and uploads after you approve.
- **Drafts.** Ask for a private or unlisted upload, and ask the agent to publish it later: it makes the video public, or schedules it, and keeps the synthetic-content label.
- **No duplicates.** When an upload fails, the agent looks for the video among the channel's uploads before it tries once more.

The reply gives the video's link, its visibility or scheduled time, and its playlist.

> **Videos from an unaudited Google Cloud project stay private.** YouTube restricts videos uploaded through a Google Cloud project created after 28 July 2020 that has not passed the YouTube API audit to private viewing, whatever visibility was asked for. The agent reads the video back after the upload; if YouTube has locked it, the agent tells you once and does not upload it again. Request the audit for the project behind your OAuth client with [YouTube's API audit form](https://support.google.com/youtube/contact/yt_api_form). Until it passes, download the video from the chat and upload it in YouTube Studio.

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
| `Wiro-managed OAuth is not enabled for YouTube` in `OAuthConnect`'s `errors[]` | Wiro mode isn't available yet, and it is the default when `authmethod` is left out | Save your OAuth client (Step 3) and call `OAuthConnect` with `"authmethod": "own"` |
| `YouTube credentials not configured` | `authmethod: "own"` without a saved `clientid` and `clientsecret` | Save them (Step 3), then retry |
| Empty channel list | User has no YouTube channel | User creates a channel |
| `quotaExceeded` | Daily quota hit | Wait 24h or request higher quota from Google |
| `channelNotFound` | Channel deleted or moved | User re-selects via `SetPickerAccounts` |
| `invalid_grant` | Refresh token expired or revoked; a consent screen still in Testing expires it after 7 days | Publish the consent screen, then re-connect via `OAuthConnect` |
| A video uploaded as public or unlisted stays private | The Google Cloud project hasn't passed the YouTube API audit | Request the audit; until then upload the video in YouTube Studio |
