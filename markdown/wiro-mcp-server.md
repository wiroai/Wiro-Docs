# Wiro MCP Server

Connect AI coding assistants to Wiro's AI models via the Model Context Protocol.

## What is MCP?

[Model Context Protocol](https://modelcontextprotocol.io/) (MCP) is an open standard that lets AI assistants use external tools directly. With the Wiro MCP server, your AI assistant can search models, run inference, track tasks, and upload files — all without leaving your editor. Every request uses your own API key — nothing is stored on the server.

The hosted MCP server is available at `https://mcp.wiro.ai/v1`. It works with MCP clients that support **Streamable HTTP plus custom request headers**, including Cursor, Claude Code, Claude Desktop, Windsurf, OpenClaw, and Hermes.

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

For an API Key Only project, use `Bearer YOUR_API_KEY` without the colon or
secret. Verify the connection with `claude mcp get wiro`, or run `/mcp` inside
Claude Code.

### Claude Desktop

Add the following to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "wiro": {
      "type": "http",
      "url": "https://mcp.wiro.ai/v1",
      "headers": {
        "Authorization": "Bearer YOUR_API_KEY:YOUR_API_SECRET"
      }
    }
  }
}
```

For API Key Only authentication, use `"Authorization": "Bearer YOUR_API_KEY"`.
Save the file, fully quit Claude Desktop, and reopen it.

The `type` field is required for URL-based entries. Without `"type": "http"`,
Claude treats the entry as a local stdio server and skips it as invalid.
To run Wiro locally instead, use the [`"type": "stdio"` + npx setup](/docs/mcp-self-hosted).

#### Claude connection and timeout troubleshooting

- **"Not valid MCP server configurations"** — ensure the remote entry contains
  `"type": "http"`, `url`, and `headers` exactly as shown above.
- **Opening `/v1` in a browser returns 405** — this is expected. MCP uses
  authenticated `POST` requests; the endpoint intentionally rejects `GET`.
- **A generation reaches Claude's tool timeout** — Wiro waits for at most 45
  seconds per call. If the task is still running, the response contains
  `nextAction.tool: "wait_for_task"`. Claude should execute that exact action
  until completion and must not call `run_model` again.
- Do not add a `timeout` field to `claude_desktop_config.json`; Claude Desktop
  versions with a fixed client-side tool timeout may ignore it. Wiro's bounded
  wait flow is designed to remain below that boundary.

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

### OpenClaw

Store your Wiro bearer value in the environment that starts OpenClaw:

```bash
export WIRO_MCP_AUTH="YOUR_API_KEY:YOUR_API_SECRET"
```

Then add this server under `mcp.servers` in your OpenClaw config:

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

Verify the saved definition, connection, and advertised tools:

```bash
openclaw mcp doctor wiro --probe
```

On older OpenClaw releases without the probe command, run
`openclaw mcp show wiro`, restart OpenClaw, and use `/tools verbose` to confirm
that the Wiro tools loaded.

Use only the API key as `WIRO_MCP_AUTH` for an API Key Only project. Wiro's default bounded wait is 45 seconds; if your client has a configurable tool-call timeout, keep it above that value.

### Hermes

Add the credential to `~/.hermes/.env`:

```bash
WIRO_MCP_AUTH=YOUR_API_KEY:YOUR_API_SECRET
```

Then add Wiro under `mcp_servers` in `~/.hermes/config.yaml`:

```yaml
mcp_servers:
  wiro:
    url: "https://mcp.wiro.ai/v1"
    headers:
      Authorization: "Bearer ${WIRO_MCP_AUTH}"
    timeout: 60
    connect_timeout: 10
