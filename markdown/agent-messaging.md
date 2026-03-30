# Agent Messaging

Send messages to AI agents and receive streaming responses in real time.

## How It Works

Agent messaging follows the same async pattern as [model runs](/docs/run-a-model):

1. **Send** a message via REST → get an `agenttoken` immediately
2. **Subscribe** to [WebSocket](/docs/websocket) with the `agenttoken` → receive streaming response chunks
3. **Or poll** via the Detail endpoint to check status and fetch the completed response
4. **Or set** a `callbackurl` to receive a webhook notification when the agent finishes

This decoupled design means your application never blocks waiting for the agent to think. Send the message, hand the `agenttoken` to your frontend, and stream the response as it arrives.

## Message Lifecycle

Every agent message progresses through a defined set of stages:

`agent_queue` → `agent_start` → `agent_output` → `agent_end`

| Status | Description |
|--------|-------------|
| `agent_queue` | The message is queued and waiting to be picked up by the agent worker. Emitted once when the message enters the queue. |
| `agent_start` | The agent has accepted the message and begun processing. The underlying LLM call is being prepared. |
| `agent_output` | The agent is producing output. This event is emitted **multiple times** — each chunk of the response arrives as a separate `agent_output` event via WebSocket, enabling real-time streaming. |
| `agent_end` | The agent has finished generating the response. The full output is available in the `response` and `debugoutput` fields. **This is the event you should listen for** to get the final result. |
| `agent_error` | The agent encountered an error during processing. The `debugoutput` field contains the error message. |
| `agent_cancel` | The message was cancelled by the user before completion. Only messages in `agent_queue`, `agent_start`, or `agent_output` status can be cancelled. |

## **POST** /UserAgent/Message/Send

Sends a user message to a deployed agent. The agent must be in running state (status `4`). Returns immediately with an `agenttoken` that you use to track the response via WebSocket, polling, or webhook.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | The agent instance GUID (from Deploy or MyAgents). |
| `message` | string | Yes | The user message text to send to the agent. |
| `sessionkey` | string | No | Session identifier for conversation continuity. Defaults to `"default"`. |
| `callbackurl` | string | No | Webhook URL — the system will POST the final response to this URL when the agent finishes. |

### Response

