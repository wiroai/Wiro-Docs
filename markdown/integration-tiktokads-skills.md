# TikTok Ads Integration

Connect your agent to TikTok's advertising platform to report on and manage campaigns, ad groups, ads, audiences, and creatives through TikTok's official TikTok for Business MCP server.

## Overview

The TikTok Ads integration powers the `int-tiktok-ads` skill (TikTok Ads Manager). The agent works through TikTok's official **TikTok for Business MCP server** (Model Context Protocol), which exposes TikTok API for Business v1.3 capabilities as tools: reporting, campaign / ad group / ad management, Upgraded Smart+, audiences, creatives, Spark Ads, and TikTok's own diagnosis tools.

This integration covers **advertising only**. It does not post organic videos to a TikTok profile — that is the separate [TikTok integration](/docs/integration-tiktok-skills), which uses its own `tiktok` credential.

**Skills that use this integration:**

- `int-tiktok-ads` — Reporting, campaign / ad group / ad management, Upgraded Smart+ and GMV Max, audiences, creatives, Spark Ads, and diagnosis
- `util-ads-manager-common` and `util-ads-playbook` — Shared ads helpers (approval flow, recommendations queue, daily report template, kill / scale / test playbook), also used by the Meta Ads and Google Ads skills

**Agents that typically enable this integration:**

- TikTok Ads Manager (prebuilt; `int-tiktok-ads` is on by default)
- Any Custom Build agent that needs paid-media capabilities on TikTok

## Availability

| Mode | Status | Notes |
|------|--------|-------|
| `"wiro"` | Available — the only mode | One-click connect through Wiro's TikTok for Business app. You don't create a developer app, request an API key, or go through app review. |
| Customer-owned app or pasted token | Not offered | TikTok Ads has no `"own"` or `"api_key"` mode. `OAuthConnect` rejects any other `authmethod` with `Unsupported connection mode for TikTok Ads`. |

> **Authorization lasts 30 days.** TikTok ends every TikTok for Business authorization 30 days after it is granted, and refreshing the access token does not extend it. Reconnect with the same TikTok for Business account to renew it — see "The 30-day authorization" below.

## Prerequisites

- **A TikTok for Business account with access to at least one advertiser** (ad account) — for example through TikTok Ads Manager or membership in a Business Center. For the agent to make changes, not just report, that account needs a role on the advertiser that allows campaign management.
- **An agent with `int-tiktok-ads` enabled** — TikTok Ads Manager has it on by default. On a Custom Build agent, enable it with `POST /UserAgent/SkillsApply` (see "Using the Skill" below). Skill changes are only available on Custom Build agents.
- **For API integrations only:** a Wiro API key ([Authentication](/docs/authentication)), a deployed agent ([Agent Overview](/docs/agent-overview)) and its `useragentguid`, and an HTTPS return URL that your backend controls. `http://localhost` and `http://127.0.0.1` are accepted for local development only.

## Connect in the Wiro dashboard

1. Open your agent, go to **Credentials**, and find the **TikTok Ads** card.
2. Click **Connect TikTok for Business**.
3. Sign in to TikTok for Business and approve the consent screen. It names the app **Wiro AI** and asks for the `mcp:tt4b` permission scope.
4. Back in Wiro, pick the advertisers the agent may manage. You can select several; when your account has exactly one advertiser, it is selected for you.
5. Wiro saves the selection and restarts the agent if it was running, so the agent picks up the new connection.

## The 30-day authorization

- TikTok ends every TikTok for Business authorization **30 days** after it is granted. Refreshing the access token does not extend it; this is TikTok's rule, not a Wiro setting.
- To renew, reconnect with the same TikTok for Business account: click **Disconnect** on the TikTok Ads card, then **Connect TikTok for Business** again and confirm the advertisers. A different TikTok for Business account may see different advertisers.
- From 7 days before the end, the daily performance report opens its Risk Flags & Account Health section with the end date and a reconnect reminder. When you chat with the agent in that window, it mentions the end date once at the top of its reply.
- After the authorization ends, the daily performance report sends a one-line notice that TikTok Ads reporting stopped and asks you to reconnect. The other TikTok Ads scheduled tasks stay quiet until you reconnect.
- Expiry does not pause your ads. Campaigns keep delivering in TikTok; only the agent loses access.
- The short-lived access tokens (about 24 hours) are renewed by Wiro automatically. You never see or handle a TikTok token.

## Advertiser selection

