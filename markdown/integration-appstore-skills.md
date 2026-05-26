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

All App Store Connect agents share the **same credential shape**: API key + `apps[]` array. Each app entry carries `appname` + `appid`. Review/events/metadata agents need the API key to call App Store Connect; ads-manager agents only consume `apps[]` for attribution context. The agent skin decides which subset is used at runtime.

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/CredentialUpsert" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "fields": [
      { "credentialkey": "apple-appstore", "fieldname": "keyid",      "fieldvalue": "ABC1234DEF" },
      { "credentialkey": "apple-appstore", "fieldname": "issuerid",   "fieldvalue": "12345678-1234-1234-1234-123456789012" },
      { "credentialkey": "apple-appstore", "fieldname": "privatekey", "fieldvalue": "LS0tLS1CRUdJTi..." },
      { "credentialkey": "apple-appstore", "parentfield": "apps", "ordinal": 0, "fieldname": "appname", "fieldvalue": "My iOS App" },
      { "credentialkey": "apple-appstore", "parentfield": "apps", "ordinal": 0, "fieldname": "appid",   "fieldvalue": "6479306352" },
      { "credentialkey": "apple-appstore", "parentfield": "apps", "ordinal": 1, "fieldname": "appname", "fieldvalue": "My Other App" },
      { "credentialkey": "apple-appstore", "parentfield": "apps", "ordinal": 1, "fieldname": "appid",   "fieldvalue": "1234567890" }
    ]
  }'
```

For multiple App Store IDs, append more `apps`-prefixed ordinal rows. Positional merge applies — sending no `apps` rows leaves the existing list untouched; to clear, send a single ordinal-0 row with `fieldname: "appname"` and `fieldvalue: ""`.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `keyid` | string | Yes (review/events/metadata) | 10-character App Store Connect Key ID. |
| `issuerid` | string | Yes (review/events/metadata) | UUID issuer ID. |
| `privatekey` | string | Yes (review/events/metadata) | Base64-encoded `.p8` private key. Stored encrypted-at-rest in the DB (`type: fileinput-base64`). |
| `apps[].appname` | string | Yes | Human-readable label the agent uses when reporting back ("scanned reviews on My iOS App"). |
| `apps[].appid` | string | Yes | Numeric App Store ID. |

### Step 4: Start the agent

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Start" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "guid": "your-useragent-guid" }'
```

## Auth at runtime

Wiro signs an ES256 JWT from `keyid` + `issuerid` + `privatekey` and calls App Store Connect at `https://api.appstoreconnect.apple.com/v1/...` with `Authorization: Bearer <TOKEN>`. Ads-manager agents (Meta Ads Manager / Google Ads Manager) consume the `apps[]` list for attribution context and do not need the API key fields filled.

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
