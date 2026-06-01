# Agent Builder

Build a custom agent from scratch — no marketplace template required. Pick your own skill set, preview the live tier price, and deploy in one call.

## Overview

Wiro's agent runtime supports two deploy paths:

| Path | When to use | Endpoint |
|------|-------------|----------|
| **Template deploy** | The marketplace already has an agent that does what you need (Instagram Manager, Push Notifications, App Review Support, …). You inherit the template's default skill set + configuration. | `POST /UserAgent/Deploy` with `agentguid` |
| **Custom build** | You want a unique skill combination — for example a custom support bot that watches Gmail, publishes a daily digest to WordPress, and uses Wiro's image generator. No marketplace template fits. | `POST /UserAgent/Deploy` with `custom: true` |

The two paths produce the **same useragent shape** at the end (same `customskills`, `scheduledskills`, `credentials`, `subscription`, `tokenRates`, etc.). The only differences are:

| Aspect | Template deploy | Custom build |
|--------|-----------------|--------------|
| `useragents.agentid` | The catalog row id | `null` |
| Pricing recipe | Computed from the template's default skill set | Computed from the skills **you** toggled on |
| `agent.tiers` on the response | Template's tier numbers | Live-resolved per-instance tier numbers |
| `agent.cover` on the response | Template's cover image | The `cover` you sent at Deploy (or a placeholder) |
| Cascade updates | When admin pushes a preset edit, your useragent reconciles | No template — the agent is fully owned by you |

> **Custom builds don't share a marketplace listing.** They are private to your account; nothing about a custom agent appears on `/Agent/List` or `/Agent/Detail`. Discovery happens through your own product surface.

## Step 1 — Browse Available Skills

