# Agent Overview

Deploy and manage autonomous AI agents through a single API.

## Wiro Agents on the Web

The endpoints below cover the full programmatic surface. If you also want to see the web product alongside what you're building (landing pages, marketing copy, the visual catalog, and the no-code Build Your Own Agent flow), these are the public Wiro pages dedicated to agents:

| Page | URL | What it covers |
|------|-----|----------------|
| **AI Agents Home** | [wiro.ai/agents](https://wiro.ai/agents) | Top-level landing: what Wiro Agents are, how they compare to traditional setups, and a featured selection from the marketplace. |
| **Learn About Agents** | [wiro.ai/agents/learn](https://wiro.ai/agents/learn) | Concept primer: pricing model, security model, deployment lifecycle, and the difference between marketplace templates and custom builds. |
| **Anatomy of an Agent** | [wiro.ai/agents/anatomy](https://wiro.ai/agents/anatomy) | Fullscreen interactive walkthrough of the pieces that make a Wiro agent reason: system prompt, knowledge, skills, memory, guardrails, model, tools, scheduling, and observability. |
| **Build Your Own Agent** | [wiro.ai/agents/build](https://wiro.ai/agents/build) | The web wizard for the same custom-build flow exposed by [`POST /UserAgent/Deploy`](#post-useragentdeploy) with `custom: true`. Useful for previewing the skill picker / pricing breakdown before scripting it. |
| **Browse Agents** | [wiro.ai/agents/browse](https://wiro.ai/agents/browse) | Full marketplace catalog with categories, descriptions, screenshots, and plan prices, the visual mirror of [`POST /Agent/List`](#post-agentlist). Each row links to a dedicated agent page at `/agents/{slug}`. |
| **Use Case Showcases** | [wiro.ai/agents/usecase/...](https://wiro.ai/agents) | Seven fullscreen, auto-looping product stories that show real businesses operated end-to-end by a Wiro agent. See [Agent Use Cases](/docs/agent-use-cases#see-these-use-cases-on-the-web) for the full list. |

> All pages are public: no Wiro account required to browse. Sign-in becomes mandatory only when you click "Deploy" on a specific agent (which then drops you into the Wiro dashboard at [wiro.ai/panel/agents](https://wiro.ai/panel/agents)).

## What are Wiro Agents?

Wiro Agents are autonomous AI assistants that keep running on Wiro. Unlike one-shot model runs, agents maintain conversation memory, connect to external services, and use tools to complete tasks on your behalf, all managed through the API.

The system has two layers:

- **Agent templates** (the catalog): Pre-built agent definitions published by Wiro. Each template defines the agent's default skill set and required credentials, and runs on any of the three plans. Browse the catalog with `POST /Agent/List`.
- **UserAgent instances** (your deployments): When you deploy an agent template (or build a custom one), Wiro creates a personal instance tied to your account. Each instance runs in its own isolated environment with its own credentials, configuration, conversation history, billing, and per-model token-rate profile.

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

**Public endpoints**: `Agent/List`, `Agent/Detail`, `Skills/List`, `Skills/Detail`, `Skills/Capabilities`, `Credentials/List`, and `Credentials/Detail` are catalog endpoints and do not require authentication. You can browse available agents, the skill registry, and the credential schema without an API key.

**Authenticated endpoints**: All `UserAgent/*` endpoints require a valid API key.

For full details, see [Authentication](/docs/authentication).

## Pricing Model: Plans, Credits & Token Billing

Every agent runs on one of three monthly plans, and the plan alone sets its price and its monthly credits. Templates and custom builds use the same plans, and the skills an agent has never change the price. Each turn the agent runs then spends credits by the tokens its model uses.

### Plans

| Plan | `tier` | Price | Monthly credits |
|------|--------|-------|-----------------|
| **Starter** | `"starter"` | $5 a month | 500 |
| **Pro** | `"pro"` | $30 a month | 3,000 |
| **Max** | `"max"` | $100 a month | 10,000 |

Every plan carries 100 credits per dollar (1 credit = $0.01). A plan is bought per agent: pass `tier` to [`Deploy`](#post-useragentdeploy) or [`CreateSubscriptionCheckout`](#post-useragentcreatesubscriptioncheckout). Catalog and instance responses list the three plans under `tiers`:

```json
"tiers": {
  "starter": { "priceUsd": 5,   "credits": 500 },
  "pro":     { "priceUsd": 30,  "credits": 3000 },
  "max":     { "priceUsd": 100, "credits": 10000 }
}
```

Instance responses (`agent.plans`) and `PricingPreview` (`plans`) also list them with their names, as `{ key, title, priceUsd, monthlyCredits }`.

A wallet plan renews every 30 days, and a plan paid by card in the Wiro dashboard renews on its monthly card cycle. Every renewal grants the plan's credits in full. Credits a period leaves unused don't carry over; credits from extra credit packs keep their own 6-month expiry.

### What a Plan Includes

Every skill and connector works on every plan. Turning a skill on or off with [`SkillsApply`](#post-useragentskillsapply) is free: the plan's price and credits stay as they are. The work a skill does still uses credits, since its replies and scheduled tasks are agent turns billed by tokens like any other. A skill that runs Wiro models, such as `int-wiro-aimodels` or `util-video-creator`, pays for those runs from the wallet of the Wiro project you connect to the agent.

### Changing Plans

[`POST /UserAgent/UpgradeTier`](#post-useragentupgradetier) moves an agent to another plan:

- **A higher plan starts now.** On a wallet plan, the wallet pays the monthly difference for the time left in the period, by the second, rounded up to the cent and at least one day's worth, and the period gains the difference in credits for that same time. Every renewal after that grants the new plan in full. Example: a Pro agent moving to Max with 15 days left of 30 pays $35.00 and gains 3,500 credits now, then renews at $100 with 10,000 credits.
- **A lower plan starts at the next renewal.** Ask for it with `allowDowngrade: true`: without it, a lower plan is refused and nothing changes. Nothing is charged or refunded. The agent keeps its current plan, price and credits until the period ends, and its `nextplan` field names the plan it will renew on.
- **Asking for the agent's current plan** cancels a scheduled move to a lower plan.

Moving to a higher plan while a lower one is scheduled cancels the scheduled move first, and cancelling the subscription clears it too. On a plan paid by card, a higher plan goes through a card checkout: nothing changes until it is paid, and then a new full period starts with the plan's full credits. A lower plan on a card plan applies from the next card renewal.

### Extra Credits

An agent with an active plan can buy extra credits at any time, on every plan. The packs are the same for every agent:

| Pack | Credits | Price |
|------|---------|-------|
| `small` | 1,000 | $10 |
| `medium` | 5,000 | $50 |
| `large` | 20,000 | $200 |

Pack credits are spent after the month's plan credits and expire 6 months after purchase. See [Extra Credit Packs](#extra-credit-packs).

### Token Billing

The monthly plan buys a **credit pool**; each turn the agent runs (a chat reply, a scheduled cron tick, or a voice-prep turn) deducts credits from that pool, **metered by the tokens its model consumes**. There are no flat per-action costs: what a turn costs depends on the model and how many input / output / cached tokens it used.

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

Rates are quoted in **credits per 1,000,000 tokens**, and **1 credit = $0.01** (100 credits = $1). Wiro prices every LLM call against the model that actually served that call, sums each token category across the turn, and rounds the four aggregate categories up independently:

```
tokencost = ceil(Σ call_input_cost)
          + ceil(Σ call_output_cost)
          + ceil(Σ call_cache_read_cost)
          + ceil(Σ call_cache_write_cost)
```

Cache-read and cache-write categories are charged only when the selected model rate defines them. `inputtokens` contains only uncached input; `totaltokens` is always the exact sum of input, output, cache-read, and cache-write tokens. For models with `long_context_threshold_tokens`, Wiro selects the long-context rate **per LLM call** using `input + cacheRead + cacheWrite`. You don't send anything. Each billed turn appears once as a ledger row with `action: "tokens"` (see [`POST /UserAgent/TransactionList`](/docs/agent-transactions#tx-transactionlist)). Per-turn token counts and cost also ride on each assistant message (`inputtokens` / `outputtokens` / `cachereadtokens` / `cachewritetokens` / `totaltokens` / `tokencost` / `model`, see [Agent Messaging](/docs/agent-messaging)).

When the credit pool is exhausted, [`POST /UserAgent/Message/Send`](/docs/agent-messaging#post-useragentmessagesend) and [`POST /UserAgent/Start`](#post-useragentstart) refuse with an `Agent has no remaining credits…` error plus an `agentbalance` snapshot; renew the subscription or buy an extra credit pack to continue.

> **Voice realtime audio is billed separately.** Live voice-call audio (for `util-voice-receptionist` agents) is **not** charged to the platform credit pool. It flows through the operator's own Wiro AI Models balance via the `int-wiro-aimodels` skill (you bring your own Wiro API key). The voice-prep turn before the call and the post-call text turn are billed as normal token deducts.

### Live Pricing Preview

Before you deploy, change the plan or change skills, call [`POST /UserAgent/PricingPreview`](#post-useragentpricingpreview). It writes nothing and returns the three plans under `tiers`, the `tokenRates`, and `enabledSkills` with every transitive `depends_on` resolved. For an agent with an active plan it also returns `planChange`: what a different `tier` would charge now and when it starts. A skill change has no price, so its `planChange` shows no charge and no credit change.

## Agent Lifecycle

Deploying and running an agent follows this flow:

1. **Browse**: call `POST /Agent/List` to discover available agents in the catalog
2. **Deploy**: call `POST /UserAgent/Deploy` with `useprepaid: true` and `tier` (`"starter"`, `"pro"` or `"max"`). The plan's price is debited from your prepaid wallet immediately and a 30-day subscription row is created.
3. **Configure**: set integration and optional Telegram, Slack, or Discord credentials with `POST /UserAgent/CredentialUpsert`, connect the Wiro project the agent runs models with using `POST /UserAgent/CredentialProjectBind`, and set preferences with `POST /UserAgent/CustomSkillUpsert`. See [Agent Credentials](/docs/agent-credentials) for details
4. **Start**: call `POST /UserAgent/Start` to queue the agent for launch
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
| `6` | Setup Required | Agent needs credentials or configuration before it can start. Provide them via `CredentialUpsert` / `CredentialProjectBind` / `CustomSkillUpsert` / `SkillsApply`, then call `POST /UserAgent/Update`. |

### Automatic Restart

When you mutate an agent's configuration while it is **starting** (status `3`) or **running** (status `4`), the system automatically triggers a restart cycle: the agent is moved to **Stopping** (status `1`) and flagged to restart. Once the agent fully stops, the system automatically re-queues it, applying the new configuration on startup.

This means you can update credentials, toggle skills, or change a custom skill on a running agent without manually stopping and starting it.

Endpoints that auto-trigger a restart on success: `CredentialUpsert`, `CredentialProjectBind` (when the project changes), `SkillsApply`, `CustomSkillUpsert` (when functional fields change), `CustomSkillRename`, `CustomSkillDelete`, `CustomSkillRevert`, `Update` (a changed `title`, or a body that names no field). A description, categories or cover edit through `Update` doesn't restart the agent.

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
        "starter": { "priceUsd": 5,   "credits": 500 },
        "pro":     { "priceUsd": 30,  "credits": 3000 },
        "max":     { "priceUsd": 100, "credits": 10000 }
      },
      "status": 1,
      "createdat": "1711929600",
      "updatedat": "1714521600"
    }
  ],
  "plans": [
    { "key": "starter", "title": "Starter", "priceUsd": 5,   "monthlyCredits": 500 },
    { "key": "pro",     "title": "Pro",     "priceUsd": 30,  "monthlyCredits": 3000 },
    { "key": "max",     "title": "Max",     "priceUsd": 100, "monthlyCredits": 10000 }
  ]
}
```

> `Agent/List` returns the catalog fields plus inlined `tiers`, so a catalog card can show the price without a per-row `Agent/Detail` call. The top-level `plans` lists the three plans in order with their names (`key`, `title`, `priceUsd`, `monthlyCredits`), the same for every agent. Call `POST /Agent/Detail` with `type: "full"` when you need the full template (skills map, credential schema, custom skills, scheduled tasks).

#### **POST** /Agent/Detail

Retrieves details for a single agent by guid or slug. This is a **public endpoint**, so no authentication is required.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `guid` | string | No* | Agent guid. |
| `slug` | string | No* | Agent slug (e.g. `"instagram-manager"`). |
| `type` | string | No | Pass `"full"` to also include `customskills` (the template's strategies a deployer can edit) and `scheduledskills` (every scheduled task) in the response. Without `type: "full"`, the response carries the catalog header + `tiers` + `plans` + `tokenRates` + `credentials` + `skills` + `skillsmeta` + `communicationChannels` + `extracreditpacks` only. |

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
        "starter": { "priceUsd": 5,   "credits": 500 },
        "pro":     { "priceUsd": 30,  "credits": 3000 },
        "max":     { "priceUsd": 100, "credits": 10000 }
      },
      "plans": [
        { "key": "starter", "title": "Starter", "priceUsd": 5,   "monthlyCredits": 500 },
        { "key": "pro",     "title": "Pro",     "priceUsd": 30,  "monthlyCredits": 3000 },
        { "key": "max",     "title": "Max",     "priceUsd": 100, "monthlyCredits": 10000 }
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
      "skills": ["int-instagram-post", "int-wiro-aimodels"],
      "skillsmeta": {
        "int-instagram-post": {
          "name": "int-instagram-post",
          "title": "Instagram Post",
          "icon": "https://wiro.ai/images/icons/skills/instagram.svg",
          "brand_color": "#e4405f",
          "brand_text_color": "#ffffff",
          "brand_logo_filter": "brightness(0) invert(1)",
          "category": "int",
          "docs_url": "integration-instagram-skills",
          "credential_key": "instagram",
          "additional_credential_keys": [],
          "requires_credentials": true,
          "user_invocable": true,
          "deprecated": false,
          "replacement": null,
          "description": "Post carousel feed and multi-story via Meta Graph API."
        },
        "int-wiro-aimodels": {
          "name": "int-wiro-aimodels",
          "title": "Wiro AI Models",
          "icon": "https://wiro.ai/images/icons/skills/wiro.svg",
          "brand_color": "#33F2BC",
          "brand_text_color": "#0F1A24",
          "brand_logo_filter": null,
          "category": "int",
          "docs_url": null,
          "credential_key": "wiro",
          "additional_credential_keys": [],
          "requires_credentials": true,
          "user_invocable": true,
          "deprecated": false,
          "replacement": null,
          "description": "Universal access to every AI model on Wiro: text-to-image, text-to-video, image-to-image, image-to-video, audio/voice generation, realtime conversational AI, vision LLMs and more."
        }
      },
      "credentials": {
        "instagram": {
          "optional": false,
          "extra": false,
          "_editable": { "appid": true, "appsecret": true, "systemusertoken": true, "accountId": false, "igusername": false },
          "_schema": {
            "title": "Instagram",
            "icon": "https://wiro.ai/images/icons/skills/instagram.svg",
            "brand_color": "#e4405f",
            "brand_text_color": "#ffffff",
            "brand_logo_filter": "none",
            "docs_url": "integration-instagram-skills",
            "credential_mode": "hybrid",
            "connection_modes": ["api_key", "own", "wiro"],
            "default_connection_mode": "api_key",
            "mode_badges": { "api_key": "Recommended", "own": "Advanced" },
            "wiro_connect_pending": true,
            "channel": null,
            "oauth_provider": {
              "auth_method_value": "wiro",
              "connect_endpoint": "/UserAgentOAuth/OAuthConnect",
              "disconnect_endpoint": "/UserAgentOAuth/OAuthDisconnect",
              "status_endpoint": "/UserAgentOAuth/OAuthStatus",
              "username_field": "igusername",
              "direct_probe": {
                "mode": "api_key",
                "token_field": "systemusertoken",
                "public_account_fields": ["id", "name"]
              },
              "account_picker": {
                "enabled": true,
                "multi_select": true,
                "set_endpoint": "/UserAgentOAuth/SetPickerAccounts",
                "item_value_field": "accountId",
                "item_label_field": "igusername"
              }
            },
            "fields": [
              { "key": "appid", "label": "App ID", "type": "text", "required": true, "only_in_modes": ["own"], "pattern": "^[0-9]+$", "oauth_managed": true },
              { "key": "appsecret", "label": "App Secret", "type": "password", "required": true, "show_toggle": true, "only_in_modes": ["own"], "oauth_managed": true },
              { "key": "systemusertoken", "label": "System User Token", "type": "password", "required": true, "show_toggle": true, "only_in_modes": ["api_key"] },
              { "key": "accountId", "label": "Instagram Account ID", "type": "text", "required": true, "readonly_when_connected": true, "pattern": "^[0-9]+$", "auto_filled_by_oauth": true },
              { "key": "igusername", "label": "Connected Account", "type": "text", "required": false, "readonly_when_connected": true, "auto_filled_by_oauth": true }
            ]
          }
        }
      },
      "extracreditpacks": [
        { "packkey": "small",  "credits": 1000,  "priceusd": 10,  "enabled": true },
        { "packkey": "medium", "credits": 5000,  "priceusd": 50,  "enabled": true },
        { "packkey": "large",  "credits": 20000, "priceusd": 200, "enabled": true }
      ],
      "status": 1,
      "createdat": "1711929600",
      "updatedat": "1714521600"
    }
  ]
}
```

> `Agent/Detail` describes the **template**, so its `credentials` block only carries the `optional` / `extra` meta flags (when the template sets them) plus the registry-driven `_schema` (field labels / types) and `_editable` map. It holds no saved values, whoever calls it and whatever `type` is sent. The `_connected` flag is per-instance and appears on `UserAgent/Detail` and the `Deploy` and `Update` responses, not on the catalog endpoint. `plans` lists the three plans with their names, and `extracreditpacks` the three extra credit packs every plan can buy, so a visitor sees both before deploying. A deployed agent's `UserAgent/Detail` carries the same lists under `agent` (see [Extra Credit Packs](#extra-credit-packs)).

**Credential response flags** (on `UserAgent/Detail` and the `Deploy` and `Update` responses): every credential object in the top-level `credentials` tree on the per-instance endpoints carries:

| Flag | Type | Meaning |
|------|------|---------|
| `_connected` | boolean | **Connection readiness indicator.** `true` when Wiro has a validated OAuth or hybrid direct connection and every required picker field (`customerid`, `merchantid`, `channelid`, ad-account, page ID, Instagram account ID, etc.) is populated. Plain API-key and service-account providers that do not write `connectedat` can remain `false`; use `setuprequired` to determine overall setup readiness. |
| `optional` | boolean | `true` when the template marks this credential as not required for the agent to run. Agents can start even if `optional: true` credentials are empty. On a custom build, each skill's own connector reads `false`, and a connector it lists in `additional_credential_keys` reads `true`, unless another skill on the agent has that connector as its own. |
| `extra` | boolean | `true` when the template groups the credential under "extra integrations" in the UI (disabled by default until the user opts into the skill). |
| `_editable` | object | Map of `fieldname → true\|false` over the registry schema: `false` for a field the caller can't write (filled by the connection flow, platform-managed, or computed). |
| `_schema` | object | Inlined registry descriptor: `{ title, icon, brand_color, brand_text_color, brand_logo_filter, docs_url, credential_mode, connection_modes[], default_connection_mode, mode_badges, wiro_connect_pending, channel, oauth_provider, fields[] }`, where `channel` describes a communication channel's connector and is `null` on any other. Lets a UI render the form without a separate `Credentials/Detail` round-trip. |

**Field redaction in responses:**

- `fieldstatus: "oauth_session"` fields (`accesstoken`, `refreshtoken`, `tokenexpiresat`, `pageAccessToken`, etc.) are always stripped from every response.
- Schema fields marked `runtime_excluded: true`, such as the Instagram and
  Facebook Pages `systemusertoken`, never reach the agent. The value you saved
  comes back to the agent's owner and team admins, like your other connector
  values.
- `fieldstatus: "platform"` fields (Wiro-managed fields, such as Reddit's three approval flags `developerprofileverified`, `dataapiaccessapproved` and `commercialwrittenapproval`) are stripped from every API response. `credentials.wiro.apikey` and `credentials.calendarific.apikey` are operator-supplied user-input fields and appear in the response with `fieldstatus: "user"` like any other API-key credential.
- `fieldstatus: "oauth_app"` fields (`clientid` / `clientsecret`, `appid` / `appsecret`) are stripped from Detail responses, even after an own-mode OAuth setup writes them. History writes redact `clientsecret` to `[REDACTED]`.
- A value the agent template holds on a secret field (one Wiro stores encrypted, such as a key, token, password or service account, or an `oauth_managed` OAuth app key) is not returned: the field reads empty, and a list entry keeps its place with an empty value, until you save your own. The agent still runs with the template's value, and the card's `_filled` and `_required_missing` count it. Values you save yourself come back to the agent's owner and team admins.
- Sentinel rows `_isoptional` / `_isextra`: never appear as fields; they're folded into the `optional` and `extra` flags above.

A plain member of the agent's team gets the same answer with each saved value replaced by `[present]`, apart from display-only values such as `igusername` and the `authmethod` switch, which show as saved.

**Communication channel fields** are returned separately from skill and
integration credentials:

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

> **API agent deployment is prepaid-only.** Pass `useprepaid: true` + `tier`. The subscription cost is deducted from your prepaid wallet immediately and the instance is created server-side in one call. There is no API path that accepts a credit card directly; subscriptions from a card can only be created through the Wiro dashboard at [wiro.ai/panel/agents](https://wiro.ai/panel/agents). Top up your wallet on [wiro.ai/panel/billing](https://wiro.ai/panel/billing) before calling Deploy.

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
| `cover` | string | No | Optional cover image URL. Custom builds only. Template deploys clone the agent's cover automatically. |
| `useprepaid` | boolean | Yes | Must be `true` for API deploys. Pays the plan's price from your wallet balance in a single server-side call. |
| `tier` | string | No | The plan: `"starter"` (default, $5 a month with 500 credits), `"pro"` ($30 with 3,000) or `"max"` ($100 with 10,000). It sets the price debited from your wallet at deploy time and the monthly credits. The param name is `tier`. Leave it out for Starter. Any other value is refused with `tier must be starter, pro or max`, and nothing is created or charged. |
| `credentials` | object | No | Inline credential groups. If a communication-channel group is included, its matching `credentials[credential_key]` object must contain all channel `required_fields`; completeness activates that channel automatically. |
| `skills` | object | No | Inline skill toggles `{ "skillname": true \| false }`. For custom builds this seeds the initial skill set; for template deploys it overlays the template defaults. |
| `customskills` | array | No | Inline custom skill rows. Each entry: `{ key, value?, interval?, enabled?, description?, _user_created? }`. A scheduled task's `interval` must be a schedule the agent can run, as in [`CustomSkillUpsert`](#post-useragentcustomskillupsert), and `"manual"` means no schedule. Otherwise Deploy fails before anything is created or charged, and the error starts with the skill's key. Up to 50 entries; add more with [`CustomSkillUpsert`](#post-useragentcustomskillupsert) once the agent is deployed. |
| `wiroapiallowedpaths` | string[] | No | The Wiro API endpoints this agent may call with its own Wiro project key, as rules in the format described under [`UpdateSettings`](#post-useragentupdatesettings). The list is saved before the agent first starts, so it applies from the first turn. An invalid list is rejected with `invalid-wiro-api-path-rule` and no agent is created. If the list can't be saved, no agent is created either and the call returns `Failed to save wiroapiallowedpaths`; deploy again. Omit it, or send `null`, for the default list described under [`UpdateSettings`](#post-useragentupdatesettings). |
| `chatsetup` | string | No | Setup From Chat: where people can change this agent's setup by approving setup cards in chat. `"all"` (the default) allows the Wiro web chat and messages sent with a project API key, `"webchat"` only the Wiro web chat, and `"off"` neither. Omit it, or send `null`, for `"all"`. Deploying an agent that your customers or many people will talk to? Send `"webchat"` or `"off"`. See [Setup From Chat](/docs/agent-messaging#setup-from-chat). |

**Headers:** Standard API authentication, with `x-api-key` for key-based projects, or `x-nonce` + `x-signature` for signature-based projects (see [Authentication](/docs/authentication)). To deploy into a team, use the credentials of a project that belongs to that team: the agent is created in the project's team, and the project's owner must be an admin of that team (otherwise code `97`). No extra header is needed.

> **Team agents**: every call runs in the workspace of the project behind your credentials; workspace headers sent with the request are ignored.
>
> | Endpoint | Team agents |
> |----------|-------------|
> | `UserAgent/Deploy` | A team project's credentials deploy into that team; the project's owner must be a team admin |
> | `UserAgent/Message/Send`, `Message/History`, `Message/Sessions`, `Message/DeleteSession`, `Message/RenameSession` | The project's workspace must match the agent's workspace |
> | `UserAgent/Message/Delete` | For team agents, the project's workspace must match the agent's workspace; it only hides messages sent by the project's owner |
> | `UserAgent/CancelSubscription`, `UserAgent/CreateExtraCreditCheckout`, `UserAgent/UpgradeTier`, `UserAgent/RenewSubscription`, `UserAgent/CreateSubscriptionCheckout`, `UserAgent/PricingPreview`, `UserAgent/SkillsApply`, `UserAgent/SkillToggle`, `UserAgent/CredentialProjectBind` | The project's workspace must match the agent's workspace |
> | `UserAgent/Message/Detail`, `Message/Cancel` | No workspace match; they only return or cancel messages sent by the project's owner |
> | `UserAgent/Detail` | No workspace match; the project's owner must own the agent or be a member of its team |
> | `UserAgent/Update`, `UserAgent/Start`, `UserAgent/Stop` | No workspace match; the project's owner must own the agent or be an admin of its team (plain members get code `97`) |
> | `UserAgent/Realtime/WebStart` | The project's owner must have deployed the agent. For a team agent, use that team's project key, or a key whose owner is still a member of the team |
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
  "description": "Watches inbound emails and posts a summary to Slack each morning.",
  "useprepaid": true,
  "tier": "pro",
  "skills": {
    "int-gmail-check":    true,
    "int-wiro-aimodels": true
  },
  "credentials": {
    "gmail":    { "account": "agent@company.com", "apppassword": "xxxx xxxx xxxx xxxx" },
    "telegram": { "bottoken": "123456:ABC-DEF...", "allowedusers": ["123456789"] }
  }
}
```

> **Custom builds use the same plans.** There is no marketplace template behind a custom agent, and the skills you pick don't change the price: a custom build pays the plan you pass in `tier`, like a template deploy. [`POST /UserAgent/PricingPreview`](#post-useragentpricingpreview) with `draft: true` resolves the skill set (with `depends_on`) and lists the plans before you call Deploy. Full walkthrough: [Agent Builder](/docs/agent-builder).

##### Template deploy vs custom build: what differs server-side

Both paths hit the same endpoint, but a few server-side behaviours diverge:

| Aspect | Template deploy (`agentguid`) | Custom build (`custom: true`) |
|--------|------------------------------|-------------------------------|
| Linked marketplace template | Snapshotted from the resolved template | None: no template back-reference |
| `categories` | Cloned from the agent template | `null` (custom agents have no marketplace categories) |
| `cover` | Cloned from `agent.cover` automatically | Optional: pass `cover` in the body if you want one |
| Bundled scheduled tasks | Cloned from the template's preset custom skills | Materialized from the standalone cron registry based on the enabled skill set |
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
        "instagram": {
          "_connected": false,
          "optional": false,
          "extra": false,
          "_editable": { "appid": true, "appsecret": true, "systemusertoken": true, "accountId": false, "igusername": false },
          "_schema": { "title": "Instagram", "credential_mode": "hybrid", "connection_modes": ["api_key", "own", "wiro"], "default_connection_mode": "api_key", "fields": [ "..." ] },
          "authmethod": "",
          "igusername": "",
          "connectedat": ""
        }
      },
      "skills": ["int-instagram-post", "int-wiro-aimodels"],
      "customskills": [],
      "scheduledskills": [],
      "monthlycredits": 500,
      "monthlypriceusd": 5,
      "extracredits": 0,
      "usedcredits": 0,
      "remainingcredits": 500,
      "renewalcredits": 500,
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
      "status": 6,
      "setuprequired": true,
      "pinned": false,
      "agent": {
        "guid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "title": "Instagram Manager",
        "slug": "instagram-manager",
        "cover": "https://cdn.wiro.ai/uploads/agents/instagram-manager-cover.webp",
        "categories": ["social-media", "marketing"],
        "tiers": {
          "starter": { "priceUsd": 5,   "credits": 500 },
          "pro":     { "priceUsd": 30,  "credits": 3000 },
          "max":     { "priceUsd": 100, "credits": 10000 }
        },
        "plans": [
          { "key": "starter", "title": "Starter", "priceUsd": 5,   "monthlyCredits": 500 },
          { "key": "pro",     "title": "Pro",     "priceUsd": 30,  "monthlyCredits": 3000 },
          { "key": "max",     "title": "Max",     "priceUsd": 100, "monthlyCredits": 10000 }
        ],
        "extracreditpacks": [
          { "packkey": "small",  "credits": 1000,  "priceusd": 10,  "enabled": true },
          { "packkey": "medium", "credits": 5000,  "priceusd": 50,  "enabled": true },
          { "packkey": "large",  "credits": 20000, "priceusd": 200, "enabled": true }
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
| `status: 6` | **Setup Required**: initial state for every fresh Deploy. With `useprepaid: true`, auto-queues to `status: 2` as soon as the subscription is provisioned, regardless of credential completeness. The agent then starts even if a connector is still missing, and `UserAgent/Detail` reads `setuprequired: true` until it is filled. Fill a missing connector with `POST /UserAgent/CredentialUpsert` or `POST /UserAgent/CredentialProjectBind`: a running agent restarts to pick it up. A row still at `status: 6` needs `POST /UserAgent/Update` first (any scalar body, even just `{ "guid": "<useragent-guid>" }`) to flip it to `status: 0` (Stopped): `Update` is the endpoint that performs the `setuprequired` re-check and the `6 → 0` transition. |
| `status: 2` | **Queued**: `useprepaid: true` charged the wallet, the subscription was provisioned, and Wiro will start the agent. No manual `UserAgent/Start` is required. |
| `setuprequired: true` | A non-optional connector is missing, or the row is still at `status: 6`. At `status: 6`, `Start` rejects with `Agent setup is not complete`. |
| `setuprequired: false` | All non-optional connectors are set up and the row has left `status: 6`. A row sitting at Setup Required reads `true` until a `POST /UserAgent/Update` call flips it 6 → 0; `Start` then launches it normally. |

> **Subscription on deploy:** the `subscription` object is **not** included in the Deploy response. A prepaid subscription (`plan: "agent"`, provider `prepaid`, `tier` matches what you passed) is created server-side during the Deploy call. Call `POST /UserAgent/Detail` with the returned `guid` to read the subscription object back.

Next steps for the API integration flow:

1. Inspect `credentials` in the Deploy response (or call `POST /UserAgent/Detail`) to see each provider's fields, the `optional` / `extra` flags, the registry-driven `_schema`, and the `_connected` OAuth status.
2. Call `POST /UserAgent/CredentialUpsert` per provider (or in bulk via the `fields[]` array) to write API keys, bot tokens, WordPress credentials, etc. For OAuth providers (Meta, Google Ads, HubSpot, …) use the unified `/UserAgentOAuth/OAuthConnect` flow with `credentialkey` (see [Agent Credentials & OAuth](/docs/agent-credentials)). To connect the Wiro project the agent runs models with, call `POST /UserAgent/CredentialProjectBind`.
3. Call `POST /UserAgent/CustomSkillUpsert` per skill to customize strategy text or cron intervals, if the template exposes any.
4. Once every non-optional connector is set up, `setuprequired` reads `false`. The start doesn't wait for it: the prepaid Deploy already queued the agent, Wiro starts it from the queue (`2` → `3` (Starting) → `4` (Running)), and a running agent restarts to pick up each connector you save.
5. If you want to re-launch a stopped agent (status `0`) or recover an errored one (status `5`), call `POST /UserAgent/Start` explicitly.

##### Idempotency: duplicate Deploy guard

Deploy rejects a second call from the same caller for the same template and team within a 10-second window. Custom builds (no template) are matched on caller, `title` and team instead. The rejection carries a top-level `existingUserAgentGuid` field so callers can adopt the agent that already won the race instead of retrying:

```json
{
  "result": false,
  "errors": [
    {
      "code": 99,
      "message": "Duplicate deploy: an identical agent (\"My Instagram Bot\") was already deployed 4s ago. Open the existing one in your panel, or wait a few seconds and retry."
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
      "monthlycredits": 3000,
      "extracredits": 5000,
      "usedcredits": 1450,
      "remainingcredits": 6550,
      "renewalcredits": 3000,
      "creditperiod": "2026-05",
      "creditsyncat": 1714694410,
      "status": 4,
      "pinned": true,
      "teamsessionmode": "private",
      "setuprequired": false,
      "subscription": {
        "plan": "agent",
        "status": "active",
        "amount": 30,
        "currency": "usd",
        "currentperiodend": 1717200000,
        "renewaldate": "2026-06-01T00:00:00.000Z",
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
          "starter": { "priceUsd": 5,   "credits": 500 },
          "pro":     { "priceUsd": 30,  "credits": 3000 },
          "max":     { "priceUsd": 100, "credits": 10000 }
        }
      },
      "enabledSkills": ["int-instagram-post", "int-twitterx-post", "int-wiro-aimodels"],
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
      "extracreditsexpiry": 1730419200,
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

> **`MyAgents` returns one row per useragent with its scalar fields, the trimmed `agent` template summary (no `extracreditpacks`), `subscription`, `setuprequired` (status-based check only), `extracredits` / `remainingcredits` / `renewalcredits` / `extracreditsexpiry`, `lastactivityat`, the resolved `enabledSkills` (template defaults ∪ user overrides, including transitive `depends_on` closure), `tokenRates` (per-model token rates, the same map as `UserAgent/Detail.tokenRates`), `agentModel` (the resolved chat / cron / voice-prep / voice-postcall model slugs), and `enabledCommands` (the slash-command allowlist, `null` when uncustomized).** Heavier composed children (`credentials`, `customskills`, `scheduledskills`, `skills`, `skillsmeta`, `communicationChannels`, `enabledChannels`) are **not** included. Call `UserAgent/Detail` on a single guid for the full composed shape.

> **`enabledSkills`, `tokenRates`, and `agentModel`** ride on each list row so a chat or pinned-agents UI can decide whether to show the realtime voice-call button (`enabledSkills` includes `util-web-channel`) and render the model picker + live token-rate card without round-tripping `UserAgent/Detail` per row.

#### **POST** /UserAgent/Detail

Retrieves full details for a single deployed agent instance, including subscription info, the per-instance credit ledger summary, the resolved per-model token-rate table (`tokenRates`) plus model selection (`agentModel`), and the `extracreditpacks` catalog.

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
      "cover": "https://cdn.wiro.ai/uploads/agents/instagram-manager-cover.webp",
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
        "instagram": {
          "_connected": true,
          "optional": false,
          "extra": false,
          "_editable": {
            "appid": true,
            "appsecret": true,
            "systemusertoken": true,
            "accountId": false,
            "igusername": false
          },
          "_schema": {
            "title": "Instagram",
            "icon": "https://wiro.ai/images/icons/skills/instagram.svg",
            "brand_color": "#E4405F",
            "brand_text_color": "#FFFFFF",
            "brand_logo_filter": null,
            "docs_url": "/docs/integration-instagram-skills",
            "credential_mode": "hybrid",
            "connection_modes": ["api_key", "own", "wiro"],
            "default_connection_mode": "api_key",
            "mode_badges": {
              "api_key": "Recommended",
              "own": "Advanced"
            },
            "wiro_connect_pending": true,
            "channel": null,
            "oauth_provider": {
              "auth_method_value": "wiro",
              "connect_endpoint": "/UserAgentOAuth/OAuthConnect",
              "disconnect_endpoint": "/UserAgentOAuth/OAuthDisconnect",
              "status_endpoint": "/UserAgentOAuth/OAuthStatus",
              "direct_probe": {
                "mode": "api_key",
                "token_field": "systemusertoken",
                "public_account_fields": ["id", "name"]
              },
              "account_picker": {
                "enabled": true,
                "multi_select": true,
                "set_endpoint": "/UserAgentOAuth/SetPickerAccounts",
                "item_value_field": "accountId",
                "item_label_field": "igusername"
              }
            },
            "fields": [
              {
                "key": "appid",
                "label": "App ID",
                "type": "text",
                "required": true,
                "only_in_modes": ["own"],
                "pattern": "^[0-9]+$",
                "oauth_managed": true
              },
              {
                "key": "appsecret",
                "label": "App Secret",
                "type": "password",
                "required": true,
                "show_toggle": true,
                "only_in_modes": ["own"],
                "oauth_managed": true
              },
              {
                "key": "systemusertoken",
                "label": "System User Token",
                "type": "password",
                "required": true,
                "show_toggle": true,
                "only_in_modes": ["api_key"]
              },
              {
                "key": "accountId",
                "label": "Instagram Account ID",
                "type": "text",
                "required": true,
                "readonly_when_connected": true,
                "pattern": "^[0-9]+$",
                "auto_filled_by_oauth": true
              },
              {
                "key": "igusername",
                "label": "Connected Account",
                "type": "text",
                "required": false,
                "readonly_when_connected": true,
                "auto_filled_by_oauth": true
              }
            ]
          },
          "_required_missing": false,
          "_filled": true,
          "authmethod": "api_key",
          "systemusertoken": "your-system-user-token",
          "accountId": "17841400000000000",
          "igusername": "mybrand",
          "connectedat": "2026-05-01T12:00:00.000Z",
          "tokenexpiresat": ""
        },
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
            "brand_text_color": "#FFFFFF",
            "brand_logo_filter": "brightness(0) invert(1)",
            "docs_url": "/docs/integration-telegram-skills",
            "credential_mode": "api_key",
            "connection_modes": [],
            "wiro_connect_pending": false,
            "oauth_provider": null,
            "fields": [
              {
                "key": "bottoken",
                "label": "Bot Token",
                "type": "password",
                "required": true,
                "placeholder": "123456789:ABC-DEF1234ghIkl-zyx57W2v1u123ew11",
                "help": "Issued by @BotFather when you create the bot."
              },
              {
                "key": "allowedusers",
                "label": "Allowed User IDs",
                "type": "string-array",
                "required": false,
                "pattern": "^\\d{5,}$"
              },
              {
                "key": "groups",
                "label": "Allowed Telegram Groups",
                "type": "object-array",
                "required": false,
                "item_schema": [
                  { "key": "chatid", "type": "text", "required": true, "pattern": "^-\\d{5,}$" },
                  { "key": "allowedusers", "type": "string-array", "required": true, "pattern": "^\\d{5,}$" }
                ]
              }
            ]
          },
          "_required_missing": false,
          "_filled": false,
          "bottoken": "",
          "allowedusers": [],
          "groups": []
        },
        "wordpress": {
          "_connected": false,
          "optional": false,
          "extra": false,
          "_editable": {
            "url":         true,
            "user":        true,
            "apppassword": true
          },
          "_schema": {
            "title": "WordPress",
            "icon": "https://wiro.ai/images/icons/skills/wordpress.svg",
            "brand_color": "#21759B",
            "brand_text_color": "#FFFFFF",
            "brand_logo_filter": null,
            "docs_url": "/docs/integration-wordpress-skills",
            "credential_mode": "api_key",
            "connection_modes": [],
            "wiro_connect_pending": false,
            "channel": null,
            "oauth_provider": null,
            "fields": [
              {
                "key": "url",
                "label": "WordPress URL",
                "type": "url",
                "required": true,
                "placeholder": "https://yourdomain.com"
              },
              {
                "key": "user",
                "label": "Username",
                "type": "text",
                "required": true
              },
              {
                "key": "apppassword",
                "label": "App Password",
                "type": "password",
                "required": true,
                "show_toggle": true
              }
            ]
          },
          "_required_missing": true,
          "_filled": false,
          "url": "",
          "user": "",
          "apppassword": ""
        }
      },
      "customskills": [
        {
          "key": "cs-content-tone",
          "description": "Brand voice + posting rules read by every content-generation skill on this agent.",
          "value": "## Brand Voice\nTone: friendly, casual, never salesy.\nTarget Audience: indie devs and side-project builders.\n\n## Hashtag Strategy\nMax 3 per post. Always include #BuildInPublic and #Indie.\n\n## Platform Rules\n- Instagram: square images only, carousels for tutorials.\n- Twitter: thread format for posts longer than 200 chars.",
          "enabled": true,
          "interval": null,
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
          "_source": "skill-bundle",
          "_editable": true,
          "_edited": false
        },
        {
          "key": "cs-cron-weekly-roundup",
          "description": "User-created weekly summary cron that posts a Monday recap to Telegram.",
          "value": "Every Monday at 09:00 UTC, summarize last week's published posts (titles + engagement) and post the recap to Telegram.",
          "enabled": true,
          "interval": "0 9 * * 1",
          "_source": "user-created",
          "_editable": true,
          "_edited": false,
          "_user_created": true
        }
      ],
      "skills": [
        { "name": "int-instagram-post", "enabled": true, "_edited": false, "_user_created": false },
        { "name": "int-twitterx-post",  "enabled": true, "_edited": true,  "_user_created": false },
        { "name": "int-wiro-aimodels", "enabled": true, "_edited": false, "_user_created": false }
      ],
      "skillsmeta": {
        "int-instagram-post": {
          "name": "int-instagram-post",
          "title": "Instagram Post",
          "icon": "https://wiro.ai/images/icons/skills/instagram.svg",
          "brand_color": "#e4405f",
          "brand_text_color": "#ffffff",
          "brand_logo_filter": "brightness(0) invert(1)",
          "category": "int",
          "docs_url": "integration-instagram-skills",
          "credential_key": "instagram",
          "additional_credential_keys": [],
          "requires_credentials": true,
          "user_invocable": true,
          "deprecated": false,
          "replacement": null,
          "description": "Post carousel feed and multi-story via Meta Graph API."
        },
        "int-twitterx-post": {
          "name": "int-twitterx-post",
          "title": "X (Twitter) Post",
          "icon": "https://wiro.ai/images/icons/skills/twitterx.svg",
          "brand_color": "#000000",
          "brand_text_color": "#ffffff",
          "brand_logo_filter": "brightness(0) invert(1)",
          "category": "int",
          "docs_url": "integration-twitter-skills",
          "credential_key": "twitterx",
          "additional_credential_keys": [],
          "requires_credentials": true,
          "user_invocable": true,
          "deprecated": false,
          "replacement": null,
          "description": "Compose tweets, threads, and replies on a connected X (Twitter) account."
        },
        "int-wiro-aimodels": {
          "name": "int-wiro-aimodels",
          "title": "Wiro AI Models",
          "icon": "https://wiro.ai/images/icons/skills/wiro.svg",
          "brand_color": "#33f2bc",
          "brand_text_color": "#0f1a24",
          "brand_logo_filter": null,
          "category": "int",
          "docs_url": null,
          "credential_key": "wiro",
          "additional_credential_keys": [],
          "requires_credentials": true,
          "user_invocable": true,
          "deprecated": false,
          "replacement": null,
          "description": "Universal access to every AI model on Wiro: text-to-image, text-to-video, image-to-image, image-to-video, audio/voice generation, realtime conversational AI, vision LLMs and more."
        }
      },
      "monthlycredits": 3000,
      "monthlypriceusd": 30,
      "extracredits": 5000,
      "usedcredits": 1450,
      "remainingcredits": 6550,
      "renewalcredits": 3000,
      "creditperiod": "2026-05",
      "creditsyncat": 1714694410,
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
      "subscription": {
        "plan": "agent",
        "status": "active",
        "amount": 30,
        "currency": "usd",
        "currentperiodend": 1717200000,
        "renewaldate": "2026-06-01T00:00:00.000Z",
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
          "starter": { "priceUsd": 5,   "credits": 500 },
          "pro":     { "priceUsd": 30,  "credits": 3000 },
          "max":     { "priceUsd": 100, "credits": 10000 }
        },
        "plans": [
          { "key": "starter", "title": "Starter", "priceUsd": 5,   "monthlyCredits": 500 },
          { "key": "pro",     "title": "Pro",     "priceUsd": 30,  "monthlyCredits": 3000 },
          { "key": "max",     "title": "Max",     "priceUsd": 100, "monthlyCredits": 10000 }
        ],
        "extracreditpacks": [
          { "packkey": "small",  "credits": 1000,  "priceusd": 10,  "enabled": true },
          { "packkey": "medium", "credits": 5000,  "priceusd": 50,  "enabled": true },
          { "packkey": "large",  "credits": 20000, "priceusd": 200, "enabled": true }
        ]
      },
      "extracreditsexpiry": 1730419200,
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
| `cover` | `string\|null` | Per-instance cover URL. Falls back to `agent.cover` for template deploys; `null` for custom builds without an uploaded cover. |
| `categories` | `array<string>` | Inherited from the template at deploy; editable via `Update`. |
| `pinned` | `boolean` | `true` when the user pinned this instance to the global header dropdown. Mutate via `Pin`. |

**Plan & credits**

| Field | Type | Description |
|-------|------|-------------|
| `tier` | `string` | The agent's plan: `"starter"`, `"pro"` or `"max"`. |
| `nextplan` | `string\|null` | The plan the agent moves to at its next renewal, set by a move to a lower plan with [`UpgradeTier`](#post-useragentupgradetier). An agent subscribed before the three plans also shows here the plan it renews on. `null` when no change is scheduled. Also on `MyAgents` and `PinnedAgents` rows. |
| `monthlypriceusd` | `number` | The monthly USD price the agent pays, set at deploy, at a plan change and at renewal. Mirrors `subscription.amount`. Once a wallet plan has ended, it shows the price the plan renews at, with that plan in `tier`: [`RenewSubscription`](#post-useragentrenewsubscription) never charges more. |
| `monthlycredits` | `number` | The credits this period grants. After a move to a higher plan inside a period it reads below `renewalcredits` until the next renewal: the difference in credits comes only for the time left. |
| `renewalcredits` | `number` | The credits a renewal grants on the agent's current plan. When `nextplan` is set, the next renewal grants that plan's credits instead, as `planChange.creditsFromRenewal` on [`PricingPreview`](#post-useragentpricingpreview) shows. |
| `extracredits` | `number` | Active extra-credit balance (sum of non-expired packs from `CreateExtraCreditCheckout`). |
| `extracreditsexpiry` | `number\|null` | Unix timestamp when the earliest extra credit pack expires. `null` when no extras are active. |
| `usedcredits` | `number` | Credits consumed during the current billing period, reported by the agent runtime. |
| `remainingcredits` | `number` | Computed: `max(0, monthlycredits + extracredits - usedcredits)`. |
| `creditperiod` | `string` | `'YYYY-MM'` tag of the current billing window. Rolls over on subscription renewal. |
| `creditsyncat` | `number\|null` | Unix seconds of the last monthly usage reset, which starts the current credit period (`null` until the first reset). |
| `tokenRates` | `object\|null` | Per-model token-billing rates (credits per 1,000,000 tokens). Shape: `{ default_model, fallback_rate, models: { "<slug>": { input_per_1m, output_per_1m, cached_input_per_1m?, cache_write_per_1m?, selectable?, label?, tier? } } }`. Each turn's cost is metered from these rates (1 credit = $0.01). See [Token Billing](#token-billing). `null` only on registry-read failure. |
| `agentModel` | `object` | The resolved model slugs this instance runs: `{ chatModel, cronModel, voicePrepModel, voicePostcallModel }` (camelCase). Each falls back to the platform default when the operator hasn't overridden it. Change them via [`POST /UserAgent/UpdateSettings`](#post-useragentupdatesettings) using the lowercase keys `chatmodel` / `cronmodel` / `voiceprepmodel` / `voicepostcallmodel`. |
| `enabledCommands` | `array<string>\|null` | The in-chat slash-command allowlist (camelCase read). `null` = the operator never customized it, so **all** slash commands are available. An array (including `[]`) is an explicit allowlist of command keys (no leading slash); `[]` hides the slash-command menu. Write it via [`POST /UserAgent/UpdateSettings`](#post-useragentupdatesettings) with the lowercase `enabledcommands` key. Also present on `MyAgents` / `PinnedAgents` rows. |
| `wiroApiAllowedPaths` | `array<string>` | The Wiro API endpoints the agent may call with its own Wiro project key (camelCase read), for example `["POST /v1/Run/*/*", "POST /v1/Task/Detail"]`. Always the list that applies: the agent's own list or, when it has none, the default list described under [`UpdateSettings`](#post-useragentupdatesettings). `[]` blocks all of them. Write it via [`POST /UserAgent/UpdateSettings`](#post-useragentupdatesettings) or at Deploy with the lowercase `wiroapiallowedpaths` key. Also on the `Deploy` and `Update` responses; not on `MyAgents` / `PinnedAgents` rows. |
| `chatSetup` | `string` | Setup From Chat as it applies to this agent (camelCase read): `"all"`, `"webchat"` or `"off"`. Write it via [`POST /UserAgent/UpdateSettings`](#post-useragentupdatesettings) or at Deploy with the lowercase `chatsetup` key. See [Setup From Chat](/docs/agent-messaging#setup-from-chat). |

**Lifecycle**

| Field | Type | Description |
|-------|------|-------------|
| `status` | `number` | Current status code (see [UserAgent Statuses](#useragent-statuses)). |
| `setuprequired` | `boolean` | `true` if any required credential is missing or incomplete. Mirrors `status: 6` plus a fresh check against the live credential rows. |
| `createdat` / `updatedat` / `queuedat` / `startedat` / `runningat` / `stoppingat` / `stopdat` / `errordat` | `number\|null` | Unix seconds for each lifecycle transition. `null` until the corresponding state is reached. |
| `lastactivityat` | `number\|null` | Unix seconds of the agent's last activity: the later of its newest message that isn't deleted and its newest token charge in the [credit ledger](/docs/agent-transactions). `null` when it has neither yet. Also on `MyAgents` rows; not on `PinnedAgents` rows. |

**Composed children**

| Field | Type | Description |
|-------|------|-------------|
| `credentials` | `object` | Per-provider credential map keyed by credential name (`instagram`, `telegram`, `wordpress`, …). Each provider object carries the live field values plus a fixed metadata header (see "Credential object shape" below). |
| `customskills` | `array` | Composed list of preset strategies and **non-cron** custom skills (writable instructions). Each entry: `{ key, description, value, enabled, interval: null, _source, _editable, _edited, _user_created? }`. `_source` ∈ `"preset-strategy"` \| `"user-created"`. |
| `scheduledskills` | `array` | Composed list of **cron** skills (`cs-cron-*`). Same shape as `customskills` plus `interval` (cron expression). `_source` ∈ `"skill-bundle"` (preset cron) \| `"user-created"`. |
| `skills` | `array<object>` | Currently-enabled integration skills. Each entry: `{ name, enabled: true, _edited, _user_created }`. Toggle via `SkillsApply` (single-skill or batch). Note: object array (not string array). |
| `skillsmeta` | `object` | Inline registry snapshot keyed by skill name: `title`, `icon`, `brand_color`, `category`, `docs_url`, `credential_key`, `requires_credentials`, `user_invocable`, `description`. Lets the panel render skill chips without a `Skills/List` round-trip. |
| `communicationChannels` | `array` | Every external channel with this agent's state: `id`, `title`, `credentialkey`, `required_fields`, `capabilities`, `schema`, `enabled`, `configured` and `missingfields`. Also on the `Deploy` and `Update` responses; not on `MyAgents` / `PinnedAgents` rows. |
| `enabledChannels` | `array<string>` | The ids of the channels in `communicationChannels` that are enabled. Same endpoints. |
| `teamsessionmode` | `string` | The unified Chat Mode: `"collaborative"` or `"private"` for every agent. For team agents it drives `Message/History`, `Sessions`, and native web-chat memory scope; for all agents it also drives Telegram, Slack, and Discord DM scope. Team deployments/transfers default collaborative; personal deployments/team detachments default private. Write with [`POST /UserAgent/UpdateSettings`](#post-useragentupdatesettings) (team admins / owner only). |
| `timezone` | `string\|null` | Operator-selected IANA timezone (e.g. `"Europe/Istanbul"`, `"America/New_York"`). `null` means **UTC**. The agent uses this zone for its scheduled tasks, for the times it gives on voice calls and for business hours. Write with [`POST /UserAgent/UpdateSettings`](#post-useragentupdatesettings). |

**Subscription & template**

| Field | Type | Description |
|-------|------|-------------|
| `subscription` | `object\|null` | Active subscription info (see "Subscription object" below), or `null` when the agent has no active subscription. For API-deployed instances this is always `provider: "prepaid"`, `plan: "agent"`. |
| `agent` | `object` | Parent template summary: `{ guid, title, slug, headline, description, cover, icon, categories, tiers, plans, extracreditpacks }`. For custom builds (`agent.custom: true`) it's a synthesized placeholder instead: `{ custom: true, slug, cover: null, icon: null, tiers, plans, extracreditpacks }`, with no `guid`, `title`, `headline`, `description` or `categories`. Read the agent's title and cover from the useragent itself. |

##### Credential object shape

Every provider entry under `credentials.<key>` carries:

| Sub-field | Type | Description |
|-----------|------|-------------|
| `_connected` | `boolean` | Connection-readiness flag. `true` when Wiro has a validated OAuth or hybrid direct credential and every required picker field is populated. Plain API-key and service-account providers can remain `false`; for those use `_required_missing` or inspect the field values directly. |
| `optional` | `boolean` | `true` when the agent template marks this credential as optional (the agent can run without it; the dependent skill just won't fire). `false` for required credentials. On a custom build, each skill's own connector reads `false`, and a connector it lists in `additional_credential_keys` reads `true`, unless another skill on the agent has that connector as its own. |
| `extra` | `boolean` | `true` when this credential surfaces in the "alternative" / secondary group on the panel (rare; most credentials are primary). |
| `_editable` | `object` | Per-field edit map: `{ fieldname: true\|false }`. `false` means the field is read-only (managed by OAuth, platform-managed, or computed). The frontend uses this to disable inputs. |
| `_schema` | `object` | Inline registry descriptor: `title`, `icon`, `brand_color`, `docs_url`, `credential_mode` (`oauth`, `api_key`, `hybrid`, etc.), `connection_modes`, `default_connection_mode`, `mode_badges`, `channel` (a communication channel's connector; `null` on any other), `oauth_provider`, plus a `fields[]` array describing every input the form should render. Lets the panel build connector cards without a separate `Credentials/Detail` round-trip. |
| `_required_missing` | `boolean` | `true` when this connector is required (`optional: false`) and a required field you fill in is still empty. Drives the "needs attention" bullet on each connector card and the aggregate count badge on the Connectors tab. Always `false` on an optional connector. A list field counts as empty while its rows hold nothing but a choice or a switch, such as a default platform on an otherwise blank row. A value the agent template holds counts as filled, even on a secret field that reads empty here. |
| `_filled` | `boolean` | `true` when the connector holds what the agent needs: its OAuth connection is made, or at least one field holds a value and no required field you fill in is empty. A value the agent template holds counts, even on a secret field that reads empty here. For `setuprequired`, an API-key connector counts only the values saved on this agent; see [Setup Required](/docs/agent-credentials#setup-required-state). |
| `connectedat` | `string\|null` | OAuth and hybrid providers: ISO timestamp of the last successful connection. |
| `tokenexpiresat` | `string\|null` | ISO timestamp when the current token expires, or an empty value when the provider reports no fixed expiry. |
| `<fieldname>` | `string\|number\|boolean\|array` | The field value as you (or the OAuth callback) saved it, returned to the agent's owner and team admins. Field types match `_schema.fields[].type`. Never returned: OAuth tokens (`oauth_session`), OAuth app keys (`clientid` / `clientsecret`, `appid` / `appsecret`), Wiro-managed fields, and a value the agent template holds on a field Wiro stores encrypted or on an `oauth_managed` field: such a field reads empty until you save your own. |

##### Subscription object

| Sub-field | Type | Description |
|-----------|------|-------------|
| `plan` | `string` | Always `"agent"`. The plan (Starter, Pro or Max) is the useragent's `tier` field, not the subscription's. |
| `status` | `string` | `"active"`, `"expired"`, `"cancelled"`, or `"refunded"`. |
| `amount` | `number` | The monthly USD price actually being charged. Mirrors `useragent.monthlypriceusd`. |
| `currency` | `string` | Always `"usd"`. |
| `currentperiodend` | `number\|null` | Unix seconds when the current billing period ends. |
| `renewaldate` | `string\|null` | ISO-8601 string of the same period-end timestamp (convenience for display). |
| `daysremaining` | `number` | Days until `currentperiodend`. |
| `pendingdowngrade` | `string\|null` | `"cancel"` after `CancelSubscription`; `null` for normal active subs. A move to a lower plan shows in the agent's `nextplan`, not here. |
| `provider` | `string` | `"prepaid"` for every API-deployed subscription. |

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
> | Provider credentials (API keys, OAuth settings) | [`POST /UserAgent/CredentialUpsert`](#post-useragentcredentialupsert) |
> | The Wiro project the agent runs models with | [`POST /UserAgent/CredentialProjectBind`](#post-useragentcredentialprojectbind) |
> | Upload a credential `fileinput` field (multipart, e.g. Twilio voice MP3) | [`POST /UserAgent/CredentialFileUpload`](#post-useragentcredentialfileupload) |
> | Custom skill values (strategy text, cron intervals, enabled flag) | [`POST /UserAgent/CustomSkillUpsert`](#post-useragentcustomskillupsert) |
> | Rename a user-created custom skill (key + optional description) | [`POST /UserAgent/CustomSkillRename`](#post-useragentcustomskillrename) |
> | Browse alternative templates for a custom skill | [`POST /UserAgent/CustomSkillAlternatives`](#post-useragentcustomskillalternatives) |
> | Delete a user-created scheduled task | [`POST /UserAgent/CustomSkillDelete`](#post-useragentcustomskilldelete) |
> | Toggle one or more integration skills on/off | [`POST /UserAgent/SkillsApply`](#post-useragentskillsapply) |
> | Change the plan (Starter, Pro or Max) | [`POST /UserAgent/UpgradeTier`](#post-useragentupgradetier) |
> | Upload a cover image (multipart) | [`POST /UserAgent/Cover`](#post-useragentcover) |
> | Per-agent timezone or unified Chat Mode | [`POST /UserAgent/UpdateSettings`](#post-useragentupdatesettings) |
> | View / download / delete activity logs | [`POST /UserAgent/Logs`](#post-useragentlogs) · [`LogsList`](#post-useragentlogslist) · [`LogsFile`](#post-useragentlogsfile) · [`LogsDelete`](#post-useragentlogsdelete) |
> | Follow Scheduled Tasks, background runs and model runs live | [`POST /UserAgent/RunStreamToken`](#post-useragentrunstreamtoken) |
> | Soft-delete a useragent | [`POST /UserAgent/Delete`](#post-useragentdelete) |

> **Note:** `CredentialUpsert` and `CredentialProjectBind` save connector fields **but do not transition `status: 6` on their own**. After setting up the missing connectors, call `POST /UserAgent/Update` once (any scalar body works, even just `{ "guid": "<useragent-guid>" }`) to trigger the `setuprequired` re-check; that's the call that flips `status: 6 → 0` (Stopped) so the next `Start` succeeds.

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
      "monthlycredits": 500,
      "extracredits": 0,
      "usedcredits": 80,
      "remainingcredits": 420,
      "renewalcredits": 500,
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
          "starter": { "priceUsd": 5,   "credits": 500 },
          "pro":     { "priceUsd": 30,  "credits": 3000 },
          "max":     { "priceUsd": 100, "credits": 10000 }
        },
        "plans": [
          { "key": "starter", "title": "Starter", "priceUsd": 5,   "monthlyCredits": 500 },
          { "key": "pro",     "title": "Pro",     "priceUsd": 30,  "monthlyCredits": 3000 },
          { "key": "max",     "title": "Max",     "priceUsd": 100, "monthlyCredits": 10000 }
        ],
        "extracreditpacks": [
          { "packkey": "small",  "credits": 1000,  "priceusd": 10,  "enabled": true },
          { "packkey": "medium", "credits": 5000,  "priceusd": 50,  "enabled": true },
          { "packkey": "large",  "credits": 20000, "priceusd": 200, "enabled": true }
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

> **`Update` returns the full composed useragent shape**: same composition path as `UserAgent/Detail`, so `credentials`, `customskills`, `scheduledskills`, `skills`, `skillsmeta`, `tokenRates`, `agentModel`, `communicationChannels`, `enabledChannels`, and the `agent` template summary (with `tiers`, `plans` and `extracreditpacks`) are all included. The fields `Update` cannot safely populate without an extra round-trip (`subscription`, `extracreditsexpiry`, `lastactivityat`) stay omitted. Call `UserAgent/Detail` next if you need them. Otherwise the response is suitable for an in-place panel re-render without a follow-up call.

> **`restarting`.** `true` when this call restarts the agent, `false` otherwise. With `true`, the row shows the transition mid-flight: `status: 1` (Stopping) with a fresh `stoppingat` timestamp. Wiro re-queues the agent once it has stopped, so it comes back with the new title. A restart request that can't be carried out answers `Failed to restart user agent`; try again.

#### **POST** /UserAgent/UpdateSettings

Writes per-agent preference toggles that are not credentials and not skill rows. Exposes `timezone` (operator-selected IANA zone the agent uses for scheduled tasks and voice calls), `teamsessionmode` (the one Chat Mode for team web-chat history and external-channel DMs), the four **model overrides** (`chatmodel`, `cronmodel`, `voiceprepmodel`, `voicepostcallmodel`) that choose which LLM the agent uses for chat replies, scheduled (cron) turns, voice-call prep, and the post-call summary turn, `enabledcommands` (the in-chat slash-command allowlist), `wiroapiallowedpaths` (the Wiro API endpoints the agent may call with its own Wiro project key), and `chatsetup` (where people can change the agent's setup from chat). Submit any subset in the same call: partial updates are supported and untouched fields keep their current value.

**Permission**: owner or team admin only, as for `/UserAgent/Update`. Team members cannot change these settings.

**Restart**: if the agent is **starting (status `3`)** or **running (status `4`)**, the call restarts it so the new timezone, session mode or model selection applies. Moving `chatsetup` between `"all"` and `"webchat"` doesn't restart it: Wiro checks that difference on each message. For agents in status `0`/`1`/`2`/`5`/`6` the change applies on the next `Start`.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Your UserAgent instance guid. |
| `timezone` | string\|null | No | IANA timezone identifier (e.g. `"Europe/Istanbul"`, `"America/New_York"`, `"Asia/Tokyo"`). Pass `null`, `""`, or the literal `"UTC"` to **clear** the override; the agent then uses UTC. Unknown zones are rejected with `invalid-timezone`. |
| `teamsessionmode` | string | No | Unified Chat Mode: `"private"` isolates each team member's Wiro web-chat history and native agent memory plus each approved external-channel DM operator; `"collaborative"` shares both runtime contexts. Personal agents can set it because external-channel DMs can have multiple operators. Web and external-channel message lists remain separate transports; room/thread sessions remain room-scoped. Channel activation remains credential-derived. |
| `chatmodel` | string\|null | No | Canonical model slug for **chat replies** (e.g. `"openai/gpt-5.6-sol"`). Must be a **selectable** model, i.e. `tokenRates.models[<slug>].selectable === true`; an unknown / non-selectable slug is rejected with `invalid-model-selection`. Pass `null` or `""` to clear the override and fall back to the platform default. |
| `cronmodel` | string\|null | No | Same rules as `chatmodel`, applied to **scheduled (cron) turns**. |
| `voiceprepmodel` | string\|null | No | Same rules as `chatmodel`, applied to the **voice-call prep** turn (context assembled before a realtime call). |
| `voicepostcallmodel` | string\|null | No | Same rules as `chatmodel`, applied to the **post-call summary** turn after a realtime voice call ends. |
| `enabledcommands` | string[] | No | Allowlist of in-chat **slash commands** the agent exposes, as an array of command keys **without** the leading slash (e.g. `["agent_help", "new_session", "agent_status"]`). Validated against the command catalog: an unknown key is rejected with `invalid-command-selection`, a non-array value with `invalid-command-list`. Order is preserved and duplicates are removed. An empty array `[]` is valid and **hides the slash-command menu** entirely. Omit the field to leave the current allowlist untouched. |
| `wiroapiallowedpaths` | string[]\|null | No | Limits the agent's own calls to the Wiro API, the ones it makes with its Wiro project key (for example through `int-wiro-aimodels`), to the endpoints you list. Each rule is a method in capitals (`GET`, `POST`, `PUT`, `PATCH`, `DELETE` or `HEAD`), one space and a `/v1` path, such as `"POST /v1/Task/Detail"`. A `*` stands for exactly one whole path segment: `"POST /v1/Run/*/*"` allows every model run, while `"POST /v1/Run/x*"` is invalid. Up to 64 rules of at most 200 characters each; duplicates are removed and the order is kept. Calls to endpoints that no rule matches are refused. `[]` refuses every call, model runs included; `null` removes your list, and the agent goes back to the default list. An invalid rule, or a value that isn't an array, is rejected with `invalid-wiro-api-path-rule`, and nothing in the request is saved. Omit the field to keep the current list. An agent with no list of its own uses the default list: `POST /v1/Run/*/*`, `POST /v1/Task/Detail`, `POST /v1/Tool/List`, `POST /v1/Tool/Detail`, `POST /v1/Tool/UploadModelPostImage`, `POST /v1/Tool/GenerateModelPostImage`, `GET /v1/Tool/GenerateModelPostImage` and `POST /v1/UserAgent/Message/UploadAsset`. If a custom skill of yours calls another endpoint, send a list that includes it. |
| `chatsetup` | string\|null | No | Setup From Chat: where people can change the agent's setup by approving setup cards in chat. `"all"` (the default): in the Wiro web chat and in messages sent with a project API key, such as from your backend or an MCP client. `"webchat"`: only in the Wiro web chat on wiro.ai. `"off"`: never from chat; the agent points people to the agent page. `null` goes back to `"all"`, and any other value is rejected. Agents that your customers or many people talk to usually choose `"webchat"` or `"off"`; see [Setup From Chat](/docs/agent-messaging#setup-from-chat). Read it back as `chatSetup` on [`UserAgent/Detail`](#post-useragentdetail). |

> **Slash-command catalog.** Valid `enabledcommands` keys are: `agent_help`, `new_session`, `agent_status`, `agent_limits`, `last_scan`, `last_heartbeat`, `agent_restart`, `clear_all_sessions`, `clear_history`. Read the agent's current allowlist from the `enabledCommands` field (camelCase) on [`UserAgent/Detail`](#post-useragentdetail) / `MyAgents` / `PinnedAgents`, where `null` means the operator never customized it (all commands available) and an array (including `[]`) is an explicit allowlist.

> **Omitted fields are preserved.** The handler distinguishes between "field not in the body" and "field present with `null`/`""`/value", so a POST that carries only `timezone` does **not** touch `teamsessionmode` or any model field, and vice versa. Sending an empty body (none of the recognised fields) is rejected with `nothing-to-update` to avoid charging a no-op restart.

> **Read vs write casing.** You **read** the current selection from the `agentModel` object on `UserAgent/Detail` / `MyAgents` / `PinnedAgents` in camelCase (`chatModel`, `cronModel`, `voicePrepModel`, `voicePostcallModel`); you **write** it here in lowercase (`chatmodel`, `cronmodel`, `voiceprepmodel`, `voicepostcallmodel`). The selectable set is exactly the models that `tokenRates.models` marks `selectable: true`. There is no separate "list models" endpoint, so read `tokenRates` to populate a picker.

> **An agent never manages an account.** Calls the agent makes itself to account, agent, team and billing endpoints, such as `/UserAgent/*`, `/Project/*`, `/Team/*` and `/Wallet/*`, are refused with HTTP `403` whatever `wiroapiallowedpaths` allows: `An agent can't call this endpoint. Agent settings change only from the agent page or a setup card in chat.` `POST /v1/UserAgent/Message/UploadAsset` stays open. An agent changes its own setup only through [setup cards](/docs/agent-messaging#setup-from-chat) that an agent admin approves.

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

| Code | Message key | When |
|------|-------------|------|
| 400 | `request-parameter-required` | `useragentguid` missing from the body. |
| 400 | `nothing-to-update` | Body had none of the recognised fields (`timezone`, `teamsessionmode`, a model override, `enabledcommands`, `wiroapiallowedpaths` or `chatsetup`). |
| 400 | `invalid-timezone` | `timezone` is not a valid IANA time zone. |
| 400 | `teamsessionmode must be private or collaborative` | `teamsessionmode` wasn't one of the two supported values. |
| 400 | `directchatmode is not accepted` | Obsolete separate mode was sent instead of unified `teamsessionmode`. |
| 400 | `invalid-model-selection` | A model override (`chatmodel` / `cronmodel` / `voiceprepmodel` / `voicepostcallmodel`) was an unknown or non-selectable slug (`tokenRates.models[<slug>].selectable !== true`). |
| 400 | `invalid-command-list` | `enabledcommands` was present but not an array. |
| 400 | `invalid-command-selection` | `enabledcommands` contained a key that isn't in the slash-command catalog. |
| 400 | `invalid-wiro-api-path-rule` | `wiroapiallowedpaths` was not an array, or a rule broke the format or the limits above. |
| 403 | `useragent-access-denied` | Caller is neither the owner nor on the agent's team. |
| 403 | `useragent-team-admin-required` | Caller is a member of the agent's team but not a team admin. Carries `errors[0].code: 97`. |
| 500 | `failed-to-update-useragent` | DB write failed (transient, safe to retry). |

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
      "monthlycredits": 500,
      "extracredits": 0,
      "usedcredits": 80,
      "remainingcredits": 420,
      "renewalcredits": 500,
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

> **Cover returns scalar useragent fields + the `agent` template summary only.** Its credit fields read as on `Detail` (`monthlycredits` for this period, `renewalcredits`, `extracredits`, `usedcredits`, `remainingcredits`). It does **not** include `setuprequired`, `tokenRates`, `agentModel`, or any composed children (`credentials`, `customskills`, `scheduledskills`, `skills`, `skillsmeta`, `subscription`). The endpoint is optimised for the cover refresh round-trip; call `UserAgent/Detail` afterwards if you need the full composed shape.

#### **POST** /UserAgent/CredentialUpsert

Writes one or more credential fields for one or multiple providers in a single call.

If the agent is **starting** or **running**, completing the upsert triggers an automatic restart.

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
| `credentialkey` | string | The provider key: e.g. `"instagram"`, `"google-ads"`, `"wordpress"`, `"telegram"`. Must match one of the credentials declared in `credentials` on `/UserAgent/Detail`. |
| `fieldname` | string | Field inside that credential: e.g. `"apikey"`, `"clientid"`, `"bottoken"`. Must not start with `_` (reserved for internal sentinels such as `_isoptional`, `_isextra`). |
| `fieldvalue` | string \| number \| array | The value to write. An empty string clears an optional single-value field; send `[]` to clear a list field. Clearing a required field fails validation, except on Telegram, Slack and Discord, where it disables the channel. |
| `fieldstatus` | string | **Server-managed: ignored from the request body for API callers.** The value is derived from the registry / OAuth flow on the server side (e.g. `user` for hand-edited fields, `oauth_session` for tokens written by the OAuth callback, `oauth_app` for app credentials, etc.). Do not set this field. It is stripped before any write. |
| `parentfield` | string | Optional. The key of a list field (e.g. `"accounts"` for `firebase.accounts[]`) when the row sets one field of a single entry in that list. A list inside the entry, such as its `apps`, is sent whole as that field's `fieldvalue`. |
| `ordinal` | number | Optional. Array index inside `parentfield`. Defaults to `0`. |

##### Request

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/CredentialUpsert" \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
    "fields": [
      { "credentialkey": "wordpress", "fieldname": "url",         "fieldvalue": "https://myblog.com" },
      { "credentialkey": "wordpress", "fieldname": "user",        "fieldvalue": "admin" },
      { "credentialkey": "wordpress", "fieldname": "apppassword", "fieldvalue": "abcd efgh ijkl mnop" }
    ]
  }'
```

##### Response

```json
{ "result": true, "applied": 3, "errors": [] }
```

`applied` is the number of rows saved without an error; a row sent with its current value still counts. Every row is validated before anything is written. If any row fails validation (for example a reserved fieldname, a Wiro-managed field or an OAuth token field), the whole request is rejected and nothing is saved: the response has `result: false`, one `errors` entry per invalid row, and no `applied`. If a save fails after validation has passed, the other rows are still saved and the response has `result: false`, the `applied` count, and each failed row in `errors`. Re-sending the same request is safe.

> **Twilio Voice: extra response fields.** When any `twilio-voice` field is touched, `CredentialUpsert` also auto-configures each Twilio phone number's `VoiceUrl` and surfaces the result on the response:
>
> | Field | Type | Meaning |
> |-------|------|---------|
> | `twilioWebhooksUpdated` | `string[]` | E.164 numbers whose `VoiceUrl` was just pointed at the Wiro Twilio webhook. |
> | `twilioWebhookSkipped` | `string` | Returned instead of `twilioWebhooksUpdated` when the `VoiceUrl` step was skipped, with the reason: the Twilio credentials are incomplete, the credential has no phone numbers, or none of its numbers is on the Twilio account. |
> | `twilioWebhooksFailed` | `object[]` | One `{ phoneNumber, error }` entry per number whose update Twilio rejected. |
> | `twilioWebhookError` | `string` | Top-level message when the entire VoiceUrl-rewrite flow failed (auth error, network outage). The credential rows are still saved. Only the auto-configuration step failed. |
>
> Treat all four fields as best-effort: the credential write itself never depends on Twilio's API call succeeding. See [Twilio Voice Integration](/docs/integration-twiliovoice-skills) for the full lifecycle.

#### **POST** /UserAgent/CredentialProjectBind

Connects an agent's Wiro AI Models connector (`int-wiro-aimodels`, the `wiro` key under `credentials`) to one of your Wiro projects. You name the project, and Wiro saves that project's API key on the agent. The agent's model runs are paid from the wallet of the workspace that owns the project.

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

Binding the project an agent already has changes nothing and restarts nothing. Changing a project's IP whitelist gives the project a new API secret; to load it, restart the agent with `POST /UserAgent/Update` and a body of `{ "guid": "<useragent-guid>" }`.

On an agent at `status: 6` (Setup Required), call `POST /UserAgent/Update` with `{ "guid": "<useragent-guid>" }` after binding, as after `CredentialUpsert`. Binding doesn't change `status`: `Update` moves the agent to `status: 0` (Stopped) once every required connector is set up, and `Start` refuses it until then.

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
| `credentialkey` | text | Yes | Provider key (e.g. `twilio-voice`). Must declare a `fileinput` field in its registry schema. |
| `fieldname` | text | Yes | The exact `fieldname` whose registry `type` is `"fileinput"` (e.g. `holdaudio` or `holdmusic` on `twilio-voice`). |
| `file` | file | Yes | The blob. Mimetype + size are validated against the registry's `filetypes[]` whitelist and `maxsize` (KB) cap. Default cap is 10 MB when the field omits `maxsize`. |

> **`fileinput` vs `fileinput-base64`.** This endpoint is the storage path for the `fileinput` type only: the file is stored by Wiro and the credential keeps a reference to it. The companion `fileinput-base64` type is stored with the credential (encrypted at rest) and is written via the standard `CredentialUpsert` JSON `fields[]` array (e.g. `serviceaccountjson` on `google-drive`/`google-calendar`/`google-play`/`firebase`, `privatekey` on `apple-appstore`). Sending a base64 field through this endpoint returns `Field is not a fileinput type`.

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
| `Unknown credential: <key>` | `credentialkey` not declared in the skill registry |
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
| `skillkey` | string | Yes | The skill key. Strategies use bare names (e.g. `"content-tone"` → stored as `cs-content-tone`). For a scheduled task, send its full key (e.g. `"cs-cron-social-content-scanner"`), or a bare slug together with `interval` (`"weekly-report"` → `cs-cron-weekly-report`). Don't send a `cron-…` key with an `interval`: it becomes `cs-cron-cron-…`, a new task. |
| `value` | string | No | Strategy body / cron prompt text. Editable for preset strategies and user-created entries; bundled crons silently drop `value` writes. |
| `interval` | string | No | Cron expression (e.g. `"0 */4 * * *"`). Only persisted on `cs-cron-*` rows. On a scheduled task it must be a schedule the agent can run (see below). |
| `enabled` | boolean | No | Turn the skill on or off. **Writable for both strategies (`cs-*`) and crons (`cs-cron-*`)**. A disabled strategy is suppressed end-to-end (it still appears in the list, but the agent never loads it). Defaults to `true` on insert. |
| `description` | string | No | Only persisted for user-created skills (preset descriptions are template-owned). On a preset row, sending the current description back unchanged is ignored; a different text is rejected with `customskill-preset-description-not-editable`. |

> **Description-only edits skip the restart.** If you only change `description` and the row's functional fields (`value`, `interval`, `enabled`) stay the same, the agent is **not** restarted. Functional changes still trigger the standard auto-restart.

> **Schedules the agent can't run are refused.** A scheduled task's `interval` is a cron expression with five fields, `minute hour day month weekday`, such as `0 9 * * 1-5`. A schedule the agent can't run, or one whose date never comes, such as 30 February, is refused before anything is saved, and the error says what is wrong and what to write: `0 25 * * *` gets `This schedule can't run. The hour field takes 0 to 23. A schedule has five fields: minute hour day month weekday, for example 0 9 * * 1-5.`, and `0 0 30 2 *` gets `This schedule never comes up: February has no 30th. Pick a day February has, such as 28.` Only a schedule sent in the request is checked, so a task that already has one can still be edited or turned on and off.

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
{ "result": true, "errors": [] }
```

#### **POST** /UserAgent/CustomSkillRename

Renames a user-created custom skill, optionally updating its description in the same atomic write. Only rows with `usercreated: true` can be renamed. Preset-owned rows reject with `agent-customskill-rename-preset-forbidden`.

The skillkey flavour is preserved: a `cs-cron-*` scheduled task stays scheduled, a `cs-*` strategy stays a strategy. Cross-flavour renames are rejected. Delete + re-create via `CustomSkillUpsert` with the right kind if you need to switch sections.

Version history is migrated under the new key so the full audit chain stays continuous after the rename, and a new `rename` entry is appended.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Your UserAgent instance guid |
| `oldskillkey` | string | Yes | The skill's current canonical key (e.g. `cs-my-strategy`, `cs-cron-daily-summary`). |
| `newskillkey` | string | Yes | The new skill key. The server canonicalises bare slugs using the flavour of `oldskillkey`: if old is `cs-cron-*` the new slug lands on `cs-cron-*`; otherwise `cs-*`. |
| `description` | string | No | New description. Omit to leave unchanged; pass an empty string to clear. |

> **Restart.** The agent restarts on success so it uses the renamed key (same behaviour as `CustomSkillUpsert` functional edits).

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

| Error message key | When |
|---|---|
| `agent-customskill-rename-preset-forbidden` | Target row has `usercreated: false` (preset-owned). |
| `agent-customskill-rename-flavour-mismatch` | Caller tried to rename `cs-cron-*` ↔ `cs-*`. Delete + re-create with the right kind instead. |
| `agent-customskill-rename-collision` | `newskillkey` already exists on this useragent. |
| `agent-customskill-rename-same-key` | `oldskillkey` equals canonicalised `newskillkey`: nothing to change. |
| `agent-customskill-not-found` | `oldskillkey` does not exist on the useragent. |

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
| User-created (`usercreated: true`) on any agent | **Allowed**: row is hard-deleted, agent restarts. |
| Registry-owned / preset-owned (`usercreated: false`) on a **template** agent (the skill also exists in the template's preset skills) | **Rejected**: `"This skill belongs to the agent preset and cannot be deleted."` Disable it via `CustomSkillUpsert` with `enabled: false` instead. |
| Registry-owned (`usercreated: false`) on a **custom-build** agent (no preset to compare against) | **Rejected**: `"This skill is registry-owned and cannot be deleted."` Disable it via `CustomSkillUpsert` with `enabled: false` instead. Custom builds carry registry-seeded rows (e.g. `cs-approval-policy`, bundled `cs-cron-*` clones) whose runtime contract the agent depends on, even though there's no template back-reference. |

In both reject branches the response carries `suggestion: "disable-via-upsert"` so panel UIs can offer a "Disable instead" CTA without re-querying the registry.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Your UserAgent instance guid |
| `skillkey` | string | Yes | The skill key to remove. User-created rows only. Registry-owned rows reject with `disable-via-upsert`. |

##### Response (delete allowed)

```json
{ "result": true, "errors": [] }
```

##### Response (preset-owned, rejected with suggestion)

```json
{
  "result": false,
  "errors": [
    {
      "code": 0,
      "message": "This skill belongs to the agent preset and cannot be deleted. Use enabled=false to disable it instead."
    }
  ],
  "suggestion": "disable-via-upsert"
}
```

##### Response (registry-owned on a custom build, rejected with suggestion)

```json
{
  "result": false,
  "errors": [
    {
      "code": 0,
      "message": "This skill is registry-owned and cannot be deleted. Use enabled=false to disable it instead."
    }
  ],
  "suggestion": "disable-via-upsert"
}
```

#### **POST** /UserAgent/CustomSkillHistory

Returns the version history for one custom skill on a useragent: a per-write audit trail with diff metadata + the resolved actor for each entry. Powers the "Version History" modal in the panel; useful for API consumers building audit views.

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
      "operation": "upsert",
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
> - `after_*`: value the row was left with after this action committed: pulled from the next-newer entry's BEFORE state, or from the skill's current live state for the newest entry. `null` when `operation: "delete-user"` (row was removed).
> - `changed_fields[]`: names of fields whose value differs from the immediately-older entry. Subset of `["value", "interval", "enabled"]`.
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

`action` is `"reverted"`, `"reset-to-preset"`, `"deleted"` (preset removed upstream), or `"no-op"` (already matches target).

#### **POST** /UserAgent/CredentialFieldHistory

Returns the per-field write history for one credential group on a useragent. Sensitive values are redacted at read time as a belt-and-suspenders guard:
- `oauth_session` fields (access / refresh tokens) **never** appear in history at all. They're stripped before persisting.
- `clientsecret` and similar `oauth_app` secret fields are stored as `[REDACTED]` in history rows (the live value stays server-side, and `UserAgent/Detail` doesn't return it either).
- Wiro-managed credentials return an empty `entries[]`.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Your UserAgent instance guid |
| `credentialkey` | string | Yes | Provider key (e.g. `"instagram"`, `"wordpress"`) |
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
      "credentialkey": "instagram",
      "fieldname": "igusername",
      "fieldvalue": "myaccount",
      "fieldstatus": "user",
      "parentfield": null,
      "ordinal": 0,
      "operation": "upsert",
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
    },
    {
      "guid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
      "credentialkey": "instagram",
      "fieldname": "clientsecret",
      "fieldvalue": "[REDACTED]",
      "fieldstatus": "oauth_app",
      "parentfield": null,
      "ordinal": 0,
      "operation": "upsert",
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
      "changedat": 1714600000
    }
  ]
}
```

> `changedby_user` is the resolved actor object (`uuid`, `firstname`, `lastname`, `email`, `username`, `avatar`, `avatarinitials`). It is `null` when `changedby` is a system value such as `"system"` or `"backfill-*"`, or when the user record has been deleted.

#### **POST** /UserAgent/SkillsApply

Applies a batch of skill toggles in a single transactional unit. **This is the only skill-toggle endpoint API consumers should use**. Even when you're flipping a single skill, send it as a one-entry `skills` map. The single-skill `SkillToggle` endpoint also exists, but `SkillsApply` is the one to use from the API.

Every plan includes every skill, so a skill change never moves money: the plan's price and credits stay as they are, and the agent needs no active plan for it. Change the plan itself with [`UpgradeTier`](#post-useragentupgradetier).

Designed for both the Skill Editor modal (multiple toggles in one save) and one-off API mutations:

1. Triggers exactly **one agent restart** after all toggles land.
2. Uses **idempotency**: concurrent calls or client retries can't apply the change twice.
3. **Atomic**: the whole batch lands, or none of it does.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Your UserAgent instance guid (template deploy or custom build) |
| `skills` | object | Yes | Map of `{ "skillname": true \| false }` for every skill you want to set. Skills not in the map keep their current state. |
| `tier` | string | No | Kept for older clients. Skills never change the plan: a value other than the agent's current plan is refused with `Change the plan with UpgradeTier.` |
| `idempotencyKey` | string | Yes | Caller-generated unique key (UUID recommended). Replays of the same key return the cached response without applying the change again. |

**Headers:** No extra header is needed. For team agents, use an API key from a project in the agent's team. Keys from another workspace are rejected.

##### Request

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/SkillsApply" \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
    "idempotencyKey": "550e8400-e29b-41d4-a716-446655440000",
    "skills": {
      "int-instagram-post": true,
      "int-twitterx-post":  true,
      "int-reddit-post":     false
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
  "pricing": {
    "enabledSkills": ["int-instagram-post", "int-twitterx-post", "int-wiro-aimodels"]
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
| `restartTriggered` | `boolean` | `true` when the agent runtime was restarted to pick up the new skill set. `false` for stopped agents (no restart needed) or no-op batches. |
| `restartedAt` | `number\|null` | Unix seconds when the restart trigger fired. `null` when `restartTriggered` is `false`. |
| `pricing.enabledSkills` | `array<string>` | Final enabled skill set including transitive `depends_on` closure, as a flat array of skill names. The matching `useragent.skills` array on the next `Detail` call is an object array (`{name, enabled, _edited?, _user_created?}`); take `.name` from each entry to compare. |

##### Common error codes

| Code | Meaning |
|------|---------|
| `101` | `skillsapply-deps-violation`: a final enabled skill has unsatisfied `depends_on`. Body includes `deps[]`. |
| `102` | `skillsapply-conflict`: two finally-enabled skills are mutually exclusive. Body includes `conflicts[]`. |
| `104` | `skillsapply-in-progress`: another `SkillsApply` is already running on this useragent. Wait and retry. |
| `105` | `Change the plan with UpgradeTier.`: the `tier` sent is not the agent's current plan. Nothing is changed. Change the plan with [`UpgradeTier`](#post-useragentupgradetier), and send skill changes without `tier`. |
| `108` | `skillsapply-db-tx-failed`: DB transaction rolled back; safe to retry with a new idempotency key. |

#### **POST** /UserAgent/PricingPreview

Previews a plan or skill change without writing anything. It lists the three plans, resolves the skill set (with `depends_on`) and, for an agent with an active plan, says in `planChange` what the change would do today. The Build Your Agent and Skill Editor screens call it as the user picks a plan or toggles skills.

Two body shapes:

##### A. Draft preview (custom builder, no useragent yet)

```json
{
  "draft": true,
  "tier": "pro",
  "skills": ["int-instagram-post", "int-wiro-aimodels"]
}
```

##### B. Existing useragent preview

```json
{
  "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
  "tier": "max",
  "skillOverrides": {
    "int-instagram-post": true,
    "int-reddit-post":    false
  }
}
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `draft` | boolean | A | When `true`, no useragent lookup happens; Wiro resolves the `skills` array directly. Used by Build Your Agent. |
| `skills` | array<string> | A | Draft mode only: the proposed enabled skill set. |
| `useragentguid` | string | B | Required for non-draft previews. |
| `skillOverrides` | object | No | Override the persisted state with `{ skillname: boolean }` for the preview. Omit for "current state" preview. |
| `tier` | string | No | `"starter"`, `"pro"` or `"max"`: the plan to preview. Defaults to the agent's plan, or Starter in a draft. The response lists all three plans under `tiers`. |

##### Response

A Pro agent on a wallet plan, previewing Max with 15 days left of 30:

```json
{
  "result": true,
  "errors": [],
  "tier": "max",
  "totalPriceUsd": 100,
  "totalMonthlyCredits": 10000,
  "skillBreakdown": [
    { "skill": "int-instagram-post", "priceUsd": 0, "credits": 0, "billing_model": "tokens" },
    { "skill": "int-wiro-aimodels",  "priceUsd": 0, "credits": 0, "billing_model": "tokens" }
  ],
  "enabledSkills": ["int-instagram-post", "int-wiro-aimodels"],
  "directSkills":  ["int-instagram-post"],
  "tiers": {
    "starter": { "priceUsd": 5,   "credits": 500 },
    "pro":     { "priceUsd": 30,  "credits": 3000 },
    "max":     { "priceUsd": 100, "credits": 10000 }
  },
  "plans": [
    { "key": "starter", "title": "Starter", "priceUsd": 5,   "monthlyCredits": 500 },
    { "key": "pro",     "title": "Pro",     "priceUsd": 30,  "monthlyCredits": 3000 },
    { "key": "max",     "title": "Max",     "priceUsd": 100, "monthlyCredits": 10000 }
  ],
  "nextplan": null,
  "planChange": {
    "change": "upgrade",
    "provider": "prepaid",
    "fromTier": "pro",
    "toTier": "max",
    "nextplan": null,
    "priceUsd": 100,
    "monthlyCredits": 10000,
    "effectiveAt": 1714694520,
    "newPeriod": false,
    "periodEnd": 1715990520,
    "secondsLeft": 1296000,
    "creditsNow": 3500,
    "creditsThisPeriod": 6500,
    "creditsFromRenewal": 10000,
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

`totalPriceUsd` and `totalMonthlyCredits` are the previewed plan's price and credits; the skills never change them. `plans` lists the three plans with their names. `enabledSkills` is the full closure (including transitive `depends_on`); `directSkills` is just what the user explicitly toggled. Every `skillBreakdown` entry reads `priceUsd: 0` and `credits: 0`, since every plan includes every skill. `tokenRates` carries the per-model rates used to meter each turn (see [Token Billing](#token-billing)). On an existing agent, `nextplan` is a lower plan already scheduled for its renewal, or `null`.

`planChange` comes with a preview of an existing agent that has an active plan, and is `null` otherwise. `planChange.change` says what the previewed `tier` would do: `"upgrade"` shows the charge and the credits that come with a higher plan, `"downgrade"` a lower plan that starts at the renewal with nothing charged now, and `"none"` the agent's own plan or a preview that only changes skills, with no charge and no credit change.

| Field | Type | Description |
|-------|------|-------------|
| `planChange.change` | `string` | `"upgrade"`, `"downgrade"` or `"none"`. |
| `planChange.provider` | `string` | `"prepaid"` (wallet plan) or `"stripe"` (card plan). |
| `planChange.fromTier` / `toTier` | `string` | The agent's plan and the plan previewed. |
| `planChange.nextplan` | `string\|null` | A lower plan already scheduled for the renewal. |
| `planChange.priceUsd` / `monthlyCredits` | `number` | The previewed plan's monthly price and credits. |
| `planChange.effectiveAt` | `number\|null` | Unix seconds when the change would take effect: now for a higher plan on a wallet plan, `periodEnd` for a lower plan. `null` for a higher plan on a card plan, which starts once its checkout is paid, and for `"none"`. |
| `planChange.newPeriod` | `boolean` | `true` for a higher plan on a card plan: the paid checkout starts a new full period with the plan's full credits. |
| `planChange.periodEnd` | `number` | Unix seconds when the current period ends, which is when a lower plan starts. |
| `planChange.secondsLeft` | `number` | Seconds left in the current period. |
| `planChange.creditsNow` | `number` | Credits this period gains now. |
| `planChange.creditsThisPeriod` | `number` | Credits this period grants in all after the change. |
| `planChange.creditsFromRenewal` | `number` | Credits each renewal grants after the change. |
| `planChange.chargeNowUsd` | `number` | What a higher plan costs now, at list price before any discount: the prorated difference on a wallet plan, the plan's full price at the card checkout. `0` for `"downgrade"` and `"none"`. |

#### **POST** /UserAgent/CreateSubscriptionCheckout

Subscribes a useragent that doesn't yet have an active subscription. Wallet is debited, a prepaid subscription row is inserted, and the agent is auto-queued, the same single-call behaviour as `Deploy` with `useprepaid: true`. Always pass `useprepaid: true` from the API.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Your UserAgent instance guid |
| `useprepaid` | boolean | Yes | Must be `true` for API consumers. |
| `tier` | string | No | `"starter"`, `"pro"` or `"max"`: overrides the useragent's persisted plan so the user can re-subscribe on a different plan without redeploying. Leave it out for the agent's own plan; any other value is refused with `tier must be starter, pro or max`. |

##### Response

```json
{
  "result": true,
  "errors": [],
  "subscriptionId": 8421,
  "monthlypriceusd": 30,
  "monthlycredits": 3000
}
```

If the useragent already has an active subscription, the call rejects with `Subscription already active for this useragent. Cancel or modify the existing subscription instead.`

If a card checkout for the agent is still open (for example, one started in the Wiro panel), it is closed before the wallet is charged, so the agent is never paid for twice. The call is refused, and nothing is charged, when:

| Error | When |
|-------|------|
| `A payment for this agent is already being processed. It usually finishes within a minute; refresh to see the subscription.` | A card payment for the agent has gone through and its subscription is still being set up. The response also carries `checkoutpending: true`; call `UserAgent/Detail` in a minute instead of retrying |
| `A checkout for this agent is already being opened. Try again in a moment.` | Another subscription request for the same agent is in progress |
| `We couldn't confirm this agent's previous checkout. Please try again in a minute.` | The agent's previous card checkout couldn't be checked |
| `Another payment from this wallet is still going through. Nothing was charged; please try again in a minute.` | Another plan or credit pack payment from the same wallet is still going through |

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
- Setup is incomplete (status `6`)
- No credits remain (`monthlycredits + extracredits - usedcredits <= 0`)

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

1. **Access**: owner of the row or a team admin of the UA's team. Members get `useragent-team-admin-required` (code `97`); strangers get `useragent-access-denied` (code `96`); unknown / already-deleted rows get `useragent-not-found` (code `95`).
2. **Status**: must be in a clean terminal state: `0` (Stopped), `5` (Error), or `6` (Setup Required); `5` passes only once the agent no longer holds its runtime. Anything in flight (`1` Stopping, `2` Queued, `3` Starting, `4` Running) is rejected with `useragent-delete-running`, and so is an errored agent that still holds its runtime. Stop the agent first and wait for status `0`.
3. **Active subscription**: a subscription with `status: "active"` blocks delete (`useragent-delete-sub-active`). `CancelSubscription` doesn't lift this right away: the subscription stays `active` until its period ends (`cancelsAt`) and is then marked expired. An expired, cancelled or refunded subscription, or none at all, passes.

Delete is safe to repeat: calling it again on an agent that's already deleted returns `useragent-not-found` (code `95`, as in guard 1), so treat that code on a retry as already deleted. The stored `deletedat` never changes.

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
| `useragent-not-found` (95) | Unknown guid, or the row is already soft-deleted |
| `useragent-access-denied` (96) | Caller is not the owner and not a member of the UA's team |
| `useragent-team-admin-required` (97) | Caller is a team member but not a team admin on the UA's team |
| `useragent-delete-running` | Status is `1` / `2` / `3` / `4`, or `5` while the agent still holds its runtime. Call `Stop` first and retry once status reaches `0` |
| `useragent-delete-sub-active` | An active subscription is still attached. After `CancelSubscription` it stays active until the period ends (`cancelsAt`); retry once it has expired |

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
      "remainingcredits": 8995,
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
      "title": "Posted carousel: \"Brand voice teaser\"",
      "summary": {
        "skill": "int-instagram-post",
        "action": "create",
        "permalink": "https://www.instagram.com/p/CXY..."
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
| `events[].kind` | string | Fine-grained event class. One of: `"turn_started"`, `"turn_ended"` (an LLM turn boundary); `"tool_started"`, `"tool_completed"` (one pair per tool call); `"tool_blocked"` (a tool call the agent's safety rules refused); `"cron_finished"` (a scheduled task finished); `"user_message"` (a message received on a connected Telegram, Slack or Discord channel, not web chat); `"token_usage"` (a billed turn's token usage: chat / cron / voice post-call); `"token_usage_idempotent"` (a replayed usage report, already billed, informational only); `"media_relay"` (files from a reply were delivered); `"background_reply"` (a result that finished in the background was delivered to the chat). Rows about what was done to the agent have `AGENT_*` kinds, and two note rows, `"runtime_log_unavailable"` and `"runtime_log_deleted"`, say what part of a day is missing; see [Agent Logs](/docs/agent-logs#who-did-what-rows). Show any kind you don't recognize by its `title`. |
| `events[].tool` | string \| null | Present on `tool_started` / `tool_completed` / `tool_blocked`. The name of the tool the agent used. |
| `events[].toolintegration` | string \| null | On `tool_started` / `tool_completed` when the step works in a connector: the connector's `key` (for example `"wordpress"`). Same closed list as on [timeline tool blocks](/docs/agent-messaging#tool-integration-and-action-values). |
| `events[].toolaction` | string \| null | On `tool_started` / `tool_completed` when a word fits the step: what it does (for example `"click"`). Same closed list as on [timeline tool blocks](/docs/agent-messaging#tool-integration-and-action-values). Never set together with `toolintegration`. |
| `events[].title` | string | Human-readable one-line description (always present). |
| `events[].summary` | object \| null | Structured event-specific payload. Treat as opaque and render as JSON when expanding. Secret values (`apikey`, `apppassword`, `clientsecret`, `bearer`, `token`, …) are masked before the event is written. Keys vary per `kind`/`tool`. |
| `events[].durationMs` | number \| null | Wall-clock duration in milliseconds. Populated on `tool_completed`, `turn_ended`, `cron_finished` and `token_usage` events. |
| `events[].ok` | boolean \| null | `true` on success, `false` on failure. Populated on `tool_completed`, `turn_ended` and `cron_finished` events, and always `false` on `tool_blocked`. Pair with `error` for failures. It is always `true` on `AGENT_*` rows. A `turn_ended` for a turn the caller cancelled has no `ok`, and its title reads `Agent turn cancelled`. |
| `events[].error` | string \| null | One-line failure message (when `ok: false`). |
| `events[].model` | string \| null | Canonical model slug billed for the turn. Present on `token_usage` / `token_usage_idempotent` events. |
| `events[].tokens` | object \| null | Token breakdown on `token_usage` events: `{ input, output, cacheRead, cacheWrite, total }`, **nested camelCase** (distinct from the flat lowercase `inputtokens` / `outputtokens` / … columns on message + transaction rows; same underlying data, different shape). |
| `events[].tokencost` | number \| null | Credits deducted for the turn (1 credit = $0.01). Present on `token_usage` events. |
| `events[].calls` | number \| null | Number of LLM calls made in the billed turn. Present on `token_usage` events. |
| `events[].remainingcredits` | number \| null | Credit pool remaining after the deduct. Present on `token_usage` events. |
| `events[].userUuid` | string \| null | Originating actor's UUID. `"system"` for cron / internal events. May be missing on older rows, in which case the server falls back to the agent owner. |
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

Pins or unpins an agent instance from the user's pinned-agents quick list. Pinned agents appear in the global header dropdown (`PinnedAgents`) and get an unread badge from `PinnedUnread`.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Your UserAgent instance guid |
| `pinned` | boolean | Yes | `true` to pin, `false` to unpin |

##### Response

```json
{ "result": true, "errors": [] }
```

#### **POST** /UserAgent/PinnedAgents

Lists the user's pinned agents. Returns the **same composed shape as `MyAgents`**: every field that appears on a `MyAgents` row except `lastactivityat` appears here, just filtered to `pinned: true`.

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
      "monthlycredits": 3000,
      "extracredits": 5000,
      "usedcredits": 1450,
      "remainingcredits": 6550,
      "renewalcredits": 3000,
      "creditperiod": "2026-05",
      "creditsyncat": 1714694410,
      "status": 4,
      "pinned": true,
      "teamsessionmode": "private",
      "setuprequired": false,
      "subscription": {
        "plan": "agent",
        "status": "active",
        "amount": 30,
        "currency": "usd",
        "currentperiodend": 1717200000,
        "renewaldate": "2026-06-01T00:00:00.000Z",
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
          "starter": { "priceUsd": 5,   "credits": 500 },
          "pro":     { "priceUsd": 30,  "credits": 3000 },
          "max":     { "priceUsd": 100, "credits": 10000 }
        }
      },
      "enabledSkills": ["int-instagram-post", "int-twitterx-post", "int-wiro-aimodels"],
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
      "extracreditsexpiry": 1730419200,
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

Endpoints for browser-based realtime voice sessions plus the unified call history for both Web and Twilio channels. Per-channel setup, session handles, and the WebSocket protocol live on the dedicated pages:

| Operation | Endpoint |
|-----------|----------|
| Start a browser realtime voice session | `POST /UserAgent/Realtime/WebStart`: see [Web Voice](/docs/integration-webvoice-skills) |
| Cancel a pending realtime session | `POST /UserAgent/Realtime/Cancel`: see [Web Voice, Step 3](/docs/integration-webvoice-skills#step-3-optional-cancel-a-stale-session-with-post-useragentrealtimecancel) |
| List recent realtime call sessions | `POST /UserAgent/TwilioCallHistory/List`: see [Twilio Voice, Call History](/docs/integration-twiliovoice-skills#call-history) (returns Twilio **and** Web channel sessions despite the Twilio-named path). |

#### **POST** /UserAgent/Realtime/WebStart

Starts a browser-embedded realtime voice session with the agent. Returns two opaque one-time handles, valid for 5 minutes (until `expiresAt`), and the WebSocket URL the browser opens to stream microphone audio. The browser presents `sessionToken` as the first WS message (`{ type: "session_start", sessionToken }`), and `cancelToken` is for `Realtime/Cancel`. The WebSocket path carries no session identifier.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Useragent must be in `status: 4` and have `util-web-channel` enabled (Voice Receptionist / Voice Sales Rep presets enable it by default; toggle it on other agents via `SkillsApply`). |
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
| `util-web-channel not enabled` | Toggle the skill via `SkillsApply` or pick a preset that bundles it. |
| `Web voice is available from the Wiro panel or with an API key.` | Bearer auth with an Origin outside the allow-list. |
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
| `channel` | `"twilio"` \| `"web"` | Which voice surface served the call. |
| `callsid` | string | Twilio Call SID for `channel: "twilio"`; the internal session id (`voice-call-*`) for `channel: "web"`. |
| `callerInfo` | object | Twilio rows: `{ number, country }` (E.164 + ISO-2). Web rows: `{ page_url, display_identifier? }`, where `display_identifier` is only present when the embedding page validated a phone-style identifier; `page_url` is the page hosting the widget. |
| `callerProfile` | string \| null | Free-text summary of the caller that the agent writes before the call. `null` until it is ready. |
| `status` | string | `realtime_session_incoming` (call accepted, prep in flight) → `realtime_session_active` (audio flowing) → `realtime_session` (completed normally) or `realtime_session_rejected` (rejected before active state, with `metadata.reason`). |
| `endReason` | string \| null | Set on `realtime_session` rows only. One of: `wiro_completed`, `wiro_cancelled`, `wiro_disconnect`, `wiro_error`, `twilio_disconnect`, `browser_disconnect`, `max_duration`. `null` while the call is still in flight or rejected. |
| `durationSeconds` | number \| null | Total elapsed seconds. `null` until end. |
| `modelSlug` | string \| null | Realtime model slug used for this call (e.g. `gpt-realtime-mini`). |
| `startedAt` / `endedAt` | number \| null | Unix epoch ms. `endedAt` stays `null` until the call finishes or is rejected. |

Rows are returned newest-first. Rejected sessions (`realtime_session_rejected`) are intermixed and carry `metadata.reason` (visible by reading the same `messageguid` via `Message/Detail`) with values: `concurrent_limit`, `agent_prep_timeout`, `realtime_ws_open_failed`, `realtime_stream_timeout`. Full field reference: [Twilio Voice, Call History](/docs/integration-twiliovoice-skills#call-history).

### Extra Credit Packs

An agent with an active plan can buy extra credits at any time, whatever its plan. Every agent gets the same three packs, listed at `agent.extracreditpacks` on `UserAgent/Detail` and, before deploying, at `extracreditpacks` on `Agent/Detail`:

```json
"extracreditpacks": [
  { "packkey": "small",  "credits": 1000,  "priceusd": 10,  "enabled": true },
  { "packkey": "medium", "credits": 5000,  "priceusd": 50,  "enabled": true },
  { "packkey": "large",  "credits": 20000, "priceusd": 200, "enabled": true }
]
```

Each pack carries:

| Field | Type | Description |
|-------|------|-------------|
| `packkey` | string | The pack identifier: `"small"`, `"medium"`, or `"large"`. Pass this as `pack` in `POST /UserAgent/CreateExtraCreditCheckout`. |
| `credits` | number | Credit amount this pack adds when purchased. |
| `priceusd` | number | Pack price in USD (debited from the wallet on purchase). |
| `enabled` | boolean | Whether the pack is currently purchasable. The list is server-filtered to enabled packs, so every entry here is `true`. |

#### **POST** /UserAgent/CreateExtraCreditCheckout

Purchases additional credits for a useragent. The wallet is debited the pack price and credits are added to the instance immediately.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Your UserAgent instance guid |
| `pack` | string | Yes | Pack key from `agent.extracreditpacks[].packkey`: `"small"` (1,000 credits, $10), `"medium"` (5,000, $50) or `"large"` (20,000, $200). |
| `useprepaid` | boolean | Yes | Must be `true` for API use. Pays the pack price from your wallet balance. |

##### Request

```json
{
  "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
  "pack": "medium",
  "useprepaid": true
}
```

##### Response

```json
{
  "result": true,
  "errors": []
}
```

The pack price is deducted from your wallet and credits are added to the instance immediately. Credits expire 6 months after purchase. The transaction is appended to the agent ledger (`type: "purchase"`, `action: "<pack>"`, `provider: "prepaid"`) and surfaced on `POST /UserAgent/TransactionList`.

#### **POST** /UserAgent/CancelSubscription

Schedules the subscription to end at the current billing period's expiry (a **cancel-at-period-end** pattern). The agent keeps running with the full plan allowance until that moment. No wallet refund is issued for the remaining days; you're paying for the full period up front.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `guid` | string | Yes | Your UserAgent instance guid |

**Headers:** No extra header is needed. For team agents, use an API key from a project in the agent's team. Keys from another workspace are rejected.

##### Response

```json
{
  "result": true,
  "cancelsAt": 1717200000,
  "errors": []
}
```

- `cancelsAt` is the Unix timestamp when the subscription will finish.
- Server-side, `subscription.pendingdowngrade` is flipped to `"cancel"` and `subscription.status` stays `"active"` until the period end. Subsequent `UserAgent/Detail` responses reflect this: `subscription.pendingdowngrade = "cancel"` and the usual `currentperiodend`.
- A scheduled move to a lower plan is dropped: the agent's `nextplan` goes back to `null`.
- To reverse the cancellation **before** the period ends, call `POST /UserAgent/RenewSubscription`. It clears the flag without charging the wallet again.
- When the period actually ends, the daily cron marks the subscription `"expired"` and stops the agent (`status: 0`). At that point the user must call `POST /UserAgent/RenewSubscription` (or `CreateSubscriptionCheckout` for a fresh sub) to continue.

##### Team agents paid by card

A team agent subscribed by card from the Wiro panel is billed to the card of the member who subscribed. For that plan the call schedules the card subscription to end at the end of the current period instead:

- `cancelsAt` is the end of the current period. The agent keeps running until then, and the subscription ends at that point.
- `subscription.pendingdowngrade` isn't set, and `RenewSubscription` can't undo the cancellation. Only the member whose card pays for the plan can undo it, from their own billing portal.
- Only team admins and the organization owner can cancel it. Other members get code `97`, including the member who deployed the agent.

**Common errors:**

| Error | When |
|-------|------|
| `No active subscription found for this agent` | `status != "active"` on the subscription row |
| `User agent not found` | Caller doesn't own the agent and isn't on its team |
| `Only a team admin can perform this action on a team-owned agent.` | Caller is a member of the agent's team but not a team admin (code `97`). For a team agent paid by card, this includes the member who deployed the agent |
| `A switch to prepaid billing is already scheduled for this plan.` | A team agent's card plan that is already set to move to wallet billing at the end of the period |
| `We couldn't schedule the cancellation. Please try again in a minute.` | A team agent's card plan, when the change couldn't be confirmed with the card payment provider |

#### **POST** /UserAgent/UpgradeTier

Moves an active subscription to another plan: `"starter"`, `"pro"` or `"max"`. Despite its name, the endpoint moves an agent down as well as up:

- **A higher plan starts now.** API-deployed agents pay through the wallet: the monthly difference for the time left in the current period, by the second, rounded up to the cent and at least one day's worth. The period gains the difference in credits for that same time, and every renewal grants the new plan in full. Existing extra credits and `usedcredits` are kept, and a running agent keeps running.
- **A lower plan starts at the next renewal**, when the request sends `allowDowngrade: true`. Without it, a lower `targetTier` is refused and nothing changes, so a client that only means to upgrade never moves an agent down. Nothing is charged or refunded now. The agent keeps its current plan, price and credits until the period ends, and `nextplan` on `UserAgent/Detail` reads the lower plan. The renewal then charges the lower plan's price and grants its credits. The flag is only for a lower plan: a higher `targetTier` sent with it, such as from a page that still shows a plan the agent has since left, is refused, and nothing is changed or charged.
- **Asking for the agent's current plan** cancels a scheduled move to a lower plan: `nextplan` goes back to `null`. An agent that still pays a price from before the three plans gets its current plan scheduled instead: `nextplan` names that plan, and the renewal moves the agent to the plan's own price and credits.

A move to a higher plan while a lower one is scheduled cancels the scheduled move first, then upgrades from the current plan. On a plan paid by card, a move to a higher plan returns a checkout `url` instead of charging the wallet, and nothing changes on the agent until it is paid: the answer's `tier` and `nextplan` are the agent's as they were. Once it is paid, the higher plan starts a new full period with its full credits, and a lower plan scheduled before is dropped. A lower plan on a card plan applies from the next card renewal. A scheduled move on a card plan can't be cancelled once it has started with the new billing period and its payment is going through: that payment moves the agent, and asking for the current plan is refused until the agent shows the new plan.

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
  "newMonthlyCredits": 10000,
  "creditsNow": 3500,
  "creditsThisPeriod": 6500,
  "creditsFromRenewal": 10000,
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
  "newMonthlyCredits": 500,
  "periodEnd": 1716940800,
  "errors": []
}
```

Asking for the agent's current plan while a lower one is scheduled answers `change: "downgrade-cancelled"` with `nextplan: null`. For an agent that still pays a price from before the three plans, `nextplan` names its current plan instead, and `startsAt`, `newPriceUsd` and `newMonthlyCredits` give the renewal that moves it to that plan's own price:

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
  "newMonthlyCredits": 3000,
  "errors": []
}
```

| Field | Type | Description |
|-------|------|-------------|
| `change` | `string` | `"upgrade"`, `"downgrade"` or `"downgrade-cancelled"`. |
| `tier` | `string` | The plan the agent is on after the call. |
| `previousTier` / `targetTier` | `string` | The plan it was on and the plan asked for. |
| `nextplan` | `string\|null` | The plan scheduled for the renewal after the call, or `null`. |
| `effectiveAt` | `number\|null` | Unix seconds when the change takes effect: now for an upgrade on a wallet plan and for a cancelled downgrade, the renewal for a downgrade, `null` for an upgrade on a card plan, which starts once its checkout is paid. |
| `newPriceUsd` / `newMonthlyCredits` | `number` | The new plan's monthly price and credits; for a downgrade, from the renewal on. A cancelled downgrade has them only when `nextplan` names the current plan: that plan's price and credits from the renewal on. |
| `creditsNow` / `creditsThisPeriod` / `creditsFromRenewal` | `number` | Upgrade on a wallet plan: what this period gained, what it grants in all, and what each renewal grants. |
| `chargedUsd` | `number` | Upgrade on a wallet plan: what the wallet paid now, in USD. `proratedCharge` carries the same amount. |
| `startsAt` | `number` | Downgrade: the moment the lower plan starts, the same as `effectiveAt`. Cancelled downgrade with `nextplan` set: the renewal that moves the agent to its plan's own price. |
| `periodEnd` | `number` | Unix seconds when the current period ends. |
| `url` / `targetPriceUsd` / `targetCredits` | `string` / `number` | Upgrade on a card plan: the checkout link, and the plan's price and credits once it is paid. Nothing changes until then, so `tier` and `nextplan` are the agent's as they were. |

#### **POST** /UserAgent/RenewSubscription

Two distinct operations share this endpoint depending on the subscription's current state:

1. **Undo-cancel**: active subscription with `pendingdowngrade: "cancel"` → clears the flag, **no wallet charge**.
2. **Renew**: subscription in `"expired"` status → creates a brand-new 30-day subscription, charges the wallet for the full plan price, resets the useragent to `status: 0` (Stopped).

The endpoint inspects the current subscription state and picks the right operation; the caller doesn't choose.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `guid` | string | Yes | Your UserAgent instance guid |

**Headers:** No extra header is needed. For team agents, use an API key from a project in the agent's team. Keys from another workspace are rejected.

> A renewal charges the agent's plan price and grants the plan's credits in full. When a lower plan is scheduled (`nextplan`), the renewal charges and grants that plan instead and clears `nextplan`. Once a wallet plan has ended, the agent shows the plan its renewal takes and that plan's price: `tier` names it, `nextplan` is `null` and `monthlypriceusd` is the price. A renewal never charges more than `monthlypriceusd` shows. Skills never change what a renewal costs.

##### Response: undo-cancel

Called while the subscription is still `"active"` with a pending cancel flag set by `CancelSubscription`:

```json
{
  "result": true,
  "action": "undo-cancel",
  "errors": []
}
```

- Clears `subscription.pendingdowngrade` back to `null`.
- **No wallet charge**: you've already paid for the full period.
- Agent status is unchanged (still running / stopped / whatever it was).

##### Response: renew

Called after the subscription has expired (daily cron flipped it to `status: "expired"` and stopped the agent). The renewal rolls the existing expired subscription forward into a fresh 30-day `active` row instead of inserting a new one:

```json
{
  "result": true,
  "action": "renewed",
  "plan": "agent",
  "amount": 5,
  "monthlycredits": 500,
  "errors": []
}
```

- Renews the subscription in place: `status` becomes `"active"`, a new 30-day period starts now (`currentperiodend` moves to now + 30 days), and `pendingdowngrade` is cleared to `null`.
- Debits `amount`, the plan's price, from the wallet (caller's personal wallet, or the agent's team wallet if the agent is team-scoped).
- Zeroes `usedcredits` and stamps the new `creditperiod`. Existing extra credits are preserved.
- If the agent was in `status: 0` (Stopped) or `5` (Error), it's auto-queued back to `2` (Queued). It starts again without an extra `Start` call. Statuses `1`/`2`/`3`/`4` are already in progress and settle on their own.
- A card checkout still open for the agent (for example, one started in the Wiro panel) is closed before the wallet is charged, so the agent is never paid for twice.

**Common errors:**

| Error | When |
|-------|------|
| `Subscription is already active` | Called on an active subscription with **no** pending cancel (nothing to do) |
| `No expired subscription found to renew` | No active sub and no expired sub: agent was never subscribed, or data is gone |
| `Insufficient wallet balance. Required: $X.XX, Available: $Y.YY` | Wallet (personal or team) can't cover the renewal price |
| `This plan now renews on the Max plan at $100.00 a month, not the $70.00 it showed. Nothing was charged. Renew again to pay the new price.` (the plan's name and prices) | The renewal costs more than the agent's `monthlypriceusd` showed. Nothing is charged, and the agent now shows the renewal's plan and price (`tier` and `monthlypriceusd`, with `nextplan` cleared). Show the new price, then call `RenewSubscription` again to pay it |
| `A payment for this agent is already being processed. It usually finishes within a minute; refresh to see the subscription.` | A card payment for the agent has gone through and its subscription is still being set up; nothing is charged. The response also carries `checkoutpending: true` |
| `A checkout for this agent is already being opened. Try again in a moment.` | Another subscription request for the same agent is in progress; nothing is charged |
| `We couldn't confirm this agent's previous checkout. Please try again in a minute.` | The agent's previous card checkout couldn't be checked; nothing is charged |
| `Another payment from this wallet is still going through. Nothing was charged; please try again in a minute.` | Another plan or credit pack payment from the same wallet is still going through; nothing is charged |

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
                          │ currentperiodend reached
                          │ (daily cron)
                          ▼
              ┌────────────────────────┐
              │ status: "expired"      │
              │ useragent.status: 0    │◄───┐
              └───────────┬────────────┘    │
                          │                 │
                          │ RenewSubscription (wallet charged,
                          │ new 30-day period, useragent stays 0)
                          ▼                 │
              ┌────────────────────────┐    │
              │ NEW subscription row   │────┘
              │ status: "active"       │
              │ type: "renewal"        │
              └────────────────────────┘
```

## Pricing Summary

| Component | Source | Notes |
|-----------|--------|-------|
| **Plan price** | `tiers.{starter,pro,max}.priceUsd` | $5, $30 or $100 a month, the same for every template and custom build. The agent's own price is `monthlypriceusd`. |
| **Monthly credits** | `tiers.{starter,pro,max}.credits` | 500, 3,000 or 10,000. Every renewal grants a plan's credits in full: the current plan's (`renewalcredits`), or the scheduled plan's when `nextplan` is set. `monthlycredits` is what the current period grants. |
| **Skills** | `Skills/List` | Every plan includes every skill. Turning one on or off costs nothing. |
| **Per-turn token cost** | `tokenRates` (per-model) | Each chat / cron / voice-prep turn deducts credits metered by the tokens its model consumes (1 credit = $0.01). The same on every plan: a larger plan buys a larger monthly credit pool. |
| **Extra credit packs** | `agent.extracreditpacks[]` | The same on every plan: `small` 1,000 credits for $10, `medium` 5,000 for $50, `large` 20,000 for $200. They expire 6 months after purchase. |

### Payment Method

All API subscriptions use your **prepaid wallet balance**. The cost is deducted immediately when you deploy, renew, move to a higher plan, or buy an extra credit pack. Always pass `useprepaid: true` on `Deploy`, `CreateSubscriptionCheckout`, and `CreateExtraCreditCheckout`. That's the only path designed for API consumers. Make sure your wallet balance covers the plan's price before calling these endpoints; otherwise you'll get an `Insufficient wallet balance` error.

### Credit Consumption

Credits are used as the agent processes messages and generates content, not at `Message/Send` time. Each turn is billed by **token usage**: once the turn completes, Wiro prices its input, output and cached tokens with the per-model `tokenRates` (1 credit = $0.01). Each billed turn appears as an `action: "tokens"` row in TransactionList and lowers `remainingcredits = max(0, monthlycredits + extracredits - usedcredits)`. You don't send anything: token billing is fully server-side. Per-turn token counts and cost also ride on each assistant message and arrive over the message WebSocket as an `agent_usage_report` frame (see [Agent Messaging](/docs/agent-messaging) and [Agent WebSocket](/docs/agent-websocket)).

The API-side check is gating only: `POST /UserAgent/Start` and `POST /UserAgent/Message/Send` refuse to launch / accept messages when `remainingcredits <= 0`, returning an `Agent has no remaining credits…` error plus an `agentbalance` snapshot (`{ monthlycredits, extracredits, usedcredits, remainingcredits }`). During an active session, monthly credits are consumed first; once `usedcredits >= monthlycredits`, extra credits (purchased via `CreateExtraCreditCheckout`) absorb the rest. When both pools are empty the agent stops accepting new turns until the subscription renews or an extra credit pack is bought.

On each billing cycle (subscription renewal) `usedcredits` is reset to zero, every renewal gives the whole allowance (`monthlycredits` equals `renewalcredits` again), and `creditperiod` advances to the new `'YYYY-MM'` window; extra-credit purchases simply bump `extracredits` without resetting usage.

For the full audit trail (every token deduct / grant / purchase / renewal / expiry) call [`POST /UserAgent/TransactionList`](/docs/agent-transactions#tx-transactionlist) (see [Agent Transactions](/docs/agent-transactions)).

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
| `Duplicate deploy: an identical agent ("<title>") was already deployed Ns ago. Open the existing one in your panel, or wait a few seconds and retry.` | `Deploy` called a second time within 10s for the same caller, template and team (custom builds: same caller, `title` and team). Carries `errors[0].code: 99` and a top-level `existingUserAgentGuid` field. |
| A sentence that says what is wrong and what to write, such as `This schedule can't run. The hour field takes 0 to 23. A schedule has five fields: minute hour day month weekday, for example 0 9 * * 1-5.` or `This schedule never comes up: February has no 30th. Pick a day February has, such as 28.` | `CustomSkillUpsert` with an `interval` the agent can't run on a scheduled task, or one whose date never comes. Nothing is saved. |
| `<skillkey>:` followed by the same sentence | `Deploy` with a `customskills` entry whose `interval` the agent can't run, or whose date never comes. Nothing is created or charged. |
| `A deploy takes up to 50 entries in customskills, and this one sent <n>. Send at most 50, then add the rest with /UserAgent/CustomSkillUpsert once the agent is deployed.` | `Deploy` with more than 50 `customskills` entries. Nothing is created or charged. |
| `Agent setup is not complete. Please finish setting up your connectors before starting.` | Status is `6`: call `CredentialUpsert` / `CredentialProjectBind` / `SkillsApply` / `CustomSkillUpsert` to provide required values, then `POST /UserAgent/Update` to move the agent to status `0` |
| `Subscription required — please subscribe to this agent before starting it.` | `Start` called on a row with no active subscription AND no spendable extras (`extracredits - usedcredits ≤ 0`). Most often hit after a subscription expires with empty extras. Call `RenewSubscription` (`useprepaid: true`) to continue. |
| `No credits available. Please renew your subscription or purchase extra credits.` | Monthly and extra credits are both exhausted |
| `Subscription already active for this useragent. Cancel or modify the existing subscription instead.` | `CreateSubscriptionCheckout` called when a sub already exists |
| `Change the plan with UpgradeTier.` | `SkillsApply` with a `tier` other than the agent's current plan |
| `tier must be starter, pro or max` | `Deploy` or `CreateSubscriptionCheckout` with a `tier` that names no plan. Nothing is created or charged. |
| `targetTier must be starter, pro or max` | `UpgradeTier` with a `targetTier` outside the closed enum (typos, missing parameter name, etc.) |
| `Already on the Pro plan.` (the plan's name) | `UpgradeTier` with the agent's current plan when no lower plan is scheduled: no-op |
| `The Starter plan is smaller than this agent's Pro plan, so this is not an upgrade. Nothing was changed. A move to a smaller plan starts at the next renewal; to ask for it, send allowDowngrade: true.` (the plans' names) | `UpgradeTier` with a `targetTier` lower than the agent's plan and no `allowDowngrade: true`. Nothing is changed or charged |
| `This agent is on the Starter plan now, so Pro is an upgrade. Nothing was changed. Reload the plan and ask again.` (the plans' names) | `UpgradeTier` with `allowDowngrade: true` and a `targetTier` higher than the agent's plan, such as after the plan changed in another tab or at a renewal. Nothing is changed or charged |
| `The move to the Starter plan started with this billing period, and its payment moves the agent there, so it can no longer be undone. Nothing was changed. Once the agent shows the Starter plan, change the plan again.` (the plan's name) | `UpgradeTier` with the agent's current plan on a card plan whose scheduled plan has already started with the new billing period. Its payment moves the agent there |
| `No active plan. Use /UserAgent/CreateSubscriptionCheckout to start one on the plan you pick.` | `UpgradeTier` called without an active subscription |
| `This plan is set to end at the end of its period, so there is no renewal to change. Renew it first.` | `UpgradeTier` to a lower plan while the subscription is cancelled at period end. Undo the cancel with `RenewSubscription` first |
| `The plan change could not be scheduled. Nothing was changed; please try again in a minute.` | `UpgradeTier` to a lower plan on a card plan, when the change couldn't be set with the card payment provider |
| `Insufficient wallet balance. Required: $X.XX, Available: $Y.YY` | `UpgradeTier`: wallet can't cover the charge for a higher plan |
| `Wallet deduction failed: {error}` | `UpgradeTier`: wallet write itself failed (rare; transient backend error) |
| `Another change to this agent's plan is going through. Nothing was changed; please try again in a minute.` | `UpgradeTier` (code `104`) while a skill change or another plan change of the same agent is going through |
| `The agent's plan changed while this was asked for. Nothing was changed; please retry.` | `UpgradeTier` when the agent's plan ended or moved off the wallet after the call was made |
| `Could not read the agent's plan. Nothing was changed; please retry.` | `UpgradeTier`: the agent's plan could not be read |
| `Another payment from this wallet is still going through. Nothing was charged; please try again in a minute.` | `Deploy` or `CreateSubscriptionCheckout` with `useprepaid: true`, `CreateExtraCreditCheckout`, `RenewSubscription` or `UpgradeTier` (code `104` on `UpgradeTier`) while another plan or credit pack payment from the same wallet is going through. A `Deploy` refused this way creates no agent |
| `Project not found. Send the id of one of your projects from Project/List: one you created, or any project of a team you are an admin of.` | `CredentialProjectBind` with a project that doesn't exist or that the caller can't bind. See its [other errors](#post-useragentcredentialprojectbind) |
| `Agent not found or access denied` | Message endpoint with invalid useragentguid |
| `User agent not found` (code `95`) | `Message/Send`, `Message/History`, `Message/Sessions`, `Message/DeleteSession`, `Message/RenameSession` or `Message/Delete` called for an agent that has been deleted |
| The sentence for the agent's status: `Agent is stopped. Start it from the agent panel before sending messages.` (status `0`), `Agent is stopping. Please wait a moment and try again.` (status `1`, when the agent is shutting down to stay stopped), `Agent is restarting. Please wait a moment and try again.` (status `1`, when the agent is shutting down to start again, as in a [restart](#automatic-restart)), `Agent is starting up. Please wait a moment and try again.` (status `2` or `3`), `Agent is in error state. Restart it from the agent panel before sending messages.` (status `5`) or `Agent setup is incomplete. Complete the setup before sending messages.` (status `6`) | `Message/Send` while the agent isn't running (any status other than `4`), for every message Wiro doesn't answer itself as a setup reply (see [Replies Wiro handles itself](/docs/agent-messaging#handled-setup-replies)). Response includes `agentstatus` (the integer) so your client can branch on it. |
| `Agent has no remaining credits. Renew your subscription or buy a credit pack to continue.` | `Message/Send` while `remainingcredits <= 0`. Response includes `agentbalance`, so your client can offer to buy credits. |
| `Message not found` | `Detail` / `Cancel` with invalid messageguid |
| `Message cannot be cancelled (status: {status})` | `Cancel` on a message that's already in a terminal state |
| `Invalid redirect URL` | OAuth `Connect` with non-HTTPS URL |
| `Pack key required` | `CreateExtraCreditCheckout` without `pack` |
| `Could not retrieve wallet balance` | Wallet service lookup failed while checking balance |
| `runstream-unavailable` | `RunStreamToken` while following runs live is not available. Try again later |

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

# Deploy for an end user (unpinned, won't clutter your dashboard)
curl -X POST "https://api.wiro.ai/v1/UserAgent/Deploy" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "agentguid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "title": "Customer #1234 Bot",
    "useprepaid": true,
    "tier": "starter"
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
    "skills": { "int-gmail-check": true, "int-wiro-aimodels": true }
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

# Buy extra credits with prepaid wallet
curl -X POST "https://api.wiro.ai/v1/UserAgent/CreateExtraCreditCheckout" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{"useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321", "pack": "small", "useprepaid": true}'

# Start an agent
curl -X POST "https://api.wiro.ai/v1/UserAgent/Start" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{"guid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321"}'

# Get agent instance details
curl -X POST "https://api.wiro.ai/v1/UserAgent/Detail" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{"guid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321"}'

# Update credentials on a running agent (triggers automatic restart)
curl -X POST "https://api.wiro.ai/v1/UserAgent/CredentialUpsert" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
    "fields": [
      { "credentialkey": "instagram", "fieldname": "authmethod", "fieldvalue": "wiro" }
    ]
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
print(f"Credentials needed: {list(agent['credentials'].keys())}")

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

# Update credentials
requests.post(
    "https://api.wiro.ai/v1/UserAgent/CredentialUpsert",
    headers=headers,
    json={
        "useragentguid": instance_guid,
        "fields": [
            { "credentialkey": "instagram", "fieldname": "authmethod", "fieldvalue": "wiro" }
        ]
    }
)

# Start the agent
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

# Buy extra credits (any plan, prepaid wallet)
requests.post(
    "https://api.wiro.ai/v1/UserAgent/CreateExtraCreditCheckout",
    headers=headers,
    json={"useragentguid": instance_guid, "pack": "small", "useprepaid": True}
)

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

  // Deploy a new instance (prepaid wallet, Starter plan)
  const deploy = await axios.post(
    'https://api.wiro.ai/v1/UserAgent/Deploy',
    { agentguid: agent.guid, title: 'My Instagram Bot', useprepaid: true, tier: 'starter' },
    { headers }
  );
  const instanceGuid = deploy.data.useragents[0].guid;
  console.log('Deployed:', instanceGuid);

  // Update credentials
  await axios.post(
    'https://api.wiro.ai/v1/UserAgent/CredentialUpsert',
    {
      useragentguid: instanceGuid,
      fields: [
        { credentialkey: 'instagram', fieldname: 'authmethod', fieldvalue: 'wiro' }
      ]
    },
    { headers }
  );

  // Start the agent
  await axios.post(
    'https://api.wiro.ai/v1/UserAgent/Start',
    { guid: instanceGuid },
    { headers }
  );

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

  // Buy extra credits (prepaid wallet)
  await axios.post(
    'https://api.wiro.ai/v1/UserAgent/CreateExtraCreditCheckout',
    { useragentguid: instanceGuid, pack: 'small', useprepaid: true },
    { headers }
  );

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

// Start the agent
var startContent = new StringContent(
    JsonSerializer.Serialize(new {
        guid = "f8e7d6c5-b4a3-2190-fedc-ba0987654321"
    }),
    Encoding.UTF8, "application/json");

var startResp = await client.PostAsync(
    "https://api.wiro.ai/v1/UserAgent/Start", startContent);
Console.WriteLine(await startResp.Content.ReadAsStringAsync());
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
- [Agent Credentials](/docs/agent-credentials): Integration catalog hub with 20+ dedicated per-provider setup guides (Meta Ads, Facebook, Instagram, LinkedIn, Twitter, and more) plus the registry endpoints (`Credentials/List`, `Credentials/Detail`)
- [Agent Messaging](/docs/agent-messaging): Send messages and receive responses from running agents
- [Agent WebSocket](/docs/agent-websocket): Real-time response streaming
- [Agent Webhooks](/docs/agent-webhooks): Receive agent responses via HTTP callbacks
- [Agent Transactions](/docs/agent-transactions): Per-instance credit ledger (deductions, renewals, purchases, grants, refunds)
- [Agent Logs](/docs/agent-logs): Per-instance activity feed (tool calls, cron runs, message exchanges)
- [Authentication](/docs/authentication): API key setup and authentication methods
