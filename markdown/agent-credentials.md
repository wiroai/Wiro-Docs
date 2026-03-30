# Agent Credentials & OAuth

Configure third-party service connections for your agent instances.

## Overview

Agents connect to external services — social media platforms, ad networks, email tools, CRMs — via two methods:

1. **API Key credentials** — set directly via `POST /UserAgent/Update`
2. **OAuth credentials** — redirect-based authorization flow via `POST /UserAgentOAuth/{Provider}Connect`

API keys are simple key-value pairs you provide. OAuth requires a browser redirect where the end user authorizes access on the provider's site, and Wiro handles the token exchange server-side.

## Setting API Key Credentials

Use `POST /UserAgent/Update` with `configuration.credentials` in the request body to set API keys for services that don't require OAuth.

### Example: Setting a Brevo API Key

```json
POST /UserAgent/Update
{
  "guid": "your-useragent-guid",
  "configuration": {
    "credentials": {
      "brevo": {
        "apiKey": "xkeysib-abc123..."
      }
    }
  }
}
```

### Example: Setting WordPress Credentials

```json
POST /UserAgent/Update
{
  "guid": "your-useragent-guid",
  "configuration": {
    "credentials": {
      "wordpress": {
        "siteUrl": "https://your-site.com",
        "username": "admin",
        "applicationPassword": "xxxx xxxx xxxx xxxx"
      }
    }
  }
}
```

### API Key Credential Types

| Service | Key Fields | Notes |
|---------|-----------|-------|
| `brevo` | `apiKey` | Brevo (formerly Sendinblue) email API |
| `sendgrid` | `apiKey` | SendGrid email delivery |
| `wordpress` | `siteUrl`, `username`, `applicationPassword` | WordPress REST API |
| `firebase` | `serviceAccountKey` | Firebase Admin SDK |
| `gmail` | `serviceAccountKey`, `delegatedEmail` | Gmail API via service account |
| `apollo` | `apiKey` | Apollo.io lead database |
| `lemlist` | `apiKey` | Lemlist outreach campaigns |
| `telegram` | `botToken` | Telegram Bot API |
| `newsletter` | `testEmail` | Test email address for previews |

All credential fields are optional — only set the ones your agent requires. The agent's configuration template defines which credentials are available.

## OAuth Authorization Flow

For services that require user authorization (social media accounts, ad platforms, CRMs), Wiro implements a full OAuth flow. Your backend initiates the flow, the user authorizes in their browser, and Wiro stores the tokens securely.

### Supported OAuth Providers

| Provider | Connect Endpoint | Redirect Success Params | Redirect Error Params |
|----------|-----------------|------------------------|----------------------|
| Twitter/X | `XConnect` | `x_connected=true&x_username=...` | `x_error=...` |
| TikTok | `TikTokConnect` | `tiktok_connected=true&tiktok_username=...` | `tiktok_error=...` |
| Instagram | `IGConnect` | `ig_connected=true&ig_username=...` | `ig_error=...` |
| Facebook | `FBConnect` | `fb_connected=true&fb_page_name=...` | `fb_error=...` |
| LinkedIn | `LIConnect` | `li_connected=true&li_name=...` | `li_error=...` |
| Google Ads | `GAdsConnect` | `gads_connected=true&gads_email=...` | `gads_error=...` |
| Meta Ads | `MetaAdsConnect` | `metaads_connected=true` | `metaads_error=...` |
| HubSpot | `HubSpotConnect` | `hubspot_connected=true` | `hubspot_error=...` |
| Mailchimp | `MailchimpConnect` | `mailchimp_connected=true` | `mailchimp_error=...` |

### Flow Diagram

```
Your Backend                  Wiro API                Provider              User's Browser
     |                            |                       |                        |
     |  POST /{Provider}Connect   |                       |                        |
     |--------------------------->|                       |                        |
     |  { authorizeUrl }          |                       |                        |
     |<---------------------------|                       |                        |
     |                            |                       |                        |
     |  Redirect user to authorizeUrl                     |                        |
     |------------------------------------------------------->                    |
     |                            |                       |   User authorizes      |
     |                            |                       |<-----------------------|
     |                            |   Callback + code     |                        |
     |                            |<----------------------|                        |
     |                            |   Exchange for tokens |                        |
     |                            |---------------------->|                        |
     |                            |   Tokens stored       |                        |
     |                            |                       |                        |
     |                            |   Redirect to your redirectUrl                 |
     |<-------------------------------------------------------------------|        |
     |  ?provider_connected=true  |                       |                        |
```

