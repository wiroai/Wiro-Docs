# Agent Overview

Deploy and manage autonomous AI agents through a single API.

## Wiro Agents on the Web

The endpoints below cover the full programmatic surface. If you also want to see the web product alongside what you're building (landing pages, marketing copy, the visual catalog, and the no-code Build Your Own Agent flow), these are the public Wiro pages dedicated to agents:

| Page | URL | What it covers |
|------|-----|----------------|
| **AI Agents Home** | [wiro.ai/agents](https://wiro.ai/agents) | Top-level landing: what Wiro Agents are, how they compare to traditional setups, and a featured selection from the marketplace. |
| **Learn About Agents** | [wiro.ai/agents/learn](https://wiro.ai/agents/learn) | Concept primer: security model, deployment lifecycle, and the difference between marketplace templates and custom builds. |
| **Anatomy of an Agent** | [wiro.ai/agents/anatomy](https://wiro.ai/agents/anatomy) | Fullscreen interactive walkthrough of the pieces that make a Wiro agent reason: system prompt, knowledge, skills, memory, guardrails, model, tools, scheduling, and observability. |
| **Build Your Own Agent** | [wiro.ai/agents/build](https://wiro.ai/agents/build) | The web wizard for the same custom-build flow exposed by [`POST /UserAgent/Deploy`](#post-useragentdeploy) with `custom: true`. Useful for previewing the skill picker and the three plans before scripting it. |
| **Browse Agents** | [wiro.ai/agents/browse](https://wiro.ai/agents/browse) | Full marketplace catalog with categories, descriptions and screenshots, the visual mirror of [`POST /Agent/List`](#post-agentlist). Each row links to a dedicated agent page at `/agents/{slug}`. |
| **Use Case Showcases** | [wiro.ai/agents/usecase/...](https://wiro.ai/agents) | Seven fullscreen, auto-looping product stories that show real businesses operated end-to-end by a Wiro agent. See [Agent Use Cases](/docs/agent-use-cases#see-these-use-cases-on-the-web) for the full list. |

> All pages are public: no Wiro account required to browse. Sign-in becomes mandatory only when you click "Deploy" on a specific agent (which then drops you into the Wiro dashboard at [wiro.ai/panel/agents](https://wiro.ai/panel/agents)).

## What are Wiro Agents?

Wiro Agents are autonomous AI assistants that keep running on Wiro. Unlike one-shot model runs, agents maintain conversation memory, connect to external services, and use tools to complete tasks on your behalf, all managed through the API.

The system has two layers:

- **Agent templates** (the catalog): Pre-built agent definitions published by Wiro. Each template defines the agent's default skill set and required credentials, and runs on any of the three plans. Browse the catalog with `POST /Agent/List`.
- **UserAgent instances** (your deployments): When you deploy an agent template (or build a custom one), Wiro creates a personal instance tied to your account. Each instance runs in its own isolated environment with its own credentials, configuration, conversation history, billing, and per-model token-rate profile, and its own computer in the cloud with a web browser the agent works in. The people who manage the agent can watch that computer from the Wiro panel, and an app built on the API can show it to its own users (see [Screen and Take Control](#screen-and-take-control)).

Every instance is fully isolated. Your credentials, conversations, and data are never shared with other users.

> **Two deploy paths.** You can deploy a marketplace template by passing `agentguid`, **or** build a custom agent from scratch with `custom: true` (no template: you pick the skill set yourself). Both flows are documented under [`POST /UserAgent/Deploy`](#post-useragentdeploy). The custom builder is detailed in [Agent Builder](/docs/agent-builder).

## Base URL

```
https://api.wiro.ai/v1
```

## Authentication

Agents use the same authentication as the rest of the Wiro API. Include your key in every request:

| Method | Header |
|--------|--------|
| API Key | `x-api-key: YOUR_API_KEY` |
| Bearer Token | `Authorization: Bearer YOUR_API_KEY` |

**Public endpoints**: `Agent/List`, `Agent/Detail`, `Skills/List`, `Skills/Detail`, `Skills/CredentialSchema`, `Skills/Capabilities`, `Credentials/List`, `Credentials/Detail`, `AgentConnector/List`, and `AgentConnector/Detail` are catalog endpoints and do not require authentication. You can browse available agents, the skill registry, the credential schema, and the connector catalog without an API key.

**Authenticated endpoints**: All `UserAgent/*` endpoints require a valid API key.

For full details, see [Authentication](/docs/authentication).

## Pricing Model: Plans, AI Usage & Balance

Every agent runs on one of three monthly plans, and the plan alone sets its price, the AI usage it includes and its disk space. Templates and custom builds use the same plans, and the skills an agent has never change the price. AI usage is what the agent's own model uses on each turn, priced by its tokens. Once the plan's included usage for the period is used up, the agent runs on the Wiro balance of its workspace, the same balance your model runs use. Its AI usage draws on that balance's deposits and store revenue; coupon credit isn't counted for it (see [`usage.balanceusd`](#usage-object)).

### Plans

| Plan | `tier` | Price | AI usage included | Disk |
|------|--------|-------|-------------------|------|
| **Starter** | `"starter"` | $5 a month | $5 a month | 250 MB |
| **Pro** | `"pro"` | $30 a month | $30 a month | 500 MB |
| **Max** | `"max"` | $100 a month | $100 a month | 1 GB |

Each plan includes its own price in AI usage: Pro costs $30 a month and includes $30 of AI usage a month. A plan is bought per agent and paid from the Wiro balance: pass `tier` to [`Deploy`](#post-useragentdeploy) or [`CreateSubscriptionCheckout`](#post-useragentcreatesubscriptioncheckout). Catalog responses, instance responses (`agent.plans`) and `PricingPreview` list the three plans in order under `plans`:

```json
"plans": [
  { "key": "starter", "title": "Starter", "priceUsd": 5,   "includedUsageUsd": 5,   "diskMb": 250 },
  { "key": "pro",     "title": "Pro",     "priceUsd": 30,  "includedUsageUsd": 30,  "diskMb": 500 },
  { "key": "max",     "title": "Max",     "priceUsd": 100, "includedUsageUsd": 100, "diskMb": 1024 }
]
```

`priceUsd` is the plan's monthly price, `includedUsageUsd` the AI usage it includes each month, in USD, and `diskMb` its disk space in MB (`250`, `500` or `1024`, which is 1 GB; see [Disk Space](#disk-space)). The same responses also key the plans by `tier` under `tiers`, each with its `priceUsd`:

```json
"tiers": {
  "starter": { "priceUsd": 5 },
  "pro":     { "priceUsd": 30 },
  "max":     { "priceUsd": 100 }
}
```

A plan's period lasts 30 days. The plan renews from the balance a day after its period ends, the next 30-day period starts then, and every renewal includes the plan's AI usage in full. Included usage that a period leaves unused doesn't carry over.

When the balance can't pay a renewal, the plan ends and the agent stops (status `0`). A cancelled plan ends and stops the agent the same way, at the end of its period. An agent runs only while its plan is active, whatever its balance holds, so adding funds doesn't start it again: [`RenewSubscription`](#post-useragentrenewsubscription) pays the plan from the balance and queues the agent to start.

### What a Plan Includes

Every skill and connector works on every plan. Turning a skill on or off with [`SkillsApply`](#post-useragentskillsapply) is free: the plan's price and included AI usage stay as they are. The work a skill does still uses AI usage, since its replies and scheduled tasks are agent turns billed by tokens like any other. A skill that runs Wiro models, such as Video Creator (`util-video-creator`), pays for those runs from the wallet of the Wiro project you connect to the agent. Connectors are included too: connecting one never changes the plan's price (see [Agent Connectors](/docs/agent-connectors)).

### Disk Space

Each plan gives the agent disk space for its files: 250 MB on Starter, 500 MB on Pro and 1 GB on Max. What counts is the agent's workspace, the media it generates and its temporary files. Chat history and the agent's system files don't count.

Downloads and temporary files outside the workspace are cleared when the agent restarts, and media files from its chats are kept 3 days. Temporary files are also cleared when they pass 1 GB, on every plan: the agent then restarts on its own once the reply it is working on is done (it waits up to 20 minutes for it), which takes about a minute, and the files in its workspace stay.

When the agent's files reach the plan's size, the disk is full: the agent can't save new files until some are deleted or the agent moves to a bigger plan. The agent frees space itself: when a save is refused, it deletes the scratch files and notes it no longer needs, moves files out of the counted space, or deletes finished video work, then saves again. There is no endpoint that lists or deletes the agent's files. A full disk deletes nothing on its own. A move to a higher plan with [`UpgradeTier`](#post-useragentupgradetier) gives the agent the bigger disk as soon as the new plan starts. A move to a lower plan brings its smaller disk at the renewal where that plan starts: if the agent's files are bigger than that, they all stay, and the disk reads full until some are deleted.

[`UserAgent/Detail`](#post-useragentdetail) shows the agent's usage in `disk` (see [Disk object](#disk-object)): its `state` reads `"almost_full"` from 80% of the plan's size and `"full"` from 100%. The agent's activity log gets an `AGENT_DISK_ALMOST_FULL` row when its files pass 80%, an `AGENT_DISK_FULL` row when they reach the plan's size, and an `AGENT_DISK_TEMP_CLEARED` row when a restart clears temporary files that passed 1 GB (see [Who-did-what rows](/docs/agent-logs#who-did-what-rows)).

### Changing Plans

[`POST /UserAgent/UpgradeTier`](#post-useragentupgradetier) moves an agent to another plan:

- **A higher plan starts now.** The balance pays the monthly difference for the time left in the period, by the second, rounded up to the cent and at least one day's worth, and the period's included AI usage grows by the difference for that same time. Every renewal after that includes the new plan in full. Example: a Pro agent moving to Max with 15 days left of 30 pays $35.00 now, and its included AI usage for the period goes from $30 to $65; it then renews at $100 with $100 of AI usage.
- **A lower plan starts at the next renewal.** Ask for it with `allowDowngrade: true`: without it, a lower plan is refused and nothing changes. Nothing is charged or refunded. The agent keeps its current plan, price and included AI usage until the period ends, and its `nextplan` field names the plan it will renew on.
- **Asking for the agent's current plan** cancels a scheduled move to a lower plan.

Moving to a higher plan while a lower one is scheduled cancels the scheduled move first. Cancelling a plan paid from the balance keeps a scheduled move; cancelling a plan paid by card drops it (see [`CancelSubscription`](#post-useragentcancelsubscription)).

### Paying for Plans

Agent plans are paid from the Wiro balance of the agent's workspace: your personal balance for a personal agent, the team's balance for a team agent. A new plan, a move to a higher plan, every renewal and a plan started again after it ended are all charged there, in the dashboard, the API and MCP alike. An agent plan has no card subscription: a card only adds funds to the balance (see [Adding Funds](#adding-funds)).

When the balance can't pay a plan's price, `Deploy`, `CreateSubscriptionCheckout`, `UpgradeTier` and `RenewSubscription` are refused with code `97`, and nothing is created or charged. The message says what the balance holds and what the plan needs (a team agent's starts `The team's balance is`), and `neededusd` is the amount to add, in USD, rounded up to the cent and never less than $20, the smallest deposit:

```json
{
  "result": false,
  "errors": [
    { "code": 97, "message": "Your balance is $3.10; this plan needs $100.00. Add funds to continue." }
  ],
  "neededusd": 96.9
}
```

Add at least `neededusd` to the balance, then send the same call again.

Every plan payment also counts on [Spend Limits](/docs/spend-limits): the account's or team's limit and the `agent` surface's, automatic renewals included. When a new plan, a move to a higher plan or a renewal you ask for would take spending over one of them, `Deploy`, `CreateSubscriptionCheckout`, `UpgradeTier` and `RenewSubscription` are refused with code `93` and the limit's message, and nothing is created or charged. An automatic renewal is counted, never refused.

A plan that was paid by card before agent plans moved to the balance keeps its current period as paid. At the end of that period it renews from the balance like every other plan, or ends when the balance can't pay the renewal. Until then its `subscription` reads `provider: "stripe"` with `nextprovider: "prepaid"`, and a move to a higher plan is paid from the balance. The switch itself charges and refunds nothing. Such a plan can also be cancelled with [`CancelSubscription`](#post-useragentcancelsubscription): it then ends at the end of its period instead of switching.

### Adding Funds

An agent has no balance of its own: past its plan's included usage it uses the Wiro balance of its workspace, which also pays its plan. Add funds to that balance as a normal wallet deposit in the Wiro dashboard, under **Credit Balance** ([add funds](https://wiro.ai/panel/wallet/deposit/credit-card)), with the agent's workspace selected. A team's balance is funded the same way (see [Team Billing](/docs/organizations-billing)). Funds added from an agent's page in the dashboard land in the same balance and are also listed in that agent's [Transactions](/docs/agent-transactions). Automatic Payment tops the balance up when it runs low, agent usage included.

Extra credit packs are retired: [`CreateExtraCreditCheckout`](#post-useragentcreateextracreditcheckout) charges nothing and only answers that they are. What was left of a pack bought earlier moved to the balance that paid for it, as a deposit that keeps the pack's expiry date.

### Token Billing

AI usage is metered by the tokens the agent's own model uses on each turn: a chat reply, a scheduled task run or a voice-prep turn. There are no flat per-action costs: what a turn costs depends on the model and on its input, cache read, cache write and output tokens, each priced at its own rate.

Per-model rates live in the `tokenRates` object, present on `Agent/Detail`, `UserAgent/Detail`, `MyAgents`, `PinnedAgents`, and `PricingPreview`. The marketplace catalog (`Agent/Detail`) and `PricingPreview` return only the **selectable** models; a deployed instance's `UserAgent/Detail` / `MyAgents` / `PinnedAgents` return the **full** model map (so historical model-change markers and token-usage tooltips can still resolve a model that was later marked non-selectable). Internal metadata (`$`-prefixed keys) is stripped from every response:

```json
"tokenRates": {
  "default_model": "openai/gpt-5.6-sol",
  "fallback_rate": { "input_per_1m": 625, "output_per_1m": 3750, "cached_input_per_1m": 62.5, "cache_write_per_1m": 781.25 },
  "models": {
    "openai/gpt-5.6-sol": { "input_per_1m": 625, "output_per_1m": 3750, "cached_input_per_1m": 62.5, "cache_write_per_1m": 781.25, "selectable": true, "label": "GPT-5.6 Sol", "tier": "premium" },
    "openai/gpt-5.6-terra": { "input_per_1m": 250, "output_per_1m": 1500, "cached_input_per_1m": 25, "cache_write_per_1m": 312.5, "selectable": true, "label": "GPT-5.6 Terra", "tier": "balanced" },
    "openai/gpt-5.6-luna": { "input_per_1m": 25, "output_per_1m": 150, "cached_input_per_1m": 2.5, "cache_write_per_1m": 31.25, "selectable": true, "label": "GPT-5.6 Luna", "tier": "cheap" }
  }
}
```

Rates are in **cents per 1,000,000 tokens**: `"input_per_1m": 625` is $6.25 per million input tokens. `input_per_1m` prices uncached input, `cached_input_per_1m` cache reads, `cache_write_per_1m` cache writes and `output_per_1m` output. Wiro prices every LLM call exactly, at the rates of the model that actually served it, and charges the AI usage in whole cents.

Cache-read and cache-write tokens are charged only when the model's rate defines them. `inputtokens` contains only uncached input; `totaltokens` is always the exact sum of input, output, cache-read, and cache-write tokens. For models with `long_context_threshold_tokens`, Wiro selects the long-context rate **per LLM call** using `input + cacheRead + cacheWrite`. You don't send anything. The agent's [Transactions](/docs/agent-transactions#tx-transactionlist) list its AI usage as `ai-usage` rows, each with its model and its tokens and cost by kind; when Wiro measures the agent's model calls itself, one row covers every call billed since the last row, of one turn or several (see [Rows that cover several model calls](/docs/agent-transactions#metered-token-rows)). Per-turn token counts and cost also ride on each assistant message (`inputtokens` / `outputtokens` / `cachereadtokens` / `cachewritetokens` / `totaltokens` / `tokencost` / `model`, with `tokencost` in cents, see [Agent Messaging](/docs/agent-messaging)).

AI usage comes from the plan's included usage for the period first, then from the balance. A new turn needs an active plan, and included usage left or a balance of at least $0.50. When the included usage is used up and the balance is under $0.50, the agent pauses: [`POST /UserAgent/Message/Send`](/docs/agent-messaging#post-useragentmessagesend) and [`POST /UserAgent/Start`](#post-useragentstart) are refused with code `97` until funds are added or the plan renews (see [AI Usage and the Balance](#ai-usage-and-the-balance)).

> **Voice realtime audio is billed separately.** Live voice-call audio (for agents with Voice Receptionist Rules, `util-voice-receptionist`) is **not** the agent's AI usage. It is billed to the wallet of the agent's Wiro project (the `wiro` credential, see [The agent's Wiro project](/docs/agent-credentials#the-agents-wiro-project)). The voice-prep turn before the call and the post-call text turn are AI usage like any other turn.

### Live Pricing Preview

Before you deploy, change the plan or change skills, call [`POST /UserAgent/PricingPreview`](#post-useragentpricingpreview). It writes nothing and returns the three plans under `plans` and `tiers`, the `tokenRates`, and `enabledSkills` with every transitive `depends_on` resolved. For an agent with an active plan it also returns `planChange`: what a different `tier` would charge now and when it starts. A skill change has no price, so its `planChange` shows no charge.

### Fields Kept for Older Clients

Before agents were billed in dollars, these fields counted credits. They still come back for older clients, but they are deprecated and will be removed: don't build on them, and read the fields on the right instead.

| Deprecated | Where | Read instead |
|------------|-------|--------------|
| `monthlycredits`, `renewalcredits`, `usedcredits`, `remainingcredits` | Agent rows: `Deploy`, `MyAgents`, `Detail`, `Update`, `Cover`, `PinnedAgents` | [`usage`](#usage-object): `includedusd`, `renewalusd`, `usedusd`, `leftusd` |
| `extracredits`, `extracreditsexpiry` | Agent rows | Nothing: an agent has no balance of its own |
| `credits` in `tiers`, `monthlyCredits` in `plans` | Catalog, agent rows, `PricingPreview` | `includedUsageUsd` in `plans` |
| `extracreditpacks` | `Agent/List` rows, `Agent/Detail`, `agent` on agent rows | Nothing: it is always `[]` |
| Credit counts in plan answers, such as `totalMonthlyCredits`, `creditsNow`, `creditsThisPeriod`, `creditsFromRenewal`, `newMonthlyCredits` and `monthlycredits` | `PricingPreview`, `SkillsApply`, `UpgradeTier`, `CreateSubscriptionCheckout`, `RenewSubscription` | The answer's USD fields, and `usage` on `Detail` once the change is made |
| `remainingcredits` | `agent_usage_report` frames, `token_usage` log events | `usage` on `Detail` |
| `agentbalance` | The `Message/Send` refusal for AI usage | `agentusage` |
| `transactions`, `total` and the credit counts of `summary` | [`TransactionList`](/docs/agent-transactions#tx-transactionlist) | `rows`, `rowstotal` and the dollar fields of `summary` |

## Agent Lifecycle

Deploying and running an agent follows this flow:

1. **Browse**: call `POST /Agent/List` to discover available agents in the catalog
2. **Deploy**: call `POST /UserAgent/Deploy` with `useprepaid: true` and `tier` (`"starter"`, `"pro"` or `"max"`). The plan's price is taken from your Wiro balance immediately and a 30-day subscription row is created.
3. **Configure**: connect the services the agent works with through [Agent Connectors](/docs/agent-connectors) (`POST /UserAgent/ConnectorConnect`; a template's `suggestedconnectors` on [`Agent/Detail`](#post-agentdetail) lists the ones it works with), set optional Telegram, Slack, or Discord credentials with `POST /UserAgent/CredentialUpsert`, connect the Wiro project the agent runs models with using `POST /UserAgent/CredentialProjectBind`, and set preferences with `POST /UserAgent/CustomSkillUpsert`. An agent admin can also approve the setup cards the agent proposes in its chat (see [Setup From Chat](/docs/agent-messaging#setup-from-chat)). See [Agent Credentials](/docs/agent-credentials) for details
4. **Start**: the prepaid Deploy already queued the agent, and Wiro starts it. Call `POST /UserAgent/Start` only for a stopped (status `0`) or errored (status `5`) agent
5. **Running**: the agent starts and becomes available for conversation
6. **Chat**: send messages via `POST /UserAgent/Message/Send`. See [Agent Messaging](/docs/agent-messaging) for the full messaging API

## UserAgent Statuses

Every deployed agent instance has a numeric status that reflects its current state:

| Status | Name | Description |
|--------|------|-------------|
| `0` | Stopped | Agent is not running. Call Start to launch it. |
| `1` | Stopping | Agent is shutting down. After a stop, wait for it to reach Stopped before taking action. During a [restart](#automatic-restart), it goes on to Queued and Starting by itself. |
| `2` | Queued | Agent is queued and waiting to start. |
| `3` | Starting | The agent is starting up. |
| `4` | Running | Agent is live and ready to receive messages. |
| `5` | Error | Agent encountered an error during execution. Call Start to retry. |
| `6` | Setup Required | The agent has no plan yet: it was deployed without `useprepaid: true`, and nothing was charged. Pay its plan with [`CreateSubscriptionCheckout`](#post-useragentcreatesubscriptioncheckout) (`useprepaid: true`), which queues it (status `2`). Credentials and connectors never hold an agent here. An agent that has never had a plan and has never started is deleted about an hour after Deploy. |

### Automatic Restart

When you mutate an agent's configuration while it is **starting** (status `3`) or **running** (status `4`), the system automatically triggers a restart cycle: the agent is moved to **Stopping** (status `1`) and flagged to restart. Once the agent fully stops, the system automatically re-queues it, applying the new configuration on startup.

This means you can update credentials, toggle skills, or change a custom skill on a running agent without manually stopping and starting it.

These calls restart a starting or running agent when they change something: `CredentialUpsert`, `CredentialFileUpload`, `CredentialProjectBind` (when the project changes), the connector calls `ConnectorConnect`, `ConnectorSetAccounts` and `ConnectorDisconnect` and a connector's sign-in when it comes back (see [Agent Connectors](/docs/agent-connectors#restarts)), `SkillsApply`, `SkillToggle`, `CustomSkillUpsert` (a new custom skill or scheduled task, a new `interval`, an `enabled` change, or a change to `cs-approval-policy`), `CustomSkillRename`, `CustomSkillDelete`, `CustomSkillRevert`, `UpdateSettings` (a new time zone, Chat Mode, model, slash-command list or Wiro API path list, or turning `chatsetup` on or off), `Update` (a changed `title`, or a body that names no field), and a setup card applied from chat (see [Setup From Chat](/docs/agent-messaging#setup-from-chat)). [`ResetBrowser`](#post-useragentresetbrowser) restarts a starting or running agent every time: the browser is reset as the agent starts again. A restart takes about a minute. A change saved while a restart is still stopping or queued loads with that restart instead of starting another one.

**Connectors restart the agent when the connection changes.** A connect that saves new values or tokens, a new account selection and a disconnect of a connected connector answer `restart: "scheduled"` on a running agent; the same values sent again answer `applied: 0` and restart nothing. A sign-in restarts the agent when it comes back to your `redirecturl` with `connector_connected=true`.

A change to only the text or description of an existing custom skill or scheduled task, through `CustomSkillUpsert` or a setup card, reaches a running agent right away, without a restart. These never restart a running agent: a plan change, a renewal or a cancellation, moving `chatsetup` between `"all"` and `"webchat"`, a `screen` change through `UpdateSettings`, and a description, categories or cover edit through `Update`.

## Screen and Take Control

Every agent has its own computer in the cloud: a 1920 x 1080 desktop that holds the agent's web browser, where its browser and desktop tools do their work. In the Wiro panel, the people who manage an agent can open its **Screen** beside the chat and watch that computer live while the agent works. The owner of a personal agent that has never been in a team, or whose browser was reset after it last left one, can also press **Take Control** and use the keyboard and mouse there, for example to sign in to a site for the agent or to finish a step by hand.

The Screen opens in the Wiro panel at [wiro.ai/panel/agents](https://wiro.ai/panel/agents) for people signed in there, and in your own product through the API: your backend asks for it with your project API key through [`ScreenInfo`](#post-useragentrealtimescreeninfo) and [`ScreenStart`](#post-useragentrealtimescreenstart), and your page shows it, Take Control included (see [Screen in Your Own App](#screen-in-your-own-app)). Chats in Telegram, Slack and Discord never show it. The `screen` setting on [`UpdateSettings`](#post-useragentupdatesettings) and [`Detail`](#post-useragentdetail) turns it off or on for an agent, and the agent's [activity log](#screen-in-the-activity-log) records who watched and who took control. [`ResetBrowser`](#post-useragentresetbrowser) signs the agent's browser out of every site, which is also how an agent that was in a team gets Take Control back (see [Resetting the Browser](#resetting-the-browser)).

### Who Can Watch

| Agent | Who can open its Screen |
|-------|-------------------------|
| Personal agent | Its owner, the person who deployed it. |
| Team agent whose Chat Mode is `"collaborative"` | The agent's owner, while they are in the team, and the team's admins. The organization owner is an admin of every team they create. Other members can't open it. |
| Team agent whose Chat Mode is `"private"` | Nobody. One computer shows the work of every chat, so the Screen stays closed to the whole team. |
| Any of these, through a project API key | The key's owner, the person who created the key's project, on the agents that person can open above. A team project's key opens only that team's agents. Your backend decides which of your users see it: see [Screen in Your Own App](#screen-in-your-own-app). |

In the Wiro panel, the **Screen** button sits in the agent's chat header. It shows only for these people, only while the agent is running (status `4`) and only while its `screen` setting is `"on"`. When the agent stops or restarts, an open Screen closes, and the button comes back once the agent runs again. Through the API, [`ScreenInfo`](#post-useragentrealtimescreeninfo) answers `available: true` under the same conditions.

### Screen in Your Own App

A product built on the API can show an agent's Screen in its own app, Take Control included. Your backend asks [`ScreenInfo`](#post-useragentrealtimescreeninfo) whether the Screen can open, gets a one-time ticket from [`ScreenStart`](#post-useragentrealtimescreenstart) with your project API key, and hands the ticket to your page, which opens the screen over a WebSocket and draws it with noVNC. [Screen and Take Control in Your App](/docs/agent-chat-integration#screen-and-take-control-in-your-app) walks through every step, with a complete example.

A call made with your API key acts as the key's owner, the person who created its project, under the rules above: it watches the agents that person can watch, and takes control only where that person can, on a personal agent they deployed that has never been in a team, or whose browser was reset after it last left one. A team project's key opens only that team's agents. Your key speaks for your whole product: Wiro gives it a ticket whichever of your users it is for, so what they see is up to you:

- **You decide who sees it.** Ask for a ticket only for the users you allow to watch that agent, and ask for Take Control (`control: true`) only for the users you allow to use its keyboard and mouse.
- **One computer shows every chat.** An agent has one computer and one browser for all of its chats. Its Screen shows what the agent is doing at that moment in any of them: each of your users' chats, its Telegram, Slack and Discord chats and its Scheduled Tasks, and the agent brings the tab it is working in to the front. On an agent several of your users share, whoever watches can see the others' work.
- **Take Control reaches every sign-in.** The person in control works in the agent's own browser, signed in wherever any of its chats signed in. What they sign in to there stays in that browser afterwards, where every chat of the agent can use it, your other users' chats included. While they have control, the agent's browser and desktop tools pause for every chat of the agent, not only theirs. Its other tools keep working, and a paused task goes on with that chat's next message or the task's next scheduled run (see [While You Have Control](#while-you-have-control)).
- **One agent per user keeps each screen to that user.** When each of your customers has an agent of their own, its Screen shows only that customer's work. On an agent many of your users talk to, show the Screen only to people who may see all of their work, or turn it off.
- **The `screen` setting is the switch.** `screen: "off"` on [`UpdateSettings`](#post-useragentupdatesettings), sent with the same API key by the agent's owner or a team admin, closes the Screen for everyone, your users and the Wiro panel alike, and ends open screens within about half a minute. `"on"` opens it again (see [Turning the Screen Off](#turning-the-screen-off)).
- **Keep your own record.** The activity log names your key's owner for every screen your key opens, never your users (see [Screen in the Activity Log](#screen-in-the-activity-log)), so note in your own product which of your users got each ticket.

### Watching the Screen

- On the agent's page, **Screen** opens the screen beside the chat when your browser window is wide, and inside the expanded chat when it is narrower. On a phone, tap **Open Agent Chat**, then **Screen** in the **Chat** / **Screen** switch.
- A pinned agent's chat window in the dock has the same button, which opens the screen in a mini window.
- **Pop Out** moves the screen into a mini window that floats over the page; drag it by its header. **Put Back** returns it beside the chat. **Expand Screen** makes it fill the expanded chat, with the chat in a mini window of its own, and **Collapse Screen** undoes that. **Close** ends the session.
- Leaving the agent's **Chat** tab moves an open screen into its mini window, so the session goes on.
- A browser tab holds one Screen per agent: opening the same agent's screen somewhere else in the tab, such as on its page and in its dock window, closes the first one. Other tabs and devices open screens of their own.

The screen opens in **View Only**: "View only. Your clicks and keys are not sent." Everyone watching sees the same screen at the same moment, including what a person in control does. While someone watches and nobody has control, the browser tab the agent just used comes to the front, so you see the page it is working on.

**Zoom.** Zooming changes only your view; the agent's screen stays 1920 x 1080. The bar under the screen ends with **Zoom Out**, the zoom level (**Fit** or a percentage) and **Zoom In**, in every view but the mini window, which always fits. **Zoom In** and **Zoom Out** step between Fit and the levels above it among 50%, 75%, 100%, 150% and 200%; when Fit is already 100% or more, the top level is twice Fit. At 100% one pixel of the agent's screen is one pixel of yours. The level button switches between Fit and 100%, or between Fit and twice Fit when Fit is already 100% or more. You can also zoom these ways:

- Ctrl or Cmd with the scroll wheel, or a pinch on a trackpad, zooms at the pointer. This works in control too, outside the mini window, and none of it reaches the agent.
- A double-click does what the level button does, at the pointer: in View Only, and in control while **Move View** is on.
- In View Only, click the screen or Tab to it, then press `+` or `=` to zoom in, `-` to zoom out, and `0` or Esc to fit.
- On a touch screen in View Only, pinch with two fingers, or double tap to do what the level button does, at that spot.

**Moving around.** A zoomed screen shows scrollbars, which move the view in every mode. In View Only you can also drag it, turn the scroll wheel, press the arrow keys or move it with one finger; at Fit the wheel and your finger scroll the page instead. In control, use **Move View** (see [Take Control](#take-control)). Each view keeps its own zoom through Take Control, Hand Back and reconnects, and goes back to Fit when you close the screen or open another agent.

### Take Control

Only the owner of a personal agent that has never been in a team, or whose browser was reset after it last left one, can take control of its computer: in the Wiro panel, or in your own app with an API key of one of their personal projects (see [Screen in Your Own App](#screen-in-your-own-app)). It works at any screen size, phones included. Everyone else who can watch keeps **View Only**, and the **Take Control** button doesn't show for them.

- **Team agents.** Nobody can take control of a team agent, its owner and the team's admins included: its one browser is shared by the whole team, signed in wherever the members' chats signed in. They can still watch while its Chat Mode is `"collaborative"`.
- **Agents that have been in a team.** An agent that was in a team doesn't get Take Control after it moves back to a personal workspace or returns there because its team or organization was deleted: its browser may still hold team members' sign-ins. Its owner can still watch, and gets Take Control back by resetting the agent's browser once it is personal (see [Resetting the Browser](#resetting-the-browser)).

To take control:

1. With the screen **Live**, press **Take Control**. The panel asks first: "Take control of the agent's computer?", followed by "Control lasts up to 15 minutes. The agent's browser and desktop tools pause until you hand back. The session is noted in the agent's activity log." Press **Take Control** again to go ahead, or **Cancel**.
2. The screen switches to control. It gets an amber frame, its header shows **You Have Control** when there is room, and the bar under it shows how long you have had control against the limit, such as `4:10 / 15:00`.
3. Your clicks, keys, scrolling and touches now reach the agent's computer.
4. Press **Hand Back** when you're done. The agent's browser and desktop tools work again at once, and the screen goes back to **View Only**. Closing the screen or the browser tab ends control too.

**Keyboard.** In control every key goes to the agent's screen, Tab and Esc included. Press Esc twice quickly to move keyboard focus out of the screen, onto **Hand Back**; the first Esc still reaches the agent. On a phone, or a tablet without a mouse, **Keyboard** in the bar under the screen brings up the device's keyboard. What you type there goes to the agent's screen, and text you paste into it is typed in.

**Touch.** In control, with Move View off, a tap clicks, a two-finger tap or a long press right-clicks, a three-finger tap middle-clicks, a one-finger drag drags, a two-finger drag scrolls, and a pinch zooms the page on the agent's screen. Use the zoom buttons to zoom your own view.

**Move View.** When you zoom in during control, **Move View** appears next to the zoom buttons. While it is on, dragging, the wheel, a finger or a pinch moves or zooms your view and none of it reaches the agent; keys still do. It turns itself off at Fit and when control ends.

**One session at a time.** Taking control in another tab or on another device moves control there, and the first screen goes back to watching with "Control was taken somewhere else. You're watching again." Everyone else watching keeps **View Only**.

**Not during a capture.** Take Control doesn't start while the agent is capturing its screen or a browser tab, for example to take a screenshot. Watching is not affected.

When Take Control can't start, the screen stays as it was and a notice under its header says why:

| Notice | Why |
|--------|-----|
| "Take Control can be started 6 times an hour on this agent. Try again in 12 minutes." | The hourly start limit (see [Screen Limits](#screen-limits)). The wait is the time until the oldest of the 6 starts is an hour old. |
| "The agent is capturing its screen right now. Try again in a minute." | The agent is taking a screenshot or otherwise capturing its screen or a tab. |
| "The agent's screen is not answering right now. Try again in a minute." | The agent's computer didn't answer in time. |
| "The agent's screen could not be checked. Try again in a moment." or "Take Control could not start just now. Try again in a minute." | A check before control could not finish. Try again. |
| "You can't take control right now." | The panel got no answer, for example because your connection dropped. Try again. |
| "Too many screen sessions started. Try again in a few minutes." | You started 30 screen sessions in 10 minutes. |
| "Take Control is off for team agents: their browser is shared by the whole team." | The agent is in a team. |
| "Take Control is off for an agent that was used in a team, because its browser may still hold team members' sign-ins." | The agent has been in a team, and its browser hasn't been reset since it left. Reset its browser to get Take Control back (see [Resetting the Browser](#resetting-the-browser)). |
| "Take Control is not available for this agent right now." | Take Control can't be used on this agent at the moment. Watching still works. |

### While You Have Control

- From the moment control starts until it ends, the agent's browser and desktop tools pause: the agent starts no new browser or desktop step. The rest of the agent keeps running: it answers chats in every channel, its Scheduled Tasks run, and its other tools and Connectors work.
- The agent isn't interrupted when you take control. If it reaches for its browser or desktop meanwhile, the call is refused with a message that a person has control of the computer, which asks the agent not to retry in that turn and to tell whoever it is talking to that it will continue once control is handed back. The message names no one and doesn't mention Wiro, so the agent can pass it on in any channel.
- When control ends and no other session holds it, each chat whose browser or desktop call was refused gets one note: control is back and the tools work again. The agent reads it at the start of that chat's next turn, when the chat's next message comes in, and can pick up the paused task then. In the Wiro web chat and in chats through your own app, the note waits up to 6 hours. The note starts no turn of its own, so it uses no AI usage by itself; that next turn is billed as usual. A chat that didn't reach for those tools gets no note. Neither does a Scheduled Task run: a run whose browser or desktop call was refused ends without that step, and the task runs again at its next scheduled time.
- You work in the agent's own browser, the one all of its chats use, signed in wherever they signed in. What you sign in to or change there stays in the agent's browser after you hand back, and the agent can use it.

**The agent's browser.** For safety, it saves no passwords and fills in no addresses or payment cards, the browser itself can't be signed in to an account or synced, and its settings pages, developer tools and local files stay closed. Signing in to websites works as usual. The desktop holds only the browser; if you close its last window, it opens again by itself within about 15 seconds. Your clipboard stays on your device, and on a phone or tablet, text you paste into **Keyboard** is typed in.

### When Control Ends

Control ends when you press **Hand Back** or close the screen, and on its own in the cases below. The agent's browser and desktop tools work again at once, unless control moved to another tab or device: then they stay paused until that session ends too.

| Why control ended | What you see |
|-------------------|--------------|
| 15 minutes in control | "This session reached its time limit" with **Reconnect**. Reconnect opens View Only; take control again to go on. |
| 2 minutes without keyboard or mouse input | View Only, with "Control was handed back after a while without keyboard or mouse input." |
| Someone took control in another tab or on another device | View Only, with "Control was taken somewhere else. You're watching again." |
| Input arrived faster than a person types or moves the mouse | View Only, with "Too much keyboard and mouse input arrived at once." |
| The browser sent input the agent's screen doesn't accept | View Only, with "The browser sent input the screen does not accept." |
| Take Control stopped applying to you on this agent | View Only, with "You can no longer control this agent's computer." Take Control stays hidden. |
| A capture began just as control was starting | View Only, with "The agent is capturing its screen right now. Try again in a minute." |
| The agent stopped or restarted, a settings change that restarts it included | The screen closes and the **Screen** button hides until the agent runs again. |
| Screen was turned off in the agent's settings | The screen closes and the **Screen** button hides. |
| Your connection dropped | The panel tries once more by itself, in control again, then offers **Reconnect**, which opens View Only. |
| The agent's computer closed the connection | "The agent's desktop closed the connection" with **Reconnect**. |

**Idle end.** Control counts as idle while no key press, click, touch or mouse movement reaches the agent. Moving the mouse over the screen counts, and so does any key; changes on the screen itself don't. With **Move View** on, your mouse and fingers don't reach the agent, so only keys keep control. For the last 30 seconds the bar under the screen counts down: "Control hands back in 0:30 without input. Move the mouse, tap or type to keep it." With Move View on it reads "Control hands back in 0:30 without input. Press a key or turn Move View off to keep it." Any input that reaches the agent clears it.

### Screen Limits

| Limit | Value |
|-------|-------|
| Screens open on one agent at once, watching and control together; each browser tab or device counts, and so does each screen an app opens with an API key | 4 |
| One watching session | 30 minutes |
| One Take Control session, from when control starts | 15 minutes |
| Control without keyboard or mouse input | 2 minutes, counted down for the last 30 seconds |
| Take Control starts on one agent | 6 in any hour |
| Screen sessions one person starts, on all agents together | 30 in 10 minutes |
| Screen sessions started on one agent with API keys of one owner, for all of an app's users together | 30 in 10 minutes |

- When 4 screens are open on an agent, another one is refused with "4 people are watching this agent's screen. Try again in a minute."
- After 30 minutes a watching session ends with "This session reached its time limit"; **Reconnect** starts a new one.
- The 6 Take Control starts are counted per agent over a rolling hour. Watching doesn't count, and neither does a start refused with one of the notices above. A reconnect isn't counted either: a start while your control session on the agent is still open in another tab, or within 2 minutes after your control session's connection dropped because the browser tab closed or reloaded, the network went away, or the agent's computer closed the connection or didn't answer. That covers the panel's own retry after a dropped connection. A start within 2 minutes after a control start that was closed before the agent's screen answered, with **Hand Back** or by the panel giving up after 20 seconds, is a reconnect too, since you never had control. After any other end, such as **Hand Back**, closing the screen, the idle end or the time limit, your next start counts, even within 2 minutes of an earlier dropped connection. A start that ends at once because a capture began just then (see [When Control Ends](#when-control-ends)) is counted, and so is the next one. The seventh start in an hour is refused with the hourly notice above, which says how long to wait.
- Every screen the panel starts counts toward a person's 30 in 10 minutes: opening the Screen, **Reconnect**, each **Take Control** (also one refused for a capture or the hourly limit), the panel's own retry after a dropped connection, and the View Only screen it opens when control ends. Past that, a new one is refused until the 10 minutes are over.
- With a project API key, every [`ScreenStart`](#post-useragentrealtimescreenstart) your backend makes on an agent counts toward the 30 in 10 minutes that your key owner's API keys share on that agent, whichever of your users a screen is for: each ticket, and each start refused for too many viewers, a capture, a computer that doesn't answer or the hourly limit. Those keys also have their own reconnect window, which works as above and is kept apart from the owner's sessions in the Wiro panel. All of your users share it: one of them taking control while another one's control session from those keys is still open, or within 2 minutes after its connection dropped, is a reconnect. A control session the owner has open in the Wiro panel doesn't make it one.

### Screen in the Activity Log

Three [who-did-what rows](/docs/agent-logs#who-did-what-rows) in the agent's activity log record the Screen:

| `kind` | `title` | When |
|--------|---------|------|
| `AGENT_SCREEN_VIEWED` | `Watched the agent's screen` | Someone opened the Screen. At most one row per person and agent an hour. |
| `AGENT_SCREEN_CONTROLLED` | `Took control of the agent's screen` | Someone took control. At most one row per person and agent every 10 minutes. |
| `AGENT_SCREEN_CONTROL_ENDED` | `Control of the agent's screen ended after 4 minutes 10 seconds: handed back` | A Take Control session ended. One row for every session. |

`userUuid` and `user` name the person. The first two rows carry no `summary`, unless an API key opened the screen (see below). `AGENT_SCREEN_CONTROL_ENDED` carries `summary: { seconds, reason }`: how long control lasted, in seconds from when it started, and why it ended:

| `reason` | The title ends with | When |
|----------|---------------------|------|
| `hand_back` | `handed back` | **Hand Back**, or the screen was closed in the panel. |
| `time_limit` | `the time limit was reached` | 15 minutes in control. |
| `idle` | `no keyboard or mouse input for a while` | 2 minutes without input. |
| `disconnect` | `the connection closed` | The tab closed, the connection dropped, or the agent's computer closed the connection. |
| `taken_over` | `control was taken in another session` | Someone took control in another tab or on another device. |
| `access_lost` | `access to the agent's screen ended` | Screen was turned off in the agent's settings, or Take Control stopped applying to the person. |
| `agent_stopped` | `the agent stopped` | The agent stopped or restarted. |
| `input_refused` | `the screen refused the browser's input` | Input arrived too fast, or the screen didn't accept it. |

```json
{
  "ts": "2026-11-19T18:24:10.000Z",
  "kind": "AGENT_SCREEN_CONTROL_ENDED",
  "title": "Control of the agent's screen ended after 4 minutes 10 seconds: handed back",
  "ok": true,
  "summary": { "seconds": 250, "reason": "hand_back" },
  "userUuid": "ada-uuid",
  "user": {
    "uuid": "ada-uuid",
    "firstname": "Ada",
    "lastname": "Lovelace",
    "email": "ada@example.com",
    "username": "ada",
    "avatar": "https://cdn.wiro.ai/avatars/ada.webp",
    "avatarinitials": "AL"
  }
}
```

Read the rows in the panel under the agent's **Logs**, which its owner and the team's admins can open, or with [`POST /UserAgent/Logs`](/docs/agent-logs#logs-tail) and `LogsFile`, which also take an API key (`LogsList` lists the days that have rows). The owner's Account Activity page at [wiro.ai/panel/account/activity](https://wiro.ai/panel/account/activity) lists them too, by `kind`. A change to the `screen` setting writes an `AGENT_SETTINGS_UPDATED` row: `Agent settings updated: screen off` or `screen on`. A browser reset writes an `AGENT_BROWSER_RESET` row: `Agent browser reset` (see [Resetting the Browser](#resetting-the-browser)).

**With a project API key.** A screen your app opens with a key adds the same rows, named after the key's owner, the person who created its project, whichever of your users it was for. All of your users count as one: on each agent, a project's key writes at most one `Watched the agent's screen` row an hour and one `Took control of the agent's screen` row every 10 minutes, apart from the rows the owner's own sessions in the Wiro panel write. Those two titles end with `(API key "<project name>")` and carry `summary: { "project": "<project name>" }`, or end with `(via API key)` for a personal project's key on a team agent. `AGENT_SCREEN_CONTROL_ENDED` names the key's owner too: its title ends with `(via API key)`, never with the project name, and its `summary` stays `{ seconds, reason }`. Keep your own record of which of your users got each ticket (see [Screen in Your Own App](#screen-in-your-own-app)).

### Turning the Screen Off

The Screen is on for every agent by default. The agent's owner or a team admin turns it off with the **Screen** switch on the agent's **Settings** tab, or by sending `screen: "off"` to [`UpdateSettings`](#post-useragentupdatesettings) with a signed-in session or a project API key. Off closes the Screen for everyone, in the Wiro panel and in every app that shows it: nobody can watch or take control, the **Screen** button hides, [`ScreenInfo`](#post-useragentrealtimescreeninfo) answers `reason: "setting_off"`, [`ScreenStart`](#post-useragentrealtimescreenstart) is refused with code `94`, and screens that are open, a Take Control session included, close within about half a minute. Turning it back on brings the button back. A change never restarts the agent, and `null` goes back to `"on"`. Read the value as `screen` on [`Detail`](#post-useragentdetail).

On a team agent whose Chat Mode is `"private"`, the Screen stays closed to the team whatever `screen` says, and the **Settings** tab says so.

### Resetting the Browser

The agent's browser keeps every sign-in made there, by the agent's chats and by people in control. **Reset Browser** signs it out of every site: the agent's whole browser profile is deleted, with its sign-ins, cookies, history and saved site data, and the agent restarts with a fresh browser. Its files, memory and Connectors stay as they are.

The agent's owner or a team admin resets it with **Reset Browser** in the **Browser** row of the agent's **Settings** tab, under **Screen**, or with [`ResetBrowser`](#post-useragentresetbrowser). The button works while the agent is starting or running; otherwise the row says "Start the agent to reset its browser." The panel asks first: "Reset this agent's browser?", followed by "The browser is signed out of every site, and its history and saved site data are cleared. The agent restarts. Connectors stay connected." Press **Reset Browser** there to go ahead. The panel then shows "Browser reset. Agent restarting…", and the agent runs again in about a minute. Each reset adds an `AGENT_BROWSER_RESET` row, `Agent browser reset`, to the agent's activity log, with who did it.

**Getting Take Control back.** A reset is how an agent that was in a team gets [Take Control](#take-control) back. Reset its browser once the agent is in its owner's personal workspace; when it runs again, its owner can take control. A reset made while the agent was still in a team doesn't count once it leaves, and moving it into a team again turns Take Control off until the next reset.

## Endpoints

### Browse the Catalog

#### **POST** /Agent/List

Lists available agents in the catalog. This is a **public endpoint**, so no authentication is required.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `search` | string | No | Full-text search across agent titles and descriptions |
| `category` | string | No | Filter by category (e.g. `"productivity"`, `"social-media"`) |
| `sort` | string | No | Sort column: `id`, `title`, `slug`, `status`, `createdat`, `updatedat`. Default: `id` |
| `order` | string | No | Sort direction: `ASC` or `DESC`. Default: `DESC` |
| `limit` | number | No | Results per page (max 1000). Default: `20` |
| `start` | number | No | Offset for pagination. Default: `0` |

##### Response

```json
{
  "result": true,
  "errors": [],
  "total": 12,
  "agents": [
    {
      "guid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "title": "Instagram Manager",
      "slug": "instagram-manager",
      "headline": "Automate your Instagram presence with AI",
      "description": "An autonomous agent that manages your Instagram account...",
      "cover": "https://cdn.wiro.ai/uploads/agents/instagram-manager-cover.webp",
      "categories": ["social-media", "marketing"],
      "samples": ["https://cdn.wiro.ai/uploads/agents/instagram-manager-sample-1.webp"],
      "tiers": {
        "starter": { "priceUsd": 5 },
        "pro":     { "priceUsd": 30 },
        "max":     { "priceUsd": 100 }
      },
      "status": 1,
      "createdat": "1711929600",
      "updatedat": "1714521600"
    }
  ],
  "plans": [
    { "key": "starter", "title": "Starter", "priceUsd": 5,   "includedUsageUsd": 5,   "diskMb": 250 },
    { "key": "pro",     "title": "Pro",     "priceUsd": 30,  "includedUsageUsd": 30,  "diskMb": 500 },
    { "key": "max",     "title": "Max",     "priceUsd": 100, "includedUsageUsd": 100, "diskMb": 1024 }
  ]
}
```

> `Agent/List` returns the catalog fields plus inlined `tiers`, so a catalog card can show the price without a per-row `Agent/Detail` call. The top-level `plans` lists the three plans in order with their names (`key`, `title`, `priceUsd`, `includedUsageUsd`, `diskMb`), the same for every agent. Call `POST /Agent/Detail` with `type: "full"` when you need the full template (skills map, credential schema, custom skills, scheduled tasks).

#### **POST** /Agent/Detail

Retrieves details for a single agent by guid or slug. This is a **public endpoint**, so no authentication is required.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `guid` | string | No* | Agent guid. |
| `slug` | string | No* | Agent slug (e.g. `"instagram-manager"`). |
| `type` | string | No | Pass `"full"` to also include `customskills` (the template's strategies a deployer can edit) and `scheduledskills` (every scheduled task) in the response. Each row: `{ key, value, description, interval, enabled, requires_credentials, requires_connectors, _editable }`. `requires_connectors` lists the Connectors a scheduled task needs, by catalog slug (one connected runs it), and `requires_credentials` the channels and settings it needs. Without `type: "full"`, the response carries the catalog header + `tiers` + `plans` + `tokenRates` + `credentials` + `skills` + `skillsmeta` + `suggestedconnectors` + `communicationChannels` only (plus the deprecated `extracreditpacks: []`). |

> **Note:** You must provide either `guid` or `slug`. If both are provided, `slug` takes priority. Pass `type: "full"` when you need to preview custom skill keys and scheduled task cron expressions before deploying; omit it for a lightweight catalog detail call.

##### Response

```json
{
  "result": true,
  "errors": [],
  "agents": [
    {
      "guid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "title": "Instagram Manager",
      "slug": "instagram-manager",
      "headline": "Automate your Instagram presence with AI",
      "description": "An autonomous agent that manages your Instagram account...",
      "cover": "https://cdn.wiro.ai/uploads/agents/instagram-manager-cover.webp",
      "categories": ["social-media", "marketing"],
      "samples": ["https://cdn.wiro.ai/uploads/agents/instagram-manager-sample-1.webp"],
      "tiers": {
        "starter": { "priceUsd": 5 },
        "pro":     { "priceUsd": 30 },
        "max":     { "priceUsd": 100 }
      },
      "plans": [
        { "key": "starter", "title": "Starter", "priceUsd": 5,   "includedUsageUsd": 5,   "diskMb": 250 },
        { "key": "pro",     "title": "Pro",     "priceUsd": 30,  "includedUsageUsd": 30,  "diskMb": 500 },
        { "key": "max",     "title": "Max",     "priceUsd": 100, "includedUsageUsd": 100, "diskMb": 1024 }
      ],
      "tokenRates": {
        "default_model": "openai/gpt-5.6-sol",
        "fallback_rate": { "input_per_1m": 625, "output_per_1m": 3750, "cached_input_per_1m": 62.5, "cache_write_per_1m": 781.25 },
        "models": {
          "openai/gpt-5.6-sol": { "input_per_1m": 625, "output_per_1m": 3750, "cached_input_per_1m": 62.5, "cache_write_per_1m": 781.25, "selectable": true, "label": "GPT-5.6 Sol", "tier": "premium" },
          "openai/gpt-5.6-terra": { "input_per_1m": 250, "output_per_1m": 1500, "cached_input_per_1m": 25, "cache_write_per_1m": 312.5, "selectable": true, "label": "GPT-5.6 Terra", "tier": "balanced" },
          "openai/gpt-5.6-luna": { "input_per_1m": 25, "output_per_1m": 150, "cached_input_per_1m": 2.5, "cache_write_per_1m": 31.25, "selectable": true, "label": "GPT-5.6 Luna", "tier": "cheap" }
        }
      },
      "skills": ["util-social-posting-common", "util-anti-ai-human-copy"],
      "skillsmeta": {
        "util-social-posting-common": {
          "name": "util-social-posting-common",
          "title": "Social Posting Common Rules",
          "icon": "lni lni-share-2",
          "brand_color": "#3b82f6",
          "brand_text_color": "#ffffff",
          "brand_logo_filter": "brightness(0) invert(1)",
          "category": "util",
          "docs_url": "",
          "credential_key": null,
          "requires_credentials": false,
          "user_invocable": true,
          "deprecated": false,
          "replacement": null,
          "description": "Shared social manager rules: multi-platform posting orchestration, aspect ratio enforcement, caption compliance. Comes with content scanning and a Scheduled Task for Google Drive assets."
        },
        "util-anti-ai-human-copy": {
          "name": "util-anti-ai-human-copy",
          "title": "Anti-AI Human Copy",
          "icon": "lni lni-spellcheck",
          "brand_color": "#6366f1",
          "brand_text_color": "#ffffff",
          "brand_logo_filter": "brightness(0) invert(1)",
          "category": "util",
          "docs_url": "",
          "credential_key": null,
          "requires_credentials": false,
          "user_invocable": true,
          "deprecated": false,
          "replacement": null,
          "description": "Tone and craftsmanship rules for content-producing agents: banned generic words, sentence rhythm, copula/filler discipline, read-aloud test."
        }
      },
      "suggestedconnectors": ["instagram"],
      "credentials": {
        "telegram": {
          "optional": true,
          "extra": false,
          "_editable": { "bottoken": true, "allowedusers": true, "groups": true },
          "_schema": {
            "title": "Telegram",
            "icon": "https://wiro.ai/images/icons/skills/telegram.svg",
            "brand_color": "#24a1de",
            "brand_text_color": "#ffffff",
            "brand_logo_filter": "brightness(0) invert(1)",
            "docs_url": "integration-telegram-skills",
            "credential_mode": "api_key",
            "channel": {
              "id": "telegram",
              "plugin": "telegram",
              "required_fields": ["bottoken", "allowedusers"],
              "capabilities": { "direct": true, "rooms": true, "threads": true, "roles": false, "command_menu": true }
            },
            "fields": [
              { "key": "bottoken", "label": "Telegram Bot Token", "type": "password", "required": true, "show_toggle": true },
              { "key": "allowedusers", "label": "Allowed Telegram DM User IDs", "type": "string-array", "required": true },
              { "key": "groups", "label": "Allowed Telegram Groups", "type": "object-array", "required": false }
            ]
          }
        }
      },
      "status": 1,
      "createdat": "1711929600",
      "updatedat": "1714521600"
    }
  ]
}
```

> `suggestedconnectors` lists the connectors the template works with, by their catalog slugs, such as `instagram`. Nothing connects by itself: after Deploy, connect each one you want with [`ConnectorConnect`](/docs/agent-connectors#post-useragentconnectorconnect) (its fields and tools are on [`AgentConnector/Detail`](/docs/agent-connectors#post-agentconnectordetail)). A template's scheduled task that needs a connector stays off until that connector is connected, and a connector that isn't connected never holds the agent at status `6`.

> `Agent/Detail` describes the **template**, so its `credentials` block only carries the `optional` / `extra` meta flags (when the template sets them) plus the registry-driven `_schema` (field labels / types) and `_editable` map. It holds no saved values, whoever calls it and whatever `type` is sent. The `_connected` flag is per-instance and appears on `UserAgent/Detail` and the `Deploy` and `Update` responses, not on the catalog endpoint. `plans` lists the three plans with their names, prices and included AI usage, so a visitor sees them before deploying. A deployed agent's `UserAgent/Detail` carries the same list under `agent`.

**Credential response flags** (on `UserAgent/Detail` and the `Deploy` and `Update` responses): every credential object in the top-level `credentials` tree on the per-instance endpoints carries:

| Flag | Type | Meaning |
|------|------|---------|
| `_connected` | boolean | On a channel (Telegram, Slack, Discord), `true` once every field in its `required_fields` is filled. `false` on other credentials, where `_filled` and `_required_missing` tell the state; use `setuprequired` for overall setup readiness. A connector's state is its `status` on [`ConnectorList`](/docs/agent-connectors#post-useragentconnectorlist). |
| `optional` | boolean | `true` when the template marks this credential as not required for the agent to run. Agents can start even if `optional: true` credentials are empty. A credential nothing on the agent asks for reads `true`, with `extra: false`. |
| `extra` | boolean | `true` when the agent template marks this credential as an optional extra; the panel lists it after the required ones. |
| `_editable` | object | Map of `fieldname → true\|false` over the registry schema: `false` for a field the caller can't write (platform-managed or computed). |
| `_schema` | object | Inlined registry descriptor: `{ title, icon, brand_color, brand_text_color, brand_logo_filter, docs_url, credential_mode, channel, fields[] }`, where `channel` describes a communication channel and is `null` or absent on any other credential. Lets a UI render the form without a separate `Credentials/Detail` round-trip. Other keys are for Wiro's own panel: ignore them. |

**Field redaction in responses:**

- **Saved secrets read as a mask.** A field of type `password` (a bot token, an auth token or a password) reads `"••••••••"`, eight `•` characters, once a value is saved on the agent, and `""` while none is. This holds for every caller, the agent's owner and team admins included. A saved secret can't be read back with an API key, only replaced: send its new value with `CredentialUpsert`. A write that sends the mask back keeps the saved value (see [Field-level write rules](/docs/agent-credentials#field-level-write-rules)). `_connected`, `_filled` and `_required_missing` still count what is saved, and the agent receives the values as before. Other values, such as IDs, names, URLs and selections, show as saved, and so does `credentials.wiro.apikey`, the agent's project key.
- `fieldstatus: "platform"` fields (Wiro-managed fields) are stripped from every API response. `credentials.wiro.apikey` is an operator-supplied user-input field and appears in the response with `fieldstatus: "user"`, as saved.
- A value the agent template holds on a secret field (one Wiro stores encrypted, such as a token or password) is not returned: the field reads empty until you save your own. The agent still runs with the template's value, and the card's `_filled` and `_required_missing` count it. Values you save yourself come back to the agent's owner and team admins, each secret as the mask.
- Sentinel rows `_isoptional` / `_isextra`: never appear as fields; they're folded into the `optional` and `extra` flags above.

A plain member of the agent's team gets the same answer with each saved value replaced by `[present]` and each saved secret by the mask.

**Communication channel fields** are returned separately from the other
credentials:

| Field | Type | Meaning |
|-------|------|---------|
| `communicationChannels` | array | Full external-channel catalog for this instance. Each row includes `id`, `title`, `credentialkey`, `required_fields`, `capabilities`, `schema`, `enabled`, `configured`, and `missingfields`. Use `schema.fields` to render the setup form. `UserAgent/Detail`, `UserAgent/Update` and `UserAgent/Deploy` all carry it; `Agent/Detail` lists the same channels without `enabled`, `configured` and `missingfields`. |
| `enabledChannels` | string[] | External channel IDs whose registry-declared activation credentials are complete. Current values are `telegram`, `slack`, and `discord`. Web chat is always available and is not included. |
| `teamsessionmode` | string | The unified Chat Mode. `"private"` isolates team members' Wiro web-chat histories and agent memory plus approved external-channel DM operators; `"collaborative"` shares those histories and runtime contexts. Web and external-channel message lists remain separate transports. Room and thread conversations remain room-scoped. |

The catalog is registry-driven, so all agent templates and existing useragents
can discover new channels without adding template-specific rows. Availability
does not mean activation: an external channel turns on automatically only when
all of its `required_fields`, including immutable operator IDs, are complete.
Existing agents use the normal `CredentialUpsert` flow; there is no separate
channel switch.

### Deploy & Manage

All endpoints below require authentication.

#### **POST** /UserAgent/Deploy

Creates a new agent instance from a catalog template, **or** builds a brand-new custom agent (no template).

> **Agent plans are paid from your Wiro balance.** Pass `useprepaid: true` + `tier`. The plan's price is taken from the balance of the workspace you deploy into, and the instance is created server-side in one call. An agent plan has no card payment, in the dashboard or the API. Add funds to your balance under **Credit Balance** ([add funds](https://wiro.ai/panel/wallet/deposit/credit-card)) before calling Deploy: when the balance is short, Deploy is refused with code `97` and `neededusd` (see [Paying for Plans](#paying-for-plans)).

Prepaid deploy (`useprepaid: true` + `tier`) charges your wallet for the chosen plan's price immediately and inserts a 30-day subscription row (`plan: "agent"`, `provider: "prepaid"`). **Every fresh Deploy lands at `status: 6` first**. The row is then auto-queued to `status: 2` (Queued) once the prepaid subscription is provisioned. No manual `UserAgent/Start` is needed for prepaid deploys; Wiro starts the agent from the queue.

If you pass `credentials`, `skills`, or `customskills` at the top level of the
Deploy body they are applied server-side in the same call. Chat Mode is not a
Builder/Deploy input: team deploys start collaborative and personal deploys
start private, then owners can change the value with `UpdateSettings`. Complete
channel credential groups activate automatically. Arrays such as
`allowedusers`, Telegram `groups`, Slack `channels`, and Discord `guilds` are
validated against the public registry schema. See
[Agent Credentials → Communication Channels](/docs/agent-credentials#communication-channels)
for the channel contract.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `agentguid` | string | Conditional | The guid of the agent template from the catalog. Required unless `custom: true`. |
| `custom` | boolean | Conditional | Pass `true` to deploy a custom-built agent (no marketplace template). Mutually exclusive with `agentguid`. See [Agent Builder](/docs/agent-builder) for the full builder flow. |
| `title` | string | Yes | Display name for your instance. |
| `description` | string | No | Optional description (custom builds: free-text describing what the agent does). |
| `cover` | string | No | Optional cover image URL for this agent, on template deploys and custom builds alike. Without it `cover` stays `null`: show the template's `agent.cover` instead (a custom build has none). |
| `useprepaid` | boolean | Yes | Send `true`: the plan's price is paid from your Wiro balance in this call, and the agent is queued. Without it, Deploy still creates the agent and charges nothing: the agent stays at status `6` with no plan until [`CreateSubscriptionCheckout`](#post-useragentcreatesubscriptioncheckout) (`useprepaid: true`) pays it, and if it still has no plan about an hour after Deploy, it is deleted. |
| `tier` | string | No | The plan: `"starter"` (default, $5 a month, including $5 of AI usage a month), `"pro"` ($30, including $30) or `"max"` ($100, including $100). It sets the price taken from your balance at deploy time and the AI usage included each month. The param name is `tier`. Leave it out for Starter. Any other value is refused with `tier must be starter, pro or max`, and nothing is created or charged. |
| `credentials` | object | No | Inline credential groups for the channels, `twilio-voice`, `wiro` and the settings (the keys [`POST /Credentials/List`](/docs/agent-credentials#post-credentialslist) lists). If a communication-channel group is included, its matching `credentials[credential_key]` object must contain all channel `required_fields`; completeness activates that channel automatically. Any other key, a connector's slug included, fails Deploy before anything is created or charged, with `Unknown credential: <key>. Connect a connector after the deploy with UserAgent/ConnectorConnect.` |
| `skills` | object | No | Inline skill toggles `{ "skillname": true \| false }`. For custom builds this seeds the initial skill set; for template deploys it overlays the template defaults. Deploy turns on the Skills a Skill you turn on depends on (`depends_on`) by itself. Every name, on or off, must be a Skill that [`POST /Skills/List`](/docs/agent-skills#post-skillslist) lists: any other name fails Deploy before anything is created or charged, with `Unknown skill: <name>.`, and a name that starts with `int-` with `Unknown skill: <name>. Connectors are connected with UserAgent/ConnectorConnect, not turned on as skills.` |
| `customskills` | array | No | Inline custom skill rows. Each entry: `{ key, value?, interval?, enabled?, description?, _user_created? }`. A scheduled task's `interval` must be a schedule the agent can run, as in [`CustomSkillUpsert`](#post-useragentcustomskillupsert), and `"manual"` means no schedule. Otherwise Deploy fails before anything is created or charged, and the error starts with the skill's key. Up to 50 entries; add more with [`CustomSkillUpsert`](#post-useragentcustomskillupsert) once the agent is deployed. |
| `wiroapiallowedpaths` | string[] | No | The Wiro API endpoints this agent may call with its own Wiro project key, as rules in the format described under [`UpdateSettings`](#post-useragentupdatesettings). The list is saved before the agent first starts, so it applies from the first turn. An invalid list is rejected with `invalid-wiro-api-path-rule` and no agent is created. If the list can't be saved, no agent is created either and the call returns `Failed to save wiroapiallowedpaths`; deploy again. Omit it, or send `null`, for the default list described under [`UpdateSettings`](#post-useragentupdatesettings). |
| `chatsetup` | string | No | Setup From Chat: where people can change this agent's setup by approving setup cards in chat. `"all"` (the default) allows the Wiro web chat and messages sent with a project API key, `"webchat"` only the Wiro web chat, and `"off"` neither. Omit it, or send `null`, for `"all"`. Deploying an agent that people who must not change it will talk to, such as your customers' own users? Send `"webchat"` or `"off"`. Keep `"all"` when the people in your chats may change the agent, and decide in your own product who may approve: see [Agent Chat Integration](/docs/agent-chat-integration#who-may-apply-a-card). See [Setup From Chat](/docs/agent-messaging#setup-from-chat). |

**Headers:** Standard API authentication, with `x-api-key` for key-based projects, or `x-nonce` + `x-signature` for signature-based projects (see [Authentication](/docs/authentication)). To deploy into a team, use the credentials of a project that belongs to that team: the agent is created in the project's team, and the project's owner must be an admin of that team (otherwise code `97`). No extra header is needed.

> **Team agents**: every call runs in the workspace of the project behind your credentials; workspace headers sent with the request are ignored.
>
> | Endpoint | Team agents |
> |----------|-------------|
> | `UserAgent/Deploy` | A team project's credentials deploy into that team; the project's owner must be a team admin |
> | `UserAgent/Message/Send`, `Message/History`, `Message/Sessions`, `Message/DeleteSession`, `Message/RenameSession` | The project's workspace must match the agent's workspace |
> | `UserAgent/Message/Delete` | For team agents, the project's workspace must match the agent's workspace; it only hides messages sent by the project's owner |
> | `UserAgent/CancelSubscription`, `UserAgent/UpgradeTier`, `UserAgent/RenewSubscription`, `UserAgent/CreateSubscriptionCheckout`, `UserAgent/PricingPreview`, `UserAgent/SkillsApply`, `UserAgent/SkillToggle`, `UserAgent/CredentialProjectBind` | The project's workspace must match the agent's workspace |
> | `UserAgent/Message/Detail`, `Message/Cancel` | No workspace match; they only return or cancel messages sent by the project's owner |
> | `UserAgent/Detail` | No workspace match; the project's owner must own the agent or be a member of its team |
> | `UserAgent/Update`, `UserAgent/Start`, `UserAgent/Stop` | No workspace match; the project's owner must own the agent or be an admin of its team (plain members get code `97`) |
> | `UserAgent/Realtime/WebStart` | The project's owner must have deployed the agent. For a team agent, use that team's project key, or a key whose owner is still a member of the team |
> | `UserAgent/Realtime/ScreenInfo`, `UserAgent/Realtime/ScreenStart` | The project's owner must have deployed the agent or be an admin of its team. A team project's key opens only that team's agents, and a personal project's key a team agent only while its owner is still a member of the team; a team project's key for a personal agent or another team's agent is refused with code `96` |
> | `UserAgent/MyAgents` | Lists only the agents in the project's workspace |
>
> A mismatch returns `"This agent belongs to a team. Switch to the team context to access it."`, `"This agent is in your personal workspace. Switch to personal context to access it."` or `"This agent belongs to a different team."` Use a team project's key for team agents and a personal project's key for personal agents.

##### Request body: template deploy (recommended API pattern)

```json
{
  "agentguid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "title": "My Instagram Bot",
  "useprepaid": true,
  "tier": "starter"
}
```

##### Request body: custom build (Build Your Own Agent)

```json
{
  "custom": true,
  "title": "My Custom Sales Agent",
  "description": "Researches leads and posts a summary to Telegram each morning.",
  "useprepaid": true,
  "tier": "pro",
  "skills": {
    "util-chat-markdown-reporting": true,
    "util-anti-ai-human-copy":      true
  },
  "credentials": {
    "telegram": { "bottoken": "123456:ABC-DEF...", "allowedusers": ["123456789"] }
  }
}
```

> **Custom builds use the same plans.** There is no marketplace template behind a custom agent, and the skills you pick don't change the price. Connectors are connected after Deploy with [`ConnectorConnect`](/docs/agent-connectors#post-useragentconnectorconnect): a custom build pays the plan you pass in `tier`, like a template deploy. [`POST /UserAgent/PricingPreview`](#post-useragentpricingpreview) with `draft: true` resolves the skill set (with `depends_on`) and lists the plans before you call Deploy. Full walkthrough: [Agent Builder](/docs/agent-builder).

##### Template deploy vs custom build: what differs server-side

Both paths hit the same endpoint, but a few server-side behaviours diverge:

| Aspect | Template deploy (`agentguid`) | Custom build (`custom: true`) |
|--------|------------------------------|-------------------------------|
| Linked marketplace template | Snapshotted from the resolved template | None: no template back-reference |
| `categories` | Cloned from the agent template | `null` (custom agents have no marketplace categories) |
| `cover` | `null` unless you pass one; the template's cover shows through `agent.cover` | Optional: pass `cover` in the body if you want one |
| Bundled scheduled tasks | Cloned from the template's preset custom skills | Seeded from the Scheduled Tasks its skills bring |
| Onboarding placeholders | None: the template ships its own preset strategies | One invocation-only `cs-my-custom-strategy` and one scheduled `cs-cron-my-scheduled-task` are seeded so the panel always has something to render under "Custom Skills" / "Scheduled Tasks" |
| Platform-managed credentials | Set up by Wiro | Set up by Wiro |
| Marketplace run counter | Bumped by 1 | Not touched (custom agents have no template to count against) |

##### Response

```json
{
  "result": true,
  "errors": [],
  "useragents": [
    {
      "guid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
      "uuid": "your-user-uuid",
      "agentguid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "teamguid": null,
      "title": "My Instagram Bot",
      "description": null,
      "tier": "starter",
      "credentials": {
        "telegram": {
          "_connected": false,
          "optional": true,
          "extra": false,
          "_editable": { "bottoken": true, "allowedusers": true, "groups": true },
          "_schema": { "title": "Telegram", "credential_mode": "api_key", "channel": { "id": "telegram", "required_fields": ["bottoken", "allowedusers"] }, "fields": [ "..." ] },
          "bottoken": "",
          "allowedusers": [],
          "groups": []
        }
      },
      "skills": [
        { "name": "util-social-posting-common", "enabled": true, "_edited": false, "_user_created": false },
        { "name": "util-anti-ai-human-copy",    "enabled": true, "_edited": false, "_user_created": false }
      ],
      "customskills": [],
      "scheduledskills": [],
      "monthlypriceusd": 5,
      "creditperiod": "2026-05",
      "creditsyncat": null,
      "tokenRates": {
        "default_model": "openai/gpt-5.6-sol",
        "fallback_rate": { "input_per_1m": 625, "output_per_1m": 3750, "cached_input_per_1m": 62.5, "cache_write_per_1m": 781.25 },
        "models": {
          "openai/gpt-5.6-sol": { "input_per_1m": 625, "output_per_1m": 3750, "cached_input_per_1m": 62.5, "cache_write_per_1m": 781.25, "selectable": true, "label": "GPT-5.6 Sol", "tier": "premium" },
          "openai/gpt-5.6-terra": { "input_per_1m": 250, "output_per_1m": 1500, "cached_input_per_1m": 25, "cache_write_per_1m": 312.5, "selectable": true, "label": "GPT-5.6 Terra", "tier": "balanced" },
          "openai/gpt-5.6-luna": { "input_per_1m": 25, "output_per_1m": 150, "cached_input_per_1m": 2.5, "cache_write_per_1m": 31.25, "selectable": true, "label": "GPT-5.6 Luna", "tier": "cheap" }
        }
      },
      "agentModel": {
        "chatModel": "openai/gpt-5.6-sol",
        "cronModel": "openai/gpt-5.4-mini",
        "voicePrepModel": "openai/gpt-5.4-mini",
        "voicePostcallModel": "openai/gpt-5.4"
      },
      "communicationChannels": [
        { "id": "telegram", "credentialkey": "telegram", "title": "Telegram", "required_fields": ["bottoken", "allowedusers"], "capabilities": { "direct": true, "rooms": true, "threads": true, "roles": false, "command_menu": true }, "schema": { "title": "Telegram", "fields": [ "..." ] }, "enabled": false, "configured": false, "missingfields": ["bottoken", "allowedusers"] }
      ],
      "enabledChannels": [],
      "teamsessionmode": "private",
      "status": 2,
      "setuprequired": false,
      "pinned": true,
      "agent": {
        "guid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "title": "Instagram Manager",
        "slug": "instagram-manager",
        "cover": "https://cdn.wiro.ai/uploads/agents/instagram-manager-cover.webp",
        "categories": ["social-media", "marketing"],
        "tiers": {
          "starter": { "priceUsd": 5 },
          "pro":     { "priceUsd": 30 },
          "max":     { "priceUsd": 100 }
        },
        "plans": [
          { "key": "starter", "title": "Starter", "priceUsd": 5,   "includedUsageUsd": 5,   "diskMb": 250 },
          { "key": "pro",     "title": "Pro",     "priceUsd": 30,  "includedUsageUsd": 30,  "diskMb": 500 },
          { "key": "max",     "title": "Max",     "priceUsd": 100, "includedUsageUsd": 100, "diskMb": 1024 }
        ]
      },
      "createdat": 1714608000,
      "updatedat": 1714608000
    }
  ]
}
```

##### Status and `setuprequired` on deploy

The Deploy response reflects the same composed shape you get from `UserAgent/Detail`, `communicationChannels` and `enabledChannels` included. **Every fresh Deploy starts at `status: 6` (Setup Required)**. From there, the prepaid path auto-queues the row to `status: 2` after subscription provisioning:

| Field | Meaning |
|-------|---------|
| `status: 6` | **Setup Required**: initial state for every fresh Deploy. With `useprepaid: true`, auto-queues to `status: 2` as soon as the subscription is provisioned, regardless of credential completeness. The agent then starts even if a required credential is still missing, and `UserAgent/Detail` reads `setuprequired: true` until it is filled. Fill a missing credential, such as a channel or the Wiro project the template doesn't mark optional, with `POST /UserAgent/CredentialUpsert` or `POST /UserAgent/CredentialProjectBind`: a running agent restarts to pick it up. Connectors never hold an agent at Setup Required. A row still at `status: 6` has no plan, because it was deployed without `useprepaid: true`. [`CreateSubscriptionCheckout`](#post-useragentcreatesubscriptioncheckout) with `useprepaid: true` pays it and queues the agent (`status: 2`). |
| `status: 2` | **Queued**: `useprepaid: true` charged the wallet, the subscription was provisioned, and Wiro will start the agent. No manual `UserAgent/Start` is required. |
| `setuprequired: true` | A non-optional credential is missing, or the row is still at `status: 6`. At `status: 6`, `Start` rejects with `Agent setup is not complete. Fill in the agent's required settings before starting.` |
| `setuprequired: false` | All non-optional credentials are set up and the row has left `status: 6`. A row sitting at Setup Required reads `true` until it leaves `status: 6`. |

> **Subscription on deploy:** the `subscription` object is **not** included in the Deploy response. A prepaid subscription (`plan: "agent"`, provider `prepaid`, `tier` matches what you passed) is created server-side during the Deploy call. Call `POST /UserAgent/Detail` with the returned `guid` to read the subscription object back.

Next steps for the API integration flow:

1. Inspect `credentials` in the Deploy response (or call `POST /UserAgent/Detail`) to see each credential's fields, the `optional` / `extra` flags and the registry-driven `_schema`.
2. Connect the services the agent works with through [Agent Connectors](/docs/agent-connectors): `POST /UserAgent/ConnectorConnect` with a connector's fields, or its vendor's sign-in. A template's `suggestedconnectors` on [`Agent/Detail`](#post-agentdetail) lists the ones it works with. Call `POST /UserAgent/CredentialUpsert` for channels and settings (bot tokens, the support email), and `POST /UserAgent/CredentialProjectBind` to connect the Wiro project the agent runs models with.
3. Call `POST /UserAgent/CustomSkillUpsert` per skill to customize strategy text or Scheduled Task intervals, if the template exposes any.
4. Once every non-optional credential is set up, `setuprequired` reads `false`. The start doesn't wait for it: the prepaid Deploy already queued the agent, Wiro starts it from the queue (`2` → `3` (Starting) → `4` (Running)), and a running agent restarts to pick up each connector you connect.
5. If you want to re-launch a stopped agent (status `0`) or recover an errored one (status `5`), call `POST /UserAgent/Start` explicitly.

##### Idempotency: duplicate Deploy guard

Deploy rejects a second call from the same caller for the same template and team within a 10-second window. Custom builds (no template) are matched on caller, `title` and team instead. The rejection carries a top-level `existingUserAgentGuid` field so callers can adopt the agent that already won the race instead of retrying:

```json
{
  "result": false,
  "errors": [
    {
      "code": 99,
      "message": "Duplicate deploy: an identical agent (\"My Instagram Bot\") was already deployed 4s ago. Use the existing one, or wait a few seconds and retry."
    }
  ],
  "existingUserAgentGuid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321"
}
```

This prevents a duplicate subscription when a request is retried. `existingUserAgentGuid` is the only top-level field added on this error. The `errors[]` array always carries `code: 99` for the dedup hit.

> **Tip: keep your dashboard clean.** Deployed instances always land pinned in your account. To unpin programmatically (e.g. after bulk-provisioning one instance per customer) call [`POST /UserAgent/Pin`](#post-useragentpin) with `{ "useragentguid": "...", "pinned": false }` immediately after the Deploy call resolves.

#### **POST** /UserAgent/MyAgents

Lists all agent instances deployed under your account.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sort` | string | No | Sort column: `id`, `title`, `status`, `createdat`, `updatedat`, `startedat`, `runningat`, `stopdat`. Default: `id` |
| `order` | string | No | Sort direction: `ASC` or `DESC`. Default: `DESC` |
| `limit` | number | No | Results per page (max 1000). Default: `20` |
| `start` | number | No | Offset for pagination. Default: `0` |
| `category` | string | No | Filter by category (comma-separated for multiple) |

> **Pagination:** the response does not include a `total` count. To know if there are more pages, call with `limit: 20` and inspect the returned array length. If it equals your `limit`, paginate further by incrementing `start` (e.g. `start: 20, 40, 60, ...`) until you get fewer rows than your `limit`.

##### Response

```json
{
  "result": true,
  "errors": [],
  "useragents": [
    {
      "guid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
      "uuid": "ada-uuid",
      "agentguid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "teamguid": null,
      "title": "My Instagram Bot",
      "description": null,
      "cover": null,
      "categories": ["social-media", "marketing"],
      "tier": "pro",
      "nextplan": null,
      "monthlypriceusd": 30,
      "creditperiod": "2026-05",
      "creditsyncat": 1714694410,
      "usage": {
        "period": "2026-05",
        "resetsat": 1780272000,
        "includedusd": 30,
        "usedusd": 12.4,
        "leftusd": 17.6,
        "renewalusd": 30,
        "frombalanceusd": 0,
        "balanceusd": 42.1,
        "wallet": "personal",
        "minbalanceusd": 0.5,
        "paused": false,
        "pausedreason": null
      },
      "spend": {
        "month": "2026-05",
        "planusd": 30,
        "aiusagebalanceusd": 0,
        "aiusageplanusd": 12.4,
        "modelrunsusd": 3.2,
        "fundsaddedusd": 20,
        "totalusd": 33.2
      },
      "status": 4,
      "pinned": true,
      "teamsessionmode": "private",
      "setuprequired": false,
      "subscription": {
        "plan": "agent",
        "status": "active",
        "amount": 30,
        "currency": "usd",
        "currentperiodend": 1780272000,
        "renewaldate": "2026-06-02T00:00:00.000Z",
        "daysremaining": 62,
        "pendingdowngrade": null,
        "provider": "prepaid"
      },
      "agent": {
        "guid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "title": "Instagram Manager",
        "slug": "instagram-manager",
        "description": "An autonomous agent that manages your Instagram Business account.",
        "cover": "https://cdn.wiro.ai/uploads/agents/instagram-manager-cover.webp",
        "categories": ["social-media", "marketing"],
        "tiers": {
          "starter": { "priceUsd": 5 },
          "pro":     { "priceUsd": 30 },
          "max":     { "priceUsd": 100 }
        },
        "plans": [
          { "key": "starter", "title": "Starter", "priceUsd": 5,   "includedUsageUsd": 5,   "diskMb": 250 },
          { "key": "pro",     "title": "Pro",     "priceUsd": 30,  "includedUsageUsd": 30,  "diskMb": 500 },
          { "key": "max",     "title": "Max",     "priceUsd": 100, "includedUsageUsd": 100, "diskMb": 1024 }
        ]
      },
      "enabledSkills": ["util-social-posting-common", "util-anti-ai-human-copy", "util-chat-markdown-reporting"],
      "tokenRates": {
        "default_model": "openai/gpt-5.6-sol",
        "fallback_rate": { "input_per_1m": 625, "output_per_1m": 3750, "cached_input_per_1m": 62.5, "cache_write_per_1m": 781.25 },
        "models": {
          "openai/gpt-5.6-sol": { "input_per_1m": 625, "output_per_1m": 3750, "cached_input_per_1m": 62.5, "cache_write_per_1m": 781.25, "selectable": true, "label": "GPT-5.6 Sol", "tier": "premium" },
          "openai/gpt-5.6-terra": { "input_per_1m": 250, "output_per_1m": 1500, "cached_input_per_1m": 25, "cache_write_per_1m": 312.5, "selectable": true, "label": "GPT-5.6 Terra", "tier": "balanced" },
          "openai/gpt-5.6-luna": { "input_per_1m": 25, "output_per_1m": 150, "cached_input_per_1m": 2.5, "cache_write_per_1m": 31.25, "selectable": true, "label": "GPT-5.6 Luna", "tier": "cheap" }
        }
      },
      "agentModel": {
        "chatModel": "openai/gpt-5.6-sol",
        "cronModel": "openai/gpt-5.4-mini",
        "voicePrepModel": "openai/gpt-5.4-mini",
        "voicePostcallModel": "openai/gpt-5.4"
      },
      "lastactivityat": 1714698000,
      "createdat": 1714608000,
      "updatedat": 1714694400,
      "queuedat": 1714694395,
      "startedat": 1714694400,
      "runningat": 1714694410,
      "stoppingat": null,
      "stopdat": null,
      "errordat": null
    }
  ]
}
```

> **`MyAgents` returns one row per useragent with its scalar fields, the trimmed `agent` template summary, `subscription`, `setuprequired` (status-based check only), `usage` (the agent's AI usage and balance, see [Usage object](#usage-object)), `spend` (what it cost this month, see [Spend object](#spend-object)), `lastactivityat`, the resolved `enabledSkills` (template defaults ∪ user overrides, including transitive `depends_on` closure), `tokenRates` (per-model token rates, the same map as `UserAgent/Detail.tokenRates`), `agentModel` (the resolved chat / cron / voice-prep / voice-postcall model slugs), and `enabledCommands` (the slash-command allowlist, `null` when uncustomized).** Heavier composed children (`credentials`, `customskills`, `scheduledskills`, `skills`, `skillsmeta`, `communicationChannels`, `enabledChannels`) are **not** included. Call `UserAgent/Detail` on a single guid for the full composed shape.

> **`enabledSkills`, `tokenRates`, and `agentModel`** ride on each list row so a chat or pinned-agents UI can decide whether to show the realtime voice-call button (`enabledSkills` includes Web Voice Channel, `util-web-channel`) and render the model picker + live token-rate card without round-tripping `UserAgent/Detail` per row.

#### **POST** /UserAgent/Detail

Retrieves full details for a single deployed agent instance, including subscription info, its AI usage and balance (`usage`), what it cost this month (`spend`), and the resolved per-model token-rate table (`tokenRates`) plus model selection (`agentModel`).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `guid` | string | Yes | Your UserAgent instance guid |

##### Response: prepaid instance (the API deploy pattern)

```json
{
  "result": true,
  "errors": [],
  "useragents": [
    {
      "guid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
      "uuid": "your-user-uuid",
      "agentguid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "teamguid": null,
      "title": "My Instagram Bot",
      "description": null,
      "categories": ["social-media", "marketing"],
      "cover": null,
      "tier": "pro",
      "nextplan": null,
      "status": 4,
      "pinned": true,
      "setuprequired": true,
      "communicationChannels": [
        { "id": "telegram", "credentialkey": "telegram", "title": "Telegram", "required_fields": ["bottoken", "allowedusers"], "capabilities": { "direct": true, "rooms": true, "threads": true, "roles": false, "command_menu": true }, "schema": { "title": "Telegram", "fields": [ "..." ] }, "enabled": false, "configured": false, "missingfields": ["bottoken", "allowedusers"] }
      ],
      "enabledChannels": [],
      "teamsessionmode": "private",
      "credentials": {
        "telegram": {
          "_connected": false,
          "optional": true,
          "extra": false,
          "_editable": {
            "bottoken":     true,
            "allowedusers": true,
            "groups":       true
          },
          "_schema": {
            "title": "Telegram",
            "icon": "https://wiro.ai/images/icons/skills/telegram.svg",
            "brand_color": "#24a1de",
            "brand_text_color": "#ffffff",
            "brand_logo_filter": "brightness(0) invert(1)",
            "docs_url": "integration-telegram-skills",
            "credential_mode": "api_key",
            "connection_modes": [],
            "default_connection_mode": null,
            "mode_badges": {},
            "wiro_connect_pending": false,
            "channel": {
              "id": "telegram",
              "plugin": "telegram",
              "required_fields": ["bottoken", "allowedusers"],
              "capabilities": { "direct": true, "rooms": true, "threads": true, "roles": false, "command_menu": true }
            },
            "oauth_provider": null,
            "fields": [
              {
                "key": "bottoken",
                "label": "Telegram Bot Token",
                "type": "password",
                "required": true,
                "show_toggle": true
              },
              {
                "key": "allowedusers",
                "label": "Allowed Telegram DM User IDs",
                "type": "string-array",
                "required": true,
                "depends_on_field": { "field": "bottoken", "value": "", "operator": "ne" },
                "pattern": "^\\d{5,}$"
              },
              {
                "key": "groups",
                "label": "Allowed Telegram Groups",
                "type": "object-array",
                "required": false,
                "depends_on_field": { "field": "bottoken", "value": "", "operator": "ne" },
                "item_schema": [
                  { "key": "chatid", "label": "Group Chat ID", "type": "text", "required": true, "placeholder": "-1001234567890", "pattern": "^-\\d{5,}$" },
                  { "key": "allowedusers", "label": "Allowed User IDs", "type": "string-array", "required": true, "pattern": "^\\d{5,}$" }
                ]
              }
            ]
          },
          "_required_missing": false,
          "_filled": false,
          "bottoken": "",
          "allowedusers": [],
          "groups": []
        }
      },
      "customskills": [
        {
          "key": "cs-content-tone",
          "description": "Brand voice + posting rules read by every content-generation skill on this agent.",
          "value": "## Brand Voice\nTone: friendly, casual, never salesy.\nTarget Audience: indie devs and side-project builders.\n\n## Hashtag Strategy\nMax 3 per post. Always include #BuildInPublic and #Indie.\n\n## Platform Rules\n- Instagram: square images only, carousels for tutorials.\n- Twitter: thread format for posts longer than 200 chars.",
          "enabled": true,
          "interval": null,
          "requires_credentials": [],
          "requires_connectors": [],
          "_source": "preset-strategy",
          "_editable": true,
          "_edited": true
        },
        {
          "key": "cs-content-sources",
          "description": "RSS / sitemap URLs the agent should poll for new content ideas.",
          "value": "## Primary Sources\nhttps://blog.example.com/feed.xml\nhttps://news.ycombinator.com/rss\n\n## CTA URL Pattern\nhttps://example.com/posts/{slug}",
          "enabled": true,
          "interval": null,
          "requires_credentials": [],
          "requires_connectors": [],
          "_source": "preset-strategy",
          "_editable": true,
          "_edited": false
        }
      ],
      "scheduledskills": [
        {
          "key": "cs-cron-social-content-scanner",
          "description": "Polls the content sources every 4 hours and queues fresh ideas for the post generator.",
          "value": "Scan the configured RSS / sitemap sources, dedupe against last 14 days, and queue up to 3 fresh items into the post pipeline.",
          "enabled": true,
          "interval": "0 */4 * * *",
          "requires_credentials": [],
          "requires_connectors": ["facebook-pages", "instagram", "linkedin", "tiktok", "twitter"],
          "_source": "skill-bundle",
          "_editable": true,
          "_edited": false,
          "_owner_skills": ["util-social-posting-common"],
          "_skill_off": false,
          "_usable_credentials": [],
          "_if_connected": {}
        },
        {
          "key": "cs-cron-weekly-roundup",
          "description": "User-created weekly Scheduled Task that posts a Monday recap to Telegram.",
          "value": "Every Monday at 09:00 UTC, summarize last week's published posts (titles + engagement) and post the recap to Telegram.",
          "enabled": true,
          "interval": "0 9 * * 1",
          "requires_credentials": [],
          "requires_connectors": [],
          "_source": "user-created",
          "_editable": true,
          "_edited": false,
          "_user_created": true
        }
      ],
      "skills": [
        { "name": "util-social-posting-common",   "enabled": true, "_edited": false, "_user_created": false },
        { "name": "util-anti-ai-human-copy",      "enabled": true, "_edited": true,  "_user_created": false },
        { "name": "util-chat-markdown-reporting", "enabled": true, "_edited": false, "_user_created": false }
      ],
      "skillsmeta": {
        "util-social-posting-common": {
          "name": "util-social-posting-common",
          "title": "Social Posting Common Rules",
          "icon": "lni lni-share-2",
          "brand_color": "#3b82f6",
          "brand_text_color": "#ffffff",
          "brand_logo_filter": "brightness(0) invert(1)",
          "category": "util",
          "docs_url": "",
          "credential_key": null,
          "requires_credentials": false,
          "user_invocable": true,
          "deprecated": false,
          "replacement": null,
          "description": "Shared social manager rules: multi-platform posting orchestration, aspect ratio enforcement, caption compliance. Comes with content scanning and a Scheduled Task for Google Drive assets."
        },
        "util-anti-ai-human-copy": {
          "name": "util-anti-ai-human-copy",
          "title": "Anti-AI Human Copy",
          "icon": "lni lni-spellcheck",
          "brand_color": "#6366f1",
          "brand_text_color": "#ffffff",
          "brand_logo_filter": "brightness(0) invert(1)",
          "category": "util",
          "docs_url": "",
          "credential_key": null,
          "requires_credentials": false,
          "user_invocable": true,
          "deprecated": false,
          "replacement": null,
          "description": "Tone and craftsmanship rules for content-producing agents: banned generic words, sentence rhythm, copula/filler discipline, read-aloud test."
        },
        "util-chat-markdown-reporting": {
          "name": "util-chat-markdown-reporting",
          "title": "Chat Markdown Reporting",
          "icon": "lni lni-message-3-text",
          "brand_color": "#14b8a6",
          "brand_text_color": "#ffffff",
          "brand_logo_filter": "brightness(0) invert(1)",
          "category": "util",
          "docs_url": "",
          "credential_key": null,
          "requires_credentials": false,
          "user_invocable": true,
          "deprecated": false,
          "replacement": null,
          "description": "Structured markdown report format for the chat channel (Telegram / web chat / API chat): tables, code blocks for readability, character limits, split logic. Channel-agnostic."
        }
      },
      "monthlypriceusd": 30,
      "creditperiod": "2026-05",
      "creditsyncat": 1714694410,
      "usage": {
        "period": "2026-05",
        "resetsat": 1780272000,
        "includedusd": 30,
        "usedusd": 12.4,
        "leftusd": 17.6,
        "renewalusd": 30,
        "frombalanceusd": 0,
        "balanceusd": 42.1,
        "wallet": "personal",
        "minbalanceusd": 0.5,
        "paused": false,
        "pausedreason": null
      },
      "spend": {
        "month": "2026-05",
        "planusd": 30,
        "aiusagebalanceusd": 0,
        "aiusageplanusd": 12.4,
        "modelrunsusd": 3.2,
        "fundsaddedusd": 20,
        "totalusd": 33.2
      },
      "tokenRates": {
        "default_model": "openai/gpt-5.6-sol",
        "fallback_rate": { "input_per_1m": 625, "output_per_1m": 3750, "cached_input_per_1m": 62.5, "cache_write_per_1m": 781.25 },
        "models": {
          "openai/gpt-5.6-sol": { "input_per_1m": 625, "output_per_1m": 3750, "cached_input_per_1m": 62.5, "cache_write_per_1m": 781.25, "selectable": true, "label": "GPT-5.6 Sol", "tier": "premium" },
          "openai/gpt-5.6-terra": { "input_per_1m": 250, "output_per_1m": 1500, "cached_input_per_1m": 25, "cache_write_per_1m": 312.5, "selectable": true, "label": "GPT-5.6 Terra", "tier": "balanced" },
          "openai/gpt-5.6-luna": { "input_per_1m": 25, "output_per_1m": 150, "cached_input_per_1m": 2.5, "cache_write_per_1m": 31.25, "selectable": true, "label": "GPT-5.6 Luna", "tier": "cheap" }
        }
      },
      "agentModel": {
        "chatModel": "openai/gpt-5.6-sol",
        "cronModel": "openai/gpt-5.4-mini",
        "voicePrepModel": "openai/gpt-5.4-mini",
        "voicePostcallModel": "openai/gpt-5.4"
      },
      "chatSetup": "all",
      "screen": "on",
      "disk": {
        "limitMb": 500,
        "limitBytes": 524288000,
        "usedBytes": 103809024,
        "state": "ok",
        "measuredAt": "2026-05-03T00:45:00.000Z"
      },
      "subscription": {
        "plan": "agent",
        "status": "active",
        "amount": 30,
        "currency": "usd",
        "currentperiodend": 1780272000,
        "renewaldate": "2026-06-02T00:00:00.000Z",
        "daysremaining": 28,
        "pendingdowngrade": null,
        "provider": "prepaid"
      },
      "agent": {
        "guid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "title": "Instagram Manager",
        "slug": "instagram-manager",
        "headline": "Automate your Instagram presence with AI",
        "description": "An autonomous agent that manages your Instagram Business account: drafts posts from your RSS feeds, schedules carousels, and replies to DMs.",
        "cover": "https://cdn.wiro.ai/uploads/agents/instagram-manager-cover.webp",
        "icon": "https://cdn.wiro.ai/uploads/agents/instagram-manager-icon.webp",
        "categories": ["social-media", "marketing"],
        "tiers": {
          "starter": { "priceUsd": 5 },
          "pro":     { "priceUsd": 30 },
          "max":     { "priceUsd": 100 }
        },
        "plans": [
          { "key": "starter", "title": "Starter", "priceUsd": 5,   "includedUsageUsd": 5,   "diskMb": 250 },
          { "key": "pro",     "title": "Pro",     "priceUsd": 30,  "includedUsageUsd": 30,  "diskMb": 500 },
          { "key": "max",     "title": "Max",     "priceUsd": 100, "includedUsageUsd": 100, "diskMb": 1024 }
        ]
      },
      "lastactivityat": 1714698000,
      "createdat": 1714608000,
      "updatedat": 1714694400,
      "queuedat": 1714694395,
      "startedat": 1714694400,
      "runningat": 1714694410,
      "stoppingat": null,
      "stopdat": null,
      "errordat": null
    }
  ]
}
```

##### Field reference

**Identity & profile**

| Field | Type | Description |
|-------|------|-------------|
| `guid` | `string` | Unique identifier for this agent instance. |
| `uuid` | `string` | Owner account UUID (the user who deployed). |
| `agentguid` | `string\|null` | Catalog template GUID this instance was deployed from. `null` for custom builds (always check `agent.custom === true` to detect those). |
| `teamguid` | `string\|null` | Team GUID when the agent is team-scoped. `null` for personal agents. |
| `title` | `string` | Display name you gave this instance at deploy. |
| `description` | `string\|null` | Long-form description shown on the agent card. |
| `cover` | `string\|null` | Per-instance cover URL, `null` until one is set with `Deploy`, `Update` or `Cover`. Show `agent.cover` when it is `null`. |
| `categories` | `array<string>` | Inherited from the template at deploy; editable via `Update`. |
| `pinned` | `boolean` | `true` when the agent is pinned to its workspace's header dropdown (on a team agent, for every member). Mutate via `Pin`. |

**Plan & AI usage**

| Field | Type | Description |
|-------|------|-------------|
| `tier` | `string` | The agent's plan: `"starter"`, `"pro"` or `"max"`. |
| `nextplan` | `string\|null` | The plan the agent moves to at its next renewal, set by a move to a lower plan with [`UpgradeTier`](#post-useragentupgradetier). An agent subscribed before the three plans also shows here the plan it renews on. `null` when no change is scheduled. Also on `MyAgents` and `PinnedAgents` rows. |
| `monthlypriceusd` | `number` | The monthly USD price the agent pays, set at deploy, at a plan change and at renewal. Mirrors `subscription.amount`. Once a plan has ended, it shows the price the plan renews at, with that plan in `tier`: [`RenewSubscription`](#post-useragentrenewsubscription) never charges more. |
| `usage` | `object` | The agent's AI usage this period and the balance it runs on once the included usage is used up: `{ period, resetsat, includedusd, usedusd, leftusd, renewalusd, frombalanceusd, balanceusd, wallet, minbalanceusd, paused, pausedreason }` (see [Usage object](#usage-object)). Also on `MyAgents` and `PinnedAgents` rows. |
| `spend` | `object` | What the agent cost this calendar month: `{ month, planusd, aiusageplanusd, aiusagebalanceusd, modelrunsusd, fundsaddedusd, totalusd }` (see [Spend object](#spend-object)). Also on `MyAgents` and `PinnedAgents` rows. |
| `creditperiod` | `string` | `'YYYY-MM'` tag of the current billing period. Rolls over on subscription renewal. |
| `creditsyncat` | `number\|null` | Unix seconds of the last monthly usage reset, which starts the current billing period (`null` until the first reset). |
| `tokenRates` | `object\|null` | Per-model token rates, in cents per 1,000,000 tokens. Shape: `{ default_model, fallback_rate, models: { "<slug>": { input_per_1m, output_per_1m, cached_input_per_1m?, cache_write_per_1m?, selectable?, label?, tier? } } }`. Each turn's AI usage is priced from these rates. See [Token Billing](#token-billing). `null` only on registry-read failure. |
| `agentModel` | `object` | The resolved model slugs this instance runs: `{ chatModel, cronModel, voicePrepModel, voicePostcallModel }` (camelCase). Each falls back to the platform default when the operator hasn't overridden it. Change them via [`POST /UserAgent/UpdateSettings`](#post-useragentupdatesettings) using the lowercase keys `chatmodel` / `cronmodel` / `voiceprepmodel` / `voicepostcallmodel`. |
| `enabledCommands` | `array<string>\|null` | The in-chat slash-command allowlist (camelCase read). `null` = the operator never customized it, so **all** slash commands are available. An array (including `[]`) is an explicit allowlist of command keys (no leading slash); `[]` hides the slash-command menu. Write it via [`POST /UserAgent/UpdateSettings`](#post-useragentupdatesettings) with the lowercase `enabledcommands` key. Also present on `MyAgents` / `PinnedAgents` rows. |
| `wiroApiAllowedPaths` | `array<string>` | The Wiro API endpoints the agent may call with its own Wiro project key (camelCase read), for example `["POST /v1/Run/*/*", "POST /v1/Task/Detail"]`. Always the list that applies: the agent's own list or, when it has none, the default list described under [`UpdateSettings`](#post-useragentupdatesettings). `[]` blocks all of them. Write it via [`POST /UserAgent/UpdateSettings`](#post-useragentupdatesettings) or at Deploy with the lowercase `wiroapiallowedpaths` key. Also on the `Deploy` and `Update` responses; not on `MyAgents` / `PinnedAgents` rows. |
| `chatSetup` | `string\|null` | Setup From Chat as it applies to this agent (camelCase read): `"all"`, `"webchat"` or `"off"`. Write it via [`POST /UserAgent/UpdateSettings`](#post-useragentupdatesettings) or at Deploy with the lowercase `chatsetup` key. See [Setup From Chat](/docs/agent-messaging#setup-from-chat). `null` when it could not be read. |
| `screen` | `string\|null` | The agent's Screen setting: `"on"` or `"off"`. When it is on, the people who manage the agent can watch its computer live, in the Wiro panel or in your own app with a project API key, and the owner of a personal agent that has never been in a team, or whose browser was reset after it last left one, can take control of it; `"off"` closes both, everywhere. On a team agent whose Chat Mode (`teamsessionmode`) is `"private"`, the Screen stays closed to the team even while this reads `"on"`. See [Screen and Take Control](#screen-and-take-control). Write it via [`POST /UserAgent/UpdateSettings`](#post-useragentupdatesettings). `null` when it could not be read. |
| `disk` | `object` | The agent's disk space and how much of it its files use: `{ limitMb, limitBytes, usedBytes, state, measuredAt }` (see "Disk object" below). The limit follows the agent's `tier`. See [Disk Space](#disk-space). |

**Lifecycle**

| Field | Type | Description |
|-------|------|-------------|
| `status` | `number` | Current status code (see [UserAgent Statuses](#useragent-statuses)). |
| `setuprequired` | `boolean` | `true` if any required credential is missing or incomplete. Mirrors `status: 6` plus a fresh check against the live credential rows. |
| `createdat` / `updatedat` / `queuedat` / `startedat` / `runningat` / `stoppingat` / `stopdat` / `errordat` | `number\|null` | Unix seconds for each lifecycle transition. `null` until the corresponding state is reached. |
| `lastactivityat` | `number\|null` | Unix seconds of the agent's last activity: the later of its newest message that isn't deleted and its newest AI usage charge (see [Agent Transactions](/docs/agent-transactions)). `null` when it has neither yet. Also on `MyAgents` rows; not on `PinnedAgents` rows. |

**Composed children**

| Field | Type | Description |
|-------|------|-------------|
| `credentials` | `object` | Per-provider credential map keyed by credential name (`telegram`, `twilio-voice`, `wiro`, `var-support-email`, …). Each provider object carries its saved field values, every saved secret read as the mask `"••••••••"`, plus a fixed metadata header (see "Credential object shape" below). |
| `customskills` | `array` | Composed list of preset strategies and custom skills that aren't Scheduled Tasks (writable instructions). Each entry: `{ key, description, value, enabled, interval: null, requires_credentials, requires_connectors, _source, _editable, _edited, _user_created? }`. `requires_credentials` (`string[]`) lists the channels and settings the entry needs, such as `telegram` or `wiro`; one of them set up is enough. `requires_connectors` (`string[]`) lists the Connectors a scheduled task needs, by catalog slug; one of them connected is enough. `_source` ∈ `"preset-strategy"` \| `"user-created"`. |
| `scheduledskills` | `array` | Composed list of Scheduled Tasks (`cs-cron-*`). Same shape as `customskills` plus `interval` (cron expression). A task whose `requires_connectors` isn't empty runs only while one of those Connectors is connected. `_source` ∈ `"skill-bundle"` (a Scheduled Task the template or a skill brings) \| `"user-created"`. A scheduled task that skills bring also carries the fields in [Scheduled task skill fields](#scheduled-task-skill-fields). |
| `skills` | `array<object>` | Currently-enabled Skills (`util-*`). Each entry: `{ name, enabled: true, _edited, _user_created }`. Toggle via `SkillsApply` (single-skill or batch). Note: object array (not string array). |
| `skillsmeta` | `object` | Inline registry snapshot keyed by skill name: `title`, `icon`, `brand_color`, `category`, `docs_url`, `credential_key`, `requires_credentials`, `user_invocable`, `description`. Lets the panel render skill chips without a `Skills/List` round-trip. |
| `communicationChannels` | `array` | Every external channel with this agent's state: `id`, `title`, `credentialkey`, `required_fields`, `capabilities`, `schema`, `enabled`, `configured` and `missingfields`. Also on the `Deploy` and `Update` responses; not on `MyAgents` / `PinnedAgents` rows. |
| `enabledChannels` | `array<string>` | The ids of the channels in `communicationChannels` that are enabled. Same endpoints. |
| `teamsessionmode` | `string` | The unified Chat Mode: `"collaborative"` or `"private"` for every agent. For team agents it drives `Message/History`, `Sessions`, and native web-chat memory scope; for all agents it also drives Telegram, Slack, and Discord DM scope. Team deployments/transfers default collaborative; personal deployments/team detachments default private. Write with [`POST /UserAgent/UpdateSettings`](#post-useragentupdatesettings) (team admins / owner only). On a team agent, `"private"` also keeps the agent's Screen closed to the team (see [Who Can Watch](#who-can-watch)). |
| `timezone` | `string\|null` | Operator-selected IANA timezone (e.g. `"Europe/Istanbul"`, `"America/New_York"`). `null` means **UTC**. The agent uses this zone for its scheduled tasks, for the times it gives on voice calls and for business hours. Write with [`POST /UserAgent/UpdateSettings`](#post-useragentupdatesettings). |

<a id="scheduled-task-skill-fields"></a>

**Scheduled task skill fields.** A `scheduledskills` entry of a scheduled task that one of Wiro's skills brings (a `cs-cron-*` key from the skill registry) carries five more fields. Wiro gives the agent such a task only while a skill that brings it is on. These fields say where it stands with its skills and with the channels and settings in its `requires_credentials`. Like any scheduled task whose `requires_connectors` isn't empty, it also runs only while one of those Connectors is connected. A task without `_owner_skills`, such as one you wrote yourself, carries none of them and needs only what its own `requires_credentials` and `requires_connectors` list.

| Field | Type | Description |
|-------|------|-------------|
| `_owner_skills` | `string[]` | The skills that bring the task. |
| `_skill_off` | `boolean` | `true` while the task waits for skills that are off. Wiro then sends it to the agent turned off, whatever its own `enabled` says. |
| `_off_skills` | `string[][]` | Only when `_skill_off` is `true`: what to turn on, one skill from each group. |
| `_usable_credentials` | `string[]` | The channels and settings the task's credential check covers (its `requires_credentials`), such as `telegram` or `wiro`; one of them set up is enough. `[]` when it needs none. Connectors aren't listed here: see `requires_connectors`. |
| `_if_connected` | `object` | One key for each of those channels or settings that isn't set up, with the groups of skills the task would still wait for once it is: the same groups as `_off_skills`, or `[]` when no skill holds the task back. `{}` when there are none. |

To show a task as waiting, read `_skill_off` and `_off_skills` for the skills to turn on. Then compare its `requires_connectors` with each connection's `status` on [`ConnectorList`](/docs/agent-connectors#post-useragentconnectorlist): the task waits for a Connector until one of them reads `connected`.

**Subscription & template**

| Field | Type | Description |
|-------|------|-------------|
| `subscription` | `object\|null` | The agent's subscription (see "Subscription object" below): its active one, else its newest, so a plan that ended reads `status: "expired"`. `null` when the agent has never had a plan. It reads `plan: "agent"` and, since plans are paid from the Wiro balance, `provider: "prepaid"` (see [Paying for Plans](#paying-for-plans) for a plan that was paid by card). |
| `agent` | `object` | Parent template summary: `{ guid, title, slug, headline, description, cover, icon, categories, tiers, plans }`. For custom builds (`agent.custom: true`) it's a synthesized placeholder instead: `{ custom: true, slug, cover: null, icon: null, tiers, plans }`, with no `guid`, `title`, `headline`, `description` or `categories`. Read the agent's title and cover from the useragent itself. |

##### Credential object shape

Every provider entry under `credentials.<key>` carries:

| Sub-field | Type | Description |
|-----------|------|-------------|
| `_connected` | `boolean` | On a channel (Telegram, Slack, Discord), `true` once every field in its `required_fields` is filled. `false` on other credentials, where `_filled` and `_required_missing` tell the state. A connector's state is its `status` on [`ConnectorList`](/docs/agent-connectors#post-useragentconnectorlist). |
| `optional` | `boolean` | `true` when the agent template marks this credential as optional (the agent can run without it). `false` for required credentials. A credential nothing on the agent asks for reads `true`, with `extra: false`. |
| `extra` | `boolean` | `true` when the agent template marks this credential as an optional extra; the panel lists it after the required ones. |
| `_editable` | `object` | Per-field edit map: `{ fieldname: true\|false }`. `false` means the field is read-only (platform-managed or computed). The frontend uses this to disable inputs. |
| `_schema` | `object` | Inline registry descriptor: `title`, `icon`, `brand_color`, `docs_url`, `credential_mode`, `channel` (on the external chat channels) and `fields[]`. Other keys are for Wiro's own panel: ignore them. |
| `_required_missing` | `boolean` | `true` when this credential is required (`optional: false`) and a required field you fill in is still empty. Drives the "needs attention" bullet on each credential card and the aggregate count badge in the agent's settings. Always `false` on an optional credential. A list field counts as empty while its rows hold nothing but a choice or a switch, such as a default platform on an otherwise blank row. A value the agent template holds counts as filled, even on a secret field that reads empty here. |
| `_filled` | `boolean` | `true` when the credential holds what the agent needs: at least one field holds a value and no required field you fill in is empty. A value the agent template holds counts, even on a secret field that reads empty here. For `setuprequired`, a credential counts only the values saved on this agent; see [Setup Required](/docs/agent-credentials#setup-required-state). |
| `<fieldname>` | `string\|number\|boolean\|array` | The field value as you saved it, returned to the agent's owner and team admins. A saved secret (a `password` field) reads `"••••••••"` instead, for every caller, and one with nothing saved reads `""`. Field types match `_schema.fields[].type`. Never returned: Wiro-managed fields, and a value the agent template holds on a field Wiro stores encrypted: such a field reads empty until you save your own. |

##### Usage object

`usage` says where the agent stands this billing period. Amounts are in USD.

| Sub-field | Type | Description |
|-----------|------|-------------|
| `period` | `string` | `'YYYY-MM'` tag of the current billing period. |
| `resetsat` | `number\|null` | Unix seconds when the plan's period ends (`subscription.currentperiodend`). The renewal that starts the included AI usage again runs up to a day later. On Detail, MyAgents and PinnedAgents, a plan that ended shows the ended period's end. `null` when there is no period to show or it can't be read. |
| `includedusd` | `number` | The AI usage this period includes. After a move to a higher plan inside the period, the higher plan counts only for the time left, so it reads between the two plans' amounts until the next renewal. |
| `usedusd` | `number` | The included AI usage used this period. |
| `leftusd` | `number` | The included AI usage left this period. |
| `renewalusd` | `number` | The AI usage the next renewal includes: the agent's plan's, or the scheduled plan's when `nextplan` is set. |
| `frombalanceusd` | `number` | The AI usage charged to the balance this period, after the included usage ran out. |
| `balanceusd` | `number` | What the agent's AI usage can draw on in the wallet it uses: deposits and store revenue. Coupon credit isn't counted, so it can read less than the wallet shows. |
| `wallet` | `string` | `"personal"` (the owner's balance) or `"team"` (the team's balance). |
| `minbalanceusd` | `number` | The balance a new turn needs once the included usage is used up: `0.5`. |
| `paused` | `boolean` | `true` while the agent can't start a new turn because it has no active plan or its balance is short (see `pausedreason`). A reached [spend limit](/docs/spend-limits) doesn't set it: `Message/Send` then answers code `93`. |
| `pausedreason` | `string\|null` | `"plan"`: the agent has no active plan, because its plan ended or it never had one. It doesn't run until a plan is paid: [`RenewSubscription`](#post-useragentrenewsubscription) renews a plan that ended, and [`CreateSubscriptionCheckout`](#post-useragentcreatesubscriptioncheckout) (`useprepaid: true`) starts a new one. Adding funds doesn't start it. `"balance"`: the included usage is used up and the balance is under `minbalanceusd`; adding funds runs it again. `null` otherwise, also while a spend limit holds the agent. |

##### Spend object

`spend` says what the agent cost in the current calendar month (UTC), in USD.

| Sub-field | Type | Description |
|-----------|------|-------------|
| `month` | `string` | The month the figures cover, `'YYYY-MM'`. |
| `planusd` | `number` | Plan payments for the agent: a new plan, moves to a higher plan and renewals. |
| `aiusageplanusd` | `number` | AI usage covered by the plan's included usage. The plan payment already paid for it, so it is not in `totalusd`. |
| `aiusagebalanceusd` | `number` | AI usage paid from the balance. |
| `modelrunsusd` | `number` | Models the agent ran, such as images and video. |
| `fundsaddedusd` | `number` | Funds added to the balance from the agent's page. Not spending. |
| `totalusd` | `number` | What the agent cost: `planusd` + `aiusagebalanceusd` + `modelrunsusd`. |

##### Subscription object

| Sub-field | Type | Description |
|-----------|------|-------------|
| `plan` | `string` | Always `"agent"`. The plan (Starter, Pro or Max) is the useragent's `tier` field, not the subscription's. |
| `status` | `string` | `"active"`, `"expired"`, `"cancelled"`, or `"refunded"`. |
| `amount` | `number` | The monthly USD price actually being charged. Mirrors `useragent.monthlypriceusd`. |
| `currency` | `string` | Always `"usd"`. |
| `currentperiodend` | `number\|null` | Unix seconds when the current billing period ends. |
| `renewaldate` | `string\|null` | ISO-8601 time the plan next renews, or ends when it is cancelled: one day after `currentperiodend` for a plan paid from the balance, the period end for a plan paid by card. `null` unless the subscription is active. |
| `daysremaining` | `number` | Days until `renewaldate`, rounded up; `0` unless the subscription is active. |
| `pendingdowngrade` | `string\|null` | `"cancel"` after `CancelSubscription`; `null` for normal active subs. A move to a lower plan shows in the agent's `nextplan`, not here. |
| `provider` | `string` | `"prepaid"`: the plan is paid from the Wiro balance. `"stripe"` only on a plan paid by card before agent plans moved to the balance, until its period ends. |
| `nextprovider` | `string\|null` | `"prepaid"` on a plan paid by card: it renews from the balance at the end of its period. `null` otherwise, and on such a plan once it is cancelled. |

##### Disk object

| Sub-field | Type | Description |
|-----------|------|-------------|
| `limitMb` | `number` | The plan's disk space in MB: `250` on Starter, `500` on Pro, `1024` (1 GB) on Max. It follows the agent's `tier`, so a move to a higher plan raises it as soon as the new plan starts. |
| `limitBytes` | `number` | The same limit in bytes: `limitMb` × 1024², for example `262144000` for 250 MB. |
| `usedBytes` | `number\|null` | The size of the agent's files at the last measurement: its workspace, the media it generated and its temporary files. Chat history and system files don't count. `null` before the first measurement. |
| `state` | `string\|null` | `"ok"` below 80% of the limit, `"almost_full"` from 80% and `"full"` from 100%. While it is `"full"`, the agent can't save new files until some are deleted or the agent moves to a bigger plan. `null` before the first measurement. |
| `measuredAt` | `string\|null` | ISO-8601 time of the last measurement. The files are measured about every 15 minutes while the agent runs. `null` before the first measurement. |

#### **POST** /UserAgent/Update

Updates an agent instance's **scalar fields only** (title, description, categories, cover URL). A **starting (status `3`)** or **running (status `4`)** agent restarts in two cases: the call changes its `title`, or the body names none of those four fields, which is how you ask for a restart (`{ "guid": "<useragent-guid>" }`). The agent is moved to Stopping and re-queued after it fully stops. A description, categories or cover edit, or a `title` equal to the saved one, doesn't restart it. `restarting` in the response says which happened.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `guid` | string | Yes | Your UserAgent instance guid |
| `title` | string | No | New display name |
| `description` | string | No | New description (set to empty string or `null` to clear) |
| `categories` | array | No | Updated categories. Cannot be empty if provided. |
| `cover` | string | No | New cover image URL (set to empty string or `null` to clear). For multipart upload, use [`POST /UserAgent/Cover`](#post-useragentcover) instead. |

> **Scalar-only.** Credentials, custom skills, skill toggles, and plan changes use dedicated endpoints:
>
> | What you want to change | Use |
> |-------------------------|-----|
> | Connect, list or disconnect the services the agent works with | [Agent Connectors](/docs/agent-connectors): [`ConnectorConnect`](/docs/agent-connectors#post-useragentconnectorconnect) · [`ConnectorList`](/docs/agent-connectors#post-useragentconnectorlist) · [`ConnectorDisconnect`](/docs/agent-connectors#post-useragentconnectordisconnect) |
> | Channel and setting credentials (bot tokens, the support email) | [`POST /UserAgent/CredentialUpsert`](#post-useragentcredentialupsert) |
> | The Wiro project the agent runs models with | [`POST /UserAgent/CredentialProjectBind`](#post-useragentcredentialprojectbind) |
> | Upload a credential `fileinput` field (multipart, e.g. Twilio voice MP3) | [`POST /UserAgent/CredentialFileUpload`](#post-useragentcredentialfileupload) |
> | Custom skill values (strategy text, cron intervals, enabled flag) | [`POST /UserAgent/CustomSkillUpsert`](#post-useragentcustomskillupsert) |
> | Rename a user-created custom skill (key + optional description) | [`POST /UserAgent/CustomSkillRename`](#post-useragentcustomskillrename) |
> | Browse alternative templates for a custom skill | [`POST /UserAgent/CustomSkillAlternatives`](#post-useragentcustomskillalternatives) |
> | Delete a user-created scheduled task | [`POST /UserAgent/CustomSkillDelete`](#post-useragentcustomskilldelete) |
> | Turn one or more Skills on or off | [`POST /UserAgent/SkillsApply`](#post-useragentskillsapply) |
> | Change the plan (Starter, Pro or Max) | [`POST /UserAgent/UpgradeTier`](#post-useragentupgradetier) |
> | Upload a cover image (multipart) | [`POST /UserAgent/Cover`](#post-useragentcover) |
> | Per-agent settings: time zone, Chat Mode, models, slash commands, Wiro API paths, Setup From Chat and Screen | [`POST /UserAgent/UpdateSettings`](#post-useragentupdatesettings) |
> | Sign the agent's browser out of every site (the agent restarts) | [`POST /UserAgent/ResetBrowser`](#post-useragentresetbrowser) |
> | View / download / delete activity logs | [`POST /UserAgent/Logs`](#post-useragentlogs) · [`LogsList`](#post-useragentlogslist) · [`LogsFile`](#post-useragentlogsfile) · [`LogsDelete`](#post-useragentlogsdelete) |
> | Follow Scheduled Tasks, background runs and model runs live | [`POST /UserAgent/RunStreamToken`](#post-useragentrunstreamtoken) |
> | Show the agent's live Screen, and Take Control, in your own app | [`POST /UserAgent/Realtime/ScreenInfo`](#post-useragentrealtimescreeninfo) · [`ScreenStart`](#post-useragentrealtimescreenstart) |
> | Soft-delete a useragent | [`POST /UserAgent/Delete`](#post-useragentdelete) |

> **Note:** `CredentialUpsert` and `CredentialProjectBind` never change `status`. An agent at `status: 6` has no plan: pay it with [`CreateSubscriptionCheckout`](#post-useragentcreatesubscriptioncheckout) (`useprepaid: true`), which queues it.

##### Response

A changed `title` on a running agent:

```json
{
  "result": true,
  "errors": [],
  "restarting": true,
  "useragents": [
    {
      "guid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
      "uuid": "ada-uuid",
      "agentguid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "teamguid": null,
      "title": "My Instagram Bot",
      "description": "Updated description after rename",
      "cover": "https://cdn.wiro.ai/uploads/useragents/f8e7d6c5-cover.webp",
      "categories": ["social-media", "marketing"],
      "tier": "starter",
      "monthlypriceusd": 5,
      "creditperiod": "2026-05",
      "creditsyncat": 1714694400,
      "status": 1,
      "pinned": false,
      "setuprequired": false,
      "teamsessionmode": "private",
      "timezone": null,
      "agent": {
        "guid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "title": "Instagram Manager",
        "slug": "instagram-manager",
        "headline": "Automate your Instagram presence with AI",
        "description": "An autonomous agent that manages your Instagram Business account.",
        "cover": "https://cdn.wiro.ai/uploads/agents/instagram-manager-cover.webp",
        "icon": "https://cdn.wiro.ai/uploads/agents/instagram-manager-icon.webp",
        "categories": ["social-media", "marketing"],
        "tiers": {
          "starter": { "priceUsd": 5 },
          "pro":     { "priceUsd": 30 },
          "max":     { "priceUsd": 100 }
        },
        "plans": [
          { "key": "starter", "title": "Starter", "priceUsd": 5,   "includedUsageUsd": 5,   "diskMb": 250 },
          { "key": "pro",     "title": "Pro",     "priceUsd": 30,  "includedUsageUsd": 30,  "diskMb": 500 },
          { "key": "max",     "title": "Max",     "priceUsd": 100, "includedUsageUsd": 100, "diskMb": 1024 }
        ]
      },
      "createdat": 1714608000,
      "updatedat": 1714694500,
      "queuedat": 1714694395,
      "startedat": 1714694400,
      "runningat": 1714694410,
      "stoppingat": 1714694500,
      "stopdat": null,
      "errordat": null
    }
  ]
}
```

> **`Update` returns the full composed useragent shape**: same composition path as `UserAgent/Detail`, so `credentials`, `customskills`, `scheduledskills`, `skills`, `skillsmeta`, `tokenRates`, `agentModel`, `communicationChannels`, `enabledChannels`, and the `agent` template summary (with `tiers` and `plans`) are all included. The fields `Update` cannot safely populate without an extra round-trip (`subscription`, `lastactivityat`) stay omitted. Call `UserAgent/Detail` next if you need them, or the agent's `usage` and `spend`. Otherwise the response is suitable for an in-place panel re-render without a follow-up call.

> **`restarting`.** `true` when this call restarts the agent, `false` otherwise. With `true`, the row shows the transition mid-flight: `status: 1` (Stopping) with a fresh `stoppingat` timestamp. Wiro re-queues the agent once it has stopped, so it comes back with the new title. A restart request that can't be carried out answers `Failed to restart user agent`; try again.

#### **POST** /UserAgent/UpdateSettings

Writes per-agent preference toggles that are not credentials and not skill rows. Exposes `timezone` (operator-selected IANA zone the agent uses for scheduled tasks and voice calls), `teamsessionmode` (the one Chat Mode for team web-chat history and external-channel DMs), the four **model overrides** (`chatmodel`, `cronmodel`, `voiceprepmodel`, `voicepostcallmodel`) that choose which LLM the agent uses for chat replies, scheduled (cron) turns, voice-call prep, and the post-call summary turn, `enabledcommands` (the in-chat slash-command allowlist), `wiroapiallowedpaths` (the Wiro API endpoints the agent may call with its own Wiro project key), `chatsetup` (where people can change the agent's setup from chat), and `screen` (whether the agent's [Screen](#screen-and-take-control) opens, in the Wiro panel and in your own app, for watching its computer live and for Take Control). Submit any subset in the same call: partial updates are supported and untouched fields keep their current value.

**Permission**: owner or team admin only, as for `/UserAgent/Update`. Team members cannot change these settings.

**Restart**: if the agent is **starting (status `3`)** or **running (status `4`)** and the call changes a setting, the agent restarts so it applies: a new time zone, Chat Mode (`teamsessionmode`), model, slash-command list (`enabledcommands`) or Wiro API path list (`wiroapiallowedpaths`), or turning `chatsetup` on or off. Moving `chatsetup` between `"all"` and `"webchat"` doesn't restart it: Wiro checks that difference on each message. Changing `screen` never restarts it. A call that changes nothing restarts nothing. For agents in status `0`/`1`/`2`/`5`/`6` the change applies on the next start.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Your UserAgent instance guid. |
| `timezone` | string\|null | No | IANA timezone identifier (e.g. `"Europe/Istanbul"`, `"America/New_York"`, `"Asia/Tokyo"`). Pass `null`, `""`, or the literal `"UTC"` to **clear** the override; the agent then uses UTC. Unknown zones are rejected with `Invalid timezone — must be a valid IANA identifier (e.g. 'Europe/Istanbul').` |
| `teamsessionmode` | string | No | Unified Chat Mode: `"private"` isolates each team member's Wiro web-chat history and native agent memory plus each approved external-channel DM operator; `"collaborative"` shares both runtime contexts. Personal agents can set it because external-channel DMs can have multiple operators. Web and external-channel message lists remain separate transports; room/thread sessions remain room-scoped. Channel activation remains credential-derived. On a team agent, `"private"` also keeps the agent's Screen closed to the team (see [Who Can Watch](#who-can-watch)). |
| `chatmodel` | string\|null | No | Canonical model slug for **chat replies** (e.g. `"openai/gpt-5.6-sol"`). Must be a **selectable** model, i.e. `tokenRates.models[<slug>].selectable === true`; an unknown / non-selectable slug is rejected with `Invalid model: <slug> is not in the selectable model allowlist.` A model that the agent's own [Model Access](/docs/model-access) rule blocks is refused with code `92`. Pass `null` or `""` to clear the override and fall back to the platform default. |
| `cronmodel` | string\|null | No | Same rules as `chatmodel`, applied to **scheduled (cron) turns**. |
| `voiceprepmodel` | string\|null | No | Same rules as `chatmodel`, applied to the **voice-call prep** turn (context assembled before a realtime call). |
| `voicepostcallmodel` | string\|null | No | Same rules as `chatmodel`, applied to the **post-call summary** turn after a realtime voice call ends. |
| `enabledcommands` | string[] | No | Allowlist of in-chat **slash commands** the agent exposes, as an array of command keys **without** the leading slash (e.g. `["agent_help", "new_session", "agent_status"]`). Validated against the command catalog: an unknown key is rejected with `Invalid command: <key> is not a known agent command.`, a non-array value with `enabledcommands must be an array of command keys.` Order is preserved and duplicates are removed. An empty array `[]` is valid and **hides the slash-command menu** entirely. Omit the field to leave the current allowlist untouched. |
| `wiroapiallowedpaths` | string[]\|null | No | Limits the agent's own calls to the Wiro API, the ones its skills make with its Wiro project key (for example to run models), to the endpoints you list. It doesn't cover the tools of the [`wiro` connector](/docs/agent-connectors#the-wiro-connector): those are the ones its `tools` on `AgentConnector/Detail` list. Each rule is a method in capitals (`GET`, `POST`, `PUT`, `PATCH`, `DELETE` or `HEAD`), one space and a `/v1` path, such as `"POST /v1/Task/Detail"`. A `*` stands for exactly one whole path segment: `"POST /v1/Run/*/*"` allows every model run, while `"POST /v1/Run/x*"` is invalid. Up to 64 rules of at most 200 characters each; duplicates are removed and the order is kept. Calls to endpoints that no rule matches are refused. `[]` refuses every call, model runs included; `null` removes your list, and the agent goes back to the default list. An invalid rule, or a value that isn't an array, is rejected with `invalid-wiro-api-path-rule`, and nothing in the request is saved. Omit the field to keep the current list. An agent with no list of its own uses the default list: `POST /v1/Run/*/*`, `POST /v1/Task/Detail`, `POST /v1/Tool/List`, `POST /v1/Tool/Detail`, `POST /v1/Tool/UploadModelPostImage` and `POST /v1/UserAgent/Message/UploadAsset`. If a custom skill of yours calls another endpoint, send a list that includes it. |
| `chatsetup` | string\|null | No | Setup From Chat: where people can change the agent's setup by approving setup cards in chat. `"all"` (the default): in the Wiro web chat and in messages sent with a project API key, such as from your backend or an MCP client. `"webchat"`: only in the Wiro web chat on wiro.ai. `"off"`: never from chat; the agent says that an agent admin makes the change in the agent's settings. `null` goes back to `"all"`, and any other value is rejected with `chatsetup must be off, webchat or all`. Agents that your customers or many people talk to usually choose `"webchat"` or `"off"`; see [Setup From Chat](/docs/agent-messaging#setup-from-chat). Read it back as `chatSetup` on [`UserAgent/Detail`](#post-useragentdetail). |
| `screen` | string\|null | No | Screen: whether the agent's [Screen](#screen-and-take-control) opens, in the Wiro panel and in your own app through [`ScreenStart`](#post-useragentrealtimescreenstart) with a project API key. The people who manage the agent (its owner and the team's admins) watch its computer live, and the owner of a personal agent that has never been in a team, or whose browser was reset after it last left one, can take control of it. `"on"` (the default) or `"off"`. `"off"` closes it for everyone, watching and Take Control alike, in the panel and in your app, and also closes screens that are open, a Take Control session included, within about half a minute. On a team agent whose Chat Mode is `"private"` the screen stays closed to the team whatever this says. `null` goes back to `"on"`, and any other value is rejected with `screen must be on or off`. It never restarts the agent. Read it back as `screen` on [`UserAgent/Detail`](#post-useragentdetail). |

> **Slash-command catalog.** Valid `enabledcommands` keys are: `agent_help`, `new_session`, `agent_status`, `agent_limits`, `last_scan`, `last_heartbeat`, `agent_restart`, `clear_all_sessions`, `clear_history`. Read the agent's current allowlist from the `enabledCommands` field (camelCase) on [`UserAgent/Detail`](#post-useragentdetail) / `MyAgents` / `PinnedAgents`, where `null` means the operator never customized it (all commands available) and an array (including `[]`) is an explicit allowlist.

> **Omitted fields are preserved.** The handler distinguishes between "field not in the body" and "field present with `null`/`""`/value", so a POST that carries only `timezone` does **not** touch `teamsessionmode` or any model field, and vice versa. Sending an empty body (none of the recognised fields) is rejected with `No fields supplied to update.`, so it never restarts the agent for nothing.

> **Read vs write casing.** You **read** the current selection from the `agentModel` object on `UserAgent/Detail` / `MyAgents` / `PinnedAgents` in camelCase (`chatModel`, `cronModel`, `voicePrepModel`, `voicePostcallModel`); you **write** it here in lowercase (`chatmodel`, `cronmodel`, `voiceprepmodel`, `voicepostcallmodel`). The selectable set is exactly the models that `tokenRates.models` marks `selectable: true`. There is no separate "list models" endpoint, so read `tokenRates` to populate a picker.

> **An agent's own calls never manage an account.** Calls the agent makes itself to the Wiro API with its Wiro project key are refused with HTTP `403` on account, agent, team and billing endpoints, such as `/UserAgent/*`, `/Project/*`, `/Team/*` and `/Wallet/*`, whatever `wiroapiallowedpaths` allows: `An agent can't call this endpoint. An agent admin changes the agent's setup in its settings or with a setup card in chat.` `POST /v1/UserAgent/Message/UploadAsset` stays open. On `Task/Detail`, and on `Task/List`, `Task/Cancel` and `Task/Kill` if your `wiroapiallowedpaths` adds them, the agent's calls reach only the tasks it started: a task your backend or anyone else started is not listed and answers as one that does not exist. An agent changes its own setup only through [setup cards](/docs/agent-messaging#setup-from-chat) that an agent admin approves. A [connector](/docs/agent-connectors)'s tools are the ones its `tools` on `AgentConnector/Detail` list, and they act with that connection's own credentials. The [`wiro` connector](/docs/agent-connectors#the-wiro-connector) acts with the agent's own Wiro project key, so its calls are the agent's own calls, and these refusals apply to them too.

##### Request

```bash
# Set IANA timezone only
curl -X POST "https://api.wiro.ai/v1/UserAgent/UpdateSettings" \
  -H "Authorization: Bearer $WIRO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
    "timezone": "Europe/Istanbul"
  }'

# Clear timezone (back to system default UTC)
curl -X POST "https://api.wiro.ai/v1/UserAgent/UpdateSettings" \
  -H "Authorization: Bearer $WIRO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
    "timezone": null
  }'

# Change the one Chat Mode for team web chat and external-channel DMs
curl -X POST "https://api.wiro.ai/v1/UserAgent/UpdateSettings" \
  -H "Authorization: Bearer $WIRO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
    "teamsessionmode": "collaborative"
  }'

# Switch the chat + cron model (each must be selectable; "" / null resets to default)
curl -X POST "https://api.wiro.ai/v1/UserAgent/UpdateSettings" \
  -H "Authorization: Bearer $WIRO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
    "chatmodel": "openai/gpt-5.5",
    "cronmodel": "openai/gpt-5.4-mini"
  }'

# Restrict the in-chat slash-command menu (empty array hides it entirely)
curl -X POST "https://api.wiro.ai/v1/UserAgent/UpdateSettings" \
  -H "Authorization: Bearer $WIRO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
    "enabledcommands": ["agent_help", "new_session", "agent_status"]
  }'

# Limit the agent's own Wiro API calls to model lookups, model runs and task reads
curl -X POST "https://api.wiro.ai/v1/UserAgent/UpdateSettings" \
  -H "Authorization: Bearer $WIRO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
    "wiroapiallowedpaths": ["POST /v1/Tool/List", "POST /v1/Tool/Detail", "POST /v1/Run/*/*", "POST /v1/Task/Detail"]
  }'

# Let setup changes from chat come only from the Wiro web chat
curl -X POST "https://api.wiro.ai/v1/UserAgent/UpdateSettings" \
  -H "Authorization: Bearer $WIRO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
    "chatsetup": "webchat"
  }'

# Keep this agent's Screen closed: nobody can watch it or take control
curl -X POST "https://api.wiro.ai/v1/UserAgent/UpdateSettings" \
  -H "Authorization: Bearer $WIRO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
    "screen": "off"
  }'

# Update both preference toggles in one call
curl -X POST "https://api.wiro.ai/v1/UserAgent/UpdateSettings" \
  -H "Authorization: Bearer $WIRO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
    "timezone": "Europe/Istanbul",
    "teamsessionmode": "collaborative"
  }'
```

##### Response

```json
{
  "result": true,
  "errors": []
}
```

> **Light response by design.** `UpdateSettings` returns just `result` + `errors`, not the full useragent shape. Pull the refreshed row with `POST /UserAgent/Detail` if you need to re-render the panel after the write.

##### Common errors

Each of these comes back with HTTP 200 and `result: false`, like every API answer (see [Error Reference](/docs/error-reference)), and nothing is saved:

| `errors[0].code` | Message | When |
|------|-------------|------|
| 0 | `Request parameter [useragentguid] required` | `useragentguid` missing from the body. |
| 0 | `No fields supplied to update.` | Body had none of the recognised fields (`timezone`, `teamsessionmode`, a model override, `enabledcommands`, `wiroapiallowedpaths`, `chatsetup` or `screen`). |
| 0 | `Invalid timezone — must be a valid IANA identifier (e.g. 'Europe/Istanbul').` | `timezone` is not a valid IANA time zone. |
| 0 | `teamsessionmode must be private or collaborative` | `teamsessionmode` wasn't one of the two supported values. |
| 0 | `directchatmode is not accepted; teamsessionmode is the unified chat mode` | Obsolete separate mode was sent instead of unified `teamsessionmode`. |
| 0 | `Invalid model: <slug> is not in the selectable model allowlist.` | A model override (`chatmodel` / `cronmodel` / `voiceprepmodel` / `voicepostcallmodel`) was an unknown or non-selectable slug (`tokenRates.models[<slug>].selectable !== true`). |
| 92 | The Model Access rule's sentence, such as `This agent can't use openai/gpt-5.5. Model Access rules decide which models can run.` | A model override that a [Model Access](/docs/model-access) rule for the agent blocks. |
| 0 | `enabledcommands must be an array of command keys.` | `enabledcommands` was present but not an array. |
| 0 | `Invalid command: <key> is not a known agent command.` | `enabledcommands` contained a key that isn't in the slash-command catalog. |
| 0 | `invalid-wiro-api-path-rule` | `wiroapiallowedpaths` was not an array, or a rule broke the format or the limits above. |
| 0 | `chatsetup must be off, webchat or all` | `chatsetup` wasn't `"all"`, `"webchat"`, `"off"` or `null`. |
| 0 | `screen must be on or off` | `screen` wasn't `"on"`, `"off"` or `null`. |
| 95 | `User agent not found` | Unknown guid, or the agent has been deleted. |
| 96 | `You don't have access to this user agent` | Caller is neither the owner nor on the agent's team. |
| 97 | `Only a team admin can perform this action on a team-owned agent.` | Caller is a member of the agent's team but not a team admin. |
| 0 | `Failed to update user agent — please retry.` | The write failed (transient, safe to retry). |

#### **POST** /UserAgent/ResetBrowser

Signs the agent's browser out of every site. The agent's whole browser profile is deleted, with its sign-ins, cookies, history and saved site data, and the agent restarts with a fresh browser. Its files, memory and Connectors stay as they are. A reset is also how an agent that was in a team gets Take Control back: see [Resetting the Browser](#resetting-the-browser).

**Permission**: owner or team admin only, as for `UpdateSettings`, with a signed-in session or a project API key. Team members can't reset it.

**Restart**: only a **starting (status `3`)** or **running (status `4`)** agent can be reset. The call moves it to Stopping (status `1`), and its browser is reset as it starts again, about a minute later (see [Automatic Restart](#automatic-restart)). An agent in any other status is refused, and a refused call restarts nothing.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Your UserAgent instance guid. |

##### Request

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/ResetBrowser" \
  -H "Authorization: Bearer $WIRO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321"
  }'
```

##### Response

```json
{
  "result": true,
  "restarting": true,
  "errors": []
}
```

`restarting` is `true` once the agent is restarting for the reset; read [`Detail`](#post-useragentdetail) to follow its `status` from Stopping back to Running. Each reset adds an `AGENT_BROWSER_RESET` row, `Agent browser reset`, to the agent's activity log, with who did it (see [Who-did-what rows](/docs/agent-logs#who-did-what-rows)).

##### Common errors

A refused call answers `result: false` and `restarting: false` with one entry in `errors`, and restarts nothing:

```json
{
  "result": false,
  "restarting": false,
  "errors": [
    {
      "code": 0,
      "message": "The agent is not running. Start it, then reset its browser.",
      "time": 1795113000
    }
  ]
}
```

| Error | Code | When |
|-------|------|------|
| `Request parameter [useragentguid] required` | 0 | `useragentguid` is missing or blank |
| `This agent's browser can't be reset.` | 96 | The agent is Studio or the Workflow Agent |
| `User agent not found` | 95 | Unknown guid, or the agent has been deleted |
| `You don't have access to this user agent` | 96 | The caller is neither the agent's owner nor on its team |
| `Only a team admin can perform this action on a team-owned agent.` | 97 | The caller is a plain member of the agent's team |
| `The agent is not running. Start it, then reset its browser.` | 0 | The agent is stopped (status `0`), in error (`5`) or in Setup Required (`6`) |
| `The agent is starting or stopping. Try again once it is running.` | 0 | The agent is stopping (status `1`) or queued (`2`) |
| `Reset Browser is not available for this agent yet. Try again later.` | 0 | Reset Browser can't be used on this agent at the moment |
| `The browser could not be reset just now. Try again in a minute.` | 0 | The reset could not be started. Try again in a minute |

#### **POST** /UserAgent/Cover

Uploads a new cover image for the agent instance via multipart. Mirrors the `/User/Avatar` pattern: accepts `jpg`, `png`, `gif`, `jpeg`, `webp`; converts it to webp and saves its URL as the agent's `cover`.

If you already have a hosted URL, use `POST /UserAgent/Update` with `cover: "<url>"` instead.

**Multipart fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `useragentguid` | text | Yes | Your UserAgent instance guid |
| `image` | file | Yes | The cover image file (jpg/png/gif/jpeg/webp, max ~10MB) |

##### Response

```json
{
  "result": true,
  "errors": [],
  "cover": "https://cdn.wiro.ai/uploads/useragents/f8e7d6c5-b4a3-2190-fedc-ba0987654321-cover.webp",
  "useragents": [
    {
      "guid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
      "uuid": "ada-uuid",
      "agentguid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "teamguid": null,
      "title": "My Instagram Bot",
      "description": null,
      "cover": "https://cdn.wiro.ai/uploads/useragents/f8e7d6c5-b4a3-2190-fedc-ba0987654321-cover.webp",
      "categories": ["social-media", "marketing"],
      "tier": "starter",
      "monthlypriceusd": 5,
      "creditperiod": "2026-05",
      "creditsyncat": 1714694400,
      "status": 4,
      "pinned": false,
      "teamsessionmode": "private",
      "agent": {
        "guid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "title": "Instagram Manager",
        "slug": "instagram-manager",
        "headline": "Automate your Instagram presence with AI",
        "description": "An autonomous agent that manages your Instagram Business account.",
        "cover": "https://cdn.wiro.ai/uploads/agents/instagram-manager-cover.webp",
        "icon": "https://cdn.wiro.ai/uploads/agents/instagram-manager-icon.webp",
        "categories": ["social-media", "marketing"]
      },
      "createdat": 1714608000,
      "updatedat": 1714694500,
      "queuedat": 1714694395,
      "startedat": 1714694400,
      "runningat": 1714694410,
      "stoppingat": null,
      "stopdat": null,
      "errordat": null
    }
  ]
}
```

> **Cover returns scalar useragent fields + the `agent` template summary only.** It does **not** include `setuprequired`, `tokenRates`, `agentModel`, or any composed children (`credentials`, `customskills`, `scheduledskills`, `skills`, `skillsmeta`, `subscription`). The endpoint is optimised for the cover refresh round-trip; call `UserAgent/Detail` afterwards if you need the full composed shape, the agent's `usage` and `spend` included.

#### **POST** /UserAgent/CredentialUpsert

Writes one or more credential fields for one or multiple providers in a single call.

If the agent is **starting** or **running**, an upsert that changes a saved value triggers an automatic restart (see [Automatic Restart](#automatic-restart)).

`CredentialUpsert` writes the agent's credentials: the Telegram, Slack and Discord channels, Twilio Voice, the Wiro project's key and settings such as the support email (see [Agent Credentials](/docs/agent-credentials)). The services the agent works with are connectors: connect them with [`ConnectorConnect`](/docs/agent-connectors#post-useragentconnectorconnect). A `credentialkey` that isn't a credential, a connector's slug included, refuses the whole request (see [Common errors](#credentialupsert-errors)).

Telegram, Slack, and Discord are optional credential groups. A channel appears
in `enabledChannels` automatically when all of its catalog `required_fields`
are complete. Clear any required field to disable it; there is no separate
channel-enable endpoint or persisted switch.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Your UserAgent instance guid |
| `fields` | array | Yes | One or more field rows. Each row has `{ credentialkey, fieldname, fieldvalue, fieldstatus?, parentfield?, ordinal? }`. You can write to more than one `credentialkey` in a single request. |

Each field row:

| Field | Type | Description |
|-------|------|-------------|
| `credentialkey` | string | The credential key: `telegram`, `slack`, `discord`, `twilio-voice`, `wiro`, `var-support-email`, `var-website` or `var-newsletter-test-email`. A key that isn't a credential, a connector's slug included, fails the whole request with one `Unknown credential: <key>. Connectors are connected with UserAgent/ConnectorConnect.` error before the agent or any row is checked, and nothing is saved: connect that service with [`ConnectorConnect`](/docs/agent-connectors#post-useragentconnectorconnect). |
| `fieldname` | string | Field inside that credential: e.g. `"bottoken"`, `"allowedusers"`, `"accountsid"`. Must not start with `_` (reserved for internal sentinels such as `_isoptional`, `_isextra`). |
| `fieldvalue` | string \| number \| array | The value to write. An empty string clears an optional single-value field; send `[]` to clear a list field. Clearing a required field fails validation, except on Telegram, Slack and Discord, where it disables the channel. |
| `fieldstatus` | string | **Server-managed: ignored from the request body for API callers.** The server derives it from the registry (`user` for the values you save). Do not set this field. It is stripped before any write. |
| `parentfield` | string | Optional. The key of a list field (e.g. `"groups"` for Telegram's `groups[]`) when the row sets one field of a single entry in that list. |
| `ordinal` | number | Optional. Array index inside `parentfield`. Defaults to `0`. |

##### Request

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/CredentialUpsert" \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
    "fields": [
      { "credentialkey": "telegram", "fieldname": "bottoken",     "fieldvalue": "123456:ABC-DEF1234ghIkl" },
      { "credentialkey": "telegram", "fieldname": "allowedusers", "fieldvalue": ["123456789"] }
    ]
  }'
```

##### Response

```json
{ "result": true, "applied": 2, "errors": [] }
```

`applied` is the number of rows saved without an error; a row sent with its current value still counts. A secret sent as `"••••••••"`, the mask `UserAgent/Detail` shows for a saved one, keeps the saved value and isn't counted (see [Field-level write rules](/docs/agent-credentials#field-level-write-rules)). Every row is validated before anything is written. If any row fails validation (for example a reserved fieldname or a Wiro-managed field), the whole request is rejected and nothing is saved: the response has `result: false`, one `errors` entry per invalid row, and no `applied`. If a save fails after validation has passed, the other rows are still saved and the response has `result: false`, the `applied` count, and each failed row in `errors`. Re-sending the same request is safe.

> **Twilio Voice: extra response fields.** When any `twilio-voice` field is touched, `CredentialUpsert` also auto-configures each Twilio phone number's `VoiceUrl` and surfaces the result on the response:
>
> | Field | Type | Meaning |
> |-------|------|---------|
> | `twilioWebhooksUpdated` | `string[]` | E.164 numbers whose `VoiceUrl` was just pointed at the Wiro Twilio webhook. |
> | `twilioWebhookSkipped` | `string` | Returned instead of `twilioWebhooksUpdated` when the `VoiceUrl` step was skipped, with the reason: the Twilio credentials are incomplete, the credential has no phone numbers, or none of its numbers is on the Twilio account. |
> | `twilioWebhooksFailed` | `object[]` | One `{ phoneNumber, error }` entry per number whose update Twilio rejected. |
> | `twilioWebhookError` | `string` | Top-level message when the entire VoiceUrl-rewrite flow failed (auth error, network outage). The credential rows are still saved. Only the auto-configuration step failed. |
>
> Treat all four fields as best-effort: the credential write itself never depends on Twilio's API call succeeding. See [Twilio Voice Channel](/docs/integration-twiliovoice-skills) for the full lifecycle.

<a id="credentialupsert-errors"></a>

##### Common errors

Each of these comes back with `result: false` and no `applied`, and nothing is saved:

```json
{
  "result": false,
  "errors": [
    {
      "code": 0,
      "message": "Unknown credential: google-ads. Connectors are connected with UserAgent/ConnectorConnect.",
      "time": 1795113000
    }
  ]
}
```

| Error | Code | When |
|-------|------|------|
| `Request parameter [useragentguid] required` | 0 | `useragentguid` is missing or blank |
| `Request parameter [fields[]] required` | 0 | `fields` is missing, not an array, or empty |
| `Unknown credential: <key>. Connectors are connected with UserAgent/ConnectorConnect.` | 0 | A row's `credentialkey` isn't a credential, such as a connector's slug. One entry for the whole request, before the agent or any other row is checked |
| `User agent not found` | 95 | Unknown guid, or the agent has been deleted |
| `You don't have access to this user agent` | 96 | The caller is neither the agent's owner nor on its team |
| `Only a team admin can perform this action on a team-owned agent.` | 97 | The caller is a plain member of the agent's team |
| `<Field label> is managed by the platform` | 0 | A Wiro-managed field, such as the chat model: pick the model with `UpdateSettings` |
| `<Field label> is required` | 0 | A required field sent empty. On Telegram, Slack and Discord this disables the channel instead |
| `<Field label> has an invalid format` | 0 | The value doesn't match the field's `pattern` |
| `<Field label> must be an array` | 0 | A list field sent as a single value |
| `<Field label> has an invalid value` | 0 | An object sent for a single-value field |
| `agent-fieldname-reserved` | 0 | A `fieldname` starting with `_` |

#### **POST** /UserAgent/CredentialProjectBind

Connects the agent's Wiro project (the `wiro` key under `credentials`) to one of your Wiro projects. You name the project, and Wiro saves that project's API key on the agent. The agent's model runs are paid from the wallet of the workspace that owns the project.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Your UserAgent instance guid |
| `projectid` | string \| number | Conditional | The project's `id` from `POST /Project/List`. A request made with a project API key can leave it out to bind that key's own project. Any other request must send it. |

To pick a project, call `POST /Project/List` with an empty body (`{}`). It returns the projects of the workspace you call from, newest first, up to 100. Each row of `project` has the `id` to send here and the project's `name`.

**Who can bind which project:**

- The caller is the agent's owner or a team admin of its team. With an API key, that is the user who created the key's project.
- The request comes from the agent's workspace: use a team project's key for a team agent and a personal project's key for a personal agent.
- The project belongs to the agent's workspace too. A personal agent takes one of its owner's personal projects. A team agent takes a project of its team: a team admin can bind any of them, and the member who deployed the agent can bind the ones they created.

##### Request

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/CredentialProjectBind" \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321", "projectid": "4821" }'
```

##### Response

```json
{
  "result": true,
  "errors": [],
  "applied": 1,
  "project": { "id": "4821", "name": "Agent models" },
  "restart": "scheduled"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `applied` | `number` | `1` when the agent's saved key changed. `0` when the agent already had this project. |
| `project` | `object` | The bound project: `{ id, name }`, with `id` as a string. |
| `restart` | `string` | What the call did to the agent. `"scheduled"`: it was starting or running and now restarts with the project's key. `"none"`: nothing changed, or it isn't running and uses the key at its next start. `"failed"`: the key is saved, and the running agent picks it up when you stop and start it. |

Binding the project an agent already has changes nothing and restarts nothing. The [`wiro` connector](/docs/agent-connectors#the-wiro-connector) always acts with the project bound here, and connecting it with `ConnectorConnect` and a `wiroprojectguid` binds a project the same way. Changing a project's IP whitelist gives the project a new API secret; to load it, restart the agent with `POST /UserAgent/Update` and a body of `{ "guid": "<useragent-guid>" }`.

Binding doesn't change `status`. An agent at `status: 6` (Setup Required) has no plan: pay it with [`CreateSubscriptionCheckout`](#post-useragentcreatesubscriptioncheckout) (`useprepaid: true`), which queues it.

If you already hold a project's key, [`CredentialUpsert`](#post-useragentcredentialupsert) with `credentialkey` `wiro` and `fieldname` `apikey` saves it too.

##### Common errors

Each of these comes back with `result: false`, and nothing is saved.

| Error | Code | When |
|-------|------|------|
| `Request parameter [useragentguid] required` | 0 | `useragentguid` is missing |
| `projectid is required: send the id of one of your projects from Project/List. Only a request made with a project API key may leave it out, to bind that key's own project.` | 0 | The request has no `projectid` and wasn't made with a project API key |
| `projectid must be a project's id from Project/List.` | 0 | `projectid` isn't a positive whole number |
| `User agent not found` | 95 | Unknown guid, or the agent has been deleted |
| `You don't have access to this user agent` | 96 | The caller is neither the agent's owner nor on its team |
| `Only a team admin can perform this action on a team-owned agent.` | 97 | The caller is a plain member of the agent's team |
| `This agent belongs to a team. Switch to the team context to access it.` | 0 | A team agent called from a personal workspace or a personal project's key |
| `This agent is in your personal workspace. Switch to personal context to access it.` | 0 | A personal agent called from a team workspace or a team project's key |
| `This agent belongs to a different team.` | 0 | A team agent called from another team's workspace or project key |
| `Project not found. Send the id of one of your projects from Project/List: one you created, or any project of a team you are an admin of.` | 0 | The project doesn't exist, or the caller can't bind it |
| `This is a personal agent: bind one of its owner's personal projects. Its model runs are paid from that wallet.` | 0 | A personal agent and a project from another workspace |
| `This is a team agent: bind one of its team's projects. Its model runs are paid from the team wallet.` | 0 | A team agent and a project from another workspace |
| `This project's API key no longer works: the account that created it is not active, so the agent's model runs would fail. Bind another project.` | 0 | The account that created the project is not active |
| `This project's API key no longer works: the person who created it is no longer in the team, so the agent's model runs would fail. Bind another project of the team.` | 0 | The person who created the team project has left the team |
| `The project could not be bound. Try again.` | 0 | Try again |

#### **POST** /UserAgent/CredentialFileUpload

Multipart-upload sibling of `CredentialUpsert` for credential fields whose registry schema declares `type: "fileinput"`, typically large binary assets that don't fit comfortably in a JSON body (e.g. Twilio voice greeting MP3, custom hold music). The endpoint stores the blob under your account's MyUploads area, writes the resulting reference into the credential field the same way `CredentialUpsert` does, and restarts the agent so it uses the new file.

Unlike `CredentialUpsert`, this endpoint expects `multipart/form-data`: pass the metadata as form fields and the blob in a `file` part.

| Form field | Type | Required | Description |
|------------|------|----------|-------------|
| `useragentguid` | text | Yes | Your UserAgent instance guid |
| `credentialkey` | text | Yes | The credential key. Only Twilio Voice (`twilio-voice`) has `fileinput` fields. |
| `fieldname` | text | Yes | The exact `fieldname` whose registry `type` is `"fileinput"` (e.g. `holdaudio` or `holdmusic` on `twilio-voice`). |
| `file` | file | Yes | The blob. Mimetype + size are validated against the registry's `filetypes[]` whitelist and `maxsize` (KB) cap. Default cap is 10 MB when the field omits `maxsize`. |

> **Only Twilio Voice takes a file here.** This endpoint stores the file of a credential field whose `type` is `fileinput`: Wiro keeps the file and the credential keeps a reference to it. The one credential with `fileinput` fields is Twilio Voice (`twilio-voice`): `holdaudio` and `holdmusic`, MP3 or WAV up to 10 MB. A key file for a service the agent works with, such as a Google service account JSON or an App Store Connect private key, belongs to that service's Connector and is not a credential. Send the file's text in `values` on [`POST /UserAgent/ConnectorConnect`](/docs/agent-connectors#post-useragentconnectorconnect): `serviceaccountjson` for Google Play Console (`google-play`), or `privatekey` for App Store Connect (`apple-appstore`). A connector sent here as `credentialkey` answers `Unknown credential: <key>`, and a field of another type `Field is not a fileinput type`.

##### Request

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/CredentialFileUpload" \
  -H "x-api-key: YOUR_API_KEY" \
  -F "useragentguid=f8e7d6c5-b4a3-2190-fedc-ba0987654321" \
  -F "credentialkey=twilio-voice" \
  -F "fieldname=holdaudio" \
  -F "file=@/path/to/greeting.mp3;type=audio/mpeg"
```

##### Response

```json
{
  "result": true,
  "errors": [],
  "url": "https://cdn.wiro.ai/uploads/users/.../holdaudio_1714694400_8273645.mp3",
  "credentialkey": "twilio-voice",
  "fieldname": "holdaudio"
}
```

The `url` is the public URL of the stored file, which the agent uses at runtime. Read the field again to get its current URL.

##### Common errors

| Error | When |
|-------|------|
| `File required (form field name: file)` | Missing the `file` multipart part |
| `Unknown credential: <key>` | `credentialkey` isn't a credential (a connector's slug included) |
| `Unknown field: <name>` | `fieldname` not in the credential's `credential_schema` |
| `Field is not a fileinput type` | The schema field's `type` is not `"fileinput"` (use `CredentialUpsert` instead) |
| `Invalid file type. Allowed: <list>` | Mimetype not in the registry's `filetypes[]` whitelist |
| `File too large. Max: <kb> KB` | Size exceeds the registry's `maxsize` cap (default 10240 KB / 10 MB) |
| `Could not resolve upload folder` / `Upload failed` | The upload failed; usually transient, retry |

#### **POST** /UserAgent/CustomSkillUpsert

Writes a single custom skill: either a **strategy** (instructions read by other skills at runtime) or a **scheduled task** (`cs-cron-*`).

The endpoint auto-normalises the skillkey to its canonical form. Bare slugs become `cs-<slug>`; if you also send `interval` (a non-empty cron string), the slug is treated as a cron and becomes `cs-cron-<slug>`. So `"weekly-health-check"` with `interval: "0 9 * * 1"` is stored as `cs-cron-weekly-health-check`. Pass `interval` (or send the prefixed `cs-cron-…` key explicitly) to land under Scheduled Tasks. Rows created through this endpoint are stored with `usercreated: true`, so they can later be renamed or deleted; updating an existing row keeps its current `usercreated` value, so a preset row stays preset.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Your UserAgent instance guid |
| `skillkey` | string | Yes | The skill key. Strategies use bare names (e.g. `"content-tone"` → stored as `cs-content-tone`). For a scheduled task, send its full key (e.g. `"cs-cron-social-content-scanner"`), or a bare slug together with `interval` (`"weekly-report"` → `cs-cron-weekly-report`). A `cron-<slug>` key becomes `cs-cron-<slug>` too, with or without `interval`. |
| `value` | string | No | Strategy body / scheduled task prompt text. On a template agent, a scheduled task the template brings runs the template's text: a `value` sent for it is saved and shows on Detail and in CustomSkillHistory, but the agent doesn't use it. Every other skill and task runs its saved text, a custom build's bundled tasks included. |
| `interval` | string | No | Cron expression (e.g. `"0 */4 * * *"`). Only persisted on `cs-cron-*` rows. On a scheduled task it must be a schedule the agent can run (see below). |
| `enabled` | boolean | No | Turn the skill on or off. **Writable for both strategies (`cs-*`) and crons (`cs-cron-*`)**. A disabled strategy is suppressed end-to-end (it still appears in the list, but the agent never loads it). Defaults to `true` on insert. |
| `description` | string | No | Only persisted for user-created skills (preset descriptions are template-owned). On a preset row, sending the current description back unchanged is ignored; a different text is rejected with `customskill-preset-description-not-editable`. |

> **Text edits reach a running agent without a restart.** A change to the `value` or `description` of an existing skill or task goes to a running agent right away, and the agent keeps running; a starting agent restarts to load it. A new skill or task, a new `interval`, or turning one on or off with `enabled` restarts a starting or running agent, and so does any change to `cs-approval-policy`. If the running agent can't take the new text, Wiro restarts it instead. `restarting` in the response says whether the call restarted the agent. A template's own scheduled task is the exception: its text never reaches the agent.

> **Schedules the agent can't run are refused.** A scheduled task's `interval` is a cron expression with five fields, `minute hour day month weekday`, such as `0 9 * * 1-5`. A schedule the agent can't run, or one whose date never comes, such as 30 February, is refused before anything is saved, and the error says what is wrong and what to write: `0 25 * * *` gets `This schedule can't run. The hour field takes 0 to 23. A schedule has five fields: minute hour day month weekday, for example 0 9 * * 1-5.`, and `0 0 30 2 *` gets `This schedule never comes up: February has no 30th. Pick a day February has, such as 28.` Only a schedule sent in the request is checked, so a task that already has one can still be edited or turned on and off.

> **A task that is on doesn't always run.** A scheduled task runs only while its gates are open: one of the Connectors in its `requires_connectors` connected, one of the channels or settings in its `requires_credentials` set up, and, for a task Wiro's skills bring, one of those Skills on (see [Scheduled task skill fields](#scheduled-task-skill-fields)). An empty list is no gate, and `enabled: true` doesn't lift one. `CustomSkillUpsert` takes neither list: a task you create here has none and runs on its schedule. Saving or clearing a credential sets `enabled` on every custom skill and scheduled task whose own `requires_credentials` names it: on while one of the credentials it lists is set up, off while none is, whatever `enabled` was before.

##### Request

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/CustomSkillUpsert" \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
    "skillkey": "content-tone",
    "value": "## Brand Voice\nTone: friendly\nTarget Audience: teens on Instagram"
  }'
```

##### Response

```json
{ "result": true, "errors": [], "restarting": false }
```

| Field | Type | Description |
|-------|------|-------------|
| `restarting` | `boolean` | `true` when the call restarted the agent to load the change. `false` when the agent wasn't starting or running, or got the new text without a restart. |

#### **POST** /UserAgent/CustomSkillRename

Renames a user-created custom skill, optionally updating its description in the same atomic write. Only rows with `usercreated: true` can be renamed. Preset-owned rows are refused with `Preset skills cannot be renamed.`

The skillkey flavour is preserved: a `cs-cron-*` scheduled task stays scheduled, a `cs-*` strategy stays a strategy. Cross-flavour renames are rejected. Delete + re-create via `CustomSkillUpsert` with the right kind if you need to switch sections.

Version history is migrated under the new key so the full audit chain stays continuous after the rename, and a new `rename` entry is appended.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Your UserAgent instance guid |
| `oldskillkey` | string | Yes | The skill's current canonical key (e.g. `cs-my-strategy`, `cs-cron-daily-summary`). |
| `newskillkey` | string | Yes | The new skill key. The server canonicalises bare slugs using the flavour of `oldskillkey`: if old is `cs-cron-*` the new slug lands on `cs-cron-*`; otherwise `cs-*`. |
| `description` | string | No | New description. Omit to leave unchanged; pass an empty string to clear. |

> **Restart.** A starting or running agent restarts on success so it uses the renamed key, as it does when a custom skill is added.

##### Request

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/CustomSkillRename" \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
    "oldskillkey": "cs-my-custom-strategy",
    "newskillkey": "cs-my-renamed-strategy",
    "description": "Updated note shown next to the name"
  }'
```

##### Response

```json
{ "result": true, "errors": [], "newskillkey": "cs-my-renamed-strategy" }
```

##### Error cases

| Error | When |
|---|---|
| `Preset skills cannot be renamed.` | Target row has `usercreated: false` (preset-owned). |
| `Scheduled tasks and custom skills cannot be renamed into each other — delete the row and re-create it with the right kind` | Caller tried to rename `cs-cron-*` ↔ `cs-*`. Delete + re-create with the right kind instead. |
| `A skill with that key already exists for this agent` | `newskillkey` already exists on this useragent. |
| `The new skill key is the same as the current one — nothing to rename` | `oldskillkey` equals canonicalised `newskillkey`: nothing to change. |
| `Skill not found` | `oldskillkey` does not exist on the useragent. |
| `Missing useragentguid, oldskillkey, or newskillkey` | One of the three is missing or blank. |
| `Skill key may only contain lowercase letters, digits, and single dashes between segments (e.g. lead-strategy)` | `newskillkey` isn't a valid key. |

#### **POST** /UserAgent/CustomSkillAlternatives

Returns a list of alternative starter templates that the panel's custom-skill picker can offer for a given `skillkey`. Used by the "Browse alternatives" UX when the user wants to swap one bundled cron / strategy for another preset-owned variant without manually rewriting the `value` body.

This endpoint is **read-only**: it does not mutate the useragent. Apply a chosen alternative by calling `CustomSkillUpsert` with the alternative's `value` (and `interval` for crons).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Your UserAgent instance guid (membership check only: the alternatives list is registry-derived, not per-instance). |
| `skillkey` | string | Yes | The skill the user is looking to swap, usually a `cs-*` strategy or a `cs-cron-*` cron currently on the useragent. |

##### Response

```json
{
  "result": true,
  "errors": [],
  "alternatives": [
    {
      "title": "Friendly / casual brand voice",
      "description": "Tone: warm and approachable. Use first names and contractions.",
      "value": "## Brand Voice\nTone: friendly, casual..."
    },
    {
      "title": "Formal / professional brand voice",
      "description": "Tone: polished and authoritative. Avoid slang.",
      "value": "## Brand Voice\nTone: formal..."
    },
    {
      "title": "Daily morning roundup (cron alt)",
      "description": "Posts a 9 AM digest to Telegram with last 24 h activity.",
      "value": "Every morning at 09:00 UTC, summarise overnight activity and post the digest to Telegram.",
      "intervalexpr": "0 9 * * *"
    }
  ]
}
```

Each entry carries `title`, `description` and `value`, plus `intervalexpr` (a cron expression) for cron-flavoured alternatives. The endpoint never returns a `key` field; alternatives are addressed by their position in the list and applied via `CustomSkillUpsert` on the **current** `skillkey` (so the operator can swap the body of `cs-content-tone` between presets without renaming it).

When the registry has no alternatives for the requested `skillkey`, the response is `{ "result": true, "alternatives": [] }`. Empty lists are not an error.

#### **POST** /UserAgent/CustomSkillDelete

Removes a user-created custom skill. The endpoint enforces a **hybrid delete policy** to prevent accidental destruction of registry-owned scaffolding the runtime depends on:

| Row type | Delete result |
|----------|--------------|
| User-created (`usercreated: true`) under a key the agent's template doesn't have | **Allowed**: the row and its version history are deleted, and a starting or running agent restarts. |
| `usercreated: false`: a template's skills and tasks, copied to the agent at deploy, and a custom build's registry rows (e.g. `cs-approval-policy`, bundled `cs-cron-*` tasks) | **Rejected** with `customskill-registry-not-deletable`. Disable it via `CustomSkillUpsert` with `enabled: false` instead. |
| User-created, under a key the agent's template also has | **Rejected** with `customskill-preset-not-deletable`. Disable it via `CustomSkillUpsert` with `enabled: false` instead. |

In both reject branches the response carries `suggestion: "disable-via-upsert"` so panel UIs can offer a "Disable instead" CTA without re-querying the registry. The message is the key itself, as shown below. Deleting a skill also deletes its version history, so it can't be reverted. A key the agent doesn't have deletes nothing and answers `result: true`.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Your UserAgent instance guid |
| `skillkey` | string | Yes | The skill key to remove. User-created rows only. Other rows are refused with `suggestion: "disable-via-upsert"`. |

##### Response (delete allowed)

```json
{ "result": true, "errors": [] }
```

##### Response (preset-owned or registry-owned, rejected with suggestion)

```json
{
  "result": false,
  "errors": [
    {
      "code": 0,
      "message": "customskill-registry-not-deletable"
    }
  ],
  "suggestion": "disable-via-upsert"
}
```

##### Response (your own row under a key the template has, rejected with suggestion)

```json
{
  "result": false,
  "errors": [
    {
      "code": 0,
      "message": "customskill-preset-not-deletable"
    }
  ],
  "suggestion": "disable-via-upsert"
}
```

#### **POST** /UserAgent/CustomSkillHistory

Returns the version history for one custom skill on a useragent: one entry per change, holding the state before it, with diff metadata and the resolved actor. Creating a skill with `CustomSkillUpsert` adds none. Powers the "Version History" modal in the panel; useful for API consumers building audit views.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Your UserAgent instance guid |
| `skillkey` | string | Yes | Canonical skill key (e.g. `"cs-content-tone"`) |
| `startdate` | number | No | UTC epoch seconds: return entries on/after this time |
| `enddate` | number | No | UTC epoch seconds: return entries on/before this time |

##### Response

```json
{
  "result": true,
  "errors": [],
  "preset_default": {
    "value": "## Brand Voice\nTone: friendly...",
    "intervalexpr": null,
    "enabled": true,
    "description": "How the agent should sound across all generated copy."
  },
  "entries": [
    {
      "guid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
      "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
      "skillkey": "cs-content-tone",
      "operation": "update-user",
      "value": "## Brand Voice\nTone: friendly\n...",
      "intervalexpr": null,
      "enabled": true,
      "usercreated": false,
      "prev_value": "## Brand Voice\nTone: professional\n...",
      "prev_interval": null,
      "prev_enabled": true,
      "after_value": "## Brand Voice\nTone: friendly\n...",
      "after_interval": null,
      "after_enabled": true,
      "changed_fields": ["value"],
      "changedby": "ada-uuid",
      "changedby_user": {
        "uuid": "ada-uuid",
        "firstname": "Ada",
        "lastname": "Lovelace",
        "email": "ada@example.com",
        "username": "ada",
        "avatar": "https://cdn.wiro.ai/avatars/ada.webp",
        "avatarinitials": "AL"
      },
      "changedat": 1714694410
    }
  ]
}
```

> **Field semantics.** Each row captures the **BEFORE** state of the action that produced it (the history entry is written before the change is applied). The server-computed `after_*` and `prev_*` fields give you the resolved AFTER + previous-version snapshots without you having to walk the list manually:
>
> - `prev_*`: value as of the immediately-older entry (`null` for the oldest row).
> - `after_*`: value the row was left with after this action committed: pulled from the next-newer entry's BEFORE state, or from the skill's current live state for the newest entry.
> - `changed_fields[]`: names of fields whose value differs from the immediately-older entry. Subset of `["value", "interval", "enabled"]`.
> - `operation`: `update-user` (a save), `rename`, `revert-to-history`, `reset-to-preset`, `clone-deploy` or `seed-custom-build` (written at deploy), or `insert-cascade` / `update-cascade` / `delete-cascade` (a template update).
> - `changedby_user`: resolved actor object (full shape: `uuid`, `firstname`, `lastname`, `email`, `username`, `avatar`, `avatarinitials`). `null` when `changedby` is a system value such as `"system"` or `"backfill-*"`, or when the user record was deleted.

#### **POST** /UserAgent/CustomSkillRevert

Reverts a custom skill to either (a) the agent template's preset default or (b) a specific historical version. Auto-triggers a restart on success unless the action is a no-op.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Your UserAgent instance guid |
| `skillkey` | string | Yes | Canonical skill key |
| `source` | string | Yes | `"preset"` (reset to template default) or `"history"` (jump to a `versionguid`) |
| `versionguid` | string | When `source=history` | The `entries[].guid` from `CustomSkillHistory` |

##### Response

```json
{
  "result": true,
  "errors": [],
  "action": "reverted",
  "current_value": "## Brand Voice\nTone: ...",
  "current_interval": null,
  "current_enabled": true
}
```

`action` is `"reverted"`, `"re-inserted"` (a version of a row that no longer exists, written back), `"reset"` (back to the template's text, interval and switch), `"deleted"` (the template no longer has the skill, so the row is removed) or `"no-op"` (already matches the target).

#### **POST** /UserAgent/CredentialFieldHistory

Returns the earlier values of one credential's fields, newest first (up to 500). Each entry is a value a save replaced, with who replaced it (`changedby`) and when (`changedat`). A first save adds no entry, and neither does a list sent whole (Telegram `groups`, Slack `channels`, Discord `guilds`, website `urls`). A secret's earlier value reads `"[REDACTED]"`. Wiro-managed credentials return an empty `entries[]`.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Your UserAgent instance guid |
| `credentialkey` | string | Yes | Credential key (e.g. `"telegram"`, `"twilio-voice"`) |
| `startdate` | number | No | UTC epoch seconds: return entries on/after this time |
| `enddate` | number | No | UTC epoch seconds: return entries on/before this time |

##### Response

```json
{
  "result": true,
  "errors": [],
  "entries": [
    {
      "guid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
      "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
      "credentialkey": "telegram",
      "fieldname": "allowedusers",
      "fieldvalue": "[\"123456789\"]",
      "fieldstatus": "user",
      "parentfield": null,
      "ordinal": 0,
      "operation": "update",
      "changedby": "ada-uuid",
      "changedby_user": {
        "uuid": "ada-uuid",
        "firstname": "Ada",
        "lastname": "Lovelace",
        "email": "ada@example.com",
        "username": "ada",
        "avatar": "https://cdn.wiro.ai/avatars/ada.webp",
        "avatarinitials": "AL"
      },
      "changedat": 1714694410
    }
  ]
}
```

> `changedby_user` is the resolved actor object (`uuid`, `firstname`, `lastname`, `email`, `username`, `avatar`, `avatarinitials`). It is `null` when `changedby` is a system value such as `"system"` or `"backfill-*"`, or when the user record has been deleted.

#### **POST** /UserAgent/SkillsApply

Applies a batch of skill toggles in a single transactional unit. **This is the only skill-toggle endpoint API consumers should use**. Even when you're flipping a single skill, send it as a one-entry `skills` map. The single-skill `SkillToggle` endpoint also exists, but `SkillsApply` is the one to use from the API.

Every plan includes every skill, so a skill change never moves money: the plan's price and included AI usage stay as they are, and the agent needs no active plan for it. Change the plan itself with [`UpgradeTier`](#post-useragentupgradetier).

Designed for both the Skill Editor modal (multiple toggles in one save) and one-off API mutations:

1. Triggers exactly **one agent restart** after all toggles land.
2. Uses **idempotency**: concurrent calls or client retries can't apply the change twice.
3. **Atomic**: the whole batch lands, or none of it does.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Your UserAgent instance guid (template deploy or custom build) |
| `skills` | object | Yes | Map of `{ "skillname": true \| false }` for every Skill (`util-*`) you want to set. Skills not in the map keep their current state. A Skill you turn on needs the Skills in its `depends_on`, and theirs, on already or in the same map: `SkillsApply` doesn't turn them on and refuses the change with `101`. [`PricingPreview`](#post-useragentpricingpreview) with the same `skillOverrides` lists the whole set in `enabledSkills`. Connectors aren't in this map: connect one with [`ConnectorConnect`](/docs/agent-connectors#post-useragentconnectorconnect). |
| `tier` | string | No | Kept for older clients. Skills never change the plan: a value other than the agent's current plan is refused with `Change the plan with UpgradeTier.` |
| `idempotencyKey` | string | Yes | Caller-generated unique key (UUID recommended), a new one for each change. For 10 minutes, the same key with the same `skills` returns the first call's answer without applying the change again, and the same key with other `skills` is refused with `107`. After that, the key of a change that was applied is spent: a call with it that would change something is refused with `107`, and one that changes nothing answers `noOp: true`. |

**Headers:** No extra header is needed. For team agents, use an API key from a project in the agent's team. Keys from another workspace are rejected. The caller must be the agent's owner or a team admin of its team. Plain team members are refused with code `97`, `Only a team admin can perform this action on a team-owned agent.`

##### Request

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/SkillsApply" \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
    "idempotencyKey": "550e8400-e29b-41d4-a716-446655440000",
    "skills": {
      "util-social-posting-common": true,
      "util-anti-ai-human-copy":    true,
      "util-diagram":               false
    }
  }'
```

##### Response (success)

```json
{
  "result": true,
  "errors": [],
  "tier": "pro",
  "restartTriggered": true,
  "restartedAt": 1714694520,
  "stripeProrationApplied": false,
  "prepaidWalletDelta": null,
  "usedCreditsUsd": 0,
  "pricing": {
    "previousPriceUsd": 30,
    "newPriceUsd": 30,
    "delta": 0,
    "deltaUsd": 0,
    "periodEnd": null,
    "stripeProrationApplied": false,
    "prepaidWalletDelta": null,
    "usedCreditsUsd": 0,
    "enabledSkills": ["util-social-posting-common", "util-anti-ai-human-copy", "util-chat-markdown-reporting"]
  }
}
```

##### Response (no-op short-circuit)

When every entry in your `skills` map already matches the persisted state, the endpoint returns a fast-path `noOp: true` reply with no DB writes and no restart. Use this signal to skip your own post-apply UI churn (toast, refresh) on detected no-op submissions.

```json
{
  "result": true,
  "errors": [],
  "noOp": true
}
```

| Field | Type | Description |
|-------|------|-------------|
| `noOp` | `boolean` | Present and `true` only on the no-op short-circuit response. Absent on the regular success path. When you see `noOp: true`, the rest of the field set (`tier`, `restartTriggered`, `pricing`) is omitted, because there was nothing to apply. |
| `tier` | `string` | The agent's plan (`"starter"`, `"pro"` or `"max"`), which a skill change never moves. |
| `restartTriggered` | `boolean` | `true` when the call changed the skill set: a starting or running agent restarts to load it, and a stopped one loads it at its next start. `false` when nothing on the agent changed. |
| `restartedAt` | `number\|null` | Unix seconds when the change was saved and the restart was asked for. `null` when `restartTriggered` is `false`. |
| `pricing.enabledSkills` | `array<string>` | Final enabled skill set including transitive `depends_on` closure, as a flat array of skill names. The matching `useragent.skills` array on the next `Detail` call is an object array (`{name, enabled, _edited?, _user_created?}`); take `.name` from each entry to compare. |
| `pricing.delta` / `deltaUsd` | `number` | Always `0`: a skill change moves no money. The rest of `pricing` is kept for older clients and repeats the plan as it stands: its price in `previousPriceUsd` and `newPriceUsd`, and `periodEnd: null`; its credit counts are deprecated (see [Fields Kept for Older Clients](#fields-kept-for-older-clients)). `stripeProrationApplied` is always `false`, `prepaidWalletDelta` `null` and `usedCreditsUsd` `0`, in `pricing` and at the top level. |

##### Common error codes

| Code | Meaning |
|------|---------|
| `0` | `Unknown skill: <names>`: a name in `skills` that is not a Skill, such as one that starts with `int-` (Connectors are connected with [`ConnectorConnect`](/docs/agent-connectors#post-useragentconnectorconnect), not toggled). Nothing is changed. A name the agent still has can still be turned off. |
| `101` | `Cannot apply: some skills require other skills to be enabled.`: a Skill that would be on needs one in its `depends_on` that would be off. Body includes `deps[]` (`{ skill, requires }`). Send those Skills in the same map. |
| `102` | `Cannot apply: some skills conflict with each other.`: two Skills that would be on are mutually exclusive. Body includes `conflicts[]`. |
| `104` | `A skill update is already in progress for this agent — please retry shortly.`: another skill change or plan change of this agent is running. Wait and retry. |
| `105` | `Change the plan with UpgradeTier.`: the `tier` sent is not the agent's current plan. Nothing is changed. Change the plan with [`UpgradeTier`](#post-useragentupgradetier), and send skill changes without `tier`. |
| `107` | `This idempotencyKey was already used for a different skill change. Nothing was changed; send a new idempotencyKey.` (the same key with other `skills` within 10 minutes), `This idempotencyKey was already used for an earlier skill change. Nothing was changed; send a new idempotencyKey.` (the key of a change that was applied, used later), or `Cached response corrupt — please retry with a new idempotency key.` Send a new `idempotencyKey`. |
| `108` | `Failed to apply skill changes — please retry.`: nothing was changed. Retry with a new idempotency key. |

#### **POST** /UserAgent/PricingPreview

Previews a plan or skill change without writing anything. It lists the three plans, resolves the skill set (with `depends_on`) and, for an agent with an active plan, says in `planChange` what the change would do today. The Build Your Agent and Skill Editor screens call it as the user picks a plan or toggles skills.

Two body shapes:

##### A. Draft preview (custom builder, no useragent yet)

```json
{
  "draft": true,
  "tier": "pro",
  "skills": ["util-social-posting-common", "util-anti-ai-human-copy"]
}
```

##### B. Existing useragent preview

```json
{
  "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
  "tier": "max",
  "skillOverrides": {
    "util-social-posting-common": true,
    "util-diagram":               false
  }
}
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `draft` | boolean | A | When `true`, no useragent lookup happens; Wiro resolves the `skills` array directly. Used by Build Your Agent. |
| `skills` | `array<string>` | A | Draft mode only: the proposed enabled skill set. |
| `useragentguid` | string | B | Required for non-draft previews. |
| `skillOverrides` | object | No | Override the persisted state with `{ skillname: boolean }` for the preview. Omit for "current state" preview. |
| `tier` | string | No | `"starter"`, `"pro"` or `"max"`: the plan to preview. Defaults to the plan the agent's renewal bills: a scheduled lower plan (`nextplan`), else its own plan; Starter in a draft. A value that names no plan is ignored. The response lists all three plans under `tiers`. |
| `withScheduledTasks` | boolean | No | Body B only. When `true`, the response also carries `scheduledTasks`: the scheduled tasks the `skillOverrides` would stop and start. |

##### Response

A Pro agent previewing Max with 15 days left of 30:

```json
{
  "result": true,
  "errors": [],
  "tier": "max",
  "totalPriceUsd": 100,
  "skillBreakdown": [
    { "skill": "util-social-posting-common", "priceUsd": 0, "billing_model": "tokens" },
    { "skill": "util-anti-ai-human-copy",    "priceUsd": 0, "billing_model": "tokens" }
  ],
  "enabledSkills": ["util-social-posting-common", "util-anti-ai-human-copy"],
  "directSkills":  ["util-social-posting-common"],
  "tiers": {
    "starter": { "priceUsd": 5 },
    "pro":     { "priceUsd": 30 },
    "max":     { "priceUsd": 100 }
  },
  "plans": [
    { "key": "starter", "title": "Starter", "priceUsd": 5,   "includedUsageUsd": 5,   "diskMb": 250 },
    { "key": "pro",     "title": "Pro",     "priceUsd": 30,  "includedUsageUsd": 30,  "diskMb": 500 },
    { "key": "max",     "title": "Max",     "priceUsd": 100, "includedUsageUsd": 100, "diskMb": 1024 }
  ],
  "nextplan": null,
  "planChange": {
    "change": "upgrade",
    "provider": "prepaid",
    "fromTier": "pro",
    "toTier": "max",
    "nextplan": null,
    "priceUsd": 100,
    "effectiveAt": 1714694520,
    "newPeriod": false,
    "periodEnd": 1715990520,
    "secondsLeft": 1296000,
    "chargeNowUsd": 35
  },
  "tokenRates": {
    "default_model": "openai/gpt-5.6-sol",
    "fallback_rate": { "input_per_1m": 625, "output_per_1m": 3750, "cached_input_per_1m": 62.5, "cache_write_per_1m": 781.25 },
    "models": {
      "openai/gpt-5.6-sol": { "input_per_1m": 625, "output_per_1m": 3750, "cached_input_per_1m": 62.5, "cache_write_per_1m": 781.25, "selectable": true, "label": "GPT-5.6 Sol", "tier": "premium" },
      "openai/gpt-5.6-terra": { "input_per_1m": 250, "output_per_1m": 1500, "cached_input_per_1m": 25, "cache_write_per_1m": 312.5, "selectable": true, "label": "GPT-5.6 Terra", "tier": "balanced" },
      "openai/gpt-5.6-luna": { "input_per_1m": 25, "output_per_1m": 150, "cached_input_per_1m": 2.5, "cache_write_per_1m": 31.25, "selectable": true, "label": "GPT-5.6 Luna", "tier": "cheap" }
    }
  }
}
```

`totalPriceUsd` is the previewed plan's price, which is also the AI usage it includes each month; the skills never change it. `plans` lists the three plans with their names. `enabledSkills` is the full closure (including transitive `depends_on`); `directSkills` is just what the user explicitly toggled. Every `skillBreakdown` entry reads `priceUsd: 0`, since every plan includes every skill. `tokenRates` carries the per-model rates used to meter each turn (see [Token Billing](#token-billing)). On an existing agent, `nextplan` is a lower plan already scheduled for its renewal, or `null`.

`scheduledTasks` comes only when the body sends `withScheduledTasks: true`: `{ stop, resume }`, the keys of the scheduled tasks that run now and would not after the change, and of those that would start running. Each task whose own `enabled` is `true` is checked twice, with the skills on now and with the skills the change leaves on, the way the agent runs it (see [Scheduled task skill fields](#scheduled-task-skill-fields)). Both lists are empty when `skillOverrides` is missing or empty, and `scheduledTasks` is `null` when Wiro could not work them out; that is not "no change".

`planChange` comes with a preview of an existing agent that has an active plan, and is `null` otherwise. `planChange.change` says what the previewed `tier` would do: `"upgrade"` shows the charge that comes with a higher plan, `"downgrade"` a lower plan that starts at the renewal with nothing charged now, and `"none"` the agent's own plan or a preview that only changes skills, with no charge. A higher plan also raises the period's included AI usage by the same difference for the time left: once it is made, `usage.includedusd` on [`Detail`](#post-useragentdetail) shows it.

| Field | Type | Description |
|-------|------|-------------|
| `planChange.change` | `string` | `"upgrade"`, `"downgrade"` or `"none"`. |
| `planChange.provider` | `string` | `"prepaid"`: the change is paid from the Wiro balance. |
| `planChange.fromTier` / `toTier` | `string` | The agent's plan and the plan previewed. |
| `planChange.nextplan` | `string\|null` | A lower plan already scheduled for the renewal. |
| `planChange.priceUsd` | `number` | The previewed plan's monthly price, which is also the AI usage it includes each month. |
| `planChange.effectiveAt` | `number\|null` | Unix seconds when the change would take effect: now for a higher plan, `periodEnd` for a lower plan. `null` for `"none"`. |
| `planChange.newPeriod` | `boolean` | `false`: a higher plan starts inside the current period. |
| `planChange.periodEnd` | `number` | Unix seconds when the current period ends, which is when a lower plan starts. |
| `planChange.secondsLeft` | `number` | Seconds left in the current period. |
| `planChange.chargeNowUsd` | `number` | What a higher plan costs now, at list price before any discount: the prorated difference, paid from the balance. `0` for `"downgrade"` and `"none"`. |

#### **POST** /UserAgent/CreateSubscriptionCheckout

Subscribes a useragent that doesn't yet have an active subscription. The plan's price is taken from the Wiro balance, a prepaid subscription row is inserted, and the agent is auto-queued, the same single-call behaviour as `Deploy` with `useprepaid: true`. Always pass `useprepaid: true`.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Your UserAgent instance guid |
| `useprepaid` | boolean | Yes | Must be `true`. Without it, the call asks for a card checkout, which agent plans no longer have: it charges nothing and answers with `retired: true` (see below). |
| `tier` | string | No | `"starter"`, `"pro"` or `"max"`: overrides the useragent's persisted plan so the user can re-subscribe on a different plan without redeploying. Leave it out for the agent's own plan; any other value is refused with `tier must be starter, pro or max`. |

##### Response

```json
{
  "result": true,
  "errors": [],
  "subscriptionId": 8421,
  "tier": "pro",
  "monthlypriceusd": 30,
  "chargedUsd": 30
}
```

`chargedUsd` is what the balance paid. Without `useprepaid: true`, the call is refused and nothing is charged:

```json
{
  "result": false,
  "retired": true,
  "errors": [
    { "code": 0, "message": "Agent plans are paid from your Wiro balance. Add funds, then choose the plan." }
  ]
}
```

If the useragent already has an active subscription, the call rejects with `Subscription already active for this useragent. Cancel or modify the existing subscription instead.` When the balance can't pay the plan, it is refused with code `97` and `neededusd` (see [Paying for Plans](#paying-for-plans)). The call is also refused, and nothing is charged, when:

| Error | When |
|-------|------|
| `A checkout for this agent is already being opened. Try again in a moment.` | Another subscription request for the same agent is in progress |
| `We couldn't confirm this agent's previous checkout. Please try again in a minute.` | Wiro couldn't confirm the agent's current plan or an earlier checkout before charging; nothing is charged. Send the call again in a minute |
| `Another payment from this wallet is still going through. Nothing was charged; please try again in a minute.` | Another plan payment from the same wallet is still going through (code `104`) |
| `The wallet was charged $X.XX, but the plan could not be saved. Please contact support and do not try again.` (code `110`) | With `useprepaid: true`: the wallet paid and the plan could not be saved. Never send the call again: a retry charges again. The agent's plan and included AI usage stay as they were until support finishes the change; the payment is a `plan` row in its Transactions, and its activity log has an `AGENT_PLAN_NOT_SAVED` row for it (see [Plan payments that did not finish](/docs/agent-transactions#plan-not-saved)). `Deploy` with `useprepaid: true` answers the same, keeps the agent and returns its guid in `existingUserAgentGuid` |

#### **POST** /UserAgent/Start

Starts a stopped agent instance. The agent is moved to Queued (status `2`) and then starts. Also valid for agents in Error state (`5`): Start re-queues them for another launch attempt.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `guid` | string | Yes | Your UserAgent instance guid |

##### Response

```json
{
  "result": true,
  "errors": [],
  "useragents": []
}
```

> `useragents` is always returned (empty array on Start) because Start returns the standard agent response shape. Only `result` and `errors` carry the outcome here.

Start will fail (returns `{ "result": false, "errors": [...] }`) if:

- The agent is already running or queued
- The agent is currently stopping
- The agent is at status `6`, with no plan yet: `Agent setup is not complete. Fill in the agent's required settings before starting.` Pay its plan with `CreateSubscriptionCheckout` (`useprepaid: true`), which queues it
- The agent has no active plan: `Subscription required — please subscribe to this agent before starting it.`, whatever its balance
- The agent has used the AI usage its plan includes and the balance is under $0.50: code `97`, with the same message as `Message/Send` and the agent's `usage` as `agentusage` (see [AI Usage and the Balance](#ai-usage-and-the-balance))
- The caller is a plain member of the agent's team: code `97`, `Only a team admin can perform this action on a team-owned agent.`, with no `agentusage`

#### **POST** /UserAgent/Stop

Stops a running agent instance. If the agent is Queued (status `2`), it is immediately set to Stopped. If it is Starting or Running (status `3`/`4`), it moves to Stopping (status `1`) and the agent is shut down gracefully.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `guid` | string | Yes | Your UserAgent instance guid |

##### Response

```json
{
  "result": true,
  "errors": [],
  "useragents": []
}
```

#### **POST** /UserAgent/Delete

Soft-deletes a useragent. Delete stamps `deletedat` (returned in the response) and unpins the agent; it doesn't erase the agent's history (transactions, credential and custom-skill change history, messages). The agent's working files, such as its memory and the files it saved while it ran, are kept for 30 days after the delete and then removed for good; media the agent sent in chat is stored separately and stays. The agent is then excluded from `Detail`, `MyAgents`, `Start`, `Stop`, the agent runtime and its scheduled jobs, and `TransactionList`, `CredentialFieldHistory`, `CustomSkillHistory`, `Logs`, `LogsList`, `LogsFile`, `LogsDelete`, `RunStreamToken`, `Message/History`, `Message/Sessions`, `Message/DeleteSession`, `Message/RenameSession` and `Message/Delete` return `useragent-not-found` (code `95`) for it, so export anything you need before deleting.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Your UserAgent instance guid. `guid` is also accepted as an alias. |

**Headers:** No extra header is needed. The caller must be the row owner or a team admin (plain team members are rejected with code `97`).

##### Guards (run in this order)

1. **Access**: owner of the row or a team admin of the UA's team. Members get `Only a team admin can perform this action on a team-owned agent.` (code `97`); strangers get `You don't have access to this user agent` (code `96`); unknown / already-deleted rows get `User agent not found` (code `95`).
2. **Status**: must be in a clean terminal state: `0` (Stopped), `5` (Error), or `6` (Setup Required); `5` passes only once the agent no longer holds its runtime. Anything in flight (`1` Stopping, `2` Queued, `3` Starting, `4` Running) is rejected with `Stop the agent before deleting it.` (code `0`), and so is an errored agent that still holds its runtime. Stop the agent first and wait for status `0`.
3. **Active subscription**: a subscription with `status: "active"` blocks delete with `Cancel the agent's subscription before deleting it.` (code `0`) until `CancelSubscription` has set it to end (`pendingdowngrade: "cancel"`). After that the agent can be deleted right away: the rest of the paid period is forfeited, nothing is refunded, and the plan ends at `cancelsAt` without renewing. A plan paid by card before agent plans moved to the balance (`provider: "stripe"`) still blocks after `CancelSubscription` until its period ends (`cancelsAt`) and it is marked expired. An expired, cancelled or refunded subscription, or none at all, passes.

Delete is safe to repeat: calling it again on an agent that's already deleted returns `User agent not found` (code `95`, as in guard 1), so treat that code on a retry as already deleted. The stored `deletedat` never changes.

##### Response

```json
{
  "result": true,
  "errors": [],
  "useragent": {
    "guid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
    "deletedat": 1714694400
  }
}
```

##### Common errors

| Error code / message | When |
|----------------------|------|
| `User agent not found` (95) | Unknown guid, or the row is already soft-deleted |
| `You don't have access to this user agent` (96) | Caller is not the owner and not a member of the UA's team |
| `Only a team admin can perform this action on a team-owned agent.` (97) | Caller is a team member but not a team admin on the UA's team |
| `Stop the agent before deleting it.` (0) | Status is `1` / `2` / `3` / `4`, or `5` while the agent still holds its runtime. Call `Stop` first and retry once status reaches `0` |
| `Cancel the agent's subscription before deleting it.` (0) | An active subscription that `CancelSubscription` hasn't set to end. Call `CancelSubscription`, then `Delete` again. A plan paid by card before plans moved to the balance blocks until its period ends (`cancelsAt`); retry once it has expired |

#### **POST** /UserAgent/Logs

Live activity feed for a useragent: what the agent did, when, and which user triggered it. The agent records one event per skill invocation, scheduled task and user message, grouped by day; this endpoint returns the latest N events for a given date, each with the user who triggered it. What people and API keys did to the agent is in the same list, as `AGENT_*` rows; see [Agent Logs](/docs/agent-logs#who-did-what-rows).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Your UserAgent instance guid |
| `date` | string | No | Activity date in `YYYY-MM-DD` (or `"today"`). Default: `"today"`. |
| `lines` | number | No | Tail size: most recent N rows. Default `200`, capped at `5000`. |

**Headers:** No extra header is needed. Access: the agent's owner or a team admin of the agent's team (plain team members are rejected with code `97`).

##### Polling

Poll every 30 seconds or more.

##### Response

```json
{
  "result": true,
  "errors": [],
  "events": [
    {
      "ts": "2026-05-03T14:00:03.000Z",
      "kind": "token_usage",
      "title": "Token Usage",
      "model": "openai/gpt-5.4",
      "tokens": { "input": 3450, "output": 820, "cacheRead": 2400, "cacheWrite": 0, "total": 6670 },
      "tokencost": 5,
      "durationMs": 4200,
      "calls": 2,
      "userUuid": "ada-uuid",
      "user": {
        "uuid": "ada-uuid",
        "firstname": "Ada",
        "lastname": "Lovelace",
        "email": "ada@example.com",
        "avatar": "https://cdn.wiro.ai/uploads/users/ada-avatar.webp",
        "avatarinitials": "AL"
      }
    },
    {
      "ts": "2026-05-03T14:00:01.000Z",
      "kind": "tool_completed",
      "tool": "exec",
      "title": "Drew a diagram: \"Onboarding flow\"",
      "summary": {
        "skill": "util-diagram",
        "action": "create"
      },
      "durationMs": 2480,
      "ok": true,
      "userUuid": "ada-uuid",
      "user": {
        "uuid": "ada-uuid",
        "firstname": "Ada",
        "lastname": "Lovelace",
        "email": "ada@example.com",
        "avatar": "https://cdn.wiro.ai/uploads/users/ada-avatar.webp",
        "avatarinitials": "AL"
      }
    },
    {
      "ts": "2026-05-03T13:30:00.000Z",
      "kind": "cron_finished",
      "title": "Cron ran: Scheduled Skill (cs-cron-social-content-scanner)",
      "summary": { "jobId": "6b1d9e2f-3a4c-4e5b-8f7a-1c2d3e4f5a6b", "status": "ok" },
      "durationMs": 1860,
      "ok": true,
      "userUuid": "system",
      "user": null
    }
  ],
  "date": "2026-05-03",
  "totalLines": 1428
}
```

##### Field reference

| Field | Type | Description |
|-------|------|-------------|
| `events[]` | array | One row per activity entry, **newest first** (descending by `ts`), so `events[0]` is the most recent event. Do not re-reverse for display. |
| `events[].ts` | string | ISO-8601 UTC datetime when the event was emitted (e.g. `"2026-05-03T14:00:01.000Z"`). Parse with `Date.parse(ts)` for arithmetic. |
| `events[].kind` | string | Fine-grained event class. One of: `"turn_started"`, `"turn_ended"` (an LLM turn boundary); `"tool_started"`, `"tool_completed"` (one pair per tool call); `"tool_blocked"` (a tool call the agent's safety rules refused); `"cron_finished"` (a scheduled task finished); `"user_message"` (a message received on a connected Telegram, Slack or Discord channel, not web chat); `"token_usage"` (a billed turn's token usage: chat / Scheduled Task / voice post-call); `"token_usage_idempotent"` (a replayed usage report, already billed, informational only); `"media_relay"` (files from a reply were delivered); `"background_reply"` (a result that finished in the background was delivered to the chat). Rows about what was done to the agent have `AGENT_*` kinds, and two note rows, `"runtime_log_unavailable"` and `"runtime_log_deleted"`, say what part of a day is missing; see [Agent Logs](/docs/agent-logs#who-did-what-rows). Show any kind you don't recognize by its `title`. |
| `events[].tool` | string \| null | Present on `tool_started` / `tool_completed` / `tool_blocked`. The name of the tool the agent used. |
| `events[].toolintegration` | string \| null | On `tool_started` / `tool_completed` when the step works in a connector: the connector's `slug` (for example `"wordpress"`), or a channel's key such as `"telegram"`. Same closed list as on [timeline tool blocks](/docs/agent-messaging#tool-integration-and-action-values). |
| `events[].toolaction` | string \| null | On `tool_started` / `tool_completed` when a word fits the step: what it does (for example `"click"`). Same closed list as on [timeline tool blocks](/docs/agent-messaging#tool-integration-and-action-values). Never set together with `toolintegration`. |
| `events[].title` | string | Human-readable one-line description (always present). |
| `events[].summary` | object \| null | Structured event-specific payload. Treat as opaque and render as JSON when expanding. Secret values (`apikey`, `apppassword`, `clientsecret`, `bearer`, `token`, …) are masked before the event is written. Keys vary per `kind`/`tool`. |
| `events[].durationMs` | number \| null | Wall-clock duration in milliseconds. Populated on `tool_completed`, `turn_ended`, `cron_finished` and `token_usage` events. |
| `events[].ok` | boolean \| null | `true` on success, `false` on failure. Populated on `tool_completed`, `turn_ended` and `cron_finished` events, and always `false` on `tool_blocked`. Pair with `error` for failures. It is always `true` on `AGENT_*` rows. A `turn_ended` for a turn the caller cancelled has no `ok`, and its title reads `Agent turn cancelled`. A `cron_finished` for a Scheduled Task run that the agent's spend limit or Model Access rule paused has no `ok` either, and its title starts with `Paused by a spend limit:` or `Paused by a Model Access rule:`. |
| `events[].error` | string \| null | One-line failure message (when `ok: false`). |
| `events[].model` | string \| null | Canonical model slug billed for the turn. Present on `token_usage` / `token_usage_idempotent` events. |
| `events[].tokens` | object \| null | Token breakdown on `token_usage` events: `{ input, output, cacheRead, cacheWrite, total }`, **nested camelCase** (distinct from the flat lowercase `inputtokens` / `outputtokens` / … columns on message + transaction rows; same underlying data, different shape). |
| `events[].tokencost` | number \| null | The turn's AI usage, in cents: `5` is $0.05. Present on `token_usage` events. |
| `events[].calls` | number \| null | Number of LLM calls made in the billed turn. Present on `token_usage` events. |
| `events[].userUuid` | string \| null | Originating actor's UUID. `"system"` for Scheduled Task runs and internal events. May be missing on older rows, in which case the server falls back to the agent owner. |
| `events[].user` | object \| null | Resolved user shape (`uuid`, `firstname`, `lastname`, `email`, `username`, `avatar`, `avatarinitials`) when the actor is a real user. `null` for `system` events. |
| `date` | string | The date that was actually read (`YYYY-MM-DD`). |
| `totalLines` | number | **Total rows for the day**, who-did-what rows and notes included, whatever the `lines` cap. Use this to show "showing X of Y events" headers. |

**Reading a stopped agent.** When the agent isn't running, or its host doesn't answer, `Logs` still answers `result: true` for a day with who-did-what rows. `events` starts with a `runtime_log_unavailable` note, followed by those rows, and `totalLines` counts the note. An earlier day whose log was deleted starts with a `runtime_log_deleted` note instead. See [Agent Logs](/docs/agent-logs#who-did-what-rows).

##### Common errors

| Error | When |
|-------|------|
| `useragentguid is required` | Missing `useragentguid` in the body |
| `Agent is not assigned to a worker. It may not be running.` | The agent isn't running on a host (never started, stopped or being moved). Start it and retry |
| `Worker not found` | The agent's host is not available right now. Retry later |
| `Agent is temporarily unavailable. Please try again shortly.` | The agent's host did not answer (offline, network blip). Retry |

`Logs`, `LogsFile` and `LogsList` answer with the last three errors only when there are no who-did-what rows to show. `LogsDelete` needs the agent on a host every time.

#### **POST** /UserAgent/LogsList

Lists the dates with activity: days with an activity log and days that only have who-did-what rows. Useful for building a date-picker UI before calling `Logs` / `LogsFile` for that day.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Your UserAgent instance guid |

##### Response

```json
{
  "result": true,
  "errors": [],
  "dates": [
    { "date": "2026-05-03", "sizeBytes": 184320, "compressed": false },
    { "date": "2026-05-02", "sizeBytes": 92160,  "compressed": true  },
    { "date": "2026-05-01", "sizeBytes": 0,      "compressed": false }
  ]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `dates[].date` | string | Activity date in `YYYY-MM-DD` form. Sorted newest-first. |
| `dates[].sizeBytes` | number \| null | Raw byte size of the file on disk (compressed size if `compressed: true`). `0` on a day with who-did-what rows and no log file, for example a day whose log was deleted. `null` when `runtimeUnavailable` is present. |
| `dates[].compressed` | boolean | `true` once the day's log has been compressed (`<date>.jsonl.gz`); `false` for the active day's plain `.jsonl`. |
| `runtimeUnavailable` | string | `"not_running"` or `"no_answer"`. Present only when the agent isn't running or its host doesn't answer and the list holds who-did-what days alone. |
| `note` | string | Present with `runtimeUnavailable`: `The agent's own log days can be read while it runs, so this list may be missing days.` for `not_running`, `The agent's own log days could not be read just now, so this list may be missing days.` for `no_answer`. |

**Reading a stopped agent.** A stopped agent, or one whose host doesn't answer, still answers `result: true` when it has who-did-what days:

```json
{
  "result": true,
  "errors": [],
  "runtimeUnavailable": "not_running",
  "note": "The agent's own log days can be read while it runs, so this list may be missing days.",
  "dates": [
    { "date": "2026-05-03", "sizeBytes": null, "compressed": false },
    { "date": "2026-05-01", "sizeBytes": null, "compressed": false }
  ]
}
```

The host retains activity files for 180 days (rolling); older dates are removed and won't appear here.

#### **POST** /UserAgent/LogsDelete

Deletes the agent's own turns and tool calls for one date, plain or compressed, without waiting for the 180-day rotation. Who-did-what rows stay: the date can stay in `LogsList` with `sizeBytes: 0`, and reads of an earlier day you deleted start with a `runtime_log_deleted` note that says when.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Your UserAgent instance guid |
| `date` | string | Yes | Activity date to delete (`YYYY-MM-DD`). |

**Headers:** No extra header is needed. Access: the agent's owner or a team admin of the agent's team (plain team members are rejected with code `97`).

##### Response

```json
{
  "result": true,
  "errors": [],
  "date": "2026-04-30",
  "removed": { "plain": true, "gz": false }
}
```

Idempotent: deleting an already-gone date returns `result: true` with `removed.plain: false` and `removed.gz: false`.

#### **POST** /UserAgent/LogsFile

Downloads the **full** day's activity log (no `lines` cap). Use this when you need a complete forensic trace. `Logs` is for live-tail UX (capped at 5000 rows). The response is the same `events[]` shape as `Logs`, plus a `truncated` flag.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Your UserAgent instance guid |
| `date` | string | Yes | Activity date to download (`YYYY-MM-DD`). |

**Headers:** No extra header is needed. Access: the agent's owner or a team admin of the agent's team (plain team members are rejected with code `97`).

##### Response

```json
{
  "result": true,
  "errors": [],
  "events": [/* …full day, newest first (descending by ts)… */],
  "date": "2026-04-30",
  "truncated": false
}
```

`events` is sorted **newest first** (descending by `ts`), the same contract as `Logs`, so `events[0]` is the freshest entry whether you're tailing the live day or downloading a historical one. `truncated: true` only when the day's file is larger than 10 MiB: its newest 10 MiB of events are returned. Who-did-what rows are included, and a stopped agent and a deleted day read as on `Logs`.

#### **POST** /UserAgent/RunStreamToken

Returns a token for following the agent's Scheduled Tasks, background runs and model runs live on the Agent WebSocket. Send it in an `agent_run_subscribe` frame: the events that follow say when each run starts, which step it is on and when it ends, with labels only. See [Following an agent's background runs](/docs/agent-websocket#following-an-agents-background-runs).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | The guid of your deployed agent |

**Headers:** No extra header is needed. Access: the agent's owner or a team admin of the agent's team (plain team members are rejected with code `97`). A stopped agent gets a token too.

##### Response

```json
{
  "result": true,
  "runstreamtoken": "Zr8Qm2Kx7VbN4tLpW1sYc9HdF6gJaE3uTo5iRk0nXqM",
  "expiresat": 1793664000,
  "errors": []
}
```

| Field | Type | Description |
|-------|------|-------------|
| `runstreamtoken` | string \| null | An opaque token valid until `expiresat`, 24 to 48 hours after it is issued. `null` when the call fails. Keep it private: whoever holds it can follow the agent's runs until it expires. |
| `expiresat` | number \| null | Unix seconds when the token stops working. When less than 12 hours remain, get a new token and subscribe again with it. `null` when the call fails. |

##### Common errors

A failed call answers `result: false` with `runstreamtoken` and `expiresat` set to `null` and one entry in `errors`.

| Error | Code | When |
|-------|------|------|
| `useragentguid is required` | 0 | `useragentguid` is missing or blank |
| `User agent not found` | 95 | Unknown guid, or the agent has been deleted |
| `You don't have access to this user agent` | 96 | The caller is neither the agent's owner nor on its team |
| `Only a team admin can perform this action on a team-owned agent.` | 97 | The caller is a plain member of the agent's team |
| `runstream-unavailable` | 0 | Following runs live is not available right now. Try again later |

#### **POST** /UserAgent/Pin

Pins or unpins an agent in its workspace. `pinned` is a flag on the agent: on a team agent any team member can set it, and every member's `PinnedAgents` shows it. Pinned agents appear in the global header dropdown (`PinnedAgents`) and get an unread badge from `PinnedUnread`.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Your UserAgent instance guid |
| `pinned` | boolean | Yes | `true` to pin, `false` to unpin |

##### Response

```json
{ "result": true, "errors": [] }
```

#### **POST** /UserAgent/PinnedAgents

Lists the pinned agents of the API key's workspace. Returns the **same composed shape as `MyAgents`**: every field that appears on a `MyAgents` row except `lastactivityat` appears here, just filtered to `pinned: true`.

No request body fields are required: the workspace of your API key's project scopes the response.

##### Response

```json
{
  "result": true,
  "errors": [],
  "useragents": [
    {
      "guid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
      "uuid": "ada-uuid",
      "agentguid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "teamguid": null,
      "title": "My Instagram Bot",
      "description": null,
      "cover": null,
      "categories": ["social-media", "marketing"],
      "tier": "pro",
      "nextplan": null,
      "monthlypriceusd": 30,
      "creditperiod": "2026-05",
      "creditsyncat": 1714694410,
      "usage": {
        "period": "2026-05",
        "resetsat": 1780272000,
        "includedusd": 30,
        "usedusd": 12.4,
        "leftusd": 17.6,
        "renewalusd": 30,
        "frombalanceusd": 0,
        "balanceusd": 42.1,
        "wallet": "personal",
        "minbalanceusd": 0.5,
        "paused": false,
        "pausedreason": null
      },
      "spend": {
        "month": "2026-05",
        "planusd": 30,
        "aiusagebalanceusd": 0,
        "aiusageplanusd": 12.4,
        "modelrunsusd": 3.2,
        "fundsaddedusd": 20,
        "totalusd": 33.2
      },
      "status": 4,
      "pinned": true,
      "teamsessionmode": "private",
      "setuprequired": false,
      "subscription": {
        "plan": "agent",
        "status": "active",
        "amount": 30,
        "currency": "usd",
        "currentperiodend": 1780272000,
        "renewaldate": "2026-06-02T00:00:00.000Z",
        "daysremaining": 28,
        "pendingdowngrade": null,
        "provider": "prepaid"
      },
      "agent": {
        "guid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "title": "Instagram Manager",
        "slug": "instagram-manager",
        "description": "An autonomous agent that manages your Instagram Business account.",
        "cover": "https://cdn.wiro.ai/uploads/agents/instagram-manager-cover.webp",
        "categories": ["social-media", "marketing"],
        "tiers": {
          "starter": { "priceUsd": 5 },
          "pro":     { "priceUsd": 30 },
          "max":     { "priceUsd": 100 }
        },
        "plans": [
          { "key": "starter", "title": "Starter", "priceUsd": 5,   "includedUsageUsd": 5,   "diskMb": 250 },
          { "key": "pro",     "title": "Pro",     "priceUsd": 30,  "includedUsageUsd": 30,  "diskMb": 500 },
          { "key": "max",     "title": "Max",     "priceUsd": 100, "includedUsageUsd": 100, "diskMb": 1024 }
        ]
      },
      "enabledSkills": ["util-social-posting-common", "util-anti-ai-human-copy", "util-chat-markdown-reporting"],
      "tokenRates": {
        "default_model": "openai/gpt-5.6-sol",
        "fallback_rate": { "input_per_1m": 625, "output_per_1m": 3750, "cached_input_per_1m": 62.5, "cache_write_per_1m": 781.25 },
        "models": {
          "openai/gpt-5.6-sol": { "input_per_1m": 625, "output_per_1m": 3750, "cached_input_per_1m": 62.5, "cache_write_per_1m": 781.25, "selectable": true, "label": "GPT-5.6 Sol", "tier": "premium" },
          "openai/gpt-5.6-terra": { "input_per_1m": 250, "output_per_1m": 1500, "cached_input_per_1m": 25, "cache_write_per_1m": 312.5, "selectable": true, "label": "GPT-5.6 Terra", "tier": "balanced" },
          "openai/gpt-5.6-luna": { "input_per_1m": 25, "output_per_1m": 150, "cached_input_per_1m": 2.5, "cache_write_per_1m": 31.25, "selectable": true, "label": "GPT-5.6 Luna", "tier": "cheap" }
        }
      },
      "agentModel": {
        "chatModel": "openai/gpt-5.6-sol",
        "cronModel": "openai/gpt-5.4-mini",
        "voicePrepModel": "openai/gpt-5.4-mini",
        "voicePostcallModel": "openai/gpt-5.4"
      },
      "createdat": 1714608000,
      "updatedat": 1714694400,
      "queuedat": 1714694395,
      "startedat": 1714694400,
      "runningat": 1714694410,
      "stoppingat": null,
      "stopdat": null,
      "errordat": null
    }
  ]
}
```

#### **POST** /UserAgent/PinnedUnread

Returns the latest message GUID per pinned agent. Compare each `lastmessageguid` against the last value you saw client-side to draw an unread badge, the same pattern the Wiro dashboard uses for its global header.

##### Response

```json
{
  "result": true,
  "errors": [],
  "data": [
    { "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321", "lastmessageguid": "5d6e7f80-9a1b-4c2d-8e3f-4a5b6c7d8e01" },
    { "useragentguid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890", "lastmessageguid": null }
  ]
}
```

### Voice & Realtime

Endpoints for browser-based realtime voice sessions, the unified call history for both Web and Twilio channels, and the agent's live Screen. Per-channel setup, session handles, and the WebSocket protocols live on the dedicated pages:

| Operation | Endpoint |
|-----------|----------|
| Start a browser realtime voice session | `POST /UserAgent/Realtime/WebStart`: see [Web Voice](/docs/integration-webvoice-skills) |
| Cancel a pending realtime session | `POST /UserAgent/Realtime/Cancel`: see [Web Voice, Step 3](/docs/integration-webvoice-skills#step-3-optional-cancel-a-stale-session-with-post-useragentrealtimecancel) |
| List recent realtime call sessions | `POST /UserAgent/TwilioCallHistory/List`: see [Twilio Voice, Call History](/docs/integration-twiliovoice-skills#call-history) (returns Twilio **and** Web channel sessions despite the Twilio-named path). |
| Ask whether the agent's Screen can open, and whether Take Control can | [`POST /UserAgent/Realtime/ScreenInfo`](#post-useragentrealtimescreeninfo) |
| Get a one-time ticket for the Screen socket, to watch or to take control | [`POST /UserAgent/Realtime/ScreenStart`](#post-useragentrealtimescreenstart): see [Screen and Take Control in Your App](/docs/agent-chat-integration#screen-and-take-control-in-your-app) |

#### **POST** /UserAgent/Realtime/WebStart

Starts a browser-embedded realtime voice session with the agent. Returns two opaque one-time handles, valid for 5 minutes (until `expiresAt`), and the WebSocket URL the browser opens to stream microphone audio. The browser presents `sessionToken` as the first WS message (`{ type: "session_start", sessionToken }`), and `cancelToken` is for `Realtime/Cancel`. The WebSocket path carries no session identifier.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | The agent must be running (`status: 4`) with the Web Voice Channel Skill (`util-web-channel`) on. The Voice Receptionist and Voice Sales Rep templates have it on. On another agent, turn it on with [`SkillsApply`](#post-useragentskillsapply) together with the two Skills it depends on, Voice Receptionist Rules (`util-voice-receptionist`) and Voice Call Prep Rules (`util-voice-call-prep`): `{ "util-web-channel": true, "util-voice-receptionist": true, "util-voice-call-prep": true }`. Sent alone, it is refused with code `101` and `deps[]` unless those two are already on. Deploy's `skills` turns them on itself. |
| `session_metadata.page_url` | string | No | Page URL the caller opened the mic from (≤ 2048 chars). Echoed back on Call History. |
| `session_metadata.display_identifier` | string | No | Operator-supplied display name. 1-100 chars, Unicode letters / numbers / spaces / `@ . _ - ' +`; other characters silently dropped. |

##### Response

```json
{
  "result": true,
  "correlationId": "voice_3fK9xQ2LmVb7TzR1pWc8NdYa",
  "wsUrl": "wss://socket.wiro.ai/v1/AgentRealtime/Web",
  "sessionToken": "<opaque one-time session handle>",
  "cancelToken": "<opaque one-time cancel handle>",
  "expiresAt": 1748212800000,
  "estimatedReadyMs": 8000
}
```

- **Auth**: same Bearer / API key path as every other `UserAgent/*` endpoint. Bearer requests must come from wiro.ai; API-key requests have no Origin check.
- **Rate limit**: fixed 60 sessions/hour per operator. Sessions that fail to start are not counted.
- **Full WebSocket protocol, control frames, and JS snippet** are in [Web Voice](/docs/integration-webvoice-skills).

##### Common errors

| Error | When |
|-------|------|
| `useragentguid required` | Missing useragent reference. |
| `This agent belongs to a team. Switch to the team context to access it.` | Team agent called from a personal workspace or personal project key by a caller who is no longer a member of the agent's team. |
| `This agent belongs to a different team.` | Team agent called from another team's workspace or project key by a caller who is no longer a member of the agent's team. |
| `Agent is not running` | Useragent is not in `status: 4`. |
| `util-web-channel not enabled` | The Web Voice Channel Skill (`util-web-channel`) is off. Turn it on with `SkillsApply` together with `util-voice-receptionist` and `util-voice-call-prep` (sent alone it gets `101`), or deploy from the Voice Receptionist or Voice Sales Rep template. |
| `Web voice from this origin needs an API key.` | Bearer auth with an Origin outside the allow-list. |
| `Rate limit: max N web voice sessions per hour` | Operator burned through the per-hour cap. |

#### **POST** /UserAgent/Realtime/Cancel

Cancels a `WebStart`-initiated session **before the WebSocket handshake**. Use it when the browser can't progress past the mic-permission prompt, or the user changes their mind. The cancel handle works once; reusing it returns `invalid token`.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `cancelToken` | string | Yes | The `cancelToken` returned by `WebStart`. One-time, valid until `expiresAt`; only the user who called `WebStart` can use it. |

##### Response

```json
{ "result": true, "correlationId": "voice_3fK9xQ2LmVb7TzR1pWc8NdYa", "cancelled": true }
```

| HTTP | Error |
|------|-------|
| 400 | `cancelToken required` |
| 401 | `invalid token` (unknown, already used or expired handle) |
| 403 | `access denied` (the handle was issued to another user) |

> Without this call, the session is released after about 5 minutes. Calling `Cancel` releases it right away.

#### **POST** /UserAgent/TwilioCallHistory/List

Returns the last N realtime voice sessions for a useragent, covering **both Twilio and Web channels** despite the Twilio-named path, since both are stored as messages whose `metadata.type` starts with `realtime_session`. Owner / team-member access only.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Useragent instance guid. |
| `limit` | number | No | Max sessions to return. Default `50`, hard-capped at `200`. Sorted newest-first. |

##### Response

```json
{
  "result": true,
  "errors": [],
  "data": [
    {
      "messageguid": "5d6e7f80-9a1b-4c2d-8e3f-4a5b6c7d8e01",
      "agenttoken": "8a5b9e2f-4d3c-4a01-9c2e-1b6d4e7a9c5d",
      "channel": "twilio",
      "callsid": "CAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      "callerInfo": { "number": "+15551234567", "country": "US" },
      "callerProfile": "Returning caller — last asked about pricing. Mentioned company name 'Acme Corp'.",
      "status": "realtime_session",
      "endReason": "wiro_completed",
      "durationSeconds": 137,
      "modelSlug": "gpt-realtime-mini",
      "startedAt": 1730473321000,
      "endedAt":   1730473458000
    },
    {
      "messageguid": "5d6e7f80-9a1b-4c2d-8e3f-4a5b6c7d8e02",
      "agenttoken": "8a5b9e2f-4d3c-4a01-9c2e-1b6d4e7a9c5d",
      "channel": "web",
      "callsid": "voice-call-7f3c2b1d8e",
      "callerInfo": { "page_url": "https://example.com/contact", "display_identifier": "+15551234567" },
      "callerProfile": null,
      "status": "realtime_session",
      "endReason": "browser_disconnect",
      "durationSeconds": 84,
      "modelSlug": "gpt-realtime-mini",
      "startedAt": 1730473601000,
      "endedAt":   1730473685000
    }
  ]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `messageguid` | string | The guid of the message that holds this call. Use it with `Message/Detail` for the full transcript. |
| `agenttoken` | string | Useragent token. Same value across all rows for a given agent. |
| `channel` | `"twilio"` \| `"web"` | Which voice channel served the call. |
| `callsid` | string | Twilio Call SID for `channel: "twilio"`; the internal session id (`voice-call-*`) for `channel: "web"`. |
| `callerInfo` | object | Twilio rows: `{ number, country }` (E.164 + ISO-2). Web rows: `{ page_url, display_identifier? }`, where `display_identifier` is only present when the embedding page validated a phone-style identifier; `page_url` is the page hosting the widget. |
| `callerProfile` | string \| null | Free-text summary of the caller that the agent writes before the call. `null` until it is ready. |
| `status` | string | `realtime_session_incoming` (call accepted, prep in flight) → `realtime_session_active` (audio flowing) → `realtime_session` (completed normally) or `realtime_session_rejected` (rejected before active state, with `metadata.reason`). |
| `endReason` | string \| null | Set on `realtime_session` rows only. One of: `wiro_completed`, `wiro_cancelled`, `wiro_disconnect`, `wiro_error`, `twilio_disconnect`, `browser_disconnect`, `max_duration`, `spend_limit` (a [spend limit](/docs/spend-limits) was reached during the call), `balance` (the balance ran out during the call). `null` while the call is still in flight or rejected. |
| `durationSeconds` | number \| null | Total elapsed seconds. `null` until end. |
| `modelSlug` | string \| null | Realtime model slug used for this call (e.g. `gpt-realtime-mini`). |
| `startedAt` / `endedAt` | number \| null | Unix epoch ms. `endedAt` stays `null` until the call finishes or is rejected. |

Rows are returned newest-first. Rejected sessions (`realtime_session_rejected`) are intermixed and carry `metadata.reason` (visible by reading the same `messageguid` via `Message/Detail`) with values: `concurrent_limit`, `agent_prep_timeout`, `realtime_ws_open_failed`, `realtime_stream_timeout`. Full field reference: [Twilio Voice, Call History](/docs/integration-twiliovoice-skills#call-history).

#### **POST** /UserAgent/Realtime/ScreenInfo

Says whether the agent's [Screen](#screen-and-take-control) can open for the caller now, and whether Take Control can. Ask it before you offer a Screen button. It never refuses an agent: every no is `result: true` with `available: false` and a `reason`.

**Permission**: whoever may watch the agent (see [Who Can Watch](#who-can-watch)), with a project API key. A key acts as its owner, the person who created its project, and a team project's key opens only that team's agents. A signed-in session works only inside the Wiro panel, so from your own product, call it from your backend with your key. Any other caller, a signed-in session from outside the Wiro panel included, gets `available: false` with `reason: "not_allowed"`.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Your UserAgent instance guid. |

##### Request

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Realtime/ScreenInfo" \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321"
  }'
```

##### Response

```json
{
  "result": true,
  "errors": [],
  "available": true,
  "canControl": true,
  "reason": null
}
```

When the Screen can't open, here because the agent's `screen` setting is `"off"`:

```json
{
  "result": true,
  "errors": [],
  "available": false,
  "canControl": false,
  "reason": "setting_off"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `available` | boolean | `true` when [`ScreenStart`](#post-useragentrealtimescreenstart) can open a view of the agent's screen for this caller now. |
| `canControl` | boolean | `true` when `ScreenStart` can also open Take Control (`control: true`) for this caller: the owner of a personal agent that has never been in a team, or whose browser was reset after it last left one, in the panel or with an API key of one of their personal projects. Always `false` while `available` is `false`. |
| `reason` | string\|null | `null` while `available` is `true`; otherwise why not, one of the values below. |

| `reason` | Why `available` is `false` |
|----------|-----------------------------|
| `not_allowed` | The caller can't watch this agent: it is Studio or the Workflow Agent, the caller is neither its owner nor an admin of its team (see [Who Can Watch](#who-can-watch)), the key belongs to another workspace than the agent, or a signed-in session called from outside the Wiro panel. It is also the answer when no agent has this guid: it is unknown, or the agent was deleted. |
| `private_team` | A team agent whose Chat Mode is `"private"`: its Screen stays closed to everyone. |
| `setting_off` | The agent's `screen` setting is `"off"` (see [Turning the Screen Off](#turning-the-screen-off)). |
| `not_running` | The agent isn't running. Ask again once [`Detail`](#post-useragentdetail) reads `status: 4`. |
| `unsupported` | The agent's computer doesn't offer the Screen yet. It does once the agent has restarted. |
| `disabled` | The Screen is turned off on every agent at the moment. |
| `error` | The check couldn't finish. Ask again in a few seconds. |

When several apply, `reason` is the first in this order: `disabled`, `not_allowed`, `private_team`, `setting_off`, `not_running`, `unsupported`. The only `result: false` is a missing `useragentguid`: `Request parameter [useragentguid] required` (code `0`).

#### **POST** /UserAgent/Realtime/ScreenStart

Issues a one-time ticket for the agent's [Screen](#screen-and-take-control): to watch it, or with `control: true` to take control of it. Your page opens `wsUrl`, sends the ticket as its first message, and the screen then streams over that socket as RFB, the VNC protocol (see [The Screen socket](/docs/agent-chat-integration#the-screen-socket)). A ticket works once and expires 60 seconds after it is issued, so get a new one for every socket you open. A start also adds the Screen rows to the agent's [activity log](#screen-in-the-activity-log).

**Permission**: as for [`ScreenInfo`](#post-useragentrealtimescreeninfo), and a signed-in session from outside the Wiro panel is refused with HTTP 403. `control: true` needs [Take Control](#take-control): the caller must be the owner of a personal agent that has never been in a team, or whose browser was reset after it last left one, and a key acts as its owner.

Call it from your backend. A browser can't call the API with your key, and must never hold it: hand your page only `wsUrl`, `screenToken` and the numbers.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Your UserAgent instance guid. |
| `control` | boolean | No | `true` for a Take Control session. Leave it out, or send `false`, to watch. |

##### Request

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Realtime/ScreenStart" \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321"
  }'
```

Add `"control": true` to the body for Take Control.

##### Response

A view:

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

A Take Control session:

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

| Field | Type | Description |
|-------|------|-------------|
| `wsUrl` | string | The Screen socket. Open it as given; don't build or hardcode the host. |
| `screenToken` | string | The one-time ticket. Send it in the socket's first message within 60 seconds. It is opaque: don't parse it, keep it in memory only, and never put it in a URL or a log. |
| `control` | boolean | `true` when the ticket opens a Take Control session. |
| `canControl` | boolean | Whether this caller may take control of this agent now, as in `ScreenInfo`. A view's answer tells you whether to offer Take Control. |
| `maxSeconds` | number | The longest the session can last: `1800` (30 minutes) to watch, `900` (15 minutes) in control. |
| `idleSeconds` | number | Control only: control ends after this many seconds without a key or pointer event (`120`). |

<a id="screenstart-errors"></a>

##### Common errors

A refused start answers `result: false` with one entry in `errors`, and no ticket. Every answer comes with HTTP 200 except the one marked HTTP 403 and the two marked HTTP 429 below. 95, 96 and 97 are the agent access codes the UserAgent endpoints share, and this endpoint gives 95 and 96 a few sentences of its own; 94, 98, 99, 409, 429 and 503 are this endpoint's own. In the [Error Reference](/docs/error-reference), 96, 97, 98 and 99 mean other things.

```json
{
  "result": false,
  "errors": [
    {
      "code": 94,
      "message": "Screen is off in this agent's settings.",
      "time": 1795201200
    }
  ]
}
```

| Error | Code | When |
|-------|------|------|
| `Request parameter [useragentguid] required` | 0 | `useragentguid` is missing or blank |
| `Open the Screen from the Wiro panel, or ask for it with a project API key.` | 96 | HTTP 403: a signed-in session from outside the Wiro panel. Call `ScreenStart` from your backend with a project API key |
| `Screen is turned off.` | 98 | The Screen is turned off on every agent at the moment |
| `You don't have access to this user agent` | 96 | The agent is Studio or the Workflow Agent, or the caller is neither its owner nor on its team |
| `User agent not found` | 95 | Unknown guid, or the agent has been deleted |
| `Only a team admin can perform this action on a team-owned agent.` | 97 | The caller is a plain member of the agent's team |
| `This API key belongs to another workspace than this agent. Use a key of the agent's own workspace.` | 96 | A team project's key for a personal agent, or for another team's agent |
| `This agent belongs to a team. Switch to the team context to access it.` | 0 | A personal project's key for a team agent, when the key's owner is no longer a member of the team |
| `Screen is off for team agents whose chats are private: the screen shows every chat's work.` | 96 | A team agent whose Chat Mode is `"private"` |
| `The screen could not be checked. Try again.` | 0 | The agent's `screen` setting could not be read. Try again |
| `Screen is off in this agent's settings.` | 94 | The agent's `screen` setting is `"off"` |
| `The agent is not running.` | 95 | The agent's status isn't `4` |
| `Take Control is off for team agents: their browser is shared by the whole team.` | 99 | `control: true` on a team agent |
| `Take Control is off for an agent that was used in a team, because its browser may still hold team members' sign-ins.` | 99 | `control: true` on an agent that was in a team and whose browser hasn't been reset since it left (see [Resetting the Browser](#resetting-the-browser)) |
| `Take Control could not start just now. Try again in a minute.` | 99, 503 | `control: true` when a check before control could not finish. Try again in a minute |
| `Take Control is not available for this agent right now.` | 99 | `control: true` while Take Control can't be used on this agent. Watching still works |
| `The screen is not available on this agent yet. Restart the agent to turn it on.` | 98 | The agent's computer doesn't offer the Screen yet |
| `Too many screen sessions started. Try again in a few minutes.` | 429 | HTTP 429: more than 30 starts in 10 minutes (see [Screen Limits](#screen-limits)) |
| `4 people are watching this agent's screen. Try again in a minute.` | 429 | A view while 4 screens are open on the agent |
| `The agent's screen is not answering right now. Try again in a minute.` | 98 | `control: true` while the agent's computer doesn't answer |
| `The agent is capturing its screen right now. Try again in a minute.` | 409 | `control: true` while the agent takes a screenshot or otherwise captures its screen or a tab |
| `The agent's screen could not be checked. Try again in a moment.` | 503 | `control: true` when the agent's computer didn't say whether it is capturing |
| `Take Control can be started 6 times an hour on this agent. Try again in 12 minutes.` | 429 | HTTP 429: the seventh Take Control start on the agent in an hour. The wait is the time until the oldest of the 6 starts is an hour old |
| `The screen could not be started. Try again.` | 0 | Something went wrong. Try again |

### Retired: Extra Credit Packs

Extra credit packs are retired. An agent has no balance of its own: past its plan's included AI usage it uses the Wiro balance of its workspace, so funds go to that balance (see [Adding Funds](#adding-funds)). `extracreditpacks` on `Agent/List` rows, `Agent/Detail` and under `agent` on agent rows is always `[]`.

#### **POST** /UserAgent/CreateExtraCreditCheckout

Retired. The call charges nothing, changes nothing and answers:

```json
{
  "result": false,
  "retired": true,
  "url": null,
  "errors": [
    { "code": 0, "message": "Extra credit packs are retired. Your agent uses your Wiro balance after its plan's included usage. Add funds to your balance instead." }
  ]
}
```

Detect it by `retired: true`, and add funds to the balance instead.

### Plan Changes & Renewals

Cancel, change or renew an agent's plan. Every charge is paid from the Wiro balance of the agent's workspace (see [Paying for Plans](#paying-for-plans)).

#### **POST** /UserAgent/CancelSubscription

Schedules the subscription to end at the current billing period's expiry (a **cancel-at-period-end** pattern). The agent keeps running on its plan until that moment. No refund is issued for the remaining days: the period was paid up front.

A plan that was paid by card is cancelled the same way, also one that is set to switch to the balance at the end of its period: the switch is dropped, and the plan ends at the end of its period with `pendingdowngrade: "cancel"`. Nothing is charged or refunded. On a team agent, only a team admin or the organization owner can cancel such a plan.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `guid` | string | Yes | Your UserAgent instance guid |

**Headers:** No extra header is needed. For team agents, use an API key from a project in the agent's team. Keys from another workspace are rejected.

##### Response

```json
{
  "result": true,
  "cancelsAt": 1780358400,
  "errors": []
}
```

- `cancelsAt` is the Unix timestamp when the plan ends: one day after `currentperiodend` for a plan paid from the balance, the period end for a plan paid by card.
- Server-side, `subscription.pendingdowngrade` is flipped to `"cancel"` and `subscription.status` stays `"active"` until the period end. Subsequent `UserAgent/Detail` responses reflect this: `subscription.pendingdowngrade = "cancel"` and the usual `currentperiodend`.
- A scheduled move to a lower plan stays: `nextplan` keeps it. When the plan ends, the agent shows that plan and its price (`tier`, `monthlypriceusd`, `nextplan: null`), which is what `RenewSubscription` then charges. Undoing the cancel with `RenewSubscription` keeps the move scheduled, and `UpgradeTier` with the agent's current plan drops it (`nextplan: null`). A plan paid by card is the exception: its cancel drops the move, and `nextplan` goes back to `null`.
- To reverse the cancellation **before** the period ends, call `POST /UserAgent/RenewSubscription`. It clears the flag without charging the balance again, and a plan paid by card goes back to switching to the balance at the end of its period.
- When the plan ends (at `cancelsAt`), Wiro marks the subscription `"expired"` and stops the agent (`status: 0`). At that point the user must call `POST /UserAgent/RenewSubscription` (or `CreateSubscriptionCheckout` for a fresh sub) to continue.

**Common errors:**

| Error | When |
|-------|------|
| `No active subscription found for this agent` | `status != "active"` on the subscription row |
| `User agent not found` | Caller doesn't own the agent and isn't on its team |
| `Only a team admin can perform this action on a team-owned agent.` | Caller is a member of the agent's team but not a team admin (code `97`) |
| `We couldn't schedule the cancellation. Please try again in a minute.` | The cancellation couldn't be saved. Nothing changed |

#### **POST** /UserAgent/UpgradeTier

Moves an active subscription to another plan: `"starter"`, `"pro"` or `"max"`. Despite its name, the endpoint moves an agent down as well as up:

- **A higher plan starts now.** The balance pays the monthly difference for the time left in the current period, by the second, rounded up to the cent and at least one day's worth. The period's included AI usage grows by the difference for that same time, and every renewal includes the new plan in full. The AI usage already used this period stays counted, and a running agent keeps running.
- **A lower plan starts at the next renewal**, when the request sends `allowDowngrade: true`. Without it, a lower `targetTier` is refused and nothing changes, so a client that only means to upgrade never moves an agent down. Nothing is charged or refunded now. The agent keeps its current plan, price and included AI usage until the period ends, and `nextplan` on `UserAgent/Detail` reads the lower plan. The renewal then charges the lower plan's price and includes its AI usage. The flag is only for a lower plan: a higher `targetTier` sent with it, such as from a page that still shows a plan the agent has since left, is refused, and nothing is changed or charged.
- **Asking for the agent's current plan** cancels a scheduled move to a lower plan: `nextplan` goes back to `null`. An agent that still pays a price from before the three plans gets its current plan scheduled instead: `nextplan` names that plan, and the renewal moves the agent to the plan's own price and included AI usage.

A move to a higher plan while a lower one is scheduled cancels the scheduled move first, then upgrades from the current plan. When the balance can't pay the difference, the call is refused with code `97` and `neededusd`, and nothing changes (see [Paying for Plans](#paying-for-plans)). A plan that was paid by card and switches to the balance at the end of its period moves up the same way, paid from the balance.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `guid` | string | Yes | Your UserAgent instance guid |
| `targetTier` | string | Yes | The plan to move to: `"starter"`, `"pro"` or `"max"`. The parameter name is `targetTier`. Passing it as `tier` returns `targetTier must be starter, pro or max`. |
| `allowDowngrade` | boolean | No | `true` to move to a lower plan at the next renewal. Without it, a `targetTier` lower than the agent's plan is refused and nothing changes. Send it only for a lower plan: with a `targetTier` higher than the agent's plan, the request is refused and nothing is changed or charged. The agent's current plan needs no flag. |

**Headers:** No extra header is needed. For team agents, use an API key from a project in the agent's team. Keys from another workspace are rejected.

##### Response

A Pro agent moving to Max with 15 days left of 30:

```json
{
  "result": true,
  "change": "upgrade",
  "tier": "max",
  "previousTier": "pro",
  "targetTier": "max",
  "nextplan": null,
  "effectiveAt": 1715644800,
  "newPriceUsd": 100,
  "periodEnd": 1716940800,
  "chargedUsd": 35.00,
  "proratedCharge": 35.00,
  "errors": []
}
```

A move to a lower plan, sent with `"allowDowngrade": true`, keeps the agent where it is until the renewal:

```json
{
  "result": true,
  "change": "downgrade",
  "tier": "pro",
  "previousTier": "pro",
  "targetTier": "starter",
  "nextplan": "starter",
  "effectiveAt": 1716940800,
  "startsAt": 1716940800,
  "newPriceUsd": 5,
  "periodEnd": 1716940800,
  "errors": []
}
```

Asking for the agent's current plan while a lower one is scheduled answers `change: "downgrade-cancelled"` with `nextplan: null`. For an agent that still pays a price from before the three plans, `nextplan` names its current plan instead, and `startsAt` and `newPriceUsd` give the renewal that moves it to that plan's own price:

```json
{
  "result": true,
  "change": "downgrade-cancelled",
  "tier": "pro",
  "previousTier": "pro",
  "targetTier": "pro",
  "nextplan": "pro",
  "effectiveAt": 1715644800,
  "periodEnd": 1716940800,
  "startsAt": 1716940800,
  "newPriceUsd": 30,
  "errors": []
}
```

| Field | Type | Description |
|-------|------|-------------|
| `change` | `string` | `"upgrade"`, `"downgrade"` or `"downgrade-cancelled"`. |
| `tier` | `string` | The plan the agent is on after the call. |
| `previousTier` / `targetTier` | `string` | The plan it was on and the plan asked for. |
| `nextplan` | `string\|null` | The plan scheduled for the renewal after the call, or `null`. |
| `effectiveAt` | `number\|null` | Unix seconds when the change takes effect: now for an upgrade and for a cancelled downgrade, the renewal for a downgrade. |
| `newPriceUsd` | `number` | The new plan's monthly price, which is also the AI usage it includes each month; for a downgrade, from the renewal on. A cancelled downgrade has it only when `nextplan` names the current plan: that plan's price from the renewal on. |
| `chargedUsd` | `number` | Upgrade: what the balance paid now, in USD. `proratedCharge` carries the same amount. |
| `startsAt` | `number` | Downgrade: the moment the lower plan starts, the same as `effectiveAt`. Cancelled downgrade with `nextplan` set: the renewal that moves the agent to its plan's own price. |
| `periodEnd` | `number` | Unix seconds when the current period ends. |

#### **POST** /UserAgent/RenewSubscription

Two distinct operations share this endpoint depending on the subscription's current state:

1. **Undo-cancel**: active subscription with `pendingdowngrade: "cancel"` → clears the flag, **no wallet charge**.
2. **Renew**: subscription in `"expired"` status → renews the same subscription for a new 30-day period, charges the balance the plan's price (a scheduled lower plan's when `nextplan` is set), and queues a stopped or errored agent so it starts again.

The endpoint inspects the current subscription state and picks the right operation; the caller doesn't choose.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `guid` | string | Yes | Your UserAgent instance guid |

**Headers:** No extra header is needed. For team agents, use an API key from a project in the agent's team. Keys from another workspace are rejected.

> A renewal charges the agent's plan price and includes the plan's AI usage in full. When a lower plan is scheduled (`nextplan`), the renewal charges for that plan and includes its AI usage instead, and clears `nextplan`. Once a plan has ended, the agent shows the plan its renewal takes and that plan's price: `tier` names it, `nextplan` is `null` and `monthlypriceusd` is the price. A renewal never charges more than `monthlypriceusd` shows. Skills never change what a renewal costs.

##### Response: undo-cancel

Called while the subscription is still `"active"` with a pending cancel flag set by `CancelSubscription`:

```json
{
  "result": true,
  "action": "undo-cancel",
  "errors": []
}
```

- Clears `subscription.pendingdowngrade` back to `null`. A plan paid by card goes back to switching to the balance at the end of its period (`nextprovider: "prepaid"`).
- **No wallet charge**: you've already paid for the full period.
- Agent status is unchanged (still running / stopped / whatever it was).

##### Response: renew

Called after the subscription has expired (Wiro marked it `status: "expired"` when the plan ended and stopped the agent). The renewal rolls the existing expired subscription forward into a fresh 30-day `active` row instead of inserting a new one:

```json
{
  "result": true,
  "action": "renewed",
  "plan": "agent",
  "tier": "starter",
  "amount": 5,
  "chargedUsd": 5,
  "errors": []
}
```

- Renews the subscription in place: `status` becomes `"active"`, a new 30-day period starts now (`currentperiodend` moves to now + 30 days), and `pendingdowngrade` is cleared to `null`.
- `amount` is the plan's price; `chargedUsd` is what the balance paid (a user or team discount lowers it), taken from the owner's wallet for a personal agent or the team's wallet for a team agent.
- `tier` names the plan the renewal charged.
- Starts the period's included AI usage again in full and stamps the new `creditperiod`.
- If the agent was in `status: 0` (Stopped) or `5` (Error), it's auto-queued back to `2` (Queued). It starts again without an extra `Start` call. Statuses `1`/`2`/`3`/`4` are already in progress and settle on their own.

**Common errors:**

| Error | When |
|-------|------|
| `Subscription is already active` | Called on an active subscription with **no** pending cancel (nothing to do) |
| `Subscription is already active. It renews from your balance when its period ends.` | Called on a plan paid by card that already switches to the balance at its period end (nothing to do) |
| `No expired subscription found to renew` | No active sub and no expired sub: agent was never subscribed, or data is gone |
| `Your balance is $3.10; this plan needs $30.00. Add funds to continue.` (the amounts; a team agent's starts `The team's balance is`) | The balance can't pay the renewal (code `97`, with `neededusd`). Nothing is charged |
| `This plan now renews on the Max plan at $100.00 a month, not the $70.00 it showed. Nothing was charged. Renew again to pay the new price.` (the plan's name and prices) | The renewal costs more than the agent's `monthlypriceusd` showed. Nothing is charged, and the agent now shows the renewal's plan and price (`tier` and `monthlypriceusd`, with `nextplan` cleared). Show the new price, then call `RenewSubscription` again to pay it |
| `A checkout for this agent is already being opened. Try again in a moment.` | Another subscription request for the same agent is in progress; nothing is charged |
| `We couldn't confirm this agent's previous checkout. Please try again in a minute.` | Wiro couldn't confirm the agent's current plan or an earlier checkout before charging; nothing is charged |
| `Another payment from this wallet is still going through. Nothing was charged; please try again in a minute.` | Another plan payment from the same wallet is still going through (code `104`); nothing is charged |
| `The wallet was charged $X.XX, but the renewal did not finish. Please contact support and do not try again.` (code `110`) | The wallet paid and the renewal could not be saved. Never call `RenewSubscription` again for it: a retry charges again. The agent's plan and included AI usage stay as they were until support finishes the renewal; the payment is a `plan` row in its Transactions, and its activity log has an `AGENT_PLAN_NOT_SAVED` row for it (see [Plan payments that did not finish](/docs/agent-transactions#plan-not-saved)) |

##### Full subscription lifecycle (prepaid)

```
                  Deploy (wallet charged, period starts)
                         │
                         ▼
              ┌────────────────────────┐
              │ status: "active"       │
              │ pendingdowngrade: null │◄──────── RenewSubscription
              └───────────┬────────────┘          (undo-cancel, no charge)
                          │                       ▲
                          │ CancelSubscription    │
                          ▼                       │
              ┌────────────────────────┐          │
              │ status: "active"       │──────────┘
              │ pendingdowngrade:      │
              │   "cancel"             │
              └───────────┬────────────┘
                          │ cancelsAt reached
                          │ (the plan ends)
                          ▼
              ┌────────────────────────┐
              │ status: "expired"      │
              │ useragent.status: 0    │◄───┐
              └───────────┬────────────┘    │
                          │                 │
                          │ RenewSubscription (wallet charged,
                          │ new 30-day period, agent queued to start)
                          ▼                 │
              ┌────────────────────────┐    │
              │ same subscription row  │────┘
              │ status: "active"       │
              │ new 30-day period      │
              └────────────────────────┘
```

## Pricing Summary

| Component | Source | Notes |
|-----------|--------|-------|
| **Plan price** | `plans[].priceUsd` | $5, $30 or $100 a month, the same for every template and custom build, paid from the Wiro balance. The agent's own price is `monthlypriceusd`. |
| **Included AI usage** | `plans[].includedUsageUsd` | $5, $30 or $100 of AI usage a month: the plan's own price. Every renewal includes it in full: the current plan's (`usage.renewalusd`), or the scheduled plan's when `nextplan` is set. `usage.includedusd` is what the current period includes, and usage it leaves unused doesn't carry over. |
| **AI usage past the plan** | `usage.balanceusd` | Paid from the Wiro balance of the agent's workspace, at the same token rates. A new turn needs an active plan, and included usage left or a balance of at least $0.50. |
| **Disk** | `plans[].diskMb` | 250 MB, 500 MB or 1 GB for the agent's files: its workspace, generated media and temporary files. The agent's usage is `disk` on `UserAgent/Detail`. |
| **Skills** | `Skills/List` | Every plan includes every skill. Turning one on or off costs nothing. |
| **Per-turn token cost** | `tokenRates` (per-model) | Each chat, Scheduled Task, voice-prep and voice post-call turn is priced by the tokens its model uses, with input, cache read, cache write and output priced separately. The same on every plan: a larger plan includes more AI usage. |
| **Model runs** | The task's `totalcost` | Models the agent runs, such as images and video, are paid from the wallet of its Wiro project at each model's own price. |

### Payment Method

Agent plans are paid from your Wiro balance, in the dashboard, the API and MCP alike: a new plan, a move to a higher plan and every renewal are charged to the balance of the agent's workspace, and an agent plan has no card payment. Always pass `useprepaid: true` on `Deploy` and `CreateSubscriptionCheckout`. Make sure the balance covers the plan's price before calling them; otherwise the call is refused with code `97` and `neededusd` (see [Paying for Plans](#paying-for-plans)). The same balance pays the agent's AI usage past its plan.

### AI Usage and the Balance

AI usage is counted as the agent works, not at `Message/Send` time. Wiro prices the tokens of each call with the per-model `tokenRates` and takes the cost from the plan's included usage while it lasts, then from the balance. You don't send anything: billing is fully server-side. The agent's `usage` shows where it stands: `usedusd` and `leftusd` of this period's `includedusd`, `frombalanceusd` taken from the balance, and `balanceusd`, the balance it can still use. Per-turn token counts and cost also ride on each assistant message and arrive over the message WebSocket as an `agent_usage_report` frame (see [Agent Messaging](/docs/agent-messaging) and [Agent WebSocket](/docs/agent-websocket)).

A new turn needs an active plan, and included usage left or a balance of at least $0.50 (`usage.minbalanceusd`). When the included usage is used up and the balance is under $0.50, the agent pauses: `usage.paused` reads `true` with `pausedreason: "balance"`, and `POST /UserAgent/Message/Send` and `POST /UserAgent/Start` answer code `97` with a sentence for whoever pays for the agent and the agent's `usage` as `agentusage`, whose `resetsat` is the end of the plan's period. A turn that is already running stops at its next model call and ends with `[CREDITS_EXHAUSTED]` (see [Failed turns](/docs/agent-messaging#failed-turns)). The calls it made before that are still charged, so the balance can end a few cents lower, even below zero, as it can with model runs. Start still needs an active plan first: an agent without one gets `Subscription required…`, whatever its balance. Tell this refusal by `agentusage`: a plan payment the balance can't cover carries `neededusd` instead, and a plain team member's code `97` carries neither. Send's answer:

```json
{
  "result": false,
  "errors": [
    { "code": 97, "message": "My Instagram Bot used the $30.00 of AI usage its plan includes this month, and your balance is under $0.50. Add funds to keep it running, or it starts again when the plan renews on 1 June 2026." }
  ],
  "messageguid": null,
  "agenttoken": null,
  "status": null,
  "agentstatus": 4,
  "agentusage": {
    "period": "2026-05",
    "resetsat": 1780272000,
    "includedusd": 30,
    "usedusd": 30,
    "leftusd": 0,
    "renewalusd": 30,
    "frombalanceusd": 8.65,
    "balanceusd": 0.31,
    "wallet": "personal",
    "minbalanceusd": 0.5,
    "paused": true,
    "pausedreason": "balance"
  }
}
```

The date is left out when the plan's renewal can't be read, and for a team agent the sentence says `the team's balance`. In Telegram, Slack and Discord the agent tells people `This agent is paused for now. It runs again once its owner adds funds or its plan renews.`, with no amount. Once funds are added, the agent answers again.

An agent runs only while its plan is active, whatever its balance. When its plan ends, the agent stops and its `usage` reads `paused: true` with `pausedreason: "plan"`, as does an agent that never had a plan. Adding funds doesn't start it: renew the plan with [`RenewSubscription`](#post-useragentrenewsubscription), or start a new one with [`CreateSubscriptionCheckout`](#post-useragentcreatesubscriptioncheckout) and `useprepaid: true`. Either call queues the agent to start. Until then, `Start` answers `Subscription required…`. A message sent before the agent has stopped gets code `97` from `Message/Send`, with `agentstatus`, `agentusage` and `<agent> has no active plan. Choose a plan to keep it running.`

On each renewal the included usage starts again in full (`usedusd` back to `0`), and `usage.period` and `creditperiod` advance to the new `'YYYY-MM'` window. Funds added to the balance reset nothing: the agent just has more to use.

For the full record (every AI usage charge, model run, plan payment and funds added), call [`POST /UserAgent/TransactionList`](/docs/agent-transactions#tx-transactionlist) (see [Agent Transactions](/docs/agent-transactions)).

## Error Messages

Agent-specific errors you may encounter:

| Error | When |
|-------|------|
| `Agent not found` | The `agentguid` or `slug` does not match any catalog agent |
| `User agent not found` | The `guid` does not match any of your deployed instances |
| `Agent not found or inactive` | The catalog agent exists but is disabled |
| `Agent is already running` | Start called on an agent with status `3` or `4` |
| `Agent is already queued to start` | Start called on an agent with status `2` |
| `Agent is already stopped` | Stop called on an agent with status `0` |
| `Agent is currently stopping, please wait` | Start called on an agent with status `1` |
| `Agent is in error state, use Start to retry` | Stop called on an agent with status `5` that has nothing left to stop; an errored agent that still holds its runtime is accepted and moves to `1` (Stopping) |
| `Duplicate deploy: an identical agent ("<title>") was already deployed Ns ago. Use the existing one, or wait a few seconds and retry.` | `Deploy` called a second time within 10s for the same caller, template and team (custom builds: same caller, `title` and team). Carries `errors[0].code: 99` and a top-level `existingUserAgentGuid` field. |
| A sentence that says what is wrong and what to write, such as `This schedule can't run. The hour field takes 0 to 23. A schedule has five fields: minute hour day month weekday, for example 0 9 * * 1-5.` or `This schedule never comes up: February has no 30th. Pick a day February has, such as 28.` | `CustomSkillUpsert` with an `interval` the agent can't run on a scheduled task, or one whose date never comes. Nothing is saved. |
| `<skillkey>:` followed by the same sentence | `Deploy` with a `customskills` entry whose `interval` the agent can't run, or whose date never comes. Nothing is created or charged. |
| `A deploy takes up to 50 entries in customskills, and this one sent <n>. Send at most 50, then add the rest with /UserAgent/CustomSkillUpsert once the agent is deployed.` | `Deploy` with more than 50 `customskills` entries. Nothing is created or charged. |
| `Agent setup is not complete. Fill in the agent's required settings before starting.` | Status is `6`: the agent has no plan. Pay it with `CreateSubscriptionCheckout` (`useprepaid: true`), which queues it. Credentials and connectors never hold an agent at status `6`. |
| `Subscription required — please subscribe to this agent before starting it.` | `Start` called on an agent with no active plan, whatever its balance. Renew a plan that ended with `RenewSubscription` (`{ guid }`). For an agent that never had a plan, `RenewSubscription` answers `No expired subscription found to renew`: start one with `CreateSubscriptionCheckout` (`useprepaid: true`). |
| `Subscription already active for this useragent. Cancel or modify the existing subscription instead.` | `CreateSubscriptionCheckout` called when a sub already exists |
| `Change the plan with UpgradeTier.` | `SkillsApply` with a `tier` other than the agent's current plan |
| `tier must be starter, pro or max` | `Deploy` or `CreateSubscriptionCheckout` with a `tier` that names no plan. Nothing is created or charged. |
| `Unknown skill: <name>.`, or for a name that starts with `int-`, `Unknown skill: <name>. Connectors are connected with UserAgent/ConnectorConnect, not turned on as skills.` | `Deploy` with a `skills` name that `Skills/List` doesn't list. Nothing is created or charged |
| `Unknown credential: <key>. Connect a connector after the deploy with UserAgent/ConnectorConnect.` | `Deploy` with a `credentials` key that isn't a credential, such as a connector's slug. Nothing is created or charged |
| `Unknown credential: <key>. Connectors are connected with UserAgent/ConnectorConnect.` | `CredentialUpsert` with a `credentialkey` that isn't a credential, such as a connector's slug. Nothing is saved |
| `Unknown skill: <names>` (code `0`) | `SkillsApply` with a name that `Skills/List` doesn't list. Nothing is changed |
| `targetTier must be starter, pro or max` | `UpgradeTier` with a `targetTier` outside the closed enum (typos, missing parameter name, etc.) |
| `Already on the Pro plan.` (the plan's name) | `UpgradeTier` with the agent's current plan when no lower plan is scheduled: no-op |
| `The Starter plan is smaller than this agent's Pro plan, so this is not an upgrade. Nothing was changed. A move to a smaller plan starts at the next renewal; to ask for it, send allowDowngrade: true.` (the plans' names) | `UpgradeTier` with a `targetTier` lower than the agent's plan and no `allowDowngrade: true`. Nothing is changed or charged |
| `This agent is on the Starter plan now, so Pro is an upgrade. Nothing was changed. Reload the plan and ask again.` (the plans' names) | `UpgradeTier` with `allowDowngrade: true` and a `targetTier` higher than the agent's plan, such as after the plan changed in another tab or at a renewal. Nothing is changed or charged |
| `No active plan. Use /UserAgent/CreateSubscriptionCheckout with useprepaid: true to start one on the plan you pick.` | `UpgradeTier` called without an active subscription |
| `This plan is set to end at the end of its period, so there is no renewal to change. Renew it first.` | `UpgradeTier` to a lower plan while the subscription is cancelled at period end. Undo the cancel with `RenewSubscription` first |
| `The move to the Starter plan started with this billing period, and its payment moves the agent there, so it can no longer be undone. Nothing was changed. Once the agent shows the Starter plan, change the plan again.` (the plan's name) | `UpgradeTier` with the agent's current plan, on a plan paid by card whose scheduled lower plan already started with its new period. Nothing is changed |
| `This plan is set to end when its period ends, so it cannot be changed. Renew it first: it then renews from your balance.` | `UpgradeTier` on a plan paid by card that is set to end. Undo the cancel with `RenewSubscription` first; nothing is charged |
| `We couldn't read this plan's billing. Nothing was changed; please try again in a minute.` | `UpgradeTier` or `RenewSubscription` on a plan paid by card when its card billing can't be read; nothing is charged |
| `Your balance is $3.10; this plan needs $100.00. Add funds to continue.` (the amounts; a team agent's starts `The team's balance is`) | `Deploy`, `CreateSubscriptionCheckout`, `UpgradeTier` or `RenewSubscription` when the balance can't pay the plan (code `97`, with `neededusd`). Nothing is created or charged |
| `Wallet deduction failed: {error}` | `Deploy` or `CreateSubscriptionCheckout` with `useprepaid: true`, `RenewSubscription` or `UpgradeTier`: the wallet write itself failed (rare; transient backend error); nothing was charged |
| `Another change to this agent's plan is going through. Nothing was changed; please try again in a minute.` | `UpgradeTier` (code `104`) while a skill change or another plan change of the same agent is going through |
| `The agent's plan changed while this was asked for. Nothing was changed; please retry.` | `UpgradeTier` when the agent's plan ended or moved off the wallet after the call was made |
| `Could not read the agent's plan. Nothing was changed; please retry.` | `UpgradeTier`: the agent's plan could not be read |
| `Another payment from this wallet is still going through. Nothing was charged; please try again in a minute.` | `Deploy` or `CreateSubscriptionCheckout` with `useprepaid: true`, `RenewSubscription` or `UpgradeTier` (code `104` on each of them) while another plan payment from the same wallet is going through. A `Deploy` refused this way creates no agent |
| `The wallet was charged $X.XX, but the plan could not be saved. Please contact support and do not try again.`, the same with `the renewal did not finish` or `the plan change did not finish` (code `110`) | `Deploy` or `CreateSubscriptionCheckout` with `useprepaid: true`, `RenewSubscription` or `UpgradeTier`: the wallet paid and the change could not be saved. Never send the call again: a retry charges again. Match code `110`, not the sentence. The agent's plan and included AI usage stay as they were until support finishes the change (see [Plan payments that did not finish](/docs/agent-transactions#plan-not-saved)). A `Deploy` answered this way keeps the agent and returns `existingUserAgentGuid` |
| `Agent plans are paid from your Wiro balance. Add funds, then choose the plan.` | `CreateSubscriptionCheckout` without `useprepaid: true`: card checkouts for agent plans are retired. The answer carries `retired: true`, and nothing is charged |
| `Extra credit packs are retired. Your agent uses your Wiro balance after its plan's included usage. Add funds to your balance instead.` | `CreateExtraCreditCheckout`, which is retired. The answer carries `retired: true`, and nothing is charged |
| `Project not found. Send the id of one of your projects from Project/List: one you created, or any project of a team you are an admin of.` | `CredentialProjectBind` with a project that doesn't exist or that the caller can't bind. See its [other errors](#post-useragentcredentialprojectbind) |
| `Agent not found or access denied` | Message endpoint with invalid useragentguid |
| `User agent not found` (code `95`) | `Message/Send`, `Message/History`, `Message/Sessions`, `Message/DeleteSession`, `Message/RenameSession` or `Message/Delete` called for an agent that has been deleted |
| The sentence for the agent's status: `Agent is stopped. Start it before sending messages.` (status `0`), `Agent is stopping. Please wait a moment and try again.` (status `1`, when the agent is shutting down to stay stopped), `Agent is restarting. Please wait a moment and try again.` (status `1`, when the agent is shutting down to start again, as in a [restart](#automatic-restart)), `Agent is starting up. Please wait a moment and try again.` (status `2` or `3`), `Agent is in error state. Restart it before sending messages.` (status `5`) or `Agent setup is incomplete. Complete the setup before sending messages.` (status `6`) | `Message/Send` while the agent isn't running (any status other than `4`), for every message Wiro doesn't answer itself as a setup reply (see [Replies Wiro handles itself](/docs/agent-messaging#handled-setup-replies)). Response includes `agentstatus` (the integer) so your client can branch on it. |
| `My Instagram Bot used the $30.00 of AI usage its plan includes this month, and your balance is under $0.50. Add funds to keep it running, or it starts again when the plan renews on 1 June 2026.` (the agent's name, the amount and the renewal date, left out when it can't be read; for a team agent, `the team's balance`) | `Message/Send` or `Start` (code `97`) while the agent has used the AI usage its plan includes and the balance is under $0.50. The response includes `agentusage` (the agent's `usage`), and Send's also `agentstatus`, so your client can offer to add funds. |
| `My Instagram Bot has no active plan. Choose a plan to keep it running.` (the agent's name) | `Message/Send` (code `97`) to an agent whose plan has ended, before it has stopped. The response includes `agentstatus` and `agentusage` with `pausedreason: "plan"`. Adding funds doesn't help: call `RenewSubscription`, or `CreateSubscriptionCheckout` with `useprepaid: true`. |
| A spend limit refusal (code `93`), such as `This agent's monthly spend limit is reached ($20.35 of $20.00). It resets on December 1, 2026 at 00:00 UTC.` | `Message/Send` while the agent's own [spend limit](/docs/spend-limits) is used up or, once its included AI usage is used up, a limit of the wallet that covers it: the account's or team's, or the `agent` surface's. The response includes `agentstatus`. Paying from the balance with `Deploy`, `CreateSubscriptionCheckout`, `UpgradeTier` or `RenewSubscription` is refused the same way when the price would take spending over a limit of the wallet. Nothing runs and nothing is charged |
| A Model Access refusal (code `92`), such as `This agent can't use openai/gpt-5-6-sol. Model Access rules decide which models can run.` | `Message/Send` with a `model` that a [Model Access](/docs/model-access) rule for the agent blocks: its own rule, the account's or team's rule, or the `agent` surface's rule. `UpdateSettings` with such a model override too. Nothing runs and nothing is charged |
| `Message not found` | `Detail` / `Cancel` with invalid messageguid |
| `Message cannot be cancelled (status: {status})` | `Cancel` on a message that's already in a terminal state |
| `Invalid redirect URL` | [`ConnectorConnect`](/docs/agent-connectors#the-redirect-url) with a `redirecturl` that isn't https (or http on localhost) |
| `Could not retrieve wallet balance` | Wallet service lookup failed while checking balance |
| `runstream-unavailable` | `RunStreamToken` while following runs live is not available. Try again later |
| A Screen refusal, such as `Screen is off in this agent's settings.` (code `94`) or `Take Control is off for team agents: their browser is shared by the whole team.` (code `99`) | `Realtime/ScreenStart` when the agent's Screen, or Take Control, can't open for the caller. These codes are ScreenStart's own: see [its errors](#screenstart-errors) |

## Code Examples

### curl

```bash
# List available agents (no auth required)
curl -X POST "https://api.wiro.ai/v1/Agent/List" \
  -H "Content-Type: application/json" \
  -d '{"limit": 10}'

# Get agent details by slug (no auth required)
curl -X POST "https://api.wiro.ai/v1/Agent/Detail" \
  -H "Content-Type: application/json" \
  -d '{"slug": "instagram-manager"}'

# Deploy a new agent instance (prepaid, pinned by default)
curl -X POST "https://api.wiro.ai/v1/UserAgent/Deploy" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "agentguid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "title": "My Instagram Bot",
    "useprepaid": true,
    "tier": "starter"
  }'

# Deploy an agent your customers chat with (no setup changes from chat)
curl -X POST "https://api.wiro.ai/v1/UserAgent/Deploy" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "agentguid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "title": "Customer #1234 Bot",
    "useprepaid": true,
    "tier": "starter",
    "chatsetup": "off"
  }'

# Build a custom agent (no template — pick your own skill set)
curl -X POST "https://api.wiro.ai/v1/UserAgent/Deploy" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "custom": true,
    "title": "Inbox Watcher",
    "useprepaid": true,
    "tier": "pro",
    "skills": { "util-chat-markdown-reporting": true, "util-anti-ai-human-copy": true }
  }'

# Preview a plan change before you make it
curl -X POST "https://api.wiro.ai/v1/UserAgent/PricingPreview" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
    "tier": "max"
  }'

# Cancel a subscription (cancels at end of billing period)
curl -X POST "https://api.wiro.ai/v1/UserAgent/CancelSubscription" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{"guid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321"}'

# Move up to Pro (prepaid: a prorated charge now)
curl -X POST "https://api.wiro.ai/v1/UserAgent/UpgradeTier" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{"guid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321", "targetTier": "pro"}'

# Renew expired subscription (or undo a pending cancel)
curl -X POST "https://api.wiro.ai/v1/UserAgent/RenewSubscription" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{"guid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321"}'

# Start an agent
curl -X POST "https://api.wiro.ai/v1/UserAgent/Start" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{"guid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321"}'

# Get agent instance details (its AI usage and balance are in usage)
curl -X POST "https://api.wiro.ai/v1/UserAgent/Detail" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{"guid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321"}'

# Connect a connector on a running agent (triggers automatic restart)
curl -X POST "https://api.wiro.ai/v1/UserAgent/ConnectorConnect" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
    "slug": "serper",
    "values": { "apikey": "YOUR_SERPER_API_KEY" }
  }'

# Stop an agent
curl -X POST "https://api.wiro.ai/v1/UserAgent/Stop" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{"guid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321"}'
```

### Python

```python
import requests

headers = {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
}

# List available agents (no auth required)
catalog = requests.post(
    "https://api.wiro.ai/v1/Agent/List",
    json={"limit": 10}
).json()
for agent in catalog["agents"]:
    print(f"{agent['title']} ({agent['slug']}): Starter ${agent['tiers']['starter']['priceUsd']}/mo")

# Get agent details by slug
detail = requests.post(
    "https://api.wiro.ai/v1/Agent/Detail",
    json={"slug": "instagram-manager"}
).json()
agent = detail["agents"][0]
print(f"Connectors to connect: {agent['suggestedconnectors']}")  # e.g. ['instagram']

# Deploy a new instance (prepaid wallet, Starter plan)
deploy = requests.post(
    "https://api.wiro.ai/v1/UserAgent/Deploy",
    headers=headers,
    json={
        "agentguid": agent["guid"],
        "title": "My Instagram Bot",
        "useprepaid": True,
        "tier": "starter"
    }
).json()
instance_guid = deploy["useragents"][0]["guid"]
print(f"Deployed: {instance_guid}")

# Connect a Connector that takes a key, Serper here. Instagram connects by
# signing in instead (see Agent Connectors)
requests.post(
    "https://api.wiro.ai/v1/UserAgent/ConnectorConnect",
    headers=headers,
    json={
        "useragentguid": instance_guid,
        "slug": "serper",
        "values": { "apikey": "YOUR_SERPER_API_KEY" }
    }
)

# A prepaid Deploy already queued the agent: start it only when it is stopped (0) or errored (5)
instance = requests.post(
    "https://api.wiro.ai/v1/UserAgent/Detail",
    headers=headers,
    json={"guid": instance_guid}
).json()
if instance["useragents"][0]["status"] in (0, 5):
    requests.post(
        "https://api.wiro.ai/v1/UserAgent/Start",
        headers=headers,
        json={"guid": instance_guid}
    )

# Check status
import time
while True:
    resp = requests.post(
        "https://api.wiro.ai/v1/UserAgent/Detail",
        headers=headers,
        json={"guid": instance_guid}
    ).json()
    status = resp["useragents"][0]["status"]
    print(f"Status: {status}")
    if status == 4:
        print("Agent is running!")
        break
    if status == 5:
        print("Agent errored")
        break
    time.sleep(5)

# Move up to Pro (prorated, debited from wallet)
requests.post(
    "https://api.wiro.ai/v1/UserAgent/UpgradeTier",
    headers=headers,
    json={"guid": instance_guid, "targetTier": "pro"}
)

# Read the agent's AI usage and the balance it runs on past its plan
usage = requests.post(
    "https://api.wiro.ai/v1/UserAgent/Detail",
    headers=headers,
    json={"guid": instance_guid}
).json()["useragents"][0]["usage"]
print(f"AI usage: ${usage['usedusd']:.2f} of ${usage['includedusd']:.2f}, balance ${usage['balanceusd']:.2f}")

# List your deployed agents
my_agents = requests.post(
    "https://api.wiro.ai/v1/UserAgent/MyAgents",
    headers=headers,
    json={"limit": 50}
).json()
for ua in my_agents["useragents"]:
    print(f"{ua['title']} - status: {ua['status']} - plan: {ua.get('tier')}")

# Stop the agent
requests.post(
    "https://api.wiro.ai/v1/UserAgent/Stop",
    headers=headers,
    json={"guid": instance_guid}
)
```

### Node.js

```javascript
const axios = require('axios');

const headers = {
  'x-api-key': 'YOUR_API_KEY',
  'Content-Type': 'application/json'
};

async function main() {
  // List available agents (no auth required)
  const catalog = await axios.post(
    'https://api.wiro.ai/v1/Agent/List',
    { limit: 10 }
  );
  catalog.data.agents.forEach(a =>
    console.log(`${a.title} (${a.slug}): Starter $${a.tiers.starter.priceUsd}/mo`)
  );

  // Get agent details by slug
  const detail = await axios.post(
    'https://api.wiro.ai/v1/Agent/Detail',
    { slug: 'instagram-manager' }
  );
  const agent = detail.data.agents[0];
  console.log('Connectors to connect:', agent.suggestedconnectors); // e.g. ['instagram']

  // Deploy a new instance (prepaid wallet, Starter plan)
  const deploy = await axios.post(
    'https://api.wiro.ai/v1/UserAgent/Deploy',
    { agentguid: agent.guid, title: 'My Instagram Bot', useprepaid: true, tier: 'starter' },
    { headers }
  );
  const instanceGuid = deploy.data.useragents[0].guid;
  console.log('Deployed:', instanceGuid);

  // Connect a Connector that takes a key, Serper here. Instagram connects by
  // signing in instead (see Agent Connectors)
  await axios.post(
    'https://api.wiro.ai/v1/UserAgent/ConnectorConnect',
    {
      useragentguid: instanceGuid,
      slug: 'serper',
      values: { apikey: 'YOUR_SERPER_API_KEY' }
    },
    { headers }
  );

  // A prepaid Deploy already queued the agent: start it only when it is stopped (0) or errored (5)
  const current = await axios.post(
    'https://api.wiro.ai/v1/UserAgent/Detail',
    { guid: instanceGuid },
    { headers }
  );
  if ([0, 5].includes(current.data.useragents[0].status)) {
    await axios.post(
      'https://api.wiro.ai/v1/UserAgent/Start',
      { guid: instanceGuid },
      { headers }
    );
  }

  // Poll until running
  while (true) {
    const resp = await axios.post(
      'https://api.wiro.ai/v1/UserAgent/Detail',
      { guid: instanceGuid },
      { headers }
    );
    const status = resp.data.useragents[0].status;
    console.log('Status:', status);
    if (status === 4) { console.log('Agent is running!'); break; }
    if (status === 5) { console.log('Agent errored'); break; }
    await new Promise(r => setTimeout(r, 5000));
  }

  // Move up to Pro
  await axios.post(
    'https://api.wiro.ai/v1/UserAgent/UpgradeTier',
    { guid: instanceGuid, targetTier: 'pro' },
    { headers }
  );

  // Read the agent's AI usage and the balance it runs on past its plan
  const usageResp = await axios.post(
    'https://api.wiro.ai/v1/UserAgent/Detail',
    { guid: instanceGuid },
    { headers }
  );
  const usage = usageResp.data.useragents[0].usage;
  console.log(`AI usage: $${usage.usedusd} of $${usage.includedusd}, balance $${usage.balanceusd}`);

  // Stop the agent
  await axios.post(
    'https://api.wiro.ai/v1/UserAgent/Stop',
    { guid: instanceGuid },
    { headers }
  );
}

main();
```

### PHP

```php
<?php
$apiKey = "YOUR_API_KEY";

// List available agents (no auth required)
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, "https://api.wiro.ai/v1/Agent/List");
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ["Content-Type: application/json"]);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(["limit" => 10]));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$catalog = json_decode(curl_exec($ch), true);
curl_close($ch);

// Deploy a new instance (prepaid wallet, Starter plan)
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, "https://api.wiro.ai/v1/UserAgent/Deploy");
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Content-Type: application/json",
    "x-api-key: $apiKey"
]);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
    "agentguid" => "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "title" => "My Instagram Bot",
    "useprepaid" => true,
    "tier" => "starter"
]));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$deploy = json_decode(curl_exec($ch), true);
curl_close($ch);
echo "Deployed: " . $deploy["useragents"][0]["guid"];
```

### C#

```csharp
using var client = new HttpClient();
client.DefaultRequestHeaders.Add("x-api-key", "YOUR_API_KEY");

// Deploy a new instance (prepaid wallet, Starter plan)
var deployContent = new StringContent(
    JsonSerializer.Serialize(new {
        agentguid = "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        title = "My Instagram Bot",
        useprepaid = true,
        tier = "starter"
    }),
    Encoding.UTF8, "application/json");

var deployResp = await client.PostAsync(
    "https://api.wiro.ai/v1/UserAgent/Deploy", deployContent);
var deployResult = await deployResp.Content.ReadAsStringAsync();
Console.WriteLine(deployResult);

// A prepaid Deploy already queued the agent: start it only when it is stopped (0) or errored (5)
var agentGuid = "f8e7d6c5-b4a3-2190-fedc-ba0987654321";
var detailResp = await client.PostAsync(
    "https://api.wiro.ai/v1/UserAgent/Detail",
    new StringContent(JsonSerializer.Serialize(new { guid = agentGuid }), Encoding.UTF8, "application/json"));
using var detail = JsonDocument.Parse(await detailResp.Content.ReadAsStringAsync());
var status = detail.RootElement.GetProperty("useragents")[0].GetProperty("status").GetInt32();
if (status == 0 || status == 5)
{
    var startContent = new StringContent(
        JsonSerializer.Serialize(new { guid = agentGuid }),
        Encoding.UTF8, "application/json");

    var startResp = await client.PostAsync(
        "https://api.wiro.ai/v1/UserAgent/Start", startContent);
    Console.WriteLine(await startResp.Content.ReadAsStringAsync());
}
```

### Go

```go
package main

import (
    "bytes"
    "encoding/json"
    "fmt"
    "net/http"
    "io"
)

func main() {
    // Deploy a new instance (prepaid wallet, Starter plan)
    body, _ := json.Marshal(map[string]interface{}{
        "agentguid":  "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "title":      "My Instagram Bot",
        "useprepaid": true,
        "tier":       "starter",
    })
    req, _ := http.NewRequest("POST",
        "https://api.wiro.ai/v1/UserAgent/Deploy",
        bytes.NewBuffer(body))
    req.Header.Set("Content-Type", "application/json")
    req.Header.Set("x-api-key", "YOUR_API_KEY")

    resp, _ := http.DefaultClient.Do(req)
    defer resp.Body.Close()
    data, _ := io.ReadAll(resp.Body)
    fmt.Println(string(data))
}
```

### Swift

```swift
import Foundation

let url = URL(string: "https://api.wiro.ai/v1/UserAgent/Deploy")!
var request = URLRequest(url: url)
request.httpMethod = "POST"
request.setValue("application/json",
    forHTTPHeaderField: "Content-Type")
request.setValue("YOUR_API_KEY",
    forHTTPHeaderField: "x-api-key")
request.httpBody = try! JSONSerialization.data(
    withJSONObject: [
        "agentguid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "title": "My Instagram Bot",
        "useprepaid": true,
        "tier": "starter"
    ])

let (data, _) = try await URLSession.shared
    .data(for: request)
print(String(data: data, encoding: .utf8)!)
```

### Kotlin

```kotlin
import java.net.HttpURLConnection
import java.net.URL

val url = URL("https://api.wiro.ai/v1/UserAgent/Deploy")
val conn = url.openConnection() as HttpURLConnection
conn.requestMethod = "POST"
conn.setRequestProperty("Content-Type", "application/json")
conn.setRequestProperty("x-api-key", "YOUR_API_KEY")
conn.doOutput = true
conn.outputStream.write("""{
    "agentguid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "title": "My Instagram Bot",
    "useprepaid": true,
    "tier": "starter"
}""".toByteArray())

val response = conn.inputStream.bufferedReader().readText()
println(response)
```

### Dart

```dart
import 'dart:convert';
import 'package:http/http.dart' as http;

final response = await http.post(
  Uri.parse('https://api.wiro.ai/v1/UserAgent/Deploy'),
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'YOUR_API_KEY',
  },
  body: jsonEncode({
    'agentguid': 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'title': 'My Instagram Bot',
    'useprepaid': true,
    'tier': 'starter',
  }),
);
print(response.body);
```

## What's Next

- [Agent Builder](/docs/agent-builder): Build custom agents from scratch (`custom: true`) with live pricing previews and skill picker
- [Agent Skills](/docs/agent-skills): Configure preferences, scheduled tasks, and skill toggles. Includes the registry browser endpoints (`Skills/List`, `Skills/Detail`, `Skills/Capabilities`)
- [Agent Connectors](/docs/agent-connectors): The connector catalog and every call to connect the services an agent works with (`AgentConnector/List`, `ConnectorConnect`, sign-ins, account pickers)
- [Agent Credentials](/docs/agent-credentials): Channels, the Wiro project and settings, plus the registry endpoints (`Credentials/List`, `Credentials/Detail`)
- [Agent Messaging](/docs/agent-messaging): Send messages and receive responses from running agents
- [Agent Chat Integration](/docs/agent-chat-integration): Build your own chat for an agent, with setup cards, connections, restarts and the agent's live Screen
- [Agent WebSocket](/docs/agent-websocket): Real-time response streaming
- [Agent Webhooks](/docs/agent-webhooks): Receive agent responses via HTTP callbacks
- [Agent Transactions](/docs/agent-transactions): The agent's spending in dollars: AI usage, model runs, plan payments and funds added
- [Agent Logs](/docs/agent-logs): Per-instance activity feed (tool calls, Scheduled Task runs, message exchanges)
- [Authentication](/docs/authentication): API key setup and authentication methods
