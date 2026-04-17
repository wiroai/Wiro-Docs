# App Store Connect Integration

Connect your agents to App Store Connect for review monitoring, metadata management, and in-app events.

## Overview

The App Store Connect integration uses App Store Connect API keys (key ID + issuer ID + ES256 private key) for server-to-server authentication.

**Skills that use this integration:**

- `appstore-reviews` — Monitor and reply to App Store reviews
- `appstore-metadata` — Read/update app metadata
- `appstore-events` — Create and manage in-app events

**Agents that typically enable this integration:**

- App Review Support
- App Event Manager
- Any custom agent that needs App Store Connect access

## Availability

| Mode | Status | Notes |
|------|--------|-------|
| API key (ES256) | Available | Standard App Store Connect API keys. |

## Prerequisites

- **A Wiro API key** — see [Authentication](/docs/authentication).
- **A deployed agent** — see [Agent Overview](/docs/agent-overview).
- **App Store Connect Admin access** — only Admins can generate API keys.

## Setup

### Step 1: Create an API key

1. Sign in to [App Store Connect](https://appstoreconnect.apple.com/).
2. Go to **Users and Access → Integrations → App Store Connect API**.
3. Click **+** to generate a new key.
4. Name it (e.g. "Wiro agent") and choose an access role. For full capability pick **Admin** or **App Manager**; for reviews-only use **Customer Support** or **Developer**.
5. Download the `.p8` file — you can only download it **once**.
6. Copy the **Key ID** (10 characters, e.g. `ABC1234DEF`) and the **Issuer ID** (UUID at the top of the page).

### Step 2: Base64-encode the private key

```bash
base64 -w 0 AuthKey_ABC1234DEF.p8 > appstore-key.b64
```

(On macOS: `base64 -b 0 AuthKey_ABC1234DEF.p8`.)

### Step 3: Save to Wiro

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
          "appIds": ["6479306352"],
          "supportEmail": "support@yourcompany.com"
        }
      }
    }
  }'
```

### Step 4: Start the agent

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Start" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "guid": "your-useragent-guid" }'
```

## Credential Fields

| Field | Type | Description |
|-------|------|-------------|
| `keyId` | string | 10-character App Store Connect Key ID. |
| `issuerId` | string | UUID issuer ID for your App Store Connect team. |
| `privateKeyBase64` | string | Base64-encoded `.p8` private key file. |
| `appIds` | string[] | Array of App Store IDs the agent is scoped to. |
| `supportEmail` | string | Email used when replying to reviews (App Review Support agent only). |

Some agents use an alternative `apps` shape:

```json
"appstore": {
  "apps": [
    { "appName": "My iOS App", "appId": "6479306352" }
  ]
}
```

Refer to your specific agent's credential schema.

## Troubleshooting

- **401 Unauthorized when signing JWT:** Wrong Key ID or Issuer ID, or base64 encoding mangled the private key. Re-export and re-encode.
- **Key ID "NOT_ENABLED":** The key was revoked. Generate a new one.
- **Reviews not appearing in agent:** Role of the API key lacks Customer Support permissions. Regenerate the key with a role that includes review access.
- **Metadata updates fail:** Role lacks Admin or App Manager permissions for the specific app.

## Related

- [Agent Credentials & OAuth](/docs/agent-credentials)
- [Agent Overview](/docs/agent-overview)
- [Agent Skills](/docs/agent-skills)
- [App Store Connect API docs](https://developer.apple.com/documentation/appstoreconnectapi)
