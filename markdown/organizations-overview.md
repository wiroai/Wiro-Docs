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
│   └── Members (admins, members)
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
| **Personal** | Your personal projects, agents, tasks | Your personal wallet | Default. In the dashboard, choose Personal with **Switch Workspace** (or **Switch to Personal** on the Organizations page); in the API, use a personal project API key |
| **Team** | Team projects, team agents, team tasks | Team wallet | In the dashboard, choose the team with **Switch Workspace** (or **Switch** on the Organizations page); in the API, use a team project API key |

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
- **Team → Personal** — move a project you created, or an agent you deployed, from a team you have admin access to back to your personal workspace. Only the original creator or deployer can do this.
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
| Can be restored | Yes, by the owner | No separate restore. Teams archived when their organization was deleted come back when it is restored |

Restoring an organization does not move projects or agents back into its teams. They stay in the personal workspaces of the people who created or deployed them until transferred back.

A single user can own multiple organizations, and each organization can contain multiple teams.

## Roles

| Role | Scope | Permissions |
|------|-------|-------------|
| **Owner** | Organization | Create and remove teams; edit, remove, and restore the organization. The owner is added as an admin of every team they create and can't be demoted to member, so they also have all Admin permissions there |
| **Admin** | Team | Edit team settings (name, spend limit, budget alert, model access); invite members and cancel invitations; change roles and per-member spend limits; remove members; deploy and manage team agents; edit and delete team projects; transfer agents, projects, and credit; redeem coupons into the team wallet; set up, change, and turn off the team wallet's auto-pay |
| **Member** | Team | Run models and create projects in the team workspace (billed to the team wallet), chat with team agents, and view the member list and every member's spending |

The organization creator is automatically the owner. When the owner creates a team, including the Default Team created with the organization, they are added to it as an admin member. Additional members are invited by email and join once they accept the invitation, signed in with the invited email address, within 72 hours.

## Getting Started

1. **Create an organization** — go to your [Dashboard](https://wiro.ai/panel/organization) and click "Create Organization". A team named "Default Team" is created automatically, with you as its admin.
2. **Add more teams (optional)** — as the organization owner, click "Create Team" on the organization card to add another team, for example one per project
3. **Invite members** — send email invitations to your teammates
4. **Fund the team wallet** — switch to the team workspace and add credit. Admins and the owner can also move credit from their personal wallet with **Transfer Credit** and redeem coupons into the team wallet
5. **Create projects** — with the team workspace selected, create API projects. Their API keys run models on the team wallet
6. **Deploy agents** — team admins can deploy agent instances within the team for shared access

For step-by-step instructions, see [Managing Teams](/docs/organizations-managing-teams).

## What's Next

- [Managing Teams](/docs/organizations-managing-teams) — Create organizations, invite members, manage roles and permissions
- [Team Billing & Spending](/docs/organizations-billing) — Wallets, spend limits, model access controls, and budget alerts
- [Team API Access](/docs/organizations-api-access) — How workspace context works with API keys and context guards
