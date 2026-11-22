# Hashnode Integration

Let your agent write and publish posts on your Hashnode blog with your own Personal Access Token: drafts first, published when you say so, plus your posts' views, reactions and comments.

## Overview

[Hashnode](https://hashnode.com) is a blogging platform for developers and technical teams. This integration connects an agent to your blog through Hashnode's GraphQL API with your own Personal Access Token. The agent writes the post in Markdown, saves it as a draft, shows it to you in chat, and publishes it only when you say publish. It can also edit drafts and published posts, list your posts with their stats and list your drafts.

**Hashnode Pro is required.** Since May 13, 2026, Hashnode's API works only for blogs on [Hashnode Pro](https://hashnode.com/pro), for reading and publishing alike. A blog without Pro gets an error on every call, and the agent tells you so instead of retrying.

**Skills that use this integration:**

- `int-hashnode-post`: Draft-first Hashnode publishing. Saves drafts (title, subtitle, Markdown body, tags, cover image by URL, canonical URL for cross-posts, series, SEO title and description), shows them in chat with the editor link, publishes on your approval (or in one step when you ask to publish directly), edits drafts and posts, lists your posts with views, reactions and comments, and lists your drafts.

**Agents that typically enable this integration:**

- Custom blogging, developer relations and content marketing agents that publish technical articles.
- Agents that already publish to WordPress or dev.to and cross-post to Hashnode with a canonical link back to the original.

## Availability

| Mode | Status | Notes |
|------|--------|-------|
| Personal Access Token (Hashnode) | Available | Your own token from Account Settings → Developer, plus your blog's address. The blog must be on Hashnode Pro ($5 a month or $50 a year, per seat), which Hashnode bills to you. The integration is included in every plan at no extra charge. |

## Prerequisites

- **A Wiro API key** (see [Authentication](/docs/authentication)).
- **A deployed agent** (see [Agent Overview](/docs/agent-overview)).
- **A Hashnode blog on Hashnode Pro.** Upgrade in your blog dashboard under **Billing** → **Upgrade to Pro**; the API works as soon as checkout succeeds.
- **A Hashnode account that can publish on the blog:** its owner, or an Editor on a team blog. A Contributor can save drafts and send them to the blog's editors for review, but cannot publish.

## Setup

### Step 1: Generate a Personal Access Token

1. Sign in at [hashnode.com](https://hashnode.com) with the account that writes on the blog.
2. Open your profile menu → **Account Settings** → **Developer** ([hashnode.com/settings/developer](https://hashnode.com/settings/developer)).
3. Click **Generate new token** and copy the token. It looks like `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`.

> The token acts as your account on every blog you belong to: it can publish, edit and delete posts, so keep it private. To cut access, revoke it on the same Developer page.

### Step 2: Note your blog's address

The blog's address without `https://` and without a slash at the end, exactly as your browser shows it:

- a blog on Hashnode's domain: `yourname.hashnode.dev`
- a blog on your own domain: that domain, such as `blog.example.com`

### Step 3: Save the credential to Wiro

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/CredentialUpsert" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "fields": [
      { "credentialkey": "hashnode", "fieldname": "token", "fieldvalue": "YOUR_HASHNODE_TOKEN" },
      { "credentialkey": "hashnode", "fieldname": "publicationhost", "fieldvalue": "yourname.hashnode.dev" }
    ]
  }'
```

Or fill it in the panel: **[My Agents](https://wiro.ai/panel/agents)** → open agent → **Connectors → Hashnode**.

A token with a space (for example a pasted `Bearer ` prefix) or quotes, and an address with `https://`, a path or a port, are refused when you save them.

### Step 4: Enable the skill

Hashnode ships **available but off**. Turn `int-hashnode-post` on for the agent:

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/SkillsApply" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "skills": { "int-hashnode-post": true },
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
| `token` | string (secret) | Yes | Hashnode Personal Access Token from Account Settings → Developer, the bare token without `Bearer`. Encrypted at rest. |
| `publicationhost` | string | Yes | The blog's address without `https://`: `yourname.hashnode.dev` or a custom domain such as `blog.example.com`. The agent looks up the blog's id from it. |

## Credentials schema (as returned by `POST /UserAgent/Detail`)

```json
"hashnode": {
  "_connected": true,
  "optional": false,
  "extra": false,
  "token": "••••••••",
  "publicationhost": "yourname.hashnode.dev"
}
```

## What the agent can do

The agent calls Hashnode's GraphQL API at `https://gql-beta.hashnode.com` with your token in the `Authorization` header.

| Request | GraphQL operation | What happens |
|---------|-------------------|--------------|
| Find the blog | `publication(host:)` | The blog's id, title and URL from its address. This first call also shows whether the blog is on Pro. |
| Save a draft | `createDraft` | A draft with title, subtitle, Markdown body, tags, cover image URL, canonical URL, series and SEO fields. Nothing is public yet. |
| Publish a draft | `publishDraft` | The draft becomes a post on your blog; the agent reports its URL. Only after your approval. |
| Publish directly | `publishPost` | Only when you ask to publish right away: the post goes out in one step, without a draft. |
| Edit | `updateDraft`, `updatePost` | Changes only the fields sent. Editing a published post changes it live, so the agent does it only when you ask. |
| List posts | `publication.posts` | Your blog's posts, newest first, with views, reactions (likes), comments and replies. |
| List drafts | `publication.drafts` | Your own drafts on the blog, with their editor links. |
| Read one draft or post | `draft(id:)`, `publication.post(slug:)` | The full Markdown and details, to show or edit it. |
| Series | `publication.seriesList` | The blog's series, to add a post to one. |
| Team blogs | `submitDraftForReview` | For a Contributor: hands a draft to the blog's editors. |

The agent never deletes posts or drafts and never emails your newsletter subscribers unless you ask for exactly that; you delete posts in Hashnode.

## How publishing works

- **Drafts first.** Asked to write, post, share or save an article to Hashnode, the agent saves a draft and shows it in chat: title, subtitle, tags, cover, canonical URL, a short summary and the editor link (it opens for you while you are signed in). It publishes only when you say publish, go live or make it public.
- **Scheduled tasks** follow the agent's approval policy: by default a scheduled post waits as a draft for your approval in chat; with automatic approval it publishes and reports afterwards.
- **Your language and tone.** The post is written in the language you ask for (or the one you write in), following your content tone settings when the agent has them.
- **Cross-posting.** When the article first appeared elsewhere, the agent sets `originalArticleURL` so search engines credit the original.
- **No scheduling through the API.** Hashnode's API can backdate a moved post but cannot schedule one; for a later time the agent keeps the draft and publishes it then.

## Limits

- **Requests:** up to 100 KB each, so a very long post may need shortening; up to 15 tags per post (the agent keeps it to about 5).
- **Lists:** up to 100 posts or 50 drafts per page; the agent pages on.
- **Stats:** views, reactions, comments and replies are lifetime numbers; Hashnode's API has no stats by date. A view count Hashnode does not report shows as "not shown", never 0.
- **Freshness:** Hashnode may serve a list up to about 25 seconds old, so right after a change the agent trusts the change's own answer.
- **Rate limits:** Hashnode publishes targets of 20,000 queries and 500 changes per minute; the agent sends each call once and never loops.

## Billing

Every plan includes the integration, so it changes neither the agent's price nor its credits. As with every agent turn, its work is billed on the LLM tokens it uses, from the agent's existing credits. Hashnode Pro, which the API needs, is your own subscription with Hashnode.

## Troubleshooting

- **"Publication does not have an active Pro plan":** the blog is not on Hashnode Pro. Upgrade in your blog dashboard under **Billing** → **Upgrade to Pro**; the API works right after checkout.
- **"You must be logged in" or "Authentication required":** the token is wrong or was revoked. Generate a new one on [hashnode.com/settings/developer](https://hashnode.com/settings/developer) and save it again.
- **"Publication not found":** the saved address is not your blog's host. Use the bare host (`yourname.hashnode.dev` or your custom domain), with no `https://` and no slash; the agent lists the blogs your account owns to help.
- **FORBIDDEN without the Pro message:** your account cannot publish on this blog (a Contributor on a team blog). The agent can send the draft to the blog's editors for review.
- **Agent says "not connected" with the fields filled:** the agent restarts to pick up new credentials; give it a moment after saving, then retry.

## Related

- [Agent Credentials & OAuth](/docs/agent-credentials)
- [Agent Skills](/docs/agent-skills)
- [dev.to Skills](/docs/integration-devto-skills) / [WordPress Skills](/docs/integration-wordpress-skills): other blogs the agent can publish to
- [Hashnode GraphQL API agent skill (official)](https://github.com/Hashnode/gql-skill)