```json
{
  "result": true,
  "errors": [],
  "messageguid": "c3d4e5f6-a7b8-9012-cdef-345678901234",
  "agenttoken": "aB3xK9mR2pLqWzVn7tYhCd5sFgJkNb",
  "status": "agent_queue"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `messageguid` | `string` | Unique identifier for this message. Use it with Detail, History, or Cancel. |
| `agenttoken` | `string` | Token for WebSocket subscription and polling. Equivalent to `tasktoken` in model runs. |
| `status` | `string` | Initial status — always `"agent_queue"` on success. |

## **POST** /UserAgent/Message/Detail

Retrieves the current status and content of a single message. You can query by either `messageguid` or `agenttoken`.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `messageguid` | string | No | The message GUID returned from Send. |
| `agenttoken` | string | No | The agent token returned from Send (alternative to messageguid). |

> **Note:** You must provide at least one of `messageguid` or `agenttoken`.

### Response

```json
{
  "result": true,
  "errors": [],
  "data": {
    "guid": "c3d4e5f6-a7b8-9012-cdef-345678901234",
    "sessionkey": "default",
    "content": "What are the latest trends in AI?",
    "response": "Here are the key AI trends for 2026...",
    "debugoutput": "Here are the key AI trends for 2026...",
    "status": "agent_end",
    "metadata": "{\"thinking\":[],\"answer\":[\"Here are the key AI trends for 2026...\"],\"raw\":\"Here are the key AI trends for 2026...\"}",
    "createdat": "1743350400",
    "startedat": "1743350401",
    "endedat": "1743350408"
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `guid` | `string` | Message GUID. |
| `sessionkey` | `string` | The session this message belongs to. |
| `content` | `string` | The original user message. |
| `response` | `string` | The agent's full response text. Empty until `agent_end`. |
| `debugoutput` | `string` | Accumulated output text. Updated during streaming, contains the full response after completion. |
| `status` | `string` | Current message status (see Message Lifecycle). |
| `metadata` | `string` | JSON string containing structured response data — `thinking`, `answer`, `raw`, speed metrics, and token/word counts. |
| `createdat` | `string` | Unix timestamp when the message was created. |
| `startedat` | `string` | Unix timestamp when the agent started processing. |
| `endedat` | `string` | Unix timestamp when processing completed. |

## **POST** /UserAgent/Message/History

Retrieves conversation history for a specific agent and session. Messages are returned **newest-first** with cursor-based pagination.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | The agent instance GUID. |
| `sessionkey` | string | No | Session identifier. Defaults to `"default"`. |
| `limit` | number | No | Maximum number of messages to return. Defaults to `50`, max `200`. |
| `before` | string | No | Message GUID to use as cursor — returns only messages created before this one. Omit for the most recent messages. |

### Response

```json
{
  "result": true,
  "errors": [],
  "data": {
    "messages": [
      {
        "guid": "c3d4e5f6-a7b8-9012-cdef-345678901234",
        "content": "What are the latest trends in AI?",
        "response": "Here are the key AI trends for 2026...",
        "debugoutput": "Here are the key AI trends for 2026...",
        "status": "agent_end",
        "metadata": "{}",
        "createdat": "1743350400"
      },
      {
        "guid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "content": "Tell me more about multimodal models",
        "response": "Multimodal models combine...",
        "debugoutput": "Multimodal models combine...",
        "status": "agent_end",
        "metadata": "{}",
        "createdat": "1743350300"
      }
    ],
    "count": 2,
    "hasmore": false
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `messages` | `array` | Array of message objects, newest first. |
| `count` | `number` | Number of messages in this page. |
| `hasmore` | `boolean` | `true` if there are older messages available. Pass the last message's `guid` as `before` to fetch the next page. |

### Pagination

To paginate through a long conversation:

```
// Page 1: most recent messages
POST /UserAgent/Message/History { "useragentguid": "...", "limit": 50 }

// Page 2: pass the last message's guid as cursor
POST /UserAgent/Message/History { "useragentguid": "...", "limit": 50, "before": "a1b2c3d4-..." }
```

## **POST** /UserAgent/Message/Sessions

Lists all conversation sessions for an agent. Returns each session's key, message count, last activity time, and the most recent message content.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | The agent instance GUID. |

### Response

```json
{
  "result": true,
  "errors": [],
  "data": {
    "sessions": [
      {
        "sessionkey": "default",
        "messagecount": "24",
        "updatedat": "1743350400",
        "lastmessage": "What are the latest trends in AI?"
      },
      {
        "sessionkey": "user-42-support",
        "messagecount": "8",
        "updatedat": "1743349200",
        "lastmessage": "How do I reset my password?"
      }
    ]
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `sessionkey` | `string` | The session identifier. |
| `messagecount` | `string` | Total number of messages in this session. |
| `updatedat` | `string` | Unix timestamp of the last activity in this session. |
| `lastmessage` | `string` | The content (user message) of the most recent message. |

## **POST** /UserAgent/Message/DeleteSession

Deletes a session and **all its messages** permanently. This action cannot be undone.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | The agent instance GUID. |
| `sessionkey` | string | Yes | The session key to delete. |

### Response

```json
{
  "result": true,
  "errors": []
}
```

## **POST** /UserAgent/Message/Cancel

Cancels an in-progress message. Only messages in `agent_queue`, `agent_start`, or `agent_output` status can be cancelled. Messages that have already reached `agent_end`, `agent_error`, or `agent_cancel` cannot be cancelled.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `messageguid` | string | No | The message GUID to cancel. |
| `agenttoken` | string | No | The agent token to cancel (alternative to messageguid). |

> **Note:** You must provide at least one of `messageguid` or `agenttoken`.

### Response

```json
{
  "result": true,
  "errors": []
}
```

On success, the message status changes to `agent_cancel` and all subscribed WebSocket clients receive an `agent_cancel` event.

## Session Management

Sessions let you maintain separate conversation threads with the same agent:

- Each `sessionkey` represents a separate conversation — the agent remembers context within a session
- The default session key is `"default"` if you don't specify one
- Use unique session keys per end-user for multi-tenant applications (e.g. `"user-42"`, `"customer-abc"`)
- Sessions persist across API calls — send the same `sessionkey` to continue a conversation
- Delete a session with `/UserAgent/Message/DeleteSession` to clear history and free resources

```json
// User A's conversation
{ "useragentguid": "...", "message": "Hello!", "sessionkey": "user-alice" }

// User B's separate conversation with the same agent
{ "useragentguid": "...", "message": "Hello!", "sessionkey": "user-bob" }
```

## Thinking & Answer Separation

Agent responses may include thinking blocks where the underlying model reasons through the problem before answering. The system automatically parses `<think>...</think>` tags and separates the output into structured arrays:

```json
{
  "thinking": ["Let me analyze the user's question...", "The key factors are..."],
  "answer": ["Based on my analysis, here are the main points..."],
  "isThinking": false,
  "raw": "<think>Let me analyze the user's question...</think>Based on my analysis, here are the main points..."
}
```

- `thinking` — array of reasoning/chain-of-thought blocks. May be empty if the model doesn't use thinking.
- `answer` — array of response chunks. This is the content to show the user.
- `isThinking` — `true` while the model is still in a thinking phase (the `<think>` tag is open but not yet closed), `false` during the answer phase.
- `raw` — the full accumulated raw output text including think tags.

Each `agent_output` WebSocket event contains the **full accumulated** arrays up to that point — not just the new chunk. Simply replace your displayed content with the latest arrays. Use `isThinking` to show a "thinking" indicator in your UI while the model reasons.

> **Tip:** Display thinking content in a collapsible section so users can optionally inspect the model's reasoning process.

## Tracking a Message

There are three ways to track message progress after sending:

### 1. WebSocket (Recommended)

Connect to WebSocket and subscribe with the `agenttoken` for real-time streaming. Each `agent_output` event delivers the growing response as it's generated.

```json
// Subscribe to agent message updates
{ "type": "agent_info", "agenttoken": "aB3xK9mR2pLqWzVn7tYhCd5sFgJkNb" }

// Server confirms subscription with current status
{ "type": "agent_subscribed", "agenttoken": "aB3xK9mR2pLqWzVn7tYhCd5sFgJkNb", "status": "agent_queue", "result": true }

// Streaming output event
{
  "type": "agent_output",
  "agenttoken": "aB3xK9mR2pLqWzVn7tYhCd5sFgJkNb",
  "message": {
    "type": "progressGenerate",
    "task": "Generate",
    "speed": "12.4",
    "speedType": "words/s",
    "elapsedTime": "3.2s",
    "tokenCount": 156,
    "wordCount": 42,
    "raw": "Here are the key AI trends...",
    "thinking": [],
    "answer": ["Here are the key AI trends..."],
    "isThinking": false
  },
  "result": true
}

// Final event
{
  "type": "agent_end",
  "agenttoken": "aB3xK9mR2pLqWzVn7tYhCd5sFgJkNb",
  "message": {
    "type": "progressGenerate",
    "task": "Generate",
    "speed": "14.2",
    "speedType": "words/s",
    "elapsedTime": "8.1s",
    "tokenCount": 412,
    "wordCount": 115,
    "raw": "Here are the key AI trends for 2026...",
    "thinking": [],
    "answer": ["Here are the key AI trends for 2026..."],
    "isThinking": false
  },
  "result": true
}
```

| Field | Type | Description |
|-------|------|-------------|
| `message.type` | `string` | Always `"progressGenerate"` for agent output events. |
| `message.speed` | `string` | Generation speed (e.g. `"12.4"`). |
| `message.speedType` | `string` | Unit for speed — `"words/s"` (words per second). |
| `message.elapsedTime` | `string` | Elapsed time since generation started (e.g. `"3.2s"`). |
| `message.tokenCount` | `number` | Number of tokens generated so far. |
| `message.wordCount` | `number` | Number of words generated so far. |
| `message.raw` | `string` | Full accumulated raw output text. |
| `message.thinking` | `string[]` | Array of thinking/reasoning blocks. |
| `message.answer` | `string[]` | Array of answer blocks — the content to display. |
| `message.isThinking` | `boolean` | `true` while the model is in thinking phase. |

### 2. Polling via Detail

If you don't need real-time streaming, poll `POST /UserAgent/Message/Detail` at regular intervals until the status reaches a terminal state (`agent_end`, `agent_error`, or `agent_cancel`):

```
POST /UserAgent/Message/Detail { "agenttoken": "aB3xK9mR2pLqWzVn7tYhCd5sFgJkNb" }
→ Check status field
→ If "agent_end": read response/debugoutput
→ If "agent_output": still generating, poll again
→ If "agent_error"/"agent_cancel": handle accordingly
```

### 3. Webhook Callback

Pass a `callbackurl` when sending the message. The system will POST the final result to your URL when the agent finishes (up to 3 retry attempts):

```json
// Webhook payload delivered to your callbackurl
{
  "messageguid": "c3d4e5f6-a7b8-9012-cdef-345678901234",
  "status": "agent_end",
  "content": "What are the latest trends in AI?",
  "response": "Here are the key AI trends for 2026...",
  "endedat": "1743350408"
}
```

## Code Examples

### curl (Send Message)

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Message/Send" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "message": "What are the latest trends in AI?",
    "sessionkey": "user-42"
  }'
```

### curl (Detail)

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Message/Detail" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{"agenttoken": "aB3xK9mR2pLqWzVn7tYhCd5sFgJkNb"}'
```

### curl (History)

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Message/History" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "sessionkey": "user-42",
    "limit": 50
  }'
```

### curl (Sessions / DeleteSession / Cancel)

```bash
# List sessions
curl -X POST "https://api.wiro.ai/v1/UserAgent/Message/Sessions" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{"useragentguid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"}'

# Delete a session
curl -X POST "https://api.wiro.ai/v1/UserAgent/Message/DeleteSession" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "sessionkey": "user-42"
  }'

# Cancel an in-progress message
curl -X POST "https://api.wiro.ai/v1/UserAgent/Message/Cancel" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{"agenttoken": "aB3xK9mR2pLqWzVn7tYhCd5sFgJkNb"}'
```

### Python

```python
import requests
import time

headers = {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
}

agent_guid = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"

# Send a message
send_resp = requests.post(
    "https://api.wiro.ai/v1/UserAgent/Message/Send",
    headers=headers,
    json={
        "useragentguid": agent_guid,
        "message": "What are the latest trends in AI?",
        "sessionkey": "user-42"
    }
)
send_data = send_resp.json()
agent_token = send_data["agenttoken"]
message_guid = send_data["messageguid"]
print(f"Message queued: {message_guid}")

# Poll until completion
while True:
    detail_resp = requests.post(
        "https://api.wiro.ai/v1/UserAgent/Message/Detail",
        headers=headers,
        json={"agenttoken": agent_token}
    )
    msg = detail_resp.json()["data"]
    status = msg["status"]
    print(f"Status: {status}")

    if status == "agent_end":
        print("Response:", msg["response"])
        break
    elif status in ("agent_error", "agent_cancel"):
        print("Failed or cancelled:", msg["debugoutput"])
        break

    time.sleep(2)

# Get conversation history
history_resp = requests.post(
    "https://api.wiro.ai/v1/UserAgent/Message/History",
    headers=headers,
    json={"useragentguid": agent_guid, "sessionkey": "user-42", "limit": 50}
)
messages = history_resp.json()["data"]["messages"]
for m in messages:
    print(f"[{m['status']}] {m['content'][:60]}...")

# List sessions
sessions_resp = requests.post(
    "https://api.wiro.ai/v1/UserAgent/Message/Sessions",
    headers=headers,
    json={"useragentguid": agent_guid}
)
for s in sessions_resp.json()["data"]["sessions"]:
    print(f"Session: {s['sessionkey']} ({s['messagecount']} messages)")

# Cancel an in-progress message
requests.post(
    "https://api.wiro.ai/v1/UserAgent/Message/Cancel",
    headers=headers,
    json={"agenttoken": agent_token}
)
```

### Node.js

```javascript
const axios = require('axios');

const headers = {
  'x-api-key': 'YOUR_API_KEY',
  'Content-Type': 'application/json'
};

const agentGuid = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

async function sendAndPoll() {
  // Send a message
  const sendResp = await axios.post(
    'https://api.wiro.ai/v1/UserAgent/Message/Send',
    {
      useragentguid: agentGuid,
      message: 'What are the latest trends in AI?',
      sessionkey: 'user-42'
    },
    { headers }
  );

  const { agenttoken, messageguid } = sendResp.data;
  console.log('Message queued:', messageguid);

  // Poll until completion
  while (true) {
    const detailResp = await axios.post(
      'https://api.wiro.ai/v1/UserAgent/Message/Detail',
      { agenttoken },
      { headers }
    );
    const { status, response, debugoutput } = detailResp.data.data;
    console.log('Status:', status);

    if (status === 'agent_end') {
      console.log('Response:', response);
      break;
    }
    if (status === 'agent_error' || status === 'agent_cancel') {
      console.log('Failed or cancelled:', debugoutput);
      break;
    }

    await new Promise(r => setTimeout(r, 2000));
  }
}

async function getHistory() {
  const resp = await axios.post(
    'https://api.wiro.ai/v1/UserAgent/Message/History',
    { useragentguid: agentGuid, sessionkey: 'user-42', limit: 50 },
    { headers }
  );
  const { messages, hasmore } = resp.data.data;
  messages.forEach(m => console.log(`[${m.status}] ${m.content.slice(0, 60)}...`));
  if (hasmore) console.log('More messages available — use "before" cursor to paginate');
}

async function manageSessions() {
  // List sessions
  const sessResp = await axios.post(
    'https://api.wiro.ai/v1/UserAgent/Message/Sessions',
    { useragentguid: agentGuid },
    { headers }
  );
  sessResp.data.data.sessions.forEach(s =>
    console.log(`Session: ${s.sessionkey} (${s.messagecount} messages)`)
  );

  // Delete a session
  await axios.post(
    'https://api.wiro.ai/v1/UserAgent/Message/DeleteSession',
    { useragentguid: agentGuid, sessionkey: 'old-session' },
    { headers }
  );
}

// Cancel an in-progress message
async function cancelMessage(agenttoken) {
  await axios.post(
    'https://api.wiro.ai/v1/UserAgent/Message/Cancel',
    { agenttoken },
    { headers }
  );
}
```

### PHP

```php
<?php
$headers = [
    "Content-Type: application/json",
    "x-api-key: YOUR_API_KEY"
];

$agentGuid = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

// Send a message
$ch = curl_init("https://api.wiro.ai/v1/UserAgent/Message/Send");
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
    "useragentguid" => $agentGuid,
    "message" => "What are the latest trends in AI?",
    "sessionkey" => "user-42"
]));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$response = json_decode(curl_exec($ch), true);
curl_close($ch);

