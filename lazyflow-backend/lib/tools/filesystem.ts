import fs from "node:fs/promises";
import path from "node:path";
import { resolveWorkspacePath } from "@/lib/tools/safety";
import type { ToolDefinition } from "@/lib/tools/types";

type FileSystemInput = {
  action: "list" | "read" | "write" | "create" | "mkdir" | "confirm_required" | "grep" | "patch";
  path?: string;
  content?: string;
  search?: string;  // grep: pattern to search for
  old?: string;     // patch: exact text to find
  new?: string;     // patch: replacement text
};

const MAX_READ_BYTES = 160_000;
const MAX_GREP_FILES = 60;

export const filesystemTool: ToolDefinition<FileSystemInput> = {
  name: "filesystem",
  description: "Read, write, create, search, and patch files in the workspace.",
  async execute(input, context) {
    try {
      if (input.action === "confirm_required") {
        return {
          output:
            'Confirmation required before modifying files. Repeat the request with the word "confirm" to allow this workspace write.',
          status: "blocked"
        };
      }

      // mkdir is handled before workspace resolution so it can operate on absolute
      // paths outside the project (e.g. ~/Desktop, ~/Documents).
      if (input.action === "mkdir") {
        const dirPath = input.path
          ? path.isAbsolute(input.path)
            ? input.path
            : path.resolve(context.workspaceRoot, input.path)
          : context.workspaceRoot;
        await fs.mkdir(dirPath, { recursive: true });
        return { output: `Directory created: ${dirPath}`, status: "success" };
      }

      // Allow absolute paths so the agent can work anywhere on the filesystem
      // (like Claude Code / Codex). Relative paths are still sandboxed to the workspace.
      const rawPath = input.path ?? ".";
      const target = path.isAbsolute(rawPath)
        ? rawPath
        : resolveWorkspacePath(context.workspaceRoot, rawPath);

      if (input.action === "list") {
        const entries = await fs.readdir(target, { withFileTypes: true });
        return {
          output: entries
            .map((e) => `${e.isDirectory() ? "dir " : "file"} ${e.name}`)
            .join("\n"),
          status: "success"
        };
      }

      if (input.action === "read") {
        const stat = await fs.stat(target);
        if (stat.size > MAX_READ_BYTES) {
          return { output: "File is too large to read safely.", status: "blocked" };
        }
        return { output: await fs.readFile(target, "utf8"), status: "success" };
      }

      if (input.action === "grep") {
        const pattern = input.search ?? "";
        if (!pattern) return { output: "search pattern is required.", status: "error" };

        const stat = await fs.stat(target);
        const results: string[] = [];

        if (stat.isFile()) {
          grepFile(await fs.readFile(target, "utf8"), pattern, input.path ?? target, results);
        } else {
          await grepDir(target, pattern, context.workspaceRoot, results);
        }

        return {
          output: results.length ? results.join("\n") : "No matches found.",
          status: "success"
        };
      }

      if (input.action === "patch") {
        const oldText = input.old ?? "";
        const newText = input.new ?? "";

        if (!input.path) return { output: "path is required for patch.", status: "error" };
        if (!oldText) return { output: "old text is required for patch.", status: "error" };

        const content = await fs.readFile(target, "utf8");

        if (!content.includes(oldText)) {
          return {
            output: `Could not find the text to replace. Make sure old matches the file exactly (including indentation and line endings):\n\n${oldText}`,
            status: "error"
          };
        }

        // Replace only the first occurrence to stay surgical
        const updated = content.replace(oldText, newText);
        await fs.writeFile(target, updated, "utf8");

        return {
          output: `Patched ${path.relative(context.workspaceRoot, target)}.`,
          status: "success"
        };
      }

      if (input.action === "create") {
        await fs.mkdir(path.dirname(target), { recursive: true });
        await fs.writeFile(target, input.content ?? "", { flag: "wx" });
        return {
          output: `Created ${path.relative(context.workspaceRoot, target)}.`,
          status: "success"
        };
      }

      if (input.action === "write") {
        await fs.mkdir(path.dirname(target), { recursive: true });
        await fs.writeFile(target, input.content ?? "", "utf8");
        return {
          output: `Wrote ${path.relative(context.workspaceRoot, target)}.`,
          status: "success"
        };
      }

      return { output: "Unsupported filesystem action.", status: "error" };
    } catch (error) {
      return {
        output: error instanceof Error ? error.message : "Filesystem tool failed.",
        status: "error"
      };
    }
  }
};

function grepFile(content: string, pattern: string, filePath: string, results: string[]) {
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(pattern)) {
      results.push(`${filePath}:${i + 1}: ${lines[i]}`);
    }
  }
}

async function grepDir(
  dir: string,
  pattern: string,
  workspaceRoot: string,
  results: string[],
  visited = { count: 0 }
) {
  if (visited.count >= MAX_GREP_FILES) return;

  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (visited.count >= MAX_GREP_FILES) break;

    if (
      entry.name === "node_modules" ||
      entry.name === ".git" ||
      entry.name === ".next" ||
      entry.name === "dist"
    ) continue;

    const entryPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      await grepDir(entryPath, pattern, workspaceRoot, results, visited);
    } else if (entry.isFile()) {
      visited.count++;
      try {
        const stat = await fs.stat(entryPath);
        if (stat.size > 200_000) continue;
        const content = await fs.readFile(entryPath, "utf8");
        grepFile(content, pattern, path.relative(workspaceRoot, entryPath), results);
      } catch {
        // skip unreadable files
      }
    }
  }
}
