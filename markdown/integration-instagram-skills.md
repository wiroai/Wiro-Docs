# Instagram Integration

Connect your agent to an Instagram Business Account to publish feed posts, carousels, reels, and stories.

## Overview

The Instagram integration uses Meta's Graph API against an Instagram Business (or Creator) account that's linked to a Facebook Page.

**Skills that use this integration:**

- `instagram-post` — Publish feed carousels, reels, and stories

**Agents that typically enable this integration:**

- Social Manager
- Any custom agent that needs Instagram publishing

## Availability

| Mode | Status | Notes |
|------|--------|-------|
| `"wiro"` | Coming soon | Wiro's shared Meta App is under review. |
| `"own"` | Available now | Use your own Meta Developer App in Development Mode — no App Review required. |

## Prerequisites

- **A Wiro API key** — [Authentication](/docs/authentication).
- **A deployed agent** — [Agent Overview](/docs/agent-overview); keep the `useragents[0].guid`.
- **A Meta Business account** — [business.facebook.com](https://business.facebook.com/).
- **A Meta Developer account** — [developers.facebook.com](https://developers.facebook.com/).
- **An Instagram Business or Creator account** — personal Instagram accounts cannot be connected via the Graph API.
- **An HTTPS callback URL** for your backend.

### Preparing the Instagram account

Before the user can complete OAuth:

1. In the Instagram mobile app: **Settings → Account → Switch to Professional Account** → pick **Business** or **Creator**.
2. In [Meta Business Suite](https://business.facebook.com/): select the Facebook Page that should own the Instagram account → **Settings → Linked accounts → Instagram → Connect account**. Sign in with the Instagram account and grant manage permissions.

Without both steps, the Graph API won't return the Instagram account during OAuth.

## Complete Integration Walkthrough

### Step 1: Create a Meta Developer App

If you already have one for Meta Ads or Facebook Page, reuse it.

1. [developers.facebook.com/apps](https://developers.facebook.com/apps) → **Create app** → **Other** → **Business**.
2. App display name, contact email, Business Account → **Create app**.
3. Leave in **Development Mode**.

### Step 2: Add the "Instagram" product

1. From the app dashboard, **Add product**.
2. Find **"Instagram"** (not "Instagram Basic Display" — that's for personal accounts and is being deprecated).
3. **Set up**.

### Step 3: Configure the OAuth redirect URI

1. Left sidebar: **Instagram → API setup with Instagram login**.
2. Scroll to **Business login settings** → **OAuth settings**.
3. Add to **Valid OAuth Redirect URIs**:

   ```
   https://api.wiro.ai/v1/UserAgentOAuth/IGCallback
   ```

4. **Save changes**.

> Note: Instagram OAuth has its own authorize URL at `instagram.com/oauth/authorize` (not `facebook.com/…`), but the redirect URI is still registered inside the Meta Developer App.

### Step 4: Note the required permissions

Wiro requests these exact scopes (verified against `api-useragent-oauth.js` L805-L806):

```
instagram_business_basic,instagram_business_content_publish,instagram_business_manage_messages,instagram_business_manage_comments,instagram_business_manage_insights
```

| Permission | Why |
|------------|-----|
| `instagram_business_basic` | Basic account info, profile data. |
| `instagram_business_content_publish` | Publish feed, carousel, reel, and story content. |
| `instagram_business_manage_messages` | Read and reply to DMs (used by some skills). |
| `instagram_business_manage_comments` | Read, reply, hide, delete comments. |
| `instagram_business_manage_insights` | Read engagement insights for posts and profile. |

These work without App Review in Development Mode for any Facebook user in App Roles. **No `pages_*` scopes are requested** — Instagram Login uses its own scope family.

### Step 5: Copy your App ID and App Secret

**App settings → Basic** → copy **App ID**, click **Show** → copy **App Secret**.

### Step 6: Add users as Testers (only if needed)

If the connecting person isn't the app Admin, add them under **App Roles → Roles → Add People → Testers**. The Facebook account they accept with must be the one linked to the Instagram Business Account via Meta Business Suite.

### Step 7: Save your Meta App credentials to Wiro

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Update" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "guid": "your-useragent-guid",
    "configuration": {
      "credentials": {
        "instagram": {
          "appId": "YOUR_META_APP_ID",
          "appSecret": "YOUR_META_APP_SECRET"
        }
      }
    }
  }'
```

### Step 8: Initiate OAuth

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/IGConnect" \
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
  "authorizeUrl": "https://www.instagram.com/oauth/authorize?client_id=...&redirect_uri=...&scope=instagram_business_basic%2Cinstagram_business_content_publish%2Cinstagram_business_manage_messages%2Cinstagram_business_manage_comments%2Cinstagram_business_manage_insights&response_type=code&state=...",
  "errors": []
}
```

### Step 9: Handle the callback

After consent, Wiro exchanges the code for a short-lived token, upgrades it to a long-lived token via `graph.instagram.com/access_token?grant_type=ig_exchange_token`, fetches the Instagram user info, and redirects the user back.

**Success URL:**

```
https://your-app.com/settings/integrations?ig_connected=true&ig_username=my_brand
```

Parse:

```javascript
const params = new URLSearchParams(window.location.search);

if (params.get("ig_connected") === "true") {
  const username = params.get("ig_username");
  showSuccess(`Connected @${username}`);
} else if (params.get("ig_error")) {
  handleError(params.get("ig_error"));
}
```

Instagram has **no secondary selection step** — the Business Account tied to the chosen Facebook Page is used directly.

### Step 10: Verify the connection

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/IGStatus" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "userAgentGuid": "your-useragent-guid" }'
```

```json
{
  "result": true,
  "connected": true,
  "username": "my_brand",
  "connectedAt": "2026-04-17T12:00:00.000Z",
  "tokenExpiresAt": "2026-06-16T12:00:00.000Z",
  "errors": []
}
```

- `connected: true` requires an `accessToken` and `authMethod` (`"wiro"` or `"own"`).
- `username` = Instagram handle (without `@`).
- `tokenExpiresAt` = ~60 days from connection.
- **No `refreshTokenExpiresAt`** — Instagram long-lived tokens don't use refresh tokens; they refresh via `grant_type=ig_refresh_token`.

### Step 11: Start the agent if it's not running

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Start" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "guid": "your-useragent-guid" }'
```

## API Reference

### POST /UserAgentOAuth/IGConnect

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userAgentGuid` | string | Yes | Agent instance GUID. |
| `redirectUrl` | string | Yes | HTTPS URL (or localhost/127.0.0.1 for dev). |
| `authMethod` | string | No | `"wiro"` (default) or `"own"`. |

### GET /UserAgentOAuth/IGCallback

Server-side. Query params appended to your `redirectUrl`:

| Param | Meaning |
|-------|---------|
| `ig_connected=true` | OAuth succeeded. |
| `ig_username` | Connected Instagram handle (without `@`). |
| `ig_error=<code>` | Failure. |

### POST /UserAgentOAuth/IGStatus

Response: `connected`, `username`, `connectedAt`, `tokenExpiresAt`.

### POST /UserAgentOAuth/IGDisconnect

Clears Instagram credentials (no remote revoke).

### POST /UserAgentOAuth/TokenRefresh

> Running agents refresh the Instagram token automatically via the daily maintenance cron. Use this only for debugging or manual overrides.

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/TokenRefresh" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "userAgentGuid": "your-useragent-guid",
    "provider": "instagram"
  }'
```

Uses `grant_type=ig_refresh_token` with the current access token (Instagram has no separate refresh token). See [Automatic token refresh](/docs/agent-credentials#automatic-token-refresh).

## Using the Skill

```json
{
  "guid": "your-useragent-guid",
  "configuration": {
    "custom_skills": [
      {
        "key": "daily-reel",
        "enabled": true,
        "interval": "0 10 * * *",
        "value": "Publish a reel highlighting today's most engaging topic"
      }
    ]
  }
}
```

## Troubleshooting

| Error code | Meaning | What to do |
|------------|---------|------------|
| `missing_params` | Callback hit without `state` or `code`. | Start a new flow from Step 8. |
| `session_expired` | >15 min between `IGConnect` and callback. | Call `IGConnect` again. |
| `authorization_denied` | User cancelled, or not in App Roles (Development Mode). | Add as Tester (Step 6), retry. |
| `token_exchange_failed` | Wrong App Secret, redirect URI mismatch, or no linked Instagram Business Account. | Re-copy App Secret; verify redirect URI; verify IG Business → FB Page linkage. |
| `useragent_not_found` | Invalid or unauthorized guid. | Use `POST /UserAgent/MyAgents`. |
| `invalid_config` | No `credentials.instagram` block. | `POST /UserAgent/Update` with `instagram.appId` and `instagram.appSecret`. |
| `internal_error` | Unexpected server error. | Retry. If persistent, contact support. |

### "No Instagram Business Account found" during OAuth

Most common cause: the Instagram account is still in Personal mode, or not linked to a Facebook Page the user administers. Walk through the [Preparing the Instagram account](#preparing-the-instagram-account) checklist.

### Publishing fails with "media upload failed"

Common causes:

- Image resolution too low (<320px) or aspect ratio outside Instagram's allowed ranges.
- Videos exceeding allowed durations (feed: 60s, reel: 90s, story: 60s).
- Instagram account switched back to Personal after connection — the token becomes invalid. Ask the user to switch back to Business and reconnect.

## Multi-Tenant Architecture

1. **One Meta Developer App** per product, same for Facebook, Instagram, Meta Ads.
2. **One Wiro agent instance per customer.**
3. **Each customer's Facebook user must be added to App Roles** until you go Live Mode.
4. **Business Account linkage is strict.** Build pre-flight validation during onboarding — the Graph API returns `instagram_business_account` on the Page object only when the linkage is set up.
5. **Tokens are isolated per agent instance.**

## Related

- [Agent Credentials & OAuth](/docs/agent-credentials)
- [Agent Overview](/docs/agent-overview)
- [Agent Skills](/docs/agent-skills)
- [Facebook Page integration](/docs/integration-facebook-skills) — the Facebook Page linkage is mandatory for Instagram.
- [Meta Ads integration](/docs/integration-metaads-skills) — for Instagram-placement paid ads.
- [Meta for Developers — Instagram Graph API](https://developers.facebook.com/docs/instagram-api)
