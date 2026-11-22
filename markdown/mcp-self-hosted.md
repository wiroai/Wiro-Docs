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
      "args": ["-y", "@wiro-ai/wiro-mcp@latest"],
      "env": {
        "WIRO_API_KEY": "your-api-key",
        "WIRO_API_SECRET": "your-api-secret"
      }
    }
  }
}
```

That's it. Your assistant can now run Wiro models, build and run workflows,
and work with Studio and your own agents. The `@latest` in `args` makes
`npx` look up the newest version on npm each time the client starts the
server, so it never reuses an older cached build.

## Setup

### Cursor

Open MCP settings (`Cmd+Shift+P` → "Open MCP settings") and add the config above.

### Claude Code

```bash
claude mcp add wiro -- npx -y @wiro-ai/wiro-mcp@latest
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
      "args": ["-y", "@wiro-ai/wiro-mcp@latest"],
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
      "args": ["-y", "@wiro-ai/wiro-mcp@latest"],
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
      "args": ["-y", "@wiro-ai/wiro-mcp@latest"],
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
`npx -y @wiro-ai/wiro-mcp@latest` as the command and add `WIRO_API_KEY` and
`WIRO_API_SECRET` as environment variables. goose Desktop takes the same command
and variables under **Extensions > Add custom extension**. Or add Wiro to
`~/.config/goose/config.yaml`:

```yaml
extensions:
  wiro:
    name: Wiro AI
    type: stdio
    cmd: npx
    args: ["-y", "@wiro-ai/wiro-mcp@latest"]
    envs:
      WIRO_API_KEY: your-api-key
      WIRO_API_SECRET: your-api-secret
    enabled: true
    timeout: 300
```

### Other Clients

Any MCP client that supports the **stdio** transport can connect. The command is:

```bash
npx -y @wiro-ai/wiro-mcp@latest
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

Add `WIRO_API_SECRET` to the `env` block of your MCP config and restart the client. The other messages are the same as on the hosted server: see [Authentication errors](/docs/wiro-mcp-server#mcp-auth).

## Available Tools

The self-hosted server provides the same 56 typed tools, playbooks and prompts as the [hosted MCP server](/docs/wiro-mcp-server). Successful calls include `structuredContent` for LLM chaining plus text content for compatibility. Completed media calls return standard MCP resource links and an assistant-audience delivery instruction so the assistant can present image previews and clickable media links in its user-facing response even when the client does not render media inside its tool card.

All four tool groups load by default. To load fewer tools, set `WIRO_TOOLSETS` (see [Environment Variables](#environment-variables)). `get_account`, `get_playbook` and `search_docs` are always available.

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
| `list_agent_templates` | `POST /Agent/List` | Browse ready-made agent templates and the three monthly plans. |
| `get_agent_template` | `POST /Agent/Detail` | Read a template's skills, plans, the connectors it suggests and the keys it needs. |
| `list_agent_connectors` | `POST /AgentConnector/List`, `/AgentConnector/Detail`, `/UserAgent/ConnectorList` (with `agent_guid`) | Browse the connectors an agent can connect, what each one needs and the tools it gives the agent; with an agent, its connections. |
| `list_agent_skills` | `POST /Skills/List`, `/Skills/Detail`, `/Skills/Capabilities` | Browse the skills an agent can have, and what each one needs to work. |
| `deploy_agent` | `POST /UserAgent/PricingPreview`, `/UserAgent/Deploy` | Deploy an agent from a template or build one from skills, on the Starter, Pro or Max plan; shows the plan's price and the AI usage it includes, the Wiro balance that pays it and the other plans' prices, and asks before charging. |
| `list_my_agents` | `POST /UserAgent/MyAgents` | List your agents with their status, plan, AI usage and this month's spending. |
| `get_my_agent` | `POST /UserAgent/Detail` | Read one agent's setup, plan, AI usage and the balance it runs on; can wait until it is running. |
| `control_agent` | `POST /UserAgent/Start`, `/UserAgent/Stop`, `/UserAgent/Update` (restart) | Start, stop or restart an agent. |
| `update_agent` | `POST /UserAgent/Update`, `/UserAgent/UpdateSettings` | Change an agent's name, description, time zone, models, chat commands and setup from chat. |
| `apply_agent_skills` | `POST /UserAgent/PricingPreview`, `/UserAgent/SkillsApply` | Turn skills on or off; every plan includes every skill, so a change costs nothing. |
| `set_agent_credentials` | `POST /UserAgent/CredentialUpsert`, `/UserAgent/CredentialFileUpload` | Save an agent's chat channel keys (such as a Telegram bot token), Twilio Voice and settings. |
| `connect_agent_connector` | `POST /UserAgent/ConnectorConnect`, `/UserAgent/ConnectorList` (status) | Connect a connector to an agent: save its keys, or start its sign-in, which you approve in your browser. A connector that runs with a Wiro project shows the project and its wallet first. |
| `set_agent_connector_accounts` | `POST /UserAgent/ConnectorAccounts`, `/UserAgent/ConnectorSetAccounts` | Choose the accounts a connected connector may act on, such as its ad accounts, pages or channels. |
| `disconnect_agent_connector` | `POST /UserAgent/ConnectorDisconnect` | Disconnect a connector from an agent, after your confirmation. |
| `list_projects` | `POST /Project/List`, `/UserAgent/Detail` (with `agent_guid`) | List the projects of the connected project's workspace, to pick one for an agent; no keys are shown. |
| `bind_agent_project` | `POST /UserAgent/Detail`, `/Project/List`, then `/UserAgent/CredentialProjectBind` | Connect an agent to a Wiro project so it can run models, with no key in the chat; shows the project first, then asks for your confirmation. |
| `manage_agent_custom_skill` | `POST /UserAgent/CustomSkillUpsert`, `CustomSkillRename`, `CustomSkillDelete`, `CustomSkillHistory`, `CustomSkillRevert` | Add, edit, schedule, restore or remove an agent's own instructions and scheduled tasks; turning off its approval policy or changing its rules needs your confirmation. |
| `manage_agent_billing` | `POST /UserAgent/CreateSubscriptionCheckout`, `UpgradeTier`, `CancelSubscription`, `RenewSubscription` | Subscribe, move to another plan, cancel or renew, paid from your Wiro balance, after your confirmation; `buy_credits` is retired and charges nothing. |
| `get_agent_activity` | `POST /UserAgent/TransactionList`, `/UserAgent/LogsList`, `/UserAgent/Logs` | Read an agent's AI usage, its transactions in dollars and its activity logs, including who changed what on it. |
| `delete_agent` | `POST /UserAgent/Delete` | Delete an agent, after your confirmation. |

### Controls

These tools read and change the workspace's [spend limits](/docs/spend-limits) and [Model Access](/docs/model-access) rules. They come with `@wiro-ai/wiro-mcp` 1.9.0 and later. The self-hosted server's calls count on the `api` surface for now, as calls with its API key, except its messages to Studio and the Workflow Agent and its workflow runs, which count on `studio`, `workflow-agent` and `workflow` (see [Surfaces](/docs/tasks#task-surfaces)). Its Controls tools change limits and rules only when the person who created the key's project can change them: a personal account's owner, or in a team a team admin or the organization owner.

| Tool | API Endpoint | What it does |
|------|-------------|-------------|
| `get_controls` | `POST /SpendLimit/List`, `/ModelAccess/List`, `/SpendLimit/Usage` | Read the workspace's spend limits, with what each has used and when it resets, its Model Access rules, and whether this connection can change them; on request, also this month's or today's spending by surface, member, API key and agent. |
| `check_model_access` | `POST /ModelAccess/Check` | Explain whether a model may run here and why, rule by rule. Nothing runs and nothing is charged. |
| `manage_spend_limit` | `POST /SpendLimit/List`, `/SpendLimit/Preview`, `/SpendLimit/Set`, `/SpendLimit/Remove` | Set or remove a spend limit. It shows a change summary first and changes nothing until you confirm. |
| `manage_model_access` | `POST /ModelAccess/List`, `/ModelAccess/Preview`, `/ModelAccess/Set`, `/ModelAccess/Remove` | Update, replace or remove a Model Access rule. It shows a change summary first and changes nothing until you confirm. |

### Account and guides

| Tool | API Endpoint | What it does |
|------|-------------|-------------|
| `get_account` | `POST /Wallet/List`, `/SpendLimit/List`, `/Wallet/TransactionList` | Show which workspace the connected project belongs to, its wallet balance, its spend limits and, when you ask, the wallet's recent transactions. |
| `get_playbook` | Built into the server | Step-by-step guides: getting started, models, workflows, workflow graphs, the Workflow Agent, Studio, agents, billing and Controls. |
| `search_docs` | Wiro Docs | Search the Wiro documentation for guides, API references, and examples. |

See the [Wiro MCP Server](/docs/wiro-mcp-server) page for the playbook topics, the prompts, the rules for paid and irreversible actions, and the tool arguments.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `WIRO_API_KEY` | Yes | Your Wiro project API key |
| `WIRO_API_SECRET` | No | Your API secret (for signature auth) |
| `WIRO_API_BASE_URL` | No | Override API URL (default: `https://api.wiro.ai/v1`) |
| `WIRO_TOOLSETS` | No | Comma-separated tool groups to load: `models`, `workflows`, `agents`, `controls` (default: all) |

