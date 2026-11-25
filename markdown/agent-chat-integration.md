# Agent Chat Integration

Build your own chat for a Wiro agent, setup from chat included: every call, every answer field, and what your interface shows at each step.

## Overview

This guide is for products that put a Wiro agent behind their own interface. Your users talk to the agent in your app. Your backend calls the API with your project API key, and your app shows the agent's answers, its setup cards and the connect steps with your own design. Your users never leave your product.

It covers the whole cycle in order: sending messages and showing answers, the setup cards the agent proposes, applying them, connecting connectors, restarts, errors, chats without cards, the agent's live Screen and Take Control in your app, security, three worked examples and a checklist. Every request and answer is shown as JSON, so the guide can also be handed to a coding assistant that builds the integration for you.

### What setup from chat is

An agent can help the people who manage it set it up in the chat. Asked to report website traffic every Monday, draw a diagram or search the web, it can propose the change itself: turn on a skill, connect a connector, create or change a scheduled task or a custom skill, or change its time zone.

The agent never changes its own setup and never sees a key. It proposes the change as a **setup card**. Wiro checks the card against the agent's current setup and stores it on the message that asked for it, where it shows as a `setup` block in that message's `timeline[]`. Nothing changes until an agent admin applies the card. Wiro then applies the stored card, checked again against the agent as it is at that moment, and never anything written in the chat.

### Your product shows everything

