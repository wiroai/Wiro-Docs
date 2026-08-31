# Wiro API Documentation

Complete API documentation for the Wiro AI platform — run AI models through a unified API.

## Table of Contents

1. [Introduction](#introduction)
2. [Authentication](#authentication)
3. [Projects](#projects)
4. [Models](#models)
5. [Run a Model](#run-a-model)
6. [Direct LLM Gateway](#direct-llm-gateway)
7. [Model Parameters](#model-parameters)
8. [Tasks](#tasks)
9. [LLM Streaming](#llm-streaming)
10. [WebSocket](#websocket)
11. [Realtime Voice](#realtime-voice)
12. [Realtime Text to Speech](#realtime-text-to-speech)
13. [Realtime Speech to Text](#realtime-speech-to-text)
14. [Files](#files)
15. [Concurrency Limits](#concurrency-limits)
16. [Error Reference](#error-reference)
17. [Code Examples](#code-examples)
18. [Pricing](#pricing)
19. [FAQ](#faq)
20. [MCP Server](#mcp-server)
21. [Self-Hosted MCP](#self-hosted-mcp)
22. [Node.js Library](#nodejs-library)
23. [n8n Wiro Integration](#n8n-wiro-integration)
24. [Agent Overview](#agent-overview)
25. [Agent Builder](#agent-builder)
26. [Agent Messaging](#agent-messaging)
27. [Agent WebSocket](#agent-websocket)
28. [Agent Webhooks](#agent-webhooks)
29. [Agent Credentials & OAuth](#agent-credentials--oauth)
30. [Agent Skills](#agent-skills)
31. [Agent Transactions](#agent-transactions)
32. [Agent Logs](#agent-logs)
33. [Agent Use Cases](#agent-use-cases)
34. [Meta Ads Integration](#meta-ads-integration)
35. [Facebook Page Integration](#facebook-page-integration)
36. [Instagram Integration](#instagram-integration)
37. [Shopify Integration](#shopify-integration)
38. [WooCommerce Integration](#woocommerce-integration)
39. [Reddit Integration](#reddit-integration)
40. [Organizations & Teams](#organizations--teams)
41. [Managing Teams](#managing-teams)
42. [Team Billing & Spending](#team-billing--spending)
43. [Team API Access](#team-api-access)
44. [Telegram Integration](#telegram-integration)

---

# Introduction

Everything you need to get started with the Wiro AI platform.

## What is Wiro?

Wiro is an AI model marketplace and API platform that lets you run **AI models** through a single, unified API. Instead of managing infrastructure for each model provider, you make one API call to Wiro and we handle the rest.

- **Unified API** — one interface for all models (image generation, LLMs, audio, video, and more)
- **Pay-per-use pricing** — only pay for what you consume, no upfront commitments
- **Real-time WebSocket updates** — stream task progress and outputs live
- **9 SDK languages** — curl, Python, Node.js, PHP, C#, Swift, Dart, Kotlin, Go

## Base URL

All API requests are made to:

```
https://api.wiro.ai/v1
```

WebSocket connections use:

```
wss://socket.wiro.ai/v1
```

## Quick Start

1. **Sign up** at [wiro.ai](https://wiro.ai/auth/signup)
2. **Create a project** in the [Dashboard](https://wiro.ai/panel/project/new) to get your API key
3. **Pick a model** from the [marketplace](https://wiro.ai/models)
4. **Make your first API call** — see [Code Examples](#code-examples) for full end-to-end samples

## Response Format

Every API response returns JSON with a consistent structure:

```json
{
  "result": true,
  "errors": [],
  "data": { ... }
}
```

When `result` is `false`, the `errors` array contains human-readable messages describing what went wrong.

## Rate Limits & Error Handling

API requests are rate-limited per project. If you exceed the limit, the API returns a `429 Too Many Requests` status. Implement exponential backoff in your retry logic.

Common HTTP status codes:

- `200` — Success
- `400` — Bad request (check parameters)
- `401` — Unauthorized (invalid or missing API key)
- `403` — Forbidden (signature mismatch or insufficient permissions)
- `429` — Rate limit exceeded
- `500` — Internal server error

---

# Authentication

Secure your API requests with signature-based or simple key authentication.

## Overview

Wiro supports two authentication methods. You choose the method when [creating a project](https://wiro.ai/panel/project/new) — it cannot be changed afterward.

**Available methods:** Signature-Based (Recommended) | API Key Only (Simple)

## Signature-Based Authentication

Uses HMAC-SHA256 to sign every request. The API secret never leaves your environment, making this method ideal for **client-side applications** where the key might be exposed.

### How it works

1. Generate a **nonce** (unix timestamp or random integer)
2. Concatenate: `API_SECRET + NONCE`
3. Create an HMAC-SHA256 hash using your `API_KEY` as the secret key
4. Send the signature, nonce, and API key as headers

```
SIGNATURE = HMAC-SHA256(key=API_KEY, message=API_SECRET + NONCE)
```

#### Required Headers

| Parameter     | Type   | Required | Description                              |
| ------------- | ------ | -------- | ---------------------------------------- |
| `x-api-key`   | string | Yes      | Your project API key                     |
| `x-signature` | string | Yes      | HMAC-SHA256(API_SECRET + NONCE, API_KEY) |
| `x-nonce`     | string | Yes      | Unix timestamp or random integer         |

## API Key Only Authentication

For server-side applications where you control the environment, you can use the simpler API-key-only method. Just include the `x-api-key` header — no signature required.

#### Required Headers

| Parameter   | Type   | Required | Description          |
| ----------- | ------ | -------- | -------------------- |
| `x-api-key` | string | Yes      | Your project API key |

## Comparison

| Feature           | Signature-Based                        | API Key Only                         |
| ----------------- | -------------------------------------- | ------------------------------------ |
| Security          | High — secret never sent over the wire | Moderate — key sent in every request |
| Complexity        | Requires HMAC computation              | Single header                        |
| Best for          | Client-side apps, mobile, public repos | Server-side, internal tools          |
| Replay protection | Yes (via nonce)                        | No                                   |

## How to Choose

- Building a **client-side** or **mobile** app? Use **Signature-Based**.
- Running a **server-side** backend with controlled access? **API Key Only** is simpler.
- Unsure? Default to **Signature-Based** — it's always the safer option.

---

# Projects

Organize your API access, billing, and usage with projects.

## What is a Project?

A project is a container that holds your **API keys**, **billing settings**, and **usage tracking**. Each project gets its own API key and secret, letting you separate environments (development, staging, production) or different applications.

- Each project has its own API key and (optionally) API secret
- Usage and billing are tracked per project
- You can create multiple projects under one account

## Creating a Project

1. Go to your [Dashboard](https://wiro.ai/panel)
2. Navigate to [Projects](https://wiro.ai/panel/project)
3. Click [New Project](https://wiro.ai/panel/project/new)
4. Enter a project name
5. Select your [authentication method](#authentication):
   - **Signature-Based** — generates both an API key and API secret
   - **API Key Only** — generates only an API key
6. Click **Create**

## API Credentials

After creating a project, your API key (and secret, if signature-based) are displayed **once**. Copy and store them securely — you won't be able to view the secret again.

> **Important:** Treat your API secret like a password. Never commit it to version control or expose it in client-side code without signature-based authentication.

## Managing Projects

From the [Projects page](https://wiro.ai/panel/project) in your Dashboard, you can:

- **Update name** — rename your project at any time
- **Regenerate keys** — invalidates existing keys and generates new ones
- **View usage** — see API calls, costs, and task history
- **Delete project** — permanently removes the project and revokes all keys

Regenerating keys immediately invalidates the old ones. Update your application with the new credentials before the old ones stop working.

---

# Models

Browse and discover AI models available on the Wiro platform.

## **POST** /Tool/List

Returns a paginated list of available models. Filter by categories, search by name, and sort results.

#### Request Parameters

| Parameter       | Type     | Required | Description                                                     |
| --------------- | -------- | -------- | --------------------------------------------------------------- |
| `start`         | string   | No       | Offset for pagination (default: "0")                            |
| `limit`         | string   | No       | Number of results to return (default: "20")                     |
| `search`        | string   | No       | Search query to filter models by name                           |
| `sort`          | string   | No       | Sort field: id, relevance                                       |
| `order`         | string   | No       | Sort direction: ASC or DESC                                     |
| `categories`    | string[] | No       | Filter by categories (e.g. image-generation, llm, audio, video) |
| `tags`          | string[] | No       | Filter by tags                                                  |
| `slugowner`     | string   | No       | Filter by model owner slug                                      |
| `hideworkflows` | boolean  | No       | Hide workflow models from results (recommended: true)           |
| `summary`       | boolean  | No       | Return summarized model data (recommended for listings)         |

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

| Parameter     | Type    | Required | Description                          |
| ------------- | ------- | -------- | ------------------------------------ |
| `slugowner`   | string  | Yes      | Model owner slug (e.g. stability-ai) |
| `slugproject` | string  | Yes      | Model project slug (e.g. sdxl)       |
| `summary`     | boolean | No       | Return summarized data               |

### Response

```json
{
  "result": true,
  "errors": [],
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
    }
  ]
}
```

## Model Browser

Browse available models interactively. Click on a model to see its details on the [Wiro model page](https://wiro.ai/models).

---

# Run a Model

Execute any AI model with a single API call and get real-time updates.

## **POST** /Run/{owner-slug}/{model-slug}

Starts an AI model run. The endpoint accepts model-specific parameters and returns a **task ID** you can use to track progress via [polling](#tasks), [WebSocket](#websocket), or **webhook** by providing a `callbackUrl` parameter — Wiro will POST the result to your URL when the task completes.

If you want one HTTP request to wait for the finished task, use
[POST /Run/{owner}/{model}/sync](#run-sync) on this same API host. For OpenAI,
Anthropic, or Cursor LLM protocols, see the
[Direct LLM Gateway](#direct-llm-gateway).

## Content Types

### JSON (application/json)

Use JSON for text-based inputs — prompts, configuration, numeric parameters. This is the default and most common format.

### Multipart (multipart/form-data)

Use multipart when the model requires **file inputs** (images, audio, documents). Include files as form fields and other parameters as text fields.

## Request Parameters

Parameters vary by model. Use the [/Tool/Detail](#models) endpoint to discover which parameters a model accepts. The following optional parameters apply to all runs:

#### Common Parameters

| Parameter     | Type   | Required | Description                                                              |
| ------------- | ------ | -------- | ------------------------------------------------------------------------ |
| `callbackUrl` | string | No       | URL to receive a POST webhook when the task completes                    |
| `projectid`   | string | No       | Override the default project for billing (if you have multiple projects) |

## Response

A successful run returns a task ID and a WebSocket access token:

```json
{
  "result": true,
  "errors": [],
  "taskid": "2221",
  "socketaccesstoken": "eDcCm5yyUfIvMFspTwww49OUfgXkQt"
}
```

## Direct LLM turns and tool calls

Models whose Tool Detail response includes the `llm-tool-call` category accept
six optional ordinary model parameters on both asynchronous Run and `/sync`:
`messages`, `tools`, `tool_choice`, `parallel_tool_calls`,
`previousTaskToken`, and `toolOutputs`. Tool Detail marks them `advanced: true`
only to place them in the Advanced section of catalog-driven UIs; they use the
same `parameters` object and Run transport as every other model parameter.
Send JSON values directly, and use exactly one of `prompt` or non-empty
`messages` on a first turn.

```json
{
  "messages": [{
    "role": "user",
    "content": "What is the weather in Paris?"
  }],
  "tools": [{
    "type": "function",
    "function": {
      "name": "get_weather",
      "description": "Return current weather for a city",
      "parameters": {
        "type": "object",
        "properties": { "city": { "type": "string" } },
        "required": ["city"],
        "additionalProperties": false
      },
      "strict": true
    }
  }],
  "tool_choice": "auto",
  "parallel_tool_calls": true,
  "session_id": "weather-session-1"
}
```

```js
// Node.js
const response = await fetch(
  "https://api.wiro.ai/v1/Run/claude/fable-5/sync",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.WIRO_API_KEY
    },
    body: JSON.stringify({
      messages: [{
        role: "user",
        content: "What is the weather in Paris?"
      }],
      tools: [{
        type: "function",
        function: {
          name: "get_weather",
          parameters: {
            type: "object",
            properties: { city: { type: "string" } },
            required: ["city"]
          }
        }
      }],
      tool_choice: "auto",
      parallel_tool_calls: true,
      session_id: "weather-session-1",
    })
  }
);
```

Wiro never executes caller-defined tools. A tool request is returned in
`outputs[].content.segments` as its own ordered timeline item. Function calls
use `arguments`, custom grammar/free-form calls use `input`, and both include
stable `id`, `call_id`, `name`, and `status` fields. Execute a call only when
its status is `completed` and the turn's `finishreason` is `tool_calls`;
`incomplete` calls may contain truncated input and must never be executed.

The same structured LLM fields appear in three response locations:

- WebSocket `task_output`: `message.segments` is the live cumulative snapshot;
  final-only metadata may be absent while generation is still running.
- WebSocket `task_postprocess_end`: `message[].content` contains the persisted
  final output.
- Task Detail and non-streaming `/sync`:
  `tasklist[0].outputs[].content` contains the persisted final output.

Inside that content:

- `segments` is the authoritative ordered text/tool-call timeline.
- `finishreason` explains why generation stopped: `stop`, `tool_calls`,
  `length`, `content_filter`, or `error`. Handle `length`, `content_filter`,
  and `error` as non-normal model completion.
- `usage` contains normalized token and server-tool counters. `input_tokens`
  includes cache reads and cache writes; `output_tokens` includes reasoning;
  and `total_tokens` is exactly `input_tokens + output_tokens`. Therefore, do
  not add detail counters to the total. Optional `input_tokens_details` can
  include `cached_tokens`, `cache_write_tokens`, five-minute and one-hour cache
  write subsets, and text/audio/image/video counters. Optional
  `output_tokens_details` can include reasoning, text/audio/image/video, and
  accepted/rejected prediction counters. Optional `server_tool_use` contains
  request counts rather than tokens. Providers omit unsupported counters.
  There is no cached-output counter because prompt caching applies to input
  context, not previously generated output.
  `usage` is informational and is used by protocol-compatible LLM responses;
  use the task-level `totalcost` for the actual billed amount.

For a final `llm-tool-call` result, rely on `pexit: "0"` and require
`finishreason`. Structured-output validation failures set a non-zero `pexit`.

```json
{
  "segments": [{
    "type": "function_call",
    "id": "fc_01",
    "call_id": "call_01",
    "name": "get_weather",
    "arguments": "{\"city\":\"Paris\"}",
    "status": "completed"
  }],
  "finishreason": "tool_calls",
  "usage": {
    "input_tokens": 84,
    "input_tokens_details": {
      "cached_tokens": 24,
      "cache_write_tokens": 8,
      "cache_write_5m_tokens": 8,
      "text_tokens": 84
    },
    "output_tokens": 21,
    "output_tokens_details": {
      "reasoning_tokens": 9,
      "text_tokens": 21
    },
    "total_tokens": 105,
    "server_tool_use": {
      "web_search_requests": 1
    }
  }
}
```

For tool-output continuation, execute the tool in your application and send
another Run request with the first request's returned `socketaccesstoken` as
`previousTaskToken`, the same `session_id`, and one matching entry in
`toolOutputs` for every executed call. Do not send `prompt`, `messages`,
`tools`, `tool_choice`, `parallel_tool_calls`, or `response_format` on this
continuation.

```json
{
  "previousTaskToken": "task-token",
  "toolOutputs": [{
    "call_id": "call_01",
    "output": {
      "temperature_c": 12,
      "condition": "rain"
    }
  }],
  "session_id": "weather-session-1"
}
```

### Stateful turn continuation

For a stateful follow-up that is not submitting tool outputs, pass the prior
completed Run output's `socketaccesstoken` as `previousTaskToken`, keep the same
`session_id`, and provide exactly one new input: a non-blank `prompt` or a
non-empty `messages` array. Normal `tools` and `tool_choice` fields remain
available for the new turn. Do not send `toolOutputs`.

Use the `socketaccesstoken` returned by a completed task from the same project,
model, and session.

```json
{
  "previousTaskToken": "task-token",
  "prompt": "Give me one concrete example.",
  "session_id": "weather-session-1"
}
```

For OpenAI-compatible clients, `previous_response_id` remains the preferred
public field on `/v1/responses`; do not send `previousTaskToken` to that
endpoint. Direct asynchronous Run and `/sync` clients use `previousTaskToken`.

For cumulative SSE or WebSocket snapshots, replace the previous `segments`
array. Do not append the complete array again. A call can move from
`in_progress` to `completed` while keeping the same IDs. The final
`pexit: "0"` remains the success indicator.

<a id="run-sync"></a>

## **POST** /Run/{owner-slug}/{model-slug}/sync

Wait for any finite model on `https://api.wiro.ai/v1`. This starts the same
billed task as asynchronous Run, then returns final Task Detail JSON or streams
generic task events. It is not an OpenAI or Anthropic protocol. Training and
realtime models are rejected.

```bash
curl -X POST \
  "https://api.wiro.ai/v1/Run/claude/fable-5/sync" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "prompt": "Reply with one concise sentence about Türkiye.",
    "session_id": "fable-sync-example",
    "effort": "medium",
    "webSearch": "false",
    "maxOutputTokens": 128
  }'
```

Without streaming, the request stays open and returns Task Detail-compatible
JSON. Check `tasklist[0].pexit`; `"0"` means the model task succeeded. For LLM
tasks, `outputs` contains the structured result and `debugoutput` contains
merged plain text.

```json
{
  "result": true,
  "total": "1",
  "tasklist": [{
    "id": "2221",
    "status": "task_postprocess_end",
    "pexit": "0",
    "outputs": []
  }],
  "errors": []
}
```

Add `?stream=true` or send `Accept: text/event-stream` for named generic
events: `start`, cumulative task snapshots as `task_output`, a final `done`,
and periodic `: keep-alive` comments. Generic SSE does not use `[DONE]`. LLM
`task_output` events contain one ordered `segments` array. Text items use
`thinking` or `answer`; tool items use `function_call` or `custom_tool_call`.

```text
event: task_output
data: {
  "id": "2221",
  "status": "task_output",
  "pexit": null,
  "segments": [
    { "type": "thinking", "text": "Checking the constraints..." },
    { "type": "answer", "text": "Here is the result." }
  ]
}
```

Each LLM `segments` value is the full accumulated ordered snapshot, not only
the latest delta. Replace your previously stored segment list with each event
instead of appending the whole array again. While generation is active, the
final item's `text`, `arguments`, or `input` grows in place as chunks arrive;
render each snapshot immediately instead of waiting for `done`. A new item is
added when the output phase changes. Render `thinking` items as optional
reasoning progress, `answer` items as the model response, and tool items as
application-executed calls. The final `done` event contains Task
Detail-compatible JSON; inspect `tasklist[0].pexit` to determine success.

```bash
curl -N -X POST \
  "https://api.wiro.ai/v1/Run/claude/fable-5/sync?stream=true" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Accept: text/event-stream" \
  -d '{
    "prompt": "Reply with one concise sentence about Türkiye.",
    "session_id": "fable-stream-example",
    "effort": "medium",
    "webSearch": "false",
    "maxOutputTokens": 128
  }'
```

Disconnecting or reaching the 40-minute wait timeout ends only the synchronous
wait; the task keeps running. A non-streaming timeout returns HTTP `504` with
`taskid` and `socketaccesstoken` so you can resume tracking it through Task
Detail or WebSocket. Only `task_postprocess_end` and `task_cancel` close the
wait. `task_error` does not close a task. Errors use Wiro's `result`/`errors`
envelope. Sync is an additional execution method; asynchronous Run remains
unchanged.

```text
/v1/Run/{owner-slug}/{model-slug}/sync?stream=true
```

OpenAI Chat/Responses, Anthropic Messages, and Cursor clients belong on
`https://llm.wiro.ai`. See the [Direct LLM Gateway](#direct-llm-gateway).

## Full Flow

The typical workflow after calling the Run endpoint:

1. **Run** — call `POST /Run/{owner-slug}/{model-slug}` and receive a task ID
2. **Track** — connect via WebSocket or poll `POST /Task/Detail`
3. **Receive** — get outputs as the model produces them (streaming or final)
4. **Complete** — task reaches `task_postprocess_end`; verify `pexit: "0"` and
   read its outputs

For real-time streaming, use the WebSocket connection with the `socketaccesstoken` returned in the run response. For simpler integrations, poll the Task Detail endpoint every few seconds.

---

# Direct LLM Gateway

Use Wiro models through OpenAI Chat Completions, OpenAI Responses, Anthropic
Messages, and a beta Cursor-compatible chat route. The gateway uses the same
Wiro task, project-access, team-policy, and billing system as the Run API.

OpenAI-compatible clients use base URL:

```text
https://llm.wiro.ai/v1
```

Clients that append `/v1` themselves, including Anthropic SDKs and Claude
Code, use origin `https://llm.wiro.ai`. Cursor clients that append
`/chat/completions` use beta base `https://llm.wiro.ai/v1/cursor`.

Asynchronous Run, Task, the original Wiro File API, and WebSocket remain on
`https://api.wiro.ai/v1` and `wss://socket.wiro.ai/v1`. The Direct LLM Gateway
also provides OpenAI/Anthropic-compatible `/v1/files` routes backed by that
same authenticated project storage.

Direct LLM responses never expose Wiro Run/Sync `segments`. Each route returns
only its selected protocol's native JSON and streaming events: OpenAI Chat
chunks, OpenAI Responses events, Anthropic Messages events, or Chat-compatible
Cursor events. OpenClaw and Hermes receive the native transport they configure.

In this release, `stream: true` provides protocol-compatible SSE ordering after
the provider request completes and the authenticated structured turn is
persisted. Do not interpret first-event timing as live provider token latency.

Model IDs use lowercase `owner/model` form. Do not send a provider-only model
name: discover the exact ID and protocol capabilities first.

## Choose an endpoint

- `POST /v1/Run/{owner}/{project}` remains the asynchronous task-creation
  endpoint on `api.wiro.ai`.
- `POST /v1/Run/{owner}/{project}/sync` is the generic finite-model wait on
  `api.wiro.ai`; see [Run a Model](#run-a-model). It is not a Direct LLM
  protocol.
- `GET /v1/models` lists verified `llm-tool-call` models available in the
  authenticated project/team context.
  `GET /v1/chat/models` is an equivalent compatibility alias.
- `GET /v1/models/{owner}/{model}` returns one model's exact gateway contract.
- `POST`, `GET`, and `DELETE /v1/files` compatibility routes use the
  authenticated project's existing Wiro file storage.
- `POST /v1/chat/completions` uses OpenAI Chat JSON and SSE.
- `POST /v1/responses` uses OpenAI Responses JSON and official named SSE
  events.
- `POST /v1/messages` uses Anthropic Messages JSON and SSE.
- `POST /v1/messages/count_tokens` estimates Anthropic input tokens before a
  run.
- `POST /v1/cursor/chat/completions` is a beta compatibility route. It accepts
  strict Responses-shaped `input` and always returns Chat JSON/SSE.
- `GET /v1/generation?id=...` returns project-authorized generation metadata.

The asynchronous Run route returns `taskid` and `socketaccesstoken` immediately;
retrieve its result through Task Detail, WebSocket, or a callback. The generic
`/sync` wait is an additional method on `api.wiro.ai`; it does not replace
asynchronous Run. Direct LLM routes remain separate on `llm.wiro.ai`.

Training and realtime models are not accepted by `/sync` or the direct LLM
gateway. Use their existing training or realtime APIs.

## Authentication

### Project credentials

Model discovery/detail, the protocol routes, and `/generation` all use
the authenticated project's credentials. Standard compatible clients should
send a project Bearer credential:

- API Key Only project:
  `Authorization: Bearer YOUR_API_KEY`
- Signature project:
  `Authorization: Bearer YOUR_API_KEY:YOUR_API_SECRET`

The Signature Bearer value may instead be the base64 encoding of
`YOUR_API_KEY:YOUR_API_SECRET`.

The same endpoints also accept `x-api-key` containing either `YOUR_API_KEY` or
`YOUR_API_KEY:YOUR_API_SECRET`. Direct LLM routes do not accept the Run API's
`x-nonce`/`x-signature` HMAC trio.

If `Authorization` and `x-api-key` are sent together, both must identify the
same complete project credential. A mismatched key or secret, or a malformed
Bearer credential returns `401`; Wiro does not silently choose one credential
or fall back to another project.

Never expose a project key or secret in browser or mobile application code.

Anthropic Messages requires `x-api-key`. Send `YOUR_API_KEY` for an API Key
Only project or `YOUR_API_KEY:YOUR_API_SECRET` for a Signature project.
Generic `/sync` waits stay on `api.wiro.ai` and use normal Run headers.

### Session identifier

`session_id` is the only public session field. It is optional on Chat
Completions, Anthropic Messages, and the beta Cursor route, and must contain
1–128 letters, digits, `.`, `_`, `:`, or `-`. Reuse the same value for related
turns. Wiro maps it to a project-scoped internal session; it does not replace
the protocol's normal client-history requirements. Responses uses
`previous_response_id` instead, and `/v1/messages/count_tokens` does not accept
`session_id`.

## Connect an agent

Point a compatible client at `llm.wiro.ai`. OpenAI-compatible clients use a
project Bearer credential. Anthropic-compatible clients put the same project
credential in `x-api-key`: `YOUR_API_KEY` for API Key Only or
`YOUR_API_KEY:YOUR_API_SECRET` for Signature.

Every client below needs the exact lowercase `owner/model` ID. Two places give
it to you:

- [The catalog, filtered to gateway models](https://wiro.ai/models?categories=llm-tool-call)
  — browse them, open one, and copy the ID from its page.
- `GET /v1/models` — the same set as JSON, scoped to what your project and team
  can actually run. `GET /v1/models/{owner}/{model}` then reports that model's
  routes, modalities, tool support and token limits.
Generic finite-model waits stay on [Run a Model](#run-a-model).

### Cursor

Cursor reaches the gateway through its OpenAI base URL override, which it
appends `/chat/completions` to. Point it at the normal `/v1` base, not the beta
Cursor route below.

1. **Open the model settings** — Command Palette (`Cmd+Shift+P`, `Ctrl+Shift+P`
   on Windows) → `Cursor Settings: Models`.
2. **View All Models** — the settings pane lists only the models Cursor ships
   with. `View All Models`, at the bottom, opens the full list where custom ones
   live.
3. **+ Add Custom Model** — type the exact lowercase `owner/model` ID — the same
   IDs VS Code takes, listed below. Repeat for each model you want. Cursor shows
   whatever you type in its picker, so a parenthesised label is read and
   discarded at either end: `(Wiro AI) claude/sonnet-5` and
   `claude/sonnet-5 (Wiro AI)` both resolve to `claude/sonnet-5`. Leading keeps
   every Wiro model together in the picker.

   ![Cursor's custom model list showing four Wiro models, each labelled (Wiro
   AI), with the Add Custom Model button below them.](css/cursor-custom-llm.png)
4. **OpenAI API Key** — put the project credential in the `OpenAI API Key` field;
   that is the field Cursor uses for the overridden endpoint.
   `YOUR_API_KEY:YOUR_API_SECRET` for a Signature project, `YOUR_API_KEY` alone
   for API Key Only.
5. **Turn the key on** — flip the switch beside the field. It reads
   `Secret saved` once Cursor has stored the credential.
6. **Override OpenAI Base URL** — turn that switch on too. It sits directly
   under the key.
7. **Enter the base URL** — `https://llm.wiro.ai/v1`. Cursor appends
   `/chat/completions` itself, so do not add it.
8. **Disable the built-in models** — while the override is on, Cursor sends its
   own model names to your endpoint too, and those do not exist in the Wiro
   catalog. Leave only the models you added enabled, or every request fails with
   an unknown model.
9. **Verify** — press `Verify`. A failure here is normally the base URL carrying
   `/chat/completions`, or a built-in model still switched on.

Every model the gateway serves today, labelled and ready to paste one at a time;
drop the `(Wiro AI)` part, or move it to the end, as you prefer. The same set
is in [the catalog](https://wiro.ai/models?categories=llm-tool-call) and behind
`GET /v1/models`.

```
(Wiro AI) bytedance/seed-v2-1-turbo
(Wiro AI) bytedance/seed-v2-lite
(Wiro AI) bytedance/seed-v2-mini
(Wiro AI) bytedance/seed-v2-pro
(Wiro AI) claude/fable-5
(Wiro AI) claude/opus-5
(Wiro AI) claude/sonnet-5
(Wiro AI) openai/gpt-5-2
(Wiro AI) openai/gpt-5-4
(Wiro AI) openai/gpt-5-4-mini
(Wiro AI) openai/gpt-5-4-nano
(Wiro AI) openai/gpt-5-5
(Wiro AI) openai/gpt-5-6-luna
(Wiro AI) openai/gpt-5-6-sol
(Wiro AI) openai/gpt-5-6-terra
(Wiro AI) openai/gpt-5-mini
(Wiro AI) openai/gpt-5-nano
(Wiro AI) xai/grok-4-1-fast
(Wiro AI) xai/grok-4-20
(Wiro AI) xai/grok-4-5
```

The override covers the chat and agent panel. Tab autocomplete and inline edit
keep using Cursor's own backend whatever you configure here, so they are
unaffected either way.

The separate beta route at `https://llm.wiro.ai/v1/cursor` takes a
Responses-shaped body and rejects Chat Completions `messages`. The Cursor app
sends `messages`, so that route is for clients built against the Responses
dialect, not for this setup.

### Claude Code

Claude Code reads the gateway through the Anthropic Messages protocol. This is
the **terminal** Claude Code: the desktop app manages its own provider and
cannot be pointed at a gateway, so its model picker keeps listing Anthropic's
models whatever you configure.

1. **Install the CLI** — in a terminal:

   ```bash
   npm i -g @anthropic-ai/claude-code
   ```

2. **Write the settings file** — two places take it, and the file is the same in
   both. Pick by how widely you want the gateway used.

   **Every folder on this machine** — `~/.claude/settings.json`:

   ```json
   {
     "env": {
       "ANTHROPIC_BASE_URL": "https://llm.wiro.ai",
       "ANTHROPIC_API_KEY": "YOUR_API_KEY:YOUR_API_SECRET",
       "ANTHROPIC_MODEL": "(Wiro AI) openai/gpt-5-6-sol",
       "CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY": "1",
       "CLAUDE_CODE_MAX_CONTEXT_TOKENS": "1050000"
     }
   }
   ```

   **One project only** — `<project>/.claude/settings.json`, in the folder you
   will open Claude Code in. Your other projects keep whatever they were using.
   If that folder is a git repository, put it in `.claude/settings.local.json`
   instead, which is not committed — the credential should not reach the shared
   file:

   ```json
   {
     "env": {
       "ANTHROPIC_BASE_URL": "https://llm.wiro.ai",
       "ANTHROPIC_API_KEY": "YOUR_API_KEY:YOUR_API_SECRET",
       "ANTHROPIC_MODEL": "(Wiro AI) openai/gpt-5-6-sol",
       "CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY": "1",
       "CLAUDE_CODE_MAX_CONTEXT_TOKENS": "1050000"
     }
   }
   ```
   `ANTHROPIC_BASE_URL` carries no `/v1` here — Anthropic clients append the
   path themselves. `ANTHROPIC_API_KEY` takes `YOUR_API_KEY:YOUR_API_SECRET`
   for a Signature project, or `YOUR_API_KEY` alone for API Key Only.
   `ANTHROPIC_MODEL` is the model the session opens with, and is any ID from
   the list below, not only the `claude/` ones; the `(Wiro AI)` prefix is
   optional and the gateway strips it, but Claude Code prints whatever you
   write in its session header. `CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY`
   fills the `/model` picker from the gateway rather than leaving it on
   Anthropic's own list. `CLAUDE_CODE_MAX_CONTEXT_TOKENS` must match the
   context window of the model you set — Claude Code does not recognise these
   names, so it otherwise assumes 200k and discards history long before it
   needs to.

3. **Open Claude Code in that folder**:

   ```bash
   cd /path/to/your/project && claude
   ```

4. **Answer the first-run prompts** — a new install asks three things in a row:
   a colour theme, its security notes (`Press Enter to continue`), and whether
   to apply `Claude Code's terminal setup`. Answer them once.
5. **Allow the project's MCP servers, if it has any** — a folder that declares
   MCP servers gets `New MCP server found in this project` before the session
   opens. Nothing here concerns the gateway; choose whatever you would normally
   choose.
6. **Approve the key** — `Detected a custom API key in your environment — do you
   want to use this API key?` The cursor starts on `No (recommended)`, so move
   up to `Yes` and confirm. Claude Code remembers the answer, and a key you
   decline is ignored from then on without asking again. Using
   `ANTHROPIC_AUTH_TOKEN` instead of `ANTHROPIC_API_KEY` skips this prompt
   entirely; the gateway takes the credential in either header.
7. **Check the header, then start** — the session header names the model you
   configured, `(Wiro AI) openai/gpt-5-6-sol · API Usage Billing`. While a
   gateway credential is set, your own Claude subscription is not used and its
   limits do not apply.
8. **Switching models** — `/model` lists what Claude Code calls Claude models,
   and the gateway's `claude/` ones appear there marked `From gateway`, under
   their catalogue titles: `claude/opus-5` reads as `Claude Opus 5 (opus-5) Text
   Model`. The picker leaves the rest out by design; its own note says to name
   those with `--model`:

   ```bash
   claude --model xai/grok-4-1-fast
   ```

   Setting `ANTHROPIC_MODEL` in the settings file does the same thing for every
   session in that scope.

Every model the gateway serves today, with the context window for
`CLAUDE_CODE_MAX_CONTEXT_TOKENS`. The same values come from `GET /v1/models` as
`context_length`.

```
Model ID                               Context
----------------------------------------------
(Wiro AI) bytedance/seed-v2-1-turbo     256000
(Wiro AI) bytedance/seed-v2-lite        256000
(Wiro AI) bytedance/seed-v2-mini        256000
(Wiro AI) bytedance/seed-v2-pro         256000
(Wiro AI) claude/fable-5               1000000
(Wiro AI) claude/opus-5                1000000
(Wiro AI) claude/sonnet-5              1000000
(Wiro AI) openai/gpt-5-2                400000
(Wiro AI) openai/gpt-5-4               1050000
(Wiro AI) openai/gpt-5-4-mini           400000
(Wiro AI) openai/gpt-5-4-nano           400000
(Wiro AI) openai/gpt-5-5               1050000
(Wiro AI) openai/gpt-5-6-luna          1050000
(Wiro AI) openai/gpt-5-6-sol           1050000
(Wiro AI) openai/gpt-5-6-terra         1050000
(Wiro AI) openai/gpt-5-mini             400000
(Wiro AI) openai/gpt-5-nano             400000
(Wiro AI) xai/grok-4-1-fast            2000000
(Wiro AI) xai/grok-4-20                2000000
(Wiro AI) xai/grok-4-5                  500000
```

If Claude Code opens to the login screen instead of a session, the settings file
was not read in time: a project `.claude/settings.json` applies only after the
first-run prompts and the folder trust prompt above. Answer those once and
reopen, or put the same `env` block in `~/.claude/settings.json`, which is read
before them and applies to every folder.

### Windsurf

Windsurf now ships as **Devin Desktop**; the application is `Devin.app` and its
docs redirect to `docs.devin.ai`. Cascade, its own agent, has no setting for an
external provider — there is no base URL to override and no custom model to
register, so it cannot be pointed at this gateway. What does work is running a
different agent inside the same editor. The steps below use
[Cline](https://open-vsx.org/extension/saoudrizwan/claude-dev), which is free
and Apache-2.0; Roo Code and Continue configure the same way.

1. **Open the extension marketplace** — Command Palette (`Cmd+Shift+P`,
   `Ctrl+Shift+P` on Windows) → `Extensions: Install Extensions`. The menu bar
   gets you to the same place: `Devin → Preferences → Extensions`.
2. **Install Cline** — search `cline` and install the one published by
   `saoudrizwan`. Devin resolves extensions through the Open VSX mirror, so
   this is the same build VS Code carries.
3. **Open the panel** — Command Palette (`Cmd+Shift+P`, `Ctrl+Shift+P` on
   Windows) → `Cline: Focus on View`.
4. **Bring my own API key** — Cline asks how you will use it. Pick the fourth
   option, `Bring my own API key`, then `Continue`. The other three are Cline's
   own billing; `Login to Cline` is not needed.
5. **API Provider** — choose `OpenAI Compatible`, not `OpenAI`; that one goes to
   the official OpenAI API.
6. **Base URL** — `https://llm.wiro.ai/v1`. Cline appends the route itself.
7. **OpenAI Compatible API Key** — `YOUR_API_KEY:YOUR_API_SECRET` for a
   Signature project, `YOUR_API_KEY` alone for API Key Only. Cline keeps it
   locally.
8. **Model ID** — one ID from the list below; Cline holds a single model per
   configuration rather than a list. The `(Wiro AI)` prefix is optional and the
   gateway strips it; it earns its place here by showing up in the status bar,
   as `openai-compat: (Wiro AI) openai/gpt-5-6-sol`.
9. **Open `MODEL CONFIGURATION` and set the context window** — this one matters.
   Cline does not know a custom model, so it assumes `128K` and starts dropping
   history long before it needs to. Put the real number from the list below into
   `Context Window size`, and tick `Computer Use` so tool calling is enabled —
   without it the agent cannot run tools. `Max Output Tokens` and the price
   fields are in the same section.
10. **Continue, and send a message** — the status bar names the model you
    configured. `Plan` and `Act` can each hold a different model, and saved API
    configuration profiles let you keep one per model and switch between them.

Every model the gateway serves today, with the context window Cline needs. The
same numbers come from `GET /v1/models` as `context_length` and `max_tokens`.

```
Model ID                               Context    Max Output
------------------------------------------------------------
(Wiro AI) bytedance/seed-v2-1-turbo     256000         65536
(Wiro AI) bytedance/seed-v2-lite        256000         65536
(Wiro AI) bytedance/seed-v2-mini        256000         65536
(Wiro AI) bytedance/seed-v2-pro         256000         65536
(Wiro AI) claude/fable-5               1000000        128000
(Wiro AI) claude/opus-5                1000000        128000
(Wiro AI) claude/sonnet-5              1000000        128000
(Wiro AI) openai/gpt-5-2                400000         65536
(Wiro AI) openai/gpt-5-4               1050000         65536
(Wiro AI) openai/gpt-5-4-mini           400000         65536
(Wiro AI) openai/gpt-5-4-nano           400000         65536
(Wiro AI) openai/gpt-5-5               1050000         65536
(Wiro AI) openai/gpt-5-6-luna          1050000         65536
(Wiro AI) openai/gpt-5-6-sol           1050000         65536
(Wiro AI) openai/gpt-5-6-terra         1050000         65536
(Wiro AI) openai/gpt-5-mini             400000         65536
(Wiro AI) openai/gpt-5-nano             400000         65536
(Wiro AI) xai/grok-4-1-fast            2000000         65536
(Wiro AI) xai/grok-4-20                2000000         65536
(Wiro AI) xai/grok-4-5                  500000         65536
```

None of this touches Cascade, which keeps using Windsurf's own models. The
editor is Devin, the agent is Cline, and the models are Wiro's.

### VS Code

VS Code Chat reaches the gateway through its own built-in custom endpoint — no
extension required.

1. **Open the model manager** — Command Palette (`Cmd+Shift+P`, `Ctrl+Shift+P`
   on Windows) → `Chat: Manage Language Models`.
2. **Add a provider** — `+ Add Models` opens a provider list (Anthropic,
   Azure, Google, OpenAI, OpenRouter, xAI, Ollama). Pick `Custom Endpoint`,
   last, below the separator.
3. **Group Name** — arrives pre-filled with "Custom Endpoint"; replace it with
   `Wiro AI`. It is a label — it titles the next two prompts and groups the
   models in the picker.
4. **API Key** — `YOUR_API_KEY:YOUR_API_SECRET` for a Signature project,
   `YOUR_API_KEY` alone for API Key Only. VS Code keeps it in its secret store;
   the file holds only a `${input:…}` reference.
5. **API Type** — choose `Chat Completions`. Responses and Messages change the
   request shape VS Code sends.
6. **Describe the models** — VS Code opens `chatLanguageModels.json` with one
   empty model. Leave `name`, `vendor`, `apiKey` and `apiType` as generated and
   fill the `models` array. Below is every model the gateway serves today, ready
   to paste; the same set is in
   [the catalog](https://wiro.ai/models?categories=llm-tool-call) and behind
   `GET /v1/models`.

```json
[
  {
    "name": "Wiro AI",
    "vendor": "customendpoint",
    "apiKey": "${input:chat.lm.secret.xxxxxxxx}",
    "apiType": "chat-completions",
    "models": [
      {
        "id": "bytedance/seed-v2-1-turbo",
        "name": "Seed V2 1 Turbo (Wiro)",
        "url": "https://llm.wiro.ai/v1/chat/completions",
        "toolCalling": true,
        "vision": true,
        "maxInputTokens": 256000,
        "maxOutputTokens": 65536
      },
      {
        "id": "bytedance/seed-v2-lite",
        "name": "Seed V2 Lite (Wiro)",
        "url": "https://llm.wiro.ai/v1/chat/completions",
        "toolCalling": true,
        "vision": true,
        "maxInputTokens": 256000,
        "maxOutputTokens": 65536
      },
      {
        "id": "bytedance/seed-v2-mini",
        "name": "Seed V2 Mini (Wiro)",
        "url": "https://llm.wiro.ai/v1/chat/completions",
        "toolCalling": true,
        "vision": true,
        "maxInputTokens": 256000,
        "maxOutputTokens": 65536
      },
      {
        "id": "bytedance/seed-v2-pro",
        "name": "Seed V2 Pro (Wiro)",
        "url": "https://llm.wiro.ai/v1/chat/completions",
        "toolCalling": true,
        "vision": true,
        "maxInputTokens": 256000,
        "maxOutputTokens": 65536
      },
      {
        "id": "claude/fable-5",
        "name": "Fable 5 (Wiro)",
        "url": "https://llm.wiro.ai/v1/chat/completions",
        "toolCalling": true,
        "vision": true,
        "maxInputTokens": 1000000,
        "maxOutputTokens": 128000
      },
      {
        "id": "claude/opus-5",
        "name": "Opus 5 (Wiro)",
        "url": "https://llm.wiro.ai/v1/chat/completions",
        "toolCalling": true,
        "vision": true,
        "maxInputTokens": 1000000,
        "maxOutputTokens": 128000
      },
      {
        "id": "claude/sonnet-5",
        "name": "Sonnet 5 (Wiro)",
        "url": "https://llm.wiro.ai/v1/chat/completions",
        "toolCalling": true,
        "vision": true,
        "maxInputTokens": 1000000,
        "maxOutputTokens": 128000
      },
      {
        "id": "openai/gpt-5-2",
        "name": "Gpt 5 2 (Wiro)",
        "url": "https://llm.wiro.ai/v1/chat/completions",
        "toolCalling": true,
        "vision": true,
        "maxInputTokens": 400000,
        "maxOutputTokens": 65536
      },
      {
        "id": "openai/gpt-5-4",
        "name": "Gpt 5 4 (Wiro)",
        "url": "https://llm.wiro.ai/v1/chat/completions",
        "toolCalling": true,
        "vision": true,
        "maxInputTokens": 1050000,
        "maxOutputTokens": 65536
      },
      {
        "id": "openai/gpt-5-4-mini",
        "name": "Gpt 5 4 Mini (Wiro)",
        "url": "https://llm.wiro.ai/v1/chat/completions",
        "toolCalling": true,
        "vision": true,
        "maxInputTokens": 400000,
        "maxOutputTokens": 65536
      },
      {
        "id": "openai/gpt-5-4-nano",
        "name": "Gpt 5 4 Nano (Wiro)",
        "url": "https://llm.wiro.ai/v1/chat/completions",
        "toolCalling": true,
        "vision": true,
        "maxInputTokens": 400000,
        "maxOutputTokens": 65536
      },
      {
        "id": "openai/gpt-5-5",
        "name": "Gpt 5 5 (Wiro)",
        "url": "https://llm.wiro.ai/v1/chat/completions",
        "toolCalling": true,
        "vision": true,
        "maxInputTokens": 1050000,
        "maxOutputTokens": 65536
      },
      {
        "id": "openai/gpt-5-6-luna",
        "name": "Gpt 5 6 Luna (Wiro)",
        "url": "https://llm.wiro.ai/v1/chat/completions",
        "toolCalling": true,
        "vision": true,
        "maxInputTokens": 1050000,
        "maxOutputTokens": 65536
      },
      {
        "id": "openai/gpt-5-6-sol",
        "name": "Gpt 5 6 Sol (Wiro)",
        "url": "https://llm.wiro.ai/v1/chat/completions",
        "toolCalling": true,
        "vision": true,
        "maxInputTokens": 1050000,
        "maxOutputTokens": 65536
      },
      {
        "id": "openai/gpt-5-6-terra",
        "name": "Gpt 5 6 Terra (Wiro)",
        "url": "https://llm.wiro.ai/v1/chat/completions",
        "toolCalling": true,
        "vision": true,
        "maxInputTokens": 1050000,
        "maxOutputTokens": 65536
      },
      {
        "id": "openai/gpt-5-mini",
        "name": "Gpt 5 Mini (Wiro)",
        "url": "https://llm.wiro.ai/v1/chat/completions",
        "toolCalling": true,
        "vision": true,
        "maxInputTokens": 400000,
        "maxOutputTokens": 65536
      },
      {
        "id": "openai/gpt-5-nano",
        "name": "Gpt 5 Nano (Wiro)",
        "url": "https://llm.wiro.ai/v1/chat/completions",
        "toolCalling": true,
        "vision": true,
        "maxInputTokens": 400000,
        "maxOutputTokens": 65536
      },
      {
        "id": "xai/grok-4-1-fast",
        "name": "Grok 4 1 Fast (Wiro)",
        "url": "https://llm.wiro.ai/v1/chat/completions",
        "toolCalling": true,
        "vision": true,
        "maxInputTokens": 2000000,
        "maxOutputTokens": 65536
      },
      {
        "id": "xai/grok-4-20",
        "name": "Grok 4 20 (Wiro)",
        "url": "https://llm.wiro.ai/v1/chat/completions",
        "toolCalling": true,
        "vision": true,
        "maxInputTokens": 2000000,
        "maxOutputTokens": 65536
      },
      {
        "id": "xai/grok-4-5",
        "name": "Grok 4 5 (Wiro)",
        "url": "https://llm.wiro.ai/v1/chat/completions",
        "toolCalling": true,
        "vision": true,
        "maxInputTokens": 500000,
        "maxOutputTokens": 65536
      }
    ]
  }
]
```

- `id` — the lowercase `owner/model` from `GET /v1/models`.
- `name` — a free label, shown in the picker.
- `url` — the **full endpoint**, not the base URL. Every model repeats it.
- `toolCalling`, `vision`, `maxInputTokens`, `maxOutputTokens` — read them from
  `GET /v1/models/{owner}/{model}`: `capabilities.function_tools`,
  `capabilities.input_modalities`, `max_input_tokens`, `max_tokens`. Do not
  guess.
- **`maxInputTokens` is not optional.** VS Code sizes every conversation
  against it and answers *"Could not compact conversation"* on each turn when a
  model omits it, before any request reaches the gateway. Take the number from
  `max_input_tokens`; every catalog model reports one.

Save the file and reopen the model picker; the models appear under **Wiro AI**.
Any other VS Code extension that takes a custom OpenAI base URL — Cline, Roo
Code, Continue — works the same way: point it at `https://llm.wiro.ai/v1` with
the same credential and a model ID from the catalog.

### OpenClaw

Use the model-declared transport after reading
`GET /v1/models/{owner}/{model}`: `openai-completions`, `openai-responses`, or
`anthropic-messages`. OpenAI transports use the `/v1` base; Anthropic uses the
origin.

```json
{
  "models": {
    "providers": {
      "wiro": {
        "baseUrl": "https://llm.wiro.ai/v1",
        "apiKey": "${WIRO_BEARER_CREDENTIAL}",
        "api": "openai-completions",
        "models": [{ "id": "openai/gpt-5-6-sol", "name": "GPT 5.6 Sol" }]
      }
    }
  }
}
```

### Hermes

Hermes function-calling clients, Cline, Roo Code, and Continue can use OpenAI
Chat when they accept a custom base URL. Optional tools, reasoning, and
modalities still follow the selected model's metadata.

```yaml
providers:
  wiro:
    base_url: "https://llm.wiro.ai/v1"
    api_key: "${WIRO_BEARER_CREDENTIAL}"
```

## Discover models and capabilities

### **GET** /v1/models

```bash
curl "https://llm.wiro.ai/v1/models?search=openai%2Fgpt-5-6-sol&limit=1" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

`GET /v1/chat/models` returns the same authenticated, team-filtered list. This
gateway catalog is separate from the full website/model catalog at
`POST /v1/Tool/List`.

```json
{
  "object": "list",
  "data": [
    {
      "id": "openai/gpt-5-6-sol",
      "canonical_slug": "openai/gpt-5-6-sol",
      "name": "GPT 5.6 Sol by OpenAI (Vision)",
      "description": "GPT 5.6 Sol is OpenAI's flagship reasoning and vision model for agentic coding, research, and image Q&A in one chat.",
      "context_length": 1050000,
      "architecture": {
        "modality": "text+image->text",
        "input_modalities": ["text", "image"],
        "output_modalities": ["text"]
      },
      "pricing": {
        "prompt": "0.000005",
        "completion": "0.00003"
      },
      "top_provider": {
        "context_length": 1050000,
        "max_completion_tokens": null
      },
      "supported_parameters": [
        "include_reasoning",
        "parallel_tool_calls",
        "reasoning",
        "response_format",
        "structured_outputs",
        "tool_choice",
        "tools"
      ],
      "default_parameters": {},
      "object": "model",
      "type": "model",
      "created": null,
      "created_at": null,
      "owned_by": "openai",
      "display_name": "GPT 5.6 Sol by OpenAI (Vision)",
      "max_input_tokens": 1050000,
      "max_tokens": null,
      "capabilities": {
        "endpoints": ["anthropic", "chat", "cursor", "responses"],
        "input_modalities": ["text", "image"],
        "output": ["text", "reasoning", "function_calls", "custom_tool_calls"],
        "function_tools": true,
        "custom_tools": true,
        "structured_outputs": true,
        "structured_output_modes": ["json_object", "json_schema"],
        "strict_json_schema": true,
        "generation_controls": ["reasoning_effort"]
      },
      "x_wiro": {
        "pricing_source": {
          "name": "wiro-pricing-catalog",
          "schema_version": 1,
          "revision": "3a2430b5188fcaf69b5d7af1cb40d0a59062cc37",
          "sha256": "f74c5d378dfd8b28360b2464dc2590711550df501a7c6c7f9b673db105f7798f",
          "source_model": "openai/gpt-5.6-sol",
          "basis": "local-rate"
        },
        "pricing_tiers": null
      }
    }
  ],
  "total_count": 1,
  "links": {
    "next": null
  },
  "has_more": false,
  "first_id": "openai/gpt-5-6-sol",
  "last_id": "openai/gpt-5-6-sol"
}
```

The example is intentionally explicit about nullable values that have a Wiro
source. Context, modalities, and pricing come from the audited local gateway
catalog; live Run parameters and capability flags come from the selected
model's current `Tool/Detail` contract. Fields without a Wiro source are
omitted instead of being copied from OpenRouter with `null` placeholders.
`pricing.prompt` and `pricing.completion` are USD-per-token strings.
Models with tiered rates expose those exact bands in `x_wiro.pricing_tiers`.
Pricing and context fields can be `null` for catalog entries without audited
local metadata.

The list accepts:

- `search` (at most 256 bytes), `order=asc|desc`, and `limit=1..1000`
- `after`/`after_id` or `before`/`before_id` cursors

The default order is ascending and the default limit is `1000`. `total_count`
counts the filtered catalog. `links.next` is a relative next-page URL or
`null`.

The discovery list contains only team-allowed models verified with the
`llm-tool-call` category. Other LLMs are not advertised by this endpoint; when
you already know an exact `owner/model` ID, you can still submit it to a
compatible Direct LLM route or use the normal Run API.

Before each request:

1. Confirm `anthropic`, `chat`, `cursor`, or `responses` in
   `capabilities.endpoints`.
2. Use `supported_parameters` to gate optional public request controls.
   Required protocol fields such as `model`, `input`, `messages`, or Anthropic
   `max_tokens` are not repeated there.
3. Check `capabilities.input_modalities` for canonical `text`, `image`, or
   `document`. OpenRouter-style `architecture.input_modalities` represents
   documents as `file`.
4. Check `capabilities.output`, `function_tools`, `custom_tools`,
   `structured_outputs`, `structured_output_modes`, `strict_json_schema`, and
   `generation_controls`.
5. Treat `context_length`, `max_input_tokens`, `max_tokens`, pricing, and usage
   as model-specific. A nullable field is not permission to infer a value from
   another model.

Every discoverable model currently publishes the same four endpoint labels.
Capability differences are expressed through modalities, supported parameters,
tool flags, structured-output flags, reasoning controls, and limits.

### **GET** /v1/models/{owner}/{model}

```bash
curl "https://llm.wiro.ai/v1/models/openai/gpt-5-6-sol" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

The detail route returns the same complete model object as the matching list
entry. Query parameters are rejected on detail routes. An unavailable,
non-gateway, or team-blocked model returns `model_not_found` without exposing
private catalog state.

## Generic finite task completion

`POST /v1/Run/{owner}/{project}/sync` lives on `https://api.wiro.ai/v1`, not
this gateway. See [Run a Model](#run-a-model) for JSON wait, SSE, and
timeout recovery. Direct LLM clients should use Chat, Responses, Messages, or
Cursor below.

## Usage contract

When the upstream model reports usage, Wiro returns normalized counters in the
selected protocol's native shape:

- Chat and Cursor use `prompt_tokens`, optional `prompt_tokens_details`,
  `completion_tokens`, optional `completion_tokens_details`, and
  `total_tokens`.
- Responses uses `input_tokens`, `input_tokens_details`, `output_tokens`,
  `output_tokens_details`, and `total_tokens`.
- Anthropic Messages uses cache-exclusive `input_tokens`, `output_tokens`,
  optional `cache_read_input_tokens`, optional
  `cache_creation_input_tokens`, and optional five-minute/one-hour
  `cache_creation` detail.

For Chat and Responses, input/prompt totals are cache-inclusive. Their input
detail objects (optional on Chat/Cursor, always present on Responses) can
identify `cached_tokens`, `cache_write_tokens`,
`cache_write_5m_tokens`, `cache_write_1h_tokens`, and reported
text/audio/image/video tokens. Output/completion totals are
reasoning-inclusive; the corresponding output detail can identify
`reasoning_tokens`, reported text/audio/image/video tokens, and
accepted/rejected prediction tokens. Cache TTL values are subsets of
`cache_write_tokens`, and all detail counters are already included in their
parent total. Never add them to `total_tokens`.

There is intentionally no `cached_output_tokens` field. Provider prompt caches
reuse input context; they do not report previously generated output as cached
output usage.

Optional `server_tool_use` values count requests, not tokens. Providers omit
unsupported counters, so clients must not require every detail key. Chat,
Cursor, and Responses expose Wiro's billed amount as `usage.cost`; Anthropic
exposes it as `usage.cost_usd`. The asynchronous Run/Task contract keeps the
billed amount at task-level `totalcost`.

## Files compatibility

The gateway's Files routes are a compatibility view over the authenticated
Wiro project's existing upload folder. Uploads, lists, retrieval, and deletion
use the same storage as `File/Upload`, `File/List`, and `File/Delete` on
`api.wiro.ai`; the gateway does not create a second file database.

The supported routes are:

- `POST /v1/files` uploads one multipart field named `file`.
- `GET /v1/files` lists files in the authenticated project's upload folder.
- `GET /v1/files/{file_id}` returns file metadata.
- `GET /v1/files/{file_id}/content` checks ownership, then redirects with
  `307` to the validated public CDN URL.
- `DELETE /v1/files/{file_id}` deletes the project file.

File IDs use `file-...` form and are valid only inside the project whose
credentials created or listed them. A missing, deleted, or foreign ID returns
`file_not_found`; the gateway never falls back to another project.

### OpenAI Files

OpenAI clients use Bearer authentication. The only supported OpenAI purpose is
`assistants`:

```javascript
import fs from 'node:fs';
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.WIRO_BEARER_CREDENTIAL,
  baseURL: 'https://llm.wiro.ai/v1',
});

const file = await client.files.create({
  file: fs.createReadStream('input.png'),
  purpose: 'assistants',
});

const page = await client.files.list({ limit: 20, order: 'desc' });
const metadata = await client.files.retrieve(file.id);
const content = await client.files.content(file.id);
await client.files.delete(file.id);
```

OpenAI list queries accept `after`/`after_id`, `before`/`before_id`,
`limit=1..1000`, `order=asc|desc`, and `purpose=assistants`. The default limit
is `20` and the default order is descending. File metadata uses OpenAI's
`object: "file"`, `bytes`, Unix `created_at`, `filename`, `purpose`,
`status`, and `status_details` fields.

### Anthropic Files

Anthropic SDKs use origin `https://llm.wiro.ai` and send the required
`anthropic-version: 2023-06-01` header; that header selects the Anthropic file
metadata shape:

```javascript
import fs from 'node:fs';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  baseURL: 'https://llm.wiro.ai',
  apiKey: process.env.WIRO_API_KEY,
});

const file = await client.files.upload({
  file: fs.createReadStream('context.pdf'),
});

const page = await client.files.list({ limit: 20 });
const metadata = await client.files.retrieveMetadata(file.id);
const content = await client.files.download(file.id);
await client.files.delete(file.id);
```

Anthropic list queries accept `page`, legacy `after_id`/`before_id`, and
`limit=1..1000`. The response includes `next_page`, `has_more`, `first_id`,
and `last_id`. Metadata uses ISO `created_at`, `filename`, `mime_type`,
`size_bytes`, `type: "file"`, `downloadable`, and `expires_at`. Wiro-backed
files do not expire, so `expires_at` is `null`.

### Limits and model input

Gateway uploads are limited to 50 MiB per file. Empty files, multiple file
parts, unknown multipart fields, and filenames over 1024 bytes are rejected.
ZIP uploads are rejected because Wiro's standard File API extracts archives,
which cannot represent the one-upload/one-file contract expected by these SDKs.
The compatibility catalog reads at most 10,000 project files; that safety bound
is not a storage quota. The original Wiro File API has its own documented
limits.

Use the returned ID only where the selected protocol accepts file references.
For example, OpenAI Responses image input can use
`{ "type": "input_image", "file_id": "file-..." }`, while Anthropic document
input uses `{ "type": "file", "file_id": "file-..." }` inside its `source`
object. Before Run, the gateway verifies project ownership and MIME type, then
replaces the Wiro file ID with its existing public URL. Image references accept
GIF, JPEG, PNG, or WebP; document references accept PDF or plain text. Invalid
MIME combinations return `invalid_media_type` before model execution.

Public HTTPS URLs and validated data/base64 content remain available when the
model advertises the corresponding modality. A Wiro `file-...` ID is not a
provider file ID and is never forwarded to OpenAI, Anthropic, xAI, or another
provider.

## OpenAI Chat Completions

### **POST** /v1/chat/completions

Use a model that includes `chat` in `capabilities.endpoints`.

```bash
curl -X POST "https://llm.wiro.ai/v1/chat/completions" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "openai/gpt-5-6-sol",
    "messages": [
      { "role": "system", "content": "You are a concise assistant." },
      { "role": "user", "content": "What is SSE?" }
    ],
    "stream": false
  }'
```

The endpoint accepts `system`, `developer`, `user`, and `assistant` messages,
plus `tool` results for preceding assistant tool calls. Each request is
client-history: send the required conversation history in `messages`. Calls do
not create a saved Wiro Chat session.

Text is always available. OpenAI-style image and document content parts are
accepted only when the selected model advertises those input modalities.
Gateway output is text; this route is not an image, audio, or video generation
API. Remote media must use a public HTTPS URL or a validated data/base64
source; supported Wiro gateway file IDs may also be used. Private-network and
non-HTTP fetch targets are rejected. Provider-native file IDs are not accepted
as Wiro file IDs.

Generation fields such as `temperature`, `top_p`, `max_tokens`,
`max_completion_tokens`, penalties, `seed`, `stop`, `reasoning`, and
`response_format` are capability-gated. `n` must be `1`, `logprobs` must be
`false`, and `stop` accepts at most four non-empty values without semicolons.
Use `capabilities.structured_outputs` before requesting a non-text
`response_format`.

Standard OpenAI function tools use `tools`, `tool_choice`, and
`parallel_tool_calls`. Returned function calls use
`{ "id": "...", "type": "function", "function": { "name": "...", "arguments": "..." } }`
entries in `message.tool_calls`. Execute calls only when `finish_reason` is
`tool_calls`; a `length` or `content_filter` turn can contain partial tool data
that must not be executed. Preserve the returned assistant message unchanged,
then append matching `role: "tool"` results with `tool_call_id`. Wiro does not
execute tools on the caller's behalf.

When the model advertises `custom_tools`, Chat also accepts the nested custom
tool shape:

```json
{
  "type": "custom",
  "custom": {
    "name": "airport_code",
    "format": {
      "type": "grammar",
      "syntax": "regex",
      "definition": "[A-Z]{3}"
    }
  }
}
```

Use a matching nested custom `tool_choice`. Returned custom calls use
`{ "id": "...", "type": "custom", "custom": { "name": "...", "input": "..." } }`
entries in `message.tool_calls`. Execute them client-side and append
`role: "tool"` results with the same `tool_call_id`, just as for function calls.

Reasoning is model-specific. Public model reasoning can appear in
`message.reasoning` and `message.reasoning_details`; use the advertised
reasoning controls and supported efforts. Tool/reasoning combinations are also
model-specific, so do not infer support from another model.

Final responses use `chat.completion`. Native `usage` is conditional: a
successful completion is still returned when usage counters remain
unavailable.

For streaming, set body-level `"stream": true`. Text arrives in
`choices[0].delta.content`, reasoning in `delta.reasoning` and
`reasoning_details`, and function calls in `delta.tool_calls`. Concatenate tool
argument fragments by call `index`. The stream terminates with:

```text
data: [DONE]
```

With `stream_options.include_usage: true`, Wiro emits a final empty-choices
usage chunk before `[DONE]` only when native counters are available.

If a failure happens after Chat SSE has started, Wiro emits an OpenAI error
object in a `data:` frame, then `data: [DONE]`, and closes the connection.
The same midstream rule applies to the beta Cursor route. Once SSE headers have
been sent, the original HTTP status cannot communicate that later failure.

### OpenAI SDK

```javascript
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.WIRO_BEARER_CREDENTIAL,
  baseURL: 'https://llm.wiro.ai/v1',
});

const completion = await client.chat.completions.create({
  model: 'openai/gpt-5-6-sol',
  messages: [{ role: 'user', content: 'Hello' }],
});
```

For a Signature project, `WIRO_BEARER_CREDENTIAL` is
`YOUR_API_KEY:YOUR_API_SECRET`.

## OpenAI Responses

### **POST** /v1/responses

Use a model that includes `responses` in `capabilities.endpoints`. `input` can
be a string or Responses items; `instructions`, tools, text formatting,
multimodal input, reasoning, and generation controls are capability-gated.
Remote media follows the same public-HTTPS/data/base64/Wiro-file-ID
restrictions as Chat.

```bash
curl -X POST "https://llm.wiro.ai/v1/responses" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "openai/gpt-5-6-sol",
    "instructions": "Answer in one paragraph.",
    "input": "Explain server-sent events.",
    "store": true,
    "stream": false
  }'
```

Final responses use the official `response` object with an opaque ID such as
`resp_...` and an `output` item array. Items can include messages, public reasoning,
function calls, and custom tool calls. Execute only tool items with
`status: "completed"` from a completed response; never execute tool items from
an incomplete response. Native `usage` can be absent.

### Stored response continuation

`store` defaults to `true` for OpenAI compatibility. Set `store: false` for a
one-off response that will not be used as `previous_response_id`.

Use the ID of a stored `completed` or `incomplete` response as
`previous_response_id`. Never execute partial tool calls from an incomplete
parent:

```json
{
  "model": "openai/gpt-5-6-sol",
  "previous_response_id": "resp_2221",
  "input": [{
    "type": "message",
    "role": "user",
    "content": [{
      "type": "input_text",
      "text": "Give me one concrete example."
    }]
  }],
  "store": true
}
```

`previous_response_id` is the public continuation field for this gateway route.
Do not send `previousTaskToken` to `/v1/responses`. Direct Run clients use
`previousTaskToken` as described in [Run a Model](#run-a-model).
`session_id` is not accepted by Responses; use stored
`previous_response_id` continuation instead.

A stored response can be continued for up to 30 days by the same authenticated
user, project, team, and model. Expired, unstored, unavailable, or mismatched
responses return `response_not_found`; failed and cancelled responses are not
continuable. Chains are limited to 32 responses, and the conversation plus
requested output must fit the selected model's context window.

`store` is not accepted on `/v1/chat/completions`; these persistence rules apply
specifically to `/v1/responses`.

### Stored response retrieval and deletion

Retrieve a stored response with `GET /v1/responses/{response_id}`. Delete it
with `DELETE /v1/responses/{response_id}`; a successful deletion returns HTTP
`204` with an empty body. `POST /v1/responses/{response_id}/cancel` is not
supported and returns `response_cancel_not_supported`.

### Function and custom grammar tools

Responses function tools use the standard top-level `name`, `description`,
`parameters`, and optional `strict` shape. When a function call is returned,
submit its result in the next request as a `function_call_output` input item
with the same `call_id`.

Models with `capabilities.custom_tools: true` also accept free-form or
grammar-constrained tools:

```json
{
  "type": "custom",
  "name": "sql_query",
  "description": "Produce one read-only SQL query.",
  "format": {
    "type": "grammar",
    "syntax": "regex",
    "definition": "^SELECT .+;$"
  }
}
```

Grammar `syntax` is `regex` or `lark`. Use `format: { "type": "text" }` for a
free-form custom tool. When a `custom_tool_call` is returned, submit its result
in the next request as a `custom_tool_call_output` input item with the matching
`call_id`. `function_call_output` and `custom_tool_call_output` are next-request
input types, distinct from the returned `function_call` and
`custom_tool_call` output items. Tool execution always remains in your
application.

### Responses SSE

Set `"stream": true` for official named Responses events, including
`response.created`, `response.in_progress`, output-item/content-part events,
text and reasoning deltas,
`response.function_call_arguments.delta`/`.done`, and
`response.custom_tool_call_input.delta`/`.done`. Every `response.*` payload
carries a monotonically increasing `sequence_number`, starting at `0`. Ignore
`: keep-alive` comments.

The terminal event is `response.completed` or `response.incomplete`. A
midstream failure emits `response.failed`. Wiro then emits `data: [DONE]` and
closes the Responses stream; the official SDK consumes that sentinel.

## Anthropic Messages

### **POST** /v1/messages

Use a model that includes `anthropic` in `capabilities.endpoints`.

Anthropic SDKs normally send:

- `x-api-key: YOUR_API_KEY` for an API Key Only project, or
  `x-api-key: YOUR_API_KEY:YOUR_API_SECRET` for a Signature project
- `anthropic-version: 2023-06-01`
- optional `anthropic-beta` labels, comma-separated or repeated

`x-api-key` and `anthropic-version` are both required. An optional Bearer header
is accepted only when it resolves to the same complete credential.
Beta headers identify requested compatibility features; they do not override
model capabilities. `?beta=true` is also accepted as a beta-route marker.

```bash
curl -X POST "https://llm.wiro.ai/v1/messages" \
  -H "x-api-key: YOUR_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude/sonnet-5",
    "max_tokens": 1024,
    "system": "Be concise.",
    "messages": [{
      "role": "user",
      "content": "What is SSE?"
    }],
    "stream": false
  }'
```

`max_tokens` is required and positive. Messages use Anthropic `user` and
`assistant` roles; system instructions belong in the top-level `system` field.
Content can include `text`, model-advertised `image` or `document` input,
`tool_use`, `tool_result`, and supported thinking blocks. Remote media uses
validated public HTTPS, data/base64, or Wiro gateway file references.

Messages is client-history: resend the prior `user`/`assistant` content and
tool blocks required for each turn. It does not use Responses storage or
`previous_response_id`.

Anthropic function tools use `name`, `description`, and `input_schema`.
`tool_choice` supports Anthropic `auto`, `any`, `tool`, and `none` choices.
Anthropic's optional `type: "custom"` still denotes an ordinary client
function tool with `input_schema`; it is not OpenAI's free-form custom grammar
shape. Tool calls are returned as `tool_use`; your application executes them
and sends `tool_result`. Provider-hosted tools, hosted containers, and remote
MCP servers are rejected by this release. Execute `tool_use` blocks only when
`stop_reason` is `tool_use`; do not execute tool data from `max_tokens` or
`refusal` turns.

Thinking controls use:

```json
{ "thinking": { "type": "enabled", "budget_tokens": 2048 } }
```

`type` can be `enabled`, `adaptive`, or `disabled`. Check
`supported_parameters` for public reasoning controls and
`capabilities.output` for reasoning output. Do not fabricate or alter
signature or redacted-thinking blocks returned by the model.

Final responses use the Anthropic `message` object with opaque `msg_...` request
IDs; they are not Wiro task IDs. Public output content contains `text` and
`tool_use` blocks. Internal model reasoning is not projected as Anthropic
`thinking` or `redacted_thinking` output. Usage is included only when native
counters are available.

For streaming, set `"stream": true`. The SSE sequence uses Anthropic events
such as `message_start`, `content_block_start`, `content_block_delta`,
`content_block_stop`, `message_delta`, and `message_stop`, with `ping`
keepalives. A midstream failure emits Anthropic's native `error` event and
closes the connection. A successful stream ends with `message_stop` and
connection close; it does not emit `[DONE]`. Text blocks use `text_delta`, and
`tool_use` blocks use `input_json_delta`. The gateway does not emit
`thinking_delta`.

### Anthropic SDKs and Claude Code

The official Node and Python SDKs must use origin `https://llm.wiro.ai`, not
the OpenAI `/v1` base:

```javascript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  baseURL: 'https://llm.wiro.ai',
  apiKey: process.env.WIRO_API_KEY,
});
const message = await client.messages.create({
  model: 'claude/sonnet-5',
  max_tokens: 1024,
  messages: [{ role: 'user', content: 'Hello' }],
});
```

`WIRO_API_KEY` is `YOUR_API_KEY` for an API Key Only project or
`YOUR_API_KEY:YOUR_API_SECRET` for a Signature project. Python uses the
equivalent `base_url` and `api_key` options.

For Claude Code with a Signature project:

```bash
ANTHROPIC_BASE_URL="https://llm.wiro.ai" \
ANTHROPIC_API_KEY="YOUR_API_KEY:YOUR_API_SECRET" \
ANTHROPIC_MODEL="claude/sonnet-5" \
CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY=1 \
claude
```

For an API Key Only project, set `ANTHROPIC_API_KEY` to `YOUR_API_KEY`.
Model discovery uses Wiro's authenticated `/v1/models` route with `limit=1000`.
Claude Code adds only discovered IDs containing
`claude` or `anthropic` to its picker; set `ANTHROPIC_MODEL` explicitly for
any other compatible ID. Native Messages, client tools,
streaming, beta headers, thinking continuation, and token-counting calls remain
subject to the selected model's advertised capabilities. Provider-hosted tools
remain outside this release even when a client beta can describe them.

### **POST** /v1/messages/count_tokens

```bash
curl -X POST "https://llm.wiro.ai/v1/messages/count_tokens" \
  -H "x-api-key: YOUR_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude/sonnet-5",
    "system": "Be concise.",
    "messages": [{ "role": "user", "content": "Hello" }]
  }'
```

```json
{ "input_tokens": 28 }
```

This is a local preflight estimate over the submitted Anthropic payload, not
authoritative billing or provider-native usage. The estimate endpoint is part
of the Anthropic compatibility route; the model catalog does not label it as
native token counting.

## Beta Cursor-compatible chat

### **POST** /v1/cursor/chat/completions

Use a model that includes `cursor` in `capabilities.endpoints`. This route is
beta and may evolve. It accepts Responses-style `input` and optional
`instructions`. Chat `messages` are rejected rather than guessed. It always returns an OpenAI
`chat.completion` object and does not provide Responses persistence:
`previous_response_id` is disabled and `store` is forced off.

```bash
curl -X POST "https://llm.wiro.ai/v1/cursor/chat/completions" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "openai/gpt-5-6-sol",
    "input": "Summarize this function.",
    "stream": true
  }'
```

Function tools, custom tools, grammar tools, reasoning, and input modalities
remain model-capability-gated. Streaming always uses Chat chunks and terminates
with `data: [DONE]`; it never switches to Responses SSE.

Clients that append `/chat/completions` can use
`https://llm.wiro.ai/v1/cursor` as their beta base URL.

## Generation metadata

### **GET** /v1/generation?id=

Look up terminal metadata using the exact public ID emitted by the protocol
route: the response `id` for Chat, Cursor, or Responses, and the `request-id`
response header for Messages. The equivalent path form is
`GET /v1/generation/{public-id}`.

```bash
curl "https://llm.wiro.ai/v1/generation?id=resp_01HZX7Y8Q9" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

```json
{
  "data": {
    "id": "resp_01HZX7Y8Q9",
    "model": "openai/gpt-5-6-sol",
    "protocol": "responses",
    "status": "completed",
    "created_at": "2026-08-21T12:00:00.000Z",
    "completed_at": "2026-08-21T12:00:03.000Z",
    "usage": {
      "input_tokens": 20,
      "input_tokens_details": {
        "cached_tokens": 0,
        "cache_write_tokens": 0
      },
      "output_tokens": 12,
      "output_tokens_details": {
        "reasoning_tokens": 4
      },
      "total_tokens": 32
    },
    "upstream_metered_cost": 0.0021,
    "upstream_elapsed_seconds": 3
  }
}
```

`protocol` is `chat`, `cursor`, `messages`, or `responses`. `status` is
`completed`, `failed`, or `incomplete`. `created_at` and `completed_at` are ISO
8601 strings.

When token counters are available, `usage` follows the selected protocol:

- `responses`: `input_tokens`, `input_tokens_details` with `cached_tokens` and
  `cache_write_tokens`, `output_tokens`,
  `output_tokens_details.reasoning_tokens`, and `total_tokens`.
- `chat` and `cursor`: `prompt_tokens`, optional `prompt_tokens_details`,
  `completion_tokens`, optional `completion_tokens_details`, and
  `total_tokens`.
- `messages`: `input_tokens`, `output_tokens`, and nullable
  `cache_creation_input_tokens` and `cache_read_input_tokens`. This shape does
  not add `total_tokens`.

`usage` is `null` when no valid counters were recorded.
`upstream_metered_cost` and `upstream_elapsed_seconds` are finite upstream task
counters when available, otherwise `null`; cost is not duplicated inside
metadata `usage`.

Only the owning authenticated project can read a generation. Missing, expired,
and foreign IDs all return `generation_not_found`. This endpoint is terminal
observability metadata, not task output: it does not return a Wiro task ID,
generated content, or continuation state. Read generated content from the
original protocol JSON or SSE response.

## Deliberate boundaries

The Direct LLM Gateway does not currently provide:

- provider-hosted web search, file search, code interpreter, computer-use, or
  remote MCP tool execution; Wiro returns tool calls for your client to run
- a native Gemini `generateContent` protocol
- embeddings or reranking
- automatic model routing or fallback routing
- bring-your-own-provider-key (BYOK) execution
- dedicated image, audio, or video generation through the Chat, Responses,
  Messages, or Cursor-compatible routes
- the legacy `/v1/completions` endpoint

Use Wiro's normal [Run or /sync APIs](#run-a-model) for supported finite
media-generation models. Image and document **input** to an LLM is distinct from
media generation and remains available when the selected model advertises it.
Remote media fetches must use public HTTPS; validated data/base64 sources and
Wiro gateway file IDs are accepted only where the selected protocol/model
supports them. Provider-native file IDs are not interchangeable.

## Errors

Error responses preserve the selected public protocol:

- Chat, Responses, Cursor, model, and generation errors use the
  OpenAI-style `{ "error": { "message", "type", "param", "code" } }` shape.
- Anthropic routes use
  `{ "type": "error", "error": { "type", "message" } }`.

Generic `/sync` waits on `api.wiro.ai` use the normal Wiro `result`/`errors`
envelope.

After a stream starts, inspect SSE events rather than the HTTP status: Chat and
Cursor emit an error `data:` frame followed by `[DONE]`, Responses emits
`response.failed`, and Anthropic emits `error`.

Common codes include `invalid_model`, `model_not_found`,
`unsupported_model_type`, `unsupported_parameter`, `response_not_found`,
`response_chain_too_deep`, `invalid_generation_id`, `generation_not_found`,
`completion_timeout`, `model_execution_failed`, `task_cancelled`, and
`unsupported_capability`. Files routes can also return `file_not_found`,
`file_too_large`, `invalid_multipart`, `missing_file`, `invalid_filename`,
`invalid_media_type`, `invalid_pagination`, `invalid_query`,
`file_catalog_too_large`, `file_content_unavailable`, `file_api_unavailable`,
and `invalid_file_response`.

Gateway-origin and upstream execution failures use HTTP `500` with their
specific error code; the public protocol does not return HTTP `502`.
Responses under `/v1` include `ratelimit-limit`, `ratelimit-remaining`,
`ratelimit-reset`, `request-id`, and `x-request-id`. A rate-limit response also
includes `retry-after`.

Protocol execution POST bodies must be JSON and are limited to 16 MiB. Files
uploads are multipart and use the separate 50 MiB file limit. Unsupported
fields that could change execution fail instead of being silently accepted. A
model task can also fail after HTTP validation; preserve the protocol error and
status rather than treating every `2xx` task creation as a successful model
answer.

---

# Model Parameters

Understand parameter types, content types, and how to send inputs to any model.

## Discovering Parameters

Every model has its own set of input parameters. Use the `/Tool/Detail` endpoint to retrieve a model's parameter definitions. The response includes a `parameters` array where each item describes a parameter group with its items:

```json
{
  "parameters": [
    {
      "title": "Input",
      "items": [
        {
          "id": "prompt",
          "type": "textarea",
          "label": "Prompt",
          "required": true,
          "placeholder": "Describe what you want...",
          "note": "Text description of the desired output"
        },
        {
          "id": "inputImage",
          "type": "fileinput",
          "label": "Input Image",
          "required": true,
          "note": "Upload an image or provide a URL"
        }
      ]
    }
  ]
}
```

## Parameter Types

| Type               | Description                          | Example Parameters                        |
| ------------------ | ------------------------------------ | ----------------------------------------- |
| `text`             | Single-line text input               | URLs, names, short strings                |
| `textarea`         | Multi-line text input                | `prompt`, `negative_prompt`, descriptions |
| `select`           | Dropdown with predefined options     | `outputType`, `language`, `style`         |
| `range`            | Numeric value (slider)               | `width`, `height`, `scale`, `strength`    |
| `fileinput`        | Single file upload (1 file or 1 URL) | `inputImage`, `inputAudio`                |
| `multifileinput`   | Multiple files (up to N files/URLs)  | `inputDocumentMultiple`                   |
| `combinefileinput` | Up to N entries (files, URLs, or mixed) | `inputImageClothes`                    |

## JSON vs Multipart

The content type depends on whether the model requires file inputs:

| Condition           | Content-Type          | When to Use                                                 |
| ------------------- | --------------------- | ----------------------------------------------------------- |
| No file parameters  | `application/json`    | Text-only models (LLMs, image generation from prompt)       |
| Has file parameters | `multipart/form-data` | Models that accept image, audio, video, or document uploads |

> **Tip:** For `fileinput` and `multifileinput` parameters, use the `{id}Url` suffix to send URLs (e.g., `inputImageUrl`). For `combinefileinput`, pass URLs directly in the original parameter — no suffix needed. You can also pass a URL directly to any file parameter (e.g., `inputImage`) if the `{id}Url` field doesn't exist.

## File Upload Patterns

### Single File (fileinput)

For parameters like `inputImage`, send either a file or a URL. When using multipart, always include both the `{id}` and `{id}Url` fields — leave one empty:

```bash
# Option 1: Upload file — send file in {id}, empty {id}Url
curl -X POST "https://api.wiro.ai/v1/Run/{owner-slug}/{model-slug}" \
  -H "x-api-key: YOUR_API_KEY" \
  -F "inputImage=@/path/to/photo.jpg" \
  -F "inputImageUrl="

# Option 2: Send URL via {id}Url — send empty {id}, URL in {id}Url
curl -X POST "https://api.wiro.ai/v1/Run/{owner-slug}/{model-slug}" \
  -H "x-api-key: YOUR_API_KEY" \
  -F "inputImage=" \
  -F "inputImageUrl=https://example.com/photo.jpg"

# Option 3: Pass URL directly in {id} (no {id}Url needed)
curl -X POST "https://api.wiro.ai/v1/Run/{owner-slug}/{model-slug}" \
  -H "x-api-key: YOUR_API_KEY" \
  -F "inputImage=https://example.com/photo.jpg"
```

> **Note:** Option 3 is the simplest when you only have a URL. If the `{id}Url` field doesn't exist for a parameter, always use this approach.

### Multiple Files (multifileinput)

For parameters like `inputDocumentMultiple`, upload up to N files, send comma-separated URLs, or mix both:

```bash
# Option 1: Upload multiple files — add empty {id}Url
curl -X POST "https://api.wiro.ai/v1/Run/{owner-slug}/{model-slug}" \
  -H "x-api-key: YOUR_API_KEY" \
  -F "inputDocumentMultiple=@doc1.pdf" \
  -F "inputDocumentMultiple=@doc2.pdf" \
  -F "inputDocumentMultipleUrl="

# Option 2: Send URLs (comma-separated in {id}Url) — add empty {id}
curl -X POST "https://api.wiro.ai/v1/Run/{owner-slug}/{model-slug}" \
  -H "x-api-key: YOUR_API_KEY" \
  -F "inputDocumentMultiple=" \
  -F "inputDocumentMultipleUrl=https://example.com/doc1.pdf,https://example.com/doc2.pdf"

# Option 3: Mixed — files in {id}, URLs in {id}Url
curl -X POST "https://api.wiro.ai/v1/Run/{owner-slug}/{model-slug}" \
  -H "x-api-key: YOUR_API_KEY" \
  -F "inputDocumentMultiple=@doc1.pdf" \
  -F "inputDocumentMultipleUrl=https://example.com/doc2.pdf,https://example.com/doc3.pdf"
```

### Combined (combinefileinput)

For parameters like `inputImageClothes`, files and URLs go directly in the same `{id}` field — no `{id}Url` suffix:

```bash
# Option 1: Upload files — each as a separate {id} entry
curl -X POST "https://api.wiro.ai/v1/Run/{owner-slug}/{model-slug}" \
  -H "x-api-key: YOUR_API_KEY" \
  -F "inputImageClothes=@shirt.jpg" \
  -F "inputImageClothes=@pants.jpg"

# Option 2: Send URLs — each directly in {id}
curl -X POST "https://api.wiro.ai/v1/Run/{owner-slug}/{model-slug}" \
  -H "x-api-key: YOUR_API_KEY" \
  -F "inputImageClothes=https://example.com/shirt.jpg" \
  -F "inputImageClothes=https://example.com/pants.jpg"

# Option 3: Mixed — files and URLs in the same {id} field
curl -X POST "https://api.wiro.ai/v1/Run/{owner-slug}/{model-slug}" \
  -H "x-api-key: YOUR_API_KEY" \
  -F "inputImageClothes=@shirt.jpg" \
  -F "inputImageClothes=https://example.com/pants.jpg"
```

## Common Model Patterns

### Image Generation (text-to-image)

Models like Stable Diffusion, Flux — JSON body, no file uploads:

```json
{
  "prompt": "A futuristic city at sunset",
  "negative_prompt": "blurry, low quality",
  "width": 1024,
  "height": 1024
}
```

### Image-to-Image (upscaler, style transfer)

Models that take an input image — multipart with file upload:

```bash
curl -X POST "https://api.wiro.ai/v1/Run/{owner-slug}/{model-slug}" \
  -H "x-api-key: YOUR_API_KEY" \
  -F "inputImage=@photo.jpg" \
  -F "scale=4"
```

### Virtual Try-On

Multiple image inputs — multipart with multiple files:

```bash
curl -X POST "https://api.wiro.ai/v1/Run/{owner-slug}/{model-slug}" \
  -H "x-api-key: YOUR_API_KEY" \
  -F "inputImageHuman=@person.jpg" \
  -F "inputImageClothes=@shirt.jpg"
```

### LLM / Document Processing

Text prompt with optional document uploads:

```bash
curl -X POST "https://api.wiro.ai/v1/Run/{owner-slug}/{model-slug}" \
  -H "x-api-key: YOUR_API_KEY" \
  -F "inputDocumentMultiple=@resume.pdf" \
  -F "prompt=Extract the candidate name and skills" \
  -F "outputType=json" \
  -F "language=en"
```

> **Note:** LLM responses are available as structured content in `outputs` (with `contenttype: "raw"` containing `prompt`, `raw`, `thinking`, and `answer` fields) and as merged plain text in `debugoutput`. See [Tasks](/docs/tasks) for details.

### Realtime Voice Conversation

Realtime voice models accept configuration parameters (voice, system instructions, audio format, etc.) as JSON. Parameters vary per model — use `/Tool/Detail` to discover them. The actual audio interaction happens over [WebSocket](/docs/realtime-voice-conversation) after the task starts:

Available realtime models:

- [openai/gpt-realtime-mini](https://wiro.ai/models/openai/gpt-realtime-mini)
- [openai/gpt-realtime](https://wiro.ai/models/openai/gpt-realtime)
- [elevenlabs/realtime-conversational-ai](https://wiro.ai/models/elevenlabs/realtime-conversational-ai)

```json
// Example: OpenAI GPT Realtime
{
  "voice": "marin",
  "system_instructions": "You are a helpful voice assistant.",
  "input_audio_format": "audio/pcm",
  "output_audio_format": "audio/pcm",
  "input_audio_rate": "24000",
  "output_audio_rate": "24000"
}
```

## Webhook Callback

All models support an optional `callbackUrl` parameter. When provided, Wiro will POST the task result to your URL when the task completes — no polling required:

```json
{
  "prompt": "A sunset over mountains",
  "callbackUrl": "https://your-server.com/webhook/wiro"
}
```

---

# Tasks

Track, monitor, and control your AI model runs.

## Task Lifecycle

Every model run creates a task that progresses through a defined set of stages:

`task_queue` → `task_accept` → `task_preprocess_start` → `task_preprocess_end` → `task_assign` → `task_start` → `task_output` → `task_output_full` → `task_end` → `task_postprocess_start` → `task_postprocess_end`

## Task Statuses

| Status | Description |
|--------|-------------|
| `task_queue` | The task is queued and waiting to be picked up by an available worker. Emitted once when the task enters the queue. |
| `task_accept` | A worker has accepted the task. The task is no longer in the general queue and is being prepared for execution. |
| `task_preprocess_start` | Optional preprocessing has started. This includes operations like downloading input files from URLs, converting file types, and validating/formatting parameters before the model runs. Not all models require preprocessing. |
| `task_preprocess_end` | Preprocessing completed. All inputs are ready for GPU assignment. |
| `task_assign` | The task has been assigned to a specific GPU. The model is being loaded into memory. This may take a few seconds depending on the model size. |
| `task_start` | The model command has started executing. Inference is now running on the GPU. |
| `task_output` | The model is producing output. This event is emitted **multiple times** — each time the model writes to stdout, a new `task_output` message is sent via WebSocket. For LLM models, each token/chunk arrives as a separate `task_output` event, enabling real-time streaming. |
| `task_error` | As a live WebSocket event, this means the model wrote to stderr and is an **interim log**, not necessarily a failure. As persisted `status` in Task/Detail, it marks a pre-execution failure awaiting recovery or requeue; it does not close the task. |
| `task_output_full` | Signals that process stdout collection ended. Raw accumulated stdout is not exposed on the public socket. |
| `task_error_full` | Signals that process stderr collection ended. Raw accumulated stderr is not exposed on the public socket. |
| `task_end` | The model process has exited. Emitted once. This fires **before** post-processing — do not use this event to determine success. Wait for `task_postprocess_end` instead. |
| `task_postprocess_start` | Post-processing has started. The system is preparing the output files — encoding, uploading to CDN, and generating access URLs. |
| `task_postprocess_end` | Post-processing completed. On the public WebSocket, check `success` and `exitCode` (`0` = success); `message` contains sanitized outputs. Task/Detail continues to use `pexit` as its primary success indicator. **This is the event you should listen for** to get final results. |
| `task_cancel` | The task was cancelled (if queued) or killed (if running) by the user. |

### Realtime Conversation Only

The following statuses are exclusive to realtime conversation models (e.g. voice AI). They are not emitted for standard model runs.

| Status              | Description                                                                         |
| ------------------- | ----------------------------------------------------------------------------------- |
| `task_stream_ready` | Realtime model is ready to receive audio/text input — you can start sending data    |
| `task_stream_end`   | Realtime session has ended — the model finished speaking or the session was closed  |
| `task_cost`         | Real-time cost update emitted during execution — shows the running cost of the task |

## Determining Success or Failure

Normal model executions, both successful and failed, reach
`task_postprocess_end`. Check `pexit` or `outputs` (or both) to determine the
result. A setup failure may temporarily set persisted `status: "task_error"`
with a `debugerror`, but clients must keep waiting until
`task_postprocess_end` or `task_cancel`:

- `pexit` — the process exit code. `"0"` means success, any other value means the model encountered an error. This is the most reliable indicator.
- `outputs` — the output files array. For non-LLM models, a successful run populates this with CDN URLs. If it's empty or missing, the task likely failed.

> **Note:** For **LLM models**, `outputs` contains a structured entry with
> `contenttype: "raw"` and ordered `content.segments`. The merged plain text is
> also available in `debugoutput`. Always use `pexit` as the primary success
> check.

```json
// Success (image/audio model): pexit "0", outputs present
{
  "pexit": "0",
  "outputs": [{
    "name": "0.png",
    "contenttype": "image/png",
    "size": "202472",
    "url": "https://cdn1.wiro.ai/.../0.png"
  }]
}

// Success (LLM model): pexit "0", structured response in outputs + merged text in debugoutput
{
  "pexit": "0",
  "outputs": [{
    "contenttype": "raw",
    "content": {
      "prompt": "Hello!",
      "raw": "Hello! How can I help you today?",
      "segments": [
        {
          "type": "answer",
          "text": "Hello! How can I help you today?"
        }
      ],
      "finishreason": "stop",
      "usage": {
        "input_tokens": 12,
        "input_tokens_details": {
          "cached_tokens": 4,
          "cache_write_tokens": 2
        },
        "output_tokens": 9,
        "output_tokens_details": {
          "reasoning_tokens": 2
        },
        "total_tokens": 21
      }
    }
  }],
  "debugoutput": "Hello! How can I help you today?"
}

// Failure: pexit non-zero
{
  "pexit": "1",
  "outputs": []
}
```

> **Important:** Do not confuse the live `task_error` WebSocket log event with
> persisted `status: "task_error"` in Task/Detail. Both are non-terminal; only
> `task_postprocess_end` and `task_cancel` close the task.

## LLM Models

For LLM requests, `outputs` contains a structured entry with
`contenttype: "raw"` and ordered `content.segments`; `debugoutput` contains the
merged plain text. Use the representation that matches your UI.

For real-time streaming, use [WebSocket](#websocket). Each LLM `task_output`
event contains the latest cumulative `message.segments` snapshot; replace your
previous snapshot instead of appending it.

### Structured LLM content fields

Task Detail returns these fields under
`tasklist[0].outputs[].content`. The final WebSocket
`task_postprocess_end` event returns the same content under
`message[].content`.

| Field | When you need it | Description |
|-------|------------------|-------------|
| `raw` | Optional | Merged public model text. `debugoutput` provides the same compatibility view at task level. |
| `thinking` / `answer` | Optional | Convenience arrays split from text output. Use `segments` when exact ordering or tools matter. |
| `segments` | All structured/tool integrations | Authoritative cumulative ordered timeline. Text entries are `thinking` or `answer`; tool entries are `function_call` or `custom_tool_call`. |
| `finishreason` | Completion and tool handling | `stop`, `tool_calls`, `length`, `content_filter`, or `error`. Execute completed tool entries only when this is `tool_calls`. |
| `usage` | Token reporting | Normalized token and server-tool counters. It may be omitted when the provider does not report usage. It is not the billed amount. |

Within `usage`, `input_tokens` already includes cache-read and cache-write
tokens, `output_tokens` already includes reasoning tokens, and `total_tokens`
equals `input_tokens + output_tokens`. Never add detail counters to the total.
Known optional counters are:

- `input_tokens_details`: `cached_tokens`, `cache_write_tokens`,
  `cache_write_5m_tokens`, `cache_write_1h_tokens`, `text_tokens`,
  `audio_tokens`, `image_tokens`, and `video_tokens`.
- `output_tokens_details`: `reasoning_tokens`, `text_tokens`, `audio_tokens`,
  `image_tokens`, `video_tokens`, `accepted_prediction_tokens`, and
  `rejected_prediction_tokens`.
- `server_tool_use`: `web_search_requests`, `web_fetch_requests`,
  `file_search_requests`, `image_generation_requests`,
  `code_execution_requests`, `bash_code_execution_requests`,
  `text_editor_code_execution_requests`, and `computer_use_requests`.

The five-minute and one-hour cache-write counters are subsets of
`cache_write_tokens`. Server-tool values count requests, not tokens. Providers
omit counters they do not support. There is no cached-output counter because
prompt caching applies to input context. Use task-level `totalcost` for the
amount charged.

Plain-text integrations can use `debugoutput`. Tool integrations must inspect
`segments`, `finishreason`, and `pexit`. A final structured validation failure
produces a non-zero `pexit`.

## **POST** /Task/Detail

Retrieves the current status and output of a task. You can query by either `tasktoken` or `taskid`.

| Parameter   | Type   | Required | Description                                   |
| ----------- | ------ | -------- | --------------------------------------------- |
| `tasktoken` | string | No       | The task token returned from the Run endpoint |
| `taskid`    | string | No       | The task ID (alternative to tasktoken)        |

### Response

```json
{
  "result": true,
  "errors": [],
  "total": "1",
  "tasklist": [
    {
      "id": "534574",
      "socketaccesstoken": "eDcCm5yyUfIvMFspTwww49OUfgXkQt",
      "parameters": { "prompt": "Hello, world!" },
      "status": "task_postprocess_end",
      "pexit": "0",
      "debugoutput": "",
      "starttime": "1734513809",
      "endtime": "1734513813",
      "elapsedseconds": "6.0000",
      "totalcost": "0.003510000000",
      "modeldescription": "FLUX.2 [dev] is a 32 billion parameter rectified flow transformer...",
      "modelslugowner": "wiro",
      "modelslugproject": "flux-2-dev",
      "outputs": [
        {
          "name": "0.png",
          "contenttype": "image/png",
          "size": "202472",
          "url": "https://cdn1.wiro.ai/.../0.png"
        }
      ]
    }
  ]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Task ID. |
| `socketaccesstoken` | `string` | Token to connect via WebSocket. |
| `parameters` | `object` | The input parameters sent in the run request. |
| `status` | `string` | Current task status (see Task Lifecycle). |
| `pexit` | `string` | Process exit code. `"0"` = success. |
| `debugoutput` | `string` | Accumulated text output. For LLM models, contains the merged response text. |
| `debugerror` | `string` | Accumulated error text or a fatal pre-execution error message. |
| `starttime` | `string` | Unix timestamp when execution started. |
| `endtime` | `string` | Unix timestamp when execution ended. |
| `elapsedseconds` | `string` | Total execution time in seconds. |
| `totalcost` | `string` | Actual cost charged for the run in USD. |
| `modeldescription` | `string` | Description of the model that was executed. |
| `modelslugowner` | `string` | Model owner slug (e.g. `"google"`, `"wiro"`). |
| `modelslugproject` | `string` | Model project slug (e.g. `"nano-banana-pro"`). |
| `outputs` | `array` | Output files (CDN URLs) or structured LLM content (`contenttype: "raw"`). |

## **POST** /Task/Cancel

Cancels a task that is still in the `queue` stage. Use Kill for a running task.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `taskid` | string | Yes | The numeric task ID returned by the Run endpoint |

## **POST** /Task/Kill

Terminates a task that is currently running (any status after `assign`). The worker will stop processing and the task will move to `cancel` status.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `taskid` | string | No | The numeric task ID |
| `socketaccesstoken` | string | No | The task token returned by the Run endpoint (alternative to `taskid`) |

Provide either `taskid` or `socketaccesstoken`.

## **POST** /Task/InputOutputDelete

Deletes all output files and input files associated with a completed task. Removes files from S3 storage, local filesystem, and the database. Also invalidates CloudFront CDN cache so deleted files stop being served immediately.

| Parameter   | Type   | Required | Description                          |
| ----------- | ------ | -------- | ------------------------------------ |
| `tasktoken` | string | Yes      | The task token (socketaccesstoken)   |

The task must be in a terminal state (`task_postprocess_end` or `task_cancel`). Only the task owner can delete files. Shared sample input files (`/sampleinputs/`) are automatically excluded from deletion.

### Response

```json
{
  "result": true,
  "errors": []
}
```

After deletion:
- Output files are removed from S3 and CDN cache
- Input files uploaded by the user are removed from S3 and local storage
- The task's `outputfolderid` is set to `"0"` (Task Detail will return empty outputs)
- Task record and parameters are preserved — only the files are deleted
- Calling the endpoint again on the same task returns `result: true` immediately (idempotent)

### Errors

| Error | When |
|-------|------|
| `task-not-exist` | Invalid tasktoken or unauthorized |
| `Task must be completed or cancelled before deleting files` | Task is still running |

---

# LLM & Chat Streaming

Stream LLM responses in real time with ordered output segments, session history, and multi-turn conversations.

## Overview

LLM (Large Language Model) requests on Wiro work differently from standard model runs:

- Responses are available as structured content in `outputs` (with `contenttype: "raw"`) and as merged plain text in `debugoutput`
- Streaming `task_output` messages contain ordered text/tool-call `segments` —
  not plain strings
- Multi-turn conversations are supported via `session_id` and `user_id` parameters
- `pexit` is the primary success indicator
- The [Direct LLM Gateway](#direct-llm-gateway) offers OpenAI Chat/Responses,
  Anthropic Messages, and beta Cursor-compatible routes on `llm.wiro.ai`.
  Generic `/sync` waits stay on [Run a Model](#run-a-model).

Available LLM models include:

- [openai/gpt-5-2](https://wiro.ai/models/openai/gpt-5-2)
- [openai/gpt-oss-20b](https://wiro.ai/models/openai/gpt-oss-20b)
- [qwen/qwen3-5-27b](https://wiro.ai/models/qwen/qwen3-5-27b)

## Session & Chat History

Wiro maintains conversation history per session. By sending a `session_id` and `user_id` parameters:

| Parameter    | Type   | Required | Description                                                              |
| ------------ | ------ | -------- | ------------------------------------------------------------------------ |
| `session_id` | string | No\*     | Non-empty conversation identifier (up to 256 UTF-8 bytes). Reuse it for follow-up messages. |
| `user_id`    | string | No       | UUID identifying the user.                                               |
| `prompt`     | string | Yes      | The user's message or question.                                          |

```json
// First message — start a new session
{
  "prompt": "What is quantum computing?",
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7"
}

// Follow-up — reuse the same session_id
{
  "prompt": "Can you explain qubits in more detail?",
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7"
}
```

`session_id` is optional on a first turn but required when continuing with
`previousTaskToken`. Reuse the same `session_id` value on continuation. The
value may contain up to 256 UTF-8 bytes; a UUID is allowed but not required.

## Ordered Output Segments

LLM output is an ordered timeline with up to four segment types:

- **Thinking** — reasoning text exposed by the selected model
- **Answer** — the final response to the user
- **Function call** — JSON arguments for an application-defined function
- **Custom tool call** — grammar-constrained or free-form tool input

A model may alternate between thinking and answering multiple times during one
response. The `segments` array preserves the exact order, including consecutive
items of the same type:

```json
{
  "segments": [
    { "type": "thinking", "text": "Let me break this into parts..." },
    { "type": "thinking", "text": "Now let me verify my reasoning..." },
    { "type": "answer", "text": "Quantum computing uses qubits..." },
    { "type": "thinking", "text": "I should clarify one detail..." },
    { "type": "answer", "text": "To summarize: qubits can be 0, 1, or..." }
  ]
}
```

Each `task_output` event contains the **full accumulated** segment snapshot, not
only the latest delta. Replace your stored segment list with the newest array;
do not append the complete array again. The active final item's `text` grows in
place as chunks arrive, so render every snapshot before the response completes.
A new item is appended only when the output phase changes. Render items in
array order and use `isThinking` to show an active reasoning indicator.

When streaming via WebSocket, `task_output` messages for LLM models contain a structured object:

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
      { "type": "thinking", "text": "Let me analyze this step by step..." },
      { "type": "answer", "text": "Quantum computing uses qubits that can exist in superposition..." }
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
  }
}
```

| Field              | Type       | Description                                                     |
| ------------------ | ---------- | --------------------------------------------------------------- |
| `message.type`        | `string`   | Progress payload type; currently `"progressGenerate"`.          |
| `message.segments`    | `array`    | Full ordered text/tool-call snapshot. Replace the prior array rather than appending it. |
| `message.finishreason` | `string` | Final reason: `stop`, `tool_calls`, `length`, `content_filter`, or `error`. Usually absent until the turn finishes. |
| `message.usage` | `object` | Final normalized token/server-tool counters. Detail counters are already included in input/output totals. |
| `message.isThinking`  | `boolean`  | `true` while the model is in the thinking phase, `false` during the answer phase. |
| `message.speed`       | `string`   | Generation speed (e.g. "12.4").                                 |
| `message.speedType`   | `string`   | Unit for speed, typically `"words/s"`.                          |
| `message.elapsedTime` | `string`   | Elapsed time since generation started (e.g. "3s", "1m 5s").    |

> **Note:** Standard models may send `message` as a progress object or plain
> string. For LLM rendering, first verify that `message.segments` is an array.

Tool entries carry stable `id`, `call_id`, `name`, and `status`.
`function_call` uses a JSON `arguments` string; `custom_tool_call` uses
`input`. Execute only a `completed` call from a final turn whose
`finishreason` is `tool_calls`. Earlier snapshots may contain `in_progress`
or `incomplete` calls and must not trigger execution.

## Streaming Flow

1. **Run** the model with `prompt`, `session_id`, and `user_id`
2. **Connect** to WebSocket and send `task_info`
3. **Receive** `task_output` messages containing cumulative ordered `segments`
4. **Replace** your stored snapshot and render `answer` items; optionally show
   `thinking` items and collect tool calls
5. **Complete** — on `task_postprocess_end`, check `exitCode` on WebSocket or
   `pexit` in Task Detail, then inspect `finishreason`

## Polling Alternative

If you don't need real-time streaming, poll `POST /Task/Detail` instead. The final response is available in both `outputs` (structured) and `debugoutput` (merged plain text):

```json
{
  "result": true,
  "tasklist": [
    {
      "status": "task_postprocess_end",
      "pexit": "0",
      "debugoutput": "Quantum computing uses qubits that can exist in superposition...",
      "outputs": [{
        "contenttype": "raw",
        "content": {
          "prompt": "What is quantum computing?",
          "raw": "Quantum computing uses qubits that can exist in superposition...",
          "segments": [
            {
              "type": "answer",
              "text": "Quantum computing uses qubits that can exist in superposition..."
            }
        ],
        "finishreason": "stop",
        "usage": {
          "input_tokens": 18,
          "output_tokens": 11,
          "total_tokens": 29
        }
        }
      }]
    }
  ]
}
```

> **Note:** When polling, read the ordered `outputs[].content.segments` array
> for structured output. `debugoutput` contains merged plain text. For real-time
> delivery, use WebSocket streaming instead.

## Completions Alternative

For a single HTTP connection instead of manual Run plus WebSocket setup:

- Use `POST /v1/Run/{owner}/{project}/sync?stream=true` on
  `https://api.wiro.ai/v1` for generic task-event SSE. See
  [Run a Model](#run-a-model).
- Use the [Direct LLM Gateway](#direct-llm-gateway) on `https://llm.wiro.ai`
  for OpenAI Chat chunks ending in `[DONE]`, Responses named events, or
  Anthropic events ending in `message_stop`.

---

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

| Message Type             | Description                                         |
| ------------------------ | --------------------------------------------------- |
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
| `task_postprocess_end` | Post-processing completed. Check public `success` and `exitCode` (`0` = success); `message` contains sanitized outputs. **This is the event to listen for.** |
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

Lifecycle events (`task_accept`, `task_preprocess_start`, `task_preprocess_end`, `task_assign`, `task_start`, `task_end`, `task_postprocess_start`) have `message: null`.

### Output Events

**Standard models** — `message` is a progress object or plain string:

```json
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
```

**LLM models** — `message.segments` is the cumulative ordered output snapshot.
Replace it on every event. The final active item's `text` grows as chunks arrive,
so render it before completion; a new item appears when the output phase changes
(see LLM & Chat Streaming).

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

Text segments use `thinking` or `answer`. Tool-capable models can also emit
`function_call` segments with `arguments`, or `custom_tool_call` segments with
`input`; both carry `id`, `call_id`, `name`, and `status`.

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

### Full Output Events

`task_output_full` and `task_error_full` are lifecycle signals. Continue
listening for `task_postprocess_end`, or use authenticated `POST /Task/Detail`
to retrieve the persisted task.

### Final Result

`task_postprocess_end` — `message` contains sanitized outputs. Check `success`
and `exitCode`; use authenticated Task/Detail when the full persisted task is
needed. For LLM tasks, each final raw output repeats `segments`,
`finishreason`, and optional `usage` under `message[].content`.

### Realtime Events

`task_stream_ready`, `task_stream_end` have no `message` field. `task_cost`
includes `turnCost`, `cumulativeCost`, and a provider-specific realtime `usage`
payload. That payload is separate from normalized structured finite-LLM
`message.usage` and can omit `total_tokens` or detail objects.

## Binary Frames

For **realtime voice models**, the WebSocket may send binary frames containing raw audio data. Check if the received message is a `Blob` (browser) or `Buffer` (Node.js) before parsing as JSON.

## Ending a Session

For realtime/streaming models that maintain a persistent session, send a `task_session_end` message to gracefully terminate:

```json
{
  "type": "task_session_end",
  "tasktoken": "your-socket-access-token"
}
```

After sending this, wait for the `task_postprocess_end` event before closing the connection. This is the final event that contains the complete results.

---

# Realtime Voice

Build interactive voice conversation apps with realtime AI models.

## Overview

Realtime voice models enable two-way audio conversations with AI. Unlike standard model runs that process a single input and return a result, realtime sessions maintain a persistent WebSocket connection where you stream microphone audio and receive AI speech in real time.

The flow is:

1. **Run** the realtime model via [POST /Run](#run-a-model) to get a `socketaccesstoken`
2. **Connect** to the WebSocket and send `task_info` with your token
3. **Wait** for `task_stream_ready` — the model is ready to receive audio
4. **Stream** microphone audio as binary frames
5. **Receive** AI audio as binary frames and play them
6. **End** the session with `task_session_end`

## Connection & Registration

After running the task, connect to the WebSocket and register with `task_info` :

```javascript
var ws = new WebSocket("wss://socket.wiro.ai/v1");

ws.onopen = function () {
  ws.send(
    JSON.stringify({
      type: "task_info",
      tasktoken: "YOUR_SOCKET_ACCESS_TOKEN",
    }),
  );
};
```

> **Note:** Both standard and realtime models use `type: "task_info"` with `tasktoken` to register on the WebSocket.

## Realtime Events

During a realtime session, you'll receive these WebSocket events:

| Event               | Description                                                              |
| ------------------- | ------------------------------------------------------------------------ |
| `task_stream_ready` | Session is ready — start sending microphone audio                        |
| `task_stream_end`   | AI finished speaking for this turn — you can speak again                 |
| `task_cost`         | Cost update per turn — includes `turnCost`, `cumulativeCost`, and `usage` (raw cost breakdown from the model provider) |
| `task_output`       | Transcript messages prefixed with `TRANSCRIPT_USER:` or `TRANSCRIPT_AI:` |
| `task_end`          | The model process has exited. Post-processing follows — wait for `task_postprocess_end` to close the connection. |

## Audio Format

Both directions (microphone → server, server → client) use the same format:

| Property    | Value                                |
| ----------- | ------------------------------------ |
| Format      | PCM (raw, uncompressed)              |
| Bit depth   | 16-bit signed integer (Int16)        |
| Sample rate | 24,000 Hz (24 kHz)                   |
| Channels    | Mono (1 channel)                     |
| Byte order  | Little-endian                        |
| Chunk size  | 4,800 samples (200 ms) = 9,600 bytes |

### Binary Frame Format

Every binary WebSocket frame (in both directions) is structured as:

```
[tasktoken]|[PCM audio data]
```

The pipe character `|` (0x7C) separates the token from the raw audio bytes.

## Sending Microphone Audio

Capture microphone at 24 kHz using the Web Audio API with an AudioWorklet. Convert Float32 samples to Int16, prepend your task token, and send as a binary frame.

Key steps:

1. Request microphone with `getUserMedia` (enable echo cancellation and noise suppression)
2. Create an `AudioContext` at 24,000 Hz sample rate
3. Use an AudioWorklet to buffer and convert samples to Int16
4. Send each chunk as `tasktoken|pcm_data` binary frame

## Receiving AI Audio

AI responses arrive as binary WebSocket frames in the same PCM Int16 24 kHz format. To play them:

1. Check if the message is a `Blob` (binary) before parsing as JSON
2. Find the pipe `|` separator and extract audio data after it
3. Convert Int16 → Float32 and create an `AudioBuffer`
4. Schedule gapless playback using `AudioBufferSourceNode`

## Transcripts

Both user and AI speech are transcribed automatically. Transcripts arrive as `task_output` messages with a string prefix:

- `TRANSCRIPT_USER:` — what the user said
- `TRANSCRIPT_AI:` — what the AI said

```json
{
  "type": "task_output",
  "message": "TRANSCRIPT_USER:What's the weather like today?"
}

{
  "type": "task_output",
  "message": "TRANSCRIPT_AI:I'd be happy to help, but I don't have access to real-time weather data."
}
```

## Ending a Session

To gracefully end a realtime session, send `task_session_end`:

```json
{
  "type": "task_session_end",
  "tasktoken": "YOUR_SOCKET_ACCESS_TOKEN"
}
```

After sending this, the server will process any remaining audio, send final cost/transcript events, and then emit `task_postprocess_end`. Wait for `task_postprocess_end` before closing the WebSocket.

> **Safety:** If the client disconnects without sending `task_session_end`, the server automatically terminates the session to prevent the pipeline from running indefinitely (and the provider from continuing to charge). Always send `task_session_end` explicitly for a clean shutdown.

> **Insufficient balance:** If the wallet runs out of balance during a realtime session, the server automatically stops the session. You will still receive the final `task_cost` and `task_end` events.

---

# Realtime Text to Speech

Build streaming text-to-speech apps with realtime AI models.

## Overview

Realtime text-to-speech models convert text into streaming audio. Unlike standard TTS that processes a full prompt and returns an audio file, realtime TTS streams AI-generated speech as a continuous PCM audio stream over a WebSocket connection — in real time. The text prompt is submitted via [POST /Run](#run-a-model), not over the WebSocket. The WebSocket carries only task events (`task_info`, `task_stream_ready`, etc.), binary audio frames, and control messages (`task_session_end`).

No microphone is required. The flow is one-directional: text goes in, audio comes out.

The flow is:

1. **Run** the realtime TTS model via [POST /Run](#run-a-model) with your text prompt in the parameters
2. **Connect** to the WebSocket and send `task_info` with your `socketaccesstoken`
3. **Wait** for `task_stream_ready` — the model has loaded and is generating audio
4. **Receive** AI audio as binary frames and play them
5. **End** the session with `task_session_end` or wait for the stream to finish naturally

## How It Differs from Realtime Voice Conversation

|              | Realtime Voice Conversation                             | Realtime Text to Speech           |
| ------------ | ------------------------------------------------------- | --------------------------------- |
| Input        | Microphone audio (streamed)                             | Text (sent with the run request)  |
| Output       | AI audio + transcripts                                  | AI audio only                     |
| Direction    | Bidirectional (client ↔ server)                         | Server → client only              |
| Microphone   | Required                                                | Not required                      |
| Transcripts  | `TRANSCRIPT_USER:` / `TRANSCRIPT_AI:` via `task_output` | None                              |
| Use case     | Interactive voice chat                                  | Narration, voiceover, assistants  |

## Realtime Events

During a realtime TTS session, you'll receive these WebSocket events:

| Event                  | Description                                                                                      |
| ---------------------- | ------------------------------------------------------------------------------------------------ |
| `task_stream_ready`    | Session is ready — the model is generating audio and will begin sending chunks                   |
| `task_stream_end`      | The model finished generating audio for the current segment                                      |
| `task_cost`            | Cost update — includes `turnCost`, `cumulativeCost`, and `usage` (raw cost breakdown)            |
| `task_end`             | The model process has exited. Post-processing follows — wait for `task_postprocess_end` to close |
| `task_postprocess_end` | Post-processing is complete. Safe to close the WebSocket connection                              |

> **No `task_output` events.** Unlike voice conversation, TTS sessions do not produce transcript events. The input text is already known (you provided it), and the AI output is audio, not text.

## Audio Format

Audio flows in one direction only: **server → client**. The client does not send any audio.

| Property    | Value                                                     |
| ----------- | --------------------------------------------------------- |
| Format      | PCM (raw, uncompressed)                                   |
| Bit depth   | 16-bit signed integer (Int16)                             |
| Sample rate | 24,000 Hz (24 kHz)                                        |
| Channels    | Mono (1 channel)                                          |
| Byte order  | Little-endian                                             |
| Chunk size  | Variable (typically 200 ms = 4,800 samples = 9,600 bytes) |

### Binary Frame Format

Every binary WebSocket frame from the server is structured as:

```
[tasktoken]|[PCM audio data]
```

The pipe character `|` (0x7C) separates the token from the raw audio bytes. To extract the audio:

1. Find the first `|` byte in the binary frame
2. Everything after it is raw PCM Int16 audio data
3. Convert Int16 samples to your playback format (e.g., Float32 for Web Audio API)

> **Client → server:** In TTS mode, you do not send binary audio frames. The only messages you send are `task_info` (to register) and `task_session_end` (to end the session).

## Ending a Session

To gracefully end a realtime TTS session, send `task_session_end`:

```json
{
  "type": "task_session_end",
  "tasktoken": "YOUR_SOCKET_ACCESS_TOKEN"
}
```

After sending this, the server will finish any in-progress generation, send final cost events, and then emit `task_postprocess_end`. Wait for `task_postprocess_end` before closing the WebSocket.

For TTS sessions, the stream often ends naturally when the model finishes generating audio for the provided text. In this case, you'll receive `task_stream_end` followed by `task_end` without needing to send `task_session_end`. However, it's good practice to send it explicitly for a clean shutdown, especially if you want to stop playback early.

> **Safety:** If the client disconnects without sending `task_session_end`, the server automatically terminates the session to prevent the pipeline from running indefinitely. Always send `task_session_end` explicitly for a clean shutdown.

---

# Realtime Speech to Text

Transcribe live microphone audio into text in real time using streaming ASR models.

## Overview

Realtime speech-to-text models convert streaming audio into text transcripts as the user speaks. Unlike [Realtime Voice Conversation](#realtime-voice) which produces two-way audio, this mode is **audio in → text out** only. There is no AI audio playback — the server returns transcript strings over the WebSocket.

The flow is:

1. **Run** the realtime STT model via [POST /Run](#run-a-model) to get a `socketaccesstoken`
2. **Connect** to the WebSocket and send `task_info` with your token
3. **Wait** for `task_stream_ready` — the model is ready to receive audio
4. **Stream** microphone audio as binary frames (client → server)
5. **Receive** transcript text as `task_output` messages with `TRANSCRIPT_USER:` prefix
6. **End** the session with `task_session_end`

> **Key difference from Voice Conversation:** No binary audio is sent back from the server. All server → client messages are JSON text events.

## Realtime Events

During a realtime speech-to-text session, you'll receive these WebSocket events:

| Event                  | Direction       | Description                                                                         |
| ---------------------- | --------------- | ----------------------------------------------------------------------------------- |
| `task_stream_ready`    | server → client | Session is ready — start sending microphone audio                                   |
| `task_output`          | server → client | Transcript text prefixed with `TRANSCRIPT_USER:`                                    |
| `task_stream_end`      | server → client | Transcription stream has ended — no more transcripts will arrive                    |
| `task_cost`            | server → client | Cost update — includes `turnCost`, `cumulativeCost`, and `usage` breakdown          |
| `task_end`             | server → client | The model process has exited. Post-processing follows                               |
| `task_postprocess_end` | server → client | Post-processing complete — safe to close the WebSocket now                          |

> Unlike voice conversation, there are no binary audio frames from the server. Every server message is a JSON text event.

## Audio Format

Audio flows in one direction only: **client → server**.

| Property    | Value                                |
| ----------- | ------------------------------------ |
| Format      | PCM (raw, uncompressed)              |
| Bit depth   | 16-bit signed integer (Int16)        |
| Sample rate | 24,000 Hz (24 kHz)                   |
| Channels    | Mono (1 channel)                     |
| Byte order  | Little-endian                        |
| Chunk size  | 4,800 samples (200 ms) = 9,600 bytes |

> The server internally resamples to the model's native rate (e.g. 16 kHz for Voxtral). Always send at 24 kHz — the server handles conversion.

### Binary Frame Format

Every binary WebSocket frame sent from the client is structured as:

```
[tasktoken]|[PCM audio data]
```

The pipe character `|` (0x7C) separates the token from the raw audio bytes. There are no binary frames from the server — all responses are JSON text.

## Transcripts

Transcripts arrive as `task_output` messages with the `TRANSCRIPT_USER:` prefix. Each message contains a segment of transcribed speech:

```json
{
  "type": "task_output",
  "message": "TRANSCRIPT_USER:What's the weather like today?"
}

{
  "type": "task_output",
  "message": "TRANSCRIPT_USER:I need to book a flight to New York."
}
```

### Progressive Results

Transcripts arrive progressively as words and phrases are recognized — not just at segment boundaries. The model streams `TRANSCRIPT_USER:` messages word-by-word as speech is detected, so the client can display live, incremental results. To build a full transcript, concatenate all received messages:

```javascript
var fullTranscript = [];

if (msg.type === 'task_output' &&
    typeof msg.message === 'string' &&
    msg.message.startsWith('TRANSCRIPT_USER:')) {
  var segment = msg.message.substring(16);
  fullTranscript.push(segment);
  console.log('Segment:', segment);
  console.log('Full:', fullTranscript.join(' '));
}
```

> **Note:** Unlike voice conversation, there is no `TRANSCRIPT_AI:` prefix. All transcripts are user speech.

## Ending a Session

To gracefully end a realtime session, send `task_session_end`:

```json
{
  "type": "task_session_end",
  "tasktoken": "YOUR_SOCKET_ACCESS_TOKEN"
}
```

After sending this, the server processes any remaining buffered audio, sends final transcript and cost events, and then emits `task_postprocess_end`. Wait for `task_postprocess_end` before closing the WebSocket.

> **Safety:** If the client disconnects without sending `task_session_end`, the server automatically terminates the session to prevent the pipeline from running indefinitely. Always send `task_session_end` explicitly for a clean shutdown.

---

# Files

Manage folders and upload files for use with AI models.

## Overview

The Files API lets you organize and upload data that can be referenced in model runs. Common use cases include:

- **Training data** — upload datasets for fine-tuning models
- **File inputs** — provide images, audio, or documents as model inputs
- **Batch processing** — store files for repeated use across multiple runs

## Authentication and Public File URLs

All file-management endpoints require project or Bearer authentication. API Key
Only projects send `x-api-key`; signature projects also send `x-nonce` and
`x-signature`.

The returned `GET /File/:accessKey/:fileName` URL intentionally remains public
so browsers and model workers can display the file without account
credentials. Possession of the generated access key grants read access only,
not file-management permission.

## **POST** /File/FolderCreate

Creates a new folder to organize your uploaded files.

| Parameter  | Type   | Required | Description                                           |
| ---------- | ------ | -------- | ----------------------------------------------------- |
| `name`     | string | Yes      | Folder name (letters, numbers, hyphens, underscores only) |
| `parentid` | string | No       | Parent folder ID for nested structure (omit for root) |

### Response

```json
{
  "result": true,
  "errors": [],
  "list": [{
    "id": "folder-abc123",
    "name": "training-data",
    "parentid": "root-folder-id",
    "size": "0",
    "contenttype": "",
    "addedtime": "1716276543"
  }]
}
```

## **POST** /File/Upload

Uploads a file using `multipart/form-data`. You can optionally assign it to a folder. Max file size: 100 MB.

| Parameter  | Type   | Required | Description                                   |
| ---------- | ------ | -------- | --------------------------------------------- |
| `file`     | file   | Yes      | The file to upload (multipart form field)     |
| `folderid` | string | No       | Target folder ID (uploads to user's default folder if omitted) |

### Response

```json
{
  "result": true,
  "errors": [],
  "list": [{
    "id": "file-id",
    "name": "dataset.csv",
    "contenttype": "text/csv",
    "size": "1048576",
    "parentid": "folder-id",
    "url": "https://cdn1.wiro.ai/...",
    "addedtime": "1716276727",
    "accesskey": "..."
  }]
}
```

## Using Files in Runs

Once uploaded, reference a file by its URL or ID in your model run parameters. For example, an image upscaler model might accept a `imageUrl` parameter — pass the URL returned from the upload response.

```json
{
  "imageUrl": "https://files.wiro.ai/...",
  "scale": 4
}
```

---

# Pricing

Understand how billing works for AI model runs on Wiro.

## Billing Methods

Fixed-rate: `cpr` (per request), `cps` (per second), `cpo` (per output), `cpt` (per token).
Usage-based: `cp-pixel` (per pixel tier), `cp-audiosecondslength` (per audio second), `cp-promptlength` (per character), `cp-outputVideoLength` (per video second).
Special: `cp-realtimeturn` (per realtime voice turn), `cp-readoutput` (model-reported cost).

Fallback: when no `dynamicprice`, cost = elapsed_seconds × `cps`. `approximatelycost` = average_elapsed_seconds × cps.

## Dynamic Pricing

Many models have dynamic pricing — cost varies based on input parameters (e.g. resolution, duration). Returned in the `dynamicprice` field of Tool/List and Tool/Detail:

```json
[{"inputs": {"resolution": "720p", "duration": "5"}, "price": 0.13, "priceMethod": "cpr"}]
```

Empty `inputs` (`{}`) = flat rate for all configurations. Specific `inputs` = price for that parameter combination only.

## What You Pay For

Successful runs only (`pexit: "0"`). Cost recorded in `totalcost` field of Task/Detail. Server errors, queue time, and cancelled tasks are never billed.

Pricing page: https://wiro.ai/product/pricing

---

# Concurrency Limits

Understand and manage how many requests you can run simultaneously on Wiro.

## How It Works

Your concurrency limit is determined by your current account balance:

- When your balance is **$250 or below**, you can run concurrent tasks equal to **10% of your current USD balance** (minimum 1).
- When your balance is **above $250**, there is **no concurrency limit**.

| Account Balance | Concurrent Task Limit |
|-----------------|----------------------|
| $10 | 1 concurrent task (minimum) |
| $50 | 5 concurrent tasks |
| $100 | 10 concurrent tasks |
| $150 | 15 concurrent tasks |
| $250 | 25 concurrent tasks |
| $251+ | **Unlimited** |

Formula: `max(1, floor(balance_usd * 0.10))`. Error code `96` is returned when the limit is reached.

### API Response

When you hit the limit, the Run endpoint returns:

```json
{
  "result": false,
  "errors": [{ "code": 96, "message": "You have reached your concurrent task limit..." }]
}
```

| Code | Meaning |
|------|---------|
| `96` | Concurrent task limit reached |
| `97` | Insufficient balance |

For long MCP generations, `run_model` waits up to 45 seconds by default and
returns a recoverable token when the task remains active. Continue with
`wait_for_task`; do not resubmit `run_model` for the same request.

---

# Error Reference

Understand API error responses, error codes, and how to handle them.

## Error Codes

| Code | Category | Description |
|------|----------|-------------|
| `0` | General | Server-side errors, validation failures, missing parameters |
| `1` | Not Found | Resource not found or not accessible |
| `96` | Concurrency Limit | Too many concurrent tasks for your balance |
| `97` | Insufficient Balance | Not enough funds to run the model |
| `98` | Authentication Required | Sign in required to access this model |
| `99` | Token Invalid | Bearer token missing, invalid, or expired |

## Error Response Format

```json
{
  "result": false,
  "errors": [{ "code": 97, "message": "Insufficient balance" }]
}
```

All API responses return HTTP `200`. Auth errors return HTTP `401`.

## Run Errors (POST /Run)

| Code | Message | Action |
|------|---------|--------|
| `96` | Concurrent task limit reached | Wait for task to finish or add funds |
| `97` | Insufficient balance | Add funds ($0.50 min, $10 for training) |
| `98` | Sign in required | Model requires registered account |
| `0` | Parameter required/invalid | Fix request parameters |
| `1` | Model not found/accessible | Check model slug |

## Task Errors (POST /Task)

| Code | Message | Endpoint |
|------|---------|----------|
| `1` | Task not found | Detail, Cancel, Kill |
| `1` | Not cancellable | Cancel |
| `1` | Kill failed | Kill |
| `0` | Missing identifier | Detail |

---

# Code Examples

Complete end-to-end examples in all 9 supported languages.

## Overview

Each example below demonstrates the full Wiro workflow: authenticate, run a model, poll for task completion, and retrieve the result. Choose your preferred language.

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

TASK_ID=$(echo "$RUN_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['taskid'])")
TASK_TOKEN=$(echo "$RUN_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['socketaccesstoken'])")
echo "Task ID: $TASK_ID"

# 2. Poll for results
while true; do
  TASK_RESPONSE=$(curl -s -X POST "$BASE_URL/Task/Detail" \
    -H "Content-Type: application/json" \
    -H "x-api-key: $API_KEY" \
    -d "{\"tasktoken\": \"$TASK_TOKEN\"}")

  STATUS=$(echo "$TASK_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['tasklist'][0]['status'])")
  echo "Status: $STATUS"

  if [ "$STATUS" = "task_postprocess_end" ]; then
    echo "Done! Output:"
    echo $TASK_RESPONSE | python3 -m json.tool
    break
  elif [ "$STATUS" = "task_cancel" ]; then
    echo "Task cancelled"
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
task_token = run_data["socketaccesstoken"]
print(f"Task ID: {run_data['taskid']}")

# 2. Poll for results
while True:
    task_resp = requests.post(
        f"{BASE_URL}/Task/Detail",
        headers=headers,
        json={"tasktoken": task_token}
    )
    task = task_resp.json()["tasklist"][0]
    status = task["status"]
    print(f"Status: {status}")

    if status == "task_postprocess_end":
        print("Done! Outputs:", task.get("outputs"))
        break
    elif status == "task_cancel":
        print("Task cancelled")
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
  const taskToken = runResp.data.socketaccesstoken;
  console.log('Task ID:', runResp.data.taskid);

  // 2. Poll for results
  while (true) {
    const taskResp = await axios.post(
      `${BASE_URL}/Task/Detail`,
      { tasktoken: taskToken },
      { headers }
    );
    const task = taskResp.data.tasklist[0];
    const { status } = task;
    console.log('Status:', status);

    if (status === 'task_postprocess_end') {
      console.log('Done! Outputs:', task.outputs);
      break;
    }
    if (status === 'task_cancel') {
      console.log('Task cancelled');
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
$taskToken = $runResp['socketaccesstoken'];
echo "Task ID: {$runResp['taskid']}\n";

// 2. Poll for results
while (true) {
    $taskResp = apiPost("$baseUrl/Task/Detail", [
        'tasktoken' => $taskToken,
    ], $apiKey);
    $task = $taskResp['tasklist'][0];
    $status = $task['status'];
    echo "Status: $status\n";

    if ($status === 'task_postprocess_end') {
        echo "Done! Outputs:\n";
        print_r($task['outputs']);
        break;
    }
    if ($status === 'task_cancel') {
        echo "Task cancelled\n";
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
var taskToken = runData.GetProperty("socketaccesstoken").GetString();
Console.WriteLine($"Task ID: {runData.GetProperty("taskid").GetString()}");

// 2. Poll for results
while (true) {
    var taskResp = await http.PostAsJsonAsync($"{baseUrl}/Task/Detail", new {
        tasktoken = taskToken
    });
    var taskData = await taskResp.Content.ReadFromJsonAsync<JsonElement>();
    var task = taskData.GetProperty("tasklist")[0];
    var status = task.GetProperty("status").GetString();
    Console.WriteLine($"Status: {status}");

    if (status == "task_postprocess_end") {
        Console.WriteLine("Done!");
        Console.WriteLine(task.GetProperty("outputs").ToString());
        break;
    }
    if (status == "task_cancel") {
        Console.WriteLine("Task cancelled");
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
let taskToken = runResp["socketaccesstoken"] as! String
print("Task ID: \(runResp["taskid"] ?? "")")

// 2. Poll for results
while true {
    let taskResp = try await apiPost("/Task/Detail", body: ["tasktoken": taskToken])
    let taskData = (taskResp["tasklist"] as! [[String: Any]])[0]
    let status = taskData["status"] as! String
    print("Status: \(status)")

    if status == "task_postprocess_end" {
        print("Done! Outputs: \(taskData["outputs"] ?? [])")
        break
    }
    if status == "task_cancel" {
        print("Task cancelled")
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
  final taskToken = runResp['socketaccesstoken'];
  print('Task ID: ${runResp['taskid']}');

  // 2. Poll for results
  while (true) {
    final taskResp = await apiPost('/Task/Detail', {'tasktoken': taskToken});
    final task = taskResp['tasklist'][0];
    final status = task['status'];
    print('Status: $status');

    if (status == 'task_postprocess_end') {
      print('Done! Outputs: ${task['outputs']}');
      break;
    }
    if (status == 'task_cancel') {
      print('Task cancelled');
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
    val taskToken = runResp.get("socketaccesstoken").asString
    println("Task ID: ${runResp.get("taskid").asString}")

    // 2. Poll for results
    while (true) {
        val taskResp = apiPost("/Task/Detail", mapOf("tasktoken" to taskToken))
        val taskData = taskResp.getAsJsonArray("tasklist")[0].asJsonObject
        val status = taskData.get("status").asString
        println("Status: $status")

        when (status) {
            "task_postprocess_end" -> {
                println("Done! Outputs: ${taskData.get("outputs")}")
                return
            }
            "task_cancel" -> {
                println("Task cancelled")
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
	taskToken := runResp["socketaccesstoken"].(string)
	fmt.Printf("Task ID: %s\n", runResp["taskid"].(string))

	// 2. Poll for results
	for {
		taskResp, _ := apiPost("/Task/Detail", map[string]interface{}{
			"tasktoken": taskToken,
		})
		taskData := taskResp["tasklist"].([]interface{})[0].(map[string]interface{})
		status := taskData["status"].(string)
		fmt.Printf("Status: %s\n", status)

		switch status {
		case "task_postprocess_end":
			fmt.Printf("Done! Outputs: %v\n", taskData["outputs"])
			return
		case "task_cancel":
			fmt.Println("Task cancelled")
			return
		}

		time.Sleep(3 * time.Second)
	}
}
```

---

# MCP Server

Connect AI coding assistants to Wiro's AI models via the Model Context Protocol.

## What is MCP?

[Model Context Protocol](https://modelcontextprotocol.io/) (MCP) is an open standard that lets AI assistants use external tools directly. With the Wiro MCP server, your AI assistant can search models, run inference, track tasks, and upload files — all without leaving your editor.

The hosted MCP server is available at `mcp.wiro.ai/v1` and works with clients
that support Streamable HTTP plus custom request headers, including Cursor,
Claude Code, Windsurf, OpenClaw, and Hermes. Claude Desktop uses Wiro's official
local `npx` package because its remote Custom Connectors require OAuth 2.0 and
cannot currently send Wiro's static `Authorization` header.

## Setup

### Cursor

Open MCP settings (`Cmd+Shift+P` → "Open MCP settings") and add:

```json
{
  "mcpServers": {
    "wiro": {
      "url": "https://mcp.wiro.ai/v1",
      "headers": {
        "Authorization": "Bearer YOUR_API_KEY:YOUR_API_SECRET"
      }
    }
  }
}
```

### Claude Code

```bash
claude mcp add --transport http wiro \
  https://mcp.wiro.ai/v1 \
  --header "Authorization: Bearer YOUR_API_KEY:YOUR_API_SECRET"
```

For API Key Only authentication, use `Bearer YOUR_API_KEY`. Verify with
`claude mcp get wiro` or `/mcp` inside Claude Code.

### Claude Desktop

Install Node.js 20 or later, then add this local stdio entry to
`claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "wiro": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@wiro-ai/wiro-mcp@1.3.0"],
      "env": {
        "WIRO_API_KEY": "YOUR_API_KEY",
        "WIRO_API_SECRET": "YOUR_API_SECRET"
      }
    }
  }
}
```

For API Key Only authentication, remove `WIRO_API_SECRET` completely. Fully quit
and reopen Claude Desktop after saving. Pin `@wiro-ai/wiro-mcp@1.3.0` in `args`
so `npx` does not reuse an older cached build. This runs the local package
and provides the same 13 Wiro tools. Do not add `https://mcp.wiro.ai/v1` through
Claude's Settings → Connectors yet; direct URL connections require OAuth, which
the hosted Wiro endpoint does not currently provide.

Claude Desktop may enforce a fixed client-side tool timeout. Wiro returns from
each generation wait within 45 seconds; when `nextAction.tool` is
`wait_for_task`, execute that action with the returned arguments until the
existing task completes. Never submit `run_model` again for the same request.
Adding a `timeout` field to `claude_desktop_config.json` is not a reliable
workaround because Claude Desktop versions may ignore it.

### OpenClaw

Set `WIRO_MCP_AUTH` in the OpenClaw process environment, then configure:

```json
{
  "mcp": {
    "servers": {
      "wiro": {
        "url": "https://mcp.wiro.ai/v1",
        "transport": "streamable-http",
        "connectionTimeoutMs": 10000,
        "headers": {
          "Authorization": "Bearer ${WIRO_MCP_AUTH}"
        }
      }
    }
  }
}
```

Verify with `openclaw mcp doctor wiro --probe`.
On older OpenClaw releases without that command, use
`openclaw mcp show wiro`, restart OpenClaw, and run `/tools verbose`.

### Hermes

Store `WIRO_MCP_AUTH` in `~/.hermes/.env`, then add this to `~/.hermes/config.yaml`:

```yaml
mcp_servers:
  wiro:
    url: "https://mcp.wiro.ai/v1"
    headers:
      Authorization: "Bearer ${WIRO_MCP_AUTH}"
    timeout: 60
    connect_timeout: 10
```

Run `/reload-mcp` and `/tools` in Hermes.

## Authentication

Signature-Based: `Authorization: Bearer YOUR_API_KEY:YOUR_API_SECRET`

API Key Only: `Authorization: Bearer YOUR_API_KEY`

## Available Tools

**Model slugs:** Use the clean/lowercase format `owner/model` (e.g. `openai/sora-2`, `wiro/virtual-try-on`). These correspond to the `cleanslugowner/cleanslugproject` values returned by `search_models`.

| Tool | Description |
|------|-------------|
| `search_models` | Search models by keyword, category, or owner |
| `get_model_schema` | Get parameter schema and pricing for any model |
| `recommend_model` | Describe a task, get model recommendations by relevance |
| `explore` | Browse curated models by category |
| `run_model` | Run any model; waits up to 45 seconds by default, then returns a recoverable task token |
| `wait_for_task` | Continue waiting for an existing task without creating a duplicate run |
| `get_task` | Check task status immediately or wait up to 45 seconds with `wait_seconds` |
| `list_tasks` | Browse authenticated generation history and continue with `get_task` |
| `get_task_price` | Get the cost of a completed task |
| `cancel_task` | Cancel a queued task |
| `kill_task` | Kill a running task |
| `upload_file` | Upload a file from URL for use as model input |
| `search_docs` | Search Wiro documentation |

If a generation exceeds the wait budget, continue with `wait_for_task` using
the returned token. Do not call `run_model` again for the same request.
`task_error` remains non-terminal in Task/Detail; the wait ends only at
`task_postprocess_end` or `task_cancel`.
Tools advertise typed input/output schemas and return `structuredContent` with
stable task states and an executable `nextAction` for reliable LLM chaining.
Completed media responses include standard MCP resource links plus an
assistant-audience instruction to render images and preserve clickable media
links in the user-facing response. This works even when a client displays
resource links as tool metadata instead of previewing them inside the tool card.

---

# Self-Hosted MCP

Run the Wiro MCP server locally on your own machine using npx.

## Quick Start

```json
{
  "mcpServers": {
    "wiro": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@wiro-ai/wiro-mcp@1.3.0"],
      "env": {
        "WIRO_API_KEY": "your-api-key",
        "WIRO_API_SECRET": "your-api-secret"
      }
    }
  }
}
```

The self-hosted server exposes the same 13 tools as the hosted server,
including bounded `run_model`, `wait_for_task`, and optional short waits through
`get_task.wait_seconds`. Pin `@wiro-ai/wiro-mcp@1.3.0` in the npx `args` so
clients do not reuse an older cached package.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `WIRO_API_KEY` | Yes | Your Wiro project API key |
| `WIRO_API_SECRET` | No | API secret (for signature auth) |
| `WIRO_API_BASE_URL` | No | Override API URL (default: `https://api.wiro.ai/v1`) |

## GitHub & npm

- GitHub: [github.com/wiroai/Wiro-MCP](https://github.com/wiroai/Wiro-MCP)
- npm: [@wiro-ai/wiro-mcp](https://www.npmjs.com/package/@wiro-ai/wiro-mcp)

---

# Node.js Library

Use Wiro AI models directly in your Node.js or TypeScript projects with a simple API client.

## Overview

The [`@wiro-ai/wiro-mcp`](https://www.npmjs.com/package/@wiro-ai/wiro-mcp) package exports a `WiroClient` class that you can use as a standalone API client — no MCP setup required. It handles authentication, model discovery, execution, task polling, and file uploads.

## Installation

```bash
npm install @wiro-ai/wiro-mcp
```

## Quick Start

```javascript
import { WiroClient } from '@wiro-ai/wiro-mcp/client';

const client = new WiroClient('YOUR_API_KEY', 'YOUR_API_SECRET');

const run = await client.runModel('google/nano-banana-pro', {
  prompt: 'A futuristic city at sunset',
  aspectRatio: '16:9',
  resolution: '2K'
});

const result = await client.waitForTask(run.socketaccesstoken);
const task = result.tasklist[0];

if (task.pexit === '0') {
  console.log('Output:', task.outputs[0].url);
}
```

## Available Methods

| Method | Description |
|--------|-------------|
| `searchModels(params?)` | Search and browse models by keyword, category, or owner. |
| `getModelSchema(model)` | Get full parameter schema and pricing for a model. |
| `explore()` | Browse curated models organized by category. |
| `runModel(model, params, signal?)` | Run a model. Returns task ID and socket access token. |
| `waitForTask(tasktokenOrReference, timeoutMs?, options?)` | Poll until completion. Default timeout: 120s. Supports abort, progress, and transient retries. |
| `getTask({ tasktoken?, taskid? }, signal?)` | Get current task status and outputs. |
| `cancelTask(tasktokenOrReference, signal?)` | Cancel a queued task using the API-required task ID. |
| `killTask(tasktokenOrReference, signal?)` | Kill a running task using its token or task ID. |
| `uploadFile(url, fileName?)` | Upload a file from URL for use as model input. |

`TaskWaitTimeoutError` preserves the last Task/Detail response. Resume
`waitForTask` with the same identifier instead of calling `runModel` again.

---

# FAQ

Common questions about using the Wiro API.

**How do I get an API key?** Sign up at wiro.ai, then create a project at wiro.ai/panel/project. Your API key (and secret, if signature-based) are displayed once — copy and store them securely.

**Which authentication method should I use?** Signature-Based is recommended for client-side apps. API Key Only is simpler for server-side.

**Do I pay for failed tasks?** No. Only successfully completed tasks (pexit "0") are billed.

**How do LLM responses work?** LLM models return their response in `outputs` (structured, with `contenttype: "raw"` containing `prompt`, `raw`, `thinking`, `answer`) and as merged text in `debugoutput`.

**Can I send a URL instead of uploading a file?** Yes. Most models accept direct URLs in file parameters. For `combinefileinput`, pass an array of URLs directly. See Model Parameters.

**Can I use a webhook instead of polling?** Yes. All models support an optional `callbackUrl` parameter.

---

# n8n Wiro Integration

Use all Wiro AI models directly in your n8n workflows — video, image, audio, LLM, 3D, and more.

The **Wiro AI community node** (`@wiro-ai/n8n-nodes-wiroai`) gives you access to all Wiro AI models as individual nodes you can drag and drop into any workflow.

## Installation

Install via n8n UI: **Settings → Community Nodes → Install → `@wiro-ai/n8n-nodes-wiroai`**

Or via command line: `npm install @wiro-ai/n8n-nodes-wiroai`

## Links

- [npm: @wiro-ai/n8n-nodes-wiroai](https://www.npmjs.com/package/@wiro-ai/n8n-nodes-wiroai)
- [GitHub: wiroai/n8n-nodes-wiroai](https://github.com/wiroai/n8n-nodes-wiroai)

---


# Agent Overview

Deploy and manage autonomous AI agents through a single API.

## Wiro Agents on the Web

The endpoints below cover the full programmatic surface. If you also want to see the web product alongside what you're building — landing pages, marketing copy, the visual catalog, and the no-code Build Your Own Agent flow — these are the public Wiro pages dedicated to agents:

| Page | URL | What it covers |
|------|-----|----------------|
| **AI Agents Home** | [wiro.ai/agents](https://wiro.ai/agents) | Top-level landing — what Wiro Agents are, how they compare to traditional setups, and a featured selection from the marketplace. |
| **Learn About Agents** | [wiro.ai/agents/learn](https://wiro.ai/agents/learn) | Concept primer — pricing model, security model, deployment lifecycle, and the difference between marketplace templates and custom builds. |
| **Anatomy of an Agent** | [wiro.ai/agents/anatomy](https://wiro.ai/agents/anatomy) | Fullscreen interactive walkthrough of the pieces that make a Wiro agent reason — system prompt, knowledge, skills, memory, guardrails, model, tools, scheduling, and observability. |
| **Build Your Own Agent** | [wiro.ai/agents/build](https://wiro.ai/agents/build) | The web wizard for the same custom-build flow exposed by [`POST /UserAgent/Deploy`](#post-useragentdeploy) with `custom: true`. Useful for previewing the skill picker / pricing breakdown before scripting it. |
| **Browse Agents** | [wiro.ai/agents/browse](https://wiro.ai/agents/browse) | Full marketplace catalog with categories, descriptions, screenshots, and per-agent tier prices — the visual mirror of [`POST /Agent/List`](#post-agentlist). Each row links to a dedicated agent page at `/agents/{slug}`. |
| **Use Case Showcases** | [wiro.ai/agents/usecase/...](https://wiro.ai/agents) | Seven fullscreen, auto-looping product stories that show real businesses operated end-to-end by a Wiro agent. See [Agent Use Cases](/docs/agent-use-cases#see-these-use-cases-on-the-web) for the full list. |

> All pages are public — no Wiro account required to browse. Sign-in becomes mandatory only when you click "Deploy" on a specific agent (which then drops you into the Wiro dashboard at [wiro.ai/panel/agents](https://wiro.ai/panel/agents)).

## What are Wiro Agents?

Wiro Agents are autonomous AI assistants that run persistently in isolated containers. Unlike one-shot model runs, agents maintain conversation memory, connect to external services, and use tools to complete tasks on your behalf — all managed through the API.

The system has two layers:

- **Agent templates** (the catalog) — Pre-built agent definitions published by Wiro. Each template defines the agent's default skill set, required credentials, the per-tier credit multiplier, and a per-instance pricing recipe. Browse the catalog with `POST /Agent/List`.
- **UserAgent instances** (your deployments) — When you deploy an agent template (or build a custom one), Wiro creates a personal instance tied to your account. Each instance runs in its own container with its own credentials, configuration, conversation history, billing, and per-model token-rate profile.

Every instance is fully isolated. Your credentials, conversations, and data are never shared with other users.

> **Two deploy paths.** You can deploy a marketplace template by passing `agentguid`, **or** build a custom agent from scratch with `custom: true` (no template — you pick the skill set yourself). Both flows are documented under [`POST /UserAgent/Deploy`](#post-useragentdeploy). The custom builder is detailed in [Agent Builder](/docs/agent-builder).

## Base URL

```
https://api.wiro.ai/v1
```

## Authentication

Agents use the same authentication as the rest of the Wiro API. Include your key in every request:

| Method | Header |
|--------|--------|
| API Key | `x-api-key: YOUR_API_KEY` |
| Bearer Token | `Authorization: Bearer YOUR_API_KEY` |

**Public endpoints** — `Agent/List`, `Agent/Detail`, `Skills/List`, `Skills/Detail`, `Skills/Capabilities`, `Credentials/List`, and `Credentials/Detail` are catalog endpoints and do not require authentication. You can browse available agents, the skill registry, and the credential schema without an API key.

**Authenticated endpoints** — All `UserAgent/*` endpoints require a valid API key.

For full details, see [Authentication](/docs/authentication).

## Pricing Model — Tiers, Skills & Token Billing

Agent pricing is **fully derived from the agent's enabled skill set** plus a per-template `tiermultiplier`. There are no fixed `agent.basemonthlypriceusd` columns and no `useragents.rate*cost` overrides — those were dropped in favor of skill-driven pricing. The single source of truth is the skill registry, exposed via [`POST /Skills/List`](/docs/agent-skills#post-skillslist) and [`POST /Skills/Detail`](/docs/agent-skills#post-skillsdetail).

Pricing has **two layers**: a monthly **tier** (price + credit pool, set by the enabled skills) and **per-turn token billing** (each message / cron / voice-prep turn deducts credits from that pool, metered by the tokens the agent's model consumes).

### Tiers

Every agent ships with two tier presets: **Starter** and **Pro**. Each tier has its own `price` (USD/month) and `credits` (monthly credit allowance). The relationship between the two is fixed by the agent's `tiermultiplier`:

```
pro.price   = starter.price   × tiermultiplier
pro.credits = starter.credits × tiermultiplier
```

`tiermultiplier` defaults to `10` if the template omits it. Each agent template's tier numbers (and the `tiermultiplier`) appear on every catalog response under the `tiers` object:

```json
"tiers": {
  "starter": { "priceUsd": 9, "credits": 225 },
  "pro":     { "priceUsd": 90, "credits": 2250 }
}
```

> **Starter tier minimum: $4/month.** Every agent with at least one paid skill pays at least $4/month on Starter. When the raw sum of enabled-skill weights would land below $4, the resolver bumps the Starter price up to $4 **and** scales the credit pool up by the same ratio — so the user gets a proportional credit increase, not a free upgrade. Agents with zero paid skills (rule-only, or all-`ZERO`-tier skills) stay at `$0` / `0` credits. Default Pro = Starter × `tiermultiplier` (default `10`), so an agent that lands on the $4 floor pays **$40/month on Pro** with the same credit pool × 10.

### Token Billing

The monthly tier buys a **credit pool**; each turn the agent runs (a chat reply, a scheduled cron tick, or a voice-prep turn) deducts credits from that pool, **metered by the tokens its model consumes**. There are no flat per-action costs — what a turn costs depends on the model and how many input / output / cached tokens it used.

Per-model rates live in the `tokenRates` object, present on `Agent/Detail`, `UserAgent/Detail`, `MyAgents`, `PinnedAgents`, and `PricingPreview`. The marketplace catalog (`Agent/Detail`) and `PricingPreview` return only the **selectable** models; a deployed instance's `UserAgent/Detail` / `MyAgents` / `PinnedAgents` return the **full** model map (so historical model-change markers and token-usage tooltips can still resolve a model that ops later marked non-selectable). Internal ops metadata (`$`-prefixed keys) is stripped from every response:

```json
"tokenRates": {
  "default_model": "openai/gpt-5.6-sol",
  "fallback_rate": { "input_per_1m": 625, "output_per_1m": 3750, "cached_input_per_1m": 62.5, "cache_write_per_1m": 781.25 },
  "models": {
    "openai/gpt-5.6-sol": { "input_per_1m": 625, "output_per_1m": 3750, "cached_input_per_1m": 62.5, "cache_write_per_1m": 781.25, "selectable": true, "label": "GPT-5.6 Sol", "tier": "premium" },
    "openai/gpt-5.6-terra": { "input_per_1m": 250, "output_per_1m": 1500, "cached_input_per_1m": 25, "cache_write_per_1m": 312.5, "selectable": true, "label": "GPT-5.6 Terra", "tier": "balanced" },
    "openai/gpt-5.6-luna": { "input_per_1m": 25, "output_per_1m": 150, "cached_input_per_1m": 2.5, "cache_write_per_1m": 31.25, "selectable": true, "label": "GPT-5.6 Luna", "tier": "cheap" }
  }
}
```

Rates are quoted in **credits per 1,000,000 tokens**, and **1 credit = $0.01** (100 credits = $1). Wiro prices every LLM call against the model that actually served that call, sums each token category across the turn, and rounds the four aggregate categories up independently:

```
tokencost = ceil(Σ call_input_cost)
          + ceil(Σ call_output_cost)
          + ceil(Σ call_cache_read_cost)
          + ceil(Σ call_cache_write_cost)
```

Cache-read and cache-write categories are charged only when the selected model rate defines them. `inputtokens` contains only uncached input; `totaltokens` is always the exact sum of input, output, cache-read, and cache-write tokens. For models with `long_context_threshold_tokens`, Wiro selects the long-context rate **per LLM call** using `input + cacheRead + cacheWrite`; it never infers a surcharge from a turn-level aggregate that lost call boundaries. You don't send anything — the agent runtime reports exact call-level usage after each turn, Wiro deducts the credits once, and records a ledger row with `action: "tokens"` (see [`POST /UserAgent/TransactionList`](/docs/agent-transactions#post-useragenttransactionlist)). Per-turn token counts and cost also ride on each assistant message (`inputtokens` / `outputtokens` / `cachereadtokens` / `cachewritetokens` / `totaltokens` / `tokencost` / `model` — see [Agent Messaging](/docs/agent-messaging)).

When the credit pool is exhausted, [`POST /UserAgent/Message/Send`](/docs/agent-messaging#post-useragentmessagesend) and [`POST /UserAgent/Start`](#post-useragentstart) refuse with an `Agent has no remaining credits…` error plus an `agentbalance` snapshot; renew the subscription or buy an extra credit pack to continue.

> **Voice realtime audio is billed separately.** Live voice-call audio (for `util-voice-receptionist` agents) is **not** charged to the platform credit pool — it flows through the operator's own Wiro AI Models balance via the `int-wiro-aimodels` skill (you bring your own Wiro API key). Only the post-call text turn is billed as a normal token deduct.

### Live Pricing Preview

Before you commit a skill change or build a custom agent, fetch a live preview with [`POST /UserAgent/PricingPreview`](#post-useragentpricingpreview). The preview returns the post-toggle `tiers`, `tokenRates`, `starterFloorUsd`, and `enabledSkills` (with transitive `depends_on` resolved) without writing any state.

## Agent Lifecycle

Deploying and running an agent follows this flow:

1. **Browse** — call `POST /Agent/List` to discover available agents in the catalog
2. **Deploy** — call `POST /UserAgent/Deploy` with `useprepaid: true` and `tier` (`"starter"` or `"pro"`). The selected tier price is debited from your prepaid wallet immediately and a 30-day subscription row is created.
3. **Configure** — set integration and optional Telegram, Slack, or Discord credentials with `POST /UserAgent/CredentialUpsert`, and preferences with `POST /UserAgent/CustomSkillUpsert`. See [Agent Credentials](/docs/agent-credentials) for details
4. **Start** — call `POST /UserAgent/Start` to queue the agent for launch
5. **Running** — the agent's container starts and the agent becomes available for conversation
6. **Chat** — send messages via `POST /UserAgent/Message/Send`. See [Agent Messaging](/docs/agent-messaging) for the full messaging API

## UserAgent Statuses

Every deployed agent instance has a numeric status that reflects its current state:

| Status | Name | Description |
|--------|------|-------------|
| `0` | Stopped | Agent is not running. Call Start to launch it. |
| `1` | Stopping | Agent is shutting down. Wait for it to reach Stopped before taking action. |
| `2` | Queued | Agent is queued and waiting for a worker to pick it up. |
| `3` | Starting | A worker has accepted the agent and is spinning up the container. |
| `4` | Running | Agent is live and ready to receive messages. |
| `5` | Error | Agent encountered an error during execution. Call Start to retry. |
| `6` | Setup Required | Agent needs credentials or configuration before it can start. Provide them via `CredentialUpsert` / `CustomSkillUpsert` / `SkillsApply`. |

### Automatic Restart (`restartafter`)

When you mutate an agent's configuration while it is **starting** (status `3`) or **running** (status `4`), the system automatically triggers a restart cycle: the agent is moved to **Stopping** (status `1`) with `restartafter` set to `true`. Once the container fully stops, the system automatically re-queues it, applying the new configuration on startup.

This means you can update credentials, toggle skills, or change a custom skill on a running agent without manually stopping and starting it.

Endpoints that auto-trigger a restart on success: `CredentialUpsert`, `SkillsApply`, `CustomSkillUpsert` (when functional fields change), `CustomSkillRename`, `CustomSkillDelete`, `CustomSkillRevert`, `Update` (scalar edits).

## Endpoints

### Browse the Catalog

#### **POST** /Agent/List

Lists available agents in the catalog. This is a **public endpoint** — no authentication required.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `search` | string | No | Full-text search across agent titles and descriptions |
| `category` | string | No | Filter by category (e.g. `"productivity"`, `"social-media"`) |
| `sort` | string | No | Sort column: `id`, `title`, `slug`, `status`, `createdat`, `updatedat`, `totalrun`, `activerun`. Default: `id` |
| `order` | string | No | Sort direction: `ASC` or `DESC`. Default: `DESC` |
| `limit` | number | No | Results per page (max 1000). Default: `20` |
| `start` | number | No | Offset for pagination. Default: `0` |

##### Response

```json
{
  "result": true,
  "errors": [],
  "total": 12,
  "agents": [
    {
      "guid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "title": "Instagram Manager",
      "slug": "instagram-manager",
      "headline": "Automate your Instagram presence with AI",
      "description": "An autonomous agent that manages your Instagram account...",
      "cover": "https://cdn.wiro.ai/uploads/agents/instagram-manager-cover.webp",
      "categories": ["social-media", "marketing"],
      "samples": ["https://cdn.wiro.ai/uploads/agents/instagram-manager-sample-1.webp"],
      "tiermultiplier": 10,
      "tiers": {
        "starter": { "priceUsd": 9, "credits": 225 },
        "pro":     { "priceUsd": 90, "credits": 2250 }
      },
      "status": 1,
      "createdat": "1711929600",
      "updatedat": "1714521600"
    }
  ]
}
```

> `Agent/List` returns only catalog-header columns plus inlined `tiers` (so the catalog card can render the price without a per-row `Agent/Detail` round-trip). The `id` / `totalrun` / `activerun` columns are stripped for the public role. Call `POST /Agent/Detail` with `type: "full"` when you need the full template (skills map, credential schema, custom skills, scheduled skills).

#### **POST** /Agent/Detail

Retrieves details for a single agent by guid or slug. This is a **public endpoint** — no authentication required.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `guid` | string | No* | Agent guid. |
| `slug` | string | No* | Agent slug (e.g. `"instagram-manager"`). |
| `type` | string | No | Pass `"full"` to also include `customskills` and `scheduledskills` arrays in the response. Without `type: "full"`, the response carries the catalog header + `tiers` + `tokenRates` + `credentials` + `skills` + `skillsmeta` only. |

> **Note:** You must provide either `guid` or `slug`. If both are provided, `slug` takes priority. Pass `type: "full"` when you need to preview custom skill keys and scheduled skill cron expressions before deploying; omit it for a lightweight catalog detail call.

##### Response

```json
{
  "result": true,
  "errors": [],
  "agents": [
    {
      "guid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "title": "Instagram Manager",
      "slug": "instagram-manager",
      "headline": "Automate your Instagram presence with AI",
      "description": "An autonomous agent that manages your Instagram account...",
      "cover": "https://cdn.wiro.ai/uploads/agents/instagram-manager-cover.webp",
      "categories": ["social-media", "marketing"],
      "samples": ["https://cdn.wiro.ai/uploads/agents/instagram-manager-sample-1.webp"],
      "tiermultiplier": 10,
      "tiers": {
        "starter": { "priceUsd": 9, "credits": 225 },
        "pro":     { "priceUsd": 90, "credits": 2250 }
      },
      "tokenRates": {
        "default_model": "openai/gpt-5.6-sol",
        "fallback_rate": { "input_per_1m": 625, "output_per_1m": 3750, "cached_input_per_1m": 62.5, "cache_write_per_1m": 781.25 },
        "models": {
          "openai/gpt-5.6-sol": { "input_per_1m": 625, "output_per_1m": 3750, "cached_input_per_1m": 62.5, "cache_write_per_1m": 781.25, "selectable": true, "label": "GPT-5.6 Sol", "tier": "premium" },
          "openai/gpt-5.6-terra": { "input_per_1m": 250, "output_per_1m": 1500, "cached_input_per_1m": 25, "cache_write_per_1m": 312.5, "selectable": true, "label": "GPT-5.6 Terra", "tier": "balanced" },
          "openai/gpt-5.6-luna": { "input_per_1m": 25, "output_per_1m": 150, "cached_input_per_1m": 2.5, "cache_write_per_1m": 31.25, "selectable": true, "label": "GPT-5.6 Luna", "tier": "cheap" }
        }
      },
      "skills": ["int-instagram-post", "int-wiro-aimodels"],
      "skillsmeta": {
        "int-instagram-post": {
          "name": "int-instagram-post",
          "title": "Instagram Post",
          "icon": "https://wiro.ai/images/icons/skills/instagram.svg",
          "brand_color": "#e4405f",
          "brand_text_color": "#ffffff",
          "brand_logo_filter": "brightness(0) invert(1)",
          "category": "int",
          "docs_url": "integration-instagram-skills",
          "credential_key": "instagram",
          "additional_credential_keys": [],
          "requires_credentials": true,
          "user_invocable": true,
          "deprecated": false,
          "replacement": null,
          "description": "Post carousel feed and multi-story via Meta Graph API."
        },
        "int-wiro-aimodels": {
          "name": "int-wiro-aimodels",
          "title": "Wiro AI Models",
          "icon": "https://wiro.ai/images/icons/skills/wiro.svg",
          "brand_color": "#33F2BC",
          "brand_text_color": "#0F1A24",
          "brand_logo_filter": null,
          "category": "int",
          "docs_url": null,
          "credential_key": "wiro",
          "additional_credential_keys": [],
          "requires_credentials": true,
          "user_invocable": false,
          "deprecated": false,
          "replacement": null,
          "description": "Internal: lets the agent call Wiro's own image / video / LLM generation API. Other skills invoke it; users do not."
        }
      },
      "credentials": {
        "instagram": {
          "optional": false,
          "extra": false,
          "_editable": { "authmethod": true, "systemusertoken": true, "igusername": true },
          "_schema": {
            "title": "Instagram",
            "icon": "https://wiro.ai/images/icons/skills/instagram.svg",
            "brand_color": "#e4405f",
            "brand_text_color": "#ffffff",
            "brand_logo_filter": "none",
            "docs_url": "integration-instagram-skills",
            "credential_mode": "hybrid",
            "connection_modes": ["api_key", "own", "wiro"],
            "default_connection_mode": "api_key",
            "mode_badges": { "api_key": "Recommended", "own": "Advanced" },
            "wiro_connect_pending": true,
            "oauth_provider": {
              "auth_method_value": "wiro",
              "connect_endpoint": "/UserAgentOAuth/OAuthConnect",
              "disconnect_endpoint": "/UserAgentOAuth/OAuthDisconnect",
              "status_endpoint": "/UserAgentOAuth/OAuthStatus",
              "username_field": "igusername",
              "direct_probe": {
                "mode": "api_key",
                "token_field": "systemusertoken",
                "public_account_fields": ["id", "name"]
              },
              "account_picker": {
                "enabled": true,
                "multi_select": true,
                "set_endpoint": "/UserAgentOAuth/SetPickerAccounts",
                "item_value_field": "accountId",
                "item_label_field": "igusername"
              }
            },
            "fields": [
              { "key": "authmethod", "type": "select", "label": "Auth Method", "options": ["api_key", "own", "wiro"], "default": "api_key" },
              { "key": "systemusertoken", "type": "password", "label": "System User Token", "runtime_excluded": true, "only_in_modes": ["api_key"] },
              { "key": "accountId", "type": "text", "label": "Instagram Account ID", "auto_filled_by_oauth": true, "readonly_when_connected": true },
              { "key": "igusername", "type": "text", "label": "Connected Account", "auto_filled_by_oauth": true, "readonly_when_connected": true }
            ]
          },
          "authmethod": "",
          "igusername": "",
          "connectedat": ""
        }
      },
      "extracreditpacks": [],
      "status": 1,
      "createdat": "1711929600",
      "updatedat": "1714521600"
    }
  ]
}
```

> `Agent/Detail` describes the **template**, so its `credentials` block only carries the `optional` / `extra` meta flags plus the registry-driven `_schema` (field labels / types) and `_editable` map. The `_connected` flag is per-instance and appears on `UserAgent/Detail` / `UserAgent/MyAgents`, not on the catalog endpoint. `extracreditpacks` is always `[]` here — packs are derived from the deployed instance's actual monthly allocation (see [Extra Credit Packs](#extra-credit-packs)) and only appear on `UserAgent/Detail`.

**Credential response flags** (on `UserAgent/Detail` / `UserAgent/MyAgents`) — every credential object in the top-level `credentials` tree on the per-instance endpoints carries:

| Flag | Type | Meaning |
|------|------|---------|
| `_connected` | boolean | **Connection readiness indicator.** `true` when Wiro has a validated OAuth or hybrid direct connection and every required picker field (`customerid`, `merchantid`, `channelid`, ad-account, page ID, Instagram account ID, etc.) is populated. Plain API-key and service-account providers that do not write `connectedat` can remain `false`; use `setuprequired` to determine overall setup readiness. |
| `optional` | boolean | `true` when the template marks this credential as not required for the agent to run. Agents can start even if `optional: true` credentials are empty. |
| `extra` | boolean | `true` when the template groups the credential under "extra integrations" in the UI (disabled by default until the user opts into the skill). |
| `_editable` | object | Map of `fieldname → true` for fields the caller may write. Computed from the registry schema + caller role. |
| `_schema` | object | Inlined registry descriptor — `{ title, icon, brand_color, brand_text_color, brand_logo_filter, docs_url, credential_mode, connection_modes[], default_connection_mode, mode_badges, wiro_connect_pending, oauth_provider, fields[] }`. Lets a UI render the form without a separate `Credentials/Detail` round-trip. |

**Field redaction in responses:**

- `fieldstatus: "oauth_session"` fields (`accesstoken`, `refreshtoken`, `tokenexpiresat`, `pageAccessToken`, etc.) — always stripped from every response, regardless of caller role.
- Schema fields marked `runtime_excluded: true` — including Meta
  `systemusertoken` — are write-only setup secrets. They never enter the agent
  runtime and are not reflected to customer-facing credential responses.
- `fieldstatus: "platform"` fields (currently only `credentials.sys-openai.apikey` and its `model` / `fallbacks` / `cronmodel` siblings) — stripped for API callers (role = `user`). The `sys-openai` credential entry itself is also dropped from the response. Only the daemon container ever sees the values. `credentials.wiro.apikey` and `credentials.calendarific.apikey` are operator-supplied user-input fields and appear in the response with `fieldstatus: "user"` like any other API-key credential.
- `fieldstatus: "oauth_app"` fields (`clientsecret`, `appsecret`) — **visible to anyone who can read the credentials**. History writes redact `clientsecret` to `[REDACTED]`, but the live value is returned. Treat them as read-admin-only in your own UI layer.
- Sentinel rows `_isoptional` / `_isextra` — never appear as fields; they're folded into the `optional` and `extra` flags above.

API callers see the non-sensitive fields (public identifiers like `clientid`, display-only values like `igusername`, flags like `authmethod`, and the flags above).

**Communication channel fields** are returned separately from skill and
integration credentials:

| Field | Type | Meaning |
|-------|------|---------|
| `communicationChannels` | array | Full external-channel catalog for this instance. Each row includes `id`, `title`, `credentialkey`, `required_fields`, `capabilities`, `schema`, `enabled`, `configured`, and `missingfields`. Use `schema.fields` to render the setup form. |
| `enabledChannels` | string[] | External channel IDs whose registry-declared activation credentials are complete. Current values are `telegram`, `slack`, and `discord`. Web chat is always available and is not included. |
| `teamsessionmode` | string | The unified Chat Mode. `"private"` isolates team members' Wiro web-chat histories and agent memory plus approved external-channel DM operators; `"collaborative"` shares those histories and runtime contexts. Web and external-channel message lists remain separate transports. Room and thread conversations remain room-scoped. |

The catalog is registry-driven, so all agent templates and existing useragents
can discover new channels without adding template-specific rows. Availability
does not mean activation: an external channel turns on automatically only when
all of its `required_fields`, including immutable operator IDs, are complete.
Existing agents use the normal `CredentialUpsert` flow; there is no separate
channel switch.

### Deploy & Manage

All endpoints below require authentication.

#### **POST** /UserAgent/Deploy

Creates a new agent instance from a catalog template, **or** builds a brand-new custom agent (no template).

> **API agent deployment is prepaid-only.** Pass `useprepaid: true` + `tier` — the subscription cost is deducted from your prepaid wallet immediately and the instance is created server-side in one call. There is no API path that accepts a credit card directly; subscriptions from a card can only be created through the Wiro dashboard at [wiro.ai/panel/agents](https://wiro.ai/panel/agents). Top up your wallet on [wiro.ai/panel/billing](https://wiro.ai/panel/billing) before calling Deploy.

Prepaid deploy (`useprepaid: true` + `tier`) charges your wallet for the chosen tier price immediately and inserts a 30-day subscription row (`plan: "agent"`, `provider: "prepaid"`). **Every fresh Deploy lands at `status: 6` first** — the row is then auto-queued to `status: 2` (Queued) once the prepaid subscription is provisioned. No manual `UserAgent/Start` is needed for prepaid deploys; the daemon picks the row up from the queue.

If you pass `credentials`, `skills`, or `customskills` at the top level of the
Deploy body they are applied server-side in the same call. Chat Mode is not a
Builder/Deploy input: team deploys start collaborative and personal deploys
start private, then owners can change the value with `UpdateSettings`. Complete
channel credential groups activate automatically. Arrays such as
`allowedusers`, Telegram `groups`, Slack `channels`, and Discord `guilds` are
validated against the public registry schema. See
[Agent Credentials → Communication Channels](/docs/agent-credentials#communication-channels)
for the channel contract.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `agentguid` | string | Conditional | The guid of the agent template from the catalog. Required unless `custom: true`. |
| `custom` | boolean | Conditional | Pass `true` to deploy a custom-built agent (no marketplace template). Mutually exclusive with `agentguid`. See [Agent Builder](/docs/agent-builder) for the full builder flow. |
| `title` | string | Yes | Display name for your instance. |
| `description` | string | No | Optional description (custom builds: free-text describing what the agent does). |
| `cover` | string | No | Optional cover image URL. Custom builds only — template deploys clone the agent's cover automatically. |
| `useprepaid` | boolean | Yes | Must be `true` for API deploys. Pays the tier price from your wallet balance in a single server-side call. |
| `tier` | string | No | Tier selection: `"starter"` (default) or `"pro"`. Determines the price + credits debited to your wallet at deploy time. The param name is `tier` — any other value (including typos) is silently coerced to `"starter"`, so a misspelled key yields a Starter-tier instance instead of an error. |
| `credentials` | object | No | Inline credential groups. If a communication-channel group is included, its matching `credentials[credential_key]` object must contain all channel `required_fields`; completeness activates that channel automatically. |
| `skills` | object | No | Inline skill toggles `{ "skillname": true \| false }`. For custom builds this seeds the initial skill set; for template deploys it overlays the template defaults. |
| `customskills` | array | No | Inline custom skill rows. Each entry: `{ key, value?, interval?, enabled?, description?, _user_created? }`. |

**Headers:** Standard API authentication — `x-api-key` for key-based projects, or `x-nonce` + `x-signature` for signature-based projects (see [Authentication](/docs/authentication)). For **team-scoped deploys** (when an end user deploys via a team project), pass `teamGUID: <team-guid>` as an additional request header; the API validates the caller is a team admin before writing the instance row.

> **`teamGUID` header usage across endpoints** — the requirement differs per endpoint:
>
> | Endpoint | `teamGUID` header |
> |----------|-------------------|
> | `UserAgent/Deploy` | Pass when deploying into a team project; validated against team admin before insert |
> | `UserAgent/Message/Send`, `Message/Detail`, `Message/History`, `Message/Sessions`, `Message/Cancel`, `Message/DeleteSession` | **Required for team agents.** Messaging endpoints call `validateAgentContext(teamGUID, ...)` and reject if the header is missing or doesn't match a team the caller belongs to |
> | `UserAgent/Detail`, `UserAgent/Update`, `UserAgent/Start`, `UserAgent/Stop`, `UserAgent/MyAgents` | Optional — these endpoints fall back to "am I a member of this agent's team?" check, so the header isn't strictly needed if your user already has team membership. Passing it is still recommended for explicitness and to avoid ambiguity on multi-team users |
> | `UserAgent/CancelSubscription`, `UserAgent/CreateExtraCreditCheckout`, `UserAgent/UpgradeTier`, `UserAgent/RenewSubscription`, `UserAgent/CreateSubscriptionCheckout` | **Required for team agents** — subscription / billing operations also validate team context explicitly |
>
> Personal (non-team) agents ignore this header. If you see `"You are not a member of this team"` or `"Agent not found"` errors on messaging endpoints, you're likely missing the header on a team agent.

##### Request body — template deploy (recommended API pattern)

```json
{
  "agentguid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "title": "My Instagram Bot",
  "useprepaid": true,
  "tier": "starter"
}
```

##### Request body — custom build (Build Your Own Agent)

```json
{
  "custom": true,
  "title": "My Custom Sales Agent",
  "description": "Watches inbound emails and posts a summary to Slack each morning.",
  "useprepaid": true,
  "tier": "pro",
  "skills": {
    "int-gmail-check":    true,
    "int-wiro-aimodels": true
  },
  "credentials": {
    "gmail":    { "account": "agent@company.com", "apppassword": "xxxx xxxx xxxx xxxx" },
    "telegram": { "bottoken": "123456:ABC-DEF...", "allowedusers": ["761381461"] }
  }
}
```

> **Custom builds are skill-driven.** There is no marketplace template behind a custom agent — the price + credit allowance is computed live from the skills you toggle on. Use [`POST /UserAgent/PricingPreview`](#post-useragentpricingpreview) (with `draft: true`) to estimate the tier price before calling Deploy. Full walkthrough: [Agent Builder](/docs/agent-builder).

##### Template deploy vs custom build — what differs server-side

Both paths hit the same endpoint, but a few server-side behaviours diverge:

| Aspect | Template deploy (`agentguid`) | Custom build (`custom: true`) |
|--------|------------------------------|-------------------------------|
| `agentid` on the new useragent row | Snapshotted from the resolved template | `null` — no template back-reference |
| `categories` | Cloned from the agent template | `null` (custom agents have no marketplace categories) |
| `cover` | Cloned from `agent.cover` automatically | Optional — pass `cover` in the body if you want one |
| `tiermultiplier` | **Snapshotted from `agent.tiermultiplier`** so future template tweaks don't retroactively change pricing on already-deployed instances | Fixed at the platform default (`10`) |
| Bundled cron skills | Cloned from the template's preset customskills (`cloneAgentCustomSkillsToUserAgent`) | Materialized from the standalone cron registry based on the enabled skill set (`cloneCustomAgentBundledCrons`) |
| Onboarding placeholders | None — the template ships its own preset strategies | One invocation-only `cs-my-custom-strategy` and one scheduled `cs-cron-my-scheduled-task` are seeded so the panel always has something to render under "Custom Skills" / "Scheduled Skills" |
| Platform-managed credentials (currently `sys-openai` only) | Inherited from the template's preset `agentcredentialfields` | Seeded directly onto the useragent so `composeRuntimeConfig` has a non-empty merge input |
| Marketplace counter (`agents.totalrun`) | Bumped by 1 | Not touched (custom agents have no template to count against) |
| `tiers` / `extracreditpacks` in the response | Read from the template definition | Pre-subscribe state — `tiers` reflects the live registry pricing for the toggled skills, `extracreditpacks: []` until the subscription provisions |

##### Response

```json
{
  "result": true,
  "errors": [],
  "useragents": [
    {
      "guid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
      "uuid": "your-user-uuid",
      "agentguid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "teamguid": null,
      "title": "My Instagram Bot",
      "description": null,
      "tier": "starter",
      "tiermultiplier": 10,
      "credentials": {
        "instagram": {
          "_connected": false,
          "optional": false,
          "extra": false,
          "_editable": { "authmethod": true, "systemusertoken": true, "igusername": true },
          "_schema": { "title": "Instagram", "credential_mode": "hybrid", "connection_modes": ["api_key", "own", "wiro"], "default_connection_mode": "api_key", "fields": [ "..." ] },
          "authmethod": "",
          "igusername": "",
          "connectedat": ""
        }
      },
      "skills": ["int-instagram-post", "int-wiro-aimodels"],
      "customskills": [],
      "scheduledskills": [],
      "monthlycredits": 225,
      "monthlypriceusd": 9,
      "extracredits": 0,
      "usedcredits": 0,
      "remainingcredits": 225,
      "creditperiod": "2026-05",
      "creditsyncat": null,
      "tokenRates": {
        "default_model": "openai/gpt-5.6-sol",
        "fallback_rate": { "input_per_1m": 625, "output_per_1m": 3750, "cached_input_per_1m": 62.5, "cache_write_per_1m": 781.25 },
        "models": {
          "openai/gpt-5.6-sol": { "input_per_1m": 625, "output_per_1m": 3750, "cached_input_per_1m": 62.5, "cache_write_per_1m": 781.25, "selectable": true, "label": "GPT-5.6 Sol", "tier": "premium" },
          "openai/gpt-5.6-terra": { "input_per_1m": 250, "output_per_1m": 1500, "cached_input_per_1m": 25, "cache_write_per_1m": 312.5, "selectable": true, "label": "GPT-5.6 Terra", "tier": "balanced" },
          "openai/gpt-5.6-luna": { "input_per_1m": 25, "output_per_1m": 150, "cached_input_per_1m": 2.5, "cache_write_per_1m": 31.25, "selectable": true, "label": "GPT-5.6 Luna", "tier": "cheap" }
        }
      },
      "agentModel": {
        "chatModel": "openai/gpt-5.6-sol",
        "cronModel": "openai/gpt-5.4-mini",
        "voicePrepModel": "openai/gpt-5.4-mini",
        "voicePostcallModel": "openai/gpt-5.4"
      },
      "teamsessionmode": "private",
      "status": 6,
      "setuprequired": true,
      "pinned": false,
      "agent": {
        "guid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "title": "Instagram Manager",
        "slug": "instagram-manager",
        "cover": "https://cdn.wiro.ai/uploads/agents/instagram-manager-cover.webp",
        "categories": ["social-media", "marketing"],
        "tiermultiplier": 10,
        "tiers": {
          "starter": { "priceUsd": 9, "credits": 225 },
          "pro":     { "priceUsd": 90, "credits": 2250 }
        },
        "extracreditpacks": [
          { "packkey": "small",  "credits": 1125, "priceusd": 45,  "enabled": true },
          { "packkey": "medium", "credits": 2250, "priceusd": 90,  "enabled": true },
          { "packkey": "large",  "credits": 4500, "priceusd": 180, "enabled": true }
        ]
      },
      "createdat": 1714608000,
      "updatedat": 1714608000
    }
  ]
}
```

##### Status and `setuprequired` on deploy

The Deploy response reflects the same composed shape you get from `UserAgent/Detail`. **Every fresh Deploy starts at `status: 6` (Setup Required)**. From there, the prepaid path auto-queues the row to `status: 2` after subscription provisioning:

| Field | Meaning |
|-------|---------|
| `status: 6` | **Setup Required** — initial state for every fresh Deploy. With `useprepaid: true`, auto-queues to `status: 2` as soon as the subscription is provisioned, regardless of credential completeness. If credentials are still missing when the daemon picks the row up, the start fails with `Agent setup is not complete` and the row drops to `status: 5` (Errored). Fill the missing credentials with `POST /UserAgent/CredentialUpsert`, then call `POST /UserAgent/Update` (any scalar body — even just `{ "guid": "<useragent-guid>" }`) to flip the row back to `status: 0` (Stopped) — `Update` is the endpoint that performs the `setuprequired` re-check and the `6 → 0` transition. Then call `Start` to launch. |
| `status: 2` | **Queued** — `useprepaid: true` charged the wallet, the subscription was provisioned, and the daemon's pickup loop will start the container. No manual `UserAgent/Start` is required. |
| `setuprequired: true` | Any non-optional credential is missing. While `true`, `Start` rejects with `Agent setup is not complete`. |
| `setuprequired: false` | All non-optional credentials complete. The next `POST /UserAgent/Update` call flips the row 6 → 0 if it was sitting at Setup Required; `Start` then launches it normally. |

> **Subscription on deploy:** the `useragents.subscription` field is **not** included in the Deploy response (it's assembled from the `subscriptions` table). A prepaid subscription row (`plan: "agent"`, provider `prepaid`, `tier` matches what you passed) is inserted server-side during the Deploy call — call `POST /UserAgent/Detail` with the returned `guid` to read the subscription object back.

Next steps for the API integration flow:

1. Inspect `credentials` in the Deploy response (or call `POST /UserAgent/Detail`) to see each provider's fields, the `optional` / `extra` flags, the registry-driven `_schema`, and the `_connected` OAuth status.
2. Call `POST /UserAgent/CredentialUpsert` per provider (or in bulk via the `fields[]` array) to write API keys, bot tokens, WordPress credentials, etc. For OAuth providers (Meta, Google Ads, HubSpot, …) use the unified `/UserAgentOAuth/OAuthConnect` flow with `credentialkey` — see [Agent Credentials & OAuth](/docs/agent-credentials).
3. Call `POST /UserAgent/CustomSkillUpsert` per skill to customize strategy text or cron intervals, if the template exposes any.
4. Once all non-optional credentials are filled, the row's `setuprequired` flag flips to `false`. If the prepaid subscription was already provisioned during Deploy, the daemon picks the row up from the queue automatically and the status progresses `2` → `3` (Starting) → `4` (Running).
5. If you want to re-launch a stopped agent (status `0`) or recover an errored one (status `5`), call `POST /UserAgent/Start` explicitly.

##### Idempotency — duplicate Deploy guard

Deploy rejects a second call from the same `(uuid, agentid, teamguid)` tuple within a 10-second window. Custom builds (`agentid IS NULL`) dedup on `(uuid, title, teamguid)` instead. The rejection carries a top-level `existingUserAgentGuid` field so callers can adopt the row that already won the race instead of retrying:

```json
{
  "result": false,
  "errors": [
    {
      "code": 99,
      "message": "Duplicate deploy: an identical agent (\"My Instagram Bot\") was already deployed 4s ago. Open the existing one in your panel, or wait a few seconds and retry."
    }
  ],
  "existingUserAgentGuid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321"
}
```

This guards against double-tap CTAs, client-side retries, and ALB/CDN retries on transient 5xx responses creating duplicate subscriptions and double-charging the wallet. `existingUserAgentGuid` is the only top-level field added on this error — the `errors[]` array always carries `code: 99` for the dedup hit.

> **Tip — keep your dashboard clean.** Deployed instances always land pinned in your account. To unpin programmatically (e.g. after bulk-provisioning one instance per customer) call [`POST /UserAgent/Pin`](#post-useragentpin) with `{ "useragentguid": "...", "pinned": false }` immediately after the Deploy call resolves.

#### **POST** /UserAgent/MyAgents

Lists all agent instances deployed under your account.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sort` | string | No | Sort column: `id`, `title`, `status`, `createdat`, `updatedat`, `startedat`, `runningat`, `stopdat`. Default: `id` |
| `order` | string | No | Sort direction: `ASC` or `DESC`. Default: `DESC` |
| `limit` | number | No | Results per page (max 1000). Default: `20` |
| `start` | number | No | Offset for pagination. Default: `0` |
| `category` | string | No | Filter by category (comma-separated for multiple) |

> **Pagination:** the response does not include a `total` count. To know if there are more pages, call with `limit: 20` and inspect the returned array length — if it equals your `limit`, paginate further by incrementing `start` (e.g. `start: 20, 40, 60, ...`) until you get fewer rows than your `limit`.

##### Response

```json
{
  "result": true,
  "errors": [],
  "useragents": [
    {
      "guid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
      "uuid": "ada-uuid",
      "agentguid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "teamguid": null,
      "title": "My Instagram Bot",
      "description": null,
      "cover": null,
      "categories": ["social-media", "marketing"],
      "tier": "pro",
      "tiermultiplier": 10,
      "monthlypriceusd": 90,
      "monthlycredits": 2250,
      "extracredits": 2000,
      "usedcredits": 1450,
      "creditperiod": "2026-05",
      "creditsyncat": 1714694410,
      "status": 4,
      "pinned": true,
      "teamsessionmode": "private",
      "setuprequired": false,
      "subscription": {
        "plan": "agent",
        "status": "active",
        "amount": 90,
        "currency": "usd",
        "currentperiodend": 1717200000,
        "renewaldate": "2026-06-01T00:00:00.000Z",
        "daysremaining": 62,
        "pendingdowngrade": null,
        "provider": "prepaid"
      },
      "agent": {
        "guid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "title": "Instagram Manager",
        "slug": "instagram-manager",
        "description": "An autonomous agent that manages your Instagram Business account.",
        "cover": "https://cdn.wiro.ai/uploads/agents/instagram-manager-cover.webp",
        "categories": ["social-media", "marketing"],
        "tiermultiplier": 10,
        "tiers": {
          "starter": { "priceUsd": 9, "credits": 225 },
          "pro":     { "priceUsd": 90, "credits": 2250 }
        }
      },
      "enabledSkills": ["int-instagram-post", "int-twitterx-post", "int-wiro-aimodels"],
      "tokenRates": {
        "default_model": "openai/gpt-5.6-sol",
        "fallback_rate": { "input_per_1m": 625, "output_per_1m": 3750, "cached_input_per_1m": 62.5, "cache_write_per_1m": 781.25 },
        "models": {
          "openai/gpt-5.6-sol": { "input_per_1m": 625, "output_per_1m": 3750, "cached_input_per_1m": 62.5, "cache_write_per_1m": 781.25, "selectable": true, "label": "GPT-5.6 Sol", "tier": "premium" },
          "openai/gpt-5.6-terra": { "input_per_1m": 250, "output_per_1m": 1500, "cached_input_per_1m": 25, "cache_write_per_1m": 312.5, "selectable": true, "label": "GPT-5.6 Terra", "tier": "balanced" },
          "openai/gpt-5.6-luna": { "input_per_1m": 25, "output_per_1m": 150, "cached_input_per_1m": 2.5, "cache_write_per_1m": 31.25, "selectable": true, "label": "GPT-5.6 Luna", "tier": "cheap" }
        }
      },
      "agentModel": {
        "chatModel": "openai/gpt-5.6-sol",
        "cronModel": "openai/gpt-5.4-mini",
        "voicePrepModel": "openai/gpt-5.4-mini",
        "voicePostcallModel": "openai/gpt-5.4"
      },
      "extracreditsexpiry": 1730419200,
      "createdat": 1714608000,
      "updatedat": 1714694400,
      "queuedat": 1714694395,
      "startedat": 1714694400,
      "runningat": 1714694410,
      "stoppingat": null,
      "stopdat": null,
      "errordat": null
    }
  ]
}
```

> **`MyAgents` returns one row per useragent with its scalar fields, the trimmed `agent` template summary (no `extracreditpacks`), `subscription`, `setuprequired` (status-based check only), `extracredits` / `extracreditsexpiry`, the resolved `enabledSkills` (template defaults ∪ user overrides, including transitive `depends_on` closure), `tokenRates` (per-model token rates — same map as `UserAgent/Detail.tokenRates`), `agentModel` (the resolved chat / cron / voice-prep / voice-postcall model slugs), and `enabledCommands` (the slash-command allowlist, `null` when uncustomized).** Heavier composed children (`credentials`, `customskills`, `scheduledskills`, `skills`, `skillsmeta`, `remainingcredits`) are **not** included — call `UserAgent/Detail` on a single guid for the full composed shape.

> **`enabledSkills`, `tokenRates`, and `agentModel`** ride on each list row so the dock chat / pinned-agents UI can decide whether to show the realtime voice-call button (`enabledSkills` includes `util-web-channel`) and render the model picker + live token-rate card without round-tripping `UserAgent/Detail` per row.

#### **POST** /UserAgent/Detail

Retrieves full details for a single deployed agent instance, including subscription info, the per-instance credit ledger summary, the resolved per-model token-rate table (`tokenRates`) plus model selection (`agentModel`), and the `extracreditpacks` catalog.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `guid` | string | Yes | Your UserAgent instance guid |

##### Response — prepaid instance (the API deploy pattern)

```json
{
  "result": true,
  "errors": [],
  "useragents": [
    {
      "guid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
      "uuid": "your-user-uuid",
      "agentguid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "teamguid": null,
      "title": "My Instagram Bot",
      "description": null,
      "categories": ["social-media", "marketing"],
      "cover": "https://cdn.wiro.ai/uploads/agents/instagram-manager-cover.webp",
      "tier": "pro",
      "tiermultiplier": 10,
      "status": 4,
      "pinned": true,
      "setuprequired": false,
      "teamsessionmode": "private",
      "credentials": {
        "instagram": {
          "_connected": true,
          "optional": false,
          "extra": false,
          "_editable": {
            "authmethod": true,
            "systemusertoken": true,
            "igusername": true
          },
          "_schema": {
            "title": "Instagram",
            "icon": "https://wiro.ai/images/icons/credentials/instagram.svg",
            "brand_color": "#E4405F",
            "brand_text_color": "#FFFFFF",
            "brand_logo_filter": null,
            "docs_url": "/docs/integration-instagram-skills",
            "credential_mode": "hybrid",
            "connection_modes": ["api_key", "own", "wiro"],
            "default_connection_mode": "api_key",
            "mode_badges": {
              "api_key": "Recommended",
              "own": "Advanced"
            },
            "wiro_connect_pending": true,
            "oauth_provider": {
              "auth_method_value": "wiro",
              "connect_endpoint": "/UserAgentOAuth/OAuthConnect",
              "disconnect_endpoint": "/UserAgentOAuth/OAuthDisconnect",
              "status_endpoint": "/UserAgentOAuth/OAuthStatus",
              "direct_probe": {
                "mode": "api_key",
                "token_field": "systemusertoken",
                "public_account_fields": ["id", "name"]
              },
              "account_picker": {
                "enabled": true,
                "multi_select": true,
                "set_endpoint": "/UserAgentOAuth/SetPickerAccounts",
                "item_value_field": "accountId",
                "item_label_field": "igusername"
              }
            },
            "fields": [
              {
                "key": "authmethod",
                "label": "Authentication Method",
                "type": "select",
                "required": true,
                "options": [
                  { "label": "System User Token", "value": "api_key" },
                  { "label": "Own OAuth app",     "value": "own" },
                  { "label": "Wiro-managed",      "value": "wiro" }
                ],
                "default": "api_key"
              },
              {
                "key": "systemusertoken",
                "label": "System User Token",
                "type": "password",
                "required": true,
                "runtime_excluded": true,
                "only_in_modes": ["api_key"]
              },
              {
                "key": "accountId",
                "label": "Instagram Account ID",
                "type": "text",
                "required": true,
                "auto_filled_by_oauth": true,
                "readonly_when_connected": true
              },
              {
                "key": "igusername",
                "label": "Connected Account",
                "type": "text",
                "required": false,
                "auto_filled_by_oauth": true,
                "readonly_when_connected": true
              }
            ]
          },
          "_required_missing": false,
          "authmethod": "api_key",
          "accountId": "17841400000000000",
          "igusername": "mybrand",
          "connectedat": "2026-05-01T12:00:00.000Z",
          "tokenexpiresat": ""
        },
        "telegram": {
          "_connected": false,
          "optional": true,
          "extra": false,
          "_editable": {
            "bottoken":     true,
            "allowedusers": true,
            "groups":       true
          },
          "_schema": {
            "title": "Telegram",
            "icon": "https://wiro.ai/images/icons/skills/telegram.svg",
            "brand_color": "#24a1de",
            "brand_text_color": "#FFFFFF",
            "brand_logo_filter": "brightness(0) invert(1)",
            "docs_url": "/docs/integration-telegram-skills",
            "credential_mode": "api_key",
            "connection_modes": [],
            "wiro_connect_pending": false,
            "oauth_provider": null,
            "fields": [
              {
                "key": "bottoken",
                "label": "Bot Token",
                "type": "password",
                "required": true,
                "placeholder": "123456789:ABC-DEF1234ghIkl-zyx57W2v1u123ew11",
                "help": "Issued by @BotFather when you create the bot."
              },
              {
                "key": "allowedusers",
                "label": "Allowed User IDs",
                "type": "string-array",
                "required": false,
                "pattern": "^\\d{5,}$"
              },
              {
                "key": "groups",
                "label": "Allowed Telegram Groups",
                "type": "object-array",
                "required": false,
                "item_schema": [
                  { "key": "chatid", "type": "text", "required": true, "pattern": "^-\\d{5,}$" },
                  { "key": "allowedusers", "type": "string-array", "required": true, "pattern": "^\\d{5,}$" }
                ]
              }
            ]
          },
          "_required_missing": false,
          "bottoken": "",
          "allowedusers": [],
          "groups": []
        },
        "wordpress": {
          "_connected": false,
          "optional": false,
          "extra": false,
          "_editable": {
            "siteurl":         true,
            "username":        true,
            "applicationpass": true
          },
          "_schema": {
            "title": "WordPress",
            "icon": "https://wiro.ai/images/icons/credentials/wordpress.svg",
            "brand_color": "#21759B",
            "brand_text_color": "#FFFFFF",
            "brand_logo_filter": null,
            "docs_url": "/docs/integration-wordpress-skills",
            "credential_mode": "api_key",
            "connection_modes": ["api_key"],
            "wiro_connect_pending": false,
            "oauth_provider": null,
            "fields": [
              {
                "key": "siteurl",
                "label": "Site URL",
                "type": "text",
                "required": true,
                "placeholder": "https://blog.example.com",
                "pattern": "^https?://.+"
              },
              {
                "key": "username",
                "label": "Username",
                "type": "text",
                "required": true,
                "placeholder": "wp-editor"
              },
              {
                "key": "applicationpass",
                "label": "Application Password",
                "type": "password",
                "required": true,
                "placeholder": "xxxx xxxx xxxx xxxx xxxx xxxx",
                "help": "Generate from WP Admin → Users → Profile → Application Passwords."
              }
            ]
          },
          "_required_missing": true,
          "siteurl": "",
          "username": "",
          "applicationpass": ""
        }
      },
      "customskills": [
        {
          "key": "cs-content-tone",
          "description": "Brand voice + posting rules read by every content-generation skill on this agent.",
          "value": "## Brand Voice\nTone: friendly, casual, never salesy.\nTarget Audience: indie devs and side-project builders.\n\n## Hashtag Strategy\nMax 3 per post. Always include #BuildInPublic and #Indie.\n\n## Platform Rules\n- Instagram: square images only, carousels for tutorials.\n- Twitter: thread format for posts longer than 200 chars.",
          "enabled": true,
          "interval": null,
          "_source": "preset-strategy",
          "_editable": true,
          "_edited": true
        },
        {
          "key": "cs-content-sources",
          "description": "RSS / sitemap URLs the agent should poll for new content ideas.",
          "value": "## Primary Sources\nhttps://blog.example.com/feed.xml\nhttps://news.ycombinator.com/rss\n\n## CTA URL Pattern\nhttps://example.com/posts/{slug}",
          "enabled": true,
          "interval": null,
          "_source": "preset-strategy",
          "_editable": true,
          "_edited": false
        }
      ],
      "scheduledskills": [
        {
          "key": "cs-cron-content-scanner",
          "description": "Polls the content sources every 4 hours and queues fresh ideas for the post generator.",
          "value": "Scan the configured RSS / sitemap sources, dedupe against last 14 days, and queue up to 3 fresh items into the post pipeline.",
          "enabled": true,
          "interval": "0 */4 * * *",
          "_source": "skill-bundle",
          "_editable": true,
          "_edited": false
        },
        {
          "key": "cs-cron-weekly-roundup",
          "description": "User-created weekly summary cron that posts a Monday recap to Telegram.",
          "value": "Every Monday at 09:00 UTC, summarize last week's published posts (titles + engagement) and post the recap to Telegram.",
          "enabled": true,
          "interval": "0 9 * * 1",
          "_source": "user-created",
          "_editable": true,
          "_edited": false,
          "_user_created": true
        }
      ],
      "skills": [
        { "name": "int-instagram-post", "enabled": true, "_edited": false, "_user_created": false },
        { "name": "int-twitterx-post",  "enabled": true, "_edited": true,  "_user_created": false },
        { "name": "int-wiro-aimodels", "enabled": true, "_edited": false, "_user_created": false }
      ],
      "skillsmeta": {
        "int-instagram-post": {
          "name": "int-instagram-post",
          "title": "Instagram Post",
          "icon": "https://wiro.ai/images/icons/skills/instagram.svg",
          "brand_color": "#e4405f",
          "brand_text_color": "#ffffff",
          "brand_logo_filter": "brightness(0) invert(1)",
          "category": "int",
          "docs_url": "integration-instagram-skills",
          "credential_key": "instagram",
          "additional_credential_keys": [],
          "requires_credentials": true,
          "user_invocable": true,
          "deprecated": false,
          "replacement": null,
          "description": "Post carousel feed and multi-story via Meta Graph API."
        },
        "int-twitterx-post": {
          "name": "int-twitterx-post",
          "title": "X (Twitter) Post",
          "icon": "https://wiro.ai/images/icons/skills/twitterx.svg",
          "brand_color": "#000000",
          "brand_text_color": "#ffffff",
          "brand_logo_filter": "brightness(0) invert(1)",
          "category": "int",
          "docs_url": "integration-twitter-skills",
          "credential_key": "twitterx",
          "additional_credential_keys": [],
          "requires_credentials": true,
          "user_invocable": true,
          "deprecated": false,
          "replacement": null,
          "description": "Compose tweets, threads, and replies on a connected X (Twitter) account."
        },
        "int-wiro-aimodels": {
          "name": "int-wiro-aimodels",
          "title": "Wiro AI Models",
          "icon": "https://wiro.ai/images/icons/skills/wiro.svg",
          "brand_color": "#33f2bc",
          "brand_text_color": "#0f1a24",
          "brand_logo_filter": null,
          "category": "int",
          "docs_url": null,
          "credential_key": "wiro",
          "additional_credential_keys": [],
          "requires_credentials": true,
          "user_invocable": false,
          "deprecated": false,
          "replacement": null,
          "description": "Internal: lets the agent call Wiro's own image / video / LLM generation API. Other skills invoke it; users do not."
        }
      },
      "monthlycredits": 2250,
      "monthlypriceusd": 90,
      "extracredits": 2000,
      "usedcredits": 1450,
      "remainingcredits": 2800,
      "creditperiod": "2026-05",
      "creditsyncat": 1714694410,
      "tokenRates": {
        "default_model": "openai/gpt-5.6-sol",
        "fallback_rate": { "input_per_1m": 625, "output_per_1m": 3750, "cached_input_per_1m": 62.5, "cache_write_per_1m": 781.25 },
        "models": {
          "openai/gpt-5.6-sol": { "input_per_1m": 625, "output_per_1m": 3750, "cached_input_per_1m": 62.5, "cache_write_per_1m": 781.25, "selectable": true, "label": "GPT-5.6 Sol", "tier": "premium" },
          "openai/gpt-5.6-terra": { "input_per_1m": 250, "output_per_1m": 1500, "cached_input_per_1m": 25, "cache_write_per_1m": 312.5, "selectable": true, "label": "GPT-5.6 Terra", "tier": "balanced" },
          "openai/gpt-5.6-luna": { "input_per_1m": 25, "output_per_1m": 150, "cached_input_per_1m": 2.5, "cache_write_per_1m": 31.25, "selectable": true, "label": "GPT-5.6 Luna", "tier": "cheap" }
        }
      },
      "agentModel": {
        "chatModel": "openai/gpt-5.6-sol",
        "cronModel": "openai/gpt-5.4-mini",
        "voicePrepModel": "openai/gpt-5.4-mini",
        "voicePostcallModel": "openai/gpt-5.4"
      },
      "subscription": {
        "plan": "agent",
        "status": "active",
        "amount": 90,
        "currency": "usd",
        "currentperiodend": 1717200000,
        "renewaldate": "2026-06-01T00:00:00.000Z",
        "daysremaining": 28,
        "pendingdowngrade": null,
        "provider": "prepaid"
      },
      "agent": {
        "guid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "title": "Instagram Manager",
        "slug": "instagram-manager",
        "headline": "Automate your Instagram presence with AI",
        "description": "An autonomous agent that manages your Instagram Business account: drafts posts from your RSS feeds, schedules carousels, and replies to DMs.",
        "cover": "https://cdn.wiro.ai/uploads/agents/instagram-manager-cover.webp",
        "icon": "https://cdn.wiro.ai/uploads/agents/instagram-manager-icon.webp",
        "categories": ["social-media", "marketing"],
        "tiermultiplier": 10,
        "tiers": {
          "starter": { "priceUsd": 9,  "credits": 225 },
          "pro":     { "priceUsd": 90, "credits": 2250 }
        },
        "extracreditpacks": [
          { "packkey": "small",  "credits": 11250, "priceusd": 450, "enabled": true },
          { "packkey": "medium", "credits": 22500, "priceusd": 900, "enabled": true },
          { "packkey": "large",  "credits": 45000, "priceusd": 1800, "enabled": true }
        ]
      },
      "extracreditsexpiry": 1730419200,
      "createdat": 1714608000,
      "updatedat": 1714694400,
      "queuedat": 1714694395,
      "startedat": 1714694400,
      "runningat": 1714694410,
      "stoppingat": null,
      "stopdat": null,
      "errordat": null
    }
  ]
}
```

##### Field reference

**Identity & profile**

| Field | Type | Description |
|-------|------|-------------|
| `guid` | `string` | Unique identifier for this agent instance. |
| `uuid` | `string` | Owner account UUID (the user who deployed). |
| `agentguid` | `string\|null` | Catalog template GUID this instance was deployed from. `null` for custom builds (always check `agent.custom === true` to detect those). |
| `teamguid` | `string\|null` | Team GUID when the agent is team-scoped. `null` for personal agents. |
| `title` | `string` | Display name you gave this instance at deploy. |
| `description` | `string\|null` | Long-form description shown on the agent card. |
| `cover` | `string\|null` | Per-instance cover URL. Falls back to `agent.cover` for template deploys; `null` for custom builds without an uploaded cover. |
| `categories` | `array<string>` | Inherited from the template at deploy; editable via `Update`. |
| `pinned` | `boolean` | `true` when the user pinned this instance to the global header dropdown. Mutate via `Pin`. |

**Tier & pricing**

| Field | Type | Description |
|-------|------|-------------|
| `tier` | `string` | `"starter"` or `"pro"` — the active tier for this instance. |
| `tiermultiplier` | `number` | Per-instance Pro multiplier — snapshotted at deploy from the template (default `10`). Pro `monthlypriceusd` = Starter × `tiermultiplier`. The value is fixed for the life of the instance — it is captured at deploy time and is not refreshed when the platform default changes. |
| `monthlypriceusd` | `number` | Monthly USD price snapshotted at deploy / renewal. Mirrors `subscription.amount`. |
| `monthlycredits` | `number` | Monthly credit allocation snapshotted at deploy / renewal. |
| `extracredits` | `number` | Active extra-credit balance (sum of non-expired packs from `CreateExtraCreditCheckout`). |
| `extracreditsexpiry` | `number\|null` | Unix timestamp when the earliest extra credit pack expires. `null` when no extras are active. |
| `usedcredits` | `number` | Credits consumed during the current billing period, reported by the agent runtime. |
| `remainingcredits` | `number` | Computed: `max(0, monthlycredits + extracredits - usedcredits)`. |
| `creditperiod` | `string` | `'YYYY-MM'` tag of the current billing window. Rolls over on subscription renewal. |
| `creditsyncat` | `number\|null` | Unix seconds of the last agent → API usage sync (`null` before the first report). |
| `tokenRates` | `object\|null` | Per-model token-billing rates (credits per 1,000,000 tokens). Shape: `{ default_model, fallback_rate, models: { "<slug>": { input_per_1m, output_per_1m, cached_input_per_1m?, cache_write_per_1m?, selectable?, label?, tier? } } }`. Each turn's cost is metered from these rates (1 credit = $0.01) — see [Token Billing](#pricing-model--tiers-skills--token-billing). `null` only on registry-read failure. |
| `agentModel` | `object` | The resolved model slugs this instance runs: `{ chatModel, cronModel, voicePrepModel, voicePostcallModel }` (camelCase). Each falls back to the platform default when the operator hasn't overridden it. Change them via [`POST /UserAgent/UpdateSettings`](#post-useragentupdatesettings) using the lowercase keys `chatmodel` / `cronmodel` / `voiceprepmodel` / `voicepostcallmodel`. |
| `enabledCommands` | `array<string>\|null` | The in-chat slash-command allowlist (camelCase read). `null` = the operator never customized it, so **all** slash commands are available. An array (including `[]`) is an explicit allowlist of command keys (no leading slash); `[]` hides the slash-command menu. Write it via [`POST /UserAgent/UpdateSettings`](#post-useragentupdatesettings) with the lowercase `enabledcommands` key. Also present on `MyAgents` / `PinnedAgents` rows. |

**Lifecycle**

| Field | Type | Description |
|-------|------|-------------|
| `status` | `number` | Current status code (see [UserAgent Statuses](#useragent-statuses)). |
| `setuprequired` | `boolean` | `true` if any required credential is missing or incomplete. Mirrors `status: 6` plus a fresh check against the live credential rows. |
| `createdat` / `updatedat` / `queuedat` / `startedat` / `runningat` / `stoppingat` / `stopdat` / `errordat` | `number\|null` | Unix seconds for each lifecycle transition. `null` until the corresponding state is reached. |

**Composed children**

| Field | Type | Description |
|-------|------|-------------|
| `credentials` | `object` | Per-provider credential map keyed by credential name (`instagram`, `telegram`, `wordpress`, …). Each provider object carries the live field values plus a fixed metadata header — see "Credential object shape" below. |
| `customskills` | `array` | Composed list of preset strategies and **non-cron** custom skills (writable instructions). Each entry: `{ key, description, value, enabled, interval: null, _source, _editable, _edited, _user_created? }`. `_source` ∈ `"preset-strategy"` \| `"user-created"`. |
| `scheduledskills` | `array` | Composed list of **cron** skills (`cs-cron-*`). Same shape as `customskills` plus `interval` (cron expression). `_source` ∈ `"skill-bundle"` (preset cron) \| `"user-created"`. |
| `skills` | `array<object>` | Currently-enabled integration skills. Each entry: `{ name, enabled: true, _edited, _user_created }`. Toggle via `SkillsApply` (single-skill or batch). Note: object array (not string array). |
| `skillsmeta` | `object` | Inline registry snapshot keyed by skill name — `title`, `icon`, `brand_color`, `category`, `docs_url`, `credential_key`, `requires_credentials`, `user_invocable`, `description`. Lets the panel render skill chips without a `Skills/List` round-trip. |
| `teamsessionmode` | `string` | The unified Chat Mode: `"collaborative"` or `"private"` for every agent. For team agents it drives `Message/History`, `Sessions`, and native web-chat memory scope; for all agents it also drives Telegram, Slack, and Discord DM scope. Team deployments/transfers default collaborative; personal deployments/team detachments default private. Write with [`POST /UserAgent/UpdateSettings`](#post-useragentupdatesettings) (team admins / owner only). |
| `timezone` | `string\|null` | Operator-selected IANA timezone (e.g. `"Europe/Istanbul"`, `"America/New_York"`). `null` means **system default (UTC)** — the agent container runs `TZ=UTC` and `current_time` in voice prep stays in UTC ISO form. When set, propagates through `settings.json.useragentTimezone` → container `TZ` env → cron `schedule.tz` → caller-facing voice prep / business-hours rendering. Write with [`POST /UserAgent/UpdateSettings`](#post-useragentupdatesettings). |

**Subscription & template**

| Field | Type | Description |
|-------|------|-------------|
| `subscription` | `object\|null` | Active subscription info (see "Subscription object" below), or `null` when the agent has no active subscription. For API-deployed instances this is always `provider: "prepaid"`, `plan: "agent"`. |
| `agent` | `object` | Parent template summary: `{ guid, title, slug, headline, description, cover, icon, categories, tiermultiplier, tiers, extracreditpacks }`. For custom builds (`agentid: null` / `agentguid: null`) this is a synthesized placeholder with the same shape **plus** `agent.custom: true`; `agent.guid`, `agent.title`, `agent.cover` mirror the useragent itself in that case. |

##### Credential object shape

Every provider entry under `credentials.<key>` carries:

| Sub-field | Type | Description |
|-----------|------|-------------|
| `_connected` | `boolean` | Connection-readiness flag. `true` when Wiro has a validated OAuth or hybrid direct credential and every required picker field is populated. Plain API-key and service-account providers can remain `false`; for those use `_required_missing` or inspect the field values directly. |
| `optional` | `boolean` | `true` when the agent template marks this credential as optional (the agent can run without it; the dependent skill just won't fire). `false` for required credentials. |
| `extra` | `boolean` | `true` when this credential surfaces in the "alternative" / secondary group on the panel (rare; most credentials are primary). |
| `_editable` | `object` | Per-field edit map: `{ fieldname: true\|false }`. `false` means the field is read-only (managed by OAuth, platform-managed, or computed). The frontend uses this to disable inputs. |
| `_schema` | `object` | Inline registry descriptor — `title`, `icon`, `brand_color`, `docs_url`, `credential_mode` (`oauth`, `api_key`, `hybrid`, etc.), `connection_modes`, `default_connection_mode`, `mode_badges`, `oauth_provider`, plus a `fields[]` array describing every input the form should render. Lets the panel build credential cards without a separate `Credentials/Detail` round-trip. |
| `_required_missing` | `boolean` | `true` when the operator should look at this credential — required + user-editable fields are still empty (or the optional card is partially filled but incomplete). Drives the "needs attention" bullet on each credential card and the aggregate count badge on the Credentials tab. `false` when the card is complete or untouched-and-optional. |
| `connectedat` | `string\|null` | OAuth and hybrid providers: ISO timestamp of the last successful connection. |
| `tokenexpiresat` | `string\|null` | ISO timestamp when the current token expires, or an empty value when the provider reports no fixed expiry. |
| `<fieldname>` | `string\|number\|boolean\|array` | The actual field value as the user (or OAuth callback) saved it. Field types match `_schema.fields[].type`. Sensitive values (`oauth_session` access/refresh tokens, `clientsecret`, `password`-typed fields) are NEVER returned in this surface — they stay server-side. |

##### Subscription object

| Sub-field | Type | Description |
|-----------|------|-------------|
| `plan` | `string` | Always `"agent"`. The Starter/Pro distinction lives on the useragent row's `tier` field, not on the subscription. |
| `status` | `string` | `"active"`, `"expired"`, `"cancelled"`, or `"refunded"`. |
| `amount` | `number` | The monthly USD price actually being charged. Mirrors `useragent.monthlypriceusd`. |
| `currency` | `string` | Always `"usd"`. |
| `currentperiodend` | `number\|null` | Unix seconds when the current billing period ends. |
| `renewaldate` | `string\|null` | ISO-8601 string of the same period-end timestamp (convenience for display). |
| `daysremaining` | `number` | Days until `currentperiodend`. |
| `pendingdowngrade` | `string\|null` | `"cancel"` after `CancelSubscription`; `null` for normal active subs. |
| `provider` | `string` | `"prepaid"` for every API-deployed subscription. |

#### **POST** /UserAgent/Update

Updates an agent instance's **scalar fields only** (title, description, categories, cover URL). If the agent is currently **starting (status `3`)** or **running (status `4`)**, this triggers an automatic restart to apply the new settings (the agent is moved to Stopping with `restartafter: true`, and re-queued after it fully stops).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `guid` | string | Yes | Your UserAgent instance guid |
| `title` | string | No | New display name |
| `description` | string | No | New description (set to empty string or `null` to clear) |
| `categories` | array | No | Updated categories. Cannot be empty if provided. |
| `cover` | string | No | New cover image URL (set to empty string or `null` to clear). For multipart upload, use [`POST /UserAgent/Cover`](#post-useragentcover) instead. |

> **Scalar-only.** Credentials, custom skills, skill toggles, and tier upgrades use dedicated endpoints:
>
> | What you want to change | Use |
> |-------------------------|-----|
> | Provider credentials (API keys, OAuth settings) | [`POST /UserAgent/CredentialUpsert`](#post-useragentcredentialupsert) |
> | Upload a credential `fileinput` field (multipart, e.g. Twilio voice MP3) | [`POST /UserAgent/CredentialFileUpload`](#post-useragentcredentialfileupload) |
> | Custom skill values (strategy text, cron intervals, enabled flag) | [`POST /UserAgent/CustomSkillUpsert`](#post-useragentcustomskillupsert) |
> | Rename a user-created custom skill (key + optional description) | [`POST /UserAgent/CustomSkillRename`](#post-useragentcustomskillrename) |
> | Browse alternative templates for a custom skill | [`POST /UserAgent/CustomSkillAlternatives`](#post-useragentcustomskillalternatives) |
> | Delete a user-created cron skill | [`POST /UserAgent/CustomSkillDelete`](#post-useragentcustomskilldelete) |
> | Toggle one or more integration skills on/off (with optional tier change) | [`POST /UserAgent/SkillsApply`](#post-useragentskillsapply) |
> | Upgrade Starter → Pro | [`POST /UserAgent/UpgradeTier`](#post-useragentupgradetier) |
> | Upload a cover image (multipart) | [`POST /UserAgent/Cover`](#post-useragentcover) |
> | Per-agent timezone or unified Chat Mode | [`POST /UserAgent/UpdateSettings`](#post-useragentupdatesettings) |
> | View / download / purge activity logs | [`POST /UserAgent/Logs`](#post-useragentlogs) · [`LogsList`](#post-useragentlogslist) · [`LogsFile`](#post-useragentlogsfile) · [`LogsDelete`](#post-useragentlogsdelete) |
> | Soft-delete a useragent | [`POST /UserAgent/Delete`](#post-useragentdelete) |

> **Note:** `CredentialUpsert` writes credential fields **but does not transition `status: 6` on its own**. After filling the missing credentials, call `POST /UserAgent/Update` once (any scalar body — even just `{ "guid": "<useragent-guid>" }` — works) to trigger the `setuprequired` re-check; that's the call that flips `status: 6 → 0` (Stopped) so the next `Start` succeeds.

##### Response

```json
{
  "result": true,
  "errors": [],
  "useragents": [
    {
      "guid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
      "uuid": "ada-uuid",
      "agentguid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "teamguid": null,
      "title": "My Instagram Bot",
      "description": "Updated description after rename",
      "cover": "https://cdn.wiro.ai/uploads/useragents/f8e7d6c5-cover.webp",
      "categories": ["social-media", "marketing"],
      "tier": "starter",
      "tiermultiplier": 10,
      "monthlypriceusd": 9,
      "monthlycredits": 225,
      "extracredits": 0,
      "usedcredits": 80,
      "creditperiod": "2026-05",
      "creditsyncat": 1714694400,
      "status": 1,
      "pinned": false,
      "setuprequired": false,
      "teamsessionmode": "private",
      "timezone": null,
      "agent": {
        "guid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "title": "Instagram Manager",
        "slug": "instagram-manager",
        "headline": "Automate your Instagram presence with AI",
        "description": "An autonomous agent that manages your Instagram Business account.",
        "cover": "https://cdn.wiro.ai/uploads/agents/instagram-manager-cover.webp",
        "icon": "https://cdn.wiro.ai/uploads/agents/instagram-manager-icon.webp",
        "categories": ["social-media", "marketing"],
        "tiermultiplier": 10,
        "tiers": {
          "starter": { "priceUsd": 9,  "credits": 225 },
          "pro":     { "priceUsd": 90, "credits": 2250 }
        },
        "extracreditpacks": []
      },
      "createdat": 1714608000,
      "updatedat": 1714694500,
      "queuedat": 1714694498,
      "startedat": null,
      "runningat": null,
      "stoppingat": 1714694500,
      "stopdat": null,
      "errordat": null
    }
  ]
}
```

> **`Update` returns the full composed useragent shape** — same composition path as `UserAgent/Detail` (`getUserAgentDetailForUI`), so `credentials`, `customskills`, `scheduledskills`, `skills`, `skillsmeta`, `tokenRates`, `agentModel`, and the `agent` template summary (with `tiers` + `extracreditpacks`) are all included. The fields `Update` cannot safely populate without an extra round-trip (`subscription`, `remainingcredits`, `extracreditsexpiry`) stay omitted — call `UserAgent/Detail` next if you need them. Otherwise the response is suitable for an in-place panel re-render without a follow-up call.

> **Restart on running agents.** When the call lands on a status `3`/`4` agent, the response shows the lifecycle transition mid-flight: `status: 1` (Stopping) with a fresh `stoppingat` timestamp, `runningat` cleared, and `queuedat` set to the same instant — Wiro auto-queues the agent so it picks the new settings up after the next stop cycle.

#### **POST** /UserAgent/UpdateSettings

Writes per-agent preference toggles that are not credentials and not skill rows. Exposes `timezone` (operator-selected IANA zone, propagates into the agent container's `TZ` env, cron `schedule.tz`, and caller-facing voice prep), `teamsessionmode` (the one Chat Mode for team web-chat history and external-channel DMs), the four **model overrides** — `chatmodel`, `cronmodel`, `voiceprepmodel`, `voicepostcallmodel` — that choose which LLM the agent uses for chat replies, scheduled (cron) turns, voice-call prep, and the post-call summary turn, and `enabledcommands` (the in-chat slash-command allowlist). Submit any subset in the same call — partial updates are supported and untouched fields keep their current value.

**Permission**: owner OR team admin (the same `requireRole: "admin"` gate as `/UserAgent/Update`). Team members cannot flip these knobs.

**Restart**: if the agent is **starting (status `3`)** or **running (status `4`)**, the call auto-stops the container with `restartafter: true` so the daemon worker picks up the fresh `settings.json` (new timezone, session mode, and / or model selection) on the next launch cycle. Status `0`/`1`/`2`/`5`/`6` agents take effect on the next manual `Start` without a soft-stop.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Your UserAgent instance guid. |
| `timezone` | string\|null | No | IANA timezone identifier (e.g. `"Europe/Istanbul"`, `"America/New_York"`, `"Asia/Tokyo"`). Pass `null`, `""`, or the literal `"UTC"` to **clear** the override — the row is set back to `NULL`, which makes the propagation chain a no-op (container stays on `TZ=UTC`, no per-job `schedule.tz` injection, voice prep `current_time` stays in single-line UTC ISO form). Validated server-side via `new Intl.DateTimeFormat("en-GB", { timeZone })` — unknown zones are rejected with `invalid-timezone`. |
| `teamsessionmode` | string | No | Unified Chat Mode: `"private"` isolates each team member's Wiro web-chat history and native agent memory plus each approved external-channel DM operator; `"collaborative"` shares both runtime contexts. Personal agents can set it because external-channel DMs can have multiple operators. Web and external-channel message lists remain separate transports; room/thread sessions remain room-scoped. Channel activation remains credential-derived. |
| `chatmodel` | string\|null | No | Canonical model slug for **chat replies** (e.g. `"openai/gpt-5.6-sol"`). Must be a **selectable** model — i.e. `tokenRates.models[<slug>].selectable === true`; an unknown / non-selectable slug is rejected with `invalid-model-selection`. Pass `null` or `""` to clear the override and fall back to the platform default. |
| `cronmodel` | string\|null | No | Same rules as `chatmodel`, applied to **scheduled (cron) turns**. |
| `voiceprepmodel` | string\|null | No | Same rules as `chatmodel`, applied to the **voice-call prep** turn (context assembled before a realtime call). |
| `voicepostcallmodel` | string\|null | No | Same rules as `chatmodel`, applied to the **post-call summary** turn after a realtime voice call ends. |
| `enabledcommands` | string[] | No | Allowlist of in-chat **slash commands** the agent exposes, as an array of command keys **without** the leading slash (e.g. `["agent_help", "new_session", "agent_status"]`). Validated against the command catalog — an unknown key is rejected with `invalid-command-selection`, a non-array value with `invalid-command-list`. Order is preserved and duplicates are removed. An empty array `[]` is valid and **hides the slash-command menu** entirely. Omit the field to leave the current allowlist untouched. |

> **Slash-command catalog.** Valid `enabledcommands` keys are: `agent_help`, `new_session`, `agent_status`, `agent_limits`, `last_scan`, `last_heartbeat`, `agent_restart`, `clear_all_sessions`, `clear_history`. Read the agent's current allowlist from the `enabledCommands` field (camelCase) on [`UserAgent/Detail`](#post-useragentdetail) / `MyAgents` / `PinnedAgents` — `null` there means the operator never customized it (all commands available); an array (including `[]`) is an explicit allowlist.

> **Omitted fields are preserved.** The handler distinguishes between "field not in the body" and "field present with `null`/`""`/value", so a POST that carries only `timezone` does **not** touch `teamsessionmode` or any model field, and vice versa. Sending an empty body (none of the recognised fields) is rejected with `nothing-to-update` to avoid charging a no-op container restart.

> **Read vs write casing.** You **read** the current selection from the `agentModel` object on `UserAgent/Detail` / `MyAgents` / `PinnedAgents` in camelCase (`chatModel`, `cronModel`, `voicePrepModel`, `voicePostcallModel`); you **write** it here in lowercase (`chatmodel`, `cronmodel`, `voiceprepmodel`, `voicepostcallmodel`). The selectable set is exactly the models that `tokenRates.models` marks `selectable: true` — there is no separate "list models" endpoint, so read `tokenRates` to populate a picker.

##### Request

```bash
# Set IANA timezone only
curl -X POST "https://api.wiro.ai/v1/UserAgent/UpdateSettings" \
  -H "Authorization: Bearer $WIRO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
    "timezone": "Europe/Istanbul"
  }'

# Clear timezone (back to system default UTC)
curl -X POST "https://api.wiro.ai/v1/UserAgent/UpdateSettings" \
  -H "Authorization: Bearer $WIRO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
    "timezone": null
  }'

# Change the one Chat Mode for team web chat and external-channel DMs
curl -X POST "https://api.wiro.ai/v1/UserAgent/UpdateSettings" \
  -H "Authorization: Bearer $WIRO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
    "teamsessionmode": "collaborative"
  }'

# Switch the chat + cron model (each must be selectable; "" / null resets to default)
curl -X POST "https://api.wiro.ai/v1/UserAgent/UpdateSettings" \
  -H "Authorization: Bearer $WIRO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
    "chatmodel": "openai/gpt-5.5",
    "cronmodel": "openai/gpt-5.4-mini"
  }'

# Restrict the in-chat slash-command menu (empty array hides it entirely)
curl -X POST "https://api.wiro.ai/v1/UserAgent/UpdateSettings" \
  -H "Authorization: Bearer $WIRO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
    "enabledcommands": ["agent_help", "new_session", "agent_status"]
  }'

# Update both preference toggles in one call
curl -X POST "https://api.wiro.ai/v1/UserAgent/UpdateSettings" \
  -H "Authorization: Bearer $WIRO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
    "timezone": "Europe/Istanbul",
    "teamsessionmode": "collaborative"
  }'
```

##### Response

```json
{
  "result": true,
  "errors": []
}
```

> **Light response by design.** `UpdateSettings` returns just `result` + `errors` — no full useragent shape. Pull the refreshed row with `POST /UserAgent/Detail` if you need to re-render the panel after the write.

##### Common errors

| Code | Message key | When |
|------|-------------|------|
| 400 | `request-parameter-required` | `useragentguid` missing from the body. |
| 400 | `nothing-to-update` | Body had none of the recognised fields (`timezone`, `teamsessionmode`, a model override, or `enabledcommands`). |
| 400 | `invalid-timezone` | `timezone` wasn't a string the runtime's `Intl.DateTimeFormat` could resolve. |
| 400 | `teamsessionmode must be private or collaborative` | `teamsessionmode` wasn't one of the two supported values. |
| 400 | `directchatmode is not accepted` | Obsolete separate mode was sent instead of unified `teamsessionmode`. |
| 400 | `invalid-model-selection` | A model override (`chatmodel` / `cronmodel` / `voiceprepmodel` / `voicepostcallmodel`) was an unknown or non-selectable slug (`tokenRates.models[<slug>].selectable !== true`). |
| 400 | `invalid-command-list` | `enabledcommands` was present but not an array. |
| 400 | `invalid-command-selection` | `enabledcommands` contained a key that isn't in the slash-command catalog. |
| 403 | `useragent-access-denied` | Caller is neither the owner nor a team admin on a team-owned agent. |
| 500 | `failed-to-update-useragent` | DB write failed (transient — safe to retry). |

#### **POST** /UserAgent/Cover

Uploads a new cover image for the agent instance via multipart. Mirrors the `/User/Avatar` pattern — accepts `jpg`, `png`, `gif`, `jpeg`, `webp`; converts to webp; uploads to S3; writes the resulting CDN URL into `useragents.cover`.

If you already have a hosted URL, use `POST /UserAgent/Update` with `cover: "<url>"` instead.

**Multipart fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `useragentguid` | text | Yes | Your UserAgent instance guid |
| `image` | file | Yes | The cover image file (jpg/png/gif/jpeg/webp, max ~10MB) |

##### Response

```json
{
  "result": true,
  "errors": [],
  "cover": "https://cdn.wiro.ai/uploads/useragents/f8e7d6c5-b4a3-2190-fedc-ba0987654321-cover.webp",
  "useragents": [
    {
      "guid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
      "uuid": "ada-uuid",
      "agentguid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "teamguid": null,
      "title": "My Instagram Bot",
      "description": null,
      "cover": "https://cdn.wiro.ai/uploads/useragents/f8e7d6c5-b4a3-2190-fedc-ba0987654321-cover.webp",
      "categories": ["social-media", "marketing"],
      "tier": "starter",
      "tiermultiplier": 10,
      "monthlypriceusd": 9,
      "monthlycredits": 225,
      "extracredits": 0,
      "usedcredits": 80,
      "creditperiod": "2026-05",
      "creditsyncat": 1714694400,
      "status": 4,
      "pinned": false,
      "teamsessionmode": "private",
      "agent": {
        "guid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "title": "Instagram Manager",
        "slug": "instagram-manager",
        "headline": "Automate your Instagram presence with AI",
        "description": "An autonomous agent that manages your Instagram Business account.",
        "cover": "https://cdn.wiro.ai/uploads/agents/instagram-manager-cover.webp",
        "icon": "https://cdn.wiro.ai/uploads/agents/instagram-manager-icon.webp",
        "categories": ["social-media", "marketing"],
        "tiermultiplier": 10
      },
      "createdat": 1714608000,
      "updatedat": 1714694500,
      "queuedat": 1714694395,
      "startedat": 1714694400,
      "runningat": 1714694410,
      "stoppingat": null,
      "stopdat": null,
      "errordat": null
    }
  ]
}
```

> **Cover returns scalar useragent fields + the `agent` template summary only.** It does **not** include `setuprequired`, `tokenRates`, `agentModel`, `remainingcredits`, or any composed children (`credentials`, `customskills`, `scheduledskills`, `skills`, `skillsmeta`, `subscription`). The endpoint is optimised for the cover refresh round-trip; call `UserAgent/Detail` afterwards if you need the full composed shape.

#### **POST** /UserAgent/CredentialUpsert

Writes one or more credential fields for one or multiple providers in a single call.

If the agent is **starting** or **running**, completing the upsert triggers an automatic restart (`restartafter: true`).

Telegram, Slack, and Discord are optional credential groups. A channel appears
in `enabledChannels` automatically when all of its catalog `required_fields`
are complete. Clear any required field to disable it; there is no separate
channel-enable endpoint or persisted switch.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Your UserAgent instance guid |
| `fields` | array | Yes | One or more field rows. Each row has `{ credentialkey, fieldname, fieldvalue, fieldstatus?, parentfield?, ordinal? }`. You can write to more than one `credentialkey` in a single request. |

Each field row:

| Field | Type | Description |
|-------|------|-------------|
| `credentialkey` | string | The provider key — e.g. `"instagram"`, `"google-ads"`, `"wordpress"`, `"telegram"`. Must match one of the credentials declared in `credentials` on `/UserAgent/Detail`. |
| `fieldname` | string | Field inside that credential — e.g. `"apikey"`, `"clientid"`, `"bottoken"`. Must not start with `_` (reserved for internal sentinels such as `_isoptional`, `_isextra`). |
| `fieldvalue` | string \| number | The value to write. Empty string is allowed (effectively clears the field). |
| `fieldstatus` | string | **Server-managed — ignored from the request body for API callers.** The value is derived from the registry / OAuth flow on the server side (e.g. `user` for hand-edited fields, `oauth_session` for tokens written by the OAuth callback, `oauth_app` for app credentials, etc.). Do not set this field — the field is stripped before any write. |
| `parentfield` | string | Optional. Dotted path when the credential has a nested array (e.g. `"accounts.0.apps"` for `firebase.accounts[0].apps[*]`). |
| `ordinal` | number | Optional. Array index inside `parentfield`. Defaults to `0`. |

##### Request

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/CredentialUpsert" \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
    "fields": [
      { "credentialkey": "wordpress", "fieldname": "url",         "fieldvalue": "https://myblog.com" },
      { "credentialkey": "wordpress", "fieldname": "user",        "fieldvalue": "admin" },
      { "credentialkey": "wordpress", "fieldname": "apppassword", "fieldvalue": "abcd efgh ijkl mnop" }
    ]
  }'
```

##### Response

```json
{ "result": true, "applied": 3, "errors": [] }
```

`applied` is the number of rows actually written. Any row that fails validation (reserved fieldname, invalid fieldstatus for your role) is skipped and reported in `errors` without rolling back the others.

> **Twilio Voice — extra response fields.** When any `twilio-voice` field is touched, `CredentialUpsert` also auto-configures each Twilio phone number's `VoiceUrl` and surfaces the result on the response:
>
> | Field | Type | Meaning |
> |-------|------|---------|
> | `twilioWebhooksUpdated` | `string[]` | E.164 numbers whose `VoiceUrl` was just pointed at the Wiro Twilio webhook. |
> | `twilioWebhookSkipped` | `string[]` | Numbers already pointing at the right URL (no change made). |
> | `twilioWebhooksFailed` | `string[]` | Numbers the API tried to update but Twilio rejected (e.g. number not in the credentialed account). |
> | `twilioWebhookError` | `string` | Top-level message when the entire VoiceUrl-rewrite flow failed (auth error, network outage). The credential rows are still saved — only the auto-configuration step failed. |
>
> Treat all four fields as best-effort: the credential write itself never depends on Twilio's API call succeeding. See [Twilio Voice Integration](/docs/integration-twiliovoice-skills) for the full lifecycle.

#### **POST** /UserAgent/CredentialFileUpload

Multipart-upload sibling of `CredentialUpsert` for credential fields whose registry schema declares `type: "fileinput"` — typically large binary assets that don't fit comfortably in a JSON body (e.g. Twilio voice greeting MP3, custom hold music). The endpoint stores the blob under your account's MyUploads area, writes the resulting reference into the credential field via the same `upsertUserAgentCredentialField` path used by `CredentialUpsert`, and triggers an automatic restart so the new URL flows into the daemon's `settings.json` on the next start.

Unlike `CredentialUpsert`, this endpoint expects `multipart/form-data` — pass the metadata as form fields and the blob in a `file` part.

| Form field | Type | Required | Description |
|------------|------|----------|-------------|
| `useragentguid` | text | Yes | Your UserAgent instance guid |
| `credentialkey` | text | Yes | Provider key (e.g. `twilio-voice`). Must declare a `fileinput` field in its registry schema. |
| `fieldname` | text | Yes | The exact `fieldname` whose registry `type` is `"fileinput"` (e.g. `holdaudio` or `holdmusic` on `twilio-voice`). |
| `file` | file | Yes | The blob. Mimetype + size are validated against the registry's `filetypes[]` whitelist and `maxsize` (KB) cap. Default cap is 10 MB when the field omits `maxsize`. |

> **`fileinput` vs `fileinput-base64`.** This endpoint is the storage path for the `fileinput` type only — the binary lives in S3 and the credential row stores a reference. The companion `fileinput-base64` type stays inline in the DB (encrypted at rest) and is written via the standard `CredentialUpsert` JSON `fields[]` array (e.g. `serviceaccountjson` on `google-drive`/`google-calendar`/`google-play`/`firebase`, `privatekey` on `apple-appstore`). Sending a base64 field through this endpoint returns `Field is not a fileinput type`.

##### Request

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/CredentialFileUpload" \
  -H "x-api-key: YOUR_API_KEY" \
  -F "useragentguid=f8e7d6c5-b4a3-2190-fedc-ba0987654321" \
  -F "credentialkey=twilio-voice" \
  -F "fieldname=holdaudio" \
  -F "file=@/path/to/greeting.mp3;type=audio/mpeg"
```

##### Response

```json
{
  "result": true,
  "errors": [],
  "url": "https://cdn.wiro.ai/uploads/users/.../holdaudio_1714694400_8273645.mp3",
  "credentialkey": "twilio-voice",
  "fieldname": "holdaudio"
}
```

The `url` is the public, AES-keyed CDN URL the daemon will fetch at runtime. The credential row stores the raw `<path>/<name>` reference under the hood and recomposes the URL on every read, so the field stays valid across CDN domain rotation and AES key rotation.

##### Common errors

| Error | When |
|-------|------|
| `File required (form field name: file)` | Missing the `file` multipart part |
| `Unknown credential: <key>` | `credentialkey` not declared in the skill registry |
| `Unknown field: <name>` | `fieldname` not in the credential's `credential_schema` |
| `Field is not a fileinput type` | The schema field's `type` is not `"fileinput"` (use `CredentialUpsert` instead) |
| `Invalid file type. Allowed: <list>` | Mimetype not in the registry's `filetypes[]` whitelist |
| `File too large. Max: <kb> KB` | Size exceeds the registry's `maxsize` cap (default 10240 KB / 10 MB) |
| `Could not resolve upload folder` / `Upload failed` | Filesystem helper rejected the write — usually transient, retry |

#### **POST** /UserAgent/CustomSkillUpsert

Writes a single custom skill — either a **strategy** (instructions read by other skills at runtime) or a **scheduled task** (`cs-cron-*`).

The endpoint auto-normalises the skillkey to its canonical form. Bare slugs become `cs-<slug>`; if you also send `interval` (a non-empty cron string), the slug is treated as a cron and becomes `cs-cron-<slug>`. So `"weekly-health-check"` with `interval: "0 9 * * 1"` is stored as `cs-cron-weekly-health-check`. The `usercreated` flag is **not** consulted by the prefix logic — pass `interval` (or send the prefixed `cs-cron-…` key explicitly) to land in the Scheduled Skills tab.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Your UserAgent instance guid |
| `skillkey` | string | Yes | The skill key. Strategies use bare names (e.g. `"content-tone"` → stored as `cs-content-tone`). Crons use a `cron-` prefix (e.g. `"cron-content-scanner"` → stored as `cs-cron-content-scanner`). |
| `value` | string | No | Strategy body / cron prompt text. Editable for preset strategies and user-created entries; bundled crons silently drop `value` writes. |
| `interval` | string | No | Cron expression (e.g. `"0 */4 * * *"`). Only persisted on `cs-cron-*` rows. |
| `enabled` | boolean | No | Turn the skill on or off. **Writable for both strategies (`cs-*`) and crons (`cs-cron-*`)** — a disabled strategy is suppressed end-to-end (the IDE still shows it but the runtime drops it from `<available_skills>` and the per-skill `SKILL.md` write is skipped). Defaults to `true` on insert. |
| `description` | string | No | Only persisted for user-created skills (preset descriptions are template-owned). |
| `usercreated` | boolean | No | **Admin-only override.** Non-admin callers: the request value is ignored — `usercreated` is server-managed (`INSERT` writes `true`, `UPDATE` preserves the row's current source so a preset row cannot be flipped into a user-created one). Admin (`tokenUserRoles` contains `"ADMIN"`) callers may explicitly set `true` / `false` to control whether the end user can delete the row from the panel. **Has no effect on the cron prefix** — flavour is decided by `interval` / explicit `cs-cron-` prefix only. |

> **Description-only edits skip the restart.** If you only change `description` (and the row's functional fields — `value`, `interval`, `enabled` — stay the same), the agent is **not** restarted. Functional changes still trigger the standard auto-restart.

##### Request

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/CustomSkillUpsert" \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
    "skillkey": "content-tone",
    "value": "## Brand Voice\nTone: friendly\nTarget Audience: teens on Instagram"
  }'
```

##### Response

```json
{ "result": true, "errors": [] }
```

#### **POST** /UserAgent/CustomSkillRename

Renames a user-created custom skill, optionally updating its description in the same atomic write. Only rows with `usercreated: true` can be renamed through this endpoint — preset-owned rows reject with `agent-customskill-rename-preset-forbidden` (preset renames cascade through the admin `/Agent/CustomSkillRename` channel instead).

The skillkey flavour is preserved: a `cs-cron-*` scheduled task stays scheduled, a `cs-*` strategy stays a strategy. Cross-flavour renames are rejected — delete + re-create via `CustomSkillUpsert` with the right kind if you need to switch sections.

Version history is migrated under the new key so the full audit chain stays continuous after the rename, and a new `rename` entry is appended.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Your UserAgent instance guid |
| `oldskillkey` | string | Yes | The skill's current canonical key (e.g. `cs-my-strategy`, `cs-cron-daily-summary`). |
| `newskillkey` | string | Yes | The new skill key. The server canonicalises bare slugs using the flavour of `oldskillkey`: if old is `cs-cron-*` the new slug lands on `cs-cron-*`; otherwise `cs-*`. |
| `description` | string | No | New description. Omit to leave unchanged; pass an empty string to clear. |

> **Restart.** The renamed key surfaces in the container's settings.json, so the useragent is auto-restarted on success (same behaviour as `CustomSkillUpsert` functional edits).

##### Request

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/CustomSkillRename" \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
    "oldskillkey": "cs-my-custom-strategy",
    "newskillkey": "cs-my-renamed-strategy",
    "description": "Updated note shown next to the name"
  }'
```

##### Response

```json
{ "result": true, "errors": [], "newskillkey": "cs-my-renamed-strategy" }
```

##### Error cases

| Error message key | When |
|---|---|
| `agent-customskill-rename-preset-forbidden` | Target row has `usercreated: false` (preset-owned). Preset renames go through the admin `/Agent/CustomSkillRename` cascade. |
| `agent-customskill-rename-flavour-mismatch` | Caller tried to rename `cs-cron-*` ↔ `cs-*`. Delete + re-create with the right kind instead. |
| `agent-customskill-rename-collision` | `newskillkey` already exists on this useragent. |
| `agent-customskill-rename-same-key` | `oldskillkey` equals canonicalised `newskillkey` — nothing to change. |
| `agent-customskill-not-found` | `oldskillkey` does not exist on the useragent. |

#### **POST** /UserAgent/CustomSkillAlternatives

Returns a list of alternative starter templates that the panel's custom-skill picker can offer for a given `skillkey`. Used by the "Browse alternatives" UX when the user wants to swap one bundled cron / strategy for another preset-owned variant without manually rewriting the `value` body.

This endpoint is **read-only** — it does not mutate the useragent. Apply a chosen alternative by calling `CustomSkillUpsert` with the alternative's `value` (and `interval` for crons).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Your UserAgent instance guid (membership check only — the alternatives list is registry-derived, not per-instance). |
| `skillkey` | string | Yes | The skill the user is looking to swap — usually a `cs-*` strategy or a `cs-cron-*` cron currently on the useragent. |

##### Response

```json
{
  "result": true,
  "errors": [],
  "alternatives": [
    {
      "title": "Friendly / casual brand voice",
      "description": "Tone: warm and approachable. Use first names and contractions.",
      "value": "## Brand Voice\nTone: friendly, casual..."
    },
    {
      "title": "Formal / professional brand voice",
      "description": "Tone: polished and authoritative. Avoid slang.",
      "value": "## Brand Voice\nTone: formal..."
    },
    {
      "title": "Daily morning roundup (cron alt)",
      "description": "Posts a 9 AM digest to Telegram with last 24 h activity.",
      "value": "Every morning at 09:00 UTC, summarise overnight activity and post the digest to Telegram.",
      "intervalexpr": "0 9 * * *"
    }
  ]
}
```

Each entry carries `title`, `description`, `value`, and — for cron-flavoured alternatives only — `intervalexpr` (a cron expression). The endpoint never returns a `key` field; alternatives are addressed by their position in the list and applied via `CustomSkillUpsert` on the **current** `skillkey` (so the operator can swap the body of `cs-content-tone` between presets without renaming it).

When the registry has no alternatives for the requested `skillkey`, the response is `{ "result": true, "alternatives": [] }` — empty lists are not an error.

#### **POST** /UserAgent/CustomSkillDelete

Removes a user-created custom skill. The endpoint enforces a **hybrid delete policy** to prevent accidental destruction of registry-owned scaffolding the runtime depends on:

| Row type | Delete result |
|----------|--------------|
| User-created (`usercreated: true`) on any agent | **Allowed** — row is hard-deleted, agent restarts. |
| Registry-owned / preset-owned (`usercreated: false`) on a **template** agent (the row also exists in the agent's preset `agentcustomskills`) | **Rejected** — `"This skill belongs to the agent preset and cannot be deleted."` Disable it via `CustomSkillUpsert` with `enabled: false` instead. |
| Registry-owned (`usercreated: false`) on a **custom-build** agent (no preset to compare against) | **Rejected** — `"This skill is registry-owned and cannot be deleted."` Disable it via `CustomSkillUpsert` with `enabled: false` instead. Custom builds carry registry-seeded rows (e.g. `cs-approval-policy`, bundled `cs-cron-*` clones) whose runtime contract the agent depends on, even though there's no template back-reference. |

In both reject branches the response carries `suggestion: "disable-via-upsert"` so panel UIs can offer a "Disable instead" CTA without re-querying the registry.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Your UserAgent instance guid |
| `skillkey` | string | Yes | The skill key to remove. User-created rows only — registry-owned rows reject with `disable-via-upsert`. |

##### Response (delete allowed)

```json
{ "result": true, "errors": [] }
```

##### Response (preset-owned — rejected with suggestion)

```json
{
  "result": false,
  "errors": [
    {
      "code": 0,
      "message": "This skill belongs to the agent preset and cannot be deleted. Use enabled=false to disable it instead."
    }
  ],
  "suggestion": "disable-via-upsert"
}
```

##### Response (registry-owned on a custom build — rejected with suggestion)

```json
{
  "result": false,
  "errors": [
    {
      "code": 0,
      "message": "This skill is registry-owned and cannot be deleted. Use enabled=false to disable it instead."
    }
  ],
  "suggestion": "disable-via-upsert"
}
```

#### **POST** /UserAgent/CustomSkillHistory

Returns the version history for one custom skill on a useragent — a per-write audit trail with diff metadata + the resolved actor for each entry. Powers the "Version History" modal in the panel; useful for API consumers building audit views.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Your UserAgent instance guid |
| `skillkey` | string | Yes | Canonical skill key (e.g. `"cs-content-tone"`) |
| `startdate` | number | No | UTC epoch seconds — return entries on/after this time |
| `enddate` | number | No | UTC epoch seconds — return entries on/before this time |

##### Response

```json
{
  "result": true,
  "errors": [],
  "preset_default": {
    "value": "## Brand Voice\nTone: friendly...",
    "intervalexpr": null,
    "enabled": true,
    "description": "How the agent should sound across all generated copy."
  },
  "entries": [
    {
      "guid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
      "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
      "skillkey": "cs-content-tone",
      "operation": "upsert",
      "value": "## Brand Voice\nTone: friendly\n...",
      "intervalexpr": null,
      "enabled": true,
      "usercreated": false,
      "prev_value": "## Brand Voice\nTone: professional\n...",
      "prev_interval": null,
      "prev_enabled": true,
      "after_value": "## Brand Voice\nTone: friendly\n...",
      "after_interval": null,
      "after_enabled": true,
      "changed_fields": ["value"],
      "changedby": "ada-uuid",
      "changedby_user": {
        "uuid": "ada-uuid",
        "firstname": "Ada",
        "lastname": "Lovelace",
        "email": "ada@example.com",
        "username": "ada",
        "avatar": "https://cdn.wiro.ai/avatars/ada.webp",
        "avatarinitials": "AL"
      },
      "changedat": 1714694410
    }
  ]
}
```

> **Field semantics.** Each row captures the **BEFORE** state of the action that produced it (audit-write fires before the table mutation). The server-computed `after_*` and `prev_*` fields give you the resolved AFTER + previous-version snapshots without you having to walk the list manually:
>
> - `prev_*` — value as of the immediately-older entry (`null` for the oldest row).
> - `after_*` — value the row was left with after this action committed: pulled from the next-newer entry's BEFORE state, or from the live `useragentcustomskills` row for the newest entry. `null` when `operation: "delete-user"` (row was removed).
> - `changed_fields[]` — names of fields whose value differs from the immediately-older entry. Subset of `["value", "interval", "enabled"]`.
> - `changedby_user` — resolved actor object (full shape: `uuid`, `firstname`, `lastname`, `email`, `username`, `avatar`, `avatarinitials`). `null` when `changedby` is a sentinel like `"system"` / `"backfill-*"` (cron / migration writes) or when the user record was deleted.

#### **POST** /UserAgent/CustomSkillRevert

Reverts a custom skill to either (a) the agent template's preset default or (b) a specific historical version. Auto-triggers a restart on success unless the action is a no-op.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Your UserAgent instance guid |
| `skillkey` | string | Yes | Canonical skill key |
| `source` | string | Yes | `"preset"` (reset to template default) or `"history"` (jump to a `versionguid`) |
| `versionguid` | string | When `source=history` | The `entries[].guid` from `CustomSkillHistory` |

##### Response

```json
{
  "result": true,
  "errors": [],
  "action": "reverted",
  "current_value": "## Brand Voice\nTone: ...",
  "current_interval": null,
  "current_enabled": true
}
```

`action` is `"reverted"`, `"reset-to-preset"`, `"deleted"` (preset removed upstream), or `"no-op"` (already matches target).

#### **POST** /UserAgent/CredentialFieldHistory

Returns the per-field write history for one credential group on a useragent. Sensitive values are redacted at read time as a belt-and-suspenders guard:
- `oauth_session` fields (access / refresh tokens) **never** appear in history at all — they're stripped before persisting.
- `clientsecret` and similar `oauth_app` secret fields are stored as `[REDACTED]` in history rows (the live row carries the real secret — read it via `UserAgent/Detail`).
- The platform-managed `sys-openai` credential short-circuits to an empty `entries[]` (no user-facing history to show).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Your UserAgent instance guid |
| `credentialkey` | string | Yes | Provider key (e.g. `"instagram"`, `"wordpress"`) |
| `startdate` | number | No | UTC epoch seconds — return entries on/after this time |
| `enddate` | number | No | UTC epoch seconds — return entries on/before this time |

##### Response

```json
{
  "result": true,
  "errors": [],
  "entries": [
    {
      "guid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
      "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
      "credentialkey": "instagram",
      "fieldname": "igusername",
      "fieldvalue": "myaccount",
      "fieldstatus": "user",
      "parentfield": null,
      "ordinal": 0,
      "operation": "upsert",
      "changedby": "ada-uuid",
      "changedby_user": {
        "uuid": "ada-uuid",
        "firstname": "Ada",
        "lastname": "Lovelace",
        "email": "ada@example.com",
        "username": "ada",
        "avatar": "https://cdn.wiro.ai/avatars/ada.webp",
        "avatarinitials": "AL"
      },
      "changedat": 1714694410
    },
    {
      "guid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
      "credentialkey": "instagram",
      "fieldname": "clientsecret",
      "fieldvalue": "[REDACTED]",
      "fieldstatus": "oauth_app",
      "parentfield": null,
      "ordinal": 0,
      "operation": "upsert",
      "changedby": "ada-uuid",
      "changedby_user": {
        "uuid": "ada-uuid",
        "firstname": "Ada",
        "lastname": "Lovelace",
        "email": "ada@example.com",
        "username": "ada",
        "avatar": "https://cdn.wiro.ai/avatars/ada.webp",
        "avatarinitials": "AL"
      },
      "changedat": 1714600000
    }
  ]
}
```

> `changedby_user` is the resolved actor object (`uuid`, `firstname`, `lastname`, `email`, `username`, `avatar`, `avatarinitials`). It is `null` when `changedby` is a sentinel like `"system"` / `"backfill-*"` (cron / migration writes) or when the user record has been deleted.

#### **POST** /UserAgent/SkillsApply

Applies a batch of skill toggles + an optional tier change in a single transactional unit. **This is the only skill-toggle endpoint API consumers should use** — even when you're flipping a single skill, send it as a one-entry `skills` map. The single-skill alternative (`SkillToggle`) is not part of the public API surface.

Designed for both the Skill Editor modal (multiple toggles in one save) and one-off API mutations:

1. Charges the wallet (or proration) **once**, not N times.
2. Triggers exactly **one container restart** after all toggles land.
3. Uses **idempotency** + a UA-level mutex — concurrent calls or FE retries can't double-apply.
4. **Atomic** — a payment-side failure rolls back to the pre-call skill set.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Your UserAgent instance guid (custom build only for non-admin callers) |
| `skills` | object | Yes | Map of `{ "skillname": true \| false }` for every skill you want to set. Skills not in the map keep their current state. |
| `tier` | string | No | `"starter"` or `"pro"` — change the tier in the same call. **Pro → Starter downgrade is rejected** (cancel + re-subscribe instead). |
| `idempotencyKey` | string | Yes | Caller-generated unique key (UUID recommended). Replays of the same key return the cached response without re-running the saga. |

##### Request

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/SkillsApply" \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
    "tier": "pro",
    "idempotencyKey": "550e8400-e29b-41d4-a716-446655440000",
    "skills": {
      "int-instagram-post": true,
      "int-twitterx-post":  true,
      "int-reddit-post":     false
    }
  }'
```

##### Response (success)

```json
{
  "result": true,
  "errors": [],
  "tier": "pro",
  "prepaidWalletDelta": 18.00,
  "restartTriggered": true,
  "restartedAt": 1714694520,
  "pricing": {
    "previousPriceUsd": 4,
    "newPriceUsd": 40,
    "deltaUsd": 36,
    "previousMonthlyCredits": 100,
    "newMonthlyCredits": 1000,
    "deltaCredits": 900,
    "enabledSkills": ["int-instagram-post", "int-twitterx-post", "int-wiro-aimodels"]
  }
}
```

##### Response (no-op short-circuit)

When every entry in your `skills` map already matches the persisted state and the requested `tier` (if any) is unchanged, the endpoint returns a fast-path `noOp: true` reply with no DB writes, no wallet movement, and no restart. Use this signal to skip your own post-apply UI churn (toast, refresh) on detected no-op submissions.

```json
{
  "result": true,
  "errors": [],
  "noOp": true
}
```

| Field | Type | Description |
|-------|------|-------------|
| `noOp` | `boolean` | Present and `true` only on the no-op short-circuit response. Absent on the regular success path. When you see `noOp: true`, the rest of the field set (`tier`, `prepaidWalletDelta`, `restartTriggered`, `pricing`) is omitted — there was nothing to apply. |
| `tier` | `string` | The tier in effect after the call (`"starter"` or `"pro"`). Mirrors what was passed in `body.tier` — or the unchanged current tier if the request omitted it. |
| `prepaidWalletDelta` | `number` | USD debited (positive) or credited (negative) from the wallet for the prorated price diff. `0` when the toggle batch is a no-op or the agent has no active subscription yet. |
| `restartTriggered` | `boolean` | `true` when the agent runtime was restarted to pick up the new skill set. `false` for stopped agents (no restart needed) or no-op batches. |
| `restartedAt` | `number\|null` | Unix seconds when the restart trigger fired. `null` when `restartTriggered` is `false`. |
| `pricing.previousPriceUsd` / `newPriceUsd` / `deltaUsd` | `number` | USD totals before / after the apply, plus the signed delta. |
| `pricing.previousMonthlyCredits` / `newMonthlyCredits` / `deltaCredits` | `number` | Monthly credit allocation before / after, plus the signed delta. |
| `pricing.enabledSkills` | `array<string>` | Final enabled skill set including transitive `depends_on` closure — flat array of skill names. The matching `useragent.skills` array on the next `Detail` call is an object array (`{name, enabled, _edited?, _user_created?}`); take `.name` from each entry to compare. |

##### Common error codes

| Code | Meaning |
|------|---------|
| `100` | `skillsapply-template-only` — caller tried to mutate skills on a template-deploy useragent. Skills are inherited from the marketplace template; deploy a custom build (`Deploy` with `custom: true`) to run a different skill set. |
| `101` | `skillsapply-deps-violation` — a final enabled skill has unsatisfied `depends_on`. Body includes `deps[]`. |
| `102` | `skillsapply-conflict` — two finally-enabled skills are mutually exclusive. Body includes `conflicts[]`. |
| `103` | `skillsapply-insufficient-wallet` — wallet can't cover the prorated charge. Body includes `requiredUsd` / `availableUsd`. |
| `104` | `skillsapply-in-progress` — another `SkillsApply` is already running on this useragent. Wait and retry. |
| `105` | `skillsapply-tier-downgrade` — Pro → Starter rejected. Cancel + re-subscribe instead. |
| `106` | `skillsapply-subscription-inactive` — subscription must be `active` to mutate. |
| `108` | `skillsapply-db-tx-failed` — DB transaction rolled back; safe to retry with a new idempotency key. |

#### **POST** /UserAgent/PricingPreview

Live tier-pricing preview. Drives the Build Your Agent / Skill Editor UI: as the user toggles skills on/off, the frontend POSTs here with `skillOverrides` to see "if I save this, my new monthly price would be $X with Y monthly credits" without writing any state.

Two body shapes:

##### A. Draft preview (custom builder, no useragent yet)

```json
{
  "draft": true,
  "tier": "pro",
  "skills": ["int-instagram-post", "int-wiro-aimodels"]
}
```

##### B. Existing useragent preview

```json
{
  "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
  "tier": "pro",
  "skillOverrides": {
    "int-instagram-post": true,
    "int-reddit-post":    false
  }
}
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `draft` | boolean | A | When `true`, no useragent lookup happens; the resolver synthesises pricing from the `skills` array directly. Used by Build Your Agent. |
| `skills` | array<string> | A | Draft mode only — the proposed enabled skill set. |
| `useragentguid` | string | B | Required for non-draft previews. |
| `skillOverrides` | object | No | Override the persisted state with `{ skillname: boolean }` for the preview. Omit for "current state" preview. |
| `tier` | string | No | `"starter"` or `"pro"` — preview a specific tier. The response also includes both tiers under `tiers.{starter,pro}`. |

##### Response

```json
{
  "result": true,
  "errors": [],
  "tier": "pro",
  "tiermultiplier": 10,
  "totalPriceUsd": 40,
  "totalMonthlyCredits": 1000,
  "starterFloorUsd": 4,
  "skillBreakdown": [
    { "skill": "int-instagram-post", "priceUsd": 1, "credits": 25, "billing_model": "tokens" },
    { "skill": "int-wiro-aimodels",  "priceUsd": 1, "credits": 25, "billing_model": "tokens" }
  ],
  "enabledSkills": ["int-instagram-post", "int-wiro-aimodels"],
  "directSkills":  ["int-instagram-post"],
  "agentBase": { "priceUsd": 0, "credits": 0 },
  "tiers": {
    "starter": { "priceUsd": 4,  "credits": 100 },
    "pro":     { "priceUsd": 40, "credits": 1000 }
  },
  "tokenRates": {
    "default_model": "openai/gpt-5.6-sol",
    "fallback_rate": { "input_per_1m": 625, "output_per_1m": 3750, "cached_input_per_1m": 62.5, "cache_write_per_1m": 781.25 },
    "models": {
      "openai/gpt-5.6-sol": { "input_per_1m": 625, "output_per_1m": 3750, "cached_input_per_1m": 62.5, "cache_write_per_1m": 781.25, "selectable": true, "label": "GPT-5.6 Sol", "tier": "premium" },
      "openai/gpt-5.6-terra": { "input_per_1m": 250, "output_per_1m": 1500, "cached_input_per_1m": 25, "cache_write_per_1m": 312.5, "selectable": true, "label": "GPT-5.6 Terra", "tier": "balanced" },
      "openai/gpt-5.6-luna": { "input_per_1m": 25, "output_per_1m": 150, "cached_input_per_1m": 2.5, "cache_write_per_1m": 31.25, "selectable": true, "label": "GPT-5.6 Luna", "tier": "cheap" }
    }
  }
}
```

`enabledSkills` is the full closure (including transitive `depends_on`); `directSkills` is just what the user explicitly toggled. `agentBase` is always `{ priceUsd: 0, credits: 0 }` — pricing is fully skill-driven, and the field is kept on the response so callers don't have to null-check. `skillBreakdown[].billing_model` is always `"tokens"`; `tokenRates` carries the per-model rates used to meter each turn (see [Token Billing](#pricing-model--tiers-skills--token-billing)).

> **$4 starter floor.** When the raw weight sum lands below $4 (e.g. a single `LIGHT` skill at $1/25), the resolver bumps `tiers.starter.priceUsd` up to $4 **and** scales `tiers.starter.credits` up by the same ratio (25 → 100); the applied floor is echoed as `starterFloorUsd`. Pro derives from the post-floor starter via × `tiermultiplier` (default `10`), so a $1-weight agent becomes Starter `$4/100` and Pro `$40/1000`. See [Pricing Model — Tiers, Skills & Token Billing](#pricing-model--tiers-skills--token-billing) for the full rules.

#### **POST** /UserAgent/CreateSubscriptionCheckout

Subscribes a useragent that doesn't yet have an active subscription. Wallet is debited, a prepaid subscription row is inserted, and the agent is auto-queued — same single-call behaviour as `Deploy` with `useprepaid: true`. Always pass `useprepaid: true` from the API.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Your UserAgent instance guid |
| `useprepaid` | boolean | Yes | Must be `true` for API consumers. |
| `tier` | string | No | `"starter"` or `"pro"` — overrides the useragent's persisted tier so the user can re-subscribe at a different tier without redeploying. |

##### Response

```json
{
  "result": true,
  "errors": [],
  "subscriptionId": 8421,
  "monthlypriceusd": 90,
  "monthlycredits": 2250
}
```

If the useragent already has an active subscription, the call rejects with `Subscription already active for this useragent. Cancel or modify the existing subscription instead.`

#### **POST** /UserAgent/Start

Starts a stopped agent instance. The agent is moved to Queued (status `2`) and picked up by a worker. Also valid for agents in Error state (`5`) — Start re-queues them for another launch attempt.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `guid` | string | Yes | Your UserAgent instance guid |

##### Response

```json
{
  "result": true,
  "errors": [],
  "useragents": []
}
```

> `useragents` is always returned (empty array on Start) because the endpoint uses the shared `UserAgentResultModel` — just `result` and `errors` carry the outcome here.

Start will fail (returns `{ "result": false, "errors": [...] }`) if:
- The agent is already running or queued
- The agent is currently stopping
- Setup is incomplete (status `6`)
- No credits remain (`monthlycredits + extracredits - usedcredits <= 0`)

#### **POST** /UserAgent/Stop

Stops a running agent instance. If the agent is Queued (status `2`), it is immediately set to Stopped. If it is Starting or Running (status `3`/`4`), it moves to Stopping (status `1`) and the container is shut down gracefully.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `guid` | string | Yes | Your UserAgent instance guid |

##### Response

```json
{
  "result": true,
  "errors": [],
  "useragents": []
}
```

#### **POST** /UserAgent/Delete

Soft-deletes a useragent. The row stays in the database (so the audit trail in `agenttransactions`, `useragentcredentialfieldshistory`, `useragentcustomskillshistory`, `agentmessages` keeps its FK targets intact) but `deletedat` + `deletedby` are stamped, the agent is unpinned, and every read path (`Detail`, `MyAgents`, `Start`, `Stop`, daemon config compose, cron reconcile) automatically excludes the tombstoned row.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Your UserAgent instance guid. `guid` is also accepted as an alias. |

**Headers:** Pass `teamGUID: <team-guid>` when the target agent belongs to a team project; the caller must be the row owner or a team admin (plain team members are rejected with code `97`).

##### Guards (run in this order)

1. **Access** — owner of the row or a team admin of the UA's team. Members get `useragent-team-admin-required` (code `97`); strangers get `useragent-access-denied` (code `96`); unknown / already-deleted rows get `useragent-not-found` (code `95`).
2. **Status** — must be in a clean terminal state: `0` (Stopped), `5` (Error), or `6` (Setup Required). Anything in flight (`1` Stopping, `2` Queued, `3` Starting, `4` Running) is rejected with `useragent-delete-running` — Stop the agent first and wait for status `0`.
3. **Active subscription** — any `subscriptions.status='active'` row blocks delete (`useragent-delete-sub-active`). Cancel the subscription first; expired / cancelled / refunded / no-sub all pass.

The write is idempotent — calling `Delete` on an already-deleted row no-ops the second `UPDATE` (`AND deletedat IS NULL`) and you still get `result: true`.

##### Response

```json
{
  "result": true,
  "errors": [],
  "useragent": {
    "guid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
    "deletedat": 1714694400
  }
}
```

##### Common errors

| Error code / message | When |
|----------------------|------|
| `useragent-not-found` (95) | Unknown guid, or the row is already soft-deleted |
| `useragent-access-denied` (96) | Caller is not the owner and not a member of the UA's team |
| `useragent-team-admin-required` (97) | Caller is a team member but not a team admin on the UA's team |
| `useragent-delete-running` | Status is `1` / `2` / `3` / `4` — call `Stop` first and retry once status reaches `0` |
| `useragent-delete-sub-active` | An active subscription is still attached — call `CancelSubscription` first |

#### **POST** /UserAgent/Logs

Live activity feed for a useragent — what the agent did, when, and (post-rollout) which user triggered it. The daemon writes one JSONL row per skill invocation / cron tick / user message into the worker's per-day activity file; this endpoint tails the latest N rows for a given date and decorates each event with the resolved actor.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Your UserAgent instance guid |
| `date` | string | No | Activity date in `YYYY-MM-DD` (or `"today"`). Default: `"today"`. |
| `lines` | number | No | Tail size — most recent N rows. Default `200`, capped at `5000`. |

**Headers:** Owner-or-team-member access. Pass `teamGUID: <team-guid>` for team-scoped agents.

##### Rate limit (non-admin callers)

Non-admin callers are rate-limited via a 30-second Redis cache keyed on `(useragentguid, date, lines)`. The first call within a 30s window hits the worker; subsequent calls within the window receive the cached payload. Admins (`tokenUserRoles` includes `ADMIN`) bypass entirely. Tune your polling cadence to ≥30s for non-admin tokens to avoid serving stale data — the cache TTL was chosen to match the panel's lowest non-admin polling interval.

##### Response

```json
{
  "result": true,
  "errors": [],
  "events": [
    {
      "ts": "2026-05-03T14:00:03.000Z",
      "kind": "token_usage",
      "title": "Turn billed — 5 credits",
      "summary": { "trigger": "chat" },
      "model": "openai/gpt-5.4",
      "tokens": { "input": 3450, "output": 820, "cacheRead": 2400, "cacheWrite": 0, "total": 6670 },
      "tokencost": 5,
      "durationMs": 4200,
      "calls": 2,
      "remainingcredits": 2245,
      "ok": true,
      "userUuid": "ada-uuid",
      "user": {
        "uuid": "ada-uuid",
        "firstname": "Ada",
        "lastname": "Lovelace",
        "email": "ada@example.com",
        "avatar": "https://cdn.wiro.ai/uploads/users/ada-avatar.webp",
        "avatarinitials": "AL"
      }
    },
    {
      "ts": "2026-05-03T14:00:01.000Z",
      "kind": "tool_completed",
      "tool": "exec",
      "title": "Posted carousel: \"Brand voice teaser\"",
      "summary": {
        "skill": "int-instagram-post",
        "action": "create",
        "permalink": "https://www.instagram.com/p/CXY..."
      },
      "durationMs": 2480,
      "ok": true,
      "userUuid": "ada-uuid",
      "user": {
        "uuid": "ada-uuid",
        "firstname": "Ada",
        "lastname": "Lovelace",
        "email": "ada@example.com",
        "avatar": "https://cdn.wiro.ai/uploads/users/ada-avatar.webp",
        "avatarinitials": "AL"
      }
    },
    {
      "ts": "2026-05-03T13:30:00.000Z",
      "kind": "cron_finished",
      "title": "Cron tick: cs-cron-content-scanner",
      "summary": { "skill": "cs-cron-content-scanner", "interval": "0 9 * * *", "trigger": "scheduled", "queued": 3 },
      "durationMs": 1860,
      "ok": true,
      "userUuid": "system",
      "user": null
    }
  ],
  "date": "2026-05-03",
  "totalLines": 1428
}
```

##### Field reference

| Field | Type | Description |
|-------|------|-------------|
| `events[]` | array | One row per activity entry, **newest first** (descending by `ts`) — `events[0]` is the most recent event. Do not re-reverse for display. |
| `events[].ts` | string | ISO-8601 UTC datetime when the event was emitted (e.g. `"2026-05-03T14:00:01.000Z"`). Parse with `Date.parse(ts)` for arithmetic. |
| `events[].kind` | string | Fine-grained event class. One of: `"tool_started"`, `"tool_completed"` (one pair per tool invocation), `"turn_started"`, `"turn_ended"` (LLM turn boundary), `"cron_started"`, `"cron_finished"` (scheduled-cron tick), `"session_start"`, `"session_end"` (chat-session boundary), `"user_message"` (user → agent), `"agent_reply"` (agent → user), `"token_usage"` (a billed turn's token deduct), `"token_usage_idempotent"` (a replayed usage callback — already billed, informational), `"balance_gate_blocked"` (a turn refused because the credit pool was empty). |
| `events[].tool` | string \| null | Present on `tool_started` / `tool_completed`. One of: `"read"`, `"write"`, `"edit"`, `"exec"`, `"web_fetch"`, `"web_search"`, `"sessions_spawn"`, `"message"`. |
| `events[].title` | string | Human-readable one-line description (always present). |
| `events[].summary` | object \| null | Structured event-specific payload. Treat as opaque — render as JSON when expanding. Plugin pre-redacts `apikey`, `apppassword`, `clientsecret`, `bearer`, `token`, etc. before writing. Keys vary per `kind`/`tool`. |
| `events[].durationMs` | number \| null | Wall-clock duration in milliseconds. Populated on `*_completed` / `*_finished` / `turn_ended` / `token_usage` events. |
| `events[].ok` | boolean \| null | `true` on success, `false` on failure. Populated on `*_completed` / `*_finished`. Pair with `error` for failures. |
| `events[].error` | string \| null | One-line failure message (when `ok: false`). |
| `events[].model` | string \| null | Canonical model slug billed for the turn. Present on `token_usage` / `token_usage_idempotent` events. |
| `events[].tokens` | object \| null | Token breakdown on `token_usage` events: `{ input, output, cacheRead, cacheWrite, total }` — **nested camelCase** (distinct from the flat lowercase `inputtokens` / `outputtokens` / … columns on message + transaction rows; same underlying data, different shape). |
| `events[].tokencost` | number \| null | Credits deducted for the turn (1 credit = $0.01). Present on `token_usage` events. |
| `events[].calls` | number \| null | Number of LLM calls made in the billed turn. Present on `token_usage` events. |
| `events[].remainingcredits` | number \| null | Credit pool remaining after the deduct. Present on `token_usage` events. |
| `events[].userUuid` | string \| null | Originating actor's UUID. `"system"` for cron / internal events. May be missing on legacy rows from the 180-day retention window pre-attribution rollout — the server falls back to the useragent owner. |
| `events[].user` | object \| null | Resolved user shape (`uuid`, `firstname`, `lastname`, `email`, `username`, `avatar`, `avatarinitials`) when the actor is a real user. `null` for `system` events. |
| `date` | string | The date that was actually read (`YYYY-MM-DD`). |
| `totalLines` | number | **Total lines in the file** (regardless of `lines` cap). Use this to show "showing X of Y events" headers. |

##### Common errors

| Error | When |
|-------|------|
| `useragentguid is required` | Missing `useragentguid` in the body |
| `Agent is not assigned to a worker. It may not be running.` | The useragent has never been deployed to a worker (no `workerid` set yet) |
| `Worker not found` | Worker row was removed mid-flight (extremely rare) |
| `Failed to fetch activity from worker` | Worker host unreachable / internal error during the tail |

#### **POST** /UserAgent/LogsList

Lists the dates for which an activity log file exists on the worker host. Useful for building a date-picker UI before calling `Logs` / `LogsFile` for that day.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Your UserAgent instance guid |

##### Response

```json
{
  "result": true,
  "errors": [],
  "dates": [
    { "date": "2026-05-03", "sizeBytes": 184320, "compressed": false },
    { "date": "2026-05-02", "sizeBytes": 92160,  "compressed": true  },
    { "date": "2026-05-01", "sizeBytes": 71680,  "compressed": true  }
  ]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `dates[].date` | string | Activity-file date in `YYYY-MM-DD` form. Sorted newest-first. |
| `dates[].sizeBytes` | number | Raw byte size of the file on disk (compressed size if `compressed: true`). |
| `dates[].compressed` | boolean | `true` once the worker's daily maintenance cron has gzipped the file (`<date>.jsonl.gz`); `false` for the active day's plain `.jsonl`. |

The host retains activity files for 180 days (rolling); older dates are pruned by a worker cron and won't appear here.

#### **POST** /UserAgent/LogsDelete

Removes one date's activity JSONL file (and its gzipped sibling if present) from the worker host. Useful for scrubbing a specific day without waiting for the 180-day rotation.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Your UserAgent instance guid |
| `date` | string | Yes | Activity date to purge (`YYYY-MM-DD`). |

**Headers:** Owner-or-team-member access. Pass `teamGUID: <team-guid>` for team-scoped agents.

##### Response

```json
{
  "result": true,
  "errors": [],
  "date": "2026-04-30",
  "removed": { "plain": true, "gz": false }
}
```

Idempotent — deleting an already-gone date returns `result: true` with `removed.plain: false` and `removed.gz: false`.

#### **POST** /UserAgent/LogsFile

Downloads the **full** day's activity log (no `lines` cap). Use this when you need a complete forensic trace — `Logs` is for live-tail UX (capped at 5000 rows for cache hygiene). The response is the same `events[]` shape as `Logs`, plus a `truncated` flag.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Your UserAgent instance guid |
| `date` | string | Yes | Activity date to download (`YYYY-MM-DD`). |

**Headers:** Owner-or-team-member access. Pass `teamGUID: <team-guid>` for team-scoped agents.

##### Response

```json
{
  "result": true,
  "errors": [],
  "events": [/* …full day, newest first (descending by ts)… */],
  "date": "2026-04-30",
  "truncated": false
}
```

`events` is sorted **newest first** (descending by `ts`) — same contract as `Logs`, so `events[0]` is the freshest entry whether you're tailing the live day or downloading a historical one. `truncated: true` only when the worker's read buffer hit a hard ceiling (currently 250k rows / 50 MB). For typical agents this stays `false`; if you ever see `true`, fall back to streaming the file directly via the panel's download link.

#### **POST** /UserAgent/Pin

Pins or unpins an agent instance from the user's pinned-agents quick list. Pinned agents appear in the global header dropdown (`PinnedAgents`) and get an unread badge from `PinnedUnread`.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Your UserAgent instance guid |
| `pinned` | boolean | Yes | `true` to pin, `false` to unpin |

##### Response

```json
{ "result": true, "errors": [] }
```

#### **POST** /UserAgent/PinnedAgents

Lists the user's pinned agents. Returns the **same composed shape as `MyAgents`** — every field that appears on a `MyAgents` row appears here, just filtered to `pinned: true`.

No request body fields are required — the caller's `tokenUUID` (or active `teamGUID` header) scopes the response.

##### Response

```json
{
  "result": true,
  "errors": [],
  "useragents": [
    {
      "guid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
      "uuid": "ada-uuid",
      "agentguid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "teamguid": null,
      "title": "My Instagram Bot",
      "description": null,
      "cover": null,
      "categories": ["social-media", "marketing"],
      "tier": "pro",
      "tiermultiplier": 10,
      "monthlypriceusd": 90,
      "monthlycredits": 2250,
      "extracredits": 2000,
      "usedcredits": 1450,
      "creditperiod": "2026-05",
      "creditsyncat": 1714694410,
      "status": 4,
      "pinned": true,
      "teamsessionmode": "private",
      "setuprequired": false,
      "subscription": {
        "plan": "agent",
        "status": "active",
        "amount": 90,
        "currency": "usd",
        "currentperiodend": 1717200000,
        "renewaldate": "2026-06-01T00:00:00.000Z",
        "daysremaining": 28,
        "pendingdowngrade": null,
        "provider": "prepaid"
      },
      "agent": {
        "guid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "title": "Instagram Manager",
        "slug": "instagram-manager",
        "description": "An autonomous agent that manages your Instagram Business account.",
        "cover": "https://cdn.wiro.ai/uploads/agents/instagram-manager-cover.webp",
        "categories": ["social-media", "marketing"],
        "tiermultiplier": 10,
        "tiers": {
          "starter": { "priceUsd": 9,  "credits": 225 },
          "pro":     { "priceUsd": 90, "credits": 2250 }
        }
      },
      "enabledSkills": ["int-instagram-post", "int-twitterx-post", "int-wiro-aimodels"],
      "tokenRates": {
        "default_model": "openai/gpt-5.6-sol",
        "fallback_rate": { "input_per_1m": 625, "output_per_1m": 3750, "cached_input_per_1m": 62.5, "cache_write_per_1m": 781.25 },
        "models": {
          "openai/gpt-5.6-sol": { "input_per_1m": 625, "output_per_1m": 3750, "cached_input_per_1m": 62.5, "cache_write_per_1m": 781.25, "selectable": true, "label": "GPT-5.6 Sol", "tier": "premium" },
          "openai/gpt-5.6-terra": { "input_per_1m": 250, "output_per_1m": 1500, "cached_input_per_1m": 25, "cache_write_per_1m": 312.5, "selectable": true, "label": "GPT-5.6 Terra", "tier": "balanced" },
          "openai/gpt-5.6-luna": { "input_per_1m": 25, "output_per_1m": 150, "cached_input_per_1m": 2.5, "cache_write_per_1m": 31.25, "selectable": true, "label": "GPT-5.6 Luna", "tier": "cheap" }
        }
      },
      "agentModel": {
        "chatModel": "openai/gpt-5.6-sol",
        "cronModel": "openai/gpt-5.4-mini",
        "voicePrepModel": "openai/gpt-5.4-mini",
        "voicePostcallModel": "openai/gpt-5.4"
      },
      "extracreditsexpiry": 1730419200,
      "createdat": 1714608000,
      "updatedat": 1714694400,
      "queuedat": 1714694395,
      "startedat": 1714694400,
      "runningat": 1714694410,
      "stoppingat": null,
      "stopdat": null,
      "errordat": null
    }
  ]
}
```

#### **POST** /UserAgent/PinnedUnread

Returns the latest message GUID per pinned agent. Compare each `lastmessageguid` against the last value you saw client-side to draw an unread badge — same pattern the Wiro dashboard uses for its global header.

##### Response

```json
{
  "result": true,
  "errors": [],
  "data": [
    { "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321", "lastmessageguid": "5c41dabf-f2be-4aa8-a5a4-8c9e3d2f3f11" },
    { "useragentguid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890", "lastmessageguid": null }
  ]
}
```

### Voice & Realtime

Endpoints for browser-based realtime voice sessions plus the unified call history for both Web and Twilio channels. Per-channel setup, JWT contracts, and the WebSocket protocol live on the dedicated pages:

| Operation | Endpoint |
|-----------|----------|
| Start a browser realtime voice session | `POST /UserAgent/Realtime/WebStart` — see [Web Voice](/docs/integration-webvoice-skills) |
| Cancel a pending realtime session | `POST /UserAgent/Realtime/Cancel` — see [Web Voice — Step 3](/docs/integration-webvoice-skills#step-3-optional-cancel-a-stale-session--post-useragentrealtimecancel) |
| List recent realtime call sessions | `POST /UserAgent/TwilioCallHistory/List` — see [Twilio Voice — Call History](/docs/integration-twiliovoice-skills#call-history) (returns Twilio **and** Web channel sessions despite the Twilio-named path). |

#### **POST** /UserAgent/Realtime/WebStart

Starts a browser-embedded realtime voice session with the agent. Returns a short-lived JWT (5 min) and the WebSocket URL the browser opens to stream microphone audio. The browser presents the JWT as the first WS message (`{ type: "session_start", sessionToken }`); the WebSocket path itself doesn't carry the sessionId.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Useragent must be in `status: 4` and have `util-web-channel` enabled (Voice Receptionist / Voice Sales Rep presets enable it by default; toggle it on custom builds via `SkillsApply`). |
| `session_metadata.page_url` | string | No | Page URL the caller opened the mic from (≤ 2048 chars). Echoed back on Call History. |
| `session_metadata.display_identifier` | string | No | Operator-supplied display name. 1–100 chars, Unicode letters / numbers / spaces / `@ . _ - ' +`; other characters silently dropped. |

##### Response

```json
{
  "result": true,
  "errors": [],
  "sessionId": "vws-9d2d4b6e-3f6b-4c1a-8a7e-1f5a0b2c3d4e",
  "wsUrl": "wss://socket.wiro.ai/v1/AgentRealtime/Web",
  "sessionToken": "<5-min HS256 JWT>",
  "expiresAt": 1748212800000,
  "estimatedReadyMs": 8000
}
```

- **Auth** — same Bearer / API key path as every other `UserAgent/*` endpoint. Bearer requests additionally enforce an Origin allow-list (`https://wiro.ai`, `https://www.wiro.ai`, plus `http://localhost:*` in non-production); API-key requests skip the Origin check.
- **Rate limit** — fixed 60 sessions/hour per operator (hashed key — raw uuid never logged). Override with `AGENT_WEB_REALTIME_RATE_LIMIT_PER_HOUR`. Fast-fail sessions are decremented back from the counter.
- **Full WebSocket protocol, control frames, and JS snippet** — [Web Voice](/docs/integration-webvoice-skills).

##### Common errors

| Error | When |
|-------|------|
| `useragentguid required` | Missing useragent reference. |
| `Agent is not running` | Useragent is not in `status: 4`. |
| `util-web-channel not enabled` | Toggle the skill via `SkillsApply` (custom builds) or pick a preset that bundles it. |
| `web voice only available from Wiro-Web (Bearer auth) or via API key` | Bearer auth with an Origin outside the allow-list. |
| `Rate limit: max N web voice sessions per hour` | Operator burned through the per-hour cap. |

#### **POST** /UserAgent/Realtime/Cancel

Cancels a `WebStart`-initiated session **before the WebSocket handshake**. Use it when the browser can't progress past the mic-permission prompt, or the user changes their mind. Idempotent — repeated calls return the same shape.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sessionId` | string | Yes | The `sessionId` returned by `WebStart`. |
| `sessionToken` | string | Yes | The same JWT `WebStart` returned. Proves the caller actually owns this `sessionId` — the server verifies the signature and checks `payload.sessionId === body.sessionId`. |

##### Response

```json
{ "result": true, "sessionId": "vws-9d2d4b6e-...", "cancelled": true }
```

| HTTP | Error |
|------|-------|
| 400 | `sessionId and sessionToken required` |
| 401 | `invalid token` (signature mismatch, expired, malformed) |
| 403 | `sessionId mismatch` (JWT claim doesn't match body) |

> Without this call, the server-side agent prep `WebStart` kicked off lingers for ~5 minutes (the fallback cleanup guard) before being released — calling `Cancel` immediately frees the prep state and releases the held realtime session slot.

#### **POST** /UserAgent/TwilioCallHistory/List

Returns the last N realtime voice sessions for a useragent — **both Twilio and Web channels** despite the Twilio-named path, since they share the same `agentmessages.metadata.type` realtime_session prefix. Owner / team-member access only.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Useragent instance guid. |
| `limit` | number | No | Max sessions to return. Default `50`, hard-capped at `200`. Sorted newest-first. |

##### Response

```json
{
  "result": true,
  "errors": [],
  "data": [
    {
      "messageguid": "5c41dabf-f2be-4aa8-a5a4-8c9e3d2f3f11",
      "agenttoken": "8a5b9e2f-4d3c-4a01-9c2e-1b6d4e7a9c5d",
      "channel": "twilio",
      "callsid": "CAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      "callerInfo": { "number": "+15551234567", "country": "US" },
      "callerProfile": "Returning caller — last asked about pricing. Mentioned company name 'Acme Corp'.",
      "status": "realtime_session",
      "endReason": "wiro_completed",
      "durationSeconds": 137,
      "modelSlug": "gpt-realtime-mini",
      "startedAt": 1730473321000,
      "endedAt":   1730473458000
    },
    {
      "messageguid": "9d11baa2-7ce8-44b7-a3e0-2f8a31f6c4ee",
      "agenttoken": "8a5b9e2f-4d3c-4a01-9c2e-1b6d4e7a9c5d",
      "channel": "web",
      "callsid": "voice-call-7f3c2b1d8e",
      "callerInfo": { "page_url": "https://example.com/contact", "display_identifier": "+15551234567" },
      "callerProfile": null,
      "status": "realtime_session",
      "endReason": "browser_disconnect",
      "durationSeconds": 84,
      "modelSlug": "gpt-realtime-mini",
      "startedAt": 1730473601000,
      "endedAt":   1730473685000
    }
  ]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `messageguid` | string | The `agentmessages.guid` row that holds this call. Use it with `Message/Detail` for the full transcript. |
| `agenttoken` | string | Useragent token. Same value across all rows for a given agent. |
| `channel` | `"twilio"` \| `"web"` | Which voice surface served the call. |
| `callsid` | string | Twilio Call SID for `channel: "twilio"`; the internal session id (`voice-call-*`) for `channel: "web"`. |
| `callerInfo` | object | Twilio rows: `{ number, country }` (E.164 + ISO-2). Web rows: `{ page_url, display_identifier? }` — `display_identifier` is only present when the embedding page validated a phone-style identifier; `page_url` is the page hosting the widget. |
| `callerProfile` | string \| null | Free-text persona summary written by the prep step (`prepSummary`). `null` when the bridge hasn't finished prep yet. |
| `status` | string | `realtime_session_incoming` (call accepted, prep in flight) → `realtime_session_active` (audio flowing) → `realtime_session` (completed normally) or `realtime_session_rejected` (rejected before active state, with `metadata.reason`). |
| `endReason` | string \| null | Set on `realtime_session` rows only. One of: `wiro_completed`, `wiro_cancelled`, `wiro_disconnect`, `wiro_error`, `twilio_disconnect`, `browser_disconnect`, `max_duration`. `null` while the call is still in flight or rejected. |
| `durationSeconds` | number \| null | Total elapsed seconds. `null` until end. |
| `modelSlug` | string \| null | Realtime model slug used for this call (e.g. `gpt-realtime-mini`). |
| `startedAt` / `endedAt` | number \| null | Unix epoch ms. `endedAt` stays `null` until the call finishes or is rejected. |

Rows are returned newest-first. Rejected sessions (`realtime_session_rejected`) are intermixed and carry `metadata.reason` — visible by reading the same `messageguid` via `Message/Detail` — with values: `concurrent_limit`, `agent_prep_timeout`, `realtime_ws_open_failed`, `realtime_stream_timeout`. Full field reference: [Twilio Voice — Call History](/docs/integration-twiliovoice-skills#call-history).

### Extra Credit Packs

Pro-tier instances can buy additional credits at any time. Pack catalogs are derived per-useragent (5x / 10x / 20x of the instance's monthly allocation), so the catalog auto-scales when the user upgrades from Starter → Pro or toggles paid skills.

The catalog appears at `agent.extracreditpacks` on `UserAgent/Detail`:

```json
"extracreditpacks": [
  { "packkey": "small",  "credits": 11250, "priceusd": 450,  "enabled": true },
  { "packkey": "medium", "credits": 22500, "priceusd": 900,  "enabled": true },
  { "packkey": "large",  "credits": 45000, "priceusd": 1800, "enabled": true }
]
```

Each pack carries:

| Field | Type | Description |
|-------|------|-------------|
| `packkey` | string | The pack identifier — `"small"`, `"medium"`, or `"large"`. Pass this as `pack` in `POST /UserAgent/CreateExtraCreditCheckout`. |
| `credits` | number | Credit amount this pack adds when purchased. |
| `priceusd` | number | Pack price in USD (debited from the wallet on purchase). |
| `enabled` | boolean | Whether the pack is currently purchasable. The list is server-filtered to enabled packs, so every entry here is `true`. |

#### **POST** /UserAgent/CreateExtraCreditCheckout

Purchases additional credits for a useragent. The wallet is debited the pack price and credits are added to the instance immediately.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Your UserAgent instance guid |
| `pack` | string | Yes | Pack key from `agent.extracreditpacks[].key` — `"small"`, `"medium"`, or `"large"`. |
| `useprepaid` | boolean | Yes | Must be `true` for API use. Pays the pack price from your wallet balance. |

##### Request

```json
{
  "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
  "pack": "medium",
  "useprepaid": true
}
```

##### Response

```json
{
  "result": true,
  "errors": []
}
```

The pack price is deducted from your wallet and credits are added to the instance immediately. Credits expire 6 months after purchase. The transaction is appended to the agent ledger (`type: "purchase"`, `action: "<pack>"`, `provider: "prepaid"`) and surfaced on `POST /UserAgent/TransactionList`.

#### **POST** /UserAgent/CancelSubscription

Schedules the subscription to end at the current billing period's expiry — a **cancel-at-period-end** pattern. The agent keeps running with the full plan allowance until that moment. No wallet refund is issued for the remaining days; you're paying for the full period up front.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `guid` | string | Yes | Your UserAgent instance guid |

**Headers:** Pass `teamGUID: <team-guid>` when the target agent belongs to a team project (the endpoint validates team context explicitly for all billing mutations).

##### Response

```json
{
  "result": true,
  "cancelsAt": 1717200000,
  "errors": []
}
```

- `cancelsAt` is the Unix timestamp when the subscription will finish.
- Server-side, `subscription.pendingdowngrade` is flipped to `"cancel"` and `subscription.status` stays `"active"` until the period end. Subsequent `UserAgent/Detail` responses reflect this: `subscription.pendingdowngrade = "cancel"` and the usual `currentperiodend`.
- To reverse the cancellation **before** the period ends, call `POST /UserAgent/RenewSubscription` — it clears the flag without charging the wallet again.
- When the period actually ends, the daily cron marks the subscription `"expired"` and stops the agent (`status: 0`). At that point the user must call `POST /UserAgent/RenewSubscription` (or `CreateSubscriptionCheckout` for a fresh sub) to continue.

**Common errors:**

| Error | When |
|-------|------|
| `No active subscription found for this agent` | `status != "active"` on the subscription row |
| `User agent not found` | Caller doesn't own the useragent and isn't a team admin |

#### **POST** /UserAgent/UpgradeTier

Upgrades the active subscription from **Starter → Pro**. The capability surface stays the same; the tier change just scales the credit pool and price by `tiermultiplier`.

**Upgrade-only.** Pro → Starter downgrades are rejected with an explicit error — cancel and redeploy at the lower tier instead.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `guid` | string | Yes | Your UserAgent instance guid |
| `targetTier` | string | Yes | Must be `"pro"` (`"starter"` is rejected with the downgrade error). The parameter name is `targetTier` — passing it as `tier` returns `"targetTier must be 'starter' or 'pro'"` instead of being silently coerced. |

**Headers:** Pass `teamGUID: <team-guid>` when the target agent belongs to a team project.

API-deployed agents always upgrade through the prepaid path. The endpoint debits the prorated upgrade fee `Math.max(0, ((P_pro − P_starter) / totalDays) × remainingDays)` from your wallet synchronously, updates the subscription row + useragent snapshot to Pro pricing / credits inline, and restarts the daemon to refresh `settings.json`. Existing extra credits and `usedcredits` are preserved.

##### Response

```json
{
  "result": true,
  "tier": "pro",
  "previousTier": "starter",
  "newPriceUsd": 90,
  "newMonthlyCredits": 2250,
  "proratedCharge": 45.90,
  "errors": []
}
```

#### **POST** /UserAgent/RenewSubscription

Two distinct operations share this endpoint depending on the subscription's current state:

1. **Undo-cancel** — active subscription with `pendingdowngrade: "cancel"` → clears the flag, **no wallet charge**.
2. **Renew** — subscription in `"expired"` status → creates a brand-new 30-day subscription, charges the wallet for the full plan price, resets the useragent to `status: 0` (Stopped).

The endpoint inspects the current subscription state and picks the right operation; the caller doesn't choose.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `guid` | string | Yes | Your UserAgent instance guid |

**Headers:** Pass `teamGUID: <team-guid>` when the target agent belongs to a team project.

> Renewal pricing is **snapshot-driven** — `monthlypriceusd` and `monthlycredits` are read straight off the useragent row (last touched by `Deploy`, `SkillsApply`, or `UpgradeTier`). Skill-registry weight changes between renewals do **not** propagate; the user keeps the price they last agreed to. To pick up new pricing, the user must explicitly call `SkillsApply` or `UpgradeTier` (both re-snapshot in the same transaction).

##### Response — undo-cancel

Called while the subscription is still `"active"` with a pending cancel flag set by `CancelSubscription`:

```json
{
  "result": true,
  "action": "undo-cancel",
  "errors": []
}
```

- Clears `subscription.pendingdowngrade` back to `null`.
- **No wallet charge** — you've already paid for the full period.
- Agent status is unchanged (still running / stopped / whatever it was).

##### Response — renew

Called after the subscription has expired (daily cron flipped it to `status: "expired"` and stopped the agent). The renewal rolls the existing expired subscription forward into a fresh 30-day `active` row instead of inserting a new one:

```json
{
  "result": true,
  "action": "renewed",
  "plan": "agent",
  "amount": 9,
  "monthlycredits": 225,
  "errors": []
}
```

- Updates the `subscriptions` row in place: `status: "active"`, `type: "renewal"`, `currentperiodstart: now`, `currentperiodend: now + 30 days`, `pendingdowngrade: null`.
- Debits `amount` (the snapshot `monthlypriceusd`) from the wallet (caller's personal wallet, or the agent's team wallet if the agent is team-scoped).
- Zeroes `usedcredits` and stamps the new `creditperiod`. Existing extra credits are preserved.
- If the agent was in `status: 0` (Stopped) or `5` (Error), it's auto-queued back to `2` (Queued) — the daemon picks it up on the next cycle, no extra `Start` call needed. Statuses `1`/`2`/`3`/`4` are mid-flight and the daemon settles them on its own.

**Common errors:**

| Error | When |
|-------|------|
| `Subscription is already active` | Called on an active subscription with **no** pending cancel (nothing to do) |
| `No expired subscription found to renew` | No active sub and no expired sub — agent was never subscribed, or data is gone |
| `Renewal pricing must be greater than $0. Add at least one paid skill or set agent base price.` | The persisted `monthlypriceusd` snapshot is $0 (custom build with all-free skills); add a paid skill via `SkillsApply` before renewing |
| `Insufficient wallet balance. Required: $X.XX, Available: $Y.YY` | Wallet (personal or team) can't cover the renewal price |

##### Full subscription lifecycle (prepaid)

```
                  Deploy (wallet charged, period starts)
                         │
                         ▼
              ┌────────────────────────┐
              │ status: "active"       │
              │ pendingdowngrade: null │◄──────── RenewSubscription
              └───────────┬────────────┘          (undo-cancel, no charge)
                          │                       ▲
                          │ CancelSubscription    │
                          ▼                       │
              ┌────────────────────────┐          │
              │ status: "active"       │──────────┘
              │ pendingdowngrade:      │
              │   "cancel"             │
              └───────────┬────────────┘
                          │ currentperiodend reached
                          │ (daily cron)
                          ▼
              ┌────────────────────────┐
              │ status: "expired"      │
              │ useragent.status: 0    │◄───┐
              └───────────┬────────────┘    │
                          │                 │
                          │ RenewSubscription (wallet charged,
                          │ new 30-day period, useragent stays 0)
                          ▼                 │
              ┌────────────────────────┐    │
              │ NEW subscription row   │────┘
              │ status: "active"       │
              │ type: "renewal"        │
              └────────────────────────┘
```

## Pricing Summary

| Component | Source | Notes |
|-----------|--------|-------|
| **Tier price** | `agent.tiers.{starter,pro}.price` | Snapshotted on the useragent at deploy as `monthlypriceusd`. Pro = Starter × `tiermultiplier`. |
| **Monthly credits** | `agent.tiers.{starter,pro}.credits` | Snapshotted on the useragent at deploy as `monthlycredits`. Pro = Starter × `tiermultiplier`. |
| **Per-turn token cost** | `tokenRates` (per-model) | Each chat / cron / voice-prep turn deducts credits metered by the tokens its model consumes (1 credit = $0.01). Tier-independent — Pro just buys a larger monthly credit pool. |
| **Tier multiplier** | `agent.tiermultiplier` | Default `10`. Snapshotted on the useragent at deploy so admin tweaks don't retroactively change live instances (existing instances keep the multiplier they were deployed under). |
| **Extra credit packs** | `agent.extracreditpacks[]` | Per-useragent — derived as 5x / 10x / 20x of `monthlycredits`. Pro tier only (Starter has empty array). |

### Payment Method

All API subscriptions use your **prepaid wallet balance**. The cost is deducted immediately when you deploy, renew, upgrade, or buy an extra credit pack. Always pass `useprepaid: true` on `Deploy`, `CreateSubscriptionCheckout`, and `CreateExtraCreditCheckout` — that's the only path designed for API consumers. Make sure your wallet balance covers the upfront tier price before calling these endpoints; otherwise you'll get an `Insufficient wallet balance` error.

### Credit Consumption

Credits are consumed by the agent runtime (container) as it processes messages and generates content — not at `Message/Send` time. Each turn is billed by **token usage**: the runtime reports the input / output / cached token counts once the turn completes, Wiro meters them against the per-model `tokenRates` (1 credit = $0.01), writes an `action: "tokens"` deduct row, bumps `usedcredits`, and derives the live `remainingcredits = max(0, monthlycredits + extracredits - usedcredits)`. You don't send anything — token billing is fully server-side. Per-turn token counts and cost also ride on each assistant message and arrive over the message WebSocket as an `agent_usage_report` frame (see [Agent Messaging](/docs/agent-messaging) and [Agent WebSocket](/docs/agent-websocket)).

The API-side check is gating only: `POST /UserAgent/Start` and `POST /UserAgent/Message/Send` refuse to launch / accept messages when `remainingcredits <= 0`, returning an `Agent has no remaining credits…` error plus an `agentbalance` snapshot (`{ monthlycredits, extracredits, usedcredits, remainingcredits }`). During an active session, monthly credits are consumed first; once `usedcredits >= monthlycredits`, extra credits (purchased via `CreateExtraCreditCheckout`) absorb the rest. When both pools are empty the agent stops accepting new turns until the subscription renews or an extra credit pack is bought.

On each billing cycle (subscription renewal) `usedcredits` is reset to zero and `creditperiod` advances to the new `'YYYY-MM'` window; extra-credit purchases simply bump `extracredits` without resetting usage.

For the full audit trail (every token deduct / grant / purchase / renewal / expiry) call [`POST /UserAgent/TransactionList`](/docs/agent-transactions#post-useragenttransactionlist) — see [Agent Transactions](/docs/agent-transactions).

## Error Messages

Agent-specific errors you may encounter:

| Error | When |
|-------|------|
| `Agent not found` | The `agentguid` or `slug` does not match any catalog agent |
| `User agent not found` | The `guid` does not match any of your deployed instances |
| `Agent not found or inactive` | The catalog agent exists but is disabled |
| `Subscription price must be greater than $0. Add at least one paid skill or set agent base price.` | Custom build with a $0 skill set — toggle on at least one paid skill |
| `Agent is already running` | Start called on an agent with status `3` or `4` |
| `Agent is already queued to start` | Start called on an agent with status `2` |
| `Agent is already stopped` | Stop called on an agent with status `0` |
| `Agent is currently stopping, please wait` | Start called on an agent with status `1` |
| `Agent is in error state, use Start to retry` | Stop called on an agent with status `5` |
| `Duplicate deploy: an identical agent ("<title>") was already deployed Ns ago. Open the existing one in your panel, or wait a few seconds and retry.` | `Deploy` called a second time within 10s for the same `(uuid, agentid, teamguid)` tuple (custom builds: `(uuid, title, teamguid)`). Carries `errors[0].code: 99` and a top-level `existingUserAgentGuid` field. |
| `Agent setup is not complete. Please fill in your credentials before starting.` | Status is `6` — call `CredentialUpsert` / `SkillsApply` / `CustomSkillUpsert` to provide required values |
| `Subscription required — please subscribe to this agent before starting it.` | `Start` called on a row with no active subscription AND no spendable extras (`extracredits - usedcredits ≤ 0`). Most often hit after a subscription expires with empty extras — call `RenewSubscription` (`useprepaid: true`) to continue. Admin-role callers bypass this guard. |
| `No credits available. Please renew your subscription or purchase extra credits.` | Monthly and extra credits are both exhausted |
| `Cannot edit skills on a template agent — only custom-built agents support skill editing.` | `SkillsApply` called on a template-deploy useragent (returned with error code `100`). Skills are inherited from the template — to change them, deploy a custom build (`Deploy` with `custom: true`) instead. |
| `Subscription already active for this useragent. Cancel or modify the existing subscription instead.` | `CreateSubscriptionCheckout` called when a sub already exists |
| `Insufficient wallet balance for proration. Required: $X.XX, available: $Y.YY` | `SkillsApply` — wallet can't cover the prorated charge |
| `targetTier must be 'starter' or 'pro'` | `UpgradeTier` with a `targetTier` outside the closed enum (typos, missing parameter name, etc.). Unlike `Deploy`'s silent coercion, `UpgradeTier` rejects invalid input explicitly. |
| `Downgrading to Starter is not supported. /UserAgent/UpgradeTier is upgrade-only (Starter → Pro).` | `UpgradeTier` with `targetTier: "starter"` |
| `Already on {tier} tier` | `UpgradeTier` when current tier matches the target — no-op |
| `No active subscription — use /UserAgent/CreateSubscriptionCheckout to subscribe at the chosen tier` | `UpgradeTier` called without an active sub |
| `Failed to compute target-tier pricing` | `UpgradeTier` — pricing resolver returned null (skill registry inconsistency) |
| `Insufficient wallet balance. Required: $X.XX, Available: $Y.YY` | `UpgradeTier` — wallet can't cover the prorated upgrade charge |
| `Wallet deduction failed: {error}` | `UpgradeTier` — wallet write itself failed (rare; transient backend error) |
| `Agent not found or access denied` | Message endpoint with invalid useragentguid |
| `Agent is not running. Current status: {n}` | `Message/Send` when not running. Response includes `agentstatus` (the integer) so the FE can branch. |
| `Agent has no remaining credits. Renew your subscription or buy a credit pack to continue.` | `Message/Send` while `remainingcredits <= 0`. Response includes `agentbalance` for the FE to render a "Buy credits" CTA. |
| `Message not found` | `Detail` / `Cancel` with invalid messageguid |
| `Message cannot be cancelled (status: {status})` | `Cancel` on a message that's already in a terminal state |
| `Invalid redirect URL` | OAuth `Connect` with non-HTTPS URL |
| `Pack key required` | `CreateExtraCreditCheckout` without `pack` |
| `Could not retrieve wallet balance` | Wallet service lookup failed while checking balance |

## Code Examples

### curl

```bash
# List available agents (no auth required)
curl -X POST "https://api.wiro.ai/v1/Agent/List" \
  -H "Content-Type: application/json" \
  -d '{"limit": 10}'

# Get agent details by slug (no auth required)
curl -X POST "https://api.wiro.ai/v1/Agent/Detail" \
  -H "Content-Type: application/json" \
  -d '{"slug": "instagram-manager"}'

# Deploy a new agent instance (prepaid, pinned by default)
curl -X POST "https://api.wiro.ai/v1/UserAgent/Deploy" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "agentguid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "title": "My Instagram Bot",
    "useprepaid": true,
    "tier": "starter"
  }'

# Deploy for an end user (unpinned, won't clutter your dashboard)
curl -X POST "https://api.wiro.ai/v1/UserAgent/Deploy" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "agentguid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "title": "Customer #1234 Bot",
    "useprepaid": true,
    "tier": "starter"
  }'

# Build a custom agent (no template — pick your own skill set)
curl -X POST "https://api.wiro.ai/v1/UserAgent/Deploy" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "custom": true,
    "title": "Inbox Watcher",
    "useprepaid": true,
    "tier": "pro",
    "skills": { "int-gmail-check": true, "int-wiro-aimodels": true }
  }'

# Live pricing preview before committing a skill change
curl -X POST "https://api.wiro.ai/v1/UserAgent/PricingPreview" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
    "skillOverrides": { "int-twitterx-post": true }
  }'

# Cancel a subscription (cancels at end of billing period)
curl -X POST "https://api.wiro.ai/v1/UserAgent/CancelSubscription" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{"guid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321"}'

# Upgrade Starter → Pro (prepaid, prorated charge)
curl -X POST "https://api.wiro.ai/v1/UserAgent/UpgradeTier" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{"guid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321", "targetTier": "pro"}'

# Renew expired subscription (or undo a pending cancel)
curl -X POST "https://api.wiro.ai/v1/UserAgent/RenewSubscription" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{"guid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321"}'

# Buy extra credits with prepaid wallet
curl -X POST "https://api.wiro.ai/v1/UserAgent/CreateExtraCreditCheckout" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{"useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321", "pack": "small", "useprepaid": true}'

# Start an agent
curl -X POST "https://api.wiro.ai/v1/UserAgent/Start" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{"guid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321"}'

# Get agent instance details
curl -X POST "https://api.wiro.ai/v1/UserAgent/Detail" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{"guid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321"}'

# Update credentials on a running agent (triggers automatic restart)
curl -X POST "https://api.wiro.ai/v1/UserAgent/CredentialUpsert" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
    "fields": [
      { "credentialkey": "instagram", "fieldname": "authmethod", "fieldvalue": "wiro" }
    ]
  }'

# Stop an agent
curl -X POST "https://api.wiro.ai/v1/UserAgent/Stop" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{"guid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321"}'
```

### Python

```python
import requests

headers = {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
}

# List available agents (no auth required)
catalog = requests.post(
    "https://api.wiro.ai/v1/Agent/List",
    json={"limit": 10}
).json()
for agent in catalog["agents"]:
    print(f"{agent['title']} ({agent['slug']}) — Starter ${agent['tiers']['starter']['price']}/mo")

# Get agent details by slug
detail = requests.post(
    "https://api.wiro.ai/v1/Agent/Detail",
    json={"slug": "instagram-manager"}
).json()
agent = detail["agents"][0]
print(f"Credentials needed: {list(agent['credentials'].keys())}")

# Deploy a new instance (prepaid wallet, Starter tier)
deploy = requests.post(
    "https://api.wiro.ai/v1/UserAgent/Deploy",
    headers=headers,
    json={
        "agentguid": agent["guid"],
        "title": "My Instagram Bot",
        "useprepaid": True,
        "tier": "starter"
    }
).json()
instance_guid = deploy["useragents"][0]["guid"]
print(f"Deployed: {instance_guid}")

# Update credentials
requests.post(
    "https://api.wiro.ai/v1/UserAgent/CredentialUpsert",
    headers=headers,
    json={
        "useragentguid": instance_guid,
        "fields": [
            { "credentialkey": "instagram", "fieldname": "authmethod", "fieldvalue": "wiro" }
        ]
    }
)

# Start the agent
requests.post(
    "https://api.wiro.ai/v1/UserAgent/Start",
    headers=headers,
    json={"guid": instance_guid}
)

# Check status
import time
while True:
    resp = requests.post(
        "https://api.wiro.ai/v1/UserAgent/Detail",
        headers=headers,
        json={"guid": instance_guid}
    ).json()
    status = resp["useragents"][0]["status"]
    print(f"Status: {status}")
    if status == 4:
        print("Agent is running!")
        break
    if status == 5:
        print("Agent errored")
        break
    time.sleep(5)

# Upgrade Starter → Pro (prorated, debited from wallet)
requests.post(
    "https://api.wiro.ai/v1/UserAgent/UpgradeTier",
    headers=headers,
    json={"guid": instance_guid, "targetTier": "pro"}
)

# Buy extra credits (Pro tier — prepaid wallet)
requests.post(
    "https://api.wiro.ai/v1/UserAgent/CreateExtraCreditCheckout",
    headers=headers,
    json={"useragentguid": instance_guid, "pack": "small", "useprepaid": True}
)

# List your deployed agents
my_agents = requests.post(
    "https://api.wiro.ai/v1/UserAgent/MyAgents",
    headers=headers,
    json={"limit": 50}
).json()
for ua in my_agents["useragents"]:
    print(f"{ua['title']} - status: {ua['status']} - tier: {ua.get('tier')}")

# Stop the agent
requests.post(
    "https://api.wiro.ai/v1/UserAgent/Stop",
    headers=headers,
    json={"guid": instance_guid}
)
```

### Node.js

```javascript
const axios = require('axios');

const headers = {
  'x-api-key': 'YOUR_API_KEY',
  'Content-Type': 'application/json'
};

async function main() {
  // List available agents (no auth required)
  const catalog = await axios.post(
    'https://api.wiro.ai/v1/Agent/List',
    { limit: 10 }
  );
  catalog.data.agents.forEach(a =>
    console.log(`${a.title} (${a.slug}) — Starter $${a.tiers.starter.price}/mo`)
  );

  // Get agent details by slug
  const detail = await axios.post(
    'https://api.wiro.ai/v1/Agent/Detail',
    { slug: 'instagram-manager' }
  );
  const agent = detail.data.agents[0];

  // Deploy a new instance (prepaid wallet, Starter tier)
  const deploy = await axios.post(
    'https://api.wiro.ai/v1/UserAgent/Deploy',
    { agentguid: agent.guid, title: 'My Instagram Bot', useprepaid: true, tier: 'starter' },
    { headers }
  );
  const instanceGuid = deploy.data.useragents[0].guid;
  console.log('Deployed:', instanceGuid);

  // Update credentials
  await axios.post(
    'https://api.wiro.ai/v1/UserAgent/CredentialUpsert',
    {
      useragentguid: instanceGuid,
      fields: [
        { credentialkey: 'instagram', fieldname: 'authmethod', fieldvalue: 'wiro' }
      ]
    },
    { headers }
  );

  // Start the agent
  await axios.post(
    'https://api.wiro.ai/v1/UserAgent/Start',
    { guid: instanceGuid },
    { headers }
  );

  // Poll until running
  while (true) {
    const resp = await axios.post(
      'https://api.wiro.ai/v1/UserAgent/Detail',
      { guid: instanceGuid },
      { headers }
    );
    const status = resp.data.useragents[0].status;
    console.log('Status:', status);
    if (status === 4) { console.log('Agent is running!'); break; }
    if (status === 5) { console.log('Agent errored'); break; }
    await new Promise(r => setTimeout(r, 5000));
  }

  // Upgrade Starter → Pro
  await axios.post(
    'https://api.wiro.ai/v1/UserAgent/UpgradeTier',
    { guid: instanceGuid, targetTier: 'pro' },
    { headers }
  );

  // Buy extra credits (prepaid wallet)
  await axios.post(
    'https://api.wiro.ai/v1/UserAgent/CreateExtraCreditCheckout',
    { useragentguid: instanceGuid, pack: 'small', useprepaid: true },
    { headers }
  );

  // Stop the agent
  await axios.post(
    'https://api.wiro.ai/v1/UserAgent/Stop',
    { guid: instanceGuid },
    { headers }
  );
}

main();
```

### PHP

```php
<?php
$apiKey = "YOUR_API_KEY";

// List available agents (no auth required)
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, "https://api.wiro.ai/v1/Agent/List");
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ["Content-Type: application/json"]);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(["limit" => 10]));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$catalog = json_decode(curl_exec($ch), true);
curl_close($ch);

// Deploy a new instance (prepaid wallet, Starter tier)
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, "https://api.wiro.ai/v1/UserAgent/Deploy");
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Content-Type: application/json",
    "x-api-key: $apiKey"
]);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
    "agentguid" => "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "title" => "My Instagram Bot",
    "useprepaid" => true,
    "tier" => "starter"
]));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$deploy = json_decode(curl_exec($ch), true);
curl_close($ch);
echo "Deployed: " . $deploy["useragents"][0]["guid"];
```

### C#

```csharp
using var client = new HttpClient();
client.DefaultRequestHeaders.Add("x-api-key", "YOUR_API_KEY");

// Deploy a new instance (prepaid wallet, Starter tier)
var deployContent = new StringContent(
    JsonSerializer.Serialize(new {
        agentguid = "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        title = "My Instagram Bot",
        useprepaid = true,
        tier = "starter"
    }),
    Encoding.UTF8, "application/json");

var deployResp = await client.PostAsync(
    "https://api.wiro.ai/v1/UserAgent/Deploy", deployContent);
var deployResult = await deployResp.Content.ReadAsStringAsync();
Console.WriteLine(deployResult);

// Start the agent
var startContent = new StringContent(
    JsonSerializer.Serialize(new {
        guid = "f8e7d6c5-b4a3-2190-fedc-ba0987654321"
    }),
    Encoding.UTF8, "application/json");

var startResp = await client.PostAsync(
    "https://api.wiro.ai/v1/UserAgent/Start", startContent);
Console.WriteLine(await startResp.Content.ReadAsStringAsync());
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
    // Deploy a new instance (prepaid wallet, Starter tier)
    body, _ := json.Marshal(map[string]interface{}{
        "agentguid":  "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "title":      "My Instagram Bot",
        "useprepaid": true,
        "tier":       "starter",
    })
    req, _ := http.NewRequest("POST",
        "https://api.wiro.ai/v1/UserAgent/Deploy",
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

let url = URL(string: "https://api.wiro.ai/v1/UserAgent/Deploy")!
var request = URLRequest(url: url)
request.httpMethod = "POST"
request.setValue("application/json",
    forHTTPHeaderField: "Content-Type")
request.setValue("YOUR_API_KEY",
    forHTTPHeaderField: "x-api-key")
request.httpBody = try! JSONSerialization.data(
    withJSONObject: [
        "agentguid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "title": "My Instagram Bot",
        "useprepaid": true,
        "tier": "starter"
    ])

let (data, _) = try await URLSession.shared
    .data(for: request)
print(String(data: data, encoding: .utf8)!)
```

### Kotlin

```kotlin
import java.net.HttpURLConnection
import java.net.URL

val url = URL("https://api.wiro.ai/v1/UserAgent/Deploy")
val conn = url.openConnection() as HttpURLConnection
conn.requestMethod = "POST"
conn.setRequestProperty("Content-Type", "application/json")
conn.setRequestProperty("x-api-key", "YOUR_API_KEY")
conn.doOutput = true
conn.outputStream.write("""{
    "agentguid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "title": "My Instagram Bot",
    "useprepaid": true,
    "tier": "starter"
}""".toByteArray())

val response = conn.inputStream.bufferedReader().readText()
println(response)
```

### Dart

```dart
import 'dart:convert';
import 'package:http/http.dart' as http;

final response = await http.post(
  Uri.parse('https://api.wiro.ai/v1/UserAgent/Deploy'),
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'YOUR_API_KEY',
  },
  body: jsonEncode({
    'agentguid': 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'title': 'My Instagram Bot',
    'useprepaid': true,
    'tier': 'starter',
  }),
);
print(response.body);
```

## What's Next

- [Agent Builder](/docs/agent-builder) — Build custom agents from scratch (`custom: true`) with live pricing previews and skill picker
- [Agent Skills](/docs/agent-skills) — Configure preferences, scheduled tasks, and skill toggles. Includes the registry browser endpoints (`Skills/List`, `Skills/Detail`, `Skills/Capabilities`)
- [Agent Credentials](/docs/agent-credentials) — Integration catalog hub: 20+ dedicated per-provider setup guides (Meta Ads, Facebook, Instagram, LinkedIn, Twitter, and more) plus the registry endpoints (`Credentials/List`, `Credentials/Detail`)
- [Agent Messaging](/docs/agent-messaging) — Send messages and receive responses from running agents
- [Agent WebSocket](/docs/agent-websocket) — Real-time response streaming
- [Agent Webhooks](/docs/agent-webhooks) — Receive agent responses via HTTP callbacks
- [Agent Transactions](/docs/agent-transactions) — Per-instance credit ledger (deductions, renewals, purchases, grants, refunds)
- [Agent Logs](/docs/agent-logs) — Per-instance activity feed (tool calls, cron runs, message exchanges)
- [Authentication](/docs/authentication) — API key setup and authentication methods

---

# Agent Builder

Build a custom agent from scratch — no marketplace template required. Pick your own skill set, preview the live tier price, and deploy in one call.

## Overview

Wiro's agent runtime supports two deploy paths:

| Path | When to use | Endpoint |
|------|-------------|----------|
| **Template deploy** | The marketplace already has an agent that does what you need (Instagram Manager, Push Notifications, App Review Support, …). You inherit the template's default skill set + configuration. | `POST /UserAgent/Deploy` with `agentguid` |
| **Custom build** | You want a unique skill combination — for example a custom support bot that watches Gmail, publishes a daily digest to WordPress, and uses Wiro's image generator. No marketplace template fits. | `POST /UserAgent/Deploy` with `custom: true` |

The two paths produce the **same useragent shape** at the end (same `customskills`, `scheduledskills`, `credentials`, `subscription`, `tokenRates`, etc.). The only differences are:

| Aspect | Template deploy | Custom build |
|--------|-----------------|--------------|
| `useragents.agentid` | The catalog row id | `null` |
| Pricing recipe | Computed from the template's default skill set | Computed from the skills **you** toggled on |
| `agent.tiers` on the response | Template's tier numbers | Live-resolved per-instance tier numbers |
| `agent.cover` on the response | Template's cover image | The `cover` you sent at Deploy (or a placeholder) |
| Cascade updates | When admin pushes a preset edit, your useragent reconciles | No template — the agent is fully owned by you |

> **Custom builds don't share a marketplace listing.** They are private to your account; nothing about a custom agent appears on `/Agent/List` or `/Agent/Detail`. Discovery happens through your own product surface.

## Step 1 — Browse Available Skills

Custom builds start from the **skill registry** — the catalogue of every skill the platform supports. Browse it with [`POST /Skills/List`](/docs/agent-skills#post-skillslist) and inspect details with [`POST /Skills/Detail`](/docs/agent-skills#post-skillsdetail).

Both endpoints are **public — no authentication required.**

```bash
# Browse all integration skills
curl -X POST "https://api.wiro.ai/v1/Skills/List" \
  -H "Content-Type: application/json" \
  -d '{ "category": "int" }'
```

Pick the skill names you want to enable. Each skill descriptor tells you:

- `name` — the canonical skill key you'll send in `skills` / `skillOverrides`
- `category` — `int` (integration with a third-party service) or `util` (utility / rule-only, no credential)
- `credential_key` — which credential the skill needs (`null` for `util` or platform-managed skills)
- `requires_credentials` — boolean, whether the user must supply a credential before the skill can run
- `depends_on` — array of skill names that must also be enabled (Wiro auto-enables transitive deps)
- `conflicts_with` — array of skill names that cannot coexist with this one
- `pricing` — the per-skill pricing recipe (`monthly_price_weight_usd`, `monthly_credits_weight`, `billing_model: "tokens"`)

> **Use [`POST /Skills/Capabilities`](/docs/agent-skills#post-skillscapabilities)** to discover the closed-set capability vocabulary (the high-level tasks skills can perform). Useful when you want to find every skill that can "post-content" or "send-email".

## Step 1b — Discover Communication Channels

The same `POST /Skills/List` response also includes a top-level `channels[]`
catalog. Channel discovery is registry-driven and does not depend on which
marketplace template you deploy.

```json
{
  "result": true,
  "channels": [
    {
      "id": "telegram",
      "credential_key": "telegram",
      "title": "Telegram",
      "required_fields": ["bottoken", "allowedusers"],
      "capabilities": {
        "direct": true,
        "rooms": true,
        "threads": true,
        "roles": false,
        "command_menu": true
      },
      "credential": {
        "key": "telegram",
        "credential_schema": ["..."]
      }
    }
  ]
}
```

The current external channel IDs are `telegram`, `slack`, and `discord`.
`channels[]` is returned in full even when the request filters `skills[]`.
Render each channel's form from `credential.credential_schema` and use
`required_fields` to decide which values must be present before the operator can
connect it. A channel activates automatically when every required value is
complete.

Web chat and the Messaging API are always available. External channels have no
separate enablement parameter: pass a complete channel group in Deploy's
`credentials` object, or add it later with
`POST /UserAgent/CredentialUpsert`. The channel activates automatically when
all `required_fields` are complete. Channels do not add skills or change agent
pricing.

## Step 2 — Live Pricing Preview

Before you commit, fetch the live tier price for the proposed skill set with [`POST /UserAgent/PricingPreview`](/docs/agent-overview#post-useragentpricingpreview) — the **draft** mode runs without touching any DB state.

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/PricingPreview" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "draft": true,
    "tier": "pro",
    "skills": ["int-gmail-check", "int-wordpress-post", "int-wiro-aimodels"]
  }'
```

##### Response

```json
{
  "result": true,
  "errors": [],
  "tier": "pro",
  "tiermultiplier": 10,
  "totalPriceUsd": 60,
  "totalMonthlyCredits": 1500,
  "starterFloorUsd": 4,
  "skillBreakdown": [
    { "skill": "int-gmail-check",     "priceUsd": 1, "credits": 25,  "billing_model": "tokens" },
    { "skill": "int-wordpress-post",  "priceUsd": 4, "credits": 100, "billing_model": "tokens" },
    { "skill": "int-wiro-aimodels",   "priceUsd": 1, "credits": 25,  "billing_model": "tokens" }
  ],
  "enabledSkills": ["int-gmail-check", "int-wordpress-post", "int-wiro-aimodels"],
  "directSkills":  ["int-gmail-check", "int-wordpress-post", "int-wiro-aimodels"],
  "agentBase": { "priceUsd": 0, "credits": 0 },
  "tokenRates": {
    "default_model": "openai/gpt-5.6-sol",
    "fallback_rate": { "input_per_1m": 625, "output_per_1m": 3750, "cached_input_per_1m": 62.5, "cache_write_per_1m": 781.25 },
    "models": {
      "openai/gpt-5.6-sol": { "input_per_1m": 625, "output_per_1m": 3750, "cached_input_per_1m": 62.5, "cache_write_per_1m": 781.25, "selectable": true, "label": "GPT-5.6 Sol", "tier": "premium" },
      "openai/gpt-5.6-terra": { "input_per_1m": 250, "output_per_1m": 1500, "cached_input_per_1m": 25, "cache_write_per_1m": 312.5, "selectable": true, "label": "GPT-5.6 Terra", "tier": "balanced" },
      "openai/gpt-5.6-luna": { "input_per_1m": 25, "output_per_1m": 150, "cached_input_per_1m": 2.5, "cache_write_per_1m": 31.25, "selectable": true, "label": "GPT-5.6 Luna", "tier": "cheap" },
      "openai/gpt-5.5": { "input_per_1m": 625, "output_per_1m": 3750, "cached_input_per_1m": 62.5, "selectable": true, "label": "GPT-5.5", "tier": "premium" },
      "openai/gpt-5.4": { "input_per_1m": 312.5, "output_per_1m": 1875, "cached_input_per_1m": 31.25, "selectable": true, "label": "GPT-5.4", "tier": "balanced" }
    }
  },
  "tiers": {
    "starter": { "priceUsd": 6,  "credits": 150 },
    "pro":     { "priceUsd": 60, "credits": 1500 }
  }
}
```

Read the response:

- `tiers.starter.priceUsd` and `tiers.pro.priceUsd` → what your wallet will be charged for each tier.
- `tiers.starter.credits` and `tiers.pro.credits` → monthly credit allocation.
- `tokenRates` → per-model token rates (credits per 1M input / output / cached-input tokens). Each conversation turn is metered against these — see [token billing](/docs/agent-overview#pricing-model--tiers-skills--token-billing).
- `skillBreakdown[]` → per-skill contribution to the total. Use this to see which skill is the most expensive.
- `enabledSkills` → final closure (includes any transitively-enabled `depends_on`).

> **`agentBase`** is always `{ priceUsd: 0, credits: 0 }` — pricing is fully skill-driven and the field is kept on the response so callers don't have to null-check. The agent's Starter price = Σ(skill weights), bumped to the **`starterFloorUsd`** floor (**$4/month** by default) if the raw sum lands below it (credits scale up by the same ratio). Pro = Starter × `tiermultiplier` (default `10`). Per-turn conversation cost is metered separately against the agent's `tokenRates` — see [token billing](/docs/agent-overview#pricing-model--tiers-skills--token-billing).

## Step 3 — Deploy the Custom Agent

Send the same skill set you previewed to `POST /UserAgent/Deploy` with `custom: true` and `useprepaid: true`. The selected `tier` is debited immediately.

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Deploy" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "custom": true,
    "title": "Inbox Watcher",
    "description": "Watches inbound Gmail and forwards a summary to Telegram every 4 hours.",
    "useprepaid": true,
    "tier": "pro",
    "skills": {
      "int-gmail-check":    true,
      "int-wordpress-post":  true,
      "int-wiro-aimodels": true
    },
    "credentials": {
      "gmail":    { "account": "agent@company.com", "apppassword": "xxxx xxxx xxxx xxxx" },
      "telegram": {
        "bottoken": "123456:ABC-DEF...",
        "allowedusers": ["761381461"]
      }
    },
    "customskills": [
      {
        "key": "cron-summarize-inbox",
        "value": "Every 4 hours, scan all unread Gmail messages from the past 4 hours, summarize each in 1 sentence, and post the digest to Telegram.",
        "interval": "0 */4 * * *",
        "enabled": true,
        "_user_created": true,
        "description": "Inbox summary digest"
      }
    ]
  }'
```

##### Response (excerpt)

```json
{
  "result": true,
  "errors": [],
  "useragents": [
    {
      "guid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
      "agentguid": null,
      "title": "Inbox Watcher",
      "description": "Watches inbound Gmail and forwards a summary to Telegram every 4 hours.",
      "tier": "pro",
      "tiermultiplier": 10,
      "status": 2,
      "setuprequired": false,
      "monthlycredits": 1500,
      "monthlypriceusd": 60,
      "remainingcredits": 1500,
      "creditperiod": "2026-05",
      "tokenRates": {
        "default_model": "openai/gpt-5.6-sol",
        "fallback_rate": { "input_per_1m": 625, "output_per_1m": 3750, "cached_input_per_1m": 62.5, "cache_write_per_1m": 781.25 },
        "models": {
          "openai/gpt-5.6-sol": { "input_per_1m": 625, "output_per_1m": 3750, "cached_input_per_1m": 62.5, "cache_write_per_1m": 781.25, "selectable": true, "label": "GPT-5.6 Sol", "tier": "premium" },
          "openai/gpt-5.6-terra": { "input_per_1m": 250, "output_per_1m": 1500, "cached_input_per_1m": 25, "cache_write_per_1m": 312.5, "selectable": true, "label": "GPT-5.6 Terra", "tier": "balanced" },
          "openai/gpt-5.6-luna": { "input_per_1m": 25, "output_per_1m": 150, "cached_input_per_1m": 2.5, "cache_write_per_1m": 31.25, "selectable": true, "label": "GPT-5.6 Luna", "tier": "cheap" },
          "openai/gpt-5.5": { "input_per_1m": 625, "output_per_1m": 3750, "cached_input_per_1m": 62.5, "selectable": true, "label": "GPT-5.5", "tier": "premium" },
          "openai/gpt-5.4": { "input_per_1m": 312.5, "output_per_1m": 1875, "cached_input_per_1m": 31.25, "selectable": true, "label": "GPT-5.4", "tier": "balanced" }
        }
      },
      "agentModel": {
        "chatModel": "openai/gpt-5.6-sol",
        "cronModel": "openai/gpt-5.4-mini",
        "voicePrepModel": "openai/gpt-5.4-mini",
        "voicePostcallModel": "openai/gpt-5.4"
      },
      "skills": ["int-gmail-check", "int-wordpress-post", "int-wiro-aimodels"],
      "customskills": [],
      "scheduledskills": [
        {
          "key": "cs-cron-summarize-inbox",
          "value": "Every 4 hours, scan all unread Gmail messages from the past 4 hours, summarize each in 1 sentence, and post the digest to Telegram.",
          "interval": "0 */4 * * *",
          "enabled": true,
          "_source": "user-created",
          "_editable": true,
          "_user_created": true
        }
      ],
      "enabledChannels": ["telegram"],
      "teamsessionmode": "private",
      "credentials": {
        "gmail":    { "_connected": false, "optional": false, "extra": false, "account": "agent@company.com", "apppassword": "[present]" },
        "telegram": { "_connected": false, "optional": false, "extra": false, "bottoken": "[present]", "allowedusers": ["761381461"] }
      },
      "agent": {
        "custom": true,
        "title": "Inbox Watcher",
        "tiermultiplier": 10,
        "tiers": {
          "starter": { "priceUsd": 6,  "credits": 150 },
          "pro":     { "priceUsd": 60, "credits": 1500 }
        },
        "extracreditpacks": [
          { "packkey": "small",  "credits": 7500,  "priceusd": 300,  "enabled": true },
          { "packkey": "medium", "credits": 15000, "priceusd": 600,  "enabled": true },
          { "packkey": "large",  "credits": 30000, "priceusd": 1200, "enabled": true }
        ]
      }
    }
  ]
}
```

Notes on the response:

- `agentguid: null` — confirms this is a custom build with no marketplace template.
- `agent.custom: true` — the synthesized template placeholder. Same shape as a template's `agent` block but no `slug` / `cover` / `categories` (custom builds aren't in the marketplace).
- `scheduledskills` already contains the cron from the Deploy body, with the canonical `cs-cron-` prefix added by the server.
- `status: 2` — Deploy auto-queued the instance because `useprepaid: true` provisioned a subscription in the same call. The daemon picks the row up from the queue; you do **not** need to call `POST /UserAgent/Start` after a prepaid deploy.
- Communication-channel credentials are validated independently from `skills`. Every channel group present in `credentials` must contain all of its `required_fields` or Deploy fails without leaving a partial agent behind.

## Step 4 — Refine Skills After Deploy

Custom builds are the only path where end users can toggle skills on/off after deploy. Use [`POST /UserAgent/SkillsApply`](/docs/agent-overview#post-useragentskillsapply) — even when you only want to flip a single skill, send it as a one-entry `skills` map. The endpoint charges the wallet once, triggers exactly one container restart, and rolls back atomically on payment failure.

> **Template-deploy useragents reject `SkillsApply` with error code `100` (`skillsapply-template-only`):** `Cannot edit skills on a template agent — only custom-built agents support skill editing.` Skills are inherited from the marketplace agent template and changing them would diverge the instance. To run a different skill set, deploy a custom build (`Deploy` with `custom: true`) instead.

### Single-skill enable

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/SkillsApply" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
    "idempotencyKey": "550e8400-e29b-41d4-a716-446655440001",
    "skills": {
      "int-instagram-post": true
    }
  }'
```

The response includes the new pricing snapshot and the prorated wallet debit:

```json
{
  "result": true,
  "errors": [],
  "tier": "pro",
  "prepaidWalletDelta": 5.0,
  "restartTriggered": true,
  "restartedAt": 1714694520,
  "pricing": {
    "previousPriceUsd": 60,
    "newPriceUsd": 70,
    "deltaUsd": 10,
    "previousMonthlyCredits": 1500,
    "newMonthlyCredits": 1750,
    "deltaCredits": 250,
    "enabledSkills": ["int-gmail-check", "int-wordpress-post", "int-wiro-aimodels", "int-instagram-post"]
  }
}
```

`prepaidWalletDelta` is the prorated USD amount debited from your wallet for the remaining days of the current period. The same wallet is credited if you disable a paid skill mid-period (negative delta).

### Batch toggle + tier upgrade in one call

When the user stages many toggles in your UI and commits them all together, send everything in one `SkillsApply` call:

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/SkillsApply" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
    "tier": "pro",
    "idempotencyKey": "550e8400-e29b-41d4-a716-446655440000",
    "skills": {
      "int-gmail-check":     true,
      "int-wordpress-post":  true,
      "int-wiro-aimodels":  true,
      "int-instagram-post":  true,
      "int-metaads-manage":  false
    }
  }'
```

`idempotencyKey` is required — use a UUID per "user clicks Save" event. A retry of the same key returns the cached response without re-running the saga.

## Common Recipes

### A. Email-driven Telegram digest

```json
{
  "custom": true,
  "title": "Email Digest Bot",
  "useprepaid": true,
  "tier": "starter",
  "skills": { "int-gmail-check": true, "int-wordpress-post": true },
  "credentials": {
    "gmail":    { "account": "agent@company.com", "apppassword": "xxxx xxxx xxxx xxxx" },
    "telegram": { "bottoken": "123456:ABC-DEF...", "allowedusers": ["761381461"] }
  },
  "customskills": [
    {
      "key": "cron-email-digest",
      "value": "Twice a day, summarize unread Gmail messages in one Telegram message.",
      "interval": "0 9,17 * * *",
      "enabled": true,
      "_user_created": true,
      "description": "Daily email digest"
    }
  ]
}
```

### B. WordPress publisher with weekly research

```json
{
  "custom": true,
  "title": "Blog Research & Publish",
  "useprepaid": true,
  "tier": "pro",
  "skills": { "int-wordpress-post": true, "int-wiro-aimodels": true },
  "credentials": {
    "wordpress":   { "url": "https://blog.example.com", "user": "admin", "apppassword": "xxxx xxxx xxxx xxxx" },
    "var-website": { "urls": "[{\"websitename\":\"Wired\",\"url\":\"https://www.wired.com/feed/rss\"}]" }
  },
  "customskills": [
    {
      "key": "content-strategy",
      "value": "## Writing Style\nShort, punchy, technical. Always include code examples.\n\n## Sources\nWired, ArsTechnica, Hacker News.\n\n## Cadence\nOne 600-word article every Monday.",
      "_user_created": false
    },
    {
      "key": "cron-weekly-blog",
      "value": "Every Monday morning, scan the websites listed under your var-website credential, draft one 600-word article, and publish to WordPress as a draft.",
      "interval": "0 9 * * 1",
      "enabled": true,
      "_user_created": true,
      "description": "Weekly WordPress publish"
    }
  ]
}
```

### C. Multi-channel social poster (Pro tier)

```json
{
  "custom": true,
  "title": "Cross-Channel Social",
  "useprepaid": true,
  "tier": "pro",
  "skills": {
    "int-twitterx-post":   true,
    "int-instagram-post":  true,
    "int-linkedin-post":   true,
    "int-facebookpage-post": true,
    "int-wiro-aimodels":  true
  },
  "credentials": {}
}
```

OAuth providers are connected later via `POST /UserAgentOAuth/{Provider}Connect` — see [Agent Credentials](/docs/agent-credentials).

## Subscription & Billing for Custom Builds

Subscriptions for custom builds work exactly like template deploys:

- A 30-day prepaid subscription row (`plan: "agent"`, `tier: <starter|pro>`, `provider: "prepaid"`) is inserted at Deploy.
- `POST /UserAgent/CancelSubscription` schedules cancel-at-period-end.
- `POST /UserAgent/RenewSubscription` either undoes a pending cancel (no charge) or creates a fresh 30-day period (wallet charged).
- `POST /UserAgent/UpgradeTier` upgrades Starter → Pro with a prorated wallet debit.

When you toggle a skill on or off, the active subscription is automatically prorated (see Step 4 above). The new monthly amount becomes your charge at next renewal.

## Limits & Notes

- **Skill set must produce a `> $0` price.** Custom builds with no paid skills are rejected with `Subscription price must be greater than $0. Add at least one paid skill or set agent base price.` The `agentBase` floor (`$9 / 1000 credits`) is the implicit minimum unless every enabled skill is free / utility.
- **Conflict / dependency violations are surfaced eagerly.** If you toggle on two mutually-exclusive skills, `SkillsApply` returns code `102` with a `conflicts[]` array; if a `depends_on` is missing, code `101` with `deps[]`. Resolve in the UI before committing.
- **Custom builds receive the same auto-restart on configuration changes** as template deploys (status `3`/`4` → status `1` with `restartafter: true`).
- **Cover image:** custom builds can ship a `cover` URL in the Deploy body, or upload one later via [`POST /UserAgent/Cover`](/docs/agent-overview#post-useragentcover).
- **The agent's persona** is editable via the standard `customskills` flow. Add a `cs-persona` strategy via `CustomSkillUpsert` to set the agent's voice, role, and constraints.

## What's Next

- [Agent Skills](/docs/agent-skills) — Discover the skill registry, browse credentials per skill, and configure preferences + scheduled tasks
- [Agent Credentials](/docs/agent-credentials) — Connect OAuth providers and set API-key credentials
- [Agent Messaging](/docs/agent-messaging) — Chat with your custom agent
- [Agent Transactions](/docs/agent-transactions) — Audit credit deductions, renewals, and grants

---

# Agent Messaging

Send messages to AI agents and receive streaming responses in real time.

## How It Works

Agent messaging follows the same async pattern as [model runs](/docs/run-a-model):

1. **Send** a message via REST → get an `agenttoken` immediately
2. **Subscribe** to [Agent WebSocket](/docs/agent-websocket) with the `agenttoken` → receive ordered `agent_timeline_delta` block updates plus provisional accumulated answer text
3. **Or poll** via the Detail endpoint to check status and fetch the completed response
4. **Or set** a `callbackurl` to receive a webhook notification when the agent finishes

This decoupled design means your application never blocks waiting for the agent to think. Send the message, hand the `agenttoken` to your frontend, and stream the response as it arrives.

### Ordered turn timeline

Every Detail or History message row returns a top-level `timeline[]`. It is the ordered, persisted record of the turn. A turn can contain multiple interleaved blocks, for example:

`Thinking → Answer or Tool → Thinking → Answer`

Each block has an opaque deterministic `blockid`, call/content ordering coordinates, `type` (`reasoning`, `answer`, or `tool`), safe public text or tool state, `phase` (`stream`, `end`, or `error`), its own monotonically increasing `version`, and timestamps. Reasoning text is a provider-supplied OpenAI GPT-5 summary, never raw hidden chain-of-thought. Tool blocks expose only `toollabel` and `toolstatus`, never a tool ID, arguments, results, or other internal execution metadata.

Live WebSocket updates arrive as `agent_timeline_delta` events carrying one public block. Merge by `blockid`, replace that block only when its incoming `version` is strictly newer, then sort by `callindex`, `contentindex`, and `blockid`. `agent_subscribed.timeline` carries the persisted reconnect snapshot. `agent_output` remains provisional cumulative SSE output until the corresponding answer block catches up; after completion or reconnect, `Message/Detail` is authoritative.

## Message Lifecycle

Every agent message progresses through a defined set of stages:

`agent_queue` → `agent_start` → `agent_output` → `agent_end`

### Message Statuses

| Status | Description |
|--------|-------------|
| `agent_queue` | The message is queued and waiting to be picked up by the agent runtime. Emitted once when the message enters the queue. |
| `agent_start` | The agent has accepted the message and begun processing. The underlying LLM call is being prepared. |
| `agent_output` | The agent is producing output. This event is emitted **multiple times** — each chunk of the response arrives as a separate `agent_output` event via WebSocket, enabling real-time streaming. |
| `agent_end` | The agent has finished generating the response. The full output is available in the `response` and `debugoutput` fields. **This is the event you should listen for** to get the final result. |
| `agent_error` | The agent encountered an error during processing. The `debugoutput` field contains the error message. |
| `agent_cancel` | The message was cancelled by the user before completion. Only messages in `agent_queue`, `agent_start`, or `agent_output` status can be cancelled. |
| `agent_done` | **Marker-only terminal status.** Used **exclusively** for `model_change` marker rows (see [Message/History](#post-useragentmessagehistory)) — never for a real user or assistant turn. Normal turns terminate at `agent_end` (or `agent_error` / `agent_cancel`). |

## **POST** /UserAgent/Message/Send

Sends a user message to a deployed agent. The agent must be in running state (status `4`). Returns immediately with an `agenttoken` that you use to track the response via WebSocket, polling, or webhook.

Accepts either `application/json` (text-only) or `multipart/form-data` (text + file attachments). When sending files, the `message` field can be empty — the agent receives the attachments and any accompanying text.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | The agent instance GUID (from Deploy or MyAgents). |
| `message` | string | Conditional | The user message text. Required unless sending files via multipart. |
| `sessionkey` | string | No | Session identifier for conversation continuity. Defaults to `"default"`. |
| `callbackurl` | string | No | Webhook URL — the system will POST the final response to this URL when the agent finishes. |
| `model` | string | No | Canonical model slug to run **this turn** on (e.g. `"openai/gpt-5.6-sol"`), chosen from the agent's selectable set. Validated server-side — an unknown or non-selectable slug is rejected in `errors[]` and the turn is **not** sent. Omit to use the agent's configured chat model. |
| `attachment` / `attachments[]` | file | No | Multipart only — one or more file attachments that the agent can process. |

> **Per-turn model selection.** `model` selects the chat model for a single turn instead of the agent's configured default. Valid values are the agent's **selectable** slugs — the `tokenRates.models[]` entries where `selectable` is `true`, returned by `UserAgent/Detail` (see [Agent Overview](/docs/agent-overview)). The current set includes `openai/gpt-5.6-sol` (the platform chat default), `openai/gpt-5.6-terra`, `openai/gpt-5.6-luna`, `openai/gpt-5.5`, `openai/gpt-5.5-pro`, `openai/gpt-5.4`, `openai/gpt-5.4-mini`, `openai/gpt-5.2`, `openai/gpt-5.1`, `openai/gpt-5`, and `openai/gpt-5-mini` — always read the live set from that field. The server forwards the chosen slug to the agent runtime as the `x-agent-model` and `x-openclaw-model` headers for that turn.

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

> **A successful Send response means the message was accepted and queued — not that it will definitely reach the agent.** After this response the system enqueues the job into Redis/BullMQ for the bridge to pick up. If the enqueue step itself fails (queue backpressure, Redis outage), the message row is flipped to `agent_error` server-side **after** the HTTP response was already sent with `result: true`. Always confirm the final state via `POST /UserAgent/Message/Detail` or the WebSocket stream; don't assume the message progresses to `agent_start` just because Send returned `result: true`.

> **Reserved session keys.** The platform reserves a small set of `sessionkey` prefixes for system-managed threads — `wiro:api`, `voice-prep*`, `voice-call-*`, and `cs-cron-*`. Sending a user message into one of these keys is rejected with `Reserved sessionkey` (the same guard that protects `Message/DeleteSession`). Pick any other identifier for your own threads.

| Field | Type | Description |
|-------|------|-------------|
| `messageguid` | `string` | Unique identifier for this message. Use it with Detail, History, or Cancel. |
| `agenttoken` | `string` | Token for WebSocket subscription and polling. Equivalent to `tasktoken` in model runs. |
| `status` | `string` | Initial status — always `"agent_queue"` on success. |
| `modelChangeMarker` | `object\|null` | Present **only** when this turn's `model` selects a different chat model than the session was running — i.e. it rotates the model mid-session. Shape: `{ guid, type: "model_change", fromModel, toModel, createdat }`. The platform also writes a matching marker row into history (see [Message/History](#post-useragentmessagehistory)). Absent on turns that keep the session's model. |

> **`model_change` marker.** When `model` rotates the session to a different chat model, the Send response carries a `modelChangeMarker` describing the switch, and a standalone marker row (status `agent_done`) is written into history at the same time:
>
> ```json
> "modelChangeMarker": {
>   "guid": "b2c3d4e5-f6a7-8901-bcde-f23456789012",
>   "type": "model_change",
>   "fromModel": "openai/gpt-5.4",
>   "toModel": "openai/gpt-5.5",
>   "createdat": 1714694399
> }
> ```
>
> See [`Message/History`](#post-useragentmessagehistory) for the shape and ordering of the marker row it materializes.

#### Failure responses

When `result: false`, the response shape is `{ result: false, errors: [{ code, message }], messageguid: null, agenttoken: null, status: null }`. Two branches add extra context:

| Failure branch | Extra fields | Notes |
|----------------|--------------|-------|
| Agent not running (`status` ≠ 4) | `agentstatus: <int>` | Echoes the current `useragents.status` so the caller can decide whether to wait, call `Start`, or surface "Setup Required" UI. Common codes: `0` initializing, `1` stopping, `2` starting, `3` starting (container booting — wait and retry), `5` upgrading, `6` setup required. |
| Out of credits | `agentstatus`, `agentbalance: { monthlycredits, extracredits, usedcredits, remainingcredits }` | Returned with the `Agent has no remaining credits…` error. `remainingcredits: 0` is the trigger; surface a "Renew or buy a credit pack" CTA. |

## **POST** /UserAgent/Message/Detail

Retrieves the current status and content of a single message. You can query by either `messageguid` or `agenttoken`.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `messageguid` | string | No | The message GUID returned from Send. |
| `agenttoken` | string | No | The agent token returned from Send (alternative to messageguid). |
| `sessionkey` | string | No | Optional session scope. When supplied, the row is additionally constrained to this `sessionkey`, so a shared-owner agent (one API key fronting many end users) can ensure a user only reads their own turn. Omit for the default single-user behavior. |

> **Note:** You must provide at least one of `messageguid` or `agenttoken`.

### Response

```json
{
  "result": true,
  "errors": [],
  "data": {
    "guid": "c3d4e5f6-a7b8-9012-cdef-345678901234",
    "uuid": "ada-uuid",
    "agenttoken": "aB3xK9mR2pLqWzVn7tYhCd5sFgJkNb",
    "user": {
      "uuid": "ada-uuid",
      "firstname": "Ada",
      "lastname": "Lovelace",
      "email": "ada@example.com",
      "username": "ada",
      "avatar": "https://cdn.wiro.ai/avatars/ada.webp",
      "avatarinitials": "AL"
    },
    "sessionkey": "default",
    "content": "What are the latest trends in AI?",
    "response": "Here are the key AI trends for 2026...",
    "debugoutput": "Here are the key AI trends for 2026...",
    "timeline": [
      {
        "blockid": "c0:i0",
        "callindex": 0,
        "contentindex": 0,
        "type": "reasoning",
        "text": "I’ll distinguish deployed capabilities from current research.",
        "toollabel": null,
        "toolstatus": null,
        "phase": "end",
        "version": 3,
        "startedat": 1743350401,
        "updatedat": 1743350405
      },
      {
        "blockid": "c0:i1",
        "callindex": 0,
        "contentindex": 1,
        "type": "answer",
        "text": "Here are the key AI trends for 2026...",
        "toollabel": null,
        "toolstatus": null,
        "phase": "end",
        "version": 8,
        "startedat": 1743350405,
        "updatedat": 1743350408
      }
    ],
    "status": "agent_end",
    "metadata": {
      "type": "progressGenerate",
      "task": "Generate",
      "speed": "14.2",
      "speedType": "words/s",
      "elapsedTime": "8.1s",
      "tokenCount": 105,
      "wordCount": 118,
      "raw": "Here are the key AI trends for 2026...",
      "answer": ["Here are the key AI trends for 2026..."]
    },
    "attachments": [],
    "deletestatus": 0,
    "createdat": 1743350400,
    "startedat": 1743350401,
    "endedat": 1743350408,
    "inputtokens": 3450,
    "outputtokens": 820,
    "cachereadtokens": 2400,
    "cachewritetokens": 0,
    "totaltokens": 6670,
    "model": "openai/gpt-5.6-sol",
    "tokencost": 5,
    "processedms": 4200
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `guid` | `string` | Message GUID. |
| `uuid` | `string` | The account UUID of the user who sent the message. |
| `agenttoken` | `string\|null` | The same token issued by `Message/Send` for this message. Lets callers that arrived at the row through `Message/Detail` (or `Message/History`) subscribe to the [Agent WebSocket](/docs/agent-websocket) and pick up an in-flight response — useful when a chat UI rehydrates after a reload and finds a message still in `agent_queue` / `agent_start` / `agent_output` status. Only `null` for very old rows that pre-date the column. |
| `user` | `object\|null` | Resolved sender info: `{ uuid, firstname, lastname, email, username, avatar, avatarinitials }`. Decorated server-side from `agentmessages.uuid` so the chat bubble can render avatar / hover-tooltip without an extra `User/Detail` round-trip. `null` when the row was written by automation (sentinel `uuid` like `"system"`) or when the user record was deleted. |
| `sessionkey` | `string` | The session this message belongs to. |
| `content` | `string` | The original user message. |
| `response` | `string` | The agent's full response text. Empty until `agent_end`. |
| `debugoutput` | `string` | Accumulated output text. Updated during streaming, contains the full response after completion. |
| `timeline` | `array` | Ordered turn blocks. Always an array; `[]` means no public blocks were persisted. Merge live deltas by `blockid` and per-block `version`, then sort by call/content order. |
| `status` | `string` | Current message status (see Message Lifecycle). |
| `metadata` | `object` | Parsed JSON object (API returns it already decoded). Populated from the agent bridge on `agent_end`. Fields produced by the bridge's final progress builder include `type`, `task`, `speed`, `speedType`, `elapsedTime`, `tokenCount`, `wordCount`, `raw`, and `answer`. Timeline blocks are intentionally not stored in metadata; read the top-level `timeline` field. Empty object `{}` for `agent_error`, `agent_cancel`, or when the bridge hasn't finished yet. Message status lives in the top-level `status` field — don't read it from `metadata.type`. |
| `attachments` | `array` | Always present as an array — empty `[]` for text-only messages. When the message was sent via multipart with files, each entry is a resolved `{url, name, type, size}` object (no further file-lookup needed). Identical shape in `Message/History` rows. |
| `deletestatus` | `number` | Internal flag. `0` for normal messages. |
| `createdat` | `number` | Unix timestamp (epoch seconds) when the message was created. |
| `startedat` | `number` | Unix timestamp (epoch seconds) when the agent started processing. |
| `endedat` | `number` | Unix timestamp (epoch seconds) when processing completed. May be empty for `agent_cancel` (cancel only sets `status` and `updatedat`). |
| `inputtokens` | `number\|null` | Uncached input (prompt) tokens billed at the model's input rate. Populated on the assistant turn once it completes; `null` on user-only, cron, legacy, and `model_change` marker rows. |
| `outputtokens` | `number\|null` | Billed output (completion) tokens the model generated this turn. `null` on the same non-assistant / marker / legacy rows. |
| `cachereadtokens` | `number\|null` | Tokens served from the model's prompt cache (billed at the cached-input rate). `0` when the model reported no cache hits; `null` on non-assistant rows. |
| `cachewritetokens` | `number\|null` | Tokens written to the prompt cache this turn. `0` when none; `null` on non-assistant rows. |
| `totaltokens` | `number\|null` | Exact component sum: `inputtokens + outputtokens + cachereadtokens + cachewritetokens`. `null` on non-assistant rows. |
| `model` | `string\|null` | Canonical slug of the chat model that actually ran the turn (e.g. `"openai/gpt-5.4"`), reflecting any per-turn `model` override from Send. `null` on non-assistant / marker / legacy rows. |
| `tokencost` | `number\|null` | Credits deducted for the turn, derived from the token counts and the model's `tokenRates` (see [Agent Overview](/docs/agent-overview)). `null` on non-assistant rows. |
| `processedms` | `number\|null` | Wall-clock model processing time for the turn, in milliseconds. `null` on non-assistant rows. |

### Public timeline block fields

Only the fields below are returned in browser-facing REST and WebSocket timeline blocks.

| Field | Type | Description |
|-------|------|-------------|
| `blockid` | `string` | Opaque deterministic identity for one logical block (for example `c0:i0`). Use it as the merge key; do not parse its current format. |
| `callindex` | `number` | Zero-based call order within the turn. Primary sort key. |
| `contentindex` | `number` | Zero-based content order within the call. Secondary sort key. |
| `type` | `string` | `reasoning`, `answer`, or `tool`. |
| `text` | `string\|null` | Safe public text for `reasoning` and `answer`; `null` for tool blocks. Reasoning text is an OpenAI GPT-5 provider summary, not raw chain-of-thought. |
| `toollabel` | `string\|null` | Safe display label for a tool block; `null` for reasoning and answer blocks. Arguments and results are never included. |
| `toolstatus` | `string\|null` | Safe public status for a tool block; `null` for reasoning and answer blocks. |
| `phase` | `string` | `stream`, `end`, or `error` for this block. |
| `version` | `number` | Monotonic **within this block**. Ignore a delta whose version is not strictly newer than the stored block's version. |
| `startedat` | `number\|null` | Block start timestamp when available. |
| `updatedat` | `number\|null` | Most recent block update timestamp when available. |

Do not compare `version` across different blocks. Keep a map keyed by `blockid`, apply per-block last-write-wins, and render `callindex ASC, contentindex ASC, blockid ASC`. This makes the result independent of HTTP/WebSocket arrival order.

> **`metadata.tokenCount` vs the billing token columns.** `metadata.tokenCount` is the **live stream counter** emitted inside the `progressGenerate` payload — a running word/token tally for the in-flight response. The flat `inputtokens` / `outputtokens` / `cachereadtokens` / `cachewritetokens` / `totaltokens` / `tokencost` columns are the **final billed usage**, written once the turn completes. They measure different things: use `tokenCount` for a live progress indicator, and the flat columns for accounting and cost.

## **POST** /UserAgent/Message/History

Retrieves conversation history for a specific agent and session. Messages are returned **newest-first** with cursor-based pagination.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | The agent instance GUID. |
| `sessionkey` | string | No | Session identifier. Defaults to `"default"`. |
| `limit` | number | No | Maximum number of messages to return. Defaults to `50`, max `200`. |
| `before` | string | No | Message GUID to use as cursor — returns only messages created before this one. Omit for the most recent messages. |

> **Team agents:** If the agent's `teamsessionmode` is `collaborative`, History returns messages from **all team members** in the session and their turns use one shared native agent-memory session. In `private` mode, History only returns messages sent by the caller's own `uuid` and memory stays per operator. The same visibility rule applies to `Sessions` listing.

### Response

```json
{
  "result": true,
  "errors": [],
  "data": {
    "messages": [
      {
        "guid": "c3d4e5f6-a7b8-9012-cdef-345678901234",
        "uuid": "ada-uuid",
        "agenttoken": "aB3xK9mR2pLqWzVn7tYhCd5sFgJkNb",
        "user": {
          "uuid": "ada-uuid",
          "firstname": "Ada",
          "lastname": "Lovelace",
          "email": "ada@example.com",
          "username": "ada",
          "avatar": "https://cdn.wiro.ai/avatars/ada.webp",
          "avatarinitials": "AL"
        },
        "content": "What are the latest trends in AI?",
        "response": "Here are the key AI trends for 2026...",
        "debugoutput": "Here are the key AI trends for 2026...",
        "timeline": [
          {
            "blockid": "c0:i0",
            "callindex": 0,
            "contentindex": 0,
            "type": "reasoning",
            "text": "I’ll distinguish deployed capabilities from current research.",
            "toollabel": null,
            "toolstatus": null,
            "phase": "end",
            "version": 3,
            "startedat": 1743350401,
            "updatedat": 1743350405
          }
        ],
        "status": "agent_end",
        "metadata": {
          "type": "progressGenerate",
          "task": "Generate",
          "speed": "14.2",
          "speedType": "words/s",
          "elapsedTime": "8.1s",
          "tokenCount": 105,
          "wordCount": 118,
          "raw": "Here are the key AI trends for 2026...",
          "answer": ["Here are the key AI trends for 2026..."]
        },
        "attachments": [],
        "deletestatus": 0,
        "createdat": 1743350400,
        "inputtokens": 3450,
        "outputtokens": 820,
        "cachereadtokens": 2400,
        "cachewritetokens": 0,
        "totaltokens": 6670,
        "model": "openai/gpt-5.6-sol",
        "tokencost": 5,
        "processedms": 4200
      },
      {
        "guid": "b2c3d4e5-f6a7-8901-bcde-f23456789012",
        "uuid": "system",
        "agenttoken": null,
        "user": null,
        "content": "",
        "response": "",
        "debugoutput": "",
        "timeline": [],
        "status": "agent_done",
        "metadata": {
          "type": "model_change",
          "fromModel": "openai/gpt-5.2",
          "toModel": "openai/gpt-5.4"
        },
        "attachments": [],
        "deletestatus": 0,
        "createdat": 1743350399,
        "inputtokens": null,
        "outputtokens": null,
        "cachereadtokens": null,
        "cachewritetokens": null,
        "totaltokens": null,
        "model": null,
        "tokencost": null,
        "processedms": null
      },
      {
        "guid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "uuid": "ada-uuid",
        "agenttoken": "tQ4nL8vY1zMkRpWdH7cXjBg6sFhPmA",
        "user": {
          "uuid": "ada-uuid",
          "firstname": "Ada",
          "lastname": "Lovelace",
          "email": "ada@example.com",
          "username": "ada",
          "avatar": "https://cdn.wiro.ai/avatars/ada.webp",
          "avatarinitials": "AL"
        },
        "content": "Tell me more about multimodal models",
        "response": "Multimodal models combine...",
        "debugoutput": "Multimodal models combine...",
        "timeline": [],
        "status": "agent_end",
        "metadata": {},
        "attachments": [],
        "deletestatus": 0,
        "createdat": 1743350300,
        "inputtokens": 1180,
        "outputtokens": 540,
        "cachereadtokens": 0,
        "cachewritetokens": 0,
        "totaltokens": 1720,
        "model": "openai/gpt-5.2",
        "tokencost": 3,
        "processedms": 3100
      }
    ],
    "count": 3,
    "hasmore": false
  }
}
```

> Each message row carries `uuid` (sender) and a server-decorated `user` object with the full sender shape — same as `Message/Detail`. `user` is `null` for system-inserted rows (e.g. `Message/SystemInsert` writes when `uuid` is `"system"`) or when the underlying account has been deleted.

> **Resuming an in-flight stream.** Every row carries the original `agenttoken` from `Message/Send`. If a returned message's `status` is non-terminal (`agent_queue`, `agent_start`, or `agent_output`), the agent is still processing it server-side. Hand the `agenttoken` to the [Agent WebSocket](/docs/agent-websocket) (`agent_info` frame) and you'll receive the persisted `agent_subscribed.timeline` snapshot, subsequent `agent_timeline_delta` block updates, remaining provisional `agent_output` snapshots, and the eventual `agent_end` event — no need to re-send the message.

| Field | Type | Description |
|-------|------|-------------|
| `messages` | `array` | Array of message objects, newest first. Each row has the **same shape as `Message/Detail`** — including persisted `timeline`, the `uuid` sender, the `agenttoken` (so you can resubscribe over WebSocket if `status` is non-terminal), the decorated `user` object, and the per-turn token columns below. The array can also include `model_change` marker rows (see the note under the table). |
| `count` | `number` | Number of messages in this page. |
| `hasmore` | `boolean` | `true` if there are older messages available. Pass the last message's `guid` as `before` to fetch the next page. |

Each assistant row also carries the per-turn token-accounting columns, identical to [`Message/Detail`](#post-useragentmessagedetail):

| Field | Type | Description |
|-------|------|-------------|
| `inputtokens` | `number\|null` | Uncached input (prompt) tokens billed at the model's input rate. `null` on user-only, cron, legacy, and `model_change` marker rows. |
| `outputtokens` | `number\|null` | Billed output (completion) tokens the model generated. `null` on the same non-assistant / marker / legacy rows. |
| `cachereadtokens` | `number\|null` | Tokens served from the model's prompt cache. `0` when none; `null` on non-assistant rows. |
| `cachewritetokens` | `number\|null` | Tokens written to the prompt cache. `0` when none; `null` on non-assistant rows. |
| `totaltokens` | `number\|null` | Exact component sum: `inputtokens + outputtokens + cachereadtokens + cachewritetokens`. `null` on non-assistant rows. |
| `model` | `string\|null` | Canonical slug of the chat model that ran the turn. `null` on non-assistant / marker / legacy rows. |
| `tokencost` | `number\|null` | Credits deducted for the turn. `null` on non-assistant rows. |
| `processedms` | `number\|null` | Wall-clock model processing time in milliseconds. `null` on non-assistant rows. |

> **`model_change` marker rows.** Switching the chat model (via the [`model`](#post-useragentmessagesend) param) drops a synthetic marker row into history alongside the real turns. A marker row has `status: "agent_done"`, `model: null`, empty `content` / `response` / `debugoutput`, every token column `null`, and `metadata: { "type": "model_change", "fromModel": "…", "toModel": "…" }`. Detect it with `metadata.type === "model_change"` and render it as an inline separator (e.g. "Switched to GPT-5.4") rather than a chat bubble. Its `createdat` is the triggering turn's `createdat` minus one second, so it orders immediately before that turn (in the newest-first response it appears directly after the turn that triggered it).

### Pagination

To paginate through a long conversation:

**Page 1** — most recent messages:

```json
{
  "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
  "sessionkey": "default",
  "limit": 50
}
```

**Page 2** — pass the **last** (oldest, smallest `createdat`) message's `guid` from page 1 as the `before` cursor:

```json
{
  "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
  "sessionkey": "default",
  "limit": 50,
  "before": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

## **POST** /UserAgent/Message/Sessions

Lists all conversation sessions for an agent. Returns each session's key, message count, last activity time, and the most recent message content. Sorted newest-first by `updatedat`.

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
        "messagecount": 24,
        "updatedat": 1743350400,
        "lastmessage": "What are the latest trends in AI?"
      },
      {
        "sessionkey": "user-42-support",
        "messagecount": 8,
        "updatedat": 1743349200,
        "lastmessage": "How do I reset my password?",
        "name": "Password help"
      },
      {
        "sessionkey": "user-99-draft",
        "messagecount": 0,
        "updatedat": 1743348000,
        "lastmessage": "",
        "name": "New chat"
      }
    ]
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `sessionkey` | `string` | The session identifier. |
| `messagecount` | `number` | Total number of messages in this session. |
| `updatedat` | `number` | Unix timestamp (epoch seconds) of the last activity in this session. |
| `lastmessage` | `string` | The most recent message body — `useragentmessages.content` if the user sent a message, falling back to `useragentmessages.response` (assistant reply) when `content` is empty. |
| `name` | `string?` | Optional display name set via [`Message/RenameSession`](#post-useragentmessagerenamesession). Omitted when the session was never named — fall back to your own default label (e.g. the `sessionkey` or "New chat"). |

> **Named-but-empty sessions appear too.** A session created by [`RenameSession`](#post-useragentmessagerenamesession) before its first `Message/Send` surfaces here with `messagecount: 0`, `lastmessage: ""`, and the `name` you set — so a freshly created chat shows up in the list immediately.

> **Reserved sessionkeys filtered out (non-admin only).** The list omits internal sessions used by the runtime: `wiro:api` (gateway hooks default), `voice-prep*` (per-call prep threads), `voice-call-*` (active voice-call rows), and `cs-cron-*` (one thread per scheduled cron skill). These rows still exist on the agent — they're just hidden from operator-facing listings to keep the panel UX clean. Admin callers (`tokenUserRoles` contains `"ADMIN"`) see the full unfiltered list. The same filter is applied on `Message/History` reads and the `DeleteSession` guard.

> **Marker rows excluded.** `model_change` marker rows are not real turns — they're skipped when building this list, so they never surface as a session's `lastmessage`.

## **POST** /UserAgent/Message/DeleteSession

Deletes messages in the given session for the **calling user**. This action cannot be undone.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | The agent instance GUID. |
| `sessionkey` | string | Yes | The session key to delete. |
| `rotate` | boolean | No | Default `false`. When `true`, after wiping the rows the server also rotates the session's memory bucket so the agent's container **forgets** the cleared turns — the next `Message/Send` on the same `sessionkey` starts a fresh reasoning context. With `false` (or omitted) the message rows are wiped but the running container may still recall them. Any display `name` set via [`RenameSession`](#post-useragentmessagerenamesession) is dropped on delete. |

> **Scope of deletion:** Hard delete — the API issues `DELETE FROM useragentmessages WHERE useragentid = … AND sessionkey = …`. For non-admin callers an additional `AND uuid = <caller_uuid>` filter is appended, so only the caller's own rows in the session are purged. This holds in both private and collaborative team modes — even when `teamsessionmode: "collaborative"` (e.g. Telegram group-shared sessions) means every member sees the same thread, each member's `DeleteSession` only wipes their own contributions. Admin callers (`tokenUserRoles` contains `"ADMIN"`) bypass the uuid filter and wipe the entire session for every participant. Compare with `Message/Delete` (per-message), which is a soft-delete bumping the `deletestatus` bitmask.

> **Reserved sessionkeys (non-admin callers).** Wiro-API maintains a handful of internal threads keyed under reserved sessionkeys — `voice-prep` and `voice-prep-<sid>` (per-call prep), `voice-call-<sid>` (voice-call bubble rows), `cs-cron-<slug>` (one thread per scheduled cron skill), and `wiro:api` (gateway hooks default). Non-admin callers passing any of these as `sessionkey` get back `"Session not found"` instead of a delete; the response shape is identical to a missing-session result so there's no information leak about what threads exist. Admin (`tokenUserRoles` contains `"ADMIN"`) bypasses this guard. The same guard also covers `Message/History` reads, so `Sessions` already filters these keys out of the operator's session list — you only encounter the reserved-key error if you hand-craft the body with a known internal key.

### Response

```json
{
  "result": true,
  "errors": []
}
```

## **POST** /UserAgent/Message/RenameSession

Sets a human-readable display **name** on a session without touching its messages or its `sessionkey`. The name is stored in a separate overlay keyed by `(useragentguid, sessionkey)` and surfaces on [`Message/Sessions`](#post-useragentmessagesessions). Because the `sessionkey` is unchanged, the agent's conversation memory is fully preserved across a rename.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | The agent instance GUID. |
| `sessionkey` | string | Yes | The session to name. Reserved system keys (`wiro:api`, `voice-prep*`, `voice-call-*`, `cs-cron-*`) are rejected with `"Session not found"` for non-admin callers, same as `DeleteSession`. |
| `name` | string | Yes | The display name. The server strips control characters, collapses whitespace, trims, and caps the result at **40 characters**. An empty string after sanitization is rejected with `request-parameter-required`. |

> **Doubles as "create a named session".** Calling `RenameSession` with a brand-new `sessionkey` — before any `Message/Send` on it — seeds a named-but-empty session that immediately appears in [`Message/Sessions`](#post-useragentmessagesessions) with `messagecount: 0` and `lastmessage: ""`. This is the canonical way to let a user open a fresh, titled chat before they type anything.

### Request

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Message/RenameSession" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "sessionkey": "user-42-support",
    "name": "Password help"
  }'
```

### Response

```json
{
  "result": true,
  "errors": []
}
```

## **POST** /UserAgent/Message/Delete

Bulk-deletes one or more messages from a session, with **per-side soft-delete** semantics. Each item lets you choose whether to hide the user side of the bubble, the agent side, or both — supporting "delete just my message" / "delete only the response" / "delete the whole bubble" UX without losing the underlying record.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | The agent instance GUID. |
| `items` | array | Yes | One or more `{ messageguid, side }` rows. |

Each item:

| Field | Type | Description |
|-------|------|-------------|
| `messageguid` | string | The message to delete. Must belong to the agent identified by `useragentguid`. |
| `side` | string | One of `"user"`, `"agent"`, or `"both"`. Maps to a bitmask OR'd into the row's `deletestatus` column: `user → 1`, `agent → 3`, `both → 3`. **`agent` and `both` both produce `3`** (full hide on both sides) — there is no `side` value that hides only the agent's view while keeping the row visible to the user. |

> **Soft delete, not hard delete.** Rows are kept in the database with the `deletestatus` flag set so the audit trail (and the admin xyz audit page with `includeDeleted: true`) can still see them. `Message/History` filters them out using **`deletestatus = 0`** — i.e. a row is hidden the moment any bit is set, regardless of which side flagged it. To wipe a whole session hard-and-fast (no soft-delete trail), use [`Message/DeleteSession`](#post-useragentmessagedeletesession) instead.

### Request

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Message/Delete" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "items": [
      { "messageguid": "c3d4e5f6-...", "side": "user" },
      { "messageguid": "d4e5f6a7-...", "side": "agent" },
      { "messageguid": "e5f6a7b8-...", "side": "both" }
    ]
  }'
```

### Response

```json
{ "result": true, "errors": [] }
```

The endpoint is best-effort across the items array — invalid `messageguid` rows or invalid `side` values are silently skipped. The call returns `result: true` even when zero rows were updated, so callers should refetch `Message/History` to confirm the new state.

## **POST** /UserAgent/Message/Cancel

Cancels an in-progress message. Only messages in `agent_queue`, `agent_start`, or `agent_output` status can be cancelled. Messages that have already reached `agent_end`, `agent_error`, or `agent_cancel` cannot be cancelled.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `messageguid` | string | No | The message GUID to cancel. |
| `agenttoken` | string | No | The agent token to cancel (alternative to messageguid). |
| `sessionkey` | string | No | Optional session scope. When supplied, the cancel only matches a row in this `sessionkey` — useful for shared-owner agents so one end user can't cancel another's in-flight turn. Omit for the default single-user behavior. |

> **Note:** You must provide at least one of `messageguid` or `agenttoken`.

### Response

```json
{
  "result": true,
  "errors": []
}
```

On success, the message status changes to `agent_cancel` in the database.

> **Behavior depends on when the cancel hits:**
>
> - If the message was **already being processed** by the agent bridge (status `agent_start` or `agent_output`), the bridge's abort handler fires: subscribed WebSocket clients receive an `agent_cancel` event, `debugoutput` / `response` are populated with the abort reason (typically `"AbortError"` or similar technical message — not guaranteed to be a fixed user-facing string), and the `callbackurl` webhook (if set) is triggered with `status: "agent_cancel"`.
> - If the message was **still queued** (status `agent_queue`) when cancelled, no processing attempt had started: the row is marked `agent_cancel` but `response` and `debugoutput` remain empty strings, **no WebSocket `agent_cancel` event** is broadcast, and **no webhook** is triggered.
>
> When polling for the final state, check `status === "agent_cancel"` rather than relying on non-empty `response` / `debugoutput` (they may be empty for queued-state cancellations).

## **POST** /UserAgent/Message/SystemInsert

Inserts a finished "system" message into the conversation history without running it through the agent. Used by the agent runtime, scheduled cron skills, and external chat-platform bridges (Telegram bot, Slack relay, push-notification webhooks) to drop a pre-rendered message into a session as if the agent had produced it. The endpoint **never** triggers a model call — the supplied `content` is written verbatim to `agentmessages.response` with `status: "agent_end"` and `metadata: {"type":"system"}`.

> **Runtime-only auth.** This endpoint is reserved for the Wiro-managed agent runtime and the platform bridges Wiro ships (Telegram / Slack / cron). API users normally use [`Message/Send`](#post-useragentmessagesend) instead, which goes through the standard auth flow + queue + model call path.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | The target useragent guid. |
| `uuid` | string | Yes | The useragent owner uuid. Must match the row stored in `useragents.uuid` for `useragentguid`. |
| `content` | string | Yes | The message body to insert. Stored verbatim in `response` and `debugoutput`. |
| `sessionkey` | string | No | Conversation thread the message belongs to. Defaults to `"auto"` — the endpoint resolves it to the most recent session for this useragent (falls back to `"default"` for empty histories). Pass an explicit value to insert into a specific named session. |
| `metadata` | object \| string | No | Custom metadata payload to write on the row. Accepts either a JSON object or a JSON-encoded string; invalid JSON falls back to the default `{"type":"system"}`. No schema allowlist is applied — the value is stored verbatim. Used by the realtime voice bridge to seed `{"type":"realtime_session_incoming", "callsid", "callerInfo", "startedAt", "transcript":[]}` rows. |

### Response

```json
{
  "result": true,
  "messageguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
  "sessionkey": "default",
  "agenttoken": "aB3xK9mR2pLqWzVn7tYhCd5sFgJkNb",
  "errors": []
}
```

- `messageguid` is the inserted row's guid — use it to address the message later via `Message/Detail` or to thread replies.
- `sessionkey` echoes the resolved session (matters when the caller passed `"auto"` or omitted the field).
- `agenttoken` is the per-message agent token. The realtime voice bridge subscribes to this token over the [Agent WebSocket](/docs/agent-websocket) to receive POSTCALL hand-off events on the same row.
- The inserted row carries `status: "agent_end"` (or `metadata.type: "system"` by default) so the chat UI renders it as a non-interactive system bubble (no retry / cancel affordances).

## Session Management

Sessions let you maintain separate conversation threads with the same agent:

- Each `sessionkey` represents a separate conversation — the agent remembers context within a session
- The default session key is `"default"` if you don't specify one
- Use unique session keys per end-user for multi-tenant applications (e.g. `"user-42"`, `"customer-abc"`)
- Sessions persist across API calls — send the same `sessionkey` to continue a conversation
- Delete a session with `/UserAgent/Message/DeleteSession` to clear history and free resources

User A's conversation:

```json
{
  "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
  "message": "Hello!",
  "sessionkey": "user-alice"
}
```

User B's separate conversation with the same agent:

```json
{
  "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
  "message": "Hello!",
  "sessionkey": "user-bob"
}
```

## Multiple blocks in one turn

A single turn is not limited to one reasoning disclosure followed by one answer. The authoritative timeline can move through multiple calls:

```text
call 0 / content 0: reasoning  → Thinking
call 0 / content 1: answer     → Initial answer text
call 0 / content 2: tool       → Safe tool label/status
call 1 / content 0: reasoning  → Thinking again
call 1 / content 1: answer     → Final answer text
```

Render each reasoning block as its own accessible `Thinking` disclosure at its timeline position. Never combine reasoning blocks across calls, and never move them above or below answer/tool blocks to force an answer-first layout. Every reasoning block contains only the provider-supplied OpenAI GPT-5 summary; raw chain-of-thought is never returned. `agent_output` is still useful for immediate accumulated answer typing, but it does not define the durable block order.

## Tracking a Message

There are three ways to track message progress after sending:

### 1. WebSocket (Recommended)

Connect to WebSocket and subscribe with the `agenttoken` for real-time streaming. Each `agent_output` event delivers the growing response as it's generated.

**1. Subscribe to agent message updates:**

```json
{
  "type": "agent_info",
  "agenttoken": "aB3xK9mR2pLqWzVn7tYhCd5sFgJkNb"
}
```

**2. Server confirms subscription with current status:**

```json
{
  "type": "agent_subscribed",
  "agenttoken": "aB3xK9mR2pLqWzVn7tYhCd5sFgJkNb",
  "status": "agent_queue",
  "debugoutput": "",
  "messageguid": "c3d4e5f6-a7b8-9012-cdef-345678901234",
  "timeline": [],
  "result": true
}
```

**3. Timeline block delta** (emitted once per changed block):

```json
{
  "type": "agent_timeline_delta",
  "agenttoken": "aB3xK9mR2pLqWzVn7tYhCd5sFgJkNb",
  "message": {
    "messageguid": "c3d4e5f6-a7b8-9012-cdef-345678901234",
    "block": {
      "blockid": "c0:i0",
      "callindex": 0,
      "contentindex": 0,
      "type": "reasoning",
      "text": "I’ll compare verified releases and adoption data.",
      "toollabel": null,
      "toolstatus": null,
      "phase": "stream",
      "version": 2,
      "startedat": 1743350401,
      "updatedat": 1743350403
    }
  },
  "result": true
}
```

Merge `message.block` by `blockid` and accept it only when its `version` is strictly newer than the stored version of that block.

**4. Provisional streaming output event** (emitted multiple times — replace your typing surface with `message.raw` on each event):

```json
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
    "answer": ["Here are the key AI trends..."]
  },
  "result": true
}
```

**5. Final answer event** (`agent_end`):

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
    "tokenCount": 412,
    "wordCount": 115,
    "raw": "Here are the key AI trends for 2026...",
    "answer": ["Here are the key AI trends for 2026..."]
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
| `message.tokenCount` | `number` | Number of answer chunks received so far. Final model tokens arrive separately in `agent_usage_report`. |
| `message.wordCount` | `number` | Number of words generated so far. |
| `message.raw` | `string` | Full accumulated raw output text. |
| `message.answer` | `string[]` | Array of answer blocks — the content to display. |

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
{
  "messageguid": "c3d4e5f6-a7b8-9012-cdef-345678901234",
  "status": "agent_end",
  "content": "What are the latest trends in AI?",
  "response": "Here are the key AI trends for 2026...",
  "debugoutput": "Here are the key AI trends for 2026...",
  "metadata": {
    "type": "progressGenerate",
    "task": "Generate",
    "speed": "14.2",
    "speedType": "words/s",
    "elapsedTime": "8.1s",
    "tokenCount": 105,
    "wordCount": 118,
    "raw": "Here are the key AI trends for 2026...",
    "answer": ["Here are the key AI trends for 2026..."]
  },
  "endedat": 1743350408
}
```

> Payload delivered to your `callbackurl`. `metadata` is decoded into a JSON object. The webhook remains answer-focused and does not embed timeline blocks; call `Message/Detail` with `messageguid` for the authoritative persisted `timeline[]`.

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

---

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
4. **Receive `agent_subscribed`** — the server acknowledges the subscribe and reports the current lifecycle status, accumulated answer text, and persisted `timeline[]`.
5. **Stream** — listen for `agent_start`, `agent_timeline_delta` block updates, provisional `agent_output` answer snapshots, then `agent_end` / `agent_error` / `agent_cancel`.
6. **Receive `agent_usage_report`** — after a successful `agent_end`, a one-shot token-usage/billing frame arrives on the same `agenttoken` (~250–500 ms later). Optional to consume; keep the socket open briefly if you need it.
7. **Close** — keep the socket open for `agent_usage_report` if needed. After completion or reconnect, read `Message/Detail` for the authoritative persisted timeline and answer.

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
| ↓ | `agent_subscribed` | Subscribe acknowledged. Carries the current lifecycle `status`, accumulated `debugoutput`, `messageguid`, and persisted `timeline[]`. If the agent already finished before you subscribed, this frame is your reconnect snapshot. |
| ↓ | `agent_start` | The bridge has opened an SSE stream to the agent container. The underlying model is now generating. Emits exactly once per message. |
| ↓ | `agent_timeline_delta` | One ordered public timeline-block update. Carries `messageguid` and one `block`; merge by `blockid` and that block's `version`, then sort by `callindex`, `contentindex`, and `blockid`. |
| ↓ | `agent_output` | Provisional answer snapshot. Emits **many times** — each carries the full accumulated `raw` answer text so far plus real-time metrics (`speed`, `elapsedTime`, `tokenCount`, `wordCount`). Replace (don't append) the typing surface on each event. |
| ↓ | `agent_end` | Terminal success event. Same payload shape as `agent_output` but contains the final complete text with total metrics. Emits at most once. |
| ↓ | `agent_error` | Terminal failure event. `message` is either a sanitized string ("Agent is temporarily unavailable…" when an exception was caught) or a `progressGenerate` object (when the stream finished but content was a degenerate `"..."` / `"Error: internal error"`). Emits at most once. |
| ↓ | `agent_cancel` | Terminal cancel event. Fires **only** when an already-active message is aborted mid-stream (via `Message/Cancel` or upstream abort). Cancels against a still-queued message do **not** broadcast this event — check `Message/Detail` for those. Emits at most once. |
| ↓ | `agent_usage_report` | Post-terminal usage/billing frame. Fires once, ~250–500 ms after a successful `agent_end`, on the same `agenttoken`. Carries the final token counts, `model`, `tokencost`, and `remainingcredits` for the message identified by `messageguid`. Not emitted for replayed usage callbacks or for turns with no chat message (cron/hook turns). |
| ↓ | `agent_wiroai_runtask` | Model-run discovery frame. Fires whenever the agent itself launches a Wiro model run during a turn (e.g. generating an image or video via `int-wiro-aimodels`). Broadcast on the **session-key** channel (not the per-turn `agenttoken`), carrying the new task's `socketaccesstoken` so you can subscribe to that run's `task_*` lifecycle and collect its outputs. See [Model runs the agent triggers](#model-runs-the-agent-triggers). |

## Message Format

Every WebSocket frame is a JSON object. Agent stream frames (`agent_start` / `agent_timeline_delta` / `agent_output` / `agent_end` / `agent_error` / `agent_cancel`) — plus the post-terminal `agent_usage_report` frame — share this base shape:

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
| `message` | varies | Empty string (`""`) for `agent_start`, `{ messageguid, block }` for `agent_timeline_delta`, a `progressGenerate` answer object for `agent_output` / `agent_end` (and for the object-shaped `agent_error`), a plain string for string-shaped `agent_error` and `agent_cancel`, and a token-usage object for `agent_usage_report`. |
| `result` | boolean | `true` for success-side events (`agent_subscribed` / `agent_start` / `agent_timeline_delta` / `agent_output` / `agent_end` / `agent_usage_report`), `false` for failure-side events (`agent_error` / `agent_cancel`). See [The `result` field](#the-result-field). |

The **control frames** (`connected`, `error`) use a different shape with no `agenttoken`:

```json
// Welcome — one per connection
{ "type": "connected", "version": "1.0" }

// Subscribe rejection — stays connected, just indicates the last agent_info was malformed
{ "type": "error", "message": "agenttoken-required", "result": false }
```

The `agent_subscribed` frame is a snapshot rather than a `message` wrapper. For a known token it carries `status`, `debugoutput`, `messageguid`, and `timeline` at the top level. When the token is unknown, `status` is `"unknown"` and those row-backed fields are omitted.

### agent_subscribed

Sent immediately after the server accepts your subscription. The `status` field reflects where the agent currently is in its lifecycle.

- If the agenttoken is **valid**, `debugoutput` is always present and `timeline` is an array (possibly empty).
- If the agenttoken is **unknown** (typo, expired, already cleaned up from the buffer), `debugoutput` is **omitted entirely** from the payload (no field at all). Always use `"debugoutput" in payload` or `payload.debugoutput !== undefined` to distinguish unknown-token from empty-output, rather than relying on truthiness.

**Valid token, queued** — `debugoutput` present and empty:

```json
{
  "type": "agent_subscribed",
  "agenttoken": "aB3xK9mR2pLqWzVn7tYhCd5sFgJkNb",
  "status": "agent_queue",
  "debugoutput": "",
  "messageguid": "c3d4e5f6-a7b8-9012-cdef-345678901234",
  "timeline": [],
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
| `agent_done` | Status of a `model_change` marker row — a zero-content separator inserted when the chat model is switched mid-session. It is **only** used for these markers; normal turns terminate at `agent_end` and never carry this status. See [Agent Messaging](/docs/agent-messaging) for model_change markers. |
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
    "answer": ["Here is the accumulated response text so far..."]
  },
  "result": true
}
```

The `raw` field contains the provisional cumulative SSE response as a single string. The `answer` array contains the same text split into segments. Replace your typing surface with `raw` (or joined `answer`) on each event; keep merging timeline updates independently until the corresponding answer block catches up.

### agent_timeline_delta

Each event carries exactly one changed public block:

```json
{
  "type": "agent_timeline_delta",
  "agenttoken": "aB3xK9mR2pLqWzVn7tYhCd5sFgJkNb",
  "message": {
    "messageguid": "c3d4e5f6-a7b8-9012-cdef-345678901234",
    "block": {
      "blockid": "c0:i0",
      "callindex": 0,
      "contentindex": 0,
      "type": "reasoning",
      "text": "I’ll compare the available evidence before making a recommendation.",
      "toollabel": null,
      "toolstatus": null,
      "phase": "stream",
      "version": 4,
      "startedat": 1743350401,
      "updatedat": 1743350404
    }
  },
  "result": true
}
```

The hard-cutover merge contract is:

1. Treat `blockid` as an opaque deterministic identity.
2. Keep the incoming block only if there is no stored block with that ID, or its `version` is strictly greater than the stored version.
3. Replace only that block; a newer update for one block must never evict another block.
4. Sort the merged values by `callindex ASC`, `contentindex ASC`, then `blockid ASC`.

`version` is per block, not global. A turn can therefore render `Thinking → Answer or Tool → Thinking → Answer` across multiple calls. `reasoning` blocks contain only provider-supplied OpenAI GPT-5 summaries, never raw chain-of-thought. `answer` blocks expose safe answer text. `tool` blocks expose only `toollabel` and `toolstatus`; their `text` is `null`, and tool IDs, arguments, and results are not public.

The complete public block shape is `blockid`, `callindex`, `contentindex`, `type`, `text`, `toollabel`, `toolstatus`, `phase`, `version`, `startedat`, and `updatedat`. `phase` is `stream`, `end`, or `error`; timestamps can be `null` when unavailable. No additional internal correlation or execution metadata is emitted in this block.

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
    "answer": ["The complete agent response text..."]
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

> **The raw runtime error is never broadcast over WebSocket.** Internal failure messages are recorded in `debugoutput` (retrievable via `POST /UserAgent/Message/Detail`) but **replaced with the generic sentence above** before being pushed to subscribed clients. Log the raw `debugoutput` for your own debugging; show the sanitized string from the WebSocket event to end users.

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
    "answer": ["..."]
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

### agent_usage_report

A post-terminal frame that reports the final token usage and billing for the turn. It arrives shortly **after** `agent_end` (~250–500 ms later, once the turn's token usage has been metered and billed) on the **same** `agenttoken`-keyed channel as `agent_start` / `agent_output` / `agent_end`. A client already subscribed to the turn receives it automatically — no extra subscribe is needed.

```json
{
  "type": "agent_usage_report",
  "agenttoken": "aB3xK9mR2pLqWzVn7tYhCd5sFgJkNb",
  "result": true,
  "message": {
    "messageguid": "c3d4e5f6-a7b8-9012-cdef-345678901234",
    "inputtokens": 3450,
    "outputtokens": 820,
    "cachereadtokens": 2400,
    "cachewritetokens": 0,
    "totaltokens": 6670,
    "model": "openai/gpt-5.6-sol",
    "tokencost": 5,
    "processedms": 4200,
    "remainingcredits": 9995
  }
}
```

The frame's `agenttoken` identifies the turn; the `message.messageguid` identifies the exact assistant message to patch. `result` is always `true`.

| Field | Type | Description |
|---|---|---|
| `messageguid` | string | UUID of the assistant message this usage applies to. **Match it to the message row** you want to update. |
| `inputtokens` | number | Uncached prompt tokens billed at the model's input rate. |
| `outputtokens` | number | Completion tokens generated by the model. |
| `cachereadtokens` | number | Prompt tokens served from the provider's prompt cache (billed at the cache-read rate). |
| `cachewritetokens` | number | Prompt tokens written to the provider's prompt cache during this turn. |
| `totaltokens` | number | Exact sum of input, output, cache-read, and cache-write tokens for the turn. |
| `model` | string | Provider/model slug used for this turn (e.g. `"openai/gpt-5.6-sol"`). |
| `tokencost` | number | Credits charged for this turn. |
| `processedms` | number | Server-side processing time for the turn, in milliseconds. |
| `remainingcredits` | number | Your account credit balance after this turn was billed. |

Use it to patch the per-message token columns and the live credit balance **without re-fetching `Message/History`**: when the frame arrives, look up the row by `messageguid` and write the token counts, `model`, `tokencost`, and `remainingcredits` straight onto it.

Like `agent_output`, it is a live broadcast — it is **not** replayed to clients that subscribe after it has already fired. If you reconnect after the fact, read usage from `POST /UserAgent/Message/Detail` (or `Message/History`) instead.

It is **not** emitted for:

- **Idempotent / replayed usage callbacks** — a turn is billed once, and a replayed usage callback does not re-broadcast the frame.
- **Turns with no chat message** — e.g. cron- or hook-triggered turns that produce no assistant message row have no `messageguid` to key on, so no frame is sent.

### Model runs the agent triggers

When the agent **itself** kicks off a Wiro model run during a turn — for example generating an image or a video through the `int-wiro-aimodels` skill — the bridge emits an `agent_wiroai_runtask` discovery frame. It hands you the new model run's `socketaccesstoken` so you can subscribe to that run and stream its progress and final media outputs. This is how a chat product surfaces a "live activity feed" of the media the agent is producing.

```json
{
  "type": "agent_wiroai_runtask",
  "agenttoken": "user-42",
  "message": {
    "taskid": 534574,
    "socketaccesstoken": "eDcCm5yy7Z…",
    "slugowner": "openai",
    "slugproject": "gpt-image-1",
    "categories": ["image"],
    "status": "task_queue",
    "response": { "result": true, "taskid": 534574, "socketaccesstoken": "eDcCm5yy7Z…" }
  },
  "result": true
}
```

| Field | Type | Description |
|---|---|---|
| `taskid` | number | The model run's task id. |
| `socketaccesstoken` | string | The run's task token. Subscribe to it (see below) to stream the model run's lifecycle and outputs. |
| `slugowner` | string | Model owner slug (e.g. `"openai"`, `"black-forest-labs"`). |
| `slugproject` | string | Model slug (e.g. `"gpt-image-1"`). |
| `categories` | array<string> | The model's categories (e.g. `["image"]`, `["video"]`). |
| `status` | string | Always `"task_queue"` at discovery — the run was just enqueued. |
| `response` | object | Convenience echo `{ result, taskid, socketaccesstoken }`. |

**This frame is keyed on the session, not the per-turn token.** Unlike the lifecycle frames above, `agent_wiroai_runtask` is broadcast on the **`sessionkey`** you passed to `Message/Send` (the frame's `agenttoken` field carries that session key, not a per-turn token). To receive it, send a second subscribe frame with your session key as the token:

```json
{ "type": "agent_info", "agenttoken": "user-42" }
```

A single socket can hold both subscriptions at once — the per-turn `agenttoken` (for the chat stream) and the `sessionkey` (for run discovery).

**Then pivot to the task socket for outputs.** Take `message.socketaccesstoken` and subscribe to the standard model-run WebSocket exactly as documented in [WebSocket](/docs/websocket) — send `{ "type": "task_info", "tasktoken": "<socketaccesstoken>" }` and stream `task_queue → task_start → task_output → task_postprocess_end`. The final `task_postprocess_end` carries the output array (media URLs). The model-run `task_*` events are **only** delivered on the task's own `socketaccesstoken` channel — they are never re-broadcast on the agent channel.

> **Only fires for agent-initiated runs.** `agent_wiroai_runtask` is emitted when the *agent* calls a model mid-turn. Model runs you launch yourself with `POST /Run` (your own `x-api-key`) do not produce this frame — you already hold their `socketaccesstoken` from the `/Run` response.

## The `result` Field

Every agent lifecycle event includes a `result` boolean:

| Value | Events |
|---|---|
| `true` | `agent_subscribed`, `agent_start`, `agent_timeline_delta`, `agent_output`, `agent_end`, `agent_usage_report` |
| `false` | `error`, `agent_error`, `agent_cancel` |

Use `result` to quickly determine whether the event represents a successful state. When `result` is `false`, inspect `message` for error details or cancellation context. The welcome `connected` frame has no `result` field — it's a one-shot ack and always implies success (you got the frame, so the upgrade worked).

## Streaming Metrics

Each `agent_output` and `agent_end` event includes real-time performance data in the `message` object:

| Field | Type | Description |
|---|---|---|
| `speed` | string | Current generation speed (e.g. `"12.5"`). |
| `speedType` | string | Speed unit — always `"words/s"` for agent responses. |
| `elapsedTime` | string | Wall-clock time since the stream started (e.g. `"2.4s"`). |
| `tokenCount` | number | Number of answer chunks received so far. Authoritative model token counts arrive in `agent_usage_report`. |
| `wordCount` | number | Total words in the accumulated response. |

These metrics update with every `agent_output` event, allowing you to display a live speed indicator or progress bar in your UI.

## Timeline safety boundary

Public reasoning is available only as `type: "reasoning"` timeline blocks. Wiro publishes provider-authored summaries from supported OpenAI GPT-5 calls, not raw hidden chain-of-thought or generic provider traces. Tool blocks publish only a safe label and status. Wiro does not parse literal `<think>` tags from `agent_output`; treat any such text in `raw` as ordinary provisional answer output.

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
←  agent_subscribed  { status: "agent_queue", debugoutput: "", timeline: [] }
←  agent_start       { message: "" }
←  agent_timeline_delta { message: { messageguid: "c3d4...", block: { blockid: "c0:i0", callindex: 0, contentindex: 0, type: "reasoning", version: 1 } } }
←  agent_output      { message: { raw: "Quantum", wordCount: 1 } }
←  agent_timeline_delta { message: { messageguid: "c3d4...", block: { blockid: "c0:i1", callindex: 0, contentindex: 1, type: "answer", version: 1 } } }
←  agent_output      { message: { raw: "Quantum computing uses qubits...", wordCount: 28 } }
←  agent_end         { message: { raw: "Quantum computing uses qubits that...", wordCount: 118 } }
←  agent_usage_report { result: true, message: { messageguid: "c3d4...", totaltokens: 6670, remainingcredits: 9994 } }
```

`←` = server → client, `→` = client → server. `agent_output` contains provisional full accumulated answer text. Replace (don't append) that typing surface; merge timeline blocks independently.

The full observable wire order for a normal turn is:

```text
agent_queue  →  agent_start  →  (agent_timeline_delta | agent_output) × N  →  agent_end  →  agent_usage_report
```

`agent_queue` is **not** a WebSocket frame — it's the `status` returned synchronously in the `Message/Send` response (and reflected by `agent_subscribed` if you subscribe while the message is still queued). Timeline and provisional answer events can interleave between start and terminal status. On the failure path, `agent_error` or `agent_cancel` takes the place of `agent_end`, and **no** `agent_usage_report` follows. `Message/Detail` is authoritative for the final persisted timeline.

[`agent_wiroai_runtask`](#model-runs-the-agent-triggers) is **not** part of this linear order — it fires out-of-band (zero or more times per turn, whenever the agent launches a model run) on the **session-key** channel rather than the per-turn `agenttoken`.

## Code Examples

### JavaScript

```javascript
const agentToken = 'your-agent-token';

const ws = new WebSocket('wss://socket.wiro.ai/v1');
const timelineByMessage = new Map();

function mergeTimelineBlock(messageguid, block) {
  const byId = timelineByMessage.get(messageguid) || new Map();
  const previous = byId.get(block.blockid);
  if (!previous || block.version > previous.version) {
    byId.set(block.blockid, block);
  }
  timelineByMessage.set(messageguid, byId);
  return [...byId.values()].sort(
    (a, b) => a.callindex - b.callindex
      || a.contentindex - b.contentindex
      || a.blockid.localeCompare(b.blockid)
  );
}

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

    case 'agent_timeline_delta':
      // Merge msg.message.block by blockid + per-block version, then sort
      // by callindex/contentindex. Do not append in arrival order.
      mergeTimelineBlock(msg.message.messageguid, msg.message.block);
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
  "messageguid": "c3d4e5f6-...",
  "timeline": [],
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

**`agent_timeline_delta`** — one public block update:

```json
{
  "type": "agent_timeline_delta",
  "agenttoken": "aB3xK9...",
  "message": {
    "messageguid": "c3d4e5f6-...",
    "block": {
      "blockid": "c0:i0",
      "callindex": 0,
      "contentindex": 0,
      "type": "reasoning",
      "text": "I’ll verify the relevant constraints.",
      "toollabel": null,
      "toolstatus": null,
      "phase": "stream",
      "version": 1,
      "startedat": 1743350401,
      "updatedat": 1743350402
    }
  },
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

**`agent_usage_report`** — post-terminal usage/billing frame, ~250–500 ms after `agent_end`:

```json
{
  "type": "agent_usage_report",
  "agenttoken": "aB3xK9...",
  "result": true,
  "message": {
    "messageguid": "c3d4e5f6-...",
    "totaltokens": 6670,
    "model": "openai/gpt-5.4",
    "tokencost": 5,
    "remainingcredits": 9995
  }
}
```

## Connection Keep-Alive

The Wiro WebSocket server sends a ping every **30 seconds** to keep the connection alive. Most standard WebSocket client libraries respond to pings automatically; if your client implements a custom frame handler, make sure it sends a pong within a few seconds of each ping or the server will drop the connection. After `agent_error` / `agent_cancel` you can close the socket immediately. After `agent_end`, one more frame (`agent_usage_report`) follows ~250–500 ms later; wait for it if you need usage/billing data. Read `Message/Detail` whenever you need the authoritative completed timeline.

## Correlating Events With Your Messages

Every agent lifecycle frame carries `agenttoken`, so keep the mapping returned by `Message/Send`. Most stream frames do not include `messageguid`; `agent_timeline_delta` additionally carries `message.messageguid`, and `agent_subscribed` carries top-level `messageguid`. No frame carries `useragentguid`.

The post-terminal `agent_usage_report` also names `message.messageguid`, but it arrives only after `agent_end`, so you still need the `agenttoken → messageguid` mapping for start/output/end/error/cancel routing.

### Why `agenttoken` is the correlation key

- `Message/Send` issues exactly one `agenttoken` per message and returns it alongside `messageguid` in the HTTP response.
- The bridge stamps the same `agenttoken` on every event it emits for that message.
- Multiple connections can subscribe to the same `agenttoken` and each gets the full event stream — so `agenttoken` is also the fan-out key.
- A single socket can hold subscriptions for many `agenttoken`s at once (see [Multi-session subscription](#multi-session-subscription)) — the per-event `agenttoken` lets your handler dispatch into the right UI element.

### Recommended client pattern

1. Call `POST /UserAgent/Message/Send` — you get back `{ messageguid, agenttoken, status: "agent_queue", ... }`.
2. Store the mapping `agenttoken → messageguid` (or `agenttoken → your UI message id`).
3. Send `{ "type": "agent_info", "agenttoken }` on an open socket (new or existing — connections can be reused).
4. In `ws.onmessage`, read `msg.agenttoken` on every lifecycle frame. For `agent_timeline_delta`, merge `msg.message.block` by `blockid` and strictly newer per-block `version`; never append in arrival order.
5. When the turn ends, delete the mapping so it doesn't leak memory across sessions. For successful turns, wait for the trailing `agent_usage_report` (it arrives ~250–500 ms after `agent_end`) before deleting, so you can attribute the usage to the right message; for `agent_error` / `agent_cancel`, delete immediately — no usage report follows.

```javascript
const tokenToMessageId = new Map()
const timelineByMessageId = new Map()

function mergeTimelineBlock(uiMessageId, block) {
  const byId = timelineByMessageId.get(uiMessageId) || new Map()
  const previous = byId.get(block.blockid)
  if (!previous || block.version > previous.version) byId.set(block.blockid, block)
  timelineByMessageId.set(uiMessageId, byId)
  const timeline = [...byId.values()].sort(
    (a, b) => a.callindex - b.callindex
      || a.contentindex - b.contentindex
      || a.blockid.localeCompare(b.blockid)
  )
  updateUI(uiMessageId, { timeline })
}

async function sendMessage(text, uiMessageId) {
  const resp = await fetch('https://api.wiro.ai/v1/UserAgent/Message/Send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': 'YOUR_API_KEY' },
    body: JSON.stringify({
      useragentguid: 'your-useragent-guid',
      message: text,
      sessionkey: 'user-42'
    })
  }).then(r => r.json())

  tokenToMessageId.set(resp.agenttoken, uiMessageId)
  ws.send(JSON.stringify({ type: 'agent_info', agenttoken: resp.agenttoken }))
  return { messageguid: resp.messageguid, agenttoken: resp.agenttoken }
}

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data)
  if (!msg.agenttoken) return  // control frames (connected / error) have no token

  const uiMessageId = tokenToMessageId.get(msg.agenttoken)
  if (!uiMessageId) return  // unknown token — probably stale

  switch (msg.type) {
    case 'agent_timeline_delta':
      mergeTimelineBlock(uiMessageId, msg.message.block)
      break
    case 'agent_output':
      updateUI(uiMessageId, { streaming: msg.message.raw })
      break
    case 'agent_end':
      // Keep the mapping — agent_usage_report still follows for successful turns.
      updateUI(uiMessageId, { final: msg.message.raw, status: 'agent_end' })
      break
    case 'agent_usage_report':
      updateUI(uiMessageId, { usage: msg.message, remainingCredits: msg.message.remainingcredits })
      tokenToMessageId.delete(msg.agenttoken)
      break
    case 'agent_error':
    case 'agent_cancel':
      updateUI(uiMessageId, { error: msg.message, status: msg.type })
      tokenToMessageId.delete(msg.agenttoken)
      break
  }
}
```

### Concurrency: multiple in-flight messages on one session

Sending two messages back-to-back in the same `sessionkey` produces two independent `agenttoken`s. Both reach the bridge in queue order; both stream events independently. Your client must:

- Subscribe to **both** `agenttoken`s (one `agent_info` frame each — the server de-duplicates automatically).
- Key all UI updates on `agenttoken`, not on `sessionkey` (which is shared) or timestamps (which can interleave).

The server never mixes streams — every event is stamped with the originating `agenttoken` so routing is unambiguous even when chunks from two messages interleave on the wire.

### Control frames have no `agenttoken`

The welcome frame and the subscribe-error frame are connection-level signals, not per-message events. They intentionally **omit** `agenttoken`:

```json
{ "type": "connected", "version": "1.0" }
```

```json
{ "type": "error", "message": "agenttoken-required", "result": false }
```

Always null-check `msg.agenttoken` before looking it up in your mapping — see the `if (!msg.agenttoken) return` guard in the example above.

## Reconnection & Recovery

The agent keeps running server-side **regardless of whether any client is subscribed**. A disconnected socket never cancels the agent. This means a dropped connection is always recoverable — just reconnect and re-subscribe with the same `agenttoken`.

### Recovery flow

1. **Detect disconnect** — `ws.onclose` / stream exception / ping timeout.
2. **Reconnect** — open a new WebSocket to `wss://socket.wiro.ai/v1`.
3. **Wait for welcome** — receive `{ "type": "connected", "version": "1.0" }` (optional but clean).
4. **Re-subscribe** — send `{ "type": "agent_info", "agenttoken": "..." }` with the same token.
5. **Handle `agent_subscribed`** — the server reports the **current** status and persisted `timeline[]`. Three cases:
   - `status` is `agent_queue` / `agent_start` / `agent_output` → stream is still live; accumulated provisional answer text is in `debugoutput`. Seed your block map from `timeline`, then merge future deltas.
   - `status` is `agent_end` → the agent already finished. `debugoutput` holds the full final response. Fetch `POST /UserAgent/Message/Detail` for the canonical record (including complete `timeline`, `metadata`, attachments, and timestamps), then close the socket.
   - `status` is `agent_error` / `agent_cancel` → the agent already failed / was cancelled. `debugoutput` may contain partial output. No further events. Fetch `POST /UserAgent/Message/Detail` for the persisted error details.

On reconnect you do **not** receive replays of past `agent_output` or `agent_timeline_delta` frames. Use `debugoutput` and `timeline` on `agent_subscribed` as the snapshot of what you missed.

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
| Timeline block changes | Emits one `agent_timeline_delta` update with `{ messageguid, block }`; the persisted row keeps the merged ordered timeline. |
| Each SSE chunk | Emits `agent_output` to every active subscriber (with full accumulated `raw`). |
| Stream finishes | Emits `agent_end` (or `agent_error` for `"..."` / internal-error content) with final `progressGenerate` payload; DB row status is updated to terminal. |
| Usage billed | ~250–500 ms after a successful `agent_end`, emits `agent_usage_report` with final token counts, `model`, `tokencost`, and `remainingcredits`. Not emitted for replayed usage callbacks or for turns with no chat message (cron/hook turns). |
| Bridge exception | Emits `agent_error` with sanitized string; DB row status → `agent_error`, raw error in `debugoutput`. |
| `Message/Cancel` during active stream | Bridge aborts, emits `agent_cancel`; DB row status → `agent_cancel`. |
| `Message/Cancel` while queued | DB row status → `agent_cancel` immediately. **No WebSocket event is broadcast** (the bridge never started). Clients checking via the socket must consult `Message/Detail` for queued-state cancels. |

**Multi-subscriber semantics**: multiple WebSocket connections can subscribe to the same `agenttoken` and all receive the same event stream in parallel. The server does not enforce a subscriber limit per token. This is how the Wiro Dashboard shows the same agent chat on multiple tabs for the same user — each tab opens its own socket and subscribes independently.

**Cross-user subscription**: the `agenttoken` alone authenticates subscription — if you leak a token to another user, they can read the stream. Treat tokens like short-lived secrets scoped to the message.

---

# Agent Webhooks

Receive agent response notifications via HTTP callbacks.

## How It Works

When you send a message to an agent via `POST /UserAgent/Message/Send`, include a `callbackurl` parameter. Once the agent finishes processing on the bridge, Wiro sends a POST request to your URL with the result. Callbacks fire on `agent_end` (success), `agent_error` (failure during processing), and `agent_cancel` **only when the abort hits the bridge mid-flight**. Messages cancelled while still queued (status `agent_queue`, before the bridge picks them up) are marked `agent_cancel` in the database but **do not fire a webhook** — there was no processing attempt to report on. See the "When the cancel webhook fires" note below for the full decision table.

This lets you build fully asynchronous workflows: fire a message and let your backend handle the response whenever it arrives, without polling or maintaining a WebSocket connection.

## Setting a Callback URL

Include `callbackurl` in your message request body. `POST /UserAgent/Message/Send`:

```json
{
  "useragentguid": "your-useragent-guid",
  "message": "What are today's trending topics?",
  "sessionkey": "user-123",
  "callbackurl": "https://your-server.com/webhooks/agent-response"
}
```

The callback URL is stored per-message. You can use different URLs for different messages, or omit it entirely if you prefer polling or WebSocket.

## Callback Payload

When the agent finishes, Wiro sends a **POST** request to your `callbackurl` with `Content-Type: application/json`. The payload is deliberately answer-focused: it contains the final answer/error and structured answer metadata, but not the ordered turn timeline.

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
    "answer": ["Here are today's trending topics in tech..."]
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
  "response": "AbortError",
  "debugoutput": "AbortError",
  "metadata": {},
  "endedat": 1712050004
}
```

> The `response` and `debugoutput` fields contain the raw abort reason from the runtime — typically `"AbortError"` or a short technical string. Do not rely on a specific fixed user-facing message; use `status === "agent_cancel"` as the signal.

> **When the cancel webhook fires:** `agent_cancel` is delivered **only when the agent bridge catches an `AbortError`** during active processing — i.e. the message had already started on the agent side and was aborted mid-flight (via `POST /UserAgent/Message/Cancel` or an upstream timeout). For messages cancelled **before** they reach the bridge (still queued, or an instant `Message/Cancel` that beats dispatching), the message is marked `agent_cancel` in the database and returned as such in `POST /UserAgent/Message/Detail`, but **no webhook is fired** — there was no processing attempt to report on. Use `POST /UserAgent/Message/Detail` (checking `status === "agent_cancel"`) as the canonical source of truth for cancellation; WebSocket subscribers receive the `agent_cancel` event only on active-processing aborts (same condition as the webhook). Treat the webhook as a best-effort "processing was interrupted" signal.

### Field Reference

| Field | Type | Description |
|-------|------|-------------|
| `messageguid` | string | Unique identifier of the message. Use this to correlate with your records. |
| `status` | string | Final status: `agent_end`, `agent_error`, or `agent_cancel`. |
| `content` | string | The original user message you sent. |
| `response` | string | The agent's full response text on success. For errors, contains the error message. For cancellation, contains the abort reason. |
| `debugoutput` | string | Same as `response` — the full accumulated output text. Included for consistency with the polling API. |
| `metadata` | object | Structured answer data, performance metrics, and raw text. Timeline blocks are not embedded in webhooks. Empty object (`{}`) for error and cancel statuses. |
| `endedat` | number | Unix timestamp (UTC seconds) when processing finished. |

### The `metadata` Object

On successful completion (`agent_end`), the `metadata` object contains the structured answer and final stream metrics:

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | Always `"progressGenerate"`. |
| `task` | string | Always `"Generate"`. |
| `raw` | string | The complete response text. |
| `answer` | array | Array of response segments — the content to show the user. |
| `speed` | string | Final generation speed (e.g. `"14.2"`). |
| `speedType` | string | Speed unit — `"words/s"`. |
| `elapsedTime` | string | Total generation time (e.g. `"8.1s"`). |
| `tokenCount` | number | Number of answer chunks received by the bridge. Use the message's billing columns for authoritative model tokens. |
| `wordCount` | number | Total words in the response. |

For `agent_error` and `agent_cancel`, `metadata` is an empty object `{}`. Always check `status` before accessing metadata fields.

After receiving the webhook, call `POST /UserAgent/Message/Detail` with `messageguid` whenever you need the authoritative top-level `timeline[]`. It preserves the ordered reasoning, answer, and safe tool-label/status blocks for the completed turn.

> **Note:** For `agent_error`, the webhook's `response` / `debugoutput` contain the **raw error** from the agent runtime (useful for debugging). The same message may be **sanitized to a user-facing string** when you read it back via `POST /UserAgent/Message/Detail`, so the two can differ. Log the webhook payload if you need the original.

## Status Values

| Status | Description | `response` contains | `metadata` contains |
|--------|-------------|---------------------|---------------------|
| `agent_end` | Agent completed successfully | Full response text | Structured answer and metrics |
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

The `agenttoken` can be used to track the message via [Agent WebSocket](/docs/agent-websocket) for real-time streaming, while the webhook delivers the final result to your server.

---

# Agent Credentials & OAuth

Configure third-party service connections for your agent instances. Browse the platform's credential registry, set API keys, direct machine credentials, or OAuth, and audit credential edits over time.

## Overview

Wiro agents connect to external services — social platforms, ad networks,
email tools, CRMs — through three credential methods:

1. **API Key credentials** — set directly via `POST /UserAgent/CredentialUpsert` (bulk field upsert per provider).
2. **OAuth credentials** — redirect-based authorization via `POST /UserAgentOAuth/OAuthConnect`, where Wiro handles token exchange server-side.
3. **Hybrid direct credentials** — save a machine credential, call
   `OAuthConnect` for server-side validation/discovery, then finalize any
   account picker without exposing provider tokens to the browser.

Each external service is documented as its own **integration page** with the complete setup walkthrough, API reference, troubleshooting, and multi-tenant architecture notes. Use the catalog below to jump to the one you need.

**Read & write paths at a glance:**

| Operation | Endpoint |
|-----------|----------|
| Browse all credentials in the registry | [`POST /Credentials/List`](#post-credentialslist) (public) |
| Inspect a single credential schema | [`POST /Credentials/Detail`](#post-credentialsdetail) (public) |
| Find the credential a skill needs | [`POST /Skills/CredentialSchema`](/docs/agent-skills#post-skillscredentialschema) (public) |
| Write one or more credential fields | [`POST /UserAgent/CredentialUpsert`](/docs/agent-overview#post-useragentcredentialupsert) |
| Discover external communication channels | [`POST /Skills/List`](/docs/agent-skills#post-skillslist) → `channels[]` (public) |
| Connect or disable an external channel | [`POST /UserAgent/CredentialUpsert`](/docs/agent-overview#post-useragentcredentialupsert) |
| Read version history of a credential | [`POST /UserAgent/CredentialFieldHistory`](/docs/agent-overview#post-useragentcredentialfieldhistory) |

> Read responses from `POST /UserAgent/Detail` / `POST /UserAgent/MyAgents` expose the composed `credentials` tree (each provider with its `_connected` / `optional` / `extra` / `_editable` / `_schema` flags), the `customskills[]` array, the `scheduledskills[]` array (cron skills), the `skills[]` array of enabled skill names, the `tokenRates` + `agentModel` objects, and the flat credit fields (`monthlycredits`, `extracredits`, `usedcredits`, `remainingcredits`, `creditperiod`, `creditsyncat`) as **top-level fields** on the useragent object. See [Agent Overview](/docs/agent-overview) for the full endpoint catalog.

## Communication Channels

Every Wiro agent is reachable through web chat and the Agent Messaging API
without additional configuration. Telegram, Slack, and Discord are optional
external channels. They are available to every marketplace template and custom
agent, but remain disabled until every registry-declared activation credential
is complete. There is no separate enable switch on an existing agent.

Channels are not skills and do not affect pricing. Discover them from the
top-level `channels[]` array returned by public `POST /Skills/List`:

```bash
curl -X POST "https://api.wiro.ai/v1/Skills/List" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Each row contains:

| Field | Description |
|-------|-------------|
| `id` | Channel identifier (`telegram`, `slack`, or `discord`). |
| `credential_key` | Key used inside the `credentials` object. |
| `required_fields` | Fields that must all be populated for automatic activation. |
| `capabilities` | Public UI hints for direct messages, rooms, threads, role allowlists, and command menus. |
| `credential` | Full form descriptor, including `credential_schema`, labels, validation patterns, and setup help. |

Use `POST /UserAgent/CredentialUpsert` for an existing useragent. Send all
activation fields in one `fields[]` request when connecting a channel:

```json
{
  "useragentguid": "your-useragent-guid",
  "fields": [
    {
      "credentialkey": "telegram",
      "fieldname": "bottoken",
      "fieldvalue": "123456:ABC-DEF..."
    },
    {
      "credentialkey": "telegram",
      "fieldname": "allowedusers",
      "fieldvalue": ["761381461"]
    },
    {
      "credentialkey": "telegram",
      "fieldname": "groups",
      "fieldvalue": [
        {
          "chatid": "-1001234567890",
          "allowedusers": ["761381461"]
        }
      ]
    }
  ]
}
```

For a new useragent, include the complete channel group in `credentials`. The
channel activates from those credentials; Deploy accepts neither an
`enabledchannels` toggle nor a chat-mode field. Configure Chat Mode after
deployment with `teamsessionmode` in `POST /UserAgent/UpdateSettings`.

| Channel | Required fields | Optional scoped access |
|---------|-----------------|------------------------|
| Telegram | `bottoken`, `allowedusers[]` | `groups[]` rows with negative `chatid` and room-specific `allowedusers[]`. |
| Slack | `bottoken`, `apptoken`, `workspaceid`, `allowedusers[]` | `channels[]` rows with immutable `channelid` and room-specific `allowedusers[]`. Enable Socket Mode and grant the app token `connections:write`. |
| Discord | `bottoken`, `allowedusers[]` | `applicationid`; `guilds[]` rows with `guildid`, `channelids[]`, and optional `allowedusers[]` / `allowedroles[]`. |

`teamsessionmode: "private"` isolates each approved direct-message operator
and each team member's Wiro web-chat history and native agent memory.
`"collaborative"` shares those runtime contexts. Team deployments and
transfers default to collaborative; personal deployments and team detachments
default to private. Web and external-channel message lists remain separate
transports, and room/thread sessions remain scoped to their room.

Send immutable platform IDs only. Display names, usernames, email addresses,
and free-form room names are not authorization identifiers. Unlisted users and
rooms are rejected, and room messages must mention the bot. To disable a
channel, clear at least one of its `required_fields` with `CredentialUpsert`.
Completing the required fields again reactivates it automatically.

## Credential Registry Endpoints

These endpoints are **public — no authentication required**. They return data straight from the credential registry — useful when you want to render a "Connect this provider" form without a deployed useragent (e.g. inside an onboarding wizard).

### **POST** /Credentials/List

Lists all credentials in the registry.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `credential_mode` | string | No | Filter by mode: `"oauth"`, `"sa"` (service account), `"api_key"`, `"multi_api_key"`, `"hybrid"` (OAuth plus a direct/API-key mode), `"imap_credentials"`, `"jwt_sa"`, `"rule_only"`. |
| `wiro_connect_pending` | boolean | No | Filter by the "Wiro mode coming soon" flag — credentials whose Wiro-shared OAuth client is still awaiting provider review (currently `facebook-pages`, `instagram`, `google-ads`, `google-merchant-center`, `youtube`, `ga4`, `linkedin`, `tiktok`, and `meta-ads`). Facebook Pages, Instagram, and Meta Ads remain usable through their ready customer-owned System User and/or OAuth alternatives. |

##### Response

```json
{
  "result": true,
  "errors": [],
  "total": 22,
  "credentials": [
    {
      "key": "instagram",
      "title": "Instagram",
      "icon": "/images/icons/skills/instagram.svg",
      "brand_color": "#e4405f",
      "brand_text_color": "#ffffff",
      "brand_logo_filter": "none",
      "docs_url": "integration-instagram-skills",
      "credential_mode": "hybrid",
      "connection_modes": ["api_key", "own", "wiro"],
      "default_connection_mode": "api_key",
      "mode_badges": {
        "api_key": "Recommended",
        "own": "Advanced"
      },
      "wiro_connect_pending": true,
      "credential_schema": [
        {
          "key": "appid",
          "type": "text",
          "label": "App ID",
          "required": true,
          "pattern": "^[0-9]+$",
          "help": "<ol><li>Go to Meta for Developers → My Apps</li><li>Create App → Other → Business</li><li>Copy the App ID from the dashboard</li><li>Add Product → Facebook Login → Set Up</li><li>Add OAuth Redirect URI: https://api.wiro.ai/v1/UserAgentOAuth/IGCallback</li></ol>",
          "oauth_managed": true,
          "only_in_modes": ["own"]
        },
        {
          "key": "appsecret",
          "type": "password",
          "label": "App Secret",
          "required": true,
          "show_toggle": true,
          "help": "<ol><li>Meta for Developers → select your app</li><li>App Settings → Basic</li><li>Click Show next to App Secret and copy</li></ol>",
          "oauth_managed": true,
          "only_in_modes": ["own"]
        },
        {
          "key": "systemusertoken",
          "type": "password",
          "label": "System User Token",
          "required": true,
          "encrypted": true,
          "show_toggle": true,
          "runtime_excluded": true,
          "only_in_modes": ["api_key"]
        },
        {
          "key": "accountId",
          "type": "text",
          "label": "Instagram Account ID",
          "required": true,
          "pattern": "^[0-9]+$",
          "auto_filled_by_oauth": true,
          "readonly_when_connected": true
        },
        {
          "key": "igusername",
          "type": "text",
          "label": "Connected Account",
          "required": false,
          "auto_filled_by_oauth": true,
          "readonly_when_connected": true
        }
      ],
      "oauth_provider": {
        "auth_method_value": "wiro",
        "connect_endpoint": "/UserAgentOAuth/OAuthConnect",
        "disconnect_endpoint": "/UserAgentOAuth/OAuthDisconnect",
        "status_endpoint": "/UserAgentOAuth/OAuthStatus",
        "connect_button_label": "Connect with Instagram",
        "connect_button_icon": "/images/icons/skills/instagram.svg",
        "connect_button_brand_color": "#e4405f",
        "connect_button_text_color": "#ffffff",
        "connect_button_logo_filter": "none",
        "username_field": "igusername",
        "return_query_param": "ig_connected",
        "return_error_param": "ig_error",
        "return_error_detail_param": "ig_error_detail",
        "direct_probe": {
          "mode": "api_key",
          "mode_label": "System User Token",
          "token_field": "systemusertoken",
          "required_fields": ["systemusertoken"],
          "public_account_fields": ["id", "name"]
        },
        "account_picker": {
          "enabled": true,
          "multi_select": true,
          "set_endpoint": "/UserAgentOAuth/SetPickerAccounts",
          "item_value_field": "accountId",
          "item_label_field": "igusername",
          "item_fields_to_save": ["accountId", "igusername"]
        },
        "extra_step": null
      },
      "used_by_skills": ["int-instagram-post"]
    }
  ]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `key` | `string` | Canonical credential key. Use this in `CredentialUpsert.fields[].credentialkey`. |
| `title` | `string` | Display label shown on credential cards. |
| `icon` | `string` | Path or URL to the brand icon (relative paths absolutized server-side). |
| `brand_color` / `brand_text_color` / `brand_logo_filter` | `string\|null` | Brand colours and CSS filter for icon rendering — same shape as on skill registry entries. |
| `docs_url` | `string\|null` | Slug of the integration page on this docs site. Frontends prefix with `/docs/`. |
| `credential_mode` | `string` | One of `"oauth"`, `"sa"` (service account), `"api_key"`, `"multi_api_key"`, `"hybrid"` (OAuth plus a direct/API-key mode), `"imap_credentials"`, `"jwt_sa"`, `"rule_only"`. |
| `connection_modes` | `array<string>` | The auth modes the credential supports — for example `["wiro", "own"]` for OAuth, `["api_key"]` for API-key credentials, `["sa"]` for service accounts, or `["api_key", "own", "wiro"]` for the Meta hybrids. Drives the auth-method picker in the panel. |
| `default_connection_mode` | `string\|null` | Registry-recommended mode selected for a new, disconnected credential. Facebook Pages, Instagram, and Meta Ads default to `"api_key"` System User mode. |
| `mode_badges` | `object` | Optional labels shown beside auth modes, such as `{ "api_key": "Recommended", "own": "Advanced" }`. |
| `wiro_connect_pending` | `boolean` | When `true`, Wiro's shared OAuth client is awaiting provider review. Currently set on 9 credentials: `facebook-pages`, `instagram`, `google-ads`, `google-merchant-center`, `youtube`, `ga4`, `linkedin`, `tiktok`, and `meta-ads`. Ready alternative modes remain usable; Facebook Pages, Instagram, and Meta Ads expose customer-owned System User and/or OAuth paths. The flag does not strip or hide schema fields. |
| `credential_schema` | `array<field>` | Per-field schema describing the credential form. Each entry is a `field` object — see below. |
| `oauth_provider` | `object\|null` | OAuth wiring (endpoints, button styling, picker config) when `credential_mode` includes OAuth. `null` for non-OAuth credentials. See below. |
| `used_by_skills` | `array<string>` | Skill names that consume this credential — useful for "which skills will this connection enable?" hints. |

**`credential_schema[]` field object:**

| Sub-field | Type | Description |
|-----------|------|-------------|
| `key` | `string` | Field name (matches the database column under `useragentcredentialfields.fieldname`). |
| `type` | `string` | Input type: `"text"`, `"password"`, `"select"`, `"boolean"`, `"string-array"`, `"object-array"`, `"fileinput"` (public asset, written via `CredentialFileUpload` multipart), `"fileinput-base64"` (secret sent inline via `CredentialUpsert`), or `"custom"`. |
| `label` | `string` | Display label for the form input. |
| `required` | `boolean` | Whether the field must be filled before the agent can use the integration. |
| `placeholder` | `string?` | Placeholder text for the input. |
| `pattern` | `string?` | Regex the value must satisfy. |
| `maxlength` / `minlength` | `number?` | Length constraints. |
| `options` | `array?` | For `type: "select"` — `[{ label, value }]` choices. |
| `default` | `string?` | Default value applied when the user hasn't set anything yet. |
| `help` | `string?` | HTML help text rendered under the input. |
| `show_toggle` | `boolean?` | For `type: "password"` — render a "show / hide" toggle. |
| `oauth_managed` | `boolean?` | `true` when the field is set as part of the OAuth flow (cannot be edited by the user once connected). |
| `auto_filled_by_oauth` | `boolean?` | `true` when the provider connection flow writes the value (e.g. `igusername` from OAuth or direct discovery). |
| `readonly_when_connected` | `boolean?` | `true` when the field becomes read-only after a successful OAuth connection. |
| `only_in_modes` | `array<string>?` | When set (e.g. `["own"]`), the field only appears in the listed `authmethod` mode. |
| `runtime_excluded` | `boolean?` | `true` when a setup secret is used only by Wiro's server and must never enter the agent runtime. Meta System User tokens use this flag. |
| `platform_managed` | `boolean?` | `true` when Wiro fills the value server-side (you can't supply it). Currently only the `sys-openai` credential schema flags every field as `platform_managed: true`, which makes the entire credential hidden from `UserAgent/Detail` and `Credentials/List` for non-admin callers. |
| `item_schema` / `item_type` | `object?` | For array-of-object fields — describes the per-entry shape (e.g. `apple-appstore.apps[].{appname, appid}`). |

**`oauth_provider` object** (present when `credential_mode` includes OAuth):

| Sub-field | Type | Description |
|-----------|------|-------------|
| `auth_method_value` | `string` | The provider's default OAuth `authmethod` value. It is `"wiro"` only for credentials that offer a Wiro-managed app; customer-owned-only providers use `"own"`. |
| `connect_endpoint` / `disconnect_endpoint` / `status_endpoint` | `string` | The OAuth endpoints under `/UserAgentOAuth/...` that drive the connect / disconnect / status flow for this provider. Today every OAuth credential resolves to the unified `/UserAgentOAuth/OAuthConnect`, `/UserAgentOAuth/OAuthDisconnect`, `/UserAgentOAuth/OAuthStatus` endpoints — the field is kept on the schema for forward-compat with future per-provider overrides. |
| `connect_button_label` / `connect_button_icon` / `connect_button_brand_color` / `connect_button_text_color` / `connect_button_logo_filter` | `string` | Branding for the "Connect with X" button. |
| `username_field` | `string` | The credential field that holds the connected account name (e.g. `"igusername"`, `"channelname"`). |
| `return_query_param` / `return_error_param` / `return_error_detail_param` | `string` | URL params Wiro appends to the `redirectURL` when the OAuth flow completes (success / error / detail). |
| `account_picker` | `object\|null` | When non-null, the connection flow includes an account / page / channel picker after OAuth or direct discovery. Key fields: `set_endpoint` (always `/UserAgentOAuth/SetPickerAccounts`), `multi_select` (`true` when 1+ entries can be picked, `false` for exactly one), `item_value_field` / `item_label_field` (which entry keys identify and label each account in the response), `item_fields_to_save` (the fields each entry in the `accounts` body must carry), and optional `next` for a chained picker. `next.discover_endpoint` is `/UserAgentOAuth/DiscoverPickerItems`; its `key`, parent/item fields, `set_endpoint`, and `persist_field` define the grouped child-selection request and stored result. Meta Ads currently uses this for ad account → Facebook Pages. |
| `direct_probe` | `object\|null` | Registry contract for a non-redirect mode: identifies the mode and write-only token field, validates it server-side, discovers selectable accounts, and declares which public account fields may be returned. |
| `extra_step` | `object\|null` | Reserved for providers with a third onboarding step beyond OAuth + picker (currently null for every provider). |

**`fieldstatus` values** — note: this is **not** part of the registry schema; it's the runtime classification stamped onto each `useragentcredentialfields` row when it's written. It controls who can see the value:

| Value | Who writes it | Visible to API caller? |
|-------|---------------|------------------------|
| `user` | API callers + UI users | Yes |
| `oauth_app` | API callers (own-mode only) | Yes (live), redacted to `[REDACTED]` in history |
| `oauth_session` | OAuth callback (server-only) | **No** — always stripped from responses |
| `oauth_picker` | OAuth callback / `Set*` picker endpoints | Yes |
| `platform` | Wiro internal | **No** — stripped for `user`-role callers |
| `computed` | Server-derived | Yes |
| `control` | Wiro internal | **No** — stripped for `user`-role callers |

### **POST** /Credentials/Detail

Returns a single credential entry by key.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `key` | string | Yes | Canonical credential key (e.g. `"instagram"`, `"google-ads"`, `"telegram"`). |

##### Response

Returns the **same full credential entry** as a row from `Credentials/List` — every field listed in the table above is present. Example for `key: "instagram"`:

```json
{
  "result": true,
  "errors": [],
  "credential": {
    "key": "instagram",
    "title": "Instagram",
    "icon": "/images/icons/skills/instagram.svg",
    "brand_color": "#e4405f",
    "brand_text_color": "#ffffff",
    "brand_logo_filter": "none",
    "docs_url": "integration-instagram-skills",
    "credential_mode": "hybrid",
    "connection_modes": ["api_key", "own", "wiro"],
    "default_connection_mode": "api_key",
    "mode_badges": {
      "api_key": "Recommended",
      "own": "Advanced"
    },
    "wiro_connect_pending": true,
    "credential_schema": [
      {
        "key": "appid",
        "type": "text",
        "label": "App ID",
        "required": true,
        "pattern": "^[0-9]+$",
        "help": "Meta for Developers → My Apps → Create App → copy App ID.",
        "oauth_managed": true,
        "only_in_modes": ["own"]
      },
      {
        "key": "appsecret",
        "type": "password",
        "label": "App Secret",
        "required": true,
        "show_toggle": true,
        "help": "Meta for Developers → App Settings → Basic → Show next to App Secret.",
        "oauth_managed": true,
        "only_in_modes": ["own"]
      },
      {
        "key": "systemusertoken",
        "type": "password",
        "label": "System User Token",
        "required": true,
        "encrypted": true,
        "show_toggle": true,
        "runtime_excluded": true,
        "only_in_modes": ["api_key"]
      },
      {
        "key": "accountId",
        "type": "text",
        "label": "Instagram Account ID",
        "required": true,
        "pattern": "^[0-9]+$",
        "auto_filled_by_oauth": true,
        "readonly_when_connected": true
      },
      {
        "key": "igusername",
        "type": "text",
        "label": "Connected Account",
        "required": false,
        "auto_filled_by_oauth": true,
        "readonly_when_connected": true
      }
    ],
    "oauth_provider": {
      "auth_method_value": "wiro",
      "connect_endpoint": "/UserAgentOAuth/OAuthConnect",
      "disconnect_endpoint": "/UserAgentOAuth/OAuthDisconnect",
      "status_endpoint": "/UserAgentOAuth/OAuthStatus",
      "connect_button_label": "Connect with Instagram",
      "connect_button_icon": "/images/icons/skills/instagram.svg",
      "connect_button_brand_color": "#e4405f",
      "connect_button_text_color": "#ffffff",
      "connect_button_logo_filter": "none",
      "username_field": "igusername",
      "return_query_param": "ig_connected",
      "return_error_param": "ig_error",
      "return_error_detail_param": "ig_error_detail",
      "direct_probe": {
        "mode": "api_key",
        "mode_label": "System User Token",
        "token_field": "systemusertoken",
        "required_fields": ["systemusertoken"],
        "public_account_fields": ["id", "name"]
      },
      "account_picker": {
        "enabled": true,
        "multi_select": true,
        "set_endpoint": "/UserAgentOAuth/SetPickerAccounts",
        "item_value_field": "accountId",
        "item_label_field": "igusername",
        "item_fields_to_save": ["accountId", "igusername"]
      },
      "extra_step": null
    },
    "used_by_skills": ["int-instagram-post"]
  }
}
```

Returns `{ "result": false, "errors": [{ "code": 404, "message": "Credential not found: <key>" }] }` if the key is unknown.

## Integration Catalog

### OAuth Integrations

| Integration | Auth Modes | Setup Guide |
|-------------|------------|-------------|
| Meta Ads | Own OAuth + System User token; Wiro-owned OAuth deferred until Advanced Access | [Meta Ads Skills](/docs/integration-metaads-skills) |
| Shopify | Expiring offline OAuth + refresh token, or same-org client credentials (`expires_in: 86399`) | [Shopify Skills](/docs/integration-shopify-skills) |
| Reddit | Unavailable pending Reddit Data API approval and Wiro's written commercial contract | [Reddit Skills](/docs/integration-reddit-skills) |
| Facebook Page | System User token (recommended) + Own OAuth (advanced); Wiro mode coming soon | [Facebook Page Skills](/docs/integration-facebook-skills) |
| Instagram | System User token (recommended) + Own Instagram OAuth (advanced); Wiro mode coming soon | [Instagram Skills](/docs/integration-instagram-skills) |
| LinkedIn | Own only (Wiro mode coming soon) | [LinkedIn Skills](/docs/integration-linkedin-skills) |
| Twitter / X | Wiro + Own | [Twitter Skills](/docs/integration-twitter-skills) |
| TikTok | Wiro + Own | [TikTok Skills](/docs/integration-tiktok-skills) |
| Google Ads | Wiro + Own | [Google Ads Skills](/docs/integration-googleads-skills) |
| YouTube | Wiro + Own | [YouTube Skills](/docs/integration-youtube-skills) (shares Google OAuth client with Google Ads) |
| Google Analytics 4 | Wiro + Own | [Google Analytics 4 Skills](/docs/integration-ga4-skills) (shares Google OAuth client with Google Ads) |
| Merchant Center | Wiro + Own | [Merchant Center Skills](/docs/integration-merchantcenter-skills) (shares Google OAuth client with Google Ads) |
| HubSpot | Wiro + Own | [HubSpot Skills](/docs/integration-hubspot-skills) |
| Mailchimp | Wiro + Own + API Key | [Mailchimp Skills](/docs/integration-mailchimp-skills) |

> **Google OAuth is shared across 4 APIs.** Google Ads, YouTube, Google Analytics 4, and Merchant Center are all authorized through a single Wiro OAuth client in "wiro" mode — one Google Cloud project, one OAuth 2.0 Client ID, multiple API scopes. In "own" mode you may reuse one of your own OAuth clients the same way, or set up separate ones per product.

### Service Account Integrations

| Integration | Setup Guide |
|-------------|-------------|
| Google Drive | [Google Drive Skills](/docs/integration-googledrive-skills) |
| Google Calendar | [Google Calendar Skills](/docs/integration-google-calendar-skills) |
| Google Play | [Google Play Skills](/docs/integration-googleplay-skills) |

> **Meta Platforms availability:** Meta Ads, Facebook Pages, and Instagram all
> offer customer-owned Business Manager System User connections now. Meta Ads
> and Facebook Pages also offer customer-owned Facebook OAuth; Instagram offers
> customer-owned Instagram Login OAuth. Their Wiro-shared OAuth modes remain
> pending provider review.

### API Key Integrations

| Integration | Setup Guide |
|-------------|-------------|
| Gmail | [Gmail Skills](/docs/integration-gmail-skills) |
| Telegram | [Telegram Skills](/docs/integration-telegram-skills) |
| Firebase | [Firebase Skills](/docs/integration-firebase-skills) |
| WordPress | [WordPress Skills](/docs/integration-wordpress-skills) |
| Shopify (same-organization client ID + secret) | [Shopify Skills](/docs/integration-shopify-skills) |
| WooCommerce | [WooCommerce Skills](/docs/integration-woocommerce-skills) |
| Meta Ads (System User token) | [Meta Ads Skills](/docs/integration-metaads-skills) |
| Facebook Pages (System User token) | [Facebook Page Skills](/docs/integration-facebook-skills) |
| Instagram (System User token) | [Instagram Skills](/docs/integration-instagram-skills) |
| App Store Connect | [App Store Skills](/docs/integration-appstore-skills) |
| Apollo | [Apollo Skills](/docs/integration-apollo-skills) |
| Lemlist | [Lemlist Skills](/docs/integration-lemlist-skills) |
| Brevo | [Brevo Skills](/docs/integration-brevo-skills) |
| SendGrid | [SendGrid Skills](/docs/integration-sendgrid-skills) |
| Twilio Voice | [Twilio Voice](/docs/integration-twiliovoice-skills) |
| Wiro AI Models | See [Using Wiro AI Models from Your Agent](/docs/agent-skills#using-wiro-ai-models-from-your-agent) |
| Calendarific | See [Calendarific in your agent](#calendarific-in-your-agent) |

## Wiro AI Models & Calendarific (User-Provided)

Two integrations are **user-input credentials** that ship in agent templates but require you (or your end users) to supply the key before the skill runs. They appear in `POST /UserAgent/Detail` `credentials[]` and accept writes via `POST /UserAgent/CredentialUpsert` like any other API-key integration.

### Wiro AI Models — `wiro` credential

The `int-wiro-aimodels` skill lets an agent call Wiro's own AI models (image / video / audio / LLM generation, cover image creation, model discovery) using **your own Wiro project API key**. Each generated asset is billed to that project's wallet.

- **Credential key:** `wiro`
- **Field:** `apikey` (single field — type `custom:wiro-project-picker` in the registry; the dashboard renders it as a project picker, the API expects the project's raw API key string).
- **No secret to supply.** Only the `apikey` is needed. Request signing for the agent's internal Wiro calls is handled automatically — Wiro derives the project's signing secret server-side from the key you pick, so there is no `apisecret` (or similar) field to paste.
- **Setup:** create / pick a Wiro project at [wiro.ai/panel/projects](https://wiro.ai/panel/projects), copy its API key, then upsert it:

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/CredentialUpsert" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "fields": [
      { "credentialkey": "wiro", "fieldname": "apikey", "fieldvalue": "wp_xxx_your_wiro_project_api_key" }
    ]
  }'
```

> **Don't confuse `credentials.wiro.apikey` with your operator-level Wiro API key.** `credentials.wiro.apikey` is the per-agent project key the agent container uses to call Wiro models internally (gets exported as `WIRO_API_KEY` env var inside the container). The `x-api-key` header you send to Wiro endpoints from your own backend is your operator key — entirely separate (see [Authentication](/docs/authentication)).

Most Wiro-provided agent templates (Social Manager, Blog Content, Push, App Event, Meta Ads, Google Ads) ship with `int-wiro-aimodels: true` enabled — but the agent stays in `status: 6` (Setup Required) until the operator supplies a `wiro` project key.

### Calendarific in your agent

The `int-calendarific` skill discovers global holidays and observances across 230+ countries via the [Calendarific](https://calendarific.com/) API. The free tier (1,000 calls/month) covers most agent use cases.

- **Credential key:** `calendarific`
- **Field:** `apikey` (`type: "password"` — encrypted at rest)
- **Setup:**

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/CredentialUpsert" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "fields": [
      { "credentialkey": "calendarific", "fieldname": "apikey", "fieldvalue": "your_calendarific_api_key" }
    ]
  }'
```

Templates that scan global holidays (App Event Manager, Push Notification Manager, Meta Ads, Google Ads) ship with `int-calendarific: true`. As with Wiro AI Models, the agent stays in `status: 6` until a key is provided.

## Platform-Managed Credentials

One credential is fully **managed by Wiro** — you don't provide it, you can't see it in API responses, and attempts to set it via `POST /UserAgent/CredentialUpsert` are rejected (the server only accepts fields with `fieldstatus: "user"` from API callers):

- **OpenAI** (`sys-openai`) — Wiro provides the OpenAI API key for every agent. The same model line-up (default + fallback + cron) is shared across all Wiro agents and rotated by the Wiro team. Operators cannot edit these values.

The `sys-openai` credential is stored with every field flagged `platform_managed: true` in the registry. `POST /UserAgent/Detail` omits the entire credential entry from the `credentials` response, and `POST /Credentials/List` does not return it for non-admin callers.

## Auditing Credential Changes — `CredentialFieldHistory`

Every credential field write is appended to a versioned history. Use `POST /UserAgent/CredentialFieldHistory` to read it — same idea as `CustomSkillHistory` for skills.

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/CredentialFieldHistory" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
    "credentialkey": "instagram"
  }'
```

##### Response

```json
{
  "result": true,
  "errors": [],
  "entries": [
    {
      "guid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
      "useragentguid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "credentialkey": "instagram",
      "fieldname": "igusername",
      "fieldvalue": "myaccount",
      "fieldstatus": "user",
      "parentfield": null,
      "ordinal": 0,
      "operation": "upsert",
      "changedby": "ada-uuid",
      "changedby_user": {
        "uuid": "ada-uuid",
        "firstname": "Ada",
        "lastname": "Lovelace",
        "email": "ada@example.com",
        "username": "ada",
        "avatar": "https://cdn.wiro.ai/avatars/ada.webp",
        "avatarinitials": "AL"
      },
      "changedat": 1714694410
    },
    {
      "guid": "b2c3d4e5-f6a7-8901-bcde-f23456789012",
      "useragentguid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "credentialkey": "instagram",
      "fieldname": "clientsecret",
      "fieldvalue": "[REDACTED]",
      "fieldstatus": "oauth_app",
      "parentfield": null,
      "ordinal": 0,
      "operation": "upsert",
      "changedby": "ada-uuid",
      "changedby_user": {
        "uuid": "ada-uuid",
        "firstname": "Ada",
        "lastname": "Lovelace",
        "email": "ada@example.com",
        "username": "ada",
        "avatar": "https://cdn.wiro.ai/avatars/ada.webp",
        "avatarinitials": "AL"
      },
      "changedat": 1714600000
    }
  ]
}
```

`changedby_user` is the resolved actor object (`uuid`, `firstname`, `lastname`, `email`, `username`, `avatar`, `avatarinitials`). It is `null` when `changedby` is a sentinel like `"system"` / `"backfill-*"` (cron / migration writes) or when the user record has been deleted.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Your UserAgent instance guid |
| `credentialkey` | string | Yes | Provider key (e.g. `"instagram"`, `"wordpress"`) |
| `startdate` | number | No | UTC epoch seconds — return entries on/after this time |
| `enddate` | number | No | UTC epoch seconds — return entries on/before this time |

> **Sensitive values are redacted in history.** `oauth_session` rows (access/refresh tokens) **never** appear in history at all (they're stripped before persisting). `clientsecret` is stored as `[REDACTED]` in history rows; the live row carries the real secret. Use `POST /UserAgent/Detail` to read the current live values; `CredentialFieldHistory` only shows the audit trail.

## Setting API Key Credentials

Use `POST /UserAgent/CredentialUpsert` with a flat `fields[]` array. Each field row carries `{credentialkey, fieldname, fieldvalue}`. Each integration page documents the exact field names and shape.

### Bulk upsert pattern

`/UserAgent/CredentialUpsert` takes an array of field rows in one request. Only the fields you send are written; other credential groups and other fields inside the same group are untouched. The Wiro Dashboard follows this pattern exactly — each credential card sends a single `CredentialUpsert` call with its group's fields.

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/CredentialUpsert" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "fields": [
      { "credentialkey": "gmail", "fieldname": "account",     "fieldvalue": "agent@company.com" },
      { "credentialkey": "gmail", "fieldname": "apppassword", "fieldvalue": "xxxx xxxx xxxx xxxx" }
    ]
  }'
```

Response: `{ "result": true, "applied": 2, "errors": [] }`. `applied` is the count of fields actually written; rows that fail validation (reserved fieldname prefixed with `_`, invalid `fieldstatus` for the caller's role) are skipped and listed in `errors` without rolling back the others. If the agent was running, it is automatically restarted to apply the new values.

### Field-level write rules

- **Only `fieldstatus: "user"` fields may be written by API callers.** The template marks OAuth app keys (`oauth_app`), OAuth tokens (`oauth_session`), OAuth picker selections (`oauth_picker`), and platform-managed values (`platform`) with non-user statuses — the API rejects attempts to write them directly with `agent-fieldstatus-not-allowed-for-role`. OAuth-managed values are written by Wiro's OAuth callback flow, not by your API.
- **Reserved fieldnames are rejected.** Any `fieldname` starting with `_` (e.g. `_isoptional`, `_isextra`) is a sentinel used by the template itself and cannot be set by API callers.
- Standard integration credential groups must be declared by the agent template. Communication-channel credentials are the exception: every useragent may create the channel groups published in `POST /Skills/List` → `channels[]`, using `CredentialUpsert` or inline Deploy credentials.
- **Nested arrays** (`firebase.accounts[].apps[]`, `google-drive.folders[]`, `apple-appstore.apps[]`, etc.) are supported via the optional `parentfield` (dotted path) and `ordinal` (array index) on each field row. Send the complete desired list — positional merge applies: indices you don't send are kept from the previous state, unless you explicitly send an empty set to clear them.
- Use `POST /UserAgent/Detail` to inspect which fields each credential exposes, and the `_connected` / `optional` / `extra` flags that describe its readiness state.

### Prepaid deploy — inline setup supported (with limitations)

If you call `POST /UserAgent/Deploy` with `useprepaid: true`, you may pass `credentials`, `customskills` (or the equivalent key `customskills`), and `skills` at the **top level of the Deploy body**. The server applies them to the normalized child tables in the same call (one-shot deploy + initial setup).

**Deploy body `credentials` rules:**

- Values are validated against each credential's public registry schema.
- Registry-declared `string-array` and `object-array` fields are accepted as native JSON arrays. This includes channel allowlists (`allowedusers`, Telegram `groups`, Slack `channels`, Discord `guilds`).
- Fieldnames starting with `_` are reserved and ignored.
- All caller-supplied fields use the normal user-writable classification. OAuth session tokens and platform-managed settings cannot be injected through Deploy.
- If `credentials` includes a communication-channel group, all of that channel's `required_fields` must be present. A missing or invalid activation credential fails Deploy instead of creating a partially configured channel.

**Deploy body `customskills` semantics:**

- Each entry must have a `key`. Server reads `value`, `interval`, `enabled`, `description`, and treats `_user_created: true` as an explicit user-created cron (auto-prefixing the key with `cron-` if missing).
- The request body accepts a single top-level `customskills` array; server-side values are merged onto any existing preset rows for the same key.

If you skip these keys in Deploy entirely, the instance is created empty and you set credentials/skills later with `CredentialUpsert`, `CustomSkillUpsert`, and `SkillsApply`.

## OAuth Authorization Flow

For services that require user authorization, Wiro implements a full OAuth redirect flow. The entire process is **fully white-label** — your end users interact only with your app and the provider's consent screen. They never see or visit wiro.ai.

> The `redirecturl` you pass to Connect is **your own URL**. After authorization, users are redirected back to your app with status query parameters. HTTPS is required; `http://localhost` and `http://127.0.0.1` are allowed for development only.

### Generic flow

```
Your App (Frontend)           Your Backend              Wiro API              Provider
       |                            |                       |                      |
  (1)  | "Connect X" click          |                       |                      |
       |--------------------------->|                       |                      |
  (2)  |                            |  POST /{P}Connect --> |                      |
       |                            |  { useragentguid,     |                      |
       |                            |    redirecturl,       |                      |
       |                            |    authmethod }       |                      |
  (3)  |                            |<-- { authorizeUrl }   |                      |
  (4)  |<--- redirect to authorizeUrl -------------------------------------------->|
  (5)  |                            |                       |<-- User clicks Allow |
  (6)  |                            |  (invisible callback) |                      |
       |                            |  Wiro exchanges code  |<---------------------|
       |                            |  for tokens, saves    |                      |
  (7)  |<------- 302 to YOUR redirecturl --------------------------------------->  |
       |        ?{provider}_connected=true&...                                     |
```

### Auth Methods — `"wiro"` vs `"own"`

|  | `"wiro"` | `"own"` |
|--|---------|---------|
| **OAuth app credentials** | Wiro's pre-configured app | Your own app on the provider's developer portal |
| **Setup required** | None — just call Connect | Create app on provider, save credentials via Update, register Wiro's callback URL |
| **Consent screen branding** | Shows "Wiro" as the app name | Shows **your app name** |
| **Redirect after auth** | To your `redirecturl` | To your `redirecturl` |
| **User sees wiro.ai?** | No | No |
| **Token management** | Automatic by Wiro | Automatic by Wiro |
| **Best for** | Quick setup when available | Custom branding or bypassing review processes |

### Own Mode = 2-Step API Flow

Own mode requires two sequential calls before initiating OAuth:

```bash
# Step 1: Save your provider app credentials + authmethod via CredentialUpsert
#
# NOTE: `clientid` / `clientsecret` are normally fieldstatus="oauth_app" in the
# template — and the API rejects user-role writes to them. Credentials that
# support own mode expose customer app fields as user-writable. If your API
# key gets `agent-fieldstatus-not-allowed-for-role`, inspect
# `POST /Credentials/Detail` and use one of that credential's declared
# `connection_modes`.

curl -X POST "https://api.wiro.ai/v1/UserAgent/CredentialUpsert" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "fields": [
      { "credentialkey": "twitter", "fieldname": "clientid",     "fieldvalue": "YOUR_CLIENT_ID" },
      { "credentialkey": "twitter", "fieldname": "clientsecret", "fieldvalue": "YOUR_CLIENT_SECRET" },
      { "credentialkey": "twitter", "fieldname": "authmethod",   "fieldvalue": "own" }
    ]
  }'

# Step 2: Initiate OAuth
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/OAuthConnect" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "credentialkey": "twitter",
    "redirecturl": "https://your-app.com/callback",
    "authmethod": "own"
  }'
```

For credentials whose `connection_modes` includes an enabled `"wiro"` mode, you can skip Step 1 and call Step 2 with `authmethod: "wiro"`. Omitting `authmethod` uses that credential's registry default. For Meta Ads, always send `"own"` or `"api_key"` while its default `"wiro"` mode is pending; Shopify and Reddit use `"own"`.

### Callback URL pattern (own mode)

Register this URL in your OAuth app settings on the provider's developer portal:

```
https://api.wiro.ai/v1/UserAgentOAuth/{Provider}Callback
```

Provider-specific paths: `XCallback`, `TikTokCallback`, `IGCallback`, `FBCallback`, `LICallback`, `GAdsCallback`, `MetaAdsCallback`, `MCCallback`, `YTCallback`, `GA4Callback`, `HubSpotCallback`, `MailchimpCallback`, `ShopifyCallback`, `RedditCallback`.

### Callback success & error parameters

| Provider | Success Params | Error Param |
|----------|---------------|-------------|
| Twitter / X | `x_connected=true&x_username=...` | `x_error=...` (+ `x_error_detail=...`) |
| TikTok | `tiktok_connected=true&tiktok_username=...` | `tiktok_error=...` (+ `tiktok_error_detail=...`) |
| Instagram | `ig_connected=true&ig_username=...` | `ig_error=...` (+ `ig_error_detail=...`) |
| Facebook Pages | `fb_connected=true&fb_pages=[...]` | `fb_error=...` (+ `fb_error_detail=...`) |
| LinkedIn | `li_connected=true&li_name=...` | `li_error=...` (+ `li_error_detail=...`) |
| Google Ads | `gads_connected=true&gads_accounts=[...]` | `gads_error=...` (+ `gads_error_detail=...`) |
| Meta Ads | `metaads_connected=true&metaads_accounts=[...]` | `metaads_error=...` (+ `metaads_error_detail=...`) |
| Merchant Center | `mc_connected=true&mc_accounts=[...]` | `mc_error=...` (+ `mc_error_detail=...`) |
| YouTube | `yt_connected=true&yt_channels=[...]` | `yt_error=...` (+ `yt_error_detail=...`) |
| GA4 | `ga4_connected=true&ga4_properties=[...]` | `ga4_error=...` (+ `ga4_error_detail=...`) |
| HubSpot | `hubspot_connected=true&hubspot_portal=...&hubspot_name=...` | `hubspot_error=...` (+ `hubspot_error_detail=...`) |
| Mailchimp | `mailchimp_connected=true&mailchimp_account=...` | `mailchimp_error=...` (+ `mailchimp_error_detail=...`) |
| Shopify | `shopify_connected=true&shopify_shop=...&shopify_name=...` | `shopify_error=...` (+ `shopify_error_detail=...`) |
| Reddit | `reddit_connected=true&reddit_username=...` | `reddit_error=...` (+ `reddit_error_detail=...`) |

> **Conditional params:** `gads_accounts`, `mc_accounts`, `yt_channels`, `ga4_properties`, and `metaads_accounts` are omitted from the redirect when the provider returns zero items (for example, no accessible Google Ads customers, or a developer token is missing in Wiro mode). `fb_pages` is always present on success — Facebook returns `fb_error=no_pages` instead when the user has no administered Pages.

Common error codes across providers:

| Code | Meaning |
|------|---------|
| `missing_params` | Callback hit without `state` or `code`. |
| `authorization_denied` | User cancelled, or (Meta Dev Mode) not in App Roles. |
| `session_expired` | 15-minute OAuth state cache expired. |
| `token_exchange_failed` | Wrong Client/App Secret or redirect URI mismatch. |
| `useragent_not_found` | Invalid or unauthorized `useragentguid`. |
| `<Provider> credentials not configured` | Agent's `credentials.<provider>` block is empty (typically `authmethod: "own"` but `clientid` / `clientsecret` missing). Returned in `errors[]` of `OAuthConnect` itself, not as a redirect-URL `*_error` code. Fix with `POST /UserAgent/CredentialUpsert`. |
| `internal_error` | Unexpected server error. |

Provider-specific codes:

| Code | Provider | Meaning |
|------|----------|---------|
| `no_pages` | Facebook | OAuth succeeded but the user administers no Pages. |
| `template_not_found` | Google Ads (Wiro mode) | Wiro's shared template doesn't have `googleads` credentials; switch to own mode. |

> The `useragent_not_found` error value (snake_case) appears in redirect URLs. The same condition surfaces as `"User agent not found or unauthorized"` in JSON responses from Connect/Disconnect endpoints.

## Generic OAuth Endpoints

All OAuth integrations share five unified endpoints. The provider is selected via a `credentialkey` body parameter (e.g. `"google-ads"`, `"twitter"`, `"facebook-pages"`):

| Endpoint | Purpose |
|----------|---------|
| `POST /UserAgentOAuth/OAuthConnect` | Start OAuth and return an authorize URL, or run a registry-declared direct credential probe and return discovered accounts. |
| `POST /UserAgentOAuth/OAuthStatus` | Check whether a provider is connected and which accounts are selected. |
| `POST /UserAgentOAuth/OAuthDisconnect` | Clear stored credentials + tokens. |
| `POST /UserAgentOAuth/DiscoverPickerItems` | Discover grouped child resources for a registry-declared chained picker after its parent accounts are selected. |
| `POST /UserAgentOAuth/SetPickerAccounts` | Save the user's account selection after OAuth or direct discovery. |

> Each provider's own callback URL — `XCallback`, `IGCallback`, `GAdsCallback`, etc. — is still per-provider because external OAuth platforms redirect to fixed URLs. Only the five endpoints above are unified.

> Discover the full list via [`POST /Credentials/List`](#post-credentialslist). Any entry with a non-null `oauth_provider` can use these endpoints; hybrid credentials may offer OAuth and a direct probe. The `oauth_provider` block declares exact endpoint paths, supported direct mode, and picker contract.

### POST /UserAgentOAuth/OAuthConnect

For OAuth mode, Wiro generates the provider authorize URL and a state token.
Your frontend redirects the user to `authorizeUrl`; after consent, the provider
returns to Wiro's registry-declared callback and Wiro redirects the browser to
your `redirecturl`. For direct modes such as Meta Ads, Facebook Pages, or
Instagram System User tokens and Shopify client credentials, this endpoint
validates or exchanges the already-saved credential server-side and returns
without a browser redirect.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Agent instance GUID. |
| `credentialkey` | string | Yes | Credential key with an `oauth_provider` block (for example `"google-ads"`, `"twitter"`, `"meta-ads"`, `"facebook-pages"`, `"instagram"`, or `"shopify"`). |
| `redirecturl` | string | OAuth only | Your URL after OAuth completes (HTTPS, or `http://localhost`/`http://127.0.0.1` in development). Direct probes do not use it. |
| `authmethod` | string | No | One value from the credential's `connection_modes`, such as `"wiro"`, `"own"`, or `"api_key"`. Omission uses `oauth_provider.auth_method_value`. |

##### Response

```json
{
  "result": true,
  "errors": [],
  "authorizeUrl": "https://accounts.google.com/o/oauth2/v2/auth?client_id=...&redirect_uri=...&scope=...&response_type=code&state=..."
}
```

Direct probes return `{ "result": true, "accounts": [{ "id": "...", "name": "..." }], "errors": [] }` and do not include `authorizeUrl`.

##### Common errors

| Error message | Cause |
|---------------|-------|
| `Unknown OAuth credential: <key>` | `credentialkey` not in registry, or not OAuth-enabled. |
| `Credential is not configured for the generic OAuth dispatcher: <key>` | Registry entry is partial — missing `oauth_flow` config. |
| `Invalid redirect URL` | `redirecturl` is not HTTPS (and not localhost). |
| `<Provider> credentials not configured` | `authmethod: "own"` but `clientid`/`clientsecret` not saved yet. |
| Direct credential validation message | The saved direct credential fields failed the registry-declared exchange/probe, or no required account was assigned. |
| `User agent not found or unauthorized` | `useragentguid` doesn't exist or doesn't belong to the caller. |

### POST /UserAgentOAuth/OAuthStatus

Returns whether the credential is connected and lists every account/property/page selected via the picker. Use this to render an "Already connected — N accounts selected" UI.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Agent instance GUID. |
| `credentialkey` | string | Yes | OAuth credential key. |

##### Response

```json
{
  "result": true,
  "errors": [],
  "connected": true,
  "accounts": [
    { "id": "1234567890", "name": "Acme Corp" },
    { "id": "0987654321", "name": "Acme Subsidiary" }
  ],
  "connectedat": "2026-05-25T12:00:00Z",
  "tokenexpiresat": "2026-05-25T13:00:00Z"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `connected` | `boolean` | `true` when the active mode has a validated secret and every required picker field is populated. |
| `accounts` | `array<{id, name}>` | The accounts/pages/properties the user selected. Empty `[]` when nothing is selected (or the credential has no picker step — e.g. Twitter/X, TikTok, HubSpot — which expose a 1-element array carrying the connected user's identifier). |
| `connectedat` | `string` | ISO timestamp of the last successful Connect / token refresh. |
| `tokenexpiresat` | `string` | ISO timestamp when the current access token expires. Empty for providers without a fixed expiry (e.g. Mailchimp). |

> **Multi-account picker fields are JSON arrays.** Picker fields like
> `customerid` (Google Ads), `adaccountid` (Meta Ads), `merchantid` (Merchant
> Center), `channelid` (YouTube), `propertyid` (GA4), `pageid` (Facebook
> Pages), and direct Instagram's `accountId` are stored as JSON arrays when
> `account_picker.multi_select === true`. Instagram Login OAuth also stores its
> single authorized account as a one-entry array.

### POST /UserAgentOAuth/DiscoverPickerItems

Discover child resources for a chained picker after the root
`SetPickerAccounts` selection has been saved. The current chained flow is Meta
Ads: selected ad accounts are the parents and eligible Facebook Pages are
returned under each account. Wiro reads the active credential server-side;
clients never send or receive access tokens.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Agent instance GUID. |
| `credentialkey` | string | Yes | Credential key with `account_picker.next` configured. Currently `"meta-ads"`. |
| `pickerkey` | string | Yes | The chained picker key from the registry. Meta Ads uses `"pages"`. |

##### Example — discover Meta Ads Pages

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/DiscoverPickerItems" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "credentialkey": "meta-ads",
    "pickerkey": "pages"
  }'
```

##### Response

```json
{
  "result": true,
  "errors": [],
  "pickerkey": "pages",
  "groups": [
    {
      "parent": {
        "adaccountid": "123456789",
        "adaccountname": "Acme Ads"
      },
      "items": [
        { "pageid": "111222333", "pagename": "Acme" }
      ]
    }
  ]
}
```

Each group corresponds to one selected parent account. A group may carry
`errorcode` and an empty `items` array when discovery failed safely for that
parent. Successful candidates are cached for the registry-declared selection
window (five minutes for Meta Ads). Call `SetPickerAccounts` with `pickerkey`
and one `selections[]` entry for every successful parent before that window
expires.

### POST /UserAgentOAuth/SetPickerAccounts

Save either the root account selection after an OAuth callback/direct discovery,
or a chained child-resource selection after `DiscoverPickerItems`. The endpoint
accepts entries from the provider's public account list; clients never supply
access tokens.

The registry declares each provider's picker shape. Multi-select pickers
(Google Ads, Meta Ads, Merchant Center, YouTube, GA4, Facebook Pages, and direct
Instagram) accept one or more entries.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Agent instance GUID. |
| `credentialkey` | string | Yes | Credential key with an `account_picker` defined. |
| `accounts` | array | Root picker only | One or more account objects. Each object must carry the per-credential `item_fields_to_save` keys (see table below). |
| `pickerkey` | string | Chained picker only | Chained picker key returned by `DiscoverPickerItems`. |
| `selections` | array | Chained picker only | One `{ parentvalue, items }` entry for every successfully discovered parent. `items` may be empty when the chained picker is optional. |

##### Per-credential `accounts[]` shape

| Credential | Required keys per entry | Notes |
|------------|------------------------|-------|
| `google-ads` | `customerid`, `customerdescriptivename` | `customerid` is 10 digits; dashes/letters stripped server-side. |
| `meta-ads` | `adaccountid`, `adaccountname` | `act_` prefix stripped server-side. |
| `google-merchant-center` | `merchantid`, `accountname` | |
| `youtube` | `channelid`, `channeltitle` | |
| `ga4` | `propertyid`, `propertydisplayname` | |
| `facebook-pages` | `pageid`, `fbpagename` | One or more Pages from the latest OAuth or System User discovery result. |
| `instagram` | `accountId`, `igusername` | One or more accounts from direct System User discovery. Customer-owned Instagram OAuth does not use this picker and writes one authorized account directly. |

##### Example — Google Ads multi-select

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/SetPickerAccounts" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "credentialkey": "google-ads",
    "accounts": [
      { "customerid": "1234567890", "customerdescriptivename": "Acme Corp" },
      { "customerid": "0987654321", "customerdescriptivename": "Acme Subsidiary" }
    ]
  }'
```

##### Response

```json
{
  "result": true,
  "errors": [],
  "accounts": [
    { "id": "1234567890", "name": "Acme Corp" },
    { "id": "0987654321", "name": "Acme Subsidiary" }
  ]
}
```

The agent restarts automatically if it was running.

##### Example — save Meta Ads Page mappings

Call this after `DiscoverPickerItems` and include every successful parent once:

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/SetPickerAccounts" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "credentialkey": "meta-ads",
    "pickerkey": "pages",
    "selections": [
      {
        "parentvalue": "123456789",
        "items": [
          { "pageid": "111222333", "pagename": "Acme" }
        ]
      }
    ]
  }'
```

The response includes `pickerkey: "pages"` and the persisted, flat
`pagemappings[]` list. Sending an empty `items` array skips Pages for that ad
account; Meta Ads reporting and other non-Page operations remain available.

##### Common errors

| Error message | Cause |
|---------------|-------|
| `accounts must be a non-empty array` | `accounts` missing or empty. |
| `Single-select picker requires exactly one account; got <N>` | Single-select credential received multiple entries. |
| `<Provider> account not connected` | Standard picker (e.g. Google Ads) called before the OAuth callback wrote tokens. |
| `No pending <Provider> connection. Please reconnect via OAuthConnect.` | Deferred-token picker (Facebook Pages or direct Instagram) — the 15-minute discovery window expired or is missing. |
| `Selected <field> not found in pending list: <value>` | Deferred-token picker — the selected ID is not in the latest server-side discovery result. |
| `Credential does not support account picker: <key>` | `credentialkey` doesn't have an `account_picker` (e.g. Twitter / TikTok / HubSpot). |
| `Picker candidates expired. Discover them again.` | Chained picker candidates expired or the parent connection changed. Call `DiscoverPickerItems` again. |
| `selections must include every available parent exactly once` | Chained picker request omitted or duplicated a successfully discovered parent. |

### POST /UserAgentOAuth/OAuthDisconnect

Clears the active connection's tokens, picker selections, and auto-filled
values. Customer-owned OAuth app credentials (`clientid`, `clientsecret`,
`appid`, `appsecret`) are preserved for reconnection. An alternative API-key
field is preserved while disconnecting OAuth, but disconnecting that direct
mode itself clears its secret — including Meta `systemusertoken`. The agent
restarts automatically if it was running.

For providers that publish a token-revocation endpoint (currently Twitter/X and TikTok), Wiro also calls the provider's revoke endpoint as a non-critical best-effort step. Other providers only clear local credentials; the token remains valid on the provider side until it expires.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Agent instance GUID. |
| `credentialkey` | string | Yes | OAuth credential key. |

##### Response

```json
{
  "result": true,
  "errors": []
}
```

### Token lifecycle

Wiro maintains renewable provider connections automatically while the agent is
running. Direct Meta System User connections have no generic refresh contract:
regenerate and reconnect an expiring or invalidated token. There is no
customer-facing token-refresh endpoint or manual refresh action.

Use `POST /UserAgentOAuth/OAuthStatus` to monitor the connection. If it reports `connected: false`, or the provider revokes a connection that cannot be renewed, reconnect through `POST /UserAgentOAuth/OAuthConnect`. Provider-specific exceptions are documented in each integration guide.

## Web UI Behaviors (Wiro Dashboard)

If you're comparing against the Wiro Dashboard, here's what happens under the hood for parity with the API:

- **Per-group save**: Each credential card has its own Save button. Saving a card calls `POST /UserAgent/CredentialUpsert` with only that group's `fields[]` (one request per card).
- **Own mode 2-step**: When a user clicks "Connect" in own mode, the Dashboard first calls `CredentialUpsert` to save `appid`/`appsecret` + `authmethod: "own"`, then calls the Connect endpoint with `authmethod: "own"`. API users must make both calls explicitly.
- **Recommended Meta direct mode**: Facebook Pages, Instagram, and Meta Ads
  default to System User Token. The Dashboard saves `authmethod: "api_key"` and
  `systemusertoken`, calls `OAuthConnect`, then completes the registry picker
  without exposing provider tokens to browser state.
- **Full-page redirect, not popup**: `window.location.href = authorizeUrl` — no popup windows (avoids third-party cookie issues).
- **No manual token refresh button**: Wiro maintains supported connections automatically; reconnect when the Dashboard reports that authorization is required.
- **LLM Markdown feature**: The Dashboard includes an "LLM Markdown" tab that generates a ready-to-paste prompt for AI assistants summarizing every credential field the agent needs. Useful for API users building their own configuration UIs — see the per-integration help texts for equivalent guidance.
- **Registry-backed validation**: Wiro validates declared types, patterns, lengths, URLs, enum values, and provider response contracts before persisting or connecting credentials. The provider remains authoritative for permissions and asset access.
- **Platform-managed credentials are hidden**: Groups whose fields are all flagged `platform_managed: true` (currently only `sys-openai`) are omitted from `POST /UserAgent/Detail` responses entirely. They're pre-configured by Wiro and can't be set by customers.

## Setup Required State

If an agent has required credentials not yet filled in, it's in **Setup Required** state (`status: 6`). It can't be started until credentials are complete.

**Every fresh deploy lands at `status: 6` first.** API deploys must always pass `useprepaid: true` — the server provisions the prepaid subscription inline and auto-queues the row to `status: 2` (Queued). No manual `Start` call is needed unless you also need to fill credentials first; if so, Start will reject with the Setup-Required guard until the required credentials are in place.

`setuprequired` flag in `UserAgent/Detail` / `UserAgent/MyAgents` is `true` when any non-optional credential is still incomplete. The server treats a credential as complete when either:

- **OAuth and hybrid connection credentials** — `_connected: true` (the active
  mode has a validated runtime token **and** every required picker field is
  populated), or
- **API-key credentials** — at least one field with `fieldstatus: "user"` has a non-empty value (any one user-writable field filled in makes the credential count as "entered"; there is no deeper per-field validation).

The two branches are checked together: `setuprequired` stays `true` until every required credential passes one of them.

## Security

- **Tokens are stored server-side** and are never returned by the customer-facing credential endpoints.
- **`oauth_session` fields are always stripped** from Status, Detail, `MyAgents`, and `CredentialUpsert` responses — `accesstoken`, `refreshtoken`, `tokenexpiresat`, `pageAccessToken` and any similar rows never leave the server.
- **`platform` fields are stripped for `user` role callers** (default for API keys without ADMIN scope). In practice this currently affects only the `sys-openai` credential — its key never leaves the server. `credentials.wiro.apikey` and `credentials.calendarific.apikey` are user-supplied and appear normally in the response.
- **`oauth_app` fields (`clientsecret`, `appsecret`) are visible in Detail responses** after an admin / OAuth "own mode" setup writes them. If you build a customer-facing UI on top of this API, treat them as admin-only in your own layer. The append-only credential history redacts `clientsecret` to `[REDACTED]` and always redacts `oauth_session` rows; only the live row can be read.
- **`fieldstatus` enforces least-privilege writes.** API callers only hold `user` role — they cannot write `oauth_app`, `oauth_session`, `oauth_picker`, `platform`, `computed`, or `control` fields. Attempts to do so return `agent-fieldstatus-not-allowed-for-role` in the `errors[]` array without altering data.
- The `redirecturl` receives only connection status parameters — no tokens, no secrets.
- OAuth state parameters use a 15-minute TTL cache to prevent replay attacks.
- Redirect URLs must be HTTPS (or localhost/127.0.0.1 for development).
- Facebook Page and direct Instagram discovery results remain server-side for
  15 minutes while the user selects accounts. Clients receive only public
  `{id, name}` pairs; System User and Page access tokens never leave the server.

## For Third-Party Developers

If you're building a product on top of Wiro agents and need your customers to connect their own accounts:

1. **Deploy** an agent instance per customer via `POST /UserAgent/Deploy`.
2. **Connect** — save the chosen mode's fields, then call
   `POST /UserAgentOAuth/OAuthConnect`.
3. **OAuth branch** — when `authorizeUrl` is returned, redirect the customer's
   browser, let the provider authorize, and handle the callback parameters.
4. **Direct branch** — when `accounts` is returned, render the public account
   list directly; there is no browser redirect.
5. **Finalize** — for picker credentials (Meta Ads, Facebook Pages, direct
   Instagram, Google Ads, Merchant Center, YouTube, GA4), call
   `POST /UserAgentOAuth/SetPickerAccounts` with the selected public entries.
6. **Verify** — call `POST /UserAgentOAuth/OAuthStatus`.

Each integration page includes a **Multi-Tenant Architecture** section covering per-provider rate limits, token isolation, and white-label consent screen configuration.

### Handling the OAuth redirect in your app

```javascript
app.get('/settings/integrations', (req, res) => {
  if (req.query.x_connected === 'true') {
    return res.redirect(`/dashboard?connected=twitter&username=${req.query.x_username}`)
  }

  if (req.query.metaads_connected === 'true') {
    const accounts = JSON.parse(decodeURIComponent(req.query.metaads_accounts || '[]'))
    return res.redirect(`/dashboard/meta-ads?accounts=${encodeURIComponent(JSON.stringify(accounts))}`)
  }

  if (req.query.fb_connected === 'true') {
    const pages = JSON.parse(decodeURIComponent(req.query.fb_pages || '[]'))
    // Facebook always requires SetPickerAccounts to finalize
    return res.redirect(`/dashboard/facebook?pick=${encodeURIComponent(JSON.stringify(pages))}`)
  }

  if (req.query.gads_connected === 'true') {
    const customers = JSON.parse(decodeURIComponent(req.query.gads_accounts || '[]'))
    return res.redirect(`/dashboard/google-ads?pick=${encodeURIComponent(JSON.stringify(customers))}`)
  }

  const errKey = Object.keys(req.query).find((k) => k.endsWith('_error'))
  if (errKey) {
    return res.redirect(`/dashboard?error=${errKey}&reason=${req.query[errKey]}`)
  }

  res.redirect('/dashboard')
})
```

---

# Agent Skills

Configure agent behavior with editable preferences, scheduled automation tasks, and skill toggles. Browse the platform's skill registry and inspect every skill's pricing, capabilities, and credential requirements.

**Read & write paths at a glance:**

| Operation | Endpoint |
|-----------|----------|
| Browse all skills (registry) | [`POST /Skills/List`](#post-skillslist) (public) |
| Browse communication channels and their credential schemas | [`POST /Skills/List`](#post-skillslist) → `channels[]` (public) |
| Inspect a single skill | [`POST /Skills/Detail`](#post-skillsdetail) (public) |
| Find the credential a skill needs | [`POST /Skills/CredentialSchema`](#post-skillscredentialschema) (public) |
| List the closed-set capability vocabulary | [`POST /Skills/Capabilities`](#post-skillscapabilities) (public) |
| Edit a preference skill's `value` or a cron's `interval`/`enabled` | [`POST /UserAgent/CustomSkillUpsert`](/docs/agent-overview#post-useragentcustomskillupsert) |
| Rename a user-created custom skill (key + optional description) | [`POST /UserAgent/CustomSkillRename`](/docs/agent-overview#post-useragentcustomskillrename) |
| Delete a user-created cron skill | [`POST /UserAgent/CustomSkillDelete`](/docs/agent-overview#post-useragentcustomskilldelete) |
| Read version history of a custom skill | [`POST /UserAgent/CustomSkillHistory`](/docs/agent-overview#post-useragentcustomskillhistory) |
| Revert a custom skill to preset / a historical version | [`POST /UserAgent/CustomSkillRevert`](/docs/agent-overview#post-useragentcustomskillrevert) |
| Toggle one or more integration skills (the top-level `skills` array, e.g. `int-instagram-post`) on/off, with optional tier change | [`POST /UserAgent/SkillsApply`](/docs/agent-overview#post-useragentskillsapply) |
| Live tier-pricing preview for a hypothetical skill set | [`POST /UserAgent/PricingPreview`](/docs/agent-overview#post-useragentpricingpreview) |

> Read responses from `POST /UserAgent/Detail` expose the composed `customskills[]` array (preference skills + non-cron user-created skills), the `scheduledskills[]` array (cron skills), and the `skills[]` array as top-level fields on the useragent object. `skills[]` is an **object array** — each entry is `{ name, enabled, _edited?, _user_created? }` (e.g. `[{ "name": "int-instagram-post", "enabled": true }, { "name": "int-wiro-aimodels", "enabled": true }]`).

## Skill Registry vs Custom Skills

Two concepts share the word "skill" in the agent system. Keep them straight:

| Concept | What it is | Where it lives | API surface |
|---------|------------|----------------|-------------|
| **Registry skills** | Platform-shipped capabilities — Wiro defines them, they have pricing recipes, credential requirements, and runtime tools. Examples: `int-instagram-post`, `int-gmail-check`, `int-wordpress-post`, `int-wiro-aimodels`. | The skill registry (git-tracked JSON definitions). | `POST /Skills/List` / `POST /Skills/Detail` (read), `POST /UserAgent/SkillsApply` (toggle on/off per useragent). |
| **Custom skills** | User-editable preference text (`cs-content-tone`) or scheduled tasks (`cs-cron-blog-scanner`) that live ON a useragent. They reference registry skills (e.g. a cron skill calls into `int-wordpress-post`) but are scoped to one instance. | Per useragent on the Wiro platform. | `POST /UserAgent/CustomSkillUpsert` / `POST /UserAgent/CustomSkillRename` / `POST /UserAgent/CustomSkillDelete` / `POST /UserAgent/CustomSkillHistory` / `POST /UserAgent/CustomSkillRevert`. |

The rest of this page documents both — the registry endpoints first (so you can discover what's possible), then the per-useragent endpoints (so you can configure them).

## Skill Registry Endpoints

These four endpoints are **public — no authentication required**. They return data straight from the skill registry.

### **POST** /Skills/List

Lists all skills in the registry.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `category` | string | No | Filter by `"int"` (integration with a third-party service) or `"util"` (utility / rule-only — no credential, no external API). |
| `capability` | string | No | Filter by capability key (see [`POST /Skills/Capabilities`](#post-skillscapabilities) for the closed-set vocabulary). |
| `user_invocable` | boolean | No | When `true`, only return skills end users can call directly through chat (filters out plumbing skills wired by the runtime). |
| `requires_credentials` | boolean | No | Filter by whether the skill requires a credential. |
| `wiro_connect_pending` | boolean | No | Filter by the "Wiro mode coming soon" flag — integrations whose Wiro-shared OAuth client is still awaiting provider review (currently 9 user-facing credentials: `facebook-pages`, `instagram`, `google-ads`, `google-merchant-center`, `youtube`, `ga4`, `linkedin`, `tiktok`, and `meta-ads`). Facebook Pages, Instagram, and Meta Ads remain usable through their customer-owned System User and/or OAuth alternatives. When `true`, only pending skills are returned; when `false`, only ready-to-use skills. The flag is read off the credential, not the skill. |
| `name_in` | array<string> | No | Restrict the response to a specific list of skill names. |

##### Response

```json
{
  "result": true,
  "errors": [],
  "total": 45,
  "skills": [
    {
      "name": "int-instagram-post",
      "category": "int",
      "version": "1.0.0",
      "title": "Instagram Post",
      "description": "Post carousel feed and multi-story via Meta Graph API.",
      "icon": "/images/icons/skills/instagram.svg",
      "brand_color": "#e4405f",
      "brand_text_color": "#ffffff",
      "brand_logo_filter": "brightness(0) invert(1)",
      "docs_url": "integration-instagram-skills",
      "requires_credentials": true,
      "credential_key": "instagram",
      "capabilities": ["social_publishing"],
      "depends_on": [],
      "conflicts_with": [],
      "user_invocable": true,
      "deprecated": false,
      "replacement": null,
      "pricing": {
        "monthly_price_weight_usd": 1,
        "monthly_credits_weight": 25,
        "billing_model": "tokens"
      }
    }
  ],
  "channels": [
    {
      "id": "telegram",
      "plugin": "telegram",
      "credential_key": "telegram",
      "title": "Telegram",
      "required_fields": ["bottoken", "allowedusers"],
      "capabilities": {
        "direct": true,
        "rooms": true,
        "threads": true,
        "roles": false,
        "command_menu": true
      },
      "credential": {
        "key": "telegram",
        "credential_schema": ["..."]
      }
    }
  ]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Canonical skill key, **including the registry prefix** (`int-*` for integration skills, `util-*` for utility / rule-only skills). Use this exact value in `SkillsApply` and `Deploy.body.skills`. |
| `category` | `string` | `"int"` (third-party integration) or `"util"` (utility / rule-only — no credential, no external API). |
| `version` | `string` | Semver for the registry entry. Bumped when the skill's tool surface or pricing weights change. |
| `title` | `string` | Display name shown on chips / filters / cards. |
| `description` | `string` | One-line summary used on marketing surfaces. |
| `icon` | `string` | Path or URL to the brand icon (relative paths are absolutized to `https://wiro.ai/...` on the wire). |
| `brand_color` | `string\|null` | Brand background colour (hex) for chips and cards. |
| `brand_text_color` | `string\|null` | Foreground colour to render on top of `brand_color`. |
| `brand_logo_filter` | `string\|null` | CSS `filter` value applied to monochrome SVG icons (e.g. `"brightness(0) invert(1)"`) so the same source SVG renders correctly on light and dark brand colours. |
| `docs_url` | `string\|null` | Slug or path of the integration page on this docs site. Frontends prefix with `/docs/` when rendering. |
| `requires_credentials` | `boolean` | `true` when the skill needs a credential the operator must supply (effectively `true` whenever `credential_key` resolves to a non-platform-only credential — currently every credential except `sys-openai`). |
| `credential_key` | `string\|null` | The provider this skill needs (`"instagram"`, `"google-ads"`, `"wiro"`, `"calendarific"`, …). `null` for `util` skills (rule-only) and the rare skills backed by a platform-only credential like `sys-openai`. Use [`POST /Credentials/Detail`](/docs/agent-credentials#post-credentialsdetail) to inspect the schema. |
| `additional_credential_keys` | `array<string>` | **Optional — only present when the skill writes secondary credentials.** App-store / Google-Play review skills include `["var-support-email"]` for the support-email variable bag; most skills omit this field entirely. |
| `capabilities` | `array<string>` | High-level snake_case capability tags from the closed vocabulary returned by [`POST /Skills/Capabilities`](#post-skillscapabilities). Drives the "Find skills that can: ___" picker. |
| `depends_on` | `array<string>` | Other skill names that must be enabled. Wiro auto-enables transitive deps when you toggle the parent skill on. |
| `conflicts_with` | `array<string>` | Mutually-exclusive skill names. `SkillsApply` rejects toggle batches that would enable two conflicting skills. |
| `user_invocable` | `boolean` | `true` when end users can call the skill via chat. Most user-facing skills (including `int-wiro-aimodels` and `int-calendarific`) are `true`; `false` is reserved for plumbing skills wired by the runtime (currently none in the public catalog). |
| `deprecated` | `boolean` | `true` for skills slated for removal — `replacement` (if any) names the migration target. |
| `replacement` | `string\|null` | When `deprecated: true`, the registry-recommended successor skill name. |
| `pricing` | `object` | Per-skill pricing recipe (see below). |

`channels[]` is a separate, unfiltered catalog returned alongside `skills[]`.
Skill filters do not remove channel rows. Each channel includes its stable
`id`, `credential_key`, activation `required_fields`, UI-facing
`capabilities`, and the full registry `credential` descriptor. Use these values
to render channel setup. Save the matching credential group through
[`UserAgent/CredentialUpsert`](/docs/agent-overview#post-useragentcredentialupsert);
the channel activates automatically when every `required_fields` value is
complete. Channels are not skills and do not affect pricing.

**`pricing` object:**

| Sub-field | Type | Description |
|-----------|------|-------------|
| `monthly_price_weight_usd` | `number` | Weight (USD) the skill contributes to the agent's Starter monthly price. The resolver sums weights across the agent's enabled-skill closure (incl. transitive `depends_on`); Pro multiplies the total by `tiermultiplier`. The platform applies a **$4/month minimum floor** on top of this sum (with credits scaled proportionally) — see Pricing in the [Agent Overview](/docs/agent-overview#pricing-model--tiers-skills--token-billing). |
| `monthly_credits_weight` | `number` | Weight (credits) the skill contributes to the Starter monthly credit allocation. Same closure + multiplier semantics as price. When the $4 starter floor is applied to `monthly_price_weight_usd`, this weight is scaled up by the same ratio so the user gets a proportional credit boost rather than a free upgrade. |
| `billing_model` | `string` | Always `"tokens"`. Per-turn conversation cost is token-metered at the agent's per-model `tokenRates` (credits per 1M input / output / cached-input tokens) — see [token billing in the Agent Overview](/docs/agent-overview#pricing-model--tiers-skills--token-billing). Voice skills stream realtime audio through the operator's own Wiro AI Models balance via `int-wiro-aimodels` (your own Wiro API key); only the post-call text turn is a normal token deduct. |

> **4 weight buckets in the skill registry.** Every skill's `monthly_price_weight_usd` / `monthly_credits_weight` pair lands in one of four buckets: `ZERO` (`$0` / `0` — utility / rule-only skills), `LIGHT` (`$1` / `25` credits per month), `HEAVY` (`$2` / `50` credits per month), or `PREMIUM` (`$4` / `100` credits per month). The `(priceUsd, credits)` grid is a documentation convenience — it is **not** a named API constant; each pair emerges from the skill's own `monthly_price_weight_usd` / `monthly_credits_weight`. There are **no per-skill Pro overrides** — Pro is always derived as `Starter × tiermultiplier` (default `10`). The agent's Starter price = `Σ(enabled-skill weights)`, bumped to `$4` if the raw sum lands below the floor (with credits scaled proportionally to keep the per-credit ratio stable); Pro = `Starter × tiermultiplier`.

> **Optional filter `wiro_connect_pending`.** When you query with
> `wiro_connect_pending: true` you get every skill whose connecting
> integration's Wiro-shared OAuth client is awaiting App Review — currently
> `int-instagram-post`, `int-facebookpage-post`, `int-linkedin-post`,
> `int-tiktok-post`, `int-metaads-manage`, the Google OAuth skills listed
> above, and paired `util-*` helpers. Facebook Pages, Instagram, and Meta Ads
> already expose customer-owned System User and/or OAuth alternatives. The flag
> itself lives on the credential entry under
> [`POST /Credentials/Detail`](/docs/agent-credentials#post-credentialsdetail).

### **POST** /Skills/Detail

Returns a single skill by name.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes | Canonical skill name **with prefix** (e.g. `"int-instagram-post"`, `"util-social-posting-common"`). Registry-only — `cs-*` and `cs-cron-*` user-level customskills are not exposed here. |

##### Response

```json
{
  "result": true,
  "errors": [],
  "skill": {
    "name": "int-instagram-post",
    "category": "int",
    "version": "1.0.0",
    "title": "Instagram Post",
    "description": "Post carousel feed and multi-story via Meta Graph API.",
    "icon": "/images/icons/skills/instagram.svg",
    "brand_color": "#e4405f",
    "brand_text_color": "#ffffff",
    "brand_logo_filter": "brightness(0) invert(1)",
    "docs_url": "integration-instagram-skills",
    "requires_credentials": true,
    "credential_key": "instagram",
    "capabilities": ["social_publishing"],
    "depends_on": [],
    "conflicts_with": [],
    "user_invocable": true,
    "deprecated": false,
    "replacement": null,
    "pricing": {
      "monthly_price_weight_usd": 1,
      "monthly_credits_weight": 25,
      "billing_model": "tokens"
    }
  }
}
```

Returns the **full registry entry** — same shape as a row from `Skills/List`. The endpoint surfaces every field the registry has stored; Wiro never trims the response based on caller role. If the skill is not found you get `{ "result": false, "errors": [{ "code": 404, "message": "Skill not found: <name>" }] }`.

### **POST** /Skills/CredentialSchema

Convenience endpoint — returns the credential entry for a given skill name in one call. Useful when you've discovered a skill via `Skills/List` and want to render the credential form without a separate `Credentials/Detail` round-trip.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes | Skill name (with the registry prefix, e.g. `"int-instagram-post"`). |

##### Response

```json
{
  "result": true,
  "errors": [],
  "credential": {
    "key": "instagram",
    "title": "Instagram",
    "icon": "/images/icons/skills/instagram.svg",
    "brand_color": "#e4405f",
    "brand_text_color": "#ffffff",
    "brand_logo_filter": "none",
    "docs_url": "integration-instagram-skills",
    "credential_mode": "hybrid",
    "connection_modes": ["api_key", "own", "wiro"],
    "default_connection_mode": "api_key",
    "mode_badges": {
      "api_key": "Recommended",
      "own": "Advanced"
    },
    "wiro_connect_pending": true,
    "credential_schema": [
      {
        "key": "appid",
        "type": "text",
        "label": "App ID",
        "required": true,
        "pattern": "^[0-9]+$",
        "help": "<ol><li>Go to Meta for Developers → My Apps</li><li>Create App → Other → Business</li><li>Copy the App ID from the dashboard</li><li>Add Product → Facebook Login → Set Up</li><li>Add OAuth Redirect URI: https://api.wiro.ai/v1/UserAgentOAuth/IGCallback</li></ol>",
        "oauth_managed": true,
        "only_in_modes": ["own"]
      },
      {
        "key": "appsecret",
        "type": "password",
        "label": "App Secret",
        "required": true,
        "show_toggle": true,
        "help": "<ol><li>Meta for Developers → select your app</li><li>App Settings → Basic</li><li>Show next to App Secret and copy</li></ol>",
        "oauth_managed": true,
        "only_in_modes": ["own"]
      },
      {
        "key": "systemusertoken",
        "type": "password",
        "label": "System User Token",
        "required": true,
        "encrypted": true,
        "show_toggle": true,
        "runtime_excluded": true,
        "only_in_modes": ["api_key"]
      },
      {
        "key": "accountId",
        "type": "text",
        "label": "Instagram Account ID",
        "required": true,
        "pattern": "^[0-9]+$",
        "auto_filled_by_oauth": true,
        "readonly_when_connected": true
      },
      {
        "key": "igusername",
        "type": "text",
        "label": "Connected Account",
        "required": false,
        "auto_filled_by_oauth": true,
        "readonly_when_connected": true
      }
    ],
    "oauth_provider": {
      "auth_method_value": "wiro",
      "connect_endpoint": "/UserAgentOAuth/OAuthConnect",
      "disconnect_endpoint": "/UserAgentOAuth/OAuthDisconnect",
      "status_endpoint": "/UserAgentOAuth/OAuthStatus",
      "connect_button_label": "Connect with Instagram",
      "connect_button_icon": "/images/icons/skills/instagram.svg",
      "connect_button_brand_color": "#e4405f",
      "connect_button_text_color": "#ffffff",
      "connect_button_logo_filter": "none",
      "username_field": "igusername",
      "return_query_param": "ig_connected",
      "return_error_param": "ig_error",
      "return_error_detail_param": "ig_error_detail",
      "direct_probe": {
        "mode": "api_key",
        "mode_label": "System User Token",
        "token_field": "systemusertoken",
        "required_fields": ["systemusertoken"],
        "public_account_fields": ["id", "name"]
      },
      "account_picker": {
        "enabled": true,
        "multi_select": true,
        "set_endpoint": "/UserAgentOAuth/SetPickerAccounts",
        "item_value_field": "accountId",
        "item_label_field": "igusername",
        "item_fields_to_save": ["accountId", "igusername"]
      },
      "extra_step": null
    },
    "used_by_skills": ["int-instagram-post"]
  }
}
```

Returns the **full registry credential entry** — same shape as a row from [`POST /Credentials/Detail`](/docs/agent-credentials#post-credentialsdetail). Returns `{ "result": false, "errors": [{ "code": 404, "message": "No credential associated with skill: <name>" }] }` if the skill exists but has `credential_key: null` (`util` / platform-managed) or if the skill is unknown.

### **POST** /Skills/Capabilities

Returns the closed-set vocabulary of high-level capability tags. Use this to build a "Find skills that can: ___" picker in your UI, or to filter `Skills/List` via the `capability` parameter.

##### Response

```json
{
  "result": true,
  "errors": [],
  "capabilities": [
    { "name": "direct_reporting",         "description": "Skill generates direct reports on operator request" },
    { "name": "attribution_cross_check",  "description": "Cross-check platform conversions vs GA4 paid traffic" },
    { "name": "cross_check",              "description": "Cross-system data validation" },
    { "name": "campaign_management",      "description": "Create/pause/modify ad campaigns" },
    { "name": "campaign_reporting",       "description": "Campaign performance reports" },
    { "name": "approval_flow",            "description": "Approval command grammar for operator-gated actions" },
    { "name": "recommendation_ledger",    "description": "Recommendation queue/log management" },
    { "name": "recommendation_execution", "description": "Execute approved recommendations" },
    { "name": "content_generation",       "description": "Generate content (text, media)" },
    { "name": "creative_generation",      "description": "Generate ad creatives" },
    { "name": "image_generation",         "description": "Generate images" },
    { "name": "video_generation",         "description": "Generate videos" },
    { "name": "audio_generation",         "description": "Generate audio / voice clips (TTS, music, SFX)" },
    { "name": "realtime_conversation",    "description": "Bidirectional realtime audio/text conversation (Wiro realtime, OpenAI realtime)" },
    { "name": "vision",                   "description": "Vision LLM analysis of images (caption, describe, OCR, visual QA)" },
    { "name": "human_copywriting",        "description": "Enforce anti-AI human copy rules" },
    { "name": "anti_ai_tone",             "description": "Reject AI-generated tone patterns" },
    { "name": "memory_management",        "description": "Manage memory/*.json hygiene (size limits, trim, dedupe, schema)" },
    { "name": "markdown_reporting",       "description": "Structured markdown reports (tables, code blocks, splits)" },
    { "name": "store_review_response",    "description": "Craft App Store / Google Play review responses" },
    { "name": "outreach_compliance",      "description": "Outreach PII/opt-out/consent rules (GDPR, CAN-SPAM)" },
    { "name": "web_publishing",           "description": "Publish web content (WordPress, etc.)" },
    { "name": "email_publishing",         "description": "Send emails / newsletters" },
    { "name": "social_publishing",        "description": "Post to social platforms (Twitter, IG, FB, LI, TikTok)" },
    { "name": "push_notification",        "description": "Send push notifications (FCM)" },
    { "name": "lead_enrichment",          "description": "Enrich prospect data (Apollo, HubSpot)" },
    { "name": "sequence_automation",      "description": "Run outreach sequences (Lemlist, Apollo)" },
    { "name": "multi_platform_detection", "description": "Auto-detect available platforms" },
    { "name": "holiday_discovery",        "description": "Discover global holidays (Calendarific)" },
    { "name": "product_feed_management",  "description": "Manage product feeds (Merchant Center)" },
    { "name": "review_monitoring",        "description": "Monitor store reviews (App Store, Google Play)" },
    { "name": "app_metadata",             "description": "Fetch app store metadata (description, pricing, features)" },
    { "name": "event_management",         "description": "Manage app events (App Store in-app events)" },
    { "name": "file_asset_management",    "description": "Manage asset files from cloud storage (Drive)" },
    { "name": "voice_call_handling",      "description": "Receive and handle inbound voice calls via Twilio or web browser" },
    { "name": "caller_identification",    "description": "Match caller phone number against CRM records (HubSpot, Apollo)" },
    { "name": "live_transcript",          "description": "Stream real-time call transcripts to operator chat" },
    { "name": "voice_persona",            "description": "Configure AI voice persona (alloy/echo/etc) for phone interactions" },
    { "name": "phone_inbound",            "description": "Accept inbound PSTN phone calls (Twilio)" },
    { "name": "browser_voice",            "description": "Accept inbound voice calls from website browser (Web Audio API)" },
    { "name": "appointment_management",   "description": "Manage calendar appointments (find slots, create events)" },
    { "name": "calendar_lookup",          "description": "Read calendar/availability data (Google Calendar)" },
    { "name": "realtime_session_prep",    "description": "Pre-call orchestration: bridge ↔ agent handshake before realtime audio starts (read operator's cs-* custom skills, run realtime model, callback to bridge)" }
  ]
}
```

Capability names are **snake_case** strings. Pass any of them as the `capability` parameter to `Skills/List` to filter (e.g. `{ "capability": "social_publishing" }` returns every skill that publishes to a social platform).

## Custom Skills — Discovery (Per-Instance)

Once you've deployed a useragent, its current custom skills live under `customskills[]` (preferences + non-cron user-created skills) and `scheduledskills[]` (cron skills) on the `POST /UserAgent/Detail` response.

**Request:**

```json
{ "guid": "your-useragent-guid" }
```

**Response** (top-level `customskills` and `scheduledskills` excerpt — same shape as on `POST /UserAgent/Detail`):

```json
{
  "customskills": [
    {
      "key": "cs-content-tone",
      "description": "Brand voice + posting rules read by every content-generation skill on this agent.",
      "value": "## Brand Voice\nTone: friendly, casual, never salesy.\nTarget Audience: indie devs and side-project builders.\n\n## Hashtag Strategy\nMax 3 per post. Always include #BuildInPublic and #Indie.\n\n## Platform Rules\n- Instagram: square images only, carousels for tutorials.\n- Twitter: thread format for posts longer than 200 chars.",
      "enabled": true,
      "interval": null,
      "_source": "preset-strategy",
      "_editable": true,
      "_edited": true
    }
  ],
  "scheduledskills": [
    {
      "key": "cs-cron-content-scanner",
      "description": "Polls the content sources every 4 hours and queues fresh ideas for the post generator.",
      "value": "Scan the configured RSS / sitemap sources, dedupe against last 14 days, and queue up to 3 fresh items into the post pipeline.",
      "enabled": true,
      "interval": "0 */4 * * *",
      "_source": "skill-bundle",
      "_editable": true,
      "_edited": false
    },
    {
      "key": "cs-cron-weekly-health-check",
      "description": "User-created weekly summary cron that posts a Monday recap to Telegram.",
      "value": "Every Monday at 09:00 UTC, summarize last week's published posts (titles + engagement) and post the recap to Telegram.",
      "enabled": true,
      "interval": "0 9 * * 1",
      "_source": "user-created",
      "_editable": true,
      "_edited": false,
      "_user_created": true
    }
  ],
  "skills": [
    { "name": "int-instagram-post", "enabled": true },
    { "name": "int-googleads-manage", "enabled": false },
    { "name": "int-wiro-aimodels", "enabled": true }
  ]
}
```

> The exact key names depend on the agent template. Always fetch `POST /UserAgent/Detail` to see the real list for your deployed instance — skill keys, default cron schedules, and even the set of skills can evolve as templates are updated.

| Field | Type | Description |
|-------|------|-------------|
| `key` | string | Canonical key. **Always carries the `cs-` runtime prefix.** Strategies are `cs-<slug>`; crons are `cs-cron-<slug>`. The server normalises bare slugs you send to `CustomSkillUpsert` — `"content-tone"` becomes `cs-content-tone`, `"weekly-health-check"` with `interval: "0 9 * * 1"` becomes `cs-cron-weekly-health-check`. |
| `value` | string | Skill instructions / cron prompt body. Populated only for editable preference skills and user-created entries; bundled crons have it empty. |
| `description` | string | Human-readable description. **Writable only on user-created rows.** Sending `description` for a preset strategy or a skill-bundled cron is rejected with `customskill-preset-description-not-editable`. |
| `enabled` | boolean | Whether the skill is active. **Writable for both strategies (`cs-*`) and crons (`cs-cron-*`)** — a disabled strategy is suppressed end-to-end (kept in the merged `customskills[]` so the IDE sees it, but skipped during `start.sh`'s `SKILL.md` write and dropped from the agent's `<available_skills>` block). |
| `interval` | string \| null | Cron expression for scheduled execution, or `null` for preference skills. Writable on cron skills; ignored on preferences. |
| `_source` | string | `preset-strategy` (editable preference), `skill-bundle` (cron owned by an integration skill), or `user-created` (cron added via `CustomSkillUpsert` with `usercreated: true`). |
| `_editable` | boolean | Convenience flag: `true` for preset strategies and user-created rows (you can write `value`), `false` for skill-bundled crons (you can only write `enabled` / `interval`). |
| `_user_created` | boolean | Present (and `true`) only on `_source: "user-created"` rows. Omitted on preset strategies and skill-bundled crons. |

### Understanding `_source`

Agent responses merge three sources into a single set of custom-skill rows:

1. **Preset strategies** (`_source: "preset-strategy"`) — preferences defined by the agent preset (e.g. `cs-content-tone`, `cs-ad-strategy`). You can write `value`.
2. **Bundled crons** (`_source: "skill-bundle"`) — cron tasks shipped inside a specific integration skill. Automatically materialized when the integration is enabled. You can write `interval` and `enabled`, but **not** `value` (the skill owns the cron instruction text).
3. **User-created rows** (`_source: "user-created"`) — entries added via `POST /UserAgent/CustomSkillUpsert`. You can write all fields. Crons are flagged via `interval` (or an explicit `cs-cron-` prefix), not `usercreated`.

## Updating Preference Skills

Preference skills (`_source: "preset-strategy"`, `_editable: true`) let you customize the agent's behavior by editing its instructions.

Send one `CustomSkillUpsert` call per skill. Unspecified skills are untouched. The typical update is just `value`. You can also pass `enabled: false` to disable a strategy (the agent will skip it everywhere it would otherwise inject the strategy's instructions). `interval` has no effect on strategies — they're read on-demand by cron tasks via `cs-<slug>`, never scheduled themselves. `description` is rejected on preset rows with `customskill-preset-description-not-editable` — the description is template-owned.

### Example: Social Manager — Brand Voice

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/CustomSkillUpsert" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-social-manager-guid",
    "skillkey": "content-tone",
    "value": "## Brand Voice\nTone: Professional and informative. No slang.\nTarget Audience: Developers and product managers\nKey Topics: Developer tools, APIs, product updates\nHashtag Strategy: Max 3 per post. Always include #AI and #YourBrand.\n\n## Content Sources\nPrimary Source: https://your-site.com/blog/feed.xml\nSort Order: newest first\nCTA URL Pattern: https://your-site.com/posts/{slug}\n\n## Post Format\nCaption Style: short hook, 3 emoji bullet points, CTA line\nSignature Phrase: \"Build faster with YourBrand\"\n"
  }'
```

Response: `{ "result": true, "errors": [] }`. If the agent was running it automatically restarts.

### Example: Lead Generation Manager — ICP Definition

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/CustomSkillUpsert" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-leadgen-guid",
    "skillkey": "lead-strategy",
    "value": "## Our Business\nCompany: Acme Corp\nProduct: AI-powered CRM\n\n## Ideal Customer Profile\nIndustry: SaaS, FinTech\nCompany size: 50-500\nJob titles: VP Sales, CTO\n\n## Outreach Tone\nCasual but professional."
  }'
```

## Managing Scheduled Tasks

Scheduled tasks are cron skills — bundled ones (`_source: "skill-bundle"`) ship with integration skills and run automatically when the integration is enabled. User-created crons (`_source: "user-created"`) are added at any time.

> **For bundled crons, only `enabled` and `interval` are writable.** The task body (`value`) is owned by the integration skill and re-materialised on every container restart. To change **what** a bundled scheduled task does, edit the paired preference skill (e.g. `content-tone` is read by `cron-content-scanner` at runtime). For user-created crons, all three (`value`, `interval`, `enabled`) are writable.

### Example: Change a bundled cron's frequency

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/CustomSkillUpsert" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "skillkey": "cron-review-scanner",
    "enabled": true,
    "interval": "0 */4 * * *"
  }'
```

### Example: Disable a bundled cron

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/CustomSkillUpsert" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "skillkey": "cron-content-scanner",
    "enabled": false
  }'
```

### Example: Create a user-defined cron

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/CustomSkillUpsert" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "skillkey": "weekly-health-check",
    "value": "Every Monday, check the inbox and report the count to Telegram.",
    "interval": "0 9 * * 1",
    "enabled": true,
    "usercreated": true,
    "description": "Weekly inbox health check"
  }'
```

The server auto-prefixes `skillkey` with `cron-` on user-created crons, so the row above is stored with `key: "cs-cron-weekly-health-check"`. Subsequent upserts can use either form — `"weekly-health-check"`, `"cron-weekly-health-check"`, or `"cs-cron-weekly-health-check"`.

### Example: Delete a user-created cron

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/CustomSkillDelete" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "skillkey": "cs-cron-weekly-health-check"
  }'
```

Preset-owned crons cannot be deleted — the call returns `This skill belongs to the agent preset and cannot be deleted. Use enabled=false to disable it instead.` with `suggestion: "disable-via-upsert"`. Disable them via `CustomSkillUpsert` + `enabled: false`.

### Example: Rename a user-created custom skill

Only user-created rows (`_source: "user-created"`) can be renamed through `CustomSkillRename`. The skillkey flavour is preserved — a `cs-cron-*` scheduled task cannot be renamed to a `cs-*` strategy (delete + re-create with the right kind instead). The full version-history chain follows the rename under the new key, and a `rename` audit event is appended.

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/CustomSkillRename" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "oldskillkey": "cs-cron-weekly-health-check",
    "newskillkey": "cs-cron-weekly-system-check",
    "description": "Weekly system health probe"
  }'
```

Successful responses include the canonical `newskillkey` the server ended up writing (after slug normalisation), so follow-up calls that reference the skill should use that value.

### Common Cron Expressions

| Expression | Meaning |
|-----------|---------|
| `*/30 * * * *` | Every 30 minutes |
| `0 * * * *` | Every hour |
| `0 */2 * * *` | Every 2 hours |
| `0 */4 * * *` | Every 4 hours |
| `0 9 * * *` | Daily at 9:00 AM UTC |
| `0 9 * * 1` | Every Monday at 9:00 AM UTC |
| `0 10 * * 3` | Every Wednesday at 10:00 AM UTC |

## Version History — Audit and Revert

Every write through `CustomSkillUpsert` appends a row to the version history. Read it via `POST /UserAgent/CustomSkillHistory`; revert to any version (or to the preset default) via `POST /UserAgent/CustomSkillRevert`.

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/CustomSkillHistory" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "skillkey": "cs-content-tone"
  }'
```

```json
{
  "result": true,
  "errors": [],
  "preset_default": {
    "value": "## Brand Voice\nTone: friendly\nTarget Audience: ...",
    "intervalexpr": null,
    "enabled": true,
    "description": "How the agent should sound across all generated copy."
  },
  "entries": [
    {
      "guid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
      "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
      "skillkey": "cs-content-tone",
      "operation": "upsert",
      "value": "## Brand Voice\nTone: professional...",
      "intervalexpr": null,
      "enabled": true,
      "usercreated": false,
      "prev_value": "## Brand Voice\nTone: friendly...",
      "prev_interval": null,
      "prev_enabled": true,
      "after_value": "## Brand Voice\nTone: professional...",
      "after_interval": null,
      "after_enabled": true,
      "changed_fields": ["value"],
      "changedby": "ada-uuid",
      "changedby_user": {
        "uuid": "ada-uuid",
        "firstname": "Ada",
        "lastname": "Lovelace",
        "email": "ada@example.com",
        "username": "ada",
        "avatar": "https://cdn.wiro.ai/avatars/ada.webp",
        "avatarinitials": "AL"
      },
      "changedat": 1714694410
    },
    {
      "guid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
      "skillkey": "cs-content-tone",
      "operation": "upsert",
      "value": "## Brand Voice\nTone: friendly...",
      "intervalexpr": null,
      "enabled": true,
      "usercreated": false,
      "prev_value": null,
      "prev_interval": null,
      "prev_enabled": null,
      "after_value": "## Brand Voice\nTone: professional...",
      "after_interval": null,
      "after_enabled": true,
      "changed_fields": [],
      "changedby": "ada-uuid",
      "changedby_user": {
        "uuid": "ada-uuid",
        "firstname": "Ada",
        "lastname": "Lovelace",
        "email": "ada@example.com",
        "username": "ada",
        "avatar": "https://cdn.wiro.ai/avatars/ada.webp",
        "avatarinitials": "AL"
      },
      "changedat": 1714600000
    }
  ]
}
```

Each entry carries the **BEFORE** state of the action that produced it (the audit-write fires before the table mutation), plus server-computed `prev_*`, `after_*`, and `changed_fields[]` so you don't have to walk the list yourself. `changedby_user` is the resolved actor object — `null` for system / cron writes (sentinel `changedby`) or deleted users. Full field reference and revert flow live in [Agent Overview → CustomSkillHistory](/docs/agent-overview#post-useragentcustomskillhistory).

Revert to the preset default:

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/CustomSkillRevert" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "skillkey": "cs-content-tone",
    "source": "preset"
  }'
```

Or jump back to a specific version:

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/CustomSkillRevert" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "skillkey": "cs-content-tone",
    "source": "history",
    "versionguid": "v1-1714600000-def"
  }'
```

The response carries the post-revert state (`current_value`, `current_interval`, `current_enabled`) so the UI can refresh without a full `Detail` round-trip.

## Toggling Integration Skills

The top-level `skills[]` array on `UserAgent/Detail` lists every integration skill on the instance as an **object array** — `[{ name, enabled, _edited?, _user_created? }, ...]`. `enabled: false` entries are still returned (so the IDE can render disabled rows); filter on `enabled: true` to get only the active set. Example: `[{ "name": "int-instagram-post", "enabled": true }, { "name": "int-googleads-manage", "enabled": false }, { "name": "int-wiro-aimodels", "enabled": true }]`. To enable, disable, or change tier in one shot, use **`POST /UserAgent/SkillsApply`** — even when you only want to flip a single skill, send it as a one-entry `skills` map. The endpoint:

1. Charges the wallet (or prorates) **once**, not N times.
2. Triggers exactly **one container restart** after the new skill set lands.
3. Uses **idempotency** + a UA-level mutex — concurrent calls or FE retries can't double-apply.
4. Is **atomic** — a payment failure rolls back to the pre-call skill set.

**Single-skill enable:**

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/SkillsApply" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
    "idempotencyKey": "550e8400-e29b-41d4-a716-446655440001",
    "skills": {
      "int-instagram-post": true
    }
  }'
```

**Batch toggle + tier upgrade in one call:**

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/SkillsApply" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
    "tier": "pro",
    "idempotencyKey": "550e8400-e29b-41d4-a716-446655440000",
    "skills": {
      "int-instagram-post": true,
      "int-twitterx-post":  true,
      "int-wordpress-post":  false
    }
  }'
```

`idempotencyKey` is required — use a UUID per "user clicks Save" event. The full response shape and error-code table live on [`SkillsApply`](/docs/agent-overview#post-useragentskillsapply).

> **Custom builds only.** Template-deploy useragents reject `SkillsApply` with error code `100`: `Cannot edit skills on a template agent — only custom-built agents support skill editing.` Skills are inherited from the marketplace agent template and changing them would diverge the instance. To run a different skill set, deploy a custom build (`POST /UserAgent/Deploy` with `custom: true`) and configure its skills there.

> **Bundled crons follow the integration toggle.** When you disable an integration skill (e.g. `int-instagram-post`), every bundled cron it owns (`_source: "skill-bundle"`) is hidden from the top-level `customskills` / `scheduledskills` lists until the integration is re-enabled — you don't need to touch them individually.

## Live Pricing Preview

Before you commit `SkillsApply` (or the user clicks Save in your UI), call `POST /UserAgent/PricingPreview` to see "if I save this, my new monthly price would be $X with Y monthly credits". No state is mutated. See [`PricingPreview`](/docs/agent-overview#post-useragentpricingpreview) for the full response shape.

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/PricingPreview" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "tier": "pro",
    "skillOverrides": {
      "int-twitterx-post": true,
      "int-wordpress-post": false
    }
  }'
```

For **Build Your Agent** (no useragent yet), use draft mode:

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/PricingPreview" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "draft": true,
    "tier": "starter",
    "skills": ["int-gmail-check", "int-wordpress-post"]
  }'
```

See [Agent Builder](/docs/agent-builder) for the full custom-build walkthrough.

## Full Example: Push Notification Manager

Complete flow — fetch skills, then update preferences and schedules with three separate calls.

**Step 1 — Discover skills.**

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Detail" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "guid": "your-push-agent-guid" }'
```

Response excerpt (top-level `customskills` and `scheduledskills`):

```json
{
  "customskills": [
    {
      "key": "cs-push-preferences",
      "value": "## Push Tone\nWrite like a mobile growth expert...",
      "description": "Push notification style, language, and targeting preferences",
      "enabled": true,
      "interval": null,
      "_source": "preset-strategy",
      "_editable": true
    }
  ],
  "scheduledskills": [
    {
      "key": "cs-cron-push-scanner",
      "value": "",
      "description": "Scan holidays and craft push notification suggestions",
      "enabled": true,
      "interval": "0 9 * * *",
      "_source": "skill-bundle",
      "_editable": false
    },
    {
      "key": "cs-cron-push-dispatcher",
      "value": "",
      "description": "Send queued push notifications on schedule",
      "enabled": true,
      "interval": "0 * * * *",
      "_source": "skill-bundle",
      "_editable": false
    }
  ]
}
```

**Step 2 — Update each skill with its own call.**

```bash
# 1. Rewrite preference value
curl -X POST "https://api.wiro.ai/v1/UserAgent/CustomSkillUpsert" \
  -H "Content-Type: application/json" -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-push-agent-guid",
    "skillkey": "push-preferences",
    "value": "## Push Tone\nFriendly and casual. Turkish for locale_tr, English for locale_en.\n\n## Holiday Preferences\nFocus on: New Year, Ramadan, Republic Day.\nSkip: Valentine'\''s Day, Halloween.\n\n## Targeting\nAlways segment by locale. Premium version for paid users."
  }'

# 2. Change scanner schedule from daily to Mondays only
curl -X POST "https://api.wiro.ai/v1/UserAgent/CustomSkillUpsert" \
  -H "Content-Type: application/json" -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-push-agent-guid",
    "skillkey": "cron-push-scanner",
    "enabled": true,
    "interval": "0 9 * * 1"
  }'

# 3. Change dispatcher schedule from hourly to every 2 hours
curl -X POST "https://api.wiro.ai/v1/UserAgent/CustomSkillUpsert" \
  -H "Content-Type: application/json" -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-push-agent-guid",
    "skillkey": "cron-push-dispatcher",
    "interval": "0 */2 * * *"
  }'
```

All three requests succeed independently. The agent restarts once — the server coalesces the restart trigger after all three succeed within the same request window.

## Available Skills by Agent

> **Integration setup guides:** Every skill below that needs a third-party connection links to a dedicated integration page with the full OAuth / API key walkthrough, required scopes or permissions, callback URL, troubleshooting, and multi-tenant architecture notes. See the [Integration Catalog](/docs/agent-credentials#integration-catalog) for the full list.

> **Discovery is canonical.** Skill keys evolve as agent templates are updated. To see the exact keys for a specific agent instance, always fetch `POST /UserAgent/Detail` first — the top-level `customskills` / `scheduledskills` arrays are the source of truth. The tables below reflect current intended keys but may lag behind the latest agent template revisions; `CustomSkillUpsert` silently accepts keys that exist on the instance and returns `skill-not-found` for unknown keys without altering other state.

### Preferences (Editable Instructions)

| Agent | Skill Key | What It Controls |
|-------|-----------|-----------------|
| Social Manager | `content-tone` | Brand voice, hashtags, posting style |
| Blog Content Editor | `content-strategy` | Writing style, topics, research rules |
| App Review Support | `review-preferences` | Response tone, support channels |
| App Event Manager | `event-preferences` | Event regions, holiday priorities |
| Push Notification | `push-preferences` | Push tone, language, targeting |
| Newsletter Manager | `newsletter-strategy` | Topics, tone, audience, frequency |
| Lead Generation Manager | `lead-strategy` | ICP definition, outreach tone |
| Google Ads Manager | `ad-strategy` | Target audience, budget goals |
| Meta Ads Manager | `ad-strategy` | Target audience, creative preferences |

### Scheduled Tasks

> Scheduled task keys are defined **per agent template** and may be updated over time. The table below reflects the current keys and default cron expressions shipped with Wiro's built-in agent templates, but the source of truth for any specific deployed agent is always `POST /UserAgent/Detail` → top-level `scheduledskills`.

| Agent | Skill Key | Cron | What It Does |
|-------|-----------|------|--------------|
| Social Manager | `cron-content-scanner` | `0 */4 * * *` | Content discovery + draft generation (reads `content-tone`) |
| Social Manager | `cron-gmail-checker` | `*/30 * * * *` | Inbox monitoring for incoming requests (disabled by default) |
| Social Manager | `cron-drive-scanner` | `0 10 * * *` | Google Drive asset scanning (disabled by default) |
| Blog Content Editor | `cron-blog-scanner` | `0 9 * * *` | Topic discovery + article drafting (reads `content-strategy`) |
| Blog Content Editor | `cron-gmail-checker` | `*/30 * * * *` | Inbox monitoring for topic requests |
| App Review Support | `cron-review-scanner` | `0 */2 * * *` | Store scanning for new reviews (reads `review-preferences`) |
| App Event Manager | `cron-app-event-scanner` | `0 9 * * 1` | Holiday scanning + event suggestions (reads `event-preferences`) |
| Push Notification Manager | `cron-push-scanner` | `0 9 * * *` | Notification content preparation (reads `push-preferences`) |
| Push Notification Manager | `cron-push-dispatcher` | `0 * * * *` | Dispatching queued notifications |
| Newsletter Manager | `cron-newsletter-sender` | `0 9 * * 1` | Newsletter drafting and sending (reads `newsletter-strategy`) |
| Newsletter Manager | `cron-subscriber-scanner` | `0 10 * * *` | Subscriber list health checks |
| Lead Generation Manager | `cron-prospect-scanner` | `0 10 * * 1` | Prospect discovery and scoring (reads `lead-strategy`) |
| Lead Generation Manager | `cron-outreach-reporter` | `0 9 * * *` | Outreach performance reporting |
| Lead Generation Manager | `cron-reply-handler` | `0 */4 * * *` | Reply analysis |
| Google Ads Manager | `cron-performance-reporter` | `0 9 * * *` | Performance reporting (reads `ad-strategy`) |
| Google Ads Manager | `cron-competitor-scanner` | `0 10 * * 1` | Competitor analysis |
| Google Ads Manager | `cron-holiday-ad-planner` | `0 10 * * 3` | Holiday campaign planning |
| Google Ads Manager | `cron-drive-scanner` | `0 10 * * *` | Google Drive creative asset scanning (disabled by default) |
| Meta Ads Manager | `cron-performance-reporter` | `0 9 * * *` | Performance reporting (reads `ad-strategy`) |
| Meta Ads Manager | `cron-audience-scanner` | `0 10 * * 1` | Audience analysis |
| Meta Ads Manager | `cron-holiday-ad-planner` | `0 10 * * 3` | Holiday campaign planning |
| Meta Ads Manager | `cron-drive-scanner` | `0 10 * * *` | Google Drive creative asset scanning (disabled by default) |

### How Preference and Scheduled Skills Work Together

Each scheduled cron skill reads its paired preference skill at runtime. The mechanism:

1. `POST /UserAgent/CustomSkillUpsert` writes your preference `value` for key `content-tone` (stored as `cs-content-tone`).
2. When the container starts, each `customskills` / `scheduledskills` row is materialized as a local skill at `skills/<key>/SKILL.md` inside the agent workspace. The `cs-` prefix on `key` IS the runtime path — a preference skill with key `cs-content-tone` becomes `skills/cs-content-tone/`, and a cron skill with key `cs-cron-content-scanner` becomes `skills/cs-cron-content-scanner/`.
3. The scheduled cron skill's `value` (shipped in the integration skill, not user-editable) references its paired preference via the `cs-<preference-key>` path, for example:
   ```
   0. Read the cs-content-tone skill first — follow ALL its rules.
   1. ...
   ```
4. At each cron tick, the agent LLM reads `cs-content-tone`, applies your instructions, then executes the scan/report/dispatch workflow.

> **Slug normalization:** the `<slug>` in `cs-<slug>` / `cs-cron-<slug>` is the raw key lowercased with any run of non-alphanumeric characters replaced by a single `-` (leading/trailing dashes trimmed). Template keys already follow this shape so the slug matches 1:1.

This means **your editable preference becomes the single place to customize agent behavior** (brand voice, target audience, content sources, holiday markets, etc.), and the bundled cron skill is a thin orchestration layer that defers to your preference.

### Skill → Integration Mapping

Skills that depend on third-party credentials. Follow the linked integration page for provider setup, OAuth walkthrough, and troubleshooting.

| Skill | Credential Key | Integration Guide |
|-------|----------------|-------------------|
| `int-metaads-manage` | `meta-ads` (System User or OAuth) | [Meta Ads Skills](/docs/integration-metaads-skills) |
| `int-facebookpage-post` | `facebook-pages` (System User or OAuth) | [Facebook Page Skills](/docs/integration-facebook-skills) |
| `int-instagram-post` | `instagram` (System User or Instagram OAuth) | [Instagram Skills](/docs/integration-instagram-skills) |
| `int-linkedin-post` | `linkedin` (OAuth) | [LinkedIn Skills](/docs/integration-linkedin-skills) |
| `int-twitterx-post` | `twitter` (OAuth) | [Twitter / X Skills](/docs/integration-twitter-skills) |
| `int-tiktok-post` | `tiktok` (OAuth) | [TikTok Skills](/docs/integration-tiktok-skills) |
| `int-youtube-manage` | `youtube` (OAuth) | [YouTube Skills](/docs/integration-youtube-skills) |
| `int-googleads-manage` | `google-ads` (OAuth) | [Google Ads Skills](/docs/integration-googleads-skills) |
| `int-merchant-center` | `google-merchant-center` (OAuth) | [Merchant Center Skills](/docs/integration-merchantcenter-skills) |
| `int-ga4-analytics` | `ga4` (OAuth) | [GA4 Skills](/docs/integration-ga4-skills) |
| `int-hubspot-crm` | `hubspot` (OAuth) | [HubSpot Skills](/docs/integration-hubspot-skills) |
| `int-mailchimp-email` | `mailchimp` (OAuth or API key) | [Mailchimp Skills](/docs/integration-mailchimp-skills) |
| `int-google-drive` | `google-drive` (Service Account) | [Google Drive Skills](/docs/integration-googledrive-skills) |
| `int-google-calendar` | `google-calendar` (Service Account) | [Google Calendar Skills](/docs/integration-google-calendar-skills) |
| `int-gmail-check` | `gmail` (App Password) | [Gmail Skills](/docs/integration-gmail-skills) |
| `int-firebase-push` | `firebase` (Service Account) | [Firebase Skills](/docs/integration-firebase-skills) |
| `int-wordpress-post` | `wordpress` (App Password) | [WordPress Skills](/docs/integration-wordpress-skills) |
| `int-brevo-email` | `brevo` (API key) | [Brevo Skills](/docs/integration-brevo-skills) |
| `int-sendgrid-email` | `sendgrid` (API key) | [SendGrid Skills](/docs/integration-sendgrid-skills) |
| `int-appstore-reviews`, `int-appstore-metadata`, `int-appstore-events` | `apple-appstore` (JWT / Service Account) | [App Store Skills](/docs/integration-appstore-skills) |
| `int-googleplay-reviews`, `int-googleplay-metadata` | `google-play` (Service Account) | [Google Play Skills](/docs/integration-googleplay-skills) |
| `int-googleplay-events` | `google-play-apps` (Service Account — separate per-app registry) | [Google Play Skills](/docs/integration-googleplay-skills) |
| `int-apollo-sales` | `apollo` (API key) | [Apollo Skills](/docs/integration-apollo-skills) |
| `int-lemlist-outreach` | `lemlist` (API key) | [Lemlist Skills](/docs/integration-lemlist-skills) |
| `int-twilio-channel` | `twilio-voice` (API key) | [Twilio Voice](/docs/integration-twiliovoice-skills) |
| `int-wiro-aimodels` | `wiro` (your own Wiro project API key) | See [Using Wiro AI Models from Your Agent](#using-wiro-ai-models-from-your-agent) |
| `int-calendarific` | `calendarific` (API key) | [Calendarific in your agent](/docs/agent-credentials#calendarific-in-your-agent) |

Agents can optionally forward operator notifications to a Telegram bot via the `telegram` credential — see [Telegram Skills](/docs/integration-telegram-skills). This is never required; every agent remains fully usable over web chat and the [Messaging API](/docs/agent-messaging) without a bot configured.

> **Restart behavior:** Calls to `CustomSkillUpsert`, `CustomSkillRename`, `CustomSkillDelete`, `CustomSkillRevert`, and `SkillsApply` on a running agent (status 3 or 4) each trigger an automatic restart so the new skill configuration is picked up. Same as credential updates. Description-only edits to `CustomSkillUpsert` skip the restart.

## Using Wiro AI Models from Your Agent

`int-wiro-aimodels` lets an agent call Wiro's own AI models (image / video / audio / LLM generation, cover image creation, model discovery) from inside the agent container. When it's enabled on an agent:

- `credentials.wiro.apikey` is **operator-supplied** — pick or create a Wiro project at [wiro.ai/panel/projects](https://wiro.ai/panel/projects), copy its API key, and write it via `POST /UserAgent/CredentialUpsert`. Each generated asset is billed to that project's wallet.
- The agent container gets `WIRO_API_KEY` as an env var only when both `int-wiro-aimodels` is enabled **and** a `wiro.apikey` value has been written.
- `int-wiro-aimodels` is marked `user_invocable: true` in the registry — end-user messages can trigger it directly, and other skills / scheduled tasks invoke it internally when they need to generate content.

Most Wiro-provided agent templates (Social Manager, Blog Content, Push, App Event, Meta Ads, Google Ads) ship with `int-wiro-aimodels: true`. Templates that don't need AI generation (App Review Support, Lead Generation Manager) ship with `int-wiro-aimodels: false`. Either way, the agent stays at `status: 6` (Setup Required) until you upsert the `wiro` credential — same as any other API-key integration.

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/CredentialUpsert" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "fields": [
      { "credentialkey": "wiro", "fieldname": "apikey", "fieldvalue": "wp_xxx_your_wiro_project_api_key" }
    ]
  }'
```

To verify the skill is active on a deployed agent:

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Detail" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "guid": "your-useragent-guid" }'
# The top-level skills[] array should contain { "name": "int-wiro-aimodels", "enabled": true }
# credentials.wiro._connected should be true after the apikey is set
```

### Project key vs operator key

`credentials.wiro.apikey` is a **per-agent Wiro project key** — it lives inside that agent container and only the container ever uses it. The `x-api-key` header you send to the public Wiro endpoints from your own backend (e.g. `POST /UserAgent/Deploy`, `POST /Run`) is your **operator key** — entirely separate. If you're building on top of Wiro programmatically and want to call the Run / Task / LLM APIs directly from your own backend (not from inside an agent container), use your operator key — see [Run a Model](/docs/run-a-model) and [LLM & Chat Streaming](/docs/llm-chat-streaming).

## Update Rules Summary

| Operation | Endpoint | Allowed on preset strategy (`_source: preset-strategy`) | Allowed on skill-bundled cron (`_source: skill-bundle`) | Allowed on user-created cron (`_source: user-created`) |
|---|---|---|---|---|
| Write `value` | `CustomSkillUpsert` | Yes | **No — silently dropped** (skill owns the cron body) | Yes |
| Write `interval` | `CustomSkillUpsert` | **No — silently dropped** (strategies aren't scheduled) | Yes | Yes |
| Write `enabled` | `CustomSkillUpsert` | Yes (disabling suppresses the strategy end-to-end) | Yes | Yes |
| Write `description` | `CustomSkillUpsert` | **No — rejected** with `customskill-preset-description-not-editable` | **No — rejected** with `customskill-preset-description-not-editable` | Yes |
| Create | `CustomSkillUpsert` with `usercreated: true` | n/a | n/a | Yes |
| Rename key (+ optional description) | `CustomSkillRename` | **No — preset-forbidden**, renames cascade through admin endpoint | **No — preset-forbidden** | Yes (flavour preserved; `cs-cron-*` ↔ `cs-*` rejected) |
| Delete | `CustomSkillDelete` | **Rejected with `suggestion: "disable-via-upsert"`** | **Rejected with `suggestion: "disable-via-upsert"`** | Yes (hard delete — live row + full history purged) |
| Read history | `CustomSkillHistory` | Yes | Yes (only `enabled` / `interval` writes show up) | Yes (post-rename, the chain is migrated under the new key; a `rename` event marks the transition) |
| Revert to preset | `CustomSkillRevert` (`source: "preset"`) | Yes | Yes (resets `interval` / `enabled` to preset defaults) | Yes (deletes the row if no preset baseline exists) |
| Revert to a version | `CustomSkillRevert` (`source: "history"`) | Yes | Yes | Yes |

- Send only the fields you want to change — omitted fields keep their current values.
- Unknown skill keys return `skill-not-found` in the `errors[]` without altering other state.
- To clear a cron schedule, call `CustomSkillUpsert` with `enabled: false`. Setting `interval: ""` or `null` also clears it.
- Integration toggles (top-level `skills[]`) are a separate endpoint — see [Toggling Integration Skills](#toggling-integration-skills) and [`SkillsApply`](/docs/agent-overview#post-useragentskillsapply).

### What happens when Wiro updates an agent template

Skills occasionally evolve on Wiro's side — new preset strategies, new bundled crons, improved instructions. Deployed instances are reconciled with the latest template without destroying your edits:

| Row type | Behavior on template update |
|----------|----------------------------|
| Preset strategy (`_source: "preset-strategy"`) | Your `value` is **preserved** (rows with `useredited: true`). New placeholder structure in the template appears only on fresh deploys. |
| Skill-bundled cron (`_source: "skill-bundle"`) | The `value` (cron instructions) is **re-materialized** from the new skill. Your custom `interval` and `enabled` are preserved when `useredited: true`. |
| New preset strategy upstream | Added to your instance with the template's default `value`. |
| Preset strategy removed upstream | Removed from your instance on the next reconciliation. |
| User-created cron | Always preserved. |

Cascade reconciliation is async — admin pushes an `Agent/CustomSkillUpsert`, which enqueues a job that fans out to every deployed useragent in the background. Per-useragent edits (`useredited: true`) are protected from being overwritten by the cascade.

---

# Agent Transactions

Per-instance credit ledger — every credit deduction, renewal, purchase, refund, grant, and cancel for a useragent in a single immutable feed.

## Overview

Wiro keeps a complete, append-only **agent transaction ledger** for every UserAgent instance. Whenever credits move — the agent runtime burns them on a chat turn, a subscription renews, a Pro user buys an extra-credit pack, an admin tops up, the user disables a paid skill mid-period and gets a refund — a row is inserted into the ledger and surfaced through `POST /UserAgent/TransactionList`.

The ledger is the single source of truth for "where did my credits go?" and powers the **Transactions** view in your dashboard.

| Transaction `type` | Source | When it fires |
|--------------------|--------|---------------|
| `deduct` | Agent runtime | Per-turn LLM token charge (`action: "tokens"`) for every chat, cron, and voice post-call turn. Negative `amount`. |
| `renewal` | Subscription cron | At each 30-day rollover when the wallet successfully covers the renewal. Positive `amount` = monthly credits granted. |
| `purchase` | Extra-credit checkout | When `POST /UserAgent/CreateExtraCreditCheckout` (`useprepaid: true`) succeeds. Positive `amount` = pack credits. |
| `grant` | Skill toggle / tier upgrade | When a skill is enabled mid-period and the credit pool grows, or when a tier upgrade lifts the monthly allocation. Positive `amount`. |
| `expired` | Skill toggle / subscription end | Two cases share the type. Mid-period: when a skill is disabled and the credit pool shrinks (`action: "skill-toggle"`). End-of-period: when a cancelled subscription rolls past `currentperiodend` and the cron revokes any remaining monthly leftover (`action: "subscription"`). Negative `amount` in both cases. |
| `refund` | Server-side refund | Issued by Wiro support when a previous charge is reversed. Positive `amount`. |

> **The ledger is append-only.** There is no delete endpoint. Each row carries a stable `guid` that the server uses for deduplication (so a duplicate retry of the same deduct event is a no-op).

## **POST** /UserAgent/TransactionList

Returns the ledger rows for a single useragent sorted **newest-first**, plus a snapshot summary of the current balance.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | The useragent instance guid. |
| `limit` | number | No | Max rows to return. Default `50`, max `500`. |
| `start` | number | No | Offset for pagination. Default `0`. |

**Authorization:** owner uuid OR any team member of the useragent's team. Admin callers bypass the uuid check. Pass `teamGUID: <team-guid>` as a header for team agents.

##### Request

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/TransactionList" \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321", "limit": 50 }'
```

##### Response

```json
{
  "result": true,
  "errors": [],
  "total": 128,
  "summary": {
    "monthlycredits": 2250,
    "extracredits": 2000,
    "usedcredits": 1450,
    "remainingcredits": 2800,
    "creditperiod": "2026-05",
    "creditsyncat": 1714694410,
    "byModel": [
      { "model": "openai/gpt-5.4", "inputtokens": 128400, "outputtokens": 32100, "cachereadtokens": 86000, "cachewritetokens": 0, "totaltokens": 246500, "tokencost": 240, "turncount": 38 },
      { "model": "unknown", "inputtokens": 4200, "outputtokens": 900, "cachereadtokens": 0, "cachewritetokens": 0, "totaltokens": 5100, "tokencost": 7, "turncount": 3 }
    ]
  },
  "transactions": [
    {
      "guid": "7f3e8c21-1be1-4f5a-96e8-2b1a9e2a6a01",
      "type": "deduct",
      "action": "tokens",
      "amount": -5,
      "balanceafter": 10551,
      "description": "Input Tokens: 3450 / Output Tokens: 820 / Model: openai/gpt-5.4",
      "sessionkey": "default",
      "agentsessionkey": "default",
      "messageguid": "5c41dabf-f2be-4aa8-a5a4-8c9e3d2f3f11",
      "inputtokens": 3450,
      "outputtokens": 820,
      "cachereadtokens": 512,
      "cachewritetokens": 0,
      "totaltokens": 4782,
      "tokencost": 5,
      "processedms": 4120,
      "model": "openai/gpt-5.4",
      "provider": "agent",
      "providerref": null,
      "metadata": null,
      "uuid": "ada-uuid",
      "user": {
        "uuid": "ada-uuid",
        "firstname": "Ada",
        "lastname": "Lovelace",
        "email": "ada@example.com",
        "username": "ada",
        "avatar": "https://cdn.wiro.ai/avatars/ada.webp",
        "avatarinitials": "AL"
      },
      "createdat": 1714694400
    },
    {
      "guid": "a40b5473-aedb-47d7-966b-7b038eed30dc",
      "type": "purchase",
      "action": "small",
      "amount": 5000,
      "balanceafter": 10560,
      "description": "Extra credits — small pack",
      "sessionkey": null,
      "messageguid": null,
      "inputtokens": null,
      "outputtokens": null,
      "cachereadtokens": null,
      "cachewritetokens": null,
      "totaltokens": null,
      "tokencost": null,
      "processedms": null,
      "model": null,
      "provider": "prepaid",
      "providerref": null,
      "metadata": { "pack": "small", "priceUsd": 45 },
      "uuid": "ada-uuid",
      "user": {
        "uuid": "ada-uuid",
        "firstname": "Ada",
        "lastname": "Lovelace",
        "email": "ada@example.com",
        "username": "ada",
        "avatar": "https://cdn.wiro.ai/avatars/ada.webp",
        "avatarinitials": "AL"
      },
      "createdat": 1714692800
    },
    {
      "guid": "312e2a5f-1002-4c9a-af7d-70571e8b1739",
      "type": "renewal",
      "action": "monthly",
      "amount": 10000,
      "balanceafter": 5560,
      "description": "Subscription renewal",
      "sessionkey": null,
      "messageguid": null,
      "inputtokens": null,
      "outputtokens": null,
      "cachereadtokens": null,
      "cachewritetokens": null,
      "totaltokens": null,
      "tokencost": null,
      "processedms": null,
      "model": null,
      "provider": "prepaid",
      "providerref": null,
      "metadata": { "period": "2026-05", "priceUsd": 90 },
      "uuid": "system",
      "user": null,
      "createdat": 1714608000
    },
    {
      "guid": "98a14c2e-ee0f-4a2d-b73b-d33fe8e57cf2",
      "type": "grant",
      "action": "skill-toggle",
      "amount": 500,
      "balanceafter": 5050,
      "description": "Skill enabled: int-instagram-post",
      "sessionkey": null,
      "messageguid": null,
      "inputtokens": null,
      "outputtokens": null,
      "cachereadtokens": null,
      "cachewritetokens": null,
      "totaltokens": null,
      "tokencost": null,
      "processedms": null,
      "model": null,
      "provider": "prepaid",
      "providerref": null,
      "metadata": {
        "skill": "int-instagram-post",
        "enabled": true,
        "previousPriceUsd": 90,
        "newPriceUsd": 140,
        "proratedCharge": 33.33
      },
      "uuid": "ada-uuid",
      "user": {
        "uuid": "ada-uuid",
        "firstname": "Ada",
        "lastname": "Lovelace",
        "email": "ada@example.com",
        "username": "ada",
        "avatar": "https://cdn.wiro.ai/avatars/ada.webp",
        "avatarinitials": "AL"
      },
      "createdat": 1714604000
    }
  ]
}
```

> The `user` object is the resolved actor that triggered the ledger entry — `uuid`, `firstname`, `lastname`, `email`, `username`, `avatar`, `avatarinitials`. It is `null` when `uuid` is a sentinel like `"system"` (cron renewals, subscription expiry sweeps, automated platform writes) or when the user record has been deleted. The renewal row above was written by the daily renewal cron, so `uuid: "system"` and `user: null`.

**Summary fields** (snapshot of the useragent row):

| Field | Type | Description |
|-------|------|-------------|
| `monthlycredits` | `number` | Current monthly allocation. |
| `extracredits` | `number` | Active extra-credit balance (sum of non-expired packs). |
| `usedcredits` | `number` | Consumed during the current period (reported by the runtime). |
| `remainingcredits` | `number` | `max(0, monthlycredits + extracredits - usedcredits)`. |
| `creditperiod` | `string` | `'YYYY-MM'` billing window. Rolls over on subscription renewal. |
| `creditsyncat` | `number\|null` | Last runtime → API usage sync in Unix seconds. |
| `byModel` | `array` | Per-model token rollup for the **current billing period**, aggregating only `action: "tokens"` rows, sorted by `tokencost` descending. A `null` or empty `model` is bucketed as `"unknown"`. Each entry: `{ model, inputtokens, outputtokens, cachereadtokens, cachewritetokens, totaltokens, tokencost, turncount }`. |

**Transaction fields:**

| Field | Type | Description |
|-------|------|-------------|
| `guid` | `string` | Stable id of the ledger row. Daemon retries reuse this guid for idempotency. |
| `type` | `string` | One of `"deduct"`, `"renewal"`, `"purchase"`, `"grant"`, `"expired"`, `"refund"`. There is no `"cancel"` type — a user-initiated subscription cancel only flips auto-renew off; credits are not forfeited until `currentperiodend` is reached, at which point the cron writes the ledger row as `type: "expired"`, `action: "subscription"`. |
| `action` | `string\|null` | Fine-grained detail. Values depend on `type`: `"tokens"` (deduct — the per-turn LLM token charge the runtime writes for every chat, cron, and voice post-call turn); `"monthly"` (renewal); `"small"`, `"medium"`, `"large"` (purchase); `"skill-toggle"`, `"admin"`, `"upgrade"` (grant); `"skill-toggle"` (expired, mid-period skill disable); `"subscription"` (expired, end-of-period cancel rollover; refund). Legacy deduct rows may also carry `"message"`, `"create"`, `"modify"`, or `"regenerate"`. |
| `amount` | `number` | Signed credit delta — negative for deductions, positive for grants. |
| `balanceafter` | `number\|null` | Remaining credit balance snapshot written at the time of the event. May be `null` for very old rows or for events written before the snapshot field was added. |
| `description` | `string\|null` | Human-readable label. |
| `sessionkey` | `string\|null` | Session the deduct belongs to (deduct rows only). |
| `agentsessionkey` | `string\|null` | Alias of `sessionkey` (same value), present on every row for a unified per-session attribution key across `TaskList` / `TransactionList` / wallet responses. |
| `messageguid` | `string\|null` | Agent message that triggered the deduct (deduct rows only). |
| `inputtokens` | `number\|null` | Uncached prompt tokens billed at the model's input rate (`action: "tokens"` rows only). |
| `outputtokens` | `number\|null` | Completion tokens billed for the turn (`action: "tokens"` rows only). |
| `cachereadtokens` | `number\|null` | Prompt tokens served from cache for the turn (`action: "tokens"` rows only). |
| `cachewritetokens` | `number\|null` | Prompt tokens written to cache for the turn (`action: "tokens"` rows only). |
| `totaltokens` | `number\|null` | Exact `inputtokens + outputtokens + cachereadtokens + cachewritetokens` sum (`action: "tokens"` rows only). |
| `tokencost` | `number\|null` | Credit cost for the turn; equals `abs(amount)` (`action: "tokens"` rows only). |
| `processedms` | `number\|null` | Model processing time for the turn, in milliseconds (`action: "tokens"` rows only). |
| `model` | `string\|null` | Model id that served the turn, e.g. `"openai/gpt-5.4"` (`action: "tokens"` rows only). |
| `provider` | `string\|null` | `"agent"` (runtime deduct) or `"prepaid"` (wallet-backed change). API-deployed agents always run on the prepaid path. |
| `providerref` | `string\|null` | Provider-side reference id. Always populated for `prepaid` rows (wallet transaction id); `null` for `agent` runtime deducts. |
| `metadata` | `object\|null` | Arbitrary JSON context attached at write time (skill, tier, period, prorated charge, …). |
| `uuid` | `string\|null` | UUID of the user who triggered the event (the chat operator for `deduct` rows; the wallet owner for `purchase` / `grant`). `"system"` for cron-driven events. |
| `user` | `object\|null` | Resolved actor: `{ uuid, firstname, lastname, email, username, avatar, avatarinitials }`. `null` when `uuid` is `"system"` (automation / cron renewals) or when the user record was deleted. |
| `createdat` | `number` | Unix seconds. |

> **Pagination.** The endpoint returns `total` so you can render a precise paginator. Default page size is 50, max is 500. Use `start` to skip rows.

## Reading the Ledger — Patterns

### Daily / weekly reports

Filter client-side on `createdat` to bucket transactions per day or per skill:

```python
import requests
from collections import defaultdict
from datetime import datetime

resp = requests.post(
    "https://api.wiro.ai/v1/UserAgent/TransactionList",
    headers={"x-api-key": "YOUR_API_KEY", "Content-Type": "application/json"},
    json={"useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321", "limit": 500}
).json()

per_day_burn = defaultdict(int)
for tx in resp["transactions"]:
    if tx["type"] == "deduct":
        day = datetime.utcfromtimestamp(tx["createdat"]).strftime("%Y-%m-%d")
        per_day_burn[day] += abs(tx["amount"])

for day in sorted(per_day_burn):
    print(f"{day}: {per_day_burn[day]} credits")
```

### Audit a billing-period rollover

`type: "renewal"` rows are written exactly once per billing-period rollover. Pair them with the most recent `summary.creditperiod` to confirm the new period started on time.

```javascript
const renewals = transactions.filter(t => t.type === 'renewal');
const lastRenewal = renewals[0];   // newest-first ordering
console.log('Last renewal:', new Date(lastRenewal.createdat * 1000).toISOString());
console.log('Granted:', lastRenewal.amount, 'credits');
console.log('Now in period:', summary.creditperiod);
```

### Reconcile a Pro tier upgrade

When the user upgrades Starter → Pro mid-period, `UpgradeTier` writes one `grant` row with `action: "upgrade"` and `metadata: { tier, proratedCharge, ... }`. Use this to render an upgrade history in your UI.

## Errors

| Error | When |
|-------|------|
| `useragentguid is required` | `TransactionList` without `useragentguid` |
| `useragent-access-denied` | Caller is neither owner, team member, nor admin |
| `Invalid credentials` | API key is missing or doesn't resolve to a valid Wiro user |
| `transactions-list-failed` | `TransactionList` server-side error (DB) — surfaced loudly so it's distinguishable from "empty ledger" |

## Code Examples

### curl

```bash
# Latest 50 transactions for a useragent
curl -X POST "https://api.wiro.ai/v1/UserAgent/TransactionList" \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321", "limit": 50 }'

# Page 2 (next 50)
curl -X POST "https://api.wiro.ai/v1/UserAgent/TransactionList" \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321", "limit": 50, "start": 50 }'
```

### Python

```python
import requests

headers = {"x-api-key": "YOUR_API_KEY", "Content-Type": "application/json"}

resp = requests.post(
    "https://api.wiro.ai/v1/UserAgent/TransactionList",
    headers=headers,
    json={"useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321", "limit": 100}
).json()

print(f"Balance — remaining: {resp['summary']['remainingcredits']}/{resp['summary']['monthlycredits']}")
print(f"Total ledger rows: {resp['total']}")

for tx in resp["transactions"][:10]:
    sign = "+" if tx["amount"] > 0 else ""
    print(f"  [{tx['type']:>9}] {sign}{tx['amount']:>6}  {tx['description']}")
```

### Node.js

```javascript
const axios = require('axios');

const headers = { 'x-api-key': 'YOUR_API_KEY', 'Content-Type': 'application/json' };

const { data } = await axios.post(
  'https://api.wiro.ai/v1/UserAgent/TransactionList',
  { useragentguid: 'f8e7d6c5-b4a3-2190-fedc-ba0987654321', limit: 100 },
  { headers }
);

console.log(`Balance: ${data.summary.remainingcredits}/${data.summary.monthlycredits}`);
console.log(`Period: ${data.summary.creditperiod}`);

data.transactions.slice(0, 10).forEach(tx => {
  const sign = tx.amount > 0 ? '+' : '';
  console.log(`  [${tx.type.padStart(9)}] ${sign}${tx.amount}  ${tx.description}`);
});
```

### PHP

```php
<?php
$ch = curl_init("https://api.wiro.ai/v1/UserAgent/TransactionList");
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Content-Type: application/json",
    "x-api-key: YOUR_API_KEY"
]);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
    "useragentguid" => "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
    "limit" => 100
]));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$resp = json_decode(curl_exec($ch), true);
curl_close($ch);

echo "Balance: {$resp['summary']['remainingcredits']}/{$resp['summary']['monthlycredits']}\n";
foreach (array_slice($resp['transactions'], 0, 10) as $tx) {
    $sign = $tx['amount'] > 0 ? '+' : '';
    echo "[{$tx['type']}] {$sign}{$tx['amount']} {$tx['description']}\n";
}
```

## What's Next

- [Agent Logs](/docs/agent-logs) — Activity feed (tool calls, cron runs, message exchanges) for the same useragent
- [Agent Overview](/docs/agent-overview) — Full agent endpoint catalog, including subscription / billing operations
- [Agent Builder](/docs/agent-builder) — Build a custom agent and watch the ledger fill up as it runs

---

# Agent Logs

Per-instance activity feed — tool calls, scheduled cron runs, message exchanges, and turn boundaries — for any deployed agent.

## Overview

Every Wiro agent container runs a small **wiro-commands plugin** that appends one structured `ActivityEvent` JSON line per tool call, turn boundary, session boundary, message exchange, and synthesized cron run. The plugin redacts secrets-by-field-name, high-entropy assignment values, internal tool-call IDs, and the API URL/credentials before writing — so what shows up in `Logs` is safe to show end users.

A daily JSONL file is written for each calendar day; files older than 7 days are gzipped, files older than 180 days are deleted by the agent's daily maintenance cron.

The endpoints below are **owner-or-team-member** scoped. Team admins can read any team agent; outside callers receive `useragent-access-denied`.

| Endpoint | Purpose |
|----------|---------|
| `POST /UserAgent/Logs` | Live tail (last N events for today, or a specific date). Cached server-side for 30s on non-admin callers to absorb polling. |
| `POST /UserAgent/LogsList` | List the date strings (`YYYY-MM-DD`) for which an activity file exists. |
| `POST /UserAgent/LogsFile` | Read the **full** JSONL file for a specific date. |
| `POST /UserAgent/LogsDelete` | Delete one date's activity file (and its gzipped sibling). Idempotent. |

> **Activity feed vs `Message/History`.** `Message/History` is a chat-bubble-level read of the conversation. `Logs` is a **runtime** view: every tool call, every scheduled trigger, every session boundary the agent touched. They serve different audiences (`Message/History` for end users, `Logs` for operators / power users).

## ActivityEvent Shape

Every event is a JSON object with this base shape:

```json
{
  "ts": "2026-05-03T14:00:10.234Z",
  "kind": "tool_completed",
  "tool": "web_fetch",
  "title": "Fetched https://blog.example.com/weekly-roundup-12",
  "summary": {
    "url": "https://blog.example.com/weekly-roundup-12",
    "status": 200,
    "bytes": 18432
  },
  "durationMs": 1840,
  "ok": true,
  "cost": { "credits": 5, "skill": "int-wiro-aimodels", "action": "create" },
  "userUuid": "ada-uuid",
  "user": {
    "uuid": "ada-uuid",
    "firstname": "Ada",
    "lastname": "Lovelace",
    "email": "ada@example.com",
    "username": "ada",
    "avatar": "https://cdn.wiro.ai/avatars/ada.webp",
    "avatarinitials": "AL"
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `ts` | `string` | ISO-8601 UTC datetime when the event was emitted inside the container (e.g. `"2026-05-03T14:00:10.234Z"`). Parse with `Date.parse(ts)` for arithmetic. |
| `kind` | `string` | Fine-grained event class. One of: `"tool_started"`, `"tool_completed"` (one pair per tool invocation); `"turn_started"`, `"turn_ended"` (an LLM turn boundary); `"cron_started"`, `"cron_finished"` (a scheduled-cron tick); `"session_start"`, `"session_end"` (a chat-session boundary); `"user_message"` (user → agent message); `"agent_reply"` (agent → user reply); `"token_usage"` (a billed turn's token usage — chat / cron / voice post-call); `"token_usage_idempotent"` (a replayed usage callback, already billed — informational); `"balance_gate_blocked"` (a turn refused because the credit pool was exhausted). |
| `tool` | `string?` | Present on `tool_started` / `tool_completed`. Tool family — one of: `"read"`, `"write"`, `"edit"`, `"exec"`, `"web_fetch"`, `"web_search"`, `"sessions_spawn"`, `"message"`. |
| `title` | `string` | Human-readable one-line description of what happened (e.g. `"Posted carousel: \"Brand voice teaser\""`, `"Fetched https://…"`, `"Charged 5 credits · int-wiro-aimodels (create)"`). Always present. |
| `summary` | `object?` | Structured event-specific payload. Opaque on the wire — render as JSON when expanding the row. Plugin pre-redacts `apikey`, `apppassword`, `clientsecret`, `bearer`, `token`, etc. before writing. Common keys: `url`, `status`, `bytes`, `query`, `resultCount`, `path`, `lines`, `interval`, `trigger`, `messageguid`, `wordCount`, `elapsedTime`. |
| `durationMs` | `number?` | Wall-clock duration in milliseconds. Populated on `*_completed` / `*_finished` / `turn_ended` events. |
| `ok` | `boolean?` | `true` for a successful completion, `false` for a failure. Populated on `*_completed` / `*_finished` events. Pair with `error` for failure rows. |
| `error` | `string?` | One-line failure message (when `ok: false`). |
| `cost` | `object?` | Credit deduction attached to the event (`exec` tool calls that drove a per-action charge): `{ credits, skill, action }`. Absent on no-charge events. |
| `userUuid` | `string?` | UUID of the actor who triggered the event. `"system"` for cron / internal events. May be missing on legacy rows from the 180-day retention window pre-attribution rollout — the server falls back to the useragent owner. |
| `user` | `object\|null` | Resolved actor: `{ uuid, firstname, lastname, email, username, avatar, avatarinitials }`. `null` when `userUuid` is `"system"` (automation / cron) or when the user record was deleted. |

> **What is `summary` for?** Tool calls include the input/output summary (URL, status, bytecount, search query); cron ticks include `{ interval, trigger }`; message events include `{ messageguid, wordCount, elapsedTime }`. Treat the object as opaque and render-on-expand — its shape is plugin-version-specific and is allowed to evolve without a docs revision.

### Token-usage events

A `token_usage` event records the token spend and credit deduction for one billed turn — a chat reply, a cron run, or a voice post-call. A `token_usage_idempotent` event carries the **same shape** for a replayed usage callback that was already billed (informational; it does not deduct again). On top of the base `ActivityEvent` fields, these events add:

| Field | Type | Description |
|-------|------|-------------|
| `model` | `string` | Canonical model slug that served the turn (e.g. `"openai/gpt-5.4"`). |
| `tokens` | `object` | Nested token counts in **camelCase**: `{ input, output, cacheRead, cacheWrite, total }` (each an integer). |
| `tokencost` | `number` | Credits deducted for the turn (1 credit = $0.01). |
| `durationMs` | `number` | Wall-clock duration of the turn in milliseconds. |
| `calls` | `number` | Number of LLM calls made during the turn. |
| `remainingcredits` | `number` | Credit pool remaining after the deduction. |

```json
{
  "ts": "2026-05-03T14:02:55.310Z",
  "kind": "token_usage",
  "title": "Token usage: 6670 tokens · 5 credits",
  "model": "openai/gpt-5.4",
  "tokens": { "input": 3450, "output": 820, "cacheRead": 2400, "cacheWrite": 0, "total": 6670 },
  "tokencost": 5,
  "durationMs": 4200,
  "calls": 2,
  "remainingcredits": 9995,
  "userUuid": "system",
  "user": null
}
```

> **Nested vs flat token fields.** The activity-log `token_usage` event nests its counts in **camelCase** under `tokens.{input, output, cacheRead, cacheWrite, total}`. `input` is uncached input and `total` is the exact sum of all four components. This is distinct from the **flat, lowercase** columns on message rows (`inputtokens`, `outputtokens`, `cachereadtokens`, …). Same underlying data, different shape.

## **POST** /UserAgent/Logs

Live tail of the agent's activity feed. Returns the last N events for the requested date (defaults to today).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Your UserAgent instance guid. |
| `date` | string | No | `YYYY-MM-DD` to read a specific day's file. Default: today (UTC). Pass `"today"` explicitly for clarity. |
| `lines` | number | No | Max events to return (max 5000). Default: `200`. |

**Caching:** the endpoint is cached server-side for 30 seconds per `(useragentguid, date, lines)` triple to absorb polling bursts. Plan for ≥30 s between repeated polls of the same key — older or differently-keyed reads bypass the cache.

##### Request

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Logs" \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321", "lines": 200 }'
```

##### Response

```json
{
  "result": true,
  "errors": [],
  "date": "2026-05-03",
  "totalLines": 1428,
  "events": [
    {
      "ts": "2026-05-03T14:00:12.481Z",
      "kind": "tool_completed",
      "tool": "exec",
      "title": "Charged 60 credits · int-wordpress-post (create)",
      "summary": { "skill": "int-wordpress-post", "action": "create", "balanceafter": 4940 },
      "durationMs": 92,
      "ok": true,
      "cost": { "credits": 60, "skill": "int-wordpress-post", "action": "create" },
      "userUuid": "system",
      "user": null
    },
    {
      "ts": "2026-05-03T14:00:10.305Z",
      "kind": "tool_completed",
      "tool": "exec",
      "title": "Posted: \"Weekly Roundup\"",
      "summary": {
        "title": "Weekly Roundup",
        "url": "https://blog.example.com/weekly-roundup-12",
        "categories": ["AI", "Tutorial"]
      },
      "durationMs": 1840,
      "ok": true,
      "userUuid": "system",
      "user": null
    },
    {
      "ts": "2026-05-03T13:30:00.000Z",
      "kind": "cron_finished",
      "title": "Cron tick: cs-cron-blog-scanner",
      "summary": { "skill": "cs-cron-blog-scanner", "interval": "0 9 * * *", "trigger": "scheduled" },
      "durationMs": 4210,
      "ok": true,
      "userUuid": "system",
      "user": null
    },
    {
      "ts": "2026-05-03T13:14:42.118Z",
      "kind": "agent_reply",
      "title": "Agent replied (412 words, 8.1s)",
      "summary": {
        "messageguid": "5c41dabf-f2be-4aa8-a5a4-8c9e3d2f3f11",
        "elapsedTime": "8.1s",
        "wordCount": 412
      },
      "durationMs": 8104,
      "ok": true,
      "userUuid": "ada-uuid",
      "user": {
        "uuid": "ada-uuid",
        "firstname": "Ada",
        "lastname": "Lovelace",
        "email": "ada@example.com",
        "username": "ada",
        "avatar": "https://cdn.wiro.ai/avatars/ada.webp",
        "avatarinitials": "AL"
      }
    }
  ]
}
```

> **About the `user` field.** Every event is decorated with the resolved actor: `{ uuid, firstname, lastname, email, username, avatar, avatarinitials }`. It is `null` when:
>
> - The event was triggered by **automation** — `userUuid: "system"` for cron ticks, scheduled-skill runs, automated deductions, agent-initiated tool calls, and similar non-interactive writes (the three system / cron rows above).
> - The actor's user record was deleted or the lookup misses for any reason.
>

| Field | Type | Description |
|-------|------|-------------|
| `date` | `string\|null` | The actual date the events were read from (`YYYY-MM-DD`). |
| `totalLines` | `number` | Total lines in the file (regardless of `lines` cap). |
| `events` | `array<ActivityEvent>` | Newest first (descending by `ts`) — `events[0]` is the most recent event; do not re-reverse. |

## **POST** /UserAgent/LogsList

Returns the list of dates for which an activity file exists for this agent. Useful for rendering a date-picker.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Your UserAgent instance guid. |

##### Response

```json
{
  "result": true,
  "errors": [],
  "dates": [
    { "date": "2026-05-03", "sizeBytes": 184220, "compressed": false },
    { "date": "2026-05-02", "sizeBytes": 41280,  "compressed": true  },
    { "date": "2026-05-01", "sizeBytes": 38912,  "compressed": true  }
  ]
}
```

Each entry exposes `date` (`YYYY-MM-DD`, sorted newest-first), `sizeBytes` (raw byte size on disk; compressed size when `compressed: true`), and `compressed` (`true` once the worker's daily maintenance cron has gzipped the file to `<date>.jsonl.gz`; `false` for the active day's plain `.jsonl`). Reading either form via `LogsFile` returns the same decoded events. The host retains activity files for 180 days (rolling); older dates are pruned by a worker cron and won't appear here.

## **POST** /UserAgent/LogsFile

Reads the **full** JSONL file for a specific date and returns every event in it. Use this for "Download today's activity" buttons or for off-band analysis.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Your UserAgent instance guid. |
| `date` | string | Yes | `YYYY-MM-DD` of the file to read. |

##### Response

```json
{
  "result": true,
  "errors": [],
  "date": "2026-05-02",
  "truncated": false,
  "events": [
    {
      "ts": "2026-05-02T08:00:20.142Z",
      "kind": "user_message",
      "title": "User: \"Hi, can you draft a roundup post?\"",
      "summary": { "messageguid": "5c41dabf-…", "wordCount": 8 },
      "userUuid": "ada-uuid",
      "user": {
        "uuid": "ada-uuid",
        "firstname": "Ada",
        "lastname": "Lovelace",
        "email": "ada@example.com",
        "username": "ada",
        "avatar": "https://cdn.wiro.ai/avatars/ada.webp",
        "avatarinitials": "AL"
      }
    },
    {
      "ts": "2026-05-02T08:00:00.000Z",
      "kind": "session_start",
      "title": "Session started: user-42",
      "summary": { "sessionkey": "user-42" },
      "userUuid": "ada-uuid",
      "user": {
        "uuid": "ada-uuid",
        "firstname": "Ada",
        "lastname": "Lovelace",
        "email": "ada@example.com",
        "username": "ada",
        "avatar": "https://cdn.wiro.ai/avatars/ada.webp",
        "avatarinitials": "AL"
      }
    }
  ]
}
```

Events are returned **newest first** (descending by `ts`), same as the live tail — `events[0]` is the most recent; do not re-reverse. The `user` field follows the same resolution rules as the live tail above — see the `Logs` section's "About the `user` field" callout.

> **`truncated`** is `true` when the file was capped at the worker's max-line ceiling (~50000 events per file). When `true`, paginate by date — older events for the same day are not retrievable through this endpoint. (Use the live tail with smaller `lines` values for partial reads.)

## **POST** /UserAgent/LogsDelete

Deletes one date's activity file and its gzipped sibling (if present). Idempotent — deleting an already-gone date is a success no-op.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Your UserAgent instance guid. |
| `date` | string | Yes | `YYYY-MM-DD` of the file to remove. |

##### Response

```json
{
  "result": true,
  "errors": [],
  "date": "2026-05-01",
  "removed": { "plain": false, "gz": true }
}
```

`removed.{plain,gz}` reports which physical files were actually deleted. Both `false` is also a success (file was already gone).

## Usage Patterns

### Live polling for an in-app activity feed

Polling `Logs` every 30 seconds is the recommended cadence — the server-side cache TTL is calibrated for exactly this interval, so faster polling won't return fresher data:

```javascript
async function pollActivity(useragentguid, onEvents) {
  let lastTs = 0;

  setInterval(async () => {
    const { data } = await axios.post(
      'https://api.wiro.ai/v1/UserAgent/Logs',
      { useragentguid, lines: 200 },
      { headers: { 'x-api-key': 'YOUR_API_KEY', 'Content-Type': 'application/json' } }
    );

    const fresh = data.events.filter(e => Date.parse(e.ts) > lastTs);
    if (fresh.length === 0) return;

    onEvents(fresh);
    lastTs = Date.parse(fresh[0].ts);
  }, 30_000);
}
```

### Daily download for off-band analysis

```bash
# 1) discover available dates
curl -X POST "https://api.wiro.ai/v1/UserAgent/LogsList" \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321" }'

# 2) download a specific date's full file
curl -X POST "https://api.wiro.ai/v1/UserAgent/LogsFile" \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321", "date": "2026-05-02" }' \
  > logs-2026-05-02.json
```

### Filtering server-side by `kind`

The endpoints don't support server-side filtering — apply filters client-side:

```python
import requests

resp = requests.post(
    "https://api.wiro.ai/v1/UserAgent/LogsFile",
    headers={"x-api-key": "YOUR_API_KEY", "Content-Type": "application/json"},
    json={"useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321", "date": "2026-05-02"}
).json()

cron_runs = [e for e in resp["events"] if e["kind"] == "cron_finished"]
print(f"{len(cron_runs)} cron ticks on 2026-05-02")
for e in cron_runs:
    summary = e.get("summary") or {}
    print(f"  [{summary.get('skill')}] interval={summary.get('interval')}")
```

### GDPR-style "scrub a day"

`LogsDelete` lets the user wipe a specific day's events without waiting for the 180-day rotation:

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/LogsDelete" \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321", "date": "2026-05-02" }'
```

## Errors

| Error | When |
|-------|------|
| `useragentguid is required` | Missing required parameter |
| `date is required` | `LogsFile` / `LogsDelete` without `date` |
| `useragent-access-denied` | Caller is neither owner, team admin, nor admin |
| `Agent is not assigned to a worker. It may not be running.` | The useragent has no `workerid` (it's never been started, or has been re-allocated) |
| `Worker not found` | The agent's worker row is missing — internal data inconsistency |
| `Failed to fetch activity from worker` | The worker side rejected the request (worker offline, network blip) — retry |
| `Failed to fetch activity dates from worker` / `Failed to delete activity file from worker` / `Failed to fetch activity file from worker` | Same as above for the matching endpoint |

## Retention & Rotation

| Period | What happens |
|--------|--------------|
| Day 0 — 6 | File is plain JSONL (`YYYY-MM-DD.jsonl`). Live tail + LogsFile read it directly. |
| Day 7 — 180 | File is gzipped (`YYYY-MM-DD.jsonl.gz`). Reads are transparently decompressed; size in `LogsList` reports the on-disk compressed bytes. |
| Day 181+ | File is deleted by the agent's daily maintenance cron. `LogsList` no longer surfaces the date and `LogsFile` returns `Failed to fetch activity file from worker`. |

> **Persistence is per-agent.** If Wiro re-allocates the agent's runtime (rare; happens during platform maintenance), the activity history starts fresh from that point. For long-term audit trails, schedule a daily `LogsFile` download to your own storage.

## What's Next

- [Agent Transactions](/docs/agent-transactions) — Credit ledger for the same useragent — the audit trail of every credit movement
- [Agent Messaging](/docs/agent-messaging) — User-facing message exchanges (with full prompts and responses)
- [Agent Overview](/docs/agent-overview) — Full agent endpoint catalog

---

# Agent Use Cases

Build products with autonomous AI agents using the Wiro API.

## See These Use Cases on the Web

Wiro publishes interactive, fullscreen showcases for the most common agent use cases. Each one walks through a real product story end-to-end — build, deploy, daily operation, brand-voice authoring, scheduled autopilot, and a self-healing climax under an upstream API break — so you can see what the patterns below look like before writing any code.

| Showcase | What you'll see |
|----------|-----------------|
| **[Ad Campaign Manager](https://wiro.ai/agents/usecase/ad-campaign-agent)** | Drape Studio (bespoke tailoring) running Google Ads + Meta Ads on autopilot — Brand Voice + Budget Control as plain-English skills, AI video ads, OAuth publish, Day-3 auto-pause, weekly review, and a self-heal under the Google Ads API v14 sunset. |
| **[App Event Manager](https://wiro.ai/agents/usecase/app-event-agent)** | Nova (creative video + effects app) — Calendarific holiday scan across 7 markets, Nano Banana Pro dual-aspect covers, multi-language event copy, App Store Connect publish, autonomous monthly briefing, self-heal under a 503. |
| **[App Review Replies](https://wiro.ai/agents/usecase/app-review-agent)** | Prism (photo + video editor) — App Store + Google Play replies, Brand Voice + Reply Policy markdown skills, multilingual drafts, dev-team Slack escalation for 1★ crashes, monthly sentiment report, self-heal under token expiry. |
| **[Barber Booking](https://wiro.ai/agents/usecase/barber-booking-agent)** | Scissor Hands salon — WhatsApp + Google Calendar bookings, multi-staff routing with role-based privacy, customer memory, scheduled daily/monthly digests, self-heal under a Calendar API break. |
| **[Customer Win-Back](https://wiro.ai/agents/usecase/customer-winback-agent)** | Swift Sweep (chimney + fireplace service) — HubSpot CRM segmentation, Brand Voice + Customer Scorer + Seasonal Reminder as markdown skills, AI seasonal covers, batch WhatsApp send, scheduled autumn run, self-heal under a HubSpot v2 → v3 contacts API deprecation. |
| **[Ecommerce Listings](https://wiro.ai/agents/usecase/ecommerce-listing-agent)** | Coral & Crest (swimwear) — 5 Wiro AI models (Virtual Try-On, Product-on-Model, Background Remover, Cover Image, Description), multilingual copy, auto-publish to WordPress + Instagram + Shopify, 84-product Google-Drive bulk-autonomy climax. |
| **[Restaurant Reviews](https://wiro.ai/agents/usecase/restaurant-review-agent)** | Green Bottle Coffee — daily chat-based approvals, scheduled reports, anomaly dispatch, self-heal under a Reviews API deprecation. The "no pitch deck required" demo. |

You can also browse every available pre-built agent at [wiro.ai/agents/browse](https://wiro.ai/agents/browse) (the visual mirror of [`POST /Agent/List`](/docs/agent-overview#post-agentlist)). Each agent template has its own marketing page at `wiro.ai/agents/{slug}` — for example [wiro.ai/agents/social-manager](https://wiro.ai/agents/social-manager), [wiro.ai/agents/voice-receptionist](https://wiro.ai/agents/voice-receptionist), or [wiro.ai/agents/blog-content-editor](https://wiro.ai/agents/blog-content-editor) — with screenshots, default skills, credential requirements, and live tier pricing. The full URL for each agent in the [Available Agents](#available-agents) table below is `https://wiro.ai/agents/{slug}`.

## Two Deployment Patterns

Every product built on Wiro agents follows one of two patterns. Choosing the right one depends on whether your users need to connect their own third-party accounts.

### Pattern 1: Instance Per Customer

Most agents interact with external services — posting to social media, managing ad campaigns, sending emails. These require OAuth tokens or API keys that belong to the end user. Deploy a **separate agent instance** for each of your customers.

**Why:** Each customer connects their own accounts. Credentials are bound to the instance, isolated from other customers.

**How:** Call `POST /UserAgent/Deploy` once per customer, then use the [OAuth flow](/docs/agent-credentials) to connect their accounts.

#### Real-World Examples

| Your Product | Agent Type | Why Per-Customer |
|-------------|-----------|-----------------|
| Digital marketing agency dashboard | [Social Manager](https://wiro.ai/agents/social-manager) | Each client connects their own Twitter, Instagram, Facebook, TikTok, LinkedIn |
| Mobile app company | [App Review Support](https://wiro.ai/agents/app-review-support) | Each app has its own App Store / Google Play credentials |
| E-commerce platform | [Google Ads Manager](https://wiro.ai/agents/google-ads-manager) + [Meta Ads Manager](https://wiro.ai/agents/meta-ads-manager) | Each advertiser connects their own ad accounts |
| Marketing SaaS | [Newsletter Manager](https://wiro.ai/agents/newsletter-manager) | Each customer connects their own Brevo/SendGrid/Mailchimp |
| Sales platform | [Lead Generation Manager](https://wiro.ai/agents/lead-gen-manager) | Each sales team connects their own Apollo/Lemlist |
| Content agency tool | [Blog Content Editor](https://wiro.ai/agents/blog-content-editor) | Each client connects their own WordPress site |
| App publisher platform | [App Event Manager](https://wiro.ai/agents/app-event-manager) | Each app has its own App Store credentials |
| Mobile app publisher | [Push Notification Manager](https://wiro.ai/agents/push-notification-manager) | Each app has its own Firebase service account |
| Customer engagement tool | [Social Manager](https://wiro.ai/agents/social-manager) | Each brand manages their own social presence |
| Phone-receptionist platform for SMBs | [Voice Receptionist](https://wiro.ai/agents/voice-receptionist) | Each business has its own Twilio number, HubSpot CRM, and Google Calendar |

### Pattern 2: Session Per User

For conversational agents that don't need per-user credentials. One agent instance serves many users, each identified by a unique `sessionkey` that isolates their conversation history.

**Why:** No third-party accounts to connect. The agent answers questions using its built-in knowledge or pre-configured data sources.

**How:** Deploy one instance via `POST /UserAgent/Deploy`, then send messages with different `sessionkey` values per user.

**About `sessionkey`:** This field is optional — if omitted, messages go into a shared `"default"` session. Reuse the same `sessionkey` to continue a conversation (the agent retrieves prior messages as context). Use a fresh UUID to start a new conversation. The common convention is one `sessionkey` per end-user (e.g. `"user-456"`), but you can also use it per-thread (e.g. `"ticket-2025-0817"`) for products that group conversations by topic. See the [Agent Messaging](/docs/agent-messaging) guide for how sessions work.

#### Real-World Examples

| Your Product | Use Case | Why Sessions |
|-------------|---------|-------------|
| Knowledge base chatbot | Answer questions from documentation | No per-user credentials needed |
| Product recommendation advisor | Suggest products based on conversation | Same catalog for all users |
| Internal company assistant | HR policies, IT help, onboarding | Shared knowledge base |
| Customer support bot | Handle common support questions | No external service connections |

### When to Use Which

| Question | Instance Per Customer | Session Per User |
|---------|----------------------|-----------------|
| Does each user connect their own social/ad/email accounts? | Yes | No |
| Do credentials differ between users? | Yes | No |
| Is conversation the primary interaction? | Sometimes | Always |
| Does the agent perform actions on behalf of the user? | Yes | Rarely |
| How many instances do you need? | One per customer | One total (or a few) |

### Hybrid Pattern

A single product can combine both — a per-customer action agent plus a shared conversational agent sit side by side in the same frontend. For example:

- One **Social Manager** instance per customer (Pattern 1) to publish posts with their own connected social accounts (System User or OAuth, depending on the provider).
- One **shared knowledge-base chat** agent (Pattern 2) that answers product, billing, or onboarding questions across all customers, using `sessionkey` to keep each user's chat separate.

The two agents are independent deployments with different `useragentguid` values. Route user actions to the per-customer instance, and chat questions to the shared instance. Your backend decides which agent handles each request.

## Building Your Product

### White-Label Chat

Build a fully branded chat experience with no Wiro UI visible to your users.

The deploy flow has three stages — Deploy, Setup (only when the agent needs third-party credentials), and Start:

1. **Deploy** an agent via `POST /UserAgent/Deploy` — returns `useragents[0].guid` and starts the instance in `status: 6` (setup-required) or `status: 0` (ready) depending on whether the template needs credentials.
2. **Setup** the credentials (only if the agent template requires them) via one or more `POST /UserAgent/CredentialUpsert` calls and the matching OAuth flows — see [Agent Credentials & OAuth](/docs/agent-credentials). Check `setuprequired` on the response: while it's `true`, the agent cannot start. Once all required credential slots are filled, `setuprequired` flips to `false` and `status` becomes `0`. For Pattern 2 (knowledge-base / chat-only agents) there are no third-party credentials, so this stage is skipped and the agent is ready to start right after Deploy.
3. **Start** the agent with `POST /UserAgent/Start` — transitions through `status: 3` (starting) → `status: 4` (running).
4. Build your own chat UI.
5. Send messages via `POST /UserAgent/Message/Send`.
6. Stream responses in real-time via [Agent WebSocket](/docs/agent-websocket) using the `agenttoken`.
7. Manage conversation history with `POST /UserAgent/Message/History`.

See [Agent Overview](/docs/agent-overview) for the full lifecycle state table (`status: 0, 1, 3, 4, 5, 6`).

```bash
# Deploy — prepaid + tier are required for API users (credits debit from your wallet)
curl -X POST "https://api.wiro.ai/v1/UserAgent/Deploy" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "agentguid": "agent-template-guid",
    "title": "Customer Support Bot",
    "useprepaid": true,
    "tier": "starter"
  }'

# Pattern 1 only — fill any missing credentials, then verify setuprequired flipped to false
curl -X POST "https://api.wiro.ai/v1/UserAgent/Detail" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "guid": "deployed-useragent-guid" }'

# Start the agent (skipped if Deploy already returned status: 4 for cheap chat-only templates)
curl -X POST "https://api.wiro.ai/v1/UserAgent/Start" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "guid": "deployed-useragent-guid" }'

# Send a message
curl -X POST "https://api.wiro.ai/v1/UserAgent/Message/Send" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "deployed-useragent-guid",
    "message": "How do I reset my password?",
    "sessionkey": "user-456"
  }'
```

### Webhook-Driven Pipelines

For backend-to-backend integrations where you don't need real-time streaming.

1. Send a message with a `callbackurl`
2. Continue processing other work
3. Receive the agent's response via HTTP POST to your webhook endpoint
4. Chain the result into your next workflow step

See [Agent Webhooks](/docs/agent-webhooks) for payload format and retry policy.

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Message/Send" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "deployed-useragent-guid",
    "message": "Generate a weekly performance report",
    "sessionkey": "pipeline-run-789",
    "callbackurl": "https://your-server.com/webhooks/report-ready"
  }'
```

### Generative Media Studio

A richer variant of white-label chat: the agent doesn't just reply with text — it **generates images, video, or audio** through Wiro AI models and streams them into a live activity feed beside the conversation. This is the pattern behind Wiro's own Studio. It layers the realtime socket on top of the **Session-Per-User** model.

**Shape:**

- One deployed agent that has the `int-wiro-aimodels` skill enabled, with its `wiro` credential set to your Wiro project key (see [Agent Credentials](/docs/agent-credentials#wiro-ai-models--wiro-credential)). Media the agent generates is billed to that project's wallet.
- One `sessionkey` per end user (Pattern 2 above) — the same agent instance serves everyone; each user's chat and media history is isolated by session.
- A single WebSocket connection carries three things at once: the streaming chat reply, the per-turn token-usage report, and discovery of any model runs the agent launches.

**End-to-end sequence an integrator replicates:**

1. **Deploy once** (prepaid) — `POST /UserAgent/Deploy` with `useprepaid: true` + `tier`. Set the `wiro` credential with `POST /UserAgent/CredentialUpsert`, then `Start`.
2. **Open the socket** — connect to `wss://socket.wiro.ai/v1` and wait for the `connected` frame.
3. **(Optional) name the session** — `POST /UserAgent/Message/RenameSession` seeds a titled, empty session that shows up immediately in `Message/Sessions`.
4. **Subscribe to run discovery** — send `{ "type": "agent_info", "agenttoken": "<sessionkey>" }` so you receive `agent_wiroai_runtask` frames for this session.
5. **Send a message** — `POST /UserAgent/Message/Send` with the user's `sessionkey`. Subscribe `{ "type": "agent_info", "agenttoken": "<agenttoken-from-send>" }` and stream `agent_start → agent_output × N → agent_end`.
6. **Patch token usage** — ~250–500 ms after `agent_end`, an `agent_usage_report` frame delivers the turn's token counts, `tokencost`, and `remainingcredits`; splice them onto the message by `messageguid`.
7. **Collect generated media** — when the agent runs a model, an `agent_wiroai_runtask` frame arrives on the session channel with a `socketaccesstoken`. Subscribe to it with `{ "type": "task_info", "tasktoken": "<socketaccesstoken>" }` and stream `task_queue → task_start → task_output → task_postprocess_end`; the final frame carries the output media URLs. See [Agent WebSocket → Model runs the agent triggers](/docs/agent-websocket#model-runs-the-agent-triggers).
8. **Manage sessions** — list with `Message/Sessions`, rename with `Message/RenameSession`, clear/forget with `Message/DeleteSession` (`rotate: true` to wipe the agent's memory of the thread).

Either deployment shape works: run **one** media agent and separate users by `sessionkey`, or deploy **separate** agents per workspace/customer — both use the exact same socket and messaging surface.

### Scheduled Automation

Combine agents with cron jobs for recurring tasks.

```
Cron (every Monday 9am)
  → POST /UserAgent/Message/Send (with callbackurl)
    → Agent processes the task
      → Webhook fires to your server
        → Your server emails the report / posts to Slack / updates dashboard
```

This pattern works well for weekly social media content planning, daily ad performance reviews, monthly newsletter generation, and automated lead enrichment pipelines.

### Multi-Agent Orchestration

Deploy multiple specialized agents and coordinate them from your backend.

```
Your Backend
  ├── Research Agent → "Find trending topics in AI this week"
  │     ↓ webhook response
  ├── Writing Agent → "Write a blog post about: {research results}"
  │     ↓ webhook response
  └── Publishing Agent → "Publish this post to WordPress and share on social media"
```

Each agent is an independent instance with its own credentials. Your backend passes output from one agent as input to the next.

## Available Agents

Wiro provides pre-built agent templates you can deploy immediately. Each agent specializes in a specific domain and comes with the relevant skills and credential slots pre-configured.

| Agent | What It Does | Credentials |
|-------|-------------|-------------|
| **[Social Manager](https://wiro.ai/agents/social-manager)** | Create, schedule, and publish social media content | Twitter/X, TikTok, LinkedIn (OAuth); Instagram and Facebook Pages (System User recommended or own OAuth) |
| **[Blog Content Editor](https://wiro.ai/agents/blog-content-editor)** | Write and publish blog posts (WordPress draft + publish workflow) | WordPress (App Password), Gmail (optional, for inbox requests) |
| **[Google Ads Manager](https://wiro.ai/agents/google-ads-manager)** | Create and optimize Google Ads campaigns, daily performance reports | Google Ads (OAuth), Calendarific (API key), Google Drive (optional, Service Account) |
| **[Meta Ads Manager](https://wiro.ai/agents/meta-ads-manager)** | Manage Facebook and Instagram ad campaigns, audience analysis | Meta Ads (System User recommended or own OAuth), Calendarific (API key), Google Drive (optional, Service Account) |
| **[Newsletter Manager](https://wiro.ai/agents/newsletter-manager)** | Design and send email newsletters to subscriber lists | Brevo, SendGrid, Mailchimp, HubSpot (any one — API key or OAuth) |
| **[Lead Generation Manager](https://wiro.ai/agents/lead-gen-manager)** | Find and enrich leads, run multi-channel outreach, analyze replies | Apollo (API key), Lemlist (API key), HubSpot (optional, for CRM sync) |
| **[App Review Support](https://wiro.ai/agents/app-review-support)** | Monitor app store reviews, draft responses in operator's tone | App Store Connect (private key JWT), Google Play (service account) |
| **[App Event Manager](https://wiro.ai/agents/app-event-manager)** | Scan global holidays, suggest and create App Store + Google Play in-app events | App Store Connect (JWT), Google Play (service account), Calendarific (API key) |
| **[Push Notification Manager](https://wiro.ai/agents/push-notification-manager)** | Craft locale- and timezone-aware push notifications, queue dispatch | Firebase (service account JSON per app), Calendarific (API key) |
| **[Voice Receptionist](https://wiro.ai/agents/voice-receptionist)** | Answer phone calls 24/7 with a real-time AI receptionist — recognises callers from CRM, books from your calendar, drafts CRM notes + follow-up emails, streams a live transcript to chat | Twilio Voice (Account SID, Auth Token, phone number) for inbound phone; HubSpot (optional, caller recognition); Google Calendar (optional, slot lookup); Google Drive (optional); Brevo or HubSpot (any one, optional, follow-up email drafts); Telegram bot (optional, operator approvals) |

> The list above matches the agent templates currently deployed in production. The exact set evolves over time as new templates ship — fetch `POST /Agent/List` for the live catalog. Each agent's full marketing page lives at `https://wiro.ai/agents/{slug}` (linked in the first column).

### Deploying an Agent

```python
import requests

headers = {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
}

# List available agents
agents = requests.post(
    "https://api.wiro.ai/v1/Agent/List",
    headers=headers,
    json={}
)
print(agents.json())

# Deploy an instance (API users always use prepaid — credits debit from your wallet)
deploy = requests.post(
    "https://api.wiro.ai/v1/UserAgent/Deploy",
    headers=headers,
    json={
        "agentguid": "social-manager-agent-guid",
        "title": "Acme Corp Social Media",
        "useprepaid": True,
        "tier": "starter"
    }
)
useragent_guid = deploy.json()["useragents"][0]["guid"]

# Connect Twitter via the unified OAuth flow
connect = requests.post(
    "https://api.wiro.ai/v1/UserAgentOAuth/OAuthConnect",
    headers=headers,
    json={
        "useragentguid": useragent_guid,
        "credentialkey": "twitter",
        "redirecturl": "https://your-app.com/settings?connected=twitter"
    }
)
authorize_url = connect.json()["authorizeUrl"]
# Redirect your user to authorize_url

# Start the agent
requests.post(
    "https://api.wiro.ai/v1/UserAgent/Start",
    headers=headers,
    json={"guid": useragent_guid}
)

# Send a message
message = requests.post(
    "https://api.wiro.ai/v1/UserAgent/Message/Send",
    headers=headers,
    json={
        "useragentguid": useragent_guid,
        "message": "Create a thread about our new product launch",
        "sessionkey": "campaign-q2"
    }
)
print(message.json())
```

Browse available agents and their capabilities via [POST /Agent/List](/docs/agent-overview#post-agentlist) or in the [Wiro dashboard](https://wiro.ai/agents).


---

# Meta Ads Integration

Connect your agent to Meta's advertising platform to manage campaigns, ad sets, creatives, and performance insights across Facebook and Instagram ads.

## Overview

The Meta Ads integration powers the `metaads-manage` skill — creating and managing campaigns, pulling insights, managing creatives, and analyzing ad account data through direct Meta Graph / Marketing API v26 calls.

**Skills that use this integration:**

- `metaads-manage` — Campaign / ad set / creative CRUD, insights reporting, direct Graph API v26 operations
- `ads-manager-common` — Shared ads helpers (works alongside `metaads-manage` and `googleads-manage`)

**Agents that typically enable this integration:**

- Meta Ads Manager
- Any custom agent that needs paid-media capabilities on Meta

## Availability

| Path | Status | Notes |
|------|--------|-------|
| Wiro-owned approved-app OAuth | Pending provider approval | The registry carries this mode, but the dashboard keeps it unavailable while Wiro's Meta app is awaiting the required App Review, Advanced Access, and rollout checks. |
| `"own"` | Available now | You create your own Meta Developer App and connect it to Wiro. No App Review required when Development Mode + App Roles is used. |
| `"api_key"` | Available now — recommended | Paste a Business Manager System User token. No browser OAuth redirect and no App ID or App Secret is submitted to Wiro. Choose **Never** for token expiration when Meta offers it. |

> **There is no app-less Meta “machine key.”** A System User token is the closest machine-to-machine option: it removes the browser OAuth flow and recurring human sign-in, but Meta generates it for a System User through a Business Portfolio and a Meta Business app. The app, System User, ad accounts, Pages, and permissions remain customer-owned.

Today the two enabled modes are the recommended token-only System User path and customer-owned OAuth. Once Wiro's approved app has Advanced Access, a Wiro-owned OAuth option can be enabled without removing either customer-owned path.

## Why Wiro remains on direct Graph API v26

Meta's official Ads MCP is not a drop-in replacement yet. Wiro has not verified live parity for:

- targeting interest search and related raw targeting queries;
- reach/delivery estimates;
- lead-form and lead retrieval workflows;
- raw Graph flexibility needed for account-specific fields, edges, and versioned fallbacks;
- some financial, media upload, and creative-management operations.

Meta does not document a separate MCP “machine key”; MCP authentication still rests on Meta app/user or System User authorization. Replacing the direct integration is therefore deferred until Wiro completes live parity tests, permission/App Review checks, rate-limit and latency validation, error-shape regression tests, and a controlled rollout with rollback. Until those checks pass, Graph API v26 remains the authoritative runtime path.

## Prerequisites

- **A Wiro API key** — see [Authentication](/docs/authentication) for how to issue keys and sign requests.
- **A deployed agent** — see [Agent Overview](/docs/agent-overview) and call `POST /UserAgent/Deploy` first. You need the returned `useragents[0].guid` for every step below.
- **A Meta Business account** — [business.facebook.com](https://business.facebook.com/).
- **For the currently enabled customer-owned paths, a Meta Developer account and Business app** — [developers.facebook.com](https://developers.facebook.com/). The future Wiro-owned OAuth path will not require each customer to create an app.
- **For OAuth mode:** an HTTPS return URL that your backend controls. Meta's callback is the fixed Wiro URL shown below; `redirecturl` is where Wiro sends the browser after processing that callback. `http://localhost` and `http://127.0.0.1` are accepted for local development only.

## Recommended: System User token (no browser OAuth)

Use this path for a stable server-to-server connection owned by the customer's
Business Portfolio.

1. Open [**Meta Business Settings → Users → System Users**](https://business.facebook.com/latest/settings/system_users), then create or select a System User.
2. Assign each required ad account with both `ADVERTISE` and `ANALYZE` tasks. For Page-backed creatives, also assign the relevant Facebook Pages.
3. Generate a token for the Business app used by that System User. Choose **Never** under **Set expiration** when Meta offers it; some businesses are required to use an expiring token.
4. Grant `ads_management`, `ads_read`, and `business_management`. For Page discovery and Page-backed creatives, also grant `pages_show_list`, `pages_read_engagement`, and `pages_manage_ads`.
5. Save only the connection mode and token to Wiro:

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/CredentialUpsert" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "fields": [
      { "credentialkey": "meta-ads", "fieldname": "authmethod", "fieldvalue": "api_key" },
      { "credentialkey": "meta-ads", "fieldname": "systemusertoken", "fieldvalue": "YOUR_SYSTEM_USER_ACCESS_TOKEN" }
    ]
  }'
```

6. Ask Wiro to validate the token and discover assigned ad accounts:

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/OAuthConnect" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "credentialkey": "meta-ads",
    "authmethod": "api_key"
  }'
```

Wiro validates the token against Meta and returns only active ad accounts whose
effective `user_tasks` contain both `ADVERTISE` and `ANALYZE`. The token is
encrypted at rest and never reflected to the browser or API caller. Wiro does
not require or store an App ID/App Secret for this direct mode.

7. Persist one or more returned ad accounts with
   `POST /UserAgentOAuth/SetPickerAccounts` as shown in Step 10. API clients
   must perform this request even when only one account is returned.
8. Optionally discover and select Page mappings with
   `POST /UserAgentOAuth/DiscoverPickerItems`, then save them through the
   chained `SetPickerAccounts` shape shown in Step 10b.

## Customer-owned app OAuth

Every curl example and response shape below matches Wiro's production behavior verified against the source code. Nothing is invented.

### Step 1: Create a Meta Developer App

1. Go to [developers.facebook.com/apps](https://developers.facebook.com/apps) and click **Create app**.
2. Choose **"Other"** as the use case, then **"Business"** as the app type.
3. Set an **App display name** (this is what your end users see on the consent screen — use your company or product name, not "Wiro").
4. Enter an **App contact email**.
5. Select the **Meta Business Account** that owns the ad accounts you plan to manage, then click **Create app**.

You're now on the app dashboard. The app is in **Development Mode** by default — leave it there. Development Mode is exactly what lets you skip App Review.

### Step 2: Add the Marketing API product

1. From the app dashboard, click **Add product**.
2. Find **"Marketing API"** and click **Set up**.
3. No further configuration is required inside Marketing API itself — adding the product unlocks the `ads_*` permissions.

### Step 3: Add "Facebook Login for Business" and register the redirect URI

Meta Ads OAuth uses Facebook Login under the hood.

1. Click **Add product** again.
2. Find **"Facebook Login for Business"** and click **Set up**.
3. Left sidebar: **Facebook Login for Business → Settings**.
4. Scroll to **Valid OAuth Redirect URIs** and add exactly:

   ```
   https://api.wiro.ai/v1/UserAgentOAuth/MetaAdsCallback
   ```

5. **Save changes** at the bottom.

> This is the single most common place where own-mode setups fail. The redirect URI must be exact — HTTPS, no trailing slash, same capitalization.

### Step 4: Note the required permissions

Wiro requests these exact scopes during OAuth (sourced from `data/agent-skills-registry/credentials/meta-ads.json` under `oauth_provider.oauth_flow.scopes`):

```
ads_management,ads_read,business_management,pages_show_list,pages_read_engagement,pages_manage_ads
```

| Permission | Why Wiro requests it |
|------------|----------------------|
| `ads_management` | Create, update, and pause campaigns, ad sets, and ads. |
| `ads_read` | Read insights, performance metrics, and account metadata. |
| `business_management` | Discover and validate Business-managed assets used by the full management workflow. |
| `pages_show_list` | Discover Pages available to the connected principal for each selected ad account. |
| `pages_read_engagement` | Read page-level engagement metrics that some creative types reference. |
| `pages_manage_ads` | Use an assigned Page in Page-backed ad creatives. |

These permissions normally require App Review/Advanced Access for a multi-tenant Live Mode app. In a customer-owned app's Development Mode they work without App Review for Facebook users listed under that app's Roles. This is a testing/customer-owned fallback and does not make Wiro's future one-click shared-app path live; that path waits for Wiro's app to receive Advanced Access.

### Step 5: Copy your App ID and App Secret

**App settings → Basic** → copy the **App ID**, click **Show** next to **App Secret** and copy that too.

### Step 6: Add the users who will connect as Testers (only if they're not you)

- Connecting your own Facebook account? You're already the app Admin; skip this step.
- Connecting a different Facebook account (typical for SaaS customers)? Go to **App Roles → Roles → Add People** and invite them as **Testers** or **Developers**. They accept at [facebook.com/settings → Business Integrations](https://www.facebook.com/settings?tab=business_tools).

Users not listed in App Roles will be blocked at the consent screen in Development Mode.

### Step 7: Save your Meta App credentials to Wiro

Push the `appid` and `appsecret` into the agent's `meta-ads` credential group. Wiro merges credential updates per group — fields you don't send are preserved, and credentials from other groups are untouched.

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/CredentialUpsert" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "fields": [
      { "credentialkey": "meta-ads", "fieldname": "appid", "fieldvalue": "YOUR_META_APP_ID" },
      { "credentialkey": "meta-ads", "fieldname": "appsecret", "fieldvalue": "YOUR_META_APP_SECRET" },
      { "credentialkey": "meta-ads", "fieldname": "authmethod", "fieldvalue": "own" }
    ]
  }'
```

Successful response (sanitized — OAuth tokens, if any, are stripped):

```json
{
  "result": true,
  "useragents": [
    {
      "guid": "your-useragent-guid",
      "setuprequired": true,
      "status": 0
    }
  ],
  "errors": []
}
```

> **Prepaid deploy users:** If you deployed your agent with `useprepaid: true`, the `credentials` you passed in the Deploy body were **not** saved (prepaid deploy writes only a template placeholder). You must call this Update step explicitly before initiating OAuth.

> **Only user-writable fields are accepted.** `appid` and `appsecret` are user-writable in the `meta-ads` credential. Attempts to set platform-managed fields are silently ignored. Call `POST /UserAgent/Detail` and inspect the `meta-ads` credential block if you see a silent no-op.

### Step 8: Initiate OAuth

Start the flow with `authmethod: "own"` so Wiro uses your customer-owned `appid` and `appsecret`.

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/OAuthConnect" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "credentialkey": "meta-ads",
    "redirecturl": "https://your-app.com/settings/integrations",
    "authmethod": "own"
  }'
```

Response:

```json
{
  "result": true,
  "authorizeUrl": "https://www.facebook.com/v26.0/dialog/oauth?client_id=...&redirect_uri=https%3A%2F%2Fapi.wiro.ai%2Fv1%2FUserAgentOAuth%2FMetaAdsCallback&state=...&scope=ads_management%2Cads_read%2Cbusiness_management%2Cpages_show_list%2Cpages_read_engagement%2Cpages_manage_ads",
  "errors": []
}
```

Redirect the user's browser to `authorizeUrl`. Full-page redirect is recommended over a popup — some browsers block third-party cookies in popups, breaking the OAuth session.

> **State TTL:** Wiro caches the OAuth state for **15 minutes**. If the user takes longer to complete consent, the callback returns `metaads_error=session_expired` and you must call `OAuthConnect` again.

### Step 9: Handle the callback

After the user consents, Meta sends them back to Wiro's callback URL. Wiro exchanges the code for a long-lived token, verifies its App ID, expiry, data-access expiry, and required scopes through `debug_token`, then fetches the user's eligible ad accounts. It writes the token into the agent's config and redirects the user to **your** `redirecturl` with query parameters.

**Success URL** looks like:

```
https://your-app.com/settings/integrations?metaads_connected=true&metaads_accounts=%5B%7B%22id%22%3A%22123456789%22%2C%22name%22%3A%22My%20Ad%20Account%22%7D%5D
```

- `metaads_accounts` is `encodeURIComponent(JSON.stringify([...]))`.
- Each array element: `{ id, name }`.
- The `id` has the `act_` prefix stripped by Wiro.
- Only ad accounts with `account_status === 1` and effective `user_tasks` containing both `ADVERTISE` and `ANALYZE` are included. Read-only `ANALYZE` accounts are excluded because this skill supports mutations.

Parse in the browser:

```javascript
const params = new URLSearchParams(window.location.search);

if (params.get("metaads_connected") === "true") {
  const accounts = JSON.parse(decodeURIComponent(params.get("metaads_accounts") || "[]"));
  if (accounts.length === 0) {
    showError("No active ad accounts found on this Meta user.");
  } else if (accounts.length === 1) {
    await setAdAccount(accounts[0]);
  } else {
    presentAccountPicker(accounts);
  }
} else if (params.get("metaads_error")) {
  handleError(params.get("metaads_error"));
}
```

### Step 10: Persist the ad account selection

Persist one or more discovered ad accounts. This is **required** for the
connection to become active. The Wiro dashboard auto-selects a sole result and
opens a multi-select picker when several accounts are returned; API clients
must always call this endpoint explicitly.

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/SetPickerAccounts" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "credentialkey": "meta-ads",
    "accounts": [
      { "adaccountid": "123456789", "adaccountname": "My Ad Account" }
    ]
  }'
```

Response:

```json
{
  "result": true,
  "accounts": [
    { "id": "123456789", "name": "My Ad Account" }
  ],
  "errors": []
}
```

Behavior:

- Pass the ad account ID **without** the `act_` prefix. If you include it, Wiro strips it automatically.
- `adaccountname` is optional but recommended — it surfaces in `OAuthStatus` responses and dashboards.
- Pass multiple `{ adaccountid, adaccountname }` entries to authorize the agent against several ad accounts at once.
- If the agent was running (status `3` or `4`), Wiro marks it `status: 1` with `restartafter: true` so the daemon picks up the new ad account after the next stop cycle. No manual Start needed.

### Step 10b: Discover and select Facebook Pages (optional)

After the ad-account selection is saved, discover Pages that Meta reports as
promotable for each selected account:

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/DiscoverPickerItems" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "credentialkey": "meta-ads",
    "pickerkey": "pages"
  }'
```

Response:

```json
{
  "result": true,
  "pickerkey": "pages",
  "groups": [
    {
      "parent": {
        "adaccountid": "123456789",
        "adaccountname": "My Ad Account"
      },
      "items": [
        { "pageid": "111222333", "pagename": "My Facebook Page" }
      ]
    }
  ],
  "errors": []
}
```

Save the selected Pages within five minutes. Include every successfully
returned parent exactly once; an empty `items` array means no Page is selected
for that ad account:

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/SetPickerAccounts" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "credentialkey": "meta-ads",
    "pickerkey": "pages",
    "selections": [
      {
        "parentvalue": "123456789",
        "items": [
          { "pageid": "111222333", "pagename": "My Facebook Page" }
        ]
      }
    ]
  }'
```

The dashboard runs this chained flow automatically after ad-account selection.
It auto-selects the only Page when there is exactly one candidate; otherwise it
shows Pages grouped by ad account and permits multiple selections. The Page
step is optional, so reporting and non-Page operations remain available when
no Page is selected.

### Step 11: Verify the connection

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/OAuthStatus" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "credentialkey": "meta-ads"
  }'
```

Response:

```json
{
  "result": true,
  "connected": true,
  "accounts": [
    { "id": "123456789", "name": "My Ad Account" }
  ],
  "pagemappings": [
    {
      "adaccountid": "123456789",
      "adaccountname": "My Ad Account",
      "pageid": "111222333",
      "pagename": "My Facebook Page"
    }
  ],
  "pickersteps": {
    "pages": {
      "pickerkey": "pages",
      "optional": true,
      "configured": true,
      "groups": [
        {
          "parent": {
            "adaccountid": "123456789",
            "adaccountname": "My Ad Account"
          },
          "items": [
            { "pageid": "111222333", "pagename": "My Facebook Page" }
          ]
        }
      ]
    }
  },
  "connectedat": "2026-04-17T12:00:00.000Z",
  "tokenexpiresat": "",
  "errors": []
}
```

Field notes:

- OAuth mode requires `authmethod: "own"` and an access token. Direct mode
  requires `authmethod: "api_key"`, a validated `systemusertoken`, and a
  successful probe marker; it does not require App ID or App Secret. Both modes
  require at least one selected ad account before `connected` becomes `true`.
- `accounts[]` carries one entry per selected ad account (`id` = `adaccountid` without `act_` prefix, `name` = `adaccountname`). Empty `name` strings appear when no `adaccountname` was supplied in Step 10.
- `pickersteps.pages.groups[]` and `pagemappings[]` expose the saved Page
  selections without any access token.
- `tokenexpiresat` comes from Meta's OAuth token response. It is empty for the
  token-only System User mode because Wiro stores the supplied token unchanged.
  If an expiring System User token is used, the operator must replace it before
  Meta invalidates it.
- Meta User OAuth has no generic refresh-token contract. When a `wiro` or `own` User token expires or is invalidated, reconnect through the browser.

### Step 12: Start the agent if it's not running

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Start" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "guid": "your-useragent-guid" }'
```

Check `POST /UserAgent/Detail` first: if `setuprequired` is still `true`, some other credential the agent requires is missing — Start will refuse. See [Agent Credentials — Setup Required](/docs/agent-credentials#setup-required-state).

Agents already running when you connected Meta Ads restart automatically.

## How Meta Ads uses selected Pages

Meta Ads has no scalar/default `pageid`. Step 10b persists account-scoped
`pagemappings`, and the runtime exposes each selected ad account with its own
`pages[]` list.

- Zero Pages: only Page-backed creative creation is unavailable; reporting and
  other account operations continue.
- One Page under the target ad account: the agent uses it automatically.
- Multiple Pages: the agent requires an explicit Page ID/name in the request or
  asks the operator which Page to use. It never picks the first Page or borrows
  a Page from another ad account.

Before creating the creative, the skill verifies the chosen Page through Meta.
The connected person or System User must still have the required Page task and
the Page must be usable with the resolved ad account.

If you need organic posting (writing posts directly to a Facebook Page rather
than running ads), that's a separate integration — see the
[Facebook Page integration](/docs/integration-facebook-skills). The
`int-facebookpage-post` skill uses the `facebook-pages` credential group, not
`meta-ads`.

## API Reference

All endpoints require Wiro authentication — see [Authentication](/docs/authentication) for `x-api-key` + optional signature headers.

### POST /UserAgentOAuth/OAuthConnect

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Agent instance GUID. |
| `credentialkey` | string | Yes | `"meta-ads"`. |
| `redirecturl` | string | OAuth only | HTTPS URL (or `http://localhost` / `http://127.0.0.1` for dev) where users return after consent. Direct System User token validation does not use this field. |
| `authmethod` | string | No | `"api_key"` for the recommended System User token mode (registry default) or `"own"` for advanced customer-owned app OAuth. |

OAuth response: `{ result, authorizeUrl, errors }`. Direct System User token response: `{ result, accounts: [{id, name}], errors }` with no `authorizeUrl`. If `result: false`, inspect `errors[0].message` — common messages: `Missing useragentguid`, `Missing credentialkey`, `Missing redirecturl` (OAuth only), `Invalid redirect URL`, `User agent not found or unauthorized`, and `Meta Ads credentials not configured` (own mode without prior Update).

### GET /UserAgentOAuth/MetaAdsCallback

Server-side endpoint invoked by Meta. You don't call it — you only handle the final redirect back to your `redirecturl`. The callback path is per-provider — Meta Ads's stays `MetaAdsCallback`.

| Query param | Meaning |
|-------------|---------|
| `metaads_connected=true` | OAuth completed successfully. |
| `metaads_accounts` | URL-encoded JSON array of `{ id, name }` for active ad accounts. |
| `metaads_error=<code>` | OAuth failed. See [Troubleshooting](#troubleshooting). |

### POST /UserAgentOAuth/SetPickerAccounts

The same endpoint persists both picker stages.

Root ad-account selection:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Agent instance GUID. |
| `credentialkey` | string | Yes | `"meta-ads"`. |
| `accounts` | array | Yes | One or more `{ adaccountid, adaccountname }` entries. `adaccountid` must be without the `act_` prefix (prefix stripped automatically if sent); `adaccountname` is the display name shown in dashboards and `OAuthStatus` responses. |

Response: `{ result, accounts: [{id, name}, ...], errors }`. Triggers an automatic agent restart if the agent was running.

Chained Page selection, after `DiscoverPickerItems`:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Agent instance GUID. |
| `credentialkey` | string | Yes | `"meta-ads"`. |
| `pickerkey` | string | Yes | `"pages"`. |
| `selections` | array | Yes | One `{ parentvalue, items }` entry for every successful discovery group. `parentvalue` is the ad account ID; each item carries `pageid` and `pagename`. Empty `items` is allowed because Pages are optional. |

Response:
`{ result, pickerkey: "pages", pagemappings: [{adaccountid, adaccountname, pageid, pagename}], errors }`.

### POST /UserAgentOAuth/DiscoverPickerItems

Discovers eligible Facebook Pages grouped under the already-selected ad
accounts. This call must follow root ad-account `SetPickerAccounts`.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Agent instance GUID. |
| `credentialkey` | string | Yes | `"meta-ads"`. |
| `pickerkey` | string | Yes | `"pages"`. |

Response:
`{ result, pickerkey: "pages", groups: [{parent: {adaccountid, adaccountname}, items: [{pageid, pagename}], errorcode?}], errors }`.
Wiro keeps the active token server-side and caches only secret-free candidates
for five minutes. Call the chained `SetPickerAccounts` shape before they expire.

### POST /UserAgentOAuth/OAuthStatus

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Agent instance GUID. |
| `credentialkey` | string | Yes | `"meta-ads"`. |

Response fields:

| Field | Type | Description |
|-------|------|-------------|
| `connected` | boolean | `true` when the selected customer-owned mode has a validated credential and at least one selected ad account. **Note:** this reflects connection completion, not readiness of unrelated required credentials. Use `setupcomplete` from `POST /UserAgent/Detail` for whole-agent readiness. |
| `accounts` | array | One `{ id, name }` per selected ad account (`id` = `adaccountid` without `act_` prefix, `name` = `adaccountname`). |
| `pagemappings` | array | Flat, account-scoped Page mappings. Each entry contains `adaccountid`, optional `adaccountname`, `pageid`, and `pagename`. |
| `pickersteps.pages` | object | Grouped Page status for UI rendering: `{ pickerkey, optional, configured, groups[] }`. |
| `connectedat` | string | ISO timestamp of connection. |
| `tokenexpiresat` | string | ISO expiry for OAuth tokens. Empty for direct System User mode because Wiro stores the supplied token unchanged. |

### POST /UserAgentOAuth/OAuthDisconnect

Body: `{ useragentguid, credentialkey: "meta-ads" }`. Clears the active token,
probe marker, ad-account selection, and Page mappings. Customer-owned OAuth App
ID/App Secret values are preserved for reconnect; direct mode's
`systemusertoken` is cleared. This endpoint clears Wiro's copy, so
administrators should also revoke the app or token in Meta Business Settings
when immediate provider-side invalidation is required.

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/OAuthDisconnect" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "credentialkey": "meta-ads"
  }'
```

Response: `{ "result": true, "errors": [] }`. Running agents restart automatically.

### Token lifecycle

Wiro does not exchange or renew a direct System User token. Prefer **Never**
expiration when Meta offers it; otherwise generate a replacement and reconnect
before the token expires. User OAuth connections must be reconnected after Meta
expires or invalidates them. Raw tokens and App Secrets are never exposed to the
agent model.

## Using the Skill

Enable `int-metaads-manage` on the agent via `POST /UserAgent/SkillsApply` (see [Agent Skills → Toggling Integration Skills](/docs/agent-skills#toggling-integration-skills)). Adjust the cron of the built-in `cs-cron-performance-reporter` task (Meta Ads Manager) with `enabled` and `interval` only — the task body (`value`) is owned by the bundled integration skill and silently dropped on writes:

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/CustomSkillUpsert" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "skillkey": "cron-performance-reporter",
    "enabled": true,
    "interval": "0 9 * * *"
  }'
```

To change **what** the reporter includes (thresholds, reporting preferences, holiday markets), edit the paired preference skill `ad-strategy` instead — see [Agent Skills → Updating Preferences](/docs/agent-skills#updating-preference-skills).

## Troubleshooting

| Error code | Meaning | What to do |
|------------|---------|------------|
| `missing_params` | Callback was hit without `state` or `code`. | Don't hit the callback URL directly. Start a new flow from Step 8. |
| `session_expired` | More than 15 minutes elapsed between `OAuthConnect` and the consent return. | Call `OAuthConnect` again to refresh the state. |
| `authorization_denied` | User clicked Cancel, or Facebook returned `error=access_denied`. In Development Mode this also happens when the user isn't listed under App Roles. | Add the user as a Tester (Step 6), have them accept, retry. |
| `token_exchange_failed` | Facebook rejected the token exchange. Usually wrong App Secret, revoked app, or redirect URI mismatch. | Re-copy the App Secret from Settings → Basic, verify the redirect URI exactly matches, retry. |
| `useragent_not_found` | Wrong `useragentguid` or agent doesn't belong to your API key's user. | Fetch the correct guid with `POST /UserAgent/MyAgents`. |
| `Meta Ads credentials not configured` | Returned in `OAuthConnect`'s `errors[]` when `authmethod: "own"` but `appid` / `appsecret` are missing. | Call `POST /UserAgent/CredentialUpsert` to add `meta-ads.appid` and `meta-ads.appsecret`, then retry `OAuthConnect`. |
| `required_meta_scopes_missing` | `debug_token` did not report every scope required by the full management skill. | Grant the listed scopes to the app/token and reconnect. |
| `meta_app_mismatch` | The token was issued to a different Meta App ID. | Generate or authorize the token with the same app whose App ID and Secret were saved. |
| `meta_token_expired` | The OAuth token or its data-access window has expired. | Reconnect customer-owned OAuth. Direct mode does not use `debug_token`; replace a rejected/expired System User token in Business Settings. |
| `no_accounts` | No active account has both `ADVERTISE` and `ANALYZE` tasks. | Assign the connected principal those tasks on an active ad account in Business Settings, then reconnect. |
| `Picker candidates expired. Discover them again.` | More than five minutes elapsed after Page discovery, or the parent account connection changed. | Call `DiscoverPickerItems` again, then resubmit the Page selection. |
| `selections must include every available parent exactly once` | The Page selection omitted or duplicated a successful ad-account group. | Include one `selections[]` entry per successful `groups[]` entry; use `items: []` to select no Page for a parent. |
| `internal_error` | Unexpected server error during callback processing. | Retry once. If it persists, contact Wiro support with the timestamp and your `useragentguid`. |

### "App not verified" warning on consent

Facebook shows a yellow banner in Development Mode. This is expected and **not a blocker** — users listed under App Roles can click Continue and finish authorization. Users outside App Roles are hard-blocked.

### `connected: false` after completing OAuth

`OAuthStatus` returns `connected: true` only when the selected mode has a validated credential and at least one ad account was saved. If you skipped Step 10 (`SetPickerAccounts`), `connected` remains `false`. If account selection is complete but the status is still false, check the callback or direct-probe error and reconnect.

### Token keeps expiring

User OAuth and System User tokens do not have the same lifecycle:

- **User OAuth (`wiro` / `own`)** — reconnect through the browser after expiry or invalidation.
- **System User (`api_key`)** — choose **Never** expiration when Meta permits it. If Meta requires an expiring token, generate a replacement and reconnect before expiry. Wiro does not renew or exchange it.

## Multi-Tenant Architecture

For SaaS products connecting many customers' Meta Ads accounts through a single Wiro-powered backend:

1. **Recommended today:** use one System User token per customer-owned Business Portfolio when that operating model fits. Customer-owned OAuth remains available for interactive user authorization; Wiro-owned OAuth stays disabled until Advanced Access and rollout approval.
2. **One Wiro agent instance per customer.** Call `POST /UserAgent/Deploy` during onboarding, then complete the recommended direct steps or the advanced OAuth flow for that customer's `useragentguid`.
3. **Tokens are isolated per agent instance.** Customer A's Meta token is never visible to Customer B — they live under different `useragentguid` values.
4. **Consent branding follows the selected path.** Customer-owned OAuth shows the customer's app; the future simple path shows Wiro's reviewed app.
5. **Customer-owned Development Mode:** add each connecting user to that app's Roles. Multi-tenant use outside app roles requires the appropriate App Review/Advanced Access; do not treat Development Mode as production approval.
6. **Rate limits are per app, not per customer.** The Marketing API tier (Development → Standard → Advanced) governs aggregate call volume. See Meta's [Rate Limiting](https://developers.facebook.com/docs/graph-api/overview/rate-limiting) docs.

## Related

- [Agent Credentials & OAuth](/docs/agent-credentials) — integration catalog hub and generic OAuth reference.
- [Agent Overview](/docs/agent-overview) — deploying, starting, and lifecycle.
- [Agent Skills](/docs/agent-skills) — configuring `metaads-manage` and scheduled runs.
- [Google Ads integration](/docs/integration-googleads-skills) — for cross-platform paid campaigns.

---

# Facebook Page Integration

Connect your agent to one or more Facebook Pages with a recommended Meta
System User token or advanced customer-owned OAuth.

## Overview

The Facebook Page integration uses Meta Graph API v26 with a separate
Page-scoped access token for every selected Page. The recommended direct mode
accepts a Meta Business Manager System User token, validates it only on Wiro's
server, discovers its assigned Pages, and derives the selected Page tokens.
Neither the System User token nor the Page tokens are returned to the browser.
Customer-owned OAuth remains available as an advanced path.

**Skills that use this integration:**

- `int-facebookpage-post` — Publish text, photo, and video posts to a Facebook Page

**Agents that typically enable this integration:**

- Social Manager
- Any custom agent that needs Facebook Page posting

## Availability

| Mode | Status | Notes |
|------|--------|-------|
| `"api_key"` | **Recommended** | Enter a Business Manager System User token. No App ID, App Secret, or browser redirect is entered in Wiro. |
| `"own"` | Advanced | Use your own Meta Developer App and browser OAuth. Development Mode works for users assigned an App Role. |
| `"wiro"` | Coming soon | Wiro's shared Meta App is under review by Meta. |

## Prerequisites

- **A Wiro API key** — [Authentication](/docs/authentication).
- **A deployed agent** — [Agent Overview](/docs/agent-overview); keep the `useragents[0].guid`.
- **A Meta Business account** — [business.facebook.com](https://business.facebook.com/).
- **At least one Facebook Page assigned to the connecting principal** with the
  `CREATE_CONTENT` task. Add `MODERATE` when the agent should add comments.
- **Recommended direct mode:** a System User and the Business app used to
  generate its token.
- **Advanced OAuth mode:** a Meta Developer account, your own Business app, and
  an HTTPS callback URL for your backend.

## Recommended Setup: System User Token

This path is selected by default in the Wiro dashboard. It avoids browser OAuth
and does not require entering an App ID or App Secret in Wiro.

### Step 1: Prepare the System User and Page assets

1. Open [Meta Business Settings → Users → System Users](https://business.facebook.com/latest/settings/system_users).
2. Create or select a System User.
3. Assign every Facebook Page the agent may publish to with the
   `CREATE_CONTENT` task. Also assign `MODERATE` when the agent should add
   comments.
4. Select **Generate new token** and choose the Business app used for the
   integration.
5. At **Set expiration**, choose **Never** when Meta offers it. Some businesses
   are required to use an expiring token; reconnect Wiro with a newly generated
   token before that token expires.
6. Grant:
   - `business_management`
   - `pages_show_list`
   - `pages_read_engagement`
   - `pages_manage_posts`
   - `pages_manage_engagement` when comments are needed
   - `publish_video` when Page video publishing is needed

If a permission is absent from the token dialog, add the corresponding app use
case using Meta's
[use-case permission mapping](https://developers.facebook.com/documentation/development/create-an-app/use-cases-permission-mapping).
The Business app must not require `appsecret_proof` on every server request,
because direct mode intentionally does not collect the App Secret.

### Step 2: Save the token

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/CredentialUpsert" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "fields": [
      { "credentialkey": "facebook-pages", "fieldname": "authmethod", "fieldvalue": "api_key" },
      { "credentialkey": "facebook-pages", "fieldname": "systemusertoken", "fieldvalue": "YOUR_SYSTEM_USER_ACCESS_TOKEN" }
    ]
  }'
```

The token is encrypted and write-only. It is excluded from the agent runtime
and is never returned by customer-facing credential endpoints.

### Step 3: Validate the token and discover Pages

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/OAuthConnect" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "credentialkey": "facebook-pages",
    "authmethod": "api_key"
  }'
```

Response:

```json
{
  "result": true,
  "accounts": [
    { "id": "123", "name": "Main Page" },
    { "id": "456", "name": "Regional Page" }
  ],
  "errors": []
}
```

Only Page IDs and names are returned. Wiro keeps the System User token and all
derived Page access tokens server-side. A valid token with no assigned Page
carrying `CREATE_CONTENT` returns an error instead of an empty successful
connection.

### Step 4: Select one or more Pages

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/SetPickerAccounts" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "credentialkey": "facebook-pages",
    "accounts": [
      { "pageid": "123", "fbpagename": "Main Page" },
      { "pageid": "456", "fbpagename": "Regional Page" }
    ]
  }'
```

This finalizes the connection by matching each requested Page against the
server-side discovery result and storing only its Page-scoped runtime token.
Call it within 15 minutes of `OAuthConnect`. The dashboard auto-selects a sole
Page and opens a multi-select Page picker when several are returned. API
clients must still perform this request explicitly.

### Step 5: Verify the connection

Call `POST /UserAgentOAuth/OAuthStatus` with
`{ "useragentguid": "...", "credentialkey": "facebook-pages" }`. A successful
direct connection returns the selected Pages, `connected: true`, and an empty
`tokenexpiresat`.

## Advanced Setup: Customer-Owned OAuth

This path uses Meta's documented Facebook Login for Business flow.

### Step 1: Create a Meta Developer App

You can reuse a single Meta App for Facebook Page, Instagram, and Meta Ads.

1. [developers.facebook.com/apps](https://developers.facebook.com/apps) → **Create app** → **Other** → **Business**.
2. Enter an **App display name** (what users see on consent screens), **App contact email**, select your **Business Account**, then **Create app**.
3. Leave it in **Development Mode**.

### Step 2: Add "Facebook Login for Business" and register the redirect URI

1. **Add product** → **Facebook Login for Business** → **Set up**.
2. **Facebook Login for Business → Settings**.
3. Under **Valid OAuth Redirect URIs**, add:

   ```
   https://api.wiro.ai/v1/UserAgentOAuth/FBCallback
   ```

4. **Save changes**.

### Step 3: Note the required permissions

Wiro requests these exact scopes:

```
pages_show_list,pages_manage_posts,publish_video,pages_manage_engagement,pages_read_engagement,pages_read_user_content,pages_manage_metadata,pages_messaging
```

| Permission | Why |
|------------|-----|
| `pages_show_list` | Enumerate the Pages the user administers. |
| `pages_manage_posts` | Publish and manage Page posts and photos. |
| `publish_video` | Publish videos to a Page. |
| `pages_manage_engagement` | Add and moderate comments as the Page. |
| `pages_read_engagement` | Read likes, comments, and shares on the Page's posts. |
| `pages_read_user_content` | Read user-generated content on the Page (for context). |
| `pages_manage_metadata` | Webhook subscriptions and Page metadata. |
| `pages_messaging` | Send and receive messages on behalf of the Page (some skills use this). |

These work without App Review in Development Mode for any Facebook user in App Roles.

### Step 4: Copy your App ID and App Secret

**App settings → Basic** → copy **App ID** and **App Secret**.

### Step 5: Add other Facebook accounts as Testers (only if needed)

Connecting your own Facebook account? You're the app Admin — skip. Connecting a customer's account? Add them under **App Roles → Roles → Add People → Testers**. They accept at [facebook.com/settings → Business Integrations](https://www.facebook.com/settings?tab=business_tools).

### Step 6: Save your Meta App credentials to Wiro

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/CredentialUpsert" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "fields": [
      { "credentialkey": "facebook-pages", "fieldname": "authmethod", "fieldvalue": "own" },
      { "credentialkey": "facebook-pages", "fieldname": "appid", "fieldvalue": "YOUR_META_APP_ID" },
      { "credentialkey": "facebook-pages", "fieldname": "appsecret", "fieldvalue": "YOUR_META_APP_SECRET" }
    ]
  }'
```

Wiro merges this into only the `facebook-pages` group — other credentials are untouched.

### Step 7: Initiate OAuth

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/OAuthConnect" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "credentialkey": "facebook-pages",
    "redirecturl": "https://your-app.com/settings/integrations",
    "authmethod": "own"
  }'
```

Response:

```json
{
  "result": true,
  "authorizeUrl": "https://www.facebook.com/v26.0/dialog/oauth?client_id=...&redirect_uri=...&scope=pages_show_list%2Cpages_manage_posts%2Cpublish_video%2Cpages_manage_engagement%2Cpages_read_engagement%2Cpages_read_user_content%2Cpages_manage_metadata%2Cpages_messaging&auth_type=rerequest&response_type=code&state=...",
  "errors": []
}
```

Redirect the user's browser to `authorizeUrl`. State has a 15-minute TTL.

### Step 8: Handle the callback and list returned Pages

After consent, Wiro exchanges the code for a user access token, fetches every admin-managed Page **with its page-specific access token**, caches the full list server-side, and redirects the user to your `redirecturl`.

**Crucial:** Wiro does **not** auto-select a Page. The connection is incomplete until the client calls `SetPickerAccounts` with a chosen page. `POST /UserAgentOAuth/OAuthStatus` returns `connected: false` during this window.

**Success URL:**

```
https://your-app.com/settings/integrations?fb_connected=true&fb_pages=%5B%7B%22id%22%3A%22123%22%2C%22name%22%3A%22Page%20A%22%7D%2C%7B%22id%22%3A%22456%22%2C%22name%22%3A%22Page%20B%22%7D%5D
```

Query parameters:

| Param | Meaning |
|-------|---------|
| `fb_connected=true` | OAuth completed; credentials are cached server-side awaiting page selection. |
| `fb_pages` | URL-encoded JSON array `[{ id, name }, ...]` of every admin-managed Page. The per-page access tokens stay server-side — the client only receives ID and name. |
| `fb_error=<code>` | Failure. See [Troubleshooting](#troubleshooting). |

Parse:

```javascript
const params = new URLSearchParams(window.location.search);

if (params.get("fb_connected") === "true") {
  const pages = JSON.parse(decodeURIComponent(params.get("fb_pages") || "[]"));

  if (pages.length === 0) {
    // Shouldn't normally happen — the callback returns fb_error=no_pages if the user
    // has no Pages. But handle defensively.
    showError("No Facebook Pages to manage.");
  } else if (pages.length === 1) {
    await setPickerAccounts([pages[0]]);
  } else {
    presentPagePicker(pages);
  }
} else if (params.get("fb_error")) {
  handleError(params.get("fb_error"));
}
```

### Step 9: Persist the page selection (required)

**This step is mandatory.** The connection remains incomplete and
`OAuthStatus` reports `connected: false` until you call `SetPickerAccounts`.

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/SetPickerAccounts" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "credentialkey": "facebook-pages",
    "accounts": [
      { "pageid": "456", "fbpagename": "Page B" }
    ]
  }'
```

Response:

```json
{
  "result": true,
  "accounts": [
    { "id": "456", "name": "Page B" }
  ],
  "errors": []
}
```

Wiro validates every requested Page against the server-side discovery result,
stores its long-lived Page access token without returning it to the client, and
restarts a running agent so the new selection takes effect.

If the 15-minute window lapses before you call `SetPickerAccounts`, you'll get
`No pending Facebook connection. Please reconnect via OAuthConnect.` Repeat
Step 3 for System User mode or Step 7 for OAuth.

`fbpagename` is optional; if omitted, Wiro uses the name from the cached page list. The Facebook Pages picker accepts one or more entries — pass multiple `{ pageid, fbpagename }` objects to authorize the agent against several pages at once.

### Step 10: Verify the connection

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/OAuthStatus" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "credentialkey": "facebook-pages"
  }'
```

Response:

```json
{
  "result": true,
  "connected": true,
  "accounts": [
    { "id": "456", "name": "Page B" }
  ],
  "connectedat": "2026-04-17T12:00:00.000Z",
  "tokenexpiresat": "",
  "errors": []
}
```

- `connected: true` requires a validated active mode and at least one saved
  Page, meaning `SetPickerAccounts` completed successfully.
- `accounts[]` carries one entry per selected page (`id` = `pageid`, `name` = `fbpagename`).
- Long-lived Facebook Page tokens have no fixed expiration date. They can still be invalidated when the user changes access, removes permissions, deauthorizes the app, or changes security-sensitive account settings.

### Step 11: Start the agent if it's not running

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Start" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "guid": "your-useragent-guid" }'
```

Agents already running at `SetPickerAccounts` time restart automatically to pick up the new credentials.

## API Reference

### POST /UserAgentOAuth/OAuthConnect

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Agent instance GUID. |
| `credentialkey` | string | Yes | `"facebook-pages"`. |
| `redirecturl` | string | OAuth only | HTTPS URL (or `http://localhost` / `http://127.0.0.1` for dev). Direct System User validation does not use it. |
| `authmethod` | string | No | `"api_key"` for the recommended System User path, `"own"` for customer-owned OAuth, or `"wiro"` when Wiro-managed OAuth becomes available. Send the value explicitly. |

OAuth response: `{ result, authorizeUrl, errors }`. Direct response:
`{ result, accounts: [{id, name}], errors }` with no `authorizeUrl`.

### GET /UserAgentOAuth/FBCallback

Server-side. Query params appended to your `redirecturl`:

| Param | Meaning |
|-------|---------|
| `fb_connected=true` | OAuth completed; pending payload cached awaiting `SetPickerAccounts`. |
| `fb_pages` | URL-encoded JSON `[{id, name}, ...]` of admin-managed Pages. |
| `fb_error=<code>` | Failure. |

The callback path is per-provider — Facebook's stays `FBCallback`.

### POST /UserAgentOAuth/SetPickerAccounts

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Agent instance GUID. |
| `credentialkey` | string | Yes | `"facebook-pages"`. |
| `accounts` | array | Yes | One or more `{ pageid, fbpagename? }` entries. The per-page access token is resolved from the latest server-side OAuth or System User discovery result — don't supply it. |

Response: `{ result, accounts: [{id, name}, ...], errors }`. Triggers auto-restart if running.

> Call within **15 minutes** of the OAuth callback or direct
> `OAuthConnect` discovery. After that, restart the selected connection flow.

### POST /UserAgentOAuth/OAuthStatus

Body: `{ useragentguid, credentialkey: "facebook-pages" }`. Response: `connected` (only `true` when both `accesstoken` and `pageid` are set), `accounts: [{id, name}, ...]` (every selected Page), `connectedat`, and an empty `tokenexpiresat`.

### POST /UserAgentOAuth/OAuthDisconnect

Body: `{ useragentguid, credentialkey: "facebook-pages" }`. Clears the active
token and Page selection without remote revocation. Direct mode also clears
`systemusertoken`; customer-owned OAuth App ID and App Secret are preserved for
reconnection.

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/OAuthDisconnect" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "credentialkey": "facebook-pages"
  }'
```

### Token lifecycle

Selected Pages use long-lived Page tokens with no fixed expiration timestamp.
Meta can still invalidate them when permissions, asset assignments, app access,
or account security settings change. In direct mode, an expiring System User
token must also be regenerated before Meta's stated expiry. If either token is
invalidated, enter a current System User token or repeat customer-owned OAuth,
then select the Pages again.

## Using the Skill

Once the Facebook Page is connected, the agent uses
`int-facebookpage-post` to publish text, photo, and video posts. To adjust the
Social Manager's bundled `cs-cron-content-scanner` schedule, call
`UserAgent/CustomSkillUpsert` with `enabled` and `interval` only:

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/CustomSkillUpsert" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "skillkey": "cs-cron-content-scanner",
    "enabled": true,
    "interval": "0 */4 * * *"
  }'
```

To change **what** the scheduled task posts (topics, tone, content angle), edit
the paired preference skill `cs-content-tone` instead — see
[Agent Skills → Updating Preference Skills](/docs/agent-skills#updating-preference-skills).

## Troubleshooting

| Error code | Meaning | What to do |
|------------|---------|------------|
| `missing_params` | Callback hit without `state` or `code`. | Start a new flow from Step 7. |
| `session_expired` | >15 min between `OAuthConnect` and the callback. | Call `OAuthConnect` again. |
| `authorization_denied` | User cancelled, or not listed in App Roles (Development Mode). | Add as Tester (Step 5), retry. |
| `token_exchange_failed` | Wrong App Secret or redirect URI mismatch. | Re-copy App Secret; verify redirect URI exactly. |
| `no_pages` | User has no administered Facebook Pages. | Ask the user to create/administer a Page first, retry. |
| `useragent_not_found` | Invalid or unauthorized `useragentguid`. | Use `POST /UserAgent/MyAgents`. |
| `Facebook Pages credentials not configured` | Returned in `OAuthConnect`'s `errors[]` when `authmethod: "own"` but `appid` / `appsecret` are missing. | Call `POST /UserAgent/CredentialUpsert` with `facebook-pages.appid` and `facebook-pages.appsecret`, then retry. |
| `Meta could not validate this System User token` | Direct mode received an invalid token, missing permission, or inaccessible asset. | Generate a current System User token with the documented permissions and Page assignments, save it, and retry. |
| Valid token but no assigned Facebook Page | The System User has no Page with the `CREATE_CONTENT` task. | Assign the Page in Business Settings and reconnect. |
| `internal_error` | Unexpected server error (includes cache write failures). | Retry once. If persistent, contact support. |

### `SetPickerAccounts` returns "No pending Facebook connection"

The 15-minute pending cache expired, or you passed a `pageid` that wasn't in
the latest discovery result. Repeat Step 3 for System User mode or Step 7 for
OAuth.

### `SetPickerAccounts` returns "Selected pageid not found in pending pages list"

The `pageid` you sent doesn't match any ID in the cached list. Verify you're parsing `fb_pages` correctly and sending the exact ID string.

### Posts publish but as the wrong author

Check `POST /UserAgent/Detail` and verify `credentials.facebook-pages.pageid` is the Page you intended. If not, disconnect and reconnect, or call `SetPickerAccounts` again within a fresh 15-minute window.

### "App not verified" banner on consent

Expected in Development Mode. Users in App Roles can click Continue.

## Multi-Tenant Architecture

1. **One Wiro agent instance per customer.**
2. **Recommended direct mode:** each customer supplies a System User token from
   their own Business Portfolio. No browser consent screen or shared Wiro Meta
   app is involved.
3. **Advanced OAuth mode:** each customer-owned Meta app controls its own App
   Roles, review status, and consent branding.
4. **Every Page token is isolated** per useragent. Customer A's token is never
   returned to or shared with Customer B.
5. **Asset tasks must remain current.** Losing `CREATE_CONTENT` or `MODERATE`
   access invalidates the corresponding publish or comment capability. Monitor
   `OAuthStatus` and require reconnection when it becomes disconnected.

## Related

- [Agent Credentials & OAuth](/docs/agent-credentials)
- [Agent Overview](/docs/agent-overview)
- [Agent Skills](/docs/agent-skills)
- [Meta Ads integration](/docs/integration-metaads-skills) — separate product; used for paid media, not organic posting.
- [Instagram integration](/docs/integration-instagram-skills)
- [Meta for Developers — Pages API](https://developers.facebook.com/docs/pages-api)
- [Meta for Developers — System User API calls](https://developers.facebook.com/docs/marketing-api/system-users/guides/api-calls/)

---

# Instagram Integration

Connect your agent to one or more Instagram professional accounts with a
recommended Meta System User token, or one account through advanced
customer-owned Instagram OAuth.

## Overview

The Instagram integration supports two official Meta paths. Recommended direct
mode uses a Business Manager System User and the Facebook Pages linked to
Instagram Business or Creator accounts. It supports selecting one or more
discovered professional accounts. Advanced mode uses Instagram API with
Instagram Login directly, authorizes one account per OAuth connection, and does
not require a Facebook Page. Both paths keep tokens server-side and publish
through Graph API v26.

The two token types use different official hosts: System User mode derives a
Facebook Page access token and publishes through `graph.facebook.com/v26.0`;
Instagram Login issues an Instagram User access token and publishes through
`graph.instagram.com/v26.0`. Wiro selects the matching host automatically.

**Skills that use this integration:**

- `int-instagram-post` — Publish feed carousels, reels, and stories

**Agents that typically enable this integration:**

- Social Manager
- Any custom agent that needs Instagram publishing

## Availability

| Mode | Status | Notes |
|------|--------|-------|
| `"api_key"` | **Recommended** | Enter a Business Manager System User token. Wiro discovers eligible linked Instagram professional accounts without browser OAuth. |
| `"own"` | Advanced | Use your own Meta Business app and Instagram Login OAuth. This path does not require a linked Facebook Page. |
| `"wiro"` | Coming soon | Wiro's shared Meta App is under review. |

## Prerequisites

- **A Wiro API key** — [Authentication](/docs/authentication).
- **A deployed agent** — [Agent Overview](/docs/agent-overview); keep the `useragents[0].guid`.
- **A Meta Business account** — [business.facebook.com](https://business.facebook.com/).
- **One or more Instagram Business or Creator accounts** — personal accounts cannot use
  content publishing.
- **Recommended direct mode:** a System User, the Business app used to generate
  its token, and a Facebook Page linked to each Instagram professional account
  you want the agent to use.
- **Advanced OAuth mode:** a Meta Developer account, an app configured for
  Instagram Login, and an HTTPS callback URL. A Facebook Page is not required
  for this mode.

### Preparing the Instagram account

For recommended System User mode:

1. In the Instagram mobile app: **Settings → Account → Switch to Professional Account** → pick **Business** or **Creator**.
2. In [Meta Business Suite](https://business.facebook.com/): select the Facebook Page that should own the Instagram account → **Settings → Linked accounts → Instagram → Connect account**. Sign in with the Instagram account and grant manage permissions.

Without both steps, Facebook Graph API cannot discover the professional account
from the System User's assigned Pages.

For advanced Instagram Login OAuth, only step 1 is required. Meta's Instagram
Login flow accesses the professional account directly and does not require a
Facebook Page.

## Recommended Setup: System User Token

This is the dashboard's default path. Wiro uses the System User token only on
the server to discover assigned Pages, find their linked Instagram professional
accounts, and derive the Page access token required by the Facebook Login form
of Instagram Content Publishing.

### Step 1: Assign the Page and Instagram assets

1. Complete [Preparing the Instagram account](#preparing-the-instagram-account).
2. Open [Meta Business Settings → Users → System Users](https://business.facebook.com/latest/settings/system_users).
3. Create or select a System User.
4. Assign every linked Facebook Page the agent may use with `CREATE_CONTENT`.
5. Assign each Instagram account's **Content** task.
6. Select **Generate new token** and choose the Business app used for this
   integration.
7. At **Set expiration**, choose **Never** when Meta offers it. If Meta requires
   an expiring token for the business, regenerate and reconnect before expiry.
8. Grant:
   - `business_management`
   - `instagram_basic`
   - `instagram_content_publish`
   - `pages_show_list`
   - `pages_read_engagement`
   - `ads_read`
   - `ads_management`

Meta's Page-linked publishing contract requires both ads permissions when the
Page role is granted through Business Manager.

If a permission does not appear, add the matching app use case through Meta's
[use-case permission mapping](https://developers.facebook.com/documentation/development/create-an-app/use-cases-permission-mapping).
The Business app must not require `appsecret_proof` on every request because
direct mode does not collect its App Secret.

### Step 2: Save the token

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/CredentialUpsert" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "fields": [
      { "credentialkey": "instagram", "fieldname": "authmethod", "fieldvalue": "api_key" },
      { "credentialkey": "instagram", "fieldname": "systemusertoken", "fieldvalue": "YOUR_SYSTEM_USER_ACCESS_TOKEN" }
    ]
  }'
```

The System User token is encrypted, write-only, excluded from the agent
runtime, and never returned by customer-facing credential endpoints.

### Step 3: Validate and discover Instagram accounts

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/OAuthConnect" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "credentialkey": "instagram",
    "authmethod": "api_key"
  }'
```

Response:

```json
{
  "result": true,
  "accounts": [
    { "id": "17841400000000000", "name": "my_brand" }
  ],
  "errors": []
}
```

Only public IDs and usernames are returned. The System User and derived Page
tokens stay server-side.

### Step 4: Select the Instagram accounts

Instagram is a multi-select picker in recommended System User mode. Send one or
more entries from the latest discovery response:

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/SetPickerAccounts" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "credentialkey": "instagram",
    "accounts": [
      { "accountId": "17841400000000000", "igusername": "my_brand" },
      { "accountId": "17841400000000001", "igusername": "my_second_brand" }
    ]
  }'
```

Call this within 15 minutes of `OAuthConnect`. Wiro matches the selection
against its server-side discovery result and stores the derived Page-scoped
runtime token. The dashboard auto-selects a sole result; API clients must still
call this endpoint explicitly. If several linked professional accounts are
returned, the dashboard opens a checkbox picker and saves every selected
account with its own server-side Page token.

### Step 5: Verify the connection

Call `POST /UserAgentOAuth/OAuthStatus` with
`{ "useragentguid": "...", "credentialkey": "instagram" }`. A successful
direct connection returns every selected numeric account ID and username in
`accounts[]`, `connected: true`, and an empty `tokenexpiresat`.

## Advanced Setup: Customer-Owned Instagram OAuth

### Step 1: Create a Meta Developer App

You may reuse a compatible Business app that already has the Instagram product
configured.

1. [developers.facebook.com/apps](https://developers.facebook.com/apps) → **Create app** → **Other** → **Business**.
2. App display name, contact email, Business Account → **Create app**.
3. Leave in **Development Mode**.

### Step 2: Add the "Instagram" product

1. From the app dashboard, **Add product**.
2. Find **"Instagram"** (not "Instagram Basic Display" — that's for personal accounts and is being deprecated).
3. **Set up**.

### Step 3: Configure the OAuth redirect URI

1. Left sidebar: **Instagram → API setup with Instagram login**.
2. Scroll to **Business login settings** → **OAuth settings**.
3. Add to **Valid OAuth Redirect URIs**:

   ```
   https://api.wiro.ai/v1/UserAgentOAuth/IGCallback
   ```

4. **Save changes**.

> Note: Instagram OAuth has its own authorize URL at `instagram.com/oauth/authorize` (not `facebook.com/…`), but the redirect URI is still registered inside the Meta Developer App.

### Step 4: Note the required permissions

Wiro requests these exact scopes:

```
instagram_business_basic,instagram_business_content_publish,instagram_business_manage_messages,instagram_business_manage_comments,instagram_business_manage_insights
```

| Permission | Why |
|------------|-----|
| `instagram_business_basic` | Basic account info, profile data. |
| `instagram_business_content_publish` | Publish feed, carousel, reel, and story content. |
| `instagram_business_manage_messages` | Read and reply to DMs (used by some skills). |
| `instagram_business_manage_comments` | Read, reply, hide, delete comments. |
| `instagram_business_manage_insights` | Read engagement insights for posts and profile. |

These work without App Review in Development Mode for any Facebook user in App Roles. **No `pages_*` scopes are requested** — Instagram Login uses its own scope family.

### Step 5: Copy your App ID and App Secret

**App settings → Basic** → copy **App ID**, click **Show** → copy **App Secret**.

### Step 6: Add users as Testers (only if needed)

If the connecting person is not the app Admin, add them under **App Roles →
Roles → Add People → Testers** and have them accept before starting OAuth.

### Step 7: Save your Meta App credentials to Wiro

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/CredentialUpsert" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "fields": [
      { "credentialkey": "instagram", "fieldname": "authmethod", "fieldvalue": "own" },
      { "credentialkey": "instagram", "fieldname": "appid", "fieldvalue": "YOUR_META_APP_ID" },
      { "credentialkey": "instagram", "fieldname": "appsecret", "fieldvalue": "YOUR_META_APP_SECRET" }
    ]
  }'
```

### Step 8: Initiate OAuth

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/OAuthConnect" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "credentialkey": "instagram",
    "redirecturl": "https://your-app.com/settings/integrations",
    "authmethod": "own"
  }'
```

Response:

```json
{
  "result": true,
  "authorizeUrl": "https://www.instagram.com/oauth/authorize?client_id=...&redirect_uri=...&scope=instagram_business_basic%2Cinstagram_business_content_publish%2Cinstagram_business_manage_messages%2Cinstagram_business_manage_comments%2Cinstagram_business_manage_insights&response_type=code&state=...",
  "errors": []
}
```

### Step 9: Handle the callback

After consent, Wiro exchanges the code for a short-lived token, upgrades it to a long-lived token via `graph.instagram.com/access_token?grant_type=ig_exchange_token`, fetches the Instagram user info, and redirects the user back.

**Success URL:**

```
https://your-app.com/settings/integrations?ig_connected=true&ig_username=my_brand
```

Parse:

```javascript
const params = new URLSearchParams(window.location.search);

if (params.get("ig_connected") === "true") {
  const username = params.get("ig_username");
  showSuccess(`Connected @${username}`);
} else if (params.get("ig_error")) {
  handleError(params.get("ig_error"));
}
```

Advanced Instagram Login OAuth has **no secondary selection step**. The
authorized Instagram professional account is written directly by the callback
as a one-entry account/token array, matching the same runtime contract as
System User mode.
The `SetPickerAccounts` step applies only to recommended System User mode.

### Step 10: Verify the connection

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/OAuthStatus" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "credentialkey": "instagram"
  }'
```

```json
{
  "result": true,
  "connected": true,
  "accounts": [
    { "id": "17841400000000000", "name": "my_brand" }
  ],
  "connectedat": "2026-04-17T12:00:00.000Z",
  "tokenexpiresat": "2026-06-16T12:00:00.000Z",
  "errors": []
}
```

- `connected: true` requires the active mode's validated secret plus the
  selected or authorized Instagram account.
- Each `accounts[].id` is a selected numeric Instagram professional account ID.
- Each `accounts[].name` is its Instagram username without `@`.
- Recommended System User mode can return multiple entries. Advanced Instagram
  Login OAuth returns one entry because one account is authorized per consent.
- `tokenexpiresat` is empty for direct System User mode and approximately 60
  days for customer-owned Instagram OAuth.
- **No `refreshtokenexpiresat`** — Instagram does not expose a separate refresh token for this connection.

### Step 11: Start the agent if it's not running

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Start" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "guid": "your-useragent-guid" }'
```

## API Reference

### POST /UserAgentOAuth/OAuthConnect

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Agent instance GUID. |
| `credentialkey` | string | Yes | `"instagram"`. |
| `redirecturl` | string | OAuth only | HTTPS URL (or localhost/127.0.0.1 for dev). Direct System User validation does not use it. |
| `authmethod` | string | No | `"api_key"` for recommended System User mode, `"own"` for customer-owned Instagram OAuth, or `"wiro"` when Wiro-managed OAuth becomes available. Send the value explicitly. |

OAuth response: `{ result, authorizeUrl, errors }`. Direct response:
`{ result, accounts: [{id, name}], errors }` with no `authorizeUrl`.

### GET /UserAgentOAuth/IGCallback

Server-side. Query params appended to your `redirecturl`:

| Param | Meaning |
|-------|---------|
| `ig_connected=true` | OAuth succeeded. |
| `ig_username` | Connected Instagram handle (without `@`). |
| `ig_error=<code>` | Failure. |

The callback path is per-provider — Instagram's stays `IGCallback`.

### POST /UserAgentOAuth/SetPickerAccounts

Used only by direct System User mode after `OAuthConnect` discovery.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Agent instance GUID. |
| `credentialkey` | string | Yes | `"instagram"`. |
| `accounts` | array | Yes | One or more `{ accountId, igusername? }` entries from the latest discovery response. Do not supply access tokens. |

Call within 15 minutes of direct discovery. The response contains
`{ result, accounts: [{id, name}], errors }` and restarts a running agent after
the selection is persisted.

### POST /UserAgentOAuth/OAuthStatus

Body: `{ useragentguid, credentialkey: "instagram" }`. Response: `connected`,
`accounts: [{id, name}]` where `id` is the numeric account ID and `name` is the
username, `connectedat`, and `tokenexpiresat`.

### POST /UserAgentOAuth/OAuthDisconnect

Body: `{ useragentguid, credentialkey: "instagram" }`. Clears the active token
and selected account without remote revocation. Direct mode also clears
`systemusertoken`; customer-owned OAuth App ID and App Secret are preserved for
reconnection.

### Token lifecycle

Wiro refreshes renewable customer-owned Instagram OAuth tokens while the agent
is running. Direct mode uses a System User token plus a derived Page token with
no fixed expiry recorded by Wiro. Meta can still invalidate either token when
permissions, asset assignments, or account security change; expiring System
User tokens must be regenerated before Meta's stated expiry. If `OAuthStatus`
reports `connected: false`, reconnect using the active mode.

## Using the Skill

Once Instagram professional accounts are connected, the agent uses
`int-instagram-post` to publish feed carousels, reels, and stories. A request
must identify one account when multiple are connected; the agent never guesses
or publishes to all accounts from an ambiguous instruction. To adjust
the Social Manager's bundled `cs-cron-content-scanner` schedule, call
`UserAgent/CustomSkillUpsert` with `enabled` and `interval` only:

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/CustomSkillUpsert" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "skillkey": "cs-cron-content-scanner",
    "enabled": true,
    "interval": "0 */4 * * *"
  }'
```

To change **what** the scheduled task posts (topics, tone, hashtag rules,
caption style), edit the paired preference skill `cs-content-tone` instead —
see [Agent Skills → Updating Preference Skills](/docs/agent-skills#updating-preference-skills).

## Troubleshooting

| Error code | Meaning | What to do |
|------------|---------|------------|
| `missing_params` | Callback hit without `state` or `code`. | Start a new flow from Step 8. |
| `session_expired` | >15 min between `OAuthConnect` and callback. | Call `OAuthConnect` again. |
| `authorization_denied` | User cancelled, or not in App Roles (Development Mode). | Add as Tester (Step 6), retry. |
| `token_exchange_failed` | Wrong App Secret, redirect URI mismatch, or Instagram rejected the authorization code. | Re-copy the App Secret, verify the redirect URI, and retry Instagram Login. |
| `useragent_not_found` | Invalid or unauthorized guid. | Use `POST /UserAgent/MyAgents`. |
| `Instagram credentials not configured` | Returned in `OAuthConnect`'s `errors[]` when `authmethod: "own"` but `appid` / `appsecret` are missing. | `POST /UserAgent/CredentialUpsert` with `instagram.appid` and `instagram.appsecret`. |
| `Meta could not validate this System User token` | Direct mode received an invalid token, missing permission, or inaccessible asset. | Generate a current token with the documented permissions and asset assignments, save it, and retry. |
| Valid token but no connected Instagram professional account | No assigned Page exposes a linked professional account with `CREATE_CONTENT`. | Link the account to the Page, assign both assets to the System User, and reconnect. |
| `internal_error` | Unexpected server error. | Retry. If persistent, contact support. |

### "No Instagram Business Account found" during OAuth

In System User mode, the account is still Personal, is not linked to an
assigned Facebook Page, or the Page lacks `CREATE_CONTENT`. In advanced
Instagram OAuth mode, the usual cause is a Personal account or an app-role /
permission problem. Follow the mode-specific prerequisites above.

### Publishing fails with "media upload failed"

Common causes:

- Image resolution too low (<320px) or aspect ratio outside Instagram's allowed ranges.
- Media that does not meet Meta's current format, duration, size, or codec
  requirements.
- Instagram account switched back to Personal after connection — the token becomes invalid. Ask the user to switch back to Business and reconnect.

## Multi-Tenant Architecture

1. **One Wiro agent instance per customer.**
2. **Recommended direct mode:** each customer supplies a System User token from
   its own Business Portfolio and assigns its own Page plus Instagram assets.
3. **Advanced OAuth mode:** each customer-owned Meta app controls its own App
   Roles, review status, and Instagram consent branding.
4. **Page linkage is mode-specific.** It is mandatory for System User mode but
   not for Instagram API with Instagram Login.
5. **Tokens are isolated per useragent** and are never returned to another
   customer or to the browser.

## Related

- [Agent Credentials & OAuth](/docs/agent-credentials)
- [Agent Overview](/docs/agent-overview)
- [Agent Skills](/docs/agent-skills)
- [Facebook Page integration](/docs/integration-facebook-skills) — Page linkage is required for System User mode, not Instagram Login OAuth.
- [Meta Ads integration](/docs/integration-metaads-skills) — for Instagram-placement paid ads.
- [Meta for Developers — Instagram Graph API](https://developers.facebook.com/docs/instagram-api)
- [Meta for Developers — Content Publishing API comparison](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/content-publishing/)

---

# Shopify Integration

Connect a Wiro agent to Shopify's official GraphQL Admin API 2026-07 to manage products, variants, inventory, orders, customers, discounts, collections, and fulfillments.

## Overview

The Shopify integration powers the `shopify-manage` skill. It uses only the official GraphQL Admin API pinned to `2026-07`; the REST Admin API, `latest`, `unstable`, and release-candidate schemas are outside the contract.

**Available connection modes:**

| Mode | Status | Best for |
|------|--------|----------|
| Client ID + Secret (`"api_key"`) | Available | Server-to-server automation when the Dev Dashboard app and store belong to the same Shopify organization. Tokens report `expires_in: 86399` and are re-exchanged before expiry. |
| Customer-owned app OAuth (`"own"`) | Available | Apps installed on merchant stores in another organization. Uses an expiring offline access token plus rotating refresh token. |

Wiro does not provide a shared Shopify OAuth app. Both modes use customer-owned credentials.

## Prerequisites

- A deployed Wiro agent with the `shopify-manage` skill enabled.
- A Shopify store and permission to install or create apps.
- The canonical store hostname, for example `example-store.myshopify.com`. Custom storefront domains are not accepted for Admin API authentication.

## Option A: Client ID + Secret

### 1. Create and install a Dev Dashboard app

In Shopify's Dev Dashboard:

1. Create an app in the same Shopify organization as the target store.
2. Configure only the Admin API scopes the agent needs.
3. Release an app version and install it on the store.
4. Copy the Client ID and Client Secret from the app's **Settings** page.

Product, inventory, order, customer, discount, fulfillment, and location operations require their matching read/write scopes. The app can do only what its granted scopes and the installing staff account permit.

Shopify's client-credentials grant works only when both the app and store belong to the same organization. For a merchant store in another organization, use Option B.

### 2. Save the store and app credentials

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/CredentialUpsert" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "fields": [
      { "credentialkey": "shopify", "fieldname": "authmethod", "fieldvalue": "api_key" },
      { "credentialkey": "shopify", "fieldname": "shopdomain", "fieldvalue": "example-store.myshopify.com" },
      { "credentialkey": "shopify", "fieldname": "clientid", "fieldvalue": "YOUR_SHOPIFY_CLIENT_ID" },
      { "credentialkey": "shopify", "fieldname": "clientsecret", "fieldvalue": "YOUR_SHOPIFY_CLIENT_SECRET" }
    ]
  }'
```

### 3. Validate the connection

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/OAuthConnect" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "credentialkey": "shopify",
    "authmethod": "api_key"
  }'
```

This is a server-side credential exchange and probe, not a browser redirect. Wiro submits the Shopify client-credentials form (`grant_type=client_credentials`, Client ID, and Client Secret) to the canonical shop, receives an access token whose `expires_in` is exactly `86399` seconds, verifies the shop identity, and stores the connection. Running agents re-exchange the client credentials before expiry; the Client Secret is never sent to the GraphQL Admin API.

## Option B: Customer-owned app OAuth

### 1. Configure the Shopify app

Create or select the customer's app in the Shopify Dev Dashboard and add this exact redirect URL:

```text
https://api.wiro.ai/v1/UserAgentOAuth/ShopifyCallback
```

The authorization-code grant requests an **expiring offline** token. Wiro validates the callback before exchanging the code:

- the callback HMAC is computed with the app's Client Secret over the alphabetically sorted callback query fields after removing `hmac` and `signature`;
- comparison is timing-safe, and the callback `state` and canonical `shop` must match the connection that Wiro started;
- the authorization code is sent only to that shop's `/admin/oauth/access_token` endpoint as `application/x-www-form-urlencoded`, with `expiring=1`.

This callback-query HMAC is not Shopify's webhook-signature format, and it is not computed over the token form body.

### 2. Save app credentials

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/CredentialUpsert" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "fields": [
      { "credentialkey": "shopify", "fieldname": "authmethod", "fieldvalue": "own" },
      { "credentialkey": "shopify", "fieldname": "shopdomain", "fieldvalue": "example-store.myshopify.com" },
      { "credentialkey": "shopify", "fieldname": "clientid", "fieldvalue": "YOUR_SHOPIFY_CLIENT_ID" },
      { "credentialkey": "shopify", "fieldname": "clientsecret", "fieldvalue": "YOUR_SHOPIFY_CLIENT_SECRET" }
    ]
  }'
```

### 3. Start OAuth

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/OAuthConnect" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "credentialkey": "shopify",
    "authmethod": "own",
    "redirecturl": "https://your-app.example/settings/integrations"
  }'
```

Open the returned `authorizeUrl` in the user's browser. After consent, Wiro exchanges the code for an expiring offline access token and refresh token, records both provider expiry values, verifies the shop through GraphQL, and redirects to your `redirecturl` with `shopify_connected=true`. Refresh uses `grant_type=refresh_token`; Shopify can rotate both tokens, so Wiro stores each replacement atomically rather than reusing an old refresh token.

## Check or disconnect

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/OAuthStatus" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "useragentguid": "your-useragent-guid", "credentialkey": "shopify" }'
```

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/OAuthDisconnect" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "useragentguid": "your-useragent-guid", "credentialkey": "shopify" }'
```

## Runtime behavior

- Endpoint: `https://{shop}.myshopify.com/admin/api/2026-07/graphql.json`
- Authentication: `X-Shopify-Access-Token`
- Client-credentials tokens report `expires_in: 86399` and are re-exchanged automatically before expiry.
- Customer-owned OAuth uses expiring offline access and refresh tokens. Wiro refreshes and atomically replaces the pair before the access token expires; reconnect is required if the refresh authorization expires or is revoked.
- Reads are paginated with GraphQL cursors.
- Every mutation checks both top-level `errors` and mutation-specific `userErrors`.
- Products are created as drafts unless publication is explicitly requested.
- Missing scopes are treated as hard permission boundaries; the agent does not switch authentication methods or attempt a workaround.

## Mutation safety

- **Compare-and-set inventory:** `inventorySetQuantities` includes the last-read quantity for each inventory item/location. A stale comparison stops the write; Wiro re-reads state instead of bypassing the conflict.
- **Scoped idempotency:** Wiro reuses one stable key only for mutations whose 2026-07 schema documents native idempotency. It does not attach an idempotency directive to arbitrary GraphQL mutations.
- **Ambiguous outcomes:** timeout, disconnect, throttle, or 5xx after transmission is `unknown`, not an automatic retry. Wiro queries the natural resource key and reconciles remote state first.
- **Collections:** membership changes use only collection mutations supported by the 2026-07 schema. Deprecated legacy collection add/remove operations are not used.
- **Protected customer data:** nominal customer scopes may still require Shopify protected-customer-data approval and staff permissions. Wiro requests the minimum fields needed and does not put customer PII, addresses, order details, or payment data into its mutation ledger.

## Related

- [Agent Credentials & OAuth](/docs/agent-credentials)
- [Agent Skills](/docs/agent-skills)
- [Shopify Admin API access scopes](https://shopify.dev/docs/api/usage/access-scopes)
- [Shopify client-credentials grant](https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens/client-credentials-grant)
- [Shopify authorization-code grant](https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens/authorization-code-grant)

---

# WooCommerce Integration

Connect a Wiro agent directly to a WooCommerce store with a REST API consumer key and secret.

## Overview

The `woocommerce-manage` skill uses WooCommerce's official, current recommended WP REST API namespace, `wc/v3`, to work with products, variations, taxonomy, inventory, orders, refunds, coupons, customers, reports, and supported store settings.

| Mode | Status | Notes |
|------|--------|-------|
| Consumer key + consumer secret | Available | Direct HTTPS Basic Authentication. No OAuth app or browser redirect. |

## Prerequisites

- A deployed Wiro agent with the `woocommerce-manage` skill enabled.
- A public HTTPS WooCommerce store with REST API routing enabled.
- A WordPress user with the minimum permissions needed for the requested operations.

## Setup

### 1. Create a WooCommerce REST API key

In WordPress Admin:

1. Open **WooCommerce → Settings → Advanced → REST API**.
2. Select **Add key**.
3. Choose the WordPress user the agent should act as.
4. Choose **Read/Write** only if the agent must modify the store; otherwise use **Read**.
5. Generate the key and copy both the consumer key and consumer secret.

### 2. Save credentials

Use the store's public base URL. Keep an existing WordPress subdirectory, but omit `/wp-json/wc/v3`, query strings, fragments, and the trailing slash.

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/CredentialUpsert" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "fields": [
      { "credentialkey": "woocommerce", "fieldname": "storeurl", "fieldvalue": "https://store.example.com" },
      { "credentialkey": "woocommerce", "fieldname": "consumerkey", "fieldvalue": "ck_..." },
      { "credentialkey": "woocommerce", "fieldname": "consumersecret", "fieldvalue": "cs_..." }
    ]
  }'
```

### 3. Start or restart the agent

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Start" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "guid": "your-useragent-guid" }'
```

## Credential fields

| Field | Type | Description |
|-------|------|-------------|
| `storeurl` | string | Public HTTPS store URL, without the WooCommerce REST path. |
| `consumerkey` | secret string | WooCommerce consumer key, normally beginning with `ck_`. |
| `consumersecret` | secret string | WooCommerce consumer secret, normally beginning with `cs_`. |

## Runtime behavior

- Base endpoint: `{storeurl}/wp-json/wc/v3`
- Authentication: HTTPS Basic Auth with the consumer key and secret.
- Credentials are never added to URL query parameters.
- Collection endpoints use page-number pagination and inspect `X-WP-TotalPages`.
- The agent reads the current resource before a write and verifies the resource after a successful mutation.
- Ambiguous create/update outcomes are reconciled by reading remote state before any retry. WooCommerce has no universal idempotency header.
- Refund amount, currency, line items, restock behavior, and gateway behavior must be explicit; the agent does not infer them.

### Products, inventory, and batch requests

- Product and variation writes use documented fields such as `manage_stock`, `stock_quantity`, `stock_status`, and `backorders`. Wiro does **not** treat `low_stock_amount` as a supported product/variation mutation field.
- `POST /products/batch` accepts `create`, `update`, and `delete` arrays. It is a convenience batch, not one atomic transaction: inspect every returned array item, and reconcile each item independently.
- A top-level 2xx response does not mean every batch item succeeded. Do not retry the whole batch after a partial or ambiguous result; retrying confirmed successes can duplicate creates.
- WooCommerce has no universal idempotency-key header. Wiro uses natural keys such as SKU/slug, records one ledger entry per item, and reads remote state before retrying an uncertain write.

### Settings

- Read groups with `GET /settings`, group options with `GET /settings/{group_id}`, and one option with `GET /settings/{group_id}/{option_id}`.
- Update one writable option with `PUT /settings/{group_id}/{option_id}`.
- Batch-update writable options in one group with `POST /settings/{group_id}/batch` and an `update` array. This endpoint does not create or delete arbitrary settings.
- Payment gateways and shipping zones are separate resources, not generic setting options.

### Errors and rate limits

WooCommerce/WordPress errors use the HTTP status plus a JSON object shaped like `{ code, message, data }`; `data.status` commonly repeats the status. For batch calls, also inspect each returned item.

Core `wc/v3` does not publish one built-in global request quota or standardized rate-limit header contract. A store, host, WAF, reverse proxy, or plugin can still return `429`. When it does, honor `Retry-After` or another explicit reset header if present; otherwise stop and retry later with conservative backoff. Do not copy the optional WooCommerce **Store API** `RateLimit-*` contract onto `wc/v3`.

## Troubleshooting

- **400:** The payload, field, or state transition is invalid. Read the response's `code`, `message`, and `data`; do not infer success from a partially populated object.
- **401:** The key/secret is invalid, revoked, or belongs to a different store.
- **403:** The key's WordPress user or permission level cannot access the resource.
- **404 under `/wp-json/wc/v3`:** The store URL or WordPress subdirectory is wrong, WooCommerce REST routing is unavailable, or permalinks need configuration.
- **409:** The resource changed or conflicts with current state. Re-read it before deciding whether a new write is appropriate.
- **429:** A store-specific limiter blocked the request. Follow the headers that store actually returned; `wc/v3` itself does not guarantee `Retry-After`.
- **5xx or transport timeout after a write:** The outcome is unknown. Reconcile by resource ID or natural key before any retry.
- **WAF or reverse proxy failures:** Allow authenticated requests to the WooCommerce REST route without redirecting to another hostname.

## Related

- [Agent Credentials & OAuth](/docs/agent-credentials)
- [Agent Skills](/docs/agent-skills)
- [WooCommerce REST API documentation](https://woocommerce.github.io/woocommerce-rest-api-docs/)

---

# Reddit Integration

Technical contract for connecting a Wiro agent to Reddit with a customer-owned Reddit web app. The endpoints remain documented, but the feature is not available until Reddit approves Wiro's commercial use and a written commercial contract is in force.

## Overview

The `reddit-post` skill supports:

- connected-user identity;
- subscribed and contributor subreddits;
- subreddit rules;
- text and link submissions;
- comments and replies;
- editing or deleting only content authored by the connected Reddit identity.

Voting, private messages, chat, moderation queues, bulk posting, mass cross-posting, scraping, and browser automation are out of scope.

> **Unavailable pending Reddit approval.** Wiro is a commercial product. A checkbox or customer-owned app does not authorize commercial Data API use. Wiro will not enable this integration until Reddit has granted explicit Data API approval for the use case and both parties have completed the required written commercial contract.

## Availability and policy requirements

| Mode | Status | Notes |
|------|--------|-------|
| Customer-owned OAuth app (`"own"`) | Unavailable pending Wiro approval/contract | The authorization-code endpoints and callback contract are implemented, but production access remains disabled. |
| Wiro shared app | Not offered | Each operator supplies and controls its own Reddit app. |
| Permanent pasted bearer token | Not supported | Access and refresh tokens are managed by the OAuth callback. |

The prerequisites are cumulative:

1. Reddit Data API approval for Wiro's described use case.
2. Reddit's explicit written commercial approval and completed contract.
3. A registered developer profile and visible App profile label.
4. A dedicated app account used only for app functions, not a mixed-use personal account.
5. A customer-owned Reddit `web app` registered with the Wiro callback.

Wiro's `apiaccessapproved: true` field is only an operator attestation. It grants no rights, does not replace Reddit review or the commercial contract, and does not make the currently unavailable feature usable.

## Prerequisites

- A deployed Wiro agent with the `reddit-post` skill enabled.
- A dedicated Reddit app account.
- A customer-owned Reddit app created as type **web app**.
- A registered Reddit developer profile and App profile label that accurately describes the app and its commercial purpose.
- Confirmed Reddit Data API approval plus Wiro's written commercial contract with Reddit.

## Technical setup after approval

The requests below describe the hard-cutover API contract for rollout readiness. They do not bypass the availability gate above.

### 1. Create the Reddit web app

Create the app in Reddit's developer settings and use this exact redirect URI:

```text
https://api.wiro.ai/v1/UserAgentOAuth/RedditCallback
```

Copy the app's client ID and client secret. The developer profile, App profile label, and dedicated app account must remain attached to this app; do not create duplicate accounts or apps to evade review or limits.

### 2. Save app credentials and the operator attestation

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/CredentialUpsert" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "fields": [
      { "credentialkey": "reddit", "fieldname": "authmethod", "fieldvalue": "own" },
      { "credentialkey": "reddit", "fieldname": "clientid", "fieldvalue": "YOUR_REDDIT_CLIENT_ID" },
      { "credentialkey": "reddit", "fieldname": "clientsecret", "fieldvalue": "YOUR_REDDIT_CLIENT_SECRET" },
      { "credentialkey": "reddit", "fieldname": "apiaccessapproved", "fieldvalue": true }
    ]
  }'
```

### 3. Start OAuth

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/OAuthConnect" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "credentialkey": "reddit",
    "authmethod": "own",
    "redirecturl": "https://your-app.example/settings/integrations"
  }'
```

Open the returned `authorizeUrl` in the user's browser. Wiro requests these scopes:

```text
identity read mysubreddits submit edit history
```

`history` is used only for bounded recovery: after an ambiguous create/reply outcome, Wiro may inspect at most the connected user's latest 25 submissions/comments to determine whether the write landed. It is not permission for broad history collection.

The flow requests `duration=permanent`, allowing Wiro to refresh the one-hour access token with the callback-managed refresh token. After consent, the browser returns to your `redirecturl` with `reddit_connected=true` and the connected username. Production OAuth remains blocked until Wiro's approval/contract gate is complete.

## Check or disconnect

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/OAuthStatus" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "useragentguid": "your-useragent-guid", "credentialkey": "reddit" }'
```

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/OAuthDisconnect" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "useragentguid": "your-useragent-guid", "credentialkey": "reddit" }'
```

## Runtime safeguards

- Authenticated API calls use `https://oauth.reddit.com`; OAuth token calls use `https://www.reddit.com`.
- Every request includes the compliant, distinctive User-Agent `Wiro-Agent-Reddit/1.0 client/<CLIENT_ID> (+https://wiro.ai)`. Wiro does not use a browser/default User-Agent or misidentify the client.
- The agent reads subreddit rules before a write.
- One approval covers one concrete subreddit or fullname and one payload. A request to post everywhere is refused.
- The agent blocks duplicate and near-duplicate submissions and does not fan a single payload out across communities.
- Edits and deletes require a fresh ownership check against the connected Reddit username.
- Ambiguous write outcomes are not automatically retried.
- Recovery reads are bounded to the latest 25 items and require the `history` scope; no scraping or broad history retention is permitted.

## Rate limits

Reddit documents OAuth limits through the response headers:

- `X-Ratelimit-Used`
- `X-Ratelimit-Remaining`
- `X-Ratelimit-Reset` (seconds until reset)

The 100 queries-per-minute OAuth-client limit, averaged over a 10-minute window, applies only to clients that Reddit has found eligible for free Data API access. It is not a commercial entitlement. Wiro follows the limits and commercial terms assigned by Reddit; response headers and the executed contract are authoritative. Calls are sequential, and Wiro enters cooldown on HTTP 429 or a Reddit `RATELIMIT` error without retrying before reset.

## Deletion and retention obligations

- Wiro stores only bounded mutation/recovery metadata needed to prevent duplicate writes; it does not build or retain a broad Reddit history dataset.
- If a Reddit post or comment is deleted, all retained title, body, URL, and related content must be removed. If an account is deleted, retained user IDs and author-identifying references must also be removed.
- De-identified or anonymized copies of deleted Reddit content are not retained as a workaround.
- Stored Reddit data is routinely minimized and deletion checks follow Reddit's contract and compliance tooling; Reddit recommends removing stored user data/content within 48 hours.
- Disconnecting the integration stops new access but does not weaken obligations to honor content/account deletions already received.

## Related

- [Agent Credentials & OAuth](/docs/agent-credentials)
- [Agent Skills](/docs/agent-skills)
- [Reddit Developer Terms](https://redditinc.com/policies/developer-terms)
- [Reddit Data API Terms](https://redditinc.com/policies/data-api-terms)
- [Reddit API rules](https://github.com/reddit-archive/reddit/wiki/API)

---

# Organizations & Teams

Collaborate with your team under a shared workspace with unified billing, access controls, and resource management.

## Overview

Wiro supports three workspace contexts for organizing your resources:

- **Personal** — your default workspace. Projects, agents, and wallet are tied to your individual account.
- **Organization** — a parent entity that groups one or more teams. The organization owner controls the lifecycle of teams and their members.
- **Team** — a workspace under an organization with its own wallet, projects, agents, and member permissions. Team members share access to resources deployed within the team.

```
Personal Account
├── Personal Projects
├── Personal Agents
└── Personal Wallet

Organization (created by you)
├── Team A
│   ├── Team Wallet
│   ├── Team Projects
│   ├── Team Agents
│   └── Members (owner, admins, members)
├── Team B
│   ├── Team Wallet
│   ├── Team Projects
│   ├── Team Agents
│   └── Members
└── ...
```

Every user always has a personal workspace. Organizations and teams are optional — you can use Wiro entirely in personal mode without ever creating an organization.

## Key Concepts

### Workspaces and Context

When you make an API request or use the dashboard, you operate in one of two contexts:

| Context | Resources you see | Wallet charged | How to activate |
|---------|-------------------|----------------|-----------------|
| **Personal** | Your personal projects, agents, tasks | Your personal wallet | Default — use a personal project API key |
| **Team** | Team projects, team agents, team tasks | Team wallet | Use a team project API key |

Switching context changes which projects, agents, and wallet you interact with. Resources in one context are isolated from the other — personal agents cannot see team projects, and team agents cannot access personal resources.

### Resource Isolation

Each workspace is fully isolated:

- **Projects** belong to either your personal workspace or a specific team. A project's API key automatically resolves the correct context.
- **Agents** are deployed into a workspace. Team agents are visible to all team members; personal agents are visible only to you.
- **Wallet transactions** are recorded against the workspace that initiated them. Team tasks deduct from the team wallet; personal tasks deduct from your personal wallet.
- **Tasks** are tagged with the workspace context and only appear in the matching project usage and statistics views.

### Transferring Resources

Projects and agents can be transferred between workspaces:

- **Personal → Team** — move a project or agent from your personal workspace into a team you have admin access to
- **Team → Personal** — move a project or agent from a team back to your personal workspace
- **Team → Team** — move a project or agent between teams you have admin access to in the same or different organizations

When a resource is transferred, its billing context changes immediately. Future tasks on a transferred project will be billed to the new workspace's wallet. Transfer operations are available in the dashboard and via the API.

> **Important:** Agents can only access projects in the same workspace. If you transfer a project out of a team, agents in that team can no longer use it.

## Organizations vs Teams

An **organization** is a management container — it does not hold resources directly. All resources (projects, agents, wallets) live inside **teams**.

| Feature | Organization | Team |
|---------|-------------|------|
| Holds projects and agents | No | Yes |
| Has a wallet | No | Yes |
| Has members | No (members belong to teams) | Yes |
| Can be created by | Any user | Organization owner |
| Can be deleted by | Organization owner | Organization owner |
| Can be restored | Yes (by owner) | Yes (when org is restored) |

A single user can own multiple organizations, and each organization can contain multiple teams.

## Roles

| Role | Scope | Permissions |
|------|-------|-------------|
| **Owner** | Organization | Create/delete teams, manage all team members, delete/restore organization, transfer agents and projects |
| **Admin** | Team | Manage team settings (spend limits, model access), invite/remove members, transfer agents and projects |
| **Member** | Team | Use team resources (run models, send agent messages), view spending summaries |

The organization creator is automatically the owner. When a team is created, the organization owner is added as an implicit admin. Additional members are invited via email and must accept the invitation to join.

## Getting Started

1. **Create an organization** — go to your [Dashboard](https://wiro.ai/panel/organization) and click "Create Organization"
2. **Create a team** — inside the organization, create a team with a name
3. **Invite members** — send email invitations to your teammates
4. **Fund the team wallet** — deposit credits or redeem coupons in the team context
5. **Create projects** — create API projects within the team to start running models
6. **Deploy agents** — deploy agent instances within the team for shared access

For step-by-step instructions, see [Managing Teams](/docs/organizations-managing-teams).

## What's Next

- [Managing Teams](/docs/organizations-managing-teams) — Create organizations, invite members, manage roles and permissions
- [Team Billing & Spending](/docs/organizations-billing) — Wallets, spend limits, model access controls, and budget alerts
- [Team API Access](/docs/organizations-api-access) — How workspace context works with API keys and context guards

---

# Managing Teams

Create organizations, invite members, and manage roles and permissions.

## **POST** /Organization/Create

Creates a new organization. The caller automatically becomes the organization **owner** — only the owner can create teams, delete the organization, or restore it after deletion.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes | Organization name |

```json
// Response
{
  "result": true,
  "errors": [],
  "organization": {
    "guid": "1b43089c-3b56-4638-b4ac-24268bb1d970",
    "name": "Acme Corp",
    "status": 1
  }
}
```

You can also create organizations from the [Dashboard](https://wiro.ai/panel/organization).

## **POST** /Team/Create

Creates a team inside an organization. Only the organization owner can create teams. The team is created with its own wallet (starting at $0.00) and the caller is automatically added as an admin.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `organizationguid` | string | Yes | Organization guid |
| `name` | string | Yes | Team name |

```json
// Response
{
  "result": true,
  "errors": [],
  "team": {
    "guid": "0d9aade4-d31b-4b97-88f3-a90482f080ea",
    "name": "Engineering",
    "organizationguid": "1b43089c-3b56-4638-b4ac-24268bb1d970",
    "status": 1
  }
}
```

## **POST** /Team/Member/Invite

Sends an email invitation to add a new member to the team. Invitations expire after 7 days and can be resent. Organization owners and team admins can invite members.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `teamguid` | string | Yes | Team guid |
| `email` | string | Yes | Invitee email address |
| `role` | string | Yes | Role: `"admin"` or `"member"` |

```json
// Response
{
  "result": true,
  "errors": [],
  "member": {
    "email": "teammate@example.com",
    "role": "member",
    "status": "pending"
  }
}
```

### Invitation States

| Status | Description |
|--------|-------------|
| `pending` | Invitation sent, waiting for the user to accept |
| `active` | User accepted the invitation and is an active member |
| `removed` | Member was removed or invitation was cancelled |

## **POST** /Team/Member/Accept

When a user clicks the invitation link, they are directed to the Wiro dashboard. If they already have an account, they are added to the team immediately. If not, they are prompted to sign up first.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `token` | string | Yes | Invitation token from the email link |

## Member Roles

| Role | Can run models | Can message agents | Can view spending | Can manage settings | Can invite members | Can remove members | Can delete team |
|------|---------------|-------------------|-------------------|--------------------|--------------------|-------------------|-----------------|
| **Owner** | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| **Admin** | Yes | Yes | Yes | Yes | Yes | Yes | No |
| **Member** | Yes | Yes | Yes | No | No | No | No |

The organization owner is always an implicit admin of every team in the organization. The owner role cannot be transferred.

## **POST** /Team/Member/List

Lists all members of a team, including pending invitations.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `teamguid` | string | Yes | Team guid |

```json
// Response
{
  "result": true,
  "errors": [],
  "members": [
    {
      "useruuid": "86ae3c1d-edd1-4c2e-ba19-d1a3a23eeca4",
      "role": "admin",
      "status": "active",
      "username": "johndoe",
      "email": "john@example.com",
      "avatar": "https://cdn.wiro.ai/avatars/johndoe.webp"
    },
    {
      "useruuid": null,
      "role": "member",
      "status": "pending",
      "inviteemail": "jane@example.com"
    }
  ]
}
```

## **POST** /Team/Member/Remove

Removes a member from the team. Organization owners and team admins can remove members. A removed member immediately loses access to the team's resources. Removed members can be re-invited later if needed.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `teamguid` | string | Yes | Team guid |
| `useruuid` | string | Yes | UUID of the member to remove |

## **POST** /Team/Member/UpdateRole

Updates a member's role. Team admins and the organization owner can change a member's role between **admin** and **member**.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `teamguid` | string | Yes | Team guid |
| `useruuid` | string | Yes | UUID of the member |
| `role` | string | Yes | New role: `"admin"` or `"member"` |

## **POST** /Team/Remove

Deletes a team. Only the organization owner can delete a team. Deleting a team:

- Soft-deletes the team (sets status to `0`)
- Removes all team members
- Transfers all team agents to the owner's personal workspace
- Transfers all team projects to the owner's personal workspace
- Invalidates project caches for transferred projects

The team's wallet balance is not automatically transferred. Contact support if you need to recover the balance.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `teamguid` | string | Yes | Team guid |

## **POST** /Organization/Remove

Deletes an organization. Only the organization owner can delete an organization. This soft-deletes the organization and all its teams, following the same process as deleting each team individually.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `organizationguid` | string | Yes | Organization guid |

## **POST** /Organization/Restore

Restores a soft-deleted organization. Restoring an organization:

- Reactivates the organization and all its teams
- Restores accepted members to active status
- Expired or cancelled invitations remain removed (they must be re-invited)

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `organizationguid` | string | Yes | Organization guid |

## **POST** /Organization/List

Returns all organizations you belong to, including active and deleted ones.

```json
// Response
{
  "result": true,
  "errors": [],
  "organizations": [
    {
      "organizationguid": "1b43089c-3b56-4638-b4ac-24268bb1d970",
      "organizationname": "Acme Corp",
      "organizationstatus": 1,
      "isowner": true,
      "teams": [
        {
          "teamguid": "0d9aade4-d31b-4b97-88f3-a90482f080ea",
          "teamname": "Engineering",
          "teamstatus": 1,
          "role": "admin",
          "walletbalance": 142.50
        }
      ]
    }
  ]
}
```

## **POST** /Team/TransferAgent

Transfers an agent instance between workspaces — personal to team, team to personal, or team to team. You must be an admin in both the source and target context.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Agent instance guid |
| `targetteamguid` | string | Yes | Target team guid, or empty string `""` for personal |

When an agent is transferred:
- The agent's `teamguid` is updated
- Active subscriptions and credit purchases move with the agent
- The agent is restarted with the new context
- Future billing is charged to the new workspace's wallet

## **POST** /Team/TransferProject

Transfers a project between workspaces. Future tasks on the project are billed to the new workspace's wallet.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `projectapikey` | string | Yes | Project API key |
| `targetteamguid` | string | Yes | Target team guid, or empty string `""` for personal |

When a project is transferred:
- The project's `teamguid` is updated
- The project cache is invalidated
- Future tasks using this project's API key are billed to the new workspace

> **Important:** Agents can only access projects in the same workspace. Transferring a project may break agent workflows that depend on it.

## Transferring Credit

Credit can be transferred between your personal wallet and team wallets. Transfers preserve original deposit expiry dates and coupon tracking. See [Team Billing & Spending → Credit Transfer](/docs/organizations-billing) for full details.

## What's Next

- [Organizations & Teams Overview](/docs/organizations-overview) — Concepts and workspace hierarchy
- [Team Billing & Spending](/docs/organizations-billing) — Wallets, spend limits, and model access controls
- [Team API Access](/docs/organizations-api-access) — How context works in API requests

---

# Team Billing & Spending

Manage team wallets, set spend limits, control model access, and track usage across members.

## Team Wallets

Each team has its own wallet, independent of members' personal wallets. When a task runs in a team context, the cost is deducted from the team wallet — never from the individual member's personal wallet.

### Funding a Team Wallet

Team wallets are funded the same way as personal wallets:

- **Deposits** — add credit via the dashboard or API while in the team context
- **Coupons** — redeem coupon codes that are assigned to the team
- **Auto-pay** — configure automatic deposits when the balance drops below a threshold

To fund a team wallet, switch to the team context in the dashboard and navigate to **Wallet**. All deposit and coupon operations target the active workspace.

### Checking the Balance

The team wallet balance is visible on the [Organization page](https://wiro.ai/panel/organization) next to each team, and on the team's wallet page. When calling `/Wallet/List` with a team project API key, this returns the team wallet balances instead of your personal wallet.

## Spend Limits

Admins can set spend limits at two levels to control costs:

| Limit Type | Set by | Applies to | Effect when reached |
|-----------|--------|------------|---------------------|
| Team spend limit | Admin / Owner | Entire team | All tasks rejected for all members |
| Member spend limit | Admin / Owner | Individual member | Tasks rejected for that member only |

When a team's total spending reaches 80% of the team spend limit, admins receive an email alert. This gives you time to increase the limit or pause operations before tasks start failing.

Team-level limits are set via `/Team/Update` (see below). Member-level limits are set via `/Team/Member/UpdateRole` with the `spendlimit` parameter.

## **POST** /Team/Update

Updates team settings, including model access controls and team-level spend limit. Team admins can restrict which AI models team members are allowed to run by setting `modelaccess` to one of three modes.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `teamguid` | string | Yes | Team guid |
| `spendlimit` | number | No | Team-level spend limit in USD. Set to `0` or `null` to remove. |
| `modelaccess` | string | No | Access mode: `"all"`, `"allowlist"`, or `"blocklist"`. Default: `"all"` |
| `allowedmodelids` | array | No | List of model IDs that are allowed. Used when `modelaccess` is `"allowlist"`. |
| `blockedmodelids` | array | No | List of model IDs that are blocked. Used when `modelaccess` is `"blocklist"`. |

### Access Modes

| Mode | `modelaccess` value | Behavior |
|------|---------------------|----------|
| **All Models** | `"all"` | No restrictions. Team members can run any model on Wiro. This is the default. |
| **Allowlist** | `"allowlist"` | Only models in `allowedmodelids` can be run. All others are blocked. |
| **Blocklist** | `"blocklist"` | Models in `blockedmodelids` cannot be run. All others are allowed. |

You configure one mode at a time. Setting `modelaccess` to `"allowlist"` ignores any `blockedmodelids`, and vice versa. Setting it back to `"all"` removes all restrictions regardless of the model ID lists.

Model IDs are the numeric IDs from the model catalog. You can get them from the [Models](/docs/models) endpoint or the dashboard.

### Examples

**Allowlist — only permit specific models:**

```json
{
  "teamguid": "your-team-guid",
  "modelaccess": "allowlist",
  "allowedmodelids": [598, 412, 305]
}
```

Team members can only run models 598, 412, and 305. All other models are blocked.

**Blocklist — block specific expensive models:**

```json
{
  "teamguid": "your-team-guid",
  "modelaccess": "blocklist",
  "blockedmodelids": [721, 650]
}
```

Team members can run any model except 721 and 650.

**Remove all restrictions:**

```json
{
  "teamguid": "your-team-guid",
  "modelaccess": "all"
}
```

### Where Access Controls Are Enforced

Model access is checked at the `/Run` endpoint — when a team member submits a task using a team project API key. The check compares the requested model's ID against the team's access policy before the task is queued.

Access controls do **not** affect:
- Browsing the model catalog (`/Tool/List`, `/Tool/Detail`)
- Viewing model details and pricing
- Personal projects (only team context is restricted)

### Error Response

When a team member tries to run a restricted model, the Run endpoint returns an error and the task is not created:

```json
{
  "result": false,
  "errors": [
    {
      "code": 0,
      "message": "This model is not allowed in your team. Contact your team admin."
    }
  ]
}
```

## **POST** /Team/SpendingSummary

Returns team totals, your individual spending, and limit information. All team members can view the spending summary.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `teamguid` | string | Yes | Team guid |

```json
// Response
{
  "result": true,
  "teamTotal": 45.23,
  "playgroundTotal": 32.10,
  "apiTotal": 13.13,
  "memberSpent": {
    "total": 12.50,
    "playground": 8.30,
    "api": 4.20
  },
  "spendLimit": 500.00,
  "memberSpendLimit": 100.00
}
```

| Field | Description |
|-------|-------------|
| `teamTotal` | Total spending by the entire team |
| `playgroundTotal` | Spending from playground (dashboard) usage |
| `apiTotal` | Spending from API key usage (projects) |
| `memberSpent` | Your individual spending within the team |
| `spendLimit` | Team-level spend limit (null if not set) |
| `memberSpendLimit` | Your personal spend limit within the team (null if not set) |

For project-level breakdown, call `/Project/UsageSummary` in team context. For time-series task execution data, call `/Task/Stat` in team context — both automatically filter by the active workspace.

## **POST** /Team/TransferCredit

Transfers credit between your personal wallet and team wallets. Useful for moving team budgets around or recovering personal funds. Only organization owners and team admins can transfer credit, and the same user must control both source and target workspaces.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `amount` | number | Yes | Transfer amount in USD |
| `sourceteamguid` | string | No | Source team guid. Empty/omit for personal wallet |
| `targetteamguid` | string | No | Target team guid. Empty/omit for personal wallet |

```json
// Request (personal to team)
{
  "amount": 100,
  "sourceteamguid": "",
  "targetteamguid": "0d9aade4-d31b-4b97-88f3-a90482f080ea"
}
```

```json
// Response
{
  "result": true,
  "errors": [],
  "transferred": {
    "total": 100,
    "gifted": 50,
    "store": 0,
    "amount": 50
  }
}
```

The `transferred` object shows how the amount was split across pools:
- `gifted` — from coupon and checklist credits
- `store` — from marketplace store revenue
- `amount` — from regular deposits

Permissions:
- Personal to team: you must be admin/owner of the target team
- Team to personal: you must be admin/owner of the source team
- Team to team: you must be admin/owner of both teams

### How It Works

Transfers preserve the original deposit structure — expiry dates, coupon tracking, and store revenue are all maintained. Each deposit type (coupon, store revenue, regular deposit) is transferred as a separate transaction on the target wallet with its original expiry time.

**Consumption order (matches task billing):**

1. Tracked coupons (model-specific first, then universal, FIFO)
2. Untracked gifted (checklist rewards, pooled)
3. Store revenue
4. Regular amount (deposits)

**Expiry is preserved:** When you transfer $600 from a wallet containing a $500 coupon (30-day expiry) and $500 deposit (365-day expiry), the target receives two separate deposits — $500 coupon and $100 deposit — each with its own expiry date.

Transaction history receives audit entries (`TRANSFER OUT` on source, `TRANSFER IN` on target) which don't affect balance calculations.

**Important behaviors:**

- Auto-pay may trigger if transferring reduces your personal `wallet.amount` below threshold
- Active agent subscriptions may fail renewal if transferring leaves insufficient balance
- Expired deposits are not transferred (only active deposits)
- Partial transfers preserve FIFO expiry correctly

## Coupons

Coupons can be scoped to a specific team, a specific user, or available to everyone:

| Coupon Scope | Who can redeem | Wallet credited |
|-------------|---------------|-----------------|
| **Everyone** | Any user | The redeemer's active wallet (personal or team) |
| **Team** | Only members of the specified team | The team wallet |
| **User** | Only the specified user | The user's personal wallet |

When a team-scoped coupon is redeemed, the credit is added to the team wallet and benefits all team members.

## What's Next

- [Organizations & Teams Overview](/docs/organizations-overview) — Concepts and workspace hierarchy
- [Managing Teams](/docs/organizations-managing-teams) — Create organizations, invite members, manage roles
- [Team API Access](/docs/organizations-api-access) — How context works in API requests
- [Pricing](/docs/pricing) — General pricing information

---

# Team API Access

How workspace context is resolved in API requests, and how access controls protect cross-context operations.

## Context Resolution

Every authenticated API request resolves to a workspace context — either **personal** or a specific **team**. The resolution method depends on your authentication type:

### API Key Authentication

When you authenticate with a project API key (`x-api-key` header), the workspace context is determined **automatically** by the project's assignment:

- If the project belongs to a team → team context is activated
- If the project is personal → personal context is activated

You do not need to send any additional headers. The API key carries the context implicitly.

```bash
# This project is assigned to a team — team context is automatic
curl -X POST "https://api.wiro.ai/v1/Run/google/nano-banana" \
  -H "x-api-key: YOUR_TEAM_PROJECT_API_KEY" \
  -d '{"prompt": "Hello"}'
```

```bash
# This project is personal — personal context is automatic
curl -X POST "https://api.wiro.ai/v1/Run/google/nano-banana" \
  -H "x-api-key: YOUR_PERSONAL_API_KEY" \
  -d '{"prompt": "Hello"}'
```

Create a project inside a team to get a team API key, or use a personal project for personal context. The same `x-api-key` header works for both — no extra configuration needed.

## What Gets Filtered by Context

When a workspace context is active, all list and query endpoints return only resources belonging to that context:

| Endpoint | Personal context returns | Team context returns |
|----------|------------------------|---------------------|
| `Project/List` | Personal projects only | Team projects only |
| `UserAgent/MyAgents` | Personal agents only | Team agents only |
| `Task/List` | Personal tasks only | Team tasks only |
| `Task/Stat` | Personal task statistics | Team task statistics |
| `Project/UsageSummary` | Personal project usage | Team project usage |
| `Wallet/List` | Personal wallet | Team wallet |
| `Wallet/TransactionList` | Personal transactions | Team transactions |
| `Coupon/UserList` | Personal coupons | Team coupons |

## Agent Context Guards

Wiro enforces strict context isolation for agent operations. When you interact with an agent, your current workspace context must match the agent's workspace:

| Your context | Agent's workspace | Result |
|-------------|-------------------|--------|
| Personal | Personal | Allowed |
| Team A | Team A | Allowed |
| Personal | Team A | **Blocked** |
| Team A | Personal | **Blocked** |
| Team A | Team B | **Blocked** |

### Protected Endpoints

The following agent endpoints enforce context guards:

- `UserAgent/Message/Send` — send a message to an agent
- `UserAgent/Message/History` — view conversation history
- `UserAgent/Message/Sessions` — list conversation sessions
- `UserAgent/Message/Delete` — delete a conversation
- `UserAgent/Deploy` — deploy a new agent (team context must match)
- `UserAgent/CreateExtraCreditCheckout` — purchase extra credits
- `UserAgent/CancelSubscription` — cancel subscription
- `UserAgent/RenewSubscription` — renew subscription
- `UserAgent/UpgradeTier` — upgrade tier (Starter → Pro)
- `UserAgent/CreateSubscriptionCheckout` — subscribe a not-yet-subscribed useragent
- `UserAgent/SkillsApply` — change skill set (single or batch) on a custom build (auto-prorates)

### Error Response

When a context mismatch is detected:

```json
{
  "result": false,
  "errors": [
    {
      "code": 0,
      "message": "This agent belongs to a team. Switch to the team context to access it."
    }
  ]
}
```

Or for the reverse case:

```json
{
  "result": false,
  "errors": [
    {
      "code": 0,
      "message": "This agent is personal. Switch to your personal context to access it."
    }
  ]
}
```

## Practical Examples

### Running a Model with a Team Project

Create a project inside a team, then use its API key. The team context is resolved automatically:

```bash
# 1. Create a project in team context (from dashboard or API)
# 2. Use the project's API key — billing goes to team wallet
curl -X POST "https://api.wiro.ai/v1/Run/stability-ai/sdxl" \
  -H "x-api-key: YOUR_TEAM_PROJECT_API_KEY" \
  -d '{"prompt": "A mountain landscape"}'
```

The task is created with the team's `teamguid`. The cost is deducted from the team wallet. The task appears in the team's usage statistics.

### Listing Team Agents with API Key

Use a team project API key to list agents deployed in the team:

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/MyAgents" \
  -H "x-api-key: YOUR_TEAM_PROJECT_API_KEY" \
  -d '{"limit": 10}'
```

This returns only agents with `teamguid` matching the project's team — personal agents are not included.

### Sending a Message to a Team Agent

The API key must belong to the same team as the agent:

```bash
# Works — team project + team agent in the same team
curl -X POST "https://api.wiro.ai/v1/UserAgent/Message/Send" \
  -H "x-api-key: YOUR_TEAM_PROJECT_API_KEY" \
  -d '{"useragentguid": "agent-guid-here", "message": "Hello"}'
```

```bash
# Fails — personal project + team agent = context mismatch
curl -X POST "https://api.wiro.ai/v1/UserAgent/Message/Send" \
  -H "x-api-key: YOUR_PERSONAL_API_KEY" \
  -d '{"useragentguid": "team-agent-guid-here", "message": "Hello"}'
# Returns: "This agent belongs to a team. Switch to the team context to access it."
```

### Wallet Billing Flow

When a task runs in team context:

1. The project's `teamguid` is resolved from the API key
2. The task is created with `teamguid` set
3. On completion, the billing UUID is set to `teamguid` (not the user's UUID)
4. The wallet transaction is recorded against the team wallet
5. The cost is deducted from the team wallet balance

```
API Key → Project (teamguid) → Task (teamguid) → Wallet Transaction (uuid=teamguid)
```

For personal context, the flow is the same but `teamguid` is `null` and billing uses the user's personal UUID.

## Best Practices

- **Separate projects by environment** — create distinct team projects for development, staging, and production. The team context is resolved automatically from the API key.
- **Check agent context before messaging** — if you build a multi-tenant application, ensure the project and agent belong to the same workspace
- **Transfer resources carefully** — agents can only access projects in the same workspace. Plan your resource layout before transferring

## What's Next

- [Organizations & Teams Overview](/docs/organizations-overview) — Concepts and workspace hierarchy
- [Managing Teams](/docs/organizations-managing-teams) — Create organizations, invite members, manage roles
- [Team Billing & Spending](/docs/organizations-billing) — Wallets, spend limits, and model access controls
- [Authentication](/docs/authentication) — API key setup and authentication methods
- [Projects](/docs/projects) — Project management and API credentials

---

# Telegram Integration

Connect your agent to a Telegram bot as an optional extra messaging channel.

## Overview

Telegram is **optional** on every Wiro agent. Web chat and the Messaging API
remain available without any external-channel setup. Telegram remains disabled
until both `bottoken` and `allowedusers` are configured, then activates
automatically.

## Setup

1. Create a bot with [@BotFather](https://t.me/BotFather) and copy its Bot
   Token.
2. Collect each approved operator's immutable numeric Telegram user ID.
3. Save the activation credentials in one request:

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/CredentialUpsert" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "fields": [
      {
        "credentialkey": "telegram",
        "fieldname": "bottoken",
        "fieldvalue": "123456:ABC-DEF..."
      },
      {
        "credentialkey": "telegram",
        "fieldname": "allowedusers",
        "fieldvalue": ["761381461"]
      },
      {
        "credentialkey": "telegram",
        "fieldname": "groups",
        "fieldvalue": [
          {
            "chatid": "-1001234567890",
            "allowedusers": ["761381461"]
          }
        ]
      }
    ]
  }'
```

Send `allowedusers` and `groups` as native JSON arrays. `groups` is optional.
For a new agent, place the complete Telegram group in `credentials`. Deploy
does not accept a chat-mode field; change Chat Mode afterward with
`POST /UserAgent/UpdateSettings`.

## Credential Fields

| Field | Type | Description |
|-------|------|-------------|
| `bottoken` | string | BotFather token. |
| `allowedusers` | string[] | Immutable Telegram user IDs allowed to use direct messages. |
| `groups` | object[] | Optional rows shaped as `{ "chatid": "-100...", "allowedusers": ["..."] }`. |

`teamsessionmode: "private"` isolates each approved direct-message operator and
each team member's Wiro web-chat history; `"collaborative"` shares both scopes.
Group conversations remain group-scoped.

## Access Behavior

- Direct messages are accepted only from top-level `allowedusers`.
- Group messages require an explicitly allowed negative chat ID, a
  room-approved user ID, and a mention of the bot.
- Usernames and display names are never authorization values.
- Clearing either `bottoken` or `allowedusers` with `CredentialUpsert` disables
  Telegram; completing both reactivates it.
