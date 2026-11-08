# Google Ads Integration

Connect your agent to Google Ads for campaign management, keyword research, and ad copy.

## Overview

The Google Ads integration uses Google OAuth 2.0 with the Google Ads API v23 REST endpoints.

**Skills that use this integration:**

- `int-googleads-manage`: Campaign / ad group / keyword management, insights
- `util-ads-manager-common`: Shared ads helpers

**Agents that typically enable this integration:**

- Google Ads Manager
- Any custom agent that needs paid-search capabilities

## Availability

| Mode | Status | Notes |
|------|--------|-------|
| `"own"` | Available | Your own Google Cloud project, OAuth client and Developer Token. |
| `"wiro"` | Coming soon | Wiro's shared Google Cloud project is awaiting Google's review. Until then, `OAuthConnect` in Wiro mode, which is also what you get when you leave out `authmethod`, returns `Wiro-managed OAuth is not enabled for Google Ads`. |

## Prerequisites

- **A Wiro API key** (see [Authentication](/docs/authentication)).
- **A deployed agent** (see [Agent Overview](/docs/agent-overview)).
- **A Google Ads account (or MCC)** the connecting user administers.
- **A Google Cloud project** with the Google Ads API enabled.
- **A Google Ads Developer Token**, requested from your MCC.
- **A return URL**: any HTTPS page you control (or `http://localhost` / `http://127.0.0.1` for development) to pass as `redirecturl`.

## Complete Integration Walkthrough: Own Mode

### Step 1: Create a Google Cloud Project

1. [console.cloud.google.com](https://console.cloud.google.com/) → create a project.
2. **APIs & Services → Library** → enable **Google Ads API**.
3. **OAuth consent screen**:
   - **External** user type for multi-tenant.
   - App name, support email, dev contact.
   - Add scope: `https://www.googleapis.com/auth/adwords`.
   - Publish the app (**In production**) before your customers connect. While it is in **Testing**, only the test users you add can connect, and Google expires their refresh tokens after 7 days, so the agent loses access every week.

> **Using this OAuth client for other Google services?** The same OAuth client can also serve YouTube, Google Analytics 4 and Merchant Center. Enable the matching APIs in the same project and add their scopes to the consent screen:
>
> - **Google Ads API**: for Google Ads
> - **YouTube Data API v3** + **YouTube Analytics API v2**: for YouTube (used by the `int-youtube-manage` skill, also consumed by `int-googleads-manage` for Video / Demand Gen campaigns)
> - **Google Analytics Data API** + **Google Analytics Admin API**: for Google Analytics 4
> - **Merchant API**: for Merchant Center
>
> Each integration still connects on its own, with its own `OAuthConnect`, consent and picker. Add the callback of every integration you use as an Authorized redirect URI on the client, or Google stops with `redirect_uri_mismatch`: `https://api.wiro.ai/v1/UserAgentOAuth/GAdsCallback`, `https://api.wiro.ai/v1/UserAgentOAuth/YTCallback`, `https://api.wiro.ai/v1/UserAgentOAuth/GA4Callback`, `https://api.wiro.ai/v1/UserAgentOAuth/MCCallback`. Then save the Client ID and Client Secret under each credential key you use (`google-ads`, `youtube`, `ga4`, `google-merchant-center`).

> **Merchant Center needs one extra step:** you must register your Google Cloud project once against your own primary Merchant Center account before the API will answer for any merchant account you authorize:
>
> ```bash
> curl -X POST \
>   "https://merchantapi.googleapis.com/accounts/v1/accounts/{YOUR_MC_ID}/developerRegistration:registerGcp" \
>   -H "Authorization: Bearer {ACCESS_TOKEN}" \
>   -H "Content-Type: application/json" \
>   -d '{}'
> ```
>
> This call is made once per GCP project. After it returns a `DeveloperRegistration` resource, the same GCP can call the Merchant API against any merchant account whose admin grants OAuth consent, with no per-account registration needed (see Google's [3P/agency guidance](https://developers.google.com/merchant/api/guides/quickstart/faq#i_work_with_multiple_merchant_center_accounts_do_i_need_to_register_every_merchant_center_account_i_want_to_use_with_the_merchant_api)). Each GCP can be registered with at most one primary Merchant Center at a time; registering against a second account returns `ALREADY_REGISTERED`.

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
2. **Admin → API Center** → request a token.
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
      { "credentialkey": "google-ads", "fieldname": "authmethod", "fieldvalue": "own" }
    ]
  }'
