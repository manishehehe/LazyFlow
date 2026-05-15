import { codeRunnerTool } from "@/lib/tools/code-runner";
import { filesystemTool } from "@/lib/tools/filesystem";
import { notionTool } from "@/lib/tools/notion";
import { terminalTool } from "@/lib/tools/terminal";
import type { ToolDefinition, ToolName } from "@/lib/tools/types";

export const toolRegistry = {
  terminal: terminalTool,
  filesystem: filesystemTool,
  code_runner: codeRunnerTool,
  notion: notionTool
} satisfies Record<ToolName, ToolDefinition<any>>;

export function getTool(name: ToolName) {
  return toolRegistry[name];
}
