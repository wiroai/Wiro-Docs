# Meta Ads Integration

Connect your agent to Meta's advertising platform to manage campaigns, ad sets, creatives, and performance insights across Facebook and Instagram ads.

## Overview

The Meta Ads integration powers the `metaads-manage` skill — creating and managing campaigns, pulling insights, managing creatives, and analyzing ad account data through direct Meta Graph / Marketing API v26 calls.

**Skills that use this integration:**

- `metaads-manage` — Campaign / ad set / creative CRUD, insights reporting, direct Graph API v26 operations
- `ads-manager-common` — Shared ads helpers (works alongside `metaads-manage` and `googleads-manage`)

**Agents that typically enable this integration:**

- Meta Ads Manager
- Any custom agent that needs paid-media capabilities on Meta

## Availability

| Path | Status | Notes |
|------|--------|-------|
| Wiro-owned approved-app OAuth | Pending provider approval | The registry carries this mode, but the dashboard keeps it unavailable while Wiro's Meta app is awaiting the required App Review, Advanced Access, and rollout checks. |
| `"own"` | Available now | You create your own Meta Developer App and connect it to Wiro. No App Review required when Development Mode + App Roles is used. |
| `"api_key"` | Available now — recommended | Paste a Business Manager System User token. No browser OAuth redirect and no App ID or App Secret is submitted to Wiro. Choose **Never** for token expiration when Meta offers it. |

> **There is no app-less Meta “machine key.”** A System User token is the closest machine-to-machine option: it removes the browser OAuth flow and recurring human sign-in, but Meta generates it for a System User through a Business Portfolio and a Meta Business app. The app, System User, ad accounts, Pages, and permissions remain customer-owned.

Today the two enabled modes are the recommended token-only System User path and customer-owned OAuth. Once Wiro's approved app has Advanced Access, a Wiro-owned OAuth option can be enabled without removing either customer-owned path.

## Why Wiro remains on direct Graph API v26

Meta's official Ads MCP is not a drop-in replacement yet. Wiro has not verified live parity for:

- targeting interest search and related raw targeting queries;
- reach/delivery estimates;
- lead-form and lead retrieval workflows;
- raw Graph flexibility needed for account-specific fields, edges, and versioned fallbacks;
- some financial, media upload, and creative-management operations.

Meta does not document a separate MCP “machine key”; MCP authentication still rests on Meta app/user or System User authorization. Replacing the direct integration is therefore deferred until Wiro completes live parity tests, permission/App Review checks, rate-limit and latency validation, error-shape regression tests, and a controlled rollout with rollback. Until those checks pass, Graph API v26 remains the authoritative runtime path.

## Prerequisites

