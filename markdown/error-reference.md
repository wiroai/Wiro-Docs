# Error Reference

Understand API error responses, error codes, and how to handle them.

## Response Format

When an API request fails, the response includes `result: false` and an `errors` array:

```json
{
  "result": false,
  "errors": [
    {
      "code": 97,
      "message": "Insufficient balance"
    }
  ]
}
```

All API responses return HTTP `200` — use the `result` field and error `code` to determine success or failure.

## Error Codes

Error codes indicate the category of the problem. Use these for conditional logic in your application.

| Code | Category | Description |
|------|----------|-------------|
| `0` | General | Server-side errors, validation failures, missing parameters |
| `1` | Not Found / Client | Resource not found or not accessible |
| `96` | Concurrency Limit | Too many concurrent tasks for your balance |
| `97` | Insufficient Balance | Not enough funds to run the model |
| `98` | Authentication Required | Sign in required to access this model |
| `99` | Token Invalid | Bearer token missing, invalid, or expired |

## Authentication Errors

These errors are returned when API key or bearer token authentication fails. All return HTTP `401`.

| Error | Code | Message |
|-------|------|---------|
| API key not found | `0` | "Project authorization is not founded." |
| Signature required | `0` | "Project requires signature authentication. x-signature and x-nonce headers are required." |
| Invalid signature | `0` | "Project authorization is not valid." |
| IP not allowed | `0` | "Requested ip {ip} is not allowed." |
| Bearer token missing | `99` | "Authorization bearer token is not founded in headers." |
| Bearer token invalid | `99` | "Authorization bearer token is invalid." |
| Bearer token expired | `99` | "Authorization bearer token expired." |
| Endpoint not found | `0` | "Error parsing url." (HTTP 404) |

### Signature Auth Errors

If your project uses signature-based authentication, ensure all three headers are present and the signature is computed correctly:

```
x-api-key: YOUR_API_KEY
x-signature: HMAC-SHA256(key=API_KEY, message=API_SECRET + NONCE)
x-nonce: Unix timestamp or random integer
```

See [Authentication](/docs/authentication) for details.

### IP Whitelist Errors

If your project has an IP whitelist configured, requests from unlisted IPs will be rejected. Use `*` in the whitelist to allow all IPs.

## Run Errors

These errors are returned by the `POST /Run/{owner}/{model}` endpoint.

### Balance & Limits

| Error | Code | Message | Action |
|-------|------|---------|--------|
| Insufficient balance | `97` | "Insufficient balance" | [Add funds](https://wiro.ai/panel/billing) — minimum $0.50 required (or $10 for training models) |
| Concurrent task limit | `96` | "You have reached your concurrent task limit. With your current balance of ${balance}, you can run up to {maxConcurrent} tasks at the same time. Add funds to increase your limit." | Wait for a task to finish, or [add funds](https://wiro.ai/panel/billing). See [Concurrency Limits](/docs/concurrency-limits) |
| Sign in required | `98` | "sign in to run this model" | Model requires a registered account |

### Validation Errors

| Error | Code | Message |
|-------|------|---------|
| Missing parameter | `0` | "Request parameter [{name}] required" |
| Invalid number | `0` | "Request parameter [{name}] must be integer or float" |
| Out of range | `0` | "Request parameter [{name}] must be between {min} and {max}" |
| File required | `0` | "Request files [{name}] required" |
| Invalid request body | `0` | "Request parameters are invalid." |

### Model Access Errors

| Error | Code | Message |
|-------|------|---------|
| Model not accessible | `1` | "tool-not-accessible" |
| Model not found | `1` | "slug-owner-project-not-exist" |
| User banned | `0` | "Your account has been suspended. Please contact support if you believe this is a mistake." |
| Permission denied | `0` | "You don't have any permission for this action." |

### Training Model Errors

| Error | Code | Message |
|-------|------|---------|
| Invalid model name | `0` | "Your model name should be contain (A-Z) (0-9) (-) (_) (.)" |
| Reserved name | `0` | "This name is not allowed" |
| Name taken | `0` | "This model name is already in use" |

## Task Errors

These errors are returned by `POST /Task/Detail`, `POST /Task/Cancel`, and `POST /Task/Kill`.

| Error | Code | Message | Endpoint |
|-------|------|---------|----------|
| Task not found | `1` | "There is no task yet." | Detail, Cancel, Kill |
| Missing identifier | `0` | "taskid or socketaccesstoken is required" | Detail |
| Not cancellable | `1` | "Task is not in a cancellable state." | Cancel |
| Kill failed | `1` | "Task could not be killed: {reason}" | Kill |
| Permission denied | `0` | "You don't have any permission for this action." | Detail, Cancel, Kill |

## Error Handling Best Practices

### Check the `result` field

Always check `result` first, then inspect the `code` in the `errors` array:

```javascript
const response = await fetch('https://api.wiro.ai/v1/Run/openai/sora-2', {
  method: 'POST',
  headers: { 'x-api-key': API_KEY, 'Content-Type': 'application/json' },
  body: JSON.stringify({ prompt: 'A sunset over mountains' })
});

const data = await response.json();

if (!data.result) {
  const error = data.errors[0];
  switch (error.code) {
    case 96:
      console.log('Concurrent limit reached — wait for a task to finish');
      break;
    case 97:
      console.log('Insufficient balance — add funds');
      break;
    case 98:
      console.log('Authentication required — sign in');
      break;
    default:
      console.log('Error:', error.message);
  }
}
```

### Retry Logic

| Code | Retryable | Strategy |
|------|-----------|----------|
| `0` (validation) | No | Fix the request parameters |
| `0` (server) | Yes | Retry with exponential backoff |
| `1` | No | Resource not found — check model slug or task token |
| `96` | Yes | Wait for a running task to complete, then retry |
| `97` | No | Add funds, then retry |
| `98` | No | Sign in or use authenticated credentials |
| `99` | No | Check your API key or bearer token |
