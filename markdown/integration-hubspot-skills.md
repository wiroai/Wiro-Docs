# HubSpot Integration

Connect your agent to HubSpot for contact, deal, and engagement management via the HubSpot CRM API.

## Overview

The HubSpot integration uses HubSpot's OAuth 2.0.

**Skills that use this integration:**

- `hubspot-crm` — Contact/deal CRUD, note and task creation, sequence enrollment
- `newsletter-compose` — optional; uses HubSpot as an ESP when enabled alongside

**Agents that typically enable this integration:**

- Lead Generation Manager
- Newsletter Manager (HubSpot as ESP)
- Any custom agent with CRM capabilities

## Availability

| Mode | Status | Notes |
|------|--------|-------|
| `"wiro"` | Available | One-click connect using Wiro's HubSpot app. |
| `"own"` | Available | Your own HubSpot developer app. |

## Prerequisites

- **A Wiro API key** — [Authentication](/docs/authentication).
- **A deployed agent** — [Agent Overview](/docs/agent-overview).
- **A HubSpot account** the connecting user is an admin of.
- **(Own mode) A HubSpot developer account** — [developers.hubspot.com](https://developers.hubspot.com/).
- **An HTTPS callback URL**.

## Wiro Mode

Call `OAuthConnect` without `authmethod`, redirect, parse `hubspot_connected=true&hubspot_portal=<id>&hubspot_name=<name>`.

## Complete Integration Walkthrough — Own Mode

### Step 1: Create a HubSpot App

1. [developers.hubspot.com](https://developers.hubspot.com/) → sign in → **Create app**.
2. Set **App name** and **App description** (shown on consent).

### Step 2: Configure Auth

1. Open the **Auth** tab.
2. **Redirect URL**:

   ```
   https://api.wiro.ai/v1/UserAgentOAuth/HubSpotCallback
   ```

3. **Scopes** — Wiro requests a fixed scope string plus optional_scopes (sourced from `data/agent-skills-registry/credentials/hubspot.json` under `oauth_provider.oauth_flow.scopes`). Enable **all** of the following in your HubSpot app's Auth tab:

   **Required `scope` (mandatory — OAuth fails if any is missing):**

   - `crm.objects.contacts.read`
   - `crm.objects.contacts.write`
   - `crm.lists.read`
   - `crm.lists.write`
   - `oauth`

   **`optional_scope` (granted on consent if enabled, otherwise skipped — Wiro doesn't fail if missing):**

   - `crm.objects.companies.read`
   - `crm.objects.companies.write`
   - `crm.objects.deals.read`
   - `crm.objects.deals.write`
   - `crm.objects.owners.read`
   - `crm.schemas.contacts.read`
   - `content`
   - `transactional-email`
   - `files`

4. Save.

> Wiro's authorize URL is built with this exact scope list — you cannot customize it per integration. Enabling additional scopes in your HubSpot app beyond this set has no effect (Wiro won't request them). If a required scope is missing from your app's configuration, the consent screen will error.

### Step 3: Copy Client ID and Client Secret

**Auth** tab → copy **Client ID** and **Client Secret**.

### Step 4: Save credentials to Wiro

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/CredentialUpsert" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "fields": [
      { "credentialkey": "hubspot", "fieldname": "clientid", "fieldvalue": "YOUR_HUBSPOT_CLIENT_ID" },
      { "credentialkey": "hubspot", "fieldname": "clientsecret", "fieldvalue": "YOUR_HUBSPOT_CLIENT_SECRET" },
      { "credentialkey": "hubspot", "fieldname": "authmethod", "fieldvalue": "own" }
    ]
  }'
```

### Step 5: Initiate OAuth

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/OAuthConnect" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "credentialkey": "hubspot",
    "redirecturl": "https://your-app.com/settings/integrations",
    "authmethod": "own"
  }'
```

Response:

```json
{
  "result": true,
  "authorizeUrl": "https://app.hubspot.com/oauth/authorize?client_id=...&redirect_uri=...&scope=...&state=...",
  "errors": []
}
```

### Step 6: Handle the callback

Wiro exchanges the code, then calls `GET https://api.hubapi.com/oauth/v1/access-tokens/<access_token>` to fetch `hub_id` (portalid) and `hub_domain` (portalname).

**Success URL:**

```
https://your-app.com/settings/integrations?hubspot_connected=true&hubspot_portal=12345678&hubspot_name=My%20Workspace
```

### Step 7: Verify and Start

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/OAuthStatus" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "credentialkey": "hubspot"
  }'
