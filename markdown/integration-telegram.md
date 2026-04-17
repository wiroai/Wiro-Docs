# Telegram Integration

Connect your agents to a Telegram bot for two-way messaging with end users.

## Overview

The Telegram integration lets an agent communicate with operators or end users through a Telegram bot — useful for operator notifications, interactive support, or as the primary user channel for the agent.

**Used by:** Most Wiro agents support Telegram as an operator notification channel. Some agents use it as the primary user interface.

## Availability

| Mode | Status | Notes |
|------|--------|-------|
| API key (Bot Token) | Available | Single Bot Token from BotFather. |

## Prerequisites

- **A Wiro API key** — see [Authentication](/docs/authentication).
- **A deployed agent** — see [Agent Overview](/docs/agent-overview).
- **A Telegram account**.

## Setup

### Step 1: Create a Telegram bot

1. Open Telegram and start a chat with [@BotFather](https://t.me/BotFather).
2. Send `/newbot`.
3. Choose a display name and a username (must end in `bot`, e.g. `@mycompany_agent_bot`).
4. BotFather returns a **Bot Token** like `123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11`. Copy it.

### Step 2: Find the Telegram user IDs of allowed users

1. Each person who should be able to chat with the agent sends a message to the bot first.
2. Open `https://api.telegram.org/bot<BOT_TOKEN>/getUpdates` in a browser (replace `<BOT_TOKEN>`).
3. Find the `from.id` of each user — these are the numeric Telegram user IDs.

### Step 3: Save to Wiro

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Update" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "guid": "your-useragent-guid",
    "configuration": {
      "credentials": {
        "telegram": {
          "botToken": "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11",
          "allowedUsers": ["761381461", "987654321"],
          "sessionMode": [
            { "value": "private", "text": "Private — each user has their own conversation", "selected": true },
            { "value": "collaborative", "text": "Collaborative — all users share the same conversation", "selected": false }
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
| `botToken` | string | BotFather token. |
| `allowedUsers` | string[] | Array of Telegram user IDs allowed to interact. Others are ignored. |
| `sessionMode` | object[] | Session selection — Private (default) or Collaborative. Set one to `selected: true`. |

## Session Modes

- **Private** — each allowed user has an isolated conversation with the agent. Messages from user A are never visible to user B.
- **Collaborative** — all allowed users share one conversation. Any user can see and respond to any message. Useful for team coordination.

## Troubleshooting

- **Bot does not respond:** Verify the Bot Token is correct and the user's Telegram ID is in `allowedUsers`.
- **"Unauthorized" error:** Bot Token was regenerated in BotFather and the old one was invalidated. Create a new token and update.
- **Rate limits:** Telegram bots are limited to ~30 messages per second across all chats. Plan around burst limits for broadcasts.

## Related

- [Agent Credentials & OAuth](/docs/agent-credentials)
- [Agent Overview](/docs/agent-overview)
- [Agent Skills](/docs/agent-skills)
- [Telegram Bot API docs](https://core.telegram.org/bots/api)
