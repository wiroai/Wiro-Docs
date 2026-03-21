# Wiro API Documentation

Complete API documentation for the Wiro AI platform — run 1,000+ AI models through a unified API.

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
12. [Code Examples](#code-examples)

---

# Introduction

Everything you need to get started with the Wiro AI platform.

## What is Wiro?

Wiro is an AI model marketplace and API platform that lets you run **1,000+ AI models** through a single, unified API. Instead of managing infrastructure for each model provider, you make one API call to Wiro and we handle the rest.

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

> **Note:** LLM responses are delivered via `debugoutput` in the task result, not in the `outputs` file array. See [Tasks](#/tasks) for details.

### Realtime Voice Conversation

Realtime voice models accept configuration parameters (voice, system instructions, audio format, etc.) as JSON. Parameters vary per model — use `/Tool/Detail` to discover them. The actual audio interaction happens over [WebSocket](#/realtime-voice-conversation) after the task starts:

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

`task_queue` → `task_accept` → `task_assign` → `task_preprocess_start` → `task_preprocess_end` → `task_start` → `task_output` → `task_end` → `task_postprocess_start` → `task_postprocess_end`

## Task Statuses

| Status                   | Description                                                                                                                                                                                                                                                                     |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `task_queue`             | The task is queued and waiting to be picked up by an available worker. Emitted once when the task enters the queue.                                                                                                                                                             |
| `task_accept`            | A worker has accepted the task. The task is no longer in the general queue and is being prepared for execution.                                                                                                                                                                 |
| `task_assign`            | The task has been assigned to a specific GPU. The model is being loaded into memory. This may take a few seconds depending on the model size.                                                                                                                                   |
| `task_preprocess_start`  | Optional preprocessing has started. This includes operations like downloading input files from URLs, converting file types, and validating/formatting parameters before the model runs. Not all models require preprocessing.                                                   |
| `task_preprocess_end`    | Preprocessing completed. All inputs are ready and the model is about to start execution.                                                                                                                                                                                        |
| `task_start`             | The model command has started executing. Inference is now running on the GPU.                                                                                                                                                                                                   |
| `task_output`            | The model is producing output. This event is emitted **multiple times** — each time the model writes to stdout, a new `task_output` message is sent via WebSocket. For LLM models, each token/chunk arrives as a separate `task_output` event, enabling real-time streaming.    |
| `task_error`             | The model wrote to stderr. This is an **interim log event**, not a final failure — many models write warnings or debug info to stderr during normal operation. The task may still complete successfully. Always wait for `task_postprocess_end` to determine the actual result. |
| `task_output_full`       | The complete accumulated stdout log, sent once after the model process finishes. Contains the full output history in a single message.                                                                                                                                          |
| `task_error_full`      | The complete accumulated stderr log, sent once after the model process finishes.                                                                                                                                                                                                |
| `task_end`               | The model process has exited. Emitted once. This fires **before** post-processing — do not use this event to determine success. Wait for `task_postprocess_end` instead.                                                                                                        |
| `task_postprocess_start` | Post-processing has started. The system is preparing the output files — encoding, uploading to CDN, and generating access URLs.                                                                                                                                                 |
| `task_postprocess_end`   | Post-processing completed. Check `pexit` to determine success: `"0"` = success, any other value = error. The `outputs` array contains the final files with CDN URLs, content types, and sizes. **This is the event you should listen for** to get the final results.            |
| `task_cancel`            | The task was cancelled (if queued) or killed (if running) by the user.                                                                                                                                                                                                          |

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

> **Note:** For **LLM models**, `outputs` will be empty even on success — the response text is delivered via `debugoutput` instead. Always use `pexit` as the primary success check.

```json
// Success (image/audio model): pexit "0", outputs present
{
  "pexit": "0",
  "outputs": [{ "name": "0.png", "url": "https://cdn1.wiro.ai/..." }]
}

// Success (LLM model): pexit "0", outputs empty, response in debugoutput
{
  "pexit": "0",
  "outputs": [],
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

For LLM (Large Language Model) requests, the model's response is written to `debugoutput` rather than the `outputs` file array. When polling with Task Detail, read the `debugoutput` field to get the LLM's text response.

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

---

# LLM & Chat Streaming

Stream LLM responses in real time with thinking/answer separation, session history, and multi-turn conversations.

## Overview

LLM (Large Language Model) requests on Wiro work differently from standard model runs:

- Responses are delivered via `debugoutput`, not the `outputs` file array
- Streaming `task_output` messages contain structured `thinking` and `answer` arrays — not plain strings
- Multi-turn conversations are supported via `session_id` and `user_id` parameters
- `pexit` is the primary success indicator (outputs will be empty)

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

When streaming via WebSocket, `task_output` messages for LLM models contain a structured object:

```json
{
  "type": "task_output",
  "id": "534574",
  "tasktoken": "eDcCm5yy...",
  "message": {
    "thinking": ["Let me analyze this step by step...", "The key factors are..."],
    "answer": ["Quantum computing uses qubits that can exist in superposition..."]
  }
}
```

| Field              | Type       | Description                                                     |
| ------------------ | ---------- | --------------------------------------------------------------- |
| `message.thinking` | `string[]` | Array of reasoning/chain-of-thought chunks. May be empty.       |
| `message.answer`   | `string[]` | Array of response chunks. This is the content to show the user. |
| `message.raw`      | `string`   | Optional raw output before thinking/answer separation.          |

> **Note:** Standard (non-LLM) models send `message` as a plain string. LLM models send it as a `{ thinking, answer }` object. Check the type before parsing.

## Streaming Flow

1. **Run** the model with `prompt`, `session_id`, and `user_id`
2. **Connect** to WebSocket and send `task_info`
3. **Receive** `task_output` messages — each contains the growing `thinking` and `answer` arrays
4. **Display** the latest `answer` array content to the user (optionally show `thinking` in a collapsible section)
5. **Complete** — on `task_postprocess_end`, check `pexit` for success

Each `task_output` event contains the **full accumulated** thinking and answer arrays — not just the new chunk. Simply replace your displayed content with the latest arrays.

## Polling Alternative

If you don't need real-time streaming, poll `POST /Task/Detail` instead. The final response will be in `debugoutput` as merged plain text:

```json
{
  "result": true,
  "tasklist": [
    {
      "status": "task_postprocess_end",
      "pexit": "0",
      "debugoutput": "Quantum computing uses qubits that can exist in superposition...",
      "outputs": []
    }
  ]
}
```

> **Note:** When polling, `debugoutput` contains the merged text. To access separate `thinking` and `answer` arrays, use WebSocket streaming instead.

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
4. **Close** — disconnect after the `task_end` event

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
| `task_queue`             | The task is queued and waiting to be picked up by an available worker. |
| `task_accept`            | A worker has accepted the task. The task is no longer in the general queue and is being prepared for execution. |
| `task_assign`            | The task has been assigned to a specific GPU. The model is being loaded into memory. |
| `task_preprocess_start`  | Optional preprocessing has started (downloading input files from URLs, converting file types, validating parameters). |
| `task_preprocess_end`    | Preprocessing completed. All inputs are ready and the model is about to start execution. |
| `task_start`             | The model command has started executing. Inference is now running on the GPU. |
| `task_output`            | The model is producing output. Emitted **multiple times** — each stdout write sends a new message. For LLMs, each token/chunk arrives as a separate event for real-time streaming. |
| `task_error`             | The model wrote to stderr. This is an **interim log event**, not a final failure — many models write warnings to stderr during normal operation. The task may still succeed. |
| `task_output_full`       | The complete accumulated stdout log, sent once after the model process finishes. |
| `task_error_full`      | The complete accumulated stderr log, sent once after the model process finishes. |
| `task_end`               | The model process has exited. Fires **before** post-processing — do not use this to determine success. Wait for `task_postprocess_end` instead. |
| `task_postprocess_start` | Post-processing has started. The system is preparing output files — encoding, uploading to CDN, generating access URLs. |
| `task_postprocess_end`   | Post-processing completed. Check `pexit` to determine success (`"0"` = success). The `outputs` array contains the final files. **This is the event to listen for.** |
| `task_cancel`            | The task was cancelled (if queued) or killed (if running) by the user. |

## Binary Frames

For **realtime voice models**, the WebSocket may send binary frames containing raw audio data. Check if the received message is a `Blob` (browser) or `Buffer` (Node.js) before parsing as JSON.

## Ending a Session

For realtime/streaming models that maintain a persistent session, send an `end_session` message to gracefully terminate:

```json
{
  "type": "task_session_end",
  "tasktoken": "your-socket-access-token"
}
```

After sending this, wait for the `task_end` event before closing the connection.

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
| `task_cost`         | Cost update with `turnCost` and `cumulativeCost` fields                  |
| `task_output`       | Transcript messages prefixed with `TRANSCRIPT_USER:` or `TRANSCRIPT_AI:` |
| `task_end`          | Session fully ended — close the connection                               |

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

After sending this, the server will process any remaining audio, send final cost/transcript events, and then emit `task_end`. Wait for `task_end` before closing the WebSocket.

> **Note:** Realtime models use `task_session_end` (not `end_session` used by standard streaming models).

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
| `name`     | string | Yes      | Folder name                                           |
| `parentId` | string | No       | Parent folder ID for nested structure (null for root) |

### Response

```json
{
  "result": true,
  "errors": [],
  "data": {
    "id": "folder-abc123",
    "name": "training-data",
    "parentId": null,
    "createdAt": "2025-01-15T10:00:00Z"
  }
}
```

## **POST** /File/Upload

Uploads a file using `multipart/form-data`. You can optionally assign it to a folder.

| Parameter  | Type   | Required | Description                                   |
| ---------- | ------ | -------- | --------------------------------------------- |
| `file`     | file   | Yes      | The file to upload (multipart form field)     |
| `folderId` | string | No       | Target folder ID (uploads to root if omitted) |

### Response

```json
{
  "result": true,
  "errors": [],
  "data": {
    "id": "file-xyz789",
    "name": "dataset.csv",
    "size": 1048576,
    "mimeType": "text/csv",
    "folderId": "folder-abc123",
    "url": "https://files.wiro.ai/...",
    "createdAt": "2025-01-15T10:05:00Z"
  }
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
