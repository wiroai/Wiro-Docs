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

When the agent finishes, Wiro sends a POST request to your `callbackurl` with `Content-Type: application/json`:

```json
{
  "messageguid": "c3d4e5f6-a7b8-9012-cdef-345678901234",
  "status": "agent_end",
  "content": "What are today's trending topics?",
  "response": "Here are today's trending topics...",
  "endedat": 1712050004
}
```

| Field | Type | Description |
|-------|------|-------------|
| `messageguid` | string | The unique identifier of the message |
| `status` | string | Final status of the message (see below) |
| `content` | string | The original message you sent |
| `response` | string | The agent's full response text |
| `endedat` | number | Unix timestamp (UTC) when processing finished |

## Status Values

| Status | Description |
|--------|-------------|
| `agent_end` | Agent completed successfully |
| `agent_error` | An error occurred during processing |
| `agent_cancel` | Message was cancelled before completion |

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
