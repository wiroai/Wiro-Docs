# Agent Overview

Deploy and manage autonomous AI agents through a single API.

## What are Wiro Agents?

Wiro Agents are autonomous AI assistants that run persistently in isolated containers. Unlike one-shot model runs, agents maintain conversation memory, connect to external services, and use tools to complete tasks on your behalf — all managed through the API.

The system has two layers:

- **Agent templates** (the catalog) — Pre-built agent definitions published by Wiro. Each template defines the agent's capabilities, required credentials, tools, and pricing. Browse the catalog with `POST /Agent/List`.
- **UserAgent instances** (your deployments) — When you deploy an agent template, Wiro creates a personal instance tied to your account. Each instance runs in its own container with its own credentials, configuration, conversation history, and billing.

Every instance is fully isolated. Your credentials, conversations, and data are never shared with other users.

## Base URL

```
https://api.wiro.ai/v1
```

## Authentication

Agents use the same authentication as the rest of the Wiro API. Include your key in every request:

| Method | Header |
|--------|--------|
| API Key | `x-api-key: YOUR_API_KEY` |
| Bearer Token | `Authorization: Bearer YOUR_API_KEY` |

**Public endpoints** — `Agent/List` and `Agent/Detail` are catalog endpoints and do not require authentication. You can browse available agents without an API key.

**Authenticated endpoints** — All `UserAgent/*` endpoints (Deploy, MyAgents, Detail, Update, Start, Stop, CreateExtraCreditCheckout, CancelSubscription, UpgradePlan, RenewSubscription) require a valid API key.

For full details, see [Authentication](/docs/authentication).

## Agent Lifecycle

Deploying and running an agent follows this flow:

1. **Browse** — call `POST /Agent/List` to discover available agents in the catalog
2. **Subscribe** — subscribe to a Starter or Pro plan using your prepaid wallet balance
3. **Deploy** — call `POST /UserAgent/Deploy` with the agent's guid and a title
4. **Configure** — if the agent requires credentials (API keys, OAuth tokens), call `POST /UserAgent/Update` to provide them. See [Agent Credentials](/docs/agent-credentials) for details
5. **Start** — call `POST /UserAgent/Start` to queue the agent for launch
6. **Running** — the agent's container starts and the agent becomes available for conversation
7. **Chat** — send messages via `POST /UserAgent/Message/Send`. See [Agent Messaging](/docs/agent-messaging) for the full messaging API

## UserAgent Statuses

Every deployed agent instance has a numeric status that reflects its current state:

| Status | Name | Description |
|--------|------|-------------|
| `0` | Stopped | Agent is not running. Call Start to launch it. |
| `1` | Stopping | Agent is shutting down. Wait for it to reach Stopped before taking action. |
| `2` | Queued | Agent is queued and waiting for a worker to pick it up. |
| `3` | Starting | A worker has accepted the agent and is spinning up the container. |
| `4` | Running | Agent is live and ready to receive messages. |
| `5` | Error | Agent encountered an error during execution. Call Start to retry. |
| `6` | Setup Required | Agent needs credentials or configuration before it can start. Call Update to provide them. |

### Automatic Restart (restartafter)

When you update an agent's configuration while it is **starting** (status `3`) or **running** (status `4`), the system automatically triggers a restart cycle: the agent is moved to **Stopping** (status `1`) with `restartafter` set to `true`. Once the container fully stops, the system automatically re-queues it, applying the new configuration on startup.

This means you can update credentials or settings on a running agent without manually stopping and starting it.

## Endpoints

### Browse the Catalog

#### **POST** /Agent/List

Lists available agents in the catalog. This is a **public endpoint** — no authentication required.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `search` | string | No | Full-text search across agent titles and descriptions |
| `category` | string | No | Filter by category (e.g. `"productivity"`, `"social-media"`) |
| `sort` | string | No | Sort column: `id`, `title`, `slug`, `status`, `createdat`, `updatedat`, `totalrun`, `activerun`. Default: `id` |
| `order` | string | No | Sort direction: `ASC` or `DESC`. Default: `DESC` |
| `limit` | number | No | Results per page (max 1000). Default: `20` |
| `start` | number | No | Offset for pagination. Default: `0` |

##### Response

```json
{
  "result": true,
  "errors": [],
  "total": 12,
  "agents": [
    {
      "id": 5,
      "guid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "title": "Instagram Manager",
      "slug": "instagram-manager",
      "headline": "Automate your Instagram presence with AI",
      "description": "An autonomous agent that manages your Instagram account...",
      "cover": "https://cdn.wiro.ai/uploads/agents/instagram-manager-cover.webp",
      "categories": ["social-media", "marketing"],
      "samples": ["https://cdn.wiro.ai/uploads/agents/instagram-manager-sample-1.webp"],
      "pricing": {
        "starter": { "price": 9, "credits": 1000 },
        "pro": { "price": 29, "credits": 5000 }
      },
      "skills": ["post_image", "reply_comment", "schedule_post"],
      "status": 1,
      "createdat": "1711929600",
      "updatedat": "1714521600"
    }
  ]
}
```

#### **POST** /Agent/Detail

Retrieves details for a single agent by guid or slug. This is a **public endpoint** — no authentication required.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `guid` | string | No* | Agent guid. |
| `slug` | string | No* | Agent slug (e.g. `"instagram-manager"`). |
| `type` | string | No | Pass `"full"` to receive the complete `configuration` tree (agent_skills, custom_skills, rateLimit, full credentials schema). Without `type: "full"`, the response returns a **trimmed** `configuration` object containing only `{ credentials }` (sanitized for template browsing). |

