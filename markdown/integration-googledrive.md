# Google Drive Integration

Connect your agents to Google Drive to read, write, and organize files across selected folders.

## Overview

The Google Drive integration lets an agent list, download, upload, and organize files in specific Drive folders the connecting user selects.

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

- **A Wiro API key** — see [Authentication](/docs/authentication).
- **A deployed agent** — see [Agent Overview](/docs/agent-overview).
- **A Google account** for the connecting user.
- **(Own mode only) A Google Cloud project** with the Drive API enabled.
- **An HTTPS callback URL**.

## Complete Integration Walkthrough — Wiro Mode

1. `POST /UserAgentOAuth/GoogleDriveConnect` with `userAgentGuid` + `redirectUrl`.
2. User consents.
3. Callback returns `?gdrive_connected=true` plus a folder picker state — the user selects one or more folders.
4. Agent is now scoped to those folders only.

## Complete Integration Walkthrough — Own Mode

### Step 1: Create a Google Cloud Project

Same as for Google Ads. Enable the **Drive API** under **APIs & Services → Library**.

### Step 2: OAuth consent screen

1. **APIs & Services → OAuth consent screen**.
2. User type: **External**.
3. Scopes: add `https://www.googleapis.com/auth/drive.file` (lets the user grant access to specific files/folders).

### Step 3: Create OAuth 2.0 Client ID

1. **APIs & Services → Credentials → Create credentials → OAuth client ID**.
2. Application type: **Web application**.
3. **Authorized redirect URIs**:

   ```
   https://api.wiro.ai/v1/UserAgentOAuth/GoogleDriveCallback
   ```

4. Save; copy **Client ID** and **Client Secret**.

### Step 4: Save credentials

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

### Step 5: Initiate OAuth

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

### Step 6: Handle callback

User returns with `?gdrive_connected=true` and (when applicable) the folder selector is triggered in the Wiro Dashboard UI. If you are building your own UI:

```javascript
const params = new URLSearchParams(window.location.search);
if (params.get("gdrive_connected") === "true") {
  // Present folder picker by calling your own Drive-integrated picker
  // or rely on the agent's folder selection UI in Wiro Dashboard.
}
```

Folder selection is persisted by the dashboard via `GoogleDriveSetFolders`; in headless flows, set the folder IDs directly in credentials:

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Update" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "guid": "your-useragent-guid",
    "configuration": {
      "credentials": {
        "googledrive": {
          "folders": [
            { "id": "1AbCdEfGhIjKlMn", "name": "Agent Outputs" }
          ]
        }
      }
    }
  }'
```

Up to 5 folders can be set per agent.

### Step 7: Verify

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/GoogleDriveStatus" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "userAgentGuid": "your-useragent-guid" }'
```

## API Reference

### **POST** /UserAgentOAuth/GoogleDriveConnect

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userAgentGuid` | string | Yes | Agent instance GUID. |
| `redirectUrl` | string | Yes | HTTPS URL. |
| `authMethod` | string | No | `"wiro"` (default) or `"own"`. |

### **GET** /UserAgentOAuth/GoogleDriveCallback

Callback query params: `gdrive_connected=true` on success, `gdrive_error=<code>` on failure.

### **POST** /UserAgentOAuth/GoogleDriveStatus / GoogleDriveDisconnect

Standard shape.

### **POST** /UserAgentOAuth/TokenRefresh

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/TokenRefresh" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "userAgentGuid": "your-useragent-guid", "provider": "googledrive" }'
```

## Troubleshooting

| Error code | Meaning | What to do |
|------------|---------|------------|
| `authorization_denied` | User cancelled, or user is not a Test user while consent screen is in Testing. | Add test user or publish consent screen. |
| `session_expired` | State cache expired. | Restart. |
| `token_exchange_failed` | Wrong Client Secret or redirect URI mismatch. | Re-copy; verify URL. |
| `useragent_not_found` | Invalid `userAgentGuid`. | Use `POST /UserAgent/MyAgents`. |
| `invalid_config` | No `credentials.googledrive` on agent. | Update with credentials. |
| `internal_error` | Server error. | Retry; contact support. |

### Agent cannot see folders it did not request

`drive.file` scope is intentionally narrow — it grants access only to files created by the app or opened via a picker. Files in the user's Drive that the agent did not create or that were not explicitly shared via the folder selector remain invisible.

## Multi-Tenant Architecture

1. One Google Cloud project per product. Publish the consent screen before rolling out to many tenants.
2. Rate limits are per-project; monitor quotas in Google Cloud Console.
3. Per-agent folder selection is isolated — Customer A's folders are never visible to Customer B.

## Related

- [Agent Credentials & OAuth](/docs/agent-credentials)
- [Agent Overview](/docs/agent-overview)
- [Agent Skills](/docs/agent-skills)
- [Google Drive API docs](https://developers.google.com/drive/api)
