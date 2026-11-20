# Team API Access

How workspace context is resolved in API requests, and how access controls protect cross-context operations.

## Context Resolution

Every authenticated API request resolves to a workspace context: either **personal** or a specific **team**. When you authenticate with a project API key (`x-api-key`), the context is determined **automatically** by the project's assignment:

- If the project belongs to a team → team context is activated
- If the project is personal → personal context is activated

You do not need to send any additional headers. Team headers are ignored on API key requests, so a key always works in its own project's workspace. To work in another workspace, use a key from a project in that workspace. In the dashboard, requests use the workspace you pick with **Switch Workspace**.

```bash
# This project is assigned to a team — team context is automatic
curl -X POST "https://api.wiro.ai/v1/Run/google/nano-banana" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_TEAM_PROJECT_API_KEY" \
  -d '{"prompt": "Hello"}'
```

```bash
# This project is personal — personal context is automatic
curl -X POST "https://api.wiro.ai/v1/Run/google/nano-banana" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_PERSONAL_API_KEY" \
  -d '{"prompt": "Hello"}'
```

These examples use API-key-only authentication. For projects that use signature authentication, also send `x-nonce` and `x-signature` (see [Authentication](/docs/authentication)).

Create a project inside a team to get a team API key, or use a personal project for personal context. The same `x-api-key` header works for both, with no extra configuration needed.

A team project's API key works only while the user who created the project is an active member of the team or the owner of its organization. Once the creator is removed from the team, the key stops working right away, in your apps and in any agent that uses it. The project stays in the team. Requests with the key then fail with HTTP `401` and `The person who created this API key is no longer in its team. Ask a team admin for a new key.` Public endpoints such as `Agent/List` still answer, as if the request had no key. While the key works, runs made with it count toward the creator's member limit (see [Spend Limits](/docs/spend-limits)).

API keys can't change teams or organizations. `Organization/Create`, `Organization/Remove`, `Organization/Restore`, `Team/Create`, `Team/Update`, `Team/Remove`, `Team/Member/Invite`, `Team/Member/CancelInvite`, `Team/Member/UpdateRole`, `Team/Member/Remove`, `Team/TransferAgent`, `Team/TransferProject` and `Team/TransferCredit` need a signed-in user: use the dashboard, or send that user's Bearer token. With any API key, personal or team, they fail with HTTP `401` and `API keys can't manage teams or organizations. Sign in and try again.` Endpoints that only read, such as `Organization/List`, `Team/Member/List`, `SpendLimit/List`, `SpendLimit/Usage`, `ModelAccess/List` and `ModelAccess/Check`, work with an API key. Spend limits and Model Access rules are not team settings, and API keys can change them: `SpendLimit/Set`, `SpendLimit/Remove`, `SpendLimit/Preview`, `ModelAccess/Set`, `ModelAccess/Remove` and `ModelAccess/Preview` work with a personal project's key and with the key of a team project that a team admin or the organization owner created. The key of a team project that another member created can only read them. See [Spend Limits](/docs/spend-limits#changing-limits-with-the-api) and [Model Access](/docs/model-access#changing-rules-with-the-api).

## What Gets Filtered by Context

When a workspace context is active, these list endpoints return only resources belonging to that context:

| Endpoint | Personal context returns | Team context returns |
|----------|------------------------|---------------------|
| `Project/List` | Personal projects only | Team projects only |
| `UserAgent/MyAgents` | Personal agents only | Team agents only |
| `Task/List` | Personal tasks only | Team tasks only |
| `Task/Stat` | Personal task statistics | Team task statistics |
| `Project/UsageSummary` | Personal project usage | Team project usage |
| `Wallet/List` | Personal wallet | Team wallet |
| `Wallet/TransactionList` | Personal transactions | Team transactions |
| `Coupon/UserList` | Personal coupons | Team coupons |

In team context, `Project/List` returns a project's `apikey` only to the user who created the project, team admins and the organization owner. Other members get `apikeymasked` instead, which shows only the first and last four characters of the key. With an API key, this follows the user who created the key's project.

Model listings show the same models in every workspace (only favorites are kept per workspace). [Model Access](/docs/model-access) rules apply when a model runs, not when models are listed.

## Agent Context Guards

Wiro enforces strict context isolation for agent operations. When you interact with an agent, your current workspace context must match the agent's workspace:

| Your context | Agent's workspace | Result |
|-------------|-------------------|--------|
| Personal | Personal | Allowed |
| Team A | Team A | Allowed |
| Personal | Team A | **Blocked** |
| Team A | Personal | **Blocked** |
| Team A | Team B | **Blocked** |

A matching context is required, but it is not always enough. Any active team member can message a team agent and use its conversation endpoints. Subscription and billing actions (`CreateSubscriptionCheckout`, `RenewSubscription`, `CancelSubscription`, `UpgradeTier`, `CreateExtraCreditCheckout`) are limited to the member who deployed the agent, team admins and the organization owner. The organization owner can pay for a team agent by card or from the team wallet. Cancelling a team agent's card plan needs a team admin or the organization owner. `SkillsApply`, `SkillToggle` and `CredentialProjectBind` are limited to the member who deployed the agent and team admins. Other members get code `97`: "Only a team admin can perform this action on a team-owned agent." With an API key, these checks apply to the user who created the key's project. Card checkouts for a team agent are refused on that path: `CreateSubscriptionCheckout`, `UpgradeTier` and `CreateExtraCreditCheckout` would open the session on the key project creator's own saved billing details, so pay from the team wallet (`useprepaid: true`) or use the dashboard.

### Protected Endpoints

The following agent endpoints enforce context guards:

