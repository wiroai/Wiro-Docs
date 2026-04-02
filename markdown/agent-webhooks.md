# Agent Webhooks

Receive agent response notifications via HTTP callbacks.

## How It Works

When you send a message to an agent via `POST /UserAgent/Message/Send`, include a `callbackurl` parameter. Once the agent finishes processing — whether it completes successfully, encounters an error, or the message is cancelled — Wiro sends a POST request to your URL with the result.

This lets you build fully asynchronous workflows: fire a message and let your backend handle the response whenever it arrives, without polling or maintaining a WebSocket connection.

## Setting a Callback URL

Include `callbackurl` in your message request body:

```json
POST /UserAgent/Message/Send
{
  "useragentguid": "your-useragent-guid",
  "message": "What are today's trending topics?",
  "sessionkey": "user-123",
  "callbackurl": "https://your-server.com/webhooks/agent-response"
}
```

The callback URL is stored per-message. You can use different URLs for different messages, or omit it entirely if you prefer polling or WebSocket.

## Callback Payload

When the agent finishes, Wiro sends a **POST** request to your `callbackurl` with `Content-Type: application/json`. The payload contains the complete message result including structured metadata.

### Successful Completion (`agent_end`)

```json
{
  "messageguid": "c3d4e5f6-a7b8-9012-cdef-345678901234",
  "status": "agent_end",
  "content": "What are today's trending topics?",
  "response": "Here are today's trending topics in tech...",
  "debugoutput": "Here are today's trending topics in tech...",
  "metadata": {
    "type": "progressGenerate",
    "task": "Generate",
    "speed": "14.2",
    "speedType": "words/s",
    "elapsedTime": "8.1s",
    "tokenCount": 156,
    "wordCount": 118,
    "raw": "Here are today's trending topics in tech...",
    "thinking": [],
    "answer": ["Here are today's trending topics in tech..."],
    "isThinking": false
  },
  "endedat": 1712050004
}
```

### Error (`agent_error`)

```json
{
  "messageguid": "c3d4e5f6-a7b8-9012-cdef-345678901234",
  "status": "agent_error",
  "content": "What are today's trending topics?",
  "response": "Could not resolve agent endpoint",
  "debugoutput": "Could not resolve agent endpoint",
  "metadata": {},
  "endedat": 1712050004
}
```

### Cancelled (`agent_cancel`)

```json
{
  "messageguid": "c3d4e5f6-a7b8-9012-cdef-345678901234",
  "status": "agent_cancel",
  "content": "What are today's trending topics?",
  "response": "The operation was aborted.",
  "debugoutput": "The operation was aborted.",
  "metadata": {},
  "endedat": 1712050004
}
```

### Field Reference

| Field | Type | Description |
|-------|------|-------------|
| `messageguid` | string | Unique identifier of the message. Use this to correlate with your records. |
| `status` | string | Final status: `agent_end`, `agent_error`, or `agent_cancel`. |
| `content` | string | The original user message you sent. |
| `response` | string | The agent's full response text on success. For errors, contains the error message. For cancellation, contains the abort reason. |
| `debugoutput` | string | Same as `response` — the full accumulated output text. Included for consistency with the polling API. |
| `metadata` | object | Structured response data. Contains thinking/answer separation, performance metrics, and raw text. Empty object (`{}`) for error and cancel statuses. |
| `endedat` | number | Unix timestamp (UTC seconds) when processing finished. |

### The `metadata` Object

On successful completion (`agent_end`), the `metadata` object contains the structured response with thinking/answer separation and real-time metrics:

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | Always `"progressGenerate"`. |
| `task` | string | Always `"Generate"`. |
| `raw` | string | The complete response text including any `<think>` tags. |
| `thinking` | array | Array of reasoning/chain-of-thought blocks extracted from `<think>...</think>` tags. Empty if the model doesn't use thinking. |
| `answer` | array | Array of response segments — the content to show the user. |
| `isThinking` | boolean | Always `false` in webhooks (streaming is complete). |
| `speed` | string | Final generation speed (e.g. `"14.2"`). |
| `speedType` | string | Speed unit — `"words/s"`. |
| `elapsedTime` | string | Total generation time (e.g. `"8.1s"`). |
| `tokenCount` | number | Total tokens generated. |
| `wordCount` | number | Total words in the response. |

