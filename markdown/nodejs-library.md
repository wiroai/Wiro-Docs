# Node.js Library

Use Wiro AI models directly in your Node.js or TypeScript projects with a simple API client.

## Overview

The [`@wiro-ai/wiro-mcp`](https://www.npmjs.com/package/@wiro-ai/wiro-mcp) package exports a `WiroClient` class that you can use as a standalone API client — no MCP setup required. It handles authentication (both signature-based and API key only), model discovery, execution, task polling, and file uploads.

### Links

- [npm: @wiro-ai/wiro-mcp](https://www.npmjs.com/package/@wiro-ai/wiro-mcp)
- [GitHub: wiroai/Wiro-MCP](https://github.com/wiroai/Wiro-MCP)
- [Create API Key](https://wiro.ai/panel/project/new)

## Installation

```bash
npm install @wiro-ai/wiro-mcp
```

Requires Node.js 18 or later.

## Quick Start

```javascript
import { WiroClient } from '@wiro-ai/wiro-mcp/client';

const client = new WiroClient('YOUR_API_KEY', 'YOUR_API_SECRET');

// Run an image generation model
const run = await client.runModel('google/nano-banana-pro', {
  prompt: 'A futuristic city at sunset',
  aspectRatio: '16:9',
  resolution: '2K'
});

if (!run.result) {
  console.log('Run failed:', run.errors);
  process.exit(1);
}

// Wait for the result (polls Task/Detail until complete)
const result = await client.waitForTask(run.socketaccesstoken);
const task = result.tasklist[0];

if (task.pexit === '0') {
  console.log('Output:', task.outputs[0].url);
} else {
  console.log('Failed:', task.pexit);
}
```

## Authentication

The client supports both Wiro authentication methods:

### Signature-Based (Recommended)

Provide both API key and secret. HMAC-SHA256 signatures are generated automatically per request.

```javascript
const client = new WiroClient('your-api-key', 'your-api-secret');
```

### API Key Only

Omit the secret for simpler server-side usage.

```javascript
const client = new WiroClient('your-api-key');
```

### Custom Base URL

Override the API endpoint if needed (third parameter):

```javascript
const client = new WiroClient('key', 'secret', 'https://custom-api.example.com/v1');
```

## Available Methods

| Method | Description |
|--------|-------------|
| `searchModels(params?)` | Search and browse models by keyword, category, or owner. |
| `getModelSchema(model)` | Get full parameter schema and pricing for a model. |
| `explore()` | Browse curated models organized by category. |
| `runModel(model, params)` | Run a model. Returns task ID and socket access token. |
| `waitForTask(tasktoken, timeoutMs?)` | Poll until the task completes. Default timeout: 120 seconds. |
| `getTask({ tasktoken?, taskid? })` | Get current task status and outputs. |
| `cancelTask(tasktoken)` | Cancel a task still in the queue. |
| `killTask(tasktoken)` | Kill a running task. |
| `uploadFile(url, fileName?)` | Upload a file from a URL for use as model input. |

## Examples

### Search Models

```javascript
const models = await client.searchModels({
  search: 'image generation',
  categories: ['text-to-image'],
  limit: 5
});

for (const model of models.tool) {
  console.log(`${model.cleanslugowner}/${model.cleanslugproject} — ${model.title}`);
}
```

### Get Model Parameters

```javascript
const detail = await client.getModelSchema('google/nano-banana-pro');
const model = detail.tool[0];

if (model.parameters) {
  console.log('Parameters:');
  for (const group of model.parameters) {
    for (const param of group.items) {
      console.log(`  ${param.id} (${param.type}) ${param.required ? '— required' : ''}`);
    }
  }
}
```

### Run an LLM

```javascript
const run = await client.runModel('openai/gpt-5-2', {
  prompt: 'Explain quantum computing in 3 sentences'
});

const result = await client.waitForTask(run.socketaccesstoken);
const task = result.tasklist[0];

if (task.pexit === '0') {
  // Merged text
  console.log(task.debugoutput);

  // Structured thinking/answer
  const output = task.outputs[0];
  if (output.contenttype === 'raw') {
    console.log('Thinking:', output.content.thinking);
    console.log('Answer:', output.content.answer);
  }
}
```

### Upload a File and Use It

```javascript
// Upload an image
const upload = await client.uploadFile('https://example.com/photo.jpg');
const fileUrl = upload.list[0].url;

// Use it in a model run
const run = await client.runModel('wiro/virtual-try-on', {
  inputImageHuman: fileUrl,
  inputImageClothes: 'https://example.com/shirt.jpg'
});

const result = await client.waitForTask(run.socketaccesstoken);
console.log('Output:', result.tasklist[0].outputs[0].url);
```

### Poll Manually

```javascript
const run = await client.runModel('klingai/kling-v3', {
  prompt: 'A drone shot over mountains',
  duration: '5',
  aspectRatio: '16:9'
});

// Poll manually instead of using waitForTask
const interval = setInterval(async () => {
  const detail = await client.getTask({ tasktoken: run.socketaccesstoken });
  const task = detail.tasklist[0];
  console.log('Status:', task.status);

  if (task.status === 'task_postprocess_end') {
    clearInterval(interval);
    if (task.pexit === '0') {
      console.log('Video:', task.outputs[0].url);
    }
  }
}, 5000);
```

## TypeScript

All types are exported from the package:

```typescript
import { WiroClient } from '@wiro-ai/wiro-mcp/client';
import type {
  RunModelResult,
  TaskDetailResponse,
  Task,
  TaskOutput,
  ToolListResponse,
  ToolDetailResponse,
  ToolListItem,
  SearchModelsParams,
} from '@wiro-ai/wiro-mcp/client';
```

| Type | Description |
|------|-------------|
| `RunModelResult` | Response from `runModel()` — `taskid`, `socketaccesstoken`. |
| `TaskDetailResponse` | Response from `getTask()` / `waitForTask()` — contains `tasklist` array. |
| `Task` | Individual task object — `status`, `pexit`, `outputs`, `debugoutput`, etc. |
| `TaskOutput` | Output entry — file (`name`, `url`) or LLM (`contenttype: "raw"`, `content`). |
| `ToolListResponse` | Response from `searchModels()` — contains `tool` array. |
| `ToolDetailResponse` | Response from `getModelSchema()` — contains model with parameters. |
| `SearchModelsParams` | Search parameters — `search`, `categories`, `slugowner`, `limit`, etc. |