### Choosing tool groups

Some clients work best with fewer tools. Set `WIRO_TOOLSETS` to load only the groups you need:

```json
"env": {
  "WIRO_API_KEY": "your-api-key",
  "WIRO_TOOLSETS": "models,workflows"
}
```

`get_account`, `get_playbook` and `search_docs` are always available, and
`workflows` also brings the model search tools it needs. `controls` loads the
four Controls tools. The conversation tools for Studio and the Workflow Agent,
with `save_workflow_from_agent`, come with either `workflows` or `agents`, and
each prompt appears only when its tools are loaded. If a job needs a tool from a group that is not loaded, the server
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
| `createMcpServer(client, options?)` | Creates an McpServer with the tools, prompts and server instructions registered. `options.toolsets` picks tool groups and the prompts that use them; `options.instructions` replaces the instructions; `options.wrapTool(tool, handler)` returns the handler to register for each tool, for your own logging or permission checks; `options.maxToolInputElements` caps the array elements and object members one tool call may carry (default 10000, `Infinity` turns the check off) |
| `WiroClient` | API client supporting both auth types (signature + apikey-only); `post(path, body)` calls any Wiro API endpoint with the same credentials, and `isOwnApiKey(value)` says whether a value is this client's API key. Its `requestHeaders` option sends headers of your own with every request (see [Node.js Library](/docs/nodejs-library#nodejs-auth)) and replaces the `trustedProxy` option, which was removed in 1.5.0 |
| `registerTools(server, client, options?)` | Registers the tools on an McpServer you already have, with the same `toolsets` and `wrapTool` options. That server then lists every tool schema, its own tools included, as JSON Schema 2020-12 |
| `advertiseJsonSchema2020_12(server)` | Makes an McpServer list its tool schemas as JSON Schema 2020-12. Call it when you register single tools from `@wiro-ai/wiro-mcp/tools` instead of using `registerTools` |
| `withJsonSchema2020_12(transport)` | The same for one transport: `await server.connect(withJsonSchema2020_12(transport))` |
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
