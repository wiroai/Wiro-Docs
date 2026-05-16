# Google Calendar Integration

Connect your agent to Google Calendar for reading availability and drafting events — used primarily by appointment-booking and voice-receptionist agents.

## Overview

The Google Calendar integration uses a Google Cloud service account with calendar access delegated by the operator. You create the service account in your own Google Cloud project, share the calendar(s) you want the agent to manage with the service account email, and the agent reads/writes events on those shared calendars only.

This is the **same auth pattern as [Google Drive](/docs/integration-googledrive-skills) and [Google Play](/docs/integration-googleplay-skills)** — service account JSON, no OAuth.

**Skills that use this integration:**

- `int-google-calendar` — Read calendar availability, find open time slots, draft / create / modify events via Google Calendar API v3.

**Agents that typically enable this integration:**

- [Voice Receptionist](/docs/agent-use-cases) (appointment booking during inbound calls)
- [Barber Booking](https://wiro.ai/agents/barber-booking) and other small-business booking agents
- Custom agents that need calendar awareness (availability lookups, scheduling)

## Availability

| Mode | Status | Notes |
|------|--------|-------|
| Service Account JSON | Available | Google Cloud service account with Google Calendar API enabled. Calendars shared by the operator. |

## Prerequisites

- **A Wiro API key** — [Authentication](/docs/authentication).
- **A deployed agent** — [Agent Overview](/docs/agent-overview).
- **A Google account** with the calendar(s) you want the agent to manage.
- **A Google Cloud project** to host the service account.

## Setup

### Step 1: Enable the Google Calendar API

[Google Cloud Console](https://console.cloud.google.com/) → select project → **APIs & Services → Library** → **Google Calendar API** → **Enable**.

### Step 2: Create a service account

1. **IAM & Admin → Service accounts → Create service account**.
2. Name it (e.g. `wiro-calendar-agent`) → **Create and continue**.
3. Skip role grants → **Done**.
4. Open the service account → **Keys → Add key → Create new key → JSON**. Download the JSON file.
5. Note the service account email — format: `wiro-calendar-agent@YOUR-PROJECT.iam.gserviceaccount.com`.

> **Tip:** In **[My Agents](https://wiro.ai/panel/agents)** → open your agent → **Credentials**, you can upload the JSON via the file picker; the service account email is detected and surfaced with a **Copy** button.

### Step 3: Share the calendar with the service account

1. Open [Google Calendar](https://calendar.google.com).
2. Hover the calendar in the left sidebar → ⋮ → **Settings and sharing**.
3. Scroll to **Share with specific people or groups** → **Add people or groups**.
4. Paste the service account email from Step 2.
5. Set permissions to **Make changes to events** (read + write) → **Send**.

> **Which calendar?**
> - **Personal** — share your primary calendar (`primary`) for solo operators.
> - **Business / shared** — create a dedicated calendar (e.g. `Bookings`) so appointments stay separate from personal events. Copy its **Calendar ID** from **Settings → Integrate calendar → Calendar ID** (looks like `abcd1234@group.calendar.google.com`).

### Step 4: Save credentials to Wiro

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/CredentialUpsert" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "fields": [
      { "credentialkey": "google-calendar", "fieldname": "serviceaccountjson",  "fieldvalue": "<base64-encoded service account JSON>" },
      { "credentialkey": "google-calendar", "fieldname": "calendarid",          "fieldvalue": "primary" },
      { "credentialkey": "google-calendar", "fieldname": "timezone",            "fieldvalue": "Europe/Istanbul" },
      { "credentialkey": "google-calendar", "fieldname": "slotdurationminutes", "fieldvalue": "30" }
    ]
  }'
```

Or upload directly through the panel: **[My Agents](https://wiro.ai/panel/agents)** → open agent → **Credentials → Google Calendar**.

### Step 5: Start the agent

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Start" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "guid": "your-useragent-guid" }'
```

## Credential Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `serviceaccountjson` | string (base64-encoded JSON) | Yes | Service account credentials JSON, base64-encoded. Encrypted at rest. Max 50 KB. |
| `calendarid` | string | Yes | Which calendar to read/write. Use `primary` for the service account's own calendar, or a full Calendar ID like `abcd1234@group.calendar.google.com` for shared business calendars. |
| `timezone` | string | No | IANA timezone identifier (e.g. `Europe/Istanbul`, `America/New_York`, `Asia/Tokyo`). Used for slot suggestions, reminders, and event creation. Falls back to the calendar's own timezone if unset. |
| `slotdurationminutes` | number | No | Default appointment length in minutes when offering callers available slots. Common values: `15`, `30`, `45`, `60`. |

## Credentials schema (as returned by `POST /UserAgent/Detail`)

```json
"google-calendar": {
  "_connected": true,
  "optional": false,
  "extra": false,
  "serviceaccountjson": "***encrypted***",
  "calendarid": "primary",
  "timezone": "Europe/Istanbul",
  "slotdurationminutes": 30
}
```

## Combined Use: Appointment Booking via Voice

When paired with [Twilio Voice Channel](/docs/voice-agent-twilio-channel) on a [Voice Receptionist](https://wiro.ai/agents/voice-receptionist) agent, the typical flow is:

1. Caller dials your Twilio number → agent answers.
2. Caller asks "I'd like to book a haircut Tuesday at 3 PM" → agent checks availability against the configured calendar.
3. If the slot is open → agent confirms → drafts the event.
4. If conflicting → agent offers nearest free slots based on `slotdurationminutes`.
5. Post-call, the agent can also draft a confirmation email via [Brevo](/docs/integration-brevo-skills) or [SendGrid](/docs/integration-sendgrid-skills) using the caller's email captured during the call.

## Troubleshooting

- **403 `notFound`:** The service account does not have access to the calendar. Re-share the calendar (Step 3) and confirm the email matches exactly (no trailing whitespace).
- **403 `accessNotConfigured`:** Google Calendar API isn't enabled in the Cloud project. Re-do Step 1.
- **400 `invalid_grant`:** Service account JSON is malformed or the private key was rotated. Generate a new key and re-upload.
- **Events appear in wrong timezone:** Set `timezone` explicitly. Without it, Google falls back to the calendar's own timezone, which may differ from your operator's expectations.
- **403 `forbiddenForServiceAccounts` on personal Gmail calendars:** Some personal Google accounts restrict service-account writes. Use a dedicated Google Workspace calendar or a regular Google account that allows it.

## Related

- [Agent Credentials & OAuth](/docs/agent-credentials)
- [Agent Skills](/docs/agent-skills)
- [Twilio Voice Channel](/docs/voice-agent-twilio-channel) — pair for inbound voice booking
- [Brevo Skills](/docs/integration-brevo-skills) / [SendGrid Skills](/docs/integration-sendgrid-skills) — confirmation email drafts
- [HubSpot Skills](/docs/integration-hubspot-skills) — log appointment as CRM activity
