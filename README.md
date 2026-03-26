<div align="center">

<img src="https://wiro.ai/images/logos/logo/logo.png" alt="Wiro" width="180" />

# Wiro API Documentation

**Open-source, static documentation for the [Wiro AI](https://wiro.ai) platform** — run **AI models** through one unified API.

[![Static site](https://img.shields.io/badge/docs-static-00c38c?style=for-the-badge&logo=html5&logoColor=white)](https://github.com/wiroai/Wiro-Docs)
[![API](https://img.shields.io/badge/API-v1-333?style=for-the-badge&logo=openapiinitiative&logoColor=white)](https://api.wiro.ai/v1)
[![LLM friendly](https://img.shields.io/badge/LLM-view--source%20OK-6f42c1?style=for-the-badge)](./llms.txt)

[Live docs](https://wiro.ai/docs) · [Dashboard](https://wiro.ai/panel) · [Explore](https://wiro.ai/explore) · [Models](https://wiro.ai/models) · [LLMs.txt](./llms.txt)

<img src="https://wiro.ai/images/koala/accent-heavy-koala.png" alt="Wiro Koala mascot" width="60" />

</div>

---

## ✨ Why this repo?

| Goal | What you get |
|------|----------------|
| 📖 **Human readers** | Pixel-aligned docs UI: navigation, dark mode, code panel with **Shiki** highlighting |
| 🤖 **LLMs** | All sections live in **`index.html`** — no JS required to read the text; **`llms.txt`** + **Markdown** exports |
| 🔌 **Integrators** | Same content as the product docs: **Run**, **Tasks**, **WebSocket**, **LLM streaming**, **Realtime voice**, **Files** |

---

## 🧠 Features

- 🏠 **Single-page static site** — `index.html` + `css/` + `js/` (no build step)
- 🌙 **Dark / light theme** with persistent toggle
- 📱 **Responsive** sidebar + mobile drawer
- 🔍 **Full-text search** with `⌘K` shortcut, recent searches (localStorage), and keyboard navigation
- 📑 **Table of contents** — auto-generated "On this page" panel with scroll spy
- 💻 **Code examples** panel in **9 languages** (curl, Python, Node.js, PHP, C#, Go, Swift, Kotlin, Dart)
- 🧩 **Model browser** (list/search via API when deployed; CORS may limit localhost)
- 📄 **Markdown per section** (`markdown/{slug}.md`) + full bundle: **`markdown/full-documentation.md`**
- 📋 **`llms.txt`** — machine-readable summary for crawlers and tools
- 🔎 **SEO optimized** — per-page meta tags (OG, Twitter Card), JSON-LD structured data, SSR meta injection via `serve.js`
- 🗺️ **Sitemap & robots.txt** for search engine crawlers

---

## 🗺️ Documentation map

| Section | Hash route | Markdown |
|---------|------------|----------|
| Introduction | `/docs/introduction` | [introduction.md](./markdown/introduction.md) |
| Authentication | `/docs/authentication` | [authentication.md](./markdown/authentication.md) |
| Projects | `/docs/projects` | [projects.md](./markdown/projects.md) |
| Models | `/docs/models` | [models.md](./markdown/models.md) |
| Run a Model | `/docs/run-a-model` | [run-a-model.md](./markdown/run-a-model.md) |
| Model Parameters | `/docs/model-parameters` | [model-parameters.md](./markdown/model-parameters.md) |
| Tasks | `/docs/tasks` | [tasks.md](./markdown/tasks.md) |
| LLM & Chat Streaming | `/docs/llm-chat-streaming` | [llm-chat-streaming.md](./markdown/llm-chat-streaming.md) |
| WebSocket | `/docs/websocket` | [websocket.md](./markdown/websocket.md) |
| Realtime Voice Conversation | `/docs/realtime-voice-conversation` | [realtime-voice-conversation.md](./markdown/realtime-voice-conversation.md) |
| Files | `/docs/files` | [files.md](./markdown/files.md) |
| Concurrency Limits | `/docs/concurrency-limits` | [concurrency-limits.md](./markdown/concurrency-limits.md) |
| Error Reference | `/docs/error-reference` | [error-reference.md](./markdown/error-reference.md) |
| Code Examples | `/docs/code-examples` | [code-examples.md](./markdown/code-examples.md) |
| Pricing | `/docs/pricing` | [pricing.md](./markdown/pricing.md) |
| FAQ | `/docs/faq` | [faq.md](./markdown/faq.md) |
| **Integrations** | | |
| Wiro MCP Server | `/docs/wiro-mcp-server` | [wiro-mcp-server.md](./markdown/wiro-mcp-server.md) |
| Self-Hosted MCP | `/docs/mcp-self-hosted` | [mcp-self-hosted.md](./markdown/mcp-self-hosted.md) |
| Node.js Library | `/docs/nodejs-library` | [nodejs-library.md](./markdown/nodejs-library.md) |
| n8n Wiro Integration | `/docs/n8n-wiro-integration` | [n8n-wiro-integration.md](./markdown/n8n-wiro-integration.md) |

> **Full export:** [full-documentation.md](./markdown/full-documentation.md)

---

## 🚀 Run locally

Uses path-based routing (`/docs/files`, `/docs/tasks`). The included Node server handles SPA fallback and SSR meta injection for SEO:

```bash
node serve.js
```

Before running locally, set the base path to empty in `index.html`:
```html
<html lang="en" data-base-path="">
```

On production, use PM2 with the included ecosystem config:
```bash
pm2 startOrReload ecosystem.config.cjs --env prod
```

Open **http://localhost:8000/docs/** (or the printed URL).

---

## 📁 Project structure

```
Wiro-Docs/
├── README.md
├── LICENSE
├── .gitignore
├── index.html                  # All doc sections inline (LLM-friendly)
├── serve.js                    # Node server with SSR meta injection for SEO
├── ecosystem.config.cjs        # PM2 config for production deployment
├── llms.txt                    # Machine-readable API summary
├── sitemap.xml                 # Sitemap with priorities and change frequencies
├── robots.txt                  # Crawler directives with sitemap reference
├── css/
│   └── docs.css                # Layout, theme (light/dark), typography, components
├── js/
│   ├── app.js                  # Navigation, search, TOC, code panel, Shiki
│   └── helpers.js              # Model browser (Tool/List) + shared helpers
└── markdown/                   # Must stay in sync with index.html (see Contributing)
    ├── full-documentation.md
    ├── introduction.md
    ├── authentication.md
    ├── projects.md
    ├── models.md
    ├── run-a-model.md
    ├── model-parameters.md
    ├── tasks.md
    ├── llm-chat-streaming.md
    ├── websocket.md
    ├── realtime-voice-conversation.md
    ├── files.md
    ├── pricing.md
    ├── concurrency-limits.md
    ├── error-reference.md
    ├── faq.md
    ├── code-examples.md
    ├── wiro-mcp-server.md
    ├── mcp-self-hosted.md
    ├── nodejs-library.md
    └── n8n-wiro-integration.md
```

---

## 🔗 Links

- 🌐 [wiro.ai](https://wiro.ai) · [Explore](https://wiro.ai/explore) · [Models](https://wiro.ai/models) · [Dashboard](https://wiro.ai/panel) · [Create project](https://wiro.ai/panel/project/new)
- 📚 [Product documentation](https://wiro.ai/docs) (same content as this site)

---

## 🤝 Contributing

We follow **conventional, changelog-friendly** commits:

| Prefix | Use for |
|--------|---------|
| `[docs]` | API text, examples, `index.html`, `llms.txt`, `markdown/*.md` |
| `[system]` | CSS, JS, layout, navigation, tooling |

**Do not mix** `[docs]` and `[system]` in one commit.

When you change **`index.html`** API content, update the matching **`markdown/{slug}.md`** and **`markdown/full-documentation.md`** in the same change.

---

## 📜 License

MIT — see [LICENSE](./LICENSE) for details.

---

<div align="center">

**Built with ❤️ by the Wiro team**

🌐 [wiro.ai](https://wiro.ai) · [GitHub @wiroai](https://github.com/wiroai)

</div>
