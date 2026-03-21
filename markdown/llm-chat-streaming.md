# LLM & Chat Streaming

Stream LLM responses in real time with thinking/answer separation, session history, and multi-turn conversations.

## Overview

LLM (Large Language Model) requests on Wiro work differently from standard model runs:

- Responses are delivered via `debugoutput`, not the `outputs` file array
- Streaming `task_output` messages contain structured `thinking` and `answer` arrays — not plain strings
- Multi-turn conversations are supported via `session_id` and `user_id` parameters
- `pexit` is the primary success indicator (outputs will be empty)

Available LLM models include:
- [openai/gpt-5-2](https://wiro.ai/models/openai/gpt-5-2)
- [openai/gpt-oss-20b](https://wiro.ai/models/openai/gpt-oss-20b)
- [qwen/qwen3-5-27b](https://wiro.ai/models/qwen/qwen3-5-27b)

## Session & Chat History

Wiro maintains conversation history per session. By sending a `session_id` and `user_id` parameters:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `session_id` | string | No | UUID identifying the conversation session. Reuse for follow-up messages. |
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

> **Tip:** Generate a UUID for `session_id` when starting a new conversation. Pass the same UUID for all follow-up messages to maintain context.

## Thinking & Answer Phases

Many LLM models separate their output into two phases:

- **Thinking** — the model's internal reasoning process (chain-of-thought)
- **Answer** — the final response to the user

When streaming via WebSocket, `task_output` messages for LLM models contain a structured object:

```json
{
  "type": "task_output",
  "id": "534574",
  "tasktoken": "eDcCm5yy...",
  "message": {
    "thinking": ["Let me analyze this step by step...", "The key factors are..."],
    "answer": ["Quantum computing uses qubits that can exist in superposition..."]
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `message.thinking` | `string[]` | Array of reasoning/chain-of-thought chunks. May be empty. |
| `message.answer` | `string[]` | Array of response chunks. This is the content to show the user. |
| `message.raw` | `string` | Optional raw output before thinking/answer separation. |

> **Note:** Standard (non-LLM) models send `message` as a plain string. LLM models send it as a `{ thinking, answer }` object. Check the type before parsing.

## Streaming Flow

1. **Run** the model with `prompt`, `session_id`, and `user_id`
2. **Connect** to WebSocket and send `task_info`
3. **Receive** `task_output` messages — each contains the growing `thinking` and `answer` arrays
4. **Display** the latest `answer` array content to the user (optionally show `thinking` in a collapsible section)
5. **Complete** — on `task_postprocess_end`, check `pexit` for success

Each `task_output` event contains the **full accumulated** thinking and answer arrays — not just the new chunk. Simply replace your displayed content with the latest arrays.

## Polling Alternative

If you don't need real-time streaming, poll `POST /Task/Detail` instead. The final response will be in `debugoutput` as merged plain text:

```json
{
  "result": true,
  "tasklist": [{
    "status": "task_postprocess_end",
    "pexit": "0",
    "debugoutput": "Quantum computing uses qubits that can exist in superposition...",
    "outputs": []
  }]
}
```

> **Note:** When polling, `debugoutput` contains the merged text. To access separate `thinking` and `answer` arrays, use WebSocket streaming instead.
