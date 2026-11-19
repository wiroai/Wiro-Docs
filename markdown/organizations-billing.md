# Team Billing & Spending

Manage team wallets, set spend limits for personal accounts and teams, control model access, and track usage across members.

## Team Wallets

Each team has its own wallet, independent of members' personal wallets. When a task runs in a team context, the cost is deducted from the team wallet, never from the individual member's personal wallet.

### Funding a Team Wallet

Team wallets are funded the same way as personal wallets, plus credit transfers:

- **Deposits**: add credit via the dashboard or API while in the team context
- **Coupons**: team admins and the owner can redeem coupon codes while in the team context (see Coupons below)
- **Auto-pay**: configure automatic deposits when the balance drops below a threshold. In a team workspace, only team admins and the organization owner can set up, change or turn off auto-pay for the team wallet. Other members can view the settings; if they try to change them, they get `Only team admins can perform this action`
- **Transfer Credit**: organization owners and team admins can move balance from their personal wallet or from another team they administer (see `/Team/TransferCredit` below)

To fund a team wallet, switch to the team workspace in the dashboard and open **Credit Balance**, then **Add to Credit Balance**, **Automatic Payment**, **Coupons** or **Transfer Credit**. All deposit and coupon operations target the active workspace.

### Checking the Balance

The team wallet balance is visible on the [Organization page](https://wiro.ai/panel/organization) next to each team, and on the **Credit Balance** page while the team workspace is selected. When calling `/Wallet/List` with a team project API key, this returns the team wallet balances instead of your personal wallet.

### Balance Checks and Concurrency

In team context, the pre-run balance check and the [concurrency limit](/docs/concurrency-limits) use the **team wallet**, not the member's personal wallet. The minimum balance needed to start a task is checked against the team balance. While the team balance is $250 or less, the team can run concurrent tasks equal to 10% of that balance (minimum 1), counted across all members, dashboard runs and team project API keys together. Tasks in your Personal workspace are counted separately against your personal balance.

## Spend Limits

A spend limit caps what a wallet can spend in a month or a day. Limits work the same way for a personal account's wallet and for a team's wallet. The limits of the workspace a call runs in apply: a team project's API key runs in its team, a personal project's key in your personal account, and the dashboard in the workspace you have selected.

Manage limits on the [Spend Limits](https://wiro.ai/panel/wallet/limits) page of the dashboard, for your personal account or for the team workspace you have selected, or with the `/SpendLimit` endpoints below. Team and member limits set before this system were moved into it as monthly limits of the same amount.

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
| `api` | the API | Calls with an API key |
| `mcp` | MCP | The [Wiro MCP server](/docs/wiro-mcp-server), hosted or the npm package |
| `llm-gateway` | the LLM gateway | The OpenAI and Anthropic compatible [LLM gateway](/docs/completions-api) |
| `extension` | the browser extensions | The Wiro browser extensions |
| `agent` | agents | Your deployed agents' own runs |

Studio and Workflow Agent messages count on the surface they were sent from. Refusal messages and `/SpendLimit/Usage` name a surface by its label.

### Periods and Amounts

A limit's `period` is `month` (the default), which resets on the 1st of each month at 00:00 UTC, or `day`, which resets every day at 00:00 UTC. `amountusd` is a positive amount in USD, rounded to cents. A scope and target can have one monthly limit and one daily limit.

### What Counts

Every charge to the wallet for usage counts: model runs, workflow runs, realtime sessions, Studio, the Workflow Agent, agent plans, upgrades and credit packs. Deposits are not spending.

### When Limits Are Checked

Limits are checked before work starts:

- Model runs, workflow runs and workflow resumes
- Studio and Workflow Agent messages
- An agent deploy, upgrade, renewal or credit pack purchase that a person starts
- Messages to an agent, against that agent's own limit

When the price of the work is known before it starts, as for fixed-price models and agent purchases, the work is refused if spending so far plus that price would go over the limit. Otherwise it is refused once spending has reached the limit.

Work that is already running finishes and is charged. A realtime session ends after the turn that uses up a limit, the same way it ends when the balance runs out. Automatic monthly renewals of running agents are never refused by a limit, but they still count toward it.

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

When the price of the work is known before it starts, the message says what is left instead, for example `This team's monthly spend limit has $3.10 left of $500.00, and this run costs $4.00. It resets on December 1, 2026 at 00:00 UTC.` A daily limit says `daily` instead of `monthly`, and its message ends with `It resets at 00:00 UTC.`

| Limit | The message starts with |
|-------|-------------------------|
| A personal account's `account` limit | `Your monthly spend limit` |
| A team's `account` limit | `This team's monthly spend limit` |
| `member` | `Your monthly spend limit in this team` |
| `project` | `This API key's monthly spend limit` |
| `surface` | `The monthly spend limit for` and the surface's label, for example `The monthly spend limit for the LLM gateway` |
| `agent` | `This agent's monthly spend limit` |

Nothing runs and nothing is charged. Retrying does not help until the limit resets or someone who manages it raises it. Through the [LLM gateway](/docs/completions-api#gateway-errors) the refusal is an HTTP `402` error with code `spend_limit_reached`, and the [MCP server](/docs/wiro-mcp-server) returns it as a tool error.

### Alert Emails

A limit sends an alert email when spending reaches its `alertpct`: 50, 80 (the default) or 90 percent of the limit, or `null` for no alert email. It sends a used-up email when the limit is reached. Each email goes out once per limit and period, and changing the limit re-arms both for the current period.

A personal account's limits email the account. A team's limits email the team's admins and the organization owner, and also the member a member limit is for, the person who created the API key a key limit is for, and the owner of the agent an agent limit is for.

### Who Can Change Limits

- **Personal account**: the account itself
- **Team**: the organization owner or a team admin. The owner of an agent can also set that agent's own limit

Any team member can read the team's limits and usage with `/SpendLimit/List` and `/SpendLimit/Usage`, which also work with an API key. `/SpendLimit/Set` and `/SpendLimit/Remove` work only while signed in, in the dashboard or with the user's Bearer token: with an API key they fail with HTTP `401`, so a key can never lift its own limit.

## **POST** /SpendLimit/List

Returns the spend limits of the call's workspace, each with what has been spent in its current period. A team project's API key reads its team, a personal project's key your personal account, and the dashboard the workspace you have selected. Any team member can call it, and it works with an API key. Send an empty body: `{}`.

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
      "spentusd": 248.7
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
      "spentusd": 88.2
    }
  ]
}
```

| Field | Description |
|-------|-------------|
| `workspace.type` | `team` or `personal` |
| `workspace.teamguid` | The team's guid, or `null` for a personal account |
| `workspace.canmanage` | Whether the caller can change limits in this workspace. The owner of an agent can still set that agent's own limit when it is `false` |
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
| `limits[].spentusd` | What has been spent in the current period, in USD |

## **POST** /SpendLimit/Set

Adds a spend limit to the call's workspace, or changes the existing limit with the same `scope`, `target` and `period`. Changing a limit re-arms its emails for the current period. In a team, only the organization owner or a team admin can call it, and the owner of an agent can set that agent's own limit. It works only while signed in, in the dashboard or with the user's Bearer token: with an API key it fails with HTTP `401`, so a key can never lift its own limit.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `scope` | string | Yes | `"account"`, `"member"`, `"project"`, `"surface"` or `"agent"`. See [Spend Limits](#spend-limits) |
| `target` | string | For every scope but `account` | The member's `useruuid`, the project's `id`, the surface (`web`, `api`, `mcp`, `llm-gateway`, `extension` or `agent`) or the agent's guid. Leave it out for `account` |
| `period` | string | No | `"month"` or `"day"`. Default: `"month"` |
| `amountusd` | number | Yes | The limit in USD, a positive number. Rounded to cents |
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
| `alertpct must be 50, 80 or 90, or null for no alert.` | Another `alertpct` |
| `Only a team admin or the organization owner can change this limit.` | In a team, the caller is not a team admin or the organization owner (or, for an `agent` limit, the agent's owner) |
| `That person is not an active member of this team.` | A `member` limit for someone who is not an active member of the team |
| `That API key's project is not in this workspace.` | A `project` limit for a project of another workspace |
| `That agent is not in this workspace.` | An `agent` limit for an agent of another workspace |

