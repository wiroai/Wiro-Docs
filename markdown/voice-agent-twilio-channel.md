# Twilio Voice Channel

Connect inbound phone calls (PSTN) to a Wiro agent. Used by the [Voice Receptionist](https://wiro.ai/agents/voice-receptionist) agent and any custom agent that needs to answer real phone calls.

## Overview

Toggle `int-twilio-channel` on a useragent and Wiro auto-enables the bundled voice rules (`util-voice-receptionist` + `util-voice-call-prep`) via the registry's `depends_on` chain — you don't need to enable them separately.

**Skills that use this credential:**

- `int-twilio-channel` — Twilio Voice channel.

**Agents that typically enable this integration:**

- [Voice Receptionist](https://wiro.ai/agents/voice-receptionist) (phone-receptionist for SMBs)
- Custom agents that handle inbound calls

> **Twilio bills you separately** on your Twilio account (per inbound minute + per number rental + per TTS character when hold uses TTS). Wiro doesn't proxy Twilio billing.

## Availability

| Mode | Status | Notes |
|------|--------|-------|
| API Key (Account SID + Auth Token) | Available | Twilio Live Credentials. Wiro auto-configures each number's `VoiceUrl` on save. |

## Webhook auto-configuration

You don't touch the Twilio Console's webhook fields manually — when you save this credential through `POST /UserAgent/CredentialUpsert` (or the panel), Wiro uses your Account SID + Auth Token to auto-configure each phone number's `VoiceUrl` and `StatusCallback`. No separate "Setup webhooks" step.

> **Important:** the number's **Configure with** mode in the Twilio Console must be `Webhook, TwiML Bin, Function, Studio Flow, Proxy Service` (Twilio's default). Wiro does **not** drive `TwiML App` or `SIP Trunk` routing — flip the number back to *Webhook* in the Twilio Console first if it's set to one of those.

## Prerequisites

- **A Wiro API key** — [Authentication](/docs/authentication).
- **A deployed agent** (Voice Receptionist preset or any custom agent with `int-twilio-channel` enabled) — [Agent Overview](/docs/agent-overview).
- **A Twilio account** with at least one purchased phone number.

## Setup

### Step 1: Get your Twilio Live Credentials

1. [Twilio Console → Account → Keys & Credentials → API keys & tokens](https://console.twilio.com/us1/account/keys-credentials/api-keys).
2. In the **Live credentials** section at the top of the page, copy:
   - **Account SID** — 34 chars, starts with `AC`.
   - **Auth Token** — click *Show* to reveal. 32-char secret.

> **Don't confuse with API Keys.** The lower part of the same page lists *API Keys* — those are a different mechanism Wiro doesn't use. Use the Live Auth Token specifically — an API Key Secret pasted here will silently fail every call.

### Step 2: Buy or import phone numbers

[Twilio Console → Phone Numbers → Active numbers](https://console.twilio.com/us1/develop/phone-numbers/manage/incoming) → **Buy a number**. Pick a number with **Voice** capability (toll-free, local, or international as desired).

Numbers must be in **E.164** format when you save them to Wiro:

- Starts with `+`
- Country code first (no leading `0`)
- Digits only — no spaces, dashes, or parentheses
- Max 15 digits total

**Examples:** `+14155551234` (US), `+447911123456` (UK), `+905551234567` (Turkey), `+5511955256325` (Brazil).

### Step 3: Save credentials to Wiro

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/CredentialUpsert" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "fields": [
      { "credentialkey": "twilio-voice", "fieldname": "accountsid",      "fieldvalue": "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" },
      { "credentialkey": "twilio-voice", "fieldname": "authtoken",       "fieldvalue": "your-32-character-auth-token" },
      { "credentialkey": "twilio-voice", "parentfield": "phonenumbers", "ordinal": 0, "fieldname": "value", "fieldvalue": "+14155551234" },
      { "credentialkey": "twilio-voice", "fieldname": "maxcallseconds",  "fieldvalue": "600" },
      { "credentialkey": "twilio-voice", "fieldname": "holdstrategy",    "fieldvalue": "text_then_music" },
      { "credentialkey": "twilio-voice", "fieldname": "holdtext",        "fieldvalue": "Please hold while we connect you to our assistant." },
      { "credentialkey": "twilio-voice", "fieldname": "holdvoice",       "fieldvalue": "Polly.Joanna-Neural" }
    ]
  }'
```

Or save through the panel: **[My Agents](https://wiro.ai/panel/agents)** → open agent → **Credentials → Twilio Voice**. The panel form auto-validates Account SID format and runs *Setup webhooks* on save.

### Step 4: Verify webhook configuration

After saving credentials, the response includes:

- `twilioWebhooksUpdated` — numbers whose `VoiceUrl` was successfully written.
- `twilioWebhookSkipped` — numbers skipped, with the reason (e.g. *no matching IncomingPhoneNumber on Twilio account*).
- `twilioWebhooksFailed` — Twilio API errors per number, if any.

You can also confirm in the Twilio Console: open the number → **Voice Configuration** → **A call comes in** should show:

- **Configure with** → *Webhook, TwiML Bin, Function, Studio Flow, Proxy Service*
- **Webhook URL** → a Wiro voice handler URL
- **HTTP** → *POST*

### Step 5: Start the agent and place a test call

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Start" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "guid": "your-useragent-guid" }'
```

Once the agent is in status `4` (running), dial your Twilio number from any phone. You should hear the configured hold experience for ~5–8 seconds, then the agent's greeting.

## Credential Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `accountsid` | string | Yes | Twilio Account SID — 34 chars starting with `AC`. |
| `authtoken` | string (secret) | Yes | Twilio Live Auth Token — 32-char secret. Stored encrypted at rest. |
| `phonenumbers` | string array | Yes | E.164-formatted phone numbers this agent will answer. All numbers share the same agent settings (hold media, persona, skills). |
| `maxcallseconds` | number | No | Hard cap per call in seconds. Default `600` (10 min). When reached, the call is force-ended and the caller hears a fallback message. Twilio still bills for the full duration up to this cap. |
| `whitelistedcallers` | string array | No | E.164-formatted caller-ID allowlist. **Non-empty** → only listed numbers reach the agent (others get a busy signal). **Empty** → all callers accepted (production default). Use to add only your own number while testing in production. |
| `holdstrategy` | enum | No | What the caller hears during the ~5–8 sec window it takes the agent to connect. Options: `none`, `text`, `audio`, `music`, `audio_then_music`, `text_then_music`. *"X + background music"* options are the most polished. |
| `holdtext` | string | Conditional | Required when `holdstrategy` ∈ {`text`, `text_then_music`}. TTS text — keep to 1 sentence (~5–8s spoken). Hard cap 3000 chars. Supports SSML tags (`<break>`, `<prosody>`, `<say-as>`). |
| `holdvoice` | enum | Conditional | TTS voice for `holdtext`. Empty = use Twilio account default. 21 voices available (AWS Polly Neural / Generative + Google Chirp3-HD), each tied to a single language: `Polly.Joanna-Neural` (en-US), `Polly.Burcu-Neural` (tr-TR), `Polly.Lea-Neural` (fr-FR), etc. Generative tier is most human-like but priced higher per character. |
| `holdaudio` | file (MP3/WAV) | Conditional | Required when `holdstrategy` ∈ {`audio`, `audio_then_music`}. Short greeting (5–15 s recommended), mono, max 10 MB. |
| `holdmusic` | file (MP3/WAV) | Conditional | Required when `holdstrategy` ∈ {`music`, `audio_then_music`, `text_then_music`}. Background music that loops while the caller waits. Mono, max 10 MB. 30–60 s sweet spot. **Use royalty-free music** — you are responsible for licensing. |

> **Twilio cannot mix speech over music simultaneously** — for a voice-over-music intro, pre-mix both into a single audio file and use `holdstrategy: audio` (or `audio_then_music` if you also want the loop after).

## Credentials schema (as returned by `POST /UserAgent/Detail`)

```json
"twilio-voice": {
  "_connected": true,
  "optional": false,
  "extra": false,
  "accountsid": "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "authtoken": "***encrypted***",
  "phonenumbers": ["+14155551234"],
  "maxcallseconds": 600,
  "whitelistedcallers": [],
  "holdstrategy": "text_then_music",
  "holdtext": "Please hold while we connect you to our assistant.",
  "holdvoice": "Polly.Joanna-Neural",
  "holdaudio": null,
  "holdmusic": "https://cdn.wiro.ai/uploads/.../music.mp3"
}
```

## Pairing With Other Skills

Pair this channel with skills that supply the conversation behavior:

- [`int-google-calendar`](/docs/integration-google-calendar-skills) — read availability + draft appointments during the call.
- [`int-hubspot-crm`](/docs/integration-hubspot-skills) — match caller phone number against CRM contacts and log call outcomes.
- [`int-brevo-email`](/docs/integration-brevo-skills) / [`int-sendgrid-email`](/docs/integration-sendgrid-skills) / [`int-mailchimp-email`](/docs/integration-mailchimp-skills) — draft post-call confirmation or follow-up emails.

The Voice Receptionist preset bundles this channel together with the voice rules and Brevo/HubSpot credentials by default — see [Agent Use Cases](/docs/agent-use-cases) for the full preset.

## Troubleshooting

- **All calls fail with signature error:** You probably pasted an *API Key Secret* instead of the live *Auth Token*. Re-paste from the **Live credentials** section of the Twilio Console.
- **Number isn't in `twilioWebhooksUpdated`:** The number isn't on the Twilio account whose Account SID you provided. Either buy the number on this account, or import it from the source account. The skip reason `no matching IncomingPhoneNumber on Twilio account` confirms this.
- **Caller hears Twilio's default voicemail:** The number's *Configure with* is set to *TwiML App* or *SIP Trunk* — flip it back to *Webhook* in the Twilio Console, then re-save credentials in Wiro to re-write `VoiceUrl`.
- **Calls cut off at exactly N seconds:** That's `maxcallseconds`. Raise it for longer use cases.
- **Hold music plays forever, agent never speaks:** The agent failed to start the realtime conversation. Check `POST /UserAgent/Logs` for errors.
- **Caller hears your fallback message but no agent:** `maxcallseconds` was reached before the agent connected, or the agent crashed mid-call. Check `POST /UserAgent/Logs`.
- **Whitelisted caller still gets busy signal:** Ensure E.164 format. Twilio normalizes inbound numbers — if your test phone presents itself as `4155551234` instead of `+14155551234`, the allowlist won't match. Add both forms while testing.
- **Rotated the Auth Token in Twilio Console:** Re-paste the new token in Wiro and save again — the credential save also re-runs the webhook setup.

## Related

- [Agent Credentials & OAuth](/docs/agent-credentials)
- [Agent Skills](/docs/agent-skills) — toggle skills on/off, configure preferences and crons
- [Agent Use Cases](/docs/agent-use-cases) — Voice Receptionist preset
- [Google Calendar Skills](/docs/integration-google-calendar-skills) — pair for inbound voice booking
- [HubSpot Skills](/docs/integration-hubspot-skills) — caller identification + CRM logging