> **Note:** You must provide either `guid` or `slug`. If both are provided, `slug` takes priority. Pass `type: "full"` when you need the complete template (including `custom_skills` keys to preview before deploy); omit it for a lightweight catalog listing.

##### Response

```json
{
  "result": true,
  "errors": [],
  "agents": [
    {
      "id": 5,
      "guid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "title": "Instagram Manager",
      "slug": "instagram-manager",
      "headline": "Automate your Instagram presence with AI",
      "description": "An autonomous agent that manages your Instagram account...",
      "cover": "https://cdn.wiro.ai/uploads/agents/instagram-manager-cover.webp",
      "categories": ["social-media", "marketing"],
      "samples": ["https://cdn.wiro.ai/uploads/agents/instagram-manager-sample-1.webp"],
      "pricing": {
        "starter": { "price": 9, "credits": 1000 },
        "pro": { "price": 29, "credits": 5000 }
      },
      "skills": ["post_image", "reply_comment", "schedule_post"],
      "ratelimit": { "actionTypes": { "message": 10, "create": 5 } },
      "configuration": {
        "credentials": {
          "instagram": {
            "_editable": { "authMethod": true },
            "optional": false,
            "authMethod": "",
            "igUsername": "",
            "connectedAt": ""
          }
        }
      },
      "status": 1,
      "createdat": "1711929600",
      "updatedat": "1714521600"
    }
  ]
}
```

### Deploy & Manage

All endpoints below require authentication.

#### **POST** /UserAgent/Deploy

Creates a new agent instance from a catalog template.

> **For API integrations, always pass `useprepaid: true` + `plan`.** This is the only deploy mode that's fully programmatic — the subscription cost is deducted from your prepaid wallet immediately and the instance is created server-side in one call. Omitting `useprepaid` triggers the Stripe checkout flow (the panel's deploy path), which requires a user-facing browser redirect to Stripe's hosted checkout and is not suitable for API integrations. The sections below assume prepaid deploy.

Prepaid deploy (`useprepaid: true` + `plan`) charges your wallet immediately and creates the instance in status `6` (Setup Required). **`configuration.credentials` and `configuration.custom_skills` passed in the Deploy body are ignored on prepaid deploy** — after deploy, call `POST /UserAgent/Update` to set credentials and (optionally) customize skill content. Once credentials are complete, status auto-transitions to `0` (Stopped) and you can call `UserAgent/Start`.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `agentguid` | string | Yes | The guid of the agent template from the catalog. |
| `title` | string | Yes | Display name for your instance. |
| `description` | string | No | Optional description. |
| `useprepaid` | boolean | **Yes (for API use)** | Pass `true` to pay from wallet balance in a single server-side call. Omitting this (or passing `false`) activates the Stripe checkout flow — the response redirects to Stripe's hosted checkout UI, which only works for interactive browser sessions, not API integrations. |
| `plan` | string | Yes | Plan tier: `"starter"` or `"pro"`. Check `POST /Agent/Detail` → `agent.pricing` for each tier's credit allowance and price. |
| `pinned` | boolean | No | Whether the agent appears in the pinned agents list (defaults to `true`). Pass `false` when deploying agents programmatically for end users (e.g. bulk provisioning) so they don't clutter your admin dashboard. |

**Headers:** Standard API authentication — `x-api-key` for key-based projects, or `x-nonce` + `x-signature` for signature-based projects (see [Authentication](/docs/authentication)). For **team-scoped deploys** (when an end user deploys via a team project), pass `teamGUID: <team-guid>` as an additional request header; the API validates the caller is a member of that team before writing the instance row. Personal deployments omit this header.

> **`teamGUID` header usage across endpoints** — the requirement differs per endpoint:
>
> | Endpoint | `teamGUID` header |
> |----------|-------------------|
> | `UserAgent/Deploy` | Pass when deploying into a team project; validated against team membership before insert |
> | `UserAgent/Message/Send`, `Message/Detail`, `Message/History`, `Message/Sessions`, `Message/Cancel`, `Message/DeleteSession` | **Required for team agents.** Messaging endpoints call `validateAgentContext(teamGUID, ...)` and reject if the header is missing or doesn't match a team the caller belongs to |
> | `UserAgent/Detail`, `UserAgent/Update`, `UserAgent/Start`, `UserAgent/Stop`, `UserAgent/MyAgents` | Optional — these endpoints fall back to "am I a member of this agent's team?" check, so the header isn't strictly needed if your user already has team membership. Passing it is still recommended for explicitness and to avoid ambiguity on multi-team users |
> | `CancelSubscription`, `CreateExtraCreditCheckout`, `UpgradePlan`, `RenewSubscription` | **Required for team agents** — subscription/billing operations also validate team context explicitly |
>
> Personal (non-team) agents ignore this header. If you see `"You are not a member of this team"` or `"Agent not found"` errors on messaging endpoints, you're likely missing the header on a team agent.

> **Panel/UI note:** the non-prepaid Deploy mode (omit `useprepaid`) exists for the Wiro dashboard's interactive deploy flow where end users pay via Stripe subscription with a browser redirect. That path also accepts `configuration.credentials` and `configuration.custom_skills` in the body (merged via `mergeUserConfig`), but API integrations should always use prepaid deploy and set credentials with a follow-up `UserAgent/Update` call.

##### Request body (recommended API pattern)

```json
{
  "agentguid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "title": "My Instagram Bot",
  "useprepaid": true,
  "plan": "starter",
  "pinned": false
}
```

##### Response

