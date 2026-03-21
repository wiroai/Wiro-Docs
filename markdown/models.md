# Models

Browse and discover AI models available on the Wiro platform.

## **POST** /Tool/List

Returns a paginated list of available models. Filter by categories, search by name, and sort results.

#### Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `start` | string | No | Offset for pagination (default: "0") |
| `limit` | string | No | Number of results to return (default: "20") |
| `search` | string | No | Search query to filter models by name |
| `sort` | string | No | Sort field: id, relevance |
| `order` | string | No | Sort direction: ASC or DESC |
| `categories` | string[] | No | Filter by categories (e.g. image-generation, llm, audio, video) |
| `tags` | string[] | No | Filter by tags |
| `slugowner` | string | No | Filter by model owner slug |
| `hideworkflows` | boolean | No | Hide workflow models from results (recommended: true) |
| `summary` | boolean | No | Return summarized model data (recommended for listings) |

### Response

```json
{
  "result": true,
  "errors": [],
  "total": 2,
  "tool": [
    {
      "id": "1611",
      "title": "Virtual Try-on",
      "slugowner": "wiro",
      "slugproject": "Virtual Try-On",
      "cleanslugowner": "wiro",
      "cleanslugproject": "virtual-try-on",
      "description": "Integrate the Wiro Virtual Try-On API...",
      "image": "https://cdn.wiro.ai/uploads/models/...",
      "computingtime": "10 seconds",
      "categories": ["tool", "image-to-image", "image-editing"],
      "tags": [],
      "marketplace": 1,
      "onlymembers": "1",
      "averagepoint": "5.00",
      "commentcount": "1",
      "dynamicprice": "[{\"inputs\":{},\"price\":0.09,\"priceMethod\":\"cpr\"}]",
      "taskstat": {
        "runcount": 672,
        "successcount": "254",
        "errorcount": "198",
        "lastruntime": "1774007585"
      }
    }
  ]
}
```

## **POST** /Tool/Detail

Returns full details for a specific model, including its input parameters, pricing, categories, and configuration.

#### Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `slugowner` | string | Yes | Model owner slug (e.g. stability-ai) |
| `slugproject` | string | Yes | Model project slug (e.g. sdxl) |
| `summary` | boolean | No | Return summarized data |

### Response

```json
{
  "result": true,
  "errors": [],
  "tool": [{
    "id": "1611",
    "title": "Virtual Try-on",
    "slugowner": "wiro",
    "slugproject": "Virtual Try-On",
    "cleanslugowner": "wiro",
    "cleanslugproject": "virtual-try-on",
    "description": "Integrate the Wiro Virtual Try-On API...",
    "image": "https://cdn.wiro.ai/uploads/models/...",
    "computingtime": "10 seconds",
    "readme": "<p>The Wiro Virtual Try-On AI model...</p>",
    "categories": ["tool", "image-to-image", "image-editing"],
    "parameters": null,
    "inspire": [
      {
        "inputImageHuman": "https://cdn.wiro.ai/uploads/sampleinputs/...",
        "inputImageClothes": ["https://cdn.wiro.ai/..."]
      }
    ],
    "samples": ["https://cdn.wiro.ai/uploads/models/..."],
    "tags": [],
    "marketplace": 1,
    "onlymembers": "1",
    "dynamicprice": "[{\"inputs\":{},\"price\":0.09,\"priceMethod\":\"cpr\"}]",
    "averagepoint": "5.00",
    "commentcount": "1",
    "ratedusercount": "3",
    "taskstat": {
      "runcount": 672,
      "successcount": "254",
      "errorcount": "198",
      "lastruntime": "1774007585"
    },
    "seotitle": "AI Virtual Try-On: Integrate Realistic Apparel Fitting",
    "seodescription": "Integrate the Wiro Virtual Try-On API..."
  }]
}
```

## Model Browser