- **A Wiro API key** — see [Authentication](/docs/authentication) for how to issue keys and sign requests.
- **A deployed agent** — see [Agent Overview](/docs/agent-overview) and call `POST /UserAgent/Deploy` first. You need the returned `useragents[0].guid` for every step below.
- **A Meta Business account** — [business.facebook.com](https://business.facebook.com/).
- **For the currently enabled customer-owned paths, a Meta Developer account and Business app** — [developers.facebook.com](https://developers.facebook.com/). The future Wiro-owned OAuth path will not require each customer to create an app.
- **For OAuth mode:** an HTTPS return URL that your backend controls. Meta's callback is the fixed Wiro URL shown below; `redirecturl` is where Wiro sends the browser after processing that callback. `http://localhost` and `http://127.0.0.1` are accepted for local development only.

## Recommended: System User token (no browser OAuth)

Use this path for a stable server-to-server connection owned by the customer's
Business Portfolio.

1. Open [**Meta Business Settings → Users → System Users**](https://business.facebook.com/latest/settings/system_users), then create or select a System User.
2. Assign each required ad account with both `ADVERTISE` and `ANALYZE` tasks. For Page-backed creatives, also assign the relevant Facebook Pages.
3. Generate a token for the Business app used by that System User. Choose **Never** under **Set expiration** when Meta offers it; some businesses are required to use an expiring token.
4. Grant `ads_management`, `ads_read`, and `business_management`. For Page discovery and Page-backed creatives, also grant `pages_show_list`, `pages_read_engagement`, and `pages_manage_ads`.
5. Save only the connection mode and token to Wiro:

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/CredentialUpsert" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "fields": [
      { "credentialkey": "meta-ads", "fieldname": "authmethod", "fieldvalue": "api_key" },
      { "credentialkey": "meta-ads", "fieldname": "systemusertoken", "fieldvalue": "YOUR_SYSTEM_USER_ACCESS_TOKEN" }
    ]
  }'
```

6. Ask Wiro to validate the token and discover assigned ad accounts:

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/OAuthConnect" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "credentialkey": "meta-ads",
    "authmethod": "api_key"
  }'
```

Wiro validates the token against Meta and returns only active ad accounts whose
effective `user_tasks` contain both `ADVERTISE` and `ANALYZE`. The token is
encrypted at rest and never reflected to the browser or API caller. Wiro does
not require or store an App ID/App Secret for this direct mode.

7. Persist one or more returned ad accounts with
   `POST /UserAgentOAuth/SetPickerAccounts` as shown in Step 10. API clients
   must perform this request even when only one account is returned.
8. Optionally discover and select Page mappings with
   `POST /UserAgentOAuth/DiscoverPickerItems`, then save them through the
   chained `SetPickerAccounts` shape shown in Step 10b.

## Customer-owned app OAuth

Every curl example and response shape below matches Wiro's production behavior verified against the source code. Nothing is invented.

### Step 1: Create a Meta Developer App

1. Go to [developers.facebook.com/apps](https://developers.facebook.com/apps) and click **Create app**.
2. Choose **"Other"** as the use case, then **"Business"** as the app type.
3. Set an **App display name** (this is what your end users see on the consent screen — use your company or product name, not "Wiro").
4. Enter an **App contact email**.
5. Select the **Meta Business Account** that owns the ad accounts you plan to manage, then click **Create app**.

You're now on the app dashboard. The app is in **Development Mode** by default — leave it there. Development Mode is exactly what lets you skip App Review.

### Step 2: Add the Marketing API product

1. From the app dashboard, click **Add product**.
2. Find **"Marketing API"** and click **Set up**.
3. No further configuration is required inside Marketing API itself — adding the product unlocks the `ads_*` permissions.

### Step 3: Add "Facebook Login for Business" and register the redirect URI

Meta Ads OAuth uses Facebook Login under the hood.

1. Click **Add product** again.
2. Find **"Facebook Login for Business"** and click **Set up**.
3. Left sidebar: **Facebook Login for Business → Settings**.
4. Scroll to **Valid OAuth Redirect URIs** and add exactly:

   ```
   https://api.wiro.ai/v1/UserAgentOAuth/MetaAdsCallback
   ```

5. **Save changes** at the bottom.

> This is the single most common place where own-mode setups fail. The redirect URI must be exact — HTTPS, no trailing slash, same capitalization.

### Step 4: Note the required permissions

Wiro requests these exact scopes during OAuth (sourced from `data/agent-skills-registry/credentials/meta-ads.json` under `oauth_provider.oauth_flow.scopes`):

```
ads_management,ads_read,business_management,pages_show_list,pages_read_engagement,pages_manage_ads
```

| Permission | Why Wiro requests it |
|------------|----------------------|
| `ads_management` | Create, update, and pause campaigns, ad sets, and ads. |
| `ads_read` | Read insights, performance metrics, and account metadata. |
| `business_management` | Discover and validate Business-managed assets used by the full management workflow. |
| `pages_show_list` | Discover Pages available to the connected principal for each selected ad account. |
| `pages_read_engagement` | Read page-level engagement metrics that some creative types reference. |
| `pages_manage_ads` | Use an assigned Page in Page-backed ad creatives. |

These permissions normally require App Review/Advanced Access for a multi-tenant Live Mode app. In a customer-owned app's Development Mode they work without App Review for Facebook users listed under that app's Roles. This is a testing/customer-owned fallback and does not make Wiro's future one-click shared-app path live; that path waits for Wiro's app to receive Advanced Access.

### Step 5: Copy your App ID and App Secret

**App settings → Basic** → copy the **App ID**, click **Show** next to **App Secret** and copy that too.

### Step 6: Add the users who will connect as Testers (only if they're not you)

- Connecting your own Facebook account? You're already the app Admin; skip this step.
- Connecting a different Facebook account (typical for SaaS customers)? Go to **App Roles → Roles → Add People** and invite them as **Testers** or **Developers**. They accept at [facebook.com/settings → Business Integrations](https://www.facebook.com/settings?tab=business_tools).

Users not listed in App Roles will be blocked at the consent screen in Development Mode.

### Step 7: Save your Meta App credentials to Wiro

Push the `appid` and `appsecret` into the agent's `meta-ads` credential group. Wiro merges credential updates per group — fields you don't send are preserved, and credentials from other groups are untouched.

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/CredentialUpsert" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "fields": [
      { "credentialkey": "meta-ads", "fieldname": "appid", "fieldvalue": "YOUR_META_APP_ID" },
      { "credentialkey": "meta-ads", "fieldname": "appsecret", "fieldvalue": "YOUR_META_APP_SECRET" },
      { "credentialkey": "meta-ads", "fieldname": "authmethod", "fieldvalue": "own" }
    ]
  }'
```

Successful response (sanitized — OAuth tokens, if any, are stripped):

```json
{
  "result": true,
  "useragents": [
    {
      "guid": "your-useragent-guid",
      "setuprequired": true,
      "status": 0
    }
  ],
  "errors": []
}
```

> **Prepaid deploy users:** If you deployed your agent with `useprepaid: true`, the `credentials` you passed in the Deploy body were **not** saved (prepaid deploy writes only a template placeholder). You must call this Update step explicitly before initiating OAuth.

> **Only user-writable fields are accepted.** `appid` and `appsecret` are user-writable in the `meta-ads` credential. Attempts to set platform-managed fields are silently ignored. Call `POST /UserAgent/Detail` and inspect the `meta-ads` credential block if you see a silent no-op.

### Step 8: Initiate OAuth

Start the flow with `authmethod: "own"` so Wiro uses your customer-owned `appid` and `appsecret`.

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/OAuthConnect" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "credentialkey": "meta-ads",
    "redirecturl": "https://your-app.com/settings/integrations",
    "authmethod": "own"
  }'
```

Response:

```json
{
  "result": true,
  "authorizeUrl": "https://www.facebook.com/v26.0/dialog/oauth?client_id=...&redirect_uri=https%3A%2F%2Fapi.wiro.ai%2Fv1%2FUserAgentOAuth%2FMetaAdsCallback&state=...&scope=ads_management%2Cads_read%2Cbusiness_management%2Cpages_show_list%2Cpages_read_engagement%2Cpages_manage_ads",
  "errors": []
}
```

Redirect the user's browser to `authorizeUrl`. Full-page redirect is recommended over a popup — some browsers block third-party cookies in popups, breaking the OAuth session.

> **State TTL:** Wiro caches the OAuth state for **15 minutes**. If the user takes longer to complete consent, the callback returns `metaads_error=session_expired` and you must call `OAuthConnect` again.

### Step 9: Handle the callback

After the user consents, Meta sends them back to Wiro's callback URL. Wiro exchanges the code for a long-lived token, verifies its App ID, expiry, data-access expiry, and required scopes through `debug_token`, then fetches the user's eligible ad accounts. It writes the token into the agent's config and redirects the user to **your** `redirecturl` with query parameters.

**Success URL** looks like:

```
https://your-app.com/settings/integrations?metaads_connected=true&metaads_accounts=%5B%7B%22id%22%3A%22123456789%22%2C%22name%22%3A%22My%20Ad%20Account%22%7D%5D
```

- `metaads_accounts` is `encodeURIComponent(JSON.stringify([...]))`.
- Each array element: `{ id, name }`.
- The `id` has the `act_` prefix stripped by Wiro.
- Only ad accounts with `account_status === 1` and effective `user_tasks` containing both `ADVERTISE` and `ANALYZE` are included. Read-only `ANALYZE` accounts are excluded because this skill supports mutations.

Parse in the browser:

```javascript
const params = new URLSearchParams(window.location.search);

if (params.get("metaads_connected") === "true") {
  const accounts = JSON.parse(decodeURIComponent(params.get("metaads_accounts") || "[]"));
  if (accounts.length === 0) {
    showError("No active ad accounts found on this Meta user.");
  } else if (accounts.length === 1) {
    await setAdAccount(accounts[0]);
  } else {
    presentAccountPicker(accounts);
  }
} else if (params.get("metaads_error")) {
  handleError(params.get("metaads_error"));
}
```

### Step 10: Persist the ad account selection

Persist one or more discovered ad accounts. This is **required** for the
connection to become active. The Wiro dashboard auto-selects a sole result and
opens a multi-select picker when several accounts are returned; API clients
must always call this endpoint explicitly.

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/SetPickerAccounts" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "credentialkey": "meta-ads",
    "accounts": [
      { "adaccountid": "123456789", "adaccountname": "My Ad Account" }
    ]
  }'
