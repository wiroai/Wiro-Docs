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

Wiro agents connect to external services — social platforms, ad networks, email tools, CRMs — through two credential methods:

1. **API Key credentials** — set directly via `POST /UserAgent/Update`.
2. **OAuth credentials** — redirect-based authorization via `POST /UserAgentOAuth/{Provider}Connect`, where Wiro handles token exchange server-side.

Each external service Wiro talks to is documented as its own **integration page** with the full setup walkthrough, API reference, troubleshooting, and multi-tenant architecture notes. Use the catalog below to jump to the one you need.

## Integration Catalog

### OAuth Integrations

| Integration | Auth Modes | Setup Guide |
|-------------|------------|-------------|
| Meta Ads | Own only (Wiro mode coming soon) | [Meta Ads integration](/docs/integration-metaads) |
| Facebook Page | Own only (Wiro mode coming soon) | [Facebook Page integration](/docs/integration-facebook) |
| Instagram | Own only (Wiro mode coming soon) | [Instagram integration](/docs/integration-instagram) |
| LinkedIn | Own only (Wiro mode coming soon) | [LinkedIn integration](/docs/integration-linkedin) |
| Twitter / X | Wiro + Own | [Twitter integration](/docs/integration-twitter) |
| TikTok | Wiro + Own | [TikTok integration](/docs/integration-tiktok) |
| Google Ads | Wiro + Own | [Google Ads integration](/docs/integration-googleads) |
| HubSpot | Wiro + Own | [HubSpot integration](/docs/integration-hubspot) |
| Mailchimp | Wiro + Own + API key | [Mailchimp integration](/docs/integration-mailchimp) |
| Google Drive | Wiro + Own | [Google Drive integration](/docs/integration-googledrive) |

> **Meta Platforms availability:** While Wiro's shared Meta App is under review by Meta, the Meta Ads, Facebook Page, and Instagram integrations must be connected using your **own Meta Developer App**. No App Review is required — Development Mode + App Roles is sufficient. See each integration page for step-by-step setup.

### API Key Integrations

| Integration | Setup Guide |
|-------------|-------------|
| Gmail | [Gmail integration](/docs/integration-gmail) |
| Telegram | [Telegram integration](/docs/integration-telegram) |
| Firebase | [Firebase integration](/docs/integration-firebase) |
| WordPress | [WordPress integration](/docs/integration-wordpress) |
| App Store Connect | [App Store integration](/docs/integration-appstore) |
| Google Play | [Google Play integration](/docs/integration-googleplay) |
| Apollo | [Apollo integration](/docs/integration-apollo) |
| Lemlist | [Lemlist integration](/docs/integration-lemlist) |
| Brevo | [Brevo integration](/docs/integration-brevo) |
| SendGrid | [SendGrid integration](/docs/integration-sendgrid) |

## Setting API Key Credentials

Use `POST /UserAgent/Update` with `configuration.credentials.<service>` to set credentials. Each integration page above documents the exact field names for that service.

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Update" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "guid": "your-useragent-guid",
    "configuration": {
      "credentials": {
        "gmail": {
          "account": "agent@company.com",
          "appPassword": "xxxx xxxx xxxx xxxx"
        }
      }
    }
  }'
```

### Merge behavior

`UserAgent/Update` **merges** credential fields. Only fields you send are updated; existing fields (including OAuth tokens Wiro writes server-side) are preserved.

- Only fields marked `_editable: true` are accepted. Non-editable fields are silently ignored. Use `POST /UserAgent/Detail` to inspect `_editable` flags.
- Credential keys that do not already exist in the agent template cannot be added — you can only update keys the agent declares.

## OAuth Authorization Flow

For services that require user authorization, Wiro implements a full OAuth redirect flow. The entire process is **fully white-label** — your end users interact only with your app and the provider's consent screen. They never see or visit wiro.ai.

> The `redirectUrl` you pass to the Connect endpoint is **your own URL**. After authorization, users are redirected back to your app with status query parameters. HTTPS is required; `http://localhost` and `http://127.0.0.1` are allowed for development.

### Generic flow

```
Your App (Frontend)           Your Backend              Wiro API              Provider
       |                            |                       |                      |
  (1)  | "Connect X" click          |                       |                      |
       |--------------------------->|                       |                      |
  (2)  |                            |  POST /{P}Connect --> |                      |
       |                            |  { userAgentGuid,     |                      |
       |                            |    redirectUrl,       |                      |
       |                            |    authMethod }       |                      |
  (3)  |                            |<-- { authorizeUrl }   |                      |
  (4)  |<--- redirect to authorizeUrl -------------------------------------------->|
  (5)  |                            |                       |<-- User clicks Allow |
  (6)  |                            |  (invisible callback) |                      |
       |                            |  Wiro exchanges code  |<---------------------|
       |                            |  for tokens, saves    |                      |
  (7)  |<------- 302 to YOUR redirectUrl --------------------------------------->  |
       |        ?{provider}_connected=true&...                                     |
```

### Connect endpoint (common shape)

**POST** `/UserAgentOAuth/{Provider}Connect`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userAgentGuid` | string | Yes | Agent instance GUID. |
| `redirectUrl` | string | Yes | Where to redirect after OAuth completes. |
| `authMethod` | string | No | `"wiro"` (default) or `"own"`. See integration page for availability. |

Response:

```json
{
  "result": true,
  "authorizeUrl": "https://provider.example.com/oauth/authorize?...",
  "errors": []
}
```

### Auth Methods — `"wiro"` vs `"own"`

|  | `"wiro"` | `"own"` |
|--|---------|---------|
| **OAuth app credentials** | Wiro's pre-configured app | Your own app on the provider's developer portal |
| **Setup required** | None — just call Connect | Create an app on the provider, save credentials via Update, register Wiro's callback URL |
| **Consent screen branding** | Shows "Wiro" as the app name | Shows **your app name** |
| **Redirect after auth** | To your `redirectUrl` | To your `redirectUrl` |
| **User sees wiro.ai?** | No | No |
| **Token management** | Automatic by Wiro | Automatic by Wiro |
| **Best for** | Quick setup when available | Custom branding, bypassing long review processes |

For the full own-mode credential field names and provider-specific setup, see the individual integration page.

### Callback URL pattern (own mode)

Register this URL in your OAuth app settings on the provider's developer portal:

```
https://api.wiro.ai/v1/UserAgentOAuth/{Provider}Callback
```

Provider-specific paths: `MetaAdsCallback`, `FBCallback`, `IGCallback`, `LICallback`, `XCallback`, `TikTokCallback`, `GAdsCallback`, `HubSpotCallback`, `MailchimpCallback`, `GoogleDriveCallback`.

### Callback success & error parameters

After OAuth completes, Wiro redirects users to your `redirectUrl` with provider-specific query parameters:

| Provider | Success Params | Error Param |
|----------|---------------|-------------|
| Twitter / X | `x_connected=true&x_username=...` | `x_error=...` |
| TikTok | `tiktok_connected=true&tiktok_username=...` | `tiktok_error=...` |
| Instagram | `ig_connected=true&ig_username=...` | `ig_error=...` |
| Facebook | `fb_connected=true&fb_pagename=...&fb_pages=[...]` | `fb_error=...` |
| LinkedIn | `li_connected=true&li_name=...` | `li_error=...` |
| Google Ads | `gads_connected=true&gads_accounts=[...]` | `gads_error=...` |
| Meta Ads | `metaads_connected=true&metaads_accounts=[...]` | `metaads_error=...` |
| HubSpot | `hubspot_connected=true&hubspot_portal=...&hubspot_name=...` | `hubspot_error=...` |
| Mailchimp | `mailchimp_connected=true&mailchimp_account=...` | `mailchimp_error=...` |

Error values follow the pattern `{provider}_error=<code>`. Common codes across all providers:

| Code | Meaning |
|------|---------|
| `authorization_denied` | User cancelled, or in Meta Development Mode the user is not added under App Roles. |
| `session_expired` | 15-minute state cache expired. |
| `token_exchange_failed` | Wrong App Secret or redirect URI mismatch. |
| `useragent_not_found` | Invalid or unauthorized `userAgentGuid`. |
| `invalid_config` | Agent has no credentials block for the provider. |
| `internal_error` | Unexpected server error. |

See each integration page for provider-specific error details and remediation.

### Generic OAuth Endpoints

These endpoints work the same way across every OAuth provider. Replace `{Provider}` with the integration code (`MetaAds`, `FB`, `IG`, `LI`, `X`, `TikTok`, `GAds`, `HubSpot`, `Mailchimp`).

#### **POST** /UserAgentOAuth/{Provider}Status

Check the current connection state.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userAgentGuid` | string | Yes | Agent instance GUID. |

Response:

```json
{
  "result": true,
  "connected": true,
  "username": "connected-account-name",
  "connectedAt": "2026-04-17T12:00:00.000Z",
  "tokenExpiresAt": "2026-06-16T12:00:00.000Z",
  "refreshTokenExpiresAt": "2026-10-17T12:00:00.000Z",
  "errors": []
}
```

Some providers use integration-specific field names instead of `username` (e.g. `linkedinName`, `customerId`). Refer to the relevant integration page.

#### **POST** /UserAgentOAuth/{Provider}Disconnect

Revoke access and clear stored credentials.

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/{Provider}Disconnect" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "userAgentGuid": "your-useragent-guid" }'
```

Response: `{ "result": true, "errors": [] }`. The agent restarts automatically if it was running.

#### **POST** /UserAgentOAuth/TokenRefresh

Force-refresh the provider's access token. Wiro auto-refreshes before expiry, so manual refresh is rarely needed.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userAgentGuid` | string | Yes | Agent instance GUID. |
| `provider` | string | Yes | One of: `twitter`, `tiktok`, `instagram`, `facebook`, `linkedin`, `googleads`, `metaads`, `hubspot`, `googledrive`. |

```json
{
  "result": true,
  "accessToken": "new-access-token...",
  "refreshToken": "new-refresh-token...",
  "errors": []
}
```

Mailchimp tokens do not expire and are not included.

### Provider-Specific Post-Callback Endpoints

Some integrations require a second step after the callback to finalize the connection. These are documented on their respective integration pages:

| Endpoint | Purpose | Integration |
|----------|---------|-------------|
| `POST /UserAgentOAuth/MetaAdsSetAdAccount` | Pick the ad account to manage. | [Meta Ads](/docs/integration-metaads) |
| `POST /UserAgentOAuth/FBSetPage` | Pick the Facebook Page (multi-page accounts). | [Facebook Page](/docs/integration-facebook) |
| `POST /UserAgentOAuth/GAdsSetCustomerId` | Pick the Google Ads customer ID. | [Google Ads](/docs/integration-googleads) |

## Setup Required State

If an agent has required (non-optional) credentials that have not been filled in, the agent is in **Setup Required** state (status `6`) and cannot be started. After setting all required credentials via Update, the status automatically changes to `0` (Stopped) and you can call `POST /UserAgent/Start`.

Check the `setuprequired` boolean in `UserAgent/Detail` or `UserAgent/MyAgents` responses to determine if credentials still need to be configured.

## Security

- **Tokens are stored server-side** in the agent instance configuration. The `TokenRefresh` endpoint returns new tokens — all other endpoints (Status, Detail, Update) sanitize token fields before responding.
- The `redirectUrl` receives only connection status parameters — no tokens, no secrets.
- API responses from Status, Detail, and Update endpoints are sanitized: `accessToken`, `refreshToken`, `clientSecret`, and `appSecret` fields are stripped before returning.
- OAuth state parameters use a 15-minute TTL cache to prevent replay attacks.
- Redirect URLs must be HTTPS (or localhost / 127.0.0.1 for development).

## For Third-Party Developers

If you are building a product on top of Wiro agents and need your customers to connect their own accounts, the recommended flow is:

1. **Deploy** an agent instance per customer via `POST /UserAgent/Deploy`.
2. **Connect** — your backend calls `POST /UserAgentOAuth/{Provider}Connect` with the customer's `userAgentGuid` and a `redirectUrl` pointing back to your app.
3. **Redirect** — send the customer's browser to the returned `authorizeUrl`.
4. **Authorize** — customer authorizes on the provider's consent screen.
5. **Return** — customer lands back on your `redirectUrl` with success/error query parameters.
6. **Verify** — call `POST /UserAgentOAuth/{Provider}Status` to confirm.

Each integration page includes a dedicated **Multi-Tenant Architecture** section covering per-provider rate limits, token isolation, and White-Label consent screen configuration.

### Handling the OAuth redirect in your app

```javascript
// Express route that receives the OAuth return
app.get('/settings/integrations', (req, res) => {
  if (req.query.x_connected === 'true') {
    return res.redirect(`/dashboard?connected=twitter&username=${req.query.x_username}`)
  }
  if (req.query.metaads_connected === 'true') {
    const accounts = JSON.parse(decodeURIComponent(req.query.metaads_accounts || '[]'))
    // Show account picker or auto-select if only one
    return res.redirect(`/dashboard/meta-ads?accounts=${encodeURIComponent(JSON.stringify(accounts))}`)
  }
  if (req.query.fb_connected === 'true') {
    const pages = JSON.parse(decodeURIComponent(req.query.fb_pages || '[]'))
    return pages.length > 1
      ? res.redirect(`/dashboard/facebook?pick=${encodeURIComponent(JSON.stringify(pages))}`)
      : res.redirect('/dashboard?connected=facebook')
  }
  const err = Object.keys(req.query).find((k) => k.endsWith('_error'))
  if (err) return res.redirect(`/dashboard?error=${err}&reason=${req.query[err]}`)
  res.redirect('/dashboard')
})
```


# Meta Ads Integration

Connect your agents to Meta's advertising platform to manage campaigns, ad sets, creatives, and insights across Facebook and Instagram ads.

## Overview

The Meta Ads integration powers agents that work with the Meta Marketing API — creating and managing campaigns, pulling performance insights, managing creatives, and analyzing ad account data.

**Skills that use this integration:**

- `metaads-manage` — Campaign/ad set/creative management, insights reporting
- `ads-manager-common` — Shared ads helpers (used together with `metaads-manage` and `googleads-manage`)

**Agents that typically enable this integration:**

- Meta Ads Manager
- Any custom agent that needs paid-media capabilities on Meta

## Availability

| Mode | Status | Notes |
|------|--------|-------|
| `"wiro"` | Coming soon | Wiro's shared Meta App is under review by Meta. |
| `"own"` | Available now | You create your own Meta Developer App and connect it to Wiro. No App Review required when using Development Mode + App Roles. |

> **Why own mode only right now?** Meta's approval process for multi-tenant apps that request `ads_management` is long and strict. While our shared app is pending, you can skip this bottleneck entirely by using your own Meta Developer App in Development Mode — App Review is **not needed** as long as every user who connects is listed under your app's Roles.

## Prerequisites

Before you start, make sure you have:

