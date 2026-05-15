"use client";

import {
  ChevronDown,
  Menu,
  PanelLeft,
  Settings,
  Share2
} from "lucide-react";
import { MODEL_PRESETS, type ModelId } from "@/lib/models";

type TopbarProps = {
  disabled?: boolean;
  isGenerating?: boolean;
  latencyMs: number | null;
  selectedModel: ModelId;
  onModelChange: (model: ModelId) => void;
};

export function Topbar({
  disabled = false,
  isGenerating = false,
  latencyMs,
  selectedModel,
  onModelChange
}: TopbarProps) {
  const activeModel =
    MODEL_PRESETS.find((model) => model.id === selectedModel) ??
    MODEL_PRESETS[0];

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-line bg-white px-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button
          aria-label="Open sidebar"
          className="grid h-10 w-10 place-items-center rounded-xl border border-line text-gray-600 shadow-[0_1px_2px_rgba(17,24,39,0.04)] transition hover:bg-gray-50 md:hidden"
        >
          <Menu size={18} />
        </button>
        <button
          aria-label="Toggle sidebar"
          className="hidden h-10 w-10 place-items-center rounded-xl border border-line text-gray-600 shadow-[0_1px_2px_rgba(17,24,39,0.04)] transition hover:bg-gray-50 md:grid"
        >
          <PanelLeft size={18} />
        </button>
        <label className="relative flex h-10 min-w-0 items-center gap-2 rounded-xl border border-line bg-white px-3 pr-9 text-left shadow-[0_1px_2px_rgba(17,24,39,0.04)] transition focus-within:border-emerald-300 focus-within:ring-4 focus-within:ring-emerald-50 hover:bg-gray-50">
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold">
              {activeModel.label}
            </span>
          </span>
          <span className="hidden rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-primary ring-1 ring-emerald-100 sm:inline">
            {activeModel.badge}
          </span>
          <select
            aria-label="Select model"
            className="absolute inset-0 cursor-pointer opacity-0 disabled:cursor-not-allowed"
            disabled={disabled}
            onChange={(event) => onModelChange(event.target.value as ModelId)}
            value={selectedModel}
          >
            {MODEL_PRESETS.map((model) => (
              <option key={model.id} value={model.id}>
                {model.label} - {model.description}
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-3 shrink-0 text-gray-500"
            size={16}
          />
        </label>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <div className="hidden h-9 items-center gap-2 rounded-full border border-line bg-panel px-3 text-sm font-medium text-gray-700 sm:flex">
          <span
            className={`h-2.5 w-2.5 rounded-full shadow-[0_0_0_4px_rgba(16,185,129,0.13)] ${
              isGenerating ? "animate-pulse bg-amber-400" : "bg-primary"
            }`}
          />
          <span>{latencyMs === null ? "Local" : `${latencyMs}ms`}</span>
        </div>
        <button
          aria-label="Settings"
          className="grid h-10 w-10 place-items-center rounded-xl border border-line text-gray-600 transition hover:bg-gray-50"
        >
          <Settings size={18} />
        </button>
        <button
          aria-label="Share"
          className="grid h-10 w-10 place-items-center rounded-xl border border-line text-gray-600 transition hover:bg-gray-50"
        >
          <Share2 size={18} />
        </button>
      </div>
    </header>
  );
}
