# SendGrid Integration

Connect your agents to SendGrid for transactional and marketing email delivery.

## Overview

The SendGrid integration uses a Twilio SendGrid API key for sending transactional emails and managing lists.

**Used by:** `newsletter-compose` and custom agents needing email sending.

**Agents that typically enable this integration:**

- Newsletter Manager

## Availability

| Mode | Status | Notes |
|------|--------|-------|
| API key | Available | Twilio SendGrid API key. |

## Prerequisites

- **A Wiro API key** — see [Authentication](/docs/authentication).
- **A deployed agent** — see [Agent Overview](/docs/agent-overview).
- **A SendGrid account**.

## Setup

### Step 1: Create an API key

1. Sign in to [app.sendgrid.com](https://app.sendgrid.com/).
2. **Settings → API Keys → Create API Key**.
3. Name it "Wiro agent".
4. Choose permissions:
   - **Full Access** for maximum capability, or
   - **Restricted Access** and enable at minimum **Mail Send** + **Marketing Campaigns** (if applicable).
5. Click **Create & View**, copy the key once — it cannot be retrieved later.

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
          "apiKey": "SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
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

## Troubleshooting

- **401 Unauthorized:** Key deleted or permissions changed. Create a new key with appropriate scopes.
- **403 Forbidden on send:** Sender identity not verified. In SendGrid → Settings → Sender Authentication, verify your single sender or domain.
- **Emails delivered but flagged as spam:** Complete Domain Authentication (SPF + DKIM + DMARC) in SendGrid sender settings.

## Related

- [Agent Credentials & OAuth](/docs/agent-credentials)
- [Agent Overview](/docs/agent-overview)
- [Agent Skills](/docs/agent-skills)
- [SendGrid API docs](https://docs.sendgrid.com/api-reference/)
