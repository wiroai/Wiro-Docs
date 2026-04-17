# Agent Skills

Configure agent behavior with editable preferences and scheduled automation tasks.

## Overview

Every agent has a set of **custom skills** that define its behavior. Skills come in two types:

| Type | Has Interval | Purpose | What You Can Change |
|------|-------------|---------|-------------------|
| **Preferences** | No (`null`) | Instructions that shape agent behavior — tone, style, targeting rules, content strategy | `value`, `description`, `enabled` |
| **Scheduled Tasks** | Yes (cron) | Automated actions that run on a schedule — scanning, reporting, dispatching | `enabled`, `interval` |

Call `POST /UserAgent/Detail` to discover an agent's skills. They appear in `configuration.custom_skills`.

## Discovering Skills

Call `POST /UserAgent/Detail` to fetch the agent instance. The skill array lives under `configuration.custom_skills`.

**Request:**

```json
{
  "guid": "your-useragent-guid"
}
```

**Response** (`configuration.custom_skills` excerpt):

```json
[
  {
    "key": "content-tone",
    "value": "## Brand Voice\nTone: friendly\nTarget Audience: ...\n\n## Content Sources\nPrimary Source: https://your-site.com/feed.xml\n...",
    "description": "Content strategy, brand voice, and posting rules",
    "enabled": true,
    "interval": null,
    "_editable": true
  },
  {
    "key": "content-scanner",
    "value": "",
    "description": "Content discovery with rotating strategies",
    "enabled": true,
    "interval": "0 */4 * * *",
    "_editable": false
  }
]
```

> The exact key names depend on the agent template. Always fetch `POST /UserAgent/Detail` to see the real list for your deployed instance — skill keys, their default cron schedules, and even the set of skills can evolve as templates are updated.

