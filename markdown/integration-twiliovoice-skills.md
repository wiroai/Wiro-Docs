# Twilio Voice Channel

Connect inbound phone calls (PSTN) to a Wiro agent. Used by the [Voice Receptionist](https://wiro.ai/agents/voice-receptionist) agent and any custom agent that needs to answer real phone calls.

## Overview

Turn on the Twilio Voice Channel (`util-twilio-channel`) together with the voice rules it needs: Voice Receptionist Rules (`util-voice-receptionist`) and Voice Call Prep Rules (`util-voice-call-prep`). Deploy's `skills` turns those rules on by itself. [`SkillsApply`](/docs/agent-overview#post-useragentskillsapply) turns on only the skills you send and refuses one whose `depends_on` would stay off (code `101`, with `deps[]`), so send all three in one call:

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/SkillsApply" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "idempotencyKey": "550e8400-e29b-41d4-a716-446655440002",
    "skills": { "util-twilio-channel": true, "util-voice-receptionist": true, "util-voice-call-prep": true }
  }'
```

Sent alone while the two rules are off, the channel is refused and nothing changes:

```json
{
  "result": false,
  "errors": [
    { "code": 101, "message": "Cannot apply: some skills require other skills to be enabled." }
  ],
  "deps": [
    { "skill": "util-twilio-channel", "requires": "util-voice-receptionist" },
    { "skill": "util-twilio-channel", "requires": "util-voice-call-prep" }
  ]
}
```

**Skill:** Twilio Voice Channel (`util-twilio-channel`), the phone channel. Its `docs_url` in [`Skills/List`](/docs/agent-skills#post-skillslist) is this page, `integration-twiliovoice-skills`.

**Credential:** `twilio-voice`, the Account SID, Auth Token and phone numbers below.

**Agents that typically enable this integration:**

- [Voice Receptionist](https://wiro.ai/agents/voice-receptionist) (phone-receptionist for SMBs)
- Custom agents that handle inbound calls

> **Twilio bills you separately** on your Twilio account (per inbound minute + per number rental + per TTS character when hold uses TTS). Wiro doesn't proxy Twilio billing.

## Availability

| Mode | Status | Notes |
|------|--------|-------|
| API Key (Account SID + Auth Token) | Available | Twilio Live Credentials. Wiro auto-configures each number's `VoiceUrl` on save. |

## Webhook auto-configuration

You don't touch the Twilio Console's webhook fields manually. When you save this credential through `POST /UserAgent/CredentialUpsert` (or the panel), Wiro uses your Account SID + Auth Token to auto-configure each phone number's `VoiceUrl` and `StatusCallback`. No separate "Setup webhooks" step.

> **Important:** the number's **Configure with** mode in the Twilio Console must be `Webhook, TwiML Bin, Function, Studio Flow, Proxy Service` (Twilio's default). Wiro does **not** drive `TwiML App` or `SIP Trunk` routing, so flip the number back to *Webhook* in the Twilio Console first if it's set to one of those.

## Prerequisites

- **A Wiro API key** (see [Authentication](/docs/authentication)).
- **A deployed agent** (Voice Receptionist preset or any custom agent with Twilio Voice Channel (`util-twilio-channel`) on), see [Agent Overview](/docs/agent-overview).
- **A Twilio account** with at least one purchased phone number.

## Setup

### Step 1: Get your Twilio Live Credentials

1. [Twilio Console → Account → Keys & Credentials → API keys & tokens](https://console.twilio.com/us1/account/keys-credentials/api-keys).
2. In the **Live credentials** section at the top of the page, copy:
   - **Account SID**: 34 chars, starts with `AC`.
   - **Auth Token**: click *Show* to reveal. 32-char secret.

> **Don't confuse with API Keys.** The lower part of the same page lists *API Keys*, which are a different mechanism Wiro doesn't use. Use the Live Auth Token specifically. An API Key Secret pasted here will silently fail every call.

### Step 2: Buy or import phone numbers

[Twilio Console → Phone Numbers → Active numbers](https://console.twilio.com/us1/develop/phone-numbers/manage/incoming) → **Buy a number**. Pick a number with **Voice** capability (toll-free, local, or international as desired).

Numbers must be in **E.164** format when you save them to Wiro:

- Starts with `+`
- Country code first (no leading `0`)
- Digits only: no spaces, dashes, or parentheses
- Max 15 digits total

**Examples:** `+14155551234` (US), `+447911123456` (UK), `+905551234567` (Turkey), `+5511900000000` (Brazil).

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

Or save through the panel: **[My Agents](https://wiro.ai/panel/agents)** → open agent → **Connectors** tab → **Channels → Twilio Voice**. The panel saves the card, and the same save sets up the number webhooks.

### Step 4: Verify webhook configuration

After saving credentials, the response includes:

- `twilioWebhooksUpdated`: numbers whose `VoiceUrl` was successfully written.
- `twilioWebhookSkipped`: a single reason string, returned instead of `twilioWebhooksUpdated` when the `VoiceUrl` step was skipped (e.g. *no matching IncomingPhoneNumber on Twilio account*).
- `twilioWebhooksFailed`: Twilio API errors per number, if any.
- `twilioWebhookError`: present **instead of** the three fields above when the entire auto-webhook flow throws (e.g. Twilio API outage, invalid Account SID format, network error). Holds a single error string. Treat as "no numbers were configured this round; retry the save".

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

Once the agent is in status `4` (running), dial your Twilio number from any phone. You should hear the configured hold experience for ~5-8 seconds, then the agent's greeting.

## Credential Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `accountsid` | string | Yes | Twilio Account SID: 34 chars starting with `AC`. |
| `authtoken` | string (secret) | Yes | Twilio Live Auth Token: 32-char secret. Stored encrypted at rest. |
| `phonenumbers` | string array | Yes | E.164-formatted phone numbers this agent will answer. All numbers share the same agent settings (hold media, persona, skills). |
| `maxcallseconds` | number | No | Hard cap per call in seconds. Default `600` (10 min). When reached, the call is force-ended and the caller hears a fallback message. Twilio still bills for the full duration up to this cap. |
| `whitelistedcallers` | string array | No | E.164-formatted caller-ID allowlist. **Non-empty** → only listed numbers reach the agent (others get a busy signal). **Empty** → all callers accepted (production default). Use to add only your own number while testing in production. |
| `holdstrategy` | enum | No | What the caller hears during the ~5-8 sec window it takes the agent to connect. Options: `none`, `text`, `audio`, `music`, `audio_then_music`, `text_then_music`. *"X + background music"* options are the most polished. |
| `holdtext` | string | Conditional | Required when `holdstrategy` ∈ {`text`, `text_then_music`}. TTS text: keep to 1 sentence (~5-8s spoken). Hard cap 3000 chars. Supports SSML tags (`<break>`, `<prosody>`, `<say-as>`). |
| `holdvoice` | enum | Conditional | TTS voice for `holdtext`. Empty string (`""`) = use Twilio account default. 20 named voices available (AWS Polly Neural / Generative + Google Chirp3-HD), each tied to a single language: `Polly.Joanna-Neural` (en-US), `Polly.Burcu-Neural` (tr-TR), `Polly.Lea-Neural` (fr-FR), etc. Generative tier is most human-like but priced higher per character. |
| `holdaudio` | file (MP3/WAV) | Conditional | Required when `holdstrategy` ∈ {`audio`, `audio_then_music`}. Short greeting (5-15 s recommended), mono, max 10 MB. |
| `holdmusic` | file (MP3/WAV) | Conditional | Required when `holdstrategy` ∈ {`music`, `audio_then_music`, `text_then_music`}. Background music that loops while the caller waits. Mono, max 10 MB. 30-60 s sweet spot. **Use royalty-free music**, since you are responsible for licensing. |

> **Twilio cannot mix speech over music simultaneously**: for a voice-over-music intro, pre-mix both into a single audio file and use `holdstrategy: audio` (or `audio_then_music` if you also want the loop after).

## Credentials schema (as returned by `POST /UserAgent/Detail`)

```json
"twilio-voice": {
  "_connected": true,
  "optional": false,
  "extra": false,
  "accountsid": "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "authtoken": "••••••••",
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

## Pairing With Connectors

Pair this channel with connectors that give the agent what the call needs (see [Agent Connectors](/docs/agent-connectors)):

- [Google Calendar](https://wiro.ai/connectors/google-calendar) (`google-calendar`): read availability and draft appointments during the call.
- [HubSpot](https://wiro.ai/connectors/hubspot) (`hubspot`): match the caller's phone number against CRM contacts and log call outcomes.
- [Brevo](https://wiro.ai/connectors/brevo) (`brevo`), [SendGrid](https://wiro.ai/connectors/sendgrid) (`sendgrid`) or [Mailchimp](https://wiro.ai/connectors/mailchimp) (`mailchimp`): draft post-call confirmation or follow-up emails.

The Voice Receptionist template comes with this channel, the Web Voice Channel and the voice rules, and suggests HubSpot, Google Calendar, Google Drive, Brevo and Wiro AI Models (its `suggestedconnectors` on `Agent/Detail`). See [Agent Use Cases](/docs/agent-use-cases) for the full template.

## Troubleshooting

- **All calls fail with signature error:** You probably pasted an *API Key Secret* instead of the live *Auth Token*. Re-paste from the **Live credentials** section of the Twilio Console.
- **Number isn't in `twilioWebhooksUpdated`:** The number isn't on the Twilio account whose Account SID you provided. Either buy the number on this account, or import it from the source account. The skip reason `no matching IncomingPhoneNumber on Twilio account` confirms this.
- **Caller hears Twilio's default voicemail:** The number's *Configure with* is set to *TwiML App* or *SIP Trunk*. Flip it back to *Webhook* in the Twilio Console, then re-save credentials in Wiro to re-write `VoiceUrl`.
- **Calls cut off at exactly N seconds:** That's `maxcallseconds`. Raise it for longer use cases.
- **Caller hears that the call has to end, then the line drops:** A [spend limit](/docs/spend-limits) was reached, or the balance of the wallet that pays for the call's audio ran out, during the call. The agent finishes the reply it is giving, a short notice plays, and the call ends. [Call History](#call-history) shows `endReason` `spend_limit` or `balance`.
- **Hold music plays forever, agent never speaks:** The agent failed to start the realtime conversation. Check `POST /UserAgent/Logs` for errors.
- **Caller hears your fallback message but no agent:** `maxcallseconds` was reached before the agent connected, or the agent crashed mid-call. Check `POST /UserAgent/Logs`.
- **Whitelisted caller still gets busy signal:** Ensure E.164 format. Twilio normalizes inbound numbers, so if your test phone presents itself as `4155551234` instead of `+14155551234`, the allowlist won't match. Add both forms while testing.
- **Rotated the Auth Token in Twilio Console:** Re-paste the new token in Wiro and save again. The credential save also re-runs the webhook setup.

## Call History

Retrieve the realtime voice sessions among the agent's latest messages, whichever channel they came in on.

### POST /UserAgent/TwilioCallHistory/List

> **Despite the Twilio-named path, this endpoint returns both Twilio and Web Channel sessions.** Both are stored as agent messages (`metadata.type` starts with `realtime_session` in either case), so a single feed is enough to audit every voice exchange the agent had.

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/TwilioCallHistory/List" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "limit": 50
  }'
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Useragent instance guid. Owner / team-member access only. |
| `limit` | number | No | How many of the agent's latest messages to read (every kind, not only calls). Default `50`, at most `200`. The voice sessions among them come back newest first, so the list can be shorter than `limit`, or empty while older calls exist. |

Response:

```json
{
  "result": true,
  "errors": [],
  "data": [
    {
      "messageguid": "5d6e7f80-9a1b-4c2d-8e3f-4a5b6c7d8e01",
      "correlationId": "voice_Q7mN2xR8kLp4WzT1vYc6HdBs",
      "channel": "twilio",
      "callerInfo": { "number": "+15551234567", "country": "US" },
      "status": "realtime_session",
      "endReason": "wiro_completed",
      "durationSeconds": 137,
      "modelSlug": "gpt-realtime-mini",
      "startedAt": 1730473321000,
      "endedAt":   1730473458000
    },
    {
      "messageguid": "0f2a1c3d-9e8b-4c5a-bf42-3a7b6e1d0c8f",
      "correlationId": "voice_3fK9xQ2LmVb7TzR1pWc8NdYa",
      "channel": "web",
      "callerInfo": { "page_url": "https://example.com/contact", "display_identifier": "+15551234567" },
      "status": "realtime_session",
      "endReason": "browser_disconnect",
      "durationSeconds": 42,
      "modelSlug": "gpt-realtime-mini",
      "startedAt": 1730463668000,
      "endedAt":   1730463710000
    }
  ]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `messageguid` | string | The guid of the message that records this session. Use it with `POST /UserAgent/Message/Detail` to fetch the full transcript metadata. |
| `correlationId` | string \| null | The session's public id. For a web call it is the `correlationId` that `WebStart` returned; phone calls get one too. `null` when the session has none. |
| `channel` | `"twilio" \| "web"` | Source channel. Determines the `callerInfo` shape. |
| `callerInfo` | object | Channel-specific. Twilio: `{ number, country }` (E.164 phone + ISO-2 country). Web: `{ page_url, display_identifier? }`, where `display_identifier` is omitted unless the embedding page validated an identifier (`session_metadata.display_identifier` whose whole-string match passes the allowlist). |
| `status` | string | Mirrors the message's `metadata.type` verbatim. Values: `realtime_session_incoming` (call accepted, prep running), `realtime_session_active` (audio bridge live), `realtime_session_rejected` (rejected before audio, e.g. concurrent-limit), or **`realtime_session`** (no suffix: final/completed). The bare `realtime_session` is the only value that means "ended cleanly". It is **not** the string `"completed"`. |
| `endReason` | string \| null | Set on completed (`realtime_session`) rows only. One of: `wiro_completed` (graceful end), `wiro_cancelled`, `wiro_disconnect`, `wiro_error`, `max_duration` (the call reached its maximum length, `maxcallseconds` on Twilio), `spend_limit` (a [spend limit](/docs/spend-limits) was reached during the call), `balance` (the balance of the wallet that pays for the call ran out), `browser_disconnect` (Web only), `twilio_disconnect` (Twilio only). Rejected rows leave `endReason: null` and instead carry `metadata.reason` (`concurrent_limit`, `agent_prep_timeout`, `realtime_ws_open_failed`, `realtime_stream_timeout`). Fetch it via `Message/Detail`. |
| `durationSeconds` | number \| null | Wall-clock duration. `null` while in-progress. |
| `modelSlug` | string \| null | Realtime model used (e.g. `gpt-realtime-mini`). |
| `startedAt` / `endedAt` | number \| null | Unix epoch ms. `endedAt` stays `null` while the call is in-progress or rejected. |

> **Live call audio is billed to the agent's Wiro project** (its `wiro` credential, see [The agent's Wiro project](/docs/agent-credentials#the-agents-wiro-project)): the voice cost is charged to the wallet of the workspace that owns that project. It is **not** the agent's AI usage: neither its plan's included usage nor its balance pays for it. The agent's text turns around the call (the prep turn that briefs the voice model before the voice session starts, and the post-call turn where the agent summarizes and acts on the call) are AI usage like any other turn and show up in [`POST /UserAgent/TransactionList`](/docs/agent-transactions#tx-transactionlist) as `ai-usage` rows. Audit call-audio cost from that project's usage.

## Related

- [Web Voice](/docs/integration-webvoice-skills): browser-embedded voice for the same agent, shares this page's [Call History](#call-history) feed.
- [Agent Credentials](/docs/agent-credentials)
- [Agent Skills](/docs/agent-skills): toggle skills on/off, configure preferences and crons
- [Agent Use Cases](/docs/agent-use-cases): Voice Receptionist preset
- [Agent Connectors](/docs/agent-connectors): Google Calendar for inbound voice booking, HubSpot for caller identification and CRM logging
- [Twilio Voice docs](https://www.twilio.com/docs/voice)
