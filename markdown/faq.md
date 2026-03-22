# FAQ

Common questions about using the Wiro API.

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

LLM models return their response in `debugoutput`, not in the `outputs` file array. For streaming, each token arrives as a separate `task_output` WebSocket event. See [LLM & Chat Streaming](/docs/llm-chat-streaming) for details.

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
