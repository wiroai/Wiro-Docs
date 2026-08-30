# Direct LLM Gateway

Use Wiro models through OpenAI Chat Completions, OpenAI Responses, Anthropic
Messages, and a beta Cursor-compatible chat route. The gateway uses the same
Wiro task, project-access, team-policy, and billing system as the Run API.

OpenAI-compatible clients use base URL:

```text
https://llm.wiro.ai/v1
```

Clients that append `/v1` themselves, including Anthropic SDKs and Claude
Code, use origin `https://llm.wiro.ai`. Cursor clients that append
`/chat/completions` use beta base `https://llm.wiro.ai/v1/cursor`.

Asynchronous Run, Task, the original Wiro File API, and WebSocket remain on
`https://api.wiro.ai/v1` and `wss://socket.wiro.ai/v1`. The Direct LLM Gateway
also provides OpenAI/Anthropic-compatible `/v1/files` routes backed by that
same authenticated project storage.

Direct LLM responses never expose Wiro Run/Sync `segments`. Each route returns
only its selected protocol's native JSON and streaming events: OpenAI Chat
chunks, OpenAI Responses events, Anthropic Messages events, or Chat-compatible
Cursor events. OpenClaw and Hermes receive the native transport they configure.

In this release, `stream: true` provides protocol-compatible SSE ordering after
the provider request completes and the authenticated structured turn is
persisted. Do not interpret first-event timing as live provider token latency.

Model IDs use lowercase `owner/model` form. Do not send a provider-only model
name: discover the exact ID and protocol capabilities first.

## Choose an endpoint

- `POST /v1/Run/{owner}/{project}` remains the asynchronous task-creation
  endpoint on `api.wiro.ai`.
- `POST /v1/Run/{owner}/{project}/sync` is the generic finite-model wait on
  `api.wiro.ai`; see [Run a Model](/docs/run-a-model). It is not a Direct LLM
  protocol.
- `GET /v1/models` lists verified `llm-tool-call` models available in the
  authenticated project/team context.
  `GET /v1/chat/models` is an equivalent compatibility alias.
- `GET /v1/models/{owner}/{model}` returns one model's exact gateway contract.
- `POST`, `GET`, and `DELETE /v1/files` compatibility routes use the
  authenticated project's existing Wiro file storage.
- `POST /v1/chat/completions` uses OpenAI Chat JSON and SSE.
- `POST /v1/responses` uses OpenAI Responses JSON and official named SSE
  events.
- `POST /v1/messages` uses Anthropic Messages JSON and SSE.
- `POST /v1/messages/count_tokens` estimates Anthropic input tokens before a
  run.
- `POST /v1/cursor/chat/completions` is a beta compatibility route. It accepts
  strict Responses-shaped `input` and always returns Chat JSON/SSE.
- `GET /v1/generation?id=...` returns project-authorized generation metadata.

The asynchronous Run route returns `taskid` and `socketaccesstoken` immediately;
retrieve its result through Task Detail, WebSocket, or a callback. The generic
`/sync` wait is an additional method on `api.wiro.ai`; it does not replace
asynchronous Run. Direct LLM routes remain separate on `llm.wiro.ai`.

Training and realtime models are not accepted by `/sync` or the direct LLM
gateway. Use their existing training or realtime APIs.

## Authentication

### Project credentials

Model discovery/detail, the protocol routes, and `/generation` all use
the authenticated project's credentials. Standard compatible clients should
send a project Bearer credential:

- API Key Only project:
  `Authorization: Bearer YOUR_API_KEY`
- Signature project:
  `Authorization: Bearer YOUR_API_KEY:YOUR_API_SECRET`

The Signature Bearer value may instead be the base64 encoding of
`YOUR_API_KEY:YOUR_API_SECRET`.

The same endpoints also accept `x-api-key` containing either `YOUR_API_KEY` or
`YOUR_API_KEY:YOUR_API_SECRET`. Direct LLM routes do not accept the Run API's
`x-nonce`/`x-signature` HMAC trio.

If `Authorization` and `x-api-key` are sent together, both must identify the
same complete project credential. A mismatched key or secret, or a malformed
Bearer credential returns `401`; Wiro does not silently choose one credential
or fall back to another project.

Never expose a project key or secret in browser or mobile application code.

Anthropic Messages requires `x-api-key`. Send `YOUR_API_KEY` for an API Key
Only project or `YOUR_API_KEY:YOUR_API_SECRET` for a Signature project.
Generic `/sync` waits stay on `api.wiro.ai` and use normal Run headers.

### Session identifier

`session_id` is the only public session field. It is optional on Chat
Completions, Anthropic Messages, and the beta Cursor route, and must contain
1–128 letters, digits, `.`, `_`, `:`, or `-`. Reuse the same value for related
turns. Wiro maps it to a project-scoped internal session; it does not replace
the protocol's normal client-history requirements. Responses uses
`previous_response_id` instead, and `/v1/messages/count_tokens` does not accept
`session_id`.

## Connect an agent

Point a compatible client at `llm.wiro.ai`. Discover the exact lowercase
`owner/model` ID first. OpenAI-compatible clients use a project Bearer
credential. Anthropic-compatible clients put the same project credential in
`x-api-key`: `YOUR_API_KEY` for API Key Only or
`YOUR_API_KEY:YOUR_API_SECRET` for Signature.
Generic finite-model waits stay on [Run a Model](/docs/run-a-model).

