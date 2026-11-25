# Agent Skills

Configure agent behavior with editable preferences, scheduled automation tasks, and skill toggles. Browse the platform's skill registry and inspect what each skill does. The services an agent works with are connectors: see [Agent Connectors](/docs/agent-connectors).

**Read & write paths at a glance:**

| Operation | Endpoint |
|-----------|----------|
| Browse all skills (registry) | [`POST /Skills/List`](#post-skillslist) (public) |
| Browse communication channels and their credential schemas | [`POST /Skills/List`](#post-skillslist) → `channels[]` (public) |
| Inspect a single skill | [`POST /Skills/Detail`](#post-skillsdetail) (public) |
| Find the credential a skill needs | [`POST /Skills/CredentialSchema`](#post-skillscredentialschema) (public) |
| List the closed-set capability vocabulary | [`POST /Skills/Capabilities`](#post-skillscapabilities) (public) |
| Edit a preference skill's `value` or a cron's `interval`/`enabled` | [`POST /UserAgent/CustomSkillUpsert`](/docs/agent-overview#post-useragentcustomskillupsert) |
| Rename a user-created custom skill (key + optional description) | [`POST /UserAgent/CustomSkillRename`](/docs/agent-overview#post-useragentcustomskillrename) |
| Delete a user-created scheduled task | [`POST /UserAgent/CustomSkillDelete`](/docs/agent-overview#post-useragentcustomskilldelete) |
| Read version history of a custom skill | [`POST /UserAgent/CustomSkillHistory`](/docs/agent-overview#post-useragentcustomskillhistory) |
| Revert a custom skill to preset / a historical version | [`POST /UserAgent/CustomSkillRevert`](/docs/agent-overview#post-useragentcustomskillrevert) |
| Turn one or more Skills (the top-level `skills` array, e.g. `util-weather`) on or off | [`POST /UserAgent/SkillsApply`](/docs/agent-overview#post-useragentskillsapply) |
| Preview a skill set or a plan change without saving it | [`POST /UserAgent/PricingPreview`](/docs/agent-overview#post-useragentpricingpreview) |
| Connect a service the agent works with (Shopify, Google Ads, Serper, ...) | [Agent Connectors](/docs/agent-connectors) |

> Read responses from `POST /UserAgent/Detail` expose the composed `customskills[]` array (preference skills + non-cron user-created skills), the `scheduledskills[]` array (scheduled tasks), and the `skills[]` array as top-level fields on the useragent object. `skills[]` is an **object array**: it holds only the Skills that are on, each `{ name, enabled: true, _edited, _user_created }` (e.g. `[{ "name": "util-diagram", "enabled": true, "_edited": false, "_user_created": false }, { "name": "util-weather", "enabled": true, "_edited": true, "_user_created": false }]`).

## Skill Registry vs Custom Skills

Two concepts share the word "skill" in the agent system, and connectors give them their tools. Keep them straight:

| Concept | What it is | Where it lives | API surface |
|---------|------------|----------------|-------------|
| **Registry skills** | Platform-shipped Skills (`util-*`): rule sets, playbooks, the voice channels and tools, such as Weather (`util-weather`), Diagrams (`util-diagram`) and Video Creator (`util-video-creator`). Wiro defines them, and every plan includes them. | Wiro's skill registry. | `POST /Skills/List` / `POST /Skills/Detail` (read), `POST /UserAgent/SkillsApply` (toggle on/off per useragent). |
| **Custom skills** | User-editable preference text (`cs-content-tone`) or scheduled tasks (`cs-cron-blog-scanner`) that live ON a useragent. They can use the tools of the agent's connectors (e.g. a scheduled task drafts posts with `wordpress__*`) but are scoped to one instance. | Per useragent on the Wiro platform. | `POST /UserAgent/CustomSkillUpsert` / `POST /UserAgent/CustomSkillRename` / `POST /UserAgent/CustomSkillDelete` / `POST /UserAgent/CustomSkillHistory` / `POST /UserAgent/CustomSkillRevert`. |
| **Connectors** | The outside services an agent works with (Shopify, Google Ads, HubSpot, Serper, ...), connected with your customer's own credentials. Each gives the agent tools named `<slug>__<tool>`. | Per useragent. | [Agent Connectors](/docs/agent-connectors) |

The rest of this page documents both: the registry endpoints first (so you can discover what's possible), then the per-useragent endpoints (so you can configure them).

## Skill Registry Endpoints

These four endpoints are **public, so no authentication is required**. They return data straight from the skill registry.

### **POST** /Skills/List

Lists all skills in the registry.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `category` | string | No | Filter by category. Every registry skill is `"util"`: rule sets, playbooks, the voice channels and tools such as weather and diagrams. |
| `capability` | string | No | Filter by capability key (see [`POST /Skills/Capabilities`](#post-skillscapabilities) for the closed-set vocabulary). |
| `user_invocable` | boolean | No | When `true`, only return skills end users can call directly through chat (filters out plumbing skills wired by the runtime). |
| `requires_credentials` | boolean | No | Filter by whether the skill requires a credential. |
| `name_in` | `array<string>` | No | Restrict the response to a specific list of skill names. |

##### Response

```json
{
  "result": true,
  "errors": [],
  "total": 19,
  "skills": [
    {
      "name": "util-weather",
      "category": "util",
      "version": "1.0.0",
      "title": "Weather",
      "description": "Current weather and a 9-day forecast for any place (temperature, rain, wind, UV) from MET Norway's open forecast data, with the place found on OpenStreetMap. No key needed.",
      "icon": "lni lni-cloud-sun",
      "brand_color": "#0ea5e9",
      "brand_text_color": "#ffffff",
      "brand_logo_filter": "brightness(0) invert(1)",
      "docs_url": "",
      "requires_credentials": false,
      "credential_key": null,
      "capabilities": ["weather_lookup"],
      "depends_on": [],
      "conflicts_with": [],
      "user_invocable": true,
      "deprecated": false,
      "replacement": null,
      "pricing": {
        "monthly_price_weight_usd": 0,
        "monthly_credits_weight": 0,
        "billing_model": "tokens"
      }
    }
  ],
  "channels": [
    {
      "id": "telegram",
      "plugin": "telegram",
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

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Canonical skill key, **including the registry prefix** `util-`. Use this exact value in `SkillsApply` and `Deploy.body.skills`. |
| `category` | `string` | `"util"`: rule sets, playbooks, the voice channels and tools such as weather and diagrams. |
| `version` | `string` | Semver for the registry entry. Bumped when the skill's tool surface changes. |
| `title` | `string` | Display name shown on chips / filters / cards. |
| `description` | `string` | One-line summary used on marketing surfaces. |
| `icon` | `string` | A LineIcons class name, such as `lni lni-cloud-sun`, or a path on wiro.ai, such as `/images/icons/skills/twilio.svg`: prefix a path with `https://wiro.ai`. |
| `brand_color` | `string\|null` | Brand background colour (hex) for chips and cards. |
| `brand_text_color` | `string\|null` | Foreground colour to render on top of `brand_color`. |
| `brand_logo_filter` | `string\|null` | CSS `filter` value applied to monochrome SVG icons (e.g. `"brightness(0) invert(1)"`) so the same source SVG renders correctly on light and dark brand colours. |
| `docs_url` | `string\|null` | The page about the skill, when it has one: a slug or path on this docs site, which frontends prefix with `/docs/`, such as `integration-twiliovoice-skills` for Twilio Voice Channel (`util-twilio-channel`), or a full `https` address, used as it is, such as `https://wiro.ai/connectors/google-play` for Google Play Promotional Content (`util-googleplay-events`), whose page is its connector's. Empty when there is none. |
| `requires_credentials` | `boolean` | `true` when the skill needs a credential the operator must supply (effectively `true` whenever `credential_key` names a credential you supply). |
| `credential_key` | `string\|null` | The credential this skill needs, when it needs one (see [Agent Credentials](/docs/agent-credentials)); [`POST /Credentials/Detail`](/docs/agent-credentials#post-credentialsdetail) shows its schema. `null` for skills that need none. |
| `additional_credential_keys` | `array<string>` | **Optional: only present when the skill reads further credentials,** such as `["var-support-email"]` for the support-email setting; most skills omit this field entirely. |
| `capabilities` | `array<string>` | High-level snake_case capability tags from the closed vocabulary returned by [`POST /Skills/Capabilities`](#post-skillscapabilities). Drives the "Find skills that can: ___" picker. |
| `suggested_connectors` | `array<string>` | **Optional: only present when set.** The connectors the skill works with, by catalog slug, such as `["google-ads", "meta-ads", "tiktok-ads"]` on Ads Manager Common Rules (`util-ads-manager-common`). Nothing connects by itself: connect the ones you want with [`POST /UserAgent/ConnectorConnect`](/docs/agent-connectors#post-useragentconnectorconnect). An `add` setup card names up to 3 of them that aren't connected yet in its `needs` (see [Setup From Chat](/docs/agent-messaging#setup-from-chat)). |
| `depends_on` | `array<string>` | Other skill names that must be on while this one is. Deploy's `skills` and an `add` setup card turn them on with it. `SkillsApply` turns on only the names you send and refuses, with code `101` and `deps[]`, a change that leaves one of them off, so send them in the same call. |
| `conflicts_with` | `array<string>` | Mutually-exclusive skill names. `SkillsApply` rejects toggle batches that would enable two conflicting skills. |
| `user_invocable` | `boolean` | `true` when end users can call the skill via chat. `false` marks supporting parts that come with another skill, such as Video Story & Shots (`util-video-shots`) and Document Videos (`util-video-docs`), which come with Video Creator (`util-video-creator`). |
| `deprecated` | `boolean` | `true` for skills slated for removal, and `replacement` (if any) names the migration target. |
| `replacement` | `string\|null` | When `deprecated: true`, the registry-recommended successor skill name. |
| `pricing` | `object` | `{ monthly_price_weight_usd, monthly_credits_weight, billing_model }`. Every plan includes every skill, so both weights are `0` (see below). |

`channels[]` is a separate, unfiltered catalog returned alongside `skills[]`.
Skill filters do not remove channel rows. Each channel includes its stable
`id`, `credential_key`, activation `required_fields`, UI-facing
`capabilities`, and the full registry `credential` descriptor. Use these values
to render channel setup. Save the matching credential group through
[`UserAgent/CredentialUpsert`](/docs/agent-overview#post-useragentcredentialupsert);
the channel activates automatically when every `required_fields` value is
complete. These channels (Telegram, Slack, Discord) are not Skills and do not affect pricing.

**`pricing` object:**

| Sub-field | Type | Description |
|-----------|------|-------------|
| `monthly_price_weight_usd` | `number` | Always `0`: a skill adds nothing to the agent's price. |
| `monthly_credits_weight` | `number` | Always `0`: a skill adds nothing to the AI usage the agent's plan includes. |
| `billing_model` | `string` | Always `"tokens"`. Per-turn conversation cost is token-metered at the agent's per-model `tokenRates` (cents per 1M tokens, with input, cache read, cache write and output priced separately), from the plan's included AI usage first and then from the Wiro balance. See [token billing in the Agent Overview](/docs/agent-overview#token-billing). Voice skills bill realtime audio to the wallet of the agent's Wiro project (the `wiro` credential); the voice-prep and post-call text turns are AI usage like any other turn. |

> **Every plan includes every skill.** An agent's price and the AI usage it includes come from its plan (Starter, Pro or Max), never from its skills, so turning a skill on or off changes neither. See [Pricing Model](/docs/agent-overview#pricing-model-plans-ai-usage-balance).


### **POST** /Skills/Detail

Returns a single skill by name.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes | Canonical skill name **with prefix** (e.g. `"util-weather"`, `"util-social-posting-common"`). Registry-only: `cs-*` and `cs-cron-*` user-level customskills are not exposed here. |

##### Response

```json
{
  "result": true,
  "errors": [],
  "skill": {
    "name": "util-weather",
    "category": "util",
    "version": "1.0.0",
    "title": "Weather",
    "description": "Current weather and a 9-day forecast for any place (temperature, rain, wind, UV) from MET Norway's open forecast data, with the place found on OpenStreetMap. No key needed.",
    "icon": "lni lni-cloud-sun",
    "brand_color": "#0ea5e9",
    "brand_text_color": "#ffffff",
    "brand_logo_filter": "brightness(0) invert(1)",
    "docs_url": "",
    "requires_credentials": false,
    "credential_key": null,
    "capabilities": ["weather_lookup"],
    "depends_on": [],
    "conflicts_with": [],
    "user_invocable": true,
    "deprecated": false,
    "replacement": null,
    "pricing": {
      "monthly_price_weight_usd": 0,
      "monthly_credits_weight": 0,
      "billing_model": "tokens"
    }
  }
}
```

Returns the **full registry entry**: same shape as a row from `Skills/List`. The endpoint surfaces every field the registry has stored. If the skill is not found you get `{ "result": false, "errors": [{ "code": 404, "message": "Skill not found: <name>" }] }`.

### **POST** /Skills/CredentialSchema

Convenience endpoint: returns the credential entry a skill needs, in one call. Useful when you've discovered a skill via `Skills/List` and want to render its credential form without a separate `Credentials/Detail` round-trip.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes | Skill name, with the registry prefix. |

##### Response

`{ "result": true, "errors": [], "credential": { ... } }`, where `credential` is the **full registry credential entry**: the same shape as [`POST /Credentials/Detail`](/docs/agent-credentials#post-credentialsdetail). A skill that needs no credential (most skills: check `requires_credentials` first) answers `{ "result": false, "errors": [{ "code": 404, "message": "No credential associated with skill: <name>" }] }`. A service the agent works with is a connector, not a skill's credential: read its fields with [`POST /AgentConnector/Detail`](/docs/agent-connectors#post-agentconnectordetail).

### **POST** /Skills/Capabilities

Returns the closed-set vocabulary of high-level capability tags. Use this to build a "Find skills that can: ___" picker in your UI, or to filter `Skills/List` via the `capability` parameter.

##### Response

```json
{
  "result": true,
  "errors": [],
  "capabilities": [
    { "name": "approval_flow",            "description": "Approval commands for actions that wait for your approval" },
    { "name": "recommendation_ledger",    "description": "Recommendation queue/log management" },
    { "name": "video_generation",         "description": "Generate videos" },
    { "name": "motion_graphics",          "description": "Compose and render motion graphics (HTML/CSS/GSAP animations, sound effects, transitions) to video" },
    { "name": "human_copywriting",        "description": "Enforce anti-AI human copy rules" },
    { "name": "anti_ai_tone",             "description": "Reject AI-generated tone patterns" },
    { "name": "markdown_reporting",       "description": "Structured markdown reports (tables, code blocks, splits)" },
    { "name": "store_review_response",    "description": "Craft App Store / Google Play review responses" },
    { "name": "outreach_compliance",      "description": "Outreach PII/opt-out/consent rules (GDPR, CAN-SPAM)" },
    { "name": "email_publishing",         "description": "Send emails / newsletters" },
    { "name": "social_publishing",        "description": "Post to social platforms (Twitter, IG, FB, LI, TikTok)" },
    { "name": "multi_platform_detection", "description": "Auto-detect available platforms" },
    { "name": "event_management",         "description": "Manage app events (App Store in-app events)" },
    { "name": "voice_call_handling",      "description": "Receive and handle inbound voice calls via Twilio or web browser" },
    { "name": "caller_identification",    "description": "Match caller phone number against CRM records (HubSpot, Apollo)" },
    { "name": "live_transcript",          "description": "Stream real-time call transcripts to your chat" },
    { "name": "voice_persona",            "description": "Configure AI voice persona (alloy/echo/etc) for phone interactions" },
    { "name": "phone_inbound",            "description": "Accept inbound PSTN phone calls (Twilio)" },
    { "name": "browser_voice",            "description": "Accept inbound voice calls from website browser (Web Audio API)" },
    { "name": "realtime_session_prep",    "description": "Gets a call ready before realtime audio starts: reads your own skills, starts the realtime model and connects the call" },
    { "name": "weather_lookup",           "description": "Current weather and forecasts for any place (MET Norway, OpenStreetMap geocoding)" },
    { "name": "diagram_rendering",        "description": "Render diagrams (Mermaid flowcharts, sequence, state and ER diagrams, mind maps, timelines; agent-drawn SVG) to PNG with an SVG copy" }
  ]
}
```

Capability names are **snake_case** strings. Pass any of them as the `capability` parameter to `Skills/List` to filter (e.g. `{ "capability": "social_publishing" }` returns every skill that publishes to a social platform).

## Custom Skills: Discovery (Per-Instance)

Once you've deployed a useragent, its current custom skills live under `customskills[]` (preferences + non-cron user-created skills) and `scheduledskills[]` (scheduled tasks) on the `POST /UserAgent/Detail` response.

**Request:**

```json
{ "guid": "your-useragent-guid" }
```

**Response** (top-level `customskills` and `scheduledskills` excerpt, same shape as on `POST /UserAgent/Detail`):

```json
{
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
      "_editable": false,
      "_edited": false
    },
    {
      "key": "cs-cron-weekly-health-check",
      "description": "User-created weekly summary cron that posts a Monday recap to Telegram.",
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
    { "name": "util-chat-markdown-reporting", "enabled": true, "_edited": false, "_user_created": false },
    { "name": "util-social-posting-common", "enabled": true, "_edited": false, "_user_created": false }
  ]
}
```

> The exact key names depend on the agent template. Always fetch `POST /UserAgent/Detail` to see the real list for your deployed instance, because skill keys, default cron schedules, and even the set of skills can evolve as templates are updated.

| Field | Type | Description |
|-------|------|-------------|
| `key` | string | Canonical key. **Always carries the `cs-` runtime prefix.** Strategies are `cs-<slug>`; crons are `cs-cron-<slug>`. The server normalises bare slugs you send to `CustomSkillUpsert`: `"content-tone"` becomes `cs-content-tone`, `"weekly-health-check"` with `interval: "0 9 * * 1"` becomes `cs-cron-weekly-health-check`. |
| `value` | string | The text of the preference or task: the one you wrote, or else the template's. |
| `description` | string | Human-readable description. **Writable only on user-created rows.** Sending a different `description` for a preset strategy or a skill-bundled cron is rejected with `This skill comes with the agent's template, so its description can't be changed for one agent.`; sending the current one back unchanged is ignored. |
| `enabled` | boolean | Whether the skill is active. **Writable for both strategies (`cs-*`) and crons (`cs-cron-*`)**. A disabled strategy is suppressed end-to-end (kept in the merged `customskills[]` so it still appears in the list, but the agent never loads it). |
| `interval` | string \| null | Cron expression for scheduled execution, or `null` for preference skills. Writable on scheduled tasks; ignored on preferences. |
| `requires_connectors` | string[] | Scheduled tasks only (`[]` on preferences): the connectors the task works with, by catalog slug. The task runs only while at least one of them is connected, that is, its row on [`POST /UserAgent/ConnectorList`](/docs/agent-connectors#post-useragentconnectorlist) has `status: "connected"` and `catalogstatus: "active"`; until then the agent skips every run. This gate never changes `enabled`: a task waiting for a connector can still read `enabled: true`. `[]` means no connector gate; a task you add with `CustomSkillUpsert` has `[]`. |
| `requires_credentials` | string[] | The channels and settings the task needs, by credential key, such as `telegram`: one of them set up is enough. Saving or clearing one of them turns the task on or off. Usually `[]`. |
| `_source` | string | `preset-strategy` (editable preference), `skill-bundle` (a scheduled task that comes with the agent template; on a custom build, any row the agent came with, such as Approval Policy), or `user-created` (a row added via `CustomSkillUpsert`). |
| `_editable` | boolean | Whether the row takes a new `value`. `false` on a scheduled task that came with the agent's template with a text of its own: the agent runs the template's text, which `value` shows, and `CustomSkillUpsert` refuses a different one; its `enabled` and `interval` are still yours. `true` for preferences, your own rows, a template's task without a text of its own, and every row of a custom build, which runs the text you write. |
| `_user_created` | boolean | `true` on rows you created (`_source: "user-created"`). A template's own rows leave it out; on a custom build, the rows the agent came with read `false`. |

### Understanding `_source`

Agent responses merge three sources into a single set of custom-skill rows:

1. **Preset strategies** (`_source: "preset-strategy"`): preferences defined by the agent preset (e.g. `cs-content-tone`, `cs-ad-strategy`). You can write `value`.
2. **Bundled crons** (`_source: "skill-bundle"`): scheduled tasks that come with the agent template, such as a daily performance report. A task that works with connectors runs only while one of them is connected, and that never changes its `enabled`. You can write `interval` and `enabled`. On a template agent, the task runs the template's instruction text, which `value` shows with `_editable: false`, and `CustomSkillUpsert` refuses a different `value`; the same text sent back changes nothing. On a custom build, the rows the agent came with, such as the tasks its Skills bring, read `skill-bundle` too and run the text you write.
3. **User-created rows** (`_source: "user-created"`): entries added via `POST /UserAgent/CustomSkillUpsert`. You can write all fields. Crons are flagged via `interval` (or an explicit `cs-cron-` prefix), not `usercreated`.

## Updating Preference Skills

Preference skills (`_source: "preset-strategy"`, `_editable: true`) let you customize the agent's behavior by editing its instructions.

Send one `CustomSkillUpsert` call per skill. Unspecified skills are untouched. The typical update is just `value`. You can also pass `enabled: false` to disable a strategy (the agent will skip it everywhere it would otherwise inject the strategy's instructions). `interval` has no effect on strategies: they're read on-demand by cron tasks via `cs-<slug>`, never scheduled themselves. A changed `description` is rejected on preset rows with `This skill comes with the agent's template, so its description can't be changed for one agent.`

### Example: Social Manager (Brand Voice)

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/CustomSkillUpsert" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-social-manager-guid",
    "skillkey": "content-tone",
    "value": "## Brand Voice\nTone: Professional and informative. No slang.\nTarget Audience: Developers and product managers\nKey Topics: Developer tools, APIs, product updates\nHashtag Strategy: Max 3 per post. Always include #AI and #YourBrand.\n\n## Content Sources\nPrimary Source: https://your-site.com/blog/feed.xml\nSort Order: newest first\nCTA URL Pattern: https://your-site.com/posts/{slug}\n\n## Post Format\nCaption Style: short hook, 3 emoji bullet points, CTA line\nSignature Phrase: \"Build faster with YourBrand\"\n"
  }'
```

Response: `{ "result": true, "errors": [], "restarting": false, "live": true }`. A running agent gets the new text right away, without a restart.

### Example: Lead Generation Manager (ICP Definition)

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/CustomSkillUpsert" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-leadgen-guid",
    "skillkey": "lead-strategy",
    "value": "## Our Business\nCompany: Acme Corp\nProduct: AI-powered CRM\n\n## Ideal Customer Profile\nIndustry: SaaS, FinTech\nCompany size: 50-500\nJob titles: VP Sales, CTO\n\n## Outreach Tone\nCasual but professional."
  }'
```

## Managing Scheduled Tasks

Scheduled tasks run on a cron schedule: bundled ones (`_source: "skill-bundle"`) come with the agent template, and a new agent starts with them turned on (`enabled: true`); one that works with connectors runs only while one of them is connected. User-created ones (`_source: "user-created"`) are added at any time.

> **On a template agent, bundled crons run the template's text.** Write `enabled` and `interval`. A different `value` is refused, and nothing in the call is saved: `This scheduled task comes with the agent's template, so its instructions cannot be changed. You can still turn it on or off and change its schedule.` The template's text sent back as `UserAgent/Detail` shows it is no change, so a client that writes back every field it read still works. To change **what** a bundled scheduled task does, edit the paired preference skill (e.g. `content-tone` is read by `cs-cron-social-content-scanner` at runtime), or turn the task off and add your own. For user-created crons, and for every cron of a custom build, all three (`value`, `interval`, `enabled`) take effect.

### Example: Change a bundled cron's frequency

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/CustomSkillUpsert" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "skillkey": "cs-cron-review-scanner",
    "enabled": true,
    "interval": "0 */4 * * *"
  }'
```

### Example: Disable a bundled cron

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/CustomSkillUpsert" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "skillkey": "cs-cron-social-content-scanner",
    "enabled": false
  }'
```

### Example: Create a user-defined cron

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/CustomSkillUpsert" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "skillkey": "weekly-health-check",
    "value": "Every Monday, check the inbox and report the count to Telegram.",
    "interval": "0 9 * * 1",
    "enabled": true,
    "description": "Weekly inbox health check"
  }'
```

The call sends an `interval`, so the server stores the key as `cs-cron-weekly-health-check`. Later upserts can name it `"cs-cron-weekly-health-check"` or `"cron-weekly-health-check"`, or `"weekly-health-check"` together with an `interval`. `"weekly-health-check"` without `interval` names a strategy, `cs-weekly-health-check`, and creates a new one.

### Example: Delete a user-created cron

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/CustomSkillDelete" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "skillkey": "cs-cron-weekly-health-check"
  }'
```

A task or preference the agent came with, from its template or, on a custom build, from a Skill or from Wiro (such as Approval Policy), can't be deleted: the call answers `This skill is registry-owned and cannot be deleted. Use enabled=false to disable it instead.` (`This skill belongs to the agent preset and cannot be deleted. Use enabled=false to disable it instead.` for one you created whose key the template also has) with `suggestion: "disable-via-upsert"`, and nothing changes. Disable it via `CustomSkillUpsert` + `enabled: false` instead.

```json
{
  "result": false,
  "errors": [{ "code": 0, "message": "This skill is registry-owned and cannot be deleted. Use enabled=false to disable it instead." }],
  "suggestion": "disable-via-upsert"
}
```

### Example: Rename a user-created custom skill

Only user-created rows (`_source: "user-created"`) can be renamed through `CustomSkillRename`. The skillkey flavour is preserved: a `cs-cron-*` scheduled task cannot be renamed to a `cs-*` strategy (delete + re-create with the right kind instead). The full version-history chain follows the rename under the new key, and a `rename` audit event is appended.

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/CustomSkillRename" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "oldskillkey": "cs-cron-weekly-health-check",
    "newskillkey": "cs-cron-weekly-system-check",
    "description": "Weekly system health probe"
  }'
```

Successful responses include the canonical `newskillkey` the server ended up writing (after slug normalisation), so follow-up calls that reference the skill should use that value.

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

## Version History: Audit and Revert

Each change saved with `CustomSkillUpsert`, each rename and each revert adds a row to the version history. Creating a skill and a save that changes nothing add none, and `CustomSkillDelete` deletes a skill's history with it. Each entry's `operation` says what wrote it: `clone-deploy` (the copy Deploy made of a template's or a Skill's row), `update-user` (a save), `rename`, `reset-to-preset` or `revert-to-history`, or `update-cascade`, `insert-cascade` and `delete-cascade` for a template update Wiro applied. Read it via `POST /UserAgent/CustomSkillHistory`; revert to any version (or to the preset default) via `POST /UserAgent/CustomSkillRevert`.

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/CustomSkillHistory" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "skillkey": "cs-content-tone"
  }'
```

```json
{
  "result": true,
  "errors": [],
  "preset_default": {
    "value": "## Brand Voice\nTone: friendly\nTarget Audience: ...",
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
      "value": "## Brand Voice\nTone: professional...",
      "intervalexpr": null,
      "enabled": true,
      "usercreated": false,
      "prev_value": "## Brand Voice\nTone: friendly...",
      "prev_interval": null,
      "prev_enabled": true,
      "after_value": "## Brand Voice\nTone: professional...",
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
    },
    {
      "guid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
      "skillkey": "cs-content-tone",
      "operation": "update-user",
      "value": "## Brand Voice\nTone: friendly...",
      "intervalexpr": null,
      "enabled": true,
      "usercreated": false,
      "prev_value": null,
      "prev_interval": null,
      "prev_enabled": null,
      "after_value": "## Brand Voice\nTone: professional...",
      "after_interval": null,
      "after_enabled": true,
      "changed_fields": [],
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

Each entry carries the **BEFORE** state of the action that produced it (the history entry is written before the change is applied), plus server-computed `prev_*`, `after_*`, and `changed_fields[]` so you don't have to walk the list yourself. `changedby_user` is the resolved actor object, or `null` for system / cron writes (sentinel `changedby`) or deleted users. Full field reference and revert flow live in [Agent Overview → CustomSkillHistory](/docs/agent-overview#post-useragentcustomskillhistory).

Revert to the preset default:

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/CustomSkillRevert" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "skillkey": "cs-content-tone",
    "source": "preset"
  }'
```

Or jump back to a specific version:

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/CustomSkillRevert" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "skillkey": "cs-content-tone",
    "source": "history",
    "versionguid": "v1-1714600000-def"
  }'
```

The response carries the post-revert state (`current_value`, `current_interval`, `current_enabled`) so the UI can refresh without a full `Detail` round-trip.

## Turning Skills On and Off

The top-level `skills[]` array on `UserAgent/Detail` lists the Skills that are on, as an **object array** sorted by name: `[{ name, enabled: true, _edited, _user_created }, ...]`. A Skill that is off is not in it, so `enabled` is always `true`; the full catalog of Skills is on [`POST /Skills/List`](#post-skillslist). `_edited` is `true` for a Skill you turned on yourself rather than one the template or a dependency brought, and `_user_created` is `true` for a name neither the template nor the registry has. Example: `[{ "name": "util-diagram", "enabled": true, "_edited": false, "_user_created": false }, { "name": "util-weather", "enabled": true, "_edited": true, "_user_created": false }]`. To enable or disable several skills in one shot, use **`POST /UserAgent/SkillsApply`**. Even when you only want to flip a single skill, send it as a one-entry `skills` map. Connectors are not in this list: a connected connector is on (see [Agent Connectors](/docs/agent-connectors)). The endpoint:

1. Applies the new skill set to a running agent with no restart, unless a Skill needs one: turning `util-voice-receptionist`, `util-twilio-channel`, `util-web-channel` or `util-newsletter-compose` on or off restarts it once.
2. Uses **idempotency**: concurrent calls or client retries can't apply the change twice.
3. Is **atomic**: the whole batch lands, or none of it does.

A skill change costs nothing: every plan includes every skill, so the agent's price and included AI usage stay the same.

**Single-skill enable:**

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

**Batch toggle in one call:**

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/SkillsApply" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
    "idempotencyKey": "550e8400-e29b-41d4-a716-446655440000",
    "skills": {
      "util-weather": true,
      "util-diagram": true,
      "util-anti-ai-human-copy": false
    }
  }'
```

`idempotencyKey` is required: use a UUID per "user clicks Save" event. A Skill whose `depends_on` would stay off is refused with code `101` and `deps[]`, and nothing changes: send its dependencies in the same call. The full response shape and error-code table live on [`SkillsApply`](/docs/agent-overview#post-useragentskillsapply).

> **Template deploys too.** `SkillsApply` works on agents deployed from a marketplace template as well as on custom builds. On a template agent, a skill you change overrides the template for that skill only; later template updates still reach every skill you never changed.

> **Scheduled tasks wait for their connectors.** A template's scheduled task that works with a connector, such as a daily Google Ads report, runs only while that connector is connected. Connecting or disconnecting a connector never changes the task's `enabled`: a new agent starts with its template's tasks turned on, and a task that is off stays off until you turn it on with `CustomSkillUpsert` (`enabled: true`).

## Preview a Skill Change

Before you commit `SkillsApply` (or the user clicks Save in your UI), call `POST /UserAgent/PricingPreview` to see the skill set the change would leave, with its `depends_on` resolved. No state is mutated, and the price and included AI usage stay the plan's: its `planChange` shows no charge. Its `enabledSkills` includes the `depends_on` skills, but `SkillsApply` does not add them: send every name `enabledSkills` adds in the same `SkillsApply` call. See [`PricingPreview`](/docs/agent-overview#post-useragentpricingpreview) for the full response shape.

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/PricingPreview" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "skillOverrides": {
      "util-weather": true,
      "util-diagram": false
    }
  }'
```

For **Build Your Agent** (no useragent yet), use draft mode:

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/PricingPreview" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "draft": true,
    "tier": "starter",
    "skills": ["util-weather", "util-diagram"]
  }'
```

See [Agent Builder](/docs/agent-builder) for the full custom-build walkthrough.

## Full Example: Push Notification Manager

Complete flow: fetch skills, then update preferences and schedules with three separate calls.

**Step 1: Discover skills.**

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Detail" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "guid": "your-push-agent-guid" }'
```

Response excerpt (top-level `customskills` and `scheduledskills`):

```json
{
  "customskills": [
    {
      "key": "cs-push-preferences",
      "value": "## Push Tone\nWrite like a mobile growth expert...",
      "description": "Push notification style, language, and targeting preferences",
      "enabled": true,
      "interval": null,
      "_source": "preset-strategy",
      "_editable": true
    }
  ],
  "scheduledskills": [
    {
      "key": "cs-cron-push-scanner",
      "value": "Scan for upcoming holidays and craft push notification suggestions.\n\n0. Read the cs-push-preferences skill first...",
      "description": "Scan holidays and craft push notification suggestions",
      "enabled": true,
      "interval": "0 9 * * *",
      "_source": "skill-bundle",
      "_editable": false
    },
    {
      "key": "cs-cron-push-dispatcher",
      "value": "Send queued push notifications that are due.\n\n0. Read the cs-push-preferences skill first...",
      "description": "Send queued push notifications on schedule",
      "enabled": true,
      "interval": "0 * * * *",
      "_source": "skill-bundle",
      "_editable": false
    }
  ]
}
```

**Step 2: Update each skill with its own call.**

```bash
# 1. Rewrite preference value
curl -X POST "https://api.wiro.ai/v1/UserAgent/CustomSkillUpsert" \
  -H "Content-Type: application/json" -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-push-agent-guid",
    "skillkey": "push-preferences",
    "value": "## Push Tone\nFriendly and casual. Turkish for locale_tr, English for locale_en.\n\n## Holiday Preferences\nFocus on: New Year, Ramadan, Republic Day.\nSkip: Valentine'\''s Day, Halloween.\n\n## Targeting\nAlways segment by locale. Premium version for paid users."
  }'

# 2. Change scanner schedule from daily to Mondays only
curl -X POST "https://api.wiro.ai/v1/UserAgent/CustomSkillUpsert" \
  -H "Content-Type: application/json" -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-push-agent-guid",
    "skillkey": "cs-cron-push-scanner",
    "enabled": true,
    "interval": "0 9 * * 1"
  }'

# 3. Change dispatcher schedule from hourly to every 2 hours
curl -X POST "https://api.wiro.ai/v1/UserAgent/CustomSkillUpsert" \
  -H "Content-Type: application/json" -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-push-agent-guid",
    "skillkey": "cs-cron-push-dispatcher",
    "interval": "0 */2 * * *"
  }'
```

All three requests succeed independently, and each reaches a running agent with no restart: it uses the change from its next message.

## Available Skills by Agent

> **Connectors:** the services these agents work with (Google Ads, Meta Ads, WordPress, Brevo and the rest) are connectors, each connected with your own credentials. See [Agent Connectors](/docs/agent-connectors), and each connector's page at `https://wiro.ai/connectors/{slug}`.

> **Discovery is canonical.** Skill keys evolve as agent templates are updated. To see the exact keys for a specific agent instance, always fetch `POST /UserAgent/Detail` first. The top-level `customskills` / `scheduledskills` arrays are the source of truth. The tables below reflect current intended keys; `CustomSkillUpsert` with a key the agent doesn't have creates a user-created row: a scheduled task when you send `interval` (or a `cs-cron-` key), else a preference.

### Preferences (Editable Instructions)

| Agent | Skill Key | What It Controls |
|-------|-----------|-----------------|
| Every template except Voice Receptionist | `approval-policy` | What waits for your approval before the agent acts, and the words that approve it |
| Social Manager | `content-tone` | Brand voice, hashtags, posting style |
| Blog Content Editor | `content-strategy` | Writing style, topics, research rules |
| App Review Support | `review-preferences` | Response tone, support channels |
| Google Review Manager | `review-preferences` | Reply tone, length by rating, contact line, sign-off and house rules |
| App Event Manager | `event-preferences` | Event regions, holiday priorities |
| Push Notification Manager | `push-preferences` | Push tone, language, targeting |
| Newsletter Manager | `newsletter-strategy` | Topics, tone, audience, frequency |
| Lead Generation Manager | `lead-strategy` | ICP definition, outreach tone |
| Google Ads Manager | `ad-strategy`, `google-ads-strategy`, `audience-strategy`, `attribution-strategy`, `shopping-strategy`, `video-strategy`, `learning-phase-rules`, `adjust-strategy`, `roasit-strategy` | Target audience, budget goals; Google Ads tracking gates, kill thresholds and bidding defaults; Customer Match and remarketing audiences; attribution and conversion goals; Shopping feeds and campaigns; YouTube video campaigns; learning-phase limits; Adjust and Roasit ROAS reporting |
| Meta Ads Manager | `ad-strategy`, `meta-ads-strategy`, `adjust-strategy`, `roasit-strategy` | Target audience, creative preferences; Meta tracking gates, attribution window, kill thresholds and placements; Adjust and Roasit ROAS reporting |
| TikTok Ads Manager | `ad-strategy`, `tiktok-ads-strategy`, `adjust-strategy`, `roasit-strategy` | Target audience, budget goals; TikTok tracking gates, kill thresholds, placement, Spark Ads and Smart+ rules; Adjust and Roasit ROAS reporting |
| Video Creator | `video-preferences`, `saved-logins` | Default format, length, voice, look, music, captions and ending card; test accounts for the screens behind a login |
| Voice Receptionist | `voice-config` | Working hours, caller classification, pricing and escalation rules |

### Scheduled Tasks

> Scheduled task keys are defined **per agent template** and may be updated over time. The table below reflects the current keys and default cron expressions shipped with Wiro's built-in agent templates, but the source of truth for any specific deployed agent is always `POST /UserAgent/Detail` → top-level `scheduledskills`.

| Agent | Skill Key | Cron | What It Does |
|-------|-----------|------|--------------|
| Social Manager | `cs-cron-social-content-scanner` | `0 */4 * * *` | Content discovery and draft posts with rotating strategies (reads `content-tone`) |
| Social Manager | `cs-cron-social-drive-scanner` | `0 10 * * *` | Scans Google Drive for new post assets and prepares posts |
| Blog Content Editor | `cs-cron-blog-scanner` | `0 9 * * *` | Topic discovery and article drafting (reads `content-strategy`) |
| Blog Content Editor | `cs-cron-blog-gmail-checker` | `*/30 * * * *` | Checks the inbox for topic requests and writing instructions |
| App Review Support | `cs-cron-review-scanner` | `0 */2 * * *` | Scans App Store and Google Play for new reviews and prepares replies (reads `review-preferences`) |
| App Event Manager | `cs-cron-app-event-scanner` | `0 9 * * 1` | Scans global holidays and suggests App Store in-app events (reads `event-preferences`) |
| Push Notification Manager | `cs-cron-push-scanner` | `0 9 * * *` | Scans holidays and prepares push notification suggestions (reads `push-preferences`) |
| Push Notification Manager | `cs-cron-push-dispatcher` | `0 * * * *` | Sends queued push notifications on schedule |
| Newsletter Manager | `cs-cron-newsletter-sender` | `0 9 * * 1` | Newsletter drafting and sending (reads `newsletter-strategy`) |
| Newsletter Manager | `cs-cron-newsletter-subscriber-scanner` | `0 10 * * *` | Daily subscriber list health check and bounce monitoring |
| Lead Generation Manager | `cs-cron-lead-prospect-scanner` | `0 10 * * 1` | Weekly prospect search, enrichment and scoring (reads `lead-strategy`) |
| Lead Generation Manager | `cs-cron-lead-outreach-reporter` | `0 9 * * *` | Daily outreach performance report |
| Lead Generation Manager | `cs-cron-lead-reply-handler` | `0 */4 * * *` | Checks new replies, analyzes sentiment and proposes responses |
| Google Ads Manager | `cs-cron-googleads-performance-reporter` | `0 9 * * *` | Daily performance report with recommendations (reads `ad-strategy`) |
| Google Ads Manager | `cs-cron-googleads-recommendations-fetcher` | `0 8 * * *` | Daily Google Ads recommendations: safe items become low-risk suggestions, risky ones wait for your approval |
| Google Ads Manager | `cs-cron-googleads-competitor-scanner` | `0 10 * * 1` | Weekly competitor analysis, keyword opportunities and account health audit |
| Google Ads Manager | `cs-cron-googleads-holiday-planner` | `0 10 * * 3` | Upcoming holidays and seasonal campaign suggestions |
| Google Ads Manager | `cs-cron-googleads-audience-refresher` | `0 7 * * *` | Daily Customer Match refresh from a connected CRM (HubSpot, Apollo, lemlist) or a Google Drive CSV |
| Google Ads Manager | `cs-cron-googleads-drive-scanner` | `0 10 * * *` | Scans Google Drive for new creative folders and proposes campaigns |
| Google Ads Manager | `cs-cron-merchant-center-scanner` | `30 8 * * *` | Daily Merchant Center product feed health check (runs only when Merchant Center is connected) |
| Google Ads Manager | `cs-cron-ga4-attribution-auditor` | `0 11 * * 1` | Weekly conversion tracking and attribution health audit (cross-checks Google Ads with GA4 when connected) |
| Google Ads Manager | `cs-cron-adjust-creative-roas-reporter` | `0 10 * * *` | Daily Adjust creative-level ROAS report with scale/pause recommendations |
| Google Ads Manager | `cs-cron-roasit-creative-roas-reporter` | `30 10 * * *` | Daily Roasit creative-level ROAS report with scale/pause recommendations |
| Google Ads Manager | `cs-cron-ads-recommendation-cleanup` | `0 0 * * *` | Nightly cleanup of expired recommendations |
| Meta Ads Manager | `cs-cron-metaads-performance-reporter` | `0 9 * * *` | Daily performance report with creative health, audience analysis and recommendations (reads `ad-strategy`) |
| Meta Ads Manager | `cs-cron-metaads-audience-scanner` | `0 10 * * 1` | Weekly audience, creative health and account health audit |
| Meta Ads Manager | `cs-cron-metaads-holiday-planner` | `0 10 * * 3` | Upcoming holidays and seasonal campaign suggestions |
| Meta Ads Manager | `cs-cron-metaads-drive-scanner` | `0 10 * * *` | Scans Google Drive for new creative folders and proposes campaigns |
| Meta Ads Manager | `cs-cron-ga4-attribution-auditor` | `0 11 * * 1` | Weekly conversion tracking and attribution health audit (cross-checks Google Ads with GA4 when connected) |
| Meta Ads Manager | `cs-cron-adjust-creative-roas-reporter` | `0 10 * * *` | Daily Adjust creative-level ROAS report with scale/pause recommendations |
| Meta Ads Manager | `cs-cron-roasit-creative-roas-reporter` | `30 10 * * *` | Daily Roasit creative-level ROAS report with scale/pause recommendations |
| Meta Ads Manager | `cs-cron-ads-recommendation-cleanup` | `0 0 * * *` | Nightly cleanup of expired recommendations |
| TikTok Ads Manager | `cs-cron-tiktokads-performance-reporter` | `0 9 * * *` | Performance reporting per advertiser (reads `ad-strategy`); when the TikTok sign-in has expired it stops and says TikTok Ads needs reconnecting |
| TikTok Ads Manager | `cs-cron-tiktokads-audience-scanner` | `0 10 * * 1` | Weekly audience, creative health and account health audit |
| TikTok Ads Manager | `cs-cron-tiktokads-holiday-planner` | `0 10 * * 3` | Upcoming holidays and seasonal campaign suggestions |
| TikTok Ads Manager | `cs-cron-tiktokads-drive-scanner` | `0 10 * * *` | Scans Google Drive for new creative folders and proposes TikTok Ads campaigns (does nothing until Google Drive is connected) |
| TikTok Ads Manager | `cs-cron-ga4-attribution-auditor` | `0 11 * * 1` | Weekly conversion tracking and attribution health audit (cross-checks Google Ads with GA4 when connected) |
| TikTok Ads Manager | `cs-cron-adjust-creative-roas-reporter` | `0 10 * * *` | Daily Adjust creative-level ROAS report with scale/pause recommendations |
| TikTok Ads Manager | `cs-cron-roasit-creative-roas-reporter` | `30 10 * * *` | Daily Roasit creative-level ROAS report with scale/pause recommendations |
| TikTok Ads Manager | `cs-cron-ads-recommendation-cleanup` | `0 0 * * *` | Nightly cleanup of expired recommendations |
| Google Review Manager | `cs-cron-google-review-scanner` | `0 */2 * * *` | Scans Google Business Profile locations for new reviews and prepares replies |

### How Preferences and Scheduled Tasks Work Together

Each scheduled task reads its paired preference skill at runtime. The mechanism:

1. `POST /UserAgent/CustomSkillUpsert` writes your preference `value` for key `content-tone` (stored as `cs-content-tone`).
2. When the agent starts, each `customskills` / `scheduledskills` row becomes a skill named by its key: a preference skill with key `cs-content-tone` becomes the skill `cs-content-tone`, and a scheduled task with key `cs-cron-social-content-scanner` becomes `cs-cron-social-content-scanner`.
3. The scheduled task's `value` (on a template agent, always the template's text) references its paired preference by its skill name, `cs-<preference-key>`, for example: `0. Read the cs-content-tone skill first and follow all its rules. 1. ...`
4. At each cron tick, the agent LLM reads `cs-content-tone`, applies your instructions, then executes the scan/report/dispatch workflow.

> **Slug normalization:** the `<slug>` in `cs-<slug>` / `cs-cron-<slug>` is the raw key lowercased with any run of non-alphanumeric characters replaced by a single `-` (leading/trailing dashes trimmed). Template keys already follow this shape so the slug matches 1:1.

This means **your editable preference becomes the single place to customize agent behavior** (brand voice, target audience, content sources, holiday markets, etc.), and the bundled scheduled task is a thin orchestration layer that defers to your preference.

### Using Connectors in Skills

A connected connector gives the agent its tools, named `<slug>__<tool>`, such as `serper__web_search` or `bluesky__create_post`. A template's scheduled tasks call them by these names, and your own custom skills can too: tell the agent which tools to use and when, for example "Research the topic with `serper__web_search` before you write." See [What the Agent Gets](/docs/agent-connectors#what-the-agent-gets).

A template's scheduled task that needs a connector runs only while that connector is connected, so connect the ones a template works with after you deploy it, with [`POST /UserAgent/ConnectorConnect`](/docs/agent-connectors#post-useragentconnectorconnect). The template's `suggestedconnectors` on [`POST /Agent/Detail`](/docs/agent-overview#post-agentdetail) lists them by slug; nothing connects by itself.

Agents can optionally forward operator notifications to a Telegram bot via the `telegram` credential (see [Telegram Channel](/docs/integration-telegram-skills)). This is never required; every agent remains fully usable over web chat and the [Messaging API](/docs/agent-messaging) without a bot configured.

### Built-in Skills

Skills (`util-*`) need no outside account, except the Twilio Voice Channel (`util-twilio-channel`), which takes your Twilio account. Most are rule sets that come with an agent template. These three can be added to any agent with [`SkillsApply`](#turning-skills-on-and-off), on any plan and at no charge:

| Skill | What it adds |
|-------|--------------|
| Weather (`util-weather`) | Current weather and a 9-day forecast for any place: temperature, rain, wind and UV from MET Norway's open forecast data, with the place found on OpenStreetMap. |
| Diagrams (`util-diagram`) | Flowcharts, architecture and sequence diagrams, state machines, data models, mind maps, timelines, Gantt plans and concept drawings as PNG images with an editable SVG copy, checked for overlapping or cut-off text. |
| Video Creator (`util-video-creator`) | The Video Creator's playbook: finished videos with voice-over, music and captions from a website or web app (behind a login too), an app-store listing, a document, an article or product photos; 16:9 or 9:16, up to 3 minutes. It needs Video Story & Shots (`util-video-shots`), Document Videos (`util-video-docs`) and Motion Effects (`util-motion-effects`), and runs the video's models with the agent's Wiro project, which pays for them (see [Using Wiro AI Models from Your Agent](#using-wiro-ai-models-from-your-agent)). Motion Effects needs Video Creator too, so the four are on together: with `SkillsApply` send all four in one call, `{ "util-video-creator": true, "util-video-shots": true, "util-video-docs": true, "util-motion-effects": true }`. Deploy's `skills` and an `add` setup card turn the rest on by themselves. |

The voice channels are Skills too: Twilio Voice Channel (`util-twilio-channel`) answers phone calls through Twilio Voice and saves its account in the `twilio-voice` credential (see [Twilio Voice Channel](/docs/integration-twiliovoice-skills)), and Web Voice Channel (`util-web-channel`) takes calls in the browser (see [Web Voice Channel](/docs/integration-webvoice-skills)). Each needs Voice Receptionist Rules (`util-voice-receptionist`) and Voice Call Prep Rules (`util-voice-call-prep`). With [`SkillsApply`](#turning-skills-on-and-off) send them in the same call, for example `{ "util-twilio-channel": true, "util-voice-receptionist": true, "util-voice-call-prep": true }`: sent alone while the two are off, a channel is refused with code `101` and `deps[]`. Deploy's `skills` turns them on by itself.

`POST /Skills/List` with `{ "category": "util" }` returns every Skill.

> **No restart for most changes:** `SkillsApply`, `CustomSkillUpsert`, `CustomSkillRename`, `CustomSkillDelete` and `CustomSkillRevert` reach a running agent (status 4) with no restart: it uses the new skill set, or the new or changed skill or task (`cs-approval-policy` included), from its next message. Turning `util-voice-receptionist`, `util-twilio-channel`, `util-web-channel` or `util-newsletter-compose` on or off restarts it, as credential updates do. `live` and `restarting` in the answer say which happened. See [Live Changes and Restarts](/docs/agent-overview#live-changes-and-restarts).

## Using Wiro AI Models from Your Agent

An agent runs Wiro's own AI models (image, video, audio and LLM generation, cover images, model discovery) two ways:

- **With its Wiro project.** Skills such as Video Creator (`util-video-creator`) and the voice skills run their models with the agent's Wiro project, the `wiro` credential. Pick or create a project at [wiro.ai/panel/project](https://wiro.ai/panel/project) and connect it in the agent's settings, or through the API with `POST /UserAgent/CredentialProjectBind`. Each run is billed to the wallet of the workspace that owns that project (your personal wallet, or the team wallet for a team project). See [The agent's Wiro project](/docs/agent-credentials#the-agents-wiro-project).
- **With Wiro AI Models (`wiro`).** The Wiro AI Models connector gives the agent Wiro's own model and task tools (`wiro__*`), the ones its `tools` on [`AgentConnector/Detail`](/docs/agent-connectors#post-agentconnectordetail) list, such as running any model. They act with the agent's own Wiro project, the same one: connecting the connector binds the project you pick to the agent, as `CredentialProjectBind` does. Their runs are the agent's own, billed to that project's wallet under the agent's spend limit and Model Access rule. See [Wiro AI Models](/docs/agent-connectors#the-wiro-connector).

The agent starts without a Wiro project. Where the template marks the project required (`optional: false`), `UserAgent/Detail` reads `setuprequired: true` until it is connected.

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/CredentialProjectBind" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "projectid": "your-project-id"
  }'
```

`credentials.wiro.apikey` on `POST /UserAgent/Detail` holds the project's key once the project is connected.

### Project key vs operator key

`credentials.wiro.apikey` is a **per-agent Wiro project key**: the agent runs Wiro models with it. The `x-api-key` header you send to the public Wiro endpoints from your own backend (e.g. `POST /UserAgent/Deploy`, `POST /Run`) is your **operator key**: it authenticates your request. These are two roles, and they are the same key only when you bind the project of the key you call with. If you're building on top of Wiro programmatically and want to call the Run / Task / LLM APIs directly from your own backend, use your operator key (see [Run a Model](/docs/run-a-model) and [LLM & Chat Streaming](/docs/llm-chat-streaming)).

## Update Rules Summary

| Operation | Endpoint | Allowed on preset strategy (`_source: preset-strategy`) | Allowed on skill-bundled cron (`_source: skill-bundle`) | Allowed on user-created cron (`_source: user-created`) |
|---|---|---|---|---|
| Write `value` | `CustomSkillUpsert` | Yes | **No on a template agent: a different text is refused** (the template's text sent back is no change); yes on a custom build | Yes |
| Write `interval` | `CustomSkillUpsert` | **No: silently dropped** (strategies aren't scheduled) | Yes | Yes |
| Write `enabled` | `CustomSkillUpsert` | Yes (disabling suppresses the strategy end-to-end) | Yes | Yes |
| Write `description` | `CustomSkillUpsert` | **No: a changed text is rejected** with `This skill comes with the agent's template, so its description can't be changed for one agent.` (the current text is ignored) | **No: a changed text is rejected** with `This skill comes with the agent's template, so its description can't be changed for one agent.` (the current text is ignored) | Yes |
| Create | `CustomSkillUpsert` with a new key | n/a | n/a | Yes |
| Rename key (+ optional description) | `CustomSkillRename` | **No: preset-forbidden** | **No: preset-forbidden** | Yes (flavour preserved; `cs-cron-*` ↔ `cs-*` rejected) |
| Delete | `CustomSkillDelete` | **Rejected with `suggestion: "disable-via-upsert"`** | **Rejected with `suggestion: "disable-via-upsert"`** | Yes (hard delete: live row + full history purged) |
| Read history | `CustomSkillHistory` | Yes | Yes | Yes (post-rename, the chain is migrated under the new key; a `rename` event marks the transition) |
| Revert to preset | `CustomSkillRevert` (`source: "preset"`) | Yes | Yes (resets `interval` / `enabled` to preset defaults) | Yes (deletes the row if no preset baseline exists) |
| Revert to a version | `CustomSkillRevert` (`source: "history"`) | Yes | Yes; on a template agent the version's schedule and switch only, since the text stays the template's (a version that differs only in its text is a `no-op`) | Yes |

- Send only the fields you want to change. Omitted fields keep their current values.
- A key the agent doesn't have creates a user-created row: a scheduled task when you send `interval` (or a `cs-cron-` key), else a preference.
- To clear a cron schedule, call `CustomSkillUpsert` with `enabled: false`. Setting `interval: ""` or `null` also clears it.
- A schedule must be one the agent can run, written as five fields, `minute hour day month weekday`, such as `0 9 * * 1-5`. A schedule the agent can't run, or one whose date never comes, such as 30 February, is refused and nothing is saved. The error says what is wrong and what to write, for example `This schedule can't run. The hour field takes 0 to 23. A schedule has five fields: minute hour day month weekday, for example 0 9 * * 1-5.`
- Skill toggles (top-level `skills[]`) are a separate endpoint (see [Turning Skills On and Off](#turning-skills-on-and-off) and [`SkillsApply`](/docs/agent-overview#post-useragentskillsapply)).

### What happens when Wiro updates an agent template

Skills occasionally evolve on Wiro's side: new preset strategies, new bundled crons, improved instructions. Deployed instances are reconciled with the latest template without destroying your edits:

| Row type | Behavior on template update |
|----------|----------------------------|
| Preset strategy (`_source: "preset-strategy"`) | Your `value` is **preserved** (rows with `useredited: true`). New placeholder structure in the template appears only on fresh deploys. |
| Skill-bundled cron (`_source: "skill-bundle"`) | The `value` (cron instructions) is **re-materialized** from the new template. Your custom `interval` and `enabled` are preserved when `useredited: true`. |
| New preset strategy upstream | Added to your instance with the template's default `value`. |
| Preset strategy removed upstream | Removed from your instance on the next reconciliation. |
| User-created cron | Always preserved. |

Cascade reconciliation is async: each template update enqueues a job that fans out to every deployed useragent in the background. Per-useragent edits (`useredited: true`) are protected from being overwritten by the cascade.
