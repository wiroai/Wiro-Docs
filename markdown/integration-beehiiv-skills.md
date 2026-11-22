# beehiiv Integration

Give your agent your beehiiv newsletter, reached with an API key from your own beehiiv workspace: post stats, subscribers, segments and automations, and new posts saved as drafts. Nothing reaches your subscribers until you approve the final text and the audience.

## Overview

[beehiiv](https://www.beehiiv.com) is a newsletter platform. This integration connects an agent to your own beehiiv workspace through the beehiiv API v2, so newsletter and content agents can report how your posts did, prepare the next issue as a draft, and keep your subscriber list tidy.

**Skills that use this integration:**

- `int-beehiiv-post`: Publications and their subscriber counts; posts with email stats (recipients, delivered, unique opens and clicks, unsubscribes, spam reports), web views and the most clicked links; totals across posts; new posts and changes to drafts (Pro and Enterprise plans); test emails to addresses you name; subscribers looked up, added with tags and custom fields, updated, or unsubscribed after your approval; segments with their sizes; enrollment of a subscriber in an automation after your approval.

**Agents that typically enable this integration:**

- Custom newsletter agents that write and schedule a weekly issue on beehiiv.
- Content and marketing agents that turn blog posts or announcements into newsletter drafts and report opens and clicks back.

## Availability

| Mode | Status | Notes |
|------|--------|-------|
| API Key (beehiiv) | Available | An API key from your own beehiiv workspace, plus an optional default publication. Reading posts, stats and subscribers works on every beehiiv plan, Free included; creating and changing posts needs beehiiv Pro or Enterprise. The integration is included in every plan at no extra charge. |

## Prerequisites

- **A Wiro API key** (see [Authentication](/docs/authentication)).
- **A deployed agent** (see [Agent Overview](/docs/agent-overview)).
- **A beehiiv workspace** where you are the Owner or an Admin, with beehiiv's identity check (through Stripe) completed. For drafting posts through the API, the workspace needs the **Pro** or **Enterprise** plan; beehiiv does not include post creation in a Pro trial. See [beehiiv pricing](https://www.beehiiv.com/pricing).

## Setup

### Step 1: Create a beehiiv API key

1. Sign in at [app.beehiiv.com](https://app.beehiiv.com) as the workspace Owner or an Admin.
2. In the left menu click **Settings**, then under **Workspace Settings** choose **API**.
3. In the **API Keys** section click **Create New API Key**, give it a name (for example "AI agent") and click **Create New Key**. On a paid plan, the **Publications** field can limit the key to the publications you pick; leave it empty to reach every publication in the workspace.
4. Copy the key, then click **I've saved the key**. beehiiv shows a key only once.
5. Optional: scroll down to the **Publication ID** section, pick a publication with the arrows icon and copy its API V2 ID (it starts with `pub_`). The agent uses it when you do not name a publication; without it, the agent lists your publications and asks.

> To revoke the key later, open the same **API** page, click the three dots next to the key and choose **Delete**.

### Step 2: Save the credential to Wiro

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/CredentialUpsert" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "fields": [
      { "credentialkey": "beehiiv", "fieldname": "apikey", "fieldvalue": "YOUR_BEEHIIV_API_KEY" },
      { "credentialkey": "beehiiv", "fieldname": "publicationid", "fieldvalue": "pub_00000000-0000-0000-0000-000000000000" }
    ]
  }'
```

Or fill it in the panel: **[My Agents](https://wiro.ai/panel/agents)** → open agent → **Connectors → beehiiv**.

A key with spaces in it, or a publication ID that is not `pub_` followed by a 36-character ID, is refused when you save it.

### Step 3: Enable the skill

beehiiv ships **available but off**. Turn `int-beehiiv-post` on for the agent:

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/SkillsApply" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "skills": { "int-beehiiv-post": true },
    "idempotencyKey": "550e8400-e29b-41d4-a716-446655440000"
  }'
```

