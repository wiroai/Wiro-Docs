# Google Analytics 4 Integration

Connect your agent to Google Analytics 4 (GA4) for conversion reporting, audience listing, and attribution cross-checks against your advertising platforms.

## Overview

The GA4 integration uses Google OAuth 2.0 with the GA4 Data API v1beta and the GA4 Admin API v1beta/v1alpha.

**Skills that use this integration:**

- `int-ga4-analytics`: Direct GA4 reporting + Google Ads / Meta Ads attribution cross-check

**Agents that typically enable this integration:**

- Google Ads Manager
- Meta Ads Manager
- TikTok Ads Manager
- Any agent that needs to audit ad-reported conversions against GA4

## Availability

| Mode | Status | Notes |
|------|--------|-------|
| `"own"` | Available | Your own Google Cloud project and OAuth client. |
| `"wiro"` | Coming soon | Wiro's shared Google Cloud project is awaiting Google's review. Until then, `OAuthConnect` in Wiro mode, which is also what you get when you leave out `authmethod`, returns `Wiro-managed OAuth is not enabled for Google Analytics 4`. |

## Prerequisites

- **A Wiro API key** (see [Authentication](/docs/authentication)).
- **A deployed agent** (see [Agent Overview](/docs/agent-overview)).
- **A GA4 Property** the connecting user administers.
- **A Google Cloud project** with GA4 Data API and GA4 Admin API enabled.
- **An HTTPS callback URL**.

## Own Mode

### Step 1: Create a Google Cloud Project

1. [console.cloud.google.com](https://console.cloud.google.com/) → create a project.
2. **APIs & Services → Library** → enable:
   - [Google Analytics Data API](https://console.cloud.google.com/apis/library/analyticsdata.googleapis.com)
   - [Google Analytics Admin API](https://console.cloud.google.com/apis/library/analyticsadmin.googleapis.com)
3. **OAuth consent screen**:
   - **External** user type for multi-tenant use
   - App name, support email, developer contact
   - Add scopes: `analytics.readonly`, `analytics.edit`
   - Publish the app (**In production**). While it is in **Testing**, Google expires its refresh tokens after 7 days and the agent loses access.

### Step 2: Create OAuth Client

**APIs & Services → Credentials → Create Credentials → OAuth client ID**:
- Application type: **Web application**
- **Authorized redirect URIs**: `https://api.wiro.ai/v1/UserAgentOAuth/GA4Callback`

Copy the **Client ID** and **Client Secret** to your agent credentials.

### Step 3: Connect

Save the Client ID and Client Secret with `POST /UserAgent/CredentialUpsert`:

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/CredentialUpsert" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "fields": [
      { "credentialkey": "ga4", "fieldname": "clientid", "fieldvalue": "123-abc.apps.googleusercontent.com" },
      { "credentialkey": "ga4", "fieldname": "clientsecret", "fieldvalue": "YOUR_CLIENT_SECRET" },
      { "credentialkey": "ga4", "fieldname": "authmethod", "fieldvalue": "own" }
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
    "credentialkey": "ga4",
    "redirecturl": "https://your-app.com/settings/integrations",
    "authmethod": "own"
  }'
```

The response returns `{ result: true, authorizeUrl: "..." }`. Redirect the user to `authorizeUrl`.

### Step 4: Property Picker

After consent, the user returns with `?ga4_connected=true&ga4_properties=<URL-encoded-JSON>`. Each entry is `{ id, displayName, account, propertyType }`: `id` is the property number, `displayName` the property name, `account` the name of the GA4 account that owns it, and `propertyType` Google's property type (for example `PROPERTY_TYPE_ORDINARY`). Map the user's choice to the picker shape and call `SetPickerAccounts`:

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/SetPickerAccounts" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "credentialkey": "ga4",
    "accounts": [
      { "propertyid": "123456789", "propertydisplayname": "MyApp Production" }
    ]
  }'
```

Pass several `{ propertyid, propertydisplayname }` entries to authorize the agent against several GA4 properties at once (`id` becomes `propertyid`, `displayName` becomes `propertydisplayname`). Only these two are saved. `account` is handy for grouping the list in your UI, but it is not stored.

## Disconnect

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/OAuthDisconnect" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "credentialkey": "ga4"
  }'
```

Clears the tokens and the selected properties in Wiro. Your Client ID and Client Secret are kept, so you can connect again without saving them again. Wiro does not ask Google to revoke the authorization.

## Status

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/OAuthStatus" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "credentialkey": "ga4"
  }'
```

Response:

```json
{
  "result": true,
  "connected": true,
  "accounts": [
    { "id": "123456789", "name": "MyApp Production" }
  ],
  "connectedat": "2026-04-17T12:00:00.000Z",
  "tokenexpiresat": "2026-04-17T13:00:00.000Z",
  "errors": []
}
```

`accounts[]` carries one entry per selected property (`id` = `propertyid`, `name` = `propertydisplayname`).

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
| `Wiro-managed OAuth is not enabled for Google Analytics 4` in `OAuthConnect`'s `errors[]` | Wiro mode isn't available yet, and it is the default when `authmethod` is left out | Save your OAuth client (Step 3) and call `OAuthConnect` with `"authmethod": "own"` |
| `Google Analytics 4 credentials not configured` in `OAuthConnect`'s `errors[]` | `authmethod: "own"` without a saved `clientid` and `clientsecret` | Save them (Step 3), then retry |
| `invalid_grant` | Refresh token expired or revoked; a consent screen still in Testing expires it after 7 days | Publish the consent screen, then re-connect via `OAuthConnect` |
| `PERMISSION_DENIED` | User not a property administrator | Ask user to add the GA account |
| `403 Request had insufficient authentication` | Missing scopes | Re-consent with full scope set |
| `ga4_error=no_accounts` on your `redirecturl` | Google listed no GA4 property for this user, and Wiro saved nothing: the user has no property, or the Google Analytics Admin API is not enabled in your project | Enable the Admin API (Step 1), or have the user create a property or get access to one, then call `OAuthConnect` again |
| `OAuthStatus` returns `connected: false` right after consent | No GA4 property has been saved yet; the connection is complete only once `SetPickerAccounts` stores at least one | Call `SetPickerAccounts` with a property from `ga4_properties` (Step 4) |

### `redirect_uri_mismatch` on Google's page

The Authorized redirect URIs of your OAuth client don't include `https://api.wiro.ai/v1/UserAgentOAuth/GA4Callback` exactly as written. Google stops on its own error page, so nothing comes back to your `redirecturl`. Add the URI (Step 2) and connect again.

## Skill reference

- [agent-skills.md](/docs/agent-skills): custom skill schema and the `int-ga4-analytics` key
