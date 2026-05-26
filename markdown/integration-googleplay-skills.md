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
6. Note the service account email from the account details page — format: `wiro-play-agent@YOUR-PROJECT.iam.gserviceaccount.com`.

> **Tip:** In **[My Agents](https://wiro.ai/panel/agents)** → open your agent → **Credentials**, upload the JSON and your service account email will appear with a **Copy** button.

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

All Google Play agents share the **same credential shape**: service account JSON + `apps[]` array. Each app entry carries `appname` + `packagename`.

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/CredentialUpsert" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "fields": [
      { "credentialkey": "google-play", "fieldname": "serviceaccountjson", "fieldvalue": "eyJ0eXBlIjoic2VydmljZV9hY2NvdW50Ii..." },
      { "credentialkey": "google-play", "parentfield": "apps", "ordinal": 0, "fieldname": "appname",     "fieldvalue": "My Android App" },
      { "credentialkey": "google-play", "parentfield": "apps", "ordinal": 0, "fieldname": "packagename", "fieldvalue": "com.example.app" },
      { "credentialkey": "google-play", "parentfield": "apps", "ordinal": 1, "fieldname": "appname",     "fieldvalue": "My Other App" },
      { "credentialkey": "google-play", "parentfield": "apps", "ordinal": 1, "fieldname": "packagename", "fieldvalue": "com.example.other" }
    ]
  }'
```

For multiple apps, append more `apps`-prefixed ordinal rows. Positional merge applies — sending no `apps` rows leaves the existing list untouched; to clear, send a single ordinal-0 row with `fieldname: "appname"` and `fieldvalue: ""`.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `serviceaccountjson` | string | Yes | Base64-encoded service account JSON. Stored encrypted-at-rest in the DB (`type: fileinput-base64`). |
| `apps[].appname` | string | Yes | Human-readable label the agent uses when reporting back ("scanned reviews on My Android App"). |
| `apps[].packagename` | string | Yes | Android package name (e.g. `com.example.app`). |

### Step 6: Start the agent

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Start" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "guid": "your-useragent-guid" }'
```

## Auth at runtime

Wiro mints an OAuth access token from the service account JSON on demand and calls Google Play at `https://androidpublisher.googleapis.com/androidpublisher/v3/...` with `Authorization: Bearer <TOKEN>`. The `apps[]` list scopes which package names the agent operates on.

## Troubleshooting

- **403 "The caller does not have permission":** Service account is in Google Cloud but hasn't been invited in Play Console, or lacks the required permission. Return to **Play Console → Users and permissions** and adjust.
- **"Invalid JWT token":** Service account JSON corrupt or truncated. Re-encode.
- **Review reply fails silently:** Some reviews are >1 year old and can't be replied to via API — Google enforces this at the platform level.

## Related

- [Agent Credentials & OAuth](/docs/agent-credentials)
- [Agent Overview](/docs/agent-overview)
- [Agent Skills](/docs/agent-skills)
- [Google Play Developer API docs](https://developers.google.com/android-publisher)