```

Response:

```json
{
  "result": true,
  "accounts": [
    { "id": "123456789", "name": "My Ad Account" }
  ],
  "errors": []
}
```

Behavior:

- Pass the ad account ID **without** the `act_` prefix. If you include it, Wiro strips it automatically.
- `adaccountname` is optional but recommended — it surfaces in `OAuthStatus` responses and dashboards.
- Pass multiple `{ adaccountid, adaccountname }` entries to authorize the agent against several ad accounts at once.
- If the agent was running (status `3` or `4`), Wiro marks it `status: 1` with `restartafter: true` so the daemon picks up the new ad account after the next stop cycle. No manual Start needed.

### Step 10b: Discover and select Facebook Pages (optional)

After the ad-account selection is saved, discover Pages that Meta reports as
promotable for each selected account:

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/DiscoverPickerItems" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "credentialkey": "meta-ads",
    "pickerkey": "pages"
  }'
```

Response:

```json
{
  "result": true,
  "pickerkey": "pages",
  "groups": [
    {
      "parent": {
        "adaccountid": "123456789",
        "adaccountname": "My Ad Account"
      },
      "items": [
        { "pageid": "111222333", "pagename": "My Facebook Page" }
      ]
    }
  ],
  "errors": []
}
```

Save the selected Pages within five minutes. Include every successfully
returned parent exactly once; an empty `items` array means no Page is selected
for that ad account:

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/SetPickerAccounts" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "credentialkey": "meta-ads",
    "pickerkey": "pages",
    "selections": [
      {
        "parentvalue": "123456789",
        "items": [
          { "pageid": "111222333", "pagename": "My Facebook Page" }
        ]
      }
    ]
  }'
