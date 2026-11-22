# dev.to Integration

Let your agent write and publish articles on dev.to (DEV Community) with your own API key: drafts first, published when you say so, plus your articles' page views, reactions and comments.

## Overview

[dev.to](https://dev.to) is the DEV Community, a publishing platform for developers built on Forem. This integration connects an agent to your own dev.to account through the Forem API v1. The agent writes the article in Markdown, saves it as a draft, shows it to you with its preview link, and publishes it only when you say publish. It can also edit your articles, list your drafts and published articles with their stats, and read your analytics over a date range.

**Skills that use this integration:**

- `int-devto-post`: Draft-first dev.to publishing. Creates unpublished articles (title, Markdown body, up to 4 tags, cover image by URL, canonical URL for cross-posts, series, organization), shows the preview and edit links, publishes on your approval, edits articles, lists your drafts and published articles with page views, reactions and comments, and reads daily analytics for your account, one article or an organization. Every article carries the AI disclosure dev.to requires.

**Agents that typically enable this integration:**

- Custom blogging, developer relations and content marketing agents that publish technical articles.
- Agents that already publish to WordPress or Hashnode and cross-post to dev.to with a canonical link back to the original.

## Availability

| Mode | Status | Notes |
|------|--------|-------|
| API Key (DEV Community) | Available | Your own dev.to API key from Settings → Extensions. dev.to and its API are free. The integration is included in every plan at no extra charge. |

## Prerequisites

- **A Wiro API key** (see [Authentication](/docs/authentication)).
- **A deployed agent** (see [Agent Overview](/docs/agent-overview)).
- **A dev.to account** that the articles should appear under. To post under an organization, the account must be a member of it.

## Setup

### Step 1: Generate a dev.to API key

1. Sign in at [dev.to](https://dev.to/enter) with the account the articles should appear under.
2. Open your avatar menu → **Settings** → **Extensions** ([dev.to/settings/extensions](https://dev.to/settings/extensions)) and scroll to **DEV Community API Keys**.
3. Under **Generate a new Key**, type a **Description** such as "AI agent" and click **Generate API Key**.
4. Copy the new key from **Active API keys**. It is 24 letters and digits.

> The key acts as your account: anyone with it can create and edit your articles, so keep it private. An account can hold up to 10 keys. To cut access, click **Revoke** next to the key on the same page.

### Step 2: Save the credential to Wiro

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/CredentialUpsert" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "fields": [
      { "credentialkey": "devto", "fieldname": "apikey", "fieldvalue": "YOUR_DEV_API_KEY" }
    ]
  }'
```

Or fill it in the panel: **[My Agents](https://wiro.ai/panel/agents)** → open agent → **Connectors → dev.to**.

A value shorter than 20 or longer than 64 characters, or with anything other than letters and digits (a space, quotes, a pasted `api-key:` prefix), is refused when you save it.

### Step 3: Enable the skill

dev.to ships **available but off**. Turn `int-devto-post` on for the agent:

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/SkillsApply" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "skills": { "int-devto-post": true },
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
| `apikey` | string (secret) | Yes | DEV Community API key from Settings → Extensions, 24 letters and digits (20 to 64 accepted). Encrypted at rest. |

## Credentials schema (as returned by `POST /UserAgent/Detail`)

```json
"devto": {
  "_connected": true,
  "optional": false,
  "extra": false,
  "apikey": "••••••••"
}
```

## What the agent can do

The agent calls the Forem API v1 at `https://dev.to/api/` with your key in the `api-key` header.

| Request | dev.to endpoint | What happens |
|---------|-----------------|--------------|
| Save a draft | `POST /api/articles` with `published: false` | A new unpublished article: title, Markdown body, up to 4 tags, cover image URL, canonical URL, series, description, organization and AI disclosure. Nothing is public yet. |
| Publish | `PUT /api/articles/{id}` with `published: true` | The draft goes live and gets its final address, which the agent reports. Only after your approval. |
| Edit | `PUT /api/articles/{id}` | Changes only the fields sent: title, body, tags, cover, canonical URL, series, AI disclosure. Editing a published article changes it live, so the agent does it only when you ask. |
| Unpublish | `PUT /api/articles/{id}` with `published: false` | Only when you ask: the article goes back to your drafts; its comments stay. |
| List your articles | `GET /api/articles/me/all`, `/me/published`, `/me/unpublished` | Drafts and published articles, with lifetime page views, reactions and comments for each published one. dev.to shows page views to the author only. |
| Analytics by date | `GET /api/analytics/historical` | Daily page views, reactions, comments, new followers and average read time for your account, one article or an organization. |
| Find an organization | `GET /api/organizations/{username}` | The organization's id, to post under it. |

dev.to's API cannot delete articles: you delete them on dev.to. The agent never comments, reacts or follows on your behalf.

## How publishing works

- **Drafts first.** Asked to write, post, share or save an article to dev.to, the agent saves a draft and replies with its preview link (it opens for you while you are signed in to dev.to), the edit link, tags, cover, canonical URL and AI disclosure, and a short summary. It publishes only when you say publish, go live or make it public.
- **Scheduled tasks** follow the agent's approval policy: by default a scheduled article waits as a draft for your approval in chat; with automatic approval it publishes and reports afterwards.
- **Your language and tone.** The article is written in the language you ask for (or the one you write in), following your content tone settings when the agent has them.
- **Markdown only, no front matter.** dev.to lets a YAML front matter block at the top of the body override the article's fields, including `published`. The agent never sends one: when you hand over Markdown with front matter, it moves the title, tags, cover, canonical URL and series into the article's fields and drops the block.
- **Cross-posting.** When the article first appeared on your own blog, the agent sets `canonical_url` to the original post so search engines credit it.
- **Organizations.** The agent looks up the organization's id by its dev.to username. If your account is not a member, dev.to silently posts under your account alone; the agent checks and tells you.

## AI disclosure

dev.to asks automated clients to disclose AI use on every article, and the agent always does:

| `ai_disclosure_level` | When the agent uses it |
|-----------------------|------------------------|
| `fully_autonomous` | The agent wrote the article, even when you asked for it, reviewed it or approved it. The default for articles the agent drafts. |
| `some_ai` | You wrote the article or meaningfully rewrote the agent's draft, and the agent helped with drafting, code, editing or translation. |
| `no_ai` | Only when you wrote it with no AI help and say so. |

The agent never leaves the field out (dev.to would record `not_disclosed`) and never uses `no_ai` for text it wrote, edited or translated.

## Limits

- **Article fields:** title up to 128 characters (the same title cannot be reused on your account within 5 minutes); up to 4 tags of letters and digits only, up to 30 characters each; body up to 800 KB; the cover shows at 1000 x 420.
- **Rate limits:** about one write per second; roughly 10 new articles per 30 seconds, and fewer for accounts only a few days old; 30 edits per 30 seconds; reads with a key 4 per second and 40 per minute. When dev.to answers 429 the agent waits once, tries once more and otherwise tells you to try again shortly; it never loops.

## Billing

Every plan includes the integration, so it changes neither the agent's price nor its credits. As with every agent turn, its work is billed on the LLM tokens it uses, from the agent's existing credits. dev.to itself is free.

## Troubleshooting

- **401 unauthorized:** the key is wrong or was revoked. Generate a new key on [dev.to/settings/extensions](https://dev.to/settings/extensions) and save it again.
- **422 "Title has already been used in the last five minutes":** an earlier attempt already saved the draft; the agent finds it in your drafts instead of creating another.
- **422 about tags:** more than 4 tags, or a tag with spaces, hyphens or other characters than letters and digits.
- **404 on an edit:** the article is not your account's own, or the id is wrong.
- **429:** dev.to's rate limit; wait a moment and ask again.
- **Posted under your account instead of the organization:** your account is not a member of that organization; an organization admin adds you on dev.to.
- **Agent says "not connected" with the key filled:** the agent restarts to pick up new credentials; give it a moment after saving, then retry.

## Related

- [Agent Credentials & OAuth](/docs/agent-credentials)
- [Agent Skills](/docs/agent-skills)
- [Hashnode Skills](/docs/integration-hashnode-skills) / [WordPress Skills](/docs/integration-wordpress-skills): other blogs the agent can publish to
- [Forem API v1 documentation](https://developers.forem.com/api/v1)
