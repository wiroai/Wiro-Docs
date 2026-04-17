# Google Drive Integration

Connect your agent to Google Drive to read, write, and organize files in selected folders.

## Overview

The Google Drive integration uses Google's OAuth 2.0 with the full Drive API. The connecting user explicitly picks which folders the agent can access.

**Skills that use this integration:**

- `google-drive` — Read files, write outputs, manage folders

**Agents that typically enable this integration:**

- Any content or research agent that needs persistent file storage accessible to humans.

## Availability

| Mode | Status | Notes |
|------|--------|-------|
| `"wiro"` | Available | One-click connect with Wiro's Google Cloud project. |
| `"own"` | Available | Your own Google Cloud project for custom branding. |

## Prerequisites

- **A Wiro API key** — [Authentication](/docs/authentication).
- **A deployed agent** — [Agent Overview](/docs/agent-overview).
- **A Google account** for the connecting user.
- **(Own mode) A Google Cloud project** with the Drive API enabled.
- **An HTTPS callback URL**.

## Wiro Mode

Call `GoogleDriveConnect` without `authMethod`, redirect user, parse `gdrive_connected=true&gdrive_folders=<JSON>` on return.

## Complete Integration Walkthrough — Own Mode

### Step 1: Create a Google Cloud Project

1. [console.cloud.google.com](https://console.cloud.google.com/) → create a project.
2. **APIs & Services → Library** → enable **Drive API**.
3. **OAuth consent screen**:
   - **External** user type.
   - App name, support email.
   - Add scope: `https://www.googleapis.com/auth/drive`.
   - Test users (while in Testing status).

### Step 2: Create OAuth 2.0 Client ID

1. **APIs & Services → Credentials → Create credentials → OAuth client ID**.
2. Application type: **Web application**.
3. **Authorized redirect URIs**:

   ```
   https://api.wiro.ai/v1/UserAgentOAuth/GoogleDriveCallback
   ```

4. Save; copy **Client ID** and **Client Secret**.

### Step 3: Save credentials to Wiro

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Update" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "guid": "your-useragent-guid",
    "configuration": {
      "credentials": {
        "googledrive": {
          "clientId": "YOUR_GOOGLE_OAUTH_CLIENT_ID",
          "clientSecret": "YOUR_GOOGLE_OAUTH_CLIENT_SECRET"
        }
      }
    }
  }'
```

### Step 4: Initiate OAuth

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/GoogleDriveConnect" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "userAgentGuid": "your-useragent-guid",
    "redirectUrl": "https://your-app.com/settings/integrations",
    "authMethod": "own"
  }'
```

Response:

```json
{
  "result": true,
  "authorizeUrl": "https://accounts.google.com/o/oauth2/v2/auth?client_id=...&redirect_uri=...&response_type=code&scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fdrive&state=...&access_type=offline&prompt=consent",
  "errors": []
}
```

Wiro requests the **full `drive` scope** (not the narrow `drive.file`). This is needed for folder discovery and file operations across the user's Drive.

### Step 5: Handle the callback

After the token exchange, Wiro queries Drive's `files.list` for root-level folders and prepends a virtual `{ id: "shared", name: "Shared with me", virtual: true }` entry. These folder suggestions are returned in the callback URL.

**Success URL:**

```
https://your-app.com/settings/integrations?gdrive_connected=true&gdrive_folders=%5B%7B%22id%22%3A%22shared%22%2C%22name%22%3A%22Shared%20with%20me%22%2C%22virtual%22%3Atrue%7D%2C%7B%22id%22%3A%221AbC%22%2C%22name%22%3A%22Agent%20Outputs%22%7D%5D
```

`gdrive_folders` is `encodeURIComponent(JSON.stringify([...]))`. Each entry: `{ id, name, virtual? }`.

```javascript
const params = new URLSearchParams(window.location.search);
if (params.get("gdrive_connected") === "true") {
  const folders = JSON.parse(decodeURIComponent(params.get("gdrive_folders") || "[]"));
  presentFolderPicker(folders);
}
```

### Step 6: Browse more folders (optional)

