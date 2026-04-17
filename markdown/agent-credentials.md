# Agent Credentials & OAuth

Configure third-party service connections for your agent instances.

## Overview

Wiro agents connect to external services — social platforms, ad networks, email tools, CRMs — through two credential methods:

1. **API Key credentials** — set directly via `POST /UserAgent/Update`.
2. **OAuth credentials** — redirect-based authorization via `POST /UserAgentOAuth/{Provider}Connect`, where Wiro handles token exchange server-side.

Each external service is documented as its own **integration page** with the complete setup walkthrough, API reference, troubleshooting, and multi-tenant architecture notes. Use the catalog below to jump to the one you need.

## Integration Catalog

### OAuth Integrations

| Integration | Auth Modes | Setup Guide |
|-------------|------------|-------------|
| Meta Ads | Own only (Wiro mode coming soon) | [Meta Ads Skills](/docs/integration-metaads-skills) |
| Facebook Page | Own only (Wiro mode coming soon) | [Facebook Page Skills](/docs/integration-facebook-skills) |
| Instagram | Own only (Wiro mode coming soon) | [Instagram Skills](/docs/integration-instagram-skills) |
| LinkedIn | Own only (Wiro mode coming soon) | [LinkedIn Skills](/docs/integration-linkedin-skills) |
| Twitter / X | Wiro + Own | [Twitter Skills](/docs/integration-twitter-skills) |
| TikTok | Wiro + Own | [TikTok Skills](/docs/integration-tiktok-skills) |
| Google Ads | Wiro + Own | [Google Ads Skills](/docs/integration-googleads-skills) |
| HubSpot | Wiro + Own | [HubSpot Skills](/docs/integration-hubspot-skills) |
| Mailchimp | Wiro + Own + API Key | [Mailchimp Skills](/docs/integration-mailchimp-skills) |
| Google Drive | Wiro + Own | [Google Drive Skills](/docs/integration-googledrive-skills) |

> **Meta Platforms availability:** While Wiro's shared Meta App is under review by Meta, the Meta Ads, Facebook Page, and Instagram integrations must be connected using your own Meta Developer App in Development Mode. No App Review is required — users who are listed in your app's Roles (Testers/Developers) can connect without review. See each integration page for step-by-step setup.

### API Key Integrations

| Integration | Setup Guide |
|-------------|-------------|
| Gmail | [Gmail Skills](/docs/integration-gmail-skills) |
| Telegram | [Telegram Skills](/docs/integration-telegram-skills) |
| Firebase | [Firebase Skills](/docs/integration-firebase-skills) |
| WordPress | [WordPress Skills](/docs/integration-wordpress-skills) |
| App Store Connect | [App Store Skills](/docs/integration-appstore-skills) |
| Google Play | [Google Play Skills](/docs/integration-googleplay-skills) |
| Apollo | [Apollo Skills](/docs/integration-apollo-skills) |
| Lemlist | [Lemlist Skills](/docs/integration-lemlist-skills) |
| Brevo | [Brevo Skills](/docs/integration-brevo-skills) |
| SendGrid | [SendGrid Skills](/docs/integration-sendgrid-skills) |

## Platform-Managed Credentials

Some credentials are **managed by Wiro on your behalf** — you don't provide them, you can't see them in API responses, and attempts to set them via `POST /UserAgent/Update` are silently ignored:

- **OpenAI** — Wiro uses its own OpenAI account to power the LLM brain of every agent. You never need to supply an OpenAI key.
- **Wiro platform** (`credentials.wiro.apiKey`) — pre-configured for agents that have the `wiro-generator` skill enabled. This skill lets the agent call Wiro's own AI models (image/video/audio/LLM) internally — see [Using Wiro AI Models from Your Agent](/docs/agent-skills#using-wiro-ai-models-from-your-agent).
- **Calendarific** — pre-configured for agents that use the Calendarific skill (holiday/special-date lookups).

These are `_editable: false` in the agent template. When you read `POST /UserAgent/Detail`, they don't appear in the `configuration.credentials` response — they're filtered out server-side. If your agent needs them, they're already wired up.

> **Don't confuse platform-managed `credentials.wiro.apiKey` with your regular Wiro API key.** The key in `credentials.wiro.apiKey` is internal to the agent container; the `x-api-key` header you send to Wiro endpoints from your own backend is entirely separate (see [Authentication](/docs/authentication)).

## Setting API Key Credentials

