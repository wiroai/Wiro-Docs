# Agent Builder

Build a custom agent from scratch: no marketplace template required. Pick your own skill set and a plan, and deploy in one call.

## Overview

Wiro's agent runtime supports two deploy paths:

| Path | When to use | Endpoint |
|------|-------------|----------|
| **Template deploy** | The marketplace already has an agent that does what you need (Instagram Manager, Push Notifications, App Review Support, …). You inherit the template's default skill set + configuration. | `POST /UserAgent/Deploy` with `agentguid` |
| **Custom build** | You want a unique skill combination: for example a custom support bot that watches Gmail, publishes a daily digest to WordPress, and uses Wiro's image generator. No marketplace template fits. | `POST /UserAgent/Deploy` with `custom: true` |

The two paths produce the **same useragent shape** at the end (same `customskills`, `scheduledskills`, `credentials`, `subscription`, `tokenRates`, etc.). The only differences are:

| Aspect | Template deploy | Custom build |
|--------|-----------------|--------------|
| Linked marketplace template | The template you deployed | None |
| `agent.cover` on the response | Template's cover image | The `cover` you sent at Deploy (or a placeholder) |
| Cascade updates | When Wiro updates the template, your useragent reconciles | No template: the agent is fully owned by you |

Both paths are sold on the same three plans, Starter at $5, Pro at $30 and Max at $100 a month (see [Pricing Model](/docs/agent-overview#pricing-model-plans-credits-token-billing)), and the skills you pick never change the price.

> **Custom builds don't share a marketplace listing.** They are private to your account; nothing about a custom agent appears on `/Agent/List` or `/Agent/Detail`. Discovery happens through your own product surface.

## Step 1: Browse Available Skills

Custom builds start from the **skill registry**, the catalogue of every skill the platform supports. Browse it with [`POST /Skills/List`](/docs/agent-skills#post-skillslist) and inspect details with [`POST /Skills/Detail`](/docs/agent-skills#post-skillsdetail).

Both endpoints are **public, so no authentication is required.**

```bash
# Browse all integration skills
curl -X POST "https://api.wiro.ai/v1/Skills/List" \
  -H "Content-Type: application/json" \
  -d '{ "category": "int" }'
```

Pick the skill names you want to enable. Each skill descriptor tells you:

- `name`: the canonical skill key you'll send in `skills` / `skillOverrides`
- `category`: `int` (integration with a third-party service) or `util` (utility, no credential to connect)
- `credential_key`: which credential the skill needs (`null` for `util` or platform-managed skills)
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

## Step 2: Preview the Build

Before you commit, resolve the proposed skill set and see the plans with [`POST /UserAgent/PricingPreview`](/docs/agent-overview#post-useragentpricingpreview). The **draft** mode runs without touching any DB state.

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/PricingPreview" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "draft": true,
    "tier": "pro",
    "skills": ["int-gmail-check", "int-wordpress-post", "int-wiro-aimodels"]
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
    { "skill": "int-gmail-check",     "priceUsd": 0, "credits": 0, "billing_model": "tokens" },
    { "skill": "int-wordpress-post",  "priceUsd": 0, "credits": 0, "billing_model": "tokens" },
    { "skill": "int-wiro-aimodels",   "priceUsd": 0, "credits": 0, "billing_model": "tokens" }
  ],
  "enabledSkills": ["int-gmail-check", "int-wordpress-post", "int-wiro-aimodels"],
  "directSkills":  ["int-gmail-check", "int-wordpress-post", "int-wiro-aimodels"],
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
    { "key": "starter", "title": "Starter", "priceUsd": 5,   "monthlyCredits": 500 },
    { "key": "pro",     "title": "Pro",     "priceUsd": 30,  "monthlyCredits": 3000 },
    { "key": "max",     "title": "Max",     "priceUsd": 100, "monthlyCredits": 10000 }
  ]
}
```

Read the response:

- `tiers` → the three plans: what your wallet is charged each month and the credits each one grants. The skills don't change these numbers.
- `plans` → the same three plans as a list with their names (`key`, `title`, `priceUsd`, `monthlyCredits`).
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
    "title": "Inbox Watcher",
    "description": "Watches inbound Gmail and forwards a summary to Telegram every 4 hours.",
    "useprepaid": true,
    "tier": "pro",
    "skills": {
      "int-gmail-check":    true,
      "int-wordpress-post":  true,
      "int-wiro-aimodels": true
    },
    "credentials": {
      "gmail":    { "account": "agent@company.com", "apppassword": "xxxx xxxx xxxx xxxx" },
      "telegram": {
        "bottoken": "123456:ABC-DEF...",
        "allowedusers": ["123456789"]
      }
    },
    "customskills": [
      {
        "key": "cs-cron-summarize-inbox",
        "value": "Every 4 hours, scan all unread Gmail messages from the past 4 hours, summarize each in 1 sentence, and post the digest to Telegram.",
        "interval": "0 */4 * * *",
        "enabled": true,
        "_user_created": true,
        "description": "Inbox summary digest"
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
      "title": "Inbox Watcher",
      "description": "Watches inbound Gmail and forwards a summary to Telegram every 4 hours.",
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
      "skills": ["int-gmail-check", "int-wordpress-post", "int-wiro-aimodels"],
      "customskills": [],
      "scheduledskills": [
        {
          "key": "cs-cron-summarize-inbox",
          "value": "Every 4 hours, scan all unread Gmail messages from the past 4 hours, summarize each in 1 sentence, and post the digest to Telegram.",
          "interval": "0 */4 * * *",
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
        "gmail":    { "_connected": false, "optional": false, "extra": false, "account": "agent@company.com", "apppassword": "xxxx xxxx xxxx xxxx" },
        "telegram": { "_connected": false, "optional": false, "extra": false, "bottoken": "123456:ABC-DEF...", "allowedusers": ["123456789"] }
      },
      "agent": {
        "custom": true,
        "title": "Inbox Watcher",
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
      }
    }
  ]
}
```

Notes on the response:

- `agentguid: null` confirms this is a custom build with no marketplace template.
- `agent.custom: true` is the synthesized template placeholder. Same shape as a template's `agent` block but no `slug` / `cover` / `categories` (custom builds aren't in the marketplace).
- `scheduledskills` already contains the cron from the Deploy body. Deploy stores `customskills` keys exactly as sent, so give each entry its full key: `cs-<slug>` for a strategy, `cs-cron-<slug>` for a scheduled task.
- `status: 2` means Deploy auto-queued the instance because `useprepaid: true` provisioned a subscription in the same call. Wiro starts the agent from the queue; you do **not** need to call `POST /UserAgent/Start` after a prepaid deploy.
- Communication-channel credentials are validated independently from `skills`. Every channel group present in `credentials` must contain all of its `required_fields` or Deploy fails without leaving a partial agent behind.

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
      "int-instagram-post": true
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
  "pricing": {
    "enabledSkills": ["int-gmail-check", "int-wordpress-post", "int-wiro-aimodels", "int-instagram-post"]
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
      "int-gmail-check":     true,
      "int-wordpress-post":  true,
      "int-wiro-aimodels":  true,
      "int-instagram-post":  true,
      "int-metaads-manage":  false
    }
  }'
