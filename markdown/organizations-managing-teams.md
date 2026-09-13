# Managing Teams

Create organizations, invite members, and manage roles and permissions.

## **POST** /Organization/Create

Creates a new organization. The caller automatically becomes the organization **owner** — only the owner can create teams, delete the organization, or restore it after deletion. A team named `Default Team` is created with it automatically: the caller is added as its admin, and it gets its own wallet (starting at $0.00), no spend limit, and access to all models. Use `/Team/Create` only for additional teams.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes | Organization name |

```json
// Response
{
  "result": true,
  "errors": [],
  "organization": [
    {
      "guid": "1b43089c-3b56-4638-b4ac-24268bb1d970",
      "name": "Acme Corp",
      "description": null,
      "owneruuid": "86ae3c1d-edd1-4c2e-ba19-d1a3a23eeca4",
      "status": 1,
      "teams": [
        {
          "guid": "7c1e5a90-2f3b-4d8e-a6c4-9b0d1e2f3a45",
          "organizationguid": "1b43089c-3b56-4638-b4ac-24268bb1d970",
          "name": "Default Team",
          "spendlimit": null,
          "budgetalertpct": 80,
          "modelaccess": "all",
          "status": 1
        }
      ]
    }
  ]
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
  "team": [
    {
      "guid": "0d9aade4-d31b-4b97-88f3-a90482f080ea",
      "organizationguid": "1b43089c-3b56-4638-b4ac-24268bb1d970",
      "name": "Engineering",
      "description": null,
      "spendlimit": null,
      "budgetalertpct": 80,
      "modelaccess": "all",
      "allowedmodelids": null,
      "blockedmodelids": null,
      "status": 1
    }
  ]
}
```

## **POST** /Team/Member/Invite

Sends an email invitation to add a new member to the team. Invitations expire after 72 hours. Organization owners and team admins can invite members.

Inviting an address that already has an unexpired invitation to the team, or that belongs to an active member who joined through an invitation, fails with `This email is already invited or a member`. To send a new invitation, cancel the current one with `/Team/Member/CancelInvite` (or wait until it expires) and invite the address again.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `teamguid` | string | Yes | Team guid |
| `email` | string | Yes | Invitee email address |
| `role` | string | No | Role: `"admin"` or `"member"`. Defaults to `"member"`; any other value is treated as `"member"` |

```json
// Response
{
  "result": true,
  "errors": [],
  "member": [
    {
      "guid": "5f0c2b8e-7d4a-4e21-9c3b-2a6f1e8d9b10",
      "teamguid": "0d9aade4-d31b-4b97-88f3-a90482f080ea",
      "useruuid": null,
      "role": "member",
      "status": "pending",
      "inviteemail": "teammate@example.com",
      "inviteexpiry": "1757923200",
      "spendlimit": null
    }
  ]
}
```

`inviteexpiry` is the invitation's expiry time as a Unix timestamp in seconds. The response doesn't include the invitation token, and neither does `/Team/Member/List`: the token is only sent to the invitee, in the invitation email.

### Invitation States

| Status | Description |
|--------|-------------|
| `pending` | Invitation sent, waiting for the user to accept. An expired invitation stays `pending` until it is cancelled or replaced by a new invitation |
| `active` | User accepted the invitation and is an active member |
| `removed` | Member was removed or invitation was cancelled |

## **POST** /Team/Member/CancelInvite

Cancels a pending invitation. Organization owners and team admins can cancel invitations. The invitation link stops working and the entry changes to `removed`.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `teammemberguid` | string | Yes | The pending invitation's `guid` from `/Team/Member/List` |

## **POST** /Team/Member/Accept

The **Accept Invite** button in the invitation email opens the **Team Invitation** page on wiro.ai. If you are signed out, the page shows who invited you and the organization and team names; choose **Sign In to Accept** or **Create Account**, and you are brought back to the invitation afterwards. If you are already signed in, the invitation is accepted automatically and you are taken to the Organizations page.

The invitation can only be accepted by a Wiro account whose email address matches the invited address. When calling the endpoint directly, send the request as the signed-in invitee. When the organization owner accepts an invitation to one of their teams, they join as an admin, whatever role the invitation set.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `invitetoken` | string | Yes | Invitation token: the value of the `token` query parameter in the invitation link |

| Error | Cause |
|-------|-------|
| `Please sign in or sign up to accept this invitation` | The request was not made by a signed-in user (error code `98`) |
| `This invitation was sent to a different email address` | The signed-in account's email address does not match the invited address |
| `This invitation has expired or is no longer valid` | The invitation expired, was cancelled or already accepted, or its team was deleted |

