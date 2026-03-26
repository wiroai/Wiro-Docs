# Tasks

Track, monitor, and control your AI model runs.

## Task Lifecycle

Every model run creates a task that progresses through a defined set of stages:

`task_queue` → `task_accept` → `task_preprocess_start` → `task_preprocess_end` → `task_assign` → `task_start` → `task_output` → `task_output_full` → `task_end` → `task_postprocess_start` → `task_postprocess_end`

## Task Statuses

| Status | Description |
|--------|-------------|
| `task_queue` | The task is queued and waiting to be picked up by an available worker. Emitted once when the task enters the queue. |
| `task_accept` | A worker has accepted the task. The task is no longer in the general queue and is being prepared for execution. |
| `task_preprocess_start` | Optional preprocessing has started. This includes operations like downloading input files from URLs, converting file types, and validating/formatting parameters before the model runs. Not all models require preprocessing. |
| `task_preprocess_end` | Preprocessing completed. All inputs are ready for GPU assignment. |
| `task_assign` | The task has been assigned to a specific GPU. The model is being loaded into memory. This may take a few seconds depending on the model size. |
| `task_start` | The model command has started executing. Inference is now running on the GPU. |
| `task_output` | The model is producing output. This event is emitted **multiple times** — each time the model writes to stdout, a new `task_output` message is sent via WebSocket. For LLM models, each token/chunk arrives as a separate `task_output` event, enabling real-time streaming. |
| `task_error` | The model wrote to stderr. This is an **interim log event**, not a final failure — many models write warnings or debug info to stderr during normal operation. The task may still complete successfully. Always wait for `task_postprocess_end` to determine the actual result. |
| `task_output_full` | The complete accumulated stdout log, sent once after the model process finishes. Contains the full output history in a single message. |
| `task_error_full` | The complete accumulated stderr log, sent once after the model process finishes. |
| `task_end` | The model process has exited. Emitted once. This fires **before** post-processing — do not use this event to determine success. Wait for `task_postprocess_end` instead. |
| `task_postprocess_start` | Post-processing has started. The system is preparing the output files — encoding, uploading to CDN, and generating access URLs. |
| `task_postprocess_end` | Post-processing completed. Check `pexit` to determine success: `"0"` = success, any other value = error. The `outputs` array contains the final files with CDN URLs, content types, and sizes. **This is the event you should listen for** to get the final results. |
| `task_cancel` | The task was cancelled (if queued) or killed (if running) by the user. |

### Realtime Conversation Only

The following statuses are exclusive to realtime conversation models (e.g. voice AI). They are not emitted for standard model runs.

| Status | Description |
|--------|-------------|
| `task_stream_ready` | Realtime model is ready to receive audio/text input — you can start sending data |
| `task_stream_end` | Realtime session has ended — the model finished speaking or the session was closed |
| `task_cost` | Real-time cost update emitted during execution — shows the running cost of the task |

## Determining Success or Failure

Both successful and failed tasks reach `task_postprocess_end`. The status alone does not tell you whether the task succeeded. Wait for `task_postprocess_end` and then check `pexit` or `outputs` (or both) to determine the actual result:

- `pexit` — the process exit code. `"0"` means success, any other value means the model encountered an error. This is the most reliable indicator.
- `outputs` — the output files array. For non-LLM models, a successful run populates this with CDN URLs. If it's empty or missing, the task likely failed.

> **Note:** For **LLM models**, `outputs` contains a structured entry with `contenttype: "raw"` and the response broken into `prompt`, `raw`, `thinking`, and `answer` fields. The merged plain text is also available in `debugoutput`. Always use `pexit` as the primary success check.

```json
// Success (image/audio model): pexit "0", outputs present
{
  "pexit": "0",
  "outputs": [{
    "name": "0.png",
    "contenttype": "image/png",
    "size": "202472",
    "url": "https://cdn1.wiro.ai/.../0.png"
  }]
}

// Success (LLM model): pexit "0", structured response in outputs + merged text in debugoutput
{
  "pexit": "0",
  "outputs": [{
    "contenttype": "raw",
    "content": {
      "prompt": "Hello!",
      "raw": "Hello! How can I help you today?",
      "thinking": [],
      "answer": ["Hello! How can I help you today?"]
    }
  }],
  "debugoutput": "Hello! How can I help you today?"
}

// Failure: pexit non-zero
{
  "pexit": "1",
  "outputs": []
}
```

> **Important:** `task_error` events during execution are interim log messages, not final failures. A task can emit error logs and still complete successfully. Always wait for `task_postprocess_end` and check `pexit`.

## Billing & Cost

The `totalcost` field in the Task Detail response shows the actual cost charged for the run. **Only successful tasks are billed** — if `pexit` is non-zero (failure), the task is not charged and `totalcost` will be `"0"`.

```json
// Successful run — billed
{
  "status": "task_postprocess_end",
  "pexit": "0",
  "totalcost": "0.003510000000",
  "elapsedseconds": "6.0000"
}

// Failed run — not billed
{
  "status": "task_postprocess_end",
  "pexit": "1",
  "totalcost": "0",
  "elapsedseconds": "4.0000"
}
```

