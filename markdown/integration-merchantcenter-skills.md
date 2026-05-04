# Google Merchant Center Integration

Connect your agent to Google Merchant Center (Shopping) for product feed management, status issues, and shopping reports.

## Overview

The Merchant Center integration uses the [Merchant API v1](https://developers.google.com/merchant/api) (the newer replacement for the deprecated Content API for Shopping v2.1).

**Skills that use this integration:**

- `int-merchant-center` — Product feed management, status issue scanning, shipping/tax, orders

**Agents that typically enable this integration:**

- Google Ads Manager — for Shopping and PMax campaigns that depend on the product feed

## Availability

| Mode | Status | Notes |
|------|--------|-------|
| `"wiro"` | Available | One-click connect using Wiro's Google Cloud project (already registered against Wiro's developer GCP). |
| `"own"` | Available | Requires a one-time developer registration of your GCP project against your primary Merchant Center. |

## Prerequisites

- **A Wiro API key** — [Authentication](/docs/authentication).
- **A deployed agent** — [Agent Overview](/docs/agent-overview).
- **A Merchant Center account** the connecting user administers.
- **(Own mode) A Google Cloud project** with Merchant API enabled.
- **(Own mode) Developer Registration** — a one-time step to link your GCP project to your primary MC account.
- **An HTTPS callback URL**.

## Wiro Mode

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/MCConnect" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "redirecturl": "https://your-app.com/settings/integrations"
  }'
```

After consent the user returns with `?mc_connected=true&mc_accounts=[{merchantid,accountname}]`. Present the picker and call `MCSetMerchantId`:

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/MCSetMerchantId" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "merchantid": "5769377374",
    "accountname": "Acme Store"
  }'
```

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

### Step 3: Register Developer Registration (REQUIRED — one-time)

Merchant API requires that your GCP project be registered against your **primary** Merchant Center account before it will answer for any merchant account you authorize:

```bash
curl -X POST \
  "https://merchantapi.googleapis.com/accounts/v1/accounts/{YOUR_PRIMARY_MC_ID}/developerRegistration:registerGcp" \
  -H "Authorization: Bearer {ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Where:
- `YOUR_PRIMARY_MC_ID` — your own Merchant Center ID (you, the developer)
- `ACCESS_TOKEN` — a fresh access token for your primary MC account

Once registered, your GCP project can call Merchant API on any merchant account that a user authorizes through OAuth.

### Step 4: Connect

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/MCConnect" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "redirecturl": "https://your-app.com/settings/integrations",
    "authmethod": "own"
  }'
```

## Disconnect

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/MCDisconnect" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "useragentguid": "your-useragent-guid" }'
```

## Status

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/MCStatus" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "useragentguid": "your-useragent-guid" }'
```

## Skill reference

- [agent-skills.md](/docs/agent-skills) — custom skill schema and the `int-merchant-center` key

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `PERMISSION_DENIED` on any merchant call | GCP project not registered | Complete Step 3 once |
| `invalid_grant` | Refresh token expired | Re-connect via `MCConnect` |
| `No Merchant Center accounts available` | User has no MC access | User creates/gains access at `merchants.google.com` |
| Content API deprecation error | You're on old v2.1 endpoints | Switch to v1 (`merchantapi.googleapis.com`) |