```json
{
  "result": true,
  "errors": [],
  "useragents": [
    {
      "id": 47,
      "guid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
      "uuid": "your-user-uuid",
      "agentid": 5,
      "teamguid": null,
      "title": "My Instagram Bot",
      "description": null,
      "configuration": {
        "credentials": {
          "instagram": {
            "_editable": { "authMethod": true },
            "optional": false,
            "authMethod": "",
            "igUsername": "",
            "connectedAt": ""
          }
        }
      },
      "status": 6,
      "pinned": false,
      "createdat": 1714608000,
      "updatedat": 1714608000
    }
  ]
}
```

> **Note:** The Deploy response returns only the raw `useragents` row (with sanitized `configuration`). It does **not** include `setuprequired` or `subscription` — those are Detail-level fields assembled from joined tables. A prepaid subscription row (`agent-<plan>`, provider `prepaid`) is inserted server-side during prepaid deploy; call `POST /UserAgent/Detail` with the returned `guid` to see `setuprequired`, `subscription`, and `stripe*url` fields (if applicable).

The instance starts in status `6` (Setup Required). Next steps for the API integration flow:

1. Call `POST /UserAgent/Update` with the credentials the template declares. Inspect `configuration.credentials` in the Deploy response for the schema, or call `POST /UserAgent/Detail` with `type: "full"` first to see the complete credential list with `_editable` flags.
2. Once all non-optional credentials are populated, the server automatically flips status to `0` (Stopped).
3. Call `POST /UserAgent/Start` to launch the agent (status progresses `3` → `4`, Running).

> **Tip:** When deploying agents programmatically for your end users (e.g. one instance per customer), set `"pinned": false` to keep your own dashboard clean. Users can pin agents manually later.

#### **POST** /UserAgent/MyAgents

