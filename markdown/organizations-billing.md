# Team Billing & Spending

Manage team wallets, set spend limits, control model access, and track usage across members.

## Team Wallets

Each team has its own wallet, independent of members' personal wallets. When a task runs in a team context, the cost is deducted from the team wallet — never from the individual member's personal wallet.

### Funding a Team Wallet

Team wallets are funded the same way as personal wallets, plus credit transfers:

- **Deposits** — add credit via the dashboard or API while in the team context
- **Coupons** — team admins and the owner can redeem coupon codes while in the team context (see Coupons below)
- **Auto-pay** — configure automatic deposits when the balance drops below a threshold. In a team workspace, only team admins and the organization owner can set up, change or turn off auto-pay for the team wallet. Other members can view the settings; if they try to change them, they get `Only team admins can perform this action`
- **Transfer Credit** — organization owners and team admins can move balance from their personal wallet or from another team they administer (see `/Team/TransferCredit` below)

To fund a team wallet, switch to the team workspace in the dashboard and open **Credit Balance**, then **Add to Credit Balance**, **Automatic Payment**, **Coupons** or **Transfer Credit**. All deposit and coupon operations target the active workspace.

### Checking the Balance

The team wallet balance is visible on the [Organization page](https://wiro.ai/panel/organization) next to each team, and on the **Credit Balance** page while the team workspace is selected. When calling `/Wallet/List` with a team project API key, this returns the team wallet balances instead of your personal wallet.

### Balance Checks and Concurrency

In team context, the pre-run balance check and the [concurrency limit](/docs/concurrency-limits) use the **team wallet**, not the member's personal wallet. The minimum balance needed to start a task is checked against the team balance. While the team balance is $250 or less, the team can run concurrent tasks equal to 10% of that balance (minimum 1), counted across all members, dashboard runs and team project API keys together. Tasks in your Personal workspace are counted separately against your personal balance.

## Spend Limits

Admins can set spend limits at two levels to control costs:

| Limit Type | Set by | Applies to | Effect when reached |
|-----------|--------|------------|---------------------|
| Team spend limit | Admin / Owner | Entire team | All tasks rejected for all members |
| Member spend limit | Admin / Owner | Individual member | Tasks rejected for that member only |

Both limits count **all-time** spending in the team. They are not monthly budgets and never reset; raise or remove the limit to let work continue. Limits are checked when a task or workflow starts, so a task that is already running finishes even if it takes spending past the limit.

A member's spending includes their dashboard runs in the team workspace and every run made with the API key of a team project they created.

Once spending is over a limit, new tasks fail with `Team spend limit has been reached` or `Your personal spend limit in this team has been reached`.

Each team also has a **budget alert threshold**: 50%, 80% (the default) or 90% of the team spend limit, set in **Team Settings** or with `budgetalertpct` on `/Team/Update`. When the team's total spending reaches it, every team admin gets one email. The alert is sent once and is re-armed whenever the team spend limit is saved (saving Team Settings, or sending `spendlimit` to `/Team/Update`), even if the value is unchanged. No alert is sent while the team has no spend limit. This gives you time to increase the limit or pause operations before tasks start failing.

Team-level limits are set in **Team Settings** or via `/Team/Update` (see below). Member-level limits are set on the team's **Members** page, or via `/Team/Member/UpdateRole` with `teammemberguid` (the member's `guid` from `/Team/Member/List`), `role` (required; send the member's current role to keep it) and `spendlimit`. Set `spendlimit` to `0` or `null` to remove a member limit.

## **POST** /Team/Update

Updates team settings, including model access controls, the team-level spend limit and the budget alert threshold. Only the organization owner and team admins can call it.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `teamguid` | string | Yes | Team guid |
| `name` | string | No | New team name |
| `description` | string | No | Team description |
| `spendlimit` | number | No | Team-level spend limit in USD. Set to `0` or `null` to remove. Sending it re-arms the budget alert. |
| `budgetalertpct` | number | No | Budget alert threshold as a percentage of `spendlimit`. The dashboard offers 50, 80 and 90. Default: `80` |
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

**Allowlist — only permit specific models:**

```json
{
  "teamguid": "your-team-guid",
  "modelaccess": "allowlist",
  "allowedmodelids": [598, 412, 305]
}
```

Team members can only run models 598, 412, and 305. All other models are blocked.

**Blocklist — block specific expensive models:**

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
- Workflow runs in the team context — the whole run is rejected before it starts if any model in it is restricted
- LLM gateway requests made with a team project's API key — the request fails with HTTP `403` `permission_error` and the message `This model is not available for your team`; a streamed Responses request ends with `response.failed` instead (see [Direct LLM Gateway errors](/docs/completions-api#gateway-errors) for each protocol's error format)

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

