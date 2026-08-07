"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import {
  markAdminThreadRead,
  markAdminThreadUnread,
  replyAdminManagerMessage,
} from "@/app/admin/messages/actions";
import { Card } from "@/components/ui";
import {
  filterAdminConversationThreads,
  formatMessageDateTime,
  partyRoleForChannel,
  roleLabel,
  type AdminConversationThread,
  type AdminInboxFilter,
  type AdminMessageChannel,
} from "@/lib/admin-messages";

const FILTERS: { id: AdminInboxFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "read", label: "Read" },
  { id: "urgent", label: "Urgent" },
];

function ThreadReadToggle({
  thread,
  pending,
  startTransition,
}: {
  thread: AdminConversationThread;
  pending: boolean;
  startTransition: (fn: () => void) => void;
}) {
  return (
    <form
      action={(fd) => {
        startTransition(async () => {
          if (thread.isRead) await markAdminThreadUnread(fd);
          else await markAdminThreadRead(fd);
        });
      }}
    >
      <input type="hidden" name="channel" value={thread.channel} />
      <input type="hidden" name="party_id" value={thread.partyId} />
      <button
        type="submit"
        disabled={pending}
        className="rounded border border-slate-300 px-3 py-1.5 text-xs font-medium text-[#0c1f2e] hover:bg-slate-50 disabled:opacity-60"
      >
        {thread.isRead ? "Mark as Unread" : "Mark as Read"}
      </button>
    </form>
  );
}

