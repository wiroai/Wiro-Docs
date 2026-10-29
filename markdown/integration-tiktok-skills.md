# TikTok Integration

Connect your agent to a TikTok account to publish videos.

## Overview

The TikTok integration uses TikTok's OAuth 2.0 with the Content Posting API.

**Skills that use this integration:**

- `int-tiktok-post`: Publish videos and carousel posts

**Agents that typically enable this integration:**

- Social Manager
- Any custom agent that needs TikTok publishing

## Availability

| Mode | Status | Notes |
|------|--------|-------|
| `"own"` | Available | Use your own TikTok for Developers app. |
| `"wiro"` | Coming soon | Wiro's shared TikTok app is awaiting TikTok's review. Until then, `OAuthConnect` in Wiro mode, which is also what you get when you leave out `authmethod`, returns `Wiro-managed OAuth is not enabled for TikTok`. |

## Prerequisites

- **A Wiro API key** (see [Authentication](/docs/authentication)).
- **A deployed agent** (see [Agent Overview](/docs/agent-overview)).
- **A TikTok for Developers account** ([developers.tiktok.com](https://developers.tiktok.com/)).
- **An HTTPS callback URL**.

## Complete Integration Walkthrough: Own Mode

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

Wiro requests these exact scopes:

```
user.info.basic,video.publish
```

| Scope | Why |
|-------|-----|
| `user.info.basic` | User handle, avatar, display name. |
| `video.publish` | Publish video content to the authorized account. |

Other scopes like `video.upload`, `video.list` are **not** used by Wiro.

### Step 5: Copy Client Key and Client Secret

**App details** → copy **Client Key** and **Client Secret**. Note: TikTok calls the first one "key" (not "ID"), and the field name in Wiro is `clientkey`.

### Step 6: Save credentials

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/CredentialUpsert" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "fields": [
      { "credentialkey": "tiktok", "fieldname": "clientkey", "fieldvalue": "YOUR_TIKTOK_CLIENT_KEY" },
      { "credentialkey": "tiktok", "fieldname": "clientsecret", "fieldvalue": "YOUR_TIKTOK_CLIENT_SECRET" },
      { "credentialkey": "tiktok", "fieldname": "authmethod", "fieldvalue": "own" }
    ]
  }'
```

### Step 7: Initiate OAuth

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/OAuthConnect" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "credentialkey": "tiktok",
    "redirecturl": "https://your-app.com/settings/integrations",
    "authmethod": "own"
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

Success: `?tiktok_connected=true&tiktok_username=<display_name>`.
Error: `?tiktok_error=<code>`.

> `tiktok_username` in the callback is populated from TikTok's `display_name` field (the creator's public display name), not the handle. The handle/username as it appears in URLs is not exposed by TikTok's OAuth user info endpoint.

### Step 9: Verify

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/OAuthStatus" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "credentialkey": "tiktok"
  }'
```

Response:

```json
{
  "result": true,
  "connected": true,
  "accounts": [
    { "id": "Creator Display Name", "name": "Creator Display Name" }
  ],
  "connectedat": "2026-04-17T12:00:00.000Z",
  "tokenexpiresat": "2026-04-18T12:00:00.000Z",
  "errors": []
}
```

- Access token: ~1 day (86400s).
- Refresh token: ~1 year (31536000s).
- `accounts[0].id` and `accounts[0].name` = TikTok **display name** (the creator's public display name as set in their profile), NOT the `@handle`. The handle/URL username is not exposed by TikTok's OAuth `user/info/` endpoint, so Wiro stores `display_name` and returns it as both the account identifier and its name.

### Step 10: Start the agent

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Start" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "guid": "your-useragent-guid" }'
```

## API Reference

### POST /UserAgentOAuth/OAuthConnect

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Agent instance GUID. |
| `credentialkey` | string | Yes | `"tiktok"`. |
| `redirecturl` | string | Yes | HTTPS URL. |
| `authmethod` | string | No | `"own"`. Omitted, it means `"wiro"`, which is not available yet. |

### GET /UserAgentOAuth/TikTokCallback

Query params: `tiktok_connected=true&tiktok_username=<display_name>` or `tiktok_error=<code>`. `tiktok_username` is TikTok's display name (from the OAuth `user/info/` endpoint's `display_name` field), not the `@handle`. The callback path is per-provider: TikTok's stays `TikTokCallback`.

### POST /UserAgentOAuth/OAuthStatus

Body: `{ useragentguid, credentialkey: "tiktok" }`. Response: `connected`, `accounts: [{id, name}]` (1-element with the connected display name), `connectedat`, `tokenexpiresat` (~1 day).

### POST /UserAgentOAuth/OAuthDisconnect

Body: `{ useragentguid, credentialkey: "tiktok" }`. Calls TikTok's revoke endpoint (`POST https://open.tiktokapis.com/v2/oauth/revoke/`), then clears credentials. TikTok is one of the few providers where Wiro actively revokes.

### Token lifecycle

Wiro maintains the TikTok connection automatically while the agent is running. If TikTok revokes the authorization or `OAuthStatus` reports `connected: false`, reconnect through the OAuth flow.

## Troubleshooting

| Error code | Meaning | What to do |
|------------|---------|------------|
| `missing_params` | Callback hit without `state` or `code`. | Start a new OAuth flow. |
| `authorization_denied` | User cancelled, or scopes not enabled. | Verify scope configuration. |
| `session_expired` | 15-min state cache expired. | Restart OAuth. |
| `token_exchange_failed` | Wrong Client Secret or redirect URI mismatch. | Re-copy; verify URL. |
| `Wiro-managed OAuth is not enabled for TikTok` | Returned in `OAuthConnect`'s `errors[]`: Wiro mode isn't available yet, and it is the default when `authmethod` is left out. | Save your app credentials (Step 6) and call `OAuthConnect` with `"authmethod": "own"`. |
| `useragent_not_found` | Invalid guid. | Use `POST /UserAgent/MyAgents`. |
| `TikTok credentials not configured` | Returned in `OAuthConnect`'s `errors[]` when `authmethod: "own"` but `clientkey` / `clientsecret` are missing. | `UserAgent/CredentialUpsert` with `clientkey` + `clientsecret`. |
| `internal_error` | Server error. | Retry. |

### "unaudited_client" or limited publishing

Until your TikTok app is audited, publishing may be limited to private posts or a small set of listed test users. Submit for audit in the TikTok Developer portal for production volume.

## Multi-Tenant Architecture

1. **One TikTok app per product** in own mode.
2. **One Wiro agent instance per customer.**
3. TikTok per-app limits apply: plan around aggregate volume.

## Related

- [Agent Credentials & OAuth](/docs/agent-credentials)
- [Agent Overview](/docs/agent-overview)
- [Agent Skills](/docs/agent-skills)
- [TikTok Ads integration](/docs/integration-tiktokads-skills): separate product for paid advertising; this page covers organic posting only.
- [TikTok for Developers](https://developers.tiktok.com/)
