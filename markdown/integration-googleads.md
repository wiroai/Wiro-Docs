# Google Ads Integration

Connect your agents to Google Ads for campaign management, keyword research, and ad copy optimization.

## Overview

The Google Ads integration lets an agent work with the Google Ads API — managing campaigns, ad groups, keywords, and reading performance data.

**Skills that use this integration:**

- `googleads-manage` — Campaign / ad group / keyword management, insights
- `ads-manager-common` — Shared ads helpers

**Agents that typically enable this integration:**

- Google Ads Manager
- Any custom agent that needs paid-search capabilities

## Availability

| Mode | Status | Notes |
|------|--------|-------|
| `"wiro"` | Available | One-click connect using Wiro's Google Cloud project. |
| `"own"` | Available | Use your own Google Cloud project, Developer Token, and MCC for full control. |

## Prerequisites

- **A Wiro API key** — see [Authentication](/docs/authentication).
- **A deployed agent** — see [Agent Overview](/docs/agent-overview).
- **A Google Ads account** (or MCC manager account) the connecting user administers.
- **(Own mode only) A Google Cloud project** with the Google Ads API enabled.
- **(Own mode only) A Google Ads Developer Token** — request from your MCC.
- **(Own mode only) Your Manager (MCC) Customer ID** for server-to-server calls.
- **An HTTPS callback URL**.

## Complete Integration Walkthrough — Wiro Mode

### Step 1: Initiate OAuth

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/GAdsConnect" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "userAgentGuid": "your-useragent-guid",
    "redirectUrl": "https://your-app.com/settings/integrations"
  }'
```

### Step 2: Callback handling

User returns with `?gads_connected=true&gads_accounts=[{...}]`. Parse and present to the user if multiple.

### Step 3: Pick the Customer ID

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/GAdsSetCustomerId" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "userAgentGuid": "your-useragent-guid",
    "customerId": "123-456-7890"
  }'
```

Skip to Step 6 below for verification.

## Complete Integration Walkthrough — Own Mode

### Step 1: Create a Google Cloud Project

1. Go to [console.cloud.google.com](https://console.cloud.google.com/) and create a new project (or reuse one).
2. Under **APIs & Services → Library**, search for **Google Ads API** and click **Enable**.
3. Under **APIs & Services → OAuth consent screen**, configure:
   - User type: **External** (for multi-tenant) or **Internal** (for single-workspace).
   - App name, support email, developer contact.
   - Scopes: add `https://www.googleapis.com/auth/adwords` in **Edit App → Scopes**.
   - Test users (during Testing publish status): add the Google accounts that will connect.

### Step 2: Create OAuth 2.0 Client ID

1. **APIs & Services → Credentials → Create credentials → OAuth client ID**.
2. Application type: **Web application**.
3. Name it.
4. **Authorized redirect URIs** → add:

   ```
   https://api.wiro.ai/v1/UserAgentOAuth/GAdsCallback
   ```

5. Save; copy the **Client ID** and **Client Secret**.

### Step 3: Get a Developer Token

1. Sign in to your [Google Ads Manager (MCC) account](https://ads.google.com/).
2. Go to **Tools → API Center** and request a token.
3. Start with a **test token** for development; apply for **basic access** once you are ready for production.

### Step 4: Save credentials to Wiro

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Update" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "guid": "your-useragent-guid",
    "configuration": {
      "credentials": {
        "googleads": {
          "clientId": "YOUR_GOOGLE_OAUTH_CLIENT_ID",
          "clientSecret": "YOUR_GOOGLE_OAUTH_CLIENT_SECRET",
          "developerToken": "YOUR_GOOGLE_ADS_DEVELOPER_TOKEN",
          "managerCustomerId": "1234567890"
        }
      }
    }
  }'
```

`managerCustomerId` is your MCC's customer ID without dashes (10 digits).

### Step 5: Initiate OAuth

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/GAdsConnect" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "userAgentGuid": "your-useragent-guid",
    "redirectUrl": "https://your-app.com/settings/integrations",
    "authMethod": "own"
  }'
```

### Step 6: Handle the callback

Success URL includes a list of accessible customer accounts:

```
https://your-app.com/settings/integrations?gads_connected=true&gads_accounts=%5B%7B%22id%22%3A%221234567890%22%2C%22name%22%3A%22My%20Client%22%7D%5D
```

```javascript
const params = new URLSearchParams(window.location.search);
if (params.get("gads_connected") === "true") {
  const accounts = JSON.parse(decodeURIComponent(params.get("gads_accounts") || "[]"));
  // Present picker or auto-select if only one
}
```

### Step 7: Pick the Customer ID

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/GAdsSetCustomerId" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "userAgentGuid": "your-useragent-guid",
    "customerId": "1234567890"
  }'
