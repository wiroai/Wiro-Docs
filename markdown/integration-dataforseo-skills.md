# DataForSEO Integration

Give your agent keyword, search and app store data from your own DataForSEO account: search volume, CPC and competition, keyword difficulty, related keywords, SERP features, Google Trends, local map rankings, Google Shopping prices and app store rankings.

## Overview

[DataForSEO](https://dataforseo.com) sells SEO and marketing data through a pay-as-you-go API. This integration connects an agent to your own DataForSEO account with its API login and API password, so content, SEO, ads and app marketing agents work from real numbers instead of guesses. The agent only reads data: every answer names DataForSEO as the source, gives the date of the numbers and says what the requests cost.

**Skills that use this integration:**

- `int-dataforseo`: Read-only research through the DataForSEO API: Google Ads search volume, CPC and competition for up to 1,000 keywords per request, DataForSEO Labs keyword difficulty, related keywords and keyword ideas, Google SERP features (featured snippets, People Also Ask, local packs, AI Overviews), Google Trends, Google Maps rankings by coordinate (a local rank grid), Google Shopping prices and Google Play / App Store rankings.

**Agents that typically enable this integration:**

- [Blog Content Editor](https://wiro.ai/agents/blog-content-editor): pick topics with real search volume and difficulty, and see what Google already shows for them, before drafting.
- [Google Ads Manager](https://wiro.ai/agents/google-ads-manager): check search volume, CPC and competition before adding keywords.
- Custom SEO, local marketing, e-commerce and app marketing agents.

## Availability

| Mode | Status | Notes |
|------|--------|-------|
| API Login + API Password (DataForSEO) | Available | The API login and API password from your DataForSEO dashboard. DataForSEO bills each request to your own balance (pay-as-you-go). No extra charge on the agent: like every skill, it is included in every plan. |

## Prerequisites

- **A Wiro API key** (see [Authentication](/docs/authentication)).
- **A deployed agent** (see [Agent Overview](/docs/agent-overview)).
- **A DataForSEO account** with balance. New accounts get a $1 trial credit; the minimum top-up is $50.

## Setup

### Step 1: Copy your DataForSEO API login and API password

1. Sign up or sign in at [app.dataforseo.com](https://app.dataforseo.com/register).
2. Open **API Access** in the dashboard menu ([app.dataforseo.com/api-access](https://app.dataforseo.com/api-access)).
3. Copy the **API login**. On newer accounts it is a string DataForSEO generated; on older accounts it can be your sign-up email.
4. Copy the **API password**. It is shown for the first 24 hours after you sign up; after that, click **Send by e-mail** and DataForSEO mails it to your account address.

> The API password is not the password you sign in to DataForSEO with. Using the sign-in password is the most common cause of a `40100` "not authorized" error.

### Step 2: Save the credential to Wiro

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/CredentialUpsert" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "fields": [
      { "credentialkey": "dataforseo", "fieldname": "login", "fieldvalue": "YOUR_DATAFORSEO_API_LOGIN" },
      { "credentialkey": "dataforseo", "fieldname": "password", "fieldvalue": "YOUR_DATAFORSEO_API_PASSWORD" }
    ]
  }'
```

Or fill it in the panel: **[My Agents](https://wiro.ai/panel/agents)** → open agent → **Connectors → DataForSEO**.

### Step 3: Enable the skill

DataForSEO ships **available but off**. Turn `int-dataforseo` on for the agent:

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/SkillsApply" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "skills": { "int-dataforseo": true },
    "idempotencyKey": "550e8400-e29b-41d4-a716-446655440000"
  }'
```

Or flip the toggle in the panel under **Skills** (see [Agent Skills](/docs/agent-skills#toggling-integration-skills)).

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
| `login` | string | Yes | DataForSEO API login, from the API Access page. One word with no colon. Encrypted at rest. |
| `password` | string (secret) | Yes | DataForSEO API password, not the sign-in password. Encrypted at rest. |

## Credentials schema (as returned by `POST /UserAgent/Detail`)

```json
"dataforseo": {
  "_connected": true,
  "optional": false,
  "extra": false,
  "login": "your-api-login",
  "password": "••••••••"
}
```

## What the agent can pull

The agent calls the DataForSEO v3 API at `https://api.dataforseo.com/v3/` with HTTP Basic auth (your API login and API password), sends a whole keyword list in one request, and checks DataForSEO's own `status_code` in every answer: DataForSEO can answer HTTP 200 with an error inside.

| Data | DataForSEO endpoint | How | Date the agent reports |
|------|---------------------|-----|------------------------|
| Search volume, CPC and competition (up to 1,000 keywords) | Keywords Data: Google Ads Search Volume | Live | The 12 months the monthly average covers |
| Keyword difficulty (up to 1,000 keywords) | DataForSEO Labs: Bulk Keyword Difficulty | Live | The Labs data update date |
| Related keywords and keyword ideas | DataForSEO Labs: Related Keywords, Keyword Ideas | Live | Each keyword's last update |
| SERP features for a query | SERP: Google Organic (advanced) | Live | When DataForSEO loaded the page |
| Interest over time (up to 5 keywords) | Keywords Data: Google Trends Explore | Live | The window of the graph |
| Google Maps rank at a point, local rank grid | SERP: Google Maps (advanced) at a coordinate | Live, one request per grid point | When each point was loaded |
| Google Shopping prices | Merchant: Google Shopping Products | Posted, then collected | When DataForSEO loaded the results |
| App store rankings for a keyword | App Data: Google Play and App Store App Searches | Posted, then collected | When DataForSEO loaded the results |
| Keywords an app ranks for (United States, English) | DataForSEO Labs: Keywords For App | Live | Each ranking's last check |

Results are aggregate: keywords, volumes, ranks, prices, domains and business or app names. When DataForSEO fails, the agent says so; it never falls back to another source or to scraping Google.

### Local rank grid

Google ranks local results by where the searcher is, so a business ranks differently across its area. For a local rank grid the agent runs the same Google Maps search from evenly spaced points around the business (3 x 3 by default, up to 5 x 5, at a spacing you choose), one request per point, and reports the business's rank at each point in a table laid out like the map, with its average rank and the number of points where it is in the top 3.

### Posted tasks

Google Shopping and app store searches have no live mode at DataForSEO. The agent posts every query in one request, then collects each result by its task id; collecting is free for 30 days. When results are not ready within the turn, the agent lists the task ids and collects them on your next request.

## Cost & billing

- **DataForSEO** bills each request to your own DataForSEO balance, pay-as-you-go with no subscription, and funds do not expire. The agent reports the cost DataForSEO returns with each answer. Location lookups, the balance check and collecting a posted task are free. See [DataForSEO pricing](https://dataforseo.com/pricing) for each API's rates.
- **The agent:** every plan includes the integration, so it changes neither the agent's price nor its credits. As with every agent turn, the work is billed on the LLM tokens it uses, from the agent's existing credits.

## Troubleshooting

- **`40100` / HTTP 401 (not authorized):** The API login or API password is wrong. Copy both again from API Access; the API password is not your sign-in password.
- **`40200` / `40210` (balance):** Your DataForSEO balance is too low. Top it up in the DataForSEO dashboard.
- **`40104`:** Your DataForSEO account is not verified yet. Complete the verification in the DataForSEO dashboard.
- **`40207` (IP not allowed):** Your DataForSEO account accepts API requests only from the IP addresses on its allowlist. Clear the allowlist in the API Access section of the DataForSEO dashboard so the agent can connect.
- **`40202` (rate limit):** Too many requests in a minute; Google Ads volume requests are limited to 12 a minute per account. The agent retries once, then stops.
- **"Results are being prepared":** A posted Google Shopping or app store task is still in DataForSEO's queue. Ask again in a few minutes; the agent collects it by its task id.
- **Agent says "not connected" with both fields filled:** The agent restarts to pick up new credentials; give it a moment after saving, then retry.

## Related

- [Agent Credentials & OAuth](/docs/agent-credentials)
- [Agent Skills](/docs/agent-skills)
- [Serper Web Search Integration](/docs/integration-serper-search-skills)
- [Google Ads Integration](/docs/integration-googleads-skills)
