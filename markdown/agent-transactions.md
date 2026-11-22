# Agent Transactions

Per-instance credit ledger: every credit deduction, renewal, purchase, refund, grant, and cancel for a useragent in a single immutable feed.

## Overview

Wiro keeps a complete, append-only **agent transaction ledger** for every UserAgent instance. Whenever credits move (the agent runtime burns them on a chat turn, a subscription renews, the user buys an extra-credit pack or moves to a higher plan mid-period), a row is inserted into the ledger and surfaced through `POST /UserAgent/TransactionList`.

The ledger is the single source of truth for "where did my credits go?" and powers the **Transactions** view in your dashboard.

| Transaction `type` | Source | When it fires |
|--------------------|--------|---------------|
| `deduct` | Agent runtime | LLM token charge (`action: "tokens"`) for chat, cron, and voice post-call turns. Negative `amount`. Usually one row per turn; when Wiro measures the agent's model calls itself, one row covers every call billed since the last row, of one turn or several (see [Rows that cover several model calls](#metered-token-rows)). |
| `renewal` | Subscription cron | At each 30-day rollover when the wallet successfully covers the renewal. Positive `amount` = monthly credits granted. |
| `purchase` | Extra-credit checkout | When `POST /UserAgent/CreateExtraCreditCheckout` (`useprepaid: true`) succeeds. Positive `amount` = pack credits. |
| `grant` | Plan change / skill change | When a move to a higher plan lifts this period's credits. Positive `amount`: what this period gained. `metadata.creditsFromRenewal` is what each renewal grants. A skill change through `SkillsApply` or `SkillToggle` also writes a `grant` row with `amount: 0`: `action: "skill-toggle"` (`metadata: { skill, enabled }`) or `"skills-apply"` (`metadata: { diff, idempotencyKey }`). A skill change row with a non-zero `amount` or a `metadata.usedCreditsUsd` is from before skill changes became free. |
| `expired` | Subscription end | When a cancelled subscription rolls past `currentperiodend` and the cron revokes any remaining monthly leftover (`action: "subscription"`). Negative `amount`. Rows from before skill changes became free can also come from a skill turned off mid-period (`action: "skill-toggle"` or `"skills-apply"`, with `metadata.usedCreditsUsd`). |
| `refund` | Server-side refund | Issued by Wiro support when a previous charge is reversed. Positive `amount`. |
| `adjust` | Wiro support | A record for Wiro support. Rows with `amount: 0` and `action: "skill-change-not-undone"` (a failed skill change that could not be taken back) or `"skill-credit-failed"` (a skill credit that was not added to the wallet) are from before skill changes became free. |
| `subscription` | Plan payment that did not finish | `action: "plan-not-saved"`: the wallet paid for a plan start or a renewal and the plan could not be saved. `amount: 0`, since no credits moved. See [Plan payments that did not finish](#plan-not-saved). |

> **The ledger is append-only.** There is no delete endpoint. Each row carries a stable `guid` that the server uses for deduplication (so a duplicate retry of the same deduct event is a no-op).

## **POST** /UserAgent/TransactionList

Returns the ledger rows for a single useragent sorted **newest-first**, plus a snapshot summary of the current balance.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | The useragent instance guid. |
| `limit` | number | No | Max rows to return. Default `50`, max `500`. |
| `start` | number | No | Offset for pagination. Default `0`. |

**Authorization:** the agent's owner, a team admin of the agent's team or the organization owner (plain team members are rejected with code `97`). No extra header is needed.

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
  "total": 312,
  "summary": {
    "monthlycredits": 3000,
    "extracredits": 5000,
    "usedcredits": 1450,
    "remainingcredits": 6550,
    "renewalcredits": 3000,
    "creditperiod": "2026-05",
    "creditsyncat": 1714694410,
    "byModel": [
      { "model": "openai/gpt-5.4", "inputtokens": 1011250, "outputtokens": 241300, "cachereadtokens": 149800, "cachewritetokens": 0, "totaltokens": 1402350, "tokencost": 1443, "turncount": 288 },
      { "model": "unknown", "inputtokens": 4200, "outputtokens": 900, "cachereadtokens": 0, "cachewritetokens": 0, "totaltokens": 5100, "tokencost": 7, "turncount": 3 }
    ]
  },
  "transactions": [
    {
      "guid": "3c4d5e6f-7a8b-4c9d-8e0f-1a2b3c4d5e01",
      "type": "deduct",
      "action": "tokens",
      "amount": -5,
      "balanceafter": null,
      "description": "LLM openai/gpt-5.4 (uncached in 3450, cached in 512, out 820, total 4782 tokens)",
      "sessionkey": "default",
      "agentsessionkey": "default",
      "messageguid": "5d6e7f80-9a1b-4c2d-8e3f-4a5b6c7d8e01",
      "inputtokens": 3450,
      "outputtokens": 820,
      "cachereadtokens": 512,
      "cachewritetokens": 0,
      "totaltokens": 4782,
      "tokencost": 5,
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
      "guid": "3c4d5e6f-7a8b-4c9d-8e0f-1a2b3c4d5e02",
      "type": "purchase",
      "action": "medium",
      "amount": 5000,
      "balanceafter": 6555,
      "description": "Extra credits — medium (wallet)",
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
      "metadata": { "price": 50, "currency": "usd" },
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
      "guid": "3c4d5e6f-7a8b-4c9d-8e0f-1a2b3c4d5e03",
      "type": "renewal",
      "action": "monthly",
      "amount": 3000,
      "balanceafter": 3000,
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
      "metadata": { "period": "2026-05", "priceUsd": 30 },
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
      "createdat": 1714608000
    },
    {
      "guid": "3c4d5e6f-7a8b-4c9d-8e0f-1a2b3c4d5e04",
      "type": "grant",
      "action": "tier-change",
      "amount": 1250,
      "balanceafter": 1430,
      "description": "Plan Starter to Pro",
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
        "fromTier": "starter",
        "toTier": "pro",
        "previousPriceUsd": 5,
        "newPriceUsd": 30,
        "proratedCharge": 12.5,
        "creditsFromRenewal": 3000
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
      "createdat": 1712880000
    }
  ]
}
```

> The `user` object is the resolved actor that triggered the ledger entry: `uuid`, `firstname`, `lastname`, `email`, `username`, `avatar`, `avatarinitials`. Every row is recorded for an account `uuid` (renewals, expiry sweeps and other automated rows carry the agent owner's), so `user` is `null` only when that user record has been deleted.

**Summary fields** (snapshot of the useragent row):

| Field | Type | Description |
|-------|------|-------------|
| `monthlycredits` | `number` | The credits this period grants. |
| `renewalcredits` | `number` | The credits a renewal grants on the agent's current plan. When the agent has a `nextplan` (on `UserAgent/Detail`), the next renewal grants that plan's credits instead. |
| `extracredits` | `number` | Active extra-credit balance (sum of non-expired packs). |
| `usedcredits` | `number` | Consumed during the current period (reported by the runtime). |
| `remainingcredits` | `number` | `max(0, monthlycredits + extracredits - usedcredits)`. |
| `creditperiod` | `string` | `'YYYY-MM'` billing window. Rolls over on subscription renewal. |
| `creditsyncat` | `number\|null` | Unix seconds of the last monthly usage reset, the start of the current credit period; `byModel` counts turns from this moment on (`null` until the first reset). |
| `extrapacks` | `array` | The agent's extra-credit packs: `{ id, credits, remainingcredits, status, provider, purchasedat, expiresat }`. Active packs are used oldest first. |
| `byModel` | `array` | Per-model token rollup for the **current billing period**, aggregating only `action: "tokens"` rows, sorted by `tokencost` descending. A `null` or empty `model` is bucketed as `"unknown"`. Each entry: `{ model, inputtokens, outputtokens, cachereadtokens, cachewritetokens, totaltokens, tokencost, turncount }`. Within a period that stays inside `monthlycredits`, the `tokencost` values add up to `usedcredits`; credits spent from extra packs are counted here but come off `extracredits` instead. |

**Transaction fields:**

| Field | Type | Description |
|-------|------|-------------|
| `guid` | `string` | Stable id of the ledger row. Daemon retries reuse this guid for idempotency. |
| `type` | `string` | One of `"deduct"`, `"renewal"`, `"purchase"`, `"grant"`, `"expired"`, `"refund"`, `"adjust"`, `"subscription"`. There is no `"cancel"` type: a user-initiated subscription cancel only flips auto-renew off; credits are not forfeited until `currentperiodend` is reached, at which point the cron writes the ledger row as `type: "expired"`, `action: "subscription"`. |
| `action` | `string\|null` | Fine-grained detail. Values depend on `type`: `"tokens"` (deduct: the LLM token charge for chat, cron, and voice post-call turns, usually one row per turn; see [Rows that cover several model calls](#metered-token-rows)); `"monthly"` (renewal); `"small"`, `"medium"`, `"large"` (purchase); `"upgrade"`, `"tier-change"` (grant: a move to a higher plan); `"skill-toggle"`, `"skills-apply"` (grant: a skill change, with `amount: 0`; grant or expired rows with a non-zero `amount` are from before skill changes became free); `"subscription"` (expired, end-of-period cancel rollover; refund); `"skill-change-not-undone"`, `"skill-credit-failed"` (adjust, rows from before skill changes became free). Legacy deduct rows may also carry `"message"`, `"create"`, `"modify"`, or `"regenerate"`. |
| `amount` | `number` | Signed credit delta: negative for deductions, positive for grants. |
| `balanceafter` | `number\|null` | Remaining credit balance snapshot written at the time of the event. `null` on per-turn `deduct` rows. |
| `description` | `string\|null` | Human-readable label. On an `action: "tokens"` row it spells the counts out: `LLM <model> (uncached in N, cached in N, out N, cache write N, total N tokens)`, where `cached in` and `cache write` appear only above 0. |
| `sessionkey` | `string\|null` | Session the deduct belongs to (deduct rows only; `null` on a row that covers several model calls). |
| `agentsessionkey` | `string\|null` | Alias of `sessionkey` (same value), present on every row for a unified per-session attribution key across `TaskList` / `TransactionList` / wallet responses. |
| `messageguid` | `string\|null` | Agent message that triggered the deduct (deduct rows only; `null` on a row that covers several model calls). |
| `inputtokens` | `number\|null` | Uncached prompt tokens billed at the model's input rate (`action: "tokens"` rows only). |
| `outputtokens` | `number\|null` | Completion tokens billed for the turn (`action: "tokens"` rows only). |
| `cachereadtokens` | `number\|null` | Prompt tokens served from cache for the turn (`action: "tokens"` rows only). |
| `cachewritetokens` | `number\|null` | Prompt tokens written to cache for the turn (`action: "tokens"` rows only). |
| `totaltokens` | `number\|null` | Exact `inputtokens + outputtokens + cachereadtokens + cachewritetokens` sum (`action: "tokens"` rows only). |
| `tokencost` | `number\|null` | Credit cost for the turn; equals `abs(amount)` (`action: "tokens"` rows only). |
| `processedms` | `number\|null` | Model processing time for the turn, in milliseconds (`action: "tokens"` rows only). |
| `model` | `string\|null` | Model id that served the turn, e.g. `"openai/gpt-5.4"` (`action: "tokens"` rows only). |
| `provider` | `string\|null` | `"agent"` (runtime deduct) or `"prepaid"` (wallet-backed change). API-deployed agents always run on the prepaid path. |
| `providerref` | `string\|null` | Provider-side reference id. Always populated for `prepaid` rows (wallet transaction id); `null` for `agent` runtime deducts. |
| `metadata` | `object\|null` | Arbitrary JSON context attached at write time (plan change, period, prorated charge, …). |
| `uuid` | `string\|null` | UUID of the account the row is recorded for: the user who acted, or the agent's owner for renewals and other automated rows. Never a `"system"` placeholder. |
| `user` | `object\|null` | Resolved actor: `{ uuid, firstname, lastname, email, username, avatar, avatarinitials }`. `null` when the user record was deleted. |
| `createdat` | `number` | Unix seconds. |

> **Pagination.** The endpoint returns `total` so you can render a precise paginator. Default page size is 50, max is 500. Use `start` to skip rows.

## Reading the Ledger: Patterns

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

### Reconcile a plan change

When the user moves to a higher plan mid-period, the ledger gets one `grant` row for the credits the move added to this period. For a wallet-billed (prepaid) agent, `UpgradeTier` writes `action: "tier-change"` with those credits as `amount` (the monthly difference for the time left in the period), a description like `"Plan Pro to Max"` and `metadata: { fromTier, toTier, previousPriceUsd, newPriceUsd, proratedCharge, creditsFromRenewal }`; a card-billed upgrade writes `action: "upgrade"`. A move to a lower plan takes effect at the renewal, and that `renewal` row grants the lower plan's credits. Use these rows to render a plan history in your UI.

### Rows that cover several model calls

<a id="metered-token-rows"></a>

When Wiro measures an agent's model calls itself, a `deduct` row is not one turn. Each call is priced exactly, and the prices add up until they reach a whole credit; then one `deduct` row (`action: "tokens"`) takes the whole credits and covers every call billed since the agent's last row, of one turn or of several. What is left under a credit waits for the next row, so no call is billed twice and none is rounded up. Calls a turn makes outside its reply, such as compacting a long conversation, are billed this way too.

On such a row:

| Field | What it holds |
|-------|---------------|
| `amount`, `tokencost` | The whole credits the row takes (`amount` negative). |
| `inputtokens`, `outputtokens`, `cachereadtokens`, `cachewritetokens`, `totaltokens` | The sums of the calls it covers. |
| `model`, `description` | The model of the costliest call; the description spells the sums out as on other token rows. |
| `sessionkey`, `agentsessionkey`, `messageguid` | `null`: a row can cover calls of more than one turn. |
| `providerref` | The trace id of the costliest call, when the agent's call sent a W3C `traceparent`; otherwise `null`. |
| `metadata.calls` | Up to 200 of the calls it covers: `{ callId, responseId, provider, model, input, output, cacheRead, cacheWrite, total, credits }`, with `credits` exact to 9 decimals. |
| `metadata.callCount` | How many calls it covers (it can be more than the 200 listed). |
| `metadata.traceIds` | Up to 20 distinct trace ids of its calls, from their `traceparent`. |
| `metadata.models`, `metadata.providers` | The models and providers of its calls. |
| `metadata.carryIn`, `metadata.carryOut` | The part of a credit carried in from the row before and carried on to the next. |

No field ties such a row to the turns it covers. To show usage per turn or per day, add up the rows by `createdat`; `summary.byModel[].turncount` counts each of these rows, or each trace id, as one turn.

### Plan payments that did not finish

<a id="plan-not-saved"></a>

When the wallet pays for a plan start or a renewal and the plan then can't be saved, the agent's plan, price and credits stay as they were until Wiro support sets them, and the payment is recorded so it can be found. It happens on `Deploy` and `CreateSubscriptionCheckout` with `useprepaid: true`, on `RenewSubscription` (each answers with code `110`, see [Plan and payment errors](/docs/agent-overview#post-useragentrenewsubscription)), and on Wiro's own renewal at the end of a period. After Wiro's own renewal ends this way, the subscription shows the new period, so `RenewSubscription` answers `Subscription is already active`: this row is how to tell the two apart. Send the agent to Wiro support; don't charge again.

The ledger row:

| Field | Value |
|-------|-------|
| `type` | `"subscription"` |
| `action` | `"plan-not-saved"` |
| `amount` | `0`: no credits moved. |
| `description` | Such as `"Pro plan renewal charged; the plan was not saved"` or `"Max plan start charged; the plan was not saved"`. |
| `provider` | `"prepaid"` |
| `metadata` | `{ tier, priceUsd, chargedUsd, walletKey }`: the plan that was charged (`null` for a plan with no name), its price, what the wallet paid, and the id of that wallet payment. |

The agent's [activity log](/docs/agent-logs#who-did-what-rows) gets an `AGENT_PLAN_NOT_SAVED` row with the same payment, titled like `Pro plan renewal did not finish: $24.00 charged`.

## Errors

| Error | When |
|-------|------|
| `useragentguid is required` | `TransactionList` without `useragentguid` |
| `useragent-access-denied` | Caller is neither the owner nor on the agent's team |
| `useragent-team-admin-required` | Caller is a member of the agent's team but not a team admin (code `97`) |
| `Invalid credentials` | API key is missing or doesn't resolve to a valid Wiro user |
| `transactions-list-failed` | `TransactionList` server-side error (DB): surfaced loudly so it's distinguishable from "empty ledger" |

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

- [Agent Logs](/docs/agent-logs): Activity feed (tool calls, cron runs, message exchanges) for the same useragent
- [Agent Overview](/docs/agent-overview): Full agent endpoint catalog, including subscription / billing operations
- [Agent Builder](/docs/agent-builder): Build a custom agent and watch the ledger fill up as it runs