```

Pass either the 10-digit form or the formatted `123-456-7890` — non-digits are stripped automatically.

### Step 8: Verify

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/GAdsStatus" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "userAgentGuid": "your-useragent-guid" }'
```

Response contains `customerId` in place of `username`.

### Step 9: Start the agent

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Start" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "guid": "your-useragent-guid" }'
```

## API Reference

### **POST** /UserAgentOAuth/GAdsConnect

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userAgentGuid` | string | Yes | Agent instance GUID. |
| `redirectUrl` | string | Yes | HTTPS URL. |
| `authMethod` | string | No | `"wiro"` (default) or `"own"`. |

### **GET** /UserAgentOAuth/GAdsCallback

Callback query params: `gads_connected=true&gads_accounts=<JSON>` or `gads_error=<code>`.

### **POST** /UserAgentOAuth/GAdsSetCustomerId

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userAgentGuid` | string | Yes | Agent instance GUID. |
| `customerId` | string | Yes | Google Ads customer ID. Non-digit characters are stripped. |

Response: `{ result: true, customerId: "1234567890", errors: [] }`.

### **POST** /UserAgentOAuth/GAdsStatus / GAdsDisconnect

Standard shape. `Status` response uses `customerId` instead of `username`.

### **POST** /UserAgentOAuth/TokenRefresh

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/TokenRefresh" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "userAgentGuid": "your-useragent-guid", "provider": "googleads" }'
```

## Using the Skill

Enable `googleads-manage`. Schedule via `custom_skills`.

## Troubleshooting

| Error code | Meaning | What to do |
|------------|---------|------------|
| `authorization_denied` | User cancelled, or OAuth consent screen still in Testing status and the user is not a test user. | Add them under Test users; or publish the consent screen. |
| `session_expired` | State cache expired. | Restart OAuth. |
| `token_exchange_failed` | Wrong Client Secret or redirect URI mismatch. | Re-copy Client Secret; verify redirect URI in Google Cloud Credentials page. |
| `useragent_not_found` | Invalid `userAgentGuid`. | Use `POST /UserAgent/MyAgents`. |
| `invalid_config` | No `credentials.googleads` on the agent. | Update with all four fields. |
| `internal_error` | Server error. | Retry; contact support. |

### API returns USER_PERMISSION_DENIED

The OAuth-authorized user lacks access to the `customerId` you chose. Make sure the user is a manager or admin on that customer in Google Ads, or pick a different customer from the `gads_accounts` list.

### Developer Token rejected

Test tokens can only query accounts in your own MCC. For customer accounts outside your MCC hierarchy, you need a Basic Access token. Apply in **Tools → API Center**.

## Multi-Tenant Architecture

1. One Google Cloud project per product. Publish the OAuth consent screen to serve public customers.
2. Apply for Basic or Standard Developer Token access based on expected volume.
3. One Wiro agent instance per customer; `customerId` is per-instance.
4. Tokens auto-refresh via stored refresh token.

## Related

- [Agent Credentials & OAuth](/docs/agent-credentials)
- [Agent Overview](/docs/agent-overview)
- [Agent Skills](/docs/agent-skills)
- [Meta Ads integration](/docs/integration-metaads) — often paired for cross-platform paid campaigns.
- [Google Ads API docs](https://developers.google.com/google-ads/api/docs/start)
