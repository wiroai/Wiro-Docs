# Facebook Page Integration

Connect your agent to one or more Facebook Pages with a recommended Meta
System User token or advanced customer-owned OAuth.

## Overview

The Facebook Page integration uses Meta Graph API v26 with a separate
Page-scoped access token for every selected Page. The recommended direct mode
accepts a Meta Business Manager System User token, validates it only on Wiro's
server, discovers its assigned Pages, and derives the selected Page tokens.
Neither the System User token nor the Page tokens are returned to the browser.
Customer-owned OAuth remains available as an advanced path.

**Skills that use this integration:**

- `int-facebookpage-post` — Publish text, photo, and video posts to a Facebook Page

**Agents that typically enable this integration:**

- Social Manager
- Any custom agent that needs Facebook Page posting

## Availability

| Mode | Status | Notes |
|------|--------|-------|
| `"api_key"` | **Recommended** | Enter a Business Manager System User token. No App ID, App Secret, or browser redirect is entered in Wiro. |
| `"own"` | Advanced | Use your own Meta Developer App and browser OAuth. Development Mode works for users assigned an App Role. |
| `"wiro"` | Coming soon | Wiro's shared Meta App is under review by Meta. |

## Prerequisites

- **A Wiro API key** — [Authentication](/docs/authentication).
- **A deployed agent** — [Agent Overview](/docs/agent-overview); keep the `useragents[0].guid`.
- **A Meta Business account** — [business.facebook.com](https://business.facebook.com/).
- **At least one Facebook Page assigned to the connecting principal** with the
  `CREATE_CONTENT` task. Add `MODERATE` when the agent should add comments.
- **Recommended direct mode:** a System User and the Business app used to
  generate its token.
- **Advanced OAuth mode:** a Meta Developer account, your own Business app, and
  an HTTPS callback URL for your backend.

## Recommended Setup: System User Token

This path is selected by default in the Wiro dashboard. It avoids browser OAuth
and does not require entering an App ID or App Secret in Wiro.

### Step 1: Prepare the System User and Page assets

1. Open [Meta Business Settings → Users → System Users](https://business.facebook.com/latest/settings/system_users).
2. Create or select a System User.
3. Assign every Facebook Page the agent may publish to with the
   `CREATE_CONTENT` task. Also assign `MODERATE` when the agent should add
   comments.
4. Select **Generate new token** and choose the Business app used for the
   integration.
5. At **Set expiration**, choose **Never** when Meta offers it. Some businesses
   are required to use an expiring token; reconnect Wiro with a newly generated
   token before that token expires.
6. Grant:
   - `business_management`
   - `pages_show_list`
   - `pages_read_engagement`
   - `pages_manage_posts`
   - `pages_manage_engagement` when comments are needed
   - `publish_video` when Page video publishing is needed

If a permission is absent from the token dialog, add the corresponding app use
case using Meta's
[use-case permission mapping](https://developers.facebook.com/documentation/development/create-an-app/use-cases-permission-mapping).
The Business app must not require `appsecret_proof` on every server request,
because direct mode intentionally does not collect the App Secret.

### Step 2: Save the token

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/CredentialUpsert" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "fields": [
      { "credentialkey": "facebook-pages", "fieldname": "authmethod", "fieldvalue": "api_key" },
      { "credentialkey": "facebook-pages", "fieldname": "systemusertoken", "fieldvalue": "YOUR_SYSTEM_USER_ACCESS_TOKEN" }
    ]
  }'
```

The token is encrypted and write-only. It is excluded from the agent runtime
and is never returned by customer-facing credential endpoints.

### Step 3: Validate the token and discover Pages

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/OAuthConnect" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "credentialkey": "facebook-pages",
    "authmethod": "api_key"
  }'
```

Response:

```json
{
  "result": true,
  "accounts": [
    { "id": "123", "name": "Main Page" },
    { "id": "456", "name": "Regional Page" }
  ],
  "errors": []
}
```

Only Page IDs and names are returned. Wiro keeps the System User token and all
derived Page access tokens server-side. A valid token with no assigned Page
carrying `CREATE_CONTENT` returns an error instead of an empty successful
connection.

### Step 4: Select one or more Pages

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/SetPickerAccounts" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "credentialkey": "facebook-pages",
    "accounts": [
      { "pageid": "123", "fbpagename": "Main Page" },
      { "pageid": "456", "fbpagename": "Regional Page" }
    ]
  }'