Use the `totalcost` field to track spending per task. For more details on how costs are calculated, see [Pricing](/docs/pricing).

## LLM Models

For LLM (Large Language Model) requests, the model's response is available in two places: `outputs` contains a structured entry with `contenttype: "raw"` and the response broken into `prompt`, `raw`, `thinking`, and `answer` fields; `debugoutput` contains the merged plain text. When polling with Task Detail, use either field depending on whether you need structured or plain-text access.

For real-time streaming of LLM responses, use [WebSocket](/docs/websocket) instead of polling. Each `task_output` event delivers a chunk of the response as it's generated, giving your users an instant, token-by-token experience.

## **POST** /Task/Detail

Retrieves the current status and output of a task. You can query by either `tasktoken` or `taskid`.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tasktoken` | string | No | The task token returned from the Run endpoint |
| `taskid` | string | No | The task ID (alternative to tasktoken) |

### Response

```json
{
  "result": true,
  "errors": [],
  "total": "1",
  "tasklist": [{
    "id": "534574",
    "socketaccesstoken": "eDcCm5yyUfIvMFspTwww49OUfgXkQt",
    "parameters": { "prompt": "Hello, world!" },
    "status": "task_postprocess_end",
    "pexit": "0",
    "debugoutput": "",
    "starttime": "1734513809",
    "endtime": "1734513813",
    "elapsedseconds": "6.0000",
    "totalcost": "0.003510000000",
    "modeldescription": "FLUX.2 [dev] is a 32 billion parameter rectified flow transformer...",
    "modelslugowner": "wiro",
    "modelslugproject": "flux-2-dev",
    "outputs": [{
      "name": "0.png",
      "contenttype": "image/png",
      "size": "202472",
      "url": "https://cdn1.wiro.ai/.../0.png"
    }]
  }]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Task ID. |
| `socketaccesstoken` | `string` | Token to connect via WebSocket. |
| `parameters` | `object` | The input parameters sent in the run request. |
| `status` | `string` | Current task status (see Task Lifecycle). |
| `pexit` | `string` | Process exit code. `"0"` = success. |
| `debugoutput` | `string` | Accumulated stdout. For LLM models, contains the merged response text. |
| `starttime` | `string` | Unix timestamp when execution started. |
| `endtime` | `string` | Unix timestamp when execution ended. |
| `elapsedseconds` | `string` | Total execution time in seconds. |
| `totalcost` | `string` | Actual cost charged for the run in USD. |
| `modeldescription` | `string` | Description of the model that was executed. |
| `modelslugowner` | `string` | Model owner slug (e.g. `"google"`, `"wiro"`). |
| `modelslugproject` | `string` | Model project slug (e.g. `"nano-banana-pro"`). |
| `outputs` | `array` | Output files (CDN URLs) or structured LLM content (`contenttype: "raw"`). |

## **POST** /Task/Cancel

Cancels a task that is still in the `queue` stage. Tasks that have already been assigned to a worker cannot be cancelled — use Kill instead.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tasktoken` | string | Yes | The task token to cancel |

## **POST** /Task/Kill

Terminates a task that is currently running (any status after `assign`). The worker will stop processing and the task will move to `cancel` status.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tasktoken` | string | Yes | The task token to kill |

## Code Examples

### curl (Detail)

```bash
# Get task details by task token
curl -X POST "https://api.wiro.ai/v1/Task/Detail" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{"tasktoken": "abc123-def456-ghi789"}'

# Or by task ID
curl -X POST "https://api.wiro.ai/v1/Task/Detail" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{"taskid": "task-id-here"}'
```

### curl (Cancel/Kill)

```bash
# Cancel a queued task
curl -X POST "https://api.wiro.ai/v1/Task/Cancel" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{"tasktoken": "abc123-def456-ghi789"}'

# Kill a running task
curl -X POST "https://api.wiro.ai/v1/Task/Kill" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{"tasktoken": "abc123-def456-ghi789"}'
```

### Python

```python
import requests, time

headers = {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
}

task_token = "abc123-def456-ghi789"

# Poll task detail until completion
while True:
    resp = requests.post(
        "https://api.wiro.ai/v1/Task/Detail",
        headers=headers,
        json={"tasktoken": task_token}
    )
    task = resp.json()["data"]
    status = task["status"]
    print(f"Status: {status}")

    if status == "end":
        print("Output:", task["output"])
        break
    elif status in ("error", "cancel"):
        print("Task failed or cancelled")
        break

    time.sleep(3)

# Cancel a queued task
requests.post(
    "https://api.wiro.ai/v1/Task/Cancel",
    headers=headers,
    json={"tasktoken": task_token}
)

# Kill a running task
requests.post(
    "https://api.wiro.ai/v1/Task/Kill",
    headers=headers,
    json={"tasktoken": task_token}
)
```

### Node.js

```javascript
const axios = require('axios');

const headers = {
  'x-api-key': 'YOUR_API_KEY',
  'Content-Type': 'application/json'
};

const taskToken = 'abc123-def456-ghi789';

// Poll task detail until completion
async function pollTask() {
  while (true) {
    const resp = await axios.post(
      'https://api.wiro.ai/v1/Task/Detail',
      { tasktoken: taskToken },
      { headers }
    );
    const { status, output } = resp.data.data;
    console.log('Status:', status);

    if (status === 'end') {
      console.log('Output:', output);
      break;
    }
    if (status === 'error' || status === 'cancel') {
      console.log('Task failed or cancelled');
      break;
    }

    await new Promise(r => setTimeout(r, 3000));
  }
}

// Cancel / Kill
await axios.post('https://api.wiro.ai/v1/Task/Cancel',
  { tasktoken: taskToken }, { headers });

await axios.post('https://api.wiro.ai/v1/Task/Kill',
  { tasktoken: taskToken }, { headers });
```

### PHP

```php
<?php
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, "https://api.wiro.ai/v1/Task/Detail");
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Content-Type: application/json",
    "x-api-key: YOUR_API_KEY"
]);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
    "tasktoken" => "abc123-def456-ghi789"
]));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$response = curl_exec($ch);
curl_close($ch);
echo $response;
```

### C#

```csharp
using var client = new HttpClient();
client.DefaultRequestHeaders.Add("x-api-key", "YOUR_API_KEY");

var content = new StringContent(
    JsonSerializer.Serialize(new {
        tasktoken = "abc123-def456-ghi789"
    }),
    Encoding.UTF8, "application/json");

var response = await client.PostAsync(
    "https://api.wiro.ai/v1/Task/Detail", content);
var result = await response.Content.ReadAsStringAsync();
Console.WriteLine(result);
```

### Go

```go
package main

import (
    "bytes"
    "encoding/json"
    "fmt"
    "net/http"
    "io"
)

func main() {
    body, _ := json.Marshal(map[string]string{
        "tasktoken": "abc123-def456-ghi789",
    })
    req, _ := http.NewRequest("POST",
        "https://api.wiro.ai/v1/Task/Detail",
        bytes.NewBuffer(body))
    req.Header.Set("Content-Type", "application/json")
    req.Header.Set("x-api-key", "YOUR_API_KEY")

    resp, _ := http.DefaultClient.Do(req)
    defer resp.Body.Close()
    data, _ := io.ReadAll(resp.Body)
    fmt.Println(string(data))
}
```

### Swift

```swift
import Foundation

let url = URL(string: "https://api.wiro.ai/v1/Task/Detail")!
var request = URLRequest(url: url)
request.httpMethod = "POST"
request.setValue("application/json",
    forHTTPHeaderField: "Content-Type")
request.setValue("YOUR_API_KEY",
    forHTTPHeaderField: "x-api-key")
request.httpBody = try! JSONSerialization.data(
    withJSONObject: [
        "tasktoken": "abc123-def456-ghi789"
    ])

let (data, _) = try await URLSession.shared
    .data(for: request)
print(String(data: data, encoding: .utf8)!)
```

### Kotlin

```kotlin
import java.net.HttpURLConnection
import java.net.URL

val url = URL("https://api.wiro.ai/v1/Task/Detail")
val conn = url.openConnection() as HttpURLConnection
conn.requestMethod = "POST"
conn.setRequestProperty("Content-Type", "application/json")
conn.setRequestProperty("x-api-key", "YOUR_API_KEY")
conn.doOutput = true
conn.outputStream.write("""{"tasktoken": "abc123-def456-ghi789"}""".toByteArray())

val response = conn.inputStream.bufferedReader().readText()
println(response)
```

### Dart

```dart
import 'dart:convert';
import 'package:http/http.dart' as http;

final response = await http.post(
  Uri.parse('https://api.wiro.ai/v1/Task/Detail'),
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'YOUR_API_KEY',
  },
  body: jsonEncode({
    'tasktoken': 'abc123-def456-ghi789',
  }),
);
print(response.body);
```

### Response

```json
{
  "result": true,
  "errors": [],
  "total": "1",
  "tasklist": [{
    "id": "534574",
    "socketaccesstoken": "eDcCm5yyUfIvMFspTwww49OUfgXkQt",
    "parameters": { "prompt": "Hello, world!" },
    "status": "task_postprocess_end",
    "pexit": "0",
    "debugoutput": "",
    "starttime": "1734513809",
    "endtime": "1734513813",
    "elapsedseconds": "6.0000",
    "totalcost": "0.003510000000",
    "modeldescription": "FLUX.2 [dev] is a 32 billion parameter rectified flow transformer...",
    "modelslugowner": "wiro",
    "modelslugproject": "flux-2-dev",
    "outputs": [{
      "name": "0.png",
      "contenttype": "image/png",
      "size": "202472",
      "url": "https://cdn1.wiro.ai/.../0.png"
    }]
  }]
}
```
