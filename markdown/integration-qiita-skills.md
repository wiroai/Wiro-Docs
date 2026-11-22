# Qiita Integration

Let your agent write and post technical articles on Qiita with your own access token: new articles are saved as limited-share articles for your review, go public only after you approve, and your own articles' likes, stocks, comments and page views are one question away.

## Overview

[Qiita](https://qiita.com) is a Japanese site where engineers share technical articles. This integration lets an agent work with your own Qiita account through the Qiita API v2: it writes articles in Qiita Markdown, saves them as limited-share articles, makes them public after your approval, updates existing articles and their tags, and reports how your articles are doing.

**Skills that use this integration:**

- `int-qiita-post`: Writes Qiita articles (Qiita Markdown, 1 to 5 tags with versions), saves new ones as limited-share articles, makes an article public only after approval, updates articles, searches Qiita for existing articles on a topic, and lists your own articles with likes, stocks, comments and page views.

**Agents that typically enable this integration:**

- Custom developer relations and technical writing agents that publish for Japanese developers.
- Blog Content Editor style agents that cross-post a technical article to Qiita next to the company blog.

## Availability

| Mode | Status | Notes |
|------|--------|-------|
| API Key (personal access token) | Available | Your own Qiita personal access token with the `read_qiita` and `write_qiita` scopes. The integration is included in every plan at no extra charge, and Qiita's API is free. Qiita Team (team sites such as `your-team.qiita.com`) is not supported. |

## Prerequisites

- **A Wiro API key** (see [Authentication](/docs/authentication)).
- **A deployed agent** (see [Agent Overview](/docs/agent-overview)).
- **A Qiita account** at [qiita.com](https://qiita.com). Accounts are free and the API needs no paid plan.

## Setup

### Step 1: Create a Qiita access token

1. Sign in at [qiita.com](https://qiita.com) with the account the articles should appear under.
2. Click your profile icon at the top right, choose **設定** (Settings), then **アプリケーション** (Applications). The page is also at [qiita.com/settings/applications](https://qiita.com/settings/applications).
3. Under **個人用アクセストークン** (Personal access tokens), click **新しくトークンを発行する** (Generate new token). [This link](https://qiita.com/settings/tokens/new?read_qiita=1&write_qiita=1&description=AI%20agent) opens the same form with both scopes already ticked.
4. Enter a description you will recognize later, such as `AI agent`.
5. Tick **read_qiita** and **write_qiita**. Leave **read_qiita_team** and **write_qiita_team** off: Qiita Team is not supported.
6. Issue the token and copy it at once: Qiita shows it only this one time. It is a string of digits and the lowercase letters a to f, 40 characters long; 64 characters, the length in Qiita's API examples, is accepted too.

> To revoke access, delete the token on the same **アプリケーション** page; the agent stops working with Qiita at once.

### Step 2: Save the credential to Wiro

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/CredentialUpsert" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "fields": [
      { "credentialkey": "qiita", "fieldname": "token", "fieldvalue": "YOUR_QIITA_ACCESS_TOKEN" }
    ]
  }'
```

Or fill it in the panel: **[My Agents](https://wiro.ai/panel/agents)** → open agent → **Connectors → Qiita**.

A value that is not 40 or 64 characters of digits and the letters a to f is refused when you save it; a space or line break around it is trimmed.

### Step 3: Enable the skill

Qiita ships **available but off**. Turn `int-qiita-post` on for the agent:

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/SkillsApply" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "skills": { "int-qiita-post": true },
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
| `token` | string (secret) | Yes | Qiita personal access token with `read_qiita` and `write_qiita`: 40 (or 64) digits and lowercase letters a to f. Encrypted at rest. |

## Credentials schema (as returned by `POST /UserAgent/Detail`)

```json
"qiita": {
  "_connected": true,
  "optional": false,
  "extra": false,
  "token": "••••••••"
}
```

On a custom build with `int-qiita-post` on, `optional` and `extra` are `false`: Qiita is that skill's own connector.

## How publishing works

Qiita's API has no drafts. A **limited-share article** (限定共有) is the closest thing: only you and people who have its link can open it, and search engines do not list it. So the agent works in two steps:

1. **Saved as limited share.** When you ask the agent to write or post an article, it saves it as a limited-share article and sends you its link. You read it on Qiita exactly as readers will see it.
2. **Public after approval.** The agent makes it public only when you say so (publish, 公開して, 全体に公開), following the agent's approval policy. With the policy set to automatic, a scheduled run posts the article public directly.

Things Qiita decides that the agent tells you before it publishes:

- **Public is final.** Qiita cannot turn a public article back into a limited-share one. Only deleting it takes it down, and its likes, stocks and comments go with it.
- **The edit history goes public too.** Every revision saved while the article was limited becomes visible in its edit history once it is public. If an earlier revision held something that should not be seen, the agent offers to post the final text as a new public article and delete the limited one instead.
- **Mentions wait.** `@user` mentions in the article notify those users only when it goes public.
- **Organization on public articles only.** A limited-share article cannot be linked to a Qiita Organization; the agent links it when the article goes public. The agent never joins posting campaigns, which need your own agreement to the campaign terms on qiita.com.
- **Edits to a public article go live at once**, so the agent shows the change and waits for your approval first.

## What the agent can do

| Request | Qiita API | What happens |
|---------|-----------|--------------|
| Check the account | `GET /api/v2/authenticated_user` | Account id, article and follower counts, the image upload allowance of Qiita's editor. |
| Write and save an article | `POST /api/v2/items` with `private: true` | A limited-share article; you get its link. |
| Make it public | `GET` then `PATCH /api/v2/items/:item_id` with `private: false` | The same article, now public. |
| Update an article | `PATCH /api/v2/items/:item_id` | New body, title or tags; a limited article stays limited and a public one stays public. |
| Your articles with numbers | `GET /api/v2/authenticated_user/items` | Up to 100 per page, newest first, limited-share ones included: likes, stocks and comments, sorted as you ask. |
| Page views | `GET /api/v2/items/:item_id` | Qiita leaves view counts out of lists and gives them when you read your own article on its own, so the agent reads them one article at a time (20 per question unless you ask for more). |
| Tags | `GET /api/v2/tags/:tag_id`, `GET /api/v2/tags?sort=count` | How many articles carry a tag and how many people follow it, to pick existing tags. |
| Search Qiita | `GET /api/v2/items?query=...` | Existing articles on a topic (`tag:`, `title:`, `stocks:>`, `created:>=` and other Qiita search terms), so the agent does not repeat them. |
| Delete an article | `DELETE /api/v2/items/:item_id` | Only when you ask for that article and confirm; the API cannot bring it back. |

## Writing for Qiita's readers

- **Language and tone:** the agent writes in the language you ask for, in your tone. Most Qiita readers read Japanese; when you write in another language without naming one, the agent writes in yours and offers a Japanese version. In Japanese it keeps one style all the way (です・ます or だ・である).
- **Titles** are concrete and searchable: the technology and the result. **Structure** follows what Qiita readers expect: an introduction, the environment with versions, the steps with code, the result, a summary and references.
- **Qiita Markdown:** code blocks with the language and file name (` ```python:main.py `), `:::note info|warn|alert` boxes, math, Mermaid and PlantUML diagrams, footnotes, tables and collapsible sections.
- **Tags:** 1 to 5 per article, each with optional versions (for example `Python` with `3.12`). The agent uses tags that already exist on Qiita.
- **Facts and sources:** Qiita's community guideline asks that AI-written text be checked before it is posted, and forbids articles whose main purpose is advertising. The agent checks every command, version and API name against sources it reads, lists them in the preview, and keeps articles technical.
- **Images:** Qiita's API cannot upload images. The agent uses images that already have a lasting public link and marks where you can drag an image in with Qiita's editor.

## Limits & billing

- **Rate limit:** Qiita allows 1,000 API requests per hour with a token. The agent reads the remaining count from Qiita's answers, skips optional reads when few are left, and on HTTP 429 stops and says when the hour resets.
- **Qiita Team** (team sites, groups, co-editing, emoji reactions) is not supported.
- **Billing on Wiro:** every plan includes the integration, so it changes neither the agent's price nor its credits. As with every agent turn, its work is billed on the LLM tokens it uses, from the agent's existing credits. Qiita's API is free.

## Troubleshooting

- **401 Unauthorized:** the token is wrong or was deleted. Issue a new one at [qiita.com/settings/applications](https://qiita.com/settings/applications) and save it again.
- **403 Forbidden:** the token lacks `write_qiita`, or the article belongs to someone else. Issue a token with both scopes.
- **400 or 422 with a message:** Qiita refused the content, for example more than 5 tags or an Organization on a limited-share article. The agent fixes what the message names.
- **404 Not Found:** the article id is wrong or the article was deleted.
- **429:** the hourly limit is used up; the agent says when it resets.
- **An article went public by mistake:** Qiita cannot make it limited again. Ask the agent to delete it, then to save the text again as a limited-share article.
- **Page views show "-":** Qiita gives view counts only for your own articles, read one at a time. Ask for page views and the agent reads them.
- **A Qiita Team site:** not supported; the integration works with qiita.com.
- **Agent says "not connected" with the token filled:** the agent restarts to pick up new credentials; give it a moment after saving, then retry.

## Related

- [Agent Credentials & OAuth](/docs/agent-credentials)
- [Agent Skills](/docs/agent-skills)
- [WordPress Skills](/docs/integration-wordpress-skills): your own blog
- [Qiita API v2 documentation](https://qiita.com/api/v2/docs)
- [Qiita help: limited-share articles](https://help.qiita.com/ja/articles/qiita-private-article)