Lists all agent instances deployed under your account.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sort` | string | No | Sort column: `id`, `title`, `status`, `createdat`, `updatedat`, `startedat`, `runningat`, `stopdat`. Default: `id` |
| `order` | string | No | Sort direction: `ASC` or `DESC`. Default: `DESC` |
| `limit` | number | No | Results per page (max 1000). Default: `20` |
| `start` | number | No | Offset for pagination. Default: `0` |
| `category` | string | No | Filter by category |

> **Pagination:** the response does not include a `total` count. To know if there are more pages, call with `limit: 20` and inspect the returned array length — if it equals your `limit`, paginate further by incrementing `start` (e.g. `start: 20, 40, 60, ...`) until you get fewer rows than your `limit`.

##### Response

```json
{
  "result": true,
  "errors": [],
  "useragents": [
    {
      "id": 47,
      "guid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
      "agentid": 5,
      "title": "My Instagram Bot",
      "status": 4,
      "setuprequired": false,
      "subscription": {
        "plan": "agent-pro",
        "status": "active",
        "amount": 29,
        "currency": "usd",
        "currentperiodend": 1717200000,
        "renewaldate": "2026-06-01T00:00:00.000Z",
        "daysremaining": 62,
        "pendingdowngrade": null,
        "provider": "prepaid"
      },
      "agent": {
        "id": 5,
        "title": "Instagram Manager",
        "slug": "instagram-manager",
        "cover": "https://cdn.wiro.ai/uploads/agents/instagram-manager-cover.webp",
        "categories": ["social-media", "marketing"],
        "pricing": {
          "starter": { "price": 9, "credits": 1000 },
          "pro": { "price": 29, "credits": 5000 }
        }
      },
      "extracredits": 0,
      "extracreditsexpiry": null,
      "createdat": "1714608000",
      "updatedat": "1714694400",
      "startedat": "1714694400",
      "runningat": "1714694410"
    }
  ]
}
```

#### **POST** /UserAgent/Detail

Retrieves full details for a single deployed agent instance, including subscription info.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `guid` | string | Yes | Your UserAgent instance guid |

##### Response — prepaid instance (the API deploy pattern)

```json
{
  "result": true,
  "errors": [],
  "useragents": [
    {
      "id": 47,
      "guid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
      "uuid": "your-user-uuid",
      "agentid": 5,
      "teamguid": null,
      "title": "My Instagram Bot",
      "description": null,
      "status": 4,
      "pinned": false,
      "setuprequired": false,
      "configuration": {
        "credentials": {
          "instagram": {
            "_editable": { "authMethod": true },
            "optional": false,
            "authMethod": "wiro",
            "igUsername": "myaccount",
            "connectedAt": "2025-04-01T12:00:00.000Z"
          },
          "openai": {
            "_editable": { "apiKey": false, "model": false, "fallbacks": false, "cronModel": false },
            "optional": false,
            "model": "openai/gpt-5.2",
            "fallbacks": "openai/gpt-5-mini",
            "cronModel": "openai/gpt-5-mini"
          }
        },
        "custom_skills": [
          {
            "key": "content-tone",
            "description": "Content strategy, brand voice, and posting rules",
            "value": "## Brand Voice\nTone: friendly\nTarget Audience: ...",
            "enabled": true,
            "interval": null,
            "_editable": true
          },
          {
            "key": "cron-content-scanner",
            "description": "Content discovery with rotating strategies",
            "value": "",
            "enabled": true,
            "interval": "0 */4 * * *",
            "_editable": false
          }
        ],
        "skills": {
          "twitterx-post": true,
          "instagram-post": true,
          "wiro-generator": true
        },
        "rateLimit": {
          "monthlyCredits": 5000,
          "extraCredits": 2000,
          "actionTypes": { "message": 10, "create": 60, "modify": 20, "regenerate": 20 }
        }
      },
      "subscription": {
        "plan": "agent-pro",
        "status": "active",
        "amount": 29,
        "currency": "usd",
        "currentperiodend": 1717200000,
        "renewaldate": "2026-06-01T00:00:00.000Z",
        "daysremaining": 62,
        "pendingdowngrade": null,
        "provider": "prepaid"
      },
      "agent": {
        "id": 5,
        "title": "Instagram Manager",
        "slug": "instagram-manager",
        "cover": "https://cdn.wiro.ai/uploads/agents/instagram-manager-cover.webp",
        "categories": ["social-media", "marketing"],
        "pricing": {
          "starter": { "price": 9, "credits": 1000 },
          "pro": { "price": 29, "credits": 5000 }
        }
      },
      "extracredits": 2000,
      "extracreditsexpiry": 1730419200,
      "createdat": 1714608000,
      "updatedat": 1714694400,
      "startedat": 1714694400,
      "runningat": 1714694410
    }
  ]
}
```

##### Response — Stripe-subscription instance

The Stripe path (panel/UI deploy flow) adds three billing portal URLs; prepaid instances don't have these fields at all.

```json
{
  "result": true,
  "errors": [],
  "useragents": [
    {
      "id": 48,
      "guid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "uuid": "your-user-uuid",
      "agentid": 5,
      "title": "Stripe-subscribed Instagram Bot",
      "status": 4,
      "pinned": true,
      "setuprequired": false,
      "configuration": {
        "credentials": {
          "instagram": {
            "_editable": { "authMethod": true },
            "optional": false,
            "authMethod": "wiro",
            "igUsername": "myaccount",
            "connectedAt": "2025-04-01T12:00:00.000Z"
          },
          "openai": {
            "_editable": { "apiKey": false, "model": false, "fallbacks": false, "cronModel": false },
            "optional": false,
            "model": "openai/gpt-5.2",
            "fallbacks": "openai/gpt-5-mini",
            "cronModel": "openai/gpt-5-mini"
          }
        },
        "custom_skills": [
          {
            "key": "content-tone",
            "description": "Content strategy, brand voice, and posting rules",
            "value": "## Brand Voice\nTone: friendly\nTarget Audience: ...",
            "enabled": true,
            "interval": null,
            "_editable": true
          },
          {
            "key": "cron-content-scanner",
            "description": "Content discovery with rotating strategies",
            "value": "",
            "enabled": true,
            "interval": "0 */4 * * *",
            "_editable": false
          }
        ],
        "skills": {
          "twitterx-post": true,
          "instagram-post": true,
          "wiro-generator": true
        },
        "rateLimit": {
          "monthlyCredits": 5000,
          "extraCredits": 2000,
          "actionTypes": { "message": 10, "create": 60, "modify": 20, "regenerate": 20 }
        }
      },
      "subscription": {
        "plan": "agent-pro",
        "status": "active",
        "amount": 29,
        "currency": "usd",
        "currentperiodend": 1717200000,
        "renewaldate": "2026-06-01T00:00:00.000Z",
        "daysremaining": 62,
        "pendingdowngrade": null,
        "provider": "stripe"
      },
      "agent": {
        "id": 5,
        "title": "Instagram Manager",
        "slug": "instagram-manager",
        "cover": "https://cdn.wiro.ai/uploads/agents/instagram-manager-cover.webp",
        "categories": ["social-media", "marketing"],
        "pricing": {
          "starter": { "price": 9, "credits": 1000 },
          "pro": { "price": 29, "credits": 5000 }
        }
      },
      "extracredits": 0,
      "extracreditsexpiry": null,
      "stripeportalurl": "https://billing.stripe.com/p/session/xxxxxxxx",
      "stripeupdateurl": "https://billing.stripe.com/p/session/xxxxxxxx/subscriptions/update",
      "stripecancelurl": "https://billing.stripe.com/p/session/xxxxxxxx/subscriptions/cancel",
      "createdat": 1714608000,
      "updatedat": 1714694400,
      "startedat": 1714694400,
      "runningat": 1714694410
    }
  ]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `guid` | `string` | Unique identifier for this agent instance. |
| `agentid` | `number` | The catalog agent ID this instance was deployed from. |
| `title` | `string` | Display name you gave this instance. |
| `status` | `number` | Current status code (see UserAgent Statuses). |
| `setuprequired` | `boolean` | `true` if credentials are missing or incomplete. |
| `configuration` | `object` | Sanitized `{ credentials, custom_skills, skills, agent_skills }` — non-editable sensitive fields (OAuth access tokens, platform `wiro.apiKey`, `openai.apiKey`, etc.) are hidden. Use this to see current credential values (user-editable ones populated, platform-managed ones blank) and custom_skills with their `_editable` flags. |
| `subscription` | `object\|null` | Active subscription info, or `null` if no subscription. |
| `agent` | `object` | Parent agent template info (title, slug, cover, pricing). |
| `extracredits` | `number` | Remaining extra credits purchased for this instance. |
| `extracreditsexpiry` | `number\|null` | Unix timestamp when the earliest extra credit pack expires. |
| `stripeportalurl` | `string\|undefined` | **Stripe-only.** One-shot Stripe billing portal session URL for the customer to self-serve payment method / invoices. Only present when `subscription.provider === "stripe"` and the subscription is active. Omitted for prepaid instances. |
| `stripeupdateurl` | `string\|undefined` | **Stripe-only.** Deep link into the billing portal's subscription-update flow (plan change). Same conditions as `stripeportalurl`. |
| `stripecancelurl` | `string\|undefined` | **Stripe-only.** Deep link into the billing portal's cancellation flow. Same conditions as `stripeportalurl`. Use this URL for the "Cancel subscription" button — do NOT call `POST /UserAgent/CancelSubscription` on Stripe subscriptions (it returns an error telling you to use the portal). |
| `subscription.provider` | `string` | Payment provider: `"prepaid"` (credits wallet) or `"stripe"` (subscription). |

#### **POST** /UserAgent/Update

Updates an agent instance's configuration, title, or description. If the agent is currently **starting (status `3`)** or **running (status `4`)**, this triggers an automatic restart to apply the new settings (the agent is moved to Stopping with `restartafter: true`, and re-queued after it fully stops).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `guid` | string | Yes | Your UserAgent instance guid |
| `title` | string | No | New display name |
| `description` | string | No | New description |
| `categories` | array | No | Updated categories. Cannot be empty if provided. |
| `configuration` | object | No | Updated credentials. Format: `{ "credentials": { "key": "value" } }` |

> **Note:** If the agent's status is `6` (Setup Required) and the update completes all required credentials, the status automatically changes to `0` (Stopped), allowing you to start it.

##### Response

```json
{
  "result": true,
  "errors": [],
  "useragents": [
    {
      "id": 47,
      "guid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
      "uuid": "your-user-uuid",
      "agentid": 5,
      "title": "My Instagram Bot",
      "description": null,
      "status": 0,
      "pinned": false,
      "setuprequired": false,
      "configuration": {
        "credentials": {
          "instagram": {
            "_editable": { "authMethod": true },
            "authMethod": "wiro",
            "igUsername": "myaccount",
            "connectedAt": "2025-04-01T12:00:00.000Z"
          }
        },
        "custom_skills": [
          {
            "key": "content-tone",
            "description": "Content strategy, brand voice, and posting rules",
            "value": "## Brand Voice\nTone: friendly\nTarget Audience: ...",
            "enabled": true,
            "interval": null,
            "_editable": true
          },
          {
            "key": "cron-content-scanner",
            "description": "Content discovery with rotating strategies",
            "value": "",
            "enabled": true,
            "interval": "0 */4 * * *",
            "_editable": false
          }
        ],
        "skills": { "instagram-post": true }
      },
      "agent": {
        "id": 5,
        "title": "Instagram Manager",
        "slug": "instagram-manager",
        "pricing": {
          "starter": { "price": 9, "credits": 1000 },
          "pro": { "price": 29, "credits": 5000 }
        }
      },
      "createdat": 1714608000,
      "updatedat": 1714694400
    }
  ]
}
```

Returns the updated instance (same `configuration` sanitization as `Detail`) plus the `setuprequired` flag and `agent` summary. No `subscription` — call `UserAgent/Detail` for that.

#### **POST** /UserAgent/Start

Starts a stopped agent instance. The agent is moved to Queued (status `2`) and picked up by a worker. Also valid for agents in Error state (`5`) — Start re-queues them for another launch attempt.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `guid` | string | Yes | Your UserAgent instance guid |

##### Response

```json
{
  "result": true,
  "errors": [],
  "useragents": []
}
```

> `useragents` is always returned (empty array on Start) because the endpoint uses the shared `UserAgentResultModel` — just `result` and `errors` carry the outcome here.

Start will fail (returns `{ "result": false, "errors": [...] }`) if:
- The agent is already running or queued
- The agent is currently stopping
- Setup is incomplete (status `6`)
- No active subscription exists
- No credits remain (monthly or extra)

#### **POST** /UserAgent/Stop

Stops a running agent instance. If the agent is Queued (status `2`), it is immediately set to Stopped. If it is Starting or Running (status `3`/`4`), it moves to Stopping (status `1`) and the container is shut down gracefully.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `guid` | string | Yes | Your UserAgent instance guid |

##### Response

```json
{
  "result": true,
  "errors": [],
  "useragents": []
}
```

#### **POST** /UserAgent/CreateExtraCreditCheckout

Purchases additional credits for a Pro plan agent.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentGuid` | string | Yes | Your UserAgent instance guid |
| `pack` | string | Yes | Credit pack: `package1`, `package2`, or `package3` |
| `useprepaid` | boolean | No | Set to `true` to pay from wallet balance (no redirect, credits added immediately). Omit or `false` to get a Stripe checkout URL instead. |

##### Request

```json
{
  "useragentGuid": "your-guid",
  "pack": "package2",
  "useprepaid": true
}
```

##### Response (prepaid)

```json
{
  "result": true,
  "url": null,
  "errors": []
}
```

##### Response (Stripe checkout)

Omit `useprepaid` (or set it to `false`) to get a Stripe Checkout URL instead.

```json
{
  "result": true,
  "url": "https://checkout.stripe.com/c/pay/...",
  "errors": []
}
```

When `useprepaid: true` succeeds, credits are added immediately from your wallet balance. When `useprepaid` is omitted, the returned `url` is a Stripe Checkout session you redirect the user to. Credits expire 6 months after purchase regardless of payment method.

#### **POST** /UserAgent/CancelSubscription

Cancels a **prepaid** subscription at the end of the current billing period. The agent remains active until the period ends.

**Stripe subscriptions must be cancelled via the Stripe billing portal** — calling this endpoint on a Stripe-backed subscription returns `Stripe subscriptions must be cancelled via Stripe portal`.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `guid` | string | Yes | Your UserAgent instance guid |

##### Response

```json
{
  "result": true,
  "cancelsAt": 1717200000,
  "errors": []
}
```

The `cancelsAt` field is the Unix timestamp when the subscription will expire. The agent continues running until this date. You can reverse the cancellation by calling RenewSubscription before the period ends.

#### **POST** /UserAgent/UpgradePlan

Upgrades a Starter subscription to Pro. The prorated cost for the remaining days is deducted from your wallet.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `guid` | string | Yes | Your UserAgent instance guid |
| `plan` | string | Yes | Target plan: `"pro"` (only starter-to-pro upgrade is supported) |

##### Response

```json
{
  "result": true,
  "plan": "agent-pro",
  "proratedCharge": 11.33,
  "newMonthlyCredits": 5000,
  "errors": []
}
```

Downgrades are not supported. To change from Pro to Starter, cancel and re-deploy.

#### **POST** /UserAgent/RenewSubscription

Renews an expired subscription or reverses a pending cancellation. The renewal cost is deducted from your wallet.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `guid` | string | Yes | Your UserAgent instance guid |

##### Response (renewal)

```json
{
  "result": true,
  "action": "renewed",
  "plan": "agent-starter",
  "amount": 49,
  "errors": []
}
```

##### Response (undo cancel)

When called on an active subscription with a pending cancellation:

```json
{
  "result": true,
  "action": "undo-cancel",
  "errors": []
}
```

After renewal, the agent status is reset to `0` (Stopped). Call Start to launch it again. Monthly credits are refreshed for the new billing period.

## Agent Pricing

Agent pricing is subscription-based, billed monthly. Subscriptions are paid from your prepaid wallet balance:

| Feature | Starter | Pro |
|---------|---------|-----|
| Monthly price | Varies by agent (e.g. $9/mo) | Varies by agent (e.g. $29/mo) |
| Monthly credits | Included (e.g. 1,000) | Included (e.g. 5,000) |
| Extra credit packs | Not available | Available (expire in 6 months) |
| Plan upgrade | Upgrade to Pro anytime | — |

Each agent in the catalog defines its own pricing tiers in the `pricing` field. Check the `Agent/Detail` response for exact prices and credit amounts.

### Payment Method

All subscriptions use your **prepaid wallet balance**. The cost is deducted immediately when you deploy or renew. Subscriptions renew automatically if your wallet has sufficient balance; otherwise the subscription expires. Manage subscriptions through the CancelSubscription, UpgradePlan, and RenewSubscription endpoints.

Credits are consumed by the agent runtime (container) as it processes messages and generates content — not at `Message/Send` time. Each `configuration.rateLimit.actionTypes` entry (message, create, modify, regenerate) defines how many credits a specific action costs; the container reports usage back to Wiro asynchronously. The API-side check is gating only: `POST /UserAgent/Start` refuses to launch if `monthlyCredits + extraCredits <= 0`. During an active session, monthly credits are deducted first; once they hit zero, extra credits (purchased via `CreateExtraCreditCheckout`) are used. When both pools are empty, the agent responds `[SYSTEM_CREDIT_LIMIT_REACHED]` and stops processing further actions. Credits reset on each billing cycle (next `currentperiodend`) or when extra credits are topped up.

## Error Messages

Agent-specific errors you may encounter:

| Error | When |
|-------|------|
| `Agent not found` | The `agentguid` or `slug` does not match any catalog agent |
| `User agent not found` | The `guid` does not match any of your deployed instances |
| `Agent not found or inactive` | The catalog agent exists but is disabled |
| `Active subscription required to start agent. Please renew your subscription.` | No active subscription for this instance |
| `Agent setup is not complete. Please fill in your credentials before starting.` | Status is `6` — call Update to provide required credentials |
| `Agent is already running` | Start called on an agent with status `3` or `4` |
| `Agent is already queued to start` | Start called on an agent with status `2` |
| `Agent is already stopped` | Stop called on an agent with status `0` |
| `Agent is currently stopping, please wait` | Start called on an agent with status `1` |
| `Agent is in error state, use Start to retry` | Stop called on an agent with status `5` |
| `No credits available. Please renew your subscription or purchase extra credits.` | Monthly and extra credits are both exhausted |
| `Extra credits are available only for Pro plan subscribers. Please upgrade your plan.` | CreateExtraCreditCheckout called on a Starter plan |
| `Invalid pack. Choose package1, package2, or package3.` | CreateExtraCreditCheckout with invalid pack |
| `Active subscription required to purchase extra credits.` | CreateExtraCreditCheckout without subscription |
| `Extra credit pack not available for this agent.` | Agent pricing doesn't define the pack |
| `Categories cannot be empty` | Update with empty categories |
| `Agent not found or access denied` | Message endpoint with invalid useragentguid |
| `Agent is not running. Current status: {n}` | Message/Send when not running |
| `Message not found` | Detail/Cancel with invalid messageguid |
| `Message cannot be cancelled (status: {status})` | Cancel on completed message |
| `Invalid redirect URL` | OAuth Connect with non-HTTPS URL |
| `Subscription is already active` | RenewSubscription called when subscription is already active without pending cancel |
| `No expired subscription found to renew` | RenewSubscription called with no expired subscription |
| `Insufficient wallet balance. Required: $X, Available: $Y` | Prepaid operation with insufficient funds |
| `Cannot downgrade from Pro to Starter. Cancel your subscription instead.` | UpgradePlan with downgrade attempt |
| `Stripe subscriptions must be cancelled via Stripe portal` | CancelSubscription called on a Stripe-backed subscription |
| `Valid plan required when using prepaid (starter or pro)` | Deploy with useprepaid but missing/invalid plan |
| `Pricing not available for this plan` | Deploy with useprepaid for agent without pricing |
| `Renewal pricing not available` | RenewSubscription for agent with zero pricing |

## Code Examples

### curl

```bash
# List available agents (no auth required)
curl -X POST "https://api.wiro.ai/v1/Agent/List" \
  -H "Content-Type: application/json" \
  -d '{"limit": 10}'

# Get agent details by slug (no auth required)
curl -X POST "https://api.wiro.ai/v1/Agent/Detail" \
  -H "Content-Type: application/json" \
  -d '{"slug": "instagram-manager"}'

# Deploy a new agent instance (prepaid, pinned by default)
curl -X POST "https://api.wiro.ai/v1/UserAgent/Deploy" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "agentguid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "title": "My Instagram Bot",
    "useprepaid": true,
    "plan": "starter"
  }'

