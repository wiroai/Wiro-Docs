# Run a Model

Execute any AI model with a single API call and get real-time updates.

## **POST** /Run/{owner-slug}/{model-slug}

Starts an AI model run. The endpoint accepts model-specific parameters and returns a **task ID** you can use to track progress via [polling](/docs/tasks), [WebSocket](/docs/websocket), or **webhook** by providing a `callbackUrl` parameter — Wiro will POST the result to your URL when the task completes.

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

## Full Flow

The typical workflow after calling the Run endpoint:

1. **Run** — call `POST /Run/{owner-slug}/{model-slug}` and receive a task ID
2. **Track** — connect via WebSocket or poll `POST /Task/Detail`
3. **Receive** — get outputs as the model produces them (streaming or final)
4. **Complete** — task reaches `end` status with full results

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
task_id = data["data"]["taskid"]
socket_token = data["data"]["socketaccesstoken"]
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
const { taskid, socketaccesstoken } = response.data.data;
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

### Response

```json
{
  "result": true,
  "errors": [],
  "taskid": "2221",
  "socketaccesstoken": "eDcCm5yyUfIvMFspTwww49OUfgXkQt"
}
```
