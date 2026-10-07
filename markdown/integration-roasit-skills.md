# Roasit Integration

Connect your agent to Roasit mobile attribution — creative, campaign and network ROAS, cohort revenue and retention, iOS SKAdNetwork reports and install reconciliation, read with one read-only API token.

## Overview

[Roasit](https://roasit.com) is a mobile measurement partner (MMP): it attributes app installs to ad networks, pulls ad spend from Meta, Google Ads, TikTok and AppLovin, and joins in-app and ad revenue into install cohorts. This integration lets an agent read those numbers — the same figures the Roasit dashboard's Reports screen shows — and act on them through the ad-platform skills.

**Skills that use this integration:**

- `int-roasit-attribution` — Read-only reports from the Roasit API: creative / campaign / network ROAS (`roas_all`, ad-only and in-app-only ROAS, day-N ROAS), installs, spend, CPI, cohort revenue, retention, iOS SKAdNetwork reports, install reconciliation against the stores, and data freshness. Rows carry the ad networks' own campaign / ad ids, so the agent can map a creative back to Google Ads, Meta Ads or TikTok Ads.

**Bundled task:**

- `cron-roasit-creative-roas-reporter` — daily at 10:30 UTC: the last 7 days' creative ROAS per app, pause / scale recommendations for creatives that pass the significance gate, and an attribution audit (network-claimed vs Roasit-attributed installs, network claims vs store installs). Off until the Roasit credential is filled.

**Agents that typically enable this integration:**

- [Google Ads Manager](https://wiro.ai/agents/google-ads-manager), [Meta Ads Manager](https://wiro.ai/agents/meta-ads-manager) and [TikTok Ads Manager](https://wiro.ai/agents/tiktok-ads-manager) — MMP-verified ROAS next to the platform's own numbers.
- Custom app-marketing agents that report on app growth.

## Availability

| Mode | Status | Notes |
|------|--------|-------|
| API Token (Roasit) | Available | One read-only Roasit API token per agent. It sees the apps your Roasit account can see and cannot change anything. No extra charge: the skill adds nothing to the agent's monthly price. |

## Prerequisites

- **A Wiro API key** — [Authentication](/docs/authentication).
- **A deployed agent** — [Agent Overview](/docs/agent-overview).
- **A Roasit account** with at least one app, and its Roasit SDK sending installs.

## Setup

### Step 1: Create a Roasit API token

1. Sign in to [Roasit](https://roasit.com) and open your **Account** page.
2. Under **API tokens**, give the token a name (for example `Wiro agent`) and click **Create**.
3. Copy the token. It starts with `roapi_` and is **shown only once**.

> The token is read-only: it can read reports for the apps your Roasit account can see, and nothing else. Revoking it on the Account page cuts the agent off immediately.

### Step 2: Find your Roasit App IDs (optional)

Leave the apps list empty and the agent reports on every app the token can see. To limit it to specific apps, or to give an app the name you use in chat, add one row per app:

1. Open the app in Roasit.
2. Copy the id from the address bar: `https://roasit.com/#/app/<app-id>/info` — a lowercase UUID such as `3f1c2b9e-7a4d-4c6b-9e2f-1a2b3c4d5e6f`.

### Step 3: Save the credential to Wiro

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/CredentialUpsert" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "fields": [
      { "credentialkey": "roasit", "fieldname": "apitoken", "fieldvalue": "roapi_YOUR_ROASIT_TOKEN" },
      { "credentialkey": "roasit", "parentfield": "apps", "ordinal": 0, "fieldname": "appname",  "fieldvalue": "My Game" },
      { "credentialkey": "roasit", "parentfield": "apps", "ordinal": 0, "fieldname": "platform", "fieldvalue": "all" },
      { "credentialkey": "roasit", "parentfield": "apps", "ordinal": 0, "fieldname": "appid",    "fieldvalue": "3f1c2b9e-7a4d-4c6b-9e2f-1a2b3c4d5e6f" },
      { "credentialkey": "roasit", "parentfield": "apps", "ordinal": 0, "fieldname": "storeid",  "fieldvalue": "1234567890" }
    ]
  }'
```

Or fill it in the panel: **[My Agents](https://wiro.ai/panel/agents)** → open agent → **Credentials → Roasit**.

### Step 4: Make sure the skill is on

Google Ads Manager, Meta Ads Manager and TikTok Ads Manager agents include `int-roasit-attribution` at no extra charge, so saving the credential is enough. On a Custom Build agent, turn it on:

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/SkillsApply" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "skills": [ { "name": "int-roasit-attribution", "enabled": true } ]
  }'
```

Or flip the toggle in the panel under **Skills**. Skill changes are only available on Custom Build agents (see [Agent Skills](/docs/agent-skills#toggling-integration-skills)).

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
| `apitoken` | string (secret) | Yes | Roasit API token, `roapi_` followed by 43 characters. Encrypted at rest. |
| `apps[].appname` | string | Yes (per row) | Friendly label the agent uses in chat and reports. |
| `apps[].platform` | `all` / `ios` / `android` | Yes (per row) | `all` reports on both stores; `ios` or `android` filters every report for that app to one platform. |
| `apps[].appid` | string (UUID) | Yes (per row) | The Roasit app id from the dashboard URL. |
| `apps[].storeid` | string | No | Apple ID or Android package name, to join Roasit numbers with your App Store / Google Play integrations. |

## Credentials schema (as returned by `POST /UserAgent/Detail`)

```json
"roasit": {
  "_connected": true,
  "optional": true,
  "extra": true,
  "apitoken": "***encrypted***",
  "apps": [
    { "appname": "My Game", "platform": "all", "appid": "3f1c2b9e-7a4d-4c6b-9e2f-1a2b3c4d5e6f", "storeid": "1234567890" }
  ]
}
```

`optional` and `extra` are `true` on the ads-manager agents: Roasit is an optional attribution source, and its credential card shows up even before the skill is on.

## What the agent reports

The agent reads Roasit's report API, one app per request, and never recomputes a metric itself — every number equals the Roasit dashboard's for the same app, dates, grouping, filters and IAP setting.

| Metric | Meaning |
|--------|---------|
| `roas_all` | Cohort revenue to date ÷ ad spend. |
| `roas_ad_all` / `roas_iap_all` | The ad-revenue / in-app-revenue part of it. |
| `roas_N`, `ret_N`, `arpu_N` | Day-N ROAS, retention and ARPU (mature cohorts only). |
| `installs`, `network_installs` | Installs Roasit attributed vs. installs the ad networks claim. |
| `spend`, `cpi`, `impressions`, `clicks` | Paid media, in USD. |
| `rev_all`, `rev_ad`, `rev_iap` | Cohort revenue to date, total / ads / in-app. |

Breakdowns: day, platform, country, network, campaign, ad group and ad. A "-" (null) value means the dashboard shows none yet — no spend, a cohort not old enough, or a day whose spend is not final — and is never treated as zero.

Creative-level ROAS needs Roasit to pull spend at ad level for that network (**Spend detail** in the Roasit app settings); networks pulled at campaign level are reported at campaign level.

## Billing

The integration adds nothing to the agent's monthly price or credit pool. Like every agent turn, the reports and the daily task are billed on the LLM tokens they use, from the agent's existing credits.

## Recommendations & approval

The daily task writes `pause_creative_low_roas`, `scale_creative_high_roas` and `attribution_audit` items to the agent's recommendation ledger; nothing changes on an ad platform until you approve an item (`apply 1,3`, `apply all safe`, `skip 2`). Thresholds — minimum spend and installs, the ROAS metric, floor and ceiling, drift and overcount limits — live in the editable `roasit-strategy` custom skill and fall back to `ad-strategy`.

## Troubleshooting

- **401:** The token was revoked or mistyped — create a new one on Roasit's Account page and save it again.
- **404 for an app:** The Roasit App ID is wrong, or the Roasit account behind the token cannot see that app.
- **Creative ROAS shows "-":** That network's spend is pulled at campaign level in Roasit — raise Spend detail, or read the campaign-level row.
- **Today's or yesterday's ROAS is missing:** Roasit's nightly spend pull has not finalised the day yet; the report names the excluded days.
- **Agent says "not connected" with the token filled:** The agent restarts to pick up new credentials; give it a moment after saving, then retry.

## Related

- [Agent Credentials & OAuth](/docs/agent-credentials)
- [Agent Skills](/docs/agent-skills)
- [Google Ads Integration](/docs/integration-googleads-skills)
- [Meta Ads Integration](/docs/integration-metaads-skills)
- [TikTok Ads Integration](/docs/integration-tiktokads-skills)
