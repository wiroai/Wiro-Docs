# Agent Credentials & OAuth

Configure third-party service connections for your agent instances.

## Overview

Wiro agents connect to external services — social platforms, ad networks, email tools, CRMs — through two credential methods:

1. **API Key credentials** — set directly via `POST /UserAgent/Update`.
2. **OAuth credentials** — redirect-based authorization via `POST /UserAgentOAuth/{Provider}Connect`, where Wiro handles token exchange server-side.

Each external service Wiro talks to is documented as its own **integration page** with the full setup walkthrough, API reference, troubleshooting, and multi-tenant architecture notes. Use the catalog below to jump to the one you need.

## Integration Catalog

### OAuth Integrations

| Integration | Auth Modes | Setup Guide |
|-------------|------------|-------------|
| Meta Ads | Own only (Wiro mode coming soon) | [Meta Ads integration](/docs/integration-metaads) |
| Facebook Page | Own only (Wiro mode coming soon) | [Facebook Page integration](/docs/integration-facebook) |
| Instagram | Own only (Wiro mode coming soon) | [Instagram integration](/docs/integration-instagram) |
| LinkedIn | Own only (Wiro mode coming soon) | [LinkedIn integration](/docs/integration-linkedin) |
| Twitter / X | Wiro + Own | [Twitter integration](/docs/integration-twitter) |
| TikTok | Wiro + Own | [TikTok integration](/docs/integration-tiktok) |
| Google Ads | Wiro + Own | [Google Ads integration](/docs/integration-googleads) |
| HubSpot | Wiro + Own | [HubSpot integration](/docs/integration-hubspot) |
| Mailchimp | Wiro + Own + API key | [Mailchimp integration](/docs/integration-mailchimp) |
| Google Drive | Wiro + Own | [Google Drive integration](/docs/integration-googledrive) |

> **Meta Platforms availability:** While Wiro's shared Meta App is under review by Meta, the Meta Ads, Facebook Page, and Instagram integrations must be connected using your **own Meta Developer App**. No App Review is required — Development Mode + App Roles is sufficient. See each integration page for step-by-step setup.

### API Key Integrations

| Integration | Setup Guide |
|-------------|-------------|
| Gmail | [Gmail integration](/docs/integration-gmail) |
| Telegram | [Telegram integration](/docs/integration-telegram) |
| Firebase | [Firebase integration](/docs/integration-firebase) |
| WordPress | [WordPress integration](/docs/integration-wordpress) |
| App Store Connect | [App Store integration](/docs/integration-appstore) |
| Google Play | [Google Play integration](/docs/integration-googleplay) |
| Apollo | [Apollo integration](/docs/integration-apollo) |
| Lemlist | [Lemlist integration](/docs/integration-lemlist) |
| Brevo | [Brevo integration](/docs/integration-brevo) |
| SendGrid | [SendGrid integration](/docs/integration-sendgrid) |

## Setting API Key Credentials

Use `POST /UserAgent/Update` with `configuration.credentials.<service>` to set credentials. Each integration page above documents the exact field names for that service.

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

### Merge behavior

`UserAgent/Update` **merges** credential fields. Only fields you send are updated; existing fields (including OAuth tokens Wiro writes server-side) are preserved.

- Only fields marked `_editable: true` are accepted. Non-editable fields are silently ignored. Use `POST /UserAgent/Detail` to inspect `_editable` flags.
- Credential keys that do not already exist in the agent template cannot be added — you can only update keys the agent declares.

## OAuth Authorization Flow

For services that require user authorization, Wiro implements a full OAuth redirect flow. The entire process is **fully white-label** — your end users interact only with your app and the provider's consent screen. They never see or visit wiro.ai.

> The `redirectUrl` you pass to the Connect endpoint is **your own URL**. After authorization, users are redirected back to your app with status query parameters. HTTPS is required; `http://localhost` and `http://127.0.0.1` are allowed for development.

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

### Connect endpoint (common shape)

