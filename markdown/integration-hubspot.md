# HubSpot Integration

Connect your agents to HubSpot to manage contacts, deals, sequences, and other CRM objects.

## Overview

The HubSpot integration lets an agent read and write HubSpot CRM objects (contacts, companies, deals, engagements, tickets) via OAuth 2.0.

**Skills that use this integration:**

- `hubspot-crm` — Contact/deal management, note and task creation, enrollment in sequences

**Agents that typically enable this integration:**

- Lead Gen Manager
- Newsletter Manager (optional CRM sync)
- Any custom agent that needs CRM capabilities

## Availability

| Mode | Status | Notes |
|------|--------|-------|
| `"wiro"` | Available | One-click connect using Wiro's public HubSpot app. |
| `"own"` | Available | Use your own HubSpot developer app for custom branding or expanded scopes. |

## Prerequisites

- **A Wiro API key** — see [Authentication](/docs/authentication).
- **A deployed agent** — see [Agent Overview](/docs/agent-overview).
- **A HubSpot account** the connecting user is an admin of.
- **(Own mode only) A HubSpot developer account** — sign up at [developers.hubspot.com](https://developers.hubspot.com/).
- **An HTTPS callback URL**.

## Complete Integration Walkthrough — Wiro Mode

Call `HubSpotConnect` with no `authMethod`, redirect the user, read `hubspot_connected=true&hubspot_portal=<portalId>&hubspot_name=<name>`.

## Complete Integration Walkthrough — Own Mode

### Step 1: Create a HubSpot App

1. Go to [developers.hubspot.com](https://developers.hubspot.com/), sign in, and click **Create app**.
2. Set **App name** and **App description** (shown on the consent screen).

### Step 2: Configure Auth

1. Inside the app, open the **Auth** tab.
2. Under **Redirect URL**, add:

   ```
   https://api.wiro.ai/v1/UserAgentOAuth/HubSpotCallback
   ```

3. Under **Scopes**, select the ones your agent needs. Typical set:

   | Scope | Why |
   |-------|-----|
   | `crm.objects.contacts.read` | Read contacts. |
   | `crm.objects.contacts.write` | Create/update contacts. |
   | `crm.objects.companies.read` / `write` | Company management. |
   | `crm.objects.deals.read` / `write` | Deal management. |
   | `crm.objects.owners.read` | Read pipeline owners for assignment. |
   | `crm.schemas.contacts.read` | Read custom contact fields. |

4. Save.

### Step 3: Copy Client ID and Client Secret

From the **Auth** tab, copy **Client ID** and **Client Secret**.

### Step 4: Save credentials

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

### Step 6: Handle callback

```
https://your-app.com/settings/integrations?hubspot_connected=true&hubspot_portal=12345678&hubspot_name=My%20Workspace
```

`hubspot_portal` is the HubSpot portal ID (a.k.a. hub ID). `hubspot_name` is the workspace display name.

### Step 7: Verify and Start

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/HubSpotStatus" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "userAgentGuid": "your-useragent-guid" }'
```

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Start" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "guid": "your-useragent-guid" }'
```

## API Reference

### **POST** /UserAgentOAuth/HubSpotConnect

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userAgentGuid` | string | Yes | Agent instance GUID. |
| `redirectUrl` | string | Yes | HTTPS URL. |
| `authMethod` | string | No | `"wiro"` (default) or `"own"`. |

### **GET** /UserAgentOAuth/HubSpotCallback

Callback query params: `hubspot_connected=true&hubspot_portal=<id>&hubspot_name=<name>` or `hubspot_error=<code>`.

### **POST** /UserAgentOAuth/HubSpotStatus / HubSpotDisconnect

Standard shape.

### **POST** /UserAgentOAuth/TokenRefresh

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/TokenRefresh" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "userAgentGuid": "your-useragent-guid", "provider": "hubspot" }'
```

## Troubleshooting

| Error code | Meaning | What to do |
|------------|---------|------------|
| `authorization_denied` | User cancelled, or missing scopes in app settings. | Verify scope list in Auth tab; retry. |
| `session_expired` | State cache expired. | Restart. |
| `token_exchange_failed` | Wrong Client Secret or redirect URI mismatch. | Re-copy; verify URL. |
| `useragent_not_found` | Invalid `userAgentGuid`. | Find via `POST /UserAgent/MyAgents`. |
| `invalid_config` | No `credentials.hubspot` on agent. | Update with `clientId` + `clientSecret`. |
| `internal_error` | Server error. | Retry; contact support. |

### 403 Forbidden on API calls

Usually a missing scope. Look at the HubSpot API reference for the endpoint and add the required scope in your app's Auth configuration, then disconnect and reconnect (scope changes require re-auth).

## Multi-Tenant Architecture

1. One HubSpot developer app per product. Submit to the HubSpot Marketplace for listed apps or stay unlisted for private apps.
2. One Wiro agent instance per customer.
3. Portal IDs are unique per HubSpot customer account.
4. Per-app rate limits apply — see HubSpot's [API usage guidelines](https://developers.hubspot.com/docs/api/usage-details).

## Related

- [Agent Credentials & OAuth](/docs/agent-credentials)
- [Agent Overview](/docs/agent-overview)
- [Agent Skills](/docs/agent-skills)
- [HubSpot Developer docs](https://developers.hubspot.com/docs/api/overview)
