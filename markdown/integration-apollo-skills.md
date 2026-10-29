# Apollo.io Integration

Connect your agent to Apollo.io for lead generation, prospecting, and email sequence enrollment.

## Overview

The Apollo integration uses Apollo's `x-api-key` header authentication.

**Skills that use this integration:**

- `int-apollo-sales`: Lead search, enrichment, sequence enrollment, reply handling

**Agents that typically enable this integration:**

- Lead Generation Manager

## Availability

| Mode | Status | Notes |
|------|--------|-------|
| API Key | Available | Apollo REST API keys. |

## Prerequisites

- **A Wiro API key** (see [Authentication](/docs/authentication)).
- **A deployed agent** (see [Agent Overview](/docs/agent-overview)).
- **An Apollo.io account** on a plan that includes API access.

## Setup

### Step 1: Get an Apollo API key

1. [app.apollo.io](https://app.apollo.io/) → **Settings → Integrations → API** (or **Account settings → API keys**).
2. **Create new key**, name "Wiro agent", copy value.

### Step 2 (optional): Get a Master API Key

Some Apollo plans require a separate **Master API Key** for the `mixed_people/api_search` endpoint (people search) and for sequence management. Find it in **Admin → API keys** (workspace admins only). Enrichment, lookups, and basic read operations use the standard `apikey`.

### Step 3: Save to Wiro

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/CredentialUpsert" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "fields": [
      { "credentialkey": "apollo", "fieldname": "apikey",       "fieldvalue": "YOUR_APOLLO_API_KEY" },
      { "credentialkey": "apollo", "fieldname": "masterapikey", "fieldvalue": "YOUR_APOLLO_MASTER_API_KEY" }
    ]
  }'
```

`masterapikey` is optional: omit if your agent only does enrichment and lookups. Required for people search (`mixed_people/api_search`) and sequence management.

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
| `apikey` | string | Primary Apollo API key. |
| `masterapikey` | string (optional) | Master API key for people search + sequence management. |

## Credentials schema (as returned by `POST /UserAgent/Detail`)

```json
"apollo": {
  "_connected": false,
  "optional": true,
  "extra": false,
  "apikey": "",
  "masterapikey": ""
}
```

## Runtime Behavior

The `int-apollo-sales` skill is active only when it is enabled and `apikey` is set; `masterapikey` is optional.

**Endpoint-based key selection**. The `int-apollo-sales` skill picks the key per endpoint and sends it in the `x-api-key` header:

| Endpoint group | Key used | Requirement |
|----------------|----------|-------------|
| People Search (`POST /mixed_people/api_search`) | `masterapikey` | **Requires `masterapikey`** |
| Sequence management (create sequence, add contacts, start/pause) | `masterapikey` | **Requires `masterapikey`** |
| People enrichment (`POST /people/match`) | `apikey` | `apikey` sufficient |
| Organization lookup | `apikey` | `apikey` sufficient |
| Email verification | `apikey` | `apikey` sufficient |

Base URL: `https://api.apollo.io/api/v1`.

Rate limits: Apollo enforces strict per-key limits; 429 responses require 60s backoff.

**If `masterapikey` is missing:** People search and sequence endpoints return **401 Unauthorized** with `"error": "Invalid Api Key"`. This is expected: even though `apikey` works for other endpoints, Apollo's master-only endpoints reject the regular key. Add `masterapikey` via `POST /UserAgent/CredentialUpsert`; saving restarts a running agent, and it can use the master-only endpoints from then on.

## Troubleshooting

- **403 Forbidden:** Plan doesn't include API access. Upgrade to Professional tier or higher.
- **429 Too Many Requests:** Rate limit hit. Space prospecting runs or request higher tier from Apollo support.
- **401 on `mixed_people/api_search`:** Missing `masterapikey`. Add it (workspace admins: Apollo → Admin → API keys).
- **Sequence enrollment fails:** Missing `masterapikey`. Same fix: master key is required for write operations on sequences.

## Related

- [Agent Credentials & OAuth](/docs/agent-credentials)
- [Agent Overview](/docs/agent-overview)
- [Agent Skills](/docs/agent-skills)
- [Apollo.io API docs](https://apolloio.github.io/apollo-api-docs/)
