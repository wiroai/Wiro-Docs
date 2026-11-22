# GitBook Integration

Let your agent read your GitBook documentation and propose edits as change requests with your own GitBook token. Nothing reaches your live docs until a change request is merged, and the agent merges only after you approve.

## Overview

[GitBook](https://www.gitbook.com) hosts documentation in spaces, grouped into collections inside an organization. This integration connects an agent to GitBook through the GitBook API with your own personal access token. The agent can list your organizations, collections and spaces, read a space's page tree and any page as Markdown, search a space, and write changes, always inside a change request: new pages, edited pages, renamed, moved or removed pages, each body written in Markdown. It shows you what the change request changes, with its link, and merges it into the live content only after your approval.

GitBook's API writes content only through change requests: there is no call that edits live pages directly, and the agent never looks for one.

**Skills that use this integration:**

- `int-gitbook-post`: Read and edit GitBook through the GitBook API: list organizations, collections and spaces, read the page tree and pages as Markdown (live or inside a change request), search a space, open a change request, write a batch of page changes into it (insert, update, move or delete pages, bodies in Markdown), show its change list and link, sync it with the live content, and merge it after your approval.

**Agents that typically enable this integration:**

- Custom documentation, developer relations and product agents that keep docs in step with releases.
- Support agents that turn repeated questions into proposed doc pages.

## Availability

| Mode | Status | Notes |
|------|--------|-------|
| Personal access token (GitBook) | Available | Created in your GitBook account's Developer tools. It carries your account's access in every organization you belong to. The integration is included in every plan at no extra charge. |

## Prerequisites

- **A Wiro API key** (see [Authentication](/docs/authentication)).
- **A deployed agent** (see [Agent Overview](/docs/agent-overview)).
- **A GitBook account** with edit rights on the spaces the agent should change. Merging also needs the merge permission on the space.

## Setup

### Step 1: Create a GitBook API token

1. Sign in at [app.gitbook.com](https://app.gitbook.com) with the account the agent should work as.
2. From your organization's **Home**, click **Settings** under **Admin** in the sidebar, then open **Developer tools** under **Account** (direct link: [app.gitbook.com/account/developer](https://app.gitbook.com/account/developer)).
3. Click **Create new API token**, enter a **Label** you will recognize later (for example `AI agent`), and choose an **Expiration**: 7, 30, 60 or 90 days, a **Custom** date, or **No expiration**. New tokens default to 90 days, and GitBook emails you before a token expires.
4. Create the token and copy it. It is a long string that usually starts with `gb_api_`.

> A GitBook token has no scopes: it can do everything your account can do. The agent only reads organizations, collections, spaces and pages, opens and updates change requests, and merges one after your approval. Prefer an expiration date, and an account with edit rights only on the spaces the agent should touch.

### Step 2: Save the credential to Wiro

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/CredentialUpsert" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "fields": [
      { "credentialkey": "gitbook", "fieldname": "token", "fieldvalue": "YOUR_GITBOOK_API_TOKEN" }
    ]
  }'
