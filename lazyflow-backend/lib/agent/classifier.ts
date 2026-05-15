export type ExecutionMode = "chat" | "reasoning" | "agent";

// Explicit tool/command intent
const AGENT_SIGNALS = [
  /\b(run|execute|terminal|shell|command)\b/i,
  /\bread\s+(the\s+)?file\b/i,
  /\b(list|show)\s+(the\s+)?(directory|folder|files)\b/i,
  /\b(write|create)\s+(the\s+)?file\b/i,
  /^(pwd|ls\b|git\s|npm\s+run|npm\s+test|node\s+-v|npm\s+-v)/,
  /```(bash|sh|zsh|shell)/i,
];

// Technical explanation / coding help
const REASONING_SIGNALS = [
  /\b(explain|how\s+(do|does|can|to|would)|why\s+|what\s+(is|are|does|happens)|difference\s+between)\b/i,
  /\b(debug|fix\s+(this|the|my)|help\s+me|review|analyze|improve|refactor|optimize|implement)\b/i,
  /\bwrite\s+(a|an|the)\s+(function|component|hook|class|type|interface|test)\b/i,
  /```(ts|typescript|js|javascript|python|rust|go|java|css|html)/i,
  /\b(error|bug|issue|problem|fails|broken|crash|exception)\b/i,
  /\b(code|function|class|component|hook|api|type|interface|variable|import|export)\b/i,
];

// Short greetings and casual phrases.
// Patterns deliberately allow repeated chars (hii, hiiii) and trailing punctuation.
const CHAT_SIGNALS = [
  /^h+i+[!.,?\s]*$/i,
  /^he+y+[!.,?\s]*$/i,
  /^hello+[!.,?\s]*$/i,
  /^(thanks?|thank\s+you|ty)[!.,?\s]*$/i,
  /^(bye|goodbye|cya|see\s+ya)[!.,?\s]*$/i,
  /^(ok+|okay|k)[!.,?\s]*$/i,
  /^(cool+|great|nice|perfect|awesome|got\s+it|sounds?\s+good|sure)[!.,?\s]*$/i,
  /^what\s+(are\s+)?you\b/i,
  /^who\s+(are\s+)?you\b/i,
  /^(can|could)\s+you\s+(help|assist)\b/i,
];

export function classifyMessage(message: string): ExecutionMode {
  const text = message.trim();

  // Short casual greetings → chat
  if (text.length < 80 && CHAT_SIGNALS.some((p) => p.test(text))) {
    return "chat";
  }

  // Explicit tool or command intent → agent
  if (AGENT_SIGNALS.some((p) => p.test(text))) {
    return "agent";
  }

  // Technical explanation or coding help → reasoning
  if (REASONING_SIGNALS.some((p) => p.test(text))) {
    return "reasoning";
  }

  // Short message, no signals → chat
  if (text.length < 60) {
    return "chat";
  }

  // Default: reasoning (safe fallback for longer unknown messages)
  return "reasoning";
}
