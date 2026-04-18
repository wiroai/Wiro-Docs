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

Call `HubSpotConnect` without `authMethod`, redirect, parse `hubspot_connected=true&hubspot_portal=<id>&hubspot_name=<name>`.

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

3. **Scopes** — Wiro requests a fixed scope string plus optional_scopes (verified against `api-useragent-oauth.js` L2551-L2556). Enable **all** of the following in your HubSpot app's Auth tab:

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
curl -X POST "https://api.wiro.ai/v1/UserAgent/Update" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "guid": "your-useragent-guid",
    "configuration": {
      "credentials": {
        "hubspot": {
          "clientId": "YOUR_HUBSPOT_CLIENT_ID",
          "clientSecret": "YOUR_HUBSPOT_CLIENT_SECRET"
        }
      }
    }
  }'
```

### Step 5: Initiate OAuth

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/HubSpotConnect" \
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
  "authorizeUrl": "https://app.hubspot.com/oauth/authorize?client_id=...&redirect_uri=...&scope=...&state=...",
  "errors": []
}
```

### Step 6: Handle the callback

Wiro exchanges the code, then calls `GET https://api.hubapi.com/oauth/v1/access-tokens/<access_token>` to fetch `hub_id` (portalId) and `hub_domain` (portalName).

**Success URL:**

```
https://your-app.com/settings/integrations?hubspot_connected=true&hubspot_portal=12345678&hubspot_name=My%20Workspace
```

### Step 7: Verify and Start

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/HubSpotStatus" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "userAgentGuid": "your-useragent-guid" }'
```

Response:

```json
{
  "result": true,
  "connected": true,
  "username": "12345678",
  "connectedAt": "2026-04-17T12:00:00.000Z",
  "tokenExpiresAt": "2026-04-17T12:30:00.000Z",
  "errors": []
}
```

> **HubSpot tokens expire in 30 minutes.** This is the shortest token lifetime of any Wiro integration. Every running agent has a dedicated background cron that refreshes HubSpot tokens **every 20 minutes** — you never need to call TokenRefresh from your own app. If you see stale tokens despite the agent being running, check agent logs for refresh failures.

Note: `username` in the response is actually the **portalId as a string** (not `portalName`) — this is backend behavior. `hubspot_name` is only set on the callback URL, not re-surfaced by `Status`.

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Start" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "guid": "your-useragent-guid" }'
```

## API Reference

### POST /UserAgentOAuth/HubSpotConnect

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userAgentGuid` | string | Yes | Agent instance GUID. |
| `redirectUrl` | string | Yes | HTTPS URL. |
| `authMethod` | string | No | `"wiro"` (default) or `"own"`. |

### GET /UserAgentOAuth/HubSpotCallback

Query params: `hubspot_connected=true&hubspot_portal=<id>&hubspot_name=<name>` or `hubspot_error=<code>`.

### POST /UserAgentOAuth/HubSpotStatus

Response fields: `connected`, `username` (= portalId string), `connectedAt`, `tokenExpiresAt` (~30 min).

### POST /UserAgentOAuth/HubSpotDisconnect

Clears HubSpot credentials (no remote revoke).

### POST /UserAgentOAuth/TokenRefresh

> Running agents refresh HubSpot tokens automatically **every 20 minutes** (tokens last 30 minutes). Use this endpoint only for debugging.

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/TokenRefresh" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "userAgentGuid": "your-useragent-guid",
    "provider": "hubspot"
  }'
```

Returns new access + refresh tokens. See [Automatic token refresh](/docs/agent-credentials#automatic-token-refresh).

## Using the Skill

```json
{
  "guid": "your-useragent-guid",
  "configuration": {
    "custom_skills": [
      {
        "key": "lead-enrichment",
        "enabled": true,
        "interval": "0 */4 * * *",
        "value": "Enrich new contacts with company information"
      }
    ]
  }
}
```

## Troubleshooting

| Error code | Meaning | What to do |
|------------|---------|------------|
| `missing_params` | Callback hit without `state` or `code`. | User didn't complete consent; restart the flow. |
| `authorization_denied` | User cancelled, or missing scopes. | Verify scope list in the HubSpot app's Auth tab. |
| `session_expired` | State cache expired (15 min TTL). | Restart the OAuth flow. |
| `token_exchange_failed` | Wrong Client Secret or redirect URI mismatch. | Re-copy; verify URL. |
| `useragent_not_found` | Invalid guid. | Use `POST /UserAgent/MyAgents`. |
| `invalid_config` | No `credentials.hubspot` block. | Update with `clientId` + `clientSecret`. |
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