```

`idempotencyKey` is required: use a UUID per "user clicks Save" event. A retry of the same key returns the cached response without applying the change again. To change the plan, call [`UpgradeTier`](/docs/agent-overview#post-useragentupgradetier); `SkillsApply` refuses a `tier` other than the agent's current plan.

## Common Recipes

### A. Email-driven Telegram digest

```json
{
  "custom": true,
  "title": "Email Digest Bot",
  "useprepaid": true,
  "tier": "starter",
  "skills": { "int-gmail-check": true, "int-wordpress-post": true },
  "credentials": {
    "gmail":    { "account": "agent@company.com", "apppassword": "xxxx xxxx xxxx xxxx" },
    "telegram": { "bottoken": "123456:ABC-DEF...", "allowedusers": ["123456789"] }
  },
  "customskills": [
    {
      "key": "cs-cron-email-digest",
      "value": "Twice a day, summarize unread Gmail messages in one Telegram message.",
      "interval": "0 9,17 * * *",
      "enabled": true,
      "_user_created": true,
      "description": "Daily email digest"
    }
  ]
}
```

### B. WordPress publisher with weekly research

```json
{
  "custom": true,
  "title": "Blog Research & Publish",
  "useprepaid": true,
  "tier": "pro",
  "skills": { "int-wordpress-post": true, "int-wiro-aimodels": true },
  "credentials": {
    "wordpress":   { "url": "https://blog.example.com", "user": "admin", "apppassword": "xxxx xxxx xxxx xxxx" },
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
      "value": "Every Monday morning, scan the websites listed under your var-website credential, draft one 600-word article, and publish to WordPress as a draft.",
      "interval": "0 9 * * 1",
      "enabled": true,
      "_user_created": true,
      "description": "Weekly WordPress publish"
    }
  ]
}
```

### C. Multi-channel social poster (Pro plan)

```json
{
  "custom": true,
  "title": "Cross-Channel Social",
  "useprepaid": true,
  "tier": "pro",
  "skills": {
    "int-twitterx-post":   true,
    "int-instagram-post":  true,
    "int-linkedin-post":   true,
    "int-facebookpage-post": true,
    "int-wiro-aimodels":  true
  },
  "credentials": {}
}
```

OAuth providers are connected later via `POST /UserAgentOAuth/OAuthConnect` with the provider's `credentialkey` (see [Agent Credentials](/docs/agent-credentials)).

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

- [Agent Skills](/docs/agent-skills): Discover the skill registry, browse credentials per skill, and configure preferences + scheduled tasks
- [Agent Credentials](/docs/agent-credentials): Connect OAuth providers and set API-key credentials
- [Agent Messaging](/docs/agent-messaging): Chat with your custom agent
- [Agent Transactions](/docs/agent-transactions): Audit credit deductions, renewals, and grants