Custom builds start from the **skill registry** — the catalogue of every skill the platform supports. Browse it with [`POST /Skills/List`](/docs/agent-skills#post-skillslist) and inspect details with [`POST /Skills/Detail`](/docs/agent-skills#post-skillsdetail).

Both endpoints are **public — no authentication required.**

```bash
# Browse all integration skills
curl -X POST "https://api.wiro.ai/v1/Skills/List" \
  -H "Content-Type: application/json" \
  -d '{ "category": "int" }'
```

Pick the skill names you want to enable. Each skill descriptor tells you:

- `name` — the canonical skill key you'll send in `skills` / `skillOverrides`
- `category` — `int` (integration with a third-party service) or `util` (utility / rule-only, no credential)
- `credential_key` — which credential the skill needs (`null` for `util` or platform-managed skills)
- `requires_credentials` — boolean, whether the user must supply a credential before the skill can run
- `depends_on` — array of skill names that must also be enabled (Wiro auto-enables transitive deps)
- `conflicts_with` — array of skill names that cannot coexist with this one
- `pricing` — the per-skill pricing recipe (`monthly_price_weight_usd`, `monthly_credits_weight`, `billing_model: "tokens"`)

> **Use [`POST /Skills/Capabilities`](/docs/agent-skills#post-skillscapabilities)** to discover the closed-set capability vocabulary (the high-level tasks skills can perform). Useful when you want to find every skill that can "post-content" or "send-email".

## Step 2 — Live Pricing Preview

Before you commit, fetch the live tier price for the proposed skill set with [`POST /UserAgent/PricingPreview`](/docs/agent-overview#post-useragentpricingpreview) — the **draft** mode runs without touching any DB state.

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
  "tiermultiplier": 10,
  "totalPriceUsd": 60,
  "totalMonthlyCredits": 1500,
  "starterFloorUsd": 4,
  "skillBreakdown": [
    { "skill": "int-gmail-check",     "priceUsd": 1, "credits": 25,  "billing_model": "tokens" },
    { "skill": "int-wordpress-post",  "priceUsd": 4, "credits": 100, "billing_model": "tokens" },
    { "skill": "int-wiro-aimodels",   "priceUsd": 1, "credits": 25,  "billing_model": "tokens" }
  ],
  "enabledSkills": ["int-gmail-check", "int-wordpress-post", "int-wiro-aimodels"],
  "directSkills":  ["int-gmail-check", "int-wordpress-post", "int-wiro-aimodels"],
  "agentBase": { "priceUsd": 0, "credits": 0 },
  "tokenRates": {
    "default_model": "openai/gpt-5.4",
    "fallback_rate": { "input_per_1m": 750, "output_per_1m": 4500, "cached_input_per_1m": 75 },
    "models": {
      "openai/gpt-5.4": { "input_per_1m": 375, "output_per_1m": 2250, "cached_input_per_1m": 37.5, "selectable": true, "label": "GPT-5.4", "tier": "balanced" },
      "openai/gpt-5.4-mini": { "input_per_1m": 112.5, "output_per_1m": 675, "cached_input_per_1m": 11.25, "selectable": true, "label": "GPT-5.4 Mini", "tier": "cheap" },
      "openai/gpt-5.5": { "input_per_1m": 750, "output_per_1m": 4500, "cached_input_per_1m": 75, "selectable": true, "label": "GPT-5.5", "tier": "premium" }
    }
  },
  "tiers": {
    "starter": { "priceUsd": 6,  "credits": 150 },
    "pro":     { "priceUsd": 60, "credits": 1500 }
  }
}
```

Read the response:

- `tiers.starter.priceUsd` and `tiers.pro.priceUsd` → what your wallet will be charged for each tier.
- `tiers.starter.credits` and `tiers.pro.credits` → monthly credit allocation.
- `tokenRates` → per-model token rates (credits per 1M input / output / cached-input tokens). Each conversation turn is metered against these — see [token billing](/docs/agent-overview#pricing-model--tiers-skills--token-billing).
- `skillBreakdown[]` → per-skill contribution to the total. Use this to see which skill is the most expensive.
- `enabledSkills` → final closure (includes any transitively-enabled `depends_on`).

> **`agentBase`** is always `{ priceUsd: 0, credits: 0 }` — pricing is fully skill-driven and the field is kept on the response so callers don't have to null-check. The agent's Starter price = Σ(skill weights), bumped to the **`starterFloorUsd`** floor (**$4/month** by default) if the raw sum lands below it (credits scale up by the same ratio). Pro = Starter × `tiermultiplier` (default `10`). Per-turn conversation cost is metered separately against the agent's `tokenRates` — see [token billing](/docs/agent-overview#pricing-model--tiers-skills--token-billing).

## Step 3 — Deploy the Custom Agent

Send the same skill set you previewed to `POST /UserAgent/Deploy` with `custom: true` and `useprepaid: true`. The selected `tier` is debited immediately.

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
      "telegram": { "bottoken": "123456:ABC-DEF...", "allowedusers": "[\"761381461\"]", "sessionmode": "private" }
    },
    "customskills": [
      {
        "key": "cron-summarize-inbox",
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
      "tiermultiplier": 10,
      "status": 2,
      "setuprequired": false,
      "monthlycredits": 1500,
      "monthlypriceusd": 60,
      "remainingcredits": 1500,
      "creditperiod": "2026-05",
      "tokenRates": {
        "default_model": "openai/gpt-5.4",
        "fallback_rate": { "input_per_1m": 750, "output_per_1m": 4500, "cached_input_per_1m": 75 },
        "models": {
          "openai/gpt-5.4": { "input_per_1m": 375, "output_per_1m": 2250, "cached_input_per_1m": 37.5, "selectable": true, "label": "GPT-5.4", "tier": "balanced" },
          "openai/gpt-5.4-mini": { "input_per_1m": 112.5, "output_per_1m": 675, "cached_input_per_1m": 11.25, "selectable": true, "label": "GPT-5.4 Mini", "tier": "cheap" },
          "openai/gpt-5.5": { "input_per_1m": 750, "output_per_1m": 4500, "cached_input_per_1m": 75, "selectable": true, "label": "GPT-5.5", "tier": "premium" }
        }
      },
      "agentModel": {
        "chatModel": "openai/gpt-5.4",
        "cronModel": "openai/gpt-5.4",
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
      "credentials": {
        "gmail":    { "_connected": false, "optional": false, "extra": false, "account": "agent@company.com", "apppassword": "[present]" },
        "telegram": { "_connected": false, "optional": false, "extra": false, "bottoken": "[present]", "allowedusers": "[\"761381461\"]", "sessionmode": "private" }
      },
      "agent": {
        "custom": true,
        "title": "Inbox Watcher",
        "tiermultiplier": 10,
        "tiers": {
          "starter": { "priceUsd": 6,  "credits": 150 },
          "pro":     { "priceUsd": 60, "credits": 1500 }
        },
        "extracreditpacks": [
          { "packkey": "small",  "credits": 7500,  "priceusd": 300,  "enabled": true },
          { "packkey": "medium", "credits": 15000, "priceusd": 600,  "enabled": true },
          { "packkey": "large",  "credits": 30000, "priceusd": 1200, "enabled": true }
        ]
      }
    }
  ]
}
```

Notes on the response:

- `agentguid: null` — confirms this is a custom build with no marketplace template.
- `agent.custom: true` — the synthesized template placeholder. Same shape as a template's `agent` block but no `slug` / `cover` / `categories` (custom builds aren't in the marketplace).
- `scheduledskills` already contains the cron from the Deploy body, with the canonical `cs-cron-` prefix added by the server.
- `status: 2` — Deploy auto-queued the instance because `useprepaid: true` provisioned a subscription in the same call. The daemon picks the row up from the queue; you do **not** need to call `POST /UserAgent/Start` after a prepaid deploy.

## Step 4 — Refine Skills After Deploy

Custom builds are the only path where end users can toggle skills on/off after deploy. Use [`POST /UserAgent/SkillsApply`](/docs/agent-overview#post-useragentskillsapply) — even when you only want to flip a single skill, send it as a one-entry `skills` map. The endpoint charges the wallet once, triggers exactly one container restart, and rolls back atomically on payment failure.

> **Template-deploy useragents reject `SkillsApply` with error code `100` (`skillsapply-template-only`):** `Cannot edit skills on a template agent — only custom-built agents support skill editing.` Skills are inherited from the marketplace agent template and changing them would diverge the instance. To run a different skill set, deploy a custom build (`Deploy` with `custom: true`) instead.

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

The response includes the new pricing snapshot and the prorated wallet debit:

```json
{
  "result": true,
  "errors": [],
  "tier": "pro",
  "prepaidWalletDelta": 5.0,
  "restartTriggered": true,
  "restartedAt": 1714694520,
  "pricing": {
    "previousPriceUsd": 60,
    "newPriceUsd": 70,
    "deltaUsd": 10,
    "previousMonthlyCredits": 1500,
    "newMonthlyCredits": 1750,
    "deltaCredits": 250,
    "enabledSkills": ["int-gmail-check", "int-wordpress-post", "int-wiro-aimodels", "int-instagram-post"]
  }
}
```

`prepaidWalletDelta` is the prorated USD amount debited from your wallet for the remaining days of the current period. The same wallet is credited if you disable a paid skill mid-period (negative delta).

### Batch toggle + tier upgrade in one call

When the user stages many toggles in your UI and commits them all together, send everything in one `SkillsApply` call:

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/SkillsApply" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
    "tier": "pro",
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

`idempotencyKey` is required — use a UUID per "user clicks Save" event. A retry of the same key returns the cached response without re-running the saga.

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
    "telegram": { "bottoken": "123456:ABC-DEF...", "allowedusers": "[\"761381461\"]", "sessionmode": "private" }
  },
  "customskills": [
    {
      "key": "cron-email-digest",
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
      "key": "content-strategy",
      "value": "## Writing Style\nShort, punchy, technical. Always include code examples.\n\n## Sources\nWired, ArsTechnica, Hacker News.\n\n## Cadence\nOne 600-word article every Monday.",
      "_user_created": false
    },
    {
      "key": "cron-weekly-blog",
      "value": "Every Monday morning, scan the websites listed under your var-website credential, draft one 600-word article, and publish to WordPress as a draft.",
      "interval": "0 9 * * 1",
      "enabled": true,
      "_user_created": true,
      "description": "Weekly WordPress publish"
    }
  ]
}
```

### C. Multi-channel social poster (Pro tier)

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

OAuth providers are connected later via `POST /UserAgentOAuth/{Provider}Connect` — see [Agent Credentials](/docs/agent-credentials).

## Subscription & Billing for Custom Builds

Subscriptions for custom builds work exactly like template deploys:

- A 30-day prepaid subscription row (`plan: "agent"`, `tier: <starter|pro>`, `provider: "prepaid"`) is inserted at Deploy.
- `POST /UserAgent/CancelSubscription` schedules cancel-at-period-end.
- `POST /UserAgent/RenewSubscription` either undoes a pending cancel (no charge) or creates a fresh 30-day period (wallet charged).
- `POST /UserAgent/UpgradeTier` upgrades Starter → Pro with a prorated wallet debit.

When you toggle a skill on or off, the active subscription is automatically prorated (see Step 4 above). The new monthly amount becomes your charge at next renewal.

## Limits & Notes

- **Skill set must produce a `> $0` price.** Custom builds with no paid skills are rejected with `Subscription price must be greater than $0. Add at least one paid skill or set agent base price.` The `agentBase` floor (`$9 / 1000 credits`) is the implicit minimum unless every enabled skill is free / utility.
- **Conflict / dependency violations are surfaced eagerly.** If you toggle on two mutually-exclusive skills, `SkillsApply` returns code `102` with a `conflicts[]` array; if a `depends_on` is missing, code `101` with `deps[]`. Resolve in the UI before committing.
- **Custom builds receive the same auto-restart on configuration changes** as template deploys (status `3`/`4` → status `1` with `restartafter: true`).
- **Cover image:** custom builds can ship a `cover` URL in the Deploy body, or upload one later via [`POST /UserAgent/Cover`](/docs/agent-overview#post-useragentcover).
- **The agent's persona** is editable via the standard `customskills` flow. Add a `cs-persona` strategy via `CustomSkillUpsert` to set the agent's voice, role, and constraints.

## What's Next

- [Agent Skills](/docs/agent-skills) — Discover the skill registry, browse credentials per skill, and configure preferences + scheduled tasks
- [Agent Credentials](/docs/agent-credentials) — Connect OAuth providers and set API-key credentials
- [Agent Messaging](/docs/agent-messaging) — Chat with your custom agent
- [Agent Transactions](/docs/agent-transactions) — Audit credit deductions, renewals, and grants
