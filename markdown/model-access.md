# Model Access

Choose which models a personal account or a team can run: allow or block single models and whole categories, for the whole wallet, one team member, one API key, a surface such as the LLM gateway, or one agent.

## How Model Access Works

A Model Access rule decides which models a wallet's work can run. Rules work the same way for a personal account's wallet and for a team's wallet. The rules of the workspace a call runs in apply: a team project's API key runs in its team, a personal project's key in your personal account, and the dashboard in the workspace you have selected.

Manage rules in the dashboard under [Controls > Model Access](https://wiro.ai/panel/controls/model-access), for your personal account or for the team workspace you have selected, or with the `/ModelAccess` endpoints below. A workspace without rules can run every model. Team allowlists and blocklists set before this system were moved into it as rules for the whole team.

### What a Rule Covers

Each rule covers one scope of the wallet's work, the same scopes as [spend limits](/docs/spend-limits). A scope and target can have one rule:

| Scope | `target` | What it covers |
|-------|----------|----------------|
| `account` | None | Everything the wallet runs. In a team, every run in the team |
| `member` | The member's `useruuid` from `/Team/Member/List` | One team member's runs in the team (team wallets only): their dashboard runs in the team workspace and every run made with the API key of a team project they created |
| `project` | The project's `id` from `/Project/List` | One API key: the runs made with that project's key |
| `surface` | `web`, `api`, `mcp`, `llm-gateway`, `extension` or `agent` | One way in (see Surfaces below) |
| `agent` | The agent's `guid` (its `useragentguid`) | One deployed agent: the models it runs through Wiro and the chat models it answers with |

### Surfaces

| Surface | Covers |
|---------|--------|
| `web` | The Wiro dashboard, including Studio and the Workflow Agent used there |
| `api` | Calls with an API key, including [`/sync`](/docs/run-a-model#run-sync) and the [Wiro MCP package](/docs/mcp-self-hosted) when you run it yourself |
| `mcp` | The hosted [Wiro MCP server](/docs/wiro-mcp-server) at `mcp.wiro.ai` |
| `llm-gateway` | The OpenAI and Anthropic compatible [LLM gateway](/docs/completions-api) at `llm.wiro.ai` |
| `extension` | Only the Wiro browser extensions |
| `agent` | Your deployed agents' own runs |

### Everything Else

Every rule has an Everything Else setting, `access`. It decides the models the rule names neither one by one nor by category:

- `allow` (the default): every model can run except the ones the rule blocks
- `block`: only the models and categories the rule allows can run

### Categories

A rule can allow or block whole categories of models. Each category groups catalog categories, the values models carry in their `categories` field on [`/Tool/List` and `/Tool/Detail`](/docs/models). A category also covers the models added to it later.

| `category` | Label | Catalog categories |
|------------|-------|--------------------|
| `image` | Image Generation | `text-to-image`, `image-to-image`, `image-editing`, `image-to-text` |
| `video` | Video Generation | `text-to-video`, `image-to-video`, `video-to-video`, `speech-to-video`, `talking-head`, `video-to-text`, `reference-to-video`, `audio-to-video`, `lip-sync` |
| `audio` | Audio & Speech | `text-to-speech`, `speech-to-text`, `speech-to-speech`, `video-to-music`, `voice-clone`, `text-to-audio`, `image-to-audio`, `realtime-conversation`, `realtime-tts`, `realtime-stt` |
| `music` | Music Generation | `music-generation`, `text-to-song`, `text-to-music`, `image-to-song`, `image-to-music` |
| `3d` | 3D Generation | `3d-generation`, `text-to-3d`, `image-to-3d` |
| `llm` | LLM & Chat | `chat`, `llm`, `partner-llm`, `rag`, `llm-reasoning` |
| `utilities` | Utilities | `utils` |

A model is in every category that one of its catalog categories belongs to, so it can be in more than one. A model whose catalog categories belong to none of them is decided by its own entry or by Everything Else. `/ModelAccess/List` returns this list, and `/ModelAccess/Check` shows the categories of one model.

### Single Models

A rule can also allow or block single models, named by their `owner/slug`, such as `openai/gpt-6-2-astra`, or by their `id`. A model's own entry comes before its categories, so a rule can block a category and still allow one model in it. A rule can name up to 500 models, and each must be a model listed on Wiro.

### How One Rule Decides

A rule decides a model in this order:

1. **The model**: when the rule names the model, that entry decides
2. **Its categories**: otherwise, when the rule names one or more of the model's categories, they decide. If one of them is blocked, the model is blocked, even when another one is allowed
3. **Everything Else**: otherwise the rule's `access` decides

For example, a rule with Everything Else set to `allow`, Video Generation blocked and `bytedance/seedance-v2-5-flash` allowed lets every model run except video models, and Seedance v2.5 Flash is the one video model it lets run.

### When Several Rules Apply

A run can meet several rules of its wallet: the whole account's, the member's in a team, the API key's, the surface's and the agent's. It goes ahead only when every rule that applies allows the model. A narrower rule can't open what a wider one blocks: when the account's rule blocks a model, an API key's rule that allows it does not let it run.

When more than one rule blocks the model, the refusal names the first of them in the order account, member, API key, surface, agent. `/ModelAccess/Check` shows how each rule decides a model.

### Where Rules Apply

Rules are checked before work starts:

- Model runs: `/Run` and its `/sync` wait, realtime sessions, the [LLM gateway](/docs/completions-api), the [MCP server](/docs/wiro-mcp-server), the browser extensions and the dashboard
- Workflow runs and resumes: every model step that will run must be allowed. Steps that will not run, such as the steps after a breakpoint, are not checked
- The models Studio runs for you, which follow your own rules like the runs you start yourself: the account's or the team's rule, your member rule in a team, the rule of the API key you sent the message with and the rule of the surface you sent it from. The chat of Studio and the Workflow Agent is not checked against the rules, but what it costs counts toward [spend limits](/docs/spend-limits)
- The models your deployed agents run through Wiro
- An agent's chat model: choosing one in the agent's settings, or sending `model` with `Message/Send`, follows that agent's own rule. If its rule blocks the model the agent already uses, its model calls are refused and the turn ends with `[MODEL_NOT_ALLOWED]`

A change applies to work that starts after it. Work that is already running is not stopped, and a deployed agent's chat model follows a change within about a minute. Browsing models is not affected: `/Tool/List`, `/Tool/Detail` and the LLM gateway's model list show the same models whatever the rules.

### When a Model Is Blocked

A run of a model that a rule blocks is refused with HTTP `200`, `result: false` and error code `92`, even when the wallet has money. The message names the rule:

```json
{
  "result": false,
  "errors": [
    {
      "code": 92,
      "message": "This API key can only use selected models, and openai/gpt-6-2-astra is not one of them. Model Access rules decide which models can run."
    }
  ]
}
```

The message also says what blocked the model:

| Blocked by | Example message |
|------------|-----------------|
| Everything Else | `This API key can only use selected models, and openai/gpt-6-2-astra is not one of them. Model Access rules decide which models can run.` |
| The model's own entry | `This API key can't use openai/gpt-6-2-astra. Model Access rules decide which models can run.` |
| One of the model's categories | `MCP can't use Video Generation models, and bytedance/seedance-v2-5-flash is one of them. Model Access rules decide which models can run.` |

| Rule | The message starts with |
|------|-------------------------|
| A personal account's `account` rule | `Your account` |
| A team's `account` rule | `This team` |
| `member` | `You`, with `in this team` after the model or category, for example `You can't use openai/gpt-6-2-astra in this team.` |
| `project` | `This API key` |
| `surface` | The surface's name: `The dashboard`, `The API`, `MCP`, `The LLM gateway`, `The browser extensions` or `Agents` |
| `agent` | `This agent` |

Nothing runs and nothing is charged. Retrying does not help: run a model the rules allow, or ask someone who manages the rule to change it. Through the [LLM gateway](/docs/completions-api#gateway-errors) the refusal is an HTTP `403` error with code `model_not_allowed`, and the [MCP server](/docs/wiro-mcp-server) returns it as a tool error.

### Who Can Change Rules

- **Personal account**: its owner
- **Team**: a team admin or the organization owner. The person who created the team is one of its admins

Every team member can read the team's rules with `/ModelAccess/List` and `/ModelAccess/Check`. A member who is not an admin can't change any rule: not their own member rule, and not the rules of the API keys they created or the agents they deployed. A deployed agent's own calls to the `/ModelAccess` endpoints are refused with HTTP `403`, reads included.

### Changing Rules With the API

`/ModelAccess/Set`, `/ModelAccess/Remove` and `/ModelAccess/Preview` work in the dashboard, with a signed-in user's Bearer token and with an API key:

- **With an API key**, the call acts as the person who created the key's project, in that project's workspace: the creator's personal account for a personal project, the team for a team project. The key of a project that a member who is not an admin created can read rules but not change them.
- **With a Bearer token**, the call acts as you, in your personal account. To work in a team, send the team's guid in the `x-team-guid` header. Calls with an API key ignore this header.

`/ModelAccess/List` and `/ModelAccess/Preview` return the `workspace` they work in, so you can check where a change lands before you make it. Changes made with API keys are limited to 60 per workspace per hour. Each change is recorded with who made it and how.

## **POST** /ModelAccess/List

Returns the Model Access rules of the call's workspace, the categories a rule can name, and how the call itself counts. A team project's API key reads its team, a personal project's key your personal account, and the dashboard the workspace you have selected (see [Changing Rules With the API](#changing-rules-with-the-api)). Any team member can call it, and it works with an API key. Send an empty body: `{}`.

```json
// Response
{
  "result": true,
  "errors": [],
  "workspace": {
    "type": "team",
    "teamguid": "0d9aade4-d31b-4b97-88f3-a90482f080ea",
    "canmanage": false
  },
  "caller": {
    "surface": "api",
    "projectid": "48211"
  },
  "rules": [
    {
      "guid": "a642eda4-68ef-4fa9-af15-7024f28b0332",
      "scope": "account",
      "target": "",
      "targetlabel": null,
      "access": "allow",
      "categories": [
        { "category": "video", "label": "Video Generation", "access": "block" }
      ],
      "models": [
        { "id": "2062", "model": "bytedance/seedance-v2-5-flash", "title": "Seedance v2.5 Flash Video Generator", "access": "allow" }
      ],
      "createdat": 1795180800,
      "updatedat": 1795180800
    },
    {
      "guid": "a4308936-5441-4012-96ee-f2b32ad3fd40",
      "scope": "project",
      "target": "48211",
      "targetlabel": "Production",
      "access": "block",
      "categories": [
        { "category": "image", "label": "Image Generation", "access": "allow" }
      ],
      "models": [],
      "createdat": 1795184400,
      "updatedat": 1795188000
    },
    {
      "guid": "9f12fb7e-16f0-4208-83b6-c333b83192d7",
      "scope": "surface",
      "target": "mcp",
      "targetlabel": "MCP",
      "access": "allow",
      "categories": [
        { "category": "video", "label": "Video Generation", "access": "block" }
      ],
      "models": [],
      "createdat": 1795191600,
      "updatedat": 1795191600
    }
  ],
  "categories": [
    { "category": "image", "label": "Image Generation", "values": ["text-to-image", "image-to-image", "image-editing", "image-to-text"] },
    { "category": "video", "label": "Video Generation", "values": ["text-to-video", "image-to-video", "video-to-video", "speech-to-video", "talking-head", "video-to-text", "reference-to-video", "audio-to-video", "lip-sync"] },
    { "category": "audio", "label": "Audio & Speech", "values": ["text-to-speech", "speech-to-text", "speech-to-speech", "video-to-music", "voice-clone", "text-to-audio", "image-to-audio", "realtime-conversation", "realtime-tts", "realtime-stt"] },
    { "category": "music", "label": "Music Generation", "values": ["music-generation", "text-to-song", "text-to-music", "image-to-song", "image-to-music"] },
    { "category": "3d", "label": "3D Generation", "values": ["3d-generation", "text-to-3d", "image-to-3d"] },
    { "category": "llm", "label": "LLM & Chat", "values": ["chat", "llm", "partner-llm", "rag", "llm-reasoning"] },
    { "category": "utilities", "label": "Utilities", "values": ["utils"] }
  ]
}
```

| Field | Description |
|-------|-------------|
| `workspace.type` | `team` or `personal` |
| `workspace.teamguid` | The team's guid, or `null` for a personal account |
| `workspace.canmanage` | Whether the caller can change rules in this workspace: `true` for a personal account's owner, a team admin and the organization owner, also with the API key of a project they created; `false` for other team members and their keys |
| `caller.surface` | The surface this call counts on, such as `api` for a call with an API key (see [Surfaces](#how-model-access-works)) |
| `caller.projectid` | The project id of the API key the call used, or `null` without a key |
| `rules[].guid` | The rule's guid, for `/ModelAccess/Remove` |
| `rules[].scope` | `account`, `member`, `project`, `surface` or `agent` |
| `rules[].target` | The member's `useruuid`, the project id, the surface or the agent's guid; `""` for `account` |
| `rules[].targetlabel` | The member's name, the project's name, the agent's title or the surface's label; `null` for `account` |
| `rules[].access` | Everything Else: `allow` or `block` |
| `rules[].categories` | The categories the rule names, each with its `label` and `access`, in the order of `categories` below |
| `rules[].models` | The models the rule names, in `id` order: `id` (a string), `model` (`owner/slug`), `title` and `access`. `model` and `title` are `null` for a model that is no longer on Wiro |
| `rules[].createdat`, `rules[].updatedat` | When the rule was added and last changed, in Unix seconds |
| `categories` | The seven categories a rule can name: `category` (the key a rule uses), `label` and `values` (the catalog categories it covers) |

## **POST** /ModelAccess/Set

Adds a rule to the call's workspace, or replaces the rule with the same `scope` and `target`. The rule you send replaces the old one as a whole, so a category or model you leave out is no longer named. Only the people who can change rules can call it (see [Who Can Change Rules](#who-can-change-rules)), in the dashboard, with a Bearer token or with an API key. To check a change first, send the same body to [`/ModelAccess/Preview`](#model-access-preview).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `scope` | string | Yes | `"account"`, `"member"`, `"project"`, `"surface"` or `"agent"`. See [What a Rule Covers](#how-model-access-works) |
| `target` | string | For every scope but `account` | The member's `useruuid`, the project's `id`, the surface (`web`, `api`, `mcp`, `llm-gateway`, `extension` or `agent`) or the agent's guid. Leave it out for `account` |
| `access` | string | No | Everything Else: `"allow"` or `"block"`. Default: `"allow"` |
| `categories` | array or object | No | The categories the rule allows or blocks, as `[{ "category": "video", "access": "block" }]` or as `{ "video": "block" }`. A category is `image`, `video`, `audio`, `music`, `3d`, `llm` or `utilities` |
| `models` | array or object | No | The single models the rule allows or blocks, as `[{ "model": "openai/gpt-6-2-astra", "access": "block" }]` or as `{ "openai/gpt-6-2-astra": "block" }`. Name a model by its `owner/slug` or its `id`. At most 500 models |

### Examples

**Block video models for the whole account, except one:**

```json
{
  "scope": "account",
  "access": "allow",
  "categories": [
    { "category": "video", "access": "block" }
  ],
  "models": [
    { "model": "bytedance/seedance-v2-5-flash", "access": "allow" }
  ]
}
```

**Let one API key run only image models:**

```json
{
  "scope": "project",
  "target": "48211",
  "access": "block",
  "categories": [
    { "category": "image", "access": "allow" }
  ]
}
```

**Keep video models out of MCP:**

```json
{
  "scope": "surface",
  "target": "mcp",
  "categories": { "video": "block" }
}
```

**Block one model for one agent:**

```json
{
  "scope": "agent",
  "target": "6e4bbd6f-6b73-4421-adae-e9599ba2e317",
  "models": { "openai/gpt-6-2-astra": "block" }
}
```

`rule` is the rule as saved, shaped like a row of `/ModelAccess/List`:

```json
// Response
{
  "result": true,
  "errors": [],
  "rule": {
    "guid": "a4308936-5441-4012-96ee-f2b32ad3fd40",
    "scope": "project",
    "target": "48211",
    "targetlabel": "Production",
    "access": "block",
    "categories": [
      { "category": "image", "label": "Image Generation", "access": "allow" }
    ],
    "models": [],
    "createdat": 1795184400,
    "updatedat": 1795188000
  }
}
```

### Errors

| Error | Cause |
|-------|-------|
| `scope must be one of account, member, project, surface, agent.` | `scope` is missing or not one of the five scopes |
| `Member rules exist only in a team workspace.` | A `member` rule in a personal account |
| `target is required for this scope.` | No `target` for a `member`, `project`, `surface` or `agent` rule |
| `A surface is one of web, api, mcp, llm-gateway, extension, agent.` | A `surface` rule with another `target` |
| `target must be a project id.` | A `project` rule whose `target` is not a project id |
| `access must be allow or block.` | Another `access` |
| `categories must be a list of { category, access }.` | `categories` is neither a list nor an object |
| `A category is one of image, video, audio, music, 3d, llm, utilities.` | A category that is not one of the seven |
| `A category's access must be allow or block.` | A category with another `access` |
| `models must be a list of { model, access }.` | `models` is neither a list nor an object |
| `A rule can name at most 500 models.` | More than 500 models |
| `Each model needs its owner/slug or id.` | A model entry with no model |
| `A model's access must be allow or block.` | A model with another `access` |
| `<model> is not a model's owner/slug or id.` | A model named neither by `owner/slug` nor by a number |
| `<model> is not a model on Wiro.` | No model listed on Wiro has that `owner/slug` or id |
| `<model> is named twice.` | `models` names a model twice: by the same name, or by its id and its `owner/slug` with a different `access` |
| `Only a team admin or the organization owner can change this rule.` | In a team, the caller is not a team admin or the organization owner. With an API key, the caller is the person who created the key's project |
| `That person is not an active member of this team.` | A `member` rule for someone who is not an active member of the team |
| `That API key's project is not in this workspace.` | A `project` rule for a project of another workspace |
| `That agent is not in this workspace.` | An `agent` rule for an agent of another workspace |

## **POST** /ModelAccess/Preview

Shows what `/ModelAccess/Set` would do, and changes nothing. It takes the same body as `/ModelAccess/Set` and checks it the same way, with the same errors, so only the people who can change rules can call it. Use it to see which workspace a change lands in, the rule as it would be saved and the rule it would replace. For an `agent` rule, it also says whether the rule would block the chat model the agent answers with.

### Example

**Let the Support Agent run only image models:**

```json
{
  "scope": "agent",
  "target": "6e4bbd6f-6b73-4421-adae-e9599ba2e317",
  "access": "block",
  "categories": [
    { "category": "image", "access": "allow" }
  ]
}
```

```json
// Response
{
  "result": true,
  "errors": [],
  "preview": true,
  "workspace": {
    "type": "team",
    "teamguid": "0d9aade4-d31b-4b97-88f3-a90482f080ea"
  },
  "rule": {
    "guid": "c2f0a9d4-5b7e-4c1a-8e36-9d4b2a7f1e05",
    "scope": "agent",
    "target": "6e4bbd6f-6b73-4421-adae-e9599ba2e317",
    "targetlabel": "Support Agent",
    "access": "block",
    "categories": [
      { "category": "image", "label": "Image Generation", "access": "allow" }
    ],
    "models": [],
    "createdat": 1795195200,
    "updatedat": 1795195200
  },
  "existing": {
    "guid": "c2f0a9d4-5b7e-4c1a-8e36-9d4b2a7f1e05",
    "scope": "agent",
    "target": "6e4bbd6f-6b73-4421-adae-e9599ba2e317",
    "targetlabel": "Support Agent",
    "access": "allow",
    "categories": [
      { "category": "video", "label": "Video Generation", "access": "block" }
    ],
    "models": [],
    "createdat": 1795195200,
    "updatedat": 1795195200
  },
  "agentchatmodel": {
    "ref": "openai/gpt-5.6-sol",
    "model": "openai/gpt-5-6-sol",
    "blocked": true
  }
}
```

| Field | Description |
|-------|-------------|
| `preview` | Always `true`: nothing was changed |
| `workspace` | The workspace the change would be made in: `type` and `teamguid`, as in `/ModelAccess/List` |
| `rule` | The rule as `/ModelAccess/Set` would save it, shaped like a row of `/ModelAccess/List` |
| `existing` | The current rule with the same `scope` and `target`, which the change would replace, or `null` when there is none |
| `agentchatmodel` | For an `agent` rule only: the chat model the agent answers with, as its settings name it (`ref`) and by its `owner/slug` on Wiro (`model`), and whether the rule would block it (`blocked`) |

When `agentchatmodel.blocked` is `true`, the agent stops answering once the rule is saved: its turns end with `[MODEL_NOT_ALLOWED]`. Allow its chat model in the rule too, or allow LLM & Chat. The errors are those of `/ModelAccess/Set`.

## **POST** /ModelAccess/Remove

Removes a rule from the call's workspace. The people who can change rules can remove one, in the dashboard, with a Bearer token or with an API key.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `guid` | string | Yes | The rule's `guid` from `/ModelAccess/List` |

```json
// Response
{
  "result": true,
  "errors": []
}
```

| Error | Cause |
|-------|-------|
| `guid is required.` | No `guid` was sent |
| `Rule not found in this workspace.` | The guid is not a rule of the call's workspace, or it was already removed |
| `Only a team admin or the organization owner can change this rule.` | In a team, the caller can't manage this rule |

## **POST** /ModelAccess/Check

Shows how the rules of the call's workspace decide one model for one run: which rules apply, what each one decides and why, and the refusal the run would get. Nothing runs. A team project's API key reads its team, a personal project's key your personal account, and the dashboard the workspace you have selected. Any team member can call it, and it works with an API key. With only `model`, it checks a dashboard run of yours.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `model` | string | Yes | The model's `owner/slug` or `id` |
| `member` | string | No | In a team, the `useruuid` of the member whose run to check. Default: you (with an API key, the person who created its project) |
| `project` | string | No | A project's `id`, to check a run made with that project's API key |
| `surface` | string | No | Where the run comes from: `web`, `api`, `mcp`, `llm-gateway`, `extension` or `agent`. Default: `web`. A run with an API key comes from `api` |
| `agent` | string | No | An agent's guid, to check a model run that agent makes. The surface is then `agent` |

### Example

**Can the Production API key run `openai/gpt-6-2-astra`?**

```json
{
  "model": "openai/gpt-6-2-astra",
  "project": "48211",
  "surface": "api"
}
```

Each applicable rule comes back shaped like a row of `/ModelAccess/List`, with what it decides:

```json
// Response
{
  "result": true,
  "errors": [],
  "check": {
    "model": "openai/gpt-6-2-astra",
    "categories": ["llm"],
    "allowed": false,
    "message": "This API key can only use selected models, and openai/gpt-6-2-astra is not one of them. Model Access rules decide which models can run.",
    "rules": [
      {
        "rule": {
          "guid": "a642eda4-68ef-4fa9-af15-7024f28b0332",
          "scope": "account",
          "target": "",
          "targetlabel": null,
          "access": "allow",
          "categories": [
            { "category": "video", "label": "Video Generation", "access": "block" }
          ],
          "models": [
            { "id": "2062", "model": "bytedance/seedance-v2-5-flash", "title": "Seedance v2.5 Flash Video Generator", "access": "allow" }
          ],
          "createdat": 1795180800,
          "updatedat": 1795180800
        },
        "access": "allow",
        "by": "default",
        "category": null
      },
      {
        "rule": {
          "guid": "a4308936-5441-4012-96ee-f2b32ad3fd40",
          "scope": "project",
          "target": "48211",
          "targetlabel": "Production",
          "access": "block",
          "categories": [
            { "category": "image", "label": "Image Generation", "access": "allow" }
          ],
          "models": [],
          "createdat": 1795184400,
          "updatedat": 1795188000
        },
        "access": "block",
        "by": "default",
        "category": null
      }
    ]
  }
}
```

| Field | Description |
|-------|-------------|
| `check.model` | The model as `owner/slug` |
| `check.categories` | The categories the model is in, such as `["llm"]`. Empty when it is in none |
| `check.allowed` | Whether every rule that applies allows the model |
| `check.message` | The refusal a run would get with code `92`, or `null` when the model is allowed |
| `check.rules` | The rules that apply, in the order account, member, API key, surface, agent. Empty when none applies |
| `check.rules[].rule` | The rule, shaped like a row of `/ModelAccess/List` |
| `check.rules[].access` | What this rule decides: `allow` or `block` |
| `check.rules[].by` | What decided it: `model` (the model's own entry), `category` (one of its categories) or `default` (Everything Else) |
| `check.rules[].category` | The category that decided it when `by` is `category`, else `null` |

| Error | Cause |
|-------|-------|
| `model is required.` | No `model` was sent |
| `<model> is not a model's owner/slug or id.` | `model` is neither an `owner/slug` nor a number |
| `<model> is not a model on Wiro.` | No model listed on Wiro has that `owner/slug` or id |
| `A surface is one of web, api, mcp, llm-gateway, extension, agent.` | Another `surface` |
