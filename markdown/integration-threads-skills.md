# Threads Integration

Connect your agent to a Threads profile with your own Meta app to publish text, image, video and carousel posts, answer and moderate replies, and read post and profile insights.

## Overview

The Threads integration uses the Threads API (`graph.threads.net/v1.0`) with OAuth 2.0 and a Meta app you own that has the **Access the Threads API** use case. One connection is one Threads profile: the agent posts as that profile and nowhere else.

Wiro exchanges the sign-in code for a short-lived token, swaps it at once for a 60-day token, and renews that token every day while the agent runs. Tokens stay on Wiro's servers.

**Skills that use this integration:**

- `int-threads-post`: Publish text, image, video and carousel posts (2 to 20 items) with reply controls, quote posts, link previews, topic tags and long text attachments; answer replies in your own threads; read and hide replies; read post and profile insights; delete a post after you approve it

**Agents that typically enable this integration:**

- Social Manager
- Any custom agent that publishes to Threads

## Availability

| Mode | Status | Notes |
|------|--------|-------|
| `"own"` | Available | Your own Meta app with the Access the Threads API use case. |

There is no Wiro mode: `OAuthConnect` with `"authmethod": "wiro"` returns `Unsupported connection mode for Threads`. Leaving `authmethod` out means `"own"`.

## Prerequisites

- **A Wiro API key** (see [Authentication](/docs/authentication)).
- **A deployed agent** (see [Agent Overview](/docs/agent-overview)).
- **A Threads profile** the agent will post as.
- **A Meta for Developers account** to create the app.
- **An HTTPS callback URL** for your backend, where the browser returns after the sign-in.

## Complete Integration Walkthrough

### Step 1: Create a Meta app with the Threads use case

1. Open [Meta for Developers → My Apps](https://developers.facebook.com/apps/) and click **Create App**.
2. Enter an app name and your contact email.
3. On **Use cases**, select **Access the Threads API**. Connecting a business portfolio is optional.
4. Finish the steps to create the app.

Meta gives the app two IDs and secrets. The Threads API uses the **Threads App ID** and **Threads App Secret**, not the App ID at the top of the dashboard.

### Step 2: Add the permissions

In the left menu click **Use cases**, then **Customize** next to **Access the Threads API**. Under **Permissions**, click **Add** next to each of these (`threads_basic` is already included):

| Permission | Why |
|------------|-----|
| `threads_basic` | Required for every Threads API call: the profile's id and username. |
| `threads_content_publish` | Create and publish posts. |
| `threads_manage_replies` | Answer replies in your threads, hide replies, set who can reply. |
| `threads_read_replies` | Read the replies to your posts. |
| `threads_manage_insights` | Read post and profile insights. |
| `threads_delete` | Delete a post the profile made. |

Wiro asks for exactly these six scopes, so all six must be on the app or the sign-in fails.

### Step 3: Configure the redirect URI

Open the use case's **Settings**:

1. Under **Redirect Callback URLs** (Client OAuth Settings in Meta's docs), add:

   ```
   https://api.wiro.ai/v1/UserAgentOAuth/ThreadsCallback
   ```

2. Fill in **Uninstall Callback URL** and **Delete Callback URL** as well, or the page does not save. A page on your own website, such as your privacy policy, works for both.
3. Click **Save**. If the dashboard shows **Finish customization**, click it.

### Step 4: Add the Threads account as a tester

Until Meta approves the app, only Threads accounts with a role on it can sign in.

1. Go to **App roles → Roles → Add People** and choose **Threads Tester**.
2. Enter the Threads username of the profile the agent will post as. It can differ from your Facebook login.
3. In Threads, sign in as that profile and accept the invite under **Settings → Account → Website permissions → Invites**.

To let accounts without a role connect, submit each permission for **App Review** and publish the app. For your own profile, the tester role is enough.

### Step 5: Copy the Threads App ID and Threads App Secret

On the same **Settings** page, copy the **Threads App ID** (digits). Next to **Threads App Secret**, click **Show** and copy all 32 characters.

### Step 6: Save the app credentials to Wiro

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/CredentialUpsert" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "fields": [
      { "credentialkey": "threads", "fieldname": "authmethod", "fieldvalue": "own" },
      { "credentialkey": "threads", "fieldname": "appid", "fieldvalue": "1234567890123456" },
      { "credentialkey": "threads", "fieldname": "appsecret", "fieldvalue": "YOUR_THREADS_APP_SECRET" }
    ]
  }'
