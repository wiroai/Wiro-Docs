# Pinterest Integration

Connect your agent to a Pinterest business account with your own Pinterest app to create image Pins on your boards, list boards and Pins, and read Pin and account analytics. Organic Pins only: this integration does not run ads.

## Overview

The Pinterest integration uses Pinterest API v5 (`api.pinterest.com/v5`) with OAuth 2.0 and an app you own at [developers.pinterest.com](https://developers.pinterest.com/apps/). One connection is one Pinterest account. The agent pins to the boards you name; it lists the account's boards when it needs them, so new boards are available without connecting again.

Wiro exchanges the sign-in code for a 30-day access token and a 60-day refresh token, and renews them while the agent runs. Every renewal returns a new refresh token, so the connection lasts as long as the agent keeps running. Tokens stay on Wiro's servers.

**Skills that use this integration:**

- `int-pinterest-post`: Create image Pins from a public URL, on a board or board section, with title, description, link and alt text; list boards, sections and Pins; read Pin and account analytics; create a board or delete a Pin after you approve it

**Agents that typically enable this integration:**

- Social Manager
- Any custom agent that publishes to Pinterest

## Availability

| Mode | Status | Notes |
|------|--------|-------|
| `"own"` | Available | Your own Pinterest app. Creating Pins needs **Standard access** (see below). |

There is no Wiro mode: `OAuthConnect` with `"authmethod": "wiro"` returns `Unsupported connection mode for Pinterest`. Leaving `authmethod` out means `"own"`.

## Trial and Standard access

Pinterest gives every new app **Trial access** first, and creating Pins needs **Standard access**:

| | Trial access | Standard access |
|---|---|---|
| Read boards, Pins and Pin analytics of your account | Yes | Yes |
| Create Pins and boards on your profile | **No**: Pinterest answers with error code 29 | Yes |
| Rate limits | 1,000 requests a day per app | Per minute, per user and app (for example 100 Pin creations a minute per user) |

Trial apps can create Pins and boards only in Pinterest's **Sandbox**, a separate test area with its own tokens, where only you can see what you create. This integration works with your live profile, not the Sandbox, so a Trial app can connect and read, but the agent cannot publish until the app has Standard access.

**Upgrading to Standard access:**

1. Go to [My apps](https://developers.pinterest.com/apps/) and click **Upgrade** on the app card. The button shows once the app has Trial access.
2. Check the app description, use case and privacy policy link.
3. Upload a short screen recording that shows the Pinterest sign-in and approval screens and a working call, for example connecting the account here and the agent listing your boards. Pinterest asks for this video even when you are the only user.
4. Submit. Pinterest answers by email; allow a few days.

If creating a Pin still fails after the upgrade, connect again.

## Prerequisites

- **A Wiro API key** (see [Authentication](/docs/authentication)).
- **A deployed agent** (see [Agent Overview](/docs/agent-overview)).
- **A Pinterest business account.** It is free; a personal account can be converted in its settings. Apps registered on or after September 14, 2026 cannot read the boards and Pins of personal accounts (`PINNER_DATA_ACCESS_DENIED`).
- **A public privacy policy page** on your own domain, for the app form.
- **An HTTPS callback URL** for your backend, where the browser returns after the sign-in.

## Complete Integration Walkthrough

### Step 1: Register the app

1. Sign in to Pinterest with the business account and open [developers.pinterest.com → My apps](https://developers.pinterest.com/apps/). Accept the developer terms.
2. Click **Connect app** and fill in the form: an app name (at least 3 letters or digits, without the word "Pinterest"), what the app does, your website and the privacy policy link.
3. Submit it. Pinterest reviews the request for Trial access and emails you. A vague description or a privacy policy that does not load are the usual reasons for a refusal.

### Step 2: Configure the redirect URI

Once the app is approved, click **Manage** on it in **My apps**. On the **Configure** tab, under **Redirect URIs**, enter this exactly and click **Add**:

```
https://api.wiro.ai/v1/UserAgentOAuth/PinterestCallback
```

### Step 3: Copy the App ID and App secret key

The **App ID** is shown under the app name on **My apps** (digits). On the **Configure** tab, under **API keys**, click the view icon next to **App secret key** and copy it.

### Step 4: Note the scopes

Wiro requests these scopes:

```
boards:read,boards:write,pins:read,pins:write,user_accounts:read
```

| Scope | Why |
|-------|-----|
| `boards:read` | List your public boards and their sections. |
| `boards:write` | Create a board or a section (after your approval). |
| `pins:read` | List Pins and read Pin analytics. |
| `pins:write` | Create Pins and delete a Pin (after your approval). |
| `user_accounts:read` | The connected username and account analytics. |

No ads, catalog, billing or secret-board scopes are requested. Pinterest asks the user to approve these on its consent screen; nothing has to be switched on in the app.

### Step 5: Save the app credentials to Wiro

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/CredentialUpsert" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "fields": [
      { "credentialkey": "pinterest", "fieldname": "authmethod", "fieldvalue": "own" },
      { "credentialkey": "pinterest", "fieldname": "clientid", "fieldvalue": "1512345" },
      { "credentialkey": "pinterest", "fieldname": "clientsecret", "fieldvalue": "YOUR_APP_SECRET_KEY" }
    ]
  }'
```

`clientid` is the App ID and takes digits only.

### Step 6: Initiate OAuth

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/OAuthConnect" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "credentialkey": "pinterest",
    "redirecturl": "https://your-app.com/settings/integrations",
    "authmethod": "own"
  }'
```

Response:

```json
{
  "result": true,
  "authorizeUrl": "https://www.pinterest.com/oauth/?client_id=...&redirect_uri=...&scope=boards%3Aread%2Cboards%3Awrite%2Cpins%3Aread%2Cpins%3Awrite%2Cuser_accounts%3Aread&response_type=code&state=...",
  "flowid": "4b1f0c7a9e2d4c1b8a7f6e5d4c3b2a19",
  "errors": []
}
```

Redirect the user to `authorizeUrl` and have them sign in with the business account.

### Step 7: Handle the callback

After consent, Pinterest redirects to Wiro's callback. Wiro exchanges the code (your App ID and App secret key go to Pinterest in an HTTP Basic header), reads the account's username, and returns the user to your `redirecturl`.

**Success URL:**

```
https://your-app.com/settings/integrations?pinterest_connected=true&pinterest_username=acmestudio
```

```javascript
const params = new URLSearchParams(window.location.search);

if (params.get("pinterest_connected") === "true") {
  showSuccess(`Connected as @${params.get("pinterest_username")}`);
} else if (params.get("pinterest_error")) {
  handleError(params.get("pinterest_error"));
}
```

### Step 8: Verify

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/OAuthStatus" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "credentialkey": "pinterest"
  }'
