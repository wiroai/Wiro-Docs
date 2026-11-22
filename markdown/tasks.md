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
| `task_output` | The model is producing output. This event is emitted **multiple times**: each time the model writes to stdout, a new `task_output` message is sent via WebSocket. For LLM models, each `task_output` event carries the latest cumulative snapshot of the output, so render the newest one instead of appending. |
| `task_error` | As a live WebSocket event, this means the model wrote to stderr and is an **interim log**, not necessarily a failure. As the persisted `status` returned by Task/Detail, it marks a pre-execution failure awaiting recovery or requeue; it does not close the task. |
| `task_output_full` | Signals that process stdout collection ended. Raw accumulated stdout is not exposed on the public socket. |
| `task_error_full` | Signals that process stderr collection ended. Raw accumulated stderr is not exposed on the public socket. |
| `task_end` | The model process has exited. Emitted once. This fires **before** post-processing, so do not use this event to determine success. Wait for `task_postprocess_end` instead. |
| `task_postprocess_start` | Post-processing has started. The system is preparing the output files: encoding, uploading to CDN, and generating access URLs. |
| `task_postprocess_end` | Post-processing completed. On the public WebSocket, check `success` and `exitCode` (`0` = success); the `message` array contains sanitized outputs. Task/Detail continues to use `pexit` as its primary success indicator. **This is the event you should listen for** to get final results. |
| `task_cancel` | The task was cancelled (if queued) or killed (if running) by the user. |

### Realtime Sessions

The following statuses are exclusive to realtime models (voice conversation, text-to-speech, and speech-to-text). They are not emitted for standard model runs.

