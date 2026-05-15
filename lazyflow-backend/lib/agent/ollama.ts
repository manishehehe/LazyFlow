import { getModelPreset } from "@/lib/models";
import type { AgentRequestMessage } from "@/lib/agent/types";

const OLLAMA_CHAT_URL = "http://localhost:11434/api/chat";

type OllamaMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

export async function streamOllamaChat({
  messages,
  model,
  contextSize,
  signal,
  onToken
}: {
  messages: OllamaMessage[];
  model?: string;
  contextSize?: number;
  signal?: AbortSignal;
  onToken: (token: string) => void;
}) {
  const preset = getModelPreset(model);
  const options = contextSize
    ? { ...preset.options, num_ctx: contextSize }
    : preset.options;

  const response = await fetch(OLLAMA_CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    signal,
    body: JSON.stringify({
      model: preset.id,
      messages,
      keep_alive: preset.keepAlive,
      options,
      stream: true
    })
  });

  if (!response.ok || !response.body) {
    const details = await response.text().catch(() => "");
    throw new Error(details || `Ollama returned ${response.status}.`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const token = readToken(line);
        if (token) onToken(token);
      }
    }

    const finalToken = readToken(buffer);
    if (finalToken) onToken(finalToken);
  } finally {
    reader.releaseLock();
  }
}

export function toOllamaMessages(
  messages: AgentRequestMessage[] | undefined,
  currentMessage: string
): OllamaMessage[] {
  const history =
    messages
      ?.filter((message) => message.content.trim())
      .slice(-8)
      .map((message) => ({
        role: message.role === "ai" ? ("assistant" as const) : ("user" as const),
        content: message.content
      })) ?? [];

  return [...history, { role: "user", content: currentMessage }];
}

function readToken(line: string) {
  const trimmed = line.trim();
  if (!trimmed) return "";

  try {
    const payload = JSON.parse(trimmed) as {
      error?: string;
      message?: { content?: string };
    };

    if (payload.error) throw new Error(payload.error);

    return payload.message?.content ?? "";
  } catch (error) {
    if (error instanceof Error && error.name !== "SyntaxError") {
      throw error;
    }

    return "";
  }
}
