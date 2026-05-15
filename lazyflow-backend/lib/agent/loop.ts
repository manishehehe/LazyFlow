import fs from "node:fs/promises";
import path from "node:path";
import { streamOllamaChat, toOllamaMessages } from "@/lib/agent/ollama";
import type { AgentRequest, AgentStreamEvent } from "@/lib/agent/types";
import { getTool } from "@/lib/tools/registry";
import type { ToolExecution, ToolName } from "@/lib/tools/types";

const WORKSPACE_ROOT = process.cwd();
const MAX_STEPS = 12;
const CTX_AGENT = 4096;

// Injected once per agent run so the model knows what files exist without needing a list call.
async function getWorkspaceSummary(): Promise<string> {
  try {
    const entries = await fs.readdir(WORKSPACE_ROOT, { withFileTypes: true });
    return entries
      .filter(
        (e) =>
          !["node_modules", ".git", ".next", "dist", ".claude"].includes(e.name)
      )
      .map((e) => `${e.isDirectory() ? "d" : "f"} ${e.name}`)
      .join("\n");
  } catch {
    return "(unavailable)";
  }
}

function buildSystemPrompt(workspaceSummary: string) {
  return `You are LazyFlow, a local autonomous coding assistant running directly on the user's machine (similar to Claude Code).
You work step-by-step, using tools to explore, read, edit, and verify code.

## Workspace
Root: ${WORKSPACE_ROOT}
Contents:
${workspaceSummary}

## Available tools

There are THREE tool names: "terminal", "filesystem", and "notion". Never invent other names.

**terminal** — run any shell command
Input: { "command": "string" }
Allowed commands: ls, cat, head, tail, find, grep, rg, wc, diff, mkdir, touch,
  git (add/commit/checkout/branch/stash/diff/log/status/show),
  npm (run/test/install/uninstall/ci), npx, node, tsc, eslint, python3,
  open (macOS launcher — open URLs, apps, files)

**notion** — create pages directly in the user's Notion workspace
Input:
  { "action": "create_page", "title": "Page title", "content": "Body text (markdown supported)" }

**filesystem** — safe file operations (reads, writes, patches)
Input:
  { "action": "list",  "path": "dir" }
  { "action": "read",  "path": "file" }
  { "action": "grep",  "path": "file_or_dir", "search": "pattern" }
  { "action": "patch", "path": "file", "old": "exact text to find", "new": "replacement" }
  { "action": "write", "path": "file", "content": "full new content" }
  { "action": "create","path": "file", "content": "initial content" }

## Response format — CRITICAL

To call a tool you MUST output EXACTLY this two-line block, nothing else before the Action line:
Action: terminal
Input: {"command": "..."}

Or for filesystem:
Action: filesystem
Input: {"action": "...", "path": "..."}

## FILE CREATION RULE — NON-NEGOTIABLE

When asked to create or write ANY file (Python, JS, text, config, etc.) you MUST use the filesystem tool.
NEVER output a markdown code block (\`\`\`...\`\`\`) as a substitute for creating the file.
The user wants the ACTUAL FILE ON DISK, not a preview of what it would look like.

WRONG — do not do this:
\`\`\`python
for i in range(5):
    print(i)
\`\`\`

CORRECT — always do this:
Action: filesystem
Input: {"action": "create", "path": "/Users/manishkishorenayak/Desktop/Lazyflow/script.py", "content": "for i in range(5):\n    print(i)\n"}

## Examples

Create a Python file on the Desktop:
Action: filesystem
Input: {"action": "create", "path": "/Users/manishkishorenayak/Desktop/Lazyflow/for_loop.py", "content": "# Simple for loop example\nfor i in range(5):\n    print(f'Iteration: {i}')\n"}

Create a directory:
Action: filesystem
Input: {"action": "mkdir", "path": "/Users/manishkishorenayak/Desktop/MyFolder"}

Create a Notion page titled "Michael Jackson" with content:
Action: notion
Input: {"action": "create_page", "title": "Michael Jackson", "content": "# Michael Jackson\n\nThe King of Pop.\n\n## Early Life\nBorn August 29, 1958 in Gary, Indiana."}

Open a URL in Chrome (e.g. play a YouTube search):
Action: terminal
Input: {"command": "open -a 'Google Chrome' 'https://music.youtube.com/search?q=beat+it+michael+jackson'"}

Open any app or website:
Action: terminal
Input: {"command": "open -a 'Google Chrome' 'https://www.google.com'"}

Run a shell command:
Action: terminal
Input: {"command": "ls /Users/manishkishorenayak/Desktop"}

Read a file:
Action: filesystem
Input: {"action": "read", "path": "src/index.ts"}

List files in workspace:
Action: terminal
Input: {"command": "ls"}

NEVER write "Action: mkdir", "Action: create", or any other tool name. ONLY "terminal" or "filesystem".

When the task is fully done (files created, commands run), respond normally WITHOUT any "Action:" line.

## Rules
- When asked to open a website or app → use terminal with the "open" command immediately. NEVER say "I can't control your browser."
- When asked to play music or open YouTube → use: open -a 'Google Chrome' 'https://music.youtube.com/search?q=<song+name>'
- When asked to create a file → use filesystem action:"create" immediately, do NOT ask questions first
- When asked to create a Notion page → use the notion tool directly: Action: notion / Input: {"action": "create_page", "title": "...", "content": "..."}. Write rich content with markdown headings and paragraphs.
- Do ONE tool call per response. Never output two Action: blocks in the same response.
- Read a file before editing it
- Use grep to locate the exact code before patching
- Prefer patch over write (targeted, reversible)
- After creating a file, confirm with the real path
- Keep edits minimal and focused`;
}

