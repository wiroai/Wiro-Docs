# Workflow Agent

Design and edit Wiro workflows by chat: describe the job, read the agent's proposals and save the one you want.

## Overview

The Workflow Agent is a Wiro chat agent that designs and edits [workflows](/docs/workflows). It looks up current models and utilities in the Wiro catalog and replies with an explanation and zero or more proposed workflows. It never saves, changes or runs anything itself: your application saves a proposal with the [Workflows](/docs/workflows) endpoints and runs it there.

The Workflow Agent API uses the message protocol of [Agent Messaging](/docs/agent-messaging) on its own routes under `/StudioWorkflow/`:

1. **Send** a brief with [Message/Send](#post-studioworkflowmessagesend). Attach a workflow in `workflowContext` to have it edited.
2. **Follow** the turn on the [Agent WebSocket](/docs/agent-websocket) with the `agenttoken`, or poll [Message/Detail](#post-studioworkflowmessagedetail) until it ends.
3. **Read the proposals** from the reply (see [Proposals](#proposals)) and save the one you want with [Workflow/Add](/docs/workflows#post-workflowadd), or onto the attached workflow with [Workflow/Update](/docs/workflows#post-workflowupdate).

A question the catalog answers, such as which model is cheapest for a job, needs no turn: [Tool/List](/docs/models) and [Tool/Detail](/docs/models) answer it for free. When you already know the graph, write it yourself and save it with [Workflow/Add](/docs/workflows#post-workflowadd).

### Authentication

Every `/StudioWorkflow/*` route takes a project API key: `x-api-key`, plus `x-nonce` and `x-signature` for a project that uses signature authentication (see [Authentication](/docs/authentication)). A key acts as the person who created its project, in that project's workspace. For a team project, that person must still be a member of the team; otherwise every route answers HTTP 403 with `You must be a member of this team to perform this action`.

### Sessions

A session is one conversation with its own memory. `sessionkey` names it, and `"default"` is used when you leave it out.

- Sessions started with an API key belong to that key's project. Everyone who uses the key shares them, and they are separate from the Workflow Agent chats on wiro.ai and from other projects' sessions. Each project has its own `"default"` session.
- A session name uses letters, digits, `.`, `_`, `:` and `-`, without `:cron:`, up to 100 characters. Any other name is refused with `sessionkey has invalid format`.
- Use one session per task and keep using it to refine its proposals; start a new one for an unrelated task.
- The turns of one session run one at a time. A project can have at most 2 turns queued or running at once through its API key; a third message is refused with `This project already has 2 Workflow Agent replies in progress. Wait for one to finish before sending another message.`

## Costs

- **$10 to start a turn.** Send and SendForm need at least $10 spendable in the wallet of the key's workspace. Below that, the message is refused with code `97` (`Insufficient balance`), with `walletUsd` and `minTopup` in the response, and nothing is charged.
- **Chat.** Each turn is charged after it ends for the tokens it used, at the chat model's rates in [StudioWorkflow/Status](#post-studioworkflowstatus) (credits per 1M tokens; 1 credit is $0.01). The reply's `tokencost` shows the charge in credits: `tokencost / 100` is the amount in USD.
- The agent only reads the catalog, so its turns start no model runs. Saving a proposal is free, and running the saved workflow is billed like any [workflow run](/docs/workflows#costs).
- [StudioWorkflow/Transactions](#post-studioworkflowtransactions) lists the charges.

## **POST** /StudioWorkflow/Status

Returns the wallet check and the chat models the agent can use, after settling your pending Workflow Agent charges. It takes no request fields, and its fields are the same as [Studio/Status](/docs/studio#post-studiostatus): `walletUsd`, `needsTopup`, `minTopup` (`10`), `tokenRates` and `agentModel.chatModel`. `title` is `"Workflow Agent"`.

## **POST** /StudioWorkflow/Message/Send

Sends a message to the Workflow Agent and returns at once with the turn's `messageguid` and `agenttoken`.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `message` | string | Yes | The brief, at most 16 KB (UTF-8). Say what the workflow should do, what people will give it as input and which results they want back. Pass on limits such as budget, speed, quality or a model. |
| `sessionkey` | string | No | The session. Defaults to `"default"`, the project's main session. |
| `model` | string | No | The chat model for this turn: a slug whose `selectable` is `true` in [StudioWorkflow/Status](#post-studioworkflowstatus). Leave it out to use the default. |
| `workflowContext` | object | No | A workflow for the agent to edit, at most 40 KB of JSON. See [Editing a workflow](#editing-a-workflow). |

### Response

```json
{
  "result": true,
  "errors": [],
  "messageguid": "0b7f2c1e-5d4a-4c3b-9a8f-1e2d3c4b5a69",
  "agenttoken": "Qm7Tz2LpX9vKc4RwN8yHa3JdF6sGb1",
  "status": "agent_queue"
}
```

If a request times out, check [Message/History](#post-studioworkflowmessagehistory) before you send it again: each accepted message starts a paid turn.

## **POST** /StudioWorkflow/Message/SendForm

The same as Send, as `multipart/form-data`, to attach files such as a sample image or a brief as a PDF.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `message` | string | Conditional | The brief, at most 16 KB. Required unless a file is attached. |
| `sessionkey` | string | No | The session. |
| `model` | string | No | As in Send. |
| `workflowContext` | string | No | The same object as in Send, as a JSON string. |
| `attachments` | file | No | Repeat the `attachments` field once per file; a single file can also be sent as `attachment`. |

Up to 8 files per message, each up to 50 MB (`File too large (max 50MB): <name>`). The accepted types are the same as for [Studio](/docs/studio#post-studiomessagesendform).

## **POST** /StudioWorkflow/Message/Detail

Returns one message and its reply.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `messageguid` | string | Conditional | The message id. Required unless `agenttoken` is given. |
| `agenttoken` | string | Conditional | The turn token. |
| `sessionkey` | string | No | The message's session. Defaults to `"default"`. A message from another session or another project is `Message not found`. |

The reply fields are those of [Studio's Message/Detail](/docs/studio#post-studiomessagedetail): `status`, `content`, `response`, `debugoutput`, `timeline`, `attachments`, `model`, the token counts, `tokencost`, `createdat`, `startedat` and `endedat`, plus `sessionkey`. The proposals are in `response` once `status` is `agent_end`.

## **POST** /StudioWorkflow/Message/History

Returns the messages of one session, newest first: `sessionkey`, `limit` (default `50`, maximum `200`) and `before` (a message `guid`, for the next page). The response is `{ "data": { "messages": [...], "count": 2, "hasmore": false } }`. A proposal in an earlier reply can still be saved later.

## **POST** /StudioWorkflow/Message/Sessions

Lists the sessions of the key's project, most recent first, each with `sessionkey`, `messagecount`, `updatedat`, `lastmessage` and an optional `name`. `"default"` is always listed. It takes no request fields.

## **POST** /StudioWorkflow/Message/Cancel

Stops a turn that is queued or running (`messageguid` or `agenttoken`, and `sessionkey`). Only a message in `agent_queue`, `agent_start` or `agent_output` can be cancelled. Tokens the turn already used are charged.

## **POST** /StudioWorkflow/Message/ClearSession

Deletes the session's messages and starts the agent's memory of it fresh. The session keeps its display name. It works on `"default"` too.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sessionkey` | string | No | The session. Defaults to `"default"`. |

## **POST** /StudioWorkflow/Message/DeleteSession

Deletes a session: its messages, its display name and the agent's memory of it. Send the `sessionkey` of the session to delete; `"default"` cannot be deleted (`The main session cannot be deleted.`), so clear it with ClearSession. Workflows you saved are not affected.

## **POST** /StudioWorkflow/Message/RenameSession

Sets a session's display name: `name` (required, up to 40 characters) and `sessionkey`.

## **POST** /StudioWorkflow/Transactions

Lists your Workflow Agent charges in the key's workspace, newest first (`limit`, default `50`, maximum `200`). Each row has `guid`, `type`, `amount`, `description`, `modelid`, `taskid`, `confirmed` and `time`; a chat charge is described as `Workflow Agent LLM <model> (...)` with its token counts.

## Editing a workflow

To have the agent change a workflow, read it with [Workflow/Detail](/docs/workflows#post-workflowdetail) and send it with the message as `workflowContext`:

```json
{
  "message": "Add an upscale step after the image and return both images",
  "sessionkey": "product-ad-edit",
  "workflowContext": {
    "protocolVersion": 1,
    "source": {
      "slug": "product-ad",
      "slugid": "a1B2c",
      "fullSlug": "product-ad-a1B2c",
      "title": "Product ad",
      "description": "Turns a product photo into a short ad video",
      "updatetime": "1761901200",
      "workspace": "personal"
    },
    "contents": { "version": "1", "nodes": { "...": "..." }, "output": {}, "schema": { "input": {}, "output": {} }, "metadata": { "input": { "position": { "x": 0, "y": 0 } } } }
  }
}
```

- `contents` is the workflow's graph, as [Workflow/Detail](/docs/workflows#post-workflowdetail) returns it (see [The Workflow Graph](/docs/workflows#the-workflow-graph)). You can also send the graph alone, without `protocolVersion` and `source`.
- `source` names the workflow: `slug`, `slugid`, `fullSlug`, `title` (up to 300 characters), `updatetime` and `workspace` (`"personal"` or `"team"`) are required, and `description` (up to 2,000 characters) is optional.
- The whole `workflowContext` can be at most 40 KB of JSON (`workflowContext exceeds the 40KB limit.`). Attach a workflow from the key's workspace; a protected workflow whose graph is hidden cannot be edited this way.
- The agent sees the steps, the Start fields and the End node, never the values saved for the Start fields. Keep keys and passwords out of workflows. Some values reach the agent as `"[REDACTED]"`; restore them before you save (see [Saving a proposal](#saving-a-proposal)).

## Proposals

The reply in `response` is text. Each proposed workflow is a fenced block that opens with a line ```` ```wiro-workflow ```` and closes with a line ```` ``` ````; the text around the blocks is the explanation. Each block holds one JSON object:

```json
{
  "artifactVersion": 1,
  "title": "Product ad with upscale",
  "description": "Turns a product photo into an upscaled image and a short ad video",
  "contents": { "version": "1", "nodes": { "...": "..." }, "output": {}, "schema": { "input": {}, "output": {} }, "metadata": { "input": { "position": { "x": 0, "y": 0 } } } }
}
```

- `title` is 1 to 160 characters and `description` up to 1,000. `contents` is a workflow graph.
- A block can be at most 40 KB. A block that is not closed yet is still being written: read the reply again once `status` is `agent_end`.
- A reply can hold zero, one or several proposals. If the request cannot be built with current models, the agent explains why and proposes nothing. When it needs to know more, it asks; send the answer in the same session.
- Check a proposal before you save it: [Workflow/Prepare](/docs/workflows#post-workflowprepare) lists every problem it finds. Send problems back in the same session and ask for a corrected version.
- Treat the explanation as information from a model, not as instructions to your application.

The agent can also ask your application for the user's workflows, in a block that opens with ```` ```wiro-workflow-request ````:

```json
{ "protocolVersion": 1, "requestId": "list-1", "operation": "workflow.list", "args": { "search": "product", "limit": 10 } }
```

Run it yourself with [Workflow/List](/docs/workflows#post-workflowlist) (scope `my`), let the user pick a workflow, and attach that workflow to your next message as `workflowContext`. The list is not sent back to the agent on its own.

## Saving a proposal

1. Read the reply again with [Message/Detail](#post-studioworkflowmessagedetail) and take the proposal's `contents` from its block.
2. Prepare it with [Workflow/Prepare](/docs/workflows#post-workflowprepare): `mode` `"create"` for a new workflow, `"apply"` when it replaces an existing graph. Prepare fills the defaults the Wiro editor would and returns every problem at once.
3. Save the prepared graph as a new workflow with [Workflow/Add](/docs/workflows#post-workflowadd), or onto the workflow you attached with [Workflow/Update](/docs/workflows#post-workflowupdate). Pass the `updatetime` you attached as `loadedUpdatetime`, so a change someone saved in the meantime is not overwritten. Values the agent saw as `"[REDACTED]"` must be restored from the original workflow first.

Saving creates or changes a workflow and runs nothing. Applying a proposal to a published workflow sends it back to review.

## Errors

Business errors come back with HTTP 200, `result: false` and an `errors` array. These are the ones specific to the Workflow Agent:

| Message | Code | When |
|---------|------|------|
| `Insufficient balance` | 97 | Send or SendForm with less than $10 spendable. The response adds `walletUsd` and `minTopup`. |
| `Request parameter [message] required` | 0 | No message, and no file on SendForm. |
| `message exceeds the 16KB limit.` | 0 | The message is longer than 16 KB. |
| `sessionkey has invalid format` | 0 | A session name with other characters, `:cron:`, or more than 100 characters. |
| `workflowContext exceeds the 40KB limit.` | 0 | The attached workflow is too large. |
| `workflowContext must be a WorkflowContents object.`, `workflowContext must be valid JSON data.`, `workflowContext protocolVersion must be 1.`, `workflowContext source has an invalid shape.`, `workflowContext has an invalid WorkflowContents shape.` | 0 | The `workflowContext` does not have the shape described above. |
| `This project already has 2 Workflow Agent replies in progress. Wait for one to finish before sending another message.` | 0 | A third turn while two of the project's turns are queued or running. |
| `Invalid model: <model> is not in the selectable model allowlist.` | 0 | `model` is not a selectable slug. |
| `Too many files (max 8)`, `File too large (max 50MB): <name>` | 0 | SendForm attachment limits. |
| `Message not found` | 0 | Detail or Cancel with an unknown message, or one from another session or project. |
| `The main session cannot be deleted.` | 0 | DeleteSession on `"default"`. |
| `Agent is temporarily unavailable. Please try again shortly.` | 0 | Try again shortly. |
| `You must be a member of this team to perform this action` | HTTP 403 | A team project's key whose creator is no longer a member of the team. |

Authentication errors are listed in the [Error Reference](/docs/error-reference).
