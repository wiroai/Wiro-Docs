# n8n Wiro Integration

Use all Wiro AI models directly in your n8n workflows — video, image, audio, LLM, 3D, and more.

## Overview

[n8n](https://n8n.io) is a powerful workflow automation platform. The **Wiro AI community node** gives you access to all Wiro AI models as individual nodes you can drag and drop into any workflow.

Each model is a **separate node** — so you get dedicated parameters, descriptions, and output handling for every model without any configuration hassle.

### Links

- [npm: @wiro-ai/n8n-nodes-wiroai](https://www.npmjs.com/package/@wiro-ai/n8n-nodes-wiroai)
- [GitHub: wiroai/n8n-nodes-wiroai](https://github.com/wiroai/n8n-nodes-wiroai)
- [n8n Community Nodes Installation Guide](https://docs.n8n.io/integrations/community-nodes/installation/)
- [Wiro Model Catalog](https://wiro.ai/models) — browse all available models

## Available Model Categories

| Category | Models | Examples |
|----------|--------|----------|
| Video Generation | Text-to-video, image-to-video | Sora 2, Veo 3, Kling V3, Seedance, Hailuo, PixVerse, Runway |
| Image Generation | Text-to-image, style transfer | Imagen V4, Flux 2 Pro, Seedream, Nano Banana, SDXL |
| Image Editing | Try-on, face swap, background removal | Virtual Try-On, Face Swap, Inpainting, Style Transfer |
| Audio & Speech | TTS, STT, voice clone, music | ElevenLabs TTS, Gemini TTS, Whisper STT, Voice Clone |
| LLM Chat | Chat completion, RAG | GPT-5, Gemini 3, Qwen 3.5, RAG Chat |
| 3D Generation | Image/text to 3D | Trellis 2, Hunyuan3D 2.1 |
| Translation | Multi-language with image support | Gemma-based (4B, 12B, 27B) |
| E-Commerce | Product photos, ads, templates | Product Photoshoot, Shopify Templates, UGC Creator |
| HR Tools | CV analysis, job descriptions | CV Evaluator, Resume Parser, Culture Fit |

## Installation

Install the community node package in your n8n instance:

### Via n8n UI (Recommended)

1. Open your n8n instance
2. Go to **Settings → Community Nodes**
3. Click **Install a community node**
4. Enter: `@wiro-ai/n8n-nodes-wiroai`
5. Click **Install**

### Via Command Line

```bash
npm install @wiro-ai/n8n-nodes-wiroai
```

Restart n8n after installation.

## Authentication

The node supports both [Wiro authentication methods](/docs/authentication):

1. Go to **Credentials → Add new → Wiro API** in n8n
2. Select your auth method:
   - **Signature-Based** — enter API key + API secret (recommended)
   - **API Key Only** — enter API key only
3. Click **Save**

Get your credentials at [wiro.ai/panel/project](https://wiro.ai/panel/project/new).

## Usage

Each Wiro model appears as a separate node in the n8n node picker. Search for "Wiro" or the model name to find it.

### Example: Generate a Video with Sora 2

1. Add the **Wiro - Sora 2 Pro** node to your workflow
2. Connect your Wiro credentials
3. Set the parameters:
   - **Prompt:** `A cat astronaut floating in space`
   - **Seconds:** `8`
   - **Resolution:** `1080p`
4. Run the workflow

The node returns the task result with output URLs:

```json
{
  "taskid": "abc123",
  "status": "completed",
  "url": "https://cdn1.wiro.ai/xyz/0.mp4"
}
```

### Example: Transcribe Audio with Whisper

1. Add the **Wiro - Whisper Large 3** node
2. Connect an audio file from a previous node or provide a URL
3. Select language and output format
4. Run — get the transcribed text

### Example: LLM Chat with GPT-5

1. Add the **Wiro - GPT-5** node
2. Set your prompt and system instructions
3. Run — get the AI response

## Compatibility

| Requirement | Version |
|-------------|---------|
| n8n | v1.0+ |
| Node.js | v18+ |
| Package | `@wiro-ai/n8n-nodes-wiroai@latest` |
