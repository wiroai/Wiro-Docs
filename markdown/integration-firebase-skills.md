# Firebase Integration

Connect your agent to Firebase Cloud Messaging (FCM) to send targeted push notifications to iOS and Android apps.

## Overview

The Firebase integration uses FCM HTTP v1 with an Admin SDK service account. A single agent can manage notifications for multiple Firebase projects.

**Skills that use this integration:**

- `firebase-push` — Send push notifications by topic, device token, or condition

**Agents that typically enable this integration:**

- Push Notification Manager

## Availability

| Mode | Status | Notes |
|------|--------|-------|
| Service account JSON | Available | Admin SDK service account with FCM permissions. |

## Prerequisites

- **A Wiro API key** — [Authentication](/docs/authentication).
- **A deployed agent** — [Agent Overview](/docs/agent-overview).
- **A Firebase project** with your iOS and/or Android apps registered and FCM enabled.

## Setup

### Step 1: Generate a Firebase Admin SDK service account

1. [console.firebase.google.com](https://console.firebase.google.com/) → select project.
2. **Project settings → Service accounts → Firebase Admin SDK → Generate new private key**.
3. Save the JSON file.

### Step 2: Base64-encode the JSON

```bash
# Linux
base64 -w 0 firebase-service-account.json > firebase-sa.b64

# macOS
base64 -b 0 firebase-service-account.json > firebase-sa.b64
```

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
              "topics": [
                { "topicKey": "locale_en", "topicDesc": "English users" },
                { "topicKey": "tier_paid", "topicDesc": "Paid subscribers" }
              ]
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

`credentials.firebase.accounts[]` is an array. Each account object:

| Field | Type | Editable | Description |
|-------|------|----------|-------------|
| `appName` | string | Yes | Display name for this project. |
| `serviceAccountJsonBase64` | string | Yes | Base64-encoded service account JSON. |
| `apps` | object[] | Yes | `{ platform: "ios" \| "android", id: string }`. `id` is App Store ID for iOS, package name for Android. |
| `topics` | object[] | Yes | `{ topicKey, topicDesc }`. Topics you've subscribed clients to on the device side. |
| `projectId` | string | **No** (derived from service account) | Read from the decoded JSON. |

### Multi-project setups

Add more entries to `accounts[]` to manage multiple Firebase projects from one agent:

```json
{
  "credentials": {
    "firebase": {
      "accounts": [
        { "appName": "Consumer App", "serviceAccountJsonBase64": "...", "apps": [...], "topics": [...] },
        { "appName": "Business App", "serviceAccountJsonBase64": "...", "apps": [...], "topics": [...] }
      ]
    }
  }
}
```

Wiro's merge logic uses positional indexes — sending `accounts[2]` while the template has 1 account creates a new account entry cloned from the template shape, populated with your editable fields.

## Runtime Behavior

Env vars per account index `idx`:

- `FIREBASE_APP_COUNT` — total accounts
- `FIREBASE_{idx}_PROJECT_ID` — from decoded service account JSON
- `FIREBASE_{idx}_APP_NAME`
- `FIREBASE_{idx}_TOPICS` — JSON map of `{ topicKey: topicDesc }`
- `FIREBASE_{idx}_APPS` — JSON array of `{ platform, id }`

Secret files:

- `/run/secrets/firebase-sa-{idx}.json` — decoded service account (not exposed as env)

Auth: FCM HTTP v1 `Authorization: Bearer <token>` — tokens minted from the service account.

Base URL: `https://fcm.googleapis.com/v1/projects/<PROJECT_ID>/messages:send`

## Troubleshooting

- **"invalid JWT signature":** Service account JSON corrupt or truncated. Re-export from Firebase Console and re-encode.
- **No devices receive notifications:** Verify topics are subscribed on the client side and the topic name matches exactly. Check `FIREBASE_{idx}_TOPICS` logs.
- **Rate limits:** FCM defaults to ~1,800 messages/min per project. Contact Google Cloud support to raise for broadcast use cases.

## Related

- [Agent Credentials & OAuth](/docs/agent-credentials)
- [Agent Overview](/docs/agent-overview)
- [Agent Skills](/docs/agent-skills)
- [Firebase Cloud Messaging docs](https://firebase.google.com/docs/cloud-messaging)