### Cursor

In a Cursor build or extension that supports a custom OpenAI base URL and sends
Responses-shaped input at its appended `/chat/completions` path, register the
exact Wiro model and use the beta Cursor base below. Cursor's proprietary
transport is not inferred: Chat `messages` sent to this beta path are rejected.

```text
Base URL: https://llm.wiro.ai/v1/cursor
API key: YOUR_API_KEY
Model: openai/gpt-5-6-sol
```

For a Signature project, enter `YOUR_API_KEY:YOUR_API_SECRET` as the API key
value so the client sends it as a Bearer credential.

### Claude Code

Claude Code and official Anthropic SDKs use origin `https://llm.wiro.ai`
because they append `/v1/messages`. Both project types use
`ANTHROPIC_API_KEY`; Signature projects set it to the full
`YOUR_API_KEY:YOUR_API_SECRET` pair.

```bash
ANTHROPIC_BASE_URL="https://llm.wiro.ai" \
ANTHROPIC_API_KEY="YOUR_API_KEY:YOUR_API_SECRET" \
ANTHROPIC_MODEL="claude/sonnet-5" \
CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY=1 \
claude
```

### Windsurf

Windsurf Cascade has no native arbitrary-provider registration in this
release. A setup is in scope only through a tested extension or client that
can set a custom OpenAI base URL to `https://llm.wiro.ai/v1` for
`/chat/completions` or `/responses`. Do not describe this as native Cascade
support.

### VS Code

VS Code Chat reaches the gateway through its own built-in custom endpoint — no
extension required.

1. **Open the model manager** — Command Palette → `Chat: Manage Language Models`.
2. **Add a provider** — **+ Add Models** opens a provider list (Anthropic,
   Azure, Google, OpenAI, OpenRouter, xAI, Ollama). Pick **Custom Endpoint**,
   last, below the separator.
3. **Group Name** — arrives pre-filled with "Custom Endpoint"; replace it with
   `Wiro AI`. It is only a label: it titles the next two prompts and heads the
   group in the model picker. Nothing here asks for a base URL, because each
   model carries its own endpoint.
4. **API Key** — `YOUR_API_KEY:YOUR_API_SECRET` for a Signature project,
   `YOUR_API_KEY` alone for API Key Only. VS Code keeps it in its secret store;
   the file holds only a `${input:…}` reference.
5. **API Type** — choose **Chat Completions**. Responses and Messages change the
   request shape VS Code sends.
6. **Describe the models** — VS Code opens `chatLanguageModels.json` with one
   empty model. Leave `name`, `vendor`, `apiKey` and `apiType` as generated and
   fill the `models` array.

```json
[
  {
    "name": "Wiro AI",
    "vendor": "customendpoint",
    "apiKey": "${input:chat.lm.secret.xxxxxxxx}",
    "apiType": "chat-completions",
    "models": [
      {
        "id": "openai/gpt-5-6-sol",
        "name": "GPT 5.6 Sol (Wiro)",
        "url": "https://llm.wiro.ai/v1/chat/completions",
        "toolCalling": true,
        "vision": true,
        "maxInputTokens": 1050000,
        "maxOutputTokens": 65536
      },
      {
        "id": "claude/sonnet-5",
        "name": "Claude Sonnet 5 (Wiro)",
        "url": "https://llm.wiro.ai/v1/chat/completions",
        "toolCalling": true,
        "vision": true,
        "maxInputTokens": 1000000,
        "maxOutputTokens": 128000
      },
      {
        "id": "xai/grok-4-5",
        "name": "Grok 4.5 (Wiro)",
        "url": "https://llm.wiro.ai/v1/chat/completions",
        "toolCalling": true,
        "vision": true,
        "maxInputTokens": 500000,
        "maxOutputTokens": 65536
      },
      {
        "id": "bytedance/seed-v2-pro",
        "name": "Seed V2 Pro (Wiro)",
        "url": "https://llm.wiro.ai/v1/chat/completions",
        "toolCalling": true,
        "vision": true,
        "maxInputTokens": 256000,
        "maxOutputTokens": 65536
      }
    ]
  }
]
```

- `id` — the lowercase `owner/model` from `GET /v1/models`.
- `name` — a free label, shown in the picker.
- `url` — the **full endpoint**, not the base. This is why the group name is not
  a URL.
- `toolCalling`, `vision`, `maxInputTokens`, `maxOutputTokens` — read them from
  `GET /v1/models/{owner}/{model}`: `capabilities.function_tools`,
  `capabilities.input_modalities`, `max_input_tokens`, `max_tokens`. Do not
  guess.
- **`maxInputTokens` is not optional.** VS Code sizes every conversation
  against it and answers *"Could not compact conversation"* on each turn when a
  model omits it, before any request reaches the gateway. Take the number from
  `max_input_tokens`; every catalog model reports one.

Save the file and reopen the model picker; the models appear under **Wiro AI**.
Any other VS Code extension that takes a custom OpenAI base URL — Cline, Roo
Code, Continue — works the same way: point it at `https://llm.wiro.ai/v1` with
the same credential and a model ID from the catalog.

### OpenClaw

