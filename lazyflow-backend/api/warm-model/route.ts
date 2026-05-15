import { NextResponse } from "next/server";
import { getModelPreset } from "@/lib/models";

const OLLAMA_GENERATE_URL = "http://localhost:11434/api/generate";

type WarmModelRequestBody = {
  model?: string;
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: WarmModelRequestBody = {};

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 }
    );
  }

  const model = getModelPreset(body.model);

  try {
    const response = await fetch(OLLAMA_GENERATE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      signal: request.signal,
      body: JSON.stringify({
        model: model.id,
        prompt: "",
        stream: false,
        keep_alive: model.keepAlive,
        options: {
          ...model.options,
          num_predict: 1
        }
      })
    });

    if (!response.ok) {
      const details = await response.text().catch(() => "");
      return NextResponse.json(
        { error: details || `Ollama returned ${response.status}.` },
        { status: response.status || 502 }
      );
    }

    return NextResponse.json({ ok: true, model: model.id });
  } catch {
    return NextResponse.json(
      {
        error:
          "Could not warm Ollama. Make sure Ollama is running on localhost:11434."
      },
      { status: 502 }
    );
  }
}
