# Lemlist Integration

Connect your agents to Lemlist for cold email outreach and campaign orchestration.

## Overview

The Lemlist integration uses Lemlist's API key for managing campaigns, leads, and custom variables.

**Skills that use this integration:**

- `lemlist-outreach` — Campaign creation, lead uploads, pause/resume

**Agents that typically enable this integration:**

- Lead Gen Manager

## Availability

| Mode | Status | Notes |
|------|--------|-------|
| API key | Available | Standard Lemlist API key. |

## Prerequisites

- **A Wiro API key** — see [Authentication](/docs/authentication).
- **A deployed agent** — see [Agent Overview](/docs/agent-overview).
- **A Lemlist account** (Gold tier or higher for full API access).

## Setup

### Step 1: Get an API key

1. Sign in to [app.lemlist.com](https://app.lemlist.com/).
2. Go to **Settings → Integrations → API**.
3. Click **Generate** (or copy existing). Keys look like `AbCdEfGhIjKlMnOp`.

### Step 2: Save to Wiro

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Update" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "guid": "your-useragent-guid",
    "configuration": {
      "credentials": {
        "lemlist": {
          "apiKey": "YOUR_LEMLIST_API_KEY"
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
| `apiKey` | string | Lemlist API key. |

## Troubleshooting

- **401 Unauthorized:** Key revoked in Lemlist settings. Regenerate.
- **403 on campaign operations:** Plan tier lacks API write access. Check Lemlist plan.
- **Email address not found:** Lead must exist in at least one campaign before some endpoints work — upload them first.

## Related

- [Agent Credentials & OAuth](/docs/agent-credentials)
- [Agent Overview](/docs/agent-overview)
- [Agent Skills](/docs/agent-skills)
- [Lemlist API docs](https://developer.lemlist.com/)
