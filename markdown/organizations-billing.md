# Team Billing & Spending

Manage team wallets, transfer credit, and track usage across members.

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

Spend limits are not a team setting: they work the same way for a personal account's wallet and for a team's wallet. In a team, the organization owner and team admins can cap the whole team, one member, one API key, a surface such as the LLM gateway, or one agent, per month or per day, under [Controls > Spend Limits](https://wiro.ai/panel/controls/spend-limits) in the dashboard or with the `/SpendLimit` endpoints, signed in or with the API key of a project they created. Other members can see the team's limits but can't change them, their own member limit included. See [Spend Limits](/docs/spend-limits).

## Tracking Team Spending

What the team has spent this month or today, by member, API key, surface and agent, comes from [`/SpendLimit/Usage`](/docs/spend-limits#spend-limit-usage). For other breakdowns, `/Project/UsageSummary` gives usage per project and `/Task/Stat` gives time-series task execution data. Both filter by the active workspace.

## Model Access

Model Access is not a team setting: it works the same way for a personal account's wallet and for a team's wallet. In a team, the organization owner and team admins can allow or block single models and whole categories, such as video generation, for the whole team, one member, one API key, a surface such as the LLM gateway, or one agent, under [Controls > Model Access](https://wiro.ai/panel/controls/model-access) in the dashboard or with the `/ModelAccess` endpoints, signed in or with the API key of a project they created. Other members can see the team's rules but can't change them. A model a rule blocks is refused with error code `92`. See [Model Access](/docs/model-access).

## **POST** /Team/Update

Updates a team's name and description. Only the organization owner and team admins can call it, and only while signed in: with an API key it fails with HTTP `401`. Spend limits and Model Access rules are not team settings: set them with [`/SpendLimit/Set`](/docs/spend-limits#spend-limit-set) and [`/ModelAccess/Set`](/docs/model-access#model-access-set).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `teamguid` | string | Yes | Team guid |
| `name` | string | No | New team name |
| `description` | string | No | Team description |

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
