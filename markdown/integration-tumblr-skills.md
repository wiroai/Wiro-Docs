# Tumblr Integration

Connect your agent to your Tumblr blogs to post text, links and images with alt text and tags, keep drafts and the queue, schedule posts, and see how recent posts did by their note counts.

## Overview

The Tumblr integration uses Tumblr's OAuth 2.0 with the Tumblr API v2 and the Neue Post Format (NPF). You connect it with an app you register on Tumblr; there is no shared Wiro app for Tumblr. The sign-in asks for the scopes `basic`, `write` and `offline_access`.

**Skills that use this integration:**

- `int-tumblr-post`: NPF posts (text, links, images by URL or upload, alt text), tags, drafts first, the queue and scheduled posts, edits after approval, the blog's posts with note counts, and deletes after approval

**Agents that typically enable this integration:**

- Social Manager
- Any custom agent that shares art, product news or articles on Tumblr

## Availability

| Mode | Status | Notes |
|------|--------|-------|
| `"own"` | Available | Your own Tumblr app. This is the only mode: `OAuthConnect` uses it when you leave out `authmethod`. |
| `"wiro"` | Not offered | `OAuthConnect` with `"authmethod": "wiro"` returns `Unsupported connection mode for Tumblr`. |

## Prerequisites

- **A Wiro API key** (see [Authentication](/docs/authentication)).
- **A deployed agent** (see [Agent Overview](/docs/agent-overview)).
- **A Tumblr account** that owns the blog or is a member of it (group blogs included).
- **A Tumblr app** with an OAuth2 redirect URL (Step 1).
- **An HTTPS callback URL**.

## Own Mode

### Step 1: Register a Tumblr App

1. Sign in to Tumblr and open [tumblr.com/oauth/apps](https://www.tumblr.com/oauth/apps) → **Register application**.
2. Fill in the application name, website, description and your contact email.
3. In both **Default callback URL** and **OAuth2 redirect URLs**, enter `https://api.wiro.ai/v1/UserAgentOAuth/TumblrCallback`. Tumblr turns on OAuth 2 for an app only when it has an OAuth2 redirect URL.
4. Save. The app shows its **OAuth Consumer Key** (the OAuth 2 client ID). Click **Show secret key** for the **OAuth Consumer Secret** (the client secret). Both are about 50 letters and digits.

Tumblr does not review apps: yours works for your own account right away.

### Step 2: Note the scopes

Wiro requests these exact scopes:

```
basic write offline_access
```

| Scope | Why |
|-------|-----|
| `basic` | Read the account and the blogs it can post to. |
| `write` | Create, edit and delete posts. |
| `offline_access` | Get a refresh token, so the connection lasts without signing in again. |

### Step 3: Connect

Save the key and the secret with `POST /UserAgent/CredentialUpsert`:

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/CredentialUpsert" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "fields": [
      { "credentialkey": "tumblr", "fieldname": "clientid", "fieldvalue": "YOUR_OAUTH_CONSUMER_KEY" },
      { "credentialkey": "tumblr", "fieldname": "clientsecret", "fieldvalue": "YOUR_OAUTH_CONSUMER_SECRET" },
      { "credentialkey": "tumblr", "fieldname": "authmethod", "fieldvalue": "own" }
    ]
  }'
```

Then start `OAuthConnect`:

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/OAuthConnect" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "credentialkey": "tumblr",
    "redirecturl": "https://your-app.com/settings/integrations",
    "authmethod": "own"
  }'
```

The response returns `{ result: true, authorizeUrl: "...", flowid: "..." }`. Redirect the user to `authorizeUrl` (`https://www.tumblr.com/oauth2/authorize`), where Tumblr asks them to allow the app.

### Step 4: Blog Picker

After consent, the user returns with `?tumblr_connected=true&tumblr_blogs=<URL-encoded-JSON>`. Each entry is `{ id, name, title, url }`: `id` is the blog's Tumblr ID (`t:...`), or its name when Tumblr lists a blog without one, `name` its short name (`acme` for `acme.tumblr.com`), `title` its title and `url` its address. Every blog the account can post to is listed. Map the user's choice to the picker shape and call `SetPickerAccounts`:

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/SetPickerAccounts" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "credentialkey": "tumblr",
    "accounts": [
      { "blogid": "t:0aY0xL2Fi1OFJg4YxpmegQ", "blogname": "acme" }
    ]
  }'
```

Pass several `{ blogid, blogname }` entries to let the agent post to several blogs (`id` becomes `blogid`). Wiro saves each blog's `name` from its list as `blogname`, so a name you send is not read. `title` and `url` are handy for your UI, but they are not stored. A blog saved by its Tumblr ID stays connected when it is renamed. Wiro saves only blogs from this sign-in's list, under the names it lists, when the call comes from the same Wiro account within 15 minutes. The first save uses the list up: to change the selection later, connect again. See [SetPickerAccounts](/docs/agent-credentials#post-useragentoauthsetpickeraccounts).

## Disconnect

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/OAuthDisconnect" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "credentialkey": "tumblr"
  }'
```