For `agent_error` and `agent_cancel`, `metadata` is an empty object `{}`. Always check `status` before accessing metadata fields.

## Status Values

| Status | Description | `response` contains | `metadata` contains |
|--------|-------------|---------------------|---------------------|
| `agent_end` | Agent completed successfully | Full response text | Structured data with thinking, answer, metrics |
| `agent_error` | An error occurred during processing | Error message string | Empty object `{}` |
| `agent_cancel` | Message was cancelled before completion | Cancellation reason | Empty object `{}` |

## Retry Policy

Wiro attempts to deliver each webhook up to **3 times**:

- First attempt is immediate when the agent finishes
- 2-second delay between retries
- Your endpoint must return **HTTP 200** to acknowledge receipt
- Any non-200 response triggers a retry
- After 3 failed attempts, the webhook is abandoned and the failure is logged server-side

The message result is always persisted in the database regardless of webhook delivery. You can retrieve it at any time via `POST /UserAgent/Message/Detail`.

## Security Considerations

- Webhook calls do not include authentication headers — verify incoming requests by checking the `messageguid` against your own records
- Always use **HTTPS** endpoints in production
- Validate the payload structure before processing
- Consider returning 200 immediately and processing the payload asynchronously to avoid timeouts

## Code Examples

### Webhook Receiver — Node.js (Express)

```javascript
const express = require('express');
const app = express();
app.use(express.json());

app.post('/webhooks/agent-response', (req, res) => {
  const { messageguid, status, content, response, endedat } = req.body;

  if (status === 'agent_end') {
    console.log(`Agent completed: ${messageguid}`);
    console.log(`Response: ${response}`);
  } else if (status === 'agent_error') {
    console.error(`Agent error for ${messageguid}: ${response}`);
  } else if (status === 'agent_cancel') {
    console.log(`Agent cancelled: ${messageguid}`);
  }

  res.sendStatus(200);
});

app.listen(3000);
```

### Webhook Receiver — Python (Flask)

```python
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/webhooks/agent-response', methods=['POST'])
def agent_webhook():
    data = request.json
    messageguid = data.get('messageguid')
    status = data.get('status')
    response_text = data.get('response')

    if status == 'agent_end':
        print(f"Agent completed: {messageguid}")
        print(f"Response: {response_text}")
    elif status == 'agent_error':
        print(f"Agent error for {messageguid}: {response_text}")
    elif status == 'agent_cancel':
        print(f"Agent cancelled: {messageguid}")

    return jsonify({"ok": True}), 200

if __name__ == '__main__':
    app.run(port=3000)
```

### Webhook Receiver — PHP

```php
<?php
$payload = json_decode(file_get_contents('php://input'), true);

$messageguid = $payload['messageguid'] ?? '';
$status = $payload['status'] ?? '';
$response = $payload['response'] ?? '';

if ($status === 'agent_end') {
    error_log("Agent completed: $messageguid");
    error_log("Response: $response");
} elseif ($status === 'agent_error') {
    error_log("Agent error for $messageguid: $response");
} elseif ($status === 'agent_cancel') {
    error_log("Agent cancelled: $messageguid");
}

http_response_code(200);
echo json_encode(['ok' => true]);
```

### Sending a Message with Callback — curl

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Message/Send" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "message": "Summarize today'\''s news",
    "sessionkey": "user-123",
    "callbackurl": "https://your-server.com/webhooks/agent-response"
  }'
```

### Response

```json
{
  "result": true,
  "errors": [],
  "messageguid": "c3d4e5f6-a7b8-9012-cdef-345678901234",
  "agenttoken": "eDcCm5yyUfIvMFspTwww49OUfgXkQt",
  "status": "agent_queue"
}
```

The `agenttoken` can be used to track the message via [WebSocket](/docs/websocket) for real-time streaming, while the webhook delivers the final result to your server.