Use `POST /UserAgent/Update` with `configuration.credentials.<service>`. Each integration page above documents the exact field names and shape.

### Per-group update pattern

Wiro's backend merges credential updates **per group**. Only the fields you send are written, and other credential groups are untouched. The Wiro Dashboard follows this pattern exactly — each credential card is saved independently.

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Update" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "guid": "your-useragent-guid",
    "configuration": {
      "credentials": {
        "gmail": {
          "account": "agent@company.com",
          "appPassword": "xxxx xxxx xxxx xxxx"
        }
      }
    }
  }'
```

### Merge rules (verified against agent-helper.js)

- Only fields marked `_editable: true` in the agent template are accepted. Non-editable fields are silently ignored.
- Credential groups that don't exist in the template cannot be added — you can only update keys the agent declares.
- Array credentials (`firebase.accounts`, `appstore.apps`, etc.) use positional indexing. Sending more indices than the template has creates new entries cloned from the template shape, constrained to template-editable fields. **Sending fewer indices truncates the array** — if the agent has 3 Firebase accounts and you send only 2, the third is removed.
- Use `POST /UserAgent/Detail` to inspect the `_editable` map for each credential group.

### Prepaid deploy gotcha

If you called `POST /UserAgent/Deploy` with `useprepaid: true`, the `credentials` you passed in the Deploy body were **not** saved — prepaid deploy writes only a template placeholder. You must call `POST /UserAgent/Update` separately to set credentials before initiating OAuth or starting the agent.

## OAuth Authorization Flow

For services that require user authorization, Wiro implements a full OAuth redirect flow. The entire process is **fully white-label** — your end users interact only with your app and the provider's consent screen. They never see or visit wiro.ai.

> The `redirectUrl` you pass to Connect is **your own URL**. After authorization, users are redirected back to your app with status query parameters. HTTPS is required; `http://localhost` and `http://127.0.0.1` are allowed for development only.

### Generic flow

```
Your App (Frontend)           Your Backend              Wiro API              Provider
       |                            |                       |                      |
  (1)  | "Connect X" click          |                       |                      |
       |--------------------------->|                       |                      |
  (2)  |                            |  POST /{P}Connect --> |                      |
       |                            |  { userAgentGuid,     |                      |
       |                            |    redirectUrl,       |                      |
       |                            |    authMethod }       |                      |
  (3)  |                            |<-- { authorizeUrl }   |                      |
  (4)  |<--- redirect to authorizeUrl -------------------------------------------->|
  (5)  |                            |                       |<-- User clicks Allow |
  (6)  |                            |  (invisible callback) |                      |
       |                            |  Wiro exchanges code  |<---------------------|
       |                            |  for tokens, saves    |                      |
  (7)  |<------- 302 to YOUR redirectUrl --------------------------------------->  |
       |        ?{provider}_connected=true&...                                     |
```

### Auth Methods — `"wiro"` vs `"own"`

|  | `"wiro"` | `"own"` |
|--|---------|---------|
| **OAuth app credentials** | Wiro's pre-configured app | Your own app on the provider's developer portal |
| **Setup required** | None — just call Connect | Create app on provider, save credentials via Update, register Wiro's callback URL |
| **Consent screen branding** | Shows "Wiro" as the app name | Shows **your app name** |
| **Redirect after auth** | To your `redirectUrl` | To your `redirectUrl` |
| **User sees wiro.ai?** | No | No |
| **Token management** | Automatic by Wiro | Automatic by Wiro |
| **Best for** | Quick setup when available | Custom branding or bypassing review processes |

### Own Mode = 2-Step API Flow

Own mode requires two sequential calls before initiating OAuth:

```bash
# Step 1: Save your provider app credentials + authMethod
curl -X POST "https://api.wiro.ai/v1/UserAgent/Update" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "guid": "your-useragent-guid",
    "configuration": {
      "credentials": {
        "twitter": {
          "clientId": "YOUR_CLIENT_ID",
          "clientSecret": "YOUR_CLIENT_SECRET",
          "authMethod": "own"
        }
      }
    }
  }'

# Step 2: Initiate OAuth
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/XConnect" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "userAgentGuid": "your-useragent-guid",
    "redirectUrl": "https://your-app.com/callback",
    "authMethod": "own"
  }'
```

For Wiro mode: skip Step 1, just call Step 2 with `authMethod: "wiro"` (or omit — it defaults to `"wiro"`).

### Callback URL pattern (own mode)

Register this URL in your OAuth app settings on the provider's developer portal:

