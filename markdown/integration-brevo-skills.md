# Brevo Integration

Connect your agent to Brevo (formerly Sendinblue) for transactional and marketing email.

## Overview

The Brevo integration uses Brevo API v3 with an `api-key` header (not Bearer).

**Skills that use this integration:**

- `brevo-email` — Campaign, template, and contact management via Brevo API v3
- `newsletter-compose` — uses Brevo as the ESP when enabled alongside

**Other:** Custom agents can call the Brevo API via whatever skill invokes `BREVO_API_KEY`.

**Agents that typically enable this integration:**

- Newsletter Manager

## Availability

| Mode | Status | Notes |
|------|--------|-------|
| API Key (v3) | Available | Standard Brevo API v3 keys. |

## Prerequisites

- **A Wiro API key** — [Authentication](/docs/authentication).
- **A deployed agent** — [Agent Overview](/docs/agent-overview).
- **A Brevo account** (free tier works for low volume).

## Setup

### Step 1: Get an API key

1. [app.brevo.com](https://app.brevo.com/) → profile (top right) → **SMTP & API → API Keys**.
2. **Generate a new API key**, name "Wiro agent".
3. Copy the key (starts with `xkeysib-`).

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

## Runtime Behavior

Env vars (exported **only when `brevo-email` skill is enabled** and `apiKey` is set):

- `BREVO_API_KEY` ← `credentials.brevo.apiKey`

Auth: **Header `api-key: $BREVO_API_KEY`** — not Bearer. This is Brevo's documented auth pattern.
Base URL: `https://api.brevo.com/v3/`.

Rate limits: ~10 req/s on free plan; higher on paid tiers.

## Troubleshooting

- **401 Unauthorized:** Key revoked or deleted. Generate a new one.
- **Emails go to spam:** Verify sending domain under Brevo → **Senders & IP → Domains**. Set up SPF, DKIM, DMARC.
- **Rate limit (429):** Free tier is 300 emails/day. Upgrade plan.

## Related

- [Agent Credentials & OAuth](/docs/agent-credentials)
- [Agent Overview](/docs/agent-overview)
- [Agent Skills](/docs/agent-skills)
- [Brevo API docs](https://developers.brevo.com/reference/getting-started-1)
