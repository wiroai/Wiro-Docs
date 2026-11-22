# Agent Builder

Build a custom agent from scratch: no marketplace template required. Pick your own skill set and a plan, deploy in one call, then connect the services it works with.

## Overview

Wiro's agent runtime supports two deploy paths:

| Path | When to use | Endpoint |
|------|-------------|----------|
| **Template deploy** | The marketplace already has an agent that does what you need (Instagram Manager, Push Notifications, App Review Support, …). You inherit the template's default skill set + configuration. | `POST /UserAgent/Deploy` with `agentguid` |
| **Custom build** | You want a unique combination: for example a research writer that searches the web with Serper, drafts posts on WordPress and reports to Telegram. No marketplace template fits. | `POST /UserAgent/Deploy` with `custom: true` |

The two paths produce the **same useragent shape** at the end (same `customskills`, `scheduledskills`, `credentials`, `subscription`, `tokenRates`, etc.), and both connect the services they work with the same way, after Deploy, through [Agent Connectors](/docs/agent-connectors). The only differences are:

| Aspect | Template deploy | Custom build |
|--------|-----------------|--------------|
| Linked marketplace template | The template you deployed | None |
| `agent.cover` on the response | Template's cover image | The `cover` you sent at Deploy (or a placeholder) |
| Cascade updates | When Wiro updates the template, your useragent reconciles | No template: the agent is fully owned by you |

