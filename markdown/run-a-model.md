# Run a Model

Execute any AI model with a single API call and get real-time updates.

## **POST** /Run/{owner-slug}/{model-slug}

Starts an AI model run. The endpoint accepts model-specific parameters and returns a **task ID** you can use to track progress via [polling](/docs/tasks), [WebSocket](/docs/websocket), or **webhook** by providing a `callbackUrl` parameter — Wiro will POST the result to your URL when the task completes.

If you want one HTTP request to wait for the finished task, use
[POST /Run/{owner}/{model}/sync](#run-sync) on this same API host. For OpenAI or Anthropic LLM protocols, see the
[Direct LLM Gateway](/docs/completions-api).

## Content Types

### JSON (application/json)

Use JSON for text-based inputs — prompts, configuration, numeric parameters. This is the default and most common format.

### Multipart (multipart/form-data)

Use multipart when the model requires **file inputs** (images, audio, documents). Include files as form fields and other parameters as text fields.

## Request Parameters

Parameters vary by model. Use the [/Tool/Detail](/docs/models) endpoint to discover which parameters a model accepts. The following optional parameters apply to all runs:

#### Common Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `callbackUrl` | string | No | URL to receive a POST webhook when the task completes |
| `projectid` | string | No | Override the default project for billing (if you have multiple projects) |

## Response

A successful run returns a task ID and a WebSocket access token:

```json
{
  "result": true,
  "errors": [],
  "taskid": "2221",
  "socketaccesstoken": "eDcCm5yyUfIvMFspTwww49OUfgXkQt"
}
```

## Direct LLM turns and tool calls

Models whose Tool Detail response includes the `llm-tool-call` category accept
six optional ordinary model parameters on both asynchronous Run and `/sync`:
`messages`, `tools`, `tool_choice`, `parallel_tool_calls`,
`previousTaskToken`, and `toolOutputs`. Tool Detail marks them `advanced: true`
only to place them in the Advanced section of catalog-driven UIs; they use the
same `parameters` object and Run transport as every other model parameter.
Send JSON values directly, and use exactly one of `prompt` or non-empty
`messages` on a first turn.

```json
{
  "messages": [{
    "role": "user",
    "content": "What is the weather in Paris?"
  }],
  "tools": [{
    "type": "function",
    "function": {
      "name": "get_weather",
      "description": "Return current weather for a city",
      "parameters": {
        "type": "object",
        "properties": { "city": { "type": "string" } },
        "required": ["city"],
        "additionalProperties": false
      },
      "strict": true
    }
  }],
  "tool_choice": "auto",
  "parallel_tool_calls": true,
  "session_id": "weather-session-1"
}
```

```js
// Node.js
const response = await fetch(
  "https://api.wiro.ai/v1/Run/claude/fable-5/sync",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.WIRO_API_KEY
    },
    body: JSON.stringify({
      messages: [{
        role: "user",
        content: "What is the weather in Paris?"
      }],
      tools: [{
        type: "function",
        function: {
          name: "get_weather",
          parameters: {
            type: "object",
            properties: { city: { type: "string" } },
            required: ["city"]
          }
        }
      }],
      tool_choice: "auto",
      parallel_tool_calls: true,
      session_id: "weather-session-1",
    })
  }
);
```

Wiro never executes caller-defined tools. A tool request is returned in
`outputs[].content.segments` as its own ordered timeline item. Function calls
use `arguments`, custom grammar/free-form calls use `input`, and both include
stable `id`, `call_id`, `name`, and `status` fields. Execute a call only when
its status is `completed` and the turn's `finishreason` is `tool_calls`;
`incomplete` calls may contain truncated input and must never be executed.

The same structured LLM fields appear in three response locations:

- WebSocket `task_output`: `message.segments` is the live cumulative snapshot;
  final-only metadata may be absent while generation is still running.
- WebSocket `task_postprocess_end`: `message[].content` contains the persisted
  final output.
- Task Detail and non-streaming `/sync`:
  `tasklist[0].outputs[].content` contains the persisted final output.

Inside that content:

- `segments` is the authoritative ordered text/tool-call timeline.
- `finishreason` explains why generation stopped: `stop`, `tool_calls`,
  `length`, `content_filter`, or `error`. Handle `length`, `content_filter`,
  and `error` as non-normal model completion.
- `usage` contains normalized token and server-tool counters. `input_tokens`
  includes cache reads and cache writes; `output_tokens` includes reasoning;
  and `total_tokens` is exactly `input_tokens + output_tokens`. Therefore, do
  not add detail counters to the total. Optional `input_tokens_details` can
  include `cached_tokens`, `cache_write_tokens`, five-minute and one-hour cache
  write subsets, and text/audio/image/video counters. Optional
  `output_tokens_details` can include reasoning, text/audio/image/video, and
  accepted/rejected prediction counters. Optional `server_tool_use` contains
  request counts rather than tokens. Providers omit unsupported counters.
  There is no cached-output counter because prompt caching applies to input
  context, not previously generated output.
  `usage` is informational and is used by protocol-compatible LLM responses;
  use the task-level `totalcost` for the actual billed amount.

For a final `llm-tool-call` result, rely on `pexit: "0"` and require
`finishreason`. Structured-output validation failures set a non-zero `pexit`.

```json
{
  "segments": [{
    "type": "function_call",
    "id": "fc_01",
    "call_id": "call_01",
    "name": "get_weather",
    "arguments": "{\"city\":\"Paris\"}",
    "status": "completed"
  }],
  "finishreason": "tool_calls",
  "usage": {
    "input_tokens": 84,
    "input_tokens_details": {
      "cached_tokens": 24,
      "cache_write_tokens": 8,
      "cache_write_5m_tokens": 8,
      "text_tokens": 84
    },
    "output_tokens": 21,
    "output_tokens_details": {
      "reasoning_tokens": 9,
      "text_tokens": 21
    },
    "total_tokens": 105,
    "server_tool_use": {
      "web_search_requests": 1
    }
  }
}
```

For tool-output continuation, execute the tool in your application and send
another Run request with the first request's returned `socketaccesstoken` as
`previousTaskToken`, the same `session_id`, and one matching entry in
`toolOutputs` for every executed call. Do not send `prompt`, `messages`,
`tools`, `tool_choice`, `parallel_tool_calls`, or `response_format` on this
continuation.

```json
{
  "previousTaskToken": "task-token",
  "toolOutputs": [{
    "call_id": "call_01",
    "output": {
      "temperature_c": 12,
      "condition": "rain"
    }
  }],
  "session_id": "weather-session-1"
}
```

### Stateful turn continuation

For a stateful follow-up that is not submitting tool outputs, pass the prior
completed Run output's `socketaccesstoken` as `previousTaskToken`, keep the same
`session_id`, and provide exactly one new input: a non-blank `prompt` or a
non-empty `messages` array. Normal `tools` and `tool_choice` fields remain
available for the new turn. Do not send `toolOutputs`.

Use the `socketaccesstoken` returned by a completed task from the same project,
model, and session.

```json
{
  "previousTaskToken": "task-token",
  "prompt": "Give me one concrete example.",
  "session_id": "weather-session-1"
}
```

For OpenAI-compatible clients, `previous_response_id` remains the preferred
public field on `/v1/responses`; do not send `previousTaskToken` to that
endpoint. Direct asynchronous Run and `/sync` clients use `previousTaskToken`.

For cumulative SSE or WebSocket snapshots, replace the previous `segments`
array. Do not append the complete array again. A call can move from
`in_progress` to `completed` while keeping the same IDs. The final
`pexit: "0"` remains the success indicator.

<a id="run-sync"></a>

## **POST** /Run/{owner-slug}/{model-slug}/sync

Wait for any finite model on `https://api.wiro.ai/v1`. This starts the same
billed task as asynchronous Run, then returns final Task Detail JSON or streams
generic task events. It is not an OpenAI or Anthropic protocol. Training and
realtime models are rejected.

```bash
curl -X POST \
  "https://api.wiro.ai/v1/Run/claude/fable-5/sync" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "prompt": "Reply with one concise sentence about Türkiye.",
    "session_id": "fable-sync-example",
    "effort": "medium",
    "webSearch": "false",
    "maxOutputTokens": 128
  }'
```

Without streaming, the request stays open and returns Task Detail-compatible
JSON. Check `tasklist[0].pexit`; `"0"` means the model task succeeded. For LLM
tasks, `outputs` contains the structured result and `debugoutput` contains
merged plain text.

```json
{
  "result": true,
  "total": "1",
  "tasklist": [{
    "id": "2221",
    "status": "task_postprocess_end",
    "pexit": "0",
    "outputs": []
  }],
  "errors": []
}
```

Add `?stream=true` or send `Accept: text/event-stream` for named generic
events: `start`, cumulative task snapshots as `task_output`, a final `done`,
and periodic `: keep-alive` comments. Generic SSE does not use `[DONE]`. LLM
`task_output` events contain one ordered `segments` array. Text items use
`thinking` or `answer`; tool items use `function_call` or `custom_tool_call`.

```text
event: task_output
data: {
  "id": "2221",
  "status": "task_output",
  "pexit": null,
  "segments": [
    { "type": "thinking", "text": "Checking the constraints..." },
    { "type": "answer", "text": "Here is the result." }
  ]
}
```

Each LLM `segments` value is the full accumulated ordered snapshot, not only
the latest delta. Replace your previously stored segment list with each event
instead of appending the whole array again. While generation is active, the
final item's `text`, `arguments`, or `input` grows in place as chunks arrive;
render each snapshot immediately instead of waiting for `done`. A new item is
added when the output phase changes. Render `thinking` items as optional
reasoning progress, `answer` items as the model response, and tool items as
application-executed calls. The final `done` event contains Task
Detail-compatible JSON; inspect `tasklist[0].pexit` to determine success.

```bash
curl -N -X POST \
  "https://api.wiro.ai/v1/Run/claude/fable-5/sync?stream=true" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Accept: text/event-stream" \
  -d '{
    "prompt": "Reply with one concise sentence about Türkiye.",
    "session_id": "fable-stream-example",
    "effort": "medium",
    "webSearch": "false",
    "maxOutputTokens": 128
  }'
```

Disconnecting or reaching the 40-minute wait timeout ends only the synchronous
wait; the task keeps running. A non-streaming timeout returns HTTP `504` with
`taskid` and `socketaccesstoken` so you can resume tracking it through Task
Detail or WebSocket. Only `task_postprocess_end` and `task_cancel` close the
wait. `task_error` does not close a task. Errors use Wiro's `result`/`errors`
envelope. Sync is an additional execution method; asynchronous Run remains
unchanged.

```text
/v1/Run/{owner-slug}/{model-slug}/sync?stream=true
```

OpenAI Chat/Responses, Anthropic Messages, and Cursor clients belong on
`https://llm.wiro.ai`. See the [Direct LLM Gateway](/docs/completions-api).

## Full Flow

The typical workflow after calling the Run endpoint:

1. **Run** — call `POST /Run/{owner-slug}/{model-slug}` and receive a task ID
2. **Track** — connect via WebSocket or poll `POST /Task/Detail`
3. **Receive** — get outputs as the model produces them (streaming or final)
4. **Complete** — task reaches `task_postprocess_end`; verify `pexit: "0"` and
   read its outputs

For real-time streaming, use the WebSocket connection with the `socketaccesstoken` returned in the run response. For simpler integrations, poll the Task Detail endpoint every few seconds.

## Code Examples

### curl (JSON)

```bash
# Run a model with JSON body
curl -X POST "https://api.wiro.ai/v1/Run/{owner-slug}/{model-slug}" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "prompt": "A futuristic city at sunset",
    "negative_prompt": "blurry, low quality",
    "width": 1024,
    "height": 1024
  }'
```

### curl (Multipart)

```bash
# Run a model with file input (multipart)
curl -X POST "https://api.wiro.ai/v1/Run/{owner-slug}/{model-slug}" \
  -H "x-api-key: YOUR_API_KEY" \
  -F "image=@/path/to/photo.jpg" \
  -F "scale=4"
```

### Python

```python
import requests

headers = {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
}

# JSON request
response = requests.post(
    "https://api.wiro.ai/v1/Run/{owner-slug}/{model-slug}",
    headers=headers,
    json={
        "prompt": "A futuristic city at sunset",
        "negative_prompt": "blurry, low quality",
        "width": 1024,
        "height": 1024
    }
)
data = response.json()
task_id = data["taskid"]
socket_token = data["socketaccesstoken"]
print(f"Task ID: {task_id}")

# Multipart request (file upload)
files = {"image": open("photo.jpg", "rb")}
form_data = {"scale": "4"}
resp_multi = requests.post(
    "https://api.wiro.ai/v1/Run/{owner-slug}/{model-slug}",
    headers={"x-api-key": "YOUR_API_KEY"},
    files=files,
    data=form_data
)
```

### Node.js

```javascript
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const headers = {
  'x-api-key': 'YOUR_API_KEY',
  'Content-Type': 'application/json'
};

// JSON request
const response = await axios.post(
  'https://api.wiro.ai/v1/Run/{owner-slug}/{model-slug}',
  {
    prompt: 'A futuristic city at sunset',
    negative_prompt: 'blurry, low quality',
    width: 1024,
    height: 1024
  },
  { headers }
);
const { taskid, socketaccesstoken } = response.data;
console.log('Task ID:', taskid);

// Multipart request (file upload)
const form = new FormData();
form.append('image', fs.createReadStream('photo.jpg'));
form.append('scale', '4');
const multiResp = await axios.post(
  'https://api.wiro.ai/v1/Run/{owner-slug}/{model-slug}',
  form,
  { headers: { 'x-api-key': 'YOUR_API_KEY', ...form.getHeaders() } }
);
```

### PHP

```php
<?php
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, "https://api.wiro.ai/v1/Run/{owner-slug}/{model-slug}");
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Content-Type: application/json",
    "x-api-key: YOUR_API_KEY"
]);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
    "prompt" => "A futuristic city at sunset",
    "negative_prompt" => "blurry, low quality",
    "width" => 1024,
    "height" => 1024
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
        prompt = "A futuristic city at sunset",
        negative_prompt = "blurry, low quality",
        width = 1024,
        height = 1024
    }),
    Encoding.UTF8, "application/json");

var response = await client.PostAsync(
    "https://api.wiro.ai/v1/Run/{owner-slug}/{model-slug}", content);
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
    body, _ := json.Marshal(map[string]interface{}{
        "prompt":          "A futuristic city at sunset",
        "negative_prompt": "blurry, low quality",
        "width":           1024,
        "height":          1024,
    })
    req, _ := http.NewRequest("POST",
        "https://api.wiro.ai/v1/Run/{owner-slug}/{model-slug}",
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

let url = URL(string: "https://api.wiro.ai/v1/Run/{owner-slug}/{model-slug}")!
var request = URLRequest(url: url)
request.httpMethod = "POST"
request.setValue("application/json",
    forHTTPHeaderField: "Content-Type")
request.setValue("YOUR_API_KEY",
    forHTTPHeaderField: "x-api-key")
request.httpBody = try! JSONSerialization.data(
    withJSONObject: [
        "prompt": "A futuristic city at sunset",
        "negative_prompt": "blurry, low quality",
        "width": 1024,
        "height": 1024
    ])

let (data, _) = try await URLSession.shared
    .data(for: request)
print(String(data: data, encoding: .utf8)!)
```

### Kotlin

```kotlin
import java.net.HttpURLConnection
import java.net.URL

val url = URL("https://api.wiro.ai/v1/Run/{owner-slug}/{model-slug}")
val conn = url.openConnection() as HttpURLConnection
conn.requestMethod = "POST"
conn.setRequestProperty("Content-Type", "application/json")
conn.setRequestProperty("x-api-key", "YOUR_API_KEY")
conn.doOutput = true
conn.outputStream.write("""{
    "prompt": "A futuristic city at sunset",
    "negative_prompt": "blurry, low quality",
    "width": 1024,
    "height": 1024
}""".toByteArray())

val response = conn.inputStream.bufferedReader().readText()
println(response)
```

### Dart

```dart
import 'dart:convert';
import 'package:http/http.dart' as http;

final response = await http.post(
  Uri.parse('https://api.wiro.ai/v1/Run/{owner-slug}/{model-slug}'),
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'YOUR_API_KEY',
  },
  body: jsonEncode({
    'prompt': 'A futuristic city at sunset',
    'negative_prompt': 'blurry, low quality',
    'width': 1024,
    'height': 1024,
  }),
);
print(response.body);
```

### curl (Sync wait)

```bash
# Wait for a finite model on api.wiro.ai
curl -X POST "https://api.wiro.ai/v1/Run/claude/fable-5/sync" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "prompt": "Reply with one concise sentence about Türkiye.",
    "session_id": "fable-sync-example",
    "effort": "medium",
    "webSearch": "false",
    "maxOutputTokens": 128
  }'
```

### curl (Sync SSE)

```bash
curl -N -X POST "https://api.wiro.ai/v1/Run/claude/fable-5/sync?stream=true" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Accept: text/event-stream" \
  -d '{
    "prompt": "Reply with one concise sentence about Türkiye.",
    "session_id": "fable-stream-example",
    "effort": "medium",
    "webSearch": "false",
    "maxOutputTokens": 128
  }'
```

### Response

```json
{
  "result": true,
  "errors": [],
  "taskid": "2221",
  "socketaccesstoken": "eDcCm5yyUfIvMFspTwww49OUfgXkQt"
}
```
