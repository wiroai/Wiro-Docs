# Studio

Ask Wiro's creative agent for images, video, audio and more through the API, then collect every result it made.

## Overview

Studio is Wiro's creative agent. You describe what you want, such as a product shot, a short video, a voice-over or a set of ad banners, and Studio picks suitable models from the Wiro catalog, runs them and replies with the results. It is the same Studio you use on [wiro.ai](https://wiro.ai).

The Studio API uses the message protocol of [Agent Messaging](/docs/agent-messaging) on its own routes under `/Studio/`:

1. **Send** a message with [Message/Send](#post-studiomessagesend) and get its `messageguid` and `agenttoken` back at once.
2. **Follow** the turn on the [Agent WebSocket](/docs/agent-websocket) with the `agenttoken`, or poll [Message/Detail](#post-studiomessagedetail) until the turn ends.
3. **Collect** the files. The reply lists them, and [Studio/Tasks](#post-studiotasks) returns every model run Studio started for you, with its outputs and cost.

There is no agent guid to pass: every route talks to Studio. Studio is paid from your Wiro wallet, as described under [Costs](#costs).

### Authentication

Every `/Studio/*` route takes a project API key: `x-api-key`, plus `x-nonce` and `x-signature` for a project that uses signature authentication (see [Authentication](/docs/authentication)). A key acts as the person who created its project, in that project's workspace: a personal project works in the personal workspace and pays from the personal wallet, a team project works in the team and pays from the team wallet. For a team project, that person must still be a member of the team; otherwise every route answers HTTP 403 with `You must be a member of this team to perform this action`.

### Sessions

A session is one conversation with its own memory. `sessionkey` names it, and `"default"` is used when you leave it out.

- Studio conversations belong to the person who created the key's project. `"default"` is their main Studio chat on wiro.ai, and sessions started with a key appear in their Studio on wiro.ai, in the same workspace. Everyone who uses the same key shares these sessions.
- Use a new session name for each piece of work, such as `"bakery-banners"`, and keep using it for follow-ups such as "make it brighter": Studio remembers the conversation. Use letters, digits, dots, dashes, underscores and colons, up to 128 characters. Names that contain `:cron:` are reserved.
- The turns of one session run one at a time, in order: a second message waits in `agent_queue` until the turn before it ends. Different sessions run in parallel.

## Costs

- **$10 to start a turn.** [Message/Send](#post-studiomessagesend) and [Message/SendForm](#post-studiomessagesendform) need at least $10 spendable in the wallet of the key's workspace. Below that, the message is refused with code `97` (`Insufficient balance`), and the response carries `walletUsd`, the balance, and `minTopup`, the minimum. Nothing is charged for a refused message. Reading messages, sessions and results is free.
- **What a turn costs.** A turn's cost depends on the models Studio runs for it, and can be more than $10.
- **Chat.** Each turn is charged for the tokens it used, at the chat model's rates in [Studio/Status](#post-studiostatus) (credits per 1M tokens; 1 credit is $0.01). The reply shows the chat charge in `tokencost`, in credits: `tokencost / 100` is the amount in USD.
- **Model runs.** Each model run Studio starts is charged at that model's price when it succeeds. Failed and cancelled runs are not charged. [Studio/Tasks](#post-studiotasks) shows each run's `totalcost`.
- Charges are made within about a minute of the work finishing. [Studio/Transactions](#post-studiotransactions) lists them, and they also appear in the wallet's transactions.

## **POST** /Studio/Status

Returns the wallet check and the chat models Studio can use. It settles your pending Studio charges first, so `walletUsd` is current. It takes no request fields.

| Field | Type | Description |
|-------|------|-------------|
| `walletUsd` | number | Spendable balance of the workspace wallet in USD. |
| `needsTopup` | boolean | `true` when `walletUsd` is below `minTopup`. |
| `minTopup` | number | The balance a turn needs to start: `10`. |
| `tokenRates` | object | Chat model rates. `default_model` is the default chat model, and `models` is keyed by model slug: each entry has `input_per_1m` and `output_per_1m` (credits per 1M tokens), optional cached-input, cache-write and long-context rates, a `label`, and `selectable: true` when you can pick it with `model`. |
| `agentModel.chatModel` | string | The chat model a turn uses when you leave `model` out. |
| `title` | string | The agent's name. |
| `status` | number | Always `4`. |

The response also carries fields that Wiro's own apps use. Ignore the ones not listed here.

### Response

```json
{
  "result": true,
  "errors": [],
  "title": "Generative Media Agent",
  "status": 4,
  "walletUsd": 42.5,
  "needsTopup": false,
  "minTopup": 10,
  "tokenRates": {
    "default_model": "openai/gpt-5.6-sol",
    "models": {
      "openai/gpt-5.6-sol": {
        "input_per_1m": 625,
        "output_per_1m": 3750,
        "cached_input_per_1m": 62.5,
        "selectable": true,
        "label": "GPT-5.6 Sol"
      },
      "openai/gpt-5.4-mini": {
        "input_per_1m": 93.75,
        "output_per_1m": 562.5,
        "cached_input_per_1m": 9.375,
        "selectable": true,
        "label": "GPT-5.4 Mini"
      }
    }
  },
  "agentModel": {
    "chatModel": "openai/gpt-5.6-sol"
  }
}
```

## **POST** /Studio/Message/Send

Sends a message to Studio. It returns at once with the turn's `messageguid` and `agenttoken`; the reply arrives on the WebSocket and in [Message/Detail](#post-studiomessagedetail).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `message` | string | Yes | Your request, as you would type it in Studio. Say what the result is for, the look (subject, style, format or aspect ratio, length for video and audio) and how many results you want. Quote any exact text that must appear in an image or be spoken. |
| `sessionkey` | string | No | The session to send to. Defaults to `"default"`, the main Studio chat. |
| `model` | string | No | The chat model for this turn: a slug whose `selectable` is `true` in [Studio/Status](#post-studiostatus). Leave it out to use Studio's default. Use the same `model` on every turn of a session; when it differs from the previous turn, the response includes `modelChangeMarker`, as in [Agent Messaging](/docs/agent-messaging). |

To attach files, use [Message/SendForm](#post-studiomessagesendform).

### Response

```json
{
  "result": true,
  "errors": [],
  "messageguid": "c3d4e5f6-a7b8-9012-cdef-345678901234",
  "agenttoken": "aB3xK9mR2pLqWzVn7tYhCd5sFgJkNb",
  "status": "agent_queue"
}
```

A wallet below the minimum gets:

```json
{
  "result": false,
  "errors": [{ "code": 97, "message": "Insufficient balance", "time": 1761902400 }],
  "walletUsd": 6.4,
  "minTopup": 10
}
```

If a request times out, check [Message/History](#post-studiomessagehistory) before you send it again: each accepted message starts a paid turn.

## **POST** /Studio/Message/SendForm

The same as [Message/Send](#post-studiomessagesend), as `multipart/form-data`, so you can attach files such as a product photo or a logo.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `message` | string | Conditional | Your request. Required unless at least one file is attached. |
| `sessionkey` | string | No | The session to send to. Defaults to `"default"`. |
| `model` | string | No | As in Send. |
| `attachments` | file | No | The files. Repeat the `attachments` field once per file; a single file can also be sent as `attachment`. |

- Up to 8 files per message, each up to about 100 MB. A larger file is refused with HTTP 413.
- Accepted: images (jpg, jpeg, png, gif, webp, heic, svg), video (mp4, webm, mov), audio (mp3, wav, m4a, webm) and documents (pdf, txt, md, csv, doc, docx, xls, xlsx, ppt, pptx, epub). The file name needs its extension. Other files are refused with `Uploaded file format invalid. Supported: ...`.
- The message's `attachments` then lists each file with `ordinal`, `mentionLabel`, `url`, `name`, `type` and `size`.

The response is the same as Send's.

## **POST** /Studio/Message/Detail

Returns one message and its reply. Poll it until `status` is `agent_end`, `agent_error` or `agent_cancel`, or follow the turn on the [Agent WebSocket](/docs/agent-websocket).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `messageguid` | string | Conditional | The message id from Send. Required unless `agenttoken` is given. |
| `agenttoken` | string | Conditional | The turn token from Send. |
| `sessionkey` | string | No | The message's session. Defaults to `"default"`. A message from another session is `Message not found`. |

### Reply fields

| Field | Description |
|-------|-------------|
| `status` | `agent_queue`, `agent_start`, `agent_output`, then `agent_end`; or `agent_error` or `agent_cancel`. |
| `content` | Your message. |
| `response` | The final reply, set when the turn ends. Each file Studio made is on its own line as a public URL. After `agent_error` it reads `Agent is temporarily unavailable. Please try again shortly.`, and after `agent_cancel` `Request cancelled.` |
| `debugoutput` | The reply text so far while the turn runs, the final text after. |
| `timeline` | The ordered reasoning, answer and tool blocks of the turn, as described in [Agent Messaging](/docs/agent-messaging). Tool labels are display names: show them, but do not parse them. |
| `attachments` | The files you attached. |
| `model` | The chat model that ran the turn. |
| `inputtokens`, `outputtokens`, `cachereadtokens`, `cachewritetokens`, `totaltokens` | The turn's token use. |
| `tokencost` | The chat charge in credits; `tokencost / 100` is the amount in USD. Model runs are charged separately (see [Studio/Tasks](#post-studiotasks)). |
| `createdat`, `startedat`, `endedat` | Unix seconds. |

### Response

```json
{
  "result": true,
  "errors": [],
  "data": {
    "guid": "c3d4e5f6-a7b8-9012-cdef-345678901234",
    "agenttoken": "aB3xK9mR2pLqWzVn7tYhCd5sFgJkNb",
    "content": "Two square banner images for my bakery's weekend sale, warm colors",
    "response": "Here are your two banners.\nhttps://cdn1.wiro.ai/7f3a9c2e/banner-1.png\nhttps://cdn1.wiro.ai/7f3a9c2e/banner-2.png",
    "debugoutput": "Here are your two banners.\nhttps://cdn1.wiro.ai/7f3a9c2e/banner-1.png\nhttps://cdn1.wiro.ai/7f3a9c2e/banner-2.png",
    "status": "agent_end",
    "metadata": {},
    "createdat": "1761902400",
    "startedat": "1761902401",
    "endedat": "1761902466",
    "attachments": [],
    "timeline": [],
    "model": "openai/gpt-5.6-sol",
    "inputtokens": 6400,
    "outputtokens": 610,
    "cachereadtokens": 0,
    "cachewritetokens": 0,
    "totaltokens": 7010,
    "tokencost": 7
  }
}
```

In this example the chat part cost 7 credits ($0.07). The two images are charged separately, as the model runs Studio started.

## **POST** /Studio/Message/History

Returns the messages of one session, newest first.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sessionkey` | string | No | The session. Defaults to `"default"`. |
| `limit` | number | No | Messages per page. Default `50`, maximum `200`. |
| `before` | string | No | A message `guid`: returns the messages older than it, for the next page. |

The response is `{ "result": true, "errors": [], "data": { "messages": [...], "count": 2, "hasmore": false } }`. Each message has the reply fields of [Message/Detail](#post-studiomessagedetail) except `startedat` and `endedat`.

When a turn hands work to the background, its reply says so and ends early. The result arrives later as a new message in the same session, already finished: `status` is `agent_end`, `content` is empty and the text is in `response`. Read it with History, and find the files in [Studio/Tasks](#post-studiotasks).

## **POST** /Studio/Message/Sessions

Lists your Studio sessions in the key's workspace, most recent first, including those started on wiro.ai. It takes no request fields.

```json
{
  "result": true,
  "errors": [],
  "data": {
    "sessions": [
      {
        "sessionkey": "bakery-banners",
        "messagecount": 3,
        "updatedat": 1761902466,
        "lastmessage": "Make the second one brighter",
        "name": "Bakery banners"
      },
      {
        "sessionkey": "default",
        "messagecount": 0,
        "updatedat": null,
        "lastmessage": ""
      }
    ]
  }
}
```

`messagecount` counts turns, `lastmessage` is the last message (up to 500 characters), and `name` is the display name set with [Message/RenameSession](#post-studiomessagerenamesession). `"default"` is always listed.

## **POST** /Studio/Message/Cancel

Stops a turn that is queued or running.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `messageguid` | string | Conditional | The message id. Required unless `agenttoken` is given. |
| `agenttoken` | string | Conditional | The turn token. |
| `sessionkey` | string | No | The message's session. Defaults to `"default"`. |

Only a message in `agent_queue`, `agent_start` or `agent_output` can be cancelled; any other is refused with `Message cannot be cancelled (status: <status>)`. Cancelling stops the reply, and the message moves to `agent_cancel`. Tokens already used are charged, and model runs that already started are billed when they succeed.

## **POST** /Studio/Message/ClearSession

Deletes your messages in a session and starts Studio's memory of it fresh. The session keeps its display name.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sessionkey` | string | No | The session. Defaults to `"default"`, the main Studio chat. |

Pending charges are settled first. Deleted messages cannot be restored, and they disappear from Studio on wiro.ai too. Files Studio made are not deleted.

## **POST** /Studio/Message/DeleteSession

Deletes a session's messages and its display name.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sessionkey` | string | No | The session. Defaults to `"default"`. |

To start a session over with a fresh memory, use [Message/ClearSession](#post-studiomessageclearsession).

## **POST** /Studio/Message/RenameSession

Sets a session's display name, the name shown in the session list on wiro.ai.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes | The display name, up to 40 characters. |
| `sessionkey` | string | No | The session. Defaults to `"default"`. |

## **POST** /Studio/Tasks

Lists the model runs Studio started for you in the key's workspace, newest first, across all your Studio sessions, including those on wiro.ai.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `limit` | number | No | How many recent runs to return. Default `30`, maximum `100`. |

| Field | Description |
|-------|-------------|
| `id` | The run's id. |
| `status` | The task status, such as `task_queue`, `task_start`, `task_postprocess_end` or `task_cancel` (see [Tasks](/docs/tasks)). |
| `success` | `true` for a run that finished successfully, `false` for a failed or cancelled run, `null` while it runs. |
| `terminal` | `true` once the run has finished. |
| `model` | `{ title, slugowner, slugproject }`. |
| `categories` | The model's categories. `llm` marks a text run. |
| `parameters` | The inputs the run used, such as its prompt. |
| `outputs` | The result files, each with `name`, `contenttype`, `size` and `url`. An LLM run returns its text as `{ "contenttype": "raw", "content": { "answer": [...] } }`. |
| `totalcost` | The run's price in USD, charged when it succeeds. |
| `socketaccesstoken` | While the run is active, a token for the task [WebSocket](/docs/websocket); empty once it finished. |
| `createtime`, `starttime`, `endtime` | Unix seconds. |
| `elapsedseconds` | How long the run took. |

### Response

```json
{
  "result": true,
  "errors": [],
  "tasks": [
    {
      "id": "48211907",
      "status": "task_postprocess_end",
      "success": true,
      "terminal": true,
      "model": {
        "title": "Nano Banana Pro API: Create Mobile & Web Apps with Nano Banana",
        "slugowner": "google",
        "slugproject": "nano-banana-pro"
      },
      "categories": ["text-to-image", "image-to-image", "image-editing"],
      "parameters": { "prompt": "Square banner for a bakery weekend sale, warm colors", "resolution": "2K" },
      "outputs": [
        {
          "name": "banner-1.png",
          "contenttype": "image/png",
          "size": "1843212",
          "url": "https://cdn1.wiro.ai/7f3a9c2e/banner-1.png"
        }
      ],
      "totalcost": 0.14,
      "socketaccesstoken": "",
      "createtime": "1761902420",
      "starttime": "1761902421",
      "endtime": "1761902452",
      "elapsedseconds": 31
    }
  ]
}
```

Delete a finished run's files with [Studio/Task/DeleteOutput](#post-studiotaskdeleteoutput).

## **POST** /Studio/Transactions

Lists the wallet charges for your Studio use in the key's workspace, newest first.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `limit` | number | No | Default `50`, maximum `200`. |

Each row has `guid`, `type`, `amount`, `description`, `modelid`, `taskid`, `confirmed` and `time`. A chat charge is described as `Generative Media Agent LLM <model> (...)` with its token counts, and a model run as `Generative Media Agent media run`.

## **POST** /Studio/Task/DeleteOutput

Deletes the output and input files of one of your Studio runs once it has finished or was cancelled.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | The run's `id` from [Studio/Tasks](#post-studiotasks). |

A run that is not yours answers `There is no task yet.`, and a run that has not finished answers `Task must be completed or cancelled before deleting files`.

## Errors

Business errors come back with HTTP 200, `result: false` and an `errors` array, as everywhere in the Wiro API. These are the ones specific to Studio:

| Message | Code | When |
|---------|------|------|
| `Insufficient balance` | 97 | Send or SendForm with less than $10 spendable. The response adds `walletUsd` and `minTopup`. |
| `Request parameter [message] required` | 0 | Send without a message, or SendForm with neither a message nor a file. |
| `Invalid model: <model> is not in the selectable model allowlist.` | 0 | `model` is not a selectable slug in Studio/Status. |
| `Reserved sessionkey` | 0 | The session name contains `:cron:`. |
| `Too many files (max 8)` | 0 | SendForm with more than 8 files. |
| `Uploaded file format invalid. Supported: ...` | 0 | An attachment type that is not accepted. |
| `Message not found` | 0 | Detail or Cancel with an unknown message, or one from another session. |
| `Message cannot be cancelled (status: <status>)` | 0 | Cancel on a turn that has already ended. |
| `Agent is temporarily unavailable. Please try again shortly.` | 0 | Try again shortly. |
| `You must be a member of this team to perform this action` | HTTP 403 | A team project's key whose creator is no longer a member of the team. |

Authentication errors are listed in the [Error Reference](/docs/error-reference).
