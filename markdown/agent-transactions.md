# Agent Transactions

What an agent cost, in dollars: its AI usage, the models it ran, its plan payments and the funds added for it, in one list.

## Overview

Every charge an agent makes is a row of the wallet transactions of its workspace, the same ledger as your model runs. `POST /UserAgent/TransactionList` lists the rows of one agent, newest first, with a summary of the current month. It powers the agent's **Transactions** view in the Wiro dashboard.

| `kind` | What the row is |
|--------|-----------------|
| `ai-usage` | The tokens the agent's own model used: one or more calls of one model, with the tokens and the cost of each kind (input, cache read, cache write, output). `paidfrom` says whether the plan's included usage covered it (`"plan"`) or the balance paid it (`"balance"` or `"coupon"`). |
| `model-run` | A model the agent ran through Wiro, such as an image or a video, paid from the balance at the model's own price. |
| `plan` | A plan payment: the plan the agent was deployed on, a move to a higher plan or a renewal. |
| `funds` | Funds added to the balance from the agent's page in the dashboard, and what was left of a pack bought before packs were retired. They go to the workspace's balance like any deposit. |
| `other` | Anything else recorded for the agent. |

AI usage that the plan covers is listed so you can see what the plan paid for, but it doesn't change the balance: the plan payment already paid for it. It counts in `summary.aiusageplanusd`, never in what the balance paid.

> **Rows from before dollar billing.** The agent's usage and plan records from before agents were billed in dollars are listed too, with `legacy: true` and their amounts converted to dollars. Renewals of a plan that was paid by card are always listed this way: they never touched the balance.

## **POST** /UserAgent/TransactionList

Returns one agent's rows, newest first, and a summary of the current calendar month (UTC).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | The useragent instance guid. |
| `kind` | string | No | `"all"` (the default), `"ai-usage"`, `"model-run"`, `"plan"` or `"funds"`: only the rows of that kind. Any other value lists all rows. |
| `limit` | number | No | Max rows to return. Default `50`, max `500`. |
| `start` | number | No | Offset for pagination. Default `0`. |

**Authorization:** the agent's owner, a team admin of the agent's team or the organization owner (plain team members are rejected with code `97`). No extra header is needed.