# Deploy for an end user (unpinned, won't clutter your dashboard)
curl -X POST "https://api.wiro.ai/v1/UserAgent/Deploy" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "agentguid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "title": "Customer #1234 Bot",
    "useprepaid": true,
    "plan": "starter",
    "pinned": false
  }'

# Cancel a subscription (cancels at end of billing period)
curl -X POST "https://api.wiro.ai/v1/UserAgent/CancelSubscription" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{"guid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321"}'

# Upgrade starter to pro
curl -X POST "https://api.wiro.ai/v1/UserAgent/UpgradePlan" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{"guid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321", "plan": "pro"}'

# Renew expired subscription
curl -X POST "https://api.wiro.ai/v1/UserAgent/RenewSubscription" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{"guid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321"}'

# Buy extra credits with prepaid wallet
curl -X POST "https://api.wiro.ai/v1/UserAgent/CreateExtraCreditCheckout" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{"useragentGuid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321", "pack": "package1", "useprepaid": true}'

# Start an agent
curl -X POST "https://api.wiro.ai/v1/UserAgent/Start" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{"guid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321"}'

# Get agent instance details
curl -X POST "https://api.wiro.ai/v1/UserAgent/Detail" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{"guid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321"}'

# Update credentials on a running agent (triggers automatic restart)
curl -X POST "https://api.wiro.ai/v1/UserAgent/Update" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "guid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321",
    "configuration": {
      "credentials": {
        "instagram": { "authMethod": "wiro" }
      }
    }
  }'