- The agent works only on the advertisers you selected when you connected. Any request for another advertiser is refused.
- To change the selection, click **Disconnect** on the TikTok Ads card, then connect again and pick the advertisers you want.
- Until at least one advertiser is selected, an agent that requires TikTok Ads (such as TikTok Ads Manager) stays in Setup Required and cannot start.

## What the agent can do

| Area | What the agent does |
|------|---------------------|
| Reporting | Account, campaign, ad group, and ad metrics (spend, impressions, clicks, CTR, CPC, CPM, conversions, cost per conversion, ROAS, video views and watch time); age, gender, and country breakdowns; placement (TikTok, Pangle, Global App Bundle) and device platform breakdowns; asynchronous reports for long date ranges; Upgraded Smart+ creative reports; GMV Max reports. |
| Campaign management | Create and update campaigns, ad groups, and ads; pause, enable, or delete them; change budgets and schedules; copy campaigns; run split tests; set up automated rules; manage search negative keywords. |
| Upgraded Smart+ and GMV Max | Create, update, and change the status of Upgraded Smart+ campaigns. Update and report on existing GMV Max campaigns. |
| Audiences | Custom and lookalike audiences, saved audiences, audience size estimates, and audience insights. |
| Creatives | Upload images and videos by URL, choose music, generate creatives with Wiro AI models (when the Wiro AI Models skill is set up), check creative fatigue, run video fix tasks, and preview ads. |
| Spark Ads | Promote posts from your own TikTok account linked to the advertiser, or authorize a creator's post with the Spark Ads code the creator sends you. |
| Placement control | Pangle block lists and inventory filters. |
| Diagnosis | TikTok's own diagnosis tools for delivery and performance issues (no spend, low spend, high CPA, creative fatigue). |
| Ad comments | Reply to or hide comments on ads, and manage blocked words. |

## What the agent cannot do

These operations are not available through this integration, by design. When you ask for one, the agent tells you it is not available instead of trying another way.

- **Business Center administration.**
- **Billing, payments, balances, invoices, or fund transfers.** TikTok charges ad spend to the advertiser's own payment method; handle billing in TikTok Ads Manager.
- **Downloading lead data.** Lead generation campaigns can be reported on (cost per lead) and paused.
- **TikTok One (Creator Marketplace).**
- **Catalogs.**
- **Pixel and event configuration.**
- **Reach & Frequency purchases.**
- **Creating GMV Max campaigns.** TikTok starts them delivering as soon as they are created, so create them in TikTok Ads Manager; the agent can then report on them and apply approved updates.
- **Customer-file audiences.** They need an audience file upload; create them in TikTok Ads Manager.
- **Organic posting to a TikTok profile.** Use the [TikTok integration](/docs/integration-tiktok-skills).

## Safety and approvals

- **Every change goes through the agent's approval policy** (the `approval-policy` custom skill). By default the agent describes the change (object, IDs, old and new value, reason) and waits for your approval. Reads — reports, lookups, previews — never need approval.
- **New objects start paused.** Campaigns, ad groups, ads, Upgraded Smart+ campaigns, and campaign copies are always created paused. Turning one on is a separate change that needs its own approval.
- **Deletes happen only when you ask.** Campaigns, ad groups, ads, audiences, creative assets, blocked words, ad comments, and search negative keywords can be deleted on request, after approval. Deleting cannot be undone. The agent never deletes on its own; when it recommends stopping something, it pauses it.
- **Rejected changes are not retried.** If TikTok rejects a change, the agent reports TikTok's message and request ID and stops.
- **Scheduled tasks only read from TikTok.** They put proposed changes into the recommendations queue; a change runs only after you approve it in chat (for example `apply 1`).
- **Budgets are in the advertiser's currency, not cents.** The agent confirms the currency before changing a budget and states it in the approval request. TikTok requires a new budget to be at least 105% of what has already been spent and does not accept budget changes between 23:55 and 00:00 advertiser time.
- **Rate limits.** TikTok allows most tools 3 requests per second per tool for each TikTok for Business user; a few, such as asynchronous report creation and campaign copies, have lower limits per app. When TikTok rate-limits a report or lookup, the agent backs off and retries; a rate-limited change is reported and not retried.
- **No secrets in chat.** The agent never asks for a TikTok password or token. The only code you paste is a Spark Ads authorization code.

## Scheduled tasks

TikTok Ads Manager ships with these scheduled tasks. Times use the agent's time zone.

