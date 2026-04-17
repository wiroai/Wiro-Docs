# Apollo.io Integration

Connect your agents to Apollo.io for lead generation, prospecting, and email sequence enrollment.

## Overview

The Apollo integration uses Apollo.io's API key authentication for lead discovery, enrichment, and (optionally) sequence management.

**Skills that use this integration:**

- `apollo-sales` — Lead search, enrichment, sequence enrollment

**Agents that typically enable this integration:**

- Lead Gen Manager

## Availability

| Mode | Status | Notes |
|------|--------|-------|
| API key | Available | Apollo.io REST API key with per-account scoping. |

## Prerequisites

- **A Wiro API key** — see [Authentication](/docs/authentication).
- **A deployed agent** — see [Agent Overview](/docs/agent-overview).
- **An Apollo.io account** on a plan that allows API access.

## Setup

### Step 1: Get an Apollo API key

1. Sign in to [app.apollo.io](https://app.apollo.io/).
2. Go to **Settings → Integrations → API** (or **Account settings → API keys** depending on plan).
3. Click **Create new key**, name it "Wiro agent", copy the value.

### Step 2: (Optional) Get a Master API Key for sequence management

Some Apollo plans require a separate **Master API Key** to manage email sequences. This is exposed under **Admin → API keys** for workspace admins.

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

`masterApiKey` is optional — omit it if your agent only does lead search/enrichment without sequence management.

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
| `masterApiKey` | string (optional) | Master API key for sequence management. |

## Troubleshooting

- **403 Forbidden:** Plan does not include API access. Upgrade at Apollo to Professional tier or higher.
- **429 Too Many Requests:** Apollo enforces strict per-key rate limits. Space out large prospecting runs or contact Apollo support for a higher tier.
- **Sequence enrollment fails:** Missing `masterApiKey`. Add it and re-try.

## Related

- [Agent Credentials & OAuth](/docs/agent-credentials)
- [Agent Overview](/docs/agent-overview)
- [Agent Skills](/docs/agent-skills)
- [Apollo.io API docs](https://apolloio.github.io/apollo-api-docs/)
