# Instagram Integration

Connect your agent to an Instagram professional account with a recommended Meta
System User token or advanced customer-owned Instagram OAuth.

## Overview

The Instagram integration supports two official Meta paths. Recommended direct
mode uses a Business Manager System User and the Facebook Page linked to an
Instagram Business or Creator account. Advanced mode uses Instagram API with
Instagram Login directly and does not require a Facebook Page. Both paths keep
tokens server-side and publish through Graph API v26.

The two token types use different official hosts: System User mode derives a
Facebook Page access token and publishes through `graph.facebook.com/v26.0`;
Instagram Login issues an Instagram User access token and publishes through
`graph.instagram.com/v26.0`. Wiro selects the matching host automatically.

**Skills that use this integration:**

- `int-instagram-post` — Publish feed carousels, reels, and stories

**Agents that typically enable this integration:**

- Social Manager
- Any custom agent that needs Instagram publishing

## Availability

| Mode | Status | Notes |
|------|--------|-------|
| `"api_key"` | **Recommended** | Enter a Business Manager System User token. Wiro discovers eligible linked Instagram professional accounts without browser OAuth. |
| `"own"` | Advanced | Use your own Meta Business app and Instagram Login OAuth. This path does not require a linked Facebook Page. |
| `"wiro"` | Coming soon | Wiro's shared Meta App is under review. |

## Prerequisites