Use the model-declared transport after reading
`GET /v1/models/{owner}/{model}`: `openai-completions`, `openai-responses`, or
`anthropic-messages`. OpenAI transports use the `/v1` base; Anthropic uses the
origin.

```json
{
  "models": {
    "providers": {
      "wiro": {
        "baseUrl": "https://llm.wiro.ai/v1",
        "apiKey": "${WIRO_BEARER_CREDENTIAL}",
        "api": "openai-completions",
        "models": [{ "id": "openai/gpt-5-6-sol", "name": "GPT 5.6 Sol" }]
      }
    }
  }
}
```

### Hermes

Hermes function-calling clients, Cline, Roo Code, and Continue can use OpenAI
Chat when they accept a custom base URL. Optional tools, reasoning, and
modalities still follow the selected model's metadata.

```yaml
providers:
  wiro:
    base_url: "https://llm.wiro.ai/v1"
    api_key: "${WIRO_BEARER_CREDENTIAL}"
```

## Discover models and capabilities

### **GET** /v1/models

```bash
curl "https://llm.wiro.ai/v1/models?search=openai%2Fgpt-5-6-sol&limit=1" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

`GET /v1/chat/models` returns the same authenticated, team-filtered list. This
gateway catalog is separate from the full website/model catalog at
`POST /v1/Tool/List`.

```json
{
  "object": "list",
  "data": [
    {
      "id": "openai/gpt-5-6-sol",
      "canonical_slug": "openai/gpt-5-6-sol",
      "name": "GPT 5.6 Sol by OpenAI (Vision)",
      "description": "GPT 5.6 Sol is OpenAI's flagship reasoning and vision model for agentic coding, research, and image Q&A in one chat.",
      "context_length": 1050000,
      "architecture": {
        "modality": "text+image->text",
        "input_modalities": ["text", "image"],
        "output_modalities": ["text"]
      },
      "pricing": {
        "prompt": "0.000005",
        "completion": "0.00003"
      },
      "top_provider": {
        "context_length": 1050000,
        "max_completion_tokens": null
      },
      "supported_parameters": [
        "include_reasoning",
        "parallel_tool_calls",
        "reasoning",
        "response_format",
        "structured_outputs",
        "tool_choice",
        "tools"
      ],
      "default_parameters": {},
      "object": "model",
      "type": "model",
      "created": null,
      "created_at": null,
      "owned_by": "openai",
      "display_name": "GPT 5.6 Sol by OpenAI (Vision)",
      "max_input_tokens": 1050000,
      "max_tokens": null,
      "capabilities": {
        "endpoints": ["anthropic", "chat", "cursor", "responses"],
        "input_modalities": ["text", "image"],
        "output": ["text", "reasoning", "function_calls", "custom_tool_calls"],
        "function_tools": true,
        "custom_tools": true,
        "structured_outputs": true,
        "structured_output_modes": ["json_object", "json_schema"],
        "strict_json_schema": true,
        "generation_controls": ["reasoning_effort"]
      },
      "x_wiro": {
        "pricing_source": {
          "name": "wiro-pricing-catalog",
          "schema_version": 1,
          "revision": "3a2430b5188fcaf69b5d7af1cb40d0a59062cc37",
          "sha256": "f74c5d378dfd8b28360b2464dc2590711550df501a7c6c7f9b673db105f7798f",
          "source_model": "openai/gpt-5.6-sol",
          "basis": "local-rate"
        },
        "pricing_tiers": null
      }
    }
  ],
  "total_count": 1,
  "links": {
    "next": null
  },
  "has_more": false,
  "first_id": "openai/gpt-5-6-sol",
  "last_id": "openai/gpt-5-6-sol"
}
```

The example is intentionally explicit about nullable values that have a Wiro
source. Context, modalities, and pricing come from the audited local gateway
catalog; live Run parameters and capability flags come from the selected
model's current `Tool/Detail` contract. Fields without a Wiro source are
omitted instead of being copied from OpenRouter with `null` placeholders.
`pricing.prompt` and `pricing.completion` are USD-per-token strings.
Models with tiered rates expose those exact bands in `x_wiro.pricing_tiers`.
Pricing and context fields can be `null` for catalog entries without audited
local metadata.

The list accepts:

- `search` (at most 256 bytes), `order=asc|desc`, and `limit=1..1000`
- `after`/`after_id` or `before`/`before_id` cursors

The default order is ascending and the default limit is `1000`. `total_count`
counts the filtered catalog. `links.next` is a relative next-page URL or
`null`.

The discovery list contains only team-allowed models verified with the
`llm-tool-call` category. Other LLMs are not advertised by this endpoint; when
you already know an exact `owner/model` ID, you can still submit it to a
compatible Direct LLM route or use the normal Run API.

Before each request:

1. Confirm `anthropic`, `chat`, `cursor`, or `responses` in
   `capabilities.endpoints`.
2. Use `supported_parameters` to gate optional public request controls.
   Required protocol fields such as `model`, `input`, `messages`, or Anthropic
   `max_tokens` are not repeated there.
3. Check `capabilities.input_modalities` for canonical `text`, `image`, or
   `document`. OpenRouter-style `architecture.input_modalities` represents
   documents as `file`.
4. Check `capabilities.output`, `function_tools`, `custom_tools`,
   `structured_outputs`, `structured_output_modes`, `strict_json_schema`, and
   `generation_controls`.
5. Treat `context_length`, `max_input_tokens`, `max_tokens`, pricing, and usage
   as model-specific. A nullable field is not permission to infer a value from
   another model.

Every discoverable model currently publishes the same four endpoint labels.
Capability differences are expressed through modalities, supported parameters,
tool flags, structured-output flags, reasoning controls, and limits.

### **GET** /v1/models/{owner}/{model}

```bash
curl "https://llm.wiro.ai/v1/models/openai/gpt-5-6-sol" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

