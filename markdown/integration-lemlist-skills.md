# Lemlist Integration

Connect your agent to Lemlist for cold email outreach and campaign orchestration.

## Overview

The Lemlist integration uses HTTP Basic Authentication with an empty username and the API key as the password.

**Skills that use this integration:**

- `lemlist-outreach` — Campaign creation, lead uploads, pause/resume

**Agents that typically enable this integration:**

- Lead Gen Manager

## Availability

| Mode | Status | Notes |
|------|--------|-------|
| API Key | Available | Lemlist API key (Gold tier or higher). |

## Prerequisites

- **A Wiro API key** — [Authentication](/docs/authentication).
- **A deployed agent** — [Agent Overview](/docs/agent-overview).
- **A Lemlist account** on Gold tier or higher for full API access.

## Setup

### Step 1: Get an API key

1. [app.lemlist.com](https://app.lemlist.com/) → **Settings → Integrations → API**.
2. Click **Generate** (or copy existing). Keys look like `AbCdEfGhIjKlMnOp`.

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

## Runtime Behavior

Env vars (exported **only when `lemlist-outreach` skill is enabled** and `apiKey` is set):

- `LEMLIST_API_KEY` ← `credentials.lemlist.apiKey`

Auth: **Basic auth with empty username** — `--user ":$LEMLIST_API_KEY"`. (Lemlist treats the API key as the password, with no username.)
Base URL: `https://api.lemlist.com/api`.

Rate limits: ~20 requests per 2 seconds; 429 requires backoff.

## Troubleshooting

- **401 Unauthorized:** API key revoked in Lemlist settings. Regenerate.
- **403 on campaign operations:** Plan tier lacks API write access. Upgrade.
- **Email address not found:** Lead must exist in at least one campaign before some endpoints work — upload leads first.

## Related

- [Agent Credentials & OAuth](/docs/agent-credentials)
- [Agent Overview](/docs/agent-overview)
- [Agent Skills](/docs/agent-skills)
- [Lemlist API docs](https://developer.lemlist.com/)
