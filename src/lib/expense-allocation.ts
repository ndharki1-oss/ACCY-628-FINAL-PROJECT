export type ExpenseAllocation = "owner" | "company";

export type TaxTreatment =
  | "deductible_repair"
  | "capital_improvement"
  | "operating_recoverable"
  | "company_opex"
  | "pending";

export type ExpenseLine = {
  id: string;
  allocation: ExpenseAllocation;
  date: string;
  propertyName: string | null;
  ownerName: string | null;
  category: string;
  description: string;
  amount: number;
  workOrderNumber: string | null;
  taxTreatment: TaxTreatment;
};

export function taxTreatmentLabel(t: TaxTreatment) {
  switch (t) {
    case "deductible_repair":
      return "Deductible (advisory)";
    case "capital_improvement":
      return "Capitalizable (advisory)";
    case "operating_recoverable":
      return "Operating / recoverable";
    case "company_opex":
      return "Company OpEx";
    default:
      return "Pending review";
  }
}

export function taxTreatmentClass(t: TaxTreatment) {
  switch (t) {
    case "deductible_repair":
      return "bg-emerald-100 text-emerald-800";
    case "capital_improvement":
      return "bg-violet-100 text-violet-800";
    case "operating_recoverable":
      return "bg-sky-100 text-sky-800";
    case "company_opex":
      return "bg-slate-200 text-slate-700";
    default:
      return "bg-amber-100 text-amber-900";
  }
}

/** Demo-only heuristic — not stored, does not affect owner tax/books. */
export function inferTaxTreatment(input: {
  allocation: ExpenseAllocation;
  category: string;
  description: string;
  amount: number;
}): TaxTreatment {
  if (input.allocation === "company") return "company_opex";

  const text = `${input.category} ${input.description}`.toLowerCase();
  if (
    /modernization|replacement|renovate|capital|hvac replacement|roof|elevator|build[- ]?out/.test(
      text
    ) ||
    input.amount >= 10000
  ) {
    return "capital_improvement";
  }
  if (/utilities|cam|insurance|tax|advertising/.test(text)) {
    return "operating_recoverable";
  }
  if (/awaiting|pending|emergency/.test(text)) {
    return "pending";
  }
  return "deductible_repair";
}

export function sumByCategory(lines: ExpenseLine[]) {
  const map = new Map<string, number>();
  for (const line of lines) {
    map.set(line.category, (map.get(line.category) ?? 0) + line.amount);
  }
  return [...map.entries()]
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
}

export function sumByTaxTreatment(lines: ExpenseLine[]) {
  const map = new Map<TaxTreatment, number>();
  for (const line of lines) {
    map.set(line.taxTreatment, (map.get(line.taxTreatment) ?? 0) + line.amount);
  }
  return map;
}
