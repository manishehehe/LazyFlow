"use client";

import {
  Check,
  MoreHorizontal,
  MessageSquare,
  Pencil,
  Plus,
  Trash2,
  Search,
  Sparkles,
  X,
  UserRound
} from "lucide-react";
import { FormEvent, MouseEvent, useMemo, useState } from "react";
import {
  formatRelativeTime,
  type Conversation
} from "@/lib/conversations";

type SidebarProps = {
  activeConversationId: string | null;
  conversations: Conversation[];
  onCreateConversation: () => void;
  onDeleteConversation: (id: string) => void;
  onRenameConversation: (id: string, title: string) => void;
  onSelectConversation: (id: string) => void;
};

export function Sidebar({
  activeConversationId,
  conversations,
  onCreateConversation,
  onDeleteConversation,
  onRenameConversation,
  onSelectConversation
}: SidebarProps) {
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const filteredConversations = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return conversations;

    return conversations.filter((conversation) =>
      conversation.title.toLowerCase().includes(needle)
    );
  }, [conversations, query]);

  function startRename(event: MouseEvent, conversation: Conversation) {
    event.stopPropagation();
    setOpenMenuId(null);
    setEditingId(conversation.id);
    setEditingTitle(conversation.title);
  }

  function submitRename(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingId) return;

    onRenameConversation(editingId, editingTitle);
    setEditingId(null);
  }

  function deleteChat(event: MouseEvent, id: string) {
    event.stopPropagation();
    setOpenMenuId(null);
    onDeleteConversation(id);
  }

  return (
    <aside className="flex h-dvh w-[248px] shrink-0 flex-col border-r border-line bg-panel px-4 py-4 shadow-[inset_-1px_0_0_rgba(229,231,235,0.5)] sm:w-[280px]">
      <div className="flex h-10 items-center gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-white shadow-control">
          <Sparkles size={18} strokeWidth={2.5} />
        </div>
        <div className="flex min-h-9 items-center">
          <h1 className="text-[17px] font-semibold leading-5 tracking-normal">
            LazyFlow
          </h1>
        </div>
      </div>

      <button
        className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-white shadow-control transition hover:bg-emerald-600 focus:outline-none focus:ring-4 focus:ring-emerald-100"
        onClick={() => onCreateConversation()}
        type="button"
      >
        <Plus size={18} />
        New Chat
      </button>

      <label className="mt-4 flex h-10 items-center gap-2 rounded-xl border border-line bg-white px-3 text-gray-500 shadow-[0_1px_2px_rgba(17,24,39,0.03)] focus-within:border-emerald-300 focus-within:ring-4 focus-within:ring-emerald-50">
        <Search size={16} />
        <input
          className="min-w-0 flex-1 bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search chats"
          type="search"
          value={query}
        />
      </label>

      <nav className="scrollbar-subtle -mx-1 mt-4 flex-1 space-y-1 overflow-y-auto pr-1">
        {filteredConversations.map((conversation) => {
          const active = conversation.id === activeConversationId;
          const editing = conversation.id === editingId;

          return (
          <div
            className={`group flex min-h-14 w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition ${
              active
                ? "bg-white shadow-control ring-1 ring-line"
                : "hover:bg-white/75"
            }`}
            key={conversation.id}
            onClick={() => onSelectConversation(conversation.id)}
            role="button"
            tabIndex={0}
          >
            <span
              className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${
                active
                  ? "bg-emerald-50 text-primary"
                  : "bg-gray-100 text-gray-500 group-hover:text-gray-700"
              }`}
            >
              <MessageSquare size={16} />
            </span>
            {editing ? (
              <form
                className="flex min-w-0 flex-1 items-center gap-1"
                onClick={(event) => event.stopPropagation()}
                onSubmit={submitRename}
              >
                <input
                  autoFocus
                  className="h-8 min-w-0 flex-1 rounded-lg border border-emerald-200 bg-white px-2 text-sm font-medium outline-none ring-2 ring-emerald-50"
                  onChange={(event) => setEditingTitle(event.target.value)}
                  value={editingTitle}
                />
                <button
                  aria-label="Save conversation name"
                  className="grid h-8 w-8 place-items-center rounded-lg text-primary hover:bg-emerald-50"
                  type="submit"
                >
                  <Check size={15} />
                </button>
                <button
                  aria-label="Cancel rename"
                  className="grid h-8 w-8 place-items-center rounded-lg text-gray-500 hover:bg-gray-100"
                  onClick={() => setEditingId(null)}
                  type="button"
                >
                  <X size={15} />
                </button>
              </form>
            ) : (
              <>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-gray-900">
                    {conversation.title}
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatRelativeTime(conversation.updatedAt)}
                  </span>
                </span>
                <span className="relative">
                  <span
                    aria-label="Conversation actions"
                    className="grid h-8 w-8 place-items-center rounded-lg text-gray-400 opacity-0 transition hover:bg-gray-100 hover:text-gray-700 group-hover:opacity-100"
                    onClick={(event) => {
                      event.stopPropagation();
                      setOpenMenuId((current) =>
                        current === conversation.id ? null : conversation.id
                      );
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <MoreHorizontal size={16} />
                  </span>
                  {openMenuId === conversation.id ? (
                    <span className="absolute right-0 top-9 z-10 w-36 overflow-hidden rounded-xl border border-line bg-white p-1 shadow-soft">
                      <span
                        className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                        onClick={(event) => startRename(event, conversation)}
                        role="button"
                        tabIndex={0}
                      >
                        <Pencil size={14} />
                        Rename
                      </span>
                      <span
                        className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                        onClick={(event) => deleteChat(event, conversation.id)}
                        role="button"
                        tabIndex={0}
                      >
                        <Trash2 size={14} />
                        Delete
                      </span>
                    </span>
                  ) : null}
                </span>
              </>
            )}
          </div>
          );
        })}
        {!filteredConversations.length ? (
          <div className="px-3 py-8 text-center text-sm text-gray-500">
            {query ? "No chats match your search." : "No conversations yet."}
          </div>
        ) : null}
      </nav>

      <div className="mt-4 rounded-xl border border-line bg-white p-3 shadow-control">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gray-100 text-gray-700">
            <UserRound size={19} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">Manish</p>
            <p className="truncate text-xs text-gray-500">Local workspace</p>
          </div>
          <span className="h-2.5 w-2.5 rounded-full bg-primary shadow-[0_0_0_4px_rgba(16,185,129,0.12)]" />
        </div>
      </div>
    </aside>
  );
}