The detail route returns the same complete model object as the matching list
entry. Query parameters are rejected on detail routes. An unavailable,
non-gateway, or team-blocked model returns `model_not_found` without exposing
private catalog state.

## Generic finite task completion

`POST /v1/Run/{owner}/{project}/sync` lives on `https://api.wiro.ai/v1`, not
this gateway. See [Run a Model](/docs/run-a-model) for JSON wait, SSE, and
timeout recovery. Direct LLM clients should use Chat, Responses, Messages, or
Cursor below.

## Usage contract

When the upstream model reports usage, Wiro returns normalized counters in the
selected protocol's native shape:

- Chat and Cursor use `prompt_tokens`, optional `prompt_tokens_details`,
  `completion_tokens`, optional `completion_tokens_details`, and
  `total_tokens`.
- Responses uses `input_tokens`, `input_tokens_details`, `output_tokens`,
  `output_tokens_details`, and `total_tokens`.
- Anthropic Messages uses cache-exclusive `input_tokens`, `output_tokens`,
  optional `cache_read_input_tokens`, optional
  `cache_creation_input_tokens`, and optional five-minute/one-hour
  `cache_creation` detail.

For Chat and Responses, input/prompt totals are cache-inclusive. Their input
detail objects (optional on Chat/Cursor, always present on Responses) can
identify `cached_tokens`, `cache_write_tokens`,
`cache_write_5m_tokens`, `cache_write_1h_tokens`, and reported
text/audio/image/video tokens. Output/completion totals are
reasoning-inclusive; the corresponding output detail can identify
`reasoning_tokens`, reported text/audio/image/video tokens, and
accepted/rejected prediction tokens. Cache TTL values are subsets of
`cache_write_tokens`, and all detail counters are already included in their
parent total. Never add them to `total_tokens`.

There is intentionally no `cached_output_tokens` field. Provider prompt caches
reuse input context; they do not report previously generated output as cached
output usage.

Optional `server_tool_use` values count requests, not tokens. Providers omit
unsupported counters, so clients must not require every detail key. Chat,
Cursor, and Responses expose Wiro's billed amount as `usage.cost`; Anthropic
exposes it as `usage.cost_usd`. The asynchronous Run/Task contract keeps the
billed amount at task-level `totalcost`.

## Files compatibility

The gateway's Files routes are a compatibility view over the authenticated
Wiro project's existing upload folder. Uploads, lists, retrieval, and deletion
use the same storage as `File/Upload`, `File/List`, and `File/Delete` on
`api.wiro.ai`; the gateway does not create a second file database.

The supported routes are:

- `POST /v1/files` uploads one multipart field named `file`.
- `GET /v1/files` lists files in the authenticated project's upload folder.
- `GET /v1/files/{file_id}` returns file metadata.
- `GET /v1/files/{file_id}/content` checks ownership, then redirects with
  `307` to the validated public CDN URL.
- `DELETE /v1/files/{file_id}` deletes the project file.

File IDs use `file-...` form and are valid only inside the project whose
credentials created or listed them. A missing, deleted, or foreign ID returns
`file_not_found`; the gateway never falls back to another project.

### OpenAI Files

OpenAI clients use Bearer authentication. The only supported OpenAI purpose is
`assistants`:

```javascript
import fs from 'node:fs';
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.WIRO_BEARER_CREDENTIAL,
  baseURL: 'https://llm.wiro.ai/v1',
});

const file = await client.files.create({
  file: fs.createReadStream('input.png'),
  purpose: 'assistants',
});

const page = await client.files.list({ limit: 20, order: 'desc' });
const metadata = await client.files.retrieve(file.id);
const content = await client.files.content(file.id);
await client.files.delete(file.id);
```

OpenAI list queries accept `after`/`after_id`, `before`/`before_id`,
`limit=1..1000`, `order=asc|desc`, and `purpose=assistants`. The default limit
is `20` and the default order is descending. File metadata uses OpenAI's
`object: "file"`, `bytes`, Unix `created_at`, `filename`, `purpose`,
`status`, and `status_details` fields.

### Anthropic Files

Anthropic SDKs use origin `https://llm.wiro.ai` and send the required
`anthropic-version: 2023-06-01` header; that header selects the Anthropic file
metadata shape:

```javascript
import fs from 'node:fs';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  baseURL: 'https://llm.wiro.ai',
  apiKey: process.env.WIRO_API_KEY,
});

const file = await client.files.upload({
  file: fs.createReadStream('context.pdf'),
});

const page = await client.files.list({ limit: 20 });
const metadata = await client.files.retrieveMetadata(file.id);
const content = await client.files.download(file.id);
await client.files.delete(file.id);
```

