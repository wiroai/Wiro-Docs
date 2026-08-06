# Shopify Integration

Connect a Wiro agent to Shopify's official GraphQL Admin API 2026-07 to manage products, variants, inventory, orders, customers, discounts, collections, and fulfillments.

## Overview

The Shopify integration powers the `shopify-manage` skill. It uses only the official GraphQL Admin API pinned to `2026-07`; the REST Admin API, `latest`, `unstable`, and release-candidate schemas are outside the contract.

**Available connection modes:**

| Mode | Status | Best for |
|------|--------|----------|
| Client ID + Secret (`"api_key"`) | Available | Server-to-server automation when the Dev Dashboard app and store belong to the same Shopify organization. Tokens report `expires_in: 86399` and are re-exchanged before expiry. |
| Customer-owned app OAuth (`"own"`) | Available | Apps installed on merchant stores in another organization. Uses an expiring offline access token plus rotating refresh token. |

Wiro does not provide a shared Shopify OAuth app. Both modes use customer-owned credentials.

## Prerequisites

- A deployed Wiro agent with the `shopify-manage` skill enabled.
- A Shopify store and permission to install or create apps.
- The canonical store hostname, for example `example-store.myshopify.com`. Custom storefront domains are not accepted for Admin API authentication.

## Option A: Client ID + Secret

### 1. Create and install a Dev Dashboard app

In Shopify's Dev Dashboard:

1. Create an app in the same Shopify organization as the target store.
2. Configure only the Admin API scopes the agent needs.
3. Release an app version and install it on the store.
4. Copy the Client ID and Client Secret from the app's **Settings** page.

Product, inventory, order, customer, discount, fulfillment, and location operations require their matching read/write scopes. The app can do only what its granted scopes and the installing staff account permit.

Shopify's client-credentials grant works only when both the app and store belong to the same organization. For a merchant store in another organization, use Option B.

### 2. Save the store and app credentials

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/CredentialUpsert" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "fields": [
      { "credentialkey": "shopify", "fieldname": "authmethod", "fieldvalue": "api_key" },
      { "credentialkey": "shopify", "fieldname": "shopdomain", "fieldvalue": "example-store.myshopify.com" },
      { "credentialkey": "shopify", "fieldname": "clientid", "fieldvalue": "YOUR_SHOPIFY_CLIENT_ID" },
      { "credentialkey": "shopify", "fieldname": "clientsecret", "fieldvalue": "YOUR_SHOPIFY_CLIENT_SECRET" }
    ]
  }'
```

### 3. Validate the connection

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/OAuthConnect" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "credentialkey": "shopify",
    "authmethod": "api_key"
  }'
```

This is a server-side credential exchange and probe, not a browser redirect. Wiro submits the Shopify client-credentials form (`grant_type=client_credentials`, Client ID, and Client Secret) to the canonical shop, receives an access token whose `expires_in` is exactly `86399` seconds, verifies the shop identity, and stores the connection. Running agents re-exchange the client credentials before expiry; the Client Secret is never sent to the GraphQL Admin API.

## Option B: Customer-owned app OAuth

### 1. Configure the Shopify app

Create or select the customer's app in the Shopify Dev Dashboard and add this exact redirect URL:

```text
https://api.wiro.ai/v1/UserAgentOAuth/ShopifyCallback
```

The authorization-code grant requests an **expiring offline** token. Wiro validates the callback before exchanging the code:

- the callback HMAC is computed with the app's Client Secret over the alphabetically sorted callback query fields after removing `hmac` and `signature`;
- comparison is timing-safe, and the callback `state` and canonical `shop` must match the connection that Wiro started;
- the authorization code is sent only to that shop's `/admin/oauth/access_token` endpoint as `application/x-www-form-urlencoded`, with `expiring=1`.

This callback-query HMAC is not Shopify's webhook-signature format, and it is not computed over the token form body.

### 2. Save app credentials

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/CredentialUpsert" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "fields": [
      { "credentialkey": "shopify", "fieldname": "authmethod", "fieldvalue": "own" },
      { "credentialkey": "shopify", "fieldname": "shopdomain", "fieldvalue": "example-store.myshopify.com" },
      { "credentialkey": "shopify", "fieldname": "clientid", "fieldvalue": "YOUR_SHOPIFY_CLIENT_ID" },
      { "credentialkey": "shopify", "fieldname": "clientsecret", "fieldvalue": "YOUR_SHOPIFY_CLIENT_SECRET" }
    ]
  }'
```

### 3. Start OAuth

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/OAuthConnect" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "credentialkey": "shopify",
    "authmethod": "own",
    "redirecturl": "https://your-app.example/settings/integrations"
  }'
```

Open the returned `authorizeUrl` in the user's browser. After consent, Wiro exchanges the code for an expiring offline access token and refresh token, records both provider expiry values, verifies the shop through GraphQL, and redirects to your `redirecturl` with `shopify_connected=true`. Refresh uses `grant_type=refresh_token`; Shopify can rotate both tokens, so Wiro stores each replacement atomically rather than reusing an old refresh token.

## Check or disconnect

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/OAuthStatus" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "useragentguid": "your-useragent-guid", "credentialkey": "shopify" }'
```

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/OAuthDisconnect" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "useragentguid": "your-useragent-guid", "credentialkey": "shopify" }'
```

## Runtime behavior

- Endpoint: `https://{shop}.myshopify.com/admin/api/2026-07/graphql.json`
- Authentication: `X-Shopify-Access-Token`
- Client-credentials tokens report `expires_in: 86399` and are re-exchanged automatically before expiry.
- Customer-owned OAuth uses expiring offline access and refresh tokens. Wiro refreshes and atomically replaces the pair before the access token expires; reconnect is required if the refresh authorization expires or is revoked.
- Reads are paginated with GraphQL cursors.
- Every mutation checks both top-level `errors` and mutation-specific `userErrors`.
- Products are created as drafts unless publication is explicitly requested.
- Missing scopes are treated as hard permission boundaries; the agent does not switch authentication methods or attempt a workaround.

## Mutation safety

- **Compare-and-set inventory:** `inventorySetQuantities` includes the last-read quantity for each inventory item/location. A stale comparison stops the write; Wiro re-reads state instead of bypassing the conflict.
- **Scoped idempotency:** Wiro reuses one stable key only for mutations whose 2026-07 schema documents native idempotency. It does not attach an idempotency directive to arbitrary GraphQL mutations.
- **Ambiguous outcomes:** timeout, disconnect, throttle, or 5xx after transmission is `unknown`, not an automatic retry. Wiro queries the natural resource key and reconciles remote state first.
- **Collections:** membership changes use only collection mutations supported by the 2026-07 schema. Deprecated legacy collection add/remove operations are not used.
- **Protected customer data:** nominal customer scopes may still require Shopify protected-customer-data approval and staff permissions. Wiro requests the minimum fields needed and does not put customer PII, addresses, order details, or payment data into its mutation ledger.

## Related

- [Agent Credentials & OAuth](/docs/agent-credentials)
- [Agent Skills](/docs/agent-skills)
- [Shopify Admin API access scopes](https://shopify.dev/docs/api/usage/access-scopes)
- [Shopify client-credentials grant](https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens/client-credentials-grant)
- [Shopify authorization-code grant](https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens/authorization-code-grant)
