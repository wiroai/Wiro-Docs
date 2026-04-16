# Managing Teams

Create organizations, invite members, and manage roles and permissions.

## **POST** /Organization/Create

Creates a new organization. The caller automatically becomes the organization **owner** — only the owner can create teams, delete the organization, or restore it after deletion.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes | Organization name |

```json
// Response
{
  "result": true,
  "errors": [],
  "organization": {
    "guid": "1b43089c-3b56-4638-b4ac-24268bb1d970",
    "name": "Acme Corp",
    "status": 1
  }
}
```

You can also create organizations from the [Dashboard](https://wiro.ai/panel/organization).

## **POST** /Team/Create

Creates a team inside an organization. Only the organization owner can create teams. The team is created with its own wallet (starting at $0.00) and the caller is automatically added as an admin.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `organizationguid` | string | Yes | Organization guid |
| `name` | string | Yes | Team name |

```json
// Response
{
  "result": true,
  "errors": [],
  "team": {
    "guid": "0d9aade4-d31b-4b97-88f3-a90482f080ea",
    "name": "Engineering",
    "organizationguid": "1b43089c-3b56-4638-b4ac-24268bb1d970",
    "status": 1
  }
}
```

## **POST** /Team/Member/Invite

Sends an email invitation to add a new member to the team. Invitations expire after 7 days and can be resent. Organization owners and team admins can invite members.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `teamguid` | string | Yes | Team guid |
| `email` | string | Yes | Invitee email address |
| `role` | string | Yes | Role: `"admin"` or `"member"` |

```json
// Response
{
  "result": true,
  "errors": [],
  "member": {
    "email": "teammate@example.com",
    "role": "member",
    "status": "pending"
  }
}
```

### Invitation States

| Status | Description |
|--------|-------------|
| `pending` | Invitation sent, waiting for the user to accept |
| `active` | User accepted the invitation and is an active member |
| `removed` | Member was removed or invitation was cancelled |

## **POST** /Team/Member/Accept

When a user clicks the invitation link, they are directed to the Wiro dashboard. If they already have an account, they are added to the team immediately. If not, they are prompted to sign up first.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `token` | string | Yes | Invitation token from the email link |

## Member Roles

| Role | Can run models | Can message agents | Can view spending | Can manage settings | Can invite members | Can remove members | Can delete team |
|------|---------------|-------------------|-------------------|--------------------|--------------------|-------------------|-----------------|
| **Owner** | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| **Admin** | Yes | Yes | Yes | Yes | Yes | Yes | No |
| **Member** | Yes | Yes | Yes | No | No | No | No |

The organization owner is always an implicit admin of every team in the organization. The owner role cannot be transferred.

## **POST** /Team/Member/List

Lists all members of a team, including pending invitations.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `teamguid` | string | Yes | Team guid |

```json
// Response
{
  "result": true,
  "errors": [],
  "members": [
    {
      "useruuid": "86ae3c1d-edd1-4c2e-ba19-d1a3a23eeca4",
      "role": "admin",
      "status": "active",
      "username": "johndoe",
      "email": "john@example.com",
      "avatar": "https://cdn.wiro.ai/avatars/johndoe.webp"
    },
    {
      "useruuid": null,
      "role": "member",
      "status": "pending",
      "inviteemail": "jane@example.com"
    }
  ]
}
```

## **POST** /Team/Member/Remove

Removes a member from the team. Organization owners and team admins can remove members. A removed member immediately loses access to the team's resources. Removed members can be re-invited later if needed.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `teamguid` | string | Yes | Team guid |
| `useruuid` | string | Yes | UUID of the member to remove |

## **POST** /Team/Member/UpdateRole

Updates a member's role. Team admins and the organization owner can change a member's role between **admin** and **member**.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `teamguid` | string | Yes | Team guid |
| `useruuid` | string | Yes | UUID of the member |
| `role` | string | Yes | New role: `"admin"` or `"member"` |

## **POST** /Team/Remove

Deletes a team. Only the organization owner can delete a team. Deleting a team:

- Soft-deletes the team (sets status to `0`)
- Removes all team members
- Transfers all team agents to the owner's personal workspace
- Transfers all team projects to the owner's personal workspace
- Invalidates project caches for transferred projects

The team's wallet balance is not automatically transferred. Contact support if you need to recover the balance.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `teamguid` | string | Yes | Team guid |

## **POST** /Organization/Remove

Deletes an organization. Only the organization owner can delete an organization. This soft-deletes the organization and all its teams, following the same process as deleting each team individually.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `organizationguid` | string | Yes | Organization guid |

## **POST** /Organization/Restore

Restores a soft-deleted organization. Restoring an organization:

- Reactivates the organization and all its teams
- Restores previously accepted members to active status
- Expired or cancelled invitations remain removed (they must be re-invited)

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `organizationguid` | string | Yes | Organization guid |

## **POST** /Organization/List

Returns all organizations you belong to, including active and deleted ones.

```json
// Response
{
  "result": true,
  "errors": [],
  "organizations": [
    {
      "organizationguid": "1b43089c-3b56-4638-b4ac-24268bb1d970",
      "organizationname": "Acme Corp",
      "organizationstatus": 1,
      "isowner": true,
      "teams": [
        {
          "teamguid": "0d9aade4-d31b-4b97-88f3-a90482f080ea",
          "teamname": "Engineering",
          "teamstatus": 1,
          "role": "admin",
          "walletbalance": 142.50
        }
      ]
    }
  ]
}
```

## **POST** /Team/TransferAgent

Transfers an agent instance between workspaces — personal to team, team to personal, or team to team. You must be an admin in both the source and target context.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Agent instance guid |
| `targetteamguid` | string | Yes | Target team guid, or empty string `""` for personal |

When an agent is transferred:
- The agent's `teamguid` is updated
- Active subscriptions and credit purchases move with the agent
- The agent is restarted with the new context
- Future billing is charged to the new workspace's wallet

## **POST** /Team/TransferProject

Transfers a project between workspaces. Future tasks on the project are billed to the new workspace's wallet.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `projectapikey` | string | Yes | Project API key |
| `targetteamguid` | string | Yes | Target team guid, or empty string `""` for personal |

When a project is transferred:
- The project's `teamguid` is updated
- The project cache is invalidated
- Future tasks using this project's API key are billed to the new workspace

> **Important:** Agents can only access projects in the same workspace. Transferring a project may break agent workflows that depend on it.

## Transferring Credit

Credit can be transferred between your personal wallet and team wallets. Transfers preserve original deposit expiry dates and coupon tracking. See [Team Billing & Spending → Credit Transfer](/docs/organizations-billing) for full details.

## What's Next

- [Organizations & Teams Overview](/docs/organizations-overview) — Concepts and workspace hierarchy
- [Team Billing & Spending](/docs/organizations-billing) — Wallets, spend limits, and model access controls
- [Team API Access](/docs/organizations-api-access) — How context works in API requests
