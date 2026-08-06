# Reddit Integration

Technical contract for connecting a Wiro agent to Reddit with a customer-owned Reddit web app. The endpoints remain documented, but the feature is not available until Reddit approves Wiro's commercial use and a written commercial contract is in force.

## Overview

The `reddit-post` skill supports:

- connected-user identity;
- subscribed and contributor subreddits;
- subreddit rules;
- text and link submissions;
- comments and replies;
- editing or deleting only content authored by the connected Reddit identity.

Voting, private messages, chat, moderation queues, bulk posting, mass cross-posting, scraping, and browser automation are out of scope.

> **Unavailable pending Reddit approval.** Wiro is a commercial product. A checkbox or customer-owned app does not authorize commercial Data API use. Wiro will not enable this integration until Reddit has granted explicit Data API approval for the use case and both parties have completed the required written commercial contract.

## Availability and policy requirements

| Mode | Status | Notes |
|------|--------|-------|
| Customer-owned OAuth app (`"own"`) | Unavailable pending Wiro approval/contract | The authorization-code endpoints and callback contract are implemented, but production access remains disabled. |
| Wiro shared app | Not offered | Each operator supplies and controls its own Reddit app. |
| Permanent pasted bearer token | Not supported | Access and refresh tokens are managed by the OAuth callback. |

The prerequisites are cumulative:

1. Reddit Data API approval for Wiro's described use case.
2. Reddit's explicit written commercial approval and completed contract.
3. A registered developer profile and visible App profile label.
4. A dedicated app account used only for app functions, not a mixed-use personal account.
5. A customer-owned Reddit `web app` registered with the Wiro callback.

Wiro's `apiaccessapproved: true` field is only an operator attestation. It grants no rights, does not replace Reddit review or the commercial contract, and does not make the currently unavailable feature usable.

## Prerequisites

- A deployed Wiro agent with the `reddit-post` skill enabled.
- A dedicated Reddit app account.
- A customer-owned Reddit app created as type **web app**.
- A registered Reddit developer profile and App profile label that accurately describes the app and its commercial purpose.
- Confirmed Reddit Data API approval plus Wiro's written commercial contract with Reddit.

## Technical setup after approval

The requests below describe the hard-cutover API contract for rollout readiness. They do not bypass the availability gate above.

### 1. Create the Reddit web app

Create the app in Reddit's developer settings and use this exact redirect URI:

```text
https://api.wiro.ai/v1/UserAgentOAuth/RedditCallback
```

Copy the app's client ID and client secret. The developer profile, App profile label, and dedicated app account must remain attached to this app; do not create duplicate accounts or apps to evade review or limits.

### 2. Save app credentials and the operator attestation

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/CredentialUpsert" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "fields": [
      { "credentialkey": "reddit", "fieldname": "authmethod", "fieldvalue": "own" },
      { "credentialkey": "reddit", "fieldname": "clientid", "fieldvalue": "YOUR_REDDIT_CLIENT_ID" },
      { "credentialkey": "reddit", "fieldname": "clientsecret", "fieldvalue": "YOUR_REDDIT_CLIENT_SECRET" },
      { "credentialkey": "reddit", "fieldname": "apiaccessapproved", "fieldvalue": true }
    ]
  }'
```

### 3. Start OAuth

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/OAuthConnect" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "useragentguid": "your-useragent-guid",
    "credentialkey": "reddit",
    "authmethod": "own",
    "redirecturl": "https://your-app.example/settings/integrations"
  }'
```

Open the returned `authorizeUrl` in the user's browser. Wiro requests these scopes:

```text
identity read mysubreddits submit edit history
```

`history` is used only for bounded recovery: after an ambiguous create/reply outcome, Wiro may inspect at most the connected user's latest 25 submissions/comments to determine whether the write landed. It is not permission for broad history collection.

The flow requests `duration=permanent`, allowing Wiro to refresh the one-hour access token with the callback-managed refresh token. After consent, the browser returns to your `redirecturl` with `reddit_connected=true` and the connected username. Production OAuth remains blocked until Wiro's approval/contract gate is complete.

## Check or disconnect

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/OAuthStatus" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "useragentguid": "your-useragent-guid", "credentialkey": "reddit" }'
```

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgentOAuth/OAuthDisconnect" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "useragentguid": "your-useragent-guid", "credentialkey": "reddit" }'
```

## Runtime safeguards

- Authenticated API calls use `https://oauth.reddit.com`; OAuth token calls use `https://www.reddit.com`.
- Every request includes the compliant, distinctive User-Agent `Wiro-Agent-Reddit/1.0 client/<CLIENT_ID> (+https://wiro.ai)`. Wiro does not use a browser/default User-Agent or misidentify the client.
- The agent reads subreddit rules before a write.
- One approval covers one concrete subreddit or fullname and one payload. A request to post everywhere is refused.
- The agent blocks duplicate and near-duplicate submissions and does not fan a single payload out across communities.
- Edits and deletes require a fresh ownership check against the connected Reddit username.
- Ambiguous write outcomes are not automatically retried.
- Recovery reads are bounded to the latest 25 items and require the `history` scope; no scraping or broad history retention is permitted.

## Rate limits

Reddit documents OAuth limits through the response headers:

- `X-Ratelimit-Used`
- `X-Ratelimit-Remaining`
- `X-Ratelimit-Reset` (seconds until reset)

The 100 queries-per-minute OAuth-client limit, averaged over a 10-minute window, applies only to clients that Reddit has found eligible for free Data API access. It is not a commercial entitlement. Wiro follows the limits and commercial terms assigned by Reddit; response headers and the executed contract are authoritative. Calls are sequential, and Wiro enters cooldown on HTTP 429 or a Reddit `RATELIMIT` error without retrying before reset.

## Deletion and retention obligations

- Wiro stores only bounded mutation/recovery metadata needed to prevent duplicate writes; it does not build or retain a broad Reddit history dataset.
- If a Reddit post or comment is deleted, all retained title, body, URL, and related content must be removed. If an account is deleted, retained user IDs and author-identifying references must also be removed.
- De-identified or anonymized copies of deleted Reddit content are not retained as a workaround.
- Stored Reddit data is routinely minimized and deletion checks follow Reddit's contract and compliance tooling; Reddit recommends removing stored user data/content within 48 hours.
- Disconnecting the integration stops new access but does not weaken obligations to honor content/account deletions already received.

## Related

- [Agent Credentials & OAuth](/docs/agent-credentials)
- [Agent Skills](/docs/agent-skills)
- [Reddit Developer Terms](https://redditinc.com/policies/developer-terms)
- [Reddit Data API Terms](https://redditinc.com/policies/data-api-terms)
- [Reddit API rules](https://github.com/reddit-archive/reddit/wiki/API)
