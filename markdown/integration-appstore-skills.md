# App Store Connect Integration

Connect your agent to App Store Connect for review monitoring, metadata management, and in-app events.

## Overview

The App Store Connect integration uses ES256-signed JWT authentication with App Store Connect API keys.

**Skills that use this integration:**

- `appstore-reviews` — Monitor and reply to App Store reviews
- `appstore-metadata` — Read/update app metadata, localizations, screenshots
- `appstore-events` — Create and manage in-app events

**Agents that typically enable this integration:**

- App Review Support
- App Event Manager
- Meta Ads Manager (uses a simpler `apps` array shape — see below)

## Availability

| Mode | Status | Notes |
|------|--------|-------|
| ES256 API Key | Available | Standard App Store Connect API keys. |

## Prerequisites

- **A Wiro API key** — [Authentication](/docs/authentication).
- **A deployed agent** — [Agent Overview](/docs/agent-overview).
- **App Store Connect Admin access** — only Admins can generate API keys.

## Setup

### Step 1: Create an API key

1. Sign in to [App Store Connect](https://appstoreconnect.apple.com/).
2. **Users and Access → Integrations → App Store Connect API**.
3. Click **+** to generate a new key.
4. Name (e.g. "Wiro agent") and role:
   - **Admin** or **App Manager** for full capability
   - **Customer Support** for reviews-only
5. Download the `.p8` file — **only downloadable once**.
6. Copy the **Key ID** (10-char like `ABC1234DEF`) and **Issuer ID** (UUID at top).

### Step 2: Base64-encode the private key

```bash
# Linux
base64 -w 0 AuthKey_ABC1234DEF.p8 > appstore-key.b64

# macOS
base64 -b 0 AuthKey_ABC1234DEF.p8 > appstore-key.b64
```

### Step 3: Save to Wiro

The credential schema depends on which agent you're configuring. There are two valid shapes.

#### Shape A: Flat (review/events/metadata agents)

Used by **App Review Support** and **App Event Manager**:

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Update" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "guid": "your-useragent-guid",
    "configuration": {
      "credentials": {
        "appstore": {
          "keyId": "ABC1234DEF",
          "issuerId": "12345678-1234-1234-1234-123456789012",
          "privateKeyBase64": "LS0tLS1CRUdJTi...",
          "appIds": ["6479306352", "1234567890"],
          "supportEmail": "support@yourcompany.com"
        }
      }
    }
  }'
```

| Field | Type | Description |
|-------|------|-------------|
| `keyId` | string | 10-character App Store Connect Key ID. |
| `issuerId` | string | UUID issuer ID. |
| `privateKeyBase64` | string | Base64-encoded `.p8` private key. |
| `appIds` | string[] | App Store IDs the agent is scoped to. |
| `supportEmail` | string | Used when replying to reviews. |

#### Shape B: `apps` array (ads-manager agents)

Used by **Meta Ads Manager** and **Google Ads Manager** (for cross-platform creatives that reference app listings):

```json
{
  "credentials": {
    "appstore": {
      "apps": [
        {
          "appName": "My iOS App",
          "appId": "6479306352"
        }
      ]
    }
  }
}
```

Each app: `{ appName, appId }`. No keyId/issuerId/privateKey — the ads agents only need the app listing IDs for attribution, not API access.

### Step 4: Start the agent

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Start" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "guid": "your-useragent-guid" }'
```

## Runtime Behavior

Env vars are exported **only when `appstore-reviews` OR `appstore-events` skill is enabled** (not `appstore-metadata` alone):

- `APPSTORE_KEY_ID` ← `credentials.appstore.keyId`
- `APPSTORE_ISSUER_ID` ← `credentials.appstore.issuerId`
- `APPSTORE_APP_IDS` ← `appIds.join(",")`
- `APPSTORE_SUPPORT_EMAIL` ← `supportEmail`

Secret file:

- `/run/secrets/appstore-key.p8` — decoded private key (file, not env var)

Auth: JWT ES256 signed in-agent → `Authorization: Bearer <TOKEN>`.
Base URL: `https://api.appstoreconnect.apple.com/v1/...`.

For ads-manager agents (Shape B), the `apps` array is serialized into `METAADS_APPSTORE_APPS` or `GADS_APPSTORE_APPS` env vars as JSON arrays.

## Troubleshooting

- **401 Unauthorized on API:** Wrong Key ID or Issuer ID, or base64 corrupted the `.p8` key. Re-export and re-encode. Verify no newlines or whitespace were introduced.
- **Key ID `NOT_ENABLED`:** The key was revoked. Generate a new one.
- **Reviews not appearing:** Role of the API key lacks Customer Support permissions. Regenerate with a role that includes review access.
- **Metadata updates fail:** Role lacks Admin or App Manager permissions for the app in question.

## Related

- [Agent Credentials & OAuth](/docs/agent-credentials)
- [Agent Overview](/docs/agent-overview)
- [Agent Skills](/docs/agent-skills)
- [App Store Connect API docs](https://developer.apple.com/documentation/appstoreconnectapi)
