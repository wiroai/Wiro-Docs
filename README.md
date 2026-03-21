<div align="center">

<img src="https://wiro.ai/images/logos/logo/logo.png" alt="Wiro" width="180" />

# Wiro API Documentation

**Open-source, static documentation for the [Wiro AI](https://wiro.ai) platform** — run **1,000+ models** through one unified API.

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
- 💻 **Code examples** panel in **9 languages** (curl, Python, Node.js, PHP, C#, Go, Swift, Kotlin, Dart)
- 🧩 **Model browser** (list/search via API when deployed; CORS may limit localhost)
- 📄 **Markdown per section** (`markdown/{slug}.md`) + full bundle: **`markdown/full-documentation.md`**
- 📋 **`llms.txt`** — machine-readable summary for crawlers and tools

---

## 🗺️ Documentation map

| Section | Hash route | Markdown |
|---------|------------|----------|
| Introduction | `#/introduction` | [introduction.md](./markdown/introduction.md) |
| Authentication | `#/authentication` | [authentication.md](./markdown/authentication.md) |
| Projects | `#/projects` | [projects.md](./markdown/projects.md) |
| Models | `#/models` | [models.md](./markdown/models.md) |
| Run a Model | `#/run-a-model` | [run-a-model.md](./markdown/run-a-model.md) |
| Model Parameters | `#/model-parameters` | [model-parameters.md](./markdown/model-parameters.md) |
| Tasks | `#/tasks` | [tasks.md](./markdown/tasks.md) |
| LLM & Chat Streaming | `#/llm-chat-streaming` | [llm-chat-streaming.md](./markdown/llm-chat-streaming.md) |
| WebSocket | `#/websocket` | [websocket.md](./markdown/websocket.md) |
| Realtime Voice Conversation | `#/realtime-voice-conversation` | [realtime-voice-conversation.md](./markdown/realtime-voice-conversation.md) |
| Files | `#/files` | [files.md](./markdown/files.md) |
| Code Examples | `#/code-examples` | [code-examples.md](./markdown/code-examples.md) |

> **Full export:** [full-documentation.md](./markdown/full-documentation.md)

---

## 🚀 Run locally

No install required — serve the folder over HTTP:

```bash
# Python 3
python3 -m http.server 8080

# or Node (npx)
npx --yes serve -p 8080
```

Open **http://localhost:8080** (or the printed URL). Hash routes look like `#/introduction`.

---

## 📁 Project structure

```
Wiro-Docs/
├── README.md
├── .gitignore
├── index.html                 # All doc sections inline (LLM-friendly; hash routes #/…)
├── llms.txt                   # Machine-readable API summary
├── css/
│   └── docs.css               # Layout, theme (light/dark), typography, components
├── js/
│   ├── app.js                 # Navigation, code panel, Shiki, markdown link sync
│   └── helpers.js             # Model browser (Tool/List) + shared helpers
└── markdown/                  # Must stay in sync with index.html (see Contributing)
    ├── full-documentation.md  # All sections in one file
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
    └── code-examples.md
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

Documentation and code in this repository are provided to help you integrate with **Wiro**. For product terms and usage, see **[wiro.ai](https://wiro.ai)**.

---

<div align="center">

**Built with ❤️ by the Wiro team**

🌐 [wiro.ai](https://wiro.ai) · [GitHub @wiroai](https://github.com/wiroai)

</div>
