# Agent WebSocket

Receive real-time agent response streaming via a persistent WebSocket connection.

## Connection URL

```
wss://socket.wiro.ai/v1
```

Connect to this URL after calling the [Message / Send](/docs/agent-messaging) endpoint. Use the `agenttoken` from the send response to subscribe to the agent session. This is the same WebSocket server used for model tasks — you can subscribe to both task events (`task_info`) and agent events (`agent_info`) on the same connection.

No API key or auth header is required on the WebSocket itself. Authorization is enforced via the `agenttoken`, which is issued by `POST /UserAgent/Message/Send` against your API key and is scoped to a single message run.

## Connection Flow

1. **Connect** — open a WebSocket connection to `wss://socket.wiro.ai/v1`.
2. **Receive welcome** — the server pushes a one-shot `connected` frame confirming the upgrade.
3. **Subscribe** — send an `agent_info` frame with your `agenttoken`.
4. **Receive `agent_subscribed`** — the server acknowledges the subscribe and reports the current lifecycle status (plus any already-accumulated `debugoutput`).
5. **Stream** — listen for `agent_start` → many `agent_output` → `agent_end` / `agent_error` / `agent_cancel`.
6. **Close** — disconnect after a terminal event, or keep the socket open and subscribe to the next `agenttoken`.

### 1. Welcome frame (server → client)

Right after the WebSocket upgrade succeeds, the server sends this frame on its own. You don't request it; it arrives before you send anything.

```json
{
  "type": "connected",
  "version": "1.0"
}
```

Use it as a signal that the socket is fully ready to receive a subscribe. Most clients can ignore the payload — the `version` field is informational.

### 2. Subscribe frame (client → server)

```json
{
  "type": "agent_info",
  "agenttoken": "aB3xK9mR2pLqWzVn7tYhCd5sFgJkNb"
}
```

