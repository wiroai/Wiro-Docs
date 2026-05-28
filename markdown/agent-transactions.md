# Agent Transactions

Per-instance credit ledger — every credit deduction, renewal, purchase, refund, grant, and cancel for a useragent in a single immutable feed.

## Overview

Wiro keeps a complete, append-only **agent transaction ledger** for every UserAgent instance. Whenever credits move — the agent runtime burns them on a chat turn, a subscription renews, a Pro user buys an extra-credit pack, an admin tops up, the user disables a paid skill mid-period and gets a refund — a row is inserted into the ledger and surfaced through `POST /UserAgent/TransactionList`.

The ledger is the single source of truth for "where did my credits go?" and powers the **Transactions** view in your dashboard.

| Transaction `type` | Source | When it fires |
|--------------------|--------|---------------|
| `deduct` | Agent runtime | Per-turn LLM token charge (`action: "tokens"`) for every chat, cron, and voice post-call turn. Negative `amount`. |
| `renewal` | Subscription cron | At each 30-day rollover when the wallet successfully covers the renewal. Positive `amount` = monthly credits granted. |
| `purchase` | Extra-credit checkout | When `POST /UserAgent/CreateExtraCreditCheckout` (`useprepaid: true`) succeeds. Positive `amount` = pack credits. |
| `grant` | Skill toggle / tier upgrade | When a skill is enabled mid-period and the credit pool grows, or when a tier upgrade lifts the monthly allocation. Positive `amount`. |
| `expired` | Skill toggle / subscription end | Two cases share the type. Mid-period: when a skill is disabled and the credit pool shrinks (`action: "skill-toggle"`). End-of-period: when a cancelled subscription rolls past `currentperiodend` and the cron revokes any remaining monthly leftover (`action: "subscription"`). Negative `amount` in both cases. |
| `refund` | Server-side refund | Issued by Wiro support when a previous charge is reversed. Positive `amount`. |

> **The ledger is append-only.** There is no delete endpoint. Each row carries a stable `guid` that the server uses for deduplication (so a duplicate retry of the same deduct event is a no-op).

## **POST** /UserAgent/TransactionList

Returns the ledger rows for a single useragent sorted **newest-first**, plus a snapshot summary of the current balance.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | The useragent instance guid. |
| `limit` | number | No | Max rows to return. Default `50`, max `500`. |
| `start` | number | No | Offset for pagination. Default `0`. |

**Authorization:** owner uuid OR any team member of the useragent's team. Admin callers bypass the uuid check. Pass `teamGUID: <team-guid>` as a header for team agents.

