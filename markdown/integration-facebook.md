# Facebook Page Integration

Connect your agents to a Facebook Page so they can publish posts, photos, and videos on your behalf.

## Overview

The Facebook Page integration lets an agent act as an admin on a Page — publishing text, image, and video posts, reading engagement data, and managing scheduled content.

**Skills that use this integration:**

- `facebookpage-post` — Publish posts and media to a Facebook Page

**Agents that typically enable this integration:**

- Social Manager
- Any custom agent that needs to post to a Facebook Page

## Availability

| Mode | Status | Notes |
|------|--------|-------|
| `"wiro"` | Coming soon | Wiro's shared Meta App is under review by Meta. |
| `"own"` | Available now | Use your own Meta Developer App in Development Mode — no App Review required. |

> **Why own mode only right now?** Meta's approval for apps that request Page publishing permissions is strict. While Wiro's shared app is pending, own mode with your own Meta App is the immediate path. Every user who connects must be listed under your app's Roles — Development Mode handles permissions for them without App Review.

## Prerequisites

- **A Wiro API key** — see [Authentication](/docs/authentication).
- **A deployed agent** — see [Agent Overview](/docs/agent-overview), call `POST /UserAgent/Deploy` and keep the returned `useragentguid`.
- **A Meta Business account** — [business.facebook.com](https://business.facebook.com/).
- **A Meta Developer account** — [developers.facebook.com](https://developers.facebook.com/).
- **At least one Facebook Page where the end user is an admin** — the OAuth flow will list every Page the user administers.
- **An HTTPS callback URL** for your backend. `http://localhost` and `http://127.0.0.1` are allowed in development.

## Complete Integration Walkthrough

### Step 1: Create a Meta Developer App

Same as for Meta Ads — you can reuse a single Meta App for Facebook Page, Instagram, **and** Meta Ads.

1. Go to [developers.facebook.com/apps](https://developers.facebook.com/apps) and click **Create app**.
2. Choose **"Other"** → **"Business"**.
3. Enter an **App display name** (shown on the consent screen), an **App contact email**, and select your **Meta Business Account**.
4. Click **Create app**. Leave it in **Development Mode**.

### Step 2: Add "Facebook Login for Business"

1. From the app dashboard, click **Add product**.
2. Find **"Facebook Login for Business"** and click **Set up**.
3. Go to **Facebook Login for Business → Settings**.
4. Under **Valid OAuth Redirect URIs**, add:

   ```
   https://api.wiro.ai/v1/UserAgentOAuth/FBCallback
   ```

5. Click **Save changes**.

> The redirect URI must match **exactly** — HTTPS scheme, no trailing slash, exact case.

### Step 3: Note the required permissions

Wiro requests these scopes during OAuth:

| Permission | Why it is needed |
|------------|------------------|
| `pages_show_list` | Enumerate the Pages the user administers. |
| `pages_manage_posts` | Publish text, link, photo, and video posts to a Page. |
| `pages_read_engagement` | Read likes, comments, shares on the Page's posts. |
| `pages_manage_metadata` | Webhook subscriptions for real-time events. |
| `pages_manage_engagement` | Reply to comments, hide/delete comments. |
| `business_management` | Query business assets the user has access to. |

In Development Mode these permissions work without App Review for any Facebook user added to your app's Roles.

### Step 4: Copy your App ID and App Secret

Go to **App settings → Basic**. Copy the **App ID**, click **Show** next to **App Secret** and copy that too.

### Step 5: Add other Facebook accounts as Testers (only if needed)

- Connecting your own Facebook account? You are the app Admin, no action needed.
- Connecting a different account (e.g. a customer's)? Add them under **App Roles → Roles → Add People → Testers**. The user accepts at [facebook.com/settings → Business Integrations](https://www.facebook.com/settings?tab=business_tools).

### Step 6: Save your credentials to Wiro

Push the `appId` and `appSecret` into the agent's Facebook credential group. Wiro merges updates, so later OAuth tokens written by the callback will not overwrite these fields.

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Update" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "guid": "your-useragent-guid",
    "configuration": {
      "credentials": {
        "facebook": {
          "appId": "YOUR_META_APP_ID",
          "appSecret": "YOUR_META_APP_SECRET"
        }
      }
    }
  }'
```

### Step 7: Initiate OAuth

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/FBConnect" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "userAgentGuid": "your-useragent-guid",
    "redirectUrl": "https://your-app.com/settings/integrations",
    "authMethod": "own"
  }'
```

Response:

```json
{
  "result": true,
  "authorizeUrl": "https://www.facebook.com/v25.0/dialog/oauth?client_id=...&redirect_uri=...&scope=pages_show_list,pages_manage_posts,pages_read_engagement,pages_manage_metadata,pages_manage_engagement,business_management",
  "errors": []
}
```

Redirect the user's browser to `authorizeUrl`. The state has a **15-minute TTL** — if the user takes longer to finish consent, start over.

### Step 8: Handle the callback and select a Page

After consent, Wiro exchanges the code, fetches all Pages the user administers, caches them server-side, and redirects the user back to **your** `redirectUrl`.

**Success URL** looks like:

```
https://your-app.com/settings/integrations?fb_connected=true&fb_pagename=My%20Page&fb_pages=%5B%7B%22id%22%3A%22123%22%2C%22name%22%3A%22My%20Page%22%7D%2C%7B%22id%22%3A%22456%22%2C%22name%22%3A%22Another%20Page%22%7D%5D
```

Query parameters:

| Param | Meaning |
|-------|---------|
| `fb_connected=true` | OAuth finished successfully. |
| `fb_pagename` | Name of the Page Wiro auto-selected as default (the first Page returned by Meta). Kept for backward compatibility. |
| `fb_pages` | URL-encoded JSON array of **every** Page the user administers: `[{ id, name }, ...]`. Only the ID and display name are returned — page access tokens stay server-side. |

#### Decide how to handle the list

```javascript
const params = new URLSearchParams(window.location.search);

if (params.get("fb_connected") === "true") {
  const pages = JSON.parse(decodeURIComponent(params.get("fb_pages") || "[]"));

  if (pages.length === 0) {
    showError("This Facebook user does not administer any Pages.");
  } else if (pages.length === 1) {
    // Already selected server-side; you can optionally call FBSetPage
    // to confirm, but it's not required.
    showSuccess(`Connected to ${pages[0].name}`);
  } else {
    // Let the user choose
    presentPagePicker(pages);
  }
} else if (params.get("fb_error")) {
  handleError(params.get("fb_error"));
}
```

#### Persist the user's choice (multi-page case)

Wiro auto-picks the first Page as a default, but if the user manages multiple Pages and picks a different one, call `FBSetPage`:

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/FBSetPage" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "userAgentGuid": "your-useragent-guid",
    "pageId": "456",
    "pageName": "Another Page"
  }'
```

Response:

```json
{ "result": true, "errors": [] }
```

Behind the scenes Wiro looks up the page-specific access token in its short-term cache (15-minute TTL from the callback), writes it to the agent's config, and restarts the agent if it was already running. Wait too long (>15 min) and you will get an error — restart OAuth from Step 7.

### Step 9: Verify the connection

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/FBStatus" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "userAgentGuid": "your-useragent-guid" }'
```

```json
{
  "result": true,
  "connected": true,
  "username": "My Page",
  "connectedAt": "2026-04-17T12:00:00.000Z",
  "tokenExpiresAt": "2026-06-16T12:00:00.000Z",
  "errors": []
}
```

### Step 10: Start the agent if it is not running

If this is a new agent, it may still be in Stopped state:

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Start" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "guid": "your-useragent-guid" }'
```

Agents already running at connect time restart automatically.

## API Reference

### **POST** /UserAgentOAuth/FBConnect

Initiate the Facebook Page OAuth flow.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userAgentGuid` | string | Yes | Agent instance GUID. |
| `redirectUrl` | string | Yes | HTTPS URL where the user is returned after consent. |
| `authMethod` | string | No | `"wiro"` (default) or `"own"`. Use `"own"` while the shared app is pending. |

Response: `{ result, authorizeUrl, errors }`.

### **GET** /UserAgentOAuth/FBCallback

Server-side callback. Wiro returns users to your `redirectUrl` with:

| Param | Meaning |
|-------|---------|
| `fb_connected=true` | Success. |
| `fb_pagename` | Auto-selected Page name (backward compat). |
| `fb_pages` | URL-encoded JSON `[{ id, name }, ...]` of all admin Pages. |
| `fb_error=<code>` | Failure. See [Troubleshooting](#troubleshooting). |

### **POST** /UserAgentOAuth/FBSetPage

Choose which Facebook Page the agent should operate against (when the user administers more than one).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userAgentGuid` | string | Yes | Agent instance GUID. |
| `pageId` | string | Yes | Page ID copied from `fb_pages`. |
| `pageName` | string | No | Display name to show in dashboards. If omitted, Wiro uses the name from the cached page list. |

Response: `{ result, errors }`. Agent restarts automatically if it was running.

> **Cache window:** Wiro caches the full page list (with page access tokens) for 15 minutes after the callback. Call `FBSetPage` within that window. If the cache expires, restart the OAuth flow from `FBConnect`.

### **POST** /UserAgentOAuth/FBStatus

Check the current Facebook Page connection state.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userAgentGuid` | string | Yes | Agent instance GUID. |

Response fields include `connected`, `username` (Page name), `connectedAt`, `tokenExpiresAt`.

### **POST** /UserAgentOAuth/FBDisconnect

Revoke the Facebook token and clear credentials.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userAgentGuid` | string | Yes | Agent instance GUID. |

Response: `{ result: true, errors: [] }`. Agent restarts automatically.

### **POST** /UserAgentOAuth/TokenRefresh

Force-refresh the long-lived page token. Wiro auto-refreshes before expiry.

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/TokenRefresh" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "userAgentGuid": "your-useragent-guid",
    "provider": "facebook"
  }'
```

## Using the Skill

Once Facebook is connected, enable `facebookpage-post` in the agent's skills and optionally schedule runs — see [Agent Skills](/docs/agent-skills#enabling-skills).

```json
{
  "guid": "your-useragent-guid",
  "configuration": {
    "custom_skills": [
      {
        "key": "daily-announcement",
        "enabled": true,
        "interval": "0 9 * * *",
        "value": "Share a highlight from yesterday's product updates"
      }
    ]
  }
}
```

## Troubleshooting

| Error code | Meaning | What to do |
|------------|---------|------------|
| `missing_params` | Callback reached without `state` or `code`. | Start a fresh OAuth flow from Step 7. |
| `session_expired` | More than 15 minutes passed between `FBConnect` and the user finishing consent. | Re-run `FBConnect`. |
| `authorization_denied` | User cancelled, or in Development Mode the user is not listed under App Roles. | Add the user as a Tester (Step 5), ask them to accept the invite, retry. |
| `token_exchange_failed` | Wrong App Secret or redirect URI mismatch. | Re-copy App Secret from **Settings → Basic**; verify the redirect URI in **Facebook Login for Business → Settings** is exactly `https://api.wiro.ai/v1/UserAgentOAuth/FBCallback`. |
| `useragent_not_found` | The `userAgentGuid` is wrong or not owned by this API key. | Use `POST /UserAgent/MyAgents` to find the right guid. |
| `invalid_config` | The agent has no `credentials.facebook` block. | Call `POST /UserAgent/Update` with `facebook.appId` and `facebook.appSecret`, retry. |
| `internal_error` | Unexpected server error. | Retry once; if it persists, contact support. |

### "No pending page selection" error on FBSetPage

The page list cache expired. The cache keeps page-specific access tokens for 15 minutes after a successful callback. If the user takes longer to pick a page, restart the OAuth flow from `FBConnect`. The default (first) page stays usable in the meantime — no configuration is lost, you just cannot switch pages from a cold state.

### User administers multiple Pages but only one was returned

Meta only returns Pages where the user currently holds an admin or editor role in **Meta Business Suite**. Recently created Pages can take up to ~30 minutes to show up in OAuth — ask the user to retry after refreshing their Business Suite session.

### "App not verified" banner on consent

Expected in Development Mode. Users added to App Roles can click **Continue**; other users are blocked entirely.

### Page posts succeed but show the wrong page author

Wiro uses the **page access token**, not the user token, so posts appear as the Page. If they show a personal account name, your `FBSetPage` call is using a `pageId` that was not in the last callback's list — start a new OAuth flow and select again.

## Multi-Tenant Architecture

For SaaS builders connecting many customers' Pages through a single Wiro-powered backend:

1. **One Meta Developer App** serves all customers. The same `appId`/`appSecret` pair works across every Wiro agent instance.
2. **One Wiro agent instance per customer** — deploy with `POST /UserAgent/Deploy` during onboarding.
3. **Page tokens are isolated per agent instance.** Customer A's Page token is never visible to Customer B; they live under different `useragentguid`s.
4. **Your consent screen carries your branding.** The customer sees *your* App display name on Facebook's consent screen — not "Wiro".
5. **Each customer must be on App Roles** until you go Live Mode. Collect their Facebook user ID during signup and add them as Testers via the Meta Business API or the Roles UI.
6. **Page admin rights must be verified on your side.** Meta returns only Pages where the user is currently an admin. If your customer lost admin access after signing up, your agent will error — build a revalidation loop that runs `FBStatus` periodically and flags stale connections.

## Related

- [Agent Credentials & OAuth](/docs/agent-credentials)
- [Agent Overview](/docs/agent-overview)
- [Agent Skills](/docs/agent-skills)
- [Meta Ads integration](/docs/integration-metaads)
- [Instagram integration](/docs/integration-instagram)
- [Meta for Developers — Pages API](https://developers.facebook.com/docs/pages-api)
