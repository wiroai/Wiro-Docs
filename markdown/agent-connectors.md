# Agent Connectors

Connect a Wiro agent to the services it works with: browse the connector catalog, connect a connector with its fields or its vendor's sign-in, pick the accounts it may act on, read each connection's state and disconnect it. Every call of the cycle, with its request and answer.

## Overview

A connector gives an agent the tools of one outside service: Google search through Serper, a Shopify store, Google Ads, HubSpot, a Facebook Page. Each connector is one row of Wiro's connector catalog, named by its `slug`, such as `serper`, `shopify` or `facebook-pages`. You connect a connector to one agent at a time, always with your customer's own credentials, in one of two ways:

- **Fields.** The values the vendor issues, such as an API key, an app password or a store address, sent once with `ConnectorConnect`. Wiro stores them encrypted. Where the connector has a check, Wiro first makes one read call to the vendor with them and refuses values the vendor refuses.
- **Sign-in.** The vendor's own consent screen in a browser. `ConnectorConnect` answers with an `authorizeUrl`; your customer opens it, agrees, and the vendor sends the browser back through Wiro to your page. Vendors whose sign-in needs an app of your own (the Google and Meta families, LinkedIn, TikTok, X, Reddit, Pinterest, Tumblr, Threads, HubSpot, Mailchimp, Shopify) take that app's client id and secret with the connect.

Once a connector is connected, the agent restarts and has the connector's tools, named `<slug>__<tool>`. Values and tokens are never sent back in an answer and never reach the agent's chat.

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
| 7. Disconnect | [`POST /UserAgent/ConnectorDisconnect`](#post-useragentconnectordisconnect) | The connection, its values and tokens deleted, and the agent restarts. |

### Who your customer sees

A sign-in you start with your project API key comes from your product. The vendor's consent screen shows your organization's name (else your team's name, else your account's name) and your organization's avatar when it is an https image, or, for a connector that signs in with an app of your own, that app's name and logo as you set them in the vendor's developer console. Wiro's own app signs in only from Wiro's own panel, and sign-ins started there show Wiro.

One Wiro address can still show: the redirect URI, `https://api.wiro.ai/v1/AgentConnector/OAuthCallback`, which the browser passes through on its way back to your `redirecturl`. Some vendors show it on their consent screen, and some also show the address that identifies the sign-in's client, which is on the same API host. The help text of your own app's fields names the redirect URI too, since the app must register it: if your customers must not read it there, register the OAuth app yourself and keep the own-app fields out of the forms they fill in.

Otherwise, the connector texts your customer may read (field labels, help texts, error sentences) name the vendor only.

## Authentication

| Call | API key | Who may call it |
|------|---------|-----------------|
| `AgentConnector/List`, `AgentConnector/Detail` | Not needed | Anyone. A signed-in caller gets the same answer. |
| `UserAgent/ConnectorList` | Required | The agent's owner, or a member of the agent's team. |
| `UserAgent/ConnectorConnect`, `UserAgent/ConnectorAccounts`, `UserAgent/ConnectorSetAccounts`, `UserAgent/ConnectorDisconnect` | Required | The agent's owner, or an admin of the agent's team. |
| `AgentConnector/OAuthCallback` | None | The vendor's redirect in your customer's browser. You never call it. |

Send your project API key in the `x-api-key` header, as on every other endpoint (see [Authentication](/docs/authentication)). Every answer has `result` and `errors: [{ code, message }]`; HTTP 200 with `result: false` is a refusal. The access refusals:

| Code | Message |
|------|---------|
| `95` | `User agent not found` |
| `96` | `You don't have access to this user agent` |
| `97` | `Only a team admin can perform this action on a team-owned agent.` |

## The Catalog

### **POST** /AgentConnector/List

Lists every available connector, in display order (`sortorder`, then title), at most 500 rows. Public: no API key needed.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `search` | string | No | Matches the slug, title or description, ignoring case. At most 100 characters. |
| `category` | string | No | One category, such as `social`, `ads`, `commerce`, `analytics`, `crm`, `content`, `email` or `data`. |

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
        { "key": "pages", "label": "Facebook Pages", "description": "", "multiple": true }
      ],
      "scopes": ["pages_show_list", "pages_manage_posts", "pages_read_engagement"],
      "modes": ["oauth", "key"],
      "wiroapp": false,
      "tools": [
        { "name": "list_pages", "title": "List Pages", "description": "Lists the Facebook Pages this connection can reach.", "readonly": true, "destructive": false }
      ],
      "docs": {
        "overview": "Publish posts, photos and videos to your Facebook Pages and read their engagement.",
        "revoke": "Remove the app's access in your Facebook Pages account's connected apps settings, then disconnect it here."
      },
      "sortorder": 110,
      "updatedat": 1795390000
    }
  ]
}
```

The example is shortened: real help texts are longer, and `tools` lists every tool.

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
| `tools` | The tools the agent gets, each `{ name, title, description, readonly, destructive }`. `name` is the tool's name before the slug prefix. A connector whose server lists its tools only after a sign-in can show none until its first connection. |
| `docs` | Optional public page copy: `{ overview, setup, revoke, limits }` (`setup` is a list of steps), or `null`. |
| `sortorder`, `updatedat` | Display order and the row's last change (Unix seconds). |

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
          "destructive": false
        }
      ],
      "docs": { "overview": "Google search results through Serper: organic results, answer box and related questions." },
      "sortorder": 380,
      "updatedat": 1795390000
    }
  ]
}
```

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
| `mode` | `provider-oauth` rows only: `oauth` (a key of your own app, sent with a sign-in) or `key` (the key way in, such as a Meta System User token). A field without `mode` belongs to both ways. Show the two ways as two choices on the card. |
| `source` | `wiro_project` on the Wiro connector's project field: show a picker of your Wiro projects instead of an input. See [The Wiro connector](#the-wiro-connector). |