Anthropic list queries accept `page`, legacy `after_id`/`before_id`, and
`limit=1..1000`. The response includes `next_page`, `has_more`, `first_id`,
and `last_id`. Metadata uses ISO `created_at`, `filename`, `mime_type`,
`size_bytes`, `type: "file"`, `downloadable`, and `expires_at`. Wiro-backed
files do not expire, so `expires_at` is `null`.

### Limits and model input

Gateway uploads are limited to 50 MiB per file. Empty files, multiple file
parts, unknown multipart fields, and filenames over 1024 bytes are rejected.
ZIP uploads are rejected because Wiro's standard File API extracts archives,
which cannot represent the one-upload/one-file contract expected by these SDKs.
The compatibility catalog reads at most 10,000 project files; that safety bound
is not a storage quota. The original Wiro File API has its own documented
limits.

Use the returned ID only where the selected protocol accepts file references.
For example, OpenAI Responses image input can use
`{ "type": "input_image", "file_id": "file-..." }`, while Anthropic document
input uses `{ "type": "file", "file_id": "file-..." }` inside its `source`
object. Before Run, the gateway verifies project ownership and MIME type, then
replaces the Wiro file ID with its existing public URL. Image references accept
GIF, JPEG, PNG, or WebP; document references accept PDF or plain text. Invalid
MIME combinations return `invalid_media_type` before model execution.

Public HTTPS URLs and validated data/base64 content remain available when the
model advertises the corresponding modality. A Wiro `file-...` ID is not a
provider file ID and is never forwarded to OpenAI, Anthropic, xAI, or another
provider.

## OpenAI Chat Completions

### **POST** /v1/chat/completions

Use a model that includes `chat` in `capabilities.endpoints`.

```bash
curl -X POST "https://llm.wiro.ai/v1/chat/completions" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "openai/gpt-5-6-sol",
    "messages": [
      { "role": "system", "content": "You are a concise assistant." },
      { "role": "user", "content": "What is SSE?" }
    ],
    "stream": false
  }'
```

The endpoint accepts `system`, `developer`, `user`, and `assistant` messages,
plus `tool` results for preceding assistant tool calls. Each request is
client-history: send the required conversation history in `messages`. Calls do
not create a saved Wiro Chat session.

Text is always available. OpenAI-style image and document content parts are
accepted only when the selected model advertises those input modalities.
Gateway output is text; this route is not an image, audio, or video generation
API. Remote media must use a public HTTPS URL or a validated data/base64
source; supported Wiro gateway file IDs may also be used. Private-network and
non-HTTP fetch targets are rejected. Provider-native file IDs are not accepted
as Wiro file IDs.

Generation fields such as `temperature`, `top_p`, `max_tokens`,
`max_completion_tokens`, penalties, `seed`, `stop`, `reasoning`, and
`response_format` are capability-gated. `n` must be `1`, `logprobs` must be
`false`, and `stop` accepts at most four non-empty values without semicolons.
Use `capabilities.structured_outputs` before requesting a non-text
`response_format`.

Standard OpenAI function tools use `tools`, `tool_choice`, and
`parallel_tool_calls`. Returned function calls use
`{ "id": "...", "type": "function", "function": { "name": "...", "arguments": "..." } }`
entries in `message.tool_calls`. Execute calls only when `finish_reason` is
`tool_calls`; a `length` or `content_filter` turn can contain partial tool data
that must not be executed. Preserve the returned assistant message unchanged,
then append matching `role: "tool"` results with `tool_call_id`. Wiro does not
execute tools on the caller's behalf.

When the model advertises `custom_tools`, Chat also accepts the nested custom
tool shape:

```json
{
  "type": "custom",
  "custom": {
    "name": "airport_code",
    "format": {
      "type": "grammar",
      "syntax": "regex",
      "definition": "[A-Z]{3}"
    }
  }
}
```

Use a matching nested custom `tool_choice`. Returned custom calls use
`{ "id": "...", "type": "custom", "custom": { "name": "...", "input": "..." } }`
entries in `message.tool_calls`. Execute them client-side and append
`role: "tool"` results with the same `tool_call_id`, just as for function calls.

Reasoning is model-specific. Public model reasoning can appear in
`message.reasoning` and `message.reasoning_details`; use the advertised
reasoning controls and supported efforts. Tool/reasoning combinations are also
model-specific, so do not infer support from another model.

Final responses use `chat.completion`. Native `usage` is conditional: a
successful completion is still returned when usage counters remain
unavailable.

For streaming, set body-level `"stream": true`. Text arrives in
`choices[0].delta.content`, reasoning in `delta.reasoning` and
`reasoning_details`, and function calls in `delta.tool_calls`. Concatenate tool
argument fragments by call `index`. The stream terminates with:

```text
data: [DONE]
```

With `stream_options.include_usage: true`, Wiro emits a final empty-choices
usage chunk before `[DONE]` only when native counters are available.

If a failure happens after Chat SSE has started, Wiro emits an OpenAI error
object in a `data:` frame, then `data: [DONE]`, and closes the connection.
The same midstream rule applies to the beta Cursor route. Once SSE headers have
been sent, the original HTTP status cannot communicate that later failure.

### OpenAI SDK