```

This finalizes the connection by matching each requested Page against the
server-side discovery result and storing only its Page-scoped runtime token.
Call it within 15 minutes of `OAuthConnect`. The dashboard auto-selects a sole
Page and opens a multi-select Page picker when several are returned. API
clients must still perform this request explicitly.

### Step 5: Verify the connection

Call `POST /UserAgentOAuth/OAuthStatus` with
`{ "useragentguid": "...", "credentialkey": "facebook-pages" }`. A successful
direct connection returns the selected Pages, `connected: true`, and an empty
`tokenexpiresat`.

## Advanced Setup: Customer-Owned OAuth

This path uses Meta's documented Facebook Login for Business flow.

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

Wiro requests these exact scopes:

```
pages_show_list,pages_manage_posts,publish_video,pages_manage_engagement,pages_read_engagement,pages_read_user_content,pages_manage_metadata,pages_messaging
```

| Permission | Why |
|------------|-----|
| `pages_show_list` | Enumerate the Pages the user administers. |
| `pages_manage_posts` | Publish and manage Page posts and photos. |
| `publish_video` | Publish videos to a Page. |
| `pages_manage_engagement` | Add and moderate comments as the Page. |
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
curl -X POST "https://api.wiro.ai/v1/UserAgent/CredentialUpsert" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "fields": [
      { "credentialkey": "facebook-pages", "fieldname": "authmethod", "fieldvalue": "own" },
      { "credentialkey": "facebook-pages", "fieldname": "appid", "fieldvalue": "YOUR_META_APP_ID" },
      { "credentialkey": "facebook-pages", "fieldname": "appsecret", "fieldvalue": "YOUR_META_APP_SECRET" }
    ]
  }'
```

Wiro merges this into only the `facebook-pages` group — other credentials are untouched.

### Step 7: Initiate OAuth

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/OAuthConnect" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "credentialkey": "facebook-pages",
    "redirecturl": "https://your-app.com/settings/integrations",
    "authmethod": "own"
  }'
```

Response:

```json
{
  "result": true,
  "authorizeUrl": "https://www.facebook.com/v26.0/dialog/oauth?client_id=...&redirect_uri=...&scope=pages_show_list%2Cpages_manage_posts%2Cpublish_video%2Cpages_manage_engagement%2Cpages_read_engagement%2Cpages_read_user_content%2Cpages_manage_metadata%2Cpages_messaging&auth_type=rerequest&response_type=code&state=...",
  "errors": []
}
```

Redirect the user's browser to `authorizeUrl`. State has a 15-minute TTL.

### Step 8: Handle the callback and list returned Pages

After consent, Wiro exchanges the code for a user access token, fetches every admin-managed Page **with its page-specific access token**, caches the full list server-side, and redirects the user to your `redirecturl`.

**Crucial:** Wiro does **not** auto-select a Page. The connection is incomplete until the client calls `SetPickerAccounts` with a chosen page. `POST /UserAgentOAuth/OAuthStatus` returns `connected: false` during this window.

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
    await setPickerAccounts([pages[0]]);
  } else {
    presentPagePicker(pages);
  }
} else if (params.get("fb_error")) {
  handleError(params.get("fb_error"));
}
```

### Step 9: Persist the page selection (required)

**This step is mandatory.** The connection remains incomplete and
`OAuthStatus` reports `connected: false` until you call `SetPickerAccounts`.

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/SetPickerAccounts" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "credentialkey": "facebook-pages",
    "accounts": [
      { "pageid": "456", "fbpagename": "Page B" }
    ]
  }'
