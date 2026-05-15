export type ModelId = "gemma2:2b" | "mistral:latest" | "codellama:latest";

export type ModelPreset = {
  id: ModelId;
  label: string;
  badge: string;
  description: string;
  keepAlive: string;
  options: {
    num_ctx: number;
    num_predict: number;
    num_batch: number;
    temperature: number;
    top_p: number;
    repeat_penalty: number;
  };
};

export const MODEL_PRESETS: ModelPreset[] = [
  {
    id: "gemma2:2b",
    label: "Gemma 2 2B",
    badge: "Fastest",
    description: "2B model — fits easily in 8 GB, very low latency on M1.",
    keepAlive: "20m",
    options: {
      num_ctx: 2048,
      num_predict: 512,
      num_batch: 512,
      temperature: 0.4,
      top_p: 0.9,
      repeat_penalty: 1.08
    }
  },
  {
    id: "mistral:latest",
    label: "Mistral 7B",
    badge: "Fast",
    description: "Lightweight default for low first-token latency.",
    keepAlive: "15m",
    options: {
      num_ctx: 2048,
      num_predict: 512,
      num_batch: 512,
      temperature: 0.4,
      top_p: 0.9,
      repeat_penalty: 1.08
    }
  },
  {
    id: "codellama:latest",
    label: "Code Llama 7B",
    badge: "Code",
    description: "Compact local model for code-heavy prompts.",
    keepAlive: "15m",
    options: {
      num_ctx: 2048,
      num_predict: 640,
      num_batch: 512,
      temperature: 0.25,
      top_p: 0.9,
      repeat_penalty: 1.08
    }
  },
];

export const DEFAULT_MODEL_ID: ModelId = "gemma2:2b";

export function getModelPreset(model?: string) {
  return (
    MODEL_PRESETS.find((preset) => preset.id === model) ??
    MODEL_PRESETS.find((preset) => preset.id === DEFAULT_MODEL_ID) ??
    MODEL_PRESETS[0]
  );
}
