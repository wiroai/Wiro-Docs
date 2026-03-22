# Concurrency Limits

Understand and manage how many requests you can run simultaneously on Wiro.

## Overview

Concurrency limits control how many tasks your account can process at the same time. When you reach your limit, the API returns an error response with code `96`. You should wait for a running task to complete before submitting a new one, or add funds to increase your limit.

## How It Works

Your concurrency limit is determined by your current account balance:

- When your balance is **$250 or below**, you can run concurrent tasks equal to **10% of your current USD balance** (minimum 1).
- When your balance is **above $250**, there is **no concurrency limit**.

### Examples

| Account Balance | Concurrent Task Limit |
|-----------------|----------------------|
| $10 | 1 concurrent task (minimum) |
| $50 | 5 concurrent tasks |
| $100 | 10 concurrent tasks |
| $150 | 15 concurrent tasks |
| $250 | 25 concurrent tasks |
| $251+ | **Unlimited** (no limit applied) |

The formula: `max(1, floor(balance_usd * 0.10))`. Once your balance exceeds $250, all limits are removed.

## What Counts as Active

Only tasks that are actively being processed count toward your concurrency limit. A task is considered active from `task_queue` until it reaches a terminal status:

- `task_postprocess_end` — task completed (success or failure)
- `task_cancel` — task was cancelled or killed

Once a task reaches either of these statuses, it no longer counts toward your limit.

## API Response

When you hit the concurrency limit, the `POST /Run` endpoint returns an error with code `96`:

```json
{
  "result": false,
  "errors": [
    {
      "code": 96,
      "message": "You have reached your concurrent task limit. With your current balance of $50.00, you can run up to 5 tasks at the same time. Add funds to increase your limit."
    }
  ]
}
```

The error message includes your current balance and the calculated limit, so you know exactly how many concurrent tasks you can run.

### Error Codes

| Code | Meaning | Action |
|------|---------|--------|
| `96` | Concurrent task limit reached | Wait for a running task to finish, or [add funds](https://wiro.ai/panel/billing) |
| `97` | Insufficient balance | [Add funds](https://wiro.ai/panel/billing) to your account |

## Increasing Your Limit

To increase your concurrency limit, simply [add credits to your account](https://wiro.ai/panel/billing). Your limit is recalculated automatically based on your current balance at the time of each run request.

For enterprise needs or custom concurrency arrangements, [contact support](mailto:support@wiro.ai).

## Best Practices

- **Check error code `96`** — if you get this error, wait for a running task to complete before submitting new ones.
- **Use [WebSocket](/docs/websocket) for monitoring** — instead of polling `/Task/Detail` repeatedly, connect via WebSocket to get real-time updates without extra API calls.
- **Use `wait=false` in MCP** — for long-running models (video, 3D), submit with `wait=false` and check with `get_task` to avoid holding connections.
- **Implement exponential backoff** — if polling task status, start at 3 seconds and increase the interval for longer tasks.