# Stop an agent
curl -X POST "https://api.wiro.ai/v1/UserAgent/Stop" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{"guid": "f8e7d6c5-b4a3-2190-fedc-ba0987654321"}'
```

### Python

```python
import requests

headers = {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
}

# List available agents (no auth required)
catalog = requests.post(
    "https://api.wiro.ai/v1/Agent/List",
    json={"limit": 10}
).json()
for agent in catalog["agents"]:
    print(f"{agent['title']} ({agent['slug']})")

# Get agent details by slug
detail = requests.post(
    "https://api.wiro.ai/v1/Agent/Detail",
    json={"slug": "instagram-manager"}
).json()
agent = detail["agents"][0]
print(f"Credentials needed: {list(agent['configuration']['credentials'].keys())}")

# Deploy a new instance
deploy = requests.post(
    "https://api.wiro.ai/v1/UserAgent/Deploy",
    headers=headers,
    json={
        "agentguid": agent["guid"],
        "title": "My Instagram Bot",
        "useprepaid": True,
        "plan": "starter"
    }
).json()
instance_guid = deploy["useragents"][0]["guid"]
print(f"Deployed: {instance_guid}")

# Update credentials
requests.post(
    "https://api.wiro.ai/v1/UserAgent/Update",
    headers=headers,
    json={
        "guid": instance_guid,
        "configuration": {
            "credentials": {
                "instagram": { "authMethod": "wiro" }
            }
        }
    }
)

