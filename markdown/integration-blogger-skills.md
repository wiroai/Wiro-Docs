# Blogger Integration

Connect your agent to Blogger to write blog posts as drafts, publish or schedule them after your approval, keep labels and pages up to date, and list draft, scheduled and live posts.

## Overview

The Blogger integration uses Google OAuth 2.0 with the Blogger API v3 and the scope `https://www.googleapis.com/auth/blogger`. You connect it with an OAuth client from your own Google Cloud project; there is no shared Wiro app for Blogger.

**Skills that use this integration:**

- `int-blogger-post`: drafts, publishing and scheduling after approval, post updates and labels, lists of draft, scheduled and live posts, search, and pages

**Agents that typically enable this integration:**

- Blog and content agents that publish on a blogspot.com blog or a Blogger blog on its own domain
- Any agent that turns research or announcements into blog posts

## Availability

| Mode | Status | Notes |
|------|--------|-------|
| `"own"` | Available | Your own Google Cloud project and OAuth client. This is the only mode: `OAuthConnect` uses it when you leave out `authmethod`. |
| `"wiro"` | Not offered | `OAuthConnect` with `"authmethod": "wiro"` returns `Unsupported connection mode for Blogger`. |

## Prerequisites

- **A Wiro API key** (see [Authentication](/docs/authentication)).
- **A deployed agent** (see [Agent Overview](/docs/agent-overview)).
- **A Blogger blog** the connecting Google account owns or writes for (admin or author).
- **A Google Cloud project** with the Blogger API v3 enabled.
- **An HTTPS callback URL**.

## Own Mode

### Step 1: Create a Google Cloud Project

