# Mailchimp Integration

Connect your agents to Mailchimp for newsletter and audience management. Supports both OAuth and direct API keys.

## Overview

The Mailchimp integration lets an agent manage audiences, campaigns, and templates. Unlike most integrations, Mailchimp supports **three** authentication methods.

**Skills that use this integration:**

- `mailchimp-email` — Audience and campaign management

**Agents that typically enable this integration:**

- Newsletter Manager
- Any custom agent that needs email marketing capabilities

## Availability

| Mode | Status | Notes |
|------|--------|-------|
| `"wiro"` | Available | OAuth with Wiro's shared Mailchimp app. |
| `"own"` | Available | OAuth with your own Mailchimp registered app. |
| API key | Available | Paste a server-scoped Mailchimp API key directly — no OAuth. |

## Prerequisites

- **A Wiro API key** — see [Authentication](/docs/authentication).
- **A deployed agent** — see [Agent Overview](/docs/agent-overview).
- **A Mailchimp account**.
- **(Own-OAuth mode only) A registered Mailchimp app** — at [admin.mailchimp.com](https://admin.mailchimp.com/account/oauth2_client/).
- **(API-key mode only) A server-scoped Mailchimp API key**.

## Option A: OAuth (Wiro or Own Mode)

### Own-mode Step 1: Register a Mailchimp app

1. Sign in to Mailchimp → **Profile → Extras → API keys** or directly [admin.mailchimp.com/account/oauth2_client](https://admin.mailchimp.com/account/oauth2_client/).
2. Click **Register and manage your apps**.
3. Fill in **App name**, **Description**, **Company**, **App website**.
4. Under **Redirect URI**, add:

   ```
   https://api.wiro.ai/v1/UserAgentOAuth/MailchimpCallback
   ```

5. Save; copy **Client ID** and **Client Secret**.

### Own-mode Step 2: Save credentials

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Update" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "guid": "your-useragent-guid",
    "configuration": {
      "credentials": {
        "mailchimp": {
          "clientId": "YOUR_MAILCHIMP_CLIENT_ID",
          "clientSecret": "YOUR_MAILCHIMP_CLIENT_SECRET"
        }
      }
    }
  }'
```

### OAuth Step 3: Initiate

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/MailchimpConnect" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "userAgentGuid": "your-useragent-guid",
    "redirectUrl": "https://your-app.com/settings/integrations",
    "authMethod": "own"
  }'
```

Omit `authMethod` (or set to `"wiro"`) for Wiro-mode.

### OAuth Step 4: Handle callback

```
https://your-app.com/settings/integrations?mailchimp_connected=true&mailchimp_account=Your%20Company
```

Mailchimp tokens do **not** expire — no refresh cycle.

### OAuth Step 5: Verify

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/MailchimpStatus" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "userAgentGuid": "your-useragent-guid" }'
```

## Option B: Direct API Key (No OAuth)

For server-side agents where OAuth is overkill:

### Step 1: Get a Mailchimp API Key

1. Sign in → **Profile → Extras → API keys**.
2. Click **Create A Key**, name it, copy the value. The key ends in a datacenter prefix like `-us14`.

### Step 2: Save to Wiro

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Update" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "guid": "your-useragent-guid",
    "configuration": {
      "credentials": {
        "mailchimp": {
          "apiKey": "abcdef1234567890-us14"
        }
      }
    }
  }'
```

No further OAuth step is needed. The agent uses the API key directly.

## API Reference

### **POST** /UserAgentOAuth/MailchimpConnect

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userAgentGuid` | string | Yes | Agent instance GUID. |
| `redirectUrl` | string | Yes | HTTPS URL. |
| `authMethod` | string | No | `"wiro"` (default) or `"own"`. |

### **GET** /UserAgentOAuth/MailchimpCallback

Callback query params: `mailchimp_connected=true&mailchimp_account=<name>` or `mailchimp_error=<code>`.

### **POST** /UserAgentOAuth/MailchimpStatus / MailchimpDisconnect

Standard shape. **Note:** Mailchimp tokens do not expire, so `TokenRefresh` is not supported for this provider.

## Troubleshooting

| Error code | Meaning | What to do |
|------------|---------|------------|
| `authorization_denied` | User cancelled. | Retry. |
| `session_expired` | State cache expired. | Restart. |
| `token_exchange_failed` | Wrong Client Secret or redirect URI mismatch. | Re-copy; verify URL. |
| `useragent_not_found` | Invalid `userAgentGuid`. | `POST /UserAgent/MyAgents`. |
| `invalid_config` | No `credentials.mailchimp` on agent. | Update with credentials. |
| `internal_error` | Server error. | Retry; contact support. |

### API calls fail with 401

- For OAuth: the stored token is invalid; disconnect and reconnect.
- For API key: the key is wrong or the datacenter suffix was stripped; paste the full key including `-us14` (or whatever your datacenter prefix is).

## Multi-Tenant Architecture

1. One Mailchimp registered app per product in own-OAuth mode.
2. API-key mode is simplest for tenants who only want to paste a single-purpose key.
3. One Wiro agent instance per customer.
4. Mailchimp rate limits are per-datacenter and per-account — typical 10 concurrent connections.

## Related

- [Agent Credentials & OAuth](/docs/agent-credentials)
- [Agent Overview](/docs/agent-overview)
- [Agent Skills](/docs/agent-skills)
- [Mailchimp Marketing API](https://mailchimp.com/developer/marketing/)
