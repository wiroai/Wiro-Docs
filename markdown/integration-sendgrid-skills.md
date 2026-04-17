# SendGrid Integration

Connect your agent to Twilio SendGrid for transactional and marketing email delivery.

## Overview

The SendGrid integration uses standard Bearer authentication with a SendGrid API key.

**Used by:**

- `newsletter-compose` (agents that use SendGrid as the ESP)
- Custom agents needing email sending

**Agents that typically enable this integration:**

- Newsletter Manager

## Availability

| Mode | Status | Notes |
|------|--------|-------|
| API Key | Available | Twilio SendGrid API keys. |

## Prerequisites

- **A Wiro API key** — [Authentication](/docs/authentication).
- **A deployed agent** — [Agent Overview](/docs/agent-overview).
- **A SendGrid account**.

## Setup

### Step 1: Create an API key

1. [app.sendgrid.com](https://app.sendgrid.com/) → **Settings → API Keys → Create API Key**.
2. Name "Wiro agent".
3. Permissions:
   - **Full Access** for maximum capability, or
   - **Restricted Access** + enable at least **Mail Send** (and **Marketing Campaigns** if used).
4. **Create & View**, copy the key once (starts with `SG.`) — **cannot be retrieved later**.

### Step 2: Save to Wiro

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Update" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "guid": "your-useragent-guid",
    "configuration": {
      "credentials": {
        "sendgrid": {
          "apiKey": "SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
        }
      }
    }
  }'
```

### Step 3: Start the agent

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Start" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "guid": "your-useragent-guid" }'
```

## Credential Fields

| Field | Type | Description |
|-------|------|-------------|
| `apiKey` | string | SendGrid API key (starts with `SG.`). |

## Runtime Behavior

Env vars:

- `SENDGRID_API_KEY` ← `credentials.sendgrid.apiKey`

Auth: `Authorization: Bearer $SENDGRID_API_KEY`.
Base URL: `https://api.sendgrid.com/v3`.

Rate limits: 600 req/min on most endpoints; higher on marketing endpoints.

## Troubleshooting

- **401 Unauthorized:** Key deleted or permissions changed. Create a new key with appropriate scopes.
- **403 Forbidden on send:** Sender identity not verified. In SendGrid → **Settings → Sender Authentication**, verify single sender or domain.
- **Emails flagged as spam:** Complete Domain Authentication (SPF + DKIM + DMARC) in SendGrid sender settings.

## Related

- [Agent Credentials & OAuth](/docs/agent-credentials)
- [Agent Overview](/docs/agent-overview)
- [Agent Skills](/docs/agent-skills)
- [SendGrid API docs](https://docs.sendgrid.com/api-reference/)
