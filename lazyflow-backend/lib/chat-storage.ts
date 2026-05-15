import type { Conversation } from "@/lib/conversations";

const STORAGE_KEY = "lazyflow.chat-store.v1";

export type StoredChatState = {
  activeConversationId: string | null;
  conversations: Conversation[];
};

export function loadChatState(): StoredChatState | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as StoredChatState;
    if (!Array.isArray(parsed.conversations)) return null;

    return {
      activeConversationId: parsed.activeConversationId ?? null,
      conversations: parsed.conversations.map((conversation) => ({
        ...conversation,
        messages: conversation.messages.map((message) =>
          message.status === "streaming"
            ? {
                ...message,
                content: message.content || "Response interrupted.",
                status: undefined,
                toolExecutions: message.toolExecutions?.map((tool) =>
                  tool.status === "running"
                    ? {
                        ...tool,
                        status: "error",
                        output: tool.output || "Execution interrupted.",
                        endedAt: new Date().toISOString()
                      }
                    : tool
                )
              }
            : {
                ...message,
                toolExecutions: message.toolExecutions?.map((tool) =>
                  tool.status === "running"
                    ? {
                        ...tool,
                        status: "error",
                        output: tool.output || "Execution interrupted.",
                        endedAt: new Date().toISOString()
                      }
                    : tool
                )
              }
        )
      }))
    };
  } catch {
    return null;
  }
}

export function saveChatState(state: StoredChatState) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
