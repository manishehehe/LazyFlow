# LazyFlow — Backend

This folder contains the AI agent core, API routes, and tool implementations.

## What is here

```
lazyflow-backend/
├── api/                        # Next.js API route handlers
│   ├── agent/route.ts          # Streaming agent endpoint (SSE)
│   ├── chat/route.ts           # Direct chat endpoint
│   └── warm-model/route.ts     # Model pre-warming endpoint
│
├── lib/
│   ├── agent/
│   │   ├── classifier.ts       # Detects: chat | reasoning | agent
│   │   ├── loop.ts             # ReAct agent loop — tool parsing and execution
│   │   ├── ollama.ts           # Ollama streaming client
│   │   ├── orchestrator.ts     # Routes messages to correct handler
│   │   ├── planner.ts          # Multi-step task planning
│   │   └── types.ts            # Shared agent types
│   │
│   ├── tools/
│   │   ├── filesystem.ts       # Create, read, write, patch, search files
│   │   ├── terminal.ts         # Run shell commands (allowlisted)
│   │   ├── notion.ts           # Notion API — create pages with rich content
│   │   ├── safety.ts           # Command allowlist and workspace path guard
│   │   ├── registry.ts         # Tool registry
│   │   └── types.ts            # Tool definition types
│   │
│   ├── models.ts               # Available Ollama model definitions
│   ├── conversations.ts        # Conversation data types
│   └── chat-storage.ts         # Local chat persistence
│
├── scripts/git/                # Dev workflow helpers (checkpoint, snapshot)
└── docs/                       # Architecture and workflow docs
```

## AI Agent Design

The agent loop uses a ReAct-style format.

The model outputs `Action:` and `Input:` lines. The backend parses these, executes the matching tool, feeds the result back, and loops until the model produces a final answer with no `Action:` line.

The classifier routes each message to one of three modes:

| Mode | When used |
|---|---|
| `chat` | Simple questions, greetings, explanations |
| `reasoning` | Analytical questions, debugging, planning |
| `agent` | File operations, shell commands, Notion, app launching |

## Tools

| Tool | Capabilities |
|---|---|
| `terminal` | ls, cat, git, npm, python, open (macOS), and more |
| `filesystem` | create, read, write, patch, grep — anywhere on disk |
| `notion` | Create Notion pages with headings, paragraphs, bold text |

## Environment variables

Copy `.env.example` from the project root and fill in your values.

```env
NOTION_TOKEN=your_notion_integration_secret
NOTION_PARENT_PAGE_ID=your_notion_parent_page_id
```

Ollama runs locally — no API key needed. Just run `ollama serve`.
