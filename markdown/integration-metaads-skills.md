# Meta Ads Integration

Connect your agent to Meta's advertising platform to manage campaigns, ad sets, creatives, and performance insights across Facebook and Instagram ads.

## Overview

The Meta Ads integration powers the `metaads-manage` skill — creating and managing campaigns, pulling insights, managing creatives, and analyzing ad account data via the Meta Marketing API.

**Skills that use this integration:**

- `metaads-manage` — Campaign / ad set / creative CRUD, insights reporting, Marketing API operations
- `ads-manager-common` — Shared ads helpers (works alongside `metaads-manage` and `googleads-manage`)

**Agents that typically enable this integration:**

- Meta Ads Manager
- Any custom agent that needs paid-media capabilities on Meta

## Availability

| Mode | Status | Notes |
|------|--------|-------|
| `"wiro"` | Coming soon | Wiro's shared Meta App is under review by Meta. |
| `"own"` | Available now | You create your own Meta Developer App and connect it to Wiro. No App Review required when Development Mode + App Roles is used. |

> **Why own mode only right now?** Meta's approval process for multi-tenant apps that request `ads_management` is long and strict. While our shared app is pending, you can skip the review bottleneck entirely by using your own Meta Developer App in Development Mode — App Review is not needed as long as every user who connects is listed under your app's Roles as Tester or Developer.

## Prerequisites

