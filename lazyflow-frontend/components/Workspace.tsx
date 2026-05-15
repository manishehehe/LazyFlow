"use client";

import { useEffect, useState } from "react";
import { Chat } from "@/components/Chat";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { useChatStore } from "@/hooks/useChatStore";
import { DEFAULT_MODEL_ID, type ModelId } from "@/lib/models";

export function Workspace() {
  const chatStore = useChatStore();
  const [selectedModel, setSelectedModel] = useState<ModelId>(DEFAULT_MODEL_ID);
  const [isGenerating, setIsGenerating] = useState(false);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);

  useEffect(() => {
    if (isGenerating) return;

    const controller = new AbortController();

    fetch("/api/warm-model", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ model: selectedModel }),
      signal: controller.signal
    }).catch(() => undefined);

    return () => controller.abort();
  }, [isGenerating, selectedModel]);

  return (
    <main className="flex h-dvh overflow-hidden bg-white text-ink">
      <Sidebar
        activeConversationId={chatStore.activeConversationId}
        conversations={chatStore.conversations}
        onCreateConversation={chatStore.createConversation}
        onDeleteConversation={chatStore.deleteConversation}
        onRenameConversation={chatStore.renameConversation}
        onSelectConversation={chatStore.selectConversation}
      />
      <section className="flex min-w-0 flex-1 flex-col">
        <Topbar
          disabled={isGenerating}
          isGenerating={isGenerating}
          latencyMs={latencyMs}
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
        />
        {chatStore.hasHydrated ? (
          <Chat
            conversation={chatStore.activeConversation}
            model={selectedModel}
            onAddMessage={chatStore.addMessage}
            onCreateConversationForMessage={
              chatStore.createConversationForMessage
            }
            onGeneratingChange={setIsGenerating}
            onLatencyChange={setLatencyMs}
            onUpdateMessage={chatStore.updateMessage}
          />
        ) : (
          <section className="flex min-h-0 flex-1 items-center justify-center bg-white">
            <div className="text-center">
              <div className="mx-auto h-10 w-10 animate-pulse rounded-2xl bg-emerald-100" />
              <p className="mt-4 text-sm font-medium text-gray-500">
                Loading local chats...
              </p>
            </div>
          </section>
        )}
      </section>
    </main>
  );
}
