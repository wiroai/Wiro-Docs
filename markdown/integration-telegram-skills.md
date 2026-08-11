# Telegram Integration

Connect your agent to a Telegram bot as an optional extra messaging channel.

## Overview

Telegram is **optional** on every Wiro agent. By default your agents already support two built-in messaging channels out of the box:

- **Web chat** — chat with the agent directly from the [wiro.ai dashboard](https://wiro.ai/panel/agents) with no extra setup.
- **Messaging API** — your own application sends and receives messages programmatically via [Agent Messaging](/docs/agent-messaging), with real-time streaming over [Agent WebSocket](/docs/agent-websocket) or HTTP callbacks via [Agent Webhooks](/docs/agent-webhooks).

Adding a Telegram bot gives you a third, complementary channel — useful when you want to:

- Push **operator notifications** (campaign alerts, new leads, error reports) to a private chat or team group on your phone.
- Give **off-dashboard access** to team members who don't log into wiro.ai but still want to message the agent.
- Pipe **scheduled status reports** from cron skills into a shared Telegram channel.

You can skip this integration entirely — agents keep working through web chat
and the API regardless. Telegram activates automatically only after both
`bottoken` and `allowedusers` are configured.

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

### Step 3: Save Telegram credentials on the UserAgent

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/CredentialUpsert" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "fields": [
      {
        "credentialkey": "telegram",
        "fieldname": "bottoken",
        "fieldvalue": "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
      },
      {
        "credentialkey": "telegram",
        "fieldname": "allowedusers",
        "fieldvalue": ["761381461", "987654321"]
      },
      {
        "credentialkey": "telegram",
        "fieldname": "groups",
        "fieldvalue": [
          {
            "chatid": "-1001234567890",
            "allowedusers": ["761381461"]
          }
        ]
      }
    ]
  }'
```

Send `allowedusers` and `groups` as native JSON arrays. `groups` is optional;
omit it when the bot should be usable only in direct messages.

If you are deploying a new agent, place the complete `telegram` group in
`credentials`. Do not send an `enabledchannels` switch or chat-mode field to
`POST /UserAgent/Deploy`; change Chat Mode after deployment when needed.

### Step 4: Verify the applied state

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Detail" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "guid": "your-useragent-guid" }'
```

Confirm that `enabledChannels` contains `"telegram"` and the Telegram row in
`communicationChannels` reports `enabled: true`, `configured: true`, and an
empty `missingfields` array.

## Credential Fields

| Field | Type | Description |
|-------|------|-------------|
| `bottoken` | string | BotFather token (`<bot_id>:<secret>`). |
| `allowedusers` | string[] | Array of Telegram user IDs (numeric strings) allowed to interact. Messages from IDs outside this list are ignored. |
| `groups` | object[] | Optional room allowlist. Each row is `{ "chatid": "-100...", "allowedusers": ["..."] }`. Group/supergroup IDs must be negative numeric strings. |

### Chat Mode

`teamsessionmode` is the agent's single Chat Mode setting, not a Telegram
credential. Set it after deployment with `POST /UserAgent/UpdateSettings`.
The same value also controls team members' Wiro web-chat history.

| Mode | Behavior |
|------|----------|
| `private` | Each allowed direct-message user has an isolated conversation with the agent. Personal deployments and team detachments use this default. |
| `collaborative` | Approved direct-message users share one conversation. Team deployments and transfers use this default. |

Group conversations are always scoped to their own group and do not merge into
the shared direct-message conversation.

## Access Behavior

- Direct messages are accepted only from IDs in the top-level `allowedusers`.
- Group messages are accepted only in configured `groups[].chatid` rooms and
  only from that room's `allowedusers`.
- Group turns must mention the bot.
- Usernames and display names are never accepted as authorization values.
- Telegram is optional. Clear either `bottoken` or `allowedusers` with
  `CredentialUpsert` to disable it; completing both fields reactivates it.

## Troubleshooting

- **Bot doesn't respond:** Verify `bottoken` is correct and the sender's Telegram user ID is in `allowedusers`.
- **"Unauthorized" (401) from Telegram API:** BotFather regenerated the token, invalidating the old one. Create a new token and update.
- **Rate limits:** Telegram bots are limited to ~30 messages/second globally. For burst broadcasts, plan around this.
- **Bot works in DMs but not a group:** Add the negative group chat ID and the sender's immutable user ID to the same `groups[]` row, then mention the bot.
- **Collaborative mode confusion:** Call `UserAgent/UpdateSettings` with `teamsessionmode: "collaborative"`.

## Related

- [Agent Credentials & OAuth](/docs/agent-credentials)
- [Agent Overview](/docs/agent-overview)
- [Agent Skills](/docs/agent-skills)
- [Telegram Bot API docs](https://core.telegram.org/bots/api)
