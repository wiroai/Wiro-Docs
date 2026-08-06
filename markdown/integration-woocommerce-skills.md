# WooCommerce Integration

Connect a Wiro agent directly to a WooCommerce store with a REST API consumer key and secret.

## Overview

The `woocommerce-manage` skill uses WooCommerce's official, current recommended WP REST API namespace, `wc/v3`, to work with products, variations, taxonomy, inventory, orders, refunds, coupons, customers, reports, and supported store settings.

| Mode | Status | Notes |
|------|--------|-------|
| Consumer key + consumer secret | Available | Direct HTTPS Basic Authentication. No OAuth app or browser redirect. |

## Prerequisites

- A deployed Wiro agent with the `woocommerce-manage` skill enabled.
- A public HTTPS WooCommerce store with REST API routing enabled.
- A WordPress user with the minimum permissions needed for the requested operations.

## Setup

### 1. Create a WooCommerce REST API key

In WordPress Admin:

1. Open **WooCommerce → Settings → Advanced → REST API**.
2. Select **Add key**.
3. Choose the WordPress user the agent should act as.
4. Choose **Read/Write** only if the agent must modify the store; otherwise use **Read**.
5. Generate the key and copy both the consumer key and consumer secret.

### 2. Save credentials

Use the store's public base URL. Keep an existing WordPress subdirectory, but omit `/wp-json/wc/v3`, query strings, fragments, and the trailing slash.

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/CredentialUpsert" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "fields": [
      { "credentialkey": "woocommerce", "fieldname": "storeurl", "fieldvalue": "https://store.example.com" },
      { "credentialkey": "woocommerce", "fieldname": "consumerkey", "fieldvalue": "ck_..." },
      { "credentialkey": "woocommerce", "fieldname": "consumersecret", "fieldvalue": "cs_..." }
    ]
  }'
```

### 3. Start or restart the agent

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Start" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "guid": "your-useragent-guid" }'
```

## Credential fields

| Field | Type | Description |
|-------|------|-------------|
| `storeurl` | string | Public HTTPS store URL, without the WooCommerce REST path. |
| `consumerkey` | secret string | WooCommerce consumer key, normally beginning with `ck_`. |
| `consumersecret` | secret string | WooCommerce consumer secret, normally beginning with `cs_`. |

## Runtime behavior

- Base endpoint: `{storeurl}/wp-json/wc/v3`
- Authentication: HTTPS Basic Auth with the consumer key and secret.
- Credentials are never added to URL query parameters.
- Collection endpoints use page-number pagination and inspect `X-WP-TotalPages`.
- The agent reads the current resource before a write and verifies the resource after a successful mutation.
- Ambiguous create/update outcomes are reconciled by reading remote state before any retry. WooCommerce has no universal idempotency header.
- Refund amount, currency, line items, restock behavior, and gateway behavior must be explicit; the agent does not infer them.

### Products, inventory, and batch requests

- Product and variation writes use documented fields such as `manage_stock`, `stock_quantity`, `stock_status`, and `backorders`. Wiro does **not** treat `low_stock_amount` as a supported product/variation mutation field.
- `POST /products/batch` accepts `create`, `update`, and `delete` arrays. It is a convenience batch, not one atomic transaction: inspect every returned array item, and reconcile each item independently.
- A top-level 2xx response does not mean every batch item succeeded. Do not retry the whole batch after a partial or ambiguous result; retrying confirmed successes can duplicate creates.
- WooCommerce has no universal idempotency-key header. Wiro uses natural keys such as SKU/slug, records one ledger entry per item, and reads remote state before retrying an uncertain write.

### Settings

- Read groups with `GET /settings`, group options with `GET /settings/{group_id}`, and one option with `GET /settings/{group_id}/{option_id}`.
- Update one writable option with `PUT /settings/{group_id}/{option_id}`.
- Batch-update writable options in one group with `POST /settings/{group_id}/batch` and an `update` array. This endpoint does not create or delete arbitrary settings.
- Payment gateways and shipping zones are separate resources, not generic setting options.

### Errors and rate limits

WooCommerce/WordPress errors use the HTTP status plus a JSON object shaped like `{ code, message, data }`; `data.status` commonly repeats the status. For batch calls, also inspect each returned item.

Core `wc/v3` does not publish one built-in global request quota or standardized rate-limit header contract. A store, host, WAF, reverse proxy, or plugin can still return `429`. When it does, honor `Retry-After` or another explicit reset header if present; otherwise stop and retry later with conservative backoff. Do not copy the optional WooCommerce **Store API** `RateLimit-*` contract onto `wc/v3`.

## Troubleshooting

- **400:** The payload, field, or state transition is invalid. Read the response's `code`, `message`, and `data`; do not infer success from a partially populated object.
- **401:** The key/secret is invalid, revoked, or belongs to a different store.
- **403:** The key's WordPress user or permission level cannot access the resource.
- **404 under `/wp-json/wc/v3`:** The store URL or WordPress subdirectory is wrong, WooCommerce REST routing is unavailable, or permalinks need configuration.
- **409:** The resource changed or conflicts with current state. Re-read it before deciding whether a new write is appropriate.
- **429:** A store-specific limiter blocked the request. Follow the headers that store actually returned; `wc/v3` itself does not guarantee `Retry-After`.
- **5xx or transport timeout after a write:** The outcome is unknown. Reconcile by resource ID or natural key before any retry.
- **WAF or reverse proxy failures:** Allow authenticated requests to the WooCommerce REST route without redirecting to another hostname.

## Related

- [Agent Credentials & OAuth](/docs/agent-credentials)
- [Agent Skills](/docs/agent-skills)
- [WooCommerce REST API documentation](https://woocommerce.github.io/woocommerce-rest-api-docs/)
