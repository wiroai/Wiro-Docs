# Google Ads Integration

Connect your agent to Google Ads for campaign management, keyword research, and ad copy.

## Overview

The Google Ads integration uses Google OAuth 2.0 with the Google Ads API v23 REST endpoints.

**Skills that use this integration:**

- `googleads-manage` — Campaign / ad group / keyword management, insights
- `ads-manager-common` — Shared ads helpers

**Agents that typically enable this integration:**

- Google Ads Manager
- Any custom agent that needs paid-search capabilities

## Availability

| Mode | Status | Notes |
|------|--------|-------|
| `"wiro"` | Available | One-click connect using Wiro's Google Cloud project. |
| `"own"` | Available | Own Google Cloud project, Developer Token, and MCC manager customer. |

## Prerequisites

- **A Wiro API key** — [Authentication](/docs/authentication).
- **A deployed agent** — [Agent Overview](/docs/agent-overview).
- **A Google Ads account (or MCC)** the connecting user administers.
- **(Own mode) A Google Cloud project** with the Google Ads API enabled.
- **(Own mode) A Google Ads Developer Token** — request from your MCC.
- **(Own mode) Your Manager (MCC) Customer ID** (10 digits, no dashes) for server-to-server calls.
- **An HTTPS callback URL**.

## Wiro Mode

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/GAdsConnect" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "redirecturl": "https://your-app.com/settings/integrations"
  }'
```

User returns with `?gads_connected=true&gads_accounts=[{...}]`. Present to user if multiple. Call `GAdsSetCustomerId`. Skip to [Step 8: Verify](#step-8-verify-and-start).

## Complete Integration Walkthrough — Own Mode

### Step 1: Create a Google Cloud Project

1. [console.cloud.google.com](https://console.cloud.google.com/) → create a project.
2. **APIs & Services → Library** → enable **Google Ads API**.
3. **OAuth consent screen**:
   - **External** user type for multi-tenant.
   - App name, support email, dev contact.
   - Add scope: `https://www.googleapis.com/auth/adwords`.
   - While in Testing status: add test users (the Google accounts that will connect).

> **Using this OAuth client for other Google services?** The same Wiro OAuth client powers Google Ads, YouTube, Google Analytics 4, and Merchant Center — they all share the `https://www.googleapis.com/auth/content` / `adwords` / `youtube` / `analytics.readonly` scope family through Wiro's Cloud project. If you're setting up "own" mode and want any of those integrations, enable the matching Google Cloud APIs in the same project:
>
> - **Google Ads API** — for Google Ads
> - **YouTube Data API v3** + **YouTube Analytics API v2** — for YouTube (used by the `youtube-manage` skill, also consumed by `googleads-manage` for Video / Demand Gen campaigns)
> - **Google Analytics Data API** + **Google Analytics Admin API** — for Google Analytics 4
> - **Merchant API** — for Merchant Center
>
> You don't need a separate OAuth client per API — one client + all four APIs enabled + the corresponding scopes works.

> **Merchant Center — "own" mode only extra step:** "wiro" mode is fully transparent, you don't need to do anything on your own merchant account. If you're using "own" mode with your own Google Cloud project, you must register that GCP project once against your own primary Merchant Center account before the API will answer for any merchant account you authorize:
>
> ```bash
> curl -X POST \
>   "https://merchantapi.googleapis.com/accounts/v1/accounts/{YOUR_MC_ID}/developerRegistration:registerGcp" \
>   -H "Authorization: Bearer {ACCESS_TOKEN}" \
>   -H "Content-Type: application/json" \
>   -d '{}'
> ```
>
> This call is made once per GCP project. After it returns a `DeveloperRegistration` resource, the same GCP can call the Merchant API against any merchant account whose admin grants OAuth consent — no per-account registration needed (see Google's [3P/agency guidance](https://developers.google.com/merchant/api/guides/quickstart/faq#i_work_with_multiple_merchant_center_accounts_do_i_need_to_register_every_merchant_center_account_i_want_to_use_with_the_merchant_api)). Each GCP can be registered with at most one primary Merchant Center at a time; registering against a second account returns `ALREADY_REGISTERED`.

### Step 2: Create OAuth 2.0 Client ID

1. **APIs & Services → Credentials → Create credentials → OAuth client ID**.
2. Application type: **Web application**.
3. **Authorized redirect URIs**:

   ```
   https://api.wiro.ai/v1/UserAgentOAuth/GAdsCallback
   ```

4. Save; copy **Client ID** and **Client Secret**.

### Step 3: Get a Developer Token

1. Sign in to your [Google Ads MCC](https://ads.google.com/).
2. **Tools → API Center** → request a token.
3. Start with a **test token**; apply for **basic access** for production.

### Step 4: Save credentials to Wiro

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/CredentialUpsert" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "fields": [
      { "credentialkey": "google-ads", "fieldname": "clientid", "fieldvalue": "YOUR_GOOGLE_OAUTH_CLIENT_ID" },
      { "credentialkey": "google-ads", "fieldname": "clientsecret", "fieldvalue": "YOUR_GOOGLE_OAUTH_CLIENT_SECRET" },
      { "credentialkey": "google-ads", "fieldname": "developertoken", "fieldvalue": "YOUR_GOOGLE_ADS_DEVELOPER_TOKEN" },
      { "credentialkey": "google-ads", "fieldname": "managercustomerid", "fieldvalue": "1234567890" },
      { "credentialkey": "google-ads", "fieldname": "authmethod", "fieldvalue": "own" }
    ]
  }'
