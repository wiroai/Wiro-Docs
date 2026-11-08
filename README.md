<div align="center">

<img src="https://raw.githubusercontent.com/wiroai/Wiro-Docs/main/.github/assets/wiro-logo.png" alt="Wiro AI" width="240">

# Wiro API Documentation

Source of the Wiro AI API docs at wiro.ai/docs: a static HTML site with per-page Markdown and llms.txt covering model runs, tasks, WebSocket, LLM streaming, realtime voice and the Agent API.

[![License: MIT](https://img.shields.io/badge/license-MIT-111111?style=for-the-badge&color=111111)](./LICENSE) [![llms.txt included](https://img.shields.io/badge/llms.txt-included-111111?style=for-the-badge&color=111111)](./llms.txt) [![No build step](https://img.shields.io/badge/build%20step-none-111111?style=for-the-badge&color=111111)](#run-locally)

[Website](https://wiro.ai) · [Models](https://wiro.ai/models) · [Docs](https://wiro.ai/docs) · [Dashboard](https://wiro.ai/panel)

</div>

This repository is the source of [wiro.ai/docs](https://wiro.ai/docs), the reference for the Wiro AI API: authentication, running models, tasks, WebSocket and LLM streaming, realtime voice, files, the LLM gateway, the Agent API, organizations, and the MCP and n8n integrations. Every page lives inline in `index.html`, so the full text can be read without JavaScript, and each page also has a Markdown copy in `markdown/`, next to a full bundle and an `llms.txt` summary for LLMs and crawlers. `serve.js`, a small Node.js server with no dependencies, serves each page at its own `/docs/<slug>` path with its own meta tags.

---

## Why this repo?

| Goal | What you get |
|------|----------------|
| 📖 **Human readers** | Pixel-aligned docs UI: navigation, dark mode, code panel with **Shiki** highlighting |
| 🤖 **LLMs** | All sections live in **`index.html`**, readable without JS; **`llms.txt`** + **Markdown** exports |
| 🔌 **Integrators** | Same content as the product docs: **Run**, **Tasks**, **WebSocket**, **LLM streaming**, **Realtime voice**, **Files** |

---

## Features

- 🏠 **One HTML source, no build step**: every page lives in `index.html`, with `css/` and `js/` for the UI
- 🌙 **Dark / light theme** with persistent toggle
- 📱 **Responsive** sidebar + mobile drawer
- 🔍 **Full-text search** with `⌘K` / `Ctrl+K` shortcut, recent searches (localStorage), and keyboard navigation
- 📑 **Table of contents**: auto-generated "On this page" panel with scroll spy
- 💻 **Code examples** panel in **9 languages** (curl, Python, Node.js, PHP, C#, Go, Swift, Kotlin, Dart)
- 🧩 **Model browser** (list/search via API when deployed; CORS may limit localhost)
- 📄 **Markdown per section** (`markdown/{slug}.md`) + full bundle: **`markdown/full-documentation.md`**
- 📋 **`llms.txt`**: machine-readable summary for crawlers and tools
- 🔎 **Per-page SEO**: `serve.js` gives every page its own title, description, Open Graph and Twitter Card tags, canonical URL and JSON-LD; unknown paths get a `noindex` 404 page
- 🗺️ **Sitemap & robots.txt** for search engine crawlers

---

## Documentation map

One row per page, in sidebar order. Each path is live under `https://wiro.ai`.

| Section | Path | Markdown |
|---------|------|----------|
| **Getting Started** | | |
| Introduction | `/docs/introduction` | [introduction.md](./markdown/introduction.md) |
| Authentication | `/docs/authentication` | [authentication.md](./markdown/authentication.md) |
| Projects | `/docs/projects` | [projects.md](./markdown/projects.md) |
| **Model API Reference** | | |
| Models | `/docs/models` | [models.md](./markdown/models.md) |
| Run a Model | `/docs/run-a-model` | [run-a-model.md](./markdown/run-a-model.md) |
| Direct LLM Gateway | `/docs/completions-api` | [completions-api.md](./markdown/completions-api.md) |
| Model Parameters | `/docs/model-parameters` | [model-parameters.md](./markdown/model-parameters.md) |
| Tasks | `/docs/tasks` | [tasks.md](./markdown/tasks.md) |
| LLM & Chat Streaming | `/docs/llm-chat-streaming` | [llm-chat-streaming.md](./markdown/llm-chat-streaming.md) |
| WebSocket | `/docs/websocket` | [websocket.md](./markdown/websocket.md) |
| Realtime Voice Conversation | `/docs/realtime-voice-conversation` | [realtime-voice-conversation.md](./markdown/realtime-voice-conversation.md) |
| Realtime Text to Speech | `/docs/realtime-text-to-speech` | [realtime-text-to-speech.md](./markdown/realtime-text-to-speech.md) |
| Realtime Speech to Text | `/docs/realtime-speech-to-text` | [realtime-speech-to-text.md](./markdown/realtime-speech-to-text.md) |
| Files | `/docs/files` | [files.md](./markdown/files.md) |
| Pricing | `/docs/pricing` | [pricing.md](./markdown/pricing.md) |
| Concurrency Limits | `/docs/concurrency-limits` | [concurrency-limits.md](./markdown/concurrency-limits.md) |
| Error Reference | `/docs/error-reference` | [error-reference.md](./markdown/error-reference.md) |
| FAQ | `/docs/faq` | [faq.md](./markdown/faq.md) |
| **Workflow & Studio API Reference** | | |
| Workflows | `/docs/workflows` | [workflows.md](./markdown/workflows.md) |
| Workflow Agent | `/docs/workflow-agent` | [workflow-agent.md](./markdown/workflow-agent.md) |
| Studio | `/docs/studio` | [studio.md](./markdown/studio.md) |
| **Agent API Reference** | | |
| Agent Overview | `/docs/agent-overview` | [agent-overview.md](./markdown/agent-overview.md) |
| Agent Builder | `/docs/agent-builder` | [agent-builder.md](./markdown/agent-builder.md) |
| Agent Messaging | `/docs/agent-messaging` | [agent-messaging.md](./markdown/agent-messaging.md) |
| Agent WebSocket | `/docs/agent-websocket` | [agent-websocket.md](./markdown/agent-websocket.md) |
| Agent Webhooks | `/docs/agent-webhooks` | [agent-webhooks.md](./markdown/agent-webhooks.md) |
| Agent Credentials & OAuth | `/docs/agent-credentials` | [agent-credentials.md](./markdown/agent-credentials.md) |
| Agent Skills | `/docs/agent-skills` | [agent-skills.md](./markdown/agent-skills.md) |
| Agent Transactions | `/docs/agent-transactions` | [agent-transactions.md](./markdown/agent-transactions.md) |
| Agent Logs | `/docs/agent-logs` | [agent-logs.md](./markdown/agent-logs.md) |
| Agent Use Cases | `/docs/agent-use-cases` | [agent-use-cases.md](./markdown/agent-use-cases.md) |
| **Skills Integration** | | |
| Meta Ads | `/docs/integration-metaads-skills` | [integration-metaads-skills.md](./markdown/integration-metaads-skills.md) |
| TikTok Ads | `/docs/integration-tiktokads-skills` | [integration-tiktokads-skills.md](./markdown/integration-tiktokads-skills.md) |
| Shopify | `/docs/integration-shopify-skills` | [integration-shopify-skills.md](./markdown/integration-shopify-skills.md) |
| WooCommerce | `/docs/integration-woocommerce-skills` | [integration-woocommerce-skills.md](./markdown/integration-woocommerce-skills.md) |
| Reddit | `/docs/integration-reddit-skills` | [integration-reddit-skills.md](./markdown/integration-reddit-skills.md) |
| Facebook Page | `/docs/integration-facebook-skills` | [integration-facebook-skills.md](./markdown/integration-facebook-skills.md) |
| Instagram | `/docs/integration-instagram-skills` | [integration-instagram-skills.md](./markdown/integration-instagram-skills.md) |
| LinkedIn | `/docs/integration-linkedin-skills` | [integration-linkedin-skills.md](./markdown/integration-linkedin-skills.md) |
| Twitter / X | `/docs/integration-twitter-skills` | [integration-twitter-skills.md](./markdown/integration-twitter-skills.md) |
| TikTok | `/docs/integration-tiktok-skills` | [integration-tiktok-skills.md](./markdown/integration-tiktok-skills.md) |
| Google Ads | `/docs/integration-googleads-skills` | [integration-googleads-skills.md](./markdown/integration-googleads-skills.md) |
| YouTube | `/docs/integration-youtube-skills` | [integration-youtube-skills.md](./markdown/integration-youtube-skills.md) |
| Google Analytics 4 | `/docs/integration-ga4-skills` | [integration-ga4-skills.md](./markdown/integration-ga4-skills.md) |
| Roasit | `/docs/integration-roasit-skills` | [integration-roasit-skills.md](./markdown/integration-roasit-skills.md) |
| Merchant Center | `/docs/integration-merchantcenter-skills` | [integration-merchantcenter-skills.md](./markdown/integration-merchantcenter-skills.md) |
| Google Business Profile | `/docs/integration-googlebusiness-skills` | [integration-googlebusiness-skills.md](./markdown/integration-googlebusiness-skills.md) |
| HubSpot | `/docs/integration-hubspot-skills` | [integration-hubspot-skills.md](./markdown/integration-hubspot-skills.md) |
| Mailchimp | `/docs/integration-mailchimp-skills` | [integration-mailchimp-skills.md](./markdown/integration-mailchimp-skills.md) |
| Google Drive | `/docs/integration-googledrive-skills` | [integration-googledrive-skills.md](./markdown/integration-googledrive-skills.md) |
| Google Calendar | `/docs/integration-google-calendar-skills` | [integration-google-calendar-skills.md](./markdown/integration-google-calendar-skills.md) |
| Serper Web Search | `/docs/integration-serper-search-skills` | [integration-serper-search-skills.md](./markdown/integration-serper-search-skills.md) |
| Gmail | `/docs/integration-gmail-skills` | [integration-gmail-skills.md](./markdown/integration-gmail-skills.md) |
| Telegram | `/docs/integration-telegram-skills` | [integration-telegram-skills.md](./markdown/integration-telegram-skills.md) |
| Firebase | `/docs/integration-firebase-skills` | [integration-firebase-skills.md](./markdown/integration-firebase-skills.md) |
| WordPress | `/docs/integration-wordpress-skills` | [integration-wordpress-skills.md](./markdown/integration-wordpress-skills.md) |
| App Store Connect | `/docs/integration-appstore-skills` | [integration-appstore-skills.md](./markdown/integration-appstore-skills.md) |
| Google Play | `/docs/integration-googleplay-skills` | [integration-googleplay-skills.md](./markdown/integration-googleplay-skills.md) |
| Apollo | `/docs/integration-apollo-skills` | [integration-apollo-skills.md](./markdown/integration-apollo-skills.md) |
| Lemlist | `/docs/integration-lemlist-skills` | [integration-lemlist-skills.md](./markdown/integration-lemlist-skills.md) |
| Brevo | `/docs/integration-brevo-skills` | [integration-brevo-skills.md](./markdown/integration-brevo-skills.md) |
| SendGrid | `/docs/integration-sendgrid-skills` | [integration-sendgrid-skills.md](./markdown/integration-sendgrid-skills.md) |
| Twilio Voice | `/docs/integration-twiliovoice-skills` | [integration-twiliovoice-skills.md](./markdown/integration-twiliovoice-skills.md) |
| Web Voice | `/docs/integration-webvoice-skills` | [integration-webvoice-skills.md](./markdown/integration-webvoice-skills.md) |
| **Organizations & Teams** | | |
| Overview | `/docs/organizations-overview` | [organizations-overview.md](./markdown/organizations-overview.md) |
| Managing Teams | `/docs/organizations-managing-teams` | [organizations-managing-teams.md](./markdown/organizations-managing-teams.md) |
| Team Billing & Spending | `/docs/organizations-billing` | [organizations-billing.md](./markdown/organizations-billing.md) |
| Team API Access | `/docs/organizations-api-access` | [organizations-api-access.md](./markdown/organizations-api-access.md) |
| **Integrations** | | |
| Wiro MCP Server | `/docs/wiro-mcp-server` | [wiro-mcp-server.md](./markdown/wiro-mcp-server.md) |
| Self-Hosted MCP | `/docs/mcp-self-hosted` | [mcp-self-hosted.md](./markdown/mcp-self-hosted.md) |
| Node.js Library | `/docs/nodejs-library` | [nodejs-library.md](./markdown/nodejs-library.md) |
| n8n Wiro Integration | `/docs/n8n-wiro-integration` | [n8n-wiro-integration.md](./markdown/n8n-wiro-integration.md) |
| **Code Examples** | | |
| Code Examples | `/docs/code-examples` | [code-examples.md](./markdown/code-examples.md) |

> **Full export:** [full-documentation.md](./markdown/full-documentation.md)

---

## Run locally

`serve.js` only uses Node.js built-in modules, so there is nothing to install:

```bash
node serve.js
```

Open **http://localhost:8000/docs/** (set `PORT` to use another port). Each page is served at its own path, for example `/docs/files` or `/docs/tasks`, with its own meta tags. Unknown paths return a 404 page, and `/docs/index.html` returns the full file with every section inline.

Keep `data-base-path="/docs"` on the `<html>` tag of `index.html`: it matches the path `serve.js` serves under.

---

## Project structure

```
Wiro-Docs/
├── README.md
├── LICENSE
├── .gitignore
├── index.html                  # Every doc page inline (readable without JS)
├── serve.js                    # Node server: one document per page, per-page meta, search index
├── llms.txt                    # Machine-readable API summary
├── sitemap.xml                 # Sitemap with priorities and change frequencies
├── robots.txt                  # Crawler directives with sitemap reference
├── assets/                     # SVG logos for MCP clients and integrations
├── css/
│   ├── docs.css                # Layout, theme (light/dark), typography, components
│   ├── wiro-foundation.css     # Design-system tokens and component styles
│   ├── mcp-clients.css         # MCP client logos as CSS masks
│   ├── lineicons-free.css      # Lineicons icon font
│   └── cursor-custom-llm.png   # Screenshot used on the Direct LLM Gateway page
├── js/
│   ├── app.js                  # Navigation, search, TOC, code panel, Shiki
│   └── helpers.js              # Model browser (Tool/List) + shared helpers
├── licenses/
│   └── lineicons-MIT.md        # Lineicons license
└── markdown/                   # One {slug}.md per page + full-documentation.md, kept in sync with index.html (see Contributing)
```

---

## Contributing

We follow **conventional, changelog-friendly** commits:

| Prefix | Use for |
|--------|---------|
| `[docs]` | API text, examples, `index.html`, `llms.txt`, `markdown/*.md` |
| `[system]` | CSS, JS, layout, navigation, tooling |

**Do not mix** `[docs]` and `[system]` in one commit.

When you change **`index.html`** API content, update the matching **`markdown/{slug}.md`** and **`markdown/full-documentation.md`** in the same change.

---

## More from Wiro AI

| Repository | What it is |
| --- | --- |
| [Wiro-MCP](https://github.com/wiroai/Wiro-MCP) | Official MCP server for Wiro AI, [`@wiro-ai/wiro-mcp` on npm](https://www.npmjs.com/package/@wiro-ai/wiro-mcp) |
| [Wiro-Plugin](https://github.com/wiroai/Wiro-Plugin) | Wiro AI plugin for Cursor, Claude Code, Gemini CLI and Devin |
| [Swift-QuickStart](https://github.com/wiroai/Swift-QuickStart) | WiroKit, the Wiro AI SDK for iOS |
| [Kotlin-QuickStart](https://github.com/wiroai/Kotlin-QuickStart) | WiroKit, the Wiro AI SDK for Android |
| [Dart-QuickStart](https://github.com/wiroai/Dart-QuickStart) | Wiro AI SDK for Dart and Flutter, [`wiro` on pub.dev](https://pub.dev/packages/wiro) |
| [ReactNative-QuickStart](https://github.com/wiroai/ReactNative-QuickStart) | Wiro AI SDK for React Native and Expo, [`@wiro-ai/wiro-react-native` on npm](https://www.npmjs.com/package/@wiro-ai/wiro-react-native) |
| [Swift-Realtime](https://github.com/wiroai/Swift-Realtime) | Realtime voice AI example for iOS |
| [Kotlin-Realtime](https://github.com/wiroai/Kotlin-Realtime) | Realtime voice AI example for Android |
| [Dart-Realtime](https://github.com/wiroai/Dart-Realtime) | Realtime voice AI example for Flutter |
| [ReactNative-Realtime](https://github.com/wiroai/ReactNative-Realtime) | Realtime voice AI example for React Native |
| [n8n-nodes-wiroai](https://github.com/wiroai/n8n-nodes-wiroai) | Wiro AI nodes for n8n, [`@wiro-ai/n8n-nodes-wiroai` on npm](https://www.npmjs.com/package/@wiro-ai/n8n-nodes-wiroai) |

[Website](https://wiro.ai) · [Models](https://wiro.ai/models) · [Docs](https://wiro.ai/docs) · [X](https://x.com/wiroai)

---

## License

MIT, see [LICENSE](./LICENSE).