```

The dashboard runs this chained flow automatically after ad-account selection.
It auto-selects the only Page when there is exactly one candidate; otherwise it
shows Pages grouped by ad account and permits multiple selections. The Page
step is optional, so reporting and non-Page operations remain available when
no Page is selected.

### Step 11: Verify the connection

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/OAuthStatus" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "credentialkey": "meta-ads"
  }'
```

Response:

```json
{
  "result": true,
  "connected": true,
  "accounts": [
    { "id": "123456789", "name": "My Ad Account" }
  ],
  "pagemappings": [
    {
      "adaccountid": "123456789",
      "adaccountname": "My Ad Account",
      "pageid": "111222333",
      "pagename": "My Facebook Page"
    }
  ],
  "pickersteps": {
    "pages": {
      "pickerkey": "pages",
      "optional": true,
      "configured": true,
      "groups": [
        {
          "parent": {
            "adaccountid": "123456789",
            "adaccountname": "My Ad Account"
          },
          "items": [
            { "pageid": "111222333", "pagename": "My Facebook Page" }
          ]
        }
      ]
    }
  },
  "connectedat": "2026-04-17T12:00:00.000Z",
  "tokenexpiresat": "",
  "errors": []
}
```

Field notes:

- OAuth mode requires `authmethod: "own"` and an access token. Direct mode
  requires `authmethod: "api_key"`, a validated `systemusertoken`, and a
  successful probe marker; it does not require App ID or App Secret. Both modes
  require at least one selected ad account before `connected` becomes `true`.
- `accounts[]` carries one entry per selected ad account (`id` = `adaccountid` without `act_` prefix, `name` = `adaccountname`). Empty `name` strings appear when no `adaccountname` was supplied in Step 10.
- `pickersteps.pages.groups[]` and `pagemappings[]` expose the saved Page
  selections without any access token.
