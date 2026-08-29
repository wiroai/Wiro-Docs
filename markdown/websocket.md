# WebSocket

Receive real-time task updates via a persistent WebSocket connection.

## Connection URL

```
wss://socket.wiro.ai/v1
```

Connect to this URL after calling the Run endpoint. Use the `socketaccesstoken` from the run response to register your session.

## Connection Flow

1. **Connect** — open a WebSocket connection to `wss://socket.wiro.ai/v1`
2. **Register** — send a `task_info` message with your `tasktoken`
3. **Receive** — listen for messages as the task progresses through its lifecycle
4. **Close** — disconnect after the `task_postprocess_end` event (this is the final event with results)

Registration message format:

```json
{
  "type": "task_info",
  "tasktoken": "your-socket-access-token"
}
```

## Message Types

| Message Type | Description |
|--------------|-------------|
| `task_queue` | The task is queued and waiting to start. |
| `task_accept` | The task was accepted and is preparing for execution. |
| `task_preprocess_start` | Optional input preparation has started. |
| `task_preprocess_end` | Input preparation completed. |
| `task_assign` | Execution capacity was assigned and the model is preparing to start. |
| `task_start` | Model execution started. |
| `task_output` | The model is producing output. Emitted **multiple times**; LLM events carry the latest cumulative ordered `message.segments` snapshot. |
| `task_error` | An interim diagnostic event. It is not terminal; continue listening for completion. |
| `task_output_full` | Signals that output collection ended. Treat it as a lifecycle event. |
| `task_error_full` | Signals that error-output collection ended. Treat it as a lifecycle event. |
| `task_end` | Model execution ended. This is not the final success signal; wait for `task_postprocess_end`. |
| `task_postprocess_start` | Final output preparation started. |
| `task_postprocess_end` | Post-processing completed. Check `success` and `exitCode` (`0` = success). The `message` array contains final outputs. **This is the event to listen for.** |
| `task_cancel` | The task was cancelled (if queued) or killed (if running) by the user. |

### Message Format

Every WebSocket message is a JSON object with this base structure:

```json
{
  "type": "task_accept",
  "id": "534574",
  "message": null,
  "result": true,
  "success": null,
  "terminal": false,
  "exitCode": null
}
```

The `type` field indicates the status. The `message` field varies by type — it's `null` for lifecycle events, a string or object for output events, and an array for the final result.

Use the top-level `id` to correlate server events with the submitted task.

### Lifecycle Events

These events signal task state changes. The `message` field is `null`:

```json
// task_accept, task_preprocess_start, task_preprocess_end,
// task_assign, task_start, task_end, task_postprocess_start
{
  "type": "task_assign",
  "id": "534574",
  "message": null,
  "result": true
}
```

### Output Events

**Standard models** — `message` is a progress object or plain string:

```json
// Progress output (image generation, video, etc.)
{
  "type": "task_output",
  "id": "534574",
  "message": {
    "type": "progressGenerate",
    "task": "Generate",
    "percentage": "60",
    "stepCurrent": "6",
    "stepTotal": "10",
    "speed": "1.2",
    "speedType": "it/s",
    "elapsedTime": "5s",
    "remainingTime": "3s"
  },
  "result": true
}

// Simple string output
{
  "type": "task_output",
  "id": "534574",
  "message": "Processing complete.",
  "result": true
}
```

**LLM models** — `message.segments` is the cumulative ordered output snapshot.
Replace it on every event. The final active item's `text` grows as chunks arrive,
so render it before completion; a new item appears when the output phase changes.
See [LLM & Chat Streaming](/docs/llm-chat-streaming) for full details:

```json
{
  "type": "task_output",
  "id": "534574",
  "message": {
    "type": "progressGenerate",
    "task": "Generate",
    "speed": "12.4",
    "speedType": "words/s",
    "segments": [
      { "type": "thinking", "text": "Let me analyze this..." },
      { "type": "answer", "text": "Quantum computing uses qubits..." }
    ],
    "finishreason": "stop",
    "usage": {
      "input_tokens": 18,
      "input_tokens_details": { "cached_tokens": 6 },
      "output_tokens": 11,
      "output_tokens_details": { "reasoning_tokens": 4 },
      "total_tokens": 29
    },
    "isThinking": false,
    "elapsedTime": "3s"
  },
  "result": true
}
```

