# Agent Skills

Configure agent behavior with editable preferences, scheduled automation tasks, and skill toggles. Browse the platform's skill registry and inspect every skill's pricing, capabilities, and credential requirements.

> **Read & write paths at a glance:**
>
> | Operation | Endpoint |
> |-----------|----------|
> | Browse all skills (registry) | [`POST /Skills/List`](#post-skillslist) (public) |
> | Inspect a single skill | [`POST /Skills/Detail`](#post-skillsdetail) (public) |
> | Find the credential a skill needs | [`POST /Skills/CredentialSchema`](#post-skillscredentialschema) (public) |
> | List the closed-set capability vocabulary | [`POST /Skills/Capabilities`](#post-skillscapabilities) (public) |
> | Edit a preference skill's `value` or a cron's `interval`/`enabled` | [`POST /UserAgent/CustomSkillUpsert`](/docs/agent-overview#post-useragentcustomskillupsert) |
> | Delete a user-created cron skill | [`POST /UserAgent/CustomSkillDelete`](/docs/agent-overview#post-useragentcustomskilldelete) |
> | Read version history of a custom skill | [`POST /UserAgent/CustomSkillHistory`](/docs/agent-overview#post-useragentcustomskillhistory) |
> | Revert a custom skill to preset / a historical version | [`POST /UserAgent/CustomSkillRevert`](/docs/agent-overview#post-useragentcustomskillrevert) |
> | Toggle one or more integration skills (the top-level `skills` array, e.g. `int-instagram-post`) on/off | [`POST /UserAgent/SkillsApply`](/docs/agent-overview#post-useragentskillsapply) |
> | Apply a batch of skill toggles + optional tier change | [`POST /UserAgent/SkillsApply`](/docs/agent-overview#post-useragentskillsapply) |
> | Live tier-pricing preview for a hypothetical skill set | [`POST /UserAgent/PricingPreview`](/docs/agent-overview#post-useragentpricingpreview) |
>
> Read responses from `POST /UserAgent/Detail` expose the composed `customskills[]` array (preference skills + non-cron user-created skills), the `scheduledskills[]` array (cron skills), and the `skills[]` array of enabled skill names as top-level fields on the useragent object.

## Skill Registry vs Custom Skills

Two concepts share the word "skill" in the agent system. Keep them straight:

| Concept | What it is | Where it lives | API surface |
|---------|------------|----------------|-------------|
| **Registry skills** | Platform-shipped capabilities — Wiro defines them, they have pricing recipes, credential requirements, and runtime tools. Examples: `int-instagram-post`, `int-gmail-check`, `int-wordpress-post`, `int-wiro-generator`. | The skill registry (git-tracked JSON definitions). | `POST /Skills/List` / `POST /Skills/Detail` (read), `POST /UserAgent/SkillsApply` (toggle on/off per useragent). |
| **Custom skills** | User-editable preference text (`cs-content-tone`) or scheduled tasks (`cs-cron-blog-scanner`) that live ON a useragent. They reference registry skills (e.g. a cron skill calls into `int-wordpress-post`) but are scoped to one instance. | Per useragent on the Wiro platform. | `POST /UserAgent/CustomSkillUpsert` / `POST /UserAgent/CustomSkillDelete` / `POST /UserAgent/CustomSkillHistory` / `POST /UserAgent/CustomSkillRevert`. |

The rest of this page documents both — the registry endpoints first (so you can discover what's possible), then the per-useragent endpoints (so you can configure them).

## Skill Registry Endpoints

These four endpoints are **public — no authentication required**. They return data straight from the skill registry.

### **POST** /Skills/List

Lists all skills in the registry.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `category` | string | No | Filter by `"int"` (integration with a third-party service) or `"rule"` (rule-only — no credential, no external API). |
| `capability` | string | No | Filter by capability key (see [`POST /Skills/Capabilities`](#post-skillscapabilities) for the closed-set vocabulary). |
| `user_invocable` | boolean | No | When `true`, only return skills end users can call directly through chat. `int-wiro-generator` and other non-user-invocable skills are hidden. |
| `requires_credentials` | boolean | No | Filter by whether the skill requires a credential. |
| `wiro_connect_pending` | boolean | No | Filter by the "Wiro mode coming soon" flag (Meta integrations while Wiro's app is under review). |
| `name_in` | array<string> | No | Restrict the response to a specific list of skill names. |

##### Response

```json
{
  "result": true,
  "errors": [],
  "total": 87,
  "skills": [
    {
      "name": "int-instagram-post",
      "category": "int",
      "version": "1.0.0",
      "title": "Instagram Post",
      "description": "Post carousel feed and multi-story via Meta Graph API.",
      "icon": "/images/icons/skills/instagram.svg",
      "brand_color": "#e4405f",
      "brand_text_color": "#ffffff",
      "brand_logo_filter": "brightness(0) invert(1)",
      "docs_url": "integration-instagram-skills",
      "requires_credentials": true,
      "credential_key": "instagram",
      "additional_credential_keys": [],
      "capabilities": ["social_publishing"],
      "depends_on": [],
      "conflicts_with": [],
      "user_invocable": true,
      "deprecated": false,
      "replacement": null,
      "pricing": {
        "monthly_price_weight_usd": 5.5,
        "monthly_credits_weight": 200,
        "credit_costs": {
          "message":    6,
          "create":     58,
          "modify":     29,
          "regenerate": 58
        }
      }
    }
  ]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Canonical skill key, **including the registry prefix** (`int-*` for integration skills, `util-*` for utility / rule-only skills, `cs-cron-*` for bundled cron skills). Use this exact value in `SkillsApply` and `Deploy.body.skills`. |
| `category` | `string` | `"int"` (third-party integration) or `"rule"` (rule-only — no credential, no external API). |
| `version` | `string` | Semver for the registry entry. Bumped when the skill's tool surface or pricing weights change. |
| `title` | `string` | Display name shown on chips / filters / cards. |
| `description` | `string` | One-line summary used on marketing surfaces. |
| `icon` | `string` | Path or URL to the brand icon (relative paths are absolutized to `https://wiro.ai/...` on the wire). |
| `brand_color` | `string\|null` | Brand background colour (hex) for chips and cards. |
| `brand_text_color` | `string\|null` | Foreground colour to render on top of `brand_color`. |
| `brand_logo_filter` | `string\|null` | CSS `filter` value applied to monochrome SVG icons (e.g. `"brightness(0) invert(1)"`) so the same source SVG renders correctly on light and dark brand colours. |
| `docs_url` | `string\|null` | Slug or path of the integration page on this docs site. Frontends prefix with `/docs/` when rendering. |
| `requires_credentials` | `boolean` | `true` when `credential_key` is set and the credential is not entirely platform-managed. |
| `credential_key` | `string\|null` | The provider this skill needs (`"instagram"`, `"google-ads"`, …). `null` for rule-only / platform-managed skills. Use [`POST /Credentials/Detail`](/docs/agent-credentials#post-credentialsdetail) to inspect the schema. |
| `additional_credential_keys` | `array<string>` | Secondary credentials the skill can also write into (e.g. `int-appstore-reviews` writes both `apple-appstore` and the optional `var-support-email` variable bag). Empty `[]` for skills with a single credential. |
| `capabilities` | `array<string>` | High-level snake_case capability tags from the closed vocabulary returned by [`POST /Skills/Capabilities`](#post-skillscapabilities). Drives the "Find skills that can: ___" picker. |
| `depends_on` | `array<string>` | Other skill names that must be enabled. Wiro auto-enables transitive deps when you toggle the parent skill on. |
| `conflicts_with` | `array<string>` | Mutually-exclusive skill names. `SkillsApply` rejects toggle batches that would enable two conflicting skills. |
| `user_invocable` | `boolean` | `true` when end users can call the skill via chat. `int-wiro-generator` is `false` (internal-only). |
| `deprecated` | `boolean` | `true` for skills slated for removal — `replacement` (if any) names the migration target. |
| `replacement` | `string\|null` | When `deprecated: true`, the registry-recommended successor skill name. |
| `pricing` | `object` | Per-skill pricing recipe (see below). |

**`pricing` object:**

| Sub-field | Type | Description |
|-----------|------|-------------|
| `monthly_price_weight_usd` | `number` | Weight (USD) the skill contributes to the agent's Starter monthly price. The resolver sums weights across the agent's enabled-skill closure (incl. transitive `depends_on`); Pro multiplies the total by `tiermultiplier`. |
| `monthly_credits_weight` | `number` | Weight (credits) the skill contributes to the Starter monthly credit allocation. Same closure + multiplier semantics as price. |
| `credit_costs` | `object` | `{ message, create, modify, regenerate }` — credits charged per action when the skill produces output. The agent's exposed `peractioncosts` is `max()` across enabled skills' `credit_costs`. Free / utility skills omit the field or set zeros. |

> **Optional filter `wiro_connect_pending`.** When you query with `wiro_connect_pending: true` you'll only see Meta-platform skills (`int-instagram-post`, `int-facebook-page-post`, `int-metaads-*`) whose Wiro-shared OAuth client is awaiting App Review. Those skills are still usable in **own** mode (your own Meta Developer App). The flag itself does not appear on the skill object — it lives on the credential entry under [`POST /Credentials/Detail`](/docs/agent-credentials#post-credentialsdetail).

### **POST** /Skills/Detail

Returns a single skill by name.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes | Canonical skill name **with prefix** (e.g. `"int-instagram-post"`, `"util-html-strip"`, `"cs-cron-content-scanner"`). |

##### Response

```json
{
  "result": true,
  "errors": [],
  "skill": {
    "name": "int-instagram-post",
    "category": "int",
    "version": "1.0.0",
    "title": "Instagram Post",
    "description": "Post carousel feed and multi-story via Meta Graph API.",
    "icon": "/images/icons/skills/instagram.svg",
    "brand_color": "#e4405f",
    "brand_text_color": "#ffffff",
    "brand_logo_filter": "brightness(0) invert(1)",
    "docs_url": "integration-instagram-skills",
    "requires_credentials": true,
    "credential_key": "instagram",
    "additional_credential_keys": [],
    "capabilities": ["social_publishing"],
    "depends_on": [],
    "conflicts_with": [],
    "user_invocable": true,
    "deprecated": false,
    "replacement": null,
    "pricing": {
      "monthly_price_weight_usd": 5.5,
      "monthly_credits_weight": 200,
      "credit_costs": {
        "message":    6,
        "create":     58,
        "modify":     29,
        "regenerate": 58
      }
    }
  }
}
```

Returns the **full registry entry** — same shape as a row from `Skills/List`. The endpoint surfaces every field the registry has stored; Wiro never trims the response based on caller role. If the skill is not found you get `{ "result": false, "errors": [{ "code": 404, "message": "Skill not found: <name>" }] }`.

### **POST** /Skills/CredentialSchema

Convenience endpoint — returns the credential entry for a given skill name in one call. Useful when you've discovered a skill via `Skills/List` and want to render the credential form without a separate `Credentials/Detail` round-trip.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes | Skill name (with the registry prefix, e.g. `"int-instagram-post"`). |

##### Response

```json
{
  "result": true,
  "errors": [],
  "credential": {
    "key": "instagram",
    "title": "Instagram",
    "icon": "/images/icons/skills/instagram.svg",
    "brand_color": "#e4405f",
    "brand_text_color": "#ffffff",
    "brand_logo_filter": "none",
    "docs_url": "integration-instagram-skills",
    "credential_mode": "oauth",
    "connection_modes": ["wiro", "own"],
    "wiro_connect_pending": true,
    "credential_schema": [
      {
        "key": "appid",
        "type": "text",
        "label": "App ID",
        "required": true,
        "pattern": "^[0-9]+$",
        "help": "<ol><li>Go to Meta for Developers → My Apps</li><li>Create App → Other → Business</li><li>Copy the App ID from the dashboard</li><li>Add Product → Facebook Login → Set Up</li><li>Add OAuth Redirect URI: https://api.wiro.ai/v1/UserAgentOAuth/IGCallback</li></ol>",
        "oauth_managed": true,
        "only_in_modes": ["own"]
      },
      {
        "key": "appsecret",
        "type": "password",
        "label": "App Secret",
        "required": true,
        "show_toggle": true,
        "help": "<ol><li>Meta for Developers → select your app</li><li>App Settings → Basic</li><li>Show next to App Secret and copy</li></ol>",
        "oauth_managed": true,
        "only_in_modes": ["own"]
      },
      {
        "key": "igusername",
        "type": "text",
        "label": "Connected Account",
        "required": false,
        "auto_filled_by_oauth": true,
        "readonly_when_connected": true
      }
    ],
    "oauth_provider": {
      "auth_method_value": "wiro",
      "connect_endpoint": "/UserAgentOAuth/IGConnect",
      "disconnect_endpoint": "/UserAgentOAuth/IGDisconnect",
      "status_endpoint": "/UserAgentOAuth/IGStatus",
      "connect_button_label": "Connect with Instagram",
      "connect_button_icon": "/images/icons/skills/instagram.svg",
      "connect_button_brand_color": "#e4405f",
      "connect_button_text_color": "#ffffff",
      "connect_button_logo_filter": "none",
      "username_field": "igusername",
      "return_query_param": "ig_connected",
      "return_error_param": "ig_error",
      "return_error_detail_param": "ig_error_detail",
      "account_picker": null,
      "extra_step": null
    },
    "used_by_skills": ["int-instagram-post"]
  }
}
```

Returns the **full registry credential entry** — same shape as a row from [`POST /Credentials/Detail`](/docs/agent-credentials#post-credentialsdetail). Returns `{ "result": false, "errors": [{ "code": 404, "message": "No credential associated with skill: <name>" }] }` if the skill exists but has `credential_key: null` (rule-only / platform-managed) or if the skill is unknown.

### **POST** /Skills/Capabilities

Returns the closed-set vocabulary of high-level capability tags. Use this to build a "Find skills that can: ___" picker in your UI, or to filter `Skills/List` via the `capability` parameter.

##### Response

```json
{
  "result": true,
  "errors": [],
  "capabilities": [
    { "name": "direct_reporting",         "description": "Skill generates direct reports on operator request" },
    { "name": "attribution_cross_check",  "description": "Cross-check platform conversions vs GA4 paid traffic" },
    { "name": "cross_check",              "description": "Cross-system data validation" },
    { "name": "campaign_management",      "description": "Create/pause/modify ad campaigns" },
    { "name": "campaign_reporting",       "description": "Campaign performance reports" },
    { "name": "approval_flow",            "description": "Approval command grammar for operator-gated actions" },
    { "name": "recommendation_ledger",    "description": "Recommendation queue/log management" },
    { "name": "recommendation_execution", "description": "Execute approved recommendations" },
    { "name": "content_generation",       "description": "Generate content (text, media)" },
    { "name": "creative_generation",      "description": "Generate ad creatives" },
    { "name": "image_generation",         "description": "Generate images" },
    { "name": "video_generation",         "description": "Generate videos" },
    { "name": "human_copywriting",        "description": "Enforce anti-AI human copy rules" },
    { "name": "anti_ai_tone",             "description": "Reject AI-generated tone patterns" },
    { "name": "memory_management",        "description": "Manage memory/*.json hygiene (size limits, trim, dedupe, schema)" },
    { "name": "markdown_reporting",       "description": "Structured markdown reports (tables, code blocks, splits)" },
    { "name": "store_review_response",    "description": "Craft App Store / Google Play review responses" },
    { "name": "outreach_compliance",      "description": "Outreach PII/opt-out/consent rules (GDPR, CAN-SPAM)" },
    { "name": "web_publishing",           "description": "Publish web content (WordPress, etc.)" },
    { "name": "email_publishing",         "description": "Send emails / newsletters" },
    { "name": "social_publishing",        "description": "Post to social platforms (Twitter, IG, FB, LI, TikTok)" },
    { "name": "push_notification",        "description": "Send push notifications (FCM)" },
    { "name": "lead_enrichment",          "description": "Enrich prospect data (Apollo, HubSpot)" },
    { "name": "sequence_automation",      "description": "Run outreach sequences (Lemlist, Apollo)" },
    { "name": "multi_platform_detection", "description": "Auto-detect available platforms" },
    { "name": "holiday_discovery",        "description": "Discover global holidays (Calendarific)" },
    { "name": "product_feed_management",  "description": "Manage product feeds (Merchant Center)" },
    { "name": "review_monitoring",        "description": "Monitor store reviews (App Store, Google Play)" },
    { "name": "app_metadata",             "description": "Fetch app store metadata (description, pricing, features)" },
    { "name": "event_management",         "description": "Manage app events (App Store in-app events)" },
    { "name": "file_asset_management",    "description": "Manage asset files from cloud storage (Drive)" }
  ]
}
```

Capability names are **snake_case** strings. Pass any of them as the `capability` parameter to `Skills/List` to filter (e.g. `{ "capability": "social_publishing" }` returns every skill that publishes to a social platform).

## Custom Skills — Discovery (Per-Instance)

Once you've deployed a useragent, its current custom skills live under `customskills[]` (preferences + non-cron user-created skills) and `scheduledskills[]` (cron skills) on the `POST /UserAgent/Detail` response.

**Request:**

```json
{ "guid": "your-useragent-guid" }
```

**Response** (top-level `customskills` and `scheduledskills` excerpt — same shape as on `POST /UserAgent/Detail`):

```json
{
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
      "key": "cs-cron-weekly-health-check",
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
  "skills": ["int-instagram-post", "int-wiro-generator"]
}
```

> The exact key names depend on the agent template. Always fetch `POST /UserAgent/Detail` to see the real list for your deployed instance — skill keys, default cron schedules, and even the set of skills can evolve as templates are updated.

| Field | Type | Description |
|-------|------|-------------|
| `key` | string | Canonical key. **Always carries the `cs-` runtime prefix.** Strategies are `cs-<slug>`; crons are `cs-cron-<slug>`. The server normalises bare slugs you send to `CustomSkillUpsert` — `"content-tone"` becomes `cs-content-tone`, `"weekly-health-check"` (with `usercreated: true`) becomes `cs-cron-weekly-health-check`. |
| `value` | string | Skill instructions / cron prompt body. Populated only for editable preference skills and user-created entries; bundled crons have it empty. |
| `description` | string | Human-readable description. **Read-only — set by the agent template or by the user at create time, never accepted in `Upsert` payloads for preset skills.** |
| `enabled` | boolean | Whether the cron is active. Writable on cron skills; ignored on preference skills. |
| `interval` | string \| null | Cron expression for scheduled execution, or `null` for preference skills. Writable on cron skills; ignored on preferences. |
| `_source` | string | `preset-strategy` (editable preference), `skill-bundle` (cron owned by an integration skill), or `user-created` (cron added via `CustomSkillUpsert` with `usercreated: true`). |
| `_editable` | boolean | Convenience flag: `true` for preset strategies and user-created rows (you can write `value`), `false` for skill-bundled crons (you can only write `enabled` / `interval`). |
| `_user_created` | boolean | Present (and `true`) only on `_source: "user-created"` rows. Omitted on preset strategies and skill-bundled crons. |

### Understanding `_source`

Agent responses merge three sources into a single set of custom-skill rows:

1. **Preset strategies** (`_source: "preset-strategy"`) — preferences defined by the agent preset (e.g. `cs-content-tone`, `cs-ad-strategy`). You can write `value`.
2. **Bundled crons** (`_source: "skill-bundle"`) — cron tasks shipped inside a specific integration skill. Automatically materialized when the integration is enabled. You can write `interval` and `enabled`, but **not** `value` (the skill owns the cron instruction text).
3. **User-created rows** (`_source: "user-created"`) — entries added via `POST /UserAgent/CustomSkillUpsert` (with `usercreated: true` for crons). You can write all fields.

## Updating Preference Skills

Preference skills (`_source: "preset-strategy"`, `_editable: true`) let you customize the agent's behavior by editing its instructions.

Send one `CustomSkillUpsert` call per skill. Unspecified skills are untouched. **Send only `value`** — `enabled`, `interval`, and `description` are silently dropped on preset strategies (they have no runtime effect since strategies are read on-demand by cron tasks via `cs-<slug>`; they're never scheduled themselves).

### Example: Social Manager — Brand Voice

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

Response: `{ "result": true, "errors": [] }`. If the agent was running it automatically restarts.

### Example: Lead Generation Manager — ICP Definition

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

Scheduled tasks are cron skills — bundled ones (`_source: "skill-bundle"`) ship with integration skills and run automatically when the integration is enabled. User-created crons (`_source: "user-created"`) are added at any time.

> **For bundled crons, only `enabled` and `interval` are writable.** The task body (`value`) is owned by the integration skill and re-materialised on every container restart. To change **what** a bundled scheduled task does, edit the paired preference skill (e.g. `content-tone` is read by `cron-content-scanner` at runtime). For user-created crons, all three (`value`, `interval`, `enabled`) are writable.

### Example: Change a bundled cron's frequency

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/CustomSkillUpsert" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "skillkey": "cron-review-scanner",
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
    "skillkey": "cron-content-scanner",
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
    "usercreated": true,
    "description": "Weekly inbox health check"
  }'
```

The server auto-prefixes `skillkey` with `cron-` on user-created crons, so the row above is stored with `key: "cs-cron-weekly-health-check"`. Subsequent upserts can use either form — `"weekly-health-check"`, `"cron-weekly-health-check"`, or `"cs-cron-weekly-health-check"`.

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

Preset-owned crons cannot be deleted — the call returns `This skill belongs to the agent preset and cannot be deleted. Use enabled=false to disable it instead.` with `suggestion: "disable-via-upsert"`. Disable them via `CustomSkillUpsert` + `enabled: false`.

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

## Version History — Audit and Revert

Every write through `CustomSkillUpsert` appends a row to the version history. Read it via `POST /UserAgent/CustomSkillHistory`; revert to any version (or to the preset default) via `POST /UserAgent/CustomSkillRevert`.

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
      "operation": "upsert",
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
      "operation": "upsert",
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

Each entry carries the **BEFORE** state of the action that produced it (the audit-write fires before the table mutation), plus server-computed `prev_*`, `after_*`, and `changed_fields[]` so you don't have to walk the list yourself. `changedby_user` is the resolved actor object — `null` for system / cron writes (sentinel `changedby`) or deleted users. Full field reference and revert flow live in [Agent Overview → CustomSkillHistory](/docs/agent-overview#post-useragentcustomskillhistory).

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

## Toggling Integration Skills

The top-level `skills[]` array on `UserAgent/Detail` lists the integration skills currently enabled on the instance (e.g. `[{ "name": "int-instagram-post" }, { "name": "int-googleads-manage" }]`). To enable, disable, or change tier in one shot, use **`POST /UserAgent/SkillsApply`** — even when you only want to flip a single skill, send it as a one-entry `skills` map. The endpoint:

1. Charges the wallet (or prorates) **once**, not N times.
2. Triggers exactly **one container restart** after the new skill set lands.
3. Uses **idempotency** + a UA-level mutex — concurrent calls or FE retries can't double-apply.
4. Is **atomic** — a payment failure rolls back to the pre-call skill set.

**Single-skill enable:**

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

**Batch toggle + tier upgrade in one call:**

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/SkillsApply" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
    "tier": "pro",
    "idempotencyKey": "550e8400-e29b-41d4-a716-446655440000",
    "skills": {
      "int-instagram-post": true,
      "int-twitterx-post":  true,
      "int-wordpress-post":  false
    }
  }'
```

`idempotencyKey` is required — use a UUID per "user clicks Save" event. The full response shape and error-code table live on [`SkillsApply`](/docs/agent-overview#post-useragentskillsapply).

> **Custom builds only.** Template-deploy useragents reject `SkillsApply` with `Skill changes are only available for custom-built agents.` — skills are inherited from the marketplace agent template and changing them would diverge the instance. To run a different skill set, deploy a custom build (`POST /UserAgent/Deploy` with `custom: true`) and configure its skills there.

> **Bundled crons follow the integration toggle.** When you disable an integration skill (e.g. `int-instagram-post`), every bundled cron it owns (`_source: "skill-bundle"`) is hidden from the top-level `customskills` / `scheduledskills` lists until the integration is re-enabled — you don't need to touch them individually.

## Live Pricing Preview

Before you commit `SkillsApply` (or the user clicks Save in your UI), call `POST /UserAgent/PricingPreview` to see "if I save this, my new monthly price would be $X with Y monthly credits". No state is mutated. See [`PricingPreview`](/docs/agent-overview#post-useragentpricingpreview) for the full response shape.

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/PricingPreview" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "tier": "pro",
    "skillOverrides": {
      "int-twitterx-post": true,
      "int-wordpress-post": false
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
    "skills": ["int-gmail-check", "int-wordpress-post"]
  }'
```

See [Agent Builder](/docs/agent-builder) for the full custom-build walkthrough.

## Full Example: Push Notification Manager

Complete flow — fetch skills, then update preferences and schedules with three separate calls.

**Step 1 — Discover skills.**

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
      "value": "",
      "description": "Scan holidays and craft push notification suggestions",
      "enabled": true,
      "interval": "0 9 * * *",
      "_source": "skill-bundle",
      "_editable": false
    },
    {
      "key": "cs-cron-push-dispatcher",
      "value": "",
      "description": "Send queued push notifications on schedule",
      "enabled": true,
      "interval": "0 * * * *",
      "_source": "skill-bundle",
      "_editable": false
    }
  ]
}
```

**Step 2 — Update each skill with its own call.**

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
    "skillkey": "cron-push-scanner",
    "enabled": true,
    "interval": "0 9 * * 1"
  }'

# 3. Change dispatcher schedule from hourly to every 2 hours
curl -X POST "https://api.wiro.ai/v1/UserAgent/CustomSkillUpsert" \
  -H "Content-Type: application/json" -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-push-agent-guid",
    "skillkey": "cron-push-dispatcher",
    "interval": "0 */2 * * *"
  }'
```

All three requests succeed independently. The agent restarts once — the server coalesces the restart trigger after all three succeed within the same request window.

## Available Skills by Agent

> **Integration setup guides:** Every skill below that needs a third-party connection links to a dedicated integration page with the full OAuth / API key walkthrough, required scopes or permissions, callback URL, troubleshooting, and multi-tenant architecture notes. See the [Integration Catalog](/docs/agent-credentials#integration-catalog) for the full list.

> **Discovery is canonical.** Skill keys evolve as agent templates are updated. To see the exact keys for a specific agent instance, always fetch `POST /UserAgent/Detail` first — the top-level `customskills` / `scheduledskills` arrays are the source of truth. The tables below reflect current intended keys but may lag behind the latest agent template revisions; `CustomSkillUpsert` silently accepts keys that exist on the instance and returns `skill-not-found` for unknown keys without altering other state.

### Preferences (Editable Instructions)

| Agent | Skill Key | What It Controls |
|-------|-----------|-----------------|
| Social Manager | `content-tone` | Brand voice, hashtags, posting style |
| Blog Content Editor | `content-strategy` | Writing style, topics, research rules |
| App Review Support | `review-preferences` | Response tone, support channels |
| App Event Manager | `event-preferences` | Event regions, holiday priorities |
| Push Notification | `push-preferences` | Push tone, language, targeting |
| Newsletter Manager | `newsletter-strategy` | Topics, tone, audience, frequency |
| Lead Generation Manager | `lead-strategy` | ICP definition, outreach tone |
| Google Ads Manager | `ad-strategy` | Target audience, budget goals |
| Meta Ads Manager | `ad-strategy` | Target audience, creative preferences |

### Scheduled Tasks

> Scheduled task keys are defined **per agent template** and may be updated over time. The table below reflects the current keys and default cron expressions shipped with Wiro's built-in agent templates, but the source of truth for any specific deployed agent is always `POST /UserAgent/Detail` → top-level `scheduledskills`.

| Agent | Skill Key | Cron | What It Does |
|-------|-----------|------|--------------|
| Social Manager | `cron-content-scanner` | `0 */4 * * *` | Content discovery + draft generation (reads `content-tone`) |
| Social Manager | `cron-gmail-checker` | `*/30 * * * *` | Inbox monitoring for incoming requests (disabled by default) |
| Social Manager | `cron-drive-scanner` | `0 10 * * *` | Google Drive asset scanning (disabled by default) |
| Blog Content Editor | `cron-blog-scanner` | `0 9 * * *` | Topic discovery + article drafting (reads `content-strategy`) |
| Blog Content Editor | `cron-gmail-checker` | `*/30 * * * *` | Inbox monitoring for topic requests |
| App Review Support | `cron-review-scanner` | `0 */2 * * *` | Store scanning for new reviews (reads `review-preferences`) |
| App Event Manager | `cron-app-event-scanner` | `0 9 * * 1` | Holiday scanning + event suggestions (reads `event-preferences`) |
| Push Notification Manager | `cron-push-scanner` | `0 9 * * *` | Notification content preparation (reads `push-preferences`) |
| Push Notification Manager | `cron-push-dispatcher` | `0 * * * *` | Dispatching queued notifications |
| Newsletter Manager | `cron-newsletter-sender` | `0 9 * * 1` | Newsletter drafting and sending (reads `newsletter-strategy`) |
| Newsletter Manager | `cron-subscriber-scanner` | `0 10 * * *` | Subscriber list health checks |
| Lead Generation Manager | `cron-prospect-scanner` | `0 10 * * 1` | Prospect discovery and scoring (reads `lead-strategy`) |
| Lead Generation Manager | `cron-outreach-reporter` | `0 9 * * *` | Outreach performance reporting |
| Lead Generation Manager | `cron-reply-handler` | `0 */4 * * *` | Reply analysis |
| Google Ads Manager | `cron-performance-reporter` | `0 9 * * *` | Performance reporting (reads `ad-strategy`) |
| Google Ads Manager | `cron-competitor-scanner` | `0 10 * * 1` | Competitor analysis |
| Google Ads Manager | `cron-holiday-ad-planner` | `0 10 * * 3` | Holiday campaign planning |
| Google Ads Manager | `cron-drive-scanner` | `0 10 * * *` | Google Drive creative asset scanning (disabled by default) |
| Meta Ads Manager | `cron-performance-reporter` | `0 9 * * *` | Performance reporting (reads `ad-strategy`) |
| Meta Ads Manager | `cron-audience-scanner` | `0 10 * * 1` | Audience analysis |
| Meta Ads Manager | `cron-holiday-ad-planner` | `0 10 * * 3` | Holiday campaign planning |
| Meta Ads Manager | `cron-drive-scanner` | `0 10 * * *` | Google Drive creative asset scanning (disabled by default) |

### How Preference and Scheduled Skills Work Together

Each scheduled cron skill reads its paired preference skill at runtime. The mechanism:

1. `POST /UserAgent/CustomSkillUpsert` writes your preference `value` for key `content-tone` (stored as `cs-content-tone`).
2. When the container starts, each `customskills` / `scheduledskills` row is materialized as a local skill at `skills/<key>/SKILL.md` inside the agent workspace. The `cs-` prefix on `key` IS the runtime path — a preference skill with key `cs-content-tone` becomes `skills/cs-content-tone/`, and a cron skill with key `cs-cron-content-scanner` becomes `skills/cs-cron-content-scanner/`.
3. The scheduled cron skill's `value` (shipped in the integration skill, not user-editable) references its paired preference via the `cs-<preference-key>` path, for example:
   ```
   0. Read the cs-content-tone skill first — follow ALL its rules.
   1. ...
   ```
4. At each cron tick, the agent LLM reads `cs-content-tone`, applies your instructions, then executes the scan/report/dispatch workflow.

> **Slug normalization:** the `<slug>` in `cs-<slug>` / `cs-cron-<slug>` is the raw key lowercased with any run of non-alphanumeric characters replaced by a single `-` (leading/trailing dashes trimmed). Template keys already follow this shape so the slug matches 1:1.

This means **your editable preference becomes the single place to customize agent behavior** (brand voice, target audience, content sources, holiday markets, etc.), and the bundled cron skill is a thin orchestration layer that defers to your preference.

### Skill → Integration Mapping

Skills that depend on third-party credentials. Follow the linked integration page for provider setup, OAuth walkthrough, and troubleshooting.

| Skill | Credential Key | Integration Guide |
|-------|----------------|-------------------|
| `int-metaads-manage` | `meta-ads` (OAuth) | [Meta Ads Skills](/docs/integration-metaads-skills) |
| `int-facebookpage-post` | `facebook-pages` (OAuth) | [Facebook Page Skills](/docs/integration-facebook-skills) |
| `int-instagram-post` | `instagram` (OAuth) | [Instagram Skills](/docs/integration-instagram-skills) |
| `int-linkedin-post` | `linkedin` (OAuth) | [LinkedIn Skills](/docs/integration-linkedin-skills) |
| `int-twitterx-post` | `twitter` (OAuth) | [Twitter / X Skills](/docs/integration-twitter-skills) |
| `int-tiktok-post` | `tiktok` (OAuth) | [TikTok Skills](/docs/integration-tiktok-skills) |
| `int-youtube-manage` | `youtube` (OAuth) | [YouTube Skills](/docs/integration-youtube-skills) |
| `int-googleads-manage` | `google-ads` (OAuth) | [Google Ads Skills](/docs/integration-googleads-skills) |
| `int-merchant-center` | `google-merchant-center` (OAuth) | [Merchant Center Skills](/docs/integration-merchantcenter-skills) |
| `int-ga4-analytics` | `ga4` (OAuth) | [GA4 Skills](/docs/integration-ga4-skills) |
| `int-hubspot-crm` | `hubspot` (OAuth) | [HubSpot Skills](/docs/integration-hubspot-skills) |
| `int-mailchimp-email` | `mailchimp` (OAuth or API key) | [Mailchimp Skills](/docs/integration-mailchimp-skills) |
| `int-google-drive` | `google-drive` (Service Account) | [Google Drive Skills](/docs/integration-googledrive-skills) |
| `int-gmail-check` | `gmail` (App Password) | [Gmail Skills](/docs/integration-gmail-skills) |
| `int-firebase-push` | `firebase` (Service Account) | [Firebase Skills](/docs/integration-firebase-skills) |
| `int-wordpress-post` | `wordpress` (App Password) | [WordPress Skills](/docs/integration-wordpress-skills) |
| `int-brevo-email` | `brevo` (API key) | [Brevo Skills](/docs/integration-brevo-skills) |
| `int-sendgrid-email` | `sendgrid` (API key) | [SendGrid Skills](/docs/integration-sendgrid-skills) |
| `int-appstore-reviews`, `int-appstore-metadata`, `int-appstore-events` | `apple-appstore` (JWT / Service Account) | [App Store Skills](/docs/integration-appstore-skills) |
| `int-googleplay-reviews`, `int-googleplay-metadata`, `int-googleplay-events` | `google-play` (Service Account) | [Google Play Skills](/docs/integration-googleplay-skills) |
| `int-apollo-sales` | `apollo` (API key) | [Apollo Skills](/docs/integration-apollo-skills) |
| `int-lemlist-outreach` | `lemlist` (API key) | [Lemlist Skills](/docs/integration-lemlist-skills) |
| `int-wiro-generator` | Platform-managed (Wiro internal key) | See [Using Wiro AI Models from Your Agent](#using-wiro-ai-models-from-your-agent) |
| `int-calendarific` | Platform-managed (no user key) | [Platform-Managed Credentials](/docs/agent-credentials#platform-managed-credentials) |

Agents can optionally forward operator notifications to a Telegram bot via the `sys-telegram` credential — see [Telegram Skills](/docs/integration-telegram-skills). This is never required; every agent remains fully usable over web chat and the [Messaging API](/docs/agent-messaging) without a bot configured.

> **Restart behavior:** Calls to `CustomSkillUpsert`, `CustomSkillDelete`, `CustomSkillRevert`, and `SkillsApply` on a running agent (status 3 or 4) each trigger an automatic restart so the new skill configuration is picked up. Same as credential updates. Description-only edits to `CustomSkillUpsert` skip the restart.

## Using Wiro AI Models from Your Agent

`int-wiro-generator` is a platform built-in skill that lets an agent call Wiro's own AI models (image/video/audio/LLM generation, cover image creation, model discovery) using Wiro's internal API. When it's enabled on an agent:

- `credentials.wiro.apiKey` is filled in automatically by Wiro (platform-managed — `fieldstatus: "platform"`). You don't set this key yourself.
- The agent container gets `WIRO_API_KEY` as an env var only when both `int-wiro-generator` skill is enabled **and** the key is present in the template.
- `int-wiro-generator` is marked `user_invocable: false` in the registry — it isn't called directly by end-user messages; other skills and scheduled tasks invoke it internally when they need to generate content.

Most Wiro-provided agent templates (Social Manager, Blog Content, Push, App Event, Meta Ads, Google Ads, Newsletter) ship with `int-wiro-generator: true` and the platform-managed `wiro` credential pre-filled. Templates that don't need AI generation (App Review Support, Lead Generation Manager) ship with `int-wiro-generator: false`.

To check whether your deployed agent has it:

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Detail" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "guid": "your-useragent-guid" }'
# The top-level skills[] array should contain "int-wiro-generator"
```

### API user-specific note

`int-wiro-generator` does **not** mean "your custom skill can call Wiro's Run API with your own API key". It's scoped to the agent template's internal skills and uses Wiro's pre-filled platform key. If you're building on top of Wiro programmatically and want to call the Run / Task / LLM APIs directly from your own backend (not from inside an agent container), use your standard Wiro API key against the public API — see [Run a Model](/docs/run-a-model) and [LLM & Chat Streaming](/docs/llm-chat-streaming).

## Update Rules Summary

| Operation | Endpoint | Allowed on preset strategy (`_source: preset-strategy`) | Allowed on skill-bundled cron (`_source: skill-bundle`) | Allowed on user-created cron (`_source: user-created`) |
|---|---|---|---|---|
| Write `value` | `CustomSkillUpsert` | Yes | **No — silently dropped** | Yes |
| Write `interval` | `CustomSkillUpsert` | **No — silently dropped** | Yes | Yes |
| Write `enabled` | `CustomSkillUpsert` | **No — silently dropped** | Yes | Yes |
| Write `description` | `CustomSkillUpsert` | **No — rejected** (preset descriptions are template-owned) | **No — rejected** | Yes |
| Create | `CustomSkillUpsert` with `usercreated: true` | n/a | n/a | Yes |
| Delete | `CustomSkillDelete` | No-op | **Rejected with `disable-via-upsert` suggestion** | Yes |
| Read history | `CustomSkillHistory` | Yes | Yes (only `enabled` / `interval` writes show up) | Yes |
| Revert to preset | `CustomSkillRevert` (`source: "preset"`) | Yes | Yes (resets `interval` / `enabled` to preset defaults) | Yes (deletes the row if no preset baseline exists) |
| Revert to a version | `CustomSkillRevert` (`source: "history"`) | Yes | Yes | Yes |

- Send only the fields you want to change — omitted fields keep their current values.
- Unknown skill keys return `skill-not-found` in the `errors[]` without altering other state.
- To clear a cron schedule, call `CustomSkillUpsert` with `enabled: false`. Setting `interval: ""` or `null` also clears it.
- Integration toggles (top-level `skills[]`) are a separate endpoint — see [Toggling Integration Skills](#toggling-integration-skills) and [`SkillsApply`](/docs/agent-overview#post-useragentskillsapply).

### What happens when Wiro updates an agent template

Skills occasionally evolve on Wiro's side — new preset strategies, new bundled crons, improved instructions. Deployed instances are reconciled with the latest template without destroying your edits:

| Row type | Behavior on template update |
|----------|----------------------------|
| Preset strategy (`_source: "preset-strategy"`) | Your `value` is **preserved** (rows with `useredited: true`). New placeholder structure in the template appears only on fresh deploys. |
| Skill-bundled cron (`_source: "skill-bundle"`) | The `value` (cron instructions) is **re-materialized** from the new skill. Your custom `interval` and `enabled` are preserved when `useredited: true`. |
| New preset strategy upstream | Added to your instance with the template's default `value`. |
| Preset strategy removed upstream | Removed from your instance on the next reconciliation. |
| User-created cron | Always preserved. |

Cascade reconciliation is async — admin pushes an `Agent/CustomSkillUpsert`, which enqueues a job that fans out to every deployed useragent in the background. Per-useragent edits (`useredited: true`) are protected from being overwritten by the cascade.
