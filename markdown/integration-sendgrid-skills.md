# SendGrid Integration

Connect your agent to Twilio SendGrid for transactional and marketing email delivery.

## Overview

The SendGrid integration uses standard Bearer authentication with a SendGrid API key.

**Skills that use this integration:**

- `int-sendgrid-email`: Marketing and transactional email via SendGrid v3 API
- `util-newsletter-compose`: optional; uses SendGrid as the ESP when enabled alongside. Newsletter Manager has it on; on other agents turn on `util-newsletter-compose` yourself. SendGrid alone adds no newsletter tasks.

**Other:** Custom agents can use SendGrid from their own skills once the integration is connected.

**Agents that typically enable this integration:**

- Newsletter Manager

## Availability

| Mode | Status | Notes |
|------|--------|-------|
| API Key | Available | Twilio SendGrid API keys. |

## Prerequisites

- **A Wiro API key** (see [Authentication](/docs/authentication)).
- **A deployed agent** (see [Agent Overview](/docs/agent-overview)).
- **A SendGrid account**.

## Setup

### Step 1: Create an API key

1. [app.sendgrid.com](https://app.sendgrid.com/) → **Settings → API Keys → Create API Key**.
2. Name "Wiro agent".
3. Permissions:
   - **Full Access** for maximum capability, or
   - **Restricted Access** + enable at least **Mail Send** (and **Marketing Campaigns** if used).
4. **Create & View**, copy the key once (starts with `SG.`). It **cannot be retrieved later**.

### Step 2: Save to Wiro

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/CredentialUpsert" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "fields": [
      { "credentialkey": "sendgrid", "fieldname": "apikey", "fieldvalue": "SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" }
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
| `apikey` | string | SendGrid API key (starts with `SG.`). |

## Credentials schema (as returned by `POST /UserAgent/Detail`)

```json
"sendgrid": {
  "_connected": false,
  "optional": true,
  "extra": false,
  "apikey": ""
}
```

## Runtime Behavior

The `int-sendgrid-email` skill is active only when it is enabled and `apikey` is set.

Auth: `Authorization: Bearer <your API key>`.
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