```

Response:

```json
{
  "result": true,
  "connected": true,
  "accounts": [
    { "id": "acmestudio", "name": "acmestudio" }
  ],
  "connectedat": "2026-11-21T12:00:00.000Z",
  "tokenexpiresat": "2026-12-21T12:00:00.000Z",
  "errors": []
}
```

`accounts[0]` carries the connected Pinterest username.

### Step 9: Start the agent

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
| `credentialkey` | string | Yes | `"pinterest"`. |
| `redirecturl` | string | Yes | Any HTTPS URL you control; the browser returns there after consent. `http://localhost` and `http://127.0.0.1` also work for development. |
| `authmethod` | string | No | `"own"`, the only mode. `"wiro"` returns `Unsupported connection mode for Pinterest`. |

### GET /UserAgentOAuth/PinterestCallback

Server-side endpoint Pinterest calls with `code` and `state`. You don't call it. You only handle the final redirect back to your `redirecturl`, which carries `pinterest_connected=true&pinterest_username=<username>` or `pinterest_error=<code>`.

### POST /UserAgentOAuth/OAuthStatus

Body: `{ useragentguid, credentialkey: "pinterest" }`. Response: `connected`, `accounts: [{id, name}]` (the connected username), `connectedat`, `tokenexpiresat`.

### POST /UserAgentOAuth/OAuthDisconnect

