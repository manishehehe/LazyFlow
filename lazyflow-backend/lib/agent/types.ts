import type { ModelId } from "@/lib/models";
import type { ToolExecution, ToolName } from "@/lib/tools/types";
import type { ExecutionMode } from "@/lib/agent/classifier";

export type { ExecutionMode };

export type AgentRequestMessage = {
  role: "user" | "ai";
  content: string;
};

export type AgentRequest = {
  message: string;
  messages?: AgentRequestMessage[];
  model?: ModelId;
  forceMode?: ExecutionMode;
};

export type PlannedToolCall = {
  id: string;
  name: ToolName;
  label: string;
  input: Record<string, unknown>;
  inputSummary: string;
};

export type AgentStreamEvent =
  | {
      type: "assistant_delta";
      content: string;
    }
  | {
      type: "tool_start";
      tool: ToolExecution;
    }
  | {
      type: "tool_delta";
      id: string;
      output: string;
    }
  | {
      type: "tool_end";
      id: string;
      status: ToolExecution["status"];
      output: string;
      endedAt: string;
    }
  | {
      type: "mode";
      mode: ExecutionMode;
    }
  | {
      type: "error";
      error: string;
    }
  | {
      type: "done";
    };
