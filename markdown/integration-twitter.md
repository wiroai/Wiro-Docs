# Twitter / X Integration

Connect your agents to an X (formerly Twitter) account so they can publish posts, reply to mentions, and manage conversations.

## Overview

The Twitter / X integration lets an agent act on behalf of an X account via X's API v2 with OAuth 2.0 PKCE.

**Skills that use this integration:**

- `twitterx-post` — Publish posts, threads, replies; read mentions

**Agents that typically enable this integration:**

- Social Manager
- Any custom agent that needs X posting

## Availability

| Mode | Status | Notes |
|------|--------|-------|
| `"wiro"` | Available | One-click connect using Wiro's shared X app. |
| `"own"` | Available | Use your own X Developer app, e.g. for custom branding on the consent screen. |

## Prerequisites

- **A Wiro API key** — see [Authentication](/docs/authentication).
- **A deployed agent** — see [Agent Overview](/docs/agent-overview), keep the `useragentguid`.
- **An X account** for the connecting user.
- **(Own mode only) An X Developer account** — sign up at [developer.x.com](https://developer.x.com/).
- **An HTTPS callback URL** for your backend.

## Complete Integration Walkthrough — Wiro Mode

The simplest path. Skip to Step 3 below.

### Wiro mode Step 1: Initiate OAuth

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/XConnect" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "userAgentGuid": "your-useragent-guid",
    "redirectUrl": "https://your-app.com/settings/integrations"
  }'
```

Response contains `authorizeUrl`. Redirect the user; they see Wiro-branded consent. Upon return, parse `x_connected=true&x_username=<handle>`.

Go to Step 5 (verification) to confirm — Steps 1–4 below are only for own mode.

## Complete Integration Walkthrough — Own Mode

### Step 1: Create an X Developer App

1. Go to [developer.x.com/portal](https://developer.x.com/portal/dashboard) and sign in.
2. Apply for a developer account if you have not already (free tier is sufficient for small test volumes; higher tiers unlock larger monthly post caps).
3. Create a **Project** and, inside it, an **App**.
4. Name your app — this is the name shown on the consent screen.

### Step 2: Enable OAuth 2.0 with PKCE

1. Inside the app, go to **User authentication settings → Set up**.
2. Choose **OAuth 2.0**, type of app: **Web App, Automated App or Bot**.
3. Enable **Request email from users** if your agent needs the email address.
4. Set **Callback URI / Redirect URL**:

   ```
   https://api.wiro.ai/v1/UserAgentOAuth/XCallback
   ```

5. Set **Website URL** (your public product URL).
6. Save.

### Step 3: Note the required scopes

Wiro requests:

| Scope | Why |
|-------|-----|
| `tweet.read` | Read timeline, mentions, replies. |
| `tweet.write` | Publish posts and replies. |
| `users.read` | Get the connected user's handle and display name. |
| `offline.access` | Enables refresh tokens. |

### Step 4: Copy your Client ID and Client Secret

After enabling OAuth 2.0, X shows the **Client ID** and **Client Secret** once. **Save the secret immediately** — you cannot retrieve it later; you can only regenerate.

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
  "authorizeUrl": "https://x.com/i/oauth2/authorize?response_type=code&client_id=...&redirect_uri=...&scope=tweet.read+tweet.write+users.read+offline.access&state=...&code_challenge=...&code_challenge_method=S256",
  "errors": []
}
```

X uses PKCE (Proof Key for Code Exchange) — Wiro generates the code verifier/challenge automatically. You do not need to handle PKCE yourself.

### Step 7: Handle the callback

After consent, the user returns to your `redirectUrl` with:

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

### Step 8: Verify the connection

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/XStatus" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "userAgentGuid": "your-useragent-guid" }'
```

### Step 9: Start the agent

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Start" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "guid": "your-useragent-guid" }'
```

## API Reference

### **POST** /UserAgentOAuth/XConnect

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userAgentGuid` | string | Yes | Agent instance GUID. |
| `redirectUrl` | string | Yes | HTTPS URL. |
| `authMethod` | string | No | `"wiro"` (default) or `"own"`. |

### **GET** /UserAgentOAuth/XCallback

Callback params appended to your `redirectUrl`: `x_connected=true&x_username=<handle>` on success, `x_error=<code>` on failure.

### **POST** /UserAgentOAuth/XStatus / XDisconnect

Standard shape — see [Agent Credentials & OAuth](/docs/agent-credentials#generic-oauth-endpoints).

### **POST** /UserAgentOAuth/TokenRefresh

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/TokenRefresh" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "userAgentGuid": "your-useragent-guid", "provider": "twitter" }'
```

## Using the Skill

Enable `twitterx-post`. Configure schedule via `custom_skills`.

## Troubleshooting

| Error code | Meaning | What to do |
|------------|---------|------------|
| `authorization_denied` | User cancelled, or OAuth 2.0 is not enabled in app settings. | Verify OAuth 2.0 setup (Step 2); retry. |
| `session_expired` | 15-minute state cache expired. | Call `XConnect` again. |
| `token_exchange_failed` | Wrong Client Secret (own mode), redirect URI mismatch, or PKCE verifier lost. | Re-copy Client Secret; verify redirect URI; start over. |
| `useragent_not_found` | Invalid `userAgentGuid`. | Find with `POST /UserAgent/MyAgents`. |
| `invalid_config` | No `credentials.twitter` on the agent. | `UserAgent/Update` with `clientId` + `clientSecret` (own mode). |
| `internal_error` | Server error. | Retry; contact support. |

### Posts fail with 403 or 429

Rate limits kick in quickly on free-tier X Developer apps. For production, move to **Basic** ($100/month) or higher. Rate limits are per app, not per user — high-volume multi-tenant partners need a higher tier.

## Multi-Tenant Architecture

1. One X Developer app per product in own mode; Wiro-mode partners share Wiro's app.
2. One Wiro agent instance per customer.
3. Your app display name appears on every customer's consent screen in own mode.
4. X imposes per-app limits on tweet writes. Plan tier choice around expected aggregate volume.

## Related

- [Agent Credentials & OAuth](/docs/agent-credentials)
- [Agent Overview](/docs/agent-overview)
- [Agent Skills](/docs/agent-skills)
- [X Developer Platform](https://developer.x.com/)