| Task | Skill key | Default schedule | What it does |
|------|-----------|------------------|--------------|
| Daily performance report | `cron-tiktokads-performance-reporter` | `0 9 * * *` (daily 09:00) | Account, campaign, placement, device, country, and ad-level performance for the last 7 days, anomaly checks, and recommendations. Carries the 30-day reconnect reminder and the expiry notice. |
| Weekly audience & account health scan | `cron-tiktokads-audience-scanner` | `0 10 * * 1` (Mondays 10:00) | Age, gender, and placement breakdowns, creative health, custom audience status, rejected or stuck ads, audience fatigue, and new targeting ideas. |
| Drive creative scanner | `cron-tiktokads-drive-scanner` | `0 10 * * *` (daily 10:00) | Looks for new creative folders in Google Drive and proposes TikTok campaigns for them. Runs daily; does nothing until Google Drive is connected and has creative folders. |
| Holiday campaign planner | `cron-tiktokads-holiday-planner` | `0 10 * * 3` (Wednesdays 10:00) | Scans upcoming holidays from the holiday calendar (Calendarific) and suggests seasonal campaigns. Does nothing until Calendarific is connected. |

Shared ads tasks also cover TikTok Ads: the nightly `cron-ads-recommendation-cleanup` expires stale recommendations, and the optional Adjust creative ROAS report (`cron-adjust-creative-roas-reporter`) cross-checks TikTok spend when Adjust is connected.

To change **what** the tasks look for, edit these custom skills (stored as `cs-<key>`) rather than the tasks:

- `tiktok-ads-strategy` — TikTok-specific knobs: tracking quality gates, kill thresholds, placement strategy, Spark Ads and Smart+ rules.
- `ad-strategy` — cross-platform KPI thresholds, shared with Meta Ads and Google Ads.
- `approval-policy` — which changes wait for approval.

## Multiple advertisers

- Scheduled tasks run once per selected advertiser. Each report is headed with the advertiser's name and ID and uses that advertiser's currency and time zone.
- In chat, name the advertiser when more than one is selected; otherwise the agent asks which one to use. A single request or change never mixes advertisers.
- The 30-day reminder appears in each advertiser's daily report; the expiry notice is sent once for the whole connection.

## Connect through the API

Use this flow when you build your own settings screen on top of Wiro agents. Every request is authenticated as described in [Authentication](/docs/authentication).

### Step 1: Start the connection

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/OAuthConnect" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "credentialkey": "tiktok-ads",
    "redirecturl": "https://your-app.com/settings/integrations"
  }'
```

Response:

```json
{
  "result": true,
  "errors": [],
  "authorizeUrl": "https://business-api.tiktok.com/portal/mcp-tt4b-authorize?client_id=...&redirect_uri=https%3A%2F%2Fapi.wiro.ai%2Fv1%2FUserAgentOAuth%2FTikTokAdsCallback&scope=mcp%3Att4b&response_type=code&state=...&code_challenge=...&code_challenge_method=S256&resource=..."
}
```

Redirect the user's browser to `authorizeUrl` with a full-page redirect rather than a popup. Wiro adds the PKCE challenge itself, so you never handle a code verifier or client secret. `authmethod` can be omitted: `"wiro"` is the default and the only accepted value.

> **State TTL:** Wiro keeps the OAuth state for **15 minutes**. If the user takes longer on TikTok's consent screen, the connection fails with `tiktokads_error=session_expired` and you must call `OAuthConnect` again.

### Step 2: Handle the return

After the user approves, TikTok sends them to Wiro's callback (`https://api.wiro.ai/v1/UserAgentOAuth/TikTokAdsCallback`). Wiro exchanges the code, lists the advertisers the TikTok for Business user can access, stores the tokens server-side, and redirects the browser to your `redirecturl`.

**Success URL** looks like:

```
https://your-app.com/settings/integrations?tiktokads_connected=true&tiktokads_advertisers=%5B%7B%22id%22%3A%227012345678901234567%22%2C%22name%22%3A%22Brand%20X%22%7D%5D
```

- `tiktokads_advertisers` is `encodeURIComponent(JSON.stringify([...]))`.
- Each element is `{ id, name }`: `id` is the numeric advertiser ID as a string, `name` is the advertiser name.
- The list is never empty on success. When no advertiser can be listed, the callback returns `tiktokads_error=no_accounts` instead.
- On a first connection (or after `OAuthDisconnect`), nothing is selected yet: the connection becomes active only after Step 3, even when a single advertiser is returned. Reconnecting without `OAuthDisconnect` keeps the previous selection.