`message.segments` is always the full accumulated snapshot. Text entries use
`thinking` or `answer`. Tool-capable models can also emit `function_call`
entries with `arguments`, or `custom_tool_call` entries with `input`; both
include `id`, `call_id`, `name`, and `status`.

`message.finishreason` and `message.usage` are final-turn
metadata and can be absent from earlier `task_output` snapshots:

- `finishreason` is `stop`, `tool_calls`, `length`, `content_filter`, or
  `error`. Execute a tool only when its segment status is `completed` and the
  finish reason is `tool_calls`.
- `usage` contains normalized token and server-tool counters. Input totals
  already include cache reads/writes; output totals already include reasoning.
  Do not add details to `total_tokens`, and use Task Detail `totalcost` for the
  billed amount.

Inspect `finishreason` after completion so truncation and content filtering are
not mistaken for a normal stop.

### Error Events

`task_error` is an interim diagnostic event, not a final failure:

```json
{
  "type": "task_error",
  "id": "534574",
  "message": "UserWarning: Some weights were not initialized...",
  "result": true
}
```

### Full Output Events

`task_output_full` and `task_error_full` are lifecycle signals. Continue
listening for `task_postprocess_end`, or use authenticated `POST /Task/Detail`
to retrieve the persisted task.

```json
{
  "type": "task_output_full",
  "id": "534574",
  "message": "",
  "result": true
}
```

### Final Result

`task_postprocess_end` is the event you should listen for. The `message` contains the `outputs` array:

```json
// Standard model — file outputs with CDN URLs
{
  "type": "task_postprocess_end",
  "id": "534574",
  "message": [{
    "name": "0.png",
    "contenttype": "image/png",
    "size": "202472",
    "url": "https://cdn1.wiro.ai/.../0.png"
  }],
  "result": true,
  "success": true,
  "terminal": true,
  "exitCode": 0
}

// LLM model — structured raw content
{
  "type": "task_postprocess_end",
  "id": "534574",
  "message": [{
    "contenttype": "raw",
    "content": {
      "prompt": "Explain quantum computing",
      "segments": [
        { "type": "answer", "text": "Quantum computing uses qubits..." }
      ],
      "finishreason": "stop",
      "usage": {
        "input_tokens": 18,
        "output_tokens": 11,
        "total_tokens": 29
      }
    }
  }],
  "result": true,
  "success": true,
  "terminal": true,
  "exitCode": 0
}
```

### Realtime Events

These events are exclusive to realtime models ([voice conversation](/docs/realtime-voice-conversation), [text-to-speech](/docs/realtime-text-to-speech), and [speech-to-text](/docs/realtime-speech-to-text)):

```json
// Session is ready — start sending audio/text
{
  "type": "task_stream_ready",
  "id": "534574",
  "result": true
}

// The model finished producing output for this turn
{
  "type": "task_stream_end",
  "id": "534574",
  "result": true
}

// Cost update per turn
{
  "type": "task_cost",
  "id": "534574",
  "turnCost": 0.002,
  "cumulativeCost": 0.012,
  "usage": { "input_tokens": 150, "output_tokens": 89 },
  "result": true
}
```

`task_cost.usage` is the provider-specific realtime usage payload for that
turn. It is separate from the normalized structured finite-LLM `message.usage`
contract described above and can omit `total_tokens` or detail objects.

## Binary Frames

For **realtime models** (voice conversation, text-to-speech, and speech-to-text), the WebSocket may send binary frames containing raw audio data. Check if the received message is a `Blob` (browser) or `Buffer` (Node.js) before parsing as JSON.

## Ending a Session

For realtime models that maintain a persistent session, send a `task_session_end` message to gracefully terminate:

```json
{
  "type": "task_session_end",
  "tasktoken": "your-socket-access-token"
}
```

After sending this, wait for the `task_postprocess_end` event before closing the connection. This is the final event that contains the complete results.

## Code Examples

### JavaScript

