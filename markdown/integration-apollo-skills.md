# Apollo.io Integration

Connect your agent to Apollo.io for lead generation, prospecting, and email sequence enrollment.

## Overview

The Apollo integration uses Apollo's `x-api-key` header authentication.

**Skills that use this integration:**

- `apollo-sales` — Lead search, enrichment, sequence enrollment, reply handling

**Agents that typically enable this integration:**

- Lead Gen Manager

## Availability

| Mode | Status | Notes |
|------|--------|-------|
| API Key | Available | Apollo REST API keys. |

## Prerequisites

- **A Wiro API key** — [Authentication](/docs/authentication).
- **A deployed agent** — [Agent Overview](/docs/agent-overview).
- **An Apollo.io account** on a plan that includes API access.

## Setup

### Step 1: Get an Apollo API key

1. [app.apollo.io](https://app.apollo.io/) → **Settings → Integrations → API** (or **Account settings → API keys**).
2. **Create new key**, name "Wiro agent", copy value.

### Step 2 (optional): Get a Master API Key

Some Apollo plans require a separate **Master API Key** for the `mixed_people/api_search` endpoint (people search) and for sequence management. Find it in **Admin → API keys** (workspace admins only). Enrichment, lookups, and basic read operations use the standard `apiKey`.

### Step 3: Save to Wiro

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Update" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "guid": "your-useragent-guid",
    "configuration": {
      "credentials": {
        "apollo": {
          "apiKey": "YOUR_APOLLO_API_KEY",
          "masterApiKey": "YOUR_APOLLO_MASTER_API_KEY"
        }
      }
    }
  }'
```

`masterApiKey` is optional — omit if your agent only does enrichment and lookups. Required for people search (`mixed_people/api_search`) and sequence management.

### Step 4: Start the agent

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Start" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "guid": "your-useragent-guid" }'
```

## Credential Fields

| Field | Type | Description |
|-------|------|-------------|
| `apiKey` | string | Primary Apollo API key. |
| `masterApiKey` | string (optional) | Master API key for people search + sequence management. |

## Runtime Behavior

Env vars (exported **only when `apollo-sales` skill is enabled** and `apiKey` is set):

- `APOLLO_API_KEY` ← `credentials.apollo.apiKey`
- `APOLLO_MASTER_KEY` ← `credentials.apollo.masterApiKey` (only if set)

**Endpoint-based key selection** — the `apollo-sales` skill picks the header per endpoint:

| Endpoint group | Header | Env var |
|----------------|--------|---------|
| People Search (`POST /mixed_people/api_search`) | `x-api-key: $APOLLO_MASTER_KEY` | **Requires `masterApiKey`** |
| Sequence management (create sequence, add contacts, start/pause) | `x-api-key: $APOLLO_MASTER_KEY` | **Requires `masterApiKey`** |
| People enrichment (`POST /people/match`) | `x-api-key: $APOLLO_API_KEY` | `apiKey` sufficient |
| Organization lookup | `x-api-key: $APOLLO_API_KEY` | `apiKey` sufficient |
| Email verification | `x-api-key: $APOLLO_API_KEY` | `apiKey` sufficient |

Base URL: `https://api.apollo.io/api/v1`.

Rate limits: Apollo enforces strict per-key limits; 429 responses require 60s backoff.

**If `masterApiKey` is missing:** People search and sequence endpoints return **401 Unauthorized** with `"error": "Invalid Api Key"`. This is expected — even though `apiKey` works for other endpoints, Apollo's master-only endpoints reject the regular key. Add `masterApiKey` via `POST /UserAgent/Update` and the same agent can immediately use master-only endpoints (no restart needed if the cron picks up env changes on next run).

## Troubleshooting

- **403 Forbidden:** Plan doesn't include API access. Upgrade to Professional tier or higher.
- **429 Too Many Requests:** Rate limit hit. Space prospecting runs or request higher tier from Apollo support.
- **401 on `mixed_people/api_search`:** Missing `masterApiKey`. Add it (workspace admins: Apollo → Admin → API keys).
- **Sequence enrollment fails:** Missing `masterApiKey`. Same fix — master key is required for write operations on sequences.

## Related

- [Agent Credentials & OAuth](/docs/agent-credentials)
- [Agent Overview](/docs/agent-overview)
- [Agent Skills](/docs/agent-skills)
- [Apollo.io API docs](https://apolloio.github.io/apollo-api-docs/)
