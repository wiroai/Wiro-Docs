# Agent Overview

Deploy and manage autonomous AI agents through a single API.

## Wiro Agents on the Web

The endpoints below cover the full programmatic surface. If you also want to see the web product alongside what you're building — landing pages, marketing copy, the visual catalog, and the no-code Build Your Own Agent flow — these are the public Wiro pages dedicated to agents:

| Page | URL | What it covers |
|------|-----|----------------|
| **AI Agents Home** | [wiro.ai/agents](https://wiro.ai/agents) | Top-level landing — what Wiro Agents are, how they compare to traditional setups, and a featured selection from the marketplace. |
| **Learn About Agents** | [wiro.ai/agents/learn](https://wiro.ai/agents/learn) | Concept primer — pricing model, security model, deployment lifecycle, and the difference between marketplace templates and custom builds. |
| **Anatomy of an Agent** | [wiro.ai/agents/anatomy](https://wiro.ai/agents/anatomy) | Fullscreen interactive walkthrough of the pieces that make a Wiro agent reason — system prompt, knowledge, skills, memory, guardrails, model, tools, scheduling, and observability. |
| **Build Your Own Agent** | [wiro.ai/agents/build](https://wiro.ai/agents/build) | The web wizard for the same custom-build flow exposed by [`POST /UserAgent/Deploy`](#post-useragentdeploy) with `custom: true`. Useful for previewing the skill picker / pricing breakdown before scripting it. |
| **Browse Agents** | [wiro.ai/agents/browse](https://wiro.ai/agents/browse) | Full marketplace catalog with categories, descriptions, screenshots, and per-agent tier prices — the visual mirror of [`POST /Agent/List`](#post-agentlist). Each row links to a dedicated agent page at `/agents/{slug}`. |
| **Use Case Showcases** | [wiro.ai/agents/usecase/...](https://wiro.ai/agents) | Seven fullscreen, auto-looping product stories that show real businesses operated end-to-end by a Wiro agent. See [Agent Use Cases](/docs/agent-use-cases#see-these-use-cases-on-the-web) for the full list. |

> All pages are public — no Wiro account required to browse. Sign-in becomes mandatory only when you click "Deploy" on a specific agent (which then drops you into the Wiro dashboard at [wiro.ai/panel/agents](https://wiro.ai/panel/agents)).

## What are Wiro Agents?

Wiro Agents are autonomous AI assistants that run persistently in isolated containers. Unlike one-shot model runs, agents maintain conversation memory, connect to external services, and use tools to complete tasks on your behalf — all managed through the API.

The system has two layers:

- **Agent templates** (the catalog) — Pre-built agent definitions published by Wiro. Each template defines the agent's default skill set, required credentials, the per-tier credit multiplier, and a per-instance pricing recipe. Browse the catalog with `POST /Agent/List`.
- **UserAgent instances** (your deployments) — When you deploy an agent template (or build a custom one), Wiro creates a personal instance tied to your account. Each instance runs in its own container with its own credentials, configuration, conversation history, billing, and per-model token-rate profile.

Every instance is fully isolated. Your credentials, conversations, and data are never shared with other users.

> **Two deploy paths.** You can deploy a marketplace template by passing `agentguid`, **or** build a custom agent from scratch with `custom: true` (no template — you pick the skill set yourself). Both flows are documented under [`POST /UserAgent/Deploy`](#post-useragentdeploy). The custom builder is detailed in [Agent Builder](/docs/agent-builder).

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

**Public endpoints** — `Agent/List`, `Agent/Detail`, `Skills/List`, `Skills/Detail`, `Skills/Capabilities`, `Credentials/List`, and `Credentials/Detail` are catalog endpoints and do not require authentication. You can browse available agents, the skill registry, and the credential schema without an API key.

**Authenticated endpoints** — All `UserAgent/*` endpoints require a valid API key.

For full details, see [Authentication](/docs/authentication).

## Pricing Model — Tiers, Skills & Token Billing

Agent pricing is **fully derived from the agent's enabled skill set** plus a per-template `tiermultiplier`. There are no fixed `agent.basemonthlypriceusd` columns and no `useragents.rate*cost` overrides — those were dropped in favor of skill-driven pricing. The single source of truth is the skill registry, exposed via [`POST /Skills/List`](/docs/agent-skills#post-skillslist) and [`POST /Skills/Detail`](/docs/agent-skills#post-skillsdetail).

Pricing has **two layers**: a monthly **tier** (price + credit pool, set by the enabled skills) and **per-turn token billing** (each message / cron / voice-prep turn deducts credits from that pool, metered by the tokens the agent's model consumes).

### Tiers

Every agent ships with two tier presets: **Starter** and **Pro**. Each tier has its own `price` (USD/month) and `credits` (monthly credit allowance). The relationship between the two is fixed by the agent's `tiermultiplier`:

```
pro.price   = starter.price   × tiermultiplier
pro.credits = starter.credits × tiermultiplier
```

`tiermultiplier` defaults to `10` if the template omits it. Each agent template's tier numbers (and the `tiermultiplier`) appear on every catalog response under the `tiers` object:

```json
"tiers": {
  "starter": { "priceUsd": 9, "credits": 225 },
  "pro":     { "priceUsd": 90, "credits": 2250 }
}
```

> **Starter tier minimum: $4/month.** Every agent with at least one paid skill pays at least $4/month on Starter. When the raw sum of enabled-skill weights would land below $4, the resolver bumps the Starter price up to $4 **and** scales the credit pool up by the same ratio — so the user gets a proportional credit increase, not a free upgrade. Agents with zero paid skills (rule-only, or all-`ZERO`-tier skills) stay at `$0` / `0` credits. Default Pro = Starter × `tiermultiplier` (default `10`), so an agent that lands on the $4 floor pays **$40/month on Pro** with the same credit pool × 10.

### Token Billing

The monthly tier buys a **credit pool**; each turn the agent runs (a chat reply, a scheduled cron tick, or a voice-prep turn) deducts credits from that pool, **metered by the tokens its model consumes**. There are no flat per-action costs — what a turn costs depends on the model and how many input / output / cached tokens it used.

Per-model rates live in the `tokenRates` object, present on `Agent/Detail`, `UserAgent/Detail`, `MyAgents`, `PinnedAgents`, and `PricingPreview`. The marketplace catalog (`Agent/Detail`) and `PricingPreview` return only the **selectable** models; a deployed instance's `UserAgent/Detail` / `MyAgents` / `PinnedAgents` return the **full** model map (so historical model-change markers and token-usage tooltips can still resolve a model that ops later marked non-selectable). Internal ops metadata (`$`-prefixed keys) is stripped from every response:

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

Cache-read and cache-write categories are charged only when the selected model rate defines them. `inputtokens` contains only uncached input; `totaltokens` is always the exact sum of input, output, cache-read, and cache-write tokens. For models with `long_context_threshold_tokens`, Wiro selects the long-context rate **per LLM call** using `input + cacheRead + cacheWrite`; it never infers a surcharge from a turn-level aggregate that lost call boundaries. You don't send anything — the agent runtime reports exact call-level usage after each turn, Wiro deducts the credits once, and records a ledger row with `action: "tokens"` (see [`POST /UserAgent/TransactionList`](/docs/agent-transactions#post-useragenttransactionlist)). Per-turn token counts and cost also ride on each assistant message (`inputtokens` / `outputtokens` / `cachereadtokens` / `cachewritetokens` / `totaltokens` / `tokencost` / `model` — see [Agent Messaging](/docs/agent-messaging)).

When the credit pool is exhausted, [`POST /UserAgent/Message/Send`](/docs/agent-messaging#post-useragentmessagesend) and [`POST /UserAgent/Start`](#post-useragentstart) refuse with an `Agent has no remaining credits…` error plus an `agentbalance` snapshot; renew the subscription or buy an extra credit pack to continue.

> **Voice realtime audio is billed separately.** Live voice-call audio (for `util-voice-receptionist` agents) is **not** charged to the platform credit pool — it flows through the operator's own Wiro AI Models balance via the `int-wiro-aimodels` skill (you bring your own Wiro API key). Only the post-call text turn is billed as a normal token deduct.

### Live Pricing Preview

Before you commit a skill change or build a custom agent, fetch a live preview with [`POST /UserAgent/PricingPreview`](#post-useragentpricingpreview). The preview returns the post-toggle `tiers`, `tokenRates`, `starterFloorUsd`, and `enabledSkills` (with transitive `depends_on` resolved) without writing any state.

## Agent Lifecycle

Deploying and running an agent follows this flow:

1. **Browse** — call `POST /Agent/List` to discover available agents in the catalog
2. **Deploy** — call `POST /UserAgent/Deploy` with `useprepaid: true` and `tier` (`"starter"` or `"pro"`). The selected tier price is debited from your prepaid wallet immediately and a 30-day subscription row is created.
3. **Configure** — if the agent requires credentials (API keys, OAuth tokens), set them per-provider with `POST /UserAgent/CredentialUpsert`, or per-skill with `POST /UserAgent/CustomSkillUpsert`. See [Agent Credentials](/docs/agent-credentials) for details
4. **Start** — call `POST /UserAgent/Start` to queue the agent for launch
5. **Running** — the agent's container starts and the agent becomes available for conversation
6. **Chat** — send messages via `POST /UserAgent/Message/Send`. See [Agent Messaging](/docs/agent-messaging) for the full messaging API

## UserAgent Statuses

Every deployed agent instance has a numeric status that reflects its current state:

| Status | Name | Description |
|--------|------|-------------|
| `0` | Stopped | Agent is not running. Call Start to launch it. |
| `1` | Stopping | Agent is shutting down. Wait for it to reach Stopped before taking action. |
| `2` | Queued | Agent is queued and waiting for a worker to pick it up. |
| `3` | Starting | A worker has accepted the agent and is spinning up the container. |
| `4` | Running | Agent is live and ready to receive messages. |
| `5` | Error | Agent encountered an error during execution. Call Start to retry. |
| `6` | Setup Required | Agent needs credentials or configuration before it can start. Provide them via `CredentialUpsert` / `CustomSkillUpsert` / `SkillsApply`. |

### Automatic Restart (`restartafter`)

When you mutate an agent's configuration while it is **starting** (status `3`) or **running** (status `4`), the system automatically triggers a restart cycle: the agent is moved to **Stopping** (status `1`) with `restartafter` set to `true`. Once the container fully stops, the system automatically re-queues it, applying the new configuration on startup.

This means you can update credentials, toggle skills, or change a custom skill on a running agent without manually stopping and starting it.

Endpoints that auto-trigger a restart on success: `CredentialUpsert`, `SkillsApply`, `CustomSkillUpsert` (when functional fields change), `CustomSkillRename`, `CustomSkillDelete`, `CustomSkillRevert`, `Update` (scalar edits).

## Endpoints

### Browse the Catalog

#### **POST** /Agent/List

Lists available agents in the catalog. This is a **public endpoint** — no authentication required.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `search` | string | No | Full-text search across agent titles and descriptions |
| `category` | string | No | Filter by category (e.g. `"productivity"`, `"social-media"`) |
| `sort` | string | No | Sort column: `id`, `title`, `slug`, `status`, `createdat`, `updatedat`, `totalrun`, `activerun`. Default: `id` |
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
      "tiermultiplier": 10,
      "tiers": {
        "starter": { "priceUsd": 9, "credits": 225 },
        "pro":     { "priceUsd": 90, "credits": 2250 }
      },
      "status": 1,
      "createdat": "1711929600",
      "updatedat": "1714521600"
    }
  ]
}
```

> `Agent/List` returns only catalog-header columns plus inlined `tiers` (so the catalog card can render the price without a per-row `Agent/Detail` round-trip). The `id` / `totalrun` / `activerun` columns are stripped for the public role. Call `POST /Agent/Detail` with `type: "full"` when you need the full template (skills map, credential schema, custom skills, scheduled skills).

#### **POST** /Agent/Detail

Retrieves details for a single agent by guid or slug. This is a **public endpoint** — no authentication required.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `guid` | string | No* | Agent guid. |
| `slug` | string | No* | Agent slug (e.g. `"instagram-manager"`). |
| `type` | string | No | Pass `"full"` to also include `customskills` and `scheduledskills` arrays in the response. Without `type: "full"`, the response carries the catalog header + `tiers` + `tokenRates` + `credentials` + `skills` + `skillsmeta` only. |

> **Note:** You must provide either `guid` or `slug`. If both are provided, `slug` takes priority. Pass `type: "full"` when you need to preview custom skill keys and scheduled skill cron expressions before deploying; omit it for a lightweight catalog detail call.

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
      "tiermultiplier": 10,
      "tiers": {
        "starter": { "priceUsd": 9, "credits": 225 },
        "pro":     { "priceUsd": 90, "credits": 2250 }
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
          "user_invocable": false,
          "deprecated": false,
          "replacement": null,
          "description": "Internal: lets the agent call Wiro's own image / video / LLM generation API. Other skills invoke it; users do not."
        }
      },
      "credentials": {
        "instagram": {
          "optional": false,
          "extra": false,
          "_editable": { "authmethod": true, "systemusertoken": true, "igusername": true },
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
              { "key": "authmethod", "type": "select", "label": "Auth Method", "options": ["api_key", "own", "wiro"], "default": "api_key" },
              { "key": "systemusertoken", "type": "password", "label": "System User Token", "runtime_excluded": true, "only_in_modes": ["api_key"] },
              { "key": "accountId", "type": "text", "label": "Instagram Account ID", "auto_filled_by_oauth": true, "readonly_when_connected": true },
              { "key": "igusername", "type": "text", "label": "Connected Account", "auto_filled_by_oauth": true, "readonly_when_connected": true }
            ]
          },
          "authmethod": "",
          "igusername": "",
          "connectedat": ""
        }
      },
      "extracreditpacks": [],
      "status": 1,
      "createdat": "1711929600",
      "updatedat": "1714521600"
    }
  ]
}
```

> `Agent/Detail` describes the **template**, so its `credentials` block only carries the `optional` / `extra` meta flags plus the registry-driven `_schema` (field labels / types) and `_editable` map. The `_connected` flag is per-instance and appears on `UserAgent/Detail` / `UserAgent/MyAgents`, not on the catalog endpoint. `extracreditpacks` is always `[]` here — packs are derived from the deployed instance's actual monthly allocation (see [Extra Credit Packs](#extra-credit-packs)) and only appear on `UserAgent/Detail`.

**Credential response flags** (on `UserAgent/Detail` / `UserAgent/MyAgents`) — every credential object in the top-level `credentials` tree on the per-instance endpoints carries:

| Flag | Type | Meaning |
|------|------|---------|
| `_connected` | boolean | **Connection readiness indicator.** `true` when Wiro has a validated OAuth or hybrid direct connection and every required picker field (`customerid`, `merchantid`, `channelid`, ad-account, page ID, Instagram account ID, etc.) is populated. Plain API-key and service-account providers that do not write `connectedat` can remain `false`; use `setuprequired` to determine overall setup readiness. |
| `optional` | boolean | `true` when the template marks this credential as not required for the agent to run. Agents can start even if `optional: true` credentials are empty. |
| `extra` | boolean | `true` when the template groups the credential under "extra integrations" in the UI (disabled by default until the user opts into the skill). |
| `_editable` | object | Map of `fieldname → true` for fields the caller may write. Computed from the registry schema + caller role. |
| `_schema` | object | Inlined registry descriptor — `{ title, icon, brand_color, brand_text_color, brand_logo_filter, docs_url, credential_mode, connection_modes[], default_connection_mode, mode_badges, wiro_connect_pending, oauth_provider, fields[] }`. Lets a UI render the form without a separate `Credentials/Detail` round-trip. |

**Field redaction in responses:**

- `fieldstatus: "oauth_session"` fields (`accesstoken`, `refreshtoken`, `tokenexpiresat`, `pageAccessToken`, etc.) — always stripped from every response, regardless of caller role.
- Schema fields marked `runtime_excluded: true` — including Meta
  `systemusertoken` — are write-only setup secrets. They never enter the agent
  runtime and are not reflected to customer-facing credential responses.
- `fieldstatus: "platform"` fields (currently only `credentials.sys-openai.apikey` and its `model` / `fallbacks` / `cronmodel` siblings) — stripped for API callers (role = `user`). The `sys-openai` credential entry itself is also dropped from the response. Only the daemon container ever sees the values. `credentials.wiro.apikey` and `credentials.calendarific.apikey` are operator-supplied user-input fields and appear in the response with `fieldstatus: "user"` like any other API-key credential.
- `fieldstatus: "oauth_app"` fields (`clientsecret`, `appsecret`) — **visible to anyone who can read the credentials**. History writes redact `clientsecret` to `[REDACTED]`, but the live value is returned. Treat them as read-admin-only in your own UI layer.
- Sentinel rows `_isoptional` / `_isextra` — never appear as fields; they're folded into the `optional` and `extra` flags above.

API callers see the non-sensitive fields (public identifiers like `clientid`, display-only values like `igusername`, flags like `authmethod`, and the flags above).

### Deploy & Manage

All endpoints below require authentication.

#### **POST** /UserAgent/Deploy

Creates a new agent instance from a catalog template, **or** builds a brand-new custom agent (no template).

> **API agent deployment is prepaid-only.** Pass `useprepaid: true` + `tier` — the subscription cost is deducted from your prepaid wallet immediately and the instance is created server-side in one call. There is no API path that accepts a credit card directly; subscriptions from a card can only be created through the Wiro dashboard at [wiro.ai/panel/agents](https://wiro.ai/panel/agents). Top up your wallet on [wiro.ai/panel/billing](https://wiro.ai/panel/billing) before calling Deploy.

Prepaid deploy (`useprepaid: true` + `tier`) charges your wallet for the chosen tier price immediately and inserts a 30-day subscription row (`plan: "agent"`, `provider: "prepaid"`). **Every fresh Deploy lands at `status: 6` first** — the row is then auto-queued to `status: 2` (Queued) once the prepaid subscription is provisioned. No manual `UserAgent/Start` is needed for prepaid deploys; the daemon picks the row up from the queue.

If you pass `credentials`, `skills`, or `customskills` at the top level of the Deploy body they are **applied server-side in the same call** (one-shot deploy + initial setup) — note that inline credentials only accept flat string/number fields and can't populate nested arrays (firebase accounts, drive folders, app-store apps); use `POST /UserAgent/CredentialUpsert` afterwards for those. See [Agent Credentials → Prepaid deploy — inline setup supported](/docs/agent-credentials#prepaid-deploy--inline-setup-supported-with-limitations) for the full rules.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `agentguid` | string | Conditional | The guid of the agent template from the catalog. Required unless `custom: true`. |
| `custom` | boolean | Conditional | Pass `true` to deploy a custom-built agent (no marketplace template). Mutually exclusive with `agentguid`. See [Agent Builder](/docs/agent-builder) for the full builder flow. |
| `title` | string | Yes | Display name for your instance. |
| `description` | string | No | Optional description (custom builds: free-text describing what the agent does). |
| `cover` | string | No | Optional cover image URL. Custom builds only — template deploys clone the agent's cover automatically. |
| `useprepaid` | boolean | Yes | Must be `true` for API deploys. Pays the tier price from your wallet balance in a single server-side call. |
| `tier` | string | No | Tier selection: `"starter"` (default) or `"pro"`. Determines the price + credits debited to your wallet at deploy time. The param name is `tier` — any other value (including typos) is silently coerced to `"starter"`, so a misspelled key yields a Starter-tier instance instead of an error. |
| `credentials` | object | No | Inline credentials to apply server-side (flat fields only — see Agent Credentials). |
| `skills` | object | No | Inline skill toggles `{ "skillname": true \| false }`. For custom builds this seeds the initial skill set; for template deploys it overlays the template defaults. |
| `customskills` | array | No | Inline custom skill rows. Each entry: `{ key, value?, interval?, enabled?, description?, _user_created? }`. |

**Headers:** Standard API authentication — `x-api-key` for key-based projects, or `x-nonce` + `x-signature` for signature-based projects (see [Authentication](/docs/authentication)). For **team-scoped deploys** (when an end user deploys via a team project), pass `teamGUID: <team-guid>` as an additional request header; the API validates the caller is a team admin before writing the instance row.

> **`teamGUID` header usage across endpoints** — the requirement differs per endpoint:
>
> | Endpoint | `teamGUID` header |
> |----------|-------------------|
> | `UserAgent/Deploy` | Pass when deploying into a team project; validated against team admin before insert |
> | `UserAgent/Message/Send`, `Message/Detail`, `Message/History`, `Message/Sessions`, `Message/Cancel`, `Message/DeleteSession` | **Required for team agents.** Messaging endpoints call `validateAgentContext(teamGUID, ...)` and reject if the header is missing or doesn't match a team the caller belongs to |
> | `UserAgent/Detail`, `UserAgent/Update`, `UserAgent/Start`, `UserAgent/Stop`, `UserAgent/MyAgents` | Optional — these endpoints fall back to "am I a member of this agent's team?" check, so the header isn't strictly needed if your user already has team membership. Passing it is still recommended for explicitness and to avoid ambiguity on multi-team users |
> | `UserAgent/CancelSubscription`, `UserAgent/CreateExtraCreditCheckout`, `UserAgent/UpgradeTier`, `UserAgent/RenewSubscription`, `UserAgent/CreateSubscriptionCheckout` | **Required for team agents** — subscription / billing operations also validate team context explicitly |
>
> Personal (non-team) agents ignore this header. If you see `"You are not a member of this team"` or `"Agent not found"` errors on messaging endpoints, you're likely missing the header on a team agent.

##### Request body — template deploy (recommended API pattern)

```json
{
  "agentguid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "title": "My Instagram Bot",
  "useprepaid": true,
  "tier": "starter"
}
```

##### Request body — custom build (Build Your Own Agent)

```json
{
  "custom": true,
  "title": "My Custom Sales Agent",
  "description": "Watches inbound emails and posts a summary to Slack each morning.",
  "useprepaid": true,
  "tier": "pro",
  "skills": {
    "int-gmail-check":    true,
    "int-telegram-post":  true,
    "int-wiro-aimodels": true
  },
  "credentials": {
    "gmail":    { "account": "agent@company.com", "apppassword": "xxxx xxxx xxxx xxxx" },
    "telegram": { "bottoken": "123456:ABC-DEF...", "allowedusers": "[\"761381461\"]", "sessionmode": "private" }
  }
}
```

> **Custom builds are skill-driven.** There is no marketplace template behind a custom agent — the price + credit allowance is computed live from the skills you toggle on. Use [`POST /UserAgent/PricingPreview`](#post-useragentpricingpreview) (with `draft: true`) to estimate the tier price before calling Deploy. Full walkthrough: [Agent Builder](/docs/agent-builder).

##### Template deploy vs custom build — what differs server-side

Both paths hit the same endpoint, but a few server-side behaviours diverge:

| Aspect | Template deploy (`agentguid`) | Custom build (`custom: true`) |
|--------|------------------------------|-------------------------------|
| `agentid` on the new useragent row | Snapshotted from the resolved template | `null` — no template back-reference |
| `categories` | Cloned from the agent template | `null` (custom agents have no marketplace categories) |
| `cover` | Cloned from `agent.cover` automatically | Optional — pass `cover` in the body if you want one |
| `tiermultiplier` | **Snapshotted from `agent.tiermultiplier`** so future template tweaks don't retroactively change pricing on already-deployed instances | Fixed at the platform default (`10`) |
| Bundled cron skills | Cloned from the template's preset customskills (`cloneAgentCustomSkillsToUserAgent`) | Materialized from the standalone cron registry based on the enabled skill set (`cloneCustomAgentBundledCrons`) |
| Onboarding placeholders | None — the template ships its own preset strategies | One invocation-only `cs-my-custom-strategy` and one scheduled `cs-cron-my-scheduled-task` are seeded so the panel always has something to render under "Custom Skills" / "Scheduled Skills" |
| Platform-managed credentials (currently `sys-openai` only) | Inherited from the template's preset `agentcredentialfields` | Seeded directly onto the useragent so `composeRuntimeConfig` has a non-empty merge input |
| Marketplace counter (`agents.totalrun`) | Bumped by 1 | Not touched (custom agents have no template to count against) |
| `tiers` / `extracreditpacks` in the response | Read from the template definition | Pre-subscribe state — `tiers` reflects the live registry pricing for the toggled skills, `extracreditpacks: []` until the subscription provisions |

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
      "tiermultiplier": 10,
      "credentials": {
        "instagram": {
          "_connected": false,
          "optional": false,
          "extra": false,
          "_editable": { "authmethod": true, "systemusertoken": true, "igusername": true },
          "_schema": { "title": "Instagram", "credential_mode": "hybrid", "connection_modes": ["api_key", "own", "wiro"], "default_connection_mode": "api_key", "fields": [ "..." ] },
          "authmethod": "",
          "igusername": "",
          "connectedat": ""
        }
      },
      "skills": ["int-instagram-post", "int-wiro-aimodels"],
      "customskills": [],
      "scheduledskills": [],
      "monthlycredits": 225,
      "monthlypriceusd": 9,
      "extracredits": 0,
      "usedcredits": 0,
      "remainingcredits": 225,
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
      "teamsessionmode": "",
      "status": 6,
      "setuprequired": true,
      "pinned": false,
      "agent": {
        "guid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "title": "Instagram Manager",
        "slug": "instagram-manager",
        "cover": "https://cdn.wiro.ai/uploads/agents/instagram-manager-cover.webp",
        "categories": ["social-media", "marketing"],
        "tiermultiplier": 10,
        "tiers": {
          "starter": { "priceUsd": 9, "credits": 225 },
          "pro":     { "priceUsd": 90, "credits": 2250 }
        },
        "extracreditpacks": [
          { "packkey": "small",  "credits": 1125, "priceusd": 45,  "enabled": true },
          { "packkey": "medium", "credits": 2250, "priceusd": 90,  "enabled": true },
          { "packkey": "large",  "credits": 4500, "priceusd": 180, "enabled": true }
        ]
      },
      "createdat": 1714608000,
      "updatedat": 1714608000
    }
  ]
}
```

##### Status and `setuprequired` on deploy

The Deploy response reflects the same composed shape you get from `UserAgent/Detail`. **Every fresh Deploy starts at `status: 6` (Setup Required)**. From there, the prepaid path auto-queues the row to `status: 2` after subscription provisioning:

| Field | Meaning |
|-------|---------|
| `status: 6` | **Setup Required** — initial state for every fresh Deploy. With `useprepaid: true`, auto-queues to `status: 2` as soon as the subscription is provisioned, regardless of credential completeness. If credentials are still missing when the daemon picks the row up, the start fails with `Agent setup is not complete` and the row drops to `status: 5` (Errored). Fill the missing credentials with `POST /UserAgent/CredentialUpsert`, then call `POST /UserAgent/Update` (any scalar body — even just `{ "guid": "<useragent-guid>" }`) to flip the row back to `status: 0` (Stopped) — `Update` is the endpoint that performs the `setuprequired` re-check and the `6 → 0` transition. Then call `Start` to launch. |
| `status: 2` | **Queued** — `useprepaid: true` charged the wallet, the subscription was provisioned, and the daemon's pickup loop will start the container. No manual `UserAgent/Start` is required. |
| `setuprequired: true` | Any non-optional credential is missing. While `true`, `Start` rejects with `Agent setup is not complete`. |
| `setuprequired: false` | All non-optional credentials complete. The next `POST /UserAgent/Update` call flips the row 6 → 0 if it was sitting at Setup Required; `Start` then launches it normally. |

> **Subscription on deploy:** the `useragents.subscription` field is **not** included in the Deploy response (it's assembled from the `subscriptions` table). A prepaid subscription row (`plan: "agent"`, provider `prepaid`, `tier` matches what you passed) is inserted server-side during the Deploy call — call `POST /UserAgent/Detail` with the returned `guid` to read the subscription object back.

Next steps for the API integration flow:

1. Inspect `credentials` in the Deploy response (or call `POST /UserAgent/Detail`) to see each provider's fields, the `optional` / `extra` flags, the registry-driven `_schema`, and the `_connected` OAuth status.
2. Call `POST /UserAgent/CredentialUpsert` per provider (or in bulk via the `fields[]` array) to write API keys, bot tokens, WordPress credentials, etc. For OAuth providers (Meta, Google Ads, HubSpot, …) use the unified `/UserAgentOAuth/OAuthConnect` flow with `credentialkey` — see [Agent Credentials & OAuth](/docs/agent-credentials).
3. Call `POST /UserAgent/CustomSkillUpsert` per skill to customize strategy text or cron intervals, if the template exposes any.
4. Once all non-optional credentials are filled, the row's `setuprequired` flag flips to `false`. If the prepaid subscription was already provisioned during Deploy, the daemon picks the row up from the queue automatically and the status progresses `2` → `3` (Starting) → `4` (Running).
5. If you want to re-launch a stopped agent (status `0`) or recover an errored one (status `5`), call `POST /UserAgent/Start` explicitly.

##### Idempotency — duplicate Deploy guard

Deploy rejects a second call from the same `(uuid, agentid, teamguid)` tuple within a 10-second window. Custom builds (`agentid IS NULL`) dedup on `(uuid, title, teamguid)` instead. The rejection carries a top-level `existingUserAgentGuid` field so callers can adopt the row that already won the race instead of retrying:

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

This guards against double-tap CTAs, client-side retries, and ALB/CDN retries on transient 5xx responses creating duplicate subscriptions and double-charging the wallet. `existingUserAgentGuid` is the only top-level field added on this error — the `errors[]` array always carries `code: 99` for the dedup hit.

> **Tip — keep your dashboard clean.** Deployed instances always land pinned in your account. To unpin programmatically (e.g. after bulk-provisioning one instance per customer) call [`POST /UserAgent/Pin`](#post-useragentpin) with `{ "useragentguid": "...", "pinned": false }` immediately after the Deploy call resolves.

#### **POST** /UserAgent/MyAgents

Lists all agent instances deployed under your account.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sort` | string | No | Sort column: `id`, `title`, `status`, `createdat`, `updatedat`, `startedat`, `runningat`, `stopdat`. Default: `id` |
| `order` | string | No | Sort direction: `ASC` or `DESC`. Default: `DESC` |
| `limit` | number | No | Results per page (max 1000). Default: `20` |
| `start` | number | No | Offset for pagination. Default: `0` |
| `category` | string | No | Filter by category (comma-separated for multiple) |

> **Pagination:** the response does not include a `total` count. To know if there are more pages, call with `limit: 20` and inspect the returned array length — if it equals your `limit`, paginate further by incrementing `start` (e.g. `start: 20, 40, 60, ...`) until you get fewer rows than your `limit`.

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
      "tiermultiplier": 10,
      "monthlypriceusd": 90,
      "monthlycredits": 2250,
      "extracredits": 2000,
      "usedcredits": 1450,
      "creditperiod": "2026-05",
      "creditsyncat": 1714694410,
      "status": 4,
      "pinned": true,
      "teamsessionmode": "",
      "setuprequired": false,
      "subscription": {
        "plan": "agent",
        "status": "active",
        "amount": 90,
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
        "tiermultiplier": 10,
        "tiers": {
          "starter": { "priceUsd": 9, "credits": 225 },
          "pro":     { "priceUsd": 90, "credits": 2250 }
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

> **`MyAgents` returns one row per useragent with its scalar fields, the trimmed `agent` template summary (no `extracreditpacks`), `subscription`, `setuprequired` (status-based check only), `extracredits` / `extracreditsexpiry`, the resolved `enabledSkills` (template defaults ∪ user overrides, including transitive `depends_on` closure), `tokenRates` (per-model token rates — same map as `UserAgent/Detail.tokenRates`), `agentModel` (the resolved chat / cron / voice-prep / voice-postcall model slugs), and `enabledCommands` (the slash-command allowlist, `null` when uncustomized).** Heavier composed children (`credentials`, `customskills`, `scheduledskills`, `skills`, `skillsmeta`, `remainingcredits`) are **not** included — call `UserAgent/Detail` on a single guid for the full composed shape.

> **`enabledSkills`, `tokenRates`, and `agentModel`** ride on each list row so the dock chat / pinned-agents UI can decide whether to show the realtime voice-call button (`enabledSkills` includes `util-web-channel`) and render the model picker + live token-rate card without round-tripping `UserAgent/Detail` per row.

#### **POST** /UserAgent/Detail

Retrieves full details for a single deployed agent instance, including subscription info, the per-instance credit ledger summary, the resolved per-model token-rate table (`tokenRates`) plus model selection (`agentModel`), and the `extracreditpacks` catalog.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `guid` | string | Yes | Your UserAgent instance guid |

##### Response — prepaid instance (the API deploy pattern)

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
      "tiermultiplier": 10,
      "status": 4,
      "pinned": true,
      "setuprequired": false,
      "teamsessionmode": "",
      "credentials": {
        "instagram": {
          "_connected": true,
          "optional": false,
          "extra": false,
          "_editable": {
            "authmethod": true,
            "systemusertoken": true,
            "igusername": true
          },
          "_schema": {
            "title": "Instagram",
            "icon": "https://wiro.ai/images/icons/credentials/instagram.svg",
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
                "key": "authmethod",
                "label": "Authentication Method",
                "type": "select",
                "required": true,
                "options": [
                  { "label": "System User Token", "value": "api_key" },
                  { "label": "Own OAuth app",     "value": "own" },
                  { "label": "Wiro-managed",      "value": "wiro" }
                ],
                "default": "api_key"
              },
              {
                "key": "systemusertoken",
                "label": "System User Token",
                "type": "password",
                "required": true,
                "runtime_excluded": true,
                "only_in_modes": ["api_key"]
              },
              {
                "key": "accountId",
                "label": "Instagram Account ID",
                "type": "text",
                "required": true,
                "auto_filled_by_oauth": true,
                "readonly_when_connected": true
              },
              {
                "key": "igusername",
                "label": "Connected Account",
                "type": "text",
                "required": false,
                "auto_filled_by_oauth": true,
                "readonly_when_connected": true
              }
            ]
          },
          "_required_missing": false,
          "authmethod": "api_key",
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
            "sessionmode":  true
          },
          "_schema": {
            "title": "Telegram Bot",
            "icon": "https://wiro.ai/images/icons/credentials/telegram.svg",
            "brand_color": "#2AABEE",
            "brand_text_color": "#FFFFFF",
            "brand_logo_filter": null,
            "docs_url": "/docs/integration-telegram-skills",
            "credential_mode": "api_key",
            "connection_modes": ["api_key"],
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
                "label": "Allowed Telegram User IDs",
                "type": "text",
                "required": false,
                "placeholder": "[\"761381461\", \"823901274\"]",
                "help": "JSON array of Telegram user / chat IDs that may DM the bot. Empty = open to anyone."
              },
              {
                "key": "sessionmode",
                "label": "Session Mode",
                "type": "select",
                "required": true,
                "options": [
                  { "label": "Private (one session per user)", "value": "private" },
                  { "label": "Group (one session per chat)",   "value": "group"   }
                ],
                "default": "private"
              }
            ]
          },
          "_required_missing": false,
          "bottoken": "",
          "allowedusers": "",
          "sessionmode": "private"
        },
        "wordpress": {
          "_connected": false,
          "optional": false,
          "extra": false,
          "_editable": {
            "siteurl":         true,
            "username":        true,
            "applicationpass": true
          },
          "_schema": {
            "title": "WordPress",
            "icon": "https://wiro.ai/images/icons/credentials/wordpress.svg",
            "brand_color": "#21759B",
            "brand_text_color": "#FFFFFF",
            "brand_logo_filter": null,
            "docs_url": "/docs/integration-wordpress-skills",
            "credential_mode": "api_key",
            "connection_modes": ["api_key"],
            "wiro_connect_pending": false,
            "oauth_provider": null,
            "fields": [
              {
                "key": "siteurl",
                "label": "Site URL",
                "type": "text",
                "required": true,
                "placeholder": "https://blog.example.com",
                "pattern": "^https?://.+"
              },
              {
                "key": "username",
                "label": "Username",
                "type": "text",
                "required": true,
                "placeholder": "wp-editor"
              },
              {
                "key": "applicationpass",
                "label": "Application Password",
                "type": "password",
                "required": true,
                "placeholder": "xxxx xxxx xxxx xxxx xxxx xxxx",
                "help": "Generate from WP Admin → Users → Profile → Application Passwords."
              }
            ]
          },
          "_required_missing": true,
          "siteurl": "",
          "username": "",
          "applicationpass": ""
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
          "key": "cs-cron-content-scanner",
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
          "user_invocable": false,
          "deprecated": false,
          "replacement": null,
          "description": "Internal: lets the agent call Wiro's own image / video / LLM generation API. Other skills invoke it; users do not."
        }
      },
      "monthlycredits": 2250,
      "monthlypriceusd": 90,
      "extracredits": 2000,
      "usedcredits": 1450,
      "remainingcredits": 2800,
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
        "amount": 90,
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
        "tiermultiplier": 10,
        "tiers": {
          "starter": { "priceUsd": 9,  "credits": 225 },
          "pro":     { "priceUsd": 90, "credits": 2250 }
        },
        "extracreditpacks": [
          { "packkey": "small",  "credits": 11250, "priceusd": 450, "enabled": true },
          { "packkey": "medium", "credits": 22500, "priceusd": 900, "enabled": true },
          { "packkey": "large",  "credits": 45000, "priceusd": 1800, "enabled": true }
        ]
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

**Tier & pricing**

| Field | Type | Description |
|-------|------|-------------|
| `tier` | `string` | `"starter"` or `"pro"` — the active tier for this instance. |
| `tiermultiplier` | `number` | Per-instance Pro multiplier — snapshotted at deploy from the template (default `10`). Pro `monthlypriceusd` = Starter × `tiermultiplier`. The value is fixed for the life of the instance — it is captured at deploy time and is not refreshed when the platform default changes. |
| `monthlypriceusd` | `number` | Monthly USD price snapshotted at deploy / renewal. Mirrors `subscription.amount`. |
| `monthlycredits` | `number` | Monthly credit allocation snapshotted at deploy / renewal. |
| `extracredits` | `number` | Active extra-credit balance (sum of non-expired packs from `CreateExtraCreditCheckout`). |
| `extracreditsexpiry` | `number\|null` | Unix timestamp when the earliest extra credit pack expires. `null` when no extras are active. |
| `usedcredits` | `number` | Credits consumed during the current billing period, reported by the agent runtime. |
| `remainingcredits` | `number` | Computed: `max(0, monthlycredits + extracredits - usedcredits)`. |
| `creditperiod` | `string` | `'YYYY-MM'` tag of the current billing window. Rolls over on subscription renewal. |
| `creditsyncat` | `number\|null` | Unix seconds of the last agent → API usage sync (`null` before the first report). |
| `tokenRates` | `object\|null` | Per-model token-billing rates (credits per 1,000,000 tokens). Shape: `{ default_model, fallback_rate, models: { "<slug>": { input_per_1m, output_per_1m, cached_input_per_1m?, cache_write_per_1m?, selectable?, label?, tier? } } }`. Each turn's cost is metered from these rates (1 credit = $0.01) — see [Token Billing](#pricing-model--tiers-skills--token-billing). `null` only on registry-read failure. |
| `agentModel` | `object` | The resolved model slugs this instance runs: `{ chatModel, cronModel, voicePrepModel, voicePostcallModel }` (camelCase). Each falls back to the platform default when the operator hasn't overridden it. Change them via [`POST /UserAgent/UpdateSettings`](#post-useragentupdatesettings) using the lowercase keys `chatmodel` / `cronmodel` / `voiceprepmodel` / `voicepostcallmodel`. |
| `enabledCommands` | `array<string>\|null` | The in-chat slash-command allowlist (camelCase read). `null` = the operator never customized it, so **all** slash commands are available. An array (including `[]`) is an explicit allowlist of command keys (no leading slash); `[]` hides the slash-command menu. Write it via [`POST /UserAgent/UpdateSettings`](#post-useragentupdatesettings) with the lowercase `enabledcommands` key. Also present on `MyAgents` / `PinnedAgents` rows. |

**Lifecycle**

| Field | Type | Description |
|-------|------|-------------|
| `status` | `number` | Current status code (see [UserAgent Statuses](#useragent-statuses)). |
| `setuprequired` | `boolean` | `true` if any required credential is missing or incomplete. Mirrors `status: 6` plus a fresh check against the live credential rows. |
| `createdat` / `updatedat` / `queuedat` / `startedat` / `runningat` / `stoppingat` / `stopdat` / `errordat` | `number\|null` | Unix seconds for each lifecycle transition. `null` until the corresponding state is reached. |

**Composed children**

| Field | Type | Description |
|-------|------|-------------|
| `credentials` | `object` | Per-provider credential map keyed by credential name (`instagram`, `telegram`, `wordpress`, …). Each provider object carries the live field values plus a fixed metadata header — see "Credential object shape" below. |
| `customskills` | `array` | Composed list of preset strategies and **non-cron** custom skills (writable instructions). Each entry: `{ key, description, value, enabled, interval: null, _source, _editable, _edited, _user_created? }`. `_source` ∈ `"preset-strategy"` \| `"user-created"`. |
| `scheduledskills` | `array` | Composed list of **cron** skills (`cs-cron-*`). Same shape as `customskills` plus `interval` (cron expression). `_source` ∈ `"skill-bundle"` (preset cron) \| `"user-created"`. |
| `skills` | `array<object>` | Currently-enabled integration skills. Each entry: `{ name, enabled: true, _edited, _user_created }`. Toggle via `SkillsApply` (single-skill or batch). Note: object array (not string array). |
| `skillsmeta` | `object` | Inline registry snapshot keyed by skill name — `title`, `icon`, `brand_color`, `category`, `docs_url`, `credential_key`, `requires_credentials`, `user_invocable`, `description`. Lets the panel render skill chips without a `Skills/List` round-trip. |
| `teamsessionmode` | `string` | `"collaborative"` or `"private"` for team agents; empty string `""` for personal agents. Drives `Message/History` filtering: collaborative sessions show every team member's messages, private sessions filter by the caller's `uuid`. Write with [`POST /UserAgent/UpdateSettings`](#post-useragentupdatesettings) (team admins / owner only). |
| `timezone` | `string\|null` | Operator-selected IANA timezone (e.g. `"Europe/Istanbul"`, `"America/New_York"`). `null` means **system default (UTC)** — the agent container runs `TZ=UTC` and `current_time` in voice prep stays in UTC ISO form. When set, propagates through `settings.json.useragentTimezone` → container `TZ` env → cron `schedule.tz` → caller-facing voice prep / business-hours rendering. Write with [`POST /UserAgent/UpdateSettings`](#post-useragentupdatesettings). |

**Subscription & template**

| Field | Type | Description |
|-------|------|-------------|
| `subscription` | `object\|null` | Active subscription info (see "Subscription object" below), or `null` when the agent has no active subscription. For API-deployed instances this is always `provider: "prepaid"`, `plan: "agent"`. |
| `agent` | `object` | Parent template summary: `{ guid, title, slug, headline, description, cover, icon, categories, tiermultiplier, tiers, extracreditpacks }`. For custom builds (`agentid: null` / `agentguid: null`) this is a synthesized placeholder with the same shape **plus** `agent.custom: true`; `agent.guid`, `agent.title`, `agent.cover` mirror the useragent itself in that case. |

##### Credential object shape

Every provider entry under `credentials.<key>` carries:

| Sub-field | Type | Description |
|-----------|------|-------------|
| `_connected` | `boolean` | Connection-readiness flag. `true` when Wiro has a validated OAuth or hybrid direct credential and every required picker field is populated. Plain API-key and service-account providers can remain `false`; for those use `_required_missing` or inspect the field values directly. |
| `optional` | `boolean` | `true` when the agent template marks this credential as optional (the agent can run without it; the dependent skill just won't fire). `false` for required credentials. |
| `extra` | `boolean` | `true` when this credential surfaces in the "alternative" / secondary group on the panel (rare; most credentials are primary). |
| `_editable` | `object` | Per-field edit map: `{ fieldname: true\|false }`. `false` means the field is read-only (managed by OAuth, platform-managed, or computed). The frontend uses this to disable inputs. |
| `_schema` | `object` | Inline registry descriptor — `title`, `icon`, `brand_color`, `docs_url`, `credential_mode` (`oauth`, `api_key`, `hybrid`, etc.), `connection_modes`, `default_connection_mode`, `mode_badges`, `oauth_provider`, plus a `fields[]` array describing every input the form should render. Lets the panel build credential cards without a separate `Credentials/Detail` round-trip. |
| `_required_missing` | `boolean` | `true` when the operator should look at this credential — required + user-editable fields are still empty (or the optional card is partially filled but incomplete). Drives the "needs attention" bullet on each credential card and the aggregate count badge on the Credentials tab. `false` when the card is complete or untouched-and-optional. |
| `connectedat` | `string\|null` | OAuth and hybrid providers: ISO timestamp of the last successful connection. |
| `tokenexpiresat` | `string\|null` | ISO timestamp when the current token expires, or an empty value when the provider reports no fixed expiry. |
| `<fieldname>` | `string\|number\|boolean\|array` | The actual field value as the user (or OAuth callback) saved it. Field types match `_schema.fields[].type`. Sensitive values (`oauth_session` access/refresh tokens, `clientsecret`, `password`-typed fields) are NEVER returned in this surface — they stay server-side. |

##### Subscription object

| Sub-field | Type | Description |
|-----------|------|-------------|
| `plan` | `string` | Always `"agent"`. The Starter/Pro distinction lives on the useragent row's `tier` field, not on the subscription. |
| `status` | `string` | `"active"`, `"expired"`, `"cancelled"`, or `"refunded"`. |
| `amount` | `number` | The monthly USD price actually being charged. Mirrors `useragent.monthlypriceusd`. |
| `currency` | `string` | Always `"usd"`. |
| `currentperiodend` | `number\|null` | Unix seconds when the current billing period ends. |
| `renewaldate` | `string\|null` | ISO-8601 string of the same period-end timestamp (convenience for display). |
| `daysremaining` | `number` | Days until `currentperiodend`. |
| `pendingdowngrade` | `string\|null` | `"cancel"` after `CancelSubscription`; `null` for normal active subs. |
| `provider` | `string` | `"prepaid"` for every API-deployed subscription. |

#### **POST** /UserAgent/Update

Updates an agent instance's **scalar fields only** (title, description, categories, cover URL). If the agent is currently **starting (status `3`)** or **running (status `4`)**, this triggers an automatic restart to apply the new settings (the agent is moved to Stopping with `restartafter: true`, and re-queued after it fully stops).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `guid` | string | Yes | Your UserAgent instance guid |
| `title` | string | No | New display name |
| `description` | string | No | New description (set to empty string or `null` to clear) |
| `categories` | array | No | Updated categories. Cannot be empty if provided. |
| `cover` | string | No | New cover image URL (set to empty string or `null` to clear). For multipart upload, use [`POST /UserAgent/Cover`](#post-useragentcover) instead. |

> **Scalar-only.** Credentials, custom skills, skill toggles, and tier upgrades use dedicated endpoints:
>
> | What you want to change | Use |
> |-------------------------|-----|
> | Provider credentials (API keys, OAuth settings) | [`POST /UserAgent/CredentialUpsert`](#post-useragentcredentialupsert) |
> | Upload a credential `fileinput` field (multipart, e.g. Twilio voice MP3) | [`POST /UserAgent/CredentialFileUpload`](#post-useragentcredentialfileupload) |
> | Custom skill values (strategy text, cron intervals, enabled flag) | [`POST /UserAgent/CustomSkillUpsert`](#post-useragentcustomskillupsert) |
> | Rename a user-created custom skill (key + optional description) | [`POST /UserAgent/CustomSkillRename`](#post-useragentcustomskillrename) |
> | Browse alternative templates for a custom skill | [`POST /UserAgent/CustomSkillAlternatives`](#post-useragentcustomskillalternatives) |
> | Delete a user-created cron skill | [`POST /UserAgent/CustomSkillDelete`](#post-useragentcustomskilldelete) |
> | Toggle one or more integration skills on/off (with optional tier change) | [`POST /UserAgent/SkillsApply`](#post-useragentskillsapply) |
> | Upgrade Starter → Pro | [`POST /UserAgent/UpgradeTier`](#post-useragentupgradetier) |
> | Upload a cover image (multipart) | [`POST /UserAgent/Cover`](#post-useragentcover) |
> | Per-agent timezone or team chat session mode | [`POST /UserAgent/UpdateSettings`](#post-useragentupdatesettings) |
> | View / download / purge activity logs | [`POST /UserAgent/Logs`](#post-useragentlogs) · [`LogsList`](#post-useragentlogslist) · [`LogsFile`](#post-useragentlogsfile) · [`LogsDelete`](#post-useragentlogsdelete) |
> | Soft-delete a useragent | [`POST /UserAgent/Delete`](#post-useragentdelete) |

> **Note:** `CredentialUpsert` writes credential fields **but does not transition `status: 6` on its own**. After filling the missing credentials, call `POST /UserAgent/Update` once (any scalar body — even just `{ "guid": "<useragent-guid>" }` — works) to trigger the `setuprequired` re-check; that's the call that flips `status: 6 → 0` (Stopped) so the next `Start` succeeds.

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
      "description": "Updated description after rename",
      "cover": "https://cdn.wiro.ai/uploads/useragents/f8e7d6c5-cover.webp",
      "categories": ["social-media", "marketing"],
      "tier": "starter",
      "tiermultiplier": 10,
      "monthlypriceusd": 9,
      "monthlycredits": 225,
      "extracredits": 0,
      "usedcredits": 80,
      "creditperiod": "2026-05",
      "creditsyncat": 1714694400,
      "status": 1,
      "pinned": false,
      "setuprequired": false,
      "teamsessionmode": "",
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
        "tiermultiplier": 10,
        "tiers": {
          "starter": { "priceUsd": 9,  "credits": 225 },
          "pro":     { "priceUsd": 90, "credits": 2250 }
        },
        "extracreditpacks": []
      },
      "createdat": 1714608000,
      "updatedat": 1714694500,
      "queuedat": 1714694498,
      "startedat": null,
      "runningat": null,
      "stoppingat": 1714694500,
      "stopdat": null,
      "errordat": null
    }
  ]
}
```

> **`Update` returns the full composed useragent shape** — same composition path as `UserAgent/Detail` (`getUserAgentDetailForUI`), so `credentials`, `customskills`, `scheduledskills`, `skills`, `skillsmeta`, `tokenRates`, `agentModel`, and the `agent` template summary (with `tiers` + `extracreditpacks`) are all included. The fields `Update` cannot safely populate without an extra round-trip (`subscription`, `remainingcredits`, `extracreditsexpiry`) stay omitted — call `UserAgent/Detail` next if you need them. Otherwise the response is suitable for an in-place panel re-render without a follow-up call.

> **Restart on running agents.** When the call lands on a status `3`/`4` agent, the response shows the lifecycle transition mid-flight: `status: 1` (Stopping) with a fresh `stoppingat` timestamp, `runningat` cleared, and `queuedat` set to the same instant — Wiro auto-queues the agent so it picks the new settings up after the next stop cycle.

#### **POST** /UserAgent/UpdateSettings

Writes per-agent preference toggles that are not credentials and not skill rows. Exposes `timezone` (operator-selected IANA zone, propagates into the agent container's `TZ` env, cron `schedule.tz`, and caller-facing voice prep), `teamsessionmode` (team workspace session mode), the four **model overrides** — `chatmodel`, `cronmodel`, `voiceprepmodel`, `voicepostcallmodel` — that choose which LLM the agent uses for chat replies, scheduled (cron) turns, voice-call prep, and the post-call summary turn, and `enabledcommands` (the in-chat slash-command allowlist). Submit any subset in the same call — partial updates are supported and untouched fields keep their current value.

**Permission**: owner OR team admin (the same `requireRole: "admin"` gate as `/UserAgent/Update`). Team members cannot flip these knobs.

**Restart**: if the agent is **starting (status `3`)** or **running (status `4`)**, the call auto-stops the container with `restartafter: true` so the daemon worker picks up the fresh `settings.json` (new timezone, session mode, and / or model selection) on the next launch cycle. Status `0`/`1`/`2`/`5`/`6` agents take effect on the next manual `Start` without a soft-stop.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Your UserAgent instance guid. |
| `timezone` | string\|null | No | IANA timezone identifier (e.g. `"Europe/Istanbul"`, `"America/New_York"`, `"Asia/Tokyo"`). Pass `null`, `""`, or the literal `"UTC"` to **clear** the override — the row is set back to `NULL`, which makes the propagation chain a no-op (container stays on `TZ=UTC`, no per-job `schedule.tz` injection, voice prep `current_time` stays in single-line UTC ISO form). Validated server-side via `new Intl.DateTimeFormat("en-GB", { timeZone })` — unknown zones are rejected with `invalid-timezone`. |
| `teamsessionmode` | string | No | `"collaborative"` or `"private"`. Only meaningful when the agent is team-owned (`teamguid` is set); passing it on a personal agent is rejected with `teamsessionmode-team-only`. See [Agent Messaging](/docs/agent-messaging) for what each mode does to `Message/History` and `Sessions` scoping. |
| `chatmodel` | string\|null | No | Canonical model slug for **chat replies** (e.g. `"openai/gpt-5.6-sol"`). Must be a **selectable** model — i.e. `tokenRates.models[<slug>].selectable === true`; an unknown / non-selectable slug is rejected with `invalid-model-selection`. Pass `null` or `""` to clear the override and fall back to the platform default. |
| `cronmodel` | string\|null | No | Same rules as `chatmodel`, applied to **scheduled (cron) turns**. |
| `voiceprepmodel` | string\|null | No | Same rules as `chatmodel`, applied to the **voice-call prep** turn (context assembled before a realtime call). |
| `voicepostcallmodel` | string\|null | No | Same rules as `chatmodel`, applied to the **post-call summary** turn after a realtime voice call ends. |
| `enabledcommands` | string[] | No | Allowlist of in-chat **slash commands** the agent exposes, as an array of command keys **without** the leading slash (e.g. `["agent_help", "new_session", "agent_status"]`). Validated against the command catalog — an unknown key is rejected with `invalid-command-selection`, a non-array value with `invalid-command-list`. Order is preserved and duplicates are removed. An empty array `[]` is valid and **hides the slash-command menu** entirely. Omit the field to leave the current allowlist untouched. |

> **Slash-command catalog.** Valid `enabledcommands` keys are: `agent_help`, `new_session`, `agent_status`, `agent_limits`, `last_scan`, `last_heartbeat`, `agent_restart`, `clear_all_sessions`, `clear_history`. Read the agent's current allowlist from the `enabledCommands` field (camelCase) on [`UserAgent/Detail`](#post-useragentdetail) / `MyAgents` / `PinnedAgents` — `null` there means the operator never customized it (all commands available); an array (including `[]`) is an explicit allowlist.

> **Omitted fields are preserved.** The handler distinguishes between "field not in the body" and "field present with `null`/`""`/value", so a POST that carries only `timezone` does **not** touch `teamsessionmode` or any model field, and vice versa. Sending an empty body (none of the recognised fields) is rejected with `nothing-to-update` to avoid charging a no-op container restart.

> **Read vs write casing.** You **read** the current selection from the `agentModel` object on `UserAgent/Detail` / `MyAgents` / `PinnedAgents` in camelCase (`chatModel`, `cronModel`, `voicePrepModel`, `voicePostcallModel`); you **write** it here in lowercase (`chatmodel`, `cronmodel`, `voiceprepmodel`, `voicepostcallmodel`). The selectable set is exactly the models that `tokenRates.models` marks `selectable: true` — there is no separate "list models" endpoint, so read `tokenRates` to populate a picker.

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

# Flip team chat session mode (team-owned agents only)
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

> **Light response by design.** `UpdateSettings` returns just `result` + `errors` — no full useragent shape. Pull the refreshed row with `POST /UserAgent/Detail` if you need to re-render the panel after the write.

##### Common errors

| Code | Message key | When |
|------|-------------|------|
| 400 | `request-parameter-required` | `useragentguid` missing from the body. |
| 400 | `nothing-to-update` | Body had none of the recognised fields (`timezone`, `teamsessionmode`, a model override, or `enabledcommands`). |
| 400 | `invalid-timezone` | `timezone` wasn't a string the runtime's `Intl.DateTimeFormat` could resolve. |
| 400 | `teamsessionmode-team-only` | `teamsessionmode` was set on a personal (non-team) agent. |
| 400 | `teamsessionmode-invalid` | `teamsessionmode` wasn't `"collaborative"` or `"private"`. |
| 400 | `invalid-model-selection` | A model override (`chatmodel` / `cronmodel` / `voiceprepmodel` / `voicepostcallmodel`) was an unknown or non-selectable slug (`tokenRates.models[<slug>].selectable !== true`). |
| 400 | `invalid-command-list` | `enabledcommands` was present but not an array. |
| 400 | `invalid-command-selection` | `enabledcommands` contained a key that isn't in the slash-command catalog. |
| 403 | `useragent-access-denied` | Caller is neither the owner nor a team admin on a team-owned agent. |
| 500 | `failed-to-update-useragent` | DB write failed (transient — safe to retry). |

#### **POST** /UserAgent/Cover

Uploads a new cover image for the agent instance via multipart. Mirrors the `/User/Avatar` pattern — accepts `jpg`, `png`, `gif`, `jpeg`, `webp`; converts to webp; uploads to S3; writes the resulting CDN URL into `useragents.cover`.

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
      "tiermultiplier": 10,
      "monthlypriceusd": 9,
      "monthlycredits": 225,
      "extracredits": 0,
      "usedcredits": 80,
      "creditperiod": "2026-05",
      "creditsyncat": 1714694400,
      "status": 4,
      "pinned": false,
      "teamsessionmode": "",
      "agent": {
        "guid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "title": "Instagram Manager",
        "slug": "instagram-manager",
        "headline": "Automate your Instagram presence with AI",
        "description": "An autonomous agent that manages your Instagram Business account.",
        "cover": "https://cdn.wiro.ai/uploads/agents/instagram-manager-cover.webp",
        "icon": "https://cdn.wiro.ai/uploads/agents/instagram-manager-icon.webp",
        "categories": ["social-media", "marketing"],
        "tiermultiplier": 10
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

> **Cover returns scalar useragent fields + the `agent` template summary only.** It does **not** include `setuprequired`, `tokenRates`, `agentModel`, `remainingcredits`, or any composed children (`credentials`, `customskills`, `scheduledskills`, `skills`, `skillsmeta`, `subscription`). The endpoint is optimised for the cover refresh round-trip; call `UserAgent/Detail` afterwards if you need the full composed shape.

#### **POST** /UserAgent/CredentialUpsert

Writes one or more credential fields for one or multiple providers in a single call.

If the agent is **starting** or **running**, completing the upsert triggers an automatic restart (`restartafter: true`).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Your UserAgent instance guid |
| `fields` | array | Yes | One or more field rows. Each row has `{ credentialkey, fieldname, fieldvalue, fieldstatus?, parentfield?, ordinal? }`. You can write to more than one `credentialkey` in a single request. |

Each field row:

| Field | Type | Description |
|-------|------|-------------|
| `credentialkey` | string | The provider key — e.g. `"instagram"`, `"google-ads"`, `"wordpress"`, `"telegram"`. Must match one of the credentials declared in `credentials` on `/UserAgent/Detail`. |
| `fieldname` | string | Field inside that credential — e.g. `"apikey"`, `"clientid"`, `"bottoken"`. Must not start with `_` (reserved for internal sentinels such as `_isoptional`, `_isextra`). |
| `fieldvalue` | string \| number | The value to write. Empty string is allowed (effectively clears the field). |
| `fieldstatus` | string | **Server-managed — ignored from the request body for API callers.** The value is derived from the registry / OAuth flow on the server side (e.g. `user` for hand-edited fields, `oauth_session` for tokens written by the OAuth callback, `oauth_app` for app credentials, etc.). Do not set this field — the field is stripped before any write. |
| `parentfield` | string | Optional. Dotted path when the credential has a nested array (e.g. `"accounts.0.apps"` for `firebase.accounts[0].apps[*]`). |
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

`applied` is the number of rows actually written. Any row that fails validation (reserved fieldname, invalid fieldstatus for your role) is skipped and reported in `errors` without rolling back the others.

> **Twilio Voice — extra response fields.** When any `twilio-voice` field is touched, `CredentialUpsert` also auto-configures each Twilio phone number's `VoiceUrl` and surfaces the result on the response:
>
> | Field | Type | Meaning |
> |-------|------|---------|
> | `twilioWebhooksUpdated` | `string[]` | E.164 numbers whose `VoiceUrl` was just pointed at the Wiro Twilio webhook. |
> | `twilioWebhookSkipped` | `string[]` | Numbers already pointing at the right URL (no change made). |
> | `twilioWebhooksFailed` | `string[]` | Numbers the API tried to update but Twilio rejected (e.g. number not in the credentialed account). |
> | `twilioWebhookError` | `string` | Top-level message when the entire VoiceUrl-rewrite flow failed (auth error, network outage). The credential rows are still saved — only the auto-configuration step failed. |
>
> Treat all four fields as best-effort: the credential write itself never depends on Twilio's API call succeeding. See [Twilio Voice Integration](/docs/integration-twiliovoice-skills) for the full lifecycle.

#### **POST** /UserAgent/CredentialFileUpload

Multipart-upload sibling of `CredentialUpsert` for credential fields whose registry schema declares `type: "fileinput"` — typically large binary assets that don't fit comfortably in a JSON body (e.g. Twilio voice greeting MP3, custom hold music). The endpoint stores the blob under your account's MyUploads area, writes the resulting reference into the credential field via the same `upsertUserAgentCredentialField` path used by `CredentialUpsert`, and triggers an automatic restart so the new URL flows into the daemon's `settings.json` on the next start.

Unlike `CredentialUpsert`, this endpoint expects `multipart/form-data` — pass the metadata as form fields and the blob in a `file` part.

| Form field | Type | Required | Description |
|------------|------|----------|-------------|
| `useragentguid` | text | Yes | Your UserAgent instance guid |
| `credentialkey` | text | Yes | Provider key (e.g. `twilio-voice`). Must declare a `fileinput` field in its registry schema. |
| `fieldname` | text | Yes | The exact `fieldname` whose registry `type` is `"fileinput"` (e.g. `holdaudio` or `holdmusic` on `twilio-voice`). |
| `file` | file | Yes | The blob. Mimetype + size are validated against the registry's `filetypes[]` whitelist and `maxsize` (KB) cap. Default cap is 10 MB when the field omits `maxsize`. |

> **`fileinput` vs `fileinput-base64`.** This endpoint is the storage path for the `fileinput` type only — the binary lives in S3 and the credential row stores a reference. The companion `fileinput-base64` type stays inline in the DB (encrypted at rest) and is written via the standard `CredentialUpsert` JSON `fields[]` array (e.g. `serviceaccountjson` on `google-drive`/`google-calendar`/`google-play`/`firebase`, `privatekey` on `apple-appstore`). Sending a base64 field through this endpoint returns `Field is not a fileinput type`.

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

The `url` is the public, AES-keyed CDN URL the daemon will fetch at runtime. The credential row stores the raw `<path>/<name>` reference under the hood and recomposes the URL on every read, so the field stays valid across CDN domain rotation and AES key rotation.

##### Common errors

| Error | When |
|-------|------|
| `File required (form field name: file)` | Missing the `file` multipart part |
| `Unknown credential: <key>` | `credentialkey` not declared in the skill registry |
| `Unknown field: <name>` | `fieldname` not in the credential's `credential_schema` |
| `Field is not a fileinput type` | The schema field's `type` is not `"fileinput"` (use `CredentialUpsert` instead) |
| `Invalid file type. Allowed: <list>` | Mimetype not in the registry's `filetypes[]` whitelist |
| `File too large. Max: <kb> KB` | Size exceeds the registry's `maxsize` cap (default 10240 KB / 10 MB) |
| `Could not resolve upload folder` / `Upload failed` | Filesystem helper rejected the write — usually transient, retry |

#### **POST** /UserAgent/CustomSkillUpsert

Writes a single custom skill — either a **strategy** (instructions read by other skills at runtime) or a **scheduled task** (`cs-cron-*`).

The endpoint auto-normalises the skillkey to its canonical form. Bare slugs become `cs-<slug>`; if you also send `interval` (a non-empty cron string), the slug is treated as a cron and becomes `cs-cron-<slug>`. So `"weekly-health-check"` with `interval: "0 9 * * 1"` is stored as `cs-cron-weekly-health-check`. The `usercreated` flag is **not** consulted by the prefix logic — pass `interval` (or send the prefixed `cs-cron-…` key explicitly) to land in the Scheduled Skills tab.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Your UserAgent instance guid |
| `skillkey` | string | Yes | The skill key. Strategies use bare names (e.g. `"content-tone"` → stored as `cs-content-tone`). Crons use a `cron-` prefix (e.g. `"cron-content-scanner"` → stored as `cs-cron-content-scanner`). |
| `value` | string | No | Strategy body / cron prompt text. Editable for preset strategies and user-created entries; bundled crons silently drop `value` writes. |
| `interval` | string | No | Cron expression (e.g. `"0 */4 * * *"`). Only persisted on `cs-cron-*` rows. |
| `enabled` | boolean | No | Turn the skill on or off. **Writable for both strategies (`cs-*`) and crons (`cs-cron-*`)** — a disabled strategy is suppressed end-to-end (the IDE still shows it but the runtime drops it from `<available_skills>` and the per-skill `SKILL.md` write is skipped). Defaults to `true` on insert. |
| `description` | string | No | Only persisted for user-created skills (preset descriptions are template-owned). |
| `usercreated` | boolean | No | **Admin-only override.** Non-admin callers: the request value is ignored — `usercreated` is server-managed (`INSERT` writes `true`, `UPDATE` preserves the row's current source so a preset row cannot be flipped into a user-created one). Admin (`tokenUserRoles` contains `"ADMIN"`) callers may explicitly set `true` / `false` to control whether the end user can delete the row from the panel. **Has no effect on the cron prefix** — flavour is decided by `interval` / explicit `cs-cron-` prefix only. |

> **Description-only edits skip the restart.** If you only change `description` (and the row's functional fields — `value`, `interval`, `enabled` — stay the same), the agent is **not** restarted. Functional changes still trigger the standard auto-restart.

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

Renames a user-created custom skill, optionally updating its description in the same atomic write. Only rows with `usercreated: true` can be renamed through this endpoint — preset-owned rows reject with `agent-customskill-rename-preset-forbidden` (preset renames cascade through the admin `/Agent/CustomSkillRename` channel instead).

The skillkey flavour is preserved: a `cs-cron-*` scheduled task stays scheduled, a `cs-*` strategy stays a strategy. Cross-flavour renames are rejected — delete + re-create via `CustomSkillUpsert` with the right kind if you need to switch sections.

Version history is migrated under the new key so the full audit chain stays continuous after the rename, and a new `rename` entry is appended.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Your UserAgent instance guid |
| `oldskillkey` | string | Yes | The skill's current canonical key (e.g. `cs-my-strategy`, `cs-cron-daily-summary`). |
| `newskillkey` | string | Yes | The new skill key. The server canonicalises bare slugs using the flavour of `oldskillkey`: if old is `cs-cron-*` the new slug lands on `cs-cron-*`; otherwise `cs-*`. |
| `description` | string | No | New description. Omit to leave unchanged; pass an empty string to clear. |

> **Restart.** The renamed key surfaces in the container's settings.json, so the useragent is auto-restarted on success (same behaviour as `CustomSkillUpsert` functional edits).

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
| `agent-customskill-rename-preset-forbidden` | Target row has `usercreated: false` (preset-owned). Preset renames go through the admin `/Agent/CustomSkillRename` cascade. |
| `agent-customskill-rename-flavour-mismatch` | Caller tried to rename `cs-cron-*` ↔ `cs-*`. Delete + re-create with the right kind instead. |
| `agent-customskill-rename-collision` | `newskillkey` already exists on this useragent. |
| `agent-customskill-rename-same-key` | `oldskillkey` equals canonicalised `newskillkey` — nothing to change. |
| `agent-customskill-not-found` | `oldskillkey` does not exist on the useragent. |

#### **POST** /UserAgent/CustomSkillAlternatives

Returns a list of alternative starter templates that the panel's custom-skill picker can offer for a given `skillkey`. Used by the "Browse alternatives" UX when the user wants to swap one bundled cron / strategy for another preset-owned variant without manually rewriting the `value` body.

This endpoint is **read-only** — it does not mutate the useragent. Apply a chosen alternative by calling `CustomSkillUpsert` with the alternative's `value` (and `interval` for crons).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Your UserAgent instance guid (membership check only — the alternatives list is registry-derived, not per-instance). |
| `skillkey` | string | Yes | The skill the user is looking to swap — usually a `cs-*` strategy or a `cs-cron-*` cron currently on the useragent. |

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

Each entry carries `title`, `description`, `value`, and — for cron-flavoured alternatives only — `intervalexpr` (a cron expression). The endpoint never returns a `key` field; alternatives are addressed by their position in the list and applied via `CustomSkillUpsert` on the **current** `skillkey` (so the operator can swap the body of `cs-content-tone` between presets without renaming it).

When the registry has no alternatives for the requested `skillkey`, the response is `{ "result": true, "alternatives": [] }` — empty lists are not an error.

#### **POST** /UserAgent/CustomSkillDelete

Removes a user-created custom skill. The endpoint enforces a **hybrid delete policy** to prevent accidental destruction of registry-owned scaffolding the runtime depends on:

| Row type | Delete result |
|----------|--------------|
| User-created (`usercreated: true`) on any agent | **Allowed** — row is hard-deleted, agent restarts. |
| Registry-owned / preset-owned (`usercreated: false`) on a **template** agent (the row also exists in the agent's preset `agentcustomskills`) | **Rejected** — `"This skill belongs to the agent preset and cannot be deleted."` Disable it via `CustomSkillUpsert` with `enabled: false` instead. |
| Registry-owned (`usercreated: false`) on a **custom-build** agent (no preset to compare against) | **Rejected** — `"This skill is registry-owned and cannot be deleted."` Disable it via `CustomSkillUpsert` with `enabled: false` instead. Custom builds carry registry-seeded rows (e.g. `cs-approval-policy`, bundled `cs-cron-*` clones) whose runtime contract the agent depends on, even though there's no template back-reference. |

In both reject branches the response carries `suggestion: "disable-via-upsert"` so panel UIs can offer a "Disable instead" CTA without re-querying the registry.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Your UserAgent instance guid |
| `skillkey` | string | Yes | The skill key to remove. User-created rows only — registry-owned rows reject with `disable-via-upsert`. |

##### Response (delete allowed)

```json
{ "result": true, "errors": [] }
```

##### Response (preset-owned — rejected with suggestion)

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

##### Response (registry-owned on a custom build — rejected with suggestion)

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

Returns the version history for one custom skill on a useragent — a per-write audit trail with diff metadata + the resolved actor for each entry. Powers the "Version History" modal in the panel; useful for API consumers building audit views.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Your UserAgent instance guid |
| `skillkey` | string | Yes | Canonical skill key (e.g. `"cs-content-tone"`) |
| `startdate` | number | No | UTC epoch seconds — return entries on/after this time |
| `enddate` | number | No | UTC epoch seconds — return entries on/before this time |

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

> **Field semantics.** Each row captures the **BEFORE** state of the action that produced it (audit-write fires before the table mutation). The server-computed `after_*` and `prev_*` fields give you the resolved AFTER + previous-version snapshots without you having to walk the list manually:
>
> - `prev_*` — value as of the immediately-older entry (`null` for the oldest row).
> - `after_*` — value the row was left with after this action committed: pulled from the next-newer entry's BEFORE state, or from the live `useragentcustomskills` row for the newest entry. `null` when `operation: "delete-user"` (row was removed).
> - `changed_fields[]` — names of fields whose value differs from the immediately-older entry. Subset of `["value", "interval", "enabled"]`.
> - `changedby_user` — resolved actor object (full shape: `uuid`, `firstname`, `lastname`, `email`, `username`, `avatar`, `avatarinitials`). `null` when `changedby` is a sentinel like `"system"` / `"backfill-*"` (cron / migration writes) or when the user record was deleted.

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
- `oauth_session` fields (access / refresh tokens) **never** appear in history at all — they're stripped before persisting.
- `clientsecret` and similar `oauth_app` secret fields are stored as `[REDACTED]` in history rows (the live row carries the real secret — read it via `UserAgent/Detail`).
- The platform-managed `sys-openai` credential short-circuits to an empty `entries[]` (no user-facing history to show).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Your UserAgent instance guid |
| `credentialkey` | string | Yes | Provider key (e.g. `"instagram"`, `"wordpress"`) |
| `startdate` | number | No | UTC epoch seconds — return entries on/after this time |
| `enddate` | number | No | UTC epoch seconds — return entries on/before this time |

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

> `changedby_user` is the resolved actor object (`uuid`, `firstname`, `lastname`, `email`, `username`, `avatar`, `avatarinitials`). It is `null` when `changedby` is a sentinel like `"system"` / `"backfill-*"` (cron / migration writes) or when the user record has been deleted.

#### **POST** /UserAgent/SkillsApply

Applies a batch of skill toggles + an optional tier change in a single transactional unit. **This is the only skill-toggle endpoint API consumers should use** — even when you're flipping a single skill, send it as a one-entry `skills` map. The single-skill alternative (`SkillToggle`) is not part of the public API surface.

Designed for both the Skill Editor modal (multiple toggles in one save) and one-off API mutations:

1. Charges the wallet (or proration) **once**, not N times.
2. Triggers exactly **one container restart** after all toggles land.
3. Uses **idempotency** + a UA-level mutex — concurrent calls or FE retries can't double-apply.
4. **Atomic** — a payment-side failure rolls back to the pre-call skill set.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Your UserAgent instance guid (custom build only for non-admin callers) |
| `skills` | object | Yes | Map of `{ "skillname": true \| false }` for every skill you want to set. Skills not in the map keep their current state. |
| `tier` | string | No | `"starter"` or `"pro"` — change the tier in the same call. **Pro → Starter downgrade is rejected** (cancel + re-subscribe instead). |
| `idempotencyKey` | string | Yes | Caller-generated unique key (UUID recommended). Replays of the same key return the cached response without re-running the saga. |

##### Request

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/SkillsApply" \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
    "tier": "pro",
    "idempotencyKey": "550e8400-e29b-41d4-a716-446655440000",
    "skills": {
      "int-instagram-post": true,
      "int-twitterx-post":  true,
      "int-telegram-post":  false
    }
  }'
```

##### Response (success)

```json
{
  "result": true,
  "errors": [],
  "tier": "pro",
  "prepaidWalletDelta": 18.00,
  "restartTriggered": true,
  "restartedAt": 1714694520,
  "pricing": {
    "previousPriceUsd": 4,
    "newPriceUsd": 40,
    "deltaUsd": 36,
    "previousMonthlyCredits": 100,
    "newMonthlyCredits": 1000,
    "deltaCredits": 900,
    "enabledSkills": ["int-instagram-post", "int-twitterx-post", "int-wiro-aimodels"]
  }
}
```

##### Response (no-op short-circuit)

When every entry in your `skills` map already matches the persisted state and the requested `tier` (if any) is unchanged, the endpoint returns a fast-path `noOp: true` reply with no DB writes, no wallet movement, and no restart. Use this signal to skip your own post-apply UI churn (toast, refresh) on detected no-op submissions.

```json
{
  "result": true,
  "errors": [],
  "noOp": true
}
```

| Field | Type | Description |
|-------|------|-------------|
| `noOp` | `boolean` | Present and `true` only on the no-op short-circuit response. Absent on the regular success path. When you see `noOp: true`, the rest of the field set (`tier`, `prepaidWalletDelta`, `restartTriggered`, `pricing`) is omitted — there was nothing to apply. |
| `tier` | `string` | The tier in effect after the call (`"starter"` or `"pro"`). Mirrors what was passed in `body.tier` — or the unchanged current tier if the request omitted it. |
| `prepaidWalletDelta` | `number` | USD debited (positive) or credited (negative) from the wallet for the prorated price diff. `0` when the toggle batch is a no-op or the agent has no active subscription yet. |
| `restartTriggered` | `boolean` | `true` when the agent runtime was restarted to pick up the new skill set. `false` for stopped agents (no restart needed) or no-op batches. |
| `restartedAt` | `number\|null` | Unix seconds when the restart trigger fired. `null` when `restartTriggered` is `false`. |
| `pricing.previousPriceUsd` / `newPriceUsd` / `deltaUsd` | `number` | USD totals before / after the apply, plus the signed delta. |
| `pricing.previousMonthlyCredits` / `newMonthlyCredits` / `deltaCredits` | `number` | Monthly credit allocation before / after, plus the signed delta. |
| `pricing.enabledSkills` | `array<string>` | Final enabled skill set including transitive `depends_on` closure — flat array of skill names. The matching `useragent.skills` array on the next `Detail` call is an object array (`{name, enabled, _edited?, _user_created?}`); take `.name` from each entry to compare. |

##### Common error codes

| Code | Meaning |
|------|---------|
| `100` | `skillsapply-template-only` — caller tried to mutate skills on a template-deploy useragent. Skills are inherited from the marketplace template; deploy a custom build (`Deploy` with `custom: true`) to run a different skill set. |
| `101` | `skillsapply-deps-violation` — a final enabled skill has unsatisfied `depends_on`. Body includes `deps[]`. |
| `102` | `skillsapply-conflict` — two finally-enabled skills are mutually exclusive. Body includes `conflicts[]`. |
| `103` | `skillsapply-insufficient-wallet` — wallet can't cover the prorated charge. Body includes `requiredUsd` / `availableUsd`. |
| `104` | `skillsapply-in-progress` — another `SkillsApply` is already running on this useragent. Wait and retry. |
| `105` | `skillsapply-tier-downgrade` — Pro → Starter rejected. Cancel + re-subscribe instead. |
| `106` | `skillsapply-subscription-inactive` — subscription must be `active` to mutate. |
| `108` | `skillsapply-db-tx-failed` — DB transaction rolled back; safe to retry with a new idempotency key. |

#### **POST** /UserAgent/PricingPreview

Live tier-pricing preview. Drives the Build Your Agent / Skill Editor UI: as the user toggles skills on/off, the frontend POSTs here with `skillOverrides` to see "if I save this, my new monthly price would be $X with Y monthly credits" without writing any state.

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
  "tier": "pro",
  "skillOverrides": {
    "int-instagram-post": true,
    "int-telegram-post":  false
  }
}
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `draft` | boolean | A | When `true`, no useragent lookup happens; the resolver synthesises pricing from the `skills` array directly. Used by Build Your Agent. |
| `skills` | array<string> | A | Draft mode only — the proposed enabled skill set. |
| `useragentguid` | string | B | Required for non-draft previews. |
| `skillOverrides` | object | No | Override the persisted state with `{ skillname: boolean }` for the preview. Omit for "current state" preview. |
| `tier` | string | No | `"starter"` or `"pro"` — preview a specific tier. The response also includes both tiers under `tiers.{starter,pro}`. |

##### Response

```json
{
  "result": true,
  "errors": [],
  "tier": "pro",
  "tiermultiplier": 10,
  "totalPriceUsd": 40,
  "totalMonthlyCredits": 1000,
  "starterFloorUsd": 4,
  "skillBreakdown": [
    { "skill": "int-instagram-post", "priceUsd": 1, "credits": 25, "billing_model": "tokens" },
    { "skill": "int-wiro-aimodels",  "priceUsd": 1, "credits": 25, "billing_model": "tokens" }
  ],
  "enabledSkills": ["int-instagram-post", "int-wiro-aimodels"],
  "directSkills":  ["int-instagram-post"],
  "agentBase": { "priceUsd": 0, "credits": 0 },
  "tiers": {
    "starter": { "priceUsd": 4,  "credits": 100 },
    "pro":     { "priceUsd": 40, "credits": 1000 }
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

`enabledSkills` is the full closure (including transitive `depends_on`); `directSkills` is just what the user explicitly toggled. `agentBase` is always `{ priceUsd: 0, credits: 0 }` — pricing is fully skill-driven, and the field is kept on the response so callers don't have to null-check. `skillBreakdown[].billing_model` is always `"tokens"`; `tokenRates` carries the per-model rates used to meter each turn (see [Token Billing](#pricing-model--tiers-skills--token-billing)).

> **$4 starter floor.** When the raw weight sum lands below $4 (e.g. a single `LIGHT` skill at $1/25), the resolver bumps `tiers.starter.priceUsd` up to $4 **and** scales `tiers.starter.credits` up by the same ratio (25 → 100); the applied floor is echoed as `starterFloorUsd`. Pro derives from the post-floor starter via × `tiermultiplier` (default `10`), so a $1-weight agent becomes Starter `$4/100` and Pro `$40/1000`. See [Pricing Model — Tiers, Skills & Token Billing](#pricing-model--tiers-skills--token-billing) for the full rules.

#### **POST** /UserAgent/CreateSubscriptionCheckout

Subscribes a useragent that doesn't yet have an active subscription. Wallet is debited, a prepaid subscription row is inserted, and the agent is auto-queued — same single-call behaviour as `Deploy` with `useprepaid: true`. Always pass `useprepaid: true` from the API.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Your UserAgent instance guid |
| `useprepaid` | boolean | Yes | Must be `true` for API consumers. |
| `tier` | string | No | `"starter"` or `"pro"` — overrides the useragent's persisted tier so the user can re-subscribe at a different tier without redeploying. |

##### Response

```json
{
  "result": true,
  "errors": [],
  "subscriptionId": 8421,
  "monthlypriceusd": 90,
  "monthlycredits": 2250
}
```

If the useragent already has an active subscription, the call rejects with `Subscription already active for this useragent. Cancel or modify the existing subscription instead.`

#### **POST** /UserAgent/Start

Starts a stopped agent instance. The agent is moved to Queued (status `2`) and picked up by a worker. Also valid for agents in Error state (`5`) — Start re-queues them for another launch attempt.

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

> `useragents` is always returned (empty array on Start) because the endpoint uses the shared `UserAgentResultModel` — just `result` and `errors` carry the outcome here.

Start will fail (returns `{ "result": false, "errors": [...] }`) if:
- The agent is already running or queued
- The agent is currently stopping
- Setup is incomplete (status `6`)
- No credits remain (`monthlycredits + extracredits - usedcredits <= 0`)

#### **POST** /UserAgent/Stop

Stops a running agent instance. If the agent is Queued (status `2`), it is immediately set to Stopped. If it is Starting or Running (status `3`/`4`), it moves to Stopping (status `1`) and the container is shut down gracefully.

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

Soft-deletes a useragent. The row stays in the database (so the audit trail in `agenttransactions`, `useragentcredentialfieldshistory`, `useragentcustomskillshistory`, `agentmessages` keeps its FK targets intact) but `deletedat` + `deletedby` are stamped, the agent is unpinned, and every read path (`Detail`, `MyAgents`, `Start`, `Stop`, daemon config compose, cron reconcile) automatically excludes the tombstoned row.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Your UserAgent instance guid. `guid` is also accepted as an alias. |

**Headers:** Pass `teamGUID: <team-guid>` when the target agent belongs to a team project; the caller must be the row owner or a team admin (plain team members are rejected with code `97`).

##### Guards (run in this order)

1. **Access** — owner of the row or a team admin of the UA's team. Members get `useragent-team-admin-required` (code `97`); strangers get `useragent-access-denied` (code `96`); unknown / already-deleted rows get `useragent-not-found` (code `95`).
2. **Status** — must be in a clean terminal state: `0` (Stopped), `5` (Error), or `6` (Setup Required). Anything in flight (`1` Stopping, `2` Queued, `3` Starting, `4` Running) is rejected with `useragent-delete-running` — Stop the agent first and wait for status `0`.
3. **Active subscription** — any `subscriptions.status='active'` row blocks delete (`useragent-delete-sub-active`). Cancel the subscription first; expired / cancelled / refunded / no-sub all pass.

The write is idempotent — calling `Delete` on an already-deleted row no-ops the second `UPDATE` (`AND deletedat IS NULL`) and you still get `result: true`.

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
| `useragent-delete-running` | Status is `1` / `2` / `3` / `4` — call `Stop` first and retry once status reaches `0` |
| `useragent-delete-sub-active` | An active subscription is still attached — call `CancelSubscription` first |

#### **POST** /UserAgent/Logs

Live activity feed for a useragent — what the agent did, when, and (post-rollout) which user triggered it. The daemon writes one JSONL row per skill invocation / cron tick / user message into the worker's per-day activity file; this endpoint tails the latest N rows for a given date and decorates each event with the resolved actor.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Your UserAgent instance guid |
| `date` | string | No | Activity date in `YYYY-MM-DD` (or `"today"`). Default: `"today"`. |
| `lines` | number | No | Tail size — most recent N rows. Default `200`, capped at `5000`. |

**Headers:** Owner-or-team-member access. Pass `teamGUID: <team-guid>` for team-scoped agents.

##### Rate limit (non-admin callers)

Non-admin callers are rate-limited via a 30-second Redis cache keyed on `(useragentguid, date, lines)`. The first call within a 30s window hits the worker; subsequent calls within the window receive the cached payload. Admins (`tokenUserRoles` includes `ADMIN`) bypass entirely. Tune your polling cadence to ≥30s for non-admin tokens to avoid serving stale data — the cache TTL was chosen to match the panel's lowest non-admin polling interval.

##### Response

```json
{
  "result": true,
  "errors": [],
  "events": [
    {
      "ts": "2026-05-03T14:00:03.000Z",
      "kind": "token_usage",
      "title": "Turn billed — 5 credits",
      "summary": { "trigger": "chat" },
      "model": "openai/gpt-5.4",
      "tokens": { "input": 3450, "output": 820, "cacheRead": 2400, "cacheWrite": 0, "total": 6670 },
      "tokencost": 5,
      "durationMs": 4200,
      "calls": 2,
      "remainingcredits": 2245,
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
      "title": "Cron tick: cs-cron-content-scanner",
      "summary": { "skill": "cs-cron-content-scanner", "interval": "0 9 * * *", "trigger": "scheduled", "queued": 3 },
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
| `events[]` | array | One row per activity entry, **newest first** (descending by `ts`) — `events[0]` is the most recent event. Do not re-reverse for display. |
| `events[].ts` | string | ISO-8601 UTC datetime when the event was emitted (e.g. `"2026-05-03T14:00:01.000Z"`). Parse with `Date.parse(ts)` for arithmetic. |
| `events[].kind` | string | Fine-grained event class. One of: `"tool_started"`, `"tool_completed"` (one pair per tool invocation), `"turn_started"`, `"turn_ended"` (LLM turn boundary), `"cron_started"`, `"cron_finished"` (scheduled-cron tick), `"session_start"`, `"session_end"` (chat-session boundary), `"user_message"` (user → agent), `"agent_reply"` (agent → user), `"token_usage"` (a billed turn's token deduct), `"token_usage_idempotent"` (a replayed usage callback — already billed, informational), `"balance_gate_blocked"` (a turn refused because the credit pool was empty). |
| `events[].tool` | string \| null | Present on `tool_started` / `tool_completed`. One of: `"read"`, `"write"`, `"edit"`, `"exec"`, `"web_fetch"`, `"web_search"`, `"sessions_spawn"`, `"message"`. |
| `events[].title` | string | Human-readable one-line description (always present). |
| `events[].summary` | object \| null | Structured event-specific payload. Treat as opaque — render as JSON when expanding. Plugin pre-redacts `apikey`, `apppassword`, `clientsecret`, `bearer`, `token`, etc. before writing. Keys vary per `kind`/`tool`. |
| `events[].durationMs` | number \| null | Wall-clock duration in milliseconds. Populated on `*_completed` / `*_finished` / `turn_ended` / `token_usage` events. |
| `events[].ok` | boolean \| null | `true` on success, `false` on failure. Populated on `*_completed` / `*_finished`. Pair with `error` for failures. |
| `events[].error` | string \| null | One-line failure message (when `ok: false`). |
| `events[].model` | string \| null | Canonical model slug billed for the turn. Present on `token_usage` / `token_usage_idempotent` events. |
| `events[].tokens` | object \| null | Token breakdown on `token_usage` events: `{ input, output, cacheRead, cacheWrite, total }` — **nested camelCase** (distinct from the flat lowercase `inputtokens` / `outputtokens` / … columns on message + transaction rows; same underlying data, different shape). |
| `events[].tokencost` | number \| null | Credits deducted for the turn (1 credit = $0.01). Present on `token_usage` events. |
| `events[].calls` | number \| null | Number of LLM calls made in the billed turn. Present on `token_usage` events. |
| `events[].remainingcredits` | number \| null | Credit pool remaining after the deduct. Present on `token_usage` events. |
| `events[].userUuid` | string \| null | Originating actor's UUID. `"system"` for cron / internal events. May be missing on legacy rows from the 180-day retention window pre-attribution rollout — the server falls back to the useragent owner. |
| `events[].user` | object \| null | Resolved user shape (`uuid`, `firstname`, `lastname`, `email`, `username`, `avatar`, `avatarinitials`) when the actor is a real user. `null` for `system` events. |
| `date` | string | The date that was actually read (`YYYY-MM-DD`). |
| `totalLines` | number | **Total lines in the file** (regardless of `lines` cap). Use this to show "showing X of Y events" headers. |

##### Common errors

| Error | When |
|-------|------|
| `useragentguid is required` | Missing `useragentguid` in the body |
| `Agent is not assigned to a worker. It may not be running.` | The useragent has never been deployed to a worker (no `workerid` set yet) |
| `Worker not found` | Worker row was removed mid-flight (extremely rare) |
| `Failed to fetch activity from worker` | Worker host unreachable / internal error during the tail |

#### **POST** /UserAgent/LogsList

Lists the dates for which an activity log file exists on the worker host. Useful for building a date-picker UI before calling `Logs` / `LogsFile` for that day.

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
    { "date": "2026-05-01", "sizeBytes": 71680,  "compressed": true  }
  ]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `dates[].date` | string | Activity-file date in `YYYY-MM-DD` form. Sorted newest-first. |
| `dates[].sizeBytes` | number | Raw byte size of the file on disk (compressed size if `compressed: true`). |
| `dates[].compressed` | boolean | `true` once the worker's daily maintenance cron has gzipped the file (`<date>.jsonl.gz`); `false` for the active day's plain `.jsonl`. |

The host retains activity files for 180 days (rolling); older dates are pruned by a worker cron and won't appear here.

#### **POST** /UserAgent/LogsDelete

Removes one date's activity JSONL file (and its gzipped sibling if present) from the worker host. Useful for scrubbing a specific day without waiting for the 180-day rotation.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Your UserAgent instance guid |
| `date` | string | Yes | Activity date to purge (`YYYY-MM-DD`). |

**Headers:** Owner-or-team-member access. Pass `teamGUID: <team-guid>` for team-scoped agents.

##### Response

```json
{
  "result": true,
  "errors": [],
  "date": "2026-04-30",
  "removed": { "plain": true, "gz": false }
}
```

Idempotent — deleting an already-gone date returns `result: true` with `removed.plain: false` and `removed.gz: false`.

#### **POST** /UserAgent/LogsFile

Downloads the **full** day's activity log (no `lines` cap). Use this when you need a complete forensic trace — `Logs` is for live-tail UX (capped at 5000 rows for cache hygiene). The response is the same `events[]` shape as `Logs`, plus a `truncated` flag.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Your UserAgent instance guid |
| `date` | string | Yes | Activity date to download (`YYYY-MM-DD`). |

**Headers:** Owner-or-team-member access. Pass `teamGUID: <team-guid>` for team-scoped agents.

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

`events` is sorted **newest first** (descending by `ts`) — same contract as `Logs`, so `events[0]` is the freshest entry whether you're tailing the live day or downloading a historical one. `truncated: true` only when the worker's read buffer hit a hard ceiling (currently 250k rows / 50 MB). For typical agents this stays `false`; if you ever see `true`, fall back to streaming the file directly via the panel's download link.

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

Lists the user's pinned agents. Returns the **same composed shape as `MyAgents`** — every field that appears on a `MyAgents` row appears here, just filtered to `pinned: true`.

No request body fields are required — the caller's `tokenUUID` (or active `teamGUID` header) scopes the response.

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
      "tiermultiplier": 10,
      "monthlypriceusd": 90,
      "monthlycredits": 2250,
      "extracredits": 2000,
      "usedcredits": 1450,
      "creditperiod": "2026-05",
      "creditsyncat": 1714694410,
      "status": 4,
      "pinned": true,
      "teamsessionmode": "",
      "setuprequired": false,
      "subscription": {
        "plan": "agent",
        "status": "active",
        "amount": 90,
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
        "tiermultiplier": 10,
        "tiers": {
          "starter": { "priceUsd": 9,  "credits": 225 },
          "pro":     { "priceUsd": 90, "credits": 2250 }
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

Returns the latest message GUID per pinned agent. Compare each `lastmessageguid` against the last value you saw client-side to draw an unread badge — same pattern the Wiro dashboard uses for its global header.

##### Response

```json
{
  "result": true,
  "errors": [],
  "data": [
    { "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321", "lastmessageguid": "5c41dabf-f2be-4aa8-a5a4-8c9e3d2f3f11" },
    { "useragentguid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890", "lastmessageguid": null }
  ]
}
```

### Voice & Realtime

Endpoints for browser-based realtime voice sessions plus the unified call history for both Web and Twilio channels. Per-channel setup, JWT contracts, and the WebSocket protocol live on the dedicated pages:

| Operation | Endpoint |
|-----------|----------|
| Start a browser realtime voice session | `POST /UserAgent/Realtime/WebStart` — see [Web Voice](/docs/integration-webvoice-skills) |
| Cancel a pending realtime session | `POST /UserAgent/Realtime/Cancel` — see [Web Voice — Step 3](/docs/integration-webvoice-skills#step-3-optional-cancel-a-stale-session--post-useragentrealtimecancel) |
| List recent realtime call sessions | `POST /UserAgent/TwilioCallHistory/List` — see [Twilio Voice — Call History](/docs/integration-twiliovoice-skills#call-history) (returns Twilio **and** Web channel sessions despite the Twilio-named path). |

#### **POST** /UserAgent/Realtime/WebStart

Starts a browser-embedded realtime voice session with the agent. Returns a short-lived JWT (5 min) and the WebSocket URL the browser opens to stream microphone audio. The browser presents the JWT as the first WS message (`{ type: "session_start", sessionToken }`); the WebSocket path itself doesn't carry the sessionId.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Useragent must be in `status: 4` and have `util-web-channel` enabled (Voice Receptionist / Voice Sales Rep presets enable it by default; toggle it on custom builds via `SkillsApply`). |
| `session_metadata.page_url` | string | No | Page URL the caller opened the mic from (≤ 2048 chars). Echoed back on Call History. |
| `session_metadata.display_identifier` | string | No | Operator-supplied display name. 1–100 chars, Unicode letters / numbers / spaces / `@ . _ - ' +`; other characters silently dropped. |

##### Response

```json
{
  "result": true,
  "errors": [],
  "sessionId": "vws-9d2d4b6e-3f6b-4c1a-8a7e-1f5a0b2c3d4e",
  "wsUrl": "wss://socket.wiro.ai/v1/AgentRealtime/Web",
  "sessionToken": "<5-min HS256 JWT>",
  "expiresAt": 1748212800000,
  "estimatedReadyMs": 8000
}
```

- **Auth** — same Bearer / API key path as every other `UserAgent/*` endpoint. Bearer requests additionally enforce an Origin allow-list (`https://wiro.ai`, `https://www.wiro.ai`, plus `http://localhost:*` in non-production); API-key requests skip the Origin check.
- **Rate limit** — fixed 60 sessions/hour per operator (hashed key — raw uuid never logged). Override with `AGENT_WEB_REALTIME_RATE_LIMIT_PER_HOUR`. Fast-fail sessions are decremented back from the counter.
- **Full WebSocket protocol, control frames, and JS snippet** — [Web Voice](/docs/integration-webvoice-skills).

##### Common errors

| Error | When |
|-------|------|
| `useragentguid required` | Missing useragent reference. |
| `Agent is not running` | Useragent is not in `status: 4`. |
| `util-web-channel not enabled` | Toggle the skill via `SkillsApply` (custom builds) or pick a preset that bundles it. |
| `web voice only available from Wiro-Web (Bearer auth) or via API key` | Bearer auth with an Origin outside the allow-list. |
| `Rate limit: max N web voice sessions per hour` | Operator burned through the per-hour cap. |

#### **POST** /UserAgent/Realtime/Cancel

Cancels a `WebStart`-initiated session **before the WebSocket handshake**. Use it when the browser can't progress past the mic-permission prompt, or the user changes their mind. Idempotent — repeated calls return the same shape.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sessionId` | string | Yes | The `sessionId` returned by `WebStart`. |
| `sessionToken` | string | Yes | The same JWT `WebStart` returned. Proves the caller actually owns this `sessionId` — the server verifies the signature and checks `payload.sessionId === body.sessionId`. |

##### Response

```json
{ "result": true, "sessionId": "vws-9d2d4b6e-...", "cancelled": true }
```

| HTTP | Error |
|------|-------|
| 400 | `sessionId and sessionToken required` |
| 401 | `invalid token` (signature mismatch, expired, malformed) |
| 403 | `sessionId mismatch` (JWT claim doesn't match body) |

> Without this call, the server-side agent prep `WebStart` kicked off lingers for ~5 minutes (the fallback cleanup guard) before being released — calling `Cancel` immediately frees the prep state and releases the held realtime session slot.

#### **POST** /UserAgent/TwilioCallHistory/List

Returns the last N realtime voice sessions for a useragent — **both Twilio and Web channels** despite the Twilio-named path, since they share the same `agentmessages.metadata.type` realtime_session prefix. Owner / team-member access only.

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
      "messageguid": "5c41dabf-f2be-4aa8-a5a4-8c9e3d2f3f11",
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
      "messageguid": "9d11baa2-7ce8-44b7-a3e0-2f8a31f6c4ee",
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
| `messageguid` | string | The `agentmessages.guid` row that holds this call. Use it with `Message/Detail` for the full transcript. |
| `agenttoken` | string | Useragent token. Same value across all rows for a given agent. |
| `channel` | `"twilio"` \| `"web"` | Which voice surface served the call. |
| `callsid` | string | Twilio Call SID for `channel: "twilio"`; the internal session id (`voice-call-*`) for `channel: "web"`. |
| `callerInfo` | object | Twilio rows: `{ number, country }` (E.164 + ISO-2). Web rows: `{ page_url, display_identifier? }` — `display_identifier` is only present when the embedding page validated a phone-style identifier; `page_url` is the page hosting the widget. |
| `callerProfile` | string \| null | Free-text persona summary written by the prep step (`prepSummary`). `null` when the bridge hasn't finished prep yet. |
| `status` | string | `realtime_session_incoming` (call accepted, prep in flight) → `realtime_session_active` (audio flowing) → `realtime_session` (completed normally) or `realtime_session_rejected` (rejected before active state, with `metadata.reason`). |
| `endReason` | string \| null | Set on `realtime_session` rows only. One of: `wiro_completed`, `wiro_cancelled`, `wiro_disconnect`, `wiro_error`, `twilio_disconnect`, `browser_disconnect`, `max_duration`. `null` while the call is still in flight or rejected. |
| `durationSeconds` | number \| null | Total elapsed seconds. `null` until end. |
| `modelSlug` | string \| null | Realtime model slug used for this call (e.g. `gpt-realtime-mini`). |
| `startedAt` / `endedAt` | number \| null | Unix epoch ms. `endedAt` stays `null` until the call finishes or is rejected. |

Rows are returned newest-first. Rejected sessions (`realtime_session_rejected`) are intermixed and carry `metadata.reason` — visible by reading the same `messageguid` via `Message/Detail` — with values: `concurrent_limit`, `agent_prep_timeout`, `realtime_ws_open_failed`, `realtime_stream_timeout`. Full field reference: [Twilio Voice — Call History](/docs/integration-twiliovoice-skills#call-history).

### Extra Credit Packs

Pro-tier instances can buy additional credits at any time. Pack catalogs are derived per-useragent (5x / 10x / 20x of the instance's monthly allocation), so the catalog auto-scales when the user upgrades from Starter → Pro or toggles paid skills.

The catalog appears at `agent.extracreditpacks` on `UserAgent/Detail`:

```json
"extracreditpacks": [
  { "packkey": "small",  "credits": 11250, "priceusd": 450,  "enabled": true },
  { "packkey": "medium", "credits": 22500, "priceusd": 900,  "enabled": true },
  { "packkey": "large",  "credits": 45000, "priceusd": 1800, "enabled": true }
]
```

Each pack carries:

| Field | Type | Description |
|-------|------|-------------|
| `packkey` | string | The pack identifier — `"small"`, `"medium"`, or `"large"`. Pass this as `pack` in `POST /UserAgent/CreateExtraCreditCheckout`. |
| `credits` | number | Credit amount this pack adds when purchased. |
| `priceusd` | number | Pack price in USD (debited from the wallet on purchase). |
| `enabled` | boolean | Whether the pack is currently purchasable. The list is server-filtered to enabled packs, so every entry here is `true`. |

#### **POST** /UserAgent/CreateExtraCreditCheckout

Purchases additional credits for a useragent. The wallet is debited the pack price and credits are added to the instance immediately.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Your UserAgent instance guid |
| `pack` | string | Yes | Pack key from `agent.extracreditpacks[].key` — `"small"`, `"medium"`, or `"large"`. |
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

Schedules the subscription to end at the current billing period's expiry — a **cancel-at-period-end** pattern. The agent keeps running with the full plan allowance until that moment. No wallet refund is issued for the remaining days; you're paying for the full period up front.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `guid` | string | Yes | Your UserAgent instance guid |

**Headers:** Pass `teamGUID: <team-guid>` when the target agent belongs to a team project (the endpoint validates team context explicitly for all billing mutations).

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
- To reverse the cancellation **before** the period ends, call `POST /UserAgent/RenewSubscription` — it clears the flag without charging the wallet again.
- When the period actually ends, the daily cron marks the subscription `"expired"` and stops the agent (`status: 0`). At that point the user must call `POST /UserAgent/RenewSubscription` (or `CreateSubscriptionCheckout` for a fresh sub) to continue.

**Common errors:**

| Error | When |
|-------|------|
| `No active subscription found for this agent` | `status != "active"` on the subscription row |
| `User agent not found` | Caller doesn't own the useragent and isn't a team admin |

#### **POST** /UserAgent/UpgradeTier

Upgrades the active subscription from **Starter → Pro**. The capability surface stays the same; the tier change just scales the credit pool and price by `tiermultiplier`.

**Upgrade-only.** Pro → Starter downgrades are rejected with an explicit error — cancel and redeploy at the lower tier instead.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `guid` | string | Yes | Your UserAgent instance guid |
| `targetTier` | string | Yes | Must be `"pro"` (`"starter"` is rejected with the downgrade error). The parameter name is `targetTier` — passing it as `tier` returns `"targetTier must be 'starter' or 'pro'"` instead of being silently coerced. |

**Headers:** Pass `teamGUID: <team-guid>` when the target agent belongs to a team project.

API-deployed agents always upgrade through the prepaid path. The endpoint debits the prorated upgrade fee `Math.max(0, ((P_pro − P_starter) / totalDays) × remainingDays)` from your wallet synchronously, updates the subscription row + useragent snapshot to Pro pricing / credits inline, and restarts the daemon to refresh `settings.json`. Existing extra credits and `usedcredits` are preserved.

##### Response

```json
{
  "result": true,
  "tier": "pro",
  "previousTier": "starter",
  "newPriceUsd": 90,
  "newMonthlyCredits": 2250,
  "proratedCharge": 45.90,
  "errors": []
}
```

#### **POST** /UserAgent/RenewSubscription

Two distinct operations share this endpoint depending on the subscription's current state:

1. **Undo-cancel** — active subscription with `pendingdowngrade: "cancel"` → clears the flag, **no wallet charge**.
2. **Renew** — subscription in `"expired"` status → creates a brand-new 30-day subscription, charges the wallet for the full plan price, resets the useragent to `status: 0` (Stopped).

The endpoint inspects the current subscription state and picks the right operation; the caller doesn't choose.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `guid` | string | Yes | Your UserAgent instance guid |

**Headers:** Pass `teamGUID: <team-guid>` when the target agent belongs to a team project.

> Renewal pricing is **snapshot-driven** — `monthlypriceusd` and `monthlycredits` are read straight off the useragent row (last touched by `Deploy`, `SkillsApply`, or `UpgradeTier`). Skill-registry weight changes between renewals do **not** propagate; the user keeps the price they last agreed to. To pick up new pricing, the user must explicitly call `SkillsApply` or `UpgradeTier` (both re-snapshot in the same transaction).

##### Response — undo-cancel

Called while the subscription is still `"active"` with a pending cancel flag set by `CancelSubscription`:

```json
{
  "result": true,
  "action": "undo-cancel",
  "errors": []
}
```

- Clears `subscription.pendingdowngrade` back to `null`.
- **No wallet charge** — you've already paid for the full period.
- Agent status is unchanged (still running / stopped / whatever it was).

##### Response — renew

Called after the subscription has expired (daily cron flipped it to `status: "expired"` and stopped the agent). The renewal rolls the existing expired subscription forward into a fresh 30-day `active` row instead of inserting a new one:

```json
{
  "result": true,
  "action": "renewed",
  "plan": "agent",
  "amount": 9,
  "monthlycredits": 225,
  "errors": []
}
```

- Updates the `subscriptions` row in place: `status: "active"`, `type: "renewal"`, `currentperiodstart: now`, `currentperiodend: now + 30 days`, `pendingdowngrade: null`.
- Debits `amount` (the snapshot `monthlypriceusd`) from the wallet (caller's personal wallet, or the agent's team wallet if the agent is team-scoped).
- Zeroes `usedcredits` and stamps the new `creditperiod`. Existing extra credits are preserved.
- If the agent was in `status: 0` (Stopped) or `5` (Error), it's auto-queued back to `2` (Queued) — the daemon picks it up on the next cycle, no extra `Start` call needed. Statuses `1`/`2`/`3`/`4` are mid-flight and the daemon settles them on its own.

**Common errors:**

| Error | When |
|-------|------|
| `Subscription is already active` | Called on an active subscription with **no** pending cancel (nothing to do) |
| `No expired subscription found to renew` | No active sub and no expired sub — agent was never subscribed, or data is gone |
| `Renewal pricing must be greater than $0. Add at least one paid skill or set agent base price.` | The persisted `monthlypriceusd` snapshot is $0 (custom build with all-free skills); add a paid skill via `SkillsApply` before renewing |
| `Insufficient wallet balance. Required: $X.XX, Available: $Y.YY` | Wallet (personal or team) can't cover the renewal price |

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
| **Tier price** | `agent.tiers.{starter,pro}.price` | Snapshotted on the useragent at deploy as `monthlypriceusd`. Pro = Starter × `tiermultiplier`. |
| **Monthly credits** | `agent.tiers.{starter,pro}.credits` | Snapshotted on the useragent at deploy as `monthlycredits`. Pro = Starter × `tiermultiplier`. |
| **Per-turn token cost** | `tokenRates` (per-model) | Each chat / cron / voice-prep turn deducts credits metered by the tokens its model consumes (1 credit = $0.01). Tier-independent — Pro just buys a larger monthly credit pool. |
| **Tier multiplier** | `agent.tiermultiplier` | Default `10`. Snapshotted on the useragent at deploy so admin tweaks don't retroactively change live instances (existing instances keep the multiplier they were deployed under). |
| **Extra credit packs** | `agent.extracreditpacks[]` | Per-useragent — derived as 5x / 10x / 20x of `monthlycredits`. Pro tier only (Starter has empty array). |

### Payment Method

All API subscriptions use your **prepaid wallet balance**. The cost is deducted immediately when you deploy, renew, upgrade, or buy an extra credit pack. Always pass `useprepaid: true` on `Deploy`, `CreateSubscriptionCheckout`, and `CreateExtraCreditCheckout` — that's the only path designed for API consumers. Make sure your wallet balance covers the upfront tier price before calling these endpoints; otherwise you'll get an `Insufficient wallet balance` error.

### Credit Consumption

Credits are consumed by the agent runtime (container) as it processes messages and generates content — not at `Message/Send` time. Each turn is billed by **token usage**: the runtime reports the input / output / cached token counts once the turn completes, Wiro meters them against the per-model `tokenRates` (1 credit = $0.01), writes an `action: "tokens"` deduct row, bumps `usedcredits`, and derives the live `remainingcredits = max(0, monthlycredits + extracredits - usedcredits)`. You don't send anything — token billing is fully server-side. Per-turn token counts and cost also ride on each assistant message and arrive over the message WebSocket as an `agent_usage_report` frame (see [Agent Messaging](/docs/agent-messaging) and [Agent WebSocket](/docs/agent-websocket)).

The API-side check is gating only: `POST /UserAgent/Start` and `POST /UserAgent/Message/Send` refuse to launch / accept messages when `remainingcredits <= 0`, returning an `Agent has no remaining credits…` error plus an `agentbalance` snapshot (`{ monthlycredits, extracredits, usedcredits, remainingcredits }`). During an active session, monthly credits are consumed first; once `usedcredits >= monthlycredits`, extra credits (purchased via `CreateExtraCreditCheckout`) absorb the rest. When both pools are empty the agent stops accepting new turns until the subscription renews or an extra credit pack is bought.

On each billing cycle (subscription renewal) `usedcredits` is reset to zero and `creditperiod` advances to the new `'YYYY-MM'` window; extra-credit purchases simply bump `extracredits` without resetting usage.

For the full audit trail (every token deduct / grant / purchase / renewal / expiry) call [`POST /UserAgent/TransactionList`](/docs/agent-transactions#post-useragenttransactionlist) — see [Agent Transactions](/docs/agent-transactions).

## Error Messages

Agent-specific errors you may encounter:

| Error | When |
|-------|------|
| `Agent not found` | The `agentguid` or `slug` does not match any catalog agent |
| `User agent not found` | The `guid` does not match any of your deployed instances |
| `Agent not found or inactive` | The catalog agent exists but is disabled |
| `Subscription price must be greater than $0. Add at least one paid skill or set agent base price.` | Custom build with a $0 skill set — toggle on at least one paid skill |
| `Agent is already running` | Start called on an agent with status `3` or `4` |
| `Agent is already queued to start` | Start called on an agent with status `2` |
| `Agent is already stopped` | Stop called on an agent with status `0` |
| `Agent is currently stopping, please wait` | Start called on an agent with status `1` |
| `Agent is in error state, use Start to retry` | Stop called on an agent with status `5` |
| `Duplicate deploy: an identical agent ("<title>") was already deployed Ns ago. Open the existing one in your panel, or wait a few seconds and retry.` | `Deploy` called a second time within 10s for the same `(uuid, agentid, teamguid)` tuple (custom builds: `(uuid, title, teamguid)`). Carries `errors[0].code: 99` and a top-level `existingUserAgentGuid` field. |
| `Agent setup is not complete. Please fill in your credentials before starting.` | Status is `6` — call `CredentialUpsert` / `SkillsApply` / `CustomSkillUpsert` to provide required values |
| `Subscription required — please subscribe to this agent before starting it.` | `Start` called on a row with no active subscription AND no spendable extras (`extracredits - usedcredits ≤ 0`). Most often hit after a subscription expires with empty extras — call `RenewSubscription` (`useprepaid: true`) to continue. Admin-role callers bypass this guard. |
| `No credits available. Please renew your subscription or purchase extra credits.` | Monthly and extra credits are both exhausted |
| `Cannot edit skills on a template agent — only custom-built agents support skill editing.` | `SkillsApply` called on a template-deploy useragent (returned with error code `100`). Skills are inherited from the template — to change them, deploy a custom build (`Deploy` with `custom: true`) instead. |
| `Subscription already active for this useragent. Cancel or modify the existing subscription instead.` | `CreateSubscriptionCheckout` called when a sub already exists |
| `Insufficient wallet balance for proration. Required: $X.XX, available: $Y.YY` | `SkillsApply` — wallet can't cover the prorated charge |
| `targetTier must be 'starter' or 'pro'` | `UpgradeTier` with a `targetTier` outside the closed enum (typos, missing parameter name, etc.). Unlike `Deploy`'s silent coercion, `UpgradeTier` rejects invalid input explicitly. |
| `Downgrading to Starter is not supported. /UserAgent/UpgradeTier is upgrade-only (Starter → Pro).` | `UpgradeTier` with `targetTier: "starter"` |
| `Already on {tier} tier` | `UpgradeTier` when current tier matches the target — no-op |
| `No active subscription — use /UserAgent/CreateSubscriptionCheckout to subscribe at the chosen tier` | `UpgradeTier` called without an active sub |
| `Failed to compute target-tier pricing` | `UpgradeTier` — pricing resolver returned null (skill registry inconsistency) |
| `Insufficient wallet balance. Required: $X.XX, Available: $Y.YY` | `UpgradeTier` — wallet can't cover the prorated upgrade charge |
| `Wallet deduction failed: {error}` | `UpgradeTier` — wallet write itself failed (rare; transient backend error) |
| `Agent not found or access denied` | Message endpoint with invalid useragentguid |
| `Agent is not running. Current status: {n}` | `Message/Send` when not running. Response includes `agentstatus` (the integer) so the FE can branch. |
| `Agent has no remaining credits. Renew your subscription or buy a credit pack to continue.` | `Message/Send` while `remainingcredits <= 0`. Response includes `agentbalance` for the FE to render a "Buy credits" CTA. |
| `Message not found` | `Detail` / `Cancel` with invalid messageguid |
| `Message cannot be cancelled (status: {status})` | `Cancel` on a message that's already in a terminal state |
| `Invalid redirect URL` | OAuth `Connect` with non-HTTPS URL |
| `Pack key required` | `CreateExtraCreditCheckout` without `pack` |
| `Could not retrieve wallet balance` | Wallet service lookup failed while checking balance |

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
    "skills": { "int-gmail-check": true, "int-telegram-post": true, "int-wiro-aimodels": true }
  }'

# Live pricing preview before committing a skill change
curl -X POST "https://api.wiro.ai/v1/UserAgent/PricingPreview" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
    "skillOverrides": { "int-twitterx-post": true }
  }'

# Cancel a subscription (cancels at end of billing period)
curl -X POST "https://api.wiro.ai/v1/UserAgent/CancelSubscription" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{"guid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321"}'

# Upgrade Starter → Pro (prepaid, prorated charge)
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
    print(f"{agent['title']} ({agent['slug']}) — Starter ${agent['tiers']['starter']['price']}/mo")

# Get agent details by slug
detail = requests.post(
    "https://api.wiro.ai/v1/Agent/Detail",
    json={"slug": "instagram-manager"}
).json()
agent = detail["agents"][0]
print(f"Credentials needed: {list(agent['credentials'].keys())}")

# Deploy a new instance (prepaid wallet, Starter tier)
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

# Upgrade Starter → Pro (prorated, debited from wallet)
requests.post(
    "https://api.wiro.ai/v1/UserAgent/UpgradeTier",
    headers=headers,
    json={"guid": instance_guid, "targetTier": "pro"}
)

# Buy extra credits (Pro tier — prepaid wallet)
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
    print(f"{ua['title']} - status: {ua['status']} - tier: {ua.get('tier')}")

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
    console.log(`${a.title} (${a.slug}) — Starter $${a.tiers.starter.price}/mo`)
  );

  // Get agent details by slug
  const detail = await axios.post(
    'https://api.wiro.ai/v1/Agent/Detail',
    { slug: 'instagram-manager' }
  );
  const agent = detail.data.agents[0];

  // Deploy a new instance (prepaid wallet, Starter tier)
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

  // Upgrade Starter → Pro
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

// Deploy a new instance (prepaid wallet, Starter tier)
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

// Deploy a new instance (prepaid wallet, Starter tier)
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
    // Deploy a new instance (prepaid wallet, Starter tier)
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

- [Agent Builder](/docs/agent-builder) — Build custom agents from scratch (`custom: true`) with live pricing previews and skill picker
- [Agent Skills](/docs/agent-skills) — Configure preferences, scheduled tasks, and skill toggles. Includes the registry browser endpoints (`Skills/List`, `Skills/Detail`, `Skills/Capabilities`)
- [Agent Credentials](/docs/agent-credentials) — Integration catalog hub: 20+ dedicated per-provider setup guides (Meta Ads, Facebook, Instagram, LinkedIn, Twitter, and more) plus the registry endpoints (`Credentials/List`, `Credentials/Detail`)
- [Agent Messaging](/docs/agent-messaging) — Send messages and receive responses from running agents
- [Agent WebSocket](/docs/agent-websocket) — Real-time response streaming
- [Agent Webhooks](/docs/agent-webhooks) — Receive agent responses via HTTP callbacks
- [Agent Transactions](/docs/agent-transactions) — Per-instance credit ledger (deductions, renewals, purchases, grants, refunds)
- [Agent Logs](/docs/agent-logs) — Per-instance activity feed (tool calls, cron runs, message exchanges)
- [Authentication](/docs/authentication) — API key setup and authentication methods