- `UserAgent/Message/Send`: send a message to an agent
- `UserAgent/Message/History`: view conversation history
- `UserAgent/Message/Sessions`: list conversation sessions
- `UserAgent/Message/DeleteSession`: delete a conversation
- `UserAgent/Message/RenameSession`: rename a conversation
- `UserAgent/Message/Delete`: hide your own messages
- `UserAgent/CreateExtraCreditCheckout`: purchase extra credits
- `UserAgent/CancelSubscription`: cancel subscription
- `UserAgent/RenewSubscription`: renew subscription
- `UserAgent/UpgradeTier`: change the plan (Starter, Pro or Max)
- `UserAgent/CreateSubscriptionCheckout`: subscribe a not-yet-subscribed useragent
- `UserAgent/PricingPreview`: preview a plan or skill change for an existing agent
- `UserAgent/SkillsApply`: change skill set (single or batch, never charged)
- `UserAgent/SkillToggle`: toggle a single skill
- `UserAgent/CredentialProjectBind`: connect the agent's Wiro project
- `UserAgent/Realtime/WebStart`: start a web voice session
- `UserAgent/Realtime/ScreenInfo`, `UserAgent/Realtime/ScreenStart`: open the agent's Screen

`Message/Delete`, `SkillsApply` and `SkillToggle` enforce the context guard for team agents only; a personal agent's owner can call them from any workspace. `Realtime/WebStart` also checks team agents only: the member who deployed the agent can call it from any workspace while they are still an active member of the agent's team, so a website voice backend keeps working on a personal project key. Outside the team's context, a caller who has left the team gets the context mismatch error.

`Realtime/ScreenInfo` and `Realtime/ScreenStart` hold an API key to its own workspace: a team project's key opens only that team's agents, and for a personal agent or another team's agent `ScreenStart` is refused with code `96`, `This API key belongs to another workspace than this agent. Use a key of the agent's own workspace.` (`ScreenInfo` answers `reason: "not_allowed"`). A personal project's key opens a team agent's Screen while its owner is still an active member of the team, as for `Realtime/WebStart`.

`UserAgent/Deploy` creates the agent in your current workspace. With a team project API key the agent is deployed into that team, and the user who created the project must be a team admin. Otherwise the call fails with code `97`: "Only a team admin can perform this action on a team-owned agent."

### Error Response

When a context mismatch is detected:

```json
{
  "result": false,
  "errors": [
    {
      "code": 0,
      "message": "This agent belongs to a team. Switch to the team context to access it."
    }
  ]
}
```

Or for the reverse case:

```json
{
  "result": false,
  "errors": [
    {
      "code": 0,
      "message": "This agent is in your personal workspace. Switch to personal context to access it."
    }
  ]
}
```

If the agent belongs to a different team than your current context:

```json
{
  "result": false,
  "errors": [
    {
      "code": 0,
      "message": "This agent belongs to a different team."
    }
  ]
}
```

## Practical Examples

### Running a Model with a Team Project

Create a project inside a team, then use its API key. The team context is resolved automatically:

```bash
# 1. Create a project in team context (from dashboard or API)
# 2. Use the project's API key — billing goes to team wallet
curl -X POST "https://api.wiro.ai/v1/Run/google/nano-banana" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_TEAM_PROJECT_API_KEY" \
  -d '{"prompt": "A mountain landscape"}'
```

The task is created with the team's `teamguid`. The cost is deducted from the team wallet. The task appears in the team's usage statistics. The team's Model Access rules and spend limits also apply. A run is refused with code `92` when a Model Access rule that covers it blocks the model, such as the team's rule, the key creator's member rule or the key's own rule, and with code `93` once a spend limit that covers it is reached, such as the team's limit, the key creator's member limit or the key's own limit. See [Model Access](/docs/model-access) and [Spend Limits](/docs/spend-limits).

### Listing Team Agents with API Key

Use a team project API key to list agents deployed in the team:

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/MyAgents" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_TEAM_PROJECT_API_KEY" \
  -d '{"limit": 10}'
```

This returns only agents with `teamguid` matching the project's team. Personal agents are not included.

### Sending a Message to a Team Agent

The API key must belong to the same team as the agent:

```bash
# Works — team project + team agent in the same team
curl -X POST "https://api.wiro.ai/v1/UserAgent/Message/Send" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_TEAM_PROJECT_API_KEY" \
  -d '{"useragentguid": "agent-guid-here", "message": "Hello"}'
```

```bash
# Fails — personal project + team agent = context mismatch
curl -X POST "https://api.wiro.ai/v1/UserAgent/Message/Send" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_PERSONAL_API_KEY" \
  -d '{"useragentguid": "team-agent-guid-here", "message": "Hello"}'
# Returns: "This agent belongs to a team. Switch to the team context to access it."
```

### Wallet Billing Flow

Runs made with a team project's key are charged to the team wallet and appear in the team's `Wallet/TransactionList`; personal project keys charge your personal wallet.

## Best Practices

- **Separate projects by environment**: create distinct team projects for development, staging, and production. The team context is resolved automatically from the API key.
- **Check agent context before messaging**: if you build a multi-tenant application, ensure the project and agent belong to the same workspace
- **Transfer resources carefully**: agents can only access projects in the same workspace. Plan your resource layout before transferring

## What's Next

- [Organizations & Teams Overview](/docs/organizations-overview): Concepts and workspace hierarchy
- [Managing Teams](/docs/organizations-managing-teams): Create organizations, invite members, manage roles
- [Team Billing & Spending](/docs/organizations-billing): Wallets, spend limits, and Model Access rules
- [Authentication](/docs/authentication): API key setup and authentication methods
- [Projects](/docs/projects): Project management and API credentials