Both paths are sold on the same three plans, Starter at $5, Pro at $30 and Max at $100 a month (see [Pricing Model](/docs/agent-overview#pricing-model-plans-credits-token-billing)), and the skills you pick never change the price.

> **Custom builds don't share a marketplace listing.** They are private to your account; nothing about a custom agent appears on `/Agent/List` or `/Agent/Detail`. Discovery happens through your own product surface.

## Step 1: Browse Available Skills

Custom builds start from the **skill registry**, the catalogue of every Skill the platform supports: rule sets, playbooks and keyless tools such as weather and diagrams. Browse it with [`POST /Skills/List`](/docs/agent-skills#post-skillslist) and inspect details with [`POST /Skills/Detail`](/docs/agent-skills#post-skillsdetail). The outside services the agent works with are connectors, which you pick from the [connector catalog](#step-1c-pick-the-connectors) and connect after Deploy.

Both endpoints are **public, so no authentication is required.**

```bash
# Browse every Skill
curl -X POST "https://api.wiro.ai/v1/Skills/List" \
  -H "Content-Type: application/json" \
  -d '{ "category": "util" }'
```

Pick the skill names you want to enable. Each skill descriptor tells you:

- `name`: the canonical skill key you'll send in `skills` / `skillOverrides`
- `category`: `util`, for every registry skill
- `credential_key`: which credential the skill needs, or `null` (most skills need none)
- `requires_credentials`: boolean, whether the user must supply a credential before the skill can run
- `depends_on`: array of skill names that must also be enabled (Wiro auto-enables transitive deps)
- `conflicts_with`: array of skill names that cannot coexist with this one
- `pricing`: `billing_model: "tokens"`; its `monthly_price_weight_usd` and `monthly_credits_weight` are `0` on every skill, since every plan includes every skill

> **Use [`POST /Skills/Capabilities`](/docs/agent-skills#post-skillscapabilities)** to discover the closed-set capability vocabulary (the high-level tasks skills can perform). Useful when you want to find every skill that can "post-content" or "send-email".

## Step 1b: Discover Communication Channels

The same `POST /Skills/List` response also includes a top-level `channels[]`
catalog. Channel discovery is registry-driven and does not depend on which
marketplace template you deploy.

```json
{
  "result": true,
  "channels": [
    {
      "id": "telegram",
      "credential_key": "telegram",
      "title": "Telegram",
      "required_fields": ["bottoken", "allowedusers"],
      "capabilities": {
        "direct": true,
        "rooms": true,
        "threads": true,
        "roles": false,
        "command_menu": true
      },
      "credential": {
        "key": "telegram",
        "credential_schema": ["..."]
      }
    }
  ]
}
```

The current external channel IDs are `telegram`, `slack`, and `discord`.
`channels[]` is returned in full even when the request filters `skills[]`.
Render each channel's form from `credential.credential_schema` and use
`required_fields` to decide which values must be present before the operator can
connect it. A channel activates automatically when every required value is
complete.

Web chat and the Messaging API are always available. External channels have no
separate enablement parameter: pass a complete channel group in Deploy's
`credentials` object, or add it later with
`POST /UserAgent/CredentialUpsert`. The channel activates automatically when
all `required_fields` are complete. Channels do not add skills or change agent
pricing.

## Step 1c: Pick the Connectors

The services the agent works with are connectors from the public catalog: [`POST /AgentConnector/List`](/docs/agent-connectors#post-agentconnectorlist), no API key needed. Each row shows its Connect fields (`credentialfields`), whether it signs in with the vendor (`authtype` `provider-oauth` or `oauth`), its account pickers and its tools.

```bash
curl -X POST "https://api.wiro.ai/v1/AgentConnector/List" \
  -H "Content-Type: application/json" \
  -d '{ "search": "wordpress" }'
```

Connectors are not part of Deploy and don't change the price: you connect them to the deployed agent in [Step 3b](#step-3b-connect-the-connectors).

## Step 2: Preview the Build

Before you commit, resolve the proposed skill set and see the plans with [`POST /UserAgent/PricingPreview`](/docs/agent-overview#post-useragentpricingpreview). The **draft** mode runs without touching any DB state.

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/PricingPreview" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "draft": true,
    "tier": "pro",
    "skills": ["util-anti-ai-human-copy", "util-chat-markdown-reporting"]
  }'
```

##### Response

```json
{
  "result": true,
  "errors": [],
  "tier": "pro",
  "totalPriceUsd": 30,
  "totalMonthlyCredits": 3000,
  "skillBreakdown": [
    { "skill": "util-anti-ai-human-copy",      "priceUsd": 0, "credits": 0, "billing_model": "tokens" },
    { "skill": "util-chat-markdown-reporting", "priceUsd": 0, "credits": 0, "billing_model": "tokens" }
  ],
  "enabledSkills": ["util-anti-ai-human-copy", "util-chat-markdown-reporting"],
  "directSkills":  ["util-anti-ai-human-copy", "util-chat-markdown-reporting"],
  "tokenRates": {
    "default_model": "openai/gpt-5.6-sol",
    "fallback_rate": { "input_per_1m": 625, "output_per_1m": 3750, "cached_input_per_1m": 62.5, "cache_write_per_1m": 781.25 },
    "models": {
      "openai/gpt-5.6-sol": { "input_per_1m": 625, "output_per_1m": 3750, "cached_input_per_1m": 62.5, "cache_write_per_1m": 781.25, "selectable": true, "label": "GPT-5.6 Sol", "tier": "premium" },
      "openai/gpt-5.6-terra": { "input_per_1m": 250, "output_per_1m": 1500, "cached_input_per_1m": 25, "cache_write_per_1m": 312.5, "selectable": true, "label": "GPT-5.6 Terra", "tier": "balanced" },
      "openai/gpt-5.6-luna": { "input_per_1m": 25, "output_per_1m": 150, "cached_input_per_1m": 2.5, "cache_write_per_1m": 31.25, "selectable": true, "label": "GPT-5.6 Luna", "tier": "cheap" },
      "openai/gpt-5.5": { "input_per_1m": 625, "output_per_1m": 3750, "cached_input_per_1m": 62.5, "selectable": true, "label": "GPT-5.5", "tier": "premium" },
      "openai/gpt-5.4": { "input_per_1m": 312.5, "output_per_1m": 1875, "cached_input_per_1m": 31.25, "selectable": true, "label": "GPT-5.4", "tier": "balanced" }
    }
  },
  "tiers": {
    "starter": { "priceUsd": 5,   "credits": 500 },
    "pro":     { "priceUsd": 30,  "credits": 3000 },
    "max":     { "priceUsd": 100, "credits": 10000 }
  },
  "plans": [
    { "key": "starter", "title": "Starter", "priceUsd": 5,   "monthlyCredits": 500,   "diskMb": 250 },
    { "key": "pro",     "title": "Pro",     "priceUsd": 30,  "monthlyCredits": 3000,  "diskMb": 500 },
    { "key": "max",     "title": "Max",     "priceUsd": 100, "monthlyCredits": 10000, "diskMb": 1024 }
  ]
}
```

Read the response:

- `tiers` → the three plans: what your wallet is charged each month and the credits each one grants. The skills don't change these numbers.
- `plans` → the same three plans as a list with their names (`key`, `title`, `priceUsd`, `monthlyCredits`) and their disk space in MB (`diskMb`).
- `totalPriceUsd` and `totalMonthlyCredits` → the plan you passed in `tier`.
- `tokenRates` → per-model token rates (credits per 1M input / output / cached-input tokens). Each conversation turn is metered against these (see [token billing](/docs/agent-overview#token-billing)).
- `skillBreakdown[]` → each skill with `priceUsd: 0`, since every plan includes every skill.
- `enabledSkills` → final closure (includes any transitively-enabled `depends_on`).

> **The plan sets the price.** A custom build pays its plan's price whatever skills it has: $5 a month with 500 credits on Starter, $30 with 3,000 on Pro, $100 with 10,000 on Max. Per-turn conversation cost is metered separately against the agent's `tokenRates` (see [token billing](/docs/agent-overview#token-billing)).

## Step 3: Deploy the Custom Agent

Send the same skill set you previewed to `POST /UserAgent/Deploy` with `custom: true` and `useprepaid: true`. The price of the plan you pass in `tier` is debited immediately.

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Deploy" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "custom": true,
    "title": "Research Writer",
    "description": "Researches a topic with Serper every Monday, drafts a WordPress post and reports to Telegram.",
    "useprepaid": true,
    "tier": "pro",
    "skills": {
      "util-anti-ai-human-copy":      true,
      "util-chat-markdown-reporting": true
    },
    "credentials": {
      "telegram": {
        "bottoken": "123456:ABC-DEF...",
        "allowedusers": ["123456789"]
      }
    },
    "customskills": [
      {
        "key": "cs-cron-weekly-research",
        "value": "Every Monday, research this week's topic with serper__web_search, write a 600-word article, save it as a WordPress draft with the WordPress connector's tools (wordpress__*), and post the draft link to Telegram.",
        "interval": "0 9 * * 1",
        "enabled": true,
        "_user_created": true,
        "description": "Weekly research and draft"
      }
    ]
  }'
```

##### Response (excerpt)

```json
{
  "result": true,
  "errors": [],
  "useragents": [
    {
      "guid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
      "agentguid": null,
      "title": "Research Writer",
      "description": "Researches a topic with Serper every Monday, drafts a WordPress post and reports to Telegram.",
      "tier": "pro",
      "status": 2,
      "setuprequired": false,
      "monthlycredits": 3000,
      "monthlypriceusd": 30,
      "remainingcredits": 3000,
      "renewalcredits": 3000,
      "creditperiod": "2026-05",
      "tokenRates": {
        "default_model": "openai/gpt-5.6-sol",
        "fallback_rate": { "input_per_1m": 625, "output_per_1m": 3750, "cached_input_per_1m": 62.5, "cache_write_per_1m": 781.25 },
        "models": {
          "openai/gpt-5.6-sol": { "input_per_1m": 625, "output_per_1m": 3750, "cached_input_per_1m": 62.5, "cache_write_per_1m": 781.25, "selectable": true, "label": "GPT-5.6 Sol", "tier": "premium" },
          "openai/gpt-5.6-terra": { "input_per_1m": 250, "output_per_1m": 1500, "cached_input_per_1m": 25, "cache_write_per_1m": 312.5, "selectable": true, "label": "GPT-5.6 Terra", "tier": "balanced" },
          "openai/gpt-5.6-luna": { "input_per_1m": 25, "output_per_1m": 150, "cached_input_per_1m": 2.5, "cache_write_per_1m": 31.25, "selectable": true, "label": "GPT-5.6 Luna", "tier": "cheap" },
          "openai/gpt-5.5": { "input_per_1m": 625, "output_per_1m": 3750, "cached_input_per_1m": 62.5, "selectable": true, "label": "GPT-5.5", "tier": "premium" },
          "openai/gpt-5.4": { "input_per_1m": 312.5, "output_per_1m": 1875, "cached_input_per_1m": 31.25, "selectable": true, "label": "GPT-5.4", "tier": "balanced" }
        }
      },
      "agentModel": {
        "chatModel": "openai/gpt-5.6-sol",
        "cronModel": "openai/gpt-5.4-mini",
        "voicePrepModel": "openai/gpt-5.4-mini",
        "voicePostcallModel": "openai/gpt-5.4"
      },
      "skills": ["util-anti-ai-human-copy", "util-chat-markdown-reporting"],
      "customskills": [],
      "scheduledskills": [
        {
          "key": "cs-cron-weekly-research",
          "value": "Every Monday, research this week's topic with serper__web_search, write a 600-word article, save it as a WordPress draft with the WordPress connector's tools (wordpress__*), and post the draft link to Telegram.",
          "interval": "0 9 * * 1",
          "enabled": true,
          "_source": "user-created",
          "_editable": true,
          "_user_created": true
        }
      ],
      "communicationChannels": [
        { "id": "telegram", "credentialkey": "telegram", "title": "Telegram", "required_fields": ["bottoken", "allowedusers"], "enabled": true, "configured": true, "missingfields": [] }
      ],
      "enabledChannels": ["telegram"],
      "teamsessionmode": "private",
      "credentials": {
        "telegram": { "_connected": false, "optional": false, "extra": false, "bottoken": "••••••••", "allowedusers": ["123456789"] }
      },
      "agent": {
        "custom": true,
        "title": "Research Writer",
        "tiers": {
          "starter": { "priceUsd": 5,   "credits": 500 },
          "pro":     { "priceUsd": 30,  "credits": 3000 },
          "max":     { "priceUsd": 100, "credits": 10000 }
        },
        "plans": [
          { "key": "starter", "title": "Starter", "priceUsd": 5,   "monthlyCredits": 500,   "diskMb": 250 },
          { "key": "pro",     "title": "Pro",     "priceUsd": 30,  "monthlyCredits": 3000,  "diskMb": 500 },
          { "key": "max",     "title": "Max",     "priceUsd": 100, "monthlyCredits": 10000, "diskMb": 1024 }
        ],
        "extracreditpacks": [
          { "packkey": "small",  "credits": 1000,  "priceusd": 10,  "enabled": true },
          { "packkey": "medium", "credits": 5000,  "priceusd": 50,  "enabled": true },
          { "packkey": "large",  "credits": 20000, "priceusd": 200, "enabled": true }
        ]
      }
    }
  ]
}
```

Notes on the response:

- `agentguid: null` confirms this is a custom build with no marketplace template.
- `agent.custom: true` is the synthesized template placeholder. Same shape as a template's `agent` block but no `slug` / `cover` / `categories` (custom builds aren't in the marketplace).
- `scheduledskills` already contains the cron from the Deploy body. Deploy stores each `customskills` key in its full form, as `CustomSkillUpsert` does: a bare slug with an `interval` becomes `cs-cron-<slug>`, one without becomes `cs-<slug>`, and a key that isn't a slug fails the deploy before anything is created or charged.
- `status: 2` means Deploy auto-queued the instance because `useprepaid: true` provisioned a subscription in the same call. Wiro starts the agent from the queue; you do **not** need to call `POST /UserAgent/Start` after a prepaid deploy.
- Communication-channel credentials are validated independently from `skills`. Every channel group present in `credentials` must contain all of its `required_fields` or Deploy fails without leaving a partial agent behind.
- The Telegram bot token you sent comes back as `"••••••••"`: like `UserAgent/Detail`, the response shows a saved secret only as the mask.

## Step 3b: Connect the Connectors

Connect each service to the new agent with [`POST /UserAgent/ConnectorConnect`](/docs/agent-connectors#post-useragentconnectorconnect), with your customer's own credentials. Serper and WordPress take fields:

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/ConnectorConnect" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
    "slug": "serper",
    "values": { "apikey": "YOUR_SERPER_API_KEY" }
  }'

curl -X POST "https://api.wiro.ai/v1/UserAgent/ConnectorConnect" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
    "slug": "wordpress",
    "values": { "url": "https://blog.example.com", "user": "admin", "apppassword": "xxxx xxxx xxxx xxxx" }
  }'
```

Each answers `status: "connected"` and restarts the running agent, which then has the connector's tools (`serper__web_search`, `wordpress__*`) that the scheduled task above names. A connector that signs in with its vendor answers an `authorizeUrl` instead: see [Connect with a sign-in](/docs/agent-connectors#connect-with-a-sign-in). Check every connection with [`POST /UserAgent/ConnectorList`](/docs/agent-connectors#post-useragentconnectorlist).

## Step 4: Refine Skills After Deploy

Toggle skills on/off after deploy with [`POST /UserAgent/SkillsApply`](/docs/agent-overview#post-useragentskillsapply). Even when you only want to flip a single skill, send it as a one-entry `skills` map. The endpoint triggers exactly one agent restart, applies the whole batch or none of it, and never charges: every plan includes every skill, so the price and the credits stay the same. Template deploys accept the same call.

### Single-skill enable

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/SkillsApply" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
    "idempotencyKey": "550e8400-e29b-41d4-a716-446655440001",
    "skills": {
      "util-weather": true
    }
  }'
```

The response confirms the skill set and the restart:

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
    "previousMonthlyCredits": 3000,
    "newMonthlyCredits": 3000,
    "deltaCredits": 0,
    "creditsNow": 0,
    "creditsThisPeriod": 3000,
    "creditsFromRenewal": 3000,
    "periodEnd": null,
    "stripeProrationApplied": false,
    "prepaidWalletDelta": null,
    "usedCreditsUsd": 0,
    "enabledSkills": ["util-anti-ai-human-copy", "util-chat-markdown-reporting", "util-weather"]
  }
}
```

`tier` stays the agent's plan: a skill change never moves it, and nothing is charged.

### Batch toggle in one call

When the user stages many toggles in your UI and commits them all together, send everything in one `SkillsApply` call:

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/SkillsApply" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
    "idempotencyKey": "550e8400-e29b-41d4-a716-446655440000",
    "skills": {
      "util-anti-ai-human-copy":      true,
      "util-chat-markdown-reporting": true,
      "util-weather":                 true,
      "util-diagram":                 false
    }
  }'
```

`idempotencyKey` is required: use a UUID per "user clicks Save" event. A retry of the same key returns the cached response without applying the change again. To change the plan, call [`UpgradeTier`](/docs/agent-overview#post-useragentupgradetier); `SkillsApply` refuses a `tier` other than the agent's current plan.

## Common Recipes

Each recipe is a Deploy body, followed by the connectors to connect once the agent exists.

### A. Telegram news digest

```json
{
  "custom": true,
  "title": "News Digest Bot",
  "useprepaid": true,
  "tier": "starter",
  "skills": { "util-chat-markdown-reporting": true },
  "credentials": {
    "telegram": { "bottoken": "123456:ABC-DEF...", "allowedusers": ["123456789"] }
  },
  "customskills": [
    {
      "key": "cs-cron-news-digest",
      "value": "Twice a day, search the news about our market with serper__web_search and post a five-line summary to Telegram.",
      "interval": "0 9,17 * * *",
      "enabled": true,
      "_user_created": true,
      "description": "Daily news digest"
    }
  ]
}
```

Then connect `serper` with its API key.

### B. WordPress publisher with weekly research

```json
{
  "custom": true,
  "title": "Blog Research & Publish",
  "useprepaid": true,
  "tier": "pro",
  "skills": { "util-anti-ai-human-copy": true },
  "credentials": {
    "var-website": { "urls": "[{\"websitename\":\"Wired\",\"url\":\"https://www.wired.com/feed/rss\"}]" }
  },
  "customskills": [
    {
      "key": "cs-content-strategy",
      "value": "## Writing Style\nShort, punchy, technical. Always include code examples.\n\n## Sources\nWired, ArsTechnica, Hacker News.\n\n## Cadence\nOne 600-word article every Monday.",
      "_user_created": false
    },
    {
      "key": "cs-cron-weekly-blog",
      "value": "Every Monday morning, scan the websites listed under your var-website credential, draft one 600-word article, and save it as a WordPress draft with the WordPress connector's tools.",
      "interval": "0 9 * * 1",
      "enabled": true,
      "_user_created": true,
      "description": "Weekly WordPress publish"
    }
  ]
}
```

Then connect `wordpress` with its site address, user name and application password.

### C. Multi-channel social poster

```json
{
  "custom": true,
  "title": "Cross-Channel Social",
  "useprepaid": true,
  "tier": "pro",
  "skills": {
    "util-social-posting-common": true,
    "util-anti-ai-human-copy":    true
  },
  "credentials": {}
}
```

Then connect `twitter`, `instagram`, `linkedin` and `facebook-pages`. Each signs in with its vendor, with an app of your own: [`ConnectorConnect`](/docs/agent-connectors#connect-with-a-sign-in) answers an `authorizeUrl` for your customer to open. X posts as the account that signed in. LinkedIn takes the id of its Company Page in the required `organizationid` field, sent with the sign-in, and posts as that Page or as the member who signed in. The Instagram accounts and Facebook Pages to post to are picked afterwards with [`ConnectorSetAccounts`](/docs/agent-connectors#post-useragentconnectorsetaccounts): see [Account Pickers](/docs/agent-connectors#account-pickers).

## Subscription & Billing for Custom Builds

Subscriptions for custom builds work exactly like template deploys:

- A 30-day prepaid subscription row (`plan: "agent"`, `tier: <starter|pro|max>`, `provider: "prepaid"`) is inserted at Deploy.
- `POST /UserAgent/CancelSubscription` schedules cancel-at-period-end.
- `POST /UserAgent/RenewSubscription` either undoes a pending cancel (no charge) or creates a fresh 30-day period (wallet charged).
- `POST /UserAgent/UpgradeTier` changes the plan: a higher plan starts now with a prorated wallet debit, a lower plan (sent with `allowDowngrade: true`) at the next renewal.

Turning a skill on or off never changes the subscription: the plan's price and credits stay the same (see Step 4 above).

## Limits & Notes

- **A build costs its plan's price, whatever its skills.** One skill or twenty, Starter is $5 a month with 500 credits, Pro $30 with 3,000 and Max $100 with 10,000.
- **Conflict / dependency violations are surfaced eagerly.** If you toggle on two mutually-exclusive skills, `SkillsApply` returns code `102` with a `conflicts[]` array; if a `depends_on` is missing, code `101` with `deps[]`. Resolve in the UI before committing.
- **Custom builds receive the same auto-restart on configuration changes** as template deploys (status `3`/`4` → status `1`, then re-queued).
- **Cover image:** custom builds can ship a `cover` URL in the Deploy body, or upload one later via [`POST /UserAgent/Cover`](/docs/agent-overview#post-useragentcover).
- **The agent's persona** is editable via the standard `customskills` flow. Add a `cs-persona` strategy via `CustomSkillUpsert` to set the agent's voice, role, and constraints.

## What's Next

- [Agent Connectors](/docs/agent-connectors): Connect the services the agent works with
- [Agent Skills](/docs/agent-skills): Discover the skill registry and configure preferences + scheduled tasks
- [Agent Credentials](/docs/agent-credentials): Channels, the Wiro project and settings
- [Agent Messaging](/docs/agent-messaging): Chat with your custom agent
- [Agent Transactions](/docs/agent-transactions): Audit credit deductions, renewals, and grants