If the user wants to drill into subfolders rather than pick from root, call:

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/GoogleDriveListFolder" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "userAgentGuid": "your-useragent-guid",
    "parentId": "1AbC",
    "searchQuery": ""
  }'
```

Response:

```json
{
  "result": true,
  "folders": [
    {
      "id": "2XyZ",
      "name": "2025 Q1"
    },
    {
      "id": "3MnO",
      "name": "Archive"
    }
  ],
  "errors": []
}
```

- `parentId` defaults to `"root"`.
- `searchQuery` is optional; passes through to Drive's query syntax.

### Step 7: Persist selected folders

Once the user picks (up to 5 folders), commit the selection:

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/GoogleDriveSetFolder" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "userAgentGuid": "your-useragent-guid",
    "folders": [
      {
        "id": "1AbC",
        "name": "Agent Outputs"
      },
      {
        "id": "2XyZ",
        "name": "2025 Q1"
      }
    ]
  }'
```

Note the endpoint is `GoogleDriveSetFolder` (singular) even though it accepts an array.

Response:

```json
{
  "result": true,
  "folders": [
    {
      "id": "1AbC",
      "name": "Agent Outputs"
    },
    {
      "id": "2XyZ",
      "name": "2025 Q1"
    }
  ],
  "errors": []
}
```

Requirements:

- `folders` must be a non-empty array.
- Each item needs `id`; `name` is optional (falls back to empty string).
- Maximum **5** folders per agent. Sending more than 5 fails with `Maximum 5 folders allowed` — the request is rejected, not truncated.

Triggers agent restart if running.

### Step 8: Verify

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/GoogleDriveStatus" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "userAgentGuid": "your-useragent-guid" }'
```

Response:

```json
{
  "result": true,
  "connected": true,
  "folders": [
    {
      "id": "1AbC",
      "name": "Agent Outputs"
    },
    {
      "id": "2XyZ",
      "name": "2025 Q1"
    }
  ],
  "connectedAt": "2026-04-17T12:00:00.000Z",
  "tokenExpiresAt": "2026-04-17T13:00:00.000Z",
  "errors": []
}
```

- Access token lifetime: **1 hour** (short). The agent runs a background refresh cron every 45 minutes.
- No `refreshTokenExpiresAt` — Google refresh tokens don't normally expire.
- `folders` shows the currently selected folders (unique to Google Drive Status).

## Agent Runtime Usage (inside the container)

Once the OAuth flow is done and `GoogleDriveSetFolder` has persisted the folder selection, the agent container runs independently of the Wiro API — the `google-drive` platform skill (loaded from `skills/google-drive/SKILL.md`) reads env vars and talks to Google's REST APIs directly.

**Env vars exported by `docker/start.sh`** (only when `skills.google-drive` is enabled and a Drive `accessToken` exists):

| Env var | Source | Notes |
|---------|--------|-------|
| `GDRIVE_CLIENT_ID` | `credentials.googledrive.clientId` | For token refresh |
| `GDRIVE_CLIENT_SECRET` | `credentials.googledrive.clientSecret` | For token refresh |
| `GDRIVE_ACCESS_TOKEN` | `credentials.googledrive.accessToken` | **Auto-refreshed by the container every 45 minutes** via `POST /UserAgentOAuth/TokenRefresh` (short-lived: Google access tokens expire in 1 hour) |
| `GDRIVE_REFRESH_TOKEN` | `credentials.googledrive.refreshToken` | Passed to the refresh cron |
| `GDRIVE_FOLDERS` | `credentials.googledrive.folders` | JSON array of `[{id, name}]` — the user-selected folders from `GoogleDriveSetFolder` |

**How cron skills access the token:** There is **no `gdrive-token` helper command**. The agent reads the pre-refreshed token directly from the env var:

```
exec command="echo $GDRIVE_ACCESS_TOKEN"
```

Then uses it in curl calls as `Authorization: Bearer $GDRIVE_ACCESS_TOKEN`. If an API call returns 401, the agent re-reads `$GDRIVE_ACCESS_TOKEN` (the 45-minute cron may have just refreshed it). See the full SKILL.md ([skills/google-drive/SKILL.md](https://github.com/wiroai/Wiro-Agent/blob/main/WiroAgent/.openclaw/workspace/skills/google-drive/SKILL.md)) for all endpoint examples.

**Checking folder selection in cron scripts:** Since `GDRIVE_FOLDERS` is a JSON array (not a single ID), cron skills check it like this:

```
exec command="echo $GDRIVE_FOLDERS"
```

Empty output or `[]` means the user hasn't selected any folder yet — the scan should notify the operator and stop instead of iterating over an empty list.

### Step 9: Start the agent

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Start" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "guid": "your-useragent-guid" }'
```

