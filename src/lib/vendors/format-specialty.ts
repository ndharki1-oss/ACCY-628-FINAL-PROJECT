/** Display helper for employee portal specialty labels. */
export function formatSpecialtyLabel(raw: string | null | undefined): string {
  if (!raw || !raw.trim()) return "—";
  const trimmed = raw.trim();
  const lower = trimmed.toLowerCase();

  const known: Record<string, string> = {
    hvac: "HVAC",
    plumbing: "Plumbing",
    electrical: "Electrical",
    "pest control": "Pest Control",
    "general maintenance": "General Maintenance",
  };
  if (known[lower]) return known[lower];

  return trimmed
    .split(/\s+/)
    .map((word) =>
      word.length === 0
        ? word
        : word[0].toUpperCase() + word.slice(1).toLowerCase()
    )
    .join(" ");
}
