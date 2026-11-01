# Self-Hosted MCP

Run the Wiro MCP server locally on your own machine using npx. No server setup required.

## Quick Start

Add to your AI assistant's MCP config:

```json
{
  "mcpServers": {
    "wiro": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@wiro-ai/wiro-mcp@1.4.1"],
      "env": {
        "WIRO_API_KEY": "your-api-key",
        "WIRO_API_SECRET": "your-api-secret"
      }
    }
  }
}
```

That's it. Your assistant can now run Wiro models, build and run workflows,
and work with Studio and your own agents. The `args` entry pins the current
published version (`@wiro-ai/wiro-mcp@1.4.1`) so `npx`
does not reuse an older cached build.

## Setup

### Cursor

Open MCP settings (`Cmd+Shift+P` → "Open MCP settings") and add the config above.

### Claude Code

```bash
claude mcp add wiro -- npx -y @wiro-ai/wiro-mcp@1.4.1
```

Then set `WIRO_API_KEY` and `WIRO_API_SECRET` environment variables.

### Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "wiro": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@wiro-ai/wiro-mcp@1.4.1"],
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
      "args": ["-y", "@wiro-ai/wiro-mcp@1.4.1"],
      "env": {
        "WIRO_API_KEY": "your-api-key",
        "WIRO_API_SECRET": "your-api-secret"
      }
    }
  }
}
```

### Kiro

Add to `~/.kiro/settings/mcp.json` (every workspace) or
`.kiro/settings/mcp.json` (this workspace):

```json
{
  "mcpServers": {
    "wiro": {
      "command": "npx",
      "args": ["-y", "@wiro-ai/wiro-mcp@1.4.1"],
      "env": {
        "WIRO_API_KEY": "your-api-key",
        "WIRO_API_SECRET": "your-api-secret"
      }
    }
  }
}
```

### goose

In the goose CLI, run `goose configure`, pick
**Add Extension > Command-line Extension**, enter
`npx -y @wiro-ai/wiro-mcp@1.4.1` as the command and add `WIRO_API_KEY` and
`WIRO_API_SECRET` as environment variables. goose Desktop takes the same command
and variables under **Extensions > Add custom extension**. Or add Wiro to
`~/.config/goose/config.yaml`:

```yaml
extensions:
  wiro:
    name: Wiro AI
    type: stdio
    cmd: npx
    args: ["-y", "@wiro-ai/wiro-mcp@1.4.1"]
    envs:
      WIRO_API_KEY: your-api-key
      WIRO_API_SECRET: your-api-secret
    enabled: true
    timeout: 300
