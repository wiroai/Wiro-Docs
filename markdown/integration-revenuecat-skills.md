# RevenueCat Integration

Connect your agent to RevenueCat subscription analytics: MRR, revenue, active subscriptions and trials, churn, conversion, retention and LTV charts, read with your own RevenueCat secret API key. Aggregate numbers only, never customer records.

## Overview

[RevenueCat](https://www.revenuecat.com) runs in-app subscriptions across the App Store, Google Play, Stripe, Amazon and its own web billing. This integration lets an agent read your project's aggregate subscription numbers through the RevenueCat REST API v2: the same overview cards and charts the RevenueCat dashboard shows.

**Skills that use this integration:**

- `int-revenuecat`: Read-only RevenueCat reporting. Overview metrics (MRR, active subscriptions, active trials, revenue, new and active customers), revenue for any date range, charts (revenue, MRR, ARR, churn, trials, trial and paid conversion, retention, LTV, refunds, cohorts) by date range and resolution with the filters and segments each chart offers, and the project's apps, products, offerings and entitlements.

**Agents that typically enable this integration:**

- Custom app-growth and reporting agents that answer questions about subscription revenue.
- Any agent that reports on an app's subscription business next to its ads or store numbers.

## Availability

| Mode | Status | Notes |
|------|--------|-------|
| Secret API key (RevenueCat REST API v2) | Available | One read-only v2 secret key per agent. It reads the RevenueCat project the key belongs to. No extra charge: like every skill, it is included in every plan. |

## Prerequisites

- **A Wiro API key** (see [Authentication](/docs/authentication)).
- **A deployed agent** (see [Agent Overview](/docs/agent-overview)).
- **A RevenueCat project**, and a project admin who can create its API keys.

## Setup

### Step 1: Create a RevenueCat v2 secret key

1. Sign in to [RevenueCat](https://app.revenuecat.com) and open your project.
2. Open **Project settings**, then **API keys**.
3. Click **+ New secret API key**, give it a name (for example `Wiro agent`) and choose version **V2**.
4. Set its permissions: read-only for **Charts & Metrics** (overview and charts) and **Project configuration**, and no access to **Customer information**.
5. Create the key and copy it. It starts with `sk_`.

> A v1 key does not work with the v2 API. The agent never reads customer data, so the key needs no Customer information access. Deleting the key in RevenueCat cuts the agent off immediately.

### Step 2: Save the credential to Wiro

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/CredentialUpsert" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "fields": [
      { "credentialkey": "revenuecat", "fieldname": "apikey", "fieldvalue": "sk_YOUR_REVENUECAT_KEY" }
    ]
  }'
```

Or fill it in the panel: **[My Agents](https://wiro.ai/panel/agents)** → open agent → **Connectors → RevenueCat**.

### Step 3: Turn on the skill

RevenueCat Metrics ships **available but off**. Turn `int-revenuecat` on for the agent:

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/SkillsApply" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "skills": { "int-revenuecat": true },
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
| `apikey` | string (secret) | Yes | RevenueCat REST API v2 secret key, starting with `sk_`. Encrypted at rest. |

## Credentials schema (as returned by `POST /UserAgent/Detail`)

```json
"revenuecat": {
  "_connected": true,
  "optional": false,
  "extra": false,
  "apikey": "••••••••"
}
```

On an agent you build yourself with `int-revenuecat` on, the card is required (`optional: false`): the agent's setup is complete once the key is saved.

## What the agent reports

| Source | What it gives |
|--------|---------------|
| Overview | Active Trials, Active Subscriptions and MRR as of now; Revenue, New Customers and Active Customers for the last 28 days. |
| Revenue | Gross revenue, revenue net of taxes, or proceeds (after taxes and store commissions) for any date range. |
| Charts | `revenue`, `mrr`, `arr`, `actives`, `trials`, `churn`, `trial_conversion_rate`, `initial_conversion`, `conversion_to_paying`, `subscription_retention`, `ltv_per_customer`, `ltv_per_paying_customer`, `cohort_explorer`, `refund_rate` and the rest of RevenueCat's charts, by day, week, month, quarter or year, with the filters and segments each chart offers (such as country, store, product or app). |
| Configuration | Apps, products, offerings (and which one is current) and entitlements. |

Every report names its source and its date range. Chart dates are in UTC, as in RevenueCat's charts. A partial period (the current one, or a first period that starts mid-way) is called out and left out of trends, and money is shown in the currency RevenueCat returns (USD unless you ask for another).

## Privacy

The agent reads aggregate numbers only. It never reads customers, subscribers, subscriptions, purchases, invoices, audiences or collaborators, and requests to customer endpoints are refused. A question about one customer is declined.

## Billing

Every plan includes the integration, so it changes neither the agent's price nor its credits. As with every agent turn, reports are billed on the LLM tokens they use, from the agent's existing credits.

## Rate limits

RevenueCat allows each key 25 Charts & Metrics requests a minute (overview, revenue and charts) and 60 Project configuration requests a minute. The agent keeps its calls few; when RevenueCat asks it to slow down, it waits and retries once.

## Troubleshooting

- **401:** The key was revoked or mistyped, or it is a v1 key. Create a new v2 secret key and save it again.
- **403:** The key lacks a permission. Give it read access to Charts & Metrics and Project configuration.
- **429:** RevenueCat's rate limit. The agent waits the time RevenueCat names and retries once.
- **Numbers differ from App Store Connect or Google Play:** RevenueCat counts differently; for example, Google counts trials as active subscriptions and RevenueCat does not.
- **Agent says "not connected" with the key filled:** The agent restarts to pick up new credentials; give it a moment after saving, then retry.

## Related

- [Agent Credentials & OAuth](/docs/agent-credentials)
- [Agent Skills](/docs/agent-skills)
- [Adapty Integration](/docs/integration-adapty-skills)
- [Roasit Integration](/docs/integration-roasit-skills)