##### Request

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/TransactionList" \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321", "kind": "all", "limit": 50 }'
```

##### Response

```json
{
  "result": true,
  "errors": [],
  "kind": "all",
  "rowstotal": 214,
  "summary": {
    "month": "2026-11",
    "planusd": 30,
    "aiusageplanusd": 12.4,
    "aiusagebalanceusd": 0,
    "modelrunsusd": 3.2,
    "fundsaddedusd": 20,
    "includedusd": 30,
    "usage": {
      "period": "2026-11",
      "resetsat": 1797724800,
      "includedusd": 30,
      "usedusd": 12.4,
      "leftusd": 17.6,
      "renewalusd": 30,
      "frombalanceusd": 0,
      "balanceusd": 42.1,
      "wallet": "personal",
      "minbalanceusd": 0.5,
      "paused": false,
      "pausedreason": null
    }
  },
  "rows": [
    {
      "id": "wt-918273",
      "createdat": 1795167000,
      "kind": "ai-usage",
      "title": "AI Usage",
      "description": "AI usage: Sales Desk (openai/gpt-5.6-terra, 54,969 tokens)",
      "model": "openai/gpt-5.6-terra",
      "tokens": { "input": 6, "cacheRead": 50147, "cacheWrite": 4683, "output": 133 },
      "costs": { "input": 0.0000132, "cacheRead": 0.0110323, "cacheWrite": 0.0128783, "output": 0.0017556 },
      "amountusd": 0.02,
      "paidfrom": "plan",
      "direction": "out",
      "surface": "agent",
      "taskid": null,
      "legacy": false
    },
    {
      "id": "wt-918240",
      "createdat": 1795132800,
      "kind": "model-run",
      "title": "Model Run",
      "description": null,
      "model": "google/nano-banana",
      "tokens": null,
      "costs": null,
      "amountusd": 0.15,
      "paidfrom": "balance",
      "direction": "out",
      "surface": "agent",
      "taskid": "8812345",
      "legacy": false
    },
    {
      "id": "wt-917002",
      "createdat": 1793491200,
      "kind": "plan",
      "title": "Agent renewal: Pro plan (Sales Desk)",
      "description": "Agent renewal: Pro plan (Sales Desk)",
      "model": null,
      "tokens": null,
      "costs": null,
      "amountusd": 30,
      "paidfrom": "balance",
      "direction": "out",
      "surface": "agent",
      "taskid": null,
      "legacy": false
    },
    {
      "id": "ut-3c4d5e6f-7a8b-4c9d-8e0f-1a2b3c4d5e01",
      "createdat": 1792886400,
      "kind": "ai-usage",
      "title": "AI Usage",
      "description": "LLM openai/gpt-5.4 (uncached in 3450, cached in 512, out 820, total 4782 tokens)",
      "model": "openai/gpt-5.4",
      "tokens": { "input": 3450, "cacheRead": 512, "cacheWrite": 0, "output": 820 },
      "costs": null,
      "amountusd": 0.05,
      "paidfrom": "plan",
      "direction": "out",
      "surface": null,
      "taskid": null,
      "legacy": true
    }
  ]
}
```

**Summary fields** (the current calendar month, UTC, in USD):

| Field | Type | Description |
|-------|------|-------------|
| `month` | `string` | The month the figures cover, `'YYYY-MM'`. |
| `planusd` | `number` | Plan payments for the agent. |
| `aiusageplanusd` | `number` | AI usage the plan's included usage covered. |
| `aiusagebalanceusd` | `number` | AI usage paid from the balance. |
| `modelrunsusd` | `number` | Models the agent ran. |
| `fundsaddedusd` | `number` | Funds added from the agent's page. |
| `includedusd` | `number` | The AI usage the plan includes this period. |
| `usage` | `object` | The agent's `usage`, as on [`UserAgent/Detail`](/docs/agent-overview#usage-object). |

The summary also still carries the credit counts it had before dollar billing (`monthlycredits`, `renewalcredits`, `extracredits`, `usedcredits`, `remainingcredits`, `extrapacks`, `byModel` and the period fields), and the answer still carries the old `transactions` list and its `total`. They are deprecated and will be removed: read `rows`, `rowstotal` and the fields above.

**Row fields:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | The row's id, unique in the list. Read it as an opaque value. |
| `createdat` | `number` | Unix seconds. |
| `kind` | `string` | `"ai-usage"`, `"model-run"`, `"plan"`, `"funds"` or `"other"` (see the [Overview](#tx-overview)). |
| `title` | `string` | A short line that says what the row is, such as `AI Usage`, `Model Run` or the plan payment's line. Show it as it is: its wording can change. |
| `description` | `string\|null` | The ledger's own line for the row, when it has one, such as `AI usage: Sales Desk (openai/gpt-5.6-terra, 54,969 tokens)`. |
| `model` | `string\|null` | `ai-usage` rows: the model that served the calls. `model-run` rows: the model that ran, by its `owner/slug`. `null` otherwise. |
| `tokens` | `object\|null` | `ai-usage` rows: `{ input, cacheRead, cacheWrite, output }` token counts, where `input` is uncached input. `null` otherwise. |
| `costs` | `object\|null` | `ai-usage` rows: what each kind of token cost, in USD, exact to 7 decimals: `{ input, cacheRead, cacheWrite, output }`. `null` on other rows and on legacy rows. |
| `amountusd` | `number` | The row's amount in USD, in whole cents. On an `ai-usage` row the exact `costs` can leave a fraction of a cent: it carries to the agent's next row, so `amountusd` can differ from their sum by less than a cent. |
| `paidfrom` | `string\|null` | How the row was paid: `"plan"` (the plan's included usage), `"balance"` (the Wiro balance), `"coupon"` (coupon credit in the balance) or `"card"` (a card payment, such as a plan renewal from before plans moved to the balance, or funds added by card). |
| `direction` | `string` | `"out"` for spending, `"in"` for funds added and other credits. |
| `surface` | `string\|null` | The surface the row was charged on, such as `"agent"`. `null` on older rows. |
| `taskid` | `string\|null` | `model-run` rows: the task of the run (see [Tasks](/docs/tasks)). `null` otherwise. |
| `legacy` | `boolean` | `true` on rows from before dollar billing, converted to dollars. |

> **Pagination.** `rowstotal` is the number of rows the `kind` lists, so you can render a precise paginator. Default page size is 50, max is 500. Use `start` to skip rows.

## Reading the List: Patterns

### Daily AI usage

Add up the `ai-usage` rows per day, split by what paid for them:

```python
import requests
from collections import defaultdict
from datetime import datetime, timezone

