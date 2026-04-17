# Twitter / X Integration

Connect your agent to an X (formerly Twitter) account to publish posts, read timelines, and reply to mentions.

## Overview

The Twitter / X integration uses X API v2 with OAuth 2.0 Authorization Code Flow + PKCE.

**Skills that use this integration:**

- `twitterx-post` — Publish posts, threads, and replies; read mentions

**Agents that typically enable this integration:**

- Social Manager
- Any custom agent that needs X posting

## Availability

| Mode | Status | Notes |
|------|--------|-------|
| `"wiro"` | Available | One-click connect using Wiro's shared X app. |
| `"own"` | Available | Use your own X Developer app for custom branding. |

## Prerequisites

- **A Wiro API key** — [Authentication](/docs/authentication).
- **A deployed agent** — [Agent Overview](/docs/agent-overview).
- **(Own mode) An X Developer account** — [developer.x.com](https://developer.x.com/).
- **An HTTPS callback URL** for your backend.

## Wiro Mode (Simplest)

Skip all the own-mode setup. Just call Connect without `authMethod`:

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/XConnect" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "userAgentGuid": "your-useragent-guid",
    "redirectUrl": "https://your-app.com/settings/integrations"
  }'
```

User consents on the Wiro-branded consent screen. On return parse `x_connected=true&x_username=<handle>`. Jump to [Step 8: Verify](#step-8-verify) below.

## Complete Integration Walkthrough — Own Mode

### Step 1: Create an X Developer App

1. [developer.x.com/portal](https://developer.x.com/portal/dashboard) → sign in.
2. Apply for a developer account if needed (free tier works for testing).
3. Create a **Project** → create an **App** inside it.
4. Name your app — this shows on the consent screen.

### Step 2: Enable OAuth 2.0 with PKCE

1. **User authentication settings → Set up**.
2. Pick **OAuth 2.0**, type: **Web App, Automated App or Bot**.
3. Enable any extras you need (e.g. email).
4. **Callback URI / Redirect URL**:

   ```
   https://api.wiro.ai/v1/UserAgentOAuth/XCallback
   ```

5. Set your **Website URL** (public product URL).
6. Save.

### Step 3: Note the required scopes

Wiro requests these exact scopes (verified against `api-useragent-oauth.js` L159):

```
tweet.read tweet.write users.read offline.access
```

| Scope | Why |
|-------|-----|
| `tweet.read` | Read timeline, mentions, replies. |
| `tweet.write` | Publish posts and replies. |
| `users.read` | Get connected user's handle and display name. |
| `offline.access` | Issues a refresh token alongside the access token. |

### Step 4: Copy Client ID and Client Secret

After enabling OAuth 2.0, X shows **Client ID** and **Client Secret** — **save the secret immediately**. You cannot retrieve it later, only regenerate.

### Step 5: Save credentials to Wiro

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Update" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "guid": "your-useragent-guid",
    "configuration": {
      "credentials": {
        "twitter": {
          "clientId": "YOUR_X_CLIENT_ID",
          "clientSecret": "YOUR_X_CLIENT_SECRET"
        }
      }
    }
  }'
```

### Step 6: Initiate OAuth

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/XConnect" \
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
  "authorizeUrl": "https://x.com/i/oauth2/authorize?response_type=code&client_id=...&redirect_uri=...&scope=tweet.read%20tweet.write%20users.read%20offline.access&state=...&code_challenge=...&code_challenge_method=S256",
  "errors": []
}
```

> **PKCE:** Twitter/X is the only Wiro integration that uses PKCE (Proof Key for Code Exchange, S256). Wiro generates the `code_verifier` / `code_challenge` automatically and stores them in the OAuth state cache. You don't need to handle PKCE yourself.

### Step 7: Handle the callback

User returns with:

```
https://your-app.com/settings/integrations?x_connected=true&x_username=jane_doe
```

```javascript
const params = new URLSearchParams(window.location.search);
if (params.get("x_connected") === "true") {
  const handle = params.get("x_username");
  showSuccess(`Connected @${handle}`);
} else if (params.get("x_error")) {
  handleError(params.get("x_error"));
}
```

### Step 8: Verify

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/XStatus" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "userAgentGuid": "your-useragent-guid" }'
```

Response:

```json
{
  "result": true,
  "connected": true,
  "username": "jane_doe",
  "connectedAt": "2026-04-17T12:00:00.000Z",
  "tokenExpiresAt": "2026-04-17T14:00:00.000Z",
  "refreshTokenExpiresAt": "2026-10-14T12:00:00.000Z",
  "errors": []
}
```

