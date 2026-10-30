# FAQ

Common questions about using the Wiro API. If you can't find the answer here, [contact support](mailto:support@wiro.ai).

## How do I get an API key?

Sign up at [wiro.ai](https://wiro.ai), then create a project at [wiro.ai/panel/project](https://wiro.ai/panel/project/new). Copy your API key (and secret, if signature-based) and store them securely. You can see them again on the Projects page after you confirm it's you.

## Which authentication method should I use?

**Signature-Based** is recommended. It uses HMAC-SHA256 so your API secret never leaves your environment. **API Key Only** is simpler and fine for server-side applications where you control the environment. Use either method only from your own server, never in browser or mobile app code. See [Authentication](/docs/authentication) for details.

## Is there a rate limit?

Yes. Every account has a concurrency limit that controls how many tasks can run at the same time. The limit scales automatically based on your account balance. See [Concurrency Limits](/docs/concurrency-limits) for the full table.

## Do I pay for failed tasks?

No. If a task fails (non-zero `pexit`), you are not charged. Only successfully completed tasks are billed.

## How do I check the cost before running a model?

Use the [POST /Tool/Detail](/docs/models) endpoint. The response includes the model's pricing information. If you're using the [MCP server](/docs/wiro-mcp-server), the `search_models` and `get_model_schema` tools also return pricing.

## How long are generated files stored?

Output files are stored on Wiro's CDN and available for a limited time. Download and store any files you need to keep long-term. See [Files](/docs/files) for details on file management.

## Are generated file URLs public?

Yes. Output URLs returned by Wiro are publicly accessible. Anyone with the URL can access the file. If you need private storage, download the files to your own infrastructure.

## What happens when I delete my account?

Your account is closed right away and its API keys stop working. Its subscriptions stop renewing and end with their current billing period, without a refund. A renewal invoice that is still unpaid is cancelled. Its automatic top-ups stop. 30 days later, or later if something still needs it, such as an active subscription, we permanently delete its data, including your files, tasks, projects and API keys. Until then, write to [support@wiro.ai](mailto:support@wiro.ai) if you want it restored. We keep records the law requires, such as payment and invoice records. See [Data Deletion](https://wiro.ai/agreement/data-deletion) for details.

## How do I get real-time task updates?

Connect to the [WebSocket](/docs/websocket) at `wss://socket.wiro.ai/v1` and register with the `socketaccesstoken` from your run response. You'll receive events as the task progresses. For simpler integrations, you can poll the [Task Detail](/docs/tasks) endpoint.

## How do LLM responses work?

LLM models return their response in two places: as merged text in `debugoutput`, and as a structured entry in the `outputs` array with `contenttype: "raw"` containing `prompt`, `raw`, and separate `thinking` and `answer` arrays. For streaming, each `task_output` WebSocket event carries the latest cumulative snapshot of the output. See [LLM & Chat Streaming](/docs/llm-chat-streaming) for details.

## Can I send a URL instead of uploading a file?

Yes. For `fileinput` parameters, use the `{id}Url` suffix (e.g., `inputImageUrl`). For `multifileinput`, send comma-separated URLs in the field that puts `Url` before `Multiple` (e.g., `inputDocumentUrlMultiple`). For `combinefileinput`, pass URLs directly in the original parameter. You can also pass a URL directly to a `fileinput` parameter if the `{id}Url` field doesn't exist. The URL must be a public `http(s)` address. See [Model Parameters](/docs/model-parameters).

## What is pexit and how do I use it?

`pexit` is the process exit code: `"0"` means success, any other value means failure. It's the most reliable way to determine if a task succeeded. Always check `pexit` in the `task_postprocess_end` event or Task Detail response. See [Tasks](/docs/tasks).

## Does the MCP server cost extra?

No. The [Wiro MCP server](/docs/wiro-mcp-server) is free. You only pay for the model runs you trigger, at standard pricing.

## Can I use Wiro with n8n?

Yes. Install the [Wiro AI community node](/docs/n8n-wiro-integration) in your n8n instance to access all Wiro models as drag-and-drop nodes in your workflows.

## Can I use a webhook instead of polling?

Yes. All models support an optional `callbackUrl` parameter. When provided, Wiro will POST the task result to your URL when the task completes. It must be a public `http(s)` address. See [Webhook Callback](/docs/model-parameters) in Model Parameters.

### What are Wiro Agents?

Wiro Agents are autonomous AI assistants that you deploy and manage via the API. Unlike single model runs, agents can connect to third-party services (Twitter, Google Ads, HubSpot, etc.), maintain conversation memory across sessions, and run scheduled tasks automatically. See the [Agent Overview](/docs/agent-overview) for details.

### How do I deploy an agent?

Browse the [agent catalog](https://wiro.ai/agents), subscribe to a plan, and deploy via `POST /UserAgent/Deploy`. After deployment, configure credentials and start the agent. See [Agent Overview](/docs/agent-overview) for the full lifecycle.

### Can I build my own product with Wiro Agents?

Yes. Use the Agent Messaging API to send messages programmatically, receive streaming responses via WebSocket, and get async notifications via webhooks. You can build white-label chat interfaces, webhook-driven pipelines, and multi-agent workflows. See [Agent Use Cases](/docs/agent-use-cases).

### How do I connect third-party services to an agent?

Agents connect to services like Twitter, Instagram, Google Ads, and HubSpot via OAuth or API keys. Use `POST /UserAgentOAuth/OAuthConnect` with the provider's `credentialkey` to initiate OAuth flows, or set API keys via `/UserAgent/CredentialUpsert`. See [Agent Credentials & OAuth](/docs/agent-credentials).
