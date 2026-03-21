# Code Examples

Complete end-to-end examples in all 9 supported languages.

## Overview

Each example below demonstrates the full Wiro workflow: authenticate, run a model, poll for task completion, and retrieve the result. Choose your preferred language from the tabs.

- **curl** — Shell scripting with bash
- **Python** — Using the `requests` library
- **Node.js** — Using `axios`
- **PHP** — Using cURL functions
- **C#** — Using `HttpClient` (.NET 6+)
- **Swift** — Using async/await `URLSession`
- **Dart** — Using the `http` package
- **Kotlin** — Using `java.net.http`
- **Go** — Using the standard library `net/http`

## Full Examples

All examples perform the same steps:

1. Set up authentication headers
2. Run a model (`POST /Run/{owner-slug}/{model-slug}`)
3. Poll the task status (`POST /Task/Detail`)
4. Print the final output

## Code Examples

### curl

```bash
#!/bin/bash
# Wiro API — End-to-End Example (curl)

API_KEY="YOUR_API_KEY"
BASE_URL="https://api.wiro.ai/v1"

# 1. Run a model
echo "Starting model run..."
RUN_RESPONSE=$(curl -s -X POST "$BASE_URL/Run/{owner-slug}/{model-slug}" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d '{"prompt": "A cyberpunk cityscape at night", "width": 1024, "height": 1024}')

TASK_TOKEN=$(echo $RUN_RESPONSE | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['taskid'])")
echo "Task ID: $TASK_TOKEN"

# 2. Poll for results
while true; do
  TASK_RESPONSE=$(curl -s -X POST "$BASE_URL/Task/Detail" \
    -H "Content-Type: application/json" \
    -H "x-api-key: $API_KEY" \
    -d "{\"tasktoken\": \"$TASK_TOKEN\"}")

  STATUS=$(echo $TASK_RESPONSE | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['status'])")
  echo "Status: $STATUS"

  if [ "$STATUS" = "end" ]; then
    echo "Done! Output:"
    echo $TASK_RESPONSE | python3 -m json.tool
    break
  elif [ "$STATUS" = "error" ] || [ "$STATUS" = "cancel" ]; then
    echo "Task failed or cancelled"
    break
  fi

  sleep 3
done
```

### Python

```python
import requests
import time

API_KEY = "YOUR_API_KEY"
BASE_URL = "https://api.wiro.ai/v1"

headers = {
    "x-api-key": API_KEY,
    "Content-Type": "application/json"
}

# 1. Run a model
print("Starting model run...")
run_resp = requests.post(
    f"{BASE_URL}/Run/{owner-slug}/{model-slug}",
    headers=headers,
    json={
        "prompt": "A cyberpunk cityscape at night",
        "width": 1024,
        "height": 1024
    }
)
run_data = run_resp.json()
task_token = run_data["data"]["taskid"]
print(f"Task ID: {task_token}")

# 2. Poll for results
while True:
    task_resp = requests.post(
        f"{BASE_URL}/Task/Detail",
        headers=headers,
        json={"tasktoken": task_token}
    )
    task = task_resp.json()["data"]
    status = task["status"]
    print(f"Status: {status}")

    if status == "end":
        print("Done! Output:", task.get("output"))
        break
    elif status in ("error", "cancel"):
        print("Task failed or cancelled")
        break

    time.sleep(3)
```

### Node.js

```javascript
const axios = require('axios');

const API_KEY = 'YOUR_API_KEY';
const BASE_URL = 'https://api.wiro.ai/v1';

const headers = {
  'x-api-key': API_KEY,
  'Content-Type': 'application/json'
};

async function main() {
  // 1. Run a model
  console.log('Starting model run...');
  const runResp = await axios.post(
    `${BASE_URL}/Run/{owner-slug}/{model-slug}`,
    {
      prompt: 'A cyberpunk cityscape at night',
      width: 1024,
      height: 1024
    },
    { headers }
  );
  const taskToken = runResp.data.data.taskid;
  console.log('Task ID:', taskToken);

  // 2. Poll for results
  while (true) {
    const taskResp = await axios.post(
      `${BASE_URL}/Task/Detail`,
      { tasktoken: taskToken },
      { headers }
    );
    const { status, output } = taskResp.data.data;
    console.log('Status:', status);

    if (status === 'end') {
      console.log('Done! Output:', output);
      break;
    }
    if (status === 'error' || status === 'cancel') {
      console.log('Task failed or cancelled');
      break;
    }

    await new Promise(r => setTimeout(r, 3000));
  }
}

main();
```

