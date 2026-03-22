# Projects

Organize your API access, billing, and usage with projects.

## What is a Project?

A project is a container that holds your **API keys**, **billing settings**, and **usage tracking**. Each project gets its own API key and secret, letting you separate environments (development, staging, production) or different applications.

- Each project has its own API key and (optionally) API secret
- Usage and billing are tracked per project
- You can create multiple projects under one account

## Creating a Project

1. Go to your [Dashboard](https://wiro.ai/panel)
2. Navigate to [Projects](https://wiro.ai/panel/project)
3. Click [New Project](https://wiro.ai/panel/project/new)
4. Enter a project name
5. Select your [authentication method](/docs/authentication):
   - **Signature-Based** — generates both an API key and API secret
   - **API Key Only** — generates only an API key
6. Click **Create**

## API Credentials

After creating a project, your API key (and secret, if signature-based) are displayed **once**. Copy and store them securely — you won't be able to view the secret again.

> **Important:** Treat your API secret like a password. Never commit it to version control or expose it in client-side code without signature-based authentication.

## Managing Projects

From the [Projects page](https://wiro.ai/panel/project) in your Dashboard, you can:

- **Update name** — rename your project at any time
- **Regenerate keys** — invalidates existing keys and generates new ones
- **View usage** — see API calls, costs, and task history
- **Delete project** — permanently removes the project and revokes all keys

Regenerating keys immediately invalidates the old ones. Update your application with the new credentials before the old ones stop working.

## Code Examples

### curl

```bash
# Use your project API key in any request
curl -X POST "https://api.wiro.ai/v1/Run/stability-ai/sdxl" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_PROJECT_API_KEY" \
  -d '{"prompt": "A sunset over mountains"}'
```

### Python

```python
import requests

API_KEY = "YOUR_PROJECT_API_KEY"

response = requests.post(
    "https://api.wiro.ai/v1/Run/stability-ai/sdxl",
    headers={
        "x-api-key": API_KEY,
        "Content-Type": "application/json"
    },
    json={"prompt": "A sunset over mountains"}
)
print(response.json())
```

### Node.js

```javascript
const axios = require('axios');

const API_KEY = 'YOUR_PROJECT_API_KEY';

const response = await axios.post(
  'https://api.wiro.ai/v1/Run/stability-ai/sdxl',
  { prompt: 'A sunset over mountains' },
  {
    headers: {
      'x-api-key': API_KEY,
      'Content-Type': 'application/json'
    }
  }
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
    "x-api-key: YOUR_PROJECT_API_KEY"
]);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
    "prompt" => "A sunset over mountains"
]));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$response = curl_exec($ch);
curl_close($ch);
echo $response;
```

### C#

```csharp
using var client = new HttpClient();
client.DefaultRequestHeaders.Add(
    "x-api-key", "YOUR_PROJECT_API_KEY");

var content = new StringContent(
    JsonSerializer.Serialize(new {
        prompt = "A sunset over mountains"
    }),
    Encoding.UTF8, "application/json");

var response = await client.PostAsync(
    "https://api.wiro.ai/v1/Run/{owner-slug}/{model-slug}",
    content);
var result = await response.Content
    .ReadAsStringAsync();
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
        "prompt": "A sunset over mountains",
    })
    req, _ := http.NewRequest("POST",
        "https://api.wiro.ai/v1/Run/{owner-slug}/{model-slug}",
        bytes.NewBuffer(body))
    req.Header.Set("Content-Type", "application/json")
    req.Header.Set("x-api-key", "YOUR_PROJECT_API_KEY")

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
request.setValue("YOUR_PROJECT_API_KEY",
    forHTTPHeaderField: "x-api-key")
request.httpBody = try! JSONSerialization.data(
    withJSONObject: [
        "prompt": "A sunset over mountains"
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
conn.setRequestProperty("x-api-key", "YOUR_PROJECT_API_KEY")
conn.doOutput = true
conn.outputStream.write("""{"prompt": "A sunset over mountains"}""".toByteArray())

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
    'x-api-key': 'YOUR_PROJECT_API_KEY',
  },
  body: jsonEncode({
    'prompt': 'A sunset over mountains',
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
