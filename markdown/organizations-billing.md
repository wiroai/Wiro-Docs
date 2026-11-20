# Team Billing & Spending

Manage team wallets, control model access, and track usage across members.

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

Spend limits are not a team setting: they work the same way for a personal account's wallet and for a team's wallet. In a team, the organization owner and team admins can cap the whole team, one member, one API key, a surface such as the LLM gateway, or one agent, per month or per day, on the [Spend Limits](https://wiro.ai/panel/wallet/limits) page of the dashboard or with the `/SpendLimit` endpoints. See [Spend Limits](/docs/spend-limits).

## Tracking Team Spending

What the team has spent this month or today, by member, API key, surface and agent, comes from [`/SpendLimit/Usage`](/docs/spend-limits#spend-limit-usage). For other breakdowns, `/Project/UsageSummary` gives usage per project and `/Task/Stat` gives time-series task execution data. Both filter by the active workspace.

## **POST** /Team/Update

Updates team settings, including model access controls. Only the organization owner and team admins can call it, and only while signed in: with an API key it fails with HTTP `401`. Spend limits are not team settings: set them with [`/SpendLimit/Set`](/docs/spend-limits#spend-limit-set).

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
