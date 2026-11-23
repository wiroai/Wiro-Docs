# Agent Credentials

The values an agent keeps as credentials: its Telegram, Slack and Discord channels, its Twilio Voice phone line, the Wiro project it runs models with, and settings such as its support email and website. Read the credential registry, save values and audit their history. Connectors to outside services are on [Agent Connectors](/docs/agent-connectors).

## Overview

A credential is a set of values an agent keeps for something it is, rather than a service it works with:

| Credential | Key | What it is |
|------------|-----|------------|
| Telegram, Slack, Discord | `telegram`, `slack`, `discord` | The agent's own external chat channels. See [Communication Channels](#communication-channels). |
| Twilio Voice | `twilio-voice` | The phone line the agent answers. See [Twilio Voice Channel](/docs/integration-twiliovoice-skills). |
| Wiro project | `wiro` | The project whose wallet pays for the Wiro model runs the agent makes, such as video and voice. See [The agent's Wiro project](#the-agents-wiro-project). |
| Settings | `var-support-email`, `var-website`, `var-newsletter-test-email` | Values the agent's skills read: the support email it gives customers (field `value`), its website addresses (field `urls`: a list of `{ websitename, url }` entries, both required) and the inbox that gets a test copy of each newsletter before it goes out (field `value`). Save them with `CredentialUpsert`, as in [Setting Credentials](#setting-credentials). |

The services an agent works with (Google Ads, Shopify, HubSpot, Serper and the rest) are **connectors**, not credentials: browse, connect and disconnect them with the calls on [Agent Connectors](/docs/agent-connectors). `CredentialUpsert` doesn't take a connector's values: a row whose `credentialkey` is a connector's slug refuses the whole request before anything is saved, its other rows included, with `{ "result": false, "errors": [{ "code": 0, "message": "Unknown credential: shopify. Connectors are connected with UserAgent/ConnectorConnect." }] }`.

> **Not from the agent's chat.** [Setup cards](/docs/agent-messaging#setup-from-chat) connect connectors of the catalog only: no card saves a channel, Twilio Voice or a setting. Save them with `CredentialUpsert`; in chat, the agent asks an agent admin to make the change in the agent's settings. The one card that sets a credential is the `project` card of Wiro AI Models (`wiro`): it binds the agent's Wiro project, as `CredentialProjectBind` does.

**Read & write paths at a glance:**

| Operation | Endpoint |
|-----------|----------|
| Browse every credential in the registry | [`POST /Credentials/List`](#post-credentialslist) (public) |
| Inspect a single credential schema | [`POST /Credentials/Detail`](#post-credentialsdetail) (public) |
| Find the credential a skill needs | [`POST /Skills/CredentialSchema`](/docs/agent-skills#post-skillscredentialschema) (public) |
| Write one or more credential fields | [`POST /UserAgent/CredentialUpsert`](/docs/agent-overview#post-useragentcredentialupsert) |
| Connect the agent's Wiro project by its id | [`POST /UserAgent/CredentialProjectBind`](/docs/agent-overview#post-useragentcredentialprojectbind) |
| Discover external communication channels | [`POST /Skills/List`](/docs/agent-skills#post-skillslist) → `channels[]` (public) |
| Connect or disable an external channel | [`POST /UserAgent/CredentialUpsert`](/docs/agent-overview#post-useragentcredentialupsert) |
| Read version history of a credential | [`POST /UserAgent/CredentialFieldHistory`](/docs/agent-overview#post-useragentcredentialfieldhistory) |
| Connect a service the agent works with | [Agent Connectors](/docs/agent-connectors) |

> Read responses from `POST /UserAgent/Detail` expose the composed `credentials` tree (each credential with its `_connected` / `optional` / `extra` / `_editable` / `_schema` flags), the `customskills[]` array, the `scheduledskills[]` array (scheduled tasks), the `skills[]` array of enabled skill names, the `tokenRates` + `agentModel` objects, and the agent's AI usage and balance (`usage`) and this month's cost (`spend`) as **top-level fields** on the useragent object. `POST /UserAgent/MyAgents` rows carry `tokenRates`, `agentModel`, `usage` and `spend`, without the composed children. See [Agent Overview](/docs/agent-overview) for the full endpoint catalog.

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

`POST /UserAgent/Detail`, `POST /UserAgent/Update` and `POST /UserAgent/Deploy` return the same channels with this agent's state in `communicationChannels`: `enabled`, `configured` and `missingfields`.

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
      "fieldvalue": ["123456789"]
    },
    {
      "credentialkey": "telegram",
      "fieldname": "groups",
      "fieldvalue": [
        {
          "chatid": "-1001234567890",
          "allowedusers": ["123456789"]
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

**Approvals in these chats.** When an action of a connector needs a person's approval in a Telegram, Slack or Discord conversation, the agent asks there: its reply ends with a question that shows the action and its whole request, and an answer in that conversation of `yes` allows the action once and `no` declines it. Always allow isn't offered there: the agent's owner or an admin of its team sets it in the connector's Permissions. In a group, any member allowed to talk to the agent there answers. See [Approvals in Telegram, Slack and Discord](/docs/agent-connectors#approvals-in-telegram-slack-and-discord).


## Credential Registry Endpoints

These endpoints are **public, so no authentication is required**. They return data straight from the credential registry, which is useful when you want to render a credential's form without a deployed useragent (e.g. inside an onboarding wizard).

### **POST** /Credentials/List

Lists every credential in the registry: the channels, Twilio Voice, the Wiro project, the settings, and entries Wiro manages itself. Ignore keys this page doesn't list.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `credential_mode` | string | No | Filter by mode, such as `"api_key"` (values typed in) or `"static"` (settings). |

##### Response

```json
{
  "result": true,
  "errors": [],
  "total": 14,
  "credentials": [
    {
      "key": "telegram",
      "title": "Telegram",
      "icon": "/images/icons/skills/telegram.svg",
      "brand_color": "#24a1de",
      "brand_text_color": "#ffffff",
      "brand_logo_filter": "brightness(0) invert(1)",
      "docs_url": "integration-telegram-skills",
      "credential_mode": "api_key",
      "channel": {
        "id": "telegram",
        "required_fields": ["bottoken", "allowedusers"],
        "capabilities": { "direct": true, "rooms": true, "threads": true, "roles": false, "command_menu": true }
      },
      "credential_schema": [
        {
          "key": "bottoken",
          "type": "password",
          "label": "Telegram Bot Token",
          "required": true,
          "encrypted": true,
          "show_toggle": true,
          "help": "<ol><li>Open Telegram and start a chat with the official @BotFather account.</li><li>Send /newbot, choose the bot's display name and a username ending in bot.</li><li>Copy the token returned by BotFather.</li></ol>"
        },
        {
          "key": "allowedusers",
          "type": "string-array",
          "label": "Allowed Telegram DM User IDs",
          "required": true
        }
      ]
    }
  ]
}
```

The example shows one entry, shortened. Keys this table doesn't list are for Wiro's own panel: ignore them.

| Field | Type | Description |
|-------|------|-------------|
| `key` | `string` | Canonical credential key. Use this in `CredentialUpsert.fields[].credentialkey`. |
| `title` | `string` | Display label for the credential's card. |
| `icon` | `string` | The icon as the registry holds it: a path on `https://wiro.ai`, such as `/images/icons/skills/telegram.svg` (put `https://wiro.ai` in front of it), or, for a setting, a Lineicons class name, such as `lni lni-envelope-1`. |
| `brand_color` / `brand_text_color` / `brand_logo_filter` | `string\|null` | Colours and CSS filter for rendering the icon, the same shape as on skill registry entries. |
| `docs_url` | `string\|null` | Slug of the page about it on this docs site, when it has one. Frontends prefix it with `/docs/`. |
| `credential_mode` | `string` | `"api_key"` for values typed in (the channels, Twilio Voice, the Wiro project) or `"static"` for settings. |
| `channel` | `object?` | Only on the external chat channels: their `id`, the `required_fields` that turn them on, and `capabilities`. See [Communication Channels](#communication-channels). |
| `credential_schema` | `array<field>` | Per-field schema describing the credential form. Each entry is a `field` object (see below). |

**`credential_schema[]` field object:**

| Sub-field | Type | Description |
|-----------|------|-------------|
| `key` | `string` | Field name (the `fieldname` you send to `CredentialUpsert`). |
| `type` | `string` | Input type: `"text"`, `"password"`, `"email"`, `"url"`, `"number"`, `"textarea"`, `"select"`, `"boolean"`, `"string-array"`, `"object-array"`, `"fileinput"` (a public file, written with `CredentialFileUpload`), `"custom:wiro-project-picker"` (the Wiro project: bind it with `CredentialProjectBind`) or `"custom:urls-list"` (a list of objects, written like `"object-array"`; its entry fields are in `custom_component_config.per_url_schema`). |
| `label` | `string` | Display label for the form input. |
| `required` | `boolean` | Whether the field must be filled before the credential counts as set up. |
| `placeholder` | `string?` | Placeholder text for the input. |
| `pattern` | `string?` | Regex the value must satisfy. |
| `maxlength` / `minlength` | `number?` | Length constraints. |
| `options` | `array?` | For `type: "select"`, `[{ value, text }]` choices: show `text`, send `value` as the `fieldvalue`. |
| `default` | `string?` | Default value applied when the user hasn't set anything yet. |
| `help` | `string?` | HTML help text rendered under the input. |
| `show_toggle` | `boolean?` | For `type: "password"`, render a "show / hide" toggle. |
| `encrypted` | `boolean?` | `true` when the value is stored encrypted. Only a `password` field comes back as the mask, `"••••••••"`: an encrypted field of another type, such as Twilio Voice's `accountsid` or the Wiro project's `apikey`, comes back as saved. In [`CredentialFieldHistory`](#auditing-credential-changes-credentialfieldhistory), an encrypted field's earlier values read `"[REDACTED]"`. |
| `item_schema` / `item_type` | `object?` | For array-of-object fields: describes the per-entry shape (e.g. Telegram `groups[].{chatid, allowedusers}`). |
| `custom_component_config` | `object?` | On a `"custom:urls-list"` field: `per_url_schema` holds the field objects of one entry (`websitename`, `url`). Its other keys are for Wiro's own panel. |

**`fieldstatus`**. Not part of the registry schema: the server stamps it onto each stored field when it is written. Values you save are `user` and come back in responses (a secret as the mask). `platform` fields are Wiro's own: you can't write them, and they never come back.

### **POST** /Credentials/Detail

Returns a single credential entry by key.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `key` | string | Yes | Canonical credential key (e.g. `"telegram"`, `"twilio-voice"`, `"wiro"`). |

##### Response

Returns the **same entry** as a row from `Credentials/List` (shortened here):

```json
{
  "result": true,
  "errors": [],
  "credential": {
    "key": "twilio-voice",
    "title": "Twilio Voice",
    "icon": "/images/icons/skills/twilio.svg",
    "credential_mode": "api_key",
    "credential_schema": [
      { "key": "accountsid", "type": "text", "label": "Account SID", "required": true, "encrypted": true },
      { "key": "authtoken", "type": "password", "label": "Auth Token", "required": true, "encrypted": true },
      { "key": "phonenumbers", "type": "string-array", "label": "Phone numbers", "required": true },
      { "key": "maxcallseconds", "type": "number", "label": "Max call duration (seconds)", "required": false }
    ]
  }
}
```

Returns `{ "result": false, "errors": [{ "code": 404, "message": "Credential not found: <key>" }] }` if the key is unknown, a connector's key included: a connector is read with [`POST /AgentConnector/Detail`](/docs/agent-connectors#post-agentconnectordetail).

## The Agent's Wiro Project

The `wiro` credential is the Wiro project an agent runs Wiro AI models with: the skills that make video or images, and the live audio of its voice calls. Each run is billed to the wallet of the workspace that owns that project (your personal wallet, or the team wallet for a team project).

- **Credential key:** `wiro`
- **Field:** `apikey` (label "Wiro Project"; single field, type `custom:wiro-project-picker` in the registry; the dashboard renders it as a project picker).
- **No secret to supply.** Only the project is needed. Request signing for the agent's own Wiro calls is handled automatically, so there is no `apisecret` (or similar) field to paste.
- **Setup in the dashboard:** open the agent's settings and pick a project, or create one on the [Projects page](https://wiro.ai/panel/project).
- **Setup through the API:** take the project's `id` from `POST /Project/List` and call [`POST /UserAgent/CredentialProjectBind`](/docs/agent-overview#post-useragentcredentialprojectbind). A request made with a project API key can leave `projectid` out to bind that key's own project:

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/CredentialProjectBind" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "projectid": "your-project-id"
  }'
```

The response names the project and says what happened to the agent: `{ "result": true, "errors": [], "applied": 1, "project": { "id": "4821", "name": "Agent models" }, "restart": "scheduled" }`. See [`CredentialProjectBind`](/docs/agent-overview#post-useragentcredentialprojectbind) for every field and error. If you already hold a project's key, `POST /UserAgent/CredentialUpsert` with `credentialkey` `wiro` and `fieldname` `apikey` saves it too.

> **Don't confuse `credentials.wiro.apikey` with your operator-level Wiro API key.** `credentials.wiro.apikey` is the project key the agent uses to run Wiro models. The `x-api-key` header you send to Wiro endpoints from your own backend is your operator key, which authenticates your request (see [Authentication](/docs/authentication)). They are the same key only when you bind the project of the key you call with.

The [Wiro AI Models (`wiro`)](/docs/agent-connectors#the-wiro-connector) connector, which gives the agent Wiro's own model and task tools, always acts with this project, as the agent's own calls. Connecting it binds the project you pick, as `CredentialProjectBind` does; disconnecting it leaves the project bound, so the agent's Skills keep running models with it. Moving the agent to a workspace the project isn't in disconnects both the project and the connector.

## Platform-Managed Credentials

Some credential fields are **managed by Wiro**. You don't provide them, and they are never returned in API responses.

- The chat model your agent runs on is set up by Wiro. Pick the model with `UserAgent/UpdateSettings`; there is no key to supply.

`CredentialUpsert` rejects writes to these fields with `<Field label> is managed by the platform`, and Deploy drops them from `credentials`.


## Auditing Credential Changes: `CredentialFieldHistory`

Each time a save replaces a field's saved value, the earlier value is kept in a versioned history, with `operation: "update"`. A first save adds no entry, and neither does a list of entries sent whole (Telegram `groups`, Slack `channels`, Discord `guilds`, Website `urls`); a change to one entry's field, sent with `parentfield` and `ordinal`, is kept like any other. Use `POST /UserAgent/CredentialFieldHistory` to read it, the same idea as `CustomSkillHistory` for skills.

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/CredentialFieldHistory" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
    "credentialkey": "telegram"
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
      "credentialkey": "telegram",
      "fieldname": "allowedusers",
      "fieldvalue": ["123456789"],
      "fieldstatus": "user",
      "parentfield": null,
      "ordinal": 0,
      "operation": "update",
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
    }
  ]
}
```

`changedby_user` is the resolved actor object (`uuid`, `firstname`, `lastname`, `email`, `username`, `avatar`, `avatarinitials`). It is `null` when `changedby` is a system value such as `"system"` or `"backfill-*"`, or when the user record has been deleted.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Your UserAgent instance guid |
| `credentialkey` | string | Yes | Credential key (e.g. `"telegram"`, `"twilio-voice"`) |
| `startdate` | number | No | UTC epoch seconds: return entries on/after this time |
| `enddate` | number | No | UTC epoch seconds: return entries on/before this time |

> **Secrets stay out of the history's answers.** A saved secret, such as a bot token or an auth token, reads `"••••••••"` in `POST /UserAgent/Detail`, and its earlier values read `"[REDACTED]"` in the history, as do those of every field the registry marks `encrypted`, such as Twilio Voice's `accountsid`. `CredentialFieldHistory` only shows the audit trail.

## Setting Credentials

Use `POST /UserAgent/CredentialUpsert` with a flat `fields[]` array. Each field row carries `{credentialkey, fieldname, fieldvalue}`. The Wiro project an agent runs models with has its own route, [`POST /UserAgent/CredentialProjectBind`](/docs/agent-overview#post-useragentcredentialprojectbind), which takes the project's `id`.

### Bulk upsert pattern

`/UserAgent/CredentialUpsert` takes an array of field rows in one request. Only the fields you send are written; other credential groups and other fields inside the same group are untouched. The Wiro Dashboard follows this pattern exactly: each credential card sends a single `CredentialUpsert` call with its group's fields.

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/CredentialUpsert" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "fields": [
      { "credentialkey": "telegram", "fieldname": "bottoken",     "fieldvalue": "123456:ABC-DEF..." },
      { "credentialkey": "telegram", "fieldname": "allowedusers", "fieldvalue": ["123456789"] }
    ]
  }'
```

Response: `{ "result": true, "applied": 2, "errors": [] }`. `applied` is the count of fields saved without an error (a field sent with its current value still counts; a secret sent back as the mask isn't counted, see below). All fields are validated before any is written: if one fails validation (for example a reserved fieldname prefixed with `_`), the whole request is rejected and nothing is saved; `result` is `false` and `errors` lists every invalid field. If a save fails after validation has passed, the other fields are still saved and each failed field is listed in `errors` with `result: false`. A starting or running agent restarts to apply the new values when the call changes a saved value.

Settings are saved the same way. Each email setting has one field, `value`. The Website setting's `urls` is a list of `{ websitename, url }` entries, both required, and the list you send replaces the saved one:

```json
{
  "useragentguid": "your-useragent-guid",
  "fields": [
    { "credentialkey": "var-support-email", "fieldname": "value", "fieldvalue": "support@example.com" },
    { "credentialkey": "var-newsletter-test-email", "fieldname": "value", "fieldvalue": "newsletter-test@example.com" },
    { "credentialkey": "var-website", "fieldname": "urls", "fieldvalue": [{ "websitename": "Main site", "url": "https://example.com" }] }
  ]
}
```

Response: `{ "result": true, "applied": 3, "errors": [] }`. Each of these is refused, and nothing is saved:

- an entry without a name or a URL: `Website Name in Websites #1 is required` (or `URL in Websites #1 is required`);
- any other key in an entry: `Websites #1 contains an unknown field: <key>`;
- a `urls` value that isn't a JSON array, such as one URL as text: `Websites must be an array`.

### Field-level write rules

- **`fieldstatus` is assigned by the server.** Any `fieldstatus` you send is ignored: a field that already exists keeps its stored status, and a new field gets the status its registry schema implies.
- **Wiro-managed fields are rejected.** You can't write a field whose status is `platform`: it fails with `<Field label> is managed by the platform` (a field with no schema label is named `<credentialkey>.<fieldname>` instead). As with any invalid field, the whole request is rejected and nothing is saved.
- **Reserved fieldnames are rejected.** Any `fieldname` starting with `_` (e.g. `_isoptional`, `_isextra`) is a sentinel used by the template itself and cannot be set by API callers.
- **A connector's slug is refused.** A connector is connected with [`ConnectorConnect`](/docs/agent-connectors#post-useragentconnectorconnect), never saved here: a row whose `credentialkey` is a connector's slug fails with `Unknown credential: <key>. Connectors are connected with UserAgent/ConnectorConnect.`, and nothing in the request is saved.
- **A secret sent back as the mask keeps its saved value.** `UserAgent/Detail` shows a saved secret (a `password` field) as `"••••••••"`. A row whose `fieldvalue` is that mask, with or without spaces around it, keeps what is saved: it isn't written, isn't counted in `applied` and restarts nothing. So a card sent back as Detail showed it changes only the fields you edited. To change a secret, send its new value. The mask with other text beside it is refused, with `<Field label> holds "••••••••", which stands for a saved value. Clear it and enter the full value`.
- **Whitespace around a value is trimmed.** Text, password, email, URL and number values, and each entry of a list of strings, are saved without the spaces, tabs or line breaks around them and are validated after trimming, so a token pasted with a trailing newline is accepted. Spaces inside a value are kept, and multi-line text, selections, booleans, files and nested rows are saved as sent. The same applies to inline Deploy credentials.
- Any credential that [`POST /Credentials/List`](#post-credentialslist) lists can be saved on any agent, whether or not its template uses it, with `CredentialUpsert` or inline Deploy credentials. Its Wiro-managed fields are still refused, and a key that isn't a credential, such as a connector's slug, is refused too (see above).
- **Lists** (Telegram `groups[]`, Slack `channels[]`, Discord `guilds[]`, Twilio `phonenumbers[]`, Website `urls[]`) are sent as JSON arrays. An array `fieldvalue` (with no `parentfield`) replaces the whole stored list, so send the complete desired list. Per-row writes (a sub-field sent with `parentfield`, the list field's key, and `ordinal`, the array index) change only that entry; indices you don't send are kept. To clear an optional list, send `[]` as that field's `fieldvalue` with no `parentfield`.
- Use `POST /UserAgent/Detail` to inspect which fields each credential exposes, and the `_connected` / `optional` / `extra` flags that describe its readiness state.

### Prepaid deploy: inline setup supported (with limitations)

If you call `POST /UserAgent/Deploy` with `useprepaid: true`, you may pass `credentials`, `customskills`, and `skills` at the **top level of the Deploy body**. The server saves them on the new agent in the same call (one-shot deploy + initial setup). Connectors aren't part of Deploy: connect them once the agent exists, with [`ConnectorConnect`](/docs/agent-connectors#post-useragentconnectorconnect).

**Deploy body `credentials` rules:**

- Values are validated against each credential's public registry schema.
- Registry-declared `string-array` and `object-array` fields are accepted as native JSON arrays. This includes channel allowlists (`allowedusers`, Telegram `groups`, Slack `channels`, Discord `guilds`).
- Fieldnames starting with `_` are reserved and ignored.
- Each field's `fieldstatus` is assigned by the server, exactly as for `CredentialUpsert`.
- Deploy never saves a `platform` field sent in `credentials`. In a communication-channel group (Telegram, Slack, Discord), such a field fails Deploy before the agent is created. In any other group, the field is dropped and Deploy continues.
- A secret sent as the mask, `"••••••••"`, isn't saved: a new agent has no saved value for it to keep. In a communication-channel group (Telegram, Slack, Discord), the mask is refused with `<Field label> holds "••••••••", which stands for a saved value. Clear it and enter the full value`, and Deploy fails before the agent is created. `UserAgent/Detail` never returns a saved secret, so to copy one agent's setup to another, send each secret's value.
- If `credentials` includes a communication-channel group, all of that channel's `required_fields` must be present. A missing or invalid activation credential fails Deploy instead of creating a partially configured channel.
- A connector's slug as a key of `credentials` fails Deploy before anything is created or charged, with `Unknown credential: <key>. Connect a connector after the deploy with UserAgent/ConnectorConnect.`

**Deploy body `skills` rules:**

- Skills (`util-*`) only. A name that isn't a Skill fails Deploy before anything is created or charged, with `Unknown skill: <name>.`; a name that starts with `int-` gets `Unknown skill: <name>. Connectors are connected with UserAgent/ConnectorConnect, not turned on as skills.`

**Deploy body `customskills` semantics:**

- Each entry must have a `key`. Server reads `value`, `interval`, `enabled` and `description`; `_user_created: true` marks the row as yours, so it can be renamed or deleted later. The key is stored in its full form, as `CustomSkillUpsert` stores it: a bare slug with an `interval` becomes `cs-cron-<slug>`, one without becomes `cs-<slug>`, and `cron-<slug>` becomes `cs-cron-<slug>`.
- A scheduled task's `interval` is checked as in `CustomSkillUpsert`, and `"manual"` means no schedule. A schedule the agent can't run fails Deploy before anything is created or charged, with an error that starts with the skill's key, such as `cs-cron-daily-report: This schedule can't run. The hour field takes 0 to 23. A schedule has five fields: minute hour day month weekday, for example 0 9 * * 1-5.`
- The request body accepts a single top-level `customskills` array; server-side values are merged onto any existing preset rows for the same key.
- Up to 50 entries per Deploy. A longer list is refused before anything is created or charged; add the rest with `CustomSkillUpsert` once the agent is deployed.

If you skip these keys in Deploy entirely, the instance is created empty and you set credentials and skills later with `CredentialUpsert`, `CredentialProjectBind`, `CustomSkillUpsert`, and `SkillsApply`.

## Setup Required State

Every fresh Deploy starts in **Setup Required** state (`status: 6`). A Deploy without `useprepaid: true` leaves the agent there, with no plan, and `Start` refuses it with `Agent setup is not complete. Fill in the agent's required settings before starting.` Pay its plan with [`CreateSubscriptionCheckout`](/docs/agent-overview#post-useragentcreatesubscriptioncheckout) (`useprepaid: true`), which queues it.

API deploys must always pass `useprepaid: true`. The server provisions the prepaid subscription inline and moves the agent to `status: 2` (Queued) whatever its credentials hold, and Wiro then starts it, so no `Start` call is needed. A credential the agent requires may still be incomplete while it runs: `UserAgent/Detail` reads `setuprequired: true` until every required credential is set up, and a running agent restarts to pick up each value you save.

Credentials never hold an agent at `status: 6`, and saving one, with `CredentialUpsert` or `CredentialProjectBind`, doesn't change `status`: a running agent with a missing required credential reads `setuprequired: true` on `UserAgent/Detail` until it is set up. `Start` doesn't read `setuprequired` on a stopped (`status: 0`) or errored (`status: 5`) agent.

`setuprequired` in `UserAgent/Detail` is `true` while the agent is at `status: 6` or any non-optional credential is still incomplete; on `UserAgent/MyAgents` rows it follows `status: 6` alone. A credential counts as complete when at least one field saved on this agent with `fieldstatus: "user"` has a non-empty value (any one user-writable field filled in makes the credential count as "entered"; there is no deeper per-field validation). A value the agent template holds doesn't count here, though it counts toward the card's `_filled` and `_required_missing`.

## Security

- **A secret you save is never returned.** A bot token or an auth token reads as `"••••••••"` in `UserAgent/Detail`, as every saved secret does (see [Credential object shape](/docs/agent-overview#credential-object-shape)).
- **`platform` fields are always stripped** from responses. `credentials.wiro.apikey` is user-supplied and appears in the response as saved.
- **`fieldstatus` is server-assigned.** A `fieldstatus` sent to `CredentialUpsert` is ignored; the server assigns the status itself. Wiro-managed (`platform`) fields are rejected with `<Field label> is managed by the platform`. A request that fails validation saves nothing, and Deploy never saves such a field from its `credentials` body.
- Connector values and sign-in tokens are kept apart from credentials, encrypted, and never returned either: see [Agent Connectors](/docs/agent-connectors).

## For Third-Party Developers

If you're building a product on top of Wiro agents for your own customers:

1. **Deploy** an agent instance per customer via `POST /UserAgent/Deploy`, with any channel groups in `credentials`.
2. **Connect the services it works with** through [Agent Connectors](/docs/agent-connectors): your customer's own API keys, or the vendor's sign-in with a `redirecturl` on your own site, so the consent screen names your product.
3. **Set the channels and settings** your customer wants with `CredentialUpsert`, and the Wiro project with `CredentialProjectBind`.
4. **Verify** with `POST /UserAgent/Detail` (`credentials`, `setuprequired`) and `POST /UserAgent/ConnectorList` (each connector's `status`).

When the agent proposes a change in a chat, apply it with the same calls and record it on its setup card with `SetupCardApply`: see [Agent Chat Integration](/docs/agent-chat-integration).

## Code Examples

### Channels (curl)

```bash
# Connect Telegram: every required field in one call turns the channel on
curl -X POST "https://api.wiro.ai/v1/UserAgent/CredentialUpsert" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "fields": [
      { "credentialkey": "telegram", "fieldname": "bottoken",     "fieldvalue": "123456:ABC-DEF1234ghIkl" },
      { "credentialkey": "telegram", "fieldname": "allowedusers", "fieldvalue": ["123456789"] }
    ]
  }'

# Set the agent's support email (a setting its skills read)
curl -X POST "https://api.wiro.ai/v1/UserAgent/CredentialUpsert" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "fields": [
      { "credentialkey": "var-support-email", "fieldname": "value", "fieldvalue": "support@example.com" }
    ]
  }'

# Read a credential's history
curl -X POST "https://api.wiro.ai/v1/UserAgent/CredentialFieldHistory" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "useragentguid": "your-useragent-guid", "credentialkey": "telegram" }'
```

### Wiro project (curl)

```bash
# Bind the Wiro project the agent runs models with (projectid from POST /Project/List)
curl -X POST "https://api.wiro.ai/v1/UserAgent/CredentialProjectBind" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "useragentguid": "your-useragent-guid", "projectid": "4821" }'

# Connectors (Shopify, Google Ads, Serper, ...) are not credentials:
# connect them with POST /UserAgent/ConnectorConnect (see Agent Connectors).
```

### Python

```python
import requests

API = "https://api.wiro.ai/v1"
headers = {"x-api-key": "YOUR_API_KEY", "Content-Type": "application/json"}
guid = "your-useragent-guid"

# Telegram: every required field in one call turns the channel on
res = requests.post(f"{API}/UserAgent/CredentialUpsert", headers=headers, json={
    "useragentguid": guid,
    "fields": [
        {"credentialkey": "telegram", "fieldname": "bottoken", "fieldvalue": "123456:ABC-DEF1234ghIkl"},
        {"credentialkey": "telegram", "fieldname": "allowedusers", "fieldvalue": ["123456789"]},
    ],
}).json()
print(res["result"], res.get("applied"), res["errors"])

# The Wiro project the agent runs models with
bind = requests.post(f"{API}/UserAgent/CredentialProjectBind", headers=headers,
                     json={"useragentguid": guid, "projectid": "4821"}).json()
print(bind.get("project"), bind.get("restart"))

# Which channels are on now
detail = requests.post(f"{API}/UserAgent/Detail", headers=headers, json={"guid": guid}).json()
print(detail["useragents"][0].get("enabledChannels"))
```

### Node.js

```javascript
const API = 'https://api.wiro.ai/v1';
const headers = { 'x-api-key': 'YOUR_API_KEY', 'Content-Type': 'application/json' };
const guid = 'your-useragent-guid';

const post = (path, body) =>
  fetch(`${API}${path}`, { method: 'POST', headers, body: JSON.stringify(body) }).then((r) => r.json());

// Telegram: every required field in one call turns the channel on
const saved = await post('/UserAgent/CredentialUpsert', {
  useragentguid: guid,
  fields: [
    { credentialkey: 'telegram', fieldname: 'bottoken', fieldvalue: '123456:ABC-DEF1234ghIkl' },
    { credentialkey: 'telegram', fieldname: 'allowedusers', fieldvalue: ['123456789'] },
  ],
});
console.log(saved.result, saved.applied, saved.errors);

// The Wiro project the agent runs models with
const bind = await post('/UserAgent/CredentialProjectBind', { useragentguid: guid, projectid: '4821' });
console.log(bind.project, bind.restart);
```
