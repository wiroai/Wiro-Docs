# FAQ

Common questions about using the Wiro API. If you can't find the answer here, [contact support](mailto:support@wiro.ai).

## How do I get an API key?

Sign up at [wiro.ai](https://wiro.ai), then create a project at [wiro.ai/panel/project](https://wiro.ai/panel/project/new). Your API key (and secret, if signature-based) are displayed once — copy and store them securely.

## Which authentication method should I use?

**Signature-Based** is recommended — it uses HMAC-SHA256 so your API secret never leaves your environment. **API Key Only** is simpler and fine for server-side applications where you control the environment. See [Authentication](/docs/authentication) for details.

## Is there a rate limit?

Yes. Every account has a concurrency limit that controls how many tasks can run at the same time. The limit scales automatically based on your account balance. See [Concurrency Limits](/docs/concurrency-limits) for the full table.

## Do I pay for failed tasks?

No. If a task fails (non-zero `pexit`), you are not charged. Only successfully completed tasks are billed.

## How do I check the cost before running a model?

Use the [POST /Tool/Detail](/docs/models) endpoint — the response includes the model's pricing information. If you're using the [MCP server](/docs/wiro-mcp-server), the `search_models` and `get_model_schema` tools also return pricing.

## How long are generated files stored?

Output files are stored on Wiro's CDN and available for a limited time. Download and store any files you need to keep long-term. See [Files](/docs/files) for details on file management.

## Are generated file URLs public?

Yes. Output URLs returned by Wiro are publicly accessible. Anyone with the URL can access the file. If you need private storage, download the files to your own infrastructure.

## How do I get real-time task updates?

Connect to the [WebSocket](/docs/websocket) at `wss://socket.wiro.ai/v1` and register with the `socketaccesstoken` from your run response. You'll receive events as the task progresses. For simpler integrations, you can poll the [Task Detail](/docs/tasks) endpoint.

## How do LLM responses work?

LLM models return their response in both places: `outputs` contains a structured entry with `contenttype: "raw"` (with `prompt`, `raw`, `thinking`, and `answer` fields), and `debugoutput` contains the merged plain text. For streaming, each token arrives as a separate `task_output` WebSocket event. See [LLM & Chat Streaming](/docs/llm-chat-streaming) for details.

## Can I send a URL instead of uploading a file?

Yes. For `fileinput` and `multifileinput` parameters, use the `{id}Url` suffix (e.g., `inputImageUrl`). For `combinefileinput`, pass URLs directly in the original parameter. You can also pass a URL directly to any file parameter if the `{id}Url` field doesn't exist. See [Model Parameters](/docs/model-parameters).

## What is pexit and how do I use it?

`pexit` is the process exit code — `"0"` means success, any other value means failure. It's the most reliable way to determine if a task succeeded. Always check `pexit` in the `task_postprocess_end` event or Task Detail response. See [Tasks](/docs/tasks).

## Does the MCP server cost extra?

No. The [Wiro MCP server](/docs/wiro-mcp-server) is free. You only pay for the model runs you trigger, at standard pricing.

## Can I use Wiro with n8n?

Yes. Install the [Wiro AI community node](/docs/n8n-wiro-integration) in your n8n instance to access all Wiro models as drag-and-drop nodes in your workflows.

## Can I use a webhook instead of polling?

Yes. All models support an optional `callbackUrl` parameter. When provided, Wiro will POST the task result to your URL when the task completes. See [Webhook Callback](/docs/model-parameters) in Model Parameters.

### What are Wiro Agents?

Wiro Agents are autonomous AI assistants that you deploy and manage via the API. Unlike single model runs, agents can connect to third-party services (Twitter, Google Ads, HubSpot, etc.), maintain conversation memory across sessions, and run scheduled tasks automatically. See the [Agent Overview](/docs/agent-overview) for details.

### How do I deploy an agent?

Browse the [agent catalog](https://wiro.ai/agents), subscribe to a plan, and deploy via `POST /UserAgent/Deploy`. After deployment, configure credentials and start the agent. See [Agent Overview](/docs/agent-overview) for the full lifecycle.

### Can I build my own product with Wiro Agents?

Yes. Use the Agent Messaging API to send messages programmatically, receive streaming responses via WebSocket, and get async notifications via webhooks. You can build white-label chat interfaces, webhook-driven pipelines, and multi-agent workflows. See [Agent Use Cases](/docs/agent-use-cases).

### How do I connect third-party services to an agent?

Agents connect to services like Twitter, Instagram, Google Ads, and HubSpot via OAuth or API keys. Use the `/UserAgentOAuth/{Provider}Connect` endpoints to initiate OAuth flows, or set API keys via `/UserAgent/Update`. See [Agent Credentials & OAuth](/docs/agent-credentials).