## **POST** /Team/Spending/Summary

Returns the team's all-time spending totals and a per-member breakdown. Any active team member can call it, and the response includes every active member's spending, spend limit, name and email. Anyone else gets `You must be a member of this team to perform this action`.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `teamguid` | string | Yes | Team guid |

```json
// Response
{
  "result": true,
  "errors": [],
  "teamtotal": 45.23,
  "playgroundTotal": 32.10,
  "apiTotal": 13.13,
  "spending": [
    {
      "memberguid": "7c1e2f4a-0b9d-4e3a-9f51-2d6c8a0b1e77",
      "useruuid": "3f5a9c20-6d41-4b8e-a1c7-5e9d0f2b4c61",
      "role": "admin",
      "spendlimit": 100.00,
      "spent": 12.50,
      "playgroundSpent": 8.30,
      "apiSpent": 4.20,
      "user": {
        "firstname": "Jane",
        "lastname": "Doe",
        "email": "jane@example.com",
        "avatar": null,
        "avatarinitials": "JD"
      }
    }
  ]
}
```

| Field | Description |
|-------|-------------|
| `teamtotal` | All-time spending on model runs billed to the team wallet |
| `playgroundTotal` | Part of `teamtotal` from dashboard (playground) runs |
| `apiTotal` | Part of `teamtotal` from project API key runs |
| `spending` | One entry per active member |
| `spending[].memberguid` | The member's team membership guid (used by `/Team/Member/UpdateRole`) |
| `spending[].spendlimit` | The member's spend limit in USD (`null` if not set) |
| `spending[].spent` | The member's all-time spending in the team |
| `spending[].playgroundSpent` | Dashboard part of `spent` |
| `spending[].apiSpent` | API key part of `spent`, from team projects the member created |

`spending` lists only current members, so it can add up to less than `teamtotal`. The team-level spend limit is not part of this response.

For project-level breakdown, call `/Project/UsageSummary` in team context. For time-series task execution data, call `/Task/Stat` in team context — both automatically filter by the active workspace.

## **POST** /Team/TransferCredit

Transfers credit between your personal wallet and team wallets. Useful for moving team budgets around or recovering personal funds. Only organization owners and team admins can transfer credit, and the same user must control both source and target workspaces.

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
- `gifted` — from coupon and checklist credits
- `store` — from marketplace store revenue
- `amount` — from regular deposits

Permissions:
- Personal to team: you must be admin/owner of the target team
- Team to personal: you must be admin/owner of the source team
- Team to team: you must be admin/owner of both teams

### How It Works

Transfers preserve the original deposit structure — expiry dates, coupon tracking, and store revenue are all maintained. Every source deposit or coupon that the transfer draws from becomes its own deposit on the target wallet, with the same type and its original expiry time.

**Consumption order (matches task billing):**

1. Tracked coupons (model-specific first, then universal, FIFO)
2. Untracked gifted (checklist rewards, pooled)
3. Store revenue
4. Regular amount (deposits)

**Expiry is preserved:** When you transfer $600 from a wallet containing a $500 coupon (30-day expiry) and a $500 deposit (365-day expiry), the target receives two separate deposits — $500 coupon and $100 deposit — each with its original expiry date.

### Transaction History

Both wallets receive audit transactions:
- Source: `TRANSFER OUT` with a description like "Transfer to Engineering (Acme Corp) - $100.00 (Coupons: $50.00 / Store: $0.00 / Deposits: $50.00)."
- Target: `TRANSFER IN` with a description like "Transfer from personal - $100.00 (Coupons: $50.00 / Store: $0.00 / Deposits: $50.00)."

These audit transactions do not affect balance calculations or expiry — they are for display only. The actual balance changes come from updated deposit amounts (source) and new deposit records (target).

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

- [Organizations & Teams Overview](/docs/organizations-overview) — Concepts and workspace hierarchy
- [Managing Teams](/docs/organizations-managing-teams) — Create organizations, invite members, manage roles
- [Team API Access](/docs/organizations-api-access) — How context works in API requests
- [Pricing](/docs/pricing) — General pricing information
