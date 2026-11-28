# Pricing

Understand how billing works for AI model runs on Wiro.

## Overview

When you run an AI model through Wiro, you are billed based on the type of work performed. Each model has its own pricing, visible on the model's page in the [marketplace](https://wiro.ai/models) and on the [pricing page](https://wiro.ai/product/pricing). You pay only for successful runs. Server errors are never billed.

Wiro uses a prepaid credit model. You [add credits](https://wiro.ai/panel/billing) to your account and they are drawn down as you use models. Credits also determine your [concurrency limit](/docs/concurrency-limits). The same balance pays agent plans and the AI usage an agent uses once its plan's included usage is used up (see [Pricing Model](/docs/agent-overview#pricing-model-plans-ai-usage-balance)).

## Billing Methods

Every model on Wiro uses one of the following billing methods. The method is set per model and determines how the cost is calculated.

### Fixed-Rate Methods

| Billing Method | Code | How it works |
|---|---|---|
| **Per Run** | `per-run` | Fixed cost per run, regardless of output. Most common for image generation, image editing, and simple models. |
| **Per Second of Run Time** | `per-run-second` | Cost per second of processing time. Used for models where runtime varies significantly. When no dynamic pricing is set, this is the default billing method: cost = elapsed seconds × cps rate. |
| **Per Output File** | `per-output-file` | Cost per output file generated. If the run produces multiple files, you pay per file. If no output is produced, the base price is charged once. |
| **Per Input and Output Token** | `per-total-token` | Cost per token used. Total tokens (input + output) are extracted from the model's usage metadata. |

### Usage-Based Methods

| Billing Method | Code | How it works |
|---|---|---|
| **Per Output Megapixel** | `per-output-megapixel` | Cost based on output resolution. Each 1,048,576 pixels (1024×1024) counts as one tier: `price` for the first, `priceExtra` for each further tier. Can also include per-input-image costs (`priceInput`) when the model processes input images. |
| **Per Second of Input Audio** | `per-input-audio-second` | Cost per second of input audio, measured from the duration of every input audio file. |
| **Per Second of Input Video** | `per-input-video-second` | Cost per second of input video, measured from the duration of every input video file. The model page shows the total as soon as a video is picked. |
| **Per Prompt Character** | `per-input-character` | Cost per character in the input prompt. Total cost = prompt length × price per character. |
| **Per Second of Output Video** | `per-output-video-second` | Cost per second of generated output video, measured from the duration of the output video. |

### Special Methods

| Billing Method | Code | How it works |
|---|---|---|
| **Per Conversation Turn** | `per-realtime-turn` | Used for realtime voice conversation models. Billing happens per turn during the session: each conversation turn has a cost that is deducted in real time. |
| **Set When the Run Ends** | `reported-price` | The model reports its cost when the run ends. |

## Dynamic Pricing

Many models have **dynamic pricing**: the cost varies based on the input parameters you choose. For example, a video generation model might charge different rates depending on the resolution and duration you select.

The pricing is returned in the `dynamicprice` field of the [Tool/List](/docs/models) and [Tool/Detail](/docs/models) API responses as a JSON array:

```json
[
  {
    "inputs": { "resolution": "720p", "duration": "5" },
    "price": 0.13,
    "priceMethod": "per-run"
  },
  {
    "inputs": { "resolution": "1080p", "duration": "5" },
    "price": 0.29,
    "priceMethod": "per-run"
  }
]
```

### How Dynamic Pricing Works

Each entry in the `dynamicprice` array represents a pricing tier:

| Field | Type | Description |
|---|---|---|
| `inputs` | object | The input parameter combination this price applies to. Empty `{}` means the price applies to all configurations. |
| `price` | number | The cost in USD for this configuration. |
| `priceMethod` | string | The billing method code (see tables above). |
| `priceExtra` | number (optional) | Extra cost per additional tier. Used by `per-output-megapixel`: each additional 1MP tier costs this amount. |
| `priceInput` | number (optional) | Per-input cost. Used by `per-output-megapixel`: each input image incurs this additional cost per 1MP tier. |
| `maxSeconds` | number (optional) | Used by `per-input-audio-second` and `per-input-video-second`: each input counts at most this many seconds, because the model processes only that much of a longer input. |

When `inputs` contains specific parameter values (e.g. `"resolution": "720p"`), that price only applies when you run the model with those exact parameters. When `inputs` is empty (`{}`), it's a flat rate that applies regardless of input parameters.

Input matching also supports `QUANTITY` values (e.g. `"QUANTITY:1"`, `"QUANTITY:3"`) for models where the number of input files affects pricing.

### Example: Video Generation Pricing

A video model might have pricing tiers based on resolution and duration:

| Resolution | Duration | Price |
|---|---|---|
| 480p | 5 seconds | $0.06 |
| 720p | 5 seconds | $0.13 |
| 1080p | 5 seconds | $0.29 |
| 480p | 10 seconds | $0.12 |
| 720p | 10 seconds | $0.26 |
| 1080p | 10 seconds | $0.58 |

### Example: Simple Flat Pricing

An image generation model with a flat rate:

```json
[{ "inputs": {}, "price": 0.03, "priceMethod": "per-run" }]
```

This means every run costs $0.03, regardless of parameters.

## Fallback Pricing (Per-Second)

When a model does not have `dynamicprice` set, billing falls back to **per-second pricing**. The cost is calculated as:

```
totalcost = elapsed_seconds × cps
```

Where `cps` (cost per second) is the model's own rate or Wiro's default per-second rate. The API also returns an `approximatelycost` field, an estimate based on the model's average run time:

```
approximatelycost = average_elapsed_seconds × cps
```

This gives you a rough idea of the expected cost before running the model.

## Checking Prices

### Via the API

Pricing information is included in both the [Tool/List](/docs/models) and [Tool/Detail](/docs/models) responses in the `dynamicprice` field. Use `POST /Tool/Detail` with the model's `slugowner` and `slugproject` to get full pricing details.

### Via MCP

When using the [MCP server](/docs/wiro-mcp-server), both `search_models` and `get_model_schema` tools return pricing information in their responses. Your AI assistant can check the cost before running a model.

### Pricing Page

Browse and compare model prices interactively on the [pricing page](https://wiro.ai/product/pricing). Select a budget to see how many runs each model can perform.

## What You Pay For

You are billed only for **successfully completed** model runs, where the task reaches `task_postprocess_end` status with `pexit` of `"0"`. The actual cost is recorded in the task's `totalcost` field, which you can retrieve via [Task/Detail](/docs/tasks).

**Important:** `task_postprocess_end` does **not** always mean success. Both successful and failed runs reach this status. You must check `pexit` to determine the outcome:

- `pexit: "0"` means success. You are billed and `totalcost` reflects the charge
- `pexit: "1"` (or any non-zero) means failure. **You are not charged** and `totalcost` is `"0"`

## What You Are Not Charged For

- **Failed tasks**: if `pexit` is non-zero, no charge is incurred regardless of how long the model ran.
- **Server errors**: if a run fails due to a server-side error, no charge is incurred.
- **Queue time**: time spent waiting in the queue before processing starts is free.
- **Cancelled tasks**: tasks cancelled before processing completes are not billed.

## Monitoring Your Spending

### Via the API

Check the `totalcost` field in [Task/Detail](/docs/tasks) responses to see the cost of individual runs:

```json
{
  "tasklist": [{
    "status": "task_postprocess_end",
    "pexit": "0",
    "totalcost": "0.003510000000",
    "elapsedseconds": "6.0000"
  }]
}
```

An agent's plan payments and AI usage have no task: read one agent's with [`UserAgent/TransactionList`](/docs/agent-transactions), or the whole workspace's with `Wallet/TransactionList` and `surface: "agent"` (see [Wallet Billing Flow](/docs/organizations-api-access#billing-flow)).

### Via MCP

The [MCP server](/docs/wiro-mcp-server) provides three ways to check costs:

- **`get_task`**: returns full task details including `totalcost`
- **`get_task_price`**: dedicated tool that returns just the cost, billing status, and duration. Clearly indicates whether the task was billed or not.
- **`get_account`**: with `recent_transactions`, lists the wallet's latest transactions, newest first, with what each one was for. Use it to check that a charge landed.

### Dashboard

View your overall balance, usage history, and billing details in the [Dashboard](https://wiro.ai/panel/billing).

### Spend Limits

To cap what you spend, set monthly or daily spend limits under [Controls > Spend Limits](https://wiro.ai/panel/controls/spend-limits) in the dashboard or with the `/SpendLimit` endpoints: for the whole wallet, one API key, one team member, one way in such as the API or the LLM gateway, or one agent. Once a limit is reached, new work it covers is refused with error code `93`, and an alert email can warn you before that. See [Spend Limits](/docs/spend-limits).