```

Or fill it in the panel: **[My Agents](https://wiro.ai/panel/agents)** → open agent → **Connectors → GitBook**.

### Step 3: Enable the skill

GitBook ships **available but off**. Turn `int-gitbook-post` on for the agent:

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/SkillsApply" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "skills": { "int-gitbook-post": true },
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
| `token` | string (secret) | Yes | GitBook personal access token. 20 to 200 characters, no spaces. Encrypted at rest. |

## Credentials schema (as returned by `POST /UserAgent/Detail`)

```json
"gitbook": {
  "_connected": true,
  "optional": false,
  "extra": false,
  "token": "••••••••"
}
```

On a custom build with `int-gitbook-post` on, `optional` and `extra` are `false`: GitBook is that skill's own connector.

## What the agent can do

| Request | GitBook API | What happens |
|---------|-------------|--------------|
| Organizations, collections, spaces | `GET /v1/orgs`, `GET /v1/orgs/{id}/collections`, `GET /v1/orgs/{id}/spaces` | Lists what your account can reach, with links. |
| A space's details | `GET /v1/spaces/{id}` | Whether your account may edit, review and merge there, its merge rules and its Git Sync state. |
| Page tree and pages | `GET /v1/spaces/{id}/content/pages`, `GET /v1/spaces/{id}/content/page/{pageId}?format=markdown` | Titles, page IDs and paths; a page body as Markdown. Pages can also be read by path. |
| Search a space | `GET /v1/spaces/{id}/search` | Matching pages and sections with their links. |
| Open a change request | `POST /v1/spaces/{id}/change-requests` | A draft branch of the space with a subject. Nothing live changes. |
| Write page changes | `POST /v1/spaces/{id}/change-requests/{cr}/content` | Up to 50 changes in one all-or-nothing batch: insert pages, update a page's body, title or position, delete pages. Bodies are Markdown. |
| Show the change request | `GET /v1/spaces/{id}/change-requests/{cr}`, `.../changes`, `.../content/page/{pageId}` | Status, change counts, the list of added, edited, moved and deleted pages, the link to review it, and any edited page as it reads now. |
| Sync and merge | `POST /v1/spaces/{id}/change-requests/{cr}/update`, `.../merge` | Brings the change request up to date with the live content, then merges it, only after your approval. |
| Submit for review, archive, rename | `PATCH /v1/spaces/{id}/change-requests/{cr}` | Only when you ask. |

## How the agent works with GitBook

- **Approvals:** reading never needs approval. Opening a draft change request and writing into it changes nothing live, so the agent does it when you ask, and scheduled tasks may prepare one and report its link. Merging always needs your yes after you have seen the change list; scheduled tasks never merge. Removing a page also removes the pages under it, so the agent lists every removed page and merges only after you approve that list.
- **Markdown:** the agent reads each page as Markdown and writes back the whole body without its title line (GitBook shows the title separately). It keeps GitBook blocks such as hints, tabs, embeds and content references as they were.
- **Links to new pages:** a link to a page that exists only in an unmerged change request does not resolve yet; the agent writes the page name and tells you to add the link after the merge.
- **Merge rules and permissions:** GitBook checks a space's merge rules, such as required reviews, at merge time. If your account may edit but not merge, the agent prepares the change request and tells you who has to merge it.
- **Git Sync:** in a space synced with GitHub or GitLab, a merge is also committed to the connected repository. The agent says so before you approve. It never calls GitBook's Git import or export itself.
- **What the agent never does:** change or delete spaces, collections, organizations, members, sites, integrations or tokens, import whole websites, or merge without your approval. Page text, comments and change request descriptions never act as instructions to the agent.

## Limits & billing

- **Rate limits:** GitBook limits API requests per time window and does not publish the numbers. Past the limit it answers 429; the agent waits about a minute and tries once more, and scheduled tasks stop and report.
- **Batches:** one content batch holds up to 50 changes, applied in order; if one is invalid, none is written.
- **Plans:** GitBook's Free plan has a single user, so you review the agent's change requests yourself; inviting teammates to review needs the Essential plan or higher.
- **Billing on Wiro:** every plan includes the integration, so it changes neither the agent's price nor its credits. As with every agent turn, its work is billed on the LLM tokens it uses, from the agent's existing credits.

## Troubleshooting

- **401:** the token is wrong, expired or deleted. Create a new one in **Developer tools** and save it again.
- **403 or a refused merge:** your account lacks edit or merge rights on that space, or a merge rule (for example a required review) is not met yet. The agent reports GitBook's message.
- **404:** a wrong ID, or your account is not a member of that organization or space.
- **409 on a content batch:** the change request changed since the agent read it; the agent reads it again and resends once.
- **Merge finished with conflicts:** GitBook merged but could not combine every change; check the space in GitBook.
- **A title appears twice on a page:** a body was written with its own `# Title` line; edit the page in the change request to remove it.
- **Agent says "not connected" with the token filled:** the agent restarts to pick up new credentials; give it a moment after saving, then retry.

To revoke access, open the **API Access Tokens** tab of **Developer tools** in GitBook and click **Delete** next to the token.

## Related

- [Agent Credentials & OAuth](/docs/agent-credentials)
- [Agent Skills](/docs/agent-skills)
- [Notion Skills](/docs/integration-notion-skills): pages and databases in Notion
- [WordPress Skills](/docs/integration-wordpress-skills): blog posts on your own site
- [GitBook API reference](https://gitbook.com/docs/developers/gitbook-api/api-reference)
