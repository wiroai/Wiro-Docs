# Google Web Search Integration

Give your agent real open-web search — clean, structured Google results instead of scraped HTML — so content, research, and marketing agents can find current sources before they write.

## Overview

The Google Web Search integration calls the **Google Programmable Search / Custom Search JSON API v1** with the operator's own Google API key and a Programmable Search Engine ID (`cx`). The agent gets ranked results as JSON (title, link, snippet), then reads the most relevant pages with its `web_fetch` tool. No HTML scraping, no bot-blocking.

This is a **static API-key integration** — the same simple auth pattern as [WordPress](/docs/integration-wordpress-skills), no OAuth and no service account. Each operator brings their own Google project, so the free quota (100 queries/day) and any overage billing stay under their control.

**Skills that use this integration:**

- `int-google-search` — Search the public web via the Custom Search JSON API. Supports freshness (`dateRestrict`), locale (`gl` / `hl` / `lr`), and site filters; returns `title` / `link` / `snippet` for downstream `web_fetch`.

**Agents that typically enable this integration:**

- [Blog Content Editor](https://wiro.ai/agents/blog-content-editor) — research trending models / news and find a fresh angle before drafting.
- [Social Manager](https://wiro.ai/agents/social-manager) / [Newsletter Manager](https://wiro.ai/agents/newsletter-manager) — source current, on-topic material.
- Custom research or marketing agents that need the live public web.

## Availability

| Mode | Status | Notes |
|------|--------|-------|
| API Key + Search Engine ID (cx) | Available | A Google Cloud API key with the Custom Search API enabled, plus a Programmable Search Engine configured to "Search the entire web". |

## Prerequisites

- **A Wiro API key** — [Authentication](/docs/authentication).
- **A deployed agent** — [Agent Overview](/docs/agent-overview).
- **A Google account.**
- **A Google Cloud project** to host the API key and the Custom Search API.

## Setup

### Step 1: Create the API key and enable the Custom Search API

1. Open [Google Cloud Console → APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials) and pick or create a project.
2. Click **Create credentials → API key** and copy the key (it starts with `AIza`).
3. In the same project open **Enabled APIs & Services → + Enable APIs**, search **Custom Search API**, and enable it.

### Step 2: Create a Programmable Search Engine (cx)

1. Go to the [Programmable Search Engine control panel](https://programmablesearchengine.google.com/controlpanel/all) and click **Add**.
2. Give it any name and create it, then open **Setup → Basics** and turn **"Search the entire web"** ON.
3. Copy the **Search engine ID** (`cx`, looks like `a12bc3d4e5f6g7h8i`).

### Step 3: Save credentials to Wiro

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/CredentialUpsert" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "fields": [
      { "credentialkey": "google-search", "fieldname": "apikey", "fieldvalue": "AIza..." },
      { "credentialkey": "google-search", "fieldname": "cx",     "fieldvalue": "a12bc3d4e5f6g7h8i" }
    ]
  }'
```

Or fill them in the panel: **[My Agents](https://wiro.ai/panel/agents)** → open agent → **Credentials → Google Web Search**.

### Step 4: Enable the skill

Google Web Search ships **available but off**. Turn `int-google-search` on for the agent:

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/SkillsApply" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "skills": [ { "name": "int-google-search", "enabled": true } ]
  }'
```

Or flip the toggle in the panel under **Skills**.

### Step 5: Start the agent

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Start" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "guid": "your-useragent-guid" }'
```

## Credential Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `apikey` | string (secret) | Yes | Google Cloud API key with the Custom Search API enabled. Encrypted at rest. |
| `cx` | string | Yes | Programmable Search Engine ID. A public identifier (it appears in request URLs), so it is stored in plain text — not a secret. |

## Credentials schema (as returned by `POST /UserAgent/Detail`)

```json
"google-search": {
  "_connected": true,
  "optional": true,
  "extra": true,
  "apikey": "***encrypted***",
  "cx": "a12bc3d4e5f6g7h8i"
}
```

`optional` and `extra` are `true` because Google Web Search is an optional add-on: its credential card surfaces on the content presets even before the skill is toggled on.

## Query options

The skill builds a single request to `https://www.googleapis.com/customsearch/v1`. Beyond the required `key`, `cx`, and `q`, the useful parameters are:

| Param | Description |
|-------|-------------|
| `num` | Results per page, 1–10 (default 10). |
| `start` | 1-based index of the first result for pagination (1, 11, 21 …); the API reaches at most 100 results. |
| `dateRestrict` | Freshness filter: `d[n]` days, `w[n]` weeks, `m[n]` months, `y[n]` years (e.g. `d7` = past week). Use for news / "latest". |
| `sort` | `date` to sort by recency instead of relevance. |
| `gl` / `hl` / `lr` | Country bias / interface language / language restrict (e.g. `gl=us`, `hl=en`, `lr=lang_en`). |
| `siteSearch` + `siteSearchFilter` | Limit to (`i`) or exclude (`e`) a domain, e.g. `siteSearch=reuters.com&siteSearchFilter=i`. |
| `safe` | `active` to filter explicit results, `off` otherwise. |

## Quota & billing

- **Free tier:** 100 queries/day per Google project.
- **Beyond free:** $5 per 1,000 queries, up to 10,000/day.

Google's search quota and cost are billed by **Google** to the operator's own Google Cloud account — separate from Wiro credits. The skill's own turns are billed by Wiro on real LLM token usage like any other skill.

## Troubleshooting

- **400 `invalid argument`:** Malformed query or a bad `cx`. Check the Search engine ID and that **"Search the entire web"** is ON.
- **403 `accessNotConfigured` / "API not enabled":** The Custom Search API isn't enabled in the Cloud project. Re-do Step 1.
- **403 `dailyLimitExceeded` / quota:** The 100/day free quota is exhausted — wait for reset or enable billing in Google Cloud.
- **429:** Rate limited — the agent stops for the turn instead of hammering.
- **Empty `items`:** Zero results for the query — the agent reports "no results" rather than retrying.
- **Agent says "not connected" with both fields filled:** The agent restarts to pick up new credentials; give it a moment after saving, then retry.

## Related

- [Agent Credentials & OAuth](/docs/agent-credentials)
- [Agent Skills](/docs/agent-skills)
- [WordPress Skills](/docs/integration-wordpress-skills) — same static API-key auth pattern
- [Blog Content Editor use cases](/docs/agent-use-cases)
