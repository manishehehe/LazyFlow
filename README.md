# LazyFlow

LazyFlow is a local AI workspace that runs entirely on your own machine.

It connects to Ollama, a tool that runs open-source large language models locally, and gives you a clean interface to chat with those models, ask coding questions, complete assignments, manage files, open apps, and even create Notion pages — all without sending your data to any external server.

Everything runs on your desktop. No API costs. No cloud dependency. No data leaving your machine.

---

## What This Project Does

LazyFlow acts like a local version of Claude Code or GitHub Copilot, but powered entirely by open-source models running on your own hardware.

Instead of only being a chatbot, LazyFlow can:

- Answer questions and help with assignments using local AI models
- Run shell commands on your Mac (ls, git, npm, python, and more)
- Create, read, edit, and patch files anywhere on your filesystem
- Open apps and websites directly from a chat prompt
- Create real Notion pages with formatted content via the Notion API
- Switch between different AI models depending on the task

---

## Why LazyFlow Exists

There are dozens of powerful open-source language models available today. Most of them can be run locally using Ollama, which means you can get intelligent AI assistance without:

- Paying per token for API usage
- Sending your code or personal notes to a cloud server
- Requiring an internet connection

LazyFlow was built to give those open-source models a proper interface — something that feels like a real AI assistant rather than a command-line tool.

It is especially useful for:

- Students who want AI help with assignments without sharing their work online
- Developers who want a local coding assistant
- Anyone who wants to experiment with different models side by side

---

## Available Models

LazyFlow supports any model that Ollama can run. You can switch between models from the top bar in the interface.

### Currently supported out of the box

| Model | Size | Best for |
|---|---|---|
| Gemma 2 2B | 2B parameters | Fast responses, low memory, everyday questions |
| Mistral 7B | 7B parameters | Balanced quality and speed |
| Code Llama 7B | 7B parameters | Code generation and debugging |

### Other models you can add via Ollama

Since LazyFlow connects directly to Ollama, you can pull and use any model Ollama supports. Some popular options:

| Model | Why use it |
|---|---|
| `llama3` | Meta's general-purpose model, strong at reasoning |
| `llama3:70b` | Larger and more capable version of Llama 3 |
| `deepseek-coder` | Specialized for programming tasks |
| `phi3` | Microsoft's compact model, very efficient |
| `qwen2` | Strong multilingual support |
| `solar` | Korean and English, strong reasoning |
| `mixtral` | Mixture of experts model, high quality |
| `gemma2:9b` | Larger Gemma, more nuanced responses |
| `dolphin-mistral` | Uncensored variant of Mistral, good for creative use |
| `starcoder2` | Code completion and generation |
| `neural-chat` | Intel's conversational model |

To add any model, run:

```bash
ollama pull <model-name>
```

Then select it from the model dropdown inside LazyFlow.

---

## Who This Is For

LazyFlow is useful for:

- students who want a private AI assistant for homework and assignments
- developers who want a local coding agent that can actually run commands
- researchers exploring open-source language models
- anyone who wants AI power without monthly API bills or cloud privacy concerns

---

## Key Features

- Local AI chat with any Ollama-compatible model
- Adaptive execution — LazyFlow automatically decides whether to just chat, reason through a problem, or invoke tools
- Agent mode — LazyFlow can create files, run terminal commands, open apps, and chain multiple steps together
- Notion integration — create real Notion pages with formatted content directly from chat
- Conversation history saved locally
- Model switching from the UI
- Runs entirely offline (except for Notion integration)

---

## Architecture

LazyFlow is a Next.js application with a local backend that connects to Ollama.

### Frontend

React powers the entire user interface including:

- Sidebar with conversation history
- Chat interface with tool execution cards
- Model selector in the top bar
- Agent mode toggle

### Backend

Next.js API routes handle:

- Routing messages to the correct execution mode
- Streaming responses from Ollama
- Running the agent loop with tool execution
- Notion API integration

### AI Layer

LazyFlow uses Ollama to run language models locally. The agent layer includes:

- A classifier that detects whether a message needs chat, reasoning, or tool use
- A ReAct-style agent loop that executes tools step by step
- JSON parsing with sanitization so small models can drive tool use reliably
- Recovery logic that corrects the model when it refuses to use tools or forgets to write files

### Tools

| Tool | What it does |
|---|---|
| `terminal` | Runs allowed shell commands (ls, git, npm, python, open, and more) |
| `filesystem` | Creates, reads, edits, patches, and searches files anywhere on disk |
| `notion` | Creates Notion pages with formatted markdown content via the Notion API |

---

## Repository Structure

LazyFlow is organized into two folders:

```
LazyFlow/
├── lazyflow-frontend/     # React UI — components, pages, hooks, styles
└── lazyflow-backend/      # AI agent, API routes, tools, scripts
```

The full app runs from the project root using a single `npm run dev` command.
Both folders are part of the same Next.js project.

