import { spawn } from "node:child_process";
import { validateShellCommand } from "@/lib/tools/safety";
import type { ToolDefinition } from "@/lib/tools/types";

type TerminalInput = {
  command: string;
};

export const terminalTool: ToolDefinition<TerminalInput> = {
  name: "terminal",
  description: "Execute safe shell commands inside the LazyFlow workspace.",
  async execute(input, context) {
    const command = input.command.trim();
    const safetyError = validateShellCommand(command);

    if (safetyError) {
      return {
        output: safetyError,
        status: "blocked"
      };
    }

    return new Promise((resolve) => {
      let output = "";
      let settled = false;
      const child = spawn(command, {
        cwd: context.workspaceRoot,
        shell: "/bin/zsh",
        env: {
          ...process.env,
          FORCE_COLOR: "0"
        }
      });

      const timeout = windowlessTimeout(() => {
        if (settled) return;
        output += "\nCommand stopped after 20s safety timeout.";
        context.onDelta?.({ output: "\nCommand stopped after 20s safety timeout." });
        child.kill("SIGTERM");
      }, 20_000);

      context.signal?.addEventListener("abort", () => {
        if (!settled) {
          output += "\nCommand cancelled.";
          child.kill("SIGTERM");
        }
      });

      child.stdout.on("data", (chunk: Buffer) => {
        const text = chunk.toString();
        output += text;
        context.onDelta?.({ output: text });
      });

      child.stderr.on("data", (chunk: Buffer) => {
        const text = chunk.toString();
        output += text;
        context.onDelta?.({ output: text });
      });

      child.on("error", (error) => {
        settled = true;
        clearTimeout(timeout);
        resolve({
          output: output || error.message,
          status: "error"
        });
      });

      child.on("close", (code) => {
        settled = true;
        clearTimeout(timeout);
        resolve({
          output: output || `Command exited with code ${code ?? 0}.`,
          status: code === 0 ? "success" : "error"
        });
      });
    });
  }
};

function windowlessTimeout(callback: () => void, ms: number) {
  return setTimeout(callback, ms);
}
