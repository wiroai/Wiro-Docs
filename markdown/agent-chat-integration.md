# Agent Chat Integration

Build your own chat for a Wiro agent, setup from chat included: every call, every answer field, and what your interface shows at each step.

## Overview

This guide is for products that put a Wiro agent behind their own interface. Your users talk to the agent in your app. Your backend calls the API with your project API key, and your app shows the agent's answers, its setup cards and the connect steps with your own design. Your users never leave your product.

It covers the whole cycle in order: sending messages and showing answers, the setup cards the agent proposes, applying them, connecting each kind of connector, restarts, errors, chats without cards, security, four worked examples and a checklist. Every request and answer is shown as JSON, so the guide can also be handed to a coding assistant that builds the integration for you.

### What setup from chat is

An agent can help the people who manage it set it up in the chat. Asked to post on Facebook, report website traffic every Monday or search the web, it can propose the change itself: turn on a connector or skill, connect a connector, create or change a scheduled task or a custom skill, or change its time zone.

The agent never changes its own setup and never sees a key. It proposes the change as a **setup card**. Wiro checks the card against the agent's current setup and stores it on the message that asked for it, where it shows as a `setup` block in that message's `timeline[]`. Nothing changes until an agent admin applies the card. Wiro then applies the stored card, checked again against the agent as it is at that moment, and never anything written in the chat.

### Your product shows everything

Wiro's answers in a chat sent with a project API key name no site, page or link. When something still has to be connected, the answer says so in a plain sentence and returns the same information as data, the `next` array, so your product shows its own Connect button. Keys, app keys and tokens go into your own forms and reach Wiro through the API, never through the chat. The provider's consent screen, when a connector uses one, shows your app's name when you connect it with your own app keys, and the browser comes back to a page on your own site.

A few fields are for your backend, not for your users: every message row and every card names your API key's owner as the person who sent, asked or applied (see [API key](#api-key)), and the tokens and ids are your own references. Show your users your own names and words.

Connector titles name their vendors, such as Google Analytics 4 or WordPress. The connector the agent runs AI models with, key `wiro`, is titled `Wiro AI Models`, and so is its skill `int-wiro-aimodels` in `Skills/List`. That title comes wherever the API names it: in `needs` and `next[].title`, in the card listing and in `summary`, for every change that brings it, such as adding Video Creator or a voice channel. An agent that runs models through it can also write its public links in an answer, such as a model's page on wiro.ai or an output file on cdn1.wiro.ai. Your product may show its own label for the connector key `wiro`, as for any title the API gives.

A connector that signs in with Wiro's own app (mode `signin`, such as X, HubSpot, Mailchimp and TikTok Ads) shows that app's name on the provider's consent screen, so a product that wants its own name there connects with its own app keys, where the connector offers them (`own` in its `connection_modes`, see [Modes](#modes)). Every sign-in passes through its redirect URI on the API host (`redirecturi` in `OAuthStatus`), as registered with the provider, before the browser comes back to your `redirecturl`.

### The flow at a glance

```text
Your user types           Your backend                     Wiro
--------------            ------------                     ----
"Report our traffic"  ->  Message/Send ------------------>  agent turn runs
                          WebSocket or Message/Detail <---  timeline: answer + setup blocks
Your app shows the card
User presses Connect  ->  CredentialUpsert / OAuthConnect -> sign-in, token check or key
                          OAuthStatus / SetPickerAccounts
User presses Apply    ->  Message/SetupCardApply -------->  change applied, agent restarts
Your app shows "Restarting", then the agent answers again
```

## Before You Start

### API key

Every call in this guide is authenticated with a project API key from your Wiro dashboard, sent as the `x-api-key` header (signature-based projects also send `x-nonce` and `x-signature`). See [Authentication](/docs/authentication). Call Wiro from your backend only: never put the key in browser or mobile app code.

Your app may hold two kinds of token, so that the browser follows a chat on the [Agent WebSocket](/docs/agent-websocket) itself: a turn's `agenttoken` and a session's `sessiontoken`. The socket takes no API key, and each token reads only its own turn or session, so give a person only the tokens of their own chats. Or keep the socket on your backend and relay its events.

A call made with your API key acts as the key's owner: the person who created the project. Messages you send are stored as that person's messages, and setup cards are applied with that person's rights. So every row your users write carries the owner's account: `uuid` and the `user` object (first and last name, email, username, avatar) of each message row, and `requestedby` and `actedby` of each card. Never show them as the sender. Keep your own record of who wrote what, for example by `sessionkey` and `messageguid`, and show your own names.

### Deploy an agent