Or flip the toggle in the panel under **Skills** (see [Agent Skills](/docs/agent-skills#toggling-integration-skills)).

### Step 4: Start the agent

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Start" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "guid": "your-useragent-guid" }'
```

## Credential Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `apikey` | string (secret) | Yes | beehiiv API key from Settings → Workspace Settings → API. Encrypted at rest. |
| `publicationid` | string | No | Default publication, its API V2 ID (`pub_` and 36 characters). Empty: the agent lists the publications the key reaches. |

## Credentials schema (as returned by `POST /UserAgent/Detail`)

```json
"beehiiv": {
  "_connected": true,
  "optional": false,
  "extra": false,
  "apikey": "••••••••",
  "publicationid": "pub_00000000-0000-0000-0000-000000000000"
}
```

## What the agent can do

| Request | beehiiv API | Plan | Waits for your approval |
|---------|-------------|------|--------------------------|
| List publications with subscriber counts and average rates | `GET /v2/publications` | Every plan | No |
| Posts with email stats, web views and top links; totals across posts | `GET /v2/publications/{id}/posts`, `/posts/{post_id}`, `/posts/aggregate_stats` | Every plan | No |
| Draft a post (HTML body, subject line, preview text, audience by tier or segment, template, tags) and change a draft | `POST` and `PATCH /v2/publications/{id}/posts` | Pro, Enterprise | No: a draft reaches no one |
| Send a test email to addresses you name | `POST /posts/{post_id}/test_sends` | Every plan | No |
| Send a draft now, or schedule it | `PATCH /posts/{post_id}` with status `confirmed` | Pro, Enterprise | **Yes** |
| Look up a subscriber, with tags, custom fields and engagement | `GET /v2/publications/{id}/subscriptions` | Every plan | No |
| Add a subscriber with custom fields and a source; add tags; update custom fields | `POST /subscriptions`, `POST /subscriptions/{sub_id}/tags`, `PUT /subscriptions/{sub_id}` | Every plan | No (only people you say agreed to receive the newsletter) |
| Unsubscribe someone | `PUT /subscriptions/{sub_id}` | Every plan | **Yes** |
| Segments with their sizes, custom fields, tiers, templates, automations | `GET /segments`, `/custom_fields`, `/tiers`, `/post_templates`, `/automations` | Every plan; automations from Lite | No |
| Enroll a subscriber in an automation | `POST /automations/{automation_id}/journeys` | Lite and up (the automation needs an Add by API trigger) | **Yes** |

The agent never deletes a post or a subscriber: beehiiv deletes them for good, so that stays with you in beehiiv.

## Approvals

Everything that reaches your subscribers or changes what they receive waits for your explicit yes in the chat, after you have seen exactly what will happen:

- **Sending or scheduling a post:** the final subject line, preview text and body (the draft's preview link, a test email or the HTML), the audience in words with its size, and the send time in your time zone, or "now".
- **Unsubscribing:** the exact addresses.
- **Enrolling in an automation:** the automation's name and the people.
- **A welcome email, re-adding someone who unsubscribed, or skipping double opt-in** when adding a subscriber, and **changing someone's tier**.

A yes covers only what you saw: if the text, audience or time changes, the agent shows it again. This holds even when the agent's approval policy is set to run without waiting. A scheduled task never sends: it prepares the draft and reports it to you.

Once a post is sent or scheduled, beehiiv does not let it return to draft through the API. To stop a scheduled post, unschedule it in beehiiv; the agent reminds you of this when it schedules one.

## Plans & limits

| beehiiv plan | API access | Drafting posts through the API | Automations | Segments | Requests per minute |
|--------------|------------|--------------------------------|-------------|----------|---------------------|
| Free | Yes | No | No | 3 | 30 |
| Lite | Yes | No | Up to 10 live | 10 | 180 |
| Pro | Yes | Yes (not during a trial) | Unlimited | Unlimited | 500 |
| Enterprise | Yes | Yes | Unlimited | Unlimited | 800 (more on request) |

- beehiiv caps test emails per publication per day; the agent tells you how many are left after each one.
- Custom fields must exist in beehiiv before the agent can fill them; unknown fields are dropped and the agent says which.

## Cost & billing

- **beehiiv** bills its own plan to your beehiiv account; the API adds no charge.
- **Billing on Wiro:** every plan includes the integration, so it changes neither the agent's price nor its credits. As with every agent turn, its work is billed on the LLM tokens it uses, from the agent's existing credits.

## Troubleshooting

- **401:** The key is wrong or was deleted. Create a new key on the beehiiv API page and save it again.
- **403 when drafting a post:** The workspace is not on Pro or Enterprise, or is on a Pro trial. Reading stats and managing subscribers still work.
- **404 for a publication:** The key is limited to other publications, or the publication ID is wrong. Edit the key's **Publications** on the beehiiv API page, or clear the default publication so the agent lists the ones it can reach.
- **422 on a test email:** beehiiv's daily test email limit is reached; it resets the next day.
- **429:** Too many requests for your plan in one minute. The agent waits and tries once more.
- **A subscriber shows `pending`:** The publication uses double opt-in, and the person has not confirmed yet.
- **Agent says "not connected" with the key filled:** The agent restarts to pick up new credentials; give it a moment after saving, then retry.

## Related

- [Agent Credentials & OAuth](/docs/agent-credentials)
- [Agent Skills](/docs/agent-skills)
- [Mailchimp Skills](/docs/integration-mailchimp-skills) / [Brevo Skills](/docs/integration-brevo-skills): other email platforms
