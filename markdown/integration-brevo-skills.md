# Brevo Integration

Connect your agent to Brevo (formerly Sendinblue) for transactional and marketing email.

## Overview

The Brevo integration uses Brevo API v3 with an `api-key` header (not Bearer).

**Skills that use this integration:**

- `int-brevo-email`: Campaign, template, and contact management via Brevo API v3
- `util-newsletter-compose`: optional; uses Brevo as the ESP when enabled alongside. Newsletter Manager has it on; on other agents turn on `util-newsletter-compose` yourself. Brevo alone adds no newsletter tasks.

**Other:** Custom agents can use Brevo from their own skills once the integration is connected.

**Agents that typically enable this integration:**

- Newsletter Manager

## Availability

| Mode | Status | Notes |
|------|--------|-------|
| API Key (v3) | Available | Standard Brevo API v3 keys. |

## Prerequisites

- **A Wiro API key** (see [Authentication](/docs/authentication)).
- **A deployed agent** (see [Agent Overview](/docs/agent-overview)).
- **A Brevo account** (free tier works for low volume).

## Setup

### Step 1: Get an API key

1. [app.brevo.com](https://app.brevo.com/) → profile (top right) → **SMTP & API → API Keys**.
2. **Generate a new API key**, name "Wiro agent".
3. Copy the key (starts with `xkeysib-`).

### Step 2: Save to Wiro

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/CredentialUpsert" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "fields": [
      { "credentialkey": "brevo", "fieldname": "apikey", "fieldvalue": "xkeysib-xxxxxxxxxxxxxxxxxxxx" }
    ]
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
| `apikey` | string | Brevo v3 API key (starts with `xkeysib-`). |

## Credentials schema (as returned by `POST /UserAgent/Detail`)

```json
"brevo": {
  "_connected": false,
  "optional": true,
  "extra": false,
  "apikey": ""
}
```

## Runtime Behavior

The `int-brevo-email` skill is active only when it is enabled and `apikey` is set.

Auth: **Header `api-key: <your API key>`**, not Bearer. This is Brevo's documented auth pattern.
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