Browse available models interactively. Click on a model to see its details on the [Wiro model page](https://wiro.ai/models).

## Code Examples

### curl (List)

```bash
curl -X POST "https://api.wiro.ai/v1/Tool/List" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "start": "0",
    "limit": "20",
    "search": "stable diffusion",
    "sort": "id",
    "order": "DESC",
    "categories": ["image-generation"],
    "hideworkflows": true,
    "summary": true
  }'
```

### curl (Detail)

```bash
curl -X POST "https://api.wiro.ai/v1/Tool/Detail" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "slugowner": "stability-ai",
    "slugproject": "sdxl"
  }'
```

### Python

```python
import requests

headers = {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
}

# List models
list_resp = requests.post(
    "https://api.wiro.ai/v1/Tool/List",
    headers=headers,
    json={
        "start": "0",
        "limit": "20",
        "search": "stable diffusion",
        "categories": ["image-generation"],
        "hideworkflows": True,
        "summary": True
    }
)
models = list_resp.json()

# Get model detail
detail_resp = requests.post(
    "https://api.wiro.ai/v1/Tool/Detail",
    headers=headers,
    json={
        "slugowner": "stability-ai",
        "slugproject": "sdxl"
    }
)
model = detail_resp.json()
```

### Node.js

```javascript
const axios = require('axios');

const headers = {
  'x-api-key': 'YOUR_API_KEY',
  'Content-Type': 'application/json'
};

// List models
const listResp = await axios.post(
  'https://api.wiro.ai/v1/Tool/List',
  {
    start: '0',
    limit: '20',
    search: 'stable diffusion',
    categories: ['image-generation'],
    hideworkflows: true,
    summary: true
  },
  { headers }
);
console.log(listResp.data);

// Get model detail
const detailResp = await axios.post(
  'https://api.wiro.ai/v1/Tool/Detail',
  { slugowner: 'stability-ai', slugproject: 'sdxl' },
  { headers }
);
console.log(detailResp.data);
```

### PHP

```php
<?php
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, "https://api.wiro.ai/v1/Tool/List");
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Content-Type: application/json",
    "x-api-key: YOUR_API_KEY"
]);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
    "start" => "0",
    "limit" => "20",
    "search" => "stable diffusion",
    "categories" => ["image-generation"],
    "hideworkflows" => true,
    "summary" => true
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
        start = "0",
        limit = "20",
        search = "stable diffusion",
        categories = new[] { "image-generation" },
        hideworkflows = true,
        summary = true
    }),
    Encoding.UTF8, "application/json");

var response = await client.PostAsync(
    "https://api.wiro.ai/v1/Tool/List", content);
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
        "start":      "0",
        "limit":      "20",
        "search":     "stable diffusion",
        "categories":    []string{"image-generation"},
        "hideworkflows": true,
        "summary":       true,
    })
    req, _ := http.NewRequest("POST",
        "https://api.wiro.ai/v1/Tool/List",
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

let url = URL(string: "https://api.wiro.ai/v1/Tool/List")!
var request = URLRequest(url: url)
request.httpMethod = "POST"
request.setValue("application/json",
    forHTTPHeaderField: "Content-Type")
request.setValue("YOUR_API_KEY",
    forHTTPHeaderField: "x-api-key")
request.httpBody = try! JSONSerialization.data(
    withJSONObject: [
        "start": "0",
        "limit": "20",
        "search": "stable diffusion",
        "categories": ["image-generation"],
        "hideworkflows": true,
        "summary": true
    ])

let (data, _) = try await URLSession.shared
    .data(for: request)
print(String(data: data, encoding: .utf8)!)
```

### Kotlin

```kotlin
import java.net.HttpURLConnection
import java.net.URL

val url = URL("https://api.wiro.ai/v1/Tool/List")
val conn = url.openConnection() as HttpURLConnection
conn.requestMethod = "POST"
conn.setRequestProperty("Content-Type", "application/json")
conn.setRequestProperty("x-api-key", "YOUR_API_KEY")
conn.doOutput = true
conn.outputStream.write("""{
    "start": "0",
    "limit": "20",
    "search": "stable diffusion",
    "categories": ["image-generation"],
    "hideworkflows": true,
    "summary": true
}""".toByteArray())

val response = conn.inputStream.bufferedReader().readText()
println(response)
```

### Dart

```dart
import 'dart:convert';
import 'package:http/http.dart' as http;

final response = await http.post(
  Uri.parse('https://api.wiro.ai/v1/Tool/List'),
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'YOUR_API_KEY',
  },
  body: jsonEncode({
    'start': '0',
    'limit': '20',
    'search': 'stable diffusion',
    'categories': ['image-generation'],
    'hideworkflows': true,
    'summary': true,
  }),
);
print(response.body);
```

### Response (List)

```json
{
  "result": true,
  "errors": [],
  "total": 2,
  "tool": [{
    "id": "1611",
    "title": "Virtual Try-on",
    "slugowner": "wiro",
    "slugproject": "Virtual Try-On",
    "cleanslugowner": "wiro",
    "cleanslugproject": "virtual-try-on",
    "description": "Integrate the Wiro Virtual Try-On API...",
    "image": "https://cdn.wiro.ai/uploads/models/...",
    "categories": ["tool", "image-to-image", "image-editing"],
    "tags": [],
    "marketplace": 1,
    "dynamicprice": "[{\"inputs\":{},\"price\":0.09}]",
    "taskstat": { "runcount": 672, "successcount": "254" }
  }]
}
```

### Response (Detail)

```json
{
  "result": true,
  "errors": [],
  "tool": [{
    "id": "1611",
    "title": "Virtual Try-on",
    "slugowner": "wiro",
    "slugproject": "Virtual Try-On",
    "cleanslugowner": "wiro",
    "cleanslugproject": "virtual-try-on",
    "description": "...",
    "readme": "<p>...</p>",
    "categories": ["tool", "image-to-image", "image-editing"],
    "parameters": null,
    "inspire": [{ "inputImageHuman": "https://...", "inputImageClothes": ["https://..."] }],
    "samples": ["https://cdn.wiro.ai/uploads/models/..."],
    "dynamicprice": "[{\"inputs\":{},\"price\":0.09,\"priceMethod\":\"cpr\"}]",
    "averagepoint": "5.00",
    "taskstat": { "runcount": 672, "successcount": "254" },
    "seotitle": "AI Virtual Try-On: Integrate Realistic Apparel Fitting"
  }]
}
```
