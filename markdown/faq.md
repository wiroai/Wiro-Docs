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

Yes. For `fileinput` parameters, use the `{id}Url` suffix (e.g., `inputImageUrl`). For `multifileinput`, send comma-separated URLs in the field that puts `Url` before `Multiple` (e.g., `inputDocumentUrlMultiple`). For `combinefileinput`, pass URLs directly in the original parameter. A `fileinput` or `multifileinput` with no URL field takes them in the parameter itself. The URL must be a public `http(s)` address. See [Model Parameters](/docs/model-parameters).

## What is pexit and how do I use it?

`pexit` is the process exit code: `"0"` means success, any other value means failure. It's the most reliable way to determine if a task succeeded. Always check `pexit` in the `task_postprocess_end` event or Task Detail response. See [Tasks](/docs/tasks).

## Does the MCP server cost extra?

No. The [Wiro MCP server](/docs/wiro-mcp-server) is free. You pay the normal prices for the work its tools start: model runs, the model steps of workflow runs, Studio and Workflow Agent turns, and agent plans and credits.

## Can I use Wiro with n8n?

Yes. Install the [Wiro AI community node](/docs/n8n-wiro-integration) (`@wiro-ai/n8n-nodes-wiro`) in your n8n instance to run any Wiro model from your workflows. Pick the model in the node and its inputs load with their defaults. The node is [verified by n8n](https://n8n.io/integrations/wiro-ai/), so an instance owner can also install it from the nodes panel, on n8n Cloud too.

## Which other apps have a Wiro AI add-on?

Wiro AI has open-source add-ons for these apps. Each repository has the install steps:

- [ComfyUI](https://github.com/wiroai/Wiro-ComfyUI): nodes that run image, video, audio, 3D and LLM models inside your graphs, also on the [Comfy Registry](https://registry.comfy.org/nodes/comfyui-wiro)
- [Dify](https://github.com/wiroai/Wiro-Dify-Plugin): the LLM gateway and voice models as a model provider, plus tools for images, video, speech, music and 3D in workflows and agents
- [WordPress](https://github.com/wiroai/Wiro-WordPress): featured images, image edits, alt text, narration and SEO suggestions in the block editor, from the [WordPress plugin directory](https://wordpress.org/plugins/wiro-ai/)
- [Obsidian](https://github.com/wiroai/Wiro-Obsidian): images, video, speech, music, transcription and text tools, saved into your notes, from [Obsidian community plugins](https://community.obsidian.md/plugins/wiro-ai)
- [Figma](https://github.com/wiroai/Wiro-Figma): images, SVG vectors, image edits, background removal and text rewriting or translation on the canvas
- [Blender](https://github.com/wiroai/Wiro-Blender): text to 3D, image to 3D and textures, with any model in the catalog
- [Raycast](https://github.com/wiroai/Wiro-Raycast): image and video generation, LLM chat and model search from your launcher
- [Zed](https://github.com/wiroai/Wiro-Zed): the Wiro MCP server in Zed's Agent Panel
- [GitHub Actions](https://github.com/wiroai/Wiro-Action): run models, workflows and LLM prompts from a workflow step
- [Hermes Agent](https://github.com/wiroai/Wiro-Hermes): media tools, plus the LLM gateway as a model provider
- [Coding agents](https://github.com/wiroai/Wiro-Skills): agent skills for images, image edits, video, music, speech, transcripts, 3D and model search in Claude Code, Codex, Cursor, Gemini CLI, GitHub Copilot and OpenClaw
- [Vercel AI SDK](https://github.com/wiroai/Wiro-LLM): chat, image, speech, transcription and video models, with a [Next.js starter](https://github.com/wiroai/Wiro-Next-Starter) for Vercel and Railway
- [Chrome, Edge, Opera and Brave](https://github.com/wiroai/Wiro-Chromium-Extension), [Firefox](https://github.com/wiroai/Wiro-Firefox-Extension) and [Safari](https://github.com/wiroai/Wiro-Safari-Extension): right-click an image, video, audio clip, text or page to run a model. Install it from the [Chrome Web Store](https://chromewebstore.google.com/detail/wiro-ai-tools-for-images/cehkhdmppbnfeahegjjkdhangjelehab), [Microsoft Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/wiro-ai-tools-for-images/obkibkhehpojlejdoinhlmoofalgaddg), [Firefox Add-ons](https://addons.mozilla.org/firefox/addon/wiro-ai/) or the [Naver Whale Store](https://store.whale.naver.com/detail/elgobhnkemhlhfakdmpijbknhehnkgle)

AI assistants such as Claude, ChatGPT, Cursor and VS Code connect through the [Wiro MCP server](/docs/wiro-mcp-server).

## Can I use a webhook instead of polling?

Yes. All models support an optional `callbackUrl` parameter. When provided, Wiro will POST the task result to your URL when the task completes. It must be a public `http(s)` address. See [Webhook Callback](/docs/model-parameters) in Model Parameters.

### What are Wiro Agents?

Wiro Agents are autonomous AI assistants that you deploy and manage via the API. Unlike single model runs, agents can connect to third-party services (Twitter, Google Ads, HubSpot, etc.), maintain conversation memory across sessions, and run scheduled tasks automatically. See the [Agent Overview](/docs/agent-overview) for details.

### How do I deploy an agent?

Pick a template in the [agent catalog](https://wiro.ai/agents) or build your own, then call `POST /UserAgent/Deploy` with `useprepaid: true` and a plan in `tier`: `starter` ($5 a month, 500 credits), `pro` ($30, 3,000) or `max` ($100, 10,000). Your wallet pays the plan, and Wiro queues the agent to start on its own. Then connect the services it uses. Every plan includes every skill and connector. See [Agent Overview](/docs/agent-overview) for the full lifecycle.

### How much does an agent cost?

Each agent runs on one of three monthly plans: Starter ($5 a month with 500 credits), Pro ($30 with 3,000) or Max ($100 with 10,000). Every plan includes every skill and connector, so turning one on or off costs nothing. Each turn the agent runs uses credits by the tokens its model uses, and extra credit packs add 1,000 credits for $10, 5,000 for $50 or 20,000 for $200. A higher plan starts at once; a lower plan starts at the next renewal. See [Pricing Model](/docs/agent-overview#pricing-model-plans-credits-token-billing).

### Can I build my own product with Wiro Agents?

Yes. Use the Agent Messaging API to send messages programmatically, receive streaming responses via WebSocket, and get async notifications via webhooks. You can build white-label chat interfaces, webhook-driven pipelines, and multi-agent workflows. See [Agent Use Cases](/docs/agent-use-cases). For a chat in your own product, with setup from chat, follow [Agent Chat Integration](/docs/agent-chat-integration).

### Can I watch my agent work?

Yes. In the Wiro panel, the people who manage an agent can open its Screen beside the chat and watch its computer live (on a team agent, while its Chat Mode is Collaborative). The owner of a personal agent that has never been in a team, or whose browser was reset after it last left one, can also take control and use the keyboard and mouse, for example to sign in to a site for the agent. See [Screen and Take Control](/docs/agent-overview#screen-and-take-control).

### How do I connect third-party services to an agent?

Agents connect to services like Twitter, Instagram, Google Ads, and HubSpot via OAuth or API keys. Use `POST /UserAgentOAuth/OAuthConnect` with the provider's `credentialkey` to initiate OAuth flows, or set API keys via `/UserAgent/CredentialUpsert`. See [Agent Credentials & OAuth](/docs/agent-credentials). You can also ask the agent in its chat: it proposes a setup card, and an agent admin approves it and gives the key, which the agent never sees. See [Setup From Chat](/docs/agent-messaging#setup-from-chat).
