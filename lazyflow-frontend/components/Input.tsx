"use client";

import { Paperclip, Play, SendHorizontal, Square } from "lucide-react";
import { FormEvent, useState } from "react";

type InputProps = {
  disabled?: boolean;
  onSend: (value: string, forceAgent: boolean) => void;
  onStop?: () => void;
};

export function Input({ disabled = false, onSend, onStop }: InputProps) {
  const [value, setValue] = useState("");
  const [agentMode, setAgentMode] = useState(false);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = value.trim();
    if (!next || disabled) return;
    onSend(next, agentMode);
    setValue("");
  }

  return (
    <div className="sticky bottom-0 border-t border-line bg-white/92 px-4 py-4 backdrop-blur-xl sm:px-6">
      <form
        className="mx-auto flex max-w-4xl items-end gap-3 rounded-2xl border border-line bg-white p-2 shadow-soft"
        onSubmit={submit}
      >
        <div className="flex gap-1 pb-1">
          <button
            aria-label="Attach file"
            className="grid h-10 w-10 place-items-center rounded-xl text-gray-500 transition hover:bg-gray-100 hover:text-gray-800"
            type="button"
          >
            <Paperclip size={19} />
          </button>
          <button
            aria-label="Run code"
            className="grid h-10 w-10 place-items-center rounded-xl text-gray-500 transition hover:bg-gray-100 hover:text-gray-800"
            type="button"
          >
            <Play size={18} />
          </button>
        </div>

        <textarea
          className="scrollbar-subtle max-h-36 min-h-11 flex-1 resize-none bg-transparent px-1 py-3 text-[15px] leading-6 text-gray-900 outline-none placeholder:text-gray-400 disabled:cursor-not-allowed disabled:text-gray-500"
          disabled={disabled}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              if (!disabled) event.currentTarget.form?.requestSubmit();
            }
          }}
          placeholder={
            disabled
              ? "LazyFlow is thinking..."
              : agentMode
                ? "Ask LazyFlow to run code, edit files, or execute commands..."
                : "Ask LazyFlow anything..."
          }
          rows={1}
          value={value}
        />

        <div className="hidden items-center gap-2 pb-1 sm:flex">
          <button
            aria-pressed={agentMode}
            className={`flex h-10 items-center gap-2 rounded-xl border px-3 text-sm font-semibold transition ${
              agentMode
                ? "border-emerald-200 bg-emerald-50 text-primary"
                : "border-line text-gray-500 hover:bg-gray-50"
            }`}
            onClick={() => setAgentMode((current) => !current)}
            type="button"
            disabled={disabled}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                agentMode ? "bg-primary" : "bg-gray-300"
              }`}
            />
            Agent
          </button>
        </div>

        <button
          aria-label={disabled ? "Stop response" : "Send message"}
          className={`mb-1 grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white shadow-control transition ${
            disabled
              ? "bg-gray-900 hover:bg-gray-800"
              : "bg-primary hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-gray-300"
          }`}
          disabled={!disabled && !value.trim()}
          onClick={disabled ? onStop : undefined}
          type={disabled ? "button" : "submit"}
        >
          {disabled ? (
            <Square size={15} fill="currentColor" />
          ) : (
            <SendHorizontal size={18} />
          )}
        </button>
      </form>
    </div>
  );
}