### PHP

```php
<?php
$apiKey = 'YOUR_API_KEY';
$baseUrl = 'https://api.wiro.ai/v1';

function apiPost($url, $data, $apiKey) {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'x-api-key: ' . $apiKey,
        ],
        CURLOPT_POSTFIELDS => json_encode($data),
    ]);
    $response = curl_exec($ch);
    curl_close($ch);
    return json_decode($response, true);
}

// 1. Run a model
echo "Starting model run...\n";
$runResp = apiPost("$baseUrl/Run/{owner-slug}/{model-slug}", [
    'prompt' => 'A cyberpunk cityscape at night',
    'width' => 1024,
    'height' => 1024,
], $apiKey);
$taskToken = $runResp['data']['taskid'];
echo "Task ID: $taskToken\n";

// 2. Poll for results
while (true) {
    $taskResp = apiPost("$baseUrl/Task/Detail", [
        'tasktoken' => $taskToken,
    ], $apiKey);
    $status = $taskResp['data']['status'];
    echo "Status: $status\n";

    if ($status === 'end') {
        echo "Done! Output:\n";
        print_r($taskResp['data']['output']);
        break;
    }
    if (in_array($status, ['error', 'cancel'])) {
        echo "Task failed or cancelled\n";
        break;
    }

    sleep(3);
}
```

### C#

```csharp
using System.Net.Http.Json;
using System.Text.Json;

var apiKey = "YOUR_API_KEY";
var baseUrl = "https://api.wiro.ai/v1";

using var http = new HttpClient();
http.DefaultRequestHeaders.Add("x-api-key", apiKey);

// 1. Run a model
Console.WriteLine("Starting model run...");
var runResp = await http.PostAsJsonAsync($"{baseUrl}/Run/{owner-slug}/{model-slug}", new {
    prompt = "A cyberpunk cityscape at night",
    width = 1024,
    height = 1024
});
var runData = await runResp.Content.ReadFromJsonAsync<JsonElement>();
var taskToken = runData.GetProperty("data").GetProperty("taskid").GetString();
Console.WriteLine($"Task ID: {taskToken}");

// 2. Poll for results
while (true) {
    var taskResp = await http.PostAsJsonAsync($"{baseUrl}/Task/Detail", new {
        tasktoken = taskToken
    });
    var taskData = await taskResp.Content.ReadFromJsonAsync<JsonElement>();
    var status = taskData.GetProperty("data").GetProperty("status").GetString();
    Console.WriteLine($"Status: {status}");

    if (status == "end") {
        Console.WriteLine("Done!");
        Console.WriteLine(taskData.GetProperty("data").GetProperty("output").ToString());
        break;
    }
    if (status == "error" || status == "cancel") {
        Console.WriteLine("Task failed or cancelled");
        break;
    }

    await Task.Delay(3000);
}
```

### Swift

```swift
import Foundation

let apiKey = "YOUR_API_KEY"
let baseUrl = "https://api.wiro.ai/v1"

func apiPost(_ endpoint: String, body: [String: Any]) async throws -> [String: Any] {
    var request = URLRequest(url: URL(string: "\(baseUrl)\(endpoint)")!)
    request.httpMethod = "POST"
    request.addValue("application/json", forHTTPHeaderField: "Content-Type")
    request.addValue(apiKey, forHTTPHeaderField: "x-api-key")
    request.httpBody = try JSONSerialization.data(withJSONObject: body)

    let (data, _) = try await URLSession.shared.data(for: request)
    return try JSONSerialization.jsonObject(with: data) as! [String: Any]
}

// 1. Run a model
print("Starting model run...")
let runResp = try await apiPost("/Run/{owner-slug}/{model-slug}", body: [
    "prompt": "A cyberpunk cityscape at night",
    "width": 1024,
    "height": 1024
])
let runData = runResp["data"] as! [String: Any]
let taskToken = runData["taskid"] as! String
print("Task ID: \(taskToken)")

// 2. Poll for results
while true {
    let taskResp = try await apiPost("/Task/Detail", body: ["tasktoken": taskToken])
    let taskData = taskResp["data"] as! [String: Any]
    let status = taskData["status"] as! String
    print("Status: \(status)")

    if status == "end" {
        print("Done! Output: \(taskData["output"] ?? "")")
        break
    }
    if status == "error" || status == "cancel" {
        print("Task failed or cancelled")
        break
    }

    try await Task.sleep(nanoseconds: 3_000_000_000)
}
```