```

Response:

```json
{
  "result": true,
  "accounts": [
    { "id": "456", "name": "Page B" }
  ],
  "errors": []
}
```

Wiro validates every requested Page against the server-side discovery result,
stores its long-lived Page access token without returning it to the client, and
restarts a running agent so the new selection takes effect.

If the 15-minute window lapses before you call `SetPickerAccounts`, you'll get
`No pending Facebook connection. Please reconnect via OAuthConnect.` Repeat
Step 3 for System User mode or Step 7 for OAuth.

`fbpagename` is optional; if omitted, Wiro uses the name from the cached page list. The Facebook Pages picker accepts one or more entries — pass multiple `{ pageid, fbpagename }` objects to authorize the agent against several pages at once.

### Step 10: Verify the connection

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/OAuthStatus" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "credentialkey": "facebook-pages"
  }'
```

Response:

```json
{
  "result": true,
  "connected": true,
  "accounts": [
    { "id": "456", "name": "Page B" }
  ],
  "connectedat": "2026-04-17T12:00:00.000Z",
  "tokenexpiresat": "",
  "errors": []
}
```

- `connected: true` requires a validated active mode and at least one saved
  Page, meaning `SetPickerAccounts` completed successfully.
- `accounts[]` carries one entry per selected page (`id` = `pageid`, `name` = `fbpagename`).
- Long-lived Facebook Page tokens have no fixed expiration date. They can still be invalidated when the user changes access, removes permissions, deauthorizes the app, or changes security-sensitive account settings.

### Step 11: Start the agent if it's not running

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Start" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "guid": "your-useragent-guid" }'
```

Agents already running at `SetPickerAccounts` time restart automatically to pick up the new credentials.

## API Reference

### POST /UserAgentOAuth/OAuthConnect

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Agent instance GUID. |
| `credentialkey` | string | Yes | `"facebook-pages"`. |
| `redirecturl` | string | OAuth only | HTTPS URL (or `http://localhost` / `http://127.0.0.1` for dev). Direct System User validation does not use it. |
| `authmethod` | string | No | `"api_key"` for the recommended System User path, `"own"` for customer-owned OAuth, or `"wiro"` when Wiro-managed OAuth becomes available. Send the value explicitly. |

OAuth response: `{ result, authorizeUrl, errors }`. Direct response:
`{ result, accounts: [{id, name}], errors }` with no `authorizeUrl`.

### GET /UserAgentOAuth/FBCallback

Server-side. Query params appended to your `redirecturl`:

| Param | Meaning |
|-------|---------|
| `fb_connected=true` | OAuth completed; pending payload cached awaiting `SetPickerAccounts`. |
| `fb_pages` | URL-encoded JSON `[{id, name}, ...]` of admin-managed Pages. |
| `fb_error=<code>` | Failure. |

The callback path is per-provider — Facebook's stays `FBCallback`.

### POST /UserAgentOAuth/SetPickerAccounts

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Agent instance GUID. |
| `credentialkey` | string | Yes | `"facebook-pages"`. |
| `accounts` | array | Yes | One or more `{ pageid, fbpagename? }` entries. The per-page access token is resolved from the latest server-side OAuth or System User discovery result — don't supply it. |

Response: `{ result, accounts: [{id, name}, ...], errors }`. Triggers auto-restart if running.

> Call within **15 minutes** of the OAuth callback or direct
> `OAuthConnect` discovery. After that, restart the selected connection flow.

### POST /UserAgentOAuth/OAuthStatus

Body: `{ useragentguid, credentialkey: "facebook-pages" }`. Response: `connected` (only `true` when both `accesstoken` and `pageid` are set), `accounts: [{id, name}, ...]` (every selected Page), `connectedat`, and an empty `tokenexpiresat`.

### POST /UserAgentOAuth/OAuthDisconnect

Body: `{ useragentguid, credentialkey: "facebook-pages" }`. Clears the active
token and Page selection without remote revocation. Direct mode also clears
`systemusertoken`; customer-owned OAuth App ID and App Secret are preserved for
reconnection.

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/OAuthDisconnect" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "credentialkey": "facebook-pages"
  }'