```javascript
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.WIRO_BEARER_CREDENTIAL,
  baseURL: 'https://llm.wiro.ai/v1',
});

const completion = await client.chat.completions.create({
  model: 'openai/gpt-5-6-sol',
  messages: [{ role: 'user', content: 'Hello' }],
});
```

For a Signature project, `WIRO_BEARER_CREDENTIAL` is
`YOUR_API_KEY:YOUR_API_SECRET`.

## OpenAI Responses

### **POST** /v1/responses

Use a model that includes `responses` in `capabilities.endpoints`. `input` can
be a string or Responses items; `instructions`, tools, text formatting,
multimodal input, reasoning, and generation controls are capability-gated.
Remote media follows the same public-HTTPS/data/base64/Wiro-file-ID
restrictions as Chat.

```bash
curl -X POST "https://llm.wiro.ai/v1/responses" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "openai/gpt-5-6-sol",
    "instructions": "Answer in one paragraph.",
    "input": "Explain server-sent events.",
    "store": true,
    "stream": false
  }'
```

Final responses use the official `response` object with an opaque ID such as
`resp_...` and an `output` item array. Items can include messages, public reasoning,
function calls, and custom tool calls. Execute only tool items with
`status: "completed"` from a completed response; never execute tool items from
an incomplete response. Native `usage` can be absent.

### Stored response continuation

`store` defaults to `true` for OpenAI compatibility. Set `store: false` for a
one-off response that will not be used as `previous_response_id`.

Use the ID of a stored `completed` or `incomplete` response as
`previous_response_id`. Never execute partial tool calls from an incomplete
parent:

```json
{
  "model": "openai/gpt-5-6-sol",
  "previous_response_id": "resp_2221",
  "input": [{
    "type": "message",
    "role": "user",
    "content": [{
      "type": "input_text",
      "text": "Give me one concrete example."
    }]
  }],
  "store": true
}
```

`previous_response_id` is the public continuation field for this gateway route.
Do not send `previousTaskToken` to `/v1/responses`. Direct Run clients use
`previousTaskToken` as described in [Run a Model](/docs/run-a-model).
`session_id` is not accepted by Responses; use stored
`previous_response_id` continuation instead.

A stored response can be continued for up to 30 days by the same authenticated
user, project, team, and model. Expired, unstored, unavailable, or mismatched
responses return `response_not_found`; failed and cancelled responses are not
continuable. Chains are limited to 32 responses, and the conversation plus
requested output must fit the selected model's context window.

`store` is not accepted on `/v1/chat/completions`; these persistence rules apply
specifically to `/v1/responses`.

### Stored response retrieval and deletion

Retrieve a stored response with `GET /v1/responses/{response_id}`. Delete it
with `DELETE /v1/responses/{response_id}`; a successful deletion returns HTTP
`204` with an empty body. `POST /v1/responses/{response_id}/cancel` is not
supported and returns `response_cancel_not_supported`.

### Function and custom grammar tools

Responses function tools use the standard top-level `name`, `description`,
`parameters`, and optional `strict` shape. When a function call is returned,
submit its result in the next request as a `function_call_output` input item
with the same `call_id`.

Models with `capabilities.custom_tools: true` also accept free-form or
grammar-constrained tools:

```json
{
  "type": "custom",
  "name": "sql_query",
  "description": "Produce one read-only SQL query.",
  "format": {
    "type": "grammar",
    "syntax": "regex",
    "definition": "^SELECT .+;$"
  }
}
```

Grammar `syntax` is `regex` or `lark`. Use `format: { "type": "text" }` for a
free-form custom tool. When a `custom_tool_call` is returned, submit its result
in the next request as a `custom_tool_call_output` input item with the matching
`call_id`. `function_call_output` and `custom_tool_call_output` are next-request
input types, distinct from the returned `function_call` and
`custom_tool_call` output items. Tool execution always remains in your
application.

### Responses SSE

Set `"stream": true` for official named Responses events, including
`response.created`, `response.in_progress`, output-item/content-part events,
text and reasoning deltas,
`response.function_call_arguments.delta`/`.done`, and
`response.custom_tool_call_input.delta`/`.done`. Every `response.*` payload
carries a monotonically increasing `sequence_number`, starting at `0`. Ignore
`: keep-alive` comments.

The terminal event is `response.completed` or `response.incomplete`. A
midstream failure emits `response.failed`. Wiro then emits `data: [DONE]` and
closes the Responses stream; the official SDK consumes that sentinel.

## Anthropic Messages

### **POST** /v1/messages

Use a model that includes `anthropic` in `capabilities.endpoints`.

Anthropic SDKs normally send:

- `x-api-key: YOUR_API_KEY` for an API Key Only project, or
  `x-api-key: YOUR_API_KEY:YOUR_API_SECRET` for a Signature project
- `anthropic-version: 2023-06-01`
- optional `anthropic-beta` labels, comma-separated or repeated

`x-api-key` and `anthropic-version` are both required. An optional Bearer header
is accepted only when it resolves to the same complete credential.
Beta headers identify requested compatibility features; they do not override
model capabilities. `?beta=true` is also accepted as a beta-route marker.

```bash
curl -X POST "https://llm.wiro.ai/v1/messages" \
  -H "x-api-key: YOUR_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude/sonnet-5",
    "max_tokens": 1024,
    "system": "Be concise.",
    "messages": [{
      "role": "user",
      "content": "What is SSE?"
    }],
    "stream": false
  }'
```