**POST** `/UserAgentOAuth/{Provider}Connect`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userAgentGuid` | string | Yes | Agent instance GUID. |
| `redirectUrl` | string | Yes | Where to redirect after OAuth completes. |
| `authMethod` | string | No | `"wiro"` (default) or `"own"`. See integration page for availability. |

Response:

```json
{
  "result": true,
  "authorizeUrl": "https://provider.example.com/oauth/authorize?...",
  "errors": []
}
```

### Auth Methods — `"wiro"` vs `"own"`

|  | `"wiro"` | `"own"` |
|--|---------|---------|
| **OAuth app credentials** | Wiro's pre-configured app | Your own app on the provider's developer portal |
| **Setup required** | None — just call Connect | Create an app on the provider, save credentials via Update, register Wiro's callback URL |
| **Consent screen branding** | Shows "Wiro" as the app name | Shows **your app name** |
| **Redirect after auth** | To your `redirectUrl` | To your `redirectUrl` |
| **User sees wiro.ai?** | No | No |
| **Token management** | Automatic by Wiro | Automatic by Wiro |
| **Best for** | Quick setup when available | Custom branding, bypassing long review processes |

For the full own-mode credential field names and provider-specific setup, see the individual integration page.

### Callback URL pattern (own mode)

Register this URL in your OAuth app settings on the provider's developer portal:

```
https://api.wiro.ai/v1/UserAgentOAuth/{Provider}Callback
```

Provider-specific paths: `MetaAdsCallback`, `FBCallback`, `IGCallback`, `LICallback`, `XCallback`, `TikTokCallback`, `GAdsCallback`, `HubSpotCallback`, `MailchimpCallback`, `GoogleDriveCallback`.

### Callback success & error parameters

After OAuth completes, Wiro redirects users to your `redirectUrl` with provider-specific query parameters:

| Provider | Success Params | Error Param |
|----------|---------------|-------------|
| Twitter / X | `x_connected=true&x_username=...` | `x_error=...` |
| TikTok | `tiktok_connected=true&tiktok_username=...` | `tiktok_error=...` |
| Instagram | `ig_connected=true&ig_username=...` | `ig_error=...` |
| Facebook | `fb_connected=true&fb_pagename=...&fb_pages=[...]` | `fb_error=...` |
| LinkedIn | `li_connected=true&li_name=...` | `li_error=...` |
| Google Ads | `gads_connected=true&gads_accounts=[...]` | `gads_error=...` |
| Meta Ads | `metaads_connected=true&metaads_accounts=[...]` | `metaads_error=...` |
| HubSpot | `hubspot_connected=true&hubspot_portal=...&hubspot_name=...` | `hubspot_error=...` |
| Mailchimp | `mailchimp_connected=true&mailchimp_account=...` | `mailchimp_error=...` |

Error values follow the pattern `{provider}_error=<code>`. Common codes across all providers:

| Code | Meaning |
|------|---------|
| `authorization_denied` | User cancelled, or in Meta Development Mode the user is not added under App Roles. |
| `session_expired` | 15-minute state cache expired. |
| `token_exchange_failed` | Wrong App Secret or redirect URI mismatch. |
| `useragent_not_found` | Invalid or unauthorized `userAgentGuid`. |
| `invalid_config` | Agent has no credentials block for the provider. |
| `internal_error` | Unexpected server error. |

See each integration page for provider-specific error details and remediation.

### Generic OAuth Endpoints

These endpoints work the same way across every OAuth provider. Replace `{Provider}` with the integration code (`MetaAds`, `FB`, `IG`, `LI`, `X`, `TikTok`, `GAds`, `HubSpot`, `Mailchimp`).

#### **POST** /UserAgentOAuth/{Provider}Status

Check the current connection state.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userAgentGuid` | string | Yes | Agent instance GUID. |

Response:

```json
{
  "result": true,
  "connected": true,
  "username": "connected-account-name",
  "connectedAt": "2026-04-17T12:00:00.000Z",
  "tokenExpiresAt": "2026-06-16T12:00:00.000Z",
  "refreshTokenExpiresAt": "2026-10-17T12:00:00.000Z",
  "errors": []
}
```

Some providers use integration-specific field names instead of `username` (e.g. `linkedinName`, `customerId`). Refer to the relevant integration page.

#### **POST** /UserAgentOAuth/{Provider}Disconnect

