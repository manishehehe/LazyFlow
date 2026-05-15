"use client";

import { useEffect, useMemo, useState } from "react";
import {
  createConversation as makeConversation,
  titleFromMessage,
  type ChatMessage,
  type Conversation
} from "@/lib/conversations";
import { loadChatState, saveChatState } from "@/lib/chat-storage";

export function useChatStore() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(
    null
  );
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    const stored = loadChatState();

    if (stored) {
      setConversations(sortConversations(stored.conversations));
      setActiveConversationId(stored.activeConversationId);
    }

    setHasHydrated(true);
  }, []);

  useEffect(() => {
    if (!hasHydrated) return;

    saveChatState({
      activeConversationId,
      conversations
    });
  }, [activeConversationId, conversations, hasHydrated]);

  const activeConversation = useMemo(
    () =>
      conversations.find(
        (conversation) => conversation.id === activeConversationId
      ) ?? null,
    [activeConversationId, conversations]
  );

  function createConversation(title = "New chat") {
    const conversation = makeConversation(title);

    setConversations((current) => [conversation, ...current]);
    setActiveConversationId(conversation.id);

    return conversation.id;
  }

  function createConversationForMessage(content: string) {
    return createConversation(titleFromMessage(content));
  }

  function selectConversation(id: string) {
    setActiveConversationId(id);
  }

  function deleteConversation(id: string) {
    setConversations((current) => {
      const next = current.filter((conversation) => conversation.id !== id);

      if (activeConversationId === id) {
        setActiveConversationId(next[0]?.id ?? null);
      }

      return next;
    });
  }

  function renameConversation(id: string, title: string) {
    const nextTitle = title.trim();
    if (!nextTitle) return;

    setConversations((current) =>
      sortConversations(
        current.map((conversation) =>
          conversation.id === id
            ? {
                ...conversation,
                title: nextTitle,
                updatedAt: new Date().toISOString()
              }
            : conversation
        )
      )
    );
  }

  function addMessage(conversationId: string, message: ChatMessage) {
    setConversations((current) =>
      sortConversations(
        current.map((conversation) => {
          if (conversation.id !== conversationId) return conversation;

          const firstUserMessage =
            message.role === "user" &&
            conversation.messages.every((item) => item.role !== "user");

          return {
            ...conversation,
            title: firstUserMessage
              ? titleFromMessage(message.content)
              : conversation.title,
            updatedAt: message.createdAt,
            messages: [...conversation.messages, message]
          };
        })
      )
    );
  }

  function updateMessage(
    conversationId: string,
    messageId: string,
    update: Partial<ChatMessage> | ((message: ChatMessage) => ChatMessage)
  ) {
    const updatedAt = new Date().toISOString();

    setConversations((current) =>
      sortConversations(
        current.map((conversation) =>
          conversation.id === conversationId
            ? {
                ...conversation,
                updatedAt,
                messages: conversation.messages.map((message) => {
                  if (message.id !== messageId) return message;

                  return typeof update === "function"
                    ? update(message)
                    : { ...message, ...update };
                })
              }
            : conversation
        )
      )
    );
  }

  return {
    activeConversation,
    activeConversationId,
    addMessage,
    conversations,
    createConversation,
    createConversationForMessage,
    deleteConversation,
    hasHydrated,
    renameConversation,
    selectConversation,
    updateMessage
  };
}

function sortConversations(conversations: Conversation[]) {
  return [...conversations].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}
