# Facebook Page Integration

Connect your agent to a Facebook Page to publish posts, photos, and videos on the user's behalf.

## Overview

The Facebook Page integration uses Meta's Graph API with a page-scoped access token. The connecting Facebook user must be an admin of at least one Page, and the connection is not complete until a specific Page is selected.

**Skills that use this integration:**

- `facebookpage-post` — Publish text, photo, and video posts to a Facebook Page

**Agents that typically enable this integration:**

- Social Manager
- Any custom agent that needs Facebook Page posting

## Availability

| Mode | Status | Notes |
|------|--------|-------|
| `"wiro"` | Coming soon | Wiro's shared Meta App is under review by Meta. |
| `"own"` | Available now | Use your own Meta Developer App in Development Mode — no App Review required. |

## Prerequisites

- **A Wiro API key** — [Authentication](/docs/authentication).
- **A deployed agent** — [Agent Overview](/docs/agent-overview); keep the `useragents[0].guid`.
- **A Meta Business account** — [business.facebook.com](https://business.facebook.com/).
- **A Meta Developer account** — [developers.facebook.com](https://developers.facebook.com/).
- **At least one Facebook Page where the end user is an admin** — OAuth enumerates every admin-managed Page.
- **An HTTPS callback URL** for your backend.

## Complete Integration Walkthrough

All scopes, endpoints, and callback parameters are verified against the backend source code.

### Step 1: Create a Meta Developer App

You can reuse a single Meta App for Facebook Page, Instagram, and Meta Ads.

1. [developers.facebook.com/apps](https://developers.facebook.com/apps) → **Create app** → **Other** → **Business**.
2. Enter an **App display name** (what users see on consent screens), **App contact email**, select your **Business Account**, then **Create app**.
3. Leave it in **Development Mode**.

### Step 2: Add "Facebook Login for Business" and register the redirect URI

1. **Add product** → **Facebook Login for Business** → **Set up**.
2. **Facebook Login for Business → Settings**.
3. Under **Valid OAuth Redirect URIs**, add:

   ```
   https://api.wiro.ai/v1/UserAgentOAuth/FBCallback
   ```

4. **Save changes**.

### Step 3: Note the required permissions

Wiro requests these exact scopes (verified against `api-useragent-oauth.js` L1099):

```
pages_show_list,pages_manage_posts,pages_read_engagement,pages_read_user_content,pages_manage_metadata,pages_messaging
```

| Permission | Why |
|------------|-----|
| `pages_show_list` | Enumerate the Pages the user administers. |
| `pages_manage_posts` | Publish posts, photos, and videos to a Page. |
| `pages_read_engagement` | Read likes, comments, and shares on the Page's posts. |
| `pages_read_user_content` | Read user-generated content on the Page (for context). |
| `pages_manage_metadata` | Webhook subscriptions and Page metadata. |
| `pages_messaging` | Send and receive messages on behalf of the Page (some skills use this). |

These work without App Review in Development Mode for any Facebook user in App Roles.

### Step 4: Copy your App ID and App Secret

**App settings → Basic** → copy **App ID** and **App Secret**.

### Step 5: Add other Facebook accounts as Testers (only if needed)

Connecting your own Facebook account? You're the app Admin — skip. Connecting a customer's account? Add them under **App Roles → Roles → Add People → Testers**. They accept at [facebook.com/settings → Business Integrations](https://www.facebook.com/settings?tab=business_tools).

### Step 6: Save your Meta App credentials to Wiro

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

Wiro merges this into only the `facebook` group — other credentials are untouched.

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
  "authorizeUrl": "https://www.facebook.com/v25.0/dialog/oauth?client_id=...&redirect_uri=...&scope=pages_show_list%2Cpages_manage_posts%2Cpages_read_engagement%2Cpages_read_user_content%2Cpages_manage_metadata%2Cpages_messaging&auth_type=rerequest&response_type=code&state=...",
  "errors": []
}
```

Redirect the user's browser to `authorizeUrl`. State has a 15-minute TTL.

### Step 8: Handle the callback and list returned Pages

After consent, Wiro exchanges the code for a user access token, fetches every admin-managed Page **with its page-specific access token**, caches the full list server-side, and redirects the user to your `redirectUrl`.

**Crucial:** Wiro does **not** auto-select a Page. The connection is incomplete until the client calls `FBSetPage` with a chosen `pageId`. `POST /UserAgentOAuth/FBStatus` returns `connected: false` during this window.

**Success URL:**

```
https://your-app.com/settings/integrations?fb_connected=true&fb_pages=%5B%7B%22id%22%3A%22123%22%2C%22name%22%3A%22Page%20A%22%7D%2C%7B%22id%22%3A%22456%22%2C%22name%22%3A%22Page%20B%22%7D%5D
```

Query parameters:

| Param | Meaning |
|-------|---------|
| `fb_connected=true` | OAuth completed; credentials are cached server-side awaiting page selection. |
| `fb_pages` | URL-encoded JSON array `[{ id, name }, ...]` of every admin-managed Page. The per-page access tokens stay server-side — the client only receives ID and name. |
| `fb_error=<code>` | Failure. See [Troubleshooting](#troubleshooting). |

Parse:

```javascript
const params = new URLSearchParams(window.location.search);

if (params.get("fb_connected") === "true") {
  const pages = JSON.parse(decodeURIComponent(params.get("fb_pages") || "[]"));

  if (pages.length === 0) {
    // Shouldn't normally happen — the callback returns fb_error=no_pages if the user
    // has no Pages. But handle defensively.
    showError("No Facebook Pages to manage.");
  } else if (pages.length === 1) {
    // One-page case: still required to confirm via FBSetPage
    await setPage(pages[0]);
  } else {
    presentPagePicker(pages);
  }
} else if (params.get("fb_error")) {
  handleError(params.get("fb_error"));
}
```

### Step 9: Persist the page selection (required)

**This step is mandatory.** The agent has no valid Facebook credentials until you call `FBSetPage`. Until then, `credentials.facebook.accessToken` and `pageId` remain empty, and `FBStatus` reports `connected: false`.

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/FBSetPage" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "userAgentGuid": "your-useragent-guid",
    "pageId": "456",
    "pageName": "Page B"
  }'
```

Response:

```json
{
  "result": true,
  "pageId": "456",
  "pageName": "Page B",
  "errors": []
}
```

What happens server-side:

1. Wiro looks up the pending payload in cache (keyed by `userAgentGuid`, 15-minute TTL).
2. Finds the page matching `pageId` in the cached list.
3. Writes the **page access token** (not the user token) to `credentials.facebook.accessToken` along with `pageId`, `fbPageName`, `authMethod`, `connectedAt`, and `tokenExpiresAt` (~60 days).
4. Triggers an agent restart if it was running.
5. Clears the pending cache.

If the 15-minute window lapses before you call `FBSetPage`, you'll get `No pending Facebook connection. Please reconnect via FBConnect.` — start again from Step 7.

`pageName` is optional; if omitted, Wiro uses the name from the cached page list.

### Step 10: Verify the connection

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/FBStatus" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "userAgentGuid": "your-useragent-guid" }'
```

Response:

```json
{
  "result": true,
  "connected": true,
  "username": "Page B",
  "connectedAt": "2026-04-17T12:00:00.000Z",
  "tokenExpiresAt": "2026-06-16T12:00:00.000Z",
  "errors": []
}
```

- `connected: true` requires **both** `accessToken` and `pageId` to be set — meaning `FBSetPage` was called successfully.
- `username` = the saved `fbPageName`.
- No `refreshTokenExpiresAt` — Facebook page tokens are long-lived (~60 days) and refresh with `fb_exchange_token`, not a refresh token flow.

### Step 11: Start the agent if it's not running

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Start" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "guid": "your-useragent-guid" }'
```

Agents already running at `FBSetPage` time restart automatically to pick up the new credentials.

## API Reference

### POST /UserAgentOAuth/FBConnect

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userAgentGuid` | string | Yes | Agent instance GUID. |
| `redirectUrl` | string | Yes | HTTPS URL (or `http://localhost` / `http://127.0.0.1` for dev). |
| `authMethod` | string | No | `"wiro"` (default) or `"own"`. |

Response: `{ result, authorizeUrl, errors }`.

### GET /UserAgentOAuth/FBCallback

Server-side. Query params appended to your `redirectUrl`:

| Param | Meaning |
|-------|---------|
| `fb_connected=true` | OAuth completed; pending payload cached awaiting `FBSetPage`. |
| `fb_pages` | URL-encoded JSON `[{id, name}, ...]` of admin-managed Pages. |
| `fb_error=<code>` | Failure. |

### POST /UserAgentOAuth/FBSetPage

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userAgentGuid` | string | Yes | Agent instance GUID. |
| `pageId` | string | Yes | A page ID from the `fb_pages` array returned in the callback. |
| `pageName` | string | No | Override the display name. If omitted, Wiro uses the cached name. |

Response: `{ result, pageId, pageName, errors }`. Triggers auto-restart if running.

> Must be called within **15 minutes** of the callback (cache TTL). After that, the pending payload is gone and you'll need to restart OAuth.

### POST /UserAgentOAuth/FBStatus

Response fields: `connected` (only `true` when both `accessToken` and `pageId` are set), `username` (= `fbPageName`), `connectedAt`, `tokenExpiresAt`.

### POST /UserAgentOAuth/FBDisconnect

Clears Facebook credentials (no remote revoke).

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/FBDisconnect" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "userAgentGuid": "your-useragent-guid" }'
```

### POST /UserAgentOAuth/TokenRefresh

> Running agents refresh the Facebook page token automatically via the daily maintenance cron. Use this only for debugging or manual overrides.

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/TokenRefresh" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "userAgentGuid": "your-useragent-guid", "provider": "facebook" }'
```

Uses `fb_exchange_token` under the hood. See [Automatic token refresh](/docs/agent-credentials#automatic-token-refresh).

## Using the Skill

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
| `missing_params` | Callback hit without `state` or `code`. | Start a new flow from Step 7. |
| `session_expired` | >15 min between `FBConnect` and the callback. | Call `FBConnect` again. |
| `authorization_denied` | User cancelled, or not listed in App Roles (Development Mode). | Add as Tester (Step 5), retry. |
| `token_exchange_failed` | Wrong App Secret or redirect URI mismatch. | Re-copy App Secret; verify redirect URI exactly. |
| `no_pages` | User has no administered Facebook Pages. | Ask the user to create/administer a Page first, retry. |
| `useragent_not_found` | Invalid or unauthorized `userAgentGuid`. | Use `POST /UserAgent/MyAgents`. |
| `invalid_config` | Agent has no `credentials.facebook` block. | Call `POST /UserAgent/Update` with `facebook.appId` and `facebook.appSecret`, retry. |
| `internal_error` | Unexpected server error (includes cache write failures). | Retry once. If persistent, contact support. |

### `FBSetPage` returns "No pending Facebook connection"

The 15-minute pending cache expired, or you passed a `pageId` that wasn't in the `fb_pages` list. Start a new OAuth flow from Step 7.

### `FBSetPage` returns "Selected pageId not found in pending pages list"

The `pageId` you sent doesn't match any ID in the cached list. Verify you're parsing `fb_pages` correctly and sending the exact ID string.

### Posts publish but as the wrong author

Check `POST /UserAgent/Detail` and verify `configuration.credentials.facebook.pageId` is the Page you intended. If not, disconnect and reconnect, or call `FBSetPage` again within a fresh 15-minute window.

### "App not verified" banner on consent

Expected in Development Mode. Users in App Roles can click Continue.

## Multi-Tenant Architecture

1. **One Meta Developer App** per product — same `appId`/`appSecret` for all customers.
2. **One Wiro agent instance per customer.**
3. **Each customer's page token is isolated** per `useragentguid`. Customer A's token never leaks to Customer B.
4. **Your app display name** shows on every consent screen — not "Wiro".
5. **Each customer must be in App Roles** until you go Live Mode. Capture their Facebook user ID during onboarding.
6. **Page admin rights must be current.** Meta returns only Pages the user is currently an admin of. If a customer loses admin access later, the agent will start failing — build a revalidation loop that periodically checks `FBStatus`.

## Related

- [Agent Credentials & OAuth](/docs/agent-credentials)
- [Agent Overview](/docs/agent-overview)
- [Agent Skills](/docs/agent-skills)
- [Meta Ads integration](/docs/integration-metaads-skills) — separate product; used for paid media, not organic posting.
- [Instagram integration](/docs/integration-instagram-skills)
- [Meta for Developers — Pages API](https://developers.facebook.com/docs/pages-api)