```

`managercustomerid` is your MCC's 10-digit customer ID without dashes.

### Step 5: Initiate OAuth

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/GAdsConnect" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "redirecturl": "https://your-app.com/settings/integrations",
    "authmethod": "own"
  }'
```

Response:

```json
{
  "result": true,
  "authorizeUrl": "https://accounts.google.com/o/oauth2/v2/auth?client_id=...&redirect_uri=...&response_type=code&scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fadwords&state=...&access_type=offline&prompt=consent",
  "errors": []
}
```

Scope is a single string: `https://www.googleapis.com/auth/adwords`. `access_type=offline&prompt=consent` ensures a refresh token is issued.

### Step 6: Handle the callback

After the token exchange, Wiro queries `customers:listAccessibleCustomers` and fetches `customer.descriptive_name` for each accessible customer via the Google Ads API.

**Success URL:**

```
https://your-app.com/settings/integrations?gads_connected=true&gads_accounts=%5B%7B%22id%22%3A%221234567890%22%2C%22name%22%3A%22My%20Client%22%7D%5D
```

- `gads_accounts` is only populated when a developer token is available. If the callback finishes without accessible customers, `gads_accounts` is omitted entirely (not an empty array).
- Each entry: `{ id, name, status }` — `status` comes from the Google Ads API customer status (e.g. `"ENABLED"`, `"CANCELLED"`) and may be an empty string if the per-customer lookup failed.

```javascript
const params = new URLSearchParams(window.location.search);
if (params.get("gads_connected") === "true") {
  const accounts = JSON.parse(decodeURIComponent(params.get("gads_accounts") || "[]"));
  if (accounts.length === 1) {
    await setCustomerId(accounts[0]);
  } else if (accounts.length > 1) {
    presentCustomerPicker(accounts);
  }
}
```

### Step 7: Persist the customer ID selection

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/GAdsSetCustomerId" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "customerid": "1234567890",
    "customerdescriptivename": "Acme Corp — Production"
  }'
```

- `customerid`: either 10-digit or `123-456-7890` format works — non-digits are stripped automatically.
- `customerdescriptivename` (optional): human-readable account label. Shown in the dashboard next to the customer ID so users can tell accounts apart when they manage many MCC sub-accounts. Typically the `customer.descriptive_name` you received in the `gads_accounts` array from the OAuth callback.

Response:

```json
{
  "result": true,
  "customerid": "1234567890",
  "customerdescriptivename": "Acme Corp — Production",
  "errors": []
}
```

Triggers agent restart if running.

### Step 8: Verify and Start

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/GAdsStatus" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "useragentguid": "your-useragent-guid" }'
```

Response (note the non-standard field name — **`customerid`** instead of `username`):

```json
{
  "result": true,
  "connected": true,
  "customerid": "1234567890",
  "connectedat": "2026-04-17T12:00:00.000Z",
  "tokenexpiresat": "2026-04-17T13:00:00.000Z",
  "errors": []
}
```