## Member Roles

| Role | Run models | Message agents | View spending | Manage settings | Invite members | Remove members | Delete team |
|------|---------------|-------------------|-------------------|--------------------|--------------------|-------------------|-----------------|
| **Owner** | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| **Admin** | Yes | Yes | Yes | Yes | Yes | Yes | No |
| **Member** | Yes | Yes | Yes | No | No | No | No |

The organization owner is added as an admin of every team they create, including the Default Team. The owner is always an admin of their teams: nobody, the owner included, can change the owner's role to member, and nobody but the owner can remove the owner from a team. The owner role cannot be transferred.

## **POST** /Team/Member/List

Lists all members of a team, including pending invitations. Any active member of the team can call it. Use a member's `guid` as `teammemberguid` in `/Team/Member/UpdateRole`, `/Team/Member/Remove` and `/Team/Member/CancelInvite`.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `teamguid` | string | Yes | Team guid |

```json
// Response
{
  "result": true,
  "errors": [],
  "member": [
    {
      "guid": "a3c9e1f2-4b7d-4c1e-9f2a-6d8b0e5c7a91",
      "teamguid": "0d9aade4-d31b-4b97-88f3-a90482f080ea",
      "useruuid": "86ae3c1d-edd1-4c2e-ba19-d1a3a23eeca4",
      "role": "admin",
      "status": "active",
      "spendlimit": null,
      "user": {
        "firstname": "John",
        "lastname": "Doe",
        "email": "john@example.com",
        "avatar": "https://cdn.wiro.ai/avatars/johndoe.webp",
        "avatarinitials": "JD"
      }
    },
    {
      "guid": "5f0c2b8e-7d4a-4e21-9c3b-2a6f1e8d9b10",
      "teamguid": "0d9aade4-d31b-4b97-88f3-a90482f080ea",
      "useruuid": null,
      "role": "member",
      "status": "pending",
      "inviteemail": "jane@example.com",
      "inviteexpiry": "1757923200",
      "spendlimit": null
    }
  ]
}
```

## **POST** /Team/Member/Remove

Removes a member from the team. Organization owners and team admins can remove members. The removed member immediately loses access to the team workspace and is notified by email. Removed members can be re-invited later if needed.

- A team must always keep at least one admin. Removing the last admin fails with `Cannot remove the last admin of the team. Assign another admin first.`
- Regular members cannot remove themselves; a team admin or the organization owner has to remove them.
- Another admin can't remove the organization owner from a team: the request fails with `Only the organization owner can remove the owner from this team`. The owner can remove themselves.
- Only active members can be removed. To withdraw a pending invitation, use `/Team/Member/CancelInvite`.
- Team projects stay in the team, and their API credentials are not tied to membership: anyone who still has a team project's credentials can keep using them and billing the team wallet. If the removed member had them, delete the project. Changing the project's IP whitelist issues a new API secret, so old signatures stop working on a Signature-Based project, but an API Key Only project's key keeps working from any IP still on its whitelist.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `teammemberguid` | string | Yes | The member's `guid` from `/Team/Member/List` |

## **POST** /Team/Member/UpdateRole

