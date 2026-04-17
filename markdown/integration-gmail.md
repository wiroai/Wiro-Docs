# Gmail Integration

Connect your agents to a Gmail inbox using an App Password for IMAP/SMTP-based access.

## Overview

The Gmail integration lets an agent monitor an inbox (for example, reading incoming support emails) and send messages via SMTP. Authentication uses a Google **App Password** tied to the agent's Gmail account.

**Skills that use this integration:**

- `gmail-check` — Monitor an inbox, parse incoming messages, trigger actions
- Used by `newsletter-compose` and other skills that send or receive mail

**Agents that typically enable this integration:**

- Blog Content Editor
- Newsletter Manager (test sends)
- Support / App Review agents

## Availability

| Mode | Status | Notes |
|------|--------|-------|
| API key (App Password) | Available | Works on any Gmail account with 2-Step Verification enabled. |

## Prerequisites

- **A Wiro API key** — see [Authentication](/docs/authentication).
- **A deployed agent** — see [Agent Overview](/docs/agent-overview).
- **A Gmail account** with **2-Step Verification** enabled.

## Setup

### Step 1: Enable 2-Step Verification

1. Sign in to the Google account.
2. Go to [myaccount.google.com/security](https://myaccount.google.com/security).
3. Under **How you sign in to Google**, turn on **2-Step Verification**.

### Step 2: Create an App Password

1. After 2-Step Verification is on, the same Security page shows **App passwords**.
2. Create a new app password — label it "Wiro agent" or similar.
3. Google shows a 16-character password in the format `xxxx xxxx xxxx xxxx`. Copy it immediately.

### Step 3: Save to Wiro

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Update" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "guid": "your-useragent-guid",
    "configuration": {
      "credentials": {
        "gmail": {
          "account": "agent@yourcompany.com",
          "appPassword": "xxxx xxxx xxxx xxxx"
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
| `account` | string | Full Gmail address (e.g. `agent@company.com`). |
| `appPassword` | string | 16-character Google App Password. Spaces are allowed. |

## Troubleshooting

- **"Invalid credentials" when the agent tries to read mail:** The App Password is wrong, or 2-Step Verification was turned off (which invalidates all App Passwords). Re-create.
- **Agent cannot read messages older than 30 days:** IMAP default folder selection limits may apply. Move the agent's read scope to "All Mail" or adjust folder config in the skill settings.
- **Messages blocked by Google:** Less Secure Apps is no longer supported; App Password is the only path for IMAP/SMTP as of 2022.

## Related

- [Agent Credentials & OAuth](/docs/agent-credentials)
- [Agent Overview](/docs/agent-overview)
- [Agent Skills](/docs/agent-skills)
- [Google App Passwords help](https://support.google.com/accounts/answer/185833)