```

Don't send `managercustomerid`. `CredentialUpsert` refuses it with `Manager Customer ID (MCC) is managed by the connection flow`, and one refused field fails the whole request, so nothing is saved.

### Step 5: Initiate OAuth

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/OAuthConnect" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "credentialkey": "google-ads",
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

After the token exchange, Wiro lists the customers the Google user can open directly (`customers:listAccessibleCustomers`) and looks up each one's descriptive name and status. A client account that the user reaches only through a manager (MCC) account is not listed.

**Success URL:**

```
https://your-app.com/settings/integrations?gads_connected=true&gads_accounts=%5B%7B%22id%22%3A%221234567890%22%2C%22name%22%3A%22My%20Client%22%2C%22status%22%3A%22ENABLED%22%7D%5D
```

- `gads_accounts` is always there on success, with at least one entry. When Google lists no customer for this user, for example because the developer token is missing or refused, Wiro saves nothing and returns `gads_error=no_accounts` instead.
- Each entry is `{ id, name, status }`: `id` is the 10-digit customer ID, `name` the descriptive name, and `status` the Google Ads customer status (for example `"ENABLED"`, `"CANCELED"`, `"SUSPENDED"`). `name` and `status` are empty strings when the lookup for that customer failed.

```javascript
const params = new URLSearchParams(window.location.search);
if (params.get("gads_connected") === "true") {
  const accounts = JSON.parse(params.get("gads_accounts") || "[]");
  if (accounts.length === 1) {
    await setCustomerId(accounts[0]);
  } else if (accounts.length > 1) {
    presentCustomerPicker(accounts);
  }
}
```

### Step 7: Persist the customer ID selection

This call is required, even when `gads_accounts` has one entry. Until it runs, `OAuthStatus` reports `connected: false`.

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/SetPickerAccounts" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "credentialkey": "google-ads",
    "accounts": [
      { "customerid": "1234567890", "customerdescriptivename": "Acme Corp Production" }
    ]
  }'
```

- `customerid`: either 10-digit or `123-456-7890` format works, and non-digits are stripped automatically.
- `customerdescriptivename` (optional): the account label shown next to the customer ID. Take both values from the `gads_accounts` entry: `id` becomes `customerid`, `name` becomes `customerdescriptivename`.
- Pass multiple `{ customerid, customerdescriptivename }` entries to authorize the agent against several customers at once.

Response:

```json
{
  "result": true,
  "accounts": [
    { "id": "1234567890", "name": "Acme Corp Production" }
  ],
  "errors": []
}
```

Triggers agent restart if running.

### Step 8: Verify and Start

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/OAuthStatus" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "credentialkey": "google-ads"
  }'
```

Response:

```json
{
  "result": true,
  "connected": true,
  "accounts": [
    { "id": "1234567890", "name": "Acme Corp Production" }
  ],
  "connectedat": "2026-04-17T12:00:00.000Z",
  "tokenexpiresat": "2026-04-17T13:00:00.000Z",
  "errors": []
}
```

- `accounts[]` carries one entry per selected customer (`id` = `customerid`, `name` = `customerdescriptivename`).
- Access token lifetime: **1 hour** (short). Wiro maintains it automatically while the agent is running.
- Google's refresh tokens stay valid until they are revoked, except while the consent screen is in **Testing**: then Google expires them after 7 days.

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
| `credentialkey` | string | Yes | `"google-ads"`. |
| `redirecturl` | string | Yes | Any HTTPS URL you control (or `http://localhost` / `http://127.0.0.1` for development). |
| `authmethod` | string | No | `"own"`. Omitted, it means `"wiro"`, which is not available yet. |

### GET /UserAgentOAuth/GAdsCallback

Server-side endpoint invoked by Google. You don't call it: you register it as the Authorized redirect URI of your OAuth client. Wiro then sends the browser to your `redirecturl` with `gads_connected=true&gads_accounts=<JSON>` or `gads_error=<code>`. The callback path is per-provider: Google Ads's stays `GAdsCallback`.

### POST /UserAgentOAuth/SetPickerAccounts

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Agent instance GUID. |
| `credentialkey` | string | Yes | `"google-ads"`. |
| `accounts` | array | Yes | One or more `{ customerid, customerdescriptivename }` entries. `customerid` is 10 digits (dashes/letters stripped server-side); `customerdescriptivename` is the label, the `name` of the `gads_accounts` entry. |

