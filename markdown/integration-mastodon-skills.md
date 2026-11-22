# Mastodon Integration

Let your agent post to your own Mastodon server with an access token: posts within your server's limits, with visibility, content warnings, polls, images and videos with alt text, threads and scheduled posts, and a look at how your posts are doing.

## Overview

[Mastodon](https://joinmastodon.org) is a decentralized social network: each account lives on a server (an instance) that sets its own rules and limits. This integration connects an agent to your account on your server with an access token from an application you create in your own account settings. The agent reads your server's limits first, writes the post within them, shows it to you for approval as the agent's approval policy says, then publishes it. It can also schedule a post on the server, delete a post you approve and read the favourites, boosts, replies and quotes of your recent posts.

**Skills that use this integration:**

- `int-mastodon-post`: Posts on your server within its character, media and alt text limits, with visibility, content warnings, language and polls, images and videos with alt text, threads and replies, scheduled posts, an idempotency key against duplicates, deleting a post after your approval, and reading your recent posts with their numbers.

**Agents that typically enable this integration:**

- [Social Manager](https://wiro.ai/agents/social-manager): posts each approved item to Mastodon next to your other networks, adapted to your server's limits and to Mastodon's hashtag-led discovery.
- Custom agents that publish announcements, release notes, open source updates or community news.

## Availability

| Mode | Status | Notes |
|------|--------|-------|
| Server Address + Access Token (Mastodon) | Available | Any Mastodon server reachable over `https://`. The steps below are Mastodon's own; other servers that offer the same API and settings page can work too. The integration is included in every plan at no extra charge. |

## Prerequisites

- **A Wiro API key** (see [Authentication](/docs/authentication)).
- **A deployed agent** (see [Agent Overview](/docs/agent-overview)).
- **A Mastodon account** on a server that serves `https://`. Check the server's rules on its About page: many servers ask accounts that post automatically to be marked as bots in their profile.

## Setup

### Step 1: Create an application and copy its access token

1. Sign in to your Mastodon account in a web browser.
2. Open **Preferences** (the gear icon in the menu), then **Development** in the menu on the left. The page is `https://your-server/settings/applications`.
3. Click **New application**.
4. **Application name:** some apps show it next to your posts, so use a name you are happy for followers to see, such as your brand or `Publishing`. **Application website** can stay empty. Leave **Redirect URI** as it is (`urn:ietf:wg:oauth:2.0:oob`).
5. Under **Scopes**, tick these four, and leave the broad `read`, `write` and `follow` boxes unticked (the `profile` box ticked by default can stay):

   | Scope | Why |
   |-------|-----|
   | `read:accounts` | Read your own account: its id and default visibility. |
   | `read:statuses` | Read your posts, including followers-only ones and scheduled posts. |
   | `write:media` | Upload images and videos with their alt text. |
   | `write:statuses` | Publish, schedule and delete posts. |

6. Click **Submit**, then click the new application's name in the list.
7. Copy **Your access token**. On Mastodon it is a string of 43 letters, digits, `-` and `_`. The **Client key** and **Client secret** are not needed.
8. Note the server address: the start of the address bar, such as `https://mastodon.social` (your handle `@name@mastodon.social` shows it too).

> The token does not expire. To revoke the agent's access, delete the application under **Development**, or click **Regenerate access token** on its page and save the new token. **Account** → **Authorized apps** lists it too, with a **Revoke** button. Changing the application's scopes also gives it a new token, which must be saved again.

### Step 2: Save the credential to Wiro

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/CredentialUpsert" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "fields": [
      { "credentialkey": "mastodon", "fieldname": "instanceurl", "fieldvalue": "https://mastodon.social" },
      { "credentialkey": "mastodon", "fieldname": "token", "fieldvalue": "YOUR_MASTODON_ACCESS_TOKEN" }
    ]
  }'
```

Or fill it in the panel: **[My Agents](https://wiro.ai/panel/agents)** → open agent → **Connectors → Mastodon**.

The server address must start with `https://`. A link to your profile, such as `https://mastodon.social/@name`, works as well: only the server address is used, and the agent's posts and token go to that server only.

### Step 3: Enable the skill

Mastodon ships **available but off**. Turn `int-mastodon-post` on for the agent:

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/SkillsApply" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "skills": { "int-mastodon-post": true },
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

### Setup from chat