- Access token lifetime: **~2 hours** (short!). Wiro auto-refreshes.
- Refresh token lifetime: **~180 days** from connection (hardcoded by Wiro, since X doesn't report one).
- `username` = `@`-less X handle.

### Step 9: Start the agent

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Start" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "guid": "your-useragent-guid" }'
```

## API Reference

### POST /UserAgentOAuth/XConnect

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userAgentGuid` | string | Yes | Agent instance GUID. |
| `redirectUrl` | string | Yes | HTTPS URL. |
| `authMethod` | string | No | `"wiro"` (default) or `"own"`. |

### GET /UserAgentOAuth/XCallback

Query params: `x_connected=true&x_username=<handle>` or `x_error=<code>`.

### POST /UserAgentOAuth/XStatus

Response: `connected`, `username`, `connectedAt`, `tokenExpiresAt` (~2h), `refreshTokenExpiresAt` (~180d).

### POST /UserAgentOAuth/XDisconnect

Calls X's revoke endpoint (`POST https://api.x.com/2/oauth2/revoke`) with Basic auth, then clears credentials. X is one of the few providers where Wiro actively revokes.

### POST /UserAgentOAuth/TokenRefresh

> Running agents refresh the X token automatically **every 90 minutes** (a dedicated background cron) because X access tokens only last 2 hours. Use this endpoint only for debugging or manual overrides.

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/TokenRefresh" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "userAgentGuid": "your-useragent-guid",
    "provider": "twitter"
  }'
```

Uses `grant_type=refresh_token`. Returns new access + refresh tokens. See [Automatic token refresh](/docs/agent-credentials#automatic-token-refresh).

## Using the Skill

Once the X account is connected, the agent's existing scheduled tasks use the `twitterx-post` platform skill to publish. To adjust the cron of the built-in `content-scanner` task (Social Manager), send an Update with `enabled` and `interval` only — cron skill bodies are template-controlled and `value` is silently ignored for `_editable: false` skills:

```json
{
  "guid": "your-useragent-guid",
  "configuration": {
    "custom_skills": [
      {
        "key": "content-scanner",
        "enabled": true,
        "interval": "0 */4 * * *"
      }
    ]
  }
}
```

To change **what** the scheduled task posts (topics, tone, hashtag rules), edit the paired preference skill `content-tone` instead — see [Agent Skills → Updating Preferences](/docs/agent-skills#updating-preferences).

## Troubleshooting

| Error code | Meaning | What to do |
|------------|---------|------------|
| `missing_params` | Callback reached without `state` or `code`. | Start a new flow from Step 6. |
| `authorization_denied` | User cancelled, or OAuth 2.0 not enabled in app settings. | Verify OAuth 2.0 setup (Step 2); retry. |
| `session_expired` | 15-min state cache expired (includes PKCE verifier). | Call `XConnect` again. |
| `token_exchange_failed` | Wrong Client Secret, redirect URI mismatch, or lost PKCE verifier. | Re-copy Client Secret; verify URL; start over. |
| `useragent_not_found` | Invalid guid. | Use `POST /UserAgent/MyAgents`. |
| `invalid_config` | No `credentials.twitter` block. | `UserAgent/Update` with `clientId` + `clientSecret`. |
| `internal_error` | Server error. | Retry; contact support. |

### Posts fail with 429 Too Many Requests

Free-tier X Developer apps have strict per-app rate limits. For production, move to Basic ($100/mo) or higher. Limits are per app, not per user — high-volume multi-tenant partners need a higher tier.

### Token expires every 2 hours

Access token lifetime is unusually short. Wiro's agent runs a dedicated background cron every 90 minutes to refresh X tokens before they expire. If the refresh cron hits a wall (e.g. user revoked the app in X settings, or X flagged the app), the next skill call fails with a 401 — reconnect is required.

## Multi-Tenant Architecture

1. **One X Developer app** per product in own mode. Wiro-mode partners share Wiro's app.
2. **One Wiro agent instance per customer.**
3. **Your app display name** appears on every customer's consent screen (own mode).
4. **Rate limits are per app.** Plan your X Developer tier around aggregate volume.

## Related

- [Agent Credentials & OAuth](/docs/agent-credentials)
- [Agent Overview](/docs/agent-overview)
- [Agent Skills](/docs/agent-skills)
- [X Developer Platform](https://developer.x.com/)
