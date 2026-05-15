"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/Input";
import { Message } from "@/components/Message";
import type { AgentStreamEvent } from "@/lib/agent/types";
import {
  createMessage,
  type ChatMessage,
  type Conversation
} from "@/lib/conversations";
import { getModelPreset, type ModelId } from "@/lib/models";

type ChatProps = {
  conversation: Conversation | null;
  model: ModelId;
  onAddMessage: (conversationId: string, message: ChatMessage) => void;
  onCreateConversationForMessage: (content: string) => string;
  onGeneratingChange?: (isGenerating: boolean) => void;
  onLatencyChange?: (latencyMs: number | null) => void;
  onUpdateMessage: (
    conversationId: string,
    messageId: string,
    update:
      | Partial<ChatMessage>
      | ((message: ChatMessage) => ChatMessage)
  ) => void;
};

export function Chat({
  conversation,
  model,
  onAddMessage,
  onCreateConversationForMessage,
  onGeneratingChange,
  onLatencyChange,
  onUpdateMessage
}: ChatProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [conversation?.messages]);

  useEffect(() => {
    onGeneratingChange?.(isGenerating);
  }, [isGenerating, onGeneratingChange]);

  async function handleSend(content: string, forceAgent = false) {
    if (isGenerating) return;

    setError(null);
    setIsGenerating(true);
    onLatencyChange?.(null);

    const abortController = new AbortController();
    abortRef.current = abortController;
    const startedAt = performance.now();
    const conversationId =
      conversation?.id ?? onCreateConversationForMessage(content);

    const userMessage = createMessage("user", content);

    const aiMessage = createMessage("ai", "", {
      status: "streaming"
    });
    const assistantId = aiMessage.id;

    onAddMessage(conversationId, userMessage);
    onAddMessage(conversationId, aiMessage);

    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: content,
          messages: conversation?.messages.map((message) => ({
            role: message.role,
            content: message.content
          })),
          model,
          ...(forceAgent ? { forceMode: "agent" } : {})
        }),
        signal: abortController.signal
      });

      if (!response.ok || !response.body) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || "LazyFlow could not start a response.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let receivedAnyToken = false;
      let firstTokenSeen = false;
      let buffer = "";

      const markFirstToken = () => {
        if (firstTokenSeen) return;

        firstTokenSeen = true;
        onLatencyChange?.(Math.max(1, Math.round(performance.now() - startedAt)));
      };

      const handleEvent = (event: AgentStreamEvent) => {
        if (event.type === "mode") {
          onUpdateMessage(conversationId, assistantId, (message) => ({
            ...message,
            mode: event.mode
          }));
          return;
        }

        if (event.type === "assistant_delta") {
          if (!event.content) return;

          receivedAnyToken = true;
          markFirstToken();
          onUpdateMessage(conversationId, assistantId, (message) => ({
            ...message,
            content: message.content + event.content
          }));
          return;
        }

        if (event.type === "tool_start") {
          receivedAnyToken = true;
          markFirstToken();
          onUpdateMessage(conversationId, assistantId, (message) => ({
            ...message,
            toolExecutions: [...(message.toolExecutions ?? []), event.tool]
          }));
          return;
        }

        if (event.type === "tool_delta") {
          onUpdateMessage(conversationId, assistantId, (message) => ({
            ...message,
            toolExecutions: (message.toolExecutions ?? []).map((tool) =>
              tool.id === event.id
                ? { ...tool, output: tool.output + event.output }
                : tool
            )
          }));
          return;
        }

        if (event.type === "tool_end") {
          onUpdateMessage(conversationId, assistantId, (message) => ({
            ...message,
            toolExecutions: (message.toolExecutions ?? []).map((tool) =>
              tool.id === event.id
                ? {
                    ...tool,
                    status: event.status,
                    output: event.output,
                    endedAt: event.endedAt
                  }
                : tool
            )
          }));
          return;
        }

        if (event.type === "error") {
          throw new Error(event.error);
        }
      };

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          handleEvent(JSON.parse(line) as AgentStreamEvent);
        }
      }

      buffer += decoder.decode();
      if (buffer.trim()) {
        for (const line of buffer.split("\n")) {
          if (!line.trim()) continue;
          handleEvent(JSON.parse(line) as AgentStreamEvent);
        }
      }

      onUpdateMessage(conversationId, assistantId, (message) => ({
        ...message,
        content:
          message.content ||
          (receivedAnyToken
            ? message.content
            : "The model finished without returning text."),
        status: undefined
      }));
    } catch (caught) {
      if (abortController.signal.aborted) {
        onUpdateMessage(conversationId, assistantId, (message) => ({
          ...message,
          content: message.content || "Response stopped.",
          status: undefined
        }));
        return;
      }

      const nextError =
        caught instanceof Error
          ? caught.message
          : "Something went wrong while streaming the response.";

      setError(nextError);
      onUpdateMessage(conversationId, assistantId, {
        content: nextError,
        status: "error"
      });
    } finally {
      if (abortRef.current === abortController) {
        abortRef.current = null;
      }
      setIsGenerating(false);
    }
  }

  function stopGenerating() {
    abortRef.current?.abort();
  }

  const activeModel = getModelPreset(model);
  const messages = conversation?.messages ?? [];
  const title = conversation?.title ?? "Start a new chat";

  return (
    <section className="flex min-h-0 flex-1 flex-col bg-white">
      <div className="scrollbar-subtle min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex min-h-full w-full max-w-5xl flex-col gap-5 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mb-1 rounded-2xl border border-line bg-panel px-4 py-3 shadow-[0_1px_2px_rgba(17,24,39,0.03)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {title}
                </p>
                <p className="mt-0.5 text-sm text-gray-500">
                  Local session using {activeModel.label}
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
                <span className="rounded-full border border-line bg-white px-2.5 py-1">
                  {messages.length} messages
                </span>
                <span
                  className={`rounded-full border px-2.5 py-1 ${
                    isGenerating
                      ? "border-emerald-100 bg-emerald-50 text-primary"
                      : "border-line bg-white"
                  }`}
                >
                  {isGenerating ? "Streaming" : "Ready"}
                </span>
              </div>
            </div>
          </div>

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </div>
          ) : null}

          {messages.length ? (
            messages.map((message) => (
              <Message key={message.id} message={message} />
            ))
          ) : (
            <div className="flex flex-1 items-center justify-center py-16">
              <div className="max-w-xl text-center transition duration-300 ease-out">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-primary ring-1 ring-emerald-100">
                  LF
                </div>
                <h2 className="mt-5 text-2xl font-semibold text-gray-950">
                  What should LazyFlow work on?
                </h2>
                <p className="mt-2 text-sm leading-6 text-gray-500">
                  Start a conversation, switch models when the task changes, and
                  LazyFlow will keep the thread here on this device.
                </p>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>
      <Input
        disabled={isGenerating}
        onSend={handleSend}
        onStop={stopGenerating}
      />
    </section>
  );
}