- **A Wiro API key** — [Authentication](/docs/authentication).
- **A deployed agent** — [Agent Overview](/docs/agent-overview); keep the `useragents[0].guid`.
- **A Meta Business account** — [business.facebook.com](https://business.facebook.com/).
- **An Instagram Business or Creator account** — personal accounts cannot use
  content publishing.
- **Recommended direct mode:** a System User, the Business app used to generate
  its token, and a Facebook Page linked to the Instagram professional account.
- **Advanced OAuth mode:** a Meta Developer account, an app configured for
  Instagram Login, and an HTTPS callback URL. A Facebook Page is not required
  for this mode.

### Preparing the Instagram account

For recommended System User mode:

1. In the Instagram mobile app: **Settings → Account → Switch to Professional Account** → pick **Business** or **Creator**.
2. In [Meta Business Suite](https://business.facebook.com/): select the Facebook Page that should own the Instagram account → **Settings → Linked accounts → Instagram → Connect account**. Sign in with the Instagram account and grant manage permissions.

Without both steps, Facebook Graph API cannot discover the professional account
from the System User's assigned Pages.

For advanced Instagram Login OAuth, only step 1 is required. Meta's Instagram
Login flow accesses the professional account directly and does not require a
Facebook Page.

## Recommended Setup: System User Token

This is the dashboard's default path. Wiro uses the System User token only on
the server to discover assigned Pages, find their linked Instagram professional
accounts, and derive the Page access token required by the Facebook Login form
of Instagram Content Publishing.

### Step 1: Assign the Page and Instagram assets

1. Complete [Preparing the Instagram account](#preparing-the-instagram-account).
2. Open [Meta Business Settings → Users → System Users](https://business.facebook.com/latest/settings/system_users).
3. Create or select a System User.
4. Assign the linked Facebook Page with `CREATE_CONTENT`.
5. Assign the Instagram account's **Content** task.
6. Select **Generate new token** and choose the Business app used for this
   integration.
7. At **Set expiration**, choose **Never** when Meta offers it. If Meta requires
   an expiring token for the business, regenerate and reconnect before expiry.
8. Grant:
   - `business_management`
   - `instagram_basic`
   - `instagram_content_publish`
   - `pages_show_list`
   - `pages_read_engagement`
   - `ads_read`
   - `ads_management`

Meta's Page-linked publishing contract requires both ads permissions when the
Page role is granted through Business Manager.

If a permission does not appear, add the matching app use case through Meta's
[use-case permission mapping](https://developers.facebook.com/documentation/development/create-an-app/use-cases-permission-mapping).
The Business app must not require `appsecret_proof` on every request because
direct mode does not collect its App Secret.

### Step 2: Save the token

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/CredentialUpsert" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "fields": [
      { "credentialkey": "instagram", "fieldname": "authmethod", "fieldvalue": "api_key" },
      { "credentialkey": "instagram", "fieldname": "systemusertoken", "fieldvalue": "YOUR_SYSTEM_USER_ACCESS_TOKEN" }
    ]
  }'
```

The System User token is encrypted, write-only, excluded from the agent
runtime, and never returned by customer-facing credential endpoints.

### Step 3: Validate and discover Instagram accounts

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/OAuthConnect" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "credentialkey": "instagram",
    "authmethod": "api_key"
  }'
```

Response:

```json
{
  "result": true,
  "accounts": [
    { "id": "17841400000000000", "name": "my_brand" }
  ],
  "errors": []
}
```

Only public IDs and usernames are returned. The System User and derived Page
tokens stay server-side.

### Step 4: Select the Instagram account

Instagram is a single-select picker. Send exactly one discovered account:

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/SetPickerAccounts" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "credentialkey": "instagram",
    "accounts": [
      { "accountId": "17841400000000000", "igusername": "my_brand" }
    ]
  }'
```

Call this within 15 minutes of `OAuthConnect`. Wiro matches the selection
against its server-side discovery result and stores the derived Page-scoped
runtime token. The dashboard auto-selects a sole result; API clients must still
call this endpoint explicitly. If several linked professional accounts are
returned, the dashboard opens the single-select Instagram picker.

### Step 5: Verify the connection

Call `POST /UserAgentOAuth/OAuthStatus` with
`{ "useragentguid": "...", "credentialkey": "instagram" }`. A successful
direct connection returns the selected numeric account ID and username,
`connected: true`, and an empty `tokenexpiresat`.

## Advanced Setup: Customer-Owned Instagram OAuth

### Step 1: Create a Meta Developer App

You may reuse a compatible Business app that already has the Instagram product
configured.

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

Wiro requests these exact scopes:

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

If the connecting person is not the app Admin, add them under **App Roles →
Roles → Add People → Testers** and have them accept before starting OAuth.

### Step 7: Save your Meta App credentials to Wiro

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/CredentialUpsert" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "fields": [
      { "credentialkey": "instagram", "fieldname": "authmethod", "fieldvalue": "own" },
      { "credentialkey": "instagram", "fieldname": "appid", "fieldvalue": "YOUR_META_APP_ID" },
      { "credentialkey": "instagram", "fieldname": "appsecret", "fieldvalue": "YOUR_META_APP_SECRET" }
    ]
  }'
```

### Step 8: Initiate OAuth

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/OAuthConnect" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "credentialkey": "instagram",
    "redirecturl": "https://your-app.com/settings/integrations",
    "authmethod": "own"
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

Advanced Instagram Login OAuth has **no secondary selection step**. The
authorized Instagram professional account is written directly by the callback.
The `SetPickerAccounts` step applies only to recommended System User mode.

### Step 10: Verify the connection

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/OAuthStatus" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "credentialkey": "instagram"
  }'
```

```json
{
  "result": true,
  "connected": true,
  "accounts": [
    { "id": "17841400000000000", "name": "my_brand" }
  ],
  "connectedat": "2026-04-17T12:00:00.000Z",
  "tokenexpiresat": "2026-06-16T12:00:00.000Z",
  "errors": []
}
```

- `connected: true` requires the active mode's validated secret plus the
  selected or authorized Instagram account.
- `accounts[0].id` = numeric Instagram professional account ID.
- `accounts[0].name` = Instagram username without `@`.
- `tokenexpiresat` is empty for direct System User mode and approximately 60
  days for customer-owned Instagram OAuth.
- **No `refreshtokenexpiresat`** — Instagram does not expose a separate refresh token for this connection.

### Step 11: Start the agent if it's not running

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
| `credentialkey` | string | Yes | `"instagram"`. |
| `redirecturl` | string | OAuth only | HTTPS URL (or localhost/127.0.0.1 for dev). Direct System User validation does not use it. |
| `authmethod` | string | No | `"api_key"` for recommended System User mode, `"own"` for customer-owned Instagram OAuth, or `"wiro"` when Wiro-managed OAuth becomes available. Send the value explicitly. |

OAuth response: `{ result, authorizeUrl, errors }`. Direct response:
`{ result, accounts: [{id, name}], errors }` with no `authorizeUrl`.

### GET /UserAgentOAuth/IGCallback

Server-side. Query params appended to your `redirecturl`:

| Param | Meaning |
|-------|---------|
| `ig_connected=true` | OAuth succeeded. |
| `ig_username` | Connected Instagram handle (without `@`). |
| `ig_error=<code>` | Failure. |

The callback path is per-provider — Instagram's stays `IGCallback`.

### POST /UserAgentOAuth/SetPickerAccounts

Used only by direct System User mode after `OAuthConnect` discovery.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Agent instance GUID. |
| `credentialkey` | string | Yes | `"instagram"`. |
| `accounts` | array | Yes | Exactly one `{ accountId, igusername? }` entry from the latest discovery response. Do not supply an access token. |

Call within 15 minutes of direct discovery. The response contains
`{ result, accounts: [{id, name}], errors }` and restarts a running agent after
the selection is persisted.

### POST /UserAgentOAuth/OAuthStatus

Body: `{ useragentguid, credentialkey: "instagram" }`. Response: `connected`,
`accounts: [{id, name}]` where `id` is the numeric account ID and `name` is the
username, `connectedat`, and `tokenexpiresat`.

### POST /UserAgentOAuth/OAuthDisconnect

Body: `{ useragentguid, credentialkey: "instagram" }`. Clears the active token
and selected account without remote revocation. Direct mode also clears
`systemusertoken`; customer-owned OAuth App ID and App Secret are preserved for
reconnection.

### Token lifecycle

Wiro refreshes renewable customer-owned Instagram OAuth tokens while the agent
is running. Direct mode uses a System User token plus a derived Page token with
no fixed expiry recorded by Wiro. Meta can still invalidate either token when
permissions, asset assignments, or account security change; expiring System
User tokens must be regenerated before Meta's stated expiry. If `OAuthStatus`
reports `connected: false`, reconnect using the active mode.

## Using the Skill

Once the Instagram professional account is connected, the agent uses
`int-instagram-post` to publish feed carousels, reels, and stories. To adjust
the Social Manager's bundled `cs-cron-content-scanner` schedule, call
`UserAgent/CustomSkillUpsert` with `enabled` and `interval` only:

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/CustomSkillUpsert" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "skillkey": "cs-cron-content-scanner",
    "enabled": true,
    "interval": "0 */4 * * *"
  }'
```

To change **what** the scheduled task posts (topics, tone, hashtag rules,
caption style), edit the paired preference skill `cs-content-tone` instead —
see [Agent Skills → Updating Preference Skills](/docs/agent-skills#updating-preference-skills).

## Troubleshooting

| Error code | Meaning | What to do |
|------------|---------|------------|
| `missing_params` | Callback hit without `state` or `code`. | Start a new flow from Step 8. |
| `session_expired` | >15 min between `OAuthConnect` and callback. | Call `OAuthConnect` again. |
| `authorization_denied` | User cancelled, or not in App Roles (Development Mode). | Add as Tester (Step 6), retry. |
| `token_exchange_failed` | Wrong App Secret, redirect URI mismatch, or Instagram rejected the authorization code. | Re-copy the App Secret, verify the redirect URI, and retry Instagram Login. |
| `useragent_not_found` | Invalid or unauthorized guid. | Use `POST /UserAgent/MyAgents`. |
| `Instagram credentials not configured` | Returned in `OAuthConnect`'s `errors[]` when `authmethod: "own"` but `appid` / `appsecret` are missing. | `POST /UserAgent/CredentialUpsert` with `instagram.appid` and `instagram.appsecret`. |
| `Meta could not validate this System User token` | Direct mode received an invalid token, missing permission, or inaccessible asset. | Generate a current token with the documented permissions and asset assignments, save it, and retry. |
| Valid token but no connected Instagram professional account | No assigned Page exposes a linked professional account with `CREATE_CONTENT`. | Link the account to the Page, assign both assets to the System User, and reconnect. |
| `internal_error` | Unexpected server error. | Retry. If persistent, contact support. |

### "No Instagram Business Account found" during OAuth

In System User mode, the account is still Personal, is not linked to an
assigned Facebook Page, or the Page lacks `CREATE_CONTENT`. In advanced
Instagram OAuth mode, the usual cause is a Personal account or an app-role /
permission problem. Follow the mode-specific prerequisites above.

### Publishing fails with "media upload failed"

Common causes:

- Image resolution too low (<320px) or aspect ratio outside Instagram's allowed ranges.
- Media that does not meet Meta's current format, duration, size, or codec
  requirements.
- Instagram account switched back to Personal after connection — the token becomes invalid. Ask the user to switch back to Business and reconnect.

## Multi-Tenant Architecture

1. **One Wiro agent instance per customer.**
2. **Recommended direct mode:** each customer supplies a System User token from
   its own Business Portfolio and assigns its own Page plus Instagram assets.
3. **Advanced OAuth mode:** each customer-owned Meta app controls its own App
   Roles, review status, and Instagram consent branding.
4. **Page linkage is mode-specific.** It is mandatory for System User mode but
   not for Instagram API with Instagram Login.
5. **Tokens are isolated per useragent** and are never returned to another
   customer or to the browser.

## Related

- [Agent Credentials & OAuth](/docs/agent-credentials)
- [Agent Overview](/docs/agent-overview)
- [Agent Skills](/docs/agent-skills)
- [Facebook Page integration](/docs/integration-facebook-skills) — Page linkage is required for System User mode, not Instagram Login OAuth.
- [Meta Ads integration](/docs/integration-metaads-skills) — for Instagram-placement paid ads.
- [Meta for Developers — Instagram Graph API](https://developers.facebook.com/docs/instagram-api)
- [Meta for Developers — Content Publishing API comparison](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/content-publishing/)
