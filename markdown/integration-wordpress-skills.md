# WordPress Integration

Connect your agent to a WordPress site (self-hosted or WordPress.com Business+) to publish posts and pages.

## Overview

The WordPress integration uses the WordPress REST API with Basic Authentication backed by a WordPress Application Password.

**Skills that use this integration:**

- `wordpress-post` — Publish blog posts, pages, categories, tags; upload media

**Agents that typically enable this integration:**

- Blog Content Editor

## Availability

| Mode | Status | Notes |
|------|--------|-------|
| Application Password | Available | WordPress 5.6+ built-in Application Passwords. |

## Prerequisites

- **A Wiro API key** — [Authentication](/docs/authentication).
- **A deployed agent** — [Agent Overview](/docs/agent-overview).
- **A WordPress site** (self-hosted or WordPress.com Business/Commerce) running **WordPress 5.6+**.
- **An admin or editor-level user** on that site.

## Setup

### Step 1: Enable Application Passwords (if disabled)

Enabled by default in WP 5.6+. If your host or security plugin disabled them:

- In `wp-config.php`, confirm `WP_ENVIRONMENT_TYPE` isn't restricting them.
- Security plugins like Wordfence or iThemes Security sometimes disable Application Passwords — check their settings.

### Step 2: Create an Application Password

1. Log in as the user the agent will post as.
2. **Users → Profile** (or **Users → All Users → Edit** another user if you're admin).
3. Scroll to **Application Passwords**.
4. Name it "Wiro agent", **Add New Application Password**.
5. Copy the 24-character password (spaces are cosmetic; both forms work).

### Step 3: Save to Wiro

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Update" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "guid": "your-useragent-guid",
    "configuration": {
      "credentials": {
        "wordpress": {
          "url": "https://blog.example.com",
          "user": "WiroBlogAgent",
          "appPassword": "xxxx xxxx xxxx xxxx xxxx xxxx"
        }
      }
    }
  }'
```

### Step 4: Start the agent

```bash
curl -X POST "https://api.wiro.ai/v1/UserAgent/Start" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{ "guid": "your-useragent-guid" }'
```

## Credential Fields

| Field | Type | Description |
|-------|------|-------------|
| `url` | string | Site URL with `https://`, no trailing slash. |
| `user` | string | WordPress username the Application Password belongs to. |
| `appPassword` | string | 24-character Application Password. |

## Runtime Behavior

Env vars inside the agent container:

- `WORDPRESS_URL` ← `credentials.wordpress.url`
- `WORDPRESS_USER` ← `credentials.wordpress.user`
- `WORDPRESS_APP_PASSWORD` ← `credentials.wordpress.appPassword`

Auth: `--user "$WORDPRESS_USER:$WORDPRESS_APP_PASSWORD"` (Basic via Application Password).
Base URL: `$WORDPRESS_URL/wp-json/wp/v2/...`

## Troubleshooting

- **401 Unauthorized on REST API:** Username mismatch (case-sensitive on some setups), or Application Password invalid. Regenerate.
- **REST API returns 404 at `/wp-json/`:** Permalinks set to **Plain**. Go to **Settings → Permalinks** and pick any pretty-permalink option.
- **WordPress.com Business plan:** REST API access must be on via Jetpack settings.
- **Cloudflare/WAF blocking writes:** Whitelist Wiro's outbound IPs (contact support) or allow `/wp-json/wp/v2/posts` endpoints.

## Related

- [Agent Credentials & OAuth](/docs/agent-credentials)
- [Agent Overview](/docs/agent-overview)
- [Agent Skills](/docs/agent-skills)
- [WordPress Application Passwords](https://make.wordpress.org/core/2020/11/05/application-passwords-integration-guide/)