```javascript
const taskToken = 'your-socket-access-token';

const ws = new WebSocket('wss://socket.wiro.ai/v1');

ws.onopen = () => {
  console.log('Connected to Wiro WebSocket');
  // Register with your task token
  ws.send(JSON.stringify({
    type: 'task_info',
    tasktoken: taskToken
  }));
};

ws.onmessage = (event) => {
  // Handle binary frames (realtime voice models)
  if (event.data instanceof Blob) {
    console.log('Received binary frame:', event.data.size, 'bytes');
    return;
  }

  const msg = JSON.parse(event.data);
  console.log('Event:', msg.type, msg);

  switch (msg.type) {
    case 'task_queue':
      console.log('Task is queued...');
      break;
    case 'task_start':
      console.log('Model inference started');
      break;
    case 'task_output':
      console.log('Partial output:', msg.message);
      break;
    case 'task_output_full':
      console.log('Full output:', msg.message);
      break;
    case 'task_error':
      console.error('Error:', msg.message);
      break;
    case 'task_end':
      console.log('Task completed!');
      ws.close();
      break;
  }
};

ws.onerror = (err) => {
  console.error('WebSocket error:', err);
};

ws.onclose = () => {
  console.log('WebSocket disconnected');
};
```

### Python

```python
import asyncio
import websockets
import json

async def listen_task(socket_token):
    uri = "wss://socket.wiro.ai/v1"

    async with websockets.connect(uri) as ws:
        # Register with task token
        await ws.send(json.dumps({
            "type": "task_info",
            "tasktoken": socket_token
        }))
        print("Registered with WebSocket")

        async for message in ws:
            if isinstance(message, bytes):
                print(f"Binary frame: {len(message)} bytes")
                continue

            msg = json.loads(message)
            print(f"Event: {msg['type']}")

            if msg["type"] == "task_output":
                print("Partial output:", msg.get("message"))
            elif msg["type"] == "task_output_full":
                print("Full output:", msg.get("message"))
            elif msg["type"] == "task_error":
                print("Error:", msg.get("message"))
            elif msg["type"] == "task_end":
                print("Task completed!")
                break

asyncio.run(listen_task("your-socket-access-token"))
```

### Node.js

```javascript
const WebSocket = require('ws');

const socketToken = 'your-socket-access-token';
const ws = new WebSocket('wss://socket.wiro.ai/v1');

ws.on('open', () => {
  console.log('Connected');
  ws.send(JSON.stringify({
    type: 'task_info',
    tasktoken: socketToken
  }));
});

ws.on('message', (data, isBinary) => {
  if (isBinary) {
    console.log('Binary frame:', data.length, 'bytes');
    return;
  }

  const msg = JSON.parse(data.toString());
  console.log('Event:', msg.type);

  if (msg.type === 'task_output_full') {
    console.log('Full output:', msg.message);
  }
  if (msg.type === 'task_end') {
    console.log('Done!');
    ws.close();
  }
});

ws.on('error', console.error);
ws.on('close', () => console.log('Disconnected'));
```

### PHP

```php
<?php
// Requires: composer require textalk/websocket
use WebSocket\Client;

$client = new Client("wss://socket.wiro.ai/v1");

$client->send(json_encode([
    "type" => "task_info",
    "tasktoken" => "your-socket-access-token"
]));

while (true) {
    $msg = json_decode($client->receive(), true);
    echo "Event: " . $msg["type"] . PHP_EOL;

    if ($msg["type"] === "task_output_full") {
        echo "Output: " . json_encode($msg["message"])
            . PHP_EOL;
    }
    if ($msg["type"] === "task_end") {
        echo "Done!" . PHP_EOL;
        break;
    }
}
$client->close();
```

### C#

```csharp
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;

using var ws = new ClientWebSocket();
await ws.ConnectAsync(
    new Uri("wss://socket.wiro.ai/v1"),
    CancellationToken.None);

var taskInfo = JsonSerializer.Serialize(new {
    type = "task_info",
    tasktoken = "your-socket-access-token"
});
await ws.SendAsync(
    Encoding.UTF8.GetBytes(taskInfo),
    WebSocketMessageType.Text, true,
    CancellationToken.None);

var buffer = new byte[4096];
while (ws.State == WebSocketState.Open) {
    var result = await ws.ReceiveAsync(
        buffer, CancellationToken.None);
    if (result.MessageType
        == WebSocketMessageType.Binary) {
        Console.WriteLine("Binary frame: "
            + result.Count + " bytes");
        continue;
    }
    var message = Encoding.UTF8.GetString(
        buffer, 0, result.Count);
    using var doc = JsonDocument.Parse(message);
    var type = doc.RootElement
        .GetProperty("type").GetString();
    Console.WriteLine("Event: " + type);

    if (type == "task_end") {
        Console.WriteLine("Done!");
        break;
    }
}
```

### Go