## API Reference

### POST /UserAgentOAuth/GoogleDriveConnect

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userAgentGuid` | string | Yes | Agent instance GUID. |
| `redirectUrl` | string | Yes | HTTPS URL. |
| `authMethod` | string | No | `"wiro"` (default) or `"own"`. |

### GET /UserAgentOAuth/GoogleDriveCallback

Query params: `gdrive_connected=true&gdrive_folders=<JSON>` or `gdrive_error=<code>`.

### POST /UserAgentOAuth/GoogleDriveListFolder

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userAgentGuid` | string | Yes | Agent instance GUID. |
| `parentId` | string | No | Drive folder ID to list. Defaults to `"root"`. Accepts the virtual `"shared"` ID. |
| `searchQuery` | string | No | Drive query string (passed through). |

Response: `{ result, folders: [{id, name}], errors }`.

### POST /UserAgentOAuth/GoogleDriveSetFolder

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userAgentGuid` | string | Yes | Agent instance GUID. |
| `folders` | object[] | Yes | Array of `{ id, name? }`. Max 5 items; sending more returns `Maximum 5 folders allowed`. |

Response: `{ result: true, folders: [{id, name}], errors: [] }`. Triggers agent restart if running.

### POST /UserAgentOAuth/GoogleDriveStatus

Response fields: `connected`, `folders` (selected folder list), `connectedAt`, `tokenExpiresAt` (~1h).

### POST /UserAgentOAuth/GoogleDriveDisconnect

Clears Google Drive credentials (no remote revoke).

### POST /UserAgentOAuth/TokenRefresh

> Running agents refresh Google Drive tokens automatically **every 45 minutes** (access tokens last 1 hour). Use this only for debugging.

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/TokenRefresh" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "userAgentGuid": "your-useragent-guid",
    "provider": "googledrive"
  }'
```

See [Automatic token refresh](/docs/agent-credentials#automatic-token-refresh).

## Using the Skill

The `google-drive` skill can browse, upload, download, and organize files within the selected folders.

## Troubleshooting

| Error code | Meaning | What to do |
|------------|---------|------------|
| `authorization_denied` | User cancelled, or consent screen in Testing and the user isn't a test user. | Add test user or publish consent screen. |
| `session_expired` | State cache expired (15 min). | Restart. |
| `token_exchange_failed` | Wrong Client Secret or redirect URI mismatch. | Re-copy; verify URL. |
| `useragent_not_found` | Invalid guid. | Use `POST /UserAgent/MyAgents`. |
| `invalid_config` | No `credentials.googledrive` block. | Update with credentials. |
| `internal_error` | Server error. | Retry. |

### Agent can't list folders beyond root

Use `GoogleDriveListFolder` with the `parentId` you want to drill into. Or call again with the `"shared"` virtual ID to see shared drives.

### "quotaExceeded" from Drive API

Rate limits are per-project in Google Cloud Console — check and raise quota as needed.

## Multi-Tenant Architecture

1. **One Google Cloud project** per product. Publish the consent screen.
2. **Rate limits are per-project.**
3. **Per-agent folder selection is isolated** — Customer A's folders never visible to B.

## Related

- [Agent Credentials & OAuth](/docs/agent-credentials)
- [Agent Overview](/docs/agent-overview)
- [Agent Skills](/docs/agent-skills)
- [Google Drive API docs](https://developers.google.com/drive/api)