## Quick Start

```bash
# 1. Install Ollama from https://ollama.com and pull a model
ollama pull gemma2:2b

# 2. Clone this repo
git clone https://github.com/manishehehe/LazyFlow.git
cd LazyFlow

# 3. Install dependencies
npm install

# 4. Start the app
npm run dev
```

Open `http://localhost:3000` in your browser.

---

## Local Setup

### Before you start

You need the following installed:

- Node.js (version 18 or later)
- npm (comes with Node.js)
- Ollama — download from https://ollama.com
- At least one Ollama model pulled locally

Optional:

- A Notion account and integration token if you want Notion page creation

### 1. Install Ollama and pull a model

Download Ollama from https://ollama.com and install it.

Then pull a model. The default model used by LazyFlow is Gemma 2 2B:

```bash
ollama pull gemma2:2b
```

You can also pull other models and switch between them inside LazyFlow:

```bash
ollama pull mistral
ollama pull codellama
ollama pull llama3
```

Start Ollama so it runs in the background:

```bash
ollama serve
```

### 2. Clone the repository

```bash
git clone https://github.com/manishehehe/LazyFlow.git
cd LazyFlow
```

### 3. Install dependencies

```bash
npm install
```

### 4. Set up environment variables (optional)

Copy the example environment file:

```bash
cp .env.example .env.local
```

If you want Notion integration, fill in your Notion credentials in `.env.local`.

If you skip this, LazyFlow works without Notion. The Notion tool will return an error if you try to use it without credentials.

### 5. Start the development server

```bash
npm run dev
```

Open `http://localhost:3000` in your browser.

### 6. If you want Notion integration

1. Go to https://www.notion.so/my-integrations
2. Create a new integration named LazyFlow
3. Copy the integration secret (starts with `secret_...`)
4. Open a Notion page, click the three dots, connect your LazyFlow integration
5. Copy the page ID from the URL
6. Add both to your `.env.local`:

```env
NOTION_TOKEN=secret_your_token_here
NOTION_PARENT_PAGE_ID=your_page_id_here
```

Restart the dev server after changing `.env.local`.

---

## Example Prompts

Here are things you can ask LazyFlow once it is running:

```
Create a Python file on my Desktop with a bubble sort implementation
```

```
Open Notion and create a page titled "Study Notes" with key points about recursion
```

```
Show me the files in my Downloads folder
```

```
Run the tests in this project
```

```
What is the difference between a list and a tuple in Python?
```

```
Open Spotify
```

```
Create a folder on my Desktop named Projects
```

LazyFlow will automatically decide whether to answer directly, reason through the problem, or use tools to actually do the task.

---

## Common Problems

If Ollama is not running:

```bash
ollama serve
```

If the model is not found:

```bash
ollama pull gemma2:2b
```

If npm packages are missing:

```bash
npm install
```

If the Notion tool fails, check that your token and page ID are correctly set in `.env.local` and that the page is connected to your integration.

---

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, React, Tailwind CSS |
| Backend | Next.js API routes |
| AI runtime | Ollama |
| Default model | Gemma 2 2B |
| Notion | Notion REST API v1 |
| Language | TypeScript |

---

## Project Structure

```
LazyFlow/
├── app/                    # Next.js app router
│   ├── api/agent/          # Agent streaming endpoint
│   ├── api/chat/           # Chat endpoint
│   └── layout.tsx
├── components/             # React UI components
│   ├── Chat.tsx
│   ├── Input.tsx
│   ├── Message.tsx
│   ├── Sidebar.tsx
│   └── Workspace.tsx
├── lib/
│   ├── agent/              # AI agent logic
│   │   ├── classifier.ts   # Detects chat vs reasoning vs agent
│   │   ├── loop.ts         # ReAct agent loop with tool parsing
│   │   ├── ollama.ts       # Ollama streaming client
│   │   └── orchestrator.ts # Routes messages to correct handler
│   └── tools/              # Tool implementations
│       ├── filesystem.ts   # File read/write/patch/search
│       ├── terminal.ts     # Shell command execution
│       ├── notion.ts       # Notion page creation
│       └── safety.ts       # Command allowlist and path guards
├── hooks/                  # React state management
├── public/                 # Static assets and favicon
└── .env.example            # Environment variable template
```

---

## Development Notes

LazyFlow is a prototype built for local use. It is designed to be extended.

The agent loop uses a ReAct-style format where the model outputs `Action:` and `Input:` lines that the backend parses and executes. The system includes recovery logic for small models that sometimes refuse to use tools or output code blocks instead of actual file operations.

The classifier uses keyword and pattern matching to route simple questions to direct chat mode, analytical questions to a reasoning mode, and action-oriented requests to the full agent loop. This keeps latency low for everyday use.

---

## Prototype Note

This repository is a working prototype. Local databases, environment secrets, virtual environments, and machine-specific paths are intentionally excluded.
