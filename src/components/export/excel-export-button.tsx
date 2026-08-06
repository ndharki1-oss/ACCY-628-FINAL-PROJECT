"use client";

const buttonClass =
  "rounded border border-emerald-700 bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white transition hover:border-emerald-800 hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50";

const compactClass =
  "rounded border border-emerald-700 bg-emerald-700 px-2.5 py-1 text-xs font-medium text-white transition hover:border-emerald-800 hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50";

export function ExcelExportButton({
  count,
  disabled,
  onClick,
  compact = false,
  label,
}: {
  count?: number;
  disabled?: boolean;
  onClick: () => void;
  /** Compact row action style (e.g. beside per-statement PDF). */
  compact?: boolean;
  label?: string;
}) {
  const text =
    label ??
    (compact
      ? "Excel"
      : count != null
        ? `Export to Excel (${count})`
        : "Export to Excel");

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={compact ? compactClass : buttonClass}
    >
      {text}
    </button>
  );
}