| Field | Type | Description |
|-------|------|-------------|
| `key` | string | Unique skill identifier. Use this in Update requests. |
| `value` | string | Skill instructions/content. Visible only when `_editable: true` — otherwise empty string. |
| `description` | string | Human-readable description of what the skill does. |
| `enabled` | boolean | Whether the skill is active. |
| `interval` | string \| null | Cron expression for scheduled execution, or `null` for preference-only skills. |
| `_editable` | boolean | Indicates whether `value` / `description` can be modified. Cron skills are `_editable: false` and only accept `enabled` / `interval`; preference skills are `_editable: true` and only accept `value` / `description`. See [Skill types cheat-sheet](#skill-types-cheat-sheet) below. |

### Skill Types Cheat-Sheet

The backend decides which fields are writable by looking at the template's `interval` field on the existing skill:

| Skill type | `interval` in template | `_editable` | Writable fields | Everything else |
|---|---|---|---|---|
| **Cron skill** (scheduled task) | non-null cron string (e.g. `"0 */4 * * *"`) | `false` | `enabled`, `interval` | silently ignored |
| **Preference skill** (instructions) | `null` | `true` | `value`, `description` | silently ignored |

**No prefix needed** — the `interval` field is the canonical discriminator. Keys like `content-scanner` are cron skills because their template `interval` is a cron expression; keys like `content-tone` are preference skills because their template `interval` is `null`.

> **Cross-type fields are dropped at merge time.** If you send `{ key: "content-tone", enabled: false }` (preference skill + cron-only field), the backend drops `enabled` before writing — no error is raised, but the change is not persisted. Same the other way: `{ key: "content-scanner", value: "..." }` drops `value`. Always fetch `POST /UserAgent/Detail` first to see the real `interval` and pick the right update shape.

## Updating Preferences

Preference skills (`_editable: true`, `interval: null`) let you customize the agent's behavior by editing its instructions.

> **Send only `value` (and optionally `description`) to a preference skill.** `enabled` and `interval` fields are dropped by `mergeUserConfig` for preference skills — they have no runtime effect anyway (preference skills are read on-demand by cron tasks via `cs-<slug>`; they're never scheduled themselves).

Send a `POST /UserAgent/Update` request with only the preference skills you want to change. Unmodified skills are preserved (the payload is **merged** with the existing config).

### Example: Social Manager — Brand Voice

```json
{
  "guid": "your-social-manager-guid",
  "configuration": {
    "custom_skills": [
      {
        "key": "content-tone",
        "value": "## Brand Voice\nTone: Professional and informative. No slang.\nTarget Audience: Developers and product managers\nKey Topics: Developer tools, APIs, product updates\nHashtag Strategy: Max 3 per post. Always include #AI and #YourBrand.\n\n## Content Sources\nPrimary Source: https://your-site.com/blog/feed.xml\nSort Order: newest first\nCTA URL Pattern: https://your-site.com/posts/{slug}\n\n## Post Format\nCaption Style: short hook, 3 emoji bullet points, CTA line\nSignature Phrase: \"Build faster with YourBrand\"\n"
      }
    ]
  }
}
```

### Example: Push Notification Manager — Targeting Preferences

```json
{
  "guid": "your-push-agent-guid",
  "configuration": {
    "custom_skills": [
      {
        "key": "push-preferences",
        "value": "## Push Tone\nFriendly and casual. Turkish for locale_tr, English for locale_en.\n\n## Holiday Preferences\nFocus on: New Year, Ramadan, Republic Day.\nSkip: Valentine's Day, Halloween."
      }
    ]
  }
}
```

### Example: Lead Gen Manager — ICP Definition

```json
{
  "guid": "your-leadgen-guid",
  "configuration": {
    "custom_skills": [
      {
        "key": "lead-strategy",
        "value": "## Our Business\nCompany: Acme Corp\nProduct: AI-powered CRM\n\n## Ideal Customer Profile\nIndustry: SaaS, FinTech\nCompany size: 50-500\nJob titles: VP Sales, CTO\n\n## Outreach Tone\nCasual but professional."
      }
    ]
  }
}
```

## Managing Scheduled Tasks

Scheduled tasks (`_editable: false`, non-null `interval`) run automatically on a cron schedule.

> **Only `enabled` and `interval` are writable for scheduled tasks.** `value` and `description` fields on a cron skill are dropped by `mergeUserConfig` — the task body is template-controlled and re-materialised on every container restart from the instance JSON. To change **what** a scheduled task does, edit the paired preference skill (`cs-<slug>`, `_editable: true`) that the cron reads at runtime.

### Example: Change scanner frequency

```json
{
  "guid": "your-useragent-guid",
  "configuration": {
    "custom_skills": [
      {
        "key": "review-scanner",
        "enabled": true,
        "interval": "0 */4 * * *"
      },
      {
        "key": "content-scanner",
        "enabled": false
      }
    ]
  }
}
```

### Common Cron Expressions

| Expression | Meaning |
|-----------|---------|
| `*/30 * * * *` | Every 30 minutes |
| `0 * * * *` | Every hour |
| `0 */2 * * *` | Every 2 hours |
| `0 */4 * * *` | Every 4 hours |
| `0 9 * * *` | Daily at 9:00 AM UTC |
| `0 9 * * 1` | Every Monday at 9:00 AM UTC |
| `0 10 * * 3` | Every Wednesday at 10:00 AM UTC |

## Full Example: Push Notification Manager

Complete flow — fetch skills, then update preferences and schedules in one request.

**Step 1 — Discover skills.**

Call `POST /UserAgent/Detail` with the agent instance GUID:

```json
{
  "guid": "your-push-agent-guid"
}
```

Response excerpt (`configuration.custom_skills`):

```json
[
  {
    "key": "push-preferences",
    "value": "## Push Tone\nWrite like a mobile growth expert...",
    "description": "Push notification style, language, and targeting preferences",
    "enabled": true,
    "interval": null,
    "_editable": true
  },
  {
    "key": "push-scanner",
    "value": "",
    "description": "Scan holidays and craft push notification suggestions",
    "enabled": true,
    "interval": "0 9 * * *",
    "_editable": false
  },
  {
    "key": "push-dispatcher",
    "value": "",
    "description": "Send queued push notifications on schedule",
    "enabled": true,
    "interval": "0 * * * *",
    "_editable": false
  }
]
```

**Step 2 — Update everything in one request.**

`POST /UserAgent/Update`:

```json
{
  "guid": "your-push-agent-guid",
  "configuration": {
    "custom_skills": [
      {
        "key": "push-preferences",
        "value": "## Push Tone\nFriendly and casual. Turkish for locale_tr, English for locale_en.\n\n## Holiday Preferences\nFocus on: New Year, Ramadan, Republic Day.\nSkip: Valentine's Day, Halloween.\n\n## Targeting\nAlways segment by locale. Premium version for paid users."
      },
      {
        "key": "push-scanner",
        "enabled": true,
        "interval": "0 9 * * 1"
      },
      {
        "key": "push-dispatcher",
        "interval": "0 */2 * * *"
      }
    ]
  }
}
```

This single request:
1. **push-preferences** — rewrites targeting rules (editable skill, `value` updated)
2. **push-scanner** — changes from daily to Mondays only (`interval` updated)
3. **push-dispatcher** — changes from hourly to every 2 hours (`interval` updated)

## Available Skills by Agent

> **Integration setup guides:** Every skill below that needs a third-party connection links to a dedicated integration page with the full OAuth / API key walkthrough, required scopes or permissions, callback URL, troubleshooting, and multi-tenant architecture notes. See the [Integration Catalog](/docs/agent-credentials#integration-catalog) for the full list.

> **Discovery is canonical.** Skill keys evolve as agent templates are updated. To see the exact keys for a specific agent instance, always fetch `POST /UserAgent/Detail` first — the `configuration.custom_skills` array is the source of truth. The tables below reflect current intended keys but may lag behind the latest agent template revisions; `mergeUserConfig` silently ignores Update requests for keys that don't exist on the instance.

### Preferences (Editable Instructions)

| Agent | Skill Key | What It Controls |
|-------|-----------|-----------------|
| Social Manager | `content-tone` | Brand voice, hashtags, posting style |
| Blog Content Editor | `content-strategy` | Writing style, topics, research rules |
| App Review Support | `review-preferences` | Response tone, support channels |
| App Event Manager | `event-preferences` | Event regions, holiday priorities |
| Push Notification | `push-preferences` | Push tone, language, targeting |
| Newsletter Manager | `newsletter-strategy` | Topics, tone, audience, frequency |
| Lead Gen Manager | `lead-strategy` | ICP definition, outreach tone |
| Google Ads Manager | `ad-strategy` | Target audience, budget goals |
| Meta Ads Manager | `ad-strategy` | Target audience, creative preferences |

### Scheduled Tasks

> Scheduled task keys are defined **per agent template** and may be updated over time. The table below reflects the current keys and default cron expressions shipped with Wiro's built-in agent templates, but the source of truth for any specific deployed agent is always `POST /UserAgent/Detail` → `configuration.custom_skills`.

| Agent | Skill Key | Cron | What It Does |
|-------|-----------|------|--------------|
| Social Manager | `content-scanner` | `0 */4 * * *` | Content discovery + draft generation (reads `cs-content-tone`) |
| Social Manager | `gmail-checker` | `*/30 * * * *` | Inbox monitoring for incoming requests (disabled by default) |
| Social Manager | `drive-scanner` | `0 10 * * *` | Google Drive asset scanning (disabled by default) |
| Blog Content Editor | `blog-scanner` | `0 9 * * *` | Topic discovery + article drafting (reads `cs-content-strategy`) |
| Blog Content Editor | `gmail-checker` | `*/30 * * * *` | Inbox monitoring for topic requests |
| App Review Support | `review-scanner` | `0 */2 * * *` | Store scanning for new reviews (reads `cs-review-preferences`) |
| App Event Manager | `app-event-scanner` | `0 9 * * 1` | Holiday scanning + event suggestions (reads `cs-event-preferences`) |
| Push Notification Manager | `push-scanner` | `0 9 * * *` | Notification content preparation (reads `cs-push-preferences`) |
| Push Notification Manager | `push-dispatcher` | `0 * * * *` | Dispatching queued notifications |
| Newsletter Manager | `newsletter-sender` | `0 9 * * 1` | Newsletter drafting and sending (reads `cs-newsletter-strategy`) |
| Newsletter Manager | `subscriber-scanner` | `0 10 * * *` | Subscriber list health checks |
| Lead Gen Manager | `prospect-scanner` | `0 10 * * 1` | Prospect discovery and scoring (reads `cs-lead-strategy`) |
| Lead Gen Manager | `outreach-reporter` | `0 9 * * *` | Outreach performance reporting |
| Lead Gen Manager | `reply-handler` | `0 */4 * * *` | Reply analysis |
| Google Ads Manager | `performance-reporter` | `0 9 * * *` | Performance reporting (reads `cs-ad-strategy`) |
| Google Ads Manager | `competitor-scanner` | `0 10 * * 1` | Competitor analysis |
| Google Ads Manager | `holiday-ad-planner` | `0 10 * * 3` | Holiday campaign planning |
| Google Ads Manager | `drive-scanner` | `0 10 * * *` | Google Drive creative asset scanning (disabled by default) |
| Meta Ads Manager | `performance-reporter` | `0 9 * * *` | Performance reporting (reads `cs-ad-strategy`) |
| Meta Ads Manager | `audience-scanner` | `0 10 * * 1` | Audience analysis |
| Meta Ads Manager | `holiday-ad-planner` | `0 10 * * 3` | Holiday campaign planning |
| Meta Ads Manager | `drive-scanner` | `0 10 * * *` | Google Drive creative asset scanning (disabled by default) |

### How Preference and Scheduled Skills Work Together

Each scheduled cron skill reads its paired preference skill at runtime. The mechanism:

1. `POST /UserAgent/Update` writes your preference `value` into `custom_skills[key=<preference-key>]` (for example `content-tone`).
2. When the container starts, each `custom_skills` entry is materialized as a local skill at `skills/cs-<slug>/SKILL.md` inside the agent workspace.
3. The scheduled cron skill's `value` (shipped in the template, not user-editable) references its paired preference via the `cs-<slug>` path, for example:
   ```
   0. Read the cs-content-tone skill first — follow ALL its rules.
   1. ...
   ```
4. At each cron tick, the agent LLM reads `cs-content-tone`, applies your instructions, then executes the scan/report/dispatch workflow.

> **Slug normalization:** the `<slug>` in `cs-<slug>` is NOT the raw `key` — the container normalizes each key to lowercase and replaces any run of non-alphanumeric characters with a single `-` (leading/trailing dashes are trimmed). In practice, stick to lowercase keys like `content-tone`, `push-preferences`, `lead-strategy` and the slug will match 1:1 with the key. If your key contains uppercase, underscores, or other punctuation, inspect the normalized folder name under `skills/` (via the agent's internal `read` tool on `SKILL.md`) to confirm the exact reference string the LLM should use.

This means **your editable preference becomes the single place to customize agent behavior** (brand voice, target audience, content sources, holiday markets, etc.), and the non-editable cron skill is a thin orchestration layer that defers to your preference.

### Skill → Integration Mapping

Skills that depend on third-party credentials. Follow the linked integration page for provider setup, OAuth walkthrough, and troubleshooting.

| Skill | Credentials Required | Integration Guide |
|-------|---------------------|-------------------|
| `metaads-manage` | `metaads` (OAuth) | [Meta Ads Skills](/docs/integration-metaads-skills) |
| `facebookpage-post` | `facebook` (OAuth) | [Facebook Page Skills](/docs/integration-facebook-skills) |
| `instagram-post` | `instagram` (OAuth) | [Instagram Skills](/docs/integration-instagram-skills) |
| `linkedin-post` | `linkedin` (OAuth) | [LinkedIn Skills](/docs/integration-linkedin-skills) |
| `twitterx-post` | `twitter` (OAuth) | [Twitter / X Skills](/docs/integration-twitter-skills) |
| `tiktok-post` | `tiktok` (OAuth) | [TikTok Skills](/docs/integration-tiktok-skills) |
| `googleads-manage` | `googleads` (OAuth) | [Google Ads Skills](/docs/integration-googleads-skills) |
| `hubspot-crm` | `hubspot` (OAuth) | [HubSpot Skills](/docs/integration-hubspot-skills) |
| `mailchimp-email` | `mailchimp` (OAuth or API key) | [Mailchimp Skills](/docs/integration-mailchimp-skills) |
| `google-drive` | `googledrive` (OAuth) | [Google Drive Skills](/docs/integration-googledrive-skills) |
| `gmail-check` | `gmail` (App Password) | [Gmail Skills](/docs/integration-gmail-skills) |
| `firebase-push` | `firebase` (Service account) | [Firebase Skills](/docs/integration-firebase-skills) |
| `wordpress-post` | `wordpress` (App Password) | [WordPress Skills](/docs/integration-wordpress-skills) |
| `appstore-reviews`, `appstore-metadata`, `appstore-events` | `appstore` (API key) | [App Store Skills](/docs/integration-appstore-skills) — env vars export only when `appstore-reviews` OR `appstore-events` is enabled; metadata-only setups need one of them as well |
| `googleplay-reviews`, `googleplay-metadata` | `googleplay` (Service account) | [Google Play Skills](/docs/integration-googleplay-skills) — env vars export only when `googleplay-reviews` is enabled; metadata-only setups need it too |
| `apollo-sales` | `apollo` (API key) | [Apollo Skills](/docs/integration-apollo-skills) |
| `lemlist-outreach` | `lemlist` (API key) | [Lemlist Skills](/docs/integration-lemlist-skills) |
| `wiro-generator` | `credentials.wiro.apiKey` (platform-managed) | See [Using Wiro AI Models from Your Agent](#using-wiro-ai-models-from-your-agent) |
| `calendarific`, OpenAI-backed LLM skills | Platform-managed (no user key) | [Platform-Managed Credentials](/docs/agent-credentials#platform-managed-credentials) |

Agents use `telegram` for operator notifications — see [Telegram Skills](/docs/integration-telegram-skills). Email sending across `brevo` and `sendgrid` — see [Brevo Skills](/docs/integration-brevo-skills) and [SendGrid Skills](/docs/integration-sendgrid-skills).

> **Restart behavior:** Updating `custom_skills` on a running agent (status 3 or 4) triggers an automatic restart (`restartafter: true`) so the new skill configuration is picked up on the next daemon cycle. Same as credential updates.

## Using Wiro AI Models from Your Agent

`wiro-generator` is a platform built-in skill that lets an agent call Wiro's own AI models (image/video/audio/LLM generation, cover image creation, model discovery) using Wiro's internal API. When it's enabled on an agent:

- `credentials.wiro.apiKey` is filled in automatically by Wiro (platform-managed; `_editable: false`). You don't set this key yourself.
- The agent container gets `WIRO_API_KEY` as an env var only when both `wiro-generator` skill is enabled **and** the key is present in the template.
- `wiro-generator` is marked `user-invocable: false` — it isn't called directly by end-user messages; other skills and scheduled tasks invoke it internally when they need to generate content.

Most Wiro-provided agent templates (Social Manager, Blog Content, Push, App Event, Meta Ads, Google Ads, Newsletter) ship with `wiro-generator: true` and the platform-managed `wiro` credential pre-filled. Templates that don't need AI generation (App Review Support, Lead Gen Manager) ship with `wiro-generator: false`.

To check whether your deployed agent has it:

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Detail" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "guid": "your-useragent-guid" }'
# Look under configuration.skills — "wiro-generator" should be true
```

### API user-specific note

`wiro-generator` does **not** mean "your custom skill can call Wiro's Run API with your own API key". It's scoped to the agent template's internal skills and uses Wiro's pre-filled platform key. If you're building on top of Wiro programmatically and want to call the Run / Task / LLM APIs directly from your own backend (not from inside an agent container), use your standard Wiro API key against the public API — see [Run a Model](/docs/run-a-model) and [LLM & Chat Streaming](/docs/llm-chat-streaming).

## Update Rules

| Field | Editable Skills (`_editable: true`) | System Skills (`_editable: false`) |
|-------|-------------------------------------|-----------------------------------|
| `key` | Read-only (used for lookup) | Read-only |
| `enabled` | Can toggle on/off | Can toggle on/off |
| `interval` | Can change cron schedule | Can change cron schedule |
| `value` | Can rewrite instructions | Ignored (hidden in API response) |
| `description` | Can update description | Ignored |
| `_editable` | Read-only | Read-only |

- Include only the fields you want to change — omitted fields keep their current values
- New skills cannot be added — only existing skills (matched by `key`) can be updated
- Send empty string `""` for `interval` to clear the schedule (becomes `null`)
- You can update credentials and skills in the same `POST /UserAgent/Update` request

### What happens when Wiro updates an agent template

Skills occasionally evolve on Wiro's side — new skills, renamed keys, improved cron instructions. Deployed instances are reconciled with the latest template without destroying your edits:

| Skill type | Behavior on template update |
|------------|-----------------------------|
| Editable preference (`_editable: true`, `interval: null`) | Your `value` is **preserved**. If the new template adds fields to the placeholder structure, they appear only on fresh deploys, not on existing instances. |
| Scheduled cron (`_editable: false`, `interval` set) | The `value` (cron instructions) is **overwritten** from the new template. Your custom `interval` and `enabled` flags are kept. |
| New skill added upstream | Added to your instance with default `value`, `enabled`, `interval`. |
| Skill removed upstream | Removed from your instance on the next reconciliation. |

This means your `UserAgent/Update` preference edits are durable across template upgrades, while Wiro can push improvements to the scanning/reporting workflows without you having to re-deploy.