function ConversationDrawer({
  thread,
  onClose,
}: {
  thread: AdminConversationThread;
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [reply, setReply] = useState("");
  const partyRole = partyRoleForChannel(thread.channel);
  const partyLabel = thread.channel === "owner" ? "Owner" : "Tenant";

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[#0c1f2e]/45">
      <button
        type="button"
        aria-label="Close conversation"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-thread-detail-title"
        className="relative z-10 flex h-full w-full max-w-lg flex-col border-l border-slate-800/10 bg-[#f4f1ea] shadow-xl"
      >
        <header className="flex items-start justify-between gap-3 border-b border-slate-800/10 bg-[#0c1f2e] px-5 py-4 text-[#f3efe6]">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.18em] text-[#d4a574]">
              Conversation
            </p>
            <h2
              id="admin-thread-detail-title"
              className="mt-1 font-[family-name:var(--font-display)] text-xl"
            >
              {thread.partyName}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-white/20 px-2 py-1 text-sm hover:bg-white/10"
          >
            Close
          </button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5 text-sm">
          <dl className="grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">
                {partyLabel}
              </dt>
              <dd className="mt-0.5 font-medium text-[#0c1f2e]">
                {thread.partyName}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">
                Status
              </dt>
              <dd className="mt-0.5 flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    thread.isRead
                      ? "bg-slate-100 text-slate-700"
                      : "bg-sky-100 text-sky-900"
                  }`}
                >
                  {thread.isRead
                    ? "Read"
                    : `${thread.unreadCount} unread`}
                </span>
                {thread.isUrgent ? (
                  <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-medium text-rose-800">
                    Urgent
                  </span>
                ) : null}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">
                Contact
              </dt>
              <dd className="mt-0.5 text-[#0c1f2e]">
                {thread.partyContact ?? "—"}
                {thread.partyEmail ? (
                  <span className="block text-slate-600">
                    {thread.partyEmail}
                  </span>
                ) : null}
                {thread.partyPhone ? (
                  <span className="block text-slate-600">
                    {thread.partyPhone}
                  </span>
                ) : null}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">
                Latest activity
              </dt>
              <dd className="mt-0.5 text-[#0c1f2e]">
                {formatMessageDateTime(thread.latestAt)}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">
                Property
              </dt>
              <dd className="mt-0.5 text-[#0c1f2e]">
                {thread.propertyName ?? "—"}
              </dd>
            </div>
            {thread.channel === "tenant" ? (
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">
                  Suite / unit
                </dt>
                <dd className="mt-0.5 text-[#0c1f2e]">
                  {thread.unitCode ?? "—"}
                </dd>
              </div>
            ) : null}
          </dl>

          <div className="flex flex-wrap gap-2">
            <ThreadReadToggle
              thread={thread}
              pending={pending}
              startTransition={startTransition}
            />
            {thread.channel === "tenant" ? (
              <Link
                href="/admin/leases"
                className="rounded border border-slate-300 px-3 py-1.5 text-xs font-medium text-[#0c1f2e] hover:bg-slate-50"
              >
                View Tenant
              </Link>
            ) : (
              <Link
                href="/admin/owners"
                className="rounded border border-slate-300 px-3 py-1.5 text-xs font-medium text-[#0c1f2e] hover:bg-slate-50"
              >
                View Owners
              </Link>
            )}
            {thread.propertyId ? (
              <Link
                href={`/admin/properties/${thread.propertyId}`}
                className="rounded border border-slate-300 px-3 py-1.5 text-xs font-medium text-[#0c1f2e] hover:bg-slate-50"
              >
                View Property
              </Link>
            ) : null}
            {thread.channel === "tenant" && thread.leaseId ? (
              <Link
                href="/admin/leases"
                className="rounded border border-slate-300 px-3 py-1.5 text-xs font-medium text-[#0c1f2e] hover:bg-slate-50"
              >
                Related lease {thread.leaseNumber}
              </Link>
            ) : null}
            {thread.channel === "tenant" ? (
              thread.relatedRequestId ? (
                <Link
                  href="/admin/work-orders"
                  className="rounded border border-slate-300 px-3 py-1.5 text-xs font-medium text-[#0c1f2e] hover:bg-slate-50"
                >
                  View maintenance: {thread.relatedRequestTitle}
                </Link>
              ) : (
                <Link
                  href="/admin/work-orders"
                  className="rounded border border-slate-300 px-3 py-1.5 text-xs font-medium text-[#0c1f2e] hover:bg-slate-50"
                >
                  Work Orders
                </Link>
              )
            ) : null}
          </div>

          <div>
            <p className="mb-3 text-xs uppercase tracking-wide text-slate-500">
              Message thread ({thread.messageCount})
            </p>
            <ul className="space-y-4">
              {thread.messages.map((message) => {
                const fromParty = message.senderRole === partyRole;
                return (
                  <li
                    key={message.id}
                    className={`flex flex-col ${fromParty ? "items-start" : "items-end"}`}
                  >
                    <p className="mb-1 text-xs text-slate-500">
                      {formatMessageDateTime(message.createdAt)}
                    </p>
                    <div
                      className={`max-w-[92%] rounded-lg px-3 py-2 ${
                        fromParty
                          ? "border border-slate-200 bg-white text-slate-800"
                          : "bg-[#0c1f2e] text-[#f3efe6]"
                      }`}
                    >
                      <p
                        className={`text-xs font-medium ${
                          fromParty ? "text-slate-500" : "text-slate-300"
                        }`}
                      >
                        {roleLabel(message.senderRole)} · {message.senderName}
                        {fromParty && !message.isRead ? " · Unread" : ""}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-sm">
                        {message.body}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          <Card title="Reply">
            <form
              className="space-y-3"
              action={(fd) => {
                startTransition(async () => {
                  await replyAdminManagerMessage(fd);
                  setReply("");
                  onClose();
                });
              }}
            >
              <input type="hidden" name="channel" value={thread.channel} />
              <input type="hidden" name="party_id" value={thread.partyId} />
              <label htmlFor="admin-reply-body" className="sr-only">
                Reply
              </label>
              <textarea
                id="admin-reply-body"
                name="body"
                required
                rows={4}
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder={
                  thread.channel === "owner"
                    ? "Reply to this property owner…"
                    : "Reply in the Contact Management thread…"
                }
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
              />
              <button
                type="submit"
                disabled={pending || !reply.trim()}
                className="rounded bg-[#0c1f2e] px-4 py-2 text-sm text-white hover:bg-[#163247] disabled:opacity-60"
              >
                Send reply
              </button>
            </form>
          </Card>
        </div>
      </aside>
    </div>
  );
}

export function AdminMessagesInbox({
  threads,
  channel,
  title = "Inbox",
  emptyLabel = "No conversations match this view.",
  searchPlaceholder = "Search name, property, subject, or message…",
}: {
  threads: AdminConversationThread[];
  channel: AdminMessageChannel;
  title?: string;
  emptyLabel?: string;
  searchPlaceholder?: string;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<AdminInboxFilter>("all");
  const [selectedPartyId, setSelectedPartyId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const channelThreads = useMemo(
    () => threads.filter((t) => t.channel === channel),
    [threads, channel]
  );

  const visible = useMemo(
    () => filterAdminConversationThreads(channelThreads, filter, query),
    [channelThreads, filter, query]
  );

  const selected =
    selectedPartyId == null
      ? null
      : (channelThreads.find((t) => t.partyId === selectedPartyId) ?? null);

  return (
    <>
      {selected ? (
        <ConversationDrawer
          thread={selected}
          onClose={() => setSelectedPartyId(null)}
        />
      ) : null}

      <Card title={title}>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="block flex-1 text-sm">
            <span className="sr-only">Search conversations</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full rounded border border-slate-300 px-3 py-2"
            />
          </label>
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={`rounded px-3 py-1.5 text-xs font-medium transition ${
                  filter === f.id
                    ? "bg-[#0c1f2e] text-white"
                    : "border border-slate-300 text-slate-700 hover:bg-slate-50"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {visible.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-500">
            {emptyLabel}
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {visible.map((thread) => (
              <li
                key={`${thread.channel}:${thread.partyId}`}
                className={`flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between ${
                  thread.isRead
                    ? "bg-transparent"
                    : "border-l-4 border-l-[#c4784a] bg-[#c4784a]/5 pl-3 -ml-1"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {!thread.isRead ? (
                      <span
                        aria-hidden
                        className="inline-block h-2 w-2 rounded-full bg-[#c4784a]"
                      />
                    ) : null}
                    <p
                      className={`truncate text-[#0c1f2e] ${
                        thread.isRead ? "font-medium" : "font-semibold"
                      }`}
                    >
                      {thread.partyName}
                    </p>
                    {thread.isUrgent ? (
                      <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-medium text-rose-800">
                        Urgent
                      </span>
                    ) : null}
                    <span className="text-xs text-slate-500">
                      {thread.isRead
                        ? "Read"
                        : `${thread.unreadCount} unread`}
                    </span>
                    <span className="text-xs text-slate-400">
                      {thread.messageCount === 1
                        ? "1 message"
                        : `${thread.messageCount} messages`}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm text-slate-600">
                    {thread.channel === "tenant"
                      ? [thread.propertyName, thread.unitCode]
                          .filter(Boolean)
                          .join(" · ") || "No active lease linked"
                      : thread.propertyName || "No properties linked"}
                  </p>
                  <p
                    className={`mt-1 text-sm ${
                      thread.isRead
                        ? "text-slate-700"
                        : "font-medium text-[#0c1f2e]"
                    }`}
                  >
                    {thread.subject}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-sm text-slate-500">
                    {thread.preview}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {formatMessageDateTime(thread.latestAt)}
                  </p>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <ThreadReadToggle
                    thread={thread}
                    pending={pending}
                    startTransition={startTransition}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPartyId(thread.partyId);
                      if (!thread.isRead) {
                        const fd = new FormData();
                        fd.set("channel", thread.channel);
                        fd.set("party_id", thread.partyId);
                        startTransition(async () => {
                          await markAdminThreadRead(fd);
                        });
                      }
                    }}
                    className="rounded bg-[#0c1f2e] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#163247]"
                  >
                    View Conversation
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
