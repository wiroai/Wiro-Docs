# LinkedIn Integration

Connect your agent to a LinkedIn Company Page to publish posts and engage with followers.

## Overview

The LinkedIn integration uses the LinkedIn Marketing Developer Platform via OAuth 2.0. Agents publish posts on behalf of a Company Page using the connecting member's admin rights.

**Skills that use this integration:**

- `linkedin-post` — Publish text, image, and video posts to a Company Page

**Agents that typically enable this integration:**

- Social Manager
- Any custom agent that needs LinkedIn Company Page publishing

## Availability

| Mode | Status | Notes |
|------|--------|-------|
| `"wiro"` | Coming soon | LinkedIn partner app review pending. |
| `"own"` | Available now | Create your own LinkedIn Developer App. |

## Prerequisites

- **A Wiro API key** — [Authentication](/docs/authentication).
- **A deployed agent** — [Agent Overview](/docs/agent-overview).
- **A LinkedIn Company Page** the connecting user is an **admin** of — personal profiles are not supported.
- **The numeric LinkedIn organization ID** (not the vanity slug). Find it in `linkedin.com/company/<ID>/admin/`.
- **An HTTPS callback URL** for your backend.

## Complete Integration Walkthrough

### Step 1: Create a LinkedIn Developer App

1. [linkedin.com/developers/apps](https://www.linkedin.com/developers/apps) → **Create app**.
2. Fill in:
   - **App name** (shown on consent screen).
   - **LinkedIn Page** (associate with a Company Page you own — this gives admins automatic development access).
   - **Privacy policy URL**.
   - **App logo** (128×128 PNG).
3. Agree to Legal terms → **Create app**.

### Step 2: Request the required products

**Products** tab. Request:

- **Sign In with LinkedIn using OpenID Connect** — for `openid` and `profile` scopes.
- **Community Management API** — required for Company Page posting (`w_organization_social`, `r_organization_social`).

Community Management API approval is a manual review that can take days. While pending, your app can still post **to the Company Page it's associated with** for admins listed on that page — this is enough for development and testing.

### Step 3: Configure the OAuth redirect URI

1. **Auth** tab.
2. **OAuth 2.0 settings → Authorized redirect URLs for your app** → add:

   ```
   https://api.wiro.ai/v1/UserAgentOAuth/LICallback
   ```

3. Save.

### Step 4: Note the required OAuth 2.0 scopes

Wiro requests these exact scopes (sourced from the LinkedIn entry in the credential registry — `data/agent-skills-registry/credentials/linkedin.json` under `oauth_provider.oauth_flow.scopes`):

```
openid profile w_organization_social r_organization_social
```

| Scope | Why |
|-------|-----|
| `openid` | OpenID Connect basic identity. |
| `profile` | Member's display name and headline (shown on consent). |
| `w_organization_social` | Post, comment, and reply on behalf of the Company Page. |
| `r_organization_social` | Read Company Page posts and engagement. |

> Wiro does **not** request `email`, `w_member_social`, or `rw_organization_admin`. Keep your app's scope list limited to the four above for consistency with the Wiro flow.

Enable all four in **Auth → OAuth 2.0 scopes**. Scopes not enabled in this list will fail at the consent screen.

### Step 5: Copy your Client ID and Client Secret

**Auth → Application credentials** → copy **Client ID**. Copy the **Primary Client Secret** — it's shown in plain text here. Store it like a password.

### Step 6: Save credentials to Wiro

LinkedIn requires `clientid`, `clientsecret`, and `organizationid` all in the same credential block.

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/CredentialUpsert" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "fields": [
      { "credentialkey": "linkedin", "fieldname": "authmethod", "fieldvalue": "own" },
      { "credentialkey": "linkedin", "fieldname": "clientid", "fieldvalue": "YOUR_LINKEDIN_CLIENT_ID" },
      { "credentialkey": "linkedin", "fieldname": "clientsecret", "fieldvalue": "YOUR_LINKEDIN_CLIENT_SECRET" },
      { "credentialkey": "linkedin", "fieldname": "organizationid", "fieldvalue": "12345678" }
    ]
  }'
```

`organizationid` is the numeric ID from your Company Page admin URL. The vanity slug won't work.

### Step 7: Initiate OAuth

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/OAuthConnect" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "credentialkey": "linkedin",
    "redirecturl": "https://your-app.com/settings/integrations",
    "authmethod": "own"
  }'
```

Response:

```json
{
  "result": true,
  "authorizeUrl": "https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=...&redirect_uri=...&scope=openid%20profile%20w_organization_social%20r_organization_social&state=...",
  "errors": []
}
```

### Step 8: Handle the callback

After consent, LinkedIn redirects to Wiro's callback. Wiro exchanges the code for access + refresh tokens, fetches the member's `localizedFirstName` + `localizedLastName` from `GET /v2/me`, and returns the user to your `redirecturl`.

**Success URL:**

```
https://your-app.com/settings/integrations?li_connected=true&li_name=Jane%20Doe
```

`li_name` is the connected LinkedIn member's display name (a human), **not** the Company Page name — the page is identified by `organizationid` which you set in Step 6.