1. [console.cloud.google.com](https://console.cloud.google.com/) → create a project, or use the one behind your Google Search Console or Google Analytics 4 client.
2. **APIs & Services → Library** → enable the [Blogger API v3](https://console.cloud.google.com/apis/library/blogger.googleapis.com).
3. **Google Auth Platform** (OAuth consent screen):
   - If the project has no app yet, click **Get started**: app name, support email, **External** audience, contact email
   - **Data Access** → **Add or remove scopes** → add `https://www.googleapis.com/auth/blogger` (Manage your Blogger account)
   - **Audience**: while the app is in **Testing**, only the test users you list (up to 100) can connect, and Google ends their authorization 7 days after consent. Add the connecting Google account under **Test users**, then click **Publish app** (**In production**) so the agent keeps access.
   - Google may warn that the app is unverified when you connect: it is your own app, so open **Advanced** and continue. Verification is needed only when people outside your team connect with this app; until an app with a scope Google reviews is verified, at most 100 Google accounts can connect to it.

### Step 2: Create OAuth Client

**Google Auth Platform → Clients → Create client**:
- Application type: **Web application**
- **Authorized redirect URIs**: `https://api.wiro.ai/v1/UserAgentOAuth/BloggerCallback`

The OAuth client you made for Google Search Console or Google Analytics 4 works too: add this redirect URI to it, enable the Blogger API v3 in its project and add the Blogger scope.

Copy the **Client ID** (`...apps.googleusercontent.com`) and the **Client Secret** (`GOCSPX-...`). Google shows the secret once, right after you create the client; if you missed it, open the client and add a new secret.

### Step 3: Connect

Save the Client ID and Client Secret with `POST /UserAgent/CredentialUpsert`:

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/CredentialUpsert" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "fields": [
      { "credentialkey": "blogger", "fieldname": "clientid", "fieldvalue": "123-abc.apps.googleusercontent.com" },
      { "credentialkey": "blogger", "fieldname": "clientsecret", "fieldvalue": "YOUR_CLIENT_SECRET" },
      { "credentialkey": "blogger", "fieldname": "authmethod", "fieldvalue": "own" }
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
    "credentialkey": "blogger",
    "redirecturl": "https://your-app.com/settings/integrations",
    "authmethod": "own"
  }'
```

The response returns `{ result: true, authorizeUrl: "...", flowid: "..." }`. Redirect the user to `authorizeUrl`. Google asks which Google account to connect, even when the browser is already signed in to one, and asks for access to manage the account's Blogger blogs. The request asks for offline access, so Google returns a refresh token.

### Step 4: Blog Picker

After consent, the user returns with `?blogger_connected=true&blogger_blogs=<URL-encoded-JSON>`. Each entry is `{ id, name, url }`: `id` is the blog's ID (a long number, the one in `blogger.com/blog/posts/<ID>`), `name` its title and `url` its public address. Every blog the Google account owns or writes for is listed. Map the user's choice to the picker shape and call `SetPickerAccounts`:

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/SetPickerAccounts" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "credentialkey": "blogger",
    "accounts": [
      { "blogid": "4967929378133675647", "blogname": "Travel Notes" }
    ]
  }'
```

Pass several `{ blogid, blogname }` entries to let the agent post to several blogs (`id` becomes `blogid`). Wiro saves each blog's `name` from its list as `blogname`, so a name you send is not read. `url` is handy for your UI, but it is not stored. Wiro saves only blogs from this sign-in's list, under the names it lists, when the call comes from the same Wiro account within 15 minutes. The first save uses the list up: to change the selection later, connect again. See [SetPickerAccounts](/docs/agent-credentials#post-useragentoauthsetpickeraccounts).

## Disconnect

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/OAuthDisconnect" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "credentialkey": "blogger"
  }'
```

Clears the tokens and the selected blogs in Wiro. Your Client ID and Client Secret are kept, so you can connect again without saving them again. Wiro does not ask Google to revoke the authorization: to end it on Google's side, open [myaccount.google.com/linkedapps](https://myaccount.google.com/linkedapps), choose **Access to your Google Account**, pick your app, then **See details → Remove access**.

## Status

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/OAuthStatus" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "credentialkey": "blogger"
  }'
```

Response:

```json
{
  "result": true,
  "connected": true,
  "accounts": [
    { "id": "4967929378133675647", "name": "Travel Notes" }
  ],
  "connectedat": "2026-11-21T12:00:00.000Z",
  "tokenexpiresat": "2026-11-21T13:00:00.000Z",
  "errors": []
}
```

`accounts[]` carries one entry per selected blog (`id` = `blogid`, `name` = `blogname`).

### Token lifecycle

Google access tokens last an hour. Wiro renews the token while the agent is running and when it starts, with the refresh token Google issued. `OAuthStatus` reports `connected: false` as soon as the stored token has expired, which can happen to a stopped agent while its authorization is still valid: start the agent and check again. Reconnect through `OAuthConnect` if Google revoked the authorization, or if the app was still in Testing (Google ends that authorization 7 days after consent).

## What the agent does with this integration

### Drafts first, then publish or schedule

The agent saves a new post as a draft, shows it (title, labels, length, opening lines and the Blogger editor link), and publishes it only after your approval, following the agent's approval policy. You can also give a date and time: the agent schedules the post for then and checks that Blogger shows it as scheduled.

```
Operator → "write a post about our Lisbon trip for the travel blog"
Agent → POST /blogger/v3/blogs/{blogId}/posts?isDraft=true
     shows the draft and its editor link
Operator → "publish it Monday at 9:00"
Agent → POST /blogger/v3/blogs/{blogId}/posts/{postId}/publish?publishDate=2026-11-23T09:00:00Z
```

### Updates, labels and pages

The agent updates a post's title, body or labels (a change to a live post is approved like a publish), takes a post back to draft, and creates or updates pages such as About or Contact with the same draft-first rule.

### Lists and search

The agent lists draft, scheduled and live posts with their labels, publish times and comment counts, filters by label, and searches the blog's posts.

### Content rules

Post bodies are HTML. The Blogger API has no image upload, so images go into a post by URL: a generated image's link, your own hosting, or an image already on the blog. The search description and custom permalinks are set in Blogger's editor.

### Deleting

The agent deletes a post or page only when you ask and approve it. A live or scheduled post goes to Blogger's trash, where you can restore it; a deleted draft is gone for good.

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `Unsupported connection mode for Blogger` in `OAuthConnect`'s `errors[]` | `authmethod` was `"wiro"` | Send `"authmethod": "own"`, or leave it out |
| `Blogger credentials not configured` in `OAuthConnect`'s `errors[]` | No saved `clientid` and `clientsecret` | Save them (Step 3), then retry |
| `blogger_error=no_accounts` on your `redirecturl` | Google listed no blog for this user, and Wiro saved nothing: the account owns or writes for no Blogger blog, or the Blogger API v3 is not enabled in your project. In the last case `blogger_error_detail` carries Google's status, such as `PERMISSION_DENIED` | Enable the API (Step 1), or connect with the Google account that owns the blog, then call `OAuthConnect` again |
| `blogger_error=token_exchange_failed` | Wrong Client Secret, or the client is not of type Web application | Copy the secret again or add a new one (Step 2), then connect again |
| `invalid_grant` | Refresh token expired or revoked; an app still in Testing expires it 7 days after consent | Publish the app, then reconnect via `OAuthConnect` |
| `403 Request had insufficient authentication scopes` | The consent did not include the Blogger scope | Add the scope in Data Access (Step 1) and connect again |
| The agent reports a 403 for one blog | The Google account lost its admin or author access to that blog | Restore the access in Blogger's settings, or connect again and pick another blog |
| `OAuthStatus` returns `connected: false` right after consent | No blog has been saved yet; the connection is complete only once `SetPickerAccounts` stores at least one | Call `SetPickerAccounts` with a blog from `blogger_blogs` (Step 4) |

### `redirect_uri_mismatch` on Google's page

The Authorized redirect URIs of your OAuth client don't include `https://api.wiro.ai/v1/UserAgentOAuth/BloggerCallback` exactly as written. Google stops on its own error page, so nothing comes back to your `redirecturl`. Add the URI (Step 2) and connect again.

### `Error 403: access_denied` on Google's page

The app is in Testing and the Google account is not one of its test users. Add the account under test users (Step 1), or publish the app, then connect again.

## Skill reference

- [agent-skills.md](/docs/agent-skills): custom skill schema and the `int-blogger-post` key
- [Blogger API v3](https://developers.google.com/blogger/docs/3.0/using)
