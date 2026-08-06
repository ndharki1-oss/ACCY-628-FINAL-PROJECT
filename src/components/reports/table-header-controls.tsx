"use client";

export const headerFilterClass =
  "mt-1 w-full max-w-[9.5rem] rounded border border-slate-300 bg-white px-1.5 py-1 text-[11px] font-normal normal-case tracking-normal text-[#0c1f2e] outline-none ring-[#c4784a] focus:ring-1";

export type SortDirection = "none" | "asc" | "desc";

export function SortSelect({
  value,
  onChange,
  label,
}: {
  value: SortDirection;
  onChange: (value: SortDirection) => void;
  label: string;
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value as SortDirection)}
      className={headerFilterClass}
    >
      <option value="none">Sort</option>
      <option value="asc">Ascending</option>
      <option value="desc">Descending</option>
    </select>
  );
}

export function ValueFilterSelect({
  value,
  onChange,
  label,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  options: string[];
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={headerFilterClass}
    >
      <option value="all">All</option>
      {options.map((name) => (
        <option key={name} value={name}>
          {name}
        </option>
      ))}
    </select>
  );
}
