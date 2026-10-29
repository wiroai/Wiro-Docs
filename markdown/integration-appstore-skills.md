# App Store Connect Integration

Connect your agent to App Store Connect for review monitoring, metadata management, and in-app events.

## Overview

The App Store Connect integration uses ES256-signed JWT authentication with App Store Connect API keys.

**Skills that use this integration:**

- `int-appstore-reviews`: Monitor and reply to App Store reviews
- `int-appstore-metadata`: Read/update app metadata, localizations, screenshots
- `int-appstore-events`: Create and manage in-app events

**Agents that typically enable this integration:**

- App Review Support
- App Event Manager
- Meta Ads Manager (uses a simpler `apps` array shape, see below)
- TikTok Ads Manager (uses a simpler `apps` array shape, see below)

## Availability

| Mode | Status | Notes |
|------|--------|-------|
| ES256 API Key | Available | Standard App Store Connect API keys. |

## Prerequisites

- **A Wiro API key** (see [Authentication](/docs/authentication)).
- **A deployed agent** (see [Agent Overview](/docs/agent-overview)).
- **App Store Connect Admin access**: only Admins can generate API keys.

## Setup

### Step 1: Create an API key

1. Sign in to [App Store Connect](https://appstoreconnect.apple.com/).
2. **Users and Access → Integrations → App Store Connect API**.
3. Click **+** to generate a new key.
4. Name (e.g. "Wiro agent") and role:
   - **Admin** or **App Manager** for full capability
   - **Customer Support** for reviews-only
5. Download the `.p8` file. It is **only downloadable once**.
6. Copy the **Key ID** (10-char like `ABC1234DEF`) and **Issuer ID** (UUID at top).

### Step 2: Base64-encode the private key

```bash
# Linux
base64 -w 0 AuthKey_ABC1234DEF.p8 > appstore-key.b64

# macOS
base64 -b 0 AuthKey_ABC1234DEF.p8 > appstore-key.b64
```

### Step 3: Save to Wiro

The credential depends on which agent you're configuring. Review, events and metadata agents use `apple-appstore`: the API key (`keyid`, `issuerid`, `privatekey`) plus a positional `apps[]` array. Each app entry carries `appname` + `appid`. Ads-manager agents need no API key: they read the app list for attribution context from the separate `apple-appstore-apps` credential, which holds only the `apps[]` array. Send the same `apps` rows with `"credentialkey": "apple-appstore-apps"`.

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

For multiple App Store IDs, append more `apps`-prefixed ordinal rows. Positional merge applies: sending no `apps` rows leaves the existing list untouched; to clear the list, send `{ "credentialkey": "apple-appstore", "fieldname": "apps", "fieldvalue": [] }`.

Reply skills can also use a global support email. It is optional: without it, reply drafts leave out the contact line. Set it once via the dedicated `var-support-email` credential (shared across `int-appstore-reviews` and `int-googleplay-reviews`):

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/CredentialUpsert" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "fields": [
      { "credentialkey": "var-support-email", "fieldname": "value", "fieldvalue": "support@yourcompany.com" }
    ]
  }'
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `keyid` | string | Yes (review/events/metadata) | 10-character App Store Connect Key ID. |
| `issuerid` | string | Yes (review/events/metadata) | UUID issuer ID. |
| `privatekey` | string | Yes (review/events/metadata) | Base64-encoded `.p8` private key. Stored encrypted-at-rest in the DB (`type: fileinput-base64`). |
| `apps[].appname` | string | Yes | Human-readable label the agent uses when reporting back ("scanned reviews on My iOS App"). |
| `apps[].appid` | string | Yes | Numeric App Store ID. |
| `var-support-email.value` | string | No | Global support email: surfaced when reviewers are pointed to direct contact. Lives on the dedicated `var-support-email` credential, not on `apple-appstore`. |

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
