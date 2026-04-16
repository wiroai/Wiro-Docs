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
11. [Files](#files)
12. [Concurrency Limits](#concurrency-limits)
13. [Error Reference](#error-reference)
14. [Code Examples](#code-examples)
15. [Pricing](#pricing)
16. [FAQ](#faq)
17. [MCP Server](#mcp-server)
18. [Self-Hosted MCP](#self-hosted-mcp)
19. [Node.js Library](#nodejs-library)
20. [n8n Wiro Integration](#n8n-wiro-integration)
21. [Agent Overview](#agent-overview)
22. [Agent Messaging](#agent-messaging)
23. [Agent WebSocket](#agent-websocket)
24. [Agent Webhooks](#agent-webhooks)
25. [Agent Credentials & OAuth](#agent-credentials--oauth)
26. [Agent Skills](#agent-skills)
27. [Agent Use Cases](#agent-use-cases)
28. [Organizations & Teams](#organizations--teams)
29. [Managing Teams](#managing-teams)
30. [Team Billing & Spending](#team-billing--spending)
31. [Team API Access](#team-api-access)

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

## What are Wiro Agents?

Wiro Agents are autonomous AI assistants that run persistently in isolated containers. Unlike one-shot model runs, agents maintain conversation memory, connect to external services, and use tools to complete tasks on your behalf — all managed through the API.

The system has two layers:

- **Agent templates** (the catalog) — Pre-built agent definitions published by Wiro. Each template defines the agent's capabilities, required credentials, tools, and pricing. Browse the catalog with `POST /Agent/List`.
- **UserAgent instances** (your deployments) — When you deploy an agent template, Wiro creates a personal instance tied to your account. Each instance runs in its own container with its own credentials, configuration, conversation history, and billing.

Every instance is fully isolated. Your credentials, conversations, and data are never shared with other users.

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

**Public endpoints** — `Agent/List` and `Agent/Detail` are catalog endpoints and do not require authentication. You can browse available agents without an API key.

**Authenticated endpoints** — All `UserAgent/*` endpoints (Deploy, MyAgents, Detail, Update, Start, Stop, CreateExtraCreditCheckout, CancelSubscription, UpgradePlan, RenewSubscription) require a valid API key.

For full details, see [Authentication](#authentication).

## Agent Lifecycle

Deploying and running an agent follows this flow:

1. **Browse** — call `POST /Agent/List` to discover available agents in the catalog
2. **Subscribe** — subscribe to a Starter or Pro plan using your prepaid wallet balance
3. **Deploy** — call `POST /UserAgent/Deploy` with the agent's guid and a title
4. **Configure** — if the agent requires credentials (API keys, OAuth tokens), call `POST /UserAgent/Update` to provide them. See [Agent Credentials](#agent-credentials) for details
5. **Start** — call `POST /UserAgent/Start` to queue the agent for launch
6. **Running** — the agent's container starts and the agent becomes available for conversation
7. **Chat** — send messages via `POST /UserAgent/Message/Send`. See [Agent Messaging](#agent-messaging) for the full messaging API

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
| `6` | Setup Required | Agent needs credentials or configuration before it can start. Call Update to provide them. |

### Automatic Restart (restartafter)

When you update an agent's configuration while it is **starting** (status `3`) or **running** (status `4`), the system automatically triggers a restart cycle: the agent is moved to **Stopping** (status `1`) with `restartafter` set to `true`. Once the container fully stops, the system automatically re-queues it, applying the new configuration on startup.

This means you can update credentials or settings on a running agent without manually stopping and starting it.

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
      "id": 5,
      "guid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "title": "Instagram Manager",
      "slug": "instagram-manager",
      "headline": "Automate your Instagram presence with AI",
      "description": "An autonomous agent that manages your Instagram account...",
      "cover": "https://cdn.wiro.ai/uploads/agents/instagram-manager-cover.webp",
      "categories": ["social-media", "marketing"],
      "samples": ["https://cdn.wiro.ai/uploads/agents/instagram-manager-sample-1.webp"],
      "pricing": {
        "starter": { "price": 9, "credits": 1000 },
        "pro": { "price": 29, "credits": 5000 }
      },
      "skills": ["post_image", "reply_comment", "schedule_post"],
      "status": 1,
      "createdat": "1711929600",
      "updatedat": "1714521600"
    }
  ]
}
```

#### **POST** /Agent/Detail

Retrieves full details for a single agent by guid or slug. This is a **public endpoint** — no authentication required.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `guid` | string | No* | Agent guid |
| `slug` | string | No* | Agent slug (e.g. `"instagram-manager"`) |

> **Note:** You must provide either `guid` or `slug`. If both are provided, `slug` takes priority.

##### Response

```json
{
  "result": true,
  "errors": [],
  "agents": [
    {
      "id": 5,
      "guid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "title": "Instagram Manager",
      "slug": "instagram-manager",
      "headline": "Automate your Instagram presence with AI",
      "description": "An autonomous agent that manages your Instagram account...",
      "cover": "https://cdn.wiro.ai/uploads/agents/instagram-manager-cover.webp",
      "categories": ["social-media", "marketing"],
      "samples": ["https://cdn.wiro.ai/uploads/agents/instagram-manager-sample-1.webp"],
      "pricing": {
        "starter": { "price": 9, "credits": 1000 },
        "pro": { "price": 29, "credits": 5000 }
      },
      "skills": ["post_image", "reply_comment", "schedule_post"],
      "ratelimit": { "actionTypes": { "message": 10, "create": 5 } },
      "configuration": {
        "credentials": {
          "instagram": {
            "_editable": { "authMethod": true },
            "optional": false,
            "authMethod": "",
            "igUsername": "",
            "connectedAt": ""
          }
        }
      },
      "status": 1,
      "createdat": "1711929600",
      "updatedat": "1714521600"
    }
  ]
}
```

### Deploy & Manage

All endpoints below require authentication.

#### **POST** /UserAgent/Deploy

Creates a new agent instance from a catalog template. The agent is created with status `6` (Setup Required). After deploying, call `UserAgent/Detail` to see which credentials are needed, provide them via `UserAgent/Update`, then call `UserAgent/Start` to launch the agent. The subscription cost is deducted from your prepaid wallet immediately.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `agentguid` | string | Yes | The guid of the agent template from the catalog |
| `title` | string | Yes | Display name for your instance |
| `description` | string | No | Optional description |
| `configuration` | object | No | Initial credential values. Format: `{ "credentials": { "key": "value" } }` |
| `useprepaid` | boolean | Yes | Set to `true` to pay from wallet balance. Requires `plan`. |
| `plan` | string | Yes | Plan tier: `"starter"` or `"pro"`. Required when `useprepaid` is `true`. |
| `pinned` | boolean | No | Whether the agent appears in the pinned agents list. Defaults to `true`. Set to `false` when deploying agents programmatically for end users (e.g. bulk provisioning). |

##### Response

```json
{
  "result": true,
  "errors": [],
  "useragents": [
    {
      "id": 47,
      "guid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
      "agentid": 5,
      "title": "My Instagram Bot",
      "description": null,
      "configuration": {
        "credentials": {
          "instagram": {
            "_editable": { "authMethod": true },
            "optional": false,
            "authMethod": "",
            "igUsername": "",
            "connectedAt": ""
          }
        }
      },
      "status": 2,
      "createdat": "1714608000",
      "updatedat": "1714608000",
      "queuedat": "1714608000"
    }
  ]
}
```

##### Prepaid Deploy

When `useprepaid` is `true`, the wallet is charged immediately. The response includes the created agent with status `6`:

```json
// Request
{
  "agentguid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "title": "My Lead Gen Agent",
  "useprepaid": true,
  "plan": "starter",
  "pinned": false
}
// Response
{
  "result": true,
  "errors": [],
  "useragents": [
    {
      "guid": "new-guid-here",
      "title": "My Lead Gen Agent",
      "status": 6,
      "pinned": false,
      "setuprequired": true,
      "subscription": {
        "plan": "agent-starter",
        "status": "active",
        "amount": 49,
        "currency": "usd",
        "provider": "prepaid"
      }
    }
  ]
}
```

> **Tip:** When deploying agents programmatically for your end users (e.g. one instance per customer), set `"pinned": false` to keep your own dashboard clean. Users can pin agents manually later.

#### **POST** /UserAgent/MyAgents

Lists all agent instances deployed under your account.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sort` | string | No | Sort column: `id`, `title`, `status`, `createdat`, `updatedat`, `startedat`, `runningat`, `stopdat`. Default: `id` |
| `order` | string | No | Sort direction: `ASC` or `DESC`. Default: `DESC` |
| `limit` | number | No | Results per page (max 1000). Default: `20` |
| `start` | number | No | Offset for pagination. Default: `0` |
| `category` | string | No | Filter by category |

##### Response

```json
{
  "result": true,
  "errors": [],
  "useragents": [
    {
      "id": 47,
      "guid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
      "agentid": 5,
      "title": "My Instagram Bot",
      "status": 4,
      "setuprequired": false,
      "subscription": {
        "plan": "agent-instagram-manager-pro",
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
        "id": 5,
        "title": "Instagram Manager",
        "slug": "instagram-manager",
        "cover": "https://cdn.wiro.ai/uploads/agents/instagram-manager-cover.webp",
        "categories": ["social-media", "marketing"],
        "pricing": {
          "starter": { "price": 9, "credits": 1000 },
          "pro": { "price": 29, "credits": 5000 }
        }
      },
      "extracredits": 0,
      "extracreditsexpiry": null,
      "createdat": "1714608000",
      "updatedat": "1714694400",
      "startedat": "1714694400",
      "runningat": "1714694410"
    }
  ]
}
```

#### **POST** /UserAgent/Detail

Retrieves full details for a single deployed agent instance, including subscription info.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `guid` | string | Yes | Your UserAgent instance guid |

##### Response

```json
{
  "result": true,
  "errors": [],
  "useragents": [
    {
      "id": 47,
      "guid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
      "agentid": 5,
      "title": "My Instagram Bot",
      "status": 4,
      "setuprequired": false,
      "configuration": {
        "credentials": {
          "instagram": {
            "_editable": { "authMethod": true },
            "optional": false,
            "authMethod": "wiro",
            "igUsername": "myaccount",
            "connectedAt": "2025-04-01T12:00:00.000Z"
          }
        }
      },
      "subscription": {
        "plan": "agent-instagram-manager-pro",
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
        "id": 5,
        "title": "Instagram Manager",
        "slug": "instagram-manager",
        "cover": "https://cdn.wiro.ai/uploads/agents/instagram-manager-cover.webp",
        "pricing": {
          "starter": { "price": 9, "credits": 1000 },
          "pro": { "price": 29, "credits": 5000 }
        }
      },
      "extracredits": 2000,
      "extracreditsexpiry": 1730419200,
      "createdat": "1714608000",
      "updatedat": "1714694400",
      "startedat": "1714694400",
      "runningat": "1714694410"
    }
  ]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `guid` | `string` | Unique identifier for this agent instance. |
| `agentid` | `number` | The catalog agent ID this instance was deployed from. |
| `title` | `string` | Display name you gave this instance. |
| `status` | `number` | Current status code (see UserAgent Statuses). |
| `setuprequired` | `boolean` | `true` if credentials are missing or incomplete. |
| `configuration` | `object` | Credential fields with values (passwords are masked). |
| `subscription` | `object\|null` | Active subscription info, or `null` if no subscription. |
| `agent` | `object` | Parent agent template info (title, slug, cover, pricing). |
| `extracredits` | `number` | Remaining extra credits purchased for this instance. |
| `extracreditsexpiry` | `number\|null` | Unix timestamp when the earliest extra credit pack expires. |
| `subscription.provider` | `string` | Payment provider (`"prepaid"`). |

#### **POST** /UserAgent/Update

Updates an agent instance's configuration, title, or description. If the agent is currently running, this triggers an automatic restart to apply the new settings.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `guid` | string | Yes | Your UserAgent instance guid |
| `title` | string | No | New display name |
| `description` | string | No | New description |
| `categories` | array | No | Updated categories. Cannot be empty if provided. |
| `configuration` | object | No | Updated credentials. Format: `{ "credentials": { "key": "value" } }` |

> **Note:** If the agent's status is `6` (Setup Required) and the update completes all required credentials, the status automatically changes to `0` (Stopped), allowing you to start it.

##### Response

Returns the updated agent instance with setuprequired flag and agent summary. Does not include subscription — use UserAgent/Detail for the full view.

#### **POST** /UserAgent/Start

Starts a stopped agent instance. The agent is moved to Queued (status `2`) and will be picked up by a worker.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `guid` | string | Yes | Your UserAgent instance guid |

##### Response

```json
{
  "result": true,
  "errors": []
}
```

Start will fail with a descriptive error if:
- The agent is already running or queued
- The agent is currently stopping
- Setup is incomplete (status `6`)
- No active subscription exists
- No credits remain (monthly or extra)

#### **POST** /UserAgent/Stop

Stops a running agent instance. If the agent is Queued (status `2`), it is immediately set to Stopped. If it is Starting or Running (status `3`/`4`), it moves to Stopping (status `1`) and the container is shut down gracefully.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `guid` | string | Yes | Your UserAgent instance guid |

##### Response

```json
{
  "result": true,
  "errors": []
}
```

#### **POST** /UserAgent/CreateExtraCreditCheckout

Purchases additional credits for a Pro plan agent. Deducts from your prepaid wallet balance.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentGuid` | string | Yes | Your UserAgent instance guid |
| `pack` | string | Yes | Credit pack: `package1`, `package2`, or `package3` |
| `useprepaid` | boolean | Yes | Set to `true` to pay from wallet balance. No redirect needed. |

##### Response

```json
// Request
{"useragentGuid": "your-guid", "pack": "package2", "useprepaid": true}
// Response
{"result": true, "url": null, "errors": []}
```

When `result` is `true`, the credits are added immediately from your wallet balance. Credits expire 6 months after purchase.

#### **POST** /UserAgent/CancelSubscription

Cancels a subscription at the end of the current billing period. The agent remains active until the period ends.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `guid` | string | Yes | Your UserAgent instance guid |

##### Response

```json
{
  "result": true,
  "cancelsAt": 1717200000,
  "errors": []
}
```

The `cancelsAt` field is the Unix timestamp when the subscription will expire. The agent continues running until this date. You can reverse the cancellation by calling RenewSubscription before the period ends.

#### **POST** /UserAgent/UpgradePlan

Upgrades a Starter subscription to Pro. The prorated cost for the remaining days is deducted from your wallet.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `guid` | string | Yes | Your UserAgent instance guid |
| `plan` | string | Yes | Target plan: `"pro"` (only starter-to-pro upgrade is supported) |

##### Response

```json
{
  "result": true,
  "plan": "agent-pro",
  "proratedCharge": 11.33,
  "newMonthlyCredits": 5000,
  "errors": []
}
```

Downgrades are not supported. To change from Pro to Starter, cancel and re-deploy.

#### **POST** /UserAgent/RenewSubscription

Renews an expired subscription or reverses a pending cancellation. The renewal cost is deducted from your wallet.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `guid` | string | Yes | Your UserAgent instance guid |

##### Response (renewal)

```json
{
  "result": true,
  "action": "renewed",
  "plan": "agent-starter",
  "amount": 49,
  "errors": []
}
```

##### Response (undo cancel)

When called on an active subscription with a pending cancellation:

```json
{
  "result": true,
  "action": "undo-cancel",
  "errors": []
}
```

After renewal, the agent status is reset to `0` (Stopped). Call Start to launch it again. Monthly credits are refreshed for the new billing period.

## Agent Pricing

Agent pricing is subscription-based, billed monthly. Two payment methods are available:

| Feature | Starter | Pro |
|---------|---------|-----|
| Monthly price | Varies by agent (e.g. $9/mo) | Varies by agent (e.g. $29/mo) |
| Monthly credits | Included (e.g. 1,000) | Included (e.g. 5,000) |
| Extra credit packs | Not available | Available (expire in 6 months) |
| Plan upgrade | Upgrade to Pro anytime | — |

Each agent in the catalog defines its own pricing tiers in the `pricing` field. Check the `Agent/Detail` response for exact prices and credit amounts.

### Payment Method

All subscriptions use your **prepaid wallet balance**. The cost is deducted immediately when you deploy or renew. Subscriptions renew automatically if your wallet has sufficient balance; otherwise the subscription expires. Manage subscriptions through the CancelSubscription, UpgradePlan, and RenewSubscription endpoints.

Credits are consumed per message or action, depending on the agent type. When monthly credits run out, the agent cannot be started until credits are renewed (next billing cycle) or extra credits are purchased.

## Error Messages

Agent-specific errors you may encounter:

| Error | When |
|-------|------|
| `Agent not found` | The `agentguid` or `slug` does not match any catalog agent |
| `User agent not found` | The `guid` does not match any of your deployed instances |
| `Agent not found or inactive` | The catalog agent exists but is disabled |
| `Active subscription required to start agent. Please renew your subscription.` | No active subscription for this instance |
| `Agent setup is not complete. Please fill in your credentials before starting.` | Status is `6` — call Update to provide required credentials |
| `Agent is already running` | Start called on an agent with status `3` or `4` |
| `Agent is already queued to start` | Start called on an agent with status `2` |
| `Agent is already stopped` | Stop called on an agent with status `0` |
| `Agent is currently stopping, please wait` | Start called on an agent with status `1` |
| `Agent is in error state, use Start to retry` | Stop called on an agent with status `5` |
| `No credits available. Please renew your subscription or purchase extra credits.` | Monthly and extra credits are both exhausted |
| `Extra credits are available only for Pro plan subscribers. Please upgrade your plan.` | CreateExtraCreditCheckout called on a Starter plan |
| `Invalid pack. Choose package1, package2, or package3.` | CreateExtraCreditCheckout with invalid pack |
| `Active subscription required to purchase extra credits.` | CreateExtraCreditCheckout without subscription |
| `Extra credit pack not available for this agent.` | Agent pricing doesn't define the pack |
| `Categories cannot be empty` | Update with empty categories |
| `Agent not found or access denied` | Message endpoint with invalid useragentguid |
| `Agent is not running. Current status: {n}` | Message/Send when not running |
| `Message not found` | Detail/Cancel with invalid messageguid |
| `Message cannot be cancelled (status: {status})` | Cancel on completed message |
| `Invalid redirect URL` | OAuth Connect with non-HTTPS URL |
| `Subscription is already active` | RenewSubscription called when subscription is already active without pending cancel |
| `No expired subscription found to renew` | RenewSubscription called with no expired subscription |
| `Insufficient wallet balance. Required: $X, Available: $Y` | Prepaid operation with insufficient funds |
| `Cannot downgrade from Pro to Starter. Cancel your subscription instead.` | UpgradePlan with downgrade attempt |
| `Subscription cancellation scheduled` | CancelSubscription success |
| `Valid plan required when using prepaid (starter or pro)` | Deploy with useprepaid but missing/invalid plan |
| `Pricing not available for this plan` | Deploy with useprepaid for agent without pricing |
| `Renewal pricing not available` | RenewSubscription for agent with zero pricing |

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
    "plan": "starter"
  }'

# Deploy for an end user (unpinned, won't clutter your dashboard)
curl -X POST "https://api.wiro.ai/v1/UserAgent/Deploy" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "agentguid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "title": "Customer #1234 Bot",
    "useprepaid": true,
    "plan": "starter",
    "pinned": false
  }'

# Cancel a subscription (cancels at end of billing period)
curl -X POST "https://api.wiro.ai/v1/UserAgent/CancelSubscription" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{"guid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321"}'

# Upgrade starter to pro
curl -X POST "https://api.wiro.ai/v1/UserAgent/UpgradePlan" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{"guid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321", "plan": "pro"}'

# Renew expired subscription
curl -X POST "https://api.wiro.ai/v1/UserAgent/RenewSubscription" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{"guid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321"}'

# Buy extra credits with prepaid wallet
curl -X POST "https://api.wiro.ai/v1/UserAgent/CreateExtraCreditCheckout" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{"useragentGuid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321", "pack": "package1", "useprepaid": true}'

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
curl -X POST "https://api.wiro.ai/v1/UserAgent/Update" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "guid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
    "configuration": {
      "credentials": {
        "instagram": { "authMethod": "wiro" }
      }
    }
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
    print(f"{agent['title']} ({agent['slug']})")

# Get agent details by slug
detail = requests.post(
    "https://api.wiro.ai/v1/Agent/Detail",
    json={"slug": "instagram-manager"}
).json()
agent = detail["agents"][0]
print(f"Credentials needed: {list(agent['configuration']['credentials'].keys())}")

# Deploy a new instance
deploy = requests.post(
    "https://api.wiro.ai/v1/UserAgent/Deploy",
    headers=headers,
    json={
        "agentguid": agent["guid"],
        "title": "My Instagram Bot",
        "useprepaid": True,
        "plan": "starter"
    }
).json()
instance_guid = deploy["useragents"][0]["guid"]
print(f"Deployed: {instance_guid}")

# Update credentials
requests.post(
    "https://api.wiro.ai/v1/UserAgent/Update",
    headers=headers,
    json={
        "guid": instance_guid,
        "configuration": {
            "credentials": {
                "instagram": { "authMethod": "wiro" }
            }
        }
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

# List your deployed agents
my_agents = requests.post(
    "https://api.wiro.ai/v1/UserAgent/MyAgents",
    headers=headers,
    json={"limit": 50}
).json()
for ua in my_agents["useragents"]:
    print(f"{ua['title']} - status: {ua['status']}")

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
  catalog.data.agents.forEach(a => console.log(`${a.title} (${a.slug})`));

  // Get agent details by slug
  const detail = await axios.post(
    'https://api.wiro.ai/v1/Agent/Detail',
    { slug: 'instagram-manager' }
  );
  const agent = detail.data.agents[0];

  // Deploy a new instance
  const deploy = await axios.post(
    'https://api.wiro.ai/v1/UserAgent/Deploy',
    { agentguid: agent.guid, title: 'My Instagram Bot', useprepaid: true, plan: 'starter' },
    { headers }
  );
  const instanceGuid = deploy.data.useragents[0].guid;
  console.log('Deployed:', instanceGuid);

  // Update credentials
  await axios.post(
    'https://api.wiro.ai/v1/UserAgent/Update',
    {
      guid: instanceGuid,
      configuration: {
        credentials: {
          instagram: { authMethod: 'wiro' }
        }
      }
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

// Deploy a new instance
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
    "plan" => "starter"
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

// Deploy a new instance
var deployContent = new StringContent(
    JsonSerializer.Serialize(new {
        agentguid = "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        title = "My Instagram Bot",
        useprepaid = true,
        plan = "starter"
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
    // Deploy a new instance
    body, _ := json.Marshal(map[string]interface{}{
        "agentguid":  "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "title":      "My Instagram Bot",
        "useprepaid": true,
        "plan":       "starter",
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
        "plan": "starter"
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
    "plan": "starter"
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
    'plan': 'starter',
  }),
);
print(response.body);
```

## What's Next

- [Agent Messaging](#agent-messaging) — Send messages and receive responses from running agents
- [Agent Credentials](#agent-credentials) — Configure OAuth and API key credentials for your agent
- [Authentication](#authentication) — API key setup and authentication methods
- [Pricing](#pricing) — General pricing information

---

# Agent Messaging

Send messages to AI agents and receive streaming responses in real time.

## How It Works

Agent messaging follows the same async pattern as [model runs](#run-a-model):

1. **Send** a message via REST → get an `agenttoken` immediately
2. **Subscribe** to [WebSocket](#agent-websocket) with the `agenttoken` → receive streaming response chunks
3. **Or poll** via the Detail endpoint to check status and fetch the completed response
4. **Or set** a `callbackurl` to receive a webhook notification when the agent finishes

This decoupled design means your application never blocks waiting for the agent to think. Send the message, hand the `agenttoken` to your frontend, and stream the response as it arrives.

## Message Lifecycle

Every agent message progresses through a defined set of stages:

`agent_queue` → `agent_start` → `agent_output` → `agent_end`

### Message Statuses

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
    "uuid": "user-uuid-here",
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
| `uuid` | `string` | The account UUID of the user who sent the message. |
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
    "count": 1,
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
  "debugoutput": "Here are the key AI trends for 2026...",
  "metadata": { "type": "progressGenerate", "raw": "...", "thinking": [], "answer": ["..."] },
  "endedat": 1743350408
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

---

# Agent WebSocket

Receive real-time agent response streaming via a persistent WebSocket connection.

## Connection URL

```
wss://socket.wiro.ai/v1
```

Connect to this URL after calling the [Message / Send](#agent-messaging) endpoint. Use the `agenttoken` from the send response to subscribe to the agent session. This is the same WebSocket server used for model tasks — you can subscribe to both task events and agent events on the same connection.

## Connection Flow

1. **Connect** — open a WebSocket connection to `wss://socket.wiro.ai/v1`
2. **Subscribe** — send an `agent_info` message with your `agenttoken`
3. **Receive** — listen for `agent_output` events as the agent streams its response
4. **Complete** — the `agent_end` event fires when the response is finished
5. **Close** — disconnect after processing the final response

Subscribe message format:

```json
{
  "type": "agent_info",
  "agenttoken": "aB3xK9mR2pLqWzVn7tYhCd5sFgJkNb"
}
```

## Event Types

| Event Type | Description |
|---|---|
| `agent_subscribed` | Subscription confirmed. The server acknowledges your `agenttoken` and returns the current status. If the agent already started before you subscribed, accumulated text is included. |
| `agent_start` | The agent has started processing your message. The underlying model is now generating a response. |
| `agent_output` | A streaming response chunk. Emitted **multiple times** — each chunk contains the full accumulated text so far, plus real-time performance metrics. |
| `agent_end` | Response complete. Contains the final accumulated text with total metrics. This is the event to listen for. |
| `agent_error` | An error occurred during processing. The `message` field may be a plain string or a structured progress object depending on the error type. |
| `agent_cancel` | The message was cancelled by the user before the agent finished responding. |

## Message Format

Every WebSocket message is a JSON object with this base structure:

```json
{
  "type": "agent_output",
  "agenttoken": "aB3xK9mR2pLqWzVn7tYhCd5sFgJkNb",
  "message": { ... },
  "result": true
}
```

The `type` field indicates the event. The `message` field varies by type — it's an empty string for lifecycle events, a structured progress object for output events, and a string or object for errors.

### agent_subscribed

Sent immediately after the server accepts your subscription. The `status` field reflects where the agent currently is in its lifecycle. If the agent already began streaming before you connected, `debugoutput` contains any accumulated text.

```json
{
  "type": "agent_subscribed",
  "agenttoken": "aB3xK9mR2pLqWzVn7tYhCd5sFgJkNb",
  "status": "agent_queue",
  "debugoutput": "",
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

An error occurred during processing. The `message` field can take two forms:

**String error** — a human-readable error description:

```json
{
  "type": "agent_error",
  "agenttoken": "aB3xK9mR2pLqWzVn7tYhCd5sFgJkNb",
  "message": "Bridge timeout",
  "result": false
}
```

Common string errors include `"Bridge timeout"`, `"OpenClaw returned HTTP 500"`, and `"Model not available"`.

**Structured error** — a progress object where the response itself indicates failure:

```json
{
  "type": "agent_error",
  "agenttoken": "aB3xK9mR2pLqWzVn7tYhCd5sFgJkNb",
  "message": {
    "type": "progressGenerate",
    "task": "Generate",
    "speed": "0",
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

### agent_cancel

Sent when the user cancels a message before the agent completes its response:

```json
{
  "type": "agent_cancel",
  "agenttoken": "aB3xK9mR2pLqWzVn7tYhCd5sFgJkNb",
  "message": "The operation was aborted.",
  "result": false
}
```

## The `result` Field

Every event includes a `result` boolean:

| Value | Events |
|---|---|
| `true` | `agent_subscribed`, `agent_start`, `agent_output`, `agent_end` |
| `false` | `agent_error`, `agent_cancel` |

Use `result` to quickly determine whether the event represents a successful state. When `result` is `false`, inspect `message` for error details or cancellation context.

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
→  agent_subscribed  { status: "agent_queue" }
→  agent_start       { message: "" }
→  agent_output      { message: { raw: "Quantum", wordCount: 1 } }
→  agent_output      { message: { raw: "Quantum computing uses", wordCount: 3 } }
→  agent_output      { message: { raw: "Quantum computing uses qubits...", wordCount: 28 } }
→  agent_end         { message: { raw: "Quantum computing uses qubits that...", wordCount: 118 } }
```

Each `agent_output` contains the full accumulated text. Replace (don't append) your display content on each event.

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
  console.log('Event:', msg.type);

  if (msg.type === 'agent_output') {
    console.log('Streaming:', msg.message?.raw);
  }
  if (msg.type === 'agent_end') {
    console.log('Final:', msg.message?.raw);
    ws.close();
  }
  if (msg.type === 'agent_error') {
    console.error('Error:', msg.message);
    ws.close();
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

### C#

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

```json
// Subscribe
{"type": "agent_info", "agenttoken": "aB3xK9..."}

// agent_subscribed
{"type": "agent_subscribed", "agenttoken": "aB3xK9...", "status": "agent_queue", "result": true}

// agent_start
{"type": "agent_start", "agenttoken": "aB3xK9...", "message": "", "result": true}

// agent_output (streaming — emitted multiple times)
{"type": "agent_output", "agenttoken": "aB3xK9...", "message": {"raw": "Accumulated text...", "speed": "12.5", "wordCount": 28}, "result": true}

// agent_end (final response)
{"type": "agent_end", "agenttoken": "aB3xK9...", "message": {"raw": "Complete response...", "speed": "14.2", "wordCount": 118}, "result": true}

// agent_error
{"type": "agent_error", "agenttoken": "aB3xK9...", "message": "Bridge timeout", "result": false}

// agent_cancel
{"type": "agent_cancel", "agenttoken": "aB3xK9...", "message": "The operation was aborted.", "result": false}
```

---

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

The `agenttoken` can be used to track the message via [WebSocket](#agent-websocket) for real-time streaming, while the webhook delivers the final result to your server.

---

# Agent Credentials & OAuth

Configure third-party service connections for your agent instances.

## Overview

Agents connect to external services — social media platforms, ad networks, email tools, CRMs — via two methods:

1. **API Key credentials** — set directly via `POST /UserAgent/Update`
2. **OAuth credentials** — redirect-based authorization flow via `POST /UserAgentOAuth/{Provider}Connect`

API keys are simple key-value pairs you provide. OAuth requires a browser redirect where the end user authorizes access on the provider's site, and Wiro handles the token exchange server-side.

## Setting API Key Credentials

Use `POST /UserAgent/Update` with `configuration.credentials` to set API keys for services that don't require OAuth. Each credential group is a key in the `credentials` object — you only need to set the ones your agent requires.

### Request Format

```json
POST /UserAgent/Update
{
  "guid": "your-useragent-guid",
  "configuration": {
    "credentials": {
      "<service>": {
        "<field>": "value"
      }
    }
  }
}
```

> **Important:** You can only update fields marked as `_editable: true` in the configuration. Attempting to set a non-editable field will be silently ignored. Use `POST /UserAgent/Detail` to see which fields are editable.

### Credential Configuration by Agent

Each agent requires different credentials. Find your agent below to see exactly which credentials to configure and the complete `POST /UserAgent/Update` request.

#### Social Manager

Manages social media accounts — posts, replies, scheduling across Twitter/X, Instagram, Facebook, LinkedIn, TikTok. OAuth providers are connected separately via the [OAuth flow](#oauth-authorization-flow).

| Service | Type | Fields |
|---------|------|--------|
| `twitter` | OAuth | Connected via `XConnect`. Set `authMethod` to `"wiro"` or `"own"`. |
| `instagram` | OAuth | Connected via `IGConnect`. |
| `facebook` | OAuth | Connected via `FBConnect`. |
| `linkedin` | OAuth | Connected via `LIConnect`. Also set `organizationId`. |
| `tiktok` | OAuth | Connected via `TikTokConnect`. |
| `gmail` | API Key | `account`, `appPassword` |
| `telegram` | API Key | `botToken`, `allowedUsers`, `sessionMode` |

```json
POST /UserAgent/Update
{
  "guid": "your-useragent-guid",
  "configuration": {
    "credentials": {
      "gmail": {
        "account": "agent@company.com",
        "appPassword": "xxxx xxxx xxxx xxxx"
      },
      "telegram": {
        "botToken": "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11",
        "allowedUsers": ["761381461"],
        "sessionMode": [
          { "value": "private", "text": "Private — each user has their own conversation", "selected": true },
          { "value": "collaborative", "text": "Collaborative — all users share the same conversation", "selected": false }
        ]
      }
    }
  }
}
```

> **Note:** Social media accounts (Twitter, Instagram, etc.) are connected via the [OAuth flow](#oauth-authorization-flow), not via Update. Use Update only for `gmail` and `telegram` credentials.

#### Blog Content Editor

Publishes blog posts to WordPress, monitors a Gmail inbox for content requests.

| Service | Fields | Description |
|---------|--------|-------------|
| `wordpress` | `url`, `user`, `appPassword` | WordPress site URL, username, and application password |
| `gmail` | `account`, `appPassword` | Gmail address + Google App Password for inbox monitoring |
| `telegram` | `botToken`, `allowedUsers`, `sessionMode` | Telegram bot for operator notifications |

```json
POST /UserAgent/Update
{
  "guid": "your-useragent-guid",
  "configuration": {
    "credentials": {
      "wordpress": {
        "url": "https://blog.example.com",
        "user": "WiroBlogAgent",
        "appPassword": "xxxx xxxx xxxx xxxx"
      },
      "gmail": {
        "account": "agent@company.com",
        "appPassword": "xxxx xxxx xxxx xxxx"
      },
      "telegram": {
        "botToken": "123456:ABC-DEF1234ghIkl",
        "allowedUsers": ["761381461"],
        "sessionMode": [
          { "value": "private", "text": "Private — each user has their own conversation", "selected": true },
          { "value": "collaborative", "text": "Collaborative — all users share the same conversation", "selected": false }
        ]
      }
    }
  }
}
```

#### App Review Support

Monitors and replies to App Store and Google Play reviews.

| Service | Fields | Description |
|---------|--------|-------------|
| `appstore` | `keyId`, `issuerId`, `privateKeyBase64`, `appIds`, `supportEmail` | App Store Connect API credentials |
| `googleplay` | `serviceAccountJsonBase64`, `packageNames`, `supportEmail` | Google Play service account |
| `telegram` | `botToken`, `allowedUsers`, `sessionMode` | Telegram bot for operator notifications |

```json
POST /UserAgent/Update
{
  "guid": "your-useragent-guid",
  "configuration": {
    "credentials": {
      "appstore": {
        "keyId": "ABC1234DEF",
        "issuerId": "12345678-1234-1234-1234-123456789012",
        "privateKeyBase64": "LS0tLS1CRUdJTi...",
        "appIds": ["6479306352"],
        "supportEmail": "support@company.com"
      },
      "googleplay": {
        "serviceAccountJsonBase64": "eyJ0eXBlIjoic2VydmljZV9hY2NvdW50Ii...",
        "packageNames": ["com.example.app"],
        "supportEmail": "support@company.com"
      },
      "telegram": {
        "botToken": "123456:ABC-DEF1234ghIkl",
        "allowedUsers": ["761381461"],
        "sessionMode": [
          { "value": "private", "text": "Private — each user has their own conversation", "selected": true },
          { "value": "collaborative", "text": "Collaborative — all users share the same conversation", "selected": false }
        ]
      }
    }
  }
}
```

#### App Event Manager

Suggests and creates App Store in-app events based on holidays and trends.

| Service | Fields | Description |
|---------|--------|-------------|
| `appstore` | `keyId`, `issuerId`, `privateKeyBase64`, `appIds` | App Store Connect API credentials |
| `telegram` | `botToken`, `allowedUsers`, `sessionMode` | Telegram bot for operator notifications |

```json
POST /UserAgent/Update
{
  "guid": "your-useragent-guid",
  "configuration": {
    "credentials": {
      "appstore": {
        "keyId": "ABC1234DEF",
        "issuerId": "12345678-1234-1234-1234-123456789012",
        "privateKeyBase64": "LS0tLS1CRUdJTi...",
        "appIds": ["6479306352"]
      },
      "telegram": {
        "botToken": "123456:ABC-DEF1234ghIkl",
        "allowedUsers": ["761381461"],
        "sessionMode": [
          { "value": "private", "text": "Private — each user has their own conversation", "selected": true },
          { "value": "collaborative", "text": "Collaborative — all users share the same conversation", "selected": false }
        ]
      }
    }
  }
}
```

#### Push Notification Manager

Sends targeted push notifications via Firebase Cloud Messaging.

| Service | Fields | Description |
|---------|--------|-------------|
| `firebase` | `accounts[]` | Array of Firebase projects. Each: `appName`, `serviceAccountJsonBase64`, `apps` (platform + id), `topics` (key→description object) |
| `telegram` | `botToken`, `allowedUsers`, `sessionMode` | Telegram bot for operator notifications |

```json
POST /UserAgent/Update
{
  "guid": "your-useragent-guid",
  "configuration": {
    "credentials": {
      "firebase": {
        "accounts": [{
          "appName": "My App",
          "serviceAccountJsonBase64": "eyJ0eXBlIjoic2VydmljZV9hY2NvdW50Ii...",
          "apps": [
            { "platform": "ios", "id": "6479306352" },
            { "platform": "android", "id": "com.example.app" }
          ],
          "topics": { "locale_en": "English users", "tier_paid": "Paid subscribers" }
        }]
      },
      "telegram": {
        "botToken": "123456:ABC-DEF1234ghIkl",
        "allowedUsers": ["761381461"],
        "sessionMode": [
          { "value": "private", "text": "Private — each user has their own conversation", "selected": true },
          { "value": "collaborative", "text": "Collaborative — all users share the same conversation", "selected": false }
        ]
      }
    }
  }
}
```

#### Newsletter Manager

Creates and sends newsletters via Brevo, SendGrid, HubSpot, or Mailchimp.

| Service | Type | Fields |
|---------|------|--------|
| `brevo` | API Key | `apiKey` |
| `sendgrid` | API Key | `apiKey` |
| `hubspot` | OAuth | Connected via `HubSpotConnect` |
| `mailchimp` | OAuth/Key | OAuth via `MailchimpConnect` or set `apiKey` directly |
| `newsletter` | Config | `testEmail` |
| `telegram` | API Key | `botToken`, `allowedUsers`, `sessionMode` |

```json
POST /UserAgent/Update
{
  "guid": "your-useragent-guid",
  "configuration": {
    "credentials": {
      "brevo": { "apiKey": "xkeysib-abc123..." },
      "sendgrid": { "apiKey": "SG.xxxx..." },
      "newsletter": { "testEmail": "test@company.com" },
      "telegram": {
        "botToken": "123456:ABC-DEF1234ghIkl",
        "allowedUsers": ["761381461"],
        "sessionMode": [
          { "value": "private", "text": "Private — each user has their own conversation", "selected": true },
          { "value": "collaborative", "text": "Collaborative — all users share the same conversation", "selected": false }
        ]
      }
    }
  }
}
```

> **Note:** HubSpot and Mailchimp are connected via [OAuth](#oauth-authorization-flow). Mailchimp also accepts a direct `apiKey` without OAuth.

#### Lead Gen Manager

Finds leads and manages outreach campaigns via Apollo.io, Lemlist, and HubSpot.

| Service | Type | Fields |
|---------|------|--------|
| `apollo` | API Key | `apiKey`, `masterApiKey` (optional, for sequences) |
| `lemlist` | API Key | `apiKey` |
| `hubspot` | OAuth | Connected via `HubSpotConnect` |
| `telegram` | API Key | `botToken`, `allowedUsers`, `sessionMode` |

```json
POST /UserAgent/Update
{
  "guid": "your-useragent-guid",
  "configuration": {
    "credentials": {
      "apollo": {
        "apiKey": "your-apollo-api-key",
        "masterApiKey": "your-master-key"
      },
      "lemlist": { "apiKey": "your-lemlist-key" },
      "telegram": {
        "botToken": "123456:ABC-DEF1234ghIkl",
        "allowedUsers": ["761381461"],
        "sessionMode": [
          { "value": "private", "text": "Private — each user has their own conversation", "selected": true },
          { "value": "collaborative", "text": "Collaborative — all users share the same conversation", "selected": false }
        ]
      }
    }
  }
}
```

#### Google Ads Manager

Manages Google Ads campaigns, keywords, and ad copy.

| Service | Type | Fields |
|---------|------|--------|
| `googleads` | OAuth | Connected via `GAdsConnect`. Then set `customerId` via `GAdsSetCustomerId`. |
| `website` | Config | `urls` — array of `{ websiteName, url }` |
| `appstore` | Config | `apps` — array of `{ appName, appId }` |
| `googleplay` | Config | `apps` — array of `{ appName, packageName }` |
| `telegram` | API Key | `botToken`, `allowedUsers`, `sessionMode` |

```json
POST /UserAgent/Update
{
  "guid": "your-useragent-guid",
  "configuration": {
    "credentials": {
      "website": {
        "urls": [{ "websiteName": "Main Site", "url": "https://example.com" }]
      },
      "appstore": {
        "apps": [{ "appName": "My iOS App", "appId": "6479306352" }]
      },
      "googleplay": {
        "apps": [{ "appName": "My Android App", "packageName": "com.example.app" }]
      },
      "telegram": {
        "botToken": "123456:ABC-DEF1234ghIkl",
        "allowedUsers": ["761381461"],
        "sessionMode": [
          { "value": "private", "text": "Private — each user has their own conversation", "selected": true },
          { "value": "collaborative", "text": "Collaborative — all users share the same conversation", "selected": false }
        ]
      }
    }
  }
}
```

> **Note:** Google Ads is connected via [OAuth](#oauth-authorization-flow). After connecting, set the customer ID via `POST /UserAgentOAuth/GAdsSetCustomerId`.

#### Meta Ads Manager

Manages Meta (Facebook/Instagram) ad campaigns and creatives.

| Service | Type | Fields |
|---------|------|--------|
| `metaads` | OAuth | Connected via `MetaAdsConnect`. Then set ad account via `MetaAdsSetAdAccount`. |
| `website` | Config | `urls` — array of `{ websiteName, url }` |
| `appstore` | Config | `apps` — array of `{ appName, appId }` |
| `googleplay` | Config | `apps` — array of `{ appName, packageName }` |
| `telegram` | API Key | `botToken`, `allowedUsers`, `sessionMode` |

```json
POST /UserAgent/Update
{
  "guid": "your-useragent-guid",
  "configuration": {
    "credentials": {
      "website": {
        "urls": [{ "websiteName": "Landing Page", "url": "https://example.com" }]
      },
      "appstore": {
        "apps": [{ "appName": "My iOS App", "appId": "6479306352" }]
      },
      "googleplay": {
        "apps": [{ "appName": "My Android App", "packageName": "com.example.app" }]
      },
      "telegram": {
        "botToken": "123456:ABC-DEF1234ghIkl",
        "allowedUsers": ["761381461"],
        "sessionMode": [
          { "value": "private", "text": "Private — each user has their own conversation", "selected": true },
          { "value": "collaborative", "text": "Collaborative — all users share the same conversation", "selected": false }
        ]
      }
    }
  }
}
```

> **Note:** Meta Ads is connected via [OAuth](#oauth-authorization-flow). After connecting, set the ad account via `POST /UserAgentOAuth/MetaAdsSetAdAccount`.

### Credential Field Reference

Quick reference for all credential field names across services:

| Service Key | Editable Fields |
|-------------|-----------------|
| `telegram` | `botToken`, `allowedUsers`, `sessionMode` |
| `wordpress` | `url`, `user`, `appPassword` |
| `gmail` | `account`, `appPassword` |
| `brevo` | `apiKey` |
| `sendgrid` | `apiKey` |
| `apollo` | `apiKey`, `masterApiKey` |
| `lemlist` | `apiKey` |
| `newsletter` | `testEmail` |
| `appstore` | `keyId`, `issuerId`, `privateKeyBase64`, `appIds` — or `apps` array for ads agents |
| `googleplay` | `serviceAccountJsonBase64`, `packageNames` — or `apps` array for ads agents |
| `firebase` | `accounts[]`: `appName`, `serviceAccountJsonBase64`, `apps`, `topics` |
| `website` | `urls` array of `{ websiteName, url }` |
| `twitter` | OAuth — `authMethod` (own: + `clientId`, `clientSecret`) |
| `instagram` | OAuth — `authMethod` (own: + `appId`, `appSecret`) |
| `facebook` | OAuth — `authMethod` (own: + `appId`, `appSecret`) |
| `linkedin` | OAuth — `authMethod`, `organizationId` (own: + `clientId`, `clientSecret`) |
| `tiktok` | OAuth — `authMethod` (own: + `clientKey`, `clientSecret`) |
| `googleads` | OAuth — `authMethod` (own: + `clientId`, `clientSecret`, `developerToken`, `managerCustomerId`) |
| `metaads` | OAuth — `authMethod` (own: + `appId`, `appSecret`) |
| `hubspot` | OAuth — `authMethod` (own: + `clientId`, `clientSecret`) |
| `mailchimp` | OAuth — `authMethod`, `apiKey` (own: + `clientId`, `clientSecret`) |

### Setup Required State

If an agent has required (non-optional) credentials that haven't been filled in, the agent is in **Setup Required** state (status `6`) and cannot be started. After setting all required credentials via Update, the status automatically changes to `0` (Stopped) and you can call Start.

Check the `setuprequired` boolean in `UserAgent/Detail` or `UserAgent/MyAgents` responses to determine if credentials still need to be configured.

## OAuth Authorization Flow

For services that require user authorization (social media accounts, ad platforms, CRMs), Wiro implements a full OAuth flow. The entire process is **fully white-label** — your end-users interact only with your app and the provider's consent screen. They never see or visit wiro.ai at any point.

> **Key point:** The `redirectUrl` you pass to the Connect endpoint is **your own URL**. After authorization, users are redirected back to your app — not to Wiro. Any HTTPS URL is accepted. Use `http://localhost` or `http://127.0.0.1` for development.

### Supported OAuth Providers

| Provider | Connect Endpoint | Redirect Success Params | Redirect Error Params |
|----------|-----------------|------------------------|----------------------|
| Twitter/X | `XConnect` | `x_connected=true&x_username=...` | `x_error=...` |
| TikTok | `TikTokConnect` | `tiktok_connected=true&tiktok_username=...` | `tiktok_error=...` |
| Instagram | `IGConnect` | `ig_connected=true&ig_username=...` | `ig_error=...` |
| Facebook | `FBConnect` | `fb_connected=true&fb_pagename=...` | `fb_error=...` |
| LinkedIn | `LIConnect` | `li_connected=true&li_name=...` | `li_error=...` |
| Google Ads | `GAdsConnect` | `gads_connected=true&gads_accounts=[...]` | `gads_error=...` |
| Meta Ads | `MetaAdsConnect` | `metaads_connected=true&metaads_accounts=[...]` | `metaads_error=...` |
| HubSpot | `HubSpotConnect` | `hubspot_connected=true&hubspot_portal=...&hubspot_name=...` | `hubspot_error=...` |
| Mailchimp | `MailchimpConnect` | `mailchimp_connected=true&mailchimp_account=...` | `mailchimp_error=...` |

### Flow Diagram

```
Your App (Frontend)           Your Backend              Wiro API              Provider (e.g. Twitter)
       |                            |                       |                        |
  (1)  | "Connect Twitter" click    |                       |                        |
       |--------------------------->|                       |                        |
       |                            |  POST /XConnect       |                        |
  (2)  |                            |--> { userAgentGuid,   |                        |
       |                            |      redirectUrl,     |                        |
       |                            |      authMethod }     |                        |
       |                            |                       |                        |
  (3)  |                            |<-- { authorizeUrl }   |                        |
       |                            |                       |                        |
  (4)  |<--- redirect to authorizeUrl                       |                        |
       |--------------------------------------------------------> User sees Twitter  |
       |                            |                       |    consent screen      |
  (5)  |                            |                       |<-- User clicks Allow   |
       |                            |                       |                        |
  (6)  |                            |   (invisible callback)|                        |
       |                            |   Wiro exchanges code |<-----------------------|
       |                            |   for tokens, saves   |                        |
       |                            |   them to agent config|                        |
       |                            |                       |                        |
  (7)  |<------- 302 redirect to YOUR redirectUrl ----------------------------------|
       | https://your-app.com/settings?x_connected=true&x_username=johndoe          |
       |                            |                       |                        |
```

### What the User Sees

| Step | User Sees | URL |
|------|-----------|-----|
| 1 | Your app — "Connect Twitter" button | `https://your-app.com/settings` |
| 2–3 | (Backend API call — invisible to user) | — |
| 4–5 | Provider's consent screen (Twitter, TikTok, etc.) | `https://x.com/i/oauth2/authorize?...` |
| 6 | (Wiro's server-side callback — invisible 302 redirect) | — |
| 7 | Your app — "Connected!" confirmation | `https://your-app.com/settings?x_connected=true` |

**Your users never visit wiro.ai.** The only pages they see are your app and the provider's authorization screen.

### Connect Endpoint

**POST** /UserAgentOAuth/{Provider}Connect

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userAgentGuid` | string | Yes | The agent instance GUID |
| `redirectUrl` | string | Yes | Where to redirect after OAuth completes (HTTPS or localhost) |
| `authMethod` | string | No | `"wiro"` (default) or `"own"` |

#### Response

```json
{
  "result": true,
  "authorizeUrl": "https://x.com/i/oauth2/authorize?response_type=code&client_id=...",
  "errors": []
}
```

### Auth Methods — `"wiro"` vs `"own"`

Both modes produce the **same white-label user experience**. The only difference is whose OAuth app credentials are used for the authorization flow:

|  | `"wiro"` (default) | `"own"` |
|--|---------------------|---------|
| **OAuth app credentials** | Wiro's pre-configured app | Your own app from the provider's developer portal |
| **Setup required** | None — just call Connect | Create an app on the provider, set credentials via Update, register Wiro's callback URL |
| **Consent screen branding** | Shows "Wiro" as the app name | Shows **your app name** and branding |
| **Redirect after auth** | To your `redirectUrl` | To your `redirectUrl` |
| **User sees wiro.ai?** | No | No |
| **Token management** | Automatic by Wiro | Automatic by Wiro |
| **Best for** | Quick setup, prototyping, most use cases | Custom branding on consent screen, custom scopes |

> **Recommendation:** Start with `"wiro"` mode. It works out of the box with no configuration. Switch to `"own"` only if you need your brand name on the provider's consent screen or require custom OAuth scopes/permissions.

To use `"own"` mode, first set your app credentials via `POST /UserAgent/Update`, then call Connect with `authMethod: "own"`. Each provider requires different credential field names:

#### "own" Mode Credentials per Provider

| Provider | Credential Key | Required Fields | Request Example |
|----------|---------------|-----------------|-----------------|
| Twitter/X | `twitter` | `clientId`, `clientSecret` | `"twitter": { "clientId": "your-client-id", "clientSecret": "your-client-secret" }` |
| TikTok | `tiktok` | `clientKey`, `clientSecret` | `"tiktok": { "clientKey": "your-client-key", "clientSecret": "your-client-secret" }` |
| Instagram | `instagram` | `appId`, `appSecret` | `"instagram": { "appId": "your-app-id", "appSecret": "your-app-secret" }` |
| Facebook | `facebook` | `appId`, `appSecret` | `"facebook": { "appId": "your-app-id", "appSecret": "your-app-secret" }` |
| LinkedIn | `linkedin` | `clientId`, `clientSecret`, `organizationId` | `"linkedin": { "clientId": "your-client-id", "clientSecret": "your-client-secret", "organizationId": "your-org-id" }` |
| Google Ads | `googleads` | `clientId`, `clientSecret`, `developerToken`, `managerCustomerId` | `"googleads": { "clientId": "your-client-id", "clientSecret": "your-client-secret", "developerToken": "your-dev-token", "managerCustomerId": "123-456-7890" }` |
| Meta Ads | `metaads` | `appId`, `appSecret` | `"metaads": { "appId": "your-app-id", "appSecret": "your-app-secret" }` |
| HubSpot | `hubspot` | `clientId`, `clientSecret` | `"hubspot": { "clientId": "your-client-id", "clientSecret": "your-client-secret" }` |
| Mailchimp | `mailchimp` | `clientId`, `clientSecret` (or `apiKey` without OAuth) | `"mailchimp": { "clientId": "your-client-id", "clientSecret": "your-client-secret" }` |

> **Note:** Field names differ per provider (e.g. TikTok uses `clientKey` not `clientId`, Instagram/Facebook use `appId`/`appSecret` not `clientId`/`clientSecret`). Always use the exact field names from the table above.

#### "own" Mode Full Flow

```json
// Step 1: Set your app credentials
POST /UserAgent/Update
{
  "guid": "your-useragent-guid",
  "configuration": {
    "credentials": {
      "twitter": {
        "clientId": "your-twitter-client-id",
        "clientSecret": "your-twitter-client-secret"
      }
    }
  }
}

// Step 2: Initiate OAuth with authMethod: "own"
POST /UserAgentOAuth/XConnect
{
  "userAgentGuid": "your-useragent-guid",
  "redirectUrl": "https://your-app.com/callback",
  "authMethod": "own"
}

// Step 3: Redirect user to the returned authorizeUrl
// Step 4: User authorizes → redirected back to your redirectUrl
```

When using `"own"` mode, you must register Wiro's callback URL in your OAuth app settings on the provider's developer portal:

```
https://api.wiro.ai/v1/UserAgentOAuth/{Provider}Callback
```

### Status Check

Check whether a provider is connected for a given agent instance.

**POST** /UserAgentOAuth/{Provider}Status

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userAgentGuid` | string | Yes | The agent instance GUID |

#### Response

```json
{
  "result": true,
  "connected": true,
  "username": "johndoe",
  "connectedAt": "2025-04-01T12:00:00.000Z",
  "tokenExpiresAt": "2025-04-01T14:00:00.000Z",
  "refreshTokenExpiresAt": "2025-10-01T12:00:00.000Z",
  "errors": []
}
```

| Field | Description | Providers |
|-------|-------------|-----------|
| `connected` | Whether the provider is connected | All |
| `username` | Connected account name or identifier | Most providers |
| `linkedinName` | LinkedIn profile name (replaces `username`) | LinkedIn only |
| `customerId` | Google Ads customer ID (replaces `username`) | Google Ads only |
| `connectedAt` | ISO timestamp of when the account was connected | All |
| `tokenExpiresAt` | ISO timestamp of access token expiry | All except Mailchimp |
| `refreshTokenExpiresAt` | ISO timestamp of refresh token expiry | Twitter/X, TikTok, LinkedIn |

### Disconnect

Revoke access and remove stored tokens for a provider.

**POST** /UserAgentOAuth/{Provider}Disconnect

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userAgentGuid` | string | Yes | The agent instance GUID |

#### Response

```json
{
  "result": true,
  "errors": []
}
```

Wiro attempts to revoke the token on the provider's side before clearing it from the configuration. The agent restarts automatically if it was running.

### Token Refresh

Manually trigger a token refresh for a connected provider.

**POST** /UserAgentOAuth/TokenRefresh

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userAgentGuid` | string | Yes | The agent instance GUID |
| `provider` | string | Yes | One of: `twitter`, `tiktok`, `instagram`, `facebook`, `linkedin`, `googleads`, `metaads`, `hubspot` |

> **Note:** Mailchimp is not included — its tokens do not expire.

#### Response

```json
{
  "result": true,
  "accessToken": "new-access-token...",
  "refreshToken": "new-refresh-token...",
  "errors": []
}
```

The agent restarts automatically after a token refresh if it was running.

### Extra Provider Endpoints

#### Google Ads — Set Customer ID

After connecting Google Ads via OAuth, you must set the Google Ads customer ID to target:

**POST** /UserAgentOAuth/GAdsSetCustomerId

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userAgentGuid` | string | Yes | The agent instance GUID |
| `customerId` | string | Yes | Google Ads customer ID (e.g. `"123-456-7890"`). Non-digit characters are stripped automatically. |

##### Response

```json
{
  "result": true,
  "customerId": "1234567890",
  "errors": []
}
```

#### Meta Ads — Set Ad Account

After connecting Meta Ads via OAuth, set the ad account to manage:

**POST** /UserAgentOAuth/MetaAdsSetAdAccount

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userAgentGuid` | string | Yes | The agent instance GUID |
| `adAccountId` | string | Yes | Meta Ads account ID (e.g. `"act_123456789"`). The `act_` prefix is stripped automatically. |
| `adAccountName` | string | No | Display name for the ad account |

##### Response

```json
{
  "result": true,
  "errors": []
}
```

## Custom Skills Configuration

Some agents support configurable skills — automated tasks that the agent can perform on a schedule or on demand. You can enable/disable skills, set their execution interval, and edit their parameters via `POST /UserAgent/Update`.

### Request Format

```json
POST /UserAgent/Update
{
  "guid": "your-useragent-guid",
  "configuration": {
    "custom_skills": [
      {
        "key": "daily_post",
        "enabled": true,
        "interval": "0 9 * * *",
        "value": "Post about trending tech topics",
        "description": "Daily automated post at 9 AM"
      }
    ]
  }
}
```

### Skill Fields

| Field | Type | Description |
|-------|------|-------------|
| `key` | string | The unique identifier of the skill. Must match an existing skill defined in the agent template. |
| `enabled` | boolean | Whether the skill is active. Set `false` to disable without removing. |
| `interval` | string \| null | Cron expression for scheduled execution (e.g. `"0 */6 * * *"` for every 6 hours). Set `null` for on-demand only. |
| `value` | string | User-configurable parameter for the skill (only if `_editable: true`). |
| `description` | string | User-configurable description (only if `_editable: true`). |

> **Note:** You can only update skills that exist in the agent's template. New skills cannot be added — only the `enabled`, `interval`, `value`, and `description` fields can be modified. The `value` and `description` fields are editable only if the skill's `_editable` flag is `true`.

## Security

- **Tokens are stored server-side** in the agent instance configuration. The `TokenRefresh` endpoint returns new tokens — all other endpoints (Status, Detail, Update) sanitize token fields before responding.
- The `redirectUrl` receives only connection status parameters — no tokens, no secrets
- API responses from Status, Detail, and Update endpoints are sanitized: `accessToken`, `refreshToken`, `clientSecret`, and `appSecret` fields are stripped before returning
- OAuth state parameters use a 15-minute TTL cache to prevent replay attacks
- Redirect URLs must be HTTPS (or localhost for development)

## For Third-Party Developers

If you're building a product on top of Wiro agents and need your customers to connect their own accounts (e.g., their Twitter, their Google Ads), here's the recommended flow:

### Architecture

1. **Deploy** an agent instance per customer via `POST /UserAgent/Deploy`
2. **Connect** — your backend calls `POST /UserAgentOAuth/{Provider}Connect` with the customer's `userAgentGuid` and a `redirectUrl` pointing back to your app
3. **Redirect** — send your customer's browser to the returned `authorizeUrl`
4. **Authorize** — customer logs in and authorizes on the provider
5. **Return** — customer lands back on your `redirectUrl` with success/error query parameters
6. **Verify** — call `POST /UserAgentOAuth/{Provider}Status` to confirm connection

Your customers never interact with Wiro directly. The entire flow happens through your app, and Wiro handles token management behind the scenes.

### Handling the Redirect in Your App

```javascript
// Express route handling the OAuth redirect
app.get('/settings/social', (req, res) => {
  const provider = req.query.provider;

  if (req.query.x_connected === 'true') {
    const username = req.query.x_username;
    return res.redirect(`/dashboard?connected=${provider}&username=${username}`);
  }

  if (req.query.x_error) {
    const error = req.query.x_error;
    return res.redirect(`/dashboard?error=${provider}&reason=${error}`);
  }
});
```

### Error Values

OAuth redirect error parameters follow the pattern `{provider_prefix}_error`. Possible values:

| Error | Description |
|-------|-------------|
| `authorization_denied` | User declined the authorization |
| `token_exchange_failed` | Provider accepted the code but token exchange failed |
| `useragent_not_found` | The agent instance GUID is invalid or unauthorized |
| `invalid_config` | Agent configuration doesn't have credentials for this provider |
| `internal_error` | Unexpected server error during callback processing |

---

# Agent Skills

Configure agent behavior with editable preferences and scheduled automation tasks.

## Overview

Every agent has a set of **custom skills** that define its behavior. Skills come in two types:

| Type | Has Interval | Purpose | What You Can Change |
|------|-------------|---------|-------------------|
| **Preferences** | No (`null`) | Instructions that shape agent behavior — tone, style, targeting rules, content strategy | `value`, `description`, `enabled` |
| **Scheduled Tasks** | Yes (cron) | Automated actions that run on a schedule — scanning, reporting, dispatching | `enabled`, `interval` |

Call `POST /UserAgent/Detail` to discover an agent's skills. They appear in `configuration.custom_skills`.

## Discovering Skills

```json
POST /UserAgent/Detail
{ "guid": "your-useragent-guid" }

// Response → configuration.custom_skills:
[
  {
    "key": "content-tone",
    "value": "## Voice\nShort punchy lines, developer-friendly...",
    "description": "Brand voice, hashtags, and posting style",
    "enabled": true,
    "interval": null,
    "_editable": true
  },
  {
    "key": "content-scanner",
    "value": "",
    "description": "What content to find and post about",
    "enabled": true,
    "interval": "0 * * * *",
    "_editable": false
  }
]
```

| Field | Type | Description |
|-------|------|-------------|
| `key` | string | Unique skill identifier. Use this in Update requests. |
| `value` | string | Skill instructions/content. Visible only when `_editable: true` — otherwise empty string. |
| `description` | string | Human-readable description of what the skill does. |
| `enabled` | boolean | Whether the skill is active. |
| `interval` | string \| null | Cron expression for scheduled execution, or `null` for preference-only skills. |
| `_editable` | boolean | If `true`, you can modify `value` and `description`. If `false`, only `enabled` and `interval` can be changed. |

## Updating Preferences

Preference skills (`_editable: true`, `interval: null`) let you customize the agent's behavior by editing its instructions.

### Example: Social Manager — Brand Voice

```json
POST /UserAgent/Update
{
  "guid": "your-social-manager-guid",
  "configuration": {
    "custom_skills": [
      {
        "key": "content-tone",
        "value": "## Voice\nProfessional and informative. No slang.\n\n## Hashtags\nMax 3 per post. Always include #AI and #WiroAI.\n\n## Posting Style\nEvery post must include a link. Use bullet points for features."
      }
    ]
  }
}
```

### Example: Push Notification Manager — Targeting Preferences

```json
POST /UserAgent/Update
{
  "guid": "your-push-agent-guid",
  "configuration": {
    "custom_skills": [
      {
        "key": "push-preferences",
        "value": "## Push Tone\nFriendly and casual. Turkish for locale_tr, English for locale_en.\n\n## Holiday Preferences\nFocus on: New Year, Ramadan, Republic Day.\nSkip: Valentine's Day, Halloween."
      }
    ]
  }
}
```

### Example: Lead Gen Manager — ICP Definition

```json
POST /UserAgent/Update
{
  "guid": "your-leadgen-guid",
  "configuration": {
    "custom_skills": [
      {
        "key": "lead-strategy",
        "value": "## Our Business\nCompany: Acme Corp\nProduct: AI-powered CRM\n\n## Ideal Customer Profile\nIndustry: SaaS, FinTech\nCompany size: 50-500\nJob titles: VP Sales, CTO\n\n## Outreach Tone\nCasual but professional."
      }
    ]
  }
}
```

## Managing Scheduled Tasks

Scheduled tasks run automatically on a cron schedule. Toggle `enabled` and adjust `interval`.

### Example: Change scanner frequency

```json
POST /UserAgent/Update
{
  "guid": "your-useragent-guid",
  "configuration": {
    "custom_skills": [
      { "key": "review-scanner", "enabled": true, "interval": "0 */4 * * *" },
      { "key": "content-scanner", "enabled": false }
    ]
  }
}
```

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

## Full Example: Push Notification Manager

Complete flow — fetch skills, then update preferences and schedules in one request.

**Step 1 — Discover skills:**

```json
POST /UserAgent/Detail
{ "guid": "your-push-agent-guid" }

// Response → configuration.custom_skills:
[
  {
    "key": "push-preferences",
    "value": "## Push Tone\nWrite like a mobile growth expert...",
    "description": "Push notification style, language, and targeting preferences",
    "enabled": true,
    "interval": null,
    "_editable": true
  },
  {
    "key": "push-scanner",
    "value": "",
    "description": "Scan holidays and craft push notification suggestions",
    "enabled": true,
    "interval": "0 9 * * *",
    "_editable": false
  },
  {
    "key": "push-dispatcher",
    "value": "",
    "description": "Send queued push notifications on schedule",
    "enabled": true,
    "interval": "0 * * * *",
    "_editable": false
  }
]
```

**Step 2 — Update everything in one request:**

```json
POST /UserAgent/Update
{
  "guid": "your-push-agent-guid",
  "configuration": {
    "custom_skills": [
      {
        "key": "push-preferences",
        "value": "## Push Tone\nFriendly and casual. Turkish for locale_tr, English for locale_en.\n\n## Holiday Preferences\nFocus on: New Year, Ramadan, Republic Day.\nSkip: Valentine's Day, Halloween.\n\n## Targeting\nAlways segment by locale. Premium version for paid users."
      },
      {
        "key": "push-scanner",
        "enabled": true,
        "interval": "0 9 * * 1"
      },
      {
        "key": "push-dispatcher",
        "interval": "0 */2 * * *"
      }
    ]
  }
}
```

This single request:
1. **push-preferences** — rewrites targeting rules (editable skill, `value` updated)
2. **push-scanner** — changes from daily to Mondays only (`interval` updated)
3. **push-dispatcher** — changes from hourly to every 2 hours (`interval` updated)

## Available Skills by Agent

### Preferences (Editable Instructions)

| Agent | Skill Key | What It Controls |
|-------|-----------|-----------------|
| Social Manager | `content-tone` | Brand voice, hashtags, posting style |
| Blog Content Editor | `content-strategy` | Writing style, topics, research rules |
| App Review Support | `review-preferences` | Response tone, support channels |
| App Event Manager | `event-preferences` | Event regions, holiday priorities |
| Push Notification | `push-preferences` | Push tone, language, targeting |
| Newsletter Manager | `newsletter-strategy` | Topics, tone, audience, frequency |
| Lead Gen Manager | `lead-strategy` | ICP definition, outreach tone |
| Google Ads Manager | `ad-strategy` | Target audience, budget goals |
| Meta Ads Manager | `ad-strategy` | Target audience, creative preferences |

### Scheduled Tasks

| Agent | Task Key | Description | Default Schedule |
|-------|----------|-------------|-----------------|
| Social Manager | `content-scanner` | Scan for new models, prepare posts | Hourly |
| Social Manager | `gmail-checker` | Check inbox for requests | Every 30 min |
| Blog Content | `blog-scanner` | Discover topics, write content | Daily 9 AM |
| Blog Content | `gmail-checker` | Check inbox for topic requests | Every 30 min |
| App Review | `review-scanner` | Scan stores for new reviews | Every 2 hours |
| App Event | `app-event-scanner` | Scan holidays, suggest events | Monday 9 AM |
| Push Notification | `push-scanner` | Scan holidays, craft suggestions | Daily 9 AM |
| Push Notification | `push-dispatcher` | Send queued notifications | Hourly |
| Newsletter | `newsletter-sender` | Create and send newsletters | Monday 9 AM |
| Newsletter | `subscriber-scanner` | Subscriber list health check | Daily 10 AM |
| Lead Gen | `prospect-scanner` | Prospect search and scoring | Monday 10 AM |
| Lead Gen | `outreach-reporter` | Outreach performance report | Daily 9 AM |
| Lead Gen | `reply-handler` | Check replies, analyze sentiment | Every 4 hours |
| Google Ads | `performance-reporter` | Performance report | Daily 9 AM |
| Google Ads | `competitor-scanner` | Competitor analysis | Monday 10 AM |
| Google Ads | `holiday-ad-planner` | Holiday ad campaigns | Wednesday 10 AM |
| Meta Ads | `performance-reporter` | Performance report | Daily 9 AM |
| Meta Ads | `audience-scanner` | Audience analysis | Monday 10 AM |
| Meta Ads | `holiday-ad-planner` | Holiday campaigns | Wednesday 10 AM |

## Update Rules

| Field | Editable Skills (`_editable: true`) | System Skills (`_editable: false`) |
|-------|-------------------------------------|-----------------------------------|
| `key` | Read-only (used for lookup) | Read-only |
| `enabled` | Can toggle on/off | Can toggle on/off |
| `interval` | Can change cron schedule | Can change cron schedule |
| `value` | Can rewrite instructions | Ignored (hidden in API response) |
| `description` | Can update description | Ignored |
| `_editable` | Read-only | Read-only |

- Include only the fields you want to change — omitted fields keep their current values
- New skills cannot be added — only existing skills (matched by `key`) can be updated
- Send empty string `""` for `interval` to clear the schedule (becomes `null`)
- You can update credentials and skills in the same `POST /UserAgent/Update` request

---

# Agent Use Cases

Build products with autonomous AI agents using the Wiro API.

## Two Deployment Patterns

Every product built on Wiro agents follows one of two patterns. Choosing the right one depends on whether your users need to connect their own third-party accounts.

### Pattern 1: Instance Per Customer

Most agents interact with external services — posting to social media, managing ad campaigns, sending emails. These require OAuth tokens or API keys that belong to the end user. Deploy a **separate agent instance** for each of your customers.

**Why:** Each customer connects their own accounts. Credentials are bound to the instance, isolated from other customers.

**How:** Call `POST /UserAgent/Deploy` once per customer, then use the [OAuth flow](#agent-credentials--oauth) to connect their accounts.

#### Real-World Examples

| Your Product | Agent Type | Why Per-Customer |
|-------------|-----------|-----------------|
| Digital marketing agency dashboard | Social Manager | Each client connects their own Twitter, Instagram, Facebook, TikTok, LinkedIn |
| Mobile app company | App Review Support | Each app has its own App Store / Google Play credentials |
| E-commerce platform | Google Ads Manager + Meta Ads Manager | Each advertiser connects their own ad accounts |
| Marketing SaaS | Newsletter Manager | Each customer connects their own Brevo/SendGrid/Mailchimp |
| Sales platform | Lead Gen Manager | Each sales team connects their own Apollo/Lemlist |
| Content agency tool | Blog Content Editor | Each client connects their own WordPress site |
| App publisher platform | App Event Manager | Each app has its own Firebase project |
| Customer engagement tool | Social Manager | Each brand manages their own social presence |

### Pattern 2: Session Per User

For conversational agents that don't need per-user credentials. One agent instance serves many users, each identified by a unique `sessionkey` that isolates their conversation history.

**Why:** No third-party accounts to connect. The agent answers questions using its built-in knowledge or pre-configured data sources.

**How:** Deploy one instance via `POST /UserAgent/Deploy`, then send messages with different `sessionkey` values per user.

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

## Building Your Product

### White-Label Chat

Build a fully branded chat experience with no Wiro UI visible to your users.

1. Deploy an agent via `POST /UserAgent/Deploy`
2. Start the agent with `POST /UserAgent/Start`
3. Build your own chat UI
4. Send messages via `POST /UserAgent/Message/Send`
5. Stream responses in real-time via [WebSocket](#agent-websocket) using the `agenttoken`
6. Manage conversation history with `POST /UserAgent/Message/History`

```bash
# Deploy
curl -X POST "https://api.wiro.ai/v1/UserAgent/Deploy" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "agentguid": "agent-template-guid",
    "title": "Customer Support Bot",
    "useprepaid": true,
    "plan": "starter"
  }'

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

See [Agent Webhooks](#agent-webhooks) for payload format and retry policy.

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
| **Google Ads Manager** | Create and optimize Google Ads campaigns | Google Ads (OAuth) |
| **Meta Ads Manager** | Manage Facebook and Instagram ad campaigns | Meta Ads (OAuth), Facebook (OAuth) |
| **Newsletter Manager** | Design and send email newsletters | Brevo, SendGrid, or Mailchimp (API key or OAuth) |
| **Lead Gen Manager** | Find and enrich leads, run outreach sequences | Apollo, Lemlist (API key) |
| **Blog Content Editor** | Write and publish blog posts | WordPress (API key) |
| **App Review Support** | Monitor and respond to app store reviews | App Store, Google Play (API key) |
| **App Event Manager** | Track and manage mobile app events | Firebase (API key) |
| **HubSpot Manager** | Manage CRM contacts, deals, and workflows | HubSpot (OAuth) |

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

# Deploy an instance
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
        "userAgentGuid": useragent_guid,
        "redirectUrl": "https://your-app.com/settings?connected=twitter"
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

Browse available agents and their capabilities at [Agent/List](#agent-overview) or in the [Wiro dashboard](https://wiro.ai/agents).

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
- `UserAgent/UpgradePlan` — upgrade plan

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
