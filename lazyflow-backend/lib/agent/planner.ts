import type { PlannedToolCall } from "@/lib/agent/types";

export function planToolCalls(message: string): PlannedToolCall[] {
  const text = message.trim();
  const lower = text.toLowerCase();
  const calls: PlannedToolCall[] = [];

  const command = extractCommand(text);
  if (
    command &&
    /\b(run|execute|terminal|shell|command)\b/i.test(text)
  ) {
    calls.push(makeCall("terminal", `Run ${command}`, { command }, command));
    return calls;
  }

  if (/^(pwd|ls|git status|npm run [\w:-]+|npm test|node -v|npm -v)\b/.test(lower)) {
    calls.push(makeCall("terminal", `Run ${text}`, { command: text }, text));
    return calls;
  }

  const readPath = matchPath(text, /\bread\s+(?:the\s+)?file\s+([^\n]+)$/i);
  if (readPath) {
    calls.push(
      makeCall(
        "filesystem",
        `Read ${readPath}`,
        { action: "read", path: readPath },
        readPath
      )
    );
    return calls;
  }

  const listPath = matchPath(
    text,
    /\b(?:list|show)\s+(?:the\s+)?(?:directory|folder|files)(?:\s+in)?\s*([^\n]*)$/i
  );
  if (listPath !== null) {
    const target = listPath || ".";
    calls.push(
      makeCall(
        "filesystem",
        `List ${target}`,
        { action: "list", path: target },
        target
      )
    );
    return calls;
  }

  const writeMatch = text.match(
    /\b(write|create)\s+(?:the\s+)?file\s+([^\n]+?)(?:\s+with\s+content)?\s*```(?:\w+)?\n([\s\S]*?)```/i
  );
  if (writeMatch) {
    const action = writeMatch[1].toLowerCase() === "create" ? "create" : "write";
    const target = writeMatch[2].trim().replace(/^["'`]|["'`]$/g, "");
    const content = writeMatch[3];

    if (!/\bconfirm\b/i.test(text)) {
      calls.push(
        makeCall(
          "filesystem",
          `Confirm ${action} ${target}`,
          {
            action: "confirm_required",
            path: target,
            content
          },
          target
        )
      );
      return calls;
    }

    calls.push(
      makeCall(
        "filesystem",
        `${action === "create" ? "Create" : "Write"} ${target}`,
        { action, path: target, content },
        target
      )
    );
    return calls;
  }

  const codeBlock = text.match(/```(ts|typescript|js|javascript)?\n([\s\S]*?)```/i);
  if (codeBlock && /\b(run|execute|test)\b/i.test(text)) {
    const language = /ts|typescript/i.test(codeBlock[1] ?? "")
      ? "typescript"
      : "javascript";
    calls.push(
      makeCall(
        "code_runner",
        `Run ${language}`,
        { code: codeBlock[2], language },
        `${language} snippet`
      )
    );
  }

  return calls;
}

function makeCall(
  name: PlannedToolCall["name"],
  label: string,
  input: Record<string, unknown>,
  inputSummary: string
): PlannedToolCall {
  return {
    id: crypto.randomUUID(),
    name,
    label,
    input,
    inputSummary
  };
}

function extractCommand(text: string) {
  const fenced = text.match(/```(?:bash|sh|zsh|shell)?\n([\s\S]*?)```/i);
  if (fenced?.[1]) return firstLine(fenced[1]);

  const quoted = text.match(/`([^`]+)`/);
  if (quoted?.[1]) return quoted[1].trim();

  const afterColon = text.match(/(?:run|execute)(?:\s+this)?(?:\s+command)?\s*:?\s*(.+)$/i);
  return afterColon?.[1]?.trim() ?? null;
}

function firstLine(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean) ?? "";
}

function matchPath(text: string, pattern: RegExp) {
  const match = text.match(pattern);
  if (!match) return null;

  return (match[1] ?? "")
    .trim()
    .replace(/^["'`]|["'`]$/g, "")
    .trim();
}
