# Google Business Profile Integration

Connect your agent to Google Business Profile to read the Google reviews of the locations you choose, draft a reply to each new review, and post the replies you approve.

## Overview

The Google Business Profile integration powers the `int-google-business-reviews` skill (Google Business Reviews). The agent works through Google's Business Profile APIs with an OAuth client from your own Google Cloud project. It reads the reviews of the Business Profile locations you selected, drafts one reply per new review in the reviewer's language, sends the drafts to you, and posts a reply only after you approve it.

**Skills that use this integration:**

- `int-google-business-reviews`: Reads the Google reviews of the selected locations, drafts replies, posts approved replies, and follows Google's moderation of each posted reply.

**Bundled task:**

- `cs-cron-google-review-scanner` runs every 2 hours (`0 */2 * * *`), scans the selected locations for new reviews and sends you the drafted replies. It runs only when Google Business Profile is connected.

## Availability

| Mode | Status | Notes |
|------|--------|-------|
| `"own"` | Available (the only mode) | An OAuth client from your own Google Cloud project. Google must approve that project for Business Profile API access before any call works. |
| `"wiro"` | Not available | Wiro-managed one-click connect is not available for Google Business Profile. |

> **Google approves the project first.** You request Business Profile API access for your Google Cloud project, and Google reviews requests within 14 days. Until the project is approved, every call to Google fails, and connecting typically ends with "No accounts available". See [Google Cloud setup](#google-cloud-setup).

## Prerequisites

- **A verified Business Profile.** Google asks for a profile that has been verified and active for 60+ days, with the business website listed, before it grants API access.
- **A Google account that is an owner or manager of the Business Profile.** Request API access with its email, and connect with the Google account that manages the business.
- **A Google Cloud project approved for Business Profile API access**, with an OAuth client of type Web application (see [Google Cloud setup](#google-cloud-setup)).
- **An agent with `int-google-business-reviews` enabled**: see [Using the Skill](#using-the-skill).
- **For API integrations only:** a Wiro API key ([Authentication](/docs/authentication)), a deployed agent ([Agent Overview](/docs/agent-overview)) and its `useragentguid`, and an HTTPS return URL that your backend controls. `http://localhost` and `http://127.0.0.1` are accepted for local development only.

## Google Cloud setup

Do these steps once, in this order, in the Google Cloud project whose OAuth client the agent will use.

### Step 1: Create or pick a project

In the Google Cloud Console, create a project or pick an existing one. Copy its **Project number** from the project dashboard; you need it for the access request in Step 2.

### Step 2: Request Business Profile API access

1. Open Google's [Business Profile API contact form](https://support.google.com/business/contact/api_default) and choose **Application for Basic API Access**.
2. Apply for the project from Step 1, with an email that is an owner or manager of the Business Profile.
3. Google asks for a profile that has been verified and active for 60+ days, with the business website listed, and reviews requests within 14 days. See Google's [prerequisites](https://developers.google.com/my-business/content/prereqs) and [FAQ](https://developers.google.com/my-business/content/faq).

### Step 3: Check the approval

Open [IAM & Admin → Quotas](https://console.cloud.google.com/iam-admin/quotas) for the project and look at the requests-per-minute quota of the Business Profile APIs:

- **0 requests per minute**: not approved yet. Every call to Google fails until this changes.
- **300 requests per minute**: approved. Continue with Step 4.

### Step 4: Enable the APIs

After approval, enable these three APIs in the project:

- [Google My Business API](https://console.cloud.google.com/apis/library/mybusiness.googleapis.com): listed in the API Library only after the project is approved.
- [My Business Account Management API](https://console.cloud.google.com/apis/library/mybusinessaccountmanagement.googleapis.com)
- [My Business Business Information API](https://console.cloud.google.com/apis/library/mybusinessbusinessinformation.googleapis.com)

### Step 5: Set the audience

In [Google Auth Platform → Audience](https://console.cloud.google.com/auth/audience):

- Choose **External**.
- Set the publishing status to **In production**. While the app is in **Testing**, Google expires the refresh token after 7 days ([Google's OAuth 2.0 documentation](https://developers.google.com/identity/protocols/oauth2)), and the agent loses access every week.

When you connect, Google may warn that the app is unverified. It is your own app: continue as the app's owner.

### Step 6: Add the scope

In [Data Access](https://console.cloud.google.com/auth/scopes), add this scope:

```
https://www.googleapis.com/auth/business.manage
```

### Step 7: Create the OAuth client

In [Clients](https://console.cloud.google.com/auth/clients), create an OAuth client of type **Web application** and add this **Authorized redirect URI**, exactly as written:

```
https://api.wiro.ai/v1/UserAgentOAuth/GBPCallback
```

Copy the **Client ID** and the **Client Secret**.

## Connect in the Wiro dashboard

1. Open your agent, go to **Credentials**, and find the **Google Business Profile** card.
2. Paste the **OAuth Client ID** and **OAuth Client Secret** from Step 7.
3. Click **Connect Google Business Profile** and sign in with the Google account that manages the business. If Google warns that the app is unverified, continue as the app's owner.
4. Choose the Business Profile accounts the agent may use.
5. Choose the locations. Up to 100 locations per account are listed.
6. Wiro saves the selection and restarts the agent if it was running.

To change the locations later, use **Manage** on the Google Business Profile card. The agent reads and answers reviews only for the locations you selected.

## What the agent does

- **Reads new reviews** of the selected locations.
- **Drafts one reply per new review, in the reviewer's language.** When Google shows a translated review, the agent answers the original text.
- **Follows your review preferences.** Before drafting, it reads the `cs-review-preferences` custom skill: tone, length by rating, contact line, sign-off, and house rules.
- **Sends the drafts to you**, numbered, in chat and on Telegram if it is connected. Answer in chat:
  - `ok 1`: approve draft 1
  - `ok all`: approve every draft
  - `skip 2`: skip draft 2
  - `edit 1: <text>` (replace draft 1 with your text)
- **Posts approved replies** through the Google Business Profile API.
- **Follows Google's moderation.** Google reviews every reply before it is public: a reply is `PENDING`, then `APPROVED`, or `REJECTED` with a policy violation. The agent tells you about rejected replies.
- **Edits or deletes a posted reply** only when you ask.
- **Starts with recent reviews.** The first scan of a location drafts replies only for unanswered reviews from the last 30 days, and reports how many older reviews have no reply.
- **Escalates instead of answering.** Legal, health, safety and discrimination complaints go to you instead of getting a reply.
- **Never offers incentives** for reviews, and never shares reviewer details beyond their public first name.
- **Keeps review content for at most 30 days**, as Google's API policy requires.

## What the agent cannot do

These are outside this integration:

- **Changing business details**: name, hours, address, or photos.
- **Creating posts.**
- **Answering Q&A.**
- **Reporting or removing a review.** The business does that in Google Maps.
- **Replying for locations you did not select.**

## Approvals

- **Every reply waits for your approval by default**, one approval per reply. The rule lives in the `cs-approval-policy` custom skill.
- **Why:** Google's Business Profile API [policies](https://developers.google.com/my-business/content/policies) say automated replies need the business's prior, specific and express consent. This is why replies wait for your approval by default.
- **Auto-approve rules.** You can add an override to `cs-approval-policy`, for example "auto-approve replies to 5-star reviews". Matching replies are then posted without asking, at most 5 per scan unless `cs-review-preferences` sets another number.

## Limits

| Limit | Value |
|-------|-------|
| Reply length | At most 4096 bytes. Letters such as ç, ğ, ş and é count as 2 bytes. |
| Google API quota | 300 requests per minute for the Google Cloud project after approval (0 before). |
| Locations listed per account | Up to 100. |
| Automatic replies | At most 5 per scan, unless `cs-review-preferences` sets another number. |
| Review content kept | At most 30 days. |

## Scheduled task

| Task | Skill key | Default schedule | What it does |
|------|-----------|------------------|--------------|
| Review scanner | `cs-cron-google-review-scanner` | `0 */2 * * *` (every 2 hours) | Reads new reviews of the selected locations, drafts replies, and sends them to you for approval; posts the replies an auto-approve rule allows. Runs only when Google Business Profile is connected. |

To change **what** the scanner does, edit the custom skills it reads rather than the task:

- `cs-review-preferences`: tone, length by rating, contact line, sign-off, house rules, and the number of automatic replies per scan.
- `cs-approval-policy`: which replies wait for your approval.

## Connect through the API

Use this flow when you build your own settings screen on top of Wiro agents. Complete the [Google Cloud setup](#google-cloud-setup) first. Every request is authenticated as described in [Authentication](/docs/authentication).

### Step 1: Save your OAuth client

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/CredentialUpsert" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "fields": [
      { "credentialkey": "google-business", "fieldname": "clientid", "fieldvalue": "YOUR_GOOGLE_OAUTH_CLIENT_ID" },
      { "credentialkey": "google-business", "fieldname": "clientsecret", "fieldvalue": "YOUR_GOOGLE_OAUTH_CLIENT_SECRET" },
      { "credentialkey": "google-business", "fieldname": "authmethod", "fieldvalue": "own" }
    ]
  }'
```

Response: `{ "result": true, "errors": [], "applied": 3 }`. `clientid` and `clientsecret` are not returned by `POST /UserAgent/Detail`, so check `result` and `errors[]` here.

### Step 2: Start the connection

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/OAuthConnect" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "credentialkey": "google-business",
    "redirecturl": "https://your-app.com/settings/integrations",
    "authmethod": "own"
  }'
```

Response:

```json
{
  "result": true,
  "errors": [],
  "authorizeUrl": "https://accounts.google.com/o/oauth2/v2/auth?client_id=...&redirect_uri=https%3A%2F%2Fapi.wiro.ai%2Fv1%2FUserAgentOAuth%2FGBPCallback&response_type=code&scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fbusiness.manage&state=...&access_type=offline&prompt=consent"
}
```

Redirect the user's browser to `authorizeUrl` with a full-page redirect rather than a popup. Wiro requests the `business.manage` scope with offline access, so Google issues a refresh token.

Always send `authmethod: "own"`. Without it, or with `"wiro"`, `OAuthConnect` returns `Wiro-managed OAuth is not enabled for Google Business Profile`.

> **State TTL:** Wiro keeps the OAuth state for **15 minutes**. If the user takes longer on Google's consent screen, the connection fails with `gbp_error=session_expired`; call `OAuthConnect` again.

### Step 3: Handle the return

After the user approves, Google sends them to Wiro's callback (`https://api.wiro.ai/v1/UserAgentOAuth/GBPCallback`). Wiro exchanges the code, lists the Business Profile accounts the Google user can access, stores the tokens server-side, and redirects the browser to your `redirecturl`.

**Success URL** looks like:

```
https://your-app.com/settings/integrations?gbp_connected=true&gbp_accounts=%5B%7B%22id%22%3A%22112233445566778899001%22%2C%22name%22%3A%22Acme%20Bakery%22%7D%5D
```

- `gbp_accounts` is `encodeURIComponent(JSON.stringify([...]))`.
- Each element is `{ id, name }`: `id` is the numeric Business Profile account ID as a string, `name` is the account name.
- The list is never empty on success. When no Business Profile account can be listed, the callback returns `gbp_error=no_accounts` instead; right after setup this usually means Google has not approved the project yet or an API is disabled (see [Troubleshooting](#troubleshooting)).
- On failure the URL carries `gbp_error=<code>`, and possibly `gbp_error_detail`.

Parse in the browser:

```javascript
const params = new URLSearchParams(window.location.search);

if (params.get("gbp_connected") === "true") {
  const accounts = JSON.parse(params.get("gbp_accounts") || "[]");
  presentAccountPicker(accounts);
} else if (params.get("gbp_error")) {
  handleError(params.get("gbp_error"));
}
```

### Step 4: Save the account selection

This call is **required**, even when only one account is returned:

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/SetPickerAccounts" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "credentialkey": "google-business",
    "accounts": [
      { "accountid": "112233445566778899001", "accountname": "Acme Bakery" }
    ]
  }'
```

Response:

```json
{
  "result": true,
  "errors": [],
  "accounts": [
    { "id": "112233445566778899001", "name": "Acme Bakery" }
  ]
}
```

Behavior:

- Send one or more `{ accountid, accountname }` entries picked from `gbp_accounts` (`id` becomes `accountid`, `name` becomes `accountname`). Non-digits in `accountid` are stripped server-side.
- Each call replaces the previous account selection. Locations already chosen for accounts that stay selected are kept; locations of removed accounts are dropped.
- If the agent was running, Wiro restarts it.

### Step 5: Choose the locations

Discover the locations of the selected accounts:

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/DiscoverPickerItems" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "credentialkey": "google-business",
    "pickerkey": "locations"
  }'
```

Response:

```json
{
  "result": true,
  "errors": [],
  "pickerkey": "locations",
  "groups": [
    {
      "parent": {
        "accountid": "112233445566778899001",
        "accountname": "Acme Bakery"
      },
      "items": [
        { "locationid": "9876543210987654321", "locationtitle": "Acme Bakery Downtown" },
        { "locationid": "1234567890123456789", "locationtitle": "Acme Bakery Riverside" }
      ]
    }
  ]
}
```

Up to 100 locations per account are listed. A group carries `errorcode` and an empty `items` array when Google did not return the locations of that account.

Save the selection within five minutes. Copy `locationid` and `locationtitle` from the discovery response unchanged, and include every group returned without an `errorcode` exactly once; an empty `items` array selects no location for that account:

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/SetPickerAccounts" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "credentialkey": "google-business",
    "pickerkey": "locations",
    "selections": [
      {
        "parentvalue": "112233445566778899001",
        "items": [
          { "locationid": "9876543210987654321", "locationtitle": "Acme Bakery Downtown" }
        ]
      }
    ]
  }'
```

Response:

```json
{
  "result": true,
  "errors": [],
  "pickerkey": "locations",
  "locationmappings": [
    {
      "accountid": "112233445566778899001",
      "accountname": "Acme Bakery",
      "locationid": "9876543210987654321",
      "locationtitle": "Acme Bakery Downtown"
    }
  ]
}
```

The dashboard runs this step automatically after the account selection. If the agent was running, Wiro restarts it.

### Step 6: Verify the connection

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/OAuthStatus" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "credentialkey": "google-business"
  }'
```

Response:

```json
{
  "result": true,
  "errors": [],
  "connected": true,
  "accounts": [
    { "id": "112233445566778899001", "name": "Acme Bakery" }
  ],
  "connectedat": "2026-10-17T09:00:00.000Z",
  "tokenexpiresat": "2026-10-17T10:00:00.000Z",
  "pickersteps": {
    "locations": {
      "pickerkey": "locations",
      "optional": false,
      "configured": true,
      "groups": [
        {
          "parent": {
            "accountid": "112233445566778899001",
            "accountname": "Acme Bakery"
          },
          "items": [
            { "locationid": "9876543210987654321", "locationtitle": "Acme Bakery Downtown" }
          ]
        }
      ]
    }
  },
  "locationmappings": [
    {
      "accountid": "112233445566778899001",
      "accountname": "Acme Bakery",
      "locationid": "9876543210987654321",
      "locationtitle": "Acme Bakery Downtown"
    }
  ]
}
```

Field notes:

- `connected` is `true` when the connection has a current access token and at least one account is selected. It does not look at locations: `pickersteps.locations.configured` is `true` once at least one location is selected.
- `tokenexpiresat` is the expiry of the current access token (about one hour ahead). Wiro renews the access token while the agent is running.
- `connectedat` is the time of the last successful Connect.

### Step 7: Start the agent if it's not running

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Start" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "guid": "your-useragent-guid" }'
```

Check `POST /UserAgent/Detail` first: if `setuprequired` is still `true`, a credential the agent requires is incomplete, and Start will refuse. See [Agent Credentials: Setup Required](/docs/agent-credentials#setup-required-state).

## Credential fields

| Field | Type | Description |
|-------|------|-------------|
| `clientid` | string | OAuth Client ID of your Google Cloud OAuth client (own mode). Not returned by `POST /UserAgent/Detail`. |
| `clientsecret` | string (secret) | OAuth Client Secret (own mode). Encrypted at rest; not returned by `POST /UserAgent/Detail`. |
| `accountid` | array of strings | Numeric IDs of the selected Business Profile accounts. Required. Filled by the connection flow (`SetPickerAccounts`). |
| `accountname` | array of strings | Names of the selected accounts, in the same order. Filled by the connection flow. |
| `locationmappings` | array of objects | The selected locations, one `{ accountid, accountname, locationid, locationtitle }` entry per location. Server-managed; written by the location step. |

`POST /UserAgent/CredentialUpsert` rejects writes to `accountid`, `accountname` and `locationmappings` with `<Field label> is managed by the connection flow`. Access and refresh tokens are stored server-side and are never returned by any endpoint.

## API Reference

All endpoints require Wiro authentication: see [Authentication](/docs/authentication) for `x-api-key` + optional signature headers.

### POST /UserAgentOAuth/OAuthConnect

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Agent instance GUID. |
| `credentialkey` | string | Yes | `"google-business"`. |
| `redirecturl` | string | Yes | HTTPS URL (or `http://localhost` / `http://127.0.0.1` for development) where the browser returns after Google. |
| `authmethod` | string | Yes | `"own"`, the only available mode. |

Response: `{ result, errors, authorizeUrl }`. If `result: false`, inspect `errors[0].message`. Common messages: `Invalid redirect URL`, `User agent not found or unauthorized`, `Wiro-managed OAuth is not enabled for Google Business Profile` (no `authmethod`, or `"wiro"`), and `Google Business Profile credentials not configured` (the Client ID or Client Secret is not saved).

### GET /UserAgentOAuth/GBPCallback

Server-side endpoint invoked by Google. You don't call it: you register it as the Authorized redirect URI of your OAuth client and handle the final redirect back to your `redirecturl`.

| Query param | Meaning |
|-------------|---------|
| `gbp_connected=true` | Authorization completed. |
| `gbp_accounts` | URL-encoded JSON array of `{ id, name }` for the Business Profile accounts the Google user can access. Always at least one entry. |
| `gbp_error=<code>` | The connection failed. See [Troubleshooting](#troubleshooting). |
| `gbp_error_detail` | Optional detail that can accompany `gbp_error`. |

### POST /UserAgentOAuth/SetPickerAccounts

The same endpoint saves both picker steps.

Account selection:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Agent instance GUID. |
| `credentialkey` | string | Yes | `"google-business"`. |
| `accounts` | array | Yes | One or more `{ accountid, accountname }` entries. `accountid` is the numeric account ID (non-digits stripped); `accountname` is the display name shown in dashboards and `OAuthStatus` responses. |

Response: `{ result, errors, accounts: [{id, name}, ...] }`. Replaces the previous account selection and restarts the agent if it was running.

Location selection, after `DiscoverPickerItems`:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Agent instance GUID. |
| `credentialkey` | string | Yes | `"google-business"`. |
| `pickerkey` | string | Yes | `"locations"`. |
| `selections` | array | Yes | One `{ parentvalue, items }` entry for every group discovery returned without an `errorcode`. `parentvalue` is the account ID; each item carries `locationid` and `locationtitle`. Empty `items` selects no location for that account. |

Response: `{ result, errors, pickerkey: "locations", locationmappings: [{accountid, accountname, locationid, locationtitle}] }`.

### POST /UserAgentOAuth/DiscoverPickerItems

Lists the locations of the selected Business Profile accounts, grouped by account. Call it after the account selection is saved.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Agent instance GUID. |
| `credentialkey` | string | Yes | `"google-business"`. |
| `pickerkey` | string | Yes | `"locations"`. |

Response: `{ result, errors, pickerkey: "locations", groups: [{parent: {accountid, accountname}, items: [{locationid, locationtitle}], errorcode?}] }`. Up to 100 locations per account. The access token stays server-side. Wiro keeps the discovered candidates for five minutes; save the location selection before they expire.

### POST /UserAgentOAuth/OAuthStatus

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Agent instance GUID. |
| `credentialkey` | string | Yes | `"google-business"`. |

Response fields:

| Field | Type | Description |
|-------|------|-------------|
| `connected` | boolean | `true` when the connection has a current access token and at least one selected account. Use `setuprequired` from `POST /UserAgent/Detail` for whole-agent readiness. |
| `accounts` | array | One `{ id, name }` per selected account (`id` = `accountid`, `name` = `accountname`). |
| `locationmappings` | array | The selected locations, one `{ accountid, accountname, locationid, locationtitle }` entry each. |
| `pickersteps.locations` | object | Location selection grouped by account for UI rendering: `{ pickerkey, optional, configured, groups[] }`. |
| `connectedat` | string | ISO timestamp of the last successful Connect. |
| `tokenexpiresat` | string | ISO expiry of the current access token (about one hour ahead while the agent runs). |

### POST /UserAgentOAuth/OAuthDisconnect

Body: `{ useragentguid, credentialkey: "google-business" }`. Clears the tokens and the account and location selections in Wiro. Your Client ID and Client Secret are kept, so you can connect again without re-entering them. Wiro does not ask Google to revoke the authorization.

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/OAuthDisconnect" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "credentialkey": "google-business"
  }'
```

Response: `{ "result": true, "errors": [] }`. Running agents restart automatically.

### Token lifecycle

Wiro renews the access token with the stored refresh token while the agent is running. While the consent screen is in **Testing**, Google expires the refresh token after 7 days; set it to **In production** to avoid weekly disconnects. If Google revokes the access, or `OAuthStatus` keeps reporting `connected: false`, call `OAuthDisconnect` and run Steps 2 to 5 again. There is no customer-facing token-refresh endpoint.

## Using the Skill

Google Review Manager has `int-google-business-reviews` on by default. On any other agent, enable it with `POST /UserAgent/SkillsApply` (see [Agent Skills → Toggling Integration Skills](/docs/agent-skills#toggling-integration-skills)):

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/SkillsApply" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "idempotencyKey": "550e8400-e29b-41d4-a716-446655440002",
    "skills": {
      "int-google-business-reviews": true
    }
  }'
```

**Pricing:** like the App Store and Google Play review skills, `int-google-business-reviews` adds $1 and 100 credits per month to the agent's skill weights (`monthly_price_weight_usd: 1`, `monthly_credits_weight: 100`). Preview the result with [`POST /UserAgent/PricingPreview`](/docs/agent-overview#post-useragentpricingpreview) before you apply it. As with every agent turn, scans and replies are billed on the LLM tokens they use.

Adjust the scanner's schedule with `enabled` and `interval` only. The task body (`value`) is owned by the bundled integration skill and silently dropped on writes:

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/CustomSkillUpsert" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "skillkey": "cs-cron-google-review-scanner",
    "enabled": true,
    "interval": "0 */4 * * *"
  }'
```

To change how replies read, edit `cs-review-preferences`; to change which replies wait for approval, edit `cs-approval-policy` (see [Agent Skills → Updating Preferences](/docs/agent-skills#updating-preference-skills)).

## Troubleshooting

| Error code | Meaning | What to do |
|------------|---------|------------|
| `no_accounts` | Sign-in worked, but no Business Profile account could be listed for this Google user. Right after setup this usually means the project is not approved yet (quota 0) or an API is disabled. | Check Steps 3 and 4 of the Google Cloud setup, then connect again. Otherwise connect with the Google account that owns or manages the business. |
| `authorization_denied` | The user cancelled on Google's consent screen, or Google returned an error instead of an authorization code. | Start again and approve the consent screen. |
| `session_expired` | More than 15 minutes passed between `OAuthConnect` and the return from Google, or the state was already used. | Call `OAuthConnect` again. |
| `missing_params` | The callback was opened without an OAuth `state`. | Don't open the callback URL directly. Start a new flow with `OAuthConnect`. |
| `token_exchange_failed` | Google did not return an access token for the authorization code, usually because of a wrong Client Secret or a redirect URI mismatch. | Re-copy the Client Secret, check the redirect URI, and connect again. |
| `useragent_not_found` | The agent was deleted, or is no longer owned by the account that started the flow, before Google returned. | Start again with `OAuthConnect` for an existing agent. |
| `internal_error` | Unexpected server error during callback processing. | Retry once. If it persists, contact Wiro support with the timestamp and your `useragentguid`. |
| `Wiro-managed OAuth is not enabled for Google Business Profile` | Returned in `OAuthConnect`'s `errors[]` when `authmethod` is missing or `"wiro"`. | Send `authmethod: "own"`. |
| `Google Business Profile credentials not configured` | Returned in `OAuthConnect`'s `errors[]` when the Client ID or Client Secret is not saved. | Save both with `POST /UserAgent/CredentialUpsert` (Step 1), then retry. |
| `Picker candidates expired. Discover them again.` | More than five minutes passed after location discovery, or the account selection changed. | Call `DiscoverPickerItems` again, then resubmit the location selection. |
| `selections must include every available parent exactly once` | The location selection left out or repeated an account group. | Send one `selections[]` entry per group returned without `errorcode`; use `items: []` to select no location for an account. |

Because no valid state is left to read your `redirecturl` from, `missing_params` and `session_expired` send the browser to `https://wiro.ai` with the error parameter instead of to your app.

### "No accounts available" right after connecting

The Google Cloud project is usually not approved yet (0 requests per minute in [IAM & Admin → Quotas](https://console.cloud.google.com/iam-admin/quotas)), or one of the three APIs from Step 4 is disabled. Connect again once Google has approved the project and the APIs are enabled.

### `redirect_uri_mismatch` on Google's page

The Authorized redirect URI on your OAuth client does not exactly match `https://api.wiro.ai/v1/UserAgentOAuth/GBPCallback`. Fix it in [Clients](https://console.cloud.google.com/auth/clients); Google can take from a few minutes to a few hours to apply the change ([Google Cloud help](https://support.google.com/cloud/answer/15549257)).

### The connection drops every week

The consent screen is still in **Testing**, where Google expires the refresh token after 7 days. Set the publishing status to **In production** in [Audience](https://console.cloud.google.com/auth/audience), then connect again.

### The agent reports a Google access problem

The agent tells you in chat when Google says the project is not approved, an API is disabled, the account cannot manage a location, or the connection expired. Fix the cause in Google Cloud or in the Business Profile. For an expired connection, click **Disconnect** on the Google Business Profile card, then connect again.

### Google rejected a reply

Google reviews every reply before it is public. When it marks a reply `REJECTED` for a policy violation, the agent tells you; ask it to edit or delete that reply.

### `connected: true`, but no reviews are answered

`connected` covers the account selection only. Check that at least one location is selected: use **Manage** on the Google Business Profile card, or run the location step (Step 5) through the API.

## Multi-Tenant Architecture

For SaaS products connecting many businesses through a single Wiro-powered backend:

1. **One Wiro agent instance per business.** Call `POST /UserAgent/Deploy` during onboarding, then run the connection flow for that business's `useragentguid`.
2. **Tokens are isolated per agent instance.** One business's Google authorization is never visible to another, because they live under different `useragentguid` values.
3. **The consent screen shows your app.** The connection uses your own OAuth client, so Google shows the app name of your Google Cloud project.
4. **The quota belongs to the Google Cloud project.** Every connection made with the same OAuth client shares its 300 requests per minute.

## Related

- [Agent Credentials & OAuth](/docs/agent-credentials): integration catalog hub and generic OAuth reference.
- [Agent Overview](/docs/agent-overview): deploying, starting, and lifecycle.
- [Agent Skills](/docs/agent-skills): configuring `int-google-business-reviews`, custom skills, and scheduled runs.
- [Telegram integration](/docs/integration-telegram-skills): receive the drafts on Telegram as well as in chat.
- [App Store Connect integration](/docs/integration-appstore-skills) and [Google Play integration](/docs/integration-googleplay-skills): reviews of your apps.
- [Business Profile APIs prerequisites](https://developers.google.com/my-business/content/prereqs)