```javascript
const params = new URLSearchParams(window.location.search);

if (params.get("li_connected") === "true") {
  const name = params.get("li_name");
  showSuccess(`Connected as ${name}`);
} else if (params.get("li_error")) {
  handleError(params.get("li_error"));
}
```

### Step 9: Verify

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/OAuthStatus" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "credentialkey": "linkedin"
  }'
```

Response:

```json
{
  "result": true,
  "connected": true,
  "accounts": [
    { "id": "Jane Doe", "name": "Jane Doe" }
  ],
  "connectedat": "2026-04-17T12:00:00.000Z",
  "tokenexpiresat": "2026-06-16T12:00:00.000Z",
  "errors": []
}
```

- `accounts[0].id` carries the connected LinkedIn member's display name (a human), **not** the Company Page name — the page is identified by `organizationid` you set in Step 6.
- Access tokens last ~60 days; refresh tokens ~1 year (LinkedIn returns both durations in the token exchange response; the refresh token is used internally by Wiro's daily maintenance cron).

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
| `credentialkey` | string | Yes | `"linkedin"`. |
| `redirecturl` | string | Yes | HTTPS URL. |
| `authmethod` | string | No | `"wiro"` (coming soon) or `"own"`. |

### GET /UserAgentOAuth/LICallback

Query params: `li_connected=true&li_name=...` or `li_error=...`. The callback path is per-provider — LinkedIn's stays `LICallback`.

### POST /UserAgentOAuth/OAuthStatus

Body: `{ useragentguid, credentialkey: "linkedin" }`. Response: `connected`, `accounts: [{id, name}]` (1-element with the connected member's display name), `connectedat`, `tokenexpiresat`.

### POST /UserAgentOAuth/OAuthDisconnect

Body: `{ useragentguid, credentialkey: "linkedin" }`. Clears LinkedIn credentials (no remote revoke).

### POST /UserAgentOAuth/TokenRefresh

> Running agents refresh the LinkedIn token automatically via the daily maintenance cron. Use this only for debugging or manual overrides.

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/TokenRefresh" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "provider": "linkedin"
  }'
```

Uses the stored refresh token. Returns new access + refresh tokens. See [Automatic token refresh](/docs/agent-credentials#automatic-token-refresh).

## Using the Skill

Once the LinkedIn Company Page is connected (organization ID persisted), the agent's scheduled tasks use the `linkedin-post` platform skill to publish text, image, and video posts to the Company Page. To adjust the cron of the built-in `cron-content-scanner` task (Social Manager), call `UserAgent/CustomSkillUpsert` with `enabled` and `interval` only — the task body (`value`) is owned by the bundled integration skill and silently dropped on writes:

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/CustomSkillUpsert" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "skillkey": "cron-content-scanner",
    "enabled": true,
    "interval": "0 */4 * * *"
  }'
```

To change **what** the scheduled task posts (topics, tone, audience angle), edit the paired preference skill `content-tone` instead — see [Agent Skills → Updating Preference Skills](/docs/agent-skills#updating-preference-skills).

## Troubleshooting

| Error code | Meaning | What to do |
|------------|---------|------------|
| `missing_params` | Callback reached without `state` or `code`. | Restart from Step 7. |
| `session_expired` | >15 min between `OAuthConnect` and callback. | Call `OAuthConnect` again. |
| `authorization_denied` | User cancelled, or missing required scopes in app. | Verify all four scopes are enabled under Auth → OAuth 2.0 scopes. |
| `token_exchange_failed` | Wrong Client Secret or redirect URI mismatch. | Re-copy secret; verify URL. |
| `useragent_not_found` | Invalid or unauthorized guid. | Use `POST /UserAgent/MyAgents`. |
| `LinkedIn credentials not configured` | Returned in `OAuthConnect`'s `errors[]` when `authmethod: "own"` but `clientid` / `clientsecret` are missing. | `UserAgent/CredentialUpsert` with `clientid` + `clientsecret`. |
| `internal_error` | Server error. | Retry; contact support if persistent. |

### Posts rejected with 401 Unauthorized

Most likely cause: the Community Management API product hasn't been approved yet. During the pending phase, posting works only for admins of the Company Page the app is associated with (**My Pages** in LinkedIn Developers). Verify admin membership.

### "Scope `w_organization_social` not authorized"

Enable it under **Auth → OAuth 2.0 scopes**, then have the user reconnect. LinkedIn doesn't automatically grant scopes you haven't enabled.

### Wrong organization ID

Use the numeric ID from `linkedin.com/company/<ID>/admin/` — not the slug. Update via `POST /UserAgent/CredentialUpsert` and reconnect if needed.

## Multi-Tenant Architecture

1. **One LinkedIn Developer App** per product.
2. **One Wiro agent instance per customer**; capture `organizationid` during onboarding.
3. **Community Management API approval** is per app (not per customer) — apply once.
4. **Tokens are isolated per agent instance.**
5. **Rate limits** per app and per organization; see LinkedIn's [rate-limits docs](https://learn.microsoft.com/en-us/linkedin/shared/api-guide/concepts/rate-limits).

## Related

- [Agent Credentials & OAuth](/docs/agent-credentials)
- [Agent Overview](/docs/agent-overview)
- [Agent Skills](/docs/agent-skills)
- [LinkedIn Marketing Developer Platform](https://learn.microsoft.com/en-us/linkedin/marketing/)