1. Your backend calls `POST /UserAgentOAuth/{Provider}Connect`
2. Wiro returns an `authorizeUrl`
3. You redirect the user's browser to `authorizeUrl`
4. User authorizes on the provider's consent screen
5. Provider redirects to Wiro's callback (server-to-server token exchange happens here)
6. Wiro redirects the user to your `redirectUrl` with success or error query parameters

### Connect Endpoint

**POST** /UserAgentOAuth/{Provider}Connect

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userAgentGuid` | string | Yes | The agent instance GUID |
| `redirectUrl` | string | Yes | Where to redirect after OAuth completes (HTTPS or localhost) |
| `authMethod` | string | No | `"wiro"` (default) or `"own"` |

#### Response

```json
{
  "result": true,
  "authorizeUrl": "https://x.com/i/oauth2/authorize?response_type=code&client_id=...",
  "errors": []
}
```

### Auth Methods

#### `"wiro"` (default)

Uses Wiro's pre-configured OAuth app credentials. This is the simplest approach — one-click connect with no additional setup.

#### `"own"`

Uses your own OAuth app credentials stored in the agent's configuration. Before calling Connect with `authMethod: "own"`, set your app credentials via `POST /UserAgent/Update`:

```json
POST /UserAgent/Update
{
  "guid": "your-useragent-guid",
  "configuration": {
    "credentials": {
      "twitter": {
        "clientId": "your-twitter-client-id",
        "clientSecret": "your-twitter-client-secret"
      }
    }
  }
}
```

When using `"own"` mode, you must register Wiro's callback URL in your OAuth app settings on the provider's developer portal. The callback URL format is:

```
https://api.wiro.ai/v1/UserAgentOAuth/{Provider}Callback
```

> **Note:** LinkedIn currently only supports `"own"` auth method. Wiro mode for LinkedIn is coming soon.

### Status Check

Check whether a provider is connected for a given agent instance.

**POST** /UserAgentOAuth/{Provider}Status

```json
{
  "userAgentGuid": "your-useragent-guid"
}
```

#### Response

```json
{
  "result": true,
  "connected": true,
  "username": "johndoe",
  "connectedAt": "2025-04-01T12:00:00.000Z",
  "tokenExpiresAt": "2025-04-01T14:00:00.000Z",
  "refreshTokenExpiresAt": "2025-10-01T12:00:00.000Z",
  "errors": []
}
```

The `username` field name varies by provider: `xUsername` for Twitter/X, `tiktokUsername` for TikTok, `igUsername` for Instagram, `fbPageName` for Facebook, and so on.

### Disconnect

Revoke access and remove stored tokens for a provider.

**POST** /UserAgentOAuth/{Provider}Disconnect

```json
{
  "userAgentGuid": "your-useragent-guid"
}
```

#### Response

```json
{
  "result": true,
  "errors": []
}
```

Wiro attempts to revoke the token on the provider's side before clearing it from the configuration. The agent restarts automatically if it was running.

### Token Refresh

Manually trigger a token refresh for a connected provider.

**POST** /UserAgentOAuth/TokenRefresh

```json
{
  "userAgentGuid": "your-useragent-guid",
  "provider": "twitter"
}
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userAgentGuid` | string | Yes | The agent instance GUID |
| `provider` | string | Yes | One of: `twitter`, `tiktok`, `instagram`, `facebook`, `linkedin`, `googleads`, `metaads`, `hubspot` |

> **Note:** Mailchimp is not included — its tokens do not expire.

#### Response

```json
{
  "result": true,
  "accessToken": "new-access-token...",
  "refreshToken": "new-refresh-token...",
  "errors": []
}
```

The agent restarts automatically after a token refresh if it was running.

### Extra Provider Endpoints

#### Google Ads — Set Customer ID

After connecting Google Ads via OAuth, you must set the Google Ads customer ID to target:

**POST** /UserAgentOAuth/GAdsSetCustomerId

```json
{
  "userAgentGuid": "your-useragent-guid",
  "customerId": "123-456-7890"
}
```

#### Meta Ads — Set Ad Account

After connecting Meta Ads via OAuth, set the ad account to manage:

**POST** /UserAgentOAuth/MetaAdsSetAdAccount

```json
{
  "userAgentGuid": "your-useragent-guid",
  "adAccountId": "act_123456789",
  "adAccountName": "My Ad Account"
}
```

## Security

- **Tokens are stored server-side** in the agent instance configuration and are never exposed in API responses
- The `redirectUrl` receives only connection status parameters — no tokens, no secrets
- API responses from Status, Detail, and Update endpoints are sanitized: `accessToken`, `refreshToken`, `clientSecret`, and `appSecret` fields are stripped before returning
- OAuth state parameters use a 15-minute TTL cache to prevent replay attacks
- Redirect URLs must be HTTPS (or localhost for development)

## For Third-Party Developers

If you're building a product on top of Wiro agents and need your customers to connect their own accounts (e.g., their Twitter, their Google Ads), here's the recommended flow:

### Architecture

1. **Deploy** an agent instance per customer via `POST /UserAgent/Deploy`
2. **Connect** — your backend calls `POST /UserAgentOAuth/{Provider}Connect` with the customer's `userAgentGuid` and a `redirectUrl` pointing back to your app
3. **Redirect** — send your customer's browser to the returned `authorizeUrl`
4. **Authorize** — customer logs in and authorizes on the provider
5. **Return** — customer lands back on your `redirectUrl` with success/error query parameters
6. **Verify** — call `POST /UserAgentOAuth/{Provider}Status` to confirm connection

Your customers never interact with Wiro directly. The entire flow happens through your app, and Wiro handles token management behind the scenes.

### Code Examples

#### Connect — curl

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/XConnect" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "userAgentGuid": "customer-useragent-guid",
    "redirectUrl": "https://your-app.com/settings/social?provider=twitter",
    "authMethod": "wiro"
  }'
```

