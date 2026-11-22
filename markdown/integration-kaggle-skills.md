# Kaggle Integration

Give your agent your own Kaggle account: it lists your notebooks and datasets, pushes a notebook and runs it on Kaggle's CPUs or GPUs, reads the run's log and output, publishes data as a private dataset or a new version, and browses competitions and leaderboards.

## Overview

[Kaggle](https://www.kaggle.com) runs notebooks on free CPUs, GPUs and TPUs and hosts datasets and competitions. This integration connects an agent to your Kaggle account with your username and a Kaggle API token, so data and research agents can run code where the hardware is, and share data with you or your team. Everything the agent creates is private; making something public and sending a competition submission wait for your approval.

**Skills that use this integration:**

- `int-kaggle-notebooks`: Your notebooks and datasets; notebook pushes (script or notebook, with dataset, competition, notebook and model sources, GPU or TPU, internet on or off); run status, logs and output files; new datasets and new dataset versions; your weekly GPU and TPU quota; competitions, leaderboards and your submissions, and submissions after your approval.

**Agents that typically enable this integration:**

- Custom data science and research agents that train or evaluate models on Kaggle hardware.
- Reporting and data agents that publish a cleaned dataset for a team on a schedule.

## Availability

| Mode | Status | Notes |
|------|--------|-------|
| API Token (Kaggle) | Available | Your Kaggle username and an API token from Settings → API → Generate New Token (`KGAT_` and 32 characters). Kaggle's API is free; runs use your own Kaggle quotas. The integration is included in every plan at no extra charge. |

## Prerequisites

- **A Wiro API key** (see [Authentication](/docs/authentication)).
- **A deployed agent** (see [Agent Overview](/docs/agent-overview)).
- **A Kaggle account.** For notebooks that use a GPU or the internet, Kaggle asks for a phone-verified account. To submit to a competition, join it and accept its rules on the Kaggle website first; the API cannot do that step.

## Setup

### Step 1: Find your username and create an API token

1. Sign in at [kaggle.com](https://www.kaggle.com) and open your profile page (your picture, top right). Your username is the last part of the address: in `https://www.kaggle.com/janedoe` it is `janedoe`.
2. Open [Settings → API](https://www.kaggle.com/settings/api) (your picture, then **Settings**, then the **API** section).
3. Click **Generate New Token**, then **Copy**. The token is `KGAT_` followed by 32 letters and digits.

> Use a token from **Generate New Token**. The older key from **Create Legacy API Key** (the `key` inside a `kaggle.json` file) is a different credential and is refused when you save it. To revoke the token later, remove it in the same API section of your Kaggle settings.

### Step 2: Save the credential to Wiro

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/CredentialUpsert" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "fields": [
      { "credentialkey": "kaggle", "fieldname": "username", "fieldvalue": "janedoe" },
      { "credentialkey": "kaggle", "fieldname": "apitoken", "fieldvalue": "KGAT_YOUR_KAGGLE_API_TOKEN" }
    ]
  }'
```

Or fill it in the panel: **[My Agents](https://wiro.ai/panel/agents)** → open agent → **Connectors → Kaggle**.

A token that is not `KGAT_` followed by 32 hexadecimal characters, or a username with spaces, slashes or an `@`, is refused when you save it.

### Step 3: Enable the skill

Kaggle ships **available but off**. Turn `int-kaggle-notebooks` on for the agent:

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/SkillsApply" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "skills": { "int-kaggle-notebooks": true },
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
| `username` | string | Yes | Your Kaggle username, the last part of your profile address. |
| `apitoken` | string (secret) | Yes | Kaggle API token from Settings → API → Generate New Token: `KGAT_` and 32 hexadecimal characters. Encrypted at rest. |

## Credentials schema (as returned by `POST /UserAgent/Detail`)

```json
"kaggle": {
  "_connected": true,
  "optional": false,
  "extra": false,
  "username": "janedoe",
  "apitoken": "••••••••"
}
```

## What the agent can do

The agent calls the Kaggle API at `https://www.kaggle.com/api/v1/` with your token as a Bearer token.

| Request | Kaggle API | Waits for your approval |
|---------|------------|--------------------------|
| Your weekly GPU and TPU quota: used, left, refresh time | `GET /kernels/quota` | No |
| List your notebooks; read one notebook's settings and code | `GET /kernels/list`, `GET /kernels/pull` | No |
| Push a notebook or script as a new notebook or a new version, private, with dataset, competition, notebook and model sources; save and run, or save only | `POST /kernels/push` | No for a private notebook on CPU; **yes** to make it public, and for a GPU or TPU run you did not ask for |
| Run status, log and output files | `GET /kernels/status`, `GET /kernels/output` | No |
| List your datasets, their files and processing status | `GET /datasets/list`, `/datasets/list/{owner}/{slug}`, `/datasets/status/{owner}/{slug}` | No |
| Create a private dataset or a new version from files in the agent's workspace | `POST /blobs/upload`, then the upload, then `POST /datasets/create/new` or `/datasets/create/version/{owner}/{slug}` | No for private; **yes** to make it public or to delete older versions |
| Competitions, leaderboards and your submissions | `GET /competitions/list`, `/competitions/{slug}/leaderboard/view`, `/competitions/submissions/list/{slug}` | No |
| Submit a file, or a notebook version for a code competition | `POST /competitions/submission-url`, the upload, then `POST /competitions/submissions/submit/{slug}` or `/submit-notebook/{slug}` | **Yes** |

The agent never deletes a notebook or a dataset; that stays with you on Kaggle.

### How notebooks run

- A push creates the notebook (or a new version) and starts a run, unless the agent was asked only to save it.
- Notebooks run on CPU with the internet off by default. The agent turns a GPU (`NvidiaTeslaT4`, `NvidiaL4`) or a TPU (`TpuV5E8`) on only when you ask, or after telling you how much of your weekly quota is left; it turns the internet on only when the code needs to download packages or data, and says why.
- Runs take minutes to hours. The agent reports the status when you ask; it does not wait in a loop. When a run fails, it reads the log for the cause before changing the code.
- Output files are listed with their names. Kaggle serves them through short-lived signed links; if the agent cannot fetch one, it points you to the notebook's Output tab.

### How datasets are published

Kaggle takes files in three steps: the agent asks for an upload ticket, uploads the file to the link Kaggle gives (signed for that one file, with no token), then creates the dataset or the new version naming the ticket. A new version is built from the files sent with it, so the agent uploads every file the dataset should keep. Titles and slugs take 6 to 50 characters and subtitles 20 to 80; a public dataset needs one license, which you choose.

## Approvals

These wait for your explicit yes in the chat, after you have seen exactly what will happen:

- **Making a notebook or dataset public:** the notebook or dataset by name, and for a dataset its license. Anyone can then see and copy it.
- **A competition submission:** the competition, the file or notebook version, and the description. It uses one of the competition's daily submissions.
- **A GPU or TPU run you did not ask for:** the accelerator and the quota left.
- **Deleting a dataset's older versions** when publishing a new one.

A scheduled task never makes anything public and never submits: it reports what is ready.

## Quotas & limits

| Limit | Value |
|-------|-------|
| GPU and TPU time | A weekly allowance per account, in hours; the agent reads what is left before a run |
| One run | Up to 12 hours on CPU and GPU, 9 hours on TPU |
| Saved output per run | Up to 20 GB |
| Dataset size | 200 GB per dataset, 200 GB of private datasets per account |
| Files per dataset | At most 50 at the top level (more go in an archive) |
| Competition submissions | A daily limit per competition |
| Request rate | Kaggle limits request rates on its own; when it answers "Too many requests", the agent stops and tries again later |

## Cost & billing

- **Kaggle:** the API and Kaggle's notebook hardware are free within your Kaggle quotas.
- **Billing on Wiro:** every plan includes the integration, so it changes neither the agent's price nor its credits. As with every agent turn, its work is billed on the LLM tokens it uses, from the agent's existing credits.

## Troubleshooting

- **401 "Unauthenticated":** The token is wrong, expired or was removed. Generate a new token in Kaggle's Settings → API and save it again.
- **403 "Permission ... was denied":** The notebook or dataset belongs to someone else or is private, the slug is wrong, or you have not accepted a competition's rules on the Kaggle website.
- **A push names refused sources:** A dataset, competition, notebook or model source is misspelled or not accessible to you; the agent fixes it and pushes again once.
- **A run ends in `error`:** The agent reads the log and tells you the cause, for example running out of memory or a missing package with the internet off.
- **No GPU in the run:** Your weekly GPU quota is used up, or the account is not phone-verified.
- **429 "Too many requests":** Kaggle asked to slow down; the agent tries again on a later request.
- **Agent says "not connected" with both fields filled:** The agent restarts to pick up new credentials; give it a moment after saving, then retry.

## Related

- [Agent Credentials & OAuth](/docs/agent-credentials)
- [Agent Skills](/docs/agent-skills)
- [Wiro AI Models](/docs/agent-skills#using-wiro-ai-models-from-your-agent): run AI models from the same agent
