# Concurrency Limits

Understand and manage how many requests you can run simultaneously on Wiro.

## Overview

Concurrency limits control how many tasks your account can process at the same time. When you reach your limit, the API returns an error response with code `96`. You should wait for a running task to complete before submitting a new one, or add funds to increase your limit.

## How It Works

Your concurrency limit is determined by your current account balance:

- When your balance is **$250 or below**, your limit is **one unfinished task for each full $10** of balance, never less than 1. So $20 allows 2, $55 allows 5 and $250 allows 25.
- When your balance is **above $250**, there is **no concurrency limit**.

The balance is the credit that can pay for the model you run. Coupon credit that only works on other models is left out, so for those runs the limit can be lower than your wallet total would give.

For a team project's API key (or the team workspace in the dashboard), the limit uses the **team wallet's** balance, and every unfinished team task counts toward it, whichever member started it. Personal tasks count only against your personal balance. See [Team Billing & Spending](/docs/organizations-billing).

### Examples

| Account Balance | Concurrent Task Limit |
|-----------------|----------------------|
| $10 | 1 concurrent task (minimum) |
| $50 | 5 concurrent tasks |
| $100 | 10 concurrent tasks |
| $150 | 15 concurrent tasks |
| $250 | 25 concurrent tasks |
| Above $250 | **Unlimited** (no limit applied) |

The formula: `max(1, floor(balance_usd * 0.10))` while the balance is $250 or less. Above $250 there is no concurrency limit.

## What Counts as Active

Every unfinished task counts toward your concurrency limit, from `task_queue` until it reaches one of these statuses:

- `task_postprocess_end`: task completed (success or failure)
- `task_cancel`: task was cancelled or killed

