import type { ToolExecution } from "@/lib/tools/types";

export type ChatRole = "ai" | "user";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
  code?: {
    language: string;
    value: string;
  };
  status?: "streaming" | "error";
  toolExecutions?: ToolExecution[];
  mode?: "chat" | "reasoning" | "agent";
};

export type Conversation = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
};

export function createMessage(
  role: ChatRole,
  content: string,
  overrides: Partial<ChatMessage> = {}
): ChatMessage {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    createdAt: new Date().toISOString(),
    ...overrides
  };
}

export function createConversation(title = "New chat"): Conversation {
  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    title,
    createdAt: now,
    updatedAt: now,
    messages: []
  };
}

export function titleFromMessage(content: string) {
  const compact = content.replace(/\s+/g, " ").trim();
  if (!compact) return "New chat";

  return compact.length > 42 ? `${compact.slice(0, 42).trim()}...` : compact;
}

export function formatRelativeTime(value: string) {
  const timestamp = new Date(value).getTime();
  const delta = Date.now() - timestamp;
  const minute = 60_000;
  const hour = minute * 60;
  const day = hour * 24;

  if (Number.isNaN(timestamp)) return "";
  if (delta < minute) return "now";
  if (delta < hour) return `${Math.floor(delta / minute)}m`;
  if (delta < day) return `${Math.floor(delta / hour)}h`;
  if (delta < day * 7) return `${Math.floor(delta / day)}d`;

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric"
  }).format(timestamp);
}

export function formatMessageTime(value: string) {
  const timestamp = new Date(value);

  if (Number.isNaN(timestamp.getTime())) return "";

  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit"
  }).format(timestamp);
}