Parse in the browser:

```javascript
const params = new URLSearchParams(window.location.search);

if (params.get("tiktokads_connected") === "true") {
  const advertisers = JSON.parse(params.get("tiktokads_advertisers") || "[]");
  if (advertisers.length === 1) {
    await saveAdvertisers(advertisers);
  } else {
    presentAdvertiserPicker(advertisers);
  }
} else if (params.get("tiktokads_error")) {
  handleError(params.get("tiktokads_error"));
}
```

### Step 3: Save the advertiser selection

This call is **required**. The Wiro dashboard selects a sole advertiser automatically, but API clients must always send the selection themselves.

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/SetPickerAccounts" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "credentialkey": "tiktok-ads",
    "accounts": [
      { "advertiserid": "7012345678901234567", "advertisername": "Brand X" }
    ]
  }'
```

Response:

```json
{
  "result": true,
  "errors": [],
  "accounts": [
    { "id": "7012345678901234567", "name": "Brand X" }
  ]
}
```

Behavior:

- Send one or more `{ advertiserid, advertisername }` entries picked from `tiktokads_advertisers` (`id` becomes `advertiserid`, `name` becomes `advertisername`). Non-digits in `advertiserid` are stripped server-side.
- Each call replaces the previous selection.
- If the agent was running, Wiro restarts it so it picks up the selection. No manual Start needed.

### Step 4: Verify the connection

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/OAuthStatus" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "credentialkey": "tiktok-ads"
  }'
```

Response:

```json
{
  "result": true,
  "errors": [],
  "connected": true,
  "accounts": [
    { "id": "7012345678901234567", "name": "Brand X" }
  ],
  "connectedat": "2026-09-26T08:14:00.000Z",
  "tokenexpiresat": "2026-09-27T08:14:00.000Z"
}
```

Field notes:

- `connected` is `true` when the connection has a current access token and at least one advertiser is selected.
- `connectedat` is when the user authorized. The authorization ends 30 days after this time.
- `tokenexpiresat` is the expiry of the current access token (about 24 hours), not the end of the 30-day authorization. Wiro renews the access token while the agent is running, so this value moves forward about once a day.
- If the agent has been stopped for more than a day, `connected` can read `false` until the agent runs again. Starting the agent renews the access token as long as the 30-day authorization has not ended.

### Step 5: Start the agent if it's not running

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Start" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "guid": "your-useragent-guid" }'
```

Check `POST /UserAgent/Detail` first: if `setuprequired` is still `true`, TikTok Ads or some other credential the agent requires is incomplete, and Start will refuse. See [Agent Credentials — Setup Required](/docs/agent-credentials#setup-required-state).

Agents already running when you connected TikTok Ads restart automatically.

## Credential fields

| Field | Type | Description |
|-------|------|-------------|
| `advertiserid` | array of strings | Numeric IDs of the selected advertisers. Required. Written by `SetPickerAccounts`. |
| `advertisername` | array of strings | Names of the selected advertisers, in the same order. Written by `SetPickerAccounts`. |

Both fields are returned by `POST /UserAgent/Detail` and are managed by the connection flow: `POST /UserAgent/CredentialUpsert` rejects writes to them (for example `Advertiser ID is managed by the connection flow`). Access and refresh tokens are stored server-side and are never returned by any endpoint.

## API Reference

All endpoints require Wiro authentication — see [Authentication](/docs/authentication) for `x-api-key` + optional signature headers.

### POST /UserAgentOAuth/OAuthConnect

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Agent instance GUID. |
| `credentialkey` | string | Yes | `"tiktok-ads"`. |
| `redirecturl` | string | Yes | HTTPS URL (or `http://localhost` / `http://127.0.0.1` for development) where the browser returns after TikTok. |
| `authmethod` | string | No | `"wiro"` — the default and the only accepted value. |

Response: `{ result, errors, authorizeUrl }`. If `result: false`, inspect `errors[0].message` — common messages: `Request parameter [useragentguid] required`, `Request parameter [credentialkey] required`, `Request parameter [redirecturl] required`, `Invalid redirect URL`, `User agent not found or unauthorized`, `Unsupported connection mode for TikTok Ads`, and `TikTok Ads credentials not configured`.

### GET /UserAgentOAuth/TikTokAdsCallback

