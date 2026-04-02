# Agent Credentials & OAuth

Configure third-party service connections for your agent instances.

## Overview

Agents connect to external services — social media platforms, ad networks, email tools, CRMs — via two methods:

1. **API Key credentials** — set directly via `POST /UserAgent/Update`
2. **OAuth credentials** — redirect-based authorization flow via `POST /UserAgentOAuth/{Provider}Connect`

API keys are simple key-value pairs you provide. OAuth requires a browser redirect where the end user authorizes access on the provider's site, and Wiro handles the token exchange server-side.

## Setting API Key Credentials

Use `POST /UserAgent/Update` with `configuration.credentials` to set API keys for services that don't require OAuth. Each credential group is a key in the `credentials` object — you only need to set the ones your agent requires.

### Request Format

```json
POST /UserAgent/Update
{
  "guid": "your-useragent-guid",
  "configuration": {
    "credentials": {
      "<service>": {
        "<field>": "value"
      }
    }
  }
}
```

> **Important:** You can only update fields marked as `_editable: true` in the configuration. Attempting to set a non-editable field will be silently ignored. Use `POST /UserAgent/Detail` to see which fields are editable.

### Credential Configuration by Agent

Each agent requires different credentials. Find your agent below to see exactly which credentials to configure and the complete `POST /UserAgent/Update` request.

#### Social Manager

