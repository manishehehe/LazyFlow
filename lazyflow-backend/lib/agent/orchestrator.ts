import { classifyMessage } from "@/lib/agent/classifier";
import { runAgentLoop } from "@/lib/agent/loop";
import { streamOllamaChat, toOllamaMessages } from "@/lib/agent/ollama";
import type { AgentRequest, AgentStreamEvent } from "@/lib/agent/types";

// KV-cache sizes per mode. Smaller values free significant RAM on 8 GB M1.
// chat     → 1024: only needs a few recent messages, tiny cache
// reasoning→ 2048: needs room for code and multi-turn context
// agent    → 4096: tool outputs can be large; keep the preset default
const CTX_CHAT = 1024;
const CTX_REASONING = 2048;

const REASONING_SYSTEM_PROMPT =
  "You are LazyFlow, a local AI assistant for software development. " +
  "Answer clearly and concisely. Format code in markdown code blocks with language tags.";

export async function runAgent(
  request: AgentRequest,
  emit: (event: AgentStreamEvent) => void,
  signal?: AbortSignal
) {
  const mode = request.forceMode ?? classifyMessage(request.message);

  emit({ type: "mode", mode });

  // ── Fast chat path ────────────────────────────────────────────────────────
  // Minimal context (last 4 messages), no system prompt, no planner.
  if (mode === "chat") {
    const messages = toOllamaMessages(
      request.messages?.slice(-4),
      request.message
    );

    await streamOllamaChat({
      messages,
      model: request.model,
      contextSize: CTX_CHAT,
      signal,
      onToken(token) {
        emit({ type: "assistant_delta", content: token });
      }
    });

    emit({ type: "done" });
    return;
  }

  // ── Reasoning path ────────────────────────────────────────────────────────
  // Full history, dev-focused system prompt, no tool loop.
  if (mode === "reasoning") {
    const messages = [
      { role: "system" as const, content: REASONING_SYSTEM_PROMPT },
      ...toOllamaMessages(request.messages, request.message)
    ];

    await streamOllamaChat({
      messages,
      model: request.model,
      contextSize: CTX_REASONING,
      signal,
      onToken(token) {
        emit({ type: "assistant_delta", content: token });
      }
    });

    emit({ type: "done" });
    return;
  }

  // ── Agent path ────────────────────────────────────────────────────────────
  // Multi-step ReAct loop: model decides tools, sees results, loops until done.
  await runAgentLoop(request, emit, signal);
  emit({ type: "done" });
}
