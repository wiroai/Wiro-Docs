# Agent Credentials & OAuth

Configure third-party service connections for your agent instances. Browse the platform's credential registry, set API keys, direct machine credentials, or OAuth, and audit credential edits over time.

## Overview

Wiro agents connect to external services (social platforms, ad networks,
email tools, CRMs) through three credential methods:

1. **API Key credentials**: set directly via `POST /UserAgent/CredentialUpsert` (bulk field upsert per provider).
2. **OAuth credentials**: redirect-based authorization via `POST /UserAgentOAuth/OAuthConnect`, where Wiro handles token exchange server-side.
3. **Hybrid direct credentials**: save a machine credential, call
   `OAuthConnect` for server-side validation/discovery, then finalize any
   account picker without exposing provider tokens to the browser.

Each external service is documented as its own **integration page** with the complete setup walkthrough, API reference, troubleshooting, and multi-tenant architecture notes. Use the catalog below to jump to the one you need.

**Read & write paths at a glance:**

| Operation | Endpoint |
|-----------|----------|
| Browse all credentials in the registry | [`POST /Credentials/List`](#post-credentialslist) (public) |
| Inspect a single credential schema | [`POST /Credentials/Detail`](#post-credentialsdetail) (public) |
| Find the credential a skill needs | [`POST /Skills/CredentialSchema`](/docs/agent-skills#post-skillscredentialschema) (public) |
| Write one or more credential fields | [`POST /UserAgent/CredentialUpsert`](/docs/agent-overview#post-useragentcredentialupsert) |
| Discover external communication channels | [`POST /Skills/List`](/docs/agent-skills#post-skillslist) → `channels[]` (public) |
| Connect or disable an external channel | [`POST /UserAgent/CredentialUpsert`](/docs/agent-overview#post-useragentcredentialupsert) |
| Read version history of a credential | [`POST /UserAgent/CredentialFieldHistory`](/docs/agent-overview#post-useragentcredentialfieldhistory) |

> Read responses from `POST /UserAgent/Detail` / `POST /UserAgent/MyAgents` expose the composed `credentials` tree (each provider with its `_connected` / `optional` / `extra` / `_editable` / `_schema` flags), the `customskills[]` array, the `scheduledskills[]` array (cron skills), the `skills[]` array of enabled skill names, the `tokenRates` + `agentModel` objects, and the flat credit fields (`monthlycredits`, `extracredits`, `usedcredits`, `remainingcredits`, `creditperiod`, `creditsyncat`) as **top-level fields** on the useragent object. See [Agent Overview](/docs/agent-overview) for the full endpoint catalog.

## Communication Channels

Every Wiro agent is reachable through web chat and the Agent Messaging API
without additional configuration. Telegram, Slack, and Discord are optional
external channels. They are available to every marketplace template and custom
agent, but remain disabled until every registry-declared activation credential
is complete. There is no separate enable switch on an existing agent.

Channels are not skills and do not affect pricing. Discover them from the
top-level `channels[]` array returned by public `POST /Skills/List`:

```bash
curl -X POST "https://api.wiro.ai/v1/Skills/List" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Each row contains:

| Field | Description |
|-------|-------------|
| `id` | Channel identifier (`telegram`, `slack`, or `discord`). |
| `credential_key` | Key used inside the `credentials` object. |
| `required_fields` | Fields that must all be populated for automatic activation. |
| `capabilities` | Public UI hints for direct messages, rooms, threads, role allowlists, and command menus. |
| `credential` | Full form descriptor, including `credential_schema`, labels, validation patterns, and setup help. |

Use `POST /UserAgent/CredentialUpsert` for an existing useragent. Send all
activation fields in one `fields[]` request when connecting a channel:

```json
{
  "useragentguid": "your-useragent-guid",
  "fields": [
    {
      "credentialkey": "telegram",
      "fieldname": "bottoken",
      "fieldvalue": "123456:ABC-DEF..."
    },
    {
      "credentialkey": "telegram",
      "fieldname": "allowedusers",
      "fieldvalue": ["761381461"]
    },
    {
      "credentialkey": "telegram",
      "fieldname": "groups",
      "fieldvalue": [
        {
          "chatid": "-1001234567890",
          "allowedusers": ["761381461"]
        }
      ]
    }
  ]
}
```

For a new useragent, include the complete channel group in `credentials`. The
channel activates from those credentials; Deploy accepts neither an
`enabledchannels` toggle nor a chat-mode field. Configure Chat Mode after
deployment with `teamsessionmode` in `POST /UserAgent/UpdateSettings`.

| Channel | Required fields | Optional scoped access |
|---------|-----------------|------------------------|
| Telegram | `bottoken`, `allowedusers[]` | `groups[]` rows with negative `chatid` and room-specific `allowedusers[]`. |
| Slack | `bottoken`, `apptoken`, `workspaceid`, `allowedusers[]` | `channels[]` rows with immutable `channelid` and room-specific `allowedusers[]`. Enable Socket Mode and grant the app token `connections:write`. |
| Discord | `bottoken`, `allowedusers[]` | `applicationid`; `guilds[]` rows with `guildid`, `channelids[]`, and optional `allowedusers[]` / `allowedroles[]`. |

`teamsessionmode: "private"` isolates each approved direct-message operator
and each team member's Wiro web-chat history and native agent memory.
`"collaborative"` shares those runtime contexts. Team deployments and
transfers default to collaborative; personal deployments and team detachments
default to private. Web and external-channel message lists remain separate
transports, and room/thread sessions remain scoped to their room.

Send immutable platform IDs only. Display names, usernames, email addresses,
and free-form room names are not authorization identifiers. Unlisted users and
rooms are rejected, and room messages must mention the bot. To disable a
channel, clear at least one of its `required_fields` with `CredentialUpsert`.
Completing the required fields again reactivates it automatically.

## Credential Registry Endpoints

These endpoints are **public, so no authentication is required**. They return data straight from the credential registry, which is useful when you want to render a "Connect this provider" form without a deployed useragent (e.g. inside an onboarding wizard).

### **POST** /Credentials/List

Lists all credentials in the registry.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `credential_mode` | string | No | Filter by mode: `"oauth"`, `"sa"` (service account), `"api_key"`, `"multi_api_key"`, `"hybrid"` (OAuth plus a direct/API-key mode), `"imap_credentials"`, `"jwt_sa"`, `"rule_only"`. |
| `wiro_connect_pending` | boolean | No | Filter by the "Wiro mode coming soon" flag: credentials whose Wiro-shared OAuth client is still awaiting provider review (currently `facebook-pages`, `instagram`, `google-ads`, `google-merchant-center`, `youtube`, `ga4`, `linkedin`, `tiktok`, and `meta-ads`). Facebook Pages, Instagram, and Meta Ads remain usable through their ready customer-owned System User and/or OAuth alternatives. |

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
          "help": "<ol><li>Meta for Developers → select your app</li><li>App Settings → Basic</li><li>Click Show next to App Secret and copy</li></ol>",
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
  ]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `key` | `string` | Canonical credential key. Use this in `CredentialUpsert.fields[].credentialkey`. |
| `title` | `string` | Display label shown on credential cards. |
| `icon` | `string` | Path or URL to the brand icon (relative paths absolutized server-side). |
| `brand_color` / `brand_text_color` / `brand_logo_filter` | `string\|null` | Brand colours and CSS filter for icon rendering, the same shape as on skill registry entries. |
| `docs_url` | `string\|null` | Slug of the integration page on this docs site. Frontends prefix with `/docs/`. |
| `credential_mode` | `string` | One of `"oauth"`, `"sa"` (service account), `"api_key"`, `"multi_api_key"`, `"hybrid"` (OAuth plus a direct/API-key mode), `"imap_credentials"`, `"jwt_sa"`, `"rule_only"`. |
| `connection_modes` | `array<string>` | The auth modes the credential supports: for example `["wiro", "own"]` for OAuth, `["api_key"]` for API-key credentials, `["sa"]` for service accounts, or `["api_key", "own", "wiro"]` for the Meta hybrids. Drives the auth-method picker in the panel. |
| `default_connection_mode` | `string\|null` | The mode the Wiro dashboard selects for a new, disconnected credential (`"api_key"` System User mode for Facebook Pages, Instagram, and Meta Ads). `OAuthConnect` does not read it: send `authmethod` yourself. |
| `mode_badges` | `object` | Optional labels shown beside auth modes, such as `{ "api_key": "Recommended", "own": "Advanced" }`. |
| `wiro_connect_pending` | `boolean` | When `true`, Wiro's shared OAuth client is awaiting provider review. Currently set on 9 credentials: `facebook-pages`, `instagram`, `google-ads`, `google-merchant-center`, `youtube`, `ga4`, `linkedin`, `tiktok`, and `meta-ads`. Ready alternative modes remain usable; Facebook Pages, Instagram, and Meta Ads expose customer-owned System User and/or OAuth paths. The flag does not strip or hide schema fields. |
| `credential_schema` | `array<field>` | Per-field schema describing the credential form. Each entry is a `field` object (see below). |
| `oauth_provider` | `object\|null` | OAuth wiring (endpoints, button styling, picker config) when `credential_mode` includes OAuth. `null` for non-OAuth credentials. See below. |
| `used_by_skills` | `array<string>` | Skill names that consume this credential, useful for "which skills will this connection enable?" hints. |

**`credential_schema[]` field object:**

| Sub-field | Type | Description |
|-----------|------|-------------|
| `key` | `string` | Field name (the `fieldname` you send to `CredentialUpsert`). |
| `type` | `string` | Input type: `"text"`, `"password"`, `"select"`, `"boolean"`, `"string-array"`, `"object-array"`, `"fileinput"` (public asset, written via `CredentialFileUpload` multipart), `"fileinput-base64"` (secret sent inline via `CredentialUpsert`), or `"custom"`. |
| `label` | `string` | Display label for the form input. |
| `required` | `boolean` | Whether the field must be filled before the agent can use the integration. |
| `placeholder` | `string?` | Placeholder text for the input. |
| `pattern` | `string?` | Regex the value must satisfy. |
| `maxlength` / `minlength` | `number?` | Length constraints. |
| `options` | `array?` | For `type: "select"`, `[{ label, value }]` choices. |
| `default` | `string?` | Default value applied when the user hasn't set anything yet. |
| `help` | `string?` | HTML help text rendered under the input. |
| `show_toggle` | `boolean?` | For `type: "password"`, render a "show / hide" toggle. |
| `oauth_managed` | `boolean?` | `true` for OAuth app keys (`clientid` / `clientsecret`, `appid` / `appsecret`, …). You supply them in the modes listed in `only_in_modes` (`own`; Shopify also `api_key`); they are stored as `oauth_app` and left out of Detail responses. |
| `auto_filled_by_oauth` | `boolean?` | `true` when the provider connection flow writes the value (e.g. `igusername` from OAuth or direct discovery). |
| `server_managed` | `boolean?` | `true` when a picker endpoint writes the value (e.g. Meta Ads `pagemappings`). `CredentialUpsert` rejects writes to it, as it does for `auto_filled_by_oauth` fields. |
| `readonly_when_connected` | `boolean?` | `true` when the field becomes read-only after a successful OAuth connection. |
| `only_in_modes` | `array<string>?` | When set (e.g. `["own"]`), the field only appears in the listed `authmethod` mode. |
| `runtime_excluded` | `boolean?` | `true` when a setup secret is used only by Wiro's server and must never enter the agent runtime. Meta System User tokens use this flag. |
| `platform_managed` | `boolean?` | `true` when Wiro fills the value server-side (you can't supply it). Every `sys-openai` field is `platform_managed`, which hides the whole credential from `UserAgent/Detail`. Reddit's three approval flags are `platform_managed` too. `CredentialUpsert` rejects writes to these fields with `<Field label> is managed by Wiro`, and Deploy drops them. |
| `item_schema` / `item_type` | `object?` | For array-of-object fields: describes the per-entry shape (e.g. `apple-appstore.apps[].{appname, appid}`). |

**`oauth_provider` object** (present when `credential_mode` includes OAuth):

| Sub-field | Type | Description |
|-----------|------|-------------|
| `auth_method_value` | `string` | The provider's default OAuth `authmethod` value. It is `"wiro"` only for credentials that offer a Wiro-managed app; customer-owned-only providers use `"own"`. |
| `connect_endpoint` / `disconnect_endpoint` / `status_endpoint` | `string` | The OAuth endpoints under `/UserAgentOAuth/...` that drive the connect / disconnect / status flow for this provider. Today every OAuth credential resolves to the unified `/UserAgentOAuth/OAuthConnect`, `/UserAgentOAuth/OAuthDisconnect`, `/UserAgentOAuth/OAuthStatus` endpoints. The field is kept on the schema for forward-compat with future per-provider overrides. |
| `connect_button_label` / `connect_button_icon` / `connect_button_brand_color` / `connect_button_text_color` / `connect_button_logo_filter` | `string` | Branding for the "Connect with X" button. |
| `username_field` | `string` | The credential field that holds the connected account name (e.g. `"igusername"`, `"channelname"`). |
| `return_query_param` / `return_error_param` / `return_error_detail_param` | `string` | Names of this provider's result parameters on your `redirecturl`: `return_query_param` carries `true` on success and `return_error_param` the error code on failure. `return_error_detail_param` is only a reserved name: Merchant Center is the one credential that sends a detail parameter (`mc_error_detail`, with `mc_error=no_accounts`). |
| `account_picker` | `object\|null` | When non-null, the connection flow includes an account / page / channel picker after OAuth or direct discovery. Key fields: `set_endpoint` (always `/UserAgentOAuth/SetPickerAccounts`), `trigger_param` (the redirect parameter that carries the list, such as `gads_accounts`), `url_item_fields` (maps each `accounts[]` key to a field of the list items, such as `{ "customerid": "id" }`), `multi_select` (`true` when 1+ entries can be picked, `false` for exactly one), `item_value_field` / `item_label_field` (which entry keys identify and label each account in the response), `item_fields_to_save` (the fields each entry in the `accounts` body carries; only `item_value_field` is required), and optional `next` for a chained picker. `next.discover_endpoint` is `/UserAgentOAuth/DiscoverPickerItems`; its `key`, parent/item fields, `set_endpoint`, and `persist_field` define the grouped child-selection request and stored result. Meta Ads uses this for ad account → Facebook Pages, and Google Business Profile for account → locations. |
| `direct_probe` | `object\|null` | Registry contract for a non-redirect mode: identifies the mode and write-only token field, validates it server-side, discovers selectable accounts, and declares which public account fields may be returned. |
| `extra_step` | `object\|null` | Reserved for providers with a third onboarding step beyond OAuth + picker (currently null for every provider). |

**`fieldstatus` values**. Note: this is **not** part of the registry schema; it's the classification the server stamps onto each stored credential field when it's written. It controls who can see the value:

| Value | Who writes it | Visible to API caller? |
|-------|---------------|------------------------|
| `user` | API callers + UI users | Yes |
| `oauth_app` | API callers + UI users (own mode; Shopify also `api_key`) | **Partly**: stripped from Detail responses. In history, secret fields such as `clientsecret` / `appsecret` are redacted to `[REDACTED]`; `clientid` / `appid` are not redacted |
| `oauth_session` | OAuth callback (server-only) | **No**: always stripped from responses |
| `oauth_picker` | OAuth callback / `Set*` picker endpoints | Yes |
| `platform` | Wiro internal | **No**: always stripped from responses |
| `computed` | Server-derived | Yes |
| `control` | API callers, UI users and the connection flow (the `authmethod` switch) | Yes |

### **POST** /Credentials/Detail

Returns a single credential entry by key.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `key` | string | Yes | Canonical credential key (e.g. `"instagram"`, `"google-ads"`, `"telegram"`). |

##### Response

Returns the **same full credential entry** as a row from `Credentials/List`: every field listed in the table above is present. Example for `key: "instagram"`:

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

Returns `{ "result": false, "errors": [{ "code": 404, "message": "Credential not found: <key>" }] }` if the key is unknown.

## Integration Catalog

### OAuth Integrations

| Integration | Auth Modes | Setup Guide |
|-------------|------------|-------------|
| Meta Ads | Own OAuth + System User token; Wiro-owned OAuth deferred until Advanced Access | [Meta Ads Skills](/docs/integration-metaads-skills) |
| TikTok Ads | Wiro only (TikTok for Business; authorization lasts 30 days, reconnect to renew) | [TikTok Ads Skills](/docs/integration-tiktokads-skills) |
| Shopify | Expiring offline OAuth + refresh token, or same-org client credentials (`expires_in: 86399`) | [Shopify Skills](/docs/integration-shopify-skills) |
| Reddit | Unavailable pending Reddit Data API approval and Wiro's written commercial contract | [Reddit Skills](/docs/integration-reddit-skills) |
| Facebook Page | System User token (recommended) + Own OAuth (advanced); Wiro mode coming soon | [Facebook Page Skills](/docs/integration-facebook-skills) |
| Instagram | System User token (recommended) + Own Instagram OAuth (advanced); Wiro mode coming soon | [Instagram Skills](/docs/integration-instagram-skills) |
| LinkedIn | Own only (Wiro mode coming soon) | [LinkedIn Skills](/docs/integration-linkedin-skills) |
| Twitter / X | Wiro + Own | [Twitter Skills](/docs/integration-twitter-skills) |
| TikTok | Own only (Wiro mode coming soon) | [TikTok Skills](/docs/integration-tiktok-skills) |
| Google Ads | Own only (Wiro mode coming soon) | [Google Ads Skills](/docs/integration-googleads-skills) |
| YouTube | Own only (Wiro mode coming soon) | [YouTube Skills](/docs/integration-youtube-skills) (shares Google OAuth client with Google Ads) |
| Google Analytics 4 | Own only (Wiro mode coming soon) | [Google Analytics 4 Skills](/docs/integration-ga4-skills) (shares Google OAuth client with Google Ads) |
| Merchant Center | Own only (Wiro mode coming soon) | [Merchant Center Skills](/docs/integration-merchantcenter-skills) (shares Google OAuth client with Google Ads) |
| Google Business Profile | Own only (your Google Cloud project, approved for Business Profile API access) | [Google Business Profile Skills](/docs/integration-googlebusiness-skills) |
| HubSpot | Wiro + Own | [HubSpot Skills](/docs/integration-hubspot-skills) |
| Mailchimp | Wiro + Own + API Key | [Mailchimp Skills](/docs/integration-mailchimp-skills) |

> **Google OAuth is shared across 4 APIs.** Google Ads, YouTube, Google Analytics 4, and Merchant Center can all be authorized through one of your own OAuth clients (one Google Cloud project, one OAuth 2.0 Client ID, multiple API scopes), or you can set up separate ones per product. Wiro's shared client for "wiro" mode is coming soon. Google Business Profile is not part of that shared client: it is own mode only, and the Google Cloud project behind your OAuth client must be approved for Business Profile API access.

### Service Account Integrations

| Integration | Setup Guide |
|-------------|-------------|
| Google Drive | [Google Drive Skills](/docs/integration-googledrive-skills) |
| Google Calendar | [Google Calendar Skills](/docs/integration-google-calendar-skills) |
| Google Play | [Google Play Skills](/docs/integration-googleplay-skills) |

> **Meta Platforms availability:** Meta Ads, Facebook Pages, and Instagram all
> offer customer-owned Business Manager System User connections now. Meta Ads
> and Facebook Pages also offer customer-owned Facebook OAuth; Instagram offers
> customer-owned Instagram Login OAuth. Their Wiro-shared OAuth modes remain
> pending provider review.

### API Key Integrations

| Integration | Setup Guide |
|-------------|-------------|
| Serper Web Search | [Serper Web Search Skills](/docs/integration-serper-search-skills) |
| Gmail | [Gmail Skills](/docs/integration-gmail-skills) |
| Telegram | [Telegram Skills](/docs/integration-telegram-skills) |
| Firebase | [Firebase Skills](/docs/integration-firebase-skills) |
| WordPress | [WordPress Skills](/docs/integration-wordpress-skills) |
| Shopify (same-organization client ID + secret) | [Shopify Skills](/docs/integration-shopify-skills) |
| WooCommerce | [WooCommerce Skills](/docs/integration-woocommerce-skills) |
| Meta Ads (System User token) | [Meta Ads Skills](/docs/integration-metaads-skills) |
| Facebook Pages (System User token) | [Facebook Page Skills](/docs/integration-facebook-skills) |
| Instagram (System User token) | [Instagram Skills](/docs/integration-instagram-skills) |
| App Store Connect | [App Store Skills](/docs/integration-appstore-skills) |
| Apollo | [Apollo Skills](/docs/integration-apollo-skills) |
| Lemlist | [Lemlist Skills](/docs/integration-lemlist-skills) |
| Roasit | [Roasit Skills](/docs/integration-roasit-skills) |
| Brevo | [Brevo Skills](/docs/integration-brevo-skills) |
| SendGrid | [SendGrid Skills](/docs/integration-sendgrid-skills) |
| Twilio Voice | [Twilio Voice](/docs/integration-twiliovoice-skills) |
| Wiro AI Models | See [Using Wiro AI Models from Your Agent](/docs/agent-skills#using-wiro-ai-models-from-your-agent) |
| Calendarific | See [Calendarific in your agent](#calendarific-in-your-agent) |

## Wiro AI Models & Calendarific (User-Provided)

Two integrations are **user-input credentials** that ship in agent templates but require you (or your end users) to supply the key before the skill runs. They appear in `POST /UserAgent/Detail` `credentials[]` and accept writes via `POST /UserAgent/CredentialUpsert` like any other API-key integration.

### Wiro AI Models: `wiro` credential

The `int-wiro-aimodels` skill lets an agent call Wiro's own AI models (image / video / audio / LLM generation, cover image creation, model discovery) using **your own Wiro project API key**. Each generated asset is billed to the wallet of the workspace that owns that project (your personal wallet, or the team wallet for a team project).

- **Credential key:** `wiro`
- **Field:** `apikey` (single field, type `custom:wiro-project-picker` in the registry; the dashboard renders it as a project picker, the API expects the project's raw API key string).
- **No secret to supply.** Only the `apikey` is needed. Request signing for the agent's internal Wiro calls is handled automatically: Wiro derives the project's signing secret server-side from the key you pick, so there is no `apisecret` (or similar) field to paste.
- **Setup:** create / pick a Wiro project at [wiro.ai/panel/projects](https://wiro.ai/panel/projects), copy its API key, then upsert it:

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

> **Don't confuse `credentials.wiro.apikey` with your operator-level Wiro API key.** `credentials.wiro.apikey` is the per-agent project key the agent container uses to call Wiro models internally (gets exported as `WIRO_API_KEY` env var inside the container). The `x-api-key` header you send to Wiro endpoints from your own backend is your operator key, which is entirely separate (see [Authentication](/docs/authentication)).

Most Wiro-provided agent templates (Social Manager, Blog Content, Push, App Event, Meta Ads, TikTok Ads, Google Ads) ship with `int-wiro-aimodels: true` enabled, but the agent stays in `status: 6` (Setup Required) until the operator supplies a `wiro` project key.

### Calendarific in your agent

The `int-calendarific` skill discovers global holidays and observances across 230+ countries via the [Calendarific](https://calendarific.com/) API. The free tier (1,000 calls/month) covers most agent use cases.

- **Credential key:** `calendarific`
- **Field:** `apikey` (`type: "password"`, encrypted at rest)
- **Setup:**

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/CredentialUpsert" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "fields": [
      { "credentialkey": "calendarific", "fieldname": "apikey", "fieldvalue": "your_calendarific_api_key" }
    ]
  }'
```

Templates that scan global holidays (App Event Manager, Push Notification Manager, Meta Ads, TikTok Ads, Google Ads) ship with `int-calendarific: true`. As with Wiro AI Models, the agent stays in `status: 6` until a key is provided.

## Platform-Managed Credentials

One credential is fully **managed by Wiro**. You don't provide it and you can't see it in API responses:

- **OpenAI** (`sys-openai`): Wiro provides the OpenAI API key for every agent. The same model line-up (default + fallback + cron) is shared across all Wiro agents and rotated by the Wiro team. Operators cannot edit these values.

The `sys-openai` credential is stored with every field flagged `platform_managed: true` in the registry. `POST /UserAgent/Detail` omits the entire credential entry from the `credentials` response. `CredentialUpsert` rejects writes to its fields with `<Field label> is managed by Wiro`, and Deploy drops them from `credentials`.

## Auditing Credential Changes: `CredentialFieldHistory`

Every credential field write is appended to a versioned history. Use `POST /UserAgent/CredentialFieldHistory` to read it, the same idea as `CustomSkillHistory` for skills.

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
| `startdate` | number | No | UTC epoch seconds: return entries on/after this time |
| `enddate` | number | No | UTC epoch seconds: return entries on/before this time |

> **Sensitive values are redacted in history.** `oauth_session` rows (access/refresh tokens) **never** appear in history at all (they're stripped before persisting). `clientsecret` is stored as `[REDACTED]` in history rows; the live secret stays server-side. `POST /UserAgent/Detail` returns the current live values of the fields you can see; `CredentialFieldHistory` only shows the audit trail.

## Setting API Key Credentials

Use `POST /UserAgent/CredentialUpsert` with a flat `fields[]` array. Each field row carries `{credentialkey, fieldname, fieldvalue}`. Each integration page documents the exact field names and shape.

### Bulk upsert pattern

`/UserAgent/CredentialUpsert` takes an array of field rows in one request. Only the fields you send are written; other credential groups and other fields inside the same group are untouched. The Wiro Dashboard follows this pattern exactly: each credential card sends a single `CredentialUpsert` call with its group's fields.

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

Response: `{ "result": true, "applied": 2, "errors": [] }`. `applied` is the count of fields saved without an error (a field sent with its current value still counts). All fields are validated before any is written: if one fails validation (for example a reserved fieldname prefixed with `_`), the whole request is rejected and nothing is saved; `result` is `false` and `errors` lists every invalid field. If a save fails after validation has passed, the other fields are still saved and each failed field is listed in `errors` with `result: false`. If the agent was running, it is automatically restarted to apply the new values.

### Field-level write rules

- **`fieldstatus` is assigned by the server.** Any `fieldstatus` you send is ignored: a field that already exists keeps its stored status, and a new field gets the status its registry schema implies. That is why own-mode app keys (`clientid` / `clientsecret`, `appid` / `appsecret`, …) and the `authmethod` switch can be written here. Fields that the connection flow fills in (schema flag `auto_filled_by_oauth` or `server_managed`, such as account and page selections) are rejected with `<Field label> is managed by the connection flow` in `errors[]`; set them through the OAuth and picker endpoints. OAuth tokens are written by Wiro's OAuth callback flow, not by your API.
- **Wiro-managed fields and OAuth tokens are rejected.** You can't write a field whose status is `platform` or `oauth_session`. A `platform` field fails with `<Field label> is managed by Wiro` and an `oauth_session` field with `<Field label> is managed by the connection flow`; a field with no schema label is named `<credentialkey>.<fieldname>` instead. As with any invalid field, the whole request is rejected and nothing is saved.
  - `platform`: every `sys-openai` field, and Reddit's approval flags that Wiro sets after its own review (`developerprofileverified`, `dataapiaccessapproved`, `commercialwrittenapproval`).
  - `oauth_session`: the token fields `accesstoken`, `refreshtoken`, `connectedat`, `tokenexpiresat` and `refreshtokenexpiresat`, on any credential and in any letter case. They have no schema label, so the message reads, for example, `reddit.accesstoken is managed by the connection flow`.
  - These fields are rejected whatever status is stored. For any other field, the rejection check uses the schema's status when the registry schema declares it as a top-level field, even if a different status is stored, and the stored status otherwise; the write is rejected when that status is `platform` or `oauth_session`.
- **Reserved fieldnames are rejected.** Any `fieldname` starting with `_` (e.g. `_isoptional`, `_isextra`) is a sentinel used by the template itself and cannot be set by API callers.
- **Whitespace around a value is trimmed.** Text, password, email, URL and number values, and each entry of a list of strings, are saved without the spaces, tabs or line breaks around them and are validated after trimming, so a client ID pasted with a trailing newline is accepted. Spaces inside a value are kept (an app password with spaces keeps them), and multi-line text, selections, booleans, files and nested rows are saved as sent. The same applies to inline Deploy credentials.
- Standard integration credential groups must be declared by the agent template. Communication-channel credentials are the exception: every useragent may create the channel groups published in `POST /Skills/List` → `channels[]`, using `CredentialUpsert` or inline Deploy credentials.
- **Nested arrays** (`firebase.accounts[].apps[]`, `google-drive.folders[]`, `apple-appstore.apps[]`, etc.) are supported via the optional `parentfield` (dotted path) and `ordinal` (array index) on each field row. An array `fieldvalue` (with no `parentfield`) replaces the whole stored list, so send the complete desired list. Per-row writes (a sub-field sent with `parentfield` and `ordinal`) change only that entry; indices you don't send are kept. To clear an optional top-level list (e.g. `google-drive.folders`, `apple-appstore.apps`), send `[]` as that field's `fieldvalue` with no `parentfield`. A nested list such as `firebase.accounts[].apps[]` is changed by re-sending the parent `accounts` list; `firebase.accounts` itself is required and can't be cleared.
- Use `POST /UserAgent/Detail` to inspect which fields each credential exposes, and the `_connected` / `optional` / `extra` flags that describe its readiness state.

### Prepaid deploy: inline setup supported (with limitations)

If you call `POST /UserAgent/Deploy` with `useprepaid: true`, you may pass `credentials`, `customskills` (or the equivalent key `customskills`), and `skills` at the **top level of the Deploy body**. The server saves them on the new agent in the same call (one-shot deploy + initial setup).

**Deploy body `credentials` rules:**

- Values are validated against each credential's public registry schema.
- Registry-declared `string-array` and `object-array` fields are accepted as native JSON arrays. This includes channel allowlists (`allowedusers`, Telegram `groups`, Slack `channels`, Discord `guilds`).
- Fieldnames starting with `_` are reserved and ignored.
- Each field's `fieldstatus` is assigned by the server, exactly as for `CredentialUpsert`.
- Deploy never saves a `platform` or `oauth_session` field sent in `credentials`, such as a `sys-openai` field, one of Reddit's approval flags or `accesstoken`. This applies whether `credentials` is sent as an object or as a JSON string. In a communication-channel group (Telegram, Slack, Discord), such a field fails Deploy before the agent is created. In any other group, the field is dropped and Deploy continues.
- If `credentials` includes a communication-channel group, all of that channel's `required_fields` must be present. A missing or invalid activation credential fails Deploy instead of creating a partially configured channel.

**Deploy body `customskills` semantics:**

- Each entry must have a `key`. Server reads `value`, `interval`, `enabled`, `description`, and treats `_user_created: true` as an explicit user-created cron (auto-prefixing the key with `cron-` if missing).
- The request body accepts a single top-level `customskills` array; server-side values are merged onto any existing preset rows for the same key.

If you skip these keys in Deploy entirely, the instance is created empty and you set credentials/skills later with `CredentialUpsert`, `CustomSkillUpsert`, and `SkillsApply`.

## OAuth Authorization Flow

For services that require user authorization, Wiro implements a full OAuth redirect flow. Your end users interact only with your app and the provider's consent screen, which shows your app's name in own mode and Wiro's in Wiro mode. They land on wiro.ai only when a callback cannot be matched to your flow: `missing_params`, or `session_expired` for a callback more than 24 hours after `OAuthConnect`.

> The `redirecturl` you pass to `OAuthConnect` is **your own URL**: any https page you control, or `http://localhost` / `http://127.0.0.1` for development. After authorization, users are redirected back to your app with status query parameters and, for credentials with an account picker, the list of accounts to show in your own UI (see [Callback success & error parameters](#callback-success-error-parameters)).

### Generic flow

```
Your App (Frontend)           Your Backend              Wiro API              Provider
       |                            |                       |                      |
  (1)  | "Connect X" click          |                       |                      |
       |--------------------------->|                       |                      |
  (2)  |                            |  POST OAuthConnect -> |                      |
       |                            |  { useragentguid,     |                      |
       |                            |    credentialkey,     |                      |
       |                            |    redirecturl,       |                      |
       |                            |    authmethod }       |                      |
  (3)  |                            |<-- { authorizeUrl }   |                      |
  (4)  |<--- redirect to authorizeUrl -------------------------------------------->|
  (5)  |                            |                       |<-- User clicks Allow |
  (6)  |                            |  (invisible callback) |                      |
       |                            |  Wiro exchanges code  |<---------------------|
       |                            |  for tokens, saves    |                      |
  (7)  |<------- 302 to YOUR redirecturl --------------------------------------->  |
       |   ?<prefix>_connected=true&...  or  ?<prefix>_error=<code>                |
  (8)  | User picks accounts        |                       |                      |
       |--------------------------->|                       |                      |
  (9)  |                            |  SetPickerAccounts -> |                      |
 (10)  |                            |  OAuthStatus -------> |                      |
```

Steps 8 and 9 apply to credentials with an account picker; Meta Ads and Google Business Profile add a second picker step with `DiscoverPickerItems`. Call the Wiro endpoints (steps 2, 9 and 10) from your backend with your API key, not from the browser.

### Auth Methods: `"wiro"` vs `"own"`

|  | `"wiro"` | `"own"` |
|--|---------|---------|
| **OAuth app credentials** | Wiro's pre-configured app | Your own app on the provider's developer portal |
| **Setup required** | None: just call Connect | Create an app on the provider, save its keys with `CredentialUpsert`, and register Wiro's callback URL |
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
# NOTE: `clientid` / `clientsecret` are own-mode app fields. The server stores
# them as fieldstatus="oauth_app" (any fieldstatus you send is ignored) and
# leaves them out of Detail responses. Field names vary by provider, e.g.
# `appid` / `appsecret` or `clientkey`: check `POST /Credentials/Detail` for
# this credential's fields and its `connection_modes`.

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
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/OAuthConnect" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "credentialkey": "twitter",
    "redirecturl": "https://your-app.com/callback",
    "authmethod": "own"
  }'
```

For credentials whose `connection_modes` includes an enabled `"wiro"` mode, you can skip Step 1 and call Step 2 with `authmethod: "wiro"`. Omitting `authmethod` uses that credential's registry default. Wiro mode is still pending for Google Ads, Google Analytics 4, Merchant Center, YouTube, TikTok, LinkedIn, Facebook Page, Instagram and Meta Ads, and it is their default, so always send `"own"` (or `"api_key"` where offered) for them. Shopify and Reddit default to `"own"`, and Shopify also accepts `"api_key"` (Client ID + Secret, exchanged server-side with no browser redirect). TikTok Ads accepts only `"wiro"`. Google Business Profile accepts only `"own"`, so always send it.

### Callback URL pattern (own mode)

Register this URL in your OAuth app settings on the provider's developer portal:

```
https://api.wiro.ai/v1/UserAgentOAuth/{Provider}Callback
```

Provider-specific paths: `XCallback`, `TikTokCallback`, `IGCallback`, `FBCallback`, `LICallback`, `GAdsCallback`, `MetaAdsCallback`, `MCCallback`, `YTCallback`, `GA4Callback`, `GBPCallback`, `HubSpotCallback`, `MailchimpCallback`, `ShopifyCallback`, `RedditCallback`. TikTok Ads uses `TikTokAdsCallback`, but it is Wiro-managed only, so there is no app of your own to register it in.

### Callback success & error parameters

| Provider | Success Params | Error Param |
|----------|---------------|-------------|
| Twitter / X | `x_connected=true&x_username=...` | `x_error=...` |
| TikTok | `tiktok_connected=true&tiktok_username=...` | `tiktok_error=...` |
| Instagram | `ig_connected=true&ig_username=...` | `ig_error=...` |
| Facebook Pages | `fb_connected=true&fb_pages=[...]` | `fb_error=...` |
| LinkedIn | `li_connected=true&li_name=...` | `li_error=...` |
| Google Ads | `gads_connected=true&gads_accounts=[...]` | `gads_error=...` |
| Meta Ads | `metaads_connected=true&metaads_accounts=[...]` | `metaads_error=...` |
| TikTok Ads | `tiktokads_connected=true&tiktokads_advertisers=[...]` | `tiktokads_error=...` |
| Merchant Center | `mc_connected=true&mc_accounts=[...]` | `mc_error=...` (+ `mc_error_detail=...` with `no_accounts`) |
| YouTube | `yt_connected=true&yt_channels=[...]` | `yt_error=...` |
| GA4 | `ga4_connected=true&ga4_properties=[...]` | `ga4_error=...` |
| Google Business Profile | `gbp_connected=true&gbp_accounts=[...]` | `gbp_error=...` |
| HubSpot | `hubspot_connected=true&hubspot_portal=...&hubspot_name=...` | `hubspot_error=...` |
| Mailchimp | `mailchimp_connected=true&mailchimp_account=...` | `mailchimp_error=...` |
| Shopify | `shopify_connected=true&shopify_shop=...&shopify_name=...` | `shopify_error=...` |
| Reddit | `reddit_connected=true&reddit_username=...` | `reddit_error=...` |

> `mc_error_detail` is the only detail parameter. It comes with `mc_error=no_accounts` when Google answered the Merchant Center account list with an error, and holds Google's error status or code, such as `PERMISSION_DENIED` or `403`, never the message.

> **Picker lists:** `fb_pages`, `gads_accounts`, `metaads_accounts`, `tiktokads_advertisers`, `mc_accounts`, `yt_channels`, `ga4_properties` and `gbp_accounts` are always present on success and hold at least one item. When the provider lists nothing to pick, Wiro saves nothing and the callback sends `<prefix>_error=no_accounts` instead (`fb_error=no_pages` for Facebook Pages). For example, the Google user has no Google Ads account, YouTube channel or GA4 property, or the Google Ads developer token is missing or not approved. [Picker data from the redirect](#picker-data-from-the-redirect) lists the fields of each item.

> **Empty values are left out:** Wiro never sends a parameter with an empty value. `x_username`, `tiktok_username`, `ig_username`, `li_name`, `hubspot_portal`, `hubspot_name`, `mailchimp_account`, `shopify_shop` and `shopify_name` come from a profile lookup after the token exchange. When that lookup fails, the parameter is missing but `<prefix>_connected=true` is still sent, so read these with a fallback. `reddit_username` is always present on success: if Wiro cannot read the Reddit account, the callback returns `reddit_error=developer_profile_mismatch` instead.

> **List size:** some lists hold only the provider's first page: Google Business Profile up to 20 accounts, Merchant Center up to 100 accounts, GA4 the properties of up to 200 accounts, YouTube up to 50 channels, and Facebook Pages through Facebook Login the first page Meta returns (25 Pages by default). Meta Ads and TikTok Ads list up to 500 and send `too_many_ad_accounts` or `account_list_too_large` above that. Google Ads lists every customer the user can access directly. The list travels in the query string, and each item adds about 90 to 110 bytes, so 200 ad accounts make a URL of about 20 KB. Make sure the server behind your `redirecturl` accepts URLs that long; many servers refuse them with their default limits.

Common error codes across providers:

| Code | Meaning |
|------|---------|
| `missing_params` | The callback was opened without an OAuth `state`. Wiro cannot tell which flow it belongs to, so the browser goes to `https://wiro.ai` with this code instead of to your app. Start a new flow with `OAuthConnect`. |
| `authorization_denied` | The user cancelled, the provider returned an error or no authorization code, or (Meta Dev Mode) the user is not in App Roles. |
| `session_expired` | More than 15 minutes passed between `OAuthConnect` and the callback. The browser returns to your `redirecturl` with this code; call `OAuthConnect` again. After 24 hours, or when the `state` is unknown, it goes to `https://wiro.ai` instead. A callback that the browser repeats after a completed one (for example when the provider's Continue button is clicked twice) is not an error: it lands where the first one did. |
| `token_exchange_failed` | The provider returned no usable token for the authorization code, for example because the saved Client/App Secret is wrong. |
| `useragent_not_found` | The agent was deleted, or is no longer owned by the account that started the flow, before the provider returned. A wrong `useragentguid` never gets this far: `OAuthConnect` refuses it with `User agent not found or unauthorized`. |
| `<Provider> credentials not configured` | Agent's `credentials.<provider>` block is empty (typically `authmethod: "own"` but `clientid` / `clientsecret` missing). Returned in `errors[]` of `OAuthConnect` itself, not as a redirect-URL `*_error` code. Fix with `POST /UserAgent/CredentialUpsert`. |
| `internal_error` | Unexpected server error. |

Provider-specific codes:

| Code | Provider | Meaning |
|------|----------|---------|
| `no_accounts` | Google Ads, Meta Ads, TikTok Ads, Merchant Center, YouTube, GA4, Google Business Profile | Sign-in worked, but the provider listed nothing the user can pick, and Wiro saved nothing. For Meta Ads this means no active ad account with both `ADVERTISE` and `ANALYZE` tasks; for Google Ads it also covers a missing or refused developer token. Merchant Center may add `mc_error_detail`. Fix the cause and call `OAuthConnect` again. |
| `no_pages` | Facebook | OAuth succeeded but the user administers no Pages. |
| `long_lived_exchange_failed` | Meta Ads | Meta did not return a long-lived token with an expiry. |
| `required_meta_scopes_missing` | Meta Ads | Meta reported the token as invalid, or without every required permission. |
| `meta_token_expired` | Meta Ads | The token or its data access has expired. |
| `meta_app_mismatch` | Meta Ads | The token belongs to a different Meta app than the saved App ID. |
| `too_many_ad_accounts` | Meta Ads | Meta returned more than 500 ad accounts. |
| `account_list_too_large` | TikTok Ads | TikTok returned more than 500 advertisers. |
| `invalid_signature` | Shopify | The callback `hmac` is missing or does not match the one computed with the app's Client Secret. Nothing is saved. |
| `invalid_shop` | Shopify | The callback `shop` is not the `shopdomain` saved on the agent. Nothing is saved. |
| `developer_profile_mismatch` | Reddit | The Reddit account that approved access is not the saved `developerprofileusername`, or Wiro could not read that account. Nothing is saved. |

Treat any other code like `internal_error`.

> `useragent_not_found` appears only in redirect URLs, when the agent went away during the flow. A `useragentguid` that doesn't exist or isn't yours is refused in the JSON response of `OAuthConnect`, `OAuthStatus`, `OAuthDisconnect`, `DiscoverPickerItems` and `SetPickerAccounts` with `"User agent not found or unauthorized"`.

## Generic OAuth Endpoints

All OAuth integrations share five unified endpoints. The provider is selected via a `credentialkey` body parameter (e.g. `"google-ads"`, `"twitter"`, `"facebook-pages"`):

| Endpoint | Purpose |
|----------|---------|
| `POST /UserAgentOAuth/OAuthConnect` | Start OAuth and return an authorize URL, or run a registry-declared direct credential probe and return discovered accounts. |
| `POST /UserAgentOAuth/OAuthStatus` | Check whether a provider is connected and which accounts are selected. |
| `POST /UserAgentOAuth/OAuthDisconnect` | Clear stored credentials + tokens. |
| `POST /UserAgentOAuth/DiscoverPickerItems` | Discover grouped child resources for a registry-declared chained picker after its parent accounts are selected. |
| `POST /UserAgentOAuth/SetPickerAccounts` | Save the user's account selection after OAuth or direct discovery. |

> Each provider's own callback URL (`XCallback`, `IGCallback`, `GAdsCallback`, etc.) is still per-provider because external OAuth platforms redirect to fixed URLs. Only the five endpoints above are unified.

> Discover the full list via [`POST /Credentials/List`](#post-credentialslist). Any entry with a non-null `oauth_provider` can use these endpoints; hybrid credentials may offer OAuth and a direct probe. The `oauth_provider` block declares exact endpoint paths, supported direct mode, and picker contract.

### POST /UserAgentOAuth/OAuthConnect

For OAuth mode, Wiro generates the provider authorize URL and a state token.
Your frontend redirects the user to `authorizeUrl`; after consent, the provider
returns to Wiro's registry-declared callback and Wiro redirects the browser to
your `redirecturl`. For direct modes such as Meta Ads, Facebook Pages, or
Instagram System User tokens and Shopify client credentials, this endpoint
validates or exchanges the already-saved credential server-side and returns
without a browser redirect.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Agent instance GUID. |
| `credentialkey` | string | Yes | Credential key with an `oauth_provider` block (for example `"google-ads"`, `"twitter"`, `"meta-ads"`, `"facebook-pages"`, `"instagram"`, or `"shopify"`). |
| `redirecturl` | string | OAuth only | Your page that the browser returns to after OAuth: any https URL you control, or `http://localhost` / `http://127.0.0.1` in development. Direct probes do not use it. |
| `authmethod` | string | No | One value from the credential's `connection_modes`, such as `"wiro"`, `"own"`, or `"api_key"`. Omission uses `oauth_provider.auth_method_value`. |

> **Your `redirecturl`.** Use any https URL you control; plain http works only on `localhost` and `127.0.0.1` (any port). Wiro adds its parameters to the end of the URL, after `?`, or after `&` when the URL already has a query string, and keeps your own parameters. The redirect does not carry `useragentguid` or `credentialkey`, so put your own context (for example your customer ID) in the query string. Do not use a `#fragment`, because the parameters would land inside it. Values are URL-encoded, and empty values are left out. Success and every error code return to this URL, except a callback without a known `state` or one more than 24 hours after `OAuthConnect`, which goes to `https://wiro.ai`.

> Starting an OAuth flow for a credential that holds a System User token (Meta Ads, Facebook Pages, Instagram) or a Mailchimp API key clears that secret, and the connection and account selection made with it, right away, before the user consents. This also happens if the user then cancels, or if the call fails later, for example because your app keys are not saved.

##### Response

```json
{
  "result": true,
  "errors": [],
  "authorizeUrl": "https://accounts.google.com/o/oauth2/v2/auth?client_id=...&redirect_uri=...&scope=...&response_type=code&state=..."
}
```

Direct probes return `{ "result": true, "errors": [], "accounts": [...] }` and no `authorizeUrl`. Meta Ads, Facebook Pages and Instagram return `{ id, name }` entries to pick from; Shopify has no picker, so it returns an empty `accounts` array and is connected right away. First save the mode's fields together with `authmethod: "api_key"` through `CredentialUpsert`, then call `OAuthConnect` with the same `authmethod`; without the saved `authmethod` the probe fails with `direct_token_missing`. Each direct call that finds the saved fields clears the credential's earlier connection and account selection before it checks them with the provider, so save the selection again afterwards. A failed probe returns `result: false`, a general message in `errors[]` and an `errorcode` that names the cause, such as `direct_token_missing`, `direct_token_invalid`, `no_accounts`, `no_pages`, `provider_rejected_request` or `provider_timeout`; each integration page lists its codes.

##### Common errors

| Error message | Cause |
|---------------|-------|
| `Request parameter [<name>] required` | `useragentguid` or `credentialkey` is missing, or `redirecturl` is missing in an OAuth mode. |
| `Unknown OAuth credential: <key>` | `credentialkey` not in registry, or not OAuth-enabled. |
| `Credential is not configured for the generic OAuth dispatcher: <key>` | Registry entry is partial: missing `oauth_flow` config. |
| `Unsupported connection mode for <Provider>` | `authmethod` is not in the credential's `connection_modes`, for example `"own"` for TikTok Ads or `"wiro"` for Shopify and Reddit. |
| `Invalid redirect URL` | `redirecturl` is not an https URL, or uses http on a host other than `localhost` / `127.0.0.1`. |
| `<Provider> credentials not configured` | `authmethod: "own"` but `clientid`/`clientsecret` not saved yet. |
| `Wiro-managed OAuth is not enabled for <Provider>` | `authmethod` is `"wiro"`, or left out where Wiro mode is the default, but that credential's Wiro mode is still pending (`wiro_connect_pending: true`). Use another mode from its `connection_modes`, such as `"own"`. |
| `<Field> is required` / `Invalid <Field>` | A saved field the provider's consent page needs is missing or malformed: Shopify's `Shop Domain` (`<shop>.myshopify.com`) or Reddit's `Developer Profile Username`. Save it with `CredentialUpsert`. |
| `Wiro must verify ...` | Reddit only: one of Wiro's three approval flags is not set yet. You can't set them yourself. |
| `Invalid provider authorization URL` | The provider's consent URL could not be built from the saved fields. |
| Direct credential validation message | The saved direct credential fields failed the registry-declared exchange/probe, or no required account was assigned. Read `errorcode` for the cause. |
| `User agent not found or unauthorized` | `useragentguid` doesn't exist or doesn't belong to the caller. |

Mailchimp's `api_key` mode needs no `OAuthConnect` call: save `apikey` and `authmethod: "api_key"` with `CredentialUpsert`. Sending `authmethod: "api_key"` to `OAuthConnect` for Mailchimp starts a Wiro-mode OAuth flow.

### POST /UserAgentOAuth/OAuthStatus

Returns whether the credential is connected and lists every account/property/page selected via the picker. Use this to render an "Already connected: N accounts selected" UI.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Agent instance GUID. |
| `credentialkey` | string | Yes | OAuth credential key. |

##### Response

```json
{
  "result": true,
  "errors": [],
  "connected": true,
  "accounts": [
    { "id": "1234567890", "name": "Acme Corp" },
    { "id": "0987654321", "name": "Acme Subsidiary" }
  ],
  "connectedat": "2026-05-25T12:00:00Z",
  "tokenexpiresat": "2026-05-25T13:00:00Z"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `connected` | `boolean` | `true` when the active mode has a validated secret, the access token has not passed `tokenexpiresat`, and, for picker credentials, at least one account is selected. Second-step picks (Meta Ads Pages, Business Profile locations) don't count; `pickersteps` shows them. Wiro renews tokens while the agent runs, so a stopped agent can read `false` once its token expires (about an hour after the last renewal for Google, 30 minutes for HubSpot) and reads `true` again after it starts. `_connected` in `UserAgent/Detail` ignores the expiry. Mailchimp's API key mode always reads `false` here. |
| `accounts` | `array<{id, name}>` | Picker credentials: one entry per selected account, Page or property, `[]` until something is saved. Credentials without a picker (X, TikTok, LinkedIn, HubSpot, Mailchimp, Reddit, Shopify): one entry while `connected` is `true`, with the connected account's display name in both `id` and `name` (for example the X username or the Shopify store name), and `[]` otherwise. |
| `connectedat` | `string` | ISO timestamp of the last successful Connect. Automatic token refreshes do not change it. |
| `tokenexpiresat` | `string` | ISO timestamp when the current access token expires. Empty for providers without a fixed expiry (e.g. Mailchimp). |

Meta Ads and Google Business Profile also return their second picker step: `pickersteps.pages` and `pagemappings` (Meta Ads), `pickersteps.locations` and `locationmappings` (Google Business Profile). `optional` is `true` for Meta Ads Pages, which an agent can do without, and `false` for Business Profile locations. `configured` is `true` once at least one item is saved, and `groups` has one entry per selected account with its saved items:

```json
"pickersteps": {
  "pages": {
    "pickerkey": "pages",
    "optional": true,
    "configured": true,
    "groups": [
      {
        "parent": { "adaccountid": "123456789", "adaccountname": "Acme Ads" },
        "items": [ { "pageid": "111222333", "pagename": "Acme" } ]
      }
    ]
  }
},
"pagemappings": [
  { "adaccountid": "123456789", "adaccountname": "Acme Ads", "pageid": "111222333", "pagename": "Acme" }
]
```

> **Multi-account picker fields are JSON arrays.** Picker fields like
> `customerid` (Google Ads), `adaccountid` (Meta Ads), `advertiserid` (TikTok Ads), `merchantid` (Merchant
> Center), `channelid` (YouTube), `propertyid` (GA4), `accountid` (Google Business Profile), `pageid` (Facebook
> Pages), and direct Instagram's `accountId` are stored as JSON arrays when
> `account_picker.multi_select === true`. Instagram Login OAuth also stores its
> single authorized account as a one-entry array.

### POST /UserAgentOAuth/DiscoverPickerItems

Discover child resources for a chained picker after the root
`SetPickerAccounts` selection has been saved. Two credentials have a chained
flow: in Meta Ads, selected ad accounts are the parents and eligible Facebook
Pages are returned under each account; in Google Business Profile, selected
Business Profile accounts are the parents and their locations are returned
under each account. Wiro reads the active credential server-side;
clients never send or receive access tokens.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Agent instance GUID. |
| `credentialkey` | string | Yes | Credential key with `account_picker.next` configured. Currently `"meta-ads"` or `"google-business"`. |
| `pickerkey` | string | Yes | The chained picker key from the registry. Meta Ads uses `"pages"`; Google Business Profile uses `"locations"`. |

##### Example: discover Meta Ads Pages

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/DiscoverPickerItems" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "credentialkey": "meta-ads",
    "pickerkey": "pages"
  }'
```

##### Response

```json
{
  "result": true,
  "errors": [],
  "pickerkey": "pages",
  "groups": [
    {
      "parent": {
        "adaccountid": "123456789",
        "adaccountname": "Acme Ads"
      },
      "items": [
        { "pageid": "111222333", "pagename": "Acme" }
      ]
    }
  ]
}
```

Each group corresponds to one selected parent account. A group may carry
`errorcode` and an empty `items` array when discovery failed safely for that
parent. Successful candidates are cached for the registry-declared selection
window (five minutes for Meta Ads and Google Business Profile). Call `SetPickerAccounts` with `pickerkey`
and one `selections[]` entry for every successful parent before that window
expires.

A group's `errorcode` is a short code such as `too_many_pages` (more than 500 Pages for one ad account), `provider_rejected_request`, `provider_timeout` or `provider_request_failed`. Business Profile returns at most the first 100 locations of each account.

##### Common errors

| Error message | Cause |
|---------------|-------|
| `Request parameter [<name>] required` | `useragentguid`, `credentialkey` or `pickerkey` is missing. |
| `Unknown credential picker` | `credentialkey` and `pickerkey` do not name a chained picker. |
| `User agent not found or unauthorized` | `useragentguid` doesn't exist or doesn't belong to the caller. |
| `<Provider> account not connected` | No parent account is saved yet, or `OAuthStatus` would report `connected: false`, for example because the access token expired while the agent was stopped. |
| `Too many parent accounts selected for picker discovery` | More than 50 Meta ad accounts or more than 20 Business Profile accounts are selected. |
| `Picker candidate limit exceeded` | Discovery found more than 2,000 items across all groups. |
| `Picker candidates could not be secured for selection` / `Picker discovery failed` | Temporary failure. Try again. |

### POST /UserAgentOAuth/SetPickerAccounts

Save either the root account selection after an OAuth callback/direct discovery,
or a chained child-resource selection after `DiscoverPickerItems`. Clients never
supply access tokens. Wiro checks Facebook Pages and System User Instagram picks
against its server-side discovery result, and chained picks against
`DiscoverPickerItems`. For the other root pickers it saves the IDs and names you
send without checking them with the provider (non-digits are removed where noted
below), so send only items from the list you received.

Wiro sends the account list once, in the redirect (or in the `OAuthConnect` response in System User mode), and does not keep it. For Google Ads, Meta Ads, TikTok Ads, Merchant Center, YouTube, GA4 and Google Business Profile you can call `SetPickerAccounts` again at any time until the credential is disconnected, so keep the list if you want to offer changes later, or connect again to get a fresh one. Facebook Pages and System User Instagram keep their discovery result on the server for 15 minutes, and the first successful save uses it up; to pick other Pages later, call `OAuthConnect` again.

The registry declares each provider's picker shape. Multi-select pickers
(Google Ads, Meta Ads, TikTok Ads, Merchant Center, YouTube, GA4, Google Business Profile, Facebook Pages, and direct
Instagram) accept one or more entries.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Agent instance GUID. |
| `credentialkey` | string | Yes | Credential key with an `account_picker` defined. |
| `accounts` | array | Root picker only | One or more account objects with the per-credential keys (see table below). |
| `pickerkey` | string | Chained picker only | Chained picker key returned by `DiscoverPickerItems`. |
| `selections` | array | Chained picker only | One `{ parentvalue, items }` entry for every parent that `DiscoverPickerItems` returned without `errorcode`. Send each item exactly as discovered, ID and name (for example `{ pageid, pagename }`); an item whose name differs is rejected. Leave out parents that came back with `errorcode`; they keep the items saved before. An empty `items` array selects nothing for that parent: no Pages for a Meta Ads ad account, no locations for a Google Business Profile account. A successful save uses up the discovery result, so call `DiscoverPickerItems` again before the next change. |

##### Picker data from the redirect

Each list parameter is a URL-encoded JSON array. Your query parser has already decoded it, so parse the value once with `JSON.parse`; decoding it a second time breaks names that contain `%`. IDs arrive without provider prefixes such as `customers/`, `act_` or `properties/`. Copy each chosen item into the `accounts[]` keys of `SetPickerAccounts`:

| Credential | List | Item fields | `accounts[]` entry |
|------------|------|-------------|--------------------|
| `google-ads` | `gads_accounts` | `id`, `name`, `status` | `{ customerid: id, customerdescriptivename: name }` |
| `meta-ads` | `metaads_accounts` | `id`, `name` | `{ adaccountid: id, adaccountname: name }` |
| `tiktok-ads` | `tiktokads_advertisers` | `id`, `name` | `{ advertiserid: id, advertisername: name }` |
| `google-merchant-center` | `mc_accounts` | `id`, `name`, `websiteUrl` | `{ merchantid: id, accountname: name }` |
| `youtube` | `yt_channels` | `id`, `title`, `customUrl`, `subscriberCount` | `{ channelid: id, channeltitle: title }` |
| `ga4` | `ga4_properties` | `id`, `displayName`, `account`, `propertyType` | `{ propertyid: id, propertydisplayname: displayName }` |
| `google-business` | `gbp_accounts` | `id`, `name` | `{ accountid: id, accountname: name }` |
| `facebook-pages` | `fb_pages` | `id`, `name` | `{ pageid: id, fbpagename: name }` |

Merchant Center's `name` can be empty and its `websiteUrl` is always empty, so label those accounts with their ID when needed. Each integration page describes the other fields. In System User mode there is no redirect: `OAuthConnect` returns `{ id, name }` items in `accounts` for Meta Ads (`{ adaccountid: id, adaccountname: name }`), Facebook Pages (`{ pageid: id, fbpagename: name }`) and Instagram (`{ accountId: id, igusername: name }`). Instagram Login in own mode has no list: Wiro saves the authorized account itself. `POST /Credentials/Detail` carries the same mapping: `oauth_provider.account_picker.trigger_param` names the list parameter, and `url_item_fields` maps each `accounts[]` key to an item field.

##### Per-credential `accounts[]` shape

| Credential | Keys per entry | Notes |
|------------|----------------|-------|
| `google-ads` | `customerid`, `customerdescriptivename` | `customerid` is 10 digits; dashes/letters stripped server-side. |
| `meta-ads` | `adaccountid`, `adaccountname` | `act_` prefix stripped server-side. |
| `tiktok-ads` | `advertiserid`, `advertisername` | Numeric advertiser ID; non-digits stripped server-side. Each call replaces the previous selection. |
| `google-merchant-center` | `merchantid`, `accountname` | |
| `youtube` | `channelid`, `channeltitle` | |
| `ga4` | `propertyid`, `propertydisplayname` | |
| `google-business` | `accountid`, `accountname` | Numeric account ID; non-digits stripped server-side. Locations are chosen afterwards with the chained `"locations"` picker. |
| `facebook-pages` | `pageid`, `fbpagename` | One or more Pages from the latest OAuth or System User discovery result. |
| `instagram` | `accountId`, `igusername` | One or more accounts from direct System User discovery. Customer-owned Instagram OAuth does not use this picker and writes one authorized account directly. |

The first key is required in every entry, and the same ID twice is refused. The name key is optional and saved empty when left out, so send it to get names back from `OAuthStatus`.

##### Example: Google Ads multi-select

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/SetPickerAccounts" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "credentialkey": "google-ads",
    "accounts": [
      { "customerid": "1234567890", "customerdescriptivename": "Acme Corp" },
      { "customerid": "0987654321", "customerdescriptivename": "Acme Subsidiary" }
    ]
  }'
```

##### Response

```json
{
  "result": true,
  "errors": [],
  "accounts": [
    { "id": "1234567890", "name": "Acme Corp" },
    { "id": "0987654321", "name": "Acme Subsidiary" }
  ]
}
```

The agent restarts automatically if it was running.

##### Example: save Meta Ads Page mappings

Call this after `DiscoverPickerItems` and include every successful parent once:

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/SetPickerAccounts" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "credentialkey": "meta-ads",
    "pickerkey": "pages",
    "selections": [
      {
        "parentvalue": "123456789",
        "items": [
          { "pageid": "111222333", "pagename": "Acme" }
        ]
      }
    ]
  }'
```

The response includes `pickerkey: "pages"` and the persisted, flat
`pagemappings[]` list. Sending an empty `items` array skips Pages for that ad
account; Meta Ads reporting and other non-Page operations remain available.

Google Business Profile uses the same chained shape with `pickerkey: "locations"`,
`{ locationid, locationtitle }` items, and a `locationmappings[]` list in the
response (see [Google Business Profile → Connect through the API](/docs/integration-googlebusiness-skills#connect-through-the-api)).

Saving the root accounts again replaces the selection. Pages or locations already chosen for accounts that stay selected are kept, those of removed accounts are dropped, and an open `DiscoverPickerItems` result is discarded, so discover again before saving the second step.

##### Common errors

| Error message | Cause |
|---------------|-------|
| `accounts must be a non-empty array` | `accounts` missing or empty. |
| `Each account selection must be an object` | An `accounts[]` entry is not an object. |
| `Each account selection must include <field>` | An entry has no ID in the credential's ID field, such as `customerid`. |
| `Duplicate account selection: <id>` | Two entries have the same ID after cleanup (for example `123-456-7890` and `1234567890`). |
| `Single-select picker requires exactly one account; got <N>` | Single-select credential received multiple entries. |
| `<Provider> account not connected` | Standard picker (e.g. Google Ads) called before the OAuth callback wrote tokens. A chained step also returns it when no parent account is saved or the access token has expired. |
| `No pending <Provider> connection. Please reconnect via OAuthConnect.` | Facebook Pages or System User Instagram: the 15-minute discovery window expired, or an earlier save already used it. |
| `Selected <field> not found in pending list: <value>` | Deferred-token picker: the selected ID is not in the latest server-side discovery result. |
| `Credential does not support account picker: <key>` | `credentialkey` doesn't have an `account_picker` (e.g. Twitter / TikTok / HubSpot). |
| `selections must be an array` | `pickerkey` was sent without a `selections` array. |
| `Unknown credential picker` | `pickerkey` is not this credential's chained picker. |
| `Each selection must contain parentvalue and items` | A `selections[]` entry is not `{ parentvalue, items: [...] }`. |
| `Selected parent is not available` | `parentvalue` is not a selected account, appears twice, or came back from discovery with `errorcode`. |
| `Selected picker item is invalid` / `Selected picker item is not available` | An item is not an object, was not discovered for that parent, has a different name, or appears twice. |
| `Picker candidates expired. Discover them again.` | Chained picker candidates expired or the parent connection changed. Call `DiscoverPickerItems` again. |
| `selections must include every available parent exactly once` | Chained picker request omitted or duplicated a successfully discovered parent. |
| `Selected parent is no longer available` | The root selection changed while saving. Call `DiscoverPickerItems` again. |

### POST /UserAgentOAuth/OAuthDisconnect

Clears the credential's connection: tokens, `authmethod`, picker selections,
auto-filled values and the credential's other saved fields, such as LinkedIn's
`organizationid`, Shopify's `shopdomain` and Reddit's `developerprofileusername`;
save them again before you reconnect. Reddit's approval flags are cleared too,
so a Reddit reconnect waits until Wiro sets them again. Customer-owned OAuth app
keys (`clientid`, `clientsecret`, `appid`, `appsecret`, TikTok's `clientkey`,
Google Ads' `developertoken`) are kept for reconnection, also in Shopify's
Client ID + Secret mode. An alternative API-key field is kept while
disconnecting OAuth, but disconnecting that direct mode itself clears its
secret, such as Meta `systemusertoken` or Mailchimp `apikey`. Because
`authmethod` is cleared, send it again with the next `OAuthConnect` (and save it
again for a direct mode). The agent restarts automatically if it was running.

For providers that publish a token-revocation endpoint (currently X, TikTok, TikTok Ads and Reddit), Wiro also calls the provider's revoke endpoint for OAuth connections as a non-critical best-effort step. Other providers only clear local credentials; the token remains valid on the provider side until it expires.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Agent instance GUID. |
| `credentialkey` | string | Yes | OAuth credential key. |

##### Response

```json
{
  "result": true,
  "errors": []
}
```

### Token lifecycle

Wiro maintains renewable provider connections automatically while the agent is
running. Direct Meta System User connections have no generic refresh contract:
regenerate and reconnect an expiring or invalidated token. There is no
customer-facing token-refresh endpoint or manual refresh action.

Use `POST /UserAgentOAuth/OAuthStatus` to monitor the connection. Wiro renews tokens only while the agent runs and when it starts, so a stopped agent reports `connected: false` once its last access token has expired, although the authorization is still valid (for example about an hour after the last renewal for Google, 30 minutes for HubSpot). Start the agent and check again. `DiscoverPickerItems` and the second-step `SetPickerAccounts` need a current token too. If `connected` stays `false` while the agent runs, or the provider revokes a connection that cannot be renewed, reconnect through `POST /UserAgentOAuth/OAuthConnect`. Provider-specific exceptions are documented in each integration guide.

## Web UI Behaviors (Wiro Dashboard)

If you're comparing against the Wiro Dashboard, here's what happens under the hood for parity with the API:

- **Per-group save**: Each credential card has its own Save button. Saving a card calls `POST /UserAgent/CredentialUpsert` with only that group's `fields[]` (one request per card).
- **Own mode 2-step**: When a user clicks "Connect" in own mode, the Dashboard first calls `CredentialUpsert` to save `appid`/`appsecret` + `authmethod: "own"`, then calls the Connect endpoint with `authmethod: "own"`. API users must make both calls explicitly.
- **Recommended Meta direct mode**: Facebook Pages, Instagram, and Meta Ads
  default to System User Token. The Dashboard saves `authmethod: "api_key"` and
  `systemusertoken`, calls `OAuthConnect`, then completes the registry picker
  without exposing provider tokens to browser state.
- **Full-page redirect, not popup**: `window.location.href = authorizeUrl`, with no popup windows (avoids third-party cookie issues).
- **No manual token refresh button**: Wiro maintains supported connections automatically; reconnect when the Dashboard reports that authorization is required.
- **LLM Markdown feature**: The Dashboard includes an "LLM Markdown" tab that generates a ready-to-paste prompt for AI assistants summarizing every credential field the agent needs. Useful for API users building their own configuration UIs. See the per-integration help texts for equivalent guidance.
- **Registry-backed validation**: Wiro validates declared types, patterns, lengths, URLs, enum values, and provider response contracts before persisting or connecting credentials. The provider remains authoritative for permissions and asset access.
- **Platform-managed credentials are hidden**: Groups whose fields are all flagged `platform_managed: true` (currently only `sys-openai`) are omitted from `POST /UserAgent/Detail` responses entirely. They're pre-configured by Wiro and can't be set by customers.

## Setup Required State

If an agent has required credentials not yet filled in, it's in **Setup Required** state (`status: 6`). It can't be started until credentials are complete.

**Every fresh deploy lands at `status: 6` first.** API deploys must always pass `useprepaid: true`. The server provisions the prepaid subscription inline and auto-queues the row to `status: 2` (Queued). No manual `Start` call is needed unless you also need to fill credentials first; if so, Start will reject with the Setup-Required guard until the required credentials are in place.

`setuprequired` flag in `UserAgent/Detail` / `UserAgent/MyAgents` is `true` when any non-optional credential is still incomplete. The server treats a credential as complete when either:

- **OAuth and hybrid connection credentials**: `_connected: true` (the active
  mode has a validated runtime token **and** every required picker field is
  populated), or
- **API-key credentials**: at least one field with `fieldstatus: "user"` has a non-empty value (any one user-writable field filled in makes the credential count as "entered"; there is no deeper per-field validation).

The two branches are checked together: `setuprequired` stays `true` until every required credential passes one of them.

## Security

- **Tokens are stored server-side** and are never returned by the customer-facing credential endpoints.
- **`oauth_session` fields are always stripped** from Detail, `MyAgents`, and `CredentialUpsert` responses: `accesstoken`, `refreshtoken`, `pageAccessToken` and any similar token rows never leave the server. `OAuthStatus` returns only the `connectedat` and `tokenexpiresat` timestamps, never a token.
- **`platform` fields are always stripped** from responses. In practice this affects every `sys-openai` field and Reddit's three approval flags; the `sys-openai` key never leaves the server. `credentials.wiro.apikey` and `credentials.calendarific.apikey` are user-supplied and appear normally in the response.
- **`oauth_app` fields (`clientid` / `clientsecret`, `appid` / `appsecret`) are stripped from Detail responses**, even after an OAuth "own mode" setup writes them. The append-only credential history redacts `clientsecret` to `[REDACTED]` and always redacts `oauth_session` rows.
- **`fieldstatus` is server-assigned.** A `fieldstatus` sent to `CredentialUpsert` is ignored; the server assigns the status itself.
  - Fields that the connection flow fills in, OAuth tokens included, are rejected with `<Field label> is managed by the connection flow` in `errors[]`. A token field has no schema label, so it is named `<credentialkey>.<fieldname>`.
  - Wiro-managed (`platform`) fields are rejected with `<Field label> is managed by Wiro`.
  - A request that fails validation saves nothing, and Deploy never saves either kind of field from its `credentials` body.
- The `redirecturl` receives only connection status parameters: no tokens, no secrets.
- OAuth state parameters use a 15-minute TTL cache to prevent replay attacks.
- Redirect URLs must be https, on any host you control (or http on localhost/127.0.0.1 for development).
- Facebook Page and direct Instagram discovery results remain server-side for
  15 minutes while the user selects accounts. Clients receive only public
  `{id, name}` pairs; System User and Page access tokens never leave the server.

## For Third-Party Developers

If you're building a product on top of Wiro agents and need your customers to connect their own accounts:

1. **Deploy** an agent instance per customer via `POST /UserAgent/Deploy`.
2. **Connect**: for `own` or a direct mode, first save that mode's fields and
   `authmethod` with `POST /UserAgent/CredentialUpsert` (Wiro mode needs no app
   keys). Then call `POST /UserAgentOAuth/OAuthConnect` with the same
   `authmethod`. For OAuth, pass a `redirecturl` on your own site: any https
   page you control, or `http://localhost` / `http://127.0.0.1` while you develop.
3. **OAuth branch**: when `authorizeUrl` is returned, send the customer's
   browser there. Wiro brings it back to your `redirecturl` with
   `<prefix>_connected=true` and, for picker credentials, the account list, or
   with `<prefix>_error=<code>`.
4. **Direct branch**: when `accounts` is returned, there is no redirect; the
   list is in the response.
5. **Pick**: show the list in your own UI and save the choice with
   `POST /UserAgentOAuth/SetPickerAccounts` (see
   [Account picker in your own UI](#account-picker-in-your-own-ui)).
6. **Verify**: call `POST /UserAgentOAuth/OAuthStatus` and check `connected`,
   `accounts` and, for a second picker step, `pickersteps`.

`<prefix>_connected=true` means the provider authorized Wiro. A picker credential is ready only after `SetPickerAccounts` saves at least one account; until then `OAuthStatus` reports `connected: false`, and Facebook Pages stores nothing at all before that call. Two cases differ: when the Google user has exactly one YouTube channel, Wiro saves that channel during the callback, and a reconnect in the same mode keeps the earlier selection until you save a new one, so `OAuthStatus` may already show the old accounts.

The Google Ads, Meta Ads, TikTok Ads, Facebook, Instagram, Google Business Profile, X, TikTok, LinkedIn, HubSpot and Mailchimp pages include a **Multi-Tenant Architecture** section with notes for running one agent per customer, such as token isolation, consent screen branding and provider rate limits.

### Account picker in your own UI

Google Ads, Meta Ads, TikTok Ads, Merchant Center, YouTube, GA4, Google Business Profile, Facebook Pages and System User Instagram ask the customer to pick accounts. You build that picker in your own app:

1. **Read the list.** On success the redirect carries it in one parameter:
   `gads_accounts`, `metaads_accounts`, `tiktokads_advertisers`, `mc_accounts`,
   `yt_channels`, `ga4_properties`, `gbp_accounts` or `fb_pages` (see
   [Callback success & error parameters](#callback-success-error-parameters)).
   It is a JSON array that your query parser has already decoded, so parse it
   once with `JSON.parse`. In System User mode the list is in the
   `OAuthConnect` response instead.
2. **Show it.** Every item has an `id` and a name;
   [Picker data from the redirect](#picker-data-from-the-redirect) lists each
   credential's item fields and the keys to save them under.
3. **Save the choice.** Send one or more chosen items in `accounts[]` to
   [`SetPickerAccounts`](#post-useragentoauthsetpickeraccounts). Every picker
   accepts several items. Facebook Pages and System User Instagram must be
   saved within 15 minutes, and that list can be saved only once.
4. **Second step.** For Meta Ads Pages (optional) and Business Profile
   locations, call
   [`DiscoverPickerItems`](#post-useragentoauthdiscoverpickeritems), show the
   groups, and save the choice with `SetPickerAccounts`, `pickerkey` and
   `selections[]` within five minutes.
5. **Nothing to pick.** When the provider lists nothing, the redirect carries
   `<prefix>_error=no_accounts` (`fb_error=no_pages` for Facebook Pages) and
   Wiro saves nothing. Show the reason and let the customer connect again.

Wiro sends the list only in that redirect or response. No endpoint lists it again: `OAuthStatus` shows only the saved selection. To offer changes later, keep the list or run `OAuthConnect` again.

### Handling the OAuth redirect in your app

```javascript
app.get('/settings/integrations', (req, res) => {
  // req.query values are already URL-decoded: parse each list once, without decodeURIComponent.
  if (req.query.x_connected === 'true') {
    return res.redirect(`/dashboard?connected=twitter&username=${encodeURIComponent(req.query.x_username || '')}`)
  }

  if (req.query.metaads_connected === 'true') {
    const accounts = JSON.parse(req.query.metaads_accounts || '[]') // [{ id, name }]
    return res.redirect(`/dashboard/meta-ads?accounts=${encodeURIComponent(JSON.stringify(accounts))}`)
  }

  if (req.query.fb_connected === 'true') {
    const pages = JSON.parse(req.query.fb_pages || '[]') // [{ id, name }]
    // Facebook always requires SetPickerAccounts to finalize, within 15 minutes
    return res.redirect(`/dashboard/facebook?pick=${encodeURIComponent(JSON.stringify(pages))}`)
  }

  if (req.query.gads_connected === 'true') {
    const customers = JSON.parse(req.query.gads_accounts || '[]') // [{ id, name, status }]
    return res.redirect(`/dashboard/google-ads?pick=${encodeURIComponent(JSON.stringify(customers))}`)
  }

  // For example gads_error=no_accounts: the Google user has no Google Ads account to pick
  const errKey = Object.keys(req.query).find((k) => k.endsWith('_error'))
  if (errKey) {
    return res.redirect(`/dashboard?error=${errKey}&reason=${encodeURIComponent(req.query[errKey])}`)
  }

  res.redirect('/dashboard')
})

// After the customer picks, save the choice from your backend:
async function saveGoogleAdsPick(useragentguid, picked) {
  const res = await fetch('https://api.wiro.ai/v1/UserAgentOAuth/SetPickerAccounts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.WIRO_API_KEY },
    body: JSON.stringify({
      useragentguid,
      credentialkey: 'google-ads',
      accounts: picked.map((c) => ({ customerid: c.id, customerdescriptivename: c.name })),
    }),
  })
  return res.json() // { result, errors, accounts: [{ id, name }] }
}
```
