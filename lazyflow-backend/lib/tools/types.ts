export type ToolName = "terminal" | "filesystem" | "code_runner" | "notion";

export type ToolStatus = "running" | "success" | "error" | "blocked";

export type ToolExecution = {
  id: string;
  name: ToolName;
  label: string;
  input: string;
  output: string;
  status: ToolStatus;
  startedAt: string;
  endedAt?: string;
};

export type ToolResult = {
  output: string;
  status: Exclude<ToolStatus, "running">;
};

export type ToolDelta = {
  output: string;
};

export type ToolContext = {
  signal?: AbortSignal;
  workspaceRoot: string;
  onDelta?: (delta: ToolDelta) => void;
};

export type ToolDefinition<Input = unknown> = {
  name: ToolName;
  description: string;
  execute: (input: Input, context: ToolContext) => Promise<ToolResult>;
};