Wiro's answers in a chat sent with a project API key name no site, page or link. When something still has to be connected, the answer says so in a plain sentence and returns the same information as data, the `next` array, so your product shows its own Connect button. Keys, app keys and tokens go into your own forms and reach Wiro through the API, never through the chat. When a connector signs in, the vendor's consent screen shows your organization or your own app, and the browser comes back to a page on your own site (see [Who your customer sees](/docs/agent-connectors#who-your-customer-sees), which also says where the API's own address can still show).

A few fields are for your backend, not for your users: every message row and every card names your API key's owner as the person who sent, asked or applied (see [API key](#api-key)), and the tokens and ids are your own references. Show your users your own names and words.

Connector titles name their vendors, such as Google Analytics 4 or WordPress. Two things carry Wiro's name: the agent's Wiro project (the credential `wiro`, which pays for the models its skills run, such as Video Creator's or a voice channel's) and the Wiro AI Models (`wiro`) connector, which gives the agent Wiro's own tools. That name comes wherever the API names them, in the card listing and in `summary` too. An agent that runs models can also write their public links in an answer, such as a model's page on wiro.ai or an output file on cdn1.wiro.ai. Your product may show its own label for them, as for any title the API gives.

A connector that signs in connects from its card too: `SetupCardApply` on its `connect` card answers the vendor's sign-in address, `authorizeUrl`, and the browser comes back to your `redirecturl` through one callback on the API host. A sign-in started with your API key always runs as your product: the consent screen names your organization, or the app of your own whose keys you send, never Wiro's own app. Send your own `redirecturl` with every sign-in: without one, the browser comes back to Wiro's return page on wiro.ai. The same connectors also connect on your own settings screens with the [Agent Connectors](/docs/agent-connectors) calls.

### The flow at a glance

```text
Your user types           Your backend                     Wiro
--------------            ------------                     ----
"Report our traffic"  ->  Message/Send ------------------>  agent turn runs
                          WebSocket or Message/Detail <---  timeline: answer + setup blocks
Your app shows the card
User presses Save     ->  SetupCardApply with values ---->  key saved, card applied, agent has it
  (a key card)
User presses Sign in  ->  SetupCardApply with redirecturl ->  authorizeUrl, the card stays pending
  (a sign-in card)        the browser signs in ---------->  consent, callback, your redirecturl;
                                                            the agent has the connector
                          SetupCardApply again ---------->  card applied
User presses Apply    ->  Message/SetupCardApply -------->  change applied, agent has it
Your app shows "Applied", and the agent uses the change from its next message
```

## Before You Start

### API key

Every call in this guide is authenticated with a project API key from your Wiro dashboard, sent as the `x-api-key` header (signature-based projects also send `x-nonce` and `x-signature`). See [Authentication](/docs/authentication). Call Wiro from your backend only: never put the key in browser or mobile app code.

Your app may hold two kinds of token, so that the browser follows a chat on the [Agent WebSocket](/docs/agent-websocket) itself: a turn's `agenttoken` and a session's `sessiontoken`. The socket takes no API key, and each token reads only its own turn or session, so give a person only the tokens of their own chats. Or keep the socket on your backend and relay its events. To show the agent's live Screen, the page also gets a one-time `screenToken` for each screen it opens (see [Screen and Take Control in Your App](#screen-and-take-control-in-your-app)).

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

`useprepaid: true` pays the plan from the balance of your key's workspace: Starter $5, Pro $30 or Max $100 a month, each including its own price in AI usage, and every renewal is paid from that balance too. When the balance is short, Deploy creates nothing, charges nothing and answers code `97` with `neededusd`, the amount to add: add funds (see [Adding Funds](/docs/agent-overview#adding-funds)) and send the same Deploy again.

```json
{
  "result": false,
  "useragents": [],
  "errors": [{ "code": 97, "message": "Your balance is $3.10; this plan needs $30.00. Add funds to continue.", "time": 1794654000 }],
  "neededusd": 26.9
}
```

Code `110`, `The wallet was charged $30.00, but the plan could not be saved. Please contact support and do not try again.`, means the balance paid and the plan was not saved: never send the Deploy again, since a retry charges again (see [Paying for Plans](/docs/agent-overview#paying-for-plans) and [Deploy](/docs/agent-overview#post-useragentdeploy)).

### Allow setup cards in API chats

Where setup cards can be proposed and applied is the agent's `chatsetup` setting. Wiro reads every request sent with a project API key as an API chat:

| `chatsetup` | Cards in your API chat | `SetupCardApply` with your API key |
|-------------|------------------------|------------------------------------|
| `all` (the default) | Yes | Works |
| `webchat` | No: only the Wiro web chat gets cards. In your product, the same as `off`. | Refused: `Setup from chat is off for this agent.` |
| `off` | No | Refused: `Setup from chat is off for this agent.` |

So an integration that shows setup cards needs `"all"`. Set it at Deploy with `chatsetup`, or later with [`POST /UserAgent/UpdateSettings`](/docs/agent-overview#post-useragentupdatesettings), and read it back as `chatSetup` on `UserAgent/Detail`. A change from or to `"off"` restarts a starting or running agent once, and a change between `"all"` and `"webchat"` restarts nothing. `UpdateSettings` answers `restart` and `restarting`, which say whether it restarted the agent: see [Showing a restart](#showing-a-restart).

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

Because of this, decide in your own product who may approve a change: show the Apply button, and pass a typed approval on to Wiro, only for the people allowed to change that agent. Wiro reads many words as an approval, not only `yes`, and a key pasted while a `key` connect card is the only `connect` card waiting can be saved to it: [Typed replies](#typed-replies) has the whole list. When people who must not change the agent talk to it through your app, set `chatsetup` to `"off"` for that agent and change its setup from your own settings screens instead. That is the safe choice for any agent that several of your users share.

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

See [Live Changes and Restarts](#live-changes-and-restarts) for the other sentences.

When the agent has used the AI usage its plan includes and the balance is under $0.50, Send answers `result: false` with code `97`, `agentstatus` and `agentusage`, the agent's [`usage`](/docs/agent-overview#usage-object):

```json
{
  "result": false,
  "errors": [{ "code": 97, "message": "Support Desk used the $30.00 of AI usage its plan includes, and your balance is under $0.50. Add funds to keep it running, or it starts again when the plan renews on 1 December 2026 (UTC).", "time": 1794654900 }],
  "messageguid": null,
  "agenttoken": null,
  "status": null,
  "agentstatus": 4,
  "agentusage": { "period": "2026-11", "resetsat": 1796083200, "includedusd": 30, "usedusd": 30, "leftusd": 0, "renewalusd": 30, "frombalanceusd": 4.69, "balanceusd": 0.31, "wallet": "personal", "minbalanceusd": 0.5, "paused": true, "pausedreason": "balance" }
}
```

That sentence speaks to whoever pays for the agent, which is you. Its date is the day in UTC and says so, and is left out when the plan's renewal can't be read, or when a plan paid by card is past its period end and hasn't renewed yet. Once the period of a plan paid from the balance has ended and its renewal hasn't run yet (the balance can't pay it, or Wiro's check, about every 15 minutes, hasn't reached it), the message's second sentence reads `Its plan's renewal is due: add funds to renew it and keep it running.` instead, and a cancelled plan's reads `Add funds to keep it running until its plan ends on 1 December 2026 (UTC).` Detect the refusal by `agentusage` with `pausedreason: "balance"`, show your users your own words, and add funds to the balance of the agent's workspace (see [Adding Funds](/docs/agent-overview#adding-funds)). While its plan is live, the agent answers again as soon as the balance is back at $0.50 or more. A larger plan, with [`UpgradeTier`](/docs/agent-overview#post-useragentupgradetier), gives the agent more AI usage at once but is paid from the same balance, so add funds first: while the balance is short, UpgradeTier answers code `97` with `neededusd`, and while the plan's renewal is due it refuses a larger plan until the plan has renewed. `agentusage.frombalanceusd` is the AI usage charged to the balance this period, as on [`UserAgent/Detail`](/docs/agent-overview#post-useragentdetail). Your users in Telegram, Slack and Discord read `This agent's plan usage and its owner's balance are used up.` when they write while it is paused, or `This agent is paused for now. It runs again once its owner adds funds or its plan renews.` when a reply is cut off, with no amount. Setup replies that Wiro answers itself still work while the agent is paused: see [Replies the API answers itself](#replies-the-api-answers-itself).

An agent runs only with a live plan. When its plan ends, cancelled or with a renewal the balance couldn't pay, the agent stops whatever the balance holds, and adding funds doesn't start it again. Send (with `agentstatus: 0`) and [`Start`](/docs/agent-overview#post-useragentstart) then answer code `97` with `agentusage.pausedreason: "plan"` and `<agent> has no active plan. Choose a plan to keep it running.` Renew the plan with [`RenewSubscription`](/docs/agent-overview#post-useragentrenewsubscription), or start a new one with [`CreateSubscriptionCheckout`](/docs/agent-overview#post-useragentcreatesubscriptioncheckout) and `useprepaid: true`: both are paid from the balance, and either one queues the agent to start by itself. A Send that reaches the agent before it has stopped answers the same, and your users in Telegram, Slack and Discord read `This agent has no active plan, so it paused.`: offer a plan there, not funds.

When a [spend limit](/docs/spend-limits) that covers the agent is used up, Send answers `result: false` with code `93` and `agentstatus`. The limit is the agent's own or, once its plan's included AI usage is used up, the account's or team's limit or the `agent` surface's limit:

```json
{
  "result": false,
  "errors": [{ "code": 93, "message": "This agent's monthly spend limit is reached ($20.35 of $20.00). It resets on December 1, 2026 at 00:00 UTC.", "time": 1794654900 }],
  "messageguid": null,
  "agenttoken": null,
  "status": null,
  "agentstatus": 4
}
```

While such a limit is used up, the agent's [`usage`](/docs/agent-overview#usage-object) on `Detail`, `MyAgents` and `PinnedAgents` reads `paused: true` with `pausedreason: "spendlimit"`, so your app can show the agent paused before anyone writes. It runs again when the limit resets or is raised.

When a [Model Access](/docs/model-access) rule for the agent blocks the `model` you send for the turn (its own rule, the account's or team's rule, or the `agent` surface's rule), Send answers `result: false` with code `92`:

```json
{
  "result": false,
  "errors": [{ "code": 92, "message": "This agent can't use openai/gpt-5-6-sol. Model Access rules decide which models can run.", "time": 1794654900 }],
  "messageguid": null,
  "agenttoken": null,
  "status": null
}
```

In both cases nothing runs and nothing is charged. Show the sentence as it is, or your own words, and branch on the code.

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
| `[SPEND_LIMIT_REACHED]` | `agent_error` | A spend limit that covers the agent is used up: its own or, once its plan's included AI usage is used up, the account's or team's or the `agent` surface's. Show the sentence as it is. |
| `[USAGE_CEILING_REACHED]` | `agent_error` | The agent reached its hourly or daily safety ceiling for AI model calls: say it runs again when that hour or day is over. |
| `[MODEL_NOT_ALLOWED]` | `agent_error` | A Model Access rule for the agent blocks the model it uses (its own, the account's or team's, or the `agent` surface's): show the sentence as it is. |
| `[CREDITS_EXHAUSTED]` | `agent_error` | The agent has used the AI usage its plan includes and the balance is under $0.50: say it runs again once funds are added or its plan renews, and don't offer to try again before that. |
| `[NO_ACTIVE_PLAN]` | `agent_error` | The agent has no active plan: say it runs again once it has a plan, and offer to renew the plan, never to add funds. |
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
        "response": "I can send a traffic report every Monday at 09:00 with last week's sessions, users and top pages. Reply yes to set it up.",
        "status": "agent_end"
      }
    ],
    "count": 1,
    "hasmore": false,
    "sessiontoken": "Lp4vQ8sWn2KxT7cRb1YhZ6mDg9FjA3uEo5iNk0wXyHt"
  }
}
```

The row is shortened here; a whole one has the fields of a [`Message/Detail`](/docs/agent-messaging#post-useragentmessagedetail) answer. Page back with `before` (the oldest `guid` you have) while `hasmore` is `true`. A session holds four kinds of row:

| Row | How you know it | What your UI shows |
|-----|-----------------|--------------------|
| A turn | `content` holds the message as stored (keys taken out, see [Security Rules](#security-rules)), `response` the reply, `timeline[]` its blocks, setup blocks included, in their current state | The person's message and the agent's reply. While `status` is `agent_queue`, `agent_start` or `agent_output`, the reply is in progress: subscribe to its `agenttoken` to follow it. |
| A reply Wiro answered itself | `metadata.type` is `"setup_result"`, `agenttoken` is `null`, `timeline` is empty | The message and `response` as plain text. See [Replies the API answers itself](#replies-the-api-answers-itself). |
| A message added between turns | `content` is empty, the text is in `response`, `metadata.type` is `"subagent"` or `"system"` | The agent's message with no message of the person's above it: a scheduled task's report, files sent after an answer, or, for `"subagent"`, the result of work the agent finished in the background. |
| A model switch | `status` is `"agent_done"`, `metadata.type` is `"model_change"` | A thin separator, or nothing. It comes only when you pick a per-turn `model`. |

A message added between turns has no turn of its own: nothing streams on an `agenttoken` for it and no webhook is called. A scheduled task's report goes to the session the agent's latest message is in, so on an agent that several of your users share it can reach any of their chats. To get it live, follow the session with the `sessiontoken` above: send `{ "type": "agent_session_subscribe", "sessiontoken": "Lp4vQ8sWn2KxT7cRb1YhZ6mDg9FjA3uEo5iNk0wXyHt" }` on the socket, and each new row arrives as an `agent_message_inserted` frame. Follows end with the connection, so after a reconnect subscribe again and read History once. See [Following a session](/docs/agent-websocket#following-a-session). The reports of the scheduled task Weekly traffic report, from the card above, reach your chat this way.

To list a customer's conversations, call [`POST /UserAgent/Message/Sessions`](/docs/agent-messaging#post-useragentmessagesessions) with the `useragentguid`: it answers each session's `sessionkey`, `messagecount`, `updatedat`, `lastmessage` and, once named with `RenameSession`, `name`. It lists every session of the agent that your key's owner can read, so on an agent that several of your users share, show each person only the sessions your own records give them.

### Render the timeline

A reply is an ordered list of blocks. Keep a map keyed by `blockid`, keep a block only when its `version` is newer than the one you hold, and draw the blocks sorted by `callindex`, then `contentindex`, then `blockid`.

| `type` | What it holds | What your UI shows |
|--------|---------------|--------------------|
| `reasoning` | `text`: a short summary of the agent's thinking | A collapsed "Thinking" section, in its place in the list. |
| `answer` | `text`: the answer text | The agent's message. Render it as Markdown. |
| `tool` | `toollabel`, `toolstatus` (`requested`, `completed`, `error`, `held`, `paused`), `toolintegration`, `toolaction` | A small status line, such as "Working in Shopify" or "Taking a screenshot". Use your own labels for the `toolintegration` and `toolaction` words, and `toollabel` when both are `null`. `held` is a connector call held for a person's approval, and `paused` a browser or desktop call refused during Take Control: neither ran, so show neither as a failure. |
| `setup` | `setup`: a setup card; on a pending `connect` card, also `next` | A card with buttons. See [Setup Cards](#setup-cards). |
| `approval` | `approval`: a connector action waiting for a person's approval, with the call's arguments | A card with the arguments and Allow, Always Allow (for the agent's owner and team admins) and Decline buttons that call [`Message/ApprovalCardAct`](/docs/agent-connectors#post-useragentmessageapprovalcardact). A typed `yes`, `always` or `no` answers it too: see [Answering with a reply](/docs/agent-connectors#answering-with-a-reply). A card asked in Telegram, Slack or Discord (`origin.kind` `"channel"`) gets no buttons. See [The approval block](/docs/agent-connectors#the-approval-block). |

Setup blocks have `callindex: 1000000`, so they sort after the reply's other blocks, in the order the agent proposed them, at most three per message. Approval blocks have `callindex: 1000001` and sort after them, also at most three per message. Skip a block whose `type` you don't know. The block fields are listed in [Public timeline block fields](/docs/agent-messaging#public-timeline-block-fields).

Wiro cleans the agent's text before it reaches you, in the blocks, in `response` and in every event: a link to a private address or into the agent's own system reads `[link removed]`, and a path inside the agent's system reads `[private detail removed]`. A turn in which the agent wrote nothing, older ones included, can read `No response from agent.` Show these as they are, or your own words. Public links stay as written, the Wiro model links of [Your product shows everything](#your-product-shows-everything) included.

### Replies the API answers itself

Some messages are answered by Wiro itself, with no agent turn: a `yes` that applies a card or gets the card listing, a `yes` while a sign-in or project `connect` card waits, a key typed as the reply while the latest reply has one pending `connect` card and it is a `key` card with one secret field, and the others listed in [Chats Without Cards](#chats-without-cards). `Message/Send` then answers at once with `status: "agent_end"`, `agenttoken: null`, the answer in `response` and the outcome in `setupresult`:

```json
{
  "result": true,
  "errors": [],
  "messageguid": "d4e5f6a7-b8c9-0123-def4-567890123456",
  "agenttoken": null,
  "status": "agent_end",
  "response": "✅ Applied: Scheduled task Weekly traffic report created.\nYour agent uses the change from its next message.",
  "content": "yes",
  "setupresult": {
    "applied": ["k3v9q2m8x1za"],
    "dismissed": [],
    "failed": [],
    "restarting": false,
    "live": true
  }
}
```

Show `response` as the reply, as plain text. There is nothing to follow on the WebSocket. In `Message/History` the row reads `status: "agent_end"`, `metadata: { "type": "setup_result" }` and an empty `timeline`. When the answer leaves connectors to connect, `metadata` also keeps its `next`, and a card listing keeps `listed` and `listedfrom` there: see [Replies Wiro handles itself](/docs/agent-messaging#handled-setup-replies). These replies cost nothing, and Wiro gives them while the agent is stopped or restarting too: see [Messages during a restart](#messages-during-a-restart) for which ones.

A `yes`, `always` or `no` while a connector's approval card waits on the agent's latest reply is answered the same way, with `approvalresult` instead of the setup fields. Once none waits there, so are replies to the cards still waiting on earlier messages of the session, which Wiro lists first, while that reply is the turn an approval started or one in which the agent asked again for a call whose card still waits; after any other reply, such as the agent's own question, they don't reach those cards (see [Cards on earlier messages](/docs/agent-connectors#cards-on-earlier-messages)). Sent with your API key, the first `yes` gets Wiro's listing of the card's exact request, and a second `yes` allows it once:

```json
{
  "result": true,
  "errors": [],
  "messageguid": "2d3e4f50-6172-4839-9aab-bccddeeff001",
  "agenttoken": null,
  "status": "agent_end",
  "response": "✅ Allowed once: Update or publish a WordPress post or page in WordPress.\nThe agent goes on with it now.",
  "content": "yes",
  "approvalresult": {
    "answered": [
      {
        "cardid": "k3v9q2m7x1pd",
        "messageguid": "d4e5f6a7-b8c9-4d0e-8f12-3456789abcde",
        "action": "allow",
        "result": true,
        "approval": { "id": "k3v9q2m7x1pd", "status": "allowed", "actedat": 1795400120, "actedby": "ada-uuid" },
        "summary": "Allowed once.",
        "resume": { "status": "queued", "messageguid": "e5f6a7b8-c9d0-4e1f-9a23-456789abcdef", "agenttoken": "Wq7nR2kXv9LpT4mYb8HcJd3sFg6ZaE", "sessionkey": "customer-42" }
      }
    ],
    "listed": []
  }
}
```

Update the card in your chat from `approval` (shortened here), show `response`, and follow the turn `resume` names on its `agenttoken`, as after the card's own button. In `Message/History` the row's `metadata` keeps `approvalresult` without the cards. The listing, the words, who may answer and every answer are in [Answering with a reply](/docs/agent-connectors#answering-with-a-reply).

Wiro also answers a slash command the agent doesn't run, such as `/status`, or one of its commands that is turned off, while the agent is running. It costs nothing, even while the agent is paused for its balance, and the answer has no `setupresult`:

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

The second line comes only when the agent has `agent_help` on. Show `response` as the reply, and the row in History as you show the other replies Wiro answers itself. Apart from the five commands below, Wiro answers only a command that starts the message and is followed by a space, a line break or the end of the message, as in `/status` or `/status please`, and never one inside a link or a quoted line. A `/` word later in the message, as in `Update the /pricing page`, and a path such as `/data/report.csv` go to the agent as plain text. A message that holds one of the agent's [enabled commands](/docs/agent-overview#post-useragentupdatesettings) anywhere, written in lower case and followed by a space, a line break or the end of the message, goes to the agent, which runs it, except those five, and so does a message that starts with `/model`, `/models` or one of a few common words, such as `/start` or `/help`. While the agent isn't running, the message gets the refusal in [Messages during a restart](#messages-during-a-restart). The full rules are in [Unknown or disabled commands](/docs/agent-messaging#unknown-or-disabled-commands).

Five commands act as the agent's owner, so only its operator can run them: `/new_session`, `/agent_limits`, `/agent_restart`, `/clear_all_sessions` and `/clear_history`. Every message you send with your API key carries the identity of your key's owner, whoever typed it, so Wiro answers these itself wherever they are in the message, on a quoted line or turned off included: `response` reads `This command requires an authenticated operator or an allowlisted channel operator.`, with `status: "agent_end"` and `agenttoken: null`, and nothing is charged. Show it as the reply. Your backend does these jobs with [`Stop`](/docs/agent-overview#post-useragentstop) and [`Start`](/docs/agent-overview#post-useragentstart), a new `sessionkey` or [`Message/DeleteSession`](/docs/agent-messaging#post-useragentmessagedeletesession), and the [`usage`](/docs/agent-overview#usage-object) on `UserAgent/Detail`. The rules are in [Operator-only commands](/docs/agent-messaging#operator-only-commands).

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
    "title": "Serper",
    "authtype": "fields",
    "mode": "key",
    "fields": [
      {
        "name": "apikey",
        "label": "Serper API Key",
        "description": "Real Google web-search results as clean JSON, via [Serper.dev](https://serper.dev). Google's own Custom Search JSON API is being retired (shuts down 2027-01-01), so this connector uses Serper, which returns the same Google results with none of the Google Cloud setup.\n\n1. Sign up at [serper.dev](https://serper.dev). No credit card; new accounts get **2,500 free searches**.\n2. Open the dashboard and copy your **API key** from the **API Key** section.\n3. Paste it here. There is no Google Cloud project, no `cx`, and no key restriction to configure.\n\nAfter the free tier Serper is about $1 per 1,000 searches (cheaper at scale). Asking for more than 10 results per query counts as 2 searches.",
        "required": true,
        "secret": true,
        "format": "password",
        "placeholder": "your Serper.dev API key"
      }
    ],
    "requestedby": "5f0c9a2e-1b7d-4c3a-9e8f-2a6b7c8d9e0f",
    "createdat": 1794654811
  },
  "phase": "end",
  "version": 1,
  "startedat": 1794654811,
  "updatedat": 1794654811,
  "next": [{ "connector": "serper", "title": "Serper", "mode": "key" }]
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
| `next` | Only on a pending `connect` card: how its own connector connects, as one entry `{ connector, title, mode }` with the card's own `title` and `mode`. It is gone once the card is applied, dismissed or failed. See [Your Own Connect Button](#your-own-connect-button). An `add` card's block has no `next`: its `setup.needs` lists what it needs. A card stored before cards carried `mode` can have no `next`: its connector signs in when its `authtype` on [`AgentConnector/Detail`](/docs/agent-connectors#post-agentconnectordetail) is `oauth` or `provider-oauth`, and takes a key otherwise. |

### Card fields

| Field | Kinds | Description |
|-------|-------|-------------|
| `v` | all | Card format version, `1`. |
| `id` | all | The card's id: 12 lower-case letters and digits. Send it as `cardid` to `SetupCardApply`. |
| `kind` | all | `add`, `remove`, `connect`, `disconnect`, `schedule`, `skill` or `timezone`. Skip a card whose `kind` you don't know. |
| `action` | `schedule`, `skill` | `schedule`: `create`, `update`, `pause`, `resume` or `delete`. `skill`: `create`, `update`, `append` (add text to the end), `revert` (undo the last change), `disable` or `enable`. |
| `key` | `add`, `remove`, `schedule`, `skill` | `add` and `remove`: the skill (`util-<name>`) as [`POST /Skills/List`](/docs/agent-skills#post-skillslist) names it. `schedule`: the task's key (`cs-cron-<name>`). `skill`: the custom skill's key (`cs-<name>`). |
| `connector` | `connect`, `disconnect` | The connector's slug as [`POST /AgentConnector/List`](/docs/agent-connectors#post-agentconnectorlist) lists it, such as `serper` or `hubspot`. A card names only connectors of the catalog: never a channel or a credential, and never a key's value. |
| `title` | `connect`, `disconnect`, `schedule`, `skill` | `connect` and `disconnect`: the connector's title, written by Wiro, up to 120 characters. `schedule` and `skill`: optional, one line, up to 80 characters. |
| `authtype` | `connect` | Written by Wiro: the connector's `authtype` in the catalog, `fields`, `headers`, `none`, `oauth` or `provider-oauth`. |
| `mode` | `connect` | Written by Wiro: how the card connects, `key` (the values its `fields` ask for), `signin` (the vendor's sign-in) or `project`, a Wiro project picked for Wiro AI Models (`wiro`). See [Modes](#modes). |
| `fields` | `connect` | Written by Wiro: what the card's form asks for, at most 30, in the shape of `credentialfields` on [`AgentConnector/Detail`](/docs/agent-connectors#connect-card-fields): `name`, `label`, `description` (Markdown), `required`, `secret`, `format`, and `options`, `placeholder`, `pattern`, `maxlength`, `serveronly`, `mode` or `source` where they apply. On a `key` card, the connector's Connect fields. On a `project` card, one field with `source: "wiro_project"`: a project picker, never an input. On a `signin` card, the fields its sign-in takes: for a connector that signs in with an app of your own, that app's keys (`serveronly: true`), and any other field the sign-in needs, such as Shopify's Shop Domain. The fields of a connector's key way are never on a `signin` card. Empty when there is nothing to enter. |
| `wiroapp` | `connect` | Written by Wiro, only on a card from a Wiro web chat turn: `true` when its connector signs in there with Wiro's own app. Never on a card from a chat sent with your API key, whose sign-in always takes your own app's keys. |
| `cron` | `schedule` | Five fields, in the agent's time zone. Always on `create`, optional on `update`. A task set up from chat runs at most once an hour. |
| `instructions` | `schedule`, `skill` | `create` and `update`: the full text. `append`: only the text to add. `revert`: the text it restores. Up to 20,000 characters on what the agent writes. |
| `before` | `skill` (`update`, `append`, `revert`) | The skill's text when Wiro checked the card. Show it next to the text after the change: for `append`, that is `before` without the spaces and line breaks at its end, a blank line, then `instructions`. Can be absent on older cards. |
| `with` | `add`, `remove` | Other skills turned on (`add`) or off (`remove`) together with `key`, by name, sorted, at most 12. Written by Wiro. An `add` names only the ones still off on this agent, so the same `key` can bring a different list, or none, on another agent. |
| `pauses`, `resumes` | `add`, `remove` | Scheduled tasks (`cs-cron-<name>`) that stop, or run again, with this change, at most 20 each. Written by Wiro. Name each by the `description` of its entry in `scheduledskills` of `UserAgent/Detail`, or by its key in words. |
| `needs` | `add` | What the change needs that isn't connected yet, at most 3, each `{ connector, title, mode }`. `title` can be absent: then use the connector's key. Written by Wiro. See [Modes](#modes). |
| `timezone` | `timezone` | The proposed IANA time zone, such as `Europe/Istanbul`. |
| `note` | all | Optional. The agent's one-line note on the change, up to 300 characters. |
| `status` | all | Absent while pending, then `applied`, `dismissed` or `failed`. |
| `actedat`, `actedby` | all | When the card was acted on (Unix seconds) and the account UUID of who did it. Absent while pending. With your API key, `actedby` is your key's owner. |
| `error` | all | Only when `status` is `failed`: one plain sentence that says why. |
| `requestedby` | all | The account UUID of the person whose message asked for the change: in your chats, your key's owner. |
| `createdat` | all | When the agent proposed the card (Unix seconds). |

A `connect` card carries everything its form needs, so you can draw it without another call. Fields that don't apply to a card's kind are absent, and a missing list reads as empty. More kinds, actions and fields can be added later.

### Every kind

`add` turns on a skill. This one turns on Video Creator and the skills that come with it, on an agent that has Wiro AI Models connected:

```json
{
  "v": 1,
  "id": "m5t8c2w6r3pe",
  "kind": "add",
  "key": "util-video-creator",
  "with": ["util-motion-effects", "util-video-docs", "util-video-shots"],
  "requestedby": "5f0c9a2e-1b7d-4c3a-9e8f-2a6b7c8d9e0f",
  "createdat": 1794654811
}
```

When `needs` names connectors, Wiro stores a `connect` card for each of them on the same message, right after the `add` card, whatever its `mode`, while the message has room for it (three cards at most) and has no pending `connect` card for it yet. Show them together: see [Buttons](#buttons).

Google Play Promotional Content needs Google Play Console. On an agent that doesn't have it connected, the `add` card is the message's first setup block, and the `connect` card Wiro stores right after it is the second, whose block's `next` is `[{ "connector": "google-play", "title": "Google Play Console", "mode": "key" }]`:

```json
{
  "v": 1,
  "id": "g7p2k5m9w4ta",
  "kind": "add",
  "key": "util-googleplay-events",
  "needs": [{ "connector": "google-play", "title": "Google Play Console", "mode": "key" }],
  "requestedby": "5f0c9a2e-1b7d-4c3a-9e8f-2a6b7c8d9e0f",
  "createdat": 1794656000
}
```

```json
{
  "v": 1,
  "id": "c2v8n4q6x1pd",
  "kind": "connect",
  "connector": "google-play",
  "title": "Google Play Console",
  "authtype": "fields",
  "mode": "key",
  "fields": [
    { "name": "serviceaccountjson", "label": "Service Account JSON", "description": "1. Go to [Google Cloud Console → IAM & Admin → Service Accounts](https://console.cloud.google.com/iam-admin/serviceaccounts) ...", "required": true, "secret": true, "format": "json" }
  ],
  "requestedby": "5f0c9a2e-1b7d-4c3a-9e8f-2a6b7c8d9e0f",
  "createdat": 1794656000
}
```

Both apply in one step: see [Add and Connect](#add-and-connect).

`remove` turns one off:

```json
{
  "v": 1,
  "id": "w2c8n5q1x7rd",
  "kind": "remove",
  "key": "util-weather",
  "requestedby": "5f0c9a2e-1b7d-4c3a-9e8f-2a6b7c8d9e0f",
  "createdat": 1794654811
}
```

`connect` connects a connector of the catalog that the agent doesn't have connected yet, by its slug. Wiro writes the connector's `title`, its `authtype`, the card's `mode` and the form's `fields` on it:

```json
{
  "v": 1,
  "id": "h6w3k9p2m5tc",
  "kind": "connect",
  "connector": "serper",
  "title": "Serper",
  "authtype": "fields",
  "mode": "key",
  "fields": [
    { "name": "apikey", "label": "Serper API Key", "description": "Real Google web-search results as clean JSON, via [Serper.dev](https://serper.dev) ...", "required": true, "secret": true, "format": "password", "placeholder": "your Serper.dev API key" }
  ],
  "requestedby": "5f0c9a2e-1b7d-4c3a-9e8f-2a6b7c8d9e0f",
  "createdat": 1794654811
}
```

A connector that signs in gets a `signin` card: see [Sign-in: HubSpot](#sign-in-hubspot). Wiro AI Models (`wiro`) gets a `project` card: see [Project: Wiro AI Models](#project-wiro-ai-models).

`disconnect` disconnects a connector the agent has a connection for, and carries its `title`:

```json
{
  "v": 1,
  "id": "b7k1m4t9w2zs",
  "kind": "disconnect",
  "connector": "serper",
  "title": "Serper",
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
| Applied | `status: "applied"` | The change is made. The answer that applied it says in `live` and `restarting` whether a running agent got it with no restart or restarts to load it. |
| Dismissed | `status: "dismissed"` | Turned down. Nothing changed. |
| Failed | `status: "failed"` | Wiro tried to apply it and couldn't: `error` says why. Nothing changed. |

Two more states exist only in your interface, between a click and the answer: **applying** (your call is under way), and **refused**, when `SetupCardApply` answers `result: false` and the card is still pending, for example a key the vendor refused or an add card whose sign-in hasn't finished. A refused card keeps its buttons. A `signin` card has one more: **signing in**, from the answer that gives `authorizeUrl` until the browser is back on your page. A change a running agent gets live needs nothing more than **applied**. While the agent restarts after a change, show the card as applied with a **restarting** note; see [Live Changes and Restarts](#live-changes-and-restarts).

Whenever a card is applied, dismissed or fails, Wiro also marks applied the same person's pending `connect` cards in that chat from the last 7 days whose connectors now read connected: the one this card connected, and any whose sign-in finished or that were connected on a settings screen. Their blocks come again on their own `agenttoken`s, and History shows them applied.

### What your UI shows for each kind

| Kind | Title line | Body | Buttons |
|------|-----------|------|---------|
| `add` | "Add `<title>`", the `title` of `key` in `Skills/List` | `with` as "Also turns on", `pauses` and `resumes`, and each entry of `needs` with its `connect` card | Apply, Dismiss, and the buttons of its `connect` cards; see [Buttons](#buttons) |
| `remove` | "Remove `<title>`" | `with` as "Also turns off", `pauses` and `resumes` | Apply, Dismiss |
| `connect` | "Connect `<title>`" | By `mode`: for `key`, a form from `fields`; for `signin`, a form from `fields` when the card has any: your own app's keys (`serveronly: true`) and any other field the sign-in needs, such as LinkedIn's Organization ID or Shopify's Shop Domain; for `project`, a picker of your projects | Save for `key` (Connect when no field is required), Sign in for `signin`, Connect for `project`, and Dismiss |
| `disconnect` | "Disconnect `<title>`" | Say that the connection is removed and the agent loses the connector's tools until it is connected again. For Wiro AI Models (`wiro`), also say that the agent keeps its Wiro project, which the models of its skills still use: only its `wiro__*` tools go | Disconnect, Dismiss |
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
| Signing in (`signin` cards) | "Waiting for the sign-in" until the browser is back on your page | Sign in again (a new sign-in), Dismiss |
| Refused | `errors[0].message` under the card | Enabled |
| Applied | "Applied", and `summary` from the answer when you have it | None |
| Applied, agent restarting (`restarting: true`) | "Applied" and "Restarting, a minute or two" until the agent runs again | None |
| Dismissed | "Turned down" | None |
| Failed | "Not applied" and `setup.error` | None |

### Buttons

- **Apply**: `SetupCardApply` with `action: "apply"`.
- **Dismiss**: `SetupCardApply` with `action: "dismiss"`. A `connect` card connects its connector on its own, so dismissing an `add` card leaves its `connect` cards pending: dismiss them too when the person turns the whole change down.
- **A `key` card**: show its `fields` and **Save**: `SetupCardApply` with the values in `values`. A card whose fields hold no required field connects with **Connect** and no `values`.
- **A `signin` card**: show every field in its `fields` (your own app's keys are the `serveronly: true` ones; some sign-ins need more, such as LinkedIn's Organization ID, Reddit's Developer Profile Username or Shopify's Shop Domain), and **Sign in**: `SetupCardApply` with their values in `values` and your `redirecturl`. Open the answer's `authorizeUrl`. Once the browser is back on your `redirecturl` with `connector_connected=true`, call `SetupCardApply` on the card again, with no `values`: it records the card applied. It records the card only while the connector reads connected: if it doesn't yet, the same call starts a new sign-in and answers a new `authorizeUrl`, with the card still pending. After `connector_error=<code>`, show that code's sentence and offer **Sign in** again instead. See [Sign-in: HubSpot](#sign-in-hubspot).
- **A `project` card**: show a picker of your projects and **Connect**: `SetupCardApply` with the chosen project's id as `wiroprojectguid`, and no `values`. See [Project: Wiro AI Models](#project-wiro-ai-models).
- **An `add` card with its `connect` cards**: the `connect` cards on the same message whose `connector` is in the `add` card's `needs` belong to it. Show them inside the `add` card.
- **Add and connect, with a key**: when the `add` card has one `key` card, show its fields and **Add and connect**: `SetupCardApply` on the `add` card with the values in `values`. Both cards apply in one step. See [Add and Connect](#add-and-connect).
- **Add and connect, with a sign-in**: when the `add` card has one `signin` card, run **Sign in** on that `connect` card first, as above. Once the browser is back, **Add**: `SetupCardApply` on the `add` card with `signin: true` applies both cards, once the connector reads connected. See [Add and Connect](#add-and-connect).
- **Add, then pick a project**: a `project` card takes its own step. Offer **Add** on the `add` card, and **Connect** on the `project` card, in either order.
- **Several `connect` cards**: offer **Add** alone, then each `connect` card's own button.
- **Add now, connect later**: `SetupCardApply` on the `add` card alone, whose answer's `next` names the `connect` cards to finish later.

## Applying and Dismissing

### Request

[`POST /UserAgent/Message/SetupCardApply`](/docs/agent-messaging#post-useragentmessagesetupcardapply) acts on one card:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | The agent. |
| `messageguid` | string | Yes | The message that holds the card: the row whose `timeline[]` has the setup block. |
| `cardid` | string | Yes | The card's `setup.id`. |
| `action` | string | Yes | `"apply"` or `"dismiss"`. |
| `values` | object | No | `{ "<name>": value }` for the card's `fields`. On a `key` card: the connector's Connect fields. On a `signin` card: the fields its sign-in takes, such as your own app's keys. A `project` card takes none: send `wiroprojectguid`. Wiro checks them as [`ConnectorConnect`](/docs/agent-connectors#post-useragentconnectorconnect) does: required fields, `format`, `pattern` and `maxlength` (see [Connect card fields](/docs/agent-connectors#connect-card-fields) for the limits), and a `json` field also takes an object. A field left out keeps a value saved before. On an `add` card whose `needs` has one pending `key` card: that card's values, and Wiro applies both cards in one step. Never returned and never shown to the agent. |
| `signin` | boolean | No | `true` on an `add` card whose `needs` has one pending `signin` card, once that card's sign-in has connected the connector: Wiro applies both cards in one step. Not together with `values`. |
| `redirecturl` | string | No | A `signin` card: where the browser comes back after the sign-in, with the rules of [The redirect URL](/docs/agent-connectors#the-redirect-url). Send a page on your own site: without one, the browser comes back to Wiro's return page on wiro.ai. |
| `wiroprojectguid` | string | No | A `project` card, the one of Wiro AI Models (`wiro`): the id of one of your projects, from [`POST /Project/List`](/docs/projects). It becomes the agent's own Wiro project, as [`CredentialProjectBind`](/docs/agent-overview#post-useragentcredentialprojectbind) binds it. Left out, a call made with your project API key binds that key's own project. |

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
  "restarting": false,
  "live": true,
  "summary": "Scheduled task Weekly traffic report created"
}
```

| Field | Description |
|-------|-------------|
| `result` | `true` when the action went through. `false` when it was refused or failed: read `errors[0].message`, and `setup.status` when `setup` isn't `null`. |
| `errors` | `[{ code, message, time }]`. `message` is one plain sentence you can show as it is. |
| `setup` | The card after the call: still pending after a refusal, `applied`, `dismissed` or `failed` otherwise. `null` when the call was refused before the card was read: a missing parameter, an agent or message your key can't reach, setup from chat off, a reply still running, code `97`, a card someone is applying at that moment, or a card that isn't there. |
| `restarting` | `true` when the agent restarts to load the change. See [Live Changes and Restarts](#live-changes-and-restarts). |
| `live` | `true` when the running agent got the change with no restart: keep the chat open, there is nothing to wait for. |
| `summary` | A short phrase that says what changed, such as `Scheduled task Weekly traffic report created`, `Serper connected` or, for an `add` card applied with its `connect` card, `Google Play Promotional Content added. Google Play Console connected.` An applied `add` card whose connectors have no `connect` card to finish them goes on with `Still to connect: <titles>`. Empty when nothing was applied. |
| `authorizeUrl` | Only when a `signin` card's sign-in started: the vendor's sign-in address, to open in the browser. It works for 10 minutes and once. `result` is `true`, the card in `setup` is still pending, `summary` is empty, and `next` names the card. See [Sign-in: HubSpot](#sign-in-hubspot). |
| `paired` | Only when `values` or `signin: true` came with an `add` card: its `connect` card after the call, `[{ setup, result, error }]`. `result` is `true` when that card was applied too, and `error` is `null` or the sentence that says why not. `[]` when the `add` card has no single `connect` card for them. |
| `errorcode` | Only on some refusals of an `add` card sent with `signin: true`: `not_connected` (the connector doesn't read connected yet), `signin_no_pair` (no pending `signin` card on the message for it) or `signin_many` (more than one). |
| `next` | Only when something is left to connect: `[{ connector, title, mode, cardid?, messageguid? }]`. An applied `add` card lists the connectors it needs that still aren't connected, and a `connect` card left pending (a refused key or project, or a sign-in just started) lists its own connector and card. See [Your Own Connect Button](#your-own-connect-button). |

Dismissing answers the card with `status: "dismissed"`, `restarting: false`, `live: false` and an empty `summary`. Dismissing the `timezone` card `z4x8c1v6b3nm` (`"action": "dismiss"`) answers:

```json
{
  "result": true,
  "errors": [],
  "setup": {
    "v": 1,
    "id": "z4x8c1v6b3nm",
    "kind": "timezone",
    "timezone": "Europe/Istanbul",
    "requestedby": "5f0c9a2e-1b7d-4c3a-9e8f-2a6b7c8d9e0f",
    "createdat": 1794654811,
    "status": "dismissed",
    "actedat": 1794654870,
    "actedby": "5f0c9a2e-1b7d-4c3a-9e8f-2a6b7c8d9e0f"
  },
  "restarting": false,
  "live": false,
  "summary": ""
}
```

Applying the `disconnect` card `b7k1m4t9w2zs` on a running agent answers:

```json
{
  "result": true,
  "errors": [],
  "setup": {
    "v": 1,
    "id": "b7k1m4t9w2zs",
    "kind": "disconnect",
    "connector": "serper",
    "title": "Serper",
    "requestedby": "5f0c9a2e-1b7d-4c3a-9e8f-2a6b7c8d9e0f",
    "createdat": 1794654811,
    "status": "applied",
    "actedat": 1794654870,
    "actedby": "5f0c9a2e-1b7d-4c3a-9e8f-2a6b7c8d9e0f"
  },
  "restarting": false,
  "live": true,
  "summary": "Serper disconnected"
}
```

Everyone subscribed to the turn's `agenttoken` gets the card's new block as an `agent_timeline_delta`, and so does a `connect` card applied with an `add` card. Update your copy from the answer's `setup` right away, and from the block when it arrives.

### Who may call it

With your project API key, a call acts as the key's owner, and works when all of these hold:

- The agent's `chatsetup` is `"all"`. Otherwise: `Setup from chat is off for this agent.`
- The key's owner owns the agent or is a member of its team, and the key's project is in the agent's workspace: a team project's key for a team agent, a personal one for a personal agent. Otherwise: `Agent not found or access denied`, or a sentence that names the workspace to use.
- The message is one the key's owner can read with `Message/History`: not deleted, not hidden, and in a private chat their own. Otherwise: `This setup card was not found.`
- To apply: the reply that holds the card has finished (otherwise `Wait until the agent finishes this reply, then apply it.`), and the key's owner is an agent admin (otherwise code `97`, `Only an agent admin can apply setup changes.`). Dismissing works at any time for anyone who can see the chat.
- The card is pending. A card is applied at most once: on one that was acted on, the answer says `This card was already applied.`, `This card was already dismissed.` or `This card was already failed.`, with the card in `setup`.

`SetupCardApply` takes no `sessionkey`. When several of your users share one agent, check in your backend that the `messageguid` belongs to the session of the person who clicked, for example with [`Message/Detail`](/docs/agent-messaging#post-useragentmessagedetail) and its `sessionkey`.

## Connecting a Connector

A `connect` card connects its connector through `SetupCardApply`, with the checks and the outcome of [`ConnectorConnect`](/docs/agent-connectors#post-useragentconnectorconnect): the connection is saved, a running agent has the connector's tools from its next message, and the agent never sees a key or a token. The card carries what its form needs (`title`, `mode` and `fields`), so you can draw it without another call.

### Modes

| `mode` | How it connects | Your UI | Calls |
|--------|-----------------|---------|-------|
| `key` | The values the vendor issues, such as an API key, typed by the person. A card with no required field connects with none. | A form from `setup.fields`, with masked inputs for `secret` fields | `SetupCardApply` with `values`: the connector connects and the card is applied |
| `signin` | The vendor's consent screen, in the browser | A form from `setup.fields` when the card has any (your own app's keys and any other field the sign-in needs), and a Sign in button | `SetupCardApply` with your `redirecturl`, and the card's field values in `values`, answers `authorizeUrl`. Once the browser is back on your page, `SetupCardApply` again records the card applied |
| `project` | One of your Wiro projects, picked for Wiro AI Models (`wiro`). It becomes the agent's own Wiro project. | A picker of your projects ([`POST /Project/List`](/docs/projects)) for its one `source: "wiro_project"` field, and a Connect button | `SetupCardApply` with the project's id as `wiroprojectguid` and no `values`: the project is bound, the connector connects and the card is applied |

A card's `mode` follows its connector in the catalog: `oauth` and `provider-oauth` connectors sign in, Wiro AI Models (`wiro`), whose one field is a Wiro project, gets a `project` card, and the other `fields`, `headers` and `none` connectors take a key. More modes can be added: show a card whose `mode` you don't know with Dismiss only, and connect its connector from your settings screen.

### Key: Serper

A key connector takes its fields as `values` on its `connect` card. Serper has one field, `apikey` (label "Serper API Key"). Wiro connects it as [`ConnectorConnect`](/docs/agent-connectors#connect-with-fields) does, with the same checks, and the agent never sees the key:

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Message/SetupCardApply" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
    "messageguid": "c3d4e5f6-a7b8-9012-cdef-345678901234",
    "cardid": "h6w3k9p2m5tc",
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
    "id": "h6w3k9p2m5tc",
    "kind": "connect",
    "connector": "serper",
    "title": "Serper",
    "authtype": "fields",
    "mode": "key",
    "fields": [
      { "name": "apikey", "label": "Serper API Key", "description": "Real Google web-search results as clean JSON, via [Serper.dev](https://serper.dev) ...", "required": true, "secret": true, "format": "password", "placeholder": "your Serper.dev API key" }
    ],
    "requestedby": "5f0c9a2e-1b7d-4c3a-9e8f-2a6b7c8d9e0f",
    "createdat": 1794654811,
    "status": "applied",
    "actedat": 1794654900,
    "actedby": "5f0c9a2e-1b7d-4c3a-9e8f-2a6b7c8d9e0f"
  },
  "restarting": false,
  "live": true,
  "summary": "Serper connected"
}
```

A value Wiro refuses (a required field missing, a format that doesn't fit, or a key the vendor refused) saves nothing: the answer is `result: false` with the sentence, and the card stays pending for the person to try again. Sent with an empty `apikey`, the card stays pending, and `next` names it:

```json
{
  "result": false,
  "errors": [{ "code": 0, "message": "Serper API Key is required.", "time": 1794654900 }],
  "setup": {
    "v": 1,
    "id": "h6w3k9p2m5tc",
    "kind": "connect",
    "connector": "serper",
    "title": "Serper",
    "authtype": "fields",
    "mode": "key",
    "fields": [
      { "name": "apikey", "label": "Serper API Key", "description": "Real Google web-search results as clean JSON, via [Serper.dev](https://serper.dev) ...", "required": true, "secret": true, "format": "password", "placeholder": "your Serper.dev API key" }
    ],
    "requestedby": "5f0c9a2e-1b7d-4c3a-9e8f-2a6b7c8d9e0f",
    "createdat": 1794654811
  },
  "restarting": false,
  "live": false,
  "summary": "",
  "next": [{ "connector": "serper", "title": "Serper", "mode": "key", "cardid": "h6w3k9p2m5tc", "messageguid": "c3d4e5f6-a7b8-9012-cdef-345678901234" }]
}
```

### Project: Wiro AI Models

Wiro AI Models (`wiro`) gets a `project` card. Its one field has `source: "wiro_project"`: show a picker of your projects ([`POST /Project/List`](/docs/projects)) instead of an input, and never a box to type a key in:

```json
{
  "v": 1,
  "id": "p4r7t2w9k3mz",
  "kind": "connect",
  "connector": "wiro",
  "title": "Wiro AI Models",
  "authtype": "headers",
  "mode": "project",
  "fields": [
    { "name": "wiro_credentials", "label": "Wiro Credentials", "description": "", "required": true, "secret": true, "format": "password", "source": "wiro_project" }
  ],
  "requestedby": "5f0c9a2e-1b7d-4c3a-9e8f-2a6b7c8d9e0f",
  "createdat": 1794655500
}
```

Its block's `next` reads `[{ "connector": "wiro", "title": "Wiro AI Models", "mode": "project" }]`. **Connect** sends the chosen project's id as `wiroprojectguid`, with no `values`:

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Message/SetupCardApply" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
    "messageguid": "b6c7d8e9-f0a1-2345-b678-901234567890",
    "cardid": "p4r7t2w9k3mz",
    "action": "apply",
    "wiroprojectguid": "4821"
  }'
```

```json
{
  "result": true,
  "errors": [],
  "setup": {
    "v": 1,
    "id": "p4r7t2w9k3mz",
    "kind": "connect",
    "connector": "wiro",
    "title": "Wiro AI Models",
    "authtype": "headers",
    "mode": "project",
    "fields": [
      { "name": "wiro_credentials", "label": "Wiro Credentials", "description": "", "required": true, "secret": true, "format": "password", "source": "wiro_project" }
    ],
    "requestedby": "5f0c9a2e-1b7d-4c3a-9e8f-2a6b7c8d9e0f",
    "createdat": 1794655500,
    "status": "applied",
    "actedat": 1794655560,
    "actedby": "5f0c9a2e-1b7d-4c3a-9e8f-2a6b7c8d9e0f"
  },
  "restarting": true,
  "live": false,
  "summary": "Wiro AI Models connected"
}
```

- The project becomes the agent's own Wiro project, as [`CredentialProjectBind`](/docs/agent-overview#post-useragentcredentialprojectbind) binds it and with the same checks, and the connector's tools act with it as the agent's own calls: see [Wiro AI Models](/docs/agent-connectors#the-wiro-connector). A project Wiro refuses saves nothing, and the card stays pending with the sentence, such as `This is a team agent: use one of its team's projects.`
- Left out, a call made with your project API key binds that key's own project. When the card can't connect without a project, it stays pending with `Pick a project on the card to connect Wiro AI Models.`, and `next` names it.
- A `project` card never connects from a typed reply and never takes a pasted key. In a chat sent with your API key, a `yes` while only `connect` cards wait, this one among them, is answered `A yes cannot connect Wiro AI Models. Its project is picked outside this chat.`: nothing is applied and no agent turn starts.

### Sign-in: HubSpot

A connector that signs in gets a `signin` card. HubSpot signs in with an app of your own, so its card's `fields` are that app's client id and secret, and the help text names the redirect URI to register in the app:

```json
{
  "v": 1,
  "id": "q8n2v5k1m7xt",
  "kind": "connect",
  "connector": "hubspot",
  "title": "HubSpot",
  "authtype": "provider-oauth",
  "mode": "signin",
  "fields": [
    {
      "name": "clientid",
      "label": "Client ID",
      "description": "1. Go to [developers.hubspot.com](https://developers.hubspot.com) and create an app (or open an existing one)\n2. Open the app's **Auth** tab\n3. Add this **Redirect URL**:\n`https://api.wiro.ai/v1/AgentConnector/OAuthCallback`\n4. Under **Scopes**, add these as **Required**: `oauth`, `crm.objects.contacts.read`, `crm.objects.contacts.write`, `crm.lists.read`, `crm.lists.write`; and these as **Optional**: `crm.objects.companies.read`, `crm.objects.companies.write`, `crm.objects.deals.read`, `crm.objects.deals.write`, `crm.objects.owners.read`, `crm.schemas.contacts.read`, `tickets`, `content`, `marketing-email`, `transactional-email`, `files`. HubSpot refuses a sign-in that asks for a scope the app does not list, and leaves out an optional scope the account's plan does not include\n5. Save and copy the **Client ID**",
      "required": true,
      "secret": false,
      "format": "text",
      "maxlength": 200,
      "serveronly": true,
      "mode": "oauth"
    },
    {
      "name": "clientsecret",
      "label": "Client Secret",
      "description": "",
      "required": true,
      "secret": true,
      "format": "password",
      "serveronly": true,
      "mode": "oauth"
    }
  ],
  "requestedby": "5f0c9a2e-1b7d-4c3a-9e8f-2a6b7c8d9e0f",
  "createdat": 1794655200
}
```

Its block's `next` reads `[{ "connector": "hubspot", "title": "HubSpot", "mode": "signin" }]`.

**1. Start the sign-in.** Your app shows the two fields and a **Sign in** button. Your backend sends the app's keys and a page on your own site to come back to:

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Message/SetupCardApply" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
    "messageguid": "a7b8c9d0-e1f2-3456-a789-0123456789ab",
    "cardid": "q8n2v5k1m7xt",
    "action": "apply",
    "values": { "clientid": "YOUR_HUBSPOT_CLIENT_ID", "clientsecret": "YOUR_HUBSPOT_CLIENT_SECRET" },
    "redirecturl": "https://app.example.com/agents/42/chat?card=q8n2v5k1m7xt"
  }'
```

The answer gives the vendor's sign-in address. The card stays pending, and `next` names it:

```json
{
  "result": true,
  "errors": [],
  "setup": {
    "v": 1,
    "id": "q8n2v5k1m7xt",
    "kind": "connect",
    "connector": "hubspot",
    "title": "HubSpot",
    "authtype": "provider-oauth",
    "mode": "signin",
    "fields": [
      { "name": "clientid", "label": "Client ID", "description": "1. Go to [developers.hubspot.com](https://developers.hubspot.com) and create an app ...", "required": true, "secret": false, "format": "text", "maxlength": 200, "serveronly": true, "mode": "oauth" },
      { "name": "clientsecret", "label": "Client Secret", "description": "", "required": true, "secret": true, "format": "password", "serveronly": true, "mode": "oauth" }
    ],
    "requestedby": "5f0c9a2e-1b7d-4c3a-9e8f-2a6b7c8d9e0f",
    "createdat": 1794655200
  },
  "restarting": false,
  "live": false,
  "summary": "",
  "authorizeUrl": "https://app.hubspot.com/oauth/authorize?client_id=YOUR_HUBSPOT_CLIENT_ID&redirect_uri=https%3A%2F%2Fapi.wiro.ai%2Fv1%2FAgentConnector%2FOAuthCallback&scope=crm.objects.contacts.read+crm.objects.contacts.write+crm.lists.read+crm.lists.write+oauth&response_type=code&state=7f3c...",
  "next": [{ "connector": "hubspot", "title": "HubSpot", "mode": "signin", "cardid": "q8n2v5k1m7xt", "messageguid": "a7b8c9d0-e1f2-3456-a789-0123456789ab" }]
}
```

**2. Open `authorizeUrl`** in the person's browser, in a popup or the same window. HubSpot's consent screen shows the app whose keys you sent. The address works for 10 minutes and once: a new **Sign in** gets a fresh one.

**3. The browser comes back.** HubSpot sends the browser to the API's callback, which stores the tokens, marks the connection `connected`, gives the connector to a running agent and sends the browser on to your `redirecturl` with `connector_connected=true`, or with `connector_error=<code>` when the sign-in didn't finish (see [The callback and your redirect URL](/docs/agent-connectors#the-callback-and-your-redirect-url)).

**4. Record the card.** Once the browser is back with `connector_connected=true`, call `SetupCardApply` on the card again, with no `values`. Make this call only then: while the connector doesn't read connected, after `connector_error=<code>` or a closed window, it starts a new sign-in instead and answers a new `authorizeUrl`. It answers the card applied:

```json
{
  "result": true,
  "errors": [],
  "setup": {
    "v": 1,
    "id": "q8n2v5k1m7xt",
    "kind": "connect",
    "connector": "hubspot",
    "title": "HubSpot",
    "authtype": "provider-oauth",
    "mode": "signin",
    "fields": [
      { "name": "clientid", "label": "Client ID", "description": "1. Go to [developers.hubspot.com](https://developers.hubspot.com) and create an app ...", "required": true, "secret": false, "format": "text", "maxlength": 200, "serveronly": true, "mode": "oauth" },
      { "name": "clientsecret", "label": "Client Secret", "description": "", "required": true, "secret": true, "format": "password", "serveronly": true, "mode": "oauth" }
    ],
    "requestedby": "5f0c9a2e-1b7d-4c3a-9e8f-2a6b7c8d9e0f",
    "createdat": 1794655200,
    "status": "applied",
    "actedat": 1794655390,
    "actedby": "5f0c9a2e-1b7d-4c3a-9e8f-2a6b7c8d9e0f"
  },
  "restarting": false,
  "live": false,
  "summary": "HubSpot connected"
}
```

The agent already got the connector when the sign-in came back, so `restarting` and `live` are `false`. Without this call, the card is recorded applied the next time a card of the same person's is applied or dismissed in that chat; until then it still shows its Sign in.

- A card from a chat sent with your API key never carries `wiroapp: true`: its sign-in always uses your own app, and HubSpot's consent screen shows that app. Send the app's keys with the first sign-in; a later sign-in of the same connection may leave them out and use the saved ones. Without them, the answer is `Client ID is required. Client Secret is required.` and the card stays pending.
- An `oauth` connector, a vendor's own MCP server with its own sign-in such as TikTok Ads, has no fields on its card: send `redirecturl` only. Its consent screen names your organization. Its card and answers are in [Add and Connect](#add-and-connect).
- A connector with account pickers, such as Facebook Pages, lists its candidates once it is connected, and acts on no account until a selection is saved. After its card is applied, read `accountpickers` on [`AgentConnector/Detail`](/docs/agent-connectors#post-agentconnectordetail): when `accounts` on [`ConnectorList`](/docs/agent-connectors#post-useragentconnectorlist) holds nothing for a picker, let the person choose on your settings screen with [`ConnectorAccounts`](/docs/agent-connectors#post-useragentconnectoraccounts) and [`ConnectorSetAccounts`](/docs/agent-connectors#post-useragentconnectorsetaccounts): no card picks accounts.
- A connection can later need a new sign-in: `ConnectorList` reads `reauth` when the sign-in expired or was revoked, and until the agent next restarts or gets a change, the connector's tools answer `The sign-in for this connector expired or was revoked, so it has to be connected again. Ask the agent's operator to reconnect it.` ConnectorAccounts refuses it with code `"reauth"` and the same sentence. Offer Reconnect. The agent may propose a new `connect` card for it, which signs in again like any `signin` card and reuses the saved app keys when `values` leaves them out, or you start a new sign-in with ConnectorConnect on your settings screen.

### Add and Connect

An `add` card can apply together with one of its `connect` cards in one call: its one pending `key` card, with that card's values in `values`, or its one pending `signin` card, with `signin: true` once that card's sign-in has connected the connector. A `project` card always takes its own step. [Buttons](#buttons) says which buttons to show.

**With a key.** Send the `add` card with the `connect` card's values. For Google Play Promotional Content and its Google Play Console card, from [Every kind](#every-kind), the one field is JSON, and a `json` field also takes an object:

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Message/SetupCardApply" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
    "messageguid": "d8e9f0a1-b2c3-4567-d890-123456789abc",
    "cardid": "g7p2k5m9w4ta",
    "action": "apply",
    "values": { "serviceaccountjson": { "type": "service_account", "client_email": "play-agent@acme-apps.iam.gserviceaccount.com", "private_key": "..." } }
  }'
```

Both cards apply in one step, and `paired` is the `connect` card after the call:

```json
{
  "result": true,
  "errors": [],
  "setup": {
    "v": 1,
    "id": "g7p2k5m9w4ta",
    "kind": "add",
    "key": "util-googleplay-events",
    "needs": [{ "connector": "google-play", "title": "Google Play Console", "mode": "key" }],
    "requestedby": "5f0c9a2e-1b7d-4c3a-9e8f-2a6b7c8d9e0f",
    "createdat": 1794656000,
    "status": "applied",
    "actedat": 1794656090,
    "actedby": "5f0c9a2e-1b7d-4c3a-9e8f-2a6b7c8d9e0f"
  },
  "restarting": false,
  "live": true,
  "summary": "Google Play Promotional Content added. Google Play Console connected.",
  "paired": [
    {
      "setup": {
        "v": 1,
        "id": "c2v8n4q6x1pd",
        "kind": "connect",
        "connector": "google-play",
        "title": "Google Play Console",
        "authtype": "fields",
        "mode": "key",
        "fields": [
          { "name": "serviceaccountjson", "label": "Service Account JSON", "description": "1. Go to [Google Cloud Console → IAM & Admin → Service Accounts](https://console.cloud.google.com/iam-admin/serviceaccounts) ...", "required": true, "secret": true, "format": "json" }
        ],
        "requestedby": "5f0c9a2e-1b7d-4c3a-9e8f-2a6b7c8d9e0f",
        "createdat": 1794656000,
        "status": "applied",
        "actedat": 1794656090,
        "actedby": "5f0c9a2e-1b7d-4c3a-9e8f-2a6b7c8d9e0f"
      },
      "result": true,
      "error": null
    }
  ]
}
```

A value that fails the field's checks, such as a required field left out, applies neither card: the answer is `result: false` with the sentence, both cards stay pending, and `paired` holds the `connect` card with the same sentence in `error`. A key the vendor refuses once the skill is added leaves the `add` card applied (`result: true`, `summary` names only the skill) and the `connect` card pending: `paired[0]` has `result: false` and the vendor's sentence in `error`, and `next` names the `connect` card for the person to try again.

**With a sign-in.** On an agent that has Google Ads and Meta Ads connected, Ads Manager Common Rules needs only TikTok Ads. TikTok Ads signs in on the vendor's own MCP server (`authtype: "oauth"`), so its card has no fields:

```json
{
  "v": 1,
  "id": "a3d6s9m2k7qe",
  "kind": "add",
  "key": "util-ads-manager-common",
  "needs": [{ "connector": "tiktok-ads", "title": "TikTok Ads", "mode": "signin" }],
  "requestedby": "5f0c9a2e-1b7d-4c3a-9e8f-2a6b7c8d9e0f",
  "createdat": 1794657000
}
```

```json
{
  "v": 1,
  "id": "t5k8a1d4s7wn",
  "kind": "connect",
  "connector": "tiktok-ads",
  "title": "TikTok Ads",
  "authtype": "oauth",
  "mode": "signin",
  "fields": [],
  "requestedby": "5f0c9a2e-1b7d-4c3a-9e8f-2a6b7c8d9e0f",
  "createdat": 1794657000
}
```

**1. Sign in on the `connect` card**, with your `redirecturl` only:

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Message/SetupCardApply" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
    "messageguid": "e1f2a3b4-c5d6-7890-e123-4567890abcde",
    "cardid": "t5k8a1d4s7wn",
    "action": "apply",
    "redirecturl": "https://app.example.com/agents/42/chat?card=t5k8a1d4s7wn"
  }'
```

```json
{
  "result": true,
  "errors": [],
  "setup": {
    "v": 1,
    "id": "t5k8a1d4s7wn",
    "kind": "connect",
    "connector": "tiktok-ads",
    "title": "TikTok Ads",
    "authtype": "oauth",
    "mode": "signin",
    "fields": [],
    "requestedby": "5f0c9a2e-1b7d-4c3a-9e8f-2a6b7c8d9e0f",
    "createdat": 1794657000
  },
  "restarting": false,
  "live": false,
  "summary": "",
  "authorizeUrl": "https://business-api.tiktok.com/portal/mcp-tt4b-authorize?response_type=code&client_id=...&redirect_uri=https%3A%2F%2Fapi.wiro.ai%2Fv1%2FAgentConnector%2FOAuthCallback&state=...&code_challenge=...&code_challenge_method=S256&resource=...&scope=mcp%3Att4b",
  "next": [{ "connector": "tiktok-ads", "title": "TikTok Ads", "mode": "signin", "cardid": "t5k8a1d4s7wn", "messageguid": "e1f2a3b4-c5d6-7890-e123-4567890abcde" }]
}
```

**2. Open `authorizeUrl`.** The browser signs in on TikTok's page and comes back to your `redirecturl` with `connector_connected=true`, and a running agent has TikTok Ads' tools from its next message.

**3. Add.** Send the `add` card with `signin: true`:

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Message/SetupCardApply" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
    "messageguid": "e1f2a3b4-c5d6-7890-e123-4567890abcde",
    "cardid": "a3d6s9m2k7qe",
    "action": "apply",
    "signin": true
  }'
```

Both cards are recorded applied:

```json
{
  "result": true,
  "errors": [],
  "setup": {
    "v": 1,
    "id": "a3d6s9m2k7qe",
    "kind": "add",
    "key": "util-ads-manager-common",
    "needs": [{ "connector": "tiktok-ads", "title": "TikTok Ads", "mode": "signin" }],
    "requestedby": "5f0c9a2e-1b7d-4c3a-9e8f-2a6b7c8d9e0f",
    "createdat": 1794657000,
    "status": "applied",
    "actedat": 1794657180,
    "actedby": "5f0c9a2e-1b7d-4c3a-9e8f-2a6b7c8d9e0f"
  },
  "restarting": false,
  "live": true,
  "summary": "Ads Manager Common Rules added. TikTok Ads connected.",
  "paired": [
    {
      "setup": {
        "v": 1,
        "id": "t5k8a1d4s7wn",
        "kind": "connect",
        "connector": "tiktok-ads",
        "title": "TikTok Ads",
        "authtype": "oauth",
        "mode": "signin",
        "fields": [],
        "requestedby": "5f0c9a2e-1b7d-4c3a-9e8f-2a6b7c8d9e0f",
        "createdat": 1794657000,
        "status": "applied",
        "actedat": 1794657180,
        "actedby": "5f0c9a2e-1b7d-4c3a-9e8f-2a6b7c8d9e0f"
      },
      "result": true,
      "error": null
    }
  ]
}
```

Sent before the sign-in came back, it applies nothing, and `errorcode` says why:

```json
{
  "result": false,
  "errors": [{ "code": 0, "message": "TikTok Ads is not connected yet. Finish the sign-in on the card first.", "time": 1794657100 }],
  "setup": {
    "v": 1,
    "id": "a3d6s9m2k7qe",
    "kind": "add",
    "key": "util-ads-manager-common",
    "needs": [{ "connector": "tiktok-ads", "title": "TikTok Ads", "mode": "signin" }],
    "requestedby": "5f0c9a2e-1b7d-4c3a-9e8f-2a6b7c8d9e0f",
    "createdat": 1794657000
  },
  "restarting": false,
  "live": false,
  "summary": "",
  "errorcode": "not_connected",
  "paired": [
    {
      "setup": {
        "v": 1,
        "id": "t5k8a1d4s7wn",
        "kind": "connect",
        "connector": "tiktok-ads",
        "title": "TikTok Ads",
        "authtype": "oauth",
        "mode": "signin",
        "fields": [],
        "requestedby": "5f0c9a2e-1b7d-4c3a-9e8f-2a6b7c8d9e0f",
        "createdat": 1794657000
      },
      "result": false,
      "error": "TikTok Ads is not connected yet. Finish the sign-in on the card first."
    }
  ]
}
```

TikTok Ads acts on the advertisers picked for it: list and save them next, as in [TikTok Ads: sign in, then pick advertisers](/docs/agent-connectors#tiktok-ads-sign-in-then-pick-advertisers).

### Connecting on your settings screen

Every connector also connects without a card, on your own settings screens, with the Agent Connectors calls: [fields](/docs/agent-connectors#connect-with-fields), a [key instead of a sign-in](/docs/agent-connectors#connect-with-a-key-instead-of-a-sign-in), or the vendor's [sign-in](/docs/agent-connectors#connect-with-a-sign-in) with a `redirecturl` on your own site, then its [account pickers](/docs/agent-connectors#account-pickers). Each answers `restart` (or `connector_connected=true` on your page after a sign-in): see [Live Changes and Restarts](#live-changes-and-restarts). A pending `connect` card for a connector connected there is recorded applied when you apply it, with no values, or the next time a card of the same person's in that chat is applied or dismissed. A channel is saved with [`CredentialUpsert`](/docs/agent-overview#post-useragentcredentialupsert): no card saves it. The agent's Wiro project is bound with [`CredentialProjectBind`](/docs/agent-overview#post-useragentcredentialprojectbind), or by the `project` card of Wiro AI Models (`wiro`), which binds it the same way.

## Your Own Connect Button

### Where next appears

`next` is the list of connectors still to connect, as data for your own buttons. It comes in four places:

| Where | When | Entries |
|-------|------|---------|
| A setup block | On a pending `connect` card | One entry, its own connector: `{ connector, title, mode }`. No `cardid`: it is the block's own card. |
| `SetupCardApply` answer | An `add` card applied that leaves something not connected; a `connect` card left pending, by a refused key or project, or a sign-in just started | `{ connector, title, mode, cardid?, messageguid? }` |
| `setupresult.next` in a `Message/Send` answer | A `yes` that applied a card: the reply's `key` cards still waiting for their key, its `signin` and `project` cards for the connectors the applied `add` card needs, and each connector that `add` card needs with no card to connect it. A `yes` while a `signin` or `project` card waits: the reply's `connect` cards. A key typed for an `add` card and its `connect` card: the other connectors that `add` card needs. | Same |
| `metadata.next` in the webhook | The same answers as `setupresult.next`, posted to the message's `callbackurl` | Same |

`next` is absent when nothing is left to connect: never an empty array.

### Entry fields

| Field | Description |
|-------|-------------|
| `connector` | The connector's slug, as `needs[].connector` and a `connect` card's `connector` name it. |
| `title` | Its name, one line, up to 80 characters. Use it on the button: "Connect Serper". |
| `mode` | `key`, `signin` or `project`. See [Modes](#modes). |
| `cardid` | The pending `connect` card that records the connection once it is made. Absent when no card records it, for example after its card was turned down. |
| `messageguid` | The message that card is on. Present exactly when `cardid` is, and only in answers. |

### From next to a button

```javascript
// For each entry of next, show one button.
// own: for an entry of a block's next, that block's card and message.
async function connectFromNext(entry, useragentguid, own) {
  const cardid = entry.cardid || (own && own.cardid);
  const messageguid = entry.messageguid || (own && own.messageguid);
  if (entry.mode === "key") {
    const values = await askForFields(entry.connector); // your form, from the card's fields or Detail's credentialfields
    if (!cardid) return connectorConnect({ useragentguid, slug: entry.connector, values }); // no card records it
    return setupCardApply({ useragentguid, messageguid, cardid, action: "apply", values });
  }
  if (entry.mode === "signin") {
    const values = await askForFields(entry.connector); // every field of the card, or Detail's credentialfields with mode "oauth" or none
    const redirecturl = returnPageFor(entry.connector);  // a page on your own site
    const started = cardid
      ? await setupCardApply({ useragentguid, messageguid, cardid, action: "apply", values, redirecturl })
      : await connectorConnect({ useragentguid, slug: entry.connector, values, redirecturl });
    if (!started.result || !started.authorizeUrl) return started; // a refusal, or already connected
    const back = await openAndWaitForReturn(started.authorizeUrl); // the query your redirecturl received
    if (back.connector_connected !== "true") return back; // connector_error=<code>: show it, offer Sign in again
    if (cardid) return setupCardApply({ useragentguid, messageguid, cardid, action: "apply" }); // records the card
    return started;
  }
  if (entry.mode === "project") {
    const wiroprojectguid = await askForProject(); // your picker of Project/List
    if (!cardid) return connectorConnect({ useragentguid, slug: entry.connector, wiroprojectguid }); // no card records it
    return setupCardApply({ useragentguid, messageguid, cardid, action: "apply", wiroprojectguid });
  }
  // A mode you don't know: connect it from your own settings screen.
  return openSettingsScreen(entry.connector);
}

// A pending connect card's block, on its Message/Detail or History row:
// connectFromNext(block.next[0], useragentguid, { cardid: block.setup.id, messageguid: row.guid });
```

A block's `next` names no card because the card is the block's own: pass its `setup.id` and the row's `guid`, as the last line shows. An entry of an answer with no `cardid` has no card left to record it, for example because its `connect` card was turned down: connect it with [`ConnectorConnect`](/docs/agent-connectors#post-useragentconnectorconnect), and there is nothing to apply.

## Errors and What to Show

Every refusal comes as `result: false` with one plain sentence in `errors[0].message`. Show it as it is, or your own words for it, and don't branch your code on sentences: they can change.

### SetupCardApply refusals

| Sentence | What to do |
|----------|------------|
| `Request parameter [<name>] required`, `action must be apply or dismiss`, `values must be an object of field names and text.`, `Send values or signin, not both.`, `redirecturl must be a URL.`, `wiroprojectguid must be a project's id.` | Fix the request. |
| `Setup from chat is off for this agent.` | Set `chatsetup` to `"all"`, or change the setup from your settings screens. |
| `Agent not found or access denied`, or a sentence that names the workspace to use | Your key can't reach this agent: see [Who may call it](#who-may-call-it). |
| `Only an agent admin can apply setup changes.` (code `97`) | The key's owner can't apply on this agent. |
| `Wait until the agent finishes this reply, then apply it.` | Enable Apply once the reply ends. |
| `This setup card was not found.` | Wrong `messageguid` or `cardid`, or a message the key's owner can't see. |
| `This card was already applied.`, `This card was already dismissed.`, `This card was already failed.` | Show the card from `setup` in its state. |
| `This card is being applied. Try again in a moment.`, `The card could not be applied right now. Try again in a moment.`, `Another change to this agent's connectors or skills is being applied. Try again in a moment.` | Someone is acting on this card, or on the agent's setup, right now (an `add` or `remove` card waits for another skill change; the card stays pending). Let the person try again after a few seconds. |
| `This card takes no key. Apply it without one.`, `This card brings more than one key. Apply it, then add each key on its own card.` | `values` on an `add` card that can't take them. |
| `This card has no sign-in to finish. Apply it without one.` (`errorcode` `signin_no_pair`), `This card brings more than one sign-in. Apply it, then connect each on its own card.` (`signin_many`) | `signin: true` on an `add` card that can't take it. |
| `<Title> is not connected yet. Finish the sign-in on the card first.` (`errorcode` `not_connected`) | `signin: true` before the sign-in came back. Nothing was applied. |
| A field's sentence, such as `Serper API Key is required.` (or, for a `signin` card sent without your app's keys, `Client ID is required. Client Secret is required.`), the vendor's own refusal, a project refusal such as `This is a team agent: use one of its team's projects.`, or `Invalid redirect URL` | The checks of `ConnectorConnect` refused the card's values or project: show it next to the form. Nothing was saved and the card stays pending. See [Errors](/docs/agent-connectors#errors) on Agent Connectors. |
| `Pick a project on the card to connect <Title>.` | A `project` card applied without `wiroprojectguid` that can't connect without one. Show your project picker. Nothing was saved and the card stays pending. |
| `The setup card could not be applied. Try again.` | Something went wrong. Read the card again with `Message/Detail` before you offer to try again. |

These refusals carry `code` `0`, except the rights refusal, whose `code` is `97`. Check what you can before you call: that the reply has ended, that `chatSetup` is `"all"`, and that the card is pending in your copy.

A card that fails as it is applied gets `status: "failed"` and its sentence in `setup.error`, and the answer is `result: false` with the same sentence. The usual ones are `This agent's connectors or skills changed after the card was made. Ask the agent again.`, `This skill changed after the card was made. Ask the agent again.`, `<Title> can't be connected any more.` (the connector left the catalog), `<Title> is not connected.` (a `disconnect` card whose connection is already gone) and `The change could not be applied. Try again in a moment.`, when Wiro couldn't make the change. Show it on the card. A failed card can't be applied again: the person asks the agent for a new one.

### Connector refusals and sign-in returns

The calls your settings screens make answer their own refusals, and a sign-in returns to your `redirecturl` with `connector_connected=true` or `connector_error=<code>`. Both lists, with what to show, are on Agent Connectors: [Errors](/docs/agent-connectors#errors) and [The callback and your redirect URL](/docs/agent-connectors#the-callback-and-your-redirect-url).

## Live Changes and Restarts

### What reaches the agent live

A running agent takes most changes live: it keeps running, a reply it is writing goes on, and it uses the change from its next message. Keep the chat open and show nothing more than the applied card.

- `add`, `remove`, `connect` (a key saved), `disconnect`, `schedule` and `skill` cards of every kind reach a running agent live. An `add` card applied with its key brings both cards in one step.
- A `signin` card's sign-in reaches the agent when the browser comes back with `connector_connected=true`. Recording the card afterwards changes nothing more.
- A connector connected on your settings screen reaches a running agent the same way: `ConnectorConnect`, `ConnectorSetAccounts`, `ConnectorDisconnect` and `ConnectorSetPermissions` answer `restart: "live"`.
- These restart the agent: a `timezone` card, a `project` card that binds another project (as `CredentialProjectBind` does), an `add` or `remove` card for `util-voice-receptionist`, `util-twilio-channel`, `util-web-channel` or `util-newsletter-compose`, and a live change that can't be applied in full, which restarts the agent by itself.
- A change made while a restart is still stopping or queued loads with that restart, and one made while the agent is starting reaches it once it runs.
- An agent that is stopped doesn't start: it loads the change when it next starts, and `restarting` and `live` are `false`.

`live` and `restarting` in the `SetupCardApply` answer and in `setupresult` say which happened.

### Status values

Read the agent's `status` with [`POST /UserAgent/Detail`](/docs/agent-overview#post-useragentdetail) `{ "guid": "<useragentguid>" }`:

| `status` | During a restart |
|----------|------------------|
| `1` Stopping | The agent is shutting down to start again. |
| `2` Queued | It waits to start. |
| `3` Starting | It is starting. |
| `4` Running | Ready for messages again. |

A restart takes a minute or two. If the poll reads `0` (stopped), `5` (error) or `6` (setup required) instead, the agent won't start by itself: stop polling and say so. `0` and `5` start again with [`POST /UserAgent/Start`](/docs/agent-overview#post-useragentstart), unless the agent's plan has ended: Start then answers code `97` with `agentusage.pausedreason: "plan"` and `<agent> has no active plan. Choose a plan to keep it running.`, and renewing the plan starts the agent (see [Send a message](#send-a-message)). `6` has no plan yet: pay it with [`CreateSubscriptionCheckout`](/docs/agent-overview#post-useragentcreatesubscriptioncheckout) (`useprepaid: true`), which queues it (credentials and connectors never hold an agent at `6`); see [UserAgent Statuses](/docs/agent-overview#useragent-statuses).

### Showing a restart

When an answer says the agent restarts, show a line such as "Restarting to load the change, a minute or two" above the message box, and poll `UserAgent/Detail` every five seconds until `status` is `4`. Then hide the line. You can leave the message box on: a message sent too early gets a clear refusal you can show. When it says the change is live, show it as applied and nothing more: the agent runs on.

Each call says it in its own field:

| Call | Says the agent restarts, or got the change live, with |
|------|------------------------------|
| `SetupCardApply`, and `Message/Send` in `setupresult` | `restarting: true`; `live: true` when the running agent got the change with no restart |
| `ConnectorConnect`, `ConnectorSetAccounts`, `ConnectorDisconnect`, `ConnectorSetPermissions`, `CredentialProjectBind` | `restart: "scheduled"`; `"live"` when the running agent got the change with no restart |
| `UpdateSettings`, `SkillToggle` and the custom skill calls | `restarting: true`, with `restart: "scheduled"` where the answer has `restart`; `live: true` for a change with no restart |
| `SkillsApply` | `restartTriggered: true` and `restart: "scheduled"`; `restart: "live"` and `live: true` for a change with no restart |
| A sign-in that came back to your `redirecturl` | `connector_connected=true`; read `status` on `UserAgent/Detail` once: `4` means the agent got the connector with no restart |
| `CredentialUpsert` | Nothing. After a save that can restart the agent, such as a channel's fields, poll `UserAgent/Detail` the same way. |


### Messages during a restart

While the agent isn't running, `Message/Send` answers `result: false` with `agentstatus` and one of these sentences, shown as they are:

| `agentstatus` | Sentence |
|---------------|----------|
| `1` | `Agent is restarting. Please wait a moment and try again.` (or `Agent is stopping. Please wait a moment and try again.` when it stops for good) |
| `2`, `3` | `Agent is starting up. Please wait a moment and try again.` |
| `0` | `Agent is stopped. Start it before sending messages.` |
| `5` | `Agent is in error state. Restart it before sending messages.` |
| `6` | `Agent setup is incomplete. Complete the setup before sending messages.` |

An agent that is stopped (`0`) or in error (`5`) and has no active plan gets code `97` instead, with `agentstatus`, `agentusage` (`pausedreason: "plan"`) and `<agent> has no active plan. Choose a plan to keep it running.`: offer a plan, since `Start` can't run it (see [Send a message](#send-a-message)).

Before this refusal, Wiro still answers the replies it handles itself:

- A `yes` that lists or applies a card (a `connect` card only when it needs no values), and a `yes` while only `connect` cards wait and one of them signs in or picks a project, answered `A yes cannot connect <Title>. Its sign-in and any app keys are entered outside this chat, never in it.` or, for a `project` card, `A yes cannot connect <Title>. Its project is picked outside this chat.`
- A key for the only `connect` card waiting, when it is a `key` card with one secret field. Another service's key is answered too, whoever sends it, and nothing is saved: `That does not look like a <Title> key (it looks like <kind>), so it was not saved. Paste the <Title> key as your reply.` The part in brackets comes only when Wiro knows the kind, and before a title that starts with a vowel, `a` becomes `an`, as in `an Apollo key`.
- Such a `yes`, or a key for the waiting `key` card, from a sender who isn't an agent admin, answered `Only an agent admin can apply setup changes.`
- A `no` that turned pending cards down, answered `The setup change was turned down.` or `The <N> setup changes were turned down.`
- A `yes`, `always` or `no` that answers a connector's approval card, or gets its listing (see [Answering with a reply](/docs/agent-connectors#answering-with-a-reply)). An allowed call can't run while the agent is down, so the answer ends with `The agent isn't running, so nothing ran. It can use this approval if it's asked again in this chat within an hour.`

Every other message gets the refusal, a `yes` while only `key` cards wait, a key while more than one `connect` card waits, and a `yes` or `no` with no pending card included. A turn still running when the restart began, in another session for example, ends as `agent_error` with `[TURN_INTERRUPTED]`: offer to send it again.

## Chats Without Cards

Your chat can work with text alone, or people may type `yes` even where you show cards. Wiro then reads the reply itself.

### Typed replies

- **Approve.** A message that is only an approval, such as `yes`, `ok`, `approve`, `go ahead`, `evet` or `👍`, acts on the pending cards of the agent's latest reply in the same `sessionkey`, when they are less than 30 minutes old. In a chat sent with your API key, the first approval applies nothing: Wiro answers with the card listing, the exact content of the cards. A second one applies the one card listed. With several cards, `yes 2` applies card 2 once the listing has shown it, one card per reply.
- **Turn down.** A message that is only a refusal, such as `no` or `cancel`, dismisses the pending cards of the latest reply that are less than 30 minutes old, then goes to the agent as a normal message. Older cards aren't dismissed, and the `no` goes to the agent all the same. While the agent isn't running, Wiro answers it itself: `The setup change was turned down.`, or `The <N> setup changes were turned down.` for several cards. Anyone who can write in the chat can turn cards down.
- **A key as the reply.** When the latest reply has one pending `connect` card and it is a `key` card with one secret field (never a `project` card), a key pasted as the reply can be saved to it with your key owner's rights: the key is saved, and the message is stored as `[key saved to <Connector title>]`. When the connector needs more than that key, nothing is saved and the answer names what is missing: use the card's form. In a chat sent with your API key, when the only pending cards are an `add` card and its `connect` card, and the key is all the connector needs, the key typed after the listing applies both cards at once. A key typed before that listing saves nothing: the message is stored with `[key removed]` in its place, and Wiro answers with the listing.
- **Approval cards.** While a connector's approval card waits on the agent's latest reply, `yes`, `always` and `no` answer it instead: in a chat sent with your API key the first `yes` gets Wiro's listing of each card's exact request, and a second `yes` (or `yes 2`) allows one card once; `always` from your API key allows once too; `no` declines every waiting card at once and, where `chatsetup` allows the message, turns the reply's setup cards down with them. No agent turn runs for any of these. A setup card and an approval card on the same reply get one listing of both. While no approval card waits on the latest reply and it is the turn an approval started, or one in which the agent asked again for a call whose card still waits, the first `yes` lists the cards still waiting on earlier messages of the session, and later replies answer them by that listing; a `no` sent before it goes to the agent. After any other reply, such as the agent's own question, a reply doesn't reach those cards. See [Answering with a reply](/docs/agent-connectors#answering-with-a-reply).
- A `yes` applies a `connect` card only when it needs no values. A `key` card waits for its key, and a `signin` card never connects from a typed reply: a `yes` while it waits is answered `A yes cannot connect <Title>. Its sign-in and any app keys are entered outside this chat, never in it.`, applies nothing and starts no agent turn. Its card's Sign in connects it. A `project` card never connects from a typed reply either: a `yes` while it waits is answered `A yes cannot connect <Title>. Its project is picked outside this chat.`, and its card's Connect, with the project picked, connects it.

The latest reply is the newest row of the session, other than the replies Wiro answers itself and model switches. A row added between turns counts, such as a scheduled task's report written into that session: once it comes, a `yes` or `no` typed after it finds no setup cards, and doesn't reach the approval cards before it either, since such a row is neither the turn an approval started nor a reply in which the agent asked again (see [Cards on earlier messages](/docs/agent-connectors#cards-on-earlier-messages)). Your buttons still act on those cards, since `SetupCardApply` takes a pending card by its `messageguid` and `cardid`, at any age, as `ApprovalCardAct` does an approval card until it expires.

A message counts as an approval or a refusal when it is sent with no attachment and has at most four words, no question mark and nothing but these words. Case, accents and other punctuation don't matter:

| Kind | Words |
|------|-------|
| Approval | `yes`, `y`, `yeah`, `yep`, `yup`, `ok`, `okay`, `sure`, `approve`, `approved`, `confirm`, `confirmed`, `apply`, `lgtm`, `do it`, `go ahead`, `go for it`, `sounds good`, `looks good`, `please do`, `of course`, `evet`, `e`, `tamam`, `tamamdır`, `olur`, `onay`, `onayla`, `onaylıyorum`, `onayladım`, `uygula`, `kabul`, `kabul ediyorum`, `ja`, `oui`, `si`, `sim`, `da`, `hai`, `👍`, `✅`, `✔` |
| Refusal | `no`, `n`, `nope`, `nah`, `cancel`, `stop`, `don't`, `do not`, `never mind`, `not now`, `hayır`, `yok`, `iptal`, `vazgeç`, `vazgeçtim`, `istemiyorum`, `nein`, `non`, `não` |
| Courtesy, allowed next to either | `please`, `pls`, `plz`, `thanks`, `thx`, `ty`, `thank you`, `lütfen`, `teşekkürler`, `teşekkür ederim`, `sağol`, `sağolun`, `bitte`, `danke`, `merci`, `gracias`, `por favor` |
| A card number, with an approval | One number from 1 to 3, as in `yes 2`, `apply #1`, `evet 3` or `yes card 2`; 1 to 6 when approval cards wait on the same reply, where `no 2` declines the card the newest listing of that reply showed as 2 |

For approval cards, `always`, `always allow`, `hep` and `her zaman` are words too: see [Answering with a reply](/docs/agent-connectors#answering-with-a-reply).

If people who must not change the agent can write in your chat, hold back from Wiro the messages that are only these words, and a key sent while a `key` connect card waits, or set `chatsetup` to `"off"` for that agent. `chatsetup` doesn't stop a typed answer to an approval card: while one waits, hold such messages back and answer cards from your own UI with [ApprovalCardAct](/docs/agent-connectors#post-useragentmessageapprovalcardact). The full rules are in [Approving a setup card](/docs/agent-messaging#approving-setup-cards) and [Answering with a reply](/docs/agent-connectors#answering-with-a-reply).

### Listing the cards

The first `yes` in a chat sent with your API key gets the listing:

```json
{
  "result": true,
  "errors": [],
  "messageguid": "e5f6a7b8-c9d0-1234-ef56-789012345678",
  "agenttoken": null,
  "status": "agent_end",
  "response": "The agent proposes this setup change. Nothing is applied yet.\n\nCard 1: Add Weather (skill).\n\nReply \"yes\" to apply exactly this change, or \"no\" to turn it down.",
  "content": "yes",
  "setupresult": { "applied": [], "dismissed": [], "failed": [], "restarting": false, "live": false }
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
| `live` | `true` when the running agent got the change with no restart. |
| `next` | Only when the answer leaves connectors to connect: `[{ connector, title, mode, cardid?, messageguid? }]`, as in [Your Own Connect Button](#your-own-connect-button). |

The second `yes` applies the card:

```json
{
  "result": true,
  "errors": [],
  "messageguid": "f6a7b8c9-d0e1-2345-f678-901234567890",
  "agenttoken": null,
  "status": "agent_end",
  "response": "✅ Applied: Weather added.\nYour agent uses the change from its next message.",
  "content": "yes",
  "setupresult": {
    "applied": ["71xb9zrcd1sb"],
    "dismissed": [],
    "failed": [],
    "restarting": false,
    "live": true
  }
}
```

Show `response`. When something is left to connect, `setupresult.next` lists it: build your Connect buttons from it, as in [Your Own Connect Button](#your-own-connect-button). A webhook posted for these replies carries the same list in `metadata.next`.

### The answer lines

Wiro writes these lines in `response`, always in English. They name no site, page or link:

| Line | When |
|------|------|
| `✅ Applied: <summary>.` | A card was applied. An applied `add` card whose connectors have no `connect` card to finish them goes on with `Still to connect: <titles>`. |
| `⚠️ Not applied: <reason>` | The change failed. |
| `1 more setup change is still pending.`, `<N> more setup changes are still pending.` | A `yes` applied one card while other cards of the reply wait. |
| `<N> connector cards still need their keys: add each key on its card.` | Several `key` connect cards wait. |
| `This setup change was already handled.` | Someone acted on the card first, or it is gone. |
| `This setup change is being applied right now. Try again in a moment.` | Another call is applying the card. |
| `Your agent uses the change from its next message.` | A running agent got the change with no restart. |
| `Your agent is restarting to load the change. Continue in a minute or two.` | The change restarts the agent (shorter when a `Next:` line follows). |
| `Next: paste your <Title> key as your reply.` | A `key` card waits for its key. While the agent restarts, it goes on with `Send it now and it loads with this same restart.` |
| `Next: connect <Title> to finish. Its sign-in and any app keys are entered outside this chat, never in it.` | A `yes` applied an `add` card whose `signin` card still waits. `setupresult.next` names that card. |
| `Next: connect <Title> to finish. Its project is picked outside this chat.` | A `yes` applied an `add` card whose `project` card still waits. `setupresult.next` names that card. |
| `A yes cannot connect <Title>. Its sign-in and any app keys are entered outside this chat, never in it.` | A `yes` while only `connect` cards wait, one of them a `signin` card. Nothing was applied. |
| `A yes cannot connect <Title>. Its project is picked outside this chat.` | A `yes` while only `connect` cards wait, one of them a `project` card. Nothing was applied. |
| `⚠️ Not saved: <reason>. Paste the key again as your reply.` | The key was refused. Nothing was saved. |
| `That does not look like a <Title> key (it looks like <kind>), so it was not saved. Paste the <Title> key as your reply.` | The key pasted is another service's, and the only `connect` card waiting is a `key` card with one secret field. It comes whoever sent the key. The part in brackets is there only when Wiro knows the kind. Before a title that starts with a vowel, `a` becomes `an`, as in `an Apollo key`. |
| `⚠️ Not saved: <Add title> is still waiting. Reply "yes" to add it, or "no" to turn it down.` | A key typed for an `add` card whose `connect` card no longer waits. |
| `This card is older than 30 minutes. Use the card's button, or ask the agent again.` | The card turned 30 minutes old while the reply was read. In your product, offer your own button, or ask the agent again. |
| `Only an agent admin can apply setup changes.` | The sender can't apply changes. |
| `The setup change was turned down.`, `The <N> setup changes were turned down.` | A `no` while the agent isn't running. |

The full list is in [Wiro's answers](/docs/agent-messaging#setup-reply-lines).

## Screen and Take Control in Your App

Every agent has its own computer in the cloud: a 1920 x 1080 desktop with the web browser the agent works in. Your app can show that computer live, the agent's **Screen**, and let a person take control of it with the keyboard and mouse, for example to sign in to a site for the agent or to finish a step by hand. Your backend gets a one-time ticket with your API key, and your page opens a WebSocket with it and draws the screen with [noVNC](https://github.com/novnc/noVNC), an open source VNC client for the browser. The Wiro panel's own Screen works the same way: [Screen and Take Control](/docs/agent-overview#screen-and-take-control) in the Agent Overview describes it, with what pauses during control, the limits and the activity log rows.

```text
Your page                   Your backend                        Wiro
---------                   ------------                        ----
Show a Screen button?   ->  Realtime/ScreenInfo -------------->  available, canControl, reason
Person opens it         ->  Realtime/ScreenStart ------------->  wsUrl, screenToken (one use, 60 s)
new WebSocket(wsUrl), first frame: screen_start ------------->  screen_ready
noVNC draws the binary frames (RFB 3.8) <-------------------->  the agent's desktop
Take Control            ->  ScreenStart { control: true } --->  a new ticket for a new socket
Hand Back: close the control socket, open a view again
```

### Decide who sees it

A call made with your API key acts as the key's owner, the person who created its project: every screen you open is that person's screen as far as Wiro is concerned. It watches the agents that person may watch, and takes control where that person may. Your key speaks for your whole product, so Wiro gives it a ticket whichever of your users it is for, and who sees what is your product's decision:

- **Who may watch.** Ask for a ticket only for the users you allow to see that agent's computer.
- **Who may take control.** Offer Take Control, and ask for `control: true`, only to the users you allow to use its keyboard and mouse.
- **What a shared agent shows.** An agent has one computer and one browser for all of its chats. Its Screen shows what the agent is doing in any of them: each of your users' chats, its Telegram, Slack and Discord chats and its Scheduled Tasks, and the agent brings the tab it is working in to the front. Take Control reaches every site that browser is signed in to, for all of the agent's users, and what a person signs in to during control stays there for all of them. It also pauses the agent's browser and desktop tools in every chat until control ends. With [one agent per customer](#deploy-an-agent), the Screen shows only that customer's work. On an agent several of your users share, show it only to people who may see all of their work.
- **The switch.** `screen: "off"` on [`UpdateSettings`](/docs/agent-overview#post-useragentupdatesettings) closes the Screen for everyone, your users and the Wiro panel alike, and ends open screens within about half a minute. `"on"` opens it again. Send it with the same API key; the key's owner must be the agent's owner or an admin of its team. It never restarts the agent.

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/UpdateSettings" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
    "screen": "off"
  }'
```

```json
{ "result": true, "errors": [] }
```

Which agents your key opens:

| Your key | Watches | Takes control of |
|----------|---------|------------------|
| A personal project's key | Its owner's personal agents, and a team agent in Chat Mode `"collaborative"` while its owner deployed that agent or is an admin of its team, and is still a member | Its owner's personal agents that have never been in a team, or whose browser was reset after they last left one |
| A team project's key | That team's agents in Chat Mode `"collaborative"`, when its owner deployed the agent or is an admin of the team | Nothing: no one takes control of a team agent |

Team agents in Chat Mode `"private"`, Studio and the Workflow Agent have no Screen. A team project's key never opens a personal agent or another team's agent.

### Ask whether the Screen can open

Before you show a Screen button, your backend asks [`POST /UserAgent/Realtime/ScreenInfo`](/docs/agent-overview#post-useragentrealtimescreeninfo):

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Realtime/ScreenInfo" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321" }'
```

```json
{ "result": true, "errors": [], "available": true, "canControl": true, "reason": null }
```

When the Screen can't open, `available` and `canControl` are `false` and `reason` says why, here because the `screen` setting is off:

```json
{ "result": true, "errors": [], "available": false, "canControl": false, "reason": "setting_off" }
```

| Field | Description |
|-------|-------------|
| `available` | Show the Screen button. |
| `canControl` | Offer Take Control once the screen is live, to the people you allow. |
| `reason` | `null` while `available` is `true`, otherwise why not. |

What to do for each `reason`:

| `reason` | What to do |
|----------|------------|
| `not_allowed` | Show no Screen: your key can't open this agent's Screen (see [Decide who sees it](#decide-who-sees-it)), or no agent has this guid, because it is unknown or was deleted. |
| `private_team` | Show no Screen: a team agent in Chat Mode `"private"` has none. |
| `setting_off` | Show no Screen. Ask again after the `screen` setting changes; the Wiro panel asks every 60 seconds. |
| `not_running` | Ask again once [`Detail`](/docs/agent-overview#post-useragentdetail) reads `status: 4`. |
| `unsupported` | The agent's computer doesn't offer the Screen yet. It does once the agent has restarted. |
| `disabled` | The Screen is turned off on every agent at the moment. Ask again later. |
| `error` | Ask again in a few seconds; the Wiro panel tries again after 5 seconds, 30 seconds and 2 minutes. |

ScreenInfo never refuses an agent: only a missing `useragentguid` answers `result: false`. Ask again when the agent starts or stops and when its `screen` setting changes.

### Get a ticket

When a person opens the Screen, your page asks your backend, and your backend calls [`POST /UserAgent/Realtime/ScreenStart`](/docs/agent-overview#post-useragentrealtimescreenstart). Send `{ "useragentguid": "..." }` to watch, and add `"control": true` for Take Control.

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Realtime/ScreenStart" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321" }'
```

```json
{
  "result": true,
  "errors": [],
  "wsUrl": "wss://socket.wiro.ai/v1/AgentRealtime/Screen",
  "screenToken": "<one-time screen ticket>",
  "control": false,
  "canControl": true,
  "maxSeconds": 1800
}
```

| Field | Description |
|-------|-------------|
| `wsUrl` | The Screen socket. Pass it to the page as it is; don't build or hardcode the host. |
| `screenToken` | The one-time ticket. The page sends it as the socket's first message within 60 seconds. Keep it in memory only, never in a URL or a log. |
| `control` | `true` for a Take Control ticket. |
| `canControl` | Whether this person may take control now, as far as Wiro goes. Show or hide Take Control by it, together with your own rules. |
| `maxSeconds` | The longest the session lasts: 1800 seconds to watch, 900 in control. |
| `idleSeconds` | Control only: control ends after this many seconds without a key or pointer event (120). |

Your backend returns only these fields to the page, never your API key. Ask for a new ticket for every socket: each Reconnect, each Take Control and each view you open again. A refused start answers `result: false` with one sentence in `errors[0].message`, which you can show as it is; every code is listed under [ScreenStart's errors](/docs/agent-overview#screenstart-errors).

```json
{
  "result": false,
  "errors": [
    {
      "code": 99,
      "message": "Take Control is off for team agents: their browser is shared by the whole team.",
      "time": 1795201200
    }
  ]
}
```

| `code` | What to do |
|--------|------------|
| `94` | The `screen` setting is off: hide the Screen, as for `setting_off`. |
| `95` | The agent isn't running, or is gone: hide the Screen until it runs again. |
| `96`, `97` | Your key can't open this agent's Screen: hide it. |
| `98` | The Screen isn't ready on this agent: show the sentence and let the person try later. |
| `99` | Take Control isn't available: keep the view, show the sentence, and hide Take Control until `canControl` is `true` again. `Take Control could not start just now. Try again in a minute.` is a check that couldn't finish, so ask `ScreenInfo` again in a minute: its `canControl` says when Take Control is back. |
| `409` | The agent is capturing its screen: keep the view, show the sentence, and let the person try again in a minute. |
| `429` | Too many starts, too many viewers or the hourly Take Control limit: show the sentence, which says how long to wait. Two of these come with HTTP 429. |
| `503` | A check couldn't finish: show the sentence and offer to try again. |
| `0` | Show the sentence, then ask `ScreenInfo` again and go by its answer. After `This agent belongs to a team. Switch to the team context to access it.` it says `not_allowed`: your key's owner is no longer a member of the agent's team, so hide the Screen. `Request parameter [useragentguid] required` means your backend sent no guid. Any other `0` is a check that couldn't finish: offer to try again. |

95, 96 and 97 are the agent access codes the UserAgent endpoints share, and ScreenStart gives 95 and 96 a few sentences of its own; 94, 98, 99, 409, 429 and 503 are ScreenStart's own. In the [Error Reference](/docs/error-reference), 96, 97, 98 and 99 mean other things.

### The Screen socket

The page opens `wsUrl` with no extra headers, subprotocols or query string. When the socket opens, the page sends the ticket in a text frame, within 10 seconds:

```json
{ "type": "screen_start", "screenToken": "<screenToken from ScreenStart>" }
```

The server answers with one text frame:

```json
{ "type": "screen_ready", "control": true, "maxSeconds": 900, "idleSeconds": 120 }
```

`idleSeconds` comes only in control. From then on, every frame in both directions is binary: an RFB 3.8 stream (the VNC protocol) with security type None, so there is no password to send. noVNC speaks it; your page hands noVNC these binary frames and nothing else (see [Drawing the screen with noVNC](#drawing-the-screen-with-novnc)). Text frames the page sends after the first are ignored. The server pings every 25 seconds, and browsers answer by themselves.

Right before the server closes a session, it sends one more text frame that says why, then closes the socket with a code:

```json
{ "type": "screen_end", "reason": "idle", "message": "Control was handed back after a while without keyboard or mouse input." }
```

| Close code | `reason` | `message` | When |
|------------|----------|-----------|------|
| `1000` | none | none | Your page closed the socket, with code `1000`: Hand Back, or the screen was closed. |
| `1008` | none | none | The first message wasn't a `screen_start` with a `screenToken`, or didn't come within 10 seconds. |
| `4001` | `error` | `This screen link expired. Open the screen again.` | The ticket is unknown, used or more than 60 seconds old. |
| `4001` | `error` | `The agent's screen is not available right now.` | The agent was deleted after the ticket was issued. |
| `4004` | `agent_stopped` | `The agent stopped.` | The agent isn't running, or stopped or restarted during the session. |
| `4003` | `screen_off` | `Screen was turned off in this agent's settings.` | The `screen` setting is `"off"`, checked at the start and every 25 seconds. |
| `4029` | `too_many_viewers` | `Too many people are watching this agent's screen.` | 4 screens are already open on the agent. |
| `4502` | `unavailable` | `The agent's screen is not available right now.` | The agent's computer didn't answer at the start. |
| `4502` | `upstream_closed` | `The agent's screen closed the connection.` | The agent's computer closed the stream during the session. |
| `4008` | `time_limit` | `The screen session reached its time limit.` | `maxSeconds` passed. |
| `4000` | `control_taken` | `Someone else took control of this computer.` | Control only: another Take Control started on the agent, from your app or the Wiro panel. |
| `4009` | `idle` | `Control was handed back after a while without keyboard or mouse input.` | Control only: no key or pointer event for `idleSeconds`. |
| `4010` | `bad_input` | `The browser sent input the screen does not accept.` | The page sent an RFB message the screen doesn't take (see [Drawing the screen with noVNC](#drawing-the-screen-with-novnc)). |
| `4011` | `input_rate` | `Too much keyboard and mouse input arrived at once.` | Control only: more than 500 key and pointer events a second, beyond a short burst. |
| `4012` | `access_lost` | `You can no longer control this agent's computer.` | Control only: Take Control stopped applying to your key's owner on this agent, for example because it moved into a team. |
| `4013` | `capturing` | `The agent is capturing its screen right now. Try again in a minute.` | Control only: a capture began just as control was starting. |
| `1001` | `error` | `The screen connection failed.` | The browser stopped answering the server's pings. |
| `1011` | `error` | `The screen connection failed.` | The session could not start on the server. |

Your code goes by `reason` first and the close code second, never by `message`: the sentences can change. You can show `message` as it is, or your own words. A connection that drops without a `screen_end` reaches the page as `1006`, or `1001` when the server goes away.

### Drawing the screen with noVNC

Use noVNC 1.7.0, exactly that version: `https://cdn.jsdelivr.net/npm/@novnc/novnc@1.7.0/core/rfb.js`, an ES module under the MPL-2.0 license, or a copy of that release served from your own site. A control session takes only the messages noVNC 1.7.0 sends with the settings below, and another version can send one it refuses, which ends control with `4010`. noVNC needs a secure context: serve the page over HTTPS, or from `localhost` while you build.

The page owns the socket, and noVNC never gets `wsUrl`: the first message must be your `screen_start`, the text frames are for your page, and the close code tells your page why a session ended. Hand noVNC a small channel object instead of the URL, one that passes it only the binary frames (`ScreenChannel` in [the example](#a-complete-example)), and create the `RFB` object only once `screen_ready` has come.

| Setting | Value | Why |
|---------|-------|-----|
| `shared` (a constructor option) | `true` | Other people may be watching the same screen. |
| `viewOnly` | `true` to watch, `false` in control | A view sends no input. |
| `resizeSession` | `false` | Required. The agent's screen keeps its size, and a resize request in control ends it with `4010`. |
| `scaleViewport` | `true` | Fits the screen into your element. Don't scale the canvas with a CSS transform: noVNC would then send the pointer to the wrong spot. |
| `clipViewport` | `false` | The whole screen stays in view. |
| `qualityLevel`, `compressionLevel` | `6`, `2` | The values the Wiro panel uses. |
| `focusOnClick` | `true` in control only | A click on the screen gives it the keyboard. |

Keep to these rules too:

- **No clipboard.** The agent's clipboard is closed both ways. Don't offer copy or paste, and don't call `clipboardPasteFrom`, which is dropped. To put text on the agent's screen, type it as keys with `rfb.sendKey`, paced: the Wiro panel sends 200 key events a second, a press and a release for each character.
- **No power actions or resizing.** Don't call `machineShutdown`, `machineReboot` or `machineReset`, and keep `resizeSession` off. Those messages end the session with `4010`.
- **Human speed.** More than 500 key and pointer events a second, beyond a short burst, ends control with `4011`.
- **A way out of the screen.** In control, noVNC takes every key, Tab and Esc included, so a keyboard user can't leave the screen. Give them a way out: the example, like the Wiro panel, moves focus to Hand Back when Esc is pressed twice quickly, and the first Esc still reaches the agent.
- **Touch screens.** noVNC turns taps and drags into clicks and drags. A phone's keyboard doesn't open for the screen: to let people type there, add a text field of your own and send what they type with `rfb.sendKey`, paced as above.
- **No blank flash.** noVNC removes its canvas when a session ends. To keep the picture while you switch between watching and control, show a copy of the last frame (`rfb.toDataURL()`) until the next session draws.

### Take Control and Hand Back

Take Control is a new session on a new socket, not a switch on the open one:

1. Offer Take Control only while a view is live and `canControl` is `true`. Ask the person first, for example: "Take control of the agent's computer? Control lasts up to 15 minutes. The agent's browser and desktop tools pause until you hand back."
2. Your backend calls `ScreenStart` with `"control": true`. Keep the view open meanwhile: if the start is refused, the view stays as it was and you show `errors[0].message`.
3. Once you have the ticket, close the view's socket and open a new one with the control ticket. Its `screen_ready` says `"control": true`, with `maxSeconds` and `idleSeconds`.
4. Create noVNC with `viewOnly: false` and `focusOnClick: true`, give the screen the focus, and show that the person has control, with the time left from `maxSeconds`.
5. **Hand Back** closes the control socket with code `1000`, which gives control back to the agent at once, then gets a view ticket and opens a view.

```json
{ "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321", "control": true }
```

```json
{
  "result": true,
  "errors": [],
  "wsUrl": "wss://socket.wiro.ai/v1/AgentRealtime/Screen",
  "screenToken": "<one-time screen ticket>",
  "control": true,
  "canControl": true,
  "maxSeconds": 900,
  "idleSeconds": 120
}
```

One person has control at a time: a new Take Control on the agent, from any of your users or from the Wiro panel, ends the current one with `4000` and `control_taken`. While control lasts, the agent's browser and desktop tools pause in every chat of the agent, and the agent says it will go on once control is handed back. When control ends, the tools work again at once, and each chat whose browser or desktop step was refused gets a note before its next turn (see [While You Have Control](/docs/agent-overview#while-you-have-control)). Whatever the person signed in to stays in the agent's browser, for every chat of the agent.

### The idle warning

Control ends after `idleSeconds` (120) without a key press, click, touch or mouse movement that reaches the agent; changes on the screen itself don't count. Warn the person before that:

- Note the time when `screen_ready` comes, and again whenever the page sends a key or pointer event: an RFB message of type 4, 5 or 255. The example's `ScreenChannel` calls `onInput` for each.
- Every second, work out `left = idleSeconds - (now - lastInputAt) / 1000`. While `left` is 30 seconds or less (or half of `idleSeconds`, when that is shorter), show a countdown, for example "Control hands back in 0:25 without input. Move the mouse, tap or type to keep it."
- At `idleSeconds` the server ends control with `4009` and `idle`. Open a view again, as after every end of control.

### What to show when a screen ends

Read the `screen_end` reason first and the close code second:

| End | What to do |
|-----|------------|
| `agent_stopped`, `4004` | Close the screen and hide the button until the agent runs again. |
| `screen_off` (`4003`) | Close the screen and hide the button: the `screen` setting is off. Ask `ScreenInfo` again later. |
| `control_taken`, `4000`, in control | Open a view, with a note such as "Control was taken somewhere else. You're watching again." |
| `idle`, `bad_input`, `input_rate`, `access_lost`, `capturing` (`4009` to `4013`), in control | Open a view and show `message`. After `access_lost`, hide Take Control until a view's `ScreenStart` says `canControl: true` again. |
| Any of those ending a view | Say the screen stopped, and offer Reconnect. |
| `time_limit`, `4008` | "This session reached its time limit", with Reconnect. |
| `4001` | "The connection expired", with Reconnect. |
| `too_many_viewers`, `4029` | "Too many people are watching", with Reconnect a little later. |
| `upstream_closed`, `unavailable` (`4502`) | The agent's desktop closed the connection or didn't answer: offer Reconnect. |
| `1001` or `1006` with no `screen_end` | The connection dropped. Get a fresh ticket and connect again once by yourself, in the same mode, then offer Reconnect. |
| `error`, `1011`, anything else | "The screen stopped", with Reconnect. |

After control ends, by Hand Back or by the server, always open a view, never control. Reconnect opens a view too. A control session your page connects again within 2 minutes after its connection dropped is a reconnect and doesn't count toward the agent's 6 Take Control starts an hour.

### A complete example

The two files below run as they are. `server.mjs` is your backend: Node.js 18 or later, with no packages to install. It keeps your API key, signs requests for signature-based projects, asks `ScreenInfo` and `ScreenStart`, and gives the page only what it needs. `screen.html` opens the screen, takes control, hands back, warns before the idle end and handles every end above. Put both in one folder, start the server with your key and the agent's guid, and open `http://localhost:3000`. Replace `currentUser`, `mayWatch` and `mayControl` with your own sign-in and rules.

```bash
WIRO_API_KEY=YOUR_API_KEY WIRO_API_SECRET=YOUR_API_SECRET AGENT_GUID=f8e7d6c5-b4a3-2190-fedc-ba0987654321 node server.mjs
```

Leave `WIRO_API_SECRET` out for a project that uses API key only authentication.

`server.mjs`:

```javascript
// server.mjs: your backend. It keeps the API key and hands the page only screen tickets.
// Run: WIRO_API_KEY=... WIRO_API_SECRET=... AGENT_GUID=... node server.mjs
// then open http://localhost:3000 (Node.js 18 or later, no packages to install).
import { createServer } from "node:http";
import { createHmac } from "node:crypto";
import { readFile } from "node:fs/promises";

const WIRO = "https://api.wiro.ai/v1";
const { WIRO_API_KEY, WIRO_API_SECRET = "", AGENT_GUID, PORT = "3000" } = process.env;

// Your own sign-in and rules go here. Wiro gives your key a ticket whichever of
// your users it is for, so this is where you decide who may watch the agent and
// who may take control of it.
function currentUser(req) {
  return { id: "demo-user" };
}
function mayWatch(user, agentGuid) {
  return agentGuid === AGENT_GUID;
}
function mayControl(user, agentGuid) {
  return mayWatch(user, agentGuid);
}

async function wiro(path, body) {
  const headers = { "Content-Type": "application/json", "x-api-key": WIRO_API_KEY };
  if (WIRO_API_SECRET) {
    // Signature-based projects: HMAC-SHA256 of secret + nonce, keyed with the API key.
    const nonce = String(Date.now());
    headers["x-nonce"] = nonce;
    headers["x-signature"] = createHmac("sha256", WIRO_API_KEY).update(WIRO_API_SECRET + nonce).digest("hex");
  }
  const res = await fetch(WIRO + path, { method: "POST", headers, body: JSON.stringify(body) });
  return res.json();
}

function send(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" });
  res.end(JSON.stringify(data));
}

const refused = (message) => ({ result: false, errors: [{ code: 0, message }] });

createServer(async (req, res) => {
  try {
    if (req.method === "GET" && (req.url === "/" || req.url === "/screen.html")) {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      return res.end(await readFile(new URL("./screen.html", import.meta.url)));
    }
    if (req.method !== "POST") return send(res, 404, refused("Not found."));
    let raw = "";
    for await (const chunk of req) raw += chunk;
    const body = raw ? JSON.parse(raw) : {};
    const user = currentUser(req);
    const agent = AGENT_GUID;
    if (!mayWatch(user, agent)) return send(res, 403, refused("You can't view this screen."));

    if (req.url === "/api/screen/info") {
      const info = await wiro("/UserAgent/Realtime/ScreenInfo", { useragentguid: agent });
      return send(res, 200, {
        available: info.available === true,
        canControl: info.canControl === true && mayControl(user, agent),
        reason: info.reason ?? null,
      });
    }

    if (req.url === "/api/screen/start") {
      const control = body.control === true;
      if (control && !mayControl(user, agent)) return send(res, 403, refused("You can't take control of this screen."));
      const t = await wiro("/UserAgent/Realtime/ScreenStart", { useragentguid: agent, control });
      if (t.result !== true) {
        return send(res, 200, { result: false, errors: (t.errors || []).map((e) => ({ code: e.code, message: e.message })) });
      }
      // Your own record: Wiro's activity log names your key's owner, never this user.
      console.log(new Date().toISOString(), control ? "control" : "view", "ticket for", user.id);
      return send(res, 200, {
        result: true,
        wsUrl: t.wsUrl,
        screenToken: t.screenToken,
        control: t.control,
        canControl: t.canControl === true && mayControl(user, agent),
        maxSeconds: t.maxSeconds,
        idleSeconds: t.idleSeconds,
      });
    }
    send(res, 404, refused("Not found."));
  } catch (e) {
    send(res, 500, refused("The screen could not be started. Try again."));
  }
}).listen(Number(PORT), () => console.log("Open http://localhost:" + PORT));
```

`screen.html`, in the same folder:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Agent screen</title>
  <style>
    body { font: 15px/1.5 system-ui, sans-serif; margin: 24px; }
    #bar { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 12px; }
    #screen { width: 100%; max-width: 960px; aspect-ratio: 16 / 9; background: #1d1d1f; overflow: hidden; }
    #screen.control { outline: 3px solid #f5a524; }
    [hidden] { display: none !important; }
  </style>
</head>
<body>
  <div id="bar">
    <button id="open" disabled>Screen</button>
    <button id="take" hidden>Take Control</button>
    <button id="back" hidden>Hand Back</button>
    <button id="close" hidden>Close</button>
    <span id="status"></span>
  </div>
  <div id="screen"></div>
  <p id="notice" role="status"></p>
  <p id="idle"></p>

  <script type="module">
    // noVNC 1.7.0 exactly: a control session accepts only what this version sends.
    import RFB from "https://cdn.jsdelivr.net/npm/@novnc/novnc@1.7.0/core/rfb.js";

    const $ = (id) => document.getElementById(id);
    const screenEl = $("screen");

    // Your backend (server.mjs). The page never sees the API key.
    async function api(path, body = {}) {
      try {
        const res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        return await res.json();
      } catch {
        return { result: false, errors: [{ code: 0, message: "Check your connection, then try again." }] };
      }
    }

    // What noVNC reads instead of the socket: binary frames only. One class with no
    // parent, because noVNC looks for send, close, binaryType, onerror, onmessage,
    // onopen, protocol and readyState on the object and on its own class.
    class ScreenChannel {
      binaryType = "arraybuffer";
      onopen = null;
      onerror = null;
      onclose = null;
      onInput = null; // called for every key or pointer event that goes up
      #ws;
      #receive = null;
      #held = [];
      #ended = false;
      #queued = false;

      constructor(ws) {
        this.#ws = ws;
      }
      get readyState() {
        return this.#ended ? WebSocket.CLOSED : this.#ws.readyState;
      }
      get protocol() {
        return this.#ws.protocol;
      }
      get onmessage() {
        return this.#receive;
      }
      set onmessage(handler) {
        this.#receive = handler;
        if (handler && this.#held.length) this.#flush();
      }
      send(data) {
        if (this.#ended) return;
        this.#ws.send(data);
        const bytes = ArrayBuffer.isView(data) ? new Uint8Array(data.buffer, data.byteOffset, data.byteLength) : new Uint8Array(data);
        // RFB KeyEvent (4), PointerEvent (5) and QEMU extended KeyEvent (255): what counts as input.
        if (bytes.length && (bytes[0] === 4 || bytes[0] === 5 || bytes[0] === 255)) this.onInput?.();
      }
      close() {
        if (!this.#ended) this.#ws.close(1000);
      }
      push(buffer) {
        if (this.#ended) return;
        if (this.#receive && !this.#held.length) return this.#receive({ data: buffer });
        this.#held.push(buffer);
        if (this.#receive) this.#flush();
      }
      closed(event) {
        if (this.#ended) return;
        this.#ended = true;
        this.#held = [];
        this.onclose?.(event);
      }
      // A microtask: noVNC sets onmessage inside its constructor, before it reads readyState.
      #flush() {
        if (this.#queued) return;
        this.#queued = true;
        queueMicrotask(() => {
          this.#queued = false;
          while (!this.#ended && this.#receive && this.#held.length) this.#receive({ data: this.#held.shift() });
        });
      }
    }

    // One session, a view or control, on one ticket from ScreenStart.
    function openScreen(ticket, { onReady, onLive, onInput, onEnd }) {
      const ws = new WebSocket(ticket.wsUrl); // as given: the ticket never goes in the URL
      ws.binaryType = "arraybuffer";
      const channel = new ScreenChannel(ws);
      channel.onInput = onInput;
      let rfb = null;
      let rfbDone = false;
      let ready = null;
      let live = false;
      let done = false;
      let end = { reason: "", message: "" };
      const watchdog = setTimeout(() => { if (!live) finish(0); }, 20000);

      ws.onopen = () => ws.send(JSON.stringify({ type: "screen_start", screenToken: ticket.screenToken }));
      ws.onmessage = (event) => {
        if (typeof event.data !== "string") return channel.push(event.data);
        let msg;
        try { msg = JSON.parse(event.data); } catch { return; }
        if (msg.type === "screen_ready" && !ready) {
          ready = msg;
          const control = msg.control === true;
          onReady?.(msg);
          rfb = new RFB(screenEl, channel, { shared: true }); // security type None: no credentials
          rfb.viewOnly = !control;
          rfb.focusOnClick = control;
          rfb.resizeSession = false; // required: the agent's screen keeps its size
          rfb.scaleViewport = true;
          rfb.clipViewport = false;
          rfb.qualityLevel = 6;
          rfb.compressionLevel = 2;
          rfb.addEventListener("connect", () => {
            live = true;
            clearTimeout(watchdog);
            if (control) rfb.focus({ preventScroll: true });
            onLive?.(msg);
          });
          rfb.addEventListener("disconnect", () => { rfbDone = true; finish(0); });
          rfb.addEventListener("credentialsrequired", () => finish(0));
          rfb.addEventListener("securityfailure", () => finish(0));
        } else if (msg.type === "screen_end") {
          end = { reason: String(msg.reason || "error"), message: String(msg.message || "") };
        }
      };
      ws.onclose = (event) => finish(event.code);

      // code: the socket's close code, 0 when this page gave up, -1 for stop().
      function finish(code) {
        if (done) return;
        done = true;
        clearTimeout(watchdog);
        ws.onopen = ws.onmessage = ws.onclose = null;
        if (rfb && !rfbDone) {
          rfbDone = true;
          try { rfb.disconnect(); } catch {}
        }
        channel.closed({ code: code > 0 ? code : 1000, reason: "", wasClean: true });
        if (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN) ws.close(1000);
        if (code !== -1) onEnd?.({ code, ...end, control: ready?.control === true, ready: !!ready });
      }
      return { stop: () => finish(-1) };
    }

    // The page: one session at a time.
    let current = null; // { control, live, liveAt, handle }
    let canControl = false;
    let retried = false;
    let idleSeconds = 120;
    let lastInputAt = 0;
    let idleTimer = null;
    let infoTimer = null;

    function render() {
      const open = current !== null;
      $("open").hidden = open;
      $("close").hidden = !open;
      $("take").hidden = !(open && !current.control && current.live && canControl);
      $("back").hidden = !(open && current.control);
      screenEl.classList.toggle("control", open && current.control);
      $("status").textContent = !open ? "" : !current.live ? "Connecting" : current.control ? "You have control" : "View only";
    }

    function say(text, reconnect = false) {
      $("notice").textContent = text || "";
      $("open").textContent = reconnect ? "Reconnect" : "Screen";
    }

    // No Screen for now: the button stays off, and ScreenInfo is asked again in a
    // minute, unless the answer can't change by itself.
    function noScreen(text, askAgain = true) {
      $("open").disabled = true;
      say(text);
      clearTimeout(infoTimer);
      if (askAgain) infoTimer = setTimeout(checkInfo, 60000);
    }

    function connect(ticket) {
      const session = { control: ticket.control === true, live: false, liveAt: 0, handle: null };
      current = session;
      session.handle = openScreen(ticket, {
        onReady: (ready) => {
          if (session.control) {
            idleSeconds = ready.idleSeconds || ticket.idleSeconds || 120;
            lastInputAt = Date.now(); // the idle count starts here
          }
        },
        onLive: () => {
          if (current !== session) return;
          session.live = true;
          session.liveAt = Date.now();
          if (session.control) startIdleWarning();
          render();
        },
        onInput: () => { lastInputAt = Date.now(); },
        onEnd: (end) => { if (current === session) ended(session, end); },
      });
      render();
    }

    async function openView(note = "") {
      const t = await api("/api/screen/start", { control: false });
      if (t.result !== true) {
        current = null;
        render();
        const error = t.errors?.[0] || {};
        // The screen setting is off (94) or the agent isn't running (95): no Screen for now.
        if (error.code === 94 || error.code === 95) return noScreen(error.message);
        // Your key can't open this agent's Screen (96, 97).
        if (error.code === 96 || error.code === 97) return noScreen(error.message, false);
        return say(error.message || "The screen couldn't open. Try again in a moment.", true);
      }
      canControl = t.canControl === true;
      say(note);
      connect(t);
    }

    async function takeControl() {
      const view = current;
      if (!view || view.control || !view.live || !canControl) return;
      if (!confirm("Take control of the agent's computer?\n\nControl lasts up to 15 minutes. The agent's browser and desktop tools pause until you hand back.")) return;
      $("take").disabled = true;
      const t = await api("/api/screen/start", { control: true }); // the view stays open meanwhile
      $("take").disabled = false;
      if (current !== view) return;
      if (t.result !== true) return say(t.errors?.[0]?.message || "You can't take control right now.");
      retried = false;
      say("");
      view.handle.stop(); // close the view only once control is granted
      connect(t);
    }

    async function handBack() {
      const control = current;
      if (!control || !control.control) return;
      current = null;
      stopIdleWarning();
      control.handle.stop(); // first, so the agent's tools work again at once
      retried = false;
      await openView();
    }

    function closeScreen() {
      const session = current;
      current = null;
      stopIdleWarning();
      session?.handle.stop();
      say("");
      render();
    }

    // How a session ended: read screen_end's reason first, then the close code.
    const CONTROL_ENDS = { control_taken: 4000, idle: 4009, bad_input: 4010, input_rate: 4011, access_lost: 4012, capturing: 4013 };

    async function ended(session, { code, reason, message, control, ready }) {
      current = null;
      stopIdleWarning();
      render();
      if (session.liveAt && Date.now() - session.liveAt >= 30000) retried = false;
      if (reason === "agent_stopped" || code === 4004) return noScreen("The agent stopped. Its screen comes back once it runs again.");
      if (reason === "screen_off" || code === 4003) return noScreen("The screen was turned off for this agent.");
      const controlEnd = Object.entries(CONTROL_ENDS).find(([r, c]) => reason === r || code === c);
      if (controlEnd && control) {
        if (controlEnd[0] === "access_lost") canControl = false; // until a view's ScreenStart says otherwise
        const note = controlEnd[0] === "control_taken" ? "Control was taken somewhere else. You're watching again." : message;
        return openView(note); // after control ends, always a view
      }
      if (!reason && (code === 1001 || code === 1006) && !retried) {
        retried = true; // one retry with a fresh ticket, in the same mode
        if (!control) return openView();
        const t = await api("/api/screen/start", { control: true });
        return t.result === true ? connect(t) : openView(t.errors?.[0]?.message || "");
      }
      if (reason === "time_limit" || code === 4008) return say("This session reached its time limit.", true);
      if (code === 4001) return say("The connection expired.", true);
      if (code === 4029) return say("Too many people are watching. Try again in a moment.", true);
      if (code === 4502) return say(ready ? "The agent's desktop closed the connection." : "This agent's desktop isn't available right now.", true);
      say(message || "The screen stopped.", true);
    }

    // Control hands back after idleSeconds without a key or pointer event: count down first.
    function startIdleWarning() {
      stopIdleWarning();
      idleTimer = setInterval(() => {
        const left = idleSeconds - (Date.now() - lastInputAt) / 1000;
        const warn = left <= Math.min(30, idleSeconds / 2) && left > -5;
        const s = Math.max(0, Math.ceil(left));
        const time = Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
        $("idle").textContent = warn ? "Control hands back in " + time + " without input. Move the mouse, tap or type to keep it." : "";
      }, 1000);
    }
    function stopIdleWarning() {
      clearInterval(idleTimer);
      idleTimer = null;
      $("idle").textContent = "";
    }

    // In control noVNC takes every key, Tab and Esc included. Esc twice quickly
    // moves focus to Hand Back, so keyboard users can leave the screen. The first
    // Esc still reaches the agent.
    let lastEsc = 0;
    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape" || !current?.control || !screenEl.contains(document.activeElement)) return;
      if (event.timeStamp - lastEsc < 600) {
        event.preventDefault();
        event.stopPropagation();
        lastEsc = 0;
        $("back").focus();
      } else {
        lastEsc = event.timeStamp;
      }
    }, true);

    $("open").onclick = () => { retried = false; say(""); openView(); };
    $("take").onclick = takeControl;
    $("back").onclick = handBack;
    $("close").onclick = closeScreen;

    // Whether there is a Screen to show: asked first, and again after noScreen.
    async function checkInfo() {
      clearTimeout(infoTimer);
      const info = await api("/api/screen/info");
      if (current) return; // a screen opened meanwhile
      canControl = info.canControl === true;
      if (info.available === true) {
        $("open").disabled = false;
        say("");
      } else {
        const text = info.reason === "not_running" ? "The agent isn't running." : "The screen isn't available for this agent.";
        noScreen(text, info.reason !== "not_allowed" && info.reason !== "private_team");
      }
      render();
    }
    checkInfo();
  </script>
</body>
</html>
```

### Screen limits for your key

Your key owner's API keys count as one person, apart from that person's own sessions in the Wiro panel, so these limits cover all of your users together:

| Limit | Value |
|-------|-------|
| Screens open on one agent at once, watching and control together, from your app and the Wiro panel | 4 |
| One watching session | 30 minutes (`maxSeconds` 1800) |
| One Take Control session | 15 minutes (`maxSeconds` 900) |
| Control without a key or pointer event | 2 minutes (`idleSeconds` 120) |
| Key and pointer events in control | 500 a second, beyond a short burst |
| Take Control starts on one agent, by everyone | 6 in any hour |
| Screens started on one agent with the API keys of your key's owner | 30 in 10 minutes |

- A control start with your key while a control session opened with your key owner's API keys is still open on the agent, or within 2 minutes after one's connection dropped, is a reconnect and doesn't count toward the 6 an hour. That covers all of your users: one of them taking control within 2 minutes after another one's control connection dropped is a reconnect too. The owner's own control sessions in the Wiro panel have a window of their own and don't make it one. After Hand Back, the idle end, the time limit or any other end, the next start counts.
- Every ticket counts toward the 30 in 10 minutes, and so does a start refused for too many viewers, a capture, a computer that doesn't answer or the hourly limit. Past that, `ScreenStart` answers HTTP 429 with `Too many screen sessions started. Try again in a few minutes.` until the 10 minutes are over.

### Screen rows in the activity log

Every screen your key opens adds the [Screen rows](/docs/agent-overview#screen-in-the-activity-log) to the agent's activity log, named after your key's owner, the same rows the Wiro panel writes. Read them with [`POST /UserAgent/Logs`](/docs/agent-logs#logs-tail) and your API key:

```json
{
  "ts": "2026-11-20T18:03:05.000Z",
  "kind": "AGENT_SCREEN_CONTROLLED",
  "title": "Took control of the agent's screen, via API key \"Acme App\"",
  "ok": true,
  "summary": { "project": "Acme App" },
  "userUuid": "5f0c9a2e-1b7d-4c3a-9e8f-2a6b7c8d9e0f",
  "user": {
    "uuid": "5f0c9a2e-1b7d-4c3a-9e8f-2a6b7c8d9e0f",
    "firstname": "Ada",
    "lastname": "Lovelace",
    "email": "ada@example.com",
    "username": "ada",
    "avatar": "",
    "avatarinitials": "AL"
  }
}
```

| `kind` | When | With your key |
|--------|------|---------------|
| `AGENT_SCREEN_VIEWED` | `ScreenStart` issued a view ticket. | At most one row an hour on each agent for each project's key, for all of your users together, apart from the rows the owner's own sessions in the Wiro panel write. The title ends with `, via API key "<project name>"` and `summary` holds `{ "project": "<project name>" }`, or the title ends with `, via API key` for a personal project's key on a team agent. |
| `AGENT_SCREEN_CONTROLLED` | `ScreenStart` issued a Take Control ticket. | At most one row every 10 minutes on each agent for each project's key, with the same title ending and `summary`. |
| `AGENT_SCREEN_CONTROL_ENDED` | A control session that started has ended. | One row for every session, with `summary: { seconds, reason }`, named after your key's owner; the title ends with `, via API key`. |

The rows never say which of your users watched or took control. Keep that in your own records, for example a line for every ticket your backend hands out, as `server.mjs` does.

## Security Rules

- **Keys never go into chat messages.** Collect keys, app keys and tokens in your own forms and send them with `SetupCardApply` `values` or [`ConnectorConnect`](/docs/agent-connectors#post-useragentconnectorconnect). The agent never sees them. While setup from chat is on for a message, Wiro takes clear keys out of it before it is stored or reaches the agent: each one reads `[key removed]` in the stored text and in the text the agent gets, and Send answers `contentmasked: true` with that text in `content`. A key pasted as the reply while a `key` connect card is the only `connect` card waiting can be saved to its connector, and is then stored as `[key saved to <Connector title>]`. This runs only while setup from chat is on for the message, so treat it as a safety net, never as a way to send keys. See [Keys in chat](/docs/agent-messaging#keys-in-chat).
- **Saved secrets read as a mask.** `UserAgent/Detail` shows every saved `password` field of a credential as `"••••••••"`, for every caller, and no answer ever returns a connector's values or tokens: [`ConnectorList`](/docs/agent-connectors#post-useragentconnectorlist) names the saved fields in `savedvariables`, never their values. Show "Saved" instead of a value, and let people replace a secret, not read it.
- **The mask sent back keeps the saved value.** A field sent to `CredentialUpsert` as `"••••••••"` isn't written, so a form saved as Detail showed it changes only the fields edited. A connector field you leave out of `ConnectorConnect` keeps its saved value the same way. See [Field-level write rules](/docs/agent-credentials#field-level-write-rules).
- **Approvals act with your key's rights.** Show Apply only to the people allowed to change the agent, hold back everyone else's typed approvals (see [Typed replies](#typed-replies)), check that a `messageguid` belongs to the session of the person who clicked, and use `chatsetup: "off"` for agents whose users must not change them. `chatsetup` doesn't stop a typed answer to a connector's approval card: hold back a `yes`, `always` or `no` from people who must not approve the agent's actions while a card waits, and answer cards from your own UI with ApprovalCardAct (see [Answering with a reply](/docs/agent-connectors#answering-with-a-reply)).
- **Your key's owner stays in your backend.** Message rows carry your key owner's `uuid` and `user` (name, email, avatar), and cards its `uuid`, whoever of your users wrote: show your own names instead.
- **Your API key stays on your server.** Your app calls your backend, and your backend calls Wiro. A browser holds at most the `agenttoken` and `sessiontoken` of its own person's chats, and the one-time `screenToken` of a screen you chose to show that person.
- **The Screen shows the whole agent.** An agent's Screen shows the work of all of its chats, and Take Control reaches every site its browser is signed in to. Ask for a ticket only for the users you allow to see that agent, and for `control: true` only for the users you allow to use it. Turn the Screen off with `screen: "off"` on agents whose users must not see each other's work (see [Decide who sees it](#decide-who-sees-it)).
- **A screen ticket is for one socket.** Each `screenToken` works once, within 60 seconds: hand it to one page, keep it out of URLs and logs, and get a new one for every socket.
- **Sign-ins come back to your page.** Send your own `redirecturl` with every sign-in, from a card or from your settings screen. It receives only `connector_connected=true` or `connector_error=<code>`, never a token or a secret. A callback that can't be matched to a sign-in ends on the API's own neutral page instead (see [The callback and your redirect URL](/docs/agent-connectors#the-callback-and-your-redirect-url)).

## Worked Examples

The first two examples start with a person's message in your chat and end with the connector connected, one with a key and one with a sign-in, and the third shows the agent's Screen with Take Control. The agent has Chat Markdown Reporting on, and no connector connected. The ids are the same throughout: the agent `f8e7d6c5-b4a3-2190-fedc-ba0987654321`, and `5f0c9a2e-1b7d-4c3a-9e8f-2a6b7c8d9e0f`, your key owner's account, on every message and card. The agent's own words vary from turn to turn.

### Serper with a key

**1. The person asks** "Search the web for our competitors' prices." Serper isn't connected, so the reply holds a `connect` card `h6w3k9p2m5tc` for `serper`, whose block is the one in [Block fields](#block-fields).

**2. Your app shows** "Connect Serper" with one field, "Serper API Key", from the card's `fields`, and a **Save** button.

**3. The person pastes the key and presses Save.** Your backend sends the card with `values: { "apikey": "..." }`; the answer is in [Key](#key-serper). The running agent has `serper__web_search` from its next message, with no restart.

**In a chat without cards**, the person pastes the key as the reply:

```text
Message/Send  "<the Serper API key>"
           -> content: "[key saved to Serper]"
              response: "✅ Applied: Serper connected.\nYour agent uses the change from its next message."
              setupresult: { "applied": ["h6w3k9p2m5tc"], "dismissed": [], "failed": [], "restarting": false, "live": true }
```

Even here, a form is safer than the chat: send the key from it with `SetupCardApply` `values`.

### HubSpot with a sign-in

**1. The person asks** "Add the leads from this week's webinar to HubSpot." HubSpot isn't connected, so the reply holds a `signin` card `q8n2v5k1m7xt` for `hubspot`, the card in [Sign-in: HubSpot](#sign-in-hubspot).

**2. Your app shows** "Connect HubSpot" with the card's two fields, "Client ID" and "Client Secret", their help text rendered as Markdown, and a **Sign in** button.

**3. The person enters the app's keys and presses Sign in.** Your backend sends the card with the keys in `values` and your `redirecturl`, and opens the answer's `authorizeUrl` in a popup. The card shows "Waiting for the sign-in".

**4. The person agrees on HubSpot's page.** The popup lands on your `redirecturl` with `connector_connected=true`, and the running agent has HubSpot's tools from its next message. Your page closes the popup.

**5. Your backend records the card** with `SetupCardApply` and no `values`, and the card shows "Applied" and `HubSpot connected`.

**In a chat without cards**, a `yes` can't sign in:

```text
Message/Send  "yes"
           -> response: "A yes cannot connect HubSpot. Its sign-in and any app keys are entered outside this chat, never in it."
              setupresult: { "applied": [], "dismissed": [], "failed": [], "restarting": false, "live": false,
                             "next": [{ "connector": "hubspot", "title": "HubSpot", "mode": "signin", "cardid": "q8n2v5k1m7xt", "messageguid": "a7b8c9d0-e1f2-3456-a789-0123456789ab" }] }
```

Build the Sign in button from `next`, as in [From next to a button](#from-next-to-a-button).

### The Screen with Take Control

The agent is a personal agent that your key's owner deployed with a personal project's API key, named `Acme App`, and it has never been in a team, so Take Control applies. Your own rules let the person in this example watch it and take control.

**1. Your app asks whether there is a Screen.** Your backend sends `ScreenInfo` `{ "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321" }` and gets `{ "result": true, "errors": [], "available": true, "canControl": true, "reason": null }`. The page shows a **Screen** button.

**2. The person opens it.** Your backend sends `ScreenStart` `{ "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321" }`, notes the ticket against the person in your own records, and gives the page `{ "wsUrl": "wss://socket.wiro.ai/v1/AgentRealtime/Screen", "screenToken": "<one-time screen ticket>", "control": false, "canControl": true, "maxSeconds": 1800 }`.

**3. The page connects.**

```text
page -> {"type":"screen_start","screenToken":"<one-time screen ticket>"}
page <- {"type":"screen_ready","control":false,"maxSeconds":1800}
page <> binary RFB 3.8 frames: noVNC draws the agent's browser, view only
```

**4. The person takes control.** They press **Take Control** and confirm. Your backend sends `ScreenStart` `{ "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321", "control": true }` and gets a control ticket with `"maxSeconds": 900` and `"idleSeconds": 120`. The page closes the view with `1000`, opens a new socket with the control ticket and gets `{"type":"screen_ready","control":true,"maxSeconds":900,"idleSeconds":120}`. noVNC now sends their clicks and keys, and they sign in to their store's admin site in the agent's browser. If the agent reaches for its browser in any chat meanwhile, the call is refused, and the agent says it will continue once control is handed back.

**5. The person looks away.** After 90 seconds without input the page shows "Control hands back in 0:30 without input. Move the mouse, tap or type to keep it." They move the mouse, and the countdown goes away.

**6. They hand back.** **Hand Back** closes the control socket with `1000`. The agent's browser and desktop tools work again at once, and the sign-in stays in its browser. Your backend gets a view ticket, and the page opens the view again.

**7. The activity log.** The day's `events` from `POST /UserAgent/Logs`, read with your API key, hold these three rows, newest first. The view after Hand Back added no row, since one came earlier in the same hour:

```json
[
  {
    "ts": "2026-11-20T18:06:47.000Z",
    "kind": "AGENT_SCREEN_CONTROL_ENDED",
    "title": "Control of the agent's screen ended after 3 minutes 40 seconds: handed back, via API key",
    "ok": true,
    "summary": { "seconds": 220, "reason": "hand_back" },
    "userUuid": "5f0c9a2e-1b7d-4c3a-9e8f-2a6b7c8d9e0f"
  },
  {
    "ts": "2026-11-20T18:03:05.000Z",
    "kind": "AGENT_SCREEN_CONTROLLED",
    "title": "Took control of the agent's screen, via API key \"Acme App\"",
    "ok": true,
    "summary": { "project": "Acme App" },
    "userUuid": "5f0c9a2e-1b7d-4c3a-9e8f-2a6b7c8d9e0f"
  },
  {
    "ts": "2026-11-20T18:02:11.000Z",
    "kind": "AGENT_SCREEN_VIEWED",
    "title": "Watched the agent's screen, via API key \"Acme App\"",
    "ok": true,
    "summary": { "project": "Acme App" },
    "userUuid": "5f0c9a2e-1b7d-4c3a-9e8f-2a6b7c8d9e0f"
  }
]
```

Each row also carries `user`, your key owner's account, left out here. The rows name your key's owner, and your own record says which of your users it was.

## Integration Checklist

- Your backend holds the project API key, and your app talks only to your backend. A browser holds at most the `agenttoken` and `sessiontoken` of its own person's chats, and a `screenToken` for each screen you chose to show that person.
- One agent per customer, deployed with `useprepaid: true`, and `chatsetup` set: `"all"` for setup cards in your chat, `"off"` for agents whose users must not change them.
- Each conversation has its own `sessionkey`, and you check that every `messageguid` a person acts on is in their session.
- Message rows and cards name your key's owner: your UI shows your own names for the sender.
- Messages go out with `Message/Send`; replies are followed on the WebSocket or with `Message/Detail`, and loaded with `Message/History`; rows added between turns arrive on the session's `sessiontoken`.
- Failed turns are told apart by their bracketed code. Send's refusals are told apart by `agentstatus`, by `agentusage` and its `pausedreason` (`"balance"` or `"plan"`), and by codes `93` (spend limit) and `92` (Model Access).
- Timeline blocks are merged by `blockid` and newer `version`, sorted by `callindex`, `contentindex`, `blockid`, and drawn by `type`; unknown types and kinds are skipped.
- Replies Wiro answers itself (`agenttoken: null`, `status: "agent_end"`) show `response` as plain text.
- Setup cards show the right title, body and buttons for their kind and state, `add` cards together with their `connect` cards.
- Apply waits for the reply to finish; Apply and Dismiss call `SetupCardApply`, and the card updates from the answer's `setup` (which can be `null`) and from later `version` 2 blocks.
- Each connect mode has its flow: `key` (the card's `fields` as `values`), `signin` (`SetupCardApply` with your `redirecturl` and the card's `fields` as `values`, your app's keys among them, the browser sign-in, then `SetupCardApply` again to record the card, only after `connector_connected=true`) and `project` (your project picker, then `SetupCardApply` with `wiroprojectguid`); any connector also connects on your settings screens with the [Agent Connectors](/docs/agent-connectors) calls, account pickers included.
- `next` from blocks, `SetupCardApply` answers, `setupresult` and webhooks turns into your own Connect buttons.
- Every `result: false` shows its sentence or your own words; code branches on codes and statuses, never on sentences.
- A change the running agent got live (`live: true`, `restart: "live"`) shows as applied with no wait. Every restart signal (`restarting: true`, `restart: "scheduled"`, and the saves that answer none) shows a restarting line until `UserAgent/Detail` reads `status: 4`, and the poll stops at `0`, `5` or `6`; Send refusals during a restart are shown as they are.
- Typed approvals and pasted keys from people who must not change the agent never reach Wiro, and neither do typed answers to approval cards from people who must not approve its actions.
- Keys never go into chat messages; secrets show as "Saved", and the mask sent back is left alone.
- Your `redirecturl` page handles `connector_connected=true` and `connector_error=<code>`, inside a popup or as a full page, and confirms with `ConnectorList`.
- Your product decides who may watch each agent's Screen and who may take control, and agents whose users must not see each other's work have `screen` set to `"off"`.
- The Screen: `ScreenInfo` before the button, a fresh `ScreenStart` from your backend for every socket, `screen_start` as the socket's first frame, and noVNC 1.7.0 created after `screen_ready` and fed only the binary frames, with `resizeSession` off, no clipboard and a way out of the keyboard in control.
- Take Control opens a new socket while the view stays until it is granted; Hand Back closes it with `1000` and opens a view; a countdown runs before `idleSeconds`; every end of control opens a view, `screen_off` and `agent_stopped` close the screen, and a dropped connection is retried once.
- Your own records say which of your users got each screen ticket.

## Related

- [Agent Messaging](/docs/agent-messaging): every messaging endpoint, and the full rules of [Setup From Chat](/docs/agent-messaging#setup-from-chat).
- [Agent WebSocket](/docs/agent-websocket): live events.
- [Agent Webhooks](/docs/agent-webhooks): the callback payload.
- [Agent Connectors](/docs/agent-connectors): the connector catalog, connecting, sign-ins, account pickers and disconnecting.
- [Agent Credentials](/docs/agent-credentials): channels, the Wiro project and settings.
- [Agent Overview](/docs/agent-overview): Deploy, Detail, UpdateSettings, and [Live Changes and Restarts](/docs/agent-overview#live-changes-and-restarts).
- [Screen and Take Control](/docs/agent-overview#screen-and-take-control): the agent's Screen in the Wiro panel, with its rules, limits and log rows, and the [`ScreenInfo`](/docs/agent-overview#post-useragentrealtimescreeninfo) and [`ScreenStart`](/docs/agent-overview#post-useragentrealtimescreenstart) reference.
- Each connector's own page, such as `https://wiro.ai/connectors/serper`: its fields, setup steps and tools.