```
https://api.wiro.ai/v1/UserAgentOAuth/{Provider}Callback
```

Provider-specific paths: `MetaAdsCallback`, `FBCallback`, `IGCallback`, `LICallback`, `XCallback`, `TikTokCallback`, `GAdsCallback`, `HubSpotCallback`, `MailchimpCallback`, `GoogleDriveCallback`.

### Callback success & error parameters

| Provider | Success Params | Error Param |
|----------|---------------|-------------|
| Twitter / X | `x_connected=true&x_username=...` | `x_error=...` |
| TikTok | `tiktok_connected=true&tiktok_username=...` | `tiktok_error=...` |
| Instagram | `ig_connected=true&ig_username=...` | `ig_error=...` |
| Facebook | `fb_connected=true&fb_pages=[...]` | `fb_error=...` |
| LinkedIn | `li_connected=true&li_name=...` | `li_error=...` |
| Google Ads | `gads_connected=true&gads_accounts=[...]` | `gads_error=...` |
| Meta Ads | `metaads_connected=true&metaads_accounts=[...]` | `metaads_error=...` |
| HubSpot | `hubspot_connected=true&hubspot_portal=...&hubspot_name=...` | `hubspot_error=...` |
| Mailchimp | `mailchimp_connected=true&mailchimp_account=...` | `mailchimp_error=...` |
| Google Drive | `gdrive_connected=true&gdrive_folders=[...]` | `gdrive_error=...` |

> **Conditional params:** `gads_accounts` and `gdrive_folders` are omitted from the redirect when the provider returns zero items (for example, no accessible Google Ads customers, or a developer token is missing in Wiro mode). `fb_pages` is always present on success — Facebook returns `fb_error=no_pages` instead when the user has no administered Pages.

Common error codes across providers:

| Code | Meaning |
|------|---------|
| `missing_params` | Callback hit without `state` or `code`. |
| `authorization_denied` | User cancelled, or (Meta Dev Mode) not in App Roles. |
| `session_expired` | 15-minute OAuth state cache expired. |
| `token_exchange_failed` | Wrong Client/App Secret or redirect URI mismatch. |
| `useragent_not_found` | Invalid or unauthorized `userAgentGuid`. |
| `invalid_config` | Agent has no credentials block for the provider. |
| `internal_error` | Unexpected server error. |

Provider-specific codes:

| Code | Provider | Meaning |
|------|----------|---------|
| `no_pages` | Facebook | OAuth succeeded but the user administers no Pages. |
| `template_not_found` | Google Ads (Wiro mode) | Wiro's shared template doesn't have `googleads` credentials; switch to own mode. |

> The `useragent_not_found` error value (snake_case) appears in redirect URLs. The same condition surfaces as `"User agent not found or unauthorized"` in JSON responses from Connect/Disconnect endpoints.

## Generic OAuth Endpoints

All integrations share these three endpoints. Replace `{Provider}` with the integration code (`MetaAds`, `FB`, `IG`, `LI`, `X`, `TikTok`, `GAds`, `HubSpot`, `Mailchimp`, `GoogleDrive`).

### POST /UserAgentOAuth/{Provider}Status

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userAgentGuid` | string | Yes | Agent instance GUID. |

Response shape varies per provider (e.g. `username` vs `linkedinName` vs `customerId`). See each integration page. Common fields: `connected`, `connectedAt`, `tokenExpiresAt`.

### POST /UserAgentOAuth/{Provider}Disconnect

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/{Provider}Disconnect" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "userAgentGuid": "your-useragent-guid" }'
```

Response: `{ "result": true, "errors": [] }`. The agent restarts automatically if it was running. Twitter/X and TikTok additionally call the provider's revoke endpoint; other providers only clear the stored credentials (the token remains valid on the provider side until it expires).

### POST /UserAgentOAuth/TokenRefresh

