# Adapty Integration

Connect your agent to Adapty subscription analytics: revenue, MRR, ARR, subscriptions, trials, conversions, funnels, retention, LTV and install cohorts, read with your app's Adapty secret API key. Aggregate numbers only, never user profiles.

## Overview

[Adapty](https://adapty.io) runs in-app subscriptions and paywalls for mobile apps. This integration lets an agent read the numbers the Adapty Dashboard's analytics show for one app, through Adapty's Analytics Export API.

**Skills that use this integration:**

- `int-adapty`: Read-only Adapty reporting. Charts (revenue, proceeds and net revenue, MRR, ARR, ARPU, ARPPU, active and new subscriptions, trials, cancellations, expirations, refunds, installs), conversion rates, funnels, retention, LTV and install cohorts, by date range with an optional comparison period, filters (country, store, product, segment, attribution, offer) and one grouping per report.

**Agents that typically enable this integration:**

- Custom app-growth and reporting agents that answer questions about subscription revenue.
- Any agent that reports on an app's subscription business next to its ads or store numbers.

## Availability

| Mode | Status | Notes |
|------|--------|-------|
| Secret API key (Adapty Analytics Export API) | Available | One Adapty secret key per agent. Adapty keys belong to one app, so the agent reports on that app. No extra charge: like every skill, it is included in every plan. |

## Prerequisites

- **A Wiro API key** (see [Authentication](/docs/authentication)).
- **A deployed agent** (see [Agent Overview](/docs/agent-overview)).
- **An Adapty app** with subscription data, and access to its App settings.

## Setup

### Step 1: Copy the app's Adapty secret key

1. Sign in to the [Adapty Dashboard](https://app.adapty.io) and pick the app.
2. Open [App settings](https://app.adapty.io/settings/general) and stay on the **General** tab.
3. In **API keys**, copy the **Secret key**. It starts with `secret_live_`.

> The agent uses the key only with Adapty's Analytics Export API and reads aggregate analytics only, never user profiles. To cut the agent off, click **Generate new key** in App settings and delete the old key.

### Step 2: Save the credential to Wiro

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/CredentialUpsert" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "fields": [
      { "credentialkey": "adapty", "fieldname": "apikey", "fieldvalue": "secret_live_YOUR_ADAPTY_KEY" }
    ]
  }'
```

Or fill it in the panel: **[My Agents](https://wiro.ai/panel/agents)** → open agent → **Connectors → Adapty**.

### Step 3: Turn on the skill

Adapty Analytics ships **available but off**. Turn `int-adapty` on for the agent:

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/SkillsApply" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "skills": { "int-adapty": true },
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
| `apikey` | string (secret) | Yes | The app's Adapty secret API key, starting with `secret_live_`. Encrypted at rest. |

## Credentials schema (as returned by `POST /UserAgent/Detail`)

```json
"adapty": {
  "_connected": true,
  "optional": false,
  "extra": false,
  "apikey": "••••••••"
}
```

On an agent you build yourself with `int-adapty` on, the card is required (`optional: false`): the agent's setup is complete once the key is saved.

## What the agent reports

| Report | What it gives |
|--------|---------------|
| Charts | `revenue` (with proceeds and net revenue), `mrr`, `arr`, `arpu`, `arppu`, `subscriptions_active`, `subscriptions_new`, `subscriptions_renewal_cancelled`, `subscriptions_expired`, `trials_active`, `trials_new`, `trials_renewal_cancelled`, `trials_expired`, `grace_period`, `billing_issue`, `refund_events`, `refund_money`, `non_subscriptions` and `installs`, by day, week, month, quarter or year. |
| Conversion | Conversion rates between subscription states, such as paid to more than 6 months. |
| Funnel | Users at each stage from install and paywall view to trial, paid and renewals, with drop-off. |
| Retention | Retention period by period, counted from the purchase or from the trial. |
| LTV | Realized lifetime value on revenue, proceeds and net revenue. |
| Cohorts | Install-date cohorts: installs, subscribers, revenue, ARPU and ARPPU per period, with Adapty's predictions. |

Every report can take a comparison period, filters (country, store, store product, subscription duration, offer, attribution, and Adapty segment, audience, paywall, placement or flow ids) and one grouping. Money is in USD, as Adapty exports it. Every report names its source and its date range; chart revenue counts on the day of each transaction, and cohort revenue on each user's install date.

## Privacy

The agent reads aggregate analytics only. It uses the key only with Adapty's Analytics Export API, never Adapty's server-side API, so it never reads user profiles. A question about one user is declined.

## Billing

Every plan includes the integration, so it changes neither the agent's price nor its credits. As with every agent turn, reports are billed on the LLM tokens they use, from the agent's existing credits.

## Rate limits

Adapty allows 2 requests a second per app, shared by all of the app's keys. The agent sends its calls one after another; when Adapty asks it to slow down, it waits about a minute and retries once.

## Troubleshooting

- **401:** The key was replaced or mistyped. Copy the app's current secret key from App settings and save it again.
- **400:** A filter or option Adapty does not accept, such as a product id without its store (`app_store:premium_monthly`). The agent reads Adapty's message and fixes the request once.
- **429:** Adapty's rate limit. The agent waits about a minute and retries once.
- **Numbers for another app:** One key reads one app. Connect that app's key on another agent.
- **Agent says "not connected" with the key filled:** The agent restarts to pick up new credentials; give it a moment after saving, then retry.

## Related

- [Agent Credentials & OAuth](/docs/agent-credentials)
- [Agent Skills](/docs/agent-skills)
- [RevenueCat Integration](/docs/integration-revenuecat-skills)
- [Roasit Integration](/docs/integration-roasit-skills)
