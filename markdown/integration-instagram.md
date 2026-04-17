# Instagram Integration

Connect your agents to an Instagram Business Account so they can publish posts, reels, stories, and carousels.

## Overview

The Instagram integration lets an agent publish content to an Instagram Business or Creator account via Meta's Instagram Graph API.

**Skills that use this integration:**

- `instagram-post` — Publish photos, videos, reels, carousels, and stories

**Agents that typically enable this integration:**

- Social Manager
- Any custom agent that needs Instagram publishing

## Availability

| Mode | Status | Notes |
|------|--------|-------|
| `"wiro"` | Coming soon | Wiro's shared Meta App is under review. |
| `"own"` | Available now | Use your own Meta Developer App in Development Mode — no App Review required. |

## Prerequisites

- **A Wiro API key** — see [Authentication](/docs/authentication).
- **A deployed agent** — see [Agent Overview](/docs/agent-overview), keep the `useragentguid`.
- **A Meta Business account** — [business.facebook.com](https://business.facebook.com/).
- **A Meta Developer account** — [developers.facebook.com](https://developers.facebook.com/).
- **Instagram Business Account linked to a Facebook Page.** This is **mandatory** — personal Instagram accounts cannot be connected via the Graph API.
- **An HTTPS callback URL** for your backend.

### Linking an Instagram account to a Facebook Page

If your Instagram account is not yet connected to a Facebook Page:

1. Open [Meta Business Suite](https://business.facebook.com/) and select the Page that will own this Instagram account.
2. Go to **Settings → Linked accounts → Instagram → Connect account**.
3. Sign in with the Instagram account. Grant manage permissions.
4. Back in Instagram mobile app, go to **Settings → Account → Switch to Professional Account** if the account is still Personal. Pick **Business** or **Creator**.
5. Under **Settings → Business tools → Connected Accounts → Facebook**, confirm the Page link.

Until both the Instagram Business switch and the Facebook Page link are complete, the Graph API will not return this Instagram account during OAuth.

## Complete Integration Walkthrough

### Step 1: Create a Meta Developer App

Same Meta App you already use for Facebook Page or Meta Ads works here — one app can serve all three integrations. If you do not have one yet:

1. [developers.facebook.com/apps](https://developers.facebook.com/apps) → **Create app** → **Other** → **Business**.
2. App display name, contact email, Business Account.
3. Create. Leave in **Development Mode**.

### Step 2: Add the "Instagram" product

1. From the app dashboard, click **Add product**.
2. Find **"Instagram"** (not "Instagram Basic Display" — that one is for personal accounts only and is being deprecated).
3. Click **Set up**.
4. You may be prompted to confirm the Instagram-for-Business use case.

### Step 3: Configure the OAuth redirect URI

1. In the left sidebar: **Instagram → API setup with Instagram login**.
2. Scroll to **Business login settings** and then **OAuth settings**.
3. Under **Valid OAuth Redirect URIs** add:

   ```
   https://api.wiro.ai/v1/UserAgentOAuth/IGCallback
   ```

4. Click **Save changes**.

> Unlike Facebook Page, Instagram OAuth uses its own authorize URL at `instagram.com/oauth/authorize` — but the redirect URI is still registered inside the Meta Developer App UI.

### Step 4: Note the required permissions

Wiro requests these Instagram-specific and Page-adjacent scopes:

| Permission | Why it is needed |
|------------|------------------|
| `instagram_business_basic` | Basic account info, profile data. |
| `instagram_business_content_publish` | Publish posts, reels, stories, carousels. |
| `instagram_business_manage_messages` | Read and reply to DMs (if enabled). |
| `instagram_business_manage_comments` | Read, reply to, and moderate comments. |
| `pages_show_list` | Required companion scope to locate the linked Facebook Page. |
| `pages_read_engagement` | Read engagement on the linked Page's posts. |
| `business_management` | Query business assets. |

In Development Mode these scopes work without App Review for Facebook users added under App Roles.

### Step 5: Copy your App ID and App Secret

**App settings → Basic** → copy App ID; **Show** → copy App Secret.

### Step 6: Add other Facebook accounts as Testers (only if needed)

If the person connecting Instagram is not the app's Admin, add them under **App Roles → Roles → Add People → Testers**. The user accepts the invite at [facebook.com/settings → Business Integrations](https://www.facebook.com/settings?tab=business_tools). Note that the Facebook account they use for App Roles must be the same one linked to the Instagram Business Account via Meta Business Suite.

### Step 7: Save credentials to Wiro

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

Wiro merges credential updates — `accessToken` and other fields written later by the OAuth callback will not wipe `appId`/`appSecret`.

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
  "authorizeUrl": "https://www.instagram.com/oauth/authorize?client_id=...&redirect_uri=...&scope=instagram_business_basic,instagram_business_content_publish,...",
  "errors": []
}
```

Redirect the user to `authorizeUrl`. State has a 15-minute TTL.

### Step 9: Handle the callback

After consent, Wiro exchanges the code for a short-lived token, upgrades it to a long-lived token, fetches the linked Instagram Business Account ID, saves it, and redirects the user back.

**Success URL** looks like:

```
https://your-app.com/settings/integrations?ig_connected=true&ig_username=my_brand
```

Parse:

```javascript
const params = new URLSearchParams(window.location.search);

if (params.get("ig_connected") === "true") {
  const username = params.get("ig_username");
  showSuccess(`Connected to @${username}`);
} else if (params.get("ig_error")) {
  handleError(params.get("ig_error"));
}
```

Instagram has no secondary selection step (unlike Meta Ads' ad account or Facebook's page picker) — the Instagram Business Account tied to the chosen Facebook Page is used directly.

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

### Step 11: Start the agent if it is not running

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Start" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "guid": "your-useragent-guid" }'
```

Already-running agents restart automatically.

## API Reference

### **POST** /UserAgentOAuth/IGConnect

Start the Instagram OAuth flow.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userAgentGuid` | string | Yes | Agent instance GUID. |
| `redirectUrl` | string | Yes | HTTPS URL where the user returns after consent. |
| `authMethod` | string | No | `"wiro"` (default) or `"own"`. Use `"own"` while the shared app is pending. |

Response: `{ result, authorizeUrl, errors }`.

### **GET** /UserAgentOAuth/IGCallback

Server-side callback. Wiro returns users to your `redirectUrl` with:

| Param | Meaning |
|-------|---------|
| `ig_connected=true` | OAuth succeeded. |
| `ig_username` | Connected Instagram username (without the `@`). |
| `ig_error=<code>` | Failure. See [Troubleshooting](#troubleshooting). |

### **POST** /UserAgentOAuth/IGStatus

Check the current connection state.

Response fields: `connected`, `username`, `connectedAt`, `tokenExpiresAt`.

### **POST** /UserAgentOAuth/IGDisconnect

Revoke and clear Instagram credentials.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userAgentGuid` | string | Yes | Agent instance GUID. |

### **POST** /UserAgentOAuth/TokenRefresh

Force-refresh the Instagram long-lived token.

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/TokenRefresh" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "userAgentGuid": "your-useragent-guid",
    "provider": "instagram"
  }'
```

Instagram long-lived tokens last ~60 days and auto-refresh; manual refresh is rarely needed.

## Using the Skill

Enable `instagram-post` in the agent's skills and optionally schedule runs — see [Agent Skills](/docs/agent-skills).

```json
{
  "guid": "your-useragent-guid",
  "configuration": {
    "custom_skills": [
      {
        "key": "daily-reel",
        "enabled": true,
        "interval": "0 10 * * *",
        "value": "Publish a reel highlighting today's most engaging story arc"
      }
    ]
  }
}
```

## Troubleshooting

| Error code | Meaning | What to do |
|------------|---------|------------|
| `missing_params` | Callback hit without `state` or `code`. | Start a new OAuth flow from Step 8. |
| `session_expired` | >15 minutes between `IGConnect` and callback. | Call `IGConnect` again. |
| `authorization_denied` | User cancelled, or in Development Mode the user is not in App Roles. | Add the user as a Tester (Step 6), get them to accept, retry. |
| `token_exchange_failed` | Wrong App Secret, redirect URI mismatch, or no linked Instagram Business Account. | Verify App Secret, redirect URI, and that the Facebook Page linked to Instagram is the one the user administers. |
| `useragent_not_found` | Invalid or unauthorized `userAgentGuid`. | Use `POST /UserAgent/MyAgents` to find the correct guid. |
| `invalid_config` | No `credentials.instagram` block on the agent. | `POST /UserAgent/Update` with `instagram.appId` and `instagram.appSecret`, retry. |
| `internal_error` | Unexpected server error. | Retry once. If persistent, contact support. |

### "No Instagram Business Account found" during OAuth

The user must have an Instagram **Business** or **Creator** account linked to a Facebook Page they administer. Personal Instagram accounts are rejected.

Checklist for the user:

1. Open Instagram mobile app → **Settings → Account → Switch to Professional Account**. Pick **Business** or **Creator**.
2. Meta Business Suite → Target Page → **Settings → Linked accounts → Instagram → Connect**.
3. The same Facebook user who is in your app's Roles must be an admin of the Page that is linked to the Instagram account.

### "App not verified" banner

Expected in Development Mode. Users added to App Roles can click **Continue** and finish authorization.

### Publishing fails with "media upload failed"

Common causes:

- Image resolution too low (<320px) or aspect ratio outside Instagram's allowed ranges.
- Videos longer than allowed for the content type (reels, stories, posts each have their own limits).
- Instagram account switched back to Personal after connection — the token becomes invalid. Ask the user to revert to Business and reconnect.

## Multi-Tenant Architecture

1. **One Meta Developer App** for all customers; same app also covers Meta Ads and Facebook Page if needed.
2. **One Wiro agent instance per customer.**
3. **Each customer's Facebook user must be added to App Roles** until you go Live Mode. Onboarding flow should capture their Facebook user ID.
4. **Instagram Business Account requirement is strict** — build pre-flight validation into your onboarding to catch personal-account users before they see Wiro's Connect button. The Meta Graph API returns an `instagram_business_account` field on the Page object only when the link is set up correctly; surface a clear error otherwise.
5. **Tokens are isolated per agent instance.** Customer A's Instagram token is never visible to Customer B.

## Related

- [Agent Credentials & OAuth](/docs/agent-credentials)
- [Agent Overview](/docs/agent-overview)
- [Agent Skills](/docs/agent-skills)
- [Facebook Page integration](/docs/integration-facebook) — the Facebook Page linkage is mandatory.
- [Meta Ads integration](/docs/integration-metaads) — for Instagram-placement ads.
- [Meta for Developers — Instagram Graph API](https://developers.facebook.com/docs/instagram-api)
