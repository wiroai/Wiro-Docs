# Wiro API Documentation

Complete API documentation for the Wiro AI platform — run AI models through a unified API.

## Table of Contents

1. [Introduction](#introduction)
2. [Authentication](#authentication)
3. [Projects](#projects)
4. [Models](#models)
5. [Run a Model](#run-a-model)
6. [Model Parameters](#model-parameters)
7. [Tasks](#tasks)
8. [LLM Streaming](#llm-streaming)
9. [WebSocket](#websocket)
10. [Realtime Voice](#realtime-voice)
11. [Realtime Text to Speech](#realtime-text-to-speech)
12. [Realtime Speech to Text](#realtime-speech-to-text)
13. [Files](#files)
14. [Concurrency Limits](#concurrency-limits)
15. [Error Reference](#error-reference)
16. [Code Examples](#code-examples)
17. [Pricing](#pricing)
18. [FAQ](#faq)
19. [MCP Server](#mcp-server)
20. [Self-Hosted MCP](#self-hosted-mcp)
21. [Node.js Library](#nodejs-library)
22. [n8n Wiro Integration](#n8n-wiro-integration)
23. [Agent Overview](#agent-overview)
24. [Agent Builder](#agent-builder)
25. [Agent Messaging](#agent-messaging)
26. [Agent WebSocket](#agent-websocket)
27. [Agent Webhooks](#agent-webhooks)
28. [Agent Credentials & OAuth](#agent-credentials--oauth)
29. [Agent Skills](#agent-skills)
30. [Agent Transactions](#agent-transactions)
31. [Agent Logs](#agent-logs)
32. [Agent Use Cases](#agent-use-cases)
33. [Organizations & Teams](#organizations--teams)
34. [Managing Teams](#managing-teams)
35. [Team Billing & Spending](#team-billing--spending)
36. [Team API Access](#team-api-access)

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

## Full Flow

The typical workflow after calling the Run endpoint:

1. **Run** — call `POST /Run/{owner-slug}/{model-slug}` and receive a task ID
2. **Track** — connect via WebSocket or poll `POST /Task/Detail`
3. **Receive** — get outputs as the model produces them (streaming or final)
4. **Complete** — task reaches `end` status with full results

For real-time streaming, use the WebSocket connection with the `socketaccesstoken` returned in the run response. For simpler integrations, poll the Task Detail endpoint every few seconds.

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
| `task_error` | The model wrote to stderr. This is an **interim log event**, not a final failure — many models write warnings or debug info to stderr during normal operation. The task may still complete successfully. Always wait for `task_postprocess_end` to determine the actual result. |
| `task_output_full` | The complete accumulated stdout log, sent once after the model process finishes. Contains the full output history in a single message. |
| `task_error_full` | The complete accumulated stderr log, sent once after the model process finishes. |
| `task_end` | The model process has exited. Emitted once. This fires **before** post-processing — do not use this event to determine success. Wait for `task_postprocess_end` instead. |
| `task_postprocess_start` | Post-processing has started. The system is preparing the output files — encoding, uploading to CDN, and generating access URLs. |
| `task_postprocess_end` | Post-processing completed. Check `pexit` to determine success: `"0"` = success, any other value = error. The `outputs` array contains the final files with CDN URLs, content types, and sizes. **This is the event you should listen for** to get the final results. |
| `task_cancel` | The task was cancelled (if queued) or killed (if running) by the user. |

### Realtime Conversation Only

The following statuses are exclusive to realtime conversation models (e.g. voice AI). They are not emitted for standard model runs.

| Status              | Description                                                                         |
| ------------------- | ----------------------------------------------------------------------------------- |
| `task_stream_ready` | Realtime model is ready to receive audio/text input — you can start sending data    |
| `task_stream_end`   | Realtime session has ended — the model finished speaking or the session was closed  |
| `task_cost`         | Real-time cost update emitted during execution — shows the running cost of the task |

## Determining Success or Failure

Both successful and failed tasks reach `task_postprocess_end`. The status alone does not tell you whether the task succeeded. Wait for `task_postprocess_end` and then check `pexit` or `outputs` (or both) to determine the actual result:

- `pexit` — the process exit code. `"0"` means success, any other value means the model encountered an error. This is the most reliable indicator.
- `outputs` — the output files array. For non-LLM models, a successful run populates this with CDN URLs. If it's empty or missing, the task likely failed.

> **Note:** For **LLM models**, `outputs` contains a structured entry with `contenttype: "raw"` and the response broken into `prompt`, `raw`, `thinking`, and `answer` fields. The merged plain text is also available in `debugoutput`. Always use `pexit` as the primary success check.

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
      "thinking": [],
      "answer": ["Hello! How can I help you today?"]
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

> **Important:** `task_error` events during execution are interim log messages, not final failures. A task can emit error logs and still complete successfully. Always wait for `task_postprocess_end` and check `pexit`.

## LLM Models

For LLM (Large Language Model) requests, the model's response is available in two places: `outputs` contains a structured entry with `contenttype: "raw"` and the response broken into `prompt`, `raw`, `thinking`, and `answer` fields; `debugoutput` contains the merged plain text. When polling with Task Detail, use either field depending on whether you need structured or plain-text access.

For real-time streaming of LLM responses, use [WebSocket](#websocket) instead of polling. Each `task_output` event delivers a chunk of the response as it's generated, giving your users an instant, token-by-token experience.

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
| `debugoutput` | `string` | Accumulated stdout. For LLM models, contains the merged response text. |
| `starttime` | `string` | Unix timestamp when execution started. |
| `endtime` | `string` | Unix timestamp when execution ended. |
| `elapsedseconds` | `string` | Total execution time in seconds. |
| `totalcost` | `string` | Actual cost charged for the run in USD. |
| `modeldescription` | `string` | Description of the model that was executed. |
| `modelslugowner` | `string` | Model owner slug (e.g. `"google"`, `"wiro"`). |
| `modelslugproject` | `string` | Model project slug (e.g. `"nano-banana-pro"`). |
| `outputs` | `array` | Output files (CDN URLs) or structured LLM content (`contenttype: "raw"`). |

## **POST** /Task/Cancel

Cancels a task that is still in the `queue` stage. Tasks that have already been assigned to a worker cannot be cancelled — use Kill instead.

| Parameter   | Type   | Required | Description              |
| ----------- | ------ | -------- | ------------------------ |
| `tasktoken` | string | Yes      | The task token to cancel |

## **POST** /Task/Kill

Terminates a task that is currently running (any status after `assign`). The worker will stop processing and the task will move to `cancel` status.

| Parameter   | Type   | Required | Description            |
| ----------- | ------ | -------- | ---------------------- |
| `tasktoken` | string | Yes      | The task token to kill |

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

Stream LLM responses in real time with thinking/answer separation, session history, and multi-turn conversations.

## Overview

LLM (Large Language Model) requests on Wiro work differently from standard model runs:

- Responses are available as structured content in `outputs` (with `contenttype: "raw"`) and as merged plain text in `debugoutput`
- Streaming `task_output` messages contain structured `thinking` and `answer` arrays — not plain strings
- Multi-turn conversations are supported via `session_id` and `user_id` parameters
- `pexit` is the primary success indicator

Available LLM models include:

- [openai/gpt-5-2](https://wiro.ai/models/openai/gpt-5-2)
- [openai/gpt-oss-20b](https://wiro.ai/models/openai/gpt-oss-20b)
- [qwen/qwen3-5-27b](https://wiro.ai/models/qwen/qwen3-5-27b)

## Session & Chat History

Wiro maintains conversation history per session. By sending a `session_id` and `user_id` parameters:

| Parameter    | Type   | Required | Description                                                              |
| ------------ | ------ | -------- | ------------------------------------------------------------------------ |
| `session_id` | string | No       | UUID identifying the conversation session. Reuse for follow-up messages. |
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

> **Tip:** Generate a UUID for `session_id` when starting a new conversation. Pass the same UUID for all follow-up messages to maintain context.

## Thinking & Answer Phases

Many LLM models separate their output into two phases:

- **Thinking** — the model's internal reasoning process (chain-of-thought)
- **Answer** — the final response to the user

A model may alternate between thinking and answering multiple times during a single response. The arrays are indexed in pairs — `thinking[0]` corresponds to `answer[0]`, `thinking[1]` to `answer[1]`, and so on:

```json
{
  "thinking": [
    "Let me break this into parts...",
    "Now let me verify my reasoning..."
  ],
  "answer": [
    "Quantum computing uses qubits...",
    "To summarize: qubits can be 0, 1, or..."
  ]
}
```

Each `task_output` event contains the **full accumulated** arrays up to that point — not just the new chunk. Simply replace your displayed content with the latest arrays. Use `isThinking` to show a "thinking" indicator in your UI while the model reasons.

When streaming via WebSocket, `task_output` messages for LLM models contain a structured object:

```json
{
  "type": "task_output",
  "id": "534574",
  "tasktoken": "eDcCm5yy...",
  "message": {
    "type": "answer",
    "thinking": ["Let me analyze this step by step...", "The key factors are..."],
    "answer": ["Quantum computing uses qubits that can exist in superposition..."],
    "raw": "Quantum computing uses qubits that can exist in superposition...",
    "isThinking": false,
    "speed": "48.5",
    "speedType": "t/s",
    "elapsedTime": "3s"
  }
}
```

| Field              | Type       | Description                                                     |
| ------------------ | ---------- | --------------------------------------------------------------- |
| `message.type`        | `string`   | Phase indicator: `"thinking"` during reasoning, `"answer"` during response. |
| `message.thinking`    | `string[]` | Array of reasoning/chain-of-thought chunks. May be empty.       |
| `message.answer`      | `string[]` | Array of response chunks. This is the content to show the user. |
| `message.raw`         | `string`   | The full accumulated raw output text (thinking + answer merged). |
| `message.isThinking`  | `boolean`  | `true` while the model is in the thinking phase, `false` during the answer phase. |
| `message.speed`       | `string`   | Generation speed (e.g. "12.4").                                 |
| `message.speedType`   | `string`   | Unit for speed, typically `"t/s"` (tokens per second).          |
| `message.elapsedTime` | `string`   | Elapsed time since generation started (e.g. "3s", "1m 5s").    |

> **Note:** Standard (non-LLM) models send `message` as a plain string. LLM models send it as a `{ thinking, answer }` object. Check the type before parsing.

## Streaming Flow

1. **Run** the model with `prompt`, `session_id`, and `user_id`
2. **Connect** to WebSocket and send `task_info`
3. **Receive** `task_output` messages — each contains the growing `thinking` and `answer` arrays
4. **Display** the latest `answer` array content to the user (optionally show `thinking` in a collapsible section)
5. **Complete** — on `task_postprocess_end`, check `pexit` for success

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
          "thinking": [],
          "answer": ["Quantum computing uses qubits that can exist in superposition..."]
        }
      }]
    }
  ]
}
```

> **Note:** When polling, `outputs` contains the structured response with separate `thinking` and `answer` fields, while `debugoutput` contains the merged plain text. For real-time token-by-token delivery, use WebSocket streaming instead.

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

Lifecycle events (`task_accept`, `task_preprocess_start`, `task_preprocess_end`, `task_assign`, `task_start`, `task_end`, `task_postprocess_start`) have `message: null`.

### Output Events

**Standard models** — `message` is a progress object or plain string:

```json
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
```

**LLM models** — `message` is a structured object with thinking/answer arrays (see LLM & Chat Streaming section).

### Full Output Events

`task_output_full` and `task_error_full` are sent once after the process exits. `message` is `{ raw: "..." }` for standard models, or `{ raw, thinking, answer }` for LLM models.

### Final Result

`task_postprocess_end` — `message` contains the `outputs` array (file URLs for standard models, structured raw content for LLM models).

### Realtime Events

`task_stream_ready`, `task_stream_end` have no `message` field. `task_cost` includes `turnCost`, `cumulativeCost`, and `usage` fields.

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
const axios = require("axios");

const API_KEY = "YOUR_API_KEY";
const BASE_URL = "https://api.wiro.ai/v1";

const headers = {
  "x-api-key": API_KEY,
  "Content-Type": "application/json",
};

async function main() {
  // 1. Run a model
  console.log("Starting model run...");
  const runResp = await axios.post(
    `${BASE_URL}/Run/{owner-slug}/{model-slug}`,
    {
      prompt: "A cyberpunk cityscape at night",
      width: 1024,
      height: 1024,
    },
    { headers },
  );
  const taskToken = runResp.data.data.taskid;
  console.log("Task ID:", taskToken);

  // 2. Poll for results
  while (true) {
    const taskResp = await axios.post(`${BASE_URL}/Task/Detail`, { tasktoken: taskToken }, { headers });
    const { status, output } = taskResp.data.data;
    console.log("Status:", status);

    if (status === "end") {
      console.log("Done! Output:", output);
      break;
    }
    if (status === "error" || status === "cancel") {
      console.log("Task failed or cancelled");
      break;
    }

    await new Promise(r => setTimeout(r, 3000));
  }
}

main();
```

### curl

```bash
#!/bin/bash
API_KEY="YOUR_API_KEY"
BASE_URL="https://api.wiro.ai/v1"

# 1. Run a model
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
    echo "Done!"
    echo $TASK_RESPONSE | python3 -m json.tool
    break
  elif [ "$STATUS" = "error" ] || [ "$STATUS" = "cancel" ]; then
    echo "Task failed or cancelled"
    break
  fi

  sleep 3
done
```

---

# MCP Server

Connect AI coding assistants to Wiro's AI models via the Model Context Protocol.

## What is MCP?

[Model Context Protocol](https://modelcontextprotocol.io/) (MCP) is an open standard that lets AI assistants use external tools directly. With the Wiro MCP server, your AI assistant can search models, run inference, track tasks, and upload files — all without leaving your editor.

The hosted MCP server is available at `mcp.wiro.ai/v1` and works with any MCP-compatible client, including Cursor, Claude Code, Claude Desktop, and Windsurf.

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
| `run_model` | Run any model, wait or get task token |
| `get_task` | Check task status and outputs |
| `get_task_price` | Get the cost of a completed task |
| `cancel_task` | Cancel a queued task |
| `kill_task` | Kill a running task |
| `upload_file` | Upload a file from URL for use as model input |
| `search_docs` | Search Wiro documentation |

---

# Self-Hosted MCP

Run the Wiro MCP server locally on your own machine using npx.

## Quick Start

```json
{
  "mcpServers": {
    "wiro": {
      "command": "npx",
      "args": ["-y", "@wiro-ai/wiro-mcp"],
      "env": {
        "WIRO_API_KEY": "your-api-key",
        "WIRO_API_SECRET": "your-api-secret"
      }
    }
  }
}
```

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
| `runModel(model, params)` | Run a model. Returns task ID and socket access token. |
| `waitForTask(tasktoken, timeoutMs?)` | Poll until the task completes. Default timeout: 120s. |
| `getTask({ tasktoken?, taskid? })` | Get current task status and outputs. |
| `cancelTask(tasktoken)` | Cancel a queued task. |
| `killTask(tasktoken)` | Kill a running task. |
| `uploadFile(url, fileName?)` | Upload a file from URL for use as model input. |

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
| **Build Your Own Agent** | [wiro.ai/agents/build](https://wiro.ai/agents/build) | The web wizard for the same custom-build flow exposed by [`POST /UserAgent/Deploy`](#post-useragentdeploy) with `custom: true`. Useful for previewing the skill picker / pricing breakdown before scripting it. |
| **Browse Agents** | [wiro.ai/browse-agents](https://wiro.ai/browse-agents) | Full marketplace catalog with categories, descriptions, screenshots, and per-agent tier prices — the visual mirror of [`POST /Agent/List`](#post-agentlist). |

> All four pages are public — no Wiro account required to browse. Sign-in becomes mandatory only when you click "Deploy" on a specific agent (which then drops you into the Wiro dashboard at [wiro.ai/panel/agents](https://wiro.ai/panel/agents)).

## What are Wiro Agents?

Wiro Agents are autonomous AI assistants that run persistently in isolated containers. Unlike one-shot model runs, agents maintain conversation memory, connect to external services, and use tools to complete tasks on your behalf — all managed through the API.

The system has two layers:

- **Agent templates** (the catalog) — Pre-built agent definitions published by Wiro. Each template defines the agent's default skill set, required credentials, the per-tier credit multiplier, and a per-instance pricing recipe. Browse the catalog with `POST /Agent/List`.
- **UserAgent instances** (your deployments) — When you deploy an agent template (or build a custom one), Wiro creates a personal instance tied to your account. Each instance runs in its own container with its own credentials, configuration, conversation history, billing, and per-action cost profile.

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

## Pricing Model — Tiers, Skills & Per-Action Costs

Agent pricing is **fully derived from the agent's enabled skill set** plus a per-template `tiermultiplier`. There are no fixed `agent.basemonthlypriceusd` columns and no `useragents.rate*cost` overrides — those were dropped in favor of skill-driven pricing. The single source of truth is the skill registry, exposed via [`POST /Skills/List`](/docs/agent-skills#post-skillslist) and [`POST /Skills/Detail`](/docs/agent-skills#post-skillsdetail).

### Tiers

Every agent ships with two tier presets: **Starter** and **Pro**. Each tier has its own `price` (USD/month) and `credits` (monthly credit allowance). The relationship between the two is fixed by the agent's `tiermultiplier`:

```
pro.price   = starter.price   × tiermultiplier
pro.credits = starter.credits × tiermultiplier
```

`tiermultiplier` defaults to `3` if the template omits it. Each agent template's tier numbers (and the `tiermultiplier`) appear on every catalog response under the `tiers` object:

```json
"tiers": {
  "starter": { "priceUsd": 9, "credits": 1000 },
  "pro":     { "priceUsd": 29, "credits": 5000 }
}
```

### Per-Action Costs

The `peractioncosts` object on each agent / useragent response shows how many credits each agent action burns at runtime:

```json
"peractioncosts": {
  "message":    10,
  "create":     60,
  "modify":     20,
  "regenerate": 20
}
```

These values are computed as the **maximum** `pricing.credit_costs.<action>` across the agent's enabled skill set (free / utility skills contribute nothing). When you toggle a skill on or off the values automatically recompute — see [`POST /UserAgent/SkillsApply`](#post-useragentskillsapply).

> **Per-action costs are tier-agnostic.** Pro and Starter use the same `message` / `create` / `modify` / `regenerate` rates. Pro just gives you `tiermultiplier` × more monthly credits to spend at the same per-action burn rate.

### Live Pricing Preview

Before you commit a skill change or build a custom agent, fetch a live preview with [`POST /UserAgent/PricingPreview`](#post-useragentpricingpreview). The preview returns the post-toggle `tiers`, `peractioncosts`, and `enabledSkills` (with transitive `depends_on` resolved) without writing any state.

## Agent Lifecycle

Deploying and running an agent follows this flow:

1. **Browse** — call `POST /Agent/List` to discover available agents in the catalog
2. **Deploy** — call `POST /UserAgent/Deploy` with `useprepaid: true` and `tier` (`"starter"` or `"pro"`). The selected tier price is debited from your prepaid wallet immediately and a 30-day subscription row is created.
3. **Configure** — if the agent requires credentials (API keys, OAuth tokens), set them per-provider with `POST /UserAgent/CredentialUpsert`, or per-skill with `POST /UserAgent/CustomSkillUpsert`. See [Agent Credentials](/docs/agent-credentials) for details
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
      "tiermultiplier": 3,
      "tiers": {
        "starter": { "priceUsd": 9, "credits": 1000 },
        "pro":     { "priceUsd": 29, "credits": 5000 }
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
| `type` | string | No | Pass `"full"` to also include `customskills` and `scheduledskills` arrays in the response. Without `type: "full"`, the response carries the catalog header + `tiers` + `peractioncosts` + `credentials` + `skills` + `skillsmeta` only. |

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
      "tiermultiplier": 3,
      "tiers": {
        "starter": { "priceUsd": 9, "credits": 1000 },
        "pro":     { "priceUsd": 29, "credits": 5000 }
      },
      "peractioncosts": {
        "message":    10,
        "create":     60,
        "modify":     20,
        "regenerate": 20
      },
      "skills": ["instagram-post", "wiro-generator"],
      "skillsmeta": [
        {
          "name": "instagram-post",
          "title": "Instagram — Post & Stories",
          "icon": "https://wiro.ai/images/icons/skills/instagram.svg",
          "category": "int",
          "credential_key": "instagram"
        },
        {
          "name": "wiro-generator",
          "title": "Wiro Generator (platform-managed)",
          "icon": "https://wiro.ai/images/icons/skills/wiro.svg",
          "category": "int",
          "credential_key": "wiro"
        }
      ],
      "credentials": {
        "instagram": {
          "optional": false,
          "extra": false,
          "_editable": { "appid": true, "appsecret": true, "igusername": false },
          "_schema": {
            "title": "Instagram",
            "icon": "https://wiro.ai/images/icons/skills/instagram.svg",
            "brand_color": "#e4405f",
            "brand_text_color": "#ffffff",
            "brand_logo_filter": "none",
            "docs_url": "integration-instagram-skills",
            "credential_mode": "oauth",
            "connection_modes": ["wiro", "own"],
            "wiro_connect_pending": true,
            "oauth_provider": {
              "auth_method_value": "wiro",
              "connect_endpoint": "/UserAgentOAuth/IGConnect",
              "disconnect_endpoint": "/UserAgentOAuth/IGDisconnect",
              "status_endpoint": "/UserAgentOAuth/IGStatus",
              "connect_button_label": "Connect with Instagram",
              "connect_button_icon": "/images/icons/skills/instagram.svg",
              "connect_button_brand_color": "#e4405f",
              "connect_button_text_color": "#ffffff",
              "connect_button_logo_filter": "none",
              "username_field": "igusername",
              "return_query_param": "ig_connected",
              "return_error_param": "ig_error",
              "return_error_detail_param": "ig_error_detail",
              "account_picker": null,
              "extra_step": null
            },
            "fields": [
              {
                "key": "appid",
                "type": "text",
                "label": "App ID",
                "required": true,
                "pattern": "^[0-9]+$",
                "oauth_managed": true,
                "only_in_modes": ["own"]
              },
              {
                "key": "appsecret",
                "type": "password",
                "label": "App Secret",
                "required": true,
                "show_toggle": true,
                "oauth_managed": true,
                "only_in_modes": ["own"]
              },
              {
                "key": "igusername",
                "type": "text",
                "label": "Connected Account",
                "required": false,
                "auto_filled_by_oauth": true,
                "readonly_when_connected": true
              }
            ]
          }
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
| `_connected` | boolean | **OAuth readiness indicator.** `true` when Wiro has a valid OAuth access token (reflected as `connectedat` / `accesstoken` on the credential) **and** every picker field declared by the template (`customerid`, `merchantid`, `channelid`, ad-account, page id, etc.) is populated. Non-OAuth credentials — API-key providers (Gmail, Apollo, Lemlist, Brevo, SendGrid, WordPress, Telegram) and service-account providers (Firebase, Google Drive, Google Play, App Store Connect) — do **not** raise `_connected` to `true` because they never write a `connectedat`; check `setuprequired` on `UserAgent/Detail` (or inspect the field values directly) to know when those are configured. |
| `optional` | boolean | `true` when the template marks this credential as not required for the agent to run. Agents can start even if `optional: true` credentials are empty. |
| `extra` | boolean | `true` when the template groups the credential under "extra integrations" in the UI (disabled by default until the user opts into the skill). |
| `_editable` | object | Map of `fieldname → true` for fields the caller may write. Computed from the registry schema + caller role. |
| `_schema` | object | Inlined registry descriptor (`label`, `credential_mode`, `credential_schema[]` field shapes). Lets a UI render the form without a separate `Credentials/Detail` round-trip. |

**Field redaction in responses:**

- `fieldstatus: "oauth_session"` fields (`accesstoken`, `refreshtoken`, `tokenexpiresat`, `pageAccessToken`, etc.) — always stripped from every response, regardless of caller role.
- `fieldstatus: "platform"` fields (`credentials.wiro.apiKey`, `credentials.openai.apiKey`, `credentials.calendarific.apiKey`) — stripped for API callers (role = `user`). The platform credential entries themselves are also dropped from the response. Only the agent runtime itself sees the values.
- `fieldstatus: "oauth_app"` fields (`clientsecret`, `appsecret`) — **visible to anyone who can read the credentials**. History writes redact `clientsecret` to `[REDACTED]`, but the live value is returned. Treat them as read-admin-only in your own UI layer.
- Sentinel rows `_isoptional` / `_isextra` — never appear as fields; they're folded into the `optional` and `extra` flags above.

API callers see the non-sensitive fields (public identifiers like `clientid`, display-only values like `igusername`, flags like `authmethod`, and the flags above).

### Deploy & Manage

All endpoints below require authentication.

#### **POST** /UserAgent/Deploy

Creates a new agent instance from a catalog template, **or** builds a brand-new custom agent (no template).

> **API agent deployment is prepaid-only.** Pass `useprepaid: true` + `tier` — the subscription cost is deducted from your prepaid wallet immediately and the instance is created server-side in one call. There is no API path that accepts a credit card directly; subscriptions from a card can only be created through the Wiro dashboard at [wiro.ai/panel/agents](https://wiro.ai/panel/agents). Top up your wallet on [wiro.ai/panel/billing](https://wiro.ai/panel/billing) before calling Deploy.

Prepaid deploy (`useprepaid: true` + `tier`) charges your wallet for the chosen tier price immediately and inserts a 30-day subscription row (`plan: "agent"`, `provider: "prepaid"`). The instance is created in status `6` (Setup Required) when the template has required credentials you didn't pass inline; otherwise it auto-transitions to `0` (Stopped) and is ready for `UserAgent/Start`.

If you pass `credentials`, `skills`, or `customskills` at the top level of the Deploy body they are **applied server-side in the same call** (one-shot deploy + initial setup) — note that inline credentials only accept flat string/number fields and can't populate nested arrays (firebase accounts, drive folders, app-store apps); use `POST /UserAgent/CredentialUpsert` afterwards for those. See [Agent Credentials → Prepaid deploy — inline setup supported](/docs/agent-credentials#prepaid-deploy--inline-setup-supported-with-limitations) for the full rules.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `agentguid` | string | Conditional | The guid of the agent template from the catalog. Required unless `custom: true`. |
| `custom` | boolean | Conditional | Pass `true` to deploy a custom-built agent (no marketplace template). Mutually exclusive with `agentguid`. See [Agent Builder](/docs/agent-builder) for the full builder flow. |
| `title` | string | Yes | Display name for your instance. |
| `description` | string | No | Optional description (custom builds: free-text describing what the agent does). |
| `cover` | string | No | Optional cover image URL. Custom builds only — template deploys clone the agent's cover automatically. |
| `useprepaid` | boolean | Yes | Must be `true` for API deploys. Pays the tier price from your wallet balance in a single server-side call. |
| `tier` | string | No | Tier selection: `"starter"` (default) or `"pro"`. Determines the price + credits debited to your wallet at deploy time. |
| `pinned` | boolean | No | Whether the agent appears in the pinned agents list (defaults to `true`). Pass `false` when deploying agents programmatically for end users (e.g. bulk provisioning) so they don't clutter your admin dashboard. |
| `credentials` | object | No | Inline credentials to apply server-side (flat fields only — see Agent Credentials). |
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
  "tier": "starter",
  "pinned": false
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
    "gmail-check": true,
    "telegram-post": true,
    "wiro-generator": true
  },
  "credentials": {
    "gmail":    { "account": "agent@company.com", "apppassword": "xxxx xxxx xxxx xxxx" },
    "telegram": { "bottoken": "123456:ABC-DEF...", "allowedusers": "[\"761381461\"]", "sessionmode": "private" }
  }
}
```

> **Custom builds are skill-driven.** There is no marketplace template behind a custom agent — the price + credit allowance is computed live from the skills you toggle on. Use [`POST /UserAgent/PricingPreview`](#post-useragentpricingpreview) (with `draft: true`) to estimate the tier price before calling Deploy. Full walkthrough: [Agent Builder](/docs/agent-builder).

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
      "tiermultiplier": 3,
      "credentials": {
        "instagram": {
          "_connected": false,
          "optional": false,
          "extra": false,
          "_editable": { "authmethod": true, "igusername": true },
          "_schema": { "key": "instagram", "label": "Instagram", "credential_mode": "oauth" },
          "authmethod": "",
          "igusername": "",
          "connectedat": ""
        }
      },
      "skills": ["instagram-post", "wiro-generator"],
      "customskills": [],
      "scheduledskills": [],
      "monthlycredits": 1000,
      "monthlypriceusd": 9,
      "extracredits": 0,
      "usedcredits": 0,
      "remainingcredits": 1000,
      "creditperiod": "2026-05",
      "creditsyncat": null,
      "peractioncosts": {
        "message":    10,
        "create":     60,
        "modify":     20,
        "regenerate": 20
      },
      "teamsessionmode": "",
      "status": 6,
      "setuprequired": true,
      "pinned": false,
      "agent": {
        "guid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "title": "Instagram Manager",
        "slug": "instagram-manager",
        "cover": "https://cdn.wiro.ai/uploads/agents/instagram-manager-cover.webp",
        "categories": ["social-media", "marketing"],
        "tiermultiplier": 3,
        "tiers": {
          "starter": { "priceUsd": 9, "credits": 1000 },
          "pro":     { "priceUsd": 29, "credits": 5000 }
        },
        "extracreditpacks": [
          { "packkey": "small",  "credits": 5000,  "priceusd": 45,  "enabled": true },
          { "packkey": "medium", "credits": 10000, "priceusd": 80,  "enabled": true },
          { "packkey": "large",  "credits": 20000, "priceusd": 140, "enabled": true }
        ]
      },
      "createdat": 1714608000,
      "updatedat": 1714608000
    }
  ]
}
```

##### Status and `setuprequired` on deploy

The Deploy response reflects the same composed shape you get from `UserAgent/Detail`. Two status signals matter:

| Field | Meaning |
|-------|---------|
| `status: 6` | **Setup Required** — agent cannot start yet, at least one non-optional credential is still empty. |
| `status: 0` | **Stopped** — all required credentials are set, agent is ready to launch with `UserAgent/Start`. Happens immediately when the template has no required credentials, or you filled them inline in the Deploy body. |
| `status: 2` | **Queued** — `useprepaid: true` charged the wallet and the deploy auto-queued the agent (only happens when setup is already complete after applying the inline `credentials`). |
| `setuprequired: true` | Mirrors the condition: any non-optional credential missing. Stays `true` while `status: 6`. |
| `setuprequired: false` | All non-optional credentials complete. Safe to call `UserAgent/Start`. |

> **Subscription on deploy:** the `useragents.subscription` field is **not** included in the Deploy response (it's assembled from the `subscriptions` table). A prepaid subscription row (`plan: "agent"`, provider `prepaid`, `tier` matches what you passed) is inserted server-side during the Deploy call — call `POST /UserAgent/Detail` with the returned `guid` to read the subscription object back.

The instance starts in status `6` (Setup Required) when the template has required credentials you didn't pass inline. Next steps for the API integration flow:

1. Inspect `credentials` in the Deploy response (or call `POST /UserAgent/Detail`) to see each provider's fields, the `optional` / `extra` flags, the registry-driven `_schema`, and the `_connected` OAuth status.
2. Call `POST /UserAgent/CredentialUpsert` per provider (or in bulk via the `fields[]` array) to write API keys, bot tokens, WordPress credentials, etc. For OAuth providers (Meta, Google Ads, HubSpot, …) use the provider's dedicated Connect/Callback/Picker flow — see [Agent Credentials & OAuth](/docs/agent-credentials).
3. Call `POST /UserAgent/CustomSkillUpsert` per skill to customize strategy text or cron intervals, if the template exposes any.
4. Once all non-optional credentials are populated, the server automatically flips `status` to `0` and `setuprequired` to `false`.
5. Call `POST /UserAgent/Start` to launch the agent (status progresses `2` → `3` → `4`, Running).

> **Tip:** When deploying agents programmatically for your end users (e.g. one instance per customer), set `"pinned": false` to keep your own dashboard clean. Users can pin agents manually later via [`POST /UserAgent/Pin`](#post-useragentpin).

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
      "tiermultiplier": 3,
      "monthlypriceusd": 29,
      "monthlycredits": 5000,
      "extracredits": 2000,
      "usedcredits": 1450,
      "remainingcredits": 5550,
      "creditperiod": "2026-05",
      "creditsyncat": 1714694410,
      "peractioncosts": { "message": 10, "create": 60, "modify": 20, "regenerate": 20 },
      "status": 4,
      "pinned": true,
      "setuprequired": false,
      "subscription": {
        "plan": "agent",
        "status": "active",
        "amount": 29,
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
        "cover": "https://cdn.wiro.ai/uploads/agents/instagram-manager-cover.webp",
        "categories": ["social-media", "marketing"],
        "tiermultiplier": 3,
        "tiers": {
          "starter": { "priceUsd": 9, "credits": 1000 },
          "pro":     { "priceUsd": 29, "credits": 5000 }
        }
      },
      "extracreditsexpiry": 1730419200,
      "createdat": 1714608000,
      "updatedat": 1714694400,
      "startedat": 1714694400,
      "runningat": 1714694410
    }
  ]
}
```

#### **POST** /UserAgent/Detail

Retrieves full details for a single deployed agent instance, including subscription info, the per-instance credit ledger summary, the resolved per-action cost table, and the `extracreditpacks` catalog.

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
      "tier": "pro",
      "tiermultiplier": 3,
      "status": 4,
      "pinned": true,
      "setuprequired": false,
      "credentials": {
        "instagram": {
          "_connected": true,
          "optional": false,
          "extra": false,
          "_editable": { "authmethod": true, "igusername": true },
          "_schema": { "key": "instagram", "label": "Instagram", "credential_mode": "oauth" },
          "authmethod": "wiro",
          "igusername": "myaccount",
          "connectedat": "2025-04-01T12:00:00.000Z"
        }
      },
      "customskills": [
        {
          "key": "cs-content-tone",
          "description": "Content strategy, brand voice, and posting rules",
          "value": "## Brand Voice\nTone: friendly\nTarget Audience: ...",
          "enabled": true,
          "interval": null,
          "_source": "preset-strategy",
          "_editable": true
        }
      ],
      "scheduledskills": [
        {
          "key": "cs-cron-content-scanner",
          "description": "Content discovery with rotating strategies",
          "value": "",
          "enabled": true,
          "interval": "0 */4 * * *",
          "_source": "skill-bundle",
          "_editable": false
        }
      ],
      "skills": ["twitterx-post", "instagram-post", "wiro-generator"],
      "monthlycredits": 5000,
      "monthlypriceusd": 29,
      "extracredits": 2000,
      "usedcredits": 1450,
      "remainingcredits": 5550,
      "creditperiod": "2026-05",
      "creditsyncat": 1714694410,
      "peractioncosts": {
        "message":    10,
        "create":     60,
        "modify":     20,
        "regenerate": 20
      },
      "subscription": {
        "plan": "agent",
        "status": "active",
        "amount": 29,
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
        "cover": "https://cdn.wiro.ai/uploads/agents/instagram-manager-cover.webp",
        "categories": ["social-media", "marketing"],
        "tiermultiplier": 3,
        "tiers": {
          "starter": { "priceUsd": 9, "credits": 1000 },
          "pro":     { "priceUsd": 29, "credits": 5000 }
        },
        "extracreditpacks": [
          { "packkey": "small",  "credits": 25000,  "priceusd": 130, "enabled": true },
          { "packkey": "medium", "credits": 50000,  "priceusd": 240, "enabled": true },
          { "packkey": "large",  "credits": 100000, "priceusd": 420, "enabled": true }
        ]
      },
      "extracreditsexpiry": 1730419200,
      "createdat": 1714608000,
      "updatedat": 1714694400,
      "startedat": 1714694400,
      "runningat": 1714694410
    }
  ]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `guid` | `string` | Unique identifier for this agent instance. |
| `agentid` | `number\|null` | The catalog agent ID this instance was deployed from. `null` for custom builds. |
| `title` | `string` | Display name you gave this instance. |
| `tier` | `string` | `"starter"` or `"pro"` — the active tier for this instance. |
| `tiermultiplier` | `number` | Per-instance Pro multiplier — snapshotted at deploy from the template (default `3`). Drives the Pro tier's price + credit allocation. |
| `status` | `number` | Current status code (see UserAgent Statuses). |
| `setuprequired` | `boolean` | `true` if credentials are missing or incomplete. |
| `credentials` | `object` | Per-provider credential map assembled from the normalized tables. Sensitive fields (OAuth tokens, platform API keys) are hidden per the field-redaction rules above. Each credential carries `_connected` / `optional` / `extra` / `_editable` / `_schema`. |
| `customskills` | `array` | Composed list of preset strategies and **non-cron** custom skills (writable instructions). Each entry carries `_source` (`preset-strategy` \| `user-created`), `_editable`, and (only on user-created rows) `_user_created: true`. |
| `scheduledskills` | `array` | Composed list of **cron** skills (`cs-cron-*`). Same field shape as `customskills` plus `interval` (cron expression). `_source` is `skill-bundle` for crons that ship with an integration skill, `user-created` for user-added crons. |
| `skills` | `array<object>` | Currently-enabled integration skills. Each entry: `{ name, enabled: true, _edited, _user_created }`. Toggle one or more skills with `POST /UserAgent/SkillsApply`. |
| `monthlycredits` | `number` | Monthly credit allocation snapshotted at deploy / renewal. |
| `monthlypriceusd` | `number` | Monthly USD price snapshotted at deploy / renewal. Mirrors `subscription.amount`. |
| `extracredits` | `number` | Active extra-credit balance (sum of non-expired packs from `POST /UserAgent/CreateExtraCreditCheckout`). |
| `usedcredits` | `number` | Credits consumed during the current billing period, reported by the agent runtime. |
| `remainingcredits` | `number` | Computed: `max(0, monthlycredits + extracredits - usedcredits)`. |
| `creditperiod` | `string` | `'YYYY-MM'` tag of the current billing window. Rolls over on subscription renewal. |
| `creditsyncat` | `number\|null` | Unix seconds of the last agent → API usage sync (null before the first report). |
| `peractioncosts` | `object` | `{ message, create, modify, regenerate }` — credits charged per action. Computed as `max()` across enabled skills' `pricing.credit_costs`. |
| `teamsessionmode` | `string` | Session isolation mode for team agents (`"collaborative"` or `"private"` — empty string for solo agents). |
| `subscription` | `object\|null` | Active subscription info, or `null` if no subscription. `subscription.plan` is `"agent"`, `subscription.provider` is `"prepaid"` for API-deployed instances. |
| `agent` | `object` | Parent agent template info (title, slug, cover, `tiers`, `tiermultiplier`, `extracreditpacks`). For custom builds this is a synthesized placeholder containing the same shape with `agent.custom: true`. |
| `extracreditsexpiry` | `number\|null` | Unix timestamp when the earliest extra credit pack expires. |

#### **POST** /UserAgent/Update

Updates an agent instance's **scalar fields only** (title, description, categories, cover URL). If the agent is currently **starting (status `3`)** or **running (status `4`)**, this triggers an automatic restart to apply the new settings (the agent is moved to Stopping with `restartafter: true`, and re-queued after it fully stops).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `guid` | string | Yes | Your UserAgent instance guid |
| `title` | string | No | New display name |
| `description` | string | No | New description (set to empty string or `null` to clear) |
| `categories` | array | No | Updated categories. Cannot be empty if provided. |
| `cover` | string | No | New cover image URL (set to empty string or `null` to clear). For multipart upload, use [`POST /UserAgent/Cover`](#post-useragentcover) instead. |

> **Scalar-only.** Credentials, custom skills, skill toggles, tier upgrades, and rate-limit edits use dedicated endpoints:
>
> | What you want to change | Use |
> |-------------------------|-----|
> | Provider credentials (API keys, OAuth settings) | [`POST /UserAgent/CredentialUpsert`](#post-useragentcredentialupsert) |
> | Custom skill values (strategy text, cron intervals, enabled flag) | [`POST /UserAgent/CustomSkillUpsert`](#post-useragentcustomskillupsert) |
> | Rename a user-created custom skill (key + optional description) | [`POST /UserAgent/CustomSkillRename`](#post-useragentcustomskillrename) |
> | Delete a user-created cron skill | [`POST /UserAgent/CustomSkillDelete`](#post-useragentcustomskilldelete) |
> | Toggle one or more integration skills on/off (with optional tier change) | [`POST /UserAgent/SkillsApply`](#post-useragentskillsapply) |
> | Apply a batch of skill toggles (with optional tier change) | [`POST /UserAgent/SkillsApply`](#post-useragentskillsapply) |
> | Upgrade Starter → Pro | [`POST /UserAgent/UpgradeTier`](#post-useragentupgradetier) |
> | Upload a cover image (multipart) | [`POST /UserAgent/Cover`](#post-useragentcover) |

> **Note:** If the agent's status is `6` (Setup Required) and a subsequent `CredentialUpsert` call completes all required credentials, the status automatically flips to `0` (Stopped) so you can call `Start`.

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
      "tiermultiplier": 3,
      "monthlypriceusd": 9,
      "monthlycredits": 1000,
      "extracredits": 0,
      "usedcredits": 320,
      "creditperiod": "2026-05",
      "creditsyncat": 1714694400,
      "status": 1,
      "pinned": false,
      "setuprequired": false,
      "teamsessionmode": "",
      "agent": {
        "guid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "title": "Instagram Manager",
        "slug": "instagram-manager",
        "headline": "Automate your Instagram presence with AI",
        "description": "An autonomous agent that manages your Instagram Business account.",
        "cover": "https://cdn.wiro.ai/uploads/agents/instagram-manager-cover.webp",
        "icon": "https://cdn.wiro.ai/uploads/agents/instagram-manager-icon.webp",
        "categories": ["social-media", "marketing"],
        "tiermultiplier": 3,
        "tiers": {
          "starter": { "priceUsd": 9,  "credits": 1000 },
          "pro":     { "priceUsd": 29, "credits": 5000 }
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

> **`Update` returns scalar useragent fields + the `agent` template summary + `setuprequired` only.** It does **not** re-compose the heavy children (`credentials`, `customskills`, `scheduledskills`, `skills`, `skillsmeta`, `peractioncosts`, `remainingcredits`, `subscription`, `extracreditsexpiry`). Call `UserAgent/Detail` afterwards if you need the full composed shape — `Update` is optimised for fast scalar writes.

> **Restart on running agents.** When the call lands on a status `3`/`4` agent, the response shows the lifecycle transition mid-flight: `status: 1` (Stopping) with a fresh `stoppingat` timestamp, `runningat` cleared, and `queuedat` set to the same instant — Wiro auto-queues the agent so it picks the new settings up after the next stop cycle.

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
      "tiermultiplier": 3,
      "monthlypriceusd": 9,
      "monthlycredits": 1000,
      "extracredits": 0,
      "usedcredits": 320,
      "creditperiod": "2026-05",
      "creditsyncat": 1714694400,
      "status": 4,
      "pinned": false,
      "teamsessionmode": "",
      "agent": {
        "guid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "title": "Instagram Manager",
        "slug": "instagram-manager",
        "headline": "Automate your Instagram presence with AI",
        "description": "An autonomous agent that manages your Instagram Business account.",
        "cover": "https://cdn.wiro.ai/uploads/agents/instagram-manager-cover.webp",
        "icon": "https://cdn.wiro.ai/uploads/agents/instagram-manager-icon.webp",
        "categories": ["social-media", "marketing"],
        "tiermultiplier": 3
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

> **Cover returns scalar useragent fields + the `agent` template summary only.** It does **not** include `setuprequired`, `peractioncosts`, `remainingcredits`, or any composed children (`credentials`, `customskills`, `scheduledskills`, `skills`, `skillsmeta`, `subscription`). The endpoint is optimised for the cover refresh round-trip; call `UserAgent/Detail` afterwards if you need the full composed shape.

#### **POST** /UserAgent/CredentialUpsert

Writes one or more credential fields for one or multiple providers in a single call.

If the agent is **starting** or **running**, completing the upsert triggers an automatic restart (`restartafter: true`).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Your UserAgent instance guid |
| `fields` | array | Yes | One or more field rows. Each row has `{ credentialkey, fieldname, fieldvalue, fieldstatus?, parentfield?, ordinal? }`. You can write to more than one `credentialkey` in a single request. |

Each field row:

| Field | Type | Description |
|-------|------|-------------|
| `credentialkey` | string | The provider key — e.g. `"instagram"`, `"google-ads"`, `"wordpress"`, `"telegram"`. Must match one of the credentials declared in `credentials` on `/UserAgent/Detail`. |
| `fieldname` | string | Field inside that credential — e.g. `"apiKey"`, `"clientid"`, `"bottoken"`. Must not start with `_` (reserved for internal sentinels such as `_isoptional`, `_isextra`). |
| `fieldvalue` | string \| number | The value to write. Empty string is allowed (effectively clears the field). |
| `fieldstatus` | string | Optional. One of `user`, `platform`, `oauth_app`, `oauth_picker`, `computed`, `control`. Defaults to `user` for API callers (the only status user-role API keys may write). OAuth picker/session fields are written by Wiro's OAuth callback internally, not by your API. |
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

#### **POST** /UserAgent/CustomSkillUpsert

Writes a single custom skill — either a **strategy** (instructions read by other skills at runtime) or a **scheduled task** (`cs-cron-*`).

The endpoint auto-normalises the skillkey to its canonical form. Bare slugs become `cs-<slug>`; if you also send `interval` (or `usercreated: true`) the slug is treated as a cron and becomes `cs-cron-<slug>`. So `"weekly-health-check"` with `interval: "0 9 * * 1"` is stored as `cs-cron-weekly-health-check`.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Your UserAgent instance guid |
| `skillkey` | string | Yes | The skill key. Strategies use bare names (e.g. `"content-tone"` → stored as `cs-content-tone`). Crons use a `cron-` prefix (e.g. `"cron-content-scanner"` → stored as `cs-cron-content-scanner`). |
| `value` | string | No | Strategy body / cron prompt text. Editable for preset strategies and user-created entries; bundled crons silently drop `value` writes. |
| `interval` | string | No | Cron expression (e.g. `"0 */4 * * *"`). Only persisted on `cs-cron-*` rows. |
| `enabled` | boolean | No | Turn a cron on or off. Only persisted on `cs-cron-*` rows. |
| `description` | string | No | Only persisted for user-created skills (preset descriptions are template-owned). |
| `usercreated` | boolean | No | Pass `true` to mark the row as user-created (admins also use this to flag a row as user-deletable). Server auto-prefixes `skillkey` with `cron-` when `usercreated: true` and no prefix is present. |

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

#### **POST** /UserAgent/CustomSkillDelete

Removes a user-created cron skill. **Preset-owned crons cannot be deleted** — disable them instead with `CustomSkillUpsert` + `enabled: false` (they re-materialise on container restart, which preserves the disabled state via `useredited: true`).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Your UserAgent instance guid |
| `skillkey` | string | Yes | The skill key to remove (`cs-cron-*` for user-created crons). |

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
> - `after_*` — value the row was left with after this action committed: pulled from the next-newer entry's BEFORE state, or from the live custom-skill row for the newest entry. `null` when `operation: "delete-user"` (row was removed).
> - `changed_fields[]` — names of fields whose value differs from the immediately-older entry. Subset of `["value", "interval", "enabled"]`.
> - `changedby_user` — resolved actor object (full shape: `uuid`, `firstname`, `lastname`, `email`, `username`, `avatar`, `avatarinitials`). `null` when `changedby` is `"system"` (automation / cron) or when the user record was deleted.

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
- Platform-only credentials (`wiro`, `calendarific`, `sys-openai`) short-circuit to an empty `entries[]` (no user-facing history to show).

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

> `changedby_user` is the resolved actor object (`uuid`, `firstname`, `lastname`, `email`, `username`, `avatar`, `avatarinitials`). It is `null` when `changedby` is `"system"` (automation / cron) or when the user record has been deleted.

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
      "int-telegram-post":  false
    }
  }'
```

##### Response (success)

```json
{
  "result": true,
  "errors": [],
  "tier": "pro",
  "stripeProrationApplied": false,
  "prepaidWalletDelta": 19.99,
  "restartTriggered": true,
  "restartedAt": 1714694520,
  "pricing": {
    "previousPriceUsd": 9,
    "newPriceUsd": 39,
    "deltaUsd": 30,
    "previousMonthlyCredits": 1000,
    "newMonthlyCredits": 6000,
    "deltaCredits": 5000,
    "enabledSkills": ["int-instagram-post", "int-twitterx-post", "int-wiro-generator"],
    "peractioncosts": { "message": 10, "create": 60, "modify": 20, "regenerate": 20 }
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `tier` | `string` | The tier in effect after the call (`"starter"` or `"pro"`). |
| `stripeProrationApplied` | `boolean` | Always `false` for prepaid subscriptions (the prorated charge is taken from the wallet as `prepaidWalletDelta` instead). |
| `prepaidWalletDelta` | `number` | USD debited (positive) or credited (negative) from the wallet for the prorated price diff. `0` when the toggle batch is a no-op or the agent has no active subscription yet. |
| `restartTriggered` | `boolean` | `true` when the agent runtime was restarted to pick up the new skill set. `false` for stopped agents (no restart needed) or no-op batches. |
| `restartedAt` | `number\|null` | Unix seconds when the restart trigger fired. `null` when `restartTriggered` is `false`. |
| `pricing.previousPriceUsd` / `newPriceUsd` / `deltaUsd` | `number` | USD totals before / after the apply, plus the signed delta. |
| `pricing.previousMonthlyCredits` / `newMonthlyCredits` / `deltaCredits` | `number` | Monthly credit allocation before / after, plus the signed delta. |
| `pricing.enabledSkills` | `array<string>` | Final enabled skill set including transitive `depends_on` closure — same skill names you'd see on `useragent.skills[].name` in the next `Detail` call. |
| `pricing.peractioncosts` | `object` | The `{ message, create, modify, regenerate }` per-action burn rates that follow from the new skill set. |

##### Common error codes

| Code | Meaning |
|------|---------|
| `100` | `skillsapply-template-only` — non-admin caller tried to mutate a template-deploy useragent. |
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
  "skills": ["instagram-post", "wiro-generator"]
}
```

##### B. Existing useragent preview

```json
{
  "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
  "tier": "pro",
  "skillOverrides": {
    "instagram-post": true,
    "telegram-post": false
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
  "tiermultiplier": 3,
  "totalPriceUsd": 14,
  "totalMonthlyCredits": 1500,
  "peractioncosts": { "message": 10, "create": 60, "modify": 20, "regenerate": 20 },
  "skillBreakdown": [
    { "skill": "instagram-post", "priceUsd": 5, "credits": 500, "actionCostOverrides": { "create": 60 } },
    { "skill": "wiro-generator", "priceUsd": 0, "credits": 0,   "actionCostOverrides": {} }
  ],
  "enabledSkills": ["instagram-post", "wiro-generator"],
  "directSkills":  ["instagram-post"],
  "agentBase": { "priceUsd": 9, "credits": 1000 },
  "tiers": {
    "starter": { "priceUsd": 9,  "credits": 1000 },
    "pro":     { "priceUsd": 14, "credits": 1500 }
  }
}
```

`enabledSkills` is the full closure (including transitive `depends_on`); `directSkills` is just what the user explicitly toggled.

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
  "monthlypriceusd": 29,
  "monthlycredits": 5000
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
      "tiermultiplier": 3,
      "monthlypriceusd": 29,
      "monthlycredits": 5000,
      "extracredits": 2000,
      "usedcredits": 1450,
      "creditperiod": "2026-05",
      "creditsyncat": 1714694410,
      "status": 4,
      "pinned": true,
      "teamsessionmode": "",
      "setuprequired": false,
      "subscription": {
        "plan": "agent",
        "status": "active",
        "amount": 29,
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
        "tiermultiplier": 3,
        "tiers": {
          "starter": { "priceUsd": 9,  "credits": 1000 },
          "pro":     { "priceUsd": 29, "credits": 5000 }
        }
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

### Extra Credit Packs

Pro-tier instances can buy additional credits at any time. Pack catalogs are derived per-useragent (5x / 10x / 20x of the instance's monthly allocation), so the catalog auto-scales when the user upgrades from Starter → Pro or toggles paid skills.

The catalog appears at `agent.extracreditpacks` on `UserAgent/Detail`:

```json
"extracreditpacks": [
  { "packkey": "small",  "credits": 25000,  "priceusd": 130, "enabled": true },
  { "packkey": "medium", "credits": 50000,  "priceusd": 240, "enabled": true },
  { "packkey": "large",  "credits": 100000, "priceusd": 420, "enabled": true }
]
```

#### **POST** /UserAgent/CreateExtraCreditCheckout

Purchases additional credits for a useragent. The wallet is debited the pack price and credits are added to the instance immediately.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Your UserAgent instance guid |
| `pack` | string | Yes | Pack key from `agent.extracreditpacks[].packkey` — `"small"`, `"medium"`, or `"large"`. |
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
| `Stripe subscriptions must be cancelled via Stripe portal` | The active subscription was set up through the Wiro web dashboard with a card (e.g. by a teammate) — manage it from the Wiro dashboard instead. API-managed prepaid subscriptions never hit this path. |
| `User agent not found` | Caller doesn't own the useragent and isn't a team admin |

#### **POST** /UserAgent/UpgradeTier

Upgrades the active subscription from **Starter → Pro**. The capability surface stays the same; the tier change just scales the credit pool and price by `tiermultiplier`.

**Upgrade-only.** Pro → Starter downgrades are rejected with an explicit error — cancel and redeploy at the lower tier instead.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `guid` | string | Yes | Your UserAgent instance guid |
| `targetTier` | string | Yes | Must be `"pro"` (`"starter"` is rejected with the downgrade error). |

**Headers:** Pass `teamGUID: <team-guid>` when the target agent belongs to a team project.

When called against a prepaid subscription, the wallet is debited the prorated upgrade fee `Math.max(0, ((P_pro − P_starter) / totalDays) × remainingDays)` synchronously, the subscription + useragent are updated to Pro pricing / credits, and the agent is restarted to apply the new tier. Existing extra credits and `usedcredits` are preserved.

##### Response

```json
{
  "result": true,
  "tier": "pro",
  "previousTier": "starter",
  "newPriceUsd": 29,
  "newMonthlyCredits": 5000,
  "proratedCharge": 11.33,
  "stripeProrationApplied": false,
  "errors": []
}
```

> `stripeProrationApplied` is part of the standard contract and is always `false` for prepaid subscriptions (the prorated charge is taken from the wallet as `proratedCharge` instead).

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
  "monthlycredits": 1000,
  "errors": []
}
```

- Updates the `subscriptions` row in place: `status: "active"`, `type: "renewal"`, `currentperiodstart: now`, `currentperiodend: now + 30 days`, `pendingdowngrade: null`.
- Debits `amount` (the snapshot `monthlypriceusd`) from the wallet (caller's personal wallet, or the agent's team wallet if the agent is team-scoped).
- Zeroes `usedcredits` and stamps the new `creditperiod`. Existing extra credits are preserved.
- If the agent was in `status: 0` (Stopped) or `5` (Error), it's auto-queued back to `2` (Queued) — the runtime picks it up on the next cycle, no extra `Start` call needed. Statuses `1`/`2`/`3`/`4` are mid-flight and settle on their own.

**Common errors:**

| Error | When |
|-------|------|
| `Subscription is already active` | Called on an active subscription with **no** pending cancel (nothing to do) |
| `No expired subscription found to renew` | No active sub and no expired sub — agent was never subscribed, or data is gone |
| `Stripe subscriptions must be managed via Stripe portal` | Active subscription was set up through the Wiro web dashboard with a card — undo a pending cancel from the Wiro dashboard. API-managed prepaid subscriptions never hit this path. |
| `Stripe subscriptions must be renewed via Stripe checkout` | Expired subscription was originally a card-based dashboard sub — re-subscribe from the Wiro dashboard, or call `CreateSubscriptionCheckout` with `useprepaid: true` to switch to wallet billing. |
| `Renewal pricing not available` | Resolver couldn't recompute price (skill registry drift); fix the agent's skill set or contact support |
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
| **Per-action costs** | `peractioncosts` (computed) | `max()` across enabled skills' `pricing.credit_costs`. Same value for Starter and Pro. |
| **Tier multiplier** | `agent.tiermultiplier` | Default `3`. Snapshotted on the useragent at deploy so admin tweaks don't retroactively change live instances. |
| **Extra credit packs** | `agent.extracreditpacks[]` | Per-useragent — derived as 5x / 10x / 20x of `monthlycredits`. Pro tier only (Starter has empty array). |

### Payment Method

All API subscriptions use your **prepaid wallet balance**. The cost is deducted immediately when you deploy, renew, upgrade, or buy an extra credit pack. Always pass `useprepaid: true` on `Deploy`, `CreateSubscriptionCheckout`, and `CreateExtraCreditCheckout` — that's the only path designed for API consumers. Make sure your wallet balance covers the upfront tier price before calling these endpoints; otherwise you'll get an `Insufficient wallet balance` error.

### Credit Consumption

Credits are consumed by the agent runtime (container) as it processes messages and generates content — not at `Message/Send` time. The `peractioncosts` object on the useragent declares how many credits each action burns; the container reports usage back to Wiro asynchronously through `POST /UserAgent/CreditSync` (and per-deduction via `POST /UserAgent/TransactionInsert`), which updates `usedcredits` and derives the live `remainingcredits = max(0, monthlycredits + extracredits - usedcredits)`.

The API-side check is gating only: `POST /UserAgent/Start` and `POST /UserAgent/Message/Send` refuse to launch / accept messages when `remainingcredits <= 0`. During an active session, monthly credits are consumed first; once `usedcredits >= monthlycredits`, extra credits (purchased via `CreateExtraCreditCheckout`) absorb the rest. When both pools are empty, the agent responds `[SYSTEM_CREDIT_LIMIT_REACHED]` and stops processing further actions.

On each billing cycle (subscription renewal) `usedcredits` is reset to zero and `creditperiod` advances to the new `'YYYY-MM'` window; extra-credit purchases simply bump `extracredits` without resetting usage.

For the full audit trail (every credit deduct / grant / purchase / renewal / cancel) call [`POST /UserAgent/TransactionList`](/docs/agent-transactions#post-useragenttransactionlist) — see [Agent Transactions](/docs/agent-transactions).

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
| `Agent setup is not complete. Please fill in your credentials before starting.` | Status is `6` — call `CredentialUpsert` / `SkillsApply` / `CustomSkillUpsert` to provide required values |
| `No credits available. Please renew your subscription or purchase extra credits.` | Monthly and extra credits are both exhausted |
| `Skill changes are only available for custom-built agents.` | `SkillsApply` called on a template-deploy useragent. Skills are inherited from the template — to change them, deploy a custom build (`Deploy` with `custom: true`) instead. |
| `Subscription already active for this useragent. Cancel or modify the existing subscription instead.` | `CreateSubscriptionCheckout` called when a sub already exists |
| `Insufficient wallet balance for proration. Required: $X.XX, available: $Y.YY` | `SkillsApply` — wallet can't cover the prorated charge |
| `Downgrading to Starter is not supported. /UserAgent/UpgradeTier is upgrade-only (Starter → Pro).` | `UpgradeTier` with `targetTier: "starter"` |
| `Already on {tier} tier` | `UpgradeTier` when current tier matches the target — no-op |
| `No active subscription — use /UserAgent/CreateSubscriptionCheckout to subscribe at the chosen tier` | `UpgradeTier` called without an active sub |
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
    "tier": "starter",
    "pinned": false
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
    "skills": { "gmail-check": true, "telegram-post": true, "wiro-generator": true }
  }'

# Live pricing preview before committing a skill change
curl -X POST "https://api.wiro.ai/v1/UserAgent/PricingPreview" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
    "skillOverrides": { "twitterx-post": true }
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
    console.log(`${a.title} (${a.slug}) — Starter $${a.tiers.starter.priceUsd}/mo`)
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
| **Custom build** | You want a unique skill combination — for example a custom support bot that watches Gmail, posts to Telegram, and uses Wiro's image generator. No marketplace template fits. | `POST /UserAgent/Deploy` with `custom: true` |

The two paths produce the **same useragent shape** at the end (same `customskills`, `scheduledskills`, `credentials`, `subscription`, `peractioncosts`, etc.). The only differences are:

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
- `category` — `int` (integration with a third-party service) or `rule` (rule-only, no credential)
- `credential_key` — which credential the skill needs (`null` for rule-only or platform-managed skills)
- `requires_credentials` — boolean, whether the user must supply a credential before the skill can run
- `depends_on` — array of skill names that must also be enabled (Wiro auto-enables transitive deps)
- `conflicts_with` — array of skill names that cannot coexist with this one
- `pricing` — the per-skill pricing recipe (`base_price_usd`, `base_credits`, `credit_costs.{message,create,modify,regenerate}`)

> **Use [`POST /Skills/Capabilities`](/docs/agent-skills#post-skillscapabilities)** to discover the closed-set capability vocabulary (the high-level tasks skills can perform). Useful when you want to find every skill that can "post-content" or "send-email".

## Step 2 — Live Pricing Preview

Before you commit, fetch the live tier price for the proposed skill set with [`POST /UserAgent/PricingPreview`](/docs/agent-overview#post-useragentpricingpreview) — the **draft** mode runs without touching any DB state.

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/PricingPreview" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "draft": true,
    "tier": "pro",
    "skills": ["gmail-check", "telegram-post", "wiro-generator"]
  }'
```

##### Response

```json
{
  "result": true,
  "errors": [],
  "tier": "pro",
  "tiermultiplier": 3,
  "totalPriceUsd": 27,
  "totalMonthlyCredits": 3000,
  "peractioncosts": { "message": 10, "create": 60, "modify": 20, "regenerate": 20 },
  "skillBreakdown": [
    { "skill": "gmail-check",    "priceUsd": 4, "credits": 400,  "actionCostOverrides": {} },
    { "skill": "telegram-post",  "priceUsd": 5, "credits": 500,  "actionCostOverrides": { "create": 60 } },
    { "skill": "wiro-generator", "priceUsd": 0, "credits": 0,    "actionCostOverrides": {} }
  ],
  "enabledSkills": ["gmail-check", "telegram-post", "wiro-generator"],
  "directSkills":  ["gmail-check", "telegram-post", "wiro-generator"],
  "agentBase": { "priceUsd": 9, "credits": 1000 },
  "tiers": {
    "starter": { "priceUsd": 9,  "credits": 1000 },
    "pro":     { "priceUsd": 27, "credits": 3000 }
  }
}
```

Read the response:

- `tiers.starter.priceUsd` and `tiers.pro.priceUsd` → what your wallet will be charged for each tier.
- `tiers.starter.credits` and `tiers.pro.credits` → monthly credit allocation.
- `peractioncosts` → how many credits each agent action burns.
- `skillBreakdown[]` → per-skill contribution to the total. Use this to see which skill is the most expensive.
- `enabledSkills` → final closure (includes any transitively-enabled `depends_on`).

> **`agentBase`** is the platform-wide floor (`$9 / 1000 credits`) — every agent has this base, regardless of skill set. The skill weights stack on top.

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
      "gmail-check":    true,
      "telegram-post":  true,
      "wiro-generator": true
    },
    "credentials": {
      "gmail":    { "account": "agent@company.com", "apppassword": "xxxx xxxx xxxx xxxx" },
      "telegram": { "bottoken": "123456:ABC-DEF...", "allowedusers": "[\"761381461\"]", "sessionmode": "private" }
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
      "agentid": null,
      "title": "Inbox Watcher",
      "description": "Watches inbound Gmail and forwards a summary to Telegram every 4 hours.",
      "tier": "pro",
      "tiermultiplier": 3,
      "status": 0,
      "setuprequired": false,
      "monthlycredits": 3000,
      "monthlypriceusd": 27,
      "remainingcredits": 3000,
      "creditperiod": "2026-05",
      "peractioncosts": { "message": 10, "create": 60, "modify": 20, "regenerate": 20 },
      "skills": ["gmail-check", "telegram-post", "wiro-generator"],
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
      "credentials": {
        "gmail":    { "_connected": false, "optional": false, "extra": false, "account": "agent@company.com", "apppassword": "[present]" },
        "telegram": { "_connected": false, "optional": false, "extra": false, "bottoken": "[present]", "allowedusers": "[\"761381461\"]", "sessionmode": "private" }
      },
      "agent": {
        "custom": true,
        "title": "Inbox Watcher",
        "tiermultiplier": 3,
        "tiers": {
          "starter": { "priceUsd": 9,  "credits": 1000 },
          "pro":     { "priceUsd": 27, "credits": 3000 }
        },
        "extracreditpacks": [
          { "packkey": "small",  "credits": 15000, "priceusd": 120, "enabled": true },
          { "packkey": "medium", "credits": 30000, "priceusd": 220, "enabled": true },
          { "packkey": "large",  "credits": 60000, "priceusd": 380, "enabled": true }
        ]
      }
    }
  ]
}
```

Notes on the response:

- `agentid: null` — confirms this is a custom build with no marketplace template.
- `agent.custom: true` — the synthesized template placeholder. Same shape as a template's `agent` block but no `slug` / `cover` / `categories` (custom builds aren't in the marketplace).
- `scheduledskills` already contains the cron from the Deploy body, with the canonical `cs-cron-` prefix added by the server.
- `status: 0` — Deploy auto-transitioned to Stopped because all required credentials were inline. Call `POST /UserAgent/Start` next.

## Step 4 — Refine Skills After Deploy

Custom builds are the only path where end users can toggle skills on/off after deploy. Use [`POST /UserAgent/SkillsApply`](/docs/agent-overview#post-useragentskillsapply) — even when you only want to flip a single skill, send it as a one-entry `skills` map. The endpoint charges the wallet once, triggers exactly one container restart, and rolls back atomically on payment failure.

> **Template-deploy useragents reject `SkillsApply` with `Skill changes are only available for custom-built agents.`** Skills are inherited from the marketplace agent template and changing them would diverge the instance. To run a different skill set, deploy a custom build (`Deploy` with `custom: true`) instead.

### Single-skill enable

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/SkillsApply" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
    "idempotencyKey": "550e8400-e29b-41d4-a716-446655440001",
    "skills": {
      "int-wordpress-post": true
    }
  }'
```

The response includes the new pricing snapshot and the prorated wallet debit:

```json
{
  "result": true,
  "errors": [],
  "tier": "starter",
  "stripeProrationApplied": false,
  "prepaidWalletDelta": 4.0,
  "restartTriggered": true,
  "restartedAt": 1714694520,
  "pricing": {
    "previousPriceUsd": 27,
    "newPriceUsd": 33,
    "deltaUsd": 6,
    "previousMonthlyCredits": 3500,
    "newMonthlyCredits": 4000,
    "deltaCredits": 500,
    "enabledSkills": ["int-gmail-check", "int-telegram-post", "int-wiro-generator", "int-wordpress-post"],
    "peractioncosts": { "message": 10, "create": 60, "modify": 20, "regenerate": 20 }
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
      "int-telegram-post":   true,
      "int-wiro-generator":  true,
      "int-wordpress-post":  true,
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
  "skills": { "gmail-check": true, "telegram-post": true },
  "credentials": {
    "gmail":    { "account": "agent@company.com", "apppassword": "xxxx xxxx xxxx xxxx" },
    "telegram": { "bottoken": "123456:ABC-DEF...", "allowedusers": "[\"761381461\"]", "sessionmode": "private" }
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
  "skills": { "wordpress-post": true, "website": true, "wiro-generator": true },
  "credentials": {
    "wordpress": { "url": "https://blog.example.com", "user": "admin", "apppassword": "xxxx xxxx xxxx xxxx" },
    "website":   { "urls": "[{\"websitename\":\"Wired\",\"url\":\"https://www.wired.com/feed/rss\"}]" }
  },
  "customskills": [
    {
      "key": "content-strategy",
      "value": "## Writing Style\nShort, punchy, technical. Always include code examples.\n\n## Sources\nWired, ArsTechnica, Hacker News.\n\n## Cadence\nOne 600-word article every Monday.",
      "_user_created": false
    },
    {
      "key": "cron-weekly-blog",
      "value": "Every Monday morning, scan the websites listed under cs-website, draft one 600-word article, and publish to WordPress as a draft.",
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
    "twitterx-post":   true,
    "instagram-post":  true,
    "linkedin-post":   true,
    "facebookpage-post": true,
    "wiro-generator":  true
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
2. **Subscribe** to [Agent WebSocket](/docs/agent-websocket) with the `agenttoken` → receive streaming response chunks
3. **Or poll** via the Detail endpoint to check status and fetch the completed response
4. **Or set** a `callbackurl` to receive a webhook notification when the agent finishes

This decoupled design means your application never blocks waiting for the agent to think. Send the message, hand the `agenttoken` to your frontend, and stream the response as it arrives.

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

## **POST** /UserAgent/Message/Send

Sends a user message to a deployed agent. The agent must be in running state (status `4`). Returns immediately with an `agenttoken` that you use to track the response via WebSocket, polling, or webhook.

Accepts either `application/json` (text-only) or `multipart/form-data` (text + file attachments). When sending files, the `message` field can be empty — the agent receives the attachments and any accompanying text.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | The agent instance GUID (from Deploy or MyAgents). |
| `message` | string | Conditional | The user message text. Required unless sending files via multipart. |
| `sessionkey` | string | No | Session identifier for conversation continuity. Defaults to `"default"`. |
| `callbackurl` | string | No | Webhook URL — the system will POST the final response to this URL when the agent finishes. |
| `attachment` / `attachments[]` | file | No | Multipart only — one or more file attachments that the agent can process. |

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

> **A successful Send response means the message was accepted and queued — not that it will definitely reach the agent.** After this response the system enqueues the job into Redis/BullMQ for the bridge to pick up. If the enqueue step itself fails (queue backpressure, Redis outage), the message row is flipped to `agent_error` server-side. Always confirm the final state via `POST /UserAgent/Message/Detail` or the WebSocket stream; don't assume the message progresses to `agent_start` just because Send returned `result: true`.

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
    "sessionkey": "default",
    "content": "What are the latest trends in AI?",
    "response": "Here are the key AI trends for 2026...",
    "debugoutput": "Here are the key AI trends for 2026...",
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
      "thinking": [],
      "answer": ["Here are the key AI trends for 2026..."],
      "isThinking": false
    },
    "attachments": [],
    "deletestatus": 0,
    "createdat": "1743350400",
    "startedat": "1743350401",
    "endedat": "1743350408"
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `guid` | `string` | Message GUID. |
| `uuid` | `string` | The account UUID of the user who sent the message. |
| `user` | `object\|null` | Resolved sender info: `{ uuid, firstname, lastname, email, username, avatar, avatarinitials }`. Decorated server-side from `agentmessages.uuid` so the chat bubble can render avatar / hover-tooltip without an extra `User/Detail` round-trip. `null` when the row was written by automation (sentinel `uuid` like `"system"`) or when the user record was deleted. |
| `sessionkey` | `string` | The session this message belongs to. |
| `content` | `string` | The original user message. |
| `response` | `string` | The agent's full response text. Empty until `agent_end`. |
| `debugoutput` | `string` | Accumulated output text. Updated during streaming, contains the full response after completion. |
| `status` | `string` | Current message status (see Message Lifecycle). |
| `metadata` | `object` | Parsed JSON object (API returns it already decoded). Populated from the agent bridge on `agent_end`. Fields produced by the bridge's `finalMessage` builder: `type` — always the literal `"progressGenerate"` (not the message status); `task` — always the literal `"Generate"`; `speed` — numeric words-per-second value (e.g. `14.2`); `speedType` — always `"words/s"`; `elapsedTime` — human string with unit, e.g. `"8.1s"` (NOT a number); `tokenCount`, `wordCount` — integers; `raw` — the full accumulated response text; `thinking` — array of reasoning blocks extracted from `<think>...</think>`; `answer` — array of answer chunks stripped of `<think>`; `isThinking` — always `false` in the final payload. Empty object `{}` for `agent_error`, `agent_cancel`, or when the bridge hasn't finished yet. Message status lives in the top-level `status` field — don't read it from `metadata.type`. |
| `attachments` | `array` | Always present as an array — empty `[]` for text-only messages. When the message was sent via multipart with files, each entry is a resolved `{url, name, type, size}` object (no further file-lookup needed). Identical shape in `Message/History` rows. |
| `deletestatus` | `number` | Internal flag. `0` for normal messages. |
| `createdat` | `string` | Unix timestamp when the message was created. |
| `startedat` | `string` | Unix timestamp when the agent started processing. |
| `endedat` | `string` | Unix timestamp when processing completed. May be empty for `agent_cancel` (cancel only sets `status` and `updatedat`). |

## **POST** /UserAgent/Message/History

Retrieves conversation history for a specific agent and session. Messages are returned **newest-first** with cursor-based pagination.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | The agent instance GUID. |
| `sessionkey` | string | No | Session identifier. Defaults to `"default"`. |
| `limit` | number | No | Maximum number of messages to return. Defaults to `50`, max `200`. |
| `before` | string | No | Message GUID to use as cursor — returns only messages created before this one. Omit for the most recent messages. |

> **Team agents:** If the agent's `teamsessionmode` is `collaborative`, History returns messages from **all team members** in the session. In the default `private` mode, History only returns messages sent by the caller's own `uuid`. Same applies to `Sessions` listing.

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
          "thinking": [],
          "answer": ["Here are the key AI trends for 2026..."],
          "isThinking": false
        },
        "attachments": [],
        "deletestatus": 0,
        "createdat": "1743350400"
      },
      {
        "guid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
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
        "content": "Tell me more about multimodal models",
        "response": "Multimodal models combine...",
        "debugoutput": "Multimodal models combine...",
        "status": "agent_end",
        "metadata": {},
        "attachments": [],
        "deletestatus": 0,
        "createdat": "1743350300"
      }
    ],
    "count": 2,
    "hasmore": false
  }
}
```

> Each message row carries `uuid` (sender) and a server-decorated `user` object with the full sender shape — same as `Message/Detail`. `user` is `null` for system-inserted rows (e.g. `Message/SystemInsert` writes when `uuid` is `"system"`) or when the underlying account has been deleted.

| Field | Type | Description |
|-------|------|-------------|
| `messages` | `array` | Array of message objects, newest first. Each row has the **same shape as `Message/Detail`** — including the `uuid` sender and decorated `user` object. |
| `count` | `number` | Number of messages in this page. |
| `hasmore` | `boolean` | `true` if there are older messages available. Pass the last message's `guid` as `before` to fetch the next page. |

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

Deletes messages in the given session for the **calling user**. This action cannot be undone.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | The agent instance GUID. |
| `sessionkey` | string | Yes | The session key to delete. |

> **Scope of deletion:** The API matches on both `useragentguid` + `sessionkey` **and** the caller's `uuid`, so only messages the calling user sent/received in this session are removed. In **collaborative** team mode (`teamsessionmode: "collaborative"`, Telegram group-shared sessions), other team members' messages in the same `sessionkey` remain intact — each member must call `DeleteSession` to clear their own share. Admin callers (platform owner) are not subject to this scoping. For private (per-user) sessions this distinction doesn't matter — the caller is the only owner.

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

### Response

```json
{
  "result": true,
  "messageguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
  "sessionkey": "default",
  "errors": []
}
```

- `messageguid` is the inserted row's guid — use it to address the message later via `Message/Detail` or to thread replies.
- `sessionkey` echoes the resolved session (matters when the caller passed `"auto"` or omitted the field).
- The inserted row carries `status: "agent_end"` and `metadata: {"type":"system"}` so the chat UI renders it as a non-interactive system bubble (no retry / cancel affordances).

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
  "result": true
}
```

**3. Streaming output event** (emitted multiple times — replace your displayed content with `message.answer` on each event):

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
    "thinking": [],
    "answer": ["Here are the key AI trends..."],
    "isThinking": false
  },
  "result": true
}
```

**4. Final event** (agent_end — terminal):

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
    "thinking": [],
    "answer": ["Here are the key AI trends for 2026..."],
    "isThinking": false
  },
  "endedat": 1743350408
}
```

> Payload delivered to your `callbackurl`. `metadata` is decoded into a JSON object.

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

## Correlating Events With Your Messages

Every agent lifecycle frame (`agent_subscribed` / `agent_start` / `agent_output` / `agent_end` / `agent_error` / `agent_cancel`) carries `agenttoken` — this is the **only** correlation key available on the wire. The wire payload does **not** include `messageguid`, `sessionkey`, or `useragentguid`. If you need any of those fields to route events back to a specific message in your UI, build the mapping yourself when you call `Message/Send`.

### Why `agenttoken` is the correlation key

- `Message/Send` issues exactly one `agenttoken` per message and returns it alongside `messageguid` in the HTTP response.
- The bridge stamps the same `agenttoken` on every event it emits for that message.
- Multiple connections can subscribe to the same `agenttoken` and each gets the full event stream — so `agenttoken` is also the fan-out key.
- A single socket can hold subscriptions for many `agenttoken`s at once (see [Multi-session subscription](#multi-session-subscription)) — the per-event `agenttoken` lets your handler dispatch into the right UI element.

### Recommended client pattern

1. Call `POST /UserAgent/Message/Send` — you get back `{ messageguid, agenttoken, status: "agent_queue", ... }`.
2. Store the mapping `agenttoken → messageguid` (or `agenttoken → your UI message id`).
3. Send `{ "type": "agent_info", "agenttoken }` on an open socket (new or existing — connections can be reused).
4. In `ws.onmessage`, read `msg.agenttoken` on every agent lifecycle frame, look up your stored mapping, and update the matching UI element.
5. When you see a terminal event (`agent_end` / `agent_error` / `agent_cancel`), delete the mapping so it doesn't leak memory across sessions.

```javascript
const tokenToMessageId = new Map()

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
    case 'agent_output':
      updateUI(uiMessageId, { streaming: msg.message.raw })
      break
    case 'agent_end':
      updateUI(uiMessageId, { final: msg.message.raw, status: 'agent_end' })
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

> **Note:** For `agent_error`, the webhook's `response` / `debugoutput` contain the **raw error** from the agent runtime (useful for debugging). The same message may be **sanitized to a user-facing string** when you read it back via `POST /UserAgent/Message/Detail`, so the two can differ. Log the webhook payload if you need the original.

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

The `agenttoken` can be used to track the message via [Agent WebSocket](/docs/agent-websocket) for real-time streaming, while the webhook delivers the final result to your server.

---

# Agent Credentials & OAuth

Configure third-party service connections for your agent instances. Browse the platform's credential registry, set API keys + OAuth, and audit credential edits over time.

## Overview

Wiro agents connect to external services — social platforms, ad networks, email tools, CRMs — through two credential methods:

1. **API Key credentials** — set directly via `POST /UserAgent/CredentialUpsert` (bulk field upsert per provider).
2. **OAuth credentials** — redirect-based authorization via `POST /UserAgentOAuth/{Provider}Connect`, where Wiro handles token exchange server-side.

Each external service is documented as its own **integration page** with the complete setup walkthrough, API reference, troubleshooting, and multi-tenant architecture notes. Use the catalog below to jump to the one you need.

> **Read & write paths at a glance:**
>
> | Operation | Endpoint |
> |-----------|----------|
> | Browse all credentials in the registry | [`POST /Credentials/List`](#post-credentialslist) (public) |
> | Inspect a single credential schema | [`POST /Credentials/Detail`](#post-credentialsdetail) (public) |
> | Find the credential a skill needs | [`POST /Skills/CredentialSchema`](/docs/agent-skills#post-skillscredentialschema) (public) |
> | Write one or more credential fields | [`POST /UserAgent/CredentialUpsert`](/docs/agent-overview#post-useragentcredentialupsert) |
> | Read version history of a credential | [`POST /UserAgent/CredentialFieldHistory`](/docs/agent-overview#post-useragentcredentialfieldhistory) |
>
> Read responses from `POST /UserAgent/Detail` / `POST /UserAgent/MyAgents` expose the composed `credentials` tree (each provider with its `_connected` / `optional` / `extra` / `_editable` / `_schema` flags), the `customskills[]` array, the `scheduledskills[]` array (cron skills), the `skills[]` array of enabled skill names, the `peractioncosts` object, and the flat credit fields (`monthlycredits`, `extracredits`, `usedcredits`, `remainingcredits`, `creditperiod`, `creditsyncat`) as **top-level fields** on the useragent object. See [Agent Overview](/docs/agent-overview) for the full endpoint catalog.

## Credential Registry Endpoints

These endpoints are **public — no authentication required**. They return data straight from the credential registry — useful when you want to render a "Connect this provider" form without a deployed useragent (e.g. inside an onboarding wizard).

### **POST** /Credentials/List

Lists all credentials in the registry.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `credential_mode` | string | No | Filter by mode: `"oauth"`, `"sa"` (service account), `"api_key"`, `"multi_api_key"`, `"hybrid"` (OAuth + API key fallback), `"imap_credentials"`, `"jwt_sa"`, `"rule_only"`. |
| `wiro_connect_pending` | boolean | No | Filter by the "Wiro mode coming soon" flag (Meta integrations while Wiro's app is under review). |

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
      "credential_mode": "oauth",
      "connection_modes": ["wiro", "own"],
      "wiro_connect_pending": true,
      "credential_schema": [
        {
          "key": "appid",
          "type": "text",
          "label": "App ID",
          "required": true,
          "pattern": "^[0-9]+$",
          "help": "Meta for Developers → My Apps → Create App → copy App ID. Add Facebook Login product and OAuth Redirect URI: https://api.wiro.ai/v1/UserAgentOAuth/IGCallback",
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
        "connect_endpoint": "/UserAgentOAuth/IGConnect",
        "disconnect_endpoint": "/UserAgentOAuth/IGDisconnect",
        "status_endpoint": "/UserAgentOAuth/IGStatus",
        "connect_button_label": "Connect with Instagram",
        "connect_button_icon": "/images/icons/skills/instagram.svg",
        "connect_button_brand_color": "#e4405f",
        "connect_button_text_color": "#ffffff",
        "connect_button_logo_filter": "none",
        "username_field": "igusername",
        "return_query_param": "ig_connected",
        "return_error_param": "ig_error",
        "return_error_detail_param": "ig_error_detail",
        "account_picker": null,
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
| `credential_mode` | `string` | One of `"oauth"`, `"sa"` (service account), `"api_key"`, `"multi_api_key"`, `"hybrid"` (OAuth + API key fallback), `"imap_credentials"`, `"jwt_sa"`, `"rule_only"`. |
| `connection_modes` | `array<string>` | Auth modes the credential supports (`["wiro", "own"]` for OAuth, `["api_key"]` for API key, `["sa"]` for service account). Drives the auth-method picker. |
| `wiro_connect_pending` | `boolean` | When `true`, Wiro's shared OAuth client is awaiting provider review (Meta family). Forces **own** mode until the platform clears review. |
| `credential_schema` | `array<field>` | Per-field schema describing the credential form. Each entry: `{ key, type, label, required, placeholder?, pattern?, help?, options?, default?, show_toggle?, oauth_managed?, auto_filled_by_oauth?, readonly_when_connected?, only_in_modes?, platform_managed?, item_schema?, item_type? }`. |
| `oauth_provider` | `object\|null` | OAuth wiring (endpoints, button styling, picker config) when `credential_mode` includes OAuth. `null` for non-OAuth credentials. |
| `used_by_skills` | `array<string>` | Skill names that consume this credential. |

**`fieldstatus` values** — `fieldstatus` is **not** part of the registry schema; it's a runtime classification applied to each credential field at write time. It controls who can see the value:

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

Returns a single credential entry by key. The response is the **same full credential entry** as a row from `Credentials/List`.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `key` | string | Yes | Canonical credential key (e.g. `"instagram"`, `"google-ads"`, `"telegram"`). |

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
    "credential_mode": "oauth",
    "connection_modes": ["wiro", "own"],
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
      "connect_endpoint": "/UserAgentOAuth/IGConnect",
      "disconnect_endpoint": "/UserAgentOAuth/IGDisconnect",
      "status_endpoint": "/UserAgentOAuth/IGStatus",
      "connect_button_label": "Connect with Instagram",
      "connect_button_icon": "/images/icons/skills/instagram.svg",
      "connect_button_brand_color": "#e4405f",
      "connect_button_text_color": "#ffffff",
      "connect_button_logo_filter": "none",
      "username_field": "igusername",
      "return_query_param": "ig_connected",
      "return_error_param": "ig_error",
      "return_error_detail_param": "ig_error_detail",
      "account_picker": null,
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
| Meta Ads | Own only (Wiro mode coming soon) | [Meta Ads Skills](/docs/integration-metaads-skills) |
| Facebook Page | Own only (Wiro mode coming soon) | [Facebook Page Skills](/docs/integration-facebook-skills) |
| Instagram | Own only (Wiro mode coming soon) | [Instagram Skills](/docs/integration-instagram-skills) |
| LinkedIn | Own only (Wiro mode coming soon) | [LinkedIn Skills](/docs/integration-linkedin-skills) |
| Twitter / X | Wiro + Own | [Twitter Skills](/docs/integration-twitter-skills) |
| TikTok | Wiro + Own | [TikTok Skills](/docs/integration-tiktok-skills) |
| Google Ads | Wiro + Own | [Google Ads Skills](/docs/integration-googleads-skills) |
| YouTube | Wiro + Own | See [Google Ads Skills](/docs/integration-googleads-skills) (same OAuth client) |
| Google Analytics 4 | Wiro + Own | See [Google Ads Skills](/docs/integration-googleads-skills) (same OAuth client) |
| Merchant Center | Wiro + Own | See [Google Ads Skills](/docs/integration-googleads-skills) (same OAuth client) |
| HubSpot | Wiro + Own | [HubSpot Skills](/docs/integration-hubspot-skills) |
| Mailchimp | Wiro + Own + API Key | [Mailchimp Skills](/docs/integration-mailchimp-skills) |

> **Google OAuth is shared across 4 APIs.** Google Ads, YouTube, Google Analytics 4, and Merchant Center are all authorized through a single Wiro OAuth client in "wiro" mode — one Google Cloud project, one OAuth 2.0 Client ID, multiple API scopes. In "own" mode you may reuse one of your own OAuth clients the same way, or set up separate ones per product.

### Service Account Integrations

| Integration | Setup Guide |
|-------------|-------------|
| Google Drive | [Google Drive Skills](/docs/integration-googledrive-skills) |
| Google Play | [Google Play Skills](/docs/integration-googleplay-skills) |

> **Meta Platforms availability:** While Wiro's shared Meta App is under review by Meta, the Meta Ads, Facebook Page, and Instagram integrations must be connected using your own Meta Developer App in Development Mode. No App Review is required — users who are listed in your app's Roles (Testers/Developers) can connect without review. See each integration page for step-by-step setup.

### API Key Integrations

| Integration | Setup Guide |
|-------------|-------------|
| Gmail | [Gmail Skills](/docs/integration-gmail-skills) |
| Telegram | [Telegram Skills](/docs/integration-telegram-skills) |
| Firebase | [Firebase Skills](/docs/integration-firebase-skills) |
| WordPress | [WordPress Skills](/docs/integration-wordpress-skills) |
| App Store Connect | [App Store Skills](/docs/integration-appstore-skills) |
| Apollo | [Apollo Skills](/docs/integration-apollo-skills) |
| Lemlist | [Lemlist Skills](/docs/integration-lemlist-skills) |
| Brevo | [Brevo Skills](/docs/integration-brevo-skills) |
| SendGrid | [SendGrid Skills](/docs/integration-sendgrid-skills) |

## Platform-Managed Credentials

Some credentials are **managed by Wiro on your behalf** — you don't provide them, you can't see them in API responses, and attempts to set them via `POST /UserAgent/CredentialUpsert` are rejected (the server only accepts fields with `fieldstatus: "user"` from API callers):

- **OpenAI** — Wiro uses its own OpenAI account to power the LLM brain of every agent. You never need to supply an OpenAI key.
- **Wiro platform** (`credentials.wiro.apiKey`) — pre-configured for agents that have the `wiro-generator` skill enabled. This skill lets the agent call Wiro's own AI models (image/video/audio/LLM) internally — see [Using Wiro AI Models from Your Agent](/docs/agent-skills#using-wiro-ai-models-from-your-agent).
- **Calendarific** — pre-configured for agents that use the Calendarific skill (holiday/special-date lookups).

These credentials are stored with `fieldstatus: "platform"` in the template. `POST /UserAgent/Detail` omits them from the `credentials` response (they're filtered out server-side). If your agent needs them, they're already wired up.

> **Don't confuse platform-managed `credentials.wiro.apiKey` with your regular Wiro API key.** The key in `credentials.wiro.apiKey` is internal to the agent container; the `x-api-key` header you send to Wiro endpoints from your own backend is entirely separate (see [Authentication](/docs/authentication)).

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

`changedby_user` is the resolved actor object (`uuid`, `firstname`, `lastname`, `email`, `username`, `avatar`, `avatarinitials`). It is `null` when `changedby` is `"system"` (automation / cron) or when the user record has been deleted.

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
- Credential groups that don't exist in the template cannot be created — you can only write fields for credential keys the agent declares.
- **Nested arrays** (`firebase.accounts[].apps[]`, `googledrive.folders[]`, `appstore.apps[]`, etc.) are supported via the optional `parentfield` (dotted path) and `ordinal` (array index) on each field row. Send the complete desired list — positional merge applies: indices you don't send are kept from the previous state, unless you explicitly send an empty set to clear them.
- Use `POST /UserAgent/Detail` to inspect which fields each credential exposes, and the `_connected` / `optional` / `extra` flags that describe its readiness state.

### Prepaid deploy — inline setup supported (with limitations)

If you call `POST /UserAgent/Deploy` with `useprepaid: true`, you may pass `credentials`, `customskills` (or the equivalent key `customskills`), and `skills` at the **top level of the Deploy body**. The server applies them to the normalized child tables in the same call (one-shot deploy + initial setup).

**Deploy body `credentials` limitations:**

- Only **flat fields** are accepted — values must be `string` or `number`. Nested object values are ignored.
- Nested arrays (`firebase.accounts[]`, `googledrive.folders[]`, `appstore.apps[]`, `googleplay.apps[]`) **cannot be set via the Deploy body**. Deploy an empty instance first, then call `POST /UserAgent/CredentialUpsert` with `parentfield`/`ordinal` rows to populate arrays.
- Fieldnames starting with `_` (sentinel rows like `_isoptional`, `_isextra`) are silently skipped.
- All fields written through Deploy are set to `fieldstatus: "user"` automatically — you can't choose a different fieldstatus from the Deploy body. Use `POST /UserAgent/CredentialUpsert` afterwards if you need admin-only statuses.

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
# template — and the API rejects user-role writes to them. The template flips
# them to fieldstatus="user" when the credential is configured for own mode
# (so customers can bring their own keys); on those templates the call below
# works. If your API key gets `agent-fieldstatus-not-allowed-for-role`, the
# template doesn't support own mode and you should use wiro mode instead.

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
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/XConnect" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "redirecturl": "https://your-app.com/callback",
    "authmethod": "own"
  }'
```

For Wiro mode: skip Step 1, just call Step 2 with `authmethod: "wiro"` (or omit — it defaults to `"wiro"`).

### Callback URL pattern (own mode)

Register this URL in your OAuth app settings on the provider's developer portal:

```
https://api.wiro.ai/v1/UserAgentOAuth/{Provider}Callback
```

Provider-specific paths: `XCallback`, `TikTokCallback`, `IGCallback`, `FBCallback`, `LICallback`, `GAdsCallback`, `MetaAdsCallback`, `MCCallback`, `YTCallback`, `GA4Callback`, `HubSpotCallback`, `MailchimpCallback`.

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

> **Conditional params:** `gads_accounts`, `mc_accounts`, `yt_channels`, `ga4_properties`, and `metaads_accounts` are omitted from the redirect when the provider returns zero items (for example, no accessible Google Ads customers, or a developer token is missing in Wiro mode). `fb_pages` is always present on success — Facebook returns `fb_error=no_pages` instead when the user has no administered Pages.

Common error codes across providers:

| Code | Meaning |
|------|---------|
| `missing_params` | Callback hit without `state` or `code`. |
| `authorization_denied` | User cancelled, or (Meta Dev Mode) not in App Roles. |
| `session_expired` | 15-minute OAuth state cache expired. |
| `token_exchange_failed` | Wrong Client/App Secret or redirect URI mismatch. |
| `useragent_not_found` | Invalid or unauthorized `useragentguid`. |
| `invalid_config` | Agent has no credentials block for the provider. |
| `internal_error` | Unexpected server error. |

Provider-specific codes:

| Code | Provider | Meaning |
|------|----------|---------|
| `no_pages` | Facebook | OAuth succeeded but the user administers no Pages. |
| `template_not_found` | Google Ads (Wiro mode) | Wiro's shared template doesn't have `googleads` credentials; switch to own mode. |

> The `useragent_not_found` error value (snake_case) appears in redirect URLs. The same condition surfaces as `"User agent not found or unauthorized"` in JSON responses from Connect/Disconnect endpoints.

## Generic OAuth Endpoints

All integrations share these three endpoints. Replace `{Provider}` with one of the URL-prefix codes Wiro ships:

| URL prefix | Provider | Canonical credential key |
|------------|----------|--------------------------|
| `X` | Twitter / X | `twitter` |
| `TikTok` | TikTok | `tiktok` |
| `IG` | Instagram | `instagram` |
| `FB` | Facebook Pages | `facebook-pages` |
| `LI` | LinkedIn | `linkedin` |
| `GAds` | Google Ads | `google-ads` |
| `MetaAds` | Meta Ads | `meta-ads` |
| `MC` | Google Merchant Center | `google-merchant-center` |
| `YT` | YouTube | `youtube` |
| `GA4` | Google Analytics 4 | `ga4` |
| `HubSpot` | HubSpot | `hubspot` |
| `Mailchimp` | Mailchimp | `mailchimp` |

### POST /UserAgentOAuth/{Provider}Status

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Agent instance GUID. |

##### Response

The shape is consistent across providers — only the **identity field** name changes (some providers expose the connected account under `username`, others under a provider-specific key like `linkedinname`, `customerid`, `merchantid`):

```json
{
  "result": true,
  "errors": [],
  "connected": true,
  "username": "yourbrand",
  "connectedat": "1714694410",
  "tokenexpiresat": "1719878410",
  "refreshtokenexpiresat": "1730073610"
}
```

| Field | Type | Description | Providers |
|-------|------|-------------|-----------|
| `connected` | `boolean` | `true` when Wiro has a valid access token AND every required picker field (ad-account id, page id, customer id, channel id, merchant id, GA4 property id, …) is populated. |  All |
| `connectedat` | `string` | Unix-seconds timestamp of the last successful Connect / token refresh. Empty string when never connected. | All |
| `tokenexpiresat` | `string` | Unix-seconds when the current access token expires. Empty for Mailchimp (no expiry). | All except Mailchimp |
| `refreshtokenexpiresat` | `string` | Unix-seconds when the refresh token expires. Only set for providers that issue refresh tokens. | Twitter / X, TikTok, LinkedIn |
| `username` | `string` | Connected account identifier. Replaced by a provider-specific key on some providers (see below). | Twitter / X, TikTok, Instagram, Facebook Pages, HubSpot, Mailchimp |
| `linkedinname` | `string` | LinkedIn profile name (replaces `username`). | LinkedIn |
| `customerid` / `customerdescriptivename` | `string` | Google Ads customer id + human-readable label. | Google Ads |
| `merchantid` | `string` | Merchant Center merchant id. | Google Merchant Center |
| `channelid` / `channelname` | `string` | YouTube channel id + display name. | YouTube |
| `propertyid` / `propertyname` | `string` | GA4 property id + human-readable label. | GA4 |
| `adaccountid` / `adaccountname` | `string` | Meta Ads account id (without `act_` prefix) + label. | Meta Ads |

### POST /UserAgentOAuth/{Provider}Disconnect

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/{Provider}Disconnect" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "useragentguid": "your-useragent-guid" }'
```

Response: `{ "result": true, "errors": [] }`. The agent restarts automatically if it was running. Twitter/X and TikTok additionally call the provider's revoke endpoint; other providers only clear the stored credentials (the token remains valid on the provider side until it expires).

### POST /UserAgentOAuth/TokenRefresh

> **API users don't normally call this endpoint.** Wiro's agent runtime refreshes tokens automatically via this endpoint itself — see [Automatic token refresh](#automatic-token-refresh) below. TokenRefresh is exposed publicly mainly for debugging and manual overrides.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Agent instance GUID. |
| `provider` | string | Yes | Canonical credential key — one of: `twitter`, `tiktok`, `instagram`, `facebook-pages`, `linkedin`, `google-ads`, `meta-ads`, `hubspot`, `google-merchant-center`, `youtube`, `ga4`. |

**Mailchimp is not supported** — its tokens don't expire. Calling TokenRefresh with `provider: "mailchimp"` returns `Invalid provider`.

##### Response

```json
{
  "result": true,
  "errors": [],
  "accesstoken": "EAAB...",
  "refreshtoken": "AQX..."
}
```

`refreshtoken` is empty for providers that don't issue one (Instagram, Facebook Pages, Meta Ads, Google Ads usually).

### Automatic token refresh

Every running agent container runs background cron jobs that call `POST /UserAgentOAuth/TokenRefresh` against this API on a schedule tuned to each provider's token lifetime. There is **nothing to set up** — as long as the agent is running, tokens are kept fresh.

Refresh cadence inside the agent container:

| Provider | Cron interval | Token lifetime |
|----------|---------------|----------------|
| HubSpot | every 20 min | 30 min |
| Google Ads | every 45 min | 1 hour |
| Twitter / X | every 90 min | 2 hours |
| Instagram, Facebook, Meta Ads, LinkedIn, TikTok | once per day | 1–60 days |
| Mailchimp | never (tokens don't expire) | — |

An initial refresh also runs on every container startup, so tokens are always current by the time the first skill call goes out.

**You should manually call TokenRefresh only if:**

- You're debugging a stuck integration and want to force a new token immediately.
- The agent has been stopped for longer than the token lifetime and you want to pre-warm tokens before Start.
- You want to verify the refresh logic end-to-end for a provider.

Hardcoded token TTLs that Wiro stores after each refresh:

| Provider | Access Token `tokenexpiresat` | Refresh Token |
|----------|--------------------------------|----------------|
| Twitter / X | 2 hours | ~180 days |
| TikTok | 1 day | ~1 year |
| Instagram | 60 days | N/A (refreshes with current access token via `ig_refresh_token`) |
| Facebook | 60 days | N/A (refreshes via `fb_exchange_token`) |
| LinkedIn | 60 days | From provider response (~1 year typical) |
| Google Ads | 1 hour | Long-lived (no expiry in typical use) |
| Meta Ads | 60 days | N/A |
| HubSpot | 30 minutes | Long-lived |
| Mailchimp | No expiry | N/A |

## Provider-Specific Post-Callback Endpoints

Some integrations require a secondary step after the OAuth callback to finalize the connection. These are documented in full on each integration page.

### Meta Ads — Set Ad Account

After `MetaAdsCallback`, the user must choose an ad account:

**POST** `/UserAgentOAuth/MetaAdsSetAdAccount`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Agent instance GUID. |
| `adaccountid` | string | Yes | Ad account ID without `act_` prefix (prefix stripped automatically). |
| `adaccountname` | string | No | Display name shown in dashboards. |

See [Meta Ads Skills](/docs/integration-metaads-skills).

### Facebook Page — Set Page

After `FBCallback`, the connection is incomplete until the user chooses a Page:

**POST** `/UserAgentOAuth/FBSetPage`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Agent instance GUID. |
| `pageid` | string | Yes | A page ID from the `fb_pages` callback array. |
| `pagename` | string | No | Display name override. |

Must be called within 15 minutes of the callback (pending cache TTL). See [Facebook Page Skills](/docs/integration-facebook-skills).

### Google Ads — Set Customer ID

After `GAdsCallback`, pick an accessible customer:

**POST** `/UserAgentOAuth/GAdsSetCustomerId`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Agent instance GUID. |
| `customerid` | string | Yes | 10-digit customer ID (dashes stripped). |
| `customerdescriptivename` | string | No | Human-readable label shown in the dashboard (e.g. `"Acme Corp — Production"`). |

See [Google Ads Skills](/docs/integration-googleads-skills).

## Web UI Behaviors (Wiro Dashboard)

If you're comparing against the Wiro Dashboard, here's what happens under the hood for parity with the API:

- **Per-group save**: Each credential card has its own Save button. Saving a card calls `POST /UserAgent/CredentialUpsert` with only that group's `fields[]` (one request per card).
- **Own mode 2-step**: When a user clicks "Connect" in own mode, the Dashboard first calls `CredentialUpsert` to save `appid`/`appsecret` + `authmethod: "own"`, then calls the Connect endpoint with `authmethod: "own"`. API users must make both calls explicitly.
- **Full-page redirect, not popup**: `window.location.href = authorizeUrl` — no popup windows (avoids third-party cookie issues).
- **No manual token refresh button**: Refresh is fully automatic. `TokenRefresh` exists for debugging only.
- **LLM Markdown feature**: The Dashboard includes an "LLM Markdown" tab that generates a ready-to-paste prompt for AI assistants summarizing every credential field the agent needs. Useful for API users building their own configuration UIs — see the per-integration help texts for equivalent guidance.
- **No format validation**: Wiro doesn't validate email/URL formats server-side. Malformed values fail at runtime inside the skill when it tries to use them.
- **Platform-managed credentials are hidden**: Groups whose fields all have `fieldstatus: "platform"` (OpenAI, Wiro, Calendarific) are omitted from `POST /UserAgent/Detail` responses entirely. They're pre-configured by Wiro and can't be set by customers.

## Setup Required State

If an agent has required credentials not yet filled in, it's in **Setup Required** state (`status: 6`). It can't be started until credentials are complete.

- Fresh normal deploy → status `2` (Queued) immediately.
- Fresh prepaid deploy → status `6` (Setup Required) — fill credentials via `POST /UserAgent/CredentialUpsert`, then call Start.
- `setuprequired` flag in `UserAgent/Detail` / `UserAgent/MyAgents` is `true` when any non-optional credential is still incomplete. The server treats a credential as complete when either:
  - **OAuth credentials** — `_connected: true` (access token present **and** every required picker field populated), or
  - **API-key credentials** — at least one field with `fieldstatus: "user"` has a non-empty value (any one user-writable field filled in makes the credential count as "entered"; there is no deeper per-field validation).

  The two branches are checked together: `setuprequired` stays `true` until every required credential passes one of them.

## Security

- **Tokens are stored server-side** by Wiro (one row per field). `TokenRefresh` returns new tokens in its own response.
- **`oauth_session` fields are always stripped** from Status, Detail, `MyAgents`, and `CredentialUpsert` responses — `accesstoken`, `refreshtoken`, `tokenexpiresat`, `pageAccessToken` and any similar rows never leave the server.
- **`platform` fields are stripped for `user` role callers** (default for API keys without ADMIN scope). OpenAI / Wiro / Calendarific keys are invisible in the response.
- **`oauth_app` fields (`clientsecret`, `appsecret`) are visible in Detail responses** after an admin / OAuth "own mode" setup writes them. If you build a customer-facing UI on top of this API, treat them as admin-only in your own layer. The append-only credential history redacts `clientsecret` to `[REDACTED]` and always redacts `oauth_session` rows; only the live row can be read.
- **`fieldstatus` enforces least-privilege writes.** API callers only hold `user` role — they cannot write `oauth_app`, `oauth_session`, `oauth_picker`, `platform`, `computed`, or `control` fields. Attempts to do so return `agent-fieldstatus-not-allowed-for-role` in the `errors[]` array without altering data.
- The `redirecturl` receives only connection status parameters — no tokens, no secrets.
- OAuth state parameters use a 15-minute TTL cache to prevent replay attacks.
- Redirect URLs must be HTTPS (or localhost/127.0.0.1 for development).
- Facebook Page tokens are cached server-side for 15 minutes after the OAuth callback; clients only see `{id, name}` pairs. Page access tokens never leave the server.

## For Third-Party Developers

If you're building a product on top of Wiro agents and need your customers to connect their own accounts:

1. **Deploy** an agent instance per customer via `POST /UserAgent/Deploy`.
2. **Connect** — your backend calls `POST /UserAgentOAuth/{Provider}Connect` with the customer's `useragentguid` and a `redirecturl` pointing back to your app.
3. **Redirect** — send the customer's browser to the returned `authorizeUrl`.
4. **Authorize** — customer authorizes on the provider's consent screen.
5. **Return** — customer lands on your `redirecturl` with success/error query parameters.
6. **Finalize** — for Meta Ads, Facebook, Google Ads: call the appropriate SetAdAccount/SetPage/SetCustomerId endpoint.
7. **Verify** — call `POST /UserAgentOAuth/{Provider}Status`.

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
    // Facebook always requires FBSetPage to finalize
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

> **Read & write paths at a glance:**
>
> | Operation | Endpoint |
> |-----------|----------|
> | Browse all skills (registry) | [`POST /Skills/List`](#post-skillslist) (public) |
> | Inspect a single skill | [`POST /Skills/Detail`](#post-skillsdetail) (public) |
> | Find the credential a skill needs | [`POST /Skills/CredentialSchema`](#post-skillscredentialschema) (public) |
> | List the closed-set capability vocabulary | [`POST /Skills/Capabilities`](#post-skillscapabilities) (public) |
> | Edit a preference skill's `value` or a cron's `interval`/`enabled` | [`POST /UserAgent/CustomSkillUpsert`](/docs/agent-overview#post-useragentcustomskillupsert) |
> | Rename a user-created custom skill (key + optional description) | [`POST /UserAgent/CustomSkillRename`](/docs/agent-overview#post-useragentcustomskillrename) |
> | Delete a user-created cron skill | [`POST /UserAgent/CustomSkillDelete`](/docs/agent-overview#post-useragentcustomskilldelete) |
> | Read version history of a custom skill | [`POST /UserAgent/CustomSkillHistory`](/docs/agent-overview#post-useragentcustomskillhistory) |
> | Revert a custom skill to preset / a historical version | [`POST /UserAgent/CustomSkillRevert`](/docs/agent-overview#post-useragentcustomskillrevert) |
> | Toggle one or more integration skills (the top-level `skills` array, e.g. `int-instagram-post`) on/off | [`POST /UserAgent/SkillsApply`](/docs/agent-overview#post-useragentskillsapply) |
> | Apply a batch of skill toggles + optional tier change | [`POST /UserAgent/SkillsApply`](/docs/agent-overview#post-useragentskillsapply) |
> | Live tier-pricing preview for a hypothetical skill set | [`POST /UserAgent/PricingPreview`](/docs/agent-overview#post-useragentpricingpreview) |
>
> Read responses from `POST /UserAgent/Detail` expose the composed `customskills[]` array (preference skills + non-cron user-created skills), the `scheduledskills[]` array (cron skills), and the `skills[]` array of enabled skill names as top-level fields on the useragent object.

## Skill Registry vs Custom Skills

Two concepts share the word "skill" in the agent system. Keep them straight:

| Concept | What it is | Where it lives | API surface |
|---------|------------|----------------|-------------|
| **Registry skills** | Platform-shipped capabilities — Wiro defines them, they have pricing recipes, credential requirements, and runtime tools. Examples: `int-instagram-post`, `int-gmail-check`, `int-wordpress-post`, `int-wiro-generator`. | The skill registry (git-tracked JSON definitions). | `POST /Skills/List` / `POST /Skills/Detail` (read), `POST /UserAgent/SkillsApply` (toggle on/off per useragent). |
| **Custom skills** | User-editable preference text (`cs-content-tone`) or scheduled tasks (`cs-cron-blog-scanner`) that live ON a useragent. They reference registry skills (e.g. a cron skill calls into `int-wordpress-post`) but are scoped to one instance. | Per useragent on the Wiro platform. | `POST /UserAgent/CustomSkillUpsert` / `POST /UserAgent/CustomSkillRename` / `POST /UserAgent/CustomSkillDelete` / `POST /UserAgent/CustomSkillHistory` / `POST /UserAgent/CustomSkillRevert`. |

The rest of this page documents both — the registry endpoints first (so you can discover what's possible), then the per-useragent endpoints (so you can configure them).

## Skill Registry Endpoints

These four endpoints are **public — no authentication required**. They return data straight from the skill registry.

### **POST** /Skills/List

Lists all skills in the registry.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `category` | string | No | Filter by `"int"` (integration with a third-party service) or `"rule"` (rule-only — no credential, no external API). |
| `capability` | string | No | Filter by capability key (see [`POST /Skills/Capabilities`](#post-skillscapabilities) for the closed-set vocabulary). |
| `user_invocable` | boolean | No | When `true`, only return skills end users can call directly through chat. `wiro-generator` and other internal-only skills are hidden. |
| `requires_credentials` | boolean | No | Filter by whether the skill requires a credential. |
| `wiro_connect_pending` | boolean | No | Filter by the "Wiro mode coming soon" flag (Meta integrations while Wiro's app is under review). |
| `name_in` | array<string> | No | Restrict the response to a specific list of skill names. |

##### Response

```json
{
  "result": true,
  "errors": [],
  "total": 87,
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
      "additional_credential_keys": [],
      "capabilities": ["social_publishing"],
      "depends_on": [],
      "conflicts_with": [],
      "user_invocable": true,
      "deprecated": false,
      "replacement": null,
      "pricing": {
        "monthly_price_weight_usd": 5.5,
        "monthly_credits_weight": 200,
        "credit_costs": {
          "message":    6,
          "create":     58,
          "modify":     29,
          "regenerate": 58
        }
      }
    }
  ]
}
```

Skill names always carry their registry prefix (`int-*` integration, `util-*` utility / rule-only, `cs-cron-*` bundled cron). `pricing.monthly_price_weight_usd` and `pricing.monthly_credits_weight` are the weights the resolver sums across the enabled-skill closure to compute Starter `monthlypriceusd` / `monthlycredits`; Pro multiplies the totals by `tiermultiplier`. `credit_costs` per action contributes via `max()` to the agent's `peractioncosts`.

### **POST** /Skills/Detail

Returns a single skill by name.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes | Canonical skill name **with prefix** (e.g. `"int-instagram-post"`, `"util-html-strip"`, `"cs-cron-content-scanner"`). |

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
    "additional_credential_keys": [],
    "capabilities": ["social_publishing"],
    "depends_on": [],
    "conflicts_with": [],
    "user_invocable": true,
    "deprecated": false,
    "replacement": null,
    "pricing": {
      "monthly_price_weight_usd": 5.5,
      "monthly_credits_weight": 200,
      "credit_costs": {
        "message":    6,
        "create":     58,
        "modify":     29,
        "regenerate": 58
      }
    }
  }
}
```

Returns the **full registry entry** — same shape as a row from `Skills/List`. Returns `{ "result": false, "errors": [{ "code": 404, "message": "Skill not found: <name>" }] }` if the name is unknown.

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
    "credential_mode": "oauth",
    "connection_modes": ["wiro", "own"],
    "wiro_connect_pending": true,
    "credential_schema": [
      { "key": "appid",      "type": "text",     "label": "App ID",            "required": true,  "pattern": "^[0-9]+$", "oauth_managed": true, "only_in_modes": ["own"] },
      { "key": "appsecret",  "type": "password", "label": "App Secret",        "required": true,  "show_toggle": true,   "oauth_managed": true, "only_in_modes": ["own"] },
      { "key": "igusername", "type": "text",     "label": "Connected Account", "required": false, "auto_filled_by_oauth": true, "readonly_when_connected": true }
    ],
    "oauth_provider": {
      "auth_method_value": "wiro",
      "connect_endpoint": "/UserAgentOAuth/IGConnect",
      "disconnect_endpoint": "/UserAgentOAuth/IGDisconnect",
      "status_endpoint": "/UserAgentOAuth/IGStatus",
      "connect_button_label": "Connect with Instagram",
      "connect_button_icon": "/images/icons/skills/instagram.svg",
      "connect_button_brand_color": "#e4405f",
      "connect_button_text_color": "#ffffff",
      "connect_button_logo_filter": "none",
      "username_field": "igusername",
      "return_query_param": "ig_connected",
      "return_error_param": "ig_error",
      "return_error_detail_param": "ig_error_detail",
      "account_picker": null,
      "extra_step": null
    },
    "used_by_skills": ["int-instagram-post"]
  }
}
```

Returns the **full registry credential entry** — same shape as [`POST /Credentials/Detail`](/docs/agent-credentials#post-credentialsdetail). Returns `{ "result": false, "errors": [{ "code": 404, "message": "No credential associated with skill: <name>" }] }` if the skill exists but has `credential_key: null` (rule-only / platform-managed) or if the skill is unknown.

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
    { "name": "file_asset_management",    "description": "Manage asset files from cloud storage (Drive)" }
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

**Response** (top-level `customskills` and `scheduledskills` excerpt):

```json
{
  "customskills": [
    {
      "key": "cs-content-tone",
      "value": "## Brand Voice\nTone: friendly\nTarget Audience: ...\n\n## Content Sources\nPrimary Source: https://your-site.com/feed.xml\n...",
      "description": "Content strategy, brand voice, and posting rules",
      "enabled": true,
      "interval": null,
      "_source": "preset-strategy",
      "_editable": true
    }
  ],
  "scheduledskills": [
    {
      "key": "cs-cron-content-scanner",
      "value": "",
      "description": "Content discovery with rotating strategies",
      "enabled": true,
      "interval": "0 */4 * * *",
      "_source": "skill-bundle",
      "_editable": false
    },
    {
      "key": "cs-cron-weekly-health-check",
      "value": "Every Monday, check the inbox and report to Telegram.",
      "description": "User-created cron",
      "enabled": true,
      "interval": "0 9 * * 1",
      "_source": "user-created",
      "_editable": true,
      "_user_created": true
    }
  ],
  "skills": ["instagram-post", "wiro-generator"]
}
```

> The exact key names depend on the agent template. Always fetch `POST /UserAgent/Detail` to see the real list for your deployed instance — skill keys, default cron schedules, and even the set of skills can evolve as templates are updated.

| Field | Type | Description |
|-------|------|-------------|
| `key` | string | Canonical key. **Always carries the `cs-` runtime prefix.** Strategies are `cs-<slug>`; crons are `cs-cron-<slug>`. The server normalises bare slugs you send to `CustomSkillUpsert` — `"content-tone"` becomes `cs-content-tone`, `"weekly-health-check"` (with `usercreated: true`) becomes `cs-cron-weekly-health-check`. |
| `value` | string | Skill instructions / cron prompt body. Populated only for editable preference skills and user-created entries; bundled crons have it empty. |
| `description` | string | Human-readable description. **Read-only — set by the agent template or by the user at create time, never accepted in `Upsert` payloads for preset skills.** |
| `enabled` | boolean | Whether the cron is active. Writable on cron skills; ignored on preference skills. |
| `interval` | string \| null | Cron expression for scheduled execution, or `null` for preference skills. Writable on cron skills; ignored on preferences. |
| `_source` | string | `preset-strategy` (editable preference), `skill-bundle` (cron owned by an integration skill), or `user-created` (cron added via `CustomSkillUpsert` with `usercreated: true`). |
| `_editable` | boolean | Convenience flag: `true` for preset strategies and user-created rows (you can write `value`), `false` for skill-bundled crons (you can only write `enabled` / `interval`). |
| `_user_created` | boolean | Present (and `true`) only on `_source: "user-created"` rows. Omitted on preset strategies and skill-bundled crons. |

### Understanding `_source`

Agent responses merge three sources into a single set of custom-skill rows:

1. **Preset strategies** (`_source: "preset-strategy"`) — preferences defined by the agent preset (e.g. `cs-content-tone`, `cs-ad-strategy`). You can write `value`.
2. **Bundled crons** (`_source: "skill-bundle"`) — cron tasks shipped inside a specific integration skill. Automatically materialized when the integration is enabled. You can write `interval` and `enabled`, but **not** `value` (the skill owns the cron instruction text).
3. **User-created rows** (`_source: "user-created"`) — entries added via `POST /UserAgent/CustomSkillUpsert` (with `usercreated: true` for crons). You can write all fields.

## Updating Preference Skills

Preference skills (`_source: "preset-strategy"`, `_editable: true`) let you customize the agent's behavior by editing its instructions.

Send one `CustomSkillUpsert` call per skill. Unspecified skills are untouched. **Send only `value`** — `enabled`, `interval`, and `description` are silently dropped on preset strategies (they have no runtime effect since strategies are read on-demand by cron tasks via `cs-<slug>`; they're never scheduled themselves).

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

The top-level `skills[]` array on `UserAgent/Detail` lists the integration skills currently enabled on the instance (e.g. `[{ "name": "int-instagram-post" }, { "name": "int-googleads-manage" }]`). To enable, disable, or change tier in one shot, use **`POST /UserAgent/SkillsApply`** — even when you only want to flip a single skill, send it as a one-entry `skills` map. The endpoint:

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
      "int-telegram-post":  false
    }
  }'
```

`idempotencyKey` is required — use a UUID per "user clicks Save" event. The full response shape and error-code table live on [`SkillsApply`](/docs/agent-overview#post-useragentskillsapply).

> **Custom builds only.** Template-deploy useragents reject `SkillsApply` with `Skill changes are only available for custom-built agents.` — skills are inherited from the marketplace agent template and changing them would diverge the instance. To run a different skill set, deploy a custom build (`POST /UserAgent/Deploy` with `custom: true`) and configure its skills there.

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
      "twitterx-post": true,
      "telegram-post": false
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
    "skills": ["gmail-check", "telegram-post"]
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
| `int-metaads-manage` | `meta-ads` (OAuth) | [Meta Ads Skills](/docs/integration-metaads-skills) |
| `int-facebookpage-post` | `facebook-pages` (OAuth) | [Facebook Page Skills](/docs/integration-facebook-skills) |
| `int-instagram-post` | `instagram` (OAuth) | [Instagram Skills](/docs/integration-instagram-skills) |
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
| `int-gmail-check` | `gmail` (App Password) | [Gmail Skills](/docs/integration-gmail-skills) |
| `int-firebase-push` | `firebase` (Service Account) | [Firebase Skills](/docs/integration-firebase-skills) |
| `int-wordpress-post` | `wordpress` (App Password) | [WordPress Skills](/docs/integration-wordpress-skills) |
| `int-brevo-email` | `brevo` (API key) | [Brevo Skills](/docs/integration-brevo-skills) |
| `int-sendgrid-email` | `sendgrid` (API key) | [SendGrid Skills](/docs/integration-sendgrid-skills) |
| `int-appstore-reviews`, `int-appstore-metadata`, `int-appstore-events` | `apple-appstore` (JWT / Service Account) | [App Store Skills](/docs/integration-appstore-skills) |
| `int-googleplay-reviews`, `int-googleplay-metadata`, `int-googleplay-events` | `google-play` (Service Account) | [Google Play Skills](/docs/integration-googleplay-skills) |
| `int-apollo-sales` | `apollo` (API key) | [Apollo Skills](/docs/integration-apollo-skills) |
| `int-lemlist-outreach` | `lemlist` (API key) | [Lemlist Skills](/docs/integration-lemlist-skills) |
| `int-wiro-generator` | Platform-managed (Wiro internal key) | See [Using Wiro AI Models from Your Agent](#using-wiro-ai-models-from-your-agent) |
| `int-calendarific` | Platform-managed (no user key) | [Platform-Managed Credentials](/docs/agent-credentials#platform-managed-credentials) |

Agents can optionally forward operator notifications to a Telegram bot via the `sys-telegram` credential — see [Telegram Skills](/docs/integration-telegram-skills). This is never required; every agent remains fully usable over web chat and the [Messaging API](/docs/agent-messaging) without a bot configured.

> **Restart behavior:** Calls to `CustomSkillUpsert`, `CustomSkillRename`, `CustomSkillDelete`, `CustomSkillRevert`, and `SkillsApply` on a running agent (status 3 or 4) each trigger an automatic restart so the new skill configuration is picked up. Same as credential updates. Description-only edits to `CustomSkillUpsert` skip the restart.

## Using Wiro AI Models from Your Agent

`wiro-generator` is a platform built-in skill that lets an agent call Wiro's own AI models (image/video/audio/LLM generation, cover image creation, model discovery) using Wiro's internal API. When it's enabled on an agent:

- `credentials.wiro.apiKey` is filled in automatically by Wiro (platform-managed — `fieldstatus: "platform"`). You don't set this key yourself.
- The agent container gets `WIRO_API_KEY` as an env var only when both `wiro-generator` skill is enabled **and** the key is present in the template.
- `wiro-generator` is marked `user_invocable: false` in the registry — it isn't called directly by end-user messages; other skills and scheduled tasks invoke it internally when they need to generate content.

Most Wiro-provided agent templates (Social Manager, Blog Content, Push, App Event, Meta Ads, Google Ads, Newsletter) ship with `wiro-generator: true` and the platform-managed `wiro` credential pre-filled. Templates that don't need AI generation (App Review Support, Lead Generation Manager) ship with `wiro-generator: false`.

To check whether your deployed agent has it:

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Detail" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "guid": "your-useragent-guid" }'
# The top-level skills[] array should contain "wiro-generator"
```

### API user-specific note

`wiro-generator` does **not** mean "your custom skill can call Wiro's Run API with your own API key". It's scoped to the agent template's internal skills and uses Wiro's pre-filled platform key. If you're building on top of Wiro programmatically and want to call the Run / Task / LLM APIs directly from your own backend (not from inside an agent container), use your standard Wiro API key against the public API — see [Run a Model](/docs/run-a-model) and [LLM & Chat Streaming](/docs/llm-chat-streaming).

## Update Rules Summary

| Operation | Endpoint | Allowed on preset strategy (`_source: preset-strategy`) | Allowed on skill-bundled cron (`_source: skill-bundle`) | Allowed on user-created cron (`_source: user-created`) |
|---|---|---|---|---|
| Write `value` | `CustomSkillUpsert` | Yes | **No — silently dropped** | Yes |
| Write `interval` | `CustomSkillUpsert` | **No — silently dropped** | Yes | Yes |
| Write `enabled` | `CustomSkillUpsert` | **No — silently dropped** | Yes | Yes |
| Write `description` | `CustomSkillUpsert` | **No — rejected** (preset descriptions are template-owned) | **No — rejected** | Yes |
| Create | `CustomSkillUpsert` with `usercreated: true` | n/a | n/a | Yes |
| Rename key (+ optional description) | `CustomSkillRename` | **No — preset-forbidden**, renames cascade through admin endpoint | **No — preset-forbidden** | Yes (flavour preserved; `cs-cron-*` ↔ `cs-*` rejected) |
| Delete | `CustomSkillDelete` | No-op | **Rejected with `disable-via-upsert` suggestion** | Yes |
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

Wiro keeps a complete, append-only **agent transaction ledger** for every UserAgent instance. Whenever credits move — the agent runtime burns them on a message, a subscription renews, a Pro user buys an extra-credit pack, an admin tops up, the user disables a paid skill mid-period and gets a refund — a row is inserted into the ledger and surfaced through `POST /UserAgent/TransactionList`.

The ledger is the single source of truth for "where did my credits go?" and powers the **Transactions** view in your dashboard.

| Transaction `type` | Source | When it fires |
|--------------------|--------|---------------|
| `deduct` | Agent runtime | Every successful agent action (`message`, `create`, `modify`, `regenerate`). Negative `amount`. |
| `renewal` | Subscription cron | At each 30-day rollover when the wallet successfully covers the renewal. Positive `amount` = monthly credits granted. |
| `purchase` | Extra-credit checkout | When `POST /UserAgent/CreateExtraCreditCheckout` (`useprepaid: true`) succeeds. Positive `amount` = pack credits. |
| `grant` | Skill toggle / admin top-up | When a skill is enabled mid-period (extra credits added), or an admin uses `AdminRateLimitUpdate` to top up. Positive `amount`. |
| `expired` | Skill toggle | When a skill is disabled mid-period and the credit pool shrinks. Negative `amount` (signed delta). |
| `refund` | Server-side refund | When a Stripe refund webhook arrives for an agent purchase. Positive `amount`. |
| `cancel` | Subscription end policy | When a subscription expires and the policy revokes any monthly leftover. Negative `amount`. |

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
    "monthlycredits": 5000,
    "extracredits": 2000,
    "usedcredits": 1450,
    "remainingcredits": 5550,
    "creditperiod": "2026-05",
    "creditsyncat": 1714694410
  },
  "transactions": [
    {
      "guid": "7f3e8c21-1be1-4f5a-96e8-2b1a9e2a6a01",
      "type": "deduct",
      "action": "message",
      "amount": -10,
      "balanceafter": 5550,
      "description": "Agent action: message",
      "sessionkey": "default",
      "messageguid": "5c41dabf-f2be-4aa8-a5a4-8c9e3d2f3f11",
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
      "balanceafter": 5560,
      "description": "Extra credits — small pack",
      "sessionkey": null,
      "messageguid": null,
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
      "amount": 5000,
      "balanceafter": 3560,
      "description": "Subscription renewal",
      "sessionkey": null,
      "messageguid": null,
      "provider": "prepaid",
      "providerref": null,
      "metadata": { "period": "2026-05", "priceUsd": 29 },
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
      "description": "Skill enabled: instagram-post",
      "sessionkey": null,
      "messageguid": null,
      "provider": "prepaid",
      "providerref": null,
      "metadata": {
        "skill": "instagram-post",
        "enabled": true,
        "previousPriceUsd": 27,
        "newPriceUsd": 32,
        "proratedCharge": 3.33
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

> The `user` object is the resolved actor that triggered the ledger entry — `uuid`, `firstname`, `lastname`, `email`, `username`, `avatar`, `avatarinitials`. It is `null` when `uuid` is `"system"` (cron renewals, subscription expiry, automation) or when the user record has been deleted. The renewal row above was written by an automated renewal cron, so `uuid: "system"` and `user: null`.

**Summary fields** (snapshot of the useragent row):

| Field | Type | Description |
|-------|------|-------------|
| `monthlycredits` | `number` | Current monthly allocation. |
| `extracredits` | `number` | Active extra-credit balance (sum of non-expired packs). |
| `usedcredits` | `number` | Consumed during the current period (reported by the runtime). |
| `remainingcredits` | `number` | `max(0, monthlycredits + extracredits - usedcredits)`. |
| `creditperiod` | `string` | `'YYYY-MM'` billing window. Rolls over on subscription renewal. |
| `creditsyncat` | `number\|null` | Last runtime → API usage sync in Unix seconds. |

**Transaction fields:**

| Field | Type | Description |
|-------|------|-------------|
| `guid` | `string` | Stable id of the ledger row. Daemon retries reuse this guid for idempotency. |
| `type` | `string` | `"deduct"`, `"renewal"`, `"purchase"`, `"grant"`, `"expired"`, `"refund"`, or `"cancel"`. |
| `action` | `string\|null` | Fine-grained detail. Values depend on `type`: `"message"`, `"create"`, `"modify"`, `"regenerate"` (deduct); `"monthly"` (renewal); `"small"`, `"medium"`, `"large"` (purchase); `"skill-toggle"`, `"admin"`, `"upgrade"` (grant); `"skill-toggle"` (expired); `"subscription"` (cancel/refund). |
| `amount` | `number` | Signed credit delta — negative for deductions, positive for grants. |
| `balanceafter` | `number\|null` | Remaining credit balance snapshot written at the time of the event. May be `null` for very old rows or for events written before the snapshot field was added. |
| `description` | `string\|null` | Human-readable label. |
| `sessionkey` | `string\|null` | Session the deduct belongs to (deduct rows only). |
| `messageguid` | `string\|null` | Agent message that triggered the deduct (deduct rows only). |
| `provider` | `string\|null` | `"agent"` (runtime deduct), `"prepaid"` (wallet-backed change), or `"stripe"` (Stripe-backed refund / renewal). |
| `providerref` | `string\|null` | Provider-side reference (Stripe session / invoice / payment-intent id, etc.). |
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

## Agent → API Sync (`TransactionInsert`)

Agent runtimes report deductions through a separate authenticated endpoint, **`POST /UserAgent/TransactionInsert`**. API users **don't normally call this** — it's reserved for the Wiro-managed agent runtime. It is documented here for completeness.

The endpoint is **idempotent on `guid`**: a retry of the same deduction event returns the post-merge balance without double-charging.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Target useragent guid (must match the agent container's settings) |
| `uuid` | string | Yes | Owner uuid (must match the useragent) |
| `type` | string | Yes | Must be `"deduct"` (only deductions can be inserted from the agent side) |
| `action` | string | No | `"message"`, `"create"`, `"modify"`, `"regenerate"` |
| `amount` | number | Yes | Positive cost or pre-signed negative delta |
| `guid` | string | No | Daemon-side stable identifier (recommended for idempotency); server mints one if omitted |
| `sessionkey` | string | No | Session that consumed the credits |
| `messageguid` | string | No | Message that triggered the deduction |
| `description` | string | No | Human-readable label |
| `metadata` | object | No | Arbitrary JSON to record with the row |

##### Response

```json
{
  "result": true,
  "errors": [],
  "guid": "7f3e8c21-1be1-4f5a-96e8-2b1a9e2a6a01",
  "idempotent": false,
  "monthlycredits": 5000,
  "extracredits": 2000,
  "usedcredits": 1460,
  "remainingcredits": 5540
}
```

`idempotent: true` means the event guid was already in the ledger — no double-charge happened, and the response carries the **current** balance for the agent to reconcile against.

## Credit Sync (`CreditSync`)

In addition to per-deduction `TransactionInsert` events, the agent container periodically pushes its **monotonic** total `usedcredits` counter via `POST /UserAgent/CreditSync`. This is also a runtime-only endpoint, but useful to understand the data flow.

Server policy:

- Within the same billing period (`creditperiod` matches), the server stores `GREATEST(existing, incoming)` — out-of-order syncs can never lower the counter.
- If the incoming `creditperiod` doesn't match the DB row (e.g. a renewal already rolled over), the sync is rejected and the response carries the canonical period + counter for the agent to reset its local state.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Target useragent guid |
| `uuid` | string | Yes | Owner uuid |
| `usedcredits` | number | Yes | Total consumed this period (monotonic, >= 0) |
| `creditperiod` | string | Yes | `'YYYY-MM'` tag this counter applies to |

##### Response — happy path

```json
{
  "result": true,
  "errors": [],
  "usedcredits": 1460,
  "creditperiod": "2026-05",
  "remainingcredits": 5540
}
```

##### Response — period mismatch

```json
{
  "result": false,
  "errors": [{ "code": 0, "message": "period mismatch (expected 2026-05, got 2026-04)" }],
  "usedcredits": 1460,
  "creditperiod": "2026-05"
}
```

The agent runtime is expected to restart and retry on the new period.

## Errors

| Error | When |
|-------|------|
| `useragentguid is required` | `TransactionList` / `TransactionInsert` / `CreditSync` without `useragentguid` |
| `useragent-access-denied` | Caller is neither owner, team member, nor admin |
| `Only deduct transactions can be inserted from agents` | `TransactionInsert` with `type` other than `"deduct"` |
| `period mismatch (expected X, got Y)` | `CreditSync` with a stale `creditperiod` after a renewal rollover |
| `Invalid credentials` | `TransactionInsert` / `CreditSync` with a `(useragentguid, uuid)` pair that doesn't match a row |
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
  "ts": 1714694410,
  "kind": "tool",
  "action": "wordpress-publish",
  "skill": "wordpress-post",
  "session": "user-42",
  "userUuid": "ada-uuid",
  "user": {
    "uuid": "ada-uuid",
    "firstname": "Ada",
    "lastname": "Lovelace",
    "email": "ada@example.com",
    "username": "ada",
    "avatar": "https://cdn.wiro.ai/avatars/ada.webp",
    "avatarinitials": "AL"
  },
  "details": {
    "title": "Weekly Roundup",
    "url": "https://blog.example.com/weekly-roundup-12"
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `ts` | `number` | Unix seconds when the event was emitted inside the container. |
| `kind` | `string` | Event class: `"tool"` (a skill tool call), `"turn"` (turn boundary), `"session"` (session start/end), `"message"` (user ↔ agent exchange), `"cron"` (scheduled cron tick), `"deduct"` (a credit deduction), `"system"` (container lifecycle). |
| `action` | `string` | Fine-grained label: e.g. `"wordpress-publish"`, `"telegram-send"`, `"message"`, `"cron-tick"`, `"agent_start"`. |
| `skill` | `string\|null` | The skill that produced the event (`"wordpress-post"`, `"telegram-post"`, `"cs-cron-content-scanner"`, …). `null` for system events. |
| `session` | `string\|null` | Sessionkey the event belongs to (chat events only). |
| `userUuid` | `string\|null` | UUID of the user who triggered the event. `"system"` for cron / internal events. Pre-rollout legacy entries fall back to the useragent owner. |
| `user` | `object\|null` | Resolved actor: `{ uuid, firstname, lastname, email, username, avatar, avatarinitials }`. `null` when `userUuid` is `"system"` (automation / cron) or when the user record was deleted. |
| `details` | `object` | Event-specific payload. Always redacted (no API URLs, no secret-by-name fields, no high-entropy assignment values). |

> **`details` shape varies per `kind`.** Tool calls include the action's input/output summary; cron ticks include the cron expression and skill name; message events include the message GUID and the first ~120 chars of the user prompt. The plugin always strips `apiKey`, `apppassword`, `clientsecret`, `bearer`, `token`, etc. before writing.

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
      "ts": 1714694412,
      "kind": "deduct",
      "action": "create",
      "skill": "wordpress-post",
      "session": null,
      "userUuid": "system",
      "user": null,
      "details": { "cost": 60, "balanceafter": 4940 }
    },
    {
      "ts": 1714694410,
      "kind": "tool",
      "action": "wordpress-publish",
      "skill": "wordpress-post",
      "session": null,
      "userUuid": "system",
      "user": null,
      "details": {
        "title": "Weekly Roundup",
        "url": "https://blog.example.com/weekly-roundup-12",
        "categories": ["AI", "Tutorial"]
      }
    },
    {
      "ts": 1714694200,
      "kind": "cron",
      "action": "cron-tick",
      "skill": "cs-cron-blog-scanner",
      "session": null,
      "userUuid": "system",
      "user": null,
      "details": { "interval": "0 9 * * *", "trigger": "scheduled" }
    },
    {
      "ts": 1714693100,
      "kind": "message",
      "action": "agent_end",
      "skill": null,
      "session": "user-42",
      "userUuid": "ada-uuid",
      "user": {
        "uuid": "ada-uuid",
        "firstname": "Ada",
        "lastname": "Lovelace",
        "email": "ada@example.com",
        "username": "ada",
        "avatar": "https://cdn.wiro.ai/avatars/ada.webp",
        "avatarinitials": "AL"
      },
      "details": {
        "messageguid": "5c41dabf-f2be-4aa8-a5a4-8c9e3d2f3f11",
        "prompt": "Draft a weekly roundup post for the past week.",
        "elapsedTime": "8.1s",
        "wordCount": 412
      }
    }
  ]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `date` | `string\|null` | The actual date the events were read from (`YYYY-MM-DD`). |
| `totalLines` | `number` | Total lines in the file (regardless of `lines` cap). |
| `events` | `array<ActivityEvent>` | Newest events last (ascending by `ts`). The frontend usually reverses for display. |

> **About the `user` field.** Every event is decorated with the resolved actor: `{ uuid, firstname, lastname, email, username, avatar, avatarinitials }`. It is `null` when:
>
> - The event was triggered by **automation** — `userUuid: "system"` for cron ticks, scheduled-skill runs, automated deductions, agent-initiated tool calls, and similar non-interactive writes (the three system / cron rows above).
> - The actor's user record was deleted or the lookup misses for any reason.
>
> When the actor cannot be resolved (deleted account, automation), the server falls back to the useragent owner's UUID so the row never renders an empty placeholder.

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
    { "date": "2026-05-03", "filename": "2026-05-03.jsonl",    "size": 184220, "compressed": false },
    { "date": "2026-05-02", "filename": "2026-05-02.jsonl.gz", "size": 41280,  "compressed": true },
    { "date": "2026-05-01", "filename": "2026-05-01.jsonl.gz", "size": 38912,  "compressed": true }
  ]
}
```

`compressed: true` means the file has been gzipped (happens after 7 days). Reading either form via `LogsFile` returns the same decoded events.

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
      "ts": 1714000000,
      "kind": "system",
      "action": "agent_start",
      "skill": null,
      "session": null,
      "userUuid": "system",
      "user": null,
      "details": {}
    },
    {
      "ts": 1714000020,
      "kind": "session",
      "action": "session_start",
      "skill": null,
      "session": "user-42",
      "userUuid": "ada-uuid",
      "user": {
        "uuid": "ada-uuid",
        "firstname": "Ada",
        "lastname": "Lovelace",
        "email": "ada@example.com",
        "username": "ada",
        "avatar": "https://cdn.wiro.ai/avatars/ada.webp",
        "avatarinitials": "AL"
      },
      "details": {}
    }
  ]
}
```

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

    const fresh = data.events.filter(e => e.ts > lastTs);
    if (fresh.length === 0) return;

    onEvents(fresh);
    lastTs = fresh[fresh.length - 1].ts;
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

cron_runs = [e for e in resp["events"] if e["kind"] == "cron"]
print(f"{len(cron_runs)} cron ticks on 2026-05-02")
for e in cron_runs:
    print(f"  [{e['skill']}] interval={e['details'].get('interval')}")
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

## Two Deployment Patterns

Every product built on Wiro agents follows one of two patterns. Choosing the right one depends on whether your users need to connect their own third-party accounts.

### Pattern 1: Instance Per Customer

Most agents interact with external services — posting to social media, managing ad campaigns, sending emails. These require OAuth tokens or API keys that belong to the end user. Deploy a **separate agent instance** for each of your customers.

**Why:** Each customer connects their own accounts. Credentials are bound to the instance, isolated from other customers.

**How:** Call `POST /UserAgent/Deploy` once per customer, then use the [OAuth flow](/docs/agent-credentials) to connect their accounts.

#### Real-World Examples

| Your Product | Agent Type | Why Per-Customer |
|-------------|-----------|-----------------|
| Digital marketing agency dashboard | Social Manager | Each client connects their own Twitter, Instagram, Facebook, TikTok, LinkedIn |
| Mobile app company | App Review Support | Each app has its own App Store / Google Play credentials |
| E-commerce platform | Google Ads Manager + Meta Ads Manager | Each advertiser connects their own ad accounts |
| Marketing SaaS | Newsletter Manager | Each customer connects their own Brevo/SendGrid/Mailchimp |
| Sales platform | Lead Generation Manager | Each sales team connects their own Apollo/Lemlist |
| Content agency tool | Blog Content Editor | Each client connects their own WordPress site |
| App publisher platform | App Event Manager | Each app has its own App Store credentials |
| Mobile app publisher | Push Notification Manager | Each app has its own Firebase service account |
| Customer engagement tool | Social Manager | Each brand manages their own social presence |

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

- One **Social Manager** instance per customer (Pattern 1) to publish posts with their own OAuth-connected accounts.
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
# Deploy — prepaid + plan are required for API users (credits debit from your wallet)
curl -X POST "https://api.wiro.ai/v1/UserAgent/Deploy" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "agentguid": "agent-template-guid",
    "title": "Customer Support Bot",
    "useprepaid": true,
    "plan": "starter"
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
| **Social Manager** | Create, schedule, and publish social media content | Twitter/X, Instagram, Facebook, TikTok, LinkedIn (OAuth) |
| **Blog Content Editor** | Write and publish blog posts (WordPress draft + publish workflow) | WordPress (App Password), Gmail (optional, for inbox requests) |
| **Google Ads Manager** | Create and optimize Google Ads campaigns, daily performance reports | Google Ads (OAuth), Calendarific (platform-managed), Google Drive (optional, Service Account) |
| **Meta Ads Manager** | Manage Facebook and Instagram ad campaigns, audience analysis | Meta Ads (OAuth), Calendarific (platform-managed), Google Drive (optional, Service Account) |
| **Newsletter Manager** | Design and send email newsletters to subscriber lists | Brevo, SendGrid, Mailchimp, HubSpot (any one — API key or OAuth) |
| **Lead Generation Manager** | Find and enrich leads, run multi-channel outreach, analyze replies | Apollo (API key), Lemlist (API key), HubSpot (optional, for CRM sync) |
| **App Review Support** | Monitor app store reviews, draft responses in operator's tone | App Store Connect (private key JWT), Google Play (service account) |
| **App Event Manager** | Scan global holidays, suggest and create App Store in-app events | App Store Connect (JWT), Calendarific (platform-managed) |
| **Push Notification Manager** | Craft locale- and timezone-aware push notifications, queue dispatch | Firebase (service account JSON per app), Calendarific (platform-managed) |

> The list above matches the 9 agent templates currently deployed in production. The exact set can evolve over time; fetch `POST /Agent/List` for the live catalog.

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
        "plan": "starter"
    }
)
useragent_guid = deploy.json()["useragents"][0]["guid"]

# Connect Twitter via OAuth
connect = requests.post(
    "https://api.wiro.ai/v1/UserAgentOAuth/XConnect",
    headers=headers,
    json={
        "useragentguid": useragent_guid,
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
- Restores previously accepted members to active status
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