Revoke access and clear stored credentials.

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/{Provider}Disconnect" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "userAgentGuid": "your-useragent-guid" }'
```

Response: `{ "result": true, "errors": [] }`. The agent restarts automatically if it was running.

#### **POST** /UserAgentOAuth/TokenRefresh

Force-refresh the provider's access token. Wiro auto-refreshes before expiry, so manual refresh is rarely needed.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userAgentGuid` | string | Yes | Agent instance GUID. |
| `provider` | string | Yes | One of: `twitter`, `tiktok`, `instagram`, `facebook`, `linkedin`, `googleads`, `metaads`, `hubspot`, `googledrive`. |

```json
{
  "result": true,
  "accessToken": "new-access-token...",
  "refreshToken": "new-refresh-token...",
  "errors": []
}
```

Mailchimp tokens do not expire and are not included.

### Provider-Specific Post-Callback Endpoints

Some integrations require a second step after the callback to finalize the connection. These are documented on their respective integration pages:

| Endpoint | Purpose | Integration |
|----------|---------|-------------|
| `POST /UserAgentOAuth/MetaAdsSetAdAccount` | Pick the ad account to manage. | [Meta Ads](/docs/integration-metaads) |
| `POST /UserAgentOAuth/FBSetPage` | Pick the Facebook Page (multi-page accounts). | [Facebook Page](/docs/integration-facebook) |
| `POST /UserAgentOAuth/GAdsSetCustomerId` | Pick the Google Ads customer ID. | [Google Ads](/docs/integration-googleads) |

## Setup Required State

If an agent has required (non-optional) credentials that have not been filled in, the agent is in **Setup Required** state (status `6`) and cannot be started. After setting all required credentials via Update, the status automatically changes to `0` (Stopped) and you can call `POST /UserAgent/Start`.

Check the `setuprequired` boolean in `UserAgent/Detail` or `UserAgent/MyAgents` responses to determine if credentials still need to be configured.

## Security

- **Tokens are stored server-side** in the agent instance configuration. The `TokenRefresh` endpoint returns new tokens — all other endpoints (Status, Detail, Update) sanitize token fields before responding.
- The `redirectUrl` receives only connection status parameters — no tokens, no secrets.
- API responses from Status, Detail, and Update endpoints are sanitized: `accessToken`, `refreshToken`, `clientSecret`, and `appSecret` fields are stripped before returning.
- OAuth state parameters use a 15-minute TTL cache to prevent replay attacks.
- Redirect URLs must be HTTPS (or localhost / 127.0.0.1 for development).

## For Third-Party Developers

If you are building a product on top of Wiro agents and need your customers to connect their own accounts, the recommended flow is:

1. **Deploy** an agent instance per customer via `POST /UserAgent/Deploy`.
2. **Connect** — your backend calls `POST /UserAgentOAuth/{Provider}Connect` with the customer's `userAgentGuid` and a `redirectUrl` pointing back to your app.
3. **Redirect** — send the customer's browser to the returned `authorizeUrl`.
4. **Authorize** — customer authorizes on the provider's consent screen.
5. **Return** — customer lands back on your `redirectUrl` with success/error query parameters.
6. **Verify** — call `POST /UserAgentOAuth/{Provider}Status` to confirm.

Each integration page includes a dedicated **Multi-Tenant Architecture** section covering per-provider rate limits, token isolation, and White-Label consent screen configuration.

### Handling the OAuth redirect in your app

```javascript
// Express route that receives the OAuth return
app.get('/settings/integrations', (req, res) => {
  if (req.query.x_connected === 'true') {
    return res.redirect(`/dashboard?connected=twitter&username=${req.query.x_username}`)
  }
  if (req.query.metaads_connected === 'true') {
    const accounts = JSON.parse(decodeURIComponent(req.query.metaads_accounts || '[]'))
    // Show account picker or auto-select if only one
    return res.redirect(`/dashboard/meta-ads?accounts=${encodeURIComponent(JSON.stringify(accounts))}`)
  }
  if (req.query.fb_connected === 'true') {
    const pages = JSON.parse(decodeURIComponent(req.query.fb_pages || '[]'))
    return pages.length > 1
      ? res.redirect(`/dashboard/facebook?pick=${encodeURIComponent(JSON.stringify(pages))}`)
      : res.redirect('/dashboard?connected=facebook')
  }
  const err = Object.keys(req.query).find((k) => k.endsWith('_error'))
  if (err) return res.redirect(`/dashboard?error=${err}&reason=${req.query[err]}`)
  res.redirect('/dashboard')
})
```