`max_tokens` is required and positive. Messages use Anthropic `user` and
`assistant` roles; system instructions belong in the top-level `system` field.
Content can include `text`, model-advertised `image` or `document` input,
`tool_use`, `tool_result`, and supported thinking blocks. Remote media uses
validated public HTTPS, data/base64, or Wiro gateway file references.

Messages is client-history: resend the prior `user`/`assistant` content and
tool blocks required for each turn. It does not use Responses storage or
`previous_response_id`.

Anthropic function tools use `name`, `description`, and `input_schema`.
`tool_choice` supports Anthropic `auto`, `any`, `tool`, and `none` choices.
Anthropic's optional `type: "custom"` still denotes an ordinary client
function tool with `input_schema`; it is not OpenAI's free-form custom grammar
shape. Tool calls are returned as `tool_use`; your application executes them
and sends `tool_result`. Provider-hosted tools, hosted containers, and remote
MCP servers are rejected by this release. Execute `tool_use` blocks only when
`stop_reason` is `tool_use`; do not execute tool data from `max_tokens` or
`refusal` turns.

Thinking controls use:

```json
{ "thinking": { "type": "enabled", "budget_tokens": 2048 } }
```

`type` can be `enabled`, `adaptive`, or `disabled`. Check
`supported_parameters` for public reasoning controls and
`capabilities.output` for reasoning output. Do not fabricate or alter
signature or redacted-thinking blocks returned by the model.

Final responses use the Anthropic `message` object with opaque `msg_...` request
IDs; they are not Wiro task IDs. Public output content contains `text` and
`tool_use` blocks. Internal model reasoning is not projected as Anthropic
`thinking` or `redacted_thinking` output. Usage is included only when native
counters are available.

For streaming, set `"stream": true`. The SSE sequence uses Anthropic events
such as `message_start`, `content_block_start`, `content_block_delta`,
`content_block_stop`, `message_delta`, and `message_stop`, with `ping`
keepalives. A midstream failure emits Anthropic's native `error` event and
closes the connection. A successful stream ends with `message_stop` and
connection close; it does not emit `[DONE]`. Text blocks use `text_delta`, and
`tool_use` blocks use `input_json_delta`. The gateway does not emit
`thinking_delta`.

### Anthropic SDKs and Claude Code

The official Node and Python SDKs must use origin `https://llm.wiro.ai`, not
the OpenAI `/v1` base:

```javascript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  baseURL: 'https://llm.wiro.ai',
  apiKey: process.env.WIRO_API_KEY,
});
const message = await client.messages.create({
  model: 'claude/sonnet-5',
  max_tokens: 1024,
  messages: [{ role: 'user', content: 'Hello' }],
});
```

`WIRO_API_KEY` is `YOUR_API_KEY` for an API Key Only project or
`YOUR_API_KEY:YOUR_API_SECRET` for a Signature project. Python uses the
equivalent `base_url` and `api_key` options.

For Claude Code with a Signature project:

```bash
ANTHROPIC_BASE_URL="https://llm.wiro.ai" \
ANTHROPIC_API_KEY="YOUR_API_KEY:YOUR_API_SECRET" \
ANTHROPIC_MODEL="claude/sonnet-5" \
CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY=1 \
claude
```

For an API Key Only project, set `ANTHROPIC_API_KEY` to `YOUR_API_KEY`.
Model discovery uses Wiro's authenticated `/v1/models` route with `limit=1000`.
Claude Code adds only discovered IDs containing
`claude` or `anthropic` to its picker; set `ANTHROPIC_MODEL` explicitly for
any other compatible ID. Native Messages, client tools,
streaming, beta headers, thinking continuation, and token-counting calls remain
subject to the selected model's advertised capabilities. Provider-hosted tools
remain outside this release even when a client beta can describe them.

### **POST** /v1/messages/count_tokens

```bash
curl -X POST "https://llm.wiro.ai/v1/messages/count_tokens" \
  -H "x-api-key: YOUR_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude/sonnet-5",
    "system": "Be concise.",
    "messages": [{ "role": "user", "content": "Hello" }]
  }'
```

```json
{ "input_tokens": 28 }
```

This is a local preflight estimate over the submitted Anthropic payload, not
authoritative billing or provider-native usage. The estimate endpoint is part
of the Anthropic compatibility route; the model catalog does not label it as
native token counting.

## Beta Cursor-compatible chat

### **POST** /v1/cursor/chat/completions

Use a model that includes `cursor` in `capabilities.endpoints`. This route is
beta and may evolve. It accepts Responses-style `input` and optional
`instructions`. Chat `messages` are rejected rather than guessed. It always returns an OpenAI
`chat.completion` object and does not provide Responses persistence:
`previous_response_id` is disabled and `store` is forced off.

```bash
curl -X POST "https://llm.wiro.ai/v1/cursor/chat/completions" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "openai/gpt-5-6-sol",
    "input": "Summarize this function.",
    "stream": true
  }'
```

Function tools, custom tools, grammar tools, reasoning, and input modalities
remain model-capability-gated. Streaming always uses Chat chunks and terminates
with `data: [DONE]`; it never switches to Responses SSE.

