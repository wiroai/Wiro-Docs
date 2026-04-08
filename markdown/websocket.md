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
| `task_queue` | The task is queued and waiting to be picked up by an available worker. |
| `task_accept` | A worker has accepted the task and is preparing for execution. |
| `task_preprocess_start` | Optional preprocessing has started (downloading input files from URLs, converting file types, validating parameters). |
| `task_preprocess_end` | Preprocessing completed. All inputs are ready for GPU assignment. |
| `task_assign` | The task has been assigned to a specific GPU. The model is being loaded into memory. |
| `task_start` | The model command has started executing. Inference is now running on the GPU. |
| `task_output` | The model is producing output. Emitted **multiple times** — each stdout write sends a new message. For LLMs, each token/chunk arrives as a separate event for real-time streaming. |
| `task_error` | The model wrote to stderr. This is an **interim log event**, not a final failure — many models write warnings to stderr during normal operation. The task may still succeed. |
| `task_output_full` | The complete accumulated stdout log, sent once after the model process finishes. |
| `task_error_full` | The complete accumulated stderr log, sent once after the model process finishes. |
| `task_end` | The model process has exited. Fires **before** post-processing — do not use this to determine success. Wait for `task_postprocess_end` instead. |
| `task_postprocess_start` | Post-processing has started. The system is preparing output files — encoding, uploading to CDN, generating access URLs. |
| `task_postprocess_end` | Post-processing completed. Check `pexit` to determine success (`"0"` = success). The `outputs` array contains the final files. **This is the event to listen for.** |
| `task_cancel` | The task was cancelled (if queued) or killed (if running) by the user. |

### Message Format

Every WebSocket message is a JSON object with this base structure:

```json
{
  "type": "task_accept",
  "id": "534574",
  "tasktoken": "eDcCm5yyUfIvMFspTwww49OUfgXkQt",
  "message": null,
  "result": true
}
```

The `type` field indicates the status. The `message` field varies by type — it's `null` for lifecycle events, a string or object for output events, and an array for the final result.

### Lifecycle Events

These events signal task state changes. The `message` field is `null`:

```json
// task_accept, task_preprocess_start, task_preprocess_end,
// task_assign, task_start, task_end, task_postprocess_start
{
  "type": "task_assign",
  "id": "534574",
  "tasktoken": "eDcCm5yy...",
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
  "tasktoken": "eDcCm5yy...",
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
  "tasktoken": "eDcCm5yy...",
  "message": "Processing complete.",
  "result": true
}
```

**LLM models** — `message` is a structured object with thinking/answer arrays. See [LLM & Chat Streaming](/docs/llm-chat-streaming) for full details:

```json
{
  "type": "task_output",
  "id": "534574",
  "tasktoken": "eDcCm5yy...",
  "message": {
    "type": "progressGenerate",
    "task": "Generate",
    "speed": "12.4",
    "speedType": "words/s",
    "raw": "Quantum computing uses qubits...",
    "thinking": ["Let me analyze this..."],
    "answer": ["Quantum computing uses qubits..."],
    "isThinking": false,
    "elapsedTime": "3s"
  },
  "result": true
}
```

### Error Events

`task_error` is an interim stderr log, not a final failure:

```json
{
  "type": "task_error",
  "id": "534574",
  "tasktoken": "eDcCm5yy...",
  "message": "UserWarning: Some weights were not initialized...",
  "result": true
}
```

### Full Output Events

Sent once after the process exits. Contains the complete accumulated log:

```json
// Standard model
{
  "type": "task_output_full",
  "id": "534574",
  "tasktoken": "eDcCm5yy...",
  "message": {
    "raw": "0%|...| 0/10\n10%|█| 1/10\n...\n100%|██████████| 10/10\nDone."
  },
  "result": true
}

// LLM model — includes thinking/answer separation
{
  "type": "task_output_full",
  "id": "534574",
  "tasktoken": "eDcCm5yy...",
  "message": {
    "raw": "<think>Let me analyze...</think>Quantum computing uses qubits...",
    "thinking": ["Let me analyze this step by step..."],
    "answer": ["Quantum computing uses qubits that can exist in superposition..."]
  },
  "result": true
}

// Stderr log (only sent if stderr is non-empty)
{
  "type": "task_error_full",
  "id": "534574",
  "tasktoken": "eDcCm5yy...",
  "message": {
    "raw": "UserWarning: Some weights were not initialized..."
  },
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
  "tasktoken": "eDcCm5yy...",
  "message": [{
    "name": "0.png",
    "contenttype": "image/png",
    "size": "202472",
    "url": "https://cdn1.wiro.ai/.../0.png"
  }],
  "result": true
}

// LLM model — structured raw content
{
  "type": "task_postprocess_end",
  "id": "534574",
  "tasktoken": "eDcCm5yy...",
  "message": [{
    "contenttype": "raw",
    "content": {
      "prompt": "Explain quantum computing",
      "raw": "Quantum computing uses qubits...",
      "thinking": [],
      "answer": ["Quantum computing uses qubits..."]
    }
  }],
  "result": true
}
```

### Realtime Events

These events are exclusive to realtime models ([voice conversation](/docs/realtime-voice-conversation), [text-to-speech](/docs/realtime-text-to-speech), and [speech-to-text](/docs/realtime-speech-to-text)):

```json
// Session is ready — start sending audio/text
{
  "type": "task_stream_ready",
  "id": "534574",
  "tasktoken": "eDcCm5yy...",
  "result": true
}

// The model finished producing output for this turn
{
  "type": "task_stream_end",
  "id": "534574",
  "tasktoken": "eDcCm5yy...",
  "result": true
}

// Cost update per turn
{
  "type": "task_cost",
  "id": "534574",
  "tasktoken": "eDcCm5yy...",
  "turnCost": 0.002,
  "cumulativeCost": 0.012,
  "usage": { "input_tokens": 150, "output_tokens": 89 },
  "result": true
}
```

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
{"type": "task_queue", "tasktoken": "eDcCm5yy..."}

// task_start
{"type": "task_start", "tasktoken": "eDcCm5yy..."}

// task_output (streaming log)
{"type": "task_output", "tasktoken": "eDcCm5yy...", "message": "Step 1/10..."}

// task_postprocess_end (outputs ready)
{"type": "task_postprocess_end", "tasktoken": "eDcCm5yy...", "message": [
  {"name": "0.png", "url": "https://cdn1.wiro.ai/.../0.png", "size": "202472"}
]}

// task_end
{"type": "task_end", "tasktoken": "eDcCm5yy..."}
```

## Agent WebSocket Events

The same WebSocket connection also supports **AI Agent** real-time streaming. Instead of `task_info`, register with `agent_info` and an `agenttoken` to receive agent response events.

For full documentation on agent events (`agent_subscribed`, `agent_output`, `agent_end`, and more), see [Agent WebSocket](/docs/agent-websocket).
