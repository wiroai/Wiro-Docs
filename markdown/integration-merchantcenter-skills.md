# Google Merchant Center Integration

Connect your agent to Google Merchant Center (Shopping) for product feed management, status issues, and shopping reports.

## Overview

The Merchant Center integration uses the [Merchant API v1](https://developers.google.com/merchant/api) (the newer replacement for the deprecated Content API for Shopping v2.1).

**Skills that use this integration:**

- `int-merchant-center`: Product feed management, status issue scanning, shipping/tax, orders

**Agents that typically enable this integration:**

- Google Ads Manager: for Shopping and PMax campaigns that depend on the product feed

## Availability

| Mode | Status | Notes |
|------|--------|-------|
| `"own"` | Available | Your own Google Cloud project and OAuth client, plus a one-time developer registration of that project against your primary Merchant Center. |
| `"wiro"` | Coming soon | Wiro's shared Google Cloud project is awaiting Google's review. Until then, `OAuthConnect` in Wiro mode, which is also what you get when you leave out `authmethod`, returns `Wiro-managed OAuth is not enabled for Merchant Center`. |

## Prerequisites

- **A Wiro API key** (see [Authentication](/docs/authentication)).
- **A deployed agent** (see [Agent Overview](/docs/agent-overview)).
- **A Merchant Center account** the connecting user administers.
- **A Google Cloud project** with Merchant API enabled.
- **Developer Registration**: a one-time step to link your GCP project to your primary MC account.
- **An HTTPS callback URL**.

## Own Mode

### Step 1: Create GCP project + enable Merchant API

1. [console.cloud.google.com](https://console.cloud.google.com/) → create a project.
2. **APIs & Services → Library** → enable [Merchant API](https://console.cloud.google.com/apis/library/merchantapi.googleapis.com).
3. **OAuth consent screen**:
   - **External** user type for multi-tenant use
   - App name, support email
   - Add scope: `https://www.googleapis.com/auth/content`

### Step 2: Create OAuth Client

**APIs & Services → Credentials → Create Credentials → OAuth client ID**:
- Application type: **Web application**
- **Authorized redirect URIs**: `https://api.wiro.ai/v1/UserAgentOAuth/MCCallback`

Copy the client ID and the client secret.

### Step 3: Register Developer Registration (REQUIRED, one-time)

Merchant API requires that your GCP project be registered against your **primary** Merchant Center account before it will answer for any merchant account you authorize:

```bash
curl -X POST \
  "https://merchantapi.googleapis.com/accounts/v1/accounts/{YOUR_PRIMARY_MC_ID}/developerRegistration:registerGcp" \
  -H "Authorization: Bearer {ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Where:
- `YOUR_PRIMARY_MC_ID`: your own Merchant Center ID (you, the developer)
- `ACCESS_TOKEN`: a fresh access token for your primary MC account

Once registered, your GCP project can call Merchant API on any merchant account that a user authorizes through OAuth.

### Step 4: Connect

Save the OAuth client with `POST /UserAgent/CredentialUpsert`:

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/CredentialUpsert" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "fields": [
      { "credentialkey": "google-merchant-center", "fieldname": "clientid", "fieldvalue": "123-abc.apps.googleusercontent.com" },
      { "credentialkey": "google-merchant-center", "fieldname": "clientsecret", "fieldvalue": "YOUR_CLIENT_SECRET" },
      { "credentialkey": "google-merchant-center", "fieldname": "authmethod", "fieldvalue": "own" }
    ]
  }'
```

Then start `OAuthConnect` in `own` mode:

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/OAuthConnect" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "credentialkey": "google-merchant-center",
    "redirecturl": "https://your-app.com/settings/integrations",
    "authmethod": "own"
  }'
```

The response returns `{ result: true, authorizeUrl: "..." }`. Redirect the user to `authorizeUrl`.

### Step 5: Save the account selection

After consent the user returns with `?mc_connected=true&mc_accounts=<URL-encoded-JSON>`. The JSON array entries come straight from the Merchant Center API and carry `{ id, name, websiteUrl }` per account. Map them to the picker's `{ merchantid, accountname }` shape and call `SetPickerAccounts`:

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/SetPickerAccounts" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "credentialkey": "google-merchant-center",
    "accounts": [
      { "merchantid": "5769377374", "accountname": "Acme Store" }
    ]
  }'
```

Pass multiple `{ merchantid, accountname }` entries to authorize the agent against several merchant accounts at once.

## Disconnect

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/OAuthDisconnect" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "credentialkey": "google-merchant-center"
  }'
```

## Status

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/OAuthStatus" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "credentialkey": "google-merchant-center"
  }'
```

Response:

```json
{
  "result": true,
  "connected": true,
  "accounts": [
    { "id": "5769377374", "name": "Acme Store" }
  ],
  "connectedat": "2026-04-17T12:00:00.000Z",
  "tokenexpiresat": "2026-04-17T13:00:00.000Z",
  "errors": []
}
```

`accounts[]` carries one entry per selected merchant (`id` = `merchantid`, `name` = `accountname`).

## Skill reference

- [agent-skills.md](/docs/agent-skills): custom skill schema and the `int-merchant-center` key

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `Wiro-managed OAuth is not enabled for Merchant Center` in `OAuthConnect`'s `errors[]` | Wiro mode isn't available yet, and it is the default when `authmethod` is left out | Save your OAuth client (Step 4) and call `OAuthConnect` with `"authmethod": "own"` |
| `PERMISSION_DENIED` on any merchant call | GCP project not registered | Complete Step 3 once |
| `invalid_grant` | Refresh token expired | Re-connect via `OAuthConnect` |
| `No Merchant Center accounts available` | User has no MC access | User creates/gains access at `merchants.google.com` |
| Content API deprecation error | You're on old v2.1 endpoints | Switch to v1 (`merchantapi.googleapis.com`) |
