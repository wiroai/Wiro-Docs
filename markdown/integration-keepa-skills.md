# Keepa Integration

Give your agent Amazon price, sales rank and offer history from Keepa, read with your own Keepa API key, so pricing, catalog and competitor agents answer with real numbers and dates.

## Overview

[Keepa](https://keepa.com) tracks Amazon products and keeps their price, sales rank and offer history. This integration lets an agent read that history through the Keepa API with your own key: prices now, averages, the lowest and highest prices with their dates, daily or weekly price and rank tables, Amazon product search, best seller lists, categories and Keepa's product finder. It only reads data: nothing on Keepa or Amazon changes.

**Skills that use this integration:**

- `int-keepa`: Read-only Keepa API calls for product price and sales rank history (with statistics), product search, best sellers, category search and lookup, and the product finder. Every answer names the source (Keepa), the marketplace and the date range, and reports the Keepa tokens left.

**Agents that typically enable this integration:**

- Custom pricing, catalog and Amazon seller agents that watch competitor prices and sales ranks.
- Commerce agents that run a Shopify or WooCommerce store and want Amazon price context before they reprice.

## Availability

| Mode | Status | Notes |
|------|--------|-------|
| API Key (Keepa) | Available | Your own Keepa API access key (64 letters and digits) with an active Keepa API plan. The integration is included in every plan at no extra charge; Keepa tokens come from your Keepa plan. |

## Prerequisites

- **A Wiro API key** (see [Authentication](/docs/authentication)).
- **A deployed agent** (see [Agent Overview](/docs/agent-overview)).
- **A Keepa account with an active API plan** ([keepa.com/api/pricing](https://keepa.com/api/pricing)). Keepa says a Keepa Pro subscription includes a small API allowance, enough to try it; an API plan sets the rate for regular use.

## Setup

### Step 1: Get a Keepa API key

1. Sign in at [keepa.com](https://keepa.com) and open the [API page](https://keepa.com/api).
2. Subscribe to an API plan. Plans differ in how many tokens they add per minute, are billed monthly by Keepa and can be canceled at any time.
3. Copy your **API access key** (64 letters and digits) from the API page.

> The key is all the agent needs: there is no app to register and no sign-in. Keep it secret, since anyone with the key can spend your tokens. You can generate a new key on the same page at any time.

### Step 2: Save the credential to Wiro

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/CredentialUpsert" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "fields": [
      { "credentialkey": "keepa", "fieldname": "apikey", "fieldvalue": "YOUR_KEEPA_API_KEY" }
    ]
  }'
```

Or fill it in the panel: **[My Agents](https://wiro.ai/panel/agents)** → open agent → **Connectors → Keepa**.

A value that is not exactly 64 letters and digits is refused when you save it.

### Step 3: Enable the skill

Keepa ships **available but off**. Turn `int-keepa` on for the agent:

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/SkillsApply" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "skills": { "int-keepa": true },
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
| `apikey` | string (secret) | Yes | Keepa API access key, exactly 64 letters and digits. Encrypted at rest. |

## Credentials schema (as returned by `POST /UserAgent/Detail`)

```json
"keepa": {
  "_connected": true,
  "optional": false,
  "extra": false,
  "apikey": "••••••••"
}
```

On a custom build with `int-keepa` on, `optional` and `extra` are `false`: Keepa is that skill's own connector.

## What the agent can look up

| Request | Keepa endpoint | Keepa tokens | What comes back |
|---------|----------------|--------------|-----------------|
| Token status | `/token` | 0 | Tokens left, refill rate and time to the next refill. |
| Product history | `/product` with `stats` and `days` | 1 per product (up to 100 per call) | Prices now, 30 and 90 day averages, lowest and highest in the range with dates, lowest ever, daily or weekly tables of any price or rank series, sales rank drops, Amazon's "bought in past month" bracket. Products are found by ASIN, or by UPC, EAN, GTIN or ISBN-13. |
| Product search | `/search?type=product` | 10 per search | Up to 20 products in Amazon's search order (sponsored results left out), with price now and sales rank. |
| Best sellers | `/bestsellers` | 50 per list (0 when Keepa has no list) | The ranked ASIN list of a category or product group: by current rank, by the 30, 90 or 180 day average rank, or for a past month (last 36 months). |
| Category search and lookup | `/search?type=category`, `/category` | 1 | Category ids, names, the path to the root, product counts and average Buy Box price. |
| Product finder | `/query` | 10 + 1 per 100 ASINs | ASINs matching filters such as category, brand, price range, sales rank, monthly sold, or a price drop against the 90 day average. |

The Keepa options that cost extra tokens stay off unless you ask for that data:

| Option | Extra Keepa tokens | Adds |
|--------|--------------------|------|
| `offers` | 6 per page of 10 offers found (5 when there are none), instead of the base 1 | Live marketplace offers, Buy Box history, FBA, FBM and Amazon Warehouse prices, rating and review history |
| `buybox` | 2 per product | Buy Box price history and Buy Box statistics |
| `stock` | 2 per product, when stock data comes back | Stock levels |
| `rating` | up to 1 per product | Rating and review count history |
| `historical-variations` | 1 per product with a parent ASIN | Variations that are no longer listed |

## Supported marketplaces

| Domain id | Marketplace | Currency |
|-----------|-------------|----------|
| 1 | amazon.com | USD |
| 2 | amazon.co.uk | GBP |
| 3 | amazon.de | EUR |
| 4 | amazon.fr | EUR |
| 5 | amazon.co.jp | JPY |
| 6 | amazon.ca | CAD |
| 8 | amazon.it | EUR |
| 9 | amazon.es | EUR |
| 10 | amazon.in | INR |
| 11 | amazon.com.mx | MXN |
| 12 | amazon.com.br | BRL |

These are all the marketplaces Keepa covers. **Amazon.com.tr (Türkiye) is not supported**, and neither are amazon.com.au, amazon.nl, amazon.se, amazon.pl, amazon.com.be, amazon.ae, amazon.sa, amazon.sg and amazon.eg. Asked about one of them, the agent says Keepa does not cover it.

## How the agent reads Keepa data

- **Time:** Keepa stores minutes since its own epoch. The agent converts them to UTC dates: Unix milliseconds = (Keepa time + 21564000) × 60000.
- **Prices** are integers in the currency's smallest unit (cents, pence, paise; yen have none). `-1` means there was no offer at that time, never a price of zero.
- **Sales rank** is the rank in the product's main category; lower is better. History holds a point only when a value changed.
- **New and Used prices:** until 2026-02-22 Keepa recorded the lowest listing price, and from 2026-02-23 the lowest price including shipping. The agent says so when a range spans that date.
- **History series** the agent can tabulate include Amazon's own offer, the lowest New and Used prices, the sales rank, the list price, offer counts, and (with the matching option) the Buy Box, FBA, FBM and Warehouse prices, rating and reviews.
- **Every answer** names the source, the marketplace and the date range, for example "Source: Keepa · amazon.de · 2026-08-23 to 2026-11-21 (UTC)", followed by the tokens used and left.

## Keepa tokens & billing

- **Keepa plans** add a fixed number of tokens per minute. Unused tokens expire after 60 minutes, so a plan holds at most one hour's worth. Keepa bills the plan monthly to your Keepa account.
- **Before a costly call** (a search, a best seller list, the product finder) the agent checks your balance; when the call costs more than you have left, it says so and asks first in chat, and skips it in a scheduled task.
- **When tokens run out**, Keepa answers HTTP 429. The agent stops and says in one sentence when the next call can run; it never retries in a loop.
- **Billing on Wiro:** every plan includes the integration, so it changes neither the agent's price nor its credits. As with every agent turn, its work is billed on the LLM tokens it uses, from the agent's existing credits.

## Troubleshooting

- **402 "No active API plan found":** the key is unknown or its Keepa plan has ended. Check the plan on the [Keepa API page](https://keepa.com/api), or save the current key again if you generated a new one.
- **400 invalidParameter:** a request parameter was wrong; the error names it. A rejected `key` means the saved key is not the one Keepa issued.
- **429:** out of Keepa tokens. Wait for the refill the agent names, or move to a larger Keepa plan.
- **500:** a Keepa error. The agent retries once, then reports that Keepa is not answering.
- **Empty best seller list:** Keepa has no list for that category on that marketplace; no tokens were used.
- **A marketplace is "not covered":** Keepa has no data for it (for example amazon.com.tr).
- **Agent says "not connected" with the key filled:** the agent restarts to pick up new credentials; give it a moment after saving, then retry.

## Related

- [Agent Credentials & OAuth](/docs/agent-credentials)
- [Agent Skills](/docs/agent-skills)
- [Shopify Skills](/docs/integration-shopify-skills) / [WooCommerce Skills](/docs/integration-woocommerce-skills): your own store's catalog and prices
- [Merchant Center Skills](/docs/integration-merchantcenter-skills): Google Shopping product feeds