With setup cards on, a person can ask the agent in chat to post to Mastodon. The agent then proposes an `add` card for `int-mastodon-post` and a `connect` card for `mastodon`, whose mode is `key`: your UI shows a form with the two fields of [Credential Fields](#credential-fields), and `SetupCardApply` takes them as `values` (see [Key mode](/docs/agent-chat-integration#key-serper-web-search)):

```json
{
  "useragentguid": "your-useragent-guid",
  "messageguid": "c3d4e5f6-a7b8-9012-cdef-345678901234",
  "cardid": "h6w3k9p2m5tc",
  "action": "apply",
  "values": { "instanceurl": "https://mastodon.social", "token": "YOUR_MASTODON_ACCESS_TOKEN" }
}
```

A value in the wrong shape is refused with the field's message, such as `Server Address has an invalid format` for an `http://` address, and the card stays pending. With only one of the two fields, the answer is `Saved <field> for Mastodon. Still needed: <field>.` and the card waits for the other.

## Credential Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `instanceurl` | string (URL) | Yes | Your server's address, starting with `https://`, such as `https://mastodon.social`. A profile link is accepted; only the server address is used. Not a secret: it is shown as saved. |
| `token` | string (secret) | Yes | The access token of the application you created (20 to 512 letters, digits and `-._~+/=`). Encrypted at rest. |

## Credentials schema (as returned by `POST /UserAgent/Detail`)

```json
"mastodon": {
  "_connected": true,
  "optional": false,
  "extra": false,
  "instanceurl": "https://mastodon.social",
  "token": "••••••••"
}
```

On a custom build with `int-mastodon-post` on, `optional` and `extra` are `false`: Mastodon is that skill's own connector.

## What the agent can do

The agent calls the Mastodon REST API on your server with your access token.

| Action | Mastodon API | Limits and notes |
|--------|--------------|------------------|
| Read the server's limits | `GET /api/v2/instance` (`/api/v1/instance` on servers before Mastodon 4.0) | Characters per post, what a link counts as, media per post, alt text length, image and video size and pixels, video frame rate, file types and poll limits. Read before every post. |
| Post | `POST /api/v1/statuses` | Within the server's character limit (500 on most servers), counted the way the server counts: the content warning plus the text, each link as 23 characters (or the server's own number) and `@name@server` as `@name`. Visibility `public`, `unlisted`, `private` (followers only) or `direct`; content warning; sensitive media; language; an `Idempotency-Key` so a repeated request within an hour returns the same post. |
| Images and videos | `POST /api/v2/media`, then `GET /api/v1/media/:id` until processed | Up to the server's media limit (usually 4), each with alt text, within the server's size limits (16 MB for images and 99 MB for videos on mastodon.social). |
| Polls | `poll` on the post | 2 to the server's maximum options (usually 4, 50 characters each), open from 5 minutes to about a month. A post has media or a poll, not both. |
| Scheduled posts | `scheduled_at` on the post; `GET`, `PUT` and `DELETE /api/v1/scheduled_statuses` | More than 5 minutes ahead; Mastodon keeps up to 25 scheduled posts per day and 300 in total. A thread cannot be scheduled, since a reply needs a parent that is already posted. |
| Threads and replies | `in_reply_to_id` on the post | A thread posts part by part and stops at the first failure. A reply to someone else's post goes out only when you ask for it, and starts with their `@name@server`. |
| Delete a post | `DELETE /api/v1/statuses/:id` | Only a post of the connected account, only after you see it and say yes to that post. It cannot be undone. |
| Read your posts | `GET /api/v1/accounts/:id/statuses`, `GET /api/v1/statuses/:id` and `/context` | Favourites, boosts, replies and quotes (quotes on Mastodon 4.5 and later) of each post, and its replies. Mastodon does not give view counts. |

Not supported: editing a post, quote posts, direct messages beyond `direct` visibility, and servers that are not reachable over `https://`.

## How posting works

- **Approval.** The agent follows its approval policy. By default it shows the post first (the text with its character count and the server's limit, the visibility, the content warning, each image or video with its alt text, the poll, a scheduled time in your time zone, and every post of a thread) and publishes after your approval. An agent admin can switch the policy to post automatically, also for Mastodon alone. Deleting always needs your yes for that post, whatever the policy says.
- **Your server's limits.** The agent reads them from the server before posting and checks the draft against them, so a post that fits one server is never assumed to fit another.
- **Rate limits.** Mastodon allows 300 requests per 5 minutes, 30 media uploads per 30 minutes and 30 deletes per 30 minutes for an account by default; a server can set its own. When one is hit, the agent stops and says when it can go on.
- **No duplicates.** Every post carries an idempotency key. When the server does not answer whether a post went through, the agent checks your latest posts before anything else and never posts the same thing twice on its own.

## Cost & billing

- **Mastodon:** free; your server's admins set its rules and limits.
- **The agent:** every plan includes the integration, so it changes neither the agent's price nor its credits. As with every agent turn, its work is billed on the LLM tokens it uses, from the agent's existing credits.

## Troubleshooting

- **401 "The access token is invalid":** the token was regenerated or revoked, or the application was deleted. Copy the current token from the application's page and save it.
- **403 "This action is outside the authorized scopes":** the application is missing a scope. Tick `read:accounts`, `read:statuses`, `write:media` and `write:statuses` on it, then save the new token the change gives it.
- **422 "Validation failed":** the post broke a server rule, such as its character limit; nothing was posted. The agent fixes the draft and shows it again first when the policy asks for approval.
- **Media "still processing":** a video can take a minute or more on the server; the agent waits and posts once it is ready.
- **413:** the file is bigger than your server takes.
- **429:** a rate limit was hit; the agent stops and continues later.
- **The server does not answer:** Mastodon servers are run by their own admins; check the server's status, then retry later.
- **Agent says "not connected" with both fields filled:** the agent restarts to pick up new credentials; give it a moment after saving, then retry.

## Related

- [Agent Credentials & OAuth](/docs/agent-credentials)
- [Agent Skills](/docs/agent-skills)
- [Bluesky Integration](/docs/integration-bluesky-skills)
- [Twitter / X Skills](/docs/integration-twitter-skills)
- [LinkedIn Skills](/docs/integration-linkedin-skills)
