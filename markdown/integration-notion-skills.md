# Notion Integration

Give your agent read and write access to the Notion pages and databases you choose, with your own Notion connection, so it can file notes, keep databases up to date and answer from your workspace.

## Overview

[Notion](https://www.notion.com) holds your team's pages and databases. This integration connects an agent to your workspace through the Notion API with a token you create: an internal connection's API token, or a personal access token. The agent can search what the token can see, read pages and databases, create pages and database entries, write content as Markdown or as Notion blocks, add to existing pages, edit text, update properties and query databases with filters. Moving a page to the trash always waits for your approval, and the agent never deletes anything permanently.

**Skills that use this integration:**

- `int-notion-post`: Search, read and write Notion through the Notion API (Notion-Version `2026-03-11`): create pages under a page or as database entries with properties, write content as Notion-flavored Markdown or as blocks (headings, paragraphs, lists, to-dos, quotes, code, dividers, images by URL, tables), append to pages, change text in place, update properties, read pages as Markdown or blocks, and query databases with filters and sorts.

**Agents that typically enable this integration:**

- Custom assistants that file meeting notes, research summaries and reports into a team wiki.
- Content and project agents that keep a Notion content calendar, task board or CRM database up to date.

## Availability

| Mode | Status | Notes |
|------|--------|-------|
| Internal connection API token (Notion) | Available | Created by a Workspace Owner in Notion's Developer portal. The agent sees only the pages and databases you share with the connection. Recommended. |
| Personal access token (Notion) | Available | Acts as the person who created it and reaches every page they can open. Expires after 7 days to 1 year. |

Both go in the same field. The integration is included in every plan at no extra charge.

## Prerequisites

- **A Wiro API key** (see [Authentication](/docs/authentication)).
- **A deployed agent** (see [Agent Overview](/docs/agent-overview)).
- **A Notion workspace** where you are a **Workspace Owner** (to create an internal connection), or a member allowed to create personal access tokens.

## Setup

### Step 1: Create an internal connection and copy its token

1. Sign in to Notion as a Workspace Owner: only owners can create a connection.
2. Open the Developer portal at [app.notion.com/developers/connections](https://app.notion.com/developers/connections) (inside Notion: **Settings → Connections → Develop or manage connections**).
3. On the **Developer connections** tab, select **New connection**. Name it (for example `AI agent`), choose **API token** under **Authentication method**, and select **Create connection**. The connection belongs to the workspace you are in and cannot be moved, so switch workspaces in the sidebar first if needed.
4. Open the connection's **Configuration** tab and tick **Read content**, **Update content** and **Insert content**. Under user capabilities, **User information without email addresses** lets the agent look people up by name for person fields; **No user information** is enough otherwise. Comment capabilities are not used.
5. Select **Show** next to the **API token** and copy it. New tokens start with `ntn_`; tokens created before September 25, 2024 start with `secret_`.

> Notion asks integrators to treat tokens as opaque strings, so the only checks on save are that the value has no spaces and is 20 to 200 characters long.

### Step 2: Share pages with the connection

A new connection can see nothing. For each page or database the agent should use:

1. Open it in Notion and click **•••** at the top right.
2. Select **Connections**, click **+ Add connection**, search for your connection and confirm.

Sub-pages are shared with their parent, so sharing a top-level page shares everything under it. You can also choose pages on the connection's **Content access** tab with **Edit access** in the Developer portal.

### Step 2 (alternative): Use a personal access token

If you are not a Workspace Owner, a personal access token works in the same field:

1. Open the [Personal access tokens](https://www.notion.so/developers/tokens) page and select **New token**.
2. Give it a name, tick the **Notion API** capability, and choose an expiration: 7, 30, 90 or 180 days, or 1 year (the default).
3. Select **Create token** and copy the value right away: Notion shows it only once.

The token acts as you: it reaches every page you can open, with no sharing step, and stops working when it expires. On Free only Workspace Owners can create one, on Plus every member can, and on Business and Enterprise an admin decides who can. It cannot list workspace members, so filling person fields by name needs an internal connection.

### Step 3: Save the credential to Wiro

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/CredentialUpsert" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "fields": [
      { "credentialkey": "notion", "fieldname": "token", "fieldvalue": "YOUR_NOTION_API_TOKEN" }
    ]
  }'
```

Or fill it in the panel: **[My Agents](https://wiro.ai/panel/agents)** → open agent → **Connectors → Notion**.

### Step 4: Enable the skill

Notion ships **available but off**. Turn `int-notion-post` on for the agent:

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/SkillsApply" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "skills": { "int-notion-post": true },
    "idempotencyKey": "550e8400-e29b-41d4-a716-446655440000"
  }'
```

Or flip the toggle in the panel under **Skills** (see [Agent Skills](/docs/agent-skills#toggling-integration-skills)).

### Step 5: Start the agent

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Start" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "guid": "your-useragent-guid" }'
```

## Credential Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `token` | string (secret) | Yes | Notion internal connection API token (`ntn_...` or older `secret_...`) or personal access token. 20 to 200 characters, no spaces. Encrypted at rest. |

## Credentials schema (as returned by `POST /UserAgent/Detail`)

```json
"notion": {
  "_connected": true,
  "optional": false,
  "extra": false,
  "token": "••••••••"
}
```

On a custom build with `int-notion-post` on, `optional` and `extra` are `false`: Notion is that skill's own connector.

## What the agent can do

| Request | Notion API | What happens |
|---------|------------|--------------|
| Find pages and databases | `POST /v1/search` | Lists what the token can see by title, newest edit first, with links. |
| Read a page | `GET /v1/pages/{id}`, `GET /v1/pages/{id}/markdown`, `GET /v1/blocks/{id}/children` | Properties, the body as Markdown, or the blocks with their IDs. |
| Read a database | `GET /v1/databases/{id}`, `GET /v1/data_sources/{id}` | Its data sources and their schema: property names, types and options. |
| Query a database | `POST /v1/data_sources/{id}/query` | Rows matching a filter (text, select, status, dates, checkboxes, numbers, people, edit times), sorted, up to 100 per call. |
| Create a page | `POST /v1/pages` | Under a page, or as a database entry with properties; the body as Notion-flavored Markdown (up to 5,000 blocks) or as blocks (up to 100 per call). |
| Add to a page | `PATCH /v1/pages/{id}/markdown`, `PATCH /v1/blocks/{id}/children` | Markdown at the end or the start, or blocks at the end, the start or after a given block. |
| Edit text | `PATCH /v1/pages/{id}/markdown` (`update_content`) | Replaces an exact passage. Edits that would remove a child page or database are refused. |
| Update properties | `PATCH /v1/pages/{id}` | Changes only the properties sent: status, dates, tags, people, relations, title. |
| Tick a to-do or change a block | `PATCH /v1/blocks/{id}` | Changes one block. |
| Move to the trash | `PATCH /v1/pages/{id}` (`in_trash`), `DELETE /v1/blocks/{id}` | Only after your approval. Reversible from Notion's Trash; the API cannot delete permanently. |

## How the agent works with Notion

- **Approvals:** reading never needs approval. In chat, your request to create or change a page is the approval. In scheduled tasks, writes follow the agent's approval policy. Moving anything to the trash, replacing a whole page body, or erasing a page's content always needs your explicit yes for that page, and scheduled tasks never do it.
- **Databases and data sources:** since Notion-Version `2025-09-03`, a database holds one or more data sources. The agent reads the database, picks its data source and reads the schema before writing rows, so property names and option values match exactly.
- **Markdown or blocks:** long documents go in as Notion-flavored Markdown, which Notion turns into headings, lists, to-dos, quotes, code blocks, dividers, images, tables, callouts and toggles. When exact blocks matter, the agent builds them directly and respects Notion's limits: 100 blocks per request, two levels of nesting, 2,000 characters per text item.
- **Images** are added by URL. The URL must point straight at an image file over HTTPS and stay reachable.
- **Links:** every answer about a page carries its Notion link, and the agent replies with it.
- **Page content is data:** text inside a Notion page never acts as an instruction to the agent.

## Limits & billing

- **Rate limits:** Notion allows each connection 180 requests a minute (about 3 a second), or 600 on Business and Enterprise plans, plus a shared limit per workspace. Database queries have their own limit of about 3 a second. The agent works one call at a time and, when Notion answers 429, waits the time Notion gives and tries once more.
- **Free workspace blocks:** a Free workspace with more than one member can create 1,000 blocks in its lifetime. Three days after reaching that, Notion refuses new content from connections until a Workspace Owner upgrades the plan. Personal access tokens, paid plans and single-member Free workspaces are not limited this way.
- **Billing on Wiro:** every plan includes the integration, so it changes neither the agent's price nor its credits. As with every agent turn, its work is billed on the LLM tokens it uses, from the agent's existing credits.

## Troubleshooting

- **404 "object_not_found" or a page the agent cannot find:** the page is not shared with the connection. Open it in Notion, click **•••** → **Connections** → **+ Add connection** and pick the connection.
- **401 "unauthorized":** the token is wrong, was refreshed, or the personal access token expired or was revoked. Save the current token again.
- **403 "restricted_resource":** the connection is missing a capability (tick **Read content**, **Update content** and **Insert content** on its **Configuration** tab), or a Free workspace has used its 1,000 blocks.
- **400 "validation_error":** a property name, option value or block shape did not match. The agent reads the schema again and fixes the field.
- **429 "rate_limited":** too many requests; the agent waits and retries once.
- **Rows created in the wrong place:** a database link carries the database ID before `?v=`; the agent writes rows to the database's data source, never to a view.
- **Agent says "not connected" with the token filled:** the agent restarts to pick up new credentials; give it a moment after saving, then retry.

To revoke access, remove the connection from a page's **Connections** menu or delete the connection in the Developer portal. If a token leaks, select **Refresh** on the connection's **Configuration** tab and save the new token. Personal access tokens are revoked on the [Personal access tokens](https://www.notion.so/developers/tokens) page or by a workspace admin in **Settings → Connections**.

## Related

- [Agent Credentials & OAuth](/docs/agent-credentials)
- [Agent Skills](/docs/agent-skills)
- [GitBook Skills](/docs/integration-gitbook-skills): documentation edits through change requests
- [Google Drive Skills](/docs/integration-googledrive-skills): files and folders from Google Drive
- [Notion API reference](https://developers.notion.com/reference/intro)
