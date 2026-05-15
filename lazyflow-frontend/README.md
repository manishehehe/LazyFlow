# LazyFlow — Frontend

This folder contains the React UI layer of LazyFlow.

Built with Next.js 14 App Router and Tailwind CSS.

## What is here

```
lazyflow-frontend/
├── app/                # Next.js app router entry points
│   ├── layout.tsx      # Root layout with metadata and favicon
│   ├── page.tsx        # Main page — renders the Workspace
│   └── globals.css     # Global styles and Tailwind base
├── components/         # All React UI components
│   ├── Workspace.tsx   # Main layout container
│   ├── Sidebar.tsx     # Conversation history panel
│   ├── Chat.tsx        # Message thread and tool cards
│   ├── Input.tsx       # Chat input with Agent mode toggle
│   ├── Message.tsx     # Individual message renderer
│   └── Topbar.tsx      # Model selector and header controls
├── hooks/
│   └── useChatStore.ts # Zustand state for conversations
└── public/             # Static assets and favicon
```

## How to run

The full app is started from the project root:

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

The frontend communicates with the backend API routes in `lazyflow-backend/api/`.
