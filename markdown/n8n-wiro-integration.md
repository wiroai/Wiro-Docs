# n8n Wiro Integration

Run Wiro AI models, Wiro workflows and Wiro agents from your n8n workflows: video, image, audio, LLM, 3D, and more.

## Overview

[n8n](https://n8n.io) is a powerful workflow automation platform. The **Wiro AI community node** gives you access to all Wiro AI models as individual nodes you can drag and drop into any workflow.

Each model is a **separate node**, so you get dedicated parameters, descriptions, and output handling for every model without any configuration hassle.

Two more nodes are not tied to one model: **Wiro Workflow** runs the workflows you saved on Wiro, and **Wiro Agent** sends messages to Wiro Studio, the Workflow Agent or one of your deployed agents. Every node also works as a tool for an n8n AI Agent.

For one node that runs any model, install `@wiro-ai/n8n-nodes-wiro`. Its **Wiro AI** node lists the models in a searchable picker and loads the inputs of the model you pick. See **Wiro AI Node** below.

### Links

- [npm: @wiro-ai/n8n-nodes-wiroai](https://www.npmjs.com/package/@wiro-ai/n8n-nodes-wiroai)
- [GitHub: wiroai/n8n-nodes-wiroai](https://github.com/wiroai/n8n-nodes-wiroai)
- [npm: @wiro-ai/n8n-nodes-wiro](https://www.npmjs.com/package/@wiro-ai/n8n-nodes-wiro) (the Wiro AI node)
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

## Wiro Workflow and Wiro Agent

These two nodes are not tied to one model. They use the same credentials as the model nodes.

| Node | Use it for | Operations |
|------|------------|------------|
| Wiro Workflow | Run a saved Wiro workflow and get its outputs, follow its runs | Workflow: Run, Get, Get Many. Workflow Run: Get, Get Many |
| Wiro Agent: Wiro Studio | Ask for what you need in plain words; Studio picks and runs the models | Send Message, Get Message |
| Wiro Agent: Workflow Agent | Design or change a Wiro workflow in plain words | Send Message, Get Message |
| Wiro Agent: your agents | Message an agent you deployed on Wiro | Send Message, Get Message |

### Wiro Workflow

- **Workflow > Run** starts a run of a workflow and waits for its outputs. Pick the workflow from the list, or paste its wiro.ai link or slug. The node loads the inputs of that workflow, so you can fill each one or map them from the incoming item. Inputs you leave empty use the values saved in the workflow.
- **Workflow > Get** returns a workflow with the inputs it takes. **Workflow > Get Many** lists the workflows in your workspace or in the public gallery.
- **Workflow Run > Get** reads a run by its `workflowtoken` and can wait for it to end. **Workflow Run > Get Many** lists recent runs, newest first.

The node waits up to 20 minutes for a run by default (change it with **Max Wait Time**) and returns the run with its status, outputs and cost:

```json
{
  "workflowtoken": "abc123",
  "status": "completed",
  "chargedUsd": 0.005,
  "outputs": {
    "image": [{ "url": "https://cdn1.wiro.ai/xyz/output_1.jpg", "mimeType": "image/jpeg" }]
  }
}
```

A run that is still going when the wait ends comes back with `status: "running"`. Read it later with **Workflow Run > Get** and the same `workflowtoken` instead of starting it again.

### Wiro Agent

- **Send Message** sends a message to Wiro Studio, which picks and runs AI models for the request, to the Workflow Agent, which designs Wiro workflows, or to one of your own deployed agents. Pass the same **Session**, for example a chat ID, to keep a conversation going.
- **Get Message** reads a message and its reply again later.

The reply is in `message.reply`, files the agent made are in `message.mediaUrls`, and the model runs Studio started are in `modelRuns`.

Workflow runs and agent turns are billed to the wallet of your project's workspace, the same as model runs. To learn more, see [Workflows](/docs/workflows) and [Agent Messaging](/docs/agent-messaging).

## Wiro AI Node

The `@wiro-ai/n8n-nodes-wiro` package adds one **Wiro AI** node that runs any model in the catalog. It also works as a tool for an n8n AI Agent.

| Resource | Operation | What it does |
|----------|-----------|--------------|
| Model | Run | Runs a model with your inputs and returns its outputs |
| Task | Get | Reads a task by its ID, with its status and outputs |
| Task | Wait | Waits until a task finishes, then returns its outputs |

- **Model**: pick the model from the searchable list, paste its wiro.ai link, or type it as `owner/model`, such as `pruna/p-image`.
- **Inputs**: the inputs of the model you picked load into the node with their default values. Fill them in or map them from the incoming item. File inputs take public URLs; separate several URLs with commas.
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

A text model's reply is in `text`. A task that fails or is cancelled stops the node with an error. To handle it in its own branch, set the node's **On Error** setting to **Continue (using error output)**.

## Installation

Install the community node package in your n8n instance:

### Via n8n UI (Recommended)

1. Open your n8n instance
2. Go to **Settings → Community Nodes**
3. Click **Install a community node**
4. Enter: `@wiro-ai/n8n-nodes-wiroai`
5. Click **Install**

For the Wiro AI node, enter `@wiro-ai/n8n-nodes-wiro` in step 4.

### Via Command Line

```bash
npm install @wiro-ai/n8n-nodes-wiroai
```

For the Wiro AI node:

```bash
npm install @wiro-ai/n8n-nodes-wiro
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

### Sign in with a Wiro account (OAuth2)

On n8n Cloud and on n8n running on your own computer, you can connect with your Wiro account instead of an API key:

1. On a Wiro node, set **Authentication** to **OAuth2**
2. Create a **Wiro OAuth2 API** credential and click **Connect my account**
3. Sign in to Wiro, pick the project whose wallet pays for the runs, and click **Allow**

Other n8n instances connect with the **Wiro API** credential above.

### Wiro AI node

The Wiro AI node uses a **Wiro AI API** credential: paste your project's API key, and the API secret if the project uses signature authentication.

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

1. Search the node picker for `Whisper` and add the **Wiro - Speech to Text (Whisper Large v3)** node
2. Set **Input Audio URL** to a public link to the audio file. To use a file from an earlier node, map its URL with an expression.
3. Pick a **Language**, or keep **Auto**. **Chunk Length**, **Batch Size** and **Number Of Speakers** start at `30`, `8` and `1`.
4. Run the workflow: `url` in the output links to the transcript as a text file

### Example: LLM Chat with GPT-5.2

1. Add the **Wiro - GPT-5.2 AI Model** node, or **Wiro - GPT-5 Mini AI Model** or **Wiro - GPT-5 Nano AI Model** for a smaller model
2. Set **Prompt** and, if you need them, **System Instructions**
3. Run the workflow: the reply is in `message` in the output

### Example: Run Any Model with the Wiro AI Node

1. Search the node picker for `Wiro AI` and add the **Wiro AI** node with the **Run a model** action
2. In **Model**, search for `p-image` and pick `pruna/p-image`
3. Under **Inputs**, set **Prompt** to `A red bicycle on a sunny street`
4. Run the workflow: `url` in the output links to the image

## Compatibility

| Requirement | Version |
|-------------|---------|
| n8n | v1.85.0+ |
| Node.js | v18+ |
| Package | `@wiro-ai/n8n-nodes-wiroai@latest` |
| Package (Wiro AI node) | `@wiro-ai/n8n-nodes-wiro@latest` |
