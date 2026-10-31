# Agent Skills

Configure agent behavior with editable preferences, scheduled automation tasks, and skill toggles. Browse the platform's skill registry and inspect every skill's pricing, capabilities, and credential requirements.

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
| Delete a user-created cron skill | [`POST /UserAgent/CustomSkillDelete`](/docs/agent-overview#post-useragentcustomskilldelete) |
| Read version history of a custom skill | [`POST /UserAgent/CustomSkillHistory`](/docs/agent-overview#post-useragentcustomskillhistory) |
| Revert a custom skill to preset / a historical version | [`POST /UserAgent/CustomSkillRevert`](/docs/agent-overview#post-useragentcustomskillrevert) |
| Toggle one or more integration skills (the top-level `skills` array, e.g. `int-instagram-post`) on/off, with optional tier change | [`POST /UserAgent/SkillsApply`](/docs/agent-overview#post-useragentskillsapply) |
| Live tier-pricing preview for a hypothetical skill set | [`POST /UserAgent/PricingPreview`](/docs/agent-overview#post-useragentpricingpreview) |

> Read responses from `POST /UserAgent/Detail` expose the composed `customskills[]` array (preference skills + non-cron user-created skills), the `scheduledskills[]` array (cron skills), and the `skills[]` array as top-level fields on the useragent object. `skills[]` is an **object array**: each entry is `{ name, enabled, _edited?, _user_created? }` (e.g. `[{ "name": "int-instagram-post", "enabled": true }, { "name": "int-wiro-aimodels", "enabled": true }]`).

## Skill Registry vs Custom Skills

Two concepts share the word "skill" in the agent system. Keep them straight:

| Concept | What it is | Where it lives | API surface |
|---------|------------|----------------|-------------|
| **Registry skills** | Platform-shipped capabilities: Wiro defines them, they have pricing recipes, credential requirements, and runtime tools. Examples: `int-instagram-post`, `int-gmail-check`, `int-wordpress-post`, `int-wiro-aimodels`. | Wiro's skill registry. | `POST /Skills/List` / `POST /Skills/Detail` (read), `POST /UserAgent/SkillsApply` (toggle on/off per useragent). |
| **Custom skills** | User-editable preference text (`cs-content-tone`) or scheduled tasks (`cs-cron-blog-scanner`) that live ON a useragent. They reference registry skills (e.g. a cron skill calls into `int-wordpress-post`) but are scoped to one instance. | Per useragent on the Wiro platform. | `POST /UserAgent/CustomSkillUpsert` / `POST /UserAgent/CustomSkillRename` / `POST /UserAgent/CustomSkillDelete` / `POST /UserAgent/CustomSkillHistory` / `POST /UserAgent/CustomSkillRevert`. |

The rest of this page documents both: the registry endpoints first (so you can discover what's possible), then the per-useragent endpoints (so you can configure them).

## Skill Registry Endpoints

These four endpoints are **public, so no authentication is required**. They return data straight from the skill registry.

### **POST** /Skills/List

Lists all skills in the registry.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `category` | string | No | Filter by `"int"` (integration with a third-party service) or `"util"` (utility, no credential to connect: rule sets, playbooks, and keyless tools such as weather and diagrams). |
| `capability` | string | No | Filter by capability key (see [`POST /Skills/Capabilities`](#post-skillscapabilities) for the closed-set vocabulary). |
| `user_invocable` | boolean | No | When `true`, only return skills end users can call directly through chat (filters out plumbing skills wired by the runtime). |
| `requires_credentials` | boolean | No | Filter by whether the skill requires a credential. |
| `wiro_connect_pending` | boolean | No | Filter by the "Wiro mode coming soon" flag: integrations whose Wiro-shared OAuth client is still awaiting provider review (currently 9 user-facing credentials: `facebook-pages`, `instagram`, `google-ads`, `google-merchant-center`, `youtube`, `ga4`, `linkedin`, `tiktok`, and `meta-ads`). Facebook Pages, Instagram, and Meta Ads remain usable through their customer-owned System User and/or OAuth alternatives. When `true`, only pending skills are returned; when `false`, only ready-to-use skills. The flag is read off the credential, not the skill. |
| `name_in` | array<string> | No | Restrict the response to a specific list of skill names. |

##### Response

```json
{
  "result": true,
  "errors": [],
  "total": 45,
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
      "capabilities": ["social_publishing"],
      "depends_on": [],
      "conflicts_with": [],
      "user_invocable": true,
      "deprecated": false,
      "replacement": null,
      "pricing": {
        "monthly_price_weight_usd": 1,
        "monthly_credits_weight": 100,
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
| `name` | `string` | Canonical skill key, **including the registry prefix** (`int-*` for integration skills, `util-*` for utility skills). Use this exact value in `SkillsApply` and `Deploy.body.skills`. |
| `category` | `string` | `"int"` (third-party integration) or `"util"` (utility, no credential to connect: rule sets, playbooks, and keyless tools such as weather and diagrams). |
| `version` | `string` | Semver for the registry entry. Bumped when the skill's tool surface or pricing weights change. |
| `title` | `string` | Display name shown on chips / filters / cards. |
| `description` | `string` | One-line summary used on marketing surfaces. |
| `icon` | `string` | Path or URL to the brand icon (relative paths are absolutized to `https://wiro.ai/...` on the wire). Utility skills carry a LineIcons class name instead, such as `lni lni-cloud-sun`. |
| `brand_color` | `string\|null` | Brand background colour (hex) for chips and cards. |
| `brand_text_color` | `string\|null` | Foreground colour to render on top of `brand_color`. |
| `brand_logo_filter` | `string\|null` | CSS `filter` value applied to monochrome SVG icons (e.g. `"brightness(0) invert(1)"`) so the same source SVG renders correctly on light and dark brand colours. |
| `docs_url` | `string\|null` | Slug or path of the integration page on this docs site. Frontends prefix with `/docs/` when rendering. |
| `requires_credentials` | `boolean` | `true` when the skill needs a credential the operator must supply (effectively `true` whenever `credential_key` names a credential you supply). |
| `credential_key` | `string\|null` | The provider this skill needs (`"instagram"`, `"google-ads"`, `"wiro"`, `"calendarific"`, …). `null` for `util` skills and skills whose credential Wiro manages. Use [`POST /Credentials/Detail`](/docs/agent-credentials#post-credentialsdetail) to inspect the schema. |
| `additional_credential_keys` | `array<string>` | **Optional: only present when the skill writes secondary credentials.** App-store / Google-Play review skills include `["var-support-email"]` for the support-email variable bag; most skills omit this field entirely. |
| `capabilities` | `array<string>` | High-level snake_case capability tags from the closed vocabulary returned by [`POST /Skills/Capabilities`](#post-skillscapabilities). Drives the "Find skills that can: ___" picker. |
| `depends_on` | `array<string>` | Other skill names that must be enabled. Wiro auto-enables transitive deps when you toggle the parent skill on. |
| `conflicts_with` | `array<string>` | Mutually-exclusive skill names. `SkillsApply` rejects toggle batches that would enable two conflicting skills. |
| `user_invocable` | `boolean` | `true` when end users can call the skill via chat. Most user-facing skills (including `int-wiro-aimodels` and `int-calendarific`) are `true`; `false` marks supporting parts that come with another skill, such as `util-video-shots` and `util-video-docs`, which come with `util-video-creator`. |
| `deprecated` | `boolean` | `true` for skills slated for removal, and `replacement` (if any) names the migration target. |
| `replacement` | `string\|null` | When `deprecated: true`, the registry-recommended successor skill name. |
| `pricing` | `object` | Per-skill pricing recipe (see below). |

`channels[]` is a separate, unfiltered catalog returned alongside `skills[]`.
Skill filters do not remove channel rows. Each channel includes its stable
`id`, `credential_key`, activation `required_fields`, UI-facing
`capabilities`, and the full registry `credential` descriptor. Use these values
to render channel setup. Save the matching credential group through
[`UserAgent/CredentialUpsert`](/docs/agent-overview#post-useragentcredentialupsert);
the channel activates automatically when every `required_fields` value is
complete. Channels are not skills and do not affect pricing.

**`pricing` object:**

| Sub-field | Type | Description |
|-----------|------|-------------|
| `monthly_price_weight_usd` | `number` | Weight (USD) the skill contributes to the agent's Starter monthly price. Wiro sums weights across the agent's enabled-skill closure (incl. transitive `depends_on`); Pro multiplies the total by `tiermultiplier`. The platform applies a **$4/month minimum floor** on top of this sum (with credits scaled proportionally). See Pricing in the [Agent Overview](/docs/agent-overview#pricing-model--tiers-skills--token-billing). |
| `monthly_credits_weight` | `number` | Weight (credits) the skill contributes to the Starter monthly credit allocation: 100 credits per $1 of `monthly_price_weight_usd`. Same closure + multiplier semantics as price. When the $4 starter floor is applied to `monthly_price_weight_usd`, this weight is scaled up by the same ratio so the user gets a proportional credit boost rather than a free upgrade. |
| `billing_model` | `string` | Always `"tokens"`. Per-turn conversation cost is token-metered at the agent's per-model `tokenRates` (credits per 1M input / output / cached-input tokens). See [token billing in the Agent Overview](/docs/agent-overview#pricing-model--tiers-skills--token-billing). Voice skills stream realtime audio through the operator's own Wiro AI Models balance via `int-wiro-aimodels` (your own Wiro API key); the voice-prep and post-call text turns are normal token deducts. |

> **4 weight buckets in the skill registry.** Every skill's `monthly_price_weight_usd` / `monthly_credits_weight` pair but one lands in one of four buckets: `ZERO` (`$0` / `0`, utility skills), `LIGHT` (`$1` / `100` credits per month), `HEAVY` (`$2` / `200` credits per month), or `PREMIUM` (`$4` / `400` credits per month). The exception is `util-video-creator`, the Video Creator's playbook: it carries that agent's price, `$29` and `2900` credits a month on Starter, to any agent that turns it on. Every paid skill grants exactly 100 monthly credits per $1 of price weight, so `monthly_credits_weight` is always `100 × monthly_price_weight_usd`. The `(priceUsd, credits)` grid is a documentation convenience, **not** a named API constant; each pair emerges from the skill's own `monthly_price_weight_usd` / `monthly_credits_weight`. There are **no per-skill Pro overrides**: Pro is always derived as `Starter × tiermultiplier` (default `10`). The agent's Starter price = `Σ(enabled-skill weights)`, bumped to `$4` if the raw sum lands below the floor (with credits scaled proportionally to keep the per-credit ratio stable); Pro = `Starter × tiermultiplier`.

> **Optional filter `wiro_connect_pending`.** When you query with
> `wiro_connect_pending: true` you get every skill whose connecting
> integration's Wiro-shared OAuth client is awaiting App Review, currently
> `int-instagram-post`, `int-facebookpage-post`, `int-linkedin-post`,
> `int-tiktok-post`, `int-metaads-manage`, the Google OAuth skills listed
> above, and paired `util-*` helpers. Facebook Pages, Instagram, and Meta Ads
> already expose customer-owned System User and/or OAuth alternatives. The flag
> itself lives on the credential entry under
> [`POST /Credentials/Detail`](/docs/agent-credentials#post-credentialsdetail).

### **POST** /Skills/Detail

Returns a single skill by name.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes | Canonical skill name **with prefix** (e.g. `"int-instagram-post"`, `"util-social-posting-common"`). Registry-only: `cs-*` and `cs-cron-*` user-level customskills are not exposed here. |

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
    "capabilities": ["social_publishing"],
    "depends_on": [],
    "conflicts_with": [],
    "user_invocable": true,
    "deprecated": false,
    "replacement": null,
    "pricing": {
      "monthly_price_weight_usd": 1,
      "monthly_credits_weight": 100,
      "billing_model": "tokens"
    }
  }
}
```

Returns the **full registry entry**: same shape as a row from `Skills/List`. The endpoint surfaces every field the registry has stored. If the skill is not found you get `{ "result": false, "errors": [{ "code": 404, "message": "Skill not found: <name>" }] }`.

### **POST** /Skills/CredentialSchema

Convenience endpoint: returns the credential entry for a given skill name in one call. Useful when you've discovered a skill via `Skills/List` and want to render the credential form without a separate `Credentials/Detail` round-trip.

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
    "credential_mode": "hybrid",
    "connection_modes": ["api_key", "own", "wiro"],
    "default_connection_mode": "api_key",
    "mode_badges": {
      "api_key": "Recommended",
      "own": "Advanced"
    },
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
        "key": "systemusertoken",
        "type": "password",
        "label": "System User Token",
        "required": true,
        "encrypted": true,
        "show_toggle": true,
        "runtime_excluded": true,
        "only_in_modes": ["api_key"]
      },
      {
        "key": "accountId",
        "type": "text",
        "label": "Instagram Account ID",
        "required": true,
        "pattern": "^[0-9]+$",
        "auto_filled_by_oauth": true,
        "readonly_when_connected": true
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
      "connect_endpoint": "/UserAgentOAuth/OAuthConnect",
      "disconnect_endpoint": "/UserAgentOAuth/OAuthDisconnect",
      "status_endpoint": "/UserAgentOAuth/OAuthStatus",
      "connect_button_label": "Connect with Instagram",
      "connect_button_icon": "/images/icons/skills/instagram.svg",
      "connect_button_brand_color": "#e4405f",
      "connect_button_text_color": "#ffffff",
      "connect_button_logo_filter": "none",
      "username_field": "igusername",
      "return_query_param": "ig_connected",
      "return_error_param": "ig_error",
      "return_error_detail_param": "ig_error_detail",
      "direct_probe": {
        "mode": "api_key",
        "mode_label": "System User Token",
        "token_field": "systemusertoken",
        "required_fields": ["systemusertoken"],
        "public_account_fields": ["id", "name"]
      },
      "account_picker": {
        "enabled": true,
        "multi_select": true,
        "set_endpoint": "/UserAgentOAuth/SetPickerAccounts",
        "item_value_field": "accountId",
        "item_label_field": "igusername",
        "item_fields_to_save": ["accountId", "igusername"]
      },
      "extra_step": null
    },
    "used_by_skills": ["int-instagram-post"]
  }
}
```

Returns the **full registry credential entry**: same shape as a row from [`POST /Credentials/Detail`](/docs/agent-credentials#post-credentialsdetail). Returns `{ "result": false, "errors": [{ "code": 404, "message": "No credential associated with skill: <name>" }] }` if the skill exists but has `credential_key: null` (`util` / platform-managed) or if the skill is unknown.

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
    { "name": "motion_graphics",          "description": "Compose and render motion graphics (HTML/CSS/GSAP animations, sound effects, transitions) to video" },
    { "name": "audio_generation",         "description": "Generate audio / voice clips (TTS, music, SFX)" },
    { "name": "realtime_conversation",    "description": "Bidirectional realtime audio/text conversation (Wiro realtime, OpenAI realtime)" },
    { "name": "vision",                   "description": "Vision LLM analysis of images (caption, describe, OCR, visual QA)" },
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
    { "name": "commerce_management",      "description": "Manage storefront catalogs, inventory, orders, customers, discounts, and fulfillment workflows" },
    { "name": "review_monitoring",        "description": "Monitor store reviews (App Store, Google Play)" },
    { "name": "app_metadata",             "description": "Fetch app store metadata (description, pricing, features)" },
    { "name": "event_management",         "description": "Manage app events (App Store in-app events)" },
    { "name": "file_asset_management",    "description": "Manage asset files from cloud storage (Drive)" },
    { "name": "voice_call_handling",      "description": "Receive and handle inbound voice calls via Twilio or web browser" },
    { "name": "caller_identification",    "description": "Match caller phone number against CRM records (HubSpot, Apollo)" },
    { "name": "live_transcript",          "description": "Stream real-time call transcripts to operator chat" },
    { "name": "voice_persona",            "description": "Configure AI voice persona (alloy/echo/etc) for phone interactions" },
    { "name": "phone_inbound",            "description": "Accept inbound PSTN phone calls (Twilio)" },
    { "name": "browser_voice",            "description": "Accept inbound voice calls from website browser (Web Audio API)" },
    { "name": "appointment_management",   "description": "Manage calendar appointments (find slots, create events)" },
    { "name": "calendar_lookup",          "description": "Read calendar/availability data (Google Calendar)" },
    { "name": "realtime_session_prep",    "description": "Pre-call orchestration: bridge ↔ agent handshake before realtime audio starts (read operator's cs-* custom skills, run realtime model, callback to bridge)" },
    { "name": "web_search",               "description": "Search the public web (Google Programmable Search / Custom Search JSON API)" },
    { "name": "weather_lookup",           "description": "Current weather and forecasts for any place (MET Norway, OpenStreetMap geocoding)" },
    { "name": "diagram_rendering",        "description": "Render diagrams (Mermaid flowcharts, sequence, state and ER diagrams, mind maps, timelines; agent-drawn SVG) to PNG with an SVG copy" }
  ]
}
```

Capability names are **snake_case** strings. Pass any of them as the `capability` parameter to `Skills/List` to filter (e.g. `{ "capability": "social_publishing" }` returns every skill that publishes to a social platform).

## Custom Skills: Discovery (Per-Instance)

Once you've deployed a useragent, its current custom skills live under `customskills[]` (preferences + non-cron user-created skills) and `scheduledskills[]` (cron skills) on the `POST /UserAgent/Detail` response.

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
  "skills": [
    { "name": "int-instagram-post", "enabled": true },
    { "name": "int-googleads-manage", "enabled": false },
    { "name": "int-wiro-aimodels", "enabled": true }
  ]
}
```

> The exact key names depend on the agent template. Always fetch `POST /UserAgent/Detail` to see the real list for your deployed instance, because skill keys, default cron schedules, and even the set of skills can evolve as templates are updated.

| Field | Type | Description |
|-------|------|-------------|
| `key` | string | Canonical key. **Always carries the `cs-` runtime prefix.** Strategies are `cs-<slug>`; crons are `cs-cron-<slug>`. The server normalises bare slugs you send to `CustomSkillUpsert`: `"content-tone"` becomes `cs-content-tone`, `"weekly-health-check"` with `interval: "0 9 * * 1"` becomes `cs-cron-weekly-health-check`. |
| `value` | string | Skill instructions / cron prompt body. Populated only for editable preference skills and user-created entries; bundled crons have it empty. |
| `description` | string | Human-readable description. **Writable only on user-created rows.** Sending a *different* `description` for a preset strategy or a skill-bundled cron is rejected with `customskill-preset-description-not-editable`; sending the current one back unchanged is ignored. |
| `enabled` | boolean | Whether the skill is active. **Writable for both strategies (`cs-*`) and crons (`cs-cron-*`)**. A disabled strategy is suppressed end-to-end (kept in the merged `customskills[]` so it still appears in the list, but the agent never loads it). |
| `interval` | string \| null | Cron expression for scheduled execution, or `null` for preference skills. Writable on cron skills; ignored on preferences. |
| `_source` | string | `preset-strategy` (editable preference), `skill-bundle` (cron owned by an integration skill), or `user-created` (cron added via `CustomSkillUpsert`). |
| `_editable` | boolean | Convenience flag: `true` for preset strategies and user-created rows (you can write `value`), `false` for skill-bundled crons (you can only write `enabled` / `interval`). |
| `_user_created` | boolean | Present (and `true`) only on `_source: "user-created"` rows. Omitted on preset strategies and skill-bundled crons. |

### Understanding `_source`

Agent responses merge three sources into a single set of custom-skill rows:

1. **Preset strategies** (`_source: "preset-strategy"`): preferences defined by the agent preset (e.g. `cs-content-tone`, `cs-ad-strategy`). You can write `value`.
2. **Bundled crons** (`_source: "skill-bundle"`): cron tasks shipped inside a specific integration skill. Automatically materialized when the integration is enabled. You can write `interval` and `enabled`, but **not** `value` (the skill owns the cron instruction text).
3. **User-created rows** (`_source: "user-created"`): entries added via `POST /UserAgent/CustomSkillUpsert`. You can write all fields. Crons are flagged via `interval` (or an explicit `cs-cron-` prefix), not `usercreated`.

## Updating Preference Skills

Preference skills (`_source: "preset-strategy"`, `_editable: true`) let you customize the agent's behavior by editing its instructions.

Send one `CustomSkillUpsert` call per skill. Unspecified skills are untouched. The typical update is just `value`. You can also pass `enabled: false` to disable a strategy (the agent will skip it everywhere it would otherwise inject the strategy's instructions). `interval` has no effect on strategies: they're read on-demand by cron tasks via `cs-<slug>`, never scheduled themselves. `description` is rejected on preset rows with `customskill-preset-description-not-editable`, because the description is template-owned.

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

Response: `{ "result": true, "errors": [] }`. If the agent was running it automatically restarts.

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

Scheduled tasks are cron skills: bundled ones (`_source: "skill-bundle"`) ship with integration skills and run automatically when the integration is enabled. User-created crons (`_source: "user-created"`) are added at any time.

> **For bundled crons, only `enabled` and `interval` are writable.** The task body (`value`) comes from the integration skill and is restored whenever the agent restarts. To change **what** a bundled scheduled task does, edit the paired preference skill (e.g. `content-tone` is read by `cs-cron-social-content-scanner` at runtime). For user-created crons, all three (`value`, `interval`, `enabled`) are writable.

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

The server auto-prefixes `skillkey` with `cron-` on user-created crons, so the row above is stored with `key: "cs-cron-weekly-health-check"`. Subsequent upserts can use either form: `"weekly-health-check"`, `"cron-weekly-health-check"`, or `"cs-cron-weekly-health-check"`.

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

Preset-owned crons cannot be deleted: the call returns `This skill belongs to the agent preset and cannot be deleted. Use enabled=false to disable it instead.` with `suggestion: "disable-via-upsert"`. Disable them via `CustomSkillUpsert` + `enabled: false`.

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

## Toggling Integration Skills

The top-level `skills[]` array on `UserAgent/Detail` lists every integration skill on the instance as an **object array**: `[{ name, enabled, _edited?, _user_created? }, ...]`. `enabled: false` entries are still returned (so a UI can show disabled rows); filter on `enabled: true` to get only the active set. Example: `[{ "name": "int-instagram-post", "enabled": true }, { "name": "int-googleads-manage", "enabled": false }, { "name": "int-wiro-aimodels", "enabled": true }]`. To enable, disable, or change tier in one shot, use **`POST /UserAgent/SkillsApply`**. Even when you only want to flip a single skill, send it as a one-entry `skills` map. The endpoint:

1. Charges the wallet (or prorates) **once**, not N times.
2. Triggers exactly **one agent restart** after the new skill set lands.
3. Uses **idempotency**: concurrent calls or client retries can't apply the change twice.
4. Is **atomic**: a payment failure rolls back to the pre-call skill set.

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

`idempotencyKey` is required: use a UUID per "user clicks Save" event. The full response shape and error-code table live on [`SkillsApply`](/docs/agent-overview#post-useragentskillsapply).

> **Template deploys too.** `SkillsApply` works on agents deployed from a marketplace template as well as on custom builds. On a template agent, a skill you change overrides the template for that skill only; later template updates still reach every skill you never changed.

> **Bundled crons follow the integration toggle.** When you disable an integration skill (e.g. `int-instagram-post`), every bundled cron it owns (`_source: "skill-bundle"`) is hidden from the top-level `customskills` / `scheduledskills` lists until the integration is re-enabled, so you don't need to touch them individually.

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

All three requests succeed independently. The agent restarts once: the server coalesces the restart trigger after all three succeed within the same request window.

## Available Skills by Agent

> **Integration setup guides:** Every skill below that needs a third-party connection links to a dedicated integration page with the full OAuth / API key walkthrough, required scopes or permissions, callback URL, troubleshooting, and multi-tenant architecture notes. See the [Integration Catalog](/docs/agent-credentials#integration-catalog) for the full list.

> **Discovery is canonical.** Skill keys evolve as agent templates are updated. To see the exact keys for a specific agent instance, always fetch `POST /UserAgent/Detail` first. The top-level `customskills` / `scheduledskills` arrays are the source of truth. The tables below reflect current intended keys; `CustomSkillUpsert` silently accepts keys that exist on the instance and returns `skill-not-found` for unknown keys without altering other state.

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
| TikTok Ads Manager | `ad-strategy`, `tiktok-ads-strategy` | Target audience, budget goals; TikTok tracking gates, kill thresholds, placement, Spark Ads and Smart+ rules |
| Video Creator | `video-preferences`, `saved-logins` | Default format, length, voice, look, music, captions and ending card; test accounts for the screens behind a login |

### Scheduled Tasks

> Scheduled task keys are defined **per agent template** and may be updated over time. The table below reflects the current keys and default cron expressions shipped with Wiro's built-in agent templates, but the source of truth for any specific deployed agent is always `POST /UserAgent/Detail` → top-level `scheduledskills`.

| Agent | Skill Key | Cron | What It Does |
|-------|-----------|------|--------------|
| Social Manager | `cs-cron-social-content-scanner` | `0 */4 * * *` | Content discovery and draft posts with rotating strategies (reads `content-tone`; disabled by default) |
| Social Manager | `cs-cron-social-drive-scanner` | `0 10 * * *` | Scans Google Drive for new post assets and prepares posts (disabled by default) |
| Blog Content Editor | `cs-cron-blog-scanner` | `0 9 * * *` | Topic discovery and article drafting (reads `content-strategy`) |
| Blog Content Editor | `cs-cron-blog-gmail-checker` | `*/30 * * * *` | Checks the inbox for topic requests and writing instructions (disabled by default) |
| App Review Support | `cs-cron-review-scanner` | `0 */2 * * *` | Scans App Store and Google Play for new reviews and prepares replies (reads `review-preferences`; disabled by default) |
| App Event Manager | `cs-cron-app-event-scanner` | `0 9 * * 1` | Scans global holidays and suggests App Store in-app events (reads `event-preferences`; disabled by default) |
| Push Notification Manager | `cs-cron-push-scanner` | `0 9 * * *` | Scans holidays and prepares push notification suggestions (reads `push-preferences`) |
| Push Notification Manager | `cs-cron-push-dispatcher` | `0 * * * *` | Sends queued push notifications on schedule |
| Newsletter Manager | `cs-cron-newsletter-sender` | `0 9 * * 1` | Newsletter drafting and sending (reads `newsletter-strategy`; disabled by default) |
| Newsletter Manager | `cs-cron-newsletter-subscriber-scanner` | `0 10 * * *` | Daily subscriber list health check and bounce monitoring (disabled by default) |
| Lead Generation Manager | `cs-cron-lead-prospect-scanner` | `0 10 * * 1` | Weekly prospect search, enrichment and scoring (reads `lead-strategy`; disabled by default) |
| Lead Generation Manager | `cs-cron-lead-outreach-reporter` | `0 9 * * *` | Daily outreach performance report (disabled by default) |
| Lead Generation Manager | `cs-cron-lead-reply-handler` | `0 */4 * * *` | Checks new replies, analyzes sentiment and proposes responses (disabled by default) |
| Google Ads Manager | `cs-cron-googleads-performance-reporter` | `0 9 * * *` | Daily performance report with recommendations (reads `ad-strategy`) |
| Google Ads Manager | `cs-cron-googleads-recommendations-fetcher` | `0 8 * * *` | Daily Google Ads recommendations: safe items become low-risk suggestions, risky ones wait for your approval |
| Google Ads Manager | `cs-cron-googleads-competitor-scanner` | `0 10 * * 1` | Weekly competitor analysis, keyword opportunities and account health audit |
| Google Ads Manager | `cs-cron-googleads-holiday-planner` | `0 10 * * 3` | Upcoming holidays and seasonal campaign suggestions |
| Google Ads Manager | `cs-cron-googleads-audience-refresher` | `0 7 * * *` | Daily Customer Match refresh from a connected CRM (HubSpot, Apollo, Lemlist) or a Google Drive CSV (disabled by default) |
| Google Ads Manager | `cs-cron-googleads-drive-scanner` | `0 10 * * *` | Scans Google Drive for new creative folders and proposes campaigns (disabled by default) |
| Google Ads Manager | `cs-cron-merchant-center-scanner` | `30 8 * * *` | Daily Merchant Center product feed health check (runs only when Merchant Center is connected; disabled by default) |
| Google Ads Manager | `cs-cron-ga4-attribution-auditor` | `0 11 * * 1` | Weekly conversion tracking and attribution health audit (cross-checks Google Ads with GA4 when connected; disabled by default) |
| Google Ads Manager | `cs-cron-adjust-creative-roas-reporter` | `0 10 * * *` | Daily Adjust creative-level ROAS report with scale/pause recommendations (disabled by default) |
| Google Ads Manager | `cs-cron-roasit-creative-roas-reporter` | `30 10 * * *` | Daily Roasit creative-level ROAS report with scale/pause recommendations (disabled by default) |
| Google Ads Manager | `cs-cron-ads-recommendation-cleanup` | `0 0 * * *` | Nightly cleanup of expired recommendations |
| Meta Ads Manager | `cs-cron-metaads-performance-reporter` | `0 9 * * *` | Daily performance report with creative health, audience analysis and recommendations (reads `ad-strategy`) |
| Meta Ads Manager | `cs-cron-metaads-audience-scanner` | `0 10 * * 1` | Weekly audience, creative health and account health audit |
| Meta Ads Manager | `cs-cron-metaads-holiday-planner` | `0 10 * * 3` | Upcoming holidays and seasonal campaign suggestions |
| Meta Ads Manager | `cs-cron-metaads-drive-scanner` | `0 10 * * *` | Scans Google Drive for new creative folders and proposes campaigns |
| Meta Ads Manager | `cs-cron-ga4-attribution-auditor` | `0 11 * * 1` | Weekly conversion tracking and attribution health audit (cross-checks Google Ads with GA4 when connected; disabled by default) |
| Meta Ads Manager | `cs-cron-adjust-creative-roas-reporter` | `0 10 * * *` | Daily Adjust creative-level ROAS report with scale/pause recommendations (disabled by default) |
| Meta Ads Manager | `cs-cron-roasit-creative-roas-reporter` | `30 10 * * *` | Daily Roasit creative-level ROAS report with scale/pause recommendations (disabled by default) |
| Meta Ads Manager | `cs-cron-ads-recommendation-cleanup` | `0 0 * * *` | Nightly cleanup of expired recommendations |
| TikTok Ads Manager | `cs-cron-tiktokads-performance-reporter` | `0 9 * * *` | Performance reporting per advertiser, plus the 30-day reconnect reminder (reads `ad-strategy`) |
| TikTok Ads Manager | `cs-cron-tiktokads-audience-scanner` | `0 10 * * 1` | Weekly audience, creative health and account health audit |
| TikTok Ads Manager | `cs-cron-tiktokads-holiday-planner` | `0 10 * * 3` | Upcoming holidays and seasonal campaign suggestions |
| TikTok Ads Manager | `cs-cron-tiktokads-drive-scanner` | `0 10 * * *` | Scans Google Drive for new creative folders and proposes TikTok Ads campaigns (does nothing until Google Drive is connected) |
| TikTok Ads Manager | `cs-cron-ga4-attribution-auditor` | `0 11 * * 1` | Weekly conversion tracking and attribution health audit (cross-checks Google Ads with GA4 when connected; disabled by default) |
| TikTok Ads Manager | `cs-cron-adjust-creative-roas-reporter` | `0 10 * * *` | Daily Adjust creative-level ROAS report with scale/pause recommendations (disabled by default) |
| TikTok Ads Manager | `cs-cron-roasit-creative-roas-reporter` | `30 10 * * *` | Daily Roasit creative-level ROAS report with scale/pause recommendations (disabled by default) |
| TikTok Ads Manager | `cs-cron-ads-recommendation-cleanup` | `0 0 * * *` | Nightly cleanup of expired recommendations |
| Google Review Manager | `cs-cron-google-review-scanner` | `0 */2 * * *` | Scans Google Business Profile locations for new reviews and prepares replies |

### How Preference and Scheduled Skills Work Together

Each scheduled cron skill reads its paired preference skill at runtime. The mechanism:

1. `POST /UserAgent/CustomSkillUpsert` writes your preference `value` for key `content-tone` (stored as `cs-content-tone`).
2. When the agent starts, each `customskills` / `scheduledskills` row becomes a skill named by its key: a preference skill with key `cs-content-tone` becomes the skill `cs-content-tone`, and a cron skill with key `cs-cron-social-content-scanner` becomes `cs-cron-social-content-scanner`.
3. The scheduled cron skill's `value` (shipped in the integration skill, not user-editable) references its paired preference by its skill name, `cs-<preference-key>`, for example:
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
| `int-metaads-manage` | `meta-ads` (System User or OAuth) | [Meta Ads Skills](/docs/integration-metaads-skills) |
| `int-tiktok-ads` | `tiktok-ads` (Wiro OAuth) | [TikTok Ads Skills](/docs/integration-tiktokads-skills) |
| `int-facebookpage-post` | `facebook-pages` (System User or OAuth) | [Facebook Page Skills](/docs/integration-facebook-skills) |
| `int-instagram-post` | `instagram` (System User or Instagram OAuth) | [Instagram Skills](/docs/integration-instagram-skills) |
| `int-linkedin-post` | `linkedin` (OAuth) | [LinkedIn Skills](/docs/integration-linkedin-skills) |
| `int-twitterx-post` | `twitter` (OAuth) | [Twitter / X Skills](/docs/integration-twitter-skills) |
| `int-tiktok-post` | `tiktok` (OAuth) | [TikTok Skills](/docs/integration-tiktok-skills) |
| `int-youtube-manage` | `youtube` (OAuth) | [YouTube Skills](/docs/integration-youtube-skills) |
| `int-googleads-manage` | `google-ads` (OAuth) | [Google Ads Skills](/docs/integration-googleads-skills) |
| `int-merchant-center` | `google-merchant-center` (OAuth) | [Merchant Center Skills](/docs/integration-merchantcenter-skills) |
| `int-ga4-analytics` | `ga4` (OAuth) | [GA4 Skills](/docs/integration-ga4-skills) |
| `int-google-business-reviews` | `google-business` (Own OAuth) | [Google Business Profile Skills](/docs/integration-googlebusiness-skills) |
| `int-hubspot-crm` | `hubspot` (OAuth) | [HubSpot Skills](/docs/integration-hubspot-skills) |
| `int-mailchimp-email` | `mailchimp` (OAuth or API key) | [Mailchimp Skills](/docs/integration-mailchimp-skills) |
| `int-google-drive` | `google-drive` (Service Account) | [Google Drive Skills](/docs/integration-googledrive-skills) |
| `int-google-calendar` | `google-calendar` (Service Account) | [Google Calendar Skills](/docs/integration-google-calendar-skills) |
| `int-gmail-check` | `gmail` (App Password) | [Gmail Skills](/docs/integration-gmail-skills) |
| `int-firebase-push` | `firebase` (Service Account) | [Firebase Skills](/docs/integration-firebase-skills) |
| `int-wordpress-post` | `wordpress` (App Password) | [WordPress Skills](/docs/integration-wordpress-skills) |
| `int-roasit-attribution` | `roasit` (API token) | [Roasit Skills](/docs/integration-roasit-skills) |
| `int-brevo-email` | `brevo` (API key) | [Brevo Skills](/docs/integration-brevo-skills) |
| `int-sendgrid-email` | `sendgrid` (API key) | [SendGrid Skills](/docs/integration-sendgrid-skills) |
| `int-appstore-reviews`, `int-appstore-metadata`, `int-appstore-events` | `apple-appstore` (JWT / Service Account) | [App Store Skills](/docs/integration-appstore-skills) |
| `int-googleplay-reviews`, `int-googleplay-metadata` | `google-play` (Service Account) | [Google Play Skills](/docs/integration-googleplay-skills) |
| `int-googleplay-events` | `google-play-apps` (Service Account, separate per-app registry) | [Google Play Skills](/docs/integration-googleplay-skills) |
| `int-apollo-sales` | `apollo` (API key) | [Apollo Skills](/docs/integration-apollo-skills) |
| `int-lemlist-outreach` | `lemlist` (API key) | [Lemlist Skills](/docs/integration-lemlist-skills) |
| `int-twilio-channel` | `twilio-voice` (API key) | [Twilio Voice](/docs/integration-twiliovoice-skills) |
| `int-wiro-aimodels` | `wiro` (your own Wiro project API key) | See [Using Wiro AI Models from Your Agent](#using-wiro-ai-models-from-your-agent) |
| `int-calendarific` | `calendarific` (API key) | [Calendarific in your agent](/docs/agent-credentials#calendarific-in-your-agent) |

Agents can optionally forward operator notifications to a Telegram bot via the `telegram` credential (see [Telegram Skills](/docs/integration-telegram-skills)). This is never required; every agent remains fully usable over web chat and the [Messaging API](/docs/agent-messaging) without a bot configured.

### Utility Skills

`util-*` skills need no credential. Most are rule sets that come with an integration skill as one of its `depends_on`. These three can be added to any agent with [`SkillsApply`](#toggling-integration-skills):

| Skill | What it adds | Starter price weight |
|-------|--------------|----------------------|
| `util-weather` | Current weather and a 9-day forecast for any place: temperature, rain, wind and UV from MET Norway's open forecast data, with the place found on OpenStreetMap. | $0 |
| `util-diagram` | Flowcharts, architecture and sequence diagrams, state machines, data models, mind maps, timelines, Gantt plans and concept drawings as PNG images with an editable SVG copy, checked for overlapping or cut-off text. | $0 |
| `util-video-creator` | The Video Creator's playbook: finished videos with voice-over, music and captions from a website or web app (behind a login too), an app-store listing, a document, an article or product photos; 16:9 or 9:16, up to 3 minutes. It brings `util-video-shots`, `util-video-docs`, `util-motion-effects` and `int-wiro-aimodels` with it, so the agent needs your Wiro project key, which pays the video's model runs (see [Using Wiro AI Models from Your Agent](#using-wiro-ai-models-from-your-agent)). `util-motion-effects` and `util-video-creator` always come together, whichever one you turn on. | $29, plus $1 for `int-wiro-aimodels` when the agent doesn't have it yet |

`POST /Skills/List` with `{ "category": "util" }` returns every utility skill.

> **Restart behavior:** Calls to `CustomSkillUpsert`, `CustomSkillRename`, `CustomSkillDelete`, `CustomSkillRevert`, and `SkillsApply` on a running agent (status 3 or 4) each trigger an automatic restart so the new skill configuration is picked up. Same as credential updates. Description-only edits to `CustomSkillUpsert` skip the restart.

## Using Wiro AI Models from Your Agent

`int-wiro-aimodels` lets an agent call Wiro's own AI models (image / video / audio / LLM generation, cover image creation, model discovery) while it works. When it's enabled on an agent:

- `credentials.wiro.apikey` is **operator-supplied**: pick or create a Wiro project at [wiro.ai/panel/projects](https://wiro.ai/panel/projects), copy its API key, and write it via `POST /UserAgent/CredentialUpsert`. Each generated asset is billed to the wallet of the workspace that owns that project (your personal wallet, or the team wallet for a team project).
- The agent can run Wiro models only when `int-wiro-aimodels` is enabled **and** a `wiro.apikey` value has been written.
- `int-wiro-aimodels` is marked `user_invocable: true` in the registry: end-user messages can trigger it directly, and other skills / scheduled tasks invoke it internally when they need to generate content.

Most Wiro-provided agent templates (Social Manager, Blog Content, Push, App Event, Meta Ads, TikTok Ads, Google Ads) ship with `int-wiro-aimodels: true`. Templates that don't need AI generation (App Review Support, Lead Generation Manager) ship with `int-wiro-aimodels: false`. Either way, the agent stays at `status: 6` (Setup Required) until you upsert the `wiro` credential, the same as any other API-key integration.

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/CredentialUpsert" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "fields": [
      { "credentialkey": "wiro", "fieldname": "apikey", "fieldvalue": "wp_xxx_your_wiro_project_api_key" }
    ]
  }'
```

To verify the skill is active on a deployed agent:

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Detail" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "guid": "your-useragent-guid" }'
# The top-level skills[] array should contain { "name": "int-wiro-aimodels", "enabled": true }
# credentials.wiro._connected should be true after the apikey is set
```

### Project key vs operator key

`credentials.wiro.apikey` is a **per-agent Wiro project key**: only the agent uses it, to run Wiro models. The `x-api-key` header you send to the public Wiro endpoints from your own backend (e.g. `POST /UserAgent/Deploy`, `POST /Run`) is your **operator key**, which is entirely separate. If you're building on top of Wiro programmatically and want to call the Run / Task / LLM APIs directly from your own backend, use your operator key (see [Run a Model](/docs/run-a-model) and [LLM & Chat Streaming](/docs/llm-chat-streaming)).

## Update Rules Summary

| Operation | Endpoint | Allowed on preset strategy (`_source: preset-strategy`) | Allowed on skill-bundled cron (`_source: skill-bundle`) | Allowed on user-created cron (`_source: user-created`) |
|---|---|---|---|---|
| Write `value` | `CustomSkillUpsert` | Yes | **No: silently dropped** (skill owns the cron body) | Yes |
| Write `interval` | `CustomSkillUpsert` | **No: silently dropped** (strategies aren't scheduled) | Yes | Yes |
| Write `enabled` | `CustomSkillUpsert` | Yes (disabling suppresses the strategy end-to-end) | Yes | Yes |
| Write `description` | `CustomSkillUpsert` | **No: a changed text is rejected** with `customskill-preset-description-not-editable` (the current text is ignored) | **No: a changed text is rejected** with `customskill-preset-description-not-editable` (the current text is ignored) | Yes |
| Create | `CustomSkillUpsert` with a new key | n/a | n/a | Yes |
| Rename key (+ optional description) | `CustomSkillRename` | **No: preset-forbidden** | **No: preset-forbidden** | Yes (flavour preserved; `cs-cron-*` ↔ `cs-*` rejected) |
| Delete | `CustomSkillDelete` | **Rejected with `suggestion: "disable-via-upsert"`** | **Rejected with `suggestion: "disable-via-upsert"`** | Yes (hard delete: live row + full history purged) |
| Read history | `CustomSkillHistory` | Yes | Yes (only `enabled` / `interval` writes show up) | Yes (post-rename, the chain is migrated under the new key; a `rename` event marks the transition) |
| Revert to preset | `CustomSkillRevert` (`source: "preset"`) | Yes | Yes (resets `interval` / `enabled` to preset defaults) | Yes (deletes the row if no preset baseline exists) |
| Revert to a version | `CustomSkillRevert` (`source: "history"`) | Yes | Yes | Yes |

- Send only the fields you want to change. Omitted fields keep their current values.
- Unknown skill keys return `skill-not-found` in the `errors[]` without altering other state.
- To clear a cron schedule, call `CustomSkillUpsert` with `enabled: false`. Setting `interval: ""` or `null` also clears it.
- Integration toggles (top-level `skills[]`) are a separate endpoint (see [Toggling Integration Skills](#toggling-integration-skills) and [`SkillsApply`](/docs/agent-overview#post-useragentskillsapply)).

### What happens when Wiro updates an agent template

Skills occasionally evolve on Wiro's side: new preset strategies, new bundled crons, improved instructions. Deployed instances are reconciled with the latest template without destroying your edits:

| Row type | Behavior on template update |
|----------|----------------------------|
| Preset strategy (`_source: "preset-strategy"`) | Your `value` is **preserved** (rows with `useredited: true`). New placeholder structure in the template appears only on fresh deploys. |
| Skill-bundled cron (`_source: "skill-bundle"`) | The `value` (cron instructions) is **re-materialized** from the new skill. Your custom `interval` and `enabled` are preserved when `useredited: true`. |
| New preset strategy upstream | Added to your instance with the template's default `value`. |
| Preset strategy removed upstream | Removed from your instance on the next reconciliation. |
| User-created cron | Always preserved. |

Cascade reconciliation is async: each template update enqueues a job that fans out to every deployed useragent in the background. Per-useragent edits (`useredited: true`) are protected from being overwritten by the cascade.
