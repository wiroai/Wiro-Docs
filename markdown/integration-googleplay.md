# Google Play Integration

Connect your agents to the Google Play Developer API for review monitoring and app listing management.

## Overview

The Google Play integration uses a Google Cloud service account with API access delegated from a Play Console project.

**Skills that use this integration:**

- `googleplay-reviews` — Monitor and reply to Google Play reviews
- `googleplay-metadata` — Read/update app listings and metadata

**Agents that typically enable this integration:**

- App Review Support
- Any custom agent that needs Play Console access

## Availability

| Mode | Status | Notes |
|------|--------|-------|
| Service account JSON | Available | Google Cloud service account with Play Developer Reporting permissions. |

## Prerequisites

- **A Wiro API key** — see [Authentication](/docs/authentication).
- **A deployed agent** — see [Agent Overview](/docs/agent-overview).
- **A Google Play Console** account with **Admin** access.
- **A Google Cloud project** to host the service account.

## Setup

### Step 1: Enable the Google Play Android Developer API

1. In [Google Cloud Console](https://console.cloud.google.com/), select (or create) a project.
2. **APIs & Services → Library** → search **Google Play Android Developer API** → **Enable**.

### Step 2: Create a service account

1. **IAM & Admin → Service accounts → Create service account**.
2. Name it (e.g. "wiro-play-agent").
3. Grant role: `Service Account Token Creator` is sufficient for signing.
4. Skip user permissions; **Done**.
5. Open the service account → **Keys → Add key → Create new key → JSON**. Download.

### Step 3: Link the service account to Play Console

1. In [Google Play Console](https://play.google.com/console), go to **Users and permissions → Invite new users**.
2. Use the service account email (`...@....iam.gserviceaccount.com`).
3. Grant at least: **View app information**, **Reply to reviews**, and any other permission your agent needs.
4. Send invite — Play Console auto-accepts for service accounts.

### Step 4: Base64-encode the JSON

```bash
base64 -w 0 play-service-account.json > play-sa.b64
```

(On macOS: `base64 -b 0 play-service-account.json`.)

### Step 5: Save to Wiro

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Update" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "guid": "your-useragent-guid",
    "configuration": {
      "credentials": {
        "googleplay": {
          "serviceAccountJsonBase64": "eyJ0eXBlIjoic2VydmljZV9hY2NvdW50Ii...",
          "packageNames": ["com.example.app"],
          "supportEmail": "support@yourcompany.com"
        }
      }
    }
  }'
```

### Step 6: Start the agent

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Start" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "guid": "your-useragent-guid" }'
```

## Credential Fields

| Field | Type | Description |
|-------|------|-------------|
| `serviceAccountJsonBase64` | string | Base64-encoded service account JSON. |
| `packageNames` | string[] | Array of Android package names the agent is scoped to. |
| `supportEmail` | string | Email used when replying to reviews (App Review Support only). |

Ads-agent variants use an alternative `apps` shape:

```json
"googleplay": {
  "apps": [
    { "appName": "My Android App", "packageName": "com.example.app" }
  ]
}
```

## Troubleshooting

- **403 "The caller does not have permission":** Service account is enabled but not invited in Play Console, or missing the required role. Return to Play Console → Users and permissions and adjust.
- **"Invalid JWT token":** Service account JSON is corrupt or truncated. Re-encode.
- **Review reply fails silently:** Some reviews are too old (>1 year) and cannot be replied to via API; Google enforces this at the platform level.

## Related

- [Agent Credentials & OAuth](/docs/agent-credentials)
- [Agent Overview](/docs/agent-overview)
- [Agent Skills](/docs/agent-skills)
- [Google Play Developer API docs](https://developers.google.com/android-publisher)