```

### Token lifecycle

Selected Pages use long-lived Page tokens with no fixed expiration timestamp.
Meta can still invalidate them when permissions, asset assignments, app access,
or account security settings change. In direct mode, an expiring System User
token must also be regenerated before Meta's stated expiry. If either token is
invalidated, enter a current System User token or repeat customer-owned OAuth,
then select the Pages again.

## Using the Skill

Once the Facebook Page is connected, the agent uses
`int-facebookpage-post` to publish text, photo, and video posts. To adjust the
Social Manager's bundled `cs-cron-content-scanner` schedule, call
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

To change **what** the scheduled task posts (topics, tone, content angle), edit
the paired preference skill `cs-content-tone` instead — see
[Agent Skills → Updating Preference Skills](/docs/agent-skills#updating-preference-skills).

## Troubleshooting

| Error code | Meaning | What to do |
|------------|---------|------------|
| `missing_params` | Callback hit without `state` or `code`. | Start a new flow from Step 7. |
| `session_expired` | >15 min between `OAuthConnect` and the callback. | Call `OAuthConnect` again. |
| `authorization_denied` | User cancelled, or not listed in App Roles (Development Mode). | Add as Tester (Step 5), retry. |
| `token_exchange_failed` | Wrong App Secret or redirect URI mismatch. | Re-copy App Secret; verify redirect URI exactly. |
| `no_pages` | User has no administered Facebook Pages. | Ask the user to create/administer a Page first, retry. |
| `useragent_not_found` | Invalid or unauthorized `useragentguid`. | Use `POST /UserAgent/MyAgents`. |
| `Facebook Pages credentials not configured` | Returned in `OAuthConnect`'s `errors[]` when `authmethod: "own"` but `appid` / `appsecret` are missing. | Call `POST /UserAgent/CredentialUpsert` with `facebook-pages.appid` and `facebook-pages.appsecret`, then retry. |
| `Meta could not validate this System User token` | Direct mode received an invalid token, missing permission, or inaccessible asset. | Generate a current System User token with the documented permissions and Page assignments, save it, and retry. |
| Valid token but no assigned Facebook Page | The System User has no Page with the `CREATE_CONTENT` task. | Assign the Page in Business Settings and reconnect. |
| `internal_error` | Unexpected server error (includes cache write failures). | Retry once. If persistent, contact support. |

### `SetPickerAccounts` returns "No pending Facebook connection"

The 15-minute pending cache expired, or you passed a `pageid` that wasn't in
the latest discovery result. Repeat Step 3 for System User mode or Step 7 for
OAuth.

### `SetPickerAccounts` returns "Selected pageid not found in pending pages list"

The `pageid` you sent doesn't match any ID in the cached list. Verify you're parsing `fb_pages` correctly and sending the exact ID string.

### Posts publish but as the wrong author

Check `POST /UserAgent/Detail` and verify `credentials.facebook-pages.pageid` is the Page you intended. If not, disconnect and reconnect, or call `SetPickerAccounts` again within a fresh 15-minute window.

### "App not verified" banner on consent

Expected in Development Mode. Users in App Roles can click Continue.

## Multi-Tenant Architecture

1. **One Wiro agent instance per customer.**
2. **Recommended direct mode:** each customer supplies a System User token from
   their own Business Portfolio. No browser consent screen or shared Wiro Meta
   app is involved.
3. **Advanced OAuth mode:** each customer-owned Meta app controls its own App
   Roles, review status, and consent branding.
4. **Every Page token is isolated** per useragent. Customer A's token is never
   returned to or shared with Customer B.
5. **Asset tasks must remain current.** Losing `CREATE_CONTENT` or `MODERATE`
   access invalidates the corresponding publish or comment capability. Monitor
   `OAuthStatus` and require reconnection when it becomes disconnected.

## Related

- [Agent Credentials & OAuth](/docs/agent-credentials)
- [Agent Overview](/docs/agent-overview)
- [Agent Skills](/docs/agent-skills)
- [Meta Ads integration](/docs/integration-metaads-skills) — separate product; used for paid media, not organic posting.
- [Instagram integration](/docs/integration-instagram-skills)
- [Meta for Developers — Pages API](https://developers.facebook.com/docs/pages-api)
- [Meta for Developers — System User API calls](https://developers.facebook.com/docs/marketing-api/system-users/guides/api-calls/)
