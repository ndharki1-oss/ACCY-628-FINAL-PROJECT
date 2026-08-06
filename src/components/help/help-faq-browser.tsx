"use client";

import { useMemo, useState } from "react";
import {
  FAQ_CATEGORY_LABELS,
  faqCategoryCounts,
  type FaqArticle,
  type FaqCategoryId,
} from "@/lib/help/faq-data";

const PAGE_SIZE = 10;

const POPULAR = ["NOI", "Remittance", "Fee", "Approval", "Invoice", "Work order"];

export function HelpFaqBrowser({
  articles,
  roleLabel,
}: {
  articles: FaqArticle[];
  roleLabel: string;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<FaqCategoryId | "all">("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  const counts = useMemo(() => faqCategoryCounts(articles), [articles]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return articles.filter((a) => {
      if (category !== "all" && a.category !== category) return false;
      if (!q) return true;
      const hay = [
        a.question,
        a.answer ?? "",
        ...(a.keywords ?? []),
        FAQ_CATEGORY_LABELS[a.category],
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [articles, category, query]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const slice = filtered.slice(
    safePage * PAGE_SIZE,
    safePage * PAGE_SIZE + PAGE_SIZE
  );

  const answeredCount = articles.filter((a) => a.answer?.trim()).length;

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-slate-200 bg-white/90 p-4 shadow-sm">
        <label htmlFor="help-search" className="text-sm font-medium text-[#0c1f2e]">
          Search {roleLabel} help
        </label>
        <input
          id="help-search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(0);
          }}
          placeholder="Search articles (e.g. NOI, remittance, approval)…"
          className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-[#c4784a] focus:outline-none focus:ring-1 focus:ring-[#c4784a]"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          {POPULAR.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => {
                setQuery(chip);
                setPage(0);
              }}
              className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 hover:border-[#c4784a]/50 hover:bg-[#f7eee6]"
            >
              {chip}
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-500">
          {articles.length} articles in library · {answeredCount} with full
          answers · others open with next-step guidance
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <CategoryChip
          label={`All (${articles.length})`}
          active={category === "all"}
          onClick={() => {
            setCategory("all");
            setPage(0);
          }}
        />
        {(Object.keys(FAQ_CATEGORY_LABELS) as FaqCategoryId[]).map((id) => {
          const n = counts[id] ?? 0;
          if (!n) return null;
          return (
            <CategoryChip
              key={id}
              label={`${FAQ_CATEGORY_LABELS[id]} (${n})`}
              active={category === id}
              onClick={() => {
                setCategory(id);
                setPage(0);
              }}
            />
          );
        })}
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white/90 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-2.5 text-xs text-slate-500">
          <span>
            Showing {filtered.length === 0 ? 0 : safePage * PAGE_SIZE + 1}–
            {Math.min((safePage + 1) * PAGE_SIZE, filtered.length)} of{" "}
            {filtered.length}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={safePage <= 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="rounded border border-slate-200 px-2 py-1 disabled:opacity-40"
            >
              Prev
            </button>
            <button
              type="button"
              disabled={safePage >= pageCount - 1}
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              className="rounded border border-slate-200 px-2 py-1 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>

        {slice.length === 0 ? (
          <p className="px-4 py-8 text-sm text-slate-600">
            No matching articles. Try Remittance, NOI, Approvals, or clear
            search.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {slice.map((a) => {
              const open = openId === a.id;
              const hasAnswer = Boolean(a.answer?.trim());
              return (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => setOpenId(open ? null : a.id)}
                    className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50/80"
                    aria-expanded={open}
                  >
                    <span>
                      <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        {FAQ_CATEGORY_LABELS[a.category]}
                        {!hasAnswer ? " · Expanding knowledge base" : ""}
                      </span>
                      <span className="mt-0.5 block text-sm font-medium text-[#0c1f2e]">
                        {a.question}
                      </span>
                    </span>
                    <span className="shrink-0 text-slate-400" aria-hidden>
                      {open ? "−" : "+"}
                    </span>
                  </button>
                  {open ? (
                    <div className="border-t border-slate-50 bg-slate-50/60 px-4 py-3 text-sm leading-relaxed text-slate-700">
                      {hasAnswer ? (
                        a.answer
                      ) : (
                        <p>
                          This topic is in Harborline’s help library and will be
                          expanded soon. For a business decision on this item,
                          message Harborline management from Contact / Messages
                          in your portal.
                        </p>
                      )}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function CategoryChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs font-medium transition ${
        active
          ? "bg-[#0c1f2e] text-white"
          : "border border-slate-200 bg-white text-slate-700 hover:border-slate-300"
      }`}
    >
      {label}
    </button>
  );
}
