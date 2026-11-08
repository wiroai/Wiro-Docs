# Firebase Integration

Connect your agent to Firebase Cloud Messaging (FCM) to send targeted push notifications to iOS and Android apps.

## Overview

The Firebase integration uses FCM HTTP v1 with an Admin SDK service account. A single agent can manage notifications for multiple Firebase projects.

**Skills that use this integration:**

- `int-firebase-push`: Send push notifications by topic, device token, or condition

**Agents that typically enable this integration:**

- Push Notification Manager

## Availability

| Mode | Status | Notes |
|------|--------|-------|
| Service account JSON | Available | Admin SDK service account with FCM permissions. |

## Prerequisites

- **A Wiro API key** (see [Authentication](/docs/authentication)).
- **A deployed agent** (see [Agent Overview](/docs/agent-overview)).
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

Send the `accounts` list as one field row. Each account carries its own `apps` and `topics` lists.

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/CredentialUpsert" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "fields": [
      {
        "credentialkey": "firebase",
        "fieldname": "accounts",
        "fieldvalue": [
          {
            "appname": "My App",
            "serviceaccountjson": "eyJ0eXBlIjoic2VydmljZV9hY2NvdW50Ii...",
            "apps": [
              { "platform": "ios", "id": "1234567890" },
              { "platform": "android", "id": "com.example.app" }
            ],
            "topics": [
              { "topickey": "locale_en", "topicdesc": "English users" },
              { "topickey": "tier_paid", "topicdesc": "Paid subscribers" }
            ]
          }
        ]
      }
    ]
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
| `appname` | string | Yes | Display name for this project. |
| `serviceaccountjson` | string | Yes | Base64-encoded service account JSON. |
| `apps` | object[] | Yes | `{ platform: "ios" \| "android", id: string }`, both required. `id` is App Store ID for iOS, package name for Android. |
| `topics` | object[] | Yes | `{ topickey: string, topicdesc?: string }`. `topickey` is a topic you've subscribed clients to on the device side; `topicdesc` is an optional description of its audience. |
| `projectid` | string | **No** (derived from service account) | Read from the decoded JSON. |

### Multi-project setups

Add more entries to `accounts[]` to manage multiple Firebase projects from one agent. Saving `accounts` replaces the stored list, so send every account you want to keep:

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/CredentialUpsert" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "fields": [
      {
        "credentialkey": "firebase",
        "fieldname": "accounts",
        "fieldvalue": [
          {
            "appname": "Consumer App",
            "serviceaccountjson": "eyJ0eXBlIjoic2VydmljZV9hY2NvdW50Ii...",
            "apps": [{ "platform": "ios", "id": "1234567890" }],
            "topics": [{ "topickey": "locale_en", "topicdesc": "English users" }]
          },
          {
            "appname": "Business App",
            "serviceaccountjson": "eyJ0eXBlIjoic2VydmljZV9hY2NvdW50Ii...",
            "apps": [{ "platform": "android", "id": "com.example.business" }],
            "topics": [{ "topickey": "tier_paid", "topicdesc": "Paid subscribers" }]
          }
        ]
      }
    ]
  }'
```

To change one saved account and leave the others as they are, send a row with `parentfield: "accounts"` and that account's position as `ordinal` (from `0`). Send its `apps` or `topics` the same way, each as one row holding the whole new list. This replaces the topics of the second account:

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/CredentialUpsert" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "fields": [
      {
        "credentialkey": "firebase",
        "parentfield": "accounts",
        "ordinal": 1,
        "fieldname": "topics",
        "fieldvalue": [
          { "topickey": "tier_paid", "topicdesc": "Paid subscribers" },
          { "topickey": "tier_trial", "topicdesc": "Trial users" }
        ]
      }
    ]
  }'
```

## Runtime Behavior

The `int-firebase-push` skill is active only when it is enabled and `accounts` is non-empty. For each saved account it uses the project ID from that account's service account, plus the app name, topics and apps you saved.

Auth: FCM HTTP v1 `Authorization: Bearer <token>`, with tokens minted from the account's service account.

Base URL: `https://fcm.googleapis.com/v1/projects/<PROJECT_ID>/messages:send`

## Troubleshooting

- **"invalid JWT signature":** Service account JSON corrupt or truncated. Re-export from Firebase Console and re-encode.
- **No devices receive notifications:** Verify topics are subscribed on the client side and the topic name matches exactly. Check that the topic is listed in that account's `topics`.
- **Rate limits:** FCM supports up to **600,000 messages/minute per project** for HTTP v1 API (see the `int-firebase-push` skill for topic/condition specifics). Higher volumes require a support request to Google Cloud.

## Related

- [Agent Credentials & OAuth](/docs/agent-credentials)
- [Agent Overview](/docs/agent-overview)
- [Agent Skills](/docs/agent-skills)
- [Firebase Cloud Messaging docs](https://firebase.google.com/docs/cloud-messaging)