```go
package main

import (
    "encoding/json"
    "fmt"
    "log"
    "github.com/gorilla/websocket"
)

func main() {
    conn, _, err := websocket.DefaultDialer.Dial(
        "wss://socket.wiro.ai/v1", nil)
    if err != nil { log.Fatal(err) }
    defer conn.Close()

    reg, _ := json.Marshal(map[string]string{
        "type":  "task_info",
        "tasktoken": "your-socket-access-token",
    })
    conn.WriteMessage(websocket.TextMessage, reg)

    for {
        _, message, err := conn.ReadMessage()
        if err != nil { break }
        var msg map[string]interface{}
        json.Unmarshal(message, &msg)
        fmt.Println("Event:", msg["type"])

        if msg["type"] == "task_end" {
            fmt.Println("Done!")
            break
        }
    }
}
```

### Swift

```swift
import Foundation

let url = URL(string: "wss://socket.wiro.ai/v1")!
let task = URLSession.shared.webSocketTask(with: url)
task.resume()

let regData = try! JSONSerialization.data(
    withJSONObject: [
        "type": "task_info",
        "tasktoken": "your-socket-access-token"
    ])
task.send(.string(
    String(data: regData, encoding: .utf8)!
)) { _ in }

func receive() {
    task.receive { result in
        switch result {
        case .success(let message):
            switch message {
            case .string(let text):
                let msg = try! JSONSerialization
                    .jsonObject(with: text.data(
                        using: .utf8)!)
                    as! [String: Any]
                print("Event:", msg["type"] ?? "")
                if msg["type"] as? String == "task_end" {
                    print("Done!")
                    return
                }
            case .data(let data):
                print("Binary:", data.count, "bytes")
            @unknown default: break
            }
            receive()
        case .failure(let error):
            print("Error:", error)
        }
    }
}
receive()
```

### Kotlin

```kotlin
// Requires: org.java-websocket:Java-WebSocket
import org.java_websocket.client.WebSocketClient
import org.java_websocket.handshake.ServerHandshake
import java.net.URI
import org.json.JSONObject

val client = object : WebSocketClient(
    URI("wss://socket.wiro.ai/v1")) {
    override fun onOpen(h: ServerHandshake) {
        send(JSONObject(mapOf(
            "type" to "task_info",
            "tasktoken" to "your-socket-access-token"
        )).toString())
    }
    override fun onMessage(message: String) {
        val msg = JSONObject(message)
        println("Event: " + msg.getString("type"))
        if (msg.getString("type") == "task_end") {
            println("Done!")
            close()
        }
    }
    override fun onClose(
        code: Int, reason: String, remote: Boolean
    ) { println("Disconnected") }
    override fun onError(ex: Exception) {
        ex.printStackTrace()
    }
}
client.connect()
```

### Dart

```dart
import 'dart:convert';
import 'package:web_socket_channel/web_socket_channel.dart';

final channel = WebSocketChannel.connect(
  Uri.parse('wss://socket.wiro.ai/v1'),
);

channel.sink.add(jsonEncode({
  'type': 'task_info',
  'tasktoken': 'your-socket-access-token',
}));

channel.stream.listen((message) {
  final msg = jsonDecode(message);
  print('Event: ' + msg['type'].toString());
  if (msg['type'] == 'task_output_full') {
    print('Output: ' + jsonEncode(msg['message']));
  }
  if (msg['type'] == 'task_end') {
    print('Done!');
    channel.sink.close();
  }
});
```

### Messages

```json
// task_queue
{"type": "task_queue", "id": "534574", "message": null}

// task_start
{"type": "task_start", "id": "534574", "message": null}

// task_output (streaming log)
{"type": "task_output", "id": "534574", "message": "Step 1/10..."}

// task_postprocess_end (outputs ready)
{"type": "task_postprocess_end", "id": "534574", "success": true, "exitCode": 0,
 "message": [{"name": "0.png", "url": "https://cdn1.wiro.ai/.../0.png"}]}

// task_end
{"type": "task_end", "id": "534574", "terminal": false}
```

## Agent WebSocket Events

The same WebSocket connection also supports **AI Agent** real-time streaming. Instead of `task_info`, register with `agent_info` and an `agenttoken` to receive agent response events.

For full documentation on agent events (`agent_subscribed`, `agent_output`, `agent_end`, and more), see [Agent WebSocket](/docs/agent-websocket).
