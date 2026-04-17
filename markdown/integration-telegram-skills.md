# Telegram Integration

Connect your agent to a Telegram bot for two-way messaging with operators or end users.

## Overview

Telegram is unique among Wiro integrations — it's always available (no skill toggle required) and is used both as an operator notification channel and, for some agents, as the primary user interface.

**Agents that use Telegram:** Nearly all Wiro agents accept a Telegram bot for operator notifications. Some (e.g. Lead Gen Manager for status reports) use it as the main interaction channel.

## Availability

| Mode | Status | Notes |
|------|--------|-------|
| Bot Token | Available | Single Bot Token from BotFather. |

## Prerequisites

- **A Wiro API key** — [Authentication](/docs/authentication).
- **A deployed agent** — [Agent Overview](/docs/agent-overview).
- **A Telegram account**.

## Setup

### Step 1: Create a Telegram bot

1. In Telegram, start a chat with [@BotFather](https://t.me/BotFather).
2. Send `/newbot`.
3. Choose a display name and a username (must end in `bot`, e.g. `@mycompany_agent_bot`).
4. BotFather returns a **Bot Token** like `123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11`. Copy it.

### Step 2: Collect allowed user IDs

Each allowed user must message the bot first.

1. User sends any message to the bot.
2. Open `https://api.telegram.org/bot<BOT_TOKEN>/getUpdates` in a browser.
3. Find the `message.from.id` value in the response — that's the Telegram user ID (numeric).

Alternative: each user can DM [@userinfobot](https://t.me/userinfobot) in Telegram to get their own ID.

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
| `botToken` | string | BotFather token (`<bot_id>:<secret>`). |
| `allowedUsers` | string[] | Array of Telegram user IDs (numeric strings) allowed to interact. Messages from IDs outside this list are ignored. |
| `sessionMode` | object[] \| string | Session selection. See below. |

### sessionMode format

`sessionMode` is an **array of option objects**, with exactly one having `selected: true`:

```json
[
  { "value": "private", "text": "Private — each user has their own conversation", "selected": true },
  { "value": "collaborative", "text": "Collaborative — all users share the same conversation", "selected": false }
]
```

This matches Wiro's dropdown format. A simpler string form is also accepted at the backend (`"private"` or `"collaborative"`) but the array form is what the dashboard UI produces.

| Mode | Behavior |
|------|----------|
| `private` (default) | Each allowed user has an isolated conversation with the agent. Messages from user A are never visible to user B. Maps internally to `session.dmScope = "per-channel-peer"`. |
| `collaborative` | All allowed users share one conversation. Any user sees and can respond to any message. Maps to `session.dmScope = "main"`. |

## Runtime Behavior

Env vars inside the agent container:

- `TELEGRAM_BOT_TOKEN` ← `credentials.telegram.botToken`
- `GATEWAY_TOKEN` ← internal gateway token
- `allowedUsers` is rendered into the agent's runtime config as a comma-separated allow-list

The Telegram integration plugin inside the agent is **disabled automatically** if `allowedUsers` is empty or `botToken` is missing — no messages flow.

## Troubleshooting

- **Bot doesn't respond:** Verify `botToken` is correct and the sender's Telegram user ID is in `allowedUsers`.
- **"Unauthorized" (401) from Telegram API:** BotFather regenerated the token, invalidating the old one. Create a new token and update.
- **Rate limits:** Telegram bots are limited to ~30 messages/second globally. For burst broadcasts, plan around this.
- **Collaborative mode confusion:** If users don't see each other's messages, re-save `sessionMode` with `collaborative` as `selected: true` and restart the agent.

## Related

- [Agent Credentials & OAuth](/docs/agent-credentials)
- [Agent Overview](/docs/agent-overview)
- [Agent Skills](/docs/agent-skills)
- [Telegram Bot API docs](https://core.telegram.org/bots/api)
