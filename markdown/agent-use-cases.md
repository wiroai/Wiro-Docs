# Agent Use Cases

Build products with autonomous AI agents using the Wiro API.

## See These Use Cases on the Web

Wiro publishes interactive, fullscreen showcases for the most common agent use cases. Each one walks through a real product story end-to-end — build, deploy, daily operation, brand-voice authoring, scheduled autopilot, and a self-healing climax under an upstream API break — so you can see what the patterns below look like before writing any code.

| Showcase | What you'll see |
|----------|-----------------|
| **[Ad Campaign Manager](https://wiro.ai/agents/usecase/ad-campaign-agent)** | Drape Studio (bespoke tailoring) running Google Ads + Meta Ads on autopilot — Brand Voice + Budget Control as plain-English skills, AI video ads, OAuth publish, Day-3 auto-pause, weekly review, and a self-heal under the Google Ads API v14 sunset. |
| **[App Event Manager](https://wiro.ai/agents/usecase/app-event-agent)** | Nova (creative video + effects app) — Calendarific holiday scan across 7 markets, Nano Banana Pro dual-aspect covers, multi-language event copy, App Store Connect publish, autonomous monthly briefing, self-heal under a 503. |
| **[App Review Replies](https://wiro.ai/agents/usecase/app-review-agent)** | Prism (photo + video editor) — App Store + Google Play replies, Brand Voice + Reply Policy markdown skills, multilingual drafts, dev-team Slack escalation for 1★ crashes, monthly sentiment report, self-heal under token expiry. |
| **[Barber Booking](https://wiro.ai/agents/usecase/barber-booking-agent)** | Scissor Hands salon — WhatsApp + Google Calendar bookings, multi-staff routing with role-based privacy, customer memory, scheduled daily/monthly digests, self-heal under a Calendar API break. |
| **[Customer Win-Back](https://wiro.ai/agents/usecase/customer-winback-agent)** | Swift Sweep (chimney + fireplace service) — HubSpot CRM segmentation, Brand Voice + Customer Scorer + Seasonal Reminder as markdown skills, AI seasonal covers, batch WhatsApp send, scheduled autumn run, self-heal under a HubSpot v2 → v3 contacts API deprecation. |
| **[Ecommerce Listings](https://wiro.ai/agents/usecase/ecommerce-listing-agent)** | Coral & Crest (swimwear) — 5 Wiro AI models (Virtual Try-On, Product-on-Model, Background Remover, Cover Image, Description), multilingual copy, auto-publish to WordPress + Instagram + Shopify, 84-product Google-Drive bulk-autonomy climax. |
| **[Restaurant Reviews](https://wiro.ai/agents/usecase/restaurant-review-agent)** | Green Bottle Coffee — daily chat-based approvals, scheduled reports, anomaly dispatch, self-heal under a Reviews API deprecation. The "no pitch deck required" demo. |

You can also browse every available pre-built agent at [wiro.ai/agents/browse](https://wiro.ai/agents/browse) (the visual mirror of [`POST /Agent/List`](/docs/agent-overview#post-agentlist)). Each agent template has its own marketing page at `wiro.ai/agents/{slug}` — for example [wiro.ai/agents/social-manager](https://wiro.ai/agents/social-manager), [wiro.ai/agents/voice-receptionist](https://wiro.ai/agents/voice-receptionist), or [wiro.ai/agents/blog-content-editor](https://wiro.ai/agents/blog-content-editor) — with screenshots, default skills, credential requirements, and live tier pricing. The full URL for each agent in the [Available Agents](#available-agents) table below is `https://wiro.ai/agents/{slug}`.

## Two Deployment Patterns

Every product built on Wiro agents follows one of two patterns. Choosing the right one depends on whether your users need to connect their own third-party accounts.

### Pattern 1: Instance Per Customer

Most agents interact with external services — posting to social media, managing ad campaigns, sending emails. These require OAuth tokens or API keys that belong to the end user. Deploy a **separate agent instance** for each of your customers.

**Why:** Each customer connects their own accounts. Credentials are bound to the instance, isolated from other customers.

**How:** Call `POST /UserAgent/Deploy` once per customer, then use the [OAuth flow](/docs/agent-credentials) to connect their accounts.

#### Real-World Examples

| Your Product | Agent Type | Why Per-Customer |
|-------------|-----------|-----------------|
| Digital marketing agency dashboard | [Social Manager](https://wiro.ai/agents/social-manager) | Each client connects their own Twitter, Instagram, Facebook, TikTok, LinkedIn |
| Mobile app company | [App Review Support](https://wiro.ai/agents/app-review-support) | Each app has its own App Store / Google Play credentials |
| E-commerce platform | [Google Ads Manager](https://wiro.ai/agents/google-ads-manager) + [Meta Ads Manager](https://wiro.ai/agents/meta-ads-manager) | Each advertiser connects their own ad accounts |
| Marketing SaaS | [Newsletter Manager](https://wiro.ai/agents/newsletter-manager) | Each customer connects their own Brevo/SendGrid/Mailchimp |
| Sales platform | [Lead Generation Manager](https://wiro.ai/agents/lead-gen-manager) | Each sales team connects their own Apollo/Lemlist |
| Content agency tool | [Blog Content Editor](https://wiro.ai/agents/blog-content-editor) | Each client connects their own WordPress site |
| App publisher platform | [App Event Manager](https://wiro.ai/agents/app-event-manager) | Each app has its own App Store credentials |
| Mobile app publisher | [Push Notification Manager](https://wiro.ai/agents/push-notification-manager) | Each app has its own Firebase service account |
| Customer engagement tool | [Social Manager](https://wiro.ai/agents/social-manager) | Each brand manages their own social presence |
| Phone-receptionist platform for SMBs | [Voice Receptionist](https://wiro.ai/agents/voice-receptionist) | Each business has its own Twilio number, HubSpot CRM, and Google Calendar |

### Pattern 2: Session Per User

For conversational agents that don't need per-user credentials. One agent instance serves many users, each identified by a unique `sessionkey` that isolates their conversation history.

**Why:** No third-party accounts to connect. The agent answers questions using its built-in knowledge or pre-configured data sources.

**How:** Deploy one instance via `POST /UserAgent/Deploy`, then send messages with different `sessionkey` values per user.

**About `sessionkey`:** This field is optional — if omitted, messages go into a shared `"default"` session. Reuse the same `sessionkey` to continue a conversation (the agent retrieves prior messages as context). Use a fresh UUID to start a new conversation. The common convention is one `sessionkey` per end-user (e.g. `"user-456"`), but you can also use it per-thread (e.g. `"ticket-2025-0817"`) for products that group conversations by topic. See the [Agent Messaging](/docs/agent-messaging) guide for how sessions work.

#### Real-World Examples

| Your Product | Use Case | Why Sessions |
|-------------|---------|-------------|
| Knowledge base chatbot | Answer questions from documentation | No per-user credentials needed |
| Product recommendation advisor | Suggest products based on conversation | Same catalog for all users |
| Internal company assistant | HR policies, IT help, onboarding | Shared knowledge base |
| Customer support bot | Handle common support questions | No external service connections |

### When to Use Which

| Question | Instance Per Customer | Session Per User |
|---------|----------------------|-----------------|
| Does each user connect their own social/ad/email accounts? | Yes | No |
| Do credentials differ between users? | Yes | No |
| Is conversation the primary interaction? | Sometimes | Always |
| Does the agent perform actions on behalf of the user? | Yes | Rarely |
| How many instances do you need? | One per customer | One total (or a few) |

### Hybrid Pattern

A single product can combine both — a per-customer action agent plus a shared conversational agent sit side by side in the same frontend. For example:

- One **Social Manager** instance per customer (Pattern 1) to publish posts with their own OAuth-connected accounts.
- One **shared knowledge-base chat** agent (Pattern 2) that answers product, billing, or onboarding questions across all customers, using `sessionkey` to keep each user's chat separate.

The two agents are independent deployments with different `useragentguid` values. Route user actions to the per-customer instance, and chat questions to the shared instance. Your backend decides which agent handles each request.

## Building Your Product

### White-Label Chat

Build a fully branded chat experience with no Wiro UI visible to your users.

The deploy flow has three stages — Deploy, Setup (only when the agent needs third-party credentials), and Start:

1. **Deploy** an agent via `POST /UserAgent/Deploy` — returns `useragents[0].guid` and starts the instance in `status: 6` (setup-required) or `status: 0` (ready) depending on whether the template needs credentials.
2. **Setup** the credentials (only if the agent template requires them) via one or more `POST /UserAgent/CredentialUpsert` calls and the matching OAuth flows — see [Agent Credentials & OAuth](/docs/agent-credentials). Check `setuprequired` on the response: while it's `true`, the agent cannot start. Once all required credential slots are filled, `setuprequired` flips to `false` and `status` becomes `0`. For Pattern 2 (knowledge-base / chat-only agents) there are no third-party credentials, so this stage is skipped and the agent is ready to start right after Deploy.
3. **Start** the agent with `POST /UserAgent/Start` — transitions through `status: 3` (starting) → `status: 4` (running).
4. Build your own chat UI.
5. Send messages via `POST /UserAgent/Message/Send`.
6. Stream responses in real-time via [Agent WebSocket](/docs/agent-websocket) using the `agenttoken`.
7. Manage conversation history with `POST /UserAgent/Message/History`.

See [Agent Overview](/docs/agent-overview) for the full lifecycle state table (`status: 0, 1, 3, 4, 5, 6`).

```bash
# Deploy — prepaid + tier are required for API users (credits debit from your wallet)
curl -X POST "https://api.wiro.ai/v1/UserAgent/Deploy" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "agentguid": "agent-template-guid",
    "title": "Customer Support Bot",
    "useprepaid": true,
    "tier": "starter"
  }'

# Pattern 1 only — fill any missing credentials, then verify setuprequired flipped to false
curl -X POST "https://api.wiro.ai/v1/UserAgent/Detail" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "guid": "deployed-useragent-guid" }'

# Start the agent (skipped if Deploy already returned status: 4 for cheap chat-only templates)
curl -X POST "https://api.wiro.ai/v1/UserAgent/Start" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "guid": "deployed-useragent-guid" }'

# Send a message
curl -X POST "https://api.wiro.ai/v1/UserAgent/Message/Send" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "deployed-useragent-guid",
    "message": "How do I reset my password?",
    "sessionkey": "user-456"
  }'
```

### Webhook-Driven Pipelines

For backend-to-backend integrations where you don't need real-time streaming.

1. Send a message with a `callbackurl`
2. Continue processing other work
3. Receive the agent's response via HTTP POST to your webhook endpoint
4. Chain the result into your next workflow step

See [Agent Webhooks](/docs/agent-webhooks) for payload format and retry policy.

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Message/Send" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "deployed-useragent-guid",
    "message": "Generate a weekly performance report",
    "sessionkey": "pipeline-run-789",
    "callbackurl": "https://your-server.com/webhooks/report-ready"
  }'
```

### Scheduled Automation

Combine agents with cron jobs for recurring tasks.

```
Cron (every Monday 9am)
  → POST /UserAgent/Message/Send (with callbackurl)
    → Agent processes the task
      → Webhook fires to your server
        → Your server emails the report / posts to Slack / updates dashboard
```

This pattern works well for weekly social media content planning, daily ad performance reviews, monthly newsletter generation, and automated lead enrichment pipelines.

### Multi-Agent Orchestration

Deploy multiple specialized agents and coordinate them from your backend.

```
Your Backend
  ├── Research Agent → "Find trending topics in AI this week"
  │     ↓ webhook response
  ├── Writing Agent → "Write a blog post about: {research results}"
  │     ↓ webhook response
  └── Publishing Agent → "Publish this post to WordPress and share on social media"
```

Each agent is an independent instance with its own credentials. Your backend passes output from one agent as input to the next.

## Available Agents

Wiro provides pre-built agent templates you can deploy immediately. Each agent specializes in a specific domain and comes with the relevant skills and credential slots pre-configured.

| Agent | What It Does | Credentials |
|-------|-------------|-------------|
| **[Social Manager](https://wiro.ai/agents/social-manager)** | Create, schedule, and publish social media content | Twitter/X, Instagram, Facebook, TikTok, LinkedIn (OAuth) |
| **[Blog Content Editor](https://wiro.ai/agents/blog-content-editor)** | Write and publish blog posts (WordPress draft + publish workflow) | WordPress (App Password), Gmail (optional, for inbox requests) |
| **[Google Ads Manager](https://wiro.ai/agents/google-ads-manager)** | Create and optimize Google Ads campaigns, daily performance reports | Google Ads (OAuth), Calendarific (platform-managed), Google Drive (optional, Service Account) |
| **[Meta Ads Manager](https://wiro.ai/agents/meta-ads-manager)** | Manage Facebook and Instagram ad campaigns, audience analysis | Meta Ads (OAuth), Calendarific (platform-managed), Google Drive (optional, Service Account) |
| **[Newsletter Manager](https://wiro.ai/agents/newsletter-manager)** | Design and send email newsletters to subscriber lists | Brevo, SendGrid, Mailchimp, HubSpot (any one — API key or OAuth) |
| **[Lead Generation Manager](https://wiro.ai/agents/lead-gen-manager)** | Find and enrich leads, run multi-channel outreach, analyze replies | Apollo (API key), Lemlist (API key), HubSpot (optional, for CRM sync) |
| **[App Review Support](https://wiro.ai/agents/app-review-support)** | Monitor app store reviews, draft responses in operator's tone | App Store Connect (private key JWT), Google Play (service account) |
| **[App Event Manager](https://wiro.ai/agents/app-event-manager)** | Scan global holidays, suggest and create App Store + Google Play in-app events | App Store Connect (JWT), Google Play (service account), Calendarific (platform-managed) |
| **[Push Notification Manager](https://wiro.ai/agents/push-notification-manager)** | Craft locale- and timezone-aware push notifications, queue dispatch | Firebase (service account JSON per app), Calendarific (platform-managed) |
| **[Voice Receptionist](https://wiro.ai/agents/voice-receptionist)** | Answer phone calls 24/7 with a real-time AI receptionist — recognises callers from CRM, books from your calendar, drafts CRM notes + follow-up emails, streams a live transcript to chat | Twilio Voice (Account SID, Auth Token, phone number) for inbound phone; HubSpot (optional, caller recognition); Google Calendar (optional, slot lookup); Google Drive (optional); Brevo or HubSpot (any one, optional, follow-up email drafts); Telegram bot (optional, operator approvals) |

> The list above matches the agent templates currently deployed in production. The exact set evolves over time as new templates ship — fetch `POST /Agent/List` for the live catalog. Each agent's full marketing page lives at `https://wiro.ai/agents/{slug}` (linked in the first column).

### Deploying an Agent

```python
import requests

headers = {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
}

# List available agents
agents = requests.post(
    "https://api.wiro.ai/v1/Agent/List",
    headers=headers,
    json={}
)
print(agents.json())

# Deploy an instance (API users always use prepaid — credits debit from your wallet)
deploy = requests.post(
    "https://api.wiro.ai/v1/UserAgent/Deploy",
    headers=headers,
    json={
        "agentguid": "social-manager-agent-guid",
        "title": "Acme Corp Social Media",
        "useprepaid": True,
        "tier": "starter"
    }
)
useragent_guid = deploy.json()["useragents"][0]["guid"]

# Connect Twitter via OAuth
connect = requests.post(
    "https://api.wiro.ai/v1/UserAgentOAuth/XConnect",
    headers=headers,
    json={
        "useragentguid": useragent_guid,
        "redirecturl": "https://your-app.com/settings?connected=twitter"
    }
)
authorize_url = connect.json()["authorizeUrl"]
# Redirect your user to authorize_url

# Start the agent
requests.post(
    "https://api.wiro.ai/v1/UserAgent/Start",
    headers=headers,
    json={"guid": useragent_guid}
)

# Send a message
message = requests.post(
    "https://api.wiro.ai/v1/UserAgent/Message/Send",
    headers=headers,
    json={
        "useragentguid": useragent_guid,
        "message": "Create a thread about our new product launch",
        "sessionkey": "campaign-q2"
    }
)
print(message.json())
```

Browse available agents and their capabilities via [POST /Agent/List](/docs/agent-overview#post-agentlist) or in the [Wiro dashboard](https://wiro.ai/agents).