- `type` — must be the literal string `"agent_info"`. Other values are ignored (the server routes by type; unknown types are silently dropped).
- `agenttoken` — the token returned by `POST /UserAgent/Message/Send`. Required. If missing or empty, the server responds with an `error` frame (see [Subscribe errors](#subscribe-errors)).

The server keeps the mapping `connection ↔ agenttoken` in memory for the life of the connection. You can send additional `agent_info` frames on the same socket to subscribe to more tokens — see [Multi-session subscription](#multi-session-subscription).

### 3. Subscribe errors

If `agenttoken` is missing or blank, the server replies with:

```json
{
  "type": "error",
  "message": "agenttoken-required",
  "result": false
}
```

The connection stays open — no disconnect. Fix the payload and resend. The same frame is used for any shape-level rejection of a subscribe; message routing failures (unknown types, internal exceptions) are silently dropped and produce no frame at all.

### Multi-session subscription

A single WebSocket connection can hold subscriptions to multiple agent sessions simultaneously. Send one `agent_info` frame per token; the server de-duplicates, so resending the same token is a no-op.

```text
WS connect              →  { "type": "connected", "version": "1.0" }
{ agent_info, token: A } →  { agent_subscribed ... token: A }
{ agent_info, token: B } →  { agent_subscribed ... token: B }
{ agent_info, token: A } →  (no-op — already subscribed)
```

After this, every server-side event for either token is forwarded to this connection. All events carry the `agenttoken` field, so your handler can route them back to the right UI surface.

Typical use cases:

- Multi-tab chat clients that keep several live conversations.
- Dashboards watching several users' agents in parallel.
- Combining task streaming and agent streaming on the same connection — `task_info` and `agent_info` frames both map to the same connection's token list (tasks under `taskTokens`, agents under `agentTokens`).

There is no `unsubscribe` frame. To stop listening to a token without reconnecting, ignore its events client-side; tokens are cleaned up automatically when the connection closes.

## Event Types

Frames flow in two directions. `↓` = server → client, `↑` = client → server.

| Direction | Event Type | Description |
|---|---|---|
| ↓ | `connected` | Welcome frame pushed by the server right after the WebSocket upgrade. Fires exactly once per connection. |
| ↑ | `agent_info` | Client-initiated subscribe frame. Carries the `agenttoken` issued by `Message/Send`. Can be sent multiple times on the same socket (one per token). |
| ↓ | `error` | Server-side rejection of a malformed subscribe (missing `agenttoken`). Connection stays open; retry with a valid frame. |
| ↓ | `agent_subscribed` | Subscribe acknowledged. Carries the current lifecycle `status` plus any accumulated `debugoutput`. If the agent already finished before you subscribed, this frame is your snapshot of the final output and no further events will fire. |
| ↓ | `agent_start` | The bridge has opened an SSE stream to the agent container. The underlying model is now generating. Emits exactly once per message. |
| ↓ | `agent_output` | Streaming chunk. Emits **many times** — each carries the full accumulated `raw` text so far plus real-time metrics (`speed`, `elapsedTime`, `tokenCount`, `wordCount`). Replace (don't append) your UI on each event. |
| ↓ | `agent_end` | Terminal success event. Same payload shape as `agent_output` but contains the final complete text with total metrics. Emits at most once. |
| ↓ | `agent_error` | Terminal failure event. `message` is either a sanitized string ("Agent is temporarily unavailable…" when an exception was caught) or a `progressGenerate` object (when the stream finished but content was a degenerate `"..."` / `"Error: internal error"`). Emits at most once. |
| ↓ | `agent_cancel` | Terminal cancel event. Fires **only** when an already-active message is aborted mid-stream (via `Message/Cancel` or upstream abort). Cancels against a still-queued message do **not** broadcast this event — check `Message/Detail` for those. Emits at most once. |

## Message Format

Every WebSocket frame is a JSON object. All **agent lifecycle frames** (`agent_subscribed` / `agent_start` / `agent_output` / `agent_end` / `agent_error` / `agent_cancel`) share this base shape:

```json
{
  "type": "agent_output",
  "agenttoken": "aB3xK9mR2pLqWzVn7tYhCd5sFgJkNb",
  "message": { ... },
  "result": true
}
```

| Field | Type | Description |
|---|---|---|
| `type` | string | Event name. See [Event Types](#event-types) for the full list. |
| `agenttoken` | string | The token you subscribed with. Present on every agent lifecycle frame so multi-token subscribers can route the event to the right session. |
| `message` | varies | Empty string (`""`) for `agent_start`, a `progressGenerate` object for `agent_output` / `agent_end` (and for the object-shaped `agent_error`), and a plain string for string-shaped `agent_error` and `agent_cancel`. |
| `result` | boolean | `true` for success-side events (`agent_subscribed` / `agent_start` / `agent_output` / `agent_end`), `false` for failure-side events (`agent_error` / `agent_cancel`). See [The `result` field](#the-result-field). |

The **control frames** (`connected`, `error`) use a different shape with no `agenttoken`:

```json
// Welcome — one per connection
{ "type": "connected", "version": "1.0" }

// Subscribe rejection — stays connected, just indicates the last agent_info was malformed
{ "type": "error", "message": "agenttoken-required", "result": false }
```

The `agent_subscribed` frame additionally carries `status` (the DB row's current status) and, when the token is known, `debugoutput` (accumulated text so far). When the token is unknown, `status` is `"unknown"` and `debugoutput` is omitted entirely.

### agent_subscribed

Sent immediately after the server accepts your subscription. The `status` field reflects where the agent currently is in its lifecycle.

- If the agenttoken is **valid and pending/active** (known to the server, not yet finished), `debugoutput` is always present — an empty string `""` if nothing has streamed yet, or the accumulated text so far.
- If the agenttoken is **unknown** (typo, expired, already cleaned up from the buffer), `debugoutput` is **omitted entirely** from the payload (no field at all). Always use `"debugoutput" in payload` or `payload.debugoutput !== undefined` to distinguish unknown-token from empty-output, rather than relying on truthiness.

**Valid token, queued** — `debugoutput` present and empty:

```json
{
  "type": "agent_subscribed",
  "agenttoken": "aB3xK9mR2pLqWzVn7tYhCd5sFgJkNb",
  "status": "agent_queue",
  "debugoutput": "",
  "result": true
}
```

**Unknown token** — `status` is `"unknown"` and no `debugoutput` field:

```json
{
  "type": "agent_subscribed",
  "agenttoken": "wrongtoken123",
  "status": "unknown",
  "result": true
}
```

Possible `status` values:

| Status | Meaning |
|---|---|
| `agent_queue` | Message is queued, waiting for the agent to pick it up. |
| `agent_start` | Agent has started processing. |
| `agent_output` | Agent is actively streaming. `debugoutput` will contain accumulated text. |
| `agent_end` | Agent already finished. `debugoutput` contains the complete response. |
| `agent_error` | Agent encountered an error. `debugoutput` may contain partial output. |
| `agent_cancel` | Message was cancelled. `debugoutput` may contain partial output. |
| `unknown` | Status could not be determined. Treat as an error. |

### agent_start

Signals that the agent has begun generating a response. The `message` field is an empty string:

```json
{
  "type": "agent_start",
  "agenttoken": "aB3xK9mR2pLqWzVn7tYhCd5sFgJkNb",
  "message": "",
  "result": true
}
```

### agent_output (streaming)

Emitted multiple times as the agent generates its response. Each event contains the **full accumulated text** up to that point (not just the delta), along with real-time performance metrics:

```json
{
  "type": "agent_output",
  "agenttoken": "aB3xK9mR2pLqWzVn7tYhCd5sFgJkNb",
  "message": {
    "type": "progressGenerate",
    "task": "Generate",
    "speed": "12.5",
    "speedType": "words/s",
    "elapsedTime": "2.4s",
    "tokenCount": 35,
    "wordCount": 28,
    "raw": "Here is the accumulated response text so far...",
    "thinking": [],
    "answer": ["Here is the accumulated response text so far..."],
    "isThinking": false
  },
  "result": true
}
```

The `raw` field contains the full response as a single string. The `answer` array contains the same text split into segments. To display streaming text, replace your UI content with `raw` (or join `answer`) on each event.

### agent_end

Fires when the agent finishes responding. The structure is identical to `agent_output` — the `message` contains the final complete text with total metrics:

```json
{
  "type": "agent_end",
  "agenttoken": "aB3xK9mR2pLqWzVn7tYhCd5sFgJkNb",
  "message": {
    "type": "progressGenerate",
    "task": "Generate",
    "speed": "14.2",
    "speedType": "words/s",
    "elapsedTime": "8.1s",
    "tokenCount": 156,
    "wordCount": 118,
    "raw": "The complete agent response text...",
    "thinking": [],
    "answer": ["The complete agent response text..."],
    "isThinking": false
  },
  "result": true
}
```

### agent_error

An error occurred during processing. The `message` field can take two forms — a **sanitized string** when the stream is aborted by an exception, or a **progress object** when the stream finished naturally but the model returned a non-response.

**Sanitized string error** — any exception during streaming (bridge timeout, upstream HTTP 5xx, worker crash, SSE read error, etc.) surfaces as a single user-safe sentence:

```json
{
  "type": "agent_error",
  "agenttoken": "aB3xK9mR2pLqWzVn7tYhCd5sFgJkNb",
  "message": "Agent is temporarily unavailable. Please try again shortly.",
  "result": false
}
```

> **The raw runtime error is never broadcast over WebSocket.** Strings like `"Bridge timeout"`, `"OpenClaw returned HTTP 500"`, `"SSE request timeout (30min)"`, `"Could not resolve agent endpoint"` are recorded in the database `debugoutput` field (retrievable via `POST /UserAgent/Message/Detail`) but **replaced with the generic sentence above** before being pushed to subscribed clients. This is intentional so end users never see internal infrastructure errors. Log the raw string from `Message/Detail`; show the sanitized string from the WebSocket event.

**Progress-object error** — the SSE stream completes normally but the model returns `"..."` or `"Error: internal error"`. In that case Wiro flags the message as `agent_error` and broadcasts the same `progressGenerate` shape as `agent_output` / `agent_end`, so the client can render the non-response to the user:

```json
{
  "type": "agent_error",
  "agenttoken": "aB3xK9mR2pLqWzVn7tYhCd5sFgJkNb",
  "message": {
    "type": "progressGenerate",
    "task": "Generate",
    "speed": "2.5",
    "speedType": "words/s",
    "elapsedTime": "1.2s",
    "tokenCount": 3,
    "wordCount": 1,
    "raw": "...",
    "thinking": [],
    "answer": ["..."],
    "isThinking": false
  },
  "result": false
}
```

Check the runtime type of `message` to branch:

```javascript
if (msg.type === 'agent_error') {
  if (typeof msg.message === 'string') {
    showToast(msg.message)
  } else {
    renderResponse(msg.message.raw)
  }
}
```

### agent_cancel

Sent when the user cancels a message before the agent completes its response (only when the abort hits the bridge mid-flight — queued-state cancels don't broadcast this event):

```json
{
  "type": "agent_cancel",
  "agenttoken": "aB3xK9mR2pLqWzVn7tYhCd5sFgJkNb",
  "message": "AbortError",
  "result": false
}
```

> The `message` field carries the abort reason from the runtime (typically `"AbortError"` or a short technical string). It is **not a fixed user-facing message** — do not parse it for exact strings; use `type === "agent_cancel"` as the signal. Subscribers that cancel from a queued state will receive no event at all (the message is simply marked `agent_cancel` in the database; check with `POST /UserAgent/Message/Detail`).

## The `result` Field

Every agent lifecycle event includes a `result` boolean:

| Value | Events |
|---|---|
| `true` | `agent_subscribed`, `agent_start`, `agent_output`, `agent_end` |
| `false` | `error`, `agent_error`, `agent_cancel` |

Use `result` to quickly determine whether the event represents a successful state. When `result` is `false`, inspect `message` for error details or cancellation context. The welcome `connected` frame has no `result` field — it's a one-shot ack and always implies success (you got the frame, so the upgrade worked).

## Streaming Metrics

Each `agent_output` and `agent_end` event includes real-time performance data in the `message` object:

| Field | Type | Description |
|---|---|---|
| `speed` | string | Current generation speed (e.g. `"12.5"`). |
| `speedType` | string | Speed unit — always `"words/s"` for agent responses. |
| `elapsedTime` | string | Wall-clock time since the stream started (e.g. `"2.4s"`). |
| `tokenCount` | number | Total tokens generated so far. |
| `wordCount` | number | Total words in the accumulated response. |

These metrics update with every `agent_output` event, allowing you to display a live speed indicator or progress bar in your UI.

## Thinking Model Support

When the agent is backed by a thinking-capable model (e.g. DeepSeek-R1, QwQ), the response may include thinking blocks alongside the answer:

```json
{
  "type": "agent_output",
  "agenttoken": "aB3xK9mR2pLqWzVn7tYhCd5sFgJkNb",
  "message": {
    "type": "progressGenerate",
    "task": "Generate",
    "speed": "8.3",
    "speedType": "words/s",
    "elapsedTime": "4.1s",
    "tokenCount": 89,
    "wordCount": 64,
    "raw": "<think>Let me work through this step by step...</think>Based on my analysis...",
    "thinking": ["Let me work through this step by step..."],
    "answer": ["Based on my analysis..."],
    "isThinking": true
  },
  "result": true
}
```

| Field | Description |
|---|---|
| `isThinking` | `true` while the model is in a thinking phase, `false` when emitting the answer. |
| `thinking` | Array of thinking block text segments. Empty if the model does not use thinking. |
| `answer` | Array of answer text segments. This is the user-facing response. |
| `raw` | The unprocessed output including `<think>` tags. Use `thinking` and `answer` instead for display. |

**Rendering guidance:**

- While `isThinking` is `true`, show a "Thinking..." indicator or render the `thinking` text in a collapsible block.
- When `isThinking` becomes `false`, the model has finished reasoning and is now producing the answer.
- On `agent_end`, join the `answer` array for the final display text.

## Full Integration Example

A typical integration follows this pattern: call the REST API to send a message, then subscribe via WebSocket to stream the response.

**Step 1 — Send a message via REST:**

```bash
curl -X POST https://api.wiro.ai/v1/UserAgent/Message/Send \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "message": "Explain quantum computing in simple terms",
    "sessionkey": "user-42"
  }'
```

The response includes an `agenttoken`:

```json
{
  "result": true,
  "errors": [],
  "messageguid": "c3d4e5f6-a7b8-9012-cdef-345678901234",
  "agenttoken": "aB3xK9mR2pLqWzVn7tYhCd5sFgJkNb",
  "status": "agent_queue"
}
```

**Step 2 — Subscribe via WebSocket:**

```javascript
const ws = new WebSocket('wss://socket.wiro.ai/v1');

ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'agent_info',
    agenttoken: 'aB3xK9mR2pLqWzVn7tYhCd5sFgJkNb'
  }));
};
```

**Step 3 — Handle streaming events:**

```
←  connected         { version: "1.0" }
→  agent_info        { agenttoken: "..." }
←  agent_subscribed  { status: "agent_queue", debugoutput: "" }
←  agent_start       { message: "" }
←  agent_output      { message: { raw: "Quantum", wordCount: 1 } }
←  agent_output      { message: { raw: "Quantum computing uses", wordCount: 3 } }
←  agent_output      { message: { raw: "Quantum computing uses qubits...", wordCount: 28 } }
←  agent_end         { message: { raw: "Quantum computing uses qubits that...", wordCount: 118 } }
```

`←` = server → client, `→` = client → server. Each `agent_output` contains the full accumulated text. Replace (don't append) your display content on each event.

## Code Examples

### JavaScript

```javascript
const agentToken = 'your-agent-token';

const ws = new WebSocket('wss://socket.wiro.ai/v1');

ws.onopen = () => {
  console.log('Connected');
  ws.send(JSON.stringify({
    type: 'agent_info',
    agenttoken: agentToken
  }));
};

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);

  switch (msg.type) {
    case 'connected':
      // One-shot welcome frame from server. OK to ignore.
      break;

    case 'error':
      // Subscribe shape rejected (e.g. missing agenttoken).
      console.error('Subscribe error:', msg.message);
      ws.close();
      break;

    case 'agent_subscribed':
      if (msg.status === 'unknown') {
        console.error('Unknown token:', msg.agenttoken);
        ws.close();
      } else if (['agent_end', 'agent_error', 'agent_cancel'].includes(msg.status)) {
        // We subscribed late — the agent already finished.
        console.log('Already finished. Snapshot:', msg.debugoutput);
        ws.close();
      }
      break;

    case 'agent_start':
      console.log('Agent started generating');
      break;

    case 'agent_output':
      // message is a progressGenerate object; replace (don't append) your UI.
      console.log('Streaming:', msg.message.raw);
      break;

    case 'agent_end':
      console.log('Final:', msg.message.raw);
      ws.close();
      break;

    case 'agent_error':
      // message is either a sanitized string or a progressGenerate object.
      if (typeof msg.message === 'string') console.error('Error:', msg.message);
      else console.error('Non-response:', msg.message.raw);
      ws.close();
      break;

    case 'agent_cancel':
      console.warn('Cancelled:', msg.message);
      ws.close();
      break;
  }
};

ws.onerror = (err) => console.error('WebSocket error:', err);
ws.onclose = () => console.log('Disconnected');
```

### Python

```python
import asyncio
import websockets
import json

async def listen_agent(agent_token):
    uri = "wss://socket.wiro.ai/v1"

    async with websockets.connect(uri) as ws:
        await ws.send(json.dumps({
            "type": "agent_info",
            "agenttoken": agent_token
        }))
        print("Subscribed to agent session")

        async for message in ws:
            msg = json.loads(message)
            print(f"Event: {msg['type']}")

            if msg["type"] == "agent_output":
                print("Streaming:", msg["message"].get("raw"))
            elif msg["type"] == "agent_end":
                print("Final:", msg["message"].get("raw"))
                break
            elif msg["type"] in ("agent_error", "agent_cancel"):
                print("Error:", msg.get("message"))
                break

asyncio.run(listen_agent("your-agent-token"))
```

### Node.js

```javascript
const WebSocket = require('ws');

const ws = new WebSocket('wss://socket.wiro.ai/v1');

ws.on('open', () => {
  ws.send(JSON.stringify({
    type: 'agent_info',
    agenttoken: 'your-agent-token'
  }));
});

ws.on('message', (data) => {
  const msg = JSON.parse(data.toString());
  console.log('Event:', msg.type);

  if (msg.type === 'agent_output') {
    console.log('Streaming:', msg.message?.raw);
  }
  if (msg.type === 'agent_end') {
    console.log('Final:', msg.message?.raw);
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
    "type" => "agent_info",
    "agenttoken" => "your-agent-token"
]));

while (true) {
    $msg = json_decode($client->receive(), true);
    echo "Event: " . $msg["type"] . PHP_EOL;

    if ($msg["type"] === "agent_output") {
        echo "Streaming: " . ($msg["message"]["raw"] ?? "") . PHP_EOL;
    }
    if ($msg["type"] === "agent_end") {
        echo "Final: " . ($msg["message"]["raw"] ?? "") . PHP_EOL;
        break;
    }
}
$client->close();
```

### C\#

```csharp
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;

using var ws = new ClientWebSocket();
await ws.ConnectAsync(
    new Uri("wss://socket.wiro.ai/v1"),
    CancellationToken.None);

var subscribe = JsonSerializer.Serialize(new {
    type = "agent_info",
    agenttoken = "your-agent-token"
});
await ws.SendAsync(
    Encoding.UTF8.GetBytes(subscribe),
    WebSocketMessageType.Text, true,
    CancellationToken.None);

var buffer = new byte[8192];
while (ws.State == WebSocketState.Open) {
    var result = await ws.ReceiveAsync(
        buffer, CancellationToken.None);
    var json = Encoding.UTF8.GetString(
        buffer, 0, result.Count);
    using var doc = JsonDocument.Parse(json);
    var type = doc.RootElement
        .GetProperty("type").GetString();
    Console.WriteLine("Event: " + type);

    if (type == "agent_end") {
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

    sub, _ := json.Marshal(map[string]string{
        "type":       "agent_info",
        "agenttoken": "your-agent-token",
    })
    conn.WriteMessage(websocket.TextMessage, sub)

    for {
        _, message, err := conn.ReadMessage()
        if err != nil { break }
        var msg map[string]interface{}
        json.Unmarshal(message, &msg)
        fmt.Println("Event:", msg["type"])

        if msg["type"] == "agent_end" {
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

let subData = try! JSONSerialization.data(
    withJSONObject: [
        "type": "agent_info",
        "agenttoken": "your-agent-token"
    ])
task.send(.string(
    String(data: subData, encoding: .utf8)!
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
                if msg["type"] as? String == "agent_end" {
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
            "type" to "agent_info",
            "agenttoken" to "your-agent-token"
        )).toString())
    }
    override fun onMessage(message: String) {
        val msg = JSONObject(message)
        println("Event: " + msg.getString("type"))
        if (msg.getString("type") == "agent_end") {
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
  'type': 'agent_info',
  'agenttoken': 'your-agent-token',
}));

channel.stream.listen((message) {
  final msg = jsonDecode(message);
  print('Event: ' + msg['type'].toString());
  if (msg['type'] == 'agent_output') {
    print('Streaming: ' + (msg['message']?['raw'] ?? ''));
  }
  if (msg['type'] == 'agent_end') {
    print('Done!');
    channel.sink.close();
  }
});
```

## Quick Reference

**`connected` — welcome frame** (server → client, sent once on upgrade):

```json
{
  "type": "connected",
  "version": "1.0"
}
```

**Subscribe frame** (client → server):

```json
{
  "type": "agent_info",
  "agenttoken": "aB3xK9..."
}
```

**`error` — malformed subscribe** (server → client, sent when `agent_info` is missing `agenttoken`):

```json
{
  "type": "error",
  "message": "agenttoken-required",
  "result": false
}
```

**`agent_subscribed` — valid token** (empty `debugoutput`):

```json
{
  "type": "agent_subscribed",
  "agenttoken": "aB3xK9...",
  "status": "agent_queue",
  "debugoutput": "",
  "result": true
}
```

**`agent_subscribed` — unknown token** (`status: "unknown"`, no `debugoutput`):

```json
{
  "type": "agent_subscribed",
  "agenttoken": "wrongtoken",
  "status": "unknown",
  "result": true
}
```

**`agent_start`:**

```json
{
  "type": "agent_start",
  "agenttoken": "aB3xK9...",
  "message": "",
  "result": true
}
```

**`agent_output`** — streaming partials, emitted multiple times:

```json
{
  "type": "agent_output",
  "agenttoken": "aB3xK9...",
  "message": {
    "raw": "Accumulated text...",
    "speed": "12.5",
    "wordCount": 28
  },
  "result": true
}
```

**`agent_end`** — final response:

```json
{
  "type": "agent_end",
  "agenttoken": "aB3xK9...",
  "message": {
    "raw": "Complete response...",
    "speed": "14.2",
    "wordCount": 118
  },
  "result": true
}
```

**`agent_error`** — sanitized string (any exception during streaming):

```json
{
  "type": "agent_error",
  "agenttoken": "aB3xK9...",
  "message": "Agent is temporarily unavailable. Please try again shortly.",
  "result": false
}
```

**`agent_cancel`** — active-processing abort only; queued-state cancels don't broadcast:

```json
{
  "type": "agent_cancel",
  "agenttoken": "aB3xK9...",
  "message": "AbortError",
  "result": false
}
```

## Connection Keep-Alive

The Wiro WebSocket server sends a ping every **30 seconds** to keep the connection alive. Most standard WebSocket client libraries respond to pings automatically; if your client implements a custom frame handler, make sure it sends a pong within a few seconds of each ping or the server will drop the connection. After `agent_end` / `agent_error` / `agent_cancel`, you can close the socket safely — no more events will be sent for that `agenttoken`.

## Reconnection & Recovery

The agent keeps running server-side **regardless of whether any client is subscribed**. A disconnected socket never cancels the agent. This means a dropped connection is always recoverable — just reconnect and re-subscribe with the same `agenttoken`.

### Recovery flow

1. **Detect disconnect** — `ws.onclose` / stream exception / ping timeout.
2. **Reconnect** — open a new WebSocket to `wss://socket.wiro.ai/v1`.
3. **Wait for welcome** — receive `{ "type": "connected", "version": "1.0" }` (optional but clean).
4. **Re-subscribe** — send `{ "type": "agent_info", "agenttoken": "..." }` with the same token.
5. **Handle `agent_subscribed`** — the server reports the **current** status. Three cases:
   - `status` is `agent_queue` / `agent_start` / `agent_output` → stream is still live; accumulated text so far is in `debugoutput`. Future events will be forwarded normally.
   - `status` is `agent_end` → the agent already finished. `debugoutput` holds the full final response. **No further WebSocket events will fire.** Fetch `POST /UserAgent/Message/Detail` for the canonical record (including `metadata`, `attachments`, `endedat`), then close the socket.
   - `status` is `agent_error` / `agent_cancel` → the agent already failed / was cancelled. `debugoutput` may contain partial output. No further events. Fetch `POST /UserAgent/Message/Detail` for the persisted error details.

On reconnect you do **not** receive replays of the past `agent_output` frames — only events emitted after re-subscribe. Use the `debugoutput` on `agent_subscribed` as the snapshot of what you missed.

### Example retry strategy

```javascript
const MAX_BACKOFF_MS = 30000
let backoff = 1000

function connect(agenttoken, onStreamingChunk, onFinal, onFailure) {
  const ws = new WebSocket('wss://socket.wiro.ai/v1')
  let finished = false

  ws.onopen = () => {
    backoff = 1000
    ws.send(JSON.stringify({ type: 'agent_info', agenttoken }))
  }

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data)
    if (msg.type === 'connected') return

    if (msg.type === 'agent_subscribed') {
      if (msg.status === 'unknown') {
        finished = true
        onFailure({ reason: 'unknown-token' })
        ws.close()
        return
      }
      if (['agent_end', 'agent_error', 'agent_cancel'].includes(msg.status)) {
        finished = true
        onFinal(msg.debugoutput || '')
        ws.close()
      }
      return
    }

    if (msg.type === 'agent_output') onStreamingChunk(msg.message)
    if (msg.type === 'agent_end') {
      finished = true
      onFinal(msg.message.raw)
      ws.close()
    }
    if (['agent_error', 'agent_cancel'].includes(msg.type)) {
      finished = true
      onFailure({ reason: msg.type, message: msg.message })
      ws.close()
    }
  }

  ws.onclose = () => {
    if (finished) return
    setTimeout(() => connect(agenttoken, onStreamingChunk, onFinal, onFailure), backoff)
    backoff = Math.min(backoff * 2, MAX_BACKOFF_MS)
  }
}
```

Guidance:

- **Exponential backoff**, capped at 30 seconds. The server is usually responsive, so don't hammer it.
- **Stop retrying once you hit a terminal event** (`agent_end` / `agent_error` / `agent_cancel`) or an `unknown` status — the work is either done or the token is gone.
- **Idempotent re-subscribe**: sending the same `agenttoken` again on a fresh socket is always safe.
- **Fall back to polling** if WebSocket is blocked (strict corporate proxies, mobile cellular with long-poll fallbacks). Use `POST /UserAgent/Message/Detail` at 1–2 second intervals until `status` is terminal.

## Token Lifecycle

An `agenttoken` is issued per message by `POST /UserAgent/Message/Send` and stays addressable on the WebSocket for as long as the underlying `agentmessages` row exists (Wiro does not auto-purge rows on a short timer; tokens remain queryable indefinitely after the run ends).

| Event | Effect on token |
|---|---|
| `Message/Send` | Token is minted, row is inserted with `status: "agent_queue"`, broadcast to all queue subscribers. |
| Worker picks up | Emits `agent_start` to every active subscriber. |
| Each SSE chunk | Emits `agent_output` to every active subscriber (with full accumulated `raw`). |
| Stream finishes | Emits `agent_end` (or `agent_error` for `"..."` / internal-error content) with final `progressGenerate` payload; DB row status is updated to terminal. |
| Bridge exception | Emits `agent_error` with sanitized string; DB row status → `agent_error`, raw error in `debugoutput`. |
| `Message/Cancel` during active stream | Bridge aborts, emits `agent_cancel`; DB row status → `agent_cancel`. |
| `Message/Cancel` while queued | DB row status → `agent_cancel` immediately. **No WebSocket event is broadcast** (the bridge never started). Clients checking via the socket must consult `Message/Detail` for queued-state cancels. |

**Multi-subscriber semantics**: multiple WebSocket connections can subscribe to the same `agenttoken` and all receive the same event stream in parallel. The server does not enforce a subscriber limit per token. This is how the Wiro Dashboard shows the same agent chat on multiple tabs for the same user — each tab opens its own socket and subscribes independently.

**Cross-user subscription**: the `agenttoken` alone authenticates subscription — if you leak a token to another user, they can read the stream. Treat tokens like short-lived secrets scoped to the message.
