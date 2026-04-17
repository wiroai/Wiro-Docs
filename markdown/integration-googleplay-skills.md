# Google Play Integration

Connect your agent to the Google Play Developer API for review monitoring and app listing management.

## Overview

The Google Play integration uses a Google Cloud service account with API access delegated from a Play Console project.

**Skills that use this integration:**

- `googleplay-reviews` — Monitor and reply to Google Play reviews
- `googleplay-metadata` — Read/update app listings and metadata

**Agents that typically enable this integration:**

- App Review Support
- Meta Ads Manager (uses the simpler `apps` array shape)

## Availability

| Mode | Status | Notes |
|------|--------|-------|
| Service Account JSON | Available | Google Cloud service account with Play Developer Reporting access. |

## Prerequisites

- **A Wiro API key** — [Authentication](/docs/authentication).
- **A deployed agent** — [Agent Overview](/docs/agent-overview).
- **A Google Play Console** account with **Admin** access.
- **A Google Cloud project** to host the service account.

## Setup

### Step 1: Enable the Google Play Android Developer API

[Google Cloud Console](https://console.cloud.google.com/) → select project → **APIs & Services → Library** → **Google Play Android Developer API** → **Enable**.

### Step 2: Create a service account

1. **IAM & Admin → Service accounts → Create service account**.
2. Name (e.g. "wiro-play-agent").
3. Grant role: `Service Account Token Creator`.
4. Skip user permissions → **Done**.
5. Open the service account → **Keys → Add key → Create new key → JSON**. Download.

### Step 3: Link the service account to Play Console

1. [Google Play Console](https://play.google.com/console) → **Users and permissions → Invite new users**.
2. Email: the service account email (`...@....iam.gserviceaccount.com`).
3. Grant at least: **View app information**, **Reply to reviews**, and any others needed by your agent.
4. Send invite — Play Console auto-accepts for service accounts.

### Step 4: Base64-encode the JSON

```bash
# Linux
base64 -w 0 play-service-account.json > play-sa.b64

# macOS
base64 -b 0 play-service-account.json > play-sa.b64
```

### Step 5: Save to Wiro

Same two-shape approach as App Store Connect.

#### Shape A: Flat (reviews/metadata agents)

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

| Field | Type | Description |
|-------|------|-------------|
| `serviceAccountJsonBase64` | string | Base64-encoded JSON. |
| `packageNames` | string[] | Android package names the agent is scoped to. |
| `supportEmail` | string | Used when replying to reviews. |

#### Shape B: `apps` array (ads-manager agents)

```json
{
  "credentials": {
    "googleplay": {
      "apps": [
        { "appName": "My Android App", "packageName": "com.example.app" }
      ]
    }
  }
}
```

### Step 6: Start the agent

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Start" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "guid": "your-useragent-guid" }'
```

## Runtime Behavior

Env vars exported **only when `googleplay-reviews` skill is enabled** (not metadata alone):

- `GOOGLE_PLAY_PACKAGE_NAMES` ← `packageNames.join(",")`

Secret file:

- `/run/secrets/gplay-sa.json` — decoded service account (file, not env)

Auth: OAuth access token minted from the service account → `Authorization: Bearer`.
Base URL: `https://androidpublisher.googleapis.com/androidpublisher/v3/...`.

For ads agents (Shape B): `apps` serialized into `GADS_GPLAY_APPS` or `METAADS_GPLAY_APPS` env vars as JSON.

## Troubleshooting

- **403 "The caller does not have permission":** Service account is in Google Cloud but hasn't been invited in Play Console, or lacks the required permission. Return to **Play Console → Users and permissions** and adjust.
- **"Invalid JWT token":** Service account JSON corrupt or truncated. Re-encode.
- **Review reply fails silently:** Some reviews are >1 year old and can't be replied to via API — Google enforces this at the platform level.

## Related

- [Agent Credentials & OAuth](/docs/agent-credentials)
- [Agent Overview](/docs/agent-overview)
- [Agent Skills](/docs/agent-skills)
- [Google Play Developer API docs](https://developers.google.com/android-publisher)