Until then the task counts, including while it waits in the queue and while it is in `task_error`, which does not close a task. Once it reaches either of these statuses, it no longer counts toward your limit.

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
| `96` | Concurrent task limit reached | Wait for a running task to finish, or [add funds](https://wiro.ai/panel/wallet/deposit/credit-card) |
| `97` | Insufficient balance | [Add funds](https://wiro.ai/panel/wallet/deposit/credit-card) to your account |

## Handling Code 96

A refused request returns HTTP `200` with `"result": false` and an error with code `96`. No task is created and nothing is charged. Handle it in one of these ways:

- **Wait and retry:** send the same request again after a growing wait, for example 2, 4, then 8 seconds, up to a minute. The code examples on this page do this: they look for the number `96` in `errors[].code`, retry only that code, treat `"result": true` as success and stop after 8 attempts.
- **Queue on your side:** keep at most as many unfinished tasks as your limit allows, and send the next request when a task reaches `task_postprocess_end` or `task_cancel` ([Task/Detail](/docs/tasks) or the [WebSocket](/docs/websocket)). Tasks started on the website, by agents and by workflows, and in a team by other members, use the same slots.
- **Direct LLM Gateway:** through the [Direct LLM Gateway](/docs/completions-api) the refusal arrives as HTTP `429` with error type `rate_limit_error` and a `retry-after` header; wait that many seconds before you retry. A streamed Responses request has already answered `200`, so it ends with `response.failed` carrying code `rate_limit_exceeded` and has no such header; use a growing wait there.
- **Wiro MCP server:** through the [Wiro MCP server](/docs/wiro-mcp-server), `run_model` returns the same message as its tool error.

## Increasing Your Limit

To increase your concurrency limit, [add credits to your account](https://wiro.ai/panel/wallet/deposit/credit-card). Your limit is recalculated automatically based on your current balance at the time of each run request.

## Best Practices

- **Check error code `96`:** if you get this error, wait for a running task to complete before submitting new ones. See [Handling Code 96](/docs/concurrency-limits#concurrency-handling-code-96).
- **Use [WebSocket](/docs/websocket) for monitoring:** instead of polling `/Task/Detail` repeatedly, connect via WebSocket to get real-time updates without extra API calls.
- **Use bounded MCP waits:** `run_model` waits up to 45 seconds by default and
  returns a recoverable token when the task is still active. Continue with
  `wait_for_task`; do not call `run_model` again for the same request. Use
  `wait=false` only when you need the token immediately, and `get_task` for a
  one-time status check.
- **Implement exponential backoff:** if polling task status, start at 3 seconds and increase the interval for longer tasks.

## Code Examples

Each example sends a run, waits and sends the same request again while the response carries code `96`, and stops after 8 attempts or on any other error.

### curl

```bash
#!/bin/bash
# Run a model and, on code 96, send the same request again after a growing wait

API_KEY="YOUR_API_KEY"
RUN_URL="https://api.wiro.ai/v1/Run/{owner-slug}/{model-slug}"
MAX_ATTEMPTS=8
DELAY=2

for ATTEMPT in $(seq 1 $MAX_ATTEMPTS); do
  RESPONSE=$(curl -s -X POST "$RUN_URL" \
    -H "Content-Type: application/json" \
    -H "x-api-key: $API_KEY" \
    -d '{"prompt": "A futuristic city at sunset"}')

  STATE=$(echo "$RESPONSE" | python3 -c "import sys, json; r = json.load(sys.stdin); print('ok' if r.get('result') is True else 'limit' if any(e.get('code') == 96 for e in r.get('errors') or []) else 'other')")

  if [ "$STATE" = "ok" ]; then
    echo "$RESPONSE"
    break
  fi
  if [ "$STATE" != "limit" ] || [ "$ATTEMPT" -eq "$MAX_ATTEMPTS" ]; then
    echo "Run not started: $RESPONSE" >&2
    break
  fi

  # Code 96 created no task and charged nothing, so the same request can be sent again
  sleep "$DELAY"
  DELAY=$(( DELAY * 2 > 60 ? 60 : DELAY * 2 ))
done
```

### Python

```python
import time
import requests

API_KEY = "YOUR_API_KEY"
RUN_URL = "https://api.wiro.ai/v1/Run/{owner-slug}/{model-slug}"
MAX_ATTEMPTS = 8


def run_with_retry(params):
    delay = 2
    for attempt in range(1, MAX_ATTEMPTS + 1):
        response = requests.post(
            RUN_URL,
            headers={"x-api-key": API_KEY, "Content-Type": "application/json"},
            json=params,
        )
        data = response.json()
        if data.get("result") is True:
            return data  # taskid and socketaccesstoken

        codes = [error.get("code") for error in data.get("errors") or []]
        if 96 not in codes or attempt == MAX_ATTEMPTS:
            raise RuntimeError(f"Run not started: {data.get('errors')}")

        # Code 96 created no task and charged nothing, so the same request can be sent again
        time.sleep(delay)
        delay = min(delay * 2, 60)


run = run_with_retry({"prompt": "A futuristic city at sunset"})
print("Task ID:", run["taskid"])
```

### Node.js

```javascript
const axios = require('axios');

const API_KEY = 'YOUR_API_KEY';
const RUN_URL = 'https://api.wiro.ai/v1/Run/{owner-slug}/{model-slug}';
const MAX_ATTEMPTS = 8;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runWithRetry(params) {
  let delay = 2;
  for (let attempt = 1; ; attempt++) {
    const { data } = await axios.post(RUN_URL, params, {
      headers: { 'x-api-key': API_KEY, 'Content-Type': 'application/json' }
    });
    if (data.result === true) return data; // taskid and socketaccesstoken

    const limited = (data.errors || []).some((error) => error.code === 96);
    if (!limited || attempt === MAX_ATTEMPTS) {
      throw new Error(`Run not started: ${JSON.stringify(data.errors)}`);
    }

    // Code 96 created no task and charged nothing, so the same request can be sent again
    await sleep(delay * 1000);
    delay = Math.min(delay * 2, 60);
  }
}

runWithRetry({ prompt: 'A futuristic city at sunset' })
  .then((run) => console.log('Task ID:', run.taskid))
  .catch((error) => console.error(error.message));
```

### PHP

```php
<?php
$apiKey = 'YOUR_API_KEY';
$runUrl = 'https://api.wiro.ai/v1/Run/{owner-slug}/{model-slug}';
$maxAttempts = 8;

function runWithRetry(string $runUrl, string $apiKey, array $params, int $maxAttempts): array {
    $delay = 2;
    for ($attempt = 1; ; $attempt++) {
        $ch = curl_init($runUrl);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'x-api-key: ' . $apiKey,
            ],
            CURLOPT_POSTFIELDS => json_encode($params),
        ]);
        $data = json_decode(curl_exec($ch), true);
        curl_close($ch);

        if (($data['result'] ?? false) === true) {
            return $data; // taskid and socketaccesstoken
        }

        $codes = array_column($data['errors'] ?? [], 'code');
        if (!in_array(96, $codes, true) || $attempt === $maxAttempts) {
            throw new RuntimeException('Run not started: ' . json_encode($data['errors'] ?? null));
        }

        // Code 96 created no task and charged nothing, so the same request can be sent again
        sleep($delay);
        $delay = min($delay * 2, 60);
    }
}

$run = runWithRetry($runUrl, $apiKey, ['prompt' => 'A futuristic city at sunset'], $maxAttempts);
echo "Task ID: {$run['taskid']}\n";
```

### C#

```csharp
using System.Linq;
using System.Net.Http.Json;
using System.Text.Json;

var apiKey = "YOUR_API_KEY";
var runUrl = "https://api.wiro.ai/v1/Run/{owner-slug}/{model-slug}";
const int maxAttempts = 8;

using var http = new HttpClient();
http.DefaultRequestHeaders.Add("x-api-key", apiKey);

async Task<JsonElement> RunWithRetry(object parameters)
{
    var delay = 2;
    for (var attempt = 1; ; attempt++)
    {
        var response = await http.PostAsJsonAsync(runUrl, parameters);
        var data = await response.Content.ReadFromJsonAsync<JsonElement>();
        if (data.TryGetProperty("result", out var result) && result.ValueKind == JsonValueKind.True)
            return data; // taskid and socketaccesstoken

        var limited = data.TryGetProperty("errors", out var errors)
            && errors.ValueKind == JsonValueKind.Array
            && errors.EnumerateArray().Any(error =>
                error.TryGetProperty("code", out var code)
                && code.ValueKind == JsonValueKind.Number
                && code.GetInt32() == 96);
        if (!limited || attempt == maxAttempts)
            throw new Exception($"Run not started: {data}");

        // Code 96 created no task and charged nothing, so the same request can be sent again
        await Task.Delay(TimeSpan.FromSeconds(delay));
        delay = Math.Min(delay * 2, 60);
    }
}

var run = await RunWithRetry(new { prompt = "A futuristic city at sunset" });
Console.WriteLine($"Task ID: {run.GetProperty("taskid")}");
```

### Go

```go
package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

const (
	apiKey      = "YOUR_API_KEY"
	runURL      = "https://api.wiro.ai/v1/Run/{owner-slug}/{model-slug}"
	maxAttempts = 8
)

type wiroError struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
}

type runResponse struct {
	Result            bool        `json:"result"`
	Errors            []wiroError `json:"errors"`
	TaskID            json.Number `json:"taskid"`
	SocketAccessToken string      `json:"socketaccesstoken"`
}

func runOnce(params map[string]interface{}) (*runResponse, error) {
	body, _ := json.Marshal(params)
	req, _ := http.NewRequest("POST", runURL, bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-api-key", apiKey)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var data runResponse
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return nil, err
	}
	return &data, nil
}

func hasCode(errs []wiroError, code int) bool {
	for _, e := range errs {
		if e.Code == code {
			return true
		}
	}
	return false
}

func runWithRetry(params map[string]interface{}) (*runResponse, error) {
	delay := 2 * time.Second
	for attempt := 1; ; attempt++ {
		data, err := runOnce(params)
		if err != nil {
			return nil, err
		}
		if data.Result {
			return data, nil // taskid and socketaccesstoken
		}
		if !hasCode(data.Errors, 96) || attempt == maxAttempts {
			return nil, fmt.Errorf("run not started: %+v", data.Errors)
		}

		// Code 96 created no task and charged nothing, so the same request can be sent again
		time.Sleep(delay)
		delay *= 2
		if delay > 60*time.Second {
			delay = 60 * time.Second
		}
	}
}

func main() {
	run, err := runWithRetry(map[string]interface{}{
		"prompt": "A futuristic city at sunset",
	})
	if err != nil {
		fmt.Println(err)
		return
	}
	fmt.Printf("Task ID: %s\n", run.TaskID)
}
```

### Swift

```swift
import Foundation

let apiKey = "YOUR_API_KEY"
let runUrl = URL(string: "https://api.wiro.ai/v1/Run/{owner-slug}/{model-slug}")!
let maxAttempts = 8

struct RunNotStarted: Error {
    let errors: String
}

func runOnce(_ params: [String: Any]) async throws -> [String: Any] {
    var request = URLRequest(url: runUrl)
    request.httpMethod = "POST"
    request.addValue("application/json", forHTTPHeaderField: "Content-Type")
    request.addValue(apiKey, forHTTPHeaderField: "x-api-key")
    request.httpBody = try JSONSerialization.data(withJSONObject: params)

    let (data, _) = try await URLSession.shared.data(for: request)
    return try JSONSerialization.jsonObject(with: data) as? [String: Any] ?? [:]
}

func runWithRetry(_ params: [String: Any]) async throws -> [String: Any] {
    var delay: UInt64 = 2
    var attempt = 1
    while true {
        let data = try await runOnce(params)
        if data["result"] as? Bool == true {
            return data // taskid and socketaccesstoken
        }

        let errors = data["errors"] as? [[String: Any]] ?? []
        let limited = errors.contains { ($0["code"] as? Int) == 96 }
        if !limited || attempt == maxAttempts {
            throw RunNotStarted(errors: String(describing: errors))
        }

        // Code 96 created no task and charged nothing, so the same request can be sent again
        try await Task.sleep(nanoseconds: delay * 1_000_000_000)
        delay = min(delay * 2, 60)
        attempt += 1
    }
}

let run = try await runWithRetry(["prompt": "A futuristic city at sunset"])
print("Task ID: \(run["taskid"] ?? "")")
```

### Kotlin

```kotlin
import java.net.URI
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse
import com.google.gson.Gson
import com.google.gson.JsonObject

val apiKey = "YOUR_API_KEY"
val runUrl = "https://api.wiro.ai/v1/Run/{owner-slug}/{model-slug}"
val maxAttempts = 8
val client = HttpClient.newHttpClient()
val gson = Gson()

fun runOnce(params: Map<String, Any?>): JsonObject {
    val request = HttpRequest.newBuilder()
        .uri(URI.create(runUrl))
        .header("Content-Type", "application/json")
        .header("x-api-key", apiKey)
        .POST(HttpRequest.BodyPublishers.ofString(gson.toJson(params)))
        .build()
    val response = client.send(request, HttpResponse.BodyHandlers.ofString())
    return gson.fromJson(response.body(), JsonObject::class.java)
}

fun runWithRetry(params: Map<String, Any?>): JsonObject {
    var delaySeconds = 2L
    var attempt = 1
    while (true) {
        val data = runOnce(params)
        if (data.get("result")?.asBoolean == true) return data // taskid and socketaccesstoken

        val errors = data.getAsJsonArray("errors")
        val limited = errors?.any { it.asJsonObject.get("code")?.asInt == 96 } == true
        if (!limited || attempt == maxAttempts) {
            throw IllegalStateException("Run not started: $errors")
        }

        // Code 96 created no task and charged nothing, so the same request can be sent again
        Thread.sleep(delaySeconds * 1000)
        delaySeconds = minOf(delaySeconds * 2, 60L)
        attempt++
    }
}

fun main() {
    val run = runWithRetry(mapOf("prompt" to "A futuristic city at sunset"))
    println("Task ID: ${run.get("taskid").asString}")
}
```

### Dart

```dart
import 'dart:convert';
import 'package:http/http.dart' as http;

const apiKey = 'YOUR_API_KEY';
const runUrl = 'https://api.wiro.ai/v1/Run/{owner-slug}/{model-slug}';
const maxAttempts = 8;

Future<Map<String, dynamic>> runWithRetry(Map<String, dynamic> params) async {
  var delay = 2;
  for (var attempt = 1; ; attempt++) {
    final response = await http.post(
      Uri.parse(runUrl),
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: jsonEncode(params),
    );
    final data = jsonDecode(response.body) as Map<String, dynamic>;
    if (data['result'] == true) return data; // taskid and socketaccesstoken

    final errors = (data['errors'] as List?) ?? [];
    final limited = errors.any((error) => error['code'] == 96);
    if (!limited || attempt == maxAttempts) {
      throw Exception('Run not started: ${data['errors']}');
    }

    // Code 96 created no task and charged nothing, so the same request can be sent again
    await Future.delayed(Duration(seconds: delay));
    delay = delay * 2 > 60 ? 60 : delay * 2;
  }
}

Future<void> main() async {
  final run = await runWithRetry({'prompt': 'A futuristic city at sunset'});
  print('Task ID: ${run['taskid']}');
}
```
