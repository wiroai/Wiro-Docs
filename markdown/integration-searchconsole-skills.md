# Google Search Console Integration

Connect your agent to Google Search Console for read-only organic search reporting: clicks, impressions, click-through rate and average position by query, page, country and device, period comparisons, sitemap status and URL Inspection.

## Overview

The Google Search Console integration uses Google OAuth 2.0 with the Google Search Console API and the read-only scope `https://www.googleapis.com/auth/webmasters.readonly`. The agent reads Search Console data only: it cannot add or remove properties, submit or delete sitemaps, or request indexing.

**Skills that use this integration:**

- `int-search-console`: Search Analytics reporting (top, rising and falling queries and pages, period comparisons), sitemap status and URL Inspection, read-only

**Agents that typically enable this integration:**

- Content and SEO agents that plan or check articles against real search demand
- Any agent that reports on Google organic search next to Google Analytics 4

## Availability

| Mode | Status | Notes |
|------|--------|-------|
| `"own"` | Available | Your own Google Cloud project and OAuth client. |
| `"wiro"` | Coming soon | Wiro's shared Google Cloud project is not enabled for Search Console yet. Until then, `OAuthConnect` in Wiro mode, which is also what you get when you leave out `authmethod`, returns `Sign-in with the platform's app is not enabled for Google Search Console`. |

## Prerequisites

- **A Wiro API key** (see [Authentication](/docs/authentication)).
- **A deployed agent** (see [Agent Overview](/docs/agent-overview)).
- **A Search Console property** the connecting Google account can open as an owner, full user or restricted user. Properties the account has not verified are not listed.
- **A Google Cloud project** with the Google Search Console API enabled.
- **An HTTPS callback URL**.

## Own Mode

### Step 1: Create a Google Cloud Project

1. [console.cloud.google.com](https://console.cloud.google.com/) → create a project, or use the one behind your Google Analytics 4 client.
2. **APIs & Services → Library** → enable the [Google Search Console API](https://console.cloud.google.com/apis/library/searchconsole.googleapis.com).
3. **OAuth consent screen**:
   - **External** user type for multi-tenant use
   - App name, support email, developer contact
   - Add the scope `webmasters.readonly` (`https://www.googleapis.com/auth/webmasters.readonly`)
   - While the app is in **Testing**, only the test users you list can connect, and Google ends their authorization 7 days after consent. Add the connecting Google account as a test user, or publish the app (**In production**) so the agent keeps access.

### Step 2: Create OAuth Client

**APIs & Services → Credentials → Create Credentials → OAuth client ID**:
- Application type: **Web application**
- **Authorized redirect URIs**: `https://api.wiro.ai/v1/UserAgentOAuth/SearchConsoleCallback`

The OAuth client you made for Google Analytics 4 works too: add this redirect URI to it and enable the Google Search Console API in its project.

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
      { "credentialkey": "google-search-console", "fieldname": "clientid", "fieldvalue": "123-abc.apps.googleusercontent.com" },
      { "credentialkey": "google-search-console", "fieldname": "clientsecret", "fieldvalue": "YOUR_CLIENT_SECRET" },
      { "credentialkey": "google-search-console", "fieldname": "authmethod", "fieldvalue": "own" }
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
    "credentialkey": "google-search-console",
    "redirecturl": "https://your-app.com/settings/integrations",
    "authmethod": "own"
  }'
```

The response returns `{ result: true, authorizeUrl: "...", flowid: "..." }`. Redirect the user to `authorizeUrl`. Google asks which Google account to connect, even when the browser is already signed in to one, and asks for read-only access to Search Console data.

### Step 4: Property Picker

After consent, the user returns with `?gsc_connected=true&gsc_sites=<URL-encoded-JSON>`. Each entry is `{ id, displayName, permissionLevel }`: `id` is the property exactly as Search Console names it (`sc-domain:example.com` for a Domain property, or the full address of a URL-prefix property with its trailing slash, such as `https://www.example.com/`), `displayName` the same without the `sc-domain:` prefix, and `permissionLevel` Google's permission level for the connecting account (for example `siteOwner`, `siteFullUser` or `siteRestrictedUser`). Properties the account has not verified are left out. Map the user's choice to the picker shape and call `SetPickerAccounts`:

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/SetPickerAccounts" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "credentialkey": "google-search-console",
    "accounts": [
      { "siteurl": "sc-domain:example.com", "sitename": "example.com" }
    ]
  }'
