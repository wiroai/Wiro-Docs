# Wiro MCP Server

Connect AI assistants to Wiro's models, workflows, Studio and agents through the Model Context Protocol.

## Connect with a browser sign-in

**Easiest way.** No API key to copy. Add this URL as a remote MCP server in
your app, then sign in with your Wiro account when the app asks:

```
https://mcp.wiro.ai/v1
```

Works with ChatGPT, Claude, Claude Code, Cursor, VS Code, Gemini CLI, Codex,
Devin, Kiro, goose and Grok.

1. **Add the server.** In your app, add a remote MCP server with the URL above. Leave the `Authorization` header out.
2. **Sign in to Wiro.** The app opens wiro.ai in your browser. Sign in, or create an account.
3. **Pick a project and how long.** Runs are paid from the project's workspace wallet. The app stays connected for 90 days unless you pick another length, from 7 days to unlimited.
4. **Click Allow.** Your browser goes back to the app, and the Wiro tools are ready to use.

One-click install: [Add to Cursor](https://cursor.com/install-mcp?name=wiro&config=eyJ1cmwiOiJodHRwczovL21jcC53aXJvLmFpL3YxIn0=),
[Install in VS Code](https://vscode.dev/redirect/mcp/install?name=wiro&config=%7B%22type%22%3A%22http%22%2C%22url%22%3A%22https%3A%2F%2Fmcp.wiro.ai%2Fv1%22%7D),
[Add to Kiro](https://kiro.dev/launch/mcp/add/?name=wiro&config=%7B%22url%22%3A%22https%3A%2F%2Fmcp.wiro.ai%2Fv1%22%7D),
[Add to goose](https://goose-docs.ai/extension/?url=https%3A%2F%2Fmcp.wiro.ai%2Fv1&type=streamable_http&id=wiro&name=Wiro%20AI&description=Run%20image%2C%20video%2C%20audio%20and%20LLM%20models%20on%20Wiro%20AI).

Claude, ChatGPT and Devin have no one-click link yet. Open the app's connector
settings and paste the URL above:
[Claude connectors](https://claude.ai/customize/connectors),
[ChatGPT plugins](https://chatgpt.com/plugins),
[Devin MCP settings](https://app.devin.ai/customize?tab=mcps).

## What is MCP?

[Model Context Protocol](https://modelcontextprotocol.io/) (MCP) is an open standard that lets AI assistants use external tools directly. With the Wiro MCP server, your AI assistant can find and run models, build and run workflows, create media with Studio, and deploy and talk to your own agents, all without leaving your editor or chat app.

The hosted MCP server is available at `https://mcp.wiro.ai/v1`. Most apps
connect with the browser sign-in above. Clients that send custom request
headers, including Cursor, Claude Code, Windsurf, Kiro, goose, OpenClaw, and
Hermes, can use your API key instead. An API key sent in a header is never
stored on the hosted server.

You need a Wiro account. With a browser sign-in you pick a project while connecting. For the API key method, [create a project here](https://wiro.ai/panel/project/new).

### Links

- [Model Context Protocol (MCP)](https://modelcontextprotocol.io/): open standard specification
- [GitHub: wiroai/Wiro-MCP](https://github.com/wiroai/Wiro-MCP) (source code & self-hosting instructions)
- [npm: @wiro-ai/wiro-mcp](https://www.npmjs.com/package/@wiro-ai/wiro-mcp) (npm package)
- [Wiro Model Catalog](https://wiro.ai/models): browse all available models
- [Create API Key](https://wiro.ai/panel/project/new): get started in seconds

## Browser sign-in details

ChatGPT, Claude (claude.ai, Claude Desktop and Claude Code), Cursor, VS Code,
Gemini CLI, Codex, Zed, Devin, Kiro, goose, Grok, Grok Bot, Cline and MCP
Inspector connect this way, and so does any app on your computer that follows
the [MCP authorization
spec](https://modelcontextprotocol.io/specification/latest/basic/authorization).
An app that signs in through its own website needs its callback address on
Wiro's list: write to [support@wiro.ai](mailto:support@wiro.ai) to add one.

### Projects and billing

- Each connection uses one project. A personal project bills your personal wallet, a team project the team's wallet.
- In a team, members can connect the projects they created. Team admins and the organization owner can connect any project of the team.
- A project with an IP whitelist only accepts calls from the addresses on it. ChatGPT and Claude call from their own servers, so pick a project open to all addresses for them. Apps on your computer, such as Claude Code, Cursor and VS Code, call from your own address.

### How long it stays connected

You pick it on the sign-in page: 7 days, 30 days, 90 days (the default), 180
days, 1 year, or unlimited. When the time is up, the app asks you to sign in
again. An unlimited connection lasts until you disconnect it.

A connection also ends when its project is removed, or when you leave the team
or lose the role that allowed it. The same happens once the project's API key
stops working, for example when the person who created a team project leaves
the team; the sign-in page then no longer offers that project. Access tokens
last one hour and renew on their own, so there is nothing to copy or rotate.

### See, change and disconnect apps

Every app you connected is listed under
[Projects, Connected Apps](https://wiro.ai/panel/project?view=apps) in the
panel, with its project, when it was last used and when it ends. Pick a new
length there to extend or shorten it; it counts from that day. **Disconnect**
ends its access within a minute, and the app asks you to sign in again the next
time.

### For MCP client developers

| Item | Value |
| --- | --- |
| Protected resource metadata | `https://mcp.wiro.ai/.well-known/oauth-protected-resource/v1` |
| Authorization server metadata | `https://mcp.wiro.ai/.well-known/oauth-authorization-server` |
| Authorize, token, revoke | `https://mcp.wiro.ai/authorize`, `/token`, `/revoke` |
| Client registration | A Client ID Metadata Document, or dynamic client registration at `https://mcp.wiro.ai/register` |
| Resource and scope | `https://mcp.wiro.ai/v1`, scope `mcp` |

Use the authorization code flow with PKCE (`S256`). Authorization responses
carry `iss`. Sign-in returns only to the callbacks of known apps and to loopback
addresses on your own computer (any port). To add your app's callback, write to
[support@wiro.ai](mailto:support@wiro.ai).

## Setup

### Cursor

#### Sign in with your browser

Click
[Add to Cursor](https://cursor.com/install-mcp?name=wiro&config=eyJ1cmwiOiJodHRwczovL21jcC53aXJvLmFpL3YxIn0=),
or add the server to your `mcp.json` with only its URL:

```json
{
  "mcpServers": {
    "wiro": {
      "url": "https://mcp.wiro.ai/v1"
    }
  }
}
```

Cursor asks you to sign in to Wiro the first time it connects.

#### Or use your API key

1. **Open MCP Settings**: Use `Cmd+Shift+P` (`Ctrl+Shift+P` on Windows) and search for **"Open MCP settings"**.

2. **Add the Wiro server** to your `mcp.json` file:

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

3. **Restart Cursor**: Save the file and restart Cursor to activate the connection.

### Claude Code

#### Sign in with your browser

Run this command in your terminal:

```bash
claude mcp add --transport http wiro https://mcp.wiro.ai/v1
```

Then run `/mcp` inside Claude Code, pick **wiro** and sign in to Wiro in your
browser.

#### Or install as a plugin

Run these two commands inside Claude Code:

```
/plugin marketplace add wiroai/Wiro-Plugin
/plugin install wiro-ai@wiro
```

Then open `/mcp`, pick the Wiro server and choose **Authenticate** to sign in
to Wiro in your browser. The plugin comes from the
[wiroai/Wiro-Plugin](https://github.com/wiroai/Wiro-Plugin) repository.

#### Or add the server with your API key

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

The quickest way is a custom connector: open
[Connectors](https://claude.ai/customize/connectors) in Claude, click **Add
custom connector**, enter the URL `https://mcp.wiro.ai/v1` and sign in with
your Wiro account when Claude asks. See
[Connect with a browser sign-in](#connect-with-a-browser-sign-in). The same
connector works on claude.ai.

You can also run the official local package. It provides the same Wiro tools
through Claude Desktop's stdio MCP support.

Install [Node.js 20 or later](https://nodejs.org/), then add the following to
your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "wiro": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@wiro-ai/wiro-mcp@1.4.0"],
      "env": {
        "WIRO_API_KEY": "YOUR_API_KEY",
        "WIRO_API_SECRET": "YOUR_API_SECRET"
      }
    }
  }
}
```

For API Key Only authentication, keep `WIRO_API_KEY` and remove the
`WIRO_API_SECRET` entry completely. Save the file, fully quit Claude Desktop,
and reopen it.

Pin the current published version (`@wiro-ai/wiro-mcp@1.4.0`) in `args`.
Unversioned `npx` can keep an older cached build after a package update.

This setup runs the open-source
[`@wiro-ai/wiro-mcp`](https://www.npmjs.com/package/@wiro-ai/wiro-mcp) bridge on
your machine and calls Wiro with your project credentials. See
[Self-Hosted MCP](/docs/mcp-self-hosted) for the complete local package guide.

#### Claude connection and timeout troubleshooting

- **"Not valid MCP server configurations"**: ensure the entry contains
  `"type": "stdio"`, `command`, `args`, and `env` exactly as shown above.
- **The Wiro tools do not appear**: confirm `node --version` reports 20 or
  later, then fully quit and reopen Claude Desktop.
- **Tools appear but every call fails immediately**: pin
  `@wiro-ai/wiro-mcp@1.4.0` as shown above so `npx` does not reuse an older
  cached package, then fully quit and reopen Claude Desktop.
- **A generation reaches Claude's tool timeout**: Wiro waits for at most 45
  seconds per call. If the task is still running, the response contains
  `nextAction.tool: "wait_for_task"`. Claude should execute that exact action
  until completion and must not call `run_model` again.
- Do not add a `timeout` field to `claude_desktop_config.json`; Claude Desktop
  versions with a fixed client-side tool timeout may ignore it. Wiro's bounded
  wait flow is designed to remain below that boundary.

### ChatGPT

In ChatGPT, open [Plugins](https://chatgpt.com/plugins), click **+**, choose
**Add custom MCP server**, enter `https://mcp.wiro.ai/v1` and create the
plugin. ChatGPT opens wiro.ai, where you sign in and pick a project.

ChatGPT calls Wiro from its own servers, so pick a project that is open to all
IP addresses.

### VS Code

Click
[Install in VS Code](https://vscode.dev/redirect/mcp/install?name=wiro&config=%7B%22type%22%3A%22http%22%2C%22url%22%3A%22https%3A%2F%2Fmcp.wiro.ai%2Fv1%22%7D),
or add the server to your `mcp.json`:

```json
{
  "servers": {
    "wiro": {
      "type": "http",
      "url": "https://mcp.wiro.ai/v1"
    }
  }
}
```

VS Code asks you to sign in to Wiro when it starts the server. From a terminal,
`code --add-mcp '{"name":"wiro","type":"http","url":"https://mcp.wiro.ai/v1"}'`
adds the same entry.

### Gemini CLI

#### Sign in with your browser

Run this command in your terminal:

```bash
gemini mcp add --transport http wiro https://mcp.wiro.ai/v1
```

Then run `/mcp auth wiro` inside Gemini CLI and sign in to Wiro in your browser.

#### Or install the extension

Install Wiro as a Gemini CLI extension from the
[wiroai/Wiro-Plugin](https://github.com/wiroai/Wiro-Plugin) repository. Run this
in your terminal:

```bash
gemini extensions install https://github.com/wiroai/Wiro-Plugin
```

Then run `/mcp auth wiro` inside Gemini CLI and sign in to Wiro in your
browser.

### Devin

Install Wiro as a Devin plugin from the
[wiroai/Wiro-Plugin](https://github.com/wiroai/Wiro-Plugin) repository. With
the Devin CLI, run:

```bash
devin plugins install wiroai/Wiro-Plugin
```

In the Devin web app, go to
**Customize > Plugins > Add plugin > From repository** and enter
`wiroai/Wiro-Plugin`. Devin opens Wiro's sign-in page in your browser the first
time it connects.

In the Devin web app you can also skip the plugin: open
[Customize, MCPs](https://app.devin.ai/customize?tab=mcps), add a custom MCP
server with the URL `https://mcp.wiro.ai/v1` and sign in to Wiro in your
browser.

### Kiro

#### Sign in with your browser

Click
[Add to Kiro](https://kiro.dev/launch/mcp/add/?name=wiro&config=%7B%22url%22%3A%22https%3A%2F%2Fmcp.wiro.ai%2Fv1%22%7D),
or add the server with only its URL to `~/.kiro/settings/mcp.json` (every
workspace) or `.kiro/settings/mcp.json` (this workspace):

```json
{
  "mcpServers": {
    "wiro": {
      "url": "https://mcp.wiro.ai/v1"
    }
  }
}
```

Kiro opens Wiro's sign-in page in your browser the first time it connects.

#### Or use your API key

Send the key in an `Authorization` header instead:

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

Use `YOUR_API_KEY:YOUR_API_SECRET` (both values joined with a colon) if the
project uses signature-based auth.

### goose

#### Sign in with your browser

Click
[Add to goose](https://goose-docs.ai/extension/?url=https%3A%2F%2Fmcp.wiro.ai%2Fv1&type=streamable_http&id=wiro&name=Wiro%20AI&description=Run%20image%2C%20video%2C%20audio%20and%20LLM%20models%20on%20Wiro%20AI).
To add it by hand in goose Desktop, open
**Extensions > Add custom extension**, choose the **Streamable HTTP** type and
enter `https://mcp.wiro.ai/v1`. In the goose CLI, run `goose configure`, pick
**Add Extension > Remote Extension (Streamable HTTP)** and enter the same URL.

goose opens Wiro's sign-in page in your browser the first time it connects.

#### Or use your API key

Add Wiro to `~/.config/goose/config.yaml` with an `Authorization` header:

```yaml
extensions:
  wiro:
    name: Wiro AI
    type: streamable_http
    uri: https://mcp.wiro.ai/v1
    headers:
      Authorization: Bearer YOUR_API_KEY
    enabled: true
    timeout: 300
```

Use `YOUR_API_KEY:YOUR_API_SECRET` (both values joined with a colon) if the
project uses signature-based auth.

### Grok

#### On grok.com

Open [grok.com/connectors](https://grok.com/connectors), click
**New Connector**, choose **Custom** and enter `https://mcp.wiro.ai/v1`. Grok
opens Wiro's sign-in page in your browser: sign in, pick the project whose
wallet pays for runs and click **Allow**.

#### In Grok Bot

Ask your Bot to add the MCP server `https://mcp.wiro.ai/v1`. Grok Bot opens
Wiro's sign-in page in your browser the first time it connects.

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

Verify the saved definition, the connection and the advertised tools:

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

A client that supports MCP sign-in needs only this URL: it opens a Wiro sign-in
in your browser (see [Connect with a browser sign-in](#connect-with-a-browser-sign-in)).
Any other client sends your API key in the `Authorization` header:

```
Authorization: Bearer YOUR_API_KEY:YOUR_API_SECRET
```

Or for API Key Only auth: `Bearer YOUR_API_KEY`

Credentials are sent as plain text. No base64 encoding is needed. Any MCP client that supports Streamable HTTP can connect: with a browser sign-in, or **with a custom `Authorization` header**. Refer to your client's documentation for the exact configuration format.

## Authentication

Apps that support MCP sign-in need no credentials here: see [Connect with a browser sign-in](#connect-with-a-browser-sign-in). With an API key in the header, the MCP server supports both Wiro [authentication types](/docs/authentication). Your project's auth type determines what credentials you provide.

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

No base64 encoding needed. Your credentials are sent per-request in the Authorization header and are never stored. The server is fully stateless.

### Authentication errors

A failed tool call comes back as a normal tool result with `isError: true`. Its
text starts with `Wiro API error` and the HTTP status, then a message that says
what to fix. For example, when a project uses signature-based auth and only its
API key was sent:

```json
{
  "isError": true,
  "content": [{
    "type": "text",
    "text": "## Error\n\nWiro API error 401: This project uses signature-based auth. Enter API_KEY:API_SECRET (the key and secret joined with a colon) as the API key."
  }]
}
```

Messages you may see while connecting:

| Message | What to do |
|---------|------------|
| `This project uses signature-based auth. Enter API_KEY:API_SECRET (the key and secret joined with a colon) as the API key.` | Only the API key was sent, but the project uses signature-based auth. Enter `API_KEY:API_SECRET` in the plugin's key field, or send `Authorization: Bearer YOUR_API_KEY:YOUR_API_SECRET`. |
| `Project authorization is not founded.` | No project has this API key. Copy the key again from your project page. |
| `Project authorization is not valid.` | The API secret does not match the API key. Check that both come from the same project. |
| `Requested ip {ip} is not allowed.` | The project has an IP whitelist, and the address in the message is not on it. Check the whitelist in your project settings. |
| `The person who created this API key is no longer in its team. Ask a team admin for a new key.` | The user who created this team project has left the team, so its key no longer works. Use a key from another project, or sign in again and pick another project. |

A request without an `Authorization` header never reaches a tool. The MCP
endpoint answers HTTP `401` with `Missing or invalid Authorization header` in
the body and a `WWW-Authenticate` header that points apps to the sign-in. An
expired or disconnected sign-in gets the same answer with
`error="invalid_token"`, and the app asks you to sign in again. See
[Error Reference](/docs/error-reference) for every Wiro API error.

## Available Tools

The MCP server has 48 tools. Most of them belong to one of three groups, Models, Workflows and Agents, and three tools for your account, the playbooks and the docs are always available. Your AI assistant picks the right tool for each request, and for longer jobs it reads a playbook first.

**Model slugs:** When a tool requires a model identifier, use the clean/lowercase format `owner/model` (e.g. `openai/sora-2`, `wiro/virtual-try-on`). These correspond to the `cleanslugowner/cleanslugproject` values returned by `search_models`.

### Models

| Tool | What it does |
|------|-------------|
| `search_models` | Search and browse AI models by keyword, category, or owner |
| `get_model_schema` | Get the full parameter schema and pricing for any model, or the parameters and output ports of a workflow utility |
| `recommend_model` | Find models for a goal from two or three key words, best matches first |
| `explore` | Browse curated models grouped by category, no parameters needed |
| `run_model` | Run any model, waiting up to 45 seconds by default before it returns a recoverable task token |
| `wait_for_task` | Continue waiting for an existing task without submitting or billing a duplicate run |
| `get_task` | Check task status immediately or wait up to 45 seconds with `wait_seconds` |
| `list_tasks` | Browse authenticated task history across conversations, then continue with `get_task` |
| `get_task_price` | Get the cost of a completed task |
| `cancel_task` | Cancel a queued task |
| `kill_task` | Stop a queued or running task |
| `upload_file` | Upload a file from a public http(s) URL (up to about 100 MB) for use as model input |

For long generations, `run_model` returns the existing task ID and token when
its wait ends. The assistant continues with `wait_for_task`; calling
`run_model` again would start a separate billable task.

### Workflows

A workflow chains models and built-in utility steps into one graph with its own
inputs and outputs. Every model step is charged like a normal model run when it
finishes. Wiro fills a model input you leave out with the model's default, so
the save result lists what it filled, and a graph can be at most 40 KB of JSON.
The API behind these tools is described on the [Workflows](/docs/workflows) page.

| Tool | What it does |
|------|-------------|
| `list_workflows` | List the workflows in your workspace, or search the public gallery by text, tag or model |
| `get_workflow` | Read a workflow's inputs, outputs and step graph |
| `create_workflow` | Save a new workflow from a step graph. Wiro checks it against the live model catalog and returns every problem it finds at once |
| `update_workflow` | Edit a workflow's title, description, tags or graph without overwriting newer changes; a new graph is saved only after you confirm a summary of the change |
| `clone_workflow` | Copy a public workflow into your workspace |
| `delete_workflow` | Delete a workflow, after your confirmation |
| `run_workflow` | Run a workflow and wait for its outputs; can stop after a chosen step to test the first steps |
| `wait_for_workflow_run` | Keep waiting on a run, read its outputs, or see why a step failed |
| `resume_workflow_run` | Continue a failed or stopped run without paying again for finished steps |
| `list_workflow_runs` | Browse past and current runs, including runs started on wiro.ai |
| `save_workflow_from_agent` | Save a workflow the Workflow Agent proposed, as a new workflow, or onto an existing one after you confirm a summary of the change |

The **Workflow Agent** designs workflows with you in plain language: talk to it
with `send_agent_message` and `agent: "workflow-agent"`, attach an existing
workflow to edit, then save its proposal with `save_workflow_from_agent`.
Conversations started through the MCP server belong to the connected project
and are separate from your Workflow Agent chats on wiro.ai. See
[Workflow Agent](/docs/workflow-agent).

### Agents

One set of tools talks to every Wiro agent. `agent` is `"studio"`,
`"workflow-agent"` or the guid of one of your own agents.

| Tool | What it does |
|------|-------------|
| `send_agent_message` | Send a message and wait for the reply, with any media, workflows or model runs it produced |
| `get_agent_message` | Keep waiting on a reply, or read one again |
| `get_agent_conversation` | List conversations, or read one conversation's history |
| `cancel_agent_message` | Stop a reply that is still being written |
| `delete_agent_session` | Delete a conversation and the agent's memory of it, after your confirmation |
| `list_studio_results` | List the images, videos and other results Studio generated for you |

**Studio** is Wiro's creative agent: it picks and runs models for you and
charges your wallet after each reply (see [Studio](/docs/studio)). Your own
agents run on a monthly plan with credits (see
[Agent Overview](/docs/agent-overview)).

| Tool | What it does |
|------|-------------|
| `list_agent_templates` | Browse ready-made agent templates and their monthly prices |
| `get_agent_template` | Read a template's skills, plans, and the accounts and keys it needs |
| `list_agent_skills` | Browse the skills an agent can have, and what each one needs to work |
| `deploy_agent` | Deploy an agent from a template or build one from skills; shows the price and asks before charging |
| `list_my_agents` | List your agents with their status, plan and credits |
| `get_my_agent` | Read one agent's setup, plan and credits; can wait until it is running |
| `control_agent` | Start, stop or restart an agent |
| `update_agent` | Change an agent's name, description, time zone, models and chat commands |
| `apply_agent_skills` | Turn skills on or off; shows the price change and asks before charging |
| `set_agent_credentials` | Save the keys, tokens and settings an agent's skills and channels need, such as a Telegram bot token or a Gmail app password |
| `connect_agent_oauth` | Connect sign-in accounts such as HubSpot or X; you approve the connection in your browser. Some services need your own app keys or a token first |
| `disconnect_agent_oauth` | Disconnect a connected account, after your confirmation |
| `manage_agent_custom_skill` | Add, edit, schedule, restore or remove an agent's own instructions and scheduled tasks |
| `manage_agent_billing` | Subscribe, upgrade to Pro, cancel, renew or buy extra credits from your wallet, after your confirmation |
| `get_agent_activity` | Read an agent's credit usage and activity logs |
| `delete_agent` | Delete an agent, after your confirmation |

### Account and guides

These three tools are always available, whichever groups are loaded.

| Tool | What it does |
|------|-------------|
| `get_account` | Show which workspace the connected project belongs to and its wallet balance |
| `get_playbook` | Step-by-step guides: getting started, models, workflows, workflow graphs, the Workflow Agent, Studio, agents and billing |
| `search_docs` | Search the Wiro documentation for guides and API references |

### Playbooks

A tool description is too short to carry the order of calls, the money rules
and the formats of a multi-step job, so the server keeps them in playbooks. The
server tells the assistant to read the matching playbook with `get_playbook`
before a multi-step job.

| Topic | What it covers |
|------|-------------|
| `getting-started` | Which route fits a request, what costs money, keys and workspaces, errors, long waits and the money rules |
| `models` | Finding and comparing models, schemas and file fields, running, batches, waiting and stopping, prices and limits, earlier tasks and LLM chats |
| `workflows` | Finding and running workflows, costs, breakpoints, failed runs, editing, cloning and deleting |
| `workflow-graph` | The graph `create_workflow` and `update_workflow` take: steps, Start fields, references, utilities and examples |
| `workflow-agent` | Briefing the Workflow Agent, editing a workflow by chat, pricing and saving its proposals, sessions |
| `studio` | When to use Studio, what a turn costs, the brief, collecting the results and slow turns |
| `agents` | Templates and plans, deploying, statuses, setup and sign-ins, an agent that does not answer, messages, plan changes and credits, skills and schedules, removal |
| `billing` | Which wallet pays, what is charged and when, minimums and limits, teams, estimates and where to see past spending |

### Prompts

The server also offers prompts for common jobs. Clients that support MCP
prompts show them as ready-made commands. Each prompt sends the assistant to
the matching playbook first.

| Prompt | What it does |
|------|-------------|
| `build_workflow` | Plan, save and test a multi-step workflow for a goal, confirming costs before any run |
| `deploy_agent` | Choose a template or skills, quote and deploy an agent, then set it up and test it |
| `create_with_studio` | Ask Studio to create images, video or audio, after explaining what a turn can cost |
| `talk_to_my_agent` | Find one of your agents, make sure it is running, send it a message and show the reply |

### Paid and irreversible actions

Running a model or a workflow, sending a message to Studio or the Workflow
Agent, and messages to your own agents (which use the agent's credits) cost
money. The assistant tells you the expected cost in one line before it starts
such work.

Agent plans, plan changes, credit packs and skill changes are charged to your
wallet, so `deploy_agent`, `manage_agent_billing` and `apply_agent_skills`
first return the price (an estimate for prorated changes such as an upgrade to
Pro). They act only when they are called again with `confirm: true` and the
quote's reference after you agree: `confirm_charge_usd` with the approved
amount, or the quote's `idempotency_key` for skill changes. If the price
changed in between, nothing is charged and you get a new quote.

Deleting a workflow, an agent, a conversation or an account connection also
waits for `confirm: true`, and so does replacing a workflow's steps with
`update_workflow` or `save_workflow_from_agent`: you see a summary of the
change first. No tool adds funds or takes a card payment. Funds are added in
the Wiro dashboard, and an agent plan paid by card is upgraded or topped up
there.

The connected project decides the workspace: a personal project uses your
personal wallet, a team project uses the team wallet. `get_account` shows which
one and its balance.

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

Workflow runs, agent replies and agent start-up follow the same pattern: when a
wait ends before the job does, the result names the tool and arguments that
keep waiting on that same job, such as `wait_for_workflow_run` or
`get_agent_message`.

An LLM model can continue a chat only when its schema lists `session_id`. Send
the same `session_id` on every turn, the first one included, with the next
`prompt`. A turn that ended with tool calls is continued with
`previousTaskToken`, that turn's task token, and `toolOutputs`, as the turn's
`nextAction` template shows.

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

### Build and run a workflow

> "Build a workflow that turns a product photo into a short ad video, then run it on this photo"

The assistant reads the `workflows` and `workflow-graph` playbooks, picks a
model for each step with `search_models` and `get_model_schema`, and saves the
graph with `create_workflow`. It tells you the expected cost, then calls
`run_workflow` and follows `wait_for_workflow_run` until the video is ready.

### Edit a workflow with the Workflow Agent

> "Ask the Workflow Agent to add an upscale step to my product ad workflow and save it"

The assistant finds the workflow with `list_workflows` and sends your request
with `send_agent_message` (`agent: "workflow-agent"`) with the workflow
attached. It shows you the proposal and the models it uses, and saves it with
`save_workflow_from_agent` once you agree to the change.

### Fix a failed run

> "Why did my last workflow run fail? Resume it if it can be resumed"

The assistant calls `list_workflow_runs` with status `failed`, reads the failed
step with `wait_for_workflow_run`, and continues the run with
`resume_workflow_run`. Steps that already finished are not charged again.

### Create with Studio

> "Ask Studio for three logo ideas for a coffee shop"

The assistant checks the balance with `get_account`, tells you what a Studio
turn costs, sends the brief with `send_agent_message` (`agent: "studio"`) and
shows the images from the reply.

### Deploy an agent

> "Deploy an agent that posts to our Instagram account and tell me what it still needs"

The assistant compares templates with `list_agent_templates` and
`get_agent_template`, gets the price from `deploy_agent`, and deploys only
after you confirm the amount. Then it lists the missing setup with
`get_my_agent` and connects the account with `connect_agent_oauth`.

### Talk to your agent

> "Tell my support agent to summarise today's tickets"

The assistant finds the agent with `list_my_agents`, checks that it is running
with `get_my_agent`, and sends the message with `send_agent_message`. The
message uses the agent's credits.

## How It Works

The MCP server is stateless and hosted on Wiro infrastructure. Each request is fully isolated:

1. Your AI assistant sends a request to `mcp.wiro.ai/v1` with your credentials
2. The server calls the [Wiro API](https://wiro.ai/docs) on your behalf
3. Results are returned to your assistant

Your credentials are sent per-request in the `Authorization` header and are never stored. The server has no sessions and no state.

All tools are dynamic: they fetch model data from the Wiro API at runtime. When a new model is added to Wiro, it's instantly available through MCP.

## Tool Reference

The model tools are described one by one below. The workflow, conversation and
agent tools follow in tables of their main arguments.

### search_models

Search Wiro's model catalog by keyword, category, owner, or any combination. Calls `POST /Tool/List` on the Wiro API.

| Parameter | Type | Description |
|-----------|------|-------------|
| `search` | string (optional) | Free-text search, e.g. `"flux"`, `"video generation"` |
| `categories` | string[] (optional) | Filter by category: `text-to-image`, `text-to-video`, `image-to-video`, `llm`, `text-to-speech`, `image-editing`, etc. |
| `slugowner` | string (optional) | Filter by model owner slug, e.g. `"openai"`, `"google"`, `"klingai"` |
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

Returns a list of recommended models with slugs, descriptions, categories, and pricing, sorted by relevance to your task.

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

When `wait=false`, returns `taskid` and `tasktoken` immediately. Use
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

**Determining success:** Check `pexit`, where `"0"` means success and any other value means failure. For LLM models, the response is available as structured content in `outputs` (with `contenttype: "raw"`) and as merged plain text in `debugoutput`. See [Tasks](/docs/tasks) for the full task lifecycle.

`task_error` needs context: a live WebSocket event with that name is an interim
stderr log, while `status: "task_error"` returned by Task/Detail marks a
pre-execution recovery state. Neither closes the task; `wait_for_task` continues
until `task_postprocess_end` or `task_cancel`.

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

Returns the task's billing status, total cost, and duration. Only successful tasks (`pexit: "0"`) are billed. Failed tasks show `$0` with a clear explanation. Useful for checking costs after a run completes.

### cancel_task

Cancel a task that is still queued (before worker assignment). Calls `POST /Task/Cancel` on the Wiro API.

| Parameter | Type | Description |
|-----------|------|-------------|
| `tasktoken` | string (optional) | The task token returned from `run_model` |
| `taskid` | string (optional) | The task ID (alternative to `tasktoken`) |

Tasks that have already been assigned to a worker cannot be cancelled. Use `kill_task` instead.

### kill_task

Kill a task that is currently running (after worker assignment). Calls `POST /Task/Kill` on the Wiro API.

| Parameter | Type | Description |
|-----------|------|-------------|
| `tasktoken` | string (optional) | The task token returned from `run_model` |
| `taskid` | string (optional) | The task ID (alternative to `tasktoken`) |

The worker will stop processing and the task will move to `task_cancel` status.

### upload_file

Upload a file from a URL to Wiro for use as model input. Downloads the file and uploads it to Wiro's file system via `POST /File/Upload`.

> **Tip:** Most models accept direct URLs in file parameters (e.g. `inputImage`, `inputImageUrl`), so you don't need to upload first. Use `upload_file` when you need to reuse the same file across multiple runs or when the model specifically requires a Wiro-hosted file. See [Model Parameters](/docs/model-parameters) for details.

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

### get_account and get_playbook

`get_account` takes no arguments. It names the workspace of the connected
project, personal or a team, and shows that wallet's balance. It is also the
call that proves the connection works, since model search, schema reads and
`search_docs` answer without credentials. `get_playbook` takes `topics`, one or
more of the playbook topics listed under [Available Tools](#available-tools),
such as `["workflows"]` or `["agents", "billing"]`.

### Workflow tools

The workflow, conversation and agent tools publish their full input schemas,
which your MCP client reads, so the tables below list only their main
arguments. A workflow is named by its full slug, such as `product-shots-a1B2c`,
and a run by its run token. The [Workflows](/docs/workflows) page describes the
API behind these tools.

| Tool | Main arguments |
|------|----------------|
| `list_workflows` | `scope` (`mine` or `public`), `search`, `tags`, `model`, `sort`, `start`, `limit` |
| `get_workflow` | `slug`, `include_graph` |
| `create_workflow` | `title`, `contents` (the graph), `description`, `tags` |
| `update_workflow` | `slug`, `loaded_updatetime`, `title`, `description`, `tags`, `contents`, `confirm` |
| `clone_workflow` | `slug` |
| `delete_workflow` | `slug`, `confirm` |
| `run_workflow` | `slug`, `input` (values keyed by the workflow's input names), `breakpoint_node_id`, `wait_seconds` |
| `wait_for_workflow_run` | `workflowtoken`, `wait_seconds`, `debug_node_id` (shows what a step's model received) |
| `resume_workflow_run` | `workflowtoken`, `breakpoint_node_id`, `wait_seconds` |
| `list_workflow_runs` | `status`, `search`, `start`, `limit` |
| `save_workflow_from_agent` | `message_id`, `session`, `artifact_hash` (which proposal), `workflow` and `loaded_updatetime` to save onto an existing workflow, `confirm` |

### Conversation tools

These tools work the same for Studio, the Workflow Agent and your own agents.
`agent` is `"studio"`, `"workflow-agent"` or the guid of one of your agents,
and `session` names the conversation. See [Studio](/docs/studio),
[Workflow Agent](/docs/workflow-agent) and
[Agent Messaging](/docs/agent-messaging).

| Tool | Main arguments |
|------|----------------|
| `send_agent_message` | `agent`, `message`, `session`, `model` (Studio and the Workflow Agent), `attachment_urls`, `workflow` (the workflow to edit, Workflow Agent only), `wait_seconds` |
| `get_agent_message` | `agent`, `message_id`, `session`, `wait_seconds` |
| `get_agent_conversation` | `agent`, `session` (leave it out to list the conversations), `limit`, `before` |
| `cancel_agent_message` | `agent`, `message_id`, `session` |
| `delete_agent_session` | `agent`, `session`, `confirm` |
| `list_studio_results` | `limit` (up to 100 recent runs), `state`, `since` |

### Agent tools

An agent is named by its guid, which `list_my_agents` returns. See
[Agent Overview](/docs/agent-overview), [Agent Builder](/docs/agent-builder),
[Agent Credentials & OAuth](/docs/agent-credentials) and
[Agent Skills](/docs/agent-skills) for the API behind these tools.

| Tool | Main arguments |
|------|----------------|
| `list_agent_templates` | `search`, `category`, `sort` (`newest`, `popular` or `title`), `start`, `limit` |
| `get_agent_template` | `template`, `include_tasks` |
| `list_agent_skills` | `name`, `category`, `capability` |
| `deploy_agent` | `template`, or `custom: true` with `skills`; `tier` (`starter` or `pro`), `title`, `credentials`, `confirm`, `confirm_charge_usd` |
| `list_my_agents` | `sort`, `start`, `limit` |
| `get_my_agent` | `agent_guid`, `wait_seconds` (wait until it is running) |
| `control_agent` | `agent_guid`, `action` (`start`, `stop` or `restart`) |
| `update_agent` | `agent_guid`, `title`, `description`, `timezone`, `team_session_mode`, `chat_model`, `cron_model`, `enabled_commands` |
| `apply_agent_skills` | `agent_guid`, `skills`, `tier`, `confirm`, `idempotency_key` |
| `set_agent_credentials` | `agent_guid`, `credential`, `fields` |
| `connect_agent_oauth` | `agent_guid`, `credential`, `action` (`connect`, `status` or `select_accounts`), `mode` (`wiro`, `own` or `api_key`) |
| `disconnect_agent_oauth` | `agent_guid`, `credential`, `confirm` |
| `manage_agent_custom_skill` | `agent_guid`, `action` (`upsert`, `rename`, `delete`, `history` or `revert`), `key`, `kind`, `value`, `interval`, `enabled` |
| `manage_agent_billing` | `agent_guid`, `action` (`subscribe`, `upgrade_to_pro`, `cancel`, `renew` or `buy_credits`), `pack`, `confirm`, `confirm_charge_usd` |
| `get_agent_activity` | `agent_guid`, `kind` (`usage`, `logs` or `log_dates`), `date` |
| `delete_agent` | `agent_guid`, `confirm` |

## FAQ

### What models can I use?

All models in the [Wiro catalog](https://wiro.ai/models): image generation, video, audio, LLMs, 3D, and more. Use `search_models` to discover what's available.

### Is my API key stored?

No. The server is fully stateless. Your credentials are sent per-request and never stored or logged.

### Does it cost extra?

No. The MCP server itself is free. You pay the normal [Wiro prices](https://wiro.ai/pricing) for the work the tools start: model runs, the model steps of workflow runs, Studio and Workflow Agent turns, and agent plans and credits.

### What about rate limits?

The hosted MCP endpoint applies a 60-request-per-minute guard per Authorization value, in addition to Wiro API project limits. Long generations do not require rapid polling: follow the returned bounded `wait_for_task` action.

### Can I self-host?

Yes. See the [Self-Hosted MCP](/docs/mcp-self-hosted) page for instructions on running the MCP server locally or on your own infrastructure.
