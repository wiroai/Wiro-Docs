# Workflows

Chain models and built-in steps into one graph, save it, and run it again with new inputs.

## Overview

A workflow is a saved chain of steps. Each step runs one Wiro model or one built-in utility. The Start node holds the inputs people fill in, and the End node lists the results. A saved workflow runs each time someone starts it, on [wiro.ai/workflows](https://wiro.ai/workflows) or through the API.

The `/Workflow/*` endpoints list and read workflows, save new ones from a graph, edit, clone and delete them, run them and follow their runs. To design a workflow in plain language, use the [Workflow Agent](/docs/workflow-agent). The [Wiro MCP Server](/docs/wiro-mcp-server) offers these endpoints as tools for AI assistants.

### Authentication

Every `/Workflow/*` route on this page takes a project API key: `x-api-key`, plus `x-nonce` and `x-signature` for a project that uses signature authentication (see [Authentication](/docs/authentication)). A key acts as the person who created its project, in that project's workspace.

### Workspaces and the gallery

- A workflow belongs to the workspace it was created in: personal, or a team. Another workspace cannot read, run or change it, unless it is published in the public gallery: anyone can read and run a published workflow.
- A **protected** workflow hides its steps from people outside its owner's workspace. They can still see its inputs and outputs and run it.
- Workflows saved through the API are private. Publishing to the gallery happens on wiro.ai, and a published workflow goes through review again after its title, description, tags or steps change.

### Slugs

A workflow is named by its full slug: its `slug`, a dash and its 5-character `slugid`, such as `product-shots-a1B2c`. Every endpoint that takes a workflow takes the full slug as `slug`. The workflow's page is `https://wiro.ai/workflows/<full slug>`.

## The Workflow Graph

A workflow's definition is one JSON object, its `contents`. It holds the steps, the Start fields people fill in and the End node that lists the results. Before you save a graph you wrote yourself, prepare it with [Workflow/Prepare](#post-workflowprepare): it checks the graph against the live model catalog and fills in what the Wiro editor would.

| Field | Type | Description |
|-------|------|-------------|
| `version` | string | Always `"1"`. |
| `nodes` | object | The steps, keyed by step id, plus the End node under the key `output`. The Start node is not in `nodes`. |
| `schema.input` | object | The Start fields, keyed by the input names a run takes. |
| `schema.output` | object | Always `{}`. |
| `output` | object | A copy of the End node's `fields`. |
| `metadata.input.position` | object | Where the Start node sits on the canvas, such as `{ "x": 0, "y": 0 }`. |
| `metadata.input.values` | object | Optional saved values for the Start fields. A run uses them for the fields it leaves out. |

[Workflow/Prepare](#post-workflowprepare) accepts a graph of at most 40 KB of JSON (40,960 bytes), and counts it again after it fills each step's defaults.

### Steps

Each step is `"node-<id>": { "id", "type", "tool", "depends", "input", "metadata" }`.

- The key is `node-` followed by 1 to 64 letters, digits, `-` or `_`. `id` repeats the key exactly, and `type` is `"run"`.
- `tool` is a model slug (`owner/model`) or a built-in utility: `workflow-utilities/output-filter`, `workflow-utilities/merge-text` or `workflow-utilities/split-text`.
- `input` maps the tool's parameter ids, from [Tool/Detail](/docs/models), to values: fixed values, or references to Start fields and earlier steps.
- `depends` lists every source the step reads: `"input"` when it uses a Start field, and the id of each step it references. No duplicates, never the step itself, never `"output"`.
- `metadata.position` is `{ "x": number, "y": number }` and only places the step on the canvas.

### Start fields

Each key in `schema.input` is that input's name at run time. Give each field `label`, `type`, `defaultValue` and `ui` (an object); [Workflow/Prepare](#post-workflowprepare) fills in the rest the way the editor does. wiro.ai titles each field with its key in the run form, so use a short readable key such as `product_photo`.

- **Text:** `"type": "string"` with `"ui": { "field": "textarea" }`.
- **Choice list:** `"type": "string"` with `"ui": { "field": "select", "options": [{ "value": "16:9", "text": "Wide" }] }`.
- **Number:** `"type": "number"` (whole) or `"float"` (decimal). **Yes or no:** `"type": "boolean"`. Both with `"ui": {}`.
- **File:** `"type": "string"` with `"ui": { "field": "image" }`, or `"audio"`, `"video"` or `"pdf"`. The value is a public URL.

A Start field that a step uses and that has no default must get a value when the workflow runs.

### References

- `$input.<key>` is the value of a Start field.
- `$node-<id>.outputs` is everything a model step produced: its files, or an LLM step's reply.
- `$node-<id>.result` is the result of `output-filter` or `merge-text`. `$node-<id>.text1` to `.textN` are the parts produced by `split-text`.

A reference must be the whole string value, or one whole item of an array. It is never filled in inside longer text, and a fixed value that starts with `$` is read as a reference. To put a Start field or an LLM answer inside a prompt, join the parts with `merge-text`, such as `"texts": ["Write a caption for:", "$input.name"]`, and reference its `result`.

When a model step's outputs feed another model, a single file parameter takes the first file, a combined file parameter (`combinefileinput`) takes all of the files, and a text parameter takes the first file URL or the LLM's answer.

### The End node

It is `"output": { "id": "output", "type": "display", "depends", "input": {}, "fields", "metadata" }`.

- `fields` maps each result name to one reference. Give each result its own source.
- `depends` lists the steps the fields read from. It cannot be empty: a workflow with nothing wired to its End node cannot run.
- The top-level `output` must equal `fields`. Steps that do not lead to the End node never run.

### Built-in utilities

Utilities are free and finish at once. [Workflow/UtilityDetail](#post-workflowutilitydetail) returns their parameters and output ports.

- **`output-filter`** picks items from a model step. Its `outputs` parameter must be a `$node-<id>.outputs` reference. With `mode` `"file"` it keeps the files that match `contenttype` (such as `"image"`, `"audio/*"` or `"mp3"`) and `name`, up to `count` items (default 1). With `mode` `"llm"` it takes `field` (`"answer"`, `"thinking"`, `"raw"` or `"prompt"`) from an LLM step. Port: `result`.
- **`merge-text`** joins `texts` (an array of references or fixed strings) with `separator` (default a space), skipping empty items unless `skipEmpty` is `false`. Port: `result`.
- **`split-text`** splits `text` by `separator` (default a new line) into `count` parts, 2 to 10 (default 5). `count` must be a fixed value. Ports: `text1` to `textN`.

Other operations, such as joining videos or adding a voice track to a video, are ordinary models in the catalog.

### Model steps

- Use only parameter ids from the model's [Tool/Detail](/docs/models).
- Set every parameter you care about. A parameter you leave out takes the model's default from [Tool/Detail](/docs/models). To leave a file parameter empty, set it to `[]`, or `""` for a single file.
- A single file parameter takes one URL string. A combined file parameter (`combinefileinput`) takes an array, even for one file. A multi-file parameter (`multifileinput`) takes its URLs comma-separated in its matching `...UrlMultiple` field.
- Take each value, such as a duration, a size or an option, from the model's schema in [Tool/Detail](/docs/models).
- Training models cannot be used in workflows.

### A minimal workflow

One text input, one image model and one result. Replace `owner/model` with a real model and `prompt` with that model's text parameter id.

```json
{
  "version": "1",
  "nodes": {
    "node-image": {
      "id": "node-image", "type": "run", "tool": "owner/model", "depends": ["input"],
      "input": { "prompt": "$input.prompt" },
      "metadata": { "position": { "x": 350, "y": 0 } }
    },
    "output": {
      "id": "output", "type": "display", "depends": ["node-image"], "input": {},
      "fields": { "image": "$node-image.outputs" },
      "metadata": { "position": { "x": 700, "y": 0 } }
    }
  },
  "output": { "image": "$node-image.outputs" },
  "schema": {
    "input": {
      "prompt": { "label": "Prompt", "type": "string", "defaultValue": "", "ui": { "field": "textarea" } }
    },
    "output": {}
  },
  "metadata": { "input": { "position": { "x": 0, "y": 0 } } }
}
```

To turn that image into a video, add a second model step that reads the first step's file and a `motion` Start field:

```json
"node-video": {
  "id": "node-video", "type": "run", "tool": "owner/video-model",
  "depends": ["input", "node-image"],
  "input": { "inputImage": "$node-image.outputs", "prompt": "$input.motion" },
  "metadata": { "position": { "x": 700, "y": 0 } }
}
```

Then set the End node's `"depends": ["node-video"]` and `"fields": { "video": "$node-video.outputs" }`, copy those fields to the top-level `output`, and move the End node to `"x": 1050`. `inputImage` stands for the video model's image parameter: check its real id in the model's schema.

## How a Run Works

[Workflow/Run](#post-workflowrun) answers at once with a run token, the `workflowtoken`; the steps run after that. Read the run with [Workflow/RunDetail](#post-workflowrundetail) until its `status` is final.

- Only the steps that lead to the End node run. Steps run in layers: a step that depends on no other step is in the first layer, and any other step is one layer after the latest of the steps it depends on. The steps of a layer start together, and the next layer starts once every step of the current one has finished.
- When a step fails, every step in a later layer is skipped, on every branch, and the run ends as `failed`.
- Check the expected cost (see [Costs](#costs)) before you start a run.
- The run belongs to the caller's workspace and is paid from that workspace's wallet, also when the workflow is a public one from another workspace.

### Run statuses

| Status | Meaning |
|--------|---------|
| `running` | Steps are queued or running. |
| `completed` | Every step finished. The End node's fields hold the results. |
| `failed` | A step failed, and the steps after it were skipped. |
| `stopped` | The run reached its breakpoint. Continue it with [RunResume](#post-workflowrunresume). |
| `cancelled` | One of the run's steps was cancelled. |

A step is `pending`, `running`, `completed`, `failed`, `cancelled` or `aborted` (skipped because an earlier step failed). A failed step's `cause` is `tool-error` (the model refused its inputs or the task failed; `error` says why), `poll-timeout` (the step ran past 4 hours and was not charged), or another short code.

### Breakpoints

To test the first steps, start the run with `breakpointNodeId`. The run executes every layer up to and including the one that holds that step, then ends as `stopped`, and the steps after it stay `pending`. The breakpoint must be a step the run executes and cannot be in the last layer. Only people who can edit the workflow can set one. Check the outputs, then continue with [RunResume](#post-workflowrunresume), to the end or to a later breakpoint.

### Resuming

[RunResume](#post-workflowrunresume) continues a `failed` or `stopped` run on the same `workflowtoken`. Completed steps keep their outputs and are not charged again. Failed, skipped and not yet run steps run again as new tasks, billed to the wallet that paid for the run.

A resume runs the remaining steps exactly as the run started them, with the same inputs and settings: changes saved to the workflow since then apply to new runs only. So resume after a temporary failure, such as a timeout or a model that asked to try again later. An error about a parameter value, a file or a limit such as duration or size comes from the inputs or the settings: fix them and start a new run.

## Costs

- Saving, reading, preparing, cloning and deleting workflows is free.
- Nothing is charged when a run starts. Each model step is a normal [model task](/docs/run-a-model), billed when it finishes successfully at that model's price. Failed steps are not charged, and utility steps are free.
- To start, the wallet must hold $0.50 for each model step the run will execute (up to the breakpoint, when one is set). Otherwise the run is refused with code `97`, `Insufficient balance`. The [concurrency limit](/docs/concurrency-limits) also applies (code `96`).
- The expected cost of a run is the sum of the model prices for the settings each step uses, from [Tool/Detail](/docs/models). A run's `totalcost` shows the list price of the steps finished so far, and once the run has ended `chargedcost` and `discountamount` show what the wallet paid. `chargedcost` is `null` while a step's charge is still settling.
- In a team workspace, the team's spend limits and model access rules apply when a run starts.

## **POST** /Workflow/List

Lists the workflows of the key's workspace, or searches the public gallery.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `scope` | string | No | `"my"` (default) for the key's workspace, `"public"` for the public gallery. |
| `search` | string | No | Text to look for in the slug, title, description or tags. |
| `sort` | string | No | `my`: `createtime` (default), `updatetime` or `title`. `public`: `createtime` (default), `runcount`, `likecount`, `clonecount` or `ratingscore`. |
| `order` | string | No | `DESC` (default) or `ASC`. |
| `start` | number | No | Offset for paging. Default `0`. |
| `limit` | number | No | Rows per page. `my`: default `20`, maximum `1000`. `public`: default `50`, maximum `200`. |
| `ispublic` | string | No | `my` only: `"0"` for private workflows, `"1"` for workflows submitted to the gallery. |
| `tags` | array | No | `public` only: workflows with any of these tags, up to 20. |
| `model` | string | No | `public` only: workflows that use this model, as `"owner/model"`. |
| `onlyfavorites` | string | No | `public` only: `"1"` for the workflows you liked. |
| `toolpreview` | string | No | `public` only: `"1"` adds `toolitems`, the models each workflow uses with their titles and covers. |

The response is `{ "result": true, "errors": [], "workflow": [...], "total": 1 }`. In your workspace (`my`), a personal key lists your own workflows and a team key lists every workflow of the team.

| Field | Description |
|-------|-------------|
| `id` | The workflow's numeric id. |
| `slug`, `slugid` | The full slug is `<slug>-<slugid>`. |
| `title`, `description`, `tags`, `cover` | The workflow's details. |
| `ispublic` | `1` when the workflow was submitted to the gallery. |
| `status` | `null` when never published, `1` waiting for review, `2` listed in the gallery, `3` rejected. |
| `isprotected` | `1` when the steps are hidden from people outside the owner's workspace. |
| `clonedfromid` | On a clone, the id of the workflow it was copied from. |
| `stepcount`, `toolcount`, `utilitycount` | The number of steps, model steps and utility steps. |
| `teamname` | The team the workflow belongs to, if any. |
| `runcount`, `likecount`, `clonecount`, `ratingaverage`, `ratingcount`, `commentcount` | Gallery counters. `runcount` counts runs while the workflow is listed. |
| `createtime`, `updatetime` | Unix seconds. Pass `updatetime` to [Update](#post-workflowupdate) as `loadedUpdatetime`. |

Gallery rows (`public`) also carry `tools` (the models the workflow uses; `null` on a protected workflow) and `user` (`username`, `avatar`) for the creator.

### Response

```json
{
  "result": true,
  "errors": [],
  "workflow": [
    {
      "id": 1842,
      "slug": "product-ad",
      "slugid": "a1B2c",
      "title": "Product ad",
      "description": "Turns a product photo into a short ad video",
      "tags": ["ads", "video"],
      "cover": null,
      "ispublic": 0,
      "status": null,
      "isprotected": 0,
      "clonedfromid": null,
      "stepcount": 2,
      "toolcount": 2,
      "utilitycount": 0,
      "teamname": null,
      "runcount": 0,
      "likecount": 0,
      "clonecount": 0,
      "ratingaverage": null,
      "ratingcount": 0,
      "commentcount": 0,
      "createtime": "1761901200",
      "updatetime": "1761901200"
    }
  ],
  "total": 1
}
```

## **POST** /Workflow/Detail

Returns one workflow with its graph.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `slug` | string | Yes | The full slug, such as `product-ad-a1B2c`. |

The response is `{ "result": true, "errors": [], "workflow": [ { ... } ] }`: the fields of List plus `contents`, the graph as an object (see [The Workflow Graph](#the-workflow-graph)). Its `schema.input` lists the inputs a run takes, and `metadata.input.values` the saved values.

- A workflow from your workspace, or one published in the gallery, can be read. A private workflow of another workspace answers `This workflow does not belong to your current workspace.` or `You don't have any permission for this action.`, and a clone can only be read by its owner's workspace.
- A protected workflow read from outside its owner's workspace comes back with its steps removed: `contents` keeps only the Start fields and the End node, and `estimatedcost` gives an estimate of one run, `{ "type": "estimated", "value": 0.42 }` (`"unavailable"` with `value: null` when it cannot be estimated).
- `rejectreason` is present only for the workflow's own workspace: on a rejected workflow it says why.
- A deleted or unknown workflow answers `Workflow not found`.

Saved Start values are part of the workflow: everyone who can read it sees them, the gallery too once it is published, and clones keep them. Never save a key, token or password there. Model steps are billed to the Wiro wallet and need no key from the model's provider.

## **POST** /Workflow/Prepare

Prepares a graph you wrote for saving, the way the Wiro editor does: it checks every step against the live model catalog, fills each model parameter you left out with its default, completes the Start fields and the End node, and lays the steps out. It writes and charges nothing. Prepare the graph, then save the prepared `contents` with [Add](#post-workflowadd) or [Update](#post-workflowupdate).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `contents` | object | Yes | The graph, as an object or a JSON string. |
| `mode` | string | No | `"create"` (default) lays every step out again, for a new workflow. `"apply"` keeps the positions you sent, for a change to an existing workflow; every step then needs a numeric position. |
| `anchorNodeIds` | array | No | `apply` only: step ids (`"input"` for Start, `"output"` for End) that keep their exact positions; the other steps move down until nothing overlaps. |

On success, `contents` is the prepared graph. On failure, `result` is `false` and `issues` lists every problem at once, each `{ code, message, nodeId, input }`: `nodeId` is the step (`"input"` for a Start field, `"output"` for an End field) and `input` the parameter or field. `warnings` can come back either way; `required-input-missing` means a Start field a step uses has no default, so every run must send a value for it.

```json
{
  "result": false,
  "errors": [{ "code": 0, "message": "...", "time": 1761901200 }],
  "issues": [
    { "code": "unknown-input", "message": "...", "nodeId": "node-image", "input": "promt" },
    { "code": "contents-too-large", "message": "Workflow JSON exceeds the 40960-byte limit.", "bytes": 52114, "limit": 40960 }
  ],
  "warnings": []
}
```

Common issue codes: `tool-not-found` and `tool-not-marketplace` (the model does not exist or is not public), `unknown-input` (a parameter id the model does not have), `unknown-input-reference`, `unknown-node-reference` and `reference-missing-dependency` (a reference to a missing Start field or step, or one not listed in `depends`), `embedded-workflow-reference` (a reference inside longer text), `file-input-not-array` and `single-file-only` (one file where an array is needed, or the reverse), `request-parameter-required` (a required model parameter has no value), `param-out-of-bounds`, `cycle-detected`, `workflow-has-no-reachable-nodes`, `duplicate-end-reference`, and `contents-too-large` or `prepared-contents-too-large` with `bytes` and `limit`.

Prepare fills every model parameter you leave out with the model's default: compare the prepared step inputs with what you sent, and set or empty the ones you did not mean to keep.

## **POST** /Workflow/Add

Saves a new, private workflow in the key's workspace.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `title` | string | Yes | The workflow's title. If the workspace already has a workflow with this title, a number is added, such as `Product ad-2`. |
| `slug` | string | Yes | The title part of the slug: lowercase letters, digits and dashes, such as `product-ad`. Wiro adds the 5-character `slugid`. |
| `contents` | string | Yes | The prepared graph as a JSON string. |
| `description` | string | No | What the workflow does and what people should put in its inputs. |
| `tags` | string | No | A JSON string of an array of tags, such as `"[\"ads\",\"video\"]"`. Tags that start with `wiro-` are reserved. |

The response is `{ "result": true, "errors": [], "workflow": [ { ... } ] }` with the saved workflow, including its `slugid` and `updatetime`. Add checks that every model and utility exists; run the graph through [Prepare](#post-workflowprepare) first, which checks the references, the inputs and everything else a run needs.

## **POST** /Workflow/Update

Changes a workflow of the key's workspace.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `slug` | string | Yes | The full slug. |
| `title` | string | No | A new title. |
| `description` | string | No | A new description. |
| `tags` | string | No | A JSON string of the new tag array. Keep any `wiro-` tags the workflow already has. |
| `contents` | string | No | A new graph as a JSON string, prepared with `mode: "apply"`. It replaces the old one. |
| `loadedUpdatetime` | string | No | The `updatetime` you read. If someone saved the workflow since then, nothing is written. |
| `force` | boolean | No | `true` saves even when `loadedUpdatetime` no longer matches. |
| `input` | object | No | Protected clones only: new saved values for the Start fields, by key. |

Title and description are changed only when you send a non-empty value. The response holds the workflow after the change, with its new `updatetime`.

- **Concurrent edits.** When `loadedUpdatetime` no longer matches, the update is refused with `This workflow was modified by another user. Reload to see latest changes or save to overwrite.` and the response carries `currentUpdatetime`. Read the workflow again and redo the change on top, or send `force: true` to overwrite.
- **Published workflows.** Changing the title, description, tags or graph of a workflow in the gallery sends it back to review, and it leaves the gallery until it is approved again.
- **Clones.** A clone of a protected workflow keeps its steps hidden: you can change its title, description and tags, and its saved Start values with `input`, but not its `contents`.
- When a new graph stops using files that were uploaded into the workflow in the wiro.ai editor, those files are deleted, unless a past run or a clone still uses them.

## **POST** /Workflow/Clone

Copies a workflow from the public gallery into the key's workspace.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `slug` | string | Yes | The full slug of a workflow listed in the gallery. |

The copy is private and free. It keeps the graph and the saved Start values; a taken title becomes `Title-Clone`. The response holds the new workflow, without `contents`: read it with [Detail](#post-workflowdetail). Each call makes another copy.

- Only a workflow listed in the gallery can be cloned (`This workflow cannot be cloned`), and not into the workspace it already belongs to (`This workflow already belongs to this workspace`).
- A clone can never be published or cloned again, and only its own workspace can read it.
- A clone of a protected workflow keeps its steps hidden from everyone, its owner included. It can still be run.

## **POST** /Workflow/Delete

Deletes a workflow of the key's workspace. It leaves every list and the gallery and can no longer be run or read. Runs already started finish, and clones keep working.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `slug` | string | Yes | The full slug. |

The response is `{ "result": true, "errors": [], "workflow": [] }`. There is no undo.

## **POST** /Workflow/Run

Starts a run and answers at once with its token.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `slug` | string | Yes | The full slug. |
| `input` | object | No | Values for the Start fields, keyed as in `schema.input`: strings, numbers, booleans or arrays. Files are public URLs. A field you leave out uses its saved value, then its default. |
| `breakpointNodeId` | string | No | A step id to stop after (see [Breakpoints](#breakpoints)). |

```json
{
  "result": true,
  "errors": [],
  "workflowtoken": "Lk3vQ9xT2mWc7Rp4Yh8Nd1Fs6Gb0Zj"
}
```

- Your own workspace's workflows and the workflows listed in the gallery can be run. On a protected gallery workflow from another workspace, a field you leave out uses its default, not the creator's saved value.
- An unknown input key is refused with `Unknown input field(s): <keys>. Check your workflow's Start Node schema for valid field names.`, and a Start field that a step needs and that has no value is refused with `A required input value is missing: <key>.`
- Missing inputs and broken references are all returned at once, and nothing is charged for a refused run.
- File inputs are fetched from public http(s) URLs, up to about 100 MB each.

## **POST** /Workflow/RunDetail

Returns a run and its steps. Call it until `status` is `completed`, `failed`, `stopped` or `cancelled`.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `workflowtoken` | string | Yes | The run token. |

The response has `workflowrun` and `workflowrunnodes`. Runs are private: the person who started a run can read it, and in a team workspace every member of the team can.

| `workflowrun` field | Description |
|---------------------|-------------|
| `workflowtoken`, `workflowslug` | The run token and the workflow's full slug. |
| `status` | `running`, `completed`, `failed`, `stopped` or `cancelled`. |
| `outcome` | The final status, once the run has ended. |
| `canresume` | `true` when you can continue this run with [RunResume](#post-workflowrunresume). |
| `breakpointnodeid` | The breakpoint in effect, or `null`. |
| `contents` | The graph as this run started it, with the Start values it used. |
| `totalcost` | The list price of the steps finished so far, in USD. |
| `chargedcost`, `discountamount` | Once the run has ended: what the wallet paid and the discount. `null` while a charge is still settling. |
| `startedAt` | Start time in milliseconds. `resumedAt` is added when the run was resumed. |
| `elapsedseconds` | Running time, summed over resumes. |
| `failedNodeCount`, `abortedNodeCount`, `cancelledNodeCount` | Step counts. |

| `workflowrunnodes` field | Description |
|--------------------------|-------------|
| `nodeId`, `tool`, `kind` | The step id, its model or utility, and `tool` or `utility`. |
| `layerIdx` | The step's layer, from 0. |
| `status` | `pending`, `running`, `completed`, `failed`, `cancelled` or `aborted`. |
| `cause`, `error` | Why the step did not complete. |
| `tasktoken` | For a model step that started a task. Pass it to [RunNodeDetail](#post-workflowrunnodedetail). |
| `outputs` | A model step's results: files with `url`, `name`, `contenttype` and `size`, or an LLM's reply as `{ "contenttype": "raw", "content": { "answer": [...] } }`. A utility step's ports, such as `{ "result": [...] }`. |
| `elapsedseconds` | How long the step ran. |

To find a run's results, read the End node's `fields` in `contents` and take the `outputs` of the steps they reference.

When the workflow's steps are hidden from you, as on a protected workflow from another workspace, the run comes back with `graphmasked: true`: `contents` shows only the Start fields and the End node, and `workflowrunnodes` holds only the steps the End node shows, with their `status` and `outputs`.

### Response

```json
{
  "result": true,
  "errors": [],
  "workflowrun": {
    "workflowtoken": "Lk3vQ9xT2mWc7Rp4Yh8Nd1Fs6Gb0Zj",
    "workflowslug": "product-ad-a1B2c",
    "status": "completed",
    "outcome": "completed",
    "breakpointnodeid": null,
    "startedAt": 1761902400000,
    "elapsedseconds": 74,
    "totalcost": "0.84",
    "chargedcost": "0.84",
    "discountamount": "0",
    "failedNodeCount": 0,
    "abortedNodeCount": 0,
    "cancelledNodeCount": 0,
    "contents": { "...": "..." }
  },
  "workflowrunnodes": [
    {
      "nodeId": "node-image",
      "tool": "google/nano-banana-pro",
      "kind": "tool",
      "layerIdx": 0,
      "status": "completed",
      "cause": null,
      "error": null,
      "tasktoken": "Ab12Cd34Ef56Gh78Ij90Kl12Mn34Op",
      "outputs": [
        {
          "url": "https://cdn1.wiro.ai/5e8d7a1c/product.png",
          "name": "product.png",
          "contenttype": "image/png",
          "size": "1843212"
        }
      ],
      "elapsedseconds": 31
    },
    {
      "nodeId": "node-video",
      "tool": "klingai/kling-v3",
      "kind": "tool",
      "layerIdx": 1,
      "status": "completed",
      "cause": null,
      "error": null,
      "tasktoken": "Qr56St78Uv90Wx12Yz34Ab56Cd78Ef",
      "outputs": [
        {
          "url": "https://cdn1.wiro.ai/9b2f4e6a/ad.mp4",
          "name": "ad.mp4",
          "contenttype": "video/mp4",
          "size": "6200412"
        }
      ],
      "elapsedseconds": 43
    }
  ]
}
```

## **POST** /Workflow/RunNodeDetail

Shows what one model step received and returned, to debug a failed step.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tasktoken` | string | Yes | The step's `tasktoken` from RunDetail. |

The response's `workflowrunnode` has the step's RunDetail fields plus `taskDetail`: the `parameters` the model received, its `debugoutput`, `taskStatus`, and `modelslugowner` and `modelslugproject`. Utility steps have no task to read. When the workflow's steps are hidden from you, it answers `You don't have any permission for this action.`

## **POST** /Workflow/RunHistory

Lists runs, newest first. A personal key lists your own runs; a team key lists the runs of every member of the team. Runs started on wiro.ai are included.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `start` | number | No | Offset. Default `0`. |
| `limit` | number | No | Default `20`, maximum `1000`. |
| `status` | string | No | `running`, `completed`, `failed`, `stopped` or `cancelled`. |
| `search` | string | No | Text in the workflow's title, or its slug without the 5-character id: `product-ad` finds the runs of `product-ad-a1B2c`. |
| `workflowid` | number | No | Only the runs of this workflow id. |
| `sort` | string | No | `id` (default), `starttime`, `status` or `totalcost`. |
| `order` | string | No | `DESC` (default) or `ASC`. |

The response is `{ "result": true, "errors": [], "workflowruns": [...], "total": 12 }`. Each row has the `workflowrun` fields of [RunDetail](#post-workflowrundetail) without `contents`, plus `workflowid`, `workflowtitle`, `teamname` and `nodes`, each step's `{ nodeId, tool, kind, layerIdx, status }`. To read a run's outputs, call RunDetail with its token.

## **POST** /Workflow/RunResume

Continues a `failed` or `stopped` run on the same token. See [Resuming](#resuming).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `workflowtoken` | string | Yes | The run token. |
| `breakpointNodeId` | string | No | A new breakpoint. Send `null` to run to the end. Leave the field out and a failed run keeps the breakpoint it started with, while a stopped run runs to the end. |

The response is `{ "result": true, "errors": [], "workflowtoken": "..." }`; follow the run with RunDetail again.

- The person who started the run can resume it after a failure. Continuing a stopped run, and setting a breakpoint, needs someone who can edit the workflow; in a team workspace any such member can.
- The balance check runs again for the steps that will run.
- `This run is already resuming or still wrapping up. Try again in a moment` and `A step of this run is still finishing. Try again in a few minutes` mean an earlier step is still settling: wait a few minutes and try once more.
- Any other status is refused with `Only a failed or stopped run can be resumed`.

## **POST** /Workflow/UtilityDetail

Returns a built-in utility's parameters and output ports, in the same shape as a model's parameters in [Tool/Detail](/docs/models).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `slug` | string | Yes | `workflow-utilities/output-filter`, `workflow-utilities/merge-text` or `workflow-utilities/split-text`. |

The response's `utility` holds one entry with `slug`, `title`, `description`, `parameters` (groups of parameter definitions with `id`, `type`, `label`, `defaultvalue`, `options`, `minvalue` and `maxvalue`) and `outputs`, the ports, each `{ id, label, type }`.

## Errors

Business errors come back with HTTP 200, `result: false` and an `errors` array, as everywhere in the Wiro API. The ones you will see most:

| Message | Code | When |
|---------|------|------|
| `Workflow not found` | 0 | An unknown or deleted workflow. |
| `This workflow does not belong to your current workspace.` | 0 | A private workflow of another workspace. Use a key from a project in the workflow's workspace. |
| `You don't have any permission for this action.` | 0 | The key's project creator has no rights on this workflow or run. |
| `You must be a member of this team to perform this action` | 0 | A team project's key whose creator is no longer a member of the team. |
| `slug has invalid format` | 0 | Not a full slug ending in a dash and a 5-character id. |
| `invalid json for contents param.` | 0 | Add or Update with `contents` that is not a JSON string. |
| `Contents do not match the expected workflow structure.` | 0 | A graph without the required shape (see [The Workflow Graph](#the-workflow-graph)). |
| `This tool in the workflow was not found: <slug>` | 0 | A step's model does not exist. |
| `Tags that start with wiro- are reserved for Wiro` | 0 | Add or Update with a `wiro-` tag. |
| `This workflow was modified by another user. Reload to see latest changes or save to overwrite.` | 0 | Update with an outdated `loadedUpdatetime`; the response adds `currentUpdatetime`. |
| `This workflow cannot be cloned` | 0 | Clone of a workflow that is not listed in the gallery. |
| `Unknown input field(s): <keys>. Check your workflow's Start Node schema for valid field names.` | 0 | Run with an input key the workflow does not have. |
| `A required input value is missing: <key>.` | 0 | Run without a value for a Start field a step needs. |
| `Workflows cannot include train tools as they take days to complete` | 0 | A step uses a training model. |
| `Insufficient balance` | 97 | The wallet holds less than $0.50 per model step that will run. |
| `You have reached your concurrent task limit...` | 96 | See [Concurrency Limits](/docs/concurrency-limits). |
| `Only people who can edit this workflow can stop a run at a step` | 0 | `breakpointNodeId` from someone who cannot edit the workflow. |
| `There is no workflow run yet.` | 0 | An unknown run token. |
| `Only a failed or stopped run can be resumed` | 0 | RunResume on a run that is running or completed. |

Authentication errors are listed in the [Error Reference](/docs/error-reference).