> **API users don't normally call this endpoint.** Wiro's agent runtime refreshes tokens automatically via this endpoint itself — see [Automatic token refresh](#automatic-token-refresh) below. TokenRefresh is exposed publicly mainly for debugging and manual overrides.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userAgentGuid` | string | Yes | Agent instance GUID. |
| `provider` | string | Yes | One of: `twitter`, `tiktok`, `instagram`, `facebook`, `linkedin`, `googleads`, `metaads`, `hubspot`, `googledrive`. |

**Mailchimp is not supported** — its tokens don't expire. Calling TokenRefresh with `provider: "mailchimp"` returns `Invalid provider`.

Response: `{ result: true, accessToken, refreshToken, errors }`.

### Automatic token refresh

Every running agent container runs background cron jobs that call `POST /UserAgentOAuth/TokenRefresh` against this API on a schedule tuned to each provider's token lifetime. There is **nothing to set up** — as long as the agent is running, tokens are kept fresh.

Refresh cadence inside the agent container:

| Provider | Cron interval | Token lifetime |
|----------|---------------|----------------|
| HubSpot | every 20 min | 30 min |
| Google Ads | every 45 min | 1 hour |
| Google Drive | every 45 min | 1 hour |
| Twitter / X | every 90 min | 2 hours |
| Instagram, Facebook, Meta Ads, LinkedIn, TikTok | once per day | 1–60 days |
| Mailchimp | never (tokens don't expire) | — |

An initial refresh also runs on every container startup, so tokens are always current by the time the first skill call goes out.

**You should manually call TokenRefresh only if:**

- You're debugging a stuck integration and want to force a new token immediately.
- The agent has been stopped for longer than the token lifetime and you want to pre-warm tokens before Start.
- You want to verify the refresh logic end-to-end for a provider.

Hardcoded token TTLs that Wiro stores after each refresh:

| Provider | Access Token `tokenExpiresAt` | Refresh Token |
|----------|--------------------------------|----------------|
| Twitter / X | 2 hours | ~180 days |
| TikTok | 1 day | ~1 year |
| Instagram | 60 days | N/A (refreshes with current access token via `ig_refresh_token`) |
| Facebook | 60 days | N/A (refreshes via `fb_exchange_token`) |
| LinkedIn | 60 days | From provider response (~1 year typical) |
| Google Ads | 1 hour | Long-lived (no expiry in typical use) |
| Meta Ads | 60 days | N/A |
| HubSpot | 30 minutes | Long-lived |
| Google Drive | 1 hour | Long-lived |
| Mailchimp | No expiry | N/A |

## Provider-Specific Post-Callback Endpoints

Some integrations require a secondary step after the OAuth callback to finalize the connection. These are documented in full on each integration page.

### Meta Ads — Set Ad Account

After `MetaAdsCallback`, the user must choose an ad account:

**POST** `/UserAgentOAuth/MetaAdsSetAdAccount`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userAgentGuid` | string | Yes | Agent instance GUID. |
| `adAccountId` | string | Yes | Ad account ID without `act_` prefix (prefix stripped automatically). |
| `adAccountName` | string | No | Display name shown in dashboards. |

See [Meta Ads Skills](/docs/integration-metaads-skills).

### Facebook Page — Set Page

After `FBCallback`, the connection is incomplete until the user chooses a Page:

**POST** `/UserAgentOAuth/FBSetPage`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userAgentGuid` | string | Yes | Agent instance GUID. |
| `pageId` | string | Yes | A page ID from the `fb_pages` callback array. |
| `pageName` | string | No | Display name override. |

Must be called within 15 minutes of the callback (pending cache TTL). See [Facebook Page Skills](/docs/integration-facebook-skills).

### Google Ads — Set Customer ID

After `GAdsCallback`, pick an accessible customer:

**POST** `/UserAgentOAuth/GAdsSetCustomerId`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userAgentGuid` | string | Yes | Agent instance GUID. |
| `customerId` | string | Yes | 10-digit customer ID (dashes stripped). |

See [Google Ads Skills](/docs/integration-googleads-skills).

### Google Drive — List / Set Folders

After `GoogleDriveCallback`, list subfolders and set selections:

**POST** `/UserAgentOAuth/GoogleDriveListFolder` — browse folder contents by `parentId`.

**POST** `/UserAgentOAuth/GoogleDriveSetFolder` — persist up to 5 selected folders (singular endpoint name, array payload).

See [Google Drive Skills](/docs/integration-googledrive-skills).

## Web UI Behaviors (Wiro Dashboard)

If you're comparing against the Wiro Dashboard, here's what happens under the hood for parity with the API:

- **Per-group save**: Each credential card has its own Save button. Saving a card calls `POST /UserAgent/Update` with only that group's fields.
- **Own mode 2-step**: When a user clicks "Connect" in own mode, the Dashboard first calls Update to save `appId`/`appSecret` + `authMethod: "own"`, then calls the Connect endpoint with `authMethod: "own"`. API users must make both calls explicitly.
- **Full-page redirect, not popup**: `window.location.href = authorizeUrl` — no popup windows (avoids third-party cookie issues).
- **No manual token refresh button**: Refresh is fully automatic. `TokenRefresh` exists for debugging only.
- **LLM Markdown feature**: The Dashboard includes an "LLM Markdown" tab that generates a ready-to-paste prompt for AI assistants summarizing every credential field the agent needs. Useful for API users building their own configuration UIs — see the per-integration help texts for equivalent guidance.
- **No format validation**: Wiro doesn't validate email/URL formats server-side. Malformed values fail at runtime inside the skill when it tries to use them.
- **Credential groups that are all-readonly are hidden**: If every field in a group has `_editable: false`, the entire group is omitted from `POST /UserAgent/Detail` responses. This is how platform-managed credentials (OpenAI, Wiro, Calendarific) stay invisible.

## Setup Required State

If an agent has required credentials not yet filled in, it's in **Setup Required** state (`status: 6`). It can't be started until credentials are complete.

- Fresh normal deploy → status `2` (Queued) immediately.
- Fresh prepaid deploy → status `6` (Setup Required) — fill credentials, then call Start.
- `setuprequired` flag in `UserAgent/Detail` / `UserAgent/MyAgents` combines `status === 6` with whether all required credential fields are populated.

## Security

- **Tokens are stored server-side** in the agent instance configuration. `TokenRefresh` returns new tokens; Status, Detail, and Update endpoints strip `accessToken`, `refreshToken`, `clientSecret`, and `appSecret` before responding.
- The `redirectUrl` receives only connection status parameters — no tokens, no secrets.
- OAuth state parameters use a 15-minute TTL cache to prevent replay attacks.
- Redirect URLs must be HTTPS (or localhost/127.0.0.1 for development).
- Facebook Page tokens are cached server-side for 15 minutes after the OAuth callback; clients only see `{id, name}` pairs. Page access tokens never leave the server.

## For Third-Party Developers

If you're building a product on top of Wiro agents and need your customers to connect their own accounts:

1. **Deploy** an agent instance per customer via `POST /UserAgent/Deploy`.
2. **Connect** — your backend calls `POST /UserAgentOAuth/{Provider}Connect` with the customer's `userAgentGuid` and a `redirectUrl` pointing back to your app.
3. **Redirect** — send the customer's browser to the returned `authorizeUrl`.
4. **Authorize** — customer authorizes on the provider's consent screen.
5. **Return** — customer lands on your `redirectUrl` with success/error query parameters.
6. **Finalize** — for Meta Ads, Facebook, Google Ads, Google Drive: call the appropriate SetAdAccount/SetPage/SetCustomerId/SetFolder endpoint.
7. **Verify** — call `POST /UserAgentOAuth/{Provider}Status`.

Each integration page includes a **Multi-Tenant Architecture** section covering per-provider rate limits, token isolation, and white-label consent screen configuration.

### Handling the OAuth redirect in your app

```javascript
app.get('/settings/integrations', (req, res) => {
  if (req.query.x_connected === 'true') {
    return res.redirect(`/dashboard?connected=twitter&username=${req.query.x_username}`)
  }

  if (req.query.metaads_connected === 'true') {
    const accounts = JSON.parse(decodeURIComponent(req.query.metaads_accounts || '[]'))
    return res.redirect(`/dashboard/meta-ads?accounts=${encodeURIComponent(JSON.stringify(accounts))}`)
  }

  if (req.query.fb_connected === 'true') {
    const pages = JSON.parse(decodeURIComponent(req.query.fb_pages || '[]'))
    // Facebook always requires FBSetPage to finalize
    return res.redirect(`/dashboard/facebook?pick=${encodeURIComponent(JSON.stringify(pages))}`)
  }

  if (req.query.gads_connected === 'true') {
    const customers = JSON.parse(decodeURIComponent(req.query.gads_accounts || '[]'))
    return res.redirect(`/dashboard/google-ads?pick=${encodeURIComponent(JSON.stringify(customers))}`)
  }

  if (req.query.gdrive_connected === 'true') {
    const folders = JSON.parse(decodeURIComponent(req.query.gdrive_folders || '[]'))
    return res.redirect(`/dashboard/drive?pick=${encodeURIComponent(JSON.stringify(folders))}`)
  }

  const errKey = Object.keys(req.query).find((k) => k.endsWith('_error'))
  if (errKey) {
    return res.redirect(`/dashboard?error=${errKey}&reason=${req.query[errKey]}`)
  }

  res.redirect('/dashboard')
})
```
