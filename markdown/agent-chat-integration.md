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

A call made with your API key acts as the key's owner: the person who created the project. Messages you send are stored as that person's messages, and setup cards are applied with that person's rights.

### Deploy an agent

Deploy one agent per customer of yours with [`POST /UserAgent/Deploy`](/docs/agent-overview#post-useragentdeploy), with `useprepaid: true` and a plan in `tier`. The agent is queued and Wiro starts it: it is ready for messages when [`POST /UserAgent/Detail`](/docs/agent-overview#post-useragentdetail) reads `status: 4`. To show one customer's chats, give each conversation its own `sessionkey`.

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
| `webchat` | No: only the Wiro web chat gets cards | Refused: `Setup from chat is off for this agent.` |
| `off` | No | Refused: `Setup from chat is off for this agent.` |

So an integration that shows setup cards needs `"all"`. Set it at Deploy with `chatsetup`, or later with [`POST /UserAgent/UpdateSettings`](/docs/agent-overview#post-useragentupdatesettings), and read it back as `chatSetup` on `UserAgent/Detail`:

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

Because of this, decide in your own product who may approve a change: show the Apply button, and pass a typed `yes` on to Wiro, only for the people allowed to change that agent. When people who must not change the agent talk to it through your app, set `chatsetup` to `"off"` for that agent and change its setup from your own settings screens instead.

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

Keep `messageguid` (the turn) and `agenttoken` (its live stream). The full parameter list, attachments and per-turn model choice are in [`Message/Send`](/docs/agent-messaging#post-useragentmessagesend).

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

### Load a conversation

[`POST /UserAgent/Message/History`](/docs/agent-messaging#post-useragentmessagehistory) returns a session's messages, newest first, each with the same shape as `Message/Detail`:

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

Each row has the person's message in `content`, the reply in `response`, and the ordered blocks of the reply in `timeline[]`, setup blocks included, in their current state. Page back with `before` (the oldest `guid` you have) while `hasmore` is `true`. A row whose `status` is still `agent_queue`, `agent_start` or `agent_output` is a reply in progress: subscribe to its `agenttoken` to follow it.

### Render the timeline

A reply is an ordered list of blocks. Keep a map keyed by `blockid`, keep a block only when its `version` is newer than the one you hold, and draw the blocks sorted by `callindex`, then `contentindex`, then `blockid`.

| `type` | What it holds | What your UI shows |
|--------|---------------|--------------------|
| `reasoning` | `text`: a short summary of the agent's thinking | A collapsed "Thinking" section, in its place in the list. |
| `answer` | `text`: the answer text | The agent's message. Render it as Markdown. |
| `tool` | `toollabel`, `toolstatus` (`requested`, `completed`, `error`), `toolintegration`, `toolaction` | A small status line, such as "Working in Shopify" or "Taking a screenshot". Use your own labels for the `toolintegration` and `toolaction` words, and `toollabel` when both are `null`. |
| `setup` | `setup`: a setup card; on a pending `connect` card, also `next` | A card with buttons. See [The Setup Block](#the-setup-block). |

Setup blocks have `callindex: 1000000`, so they sort after the reply's other blocks, in the order the agent proposed them, at most three per message. Skip a block whose `type` you don't know. The block fields are listed in [Public timeline block fields](/docs/agent-messaging#public-timeline-block-fields).

### Replies the API answers itself

Some messages are answered by Wiro itself, with no agent turn: a `yes` that applies a card or gets the card listing, a key typed as the reply for a `connect` card, and a few others listed in [Chats Without Cards](#chats-without-cards). `Message/Send` then answers at once with `status: "agent_end"`, `agenttoken: null`, the answer in `response` and the outcome in `setupresult`:

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

Show `response` as the reply, as plain text. There is nothing to follow on the WebSocket. In `Message/History` the row reads `status: "agent_end"`, `metadata: { "type": "setup_result" }` and an empty `timeline`. These replies work while the agent is stopped or restarting, and they use no credits.

## The Setup Block

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
| `contentindex` | The card's place on the message: `0`, `1` or `2`. Add 1 for the card number a [card listing](#the-card-listing) uses. |
| `text` | Always `null`. |
| `setup` | The card. See [Card fields](#card-fields). |
| `phase` | Always `end`. |
| `version` | `1` while the card is pending, `2` once it is applied, dismissed or failed. Keep the copy with the higher version. |
| `startedat` | When the agent proposed the card (Unix seconds). |
| `updatedat` | When the card last changed. |
| `next` | Only on a pending `connect` card: how its own connector connects, as one entry `{ connector, title, mode }`. It is gone once the card is applied, dismissed or failed. See [Your Own Connect Button](#your-own-connect-button). An `add` card's block has no `next`: its `setup.needs` lists what it brings. |

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
| `before` | `skill` (`update`, `append`, `revert`) | The skill's text when Wiro checked the card. Show it next to the text after the change. Can be absent on older cards. |
| `with` | `add`, `remove` | Other connectors and skills turned on (`add`) or off (`remove`) together with `key`, by name, sorted, at most 12. Written by Wiro. |
| `pauses`, `resumes` | `add`, `remove` | Scheduled tasks (`cs-cron-<name>`) that stop, or run again, with this change, at most 20 each. Written by Wiro. |
| `needs` | `add` | The connectors the change brings that aren't connected yet, at most 3, each `{ connector, title, mode }`. Written by Wiro. See [Modes](#modes). |
| `timezone` | `timezone` | The proposed IANA time zone, such as `Europe/Istanbul`. |
| `note` | all | Optional. The agent's one-line note on the change, up to 300 characters. |
| `status` | all | Absent while pending, then `applied`, `dismissed` or `failed`. |
| `actedat`, `actedby` | all | When the card was acted on (Unix seconds) and the account UUID of who did it. Absent while pending. |
| `error` | all | Only when `status` is `failed`: one plain sentence that says why. |
| `requestedby` | all | The account UUID of the person whose message asked for the change. |
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
| Failed | `status: "failed"` | Wiro tried to apply it and couldn't: `error` says why, and nothing changed. |

Two more states exist only in your interface, between a click and the answer: **applying** (your call is under way), and **refused**, when `SetupCardApply` answers `result: false` and the card is still pending, for example a key that is too short or a sign-in that isn't finished. A refused card keeps its buttons. While the agent restarts after a change, show the card as applied with a **restarting** note; see [Restarts](#restarts).

### What your UI shows for each kind

| Kind | Title line | Body | Buttons |
|------|-----------|------|---------|
| `add` | "Add `<title>`", the `title` of `key` in `Skills/List` | `with` as "Also turns on", `pauses` and `resumes`, and each entry of `needs` with its connect step | Apply, Dismiss; Connect for each connector in `needs` that has a `connect` card |
| `remove` | "Remove `<title>`" | `with` as "Also turns off", `pauses` and `resumes`. Say that a saved key stays saved. | Apply, Dismiss |
| `connect` | "Connect `<next[0].title>`" | A form or a sign-in button, by `next[0].mode` | Save, or Connect and then Done; Dismiss |
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
- **A `connect` card alone**: `mode` `key` shows the fields and **Save** (`SetupCardApply` with `values`). A sign-in mode shows **Connect**, which runs your connection flow, then calls `SetupCardApply` on the card.

A connector with `mode` `page` gets no `connect` card: its setup happens in your settings screens. See [Page](#page-set-up-outside-the-chat).

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
| `result` | `true` when the action went through. `false` when it was refused or failed: read `errors[0].message` and `setup.status`. |
| `errors` | `[{ code, message, time }]`. `message` is one plain sentence you can show as it is. |
| `setup` | The card after the call. Still pending after a refusal, `applied`, `dismissed` or `failed` otherwise. |
| `restarting` | `true` when the agent restarts to load the change. See [Restarts](#restarts). |
| `summary` | A short phrase that says what changed, such as `Scheduled task Weekly traffic report created` or `Serper Web Search added. Serper Web Search connected.`. Empty when nothing was applied. |
| `paired` | Only when `values` or `signin: true` came with an `add` card: its `connect` card after the call, `[{ setup, result, error }]`. `result` is `true` when that card was applied too, and `error` is `null` or the sentence that says why not. |
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
- The card is pending. A card is applied at most once: on one that was acted on, the answer says `This card was already applied.` or `This card was already dismissed.`, with the card in `setup`.

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
| `page` | Anything else: service account files, lists, the Wiro project the agent runs models with | A link to your settings screen for that connector | The credential endpoints, with no card |

Read a mode you don't know as `page`. `mode` is the connector's usual way. A connector can offer others, listed in `connection_modes` of `POST /Credentials/Detail`: any of them that connects the connector lets its card apply. Each mode below uses one example connector, and the same calls work for every connector of that mode.

The fields of a connector are in [`POST /Credentials/Detail`](/docs/agent-credentials#post-credentialsdetail) (`credential_schema`), which needs no API key, and in `credentials.<connector>._schema.fields` of `UserAgent/Detail`.

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

A `connect` card sent before its `add` card is applied changes nothing and answers `Apply card 1 first: it turns on Serper Web Search.`. A connector with several fields, such as WordPress, is connected once all its required fields are saved: with only some of them, the fields you sent are saved, the card stays pending, and the answer is `result: false` with `Saved <fields> for <Connector>. Still needed: <fields>.`. Send the rest with the same card.

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

**2. Save the app keys** with [`CredentialUpsert`](/docs/agent-overview#post-useragentcredentialupsert), with `authmethod: "own"`. This restarts nothing: the connection does, once.

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
https://app.example.com/connect/done?ref=conn_8812&ga4_connected=true&ga4_properties=%5B%7B%22id%22%3A%22123456789%22%2C%22displayName%22%3A%22Acme%20Web%22%2C%22account%22%3A%22Acme%22%2C%22propertyType%22%3A%22PROPERTY_TYPE_ORDINARY%22%7D%5D
```

On failure it carries `ga4_error=<code>` instead; see [Return codes](#return-codes-on-your-redirect-url). Each connector has its own prefix (`ga4_`, `x_`, `fb_` and so on), listed in [Callback success and error parameters](/docs/agent-credentials#callback-success-error-parameters).

**6. Read the accounts to pick** from your backend with `OAuthStatus` and the `flowid`. This also works when you didn't read the return, such as after a popup:

```json
{
  "result": true,
  "errors": [],
  "connected": false,
  "accounts": [],
  "connectedat": "2026-11-14T08:21:30.000Z",
  "tokenexpiresat": "2026-11-14T09:21:30.000Z",
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

`flow.status` is `waiting` until the person comes back, then `candidates` (accounts to pick), `connected` (nothing to pick), or `failed` with `flow.errorcode`. Poll it every two seconds or so while you wait. Show `candidates` as a list with checkboxes.

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

See [Both steps in one call](/docs/agent-credentials#both-steps-in-one-call) for the rules of that save.

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

A `signin` connector connects with Wiro's own app, so there are no app keys to collect: one button. The provider's consent screen then names Wiro's app, not yours. To show your own brand there, connect the same connector with your own app keys instead (`authmethod: "own"`, as in [Own app keys](#own-app-keys-google-analytics-4)), where the connector offers it in `connection_modes`. For a pending `add` card for `int-twitterx-post` and its `connect` card for `twitter`:

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
  "connectedat": "2026-11-14T08:25:02.000Z",
  "tokenexpiresat": "2026-11-14T10:25:02.000Z",
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

A connector with `mode` `page`, such as Google Drive with its service account file, has no `connect` card: no card can connect it. When its `add` card is applied, `summary` goes on with `Connect Google Drive in the agent's settings`, and `next` lists it with `mode: "page"` and no `cardid`. Send the person to your own settings screen for that connector, which saves it with the credential endpoints, as its integration page shows:

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

There is no card to apply afterwards. The save restarts a running agent once, so it loads the connector. Files go through [`CredentialFileUpload`](/docs/agent-overview#post-useragentcredentialfileupload), and the Wiro project the agent runs models with through [`CredentialProjectBind`](/docs/agent-overview#post-useragentcredentialprojectbind).

## Your Own Connect Button

### Where next appears

`next` is the list of connectors still to connect, as data for your own buttons. It comes in four places:

| Where | When | Entries |
|-------|------|---------|
| A setup block | On a pending `connect` card | One entry, its own connector: `{ connector, title, mode }`. No `cardid`: it is the block's own card. |
| `SetupCardApply` answer | An `add` card applied, alone, with `values` or with `signin: true`, that leaves connectors not connected; a sign-in `connect` card refused with `not_connected` or `signin_values`; a `connect` card for a `page` connector | `{ connector, title, mode, cardid?, messageguid? }` |
| `setupresult.next` in a `Message/Send` answer | A `yes` that applied a card while `connect` cards of the reply still wait, or whose `add` card leaves connectors to connect; a `yes` while only `connect` cards wait, one of them a sign-in card; a key typed for an `add` card and its `connect` card, when the `add` card brings other connectors too | Same |
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
async function connectFromNext(entry, useragentguid) {
  if (entry.mode === "page") {
    return openSettingsScreen(entry.connector); // your own screen; no card to apply
  }
  if (entry.mode === "key") {
    const values = await askForFields(entry.connector); // your form, never the chat
    if (!entry.cardid) return saveWithCredentialUpsert(entry.connector, values); // no card records it
    return setupCardApply({ useragentguid, messageguid: entry.messageguid, cardid: entry.cardid, action: "apply", values });
  }
  // signin, appkeys, token: run the connection, then record it on its card when there is one.
  await runConnection(entry.connector, entry.mode); // OAuthConnect and the rest
  if (!entry.cardid) return;
  return setupCardApply({ useragentguid, messageguid: entry.messageguid, cardid: entry.cardid, action: "apply" });
}
```

On a block's `next`, the card is the block's own: use its `setup.id` and the message's `guid`. An entry with no `cardid` and a mode other than `page` has no card left to record it, for example because its `connect` card was turned down: connect it the same way, with `CredentialUpsert` for a key, and there is nothing to apply. When the answer to a sign-in `connect` card is `errorcode: "not_connected"` with `next`, the connection isn't finished: run the flow again from that entry.

## Errors and What to Show

Every refusal comes as `result: false` with one plain sentence in `errors[0].message`. Show it as it is, and match codes, not sentences, in your code: sentences can change.

### SetupCardApply refusals

| `errorcode` | Sentence | What to do |
|-------------|----------|------------|
| `not_connected` | `<Title> is not connected yet. Finish the sign-in on the card first.` (a `token` connector says `token check`) | Run the Connect step, then apply again. The card stays pending. On a `connect` card, `next` names it. |
| `signin_values` | `<Title> connects with its sign-in on the card, not with typed values.` | Don't send `values` to a sign-in `connect` card: connect it, then apply with no `values`. |
| `signin_no_pair` | `This card has no sign-in to finish. Apply it without one.` | The `add` card has no pending sign-in `connect` card. Apply it without `signin`. |
| `signin_many` | `This card brings more than one sign-in. Apply it, then connect each on its own card.` | Apply the `add` card alone, then connect each connector and apply its own `connect` card. |

Refusals with no `errorcode`:

| Sentence | What to do |
|----------|------------|
| `Setup from chat is off for this agent.` | Set `chatsetup` to `"all"`, or change the setup from your settings screens. |
| `Only an agent admin can apply setup changes.` (code `97`) | The key's owner can't apply on this agent. |
| `Wait until the agent finishes this reply, then apply it.` | Enable Apply once the reply ends. |
| `This setup card was not found.` | Wrong `messageguid` or `cardid`, or a message the key's owner can't see. |
| `This card was already applied.`, `This card was already dismissed.` | Show the card from `setup` in its state. |
| `This card is being applied. Try again in a moment.`, `Another change to this agent's connectors or skills is being applied. Try again in a moment.` | Someone is acting on it right now. Retry after a few seconds. |
| `Apply card <N> first: it turns on <Title>.` | Apply the `add` card first, or send the key with the `add` card. |
| `Send values or signin, not both.` | Send one of them. |
| `This card takes no key. Apply it without one.`, `This card brings more than one key. Apply it, then add each key on its own card.` | `values` on an `add` card that can't take them. |
| `Saved <fields> for <Connector>. Still needed: <fields>.` | Send the missing fields with the same card. |
| A field's sentence, such as `Serper API Key must be at least 20 characters` | Show it next to the field. Nothing was saved. |
| `<Title> is connected in the agent's settings, not from chat.` | A `page` connector: `next` names it with `mode: "page"`. |
| `The change could not be applied. Try again in a moment.` | Wiro couldn't make the change. The card is now `failed`; ask the agent again later. |

A card that fails as it is applied, for example because the agent's setup changed since the card was made, gets `status: "failed"` and the sentence in `setup.error`. Show it on the card. The person can ask the agent again for a new card.

### Account list codes

`SetPickerAccounts` and `DiscoverPickerItems` answer these in `errorcode`, with a sentence in `errors[0].message`:

| `errorcode` | Meaning | What to show |
|-------------|---------|--------------|
| `flow_expired` | No account list is open: no sign-in or check was started, it was over 15 minutes ago, a save already used its list, or the connector was disconnected. | "The connection timed out", and the Connect button again. |
| `flow_other_person` | Another account started the current sign-in or check. | The Connect button again. |
| `flow_replaced` | The `flowid` you sent isn't the current one: a newer sign-in or check replaced it. | Use the newer one, or connect again. |
| `flow_failed` | The current sign-in or check failed. `OAuthStatus` shows why in `flow.errorcode`. | The reason, and the Connect button. |
| `flow_waiting` | The sign-in hasn't come back from the provider yet, so there is no list. | Keep waiting for the person to finish; don't start a new sign-in, which would replace it. |
| `not_listed` | An id you sent isn't on the list the sign-in gave. | Pick again from `candidates`. |
| `next_expired` | Both steps in one call, but the second step's discovery is missing or more than five minutes old. | Call `DiscoverPickerItems` with `parents` again. |
| `next_required` | Both steps in one call for Google Business Profile with no location picked. | Ask for at least one location. |
| `too_many_parents` | More than 50 Meta ad accounts, or more than 20 Business Profile accounts, for the second step. | Ask the person to pick fewer. |

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
| `useragent_not_found` | The agent was deleted during the sign-in. |
| `internal_error`, or any other code | Something went wrong. Offer to connect again. |

Some connectors add their own codes, listed on their integration pages and in [Callback success and error parameters](/docs/agent-credentials#callback-success-error-parameters). A callback opened without its `state`, or more than 24 hours after `OAuthConnect`, can't be matched to your sign-in and lands on wiro.ai instead of your page.

### Token check codes

A token check that fails answers `OAuthConnect` with `result: false`, a sentence, `flowid` and `errorcode`, such as `direct_token_missing` (the token or `authmethod: "api_key"` isn't saved), `direct_token_invalid`, `no_accounts`, `no_pages`, `provider_rejected_request` or `provider_timeout`. Show the sentence, and let the person paste a new token. Each integration page lists its codes.

## Restarts

### When the agent restarts

An agent loads its setup when it starts, so most changes restart it:

- `add`, `remove`, `connect` (a key saved), `disconnect` and `timezone` cards, a `schedule` or `skill` card that creates one, a `schedule` card that changes `cron`, and `pause`, `resume`, `delete`, `disable` and `enable` cards.
- A card that changes only the text of a custom skill or scheduled task (`append`, `revert`, or an `update` that keeps the schedule) reaches a running agent without a restart.
- A sign-in `connect` card writes nothing: the connection restarted the agent if it needed to, so its apply answers `restarting: false`.
- One change, one restart. An `add` card applied with its key, or with `signin: true`, restarts the agent once for both cards, and a change made while a restart is still stopping or queued loads with that restart.
- A connection made while nothing on the agent uses the connector restarts nothing, which is why connecting first and then applying the `add` card with `signin: true` restarts the agent once.
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

A restart takes about a minute.

### Showing a restart

When an answer has `restarting: true`, show a line such as "Restarting to load the change, about a minute" above the message box, and poll `UserAgent/Detail` every five seconds until `status` is `4`. Then hide the line. You can leave the message box on: a message sent too early gets a clear refusal you can show.

### Messages during a restart

While the agent isn't running, `Message/Send` answers `result: false` with `agentstatus` and one of these sentences, shown as they are:

| `agentstatus` | Sentence |
|---------------|----------|
| `1` | `Agent is restarting. Please wait a moment and try again.` (or `Agent is stopping. Please wait a moment and try again.` when it stops for good) |
| `2`, `3` | `Agent is starting up. Please wait a moment and try again.` |
| `0` | `Agent is stopped. Start it before sending messages.` |
| `5` | `Agent is in error state. Restart it before sending messages.` |
| `6` | `Agent setup is incomplete. Complete the setup before sending messages.` |

Setup replies still work during a restart: a `yes`, a `no` and a key typed as the reply are answered by Wiro itself. A turn that was running in another session when the restart began ends with `[TURN_INTERRUPTED]`: offer to send it again.

## Chats Without Cards

Your chat can work with text alone, or people may type `yes` even where you show cards. Wiro then reads the reply itself.

### Typed replies

- **Approve.** A message that is only an approval, such as `yes`, `ok`, `approve`, `go ahead`, `evet` or `👍`, up to four words and with no question mark, acts on the pending cards of the agent's latest reply in the same `sessionkey`, when they are less than 30 minutes old. In a chat sent with your API key, the first `yes` applies nothing: Wiro answers with the card listing, the exact content of the cards. A second `yes` applies the one card listed. With several cards, `yes 2` applies card 2 once the listing has shown it, one card per reply.
- **Turn down.** `no` or `cancel` dismisses every pending card of the latest reply, then goes to the agent as a normal message. While the agent isn't running, Wiro answers it itself: `The setup change was turned down.`
- **A key as the reply.** When the latest reply has one pending `connect` card for a key connector, an agent admin can paste the key as the reply. Wiro saves it and stores the message as `[key saved to <Connector title>]`. When the only pending cards are an `add` card and its `connect` card, and the key is all the connector needs, the key typed after the listing applies both cards at once.
- A `yes` never applies a `connect` card: a key or a sign-in connects it.

The full rules are in [Approving a setup card](/docs/agent-messaging#approving-setup-cards).

### The card listing

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
| `✅ Applied: <summary>.` | A card was applied. An `add` card that brings a `page` connector goes on with `Connect <Title> in the agent's settings.` |
| `⚠️ Not applied: <reason>` | The change failed. |
| `Your agent is restarting to load the change. Continue in about a minute.` | The change restarts the agent (shorter when a `Next:` line follows). |
| `Next: paste your <Title> key as your reply.` | A key `connect` card waits for its key. While the agent restarts, it goes on with `Send it now and it loads with this same restart.` |
| `Next: connect <Title> to finish. Its sign-in, app keys or token are entered outside this chat, never in it.` | An `add` card was applied and its sign-in `connect` card waits. |
| `A yes cannot connect <Title>. Its sign-in, app keys or token are entered outside this chat, never in it.` | A `yes` while only `connect` cards wait, one of them a sign-in card. |
| `Saved <fields> for <Connector>. Still needed: <fields>.` | A key was saved and the connector needs more fields. |
| `⚠️ Not saved: <reason>. Paste the key again as your reply.` | The key was refused. Nothing was saved. |
| `Only an agent admin can apply setup changes.` | The sender can't apply changes. |
| `The setup change was turned down.` | A `no` while the agent isn't running. |

The full list is in [Wiro's answers](/docs/agent-messaging#setup-reply-lines).

## Security

- **Keys never go into chat messages.** Collect keys, app keys and tokens in your own forms and send them with `SetupCardApply` `values` or `CredentialUpsert`. The agent never sees them. While setup from chat is on for a message, Wiro takes clear keys out of it before it is stored or reaches the agent: each one reads `[key removed]` in the stored text and in the text the agent gets, and Send answers `contentmasked: true` with that text in `content`. A key pasted as the reply for a waiting `connect` card is saved to the connector and stored as `[key saved to <Connector title>]`. This runs only while setup from chat is on for the message, so treat it as a safety net, never as a way to send keys. See [Keys in chat](/docs/agent-messaging#keys-in-chat).
- **Saved secrets read as a mask.** `UserAgent/Detail` shows every saved `password` or `fileinput-base64` field as `"••••••••"`, for every caller, and returns no OAuth token and no OAuth app key at all. Show "Saved" instead of a value, and let people replace a secret, not read it.
- **The mask sent back keeps the saved value.** A field sent to `CredentialUpsert` as `"••••••••"` isn't written, so a form saved as Detail showed it changes only the fields edited. In a list sent whole, such as `firebase.accounts`, an entry whose secret is the mask keeps the secret of the saved entry with the same values in its other fields. When no single saved entry matches, because those values changed or two saved entries share them, the request is refused and nothing is saved: send that entry's secret again. See [Field-level write rules](/docs/agent-credentials#field-level-write-rules).
- **Which service account a key file is.** A saved Google service account file (Google Drive, Google Play and Google Calendar's `serviceaccountjson`, and each Firebase account's) reads as the mask too. So that you can show which account it is, the address people share a Drive folder, the Play Console or a calendar with, the agent's owner and team admins get `_service_account_email` in that connector's group of `credentials`, in `UserAgent/Detail` and in the `Deploy` and `Update` answers: `"_service_account_email": { "serviceaccountjson": "agent@acme-project.iam.gserviceaccount.com" }`, or for Firebase `"_service_account_email": { "accounts": [{ "serviceaccountjson": "push@acme-project.iam.gserviceaccount.com" }] }`, one item per account in the list's order. A value is `""` when nothing is saved or the file doesn't read as a service account key. Only the account's address leaves the file. Leave the key out of what you send back: field names that start with `_` are refused.
- **Approvals act with your key's rights.** Show Apply only to the people allowed to change the agent, check that a `messageguid` belongs to the session of the person who clicked, and use `chatsetup: "off"` for agents whose users must not change them.
- **Your API key stays on your server.** Your app calls your backend, and your backend calls Wiro.
- **Sign-ins come back to your page.** The `redirecturl` receives only status parameters and the accounts to pick, never a token or a secret.

## Worked Examples

Each example starts with a person's message in your chat and ends with the change applied. They use the same agent, `f8e7d6c5-b4a3-2190-fedc-ba0987654321`, and the person's account `5f0c9a2e-1b7d-4c3a-9e8f-2a6b7c8d9e0f`. The agent's own words vary from turn to turn.

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
      "wordCount": 23,
      "raw": "I can do that once Google Analytics 4 is on and connected. Approve the card below and connect your Google Analytics account.",
      "answer": ["I can do that once Google Analytics 4 is on and connected. Approve the card below and connect your Google Analytics account."]
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

The fields of the row are described in [`Message/Detail`](/docs/agent-messaging#post-useragentmessagedetail).

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
OAuthStatus        { "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321", "credentialkey": "ga4", "flowid": "9d2c41e07ab35f8e6c1d0b9a87f6e5d4" }
                -> { ..., "flow": { "flowid": "9d2c41e07ab35f8e6c1d0b9a87f6e5d4", "mine": true, "mode": "own", "status": "candidates", ... }, "candidates": [{ "id": "123456789", "name": "Acme Web" }, { "id": "987654321", "name": "Acme App" }] }
SetPickerAccounts  { "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321", "credentialkey": "ga4", "flowid": "9d2c41e07ab35f8e6c1d0b9a87f6e5d4", "accountids": ["123456789"] }
                -> { "result": true, "errors": [], "accounts": [{ "id": "123456789", "name": "Acme Web" }], "restart": "none" }
```

**5. The person presses Add.** `SetupCardApply` with `{ "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321", "messageguid": "c3d4e5f6-a7b8-9012-cdef-345678901234", "cardid": "71xb9zrcd1sb", "action": "apply", "signin": true }` answers as shown in [step 8](#own-app-keys-google-analytics-4): both cards `applied`, `summary` `Google Analytics 4 added. Google Analytics 4 connected.` and `restarting: true`.

**6. The agent restarts.** Your app shows "Restarting" and polls `UserAgent/Detail` until `status` is `4`. The person then asks again, and the agent proposes the scheduled task: a `schedule` card that your Apply button applies with `SetupCardApply`, as in [Applying and Dismissing](#applying-and-dismissing).

If the person typed `yes` instead of pressing Add, the first `yes` gets the listing and the second applies the `add` card alone; see [setupresult and next](#setupresult-and-next). Its `next` names the `connect` card: after the connection, apply it with `{ "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321", "messageguid": "c3d4e5f6-a7b8-9012-cdef-345678901234", "cardid": "ljehd9inazm4", "action": "apply" }`. Applied before the connection, it answers:

```json
{
  "result": false,
  "errors": [{ "code": 0, "message": "Google Analytics 4 is not connected yet. Finish the sign-in on the card first.", "time": 1794654830 }],
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
OAuthStatus        { "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321", "credentialkey": "twitter", "flowid": "e1a2b3c4d5e6f708192a3b4c5d6e7f80" }
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

- Your backend holds the project API key, and your app talks only to your backend.
- One agent per customer, deployed with `useprepaid: true`, and `chatsetup` set: `"all"` for setup cards in your chat, `"off"` for agents whose users must not change them.
- Each conversation has its own `sessionkey`, and you check that every `messageguid` a person acts on is in their session.
- Messages go out with `Message/Send`; replies are followed on the WebSocket or with `Message/Detail`, and loaded with `Message/History`.
- Timeline blocks are merged by `blockid` and newer `version`, sorted by `callindex`, `contentindex`, `blockid`, and drawn by `type`; unknown types and kinds are skipped.
- Replies Wiro answers itself (`agenttoken: null`, `status: "agent_end"`) show `response` as plain text.
- Setup cards show the right title, body and buttons for their kind and state, `add` cards together with their `connect` cards.
- Apply waits for the reply to finish; Apply and Dismiss call `SetupCardApply`, and the card updates from the answer's `setup` and from later `version` 2 blocks.
- Each connector mode has its flow: `key` (fields as `values`), `appkeys` (`CredentialUpsert`, `OAuthConnect` with `own`, the return page, `OAuthStatus`, `SetPickerAccounts`), `token` (`CredentialUpsert`, `OAuthConnect` with `api_key`, `SetPickerAccounts`), `signin` (`OAuthConnect` with `wiro`), and `page` (your settings screens).
- After connecting, the `add` card is applied with `signin: true` (one restart), or the `connect` card is applied.
- `next` from blocks, `SetupCardApply` answers, `setupresult` and webhooks turns into your own Connect buttons.
- Every `result: false` shows its sentence; code branches on `errorcode`, `flow.status` and the return codes, never on sentences.
- `restarting: true` shows a restarting line until `UserAgent/Detail` reads `status: 4`; Send refusals during a restart are shown as they are.
- Keys never go into chat messages; secrets show as "Saved", and the mask sent back is left alone.
- Your `redirecturl` page handles `<prefix>_connected=true` and `<prefix>_error=<code>`, inside a popup or as a full page.

## Related

- [Agent Messaging](/docs/agent-messaging): every messaging endpoint, and the full rules of [Setup From Chat](/docs/agent-messaging#setup-from-chat).
- [Agent WebSocket](/docs/agent-websocket): live events.
- [Agent Webhooks](/docs/agent-webhooks): the callback payload.
- [Agent Credentials & OAuth](/docs/agent-credentials): every credential and OAuth endpoint in detail.
- [Agent Overview](/docs/agent-overview): Deploy, Detail, UpdateSettings and restarts.
- The integration pages, such as [Google Analytics 4](/docs/integration-ga4-skills), [Facebook Page](/docs/integration-facebook-skills), [Twitter / X](/docs/integration-twitter-skills) and [Serper Web Search](/docs/integration-serper-search-skills): each connector's own setup.
