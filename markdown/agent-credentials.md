# Agent Credentials & OAuth

Configure third-party service connections for your agent instances. Browse the platform's credential registry, set API keys + OAuth, and audit credential edits over time.

## Overview

Wiro agents connect to external services — social platforms, ad networks, email tools, CRMs — through two credential methods:

1. **API Key credentials** — set directly via `POST /UserAgent/CredentialUpsert` (bulk field upsert per provider).
2. **OAuth credentials** — redirect-based authorization via `POST /UserAgentOAuth/{Provider}Connect`, where Wiro handles token exchange server-side.

Each external service is documented as its own **integration page** with the complete setup walkthrough, API reference, troubleshooting, and multi-tenant architecture notes. Use the catalog below to jump to the one you need.

**Read & write paths at a glance:**

| Operation | Endpoint |
|-----------|----------|
| Browse all credentials in the registry | [`POST /Credentials/List`](#post-credentialslist) (public) |
| Inspect a single credential schema | [`POST /Credentials/Detail`](#post-credentialsdetail) (public) |
| Find the credential a skill needs | [`POST /Skills/CredentialSchema`](/docs/agent-skills#post-skillscredentialschema) (public) |
| Write one or more credential fields | [`POST /UserAgent/CredentialUpsert`](/docs/agent-overview#post-useragentcredentialupsert) |
| Read version history of a credential | [`POST /UserAgent/CredentialFieldHistory`](/docs/agent-overview#post-useragentcredentialfieldhistory) |

> Read responses from `POST /UserAgent/Detail` / `POST /UserAgent/MyAgents` expose the composed `credentials` tree (each provider with its `_connected` / `optional` / `extra` / `_editable` / `_schema` flags), the `customskills[]` array, the `scheduledskills[]` array (cron skills), the `skills[]` array of enabled skill names, the `peractioncosts` object, and the flat credit fields (`monthlycredits`, `extracredits`, `usedcredits`, `remainingcredits`, `creditperiod`, `creditsyncat`) as **top-level fields** on the useragent object. See [Agent Overview](/docs/agent-overview) for the full endpoint catalog.

## Credential Registry Endpoints

These endpoints are **public — no authentication required**. They return data straight from the credential registry — useful when you want to render a "Connect this provider" form without a deployed useragent (e.g. inside an onboarding wizard).

### **POST** /Credentials/List

Lists all credentials in the registry.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `credential_mode` | string | No | Filter by mode: `"oauth"`, `"sa"` (service account), `"api_key"`, `"multi_api_key"`, `"hybrid"` (OAuth + API key fallback), `"imap_credentials"`, `"jwt_sa"`, `"rule_only"`. |
| `wiro_connect_pending` | boolean | No | Filter by the "Wiro mode coming soon" flag (Meta, LinkedIn, and TikTok credentials while Wiro's app is awaiting App Review). |

##### Response

```json
{
  "result": true,
  "errors": [],
  "total": 22,
  "credentials": [
    {
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
          "help": "<ol><li>Meta for Developers → select your app</li><li>App Settings → Basic</li><li>Click Show next to App Secret and copy</li></ol>",
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
  ]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `key` | `string` | Canonical credential key. Use this in `CredentialUpsert.fields[].credentialkey`. |
| `title` | `string` | Display label shown on credential cards. |
| `icon` | `string` | Path or URL to the brand icon (relative paths absolutized server-side). |
| `brand_color` / `brand_text_color` / `brand_logo_filter` | `string\|null` | Brand colours and CSS filter for icon rendering — same shape as on skill registry entries. |
| `docs_url` | `string\|null` | Slug of the integration page on this docs site. Frontends prefix with `/docs/`. |
| `credential_mode` | `string` | One of `"oauth"`, `"sa"` (service account), `"api_key"`, `"multi_api_key"`, `"hybrid"` (OAuth + API key fallback), `"imap_credentials"`, `"jwt_sa"`, `"rule_only"`. |
| `connection_modes` | `array<string>` | The auth modes the credential supports — usually `["wiro", "own"]` for OAuth credentials, `["api_key"]` for API-key credentials, `["sa"]` for service-account credentials. Drives the auth-method picker in the panel. |
| `wiro_connect_pending` | `boolean` | When `true`, Wiro's shared OAuth client is awaiting provider review (currently the Meta family — `facebook-pages`, `instagram`, `meta-ads` — plus `linkedin` and `tiktok`). End users see a "Wiro mode coming soon" badge in the connection picker; in the meantime they can connect via **own** mode using their own developer app. |
| `credential_schema` | `array<field>` | Per-field schema describing the credential form. Each entry is a `field` object — see below. |
| `oauth_provider` | `object\|null` | OAuth wiring (endpoints, button styling, picker config) when `credential_mode` includes OAuth. `null` for non-OAuth credentials. See below. |
| `used_by_skills` | `array<string>` | Skill names that consume this credential — useful for "which skills will this connection enable?" hints. |

**`credential_schema[]` field object:**

| Sub-field | Type | Description |
|-----------|------|-------------|
| `key` | `string` | Field name (matches the database column under `useragentcredentialfields.fieldname`). |
| `type` | `string` | Input type: `"text"`, `"password"`, `"select"`, `"boolean"`, `"file-upload"`, `"custom"`. |
| `label` | `string` | Display label for the form input. |
| `required` | `boolean` | Whether the field must be filled before the agent can use the integration. |
| `placeholder` | `string?` | Placeholder text for the input. |
| `pattern` | `string?` | Regex the value must satisfy. |
| `maxlength` / `minlength` | `number?` | Length constraints. |
| `options` | `array?` | For `type: "select"` — `[{ label, value }]` choices. |
| `default` | `string?` | Default value applied when the user hasn't set anything yet. |
| `help` | `string?` | HTML help text rendered under the input. |
| `show_toggle` | `boolean?` | For `type: "password"` — render a "show / hide" toggle. |
| `oauth_managed` | `boolean?` | `true` when the field is set as part of the OAuth flow (cannot be edited by the user once connected). |
| `auto_filled_by_oauth` | `boolean?` | `true` when the OAuth callback writes the value (e.g. `igusername`). |
| `readonly_when_connected` | `boolean?` | `true` when the field becomes read-only after a successful OAuth connection. |
| `only_in_modes` | `array<string>?` | When set (e.g. `["own"]`), the field only appears in the listed `authmethod` mode. |
| `platform_managed` | `boolean?` | `true` when Wiro fills the value server-side (you can't supply it). Such credentials are entirely hidden from `UserAgent/Detail` for non-admin callers. |
| `item_schema` / `item_type` | `object?` | For array-of-object fields — describes the per-entry shape (e.g. `apple-appstore.apps[].{appname, appid}`). |

**`oauth_provider` object** (present when `credential_mode` includes OAuth):

| Sub-field | Type | Description |
|-----------|------|-------------|
| `auth_method_value` | `string` | The literal `authmethod` field value the panel should write to enable Wiro-managed OAuth (typically `"wiro"`). |
| `connect_endpoint` / `disconnect_endpoint` / `status_endpoint` | `string` | The OAuth endpoints under `/UserAgentOAuth/...` that drive the connect / disconnect / status flow for this provider. |
| `connect_button_label` / `connect_button_icon` / `connect_button_brand_color` / `connect_button_text_color` / `connect_button_logo_filter` | `string` | Branding for the "Connect with X" button. |
| `username_field` | `string` | The credential field that holds the connected account name (e.g. `"igusername"`, `"channelname"`). |
| `return_query_param` / `return_error_param` / `return_error_detail_param` | `string` | URL params Wiro appends to the `redirectURL` when the OAuth flow completes (success / error / detail). |
| `account_picker` | `object\|null` | When non-null, indicates a second OAuth step is required to pick an account / page / channel (e.g. Facebook page picker, YouTube channel picker). Carries the `endpoint` and which field stores the picked id. |
| `extra_step` | `object\|null` | Reserved for providers with a third onboarding step beyond OAuth + picker (currently null for every provider). |

**`fieldstatus` values** — note: this is **not** part of the registry schema; it's the runtime classification stamped onto each `useragentcredentialfields` row when it's written. It controls who can see the value:

| Value | Who writes it | Visible to API caller? |
|-------|---------------|------------------------|
| `user` | API callers + UI users | Yes |
| `oauth_app` | API callers (own-mode only) | Yes (live), redacted to `[REDACTED]` in history |
| `oauth_session` | OAuth callback (server-only) | **No** — always stripped from responses |
| `oauth_picker` | OAuth callback / `Set*` picker endpoints | Yes |
| `platform` | Wiro internal | **No** — stripped for `user`-role callers |
| `computed` | Server-derived | Yes |
| `control` | Wiro internal | **No** — stripped for `user`-role callers |

### **POST** /Credentials/Detail

Returns a single credential entry by key.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `key` | string | Yes | Canonical credential key (e.g. `"instagram"`, `"google-ads"`, `"telegram"`). |

##### Response

Returns the **same full credential entry** as a row from `Credentials/List` — every field listed in the table above is present. Example for `key: "instagram"`:

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
        "help": "Meta for Developers → My Apps → Create App → copy App ID.",
        "oauth_managed": true,
        "only_in_modes": ["own"]
      },
      {
        "key": "appsecret",
        "type": "password",
        "label": "App Secret",
        "required": true,
        "show_toggle": true,
        "help": "Meta for Developers → App Settings → Basic → Show next to App Secret.",
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

Returns `{ "result": false, "errors": [{ "code": 404, "message": "Credential not found: <key>" }] }` if the key is unknown.

## Integration Catalog

### OAuth Integrations

| Integration | Auth Modes | Setup Guide |
|-------------|------------|-------------|
| Meta Ads | Own only (Wiro mode coming soon) | [Meta Ads Skills](/docs/integration-metaads-skills) |
| Facebook Page | Own only (Wiro mode coming soon) | [Facebook Page Skills](/docs/integration-facebook-skills) |
| Instagram | Own only (Wiro mode coming soon) | [Instagram Skills](/docs/integration-instagram-skills) |
| LinkedIn | Own only (Wiro mode coming soon) | [LinkedIn Skills](/docs/integration-linkedin-skills) |
| Twitter / X | Wiro + Own | [Twitter Skills](/docs/integration-twitter-skills) |
| TikTok | Wiro + Own | [TikTok Skills](/docs/integration-tiktok-skills) |
| Google Ads | Wiro + Own | [Google Ads Skills](/docs/integration-googleads-skills) |
| YouTube | Wiro + Own | [YouTube Skills](/docs/integration-youtube-skills) (shares Google OAuth client with Google Ads) |
| Google Analytics 4 | Wiro + Own | [Google Analytics 4 Skills](/docs/integration-ga4-skills) (shares Google OAuth client with Google Ads) |
| Merchant Center | Wiro + Own | [Merchant Center Skills](/docs/integration-merchantcenter-skills) (shares Google OAuth client with Google Ads) |
| HubSpot | Wiro + Own | [HubSpot Skills](/docs/integration-hubspot-skills) |
| Mailchimp | Wiro + Own + API Key | [Mailchimp Skills](/docs/integration-mailchimp-skills) |

> **Google OAuth is shared across 4 APIs.** Google Ads, YouTube, Google Analytics 4, and Merchant Center are all authorized through a single Wiro OAuth client in "wiro" mode — one Google Cloud project, one OAuth 2.0 Client ID, multiple API scopes. In "own" mode you may reuse one of your own OAuth clients the same way, or set up separate ones per product.

### Service Account Integrations

| Integration | Setup Guide |
|-------------|-------------|
| Google Drive | [Google Drive Skills](/docs/integration-googledrive-skills) |
| Google Calendar | [Google Calendar Skills](/docs/integration-google-calendar-skills) |
| Google Play | [Google Play Skills](/docs/integration-googleplay-skills) |

> **Meta Platforms availability:** While Wiro's shared Meta App is under review by Meta, the Meta Ads, Facebook Page, and Instagram integrations must be connected using your own Meta Developer App in Development Mode. No App Review is required — users who are listed in your app's Roles (Testers/Developers) can connect without review. See each integration page for step-by-step setup.

### API Key Integrations

| Integration | Setup Guide |
|-------------|-------------|
| Gmail | [Gmail Skills](/docs/integration-gmail-skills) |
| Telegram | [Telegram Skills](/docs/integration-telegram-skills) |
| Firebase | [Firebase Skills](/docs/integration-firebase-skills) |
| WordPress | [WordPress Skills](/docs/integration-wordpress-skills) |
| App Store Connect | [App Store Skills](/docs/integration-appstore-skills) |
| Apollo | [Apollo Skills](/docs/integration-apollo-skills) |
| Lemlist | [Lemlist Skills](/docs/integration-lemlist-skills) |
| Brevo | [Brevo Skills](/docs/integration-brevo-skills) |
| SendGrid | [SendGrid Skills](/docs/integration-sendgrid-skills) |
| Twilio Voice | [Twilio Voice Channel](/docs/voice-agent-twilio-channel) |

## Platform-Managed Credentials

Some credentials are **managed by Wiro on your behalf** — you don't provide them, you can't see them in API responses, and attempts to set them via `POST /UserAgent/CredentialUpsert` are rejected (the server only accepts fields with `fieldstatus: "user"` from API callers):

- **OpenAI** — Wiro uses its own OpenAI account to power the LLM brain of every agent. You never need to supply an OpenAI key.
- **Wiro platform** (`credentials.wiro.apiKey`) — pre-configured for agents that have the `wiro-generator` skill enabled. This skill lets the agent call Wiro's own AI models (image/video/audio/LLM) internally — see [Using Wiro AI Models from Your Agent](/docs/agent-skills#using-wiro-ai-models-from-your-agent).
- **Calendarific** — pre-configured for agents that use the Calendarific skill (holiday/special-date lookups).

These credentials are stored with `fieldstatus: "platform"` in the template. `POST /UserAgent/Detail` omits them from the `credentials` response (they're filtered out server-side). If your agent needs them, they're already wired up.

> **Don't confuse platform-managed `credentials.wiro.apiKey` with your regular Wiro API key.** The key in `credentials.wiro.apiKey` is internal to the agent container; the `x-api-key` header you send to Wiro endpoints from your own backend is entirely separate (see [Authentication](/docs/authentication)).

## Auditing Credential Changes — `CredentialFieldHistory`

Every credential field write is appended to a versioned history. Use `POST /UserAgent/CredentialFieldHistory` to read it — same idea as `CustomSkillHistory` for skills.

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/CredentialFieldHistory" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
    "credentialkey": "instagram"
  }'
```

##### Response

```json
{
  "result": true,
  "errors": [],
  "entries": [
    {
      "guid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
      "useragentguid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
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
      "guid": "b2c3d4e5-f6a7-8901-bcde-f23456789012",
      "useragentguid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
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

`changedby_user` is the resolved actor object (`uuid`, `firstname`, `lastname`, `email`, `username`, `avatar`, `avatarinitials`). It is `null` when `changedby` is a sentinel like `"system"` / `"backfill-*"` (cron / migration writes) or when the user record has been deleted.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Your UserAgent instance guid |
| `credentialkey` | string | Yes | Provider key (e.g. `"instagram"`, `"wordpress"`) |
| `startdate` | number | No | UTC epoch seconds — return entries on/after this time |
| `enddate` | number | No | UTC epoch seconds — return entries on/before this time |

> **Sensitive values are redacted in history.** `oauth_session` rows (access/refresh tokens) **never** appear in history at all (they're stripped before persisting). `clientsecret` is stored as `[REDACTED]` in history rows; the live row carries the real secret. Use `POST /UserAgent/Detail` to read the current live values; `CredentialFieldHistory` only shows the audit trail.

## Setting API Key Credentials

Use `POST /UserAgent/CredentialUpsert` with a flat `fields[]` array. Each field row carries `{credentialkey, fieldname, fieldvalue}`. Each integration page documents the exact field names and shape.

### Bulk upsert pattern

`/UserAgent/CredentialUpsert` takes an array of field rows in one request. Only the fields you send are written; other credential groups and other fields inside the same group are untouched. The Wiro Dashboard follows this pattern exactly — each credential card sends a single `CredentialUpsert` call with its group's fields.

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/CredentialUpsert" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "fields": [
      { "credentialkey": "gmail", "fieldname": "account",     "fieldvalue": "agent@company.com" },
      { "credentialkey": "gmail", "fieldname": "apppassword", "fieldvalue": "xxxx xxxx xxxx xxxx" }
    ]
  }'
```

Response: `{ "result": true, "applied": 2, "errors": [] }`. `applied` is the count of fields actually written; rows that fail validation (reserved fieldname prefixed with `_`, invalid `fieldstatus` for the caller's role) are skipped and listed in `errors` without rolling back the others. If the agent was running, it is automatically restarted to apply the new values.

### Field-level write rules

- **Only `fieldstatus: "user"` fields may be written by API callers.** The template marks OAuth app keys (`oauth_app`), OAuth tokens (`oauth_session`), OAuth picker selections (`oauth_picker`), and platform-managed values (`platform`) with non-user statuses — the API rejects attempts to write them directly with `agent-fieldstatus-not-allowed-for-role`. OAuth-managed values are written by Wiro's OAuth callback flow, not by your API.
- **Reserved fieldnames are rejected.** Any `fieldname` starting with `_` (e.g. `_isoptional`, `_isextra`) is a sentinel used by the template itself and cannot be set by API callers.
- Credential groups that don't exist in the template cannot be created — you can only write fields for credential keys the agent declares.
- **Nested arrays** (`firebase.accounts[].apps[]`, `googledrive.folders[]`, `appstore.apps[]`, etc.) are supported via the optional `parentfield` (dotted path) and `ordinal` (array index) on each field row. Send the complete desired list — positional merge applies: indices you don't send are kept from the previous state, unless you explicitly send an empty set to clear them.
- Use `POST /UserAgent/Detail` to inspect which fields each credential exposes, and the `_connected` / `optional` / `extra` flags that describe its readiness state.

### Prepaid deploy — inline setup supported (with limitations)

If you call `POST /UserAgent/Deploy` with `useprepaid: true`, you may pass `credentials`, `customskills` (or the equivalent key `customskills`), and `skills` at the **top level of the Deploy body**. The server applies them to the normalized child tables in the same call (one-shot deploy + initial setup).

**Deploy body `credentials` limitations:**

- Only **flat fields** are accepted — values must be `string` or `number`. Nested object values are ignored.
- Nested arrays (`firebase.accounts[]`, `googledrive.folders[]`, `appstore.apps[]`, `googleplay.apps[]`) **cannot be set via the Deploy body**. Deploy an empty instance first, then call `POST /UserAgent/CredentialUpsert` with `parentfield`/`ordinal` rows to populate arrays.
- Fieldnames starting with `_` (sentinel rows like `_isoptional`, `_isextra`) are silently skipped.
- All fields written through Deploy are set to `fieldstatus: "user"` automatically — you can't choose a different fieldstatus from the Deploy body. Use `POST /UserAgent/CredentialUpsert` afterwards if you need admin-only statuses.

**Deploy body `customskills` semantics:**

- Each entry must have a `key`. Server reads `value`, `interval`, `enabled`, `description`, and treats `_user_created: true` as an explicit user-created cron (auto-prefixing the key with `cron-` if missing).
- The request body accepts a single top-level `customskills` array; server-side values are merged onto any existing preset rows for the same key.

If you skip these keys in Deploy entirely, the instance is created empty and you set credentials/skills later with `CredentialUpsert`, `CustomSkillUpsert`, and `SkillsApply`.

## OAuth Authorization Flow

For services that require user authorization, Wiro implements a full OAuth redirect flow. The entire process is **fully white-label** — your end users interact only with your app and the provider's consent screen. They never see or visit wiro.ai.

> The `redirecturl` you pass to Connect is **your own URL**. After authorization, users are redirected back to your app with status query parameters. HTTPS is required; `http://localhost` and `http://127.0.0.1` are allowed for development only.

### Generic flow

```
Your App (Frontend)           Your Backend              Wiro API              Provider
       |                            |                       |                      |
  (1)  | "Connect X" click          |                       |                      |
       |--------------------------->|                       |                      |
  (2)  |                            |  POST /{P}Connect --> |                      |
       |                            |  { useragentguid,     |                      |
       |                            |    redirecturl,       |                      |
       |                            |    authmethod }       |                      |
  (3)  |                            |<-- { authorizeUrl }   |                      |
  (4)  |<--- redirect to authorizeUrl -------------------------------------------->|
  (5)  |                            |                       |<-- User clicks Allow |
  (6)  |                            |  (invisible callback) |                      |
       |                            |  Wiro exchanges code  |<---------------------|
       |                            |  for tokens, saves    |                      |
  (7)  |<------- 302 to YOUR redirecturl --------------------------------------->  |
       |        ?{provider}_connected=true&...                                     |
```

### Auth Methods — `"wiro"` vs `"own"`

|  | `"wiro"` | `"own"` |
|--|---------|---------|
| **OAuth app credentials** | Wiro's pre-configured app | Your own app on the provider's developer portal |
| **Setup required** | None — just call Connect | Create app on provider, save credentials via Update, register Wiro's callback URL |
| **Consent screen branding** | Shows "Wiro" as the app name | Shows **your app name** |
| **Redirect after auth** | To your `redirecturl` | To your `redirecturl` |
| **User sees wiro.ai?** | No | No |
| **Token management** | Automatic by Wiro | Automatic by Wiro |
| **Best for** | Quick setup when available | Custom branding or bypassing review processes |

### Own Mode = 2-Step API Flow

Own mode requires two sequential calls before initiating OAuth:

```bash
# Step 1: Save your provider app credentials + authmethod via CredentialUpsert
#
# NOTE: `clientid` / `clientsecret` are normally fieldstatus="oauth_app" in the
# template — and the API rejects user-role writes to them. The template flips
# them to fieldstatus="user" when the credential is configured for own mode
# (so customers can bring their own keys); on those templates the call below
# works. If your API key gets `agent-fieldstatus-not-allowed-for-role`, the
# template doesn't support own mode and you should use wiro mode instead.

curl -X POST "https://api.wiro.ai/v1/UserAgent/CredentialUpsert" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "fields": [
      { "credentialkey": "twitter", "fieldname": "clientid",     "fieldvalue": "YOUR_CLIENT_ID" },
      { "credentialkey": "twitter", "fieldname": "clientsecret", "fieldvalue": "YOUR_CLIENT_SECRET" },
      { "credentialkey": "twitter", "fieldname": "authmethod",   "fieldvalue": "own" }
    ]
  }'

# Step 2: Initiate OAuth
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/XConnect" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "redirecturl": "https://your-app.com/callback",
    "authmethod": "own"
  }'
```

For Wiro mode: skip Step 1, just call Step 2 with `authmethod: "wiro"` (or omit — it defaults to `"wiro"`).

### Callback URL pattern (own mode)

Register this URL in your OAuth app settings on the provider's developer portal:

```
https://api.wiro.ai/v1/UserAgentOAuth/{Provider}Callback
```

Provider-specific paths: `XCallback`, `TikTokCallback`, `IGCallback`, `FBCallback`, `LICallback`, `GAdsCallback`, `MetaAdsCallback`, `MCCallback`, `YTCallback`, `GA4Callback`, `HubSpotCallback`, `MailchimpCallback`.

### Callback success & error parameters

| Provider | Success Params | Error Param |
|----------|---------------|-------------|
| Twitter / X | `x_connected=true&x_username=...` | `x_error=...` (+ `x_error_detail=...`) |
| TikTok | `tiktok_connected=true&tiktok_username=...` | `tiktok_error=...` (+ `tiktok_error_detail=...`) |
| Instagram | `ig_connected=true&ig_username=...` | `ig_error=...` (+ `ig_error_detail=...`) |
| Facebook Pages | `fb_connected=true&fb_pages=[...]` | `fb_error=...` (+ `fb_error_detail=...`) |
| LinkedIn | `li_connected=true&li_name=...` | `li_error=...` (+ `li_error_detail=...`) |
| Google Ads | `gads_connected=true&gads_accounts=[...]` | `gads_error=...` (+ `gads_error_detail=...`) |
| Meta Ads | `metaads_connected=true&metaads_accounts=[...]` | `metaads_error=...` (+ `metaads_error_detail=...`) |
| Merchant Center | `mc_connected=true&mc_accounts=[...]` | `mc_error=...` (+ `mc_error_detail=...`) |
| YouTube | `yt_connected=true&yt_channels=[...]` | `yt_error=...` (+ `yt_error_detail=...`) |
| GA4 | `ga4_connected=true&ga4_properties=[...]` | `ga4_error=...` (+ `ga4_error_detail=...`) |
| HubSpot | `hubspot_connected=true&hubspot_portal=...&hubspot_name=...` | `hubspot_error=...` (+ `hubspot_error_detail=...`) |
| Mailchimp | `mailchimp_connected=true&mailchimp_account=...` | `mailchimp_error=...` (+ `mailchimp_error_detail=...`) |

> **Conditional params:** `gads_accounts`, `mc_accounts`, `yt_channels`, `ga4_properties`, and `metaads_accounts` are omitted from the redirect when the provider returns zero items (for example, no accessible Google Ads customers, or a developer token is missing in Wiro mode). `fb_pages` is always present on success — Facebook returns `fb_error=no_pages` instead when the user has no administered Pages.

Common error codes across providers:

| Code | Meaning |
|------|---------|
| `missing_params` | Callback hit without `state` or `code`. |
| `authorization_denied` | User cancelled, or (Meta Dev Mode) not in App Roles. |
| `session_expired` | 15-minute OAuth state cache expired. |
| `token_exchange_failed` | Wrong Client/App Secret or redirect URI mismatch. |
| `useragent_not_found` | Invalid or unauthorized `useragentguid`. |
| `invalid_config` | Agent has no credentials block for the provider. |
| `internal_error` | Unexpected server error. |

Provider-specific codes:

| Code | Provider | Meaning |
|------|----------|---------|
| `no_pages` | Facebook | OAuth succeeded but the user administers no Pages. |
| `template_not_found` | Google Ads (Wiro mode) | Wiro's shared template doesn't have `googleads` credentials; switch to own mode. |

> The `useragent_not_found` error value (snake_case) appears in redirect URLs. The same condition surfaces as `"User agent not found or unauthorized"` in JSON responses from Connect/Disconnect endpoints.

## Generic OAuth Endpoints

All integrations share these three endpoints. Replace `{Provider}` with one of the URL-prefix codes Wiro ships:

| URL prefix | Provider | Canonical credential key |
|------------|----------|--------------------------|
| `X` | Twitter / X | `twitter` |
| `TikTok` | TikTok | `tiktok` |
| `IG` | Instagram | `instagram` |
| `FB` | Facebook Pages | `facebook-pages` |
| `LI` | LinkedIn | `linkedin` |
| `GAds` | Google Ads | `google-ads` |
| `MetaAds` | Meta Ads | `meta-ads` |
| `MC` | Google Merchant Center | `google-merchant-center` |
| `YT` | YouTube | `youtube` |
| `GA4` | Google Analytics 4 | `ga4` |
| `HubSpot` | HubSpot | `hubspot` |
| `Mailchimp` | Mailchimp | `mailchimp` |

### POST /UserAgentOAuth/{Provider}Status

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Agent instance GUID. |

##### Response

The shape is consistent across providers — only the **identity field** name changes (some providers expose the connected account under `username`, others under a provider-specific key like `linkedinname`, `customerid`, `merchantid`):

```json
{
  "result": true,
  "errors": [],
  "connected": true,
  "username": "yourbrand",
  "connectedat": "1714694410",
  "tokenexpiresat": "1719878410",
  "refreshtokenexpiresat": "1730073610"
}
```

| Field | Type | Description | Providers |
|-------|------|-------------|-----------|
| `connected` | `boolean` | `true` when Wiro has a valid access token AND every required picker field (ad-account id, page id, customer id, channel id, merchant id, GA4 property id, …) is populated. |  All |
| `connectedat` | `string` | Unix-seconds timestamp of the last successful Connect / token refresh. Empty string when never connected. | All |
| `tokenexpiresat` | `string` | Unix-seconds when the current access token expires. Empty for Mailchimp (no expiry). | All except Mailchimp |
| `refreshtokenexpiresat` | `string` | Unix-seconds when the refresh token expires. Only set for providers that issue refresh tokens. | Twitter / X, TikTok, LinkedIn |
| `username` | `string` | Connected account identifier. Replaced by a provider-specific key on some providers (see below). | Twitter / X, TikTok, Instagram, Facebook Pages, HubSpot, Mailchimp |
| `linkedinname` | `string` | LinkedIn profile name (replaces `username`). | LinkedIn |
| `customerid` / `customerdescriptivename` | `string` | Google Ads customer id + human-readable label. | Google Ads |
| `merchantid` | `string` | Merchant Center merchant id. | Google Merchant Center |
| `channelid` / `channelname` | `string` | YouTube channel id + display name. | YouTube |
| `propertyid` / `propertyname` | `string` | GA4 property id + human-readable label. | GA4 |
| `adaccountid` / `adaccountname` | `string` | Meta Ads account id (without `act_` prefix) + label. | Meta Ads |

### POST /UserAgentOAuth/{Provider}Disconnect

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/{Provider}Disconnect" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "useragentguid": "your-useragent-guid" }'
```

Response: `{ "result": true, "errors": [] }`. The agent restarts automatically if it was running. Twitter/X and TikTok additionally call the provider's revoke endpoint; other providers only clear the stored credentials (the token remains valid on the provider side until it expires).

### POST /UserAgentOAuth/TokenRefresh

> **API users don't normally call this endpoint.** Wiro's agent runtime refreshes tokens automatically via this endpoint itself — see [Automatic token refresh](#automatic-token-refresh) below. TokenRefresh is exposed publicly mainly for debugging and manual overrides.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Agent instance GUID. |
| `provider` | string | Yes | Canonical credential key — one of: `twitter`, `tiktok`, `instagram`, `facebook-pages`, `linkedin`, `google-ads`, `meta-ads`, `hubspot`, `google-merchant-center`, `youtube`, `ga4`. |

**Mailchimp is not supported** — its tokens don't expire. Calling TokenRefresh with `provider: "mailchimp"` returns `Invalid provider`.

##### Response

```json
{
  "result": true,
  "errors": [],
  "accesstoken": "EAAB...",
  "refreshtoken": "AQX..."
}
```

`refreshtoken` is empty for providers that don't issue one (Instagram, Facebook Pages, Meta Ads, Google Ads usually).

### Automatic token refresh

Every running agent container runs background cron jobs that call `POST /UserAgentOAuth/TokenRefresh` against this API on a schedule tuned to each provider's token lifetime. There is **nothing to set up** — as long as the agent is running, tokens are kept fresh.

Refresh cadence inside the agent container:

| Provider | Cron interval | Token lifetime |
|----------|---------------|----------------|
| HubSpot | every 20 min | 30 min |
| Google Ads | every 45 min | 1 hour |
| Twitter / X | every 90 min | 2 hours |
| Instagram, Facebook, Meta Ads, LinkedIn, TikTok | once per day | 1–60 days |
| Mailchimp | never (tokens don't expire) | — |

An initial refresh also runs on every container startup, so tokens are always current by the time the first skill call goes out.

**You should manually call TokenRefresh only if:**

- You're debugging a stuck integration and want to force a new token immediately.
- The agent has been stopped for longer than the token lifetime and you want to pre-warm tokens before Start.
- You want to verify the refresh logic end-to-end for a provider.

Hardcoded token TTLs that Wiro stores after each refresh:

| Provider | Access Token `tokenexpiresat` | Refresh Token |
|----------|--------------------------------|----------------|
| Twitter / X | 2 hours | ~180 days |
| TikTok | 1 day | ~1 year |
| Instagram | 60 days | N/A (refreshes with current access token via `ig_refresh_token`) |
| Facebook | 60 days | N/A (refreshes via `fb_exchange_token`) |
| LinkedIn | 60 days | From provider response (~1 year typical) |
| Google Ads | 1 hour | Long-lived (no expiry in typical use) |
| Meta Ads | 60 days | N/A |
| HubSpot | 30 minutes | Long-lived |
| Mailchimp | No expiry | N/A |

## Provider-Specific Post-Callback Endpoints

Some integrations require a secondary step after the OAuth callback to finalize the connection. These are documented in full on each integration page.

### Meta Ads — Set Ad Account

After `MetaAdsCallback`, the user must choose an ad account:

**POST** `/UserAgentOAuth/MetaAdsSetAdAccount`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Agent instance GUID. |
| `adaccountid` | string | Yes | Ad account ID without `act_` prefix (prefix stripped automatically). |
| `adaccountname` | string | No | Display name shown in dashboards. |

See [Meta Ads Skills](/docs/integration-metaads-skills).

### Facebook Page — Set Page

After `FBCallback`, the connection is incomplete until the user chooses a Page:

**POST** `/UserAgentOAuth/FBSetPage`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Agent instance GUID. |
| `pageid` | string | Yes | A page ID from the `fb_pages` callback array. |
| `pagename` | string | No | Display name override. |

Must be called within 15 minutes of the callback (pending cache TTL). See [Facebook Page Skills](/docs/integration-facebook-skills).

### Google Ads — Set Customer ID

After `GAdsCallback`, pick an accessible customer:

**POST** `/UserAgentOAuth/GAdsSetCustomerId`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Agent instance GUID. |
| `customerid` | string | Yes | 10-digit customer ID (dashes stripped). |
| `customerdescriptivename` | string | No | Human-readable label shown in the dashboard (e.g. `"Acme Corp — Production"`). |

See [Google Ads Skills](/docs/integration-googleads-skills).

## Web UI Behaviors (Wiro Dashboard)

If you're comparing against the Wiro Dashboard, here's what happens under the hood for parity with the API:

- **Per-group save**: Each credential card has its own Save button. Saving a card calls `POST /UserAgent/CredentialUpsert` with only that group's `fields[]` (one request per card).
- **Own mode 2-step**: When a user clicks "Connect" in own mode, the Dashboard first calls `CredentialUpsert` to save `appid`/`appsecret` + `authmethod: "own"`, then calls the Connect endpoint with `authmethod: "own"`. API users must make both calls explicitly.
- **Full-page redirect, not popup**: `window.location.href = authorizeUrl` — no popup windows (avoids third-party cookie issues).
- **No manual token refresh button**: Refresh is fully automatic. `TokenRefresh` exists for debugging only.
- **LLM Markdown feature**: The Dashboard includes an "LLM Markdown" tab that generates a ready-to-paste prompt for AI assistants summarizing every credential field the agent needs. Useful for API users building their own configuration UIs — see the per-integration help texts for equivalent guidance.
- **No format validation**: Wiro doesn't validate email/URL formats server-side. Malformed values fail at runtime inside the skill when it tries to use them.
- **Platform-managed credentials are hidden**: Groups whose fields all have `fieldstatus: "platform"` (OpenAI, Wiro, Calendarific) are omitted from `POST /UserAgent/Detail` responses entirely. They're pre-configured by Wiro and can't be set by customers.

## Setup Required State

If an agent has required credentials not yet filled in, it's in **Setup Required** state (`status: 6`). It can't be started until credentials are complete.

- Fresh normal deploy → status `2` (Queued) immediately.
- Fresh prepaid deploy → status `6` (Setup Required) — fill credentials via `POST /UserAgent/CredentialUpsert`, then call Start.
- `setuprequired` flag in `UserAgent/Detail` / `UserAgent/MyAgents` is `true` when any non-optional credential is still incomplete. The server treats a credential as complete when either:
  - **OAuth credentials** — `_connected: true` (access token present **and** every required picker field populated), or
  - **API-key credentials** — at least one field with `fieldstatus: "user"` has a non-empty value (any one user-writable field filled in makes the credential count as "entered"; there is no deeper per-field validation).

  The two branches are checked together: `setuprequired` stays `true` until every required credential passes one of them.

## Security

- **Tokens are stored server-side** in the normalized `useragentcredentialfields` table (one row per field). `TokenRefresh` returns new tokens in its own response.
- **`oauth_session` fields are always stripped** from Status, Detail, `MyAgents`, and `CredentialUpsert` responses — `accesstoken`, `refreshtoken`, `tokenexpiresat`, `pageAccessToken` and any similar rows never leave the server.
- **`platform` fields are stripped for `user` role callers** (default for API keys without ADMIN scope). OpenAI / Wiro / Calendarific keys are invisible in the response.
- **`oauth_app` fields (`clientsecret`, `appsecret`) are visible in Detail responses** after an admin / OAuth "own mode" setup writes them. If you build a customer-facing UI on top of this API, treat them as admin-only in your own layer. The append-only credential history redacts `clientsecret` to `[REDACTED]` and always redacts `oauth_session` rows; only the live row can be read.
- **`fieldstatus` enforces least-privilege writes.** API callers only hold `user` role — they cannot write `oauth_app`, `oauth_session`, `oauth_picker`, `platform`, `computed`, or `control` fields. Attempts to do so return `agent-fieldstatus-not-allowed-for-role` in the `errors[]` array without altering data.
- The `redirecturl` receives only connection status parameters — no tokens, no secrets.
- OAuth state parameters use a 15-minute TTL cache to prevent replay attacks.
- Redirect URLs must be HTTPS (or localhost/127.0.0.1 for development).
- Facebook Page tokens are cached server-side for 15 minutes after the OAuth callback; clients only see `{id, name}` pairs. Page access tokens never leave the server.

## For Third-Party Developers

If you're building a product on top of Wiro agents and need your customers to connect their own accounts:

1. **Deploy** an agent instance per customer via `POST /UserAgent/Deploy`.
2. **Connect** — your backend calls `POST /UserAgentOAuth/{Provider}Connect` with the customer's `useragentguid` and a `redirecturl` pointing back to your app.
3. **Redirect** — send the customer's browser to the returned `authorizeUrl`.
4. **Authorize** — customer authorizes on the provider's consent screen.
5. **Return** — customer lands on your `redirecturl` with success/error query parameters.
6. **Finalize** — for Meta Ads, Facebook, Google Ads: call the appropriate SetAdAccount/SetPage/SetCustomerId endpoint.
7. **Verify** — call `POST /UserAgentOAuth/{Provider}Status`.

Each integration page includes a **Multi-Tenant Architecture** section covering per-provider rate limits, token isolation, and white-label consent screen configuration.

### Handling the OAuth redirect in your app

```javascript
app.get('/settings/integrations', (req, res) => {
  if (req.query.x_connected === 'true') {
    return res.redirect(`/dashboard?connected=twitter&username=${req.query.x_username}`)
  }

  if (req.query.metaads_connected === 'true') {
    const accounts = JSON.parse(decodeURIComponent(req.query.metaads_accounts || '[]'))
    return res.redirect(`/dashboard/meta-ads?accounts=${encodeURIComponent(JSON.stringify(accounts))}`)
  }

  if (req.query.fb_connected === 'true') {
    const pages = JSON.parse(decodeURIComponent(req.query.fb_pages || '[]'))
    // Facebook always requires FBSetPage to finalize
    return res.redirect(`/dashboard/facebook?pick=${encodeURIComponent(JSON.stringify(pages))}`)
  }

  if (req.query.gads_connected === 'true') {
    const customers = JSON.parse(decodeURIComponent(req.query.gads_accounts || '[]'))
    return res.redirect(`/dashboard/google-ads?pick=${encodeURIComponent(JSON.stringify(customers))}`)
  }

  const errKey = Object.keys(req.query).find((k) => k.endsWith('_error'))
  if (errKey) {
    return res.redirect(`/dashboard?error=${errKey}&reason=${req.query[errKey]}`)
  }

  res.redirect('/dashboard')
})
```