- `tokenexpiresat` comes from Meta's OAuth token response. It is empty for the
  token-only System User mode because Wiro stores the supplied token unchanged.
  If an expiring System User token is used, the operator must replace it before
  Meta invalidates it.
- Meta User OAuth has no generic refresh-token contract. When a `wiro` or `own` User token expires or is invalidated, reconnect through the browser.

### Step 12: Start the agent if it's not running

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Start" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "guid": "your-useragent-guid" }'
```

Check `POST /UserAgent/Detail` first: if `setuprequired` is still `true`, some other credential the agent requires is missing — Start will refuse. See [Agent Credentials — Setup Required](/docs/agent-credentials#setup-required-state).

Agents already running when you connected Meta Ads restart automatically.

## How Meta Ads uses selected Pages

Meta Ads has no scalar/default `pageid`. Step 10b persists account-scoped
`pagemappings`, and the runtime exposes each selected ad account with its own
`pages[]` list.

- Zero Pages: only Page-backed creative creation is unavailable; reporting and
  other account operations continue.
- One Page under the target ad account: the agent uses it automatically.
- Multiple Pages: the agent requires an explicit Page ID/name in the request or
  asks the operator which Page to use. It never picks the first Page or borrows
  a Page from another ad account.

Before creating the creative, the skill verifies the chosen Page through Meta.
The connected person or System User must still have the required Page task and
the Page must be usable with the resolved ad account.

If you need organic posting (writing posts directly to a Facebook Page rather
than running ads), that's a separate integration — see the
[Facebook Page integration](/docs/integration-facebook-skills). The
`int-facebookpage-post` skill uses the `facebook-pages` credential group, not
`meta-ads`.

## API Reference

All endpoints require Wiro authentication — see [Authentication](/docs/authentication) for `x-api-key` + optional signature headers.

### POST /UserAgentOAuth/OAuthConnect

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Agent instance GUID. |
| `credentialkey` | string | Yes | `"meta-ads"`. |
| `redirecturl` | string | OAuth only | HTTPS URL (or `http://localhost` / `http://127.0.0.1` for dev) where users return after consent. Direct System User token validation does not use this field. |
| `authmethod` | string | No | `"api_key"` for the recommended System User token mode (registry default) or `"own"` for advanced customer-owned app OAuth. |

OAuth response: `{ result, authorizeUrl, errors }`. Direct System User token response: `{ result, accounts: [{id, name}], errors }` with no `authorizeUrl`. If `result: false`, inspect `errors[0].message` — common messages: `Missing useragentguid`, `Missing credentialkey`, `Missing redirecturl` (OAuth only), `Invalid redirect URL`, `User agent not found or unauthorized`, and `Meta Ads credentials not configured` (own mode without prior Update).

### GET /UserAgentOAuth/MetaAdsCallback

Server-side endpoint invoked by Meta. You don't call it — you only handle the final redirect back to your `redirecturl`. The callback path is per-provider — Meta Ads's stays `MetaAdsCallback`.

