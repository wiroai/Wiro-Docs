# Google Drive Integration

Connect your agent to Google Drive for reading, writing, and managing files in selected folders.

## Overview

The Google Drive integration uses a Google Cloud service account with folder access delegated from your Drive. You create the service account in your own Google Cloud project, share your Drive folders with the service account email, and the agent accesses only those shared folders.

**Skills that use this integration:**

- `google-drive` — Read files, write outputs, manage folders in selected Drive folders

**Agents that typically enable this integration:**

- Google Ads Manager (creative assets for campaigns)
- Meta Ads Manager (creative assets for campaigns)
- Social Manager (post-ready media library)

## Availability

| Mode | Status | Notes |
|------|--------|-------|
| Service Account JSON | Available | Google Cloud service account with Drive API access. Folders shared by the user. |

## Prerequisites

- **A Wiro API key** — [Authentication](/docs/authentication).
- **A deployed agent** — [Agent Overview](/docs/agent-overview).
- **A Google account** with a Drive you want the agent to access.
- **A Google Cloud project** to host the service account.

## Setup

### Step 1: Enable the Google Drive API

[Google Cloud Console](https://console.cloud.google.com/) → select project → **APIs & Services → Library** → **Google Drive API** → **Enable**.

If your agent will also read/write Google Docs or Sheets, enable those APIs as well:

- **Google Sheets API**
- **Google Docs API**

### Step 2: Create a service account

1. **IAM & Admin → Service accounts → Create service account**.
2. Name (e.g. "wiro-drive-agent").
3. Skip role grant → **Done**.
4. Open the service account → **Keys → Add key → Create new key → JSON**. Download.
5. Note the service account email from the account details page — format: `wiro-drive-agent@YOUR-PROJECT.iam.gserviceaccount.com`.

> **Tip:** In **[My Agents](https://wiro.ai/panel/agents)** → open your agent → **Credentials**, upload the JSON and your service account email will appear with a **Copy** button.

### Step 3: Share your Drive folders with the service account

For each folder you want the agent to access:

1. Open [Google Drive](https://drive.google.com).
2. Right-click the folder → **Share**.
3. Paste the service account email from Step 2.
4. Set role to **Editor** (if the folder lives in your **My Drive**) or **Content manager** (if the folder lives in a **Shared Drive**).
5. Click **Send**.

Copy each folder's **ID** from its Drive URL — the part after `/folders/`. Example: from `https://drive.google.com/drive/folders/1BxiMVs0XRA5nFMdKvBd` the ID is `1BxiMVs0XRA5nFMdKvBd`.

**Google Workspace users:** If you use a Shared Drive (Team Drive), add the service account as a **member** of the shared drive instead of sharing individual folders. All folders within the shared drive become accessible.

### Step 4: Base64-encode the JSON

```bash
# Linux
base64 -w 0 drive-service-account.json > drive-sa.b64

# macOS
base64 -b 0 drive-service-account.json > drive-sa.b64
```

### Step 5: Save to Wiro

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/CredentialUpsert" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "fields": [
      { "credentialkey": "googledrive",                                      "fieldname": "serviceaccountjsonbase64", "fieldvalue": "eyJ0eXBlIjoic2VydmljZV9hY2NvdW50Ii..." },
      { "credentialkey": "googledrive", "parentfield": "folders", "ordinal": 0, "fieldname": "id",                       "fieldvalue": "1BxiMVs0XRA5nFMdKvBd" },
      { "credentialkey": "googledrive", "parentfield": "folders", "ordinal": 0, "fieldname": "name",                     "fieldvalue": "Creatives" },
      { "credentialkey": "googledrive", "parentfield": "folders", "ordinal": 1, "fieldname": "id",                       "fieldvalue": "2CyiNWt1YSB6oGNeL" },
      { "credentialkey": "googledrive", "parentfield": "folders", "ordinal": 1, "fieldname": "name",                     "fieldvalue": "Ad Assets" }
    ]
  }'
```

| Field | Type | Description |
|-------|------|-------------|
| `serviceaccountjsonbase64` | string | Base64-encoded service account JSON key. |
| `folders` | array | Array of `{ "id": string, "name": string }` objects the agent should scan. `name` is the human-readable label — the agent uses it when reporting back to the operator ("scanned the Creatives folder..."); `id` is the Drive folder ID used in API calls. Pass an empty array to clear. |

### Step 5b (optional): Discover folders via API

If you don't already have folder IDs from Step 3, or you want to verify that the service account has access to the expected folders before saving them, call the folder discovery endpoint. This is the same endpoint the Wiro Dashboard uses for its folder picker.

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/GoogleDriveListFolders" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "serviceaccountjsonbase64": "eyJ0eXBlIjoic2VydmljZV9hY2NvdW50Ii..."
  }'
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `useragentguid` | string | Yes | Agent instance GUID. |
| `serviceaccountjsonbase64` | string | No | Base64-encoded SA JSON. Useful for previewing before saving. If omitted, the endpoint uses whatever JSON was already saved to the agent via Step 5. |

Response:

```json
{
  "result": true,
  "serviceAccountEmail": "wiro-drive-agent@your-project.iam.gserviceaccount.com",
  "folders": [
    { "id": "1BxiMVs0XRA5nFMdKvBd", "name": "Creatives", "modifiedTime": "2026-04-10T12:34:00Z", "ownerName": "design@yourcompany.com" },
    { "id": "2CyiNWt1YSB6oGNeL",  "name": "Ad Assets", "modifiedTime": "2026-04-12T09:12:00Z", "ownerName": "design@yourcompany.com" }
  ]
}
```

Only folders explicitly shared with the SA email (as Editor or Content manager — see Step 3) are returned. Take the `id` values from the folders you want the agent to scan and pass them as `folders`-prefixed field rows in your final `UserAgent/CredentialUpsert` call.

> **Two equivalent ways to run Steps 5–5b**
>
> - **Upfront** — you already know the folder IDs from Step 3. Call `UserAgent/CredentialUpsert` once with both the `serviceaccountjsonbase64` field row and every `folders` ordinal row.
> - **Discovery (matches the Dashboard flow)** — call `UserAgent/CredentialUpsert` first with just the `serviceaccountjsonbase64` field row, then call `UserAgentOAuth/GoogleDriveListFolders` to enumerate what the SA can see, then call `UserAgent/CredentialUpsert` again with the picked `folders` ordinal rows. The Dashboard uses this pattern — JSON upload renders the service account email, the user shares folders with it in Drive, and the folder picker lists the results.

### Step 6: Start the agent

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Start" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "guid": "your-useragent-guid" }'
```

## Runtime Behavior

Env vars exported when the `google-drive` skill is enabled:

- `GDRIVE_FOLDERS` — a JSON array string of `[{"id": "...", "name": "..."}]`, e.g. `[{"id":"1MMZGo...","name":"Creatives"}]`. Empty array `[]` means no folder is configured. Inside the agent, parse with `jq` (e.g. `echo $GDRIVE_FOLDERS | jq -r '.[].id'` for IDs, or `jq -r '.[] | select(.name=="Creatives") | .id'` to resolve a folder ID by name).

Secret file:

- `/run/secrets/gdrive-sa.json` — decoded service account (file, not env)

Auth: OAuth access token minted from the service account on-demand via the `gdrive-token` bin script → `Authorization: Bearer`. Token expires every hour; the script is called fresh before each API session.

Base URLs:

- Drive API: `https://www.googleapis.com/drive/v3/...`
- Sheets API: `https://sheets.googleapis.com/v4/...`
- Docs API: `https://docs.googleapis.com/v1/...`

All list/get/upload calls pass `supportsAllDrives=true` + `includeItemsFromAllDrives=true`, so Shared Drives are supported automatically.

## Files created by the agent

When the agent creates a file inside a user-shared folder, the file is owned by the service account, not the user. The user can see the file via folder permission inheritance, but may see it as "view only". To give the user write access on files the agent creates (role `writer` in the Drive API — shown as **Editor** in My Drive or **Content manager** in a Shared Drive), the skill grants permissions programmatically via `POST /drive/v3/files/{fileId}/permissions`. See the `google-drive` skill for details.

## Troubleshooting

- **403 "The user does not have sufficient permissions for file":** The folder hasn't been shared with the service account, or the service account was given a read-only role (Viewer / Commenter) instead of a write role. Go back to Google Drive → Share the folder with the SA email as **Editor** (My Drive) or **Content manager** (Shared Drive).
- **403 on specific file inside a shared folder:** The file was added by someone else and hasn't inherited folder permissions yet. Force inheritance by resharing the folder, or share the specific file directly.
- **"Invalid JWT token":** Service account JSON corrupt or truncated. Re-encode (watch for line breaks — use `base64 -w 0` on Linux, `base64 -b 0` on macOS).
- **Agent can't find new files:** The agent only sees files inside folders listed in `folders`. Add new folder IDs to the list and restart.
- **User sees files as "view only":** Files created by the SA inside user folders are SA-owned. The skill should grant the user write access (role `writer` — **Editor** in My Drive, **Content manager** in Shared Drive); if this step is skipped, the user sees view-only. Manual fix: right-click the file → Share → grant yourself write access.

## Related

- [Agent Credentials & OAuth](/docs/agent-credentials)
- [Agent Overview](/docs/agent-overview)
- [Agent Skills](/docs/agent-skills)
- [Google Drive API docs](https://developers.google.com/drive)
- [Google Sheets API docs](https://developers.google.com/sheets)
- [Google Docs API docs](https://developers.google.com/docs)
