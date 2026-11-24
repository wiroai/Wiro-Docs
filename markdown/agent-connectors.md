# Agent Connectors

Connect a Wiro agent to the services it works with: browse the connector catalog, connect a connector with its fields or its vendor's sign-in, pick the accounts it may act on, choose what it may do without asking, answer its approval requests, read each connection's state and disconnect it. Every call of the cycle, with its request and answer.

## Overview

A connector gives an agent the tools of one outside service: Google search through Serper, a Shopify store, Google Ads, HubSpot, a Facebook Page. Each connector is one row of Wiro's connector catalog, named by its `slug`, such as `serper`, `shopify` or `facebook-pages`. You connect a connector to one agent at a time, in one of three ways. The first two always take your customer's own credentials:

- **Fields.** The values the vendor issues, such as an API key, an app password or a store address, sent once with `ConnectorConnect`. Wiro stores them encrypted. Where the connector has a check, Wiro first makes one read call to the vendor with them and refuses values the vendor refuses.
- **Sign-in.** The vendor's own consent screen in a browser. `ConnectorConnect` answers with an `authorizeUrl`; your customer opens it, agrees, and the vendor sends the browser back through Wiro to your page. Vendors whose sign-in needs an app of your own (Blogger, Gmail, Google Ads, Google Analytics 4, Google Business Profile, Google Merchant Center, Google Search Console, YouTube, Facebook Pages, Instagram, Meta Ads, Threads, LinkedIn, TikTok, X, Reddit, Pinterest, Tumblr, HubSpot, Mailchimp and Shopify) take that app's client id and secret with the connect. Google Calendar, Google Drive and Google Play Console don't sign in: they take a service account's JSON as a field.
- **A Wiro project.** Wiro AI Models (`wiro`), Wiro's own model and task tools, takes one of your Wiro projects instead of values: see [Wiro AI Models](#the-wiro-connector).

