# Studio

Ask Wiro's creative agent for images, video, audio and more through the API, then collect every result it made.

## Overview

Studio is Wiro's creative agent. You describe what you want, such as a product shot, a short video, a voice-over or a set of ad banners, and Studio picks suitable models from the Wiro catalog, runs them and replies with the results. It is the same Studio you use on [wiro.ai](https://wiro.ai).

The Studio API uses the message protocol of [Agent Messaging](/docs/agent-messaging) on its own routes under `/Studio/`:

1. **Send** a message with [Message/Send](#post-studiomessagesend) and get its `messageguid` and `agenttoken` back at once.
2. **Follow** the turn on the [Agent WebSocket](/docs/agent-websocket) with the `agenttoken`, or poll [Message/Detail](#post-studiomessagedetail) until the turn ends.
3. **Collect** the files. The reply lists them, and [Studio/Tasks](#post-studiotasks) returns every model run Studio started for you, with its outputs and cost.

There is no agent guid to pass: every route talks to Studio. Studio is paid from your Wiro wallet, as described under [Costs](#costs).

Studio runs on one setup shared by everyone who uses it, so it never changes that setup: it proposes no [setup cards](/docs/agent-messaging#setup-from-chat), and its connectors, skills and scheduled tasks are fixed. Asked to remember a rule or to repeat a job on a schedule, it helps with the request once, as a one-time task. It has no connector permissions and never shows an approval card: its model runs follow your spend limits and Model Access.

### Authentication

Every `/Studio/*` route takes a project API key: `x-api-key`, plus `x-nonce` and `x-signature` for a project that uses signature authentication (see [Authentication](/docs/authentication)). A key acts as the person who created its project, in that project's workspace: a personal project works in the personal workspace and pays from the personal wallet, a team project works in the team and pays from the team wallet. For a team project, that person must still be a member of the team; otherwise every route answers HTTP 403 with `You must be a member of this team to perform this action`. The one exception is [ProjectSet](#post-studioprojectset), which works only signed in.

### Sessions

A session is one conversation with its own memory. `sessionkey` names it, and `"default"` is used when you leave it out.

- Studio conversations belong to the person who created the key's project. `"default"` is their main Studio chat on wiro.ai, and sessions started with a key appear in their Studio on wiro.ai, in the same workspace. Everyone who uses the same key shares these sessions.
- Use a new session name for each piece of work, such as `"bakery-banners"`, and keep using it for follow-ups such as "make it brighter": Studio remembers the conversation.
- A name uses letters, digits, `.`, `_`, `:` and `-`, up to 128 characters, and can't end in `-r` followed by a number, such as `-r2`. Names that contain `:cron:` are reserved.
- Capitals are fine and are kept, but a new name that differs only in capitals from one of your sessions is refused: use its exact name, or another name.
- [Message/Send](#post-studiomessagesend) and [Message/SendForm](#post-studiomessagesendform) check the name first, so a refused message runs nothing and costs nothing. Reading, renaming and deleting a session work with whatever name it already has.
- The turns of one session run one at a time, in order: a second message waits in `agent_queue` until the turn before it ends. Different sessions run in parallel.

## Costs

- **$10 to start a turn.** [Message/Send](#post-studiomessagesend) and [Message/SendForm](#post-studiomessagesendform) need at least $10 spendable in the wallet of the key's workspace. Below that, the message is refused with code `97` (`Insufficient balance`), and the response carries `walletUsd`, the balance, and `minTopup`, the minimum. Nothing is charged for a refused message. Reading messages, sessions and results is free.
- **What a turn costs.** A turn's cost depends on the models Studio runs for it, and can be more than $10.
- **Project.** Studio works on a project of the workspace. A call with an API key runs on that key's project. Work sent from wiro.ai runs on the workspace's Studio project: one for a personal workspace and one for each team, shared by Studio and the [Workflow Agent](/docs/workflow-agent). The first Studio or Workflow Agent message sent from wiro.ai in a workspace that has none creates a project named "Studio" there, or uses the workspace's existing project of that name. It is a normal project: like any project you create, it gets an API key, and you get the email that comes with a new key. [Studio/Status](#post-studiostatus) shows it, and [Studio/ProjectSet](#post-studioprojectset) changes it.
- **Chat.** Each turn is charged for the tokens it used, at the chat model's rates in [Studio/Status](#post-studiostatus) (cents per 1M tokens), on the turn's project and the `studio` surface. The reply shows the chat charge in `tokencost`, in cents: `tokencost / 100` is the amount in USD.
- **Model runs.** The models Studio runs for you are your own tasks, on the turn's project: [Task/List](/docs/tasks#task-list) and [Task/Detail](/docs/tasks#task-detail) return them with `surface` `studio`, and [Studio/Tasks](#post-studiotasks) lists them too. Each is charged like any model run when it finishes: at the model's price when it succeeds, and not at all when it fails or is cancelled. Studio/Tasks shows each run's `totalcost`. The runs Studio made before its runs became your own tasks are not your tasks: Studio/Tasks still lists them, but Task/List does not show them and Task/Detail does not find them.
- **Spend limits and Model Access.** The models Studio runs for you follow your workspace's [spend limits](/docs/spend-limits) and [Model Access](/docs/model-access) rules, the same as the runs you start yourself: the account's or the team's, your own in a team, those of the turn's project (the API key you sent the message with, or the Studio project for a message sent from wiro.ai), and those of the `studio` [surface](/docs/tasks#task-surfaces). So does the chat: what it costs counts toward spend limits, and a message whose chat model a Model Access rule blocks is refused with code `92` before anything runs.
- **Concurrency limit.** The models Studio runs for you count toward your workspace's [concurrency limit](/docs/concurrency-limits), like the runs you start yourself: while its balance is $250 or less, one unfinished task for each full $10 of balance, never less than 1, so one at a time below $20. Studio can't start a model while your unfinished tasks fill that limit, and while Studio's runs are unfinished, your own runs over it are refused with code `96`.
- Chat charges are made within about a minute of the turn ending, and model runs are charged when they finish, like any model run. Both appear in the wallet's transactions, and [Studio/Transactions](#post-studiotransactions) lists the chat charges.

## **POST** /Studio/Status

Returns the wallet check, the chat models Studio can use and the project Studio works on. It settles your pending Studio charges first, so `walletUsd` is current. It takes no request fields.

| Field | Type | Description |
|-------|------|-------------|
| `walletUsd` | number | Spendable balance of the workspace wallet in USD. |
| `needsTopup` | boolean | `true` when `walletUsd` is below `minTopup`. |
| `minTopup` | number | The balance a turn needs to start: `10`. |
| `tokenRates` | object | Chat model rates. `default_model` is the default chat model, and `models` is keyed by model slug: each entry has `input_per_1m` and `output_per_1m` (cents per 1M tokens), optional cached-input, cache-write and long-context rates, a `label`, and `selectable: true` when you can pick it with `model`. A model you could pick that your [Model Access](/docs/model-access) rules block reads `selectable: false` and `blocked: true`. |
| `agentModel.chatModel` | string | The chat model a turn uses when you leave `model` out. |
| `blockedModels` | string[] | The chat models you could pick that your Model Access rules block. `[]` when none is blocked. |
| `agentModelBlocked` | boolean | `true` when your rules block `agentModel.chatModel`: a message that leaves `model` out is then refused with code `92`. |
| `agentModelMessage` | string \| null | The refusal such a message gets when `agentModelBlocked` is `true`, else `null`. |
| `project.current` | object \| null | The project Studio works on, `{ "id", "name" }` with `id` as a string (see [Costs](#costs)). With an API key, the key's own project. Signed in, the workspace's Studio project, or `null` until the workspace has one: the first Studio or Workflow Agent message from wiro.ai creates it. |
| `project.options` | object[] | The projects you can make the Studio project with [ProjectSet](#post-studioprojectset), each `{ "id", "name" }`, newest first, at most 100. Signed in to a personal workspace, your personal projects; in a team, every team project for a team admin or the organization owner, and none for other members. Always `[]` with an API key. ProjectSet also takes any other project of the workspace by its `id`. |
| `project.canchange` | boolean | `true` when you can change the Studio project. `false` for team members who are not admins, and with an API key. |
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
  },
  "blockedModels": [],
  "agentModelBlocked": false,
  "agentModelMessage": null,
  "project": {
    "current": { "id": "48211", "name": "Production" },
    "options": [],
    "canchange": false
  }
}
```

This call was made with the API key of the Production project, so `project.current` is that project, `project.options` is empty and `project.canchange` is `false`: the key's turns always run on its own project.

When a rule blocks a chat model, Status says so. With a team rule that blocks `openai/gpt-5-6-sol`, Studio's default chat model, these fields read:

```json
{
  "tokenRates": {
    "default_model": "openai/gpt-5.6-sol",
    "models": {
      "openai/gpt-5.6-sol": {
        "input_per_1m": 625,
        "output_per_1m": 3750,
        "cached_input_per_1m": 62.5,
        "selectable": false,
        "label": "GPT-5.6 Sol",
        "blocked": true
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
  },
  "blockedModels": ["openai/gpt-5.6-sol"],
  "agentModelBlocked": true,
  "agentModelMessage": "This team can't use openai/gpt-5-6-sol. Model Access rules decide which models can run."
}
```

A message that leaves `model` out is then refused with `agentModelMessage`. Send a model that is still selectable, such as `openai/gpt-5.4-mini`.

## **POST** /Studio/ProjectSet

Changes the workspace's Studio project: the project that Studio and the [Workflow Agent](/docs/workflow-agent) work on for messages sent from wiro.ai. It works only signed in, in the dashboard or with a signed-in user's Bearer token, and changes your personal workspace's Studio project, or the team's when `x-team-guid` names a team. In a personal workspace you can pick any of your personal projects; in a team, a team admin or the organization owner can pick any team project. `project.options` in [Studio/Status](#post-studiostatus) lists the newest 100 of them. A call with an API key always runs on the key's project, so ProjectSet refuses it.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `projectid` | string | Yes | The project's `id`, such as one from `project.options` in Studio/Status. |

### Response

```json
{
  "result": true,
  "errors": [],
  "project": { "id": "7001", "name": "Mobile App" }
}
```

Studio/Status then shows the new project. For a team admin, signed in, it reads:

```json
{
  "project": {
    "current": { "id": "7001", "name": "Mobile App" },
    "options": [
      { "id": "7001", "name": "Mobile App" },
      { "id": "6839", "name": "Studio" }
    ],
    "canchange": true
  }
}
```

A refusal comes back with `result: false` and code `0`:

| Message | When |
|---------|------|
| `Studio runs on your API key's project. Change the Studio project on wiro.ai.` | The call was made with an API key. |
| `Only a team admin can change the team's Studio project.` | In a team, the caller is a member who is not a team admin. |
| `Project not found in this workspace.` | `projectid` is not a project of this workspace. |

## **POST** /Studio/Message/Send

Sends a message to Studio. It returns at once with the turn's `messageguid` and `agenttoken`; the reply arrives on the WebSocket and in [Message/Detail](#post-studiomessagedetail).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `message` | string | Yes | Your request, as you would type it in Studio. Say what the result is for, the look (subject, style, format or aspect ratio, length for video and audio) and how many results you want. Quote any exact text that must appear in an image or be spoken. |
| `sessionkey` | string | No | The session to send to. Defaults to `"default"`, the main Studio chat. |
| `model` | string | No | The chat model for this turn: a slug whose `selectable` is `true` in [Studio/Status](#post-studiostatus). Leave it out to use Studio's default chat model, `agentModel.chatModel`. A chat model your [Model Access](/docs/model-access) rules block is refused with code `92`, the default included. Use the same `model` on every turn of a session; when it differs from the previous turn, the response includes `modelChangeMarker`, as in [Agent Messaging](/docs/agent-messaging). |

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

A message whose chat model a Model Access rule blocks gets code `92`, and nothing is sent or charged:

```json
{
  "result": false,
  "errors": [{ "code": 92, "message": "This team can't use openai/gpt-5-6-terra. Model Access rules decide which models can run.", "time": 1761902400 }]
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
| `response` | The final reply, set when the turn ends. Each file Studio made is on its own line as a public URL. After `agent_error` or `agent_cancel` it holds a coded failure message, such as `[AGENT_UNAVAILABLE] Agent is temporarily unavailable. Please try again shortly.` (see [Failed turns](/docs/agent-messaging#failed-turns)). |
| `debugoutput` | The reply text so far while the turn runs, the final text after. |
| `timeline` | The ordered reasoning, answer and tool blocks of the turn, as described in [Agent Messaging](/docs/agent-messaging). Tool labels are display names: show them, but do not parse them. |
| `attachments` | The files you attached. |
| `model` | The chat model that ran the turn. |
| `inputtokens`, `outputtokens`, `cachereadtokens`, `cachewritetokens`, `totaltokens` | The turn's token use. |
| `tokencost` | The chat charge in cents; `tokencost / 100` is the amount in USD. Model runs are charged separately (see [Studio/Tasks](#post-studiotasks)). |
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

In this example the chat part cost 7 cents ($0.07). The two images are charged separately, as the model runs Studio started.

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
| `outputs` | The result files, each with `id`, `name`, `contenttype`, `size` and `url`. `id` is the file's id, the same value [Task/Detail](/docs/tasks#task-detail) returns for it. An LLM run returns its text as `{ "contenttype": "raw", "content": { "answer": [...] } }`, with no `id`. |
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
          "id": "5f2c8a1e9b7d4c3a6e0f1b2d8c9a7e4f",
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

Each row has `guid`, `type`, `amount`, `description`, `modelid`, `taskid`, `confirmed` and `time`. A chat charge is described as `Generative Media Agent LLM <model> (...)` with its token counts. A model run from before Studio's runs became your own tasks is described as `Generative Media Agent media run`; the model runs since then are charged on their own tasks, like any model run (see [Costs](#costs)).

## **POST** /Studio/Task/DeleteOutput

Deletes the output and input files of one of your Studio runs once it has finished or was cancelled.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | The run's `id` from [Studio/Tasks](#post-studiotasks). |

A run that is not yours answers `There is no task yet.`, and a run that has not finished answers `Task must be completed or cancelled before deleting files`. If the run's result was posted in a Studio chat as a message of its own, that message stops showing the deleted files (see [Model run results](/docs/agent-messaging#model-run-results)).

## Errors

Business errors come back with HTTP 200, `result: false` and an `errors` array, as everywhere in the Wiro API. These are the ones specific to Studio:

| Message | Code | When |
|---------|------|------|
| `Insufficient balance` | 97 | Send or SendForm with less than $10 spendable. The response adds `walletUsd` and `minTopup`. |
| A spend limit refusal, such as `Your monthly spend limit is reached ($100.40 of $100.00). It resets on December 1, 2026 at 00:00 UTC.` | 93 | Send or SendForm while a [spend limit](/docs/spend-limits) that covers the message is used up. Nothing is charged. |
| A Model Access refusal, such as `This team can't use openai/gpt-5-6-terra. Model Access rules decide which models can run.` | 92 | Send or SendForm when a [Model Access](/docs/model-access) rule that covers the message blocks its chat model: the `model` it names, or the default chat model when it names none. It is checked before the balance and the spend limits. Nothing is sent or charged. |
| `Request parameter [message] required` | 0 | Send without a message, or SendForm with neither a message nor a file. |
| `Invalid model: <model> is not in the selectable model allowlist.` | 0 | `model` is not one of the chat models Studio offers. A model your Model Access rules block gets code `92` instead. |
| `A Studio session name may contain only letters, digits, ".", "_", ":" and "-", at most 128 characters, and cannot end in "-r" followed by a number. Nothing was sent or charged.` | 0 | Send or SendForm with a session name outside that rule. |
| `You already have a Studio session with this name in different capitals. Use its exact name, or another name. Nothing was sent or charged.` | 0 | Send or SendForm with a new session name that differs only in capitals from one of your sessions. |
| `Reserved sessionkey` | 0 | The session name contains `:cron:`. |
| `Too many files (max 8)` | 0 | SendForm with more than 8 files. |
| `Uploaded file format invalid. Supported: ...` | 0 | An attachment type that is not accepted. |
| `Message not found` | 0 | Detail or Cancel with an unknown message, or one from another session. |
| `Message cannot be cancelled (status: <status>)` | 0 | Cancel on a turn that has already ended. |
| `Studio runs on your API key's project. Change the Studio project on wiro.ai.` | 0 | ProjectSet with an API key. |
| `Only a team admin can change the team's Studio project.` | 0 | ProjectSet in a team by a member who is not a team admin. |
| `Project not found in this workspace.` | 0 | ProjectSet with a `projectid` that is not a project of this workspace. |
| `Agent is temporarily unavailable. Please try again shortly.` | 0 | Try again shortly. |
| `You must be a member of this team to perform this action` | HTTP 403 | A team project's key whose creator is no longer a member of the team. |

Authentication errors are listed in the [Error Reference](/docs/error-reference).

## Code Examples

### curl (Send)

```bash
curl -X POST "https://api.wiro.ai/v1/Studio/Message/Send" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "message": "Two square banner images for a bakery weekend sale, warm colors",
    "sessionkey": "bakery-banners"
  }'
```

### curl (Detail)

```bash
curl -X POST "https://api.wiro.ai/v1/Studio/Message/Detail" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "messageguid": "c3d4e5f6-a7b8-9012-cdef-345678901234",
    "sessionkey": "bakery-banners"
  }'
```

### curl (Tasks)

```bash
curl -X POST "https://api.wiro.ai/v1/Studio/Tasks" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "limit": 20 }'
```

### curl (SendForm)

```bash
curl -X POST "https://api.wiro.ai/v1/Studio/Message/SendForm" \
  -H "x-api-key: YOUR_API_KEY" \
  -F "message=Put this mug on a wooden table in morning light" \
  -F "sessionkey=mug-shots" \
  -F "attachments=@/path/to/mug.jpg"
```

### Python

```python
import time
import requests

BASE = "https://api.wiro.ai/v1"
headers = {"x-api-key": "YOUR_API_KEY", "Content-Type": "application/json"}
session = "bakery-banners"

# 1. Send the brief
sent = requests.post(f"{BASE}/Studio/Message/Send", headers=headers, json={
    "message": "Two square banner images for a bakery weekend sale, warm colors",
    "sessionkey": session,
}).json()
if not sent["result"]:
    raise SystemExit(sent["errors"])

# 2. Poll until the turn ends
while True:
    detail = requests.post(f"{BASE}/Studio/Message/Detail", headers=headers, json={
        "messageguid": sent["messageguid"],
        "sessionkey": session,
    }).json()["data"]
    if detail["status"] in ("agent_end", "agent_error", "agent_cancel"):
        break
    time.sleep(3)

print(detail["response"])
print("Chat charge (USD):", (detail.get("tokencost") or 0) / 100)

# 3. The model runs Studio started, with their files and cost
tasks = requests.post(f"{BASE}/Studio/Tasks", headers=headers, json={"limit": 10}).json()
for task in tasks["tasks"]:
    files = [o.get("url") for o in task["outputs"] if o.get("url")]
    print(task["model"]["slugproject"], task["status"], task["totalcost"], files)
```

### Node.js

```javascript
const axios = require('axios');

const BASE = 'https://api.wiro.ai/v1';
const headers = { 'x-api-key': 'YOUR_API_KEY', 'Content-Type': 'application/json' };
const session = 'bakery-banners';

const { data: sent } = await axios.post(`${BASE}/Studio/Message/Send`, {
  message: "Two square banner images for a bakery weekend sale, warm colors",
  sessionkey: session
}, { headers });
if (!sent.result) throw new Error(JSON.stringify(sent.errors));

let detail;
do {
  await new Promise((resolve) => setTimeout(resolve, 3000));
  const { data } = await axios.post(`${BASE}/Studio/Message/Detail`, {
    messageguid: sent.messageguid,
    sessionkey: session
  }, { headers });
  detail = data.data;
} while (!['agent_end', 'agent_error', 'agent_cancel'].includes(detail.status));

console.log(detail.response);
console.log('Chat charge (USD):', (detail.tokencost || 0) / 100);

const { data: runs } = await axios.post(`${BASE}/Studio/Tasks`, { limit: 10 }, { headers });
for (const task of runs.tasks) {
  console.log(task.model.slugproject, task.status, task.totalcost, task.outputs.map((o) => o.url));
}
```

### PHP

```php
<?php
function wiro($path, $body) {
    $ch = curl_init("https://api.wiro.ai/v1" . $path);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        "Content-Type: application/json",
        "x-api-key: YOUR_API_KEY"
    ]);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    $response = json_decode(curl_exec($ch), true);
    curl_close($ch);
    return $response;
}

$sent = wiro("/Studio/Message/Send", [
    "message" => "Two square banner images for a bakery weekend sale, warm colors",
    "sessionkey" => "bakery-banners"
]);

do {
    sleep(3);
    $detail = wiro("/Studio/Message/Detail", [
        "messageguid" => $sent["messageguid"],
        "sessionkey" => "bakery-banners"
    ])["data"];
} while (!in_array($detail["status"], ["agent_end", "agent_error", "agent_cancel"]));

echo $detail["response"];
```

### C#

```csharp
using System.Net.Http.Json;
using System.Text.Json;

using var client = new HttpClient { BaseAddress = new Uri("https://api.wiro.ai/v1/") };
client.DefaultRequestHeaders.Add("x-api-key", "YOUR_API_KEY");

var sent = await (await client.PostAsJsonAsync("Studio/Message/Send", new {
    message = "Two square banner images for a bakery weekend sale, warm colors",
    sessionkey = "bakery-banners"
})).Content.ReadFromJsonAsync<JsonElement>();
var messageGuid = sent.GetProperty("messageguid").GetString();

JsonElement data;
string status;
do {
    await Task.Delay(3000);
    var detail = await (await client.PostAsJsonAsync("Studio/Message/Detail", new {
        messageguid = messageGuid,
        sessionkey = "bakery-banners"
    })).Content.ReadFromJsonAsync<JsonElement>();
    data = detail.GetProperty("data");
    status = data.GetProperty("status").GetString();
} while (status != "agent_end" && status != "agent_error" && status != "agent_cancel");

Console.WriteLine(data.GetProperty("response").GetString());
```

### Go

```go
package main

import (
    "bytes"
    "encoding/json"
    "fmt"
    "net/http"
    "time"
)

func wiro(path string, body map[string]interface{}) map[string]interface{} {
    payload, _ := json.Marshal(body)
    req, _ := http.NewRequest("POST", "https://api.wiro.ai/v1"+path, bytes.NewBuffer(payload))
    req.Header.Set("Content-Type", "application/json")
    req.Header.Set("x-api-key", "YOUR_API_KEY")
    resp, err := http.DefaultClient.Do(req)
    if err != nil {
        panic(err)
    }
    defer resp.Body.Close()
    var out map[string]interface{}
    json.NewDecoder(resp.Body).Decode(&out)
    return out
}

func main() {
    sent := wiro("/Studio/Message/Send", map[string]interface{}{
        "message":    "Two square banner images for a bakery weekend sale, warm colors",
        "sessionkey": "bakery-banners",
    })

    for {
        time.Sleep(3 * time.Second)
        detail := wiro("/Studio/Message/Detail", map[string]interface{}{
            "messageguid": sent["messageguid"],
            "sessionkey":  "bakery-banners",
        })["data"].(map[string]interface{})
        status := detail["status"].(string)
        if status == "agent_end" || status == "agent_error" || status == "agent_cancel" {
            fmt.Println(detail["response"])
            break
        }
    }
}
```

### Response (Send)

```json
{
  "result": true,
  "errors": [],
  "messageguid": "c3d4e5f6-a7b8-9012-cdef-345678901234",
  "agenttoken": "aB3xK9mR2pLqWzVn7tYhCd5sFgJkNb",
  "status": "agent_queue"
}
```