Clears the tokens and the selected blogs in Wiro. Your key and secret are kept, so you can connect again without saving them again. Wiro does not ask Tumblr to revoke the authorization: to end it on Tumblr's side, open Tumblr [Settings → Apps](https://www.tumblr.com/settings/apps) and click the **X** next to your app.

## Status

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/OAuthStatus" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "credentialkey": "tumblr"
  }'
```

Response:

```json
{
  "result": true,
  "connected": true,
  "accounts": [
    { "id": "t:0aY0xL2Fi1OFJg4YxpmegQ", "name": "acme" }
  ],
  "connectedat": "2026-11-21T12:00:00.000Z",
  "tokenexpiresat": "2026-11-21T12:42:00.000Z",
  "errors": []
}
```

`accounts[]` carries one entry per selected blog (`id` = `blogid`, `name` = `blogname`).

### Token lifecycle

Tumblr access tokens last about 42 minutes. Wiro renews the token while the agent is running and when it starts, with the refresh token from the sign-in; each renewal returns a new refresh token, which Wiro keeps. `OAuthStatus` reports `connected: false` as soon as the stored token has expired, which happens to a stopped agent after about 42 minutes while its authorization is still valid: start the agent and check again. Reconnect through `OAuthConnect` if the app's access was removed in Tumblr's settings.

## What the agent does with this integration

### Drafts first, then publish or queue

The agent saves a new post as a Tumblr draft, shows what it holds (text, images with their alt text, links, tags) with the blog's drafts link, and publishes it only after your approval, following the agent's approval policy. With a time, it queues the post to go out then (`publish_on`); a queued post without a time follows the blog's own queue schedule.

```
Operator → "post the new print series on Tumblr with the cover image"
Agent → POST /v2/blog/{blog-identifier}/posts with "state": "draft"
     shows the draft and the drafts link
Operator → "queue it for Friday 18:00"
Agent → PUT /v2/blog/{blog-identifier}/posts/{post-id} with "state": "queue", "publish_on": "2026-11-27T18:00:00Z"
```

### Posts in the Neue Post Format

Text blocks with headings, quotes, lists and inline formatting; link blocks, which Tumblr fills with the page's title and picture; and image blocks, by URL or uploaded in the same request, each with alt text. Tags are sent without `#`; Tumblr's search reads the first 30 of a post.

### Edits, lists and deletes

The agent edits posts made in this format (a change to a published or queued post is approved like a publish), lists published posts with their note counts, drafts and the queue, and deletes a post only when you ask and approve it. Tumblr has no trash: a deleted post cannot be restored.

### Limits

Tumblr allows one account 250 new posts a day (reblogs included) and 250 image uploads a day, keeps up to 1,000 posts in a blog's queue, and allows one app 1,000 requests an hour and 5,000 a day. Images may be up to 20 MB, GIFs up to 10 MB, and a post holds up to 30 images.

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `Unsupported connection mode for Tumblr` in `OAuthConnect`'s `errors[]` | `authmethod` was `"wiro"` | Send `"authmethod": "own"`, or leave it out |
| `Tumblr credentials not configured` in `OAuthConnect`'s `errors[]` | No saved `clientid` and `clientsecret` | Save them (Step 3), then retry |
| Tumblr shows an error about the redirect instead of the consent page | The app has no OAuth2 redirect URL, or it differs from `https://api.wiro.ai/v1/UserAgentOAuth/TumblrCallback` | Enter the URL exactly in **OAuth2 redirect URLs** (Step 1) and connect again |
| `tumblr_error=token_exchange_failed` | Wrong consumer secret, or Tumblr returned no refresh token (the `offline_access` permission was not granted) | Copy the key and secret again (Step 1), then connect again and allow every permission |
| `tumblr_error=authorization_denied` | The user clicked cancel on Tumblr's page | Connect again and allow the app |
| `tumblr_error=no_accounts` | Tumblr listed no blog for this account | Connect with the account that owns the blog or is a member of it |
| The agent reports a 401 twice in a row | The app's access was removed in Tumblr's settings, or the refresh token no longer works | Reconnect via `OAuthConnect` |
| The agent reports a 429 | A Tumblr limit was reached (see Limits) | Wait for the daily or hourly reset |
| `OAuthStatus` returns `connected: false` right after consent | No blog has been saved yet; the connection is complete only once `SetPickerAccounts` stores at least one | Call `SetPickerAccounts` with a blog from `tumblr_blogs` (Step 4) |

## Skill reference

- [agent-skills.md](/docs/agent-skills): custom skill schema and the `int-tumblr-post` key
- [Tumblr API v2](https://www.tumblr.com/docs/en/api/v2) and the [Neue Post Format](https://www.tumblr.com/docs/npf)