Once a connector is connected, the agent restarts and has the connector's tools, named `<slug>__<tool>`. Values and tokens are never sent back in an answer and never reach the agent's chat. By default the agent runs the tools that only read, asks a person in the chat before it creates, sends, changes or deletes anything, and does those in its Scheduled Tasks without asking: see [Permissions and Approvals](#permissions-and-approvals).

Every connector also has a public page, `https://wiro.ai/connectors/{slug}`, with its fields, setup steps, tools and the calls to connect it.

### The cycle at a glance

| Step | Call | What you get |
|------|------|--------------|
| 1. Browse the catalog | [`POST /AgentConnector/List`](#post-agentconnectorlist) | Every available connector with its Connect fields and tools. No API key needed. |
| 2. Read one connector | [`POST /AgentConnector/Detail`](#post-agentconnectordetail) | The same row for one `slug`. No API key needed. |
| 3a. Connect with fields | [`POST /UserAgent/ConnectorConnect`](#connect-with-fields) with `values` | `status: "connected"`, and the agent restarts. |
| 3b. Or start a sign-in | [`POST /UserAgent/ConnectorConnect`](#connect-with-a-sign-in) with `redirecturl` | `status: "pending"` and the `authorizeUrl` to open in the browser. |
| 4. The browser comes back | [`GET /AgentConnector/OAuthCallback`](#the-callback-and-your-redirect-url), called by the vendor | A redirect to your `redirecturl` with `connector_connected=true` or `connector_error=<code>`. |
| 5. Read the state | [`POST /UserAgent/ConnectorList`](#post-useragentconnectorlist) | Each connection's `status`: `connected`, `pending`, `reauth` or `error`. |
| 6. Pick accounts | [`POST /UserAgent/ConnectorAccounts`](#post-useragentconnectoraccounts), [`POST /UserAgent/ConnectorSetAccounts`](#post-useragentconnectorsetaccounts) | The Pages, ad accounts, advertisers or properties the connection can reach, and the ones it may act on. |
| 7. Choose what runs without asking | [`POST /UserAgent/ConnectorPermissions`](#post-useragentconnectorpermissions), [`POST /UserAgent/ConnectorSetPermissions`](#post-useragentconnectorsetpermissions) | Each tool's value in Chat and in Autopilot: `allow`, `ask` or `block`. |
| 8. Answer approvals | [`POST /UserAgent/Message/ApprovalCardAct`](#post-useragentmessageapprovalcardact), or a [reply](#answering-with-a-reply) | An action that asked runs once (or from now on), or is declined, and the agent goes on in the chat. Answer the card with ApprovalCardAct, or reply `yes`, `always` or `no` in the chat; in Telegram, Slack and Discord, answer the agent's question there. |
| 9. Disconnect | [`POST /UserAgent/ConnectorDisconnect`](#post-useragentconnectordisconnect) | The connection, its values and tokens deleted, and the agent restarts. |

### Who your customer sees

A sign-in you start with your project API key comes from your product. The vendor's consent screen shows your organization's name (else your team's name, else your account's name) and your organization's avatar when it is an https image, or, for a connector that signs in with an app of your own, that app's name and logo as you set them in the vendor's developer console. Wiro's own app signs in only from Wiro's own panel, and sign-ins started there show Wiro.

One Wiro address can still show: the redirect URI, `https://api.wiro.ai/v1/AgentConnector/OAuthCallback`, which the browser passes through on its way back to your `redirecturl`. Some vendors show it on their consent screen, and some also show the address that identifies the sign-in's client, which is on the same API host. The help text of your own app's fields names the redirect URI too, since the app must register it: if your customers must not read it there, register the OAuth app yourself and keep the own-app fields out of the forms they fill in.

Otherwise, the connector texts your customer may read (field labels, help texts, error sentences) name the vendor only.

## Authentication

| Call | API key | Who may call it |
|------|---------|-----------------|
| `AgentConnector/List`, `AgentConnector/Detail` | Not needed | Anyone. A signed-in caller gets the same answer. |
| `UserAgent/ConnectorList` | Required | The agent's owner, or a member of the agent's team. |
| `UserAgent/ConnectorConnect`, `UserAgent/ConnectorAccounts`, `UserAgent/ConnectorSetAccounts`, `UserAgent/ConnectorDisconnect`, `UserAgent/ConnectorPermissions`, `UserAgent/ConnectorSetPermissions` | Required | The agent's owner, or an admin of the agent's team. |
| `UserAgent/Message/ApprovalCardAct` | Required | The agent's owner, or a member of the agent's team who sees the card in the chat. `always` takes the owner or a team admin. See [Who may answer](#post-useragentmessageapprovalcardact). |
| `AgentConnector/OAuthCallback` | None | The vendor's redirect in your customer's browser. You never call it. |

Send your project API key in the `x-api-key` header, as on every other endpoint (see [Authentication](/docs/authentication)). Every answer has `result` and `errors: [{ code, message }]`; HTTP 200 with `result: false` is a refusal. The access refusals:

| Code | Message |
|------|---------|
| `95` | `User agent not found` |
| `96` | `You don't have access to this user agent` (ApprovalCardAct: `Only the agent's owner and its team can answer its approvals.`) |
| `97` | `Only a team admin can perform this action on a team-owned agent.` (ApprovalCardAct's `always`: `Only an agent admin can allow this for good.`) |

## The Catalog

### **POST** /AgentConnector/List

Lists every available connector, in display order (`sortorder`, then title), at most 500 rows. Public: no API key needed.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `search` | string | No | Matches the slug, title or description, ignoring case. At most 100 characters. |
| `category` | string | No | One category: `ads`, `ai`, `analytics`, `commerce`, `content`, `crm`, `data`, `email`, `marketing`, `messaging`, `productivity`, `social` or `stores`. |

```bash
curl -X POST "https://api.wiro.ai/v1/AgentConnector/List" \
  -H "Content-Type: application/json" \
  -d '{ "search": "facebook" }'
```

##### Response

```json
{
  "result": true,
  "errors": [],
  "agentconnectors": [
    {
      "slug": "facebook-pages",
      "title": "Facebook Pages",
      "description": "Publish posts, photos and videos to your Facebook Pages and read their engagement.",
      "category": "social",
      "iconurl": "https://wiro.ai/images/icons/skills/facebook.svg",
      "websiteurl": "https://www.facebook.com",
      "authtype": "provider-oauth",
      "transport": "local",
      "credentialfields": [
        {
          "name": "appid",
          "label": "App ID",
          "description": "1. Go to [Meta for Developers → My Apps](https://developers.facebook.com/apps/)\n2. Click **Create App** ...\n5. Add `https://api.wiro.ai/v1/AgentConnector/OAuthCallback` as a Valid OAuth Redirect URI",
          "required": true,
          "secret": false,
          "format": "text",
          "pattern": "^[0-9]+$",
          "serveronly": true,
          "mode": "oauth"
        },
        {
          "name": "appsecret",
          "label": "App Secret",
          "description": "1. Go to [Meta for Developers](https://developers.facebook.com/apps/) → select your app\n2. Go to **App Settings → Basic** ...",
          "required": true,
          "secret": true,
          "format": "password",
          "serveronly": true,
          "mode": "oauth"
        },
        {
          "name": "systemusertoken",
          "label": "System User Token",
          "description": "Use a token generated for a **Meta Business Manager System User** ...",
          "required": true,
          "secret": true,
          "format": "password",
          "mode": "key"
        }
      ],
      "accountpickers": [
        { "key": "pages", "label": "Facebook Pages", "description": "The Pages the agent may post to, comment on and read insights of.", "multiple": true }
      ],
      "scopes": [
        "pages_show_list", "pages_manage_posts", "publish_video", "pages_manage_engagement", "pages_read_engagement",
        "pages_read_user_content", "pages_manage_metadata", "pages_messaging", "read_insights"
      ],
      "modes": ["oauth", "key"],
      "wiroapp": false,
      "tools": [
        { "name": "list_pages", "title": "List Facebook Pages", "description": "Lists the Facebook Pages this connection can use ...", "readonly": true, "destructive": false, "category": "read", "defaults": { "chat": "allow", "autopilot": "allow" } },
        { "name": "create_post", "title": "Create a Facebook Page post", "description": "Publishes a text post on a Page, optionally with a link ...", "readonly": false, "destructive": false, "category": "create", "defaults": { "chat": "ask", "autopilot": "allow" } }
      ],
      "docs": {
        "overview": "Publish posts, photos and videos to your Facebook Pages and read their engagement.",
        "revoke": "Remove the app's access in your Facebook Pages account's connected apps settings, then disconnect it here."
      },
      "sortorder": 110,
      "updatedat": 1795390000,
      "runs": "agent",
      "hosts": { "api": ["graph.facebook.com", "rupload.facebook.com"], "site": false, "uploads": [] }
    }
  ]
}
```

The example is shortened: real help texts and tool descriptions are longer, and `tools` lists every tool.

| Field | Description |
|-------|-------------|
| `slug` | The connector's name in every call: 2 to 30 lower-case letters, digits or dashes, starting with a letter. It never changes. |
| `title`, `description` | Display name and one-line summary. |
| `category` | One lower-case word for grouping, or `null`. |
| `iconurl`, `websiteurl` | The vendor's logo and site, or `null`. |
| `authtype` | How it connects: `fields` (values on a Connect card), `provider-oauth` (the vendor's sign-in with your own app, and for some vendors a key instead), `headers` (values the vendor's own MCP server takes, such as an API key), `oauth` (the vendor's MCP sign-in, no app of yours needed) or `none` (nothing to enter). |
| `transport` | Where its tools run: `local` (inside the agent), `streamable-http` or `sse` (the vendor's own MCP server). Nothing you send depends on it. |
| `credentialfields` | The Connect card: one entry per value to ask for. See [Connect card fields](#connect-card-fields). A `headers` row lists its values in the same shape. Never a value. |
| `accountpickers` | The account lists a connection chooses from after it connects, each `{ key, label, description, multiple }`. Empty when there is nothing to pick. See [Account Pickers](#account-pickers). |
| `scopes` | The OAuth scopes the sign-in asks for (`oauth` and `provider-oauth` rows). |
| `modes` | `provider-oauth` rows only: `["oauth"]` (sign-in only) or `["oauth", "key"]` (a sign-in, or a key or token instead). Empty for other rows. |
| `wiroapp` | `true` when the vendor can also be signed in with Wiro's own app, which only Wiro's own panel uses. With your API key you always send your own app's keys. |
| `tools` | The tools the agent gets, each `{ name, title, description, readonly, destructive, category, defaults }`. `name` is the tool's name before the slug prefix. `readonly` and `destructive` say what the tool does; for a vendor's own MCP server they are the vendor's hints, with Wiro's corrections where a hint is wrong. `category` (`read`, `create` or `change`) and `defaults` (`{ chat, autopilot }`, each `allow`, `ask` or `block`) are what an agent's [permissions](#permissions-and-approvals) start from. A connector on a vendor's own MCP server (TikTok Ads, DataForSEO, lemlist, GitBook, HackMD and Wiro AI Models) lists no tools until an agent first connects it, by sign-in, key or project: its `tools` is `[]` until then. |
| `docs` | Optional public page copy: `{ overview, setup, revoke, limits }` (`setup` is a list of steps), or `null`. |
| `sortorder`, `updatedat` | Display order and the row's last change (Unix seconds). |
| `runs` | `agent` when the connector's tools run inside the agent, which sends their requests straight to the vendor, or `vendor` when they run on the vendor's own MCP server, which the agent sends each request to. |
| `hosts` | Where its requests go: `{ api, site, uploads }`. `api` lists the vendor's hosts (for `vendor`, its MCP server's host), `site` is `true` when the connector also calls the site your customer connects (WordPress, WooCommerce, Shopify, Mastodon), and `uploads` lists the hosts it may upload files to. |

### **POST** /AgentConnector/Detail

One connector by its `slug`, in the same shape as a `List` row. Public: no API key needed.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `slug` | string | Yes | The connector's slug. |

```bash
curl -X POST "https://api.wiro.ai/v1/AgentConnector/Detail" \
  -H "Content-Type: application/json" \
  -d '{ "slug": "serper" }'
```

##### Response

```json
{
  "result": true,
  "errors": [],
  "agentconnectors": [
    {
      "slug": "serper",
      "title": "Serper",
      "description": "Google search results through Serper: organic results, answer box and related questions.",
      "category": "data",
      "iconurl": "https://wiro.ai/images/icons/skills/serper.svg",
      "websiteurl": "https://serper.dev",
      "authtype": "fields",
      "transport": "local",
      "credentialfields": [
        {
          "name": "apikey",
          "label": "Serper API Key",
          "description": "1. Sign up at [serper.dev](https://serper.dev). No credit card; new accounts get **2,500 free searches**.\n2. Open the dashboard and copy your **API key** from the **API Key** section.\n3. Paste it here.",
          "required": true,
          "secret": true,
          "format": "password",
          "placeholder": "your Serper.dev API key"
        }
      ],
      "accountpickers": [],
      "scopes": [],
      "modes": [],
      "wiroapp": false,
      "tools": [
        {
          "name": "web_search",
          "title": "Search the web (Google results via Serper)",
          "description": "Searches Google through Serper and returns the organic results (title, link, snippet, position, date), plus the answer box, knowledge graph, related questions and related searches when Google shows them.",
          "readonly": true,
          "destructive": false,
          "category": "read",
          "defaults": { "chat": "allow", "autopilot": "allow" }
        }
      ],
      "docs": { "overview": "Google search results through Serper: organic results, answer box and related questions." },
      "sortorder": 380,
      "updatedat": 1795390000,
      "runs": "agent",
      "hosts": { "api": ["google.serper.dev", "api.serper.dev"], "site": false, "uploads": [] }
    }
  ]
}
```

The example is shortened: the help text and the tool's description are longer, `tools` lists all 13 Serper tools, and `docs` also has `revoke`.

A slug that is not in the catalog, or a connector that is no longer offered, answers `result: false` with `Connector not found.`

### Connect card fields

Build your Connect form from `credentialfields`, in their order:

| Field | Description |
|-------|-------------|
| `name` | The key to send in `values`. |
| `label` | The field's label. |
| `description` | Step-by-step help in Markdown (links, `**bold**`, `` `code` ``, numbered lists), never HTML. Render it as Markdown. Where the help names the redirect URI to register in your own app, the address is already filled in. |
| `required` | The connect is refused while it has no value, sent now or saved before. |
| `secret` | Mask the input, and never show a saved value: answers only list the names of saved values. |
| `format` | The input to show and the check Wiro runs: `text`, `password`, `email`, `url` (an https address, or a bare host such as `shop.example.com`), `textarea` (several lines), `json` (a JSON value, or its text: a service account file, a structured list) or `select` (one of `options`). |
| `options` | `select` only: `[{ value, label }]`. Send the `value`. |
| `placeholder`, `pattern`, `maxlength` | Optional input hints. Wiro checks `pattern` (a regular expression) and `maxlength` too. A value is at most 65,536 characters. A `headers` connector's values are at most 4,096 characters each, on one line. |
| `serveronly` | `true` for your own OAuth app's keys (client id and secret): Wiro uses them for the sign-in and its token refreshes only, and they never reach the agent. |
| `mode` | `provider-oauth` rows only: `oauth` (a field of the sign-in way: your own app's keys, or another value the sign-in needs, such as Reddit's Developer Profile Username) or `key` (the key way in, such as a Meta System User token). A field without `mode` belongs to both ways. Show the two ways as two choices on the card. |
| `source` | `wiro_project` on the project field of Wiro AI Models (`wiro`): show a picker of your Wiro projects instead of an input, and send the chosen project's id as `wiroprojectguid`, never in `values`. See [Wiro AI Models](#the-wiro-connector). |

## Connecting

Every way goes through one call, `POST /UserAgent/ConnectorConnect`. The connector's `authtype` and `modes` from the catalog tell you which body to send.

| `authtype` | Send | Answer |
|------------|------|--------|
| `fields`, `headers` | `values` for its `credentialfields` (never a `wiro_project` field) | `connected` |
| `headers` with a `source: "wiro_project"` field (Wiro AI Models, `wiro`) | `wiroprojectguid`, the id of one of your projects (a request made with a project API key may leave it out: see [Wiro AI Models](#the-wiro-connector)) | `connected` |
| `none` | nothing but `useragentguid` and `slug` | `connected` |
| `provider-oauth` with `mode: "key"` | `values` of the `key` way | `connected` |
| `provider-oauth` (`mode` `oauth`, the default) | the sign-in's fields in `values` (no `mode` or `mode: "oauth"`: your app's keys and any other, such as Shopify's Shop Domain or LinkedIn's Organization ID), and `redirecturl` | `pending` and `authorizeUrl` |
| `oauth` | `redirecturl` | `pending` and `authorizeUrl` |

### **POST** /UserAgent/ConnectorConnect

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | The agent. |
| `slug` | string | Yes | The connector. It must be in the catalog: otherwise `This connector is not available.` |
| `values` | object | No | `{ <field name>: value }` from `credentialfields`. A field you leave out keeps its saved value; `""` or `null` clears it. Numbers and booleans are taken as text, and a `json` field also takes an object or array. |
| `mode` | string | No | `provider-oauth` rows only: `oauth` (the default, a sign-in) or `key` (the key way in, when `modes` includes `key`). |
| `redirecturl` | string | No | Sign-ins only: where the browser returns. See [The redirect URL](#the-redirect-url). |
| `accounts` | object | No | A first account selection for a connector with [account pickers](#account-pickers), `{ <picker key>: [ids] }`, such as `{ "pages": ["123"] }`. Only its shape is checked here; [ConnectorSetAccounts](#post-useragentconnectorsetaccounts) checks every id with the vendor once the connector is connected. |
| `wiroprojectguid` | string | No | Wiro AI Models (`wiro`) only: the id of one of your projects, from [`POST /Project/List`](/docs/projects). It becomes the agent's own Wiro project, as [`CredentialProjectBind`](/docs/agent-overview#post-useragentcredentialprojectbind) binds it. See [Wiro AI Models](#the-wiro-connector). A connector whose tools run inside the agent refuses it; one on a vendor's own MCP server ignores it. |

### Connect with fields

Send every required field in `values`. Serper takes one API key:

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/ConnectorConnect" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "slug": "serper",
    "values": { "apikey": "YOUR_SERPER_API_KEY" }
  }'
```

##### Response

```json
{
  "result": true,
  "errors": [],
  "status": "connected",
  "applied": 1,
  "restart": "scheduled",
  "useragentconnectors": [
    {
      "slug": "serper",
      "title": "Serper",
      "iconurl": "https://wiro.ai/images/icons/skills/serper.svg",
      "category": "data",
      "authtype": "fields",
      "transport": "local",
      "authmode": null,
      "catalogstatus": "active",
      "status": "connected",
      "connectedat": 1795390000,
      "updatedat": 1795390000,
      "tokenexpiresat": null,
      "refreshtokenexpiresat": null,
      "scope": null,
      "accounts": {},
      "wiroprojectid": null,
      "savedvariables": ["apikey"],
      "lasterror": null
    }
  ]
}
```

| Field | Description |
|-------|-------------|
| `status` | `connected`. |
| `applied` | `1` when something changed, `0` when you sent what was already saved: then nothing restarts. |
| `restart` | `scheduled` (the running agent restarts to pick up the connector), `none` (it was not running, or nothing changed) or `failed` (the change is saved, but the restart could not be scheduled: restart the agent yourself). See [Restarts](#restarts). |
| `useragentconnectors` | The connection as [ConnectorList](#post-useragentconnectorlist) shows it. |

**The credential check.** Where the connector has one, Wiro makes one read call to the vendor with the values before it saves them. When the vendor refuses them, nothing is saved and the answer carries the vendor's own sentence:

```json
{
  "result": false,
  "errors": [{ "code": 0, "message": "<the vendor's own sentence, such as why it refused the key>" }]
}
```

Show that sentence next to the form: it names the vendor only.

**Changing a value later.** Send only the fields that change: the others keep their saved values. To replace a key, send the new one; to remove an optional value, send `""`.

A `headers` connector (a vendor's own MCP server that takes a key or login: lemlist (`apikey`), DataForSEO (`login`, `password`), GitBook and HackMD (`token`)) connects the same way: its `credentialfields` are the values it takes, each named by its `name`. Their labels are made from those names, in Title Case (`API Key`, `Login`, `Password`, `Token`), and a secret value has `format: "password"`: DataForSEO's `login` is not a secret (`secret: false`, `format: "text"`); its `password` is. Its values are at most 4,096 characters each, on one line, and its refusals name the value by that `name` (`apikey is required.`). It has no credential check: the vendor's server answers the agent's first call. DataForSEO's fields on [Detail](#post-agentconnectordetail):

```json
"credentialfields": [
  { "name": "login", "label": "Login", "description": "Keyword, search and app store data from your own [DataForSEO](https://dataforseo.com) account. 1. Sign in to [DataForSEO](https://app.dataforseo.com) and open **API Access** ...", "required": true, "secret": false, "format": "text" },
  { "name": "password", "label": "Password", "description": "The **API password** is not the password you sign in with: DataForSEO generates a separate one for the API. ...", "required": true, "secret": true, "format": "password" }
]
```

Send both in `values`:

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/ConnectorConnect" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "slug": "dataforseo",
    "values": { "login": "YOUR_DATAFORSEO_API_LOGIN", "password": "YOUR_DATAFORSEO_API_PASSWORD" }
  }'
```

```json
{
  "result": true,
  "errors": [],
  "status": "connected",
  "applied": 1,
  "restart": "scheduled",
  "useragentconnectors": [
    {
      "slug": "dataforseo",
      "title": "DataForSEO",
      "iconurl": "https://wiro.ai/images/icons/skills/dataforseo.svg",
      "category": "data",
      "authtype": "headers",
      "transport": "streamable-http",
      "authmode": null,
      "catalogstatus": "active",
      "status": "connected",
      "connectedat": 1795390000,
      "updatedat": 1795390000,
      "tokenexpiresat": null,
      "refreshtokenexpiresat": null,
      "scope": null,
      "accounts": {},
      "wiroprojectid": null,
      "savedvariables": ["login", "password"],
      "lasterror": null
    }
  ]
}
```

### Connect with a key instead of a sign-in

Some vendors that sign in with your own app also take a key or token (`modes: ["oauth", "key"]`): a Meta Business Manager System User token for Facebook Pages, Instagram and Meta Ads, a Mailchimp API key, a Shopify custom app's client credentials. Send `mode: "key"` and the fields of that way (`mode: "key"` or no `mode`):

```json
{
  "useragentguid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "slug": "facebook-pages",
  "mode": "key",
  "values": { "systemusertoken": "EAAB..." }
}
```

##### Response

```json
{
  "result": true,
  "errors": [],
  "status": "connected",
  "applied": 1,
  "restart": "scheduled",
  "useragentconnectors": [
    {
      "slug": "facebook-pages",
      "title": "Facebook Pages",
      "iconurl": "https://wiro.ai/images/icons/skills/facebook.svg",
      "category": "social",
      "authtype": "provider-oauth",
      "transport": "local",
      "authmode": "key",
      "catalogstatus": "active",
      "status": "connected",
      "connectedat": 1795390000,
      "updatedat": 1795390000,
      "tokenexpiresat": null,
      "refreshtokenexpiresat": null,
      "scope": null,
      "accounts": {},
      "wiroprojectid": null,
      "savedvariables": ["systemusertoken"],
      "lasterror": null
    }
  ]
}
```

The answer has the fields of [Connect with fields](#connect-with-fields), with `authmode: "key"` on the connection. Fields of the other way are not kept: a connection holds either a sign-in or a key. A vendor that only signs in refuses `mode: "key"` with `This connector connects only by signing in.` Facebook Pages has account pickers: choose its Pages next, as in [Account Pickers](#account-pickers).

### Connect with a sign-in

A sign-in takes four steps: start it, open the vendor's page, let the vendor send the browser back, and read the outcome on your page.

**1. Start it.** For a `provider-oauth` connector, send your own app's keys (the `serveronly` fields with `mode: "oauth"`, or no `mode`) and any other field the sign-in needs, such as Shopify's shop domain. Keys saved by an earlier connect are used again when you leave them out. Register the redirect URI the field help names in your app first: `https://api.wiro.ai/v1/AgentConnector/OAuthCallback`.

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/ConnectorConnect" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "slug": "facebook-pages",
    "values": { "appid": "1234567890", "appsecret": "YOUR_APP_SECRET" },
    "redirecturl": "https://app.example.com/agents/42/connectors?slug=facebook-pages"
  }'
```

##### Response

```json
{
  "result": true,
  "errors": [],
  "status": "pending",
  "authorizeUrl": "https://www.facebook.com/v26.0/dialog/oauth?client_id=1234567890&redirect_uri=https%3A%2F%2Fapi.wiro.ai%2Fv1%2FAgentConnector%2FOAuthCallback&state=7f3c...&response_type=code&scope=pages_show_list%2Cpages_manage_posts"
}
```

An `oauth` connector, a vendor's own MCP server with its own sign-in such as TikTok Ads, needs no app of yours: send `useragentguid`, `slug` and `redirecturl` only. Its consent screen names your organization.

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/ConnectorConnect" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "slug": "tiktok-ads",
    "redirecturl": "https://app.example.com/agents/42/connectors?slug=tiktok-ads"
  }'
```

```json
{
  "result": true,
  "errors": [],
  "status": "pending",
  "authorizeUrl": "https://business-api.tiktok.com/portal/mcp-tt4b-authorize?response_type=code&client_id=...&redirect_uri=https%3A%2F%2Fapi.wiro.ai%2Fv1%2FAgentConnector%2FOAuthCallback&state=...&code_challenge=...&code_challenge_method=S256&resource=...&scope=mcp%3Att4b"
}
```

TikTok Ads has an account picker: once it is connected, pick the advertisers it may act on, as in [TikTok Ads: sign in, then pick advertisers](#tiktok-ads-sign-in-then-pick-advertisers).

The connection is now `pending`. A connection that was already `connected` stays connected while the new sign-in runs, and the new tokens replace the old ones when it finishes.

**2. Open `authorizeUrl`** in your customer's browser: a new tab, a popup, or the same window. The address works for 10 minutes and once. Start a new sign-in to get a fresh one.

**3. The vendor sends the browser back.** After your customer agrees, the vendor redirects to Wiro's callback, `GET /AgentConnector/OAuthCallback`. Wiro exchanges the code for tokens, stores them encrypted, marks the connection `connected`, restarts the agent, and redirects the browser to your `redirecturl`.

**4. Read the outcome on your page.** See [The callback and your redirect URL](#the-callback-and-your-redirect-url).

### The callback and your redirect URL

Wiro adds one parameter to your `redirecturl`, with `?`, or `&` when it already has a query:

| Parameter | Meaning |
|-----------|---------|
| `connector_connected=true` | The connection is connected and the agent is restarting. |
| `connector_error=<code>` | The sign-in did not finish. A new connection is left `error` (or still `pending`); one that was connected before stays connected. |

```
https://app.example.com/agents/42/connectors?slug=facebook-pages&connector_connected=true
https://app.example.com/agents/42/connectors?slug=facebook-pages&connector_error=authorization_denied
```

The return carries no slug or agent of its own, so put what your page needs in `redirecturl` itself, as `slug` above. Then confirm with [ConnectorList](#post-useragentconnectorlist) before you show the connector as connected, and open the [account pickers](#account-pickers) when it has any.

| `connector_error` | What happened | What to show |
|-------------------|---------------|--------------|
| `authorization_denied` | Your customer declined on the vendor's page, or the vendor sent an error. | The sign-in was cancelled; offer to try again. |
| `session_expired` | The sign-in took longer than 10 minutes. | Start the sign-in again. |
| `token_exchange_failed` | The vendor did not issue tokens for the code: often your app's keys, its redirect URI, or a scope the app lacks. | Ask your customer to check the app's keys and redirect URI, then try again. |
| `oauth_app_missing`, `oauth_app_changed` | The app keys the sign-in started with were removed or changed meanwhile. | Start the sign-in again with the current keys. |
| `invalid_signature`, `invalid_shop` | The vendor's signed callback did not match (Shopify). | Start again from the same shop. |
| `invalid_state` | The callback did not match its sign-in. | Start the sign-in again. |
| `connector_unavailable` | The connector left the catalog meanwhile. | The connector is not available. |
| `useragent_not_found` | The agent is gone, or whoever started the sign-in no longer manages it. | Reload the agent. |
| `internal_error` | Something went wrong on Wiro's side. | Try again. |

A callback whose sign-in is unknown (no `state`, or one Wiro never issued) ends on Wiro's own "sign-in not finished" page, because there is no `redirecturl` to return to. A repeated callback, such as a reload of the vendor's last page, follows the first one's redirect for an hour.

### The redirect URL

- `redirecturl` must be an `https` address on any host, or `http` on `localhost` or `127.0.0.1` while you develop. Anything else is refused with `Invalid redirect URL`.
- Send your own page with every sign-in, from a [setup card](/docs/agent-chat-integration#sign-in-hubspot) too. Without one, the browser comes back to Wiro's own connect-return page on wiro.ai.
- It is used exactly as you send it, with your own query kept.

### Restarts

A connect that changes something, a new account selection, a [permission change](#post-useragentconnectorsetpermissions) that does more than turn `ask` into `allow`, and a disconnect of a connected connector restart a running agent so it loads the change: `restart: "scheduled"` in the answer, and for a sign-in, `connector_connected=true` on your page. The agent's `status` on [`POST /UserAgent/Detail`](/docs/agent-overview#post-useragentdetail) then goes `1` (stopping), `2` (queued), `3` (starting) and back to `4` (running), in a minute or two; a message sent meanwhile is refused with a sentence you can show. See [Restarts](/docs/agent-chat-integration#restarts) for what to show. A stopped agent loads the change when it next starts.

## Connection State

### **POST** /UserAgent/ConnectorList

Every connection of one agent, including sign-ins under way and ones that need attention. Names and states only, never a value or token.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | The agent. |

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/ConnectorList" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "useragentguid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890" }'
```

##### Response

```json
{
  "result": true,
  "errors": [],
  "useragentconnectors": [
    {
      "slug": "serper",
      "title": "Serper",
      "iconurl": "https://wiro.ai/images/icons/skills/serper.svg",
      "category": "data",
      "authtype": "fields",
      "transport": "local",
      "authmode": null,
      "catalogstatus": "active",
      "status": "connected",
      "connectedat": 1795390000,
      "updatedat": 1795390000,
      "tokenexpiresat": null,
      "refreshtokenexpiresat": null,
      "scope": null,
      "accounts": {},
      "wiroprojectid": null,
      "savedvariables": ["apikey"],
      "lasterror": null
    },
    {
      "slug": "facebook-pages",
      "title": "Facebook Pages",
      "iconurl": "https://wiro.ai/images/icons/skills/facebook.svg",
      "category": "social",
      "authtype": "provider-oauth",
      "transport": "local",
      "authmode": "own",
      "catalogstatus": "active",
      "status": "connected",
      "connectedat": 1795390400,
      "updatedat": 1795390460,
      "tokenexpiresat": 1800574400,
      "refreshtokenexpiresat": null,
      "scope": "pages_show_list pages_manage_posts publish_video pages_manage_engagement pages_read_engagement pages_read_user_content pages_manage_metadata pages_messaging read_insights",
      "accounts": { "pages": ["123456789012345"] },
      "wiroprojectid": null,
      "savedvariables": ["appid", "appsecret"],
      "lasterror": null
    }
  ]
}
```

| Field | Description |
|-------|-------------|
| `slug`, `title`, `iconurl`, `category`, `authtype`, `transport` | The connector, as the catalog shows it. |
| `authmode` | `provider-oauth` rows: `own` (signed in with your app), `key` (connected with a key or token) or `wiro` (signed in from Wiro's own panel). `null` for other rows. |
| `catalogstatus` | `active` while the connector is offered. `hidden` or `retired` when it left the catalog: the agent no longer gets its tools, and only a disconnect is left. |
| `status` | See the table below. |
| `connectedat`, `updatedat` | When the connection last connected, and its last change (Unix seconds). |
| `tokenexpiresat`, `refreshtokenexpiresat` | Sign-in connections: when the access token and the refresh token expire, or `null`. Wiro refreshes the access token on its own, except on a Facebook Pages or Meta Ads sign-in: Meta's token lasts about 60 days and cannot be refreshed, so when it runs out, the connector's next use (or an account listing) sets the connection to `reauth` with `lasterror: "token_not_refreshable"`, and your customer signs in again. A System User token (`mode: "key"`) set never to expire avoids this. |
| `scope` | The scopes the vendor granted, as it sent them. When the vendor's token answer names none, as Facebook's does, the scopes Wiro asked for, separated by spaces. |
| `accounts` | The account selection, `{ <picker key>: [ids] }`. |
| `wiroprojectid` | Wiro AI Models (`wiro`) only: the agent's own Wiro project, the one the connector acts with, as a string, or `null` when the agent has none. See [Wiro AI Models](#the-wiro-connector). |
| `savedvariables` | The names of the values saved for this connection, sorted. Use them to mark fields as saved; their values are never shown. |
| `lasterror` | A short code for the last failure, such as `authorization_denied`, or `null`. Never a secret. |

| `status` | Meaning | What to show |
|----------|---------|--------------|
| `connected` | The agent has the connector's tools. | Connected, with Disconnect and, when it has pickers, the account choice. |
| `pending` | A sign-in was started and has not come back yet, or the connection misses a required value. | Waiting for the sign-in, with a way to start it again; or the form, to send the missing value with ConnectorConnect. |
| `reauth` | The sign-in expired or was revoked at the vendor: refreshing it failed (`lasterror` is a code: `token_not_refreshable` when a Facebook Pages or Meta Ads sign-in's 60-day token ran out), or the vendor's own MCP server refused it with HTTP 401 or 403 as Wiro listed the connection's accounts (`lasterror: "unauthorized"`; `"no_access_token"` when the connection held no token to send). Or the connection holds a way in the connector no longer takes (`lasterror: "auth_changed"`): a Gmail app password, or a sign-in with Wiro's own app on a connector whose `wiroapp` is `false`; sign in again with an OAuth app of your own. Until the agent's next restart, the connector's tools answer that it must be connected again; after it, the agent no longer has them. | Reconnect: start a new sign-in with ConnectorConnect. |
| `error` | The last sign-in failed (`lasterror` says how). | Connect again. |

A connector that was never connected, or was disconnected, has no row.

## Account Pickers

Some connectors act on accounts inside the vendor: Adjust (apps), App Store Connect (apps), Blogger (blogs), Facebook Pages (Pages), Google Ads (accounts), Google Analytics 4 (properties), Google Business Profile (accounts and locations), Google Drive (folders), Google Merchant Center (accounts), Google Play Console (apps), Google Search Console (properties), Instagram (accounts), Meta Ads (ad accounts, and the Facebook Pages its ads use), Roasit (apps), TikTok Ads (advertisers), Tumblr (blogs) and YouTube (channels). Their catalog row lists `accountpickers`: build the pickers from that field, not from this list. After the connection is `connected`, list the candidates, let your customer choose, and save the choice. The connector's tools refuse any account outside the selection, and until something is picked they have no account to act on.

Connectors of both kinds can have account pickers. Wiro lists the candidates with one of the connector's read tools and the connection's own credentials. For a connector whose tools run on the vendor's own MCP server, such as TikTok Ads, Wiro calls that tool on the vendor's server with the connection's sign-in: see [TikTok Ads: sign in, then pick advertisers](#tiktok-ads-sign-in-then-pick-advertisers). A connector with no pickers has an empty `accountpickers`.

### **POST** /UserAgent/ConnectorAccounts

Lists each picker's candidates now, from the vendor, with the connection's own credentials (a sign-in due for a refresh is refreshed first), and the current selection.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | The agent. |
| `slug` | string | Yes | A connected connector. |

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/ConnectorAccounts" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "slug": "facebook-pages"
  }'
```

##### Response

```json
{
  "result": true,
  "errors": [],
  "pickers": [
    {
      "key": "pages",
      "label": "Facebook Pages",
      "description": "The Pages the agent may post to, comment on and read insights of.",
      "multiple": true,
      "candidates": [
        { "id": "123456789012345", "name": "Acme Coffee" },
        { "id": "234567890123456", "name": "Acme Coffee Berlin" }
      ],
      "selected": ["123456789012345"]
    }
  ]
}
```

| Field | Description |
|-------|-------------|
| `key` | The picker's key in `accounts`. |
| `label`, `description` | What to call the list. |
| `multiple` | `true`: any number of candidates. `false`: at most one. |
| `candidates` | What this connection can reach at the vendor right now, each `{ id, name }`. |
| `selected` | The ids saved now. |

A connector with no pickers answers `pickers: []` when its tools run inside the agent, and `This connector has no accounts to pick.` when they run on the vendor's own MCP server.

### **POST** /UserAgent/ConnectorSetAccounts

Saves the accounts the connection may act on. Wiro lists the candidates again and refuses any id that is not among them.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | The agent. |
| `slug` | string | Yes | A connected connector. |
| `accounts` | object | Yes | `{ <picker key>: [ids] }`. A picker you leave out keeps its selection; send `[]` to clear one. At most 10 keys and 500 ids per key, each id up to 200 characters. |

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/ConnectorSetAccounts" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "slug": "facebook-pages",
    "accounts": { "pages": ["123456789012345", "234567890123456"] }
  }'
```

##### Response

```json
{
  "result": true,
  "errors": [],
  "accounts": { "pages": ["123456789012345", "234567890123456"] },
  "applied": 1,
  "restart": "scheduled",
  "useragentconnectors": [
    {
      "slug": "facebook-pages",
      "title": "Facebook Pages",
      "iconurl": "https://wiro.ai/images/icons/skills/facebook.svg",
      "category": "social",
      "authtype": "provider-oauth",
      "transport": "local",
      "authmode": "own",
      "catalogstatus": "active",
      "status": "connected",
      "connectedat": 1795390400,
      "updatedat": 1795390520,
      "tokenexpiresat": 1800574400,
      "refreshtokenexpiresat": null,
      "scope": "pages_show_list pages_manage_posts publish_video pages_manage_engagement pages_read_engagement pages_read_user_content pages_manage_metadata pages_messaging read_insights",
      "accounts": { "pages": ["123456789012345", "234567890123456"] },
      "wiroprojectid": null,
      "savedvariables": ["appid", "appsecret"],
      "lasterror": null
    }
  ]
}
```

`accounts` is the whole selection after the change. `applied` is `0`, and nothing restarts, when the selection did not change.

| Refusal | Why |
|---------|-----|
| `Unknown account picker: <key>. This connector has: pages.` | A key the connector does not have. |
| `<label> takes one account.` | More than one id for a picker with `multiple: false`. |
| `<label>: 1 of the accounts sent is not among the ones this connection can use.` | An id the vendor did not list for this connection. |
| `accounts must be an object of lists of account ids.`, `accounts has too many keys.`, `Each account id is text of at most 200 characters.` | The body's shape. |
| `This connector is not connected to the agent.` | No connected connection for this slug. |
| `This connector has no accounts to pick.` | The connector's catalog row lists no account pickers: `ConnectorSetAccounts` on any such connector, and `ConnectorAccounts` on one whose tools run on the vendor's own MCP server (one whose tools run inside the agent answers `pickers: []`). |
| `This connector's accounts cannot be listed yet.` | The connector's account lists aren't available right now. Try again later. |
| `The sign-in for this connector expired or was revoked, so it has to be connected again. Ask the agent's operator to reconnect it.` | The connection reads `reauth`, and a new sign-in is needed: refreshing the sign-in failed; or the vendor's own MCP server refused it (HTTP 401 or 403) as Wiro listed the candidates, which sets `lasterror` to `unauthorized` (`no_access_token` when the connection held no token); or the connection already read `reauth`. This refusal's `code` is `"reauth"`, where the others here have `0`. Start a new sign-in with [ConnectorConnect](#connect-with-a-sign-in), then list the accounts again. |
| `The token is being refreshed. Try again in a moment.` | A refresh was under way. |
| `The token could not be refreshed right now. Try again in a moment.` | Refreshing the sign-in failed for now, and its token has already expired. Try again shortly. |
| The vendor's own sentence | The vendor refused to list the accounts. A saved value or token in the sentence reads `[redacted]`; a refusal with no sentence reads `The connector could not complete the request.` |

### TikTok Ads: sign in, then pick advertisers

TikTok Ads runs on TikTok's own MCP server and signs in on TikTok's own consent screen (`authtype: "oauth"`). Its catalog row has one account picker, `advertisers`: the advertiser accounts the agent may work with. Connecting it takes three steps.

**1. Sign in.** Send `useragentguid`, `slug` and `redirecturl`, open the `authorizeUrl` the answer gives, and wait for `connector_connected=true` on your page, as in [Connect with a sign-in](#connect-with-a-sign-in).

**2. List the advertisers.** Wiro asks TikTok for the advertisers the sign-in can reach, with the connection's own token:

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/ConnectorAccounts" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "slug": "tiktok-ads"
  }'
```

##### Response

```json
{
  "result": true,
  "errors": [],
  "pickers": [
    {
      "key": "advertisers",
      "label": "Advertisers",
      "description": "The advertiser accounts the agent may work with. It can't read or change any other advertiser the sign-in can reach.",
      "multiple": true,
      "candidates": [
        { "id": "7301234567890123456", "name": "Acme Coffee" },
        { "id": "7301234567890123457", "name": "Acme Coffee EU" }
      ],
      "selected": []
    }
  ]
}
```

**3. Save the advertisers it may act on.** Wiro lists them again and refuses an id that is not among them:

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/ConnectorSetAccounts" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "slug": "tiktok-ads",
    "accounts": { "advertisers": ["7301234567890123456"] }
  }'
```

##### Response

```json
{
  "result": true,
  "errors": [],
  "accounts": { "advertisers": ["7301234567890123456"] },
  "applied": 1,
  "restart": "scheduled",
  "useragentconnectors": [
    {
      "slug": "tiktok-ads",
      "title": "TikTok Ads",
      "iconurl": "https://wiro.ai/images/icons/skills/tiktok.svg",
      "category": "ads",
      "authtype": "oauth",
      "transport": "streamable-http",
      "authmode": null,
      "catalogstatus": "active",
      "status": "connected",
      "connectedat": 1795390400,
      "updatedat": 1795390520,
      "tokenexpiresat": 1795476800,
      "refreshtokenexpiresat": null,
      "scope": "mcp:tt4b",
      "accounts": { "advertisers": ["7301234567890123456"] },
      "wiroprojectid": null,
      "savedvariables": [],
      "lasterror": null
    }
  ]
}
```

Once the agent restarts, its TikTok Ads tools work with the saved advertisers only: a call that names any other advertiser is refused before it leaves the agent.

- Campaigns, ad groups, campaign copies, and Smart+ campaigns, ad groups and ads that the agent creates start paused: turn them on with the status update tools or in TikTok Ads Manager.
- A call that names a Business Center (`bc_id`) is refused before it leaves the agent: the connector picks advertisers only.
- Business Center, billing and payment, TikTok One, Creator Marketplace and Reach & Frequency buying tools are not offered.
- When TikTok's server no longer accepts the connection's sign-in (HTTP 401 or 403), `ConnectorAccounts` and `ConnectorSetAccounts` answer `The sign-in for this connector expired or was revoked, so it has to be connected again. Ask the agent's operator to reconnect it.` Start a new sign-in with [ConnectorConnect](#connect-with-a-sign-in), then list the advertisers again.

## Disconnecting

### **POST** /UserAgent/ConnectorDisconnect

Deletes the connection: its values, tokens, account selection and [permissions](#permissions-and-approvals), and the approvals waiting for it. For a sign-in, Wiro first asks the vendor to revoke the token where the vendor supports it. A connected connector's agent restarts without its tools.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | The agent. |
| `slug` | string | Yes | The connector. |

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/ConnectorDisconnect" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "slug": "facebook-pages"
  }'
```

##### Response

```json
{
  "result": true,
  "errors": [],
  "removed": true,
  "revoked": true,
  "restart": "scheduled"
}
```

| Field | Description |
|-------|-------------|
| `removed` | `true` when there was a connection to delete. A slug with none answers `removed: false` and changes nothing. |
| `revoked` | `true` when the vendor confirmed the revoke. `false` for connections without a token, vendors without a revoke, or a revoke that failed: the connection is deleted either way. Your customer can also remove the app's access in the vendor's own settings (the connector page's `docs.revoke` says where). |
| `restart` | As on [ConnectorConnect](#post-useragentconnectorconnect). `none` when the connection was not connected. |

## What the Agent Gets

When the agent is back up, every `connected` connection whose connector is still `active` gives it that connector's tools. A tool is named `<slug>__<tool>`: the slug, two underscores, and the tool's `name` from `tools` on [Detail](#post-agentconnectordetail).

| Connector | Tool `name` | The agent calls it |
|-----------|-------------|--------------------|
| `serper` | `web_search` | `serper__web_search` |
| `devto` | `create_draft_article` | `devto__create_draft_article` |
| `bluesky` | `create_post` | `bluesky__create_post` |

- `readonly: true` tools only read. `destructive: true` tools can change or delete something at the vendor. The connection's [permissions](#permissions-and-approvals) say which tools run without asking, which wait for a person's approval and which never run.
- A tool acts with the connection's own credentials and, where the connector has pickers, only on the selected accounts.
- To tell the agent when and how to use the tools, write a [Custom Skill](/docs/agent-skills#using-connectors-in-skills) that names them, such as: "Before you write an article, research the topic with `serper__web_search` and cite the top three results."
- A scheduled task of an agent template that works with a connector runs only while that connector is connected; connecting or disconnecting it never changes the task's `enabled`.
- A disconnected connector's tools are gone after the restart. A `reauth` connection's tools answer that it must be connected again, in words your customer can read (they name no Wiro place or link), until the agent's next restart; after it, the agent no longer has them.

## Permissions and Approvals

Each connection decides what the agent may do with the connector's tools without asking a person. Every tool has one value in each of two columns:

| Column | When it applies |
|--------|-----------------|
| `chat` | A person is in the conversation: a message sent with [`Message/Send`](/docs/agent-messaging#post-useragentmessagesend), from your app or Wiro's web chat, or a conversation with an allowed user on the agent's Telegram, Slack or Discord channel. |
| `autopilot` | Nobody is watching: the agent's Scheduled Tasks and the work before and after a voice call. |

Other work the agent does on its own, such as work it moved to the background, the work of its sub-agents and a turn it picks up again after a restart, takes the stricter of the two values for each tool.

| Value | What happens |
|-------|--------------|
| `allow` | The tool runs. |
| `ask` | The call waits for a person's approval: an [approval card](#the-approval-block) appears in the chat, and the agent says what is waiting. In a Telegram, Slack or Discord conversation, Wiro asks the person a question at the end of the agent's reply instead (see [Approvals in Telegram, Slack and Discord](#approvals-in-telegram-slack-and-discord)). |
| `block` | The tool never runs. Blocked in both columns, it is not shown to the agent at all. Blocked in one column, a call there is refused: in a chat the agent says the action is blocked, and in a Scheduled Task it finishes the rest and writes in its report that the action is blocked in autopilot and can be asked for in chat. |

Each tool belongs to one category, set by its `readonly` and `destructive` flags on [Detail](#post-agentconnectordetail). The category's values are the defaults:

| Category | Its tools | `chat` | `autopilot` |
|----------|-----------|--------|-------------|
| `read` (Read-only) | `readonly: true` | `allow` | `allow` |
| `create` (Create and send) | neither `readonly` nor `destructive` | `ask` | `allow` |
| `change` (Change and delete) | `destructive: true` | `ask` | `allow` |

So by default a person approves each create, send, change or delete in a chat, and the agent's Scheduled Tasks do them without asking. To have a Scheduled Task ask too, set the column to `ask` with [ConnectorSetPermissions](#post-useragentconnectorsetpermissions); `block` stops it there.

A connector can set its own default for a tool. Each tool's `category` and `defaults` are on [List](#post-agentconnectorlist) and Detail. These connectors have defaults of their own:

- **Wiro AI Models** (`wiro`): `run_model` and `upload_file` are `allow` in both columns: the agent's spend limit and Model Access already govern its model runs, and an upload spends nothing. `cancel_task` and `kill_task` follow Change and delete, and its other tools only read.
- **Reddit** (`reddit`): `submit_post`, `add_comment`, `edit_text` and `delete_item` are `allow` in both columns. Reddit's requests are not kept, so no approval card could show them.

A tool's value is the first one set of: its own value on the connection, its category's value on the connection, the connector's default for the tool, and its category's default. A connector on a vendor's own MCP server lists its tools after its first connect. Until then, each of its tools without a value of its own or a default of the connector's follows the connection's Change and delete values.

The agent's Approval Policy (`cs-approval-policy`) decides whether what the agent makes on an outside service, such as a post or a newsletter, goes out as a draft that waits for a person's yes or is published at once. It is not a connector permission: the permissions decide whether a connector action runs, waits for an approval or is blocked, and neither replaces the other.

Studio and the Workflow Agent have no permissions or approvals: they never show an approval card, and ConnectorPermissions and ConnectorSetPermissions refuse them.

### Permissions and approvals at a glance

| Step | Call | What you get |
|------|------|--------------|
| 1. Read the permissions | [`POST /UserAgent/ConnectorPermissions`](#post-useragentconnectorpermissions) | Each category's and each tool's values in both columns, and the cards waiting that came from Scheduled Tasks, channels or the agent's own work. |
| 2. Change them | [`POST /UserAgent/ConnectorSetPermissions`](#post-useragentconnectorsetpermissions) | The new values. The agent restarts, unless every change only turns `ask` into `allow`. |
| 3. The agent asks | None: the card arrives in the chat | An `approval` block in the timeline of a message, in [History](/docs/agent-messaging#post-useragentmessagehistory), [Detail](/docs/agent-messaging#post-useragentmessagedetail) and on the [WebSocket](/docs/agent-websocket). See [How an approval works](#how-an-approval-works). In Telegram, Slack and Discord, a question at the end of the agent's reply. |
| 4. Answer the card | [`POST /UserAgent/Message/ApprovalCardAct`](#post-useragentmessageapprovalcardact), or a [reply](#answering-with-a-reply) | The card's new state, and a turn queued in the same chat that tells the agent. Answer the card with ApprovalCardAct, or reply `yes`, `always` or `no` in the chat; in Telegram, Slack and Discord, answer the agent's question there. |
| 5. The agent goes on | [The resume turn](#the-resume-turn) | The approved call runs once, and the agent's answer arrives as the chat's next message. |

### **POST** /UserAgent/ConnectorPermissions

What one connection may do without asking, per category and per tool, in both columns. Any connection of the agent, whatever its `status`. The agent's owner or an admin of the agent's team (a team member gets code `97`, anyone else `96`).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | The agent. |
| `slug` | string | Yes | The connector. |

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/ConnectorPermissions" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "slug": "wordpress"
  }'
```

##### Response

```json
{
  "result": true,
  "errors": [],
  "connector": { "slug": "wordpress", "title": "WordPress", "toolscached": true, "catalogstatus": "active" },
  "permissions": {
    "categories": [
      { "key": "read", "tools": 6, "chat": { "value": "allow", "mixed": false }, "autopilot": { "value": "allow", "mixed": false }, "chosen": {} },
      { "key": "create", "tools": 3, "chat": { "value": "ask", "mixed": false }, "autopilot": { "value": "allow", "mixed": false }, "chosen": {} },
      { "key": "change", "tools": 4, "chat": { "value": "ask", "mixed": false }, "autopilot": { "value": "allow", "mixed": false }, "chosen": {} }
    ],
    "tools": [
      {
        "name": "get_site",
        "title": "Get the WordPress site and the connected user",
        "description": "The connected WordPress site (name, tagline, address, time zone) and the user ...",
        "category": "read",
        "chat": "allow",
        "autopilot": "allow",
        "source": { "chat": "default", "autopilot": "default" },
        "defaults": { "chat": "allow", "autopilot": "allow" },
        "hidden": false,
        "cached": true
      },
      {
        "name": "create_post",
        "title": "Create a WordPress post or page",
        "description": "Creates a post (or page). It is a draft unless status says otherwise ...",
        "category": "create",
        "chat": "ask",
        "autopilot": "allow",
        "source": { "chat": "default", "autopilot": "default" },
        "defaults": { "chat": "ask", "autopilot": "allow" },
        "hidden": false,
        "cached": true
      },
      {
        "name": "update_post",
        "title": "Update or publish a WordPress post or page",
        "description": "Changes a post (or page): only the fields given change ...",
        "category": "change",
        "chat": "ask",
        "autopilot": "allow",
        "source": { "chat": "default", "autopilot": "default" },
        "defaults": { "chat": "ask", "autopilot": "allow" },
        "hidden": false,
        "cached": true
      }
    ],
    "unknown": { "chat": "ask", "autopilot": "allow" },
    "updatedat": null,
    "updatedby": null
  },
  "pending": []
}
```

The example is shortened: `tools` lists all 13 WordPress tools, and descriptions are longer.

| Field | Description |
|-------|-------------|
| `connector` | `{ slug, title, toolscached, catalogstatus }`. `toolscached` is `false` while a connector on a vendor's own MCP server has not listed its tools yet: then only categories can be set. |
| `permissions.categories` | One entry per category, `read`, `create` and `change`, in that order: `tools` (how many tools it has), `chat` and `autopilot` (`{ value, mixed }`: the value its tools share, or `value: null` with `mixed: true` when they differ), and `chosen`, the connection's own value per column (`{}` when it has none). |
| `permissions.tools` | Every tool the connection has values for: `name`, `title`, `description`, `category`, its values `chat` and `autopilot`, `source` (where each value comes from: `tool`, its own value; `category`, its category's value on the connection; `catalog`, the connector's default for the tool; `default`, the category's default; `unknown`, the connection's Change and delete value), `defaults` (the values without the connection's own), `hidden` (`true` when blocked in both columns: the agent doesn't see it) and `cached` (`false` for a name the connector doesn't list yet, such as a tool its vendor added later that already has a value of its own; it reads `change`). |
| `permissions.unknown` | What a tool the connector doesn't list yet gets in each column: the connection's Change and delete values. |
| `permissions.updatedat`, `permissions.updatedby` | When the connection's values last changed (Unix seconds) and the account that changed them, or `null` when they never did. |
| `pending` | The cards for this connector still waiting that have a message of their own: the ones Scheduled Tasks, channel conversations and the agent's own work asked for (see [How an approval works](#how-an-approval-works)), newest first, at most 20. Each is `{ cardid, messageguid, tool, tooltitle, origin, createdat, expiresat, args, argspreview, argsbytes, argsredacted, toolcached }`, as on [the card](#the-approval-block). Answer one with [ApprovalCardAct](#post-useragentmessageapprovalcardact) and its `messageguid` and `cardid`. A card on a person's own message is not listed: it is in that chat. A card asked in a Telegram, Slack or Discord conversation (`origin.kind` `"channel"`) is listed read-only: it is answered only there, and ApprovalCardAct refuses it. |

Studio and the Workflow Agent have no permissions: for them ConnectorPermissions answers `result: false` with `This agent's connectors are fixed.`

### **POST** /UserAgent/ConnectorSetPermissions

Changes what one connection may do without asking. The agent's owner or an admin of the agent's team, as for ConnectorPermissions.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | The agent. |
| `slug` | string | Yes | The connector. It needs a connection, whatever its `status`. |
| `reset` | boolean | No | `true`: drop every value of the connection's own first, so each tool goes back to its default. |
| `categories` | object | No | `{ <category>: { chat?, autopilot? } }`, each `allow`, `ask`, `block`, or `null` to drop the connection's own value. Setting a category's column also drops that column from the values of its tools. |
| `tools` | object | No | `{ <tool name>: { chat?, autopilot? } }`, the same values, for one tool. A name the connection doesn't list is refused. At most 500 tools have their own values. |

Send at least one of `reset`, `categories` and `tools`. They apply in that order, so a tool's value sent in the same call as its category's stays.

To have Create and send ask in Autopilot too, so that a Scheduled Task waits for a person before it creates or sends anything, and to block `api_request` in both columns so the agent no longer sees it:

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/ConnectorSetPermissions" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "slug": "wordpress",
    "categories": { "create": { "autopilot": "ask" } },
    "tools": { "api_request": { "chat": "block", "autopilot": "block" } }
  }'
```

##### Response

```json
{
  "result": true,
  "errors": [],
  "applied": 1,
  "restart": "scheduled",
  "permissions": {
    "categories": [
      { "key": "read", "tools": 6, "chat": { "value": "allow", "mixed": false }, "autopilot": { "value": "allow", "mixed": false }, "chosen": {} },
      { "key": "create", "tools": 3, "chat": { "value": "ask", "mixed": false }, "autopilot": { "value": "ask", "mixed": false }, "chosen": { "autopilot": "ask" } },
      { "key": "change", "tools": 4, "chat": { "value": null, "mixed": true }, "autopilot": { "value": null, "mixed": true }, "chosen": {} }
    ],
    "tools": [
      {
        "name": "create_post",
        "title": "Create a WordPress post or page",
        "description": "Creates a post (or page). It is a draft unless status says otherwise ...",
        "category": "create",
        "chat": "ask",
        "autopilot": "ask",
        "source": { "chat": "default", "autopilot": "category" },
        "defaults": { "chat": "ask", "autopilot": "allow" },
        "hidden": false,
        "cached": true
      },
      {
        "name": "api_request",
        "title": "Send a request to the WordPress API",
        "description": "Sends one request to the WordPress API with the connection's credentials ...",
        "category": "change",
        "chat": "block",
        "autopilot": "block",
        "source": { "chat": "tool", "autopilot": "tool" },
        "defaults": { "chat": "ask", "autopilot": "allow" },
        "hidden": true,
        "cached": true
      }
    ],
    "unknown": { "chat": "ask", "autopilot": "allow" },
    "updatedat": 1795390600,
    "updatedby": "ada-uuid"
  }
}
```

| Field | Description |
|-------|-------------|
| `applied` | `1` when something changed, `0` when the values were already so: then nothing restarts. |
| `restart` | `scheduled` (the running agent restarts to load the change), `none` (the agent isn't running, the connection isn't `connected`, or every change only turned `ask` into `allow`, which a running agent uses at once) or `failed` (the change is saved, but the agent could not restart: it applies at the agent's next start). |
| `permissions` | The connection's permissions after the change, as on [ConnectorPermissions](#post-useragentconnectorpermissions). |

Each change also writes a `CONNECTOR_PERMISSIONS_SET` row to the agent's [activity log](/docs/agent-logs#who-did-what-rows). The refusals, with nothing saved:

| Message | Why |
|---------|-----|
| `Send reset, categories or tools.` | None of the three was sent. |
| `reset is true or false.` | `reset` isn't a boolean. |
| `categories takes read, create and change.` | Another key in `categories`. |
| `Each category and tool takes chat and autopilot.` | Another key in a category's or a tool's values. |
| `A permission is allow, ask or block.` | Another value. |
| `<name> is not one of <Title>'s tools.` | A tool the connection doesn't list. |
| `<Title>'s tools are listed after its first connection, so only its categories can be set now.` | A tool, on a connector that hasn't listed its tools yet. |
| `<Title> already has 500 action overrides.` | More than 500 tools would have their own values. |
| `<Title> is no longer offered.` | The connector left the catalog. |
| `This connector is not connected to the agent.` | The agent has no connection for this slug. |
| `This agent's connectors are fixed.` | Studio and the Workflow Agent. |

### How an approval works

When the agent calls a tool whose value is `ask`, the call waits, and Wiro adds an approval card for exactly that call: the same tool with the same arguments. The agent tells the person what is waiting and ends its reply; a Scheduled Task finishes the rest of its work and writes in its report what is waiting. Where the card goes depends on where the call came from:

| The call came from | The card is | It arrives live as |
|--------------------|-------------|--------------------|
| A message sent with `Message/Send`, from your app or Wiro's web chat | On that message: an `approval` block in its `timeline` | `agent_timeline_delta` on the message's `agenttoken` |
| A Scheduled Task, the work before and after a voice call, or the agent's own work | On a message of its own in the owner's chat (below) | `agent_message_inserted` on the session's stream, then `agent_message_block` each time the card changes (see [Following a session](/docs/agent-websocket#following-a-session)) |
| A conversation on the agent's Telegram, Slack or Discord channel | Asked as a question in that conversation and answered there (see [Approvals in Telegram, Slack and Discord](#approvals-in-telegram-slack-and-discord)). The card is also kept on a message of its own in the owner's chat, read-only | As in the row above |

Such a card has a message of its own, sent as the agent's owner, with an empty `content`, a `response` such as `Approval needed: Create a WordPress post or page in WordPress.` and `metadata.type` `"system"`. Wiro puts it in the session of the owner's most recent message sent in Wiro's web chat (on a team agent whose sessions are shared, the team's most recent); messages sent with a project API key don't count. Without one, it goes to the agent's `approvals` session: read it with [`Message/History`](/docs/agent-messaging#post-useragentmessagehistory) and `sessionkey: "approvals"`, and keep that key for it. [ConnectorPermissions](#post-useragentconnectorpermissions) lists these cards under `pending`, so the agent's admins can answer them from there too (a card asked in Telegram, Slack or Discord is listed there read-only).

By default a Scheduled Task creates, sends, changes and deletes without asking, so it gets a card only on a connection that sets Autopilot to `ask`, such as the one in the [ConnectorSetPermissions](#post-useragentconnectorsetpermissions) example. There, a Scheduled Task's card, as History returns its message in the `approvals` session:

```json
{
  "guid": "f6a7b8c9-d0e1-4f23-a456-789abcdef012",
  "uuid": "ada-uuid",
  "content": "",
  "response": "Approval needed: Create a WordPress post or page in WordPress.",
  "timeline": [
    {
      "blockid": "a:q9w8e7r6t5y4",
      "type": "approval",
      "callindex": 1000001,
      "contentindex": 0,
      "text": null,
      "approval": {
        "v": 1,
        "id": "q9w8e7r6t5y4",
        "kind": "approval",
        "connector": "wordpress",
        "title": "WordPress",
        "tool": "create_post",
        "tooltitle": "Create a WordPress post or page",
        "modeltool": "wordpress__create_post",
        "category": "create",
        "columns": ["autopilot"],
        "column": "autopilot",
        "origin": { "kind": "task", "task": "cs-cron-weekly-post", "tasktitle": "Weekly Post" },
        "connectedat": 1795390000,
        "argshash": "a69d47264c7cb3b12dab175f55db0eb439adb33efe6a4c6eaaeee062a5ec7b05",
        "args": { "title": "What we shipped this week", "content": "<p>Three updates landed this week.</p>", "status": "publish" },
        "argspreview": null,
        "argsbytes": 107,
        "argsredacted": false,
        "always": { "chat": true, "autopilot": true },
        "requestedby": "ada-uuid",
        "createdat": 1795403600,
        "expiresat": 1795490000,
        "status": "pending",
        "toolcached": true
      },
      "phase": "end",
      "version": 1,
      "startedat": 1795403600,
      "updatedat": 1795403600
    }
  ],
  "status": "agent_end",
  "metadata": { "type": "system" },
  "createdat": 1795403600
}
```

(Shortened: the message has the other fields of a History row too.) `always` reads `{ "chat": true, "autopilot": true }`: on this connection `create_post` asks in both columns, so Always allow would let it run without asking in both. The same card is in ConnectorPermissions' `pending` for `wordpress`:

```json
"pending": [
  {
    "cardid": "q9w8e7r6t5y4",
    "messageguid": "f6a7b8c9-d0e1-4f23-a456-789abcdef012",
    "tool": "create_post",
    "tooltitle": "Create a WordPress post or page",
    "origin": { "kind": "task", "task": "cs-cron-weekly-post", "tasktitle": "Weekly Post" },
    "createdat": 1795403600,
    "expiresat": 1795490000,
    "args": { "title": "What we shipped this week", "content": "<p>Three updates landed this week.</p>", "status": "publish" },
    "argspreview": null,
    "argsbytes": 107,
    "argsredacted": false,
    "toolcached": true
  }
]
```

A card is answered with its buttons in Wiro's web chat, with [ApprovalCardAct](#post-useragentmessageapprovalcardact), or with a typed `yes`, `always` or `no` in its chat (see [Answering with a reply](#answering-with-a-reply)). Approvals work whatever the agent's [Setup From Chat](/docs/agent-messaging#setup-from-chat) setting.

### Approvals in Telegram, Slack and Discord

Telegram, Slack and Discord have no buttons. When an action needs approval in a conversation on the agent's channel, the agent asks in text there, and the person's answer in that conversation allows the action once or declines it.

**The question.** The agent answers as usual, says in a sentence that the action needs approval, and ends its reply. Wiro adds the question to the end of that reply, and to the end of each of its messages when the agent sends several, so the reply always ends with it. Wiro writes the question from the card, never the agent: the action and the connector, then the whole request, exactly as the card holds it. A request over 64 KB shows its stored start and its size, and Reddit's request is hidden under its data terms. A long question comes in several messages. A Telegram user reads:

```text
I need your OK before I publish it.

Approval needed
Create a WordPress post or page in WordPress
{
  "content": "Big discounts all week.",
  "status": "publish",
  "title": "Summer sale"
}
Reply "yes" to allow it once, or "no" to decline it. It expires in 24 hours.
```

The first line is the agent's. In the app, `Approval needed` is bold and the request is a code block.

| Part | What it says |
|------|--------------|
| A request | `<tooltitle> in <title>` and the request in a code block. Over 64 KB: `<tooltitle> in <title> (a long request, <size> KB; its start:)` and the stored start. Reddit: `<tooltitle> in <title>: the request is hidden under Reddit's data terms.` |
| One action | `Approval needed`, the request, then `Reply "yes" to allow it once, or "no" to decline it. It expires in 24 hours.` |
| Several actions | `Approval needed for <N> actions`, each request after its number (`1.`, `2.`, ...), then `Reply "yes" and the action's number to allow it once, one per message, for example "yes <n>". Reply "no" and its number to decline one, or "no" to decline them all. They expire in 24 hours.`, `<n>` being the first number. |
| Actions still waiting after one ran | At the end of the agent's reply to a `yes`: `Still waiting for your answer`, and each waiting action under the number it was first asked with. |
| In a group | One more line. Telegram and Discord: `In a group, reply to this message or mention the agent.` Slack: `In a channel, mention the agent in your answer.` |
| When they expire | `in 24 hours`, `in about <h> hours`, `in about 1 hour` or `in less than an hour`, from the action that expires first. |
| A request the conversation can't show | `An action is waiting for approval, but its request can't be shown in this chat, so it can't be approved here.` |
| A seventh action | `Another action is waiting for approval. Ask the agent again once these are answered.` A question holds six numbers. |

**Answering.** The whole message is the answer: at most four words and no question mark, with courtesy words such as `please` or `thanks` allowed. `yes` (or `evet`, `ok`, `go ahead`, `👍` and the other approval words of [Answering with a reply](#answering-with-a-reply)) allows the action once, and `no` (or `hayır`, `cancel` and the other refusal words) declines it. With several actions, add the number, as in `yes 2` or `no 1`, one action per message; `no` alone declines them all. An action keeps its number until it is answered, also when the agent lists it again. `always` (or `her zaman`) allows the action once too: Always allow is set in the connector's Permissions, never in a chat app.

| Reply | What the person sees |
|-------|----------------------|
| `yes`, or `yes 2` | The agent does the action right away in the same conversation, and its reply starts with `Allowed once: <tooltitle> in <title>.` After `always`, `A reply in this chat allows a call only once. An agent admin can allow it for good in the connector's permissions.` follows. |
| `no` | `Declined: <tooltitle> in <title>. The agent won't do it unless you ask again.` With several actions, `Declined: <n>. <tooltitle> in <title>.` for each, then `The agent won't do them unless you ask again.` |
| `no 2` | `Declined: 2. <tooltitle> in <title>.`, then `Action 1 still waits for your answer.` or `Actions 1 and 3 still wait for your answer.` when others wait. |
| `yes` while several actions wait | `<N> actions are waiting. Reply "yes" with the action's number, for example "yes <n>", or "no" to decline them all.` |
| A number no waiting action has | `There is no action <n> waiting. Reply "yes" or "no" with the number of an action that waits: <n1>, <n2> or <n3>.` (the numbers that wait), or `There is no action <n> waiting. Reply "yes" or "no".` when one waits. |
| `yes` while the agent is still replying in that conversation | `The agent is still replying in this chat. Answer again when it's done.` The question stays, with its numbers. A `no` is taken at any time. |
| `yes` while the agent can't take a turn | The sentence the agent answers a message with at that time, such as `This agent's plan usage and its owner's balance are used up.` or `This agent has no active plan, so it paused.` Nothing is allowed. |
| An action that can't be answered any more | Wiro's sentence, as ApprovalCardAct gives it: `This approval expired. Ask the agent again.`, `This approval was already answered.`, `This action is blocked now. Change it in the connector's permissions.` or `This approval was asked in another chat.` The action leaves the question. |
| An answer that could not be saved | `Your answer could not be saved right now. Try again in a minute.` The question stays. |

Only the allowed action's turn is billed, as any turn is; the other answers start no agent turn and cost nothing.

**After the answer.** After `yes`, the agent does the action in that conversation with exactly the request the question showed, and replies there with the result. The approval is used once, within an hour. After `no`, nothing runs; the next time the agent needs the action, it asks again.

**Who answers.** In a direct chat, that person. In a group, a Slack channel or a thread, any member allowed to talk to the agent there, by mentioning the agent or, in Telegram and Discord, by replying to the question. A question belongs to its conversation: an answer in another conversation, another person's direct chat included, never answers it.

**Only an answer right after the question counts.** Anything else said to the agent first sets the question aside (a `/command` doesn't), and so does anything sent into that conversation after the question, such as a Scheduled Task's report or another message of the agent's. So does a restart of the agent. The action keeps waiting: when the agent makes the same call again in that conversation, it asks again with the same card.

**Expiry.** A question lasts as long as its card: 24 hours. An answer after that gets `This approval expired. Ask the agent again.`, and the agent asks again with a new card when the action is still wanted. An approved action runs within the hour.

**Work with no person in the conversation.** A Scheduled Task, the work before and after a voice call and the agent's own work have nobody to ask, even when they post their results to Telegram, Slack or Discord: their cards go to the owner's chat as approval cards, as described above.

**In the agent's chat, in Permissions and over the API.** These approvals show read-only. The card is kept on a message of its own in the owner's chat, as described above, with `origin` `{ "kind": "channel", "channel": "telegram" }` (or `slack`, `discord`). Wiro's web chat shows it with no buttons, and ConnectorPermissions lists it under `pending`. While it waits, the block's card reads:

```json
"approval": {
  "v": 1,
  "id": "a1b2c3d4e5f6",
  "kind": "approval",
  "connector": "wordpress",
  "title": "WordPress",
  "tool": "create_post",
  "tooltitle": "Create a WordPress post or page",
  "modeltool": "wordpress__create_post",
  "category": "create",
  "columns": ["chat"],
  "column": "chat",
  "origin": { "kind": "channel", "channel": "telegram" },
  "connectedat": 1795390000,
  "argshash": "c1bf959322778d0a4db6aa6013b137d9dd6f29467770e60c02182e7e83c97ee0",
  "args": { "content": "Big discounts all week.", "status": "publish", "title": "Summer sale" },
  "argspreview": null,
  "argsbytes": 78,
  "argsredacted": false,
  "always": { "chat": true, "autopilot": false },
  "requestedby": "ada-uuid",
  "createdat": 1795400300,
  "expiresat": 1795486700,
  "status": "pending",
  "toolcached": true
}
```

Answered in the conversation, it reads `allowed` or `declined`, with `actedat` and `actedvia`, the app it was answered in, and no `actedby`:

```json
"status": "allowed",
"toolcached": true,
"actedat": 1795400420,
"actedvia": "telegram"
```

[ApprovalCardAct](#post-useragentmessageapprovalcardact) refuses it before anything changes:

```json
{
  "result": false,
  "errors": [{ "code": "approval_in_channel", "message": "This approval is answered in the Telegram chat it was asked in." }],
  "approval": { "id": "a1b2c3d4e5f6", "origin": { "kind": "channel", "channel": "telegram" }, "status": "pending" }
}
```

(`approval` shortened.) Show such a card without buttons, with `Answered in the Telegram chat it was asked in.` while it waits, and `Allowed in the Telegram chat.` or `Declined in the Telegram chat.` once it is answered. It has no resume turn in the owner's chat: the person's `yes` runs as the turn in its conversation. Once the approved call ran, the card gets `usedat` and its block version `3`, as any card.

In MCP clients, `answer_agent_approval` returns that refusal and says the card is answered in its chat, and the lists of waiting cards mark it `Answered in the Telegram chat it was asked in.`, with no step to answer it.

### Answering with a reply

A person can also answer a card by typing `yes`, `always` or `no` in the chat the card is in: in your own app or in Wiro's web chat. Wiro answers the reply itself, exactly as the card's buttons would, and the agent takes no turn for it.

**What counts.** Only a person's own message, sent with [`Message/Send`](/docs/agent-messaging#post-useragentmessagesend) in the card's chat: from your app with your project API key (MCP clients send one too) or from Wiro's web chat. Text the agent writes, what it reads (a page, an email, a tool's result) and messages in Telegram, Slack or Discord never answer a card here; a card asked in those apps is answered there (see [Approvals in Telegram, Slack and Discord](#approvals-in-telegram-slack-and-discord)). A message with attachments or over 2,000 characters is an ordinary message. Approvals work whatever the agent's [Setup From Chat](/docs/agent-messaging#setup-from-chat) setting says.

**Which cards.** The cards of the agent's latest reply in the same `sessionkey`, as History shows that session to the sender. Replies Wiro answers itself and model switches don't count as replies, and a card a Scheduled Task left in the session is the latest reply too, so its owner can answer it there. Once another message comes after the card, such as a Scheduled Task's report, a new message or the turn an approval started, the card is on an earlier message: a reply reaches it through Wiro's listing of the session's waiting cards, and only while no approval card of the latest reply is `pending` and that reply is the turn an approval started or one in which the agent asked again for a call whose card still waits (see [Cards on earlier messages](#cards-on-earlier-messages)). The card's buttons and ApprovalCardAct answer it either way. A reply works until the card's `expiresat`, also while the agent is stopped or restarting.

**The words.** The whole message is the reply: at most four words and 200 characters, no question mark and no attachment. Case, accents and other punctuation don't matter:

| Kind | Words |
|------|-------|
| Allow once | `yes`, `y`, `yeah`, `yep`, `yup`, `ok`, `okay`, `sure`, `approve`, `approved`, `confirm`, `confirmed`, `apply`, `lgtm`, `do it`, `go ahead`, `go for it`, `sounds good`, `looks good`, `please do`, `of course`, `evet`, `e`, `tamam`, `tamamdır`, `olur`, `onay`, `onayla`, `onaylıyorum`, `onayladım`, `uygula`, `kabul`, `kabul ediyorum`, `ja`, `oui`, `si`, `sim`, `da`, `hai`, `👍`, `✅`, `✔` |
| Always allow | `always`, `always allow`, `hep`, `her zaman`, alone or with allow-once words, as in `evet her zaman` or `yes always` |
| Decline | `no`, `n`, `nope`, `nah`, `cancel`, `stop`, `don't`, `do not`, `never mind`, `not now`, `hayır`, `yok`, `iptal`, `vazgeç`, `vazgeçtim`, `istemiyorum`, `nein`, `non`, `não` |
| Courtesy, allowed next to any of them | `please`, `pls`, `plz`, `thanks`, `thx`, `ty`, `thank you`, `lütfen`, `teşekkürler`, `teşekkür ederim`, `sağol`, `sağolun`, `bitte`, `danke`, `merci`, `gracias`, `por favor` |
| A card number | One number from 1 to 6, as in `yes 2`, `no 1`, `#2 no`, `yes card 2`, `evet 2` or `her zaman 3` |

A message that mixes kinds, such as `always no`, or holds any other word, such as `allow`, `decline` or `reddet`, is an ordinary message for the agent.

**What a reply does.**

| Reply | What happens |
|-------|--------------|
| `yes` in Wiro's web chat, with one card waiting and no setup card beside it | The card on screen is allowed once. |
| `yes` sent with your project API key | The first `yes` answers nothing: Wiro answers with its listing of the waiting cards, each with its exact request (below). Once a listing showed the card, `yes` (one card listed) or `yes N` allows it once. |
| `yes` while several cards wait, or a setup card waits beside the approval card | The listing; nothing is answered. A plain reply never picks one of two cards. |
| `yes N` | Card N is allowed once when the newest listing of that reply showed it as N; otherwise the listing again. |
| `always`, `always N` | As `yes` and `yes N`, but Always allow when the agent's owner or an admin of its team sends it in Wiro's web chat (see who may answer, below). |
| `no` | Every waiting approval card of the reply is declined, and its setup cards are turned down where Setup From Chat allows the message. It is taken at any time, while the agent is still replying too. |
| `no N` | Card N is declined when the newest listing showed it as N; otherwise the listing. |
| A reply that needs the listing, while the agent is still replying | `The agent is still replying. Answer again once its reply is done.` Nothing is listed or answered. A `no`, and a `yes` under the web chat's lone card, need no listing. |
| `yes` or `always` when the reply's approval cards have all expired | Each card reads `expired`, and the answer is `This approval expired. Ask the agent again.` A `yes` that can apply a setup card of that reply goes to the setup card instead. |
| A number that is a setup card's | The setup card's own rules: `yes N` applies or lists it (see [Approving a setup card](/docs/agent-messaging#approving-setup-cards)), and `no N` is an ordinary message. |
| Any reply while no approval card of the latest reply is `pending` | When cards still wait on earlier messages of the session, the latest reply is the turn an approval started or one in which the agent asked again for a call whose card still waits, and no setup card is pending on it, a reply answers those cards once Wiro has listed them (see [Cards on earlier messages](#cards-on-earlier-messages)). Otherwise an ordinary message, such as an `ok` to the agent's own question, or a [setup reply](/docs/agent-messaging#approving-setup-cards). |

One reply answers one approval. When it starts the agent's turn, that turn becomes the chat's latest reply, so the other cards of the reply are then on an earlier message: once the turn is done, a `yes` lists them (below), and their buttons and ApprovalCardAct still answer them.

<a id="cards-on-earlier-messages"></a>

**Cards on earlier messages.** A card keeps waiting after another message comes, and when the agent asks again in that chat for a call whose card still waits, it gets that same card, not a new one. So a reply can reach the approval cards still waiting on earlier messages of the session, as History shows the session to the sender, never one asked in Telegram, Slack or Discord. It does only while the agent's latest reply is the turn an approval started, or a reply in which the agent asked again for a call whose card still waits on an earlier message, and while no approval card of that reply is `pending` and no setup card is pending on it. After any other latest reply, such as the agent's own question or a Scheduled Task's report, a typed reply never reaches those cards, so an `ok` to the agent's own question goes to the agent.

- The first `yes`, `always`, `yes N` or `always N` answers nothing: Wiro answers with its listing of the six newest of those cards, numbered 1 to N from the oldest, each with its exact request, as described under The listing below.
- Then `yes N`, `always N` and `no N` answer the card that listing showed as N, and a plain `yes` or `always` answers the one card it showed while that card is the only one still waiting. While more than one waits, a plain `yes` or `always` gets a new listing of the six newest still waiting.
- `no` declines every card the listing showed that still waits. Before a listing, `no` and `no N` are ordinary messages for the agent.
- Cards older than the six a listing shows keep waiting, and Wiro's `response` counts them after each answer and after a plain `no`, as in `1 older action also waits; reply "yes" again to list it.` A `yes` lists the six newest still waiting, so older cards come up as newer ones are answered.
- A listing holds until another message comes into the session, and until then a `yes` can list the cards again. After that, a reply gets a new listing only when the new latest reply is again the turn an approval started or one in which the agent asked again, and that listing can number the cards differently.
- While the turn an approval started is still running, a reply that needs the listing gets `The agent is still replying. Answer again once its reply is done.` While any other turn runs, it is an ordinary message for the agent.

**Who may answer.**

- `yes` and `no`: the agent's owner and anyone in its team who sees the chat.
- `always`: in Wiro's web chat, the agent's owner or an admin of its team gets Always allow, as with the card's button. Anyone else's `always` in the web chat allows the call once and adds `Only an agent admin can allow this for good.` Every `always` sent with a project API key allows the call once, whoever owns the key, and adds `A reply in this chat allows a call only once. An agent admin can allow it for good in the connector's permissions.` From your own UI, Always allow is [ApprovalCardAct](#post-useragentmessageapprovalcardact) with `always`.

> **Agents your customers talk to.** A message sent with your project API key acts as you, even when one of your users typed it. If people who must not approve the agent's actions write in your chat, hold back from Wiro the messages that are only these words while a card waits, and answer cards from your own UI with ApprovalCardAct.

**A setup card and an approval card on the same reply.** A plain `yes` or `always` applies and answers nothing: Wiro lists both, setup cards first, each under its number. A setup card a reply can't apply (Setup From Chat doesn't allow the message, the sender is neither the agent's owner nor an admin of its team, the card is older than 30 minutes, or it is a `connect` card that takes values or signs in) is shown without a number, with `A reply can't apply this one.` Then `yes N` acts on one card. `no` declines the approval cards and turns the setup cards down.

**The listing.** For one card, `response` reads:

```text
The agent asks to run this action. Nothing ran yet.

Card 1: Update or publish a WordPress post or page in WordPress (wordpress__update_post). Asked in this chat.
Request:
> {
>   "id": 4182,
>   "status": "publish"
> }

Reply "yes" to allow exactly this call once, or "no" to decline it.
```

- It starts with `The agent asks to run this action. Nothing ran yet.`; with several cards, `The agent asks to run these actions. Nothing ran yet.`; with setup cards, `The agent proposes setup changes and asks to run actions. Nothing is applied or run yet.`
- Each card's line is `Card <n>: <tooltitle> in <title> (<modeltool>).` and where it was asked: `Asked in this chat.`, `Asked by the scheduled task "<tasktitle>".`, `Asked by a scheduled task.` or `Asked while the agent worked on its own.` Its request follows, always whole: `Request:` and the arguments, each line quoted with a `>`; a request over 64 KB reads `Request (too long to show in full, <size> KB; its start):` and its stored start; a Reddit request reads `Request: not shown under Reddit's data terms.` A setup card is listed as in [The card listing](/docs/agent-messaging#setup-card-listing), and one a reply can't apply starts with `Also waiting:` instead of `Card <n>:`.
- It ends with `Reply "yes" to allow exactly this call once, or "no" to decline it.` for one card; with several, `To allow one, reply "yes" and its number, such as "yes <n>", one card per reply. Reply "no" and its number to decline one, or "no" to decline them all.`; with setup cards, `To act on one, reply "yes" and its number, such as "yes <n>", one card per reply. Reply "no" to turn them all down.` `<n>` is the first number listed. A listing never offers `always`.
- Numbers are places on the agent's finished reply: its setup cards first, then its approval cards (1 to 3 on a reply with no setup card). They stay the same in every listing of that reply, and a listing may skip a number. A listing comes only once the reply is finished. A listing of [cards on earlier messages](#cards-on-earlier-messages) holds the six newest, numbered 1 to N from the oldest instead, and no setup card.

**Send's answer.** As for every reply Wiro answers itself, `status` is `"agent_end"`, `agenttoken` is `null`, `response` holds Wiro's answer, and `approvalresult` says what Wiro did:

| Field | Description |
|-------|-------------|
| `approvalresult.answered` | The cards answered: one for a `yes` or an `always`, one per card for a `no`. Each is `{ cardid, messageguid, action, result, approval, summary, resume, permissions? }`: `messageguid` is the message the card is on, `action` what Wiro did (`allow`, `always` or `decline`), `approval` the card after the answer, `summary` and `resume` as [ApprovalCardAct](#post-useragentmessageapprovalcardact) answers them (an `always` that allowed once reads `Allowed once. ` and the reason), and `permissions` after an Always allow. A card that could not be answered has `result: false`, `approval` as it is now (or `null`) and `error: { code, message }`, ApprovalCardAct's refusal. |
| `approvalresult.listed` | The cards a listing showed, each `{ number, cardid, messageguid, approval }`: `messageguid` is the message the card is on. |
| `setupresult` | Only when the reply listed setup cards too, or turned them down: `{ applied: [], dismissed, failed: [], restarting: false }`. |

Both lists are empty when the agent was still replying. Sent with a project API key, the first `yes` gets the listing:

```json
{
  "result": true,
  "errors": [],
  "messageguid": "1c2d3e4f-5061-4728-899a-abbccddeeff0",
  "agenttoken": null,
  "status": "agent_end",
  "response": "The agent asks to run this action. Nothing ran yet.\n\nCard 1: Update or publish a WordPress post or page in WordPress (wordpress__update_post). Asked in this chat.\nRequest:\n> {\n>   \"id\": 4182,\n>   \"status\": \"publish\"\n> }\n\nReply \"yes\" to allow exactly this call once, or \"no\" to decline it.",
  "content": "yes",
  "approvalresult": {
    "answered": [],
    "listed": [
      {
        "number": 1,
        "cardid": "k3v9q2m7x1pd",
        "messageguid": "d4e5f6a7-b8c9-4d0e-8f12-3456789abcde",
        "approval": { "id": "k3v9q2m7x1pd", "tool": "update_post", "args": { "id": 4182, "status": "publish" }, "status": "pending" }
      }
    ]
  }
}
```

The second `yes` allows the call once:

```json
{
  "result": true,
  "errors": [],
  "messageguid": "2d3e4f50-6172-4839-9aab-bccddeeff001",
  "agenttoken": null,
  "status": "agent_end",
  "response": "✅ Allowed once: Update or publish a WordPress post or page in WordPress.\nThe agent goes on with it now.",
  "content": "yes",
  "approvalresult": {
    "answered": [
      {
        "cardid": "k3v9q2m7x1pd",
        "messageguid": "d4e5f6a7-b8c9-4d0e-8f12-3456789abcde",
        "action": "allow",
        "result": true,
        "approval": { "id": "k3v9q2m7x1pd", "status": "allowed", "toolcached": true, "actedat": 1795400120, "actedby": "ada-uuid", "resume": { "status": "queued", "messageguid": "e5f6a7b8-c9d0-4e1f-9a23-456789abcdef" } },
        "summary": "Allowed once.",
        "resume": { "status": "queued", "messageguid": "e5f6a7b8-c9d0-4e1f-9a23-456789abcdef", "agenttoken": "Wq7nR2kXv9LpT4mYb8HcJd3sFg6ZaE", "sessionkey": "user-42" }
      }
    ],
    "listed": []
  }
}
```

(`approval` shortened.) Follow the queued turn as on [The resume turn](#the-resume-turn). In Wiro's web chat, `evet` typed under the one waiting card gets this answer at once, with no listing. An `always` sent with a project API key allows once:

```json
"response": "✅ Allowed once: Update or publish a WordPress post or page in WordPress.\nA reply in this chat allows a call only once. An agent admin can allow it for good in the connector's permissions.\nThe agent goes on with it now.",
"approvalresult": {
  "answered": [
    {
      "cardid": "k3v9q2m7x1pd",
      "messageguid": "d4e5f6a7-b8c9-4d0e-8f12-3456789abcde",
      "action": "allow",
      "result": true,
      "approval": { "id": "k3v9q2m7x1pd", "status": "allowed" },
      "summary": "Allowed once. A reply in this chat allows a call only once. An agent admin can allow it for good in the connector's permissions.",
      "resume": { "status": "queued", "messageguid": "e5f6a7b8-c9d0-4e1f-9a23-456789abcdef", "agenttoken": "Wq7nR2kXv9LpT4mYb8HcJd3sFg6ZaE", "sessionkey": "user-42" }
    }
  ],
  "listed": []
}
```

A `no` while two cards wait declines both, and starts no turn:

```json
"response": "Declined: Update or publish a WordPress post or page in WordPress.\nDeclined: Create a WordPress post or page in WordPress.",
"approvalresult": {
  "answered": [
    { "cardid": "k3v9q2m7x1pd", "messageguid": "d4e5f6a7-b8c9-4d0e-8f12-3456789abcde", "action": "decline", "result": true, "approval": { "id": "k3v9q2m7x1pd", "status": "declined" }, "summary": "Declined.", "resume": null },
    { "cardid": "r5t8y2u6i9op", "messageguid": "d4e5f6a7-b8c9-4d0e-8f12-3456789abcde", "action": "decline", "result": true, "approval": { "id": "r5t8y2u6i9op", "status": "declined" }, "summary": "Declined.", "resume": null }
  ],
  "listed": []
}
```

A reply that needs the listing while the agent is still replying:

```json
"response": "The agent is still replying. Answer again once its reply is done.",
"approvalresult": { "answered": [], "listed": [] }
```

These replies cost nothing and start no agent turn; the turn an Allow starts is the agent's work, as after the card's button.

**In History and the webhook.** The reply is stored as a finished message, like every reply Wiro answers itself: History and Detail return it with `status: "agent_end"`, `agenttoken: null`, `model: null`, an empty `timeline` and `metadata.type: "setup_result"`. Its `metadata.approvalresult` keeps what Wiro did, without the cards: `answered` entries `{ cardid, messageguid, action, result, code? }` (`code` on a refusal) and `listed` entries `{ number, cardid, messageguid }`. A listing also keeps `listedfrom`, the `guid` of the agent's latest reply when it was made: the message the cards are on, or the reply that came after them for a listing of [cards on earlier messages](#cards-on-earlier-messages). A reply that started the agent's turn is stored a second before that turn, so History lists the reply first. The listing above, as History returns it:

```json
{
  "guid": "1c2d3e4f-5061-4728-899a-abbccddeeff0",
  "uuid": "ada-uuid",
  "agenttoken": null,
  "content": "yes",
  "response": "The agent asks to run this action. Nothing ran yet.\n\nCard 1: Update or publish a WordPress post or page in WordPress (wordpress__update_post). Asked in this chat.\nRequest:\n> {\n>   \"id\": 4182,\n>   \"status\": \"publish\"\n> }\n\nReply \"yes\" to allow exactly this call once, or \"no\" to decline it.",
  "status": "agent_end",
  "model": null,
  "timeline": [],
  "metadata": {
    "type": "setup_result",
    "approvalresult": {
      "answered": [],
      "listed": [{ "number": 1, "cardid": "k3v9q2m7x1pd", "messageguid": "d4e5f6a7-b8c9-4d0e-8f12-3456789abcde" }]
    },
    "listedfrom": "d4e5f6a7-b8c9-4d0e-8f12-3456789abcde"
  },
  "createdat": 1795400100
}
```

(Shortened: the message has the other fields of a History row too.) The second `yes` is stored with `"approvalresult": { "answered": [{ "cardid": "k3v9q2m7x1pd", "messageguid": "d4e5f6a7-b8c9-4d0e-8f12-3456789abcde", "action": "allow", "result": true }], "listed": [] }`. When the message was sent with a `callbackurl`, Wiro posts the answer to it right away with `status: "agent_end"`; its `metadata` holds `type: "setup_result"`, `via`, `cards`, `approvalresult` as stored and, for a listing, `listedfrom` (see [Agent Webhooks](/docs/agent-webhooks)). The turn an Allow starts calls the `callbackurl` of the card's message, if it had one, when it ends.

**The answer lines.** Wiro writes these lines in `response`, always in English, naming no site, page or link:

| Line | When |
|------|------|
| `✅ Allowed once: <tooltitle> in <title>.` | The call was allowed once. |
| `✅ Always allowed: <tooltitle> in <title>.` | An `always` from the agent's owner or an admin of its team, in Wiro's web chat, changed the tool's values. |
| `Declined: <tooltitle> in <title>.` | A card was declined, one line per card. |
| `Only an agent admin can allow this for good.` | After the allowed-once line: an `always` in the web chat from someone who is neither the agent's owner nor an admin of its team. |
| `A reply in this chat allows a call only once. An agent admin can allow it for good in the connector's permissions.` | After the allowed-once line: an `always` sent with a project API key. |
| `<Title>'s actions are listed after its first connection, so this one can't be allowed for good yet.`, `<Title> already has 500 action overrides, so this one could not be allowed for good.` | After the allowed-once line: an `always` from the agent's owner or an admin of its team that could not change the tool's values. |
| `The agent goes on with it now.` | The turn that runs the call is queued. |
| `The agent isn't running, so nothing ran. It can use this approval if it's asked again in this chat within an hour.` | The agent isn't running. |
| The sentence a [`Message/Send`](/docs/agent-messaging#post-useragentmessagesend) would refuse a turn with | The agent can't take a turn now, for its plan, a spend limit or the balance. The approval holds for an hour. |
| `1 more action is still waiting for approval. Reply "yes <n>" to allow it, or "no <n>" to decline it.`, `<N> more actions are still waiting for approval. Reply "yes" and its number to allow one, such as "yes <n>", or "no" to decline them all.` | Cards the newest listing showed still wait after an answer that started no turn. `<n>` is the number it showed for the first of them. |
| `1 more action is still waiting for approval. Reply "yes" to list it, then reply again to answer it.`, `<N> more actions are still waiting for approval. Reply "yes" to list them, then answer each by its number.` | Other cards still wait after an answer that started the agent's turn: once that turn is done, a `yes` lists them as [cards on earlier messages](#cards-on-earlier-messages). `<N>` counts the six newest at most. |
| `1 older action also waits; reply "yes" again to list it.`, `<N> older actions also wait; reply "yes" again to list them.` | After an answer or a plain `no` to [cards on earlier messages](#cards-on-earlier-messages), alone or after one of the still-waiting lines above: the cards still waiting that are older than the six a listing shows. |
| `The setup change was turned down.`, `The <N> setup changes were turned down.` | A `no` turned setup cards down too. |
| `This approval expired. Ask the agent again.`, `<Title> is not connected any more.`, `<Title> was connected again, so this approval no longer applies. Ask the agent again.`, `This action is blocked now. Change it in the connector's permissions.`, `This approval was already answered.`, `The approval could not be saved. Try again.`, `This approval card was not found.` | The card could not be answered: [ApprovalCardAct](#post-useragentmessageapprovalcardact)'s refusals. |
| `The agent is still replying. Answer again once its reply is done.` | A reply that needs the listing while the agent is still replying. |

### The approval block

A card is a timeline block of type `approval`, in the message's `timeline` on History and Detail, and in `agent_subscribed`, `agent_timeline_delta`, `agent_message_inserted` and `agent_message_block` frames. A card on a message sent from your app, as History returns it:

```json
{
  "blockid": "a:k3v9q2m7x1pd",
  "type": "approval",
  "callindex": 1000001,
  "contentindex": 0,
  "text": null,
  "approval": {
    "v": 1,
    "id": "k3v9q2m7x1pd",
    "kind": "approval",
    "connector": "wordpress",
    "title": "WordPress",
    "tool": "update_post",
    "tooltitle": "Update or publish a WordPress post or page",
    "modeltool": "wordpress__update_post",
    "category": "change",
    "columns": ["chat"],
    "column": "chat",
    "origin": { "kind": "chat" },
    "connectedat": 1795390000,
    "argshash": "6d95350045568e2684818ac6bebb0ba83894016d346ac3f93991d7acc23e7862",
    "args": { "id": 4182, "status": "publish" },
    "argspreview": null,
    "argsbytes": 30,
    "argsredacted": false,
    "always": { "chat": true, "autopilot": false },
    "requestedby": "ada-uuid",
    "createdat": 1795400000,
    "expiresat": 1795486400,
    "status": "pending",
    "toolcached": true
  },
  "phase": "end",
  "version": 1,
  "startedat": 1795400000,
  "updatedat": 1795400000
}
```

The block's `blockid` is `a:` and the card's `id`. Approval blocks sort after the message's other blocks, and a message holds at most three (`contentindex` `0` to `2`). The block's `version` is `1` while the card waits, `2` once it is answered or expired, and `3` once the approved call ran: keep the copy with the higher `version`, whichever arrives first.

| Field | Description |
|-------|-------------|
| `id` | The card's id: send it as `cardid`. |
| `connector`, `title` | The connector's slug and title. |
| `tool`, `tooltitle` | The tool's name and title. |
| `modeltool` | The name the agent calls the tool by, `<slug>__<tool>`. |
| `category` | `read`, `create` or `change`. |
| `columns` | The columns of the run that asked: `["chat"]`, `["autopilot"]` (a Scheduled Task, or the work before and after a voice call), or `["chat", "autopilot"]` for other work the agent did on its own and for the resume of a card that didn't come from a chat. |
| `column` | The column whose `ask` made the card. |
| `origin` | Where the call came from: `{ "kind": "chat" }`; `{ "kind": "channel", "channel": "telegram" }` (or `slack`, `discord`), a conversation on the agent's channel, where the card is answered (see [Approvals in Telegram, Slack and Discord](#approvals-in-telegram-slack-and-discord)); `{ "kind": "task", "task": "cs-cron-weekly-post", "tasktitle": "Weekly Post" }`, a Scheduled Task (`task` and `tasktitle` can be absent); or `{ "kind": "background" }`, work the agent did on its own, the work before and after a voice call included. |
| `connectedat` | When the connection last connected. A card made before a later connect can't be answered. |
| `argshash` | A hash of the exact request: the approval holds for this request only. |
| `args` | The exact arguments of the call, as an object. Show them before anyone answers. `null` when the request is too long or not kept. |
| `argspreview` | For a request over 64 KB (`argsbytes` over 65536): its first 4,000 characters, with `args` `null`. Show it with the request's size. Otherwise `null`. |
| `argsbytes` | The request's size in bytes. |
| `argsredacted` | `true` for a connector whose requests are not kept, such as Reddit: `args` and `argspreview` are `null`, so say the request can't be shown under the connector's data terms. |
| `always` | The columns that read `ask` when the card was made: the ones Always allow would turn into `allow`. `{ "chat": true, "autopilot": false }` means Always allow lets the tool run without asking in Chat, and it stays as it is in Autopilot. |
| `requestedby` | The account whose message asked, or the agent's owner for a card with a message of its own. |
| `createdat`, `expiresat` | When the card was made, and when it expires, 24 hours later. |
| `status` | `pending`, `allowed` (allowed once), `always` (allowed, and from now on), `declined` or `expired`. A `pending` card whose `expiresat` has passed reads as expired. |
| `toolcached` | `false` when the connector hadn't listed this action yet when the card was made (a connector on a vendor's own MCP server lists its actions after its first connect): Always allow on it allows the call once while the action is still not listed. `true` otherwise. |
| `actedat`, `actedby`, `actedvia` | Once answered: when, and the account that answered. A card answered in its Telegram, Slack or Discord conversation has `actedvia` (`telegram`, `slack` or `discord`) instead of `actedby`. An expired card has `actedat` and no `actedby`. |
| `usedat` | When the approved call ran. |
| `resume` | After an Allow or Always allow: `{ "status": "queued", "messageguid" }`, `{ "status": "not_running" }` or `{ "status": "refused" }`. See [The resume turn](#the-resume-turn). |
| `error` | Why the card expired early or why its turn could not run, in one sentence. Show it as it is. |

While a card is `pending`, show its arguments and three buttons: Allow, Always Allow and Decline. Show Always Allow only to the agent's owner and the admins of its team. A card from a Scheduled Task names where it came from; a card on a message from your app was asked for in that chat. A card whose `origin.kind` is `"channel"` gets no buttons: show `Answered in the Telegram chat it was asked in.` while it waits, and `Allowed in the Telegram chat.` or `Declined in the Telegram chat.` once `actedvia` is set.

A request over 64 KB, as its card shows it:

```json
"args": null,
"argspreview": "{\"content\":\"<h2>What we shipped</h2><p>Three updates landed this week ...",
"argsbytes": 91240,
"argsredacted": false
```

A Reddit request, which is not kept:

```json
"args": null,
"argspreview": null,
"argsbytes": 126,
"argsredacted": true
```

### **POST** /UserAgent/Message/ApprovalCardAct

Answers one approval card, with your session or your project API key.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | The agent. |
| `messageguid` | string | Yes | The `guid` of the message the card is on. |
| `cardid` | string | Yes | The card's `id`. |
| `action` | string | Yes | `allow`: this call runs, once. `always`: this call runs, and from now on the tool runs without asking in every column the card's `always` names; a `block` column stays blocked. `decline`: this call doesn't run. |

Who may answer:

- **`allow` and `decline`:** the agent's owner and anyone in the agent's team who sees the card's message in the chat. On a team agent whose sessions are private, the team's admins can also answer the cards that have a message of their own (the ones `pending` lists).
- **`always`:** the agent's owner or an admin of the agent's team, since it changes the agent's settings. Anyone else gets code `97`.
- **A card asked in Telegram, Slack or Discord:** only an answer in that conversation counts, and ApprovalCardAct refuses it with `approval_in_channel` (see [Approvals in Telegram, Slack and Discord](#approvals-in-telegram-slack-and-discord)).

The same people can answer with a typed `yes`, `always` or `no` in the card's chat instead: see [Answering with a reply](#answering-with-a-reply).

An answer works while the agent's turn is still running, and restarts nothing.

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Message/ApprovalCardAct" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "messageguid": "d4e5f6a7-b8c9-4d0e-8f12-3456789abcde",
    "cardid": "k3v9q2m7x1pd",
    "action": "allow"
  }'
```

##### Response

```json
{
  "result": true,
  "errors": [],
  "approval": {
    "v": 1,
    "id": "k3v9q2m7x1pd",
    "kind": "approval",
    "connector": "wordpress",
    "title": "WordPress",
    "tool": "update_post",
    "tooltitle": "Update or publish a WordPress post or page",
    "modeltool": "wordpress__update_post",
    "category": "change",
    "columns": ["chat"],
    "column": "chat",
    "origin": { "kind": "chat" },
    "connectedat": 1795390000,
    "argshash": "6d95350045568e2684818ac6bebb0ba83894016d346ac3f93991d7acc23e7862",
    "args": { "id": 4182, "status": "publish" },
    "argspreview": null,
    "argsbytes": 30,
    "argsredacted": false,
    "always": { "chat": true, "autopilot": false },
    "requestedby": "ada-uuid",
    "createdat": 1795400000,
    "expiresat": 1795486400,
    "status": "allowed",
    "toolcached": true,
    "actedat": 1795400120,
    "actedby": "ada-uuid",
    "resume": { "status": "queued", "messageguid": "e5f6a7b8-c9d0-4e1f-9a23-456789abcdef" }
  },
  "summary": "Allowed once.",
  "resume": {
    "status": "queued",
    "messageguid": "e5f6a7b8-c9d0-4e1f-9a23-456789abcdef",
    "agenttoken": "Wq7nR2kXv9LpT4mYb8HcJd3sFg6ZaE",
    "sessionkey": "user-42"
  }
}
```

| Field | Description |
|-------|-------------|
| `approval` | The card after the answer. Refusals carry it too, as it is now, or `null` when there is none. |
| `summary` | One sentence to show: `Allowed once.`, `Always allowed.` or `Declined.` When Always allow could not change the tool's values, the call still runs once: the card reads `allowed`, its resume turn says once, and the sentence is `Allowed once. <Title>'s actions are listed after its first connection, so this one can't be allowed for good yet.` (an action the connector hasn't listed yet), `Allowed once. <Title> already has 500 action overrides, so this one could not be allowed for good.`, or a plain `Allowed once.` when the values could not be written at that moment. |
| `resume` | What happens next, after `allow` and `always`; `null` after `decline`. See [The resume turn](#the-resume-turn). |
| `permissions` | `always` only: the tool's values after it, `{ connector, tool, chat, autopilot }`. |

The same card answered with `always` gets:

```json
"summary": "Always allowed.",
"permissions": { "connector": "wordpress", "tool": "update_post", "chat": "allow", "autopilot": "allow" }
```

Always allow changes only the columns that read `ask`, here Chat: `update_post` already ran without asking in Autopilot, and a column set to `block` stays blocked. It writes the tool's own values, as [ConnectorSetPermissions](#post-useragentconnectorsetpermissions) would, and two rows to the agent's activity log: `CONNECTOR_APPROVAL_ANSWERED` and `CONNECTOR_PERMISSIONS_SET`. Every answer writes the first, with the answer that took effect: an Always allow that allowed the call once writes only it, as `allow`.

Answered with `decline`:

```json
{
  "result": true,
  "errors": [],
  "approval": { "id": "k3v9q2m7x1pd", "status": "declined", "actedat": 1795400120, "actedby": "ada-uuid" },
  "summary": "Declined.",
  "resume": null
}
```

(`approval` shortened.) A decline starts no turn and leaves the tool's values as they are: the agent is refused the same call for the rest of that turn, and a later request asks again with a new card.

A card that can't be answered any more:

```json
{
  "result": false,
  "errors": [{ "code": "approval_expired", "message": "This approval expired. Ask the agent again." }],
  "approval": { "id": "k3v9q2m7x1pd", "status": "expired", "actedat": 1795486460 }
}
```

A card asked in a Telegram, Slack or Discord conversation, refused before anything changes:

```json
{
  "result": false,
  "errors": [{ "code": "approval_in_channel", "message": "This approval is answered in the Telegram chat it was asked in." }],
  "approval": { "id": "a1b2c3d4e5f6", "origin": { "kind": "channel", "channel": "telegram" }, "status": "pending" }
}
```

(`approval` shortened.) Four refusal codes are words, where the others are numbers:

| Code | Message | Why |
|------|---------|-----|
| `approval_in_channel` | `This approval is answered in the Telegram chat it was asked in.` (or `Slack`, `Discord`) | The card was asked in a conversation on the agent's channel, and only an answer there counts. Nothing changed. |
| `approval_expired` | `This approval expired. Ask the agent again.` | The card's 24 hours have passed. It now reads `expired`. |
| `approval_expired` | `<Title> is not connected any more.` | The connection was disconnected or isn't `connected`. The card now reads `expired` with this `error`. |
| `approval_expired` | `<Title> was connected again, so this approval no longer applies. Ask the agent again.` | The connector was connected again, signed in again or given new accounts since the card was made. |
| `approval_blocked` | `This action is blocked now. Change it in the connector's permissions.` | The tool is now `block` in a column its approved call would run in. The card now reads `expired`. |
| `approval_done` | `This approval was already answered.` | Someone answered it first: `approval` shows how. |
| `97` | `Only an agent admin can allow this for good.` | `always` from someone who is neither the agent's owner nor a team admin. |
| `96` | `Only the agent's owner and its team can answer its approvals.` | The caller isn't the agent's owner and isn't in its team. |
| `95` | `Agent not found or access denied` | No such agent. |
| `0` | `This approval card was not found.` | No card with this id on the message, or a message the caller doesn't see in the chat. |
| `0` | `This agent has no approvals.` | Studio and the Workflow Agent. |
| `0` | `action must be allow, always or decline` | Another `action`. |
| `0` | `Request parameter [messageguid] required` (or `[useragentguid]`, `[cardid]`) | A missing or malformed parameter. |
| `0` | `The approval could not be saved. Try again.` | A temporary failure: the card still waits. |

A request from outside the agent's workspace gets the same refusal as other agent calls, such as `This agent belongs to a team. Switch to the team context to access it.`

### The resume turn

After `allow` or `always`, Wiro queues a new turn in the chat the card is in: the same session, as the account whose message asked (for a card with a message of its own, the agent's owner). The turn tells the agent the call was approved; the agent makes the approved call, which now runs once, and finishes what it was doing. The turn's message holds the agent's answer, as any turn's does. `resume` says what happened:

| `resume.status` | Meaning |
|-----------------|---------|
| `queued` | The turn is queued: follow it like a turn you sent. `messageguid` is its message, `agenttoken` the token to subscribe to on the [WebSocket](/docs/agent-websocket), and `sessionkey` its session. When the card's message was sent with a `callbackurl`, Wiro calls it again when this turn ends, with this turn's `messageguid`. |
| `not_running` | The agent isn't running, so nothing ran: `message` reads `Allowed. The agent isn't running, so nothing ran. It can use this approval if it's asked again in this chat within an hour.` |
| `refused` | The agent can't take a turn now, for the reason a [`Message/Send`](/docs/agent-messaging#post-useragentmessagesend) would give, such as no active plan, a spend limit or the balance; `message` is that sentence (or `Allowed, but the agent could not be told. It can use this approval if it's asked again in this chat within an hour.`). |

Either way the approval holds for an hour: when the agent is asked again in the same chat within that hour, it can use it without a new card. `messageguid`, `agenttoken` and `sessionkey` go only to someone who reads that chat: the person whose message asked, or anyone on a team agent whose sessions are shared. A team admin answering a card in the owner's private chat gets `{ "status": "queued" }` alone.

The resume turn is a message of the session like any other, and History returns it with `metadata.type` `"approval_resume"`:

```json
{
  "guid": "e5f6a7b8-c9d0-4e1f-9a23-456789abcdef",
  "uuid": "ada-uuid",
  "agenttoken": "Wq7nR2kXv9LpT4mYb8HcJd3sFg6ZaE",
  "content": "[APPROVED] The person allowed Update or publish a WordPress post or page in WordPress (wordpress__update_post) once. ...",
  "response": "Done: the post is live at https://blog.example.com/what-we-shipped/.",
  "status": "agent_end",
  "metadata": {
    "type": "approval_resume",
    "serverProvenance": "connector_approval_resume",
    "resumecolumn": "chat",
    "approvals": [
      {
        "cardid": "k3v9q2m7x1pd",
        "connector": "wordpress",
        "title": "WordPress",
        "tool": "update_post",
        "tooltitle": "Update or publish a WordPress post or page",
        "answer": "allow",
        "messageguid": "d4e5f6a7-b8c9-4d0e-8f12-3456789abcde"
      }
    ]
  },
  "createdat": 1795400121
}
```

(Shortened; once the turn ends, `metadata` also has the finished turn's metrics.) Its `content` is Wiro's message to the agent, not a person's: don't show it as one. Show one line instead, `Allowed: <tooltitle> in <title>` (`Always allowed: ...` when `answer` is `always`), then the agent's answer. [`Message/Sessions`](/docs/agent-messaging#post-useragentmessagesessions) shows the same line as the session's `lastmessage`.

A card with a message of its own resumes in the chat where the card is, and its resume hands the agent the call's stored arguments as data. When they can't be repeated (a request over 64 KB, or Reddit's), the agent does that step again in the chat, which can ask for a new approval. The resume of a card from a Scheduled Task or the agent's own work takes the stricter of the two columns for every tool it calls (`resumecolumn: "autopilot"`), so a tool blocked in Autopilot stays blocked. A card from a chat message resumes in Chat (`resumecolumn: "chat"`). A card asked in a Telegram, Slack or Discord conversation has no resume turn here: the person's own `yes` runs as the agent's turn in that conversation, and the result is delivered there (see [Approvals in Telegram, Slack and Discord](#approvals-in-telegram-slack-and-discord)).

Once the approved call ran, the card gets `usedat` and its block version `3`. If the agent already made the call in the turn that asked, before the resume ran, the resume doesn't make it a second time.

### Expiries and limits

- A card waits 24 hours (`expiresat`). After that it reads `expired`, and the agent asks again with a new card when the action is still wanted. A question in Telegram, Slack or Discord expires with its card.
- An approval is used within an hour of the answer, in the chat the card is in, once. After that hour, the next call asks again.
- A reply answers the cards of the agent's latest reply. While none of them is `pending` and that reply is the turn an approval started or one in which the agent asked again for a call whose card still waits, it also answers the cards still waiting on earlier messages of the session, six at a time, once Wiro has listed them. The card's buttons and ApprovalCardAct answer any card.
- Connecting the connector again with new values, a new sign-in and new account choices end every card still waiting for it: each reads `expired`, with the `error` `<Title> was connected again, so this approval no longer applies. Ask the agent again.` A call that changes nothing keeps them.
- [Disconnecting](#post-useragentconnectordisconnect) deletes the connection's permissions and its waiting approvals with it. Connecting again after `reauth` keeps the permissions.
- A message holds at most three approval cards, and a connection at most 20 cards waiting or approved and not used yet. Past that, the agent tells the person what is waiting and asks no more.
- The agent can't change its own permissions or answer its own cards: ConnectorSetPermissions and ApprovalCardAct answer HTTP `403` to a request the agent makes itself, and a message the agent sends never counts as a reply.

## Wiro AI Models

<a id="the-wiro-connector"></a>

Wiro AI Models (`wiro`) gives the agent Wiro's own model and task tools, named `wiro__<tool>`, from the [Wiro MCP server](/docs/wiro-mcp-server). Its calls are the agent's own: they always act with the agent's own Wiro project key, the key the agent runs every Wiro model with (see [The agent's Wiro project](/docs/agent-credentials#the-agents-wiro-project)). So:

- The models they run are billed to the wallet of the workspace that owns that project, at each model's usual price.
- Wiro counts them as the agent's own runs: the agent's own [spend limit](/docs/spend-limits) and [Model Access](/docs/model-access) rule apply to them (the `agent` scope, on the `agent` surface), as to every model the agent runs.
- Account, agent, team and billing endpoints are refused to them, as to every call the agent makes: see the note "An agent's own calls never manage an account" under [`UserAgent/UpdateSettings`](/docs/agent-overview#post-useragentupdatesettings). The agent changes its own setup only through [setup cards](/docs/agent-messaging#setup-from-chat) that an agent admin approves.
- Its [permissions](#permissions-and-approvals) cover these tools only: by default `run_model` and `upload_file` run without asking, and `cancel_task` and `kill_task` ask in Chat and run in Autopilot. The models a Skill runs with the agent's own Wiro project, such as video creation, follow the agent's spend limit and Model Access instead.

### Its tools

The agent gets these tools of the Wiro MCP server, and no others:

| Tool | The agent calls it | What it does |
|------|--------------------|--------------|
| `search_models` | `wiro__search_models` | Searches the model catalog by keyword, category or owner. |
| `explore` | `wiro__explore` | Browses curated models, grouped by category. |
| `recommend_model` | `wiro__recommend_model` | Finds models for a goal, best matches first. |
| `get_model_schema` | `wiro__get_model_schema` | Reads a model's parameters and pricing. |
| `get_task_price` | `wiro__get_task_price` | Reads the cost of a finished task. |
| `run_model` | `wiro__run_model` | Runs a model. |
| `get_task` | `wiro__get_task` | Reads a task's status and outputs. |
| `wait_for_task` | `wiro__wait_for_task` | Keeps waiting for a task without starting another run. |
| `list_tasks` | `wiro__list_tasks` | Lists the recent model tasks the agent started. |
| `cancel_task` | `wiro__cancel_task` | Cancels a queued task. |
| `kill_task` | `wiro__kill_task` | Stops a queued or running task. |
| `upload_file` | `wiro__upload_file` | Uploads a file from a public URL, for use as a model input. |
| `search_docs` | `wiro__search_docs` | Searches the Wiro documentation. Read only. |
| `get_playbook` | `wiro__get_playbook` | Reads a step-by-step guide. Read only. |

The list can't be widened. Whatever the connector's catalog row says, Wiro gives the agent no other tool of the server, and also refuses any tool whose name has one of these words in it: `agent`, `workflow`, `billing`, `account`, `project`, `studio`, `credential`, `oauth`, `skill`, `spend`, `limit`, `access`, `wallet`, `team`, `organization`, `coupon`, `invoice`, `payment`, `key` or `user`. `tools` on [Detail](#post-agentconnectordetail) lists only the tools the agent gets.

**What the task tools reach.** `list_tasks`, `get_task`, `wait_for_task`, `get_task_price`, `cancel_task` and `kill_task` work only on the tasks the agent started, with this connector or from the agent's skills. A task anyone else started, such as another agent on the same project, a person on wiro.ai or your own backend, is not listed, and the other tools answer for it as for a task that does not exist. Your own backend, calling with an API key of the agent's workspace, still sees every task in it. On an agent several of your users share, each of them can reach the runs the agent made for the others: use one agent per customer to keep them apart.

### Connecting it

Its `credentialfields` have one field with `source: "wiro_project"`: show a picker of your projects ([`POST /Project/List`](/docs/projects)) instead of an input, and send the chosen project's id as `wiroprojectguid`. Connecting binds that project to the agent as its own Wiro project, exactly as [`CredentialProjectBind`](/docs/agent-overview#post-useragentcredentialprojectbind) does: the same checks, the project's key saved as the agent's `wiro` credential, and a `Setting saved: wiro.apikey` row (`AGENT_CREDENTIAL_SAVED`) in the agent's [activity log](/docs/agent-logs#who-did-what-rows) when the project changed. The connector and every other Wiro call of the agent always use the same project.

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/ConnectorConnect" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "slug": "wiro",
    "wiroprojectguid": "1234"
  }'
```

##### Response

```json
{
  "result": true,
  "errors": [],
  "status": "connected",
  "applied": 1,
  "restart": "scheduled",
  "useragentconnectors": [
    {
      "slug": "wiro",
      "title": "Wiro AI Models",
      "iconurl": "https://cdn.wiro.ai/uploads/agents/connector-wiro-icon-edaf64170f3a.webp",
      "category": "ai",
      "authtype": "headers",
      "transport": "streamable-http",
      "authmode": null,
      "catalogstatus": "active",
      "status": "connected",
      "connectedat": 1795390000,
      "updatedat": 1795390000,
      "tokenexpiresat": null,
      "refreshtokenexpiresat": null,
      "scope": null,
      "accounts": {},
      "wiroprojectid": "1234",
      "savedvariables": [],
      "lasterror": null
    }
  ]
}
```

- A request made with a project API key may leave `wiroprojectguid` out: that key's own project is bound. A request without either keeps the agent's own project while it is in the agent's workspace, and is refused with `wiroprojectguid is required` when the agent has none there.
- The project must be one you created, or any project of a team you are an admin of, and in the agent's workspace: a personal agent takes one of its owner's personal projects, a team agent one of its team's projects. The request must come from the agent's workspace too.
- The connector follows the agent's project: a project bound later with `CredentialProjectBind` or another `ConnectorConnect` is the one its tools use after the restart. [ConnectorList](#post-useragentconnectorlist) shows the agent's current project as `wiroprojectid`, a string.
- An agent left with no Wiro project keeps the connection, but gets no `wiro__*` tools until a project is bound again, and `wiroprojectid` reads `null`.
- Disconnecting it ([ConnectorDisconnect](#post-useragentconnectordisconnect), or a `disconnect` card) removes only the connection. The agent keeps its Wiro project, and the models its Skills run keep using it; only its `wiro__*` tools go after the restart.
- The agent's [Wiro API path list](/docs/agent-overview#post-useragentupdatesettings) (`wiroapiallowedpaths`) limits the Wiro API calls its skills make with the agent's own Wiro project; it doesn't apply to this connector's tools, which the list above fixes.
- In chat, the agent proposes a `project` card for it, which binds the project the same way: see [Project: Wiro AI Models](/docs/agent-chat-integration#project-wiro-ai-models).

### Moving the agent to another workspace

When the agent moves to a workspace its Wiro project isn't in, with [`Team/TransferAgent`](/docs/organizations-managing-teams#transferring-agents) or because its team or organization was deleted, Wiro disconnects the project from the agent and deletes the agent's Wiro AI Models connection, before the agent restarts.

The same happens without a move when the team that owns the agent's Wiro project, or that team's organization, is deleted. The team's projects then go to their creators' personal workspaces, so an agent of another workspace that ran with one of them is disconnected from it and restarted too. Only a personal agent of the project's creator keeps it.

Either way, the agent's activity log shows both: `Disconnected: wiro` (`AGENT_CREDENTIAL_REMOVED`) and `Connector disconnected: wiro` (`CONNECTOR_DISCONNECTED`, with `summary.reason` `"workspace"`). To give the agent a project again, connect Wiro AI Models with a project of the agent's workspace: that binds the project to the agent too.

## Errors

Refusals come as `result: false` with one sentence per problem in `errors`. Show the sentence: it names a field by its `label` (a `headers` connector's value by its `name`) and never repeats a value.

| Call | Message | Why |
|------|---------|-----|
| any | `Request parameter [useragentguid] required` (or `[slug]`) | A required parameter is missing. |
| `Detail` | `Connector not found.` | No such connector in the catalog. |
| `List` | `search is text of at most 100 characters.` | `search` too long. |
| `List` | `category must be one lowercase word (letters, digits or dashes, at most 40).` | A malformed `category`. |
| `ConnectorConnect` | `This connector is not available.` | The slug is not in the catalog. |
| `ConnectorConnect` | `<Label> is required.` (a `headers` connector: `<name> is required.`) | A required field has no value, sent or saved. A `provider-oauth` sign-in gets one for each of your app's keys it lacks, such as `Client ID is required. Client Secret is required.` |
| `ConnectorConnect` | `Unknown field <name>. This connector takes: <names>.` (a `headers` connector: `Unknown variable <name>. This connector takes: <names>.`) | A key in `values` the connector does not take. |
| `ConnectorConnect` | `values must be an object of field names and values.` (a `headers` connector: `values must be an object of variable names and values.`), `<Label> must be text.` | The shape of `values`. |
| `ConnectorConnect` | `<Label> must be an https address.`, `<Label> must be valid JSON.`, `<Label> must be an email address.`, `<Label> must be one of: <values>.`, `<Label> is not in the expected format.`, `<Label> must be at most <n> characters.`, `<Label> must be on one line.`, `<Label> has characters it cannot take.` | A value that fails its field's `format`, `pattern` or `maxlength` (65,536 characters at most). |
| `ConnectorConnect` | `<name> must be at most 4096 characters, on one line.`, `<name> must be a number.`, `<name> must be true or false.` | A `headers` connector's value that doesn't fit. |
| `ConnectorConnect` | The vendor's own sentence | The credential check: the vendor refused the values. Nothing was saved. |
| `ConnectorConnect` | `The vendor refused these credentials. Check them and try again.` | A key way that mints a token (Shopify) was refused. |
| `ConnectorConnect` | `The vendor could not be reached. Try again in a moment.` | The vendor did not answer the key exchange. |
| `ConnectorConnect` | `This connector signs in with your own app: send its <labels>.` | A `provider-oauth` sign-in without your app's keys, sent or saved, on a connector whose app keys are optional. Where they are `required`, each missing key gets `<Label> is required.` instead. |
| `ConnectorConnect` | `This connector connects only by signing in.` | `mode: "key"` on a connector whose `modes` is `["oauth"]`. |
| `ConnectorConnect` | `mode is oauth or key.`, `mode is only for a connector that signs in with its vendor's own OAuth.` | A wrong `mode`. |
| `ConnectorConnect` | `Invalid redirect URL` | See [The redirect URL](#the-redirect-url). |
| `ConnectorConnect` | `The sign-in address could not be made from these values.` | A value the sign-in address needs (such as Shopify's shop domain) does not fit. |
| `ConnectorConnect` | `This connector's OAuth client is not set up yet.` | An `oauth` connector whose sign-in isn't ready on Wiro's side yet. |
| `ConnectorConnect` | `The connector's sign-in server did not register a client. Try again later.` | The vendor's sign-in server refused to register a client for the sign-in. |
| `ConnectorConnect` | `This connector takes no Wiro project.` | `wiroprojectguid` on a connector whose tools run inside the agent. A connector on a vendor's own MCP server without a project field ignores it. |
| `ConnectorConnect` | `<name> comes from the agent's Wiro project: send wiroprojectguid, not a value.` | A value sent for the project field of Wiro AI Models. |
| `ConnectorConnect` | `wiroprojectguid is required: send the id of one of your projects from Project/List. A request made with a project API key may leave it out, to use that key's own project.` | Wiro AI Models with no project, from a request without a project API key, for an agent with no project of its workspace to keep. |
| `ConnectorConnect` | `wiroprojectguid must be a project's id from Project/List.` | A `wiroprojectguid` that isn't a project id. |
| `ConnectorConnect` | `Project not found. Send the id of one of your projects from Project/List: one you created, or any project of a team you are an admin of.` | A project you can't use. |
| `ConnectorConnect` | `This is a personal agent: use one of its owner's personal projects.`, `This is a team agent: use one of its team's projects.` | A project outside the agent's workspace. |
| `ConnectorConnect` | `This agent belongs to a team. Switch to the team context to access it.`, `This agent is in your personal workspace. Switch to personal context to access it.`, `This agent belongs to a different team.` | Wiro AI Models, from a request outside the agent's workspace. |
| `ConnectorConnect` | `This project's API key no longer works: the account that created it is not active, so the agent's model runs would fail. Bind another project.`, `This project's API key no longer works: the person who created it is no longer in the team, so the agent's model runs would fail. Bind another project of the team.` | The account that created the project is not active, or has left the team. |
| `ConnectorConnect` | `This project has no API key the connector can use.` | The project's key can't be used. |
| `ConnectorConnect`, `ConnectorSetAccounts` | `accounts must be an object of lists of account ids.`, `accounts has too many keys.`, `Each account id is text of at most 200 characters.` | The shape of `accounts`: at most 10 keys and 500 ids per key. |
| `ConnectorPermissions`, `ConnectorSetPermissions` | `This connector is not connected to the agent.` | The agent has no connection for this slug. |
| `ConnectorPermissions`, `ConnectorSetPermissions` | `This agent's connectors are fixed.` | Studio and the Workflow Agent, which have no permissions. |
| `ConnectorSetPermissions` | `Send reset, categories or tools.`, `categories takes read, create and change.`, `Each category and tool takes chat and autopilot.`, `A permission is allow, ask or block.`, `<name> is not one of <Title>'s tools.` | The body's shape: see [ConnectorSetPermissions](#post-useragentconnectorsetpermissions) for every refusal. |
| `ApprovalCardAct` | `This approval expired. Ask the agent again.` (code `approval_expired`), `This approval was already answered.` (`approval_done`), `This action is blocked now. Change it in the connector's permissions.` (`approval_blocked`) | The card can't be answered any more: see [ApprovalCardAct](#post-useragentmessageapprovalcardact) for every refusal. |
| `ApprovalCardAct` | `This approval is answered in the Telegram chat it was asked in.` (code `approval_in_channel`; or `Slack`, `Discord`) | A card asked in a Telegram, Slack or Discord conversation: see [Approvals in Telegram, Slack and Discord](#approvals-in-telegram-slack-and-discord). |
| any | `Something went wrong. Try again.` | A temporary failure: nothing was changed. |

The account picker refusals are under [ConnectorSetAccounts](#post-useragentconnectorsetaccounts), the callback codes under [The callback and your redirect URL](#the-callback-and-your-redirect-url), the permission and approval refusals under [Permissions and Approvals](#permissions-and-approvals), and what Deploy, `SkillsApply` and `CredentialUpsert` answer for a connector under [Connectors, Skills and Credentials](#connectors-skills-and-credentials).

## Connectors, Skills and Credentials

A connector is on while it is connected: it is never a Skill to turn on or a credential to save. The calls that take Skills or credentials refuse a connector before anything is saved, created or charged:

| Call | Refused | Answer |
|------|---------|--------|
| `POST /UserAgent/Deploy` | A connector's slug as a key of `credentials` | `Unknown credential: <key>. Connect a connector after the deploy with UserAgent/ConnectorConnect.` |
| `POST /UserAgent/Deploy` | A `skills` name that isn't a Skill | `Unknown skill: <name>.`, or for a name that starts with `int-`, `Unknown skill: <name>. Connectors are connected with UserAgent/ConnectorConnect, not turned on as skills.` |
| `POST /UserAgent/SkillsApply` | A `skills` name that isn't a Skill | `Unknown skill: <name>` |
| `POST /UserAgent/CredentialUpsert` | A row whose `credentialkey` is a connector's slug: the whole request, its other rows included | `Unknown credential: <key>. Connectors are connected with UserAgent/ConnectorConnect.` |
| `POST /Credentials/Detail` | A connector's slug as `key` | `Credential not found: <key>` (code `404`): read it with [`AgentConnector/Detail`](#post-agentconnectordetail). |

- Deploy's `skills` and `SkillsApply` take Skills (`util-*`) only. The Twilio Voice phone line is the Twilio Voice Channel (`util-twilio-channel`) Skill, with its account in the `twilio-voice` credential: see [Twilio Voice Channel](/docs/integration-twiliovoice-skills).
- Channels (Telegram, Slack, Discord, Twilio Voice) are not connectors: they keep their credentials. See [Agent Credentials](/docs/agent-credentials).
- Every OAuth app of your own lists one redirect URI, the same for every vendor: `https://api.wiro.ai/v1/AgentConnector/OAuthCallback`.

## Code Examples

The same flow in each language: list the catalog, connect Serper with its key, and read the agent's connections.

### curl

```bash
# 1. Browse the catalog (no API key needed)
curl -X POST "https://api.wiro.ai/v1/AgentConnector/List" \
  -H "Content-Type: application/json" \
  -d '{ "category": "data" }'

# 2. Connect Serper to an agent with its API key
curl -X POST "https://api.wiro.ai/v1/UserAgent/ConnectorConnect" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "YOUR_USERAGENT_GUID",
    "slug": "serper",
    "values": { "apikey": "YOUR_SERPER_API_KEY" }
  }'

# 3. Read the agent's connections
curl -X POST "https://api.wiro.ai/v1/UserAgent/ConnectorList" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "useragentguid": "YOUR_USERAGENT_GUID" }'
```

### Python

```python
import requests

API = "https://api.wiro.ai/v1"
HEADERS = {"Content-Type": "application/json", "x-api-key": "YOUR_API_KEY"}
AGENT = "YOUR_USERAGENT_GUID"

# 1. Browse the catalog (no API key needed)
catalog = requests.post(f"{API}/AgentConnector/List", json={"category": "data"}).json()
for row in catalog["agentconnectors"]:
    print(row["slug"], row["authtype"], [f["name"] for f in row["credentialfields"]])

# 2. Connect Serper with its API key
connect = requests.post(f"{API}/UserAgent/ConnectorConnect", headers=HEADERS, json={
    "useragentguid": AGENT,
    "slug": "serper",
    "values": {"apikey": "YOUR_SERPER_API_KEY"},
}).json()
if not connect["result"]:
    raise SystemExit(connect["errors"][0]["message"])
print(connect["status"], connect["restart"])  # connected scheduled

# 3. Read the agent's connections
for conn in requests.post(f"{API}/UserAgent/ConnectorList", headers=HEADERS,
                          json={"useragentguid": AGENT}).json()["useragentconnectors"]:
    print(conn["slug"], conn["status"])
```

### Node.js

```javascript
const API = 'https://api.wiro.ai/v1';
const HEADERS = { 'Content-Type': 'application/json', 'x-api-key': 'YOUR_API_KEY' };
const AGENT = 'YOUR_USERAGENT_GUID';

const post = (path, body, headers = HEADERS) =>
  fetch(`${API}${path}`, { method: 'POST', headers, body: JSON.stringify(body) }).then((r) => r.json());

// 1. Browse the catalog (no API key needed)
const catalog = await post('/AgentConnector/List', { category: 'data' }, { 'Content-Type': 'application/json' });
console.log(catalog.agentconnectors.map((row) => row.slug));

// 2. Connect Serper with its API key
const connect = await post('/UserAgent/ConnectorConnect', {
  useragentguid: AGENT,
  slug: 'serper',
  values: { apikey: 'YOUR_SERPER_API_KEY' },
});
if (!connect.result) throw new Error(connect.errors[0].message);
console.log(connect.status, connect.restart); // connected scheduled

// 3. Read the agent's connections
const list = await post('/UserAgent/ConnectorList', { useragentguid: AGENT });
for (const conn of list.useragentconnectors) console.log(conn.slug, conn.status);
```

### PHP

```php
<?php
function wiro_post(string $path, array $body, bool $withKey = true): array {
    $headers = ['Content-Type: application/json'];
    if ($withKey) $headers[] = 'x-api-key: YOUR_API_KEY';
    $ch = curl_init('https://api.wiro.ai/v1' . $path);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_POSTFIELDS => json_encode($body),
        CURLOPT_RETURNTRANSFER => true,
    ]);
    $out = json_decode(curl_exec($ch), true);
    curl_close($ch);
    return $out;
}

$agent = 'YOUR_USERAGENT_GUID';

// 1. Browse the catalog (no API key needed)
$catalog = wiro_post('/AgentConnector/List', ['category' => 'data'], false);

// 2. Connect Serper with its API key
$connect = wiro_post('/UserAgent/ConnectorConnect', [
    'useragentguid' => $agent,
    'slug' => 'serper',
    'values' => ['apikey' => 'YOUR_SERPER_API_KEY'],
]);
if (!$connect['result']) exit($connect['errors'][0]['message']);
echo $connect['status'] . ' ' . $connect['restart'] . "\n";

// 3. Read the agent's connections
$list = wiro_post('/UserAgent/ConnectorList', ['useragentguid' => $agent]);
foreach ($list['useragentconnectors'] as $conn) echo $conn['slug'] . ' ' . $conn['status'] . "\n";
```

### C#

```csharp
using System.Net.Http.Json;
using System.Text.Json;

var http = new HttpClient { BaseAddress = new Uri("https://api.wiro.ai/v1/") };
var agent = "YOUR_USERAGENT_GUID";

// 1. Browse the catalog (no API key needed)
var catalog = await (await http.PostAsJsonAsync("AgentConnector/List", new { category = "data" }))
    .Content.ReadFromJsonAsync<JsonElement>();

// 2. Connect Serper with its API key
http.DefaultRequestHeaders.Add("x-api-key", "YOUR_API_KEY");
var connect = await (await http.PostAsJsonAsync("UserAgent/ConnectorConnect", new {
    useragentguid = agent,
    slug = "serper",
    values = new { apikey = "YOUR_SERPER_API_KEY" }
})).Content.ReadFromJsonAsync<JsonElement>();
if (!connect.GetProperty("result").GetBoolean())
    throw new Exception(connect.GetProperty("errors")[0].GetProperty("message").GetString());

// 3. Read the agent's connections
var list = await (await http.PostAsJsonAsync("UserAgent/ConnectorList", new { useragentguid = agent }))
    .Content.ReadFromJsonAsync<JsonElement>();
foreach (var conn in list.GetProperty("useragentconnectors").EnumerateArray())
    Console.WriteLine($"{conn.GetProperty("slug")} {conn.GetProperty("status")}");
```

### Go

```go
package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
)

func post(path string, body any, withKey bool) map[string]any {
	data, _ := json.Marshal(body)
	req, _ := http.NewRequest("POST", "https://api.wiro.ai/v1"+path, bytes.NewReader(data))
	req.Header.Set("Content-Type", "application/json")
	if withKey {
		req.Header.Set("x-api-key", "YOUR_API_KEY")
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		panic(err)
	}
	defer resp.Body.Close()
	var out map[string]any
	json.NewDecoder(resp.Body).Decode(&out)
	return out
}

func main() {
	agent := "YOUR_USERAGENT_GUID"

	// 1. Browse the catalog (no API key needed)
	catalog := post("/AgentConnector/List", map[string]any{"category": "data"}, false)
	fmt.Println(len(catalog["agentconnectors"].([]any)), "connectors")

	// 2. Connect Serper with its API key
	connect := post("/UserAgent/ConnectorConnect", map[string]any{
		"useragentguid": agent,
		"slug":          "serper",
		"values":        map[string]string{"apikey": "YOUR_SERPER_API_KEY"},
	}, true)
	fmt.Println(connect["status"], connect["restart"])

	// 3. Read the agent's connections
	list := post("/UserAgent/ConnectorList", map[string]any{"useragentguid": agent}, true)
	for _, c := range list["useragentconnectors"].([]any) {
		conn := c.(map[string]any)
		fmt.Println(conn["slug"], conn["status"])
	}
}
```

### Swift

```swift
import Foundation

func post(_ path: String, _ body: [String: Any], withKey: Bool = true) async throws -> [String: Any] {
    var req = URLRequest(url: URL(string: "https://api.wiro.ai/v1\(path)")!)
    req.httpMethod = "POST"
    req.setValue("application/json", forHTTPHeaderField: "Content-Type")
    if withKey { req.setValue("YOUR_API_KEY", forHTTPHeaderField: "x-api-key") }
    req.httpBody = try JSONSerialization.data(withJSONObject: body)
    let (data, _) = try await URLSession.shared.data(for: req)
    return try JSONSerialization.jsonObject(with: data) as? [String: Any] ?? [:]
}

let agent = "YOUR_USERAGENT_GUID"

// 1. Browse the catalog (no API key needed)
let catalog = try await post("/AgentConnector/List", ["category": "data"], withKey: false)

// 2. Connect Serper with its API key
let connect = try await post("/UserAgent/ConnectorConnect", [
    "useragentguid": agent,
    "slug": "serper",
    "values": ["apikey": "YOUR_SERPER_API_KEY"]
])
print(connect["status"] ?? "", connect["restart"] ?? "")

// 3. Read the agent's connections
let list = try await post("/UserAgent/ConnectorList", ["useragentguid": agent])
for conn in list["useragentconnectors"] as? [[String: Any]] ?? [] {
    print(conn["slug"] ?? "", conn["status"] ?? "")
}
```

### Kotlin

```kotlin
import java.net.URI
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse

val client: HttpClient = HttpClient.newHttpClient()

fun post(path: String, json: String, withKey: Boolean = true): String {
    val builder = HttpRequest.newBuilder(URI.create("https://api.wiro.ai/v1$path"))
        .header("Content-Type", "application/json")
        .POST(HttpRequest.BodyPublishers.ofString(json))
    if (withKey) builder.header("x-api-key", "YOUR_API_KEY")
    return client.send(builder.build(), HttpResponse.BodyHandlers.ofString()).body()
}

fun main() {
    val agent = "YOUR_USERAGENT_GUID"

    // 1. Browse the catalog (no API key needed)
    println(post("/AgentConnector/List", """{"category":"data"}""", withKey = false))

    // 2. Connect Serper with its API key
    println(post("/UserAgent/ConnectorConnect",
        """{"useragentguid":"$agent","slug":"serper","values":{"apikey":"YOUR_SERPER_API_KEY"}}"""))

    // 3. Read the agent's connections
    println(post("/UserAgent/ConnectorList", """{"useragentguid":"$agent"}"""))
}
```

### Dart

```dart
import 'dart:convert';
import 'package:http/http.dart' as http;

Future<Map<String, dynamic>> post(String path, Map<String, dynamic> body, {bool withKey = true}) async {
  final res = await http.post(
    Uri.parse('https://api.wiro.ai/v1$path'),
    headers: {
      'Content-Type': 'application/json',
      if (withKey) 'x-api-key': 'YOUR_API_KEY',
    },
    body: jsonEncode(body),
  );
  return jsonDecode(res.body) as Map<String, dynamic>;
}

Future<void> main() async {
  const agent = 'YOUR_USERAGENT_GUID';

  // 1. Browse the catalog (no API key needed)
  final catalog = await post('/AgentConnector/List', {'category': 'data'}, withKey: false);
  print((catalog['agentconnectors'] as List).length);

  // 2. Connect Serper with its API key
  final connect = await post('/UserAgent/ConnectorConnect', {
    'useragentguid': agent,
    'slug': 'serper',
    'values': {'apikey': 'YOUR_SERPER_API_KEY'},
  });
  print('${connect['status']} ${connect['restart']}');

  // 3. Read the agent's connections
  final list = await post('/UserAgent/ConnectorList', {'useragentguid': agent});
  for (final conn in list['useragentconnectors'] as List) {
    print('${conn['slug']} ${conn['status']}');
  }
}
```

## Related

- [Agent Overview](/docs/agent-overview): deploy and manage agents.
- [Agent Skills](/docs/agent-skills): Skills, Custom Skills and scheduled tasks that put a connector's tools to work.
- [Agent Credentials](/docs/agent-credentials): channels and the other values an agent keeps as credentials.
- [Agent Chat Integration](/docs/agent-chat-integration): build your own chat, setup from chat included.
- [Agent Messaging](/docs/agent-messaging): the message timeline that carries approval cards.