##### Request

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/TransactionList" \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321", "limit": 50 }'
```

##### Response

```json
{
  "result": true,
  "errors": [],
  "total": 128,
  "summary": {
    "monthlycredits": 2250,
    "extracredits": 2000,
    "usedcredits": 1450,
    "remainingcredits": 2800,
    "creditperiod": "2026-05",
    "creditsyncat": 1714694410,
    "byModel": [
      { "model": "openai/gpt-5.4", "inputtokens": 128400, "outputtokens": 32100, "cachereadtokens": 86000, "cachewritetokens": 0, "totaltokens": 160500, "tokencost": 240, "turncount": 38 },
      { "model": "unknown", "inputtokens": 4200, "outputtokens": 900, "cachereadtokens": 0, "cachewritetokens": 0, "totaltokens": 5100, "tokencost": 7, "turncount": 3 }
    ]
  },
  "transactions": [
    {
      "guid": "7f3e8c21-1be1-4f5a-96e8-2b1a9e2a6a01",
      "type": "deduct",
      "action": "tokens",
      "amount": -6,
      "balanceafter": 10550,
      "description": "Input Tokens: 3450 / Output Tokens: 820 / Model: openai/gpt-5.4",
      "sessionkey": "default",
      "messageguid": "5c41dabf-f2be-4aa8-a5a4-8c9e3d2f3f11",
      "inputtokens": 3450,
      "outputtokens": 820,
      "cachereadtokens": 512,
      "cachewritetokens": 0,
      "totaltokens": 4270,
      "tokencost": 6,
      "processedms": 4120,
      "model": "openai/gpt-5.4",
      "provider": "agent",
      "providerref": null,
      "metadata": null,
      "uuid": "ada-uuid",
      "user": {
        "uuid": "ada-uuid",
        "firstname": "Ada",
        "lastname": "Lovelace",
        "email": "ada@example.com",
        "username": "ada",
        "avatar": "https://cdn.wiro.ai/avatars/ada.webp",
        "avatarinitials": "AL"
      },
      "createdat": 1714694400
    },
    {
      "guid": "a40b5473-aedb-47d7-966b-7b038eed30dc",
      "type": "purchase",
      "action": "small",
      "amount": 5000,
      "balanceafter": 10560,
      "description": "Extra credits — small pack",
      "sessionkey": null,
      "messageguid": null,
      "inputtokens": null,
      "outputtokens": null,
      "cachereadtokens": null,
      "cachewritetokens": null,
      "totaltokens": null,
      "tokencost": null,
      "processedms": null,
      "model": null,
      "provider": "prepaid",
      "providerref": null,
      "metadata": { "pack": "small", "priceUsd": 45 },
      "uuid": "ada-uuid",
      "user": {
        "uuid": "ada-uuid",
        "firstname": "Ada",
        "lastname": "Lovelace",
        "email": "ada@example.com",
        "username": "ada",
        "avatar": "https://cdn.wiro.ai/avatars/ada.webp",
        "avatarinitials": "AL"
      },
      "createdat": 1714692800
    },
    {
      "guid": "312e2a5f-1002-4c9a-af7d-70571e8b1739",
      "type": "renewal",
      "action": "monthly",
      "amount": 10000,
      "balanceafter": 5560,
      "description": "Subscription renewal",
      "sessionkey": null,
      "messageguid": null,
      "inputtokens": null,
      "outputtokens": null,
      "cachereadtokens": null,
      "cachewritetokens": null,
      "totaltokens": null,
      "tokencost": null,
      "processedms": null,
      "model": null,
      "provider": "prepaid",
      "providerref": null,
      "metadata": { "period": "2026-05", "priceUsd": 90 },
      "uuid": "system",
      "user": null,
      "createdat": 1714608000
    },
    {
      "guid": "98a14c2e-ee0f-4a2d-b73b-d33fe8e57cf2",
      "type": "grant",
      "action": "skill-toggle",
      "amount": 500,
      "balanceafter": 5050,
      "description": "Skill enabled: int-instagram-post",
      "sessionkey": null,
      "messageguid": null,
      "inputtokens": null,
      "outputtokens": null,
      "cachereadtokens": null,
      "cachewritetokens": null,
      "totaltokens": null,
      "tokencost": null,
      "processedms": null,
      "model": null,
      "provider": "prepaid",
      "providerref": null,
      "metadata": {
        "skill": "int-instagram-post",
        "enabled": true,
        "previousPriceUsd": 90,
        "newPriceUsd": 140,
        "proratedCharge": 33.33
      },
      "uuid": "ada-uuid",
      "user": {
        "uuid": "ada-uuid",
        "firstname": "Ada",
        "lastname": "Lovelace",
        "email": "ada@example.com",
        "username": "ada",
        "avatar": "https://cdn.wiro.ai/avatars/ada.webp",
        "avatarinitials": "AL"
      },
      "createdat": 1714604000
    }
  ]
}
```

> The `user` object is the resolved actor that triggered the ledger entry — `uuid`, `firstname`, `lastname`, `email`, `username`, `avatar`, `avatarinitials`. It is `null` when `uuid` is a sentinel like `"system"` (cron renewals, subscription expiry sweeps, automated platform writes) or when the user record has been deleted. The renewal row above was written by the daily renewal cron, so `uuid: "system"` and `user: null`.

**Summary fields** (snapshot of the useragent row):

| Field | Type | Description |
|-------|------|-------------|
| `monthlycredits` | `number` | Current monthly allocation. |
| `extracredits` | `number` | Active extra-credit balance (sum of non-expired packs). |
| `usedcredits` | `number` | Consumed during the current period (reported by the runtime). |
| `remainingcredits` | `number` | `max(0, monthlycredits + extracredits - usedcredits)`. |
| `creditperiod` | `string` | `'YYYY-MM'` billing window. Rolls over on subscription renewal. |
| `creditsyncat` | `number\|null` | Last runtime → API usage sync in Unix seconds. |
| `byModel` | `array` | Per-model token rollup for the **current billing period**, aggregating only `action: "tokens"` rows, sorted by `tokencost` descending. A `null` or empty `model` is bucketed as `"unknown"`. Each entry: `{ model, inputtokens, outputtokens, cachereadtokens, cachewritetokens, totaltokens, tokencost, turncount }`. |

**Transaction fields:**

| Field | Type | Description |
|-------|------|-------------|
| `guid` | `string` | Stable id of the ledger row. Daemon retries reuse this guid for idempotency. |
| `type` | `string` | One of `"deduct"`, `"renewal"`, `"purchase"`, `"grant"`, `"expired"`, `"refund"`. There is no `"cancel"` type — a user-initiated subscription cancel only flips auto-renew off; credits are not forfeited until `currentperiodend` is reached, at which point the cron writes the ledger row as `type: "expired"`, `action: "subscription"`. |
| `action` | `string\|null` | Fine-grained detail. Values depend on `type`: `"tokens"` (deduct — the per-turn LLM token charge the runtime writes for every chat, cron, and voice post-call turn); `"monthly"` (renewal); `"small"`, `"medium"`, `"large"` (purchase); `"skill-toggle"`, `"admin"`, `"upgrade"` (grant); `"skill-toggle"` (expired, mid-period skill disable); `"subscription"` (expired, end-of-period cancel rollover; refund). Legacy deduct rows may also carry `"message"`, `"create"`, `"modify"`, or `"regenerate"`. |
| `amount` | `number` | Signed credit delta — negative for deductions, positive for grants. |
| `balanceafter` | `number\|null` | Remaining credit balance snapshot written at the time of the event. May be `null` for very old rows or for events written before the snapshot field was added. |
| `description` | `string\|null` | Human-readable label. |
| `sessionkey` | `string\|null` | Session the deduct belongs to (deduct rows only). |
| `messageguid` | `string\|null` | Agent message that triggered the deduct (deduct rows only). |
| `inputtokens` | `number\|null` | Prompt tokens billed for the turn (`action: "tokens"` rows only). |
| `outputtokens` | `number\|null` | Completion tokens billed for the turn (`action: "tokens"` rows only). |
| `cachereadtokens` | `number\|null` | Prompt tokens served from cache for the turn (`action: "tokens"` rows only). |
| `cachewritetokens` | `number\|null` | Prompt tokens written to cache for the turn (`action: "tokens"` rows only). |
| `totaltokens` | `number\|null` | Input + output tokens for the turn (`action: "tokens"` rows only). |
| `tokencost` | `number\|null` | Credit cost for the turn; equals `abs(amount)` (`action: "tokens"` rows only). |
| `processedms` | `number\|null` | Model processing time for the turn, in milliseconds (`action: "tokens"` rows only). |
| `model` | `string\|null` | Model id that served the turn, e.g. `"openai/gpt-5.4"` (`action: "tokens"` rows only). |
| `provider` | `string\|null` | `"agent"` (runtime deduct) or `"prepaid"` (wallet-backed change). API-deployed agents always run on the prepaid path. |
| `providerref` | `string\|null` | Provider-side reference id. Always populated for `prepaid` rows (wallet transaction id); `null` for `agent` runtime deducts. |
| `metadata` | `object\|null` | Arbitrary JSON context attached at write time (skill, tier, period, prorated charge, …). |
| `uuid` | `string\|null` | UUID of the user who triggered the event (the chat operator for `deduct` rows; the wallet owner for `purchase` / `grant`). `"system"` for cron-driven events. |
| `user` | `object\|null` | Resolved actor: `{ uuid, firstname, lastname, email, username, avatar, avatarinitials }`. `null` when `uuid` is `"system"` (automation / cron renewals) or when the user record was deleted. |
| `createdat` | `number` | Unix seconds. |

> **Pagination.** The endpoint returns `total` so you can render a precise paginator. Default page size is 50, max is 500. Use `start` to skip rows.

## Reading the Ledger — Patterns

### Daily / weekly reports

Filter client-side on `createdat` to bucket transactions per day or per skill:

```python
import requests
from collections import defaultdict
from datetime import datetime

