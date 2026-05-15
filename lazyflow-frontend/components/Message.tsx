"use client";

import {
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  FileText,
  SquareTerminal,
  Zap
} from "lucide-react";
import { useState } from "react";
import { formatMessageTime, type ChatMessage } from "@/lib/conversations";
import type { ExecutionMode } from "@/lib/agent/types";
import type { ToolExecution } from "@/lib/tools/types";

type MessageProps = {
  message: ChatMessage;
};

export function Message({ message }: MessageProps) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";

  async function copyCode() {
    if (!message.code) return;
    await navigator.clipboard.writeText(message.code.value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  const isEmptyStreaming = message.status === "streaming" && !message.content;

  return (
    <article className={`flex w-full ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[min(760px,92%)] ${
          isUser ? "items-end" : "items-start"
        } flex flex-col gap-2`}
      >
        <div
          className={`rounded-2xl px-4 py-3 text-[15px] leading-7 shadow-[0_1px_2px_rgba(17,24,39,0.04)] ${
            isUser
              ? "rounded-br-md bg-primary text-white"
              : "rounded-bl-md border border-line bg-white text-gray-900"
          }`}
        >
          {isEmptyStreaming ? (
            <div className="flex h-7 items-center gap-1.5">
              <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.2s]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.1s]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400" />
            </div>
          ) : (
            <p className="whitespace-pre-wrap">{message.content}</p>
          )}
          {message.code ? (
            <div className="mt-3 overflow-hidden rounded-xl bg-[#111827] text-white shadow-soft">
              <div className="flex h-10 items-center justify-between border-b border-white/10 px-3">
                <span className="text-xs font-semibold uppercase tracking-normal text-gray-300">
                  {message.code.language}
                </span>
                <button
                  className="flex h-7 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-gray-300 transition hover:bg-white/10 hover:text-white"
                  onClick={copyCode}
                  type="button"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <pre className="scrollbar-subtle overflow-x-auto p-4 text-[13px] leading-6 text-gray-100">
                <code>{message.code.value}</code>
              </pre>
            </div>
          ) : null}
          {message.toolExecutions?.length ? (
            <div className="mt-3 space-y-2">
              {message.toolExecutions.map((tool) => (
                <ToolCard key={tool.id} tool={tool} />
              ))}
            </div>
          ) : null}
        </div>
        <span className="flex items-center gap-2 px-1 text-xs font-medium text-gray-400">
          <span>{isUser ? "You" : "LazyFlow"} • {formatMessageTime(message.createdAt)}</span>
          {!isUser && message.mode ? <ModeBadge mode={message.mode} /> : null}
        </span>
      </div>
    </article>
  );
}

export type { ChatMessage };

const MODE_CONFIG: Record<ExecutionMode, { label: string; className: string }> = {
  chat: {
    label: "Chat",
    className: "bg-gray-100 text-gray-500 ring-gray-200"
  },
  reasoning: {
    label: "Reason",
    className: "bg-blue-50 text-blue-600 ring-blue-100"
  },
  agent: {
    label: "Agent",
    className: "bg-emerald-50 text-primary ring-emerald-100"
  }
};

function ModeBadge({ mode }: { mode: ExecutionMode }) {
  const { label, className } = MODE_CONFIG[mode];
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${className}`}>
      {label}
    </span>
  );
}

function ToolCard({ tool }: { tool: ToolExecution }) {
  const [expanded, setExpanded] = useState(tool.status !== "success");
  const Icon =
    tool.name === "terminal"
      ? SquareTerminal
      : tool.name === "filesystem"
        ? FileText
        : Zap;

  const statusClass =
    tool.status === "success"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
      : tool.status === "running"
        ? "bg-amber-50 text-amber-700 ring-amber-100"
        : tool.status === "blocked"
          ? "bg-gray-100 text-gray-700 ring-gray-200"
          : "bg-red-50 text-red-700 ring-red-100";

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-panel">
      <button
        className="flex w-full items-center gap-3 px-3 py-2 text-left"
        onClick={() => setExpanded((current) => !current)}
        type="button"
      >
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-white text-gray-600 ring-1 ring-line">
          <Icon size={16} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-gray-900">
            {tool.label}
          </span>
          <span className="block truncate text-xs text-gray-500">
            {tool.input}
          </span>
        </span>
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ring-1 ${statusClass}`}
        >
          {tool.status}
        </span>
        {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
      </button>
      {expanded ? (
        <pre className="scrollbar-subtle max-h-72 overflow-auto border-t border-line bg-[#111827] p-3 text-[12px] leading-5 text-gray-100">
          <code>{tool.output || "Waiting for output..."}</code>
        </pre>
      ) : null}
    </div>
  );
}