Server-side endpoint invoked by TikTok. You don't call it — you only handle the final redirect back to your `redirecturl`. The callback path is per-provider — TikTok Ads's is `TikTokAdsCallback`, separate from the organic TikTok integration's `TikTokCallback`.

| Query param | Meaning |
|-------------|---------|
| `tiktokads_connected=true` | Authorization completed. |
| `tiktokads_advertisers` | URL-encoded JSON array of `{ id, name }` for the advertisers the TikTok for Business user can access. Always at least one entry. |
| `tiktokads_error=<code>` | The connection failed. See Troubleshooting below. |

### POST /UserAgentOAuth/SetPickerAccounts

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Agent instance GUID. |
| `credentialkey` | string | Yes | `"tiktok-ads"`. |
| `accounts` | array | Yes | One or more `{ advertiserid, advertisername }` entries. `advertiserid` is the numeric advertiser ID (non-digits stripped); `advertisername` is the display name shown in dashboards and `OAuthStatus` responses. |

Response: `{ result, errors, accounts: [{id, name}, ...] }`. Replaces the previous selection and triggers an automatic agent restart if the agent was running. Returns `TikTok Ads account not connected` when no completed connection exists yet.

### POST /UserAgentOAuth/OAuthStatus

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Agent instance GUID. |
| `credentialkey` | string | Yes | `"tiktok-ads"`. |

Response fields:

| Field | Type | Description |
|-------|------|-------------|
| `connected` | boolean | `true` when the connection has a current access token and at least one selected advertiser. **Note:** this reflects the TikTok Ads connection only. Use `setuprequired` from `POST /UserAgent/Detail` for whole-agent readiness. |
| `accounts` | array | One `{ id, name }` per selected advertiser (`id` = `advertiserid`, `name` = `advertisername`). |
| `connectedat` | string | ISO timestamp of the authorization. The 30-day authorization ends 30 days after it. |
| `tokenexpiresat` | string | ISO expiry of the current access token (about 24 hours ahead while the agent runs). |

### POST /UserAgentOAuth/OAuthDisconnect

Body: `{ useragentguid, credentialkey: "tiktok-ads" }`. Asks TikTok to revoke the authorization and clears the connection in Wiro: tokens, connection time, and the advertiser selection. The Wiro side is cleared even if TikTok's revoke request fails. An access token TikTok issued earlier may stay valid at TikTok for up to 24 hours, but the agent no longer has it.

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/OAuthDisconnect" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "credentialkey": "tiktok-ads"
  }'
```

Response: `{ "result": true, "errors": [] }`. Running agents restart automatically.

### Token lifecycle

Wiro renews the 24-hour access token automatically while the agent is running. The authorization behind it lasts 30 days from `connectedat` and cannot be extended by refreshing. To renew it, run the flow again: `OAuthDisconnect`, then `OAuthConnect`, the callback, and `SetPickerAccounts`. There is no customer-facing token-refresh endpoint, and raw tokens are never exposed to the agent model or to API callers.

## Using the Skill

TikTok Ads Manager has `int-tiktok-ads` on by default. On a Custom Build agent, enable it via `POST /UserAgent/SkillsApply` (see [Agent Skills → Toggling Integration Skills](/docs/agent-skills#toggling-integration-skills)); skill changes are only available on Custom Build agents. Adjust the cron of a bundled task such as the daily performance report with `enabled` and `interval` only — the task body (`value`) is owned by the bundled integration skill and silently dropped on writes:

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/CustomSkillUpsert" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "skillkey": "cron-tiktokads-performance-reporter",
    "enabled": true,
    "interval": "0 9 * * *"
  }'
```