Updates a member's role and, optionally, their member spend limit in the team. Team admins and the organization owner can change a member's role between **admin** and **member**. A team must always keep at least one admin: demoting the last admin fails with `Cannot demote the last admin. Assign another admin first.` Nobody, the owner included, can change the organization owner's role to member: the request fails with `The organization owner is always an admin of their teams and can't be made a member`.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `teammemberguid` | string | Yes | The member's `guid` from `/Team/Member/List` |
| `role` | string | Yes | New role: `"admin"` or `"member"`. To change only the spend limit, send the member's current role |
| `spendlimit` | number | No | Member spend limit in USD. `0` or `null` removes the limit; omit it to keep the current limit |

## **POST** /Team/Remove

Deletes a team. Only the organization owner can delete a team. Deleting a team:

- Soft-deletes the team (sets status to `0`)
- Removes all team members and cancels pending invitations
- Moves each team agent back to the personal workspace of the user who deployed it; its active subscriptions and credit purchases move with it, the agent is restarted, and future agent billing goes to that user's personal wallet
- Moves each team project back to the personal workspace of the user who created it; its API key keeps working and future tasks are billed to that user's personal wallet

The team's wallet balance is not automatically transferred. Move it out with [Transfer Credit](/docs/organizations-billing) before deleting the team; after deletion, contact support to recover it.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `teamguid` | string | Yes | Team guid |

## **POST** /Organization/Remove

Deletes an organization. Only the organization owner can delete an organization. Deleting an organization soft-deletes it and archives the teams and members that are active at that moment, so `/Organization/Restore` can bring exactly those back. Each team is removed the same way as with `/Team/Remove`: members are removed, pending invitations are cancelled, agents go back to the personal workspace of the user who deployed them, and projects go back to the personal workspace of the user who created them. Team wallet balances are not moved.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `organizationguid` | string | Yes | Organization guid |

## **POST** /Organization/Restore

Restores a soft-deleted organization. Only the organization owner can restore it. Restoring an organization:

- Reactivates the organization and only the teams that were active when it was deleted. Teams deleted earlier with `/Team/Remove` stay deleted
- Reactivates only the members who were active in those teams when the organization was deleted. Members removed earlier stay removed
- Invitations stay cancelled, including those that were pending when the organization was deleted; invite those people again
- Does not move projects or agents back into the teams: they stay in the personal workspaces they were returned to when the organization was deleted. The user who created a project or deployed an agent can move it back with `/Team/TransferProject` or `/Team/TransferAgent`, provided they are an admin of the team or the organization owner

Some organizations can't be restored automatically: those deleted before Wiro started recording which teams and members were removed with them, and those whose teams had all been deleted before the organization was. For these, the call fails with `This organization can't be restored automatically because we can't tell which of its teams and members were removed with it. Please contact support.` and nothing changes. Contact support to have them restored.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `organizationguid` | string | Yes | Organization guid |

## **POST** /Organization/List

Returns all organizations you belong to, including active and deleted ones. Each organization lists the teams you are a member of, with your role and your own membership `memberguid`. You own an organization when its `owneruuid` is your user UUID.

```json
// Response
{
  "result": true,
  "errors": [],
  "organizations": [
    {
      "guid": "1b43089c-3b56-4638-b4ac-24268bb1d970",
      "name": "Acme Corp",
      "avatar": null,
      "owneruuid": "86ae3c1d-edd1-4c2e-ba19-d1a3a23eeca4",
      "status": 1,
      "teams": [
        {
          "guid": "0d9aade4-d31b-4b97-88f3-a90482f080ea",
          "name": "Engineering",
          "status": 1,
          "role": "admin",
          "memberguid": "a3c9e1f2-4b7d-4c1e-9f2a-6d8b0e5c7a91",
          "walletbalance": 142.50
        }
      ]
    }
  ]
}
```

## **POST** /Team/TransferAgent

Transfers an agent instance between workspaces — personal to team, team to personal, or team to team. On the team side you must be an admin of that team or the organization owner. On the personal side you must be the user who originally deployed the agent: only the deployer can move an agent from their personal workspace into a team, and only the deployer can move it from a team to their personal workspace.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Agent instance guid |
| `targetteamguid` | string | Yes | Target team guid, or empty string `""` for personal |

When an agent is transferred:
- The agent's `teamguid` is updated
- Active subscriptions and credit purchases move with the agent
- Its chat history moves with it
- The agent is restarted with the new context
- Future billing is charged to the new workspace's wallet

## **POST** /Team/TransferProject

Transfers a project between workspaces. Future tasks on the project are billed to the new workspace's wallet. On the team side you must be an admin of that team or the organization owner. On the personal side you must be the user who created the project: only the creator can move a project from their personal workspace into a team, and only the creator can move it from a team to their personal workspace.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `projectapikey` | string | Yes | Project API key |
| `targetteamguid` | string | Yes | Target team guid, or empty string `""` for personal |

When a project is transferred:
- The project's `teamguid` is updated
- Future tasks using this project's API key are billed to the new workspace

> **Important:** Agents can only access projects in the same workspace. Transferring a project may break agent workflows that depend on it.

## Transferring Credit

Credit can be transferred between your personal wallet and team wallets. Transfers preserve original deposit expiry dates and coupon tracking. See [Team Billing & Spending → Credit Transfer](/docs/organizations-billing) for full details.

## What's Next

- [Organizations & Teams Overview](/docs/organizations-overview) — Concepts and workspace hierarchy
- [Team Billing & Spending](/docs/organizations-billing) — Wallets, spend limits, and model access controls
- [Team API Access](/docs/organizations-api-access) — How context works in API requests
