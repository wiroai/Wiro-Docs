# Mailchimp Integration

Connect your agent to Mailchimp for audience and campaign management. Supports OAuth 2.0 or direct API key.

## Overview

The Mailchimp integration is unique in supporting three authentication options: Wiro's shared OAuth app, your own OAuth app, or a direct API key bypassing OAuth entirely.

**Skills that use this integration:**

- `mailchimp-email` — Audience and campaign management
- `newsletter-compose` — uses Mailchimp as an ESP when enabled alongside

**Agents that typically enable this integration:**

- Newsletter Manager

## Availability

| Mode | Status | Notes |
|------|--------|-------|
| `"wiro"` | Available | OAuth with Wiro's shared Mailchimp app. |
| `"own"` | Available | OAuth with your own Mailchimp registered app. |
| API key | Available | Paste a server-scoped Mailchimp API key directly — no OAuth. |

## Prerequisites

- **A Wiro API key** — [Authentication](/docs/authentication).
- **A deployed agent** — [Agent Overview](/docs/agent-overview).
- **A Mailchimp account**.
- **(Own OAuth mode) A registered Mailchimp app** — [admin.mailchimp.com/account/oauth2_client](https://admin.mailchimp.com/account/oauth2_client/).
- **(API-key mode) A server-scoped Mailchimp API key**.

## Option A: OAuth (Wiro or Own Mode)

### Own Step 1: Register a Mailchimp app

1. [admin.mailchimp.com/account/oauth2_client](https://admin.mailchimp.com/account/oauth2_client/).
2. **Register and manage your apps**.
3. Fill **App name**, **Description**, **Company**, **App website**.
4. Under **Redirect URI**, add:

   ```
   https://api.wiro.ai/v1/UserAgentOAuth/MailchimpCallback
   ```

5. Save; copy **Client ID** and **Client Secret**.

> **No OAuth scopes to configure.** Mailchimp's OAuth 2.0 doesn't use scopes — connected apps get full account access. Wiro's `authorizeUrl` omits any scope parameter.

### Own Step 2: Save credentials

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Update" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "guid": "your-useragent-guid",
    "configuration": {
      "credentials": {
        "mailchimp": {
          "clientId": "YOUR_MAILCHIMP_CLIENT_ID",
          "clientSecret": "YOUR_MAILCHIMP_CLIENT_SECRET"
        }
      }
    }
  }'
```

### OAuth Step 3: Initiate

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/MailchimpConnect" \
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
  "authorizeUrl": "https://login.mailchimp.com/oauth2/authorize?response_type=code&client_id=...&redirect_uri=...&state=...",
  "errors": []
}
```

No `scope` parameter — Mailchimp OAuth doesn't use scopes.

### OAuth Step 4: Handle the callback

Wiro exchanges the code via `POST https://login.mailchimp.com/oauth2/token`, then fetches metadata from `GET https://login.mailchimp.com/oauth2/metadata` with `Authorization: OAuth <access_token>` to retrieve the server prefix (`dc`) and account name.

**Success URL:**

```
https://your-app.com/settings/integrations?mailchimp_connected=true&mailchimp_account=Your%20Company
```

### OAuth Step 5: Verify

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/MailchimpStatus" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "userAgentGuid": "your-useragent-guid" }'
```

Response:

```json
{
  "result": true,
  "connected": true,
  "username": "Your Company",
  "connectedAt": "2026-04-17T12:00:00.000Z",
  "errors": []
}
```

> **Mailchimp tokens don't expire.** `Status` responses don't include `tokenExpiresAt` or `refreshTokenExpiresAt`. There's no `TokenRefresh` support for Mailchimp either — it's excluded from the valid providers list.

## Option B: Direct API Key (No OAuth)

For server-side agents where OAuth is overkill:

### Step 1: Get a Mailchimp API Key

1. Sign in → **Profile → Extras → API keys**.
2. **Create A Key**, name it, copy the value. The key ends in a datacenter prefix like `-us14`.

### Step 2: Save to Wiro

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Update" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "guid": "your-useragent-guid",
    "configuration": {
      "credentials": {
        "mailchimp": {
          "apiKey": "abcdef1234567890-us14"
        }
      }
    }
  }'
```

No further OAuth step. The agent uses the API key directly.

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Start" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "guid": "your-useragent-guid" }'
```

## API Reference

### POST /UserAgentOAuth/MailchimpConnect

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userAgentGuid` | string | Yes | Agent instance GUID. |
| `redirectUrl` | string | Yes | HTTPS URL. |
| `authMethod` | string | No | `"wiro"` (default) or `"own"`. |

### GET /UserAgentOAuth/MailchimpCallback

Query params: `mailchimp_connected=true&mailchimp_account=<name>` or `mailchimp_error=<code>`.

### POST /UserAgentOAuth/MailchimpStatus

Response fields: `connected`, `username` (= accountName), `connectedAt`. **No `tokenExpiresAt`, no `refreshTokenExpiresAt`** — tokens don't expire.

> **API key-only mode caveat:** `connected` is computed from `authMethod in {wiro, own}` **and** a non-empty `accessToken`. If you set up Mailchimp via direct API key (no OAuth), `authMethod` and `accessToken` stay empty and `MailchimpStatus.connected` returns `false` — even though the agent runtime is fully functional (the `mailchimp-email` skill reads `$MAILCHIMP_API_KEY` directly via `start.sh`). Don't use `MailchimpStatus.connected` as the source of truth for API key setups; instead, check that `credentials.mailchimp.apiKey` is non-empty in `POST /UserAgent/Detail`.

### POST /UserAgentOAuth/MailchimpDisconnect

Clears credentials (no remote revoke — Mailchimp doesn't expose a revoke endpoint for OAuth tokens).

### TokenRefresh

**Not supported for Mailchimp.** Calling `POST /UserAgentOAuth/TokenRefresh` with `provider: "mailchimp"` returns an error — Mailchimp tokens don't expire, so refresh is unnecessary.

## Using the Skill

```json
{
  "guid": "your-useragent-guid",
  "configuration": {
    "custom_skills": [
      {
        "key": "subscriber-scanner",
        "enabled": true,
        "interval": "0 10 * * *",
        "value": "Check subscriber list health and flag anomalies"
      }
    ]
  }
}
```

## Troubleshooting

| Error code | Meaning | What to do |
|------------|---------|------------|
| `authorization_denied` | User cancelled. | Retry. |
| `session_expired` | State cache expired (15 min). | Restart. |
| `token_exchange_failed` | Wrong Client Secret or redirect URI mismatch. | Re-copy; verify URL. |
| `useragent_not_found` | Invalid guid. | Use `POST /UserAgent/MyAgents`. |
| `invalid_config` | No `credentials.mailchimp` block. | Update with credentials. |
| `internal_error` | Server error. | Retry; contact support. |

### API calls fail with 401

- OAuth: stored token is invalid; disconnect and reconnect.
- API key: wrong key or datacenter suffix stripped. Paste the full key including `-us14`.

## Multi-Tenant Architecture

1. **One Mailchimp registered app** per product in own-OAuth mode.
2. **API-key mode is simplest** for tenants who prefer a single-purpose key.
3. **One Wiro agent instance per customer.**
4. Mailchimp rate limits are per-datacenter and per-account (~10 concurrent connections).

## Related

- [Agent Credentials & OAuth](/docs/agent-credentials)
- [Agent Overview](/docs/agent-overview)
- [Agent Skills](/docs/agent-skills)
- [Mailchimp Marketing API](https://mailchimp.com/developer/marketing/)