$agentToken = $response["agenttoken"];

// Poll for result
do {
    sleep(2);
    $ch = curl_init("https://api.wiro.ai/v1/UserAgent/Message/Detail");
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(["agenttoken" => $agentToken]));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    $detail = json_decode(curl_exec($ch), true);
    curl_close($ch);

    $status = $detail["data"]["status"];
} while (!in_array($status, ["agent_end", "agent_error", "agent_cancel"]));

echo $detail["data"]["response"];
```

### C#

```csharp
using var client = new HttpClient();
client.DefaultRequestHeaders.Add("x-api-key", "YOUR_API_KEY");

var agentGuid = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

// Send a message
var sendContent = new StringContent(
    JsonSerializer.Serialize(new {
        useragentguid = agentGuid,
        message = "What are the latest trends in AI?",
        sessionkey = "user-42"
    }),
    Encoding.UTF8, "application/json");

var sendResponse = await client.PostAsync(
    "https://api.wiro.ai/v1/UserAgent/Message/Send", sendContent);
var sendResult = JsonSerializer.Deserialize<JsonElement>(
    await sendResponse.Content.ReadAsStringAsync());
var agentToken = sendResult.GetProperty("agenttoken").GetString();

// Poll for result
while (true) {
    await Task.Delay(2000);
    var detailContent = new StringContent(
        JsonSerializer.Serialize(new { agenttoken = agentToken }),
        Encoding.UTF8, "application/json");
    var detailResponse = await client.PostAsync(
        "https://api.wiro.ai/v1/UserAgent/Message/Detail", detailContent);
    var detail = JsonSerializer.Deserialize<JsonElement>(
        await detailResponse.Content.ReadAsStringAsync());
    var status = detail.GetProperty("data").GetProperty("status").GetString();

    if (status == "agent_end") {
        Console.WriteLine(detail.GetProperty("data").GetProperty("response").GetString());
        break;
    }
    if (status is "agent_error" or "agent_cancel") break;
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

func main() {
    agentGuid := "a1b2c3d4-e5f6-7890-abcd-ef1234567890"

    // Send a message
    sendBody, _ := json.Marshal(map[string]string{
        "useragentguid": agentGuid,
        "message":       "What are the latest trends in AI?",
        "sessionkey":    "user-42",
    })
    req, _ := http.NewRequest("POST",
        "https://api.wiro.ai/v1/UserAgent/Message/Send",
        bytes.NewBuffer(sendBody))
    req.Header.Set("Content-Type", "application/json")
    req.Header.Set("x-api-key", "YOUR_API_KEY")

    resp, _ := http.DefaultClient.Do(req)
    defer resp.Body.Close()
    var sendResult map[string]interface{}
    json.NewDecoder(resp.Body).Decode(&sendResult)
    agentToken := sendResult["agenttoken"].(string)

    // Poll for result
    for {
        time.Sleep(2 * time.Second)
        detailBody, _ := json.Marshal(map[string]string{
            "agenttoken": agentToken,
        })
        req, _ := http.NewRequest("POST",
            "https://api.wiro.ai/v1/UserAgent/Message/Detail",
            bytes.NewBuffer(detailBody))
        req.Header.Set("Content-Type", "application/json")
        req.Header.Set("x-api-key", "YOUR_API_KEY")

        resp, _ := http.DefaultClient.Do(req)
        body, _ := io.ReadAll(resp.Body)
        resp.Body.Close()

        var detail map[string]interface{}
        json.Unmarshal(body, &detail)
        data := detail["data"].(map[string]interface{})
        status := data["status"].(string)

        if status == "agent_end" {
            fmt.Println(data["response"])
            break
        }
        if status == "agent_error" || status == "agent_cancel" {
            fmt.Println("Failed:", data["debugoutput"])
            break
        }
    }
}
```
