# TikTok Integration

Connect your agent to a TikTok account to publish videos.

## Overview

The TikTok integration uses TikTok's OAuth 2.0 with the Content Posting API.

**Skills that use this integration:**

- `tiktok-post` — Publish videos and carousel posts

**Agents that typically enable this integration:**

- Social Manager
- Any custom agent that needs TikTok publishing

## Availability

| Mode | Status | Notes |
|------|--------|-------|
| `"wiro"` | Available | One-click connect using Wiro's shared TikTok app. |
| `"own"` | Available | Use your own TikTok for Developers app. |

## Prerequisites

- **A Wiro API key** — [Authentication](/docs/authentication).
- **A deployed agent** — [Agent Overview](/docs/agent-overview).
- **(Own mode) A TikTok for Developers account** — [developers.tiktok.com](https://developers.tiktok.com/).
- **An HTTPS callback URL**.

## Wiro Mode

Call `TikTokConnect` without `authMethod`, redirect, parse `tiktok_connected=true&tiktok_username=<handle>`.

## Complete Integration Walkthrough — Own Mode

### Step 1: Create a TikTok for Developers App

1. [developers.tiktok.com/apps](https://developers.tiktok.com/apps) → sign in.
2. **Create app**.
3. **App name**, **category**, **description**, **icon**.

### Step 2: Add Login Kit + Content Posting API

1. **Add products**.
2. Add **Login Kit** and **Content Posting API**.

### Step 3: Configure redirect URI

1. **Login Kit → Platforms → Web**.
2. Add callback URL:

   ```
   https://api.wiro.ai/v1/UserAgentOAuth/TikTokCallback
   ```

3. Save.

### Step 4: Note the required scopes

Wiro requests these exact scopes (verified against `api-useragent-oauth.js` L483-L484):

```
user.info.basic,video.publish
```

| Scope | Why |
|-------|-----|
| `user.info.basic` | User handle, avatar, display name. |
| `video.publish` | Publish video content to the authorized account. |

Other scopes like `video.upload`, `video.list` are **not** used by Wiro.

### Step 5: Copy Client Key and Client Secret

**App details** → copy **Client Key** and **Client Secret**. Note: TikTok calls the first one "key" (not "ID") — the field name in Wiro is `clientKey`.

### Step 6: Save credentials

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Update" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "guid": "your-useragent-guid",
    "configuration": {
      "credentials": {
        "tiktok": {
          "clientKey": "YOUR_TIKTOK_CLIENT_KEY",
          "clientSecret": "YOUR_TIKTOK_CLIENT_SECRET"
        }
      }
    }
  }'
```

### Step 7: Initiate OAuth

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/TikTokConnect" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "userAgentGuid": "your-useragent-guid",
    "redirectUrl": "https://your-app.com/settings/integrations",
    "authMethod": "own"
  }'
```

Response:

```json
{
  "result": true,
  "authorizeUrl": "https://www.tiktok.com/v2/auth/authorize/?client_key=...&scope=user.info.basic,video.publish&response_type=code&redirect_uri=...&state=...",
  "errors": []
}
```

### Step 8: Handle the callback

Success: `?tiktok_connected=true&tiktok_username=<handle>`.
Error: `?tiktok_error=<code>`.

### Step 9: Verify

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/TikTokStatus" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "userAgentGuid": "your-useragent-guid" }'
```

Response:

```json
{
  "result": true,
  "connected": true,
  "username": "creator_handle",
  "connectedAt": "2026-04-17T12:00:00.000Z",
  "tokenExpiresAt": "2026-04-18T12:00:00.000Z",
  "refreshTokenExpiresAt": "2027-04-17T12:00:00.000Z",
  "errors": []
}
```

- Access token: ~1 day (86400s).
- Refresh token: ~1 year (31536000s).
- `username` = TikTok handle without `@`.

### Step 10: Start the agent

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Start" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "guid": "your-useragent-guid" }'
```

## API Reference

### POST /UserAgentOAuth/TikTokConnect

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userAgentGuid` | string | Yes | Agent instance GUID. |
| `redirectUrl` | string | Yes | HTTPS URL. |
| `authMethod` | string | No | `"wiro"` (default) or `"own"`. |

### GET /UserAgentOAuth/TikTokCallback

Query params: `tiktok_connected=true&tiktok_username=<handle>` or `tiktok_error=<code>`.

### POST /UserAgentOAuth/TikTokStatus

Response: `connected`, `username` (= tiktokUsername), `connectedAt`, `tokenExpiresAt` (~1 day), `refreshTokenExpiresAt` (~1 year).

### POST /UserAgentOAuth/TikTokDisconnect

Calls TikTok's revoke endpoint (`POST https://open.tiktokapis.com/v2/oauth/revoke/`), then clears credentials. TikTok is one of the few providers where Wiro actively revokes.

### POST /UserAgentOAuth/TokenRefresh

> Running agents refresh the TikTok token automatically via the daily maintenance cron (access token lifetime is 1 day). Use this only for debugging.

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/TokenRefresh" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "userAgentGuid": "your-useragent-guid", "provider": "tiktok" }'
```

See [Automatic token refresh](/docs/agent-credentials#automatic-token-refresh).

## Troubleshooting

| Error code | Meaning | What to do |
|------------|---------|------------|
| `authorization_denied` | User cancelled, or scopes not enabled. | Verify scope configuration. |
| `session_expired` | 15-min state cache expired. | Restart OAuth. |
| `token_exchange_failed` | Wrong Client Secret or redirect URI mismatch. | Re-copy; verify URL. |
| `useragent_not_found` | Invalid guid. | Use `POST /UserAgent/MyAgents`. |
| `invalid_config` | No `credentials.tiktok` block. | Update with `clientKey` + `clientSecret`. |
| `internal_error` | Server error. | Retry. |

### "unaudited_client" or limited publishing

Until your TikTok app is audited, publishing may be limited to private posts or a small set of listed test users. Submit for audit in the TikTok Developer portal for production volume.

## Multi-Tenant Architecture

1. **One TikTok app per product** in own mode.
2. **One Wiro agent instance per customer.**
3. TikTok per-app limits apply — plan around aggregate volume.

## Related

- [Agent Credentials & OAuth](/docs/agent-credentials)
- [Agent Overview](/docs/agent-overview)
- [Agent Skills](/docs/agent-skills)
- [TikTok for Developers](https://developers.tiktok.com/)
