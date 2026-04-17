# Brevo Integration

Connect your agents to Brevo (formerly Sendinblue) for transactional and marketing email delivery.

## Overview

The Brevo integration uses a Brevo API v3 key for sending transactional emails, managing contact lists, and running email campaigns.

**Used by:** `newsletter-compose` and custom agents needing email sending.

**Agents that typically enable this integration:**

- Newsletter Manager

## Availability

| Mode | Status | Notes |
|------|--------|-------|
| API key (v3) | Available | Standard Brevo API v3 key. |

## Prerequisites

- **A Wiro API key** — see [Authentication](/docs/authentication).
- **A deployed agent** — see [Agent Overview](/docs/agent-overview).
- **A Brevo account** (free tier works for low volume).

## Setup

### Step 1: Get an API key

1. Sign in to [app.brevo.com](https://app.brevo.com/).
2. Click your profile (top right) → **SMTP & API → API Keys tab**.
3. Click **Generate a new API key**, name it "Wiro agent".
4. Copy the key (starts with `xkeysib-`).

### Step 2: Save to Wiro

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Update" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "guid": "your-useragent-guid",
    "configuration": {
      "credentials": {
        "brevo": {
          "apiKey": "xkeysib-xxxxxxxxxxxxxxxxxxxx"
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
| `apiKey` | string | Brevo v3 API key (starts with `xkeysib-`). |

## Troubleshooting

- **401 Unauthorized:** Key was revoked or deleted. Generate a new one.
- **Emails go to spam:** Verify your sending domain under Brevo → Senders & IP → Domains. Set up SPF, DKIM, DMARC records as instructed.
- **Rate limit (429):** Brevo free tier is 300 emails/day. Upgrade plan if you exceed.

## Related

- [Agent Credentials & OAuth](/docs/agent-credentials)
- [Agent Overview](/docs/agent-overview)
- [Agent Skills](/docs/agent-skills)
- [Brevo API docs](https://developers.brevo.com/reference/getting-started-1)
