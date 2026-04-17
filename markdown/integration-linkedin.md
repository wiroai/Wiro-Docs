# LinkedIn Integration

Connect your agents to a LinkedIn Company Page so they can publish posts, articles, and engage with followers.

## Overview

The LinkedIn integration lets an agent publish content to a LinkedIn organization (Company Page) via the LinkedIn Marketing Developer Platform.

**Skills that use this integration:**

- `linkedin-post` — Publish text, image, and video posts to a Company Page

**Agents that typically enable this integration:**

- Social Manager
- Any custom agent that needs LinkedIn Company Page publishing

## Availability

| Mode | Status | Notes |
|------|--------|-------|
| `"wiro"` | Coming soon | LinkedIn partner app review is in progress. |
| `"own"` | Available now | Create your own LinkedIn Developer App and connect it to Wiro. |

## Prerequisites

- **A Wiro API key** — see [Authentication](/docs/authentication).
- **A deployed agent** — see [Agent Overview](/docs/agent-overview), keep the returned `useragentguid`.
- **A LinkedIn Company Page** that the connecting user is an **admin** of — personal profiles cannot be managed through this integration.
- **The LinkedIn organization ID** (numeric) — find it by visiting your Company Page on LinkedIn; the URL contains the organization identifier (e.g. `linkedin.com/company/12345678/admin/`).
- **An HTTPS callback URL** for your backend.

## Complete Integration Walkthrough

### Step 1: Create a LinkedIn Developer App

1. Go to [linkedin.com/developers/apps](https://www.linkedin.com/developers/apps) and click **Create app**.
2. Fill in:
   - **App name** (shown on consent screen — use a clean, trusted name).
   - **LinkedIn Page** — associate the app with a LinkedIn Company Page you own.
   - **Privacy policy URL**.
   - **App logo** (128×128 PNG).
3. Agree to the Legal terms and click **Create app**.

### Step 2: Request the necessary products

Inside your app, go to the **Products** tab. Request:

- **Share on LinkedIn** — posting to members' personal feeds (optional, only if your agent also posts as the user).
- **Sign In with LinkedIn using OpenID Connect** — basic identity scope.
- **Community Management API** — **required** for Company Page posting.

The **Community Management API** request goes through a manual approval step. While the request is pending, your app can still be used in development; once approved, production volume is unlocked. Development-scope access for a small number of test admins is available from day one.

### Step 3: Configure the OAuth redirect URI

1. Open the **Auth** tab in your app.
2. Under **OAuth 2.0 settings → Authorized redirect URLs for your app**, add:

   ```
   https://api.wiro.ai/v1/UserAgentOAuth/LICallback
   ```

3. Save. The URL must match exactly — HTTPS, no trailing slash.

### Step 4: Note the required scopes

Wiro requests the following OAuth 2.0 scopes:

| Scope | Why it is needed |
|-------|------------------|
| `openid` | OpenID Connect basic identity. |
| `profile` | Display name, headline, and profile picture on the consent screen. |
| `email` | Connected user's email address (used to confirm identity). |
| `w_member_social` | Post to the member's own feed (some agent flows use this). |
| `w_organization_social` | Post, comment, and reply on behalf of the Company Page. |
| `r_organization_social` | Read Company Page posts, comments, and analytics. |
| `rw_organization_admin` | Manage Company Page details (required for some posting endpoints). |

Mark the scopes your agent uses in **Auth → OAuth 2.0 scopes**. Any scope not enabled in this list will fail at the consent screen.

### Step 5: Copy your Client ID and Client Secret

1. Go to the **Auth** tab.
2. Under **Application credentials**, copy the **Client ID**.
3. Copy the **Primary Client Secret** — it is shown in plain text on this page. Store it like a password.

### Step 6: Save your credentials and organization ID to Wiro

LinkedIn requires the organization ID alongside the OAuth credentials. Pass all three in one `UserAgent/Update` call:

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Update" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "guid": "your-useragent-guid",
    "configuration": {
      "credentials": {
        "linkedin": {
          "clientId": "YOUR_LINKEDIN_CLIENT_ID",
          "clientSecret": "YOUR_LINKEDIN_CLIENT_SECRET",
          "organizationId": "12345678"
        }
      }
    }
  }'
```

### Step 7: Initiate OAuth

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/LIConnect" \
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
  "authorizeUrl": "https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=...&redirect_uri=...&scope=openid%20profile%20email%20w_member_social%20w_organization_social%20r_organization_social%20rw_organization_admin&state=...",
  "errors": []
}
```

Redirect the end user's browser to `authorizeUrl`. State has a 15-minute TTL.

### Step 8: Handle the callback

After consent, LinkedIn redirects to Wiro's callback, Wiro exchanges the code for access and refresh tokens, stores them, and sends the user back to your `redirectUrl`:

```
https://your-app.com/settings/integrations?li_connected=true&li_name=Jane%20Doe
```

Parse:

```javascript
const params = new URLSearchParams(window.location.search);

if (params.get("li_connected") === "true") {
  const name = params.get("li_name");
  showSuccess(`Connected as ${name}`);
} else if (params.get("li_error")) {
  handleError(params.get("li_error"));
}
```

`li_name` is the connected LinkedIn member's display name (the human admin), not the organization name. Use the `organizationId` you set in Step 6 for posting destination — that's the Company Page.

### Step 9: Verify the connection

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/LIStatus" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "userAgentGuid": "your-useragent-guid" }'
```

```json
{
  "result": true,
  "connected": true,
  "linkedinName": "Jane Doe",
  "connectedAt": "2026-04-17T12:00:00.000Z",
  "tokenExpiresAt": "2026-06-16T12:00:00.000Z",
  "refreshTokenExpiresAt": "2027-04-17T12:00:00.000Z",
  "errors": []
}
```

Note that LinkedIn uses `linkedinName` rather than `username`. Access tokens last ~60 days; refresh tokens last ~1 year.

### Step 10: Start the agent if it is not running

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Start" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "guid": "your-useragent-guid" }'
```

## API Reference

### **POST** /UserAgentOAuth/LIConnect

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userAgentGuid` | string | Yes | Agent instance GUID. |
| `redirectUrl` | string | Yes | HTTPS URL for post-OAuth return. |
| `authMethod` | string | No | `"wiro"` (coming soon) or `"own"`. |

### **GET** /UserAgentOAuth/LICallback

Query parameters appended to your `redirectUrl`:

| Param | Meaning |
|-------|---------|
| `li_connected=true` | Success. |
| `li_name` | Connected member's display name. |
| `li_error=<code>` | Failure. |

### **POST** /UserAgentOAuth/LIStatus

Response includes `connected`, `linkedinName`, `connectedAt`, `tokenExpiresAt`, `refreshTokenExpiresAt`.

### **POST** /UserAgentOAuth/LIDisconnect

Revoke the LinkedIn token and clear credentials.

### **POST** /UserAgentOAuth/TokenRefresh

Force-refresh using the refresh token.

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/TokenRefresh" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "userAgentGuid": "your-useragent-guid",
    "provider": "linkedin"
  }'
```

## Using the Skill

Enable `linkedin-post` on the agent — see [Agent Skills](/docs/agent-skills).

```json
{
  "guid": "your-useragent-guid",
  "configuration": {
    "custom_skills": [
      {
        "key": "weekly-announcement",
        "enabled": true,
        "interval": "0 10 * * 1",
        "value": "Publish a weekly company update highlighting last week's wins"
      }
    ]
  }
}
```

## Troubleshooting

| Error code | Meaning | What to do |
|------------|---------|------------|
| `missing_params` | Callback reached without `state` or `code`. | Restart the flow from Step 7. |
| `session_expired` | >15 minutes between `LIConnect` and callback. | Call `LIConnect` again. |
| `authorization_denied` | User cancelled, or missing required scopes in LinkedIn app settings. | Verify all scopes are enabled in Auth → OAuth 2.0 scopes, retry. |
| `token_exchange_failed` | Wrong Client Secret or redirect URI mismatch. | Re-copy secret; verify the redirect URI in Auth settings matches exactly. |
| `useragent_not_found` | Invalid or unauthorized `userAgentGuid`. | Use `POST /UserAgent/MyAgents`. |
| `invalid_config` | No `credentials.linkedin` block on the agent. | Update with `clientId`, `clientSecret`, `organizationId`. |
| `internal_error` | Unexpected server error. | Retry; contact support if persistent. |

### Posts are rejected with 401 Unauthorized

Most common cause: the `Community Management API` product has not been approved yet. Until approval, posting to Company Pages only works for **admins listed on the app's associated LinkedIn Page**. Check **My Pages** inside LinkedIn Developers to confirm admin membership.

### "Scope `w_organization_social` not authorized"

LinkedIn does not automatically grant this scope on consent — you must request it explicitly under **Auth → OAuth 2.0 scopes**. Enable it, then have the user reconnect.

### Wrong organization ID

The numeric organization ID lives in your Company Page's admin URL (`linkedin.com/company/<ID>/admin/`). Not the vanity slug. If you saved the slug, update via `UserAgent/Update` and reconnect.

## Multi-Tenant Architecture

1. **One LinkedIn Developer App** per product; same app works for all customers.
2. **One Wiro agent instance per customer** — capture their `organizationId` during onboarding.
3. **Community Management API approval** is tied to your app, not per customer. You only apply once.
4. **Tokens are isolated per agent instance.**
5. **Rate limits** are per app and per organization — see [LinkedIn Developer docs](https://learn.microsoft.com/en-us/linkedin/shared/api-guide/concepts/rate-limits) for the exact caps. High-volume partners should contact LinkedIn partnership team for elevated limits.

## Related

- [Agent Credentials & OAuth](/docs/agent-credentials)
- [Agent Overview](/docs/agent-overview)
- [Agent Skills](/docs/agent-skills)
- [LinkedIn Marketing Developer Platform](https://learn.microsoft.com/en-us/linkedin/marketing/)