Clients that append `/chat/completions` can use
`https://llm.wiro.ai/v1/cursor` as their beta base URL.

## Generation metadata

### **GET** /v1/generation?id=

Look up terminal metadata using the exact public ID emitted by the protocol
route: the response `id` for Chat, Cursor, or Responses, and the `request-id`
response header for Messages. The equivalent path form is
`GET /v1/generation/{public-id}`.

```bash
curl "https://llm.wiro.ai/v1/generation?id=resp_01HZX7Y8Q9" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

```json
{
  "data": {
    "id": "resp_01HZX7Y8Q9",
    "model": "openai/gpt-5-6-sol",
    "protocol": "responses",
    "status": "completed",
    "created_at": "2026-08-21T12:00:00.000Z",
    "completed_at": "2026-08-21T12:00:03.000Z",
    "usage": {
      "input_tokens": 20,
      "input_tokens_details": {
        "cached_tokens": 0,
        "cache_write_tokens": 0
      },
      "output_tokens": 12,
      "output_tokens_details": {
        "reasoning_tokens": 4
      },
      "total_tokens": 32
    },
    "upstream_metered_cost": 0.0021,
    "upstream_elapsed_seconds": 3
  }
}
```

`protocol` is `chat`, `cursor`, `messages`, or `responses`. `status` is
`completed`, `failed`, or `incomplete`. `created_at` and `completed_at` are ISO
8601 strings.

When token counters are available, `usage` follows the selected protocol:

- `responses`: `input_tokens`, `input_tokens_details` with `cached_tokens` and
  `cache_write_tokens`, `output_tokens`,
  `output_tokens_details.reasoning_tokens`, and `total_tokens`.
- `chat` and `cursor`: `prompt_tokens`, optional `prompt_tokens_details`,
  `completion_tokens`, optional `completion_tokens_details`, and
  `total_tokens`.
- `messages`: `input_tokens`, `output_tokens`, and nullable
  `cache_creation_input_tokens` and `cache_read_input_tokens`. This shape does
  not add `total_tokens`.

`usage` is `null` when no valid counters were recorded.
`upstream_metered_cost` and `upstream_elapsed_seconds` are finite upstream task
counters when available, otherwise `null`; cost is not duplicated inside
metadata `usage`.

Only the owning authenticated project can read a generation. Missing, expired,
and foreign IDs all return `generation_not_found`. This endpoint is terminal
observability metadata, not task output: it does not return a Wiro task ID,
generated content, or continuation state. Read generated content from the
original protocol JSON or SSE response.

## Deliberate boundaries

The Direct LLM Gateway does not currently provide:

- provider-hosted web search, file search, code interpreter, computer-use, or
  remote MCP tool execution; Wiro returns tool calls for your client to run
- a native Gemini `generateContent` protocol
- embeddings or reranking
- automatic model routing or fallback routing
- bring-your-own-provider-key (BYOK) execution
- dedicated image, audio, or video generation through the Chat, Responses,
  Messages, or Cursor-compatible routes
- the legacy `/v1/completions` endpoint

Use Wiro's normal [Run or /sync APIs](/docs/run-a-model) for supported finite
media-generation models. Image and document **input** to an LLM is distinct from
media generation and remains available when the selected model advertises it.
Remote media fetches must use public HTTPS; validated data/base64 sources and
Wiro gateway file IDs are accepted only where the selected protocol/model
supports them. Provider-native file IDs are not interchangeable.

## Errors

Error responses preserve the selected public protocol:

- Chat, Responses, Cursor, model, and generation errors use the
  OpenAI-style `{ "error": { "message", "type", "param", "code" } }` shape.
- Anthropic routes use
  `{ "type": "error", "error": { "type", "message" } }`.

Generic `/sync` waits on `api.wiro.ai` use the normal Wiro `result`/`errors`
envelope.

After a stream starts, inspect SSE events rather than the HTTP status: Chat and
Cursor emit an error `data:` frame followed by `[DONE]`, Responses emits
`response.failed`, and Anthropic emits `error`.

Common codes include `invalid_model`, `model_not_found`,
`unsupported_model_type`, `unsupported_parameter`, `response_not_found`,
`response_chain_too_deep`, `invalid_generation_id`, `generation_not_found`,
`completion_timeout`, `model_execution_failed`, `task_cancelled`, and
`unsupported_capability`. Files routes can also return `file_not_found`,
`file_too_large`, `invalid_multipart`, `missing_file`, `invalid_filename`,
`invalid_media_type`, `invalid_pagination`, `invalid_query`,
`file_catalog_too_large`, `file_content_unavailable`, `file_api_unavailable`,
and `invalid_file_response`.

Gateway-origin and upstream execution failures use HTTP `500` with their
specific error code; the public protocol does not return HTTP `502`.
Responses under `/v1` include `ratelimit-limit`, `ratelimit-remaining`,
`ratelimit-reset`, `request-id`, and `x-request-id`. A rate-limit response also
includes `retry-after`.

Protocol execution POST bodies must be JSON and are limited to 16 MiB. Files
uploads are multipart and use the separate 50 MiB file limit. Unsupported
fields that could change execution fail instead of being silently accepted. A
model task can also fail after HTTP validation; preserve the protocol error and
status rather than treating every `2xx` task creation as a successful model
answer.
