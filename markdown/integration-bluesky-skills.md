# Bluesky Integration

Let your agent post to Bluesky with your own handle and an app password: text posts with working links, mentions and hashtags, images with alt text, link cards and threads, and a look at how your posts are doing.

## Overview

[Bluesky](https://bsky.app) is a social network built on the AT Protocol. This integration connects an agent to your Bluesky account with an app password, a separate password Bluesky makes for apps, so the agent never holds your real password. The agent writes the post, shows it to you for approval as the agent's approval policy says, then publishes it. It can also delete a post you approve and read the likes, reposts, replies and quotes of your recent posts.

**Skills that use this integration:**

- `int-bluesky-post`: Text posts up to 300 characters with clickable links, @mentions and #hashtags, up to 4 images per post with alt text, link cards, threads and replies, deleting a post after your approval, and reading your recent posts with their numbers.

**Agents that typically enable this integration:**

- [Social Manager](https://wiro.ai/agents/social-manager): posts each approved item to Bluesky next to your other networks, adapted to Bluesky's length and style.
- Custom agents that publish announcements, product news, releases or event updates.

## Availability

| Mode | Status | Notes |
|------|--------|-------|
| Handle + App Password (Bluesky) | Available | Accounts hosted by Bluesky: every account made on bsky.app with the default hosting provider (Bluesky Social). Accounts on a self-hosted or another provider's server are not supported yet. The integration is included in every plan at no extra charge. |

## Prerequisites

- **A Wiro API key** (see [Authentication](/docs/authentication)).
- **A deployed agent** (see [Agent Overview](/docs/agent-overview)).
- **A Bluesky account hosted by Bluesky.** Posting through the API is free on Bluesky.

## Setup

### Step 1: Create a Bluesky app password

1. Sign in at [bsky.app](https://bsky.app) (or in the Bluesky app) with the account the posts should come from.
2. Open **Settings** → **Privacy and security** → **App passwords** ([bsky.app/settings/app-passwords](https://bsky.app/settings/app-passwords)).
3. Click **Add App Password** and give it a name you will recognize, such as `Social posting` (letters, digits, spaces, hyphens and underscores, at least 4 characters).
4. Leave **Allow access to your direct messages** unticked: the agent never reads or sends direct messages.
5. Click **Next**. Bluesky shows the password once, as four groups of four lowercase letters and digits: `xxxx-xxxx-xxxx-xxxx`. Click **Copy App Password**, keep it for Step 2, then click **Done**.
6. Note your handle: the name under your display name on your profile, such as `yourname.bsky.social`, or your own domain if you set one up.

> Never use the password you sign in with. An app password can post, delete posts and read for the account, but it cannot delete the account or create other app passwords, and it works with email two-factor sign-in turned on. To revoke the agent's access, delete the app password on the same page.

### Step 2: Save the credential to Wiro

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/CredentialUpsert" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "fields": [
      { "credentialkey": "bluesky", "fieldname": "handle", "fieldvalue": "yourname.bsky.social" },
      { "credentialkey": "bluesky", "fieldname": "apppassword", "fieldvalue": "xxxx-xxxx-xxxx-xxxx" }
    ]
  }'
```

Or fill it in the panel: **[My Agents](https://wiro.ai/panel/agents)** → open agent → **Connectors → Bluesky**.

A handle with a leading `@` or capital letters is accepted and used without them. An app password in any other shape than `xxxx-xxxx-xxxx-xxxx` (four groups of four lowercase letters and digits) is refused when you save it, so an account password cannot be saved by mistake.

### Step 3: Enable the skill

Bluesky ships **available but off**. Turn `int-bluesky-post` on for the agent:

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/SkillsApply" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "skills": { "int-bluesky-post": true },
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

With setup cards on, a person can ask the agent in chat to post to Bluesky. The agent then proposes an `add` card for `int-bluesky-post` and a `connect` card for `bluesky`, whose mode is `key`: your UI shows a form with the two fields of [Credential Fields](#credential-fields), and `SetupCardApply` takes them as `values` (see [Key mode](/docs/agent-chat-integration#key-serper-web-search)):

```json
{
  "useragentguid": "your-useragent-guid",
  "messageguid": "c3d4e5f6-a7b8-9012-cdef-345678901234",
  "cardid": "h6w3k9p2m5tc",
  "action": "apply",
  "values": { "handle": "yourname.bsky.social", "apppassword": "xxxx-xxxx-xxxx-xxxx" }
}
```

A value in the wrong shape is refused with the field's message, such as `App Password has an invalid format`, and the card stays pending. With only one of the two fields, the answer is `Saved <field> for Bluesky. Still needed: <field>.` and the card waits for the other.

## Credential Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `handle` | string | Yes | Your Bluesky handle, such as `yourname.bsky.social` or your own domain. A leading `@` is removed. Not a secret: it is shown as saved. |
| `apppassword` | string (secret) | Yes | A Bluesky app password: 19 characters, four groups of four lowercase letters and digits joined by hyphens. Never the account password. Encrypted at rest. |

## Credentials schema (as returned by `POST /UserAgent/Detail`)

```json
"bluesky": {
  "_connected": true,
  "optional": false,
  "extra": false,
  "handle": "yourname.bsky.social",
  "apppassword": "••••••••"
}
```

On a custom build with `int-bluesky-post` on, `optional` and `extra` are `false`: Bluesky is that skill's own connector.

## What the agent can do

The agent calls Bluesky's API at `https://bsky.social`, the entry point for every account Bluesky hosts.

| Action | Bluesky API | Limits and notes |
|--------|-------------|------------------|
| Text post | `com.atproto.repo.createRecord` (an `app.bsky.feed.post` record) | 300 characters (Bluesky counts graphemes, so an emoji is one) and 3,000 bytes. Up to 3 language codes. |
| Links, mentions, hashtags | Rich text facets on the post | Made clickable by the agent: it finds each link, `@handle` and `#tag` and marks its place in the text in UTF-8 bytes, so accented letters and emoji land right. A mention of a handle that does not exist stays plain text. |
| Images | `com.atproto.repo.uploadBlob`, then an `app.bsky.embed.images` embed | Up to 4 per post, each up to 2,000,000 bytes, JPEG, PNG or WebP, with alt text on every image. The agent shrinks a larger image to a JPEG at most 2,000 pixels wide. |
| Link card | `app.bsky.embed.external` | The page's title and description, and an optional image up to 1,000,000 bytes. Only on a post without images. |
| Threads and replies | The post's `reply` reference (thread root and parent) | A thread posts part by part and stops at the first failure. A reply to someone else's post goes out only when you ask for it. |
| Delete a post | `com.atproto.repo.deleteRecord` | Only a post of the connected account, only after you see it and say yes to that post. It cannot be undone. |
| Read your posts | `app.bsky.feed.getAuthorFeed`, `app.bsky.feed.getPosts`, `app.bsky.feed.getPostThread` | Likes, reposts, replies and quotes of each post, its replies, and views (Bluesky shows view counts only to the author and only from 100 views). |

Not supported: videos (the agent puts the video's link in the text), scheduled posts (Bluesky has none: the agent posts when it runs), editing (Bluesky has no edits), quote posts, direct messages, and accounts on servers not hosted by Bluesky.

## How posting works

- **Approval.** The agent follows its approval policy. By default it shows the post first (the text with its character count, each image with its alt text, the link card, and every post of a thread) and publishes after your approval. An agent admin can switch the policy to post automatically, also for Bluesky alone. Deleting always needs your yes for that post, whatever the policy says.
- **Sign-in limit.** Bluesky allows 30 sign-ins per 5 minutes and 300 per day for one account. The agent signs in once for every request that needs your account: each image upload, each post, each read of your posts' numbers and each delete. A post with 4 images takes 5 sign-ins. The agent keeps a run within the limit and posts a long thread with many images in parts at least 5 minutes apart. Looking up a handle, reading a post by its link and listing your latest posts need no sign-in.
- **Writes.** Bluesky also counts writes per account: 5,000 points per hour and 35,000 per day, where a post costs 3 and a delete 1. Normal posting never comes near it.
- **No duplicates.** When Bluesky does not answer whether a post went through, the agent checks your latest posts before anything else and never posts the same thing twice on its own.

## Cost & billing

- **Bluesky:** posting and reading through the API are free.
- **The agent:** every plan includes the integration, so it changes neither the agent's price nor its credits. As with every agent turn, its work is billed on the LLM tokens it uses, from the agent's existing credits.

## Troubleshooting

- **"Bluesky refused the handle or app password":** the app password was deleted or mistyped, the handle is wrong, or the account is not hosted by Bluesky. Create a new app password and save it with the handle.
- **"Bluesky sign-in limit reached":** 30 sign-ins in 5 minutes or 300 in a day were used. The agent stops and says when it can post again; nothing else needs to change.
- **"Bluesky asked for an email sign-in code":** the account password was saved instead of an app password. Save an app password.
- **"taken down or suspended":** Bluesky has suspended the account. Contact Bluesky.
- **A mention is not a link:** the handle does not exist or is misspelled; write the full handle, such as `@name.bsky.social`.
- **An image was left out:** it was not an image or stayed over 2,000,000 bytes. Send a smaller JPEG, PNG or WebP.
- **"too long":** the text is over 300 characters. The agent shortens it, and shows it again first when the policy asks for approval.
- **Agent says "not connected" with both fields filled:** the agent restarts to pick up new credentials; give it a moment after saving, then retry.

## Related

- [Agent Credentials & OAuth](/docs/agent-credentials)
- [Agent Skills](/docs/agent-skills)
- [Mastodon Integration](/docs/integration-mastodon-skills)
- [Twitter / X Skills](/docs/integration-twitter-skills)
- [LinkedIn Skills](/docs/integration-linkedin-skills)