| Status | Description |
|--------|-------------|
| `task_stream_ready` | Realtime model is ready to receive audio/text input, so you can start sending data |
| `task_stream_end` | Realtime session has ended: the model finished speaking or the session was closed |
| `task_cost` | Real-time cost update emitted during execution: shows the running cost of the task |
| `task_session_stopped` | The server is ending the session after the turn that reached a [spend limit](/docs/spend-limits) (`reason` `spend_limit`, `code` `93`) or used up the balance (`reason` `balance`, `code` `97`). It is not a failure: the usual closing events follow (see [Realtime Voice](/docs/realtime-voice-conversation#realtime-end-session)) |

## Determining Success or Failure

Normal model executions, both successful and failed, reach
`task_postprocess_end`. The status alone does not tell you whether execution
succeeded; check `pexit` or `outputs` (or both). A setup failure may temporarily
set persisted `status: "task_error"` with a `debugerror`, but clients must keep
waiting until `task_postprocess_end` or `task_cancel`:

- `pexit`: the process exit code. `"0"` means success, any other value means the model encountered an error. This is the most reliable indicator.
- `outputs`: the output files array. For non-LLM models, a successful run populates this with CDN URLs. If it's empty or missing, the task likely failed.

> **Note:** For **LLM models**, `outputs` contains a structured entry with
> `contenttype: "raw"` and ordered `content.segments`. The merged plain text is
> also available in `debugoutput`. Always use `pexit` as the primary success
> check.

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
      "segments": [
        {
          "type": "answer",
          "text": "Hello! How can I help you today?"
        }
      ],
      "finishreason": "stop",
      "usage": {
        "input_tokens": 12,
        "input_tokens_details": {
          "cached_tokens": 4,
          "cache_write_tokens": 2
        },
        "output_tokens": 9,
        "output_tokens_details": {
          "reasoning_tokens": 2
        },
        "total_tokens": 21
      }
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

> **Important:** Do not confuse the live `task_error` WebSocket log event with
> persisted `status: "task_error"` in Task/Detail. Both are non-terminal; only
> `task_postprocess_end` and `task_cancel` close the task.

## Billing & Cost

The `totalcost` field in the Task Detail response shows the actual cost charged for the run. **Only successful tasks are billed**. If `pexit` is non-zero (failure), the task is not charged and `totalcost` will be `"0"`.

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

<a id="task-surfaces"></a>

## Surfaces

Every task records its surface: the way its work came in, such as an API key, MCP or Studio. Task/Detail and Task/List return it as `surface`, and Task/List can list the tasks of one surface. [Spend limits](/docs/spend-limits) and [Model Access](/docs/model-access) rules use the same surfaces and decide them the same way, so a task's `surface` is the one its run counted on.

| `surface` | Label | Covers |
|-----------|-------|--------|
| `web` | Dashboard | The Wiro dashboard, and calls with a signed-in user's Bearer token |
| `api` | API | Calls with an API key, including [`/sync`](/docs/run-a-model#run-sync) and, for now, the [Wiro MCP package](/docs/mcp-self-hosted) when you run it yourself |
| `mcp` | MCP | The hosted [Wiro MCP server](/docs/wiro-mcp-server) at `mcp.wiro.ai`, and the Wiro MCP package when it names itself (see below) |
| `llm-gateway` | LLM Gateway | The OpenAI and Anthropic compatible [LLM gateway](/docs/completions-api) at `llm.wiro.ai` |
| `extension` | Browser Extension | The Wiro browser extensions |
| `agent` | Agent | Your deployed agents' own runs |
| `studio` | Studio | [Studio](/docs/studio): the messages you send it and the models it runs for you |
| `workflow-agent` | Workflow Agent | The [Workflow Agent](/docs/workflow-agent): the messages you send it |
| `workflow` | Workflow | [Workflow](/docs/workflows) runs and resumes, and every step they run |

The label is the surface's name in the dashboard.

### Which Surface Work Gets

Some work fits more than one surface, such as a workflow run started with an API key. The first match in this order decides:

1. **Who does the work**: Studio, the Workflow Agent or one of your deployed agents. Messages to Studio and the Workflow Agent, the other calls to their `/Studio` and `/StudioWorkflow` endpoints and the models Studio runs for you count as `studio` and `workflow-agent`, and a deployed agent's own calls as `agent`.
2. **What it is**: a workflow run, its resumes and every step they run count as `workflow`. A run or resume that one of your deployed agents sends counts as `agent` instead. Each resume counts on the surface of the call that resumes it: if an agent started a run and you resume it with an API key, the remaining steps count as `workflow`.
3. **Which client sends it**: the LLM gateway (`llm-gateway`), a Wiro browser extension (`extension`) or MCP (`mcp`).
4. **Which credential it uses**: an API key (`api`), else a signed-in session (`web`).

So a model run started with an API key counts as `api`, a message to Studio sent with the same key as `studio`, and a workflow run started through MCP as `workflow`.

### Clients That Name Themselves

The Wiro MCP package (`@wiro-ai/wiro-mcp`) counts as `mcp` when it names itself with the header `x-wiro-client: wiro-mcp/<version>`. The package does not send this header yet, so the runs of a package you run yourself count as `api` for now. A client's name for itself is its own word: anyone who holds the API key can leave the header out. A spend limit or Model Access rule that must hold whoever uses a key belongs on the key itself, with scope `project`.

### Older Tasks

Tasks from before surfaces were recorded have one only where it is certain: workflow steps, the runs of deployed agents, and runs from MCP, the LLM gateway and the browser extensions. Runs with an API key and dashboard runs have one from late October 2026 on. Such a task has the surface it would count on today, so an older workflow step has `workflow`, or `agent` when one of your deployed agents started its run, though at the time a workflow run counted on the surface it was started from. The model runs Studio made before they became your own tasks are not in your task list: [Studio/Tasks](/docs/studio#post-studiotasks) lists them. Other tasks have `surface: null`: the dashboard shows no label for them, and a `surface` filter never lists them.

## LLM Models

For LLM requests, `outputs` contains a structured entry with
`contenttype: "raw"` and ordered `content.segments`; `debugoutput` contains the
merged plain text. Use the representation that matches your UI.

For real-time streaming, use [WebSocket](/docs/websocket). Each LLM
`task_output` event contains the latest cumulative `message.segments` snapshot;
replace your previous snapshot instead of appending it.

### Structured LLM content fields

Task Detail returns these fields under
`tasklist[0].outputs[].content`. The final WebSocket
`task_postprocess_end` event returns the same content under
`message[].content`.

| Field | When you need it | Description |
|-------|------------------|-------------|
| `raw` | Optional | Merged public model text. `debugoutput` provides the same compatibility view at task level. |
| `thinking` / `answer` | Optional | Convenience arrays split from text output. Use `segments` when exact ordering or tools matter. |
| `segments` | All structured/tool integrations | Authoritative cumulative ordered timeline. Text entries are `thinking` or `answer`; tool entries are `function_call` or `custom_tool_call`. |
| `finishreason` | Completion and tool handling | `stop`, `tool_calls`, `length`, `content_filter`, or `error`. Execute completed tool entries only when this is `tool_calls`. |
| `usage` | Token reporting | Normalized token and server-tool counters. It may be omitted when the provider does not report usage. It is not the billed amount. |

Within `usage`, `input_tokens` already includes cache-read and cache-write
tokens, `output_tokens` already includes reasoning tokens, and `total_tokens`
equals `input_tokens + output_tokens`. Never add detail counters to the total.
Known optional counters are:

- `input_tokens_details`: `cached_tokens`, `cache_write_tokens`,
  `cache_write_5m_tokens`, `cache_write_1h_tokens`, `text_tokens`,
  `audio_tokens`, `image_tokens`, and `video_tokens`.
- `output_tokens_details`: `reasoning_tokens`, `text_tokens`, `audio_tokens`,
  `image_tokens`, `video_tokens`, `accepted_prediction_tokens`, and
  `rejected_prediction_tokens`.
- `server_tool_use`: `web_search_requests`, `web_fetch_requests`,
  `file_search_requests`, `image_generation_requests`,
  `code_execution_requests`, `bash_code_execution_requests`,
  `text_editor_code_execution_requests`, and `computer_use_requests`.

The five-minute and one-hour cache-write counters are subsets of
`cache_write_tokens`. Server-tool values count requests, not tokens. Providers
omit counters they do not support. There is no cached-output counter because
prompt caching applies to input context. Use task-level `totalcost` for the
amount charged.

Plain-text integrations can use `debugoutput`. Tool integrations must inspect
`segments`, `finishreason`, and `pexit`. A final structured validation failure
produces a non-zero `pexit`.

<a id="task-detail"></a>

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
    "surface": "api",
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
| `debugoutput` | `string` | Accumulated text output. For LLM models, contains the merged response text. |
| `debugerror` | `string` | Accumulated error text or a fatal pre-execution error message. |
| `starttime` | `string` | Unix timestamp when execution started. |
| `endtime` | `string` | Unix timestamp when execution ended. |
| `elapsedseconds` | `string` | Total execution time in seconds. |
| `totalcost` | `string` | Actual cost charged for the run in USD. |
| `modeldescription` | `string` | Description of the model that was executed. |
| `modelslugowner` | `string` | Model owner slug (e.g. `"google"`, `"wiro"`). |
| `modelslugproject` | `string` | Model project slug (e.g. `"nano-banana-pro"`). |
| `surface` | `string \| null` | The way the task came in, such as `"api"` (see [Surfaces](#task-surfaces)). `null` for an older task whose surface is not known for certain. |
| `outputs` | `array` | Output files (CDN URLs) or structured LLM content (`contenttype: "raw"`). |

## **POST** /Task/List

Lists the tasks of the call's workspace, newest first. A team project's API key lists the team's tasks, a personal project's key your personal tasks, and a signed-in call the tasks of the team named in `x-team-guid`, or your personal tasks without it. Every field is optional: send `{}` for the 20 most recent tasks.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `surface` | string | No | Only the tasks of one [surface](#task-surfaces): `web`, `api`, `mcp`, `llm-gateway`, `extension`, `agent`, `studio`, `workflow-agent` or `workflow`. Empty or left out: every surface |
| `type` | string | No | `"model"` for model runs, `"train"` for training runs, or `"running"` for the tasks that have not ended and were not cancelled, queued ones included. Left out: every task |
| `projectid` | string | No | Only the tasks of this project, by its `id` from `/Project/List` |
| `modelid` | string | No | Only the runs of this model, by its `id` from [`/Tool/List`](/docs/models) |
| `modelName` | string | No | Only the runs of the models whose owner or slug contains this text, ignoring case. When no model matches, the list is empty and `errors` holds `There is no task yet.` with code `1` |
| `start` | number | No | How many tasks to skip, for the next page. Default: `0` |
| `limit` | number | No | How many tasks to return. Default: `20`, maximum `1000` |

Without `surface`, the list leaves out the tasks that workflow runs start for their steps. With `surface`, it lists every task of that surface, workflow steps included, so `"surface": "workflow"` lists the steps of your workflow runs.

### Example

**The workspace's 10 most recent Studio tasks:**

```json
{
  "surface": "studio",
  "limit": 10
}
```

### Response

```json
{
  "result": true,
  "errors": [],
  "total": "1",
  "tasklist": [{
    "id": "534602",
    "socketaccesstoken": "Tq4wZ8nLx2RmKc7VbYp3HdJ9sFgNa1",
    "parameters": { "prompt": "Square banner for a bakery weekend sale, warm colors" },
    "status": "task_postprocess_end",
    "pexit": "0",
    "debugoutput": "",
    "starttime": "1734514421",
    "endtime": "1734514452",
    "elapsedseconds": "31.0000",
    "totalcost": "0.140000000000",
    "modelslugowner": "google",
    "modelslugproject": "nano-banana-pro",
    "surface": "studio",
    "outputs": [{
      "name": "0.png",
      "contenttype": "image/png",
      "size": "1843212",
      "url": "https://cdn1.wiro.ai/.../0.png"
    }]
  }]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `total` | `string` | How many tasks match, counting every page. |
| `tasklist` | `array` | The tasks of this page, newest first, each with the fields of [Task/Detail](#task-detail), `surface` included. |

### Errors

| Error | When |
|-------|------|
| `surface must be one of web, api, mcp, llm-gateway, extension, agent, studio, workflow-agent, workflow.` | `surface` is not one of the nine surfaces |

## **POST** /Task/Cancel

Cancels a task that is still in the `queue` stage. Use Kill for a running task.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `taskid` | string | Yes | The numeric task ID returned by the Run endpoint |

## **POST** /Task/Kill

Terminates a task that is currently running (any status after `assign`). The worker will stop processing and the task will move to `cancel` status.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `taskid` | string | No | The numeric task ID |
| `socketaccesstoken` | string | No | The task token returned by the Run endpoint (alternative to `taskid`) |

Provide either `taskid` or `socketaccesstoken`.

## **POST** /Task/InputOutputDelete

Deletes the task's input and output files. Their URLs stop working right away.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tasktoken` | string | Yes | The task token (socketaccesstoken) |

The task must be in a terminal state (`task_postprocess_end` or `task_cancel`). Only the task owner can delete files. Shared sample input files are kept.

### Response

```json
{
  "result": true,
  "errors": []
}
```

After deletion:
- Output files and the input files you uploaded are deleted, and their URLs stop working
- Task Detail then returns no outputs
- Task record and parameters are preserved. Only the files are deleted
- Calling the endpoint again on the same task returns `result: true` immediately (idempotent)

### Errors

| Error | When |
|-------|------|
| `There is no task yet.` | Invalid tasktoken or unauthorized |
| `Task must be completed or cancelled before deleting files` | Task is still running |

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

### curl (List)

```bash
# List the workspace's 10 most recent Studio tasks
curl -X POST "https://api.wiro.ai/v1/Task/List" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{"surface": "studio", "limit": 10}'
```

### curl (Cancel/Kill/InputOutputDelete)

```bash
# Cancel a queued task
curl -X POST "https://api.wiro.ai/v1/Task/Cancel" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{"taskid": "534574"}'

# Kill a running task
curl -X POST "https://api.wiro.ai/v1/Task/Kill" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{"socketaccesstoken": "abc123-def456-ghi789"}'

# Delete task input and output files
curl -X POST "https://api.wiro.ai/v1/Task/InputOutputDelete" \
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
task_id = "534574"

# Poll task detail until completion
while True:
    resp = requests.post(
        "https://api.wiro.ai/v1/Task/Detail",
        headers=headers,
        json={"tasktoken": task_token}
    )
    task = resp.json()["tasklist"][0]
    print(f"Status: {task['status']}")

    if task["status"] == "task_postprocess_end":
        if task["pexit"] == "0":
            print("Outputs:", task["outputs"])
        else:
            print("Failed: pexit", task["pexit"])
        break
    elif task["status"] == "task_cancel":
        print("Task cancelled")
        break

    time.sleep(3)

# Cancel a queued task
requests.post(
    "https://api.wiro.ai/v1/Task/Cancel",
    headers=headers,
    json={"taskid": task_id}
)

# Kill a running task
requests.post(
    "https://api.wiro.ai/v1/Task/Kill",
    headers=headers,
    json={"socketaccesstoken": task_token}
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
const taskId = '534574';

// Poll task detail until completion
async function pollTask() {
  while (true) {
    const resp = await axios.post(
      'https://api.wiro.ai/v1/Task/Detail',
      { tasktoken: taskToken },
      { headers }
    );
    const task = resp.data.tasklist[0];
    console.log('Status:', task.status);

    if (task.status === 'task_postprocess_end') {
      if (task.pexit === '0') {
        console.log('Outputs:', task.outputs);
      } else {
        console.log('Failed: pexit', task.pexit);
      }
      break;
    }
    if (task.status === 'task_cancel') {
      console.log('Task cancelled');
      break;
    }

    await new Promise(r => setTimeout(r, 3000));
  }
}

// Cancel / Kill
await axios.post('https://api.wiro.ai/v1/Task/Cancel',
  { taskid: taskId }, { headers });

await axios.post('https://api.wiro.ai/v1/Task/Kill',
  { socketaccesstoken: taskToken }, { headers });
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
    "surface": "api",
    "outputs": [{
      "name": "0.png",
      "contenttype": "image/png",
      "size": "202472",
      "url": "https://cdn1.wiro.ai/.../0.png"
    }]
  }]
}
```