```

Response:

```json
{
  "result": true,
  "connected": true,
  "accounts": [
    { "id": "Acme Corp HubSpot", "name": "Acme Corp HubSpot" }
  ],
  "connectedat": "2026-04-17T12:00:00.000Z",
  "tokenexpiresat": "2026-04-17T12:30:00.000Z",
  "errors": []
}
```

> **HubSpot tokens expire in 30 minutes.** This is the shortest token lifetime of any Wiro integration. Every running agent has a dedicated background cron that refreshes HubSpot tokens **every 20 minutes** — you never need to call TokenRefresh from your own app. If you see stale tokens despite the agent being running, check agent logs for refresh failures.

Note: For HubSpot, the unified `OAuthStatus` mirrors the saved `portalname` into both `accounts[0].id` and `accounts[0].name` (HubSpot has no separate picker — there's exactly one portal per OAuth grant). The numeric `portalid` is captured by `HubSpotCallback` as `hubspot_portal=<id>` on the redirect URL but is not re-surfaced by `OAuthStatus`.

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
| `credentialkey` | string | Yes | `"hubspot"`. |
| `redirecturl` | string | Yes | HTTPS URL. |
| `authmethod` | string | No | `"wiro"` (default) or `"own"`. |

### GET /UserAgentOAuth/HubSpotCallback

Query params: `hubspot_connected=true&hubspot_portal=<id>&hubspot_name=<name>` or `hubspot_error=<code>`. The callback path is per-provider — HubSpot's stays `HubSpotCallback`.

### POST /UserAgentOAuth/OAuthStatus

Body: `{ useragentguid, credentialkey: "hubspot" }`. Response: `connected`, `accounts: [{id, name}]` (1-element with the saved `portalname` mirrored into both `id` and `name`), `connectedat`, `tokenexpiresat` (~30 min).

### POST /UserAgentOAuth/OAuthDisconnect

Body: `{ useragentguid, credentialkey: "hubspot" }`. Clears HubSpot credentials (no remote revoke).

### POST /UserAgentOAuth/TokenRefresh

> Running agents refresh HubSpot tokens automatically **every 20 minutes** (tokens last 30 minutes). Use this endpoint only for debugging.

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/TokenRefresh" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "provider": "hubspot"
  }'
```

Returns new access + refresh tokens. See [Automatic token refresh](/docs/agent-credentials#automatic-token-refresh).

## Using the Skill

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/CustomSkillUpsert" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "skillkey": "lead-enrichment",
    "enabled": true,
    "interval": "0 */4 * * *",
    "value": "Enrich new contacts with company information"
  }'
```

## Troubleshooting

| Error code | Meaning | What to do |
|------------|---------|------------|
| `missing_params` | Callback hit without `state` or `code`. | User didn't complete consent; restart the flow. |
| `authorization_denied` | User cancelled, or missing scopes. | Verify scope list in the HubSpot app's Auth tab. |
| `session_expired` | State cache expired (15 min TTL). | Restart the OAuth flow. |
| `token_exchange_failed` | Wrong Client Secret or redirect URI mismatch. | Re-copy; verify URL. |
| `useragent_not_found` | Invalid guid. | Use `POST /UserAgent/MyAgents`. |
| `HubSpot credentials not configured` | Returned in `OAuthConnect`'s `errors[]` when `authmethod: "own"` but `clientid` / `clientsecret` are missing. | `UserAgent/CredentialUpsert` with `clientid` + `clientsecret`. |
| `internal_error` | Server error. | Retry; contact support. |

### 403 Forbidden on API calls

Usually a missing scope. Look up the specific HubSpot API endpoint you're hitting, add the required scope in your app's Auth tab, then disconnect and reconnect (scope changes require re-consent).

### Token expired error at runtime

HubSpot's 30-minute token lifetime makes refresh critical. The agent container runs the HubSpot refresh cron every 20 minutes, so stale tokens should only appear if:

- The agent is stopped (status 0/1/6). Start it: `POST /UserAgent/Start`.
- The refresh token was revoked in HubSpot's app management UI. User must reconnect.
- The refresh cron itself is failing — check agent logs via dashboard or support.

## Multi-Tenant Architecture

1. **One HubSpot developer app** per product — submit to the HubSpot App Marketplace for listed visibility, or stay private.
2. **One Wiro agent instance per customer.**
3. **Portal IDs are unique per customer's HubSpot account.**
4. **Per-app rate limits apply** — see HubSpot's [API usage guidelines](https://developers.hubspot.com/docs/api/usage-details).

## Related

- [Agent Credentials & OAuth](/docs/agent-credentials)
- [Agent Overview](/docs/agent-overview)
- [Agent Skills](/docs/agent-skills)
- [HubSpot Developer docs](https://developers.hubspot.com/docs/api/overview)
