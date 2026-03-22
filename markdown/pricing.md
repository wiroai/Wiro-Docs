# Pricing

Understand how billing works for AI model runs on Wiro.

## Overview

When you run an AI model through Wiro, you are billed based on the type of work performed. Each model has its own pricing, visible on the model's page in the [marketplace](https://wiro.ai/models) and on the [pricing page](https://wiro.ai/product/pricing). You pay only for successful runs — server errors are never billed.

Wiro uses a prepaid credit model. You [add credits](https://wiro.ai/panel/billing) to your account and they are drawn down as you use models. Credits also determine your [concurrency limit](/docs/concurrency-limits).

## Billing Methods

Every model on Wiro uses one of the following billing methods. The method is set per model and determines how the cost is calculated.

### Fixed-Rate Methods

| Billing Method | Code | How it works |
|---|---|---|
| **Per Request** | `cpr` | Fixed cost per run, regardless of output. Most common for image generation, image editing, and simple models. |
| **Per Second** | `cps` | Cost per second of processing time. Used for models where runtime varies significantly. When no dynamic pricing is set, this is the default billing method — cost = elapsed seconds × cps rate. |
| **Per Output** | `cpo` | Cost per output item generated. If the run produces multiple files, you pay per file. If no output is produced, the base price is charged once. |
| **Per Token** | `cpt` | Cost per token used. Total tokens (input + output) are extracted from the model's usage metadata. Used for LLM models. |

### Usage-Based Methods

| Billing Method | Code | How it works |
|---|---|---|
| **Per Pixel** | `cp-pixel` | Cost based on output resolution. Each 1,048,576 pixels (1024×1024) counts as one tier. Higher resolutions cost proportionally more. Can also include per-input-image costs (`priceInput`) when the model processes input images. |
| **Per Audio Second** | `cp-audiosecondslength` | Cost per second of input audio duration. The system measures the duration of all input audio files using ffprobe and bills accordingly. |
| **Per Character** | `cp-promptlength` | Cost per character in the input prompt. Total cost = prompt length × price per character. |
| **Per Video Second** | `cp-outputVideoLength` | Cost per second of generated output video. The system measures the output video duration using ffprobe and bills accordingly. |

### Special Methods

| Billing Method | Code | How it works |
|---|---|---|
| **Per Realtime Turn** | `cp-realtimeturn` | Used for realtime voice conversation models. Billing happens per turn during the session — each conversation turn has a cost that is deducted in real time. |
| **Model-Reported** | `cp-readoutput` | The model itself reports the cost in its output. The system extracts the price from the model's stdout or stderr JSON output. |

## Dynamic Pricing

Many models have **dynamic pricing** — the cost varies based on the input parameters you choose. For example, a video generation model might charge different rates depending on the resolution and duration you select.

The pricing is returned in the `dynamicprice` field of the [Tool/List](/docs/models) and [Tool/Detail](/docs/models) API responses as a JSON array:

```json
[
  {
    "inputs": { "resolution": "720p", "duration": "5" },
    "price": 0.13,
    "priceMethod": "cpr"
  },
  {
    "inputs": { "resolution": "1080p", "duration": "5" },
    "price": 0.29,
    "priceMethod": "cpr"
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
| `priceExtra` | number (optional) | Extra cost per additional tier. Currently used by `cp-pixel` — each additional 1MP tier costs this amount. |
| `priceInput` | number (optional) | Per-input cost. Currently used by `cp-pixel` — each input image incurs this additional cost per 1MP tier. |

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
[{ "inputs": {}, "price": 0.03, "priceMethod": "cpr" }]
```

This means every run costs $0.03, regardless of parameters.

## Fallback Pricing (Per-Second)

When a model does not have `dynamicprice` set, billing falls back to **per-second pricing**. The cost is calculated as:

```
totalcost = elapsed_seconds × cps
```

Where `cps` (cost per second) is either the model's own rate or the queue group's default rate. The API also returns an `approximatelycost` field — an estimate based on the model's average run time:

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

You are billed only for **successfully completed** model runs — when the task reaches `task_postprocess_end` status with `pexit` of `"0"`. The actual cost is recorded in the task's `totalcost` field, which you can retrieve via [Task/Detail](/docs/tasks).

**Important:** `task_postprocess_end` does **not** always mean success. Both successful and failed runs reach this status. You must check `pexit` to determine the outcome:

- `pexit: "0"` — success, you are billed, `totalcost` reflects the charge
- `pexit: "1"` (or any non-zero) — failure, **you are not charged**, `totalcost` is `"0"`

## What You Are Not Charged For

- **Failed tasks** — if `pexit` is non-zero, no charge is incurred regardless of how long the model ran.
- **Server errors** — if a run fails due to a server-side error, no charge is incurred.
- **Queue time** — time spent waiting in the queue before processing starts is free.
- **Cancelled tasks** — tasks cancelled before processing completes are not billed.

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

### Via MCP

The [MCP server](/docs/wiro-mcp-server) provides two ways to check costs:

- **`get_task`** — returns full task details including `totalcost`
- **`get_task_price`** — dedicated tool that returns just the cost, billing status, and duration. Clearly indicates whether the task was billed or not.

### Dashboard

View your overall balance, usage history, and billing details in the [Dashboard](https://wiro.ai/panel/billing).