type OllamaMessage = { role: "user" | "assistant" | "system"; content: string };

type ParsedToolCall = {
  name: ToolName;
  label: string;
  input: Record<string, unknown>;
  inputSummary: string;
};

export async function runAgentLoop(
  request: AgentRequest,
  emit: (event: AgentStreamEvent) => void,
  signal?: AbortSignal
) {
  const workspaceSummary = await getWorkspaceSummary();

  const history: OllamaMessage[] = [
    { role: "system", content: buildSystemPrompt(workspaceSummary) },
    ...toOllamaMessages(request.messages, request.message)
  ];

  for (let step = 0; step < MAX_STEPS; step++) {
    if (signal?.aborted) return;

    // Buffer the model's response — we need the full text before we can parse tool calls.
    let stepResponse = "";
    await streamOllamaChat({
      messages: history,
      model: request.model,
      contextSize: CTX_AGENT,
      signal,
      onToken(token) {
        stepResponse += token;
      }
    });

    if (signal?.aborted) return;

    const toolCall = parseToolCall(stepResponse);

    if (!toolCall) {
      // If the model showed a code block but didn't use a tool, it likely forgot to
      // write/create the file. Re-prompt it once so it uses the filesystem tool.
      const hasCodeBlock = /```[\s\S]*?```/.test(stepResponse);
      const looksLikeFilePlan =
        /\b(create|write|make|add|put)\b.*\b(file|\.py|\.ts|\.js|\.txt|\.json|\.sh)\b/i.test(stepResponse) ||
        /\b(file|\.py|\.ts|\.js|\.txt|\.json)\b.*\b(create|write|make)\b/i.test(stepResponse);

      // ── Recovery 1: model refused to use a tool ("I can't open/control/launch...") ──
      const refusedCapability =
        /i can'?t\s+(directly\s+)?(open|control|launch|access|play|operate|use)/i.test(stepResponse) ||
        /just\s+a\s+text.based\s+ai/i.test(stepResponse) ||
        /i('m|\s+am)\s+(not able|unable)\s+to\s+(open|launch|control|access)/i.test(stepResponse) ||
        /i\s+don'?t\s+have\s+(the\s+)?(ability|access|capability)\s+to\s+(open|control|launch)/i.test(stepResponse);

      if (refusedCapability && step < MAX_STEPS - 1) {
        // Extract what the user originally asked to open (if detectable)
        const userMsg = request.message.toLowerCase();
        let correctionHint = 'Action: terminal\nInput: {"command": "open -a \'<AppName>\'"}';

        if (/notion/i.test(userMsg)) {
          correctionHint = 'Action: terminal\nInput: {"command": "open -a \'Notion\'"}';
        } else if (/spotify/i.test(userMsg)) {
          correctionHint = 'Action: terminal\nInput: {"command": "open -a \'Spotify\'"}';
        } else if (/youtube\s*music/i.test(userMsg)) {
          const q = userMsg.replace(/.*play\s+/i, "").replace(/\s+on\s+youtube.*/i, "").trim().replace(/\s+/g, "+");
          correctionHint = `Action: terminal\nInput: {"command": "open -a 'Google Chrome' 'https://music.youtube.com/search?q=${q}'"}`;
        } else if (/youtube/i.test(userMsg)) {
          correctionHint = 'Action: terminal\nInput: {"command": "open -a \'Google Chrome\' \'https://youtube.com\'"}';
        } else if (/chrome|browser/i.test(userMsg)) {
          correctionHint = 'Action: terminal\nInput: {"command": "open -a \'Google Chrome\'"}';
        } else if (/safari/i.test(userMsg)) {
          correctionHint = 'Action: terminal\nInput: {"command": "open -a \'Safari\'"}';
        } else if (/vscode|vs code/i.test(userMsg)) {
          correctionHint = 'Action: terminal\nInput: {"command": "open -a \'Visual Studio Code\'"}';
        }

        history.push(
          { role: "assistant", content: stepResponse },
          {
            role: "user",
            content:
              "CORRECTION: You are LazyFlow — you run ON this Mac and CAN control it. " +
              "The `open` command works. Output ONLY these two lines, nothing else:\n" +
              correctionHint
          }
        );
        continue;
      }

      // ── Recovery 2: model showed code block instead of writing the file ──
      if (hasCodeBlock && (looksLikeFilePlan || step === 0) && step < MAX_STEPS - 1) {
        // Don't emit the hallucinated response — silently re-inject a correction
        history.push(
          { role: "assistant", content: stepResponse },
          {
            role: "user",
            content:
              "You showed a code block instead of creating the file. " +
              "Now actually write it to disk using the filesystem tool. " +
              "Output ONLY the Action/Input lines — nothing else:\n" +
              'Action: filesystem\n' +
              'Input: {"action": "create", "path": "<full absolute path>", "content": "<file content with \\n for newlines>"}'
          }
        );
        continue; // give the model another chance
      }

      // No tool call and no recoverable pattern — this is the final answer.
      emit({ type: "assistant_delta", content: stepResponse });
      return;
    }

    // Execute the tool the model chose.
    const tool = getTool(toolCall.name);

    const execution: ToolExecution = {
      id: crypto.randomUUID(),
      name: toolCall.name,
      label: toolCall.label,
      input: toolCall.inputSummary,
      output: "",
      status: "running",
      startedAt: new Date().toISOString()
    };

    emit({ type: "tool_start", tool: execution });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (tool as { execute: (input: any, ctx: any) => Promise<any> }).execute(toolCall.input, {
      workspaceRoot: WORKSPACE_ROOT,
      signal,
      onDelta(delta: { output: string }) {
        execution.output += delta.output;
        emit({ type: "tool_delta", id: execution.id, output: delta.output });
      }
    });

    const output = execution.output || result.output;
    execution.output = output;
    execution.status = result.status;
    execution.endedAt = new Date().toISOString();

    emit({
      type: "tool_end",
      id: execution.id,
      status: execution.status,
      output,
      endedAt: execution.endedAt
    });

    // Feed the tool result back so the model can decide the next step.
    history.push(
      { role: "assistant", content: stepResponse },
      {
        role: "user",
        content: `Tool result [${toolCall.name} — ${toolCall.inputSummary}]:\n${truncate(output)}`
      }
    );
  }

  // Hit the step cap — emit a brief summary instead of silently stopping.
  emit({
    type: "assistant_delta",
    content:
      "Reached the maximum step limit. Review the tool results above to see what was completed."
  });
}

// ── Tool-call parsing ────────────────────────────────────────────────────────

function parseToolCall(response: string): ParsedToolCall | null {
  // Find the first "Action:" in the response.
  // We execute ONE tool per step so multi-action responses are handled
  // across loop iterations naturally (first action runs, result fed back, next action runs).
  const actionIdx = response.indexOf("Action:");
  if (actionIdx === -1) return null;

  const tail = response.slice(actionIdx);

  const nameMatch = tail.match(/^Action:\s*(\S+)/m);
  if (!nameMatch) return null;

  // Normalize: map Unix commands the model may write directly to a registered tool.
  // "mkdir"/"touch" → filesystem (safe, supports absolute paths)
  // everything else  → terminal
  const UNIX_CMD_ALIASES: Record<string, ToolName> = {
    mkdir: "filesystem",   // handled by filesystem action:"mkdir" (allows absolute paths)
    touch: "terminal",
    ls: "terminal",
    cat: "terminal",
    grep: "terminal",
    find: "terminal",
    git: "terminal",
    node: "terminal",
    npm: "terminal",
    npx: "terminal",
    python3: "terminal",
    python: "terminal",
    tsc: "terminal",
    eslint: "terminal",
  };

  const rawName = nameMatch[1].trim();
  const name = (UNIX_CMD_ALIASES[rawName] ?? rawName) as ToolName;
  if (!["terminal", "filesystem", "code_runner", "notion"].includes(name)) return null;

  // If the model wrote a Unix command directly (e.g. Action: mkdir),
  // reconstruct the terminal input from whatever was in Input: {...}.
  const aliasedFromUnix = rawName in UNIX_CMD_ALIASES && rawName !== name;

  const inputStart = tail.indexOf("Input:");
  if (inputStart === -1) return null;

  const jsonStart = tail.indexOf("{", inputStart);
  if (jsonStart === -1) return null;

  // Walk forward to find the matching closing brace — handles nested objects.
  let depth = 0;
  let jsonEnd = -1;
  for (let i = jsonStart; i < tail.length; i++) {
    if (tail[i] === "{") depth++;
    else if (tail[i] === "}") {
      depth--;
      if (depth === 0) {
        jsonEnd = i + 1;
        break;
      }
    }
  }

  if (jsonEnd === -1) return null;

  let input: Record<string, unknown>;
  const rawJson = tail.slice(jsonStart, jsonEnd);
  try {
    input = JSON.parse(rawJson) as Record<string, unknown>;
  } catch {
    // The model often emits literal newlines inside JSON strings (not \n escapes),
    // making JSON.parse fail. Sanitize string values and retry.
    try {
      input = JSON.parse(sanitizeJsonString(rawJson)) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  // When the model wrote a bare Unix command (e.g. "Action: mkdir"),
  // reconstruct the proper tool input from whatever fields were in Input: {...}.
  if (aliasedFromUnix && !input.command) {
    const p = String(input.path ?? input.dest ?? "");
    const args = String(input.args ?? "");

    if (rawName === "mkdir") {
      // Route to filesystem action:"mkdir" which supports absolute paths
      input = { action: "mkdir", path: p };
    } else if (rawName === "touch") {
      input = { command: `touch ${p}` };
    } else if (p) {
      input = { command: `${rawName} ${args} ${p}`.trim() };
    } else {
      input = { command: rawName };
    }
  }

  // If the model used "Action: filesystem" with action:"create" on an absolute path
  // that has no file extension, it's trying to create a directory — redirect to mkdir.
  // Paths WITH an extension (e.g. .py, .ts, .txt) are real files and should use create.
  if (
    name === "filesystem" &&
    input.action === "create" &&
    typeof input.path === "string" &&
    path.isAbsolute(input.path) &&
    !path.extname(input.path)
  ) {
    input = { action: "mkdir", path: input.path };
  }

  return {
    name,
    label: buildLabel(name, input),
    input,
    inputSummary: buildSummary(name, input)
  };
}

function buildLabel(name: ToolName, input: Record<string, unknown>): string {
  if (name === "terminal") return `Run: ${String(input.command ?? "")}`;
  if (name === "filesystem") {
    const action = String(input.action ?? "");
    const p = String(input.path ?? ".");
    if (action === "grep") return `Search: "${input.search}" in ${p}`;
    if (action === "patch") return `Patch: ${p}`;
    if (action === "read") return `Read: ${p}`;
    if (action === "list") return `List: ${p}`;
    if (action === "write") return `Write: ${p}`;
    if (action === "create") return `Create: ${p}`;
    return `Filesystem: ${action} ${p}`;
  }
  if (name === "notion") {
    const action = String(input.action ?? "");
    if (action === "create_page") return `Notion: Create "${input.title}"`;
    return `Notion: ${action}`;
  }
  return name;
}

function buildSummary(name: ToolName, input: Record<string, unknown>): string {
  if (name === "terminal") return String(input.command ?? "").slice(0, 120);
  if (name === "notion") return `create_page: ${String(input.title ?? "")}`;
  if (name === "filesystem") {
    const action = String(input.action ?? "");
    const p = String(input.path ?? ".");
    if (action === "grep") return `grep "${input.search}" in ${p}`;
    return `${action} ${p}`;
  }
  return JSON.stringify(input).slice(0, 120);
}

function truncate(value: string) {
  if (value.length <= 4000) return value;
  return `${value.slice(0, 4000)}\n...output truncated...`;
}

/**
 * Replace literal newlines/tabs/carriage-returns that appear INSIDE JSON string
 * values with their escape-sequence equivalents so JSON.parse doesn't throw.
 * Only characters inside double-quoted strings are touched.
 */
function sanitizeJsonString(raw: string): string {
  let inString = false;
  let escaped = false;
  let result = "";

  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];

    if (escaped) {
      result += ch;
      escaped = false;
      continue;
    }

    if (ch === "\\") {
      result += ch;
      escaped = true;
      continue;
    }

    if (ch === '"') {
      inString = !inString;
      result += ch;
      continue;
    }

    if (inString) {
      // Replace bare control characters that are illegal inside JSON strings
      if (ch === "\n") { result += "\\n"; continue; }
      if (ch === "\r") { result += "\\r"; continue; }
      if (ch === "\t") { result += "\\t"; continue; }
    }

    result += ch;
  }

  return result;
}
