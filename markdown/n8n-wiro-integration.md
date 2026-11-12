# n8n Wiro Integration

Run any Wiro AI model from your n8n workflows: video, image, audio, LLM, 3D, and more.

## Overview

[n8n](https://n8n.io) is a powerful workflow automation platform. The **Wiro AI** community node, published on npm as `@wiro-ai/n8n-nodes-wiro`, runs any model in the Wiro AI catalog from a single node.

Pick a model from a searchable list and its inputs load into the node with their default values. The node starts a task on Wiro, waits for it to finish and returns the output files, or the reply of a text model. It also works as a tool for an n8n AI Agent.

### Links

- [npm: @wiro-ai/n8n-nodes-wiro](https://www.npmjs.com/package/@wiro-ai/n8n-nodes-wiro)
- [GitHub: wiroai/n8n-nodes-wiro](https://github.com/wiroai/n8n-nodes-wiro)
- [n8n Community Nodes Installation Guide](https://docs.n8n.io/integrations/community-nodes/installation/)
- [Wiro Model Catalog](https://wiro.ai/models): browse all available models

## Available Model Categories

| Category | Models | Examples |
|----------|--------|----------|
| Video Generation | Text-to-video, image-to-video | Veo 3.1, Kling V3, Seedance, Hailuo, PixVerse, Runway |
| Image Generation | Text-to-image, style transfer | GPT Image 2, Flux 2 Pro, Seedream, Nano Banana, Qwen Image |
| Image Editing | Try-on, face swap, background removal | Virtual Try-On, Face Swap, Prompt-based Editing, Style Transfer |
| Audio & Speech | TTS, STT, voice clone, music | ElevenLabs TTS, Gemini TTS, Whisper STT, Voice Clone |
| LLM Chat | Chat completion, RAG | GPT-5.2, GPT-5 Mini, Gemini 3, Claude Fable 5.2, RAG Chat |
| 3D Generation | Image/text to 3D | Trellis 2, Hunyuan3D 2.1 |
| Translation | Multi-language with image support | Gemma-based (4B, 12B, 27B) |
| E-Commerce | Product photos, ads, templates | Product Photoshoot, Shopify Templates, UGC Creator |
| HR Tools | CV analysis, job descriptions | CV Evaluator, Resume Parser, Culture Fit |

## Wiro AI Node

| Resource | Operation | What it does |
|----------|-----------|--------------|
| Model | Run | Runs a model with your inputs and returns its outputs |
| Task | Get | Reads a task by its ID, with its status and outputs |
| Task | Wait | Waits until a task finishes, then returns its outputs |

- **Model**: pick the model from the searchable list, paste its wiro.ai link, or type it as `owner/model`, such as `pruna/p-image`.
- **Inputs**: the inputs of the model you picked load into the node with their default values. Required inputs are always shown; add advanced ones with **Add input to send**. Fill them in or map them from the incoming item. File inputs take public URLs; separate several URLs with commas.
- **Wait for Completion** is on by default, and the node waits up to 20 minutes (change it with **Max Wait Time**). Turn it off to get the task ID at once, then read the task later with **Task > Get** or **Task > Wait**.

The node returns the task with its output files and cost:

```json
{
  "taskId": "5986221",
  "status": "completed",
  "model": "pruna/p-image",
  "url": "https://cdn1.wiro.ai/xyz/0.png",
  "urls": ["https://cdn1.wiro.ai/xyz/0.png"],
  "costUsd": 0.005,
  "elapsedSeconds": 3
}
```

| Field | What it holds |
|-------|---------------|
| `taskId` | The ID of the Wiro task |
| `status` | `queued`, `running`, `completed`, `failed` or `cancelled` |
| `model` | The model, as `owner/model` |
| `url` | The first output file |
| `urls` | Every output file |
| `text` | The reply of a text model |
| `costUsd` | What the task cost, in US dollars |
| `elapsedSeconds` | How long the task ran |

A task that fails or is cancelled stops the node with an error. To handle it in its own branch, set the node's **On Error** setting to **Continue (using error output)**. A task still running when the wait ends comes back with `status: "running"`: read it later with **Task > Wait** and the same task ID instead of starting it again.

## Installation

Install the community node package in your n8n instance:

### Via n8n UI (Recommended)

1. Open your n8n instance
2. Go to **Settings → Community Nodes**
3. Click **Install a community node**
4. Enter: `@wiro-ai/n8n-nodes-wiro`
5. Click **Install**

### Via Command Line

```bash
npm install @wiro-ai/n8n-nodes-wiro
```

Run it in `~/.n8n/nodes`, then restart n8n.

## Authentication

The node supports both [Wiro authentication methods](/docs/authentication):

1. Go to **Credentials → Add new → Wiro AI API** in n8n
2. Paste the project's **API Key**. If the project uses signature authentication, also paste its **API Secret**: the node then signs every request with HMAC-SHA256 and never sends the secret.
3. Click **Save**, and n8n checks the key

Get your credentials at [wiro.ai/panel/project](https://wiro.ai/panel/project/new). Runs are billed to the wallet of the project's workspace.

## Usage

Search the node picker for "Wiro AI" and add the node with the **Run a model** action, then pick the model.

### Example: Generate an Image with P-Image

1. Add the **Wiro AI** node with the **Run a model** action
2. In **Model**, search for `p-image` and pick `pruna/p-image`
3. Under **Inputs**, set **Prompt** to `A red bicycle on a sunny street`
4. Run the workflow: `url` in the output links to the image

### Example: Generate a Video with Kling V3

1. Add the **Wiro AI** node and pick `klingai/kling-v3` in **Model**
2. Set **Prompt** to `A cat astronaut floating in space`, and leave **Duration** and **Ratio** at their defaults or pick others
3. Run the workflow: `url` in the output links to the video

### Example: Turn an LLM Reply into an Image

1. Add a Wiro AI node with `openai/gpt-5-mini` and a **Prompt** that asks for one image prompt. Its reply is in `text`
2. Add a second Wiro AI node with `pruna/p-image` and map its **Prompt** to `{{ $json.text }}`
3. Run the workflow: `url` in the second node's output links to the image

The [package README](https://github.com/wiroai/n8n-nodes-wiro#example-workflow) has this workflow as JSON that you can paste into n8n.

## Compatibility

| Requirement | Version |
|-------------|---------|
| n8n | v1.85.0+ |
| Package | `@wiro-ai/n8n-nodes-wiro@latest` |
