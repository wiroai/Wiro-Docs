# Firebase Integration

Connect your agents to Firebase Cloud Messaging (FCM) to send targeted push notifications to iOS and Android apps.

## Overview

The Firebase integration lets an agent send push notifications through FCM using a Firebase Admin SDK service account.

**Skills that use this integration:**

- `firebase-push` — Send push notifications by topic, token, or targeted audience

**Agents that typically enable this integration:**

- Push Notification Manager

## Availability

| Mode | Status | Notes |
|------|--------|-------|
| Service account JSON | Available | Standard Firebase Admin SDK credentials. |

## Prerequisites

- **A Wiro API key** — see [Authentication](/docs/authentication).
- **A deployed agent** — see [Agent Overview](/docs/agent-overview).
- **A Firebase project** with your iOS and/or Android apps registered and FCM configured.

## Setup

### Step 1: Generate a Firebase Admin SDK service account

1. Go to [console.firebase.google.com](https://console.firebase.google.com/) and select your project.
2. **Project settings → Service accounts → Firebase Admin SDK → Generate new private key**.
3. Save the downloaded JSON file. Treat it like a password.

### Step 2: Base64-encode the JSON

```bash
base64 -w 0 firebase-service-account.json > firebase-sa.b64
```

(On macOS, `base64 -b 0 firebase-service-account.json`.)

### Step 3: Save to Wiro

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Update" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "guid": "your-useragent-guid",
    "configuration": {
      "credentials": {
        "firebase": {
          "accounts": [
            {
              "appName": "My App",
              "serviceAccountJsonBase64": "eyJ0eXBlIjoic2VydmljZV9hY2NvdW50Ii...",
              "apps": [
                { "platform": "ios", "id": "6479306352" },
                { "platform": "android", "id": "com.example.app" }
              ],
              "topics": {
                "locale_en": "English users",
                "tier_paid": "Paid subscribers"
              }
            }
          ]
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
| `accounts` | object[] | Array of Firebase projects you want to send notifications for. |
| `accounts[].appName` | string | Display name for this project. |
| `accounts[].serviceAccountJsonBase64` | string | Base64-encoded service account JSON. |
| `accounts[].apps` | object[] | `{ platform: "ios" \| "android", id: string }`. `id` is App Store ID for iOS, package name for Android. |
| `accounts[].topics` | object | FCM topic key → human description. Topics you have already set up on the client side. |

Multiple `accounts` entries let one agent push to several Firebase projects (useful if you manage a portfolio of apps).

## Troubleshooting

- **"invalid JWT signature":** Service account JSON is corrupt or truncated. Re-export from Firebase Console and re-encode.
- **No devices receive notifications:** Verify topics are subscribed client-side and the topic name matches exactly.
- **Rate limits:** FCM limits ~1,800 messages/min per project by default. Contact Google for higher limits on broadcast use cases.

## Related

- [Agent Credentials & OAuth](/docs/agent-credentials)
- [Agent Overview](/docs/agent-overview)
- [Agent Skills](/docs/agent-skills)
- [Firebase Cloud Messaging docs](https://firebase.google.com/docs/cloud-messaging)