## Connecting

All three ways go through one call, `POST /UserAgent/ConnectorConnect`. The connector's `authtype` and `modes` from the catalog tell you which body to send.

| `authtype` | Send | Answer |
|------------|------|--------|
| `fields`, `headers` | `values` | `connected` |
| `none` | nothing but `useragentguid` and `slug` | `connected` |
| `provider-oauth` with `mode: "key"` | `values` of the `key` way | `connected` |
| `provider-oauth` (`mode` `oauth`, the default) | your app's keys in `values`, and `redirecturl` | `pending` and `authorizeUrl` |
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
| `wiroprojectguid` | string | No | The Wiro connector only: the id of one of your projects, from [`POST /Project/List`](/docs/projects). It becomes the agent's own Wiro project, as [`CredentialProjectBind`](/docs/agent-overview#post-useragentcredentialprojectbind) binds it. See [The Wiro connector](#the-wiro-connector). A connector whose tools run inside the agent refuses it; one on a vendor's own MCP server ignores it. |

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

A `headers` connector (one of the vendors' own MCP servers that takes an API key, such as Lemlist or DataForSEO) connects the same way: its `credentialfields` are the values it takes, each named by its `name`, such as `apikey`. Its values are at most 4,096 characters each, on one line, and its refusals name the value by that `name` (`apikey is required.`). It has no credential check: the vendor's server answers the agent's first call.

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

A connect that changes something, a new account selection and a disconnect of a connected connector restart a running agent so it loads the change: `restart: "scheduled"` in the answer, and for a sign-in, `connector_connected=true` on your page. The agent's `status` on [`POST /UserAgent/Detail`](/docs/agent-overview#post-useragentdetail) then goes `1` (stopping), `2` (queued), `3` (starting) and back to `4` (running), in about a minute; a message sent meanwhile is refused with a sentence you can show. See [Restarts](/docs/agent-chat-integration#restarts) for what to show. A stopped agent loads the change when it next starts.

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
      "scope": "pages_show_list,pages_manage_posts,pages_read_engagement",
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
| `tokenexpiresat`, `refreshtokenexpiresat` | Sign-in connections: when the access token and the refresh token expire, or `null`. Wiro refreshes the access token on its own. |
| `scope` | The scopes the vendor granted, as it sent them. For a sign-in on a vendor's own MCP server whose token answer names none, the scopes Wiro asked for. |
| `accounts` | The account selection, `{ <picker key>: [ids] }`. |
| `wiroprojectid` | The Wiro connector only: the agent's own Wiro project, the one the connector acts with, as a string, or `null` when the agent has none. See [The Wiro connector](#the-wiro-connector). |
| `savedvariables` | The names of the values saved for this connection, sorted. Use them to mark fields as saved; their values are never shown. |
| `lasterror` | A short code for the last failure, such as `authorization_denied`, or `null`. Never a secret. |

| `status` | Meaning | What to show |
|----------|---------|--------------|
| `connected` | The agent has the connector's tools. | Connected, with Disconnect and, when it has pickers, the account choice. |
| `pending` | A sign-in was started and has not come back yet, or a connection that [moved over](#coming-from-credential-connectors) misses a required value. | Waiting for the sign-in, with a way to start it again; or the form, to send the missing value with ConnectorConnect. |
| `reauth` | The sign-in expired or was revoked at the vendor and refreshing it failed (`lasterror` is a code), or the connector's way in changed (`lasterror: "auth_changed"`). Until the agent's next restart, the connector's tools answer that it must be connected again; after it, the agent no longer has them. | Reconnect: start a new sign-in with ConnectorConnect. |
| `error` | The last sign-in failed (`lasterror` says how). | Connect again. |

A connector that was never connected, or was disconnected, has no row.

## Account Pickers

Some connectors act on accounts inside the vendor: Facebook Pages, Meta ad accounts, Google Ads customers, TikTok Ads advertisers, a GA4 property, Search Console sites, Business Profile locations, YouTube channels, apps in App Store Connect and Google Play. Their catalog row lists `accountpickers`. After the connection is `connected`, list the candidates, let your customer choose, and save the choice. The connector's tools refuse any account outside the selection, and until something is picked they have no account to act on.

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
      "description": "",
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
      "scope": "pages_show_list,pages_manage_posts,pages_read_engagement",
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
| `Unknown account picker: <key>. This connector has: pages.`, `Unknown account picker: <key>. This connector has none.` | A key the connector does not have. |
| `<label> takes one account.` | More than one id for a picker with `multiple: false`. |
| `<label>: 1 of the accounts sent is not among the ones this connection can use.` | An id the vendor did not list for this connection. |
| `accounts must be an object of lists of account ids.`, `accounts has too many keys.`, `Each account id is text of at most 200 characters.` | The body's shape. |
| `This connector is not connected to the agent.` | No connected connection for this slug. |
| `This connector has no accounts to pick.` | `ConnectorAccounts` on a connector whose tools run on the vendor's own MCP server and whose catalog row lists no account pickers. |
| `This connector's accounts cannot be listed yet.` | The connector's account lists aren't available right now. Try again later. |
| `The sign-in for this connector expired or was revoked, so it has to be connected again. Ask the agent's operator to reconnect it.` | The sign-in could not be refreshed, and the connection is now `reauth`. Or the vendor's own MCP server refused the connection's sign-in (HTTP 401 or 403) as Wiro listed the candidates: the connection's `status` doesn't change. Either way, start a new sign-in with [ConnectorConnect](#connect-with-a-sign-in), then list the accounts again. |
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

- When TikTok's server no longer accepts the connection's sign-in (HTTP 401 or 403), `ConnectorAccounts` and `ConnectorSetAccounts` answer `The sign-in for this connector expired or was revoked, so it has to be connected again. Ask the agent's operator to reconnect it.` Start a new sign-in with [ConnectorConnect](#connect-with-a-sign-in), then list the advertisers again.
- A TikTok Ads connection that [moved over](#coming-from-credential-connectors) keeps its advertiser in `accounts.advertisers`.

## Disconnecting

### **POST** /UserAgent/ConnectorDisconnect

Deletes the connection: its values, tokens and account selection. For a sign-in, Wiro first asks the vendor to revoke the token where the vendor supports it. A connected connector's agent restarts without its tools.

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

- `readonly: true` tools only read. `destructive: true` tools can change or delete something at the vendor.
- A tool acts with the connection's own credentials and, where the connector has pickers, only on the selected accounts.
- To tell the agent when and how to use the tools, write a [Custom Skill](/docs/agent-skills#using-connectors-in-skills) that names them, such as: "Before you write an article, research the topic with `serper__web_search` and cite the top three results."
- A scheduled task of an agent template that works with a connector stays off until that connector is connected.
- A disconnected connector's tools are gone after the restart. A `reauth` connection's tools answer that it must be connected again, in words your customer can read (they name no Wiro place or link), until the agent's next restart; after it, the agent no longer has them.

## The Wiro Connector

The `wiro` connector gives the agent Wiro's own model and task tools, named `wiro__<tool>`, from the [Wiro MCP server](/docs/wiro-mcp-server). Its calls are the agent's own: they always act with the agent's own Wiro project key, the key the agent runs every Wiro model with (see [The agent's Wiro project](/docs/agent-credentials#the-agents-wiro-project)). So:

- The models they run are billed to the wallet of the workspace that owns that project, at each model's usual price.
- Wiro counts them as the agent's own runs: the agent's own [spend limit](/docs/spend-limits) and [Model Access](/docs/model-access) rule apply to them (the `agent` scope, on the `agent` surface), as to every model the agent runs.
- Account, agent, team and billing endpoints are refused to them, as to every call the agent makes: see the note "An agent's own calls never manage an account" under [`UserAgent/UpdateSettings`](/docs/agent-overview#post-useragentupdatesettings). The agent changes its own setup only through [setup cards](/docs/agent-messaging#setup-from-chat) that an agent admin approves.

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
| `list_tasks` | `wiro__list_tasks` | Lists recent model tasks of the workspace that owns the agent's project: every project in it, and runs started on wiro.ai. |
| `cancel_task` | `wiro__cancel_task` | Cancels a queued task. |
| `kill_task` | `wiro__kill_task` | Stops a queued or running task. |
| `upload_file` | `wiro__upload_file` | Uploads a file from a public URL, for use as a model input. |
| `search_docs` | `wiro__search_docs` | Searches the Wiro documentation. Read only. |
| `get_playbook` | `wiro__get_playbook` | Reads a step-by-step guide. Read only. |

The list can't be widened. Whatever the connector's catalog row says, Wiro gives the agent no other tool of the server, and also refuses any tool whose name has one of these words in it: `agent`, `workflow`, `billing`, `account`, `project`, `studio`, `credential`, `oauth`, `skill`, `spend`, `limit`, `access`, `wallet`, `team`, `organization`, `coupon`, `invoice`, `payment`, `key` or `user`. `tools` on [Detail](#post-agentconnectordetail) lists only the tools the agent gets.

**What the task tools reach.** `list_tasks`, `get_task`, `cancel_task` and `kill_task` work on the tasks of the whole workspace that owns the agent's Wiro project, not only on the runs the agent started. `list_tasks` lists that workspace's recent model tasks with their outputs, from every project in it and from runs started on wiro.ai, and `get_task` reads any of them by its id. `cancel_task` and `kill_task` can stop any of them, and also any other task the project's creator could stop: that person's own tasks in any workspace, and the tasks of every team they are a member of. So connect the `wiro` connector only to an agent whose users may see that workspace's work. When several agents share one project, such as one agent for each of your customers, each of them can list, read and stop the others' runs.

### Connecting it

Its `credentialfields` have one field with `source: "wiro_project"`: show a picker of your projects ([`POST /Project/List`](/docs/projects)) instead of an input, and send the chosen project's id as `wiroprojectguid`. Connecting binds that project to the agent as its own Wiro project, exactly as [`CredentialProjectBind`](/docs/agent-overview#post-useragentcredentialprojectbind) does: the same checks, the project's key saved as the agent's `wiro` credential, and a `Connector setting saved: wiro.apikey` row in the agent's [activity log](/docs/agent-logs#who-did-what-rows) when the project changed. The connector and every other Wiro call of the agent always use the same project.

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
      "iconurl": "https://wiro.ai/images/icons/skills/wiro.svg",
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
- An agent left with no Wiro project keeps the connection, but gets no `wiro` tools until a project is bound again, and `wiroprojectid` reads `null`.
- The agent's [Wiro API path list](/docs/agent-overview#post-useragentupdatesettings) (`wiroapiallowedpaths`) limits the Wiro API calls its skills make with the agent's own Wiro project; it doesn't apply to this connector's tools, which the list above fixes. They reach further than the default path list, which has `Task/Detail` but not `Task/List`, `Task/Cancel` or `Task/Kill`.
- In chat, the agent proposes a `project` card for it, which binds the project the same way: see [Project: Wiro AI Models](/docs/agent-chat-integration#project-wiro-ai-models).

### Moving the agent to another workspace

When the agent moves to a workspace its Wiro project isn't in, with [`Team/TransferAgent`](/docs/organizations-managing-teams#transferring-agents) or because its team or organization was deleted, Wiro disconnects the project from the agent and deletes the agent's `wiro` connection, before the agent restarts.

The same happens without a move when the team that owns the agent's Wiro project, or that team's organization, is deleted. The team's projects then go to their creators' personal workspaces, so an agent of another workspace that ran with one of them is disconnected from it and restarted too. Only a personal agent of the project's creator keeps it.

Either way, the agent's activity log shows both: `Disconnected: wiro` (`AGENT_CREDENTIAL_REMOVED`) and `Connector disconnected: wiro` (`CONNECTOR_DISCONNECTED`, with `summary.reason` `"workspace"`). To give the agent a project again, connect the connector with a project of the agent's workspace: that binds the project to the agent too.

## Errors

Refusals come as `result: false` with one sentence per problem in `errors`. Show the sentence: it names a field by its `label` (a `headers` connector's value by its `name`) and never repeats a value.

| Call | Message | Why |
|------|---------|-----|
| any | `Request parameter [useragentguid] required` (or `[slug]`) | A required parameter is missing. |
| `Detail` | `Connector not found.` | No such connector in the catalog. |
| `List` | `search is text of at most 100 characters.` | `search` too long. |
| `List` | `category must be one lowercase word (letters, digits or dashes, at most 40).` | A malformed `category`. |
| `ConnectorConnect` | `This connector is not available.` | The slug is not in the catalog. |
| `ConnectorConnect` | `<Label> is required.` (a `headers` connector: `<name> is required.`) | A required field has no value, sent or saved. |
| `ConnectorConnect` | `Unknown field <name>. This connector takes: <names>.` (a `headers` connector: `Unknown variable <name>. This connector takes: <names>.`) | A key in `values` the connector does not take. |
| `ConnectorConnect` | `values must be an object of field names and values.` (a `headers` connector: `values must be an object of variable names and values.`), `<Label> must be text.` | The shape of `values`. |
| `ConnectorConnect` | `<Label> must be an https address.`, `<Label> must be valid JSON.`, `<Label> must be an email address.`, `<Label> must be one of: <values>.`, `<Label> is not in the expected format.`, `<Label> must be at most <n> characters.`, `<Label> must be on one line.`, `<Label> has characters it cannot take.` | A value that fails its field's `format`, `pattern` or `maxlength` (65,536 characters at most). |
| `ConnectorConnect` | `<name> must be at most 4096 characters, on one line.`, `<name> must be a number.`, `<name> must be true or false.` | A `headers` connector's value that doesn't fit. |
| `ConnectorConnect` | The vendor's own sentence | The credential check: the vendor refused the values. Nothing was saved. |
| `ConnectorConnect` | `The vendor refused these credentials. Check them and try again.` | A key way that mints a token (Shopify) was refused. |
| `ConnectorConnect` | `The vendor could not be reached. Try again in a moment.` | The vendor did not answer the key exchange. |
| `ConnectorConnect` | `This connector signs in with your own app: send its <labels>.` | A `provider-oauth` sign-in without your app's keys, sent or saved. |
| `ConnectorConnect` | `This connector connects only by signing in.` | `mode: "key"` on a connector whose `modes` is `["oauth"]`. |
| `ConnectorConnect` | `mode is oauth or key.`, `mode is only for a connector that signs in with its vendor's own OAuth.` | A wrong `mode`. |
| `ConnectorConnect` | `Invalid redirect URL` | See [The redirect URL](#the-redirect-url). |
| `ConnectorConnect` | `The sign-in address could not be made from these values.` | A value the sign-in address needs (such as Shopify's shop domain) does not fit. |
| `ConnectorConnect` | `This connector's OAuth client is not set up yet.` | An `oauth` connector whose sign-in isn't ready on Wiro's side yet. |
| `ConnectorConnect` | `The connector's sign-in server did not register a client. Try again later.` | The vendor's sign-in server refused to register a client for the sign-in. |
| `ConnectorConnect` | `This connector takes no Wiro project.` | `wiroprojectguid` on a connector whose tools run inside the agent. A connector on a vendor's own MCP server without a project field ignores it. |
| `ConnectorConnect` | `<name> comes from the agent's Wiro project: send wiroprojectguid, not a value.` | A value sent for the Wiro connector's project field. |
| `ConnectorConnect` | `wiroprojectguid is required: send the id of one of your projects from Project/List. A request made with a project API key may leave it out, to use that key's own project.` | The Wiro connector with no project, from a request without a project API key, for an agent with no project of its workspace to keep. |
| `ConnectorConnect` | `wiroprojectguid must be a project's id from Project/List.` | A `wiroprojectguid` that isn't a project id. |
| `ConnectorConnect` | `Project not found. Send the id of one of your projects from Project/List: one you created, or any project of a team you are an admin of.` | A project you can't use. |
| `ConnectorConnect` | `This is a personal agent: use one of its owner's personal projects.`, `This is a team agent: use one of its team's projects.` | A project outside the agent's workspace. |
| `ConnectorConnect` | `This agent belongs to a team. Switch to the team context to access it.`, `This agent is in your personal workspace. Switch to personal context to access it.`, `This agent belongs to a different team.` | The Wiro connector, from a request outside the agent's workspace. |
| `ConnectorConnect` | `This project's API key no longer works: the account that created it is not active, so the agent's model runs would fail. Bind another project.`, `This project's API key no longer works: the person who created it is no longer in the team, so the agent's model runs would fail. Bind another project of the team.` | The account that created the project is not active, or has left the team. |
| `ConnectorConnect` | `This project has no API key the connector can use.` | The project's key can't be used. |
| `ConnectorConnect`, `ConnectorSetAccounts` | `accounts must be an object of lists of account ids.`, `accounts has too many keys.`, `Each account id is text of at most 200 characters.` | The shape of `accounts`: at most 10 keys and 500 ids per key. |
| any | `Something went wrong. Try again.` | A temporary failure: nothing was changed. |

The account picker refusals are under [ConnectorSetAccounts](#post-useragentconnectorsetaccounts), the callback codes under [The callback and your redirect URL](#the-callback-and-your-redirect-url).

## Coming From Credential Connectors

Connectors used to be skills that read credentials. If your code still uses those calls or names, this is where each one went. Each connector's `slug` is the credential key it had before (`serper`, `shopify`, `google-ads`, `facebook-pages`, ...).

| Before | Now |
|--------|-----|
| A connector's skill (`int-<name>`) turned on with `SkillsApply` or Deploy's `skills` | Nothing to turn on: a connected connector is on. `skills` and `SkillsApply` take Skills (`util-*`) only. |
| `int-twilio-channel`, the Twilio Voice channel | `util-twilio-channel`, a Skill: turn it on with `SkillsApply` or Deploy's `skills`. See [Twilio Voice Channel](/docs/integration-twiliovoice-skills). |
| `int-googleplay-events`, Google Play promotional content | `util-googleplay-events`, a Skill that prepares the content for you to publish in Play Console. It works with the `google-play` connector: its `docs_url` is that connector's page, [https://wiro.ai/connectors/google-play](https://wiro.ai/connectors/google-play). |
| `int-wiro-aimodels`, Wiro AI Models | The `wiro` connector: see [The Wiro connector](#the-wiro-connector). An agent that had it on and had a Wiro project was connected to it. |
| `POST /Credentials/List`, `POST /Credentials/Detail` for a connector | [`POST /AgentConnector/List`](#post-agentconnectorlist), [`POST /AgentConnector/Detail`](#post-agentconnectordetail) |
| `POST /UserAgent/CredentialUpsert` with a connector's `credentialkey` | [`POST /UserAgent/ConnectorConnect`](#connect-with-fields) with `values` |
| `POST /UserAgentOAuth/OAuthConnect` | [`POST /UserAgent/ConnectorConnect`](#connect-with-a-sign-in) |
| `POST /UserAgentOAuth/OAuthStatus` | [`POST /UserAgent/ConnectorList`](#post-useragentconnectorlist) |
| `POST /UserAgentOAuth/DiscoverPickerItems` | [`POST /UserAgent/ConnectorAccounts`](#post-useragentconnectoraccounts) |
| `POST /UserAgentOAuth/SetPickerAccounts` | [`POST /UserAgent/ConnectorSetAccounts`](#post-useragentconnectorsetaccounts) |
| `POST /UserAgentOAuth/OAuthDisconnect` | [`POST /UserAgent/ConnectorDisconnect`](#post-useragentconnectordisconnect) |
| A redirect URI per vendor (`/UserAgentOAuth/<Vendor>Callback`) | One for every vendor: `https://api.wiro.ai/v1/AgentConnector/OAuthCallback`. Add it to each of your OAuth apps. |
| `<vendor>_connected=true` and `<vendor>_error=<code>` on your redirect URL | `connector_connected=true` and `connector_error=<code>` |

**Connections you already had.** Each agent's connector credentials moved over as connections, so a connector that was set up stays connected:

- Values kept their field names, a sign-in kept its tokens and the app it signed in with, and the accounts its pickers had chosen are now in `accounts`.
- A connection that misses a required value reads `pending`: send the value with [ConnectorConnect](#post-useragentconnectorconnect).
- Gmail moved from an app password to a Google sign-in with an OAuth app of your own, so its connections read `reauth` with `lasterror: "auth_changed"` and give the agent no tools: create the app, as its field help says, and [sign in](#connect-with-a-sign-in) again.
- A connection that signed in with Wiro's own app signs in again with an app of your own once it reads `reauth`. Only HubSpot, Mailchimp and X still sign in with Wiro's app, and only from Wiro's own panel.
- Every OAuth app of your own must list the new redirect URI, `https://api.wiro.ai/v1/AgentConnector/OAuthCallback`. Tokens it issued before keep refreshing without it, but a new sign-in needs it.

Channels (Telegram, Slack, Discord, Twilio Voice) are not connectors: they keep their credentials, see [Agent Credentials](/docs/agent-credentials).

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