| Query param | Meaning |
|-------------|---------|
| `metaads_connected=true` | OAuth completed successfully. |
| `metaads_accounts` | URL-encoded JSON array of `{ id, name }` for active ad accounts. |
| `metaads_error=<code>` | OAuth failed. See [Troubleshooting](#troubleshooting). |

### POST /UserAgentOAuth/SetPickerAccounts

The same endpoint persists both picker stages.

Root ad-account selection:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Agent instance GUID. |
| `credentialkey` | string | Yes | `"meta-ads"`. |
| `accounts` | array | Yes | One or more `{ adaccountid, adaccountname }` entries. `adaccountid` must be without the `act_` prefix (prefix stripped automatically if sent); `adaccountname` is the display name shown in dashboards and `OAuthStatus` responses. |

Response: `{ result, accounts: [{id, name}, ...], errors }`. Triggers an automatic agent restart if the agent was running.

Chained Page selection, after `DiscoverPickerItems`:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Agent instance GUID. |
| `credentialkey` | string | Yes | `"meta-ads"`. |
| `pickerkey` | string | Yes | `"pages"`. |
| `selections` | array | Yes | One `{ parentvalue, items }` entry for every successful discovery group. `parentvalue` is the ad account ID; each item carries `pageid` and `pagename`. Empty `items` is allowed because Pages are optional. |

Response:
`{ result, pickerkey: "pages", pagemappings: [{adaccountid, adaccountname, pageid, pagename}], errors }`.

### POST /UserAgentOAuth/DiscoverPickerItems

Discovers eligible Facebook Pages grouped under the already-selected ad
accounts. This call must follow root ad-account `SetPickerAccounts`.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Agent instance GUID. |
| `credentialkey` | string | Yes | `"meta-ads"`. |
| `pickerkey` | string | Yes | `"pages"`. |

Response:
`{ result, pickerkey: "pages", groups: [{parent: {adaccountid, adaccountname}, items: [{pageid, pagename}], errorcode?}], errors }`.
Wiro keeps the active token server-side and caches only secret-free candidates
for five minutes. Call the chained `SetPickerAccounts` shape before they expire.

### POST /UserAgentOAuth/OAuthStatus

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Agent instance GUID. |
| `credentialkey` | string | Yes | `"meta-ads"`. |

Response fields:

| Field | Type | Description |
|-------|------|-------------|
| `connected` | boolean | `true` when the selected customer-owned mode has a validated credential and at least one selected ad account. **Note:** this reflects connection completion, not readiness of unrelated required credentials. Use `setupcomplete` from `POST /UserAgent/Detail` for whole-agent readiness. |
| `accounts` | array | One `{ id, name }` per selected ad account (`id` = `adaccountid` without `act_` prefix, `name` = `adaccountname`). |
| `pagemappings` | array | Flat, account-scoped Page mappings. Each entry contains `adaccountid`, optional `adaccountname`, `pageid`, and `pagename`. |
| `pickersteps.pages` | object | Grouped Page status for UI rendering: `{ pickerkey, optional, configured, groups[] }`. |
| `connectedat` | string | ISO timestamp of connection. |
| `tokenexpiresat` | string | ISO expiry for OAuth tokens. Empty for direct System User mode because Wiro stores the supplied token unchanged. |

### POST /UserAgentOAuth/OAuthDisconnect

Body: `{ useragentguid, credentialkey: "meta-ads" }`. Clears the active token,
probe marker, ad-account selection, and Page mappings. Customer-owned OAuth App
ID/App Secret values are preserved for reconnect; direct mode's
`systemusertoken` is cleared. This endpoint clears Wiro's copy, so
administrators should also revoke the app or token in Meta Business Settings
when immediate provider-side invalidation is required.

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/OAuthDisconnect" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "credentialkey": "meta-ads"
  }'