Manages social media accounts — posts, replies, scheduling across Twitter/X, Instagram, Facebook, LinkedIn, TikTok. OAuth providers are connected separately via the [OAuth flow](#oauth-authorization-flow).

| Service | Type | Fields |
|---------|------|--------|
| `twitter` | OAuth | Connected via `XConnect`. Set `authMethod` to `"wiro"` or `"own"`. |
| `instagram` | OAuth | Connected via `IGConnect`. |
| `facebook` | OAuth | Connected via `FBConnect`. |
| `linkedin` | OAuth | Connected via `LIConnect`. Also set `organizationId`. |
| `tiktok` | OAuth | Connected via `TikTokConnect`. |
| `gmail` | API Key | `account`, `appPassword` |
| `telegram` | API Key | `botToken`, `allowedUsers`, `sessionMode` |

```json
POST /UserAgent/Update
{
  "guid": "your-useragent-guid",
  "configuration": {
    "credentials": {
      "gmail": {
        "account": "agent@company.com",
        "appPassword": "xxxx xxxx xxxx xxxx"
      },
      "telegram": {
        "botToken": "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11",
        "allowedUsers": ["761381461"],
        "sessionMode": [
          { "value": "private", "text": "Private — each user has their own conversation", "selected": true },
          { "value": "collaborative", "text": "Collaborative — all users share the same conversation", "selected": false }
        ]
      }
    }
  }
}
```

> **Note:** Social media accounts (Twitter, Instagram, etc.) are connected via the [OAuth flow](#oauth-authorization-flow), not via Update. Use Update only for `gmail` and `telegram` credentials.

#### Blog Content Editor

Publishes blog posts to WordPress, monitors a Gmail inbox for content requests.

| Service | Fields | Description |
|---------|--------|-------------|
| `wordpress` | `url`, `user`, `appPassword` | WordPress site URL, username, and application password |
| `gmail` | `account`, `appPassword` | Gmail address + Google App Password for inbox monitoring |
| `telegram` | `botToken`, `allowedUsers`, `sessionMode` | Telegram bot for operator notifications |

```json
POST /UserAgent/Update
{
  "guid": "your-useragent-guid",
  "configuration": {
    "credentials": {
      "wordpress": {
        "url": "https://blog.example.com",
        "user": "WiroBlogAgent",
        "appPassword": "xxxx xxxx xxxx xxxx"
      },
      "gmail": {
        "account": "agent@company.com",
        "appPassword": "xxxx xxxx xxxx xxxx"
      },
      "telegram": {
        "botToken": "123456:ABC-DEF1234ghIkl",
        "allowedUsers": ["761381461"],
        "sessionMode": [
          { "value": "private", "text": "Private — each user has their own conversation", "selected": true },
          { "value": "collaborative", "text": "Collaborative — all users share the same conversation", "selected": false }
        ]
      }
    }
  }
}
```

#### App Review Support

Monitors and replies to App Store and Google Play reviews.

| Service | Fields | Description |
|---------|--------|-------------|
| `appstore` | `keyId`, `issuerId`, `privateKeyBase64`, `appIds`, `supportEmail` | App Store Connect API credentials |
| `googleplay` | `serviceAccountJsonBase64`, `packageNames`, `supportEmail` | Google Play service account |
| `telegram` | `botToken`, `allowedUsers`, `sessionMode` | Telegram bot for operator notifications |

```json
POST /UserAgent/Update
{
  "guid": "your-useragent-guid",
  "configuration": {
    "credentials": {
      "appstore": {
        "keyId": "ABC1234DEF",
        "issuerId": "12345678-1234-1234-1234-123456789012",
        "privateKeyBase64": "LS0tLS1CRUdJTi...",
        "appIds": ["6479306352"],
        "supportEmail": "support@company.com"
      },
      "googleplay": {
        "serviceAccountJsonBase64": "eyJ0eXBlIjoic2VydmljZV9hY2NvdW50Ii...",
        "packageNames": ["com.example.app"],
        "supportEmail": "support@company.com"
      },
      "telegram": {
        "botToken": "123456:ABC-DEF1234ghIkl",
        "allowedUsers": ["761381461"],
        "sessionMode": [
          { "value": "private", "text": "Private — each user has their own conversation", "selected": true },
          { "value": "collaborative", "text": "Collaborative — all users share the same conversation", "selected": false }
        ]
      }
    }
  }
}
```

#### App Event Manager

Suggests and creates App Store in-app events based on holidays and trends.

| Service | Fields | Description |
|---------|--------|-------------|
| `appstore` | `keyId`, `issuerId`, `privateKeyBase64`, `appIds` | App Store Connect API credentials |
| `telegram` | `botToken`, `allowedUsers`, `sessionMode` | Telegram bot for operator notifications |

```json
POST /UserAgent/Update
{
  "guid": "your-useragent-guid",
  "configuration": {
    "credentials": {
      "appstore": {
        "keyId": "ABC1234DEF",
        "issuerId": "12345678-1234-1234-1234-123456789012",
        "privateKeyBase64": "LS0tLS1CRUdJTi...",
        "appIds": ["6479306352"]
      },
      "telegram": {
        "botToken": "123456:ABC-DEF1234ghIkl",
        "allowedUsers": ["761381461"],
        "sessionMode": [
          { "value": "private", "text": "Private — each user has their own conversation", "selected": true },
          { "value": "collaborative", "text": "Collaborative — all users share the same conversation", "selected": false }
        ]
      }
    }
  }
}
```

#### Push Notification Manager

Sends targeted push notifications via Firebase Cloud Messaging.

| Service | Fields | Description |
|---------|--------|-------------|
| `firebase` | `accounts[]` | Array of Firebase projects. Each: `appName`, `serviceAccountJsonBase64`, `apps` (platform + id), `topics` (key→description object) |
| `telegram` | `botToken`, `allowedUsers`, `sessionMode` | Telegram bot for operator notifications |

```json
POST /UserAgent/Update
{
  "guid": "your-useragent-guid",
  "configuration": {
    "credentials": {
      "firebase": {
        "accounts": [{
          "appName": "My App",
          "serviceAccountJsonBase64": "eyJ0eXBlIjoic2VydmljZV9hY2NvdW50Ii...",
          "apps": [
            { "platform": "ios", "id": "6479306352" },
            { "platform": "android", "id": "com.example.app" }
          ],
          "topics": { "locale_en": "English users", "tier_paid": "Paid subscribers" }
        }]
      },
      "telegram": {
        "botToken": "123456:ABC-DEF1234ghIkl",
        "allowedUsers": ["761381461"],
        "sessionMode": [
          { "value": "private", "text": "Private — each user has their own conversation", "selected": true },
          { "value": "collaborative", "text": "Collaborative — all users share the same conversation", "selected": false }
        ]
      }
    }
  }
}
```

#### Newsletter Manager

Creates and sends newsletters via Brevo, SendGrid, HubSpot, or Mailchimp.

| Service | Type | Fields |
|---------|------|--------|
| `brevo` | API Key | `apiKey` |
| `sendgrid` | API Key | `apiKey` |
| `hubspot` | OAuth | Connected via `HubSpotConnect` |
| `mailchimp` | OAuth/Key | OAuth via `MailchimpConnect` or set `apiKey` directly |
| `newsletter` | Config | `testEmail` |
| `telegram` | API Key | `botToken`, `allowedUsers`, `sessionMode` |

```json
POST /UserAgent/Update
{
  "guid": "your-useragent-guid",
  "configuration": {
    "credentials": {
      "brevo": { "apiKey": "xkeysib-abc123..." },
      "sendgrid": { "apiKey": "SG.xxxx..." },
      "newsletter": { "testEmail": "test@company.com" },
      "telegram": {
        "botToken": "123456:ABC-DEF1234ghIkl",
        "allowedUsers": ["761381461"],
        "sessionMode": [
          { "value": "private", "text": "Private — each user has their own conversation", "selected": true },
          { "value": "collaborative", "text": "Collaborative — all users share the same conversation", "selected": false }
        ]
      }
    }
  }
}
```

> **Note:** HubSpot and Mailchimp are connected via [OAuth](#oauth-authorization-flow). Mailchimp also accepts a direct `apiKey` without OAuth.

#### Lead Gen Manager

Finds leads and manages outreach campaigns via Apollo.io, Lemlist, and HubSpot.

| Service | Type | Fields |
|---------|------|--------|
| `apollo` | API Key | `apiKey`, `masterApiKey` (optional, for sequences) |
| `lemlist` | API Key | `apiKey` |
| `hubspot` | OAuth | Connected via `HubSpotConnect` |
| `telegram` | API Key | `botToken`, `allowedUsers`, `sessionMode` |

```json
POST /UserAgent/Update
{
  "guid": "your-useragent-guid",
  "configuration": {
    "credentials": {
      "apollo": {
        "apiKey": "your-apollo-api-key",
        "masterApiKey": "your-master-key"
      },
      "lemlist": { "apiKey": "your-lemlist-key" },
      "telegram": {
        "botToken": "123456:ABC-DEF1234ghIkl",
        "allowedUsers": ["761381461"],
        "sessionMode": [
          { "value": "private", "text": "Private — each user has their own conversation", "selected": true },
          { "value": "collaborative", "text": "Collaborative — all users share the same conversation", "selected": false }
        ]
      }
    }
  }
}
```

#### Google Ads Manager

Manages Google Ads campaigns, keywords, and ad copy.

| Service | Type | Fields |
|---------|------|--------|
| `googleads` | OAuth | Connected via `GAdsConnect`. Then set `customerId` via `GAdsSetCustomerId`. |
| `website` | Config | `urls` — array of `{ websiteName, url }` |
| `appstore` | Config | `apps` — array of `{ appName, appId }` |
| `googleplay` | Config | `apps` — array of `{ appName, packageName }` |
| `telegram` | API Key | `botToken`, `allowedUsers`, `sessionMode` |

```json
POST /UserAgent/Update
{
  "guid": "your-useragent-guid",
  "configuration": {
    "credentials": {
      "website": {
        "urls": [{ "websiteName": "Main Site", "url": "https://example.com" }]
      },
      "appstore": {
        "apps": [{ "appName": "My iOS App", "appId": "6479306352" }]
      },
      "googleplay": {
        "apps": [{ "appName": "My Android App", "packageName": "com.example.app" }]
      },
      "telegram": {
        "botToken": "123456:ABC-DEF1234ghIkl",
        "allowedUsers": ["761381461"],
        "sessionMode": [
          { "value": "private", "text": "Private — each user has their own conversation", "selected": true },
          { "value": "collaborative", "text": "Collaborative — all users share the same conversation", "selected": false }
        ]
      }
    }
  }
}
```

> **Note:** Google Ads is connected via [OAuth](#oauth-authorization-flow). After connecting, set the customer ID via `POST /UserAgentOAuth/GAdsSetCustomerId`.

#### Meta Ads Manager

Manages Meta (Facebook/Instagram) ad campaigns and creatives.

| Service | Type | Fields |
|---------|------|--------|
| `metaads` | OAuth | Connected via `MetaAdsConnect`. Then set ad account via `MetaAdsSetAdAccount`. |
| `website` | Config | `urls` — array of `{ websiteName, url }` |
| `appstore` | Config | `apps` — array of `{ appName, appId }` |
| `googleplay` | Config | `apps` — array of `{ appName, packageName }` |
| `telegram` | API Key | `botToken`, `allowedUsers`, `sessionMode` |

```json
POST /UserAgent/Update
{
  "guid": "your-useragent-guid",
  "configuration": {
    "credentials": {
      "website": {
        "urls": [{ "websiteName": "Landing Page", "url": "https://example.com" }]
      },
      "appstore": {
        "apps": [{ "appName": "My iOS App", "appId": "6479306352" }]
      },
      "googleplay": {
        "apps": [{ "appName": "My Android App", "packageName": "com.example.app" }]
      },
      "telegram": {
        "botToken": "123456:ABC-DEF1234ghIkl",
        "allowedUsers": ["761381461"],
        "sessionMode": [
          { "value": "private", "text": "Private — each user has their own conversation", "selected": true },
          { "value": "collaborative", "text": "Collaborative — all users share the same conversation", "selected": false }
        ]
      }
    }
  }
}
```

> **Note:** Meta Ads is connected via [OAuth](#oauth-authorization-flow). After connecting, set the ad account via `POST /UserAgentOAuth/MetaAdsSetAdAccount`.

### Credential Field Reference

Quick reference for all credential field names across services:

| Service Key | Editable Fields |
|-------------|-----------------|
| `telegram` | `botToken`, `allowedUsers`, `sessionMode` |
| `wordpress` | `url`, `user`, `appPassword` |
| `gmail` | `account`, `appPassword` |
| `brevo` | `apiKey` |
| `sendgrid` | `apiKey` |
| `apollo` | `apiKey`, `masterApiKey` |
| `lemlist` | `apiKey` |
| `newsletter` | `testEmail` |
| `appstore` | `keyId`, `issuerId`, `privateKeyBase64`, `appIds` — or `apps` array for ads agents |
| `googleplay` | `serviceAccountJsonBase64`, `packageNames` — or `apps` array for ads agents |
| `firebase` | `accounts[]`: `appName`, `serviceAccountJsonBase64`, `apps`, `topics` |
| `website` | `urls` array of `{ websiteName, url }` |
| `twitter` | OAuth — `authMethod` (own: + `clientId`, `clientSecret`) |
| `instagram` | OAuth — `authMethod` (own: + `appId`, `appSecret`) |
| `facebook` | OAuth — `authMethod` (own: + `appId`, `appSecret`) |
| `linkedin` | OAuth — `authMethod`, `organizationId` (own: + `clientId`, `clientSecret`) |
| `tiktok` | OAuth — `authMethod` (own: + `clientKey`, `clientSecret`) |
| `googleads` | OAuth — `authMethod` (own: + `clientId`, `clientSecret`, `developerToken`, `managerCustomerId`) |
| `metaads` | OAuth — `authMethod` (own: + `appId`, `appSecret`) |
| `hubspot` | OAuth — `authMethod` (own: + `clientId`, `clientSecret`) |
| `mailchimp` | OAuth — `authMethod`, `apiKey` (own: + `clientId`, `clientSecret`) |

### Setup Required State

If an agent has required (non-optional) credentials that haven't been filled in, the agent is in **Setup Required** state (status `6`) and cannot be started. After setting all required credentials via Update, the status automatically changes to `0` (Stopped) and you can call Start.

Check the `setuprequired` boolean in `UserAgent/Detail` or `UserAgent/MyAgents` responses to determine if credentials still need to be configured.

## OAuth Authorization Flow

For services that require user authorization (social media accounts, ad platforms, CRMs), Wiro implements a full OAuth flow. The entire process is **fully white-label** — your end-users interact only with your app and the provider's consent screen. They never see or visit wiro.ai at any point.

> **Key point:** The `redirectUrl` you pass to the Connect endpoint is **your own URL**. After authorization, users are redirected back to your app — not to Wiro. Any HTTPS URL is accepted. Use `http://localhost` or `http://127.0.0.1` for development.

### Supported OAuth Providers

| Provider | Connect Endpoint | Redirect Success Params | Redirect Error Params |
|----------|-----------------|------------------------|----------------------|
| Twitter/X | `XConnect` | `x_connected=true&x_username=...` | `x_error=...` |
| TikTok | `TikTokConnect` | `tiktok_connected=true&tiktok_username=...` | `tiktok_error=...` |
| Instagram | `IGConnect` | `ig_connected=true&ig_username=...` | `ig_error=...` |
| Facebook | `FBConnect` | `fb_connected=true&fb_pagename=...` | `fb_error=...` |
| LinkedIn | `LIConnect` | `li_connected=true&li_name=...` | `li_error=...` |
| Google Ads | `GAdsConnect` | `gads_connected=true&gads_accounts=[...]` | `gads_error=...` |
| Meta Ads | `MetaAdsConnect` | `metaads_connected=true&metaads_accounts=[...]` | `metaads_error=...` |
| HubSpot | `HubSpotConnect` | `hubspot_connected=true&hubspot_portal=...&hubspot_name=...` | `hubspot_error=...` |
| Mailchimp | `MailchimpConnect` | `mailchimp_connected=true&mailchimp_account=...` | `mailchimp_error=...` |

### Flow Diagram

```
Your App (Frontend)           Your Backend              Wiro API              Provider (e.g. Twitter)
       |                            |                       |                        |
  (1)  | "Connect Twitter" click    |                       |                        |
       |--------------------------->|                       |                        |
       |                            |  POST /XConnect       |                        |
  (2)  |                            |--> { userAgentGuid,   |                        |
       |                            |      redirectUrl,     |                        |
       |                            |      authMethod }     |                        |
       |                            |                       |                        |
  (3)  |                            |<-- { authorizeUrl }   |                        |
       |                            |                       |                        |
  (4)  |<--- redirect to authorizeUrl                       |                        |
       |--------------------------------------------------------> User sees Twitter  |
       |                            |                       |    consent screen      |
  (5)  |                            |                       |<-- User clicks Allow   |
       |                            |                       |                        |
  (6)  |                            |   (invisible callback)|                        |
       |                            |   Wiro exchanges code |<-----------------------|
       |                            |   for tokens, saves   |                        |
       |                            |   them to agent config|                        |
       |                            |                       |                        |
  (7)  |<------- 302 redirect to YOUR redirectUrl ----------------------------------|
       | https://your-app.com/settings?x_connected=true&x_username=johndoe          |
       |                            |                       |                        |
```

### What the User Sees

| Step | User Sees | URL |
|------|-----------|-----|
| 1 | Your app — "Connect Twitter" button | `https://your-app.com/settings` |
| 2–3 | (Backend API call — invisible to user) | — |
| 4–5 | Provider's consent screen (Twitter, TikTok, etc.) | `https://x.com/i/oauth2/authorize?...` |
| 6 | (Wiro's server-side callback — invisible 302 redirect) | — |
| 7 | Your app — "Connected!" confirmation | `https://your-app.com/settings?x_connected=true` |

**Your users never visit wiro.ai.** The only pages they see are your app and the provider's authorization screen.

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

### Auth Methods — `"wiro"` vs `"own"`

Both modes produce the **same white-label user experience**. The only difference is whose OAuth app credentials are used for the authorization flow:

|  | `"wiro"` (default) | `"own"` |
|--|---------------------|---------|
| **OAuth app credentials** | Wiro's pre-configured app | Your own app from the provider's developer portal |
| **Setup required** | None — just call Connect | Create an app on the provider, set credentials via Update, register Wiro's callback URL |
| **Consent screen branding** | Shows "Wiro" as the app name | Shows **your app name** and branding |
| **Redirect after auth** | To your `redirectUrl` | To your `redirectUrl` |
| **User sees wiro.ai?** | No | No |
| **Token management** | Automatic by Wiro | Automatic by Wiro |
| **Best for** | Quick setup, prototyping, most use cases | Custom branding on consent screen, custom scopes |

> **Recommendation:** Start with `"wiro"` mode. It works out of the box with no configuration. Switch to `"own"` only if you need your brand name on the provider's consent screen or require custom OAuth scopes/permissions.

To use `"own"` mode, first set your app credentials via `POST /UserAgent/Update`, then call Connect with `authMethod: "own"`. Each provider requires different credential field names:

#### "own" Mode Credentials per Provider

| Provider | Credential Key | Required Fields | Request Example |
|----------|---------------|-----------------|-----------------|
| Twitter/X | `twitter` | `clientId`, `clientSecret` | `"twitter": { "clientId": "your-client-id", "clientSecret": "your-client-secret" }` |
| TikTok | `tiktok` | `clientKey`, `clientSecret` | `"tiktok": { "clientKey": "your-client-key", "clientSecret": "your-client-secret" }` |
| Instagram | `instagram` | `appId`, `appSecret` | `"instagram": { "appId": "your-app-id", "appSecret": "your-app-secret" }` |
| Facebook | `facebook` | `appId`, `appSecret` | `"facebook": { "appId": "your-app-id", "appSecret": "your-app-secret" }` |
| LinkedIn | `linkedin` | `clientId`, `clientSecret`, `organizationId` | `"linkedin": { "clientId": "your-client-id", "clientSecret": "your-client-secret", "organizationId": "your-org-id" }` |
| Google Ads | `googleads` | `clientId`, `clientSecret`, `developerToken`, `managerCustomerId` | `"googleads": { "clientId": "your-client-id", "clientSecret": "your-client-secret", "developerToken": "your-dev-token", "managerCustomerId": "123-456-7890" }` |
| Meta Ads | `metaads` | `appId`, `appSecret` | `"metaads": { "appId": "your-app-id", "appSecret": "your-app-secret" }` |
| HubSpot | `hubspot` | `clientId`, `clientSecret` | `"hubspot": { "clientId": "your-client-id", "clientSecret": "your-client-secret" }` |
| Mailchimp | `mailchimp` | `clientId`, `clientSecret` (or `apiKey` without OAuth) | `"mailchimp": { "clientId": "your-client-id", "clientSecret": "your-client-secret" }` |

> **Note:** Field names differ per provider (e.g. TikTok uses `clientKey` not `clientId`, Instagram/Facebook use `appId`/`appSecret` not `clientId`/`clientSecret`). Always use the exact field names from the table above.

#### "own" Mode Full Flow

```json
// Step 1: Set your app credentials
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

// Step 2: Initiate OAuth with authMethod: "own"
POST /UserAgentOAuth/XConnect
{
  "userAgentGuid": "your-useragent-guid",
  "redirectUrl": "https://your-app.com/callback",
  "authMethod": "own"
}

// Step 3: Redirect user to the returned authorizeUrl
// Step 4: User authorizes → redirected back to your redirectUrl
```

When using `"own"` mode, you must register Wiro's callback URL in your OAuth app settings on the provider's developer portal:

```
https://api.wiro.ai/v1/UserAgentOAuth/{Provider}Callback
```

### Status Check

Check whether a provider is connected for a given agent instance.

**POST** /UserAgentOAuth/{Provider}Status

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userAgentGuid` | string | Yes | The agent instance GUID |

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

| Field | Description | Providers |
|-------|-------------|-----------|
| `connected` | Whether the provider is connected | All |
| `username` | Connected account name or identifier | Most providers |
| `linkedinName` | LinkedIn profile name (replaces `username`) | LinkedIn only |
| `customerId` | Google Ads customer ID (replaces `username`) | Google Ads only |
| `connectedAt` | ISO timestamp of when the account was connected | All |
| `tokenExpiresAt` | ISO timestamp of access token expiry | All except Mailchimp |
| `refreshTokenExpiresAt` | ISO timestamp of refresh token expiry | Twitter/X, TikTok, LinkedIn |

### Disconnect

Revoke access and remove stored tokens for a provider.

**POST** /UserAgentOAuth/{Provider}Disconnect

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userAgentGuid` | string | Yes | The agent instance GUID |

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

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userAgentGuid` | string | Yes | The agent instance GUID |
| `customerId` | string | Yes | Google Ads customer ID (e.g. `"123-456-7890"`). Non-digit characters are stripped automatically. |

##### Response

```json
{
  "result": true,
  "customerId": "1234567890",
  "errors": []
}
```

#### Meta Ads — Set Ad Account

After connecting Meta Ads via OAuth, set the ad account to manage:

**POST** /UserAgentOAuth/MetaAdsSetAdAccount

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userAgentGuid` | string | Yes | The agent instance GUID |
| `adAccountId` | string | Yes | Meta Ads account ID (e.g. `"act_123456789"`). The `act_` prefix is stripped automatically. |
| `adAccountName` | string | No | Display name for the ad account |

##### Response

```json
{
  "result": true,
  "errors": []
}
```

## Custom Skills Configuration

Some agents support configurable skills — automated tasks that the agent can perform on a schedule or on demand. You can enable/disable skills, set their execution interval, and edit their parameters via `POST /UserAgent/Update`.

### Request Format

```json
POST /UserAgent/Update
{
  "guid": "your-useragent-guid",
  "configuration": {
    "custom_skills": [
      {
        "key": "daily_post",
        "enabled": true,
        "interval": "0 9 * * *",
        "value": "Post about trending tech topics",
        "description": "Daily automated post at 9 AM"
      }
    ]
  }
}
```

### Skill Fields

| Field | Type | Description |
|-------|------|-------------|
| `key` | string | The unique identifier of the skill. Must match an existing skill defined in the agent template. |
| `enabled` | boolean | Whether the skill is active. Set `false` to disable without removing. |
| `interval` | string \| null | Cron expression for scheduled execution (e.g. `"0 */6 * * *"` for every 6 hours). Set `null` for on-demand only. |
| `value` | string | User-configurable parameter for the skill (only if `_editable: true`). |
| `description` | string | User-configurable description (only if `_editable: true`). |

> **Note:** You can only update skills that exist in the agent's template. New skills cannot be added — only the `enabled`, `interval`, `value`, and `description` fields can be modified. The `value` and `description` fields are editable only if the skill's `_editable` flag is `true`.

## Security

- **Tokens are stored server-side** in the agent instance configuration. The `TokenRefresh` endpoint returns new tokens — all other endpoints (Status, Detail, Update) sanitize token fields before responding.
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

### Handling the Redirect in Your App

```javascript
// Express route handling the OAuth redirect
app.get('/settings/social', (req, res) => {
  const provider = req.query.provider;

  if (req.query.x_connected === 'true') {
    const username = req.query.x_username;
    return res.redirect(`/dashboard?connected=${provider}&username=${username}`);
  }

  if (req.query.x_error) {
    const error = req.query.x_error;
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
