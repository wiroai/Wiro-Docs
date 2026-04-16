# Team Billing & Spending

Manage team wallets, set spend limits, control model access, and track usage across members.

## Team Wallets

Each team has its own wallet, independent of members' personal wallets. When a task runs in a team context, the cost is deducted from the team wallet — never from the individual member's personal wallet.

### Funding a Team Wallet

Team wallets are funded the same way as personal wallets:

- **Deposits** — add credit via the dashboard or API while in the team context
- **Coupons** — redeem coupon codes that are assigned to the team
- **Auto-pay** — configure automatic deposits when the balance drops below a threshold

To fund a team wallet, switch to the team context in the dashboard and navigate to **Wallet**. All deposit and coupon operations target the active workspace.

### Checking the Balance

The team wallet balance is visible on the [Organization page](https://wiro.ai/panel/organization) next to each team, and on the team's wallet page. When calling `/Wallet/List` with a team project API key, this returns the team wallet balances instead of your personal wallet.

## Spend Limits

Admins can set spend limits at two levels to control costs:

| Limit Type | Set by | Applies to | Effect when reached |
|-----------|--------|------------|---------------------|
| Team spend limit | Admin / Owner | Entire team | All tasks rejected for all members |
| Member spend limit | Admin / Owner | Individual member | Tasks rejected for that member only |

When a team's total spending reaches 80% of the team spend limit, admins receive an email alert. This gives you time to increase the limit or pause operations before tasks start failing.

Team-level limits are set via `/Team/Update` (see below). Member-level limits are set via `/Team/Member/UpdateRole` with the `spendlimit` parameter.

## **POST** /Team/Update

Updates team settings, including model access controls and team-level spend limit. Team admins can restrict which AI models team members are allowed to run by setting `modelaccess` to one of three modes.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `teamguid` | string | Yes | Team guid |
| `spendlimit` | number | No | Team-level spend limit in USD. Set to `0` or `null` to remove. |
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

Model access is checked at the `/Run` endpoint — when a team member submits a task using a team project API key. The check compares the requested model's ID against the team's access policy before the task is queued.

Access controls do **not** affect:
- Browsing the model catalog (`/Tool/List`, `/Tool/Detail`)
- Viewing model details and pricing
- Personal projects (only team context is restricted)

### Error Response

When a team member tries to run a restricted model, the Run endpoint returns an error and the task is not created:

```json
{
  "result": false,
  "errors": [
    {
      "code": 0,
      "message": "This model is not allowed in your team. Contact your team admin."
    }
  ]
}
```

## **POST** /Team/SpendingSummary

Returns team totals, your individual spending, and limit information. All team members can view the spending summary.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `teamguid` | string | Yes | Team guid |

```json
// Response
{
  "result": true,
  "teamTotal": 45.23,
  "playgroundTotal": 32.10,
  "apiTotal": 13.13,
  "memberSpent": {
    "total": 12.50,
    "playground": 8.30,
    "api": 4.20
  },
  "spendLimit": 500.00,
  "memberSpendLimit": 100.00
}
```

| Field | Description |
|-------|-------------|
| `teamTotal` | Total spending by the entire team |
| `playgroundTotal` | Spending from playground (dashboard) usage |
| `apiTotal` | Spending from API key usage (projects) |
| `memberSpent` | Your individual spending within the team |
| `spendLimit` | Team-level spend limit (null if not set) |
| `memberSpendLimit` | Your personal spend limit within the team (null if not set) |

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

Transfers preserve the original deposit structure — expiry dates, coupon tracking, and store revenue are all maintained. Each deposit type (coupon, store revenue, regular deposit) is transferred as a separate transaction on the target wallet with its original expiry time.

**Consumption order (matches task billing):**

1. Tracked coupons (model-specific first, then universal, FIFO)
2. Untracked gifted (checklist rewards, pooled)
3. Store revenue
4. Regular amount (deposits)

**Expiry is preserved:**

When you transfer $500 from a wallet containing a $500 coupon (30-day expiry) and $500 deposit (365-day expiry), the target wallet receives:
- `DEPOSIT (COUPON)` $500 with the original 30-day expiry
- (Nothing from the deposit, since coupon came first)

If you had transferred $600, the target would receive **two separate deposits** — $500 coupon and $100 deposit — each with its own expiry date.

### Transaction History

Both wallets receive audit transactions:
- Source: `TRANSFER OUT` transaction with description like "Transfer to Engineering Team"
- Target: `TRANSFER IN` transaction with description like "Transfer from Personal"

These audit transactions do not affect balance calculations or expiry — they are for display only. The actual balance changes come from updated deposit amounts (source) and new deposit records (target).

### Important Behaviors

- **Auto-pay may trigger:** If the source is your personal wallet and transferring reduces `wallet.amount` below your auto-pay threshold, Stripe may charge you automatically. The UI warns you before confirming.
- **Agent subscriptions may fail renewal:** If the source has active prepaid agent subscriptions, transferring too much can leave insufficient balance for renewal. Agents will expire on their renewal date.
- **Expired deposits are not transferred:** Only deposits with `expirytime > now` (and `expiryconfirmed = 0`) are eligible.
- **Partial transfers preserve FIFO:** When a deposit is partially transferred, its `amount` is reduced on the source. Expiry cron later sees the reduced amount and expires remaining unused credit correctly.

## Coupons

Coupons can be scoped to a specific team, a specific user, or available to everyone:

| Coupon Scope | Who can redeem | Wallet credited |
|-------------|---------------|-----------------|
| **Everyone** | Any user | The redeemer's active wallet (personal or team) |
| **Team** | Only members of the specified team | The team wallet |
| **User** | Only the specified user | The user's personal wallet |

When a team-scoped coupon is redeemed, the credit is added to the team wallet and benefits all team members.

## What's Next

- [Organizations & Teams Overview](/docs/organizations-overview) — Concepts and workspace hierarchy
- [Managing Teams](/docs/organizations-managing-teams) — Create organizations, invite members, manage roles
- [Team API Access](/docs/organizations-api-access) — How context works in API requests
- [Pricing](/docs/pricing) — General pricing information
