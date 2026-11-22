# HackMD Integration

Let your agent create, update and share notes on HackMD with your own API token, in your personal workspace and your teams: new notes start readable by their owners only, and sharing them wider waits for your approval.

## Overview

[HackMD](https://hackmd.io) is a real-time collaborative Markdown editor for notes, documents, slides and books, used alone or in team workspaces. This integration lets an agent work with your notes through the HackMD API v1: it writes meeting notes, documents and drafts in Markdown, keeps them owners-only until you approve sharing, updates them, uploads images into them, and lists and reads the notes of your workspaces.

**Skills that use this integration:**

- `int-hackmd-post`: Creates notes in your personal workspace or a team as owners-only drafts, updates their Markdown, title and tags, sets who can read, write and comment, lists personal and team notes, reads a note, uploads images into a note, and deletes a note only after approval.

**Agents that typically enable this integration:**

- Custom documentation, meeting-notes and release-notes agents that keep their output in a team's HackMD.
- Writing agents that prepare a draft in HackMD for the team to review and edit together.

## Availability

| Mode | Status | Notes |
|------|--------|-------|
| API Key (API token) | Available | Your own HackMD API token. The integration is included in every plan at no extra charge; API calls count against your HackMD account's monthly API quota. Publishing a note to your HackMD profile stays a button on HackMD. |

## Prerequisites

- **A Wiro API key** (see [Authentication](/docs/authentication)).
- **A deployed agent** (see [Agent Overview](/docs/agent-overview)).
- **A HackMD account** at [hackmd.io](https://hackmd.io). A free account gets 400 API calls a month and a Prime account 10,000.

## Setup

### Step 1: Create a HackMD API token

1. Sign in at [hackmd.io](https://hackmd.io).
2. On your overview page, open your account menu and choose **Settings**, then **API**. The page is also at [hackmd.io/settings#api](https://hackmd.io/settings#api).
3. Click **Create API token**, give the token a name you will recognize later, such as `AI agent`, and click **Create**.
4. Click **Copy token**. HackMD shows the token only once; if you lose it, create a new one.

> A HackMD token has no scopes: it can read and change every note your account can reach, in your personal workspace and in every team you are a member of, so keep it secret. To revoke it, click the **x** next to the token on the API page; the agent stops working with HackMD at once.

### Step 2: Save the credential to Wiro

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/CredentialUpsert" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "fields": [
      { "credentialkey": "hackmd", "fieldname": "token", "fieldvalue": "YOUR_HACKMD_API_TOKEN" }
    ]
  }'
```

Or fill it in the panel: **[My Agents](https://wiro.ai/panel/agents)** → open agent → **Connectors → HackMD**.

A value with a space or line break inside it, shorter than 20 characters or longer than 200 is refused when you save it; a space or line break around it is trimmed.

### Step 3: Enable the skill

HackMD ships **available but off**. Turn `int-hackmd-post` on for the agent:

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/SkillsApply" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "skills": { "int-hackmd-post": true },
    "idempotencyKey": "550e8400-e29b-41d4-a716-446655440000"
  }'
```

Or flip the toggle in the panel under **Skills** (see [Agent Skills](/docs/agent-skills#toggling-integration-skills)).

### Step 4: Start the agent

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Start" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "guid": "your-useragent-guid" }'
```

## Credential Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `token` | string (secret) | Yes | HackMD API token, exactly as copied (no spaces). Encrypted at rest. |

## Credentials schema (as returned by `POST /UserAgent/Detail`)

```json
"hackmd": {
  "_connected": true,
  "optional": false,
  "extra": false,
  "token": "••••••••"
}
```

On a custom build with `int-hackmd-post` on, `optional` and `extra` are `false`: HackMD is that skill's own connector.

## Who can read a note

HackMD sets read and write access per note:

| Setting | Who |
|---------|-----|
| Owners | You for a personal note; the team's members for a team note (the team owns it). |
| Signed-in users | Anyone signed in to HackMD who has the link. |
| Everyone | Everyone who has the link. HackMD warns that search engines may index a note everyone can read. |

Write access is always as strict as read access or stricter. Comments have their own setting (disabled, owners, signed-in users or everyone).

## How sharing works

1. **Owners-only drafts.** When you ask the agent to put something in HackMD, it creates the note readable and writable by its owners only, and sends you the link. It always sets this explicitly, since a public team's notes are readable by everyone by default.
2. **Sharing after approval.** The agent opens a note to signed-in users or to everyone only when you say so, following the agent's approval policy, and tells you first who will be able to read and edit it. It then checks that HackMD applied the change.
3. **Back to private** at any time: the agent narrows a note to its owners on request.
4. **Publishing** a note to your HackMD profile or team page, where search engines can find it, is HackMD's Publish button in the note's Sharing menu, where HackMD asks you to agree to its community guidelines. The API has no publish call, so the agent shares the note and tells you that the last step is that button.

Edits to a note others can read go live at once, so the agent shows the change and waits for your approval first. A note only its owners can read is edited on request.

## What the agent can do

| Request | HackMD API | What happens |
|---------|------------|--------------|
| Check the account and teams | `GET /v1/me` | Account name, whether the plan is paid, and each team's name and path. The account's email is never repeated. |
| List notes | `GET /v1/notes`, `GET /v1/teams/{teamPath}/notes` | Every note of the workspace, newest change first: title, who can read and write, whether it is published, last change, tags and link. |
| Read a note | `GET /v1/notes/{noteId}` | The note's details and its Markdown (team notes too, when your account can open them). |
| Create a note | `POST /v1/notes`, `POST /v1/teams/{teamPath}/notes` | An owners-only note with your Markdown, title, tags and optional permalink. |
| Update a note | `PATCH /v1/notes/{noteId}` (or the team path) | New Markdown (it replaces the whole text), title, tags, description or permalink. |
| Share or narrow a note | `PATCH` with `readPermission` and `writePermission` | Owners, signed-in users or everyone, after your approval when it widens access. |
| Add an image | `POST /v1/notes/{noteId}/images` | The image is stored with the note and linked in its Markdown: png, jpg, gif, bmp or tif, up to 1 MB on a free account and 20 MB on Prime. Only those who can read the note can see it. |
| Delete a note | `DELETE /v1/notes/{noteId}` (or the team path) | Only when you ask for that note and confirm. The note goes to HackMD's trash, and a personal note can be restored while it is there. |

## Limits & billing

- **HackMD's API limits** (the API is in beta and they can change): a free account gets 400 calls a month, a Prime account 10,000, and every account 100 calls every 5 minutes. Every call counts, reads included; the API page in HackMD's settings shows your usage.
- **The agent saves calls:** it plans each request (a new note is one call, sharing two, an edit two), never polls, and reads the account or the note list once per request at most.
- **When the quota runs out**, HackMD answers HTTP 429. The agent stops and tells you once; HackMD takes calls again when the quota resets or after an upgrade.
- **Billing on Wiro:** every plan includes the integration, so it changes neither the agent's price nor its credits. As with every agent turn, its work is billed on the LLM tokens it uses, from the agent's existing credits.

## Troubleshooting

- **401 Unauthorized:** the token is wrong or was revoked, or the account is disabled. Create a new token at [hackmd.io/settings#api](https://hackmd.io/settings#api) and save it again.
- **403 Forbidden:** your account is not an owner of that note or a member of that team.
- **404 Not Found:** the note id or team path is wrong. A note's id is the part of its address after `hackmd.io/`; an address with a custom permalink holds none, so ask the agent to find the note in the list.
- **422 Validation Failed:** for example write access looser than read access. The agent fixes the field HackMD names.
- **429:** the 5-minute window or the monthly quota is used up.
- **413 or 415 on an image:** the image is too large for your plan or its format is not supported.
- **A shared link stopped working after a permalink change:** HackMD keeps only a note's latest permalink.
- **Agent says "not connected" with the token filled:** the agent restarts to pick up new credentials; give it a moment after saving, then retry.

## Related

- [Agent Credentials & OAuth](/docs/agent-credentials)
- [Agent Skills](/docs/agent-skills)
- [WordPress Skills](/docs/integration-wordpress-skills): your own blog
- [HackMD API reference](https://api.hackmd.io/v1/docs)
- [HackMD: create or revoke an API token](https://hackmd.io/@docs/how-to-issue-an-api-token)