resp = requests.post(
    "https://api.wiro.ai/v1/UserAgent/TransactionList",
    headers={"x-api-key": "YOUR_API_KEY", "Content-Type": "application/json"},
    json={"useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321", "limit": 500}
).json()

per_day_burn = defaultdict(int)
for tx in resp["transactions"]:
    if tx["type"] == "deduct":
        day = datetime.utcfromtimestamp(tx["createdat"]).strftime("%Y-%m-%d")
        per_day_burn[day] += abs(tx["amount"])

for day in sorted(per_day_burn):
    print(f"{day}: {per_day_burn[day]} credits")
```

### Audit a billing-period rollover

`type: "renewal"` rows are written exactly once per billing-period rollover. Pair them with the most recent `summary.creditperiod` to confirm the new period started on time.

```javascript
const renewals = transactions.filter(t => t.type === 'renewal');
const lastRenewal = renewals[0];   // newest-first ordering
console.log('Last renewal:', new Date(lastRenewal.createdat * 1000).toISOString());
console.log('Granted:', lastRenewal.amount, 'credits');
console.log('Now in period:', summary.creditperiod);
```

### Reconcile a Pro tier upgrade

When the user upgrades Starter → Pro mid-period, `UpgradeTier` writes one `grant` row with `action: "upgrade"` and `metadata: { tier, proratedCharge, ... }`. Use this to render an upgrade history in your UI.

## Errors

| Error | When |
|-------|------|
| `useragentguid is required` | `TransactionList` without `useragentguid` |
| `useragent-access-denied` | Caller is neither owner, team member, nor admin |
| `Invalid credentials` | API key is missing or doesn't resolve to a valid Wiro user |
| `transactions-list-failed` | `TransactionList` server-side error (DB) — surfaced loudly so it's distinguishable from "empty ledger" |

## Code Examples

### curl

```bash
# Latest 50 transactions for a useragent
curl -X POST "https://api.wiro.ai/v1/UserAgent/TransactionList" \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321", "limit": 50 }'

