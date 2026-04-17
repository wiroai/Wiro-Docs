# WordPress Integration

Connect your agents to a self-hosted WordPress site to publish posts and pages.

## Overview

The WordPress integration uses the WordPress REST API with Basic Authentication backed by a WordPress Application Password.

**Skills that use this integration:**

- `wordpress-post` — Publish blog posts, pages, categories, tags

**Agents that typically enable this integration:**

- Blog Content Editor

## Availability

| Mode | Status | Notes |
|------|--------|-------|
| API key (Application Password) | Available | WordPress 5.6+ built-in Application Passwords feature. |

## Prerequisites

- **A Wiro API key** — see [Authentication](/docs/authentication).
- **A deployed agent** — see [Agent Overview](/docs/agent-overview).
- **A WordPress site** (self-hosted or WordPress.com Business/Commerce) running **WordPress 5.6 or newer**.
- **An admin or editor-level user** on that site.

## Setup

### Step 1: Enable Application Passwords (if disabled)

Application Passwords are enabled by default since WordPress 5.6. If your host or security plugin disabled them:

- In `wp-config.php`, confirm `define('WP_ENVIRONMENT_TYPE', 'production');` is not restricting them.
- Security plugins like Wordfence or iThemes Security may disable Application Passwords — check their settings.

### Step 2: Create an Application Password

1. Log in as the user the agent will post as.
2. Go to **Users → Profile** (or **Users → All Users → Edit** for another user if you are an admin).
3. Scroll to **Application Passwords**.
4. Enter a name like "Wiro agent" and click **Add New Application Password**.
5. Copy the generated 24-character password (spaces are cosmetic — Wiro accepts either form).

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
| `url` | string | Site URL (include `https://`, no trailing slash). |
| `user` | string | WordPress username the Application Password belongs to. |
| `appPassword` | string | 24-character Application Password. |

## Troubleshooting

- **401 Unauthorized on REST API calls:** Verify the username matches the user who created the Application Password. Usernames are case-sensitive in some setups.
- **REST API returns 404 at `/wp-json/`:** Permalinks must be set to something other than Plain. Go to **Settings → Permalinks** and pick any pretty-permalink option.
- **Hosted WordPress.com Business plans:** Enable the REST API via Jetpack settings and ensure the Business plan grants API access.
- **Cloudflare/WAF blocking PUT/POST:** Some firewalls block REST API writes by default. Whitelist Wiro's outbound IPs (contact support for the list) or allow your `/wp-json/wp/v2/posts` endpoint.

## Related

- [Agent Credentials & OAuth](/docs/agent-credentials)
- [Agent Overview](/docs/agent-overview)
- [Agent Skills](/docs/agent-skills)
- [WordPress Application Passwords docs](https://make.wordpress.org/core/2020/11/05/application-passwords-integration-guide/)
