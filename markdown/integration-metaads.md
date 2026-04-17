# Meta Ads Integration

Connect your agents to Meta's advertising platform to manage campaigns, ad sets, creatives, and insights across Facebook and Instagram ads.

## Overview

The Meta Ads integration powers agents that work with the Meta Marketing API — creating and managing campaigns, pulling performance insights, managing creatives, and analyzing ad account data.

**Skills that use this integration:**

- `metaads-manage` — Campaign/ad set/creative management, insights reporting
- `ads-manager-common` — Shared ads helpers (used together with `metaads-manage` and `googleads-manage`)

**Agents that typically enable this integration:**

- Meta Ads Manager
- Any custom agent that needs paid-media capabilities on Meta

## Availability

| Mode | Status | Notes |
|------|--------|-------|
| `"wiro"` | Coming soon | Wiro's shared Meta App is under review by Meta. |
| `"own"` | Available now | You create your own Meta Developer App and connect it to Wiro. No App Review required when using Development Mode + App Roles. |

> **Why own mode only right now?** Meta's approval process for multi-tenant apps that request `ads_management` is long and strict. While our shared app is pending, you can skip this bottleneck entirely by using your own Meta Developer App in Development Mode — App Review is **not needed** as long as every user who connects is listed under your app's Roles.

## Prerequisites

Before you start, make sure you have:

- **A Wiro API key** — see [Authentication](/docs/authentication) for how to issue keys and sign requests.
- **A deployed agent** — see [Agent Overview](/docs/agent-overview) and call `POST /UserAgent/Deploy` first. You need the returned `useragentguid` for every step below.
- **A Meta Business account** — create one at [business.facebook.com](https://business.facebook.com/) if you do not already manage an ad account through Meta Business Suite.
- **A Meta Developer account** — same login as Facebook; visit [developers.facebook.com](https://developers.facebook.com/) once and accept the developer terms.
- **An HTTPS callback URL** that your backend controls (for example `https://your-app.com/settings/integrations`). `http://localhost` and `http://127.0.0.1` are accepted only for local development.

## Complete Integration Walkthrough

This is the end-to-end flow. All curl examples are real — they match the endpoints and payloads produced by Wiro in production.

### Step 1: Create a Meta Developer App

1. Go to [developers.facebook.com/apps](https://developers.facebook.com/apps) and click **Create app**.
2. Choose **"Other"** as the use case, then **"Business"** as the app type.
3. Set an **App display name** (your customers may see this on the consent screen — use your company or product name).
4. Enter an **App contact email**.
5. Select the **Meta Business Account** that owns the ad accounts you plan to manage, then click **Create app**.

You are now on the app dashboard. The app is in **Development Mode** by default — leave it there. Do not switch it to Live Mode; Development Mode is exactly what lets you skip App Review.

### Step 2: Add the Marketing API product

1. From the left sidebar of your app dashboard, click **Add product**.
2. Find **"Marketing API"** and click **Set up**.
3. No additional configuration is required inside Marketing API itself — just adding the product unlocks the `ads_*` permissions.

### Step 3: Add "Facebook Login for Business" and configure the redirect URI

Meta Ads OAuth uses Facebook Login under the hood. You must add Facebook Login for Business and register Wiro's callback URL.

1. Click **Add product** again.
2. Find **"Facebook Login for Business"** and click **Set up**.
3. In the left sidebar, go to **Facebook Login for Business → Settings**.
4. Scroll to **Valid OAuth Redirect URIs** and add:

   ```
   https://api.wiro.ai/v1/UserAgentOAuth/MetaAdsCallback
   ```

5. Click **Save changes** at the bottom of the page.

> This is the single most common place where own-mode setups fail. The redirect URI must be **exact** — no trailing slash, HTTPS scheme, same capitalization.

### Step 4: Note the required permissions

Wiro requests the following scopes during OAuth:

| Permission | Why it is needed |
|------------|------------------|
| `ads_management` | Create, update, and pause campaigns, ad sets, and ads. |
| `ads_read` | Read insights, performance metrics, and account metadata. |
| `business_management` | Query business assets (ad accounts, pages) linked to the user. |
| `pages_show_list` | List Facebook pages tied to the ad account (needed for creatives that reference a page). |
| `pages_read_engagement` | Read engagement on those pages when relevant to ads. |

These permissions normally require App Review in Live Mode. In Development Mode they work **without App Review** for any Facebook user who is listed under your app's Roles (see Step 6).

You do not need to request Advanced Access. Standard Access is sufficient for Development Mode users.

### Step 5: Copy your App ID and App Secret

1. In the app dashboard, go to **App settings → Basic**.
2. Copy the **App ID**.
3. Click **Show** next to **App Secret** and copy it. Treat this value like a password — never expose it client-side.

### Step 6: Add other Facebook accounts as Testers or Developers (only if needed)

- **If you are connecting your own Facebook account** (the one that created the app), skip this step. You are already the app Admin and can authorize immediately.
- **If your end users are different Facebook accounts** (typical for a SaaS product), each of them must be added to the app Roles before they can authorize in Development Mode.

To add a user:

1. Go to **App Roles → Roles** in the left sidebar.
2. Click **Add People** and enter the person's Facebook name or email.
3. Pick **Testers** (recommended) or **Developers** and send the invite.
4. The invited user accepts the invite at [facebook.com/settings → Business Integrations](https://www.facebook.com/settings?tab=business_tools). Once accepted, they can complete the OAuth flow against your app.

When App Review is eventually required (only if you decide to go Live Mode), this step becomes unnecessary — but for Development Mode it is mandatory for anyone who is not the app Admin.

### Step 7: Save your App ID and App Secret to Wiro

Push your credentials into the target agent's configuration. Wiro merges credential updates — fields you do not send are preserved, so OAuth tokens attached later will not be wiped.

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

Successful response (abbreviated):

```json
{
  "result": true,
  "useragents": [
    {
      "guid": "your-useragent-guid",
      "setuprequired": false,
      "status": 0
    }
  ],
  "errors": []
}
```

> The `_editable` flag on each credential field controls whether your update is accepted. For OAuth credentials (`appId`, `appSecret`, `authMethod`) these are editable by default. If you see a silent no-op, call `POST /UserAgent/Detail` and inspect `configuration.credentials.metaads._editable` — only fields marked `true` are writable.

### Step 8: Initiate OAuth

Ask Wiro to start a Meta OAuth flow on behalf of this agent. Include `authMethod: "own"` so Wiro uses the `appId`/`appSecret` you just saved instead of its own shared app.

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
  "authorizeUrl": "https://www.facebook.com/v25.0/dialog/oauth?client_id=...&redirect_uri=https%3A%2F%2Fapi.wiro.ai%2Fv1%2FUserAgentOAuth%2FMetaAdsCallback&state=...&scope=ads_management,ads_read,business_management,pages_show_list,pages_read_engagement",
  "errors": []
}
```

Redirect the end user's browser to `authorizeUrl`. Full-page redirect is recommended over a popup — some browsers block third-party cookies in popups, which can break OAuth sessions.

> **State TTL:** Wiro caches the OAuth state for **15 minutes**. If the user takes longer to complete consent, the flow returns `session_expired` and you must restart from this step.

### Step 9: Handle the callback

After the user consents on Facebook, Meta sends them back to Wiro's callback URL. Wiro exchanges the code for a long-lived token, fetches the user's ad accounts, writes tokens into the agent config, and finally redirects the user to **your** `redirectUrl` with query parameters.

**Success** — the URL looks like:

```
https://your-app.com/settings/integrations?metaads_connected=true&metaads_accounts=%5B%7B%22id%22%3A%22123456789%22%2C%22name%22%3A%22My%20Ad%20Account%22%7D%5D
```

`metaads_accounts` is a URL-encoded JSON array. Each element has `id` (with the `act_` prefix stripped) and `name`. Only ad accounts with `account_status === 1` (active) are included.

Parse it like this:

```javascript
const params = new URLSearchParams(window.location.search);

if (params.get("metaads_connected") === "true") {
  const accountsJson = params.get("metaads_accounts");
  const accounts = JSON.parse(decodeURIComponent(accountsJson || "[]"));
  // accounts === [{ id: "123456789", name: "My Ad Account" }, ...]
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

**Error** — redirected URL contains `metaads_error=<code>`. See [Troubleshooting](#troubleshooting) for each code and how to recover.

### Step 10: Persist the ad account selection

Wiro does not automatically pick an ad account for you — you must tell it which one to use. Call `MetaAdsSetAdAccount`:

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

Notes:

- Pass the ad account ID **without** the `act_` prefix. If you include it, Wiro strips it automatically.
- `adAccountName` is optional but recommended — it surfaces in the dashboard and logs.
- If the agent was already running, Wiro restarts it so the new ad account ID takes effect immediately. No additional Start call is needed.

### Step 11: Verify the connection

Confirm everything is wired up correctly:

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

`username` is the saved ad account name. `tokenExpiresAt` is the long-lived token expiry (~60 days from connection).

### Step 12: Start the agent if it is not running

If this agent was freshly deployed and has only just received its first credentials, it may still be in Stopped state (`status: 0`). Kick it off:

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Start" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "guid": "your-useragent-guid" }'
```

Check the `setuprequired` flag in `POST /UserAgent/Detail`: if it is still `true`, some other credential on this agent is missing and Start will refuse. See [Agent Credentials — Setup Required State](/docs/agent-credentials#setup-required-state).

Agents that were already running when you connected Meta Ads restart automatically — you do not need to call Start.

## API Reference

All endpoints under this section require the standard Wiro authentication headers (`x-api-key`, optionally `x-nonce` + `x-signature` when the project is in signature mode). See [Authentication](/docs/authentication).

### **POST** /UserAgentOAuth/MetaAdsConnect

Initiate the Meta Ads OAuth flow and receive a `authorizeUrl`.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userAgentGuid` | string | Yes | Agent instance GUID. |
| `redirectUrl` | string | Yes | HTTPS URL where the user is returned after consent. `http://localhost` / `http://127.0.0.1` are allowed in dev. |
| `authMethod` | string | No | `"wiro"` (default) or `"own"`. Use `"own"` while Wiro's shared app is pending. |

Response:

```json
{
  "result": true,
  "authorizeUrl": "https://www.facebook.com/v25.0/dialog/oauth?...",
  "errors": []
}
```

If `result: false`, inspect `errors[0].message` — common failures include `Missing userAgentGuid`, `Missing redirectUrl`, `Invalid redirect URL`, `User agent not found or unauthorized`, and `Meta Ads credentials not configured` (own mode without prior Update).

### **GET** /UserAgentOAuth/MetaAdsCallback

Server-side callback invoked by Facebook. You do not call this directly — you just need to know which query parameters Wiro appends to **your** `redirectUrl` after the callback completes.

| Param | Meaning |
|-------|---------|
| `metaads_connected=true` | OAuth finished successfully. |
| `metaads_accounts=<URL-encoded JSON>` | Array of `{ id, name }` for active ad accounts on the user. |
| `metaads_error=<code>` | OAuth failed. Codes listed in [Troubleshooting](#troubleshooting). |

### **POST** /UserAgentOAuth/MetaAdsSetAdAccount

Persist the ad account the agent should operate on.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userAgentGuid` | string | Yes | Agent instance GUID. |
| `adAccountId` | string | Yes | Ad account ID without the `act_` prefix. If included, the prefix is stripped server-side. |
| `adAccountName` | string | No | Display name shown in dashboards and logs. |

Response:

```json
{ "result": true, "errors": [] }
```

### **POST** /UserAgentOAuth/MetaAdsStatus

Check the current Meta Ads connection state for an agent.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userAgentGuid` | string | Yes | Agent instance GUID. |

Response fields:

| Field | Description |
|-------|-------------|
| `connected` | `true` once credentials and an ad account are both set. |
| `username` | The selected ad account name. |
| `connectedAt` | ISO timestamp of connection. |
| `tokenExpiresAt` | Long-lived token expiry (~60 days from connection). |

### **POST** /UserAgentOAuth/MetaAdsDisconnect

Revoke and clear Meta Ads credentials for the agent. The agent restarts automatically if it was running.

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/MetaAdsDisconnect" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "userAgentGuid": "your-useragent-guid" }'
```

Response: `{ "result": true, "errors": [] }`

### **POST** /UserAgentOAuth/TokenRefresh

Force-refresh the Meta long-lived token. Wiro auto-refreshes before expiry, so you typically do not need to call this manually. Use it if your agent has been idle for weeks and you want to warm up the token before a burst of API calls.

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/TokenRefresh" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "userAgentGuid": "your-useragent-guid",
    "provider": "metaads"
  }'
```

Response:

```json
{
  "result": true,
  "accessToken": "EAAG...",
  "errors": []
}
```

## Using the Skill

Once credentials are connected and the ad account is set, Meta Ads capabilities are exposed through the `metaads-manage` skill inside the agent runtime. To enable it or configure scheduled runs (for example a daily performance report), see [Agent Skills](/docs/agent-skills#enabling-skills) and use `POST /UserAgent/Update` with the `custom_skills` array.

Typical skills configuration block:

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

Every OAuth failure redirects to your `redirectUrl` with a `metaads_error=<code>` query parameter. Use this table to diagnose and recover.

| Error code | Meaning | What to do |
|------------|---------|------------|
| `missing_params` | The callback was hit without a `state` or `code`. | Do not hit the callback URL directly. Start a new OAuth flow from Step 8. |
| `session_expired` | More than 15 minutes passed between `MetaAdsConnect` and the consent screen callback. | Call `MetaAdsConnect` again to issue a fresh state. |
| `authorization_denied` | The user clicked **Cancel** on the consent screen, or Facebook returned an `error=access_denied`. In Development Mode this also happens when the user is not listed under App Roles. | Add the user as a Tester under App Roles (Step 6), ask them to accept the invite, then retry. |
| `token_exchange_failed` | Facebook rejected the token exchange. Usually a wrong `App Secret`, a revoked app, or a mismatch between the redirect URI in your code and the one registered in Facebook Login for Business → Settings. | Re-copy the App Secret from Settings → Basic, double-check the redirect URI string, and retry. |
| `useragent_not_found` | The `userAgentGuid` in `MetaAdsConnect` was wrong or does not belong to the API key's user. | Fetch the correct guid with `POST /UserAgent/MyAgents`. |
| `invalid_config` | The agent has no `credentials.metaads` block at all. | Call `POST /UserAgent/Update` to add at least `metaads.appId` and `metaads.appSecret`, then retry `MetaAdsConnect`. |
| `internal_error` | Unexpected server error during callback handling. | Retry once. If it persists, contact Wiro support with the timestamp and your `userAgentGuid`. |

### "App not verified" warning on consent

In Development Mode, Facebook shows a yellow "This app is not approved by Facebook yet" banner on the consent screen. This is expected and **not** a blocker — users listed under App Roles can still click **Continue** and finish authorization. Users who are not in App Roles will see a hard block and cannot proceed.

### Credentials were saved but `Status` returns `connected: false`

`connected: true` requires both a saved OAuth token **and** a selected ad account. If you skipped Step 10 (`MetaAdsSetAdAccount`), the Status endpoint will report `connected: false` until you pick an account.

### Token keeps expiring

Long-lived Meta tokens last ~60 days. Wiro auto-refreshes them before they expire, so you rarely need to intervene. If you do see `tokenExpiresAt` in the past, call `POST /UserAgentOAuth/TokenRefresh` with `provider: "metaads"` to force a refresh. If that fails, the user must redo the OAuth flow (Step 8 onwards).

## Multi-Tenant Architecture

If you are building a SaaS product where many of your customers each connect their own Meta Ads account through **your** Wiro-powered backend, here is the recommended shape:

1. **One Meta Developer App** per Wiro-integrating product, not per customer. The same `appId`/`appSecret` pair can serve unlimited customers.
2. **One Wiro agent instance per customer.** Call `POST /UserAgent/Deploy` every time a new customer signs up, then follow Steps 7–11 of the walkthrough above for that customer's `userAgentGuid`.
3. **Wiro tokens are isolated per agent instance.** Customer A's Meta token is never visible to Customer B — they live under different `useragentguid`s.
4. **Your consent screen carries your branding.** Users see *your* App display name on Facebook's consent screen, not "Wiro". Keep the display name clean and trustworthy — Meta occasionally flags apps with generic names.
5. **Add each customer to App Roles → Testers** until you go Live Mode. This is a manual step today; automate it by having customers submit their Facebook user ID during onboarding and adding them via the Meta Business API or Roles UI.
6. **Rate limits are per app, not per customer.** The Marketing API's tier (Development vs Standard vs Advanced) governs aggregate call volume. High-volume partners should plan for tier upgrades; see Meta's [Rate Limiting](https://developers.facebook.com/docs/graph-api/overview/rate-limiting) docs.

## Related

- [Agent Credentials & OAuth](/docs/agent-credentials) — overview of all integration options.
- [Agent Overview](/docs/agent-overview) — deploying, starting, and lifecycle of agents.
- [Agent Skills](/docs/agent-skills) — configuring the `metaads-manage` skill and scheduled runs.
- [Facebook Page integration](/docs/integration-facebook) — often used alongside Meta Ads for creatives that reference a page.
- [Instagram integration](/docs/integration-instagram) — for Instagram-placement ads and organic posting.
- [Meta for Developers — Marketing API](https://developers.facebook.com/docs/marketing-apis/) — official reference.
