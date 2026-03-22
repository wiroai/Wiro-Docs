# Self-Hosted MCP

Run the Wiro MCP server locally on your own machine using npx. No server setup required.

## Quick Start

Add to your AI assistant's MCP config:

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

That's it. Your assistant now has access to all 70+ Wiro AI models.

## Setup

### Cursor

Open MCP settings (`Cmd+Shift+P` → "Open MCP settings") and add the config above.

### Claude Code

```bash
claude mcp add wiro -- npx -y @wiro-ai/wiro-mcp
```

Then set `WIRO_API_KEY` and `WIRO_API_SECRET` environment variables.

### Claude Desktop

Add to `claude_desktop_config.json`:

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

### Windsurf

Add to your MCP settings:

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

## Authentication

The self-hosted MCP server supports both Wiro [authentication types](/docs/authentication) via environment variables.

### Signature-Based (Recommended)

Provide both API key and API secret:

```
WIRO_API_KEY=your-api-key
WIRO_API_SECRET=your-api-secret
```

### API Key Only

Provide only the API key. Omit `WIRO_API_SECRET`:

```
WIRO_API_KEY=your-api-key
```

## Available Tools

The self-hosted server provides the same 11 tools as the [hosted MCP server](/docs/wiro-mcp-server). Your AI assistant picks the right tool automatically.

**Model slugs:** When a tool requires a model identifier, use the clean/lowercase format `owner/model` (e.g. `openai/sora-2`, `wiro/virtual-try-on`). These correspond to `cleanslugowner/cleanslugproject` values returned by `search_models`.

### Discovery

| Tool | API Endpoint | What it does |
|------|-------------|-------------|
| `search_models` | `POST /Tool/List` | Search and browse AI models by keyword, category, or owner. Returns model slugs, titles, descriptions, categories, and pricing. |
| `get_model_schema` | `POST /Tool/Detail` | Get full parameter schema and pricing for any model — parameter names, types, options, defaults, and required fields. |
| `recommend_model` | `POST /Tool/List` | Describe what you want to build and get model recommendations ranked by relevance. |
| `explore` | `POST /Tool/Explore` | Browse curated AI models organized by category. No parameters needed. |

### Execution

| Tool | API Endpoint | What it does |
|------|-------------|-------------|
| `run_model` | `POST /Run/{owner}/{model}` | Run any model with parameters. With `wait=true` (default), polls until complete and returns outputs. With `wait=false`, returns task token for async monitoring. |

### Task Management

| Tool | API Endpoint | What it does |
|------|-------------|-------------|
| `get_task` | `POST /Task/Detail` | Check task status, `pexit` (exit code), outputs (CDN URLs), `debugoutput` (LLM responses), elapsed time, and cost. `pexit="0"` means success. |
| `get_task_price` | `POST /Task/Detail` | Get the cost of a completed task. Shows whether it was billed and the total charge. Only successful tasks (`pexit: "0"`) are billed. |
| `cancel_task` | `POST /Task/Cancel` | Cancel a task still in queue (before worker assignment). |
| `kill_task` | `POST /Task/Kill` | Kill a running task (after worker assignment). Task moves to `task_cancel` status. |

### Utility

| Tool | API Endpoint | What it does |
|------|-------------|-------------|
| `upload_file` | `POST /File/Upload` | Upload a file from a URL to Wiro for use as model input. |
| `search_docs` | Wiro Docs | Search the Wiro documentation for guides, API references, and examples. |

See the [Wiro MCP Server](/docs/wiro-mcp-server) page for detailed parameter tables and examples.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `WIRO_API_KEY` | Yes | Your Wiro project API key |
| `WIRO_API_SECRET` | No | Your API secret (for signature auth) |
| `WIRO_API_BASE_URL` | No | Override API URL (default: `https://api.wiro.ai/v1`) |

## GitHub & npm

- **GitHub**: [github.com/wiroai/Wiro-MCP](https://github.com/wiroai/Wiro-MCP)
- **npm**: [@wiro-ai/wiro-mcp](https://www.npmjs.com/package/@wiro-ai/wiro-mcp)

### Using as a Library

The package exports its core components for building custom MCP servers:

```typescript
import { createMcpServer, WiroClient } from '@wiro-ai/wiro-mcp';

const client = new WiroClient('your-api-key', 'your-api-secret');
const server = createMcpServer(client);
```

| Export | Description |
|--------|-------------|
| `createMcpServer(client)` | Creates an McpServer with all 11 tools registered |
| `WiroClient` | API client supporting both auth types (signature + apikey-only) |
| `registerTools(server, client)` | Register tools on an existing McpServer |

## Self-Hosting on Your Server

To run the MCP server on your own infrastructure:

```bash
git clone https://github.com/wiroai/Wiro-MCP.git
cd Wiro-MCP
npm install
npm run build
```

Set environment variables and run:

```bash
export WIRO_API_KEY="your-api-key"
export WIRO_API_SECRET="your-api-secret"
node dist/index.js
```

## Requirements

- Node.js 18 or later
- A Wiro project with API key ([create one here](https://wiro.ai/panel/project/new))
