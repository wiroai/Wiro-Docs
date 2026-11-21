# Spend Limits

Cap what a personal account or a team can spend in a month or a day: the whole wallet, one team member, one API key, a surface such as the LLM gateway, or one agent.

## How Spend Limits Work

A spend limit caps what a wallet can spend in a month or a day. Limits work the same way for a personal account's wallet and for a team's wallet. The limits of the workspace a call runs in apply: a team project's API key runs in its team, a personal project's key in your personal account, and the dashboard in the workspace you have selected.

Manage limits in the dashboard under [Controls > Spend Limits](https://wiro.ai/panel/controls/spend-limits), for your personal account or for the team workspace you have selected, or with the `/SpendLimit` endpoints below. Team and member limits set before this system were moved into it as monthly limits of the same amount.

### What a Limit Caps

Each limit caps one scope of the wallet's spending:

| Scope | `target` | What it caps |
|-------|----------|--------------|
| `account` | None | The whole wallet. In a team, the whole team's spending |
| `member` | The member's `useruuid` from `/Team/Member/List` | One team member's spending in the team (team wallets only). A member's spending includes their dashboard runs in the team workspace and every run made with the API key of a team project they created |
| `project` | The project's `id` from `/Project/List` | One API key: what is spent with that project's key |
| `surface` | `web`, `api`, `mcp`, `llm-gateway`, `extension` or `agent` | One way in (see Surfaces below) |
| `agent` | The agent's `guid` (its `useragentguid`) | One deployed agent: what the agent itself spends, its own model runs and the credits its replies use (100 credits = $1). Its plan, upgrades and credit packs count toward the wallet's other limits, not this one |

### Surfaces

| Surface | Label | Covers |
|---------|-------|--------|
| `web` | the dashboard | The Wiro dashboard, including Studio and the Workflow Agent used there |
| `api` | the API | Calls with an API key, including [`/sync`](/docs/run-a-model#run-sync) and the [Wiro MCP package](/docs/mcp-self-hosted) when you run it yourself |
| `mcp` | MCP | The hosted [Wiro MCP server](/docs/wiro-mcp-server) at `mcp.wiro.ai` |
| `llm-gateway` | the LLM gateway | The OpenAI and Anthropic compatible [LLM gateway](/docs/completions-api) at `llm.wiro.ai` |
| `extension` | the browser extensions | Only the Wiro browser extensions |
| `agent` | agents | Your deployed agents' own runs |

Studio and Workflow Agent messages count on the surface they were sent from. Refusal messages and `/SpendLimit/Usage` name a surface by its label.

### Periods and Amounts

A limit's `period` is `month` (the default), which resets on the 1st of each month at 00:00 UTC, or `day`, which resets every day at 00:00 UTC. A scope and target can have one monthly limit and one daily limit.

`amountusd` is the limit in USD, rounded to cents. Once rounded, it must be at least `0.01`. A limit counts everything spent in its current period, also what was spent before the limit was added, so a new limit below that amount is used up at once.

### What Counts

Every charge to the wallet for usage counts: model runs, workflow runs, realtime sessions, Studio, the Workflow Agent, agent plans, upgrades and credit packs. Deposits are not spending.

The models Studio runs for you are checked and counted like the runs you start yourself: against the account's or the team's limits, your member limit in a team, the limit of the API key you sent the message with and the limit of the surface you sent it from. What the chat of Studio and the Workflow Agent costs counts toward your limits too.

### When Limits Are Checked

Limits are checked before work starts:

- Model runs, workflow runs and workflow resumes, and each step of a workflow run before the step starts
- Studio and Workflow Agent messages, and the models Studio runs for you
- An agent deploy, upgrade, renewal or credit pack purchase that a person starts
- Messages to an agent, against that agent's own limit

When the price of the work is known before it starts, as for fixed-price models, workflow runs and agent purchases, the work is refused if spending so far, plus what work in progress holds, plus that price would go over the limit. Otherwise it is refused once the limit has no room left.

Work that is already running finishes and is charged, with two exceptions. A realtime session, an agent's voice call included, ends after the turn that uses up a limit, the same way it ends when the balance runs out: its clients get a `task_session_stopped` event with `reason` `spend_limit`, code `93` and the refusal `/Run` would give (see [Realtime Voice](/docs/realtime-voice-conversation#realtime-end-session)), and a caller on the phone hears a short notice before the call ends. An agent whose own limit is used up pauses at its next model call, even in the middle of a reply (see below).

Automatic monthly renewals of running agents are never refused by a limit. They count toward the account's limit and, in a team, toward the limit of the member who started the plan, never toward a surface, API key or agent limit.

### Work in Progress

A run that starts holds its expected price against every limit that covers it, until it is charged or ends. The next check counts what is held, so runs started at the same time can pass a limit by one run at most. A run whose price is not known before it starts goes ahead while the limit has room. Refusal messages show what is held, and so does `heldusd` on the limits of `/SpendLimit/List` and in `/SpendLimit/Usage`.

### When a Limit Is Reached

New work the limit covers is refused with HTTP `200`, `result: false` and error code `93`. The message names the limit and says when it resets:

```json
{
  "result": false,
  "errors": [
    {
      "code": 93,
      "message": "This API key's monthly spend limit is reached ($50.20 of $50.00). It resets on December 1, 2026 at 00:00 UTC."
    }
  ]
}
```

When the price of the work is known before it starts, the message says what is left instead, for example `This team's monthly spend limit has $3.10 left of $500.00, and this run costs $4.00. It resets on December 1, 2026 at 00:00 UTC.` A daily limit says `daily` instead of `monthly`, and its message ends with `It resets at 00:00 UTC.` When work in progress holds part of the limit, the message also says how much.

| Limit | The message starts with |
|-------|-------------------------|
| A personal account's `account` limit | `Your monthly spend limit` |
| A team's `account` limit | `This team's monthly spend limit` |
| `member` | `Your monthly spend limit in this team` |
| `project` | `This API key's monthly spend limit` |
| `surface` | `The monthly spend limit for` and the surface's label, for example `The monthly spend limit for the LLM gateway` |
| `agent` | `This agent's monthly spend limit` |

Nothing runs and nothing is charged. Retrying does not help until the limit resets or someone who manages it raises it. Through the [LLM gateway](/docs/completions-api#gateway-errors) the refusal is an HTTP `402` error with code `spend_limit_reached`, and the [MCP server](/docs/wiro-mcp-server) returns it as a tool error.

When an agent's own limit is used up, the agent pauses. A turn that is running stops at its next model call (see [Failed turns](/docs/agent-messaging#failed-turns)), new messages to the agent are refused, and its Scheduled Tasks are paused rather than failed. In Telegram, Slack and Discord it tells people so in a plain sentence, with the time the limit resets when that is known. Once the limit resets, is raised or is removed, the agent answers again and each Scheduled Task runs at its next scheduled time, with no restart.

### Alert Emails

A limit sends an alert email when spending reaches its `alertpct`: 50, 80 (the default) or 90 percent of the limit, or `null` for no alert email. It sends a used-up email when the limit is reached. Each email goes out once per limit and period, and changing the limit re-arms both for the current period. The emails link to the Spend Limits page of the workspace the limit belongs to.

A personal account's limits email the account. A team's limits email the team's admins and the organization owner, and also the member a member limit is for, the person who created the API key a key limit is for, and the owner of the agent an agent limit is for.

### Who Can Change Limits

- **Personal account**: its owner
- **Team**: a team admin or the organization owner. The person who created the team is one of its admins

Every team member can read the team's limits and spending with `/SpendLimit/List` and `/SpendLimit/Usage`. A member who is not an admin can't change any limit: not their own member limit, and not the limits of the API keys they created or the agents they deployed. A deployed agent's own calls to the `/SpendLimit` endpoints are refused with HTTP `403`, reads included.

### Changing Limits With the API

`/SpendLimit/Set`, `/SpendLimit/Remove` and `/SpendLimit/Preview` work in the dashboard, with a signed-in user's Bearer token and with an API key:

- **With an API key**, the call acts as the person who created the key's project, in that project's workspace: the creator's personal account for a personal project, the team for a team project. The key follows its creator's current role: while the creator is a team member who is not an admin, the key can read limits but not change them.
- **With a Bearer token**, the call acts as you, in your personal account. To work in a team, send the team's guid in the `x-team-guid` header. A call whose `x-team-guid` names a team you are not a member of, and whose organization you don't own, is refused with `You are not a member of this team.` Calls with an API key ignore this header.

`/SpendLimit/List` and `/SpendLimit/Preview` return the `workspace` they work in, so you can check where a change lands before you make it. Changes made with API keys are limited to 60 per workspace in any hour, counting spend limits and Model Access rules together. Preview does not count. Each change is recorded with who made it and how.

## **POST** /SpendLimit/List

Returns the spend limits of the call's workspace, each with what has been spent in its current period, and how the call itself counts. A team project's API key reads its team, a personal project's key your personal account, and the dashboard the workspace you have selected (see [Changing Limits With the API](#changing-limits-with-the-api)). Any team member can call it, and it works with an API key. Send an empty body: `{}`.

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
  "limits": [
    {
      "guid": "e93fc393-aedd-4828-a6be-fbc2853d3202",
      "scope": "account",
      "target": "",
      "targetlabel": null,
      "period": "month",
      "amountusd": 500,
      "alertpct": 90,
      "periodstart": 1793491200,
      "resetsat": 1796083200,
      "createdat": 1793805600,
      "updatedat": 1793805600,
      "updatedby": { "useruuid": "c1d2e3f4-a5b6-4c7d-8e9f-0a1b2c3d4e5f", "label": "the organization owner" },
      "spentusd": 248.7,
      "heldusd": 3.5
    },
    {
      "guid": "f4134ddb-e837-44a9-9b36-0af44241f3ef",
      "scope": "member",
      "target": "3f5a9c20-6d41-4b8e-a1c7-5e9d0f2b4c61",
      "targetlabel": "Jane Doe",
      "period": "month",
      "amountusd": 150,
      "alertpct": 80,
      "periodstart": 1793491200,
      "resetsat": 1796083200,
      "createdat": 1793805600,
      "updatedat": 1793805600,
      "updatedby": null,
      "spentusd": 120.5
    },
    {
      "guid": "15be7fb3-c602-4ff1-a3f1-3afaa3996974",
      "scope": "project",
      "target": "48211",
      "targetlabel": "Production",
      "period": "month",
      "amountusd": 100,
      "alertpct": 80,
      "periodstart": 1793491200,
      "resetsat": 1796083200,
      "createdat": 1794474300,
      "updatedat": 1794474300,
      "updatedby": { "useruuid": "7a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d", "label": "John Doe" },
      "spentusd": 88.2
    }
  ]
}
```

| Field | Description |
|-------|-------------|
| `workspace.type` | `team` or `personal` |
| `workspace.teamguid` | The team's guid, or `null` for a personal account |
| `workspace.canmanage` | Whether the caller can change limits in this workspace: `true` for a personal account's owner, a team admin and the organization owner, also with the API key of a project they created; `false` for other team members and their keys |
| `caller.surface` | The surface this call counts on, such as `api` for a call with an API key (see [Surfaces](#how-spend-limits-work)) |
| `caller.projectid` | The project id of the API key the call used, or `null` without a key |
| `limits[].guid` | The limit's guid, for `/SpendLimit/Remove` |
| `limits[].scope` | `account`, `member`, `project`, `surface` or `agent` |
| `limits[].target` | The member's `useruuid`, the project id, the surface or the agent's guid; `""` for `account` |
| `limits[].targetlabel` | The member's name, the project's name, the agent's title or the surface's label; `null` for `account` |
| `limits[].period` | `month` or `day` |
| `limits[].amountusd` | The limit in USD |
| `limits[].alertpct` | `50`, `80` or `90`, or `null` for no alert email |
| `limits[].periodstart` | Start of the current period, in Unix seconds |
| `limits[].resetsat` | When the current period ends and the limit resets, in Unix seconds |
| `limits[].createdat`, `limits[].updatedat` | When the limit was added and last changed, in Unix seconds |
| `limits[].updatedby` | Who changed the limit last: `useruuid` and `label`, the person's name, or their email when they have no name. In a team, the owner of its organization who is not a member of the team is labeled `the organization owner`, and someone who has left the team has a `null` label. A change made with an API key names the person who created the key's project. `updatedby` is `null` when Wiro changed the limit last, as for the team and member limits moved into this system |
| `limits[].spentusd` | What has been spent in the current period, in USD |
| `limits[].heldusd` | When work in progress holds part of the limit: how much it holds, in USD (see [Work in Progress](#work-in-progress)) |

## **POST** /SpendLimit/Set

Adds a spend limit to the call's workspace, or changes the existing limit with the same `scope`, `target` and `period`. Changing a limit re-arms its emails for the current period. Only the people who can change limits can call it (see [Who Can Change Limits](#who-can-change-limits)), in the dashboard, with a Bearer token or with an API key. To check a change first, send the same body to [`/SpendLimit/Preview`](#spend-limit-preview).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `scope` | string | Yes | `"account"`, `"member"`, `"project"`, `"surface"` or `"agent"`. See [Spend Limits](#how-spend-limits-work) |
| `target` | string | For every scope but `account` | The member's `useruuid`, the project's `id`, the surface (`web`, `api`, `mcp`, `llm-gateway`, `extension` or `agent`) or the agent's guid. Leave it out for `account` |
| `period` | string | No | `"month"` or `"day"`. Default: `"month"` |
| `amountusd` | number | Yes | The limit in USD, rounded to cents. Once rounded, it must be at least `0.01` |
| `alertpct` | number | No | When the alert email goes out: `50`, `80` or `90` percent of the limit, or `null` for no alert email. Default: `80` |

### Examples

**Cap the whole wallet at $500 a month, with the alert at 90%:**

```json
{
  "scope": "account",
  "amountusd": 500,
  "alertpct": 90
}
```

**Cap one API key at $100 a month:**

```json
{
  "scope": "project",
  "target": "48211",
  "period": "month",
  "amountusd": 100
}
```

**Cap the LLM gateway at $25 a day, with no alert email:**

```json
{
  "scope": "surface",
  "target": "llm-gateway",
  "period": "day",
  "amountusd": 25,
  "alertpct": null
}
```

`limit` is the limit as saved, shaped like a row of `/SpendLimit/List`:

```json
// Response
{
  "result": true,
  "errors": [],
  "limit": {
    "guid": "15be7fb3-c602-4ff1-a3f1-3afaa3996974",
    "scope": "project",
    "target": "48211",
    "targetlabel": "Production",
    "period": "month",
    "amountusd": 100,
    "alertpct": 80,
    "periodstart": 1793491200,
    "resetsat": 1796083200,
    "createdat": 1794474300,
    "updatedat": 1794474300,
    "updatedby": { "useruuid": "7a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d", "label": "John Doe" },
    "spentusd": 61.4
  }
}
```

### Errors

| Error | Cause |
|-------|-------|
| `scope must be one of account, member, project, surface, agent.` | `scope` is missing or not one of the five scopes |
| `Member limits exist only in a team workspace.` | A `member` limit in a personal account |
| `target is required for this scope.` | No `target` for a `member`, `project`, `surface` or `agent` limit |
| `A surface is one of web, api, mcp, llm-gateway, extension, agent.` | A `surface` limit with another `target` |
| `target must be a project id.` | A `project` limit whose `target` is not a project id |
| `period must be month or day.` | Another `period` |
| `amountusd must be a positive number.` | `amountusd` is missing, zero or negative |
| `amountusd is too large.` | `amountusd` is over 10,000,000 |
| `amountusd must be at least 0.01.` | `amountusd` is above zero but rounds to less than one cent |
| `alertpct must be 50, 80 or 90, or null for no alert.` | Another `alertpct` |
| `You are not a member of this team.` | With a Bearer token, `x-team-guid` names a team you are not a member of, and whose organization you don't own |
| `Only a team admin or the organization owner can change this limit.` | In a team, a signed-in caller is not a team admin or the organization owner |
| `This API key acts as the person who created it, who is a member of this team. Only a team admin or the organization owner can change this limit.` | With an API key, the person who created the key's project is a team member who is not an admin |
| `That person is not an active member of this team.` | A `member` limit for someone who is not an active member of the team |
| `That API key's project is not in this workspace.` | A `project` limit for a project of another workspace |
| `That agent is not in this workspace.` | An `agent` limit for an agent of another workspace |
| `Too many changes to Spend Limits and Model Access in the last hour. Try again later.` | With API keys, this workspace's spend limits and Model Access rules have been changed 60 times in the last hour |

## **POST** /SpendLimit/Preview

Shows what `/SpendLimit/Set` would do, and changes nothing. It takes the same body as `/SpendLimit/Set` and checks it the same way, so only the people who can change limits can call it. Use it to see which workspace a change lands in, the limit as it would be saved and the limit it would replace.

### Example

**Raise the Production API key's monthly limit to $150:**

```json
{
  "scope": "project",
  "target": "48211",
  "period": "month",
  "amountusd": 150
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
    "teamguid": "0d9aade4-d31b-4b97-88f3-a90482f080ea",
    "canmanage": true
  },
  "limit": {
    "guid": "15be7fb3-c602-4ff1-a3f1-3afaa3996974",
    "scope": "project",
    "target": "48211",
    "targetlabel": "Production",
    "period": "month",
    "amountusd": 150,
    "alertpct": 80,
    "periodstart": 1793491200,
    "resetsat": 1796083200,
    "createdat": 1794474300,
    "updatedat": null,
    "updatedby": null,
    "spentusd": 88.2
  },
  "existing": {
    "guid": "15be7fb3-c602-4ff1-a3f1-3afaa3996974",
    "scope": "project",
    "target": "48211",
    "targetlabel": "Production",
    "period": "month",
    "amountusd": 100,
    "alertpct": 80,
    "periodstart": 1793491200,
    "resetsat": 1796083200,
    "createdat": 1794474300,
    "updatedat": 1794474300,
    "updatedby": { "useruuid": "7a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d", "label": "John Doe" },
    "spentusd": 88.2
  }
}
```

| Field | Description |
|-------|-------------|
| `preview` | Always `true`: nothing was changed |
| `workspace` | The workspace the change would be made in, as in `/SpendLimit/List`: `type`, `teamguid` and `canmanage`, which is always `true` here |
| `limit` | The limit as `/SpendLimit/Set` would save it, shaped like a row of `/SpendLimit/List`, with what has been spent in its current period. Its `guid` and `createdat` are those of the limit it would replace, or `null` for a new limit, and its `updatedat` and `updatedby` are `null` |
| `existing` | The current limit with the same `scope`, `target` and `period`, which the change would replace, or `null` when there is none |

When `limit.spentusd` is already at or above the new amount, the limit is used up as soon as it is saved. The errors are those of `/SpendLimit/Set`, except that Preview does not count toward the hourly cap on changes made with API keys.

## **POST** /SpendLimit/Remove

Removes a spend limit from the call's workspace. The people who can change limits can remove one, in the dashboard, with a Bearer token or with an API key.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `guid` | string | Yes | The limit's `guid` from `/SpendLimit/List` |

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
| `Limit not found in this workspace.` | The guid is not a limit of the call's workspace, or it was already removed |
| `You are not a member of this team.` | With a Bearer token, `x-team-guid` names a team you are not a member of, and whose organization you don't own |
| `Only a team admin or the organization owner can change this limit.` | In a team, a signed-in caller is not a team admin or the organization owner |
| `This API key acts as the person who created it, who is a member of this team. Only a team admin or the organization owner can change this limit.` | With an API key, the person who created the key's project is a team member who is not an admin |
| `Too many changes to Spend Limits and Model Access in the last hour. Try again later.` | With API keys, this workspace's spend limits and Model Access rules have been changed 60 times in the last hour |

## **POST** /SpendLimit/Usage

Returns what the call's workspace has spent this month or today, in total and by surface, member, API key and agent. A team project's API key reads its team, a personal project's key your personal account, and the dashboard the workspace you have selected. Any team member can call it, and it works with an API key.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `period` | string | No | `"month"` or `"day"`. Default: `"month"` |

```json
// Response
{
  "result": true,
  "errors": [],
  "usage": {
    "period": "month",
    "periodstart": 1793491200,
    "resetsat": 1796083200,
    "totalusd": 248.7,
    "heldusd": 3.5,
    "surfaces": [
      { "surface": "web", "label": "the dashboard", "spentusd": 40.1 },
      { "surface": "api", "label": "the API", "spentusd": 168.2, "heldusd": 3.5 },
      { "surface": "mcp", "label": "MCP", "spentusd": 12.5 },
      { "surface": "llm-gateway", "label": "the LLM gateway", "spentusd": 7.9 },
      { "surface": "extension", "label": "the browser extensions", "spentusd": 0 },
      { "surface": "agent", "label": "agents", "spentusd": 20 }
    ],
    "members": [
      { "useruuid": "3f5a9c20-6d41-4b8e-a1c7-5e9d0f2b4c61", "label": "Jane Doe", "spentusd": 120.5 },
      { "useruuid": "7a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d", "label": "John Doe", "spentusd": 108.2, "heldusd": 3.5 }
    ],
    "projects": [
      { "projectid": "48211", "label": "Production", "spentusd": 88.2 },
      { "projectid": "48377", "label": "Staging", "spentusd": 80, "heldusd": 3.5 }
    ],
    "agents": [
      { "useragentguid": "6e4bbd6f-6b73-4421-adae-e9599ba2e317", "label": "Support Agent", "spentusd": 20 }
    ]
  }
}
```

| Field | Description |
|-------|-------------|
| `usage.period` | `month` or `day` |
| `usage.periodstart`, `usage.resetsat` | Start and end of the period, in Unix seconds |
| `usage.totalusd` | What the wallet has spent in the period, in USD |
| `usage.heldusd` | What work in progress holds, in USD. Present only when it holds something (see [Work in Progress](#work-in-progress)) |
| `usage.surfaces` | One row per surface, always in the order `web`, `api`, `mcp`, `llm-gateway`, `extension`, `agent`, with its label |
| `usage.members` | Spending per team member, with the member's name as `label`. Empty for a personal account |
| `usage.projects` | Spending per API key, with the project's name as `label` |
| `usage.agents` | Spending per deployed agent, with the agent's title as `label` |
| `heldusd` in a row of `usage.surfaces`, `usage.members`, `usage.projects` or `usage.agents` | What work in progress holds for that row, present only when it holds something. A member, API key or agent whose only spending so far is held work is listed with `spentusd` `0` |

An agent plan's automatic renewal counts in `totalusd` and, in a team, in the row of the member who started the plan, but in no row of `usage.surfaces`, `usage.projects` or `usage.agents`, so those rows can add up to less than `totalusd`.

For other breakdowns, `/Project/UsageSummary` gives usage per project and `/Task/Stat` gives time-series task execution data. Both filter by the active workspace.
