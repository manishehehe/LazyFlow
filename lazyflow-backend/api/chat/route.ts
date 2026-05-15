import { NextResponse } from "next/server";
import { getModelPreset } from "@/lib/models";

const OLLAMA_CHAT_URL = "http://localhost:11434/api/chat";

type ChatRequestBody = {
  message?: string;
  model?: string;
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: ChatRequestBody;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 }
    );
  }

  const message = body.message?.trim();
  const model = getModelPreset(body.model);

  if (!message) {
    return NextResponse.json(
      { error: "Message is required." },
      { status: 400 }
    );
  }

  let ollamaResponse: Response;

  try {
    ollamaResponse = await fetch(OLLAMA_CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      signal: request.signal,
      body: JSON.stringify({
        model: model.id,
        messages: [{ role: "user", content: message }],
        keep_alive: model.keepAlive,
        options: model.options,
        stream: true
      })
    });
  } catch {
    return NextResponse.json(
      {
        error:
          "Could not reach Ollama. Make sure Ollama is running on localhost:11434."
      },
      { status: 502 }
    );
  }

  if (!ollamaResponse.ok || !ollamaResponse.body) {
    const details = await ollamaResponse.text().catch(() => "");

    return NextResponse.json(
      {
        error: details || `Ollama returned ${ollamaResponse.status}.`
      },
      { status: ollamaResponse.status || 502 }
    );
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const reader = ollamaResponse.body.getReader();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();

          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            const token = readOllamaToken(trimmed);
            if (token) {
              controller.enqueue(encoder.encode(token));
            }
          }
        }

        const finalLine = buffer.trim();
        if (finalLine) {
          const token = readOllamaToken(finalLine);
          if (token) {
            controller.enqueue(encoder.encode(token));
          }
        }

        controller.close();
      } catch (error) {
        controller.error(error);
      } finally {
        reader.releaseLock();
      }
    },
    cancel() {
      reader.cancel().catch(() => undefined);
    }
  });

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Content-Type": "text/plain; charset=utf-8",
      "X-Accel-Buffering": "no"
    }
  });
}

function readOllamaToken(line: string) {
  try {
    const payload = JSON.parse(line) as {
      error?: string;
      message?: { content?: string };
    };

    if (payload.error) {
      throw new Error(payload.error);
    }

    return payload.message?.content ?? "";
  } catch (error) {
    if (error instanceof Error && error.name !== "SyntaxError") {
      throw error;
    }

    return "";
  }
}
