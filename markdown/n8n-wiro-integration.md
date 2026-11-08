# n8n Wiro Integration

Use all Wiro AI models directly in your n8n workflows: video, image, audio, LLM, 3D, and more.

## Overview

[n8n](https://n8n.io) is a powerful workflow automation platform. The **Wiro AI community node** gives you access to all Wiro AI models as individual nodes you can drag and drop into any workflow.

Each model is a **separate node**, so you get dedicated parameters, descriptions, and output handling for every model without any configuration hassle.

### Links

- [npm: @wiro-ai/n8n-nodes-wiroai](https://www.npmjs.com/package/@wiro-ai/n8n-nodes-wiroai)
- [GitHub: wiroai/n8n-nodes-wiroai](https://github.com/wiroai/n8n-nodes-wiroai)
- [n8n Community Nodes Installation Guide](https://docs.n8n.io/integrations/community-nodes/installation/)
- [Wiro Model Catalog](https://wiro.ai/models): browse all available models

## Available Model Categories

| Category | Models | Examples |
|----------|--------|----------|
| Video Generation | Text-to-video, image-to-video | Veo 3.1, Kling V3, Seedance, Hailuo, PixVerse, Runway |
| Image Generation | Text-to-image, style transfer | Imagen V4, Flux 2 Pro, Seedream, Nano Banana, SDXL |
| Image Editing | Try-on, face swap, background removal | Virtual Try-On, Face Swap, Inpainting, Style Transfer |
| Audio & Speech | TTS, STT, voice clone, music | ElevenLabs TTS, Gemini TTS, Whisper STT, Voice Clone |
| LLM Chat | Chat completion, RAG | GPT-5.2, GPT-5 Mini, Gemini 3, RAG Chat |
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
   - **Signature-Based**: enter API key + API secret (recommended)
   - **API Key Only**: enter API key only
3. Click **Save**

Get your credentials at [wiro.ai/panel/project](https://wiro.ai/panel/project/new).

## Usage

Each Wiro model appears as a separate node in the n8n node picker. Search for "Wiro" or the model name to find it.

### Example: Generate a Video with Kling V3

1. Add the **Wiro - Kling V3 Text-to-Video Generator** node to your workflow
2. Connect your Wiro credentials
3. Set the parameters:
   - **Prompt:** `A cat astronaut floating in space`
   - **Duration:** `5 Seconds`
   - **Ratio:** `16:9`
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

1. Search the node picker for `Whisper Large V3` and add the **Wiro - Speech to Text** node
2. Set **Input Audio URL** to a public link to the audio file. To use a file from an earlier node, map its URL with an expression.
3. Set **Language** (or **Auto**) and fill in **Chunk Length**, **Batch Size** and **Num Speakers**. The model's sample run uses `30`, `8` and `1`.
4. Run the workflow: `url` in the output links to the transcript as a text file

### Example: LLM Chat with GPT-5.2

1. Add the **Wiro - GPT-5.2 AI Model** node, or **Wiro - GPT-5 Mini AI Model** or **Wiro - GPT-5 Nano AI Model** for a smaller model
2. Set **Prompt** and, if you need them, **System Instructions**
3. Run the workflow: the reply is in `message` in the output

## Compatibility

| Requirement | Version |
|-------------|---------|
| n8n | v1.85.0+ |
| Node.js | v18+ |
| Package | `@wiro-ai/n8n-nodes-wiroai@latest` |
