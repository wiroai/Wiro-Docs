# Organizations & Teams

Collaborate with your team under a shared workspace with unified billing, access controls, and resource management.

## Overview

Wiro supports three workspace contexts for organizing your resources:

- **Personal** — your default workspace. Projects, agents, and wallet are tied to your individual account.
- **Organization** — a parent entity that groups one or more teams. The organization owner controls the lifecycle of teams and their members.
- **Team** — a workspace under an organization with its own wallet, projects, agents, and member permissions. Team members share access to resources deployed within the team.

```
Personal Account
├── Personal Projects
├── Personal Agents
└── Personal Wallet

Organization (created by you)
├── Team A
│   ├── Team Wallet
│   ├── Team Projects
│   ├── Team Agents
│   └── Members (owner, admins, members)
├── Team B
│   ├── Team Wallet
│   ├── Team Projects
│   ├── Team Agents
│   └── Members
└── ...
```

Every user always has a personal workspace. Organizations and teams are optional — you can use Wiro entirely in personal mode without ever creating an organization.

## Key Concepts

### Workspaces and Context

When you make an API request or use the dashboard, you operate in one of two contexts:

| Context | Resources you see | Wallet charged | How to activate |
|---------|-------------------|----------------|-----------------|
| **Personal** | Your personal projects, agents, tasks | Your personal wallet | Default — use a personal project API key |
| **Team** | Team projects, team agents, team tasks | Team wallet | Use a team project API key |

Switching context changes which projects, agents, and wallet you interact with. Resources in one context are isolated from the other — personal agents cannot see team projects, and team agents cannot access personal resources.

### Resource Isolation

Each workspace is fully isolated:

- **Projects** belong to either your personal workspace or a specific team. A project's API key automatically resolves the correct context.
- **Agents** are deployed into a workspace. Team agents are visible to all team members; personal agents are visible only to you.
- **Wallet transactions** are recorded against the workspace that initiated them. Team tasks deduct from the team wallet; personal tasks deduct from your personal wallet.
- **Tasks** are tagged with the workspace context and only appear in the matching project usage and statistics views.

### Transferring Resources

Projects and agents can be transferred between workspaces:

- **Personal → Team** — move a project or agent from your personal workspace into a team you have admin access to
- **Team → Personal** — move a project or agent from a team back to your personal workspace
- **Team → Team** — move a project or agent between teams you have admin access to in the same or different organizations

When a resource is transferred, its billing context changes immediately. Future tasks on a transferred project will be billed to the new workspace's wallet. Transfer operations are available in the dashboard and via the API.

> **Important:** Agents can only access projects in the same workspace. If you transfer a project out of a team, agents in that team can no longer use it.

## Organizations vs Teams

An **organization** is a management container — it does not hold resources directly. All resources (projects, agents, wallets) live inside **teams**.

| Feature | Organization | Team |
|---------|-------------|------|
| Holds projects and agents | No | Yes |
| Has a wallet | No | Yes |
| Has members | No (members belong to teams) | Yes |
| Can be created by | Any user | Organization owner |
| Can be deleted by | Organization owner | Organization owner |
| Can be restored | Yes (by owner) | Yes (when org is restored) |

A single user can own multiple organizations, and each organization can contain multiple teams.

## Roles

| Role | Scope | Permissions |
|------|-------|-------------|
| **Owner** | Organization | Create/delete teams, manage all team members, delete/restore organization, transfer agents and projects |
| **Admin** | Team | Manage team settings (spend limits, model access), invite/remove members, transfer agents and projects |
| **Member** | Team | Use team resources (run models, send agent messages), view spending summaries |

The organization creator is automatically the owner. When a team is created, the organization owner is added as an implicit admin. Additional members are invited via email and must accept the invitation to join.

## Getting Started

1. **Create an organization** — go to your [Dashboard](https://wiro.ai/panel/organization) and click "Create Organization"
2. **Create a team** — inside the organization, create a team with a name
3. **Invite members** — send email invitations to your teammates
4. **Fund the team wallet** — deposit credits or redeem coupons in the team context
5. **Create projects** — create API projects within the team to start running models
6. **Deploy agents** — deploy agent instances within the team for shared access

For step-by-step instructions, see [Managing Teams](/docs/organizations-managing-teams).

## What's Next

- [Managing Teams](/docs/organizations-managing-teams) — Create organizations, invite members, manage roles and permissions
- [Team Billing & Spending](/docs/organizations-billing) — Wallets, spend limits, model access controls, and budget alerts
- [Team API Access](/docs/organizations-api-access) — How workspace context works with API keys and context guards