```

`appid` takes digits only.

### Step 7: Initiate OAuth

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/OAuthConnect" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "credentialkey": "threads",
    "redirecturl": "https://your-app.com/settings/integrations",
    "authmethod": "own"
  }'
```

Response:

```json
{
  "result": true,
  "authorizeUrl": "https://threads.com/oauth/authorize?client_id=...&redirect_uri=...&scope=threads_basic%2Cthreads_content_publish%2Cthreads_manage_insights%2Cthreads_manage_replies%2Cthreads_read_replies%2Cthreads_delete&response_type=code&state=...",
  "flowid": "4b1f0c7a9e2d4c1b8a7f6e5d4c3b2a19",
  "errors": []
}
```

Redirect the user to `authorizeUrl` and have them sign in with the Threads profile the agent will post as.

### Step 8: Handle the callback

After consent, Threads redirects to Wiro's callback. Wiro exchanges the code, swaps the short-lived token for a 60-day token, reads the profile's id and username, and returns the user to your `redirecturl`.

**Success URL:**

```
https://your-app.com/settings/integrations?threads_connected=true&threads_username=acme.studio
```

```javascript
const params = new URLSearchParams(window.location.search);

if (params.get("threads_connected") === "true") {
  showSuccess(`Connected as @${params.get("threads_username")}`);
} else if (params.get("threads_error")) {
  handleError(params.get("threads_error"));
}
```

### Step 9: Verify

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/OAuthStatus" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "credentialkey": "threads"
  }'
```

Response:

```json
{
  "result": true,
  "connected": true,
  "accounts": [
    { "id": "acme.studio", "name": "acme.studio" }
  ],
  "connectedat": "2026-11-21T12:00:00.000Z",
  "tokenexpiresat": "2027-01-20T12:00:00.000Z",
  "errors": []
}
```

`accounts[0]` carries the connected Threads username.

### Step 10: Start the agent

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Start" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "guid": "your-useragent-guid" }'
```

## API Reference

### POST /UserAgentOAuth/OAuthConnect

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Agent instance GUID. |
| `credentialkey` | string | Yes | `"threads"`. |
| `redirecturl` | string | Yes | Any HTTPS URL you control; the browser returns there after consent. `http://localhost` and `http://127.0.0.1` also work for development. |
| `authmethod` | string | No | `"own"`, the only mode. `"wiro"` returns `Unsupported connection mode for Threads`. |

### GET /UserAgentOAuth/ThreadsCallback

Server-side endpoint Threads calls with `code` and `state`. You don't call it. You only handle the final redirect back to your `redirecturl`, which carries `threads_connected=true&threads_username=<username>` or `threads_error=<code>`.

### POST /UserAgentOAuth/OAuthStatus

Body: `{ useragentguid, credentialkey: "threads" }`. Response: `connected`, `accounts: [{id, name}]` (the connected username), `connectedat`, `tokenexpiresat`.

### POST /UserAgentOAuth/OAuthDisconnect

Body: `{ useragentguid, credentialkey: "threads" }`. Clears the token and the connected profile in Wiro. `appid` and `appsecret` stay saved, so you can connect again without saving them again. Threads has no revoke endpoint: to end the app's access on Threads too, remove the app under **Settings → Account → Website permissions** in Threads.

### Token lifecycle

The token lasts 60 days. Wiro renews it every day while the agent runs once it has 30 days or less left, and when the agent starts. A token that expired cannot be renewed: connect again. Meta extends the permissions of public profiles with each renewal; a **private** Threads profile has to connect again every 90 days. `OAuthStatus` reports `connected: false` once the stored token has expired.

## Using the Skill

Once Threads is connected, the agent publishes with `int-threads-post`, gated by your approval policy:

- **Text posts** up to 500 characters. Threads counts each emoji by its UTF-8 bytes, so one emoji usually counts 4. A link in a text post becomes its preview card; at most 5 links per post. Longer pieces go into a text attachment of up to 10,000 characters.
- **Image posts** (JPEG or PNG, up to 8 MB) and **video posts** (MP4 or MOV, H.264 or HEVC, up to 5 minutes and 1 GB), from public URLs, with alt text.
- **Carousels** of 2 to 20 images and videos.
- **Reply controls** (everyone, accounts you follow, mentioned only, followers only, or the post's author only), **quote posts**, and one **topic tag** per post.
- **Replies:** reads the replies to your posts, answers inside your own threads, and hides or unhides replies on request.
- **Insights (read-only):** views, likes, replies, reposts, quotes and shares per post; views, likes, replies, reposts, quotes, link clicks and follower count for the profile.
- **Delete:** a post the profile made, only after you approve that exact post.

Every post is created as a media container and then published. The agent waits until the container is ready (videos take longer), publishes it once, and returns the post's permalink. Threads has no scheduled publishing in its API: a post for later is published by a scheduled task at that time.

Threads allows each profile 250 published posts, 1,000 replies and 100 deletions in any 24 hours. A carousel counts as one post.

## Troubleshooting

| Error code | Meaning | What to do |
|------------|---------|------------|
| `missing_params` | The callback was opened without an OAuth `state`. The browser ends on the API's own neutral page, not on your `redirecturl`. | Don't open the callback URL directly. Start again from Step 7. |
| `session_expired` | More than 15 minutes between `OAuthConnect` and the callback. | Call `OAuthConnect` again. |
| `flow_replaced` | A newer sign-in for the same agent and credential replaced this one, so nothing from it was saved. | Use the newer sign-in, or start again with `OAuthConnect`. |
| `authorization_denied` | The user cancelled on Threads. | Start again and approve. |
| `token_exchange_failed` | Threads refused the code (wrong Threads App Secret, a redirect URI that does not match, a code used twice), or the profile could not be read. | Check the Threads App ID and Secret and the redirect URI (Steps 3 and 5), then connect again. |
| `long_lived_exchange_failed` | Threads issued the short-lived token but refused to swap it for a 60-day token, so nothing was saved. | Check the Threads App Secret (Step 5) and connect again. |
| `useragent_not_found` | The agent was deleted, or is no longer owned by the account that started the flow. | Start again with `OAuthConnect` for an existing agent. |
| `Threads credentials not configured` | Returned in `OAuthConnect`'s `errors[]` when `appid` or `appsecret` is missing. | Save them (Step 6). |
| `internal_error` | Server error. | Retry; contact support if it persists. |

### "The user has not accepted the invite to test the app"

The Threads account has a pending tester invite. Accept it in Threads under **Settings → Account → Website permissions → Invites**, then connect again.

### The Threads sign-in page refuses a permission

One of the six permissions is not on the app. Add it in **Use cases → Customize → Permissions** (Step 2) and connect again.

### Posts fail with a link limit error

Threads refuses posts with more than 5 links (`THREADS_API__LINK_LIMIT_EXCEEDED`). The agent removes links and tries a new container.

### The agent says Threads needs to be connected again

The token expired (the agent was stopped for more than 60 days, or the profile is private and its 90 days passed) or access was removed in Threads. Connect again from Step 7.

## Multi-Tenant Architecture

1. **One Meta app per product**, with the Threads use case and the six permissions.
2. **One Wiro agent instance per customer**, each connecting its own Threads profile.
3. **App Review is per app**: submit the permissions once so customers' profiles can connect without the tester role.
4. **Tokens are isolated per agent instance.**
5. **Limits are per profile**: 250 posts, 1,000 replies and 100 deletions in any 24 hours.

## Related

- [Agent Credentials & OAuth](/docs/agent-credentials)
- [Agent Overview](/docs/agent-overview)
- [Agent Skills](/docs/agent-skills)
- [Threads API documentation](https://developers.facebook.com/docs/threads)