resp = requests.post(
    "https://api.wiro.ai/v1/UserAgent/TransactionList",
    headers={"x-api-key": "YOUR_API_KEY", "Content-Type": "application/json"},
    json={"useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321", "kind": "ai-usage", "limit": 500}
).json()

per_day = defaultdict(lambda: {"plan": 0.0, "balance": 0.0})
for row in resp["rows"]:
    day = datetime.fromtimestamp(row["createdat"], timezone.utc).strftime("%Y-%m-%d")
    source = "plan" if row["paidfrom"] == "plan" else "balance"
    per_day[day][source] += row["amountusd"]

for day in sorted(per_day):
    print(f"{day}: ${per_day[day]['plan']:.2f} from the plan, ${per_day[day]['balance']:.2f} from the balance")
```

### Cost by token kind

Each `ai-usage` row says what each kind of token cost, so you can see whether cache reads, cache writes or output drive the bill:

```javascript
const totals = { input: 0, cacheRead: 0, cacheWrite: 0, output: 0 };
for (const row of rows.filter(r => r.kind === 'ai-usage' && r.costs)) {
  for (const k of Object.keys(totals)) totals[k] += row.costs[k] || 0;
}
console.log(totals);
```

### Reconcile a plan change

Every plan payment is a `plan` row: the deploy, a move to a higher plan (the prorated difference) and each renewal, with the plan's name in its `title`. A move to a lower plan charges nothing when it is asked for: the renewal that starts it is a `plan` row at the lower price. Use these rows to render a plan history in your UI.

## Errors

| Error | When |
|-------|------|
| `useragentguid is required` | `TransactionList` without `useragentguid` |
| `useragent-access-denied` | Caller is neither the owner nor on the agent's team |
| `useragent-team-admin-required` | Caller is a member of the agent's team but not a team admin (code `97`) |
| `Invalid credentials` | API key is missing or doesn't resolve to a valid Wiro user |
| `transactions-list-failed` | `TransactionList` server-side error (DB): surfaced loudly so it's distinguishable from an empty list |

## Code Examples

### curl

```bash
# Latest 50 rows for a useragent
curl -X POST "https://api.wiro.ai/v1/UserAgent/TransactionList" \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321", "limit": 50 }'

# Only the plan payments
curl -X POST "https://api.wiro.ai/v1/UserAgent/TransactionList" \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321", "kind": "plan" }'

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

s = resp["summary"]
print(f"{s['month']}: plan ${s['planusd']:.2f}, AI usage from the balance ${s['aiusagebalanceusd']:.2f}, model runs ${s['modelrunsusd']:.2f}")
print(f"Rows: {resp['rowstotal']}")

for row in resp["rows"][:10]:
    sign = "+" if row["direction"] == "in" else "-"
    print(f"  [{row['kind']:>9}] {sign}${row['amountusd']:.2f}  {row['title']}  ({row['paidfrom']})")
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

const { summary } = data;
console.log(`AI usage this month: $${summary.aiusageplanusd} from the plan, $${summary.aiusagebalanceusd} from the balance`);

data.rows.slice(0, 10).forEach(row => {
  const sign = row.direction === 'in' ? '+' : '-';
  console.log(`  [${row.kind.padStart(9)}] ${sign}$${row.amountusd.toFixed(2)}  ${row.title}`);
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

$s = $resp['summary'];
echo "Plan: \${$s['planusd']}, model runs: \${$s['modelrunsusd']}\n";
foreach (array_slice($resp['rows'], 0, 10) as $row) {
    $sign = $row['direction'] === 'in' ? '+' : '-';
    printf("[%s] %s$%.2f %s\n", $row['kind'], $sign, $row['amountusd'], $row['title']);
}
```

## What's Next

- [Agent Logs](/docs/agent-logs): Activity feed (tool calls, cron runs, message exchanges) for the same useragent
- [Agent Overview](/docs/agent-overview): Full agent endpoint catalog, including plans, AI usage and the balance
- [Agent Builder](/docs/agent-builder): Build a custom agent and watch its usage come in as it runs
