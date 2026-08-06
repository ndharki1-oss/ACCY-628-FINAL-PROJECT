"use client";

import { useState, useTransition } from "react";
import { Card } from "@/components/ui";
import { deleteTenantManagerMessages } from "@/app/tenant/actions";

export type ContactMessage = {
  id: string;
  sender_role: string;
  sender_name: string;
  body: string;
  created_at: string;
};

function formatMessageDate(iso: string) {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

function roleLabel(role: string) {
  if (role === "admin") return "Harborline management";
  if (role === "owner") return "Property owner";
  if (role === "tenant") return "You";
  return role;
}

export function ContactConversation({ messages }: { messages: ContactMessage[] }) {
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();

  const hasTenantMessages = messages.some((m) => m.sender_role === "tenant");

  function exitSelect() {
    setSelecting(false);
    setSelected(new Set());
  }

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function removeSelected() {
    if (selected.size === 0) return;
    const formData = new FormData();
    for (const id of selected) formData.append("message_id", id);
    startTransition(async () => {
      await deleteTenantManagerMessages(formData);
      exitSelect();
    });
  }

  return (
    <Card
      title="Conversation"
      action={
        hasTenantMessages ? (
          <button
            type="button"
            onClick={() => (selecting ? exitSelect() : setSelecting(true))}
            className="rounded border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            {selecting ? "Cancel" : "Select"}
          </button>
        ) : null
      }
    >
      {messages.length === 0 ? (
        <p className="text-sm text-slate-600">
          No messages yet. Send a note below to start the conversation.
        </p>
      ) : (
        <div>
          <ul className="space-y-5">
            {messages.map((m) => {
              const fromTenant = m.sender_role === "tenant";
              const isSelected = selected.has(m.id);
              return (
                <li
                  key={m.id}
                  className={`flex flex-col ${fromTenant ? "items-end" : "items-start"}`}
                >
                  <p className="mb-1 text-xs text-slate-500">
                    {formatMessageDate(m.created_at)}
                  </p>
                  <div className="flex max-w-[90%] items-center gap-2">
                    <div
                      className={`rounded-lg px-3 py-2 text-sm ${
                        fromTenant
                          ? "bg-[#0c1f2e] text-[#f3efe6]"
                          : "border border-slate-200 bg-slate-50 text-slate-800"
                      }`}
                    >
                      <p
                        className={`text-xs font-medium ${
                          fromTenant ? "text-slate-300" : "text-slate-500"
                        }`}
                      >
                        {roleLabel(m.sender_role)} · {m.sender_name}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap">{m.body}</p>
                    </div>
                    {selecting && fromTenant ? (
                      <button
                        type="button"
                        onClick={() => toggleSelected(m.id)}
                        aria-pressed={isSelected}
                        aria-label={
                          isSelected ? "Deselect message" : "Select message"
                        }
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition ${
                          isSelected
                            ? "border-[#0c1f2e] bg-[#0c1f2e]"
                            : "border-slate-400 bg-white hover:border-[#0c1f2e]"
                        }`}
                      >
                        {isSelected ? (
                          <span className="h-2 w-2 rounded-full bg-white" />
                        ) : null}
                      </button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>

          {selecting && selected.size > 0 ? (
            <div className="mt-5 flex justify-end border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={removeSelected}
                disabled={pending}
                className="rounded bg-rose-700 px-4 py-2 text-sm text-white hover:bg-rose-800 disabled:opacity-60"
              >
                {pending ? "Removing…" : "Remove"}
              </button>
            </div>
          ) : null}
        </div>
      )}
    </Card>
  );
}