#### Connect — Python

```python
import requests

headers = {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
}

response = requests.post(
    "https://api.wiro.ai/v1/UserAgentOAuth/XConnect",
    headers=headers,
    json={
        "userAgentGuid": "customer-useragent-guid",
        "redirectUrl": "https://your-app.com/settings/social?provider=twitter",
        "authMethod": "wiro"
    }
)
data = response.json()
authorize_url = data.get("authorizeUrl")
# Redirect your customer's browser to authorize_url
```

#### Connect — Node.js

```javascript
const axios = require('axios');

const headers = {
  'x-api-key': 'YOUR_API_KEY',
  'Content-Type': 'application/json'
};

const response = await axios.post(
  'https://api.wiro.ai/v1/UserAgentOAuth/XConnect',
  {
    userAgentGuid: 'customer-useragent-guid',
    redirectUrl: 'https://your-app.com/settings/social?provider=twitter',
    authMethod: 'wiro'
  },
  { headers }
);
const { authorizeUrl } = response.data;
// Redirect your customer's browser to authorizeUrl
```

#### Status Check — curl

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/XStatus" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "userAgentGuid": "customer-useragent-guid"
  }'
```

#### Disconnect — curl

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/XDisconnect" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "userAgentGuid": "customer-useragent-guid"
  }'
```

#### Handling the Redirect in Your App

When the user returns to your `redirectUrl`, check the query parameters:

```javascript
// Express route handling the OAuth redirect
app.get('/settings/social', (req, res) => {
  const provider = req.query.provider;

  if (req.query.x_connected === 'true') {
    const username = req.query.x_username;
    // Twitter connected successfully — update your UI
    return res.redirect(`/dashboard?connected=${provider}&username=${username}`);
  }

  if (req.query.x_error) {
    const error = req.query.x_error;
    // authorization_denied, token_exchange_failed, useragent_not_found, invalid_config, internal_error
    return res.redirect(`/dashboard?error=${provider}&reason=${error}`);
  }
});
```

### Error Values

OAuth redirect error parameters follow the pattern `{provider_prefix}_error`. Possible values:

| Error | Description |
|-------|-------------|
| `authorization_denied` | User declined the authorization |
| `token_exchange_failed` | Provider accepted the code but token exchange failed |
| `useragent_not_found` | The agent instance GUID is invalid or unauthorized |
| `invalid_config` | Agent configuration doesn't have credentials for this provider |
| `internal_error` | Unexpected server error during callback processing |
