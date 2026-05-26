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
curl -X POST "https://api.wiro.ai/v1/UserAgent/CredentialUpsert" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "fields": [
      { "credentialkey": "mailchimp", "fieldname": "clientid",     "fieldvalue": "YOUR_MAILCHIMP_CLIENT_ID" },
      { "credentialkey": "mailchimp", "fieldname": "clientsecret", "fieldvalue": "YOUR_MAILCHIMP_CLIENT_SECRET" },
      { "credentialkey": "mailchimp", "fieldname": "authmethod",   "fieldvalue": "own" }
    ]
  }'
```

### OAuth Step 3: Initiate

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/OAuthConnect" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "credentialkey": "mailchimp",
    "redirecturl": "https://your-app.com/settings/integrations",
    "authmethod": "own"
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
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/OAuthStatus" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "credentialkey": "mailchimp"
  }'
```

Response:

```json
{
  "result": true,
  "connected": true,
  "accounts": [
    { "id": "Your Company", "name": "Your Company" }
  ],
  "connectedat": "2026-04-17T12:00:00.000Z",
  "errors": []
}
```

> **Mailchimp tokens don't expire.** `OAuthStatus` responses for Mailchimp don't include `tokenexpiresat`. There's no `TokenRefresh` support for Mailchimp either — it's excluded from the valid providers list.

## Option B: Direct API Key (No OAuth)

For server-side agents where OAuth is overkill:

### Step 1: Get a Mailchimp API Key

1. Sign in → **Profile → Extras → API keys**.
2. **Create A Key**, name it, copy the value. The key ends in a datacenter prefix like `-us14`.

### Step 2: Save to Wiro

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/CredentialUpsert" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "fields": [
      { "credentialkey": "mailchimp", "fieldname": "authmethod", "fieldvalue": "api_key" },
      { "credentialkey": "mailchimp", "fieldname": "apikey",     "fieldvalue": "abcdef1234567890-us14" }
    ]
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

### POST /UserAgentOAuth/OAuthConnect

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Agent instance GUID. |
| `credentialkey` | string | Yes | `"mailchimp"`. |
| `redirecturl` | string | Yes | HTTPS URL. |
| `authmethod` | string | No | `"wiro"` (default) or `"own"`. |

### GET /UserAgentOAuth/MailchimpCallback

Query params: `mailchimp_connected=true&mailchimp_account=<name>` or `mailchimp_error=<code>`. The callback path is per-provider — Mailchimp's stays `MailchimpCallback`.

### POST /UserAgentOAuth/OAuthStatus

Body: `{ useragentguid, credentialkey: "mailchimp" }`. Response: `connected`, `accounts: [{id, name}]` (1-element with the Mailchimp account name), `connectedat`. **No `tokenexpiresat`** — Mailchimp OAuth tokens don't expire.

> **API key-only mode caveat:** `OAuthStatus.connected` is computed from `authmethod in {wiro, own}` **and** a non-empty `accesstoken`. If you set up Mailchimp via direct API key (no OAuth), `authmethod` is `"api_key"` and `accesstoken` is empty, so `OAuthStatus.connected` returns `false` — even though the agent runtime is fully functional (the `mailchimp-email` skill reads the API key directly). Don't use `OAuthStatus.connected` as the source of truth for API key setups; check that `credentials.mailchimp.apikey` is non-empty in `POST /UserAgent/Detail` instead.

### POST /UserAgentOAuth/OAuthDisconnect

Body: `{ useragentguid, credentialkey: "mailchimp" }`. Clears credentials (no remote revoke — Mailchimp doesn't expose a revoke endpoint for OAuth tokens).

### TokenRefresh

**Not supported for Mailchimp.** Calling `POST /UserAgentOAuth/TokenRefresh` with `provider: "mailchimp"` returns an error — Mailchimp tokens don't expire, so refresh is unnecessary.

## Using the Skill

Once Mailchimp is connected (OAuth or API key), the agent's scheduled tasks use the `mailchimp-email` platform skill for audience and campaign operations. Adjust the cron of the built-in `cron-subscriber-scanner` task (Newsletter Manager) with `enabled` and `interval` only — cron skill bodies are template-controlled and `value` is silently ignored for bundled crons:

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/CustomSkillUpsert" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "skillkey": "cron-subscriber-scanner",
    "enabled": true,
    "interval": "0 10 * * *"
  }'
```

To change **what** the scanner checks (target lists, bounce thresholds, tone, audience segments), edit the paired preference skill `newsletter-strategy` instead — see [Agent Skills → Updating Preferences](/docs/agent-skills#updating-preference-skills).

## Troubleshooting

| Error code | Meaning | What to do |
|------------|---------|------------|
| `authorization_denied` | User cancelled. | Retry. |
| `session_expired` | State cache expired (15 min). | Restart. |
| `token_exchange_failed` | Wrong Client Secret or redirect URI mismatch. | Re-copy; verify URL. |
| `useragent_not_found` | Invalid guid. | Use `POST /UserAgent/MyAgents`. |
| `Mailchimp credentials not configured` | Returned in `OAuthConnect`'s `errors[]` when `authmethod: "own"` but `clientid` / `clientsecret` are missing. | Update with `POST /UserAgent/CredentialUpsert`. |
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