- **A Wiro API key** — see [Authentication](/docs/authentication) for how to issue keys and sign requests.
- **A deployed agent** — see [Agent Overview](/docs/agent-overview) and call `POST /UserAgent/Deploy` first. You need the returned `useragentguid` for every step below.
- **A Meta Business account** — create one at [business.facebook.com](https://business.facebook.com/) if you do not already manage an ad account through Meta Business Suite.
- **A Meta Developer account** — same login as Facebook; visit [developers.facebook.com](https://developers.facebook.com/) once and accept the developer terms.
- **An HTTPS callback URL** that your backend controls (for example `https://your-app.com/settings/integrations`). `http://localhost` and `http://127.0.0.1` are accepted only for local development.

## Complete Integration Walkthrough

This is the end-to-end flow. All curl examples are real — they match the endpoints and payloads produced by Wiro in production.

### Step 1: Create a Meta Developer App

1. Go to [developers.facebook.com/apps](https://developers.facebook.com/apps) and click **Create app**.
2. Choose **"Other"** as the use case, then **"Business"** as the app type.
3. Set an **App display name** (your customers may see this on the consent screen — use your company or product name).
4. Enter an **App contact email**.
5. Select the **Meta Business Account** that owns the ad accounts you plan to manage, then click **Create app**.

You are now on the app dashboard. The app is in **Development Mode** by default — leave it there. Do not switch it to Live Mode; Development Mode is exactly what lets you skip App Review.

### Step 2: Add the Marketing API product

1. From the left sidebar of your app dashboard, click **Add product**.
2. Find **"Marketing API"** and click **Set up**.
3. No additional configuration is required inside Marketing API itself — just adding the product unlocks the `ads_*` permissions.

### Step 3: Add "Facebook Login for Business" and configure the redirect URI

Meta Ads OAuth uses Facebook Login under the hood. You must add Facebook Login for Business and register Wiro's callback URL.

1. Click **Add product** again.
2. Find **"Facebook Login for Business"** and click **Set up**.
3. In the left sidebar, go to **Facebook Login for Business → Settings**.
4. Scroll to **Valid OAuth Redirect URIs** and add:

   ```
   https://api.wiro.ai/v1/UserAgentOAuth/MetaAdsCallback
   ```

5. Click **Save changes** at the bottom of the page.

> This is the single most common place where own-mode setups fail. The redirect URI must be **exact** — no trailing slash, HTTPS scheme, same capitalization.

### Step 4: Note the required permissions

Wiro requests the following scopes during OAuth:

| Permission | Why it is needed |
|------------|------------------|
| `ads_management` | Create, update, and pause campaigns, ad sets, and ads. |
| `ads_read` | Read insights, performance metrics, and account metadata. |
| `business_management` | Query business assets (ad accounts, pages) linked to the user. |
| `pages_show_list` | List Facebook pages tied to the ad account (needed for creatives that reference a page). |
| `pages_read_engagement` | Read engagement on those pages when relevant to ads. |

These permissions normally require App Review in Live Mode. In Development Mode they work **without App Review** for any Facebook user who is listed under your app's Roles (see Step 6).

You do not need to request Advanced Access. Standard Access is sufficient for Development Mode users.

### Step 5: Copy your App ID and App Secret

1. In the app dashboard, go to **App settings → Basic**.
2. Copy the **App ID**.
3. Click **Show** next to **App Secret** and copy it. Treat this value like a password — never expose it client-side.

### Step 6: Add other Facebook accounts as Testers or Developers (only if needed)

- **If you are connecting your own Facebook account** (the one that created the app), skip this step. You are already the app Admin and can authorize immediately.
- **If your end users are different Facebook accounts** (typical for a SaaS product), each of them must be added to the app Roles before they can authorize in Development Mode.

To add a user:

1. Go to **App Roles → Roles** in the left sidebar.
2. Click **Add People** and enter the person's Facebook name or email.
3. Pick **Testers** (recommended) or **Developers** and send the invite.
4. The invited user accepts the invite at [facebook.com/settings → Business Integrations](https://www.facebook.com/settings?tab=business_tools). Once accepted, they can complete the OAuth flow against your app.

When App Review is eventually required (only if you decide to go Live Mode), this step becomes unnecessary — but for Development Mode it is mandatory for anyone who is not the app Admin.

### Step 7: Save your App ID and App Secret to Wiro

Push your credentials into the target agent's configuration. Wiro merges credential updates — fields you do not send are preserved, so OAuth tokens attached later will not be wiped.

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Update" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "guid": "your-useragent-guid",
    "configuration": {
      "credentials": {
        "metaads": {
          "appId": "YOUR_META_APP_ID",
          "appSecret": "YOUR_META_APP_SECRET"
        }
      }
    }
  }'
```

Successful response (abbreviated):

```json
{
  "result": true,
  "useragents": [
    {
      "guid": "your-useragent-guid",
      "setuprequired": false,
      "status": 0
    }
  ],
  "errors": []
}
```

> The `_editable` flag on each credential field controls whether your update is accepted. For OAuth credentials (`appId`, `appSecret`, `authMethod`) these are editable by default. If you see a silent no-op, call `POST /UserAgent/Detail` and inspect `configuration.credentials.metaads._editable` — only fields marked `true` are writable.

### Step 8: Initiate OAuth

Ask Wiro to start a Meta OAuth flow on behalf of this agent. Include `authMethod: "own"` so Wiro uses the `appId`/`appSecret` you just saved instead of its own shared app.

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/MetaAdsConnect" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "userAgentGuid": "your-useragent-guid",
    "redirectUrl": "https://your-app.com/settings/integrations",
    "authMethod": "own"
  }'
```

Response:

```json
{
  "result": true,
  "authorizeUrl": "https://www.facebook.com/v25.0/dialog/oauth?client_id=...&redirect_uri=https%3A%2F%2Fapi.wiro.ai%2Fv1%2FUserAgentOAuth%2FMetaAdsCallback&state=...&scope=ads_management,ads_read,business_management,pages_show_list,pages_read_engagement",
  "errors": []
}
```

Redirect the end user's browser to `authorizeUrl`. Full-page redirect is recommended over a popup — some browsers block third-party cookies in popups, which can break OAuth sessions.

> **State TTL:** Wiro caches the OAuth state for **15 minutes**. If the user takes longer to complete consent, the flow returns `session_expired` and you must restart from this step.

### Step 9: Handle the callback

After the user consents on Facebook, Meta sends them back to Wiro's callback URL. Wiro exchanges the code for a long-lived token, fetches the user's ad accounts, writes tokens into the agent config, and finally redirects the user to **your** `redirectUrl` with query parameters.

**Success** — the URL looks like:

```
https://your-app.com/settings/integrations?metaads_connected=true&metaads_accounts=%5B%7B%22id%22%3A%22123456789%22%2C%22name%22%3A%22My%20Ad%20Account%22%7D%5D
```

`metaads_accounts` is a URL-encoded JSON array. Each element has `id` (with the `act_` prefix stripped) and `name`. Only ad accounts with `account_status === 1` (active) are included.

Parse it like this:

```javascript
const params = new URLSearchParams(window.location.search);

if (params.get("metaads_connected") === "true") {
  const accountsJson = params.get("metaads_accounts");
  const accounts = JSON.parse(decodeURIComponent(accountsJson || "[]"));
  // accounts === [{ id: "123456789", name: "My Ad Account" }, ...]
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

**Error** — redirected URL contains `metaads_error=<code>`. See [Troubleshooting](#troubleshooting) for each code and how to recover.

### Step 10: Persist the ad account selection

Wiro does not automatically pick an ad account for you — you must tell it which one to use. Call `MetaAdsSetAdAccount`:

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/MetaAdsSetAdAccount" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "userAgentGuid": "your-useragent-guid",
    "adAccountId": "123456789",
    "adAccountName": "My Ad Account"
  }'
```

Response:

```json
{
  "result": true,
  "errors": []
}
```

Notes:

- Pass the ad account ID **without** the `act_` prefix. If you include it, Wiro strips it automatically.
- `adAccountName` is optional but recommended — it surfaces in the dashboard and logs.
- If the agent was already running, Wiro restarts it so the new ad account ID takes effect immediately. No additional Start call is needed.

### Step 11: Verify the connection

Confirm everything is wired up correctly:

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/MetaAdsStatus" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "userAgentGuid": "your-useragent-guid" }'
```

Response:

```json
{
  "result": true,
  "connected": true,
  "username": "My Ad Account",
  "connectedAt": "2026-04-17T12:00:00.000Z",
  "tokenExpiresAt": "2026-06-16T12:00:00.000Z",
  "errors": []
}
```

`username` is the saved ad account name. `tokenExpiresAt` is the long-lived token expiry (~60 days from connection).

### Step 12: Start the agent if it is not running

If this agent was freshly deployed and has only just received its first credentials, it may still be in Stopped state (`status: 0`). Kick it off:

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Start" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "guid": "your-useragent-guid" }'
```

Check the `setuprequired` flag in `POST /UserAgent/Detail`: if it is still `true`, some other credential on this agent is missing and Start will refuse. See [Agent Credentials — Setup Required State](/docs/agent-credentials#setup-required-state).

Agents that were already running when you connected Meta Ads restart automatically — you do not need to call Start.

## API Reference

All endpoints under this section require the standard Wiro authentication headers (`x-api-key`, optionally `x-nonce` + `x-signature` when the project is in signature mode). See [Authentication](/docs/authentication).

### **POST** /UserAgentOAuth/MetaAdsConnect

Initiate the Meta Ads OAuth flow and receive a `authorizeUrl`.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userAgentGuid` | string | Yes | Agent instance GUID. |
| `redirectUrl` | string | Yes | HTTPS URL where the user is returned after consent. `http://localhost` / `http://127.0.0.1` are allowed in dev. |
| `authMethod` | string | No | `"wiro"` (default) or `"own"`. Use `"own"` while Wiro's shared app is pending. |

Response:

```json
{
  "result": true,
  "authorizeUrl": "https://www.facebook.com/v25.0/dialog/oauth?...",
  "errors": []
}
```

If `result: false`, inspect `errors[0].message` — common failures include `Missing userAgentGuid`, `Missing redirectUrl`, `Invalid redirect URL`, `User agent not found or unauthorized`, and `Meta Ads credentials not configured` (own mode without prior Update).

### **GET** /UserAgentOAuth/MetaAdsCallback

Server-side callback invoked by Facebook. You do not call this directly — you just need to know which query parameters Wiro appends to **your** `redirectUrl` after the callback completes.

| Param | Meaning |
|-------|---------|
| `metaads_connected=true` | OAuth finished successfully. |
| `metaads_accounts=<URL-encoded JSON>` | Array of `{ id, name }` for active ad accounts on the user. |
| `metaads_error=<code>` | OAuth failed. Codes listed in [Troubleshooting](#troubleshooting). |

### **POST** /UserAgentOAuth/MetaAdsSetAdAccount

Persist the ad account the agent should operate on.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userAgentGuid` | string | Yes | Agent instance GUID. |
| `adAccountId` | string | Yes | Ad account ID without the `act_` prefix. If included, the prefix is stripped server-side. |
| `adAccountName` | string | No | Display name shown in dashboards and logs. |

Response:

```json
{ "result": true, "errors": [] }
```

### **POST** /UserAgentOAuth/MetaAdsStatus

Check the current Meta Ads connection state for an agent.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userAgentGuid` | string | Yes | Agent instance GUID. |

Response fields:

| Field | Description |
|-------|-------------|
| `connected` | `true` once credentials and an ad account are both set. |
| `username` | The selected ad account name. |
| `connectedAt` | ISO timestamp of connection. |
| `tokenExpiresAt` | Long-lived token expiry (~60 days from connection). |

### **POST** /UserAgentOAuth/MetaAdsDisconnect

Revoke and clear Meta Ads credentials for the agent. The agent restarts automatically if it was running.

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/MetaAdsDisconnect" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "userAgentGuid": "your-useragent-guid" }'
```

Response: `{ "result": true, "errors": [] }`

### **POST** /UserAgentOAuth/TokenRefresh

Force-refresh the Meta long-lived token. Wiro auto-refreshes before expiry, so you typically do not need to call this manually. Use it if your agent has been idle for weeks and you want to warm up the token before a burst of API calls.

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/TokenRefresh" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "userAgentGuid": "your-useragent-guid",
    "provider": "metaads"
  }'
```

Response:

```json
{
  "result": true,
  "accessToken": "EAAG...",
  "errors": []
}
```

## Using the Skill

Once credentials are connected and the ad account is set, Meta Ads capabilities are exposed through the `metaads-manage` skill inside the agent runtime. To enable it or configure scheduled runs (for example a daily performance report), see [Agent Skills](/docs/agent-skills#enabling-skills) and use `POST /UserAgent/Update` with the `custom_skills` array.

Typical skills configuration block:

```json
{
  "guid": "your-useragent-guid",
  "configuration": {
    "custom_skills": [
      {
        "key": "performance-reporter",
        "enabled": true,
        "interval": "0 9 * * *",
        "value": "Summarize yesterday's spend and CPA by campaign"
      }
    ]
  }
}
```

## Troubleshooting

Every OAuth failure redirects to your `redirectUrl` with a `metaads_error=<code>` query parameter. Use this table to diagnose and recover.

| Error code | Meaning | What to do |
|------------|---------|------------|
| `missing_params` | The callback was hit without a `state` or `code`. | Do not hit the callback URL directly. Start a new OAuth flow from Step 8. |
| `session_expired` | More than 15 minutes passed between `MetaAdsConnect` and the consent screen callback. | Call `MetaAdsConnect` again to issue a fresh state. |
| `authorization_denied` | The user clicked **Cancel** on the consent screen, or Facebook returned an `error=access_denied`. In Development Mode this also happens when the user is not listed under App Roles. | Add the user as a Tester under App Roles (Step 6), ask them to accept the invite, then retry. |
| `token_exchange_failed` | Facebook rejected the token exchange. Usually a wrong `App Secret`, a revoked app, or a mismatch between the redirect URI in your code and the one registered in Facebook Login for Business → Settings. | Re-copy the App Secret from Settings → Basic, double-check the redirect URI string, and retry. |
| `useragent_not_found` | The `userAgentGuid` in `MetaAdsConnect` was wrong or does not belong to the API key's user. | Fetch the correct guid with `POST /UserAgent/MyAgents`. |
| `invalid_config` | The agent has no `credentials.metaads` block at all. | Call `POST /UserAgent/Update` to add at least `metaads.appId` and `metaads.appSecret`, then retry `MetaAdsConnect`. |
| `internal_error` | Unexpected server error during callback handling. | Retry once. If it persists, contact Wiro support with the timestamp and your `userAgentGuid`. |

### "App not verified" warning on consent

In Development Mode, Facebook shows a yellow "This app is not approved by Facebook yet" banner on the consent screen. This is expected and **not** a blocker — users listed under App Roles can still click **Continue** and finish authorization. Users who are not in App Roles will see a hard block and cannot proceed.

### Credentials were saved but `Status` returns `connected: false`

`connected: true` requires both a saved OAuth token **and** a selected ad account. If you skipped Step 10 (`MetaAdsSetAdAccount`), the Status endpoint will report `connected: false` until you pick an account.

### Token keeps expiring

Long-lived Meta tokens last ~60 days. Wiro auto-refreshes them before they expire, so you rarely need to intervene. If you do see `tokenExpiresAt` in the past, call `POST /UserAgentOAuth/TokenRefresh` with `provider: "metaads"` to force a refresh. If that fails, the user must redo the OAuth flow (Step 8 onwards).

## Multi-Tenant Architecture

If you are building a SaaS product where many of your customers each connect their own Meta Ads account through **your** Wiro-powered backend, here is the recommended shape:

1. **One Meta Developer App** per Wiro-integrating product, not per customer. The same `appId`/`appSecret` pair can serve unlimited customers.
2. **One Wiro agent instance per customer.** Call `POST /UserAgent/Deploy` every time a new customer signs up, then follow Steps 7–11 of the walkthrough above for that customer's `userAgentGuid`.
3. **Wiro tokens are isolated per agent instance.** Customer A's Meta token is never visible to Customer B — they live under different `useragentguid`s.
4. **Your consent screen carries your branding.** Users see *your* App display name on Facebook's consent screen, not "Wiro". Keep the display name clean and trustworthy — Meta occasionally flags apps with generic names.
5. **Add each customer to App Roles → Testers** until you go Live Mode. This is a manual step today; automate it by having customers submit their Facebook user ID during onboarding and adding them via the Meta Business API or Roles UI.
6. **Rate limits are per app, not per customer.** The Marketing API's tier (Development vs Standard vs Advanced) governs aggregate call volume. High-volume partners should plan for tier upgrades; see Meta's [Rate Limiting](https://developers.facebook.com/docs/graph-api/overview/rate-limiting) docs.

## Related

- [Agent Credentials & OAuth](/docs/agent-credentials) — overview of all integration options.
- [Agent Overview](/docs/agent-overview) — deploying, starting, and lifecycle of agents.
- [Agent Skills](/docs/agent-skills) — configuring the `metaads-manage` skill and scheduled runs.
- [Facebook Page integration](/docs/integration-facebook) — often used alongside Meta Ads for creatives that reference a page.
- [Instagram integration](/docs/integration-instagram) — for Instagram-placement ads and organic posting.
- [Meta for Developers — Marketing API](https://developers.facebook.com/docs/marketing-apis/) — official reference.


# Facebook Page Integration

Connect your agents to a Facebook Page so they can publish posts, photos, and videos on your behalf.

## Overview

The Facebook Page integration lets an agent act as an admin on a Page — publishing text, image, and video posts, reading engagement data, and managing scheduled content.

**Skills that use this integration:**

- `facebookpage-post` — Publish posts and media to a Facebook Page

**Agents that typically enable this integration:**

- Social Manager
- Any custom agent that needs to post to a Facebook Page

## Availability

| Mode | Status | Notes |
|------|--------|-------|
| `"wiro"` | Coming soon | Wiro's shared Meta App is under review by Meta. |
| `"own"` | Available now | Use your own Meta Developer App in Development Mode — no App Review required. |

> **Why own mode only right now?** Meta's approval for apps that request Page publishing permissions is strict. While Wiro's shared app is pending, own mode with your own Meta App is the immediate path. Every user who connects must be listed under your app's Roles — Development Mode handles permissions for them without App Review.

## Prerequisites

- **A Wiro API key** — see [Authentication](/docs/authentication).
- **A deployed agent** — see [Agent Overview](/docs/agent-overview), call `POST /UserAgent/Deploy` and keep the returned `useragentguid`.
- **A Meta Business account** — [business.facebook.com](https://business.facebook.com/).
- **A Meta Developer account** — [developers.facebook.com](https://developers.facebook.com/).
- **At least one Facebook Page where the end user is an admin** — the OAuth flow will list every Page the user administers.
- **An HTTPS callback URL** for your backend. `http://localhost` and `http://127.0.0.1` are allowed in development.

## Complete Integration Walkthrough

### Step 1: Create a Meta Developer App

Same as for Meta Ads — you can reuse a single Meta App for Facebook Page, Instagram, **and** Meta Ads.

1. Go to [developers.facebook.com/apps](https://developers.facebook.com/apps) and click **Create app**.
2. Choose **"Other"** → **"Business"**.
3. Enter an **App display name** (shown on the consent screen), an **App contact email**, and select your **Meta Business Account**.
4. Click **Create app**. Leave it in **Development Mode**.

### Step 2: Add "Facebook Login for Business"

1. From the app dashboard, click **Add product**.
2. Find **"Facebook Login for Business"** and click **Set up**.
3. Go to **Facebook Login for Business → Settings**.
4. Under **Valid OAuth Redirect URIs**, add:

   ```
   https://api.wiro.ai/v1/UserAgentOAuth/FBCallback
   ```

5. Click **Save changes**.

> The redirect URI must match **exactly** — HTTPS scheme, no trailing slash, exact case.

### Step 3: Note the required permissions

Wiro requests these scopes during OAuth:

| Permission | Why it is needed |
|------------|------------------|
| `pages_show_list` | Enumerate the Pages the user administers. |
| `pages_manage_posts` | Publish text, link, photo, and video posts to a Page. |
| `pages_read_engagement` | Read likes, comments, shares on the Page's posts. |
| `pages_manage_metadata` | Webhook subscriptions for real-time events. |
| `pages_manage_engagement` | Reply to comments, hide/delete comments. |
| `business_management` | Query business assets the user has access to. |

In Development Mode these permissions work without App Review for any Facebook user added to your app's Roles.

### Step 4: Copy your App ID and App Secret

Go to **App settings → Basic**. Copy the **App ID**, click **Show** next to **App Secret** and copy that too.

### Step 5: Add other Facebook accounts as Testers (only if needed)

- Connecting your own Facebook account? You are the app Admin, no action needed.
- Connecting a different account (e.g. a customer's)? Add them under **App Roles → Roles → Add People → Testers**. The user accepts at [facebook.com/settings → Business Integrations](https://www.facebook.com/settings?tab=business_tools).

### Step 6: Save your credentials to Wiro

Push the `appId` and `appSecret` into the agent's Facebook credential group. Wiro merges updates, so later OAuth tokens written by the callback will not overwrite these fields.

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Update" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "guid": "your-useragent-guid",
    "configuration": {
      "credentials": {
        "facebook": {
          "appId": "YOUR_META_APP_ID",
          "appSecret": "YOUR_META_APP_SECRET"
        }
      }
    }
  }'
```

### Step 7: Initiate OAuth

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/FBConnect" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "userAgentGuid": "your-useragent-guid",
    "redirectUrl": "https://your-app.com/settings/integrations",
    "authMethod": "own"
  }'
```

Response:

```json
{
  "result": true,
  "authorizeUrl": "https://www.facebook.com/v25.0/dialog/oauth?client_id=...&redirect_uri=...&scope=pages_show_list,pages_manage_posts,pages_read_engagement,pages_manage_metadata,pages_manage_engagement,business_management",
  "errors": []
}
```

Redirect the user's browser to `authorizeUrl`. The state has a **15-minute TTL** — if the user takes longer to finish consent, start over.

### Step 8: Handle the callback and select a Page

After consent, Wiro exchanges the code, fetches all Pages the user administers, caches them server-side, and redirects the user back to **your** `redirectUrl`.

**Success URL** looks like:

```
https://your-app.com/settings/integrations?fb_connected=true&fb_pagename=My%20Page&fb_pages=%5B%7B%22id%22%3A%22123%22%2C%22name%22%3A%22My%20Page%22%7D%2C%7B%22id%22%3A%22456%22%2C%22name%22%3A%22Another%20Page%22%7D%5D
```

Query parameters:

| Param | Meaning |
|-------|---------|
| `fb_connected=true` | OAuth finished successfully. |
| `fb_pagename` | Name of the Page Wiro auto-selected as default (the first Page returned by Meta). Kept for backward compatibility. |
| `fb_pages` | URL-encoded JSON array of **every** Page the user administers: `[{ id, name }, ...]`. Only the ID and display name are returned — page access tokens stay server-side. |

#### Decide how to handle the list

```javascript
const params = new URLSearchParams(window.location.search);

if (params.get("fb_connected") === "true") {
  const pages = JSON.parse(decodeURIComponent(params.get("fb_pages") || "[]"));

  if (pages.length === 0) {
    showError("This Facebook user does not administer any Pages.");
  } else if (pages.length === 1) {
    // Already selected server-side; you can optionally call FBSetPage
    // to confirm, but it's not required.
    showSuccess(`Connected to ${pages[0].name}`);
  } else {
    // Let the user choose
    presentPagePicker(pages);
  }
} else if (params.get("fb_error")) {
  handleError(params.get("fb_error"));
}
```

#### Persist the user's choice (multi-page case)

Wiro auto-picks the first Page as a default, but if the user manages multiple Pages and picks a different one, call `FBSetPage`:

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/FBSetPage" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "userAgentGuid": "your-useragent-guid",
    "pageId": "456",
    "pageName": "Another Page"
  }'
```

Response:

```json
{ "result": true, "errors": [] }
```

Behind the scenes Wiro looks up the page-specific access token in its short-term cache (15-minute TTL from the callback), writes it to the agent's config, and restarts the agent if it was already running. Wait too long (>15 min) and you will get an error — restart OAuth from Step 7.

### Step 9: Verify the connection

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/FBStatus" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "userAgentGuid": "your-useragent-guid" }'
```

```json
{
  "result": true,
  "connected": true,
  "username": "My Page",
  "connectedAt": "2026-04-17T12:00:00.000Z",
  "tokenExpiresAt": "2026-06-16T12:00:00.000Z",
  "errors": []
}
```

### Step 10: Start the agent if it is not running

If this is a new agent, it may still be in Stopped state:

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Start" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "guid": "your-useragent-guid" }'
```

Agents already running at connect time restart automatically.

## API Reference

### **POST** /UserAgentOAuth/FBConnect

Initiate the Facebook Page OAuth flow.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userAgentGuid` | string | Yes | Agent instance GUID. |
| `redirectUrl` | string | Yes | HTTPS URL where the user is returned after consent. |
| `authMethod` | string | No | `"wiro"` (default) or `"own"`. Use `"own"` while the shared app is pending. |

Response: `{ result, authorizeUrl, errors }`.

### **GET** /UserAgentOAuth/FBCallback

Server-side callback. Wiro returns users to your `redirectUrl` with:

| Param | Meaning |
|-------|---------|
| `fb_connected=true` | Success. |
| `fb_pagename` | Auto-selected Page name (backward compat). |
| `fb_pages` | URL-encoded JSON `[{ id, name }, ...]` of all admin Pages. |
| `fb_error=<code>` | Failure. See [Troubleshooting](#troubleshooting). |

### **POST** /UserAgentOAuth/FBSetPage

Choose which Facebook Page the agent should operate against (when the user administers more than one).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userAgentGuid` | string | Yes | Agent instance GUID. |
| `pageId` | string | Yes | Page ID copied from `fb_pages`. |
| `pageName` | string | No | Display name to show in dashboards. If omitted, Wiro uses the name from the cached page list. |

Response: `{ result, errors }`. Agent restarts automatically if it was running.

> **Cache window:** Wiro caches the full page list (with page access tokens) for 15 minutes after the callback. Call `FBSetPage` within that window. If the cache expires, restart the OAuth flow from `FBConnect`.

### **POST** /UserAgentOAuth/FBStatus

Check the current Facebook Page connection state.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userAgentGuid` | string | Yes | Agent instance GUID. |

Response fields include `connected`, `username` (Page name), `connectedAt`, `tokenExpiresAt`.

### **POST** /UserAgentOAuth/FBDisconnect

Revoke the Facebook token and clear credentials.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userAgentGuid` | string | Yes | Agent instance GUID. |

Response: `{ result: true, errors: [] }`. Agent restarts automatically.

### **POST** /UserAgentOAuth/TokenRefresh

Force-refresh the long-lived page token. Wiro auto-refreshes before expiry.

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/TokenRefresh" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "userAgentGuid": "your-useragent-guid",
    "provider": "facebook"
  }'
```

## Using the Skill

Once Facebook is connected, enable `facebookpage-post` in the agent's skills and optionally schedule runs — see [Agent Skills](/docs/agent-skills#enabling-skills).

```json
{
  "guid": "your-useragent-guid",
  "configuration": {
    "custom_skills": [
      {
        "key": "daily-announcement",
        "enabled": true,
        "interval": "0 9 * * *",
        "value": "Share a highlight from yesterday's product updates"
      }
    ]
  }
}
```

## Troubleshooting

| Error code | Meaning | What to do |
|------------|---------|------------|
| `missing_params` | Callback reached without `state` or `code`. | Start a fresh OAuth flow from Step 7. |
| `session_expired` | More than 15 minutes passed between `FBConnect` and the user finishing consent. | Re-run `FBConnect`. |
| `authorization_denied` | User cancelled, or in Development Mode the user is not listed under App Roles. | Add the user as a Tester (Step 5), ask them to accept the invite, retry. |
| `token_exchange_failed` | Wrong App Secret or redirect URI mismatch. | Re-copy App Secret from **Settings → Basic**; verify the redirect URI in **Facebook Login for Business → Settings** is exactly `https://api.wiro.ai/v1/UserAgentOAuth/FBCallback`. |
| `useragent_not_found` | The `userAgentGuid` is wrong or not owned by this API key. | Use `POST /UserAgent/MyAgents` to find the right guid. |
| `invalid_config` | The agent has no `credentials.facebook` block. | Call `POST /UserAgent/Update` with `facebook.appId` and `facebook.appSecret`, retry. |
| `internal_error` | Unexpected server error. | Retry once; if it persists, contact support. |

### "No pending page selection" error on FBSetPage

The page list cache expired. The cache keeps page-specific access tokens for 15 minutes after a successful callback. If the user takes longer to pick a page, restart the OAuth flow from `FBConnect`. The default (first) page stays usable in the meantime — no configuration is lost, you just cannot switch pages from a cold state.

### User administers multiple Pages but only one was returned

Meta only returns Pages where the user currently holds an admin or editor role in **Meta Business Suite**. Recently created Pages can take up to ~30 minutes to show up in OAuth — ask the user to retry after refreshing their Business Suite session.

### "App not verified" banner on consent

Expected in Development Mode. Users added to App Roles can click **Continue**; other users are blocked entirely.

### Page posts succeed but show the wrong page author

Wiro uses the **page access token**, not the user token, so posts appear as the Page. If they show a personal account name, your `FBSetPage` call is using a `pageId` that was not in the last callback's list — start a new OAuth flow and select again.

## Multi-Tenant Architecture

For SaaS builders connecting many customers' Pages through a single Wiro-powered backend:

1. **One Meta Developer App** serves all customers. The same `appId`/`appSecret` pair works across every Wiro agent instance.
2. **One Wiro agent instance per customer** — deploy with `POST /UserAgent/Deploy` during onboarding.
3. **Page tokens are isolated per agent instance.** Customer A's Page token is never visible to Customer B; they live under different `useragentguid`s.
4. **Your consent screen carries your branding.** The customer sees *your* App display name on Facebook's consent screen — not "Wiro".
5. **Each customer must be on App Roles** until you go Live Mode. Collect their Facebook user ID during signup and add them as Testers via the Meta Business API or the Roles UI.
6. **Page admin rights must be verified on your side.** Meta returns only Pages where the user is currently an admin. If your customer lost admin access after signing up, your agent will error — build a revalidation loop that runs `FBStatus` periodically and flags stale connections.

## Related

- [Agent Credentials & OAuth](/docs/agent-credentials)
- [Agent Overview](/docs/agent-overview)
- [Agent Skills](/docs/agent-skills)
- [Meta Ads integration](/docs/integration-metaads)
- [Instagram integration](/docs/integration-instagram)
- [Meta for Developers — Pages API](https://developers.facebook.com/docs/pages-api)


# Instagram Integration

Connect your agents to an Instagram Business Account so they can publish posts, reels, stories, and carousels.

## Overview

The Instagram integration lets an agent publish content to an Instagram Business or Creator account via Meta's Instagram Graph API.

**Skills that use this integration:**

- `instagram-post` — Publish photos, videos, reels, carousels, and stories

**Agents that typically enable this integration:**

- Social Manager
- Any custom agent that needs Instagram publishing

## Availability

| Mode | Status | Notes |
|------|--------|-------|
| `"wiro"` | Coming soon | Wiro's shared Meta App is under review. |
| `"own"` | Available now | Use your own Meta Developer App in Development Mode — no App Review required. |

## Prerequisites

- **A Wiro API key** — see [Authentication](/docs/authentication).
- **A deployed agent** — see [Agent Overview](/docs/agent-overview), keep the `useragentguid`.
- **A Meta Business account** — [business.facebook.com](https://business.facebook.com/).
- **A Meta Developer account** — [developers.facebook.com](https://developers.facebook.com/).
- **Instagram Business Account linked to a Facebook Page.** This is **mandatory** — personal Instagram accounts cannot be connected via the Graph API.
- **An HTTPS callback URL** for your backend.

### Linking an Instagram account to a Facebook Page

If your Instagram account is not yet connected to a Facebook Page:

1. Open [Meta Business Suite](https://business.facebook.com/) and select the Page that will own this Instagram account.
2. Go to **Settings → Linked accounts → Instagram → Connect account**.
3. Sign in with the Instagram account. Grant manage permissions.
4. Back in Instagram mobile app, go to **Settings → Account → Switch to Professional Account** if the account is still Personal. Pick **Business** or **Creator**.
5. Under **Settings → Business tools → Connected Accounts → Facebook**, confirm the Page link.

Until both the Instagram Business switch and the Facebook Page link are complete, the Graph API will not return this Instagram account during OAuth.

## Complete Integration Walkthrough

### Step 1: Create a Meta Developer App

Same Meta App you already use for Facebook Page or Meta Ads works here — one app can serve all three integrations. If you do not have one yet:

1. [developers.facebook.com/apps](https://developers.facebook.com/apps) → **Create app** → **Other** → **Business**.
2. App display name, contact email, Business Account.
3. Create. Leave in **Development Mode**.

### Step 2: Add the "Instagram" product

1. From the app dashboard, click **Add product**.
2. Find **"Instagram"** (not "Instagram Basic Display" — that one is for personal accounts only and is being deprecated).
3. Click **Set up**.
4. You may be prompted to confirm the Instagram-for-Business use case.

### Step 3: Configure the OAuth redirect URI

1. In the left sidebar: **Instagram → API setup with Instagram login**.
2. Scroll to **Business login settings** and then **OAuth settings**.
3. Under **Valid OAuth Redirect URIs** add:

   ```
   https://api.wiro.ai/v1/UserAgentOAuth/IGCallback
   ```

4. Click **Save changes**.

> Unlike Facebook Page, Instagram OAuth uses its own authorize URL at `instagram.com/oauth/authorize` — but the redirect URI is still registered inside the Meta Developer App UI.

### Step 4: Note the required permissions

Wiro requests these Instagram-specific and Page-adjacent scopes:

| Permission | Why it is needed |
|------------|------------------|
| `instagram_business_basic` | Basic account info, profile data. |
| `instagram_business_content_publish` | Publish posts, reels, stories, carousels. |
| `instagram_business_manage_messages` | Read and reply to DMs (if enabled). |
| `instagram_business_manage_comments` | Read, reply to, and moderate comments. |
| `pages_show_list` | Required companion scope to locate the linked Facebook Page. |
| `pages_read_engagement` | Read engagement on the linked Page's posts. |
| `business_management` | Query business assets. |

In Development Mode these scopes work without App Review for Facebook users added under App Roles.

### Step 5: Copy your App ID and App Secret

**App settings → Basic** → copy App ID; **Show** → copy App Secret.

### Step 6: Add other Facebook accounts as Testers (only if needed)

If the person connecting Instagram is not the app's Admin, add them under **App Roles → Roles → Add People → Testers**. The user accepts the invite at [facebook.com/settings → Business Integrations](https://www.facebook.com/settings?tab=business_tools). Note that the Facebook account they use for App Roles must be the same one linked to the Instagram Business Account via Meta Business Suite.

### Step 7: Save credentials to Wiro

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Update" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "guid": "your-useragent-guid",
    "configuration": {
      "credentials": {
        "instagram": {
          "appId": "YOUR_META_APP_ID",
          "appSecret": "YOUR_META_APP_SECRET"
        }
      }
    }
  }'
```

Wiro merges credential updates — `accessToken` and other fields written later by the OAuth callback will not wipe `appId`/`appSecret`.

### Step 8: Initiate OAuth

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/IGConnect" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "userAgentGuid": "your-useragent-guid",
    "redirectUrl": "https://your-app.com/settings/integrations",
    "authMethod": "own"
  }'
```

Response:

```json
{
  "result": true,
  "authorizeUrl": "https://www.instagram.com/oauth/authorize?client_id=...&redirect_uri=...&scope=instagram_business_basic,instagram_business_content_publish,...",
  "errors": []
}
```

Redirect the user to `authorizeUrl`. State has a 15-minute TTL.

### Step 9: Handle the callback

After consent, Wiro exchanges the code for a short-lived token, upgrades it to a long-lived token, fetches the linked Instagram Business Account ID, saves it, and redirects the user back.

**Success URL** looks like:

```
https://your-app.com/settings/integrations?ig_connected=true&ig_username=my_brand
```

Parse:

```javascript
const params = new URLSearchParams(window.location.search);

if (params.get("ig_connected") === "true") {
  const username = params.get("ig_username");
  showSuccess(`Connected to @${username}`);
} else if (params.get("ig_error")) {
  handleError(params.get("ig_error"));
}
```

Instagram has no secondary selection step (unlike Meta Ads' ad account or Facebook's page picker) — the Instagram Business Account tied to the chosen Facebook Page is used directly.

### Step 10: Verify the connection

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/IGStatus" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "userAgentGuid": "your-useragent-guid" }'
```

```json
{
  "result": true,
  "connected": true,
  "username": "my_brand",
  "connectedAt": "2026-04-17T12:00:00.000Z",
  "tokenExpiresAt": "2026-06-16T12:00:00.000Z",
  "errors": []
}
```

### Step 11: Start the agent if it is not running

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Start" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "guid": "your-useragent-guid" }'
```

Already-running agents restart automatically.

## API Reference

### **POST** /UserAgentOAuth/IGConnect

Start the Instagram OAuth flow.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userAgentGuid` | string | Yes | Agent instance GUID. |
| `redirectUrl` | string | Yes | HTTPS URL where the user returns after consent. |
| `authMethod` | string | No | `"wiro"` (default) or `"own"`. Use `"own"` while the shared app is pending. |

Response: `{ result, authorizeUrl, errors }`.

### **GET** /UserAgentOAuth/IGCallback

Server-side callback. Wiro returns users to your `redirectUrl` with:

| Param | Meaning |
|-------|---------|
| `ig_connected=true` | OAuth succeeded. |
| `ig_username` | Connected Instagram username (without the `@`). |
| `ig_error=<code>` | Failure. See [Troubleshooting](#troubleshooting). |

### **POST** /UserAgentOAuth/IGStatus

Check the current connection state.

Response fields: `connected`, `username`, `connectedAt`, `tokenExpiresAt`.

### **POST** /UserAgentOAuth/IGDisconnect

Revoke and clear Instagram credentials.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userAgentGuid` | string | Yes | Agent instance GUID. |

### **POST** /UserAgentOAuth/TokenRefresh

Force-refresh the Instagram long-lived token.

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/TokenRefresh" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "userAgentGuid": "your-useragent-guid",
    "provider": "instagram"
  }'
```

Instagram long-lived tokens last ~60 days and auto-refresh; manual refresh is rarely needed.

## Using the Skill

Enable `instagram-post` in the agent's skills and optionally schedule runs — see [Agent Skills](/docs/agent-skills).

```json
{
  "guid": "your-useragent-guid",
  "configuration": {
    "custom_skills": [
      {
        "key": "daily-reel",
        "enabled": true,
        "interval": "0 10 * * *",
        "value": "Publish a reel highlighting today's most engaging story arc"
      }
    ]
  }
}
```

## Troubleshooting

| Error code | Meaning | What to do |
|------------|---------|------------|
| `missing_params` | Callback hit without `state` or `code`. | Start a new OAuth flow from Step 8. |
| `session_expired` | >15 minutes between `IGConnect` and callback. | Call `IGConnect` again. |
| `authorization_denied` | User cancelled, or in Development Mode the user is not in App Roles. | Add the user as a Tester (Step 6), get them to accept, retry. |
| `token_exchange_failed` | Wrong App Secret, redirect URI mismatch, or no linked Instagram Business Account. | Verify App Secret, redirect URI, and that the Facebook Page linked to Instagram is the one the user administers. |
| `useragent_not_found` | Invalid or unauthorized `userAgentGuid`. | Use `POST /UserAgent/MyAgents` to find the correct guid. |
| `invalid_config` | No `credentials.instagram` block on the agent. | `POST /UserAgent/Update` with `instagram.appId` and `instagram.appSecret`, retry. |
| `internal_error` | Unexpected server error. | Retry once. If persistent, contact support. |

### "No Instagram Business Account found" during OAuth

The user must have an Instagram **Business** or **Creator** account linked to a Facebook Page they administer. Personal Instagram accounts are rejected.

Checklist for the user:

1. Open Instagram mobile app → **Settings → Account → Switch to Professional Account**. Pick **Business** or **Creator**.
2. Meta Business Suite → Target Page → **Settings → Linked accounts → Instagram → Connect**.
3. The same Facebook user who is in your app's Roles must be an admin of the Page that is linked to the Instagram account.

### "App not verified" banner

Expected in Development Mode. Users added to App Roles can click **Continue** and finish authorization.

### Publishing fails with "media upload failed"

Common causes:

- Image resolution too low (<320px) or aspect ratio outside Instagram's allowed ranges.
- Videos longer than allowed for the content type (reels, stories, posts each have their own limits).
- Instagram account switched back to Personal after connection — the token becomes invalid. Ask the user to revert to Business and reconnect.

## Multi-Tenant Architecture

1. **One Meta Developer App** for all customers; same app also covers Meta Ads and Facebook Page if needed.
2. **One Wiro agent instance per customer.**
3. **Each customer's Facebook user must be added to App Roles** until you go Live Mode. Onboarding flow should capture their Facebook user ID.
4. **Instagram Business Account requirement is strict** — build pre-flight validation into your onboarding to catch personal-account users before they see Wiro's Connect button. The Meta Graph API returns an `instagram_business_account` field on the Page object only when the link is set up correctly; surface a clear error otherwise.
5. **Tokens are isolated per agent instance.** Customer A's Instagram token is never visible to Customer B.

## Related

- [Agent Credentials & OAuth](/docs/agent-credentials)
- [Agent Overview](/docs/agent-overview)
- [Agent Skills](/docs/agent-skills)
- [Facebook Page integration](/docs/integration-facebook) — the Facebook Page linkage is mandatory.
- [Meta Ads integration](/docs/integration-metaads) — for Instagram-placement ads.
- [Meta for Developers — Instagram Graph API](https://developers.facebook.com/docs/instagram-api)


# LinkedIn Integration

Connect your agents to a LinkedIn Company Page so they can publish posts, articles, and engage with followers.

## Overview

The LinkedIn integration lets an agent publish content to a LinkedIn organization (Company Page) via the LinkedIn Marketing Developer Platform.

**Skills that use this integration:**

- `linkedin-post` — Publish text, image, and video posts to a Company Page

**Agents that typically enable this integration:**

- Social Manager
- Any custom agent that needs LinkedIn Company Page publishing

## Availability

| Mode | Status | Notes |
|------|--------|-------|
| `"wiro"` | Coming soon | LinkedIn partner app review is in progress. |
| `"own"` | Available now | Create your own LinkedIn Developer App and connect it to Wiro. |

## Prerequisites

- **A Wiro API key** — see [Authentication](/docs/authentication).
- **A deployed agent** — see [Agent Overview](/docs/agent-overview), keep the returned `useragentguid`.
- **A LinkedIn Company Page** that the connecting user is an **admin** of — personal profiles cannot be managed through this integration.
- **The LinkedIn organization ID** (numeric) — find it by visiting your Company Page on LinkedIn; the URL contains the organization identifier (e.g. `linkedin.com/company/12345678/admin/`).
- **An HTTPS callback URL** for your backend.

## Complete Integration Walkthrough

### Step 1: Create a LinkedIn Developer App

1. Go to [linkedin.com/developers/apps](https://www.linkedin.com/developers/apps) and click **Create app**.
2. Fill in:
   - **App name** (shown on consent screen — use a clean, trusted name).
   - **LinkedIn Page** — associate the app with a LinkedIn Company Page you own.
   - **Privacy policy URL**.
   - **App logo** (128×128 PNG).
3. Agree to the Legal terms and click **Create app**.

### Step 2: Request the necessary products

Inside your app, go to the **Products** tab. Request:

- **Share on LinkedIn** — posting to members' personal feeds (optional, only if your agent also posts as the user).
- **Sign In with LinkedIn using OpenID Connect** — basic identity scope.
- **Community Management API** — **required** for Company Page posting.

The **Community Management API** request goes through a manual approval step. While the request is pending, your app can still be used in development; once approved, production volume is unlocked. Development-scope access for a small number of test admins is available from day one.

### Step 3: Configure the OAuth redirect URI

1. Open the **Auth** tab in your app.
2. Under **OAuth 2.0 settings → Authorized redirect URLs for your app**, add:

   ```
   https://api.wiro.ai/v1/UserAgentOAuth/LICallback
   ```

3. Save. The URL must match exactly — HTTPS, no trailing slash.

### Step 4: Note the required scopes

Wiro requests the following OAuth 2.0 scopes:

| Scope | Why it is needed |
|-------|------------------|
| `openid` | OpenID Connect basic identity. |
| `profile` | Display name, headline, and profile picture on the consent screen. |
| `email` | Connected user's email address (used to confirm identity). |
| `w_member_social` | Post to the member's own feed (some agent flows use this). |
| `w_organization_social` | Post, comment, and reply on behalf of the Company Page. |
| `r_organization_social` | Read Company Page posts, comments, and analytics. |
| `rw_organization_admin` | Manage Company Page details (required for some posting endpoints). |

Mark the scopes your agent uses in **Auth → OAuth 2.0 scopes**. Any scope not enabled in this list will fail at the consent screen.

### Step 5: Copy your Client ID and Client Secret

1. Go to the **Auth** tab.
2. Under **Application credentials**, copy the **Client ID**.
3. Copy the **Primary Client Secret** — it is shown in plain text on this page. Store it like a password.

### Step 6: Save your credentials and organization ID to Wiro

LinkedIn requires the organization ID alongside the OAuth credentials. Pass all three in one `UserAgent/Update` call:

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Update" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "guid": "your-useragent-guid",
    "configuration": {
      "credentials": {
        "linkedin": {
          "clientId": "YOUR_LINKEDIN_CLIENT_ID",
          "clientSecret": "YOUR_LINKEDIN_CLIENT_SECRET",
          "organizationId": "12345678"
        }
      }
    }
  }'
```

### Step 7: Initiate OAuth

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/LIConnect" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "userAgentGuid": "your-useragent-guid",
    "redirectUrl": "https://your-app.com/settings/integrations",
    "authMethod": "own"
  }'
```

Response:

```json
{
  "result": true,
  "authorizeUrl": "https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=...&redirect_uri=...&scope=openid%20profile%20email%20w_member_social%20w_organization_social%20r_organization_social%20rw_organization_admin&state=...",
  "errors": []
}
```

Redirect the end user's browser to `authorizeUrl`. State has a 15-minute TTL.

### Step 8: Handle the callback

After consent, LinkedIn redirects to Wiro's callback, Wiro exchanges the code for access and refresh tokens, stores them, and sends the user back to your `redirectUrl`:

```
https://your-app.com/settings/integrations?li_connected=true&li_name=Jane%20Doe
```

Parse:

```javascript
const params = new URLSearchParams(window.location.search);

if (params.get("li_connected") === "true") {
  const name = params.get("li_name");
  showSuccess(`Connected as ${name}`);
} else if (params.get("li_error")) {
  handleError(params.get("li_error"));
}
```

`li_name` is the connected LinkedIn member's display name (the human admin), not the organization name. Use the `organizationId` you set in Step 6 for posting destination — that's the Company Page.

### Step 9: Verify the connection

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/LIStatus" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "userAgentGuid": "your-useragent-guid" }'
```

```json
{
  "result": true,
  "connected": true,
  "linkedinName": "Jane Doe",
  "connectedAt": "2026-04-17T12:00:00.000Z",
  "tokenExpiresAt": "2026-06-16T12:00:00.000Z",
  "refreshTokenExpiresAt": "2027-04-17T12:00:00.000Z",
  "errors": []
}
```

Note that LinkedIn uses `linkedinName` rather than `username`. Access tokens last ~60 days; refresh tokens last ~1 year.

### Step 10: Start the agent if it is not running

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Start" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "guid": "your-useragent-guid" }'
```

## API Reference

### **POST** /UserAgentOAuth/LIConnect

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userAgentGuid` | string | Yes | Agent instance GUID. |
| `redirectUrl` | string | Yes | HTTPS URL for post-OAuth return. |
| `authMethod` | string | No | `"wiro"` (coming soon) or `"own"`. |

### **GET** /UserAgentOAuth/LICallback

Query parameters appended to your `redirectUrl`:

| Param | Meaning |
|-------|---------|
| `li_connected=true` | Success. |
| `li_name` | Connected member's display name. |
| `li_error=<code>` | Failure. |

### **POST** /UserAgentOAuth/LIStatus

Response includes `connected`, `linkedinName`, `connectedAt`, `tokenExpiresAt`, `refreshTokenExpiresAt`.

### **POST** /UserAgentOAuth/LIDisconnect

Revoke the LinkedIn token and clear credentials.

### **POST** /UserAgentOAuth/TokenRefresh

Force-refresh using the refresh token.

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/TokenRefresh" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "userAgentGuid": "your-useragent-guid",
    "provider": "linkedin"
  }'
```

## Using the Skill

Enable `linkedin-post` on the agent — see [Agent Skills](/docs/agent-skills).

```json
{
  "guid": "your-useragent-guid",
  "configuration": {
    "custom_skills": [
      {
        "key": "weekly-announcement",
        "enabled": true,
        "interval": "0 10 * * 1",
        "value": "Publish a weekly company update highlighting last week's wins"
      }
    ]
  }
}
```

## Troubleshooting

| Error code | Meaning | What to do |
|------------|---------|------------|
| `missing_params` | Callback reached without `state` or `code`. | Restart the flow from Step 7. |
| `session_expired` | >15 minutes between `LIConnect` and callback. | Call `LIConnect` again. |
| `authorization_denied` | User cancelled, or missing required scopes in LinkedIn app settings. | Verify all scopes are enabled in Auth → OAuth 2.0 scopes, retry. |
| `token_exchange_failed` | Wrong Client Secret or redirect URI mismatch. | Re-copy secret; verify the redirect URI in Auth settings matches exactly. |
| `useragent_not_found` | Invalid or unauthorized `userAgentGuid`. | Use `POST /UserAgent/MyAgents`. |
| `invalid_config` | No `credentials.linkedin` block on the agent. | Update with `clientId`, `clientSecret`, `organizationId`. |
| `internal_error` | Unexpected server error. | Retry; contact support if persistent. |

### Posts are rejected with 401 Unauthorized

Most common cause: the `Community Management API` product has not been approved yet. Until approval, posting to Company Pages only works for **admins listed on the app's associated LinkedIn Page**. Check **My Pages** inside LinkedIn Developers to confirm admin membership.

### "Scope `w_organization_social` not authorized"

LinkedIn does not automatically grant this scope on consent — you must request it explicitly under **Auth → OAuth 2.0 scopes**. Enable it, then have the user reconnect.

### Wrong organization ID

The numeric organization ID lives in your Company Page's admin URL (`linkedin.com/company/<ID>/admin/`). Not the vanity slug. If you saved the slug, update via `UserAgent/Update` and reconnect.

## Multi-Tenant Architecture

1. **One LinkedIn Developer App** per product; same app works for all customers.
2. **One Wiro agent instance per customer** — capture their `organizationId` during onboarding.
3. **Community Management API approval** is tied to your app, not per customer. You only apply once.
4. **Tokens are isolated per agent instance.**
5. **Rate limits** are per app and per organization — see [LinkedIn Developer docs](https://learn.microsoft.com/en-us/linkedin/shared/api-guide/concepts/rate-limits) for the exact caps. High-volume partners should contact LinkedIn partnership team for elevated limits.

## Related

- [Agent Credentials & OAuth](/docs/agent-credentials)
- [Agent Overview](/docs/agent-overview)
- [Agent Skills](/docs/agent-skills)
- [LinkedIn Marketing Developer Platform](https://learn.microsoft.com/en-us/linkedin/marketing/)


# Twitter / X Integration

Connect your agents to an X (formerly Twitter) account so they can publish posts, reply to mentions, and manage conversations.

## Overview

The Twitter / X integration lets an agent act on behalf of an X account via X's API v2 with OAuth 2.0 PKCE.

**Skills that use this integration:**

- `twitterx-post` — Publish posts, threads, replies; read mentions

**Agents that typically enable this integration:**

- Social Manager
- Any custom agent that needs X posting

## Availability

| Mode | Status | Notes |
|------|--------|-------|
| `"wiro"` | Available | One-click connect using Wiro's shared X app. |
| `"own"` | Available | Use your own X Developer app, e.g. for custom branding on the consent screen. |

## Prerequisites

- **A Wiro API key** — see [Authentication](/docs/authentication).
- **A deployed agent** — see [Agent Overview](/docs/agent-overview), keep the `useragentguid`.
- **An X account** for the connecting user.
- **(Own mode only) An X Developer account** — sign up at [developer.x.com](https://developer.x.com/).
- **An HTTPS callback URL** for your backend.

## Complete Integration Walkthrough — Wiro Mode

The simplest path. Skip to Step 3 below.

### Wiro mode Step 1: Initiate OAuth

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/XConnect" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "userAgentGuid": "your-useragent-guid",
    "redirectUrl": "https://your-app.com/settings/integrations"
  }'
```

Response contains `authorizeUrl`. Redirect the user; they see Wiro-branded consent. Upon return, parse `x_connected=true&x_username=<handle>`.

Go to Step 5 (verification) to confirm — Steps 1–4 below are only for own mode.

## Complete Integration Walkthrough — Own Mode

### Step 1: Create an X Developer App

1. Go to [developer.x.com/portal](https://developer.x.com/portal/dashboard) and sign in.
2. Apply for a developer account if you have not already (free tier is sufficient for small test volumes; higher tiers unlock larger monthly post caps).
3. Create a **Project** and, inside it, an **App**.
4. Name your app — this is the name shown on the consent screen.

### Step 2: Enable OAuth 2.0 with PKCE

1. Inside the app, go to **User authentication settings → Set up**.
2. Choose **OAuth 2.0**, type of app: **Web App, Automated App or Bot**.
3. Enable **Request email from users** if your agent needs the email address.
4. Set **Callback URI / Redirect URL**:

   ```
   https://api.wiro.ai/v1/UserAgentOAuth/XCallback
   ```

5. Set **Website URL** (your public product URL).
6. Save.

### Step 3: Note the required scopes

Wiro requests:

| Scope | Why |
|-------|-----|
| `tweet.read` | Read timeline, mentions, replies. |
| `tweet.write` | Publish posts and replies. |
| `users.read` | Get the connected user's handle and display name. |
| `offline.access` | Enables refresh tokens. |

### Step 4: Copy your Client ID and Client Secret

After enabling OAuth 2.0, X shows the **Client ID** and **Client Secret** once. **Save the secret immediately** — you cannot retrieve it later; you can only regenerate.

### Step 5: Save credentials to Wiro

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Update" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "guid": "your-useragent-guid",
    "configuration": {
      "credentials": {
        "twitter": {
          "clientId": "YOUR_X_CLIENT_ID",
          "clientSecret": "YOUR_X_CLIENT_SECRET"
        }
      }
    }
  }'
```

### Step 6: Initiate OAuth

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/XConnect" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "userAgentGuid": "your-useragent-guid",
    "redirectUrl": "https://your-app.com/settings/integrations",
    "authMethod": "own"
  }'
```

Response:

```json
{
  "result": true,
  "authorizeUrl": "https://x.com/i/oauth2/authorize?response_type=code&client_id=...&redirect_uri=...&scope=tweet.read+tweet.write+users.read+offline.access&state=...&code_challenge=...&code_challenge_method=S256",
  "errors": []
}
```

X uses PKCE (Proof Key for Code Exchange) — Wiro generates the code verifier/challenge automatically. You do not need to handle PKCE yourself.

### Step 7: Handle the callback

After consent, the user returns to your `redirectUrl` with:

```
https://your-app.com/settings/integrations?x_connected=true&x_username=jane_doe
```

```javascript
const params = new URLSearchParams(window.location.search);
if (params.get("x_connected") === "true") {
  const handle = params.get("x_username");
  showSuccess(`Connected @${handle}`);
} else if (params.get("x_error")) {
  handleError(params.get("x_error"));
}
```

### Step 8: Verify the connection

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/XStatus" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "userAgentGuid": "your-useragent-guid" }'
```

### Step 9: Start the agent

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Start" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "guid": "your-useragent-guid" }'
```

## API Reference

### **POST** /UserAgentOAuth/XConnect

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userAgentGuid` | string | Yes | Agent instance GUID. |
| `redirectUrl` | string | Yes | HTTPS URL. |
| `authMethod` | string | No | `"wiro"` (default) or `"own"`. |

### **GET** /UserAgentOAuth/XCallback

Callback params appended to your `redirectUrl`: `x_connected=true&x_username=<handle>` on success, `x_error=<code>` on failure.

### **POST** /UserAgentOAuth/XStatus / XDisconnect

Standard shape — see [Agent Credentials & OAuth](/docs/agent-credentials#generic-oauth-endpoints).

### **POST** /UserAgentOAuth/TokenRefresh

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/TokenRefresh" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "userAgentGuid": "your-useragent-guid", "provider": "twitter" }'
```

## Using the Skill

Enable `twitterx-post`. Configure schedule via `custom_skills`.

## Troubleshooting

| Error code | Meaning | What to do |
|------------|---------|------------|
| `authorization_denied` | User cancelled, or OAuth 2.0 is not enabled in app settings. | Verify OAuth 2.0 setup (Step 2); retry. |
| `session_expired` | 15-minute state cache expired. | Call `XConnect` again. |
| `token_exchange_failed` | Wrong Client Secret (own mode), redirect URI mismatch, or PKCE verifier lost. | Re-copy Client Secret; verify redirect URI; start over. |
| `useragent_not_found` | Invalid `userAgentGuid`. | Find with `POST /UserAgent/MyAgents`. |
| `invalid_config` | No `credentials.twitter` on the agent. | `UserAgent/Update` with `clientId` + `clientSecret` (own mode). |
| `internal_error` | Server error. | Retry; contact support. |

### Posts fail with 403 or 429

Rate limits kick in quickly on free-tier X Developer apps. For production, move to **Basic** ($100/month) or higher. Rate limits are per app, not per user — high-volume multi-tenant partners need a higher tier.

## Multi-Tenant Architecture

1. One X Developer app per product in own mode; Wiro-mode partners share Wiro's app.
2. One Wiro agent instance per customer.
3. Your app display name appears on every customer's consent screen in own mode.
4. X imposes per-app limits on tweet writes. Plan tier choice around expected aggregate volume.

## Related

- [Agent Credentials & OAuth](/docs/agent-credentials)
- [Agent Overview](/docs/agent-overview)
- [Agent Skills](/docs/agent-skills)
- [X Developer Platform](https://developer.x.com/)


# TikTok Integration

Connect your agents to a TikTok account so they can publish videos and posts.

## Overview

The TikTok integration lets an agent publish content to a TikTok account through the TikTok Content Posting API.

**Skills that use this integration:**

- `tiktok-post` — Publish videos to TikTok

**Agents that typically enable this integration:**

- Social Manager
- Any custom agent that needs TikTok publishing

## Availability

| Mode | Status | Notes |
|------|--------|-------|
| `"wiro"` | Available | One-click connect using Wiro's shared TikTok app. |
| `"own"` | Available | Use your own TikTok for Developers app for custom branding. |

## Prerequisites

- **A Wiro API key** — see [Authentication](/docs/authentication).
- **A deployed agent** — see [Agent Overview](/docs/agent-overview).
- **A TikTok account** the connecting user controls.
- **(Own mode only) A TikTok for Developers account** — [developers.tiktok.com](https://developers.tiktok.com/).
- **An HTTPS callback URL**.

## Complete Integration Walkthrough — Wiro Mode

Call `TikTokConnect` with no `authMethod` (defaults to `"wiro"`), redirect the user, read `tiktok_connected=true&tiktok_username=<handle>` on return.

## Complete Integration Walkthrough — Own Mode

### Step 1: Create a TikTok for Developers App

1. Go to [developers.tiktok.com/apps](https://developers.tiktok.com/apps) and sign in.
2. Click **Create app**.
3. Fill in **App name**, **Category**, **Description**, **Icon**.

### Step 2: Add the Content Posting API scope

1. In the app dashboard, go to **Add products**.
2. Add **Login Kit** and **Content Posting API**.
3. For **Content Posting API**, request the scopes you need:
   - `video.upload` (direct post) or `video.publish` (user finalizes in TikTok app).

### Step 3: Configure redirect URI

1. Under **Login Kit → Platforms → Web**, add the callback URL:

   ```
   https://api.wiro.ai/v1/UserAgentOAuth/TikTokCallback
   ```

2. Save.

### Step 4: Note the required scopes

| Scope | Why |
|-------|-----|
| `user.info.basic` | User handle, avatar, display name. |
| `video.upload` or `video.publish` | Publish video content. |
| `video.list` | Read the user's recent posts. |

### Step 5: Copy Client Key and Client Secret

In **App details**, copy the **Client Key** and **Client Secret**. TikTok calls them "key" not "ID" — note the field names for `UserAgent/Update`.

### Step 6: Save credentials

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Update" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "guid": "your-useragent-guid",
    "configuration": {
      "credentials": {
        "tiktok": {
          "clientKey": "YOUR_TIKTOK_CLIENT_KEY",
          "clientSecret": "YOUR_TIKTOK_CLIENT_SECRET"
        }
      }
    }
  }'
```

### Step 7: Initiate OAuth

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/TikTokConnect" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "userAgentGuid": "your-useragent-guid",
    "redirectUrl": "https://your-app.com/settings/integrations",
    "authMethod": "own"
  }'
```

### Step 8: Handle callback

Success: `?tiktok_connected=true&tiktok_username=<handle>`. Error: `?tiktok_error=<code>`.

### Step 9: Verify + Start

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/TikTokStatus" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "userAgentGuid": "your-useragent-guid" }'
```

## API Reference

### **POST** /UserAgentOAuth/TikTokConnect

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userAgentGuid` | string | Yes | Agent instance GUID. |
| `redirectUrl` | string | Yes | HTTPS URL. |
| `authMethod` | string | No | `"wiro"` (default) or `"own"`. |

### **GET** /UserAgentOAuth/TikTokCallback

Callback params: `tiktok_connected=true&tiktok_username=<handle>` or `tiktok_error=<code>`.

### **POST** /UserAgentOAuth/TikTokStatus / TikTokDisconnect

Standard shape.

### **POST** /UserAgentOAuth/TokenRefresh

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/TokenRefresh" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "userAgentGuid": "your-useragent-guid", "provider": "tiktok" }'
```

## Troubleshooting

| Error code | Meaning | What to do |
|------------|---------|------------|
| `authorization_denied` | User cancelled, or scopes not enabled in app. | Verify scope configuration; retry. |
| `session_expired` | State cache expired. | Restart OAuth. |
| `token_exchange_failed` | Wrong Client Secret or redirect URI mismatch. | Re-copy Client Secret; verify redirect URI. |
| `useragent_not_found` | Invalid `userAgentGuid`. | Use `POST /UserAgent/MyAgents`. |
| `invalid_config` | No `credentials.tiktok` on the agent. | Update with `clientKey` + `clientSecret`. |
| `internal_error` | Server error. | Retry; contact support. |

### "unaudited_client" warning

Until your app is audited by TikTok, publishing may be limited to private posts or to the app's listed test users. Submit for audit in the TikTok Developer portal for production readiness.

## Multi-Tenant Architecture

1. One TikTok app per product in own mode.
2. One Wiro agent instance per customer.
3. TikTok per-app rate limits — see TikTok's platform docs.

## Related

- [Agent Credentials & OAuth](/docs/agent-credentials)
- [Agent Overview](/docs/agent-overview)
- [Agent Skills](/docs/agent-skills)
- [TikTok for Developers](https://developers.tiktok.com/)


# Google Ads Integration

Connect your agents to Google Ads for campaign management, keyword research, and ad copy optimization.

## Overview

The Google Ads integration lets an agent work with the Google Ads API — managing campaigns, ad groups, keywords, and reading performance data.

**Skills that use this integration:**

- `googleads-manage` — Campaign / ad group / keyword management, insights
- `ads-manager-common` — Shared ads helpers

**Agents that typically enable this integration:**

- Google Ads Manager
- Any custom agent that needs paid-search capabilities

## Availability

| Mode | Status | Notes |
|------|--------|-------|
| `"wiro"` | Available | One-click connect using Wiro's Google Cloud project. |
| `"own"` | Available | Use your own Google Cloud project, Developer Token, and MCC for full control. |

## Prerequisites

- **A Wiro API key** — see [Authentication](/docs/authentication).
- **A deployed agent** — see [Agent Overview](/docs/agent-overview).
- **A Google Ads account** (or MCC manager account) the connecting user administers.
- **(Own mode only) A Google Cloud project** with the Google Ads API enabled.
- **(Own mode only) A Google Ads Developer Token** — request from your MCC.
- **(Own mode only) Your Manager (MCC) Customer ID** for server-to-server calls.
- **An HTTPS callback URL**.

## Complete Integration Walkthrough — Wiro Mode

### Step 1: Initiate OAuth

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/GAdsConnect" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "userAgentGuid": "your-useragent-guid",
    "redirectUrl": "https://your-app.com/settings/integrations"
  }'
```

### Step 2: Callback handling

User returns with `?gads_connected=true&gads_accounts=[{...}]`. Parse and present to the user if multiple.

### Step 3: Pick the Customer ID

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/GAdsSetCustomerId" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "userAgentGuid": "your-useragent-guid",
    "customerId": "123-456-7890"
  }'
```

Skip to Step 6 below for verification.

## Complete Integration Walkthrough — Own Mode

### Step 1: Create a Google Cloud Project

1. Go to [console.cloud.google.com](https://console.cloud.google.com/) and create a new project (or reuse one).
2. Under **APIs & Services → Library**, search for **Google Ads API** and click **Enable**.
3. Under **APIs & Services → OAuth consent screen**, configure:
   - User type: **External** (for multi-tenant) or **Internal** (for single-workspace).
   - App name, support email, developer contact.
   - Scopes: add `https://www.googleapis.com/auth/adwords` in **Edit App → Scopes**.
   - Test users (during Testing publish status): add the Google accounts that will connect.

### Step 2: Create OAuth 2.0 Client ID

1. **APIs & Services → Credentials → Create credentials → OAuth client ID**.
2. Application type: **Web application**.
3. Name it.
4. **Authorized redirect URIs** → add:

   ```
   https://api.wiro.ai/v1/UserAgentOAuth/GAdsCallback
   ```

5. Save; copy the **Client ID** and **Client Secret**.

### Step 3: Get a Developer Token

1. Sign in to your [Google Ads Manager (MCC) account](https://ads.google.com/).
2. Go to **Tools → API Center** and request a token.
3. Start with a **test token** for development; apply for **basic access** once you are ready for production.

### Step 4: Save credentials to Wiro

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Update" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "guid": "your-useragent-guid",
    "configuration": {
      "credentials": {
        "googleads": {
          "clientId": "YOUR_GOOGLE_OAUTH_CLIENT_ID",
          "clientSecret": "YOUR_GOOGLE_OAUTH_CLIENT_SECRET",
          "developerToken": "YOUR_GOOGLE_ADS_DEVELOPER_TOKEN",
          "managerCustomerId": "1234567890"
        }
      }
    }
  }'
```

`managerCustomerId` is your MCC's customer ID without dashes (10 digits).

### Step 5: Initiate OAuth

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/GAdsConnect" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "userAgentGuid": "your-useragent-guid",
    "redirectUrl": "https://your-app.com/settings/integrations",
    "authMethod": "own"
  }'
```

### Step 6: Handle the callback

Success URL includes a list of accessible customer accounts:

```
https://your-app.com/settings/integrations?gads_connected=true&gads_accounts=%5B%7B%22id%22%3A%221234567890%22%2C%22name%22%3A%22My%20Client%22%7D%5D
```

```javascript
const params = new URLSearchParams(window.location.search);
if (params.get("gads_connected") === "true") {
  const accounts = JSON.parse(decodeURIComponent(params.get("gads_accounts") || "[]"));
  // Present picker or auto-select if only one
}
```

### Step 7: Pick the Customer ID

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/GAdsSetCustomerId" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "userAgentGuid": "your-useragent-guid",
    "customerId": "1234567890"
  }'
```

Pass either the 10-digit form or the formatted `123-456-7890` — non-digits are stripped automatically.

### Step 8: Verify

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/GAdsStatus" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "userAgentGuid": "your-useragent-guid" }'
```

Response contains `customerId` in place of `username`.

### Step 9: Start the agent

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Start" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "guid": "your-useragent-guid" }'
```

## API Reference

### **POST** /UserAgentOAuth/GAdsConnect

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userAgentGuid` | string | Yes | Agent instance GUID. |
| `redirectUrl` | string | Yes | HTTPS URL. |
| `authMethod` | string | No | `"wiro"` (default) or `"own"`. |

### **GET** /UserAgentOAuth/GAdsCallback

Callback query params: `gads_connected=true&gads_accounts=<JSON>` or `gads_error=<code>`.

### **POST** /UserAgentOAuth/GAdsSetCustomerId

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userAgentGuid` | string | Yes | Agent instance GUID. |
| `customerId` | string | Yes | Google Ads customer ID. Non-digit characters are stripped. |

Response: `{ result: true, customerId: "1234567890", errors: [] }`.

### **POST** /UserAgentOAuth/GAdsStatus / GAdsDisconnect

Standard shape. `Status` response uses `customerId` instead of `username`.

### **POST** /UserAgentOAuth/TokenRefresh

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/TokenRefresh" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "userAgentGuid": "your-useragent-guid", "provider": "googleads" }'
```

## Using the Skill

Enable `googleads-manage`. Schedule via `custom_skills`.

## Troubleshooting

| Error code | Meaning | What to do |
|------------|---------|------------|
| `authorization_denied` | User cancelled, or OAuth consent screen still in Testing status and the user is not a test user. | Add them under Test users; or publish the consent screen. |
| `session_expired` | State cache expired. | Restart OAuth. |
| `token_exchange_failed` | Wrong Client Secret or redirect URI mismatch. | Re-copy Client Secret; verify redirect URI in Google Cloud Credentials page. |
| `useragent_not_found` | Invalid `userAgentGuid`. | Use `POST /UserAgent/MyAgents`. |
| `invalid_config` | No `credentials.googleads` on the agent. | Update with all four fields. |
| `internal_error` | Server error. | Retry; contact support. |

### API returns USER_PERMISSION_DENIED

The OAuth-authorized user lacks access to the `customerId` you chose. Make sure the user is a manager or admin on that customer in Google Ads, or pick a different customer from the `gads_accounts` list.

### Developer Token rejected

Test tokens can only query accounts in your own MCC. For customer accounts outside your MCC hierarchy, you need a Basic Access token. Apply in **Tools → API Center**.

## Multi-Tenant Architecture

1. One Google Cloud project per product. Publish the OAuth consent screen to serve public customers.
2. Apply for Basic or Standard Developer Token access based on expected volume.
3. One Wiro agent instance per customer; `customerId` is per-instance.
4. Tokens auto-refresh via stored refresh token.

## Related

- [Agent Credentials & OAuth](/docs/agent-credentials)
- [Agent Overview](/docs/agent-overview)
- [Agent Skills](/docs/agent-skills)
- [Meta Ads integration](/docs/integration-metaads) — often paired for cross-platform paid campaigns.
- [Google Ads API docs](https://developers.google.com/google-ads/api/docs/start)


# HubSpot Integration

Connect your agents to HubSpot to manage contacts, deals, sequences, and other CRM objects.

## Overview

The HubSpot integration lets an agent read and write HubSpot CRM objects (contacts, companies, deals, engagements, tickets) via OAuth 2.0.

**Skills that use this integration:**

- `hubspot-crm` — Contact/deal management, note and task creation, enrollment in sequences

**Agents that typically enable this integration:**

- Lead Gen Manager
- Newsletter Manager (optional CRM sync)
- Any custom agent that needs CRM capabilities

## Availability

| Mode | Status | Notes |
|------|--------|-------|
| `"wiro"` | Available | One-click connect using Wiro's public HubSpot app. |
| `"own"` | Available | Use your own HubSpot developer app for custom branding or expanded scopes. |

## Prerequisites

- **A Wiro API key** — see [Authentication](/docs/authentication).
- **A deployed agent** — see [Agent Overview](/docs/agent-overview).
- **A HubSpot account** the connecting user is an admin of.
- **(Own mode only) A HubSpot developer account** — sign up at [developers.hubspot.com](https://developers.hubspot.com/).
- **An HTTPS callback URL**.

## Complete Integration Walkthrough — Wiro Mode

Call `HubSpotConnect` with no `authMethod`, redirect the user, read `hubspot_connected=true&hubspot_portal=<portalId>&hubspot_name=<name>`.

## Complete Integration Walkthrough — Own Mode

### Step 1: Create a HubSpot App

1. Go to [developers.hubspot.com](https://developers.hubspot.com/), sign in, and click **Create app**.
2. Set **App name** and **App description** (shown on the consent screen).

### Step 2: Configure Auth

1. Inside the app, open the **Auth** tab.
2. Under **Redirect URL**, add:

   ```
   https://api.wiro.ai/v1/UserAgentOAuth/HubSpotCallback
   ```

3. Under **Scopes**, select the ones your agent needs. Typical set:

   | Scope | Why |
   |-------|-----|
   | `crm.objects.contacts.read` | Read contacts. |
   | `crm.objects.contacts.write` | Create/update contacts. |
   | `crm.objects.companies.read` / `write` | Company management. |
   | `crm.objects.deals.read` / `write` | Deal management. |
   | `crm.objects.owners.read` | Read pipeline owners for assignment. |
   | `crm.schemas.contacts.read` | Read custom contact fields. |

4. Save.

### Step 3: Copy Client ID and Client Secret

From the **Auth** tab, copy **Client ID** and **Client Secret**.

### Step 4: Save credentials

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Update" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "guid": "your-useragent-guid",
    "configuration": {
      "credentials": {
        "hubspot": {
          "clientId": "YOUR_HUBSPOT_CLIENT_ID",
          "clientSecret": "YOUR_HUBSPOT_CLIENT_SECRET"
        }
      }
    }
  }'
```

### Step 5: Initiate OAuth

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/HubSpotConnect" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "userAgentGuid": "your-useragent-guid",
    "redirectUrl": "https://your-app.com/settings/integrations",
    "authMethod": "own"
  }'
```

### Step 6: Handle callback

```
https://your-app.com/settings/integrations?hubspot_connected=true&hubspot_portal=12345678&hubspot_name=My%20Workspace
```

`hubspot_portal` is the HubSpot portal ID (a.k.a. hub ID). `hubspot_name` is the workspace display name.

### Step 7: Verify and Start

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/HubSpotStatus" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "userAgentGuid": "your-useragent-guid" }'
```

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Start" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "guid": "your-useragent-guid" }'
```

## API Reference

### **POST** /UserAgentOAuth/HubSpotConnect

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userAgentGuid` | string | Yes | Agent instance GUID. |
| `redirectUrl` | string | Yes | HTTPS URL. |
| `authMethod` | string | No | `"wiro"` (default) or `"own"`. |

### **GET** /UserAgentOAuth/HubSpotCallback

Callback query params: `hubspot_connected=true&hubspot_portal=<id>&hubspot_name=<name>` or `hubspot_error=<code>`.

### **POST** /UserAgentOAuth/HubSpotStatus / HubSpotDisconnect

Standard shape.

### **POST** /UserAgentOAuth/TokenRefresh

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/TokenRefresh" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "userAgentGuid": "your-useragent-guid", "provider": "hubspot" }'
```

## Troubleshooting

| Error code | Meaning | What to do |
|------------|---------|------------|
| `authorization_denied` | User cancelled, or missing scopes in app settings. | Verify scope list in Auth tab; retry. |
| `session_expired` | State cache expired. | Restart. |
| `token_exchange_failed` | Wrong Client Secret or redirect URI mismatch. | Re-copy; verify URL. |
| `useragent_not_found` | Invalid `userAgentGuid`. | Find via `POST /UserAgent/MyAgents`. |
| `invalid_config` | No `credentials.hubspot` on agent. | Update with `clientId` + `clientSecret`. |
| `internal_error` | Server error. | Retry; contact support. |

### 403 Forbidden on API calls

Usually a missing scope. Look at the HubSpot API reference for the endpoint and add the required scope in your app's Auth configuration, then disconnect and reconnect (scope changes require re-auth).

## Multi-Tenant Architecture

1. One HubSpot developer app per product. Submit to the HubSpot Marketplace for listed apps or stay unlisted for private apps.
2. One Wiro agent instance per customer.
3. Portal IDs are unique per HubSpot customer account.
4. Per-app rate limits apply — see HubSpot's [API usage guidelines](https://developers.hubspot.com/docs/api/usage-details).

## Related

- [Agent Credentials & OAuth](/docs/agent-credentials)
- [Agent Overview](/docs/agent-overview)
- [Agent Skills](/docs/agent-skills)
- [HubSpot Developer docs](https://developers.hubspot.com/docs/api/overview)


# Mailchimp Integration

Connect your agents to Mailchimp for newsletter and audience management. Supports both OAuth and direct API keys.

## Overview

The Mailchimp integration lets an agent manage audiences, campaigns, and templates. Unlike most integrations, Mailchimp supports **three** authentication methods.

**Skills that use this integration:**

- `mailchimp-email` — Audience and campaign management

**Agents that typically enable this integration:**

- Newsletter Manager
- Any custom agent that needs email marketing capabilities

## Availability

| Mode | Status | Notes |
|------|--------|-------|
| `"wiro"` | Available | OAuth with Wiro's shared Mailchimp app. |
| `"own"` | Available | OAuth with your own Mailchimp registered app. |
| API key | Available | Paste a server-scoped Mailchimp API key directly — no OAuth. |

## Prerequisites

- **A Wiro API key** — see [Authentication](/docs/authentication).
- **A deployed agent** — see [Agent Overview](/docs/agent-overview).
- **A Mailchimp account**.
- **(Own-OAuth mode only) A registered Mailchimp app** — at [admin.mailchimp.com](https://admin.mailchimp.com/account/oauth2_client/).
- **(API-key mode only) A server-scoped Mailchimp API key**.

## Option A: OAuth (Wiro or Own Mode)

### Own-mode Step 1: Register a Mailchimp app

1. Sign in to Mailchimp → **Profile → Extras → API keys** or directly [admin.mailchimp.com/account/oauth2_client](https://admin.mailchimp.com/account/oauth2_client/).
2. Click **Register and manage your apps**.
3. Fill in **App name**, **Description**, **Company**, **App website**.
4. Under **Redirect URI**, add:

   ```
   https://api.wiro.ai/v1/UserAgentOAuth/MailchimpCallback
   ```

5. Save; copy **Client ID** and **Client Secret**.

### Own-mode Step 2: Save credentials

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Update" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "guid": "your-useragent-guid",
    "configuration": {
      "credentials": {
        "mailchimp": {
          "clientId": "YOUR_MAILCHIMP_CLIENT_ID",
          "clientSecret": "YOUR_MAILCHIMP_CLIENT_SECRET"
        }
      }
    }
  }'
```

### OAuth Step 3: Initiate

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/MailchimpConnect" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "userAgentGuid": "your-useragent-guid",
    "redirectUrl": "https://your-app.com/settings/integrations",
    "authMethod": "own"
  }'
```

Omit `authMethod` (or set to `"wiro"`) for Wiro-mode.

### OAuth Step 4: Handle callback

```
https://your-app.com/settings/integrations?mailchimp_connected=true&mailchimp_account=Your%20Company
```

Mailchimp tokens do **not** expire — no refresh cycle.

### OAuth Step 5: Verify

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/MailchimpStatus" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "userAgentGuid": "your-useragent-guid" }'
```

## Option B: Direct API Key (No OAuth)

For server-side agents where OAuth is overkill:

### Step 1: Get a Mailchimp API Key

1. Sign in → **Profile → Extras → API keys**.
2. Click **Create A Key**, name it, copy the value. The key ends in a datacenter prefix like `-us14`.

### Step 2: Save to Wiro

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Update" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "guid": "your-useragent-guid",
    "configuration": {
      "credentials": {
        "mailchimp": {
          "apiKey": "abcdef1234567890-us14"
        }
      }
    }
  }'
```

No further OAuth step is needed. The agent uses the API key directly.

## API Reference

### **POST** /UserAgentOAuth/MailchimpConnect

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userAgentGuid` | string | Yes | Agent instance GUID. |
| `redirectUrl` | string | Yes | HTTPS URL. |
| `authMethod` | string | No | `"wiro"` (default) or `"own"`. |

### **GET** /UserAgentOAuth/MailchimpCallback

Callback query params: `mailchimp_connected=true&mailchimp_account=<name>` or `mailchimp_error=<code>`.

### **POST** /UserAgentOAuth/MailchimpStatus / MailchimpDisconnect

Standard shape. **Note:** Mailchimp tokens do not expire, so `TokenRefresh` is not supported for this provider.

## Troubleshooting

| Error code | Meaning | What to do |
|------------|---------|------------|
| `authorization_denied` | User cancelled. | Retry. |
| `session_expired` | State cache expired. | Restart. |
| `token_exchange_failed` | Wrong Client Secret or redirect URI mismatch. | Re-copy; verify URL. |
| `useragent_not_found` | Invalid `userAgentGuid`. | `POST /UserAgent/MyAgents`. |
| `invalid_config` | No `credentials.mailchimp` on agent. | Update with credentials. |
| `internal_error` | Server error. | Retry; contact support. |

### API calls fail with 401

- For OAuth: the stored token is invalid; disconnect and reconnect.
- For API key: the key is wrong or the datacenter suffix was stripped; paste the full key including `-us14` (or whatever your datacenter prefix is).

## Multi-Tenant Architecture

1. One Mailchimp registered app per product in own-OAuth mode.
2. API-key mode is simplest for tenants who only want to paste a single-purpose key.
3. One Wiro agent instance per customer.
4. Mailchimp rate limits are per-datacenter and per-account — typical 10 concurrent connections.

## Related

- [Agent Credentials & OAuth](/docs/agent-credentials)
- [Agent Overview](/docs/agent-overview)
- [Agent Skills](/docs/agent-skills)
- [Mailchimp Marketing API](https://mailchimp.com/developer/marketing/)


# Google Drive Integration

Connect your agents to Google Drive to read, write, and organize files across selected folders.

## Overview

The Google Drive integration lets an agent list, download, upload, and organize files in specific Drive folders the connecting user selects.

**Skills that use this integration:**

- `google-drive` — Read files, write outputs, manage folders

**Agents that typically enable this integration:**

- Any content or research agent that needs persistent file storage accessible to humans.

## Availability

| Mode | Status | Notes |
|------|--------|-------|
| `"wiro"` | Available | One-click connect with Wiro's Google Cloud project. |
| `"own"` | Available | Your own Google Cloud project for custom branding. |

## Prerequisites

- **A Wiro API key** — see [Authentication](/docs/authentication).
- **A deployed agent** — see [Agent Overview](/docs/agent-overview).
- **A Google account** for the connecting user.
- **(Own mode only) A Google Cloud project** with the Drive API enabled.
- **An HTTPS callback URL**.

## Complete Integration Walkthrough — Wiro Mode

1. `POST /UserAgentOAuth/GoogleDriveConnect` with `userAgentGuid` + `redirectUrl`.
2. User consents.
3. Callback returns `?gdrive_connected=true` plus a folder picker state — the user selects one or more folders.
4. Agent is now scoped to those folders only.

## Complete Integration Walkthrough — Own Mode

### Step 1: Create a Google Cloud Project

Same as for Google Ads. Enable the **Drive API** under **APIs & Services → Library**.

### Step 2: OAuth consent screen

1. **APIs & Services → OAuth consent screen**.
2. User type: **External**.
3. Scopes: add `https://www.googleapis.com/auth/drive.file` (lets the user grant access to specific files/folders).

### Step 3: Create OAuth 2.0 Client ID

1. **APIs & Services → Credentials → Create credentials → OAuth client ID**.
2. Application type: **Web application**.
3. **Authorized redirect URIs**:

   ```
   https://api.wiro.ai/v1/UserAgentOAuth/GoogleDriveCallback
   ```

4. Save; copy **Client ID** and **Client Secret**.

### Step 4: Save credentials

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Update" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "guid": "your-useragent-guid",
    "configuration": {
      "credentials": {
        "googledrive": {
          "clientId": "YOUR_GOOGLE_OAUTH_CLIENT_ID",
          "clientSecret": "YOUR_GOOGLE_OAUTH_CLIENT_SECRET"
        }
      }
    }
  }'
```

### Step 5: Initiate OAuth

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/GoogleDriveConnect" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "userAgentGuid": "your-useragent-guid",
    "redirectUrl": "https://your-app.com/settings/integrations",
    "authMethod": "own"
  }'
```

### Step 6: Handle callback

User returns with `?gdrive_connected=true` and (when applicable) the folder selector is triggered in the Wiro Dashboard UI. If you are building your own UI:

```javascript
const params = new URLSearchParams(window.location.search);
if (params.get("gdrive_connected") === "true") {
  // Present folder picker by calling your own Drive-integrated picker
  // or rely on the agent's folder selection UI in Wiro Dashboard.
}
```

Folder selection is persisted by the dashboard via `GoogleDriveSetFolders`; in headless flows, set the folder IDs directly in credentials:

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Update" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "guid": "your-useragent-guid",
    "configuration": {
      "credentials": {
        "googledrive": {
          "folders": [
            { "id": "1AbCdEfGhIjKlMn", "name": "Agent Outputs" }
          ]
        }
      }
    }
  }'
```

Up to 5 folders can be set per agent.

### Step 7: Verify

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/GoogleDriveStatus" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "userAgentGuid": "your-useragent-guid" }'
```

## API Reference

### **POST** /UserAgentOAuth/GoogleDriveConnect

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userAgentGuid` | string | Yes | Agent instance GUID. |
| `redirectUrl` | string | Yes | HTTPS URL. |
| `authMethod` | string | No | `"wiro"` (default) or `"own"`. |

### **GET** /UserAgentOAuth/GoogleDriveCallback

Callback query params: `gdrive_connected=true` on success, `gdrive_error=<code>` on failure.

### **POST** /UserAgentOAuth/GoogleDriveStatus / GoogleDriveDisconnect

Standard shape.

### **POST** /UserAgentOAuth/TokenRefresh

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/TokenRefresh" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "userAgentGuid": "your-useragent-guid", "provider": "googledrive" }'
```

## Troubleshooting

| Error code | Meaning | What to do |
|------------|---------|------------|
| `authorization_denied` | User cancelled, or user is not a Test user while consent screen is in Testing. | Add test user or publish consent screen. |
| `session_expired` | State cache expired. | Restart. |
| `token_exchange_failed` | Wrong Client Secret or redirect URI mismatch. | Re-copy; verify URL. |
| `useragent_not_found` | Invalid `userAgentGuid`. | Use `POST /UserAgent/MyAgents`. |
| `invalid_config` | No `credentials.googledrive` on agent. | Update with credentials. |
| `internal_error` | Server error. | Retry; contact support. |

### Agent cannot see folders it did not request

`drive.file` scope is intentionally narrow — it grants access only to files created by the app or opened via a picker. Files in the user's Drive that the agent did not create or that were not explicitly shared via the folder selector remain invisible.

## Multi-Tenant Architecture

1. One Google Cloud project per product. Publish the consent screen before rolling out to many tenants.
2. Rate limits are per-project; monitor quotas in Google Cloud Console.
3. Per-agent folder selection is isolated — Customer A's folders are never visible to Customer B.

## Related

- [Agent Credentials & OAuth](/docs/agent-credentials)
- [Agent Overview](/docs/agent-overview)
- [Agent Skills](/docs/agent-skills)
- [Google Drive API docs](https://developers.google.com/drive/api)


# Gmail Integration

Connect your agents to a Gmail inbox using an App Password for IMAP/SMTP-based access.

## Overview

The Gmail integration lets an agent monitor an inbox (for example, reading incoming support emails) and send messages via SMTP. Authentication uses a Google **App Password** tied to the agent's Gmail account.

**Skills that use this integration:**

- `gmail-check` — Monitor an inbox, parse incoming messages, trigger actions
- Used by `newsletter-compose` and other skills that send or receive mail

**Agents that typically enable this integration:**

- Blog Content Editor
- Newsletter Manager (test sends)
- Support / App Review agents

## Availability

| Mode | Status | Notes |
|------|--------|-------|
| API key (App Password) | Available | Works on any Gmail account with 2-Step Verification enabled. |

## Prerequisites

- **A Wiro API key** — see [Authentication](/docs/authentication).
- **A deployed agent** — see [Agent Overview](/docs/agent-overview).
- **A Gmail account** with **2-Step Verification** enabled.

## Setup

### Step 1: Enable 2-Step Verification

1. Sign in to the Google account.
2. Go to [myaccount.google.com/security](https://myaccount.google.com/security).
3. Under **How you sign in to Google**, turn on **2-Step Verification**.

### Step 2: Create an App Password

1. After 2-Step Verification is on, the same Security page shows **App passwords**.
2. Create a new app password — label it "Wiro agent" or similar.
3. Google shows a 16-character password in the format `xxxx xxxx xxxx xxxx`. Copy it immediately.

### Step 3: Save to Wiro

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Update" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "guid": "your-useragent-guid",
    "configuration": {
      "credentials": {
        "gmail": {
          "account": "agent@yourcompany.com",
          "appPassword": "xxxx xxxx xxxx xxxx"
        }
      }
    }
  }'
```

### Step 4: Start the agent

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Start" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "guid": "your-useragent-guid" }'
```

## Credential Fields

| Field | Type | Description |
|-------|------|-------------|
| `account` | string | Full Gmail address (e.g. `agent@company.com`). |
| `appPassword` | string | 16-character Google App Password. Spaces are allowed. |

## Troubleshooting

- **"Invalid credentials" when the agent tries to read mail:** The App Password is wrong, or 2-Step Verification was turned off (which invalidates all App Passwords). Re-create.
- **Agent cannot read messages older than 30 days:** IMAP default folder selection limits may apply. Move the agent's read scope to "All Mail" or adjust folder config in the skill settings.
- **Messages blocked by Google:** Less Secure Apps is no longer supported; App Password is the only path for IMAP/SMTP as of 2022.

## Related

- [Agent Credentials & OAuth](/docs/agent-credentials)
- [Agent Overview](/docs/agent-overview)
- [Agent Skills](/docs/agent-skills)
- [Google App Passwords help](https://support.google.com/accounts/answer/185833)


# Telegram Integration

Connect your agents to a Telegram bot for two-way messaging with end users.

## Overview

The Telegram integration lets an agent communicate with operators or end users through a Telegram bot — useful for operator notifications, interactive support, or as the primary user channel for the agent.

**Used by:** Most Wiro agents support Telegram as an operator notification channel. Some agents use it as the primary user interface.

## Availability

| Mode | Status | Notes |
|------|--------|-------|
| API key (Bot Token) | Available | Single Bot Token from BotFather. |

## Prerequisites

- **A Wiro API key** — see [Authentication](/docs/authentication).
- **A deployed agent** — see [Agent Overview](/docs/agent-overview).
- **A Telegram account**.

## Setup

### Step 1: Create a Telegram bot

1. Open Telegram and start a chat with [@BotFather](https://t.me/BotFather).
2. Send `/newbot`.
3. Choose a display name and a username (must end in `bot`, e.g. `@mycompany_agent_bot`).
4. BotFather returns a **Bot Token** like `123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11`. Copy it.

### Step 2: Find the Telegram user IDs of allowed users

1. Each person who should be able to chat with the agent sends a message to the bot first.
2. Open `https://api.telegram.org/bot<BOT_TOKEN>/getUpdates` in a browser (replace `<BOT_TOKEN>`).
3. Find the `from.id` of each user — these are the numeric Telegram user IDs.

### Step 3: Save to Wiro

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Update" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "guid": "your-useragent-guid",
    "configuration": {
      "credentials": {
        "telegram": {
          "botToken": "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11",
          "allowedUsers": ["761381461", "987654321"],
          "sessionMode": [
            { "value": "private", "text": "Private — each user has their own conversation", "selected": true },
            { "value": "collaborative", "text": "Collaborative — all users share the same conversation", "selected": false }
          ]
        }
      }
    }
  }'
```

### Step 4: Start the agent

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Start" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "guid": "your-useragent-guid" }'
```

## Credential Fields

| Field | Type | Description |
|-------|------|-------------|
| `botToken` | string | BotFather token. |
| `allowedUsers` | string[] | Array of Telegram user IDs allowed to interact. Others are ignored. |
| `sessionMode` | object[] | Session selection — Private (default) or Collaborative. Set one to `selected: true`. |

## Session Modes

- **Private** — each allowed user has an isolated conversation with the agent. Messages from user A are never visible to user B.
- **Collaborative** — all allowed users share one conversation. Any user can see and respond to any message. Useful for team coordination.

## Troubleshooting

- **Bot does not respond:** Verify the Bot Token is correct and the user's Telegram ID is in `allowedUsers`.
- **"Unauthorized" error:** Bot Token was regenerated in BotFather and the old one was invalidated. Create a new token and update.
- **Rate limits:** Telegram bots are limited to ~30 messages per second across all chats. Plan around burst limits for broadcasts.

## Related

- [Agent Credentials & OAuth](/docs/agent-credentials)
- [Agent Overview](/docs/agent-overview)
- [Agent Skills](/docs/agent-skills)
- [Telegram Bot API docs](https://core.telegram.org/bots/api)


# Firebase Integration

Connect your agents to Firebase Cloud Messaging (FCM) to send targeted push notifications to iOS and Android apps.

## Overview

The Firebase integration lets an agent send push notifications through FCM using a Firebase Admin SDK service account.

**Skills that use this integration:**

- `firebase-push` — Send push notifications by topic, token, or targeted audience

**Agents that typically enable this integration:**

- Push Notification Manager

## Availability

| Mode | Status | Notes |
|------|--------|-------|
| Service account JSON | Available | Standard Firebase Admin SDK credentials. |

## Prerequisites

- **A Wiro API key** — see [Authentication](/docs/authentication).
- **A deployed agent** — see [Agent Overview](/docs/agent-overview).
- **A Firebase project** with your iOS and/or Android apps registered and FCM configured.

## Setup

### Step 1: Generate a Firebase Admin SDK service account

1. Go to [console.firebase.google.com](https://console.firebase.google.com/) and select your project.
2. **Project settings → Service accounts → Firebase Admin SDK → Generate new private key**.
3. Save the downloaded JSON file. Treat it like a password.

### Step 2: Base64-encode the JSON

```bash
base64 -w 0 firebase-service-account.json > firebase-sa.b64
```

(On macOS, `base64 -b 0 firebase-service-account.json`.)

### Step 3: Save to Wiro

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Update" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "guid": "your-useragent-guid",
    "configuration": {
      "credentials": {
        "firebase": {
          "accounts": [
            {
              "appName": "My App",
              "serviceAccountJsonBase64": "eyJ0eXBlIjoic2VydmljZV9hY2NvdW50Ii...",
              "apps": [
                { "platform": "ios", "id": "6479306352" },
                { "platform": "android", "id": "com.example.app" }
              ],
              "topics": {
                "locale_en": "English users",
                "tier_paid": "Paid subscribers"
              }
            }
          ]
        }
      }
    }
  }'
```

### Step 4: Start the agent

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Start" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "guid": "your-useragent-guid" }'
```

## Credential Fields

| Field | Type | Description |
|-------|------|-------------|
| `accounts` | object[] | Array of Firebase projects you want to send notifications for. |
| `accounts[].appName` | string | Display name for this project. |
| `accounts[].serviceAccountJsonBase64` | string | Base64-encoded service account JSON. |
| `accounts[].apps` | object[] | `{ platform: "ios" \| "android", id: string }`. `id` is App Store ID for iOS, package name for Android. |
| `accounts[].topics` | object | FCM topic key → human description. Topics you have already set up on the client side. |

Multiple `accounts` entries let one agent push to several Firebase projects (useful if you manage a portfolio of apps).

## Troubleshooting

- **"invalid JWT signature":** Service account JSON is corrupt or truncated. Re-export from Firebase Console and re-encode.
- **No devices receive notifications:** Verify topics are subscribed client-side and the topic name matches exactly.
- **Rate limits:** FCM limits ~1,800 messages/min per project by default. Contact Google for higher limits on broadcast use cases.

## Related

- [Agent Credentials & OAuth](/docs/agent-credentials)
- [Agent Overview](/docs/agent-overview)
- [Agent Skills](/docs/agent-skills)
- [Firebase Cloud Messaging docs](https://firebase.google.com/docs/cloud-messaging)


# WordPress Integration

Connect your agents to a self-hosted WordPress site to publish posts and pages.

## Overview

The WordPress integration uses the WordPress REST API with Basic Authentication backed by a WordPress Application Password.

**Skills that use this integration:**

- `wordpress-post` — Publish blog posts, pages, categories, tags

**Agents that typically enable this integration:**

- Blog Content Editor

## Availability

| Mode | Status | Notes |
|------|--------|-------|
| API key (Application Password) | Available | WordPress 5.6+ built-in Application Passwords feature. |

## Prerequisites

- **A Wiro API key** — see [Authentication](/docs/authentication).
- **A deployed agent** — see [Agent Overview](/docs/agent-overview).
- **A WordPress site** (self-hosted or WordPress.com Business/Commerce) running **WordPress 5.6 or newer**.
- **An admin or editor-level user** on that site.

## Setup

### Step 1: Enable Application Passwords (if disabled)

Application Passwords are enabled by default since WordPress 5.6. If your host or security plugin disabled them:

- In `wp-config.php`, confirm `define('WP_ENVIRONMENT_TYPE', 'production');` is not restricting them.
- Security plugins like Wordfence or iThemes Security may disable Application Passwords — check their settings.

### Step 2: Create an Application Password

1. Log in as the user the agent will post as.
2. Go to **Users → Profile** (or **Users → All Users → Edit** for another user if you are an admin).
3. Scroll to **Application Passwords**.
4. Enter a name like "Wiro agent" and click **Add New Application Password**.
5. Copy the generated 24-character password (spaces are cosmetic — Wiro accepts either form).

### Step 3: Save to Wiro

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Update" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "guid": "your-useragent-guid",
    "configuration": {
      "credentials": {
        "wordpress": {
          "url": "https://blog.example.com",
          "user": "WiroBlogAgent",
          "appPassword": "xxxx xxxx xxxx xxxx xxxx xxxx"
        }
      }
    }
  }'
```

### Step 4: Start the agent

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Start" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "guid": "your-useragent-guid" }'
```

## Credential Fields

| Field | Type | Description |
|-------|------|-------------|
| `url` | string | Site URL (include `https://`, no trailing slash). |
| `user` | string | WordPress username the Application Password belongs to. |
| `appPassword` | string | 24-character Application Password. |

## Troubleshooting

- **401 Unauthorized on REST API calls:** Verify the username matches the user who created the Application Password. Usernames are case-sensitive in some setups.
- **REST API returns 404 at `/wp-json/`:** Permalinks must be set to something other than Plain. Go to **Settings → Permalinks** and pick any pretty-permalink option.
- **Hosted WordPress.com Business plans:** Enable the REST API via Jetpack settings and ensure the Business plan grants API access.
- **Cloudflare/WAF blocking PUT/POST:** Some firewalls block REST API writes by default. Whitelist Wiro's outbound IPs (contact support for the list) or allow your `/wp-json/wp/v2/posts` endpoint.

## Related

- [Agent Credentials & OAuth](/docs/agent-credentials)
- [Agent Overview](/docs/agent-overview)
- [Agent Skills](/docs/agent-skills)
- [WordPress Application Passwords docs](https://make.wordpress.org/core/2020/11/05/application-passwords-integration-guide/)


# App Store Connect Integration

Connect your agents to App Store Connect for review monitoring, metadata management, and in-app events.

## Overview

The App Store Connect integration uses App Store Connect API keys (key ID + issuer ID + ES256 private key) for server-to-server authentication.

**Skills that use this integration:**

- `appstore-reviews` — Monitor and reply to App Store reviews
- `appstore-metadata` — Read/update app metadata
- `appstore-events` — Create and manage in-app events

**Agents that typically enable this integration:**

- App Review Support
- App Event Manager
- Any custom agent that needs App Store Connect access

## Availability

| Mode | Status | Notes |
|------|--------|-------|
| API key (ES256) | Available | Standard App Store Connect API keys. |

## Prerequisites

- **A Wiro API key** — see [Authentication](/docs/authentication).
- **A deployed agent** — see [Agent Overview](/docs/agent-overview).
- **App Store Connect Admin access** — only Admins can generate API keys.

## Setup

### Step 1: Create an API key

1. Sign in to [App Store Connect](https://appstoreconnect.apple.com/).
2. Go to **Users and Access → Integrations → App Store Connect API**.
3. Click **+** to generate a new key.
4. Name it (e.g. "Wiro agent") and choose an access role. For full capability pick **Admin** or **App Manager**; for reviews-only use **Customer Support** or **Developer**.
5. Download the `.p8` file — you can only download it **once**.
6. Copy the **Key ID** (10 characters, e.g. `ABC1234DEF`) and the **Issuer ID** (UUID at the top of the page).

### Step 2: Base64-encode the private key

```bash
base64 -w 0 AuthKey_ABC1234DEF.p8 > appstore-key.b64
```

(On macOS: `base64 -b 0 AuthKey_ABC1234DEF.p8`.)

### Step 3: Save to Wiro

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Update" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "guid": "your-useragent-guid",
    "configuration": {
      "credentials": {
        "appstore": {
          "keyId": "ABC1234DEF",
          "issuerId": "12345678-1234-1234-1234-123456789012",
          "privateKeyBase64": "LS0tLS1CRUdJTi...",
          "appIds": ["6479306352"],
          "supportEmail": "support@yourcompany.com"
        }
      }
    }
  }'
```

### Step 4: Start the agent

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Start" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "guid": "your-useragent-guid" }'
```

## Credential Fields

| Field | Type | Description |
|-------|------|-------------|
| `keyId` | string | 10-character App Store Connect Key ID. |
| `issuerId` | string | UUID issuer ID for your App Store Connect team. |
| `privateKeyBase64` | string | Base64-encoded `.p8` private key file. |
| `appIds` | string[] | Array of App Store IDs the agent is scoped to. |
| `supportEmail` | string | Email used when replying to reviews (App Review Support agent only). |

Some agents use an alternative `apps` shape:

```json
"appstore": {
  "apps": [
    { "appName": "My iOS App", "appId": "6479306352" }
  ]
}
```

Refer to your specific agent's credential schema.

## Troubleshooting

- **401 Unauthorized when signing JWT:** Wrong Key ID or Issuer ID, or base64 encoding mangled the private key. Re-export and re-encode.
- **Key ID "NOT_ENABLED":** The key was revoked. Generate a new one.
- **Reviews not appearing in agent:** Role of the API key lacks Customer Support permissions. Regenerate the key with a role that includes review access.
- **Metadata updates fail:** Role lacks Admin or App Manager permissions for the specific app.

## Related

- [Agent Credentials & OAuth](/docs/agent-credentials)
- [Agent Overview](/docs/agent-overview)
- [Agent Skills](/docs/agent-skills)
- [App Store Connect API docs](https://developer.apple.com/documentation/appstoreconnectapi)


# Google Play Integration

Connect your agents to the Google Play Developer API for review monitoring and app listing management.

## Overview

The Google Play integration uses a Google Cloud service account with API access delegated from a Play Console project.

**Skills that use this integration:**

- `googleplay-reviews` — Monitor and reply to Google Play reviews
- `googleplay-metadata` — Read/update app listings and metadata

**Agents that typically enable this integration:**

- App Review Support
- Any custom agent that needs Play Console access

## Availability

| Mode | Status | Notes |
|------|--------|-------|
| Service account JSON | Available | Google Cloud service account with Play Developer Reporting permissions. |

## Prerequisites

- **A Wiro API key** — see [Authentication](/docs/authentication).
- **A deployed agent** — see [Agent Overview](/docs/agent-overview).
- **A Google Play Console** account with **Admin** access.
- **A Google Cloud project** to host the service account.

## Setup

### Step 1: Enable the Google Play Android Developer API

1. In [Google Cloud Console](https://console.cloud.google.com/), select (or create) a project.
2. **APIs & Services → Library** → search **Google Play Android Developer API** → **Enable**.

### Step 2: Create a service account

1. **IAM & Admin → Service accounts → Create service account**.
2. Name it (e.g. "wiro-play-agent").
3. Grant role: `Service Account Token Creator` is sufficient for signing.
4. Skip user permissions; **Done**.
5. Open the service account → **Keys → Add key → Create new key → JSON**. Download.

### Step 3: Link the service account to Play Console

1. In [Google Play Console](https://play.google.com/console), go to **Users and permissions → Invite new users**.
2. Use the service account email (`...@....iam.gserviceaccount.com`).
3. Grant at least: **View app information**, **Reply to reviews**, and any other permission your agent needs.
4. Send invite — Play Console auto-accepts for service accounts.

### Step 4: Base64-encode the JSON

```bash
base64 -w 0 play-service-account.json > play-sa.b64
```

(On macOS: `base64 -b 0 play-service-account.json`.)

### Step 5: Save to Wiro

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Update" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "guid": "your-useragent-guid",
    "configuration": {
      "credentials": {
        "googleplay": {
          "serviceAccountJsonBase64": "eyJ0eXBlIjoic2VydmljZV9hY2NvdW50Ii...",
          "packageNames": ["com.example.app"],
          "supportEmail": "support@yourcompany.com"
        }
      }
    }
  }'
```

### Step 6: Start the agent

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Start" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "guid": "your-useragent-guid" }'
```

## Credential Fields

| Field | Type | Description |
|-------|------|-------------|
| `serviceAccountJsonBase64` | string | Base64-encoded service account JSON. |
| `packageNames` | string[] | Array of Android package names the agent is scoped to. |
| `supportEmail` | string | Email used when replying to reviews (App Review Support only). |

Ads-agent variants use an alternative `apps` shape:

```json
"googleplay": {
  "apps": [
    { "appName": "My Android App", "packageName": "com.example.app" }
  ]
}
```

## Troubleshooting

- **403 "The caller does not have permission":** Service account is enabled but not invited in Play Console, or missing the required role. Return to Play Console → Users and permissions and adjust.
- **"Invalid JWT token":** Service account JSON is corrupt or truncated. Re-encode.
- **Review reply fails silently:** Some reviews are too old (>1 year) and cannot be replied to via API; Google enforces this at the platform level.

## Related

- [Agent Credentials & OAuth](/docs/agent-credentials)
- [Agent Overview](/docs/agent-overview)
- [Agent Skills](/docs/agent-skills)
- [Google Play Developer API docs](https://developers.google.com/android-publisher)


# Apollo.io Integration

Connect your agents to Apollo.io for lead generation, prospecting, and email sequence enrollment.

## Overview

The Apollo integration uses Apollo.io's API key authentication for lead discovery, enrichment, and (optionally) sequence management.

**Skills that use this integration:**

- `apollo-sales` — Lead search, enrichment, sequence enrollment

**Agents that typically enable this integration:**

- Lead Gen Manager

## Availability

| Mode | Status | Notes |
|------|--------|-------|
| API key | Available | Apollo.io REST API key with per-account scoping. |

## Prerequisites

- **A Wiro API key** — see [Authentication](/docs/authentication).
- **A deployed agent** — see [Agent Overview](/docs/agent-overview).
- **An Apollo.io account** on a plan that allows API access.

## Setup

### Step 1: Get an Apollo API key

1. Sign in to [app.apollo.io](https://app.apollo.io/).
2. Go to **Settings → Integrations → API** (or **Account settings → API keys** depending on plan).
3. Click **Create new key**, name it "Wiro agent", copy the value.

### Step 2: (Optional) Get a Master API Key for sequence management

Some Apollo plans require a separate **Master API Key** to manage email sequences. This is exposed under **Admin → API keys** for workspace admins.

### Step 3: Save to Wiro

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Update" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "guid": "your-useragent-guid",
    "configuration": {
      "credentials": {
        "apollo": {
          "apiKey": "YOUR_APOLLO_API_KEY",
          "masterApiKey": "YOUR_APOLLO_MASTER_API_KEY"
        }
      }
    }
  }'
```

`masterApiKey` is optional — omit it if your agent only does lead search/enrichment without sequence management.

### Step 4: Start the agent

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Start" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "guid": "your-useragent-guid" }'
```

## Credential Fields

| Field | Type | Description |
|-------|------|-------------|
| `apiKey` | string | Primary Apollo API key. |
| `masterApiKey` | string (optional) | Master API key for sequence management. |

## Troubleshooting

- **403 Forbidden:** Plan does not include API access. Upgrade at Apollo to Professional tier or higher.
- **429 Too Many Requests:** Apollo enforces strict per-key rate limits. Space out large prospecting runs or contact Apollo support for a higher tier.
- **Sequence enrollment fails:** Missing `masterApiKey`. Add it and re-try.

## Related

- [Agent Credentials & OAuth](/docs/agent-credentials)
- [Agent Overview](/docs/agent-overview)
- [Agent Skills](/docs/agent-skills)
- [Apollo.io API docs](https://apolloio.github.io/apollo-api-docs/)


# Lemlist Integration

Connect your agents to Lemlist for cold email outreach and campaign orchestration.

## Overview

The Lemlist integration uses Lemlist's API key for managing campaigns, leads, and custom variables.

**Skills that use this integration:**

- `lemlist-outreach` — Campaign creation, lead uploads, pause/resume

**Agents that typically enable this integration:**

- Lead Gen Manager

## Availability

| Mode | Status | Notes |
|------|--------|-------|
| API key | Available | Standard Lemlist API key. |

## Prerequisites

- **A Wiro API key** — see [Authentication](/docs/authentication).
- **A deployed agent** — see [Agent Overview](/docs/agent-overview).
- **A Lemlist account** (Gold tier or higher for full API access).

## Setup

### Step 1: Get an API key

1. Sign in to [app.lemlist.com](https://app.lemlist.com/).
2. Go to **Settings → Integrations → API**.
3. Click **Generate** (or copy existing). Keys look like `AbCdEfGhIjKlMnOp`.

### Step 2: Save to Wiro

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Update" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "guid": "your-useragent-guid",
    "configuration": {
      "credentials": {
        "lemlist": {
          "apiKey": "YOUR_LEMLIST_API_KEY"
        }
      }
    }
  }'
```

### Step 3: Start the agent

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Start" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "guid": "your-useragent-guid" }'
```

## Credential Fields

| Field | Type | Description |
|-------|------|-------------|
| `apiKey` | string | Lemlist API key. |

## Troubleshooting

- **401 Unauthorized:** Key revoked in Lemlist settings. Regenerate.
- **403 on campaign operations:** Plan tier lacks API write access. Check Lemlist plan.
- **Email address not found:** Lead must exist in at least one campaign before some endpoints work — upload them first.

## Related

- [Agent Credentials & OAuth](/docs/agent-credentials)
- [Agent Overview](/docs/agent-overview)
- [Agent Skills](/docs/agent-skills)
- [Lemlist API docs](https://developer.lemlist.com/)


# Brevo Integration

Connect your agents to Brevo (formerly Sendinblue) for transactional and marketing email delivery.

## Overview

The Brevo integration uses a Brevo API v3 key for sending transactional emails, managing contact lists, and running email campaigns.

**Used by:** `newsletter-compose` and custom agents needing email sending.

**Agents that typically enable this integration:**

- Newsletter Manager

## Availability

| Mode | Status | Notes |
|------|--------|-------|
| API key (v3) | Available | Standard Brevo API v3 key. |

## Prerequisites

- **A Wiro API key** — see [Authentication](/docs/authentication).
- **A deployed agent** — see [Agent Overview](/docs/agent-overview).
- **A Brevo account** (free tier works for low volume).

## Setup

### Step 1: Get an API key

1. Sign in to [app.brevo.com](https://app.brevo.com/).
2. Click your profile (top right) → **SMTP & API → API Keys tab**.
3. Click **Generate a new API key**, name it "Wiro agent".
4. Copy the key (starts with `xkeysib-`).

### Step 2: Save to Wiro

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Update" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "guid": "your-useragent-guid",
    "configuration": {
      "credentials": {
        "brevo": {
          "apiKey": "xkeysib-xxxxxxxxxxxxxxxxxxxx"
        }
      }
    }
  }'
```

### Step 3: Start the agent

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Start" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "guid": "your-useragent-guid" }'
```

## Credential Fields

| Field | Type | Description |
|-------|------|-------------|
| `apiKey` | string | Brevo v3 API key (starts with `xkeysib-`). |

## Troubleshooting

- **401 Unauthorized:** Key was revoked or deleted. Generate a new one.
- **Emails go to spam:** Verify your sending domain under Brevo → Senders & IP → Domains. Set up SPF, DKIM, DMARC records as instructed.
- **Rate limit (429):** Brevo free tier is 300 emails/day. Upgrade plan if you exceed.

## Related

- [Agent Credentials & OAuth](/docs/agent-credentials)
- [Agent Overview](/docs/agent-overview)
- [Agent Skills](/docs/agent-skills)
- [Brevo API docs](https://developers.brevo.com/reference/getting-started-1)


# SendGrid Integration

Connect your agents to SendGrid for transactional and marketing email delivery.

## Overview

The SendGrid integration uses a Twilio SendGrid API key for sending transactional emails and managing lists.

**Used by:** `newsletter-compose` and custom agents needing email sending.

**Agents that typically enable this integration:**

- Newsletter Manager

## Availability

| Mode | Status | Notes |
|------|--------|-------|
| API key | Available | Twilio SendGrid API key. |

## Prerequisites

- **A Wiro API key** — see [Authentication](/docs/authentication).
- **A deployed agent** — see [Agent Overview](/docs/agent-overview).
- **A SendGrid account**.

## Setup

### Step 1: Create an API key

1. Sign in to [app.sendgrid.com](https://app.sendgrid.com/).
2. **Settings → API Keys → Create API Key**.
3. Name it "Wiro agent".
4. Choose permissions:
   - **Full Access** for maximum capability, or
   - **Restricted Access** and enable at minimum **Mail Send** + **Marketing Campaigns** (if applicable).
5. Click **Create & View**, copy the key once — it cannot be retrieved later.

### Step 2: Save to Wiro

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Update" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "guid": "your-useragent-guid",
    "configuration": {
      "credentials": {
        "sendgrid": {
          "apiKey": "SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
        }
      }
    }
  }'
```

### Step 3: Start the agent

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Start" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "guid": "your-useragent-guid" }'
```

## Credential Fields

| Field | Type | Description |
|-------|------|-------------|
| `apiKey` | string | SendGrid API key (starts with `SG.`). |

## Troubleshooting

- **401 Unauthorized:** Key deleted or permissions changed. Create a new key with appropriate scopes.
- **403 Forbidden on send:** Sender identity not verified. In SendGrid → Settings → Sender Authentication, verify your single sender or domain.
- **Emails delivered but flagged as spam:** Complete Domain Authentication (SPF + DKIM + DMARC) in SendGrid sender settings.

## Related

- [Agent Credentials & OAuth](/docs/agent-credentials)
- [Agent Overview](/docs/agent-overview)
- [Agent Skills](/docs/agent-skills)
- [SendGrid API docs](https://docs.sendgrid.com/api-reference/)

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