Response: `{ result, accounts: [{id, name}, ...], errors }`. Triggers agent restart if running.

### POST /UserAgentOAuth/OAuthStatus

Body: `{ useragentguid, credentialkey: "google-ads" }`. Response: `connected`, `accounts: [{id, name}, ...]` (one entry per selected customer: `id` = `customerid`, `name` = `customerdescriptivename`), `connectedat`, `tokenexpiresat` (~1h).

### POST /UserAgentOAuth/OAuthDisconnect

Body: `{ useragentguid, credentialkey: "google-ads" }`. Clears the tokens and the selected customers in Wiro. Your Client ID, Client Secret and developer token are kept, so you can connect again without saving them again. Wiro does not ask Google to revoke the authorization.

### Token lifecycle

Wiro renews the Google Ads access token while the agent is running. When the agent is stopped, the token runs out after about an hour and `OAuthStatus` reports `connected: false` until the agent starts and renews it. Reconnect through OAuth when Google revokes the authorization, or when `connected` stays `false` while the agent runs.

## Using the Skill

Once Google Ads is connected and `customerid` is persisted, the agent's scheduled tasks use the `int-googleads-manage` platform skill to pull metrics and manage campaigns. Adjust the cron of the built-in `cs-cron-googleads-performance-reporter` task (Google Ads Manager) with `enabled` and `interval` only. The task body (`value`) is owned by the bundled integration skill and silently dropped on writes:

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/CustomSkillUpsert" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "skillkey": "cs-cron-googleads-performance-reporter",
    "enabled": true,
    "interval": "0 9 * * *"
  }'
```

To change **what** the reporter includes (wasted-spend threshold, target ROAS, reporting preferences), edit the paired preference skill `ad-strategy` instead (see [Agent Skills → Updating Preference Skills](/docs/agent-skills#updating-preference-skills)).

## Troubleshooting

| Error code | Meaning | What to do |
|------------|---------|------------|
| `missing_params` | The callback was opened without a `state`, so the browser lands on wiro.ai instead of your app. | Start a new flow from Step 5. |
| `authorization_denied` | User cancelled, or consent screen in Testing and the user isn't a test user. | Add test user or publish consent screen. |
| `session_expired` | State cache expired. | Restart. |
| `token_exchange_failed` | Google did not return an access token for the authorization code, usually because the saved Client Secret is wrong. | Re-copy the Client Secret (Step 4) and connect again. |
| `no_accounts` | Sign-in worked, but Google listed no Google Ads customer for this user, and nothing was saved. A missing or refused developer token, or a Google Ads API that isn't enabled in your project, ends here too. | Check the `developertoken` from Step 4 and its access level, and that the Google Ads API is enabled, then connect again with a Google user who can open the account. |
| `Wiro-managed OAuth is not enabled for Google Ads` | Returned in `OAuthConnect`'s `errors[]`: Wiro mode isn't available yet, and it is the default when `authmethod` is left out. | Save your credentials (Step 4) and call `OAuthConnect` with `"authmethod": "own"`. |
| `useragent_not_found` | The agent was deleted, or is no longer owned by the account that started the flow, before Google returned. | Start again with `OAuthConnect` for an existing agent. |
| `Google Ads credentials not configured` | Returned in `OAuthConnect`'s `errors[]` when `authmethod: "own"` but `clientid` / `clientsecret` are missing. | `UserAgent/CredentialUpsert` with `clientid` + `clientsecret` (Step 4). |
| `internal_error` | Server error. | Retry; contact support. |

### `redirect_uri_mismatch` on Google's page

The Authorized redirect URIs of your OAuth client don't include `https://api.wiro.ai/v1/UserAgentOAuth/GAdsCallback` exactly as written. Google stops on its own error page, so nothing comes back to your `redirecturl`. Add the URI (Step 2) and connect again.

### `USER_PERMISSION_DENIED` on API calls

The OAuth-authorized user lacks access to the `customerid` you chose. Pick a different customer from `gads_accounts` or have the user request access.

### Developer Token rejected

Test tokens can only query accounts in your own MCC hierarchy. For customer accounts outside your MCC, you need Basic Access. Apply in **Admin → API Center**.

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
- [TikTok Ads integration](/docs/integration-tiktokads-skills)
- [Google Ads API docs](https://developers.google.com/google-ads/api/docs/start)