# Start the agent
requests.post(
    "https://api.wiro.ai/v1/UserAgent/Start",
    headers=headers,
    json={"guid": instance_guid}
)

# Check status
import time
while True:
    resp = requests.post(
        "https://api.wiro.ai/v1/UserAgent/Detail",
        headers=headers,
        json={"guid": instance_guid}
    ).json()
    status = resp["useragents"][0]["status"]
    print(f"Status: {status}")
    if status == 4:
        print("Agent is running!")
        break
    if status == 5:
        print("Agent errored")
        break
    time.sleep(5)

# List your deployed agents
my_agents = requests.post(
    "https://api.wiro.ai/v1/UserAgent/MyAgents",
    headers=headers,
    json={"limit": 50}
).json()
for ua in my_agents["useragents"]:
    print(f"{ua['title']} - status: {ua['status']}")

# Stop the agent
requests.post(
    "https://api.wiro.ai/v1/UserAgent/Stop",
    headers=headers,
    json={"guid": instance_guid}
)
```

### Node.js

```javascript
const axios = require('axios');

const headers = {
  'x-api-key': 'YOUR_API_KEY',
  'Content-Type': 'application/json'
};

async function main() {
  // List available agents (no auth required)
  const catalog = await axios.post(
    'https://api.wiro.ai/v1/Agent/List',
    { limit: 10 }
  );
  catalog.data.agents.forEach(a => console.log(`${a.title} (${a.slug})`));

  // Get agent details by slug
  const detail = await axios.post(
    'https://api.wiro.ai/v1/Agent/Detail',
    { slug: 'instagram-manager' }
  );
  const agent = detail.data.agents[0];

  // Deploy a new instance
  const deploy = await axios.post(
    'https://api.wiro.ai/v1/UserAgent/Deploy',
    { agentguid: agent.guid, title: 'My Instagram Bot', useprepaid: true, plan: 'starter' },
    { headers }
  );
  const instanceGuid = deploy.data.useragents[0].guid;
  console.log('Deployed:', instanceGuid);

  // Update credentials
  await axios.post(
    'https://api.wiro.ai/v1/UserAgent/Update',
    {
      guid: instanceGuid,
      configuration: {
        credentials: {
          instagram: { authMethod: 'wiro' }
        }
      }
    },
    { headers }
  );

  // Start the agent
  await axios.post(
    'https://api.wiro.ai/v1/UserAgent/Start',
    { guid: instanceGuid },
    { headers }
  );

  // Poll until running
  while (true) {
    const resp = await axios.post(
      'https://api.wiro.ai/v1/UserAgent/Detail',
      { guid: instanceGuid },
      { headers }
    );
    const status = resp.data.useragents[0].status;
    console.log('Status:', status);
    if (status === 4) { console.log('Agent is running!'); break; }
    if (status === 5) { console.log('Agent errored'); break; }
    await new Promise(r => setTimeout(r, 5000));
  }

  // Stop the agent
  await axios.post(
    'https://api.wiro.ai/v1/UserAgent/Stop',
    { guid: instanceGuid },
    { headers }
  );
}