## **POST** /SpendLimit/Remove

Removes a spend limit from the call's workspace. The people who can set a limit can remove it, and only while signed in: with an API key it fails with HTTP `401`.

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
| `Only a team admin or the organization owner can change this limit.` | In a team, the caller can't manage this limit |

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
    "surfaces": [
      { "surface": "web", "label": "the dashboard", "spentusd": 40.1 },
      { "surface": "api", "label": "the API", "spentusd": 168.2 },
      { "surface": "mcp", "label": "MCP", "spentusd": 12.5 },
      { "surface": "llm-gateway", "label": "the LLM gateway", "spentusd": 7.9 },
      { "surface": "extension", "label": "the browser extensions", "spentusd": 0 },
      { "surface": "agent", "label": "agents", "spentusd": 20 }
    ],
    "members": [
      { "useruuid": "3f5a9c20-6d41-4b8e-a1c7-5e9d0f2b4c61", "label": "Jane Doe", "spentusd": 120.5 },
      { "useruuid": "7a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d", "label": "John Doe", "spentusd": 108.2 }
    ],
    "projects": [
      { "projectid": "48211", "label": "Production", "spentusd": 88.2 },
      { "projectid": "48377", "label": "Staging", "spentusd": 80 }
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
| `usage.surfaces` | One row per surface, always in the order `web`, `api`, `mcp`, `llm-gateway`, `extension`, `agent`, with its label |
| `usage.members` | Spending per team member, with the member's name as `label`. Empty for a personal account |
| `usage.projects` | Spending per API key, with the project's name as `label` |
| `usage.agents` | Spending per deployed agent, with the agent's title as `label` |

For other breakdowns, `/Project/UsageSummary` gives usage per project and `/Task/Stat` gives time-series task execution data. Both filter by the active workspace.

## **POST** /Team/Update

Updates team settings, including model access controls. Only the organization owner and team admins can call it, and only while signed in: with an API key it fails with HTTP `401`. Spend limits are not team settings: set them with [`/SpendLimit/Set`](#spend-limit-set).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `teamguid` | string | Yes | Team guid |
| `name` | string | No | New team name |
| `description` | string | No | Team description |
| `modelaccess` | string | No | Access mode: `"all"`, `"allowlist"`, or `"blocklist"`. Default: `"all"` |
| `allowedmodelids` | array | No | List of model IDs that are allowed. Used when `modelaccess` is `"allowlist"`. |
| `blockedmodelids` | array | No | List of model IDs that are blocked. Used when `modelaccess` is `"blocklist"`. |

### Access Modes

| Mode | `modelaccess` value | Behavior |
|------|---------------------|----------|
| **All Models** | `"all"` | No restrictions. Team members can run any model on Wiro. This is the default. |
| **Allowlist** | `"allowlist"` | Only models in `allowedmodelids` can be run. All others are blocked. |
| **Blocklist** | `"blocklist"` | Models in `blockedmodelids` cannot be run. All others are allowed. |

You configure one mode at a time. Setting `modelaccess` to `"allowlist"` ignores any `blockedmodelids`, and vice versa. Setting it back to `"all"` removes all restrictions regardless of the model ID lists.

Model IDs are the numeric IDs from the model catalog. You can get them from the [Models](/docs/models) endpoint or the dashboard.

### Examples

**Allowlist (only permit specific models):**

```json
{
  "teamguid": "your-team-guid",
  "modelaccess": "allowlist",
  "allowedmodelids": [598, 412, 305]
}
```

Team members can only run models 598, 412, and 305. All other models are blocked.

**Blocklist (block specific expensive models):**

```json
{
  "teamguid": "your-team-guid",
  "modelaccess": "blocklist",
  "blockedmodelids": [721, 650]
}
```

Team members can run any model except 721 and 650.

**Remove all restrictions:**

```json
{
  "teamguid": "your-team-guid",
  "modelaccess": "all"
}
```

### Where Access Controls Are Enforced

Model access is checked whenever a model runs in a team context, before the task is queued:

- `/Run` calls made with a team project's API key
- Runs started from the dashboard while the team workspace is selected
- Workflow runs in the team context: the whole run is rejected before it starts if any model in it is restricted
- LLM gateway requests made with a team project's API key: the request fails with HTTP `403` `permission_error` and the message `This model is not available for your team`; a streamed Responses request ends with `response.failed` instead (see [Direct LLM Gateway errors](/docs/completions-api#gateway-errors) for each protocol's error format)

The check compares the requested model's ID against the team's access policy.

Access controls do **not** affect:
- Browsing the model catalog (`/Tool/List`, `/Tool/Detail`)
- Viewing model details and pricing
- Personal projects and the Personal workspace (only team context is restricted)

### Error Response

When a team member tries to run a restricted model through `/Run`, the dashboard or a workflow, the request returns an error and no task is created:

```json
{
  "result": false,
  "errors": [
    {
      "code": 0,
      "message": "This model is not available for your team"
    }
  ]
}
```

## **POST** /Team/TransferCredit

Transfers credit between your personal wallet and team wallets. Useful for moving team budgets around or recovering personal funds. Only organization owners and team admins can transfer credit, and the same user must control both source and target workspaces. Transfers need a signed-in user: with an API key the call fails with HTTP `401`.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `amount` | number | Yes | Transfer amount in USD |
| `sourceteamguid` | string | No | Source team guid. Empty/omit for personal wallet |
| `targetteamguid` | string | No | Target team guid. Empty/omit for personal wallet |

```json
// Request (personal to team)
{
  "amount": 100,
  "sourceteamguid": "",
  "targetteamguid": "0d9aade4-d31b-4b97-88f3-a90482f080ea"
}
```

```json
// Response
{
  "result": true,
  "errors": [],
  "transferred": {
    "total": 100,
    "gifted": 50,
    "store": 0,
    "amount": 50
  }
}
```

The `transferred` object shows how the amount was split across pools:
- `gifted`: from coupon and checklist credits
- `store`: from marketplace store revenue
- `amount`: from regular deposits

Permissions:
- Personal to team: you must be admin/owner of the target team
- Team to personal: you must be admin/owner of the source team
- Team to team: you must be admin/owner of both teams

### How It Works

Transfers preserve the original deposit structure: expiry dates, coupon tracking, and store revenue are all maintained. Every source deposit or coupon that the transfer draws from becomes its own deposit on the target wallet, with the same type and its original expiry time.

**Consumption order (matches task billing):**

1. Coupons: model-specific coupons first, then other coupons, oldest first
2. Checklist rewards
3. Store revenue
4. Deposits

**Expiry is preserved:** When you transfer $600 from a wallet containing a $500 coupon (30-day expiry) and a $500 deposit (365-day expiry), the target receives two separate deposits, a $500 coupon and a $100 deposit, each with its original expiry date.

### Transaction History

Both wallets get a transaction row:
- Source: `TRANSFER OUT` with a description like "Transfer to Engineering (Acme Corp) - $100.00 (Coupons: $50.00 / Store: $0.00 / Deposits: $50.00)."
- Target: `TRANSFER IN` with a description like "Transfer from personal - $100.00 (Coupons: $50.00 / Store: $0.00 / Deposits: $50.00)."

`TRANSFER OUT` and `TRANSFER IN` rows record the transfer; moved credit keeps its original expiry.

### Important Behaviors

- **Auto-pay may trigger:** If the source wallet (personal or team) has auto-pay enabled and the transfer takes its deposited balance below the auto-pay threshold, the next auto-pay check charges the saved card. The confirmation dialog doesn't warn about this, so check the source's auto-pay settings before a large transfer.
- **Agent subscriptions may fail renewal:** If the source has active prepaid agent subscriptions, transferring too much can leave insufficient balance for renewal. Agents will expire on their renewal date.
- **Expired deposits are not transferred:** Only credit that hasn't expired yet can be moved.
- **Partial transfers preserve FIFO:** When a deposit is partially transferred, the rest stays on the source wallet with its original expiry date.

## Coupons

In a team workspace, only team admins and the organization owner can redeem coupons, and the credit goes to the team wallet. Other members get `Only team admins can perform this action`.

| Coupon Scope | Who can redeem | Wallet credited |
|-------------|---------------|-----------------|
| **Everyone** | Any user in Personal; team admins and the owner in a team workspace | The active workspace's wallet (personal or team) |
| **Team** | Team admins and the owner, with that team's workspace selected | The team wallet |
| **User** | Only the specified user, in their Personal workspace | The user's personal wallet |

A person can redeem a code once, whether personally or for a team, and each team can redeem it once. Redeeming a user-scoped coupon in a team workspace, or a team-scoped coupon outside its team, returns `Coupon not exists`.

## What's Next

- [Organizations & Teams Overview](/docs/organizations-overview): Concepts and workspace hierarchy
- [Managing Teams](/docs/organizations-managing-teams): Create organizations, invite members, manage roles
- [Team API Access](/docs/organizations-api-access): How context works in API requests
- [Pricing](/docs/pricing): General pricing information
