# Introduction

Everything you need to get started with the Wiro AI platform.

## What is Wiro?

Wiro is an AI model marketplace and API platform that lets you run **1,000+ AI models** through a single, unified API. Instead of managing infrastructure for each model provider, you make one API call to Wiro and we handle the rest.

- **Unified API** — one interface for all models (image generation, LLMs, audio, video, and more)
- **Pay-per-use pricing** — only pay for what you consume, no upfront commitments
- **Real-time WebSocket updates** — stream task progress and outputs live
- **9 SDK languages** — curl, Python, Node.js, PHP, C#, Swift, Dart, Kotlin, Go

## Base URL

All API requests are made to:

```
https://api.wiro.ai/v1
```

WebSocket connections use:

```
wss://socket.wiro.ai/v1
```

## Quick Start

1. **Sign up** at [wiro.ai](https://wiro.ai/auth/signup)
2. **Create a project** in the [Dashboard](https://wiro.ai/panel/project/new) to get your API key
3. **Pick a model** from the [marketplace](https://wiro.ai/models)
4. **Make your first API call** — see [Code Examples](#/code-examples) for full end-to-end samples

## Response Format

Every API response returns JSON with a consistent structure:

```json
{
  "result": true,
  "errors": [],
  "data": { ... }
}
```

When `result` is `false`, the `errors` array contains human-readable messages describing what went wrong.

## Rate Limits & Error Handling

API requests are rate-limited per project. If you exceed the limit, the API returns a `429 Too Many Requests` status. Implement exponential backoff in your retry logic.

Common HTTP status codes:

- `200` — Success
- `400` — Bad request (check parameters)
- `401` — Unauthorized (invalid or missing API key)
- `403` — Forbidden (signature mismatch or insufficient permissions)
- `429` — Rate limit exceeded
- `500` — Internal server error

## Code Examples

### curl

```bash
curl -X POST "https://api.wiro.ai/v1/Run/{owner-slug}/{model-slug}" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{"prompt": "Hello, world!"}'
```

### Python

```python
import requests

response = requests.post(
    "https://api.wiro.ai/v1/Run/{owner-slug}/{model-slug}",
    headers={"x-api-key": "YOUR_API_KEY", "Content-Type": "application/json"},
    json={"prompt": "Hello, world!"}
)
print(response.json())
```

### Node.js

```javascript
const axios = require('axios');

const response = await axios.post(
  'https://api.wiro.ai/v1/Run/{owner-slug}/{model-slug}',
  { prompt: 'Hello, world!' },
  { headers: { 'x-api-key': 'YOUR_API_KEY', 'Content-Type': 'application/json' } }
);
console.log(response.data);
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
    "prompt" => "Hello, world!"
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
    JsonSerializer.Serialize(new { prompt = "Hello, world!" }),
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
    body, _ := json.Marshal(map[string]string{
        "prompt": "Hello, world!",
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
request.setValue("application/json", forHTTPHeaderField: "Content-Type")
request.setValue("YOUR_API_KEY", forHTTPHeaderField: "x-api-key")
request.httpBody = try! JSONSerialization.data(withJSONObject: [
    "prompt": "Hello, world!"
])

let (data, _) = try await URLSession.shared.data(for: request)
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
conn.outputStream.write("""{"prompt": "Hello, world!"}""".toByteArray())

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
    'prompt': 'Hello, world!',
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
