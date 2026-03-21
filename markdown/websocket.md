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
4. **Close** — disconnect after the `task_end` event

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
| `task_queue` | Task entered the queue |
| `task_accept` | Task accepted by the system |
| `task_assign` | Task assigned to a worker |
| `task_preprocess_start` | Preprocessing has begun |
| `task_preprocess_end` | Preprocessing completed |
| `task_start` | Model inference started |
| `task_output` | Partial/streaming output from the model |
| `task_error` | A non-fatal error occurred during processing |
| `task_output_full` | Complete output payload when the model finishes |
| `task_error_full` | Complete error payload on failure |
| `task_postprocess_start` | Postprocessing has begun |
| `task_postprocess_end` | Postprocessing completed |
| `task_end` | Task fully completed — safe to close the connection |
| `task_cancel` | Task was cancelled |

## Binary Frames

For **realtime voice models**, the WebSocket may send binary frames containing raw audio data. Check if the received message is a `Blob` (browser) or `Buffer` (Node.js) before parsing as JSON.

## Ending a Session

For realtime/streaming models that maintain a persistent session, send an `task_session_end` message to gracefully terminate:

```json
{
  "type": "task_session_end",
  "tasktoken": "your-socket-access-token"
}
```

After sending this, wait for the `task_end` event before closing the connection.

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
      console.log('Partial output:', msg.data);
      break;
    case 'task_output_full':
      console.log('Full output:', msg.data);
      break;
    case 'task_error':
      console.error('Error:', msg.data);
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
                print("Partial output:", msg.get("data"))
            elif msg["type"] == "task_output_full":
                print("Full output:", msg.get("data"))
            elif msg["type"] == "task_error":
                print("Error:", msg.get("data"))
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
    console.log('Full output:', msg.data);
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
        echo "Output: " . json_encode($msg["data"])
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
    print('Output: ' + jsonEncode(msg['data']));
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
