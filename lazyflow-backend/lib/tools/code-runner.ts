import ts from "typescript";
import vm from "node:vm";
import type { ToolDefinition } from "@/lib/tools/types";

type CodeRunnerInput = {
  code: string;
  language?: "javascript" | "typescript";
};

export const codeRunnerTool: ToolDefinition<CodeRunnerInput> = {
  name: "code_runner",
  description: "Run JavaScript or TypeScript snippets in a restricted VM.",
  async execute(input) {
    const logs: string[] = [];

    try {
      const source =
        input.language === "typescript"
          ? ts.transpileModule(input.code, {
              compilerOptions: {
                module: ts.ModuleKind.CommonJS,
                target: ts.ScriptTarget.ES2020
              }
            }).outputText
          : input.code;

      const context = vm.createContext({
        console: {
          log: (...values: unknown[]) => logs.push(values.map(String).join(" ")),
          error: (...values: unknown[]) =>
            logs.push(values.map(String).join(" ")),
          warn: (...values: unknown[]) => logs.push(values.map(String).join(" "))
        },
        Math,
        JSON,
        Date,
        URL,
        setTimeout,
        clearTimeout
      });

      const script = new vm.Script(`"use strict";\n${source}`);
      const result = script.runInContext(context, {
        timeout: 4_000
      });

      if (result !== undefined) {
        logs.push(String(result));
      }

      return {
        output: logs.join("\n") || "Snippet completed without output.",
        status: "success"
      };
    } catch (error) {
      return {
        output: error instanceof Error ? error.message : "Code runner failed.",
        status: "error"
      };
    }
  }
};