```

Response: `{ "result": true, "errors": [] }`. Running agents restart automatically.

### Token lifecycle

Wiro does not exchange or renew a direct System User token. Prefer **Never**
expiration when Meta offers it; otherwise generate a replacement and reconnect
before the token expires. User OAuth connections must be reconnected after Meta
expires or invalidates them. Raw tokens and App Secrets are never exposed to the
agent model.

## Using the Skill

Enable `int-metaads-manage` on the agent via `POST /UserAgent/SkillsApply` (see [Agent Skills → Toggling Integration Skills](/docs/agent-skills#toggling-integration-skills)). Adjust the cron of the built-in `cs-cron-performance-reporter` task (Meta Ads Manager) with `enabled` and `interval` only — the task body (`value`) is owned by the bundled integration skill and silently dropped on writes:

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

To change **what** the reporter includes (thresholds, reporting preferences, holiday markets), edit the paired preference skill `ad-strategy` instead — see [Agent Skills → Updating Preferences](/docs/agent-skills#updating-preference-skills).

## Troubleshooting

| Error code | Meaning | What to do |
|------------|---------|------------|
| `missing_params` | Callback was hit without `state` or `code`. | Don't hit the callback URL directly. Start a new flow from Step 8. |
| `session_expired` | More than 15 minutes elapsed between `OAuthConnect` and the consent return. | Call `OAuthConnect` again to refresh the state. |
| `authorization_denied` | User clicked Cancel, or Facebook returned `error=access_denied`. In Development Mode this also happens when the user isn't listed under App Roles. | Add the user as a Tester (Step 6), have them accept, retry. |
| `token_exchange_failed` | Facebook rejected the token exchange. Usually wrong App Secret, revoked app, or redirect URI mismatch. | Re-copy the App Secret from Settings → Basic, verify the redirect URI exactly matches, retry. |
| `useragent_not_found` | Wrong `useragentguid` or agent doesn't belong to your API key's user. | Fetch the correct guid with `POST /UserAgent/MyAgents`. |
| `Meta Ads credentials not configured` | Returned in `OAuthConnect`'s `errors[]` when `authmethod: "own"` but `appid` / `appsecret` are missing. | Call `POST /UserAgent/CredentialUpsert` to add `meta-ads.appid` and `meta-ads.appsecret`, then retry `OAuthConnect`. |
| `required_meta_scopes_missing` | `debug_token` did not report every scope required by the full management skill. | Grant the listed scopes to the app/token and reconnect. |
| `meta_app_mismatch` | The token was issued to a different Meta App ID. | Generate or authorize the token with the same app whose App ID and Secret were saved. |
| `meta_token_expired` | The OAuth token or its data-access window has expired. | Reconnect customer-owned OAuth. Direct mode does not use `debug_token`; replace a rejected/expired System User token in Business Settings. |
| `no_accounts` | No active account has both `ADVERTISE` and `ANALYZE` tasks. | Assign the connected principal those tasks on an active ad account in Business Settings, then reconnect. |
| `Picker candidates expired. Discover them again.` | More than five minutes elapsed after Page discovery, or the parent account connection changed. | Call `DiscoverPickerItems` again, then resubmit the Page selection. |
| `selections must include every available parent exactly once` | The Page selection omitted or duplicated a successful ad-account group. | Include one `selections[]` entry per successful `groups[]` entry; use `items: []` to select no Page for a parent. |
| `internal_error` | Unexpected server error during callback processing. | Retry once. If it persists, contact Wiro support with the timestamp and your `useragentguid`. |

### "App not verified" warning on consent

Facebook shows a yellow banner in Development Mode. This is expected and **not a blocker** — users listed under App Roles can click Continue and finish authorization. Users outside App Roles are hard-blocked.

### `connected: false` after completing OAuth

`OAuthStatus` returns `connected: true` only when the selected mode has a validated credential and at least one ad account was saved. If you skipped Step 10 (`SetPickerAccounts`), `connected` remains `false`. If account selection is complete but the status is still false, check the callback or direct-probe error and reconnect.

### Token keeps expiring

User OAuth and System User tokens do not have the same lifecycle:

- **User OAuth (`wiro` / `own`)** — reconnect through the browser after expiry or invalidation.
- **System User (`api_key`)** — choose **Never** expiration when Meta permits it. If Meta requires an expiring token, generate a replacement and reconnect before expiry. Wiro does not renew or exchange it.

## Multi-Tenant Architecture

For SaaS products connecting many customers' Meta Ads accounts through a single Wiro-powered backend:

1. **Recommended today:** use one System User token per customer-owned Business Portfolio when that operating model fits. Customer-owned OAuth remains available for interactive user authorization; Wiro-owned OAuth stays disabled until Advanced Access and rollout approval.
2. **One Wiro agent instance per customer.** Call `POST /UserAgent/Deploy` during onboarding, then complete the recommended direct steps or the advanced OAuth flow for that customer's `useragentguid`.
3. **Tokens are isolated per agent instance.** Customer A's Meta token is never visible to Customer B — they live under different `useragentguid` values.
4. **Consent branding follows the selected path.** Customer-owned OAuth shows the customer's app; the future simple path shows Wiro's reviewed app.
5. **Customer-owned Development Mode:** add each connecting user to that app's Roles. Multi-tenant use outside app roles requires the appropriate App Review/Advanced Access; do not treat Development Mode as production approval.
6. **Rate limits are per app, not per customer.** The Marketing API tier (Development → Standard → Advanced) governs aggregate call volume. See Meta's [Rate Limiting](https://developers.facebook.com/docs/graph-api/overview/rate-limiting) docs.

## Related

- [Agent Credentials & OAuth](/docs/agent-credentials) — integration catalog hub and generic OAuth reference.
- [Agent Overview](/docs/agent-overview) — deploying, starting, and lifecycle.
- [Agent Skills](/docs/agent-skills) — configuring `metaads-manage` and scheduled runs.
- [Google Ads integration](/docs/integration-googleads-skills) — for cross-platform paid campaigns.