Body: `{ useragentguid, credentialkey: "pinterest" }`. Clears the tokens and the connected username in Wiro. `clientid` and `clientsecret` stay saved, so you can connect again without saving them again. Pinterest's API cannot revoke a user's token for an app: to end the app's access on Pinterest too, open **Settings → Security** on Pinterest and remove the app from your connected apps.

### Token lifecycle

The access token lasts 30 days and the refresh token 60 days. Wiro renews the access token while the agent runs once it has 7 days or less left, and when the agent starts; each renewal also returns a new 60-day refresh token. If the agent stays stopped for more than 60 days, the refresh token expires: connect again. `OAuthStatus` reports `connected: false` once the stored access token has expired; starting the agent renews it while the refresh token is still valid.

## Using the Skill

Once Pinterest is connected, the agent pins with `int-pinterest-post`, gated by your approval policy:

- **Image Pins** from a public PNG or JPEG URL (up to 20 MB; 2:3, such as 1000 x 1500 px, is recommended), with a title (up to 100 characters), a description (up to 800), a destination link and alt text (up to 500).
- **Boards and sections:** the agent pins to the board you name, or the one your brand rules name, and asks when it is unclear. It lists boards, sections and Pins on request, and creates a public board or a section only after you approve its name.
- **Analytics (read-only):** impressions, saves, Pin clicks, outbound clicks and save rate per Pin (plus video views and watch time for video Pins), and the same for the whole account, over up to the last 90 days.
- **Delete:** a Pin of the account, only after you approve that exact Pin.

Pinterest has no scheduled publishing in its API: a Pin for later is created by a scheduled task at that time.

## Troubleshooting

| Error code | Meaning | What to do |
|------------|---------|------------|
| `missing_params` | The callback was opened without an OAuth `state`. The browser ends on the API's own neutral page, not on your `redirecturl`. | Don't open the callback URL directly. Start again from Step 6. |
| `session_expired` | More than 15 minutes between `OAuthConnect` and the callback. | Call `OAuthConnect` again. |
| `flow_replaced` | A newer sign-in for the same agent and credential replaced this one, so nothing from it was saved. | Use the newer sign-in, or start again with `OAuthConnect`. |
| `authorization_denied` | The user cancelled on Pinterest. | Start again and approve. |
| `token_exchange_failed` | Pinterest refused the code or the app keys (a wrong App secret key, a redirect URI that does not match exactly, an app whose access is pending), or the account could not be read. | Check the App ID, App secret key and redirect URI (Steps 2 and 3) and the app's status in My apps, then connect again. |
| `useragent_not_found` | The agent was deleted, or is no longer owned by the account that started the flow. | Start again with `OAuthConnect` for an existing agent. |
| `Pinterest credentials not configured` | Returned in `OAuthConnect`'s `errors[]` when `clientid` or `clientsecret` is missing. | Save them (Step 5). |
| `internal_error` | Server error. | Retry; contact support if it persists. |

### Creating a Pin fails with code 29

The app still has Trial access, which cannot create Pins on your profile. Upgrade it to Standard access (see [Trial and Standard access](/docs/integration-pinterest-skills#trial-and-standard-access)).

### Reading boards fails with `PINNER_DATA_ACCESS_DENIED`

The connected account is a personal account and the app was registered on or after September 14, 2026. Convert the account to a free business account in Pinterest's settings and connect again.

### Every call fails with code 3

"Your application consumer type is not supported": the app's access is still pending or was paused. Check the app's status in [My apps](https://developers.pinterest.com/apps/).

### The agent hits the rate limit

A Trial app has 1,000 requests a day for all calls; Standard access has higher, per-minute limits. The agent stops and reports when Pinterest answers 429.

## Multi-Tenant Architecture

1. **One Pinterest app per product**, upgraded once to Standard access.
2. **One Wiro agent instance per customer**, each connecting its own Pinterest business account.
3. **Rate limits are per app and user**: Trial limits are shared by every account on a Trial app.
4. **Tokens are isolated per agent instance.**

## Related

- [Agent Credentials & OAuth](/docs/agent-credentials)
- [Agent Overview](/docs/agent-overview)
- [Agent Skills](/docs/agent-skills)
- [Pinterest API v5 documentation](https://developers.pinterest.com/docs/api/v5/)
