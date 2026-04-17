# Gmail Integration

Connect your agent to a Gmail inbox using a Google App Password for IMAP access.

## Overview

The Gmail integration uses IMAP with Basic authentication backed by a Google App Password. Agents can monitor the inbox, parse incoming messages, and trigger actions.

**Skills that use this integration:**

- `gmail-check` — Poll Gmail inbox on a schedule, parse messages, route to actions

**Agents that typically enable this integration:**

- Blog Content Editor (inbox-triggered workflows)
- Newsletter Manager (test sends)
- Support / App Review agents (operator notifications)

## Availability

| Mode | Status | Notes |
|------|--------|-------|
| App Password | Available | Works on any Gmail account with 2-Step Verification enabled. |

## Prerequisites

- **A Wiro API key** — [Authentication](/docs/authentication).
- **A deployed agent** — [Agent Overview](/docs/agent-overview).
- **A Gmail account** with **2-Step Verification** enabled.

## Setup

### Step 1: Enable 2-Step Verification

1. Sign in to the Google account.
2. [myaccount.google.com/security](https://myaccount.google.com/security).
3. Under **How you sign in to Google**, turn on **2-Step Verification**.

### Step 2: Create an App Password

1. Same Security page → **App passwords** (appears once 2-Step Verification is on).
2. Create a new App Password, label it "Wiro agent".
3. Copy the 16-character password (format: `xxxx xxxx xxxx xxxx`). Spaces are cosmetic — Wiro accepts either form.

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

Only `account` and `appPassword` are editable. The agent template also has `interval` (cron expression for polling frequency) but it's `_editable: false` by default — Wiro's team sets it based on the agent's needs. If your agent needs a custom cadence, contact support.

### Step 4: Start the agent

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Start" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "guid": "your-useragent-guid" }'
```

## Credential Fields

| Field | Type | Editable | Description |
|-------|------|----------|-------------|
| `account` | string | Yes | Full Gmail address (e.g. `agent@company.com`). |
| `appPassword` | string | Yes | 16-character Google App Password. Spaces allowed. |
| `interval` | cron string | **No** (template-controlled) | Polling frequency. Example: `*/8 * * * *` (every 8 minutes). |

## Runtime Behavior

The `gmail-check` skill uses IMAP:

- Host: `imaps://imap.gmail.com:993/INBOX`
- Auth: `--user "$GMAIL_ACCOUNT:$GMAIL_APP_PASSWORD"` (Basic-style)
- Polls on the configured `interval`, processes new messages per agent rules

Env vars inside the agent container:

- `GMAIL_ACCOUNT` ← `credentials.gmail.account`
- `GMAIL_APP_PASSWORD` ← `credentials.gmail.appPassword`

## Troubleshooting

- **"Invalid credentials" when IMAP connects:** Wrong App Password, or 2-Step Verification was turned off (which invalidates all App Passwords). Regenerate.
- **Agent can't see messages older than ~30 days:** IMAP folder defaults. For broader scope, your agent may need to switch to "All Mail" — ask support.
- **"Less Secure Apps" mentioned anywhere:** Google removed that option in 2022. App Password is the only supported path for IMAP/SMTP.

## Related

- [Agent Credentials & OAuth](/docs/agent-credentials)
- [Agent Overview](/docs/agent-overview)
- [Agent Skills](/docs/agent-skills)
- [Google App Passwords help](https://support.google.com/accounts/answer/185833)