```

Reload and inspect the discovered tools:

```text
/reload-mcp
/tools
```

Use only the API key in `WIRO_MCP_AUTH` for an API Key Only project.

### Other MCP Clients

The Wiro MCP server uses the **Streamable HTTP** transport at:

```
https://mcp.wiro.ai/v1
```

Authentication is via the `Authorization` header:

```
Authorization: Bearer YOUR_API_KEY:YOUR_API_SECRET
```

Any MCP client that supports Streamable HTTP **and a custom `Authorization` header** can connect. Refer to your client's documentation for the exact configuration format. Clients that require OAuth-only MCP authentication are not currently supported by this endpoint.

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

The MCP server exposes 13 tools organized in four categories. Your AI assistant picks the right tool automatically based on what you ask.

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
| `run_model` | Run any model. Waits up to 45 seconds by default, then returns a recoverable task token if still running |

### Task Management

| Tool | What it does |
|------|-------------|
| `wait_for_task` | Continue waiting for an existing task without creating or billing a duplicate run |
| `get_task` | Check task status immediately or wait up to 45 seconds with `wait_seconds` |
| `list_tasks` | List the authenticated project's recent generations across conversations, then continue with `get_task` |
| `get_task_price` | Get the cost of a completed task — shows whether it was billed and the total charge |
| `cancel_task` | Cancel a task that is still in the queue (before worker assignment) |
| `kill_task` | Kill a task that is currently running (after worker assignment) |

### Utility

| Tool | What it does |
|------|-------------|
| `upload_file` | Upload a file from a URL to Wiro. Most models accept direct URLs without uploading first — use this for reuse across runs. |
| `search_docs` | Search the Wiro documentation for guides, API references, and examples |

## MCP Request and Response Contract

Every tool advertises typed MCP `inputSchema` and `outputSchema` values. Successful calls return both:

- `structuredContent` for reliable LLM tool chaining,
- concise text `content` for clients that only render text,
- MCP resource links when a result contains generated media.

When a task completes with media, Wiro also returns an assistant-audience
delivery instruction. MCP clients do not all preview `resource_link` blocks
inside tool cards, so the assistant is explicitly told to render image URLs and
preserve clickable video, audio, and file links in its user-facing response.
The standard resource link and full-resolution URL remain available without
embedding a large base64 payload.

For example, an LLM submits one generation:

```json
{
  "name": "run_model",
  "arguments": {
    "model": "owner/model",
    "params": { "prompt": "A mountain lake at sunset" },
    "wait": true,
    "timeout_seconds": 45
  }
}
```

If the generation outlives that bounded wait, `run_model` returns the existing task instead of failing or submitting it again:

```json
{
  "state": "running",
  "task": {
    "id": "123",
    "token": "task-token",
    "status": "task_start"
  },
  "outputs": [],
  "nextAction": {
    "tool": "wait_for_task",
    "arguments": { "tasktoken": "task-token" },
    "reason": "Continue this exact task. Do not call run_model again."
  }
}
```

Task responses use stable states: `submitted`, `running`, `completed`, `failed`, and `cancelled`. The LLM should execute `nextAction` when present. A two- or three-minute video can therefore use several bounded `wait_for_task` calls without creating another billable generation.

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
2. Use `run_model` to submit the generation and wait for the first result window
3. If it is still running, continue with `wait_for_task` using the returned token

### Find the right model

> "What models are available for text-to-video?"

The assistant will call `search_models` with `categories: ["text-to-video"]` and return a list of available models.

### Check task status

> "Check the status of my last task"

The assistant will call `get_task` with the task token from the previous run.

### Resume a production from another conversation

> "Show my latest productions and open the newest result"

The assistant will call `list_tasks`, select the matching task, and call `get_task` with its task ID. Task history is scoped from the authenticated project; the LLM never sends a user UUID.

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
| `wait` | boolean (optional) | If `true` (default), polls `POST /Task/Detail` until the task completes or the wait budget expires. If `false`, returns the task token immediately for `wait_for_task` or one-time `get_task` checks. |
| `timeout_seconds` | number (optional) | Max seconds to wait (default 45, max 600). Only applies when `wait=true`. Values above 45 should only be used when the MCP client timeout is configured accordingly. |

When `wait=true`, the tool returns the final task result including `pexit` (exit code, `"0"` = success), `outputs` (clickable CDN URLs for generated files), and `debugoutput` (LLM text responses).

If the wait budget expires, the tool returns a normal **Task Still Running**
result containing `taskid`, `tasktoken`, and the last observed status. The
generation continues. Call `wait_for_task` with that identifier; do not call
`run_model` again, because that would create a second billable task.

When `wait=false`, returns `taskid` and `tasktoken` immediately — use
`wait_for_task` to wait or `get_task` for a one-time status check.

### wait_for_task

Wait for an existing task without submitting another model run. Calls
`POST /Task/Detail` repeatedly for a bounded interval.

| Parameter | Type | Description |
|-----------|------|-------------|
| `tasktoken` | string (optional) | The task token returned from `run_model` |
| `taskid` | string (optional) | The task ID (alternative to `tasktoken`) |
| `timeout_seconds` | number (optional) | Max seconds for this wait window (default 45, max 600) |

If the task completes, this tool returns the final text and file outputs. If it
is still active, it returns the same identifier so the assistant can call
`wait_for_task` again in the same conversation. This continuation does not
create or bill another model run.

### get_task

Check task status and get results. It performs one immediate check by default,
or a short bounded wait when `wait_seconds` is set. Calls `POST /Task/Detail`
on the Wiro API.

| Parameter | Type | Description |
|-----------|------|-------------|
| `tasktoken` | string (optional) | The task token returned from `run_model` |
| `taskid` | string (optional) | The task ID (alternative to tasktoken) |
| `wait_seconds` | number (optional) | Short bounded wait before returning (default 0, max 45). Use `wait_for_task` for resumable long generations. |

Returns the task's current `status`, `pexit` (process exit code), `outputs` (file URLs), `debugoutput` (LLM responses), `elapsedseconds`, and `totalcost`.

**Determining success:** Check `pexit` — `"0"` means success, any other value means failure. For LLM models, the response is available as structured content in `outputs` (with `contenttype: "raw"`) and as merged plain text in `debugoutput`. See [Tasks](/docs/tasks) for the full task lifecycle.

`task_error` needs context: a live WebSocket event with that name is an interim
stderr log, while `status: "task_error"` returned by Task/Detail represents a
fatal pre-execution database state and is terminal.

### list_tasks

List recent model-generation tasks owned by the authenticated project. Calls `POST /Task/List` without a `uuid`; Wiro derives the owner from the API credential.

| Parameter | Type | Description |
|-----------|------|-------------|
| `start` | number (optional) | Pagination offset (default 0) |
| `limit` | number (optional) | Maximum tasks to return (default 20, max 100) |
| `model` | string (optional) | Model slug or partial model-name filter |

Returns newest-first task summaries with stable state, model, task ID, timestamps, duration, cost, and limited output links. Call `get_task` with a returned `taskid` for the complete result.

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
| `tasktoken` | string (optional) | The task token returned from `run_model` |
| `taskid` | string (optional) | The task ID (alternative to `tasktoken`) |

Tasks that have already been assigned to a worker cannot be cancelled — use `kill_task` instead.

### kill_task

Kill a task that is currently running (after worker assignment). Calls `POST /Task/Kill` on the Wiro API.

| Parameter | Type | Description |
|-----------|------|-------------|
| `tasktoken` | string (optional) | The task token returned from `run_model` |
| `taskid` | string (optional) | The task ID (alternative to `tasktoken`) |

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

The hosted MCP endpoint applies a 60-request-per-minute guard per Authorization value, in addition to Wiro API project limits. Long generations do not require rapid polling: follow the returned bounded `wait_for_task` action.

### Can I self-host?

Yes. See the [Self-Hosted MCP](/docs/mcp-self-hosted) page for instructions on running the MCP server locally or on your own infrastructure.