main();
```

### PHP

```php
<?php
$apiKey = "YOUR_API_KEY";

// List available agents (no auth required)
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, "https://api.wiro.ai/v1/Agent/List");
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ["Content-Type: application/json"]);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(["limit" => 10]));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$catalog = json_decode(curl_exec($ch), true);
curl_close($ch);

// Deploy a new instance
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, "https://api.wiro.ai/v1/UserAgent/Deploy");
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Content-Type: application/json",
    "x-api-key: $apiKey"
]);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
    "agentguid" => "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "title" => "My Instagram Bot",
    "useprepaid" => true,
    "plan" => "starter"
]));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$deploy = json_decode(curl_exec($ch), true);
curl_close($ch);
echo "Deployed: " . $deploy["useragents"][0]["guid"];
```

### C#

```csharp
using var client = new HttpClient();
client.DefaultRequestHeaders.Add("x-api-key", "YOUR_API_KEY");

// Deploy a new instance
var deployContent = new StringContent(
    JsonSerializer.Serialize(new {
        agentguid = "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        title = "My Instagram Bot",
        useprepaid = true,
        plan = "starter"
    }),
    Encoding.UTF8, "application/json");

var deployResp = await client.PostAsync(
    "https://api.wiro.ai/v1/UserAgent/Deploy", deployContent);
var deployResult = await deployResp.Content.ReadAsStringAsync();
Console.WriteLine(deployResult);

// Start the agent
var startContent = new StringContent(
    JsonSerializer.Serialize(new {
        guid = "f8e7d6c5-b4a3-2190-fedc-ba0987654321"
    }),
    Encoding.UTF8, "application/json");

var startResp = await client.PostAsync(
    "https://api.wiro.ai/v1/UserAgent/Start", startContent);
Console.WriteLine(await startResp.Content.ReadAsStringAsync());
```

### Go

```go
package main

import (
    "bytes"
    "encoding/json"
    "fmt"
    "net/http"
    "io"
)

func main() {
    // Deploy a new instance
    body, _ := json.Marshal(map[string]interface{}{
        "agentguid":  "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "title":      "My Instagram Bot",
        "useprepaid": true,
        "plan":       "starter",
    })
    req, _ := http.NewRequest("POST",
        "https://api.wiro.ai/v1/UserAgent/Deploy",
        bytes.NewBuffer(body))
    req.Header.Set("Content-Type", "application/json")
    req.Header.Set("x-api-key", "YOUR_API_KEY")

    resp, _ := http.DefaultClient.Do(req)
    defer resp.Body.Close()
    data, _ := io.ReadAll(resp.Body)
    fmt.Println(string(data))
}
```

### Swift

```swift
import Foundation

let url = URL(string: "https://api.wiro.ai/v1/UserAgent/Deploy")!
var request = URLRequest(url: url)
request.httpMethod = "POST"
request.setValue("application/json",
    forHTTPHeaderField: "Content-Type")
request.setValue("YOUR_API_KEY",
    forHTTPHeaderField: "x-api-key")
request.httpBody = try! JSONSerialization.data(
    withJSONObject: [
        "agentguid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "title": "My Instagram Bot",
        "useprepaid": true,
        "plan": "starter"
    ])

let (data, _) = try await URLSession.shared
    .data(for: request)
print(String(data: data, encoding: .utf8)!)
```

### Kotlin

```kotlin
import java.net.HttpURLConnection
import java.net.URL

val url = URL("https://api.wiro.ai/v1/UserAgent/Deploy")
val conn = url.openConnection() as HttpURLConnection
conn.requestMethod = "POST"
conn.setRequestProperty("Content-Type", "application/json")
conn.setRequestProperty("x-api-key", "YOUR_API_KEY")
conn.doOutput = true
conn.outputStream.write("""{
    "agentguid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "title": "My Instagram Bot",
    "useprepaid": true,
    "plan": "starter"
}""".toByteArray())

val response = conn.inputStream.bufferedReader().readText()
println(response)
```

### Dart

```dart
import 'dart:convert';
import 'package:http/http.dart' as http;

final response = await http.post(
  Uri.parse('https://api.wiro.ai/v1/UserAgent/Deploy'),
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'YOUR_API_KEY',
  },
  body: jsonEncode({
    'agentguid': 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'title': 'My Instagram Bot',
    'useprepaid': true,
    'plan': 'starter',
  }),
);
print(response.body);
```

## What's Next

- [Agent Messaging](/docs/agent-messaging) — Send messages and receive responses from running agents
- [Agent Credentials](/docs/agent-credentials) — Integration catalog hub: 20+ dedicated per-provider setup guides (Meta Ads, Facebook, Instagram, LinkedIn, Twitter, and more)
- [Authentication](/docs/authentication) — API key setup and authentication methods
- [Pricing](/docs/pricing) — General pricing information