### Dart

```dart
import 'dart:convert';
import 'package:http/http.dart' as http;

const apiKey = 'YOUR_API_KEY';
const baseUrl = 'https://api.wiro.ai/v1';

Future<Map<String, dynamic>> apiPost(String endpoint, Map<String, dynamic> body) async {
  final response = await http.post(
    Uri.parse('$baseUrl$endpoint'),
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: jsonEncode(body),
  );
  return jsonDecode(response.body);
}

Future<void> main() async {
  // 1. Run a model
  print('Starting model run...');
  final runResp = await apiPost('/Run/{owner-slug}/{model-slug}', {
    'prompt': 'A cyberpunk cityscape at night',
    'width': 1024,
    'height': 1024,
  });
  final taskToken = runResp['data']['taskid'];
  print('Task ID: $taskToken');

  // 2. Poll for results
  while (true) {
    final taskResp = await apiPost('/Task/Detail', {'tasktoken': taskToken});
    final status = taskResp['data']['status'];
    print('Status: $status');

    if (status == 'end') {
      print('Done! Output: ${taskResp['data']['output']}');
      break;
    }
    if (status == 'error' || status == 'cancel') {
      print('Task failed or cancelled');
      break;
    }

    await Future.delayed(Duration(seconds: 3));
  }
}
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
val baseUrl = "https://api.wiro.ai/v1"
val client = HttpClient.newHttpClient()
val gson = Gson()

fun apiPost(endpoint: String, body: Map<String, Any?>): JsonObject {
    val request = HttpRequest.newBuilder()
        .uri(URI.create("$baseUrl$endpoint"))
        .header("Content-Type", "application/json")
        .header("x-api-key", apiKey)
        .POST(HttpRequest.BodyPublishers.ofString(gson.toJson(body)))
        .build()
    val response = client.send(request, HttpResponse.BodyHandlers.ofString())
    return gson.fromJson(response.body(), JsonObject::class.java)
}

fun main() {
    // 1. Run a model
    println("Starting model run...")
    val runResp = apiPost("/Run/{owner-slug}/{model-slug}", mapOf(
        "prompt" to "A cyberpunk cityscape at night",
        "width" to 1024,
        "height" to 1024
    ))
    val taskToken = runResp.getAsJsonObject("data").get("taskid").asString
    println("Task ID: $taskToken")

    // 2. Poll for results
    while (true) {
        val taskResp = apiPost("/Task/Detail", mapOf("tasktoken" to taskToken))
        val taskData = taskResp.getAsJsonObject("data")
        val status = taskData.get("status").asString
        println("Status: $status")

        when (status) {
            "end" -> {
                println("Done! Output: ${taskData.get("output")}")
                return
            }
            "error", "cancel" -> {
                println("Task failed or cancelled")
                return
            }
        }

        Thread.sleep(3000)
    }
}
```

### Go

```go
package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

const (
	apiKey  = "YOUR_API_KEY"
	baseURL = "https://api.wiro.ai/v1"
)

func apiPost(endpoint string, body map[string]interface{}) (map[string]interface{}, error) {
	jsonBody, _ := json.Marshal(body)
	req, _ := http.NewRequest("POST", baseURL+endpoint, bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-api-key", apiKey)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	data, _ := io.ReadAll(resp.Body)
	var result map[string]interface{}
	json.Unmarshal(data, &result)
	return result, nil
}

func main() {
	// 1. Run a model
	fmt.Println("Starting model run...")
	runResp, _ := apiPost("/Run/{owner-slug}/{model-slug}", map[string]interface{}{
		"prompt": "A cyberpunk cityscape at night",
		"width":  1024,
		"height": 1024,
	})
	runData := runResp["data"].(map[string]interface{})
	taskToken := runData["taskid"].(string)
	fmt.Printf("Task ID: %s\n", taskToken)

	// 2. Poll for results
	for {
		taskResp, _ := apiPost("/Task/Detail", map[string]interface{}{
			"tasktoken": taskToken,
		})
		taskData := taskResp["data"].(map[string]interface{})
		status := taskData["status"].(string)
		fmt.Printf("Status: %s\n", status)

		switch status {
		case "end":
			fmt.Printf("Done! Output: %v\n", taskData["output"])
			return
		case "error", "cancel":
			fmt.Println("Task failed or cancelled")
			return
		}

		time.Sleep(3 * time.Second)
	}
}
```