- **A Wiro API key** — see [Authentication](/docs/authentication) for how to issue keys and sign requests.
- **A deployed agent** — see [Agent Overview](/docs/agent-overview) and call `POST /UserAgent/Deploy` first. You need the returned `useragents[0].guid` for every step below.
- **A Meta Business account** — [business.facebook.com](https://business.facebook.com/).
- **A Meta Developer account** — [developers.facebook.com](https://developers.facebook.com/).
- **An HTTPS callback URL** that your backend controls. `http://localhost` and `http://127.0.0.1` are accepted for local development only.

## Complete Integration Walkthrough

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

Wiro requests these exact scopes during OAuth (verified against `api-useragent-oauth.js` L2204–L2208):

```
ads_management,ads_read,business_management,pages_show_list,pages_read_engagement
```

| Permission | Why Wiro requests it |
|------------|----------------------|
| `ads_management` | Create, update, and pause campaigns, ad sets, and ads. |
| `ads_read` | Read insights, performance metrics, and account metadata. |
| `business_management` | Enumerate ad accounts and pages the user has access to under their Business Manager. |
| `pages_show_list` | Resolve the first administered Facebook Page so its ID can be attached to ad creatives (see [How Meta Ads uses `pageId`](#how-meta-ads-uses-pageid)). |
| `pages_read_engagement` | Read page-level engagement metrics that some creative types reference. |

These permissions normally require App Review for Live Mode. In Development Mode they work **without App Review** for any Facebook user listed under your app's Roles. You don't need to request Advanced Access.

### Step 5: Copy your App ID and App Secret

**App settings → Basic** → copy the **App ID**, click **Show** next to **App Secret** and copy that too.

### Step 6: Add the users who will connect as Testers (only if they're not you)

- Connecting your own Facebook account? You're already the app Admin; skip this step.
- Connecting a different Facebook account (typical for SaaS customers)? Go to **App Roles → Roles → Add People** and invite them as **Testers** or **Developers**. They accept at [facebook.com/settings → Business Integrations](https://www.facebook.com/settings?tab=business_tools).

Users not listed in App Roles will be blocked at the consent screen in Development Mode.

### Step 7: Save your Meta App credentials to Wiro

Push the `appId` and `appSecret` into the agent's `metaads` credential group. Wiro merges credential updates per group — fields you don't send are preserved, and credentials from other groups are untouched.

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Update" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "guid": "your-useragent-guid",
    "configuration": {
      "credentials": {
        "metaads": {
          "appId": "YOUR_META_APP_ID",
          "appSecret": "YOUR_META_APP_SECRET"
        }
      }
    }
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

> **Only `_editable: true` fields are accepted.** `appId` and `appSecret` are editable by default in the `metaads` template. Attempts to set non-editable fields are silently ignored. Call `POST /UserAgent/Detail` and inspect `configuration.credentials.metaads._editable` if you see a silent no-op.

### Step 8: Initiate OAuth

Start the flow. Include `authMethod: "own"` so Wiro uses your `appId`/`appSecret` instead of its own shared app.

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/MetaAdsConnect" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "userAgentGuid": "your-useragent-guid",
    "redirectUrl": "https://your-app.com/settings/integrations",
    "authMethod": "own"
  }'
```

Response:

```json
{
  "result": true,
  "authorizeUrl": "https://www.facebook.com/v25.0/dialog/oauth?client_id=...&redirect_uri=https%3A%2F%2Fapi.wiro.ai%2Fv1%2FUserAgentOAuth%2FMetaAdsCallback&state=...&scope=ads_management%2Cads_read%2Cbusiness_management%2Cpages_show_list%2Cpages_read_engagement",
  "errors": []
}
```

Redirect the user's browser to `authorizeUrl`. Full-page redirect is recommended over a popup — some browsers block third-party cookies in popups, breaking the OAuth session.

> **State TTL:** Wiro caches the OAuth state for **15 minutes**. If the user takes longer to complete consent, the callback returns `metaads_error=session_expired` and you must restart from this step.

### Step 9: Handle the callback

After the user consents, Meta sends them back to Wiro's callback URL. Wiro exchanges the code for a long-lived token, fetches the user's active ad accounts, writes the access token into the agent's config, and redirects the user to **your** `redirectUrl` with query parameters.

**Success URL** looks like:

```
https://your-app.com/settings/integrations?metaads_connected=true&metaads_accounts=%5B%7B%22id%22%3A%22123456789%22%2C%22name%22%3A%22My%20Ad%20Account%22%7D%5D
```

- `metaads_accounts` is `encodeURIComponent(JSON.stringify([...]))`.
- Each array element: `{ id, name }`.
- The `id` has the `act_` prefix stripped by Wiro.
- Only ad accounts with `account_status === 1` (active) are included.

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

Wiro doesn't automatically pick an ad account — you must tell it which one to use. This is **required** for the agent to function.

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/MetaAdsSetAdAccount" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "userAgentGuid": "your-useragent-guid",
    "adAccountId": "123456789",
    "adAccountName": "My Ad Account"
  }'
```

Response:

```json
{
  "result": true,
  "errors": []
}
```

Behavior:

- Pass the ad account ID **without** the `act_` prefix. If you include it, Wiro strips it automatically.
- `adAccountName` is optional but recommended — it surfaces in `Status` responses and dashboards as `username`.
- If the agent was running (status `3` or `4`), Wiro marks it `status: 1` with `restartafter: true` so the daemon picks up the new ad account after the next stop cycle. No manual Start needed.

### Step 11: Verify the connection

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/MetaAdsStatus" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "userAgentGuid": "your-useragent-guid" }'
```

Response:

```json
{
  "result": true,
  "connected": true,
  "username": "My Ad Account",
  "connectedAt": "2026-04-17T12:00:00.000Z",
  "tokenExpiresAt": "2026-06-16T12:00:00.000Z",
  "errors": []
}
```

Field notes:

- `connected: true` requires both an `accessToken` and `authMethod` (`"wiro"` or `"own"`).
- `username` = the saved `adAccountName` (empty string if you didn't pass one in Step 10).
- `tokenExpiresAt` = 60 days from the connect moment (Meta's long-lived user token lifetime).
- **No `refreshTokenExpiresAt`** — Meta user tokens don't have refresh tokens; renewal uses `fb_exchange_token` with the long-lived token itself.

### Step 12: Start the agent if it's not running

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Start" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "guid": "your-useragent-guid" }'
```

Check `POST /UserAgent/Detail` first: if `setuprequired` is still `true`, some other credential the agent requires is missing — Start will refuse. See [Agent Credentials — Setup Required](/docs/agent-credentials#setup-required-state).

Agents already running when you connected Meta Ads restart automatically.

## How Meta Ads uses `pageId`

During Step 9 (the callback), Wiro silently calls Meta's Graph API `GET /me/accounts?fields=id,name&limit=5` and stores the **first returned page ID** as `credentials.metaads.pageId`. This is **not** the Facebook Page integration — it's a Marketing-API-only field used internally by the `metaads-manage` skill when creating creatives that need `object_story_spec.page_id` (for example, when boosting a page post).

If your agent needs a specific page for creatives and the user administers multiple pages, the first one won't always be what they want. In that case, update `metaads.pageId` manually via `POST /UserAgent/Update` after the OAuth flow completes.

If you need organic posting (writing posts directly to a Facebook Page rather than running ads), that's a separate integration — see the [Facebook Page integration](/docs/integration-facebook-skills). The `facebookpage-post` skill lives under the `facebook` credential group, not `metaads`.

## API Reference

All endpoints require Wiro authentication — see [Authentication](/docs/authentication) for `x-api-key` + optional signature headers.

### POST /UserAgentOAuth/MetaAdsConnect

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userAgentGuid` | string | Yes | Agent instance GUID. |
| `redirectUrl` | string | Yes | HTTPS URL (or `http://localhost` / `http://127.0.0.1` for dev) where users return after consent. |
| `authMethod` | string | No | `"wiro"` (default) or `"own"`. Use `"own"` while the shared app is pending. |

Response: `{ result, authorizeUrl, errors }`. If `result: false`, inspect `errors[0].message` — common messages: `Missing userAgentGuid`, `Missing redirectUrl`, `Invalid redirect URL`, `User agent not found or unauthorized`, `Meta Ads credentials not configured` (own mode without prior Update).

### GET /UserAgentOAuth/MetaAdsCallback

Server-side endpoint invoked by Meta. You don't call it — you only handle the final redirect back to your `redirectUrl`:

| Query param | Meaning |
|-------------|---------|
| `metaads_connected=true` | OAuth completed successfully. |
| `metaads_accounts` | URL-encoded JSON array of `{ id, name }` for active ad accounts. |
| `metaads_error=<code>` | OAuth failed. See [Troubleshooting](#troubleshooting). |

### POST /UserAgentOAuth/MetaAdsSetAdAccount

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userAgentGuid` | string | Yes | Agent instance GUID. |
| `adAccountId` | string | Yes | Ad account ID without the `act_` prefix (prefix stripped automatically if sent). |
| `adAccountName` | string | No | Display name shown in dashboards and `Status` responses. |

Response: `{ result: true, errors: [] }` on success. Triggers an automatic agent restart if the agent was running.

### POST /UserAgentOAuth/MetaAdsStatus

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userAgentGuid` | string | Yes | Agent instance GUID. |

Response fields:

| Field | Type | Description |
|-------|------|-------------|
| `connected` | boolean | `true` when `accessToken` is set and `authMethod` is `"wiro"` or `"own"`. **Note:** this reflects **OAuth completion**, not full setup readiness — `adAccountId` is not required for `connected: true`. Use `setupcomplete` (from `POST /UserAgent/Detail`) or check `configuration.credentials.metaads.adAccountId` for end-to-end readiness to create campaigns. |
| `username` | string | The saved `adAccountName`. |
| `connectedAt` | string | ISO timestamp of connection. |
| `tokenExpiresAt` | string | ISO timestamp (~60 days from connection). |

### POST /UserAgentOAuth/MetaAdsDisconnect

Clears Meta Ads credentials (no remote revoke — Facebook's Graph API doesn't have a straightforward revoke for long-lived tokens).

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/MetaAdsDisconnect" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "userAgentGuid": "your-useragent-guid" }'
```

Response: `{ "result": true, "errors": [] }`. Running agents restart automatically.

### POST /UserAgentOAuth/TokenRefresh

> **You don't normally need to call this.** Running agents refresh their Meta Ads token automatically via `fb_exchange_token` on a daily maintenance cron. Use this endpoint only for debugging or forcing a new token immediately.

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/TokenRefresh" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "userAgentGuid": "your-useragent-guid",
    "provider": "metaads"
  }'
```

Response: `{ result: true, accessToken: "...", refreshToken: "", errors: [] }`. See [Automatic token refresh](/docs/agent-credentials#automatic-token-refresh) for the full cron schedule.

## Using the Skill

Enable `metaads-manage` on the agent — see [Agent Skills](/docs/agent-skills#enabling-skills). Example scheduled run:

```json
{
  "guid": "your-useragent-guid",
  "configuration": {
    "custom_skills": [
      {
        "key": "performance-reporter",
        "enabled": true,
        "interval": "0 9 * * *",
        "value": "Summarize yesterday's spend and CPA by campaign"
      }
    ]
  }
}
```

## Troubleshooting

| Error code | Meaning | What to do |
|------------|---------|------------|
| `missing_params` | Callback was hit without `state` or `code`. | Don't hit the callback URL directly. Start a new flow from Step 8. |
| `session_expired` | More than 15 minutes elapsed between `MetaAdsConnect` and the consent return. | Call `MetaAdsConnect` again to refresh the state. |
| `authorization_denied` | User clicked Cancel, or Facebook returned `error=access_denied`. In Development Mode this also happens when the user isn't listed under App Roles. | Add the user as a Tester (Step 6), have them accept, retry. |
| `token_exchange_failed` | Facebook rejected the token exchange. Usually wrong App Secret, revoked app, or redirect URI mismatch. | Re-copy the App Secret from Settings → Basic, verify the redirect URI exactly matches, retry. |
| `useragent_not_found` | Wrong `userAgentGuid` or agent doesn't belong to your API key's user. | Fetch the correct guid with `POST /UserAgent/MyAgents`. |
| `invalid_config` | The agent has no `credentials.metaads` block at all. | Call `POST /UserAgent/Update` to add `metaads.appId` and `metaads.appSecret`, then retry `MetaAdsConnect`. |
| `internal_error` | Unexpected server error during callback processing. | Retry once. If it persists, contact Wiro support with the timestamp and your `userAgentGuid`. |

### "App not verified" warning on consent

Facebook shows a yellow banner in Development Mode. This is expected and **not a blocker** — users listed under App Roles can click Continue and finish authorization. Users outside App Roles are hard-blocked.

### `connected: false` after completing OAuth

`Status` returns `connected: true` only when **both** an access token is saved and an `authMethod` is set. If you skipped Step 10 (`MetaAdsSetAdAccount`), the ad account is empty but `connected` is still `true` as long as the token is present. If you see `connected: false`, the token didn't save — check for error parameters in the callback URL or retry OAuth.

### Token keeps expiring

Long-lived Meta tokens last ~60 days. The agent's daily maintenance cron refreshes them automatically via `fb_exchange_token`. If you see `tokenExpiresAt` in the past and the agent is running, the refresh cron either failed or hasn't run yet — check agent logs. If you can't wait, force a refresh manually with `POST /UserAgentOAuth/TokenRefresh`. If that also fails (typically a 190-series Graph error), the user must redo OAuth from Step 8.

## Multi-Tenant Architecture

For SaaS products connecting many customers' Meta Ads accounts through a single Wiro-powered backend:

1. **One Meta Developer App** per product, not per customer. The same `appId`/`appSecret` pair serves unlimited customers.
2. **One Wiro agent instance per customer.** Call `POST /UserAgent/Deploy` during onboarding and follow Steps 7–11 per customer's `userAgentGuid`.
3. **Tokens are isolated per agent instance.** Customer A's Meta token is never visible to Customer B — they live under different `useragentguid` values.
4. **Your consent screen carries your branding.** Users see *your* app display name, not "Wiro". Keep the display name clean and trustworthy; Meta occasionally flags apps with generic names.
5. **Add each customer to App Roles → Testers** until you go Live Mode. Collect their Facebook user ID during onboarding and add them via the Meta Business API or Roles UI.
6. **Rate limits are per app, not per customer.** The Marketing API tier (Development → Standard → Advanced) governs aggregate call volume. See Meta's [Rate Limiting](https://developers.facebook.com/docs/graph-api/overview/rate-limiting) docs.

## Related

- [Agent Credentials & OAuth](/docs/agent-credentials) — integration catalog hub and generic OAuth reference.
- [Agent Overview](/docs/agent-overview) — deploying, starting, and lifecycle.
- [Agent Skills](/docs/agent-skills) — configuring `metaads-manage` and scheduled runs.
- [Google Ads integration](/docs/integration-googleads-skills) — for cross-platform paid campaigns.
- [Meta for Developers — Marketing API](https://developers.facebook.com/docs/marketing-apis/)
