# LLM & Chat Streaming

Stream LLM responses in real time with ordered output segments, session history, and multi-turn conversations.

## Overview

LLM (Large Language Model) requests on Wiro work differently from standard model runs:

- Responses are available as structured content in `outputs` (with `contenttype: "raw"`) and as merged plain text in `debugoutput`
- Streaming `task_output` messages contain ordered text/tool-call `segments` —
  not plain strings
- Multi-turn conversations are supported via `session_id` and `user_id` parameters
- `pexit` is the primary success indicator
- The [Direct LLM Gateway](/docs/completions-api) offers OpenAI Chat/Responses and Anthropic Messages on `llm.wiro.ai`.
  Generic `/sync` waits stay on [Run a Model](/docs/run-a-model).

Available LLM models include:
- [openai/gpt-5-2](https://wiro.ai/models/openai/gpt-5-2)
- [openai/gpt-oss-20b](https://wiro.ai/models/openai/gpt-oss-20b)
- [qwen/qwen3-5-27b](https://wiro.ai/models/qwen/qwen3-5-27b)

## Session & Chat History

Wiro maintains conversation history per session. By sending a `session_id` and `user_id` parameters:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `session_id` | string | No* | Non-empty conversation identifier (up to 256 UTF-8 bytes). Reuse it for follow-up messages. |
| `user_id` | string | No | UUID identifying the user. |
| `prompt` | string | Yes | The user's message or question. |

```json
// First message — start a new session
{
  "prompt": "What is quantum computing?",
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7"
}

// Follow-up — reuse the same session_id
{
  "prompt": "Can you explain qubits in more detail?",
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7"
}
```

`session_id` is optional on a first turn but required when continuing with
`previousTaskToken`. Reuse the same `session_id` value on continuation. The
value may contain up to 256 UTF-8 bytes; a UUID is allowed but not required.

## Ordered Output Segments

LLM output is an ordered timeline with up to four segment types:

- **Thinking** — reasoning text exposed by the selected model
- **Answer** — the final response to the user
- **Function call** — JSON arguments for an application-defined function
- **Custom tool call** — grammar-constrained or free-form tool input

A model may alternate between thinking and answering multiple times during one
response. The `segments` array preserves the exact order, including consecutive
items of the same type:

```json
{
  "segments": [
    { "type": "thinking", "text": "Let me break this into parts..." },
    { "type": "thinking", "text": "Now let me verify my reasoning..." },
    { "type": "answer", "text": "Quantum computing uses qubits..." },
    { "type": "thinking", "text": "I should clarify one detail..." },
    { "type": "answer", "text": "To summarize: qubits can be 0, 1, or..." }
  ]
}
```

Each `task_output` event contains the **full accumulated** segment snapshot, not
only the latest delta. Replace your stored segment list with the newest array;
do not append the complete array again. The active final item's `text` grows in
place as chunks arrive, so render every snapshot before the response completes.
A new item is appended only when the output phase changes. Render items in
array order and use `isThinking` to show an active reasoning indicator.

When streaming via WebSocket, `task_output` messages for LLM models contain a structured object:

```json
{
  "type": "task_output",
  "id": "534574",
  "message": {
    "type": "progressGenerate",
    "task": "Generate",
    "speed": "12.4",
    "speedType": "words/s",
    "segments": [
      { "type": "thinking", "text": "Let me analyze this step by step..." },
      { "type": "answer", "text": "Quantum computing uses qubits that can exist in superposition..." }
    ],
    "finishreason": "stop",
    "usage": {
      "input_tokens": 18,
      "input_tokens_details": { "cached_tokens": 6 },
      "output_tokens": 11,
      "output_tokens_details": { "reasoning_tokens": 4 },
      "total_tokens": 29
    },
    "isThinking": false,
    "elapsedTime": "3s"
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `message.type` | `string` | Progress payload type; currently `"progressGenerate"`. |
| `message.segments` | `array` | Full ordered text/tool-call snapshot. Replace the prior array rather than appending it. |
| `message.finishreason` | `string` | Final reason: `stop`, `tool_calls`, `length`, `content_filter`, or `error`. Usually absent until the turn finishes. |
| `message.usage` | `object` | Final normalized token/server-tool counters. Detail counters are already included in input/output totals. |
| `message.isThinking` | `boolean` | `true` while the model is in the thinking phase, `false` during the answer phase. |
| `message.speed` | `string` | Generation speed (e.g. "12.4"). |
| `message.speedType` | `string` | Unit for speed, typically `"words/s"`. |
| `message.elapsedTime` | `string` | Elapsed time since generation started (e.g. "3s", "1m 5s"). |

> **Note:** Standard models may send `message` as a progress object or plain
> string. For LLM rendering, first verify that `message.segments` is an array.

Tool entries carry stable `id`, `call_id`, `name`, and `status`.
`function_call` uses a JSON `arguments` string; `custom_tool_call` uses
`input`. Execute only a `completed` call from a final turn whose
`finishreason` is `tool_calls`. Earlier snapshots may contain `in_progress`
or `incomplete` calls and must not trigger execution.

## Streaming Flow

1. **Run** the model with `prompt`, `session_id`, and `user_id`
2. **Connect** to WebSocket and send `task_info`
3. **Receive** `task_output` messages containing cumulative ordered `segments`
4. **Replace** your stored snapshot and render `answer` items; optionally show
   `thinking` items and collect tool calls
5. **Complete** — on `task_postprocess_end`, check `exitCode` on WebSocket or
   `pexit` in Task Detail, then inspect `finishreason`

## Polling Alternative

If you don't need real-time streaming, poll `POST /Task/Detail` instead. The final response is available in both `outputs` (structured) and `debugoutput` (merged plain text):

```json
{
  "result": true,
  "tasklist": [{
    "status": "task_postprocess_end",
    "pexit": "0",
    "debugoutput": "Quantum computing uses qubits that can exist in superposition...",
    "outputs": [{
      "contenttype": "raw",
      "content": {
        "prompt": "What is quantum computing?",
        "raw": "Quantum computing uses qubits that can exist in superposition...",
        "segments": [
          {
            "type": "answer",
            "text": "Quantum computing uses qubits that can exist in superposition..."
          }
        ],
        "finishreason": "stop",
        "usage": {
          "input_tokens": 18,
          "output_tokens": 11,
          "total_tokens": 29
        }
      }
    }]
  }]
}
```

> **Note:** When polling, read the ordered `outputs[].content.segments` array
> for structured output. `debugoutput` contains merged plain text. For real-time
> delivery, use WebSocket streaming instead.

## Completions Alternative

For a single HTTP connection instead of manual Run plus WebSocket setup:

- Use `POST /v1/Run/{owner}/{project}/sync?stream=true` on
  `https://api.wiro.ai/v1` for generic task-event SSE. See
  [Run a Model](/docs/run-a-model).
- Use the [Direct LLM Gateway](/docs/completions-api) on `https://llm.wiro.ai`
  for OpenAI Chat chunks ending in `[DONE]`, Responses named events, or
  Anthropic events ending in `message_stop`.
