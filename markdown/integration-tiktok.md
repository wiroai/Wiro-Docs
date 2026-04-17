# TikTok Integration

Connect your agents to a TikTok account so they can publish videos and posts.

## Overview

The TikTok integration lets an agent publish content to a TikTok account through the TikTok Content Posting API.

**Skills that use this integration:**

- `tiktok-post` — Publish videos to TikTok

**Agents that typically enable this integration:**

- Social Manager
- Any custom agent that needs TikTok publishing

## Availability

| Mode | Status | Notes |
|------|--------|-------|
| `"wiro"` | Available | One-click connect using Wiro's shared TikTok app. |
| `"own"` | Available | Use your own TikTok for Developers app for custom branding. |

## Prerequisites

- **A Wiro API key** — see [Authentication](/docs/authentication).
- **A deployed agent** — see [Agent Overview](/docs/agent-overview).
- **A TikTok account** the connecting user controls.
- **(Own mode only) A TikTok for Developers account** — [developers.tiktok.com](https://developers.tiktok.com/).
- **An HTTPS callback URL**.

## Complete Integration Walkthrough — Wiro Mode

Call `TikTokConnect` with no `authMethod` (defaults to `"wiro"`), redirect the user, read `tiktok_connected=true&tiktok_username=<handle>` on return.

## Complete Integration Walkthrough — Own Mode

### Step 1: Create a TikTok for Developers App

1. Go to [developers.tiktok.com/apps](https://developers.tiktok.com/apps) and sign in.
2. Click **Create app**.
3. Fill in **App name**, **Category**, **Description**, **Icon**.

### Step 2: Add the Content Posting API scope

1. In the app dashboard, go to **Add products**.
2. Add **Login Kit** and **Content Posting API**.
3. For **Content Posting API**, request the scopes you need:
   - `video.upload` (direct post) or `video.publish` (user finalizes in TikTok app).

### Step 3: Configure redirect URI

1. Under **Login Kit → Platforms → Web**, add the callback URL:

   ```
   https://api.wiro.ai/v1/UserAgentOAuth/TikTokCallback
   ```

2. Save.

### Step 4: Note the required scopes

| Scope | Why |
|-------|-----|
| `user.info.basic` | User handle, avatar, display name. |
| `video.upload` or `video.publish` | Publish video content. |
| `video.list` | Read the user's recent posts. |

### Step 5: Copy Client Key and Client Secret

In **App details**, copy the **Client Key** and **Client Secret**. TikTok calls them "key" not "ID" — note the field names for `UserAgent/Update`.

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

### Step 8: Handle callback

Success: `?tiktok_connected=true&tiktok_username=<handle>`. Error: `?tiktok_error=<code>`.

### Step 9: Verify + Start

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/TikTokStatus" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "userAgentGuid": "your-useragent-guid" }'
```

## API Reference

### **POST** /UserAgentOAuth/TikTokConnect

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userAgentGuid` | string | Yes | Agent instance GUID. |
| `redirectUrl` | string | Yes | HTTPS URL. |
| `authMethod` | string | No | `"wiro"` (default) or `"own"`. |

### **GET** /UserAgentOAuth/TikTokCallback

Callback params: `tiktok_connected=true&tiktok_username=<handle>` or `tiktok_error=<code>`.

### **POST** /UserAgentOAuth/TikTokStatus / TikTokDisconnect

Standard shape.

### **POST** /UserAgentOAuth/TokenRefresh

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/TokenRefresh" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "userAgentGuid": "your-useragent-guid", "provider": "tiktok" }'
```

## Troubleshooting

| Error code | Meaning | What to do |
|------------|---------|------------|
| `authorization_denied` | User cancelled, or scopes not enabled in app. | Verify scope configuration; retry. |
| `session_expired` | State cache expired. | Restart OAuth. |
| `token_exchange_failed` | Wrong Client Secret or redirect URI mismatch. | Re-copy Client Secret; verify redirect URI. |
| `useragent_not_found` | Invalid `userAgentGuid`. | Use `POST /UserAgent/MyAgents`. |
| `invalid_config` | No `credentials.tiktok` on the agent. | Update with `clientKey` + `clientSecret`. |
| `internal_error` | Server error. | Retry; contact support. |

### "unaudited_client" warning

Until your app is audited by TikTok, publishing may be limited to private posts or to the app's listed test users. Submit for audit in the TikTok Developer portal for production readiness.

## Multi-Tenant Architecture

1. One TikTok app per product in own mode.
2. One Wiro agent instance per customer.
3. TikTok per-app rate limits — see TikTok's platform docs.

## Related

- [Agent Credentials & OAuth](/docs/agent-credentials)
- [Agent Overview](/docs/agent-overview)
- [Agent Skills](/docs/agent-skills)
- [TikTok for Developers](https://developers.tiktok.com/)
