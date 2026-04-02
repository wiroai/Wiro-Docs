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

```json
POST /UserAgent/Detail
{ "guid": "your-useragent-guid" }

// Response → configuration.custom_skills:
[
  {
    "key": "content-tone",
    "value": "## Voice\nShort punchy lines, developer-friendly...",
    "description": "Brand voice, hashtags, and posting style",
    "enabled": true,
    "interval": null,
    "_editable": true
  },
  {
    "key": "content-scanner",
    "value": "",
    "description": "What content to find and post about",
    "enabled": true,
    "interval": "0 * * * *",
    "_editable": false
  }
]
```

| Field | Type | Description |
|-------|------|-------------|
| `key` | string | Unique skill identifier. Use this in Update requests. |
| `value` | string | Skill instructions/content. Visible only when `_editable: true` — otherwise empty string. |
| `description` | string | Human-readable description of what the skill does. |
| `enabled` | boolean | Whether the skill is active. |
| `interval` | string \| null | Cron expression for scheduled execution, or `null` for preference-only skills. |
| `_editable` | boolean | If `true`, you can modify `value` and `description`. If `false`, only `enabled` and `interval` can be changed. |

## Updating Preferences

Preference skills (`_editable: true`, `interval: null`) let you customize the agent's behavior by editing its instructions.

### Example: Social Manager — Brand Voice

```json
POST /UserAgent/Update
{
  "guid": "your-social-manager-guid",
  "configuration": {
    "custom_skills": [
      {
        "key": "content-tone",
        "value": "## Voice\nProfessional and informative. No slang.\n\n## Hashtags\nMax 3 per post. Always include #AI and #WiroAI.\n\n## Posting Style\nEvery post must include a link. Use bullet points for features."
      }
    ]
  }
}
```

### Example: Push Notification Manager — Targeting Preferences

```json
POST /UserAgent/Update
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
POST /UserAgent/Update
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

Scheduled tasks run automatically on a cron schedule. Toggle `enabled` and adjust `interval`.

### Example: Change scanner frequency

```json
POST /UserAgent/Update
{
  "guid": "your-useragent-guid",
  "configuration": {
    "custom_skills": [
      { "key": "review-scanner", "enabled": true, "interval": "0 */4 * * *" },
      { "key": "content-scanner", "enabled": false }
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

**Step 1 — Discover skills:**

```json
POST /UserAgent/Detail
{ "guid": "your-push-agent-guid" }

// Response → configuration.custom_skills:
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

**Step 2 — Update everything in one request:**

```json
POST /UserAgent/Update
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

| Agent | Task Key | Description | Default Schedule |
|-------|----------|-------------|-----------------|
| Social Manager | `content-scanner` | Scan for new models, prepare posts | Hourly |
| Social Manager | `gmail-checker` | Check inbox for requests | Every 30 min |
| Blog Content | `blog-scanner` | Discover topics, write content | Daily 9 AM |
| Blog Content | `gmail-checker` | Check inbox for topic requests | Every 30 min |
| App Review | `review-scanner` | Scan stores for new reviews | Every 2 hours |
| App Event | `app-event-scanner` | Scan holidays, suggest events | Monday 9 AM |
| Push Notification | `push-scanner` | Scan holidays, craft suggestions | Daily 9 AM |
| Push Notification | `push-dispatcher` | Send queued notifications | Hourly |
| Newsletter | `newsletter-sender` | Create and send newsletters | Monday 9 AM |
| Newsletter | `subscriber-scanner` | Subscriber list health check | Daily 10 AM |
| Lead Gen | `prospect-scanner` | Prospect search and scoring | Monday 10 AM |
| Lead Gen | `outreach-reporter` | Outreach performance report | Daily 9 AM |
| Lead Gen | `reply-handler` | Check replies, analyze sentiment | Every 4 hours |
| Google Ads | `performance-reporter` | Performance report | Daily 9 AM |
| Google Ads | `competitor-scanner` | Competitor analysis | Monday 10 AM |
| Google Ads | `holiday-ad-planner` | Holiday ad campaigns | Wednesday 10 AM |
| Meta Ads | `performance-reporter` | Performance report | Daily 9 AM |
| Meta Ads | `audience-scanner` | Audience analysis | Monday 10 AM |
| Meta Ads | `holiday-ad-planner` | Holiday campaigns | Wednesday 10 AM |

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
