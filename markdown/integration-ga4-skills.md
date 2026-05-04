# Google Analytics 4 Integration

Connect your agent to Google Analytics 4 (GA4) for conversion reporting, audience listing, and attribution cross-checks against your advertising platforms.

## Overview

The GA4 integration uses Google OAuth 2.0 with the GA4 Data API v1beta and the GA4 Admin API v1beta/v1alpha.

**Skills that use this integration:**

- `int-ga4-analytics` — Direct GA4 reporting + Google Ads / Meta Ads attribution cross-check

**Agents that typically enable this integration:**

- Google Ads Manager
- Meta Ads Manager
- Any agent that needs to audit ad-reported conversions against GA4

## Availability

| Mode | Status | Notes |
|------|--------|-------|
| `"wiro"` | Available | One-click connect using Wiro's Google Cloud project. |
| `"own"` | Available | Own Google Cloud project + OAuth client. |

## Prerequisites

- **A Wiro API key** — [Authentication](/docs/authentication).
- **A deployed agent** — [Agent Overview](/docs/agent-overview).
- **A GA4 Property** the connecting user administers.
- **(Own mode) A Google Cloud project** with GA4 Data API and GA4 Admin API enabled.
- **An HTTPS callback URL**.

## Wiro Mode

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/GA4Connect" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "redirecturl": "https://your-app.com/settings/integrations"
  }'
```

The response returns `{ result: true, authorizeUrl: "..." }`. Redirect the user to `authorizeUrl`.

After consent, the user returns with `?ga4_connected=true&ga4_properties=[{propertyid,propertydisplayname,accountname}]`. If the user has multiple GA4 properties, present them in a picker and call `GA4SetProperty`:

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/GA4SetProperty" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "propertyid": "123456789",
    "propertydisplayname": "MyApp — Production"
  }'
```

## Own Mode

### Step 1: Create a Google Cloud Project

1. [console.cloud.google.com](https://console.cloud.google.com/) → create a project.
2. **APIs & Services → Library** — enable:
   - [Google Analytics Data API](https://console.cloud.google.com/apis/library/analyticsdata.googleapis.com)
   - [Google Analytics Admin API](https://console.cloud.google.com/apis/library/analyticsadmin.googleapis.com)
3. **OAuth consent screen**:
   - **External** user type for multi-tenant use
   - App name, support email, developer contact
   - Add scopes: `analytics.readonly`, `analytics.edit`

### Step 2: Create OAuth Client

**APIs & Services → Credentials → Create Credentials → OAuth client ID**:
- Application type: **Web application**
- **Authorized redirect URIs**: `https://api.wiro.ai/v1/UserAgentOAuth/GA4Callback`

Copy the **Client ID** and **Client Secret** to your agent credentials.

### Step 3: Connect

Submit the Client ID, Client Secret via agent credential update (`POST /UserAgent/CredentialUpsert`), then trigger `GA4Connect` in `own` mode:

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/GA4Connect" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "redirecturl": "https://your-app.com/settings/integrations",
    "authmethod": "own"
  }'
```

### Step 4: Property Picker

After GA4 consent the user returns with `?ga4_properties=[...]`. Present the list, let the user choose, then call `GA4SetProperty` as shown above.

## Disconnect

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/GA4Disconnect" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "useragentguid": "your-useragent-guid" }'
```

Clears `accesstoken`, `refreshtoken`, `propertyid`, `propertydisplayname` and resets `_connected` to `false`. The credential template shape is preserved so the UI can re-offer Connect.

## Status

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/GA4Status" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "useragentguid": "your-useragent-guid" }'
```

Returns `{ result: true, connected: true, propertyid, propertydisplayname, connectedat }`.

## What the agent does with this integration

### Direct reporting

Agent runs GA4 reports on operator request:

```
Operator → "show paid search performance last 14 days"
Agent → POST /v1beta/properties/123456789:runReport
     with dimensions=[sessionDefaultChannelGroup]
     and metrics=[sessions, purchases, totalRevenue]
```

### Attribution cross-check

Agent cross-checks ad platform conversions against GA4 paid traffic for the same period, flags >20% deltas.

### Audience listing

Agent reads GA4 predefined + custom audiences via Admin API and can propose Customer Match sync candidates.

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `invalid_grant` | Refresh token expired | Re-connect via `GA4Connect` |
| `PERMISSION_DENIED` | User not a property administrator | Ask user to add the GA account |
| `403 Request had insufficient authentication` | Missing scopes | Re-consent with full scope set |
| Empty property picker | User has no GA4 property access | Instruct user to create/gain access |

## Troubleshooting OAuth Callback

The disconnect endpoint returns an error if no property was selected (the connection is not considered complete). Re-run Connect to choose a property.

## Skill reference

- [agent-skills.md](/docs/agent-skills) — custom skill schema and the `int-ga4-analytics` key