Deploy one agent per customer of yours with [`POST /UserAgent/Deploy`](/docs/agent-overview#post-useragentdeploy), with `useprepaid: true` and a plan in `tier`. The answer's `useragents[0].guid` is the agent's id: the `useragentguid` of every other call. The agent is queued and Wiro starts it: it is ready for messages when [`POST /UserAgent/Detail`](/docs/agent-overview#post-useragentdetail) reads `status: 4`. Give each conversation its own `sessionkey`.

```json
{
  "agentguid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "title": "Acme Marketing Agent",
  "useprepaid": true,
  "tier": "pro",
  "chatsetup": "all"
}
```

### Allow setup cards in API chats

Where setup cards can be proposed and applied is the agent's `chatsetup` setting. Wiro reads every request sent with a project API key as an API chat:

| `chatsetup` | Cards in your API chat | `SetupCardApply` with your API key |
|-------------|------------------------|------------------------------------|
| `all` (the default) | Yes | Works |
| `webchat` | No: only the Wiro web chat gets cards. In your product, the same as `off`. | Refused: `Setup from chat is off for this agent.` |
| `off` | No | Refused: `Setup from chat is off for this agent.` |

So an integration that shows setup cards needs `"all"`. Set it at Deploy with `chatsetup`, or later with [`POST /UserAgent/UpdateSettings`](/docs/agent-overview#post-useragentupdatesettings), and read it back as `chatSetup` on `UserAgent/Detail`. A change from or to `"off"` restarts a starting or running agent once, and a change between `"all"` and `"webchat"` restarts nothing. `UpdateSettings` doesn't say whether it restarted the agent: read `UserAgent/Detail` after it, as in [Showing a restart](#showing-a-restart).

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/UpdateSettings" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
    "chatsetup": "all"
  }'
```

```json
{ "result": true, "errors": [] }
```

With `"webchat"` or `"off"`, the agent proposes no card in your chat and tells people that an agent admin makes the change in the agent's settings, which in your product are the settings screens you build on the same endpoints.

### Who may apply a card

Applying a card needs an agent admin: the agent's owner, or an admin of the agent's team. With your API key, that is the key's owner, so every apply your backend sends counts as that person's approval. Dismissing a card needs only that the caller can see the chat.

Because of this, decide in your own product who may approve a change: show the Apply button, and pass a typed approval on to Wiro, only for the people allowed to change that agent. Wiro reads many words as an approval, not only `yes`, and a key pasted while a `key` connect card is the only `connect` card waiting can be saved to it when its connector is on the agent or a pending `add` card on the same reply brings it: [Typed replies](#typed-replies) has the whole list. When people who must not change the agent talk to it through your app, set `chatsetup` to `"off"` for that agent and change its setup from your own settings screens instead. That is the safe choice for any agent that several of your users share.

## Messages and Answers

### Send a message

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Message/Send" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
    "message": "Can you report our website traffic every Monday?",
    "sessionkey": "customer-42"
  }'
```

```json
{
  "result": true,
  "errors": [],
  "messageguid": "c3d4e5f6-a7b8-9012-cdef-345678901234",
  "agenttoken": "aB3xK9mR2pLqWzVn7tYhCd5sFgJkNb",
  "status": "agent_queue"
}
```

Keep `messageguid` (the turn) and `agenttoken` (its live stream). The full parameter list, attachments and per-turn model choice are in [`Message/Send`](/docs/agent-messaging#post-useragentmessagesend). `result: true` means the message was queued: follow the turn to its end, since a turn that couldn't be handed to the agent still ends as `agent_error` (see [When a turn fails](#when-a-turn-fails)).

When the agent isn't running, Send answers `result: false` with `agentstatus` and a sentence you can show as it is:

```json
{
  "result": false,
  "errors": [{ "code": 0, "message": "Agent is restarting. Please wait a moment and try again.", "time": 1794654900 }],
  "messageguid": null,
  "agenttoken": null,
  "status": null,
  "agentstatus": 1
}
```

See [Restarts](#restarts) for the other sentences.

When the agent has used all its credits, Send answers `result: false` with `agentstatus` and `agentbalance`:

```json
{
  "result": false,
  "errors": [{ "code": 0, "message": "Agent has no remaining credits. Renew your subscription or buy a credit pack to continue.", "time": 1794654900 }],
  "messageguid": null,
  "agenttoken": null,
  "status": null,
  "agentstatus": 4,
  "agentbalance": { "monthlycredits": 3000, "extracredits": 0, "usedcredits": 3000, "remainingcredits": 0 }
}
```

That sentence speaks to whoever pays for the agent, which is you. Detect the refusal by `agentbalance`, show your users your own words, and add credits from your backend: an [extra credit pack](/docs/agent-overview#extra-credit-packs) with `useprepaid: true`, or a larger plan with [`UpgradeTier`](/docs/agent-overview#post-useragentupgradetier). Setup replies that Wiro answers itself still work without credits: see [Replies the API answers itself](#replies-the-api-answers-itself).

### Follow the turn

Use one of three ways:

1. **WebSocket** (best for a live chat): connect to `wss://socket.wiro.ai/v1` and send `{ "type": "agent_info", "agenttoken": "aB3xK9mR2pLqWzVn7tYhCd5sFgJkNb" }`. You get `agent_subscribed` (a snapshot with `status`, `debugoutput` and `timeline`), then `agent_start`, one `agent_timeline_delta` per changed block, `agent_output` snapshots of the answer text, and `agent_end`, `agent_error` or `agent_cancel`. See [Agent WebSocket](/docs/agent-websocket).
2. **Polling**: call [`POST /UserAgent/Message/Detail`](/docs/agent-messaging#post-useragentmessagedetail) with `{ "messageguid": "..." }` every second or two until `status` is `agent_end`, `agent_error` or `agent_cancel`.
3. **Webhook**: send `callbackurl` with the message, and Wiro posts the final answer to it. See [Agent Webhooks](/docs/agent-webhooks).

Setup blocks arrive on the WebSocket like any other block, as `agent_timeline_delta`:

```json
{
  "type": "agent_timeline_delta",
  "agenttoken": "aB3xK9mR2pLqWzVn7tYhCd5sFgJkNb",
  "message": {
    "messageguid": "c3d4e5f6-a7b8-9012-cdef-345678901234",
    "block": {
      "blockid": "s:k3v9q2m8x1za",
      "type": "setup",
      "callindex": 1000000,
      "contentindex": 0,
      "text": null,
      "setup": {
        "v": 1,
        "id": "k3v9q2m8x1za",
        "kind": "schedule",
        "action": "create",
        "key": "cs-cron-weekly-traffic",
        "title": "Weekly traffic report",
        "cron": "0 9 * * 1",
        "instructions": "Every Monday, report last week's sessions, users and top pages from Google Analytics 4.",
        "requestedby": "5f0c9a2e-1b7d-4c3a-9e8f-2a6b7c8d9e0f",
        "createdat": 1794654811
      },
      "phase": "end",
      "version": 1,
      "startedat": 1794654811,
      "updatedat": 1794654811
    }
  },
  "result": true
}
```

When someone applies or dismisses the card later, the block comes again on the same `agenttoken` with `version: 2` and the new `status`, as long as your socket is still subscribed to that token. `Message/Detail` and `Message/History` always return the current state, so after a reconnect, read them again.

To stop a reply that is still running, call [`POST /UserAgent/Message/Cancel`](/docs/agent-messaging#post-useragentmessagecancel) with its `messageguid`, and with its `sessionkey` when several of your users share the agent, so that one person can't stop another's reply. The turn ends as `agent_cancel`.

### When a turn fails

A turn that fails ends with `status: "agent_error"`, and a cancelled one with `"agent_cancel"`. Its `response` and `debugoutput`, and the text of the `agent_error` or `agent_cancel` event and of the webhook, hold one code in brackets and a fixed sentence:

| Code | Status | What to show |
|------|--------|--------------|
| `[SECURITY_BLOCKED]` | `agent_error` | The agent's security rules blocked the message: ask the person to change it. |
| `[SAFETY_POLICY_BLOCKED]` | `agent_error` | The model's provider declined the request: ask the person to rephrase it. |
| `[TURN_INTERRUPTED]` | `agent_error` | A restart cut the turn short: offer to send it again. |
| `[AGENT_UNAVAILABLE]` | `agent_error` | Anything else, a message that couldn't be queued included: offer to try again shortly. |
| `[REQUEST_CANCELLED]` | `agent_cancel` | The turn was cancelled. |

Match the code and show your own words, or the sentence after it. The full texts are in [Failed turns](/docs/agent-messaging#failed-turns).

### Load a conversation

[`POST /UserAgent/Message/History`](/docs/agent-messaging#post-useragentmessagehistory) returns a session's messages, newest first. Each row has the fields of a `Message/Detail` answer except `sessionkey`, `startedat` and `endedat`, which History doesn't return:

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Message/History" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
    "sessionkey": "customer-42",
    "limit": 50
  }'
```

```json
{
  "result": true,
  "errors": [],
  "data": {
    "messages": [
      {
        "guid": "c3d4e5f6-a7b8-9012-cdef-345678901234",
        "content": "Can you report our website traffic every Monday?",
        "response": "I can do that once Google Analytics 4 is on and connected. Approve the card below and connect your Google Analytics account.",
        "status": "agent_end"
      }
    ],
    "count": 1,
    "hasmore": false,
    "sessiontoken": "Lp4vQ8sWn2KxT7cRb1YhZ6mDg9FjA3uEo5iNk0wXyHt"
  }
}
```

The row is shortened here; the GA4 example in [Worked Examples](#worked-examples) shows a whole one as `Message/Detail` returns it. Page back with `before` (the oldest `guid` you have) while `hasmore` is `true`. A session holds four kinds of row:

| Row | How you know it | What your UI shows |
|-----|-----------------|--------------------|
| A turn | `content` holds the message as stored (keys taken out, see [Security Rules](#security-rules)), `response` the reply, `timeline[]` its blocks, setup blocks included, in their current state | The person's message and the agent's reply. While `status` is `agent_queue`, `agent_start` or `agent_output`, the reply is in progress: subscribe to its `agenttoken` to follow it. |
| A reply Wiro answered itself | `metadata.type` is `"setup_result"`, `agenttoken` is `null`, `timeline` is empty | The message and `response` as plain text. See [Replies the API answers itself](#replies-the-api-answers-itself). |
| A message added between turns | `content` is empty, the text is in `response`, `metadata.type` is `"subagent"` or `"system"` | The agent's message with no message of the person's above it: a scheduled task's report, files sent after an answer, or, for `"subagent"`, the result of work the agent finished in the background. |
| A model switch | `status` is `"agent_done"`, `metadata.type` is `"model_change"` | A thin separator, or nothing. It comes only when you pick a per-turn `model`. |

A message added between turns has no turn of its own: nothing streams on an `agenttoken` for it and no webhook is called. A scheduled task's report goes to the session the agent's latest message is in, so on an agent that several of your users share it can reach any of their chats. To get it live, follow the session with the `sessiontoken` above: send `{ "type": "agent_session_subscribe", "sessiontoken": "Lp4vQ8sWn2KxT7cRb1YhZ6mDg9FjA3uEo5iNk0wXyHt" }` on the socket, and each new row arrives as an `agent_message_inserted` frame. Follows end with the connection, so after a reconnect subscribe again and read History once. See [Following a session](/docs/agent-websocket#following-a-session). The weekly report of the GA4 example below reaches your chat this way.

To list a customer's conversations, call [`POST /UserAgent/Message/Sessions`](/docs/agent-messaging#post-useragentmessagesessions) with the `useragentguid`: it answers each session's `sessionkey`, `messagecount`, `updatedat`, `lastmessage` and, once named with `RenameSession`, `name`. It lists every session of the agent that your key's owner can read, so on an agent that several of your users share, show each person only the sessions your own records give them.

### Render the timeline

A reply is an ordered list of blocks. Keep a map keyed by `blockid`, keep a block only when its `version` is newer than the one you hold, and draw the blocks sorted by `callindex`, then `contentindex`, then `blockid`.

| `type` | What it holds | What your UI shows |
|--------|---------------|--------------------|
| `reasoning` | `text`: a short summary of the agent's thinking | A collapsed "Thinking" section, in its place in the list. |
| `answer` | `text`: the answer text | The agent's message. Render it as Markdown. |
| `tool` | `toollabel`, `toolstatus` (`requested`, `completed`, `error`), `toolintegration`, `toolaction` | A small status line, such as "Working in Shopify" or "Taking a screenshot". Use your own labels for the `toolintegration` and `toolaction` words, and `toollabel` when both are `null`. |
| `setup` | `setup`: a setup card; on a pending `connect` card, also `next` | A card with buttons. See [Setup Cards](#setup-cards). |

Setup blocks have `callindex: 1000000`, so they sort after the reply's other blocks, in the order the agent proposed them, at most three per message. Skip a block whose `type` you don't know. The block fields are listed in [Public timeline block fields](/docs/agent-messaging#public-timeline-block-fields).

Wiro cleans the agent's text before it reaches you, in the blocks, in `response` and in every event: a link to a private address or into the agent's own system reads `[link removed]`, and a path inside the agent's system reads `[private detail removed]`. A turn in which the agent wrote nothing, older ones included, can read `No response from agent.` Show these as they are, or your own words. Public links stay as written, the Wiro AI Models links of [Your product shows everything](#your-product-shows-everything) included.

### Replies the API answers itself

Some messages are answered by Wiro itself, with no agent turn: a `yes` that applies a card or gets the card listing, a key typed as the reply while the latest reply has one pending `connect` card whose connector takes one key (Wiro reads it only while that connector is on the agent or a pending `add` card on the same reply brings it), and the others listed in [Chats Without Cards](#chats-without-cards). `Message/Send` then answers at once with `status: "agent_end"`, `agenttoken: null`, the answer in `response` and the outcome in `setupresult`:

```json
{
  "result": true,
  "errors": [],
  "messageguid": "d4e5f6a7-b8c9-0123-def4-567890123456",
  "agenttoken": null,
  "status": "agent_end",
  "response": "✅ Applied: Scheduled task Weekly traffic report created.\nYour agent is restarting to load the change. Continue in about a minute.",
  "content": "yes",
  "setupresult": {
    "applied": ["k3v9q2m8x1za"],
    "dismissed": [],
    "failed": [],
    "restarting": true
  }
}
```

Show `response` as the reply, as plain text. There is nothing to follow on the WebSocket. In `Message/History` the row reads `status: "agent_end"`, `metadata: { "type": "setup_result" }` and an empty `timeline`. These replies use no credits, and Wiro gives them while the agent is stopped or restarting too: see [Messages during a restart](#messages-during-a-restart) for which ones.

Wiro also answers a slash command the agent doesn't run, such as `/status`, or one of its commands that is turned off, while the agent is running. It uses no credits, even when the agent has none left, and the answer has no `setupresult`:

```json
{
  "result": true,
  "errors": [],
  "messageguid": "e5f6a7b8-c9d0-1234-ef56-789012345678",
  "agenttoken": null,
  "status": "agent_end",
  "response": "⛔ Unknown or disabled command: /status\nSend /agent_help to see the available commands.",
  "content": "/status"
}
```

The second line comes only when the agent has `agent_help` on. Show `response` as the reply, and the row in History as you show the other replies Wiro answers itself. A command counts anywhere in the message, as in `Check the /pricing page`, but never inside a link or a quoted line. A message that holds one of the agent's [enabled commands](/docs/agent-overview#post-useragentupdatesettings), written in lower case and followed by a space, a line break or the end of the message, goes to the agent, which runs it, and so does a message whose first command is `/model`, `/models` or one of a few common words and paths, such as `/start`, `/help` or `/usr/bin/env`. While the agent isn't running, the message gets the refusal in [Messages during a restart](#messages-during-a-restart). The full rules are in [Unknown or disabled commands](/docs/agent-messaging#unknown-or-disabled-commands).

## Setup Cards

### Block fields

A setup block has the usual block fields, `type: "setup"`, `text: null` and a `setup` object, the card:

```json
{
  "blockid": "s:h6w3k9p2m5tc",
  "type": "setup",
  "callindex": 1000000,
  "contentindex": 1,
  "text": null,
  "setup": {
    "v": 1,
    "id": "h6w3k9p2m5tc",
    "kind": "connect",
    "connector": "serper",
    "requestedby": "5f0c9a2e-1b7d-4c3a-9e8f-2a6b7c8d9e0f",
    "createdat": 1794654811
  },
  "phase": "end",
  "version": 1,
  "startedat": 1794654811,
  "updatedat": 1794654811,
  "next": [{ "connector": "serper", "title": "Serper Web Search", "mode": "key" }]
}
```

| Field | Description |
|-------|-------------|
| `blockid` | `s:` and the card's id. Use it as the merge key. |
| `type` | `setup`. |
| `callindex` | `1000000` for every setup block, so it sorts after the reply's other blocks. |
| `contentindex` | The card's place on the message: `0`, `1` or `2`. Add 1 for the card number a [card listing](#listing-the-cards) uses. |
| `text` | Always `null`. |
| `setup` | The card. See [Card fields](#card-fields). |
| `phase` | Always `end`. |
| `version` | `1` while the card is pending, `2` once it is applied, dismissed or failed. Keep the copy with the higher version. |
| `startedat` | When the agent proposed the card (Unix seconds). |
| `updatedat` | When the card last changed. |
| `next` | Only on a pending `connect` card: how its own connector connects, as one entry `{ connector, title, mode }`. It is gone once the card is applied, dismissed or failed. See [Your Own Connect Button](#your-own-connect-button). An `add` card's block has no `next`: its `setup.needs` lists what it brings. A card stored before `next` existed may have none. It still gets one while a pending `add` card on the same message names its connector in `needs`. Without one, name its connector by `credentials.<connector>._schema.title` of `UserAgent/Detail` and send the person to your settings screen for it. |

### Card fields

| Field | Kinds | Description |
|-------|-------|-------------|
| `v` | all | Card format version, `1`. |
| `id` | all | The card's id: 12 lower-case letters and digits. Send it as `cardid` to `SetupCardApply`. |
| `kind` | all | `add`, `remove`, `connect`, `disconnect`, `schedule`, `skill` or `timezone`. Skip a card whose `kind` you don't know. |
| `action` | `schedule`, `skill` | `schedule`: `create`, `update`, `pause`, `resume` or `delete`. `skill`: `create`, `update`, `append` (add text to the end), `revert` (undo the last change), `disable` or `enable`. |
| `key` | `add`, `remove`, `schedule`, `skill` | `add` and `remove`: the connector (`int-<name>`) or skill (`util-<name>`) as [`POST /Skills/List`](/docs/agent-skills#post-skillslist) names it. `schedule`: the task's key (`cs-cron-<name>`). `skill`: the custom skill's key (`cs-<name>`). |
| `connector` | `connect`, `disconnect` | The connector's key as [`POST /Credentials/List`](/docs/agent-credentials#post-credentialslist) lists it, such as `serper`. A card never holds a key's value. |
| `title` | `schedule`, `skill` | Optional. One line, up to 80 characters. |
| `cron` | `schedule` | Five fields, in the agent's time zone. Always on `create`, optional on `update`. A task set up from chat runs at most once an hour. |
| `instructions` | `schedule`, `skill` | `create` and `update`: the full text. `append`: only the text to add. `revert`: the text it restores. Up to 20,000 characters on what the agent writes. |
| `before` | `skill` (`update`, `append`, `revert`) | The skill's text when Wiro checked the card. Show it next to the text after the change: for `append`, that is `before` without the spaces and line breaks at its end, a blank line, then `instructions`. Can be absent on older cards. |
| `with` | `add`, `remove` | Other connectors and skills turned on (`add`) or off (`remove`) together with `key`, by name, sorted, at most 12. Written by Wiro. An `add` names only the ones still off on this agent, so the same `key` can bring a different list, or none, on another agent. |
| `pauses`, `resumes` | `add`, `remove` | Scheduled tasks (`cs-cron-<name>`) that stop, or run again, with this change, at most 20 each. Written by Wiro. Name each by the `description` of its entry in `scheduledskills` of `UserAgent/Detail`, or by its key in words. |
| `needs` | `add` | The connectors the change brings that aren't connected yet, at most 3, each `{ connector, title, mode }`. `title` can be absent: then use the connector's key. Written by Wiro. See [Modes](#modes). |
| `timezone` | `timezone` | The proposed IANA time zone, such as `Europe/Istanbul`. |
| `note` | all | Optional. The agent's one-line note on the change, up to 300 characters. |
| `status` | all | Absent while pending, then `applied`, `dismissed` or `failed`. |
| `actedat`, `actedby` | all | When the card was acted on (Unix seconds) and the account UUID of who did it. Absent while pending. With your API key, `actedby` is your key's owner. |
| `error` | all | Only when `status` is `failed`: one plain sentence that says why. |
| `requestedby` | all | The account UUID of the person whose message asked for the change: in your chats, your key's owner. |
| `createdat` | all | When the agent proposed the card (Unix seconds). |

Fields that don't apply to a card's kind are absent, and a missing list reads as empty. More kinds, actions and fields can be added later.

### Every kind

`add` turns on a connector or skill. This one turns on Brevo Email, two skills it depends on, and brings the Brevo connector, which still needs its key:

```json
{
  "v": 1,
  "id": "m5t8c2w6r3pe",
  "kind": "add",
  "key": "int-brevo-email",
  "with": ["util-anti-ai-human-copy", "util-chat-markdown-reporting"],
  "needs": [{ "connector": "brevo", "title": "Brevo", "mode": "key" }],
  "requestedby": "5f0c9a2e-1b7d-4c3a-9e8f-2a6b7c8d9e0f",
  "createdat": 1794654811
}
```

When `needs` names a connector with `mode` `key`, `signin`, `appkeys` or `token`, Wiro stores a `connect` card for it on the same message, right after the `add` card, when the message has room for it (three cards at most) and no pending `connect` card for that connector yet. Show the two as one card: see [Buttons](#buttons).

`remove` turns one off. Its saved key stays saved:

```json
{
  "v": 1,
  "id": "w2c8n5q1x7rd",
  "kind": "remove",
  "key": "int-brevo-email",
  "pauses": ["cs-cron-newsletter-digest"],
  "requestedby": "5f0c9a2e-1b7d-4c3a-9e8f-2a6b7c8d9e0f",
  "createdat": 1794654811
}
```

`connect` connects a connector that is on, or the one an `add` card on the same message brings:

```json
{
  "v": 1,
  "id": "h6w3k9p2m5tc",
  "kind": "connect",
  "connector": "serper",
  "requestedby": "5f0c9a2e-1b7d-4c3a-9e8f-2a6b7c8d9e0f",
  "createdat": 1794654811
}
```

`disconnect` removes a connector's saved key. Wiro takes it only for a connector that is connected with a key and that the agent can run without:

```json
{
  "v": 1,
  "id": "b7k1m4t9w2zs",
  "kind": "disconnect",
  "connector": "brevo",
  "requestedby": "5f0c9a2e-1b7d-4c3a-9e8f-2a6b7c8d9e0f",
  "createdat": 1794654811
}
```

`schedule` creates or changes a scheduled task:

```json
{
  "v": 1,
  "id": "k3v9q2m8x1za",
  "kind": "schedule",
  "action": "create",
  "key": "cs-cron-weekly-traffic",
  "title": "Weekly traffic report",
  "cron": "0 9 * * 1",
  "instructions": "Every Monday, report last week's sessions, users and top pages from Google Analytics 4.",
  "requestedby": "5f0c9a2e-1b7d-4c3a-9e8f-2a6b7c8d9e0f",
  "createdat": 1794654811
}
```

`skill` creates or changes a custom skill. An `append` card carries only the text it adds, and `before`:

```json
{
  "v": 1,
  "id": "p7d2m4x9q1ka",
  "kind": "skill",
  "action": "append",
  "key": "cs-blog-writing",
  "instructions": "End every post with three questions readers ask, each with a two-sentence answer.",
  "before": "Write each blog post in a friendly, plain tone.\nKeep posts under 900 words.",
  "note": "Adds the reader questions you asked for.",
  "requestedby": "5f0c9a2e-1b7d-4c3a-9e8f-2a6b7c8d9e0f",
  "createdat": 1794654811
}
```

`timezone` changes the agent's time zone:

```json
{
  "v": 1,
  "id": "z4x8c1v6b3nm",
  "kind": "timezone",
  "timezone": "Europe/Istanbul",
  "requestedby": "5f0c9a2e-1b7d-4c3a-9e8f-2a6b7c8d9e0f",
  "createdat": 1794654811
}
```

A card once acted on carries `status`, `actedat` and `actedby`, and a failed one `error`. This `append` card failed because someone edited the skill after the card was made:

```json
{
  "v": 1,
  "id": "p7d2m4x9q1ka",
  "kind": "skill",
  "action": "append",
  "key": "cs-blog-writing",
  "instructions": "End every post with three questions readers ask, each with a two-sentence answer.",
  "before": "Write each blog post in a friendly, plain tone.\nKeep posts under 900 words.",
  "note": "Adds the reader questions you asked for.",
  "requestedby": "5f0c9a2e-1b7d-4c3a-9e8f-2a6b7c8d9e0f",
  "createdat": 1794654811,
  "status": "failed",
  "actedat": 1794654870,
  "actedby": "5f0c9a2e-1b7d-4c3a-9e8f-2a6b7c8d9e0f",
  "error": "This skill changed after the card was made. Ask the agent again."
}
```

The full rules of each kind, such as what `with`, `pauses` and `before` mean, are in [Setup From Chat](/docs/agent-messaging#setup-from-chat).

### Card states

| State | How you know | What it means |
|-------|--------------|---------------|
| Pending | No `status` (block `version` 1) | Waiting for someone to apply or dismiss it. |
| Applied | `status: "applied"` | The change is made. The answer that applied it says in `restarting` whether the agent restarts. |
| Dismissed | `status: "dismissed"` | Turned down. Nothing changed. |
| Failed | `status: "failed"` | Wiro tried to apply it and couldn't: `error` says why. Nothing changed, with one exception: a `disconnect` card fails with `<Title> is disconnected in the agent's settings.` when the connector still reads connected after the agent's own key was removed, because the agent's template holds one too. That removal stays, and `restarting` in the answer says whether the agent restarts for it. |

Two more states exist only in your interface, between a click and the answer: **applying** (your call is under way), and **refused**, when `SetupCardApply` answers `result: false` and the card is still pending, for example a key that is too short or a sign-in that isn't finished. A refused card keeps its buttons. While the agent restarts after a change, show the card as applied with a **restarting** note; see [Restarts](#restarts).

Applying a `connect` card also marks the same person's other `connect` cards for that connector applied, when they are still pending on other messages of the same chat from the last 7 days. Their blocks come again on their own `agenttoken`s, and History shows them applied.

### What your UI shows for each kind

| Kind | Title line | Body | Buttons |
|------|-----------|------|---------|
| `add` | "Add `<title>`", the `title` of `key` in `Skills/List` | `with` as "Also turns on", `pauses` and `resumes`, and each entry of `needs` with its connect step | Apply, Dismiss; Connect for each connector in `needs` that has a `connect` card |
| `remove` | "Remove `<title>`" | `with` as "Also turns off", `pauses` and `resumes`. Say that a saved key stays saved. | Apply, Dismiss |
| `connect` | "Connect `<next[0].title>`" | By `next[0].mode`: a form for `key`, your Connect step for `signin`, `appkeys` and `token`, a link to your settings screen for `page` | Save for `key`; Connect, which runs your flow and then applies the card, for the sign-in modes; none for `page`; and Dismiss |
| `disconnect` | "Disconnect `<title>`", the connector's title from `UserAgent/Detail` (`credentials.<connector>._schema.title`) | Say that its saved key is removed and the skills that use it stop until it is connected again | Disconnect, Dismiss |
| `schedule` | "Create", "Change", "Pause", "Resume" or "Delete" scheduled task `<title or key>` | The schedule in words, in the agent's time zone, and `instructions` | Apply, Dismiss |
| `skill` | "Create", "Change", "Add to", "Undo the last change to", "Turn off" or "Turn on" custom skill `<title or key>` | `instructions`; for `update`, `append` and `revert`, `before` next to the text after the change | Apply, Dismiss |
| `timezone` | "Set the time zone to `<timezone>`" | The current zone, `timezone` on `UserAgent/Detail` (`null` means UTC) | Apply, Dismiss |

Show `note`, when there is one, under the title.

### What your UI shows for each state

| State | Show | Buttons |
|-------|------|---------|
| Pending, reply still being written | The card | Apply disabled while the message's `status` is `agent_queue`, `agent_start` or `agent_output`; Dismiss works |
| Pending | The card | All enabled |
| Applying | The card with a spinner | Disabled |
| Refused | `errors[0].message` under the card; for `errorcode: "not_connected"`, the Connect step again | Enabled |
| Applied | "Applied", and `summary` from the answer when you have it | None |
| Applied, agent restarting | "Applied" and "Restarting, about a minute" until the agent runs again | None |
| Dismissed | "Turned down" | None |
| Failed | "Not applied" and `setup.error` | None |

### Buttons

- **Apply**: `SetupCardApply` with `action: "apply"`.
- **Dismiss**: `SetupCardApply` with `action: "dismiss"`. When you dismiss an `add` card, dismiss its `connect` cards too: they can't connect anything without it.
- **An `add` card with a `connect` card**: the `connect` cards on the same message whose `connector` is in the `add` card's `needs` belong to it. Show them inside the `add` card, with one button that does both:
    - `mode` `key`: show the connector's fields and an **Add and connect** button: `SetupCardApply` on the `add` card with `values`.
    - `mode` `signin`, `appkeys` or `token`: show a **Connect** button that runs your connection flow, then **Add**: `SetupCardApply` on the `add` card with `signin: true`.
    - Either way, offer **Add now, connect later** too: `SetupCardApply` on the `add` card alone. Its answer's `next` then names the `connect` card to finish later.
    - `values` go with the add card's one `key` card, and `signin: true` with its one sign-in card. With two `key` cards it takes no `values`, and with two sign-in cards no `signin: true`: offer **Add** alone, then each `connect` card's own button.
- **A `connect` card alone**: `mode` `key` shows the fields and **Save** (`SetupCardApply` with `values`). A sign-in mode shows **Connect**, which runs your connection flow, then calls `SetupCardApply` on the card. `mode` `page` shows a link to your settings screen: applying it is refused.

A connector with `mode` `page` gets no `connect` card with its `add` card, and no card can connect it: its setup happens in your settings screens. See [Page](#page-set-up-outside-the-chat).

## Applying and Dismissing

### Request

[`POST /UserAgent/Message/SetupCardApply`](/docs/agent-messaging#post-useragentmessagesetupcardapply) acts on one card:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | The agent. |
| `messageguid` | string | Yes | The message that holds the card: the row whose `timeline[]` has the setup block. |
| `cardid` | string | Yes | The card's `setup.id`. |
| `action` | string | Yes | `"apply"` or `"dismiss"`. |
| `values` | object | No | `{ "<fieldname>": "<value>" }`. On a `connect` card for a key connector: its fields. On an `add` card whose `connect` card takes a key: that card's fields, and Wiro applies both cards in one step. Only `text`, `password`, `url` and `email` fields, up to 4,096 characters each, named as [`POST /Credentials/Detail`](/docs/agent-credentials#post-credentialsdetail) lists them in `credential_schema`. Saved to the connector, never returned and never shown to the agent. |
| `signin` | boolean | No | `true` with `action: "apply"` on an `add` card whose sign-in `connect` card's connector you have just connected: Wiro applies both cards in one step. Never together with `values`. |

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Message/SetupCardApply" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
    "messageguid": "c3d4e5f6-a7b8-9012-cdef-345678901234",
    "cardid": "k3v9q2m8x1za",
    "action": "apply"
  }'
```

### Answer

```json
{
  "result": true,
  "errors": [],
  "setup": {
    "v": 1,
    "id": "k3v9q2m8x1za",
    "kind": "schedule",
    "action": "create",
    "key": "cs-cron-weekly-traffic",
    "title": "Weekly traffic report",
    "cron": "0 9 * * 1",
    "instructions": "Every Monday, report last week's sessions, users and top pages from Google Analytics 4.",
    "requestedby": "5f0c9a2e-1b7d-4c3a-9e8f-2a6b7c8d9e0f",
    "createdat": 1794654811,
    "status": "applied",
    "actedat": 1794654870,
    "actedby": "5f0c9a2e-1b7d-4c3a-9e8f-2a6b7c8d9e0f"
  },
  "restarting": true,
  "summary": "Scheduled task Weekly traffic report created"
}
```

| Field | Description |
|-------|-------------|
| `result` | `true` when the action went through. `false` when it was refused or failed: read `errors[0].message`, and `setup.status` when `setup` isn't `null`. |
| `errors` | `[{ code, message, time }]`. `message` is one plain sentence you can show as it is. |
| `setup` | The card after the call: still pending after a refusal, `applied`, `dismissed` or `failed` otherwise. `null` when the call was refused before the card was read: a missing parameter, an agent or message your key can't reach, setup from chat off, a reply still running, code `97`, a card someone is applying at that moment, or a card that isn't there. |
| `restarting` | `true` when the agent restarts to load the change. See [Restarts](#restarts). It can be `true` with `result: false` too, when the call changed part of the setup before it was refused or failed: some fields saved while others are still needed, or the failed `disconnect` of [Card states](#card-states). |
| `summary` | A short phrase that says what changed, such as `Scheduled task Weekly traffic report created` or `Serper Web Search added. Serper Web Search connected.`. Empty when nothing was applied. |
| `paired` | Only when `values` or `signin: true` came with an `add` card: its `connect` card after the call, `[{ setup, result, error }]`. `result` is `true` when that card was applied too, and `error` is `null` or the sentence that says why not. `[]` when the `add` card has no single `connect` card to take them. |
| `next` | Only when something is left to connect: `[{ connector, title, mode, cardid?, messageguid? }]`. See [Your Own Connect Button](#your-own-connect-button). |
| `errorcode` | Only on the refusals of a sign-in `connect` card, or of an `add` card sent with `signin: true`: `not_connected`, `signin_values`, `signin_no_pair` or `signin_many`. See [Errors](#setupcardapply-refusals). |

Dismissing answers the card with `status: "dismissed"`, `restarting: false` and an empty `summary`.

Everyone subscribed to the turn's `agenttoken` gets the card's new block as an `agent_timeline_delta`, and so does the `connect` card applied with an `add` card. Update your copy from the answer's `setup` right away, and from the block when it arrives.

### Who may call it

With your project API key, a call acts as the key's owner, and works when all of these hold:

- The agent's `chatsetup` is `"all"`. Otherwise: `Setup from chat is off for this agent.`
- The key's owner owns the agent or is a member of its team, and the key's project is in the agent's workspace: a team project's key for a team agent, a personal one for a personal agent. Otherwise: `Agent not found or access denied`, or a sentence that names the workspace to use.
- The message is one the key's owner can read with `Message/History`: not deleted, not hidden, and in a private chat their own. Otherwise: `This setup card was not found.`
- To apply: the reply that holds the card has finished (otherwise `Wait until the agent finishes this reply, then apply it.`), and the key's owner is an agent admin (otherwise code `97`, `Only an agent admin can apply setup changes.`). Dismissing works at any time for anyone who can see the chat.
- The card is pending. A card is applied at most once: on one that was acted on, the answer says `This card was already applied.`, `This card was already dismissed.` or `This card was already failed.`, with the card in `setup`.

`SetupCardApply` takes no `sessionkey`. When several of your users share one agent, check in your backend that the `messageguid` belongs to the session of the person who clicked, for example with [`Message/Detail`](/docs/agent-messaging#post-useragentmessagedetail) and its `sessionkey`.

## Connecting a Connector

### Modes

Each entry of `needs` and of `next` says how its connector connects in `mode`:

| `mode` | How it connects | Your UI | Calls |
|--------|-----------------|---------|-------|
| `key` | A key, or a few fields, typed by the person | A form with the connector's fields | `SetupCardApply` with `values` |
| `appkeys` | The person's own app keys, then the provider's sign-in | A form for the app keys, the redirect URI to register, then a Connect button | `CredentialUpsert`, `OAuthConnect` (`own`), `OAuthStatus`, `SetPickerAccounts`, then `SetupCardApply` |
| `token` | A token Wiro checks on the server, such as a Meta System User token | A form for the token, then the accounts to pick when the check lists some | `CredentialUpsert`, `OAuthConnect` (`api_key`), `SetPickerAccounts` when there are accounts to pick, then `SetupCardApply` |
| `signin` | The provider's sign-in with Wiro's own app | A Connect button | `OAuthConnect` (`wiro`), `OAuthStatus`, `SetPickerAccounts` when there are accounts to pick, then `SetupCardApply` |
| `page` | Anything else: service account files, lists, the Wiro project of Wiro AI Models | A link to your settings screen for that connector | The credential endpoints, with no card |

Read a mode you don't know as `page`. `mode` is the connector's usual way. A connector can offer others, listed in `connection_modes` of `POST /Credentials/Detail` by their `authmethod`: `wiro` is `signin`, `own` is `appkeys` and `api_key` is `token`. Any of them that connects the connector lets its card apply. `wiro` stays listed while `wiro_connect_pending` is `true`, and until that flag is `false`, `OAuthConnect` refuses it with `Sign-in with the platform's app is not enabled for <Title>`: don't offer it then. Each mode below uses one example connector, and the same calls work for every connector of that mode.

The fields of a connector are in [`POST /Credentials/Detail`](/docs/agent-credentials#post-credentialsdetail) (`credential_schema`), which needs no API key, and in `credentials.<connector>._schema.fields` of `UserAgent/Detail`. Which of them a form shows:

- `appkeys`, `token` and `signin`: the fields whose `only_in_modes` is absent or names the mode's `authmethod`, leaving out the ones marked `auto_filled_by_oauth`, `server_managed` or `platform_managed`, and any that isn't a `text`, `password`, `url` or `email` input. Every required one goes on the form: LinkedIn's app keys come with its organization ID, and Shopify's token check needs the shop domain besides the client ID and secret. For `token`, `oauth_provider.direct_probe.required_fields` names the fields the check reads.
- `key`: the `text`, `password`, `url` and `email` fields, `required` marking the ones the connector needs.

### Key: Serper Web Search

A key connector takes its fields as `values`. Serper Web Search has one field, `apikey` (label "Serper API Key", at least 20 characters).

**With its `add` card, in one step.** Send the key with the `add` card that brings the connector. Wiro checks the key first, against the connector as the `add` card will leave it: a refused key applies nothing, and both cards stay pending. Otherwise both cards are applied, with one restart:

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Message/SetupCardApply" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
    "messageguid": "c3d4e5f6-a7b8-9012-cdef-345678901234",
    "cardid": "q4n7s1v8b2xd",
    "action": "apply",
    "values": { "apikey": "THE_SERPER_API_KEY" }
  }'
```

```json
{
  "result": true,
  "errors": [],
  "setup": {
    "v": 1,
    "id": "q4n7s1v8b2xd",
    "kind": "add",
    "key": "int-serper-search",
    "needs": [{ "connector": "serper", "title": "Serper Web Search", "mode": "key" }],
    "requestedby": "5f0c9a2e-1b7d-4c3a-9e8f-2a6b7c8d9e0f",
    "createdat": 1794654811,
    "status": "applied",
    "actedat": 1794654870,
    "actedby": "5f0c9a2e-1b7d-4c3a-9e8f-2a6b7c8d9e0f"
  },
  "restarting": true,
  "summary": "Serper Web Search added. Serper Web Search connected.",
  "paired": [
    {
      "setup": {
        "v": 1,
        "id": "h6w3k9p2m5tc",
        "kind": "connect",
        "connector": "serper",
        "requestedby": "5f0c9a2e-1b7d-4c3a-9e8f-2a6b7c8d9e0f",
        "createdat": 1794654811,
        "status": "applied",
        "actedat": 1794654870,
        "actedby": "5f0c9a2e-1b7d-4c3a-9e8f-2a6b7c8d9e0f"
      },
      "result": true,
      "error": null
    }
  ]
}
```

A key that is too short:

```json
{
  "result": false,
  "errors": [{ "code": 0, "message": "Serper API Key must be at least 20 characters", "time": 1794654870 }],
  "setup": {
    "v": 1,
    "id": "q4n7s1v8b2xd",
    "kind": "add",
    "key": "int-serper-search",
    "needs": [{ "connector": "serper", "title": "Serper Web Search", "mode": "key" }],
    "requestedby": "5f0c9a2e-1b7d-4c3a-9e8f-2a6b7c8d9e0f",
    "createdat": 1794654811
  },
  "restarting": false,
  "summary": "",
  "paired": [
    {
      "setup": {
        "v": 1,
        "id": "h6w3k9p2m5tc",
        "kind": "connect",
        "connector": "serper",
        "requestedby": "5f0c9a2e-1b7d-4c3a-9e8f-2a6b7c8d9e0f",
        "createdat": 1794654811
      },
      "result": false,
      "error": "Serper API Key must be at least 20 characters"
    }
  ]
}
```

**On its `connect` card.** When the connector is already on, or its `add` card was applied without the key, send the fields with the `connect` card:

```json
{
  "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
  "messageguid": "c3d4e5f6-a7b8-9012-cdef-345678901234",
  "cardid": "h6w3k9p2m5tc",
  "action": "apply",
  "values": { "apikey": "THE_SERPER_API_KEY" }
}
```

```json
{
  "result": true,
  "errors": [],
  "setup": {
    "v": 1,
    "id": "h6w3k9p2m5tc",
    "kind": "connect",
    "connector": "serper",
    "requestedby": "5f0c9a2e-1b7d-4c3a-9e8f-2a6b7c8d9e0f",
    "createdat": 1794654811,
    "status": "applied",
    "actedat": 1794654900,
    "actedby": "5f0c9a2e-1b7d-4c3a-9e8f-2a6b7c8d9e0f"
  },
  "restarting": true,
  "summary": "Serper Web Search connected"
}
```

A `connect` card sent before its `add` card is applied changes nothing and answers `Apply card 1 first: it turns on Serper Web Search.`. A connector with several fields, such as WordPress, is connected once all its required fields are saved: with only some of them, the fields you sent are saved, the card stays pending, and the answer is `result: false` with `Saved <fields> for <Connector>. Still needed: <fields>.`. Send the rest with the same card. The same values sent with the `add` card still apply the `add` card: the answer is `result: true`, `summary` names only the add, `paired[0]` has `result: false` and that sentence, and `next` names the `connect` card to finish. A save of some fields can restart the agent, so `restarting` can be `true` on either answer.

### Own app keys: Google Analytics 4

The person connects with their own Google Cloud OAuth client, so Google's consent screen shows their app's name. The steps, for a pending `add` card for `int-ga4-analytics` and its `connect` card for `ga4`:

**1. Read what the form needs.** `OAuthStatus` returns the redirect URI to register in the app and whether app keys are saved already:

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/OAuthStatus" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321", "credentialkey": "ga4" }'
```

```json
{
  "result": true,
  "errors": [],
  "connected": false,
  "accounts": [],
  "connectedat": "",
  "tokenexpiresat": "",
  "authmethod": "",
  "redirecturi": "https://api.wiro.ai/v1/UserAgentOAuth/GA4Callback",
  "appkeyssaved": false,
  "tokensaved": false
}
```

Show a form with the app's fields (`clientid` and `clientsecret` for Google, listed in `credential_schema` with `only_in_modes: ["own"]`) and the `redirecturi` to copy into the app's authorized redirect URIs. When `appkeyssaved` is `true`, the keys are saved already: offer to use them or replace them. Saved app keys are never returned.

**2. Save the app keys** with [`CredentialUpsert`](/docs/agent-overview#post-useragentcredentialupsert), with `authmethod: "own"`. Saving app keys restarts nothing. In this flow the connection restarts nothing either, since nothing on the agent uses Google Analytics 4 until the `add` card is applied, and that apply restarts the agent once (step 8).

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/CredentialUpsert" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
    "fields": [
      { "credentialkey": "ga4", "fieldname": "clientid", "fieldvalue": "1234567890-abc.apps.googleusercontent.com" },
      { "credentialkey": "ga4", "fieldname": "clientsecret", "fieldvalue": "GOCSPX-THE_CLIENT_SECRET" },
      { "credentialkey": "ga4", "fieldname": "authmethod", "fieldvalue": "own" }
    ]
  }'
```

```json
{ "result": true, "applied": 3, "errors": [] }
```

**3. Start the sign-in** with [`OAuthConnect`](/docs/agent-credentials#post-useragentoauthoauthconnect), and your own page as `redirecturl`: any https URL you control, or `http://localhost` while you develop. The browser comes back to it with no `useragentguid` in the query, so put your own reference in it:

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/OAuthConnect" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
    "credentialkey": "ga4",
    "authmethod": "own",
    "redirecturl": "https://app.example.com/connect/done?ref=conn_8812"
  }'
```

```json
{
  "result": true,
  "errors": [],
  "authorizeUrl": "https://accounts.google.com/o/oauth2/v2/auth?client_id=1234567890-abc.apps.googleusercontent.com&redirect_uri=https%3A%2F%2Fapi.wiro.ai%2Fv1%2FUserAgentOAuth%2FGA4Callback&scope=...&response_type=code&state=...&access_type=offline&prompt=select_account+consent",
  "flowid": "9d2c41e07ab35f8e6c1d0b9a87f6e5d4"
}
```

Keep `flowid`: it names this sign-in. A new `OAuthConnect` for the same agent and connector replaces it.

**4. Send the browser to `authorizeUrl`.** Either redirect the tab, or open a popup from the click handler and let your return page tell the opener (for example with `postMessage`) and close itself. Google shows its account chooser and then the consent screen.

**5. Read the return.** The browser comes back to your `redirecturl`, with the result added to the query:

```text
https://app.example.com/connect/done?ref=conn_8812&ga4_connected=true&ga4_properties=%5B%7B%22id%22%3A%22123456789%22%2C%22displayName%22%3A%22Acme%20Web%22%2C%22account%22%3A%22Acme%22%2C%22propertyType%22%3A%22PROPERTY_TYPE_ORDINARY%22%7D%2C%7B%22id%22%3A%22987654321%22%2C%22displayName%22%3A%22Acme%20App%22%2C%22account%22%3A%22Acme%22%2C%22propertyType%22%3A%22PROPERTY_TYPE_ORDINARY%22%7D%5D
```

On failure it carries `ga4_error=<code>` instead; see [Return codes](#return-codes-on-your-redirect-url). Each connector has its own prefix (`ga4_`, `x_`, `fb_` and so on), listed in [Callback success and error parameters](/docs/agent-credentials#callback-success-error-parameters).

**6. Read the accounts to pick** from your backend with `OAuthStatus`, called as in step 1. This also works when you didn't read the return, such as after a popup:

```json
{
  "result": true,
  "errors": [],
  "connected": false,
  "accounts": [],
  "connectedat": "2026-11-14T11:14:50.000Z",
  "tokenexpiresat": "2026-11-14T12:14:50.000Z",
  "authmethod": "own",
  "redirecturi": "https://api.wiro.ai/v1/UserAgentOAuth/GA4Callback",
  "appkeyssaved": true,
  "tokensaved": false,
  "flow": {
    "flowid": "9d2c41e07ab35f8e6c1d0b9a87f6e5d4",
    "mine": true,
    "mode": "own",
    "status": "candidates",
    "account": "",
    "errorcode": "",
    "errordetail": "",
    "restart": "none",
    "expiresat": 1794655790
  },
  "candidates": [
    { "id": "123456789", "name": "Acme Web" },
    { "id": "987654321", "name": "Acme App" }
  ]
}
```

`flow` is the agent's current sign-in or token check for this connector, whoever started it: `OAuthStatus` takes no `flowid`, so compare `flow.flowid` with the one you kept. Another `flowid` means a newer sign-in replaced yours. To anyone but the person who started it, `flow` holds only `mine`, `status` and `expiresat`, such as `{ "mine": false, "status": "candidates", "expiresat": 1794655790 }`, and `candidates` is absent. `flow.status` is `waiting` until the person comes back, then `candidates` (accounts to pick), `connected` (nothing to pick), `saved` (the accounts were saved and the list is used up), or `failed` with `flow.errorcode`. A flow lives 15 minutes from `OAuthConnect`, or 15 minutes from the moment its accounts were listed; after that `flow` is absent. Poll every two seconds or so while you wait. Show `candidates` as a list with checkboxes.

**7. Save the accounts picked** with [`SetPickerAccounts`](/docs/agent-credentials#post-useragentoauthsetpickeraccounts), the `flowid` and their ids, within 15 minutes of the sign-in:

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/SetPickerAccounts" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
    "credentialkey": "ga4",
    "flowid": "9d2c41e07ab35f8e6c1d0b9a87f6e5d4",
    "accountids": ["123456789"]
  }'
```

```json
{
  "result": true,
  "errors": [],
  "accounts": [{ "id": "123456789", "name": "Acme Web" }],
  "restart": "none"
}
```

The connector is now connected. `restart` is `"none"` because nothing on the agent uses Google Analytics 4 until the `add` card is applied.

Two connectors have a second step after the accounts: Meta Ads (its Facebook Pages, optional) and Google Business Profile (its locations, required). Discover the items with [`DiscoverPickerItems`](/docs/agent-credentials#post-useragentoauthdiscoverpickeritems), sending the picked ids as `parents` and the sign-in's `flowid`, then save both steps in one `SetPickerAccounts` call with `accountids`, `pickerkey` and `selections`. For a Google Business Profile sign-in:

```json
{
  "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
  "credentialkey": "google-business",
  "pickerkey": "locations",
  "flowid": "7f3e2d1c0b9a88776655443322110ffe",
  "parents": ["112233445566778899001"]
}
```

```json
{
  "result": true,
  "errors": [],
  "pickerkey": "locations",
  "groups": [
    {
      "parent": { "accountid": "112233445566778899001", "accountname": "Acme Bakery" },
      "items": [
        { "locationid": "9876543210987654321", "locationtitle": "Acme Bakery Downtown" },
        { "locationid": "1234567890123456789", "locationtitle": "Acme Bakery Riverside" }
      ]
    }
  ]
}
```

```json
{
  "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
  "credentialkey": "google-business",
  "flowid": "7f3e2d1c0b9a88776655443322110ffe",
  "accountids": ["112233445566778899001"],
  "pickerkey": "locations",
  "selections": [{ "parentvalue": "112233445566778899001", "itemids": ["9876543210987654321"] }]
}
```

A group whose items couldn't be listed comes with `items: []` and an `errorcode` of its own, such as `provider_timeout`: show it, and leave that account out of `selections`. See [Both steps in one call](/docs/agent-credentials#both-steps-in-one-call) for the rules of that save.

**8. Apply the cards.** Send the `add` card with `signin: true`. Wiro checks that the connector reads connected, then applies the `add` card, which restarts the agent once, and its `connect` card:

```json
{
  "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
  "messageguid": "c3d4e5f6-a7b8-9012-cdef-345678901234",
  "cardid": "71xb9zrcd1sb",
  "action": "apply",
  "signin": true
}
```

```json
{
  "result": true,
  "errors": [],
  "setup": {
    "v": 1,
    "id": "71xb9zrcd1sb",
    "kind": "add",
    "key": "int-ga4-analytics",
    "needs": [{ "connector": "ga4", "title": "Google Analytics 4", "mode": "appkeys" }],
    "requestedby": "5f0c9a2e-1b7d-4c3a-9e8f-2a6b7c8d9e0f",
    "createdat": 1794654811,
    "status": "applied",
    "actedat": 1794654960,
    "actedby": "5f0c9a2e-1b7d-4c3a-9e8f-2a6b7c8d9e0f"
  },
  "restarting": true,
  "summary": "Google Analytics 4 added. Google Analytics 4 connected.",
  "paired": [
    {
      "setup": {
        "v": 1,
        "id": "ljehd9inazm4",
        "kind": "connect",
        "connector": "ga4",
        "requestedby": "5f0c9a2e-1b7d-4c3a-9e8f-2a6b7c8d9e0f",
        "createdat": 1794654811,
        "status": "applied",
        "actedat": 1794654960,
        "actedby": "5f0c9a2e-1b7d-4c3a-9e8f-2a6b7c8d9e0f"
      },
      "result": true,
      "error": null
    }
  ]
}
```

When the `add` card was applied earlier on its own, apply the `connect` card instead, with no `values`. It writes nothing: it records that the connector is connected, and answers `summary: "Google Analytics 4 connected"` with `restarting: false`, since the connection itself restarted the agent.

### Token: Facebook Pages

The person pastes a Meta Business System User token, Wiro checks it on the server and lists the Pages it can post to, and the person picks them. There is no browser redirect. For a pending `add` card for `int-facebookpage-post` and its `connect` card for `facebook-pages`:

**1. Save the token** with `authmethod: "api_key"`. This restarts nothing.

```json
{
  "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
  "fields": [
    { "credentialkey": "facebook-pages", "fieldname": "authmethod", "fieldvalue": "api_key" },
    { "credentialkey": "facebook-pages", "fieldname": "systemusertoken", "fieldvalue": "THE_SYSTEM_USER_TOKEN" }
  ]
}
```

```json
{ "result": true, "applied": 2, "errors": [] }
```

**2. Check it** with `OAuthConnect` and the same `authmethod`, and no `redirecturl`:

```json
{
  "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
  "credentialkey": "facebook-pages",
  "authmethod": "api_key"
}
```

```json
{
  "result": true,
  "errors": [],
  "flowid": "4b1f0c7a9e2d4c1b8a7f6e5d4c3b2a19",
  "accounts": [
    { "id": "1029384756", "name": "Acme" },
    { "id": "5647382910", "name": "Acme Outlet" }
  ],
  "account": "Acme Marketing System User",
  "restart": "none"
}
```

`accounts` are the Pages to pick, and `account` names who the token belongs to. A refused check answers `result: false` with `errorcode`, such as `direct_token_invalid` or `no_pages`; see [Token check codes](#token-check-codes).

**3. Save the Pages picked:**

```json
{
  "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
  "credentialkey": "facebook-pages",
  "flowid": "4b1f0c7a9e2d4c1b8a7f6e5d4c3b2a19",
  "accountids": ["1029384756"]
}
```

```json
{
  "result": true,
  "errors": [],
  "accounts": [{ "id": "1029384756", "name": "Acme" }],
  "restart": "none"
}
```

**4. Apply the cards:** the `add` card with `signin: true`, as for Google Analytics 4. The answer's `summary` reads `Facebook Page Post added. Facebook connected.` The token never reaches the agent, and the Page tokens Wiro finds with it never leave the server.

### Sign-in: X with Wiro's app

A `signin` connector connects with Wiro's own app, so there are no app keys to collect: one button. The provider's consent screen then names Wiro's app, not yours. To show your own brand there, connect the same connector with your own app keys instead (`authmethod: "own"`, as in [Own app keys](#own-app-keys-google-analytics-4)), where the connector offers it in `connection_modes`: a product whose users never see Wiro's name does that wherever it can, and shows its own label for Wiro AI Models (see [Your product shows everything](#your-product-shows-everything)). For a pending `add` card for `int-twitterx-post` and its `connect` card for `twitter`:

**1. Start the sign-in:**

```json
{
  "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
  "credentialkey": "twitter",
  "authmethod": "wiro",
  "redirecturl": "https://app.example.com/connect/done?ref=conn_8813"
}
```

```json
{
  "result": true,
  "errors": [],
  "authorizeUrl": "https://x.com/i/oauth2/authorize?client_id=...&redirect_uri=https%3A%2F%2Fapi.wiro.ai%2Fv1%2FUserAgentOAuth%2FXCallback&scope=...&response_type=code&state=...&code_challenge=...&code_challenge_method=S256",
  "flowid": "e1a2b3c4d5e6f708192a3b4c5d6e7f80"
}
```

**2. Send the browser to `authorizeUrl`.** The person approves on X and comes back to your page:

```text
https://app.example.com/connect/done?ref=conn_8813&x_connected=true&x_username=acmeco
```

**3. Check the connection** with `OAuthStatus`. X has no accounts to pick, so the sign-in connects it:

```json
{
  "result": true,
  "errors": [],
  "connected": true,
  "accounts": [{ "id": "acmeco", "name": "acmeco" }],
  "connectedat": "2026-11-14T11:15:25.000Z",
  "tokenexpiresat": "2026-11-14T13:15:25.000Z",
  "authmethod": "wiro",
  "redirecturi": "https://api.wiro.ai/v1/UserAgentOAuth/XCallback",
  "appkeyssaved": false,
  "tokensaved": false,
  "flow": {
    "flowid": "e1a2b3c4d5e6f708192a3b4c5d6e7f80",
    "mine": true,
    "mode": "wiro",
    "status": "connected",
    "account": "acmeco",
    "errorcode": "",
    "errordetail": "",
    "restart": "none",
    "expiresat": 1794655802
  }
}
```

**4. Apply the cards:** the `add` card with `signin: true`. `summary` reads `Twitter / X Post added. Twitter / X connected.`

### Page: set up outside the chat

A connector with `mode` `page`, such as Google Drive with its service account file, gets no `connect` card with its `add` card, and no card can connect it. When its `add` card is applied, `summary` goes on with `Connect Google Drive in the agent's settings`, and `next` lists it with `mode: "page"` and no `cardid`. The agent can still propose a `connect` card for it on its own: that block's `next` reads `mode: "page"`, and applying the card is refused with `Google Drive is connected in the agent's settings, not from chat.` while it stays pending. Show such a card as a link to your settings screen, with Dismiss. Send the person to your own settings screen for that connector, which saves it with the credential endpoints, as its integration page shows:

```json
{
  "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
  "fields": [
    { "credentialkey": "google-drive", "fieldname": "serviceaccountjson", "fieldvalue": "BASE64_OF_THE_SERVICE_ACCOUNT_JSON" }
  ]
}
```

```json
{ "result": true, "applied": 1, "errors": [] }
```

There is no card to apply afterwards. The save restarts a running agent once, so it loads the connector, but its answer doesn't say so: see [Showing a restart](#showing-a-restart). Files go through [`CredentialFileUpload`](/docs/agent-overview#post-useragentcredentialfileupload), and the Wiro AI Models connector, the Wiro project the agent runs models with, through [`CredentialProjectBind`](/docs/agent-overview#post-useragentcredentialprojectbind), whose answer says in `restart` whether the agent restarts.

## Your Own Connect Button

### Where next appears

`next` is the list of connectors still to connect, as data for your own buttons. It comes in four places:

| Where | When | Entries |
|-------|------|---------|
| A setup block | On a pending `connect` card | One entry, its own connector: `{ connector, title, mode }`. No `cardid`: it is the block's own card. |
| `SetupCardApply` answer | An `add` card applied, alone, with `values` or with `signin: true`, that leaves connectors not connected; a sign-in `connect` card refused with `not_connected` or `signin_values`; a `connect` card for a `page` connector | `{ connector, title, mode, cardid?, messageguid? }` |
| `setupresult.next` in a `Message/Send` answer | A `yes` that applied a card: the reply's `key` connect cards still waiting for their key, the sign-in `connect` cards of the `add` card it applied, and each connector that `add` card brings with no card to connect it. A `yes` while only `connect` cards wait, one of them a sign-in card: the waiting `connect` cards. A key typed for an `add` card and its `connect` card: the other connectors that `add` card brings. | Same |
| `metadata.next` in the webhook | The same answers as `setupresult.next`, posted to the message's `callbackurl` | Same |

`next` is absent when nothing is left to connect: never an empty array.

### Entry fields

| Field | Description |
|-------|-------------|
| `connector` | The connector's key, as `needs[].connector` and a `connect` card's `connector` name it. |
| `title` | Its name, one line, up to 80 characters. Use it on the button: "Connect Google Analytics 4". |
| `mode` | `key`, `signin`, `appkeys`, `token` or `page`. See [Modes](#modes). |
| `cardid` | The pending `connect` card that records the connection once it is made. Never on `page` entries. |
| `messageguid` | The message that card is on. Present exactly when `cardid` is, and only in answers. |

### From next to a button

```javascript
// For each entry of next, show one button that runs the mode's flow,
// then applies the card that records the connection.
// own: for an entry of a block's next, that block's card and message.
async function connectFromNext(entry, useragentguid, own) {
  const cardid = entry.cardid || (own && own.cardid);
  const messageguid = entry.messageguid || (own && own.messageguid);
  if (entry.mode === "page") {
    return openSettingsScreen(entry.connector); // your own screen; no card to apply
  }
  if (entry.mode === "key") {
    const values = await askForFields(entry.connector); // your form, never the chat
    if (!cardid) return saveWithCredentialUpsert(entry.connector, values); // no card records it
    return setupCardApply({ useragentguid, messageguid, cardid, action: "apply", values });
  }
  // signin, appkeys, token: run the connection, then record it on its card when there is one.
  await runConnection(entry.connector, entry.mode); // OAuthConnect and the rest
  if (!cardid) return;
  return setupCardApply({ useragentguid, messageguid, cardid, action: "apply" });
}

// A pending connect card's block, on its Message/Detail or History row:
// connectFromNext(block.next[0], useragentguid, { cardid: block.setup.id, messageguid: row.guid });
```

A block's `next` names no card because the card is the block's own: pass its `setup.id` and the row's `guid`, as the last line shows. An entry of an answer with no `cardid` and a mode other than `page` has no card left to record it, for example because its `connect` card was turned down: connect it the same way, with `CredentialUpsert` for a key, and there is nothing to apply. When the answer to a sign-in `connect` card is `errorcode: "not_connected"` with `next`, the connection isn't finished: run the flow again from that entry.

## Errors and What to Show

Every refusal comes as `result: false` with one plain sentence in `errors[0].message`. Show it as it is, or your own words for its code, and match codes, not sentences, in your code: sentences can change. A few sentences speak of the card's own sign-in or button, such as `Finish the sign-in on the card first.`: in your product, that is your Connect step.

### SetupCardApply refusals

| `errorcode` | Sentence | What to do |
|-------------|----------|------------|
| `not_connected` | `<Title> is not connected yet. Finish the sign-in on the card first.` | Run the Connect step, then apply again. The card stays pending. On a `connect` card, `next` names it. |
| `signin_values` | `<Title> connects with its sign-in on the card, not with typed values.` | Don't send `values` to a sign-in `connect` card: connect it, then apply with no `values`. |
| `signin_no_pair` | `This card has no sign-in to finish. Apply it without one.` | The `add` card has no pending sign-in `connect` card. Apply it without `signin`. |
| `signin_many` | `This card brings more than one sign-in. Apply it, then connect each on its own card.` | Apply the `add` card alone, then connect each connector and apply its own `connect` card. |

For a `token` connector, such as Facebook, Instagram, Meta Ads or Shopify, each of these sentences says `token check` where it says `sign-in`: `Facebook connects with its token check on the card, not with typed values.`

Refusals with no `errorcode`:

| Sentence | What to do |
|----------|------------|
| `Request parameter [<name>] required`, `action must be apply or dismiss`, `values must be an object of field names and text.` | Fix the request. |
| `Setup from chat is off for this agent.` | Set `chatsetup` to `"all"`, or change the setup from your settings screens. |
| `Agent not found or access denied`, or a sentence that names the workspace to use | Your key can't reach this agent: see [Who may call it](#who-may-call-it). |
| `Only an agent admin can apply setup changes.` (code `97`) | The key's owner can't apply on this agent. |
| `Wait until the agent finishes this reply, then apply it.` | Enable Apply once the reply ends. |
| `This setup card was not found.` | Wrong `messageguid` or `cardid`, or a message the key's owner can't see. |
| `This card was already applied.`, `This card was already dismissed.`, `This card was already failed.` | Show the card from `setup` in its state. |
| `This card is being applied. Try again in a moment.`, `The card could not be applied right now. Try again in a moment.`, `Another change to this agent's connectors or skills is being applied. Try again in a moment.` | Someone is acting on this card, or on the agent's connectors and skills, right now. Let the person try again after a few seconds. |
| `Apply card <N> first: it turns on <Title>.` | Apply the `add` card first, or send the key with the `add` card. |
| `Send values or signin, not both.` | Send one of them. |
| `This card takes no key. Apply it without one.`, `This card brings more than one key. Apply it, then add each key on its own card.` | `values` on an `add` card that can't take them. |
| `<Connector> needs its key.` | `values` held no field with a value. |
| `<Connector> takes only its own fields from a chat card.`, `<Label> must be text.`, `<Label> is too long.` | A field name the connector doesn't have, a value that isn't text, or one over 4,096 characters. Nothing was saved. |
| `Saved <fields> for <Connector>. Still needed: <fields>.` | Send the missing fields with the same card. |
| `Saved <fields> for <Connector>. It is not connected yet: finish it in the agent's settings.` | The fields are saved, and the connector still doesn't read connected: finish it in your settings screen for it. |
| A field's sentence, such as `Serper API Key must be at least 20 characters` | Show it next to the field. Nothing was saved. |
| `<Title> is connected in the agent's settings, not from chat.` | A `page` connector: `next` names it with `mode: "page"`. |
| `<Connector> is not connected: <Add> was not added.`, `<Title> is connected, but <Add> was not added.` | In `paired[0].error`, the first with `values` and the second with `signin: true`, when the `add` card failed: its `connect` card stays pending. When the `add` card's change waits for another change instead, both cards stay pending, and `paired[0].error` reads `Another change to this agent's connectors or skills is being applied. Try again in a moment.`, as `errors[0].message` does. |
| `The setup card could not be applied. Try again.` | Something went wrong. Read the card again with `Message/Detail` before you offer to try again. |

These refusals carry `code` `0`, except the rights refusal, whose `code` is `97`. Check what you can before you call: that the reply has ended, that `chatSetup` is `"all"`, and that the card is pending in your copy.

A card that fails as it is applied gets `status: "failed"` and its sentence in `setup.error`, and the answer is `result: false` with the same sentence. The usual ones are `This agent's connectors or skills changed after the card was made. Ask the agent again.`, `This skill changed after the card was made. Ask the agent again.`, `<Title> is disconnected in the agent's settings.` and `The change could not be applied. Try again in a moment.`, when Wiro couldn't make the change. Show it on the card. A failed card can't be applied again: the person asks the agent for a new one.

### Account list codes

`SetPickerAccounts` and `DiscoverPickerItems` answer these in `errorcode`, with a sentence in `errors[0].message` that speaks of a sign-in or of a token check, as the list came from one or the other. `not_listed`, for example, reads `Choose accounts from the list the sign-in returned.` or `Choose accounts from the list the token check returned.` The sentences are listed under [`SetPickerAccounts`](/docs/agent-credentials#post-useragentoauthsetpickeraccounts).

| `errorcode` | Meaning | What to show |
|-------------|---------|--------------|
| `flow_expired` | No account list is open: no sign-in or check was started, it was over 15 minutes ago, a save already used its list, or the connector was disconnected. | "The connection timed out", and the Connect button again. |
| `flow_other_person` | Another account started the current sign-in or check. | The Connect button again. |
| `flow_replaced` | The `flowid` you sent isn't the current one: a newer sign-in or check replaced it. | Use the newer one, or connect again. |
| `flow_failed` | The current sign-in or check failed. `OAuthStatus` shows why in `flow.errorcode`. | The reason, and the Connect button. |
| `flow_waiting` | The sign-in hasn't come back from the provider yet, so there is no list. | Keep waiting for the person to finish; don't start a new sign-in, which would replace it. |
| `not_listed` | An id you sent isn't on the list the sign-in or check returned. | Pick again from `candidates`. |
| `next_expired` | Both steps in one call, but the second step's discovery is missing or more than five minutes old. | Call `DiscoverPickerItems` with `parents` again. |
| `next_required` | Both steps in one call for Google Business Profile with no location picked. | Ask for at least one location. |
| `too_many_parents` | More than 50 Meta ad accounts, or more than 20 Business Profile accounts, for the second step. | Ask the person to pick fewer. |

### OAuthConnect refusals

Before it starts a sign-in, `OAuthConnect` can refuse with one of these sentences. Nothing starts then, and a sign-in already under way stays as it is.

| Sentence | What to do |
|----------|------------|
| `Request parameter [redirecturl] required`, `Invalid redirect URL` | Send an https `redirecturl` you control, or an http one on `localhost` or `127.0.0.1` while you develop. |
| `<Title> credentials not configured` | The app keys of `authmethod: "own"` aren't saved: save them with `CredentialUpsert` first. |
| `Unsupported connection mode for <Title>` | `authmethod` isn't in the connector's `connection_modes`. |
| `Sign-in with the platform's app is not enabled for <Title>` | `authmethod: "wiro"`, sent or taken as the default, while the connector's `wiro_connect_pending` is `true`: use `own` or `api_key`. |
| `<Field> is required`, `Invalid <Field>` | A saved field the sign-in needs is missing or malformed, such as Shopify's shop domain: save it with `CredentialUpsert`. |
| `User agent not found or unauthorized` | Your key's owner can't manage this agent. |

Reddit also refuses until Wiro has set the approvals it reviews, with sentences such as `The platform must verify Reddit Data API approval for this app before connecting.`

### Return codes on your redirect URL

After a sign-in, the browser comes back to your `redirecturl` with `<prefix>_error=<code>` when it failed:

| Code | What to show |
|------|--------------|
| `authorization_denied` | The person cancelled, or the provider refused. Offer to connect again. |
| `session_expired` | More than 15 minutes passed. Connect again. |
| `flow_replaced` | A newer sign-in replaced this one. Nothing was saved. |
| `token_exchange_failed` | The provider gave no usable token, for example because the app's client secret is wrong. Check the app keys. |
| `no_accounts`, `no_pages` | The sign-in worked, but there is nothing to pick. Say what to create first, such as a GA4 property. |
| `account_list_too_large` | More than 2,000 accounts to pick from. Connect with a login that sees fewer. |
| `useragent_not_found` | Before the sign-in came back, the agent was deleted, or the person who started the sign-in, your key's owner, could no longer manage it. Nothing was saved. |
| `internal_error`, or any other code | Something went wrong. Offer to connect again. |

Some connectors add their own codes, listed on their integration pages and in [Callback success and error parameters](/docs/agent-credentials#callback-success-error-parameters), and Merchant Center can add `mc_error_detail` with the provider's status, such as `PERMISSION_DENIED`.

A callback that can't be matched to a sign-in, because it came without its `state` or more than 24 hours after `OAuthConnect`, can't return to your page. It ends on a plain page of the API's own, `/v1/UserAgentOAuth/SignInNotFinished` on the API's host, which names no brand and links nowhere: it says the sign-in could not be finished and the window can be closed, and shows the code (`missing_params`, `session_expired` or `internal_error`). Your return page hears nothing then, so when a popup doesn't report back, read `OAuthStatus` and offer to connect again.

### Token check codes

A token check that fails answers `OAuthConnect` with `result: false`, a sentence, `flowid`, `errorcode` and `restart`, such as `direct_token_missing` (the token or `authmethod: "api_key"` isn't saved), `direct_token_invalid`, `no_accounts`, `no_pages`, `too_many_pages`, `account_list_too_large`, `direct_picker_unavailable`, `provider_rejected_request`, `provider_request_failed` or `provider_timeout`. Show the sentence, and let the person paste a new token. `restart` is `"scheduled"` when the failed check removed a connection the agent was using. Each integration page lists its codes.

## Restarts

### When the agent restarts

An agent loads its setup when it starts, so most changes restart it:

- `add`, `remove`, `connect` (a key saved), `disconnect` and `timezone` cards, a `schedule` or `skill` card that creates one, a `schedule` card that changes `cron`, and `pause`, `resume`, `delete`, `disable` and `enable` cards.
- A card that changes only the text of a custom skill or scheduled task (`append`, `revert`, or an `update` that keeps the schedule) reaches a running agent without a restart.
- A sign-in `connect` card writes nothing: the connection restarted the agent if it needed to, so its apply answers `restarting: false`.
- One change, one restart. An `add` card applied with its key, or with `signin: true`, restarts the agent once for both cards, and a change made while a restart is still stopping or queued loads with that restart.
- A connection made with a sign-in, app keys or a token check while nothing on the agent uses the connector restarts nothing, which is why connecting first and then applying the `add` card with `signin: true` restarts the agent once. Fields saved with `CredentialUpsert` for a connector that has no sign-in, a `key` connector or a `page` one such as Google Drive, restart a starting or running agent whenever a saved value changes, whether or not anything on the agent uses the connector.
- An agent that is stopped doesn't start: it loads the change when it next starts, and `restarting` is `false`.

`restarting` in the `SetupCardApply` answer and in `setupresult` says whether this change restarts the agent.

### Status values

Read the agent's `status` with [`POST /UserAgent/Detail`](/docs/agent-overview#post-useragentdetail) `{ "guid": "<useragentguid>" }`:

| `status` | During a restart |
|----------|------------------|
| `1` Stopping | The agent is shutting down to start again. |
| `2` Queued | It waits to start. |
| `3` Starting | It is starting. |
| `4` Running | Ready for messages again. |

A restart takes about a minute. If the poll reads `0` (stopped), `5` (error) or `6` (setup required) instead, the agent won't start by itself: stop polling and say so. `0` and `5` start again with [`POST /UserAgent/Start`](/docs/agent-overview#post-useragentstart), and `6` needs its missing connector first; see [UserAgent Statuses](/docs/agent-overview#useragent-statuses).

### Showing a restart

When an answer says the agent restarts, show a line such as "Restarting to load the change, about a minute" above the message box, and poll `UserAgent/Detail` every five seconds until `status` is `4`. Then hide the line. You can leave the message box on: a message sent too early gets a clear refusal you can show.

Each call says it in its own field:

| Call | Says the agent restarts with |
|------|------------------------------|
| `SetupCardApply`, and `Message/Send` in `setupresult` | `restarting: true` |
| `OAuthConnect` (a token check), `SetPickerAccounts`, `CredentialProjectBind` | `restart: "scheduled"` |
| `OAuthStatus`, after a sign-in came back | `flow.restart: "scheduled"` |
| `CredentialUpsert`, `UpdateSettings` | Nothing. After a save that can restart the agent, such as a connector's key or fields, or `chatsetup` changed from or to `"off"`, poll `UserAgent/Detail` the same way. |

So when a sign-in `connect` card's connector is on already, the connection itself restarts the agent through these calls, and the card's apply then answers `restarting: false`.

### Messages during a restart

While the agent isn't running, `Message/Send` answers `result: false` with `agentstatus` and one of these sentences, shown as they are:

| `agentstatus` | Sentence |
|---------------|----------|
| `1` | `Agent is restarting. Please wait a moment and try again.` (or `Agent is stopping. Please wait a moment and try again.` when it stops for good) |
| `2`, `3` | `Agent is starting up. Please wait a moment and try again.` |
| `0` | `Agent is stopped. Start it before sending messages.` |
| `5` | `Agent is in error state. Restart it before sending messages.` |
| `6` | `Agent setup is incomplete. Complete the setup before sending messages.` |

Before this refusal, Wiro still answers the replies it handles itself:

- A `yes` that lists or applies a card other than a `connect` card, and a `yes` while a sign-in `connect` card waits.
- A key for a `key` connect card that is the only `connect` card waiting, while its connector is on the agent or a pending `add` card on the same reply brings it. Another service's key is answered too, whoever sends it, once that card's connector is on the agent, and nothing is saved: `That does not look like a <Title> key (it looks like <kind>), so it was not saved. Paste the <Title> key as your reply.` The part in brackets comes only when Wiro knows the kind, and before a title that starts with a vowel, `a` becomes `an`, as in `an Apollo key`. While the connector isn't on the agent yet, as while the `add` card that brings it still waits, another service's key is only taken out, and the message gets the refusal.
- Such a `yes`, or a key for the waiting `key` card, from a sender who isn't an agent admin, answered `Only an agent admin can apply setup changes.`
- A `no` that turned pending cards down, answered `The setup change was turned down.` or `The <N> setup changes were turned down.`

Every other message gets the refusal, a `yes` while only `key` connect cards wait, a key while more than one `connect` card waits, and a `yes` or `no` with no pending card included. A turn still running when the restart began, in another session for example, ends as `agent_error` with `[TURN_INTERRUPTED]`: offer to send it again.

## Chats Without Cards

Your chat can work with text alone, or people may type `yes` even where you show cards. Wiro then reads the reply itself.

### Typed replies

- **Approve.** A message that is only an approval, such as `yes`, `ok`, `approve`, `go ahead`, `evet` or `👍`, acts on the pending cards of the agent's latest reply in the same `sessionkey`, when they are less than 30 minutes old. In a chat sent with your API key, the first approval applies nothing: Wiro answers with the card listing, the exact content of the cards. A second one applies the one card listed. With several cards, `yes 2` applies card 2 once the listing has shown it, one card per reply.
- **Turn down.** A message that is only a refusal, such as `no` or `cancel`, dismisses the pending cards of the latest reply that are less than 30 minutes old, then goes to the agent as a normal message. Older cards aren't dismissed, and the `no` goes to the agent all the same. While the agent isn't running, Wiro answers it itself: `The setup change was turned down.`, or `The <N> setup changes were turned down.` for several cards. Anyone who can write in the chat can turn cards down.
- **A key as the reply.** When the latest reply has one pending `connect` card for a key connector, a key pasted as the reply can be saved to it with your key owner's rights. Wiro reads the key for that card only while its connector is on the agent or a pending `add` card on the same reply brings it; otherwise the key is only taken out, as in any other message. While the connector is on the agent, the key is saved, and the message is stored as `[key saved to <Connector title>]`. While a pending `add` card still brings the connector, the key is read for its card but not saved, since the `add` card goes first: Wiro answers `⚠️ Not saved: Apply card <N> first: it turns on <Title>. Paste the key again as your reply.`, the message is stored with `[key removed]` in its place, and both cards stay pending. The one exception is a chat sent with your API key when the only pending cards are an `add` card and its `connect` card, and the key is all the connector needs: the key typed after the listing applies both cards at once. A key typed before that listing saves nothing: the message is stored with `[key removed]` in its place, and Wiro answers with the listing.
- A `yes` never applies a `connect` card: a key or a sign-in connects it.

The latest reply is the newest row of the session, other than the replies Wiro answers itself and model switches. A row added between turns counts, such as a scheduled task's report written into that session: once it comes, a `yes` or `no` typed after it finds no cards. Your buttons still act on those cards, since `SetupCardApply` takes a pending card by its `messageguid` and `cardid`, at any age.

A message counts as an approval or a refusal when it is sent with no attachment and has at most four words, no question mark and nothing but these words. Case, accents and other punctuation don't matter:

| Kind | Words |
|------|-------|
| Approval | `yes`, `y`, `yeah`, `yep`, `yup`, `ok`, `okay`, `sure`, `approve`, `approved`, `confirm`, `confirmed`, `apply`, `lgtm`, `do it`, `go ahead`, `go for it`, `sounds good`, `looks good`, `please do`, `of course`, `evet`, `e`, `tamam`, `tamamdır`, `olur`, `onay`, `onayla`, `onaylıyorum`, `onayladım`, `uygula`, `kabul`, `kabul ediyorum`, `ja`, `oui`, `si`, `sim`, `da`, `hai`, `👍`, `✅`, `✔` |
| Refusal | `no`, `n`, `nope`, `nah`, `cancel`, `stop`, `don't`, `do not`, `never mind`, `not now`, `hayır`, `yok`, `iptal`, `vazgeç`, `vazgeçtim`, `istemiyorum`, `nein`, `non`, `não` |
| Courtesy, allowed next to either | `please`, `pls`, `plz`, `thanks`, `thx`, `ty`, `thank you`, `lütfen`, `teşekkürler`, `teşekkür ederim`, `sağol`, `sağolun`, `bitte`, `danke`, `merci`, `gracias`, `por favor` |
| A card number, with an approval | One number from 1 to 3, as in `yes 2`, `apply #1`, `evet 3` or `yes card 2` |

If people who must not change the agent can write in your chat, hold back from Wiro the messages that are only these words, and a key sent while a `key` connect card waits, or set `chatsetup` to `"off"` for that agent. The full rules are in [Approving a setup card](/docs/agent-messaging#approving-setup-cards).

### Listing the cards

The first `yes` in a chat sent with your API key gets the listing:

```json
{
  "result": true,
  "errors": [],
  "messageguid": "e5f6a7b8-c9d0-1234-ef56-789012345678",
  "agenttoken": null,
  "status": "agent_end",
  "response": "The agent proposes this setup change. Nothing is applied yet.\n\nCard 1: Add Google Analytics 4 (connector).\nStill to connect: Google Analytics 4.\n\nReply \"yes\" to apply exactly this change, or \"no\" to turn it down.",
  "content": "yes",
  "setupresult": { "applied": [], "dismissed": [], "failed": [], "restarting": false }
}
```

Show `response` as it is. Its lines are described in [The card listing](/docs/agent-messaging#setup-card-listing).

### setupresult and next

| Field | Description |
|-------|-------------|
| `applied` | Ids of the cards applied. |
| `dismissed` | Ids of the cards turned down. |
| `failed` | `[{ id, error }]` for cards that failed. |
| `restarting` | `true` when the agent restarts to load the change. |
| `next` | Only when the answer leaves connectors to connect: `[{ connector, title, mode, cardid?, messageguid? }]`, as in [Your Own Connect Button](#your-own-connect-button). |

The second `yes`, which applies an `add` card whose sign-in `connect` card still waits:

```json
{
  "result": true,
  "errors": [],
  "messageguid": "f6a7b8c9-d0e1-2345-f678-901234567890",
  "agenttoken": null,
  "status": "agent_end",
  "response": "✅ Applied: Google Analytics 4 added.\nYour agent is restarting to load the change.\nNext: connect Google Analytics 4 to finish. Its sign-in, app keys or token are entered outside this chat, never in it.",
  "content": "yes",
  "setupresult": {
    "applied": ["71xb9zrcd1sb"],
    "dismissed": [],
    "failed": [],
    "restarting": true,
    "next": [
      {
        "connector": "ga4",
        "title": "Google Analytics 4",
        "mode": "appkeys",
        "cardid": "ljehd9inazm4",
        "messageguid": "c3d4e5f6-a7b8-9012-cdef-345678901234"
      }
    ]
  }
}
```

Show `response`, and under it a "Connect Google Analytics 4" button built from `next`. A `yes` while only `connect` cards wait, one of them a sign-in card, applies nothing and answers `A yes cannot connect <Title>. Its sign-in, app keys or token are entered outside this chat, never in it.`, with the cards in `setupresult.next`. A webhook posted for these replies carries the same list in `metadata.next`.

### The answer lines

Wiro writes these lines in `response`, always in English. They name no site, page or link:

| Line | When |
|------|------|
| `✅ Applied: <summary>.` | A card was applied. An `add` card that brings a `page` connector, or a sign-in connector with no `connect` card on the message, goes on with `Connect <Title> in the agent's settings.` |
| `⚠️ Not applied: <reason>` | The change failed. |
| `1 more setup change is still pending.`, `<N> more setup changes are still pending.` | A `yes` applied one card while other cards of the reply wait. |
| `<N> connector cards still need their keys: add each key on its card.` | Several `key` connect cards wait. |
| `This setup change was already handled.` | Someone acted on the card first, or it is gone. |
| `This setup change is being applied right now. Try again in a moment.` | Another call is applying the card. |
| `Your agent is restarting to load the change. Continue in about a minute.` | The change restarts the agent (shorter when a `Next:` line follows). |
| `Next: paste your <Title> key as your reply.` | A key `connect` card waits for its key. While the agent restarts, it goes on with `Send it now and it loads with this same restart.` |
| `Next: connect <Title> to finish. Its sign-in, app keys or token are entered outside this chat, never in it.` | An `add` card was applied and its sign-in `connect` card waits. |
| `A yes cannot connect <Title>. Its sign-in, app keys or token are entered outside this chat, never in it.` | A `yes` while only `connect` cards wait, one of them a sign-in card. |
| `Saved <fields> for <Connector>. Still needed: <fields>.` | A key was saved and the connector needs more fields. |
| `⚠️ Not saved: <reason>. Paste the key again as your reply.` | The key was refused. Nothing was saved. |
| `That does not look like a <Title> key (it looks like <kind>), so it was not saved. Paste the <Title> key as your reply.` | The key pasted is another service's, and the only `connect` card waiting is a `key` connect card whose connector is on the agent. It comes whoever sent the key. The part in brackets is there only when Wiro knows the kind. Before a title that starts with a vowel, `a` becomes `an`, as in `an Apollo key`. |
| `⚠️ Not saved: <Add title> is still waiting. Reply "yes" to add it, or "no" to turn it down.` | A key typed for an `add` card whose `connect` card no longer waits. |
| `This card is older than 30 minutes. Use the card's button, or ask the agent again.` | The card turned 30 minutes old while the reply was read. In your product, offer your own button, or ask the agent again. |
| `Only an agent admin can apply setup changes.` | The sender can't apply changes. |
| `The setup change was turned down.`, `The <N> setup changes were turned down.` | A `no` while the agent isn't running. |

The full list is in [Wiro's answers](/docs/agent-messaging#setup-reply-lines).

## Security Rules

- **Keys never go into chat messages.** Collect keys, app keys and tokens in your own forms and send them with `SetupCardApply` `values` or `CredentialUpsert`. The agent never sees them. While setup from chat is on for a message, Wiro takes clear keys out of it before it is stored or reaches the agent: each one reads `[key removed]` in the stored text and in the text the agent gets, and Send answers `contentmasked: true` with that text in `content`. A key pasted as the reply while a `key` connect card is the only `connect` card waiting can be saved to its connector, when that connector is on the agent or a pending `add` card on the same reply brings it, and is then stored as `[key saved to <Connector title>]`. This runs only while setup from chat is on for the message, so treat it as a safety net, never as a way to send keys. See [Keys in chat](/docs/agent-messaging#keys-in-chat).
- **Saved secrets read as a mask.** `UserAgent/Detail` shows every saved `password` or `fileinput-base64` field as `"••••••••"`, for every caller, and returns no OAuth token and no OAuth app key at all. Show "Saved" instead of a value, and let people replace a secret, not read it.
- **The mask sent back keeps the saved value.** A field sent to `CredentialUpsert` as `"••••••••"` isn't written, so a form saved as Detail showed it changes only the fields edited. In a list sent whole, such as `firebase.accounts`, an entry whose secret is the mask keeps the secret of the saved entry with the same values in its other fields. When no single saved entry matches, because those values changed or two saved entries share them, the request is refused and nothing is saved: send that entry's secret again. See [Field-level write rules](/docs/agent-credentials#field-level-write-rules).
- **Which service account a key file is.** A saved Google service account file (Google Drive, Google Play and Google Calendar's `serviceaccountjson`, and each Firebase account's) reads as the mask too. So that you can show which account it is, the address people share a Drive folder, the Play Console or a calendar with, the agent's owner and team admins get `_service_account_email` in that connector's group of `credentials`, in `UserAgent/Detail` and in the `Deploy` and `Update` answers: `"_service_account_email": { "serviceaccountjson": "agent@acme-project.iam.gserviceaccount.com" }`, or for Firebase `"_service_account_email": { "accounts": [{ "serviceaccountjson": "push@acme-project.iam.gserviceaccount.com" }] }`, one item per account in the list's order. A value is `""` when nothing is saved or the file doesn't read as a service account key. Only the account's address leaves the file. Leave the key out of what you send back: field names that start with `_` are refused.
- **Approvals act with your key's rights.** Show Apply only to the people allowed to change the agent, hold back everyone else's typed approvals (see [Typed replies](#typed-replies)), check that a `messageguid` belongs to the session of the person who clicked, and use `chatsetup: "off"` for agents whose users must not change them.
- **Your key's owner stays in your backend.** Message rows carry your key owner's `uuid` and `user` (name, email, avatar), and cards its `uuid`, whoever of your users wrote: show your own names instead.
- **Your API key stays on your server.** Your app calls your backend, and your backend calls Wiro. A browser holds at most the `agenttoken` and `sessiontoken` of its own person's chats.
- **Sign-ins come back to your page.** The `redirecturl` receives only status parameters and the accounts to pick, never a token or a secret. A callback that can't be matched to a sign-in ends on the API's own neutral page instead (see [Return codes](#return-codes-on-your-redirect-url)).

## Worked Examples

Each example starts with a person's message in your chat and ends with the change applied. Each one starts from the same agent as it was before any of them: Chat Markdown Reporting is on, and none of the examples' connectors are. The ids are the same throughout: the agent `f8e7d6c5-b4a3-2190-fedc-ba0987654321`, and `5f0c9a2e-1b7d-4c3a-9e8f-2a6b7c8d9e0f`, your key owner's account, on every message and card. The agent's own words vary from turn to turn.

### Google Analytics 4 with your own app keys

**1. The person asks.** `Message/Send` with `{ "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321", "sessionkey": "customer-42", "message": "Can you report our website traffic every Monday?" }` answers `{ "result": true, "errors": [], "messageguid": "c3d4e5f6-a7b8-9012-cdef-345678901234", "agenttoken": "aB3xK9mR2pLqWzVn7tYhCd5sFgJkNb", "status": "agent_queue" }`.

**2. The reply ends.** `Message/Detail` with `{ "messageguid": "c3d4e5f6-a7b8-9012-cdef-345678901234" }`:

```json
{
  "result": true,
  "errors": [],
  "data": {
    "guid": "c3d4e5f6-a7b8-9012-cdef-345678901234",
    "uuid": "5f0c9a2e-1b7d-4c3a-9e8f-2a6b7c8d9e0f",
    "agenttoken": "aB3xK9mR2pLqWzVn7tYhCd5sFgJkNb",
    "user": {
      "uuid": "5f0c9a2e-1b7d-4c3a-9e8f-2a6b7c8d9e0f",
      "firstname": "Ada",
      "lastname": "Lovelace",
      "email": "ada@example.com",
      "username": "ada",
      "avatar": "",
      "avatarinitials": "AL"
    },
    "sessionkey": "customer-42",
    "content": "Can you report our website traffic every Monday?",
    "response": "I can do that once Google Analytics 4 is on and connected. Approve the card below and connect your Google Analytics account.",
    "debugoutput": "I can do that once Google Analytics 4 is on and connected. Approve the card below and connect your Google Analytics account.",
    "timeline": [
      {
        "blockid": "c0:i0",
        "callindex": 0,
        "contentindex": 0,
        "type": "answer",
        "text": "I can do that once Google Analytics 4 is on and connected. Approve the card below and connect your Google Analytics account.",
        "phase": "end",
        "version": 4,
        "startedat": 1794654805,
        "updatedat": 1794654811
      },
      {
        "blockid": "s:71xb9zrcd1sb",
        "type": "setup",
        "callindex": 1000000,
        "contentindex": 0,
        "text": null,
        "setup": {
          "v": 1,
          "id": "71xb9zrcd1sb",
          "kind": "add",
          "key": "int-ga4-analytics",
          "needs": [{ "connector": "ga4", "title": "Google Analytics 4", "mode": "appkeys" }],
          "requestedby": "5f0c9a2e-1b7d-4c3a-9e8f-2a6b7c8d9e0f",
          "createdat": 1794654811
        },
        "phase": "end",
        "version": 1,
        "startedat": 1794654811,
        "updatedat": 1794654811
      },
      {
        "blockid": "s:ljehd9inazm4",
        "type": "setup",
        "callindex": 1000000,
        "contentindex": 1,
        "text": null,
        "setup": {
          "v": 1,
          "id": "ljehd9inazm4",
          "kind": "connect",
          "connector": "ga4",
          "requestedby": "5f0c9a2e-1b7d-4c3a-9e8f-2a6b7c8d9e0f",
          "createdat": 1794654811
        },
        "phase": "end",
        "version": 1,
        "startedat": 1794654811,
        "updatedat": 1794654811,
        "next": [{ "connector": "ga4", "title": "Google Analytics 4", "mode": "appkeys" }]
      }
    ],
    "status": "agent_end",
    "metadata": {
      "type": "progressGenerate",
      "task": "Generate",
      "speed": "21.0",
      "speedType": "words/s",
      "elapsedTime": "6.2s",
      "tokenCount": 38,
      "wordCount": 23
    },
    "attachments": [],
    "deletestatus": 0,
    "createdat": 1794654804,
    "startedat": 1794654805,
    "endedat": 1794654811,
    "inputtokens": 4210,
    "outputtokens": 160,
    "cachereadtokens": 3072,
    "cachewritetokens": 0,
    "totaltokens": 7442,
    "model": "openai/gpt-5.6-sol",
    "tokencost": 4,
    "processedms": 6200
  }
}
```

The row's `uuid` and `user` are your key owner's, whoever of your users wrote the message: show your own name for the sender. The fields of the row are described in [`Message/Detail`](/docs/agent-messaging#post-useragentmessagedetail).

**3. Your app shows one card**, "Add Google Analytics 4", with a "Connect Google Analytics 4" step: the Client ID and Client Secret fields and the redirect URI from `OAuthStatus`, and an Add button that waits for the connection. The `connect` card is drawn inside the `add` card, not on its own.

**4. The person connects.** Your backend runs the calls of [Own app keys](#own-app-keys-google-analytics-4), compact here:

```text
OAuthStatus        { "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321", "credentialkey": "ga4" }
                -> { "result": true, "errors": [], "connected": false, "accounts": [], "connectedat": "", "tokenexpiresat": "", "authmethod": "", "redirecturi": "https://api.wiro.ai/v1/UserAgentOAuth/GA4Callback", "appkeyssaved": false, "tokensaved": false }
CredentialUpsert   { "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321", "fields": [{ "credentialkey": "ga4", "fieldname": "clientid", "fieldvalue": "1234567890-abc.apps.googleusercontent.com" }, { "credentialkey": "ga4", "fieldname": "clientsecret", "fieldvalue": "GOCSPX-THE_CLIENT_SECRET" }, { "credentialkey": "ga4", "fieldname": "authmethod", "fieldvalue": "own" }] }
                -> { "result": true, "applied": 3, "errors": [] }
OAuthConnect       { "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321", "credentialkey": "ga4", "authmethod": "own", "redirecturl": "https://app.example.com/connect/done?ref=conn_8812" }
                -> { "result": true, "errors": [], "authorizeUrl": "https://accounts.google.com/o/oauth2/v2/auth?...", "flowid": "9d2c41e07ab35f8e6c1d0b9a87f6e5d4" }
(browser)          Google account chooser and consent, then back to /connect/done?ref=conn_8812&ga4_connected=true&ga4_properties=[...]
OAuthStatus        { "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321", "credentialkey": "ga4" }
                -> { ..., "flow": { "flowid": "9d2c41e07ab35f8e6c1d0b9a87f6e5d4", "mine": true, "mode": "own", "status": "candidates", ... }, "candidates": [{ "id": "123456789", "name": "Acme Web" }, { "id": "987654321", "name": "Acme App" }] }
SetPickerAccounts  { "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321", "credentialkey": "ga4", "flowid": "9d2c41e07ab35f8e6c1d0b9a87f6e5d4", "accountids": ["123456789"] }
                -> { "result": true, "errors": [], "accounts": [{ "id": "123456789", "name": "Acme Web" }], "restart": "none" }
```

**5. The person presses Add.** `SetupCardApply` with `{ "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321", "messageguid": "c3d4e5f6-a7b8-9012-cdef-345678901234", "cardid": "71xb9zrcd1sb", "action": "apply", "signin": true }` answers as shown in [step 8](#own-app-keys-google-analytics-4): both cards `applied`, `summary` `Google Analytics 4 added. Google Analytics 4 connected.` and `restarting: true`.

**6. The agent restarts.** Your app shows "Restarting" and polls `UserAgent/Detail` until `status` is `4`. The person then asks again, and the agent proposes the scheduled task: a `schedule` card that your Apply button applies with `SetupCardApply`, as in [Applying and Dismissing](#applying-and-dismissing). Each Monday's report then comes as a message added between turns, in the agent's most recent session: see [Load a conversation](#load-a-conversation).

If the person typed `yes` instead of pressing Add, the first `yes` gets the listing and the second applies the `add` card alone; see [setupresult and next](#setupresult-and-next). Its `next` names the `connect` card: after the connection, apply it with `{ "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321", "messageguid": "c3d4e5f6-a7b8-9012-cdef-345678901234", "cardid": "ljehd9inazm4", "action": "apply" }`. Applied before the connection, it answers:

```json
{
  "result": false,
  "errors": [{ "code": 0, "message": "Google Analytics 4 is not connected yet. Finish the sign-in on the card first.", "time": 1794654845 }],
  "setup": {
    "v": 1,
    "id": "ljehd9inazm4",
    "kind": "connect",
    "connector": "ga4",
    "requestedby": "5f0c9a2e-1b7d-4c3a-9e8f-2a6b7c8d9e0f",
    "createdat": 1794654811
  },
  "restarting": false,
  "summary": "",
  "errorcode": "not_connected",
  "next": [
    {
      "connector": "ga4",
      "title": "Google Analytics 4",
      "mode": "appkeys",
      "cardid": "ljehd9inazm4",
      "messageguid": "c3d4e5f6-a7b8-9012-cdef-345678901234"
    }
  ]
}
```

and after it:

```json
{
  "result": true,
  "errors": [],
  "setup": {
    "v": 1,
    "id": "ljehd9inazm4",
    "kind": "connect",
    "connector": "ga4",
    "requestedby": "5f0c9a2e-1b7d-4c3a-9e8f-2a6b7c8d9e0f",
    "createdat": 1794654811,
    "status": "applied",
    "actedat": 1794655020,
    "actedby": "5f0c9a2e-1b7d-4c3a-9e8f-2a6b7c8d9e0f"
  },
  "restarting": false,
  "summary": "Google Analytics 4 connected"
}
```

That way restarts the agent twice: once for the `add` card, and once when the connection completes.

### Facebook Pages with a token

**1. The person asks** "Post our weekly offer on our Facebook Page." The reply's timeline ends with two setup blocks:

```json
[
  {
    "blockid": "s:z9n62skddnwz",
    "type": "setup",
    "callindex": 1000000,
    "contentindex": 0,
    "text": null,
    "setup": {
      "v": 1,
      "id": "z9n62skddnwz",
      "kind": "add",
      "key": "int-facebookpage-post",
      "with": ["util-anti-ai-human-copy", "util-social-posting-common"],
      "needs": [{ "connector": "facebook-pages", "title": "Facebook", "mode": "token" }],
      "requestedby": "5f0c9a2e-1b7d-4c3a-9e8f-2a6b7c8d9e0f",
      "createdat": 1794654811
    },
    "phase": "end",
    "version": 1,
    "startedat": 1794654811,
    "updatedat": 1794654811
  },
  {
    "blockid": "s:02e5m6mt4ktl",
    "type": "setup",
    "callindex": 1000000,
    "contentindex": 1,
    "text": null,
    "setup": {
      "v": 1,
      "id": "02e5m6mt4ktl",
      "kind": "connect",
      "connector": "facebook-pages",
      "requestedby": "5f0c9a2e-1b7d-4c3a-9e8f-2a6b7c8d9e0f",
      "createdat": 1794654811
    },
    "phase": "end",
    "version": 1,
    "startedat": 1794654811,
    "updatedat": 1794654811,
    "next": [{ "connector": "facebook-pages", "title": "Facebook", "mode": "token" }]
  }
]
```

**2. Your app shows** "Add Facebook Page Post", "Also turns on: Anti-AI Human Copy, Social Posting Common Rules", and a "Connect Facebook" step with a System User token field. Titles come from `Skills/List`.

**3. The person pastes the token and presses Connect:**

```text
CredentialUpsert   { "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321", "fields": [{ "credentialkey": "facebook-pages", "fieldname": "authmethod", "fieldvalue": "api_key" }, { "credentialkey": "facebook-pages", "fieldname": "systemusertoken", "fieldvalue": "THE_SYSTEM_USER_TOKEN" }] }
                -> { "result": true, "applied": 2, "errors": [] }
OAuthConnect       { "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321", "credentialkey": "facebook-pages", "authmethod": "api_key" }
                -> { "result": true, "errors": [], "flowid": "4b1f0c7a9e2d4c1b8a7f6e5d4c3b2a19", "accounts": [{ "id": "1029384756", "name": "Acme" }, { "id": "5647382910", "name": "Acme Outlet" }], "account": "Acme Marketing System User", "restart": "none" }
```

**4. The person picks the Acme Page and presses Add:**

```text
SetPickerAccounts  { "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321", "credentialkey": "facebook-pages", "flowid": "4b1f0c7a9e2d4c1b8a7f6e5d4c3b2a19", "accountids": ["1029384756"] }
                -> { "result": true, "errors": [], "accounts": [{ "id": "1029384756", "name": "Acme" }], "restart": "none" }
SetupCardApply     { "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321", "messageguid": "c3d4e5f6-a7b8-9012-cdef-345678901234", "cardid": "z9n62skddnwz", "action": "apply", "signin": true }
```

```json
{
  "result": true,
  "errors": [],
  "setup": {
    "v": 1,
    "id": "z9n62skddnwz",
    "kind": "add",
    "key": "int-facebookpage-post",
    "with": ["util-anti-ai-human-copy", "util-social-posting-common"],
    "needs": [{ "connector": "facebook-pages", "title": "Facebook", "mode": "token" }],
    "requestedby": "5f0c9a2e-1b7d-4c3a-9e8f-2a6b7c8d9e0f",
    "createdat": 1794654811,
    "status": "applied",
    "actedat": 1794654990,
    "actedby": "5f0c9a2e-1b7d-4c3a-9e8f-2a6b7c8d9e0f"
  },
  "restarting": true,
  "summary": "Facebook Page Post added. Facebook connected.",
  "paired": [
    {
      "setup": {
        "v": 1,
        "id": "02e5m6mt4ktl",
        "kind": "connect",
        "connector": "facebook-pages",
        "requestedby": "5f0c9a2e-1b7d-4c3a-9e8f-2a6b7c8d9e0f",
        "createdat": 1794654811,
        "status": "applied",
        "actedat": 1794654990,
        "actedby": "5f0c9a2e-1b7d-4c3a-9e8f-2a6b7c8d9e0f"
      },
      "result": true,
      "error": null
    }
  ]
}
```

Had the person pressed Add before the Pages were saved, the answer would be `result: false`, `errorcode: "not_connected"` and `Facebook is not connected yet. Finish the token check on the card first.`, with both cards still pending and that sentence in `paired[0].error`.

**5. The agent restarts once**, and the person's next message reaches it with Facebook connected.

### X with Wiro's app

**1. The person asks** "Post this thread on X for us." The reply holds an `add` card for `int-twitterx-post`, with `with: ["util-anti-ai-human-copy", "util-social-posting-common"]` and `needs: [{ "connector": "twitter", "title": "Twitter / X", "mode": "signin" }]`, and a `connect` card for `twitter` whose block carries `next: [{ "connector": "twitter", "title": "Twitter / X", "mode": "signin" }]`.

**2. Your app shows** "Add Twitter / X Post" with a "Connect Twitter / X" button. No form: X connects with Wiro's app.

**3. The person presses Connect:**

```text
OAuthConnect       { "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321", "credentialkey": "twitter", "authmethod": "wiro", "redirecturl": "https://app.example.com/connect/done?ref=conn_8813" }
                -> { "result": true, "errors": [], "authorizeUrl": "https://x.com/i/oauth2/authorize?...", "flowid": "e1a2b3c4d5e6f708192a3b4c5d6e7f80" }
(browser)          X consent screen, then back to /connect/done?ref=conn_8813&x_connected=true&x_username=acmeco
OAuthStatus        { "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321", "credentialkey": "twitter" }
                -> { "result": true, "errors": [], "connected": true, "accounts": [{ "id": "acmeco", "name": "acmeco" }], ..., "flow": { "flowid": "e1a2b3c4d5e6f708192a3b4c5d6e7f80", "mine": true, "mode": "wiro", "status": "connected", "account": "acmeco", "errorcode": "", "errordetail": "", "restart": "none", "expiresat": 1794655802 } }
```

**4. The person presses Add.** `SetupCardApply` on `add` card `r8k2v6n4p1wa` with `signin: true`:

```json
{
  "result": true,
  "errors": [],
  "setup": {
    "v": 1,
    "id": "r8k2v6n4p1wa",
    "kind": "add",
    "key": "int-twitterx-post",
    "with": ["util-anti-ai-human-copy", "util-social-posting-common"],
    "needs": [{ "connector": "twitter", "title": "Twitter / X", "mode": "signin" }],
    "requestedby": "5f0c9a2e-1b7d-4c3a-9e8f-2a6b7c8d9e0f",
    "createdat": 1794654811,
    "status": "applied",
    "actedat": 1794655010,
    "actedby": "5f0c9a2e-1b7d-4c3a-9e8f-2a6b7c8d9e0f"
  },
  "restarting": true,
  "summary": "Twitter / X Post added. Twitter / X connected.",
  "paired": [
    {
      "setup": {
        "v": 1,
        "id": "t3m9x5c7b2qe",
        "kind": "connect",
        "connector": "twitter",
        "requestedby": "5f0c9a2e-1b7d-4c3a-9e8f-2a6b7c8d9e0f",
        "createdat": 1794654811,
        "status": "applied",
        "actedat": 1794655010,
        "actedby": "5f0c9a2e-1b7d-4c3a-9e8f-2a6b7c8d9e0f"
      },
      "result": true,
      "error": null
    }
  ]
}
```

X's consent screen named Wiro's app. To show your own app there, save your X app's `clientid` and `clientsecret` with `authmethod: "own"`, register `https://api.wiro.ai/v1/UserAgentOAuth/XCallback` in your X app, and start the sign-in with `authmethod: "own"`. The cards apply the same way.

### Serper Web Search with a key

**1. The person asks** "Search the web for our competitors' prices." The reply holds an `add` card `q4n7s1v8b2xd` for `int-serper-search` with `needs: [{ "connector": "serper", "title": "Serper Web Search", "mode": "key" }]`, and a `connect` card `h6w3k9p2m5tc` for `serper`, whose block is the one in [Block fields](#block-fields).

**2. Your app shows** "Add Serper Web Search" with one field, "Serper API Key", from `Credentials/Detail`, and an **Add and connect** button.

**3. The person pastes the key and presses the button.** Your backend sends the `add` card with `values: { "apikey": "..." }`; the answer, and the one for a key that is too short, are in [Key](#key-serper-web-search). The agent restarts once and can search the web.

**In a chat without cards**, the same takes two replies:

```text
Message/Send  "yes"
           -> response: "The agent proposes this setup change. Nothing is applied yet.\n\nCard 1: Add Serper Web Search (connector).\nStill to connect: Serper Web Search.\n\nReply with your Serper Web Search key to add Serper Web Search and connect it at once, \"yes\" to add it now and give the key later, or \"no\" to turn it down."
              setupresult: { "applied": [], "dismissed": [], "failed": [], "restarting": false }
Message/Send  "<the Serper API key>"
           -> content: "[key saved to Serper Web Search]"
              response: "✅ Applied: Serper Web Search added. Serper Web Search connected.\nYour agent is restarting to load the change. Continue in about a minute."
              setupresult: { "applied": ["q4n7s1v8b2xd", "h6w3k9p2m5tc"], "dismissed": [], "failed": [], "restarting": true }
```

A second `yes` instead of the key applies the `add` card alone and answers `Next: paste your Serper Web Search key as your reply. Send it now and it loads with this same restart.`, with the `connect` card in `setupresult.next`. Even here, a form is safer than the chat: send the key from it with `SetupCardApply` `values`.

## Integration Checklist

- Your backend holds the project API key, and your app talks only to your backend. A browser holds at most the `agenttoken` and `sessiontoken` of its own person's chats.
- One agent per customer, deployed with `useprepaid: true`, and `chatsetup` set: `"all"` for setup cards in your chat, `"off"` for agents whose users must not change them.
- Each conversation has its own `sessionkey`, and you check that every `messageguid` a person acts on is in their session.
- Message rows and cards name your key's owner: your UI shows your own names for the sender.
- Messages go out with `Message/Send`; replies are followed on the WebSocket or with `Message/Detail`, and loaded with `Message/History`; rows added between turns arrive on the session's `sessiontoken`.
- Failed turns are told apart by their bracketed code, and an out-of-credits refusal by `agentbalance`.
- Timeline blocks are merged by `blockid` and newer `version`, sorted by `callindex`, `contentindex`, `blockid`, and drawn by `type`; unknown types and kinds are skipped.
- Replies Wiro answers itself (`agenttoken: null`, `status: "agent_end"`) show `response` as plain text.
- Setup cards show the right title, body and buttons for their kind and state, `add` cards together with their `connect` cards.
- Apply waits for the reply to finish; Apply and Dismiss call `SetupCardApply`, and the card updates from the answer's `setup` (which can be `null`) and from later `version` 2 blocks.
- Each connector mode has its flow and its form fields: `key` (fields as `values`), `appkeys` (`CredentialUpsert`, `OAuthConnect` with `own`, the return page, `OAuthStatus`, `SetPickerAccounts`), `token` (`CredentialUpsert`, `OAuthConnect` with `api_key`, `SetPickerAccounts`), `signin` (`OAuthConnect` with `wiro`), and `page` (your settings screens).
- After connecting, the `add` card is applied with `signin: true` (one restart), or the `connect` card is applied.
- `next` from blocks, `SetupCardApply` answers, `setupresult` and webhooks turns into your own Connect buttons.
- Every `result: false` shows its sentence or your own words; code branches on `errorcode`, `flow.status` and the return codes, never on sentences.
- Every restart signal (`restarting`, `restart`, `flow.restart`, and the saves that answer none) shows a restarting line until `UserAgent/Detail` reads `status: 4`, and the poll stops at `0`, `5` or `6`; Send refusals during a restart are shown as they are.
- Typed approvals and pasted keys from people who must not change the agent never reach Wiro.
- Keys never go into chat messages; secrets show as "Saved", and the mask sent back is left alone.
- Your `redirecturl` page handles `<prefix>_connected=true` and `<prefix>_error=<code>`, inside a popup or as a full page, and a popup that never reports back is checked with `OAuthStatus`.

## Related

- [Agent Messaging](/docs/agent-messaging): every messaging endpoint, and the full rules of [Setup From Chat](/docs/agent-messaging#setup-from-chat).
- [Agent WebSocket](/docs/agent-websocket): live events.
- [Agent Webhooks](/docs/agent-webhooks): the callback payload.
- [Agent Credentials & OAuth](/docs/agent-credentials): every credential and OAuth endpoint in detail.
- [Agent Overview](/docs/agent-overview): Deploy, Detail, UpdateSettings and restarts.
- The integration pages, such as [Google Analytics 4](/docs/integration-ga4-skills), [Facebook Page](/docs/integration-facebook-skills), [Twitter / X](/docs/integration-twitter-skills) and [Serper Web Search](/docs/integration-serper-search-skills): each connector's own setup.