To change **what** the reports include (tracking quality gates, kill thresholds, placement strategy, Spark Ads and Smart+ rules), edit the preference skill `tiktok-ads-strategy` (stored as `cs-tiktok-ads-strategy`), or `ad-strategy` for cross-platform thresholds — see [Agent Skills → Updating Preferences](/docs/agent-skills#updating-preference-skills).

## Troubleshooting

| Error code | Meaning | What to do |
|------------|---------|------------|
| `missing_params` | The callback was opened without an OAuth `state`. | Don't open the callback URL directly. Start a new flow with `OAuthConnect`. |
| `session_expired` | More than 15 minutes passed between `OAuthConnect` and the return from TikTok, or the state was already used. | Call `OAuthConnect` again. |
| `authorization_denied` | The user cancelled on TikTok's consent screen, or TikTok returned an error instead of an authorization code. | Start again and approve the consent screen. |
| `token_exchange_failed` | TikTok did not return a usable access and refresh token for the authorization code. | Start a new flow. If it persists, contact Wiro support. |
| `no_accounts` | Sign-in worked, but no advertiser could be listed for this TikTok for Business user: the user has no advertiser access, or TikTok's advertiser lookup failed. | Get access to an advertiser in TikTok Ads Manager or Business Center, then connect again. If this user already has advertiser access, try connecting again. |
| `account_list_too_large` | The TikTok for Business user can access more than 500 advertisers. | Connect with a TikTok for Business user that has access to fewer advertisers. |
| `useragent_not_found` | The agent was deleted, or is no longer owned by the account that started the flow, before TikTok returned. | Start again with `OAuthConnect` for an existing agent. |
| `internal_error` | Unexpected server error during callback processing. | Retry once. If it persists, contact Wiro support with the timestamp and your `useragentguid`. |
| `Unsupported connection mode for TikTok Ads` | Returned in `OAuthConnect`'s `errors[]` when `authmethod` is anything other than `"wiro"`. | Omit `authmethod` or send `"wiro"`. |
| `TikTok Ads credentials not configured` | Returned in `OAuthConnect`'s `errors[]` when TikTok Ads is not yet enabled on Wiro's side. | Contact Wiro support. |
| `TikTok Ads account not connected` | Returned by `SetPickerAccounts` before the TikTok authorization completed. | Finish Steps 1-2, then save the selection. |

Because no valid state is left to read your `redirecturl` from, `missing_params` and `session_expired` send the browser to `https://wiro.ai` with the error parameter instead of to your app.

### "No accounts available" after signing in

Either the TikTok for Business user you signed in with has no advertiser access, or TikTok's advertiser lookup failed. Get access to an advertiser in TikTok Ads Manager or through Business Center membership, then connect again. If this user already has advertiser access, try connecting again.

### The agent says the TikTok Ads connection expired

The 30-day authorization ended. Click **Disconnect** on the TikTok Ads card, then connect again with the same TikTok for Business account and confirm the advertisers. Your campaigns kept running in TikTok in the meantime.

### A change was refused

The action is outside what this integration allows (see "What the agent cannot do"), it targets an advertiser that was not selected, or the TikTok for Business user's role on the advertiser does not allow campaign management. Change roles in TikTok's business settings; change the advertiser selection by disconnecting and connecting again.

### A report metric is rejected by TikTok

Nothing to do. The agent drops the metric TikTok rejected and runs the report again without it.

### `connected: false` after completing the flow

`OAuthStatus` returns `connected: true` only when there is a current access token and at least one advertiser is saved. If you skipped Step 3 (`SetPickerAccounts`), `connected` stays `false`. If the selection is saved, check whether the 30-day authorization has ended (reconnect) or the agent has been stopped for more than a day (start it).

## Multi-Tenant Architecture

For SaaS products connecting many customers' TikTok Ads accounts through a single Wiro-powered backend:

1. **One Wiro agent instance per customer.** Call `POST /UserAgent/Deploy` during onboarding, then run the connection flow for that customer's `useragentguid`. Each customer signs in with their own TikTok for Business account.
2. **Tokens are isolated per agent instance.** Customer A's TikTok authorization is never visible to Customer B — they live under different `useragentguid` values.
3. **The consent screen shows Wiro AI.** There is no customer-owned app mode, so the consent screen cannot be white-labeled.
4. **Plan for the 30-day renewal.** Every customer has to reconnect every 30 days. Track `connectedat` from `OAuthStatus` and prompt the customer before the 30 days are up.
5. **Rate limits are mostly per TikTok for Business user.** TikTok allows most tools 3 requests per second per tool for each user; asynchronous report creation and campaign copies have lower per-app limits that all connections share.

## Related

- [Agent Credentials & OAuth](/docs/agent-credentials) — integration catalog hub and generic OAuth reference.
- [Agent Overview](/docs/agent-overview) — deploying, starting, and lifecycle.
- [Agent Skills](/docs/agent-skills) — configuring `int-tiktok-ads` and scheduled runs.
- [TikTok integration](/docs/integration-tiktok-skills) — organic video posting to a TikTok profile (separate `tiktok` credential).
- [Meta Ads integration](/docs/integration-metaads-skills) — for cross-platform paid campaigns.
- [Google Ads integration](/docs/integration-googleads-skills) — for cross-platform paid campaigns.
