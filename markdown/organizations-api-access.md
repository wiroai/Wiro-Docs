# Team API Access

How workspace context is resolved in API requests, and how access controls protect cross-context operations.

## Context Resolution

Every authenticated API request resolves to a workspace context — either **personal** or a specific **team**. When you authenticate with a project API key (`x-api-key`), the context is determined **automatically** by the project's assignment:

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

Create a project inside a team to get a team API key, or use a personal project for personal context. The same `x-api-key` header works for both — no extra configuration needed.

A team project's API key does not depend on its creator's team membership. If the member who created the project is removed from the team, the project stays in the team and its key keeps working and charging the team wallet. Delete the project to revoke the key. While the project's creator is a team member, runs made with the key count toward that user's member spend limit; after they are removed, only the team spend limit applies.

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

Model listings show the same models in every workspace (only favorites are kept per workspace). Team model access rules apply when a model runs, not when models are listed.

## Agent Context Guards

Wiro enforces strict context isolation for agent operations. When you interact with an agent, your current workspace context must match the agent's workspace:

| Your context | Agent's workspace | Result |
|-------------|-------------------|--------|
| Personal | Personal | Allowed |
| Team A | Team A | Allowed |
| Personal | Team A | **Blocked** |
| Team A | Personal | **Blocked** |
| Team A | Team B | **Blocked** |

A matching context is required, but it is not always enough. Any active team member can message a team agent and use its conversation endpoints. Subscription and billing actions (`CreateSubscriptionCheckout`, `RenewSubscription`, `CancelSubscription`, `UpgradeTier`, `CreateExtraCreditCheckout`) are limited to the member who deployed the agent, team admins and the organization owner. The organization owner can pay for a team agent by card or from the team wallet. Cancelling a team agent's card plan needs a team admin or the organization owner. `SkillsApply` and `SkillToggle` are limited to the member who deployed the agent and team admins. Other members get code `97`: "Only a team admin can perform this action on a team-owned agent." With an API key, these checks apply to the user who created the key's project. Card checkouts for a team agent are refused on that path: `CreateSubscriptionCheckout`, `UpgradeTier` and `CreateExtraCreditCheckout` would open the session on the key project creator's own saved billing details, so pay from the team wallet (`useprepaid: true`) or use the dashboard.

### Protected Endpoints

The following agent endpoints enforce context guards:

- `UserAgent/Message/Send` — send a message to an agent
- `UserAgent/Message/History` — view conversation history
- `UserAgent/Message/Sessions` — list conversation sessions
- `UserAgent/Message/DeleteSession` — delete a conversation
- `UserAgent/Message/RenameSession` — rename a conversation
- `UserAgent/Message/Delete` — hide your own messages
- `UserAgent/CreateExtraCreditCheckout` — purchase extra credits
- `UserAgent/CancelSubscription` — cancel subscription
- `UserAgent/RenewSubscription` — renew subscription
- `UserAgent/UpgradeTier` — upgrade tier (Starter → Pro)
- `UserAgent/CreateSubscriptionCheckout` — subscribe a not-yet-subscribed useragent
- `UserAgent/PricingPreview` — pricing preview for an existing agent
- `UserAgent/SkillsApply` — change skill set (single or batch) on a custom build (auto-prorates)
- `UserAgent/SkillToggle` — toggle a single skill on a custom build
- `UserAgent/Realtime/WebStart` — start a web voice session

`Message/Delete`, `SkillsApply` and `SkillToggle` enforce the context guard for team agents only; a personal agent's owner can call them from any workspace. `Realtime/WebStart` also checks team agents only: the member who deployed the agent can call it from any workspace while they are still an active member of the agent's team, so a website voice backend keeps working on a personal project key. Outside the team's context, a caller who has left the team gets the context mismatch error.

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

The task is created with the team's `teamguid`. The cost is deducted from the team wallet. The task appears in the team's usage statistics. The team's model access rules and spend limits also apply. A model the team doesn't allow fails with "This model is not available for your team", and runs stop once the team or member spend limit is reached. See [Team Billing & Spending](/docs/organizations-billing).

### Listing Team Agents with API Key

Use a team project API key to list agents deployed in the team:

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/MyAgents" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_TEAM_PROJECT_API_KEY" \
  -d '{"limit": 10}'
```

This returns only agents with `teamguid` matching the project's team — personal agents are not included.

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

When a task runs in team context:

1. The project's `teamguid` is resolved from the API key
2. The task is created with `teamguid` set
3. On completion, the billing UUID is set to `teamguid` (not the user's UUID)
4. The wallet transaction is recorded against the team wallet
5. The cost is deducted from the team wallet balance

```
API Key → Project (teamguid) → Task (teamguid) → Wallet Transaction (uuid=teamguid)
```

For personal context, the flow is the same but `teamguid` is `null` and billing uses the user's personal UUID.

## Best Practices

- **Separate projects by environment** — create distinct team projects for development, staging, and production. The team context is resolved automatically from the API key.
- **Check agent context before messaging** — if you build a multi-tenant application, ensure the project and agent belong to the same workspace
- **Transfer resources carefully** — agents can only access projects in the same workspace. Plan your resource layout before transferring

## What's Next

- [Organizations & Teams Overview](/docs/organizations-overview) — Concepts and workspace hierarchy
- [Managing Teams](/docs/organizations-managing-teams) — Create organizations, invite members, manage roles
- [Team Billing & Spending](/docs/organizations-billing) — Wallets, spend limits, and model access controls
- [Authentication](/docs/authentication) — API key setup and authentication methods
- [Projects](/docs/projects) — Project management and API credentials