```

### Other Clients

Any MCP client that supports the **stdio** transport can connect. The command is:

```bash
npx -y @wiro-ai/wiro-mcp@1.4.1
```

Set `WIRO_API_KEY` and `WIRO_API_SECRET` as environment variables in your client's MCP configuration.

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

### Authentication errors

If the project uses signature-based auth and `WIRO_API_SECRET` is not set, tool calls fail with:

```
Wiro API error 401: This project uses signature-based auth. Set WIRO_API_SECRET to the project's API secret in your MCP server config.
```

Add `WIRO_API_SECRET` to the `env` block of your MCP config and restart the client. The other messages are the same as on the hosted server: see [Authentication errors](/docs/wiro-mcp-server#authentication-errors).

## Available Tools

The self-hosted server provides the same 48 typed tools, playbooks and prompts as the [hosted MCP server](/docs/wiro-mcp-server). Successful calls include `structuredContent` for LLM chaining plus text content for compatibility. Completed media calls return standard MCP resource links and an assistant-audience delivery instruction so the assistant can present image previews and clickable media links in its user-facing response even when the client does not render media inside its tool card.

All three tool groups load by default. To load fewer tools, set `WIRO_TOOLSETS` (see [Environment Variables](#environment-variables)). `get_account`, `get_playbook` and `search_docs` are always available.

**Model slugs:** When a tool requires a model identifier, use the clean/lowercase format `owner/model` (e.g. `openai/sora-2`, `wiro/virtual-try-on`). These correspond to `cleanslugowner/cleanslugproject` values returned by `search_models`.

### Models

| Tool | API Endpoint | What it does |
|------|-------------|-------------|
| `search_models` | `POST /Tool/List` | Search and browse AI models by keyword, category, or owner. Returns model slugs, titles, descriptions, categories, and pricing. |
| `get_model_schema` | `POST /Tool/Detail`, `POST /Workflow/UtilityDetail` | Get full parameter schema and pricing for any model: parameter names, types, options, defaults, and required fields. For a workflow utility, its parameters and output ports. |
| `recommend_model` | `POST /Tool/List` | Find models for a goal from two or three key words, best matches first. |
| `explore` | `POST /Tool/Explore` | Browse curated AI models organized by category. No parameters needed. |
| `run_model` | `POST /Run/{owner}/{model}` | Run any model with parameters. Waits up to 45 seconds by default; if still active, returns a recoverable token for `wait_for_task`. |
| `wait_for_task` | `POST /Task/Detail` | Continue waiting for an existing task in bounded windows without creating a duplicate model run. |
| `get_task` | `POST /Task/Detail` | Check task status immediately, or wait up to 45 seconds with `wait_seconds`. Returns `pexit`, outputs, logs, elapsed time, and cost. |
| `list_tasks` | `POST /Task/List` | Browse authenticated generation history across conversations and continue with `get_task`. |
| `get_task_price` | `POST /Task/Detail` | Get the cost of a completed task. Shows whether it was billed and the total charge. Only successful tasks (`pexit: "0"`) are billed. |
| `cancel_task` | `POST /Task/Cancel` | Cancel a task still in queue (before worker assignment). |
| `kill_task` | `POST /Task/Kill` | Stop a queued or running task. Task moves to `task_cancel` status. |
| `upload_file` | `POST /File/Upload` | Upload a file from a public http(s) URL (up to about 100 MB). Most models also take a public URL directly, without uploading first. |

### Workflows

| Tool | API Endpoint | What it does |
|------|-------------|-------------|
| `list_workflows` | `POST /Workflow/List` | List the workflows in your workspace, or search the public gallery by text, tag or model. |
| `get_workflow` | `POST /Workflow/Detail` | Read a workflow's inputs, outputs and step graph. |
| `create_workflow` | `POST /Workflow/Prepare`, `POST /Workflow/Add` | Save a new workflow from a step graph. Wiro checks it against the live model catalog and returns every problem it finds at once. |
| `update_workflow` | `POST /Workflow/Prepare`, `POST /Workflow/Update` | Edit a workflow's title, description, tags or graph without overwriting newer changes; a new graph is saved only after you confirm a summary of the change. |
| `clone_workflow` | `POST /Workflow/Clone` | Copy a public workflow into your workspace. |
| `delete_workflow` | `POST /Workflow/Delete` | Delete a workflow, after your confirmation. |
| `run_workflow` | `POST /Workflow/Run` | Run a workflow and wait for its outputs; can stop after a chosen step to test the first steps. |
| `wait_for_workflow_run` | `POST /Workflow/RunDetail`, `POST /Workflow/RunNodeDetail` | Keep waiting on a run, read its outputs, or see why a step failed. |
| `resume_workflow_run` | `POST /Workflow/RunResume` | Continue a failed or stopped run without paying again for finished steps. |
| `list_workflow_runs` | `POST /Workflow/RunHistory` | Browse past and current runs, including runs started on wiro.ai. |
| `save_workflow_from_agent` | `POST /StudioWorkflow/Message/Detail`, then `/Workflow/Add` or `/Workflow/Update` | Save a workflow the Workflow Agent proposed, as a new workflow, or onto an existing one after you confirm a summary of the change. |

### Agents

The conversation tools call the matching `Message/*` route of [Studio](/docs/studio) (`/Studio/`), the [Workflow Agent](/docs/workflow-agent) (`/StudioWorkflow/`) or a deployed agent (`/UserAgent/`), chosen by their `agent` argument.

| Tool | API Endpoint | What it does |
|------|-------------|-------------|
| `send_agent_message` | `Message/Send`, or `Message/SendForm` with attachments | Send a message and wait for the reply, with any media, workflows or model runs it produced. |
| `get_agent_message` | `Message/Detail` | Keep waiting on a reply, or read one again. |
| `get_agent_conversation` | `Message/Sessions`, `Message/History` | List conversations, or read one conversation's history. |
| `cancel_agent_message` | `Message/Cancel` | Stop a reply that is still being written. |
| `delete_agent_session` | `Message/ClearSession` (Studio), `Message/DeleteSession` | Delete a conversation and the agent's memory of it, after your confirmation. |
| `list_studio_results` | `POST /Studio/Tasks` | List the images, videos and other results Studio generated for you. |
| `list_agent_templates` | `POST /Agent/List` | Browse ready-made agent templates and their monthly prices. |
| `get_agent_template` | `POST /Agent/Detail` | Read a template's skills, plans, and the accounts and keys it needs. |
| `list_agent_skills` | `POST /Skills/List`, `/Skills/Detail`, `/Skills/Capabilities` | Browse the skills an agent can have, and what each one needs to work. |
| `deploy_agent` | `POST /UserAgent/PricingPreview`, `/UserAgent/Deploy` | Deploy an agent from a template or build one from skills; shows the price and asks before charging. |
| `list_my_agents` | `POST /UserAgent/MyAgents` | List your agents with their status, plan and credits. |
| `get_my_agent` | `POST /UserAgent/Detail` | Read one agent's setup, plan and credits; can wait until it is running. |
| `control_agent` | `POST /UserAgent/Start`, `/UserAgent/Stop`, `/UserAgent/Update` (restart) | Start, stop or restart an agent. |
| `update_agent` | `POST /UserAgent/Update`, `/UserAgent/UpdateSettings` | Change an agent's name, description, time zone, models and chat commands. |
| `apply_agent_skills` | `POST /UserAgent/PricingPreview`, `/UserAgent/SkillsApply` | Turn skills on or off; shows the price change and asks before charging. |
| `set_agent_credentials` | `POST /UserAgent/CredentialUpsert`, `/UserAgent/CredentialFileUpload` | Save the keys, tokens and settings an agent's skills and channels need, such as a Telegram bot token or a Gmail app password. |
| `connect_agent_oauth` | `POST /UserAgentOAuth/OAuthConnect`, `/UserAgentOAuth/OAuthStatus`, `/UserAgentOAuth/SetPickerAccounts` | Connect sign-in accounts such as HubSpot or X; you approve the connection in your browser. Some services need your own app keys or a token first. |
| `disconnect_agent_oauth` | `POST /UserAgentOAuth/OAuthDisconnect` | Disconnect a connected account, after your confirmation. |
| `manage_agent_custom_skill` | `POST /UserAgent/CustomSkillUpsert`, `CustomSkillRename`, `CustomSkillDelete`, `CustomSkillHistory`, `CustomSkillRevert` | Add, edit, schedule, restore or remove an agent's own instructions and scheduled tasks. |
| `manage_agent_billing` | `POST /UserAgent/CreateSubscriptionCheckout`, `UpgradeTier`, `CancelSubscription`, `RenewSubscription`, `CreateExtraCreditCheckout` | Subscribe, upgrade to Pro, cancel, renew or buy extra credits from your wallet, after your confirmation. |
| `get_agent_activity` | `POST /UserAgent/TransactionList`, `/UserAgent/LogsList`, `/UserAgent/Logs` | Read an agent's credit usage and activity logs. |
| `delete_agent` | `POST /UserAgent/Delete` | Delete an agent, after your confirmation. |

### Account and guides

| Tool | API Endpoint | What it does |
|------|-------------|-------------|
| `get_account` | `POST /Wallet/List` | Show which workspace the connected project belongs to and its wallet balance. |
| `get_playbook` | Built into the server | Step-by-step guides: getting started, models, workflows, workflow graphs, the Workflow Agent, Studio, agents and billing. |
| `search_docs` | Wiro Docs | Search the Wiro documentation for guides, API references, and examples. |

See the [Wiro MCP Server](/docs/wiro-mcp-server) page for the playbook topics, the prompts, the rules for paid and irreversible actions, and the tool arguments.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `WIRO_API_KEY` | Yes | Your Wiro project API key |
| `WIRO_API_SECRET` | No | Your API secret (for signature auth) |
| `WIRO_API_BASE_URL` | No | Override API URL (default: `https://api.wiro.ai/v1`) |
| `WIRO_TOOLSETS` | No | Comma-separated tool groups to load: `models`, `workflows`, `agents` (default: all) |

### Choosing tool groups

Some clients work best with fewer tools. Set `WIRO_TOOLSETS` to load only the groups you need:

```json
"env": {
  "WIRO_API_KEY": "your-api-key",
  "WIRO_TOOLSETS": "models,workflows"
}
```

`get_account`, `get_playbook` and `search_docs` are always available, and
`workflows` also brings the model search tools it needs. The conversation tools
for Studio and the Workflow Agent, with `save_workflow_from_agent`, come with
either `workflows` or `agents`, and each prompt appears only when its tools are
loaded. If a job needs a tool from a group that is not loaded, the server
instructions tell the assistant to say so.

## GitHub & npm

- **GitHub**: [github.com/wiroai/Wiro-MCP](https://github.com/wiroai/Wiro-MCP)
- **npm**: [@wiro-ai/wiro-mcp](https://www.npmjs.com/package/@wiro-ai/wiro-mcp)

### Using as a Library

The package exports its core components for building custom MCP servers:

```typescript
import { WiroClient } from '@wiro-ai/wiro-mcp/client';
import { createMcpServer } from '@wiro-ai/wiro-mcp/server';

const client = new WiroClient('your-api-key', 'your-api-secret');
const server = createMcpServer(client);

// Only the model and workflow tools
const modelsAndWorkflows = createMcpServer(client, { toolsets: ['models', 'workflows'] });
```

| Export | Description |
|--------|-------------|
| `createMcpServer(client, options?)` | Creates an McpServer with the tools, prompts and server instructions registered. `options.toolsets` picks tool groups and the prompts that use them; `options.instructions` replaces the instructions; `options.wrapTool(tool, handler)` returns the handler to register for each tool, for your own logging or permission checks |
| `WiroClient` | API client supporting both auth types (signature + apikey-only); `post(path, body)` calls any Wiro API endpoint with the same credentials |
| `registerTools(server, client, options?)` | Register tools on an existing McpServer |
| `parseToolsets(value)` | Parse a `WIRO_TOOLSETS`-style list such as `"models,agents"` |

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

- Node.js 20 or later
- A Wiro project with API key ([create one here](https://wiro.ai/panel/project/new))
