/** Excel-friendly CSV download helpers (UTF-8 BOM; opens cleanly in Excel). */

export type ExcelCell = string | number | null | undefined;

function escapeCsvCell(value: ExcelCell): string {
  if (value == null) return "";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return "";
    return String(value);
  }
  const text = String(value);
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function buildExcelCsv(
  headers: string[],
  rows: ExcelCell[][]
): string {
  const lines = [
    headers.map(escapeCsvCell).join(","),
    ...rows.map((row) => row.map(escapeCsvCell).join(",")),
  ];
  return `\uFEFF${lines.join("\r\n")}`;
}

export function downloadExcelCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportExcelCsv(input: {
  filename: string;
  headers: string[];
  rows: ExcelCell[][];
}) {
  downloadExcelCsv(input.filename, buildExcelCsv(input.headers, input.rows));
}

export function excelStamp() {
  return new Date().toISOString().slice(0, 10);
}

export function slugForFilename(label: string) {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