# Page 2 (next 50)
curl -X POST "https://api.wiro.ai/v1/UserAgent/TransactionList" \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321", "limit": 50, "start": 50 }'
```

### Python

```python
import requests

headers = {"x-api-key": "YOUR_API_KEY", "Content-Type": "application/json"}

resp = requests.post(
    "https://api.wiro.ai/v1/UserAgent/TransactionList",
    headers=headers,
    json={"useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321", "limit": 100}
).json()

print(f"Balance — remaining: {resp['summary']['remainingcredits']}/{resp['summary']['monthlycredits']}")
print(f"Total ledger rows: {resp['total']}")

for tx in resp["transactions"][:10]:
    sign = "+" if tx["amount"] > 0 else ""
    print(f"  [{tx['type']:>9}] {sign}{tx['amount']:>6}  {tx['description']}")
```

### Node.js

```javascript
const axios = require('axios');

const headers = { 'x-api-key': 'YOUR_API_KEY', 'Content-Type': 'application/json' };

const { data } = await axios.post(
  'https://api.wiro.ai/v1/UserAgent/TransactionList',
  { useragentguid: 'f8e7d6c5-b4a3-2190-fedc-ba0987654321', limit: 100 },
  { headers }
);

console.log(`Balance: ${data.summary.remainingcredits}/${data.summary.monthlycredits}`);
console.log(`Period: ${data.summary.creditperiod}`);

data.transactions.slice(0, 10).forEach(tx => {
  const sign = tx.amount > 0 ? '+' : '';
  console.log(`  [${tx.type.padStart(9)}] ${sign}${tx.amount}  ${tx.description}`);
});
```

### PHP

```php
<?php
$ch = curl_init("https://api.wiro.ai/v1/UserAgent/TransactionList");
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Content-Type: application/json",
    "x-api-key: YOUR_API_KEY"
]);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
    "useragentguid" => "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
    "limit" => 100
]));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$resp = json_decode(curl_exec($ch), true);
curl_close($ch);

echo "Balance: {$resp['summary']['remainingcredits']}/{$resp['summary']['monthlycredits']}\n";
foreach (array_slice($resp['transactions'], 0, 10) as $tx) {
    $sign = $tx['amount'] > 0 ? '+' : '';
    echo "[{$tx['type']}] {$sign}{$tx['amount']} {$tx['description']}\n";
}
```

## What's Next

- [Agent Logs](/docs/agent-logs) — Activity feed (tool calls, cron runs, message exchanges) for the same useragent
- [Agent Overview](/docs/agent-overview) — Full agent endpoint catalog, including subscription / billing operations
- [Agent Builder](/docs/agent-builder) — Build a custom agent and watch the ledger fill up as it runs
