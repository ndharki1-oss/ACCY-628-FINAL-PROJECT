export function ownerDisplayPhone(ownerId: string, stored?: string | null) {
  if (stored?.trim()) return stored.trim();
  const n = [...ownerId].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return `312-555-${String(1100 + (n % 8899)).padStart(4, "0")}`;
}

export function ownerPreferredContact(ownerId: string): "Phone" | "Email" {
  const n = [...ownerId].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return n % 2 === 0 ? "Email" : "Phone";
}