- Access token lifetime: **1 hour** (short). The agent runs a background refresh cron every 45 minutes.
- No `refreshtokenexpiresat` — Google's refresh tokens don't expire in typical use (unless revoked).

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Start" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "guid": "your-useragent-guid" }'
```

## API Reference

### POST /UserAgentOAuth/GAdsConnect

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Agent instance GUID. |
| `redirecturl` | string | Yes | HTTPS URL. |
| `authmethod` | string | No | `"wiro"` (default) or `"own"`. |

### GET /UserAgentOAuth/GAdsCallback

Query params: `gads_connected=true&gads_accounts=<JSON>` (when developer token available) or `gads_error=<code>`.

### POST /UserAgentOAuth/GAdsSetCustomerId

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Agent instance GUID. |
| `customerid` | string | Yes | 10-digit customer ID. Non-digits stripped. |
| `customerdescriptivename` | string | No | Human-readable account label shown in the dashboard next to the customer ID. Typically the `customer.descriptive_name` from the OAuth callback's `gads_accounts` array. |

Response: `{ result, customerid, customerdescriptivename, errors }`.

### POST /UserAgentOAuth/GAdsStatus

Response fields: `connected`, **`customerid`** (not `username`), `customerdescriptivename`, `connectedat`, `tokenexpiresat` (~1h).

### POST /UserAgentOAuth/GAdsDisconnect

Clears Google Ads credentials (no remote revoke).

### POST /UserAgentOAuth/TokenRefresh

> Running agents refresh the Google Ads token automatically **every 45 minutes** (access tokens last 1 hour). Use this only for debugging.

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/TokenRefresh" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "provider": "googleads"
  }'
```

See [Automatic token refresh](/docs/agent-credentials#automatic-token-refresh).

## Using the Skill

Once Google Ads is connected and `customerid` is persisted, the agent's scheduled tasks use the `googleads-manage` platform skill to pull metrics and manage campaigns. Adjust the cron of the built-in `cron-performance-reporter` task (Google Ads Manager) with `enabled` and `interval` only — the task body (`value`) is owned by the bundled integration skill and silently dropped on writes:

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/CustomSkillUpsert" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "skillkey": "cron-performance-reporter",
    "enabled": true,
    "interval": "0 9 * * *"
  }'
```

To change **what** the reporter includes (wasted-spend threshold, target ROAS, reporting preferences), edit the paired preference skill `ad-strategy` instead — see [Agent Skills → Updating Preferences](/docs/agent-skills#updating-preference-skills).

## Troubleshooting

| Error code | Meaning | What to do |
|------------|---------|------------|
| `missing_params` | Callback hit without `state` or `code`. | Start a new flow from Step 5. |
| `authorization_denied` | User cancelled, or consent screen in Testing and the user isn't a test user. | Add test user or publish consent screen. |
| `session_expired` | State cache expired. | Restart. |
| `token_exchange_failed` | Wrong Client Secret or redirect URI mismatch. | Re-copy; verify URL. |
| `template_not_found` (wiro mode) | Wiro's template doesn't have `googleads` credentials. | Contact support or switch to own mode. |
| `useragent_not_found` | Invalid guid. | Use `POST /UserAgent/MyAgents`. |
| `invalid_config` | No `credentials.googleads` block. | `UserAgent/CredentialUpsert` with all four fields. |
| `internal_error` | Server error. | Retry; contact support. |

### `USER_PERMISSION_DENIED` on API calls

The OAuth-authorized user lacks access to the `customerid` you chose. Pick a different customer from `gads_accounts` or have the user request access.

### Developer Token rejected

Test tokens can only query accounts in your own MCC hierarchy. For customer accounts outside your MCC, you need Basic Access — apply in **Tools → API Center**.

## Multi-Tenant Architecture

1. **One Google Cloud project** per product. Publish the OAuth consent screen.
2. **Apply for Basic or Standard Developer Token access** based on expected volume.
3. **One Wiro agent instance per customer**; `customerid` is per-instance.
4. **Tokens auto-refresh** via the stored refresh token.

## Related

- [Agent Credentials & OAuth](/docs/agent-credentials)
- [Agent Overview](/docs/agent-overview)
- [Agent Skills](/docs/agent-skills)
- [Meta Ads integration](/docs/integration-metaads-skills)
- [Google Ads API docs](https://developers.google.com/google-ads/api/docs/start)