```

Pass several `{ siteurl, sitename }` entries to authorize the agent against several properties at once (`id` becomes `siteurl`). Wiro saves each property's `displayName` from its list as `sitename`, so a name you send is not read. `permissionLevel` is handy for your UI, but it is not stored. Wiro saves only properties from this sign-in's list, under the names it lists, when the call comes from the same Wiro account within 15 minutes. The first save uses the list up: to change the selection later, connect again. See [SetPickerAccounts](/docs/agent-credentials#post-useragentoauthsetpickeraccounts).

## Disconnect

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/OAuthDisconnect" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "credentialkey": "google-search-console"
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
    "credentialkey": "google-search-console"
  }'
```

Response:

```json
{
  "result": true,
  "connected": true,
  "accounts": [
    { "id": "sc-domain:example.com", "name": "example.com" }
  ],
  "connectedat": "2026-11-21T12:00:00.000Z",
  "tokenexpiresat": "2026-11-21T13:00:00.000Z",
  "errors": []
}
```

`accounts[]` carries one entry per selected property (`id` = `siteurl`, `name` = `sitename`).

## What the agent does with this integration

### Search performance reports

Agent runs Search Analytics queries on operator request:

```
Operator → "top queries for the last 28 days"
Agent → POST /webmasters/v3/sites/sc-domain%3Aexample.com/searchAnalytics/query
     with dimensions=[query], type=web, rowLimit=25
     and a date range that ends on the last day with data
```

Every answer names the property, the date range, the search type and Google Search Console as the source. Queries can be grouped and filtered by query, page, country, device, date and search appearance.

### Period comparisons and movers

Agent compares two periods of the same length (for example the last 28 days against the 28 days before, or against the same dates a year earlier) and lists the queries and pages that gained or lost the most clicks, with the change in impressions, click-through rate and average position.

### Sitemaps and URL Inspection

Agent lists the property's submitted sitemaps with their errors, warnings and last download, and inspects single URLs on request: index verdict, coverage, canonical URLs, last crawl, robots.txt and page fetch state. Google allows 2,000 URL inspections per property per day.

### Data freshness

Google says Search Console data is typically available after 2-3 days. The agent finds the last day with data before it reports, does not read the newest days as a drop, and uses Pacific Time dates as Search Console does.

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `Sign-in with the platform's app is not enabled for Google Search Console` in `OAuthConnect`'s `errors[]` | Wiro mode isn't available yet, and it is the default when `authmethod` is left out | Save your OAuth client (Step 3) and call `OAuthConnect` with `"authmethod": "own"` |
| `Google Search Console credentials not configured` in `OAuthConnect`'s `errors[]` | `authmethod: "own"` without a saved `clientid` and `clientsecret` | Save them (Step 3), then retry |
| `gsc_error=no_accounts` on your `redirecturl` | Google listed no verified Search Console property for this user, and Wiro saved nothing: the account has no property or only unverified ones, or the Google Search Console API is not enabled in your project. In the last case `gsc_error_detail` carries Google's status, such as `PERMISSION_DENIED` | Enable the API (Step 1), or connect with a Google account that has access to a verified property, then call `OAuthConnect` again |
| `invalid_grant` | Refresh token expired or revoked; a consent screen still in Testing expires it 7 days after consent | Publish the consent screen, then re-connect via `OAuthConnect` |
| `403 Request had insufficient authentication scopes` | The consent did not include `webmasters.readonly` | Add the scope to the consent screen (Step 1) and connect again |
| The agent reports a 403 for one property | The Google account lost access to it, or the property is no longer verified | Restore the account's access in Search Console, or connect again and pick another property |
| `OAuthStatus` returns `connected: false` right after consent | No property has been saved yet; the connection is complete only once `SetPickerAccounts` stores at least one | Call `SetPickerAccounts` with a property from `gsc_sites` (Step 4) |

### `redirect_uri_mismatch` on Google's page

The Authorized redirect URIs of your OAuth client don't include `https://api.wiro.ai/v1/UserAgentOAuth/SearchConsoleCallback` exactly as written. Google stops on its own error page, so nothing comes back to your `redirecturl`. Add the URI (Step 2) and connect again.

### `Error 403: access_denied` on Google's page

The app is in Testing and the Google account is not one of its test users. Add the account under test users (Step 1), or publish the app, then connect again.

## Skill reference

- [agent-skills.md](/docs/agent-skills): custom skill schema and the `int-search-console` key
