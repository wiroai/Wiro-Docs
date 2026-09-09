# Google Web Search Integration

Give your agent real Google search results as clean JSON — via Serper.dev — so content, research, and marketing agents can find current sources before they write.

## Overview

This integration returns Google's organic results as structured JSON (title, link, snippet) through [Serper.dev](https://serper.dev). The agent gets ranked Google results, then reads the most relevant pages with its `web_fetch` tool — no HTML scraping, no bot-blocking.

**Why Serper and not Google's own API?** Google's Custom Search JSON API is being retired (it shuts down on 2027-01-01) and no longer offers a whole-web mode for new engines. Serper returns the same Google results with none of the Google Cloud / `cx` setup, plus a generous free tier.

**Skills that use this integration:**

- `int-serper-search` — Search the web via Serper's Google Search endpoint. Supports freshness (`tbs`) and locale (`gl` / `hl`); returns `title` / `link` / `snippet` for downstream `web_fetch`.

**Agents that typically enable this integration:**

- [Blog Content Editor](https://wiro.ai/agents/blog-content-editor) — research trending models / news and find a fresh angle before drafting.
- [Social Manager](https://wiro.ai/agents/social-manager) / [Newsletter Manager](https://wiro.ai/agents/newsletter-manager) — source current, on-topic material.
- Custom research or marketing agents that need the live public web.

## Availability

| Mode | Status | Notes |
|------|--------|-------|
| API Key (Serper.dev) | Available | A Serper.dev API key. Returns real Google results as JSON. Free tier: 2,500 searches; then ~$1 per 1,000. |

## Prerequisites

- **A Wiro API key** — [Authentication](/docs/authentication).
- **A deployed agent** — [Agent Overview](/docs/agent-overview).
- **A Serper.dev account** — free, no credit card.

## Setup

### Step 1: Get a Serper.dev API key

1. Sign up at [serper.dev](https://serper.dev) — no credit card; new accounts get **2,500 free searches**.
2. Open the dashboard and copy your **API key** from the **API Key** section.

> No Google Cloud project, no Programmable Search Engine, and no `cx` — Serper handles whole-web Google search behind a single key.

### Step 2: Save the credential to Wiro

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/CredentialUpsert" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "fields": [
      { "credentialkey": "serper", "fieldname": "apikey", "fieldvalue": "YOUR_SERPER_API_KEY" }
    ]
  }'
```

Or fill it in the panel: **[My Agents](https://wiro.ai/panel/agents)** → open agent → **Credentials → Google Web Search**.

### Step 3: Enable the skill

Google Web Search ships **available but off**. Turn `int-serper-search` on for the agent:

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/SkillsApply" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "skills": [ { "name": "int-serper-search", "enabled": true } ]
  }'
```

Or flip the toggle in the panel under **Skills**.

### Step 4: Start the agent

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Start" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "guid": "your-useragent-guid" }'
```

## Credential Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `apikey` | string (secret) | Yes | Serper.dev API key. Encrypted at rest. |

## Credentials schema (as returned by `POST /UserAgent/Detail`)

```json
"serper": {
  "_connected": true,
  "optional": true,
  "extra": true,
  "apikey": "***encrypted***"
}
```

`optional` and `extra` are `true` because Google Web Search is an optional add-on: its credential card surfaces on the content presets even before the skill is toggled on.

## Query options

The skill sends a single `POST https://google.serper.dev/search` with an `X-API-KEY` header and a JSON body. Beyond the required `q`, the useful fields are:

| Field | Description |
|-------|-------------|
| `q` | Query string (required). |
| `num` | Results to return (default 10). More than 10 counts as 2 searches on the Serper quota. |
| `page` | 1-based page number for pagination. |
| `gl` / `hl` | Country bias / interface language (e.g. `gl=us`, `hl=en`). |
| `tbs` | Freshness filter: `qdr:d` day, `qdr:w` week, `qdr:m` month, `qdr:y` year. |
| `autocorrect` | `true` / `false` (default true). |

Results are in `.organic[]` (`title`, `link`, `snippet`, `position`); a response may also carry `answerBox`, `knowledgeGraph`, `peopleAlsoAsk` and `relatedSearches`. Other endpoints on the same host/header: `/news`, `/images`, `/scholar`, `/places`, `/shopping`.

## Quota & billing

- **Free tier:** 2,500 searches per Serper account (no credit card).
- **Beyond free:** about $1 per 1,000 searches, dropping toward $0.30 at scale. Credits expire 6 months after purchase.

Serper's search quota and cost are billed by **Serper** to the operator's own account — separate from Wiro credits. The skill's own turns are billed by Wiro on real LLM token usage like any other skill.

## Troubleshooting

- **401 / 403:** API key missing or invalid — re-copy it from the Serper dashboard.
- **400:** Malformed JSON body or missing `q`.
- **429:** Out of Serper credits or rate limited — top up credits or slow down.
- **Empty `organic`:** Zero results for the query — the agent reports "no results" rather than retrying.
- **Agent says "not connected" with the key filled:** The agent restarts to pick up new credentials; give it a moment after saving, then retry.

## Related

- [Agent Credentials & OAuth](/docs/agent-credentials)
- [Agent Skills](/docs/agent-skills)
- [Blog Content Editor use cases](/docs/agent-use-cases)
