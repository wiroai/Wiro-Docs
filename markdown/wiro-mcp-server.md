# Wiro MCP Server

Connect AI coding assistants to Wiro's AI models via the Model Context Protocol.

## What is MCP?

[Model Context Protocol](https://modelcontextprotocol.io/) (MCP) is an open standard that lets AI assistants use external tools directly. With the Wiro MCP server, your AI assistant can search models, run inference, track tasks, and upload files — all without leaving your editor. Every request uses your own API key — nothing is stored on the server.

The hosted MCP server is available at `https://mcp.wiro.ai/v1` and works with any MCP-compatible client, including Cursor, Claude Code, Claude Desktop, and Windsurf.

You need a Wiro API key to use the MCP server. If you don't have one yet, [create a project here](https://wiro.ai/panel/project/new).

### Links

- [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) — open standard specification
- [GitHub: wiroai/Wiro-MCP](https://github.com/wiroai/Wiro-MCP) — source code & self-hosting instructions
- [npm: @wiro-ai/wiro-mcp](https://www.npmjs.com/package/@wiro-ai/wiro-mcp) — npm package
- [Wiro Model Catalog](https://wiro.ai/models) — browse all available models
- [Create API Key](https://wiro.ai/panel/project/new) — get started in seconds

## Setup

### Cursor

1. **Open MCP Settings** — Use `Cmd+Shift+P` (`Ctrl+Shift+P` on Windows) and search for **"Open MCP settings"**.

2. **Add the Wiro server** — Add the following to your `mcp.json` file:

**Signature Auth** (if your project uses signature-based authentication):

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

**API Key Only Auth** (if your project uses API Key Only authentication):

```json
{
  "mcpServers": {
    "wiro": {
      "url": "https://mcp.wiro.ai/v1",
      "headers": {
        "Authorization": "Bearer YOUR_API_KEY"
      }
    }
  }
}
```

3. **Restart Cursor** — Save the file and restart Cursor to activate the connection.

### Claude Code

Run this command in your terminal:

```bash
claude mcp add --transport http wiro \
  https://mcp.wiro.ai/v1 \
  --header "Authorization: Bearer YOUR_API_KEY:YOUR_API_SECRET"
```

That's it. Claude Code will now have access to all Wiro tools.

### Claude Desktop

Add the following to your `claude_desktop_config.json`:

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

### Windsurf

Open **Settings → MCP** and add a new server:

```json
{
  "mcpServers": {
    "wiro": {
      "serverUrl": "https://mcp.wiro.ai/v1",
      "headers": {
        "Authorization": "Bearer YOUR_API_KEY:YOUR_API_SECRET"
      }
    }
  }
}
```

### Other MCP Clients

The Wiro MCP server uses the **Streamable HTTP** transport at:

```
https://mcp.wiro.ai/v1
```

Authentication is via the `Authorization` header:

```
Authorization: Bearer YOUR_API_KEY:YOUR_API_SECRET
```

Any MCP client that supports Streamable HTTP transport can connect. Refer to your client's documentation for the exact configuration format.

## Authentication

The MCP server supports both Wiro [authentication types](/docs/authentication). Your project's auth type determines what credentials you provide.

### Signature-Based (Recommended)

More secure. Requires both API key and API secret. Pass them as `key:secret` in the Authorization header:

```
Authorization: Bearer YOUR_API_KEY:YOUR_API_SECRET
```

### API Key Only

Simpler. Only requires the API key:

```
Authorization: Bearer YOUR_API_KEY
```

Your credentials are sent per-request in the Authorization header and are never stored. The server is fully stateless.

## Available Tools

The MCP server exposes 11 tools organized in four categories. Your AI assistant picks the right tool automatically based on what you ask.

**Model slugs:** When a tool requires a model identifier, use the clean/lowercase format `owner/model` (e.g. `openai/sora-2`, `wiro/virtual-try-on`). These correspond to the `cleanslugowner/cleanslugproject` values returned by `search_models`.

### Discovery

| Tool | What it does |
|------|-------------|
| `search_models` | Search Wiro's model catalog by keyword, category, or owner |
| `get_model_schema` | Get the full parameter schema and pricing for any model |
| `recommend_model` | Describe what you want to build and get model recommendations ranked by relevance |
| `explore` | Browse curated AI models organized by category — featured, recently added, popular |

### Execution

| Tool | What it does |
|------|-------------|
| `run_model` | Run any model. Wait for the result or return a task token for async monitoring |

### Task Management

| Tool | What it does |
|------|-------------|
| `get_task` | Check task status, outputs, cost, and elapsed time |
| `get_task_price` | Get the cost of a completed task — shows whether it was billed and the total charge |
| `cancel_task` | Cancel a task that is still in the queue (before worker assignment) |
| `kill_task` | Kill a task that is currently running (after worker assignment) |

### Utility

| Tool | What it does |
|------|-------------|
| `upload_file` | Upload a file from a URL to Wiro. Most models accept direct URLs without uploading first — use this for reuse across runs. |
| `search_docs` | Search the Wiro documentation for guides, API references, and examples |

## Examples

### Generate an image

> "Generate a photorealistic image of a mountain lake at golden hour"

The assistant will:
1. Use `search_models` to find image generation models
2. Use `get_model_schema` to check the parameters
3. Use `run_model` to generate the image
4. Return the image URL

### Generate a video

> "Create a 5-second cinematic video of a drone shot over mountains using Kling V3"

The assistant will:
1. Use `get_model_schema` to check parameters for `klingai/kling-v3`
2. Use `run_model` with `wait=false` (video generation takes longer)
3. Use `get_task` to poll for the result

### Find the right model

> "What models are available for text-to-video?"

The assistant will call `search_models` with `categories: ["text-to-video"]` and return a list of available models.

### Check task status

> "Check the status of my last task"

The assistant will call `get_task` with the task token from the previous run.

## How It Works

The MCP server is stateless and hosted on Wiro infrastructure. Each request is fully isolated:

1. Your AI assistant sends a request to `mcp.wiro.ai/v1` with your credentials
2. The server calls the [Wiro API](https://wiro.ai/docs) on your behalf
3. Results are returned to your assistant

Your credentials are sent per-request in the `Authorization` header and are never stored. The server has no sessions and no state.

All tools are dynamic — they fetch model data from the Wiro API at runtime. When a new model is added to Wiro, it's instantly available through MCP.

## Tool Reference

### search_models

Search Wiro's model catalog by keyword, category, owner, or any combination. Calls `POST /Tool/List` on the Wiro API.

| Parameter | Type | Description |
|-----------|------|-------------|
| `search` | string (optional) | Free-text search, e.g. `"flux"`, `"video generation"` |
| `categories` | string[] (optional) | Filter by category: `text-to-image`, `text-to-video`, `image-to-video`, `llm`, `text-to-speech`, `image-editing`, etc. |
| `slugowner` | string (optional) | Filter by model owner slug, e.g. `"openai"`, `"stability-ai"`, `"klingai"` |
| `sort` | string (optional) | Sort by: `relevance`, `time`, `ratedusercount`, `commentcount`, `averagepoint` |
| `start` | number (optional) | Pagination offset (default 0) |
| `limit` | number (optional) | Max results (default 20, max 100) |

Returns a list of models with their `cleanslugowner/cleanslugproject` (the slug you pass to other tools), title, description, categories, and pricing.

### get_model_schema

Get the full parameter schema for a specific model. Calls `POST /Tool/Detail` on the Wiro API.

| Parameter | Type | Description |
|-----------|------|-------------|
| `model` | string | Model slug using clean/lowercase format: `"owner/model"`. Use `cleanslugowner/cleanslugproject` from `search_models`. Examples: `"openai/sora-2"`, `"black-forest-labs/flux-2-pro"`, `"wiro/virtual-try-on"` |

Returns the model's parameter groups, each containing items with `id`, `type` (text, textarea, select, range, fileinput, etc.), `label`, `required`, `options`, `default`, and `note`. Also includes pricing information. Use these to construct the `params` object for `run_model`.

### recommend_model

Describe what you want to create and get model recommendations ranked by relevance. Calls `POST /Tool/List` on the Wiro API with relevance sorting.

| Parameter | Type | Description |
|-----------|------|-------------|
| `task` | string | What you want to do, e.g. `"generate a photorealistic portrait"`, `"upscale an image to 4K"`, `"transcribe audio to text"` |

Returns a list of recommended models with slugs, descriptions, categories, and pricing — sorted by relevance to your task.

### explore

Browse curated AI models on Wiro, organized by category. Calls `POST /Tool/Explore` on the Wiro API. No parameters required.

Returns models grouped into curated sections like "Recently Added", "Image Generation", "Video", etc. Each model includes its slug, description, categories, and rating. Use this to discover what's available without searching.

### run_model

Run any AI model on Wiro. Calls `POST /Run/{owner}/{model}` on the Wiro API.

| Parameter | Type | Description |
|-----------|------|-------------|
| `model` | string | Model slug in clean/lowercase format. Same as `get_model_schema`. Examples: `"openai/sora-2"`, `"klingai/kling-v3"` |
| `params` | object | Model-specific parameters as key-value pairs. Use `get_model_schema` to discover accepted fields. Common: `prompt`, `negativePrompt`, `width`, `height`, `aspectRatio` |
| `wait` | boolean (optional) | If `true` (default), polls `POST /Task/Detail` until the task completes and returns the result. If `false`, returns the task token immediately for async monitoring via `get_task`. |
| `timeout_seconds` | number (optional) | Max seconds to wait (default 120, max 600). Only applies when `wait=true`. |

When `wait=true`, the tool returns the final task result including `pexit` (exit code, `"0"` = success), `outputs` (CDN URLs for generated files), and `debugoutput` (LLM text responses).

When `wait=false`, returns `taskid` and `tasktoken` — use `get_task` to check progress.

### get_task

Check task status and get results. Calls `POST /Task/Detail` on the Wiro API.

| Parameter | Type | Description |
|-----------|------|-------------|
| `tasktoken` | string (optional) | The task token returned from `run_model` |
| `taskid` | string (optional) | The task ID (alternative to tasktoken) |

Returns the task's current `status`, `pexit` (process exit code), `outputs` (file URLs), `debugoutput` (LLM responses), `elapsedseconds`, and `totalcost`.

**Determining success:** Check `pexit` — `"0"` means success, any other value means failure. For LLM models, the response is available as structured content in `outputs` (with `contenttype: "raw"`) and as merged plain text in `debugoutput`. See [Tasks](/docs/tasks) for the full task lifecycle.

### get_task_price

Get the cost of a completed task. Calls `POST /Task/Detail` on the Wiro API and returns billing information.

| Parameter | Type | Description |
|-----------|------|-------------|
| `tasktoken` | string (optional) | The task token returned from `run_model` |
| `taskid` | string (optional) | The task ID (alternative to tasktoken) |

Returns the task's billing status, total cost, and duration. Only successful tasks (`pexit: "0"`) are billed — failed tasks show `$0` with a clear explanation. Useful for checking costs after a run completes.

### cancel_task

Cancel a task that is still queued (before worker assignment). Calls `POST /Task/Cancel` on the Wiro API.

| Parameter | Type | Description |
|-----------|------|-------------|
| `tasktoken` | string | The task token to cancel |

Tasks that have already been assigned to a worker cannot be cancelled — use `kill_task` instead.

### kill_task

Kill a task that is currently running (after worker assignment). Calls `POST /Task/Kill` on the Wiro API.

| Parameter | Type | Description |
|-----------|------|-------------|
| `tasktoken` | string | The task token to kill |

The worker will stop processing and the task will move to `task_cancel` status.

### upload_file

Upload a file from a URL to Wiro for use as model input. Downloads the file and uploads it to Wiro's file system via `POST /File/Upload`.

> **Tip:** Most models accept direct URLs in file parameters (e.g. `inputImage`, `inputImageUrl`) — you don't need to upload first. Use `upload_file` when you need to reuse the same file across multiple runs or when the model specifically requires a Wiro-hosted file. See [Model Parameters](/docs/model-parameters) for details.

| Parameter | Type | Description |
|-----------|------|-------------|
| `url` | string | URL of the file to upload (image, audio, video, document) |
| `file_name` | string (optional) | Custom filename for the upload. If not provided, derived from the URL. |

Returns the uploaded file's Wiro URL, which can be passed to any model parameter that accepts a file (e.g. `inputImage`, `inputAudio`).

### search_docs

Search the Wiro documentation for guides, API references, and code examples.

| Parameter | Type | Description |
|-----------|------|-------------|
| `query` | string | What you're looking for, e.g. `"how to upload a file"`, `"websocket"`, `"authentication"`, `"LLM streaming"` |

Returns relevant documentation sections matching your query.

## FAQ

### What models can I use?

All models in the [Wiro catalog](https://wiro.ai/models) — image generation, video, audio, LLMs, 3D, and more. Use `search_models` to discover what's available.

### Is my API key stored?

No. The server is fully stateless. Your credentials are sent per-request and never stored or logged.

### Does it cost extra?

No. The MCP server is free. You only pay for the model runs you trigger, at standard [Wiro pricing](https://wiro.ai/pricing).

### What about rate limits?

The MCP server respects the same rate limits as direct API calls. There are no additional limits on the MCP endpoint.

### Can I self-host?

Yes. See the [Self-Hosted MCP](/docs/mcp-self-hosted) page for instructions on running the MCP server locally or on your own infrastructure.
