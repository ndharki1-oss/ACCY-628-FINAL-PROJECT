import { requireRole } from "@/lib/auth";
import { getLinkedOwnerId } from "@/lib/portal";
import {
  OwnerStatementCards,
  type OwnerStatementCardData,
} from "@/components/owner/statement-cards";
import { OwnerStatementFilters } from "@/components/owner/statement-filters";
import {
  formatPeriodLabel,
  periodKey,
} from "@/lib/statements/fee-components";

export default async function OwnerStatementsPage({
  searchParams,
}: {
  searchParams: Promise<{ property?: string; period?: string }>;
}) {
  const params = await searchParams;
  const selectedProperty = params.property?.trim() || null;
  const selectedPeriod = params.period?.trim() || null;

  const { supabase, user } = await requireRole(["owner"]);
  const { ownerId, error: ownerError } = await getLinkedOwnerId(supabase, user);

  const { data: statements, error } = ownerId
    ? await supabase
        .from("owner_statements")
        .select(
          "id, property_id, statement_number, period_start, period_end, status, total_collections, total_expenses, management_fee, remittance_due, properties(name), owner_statement_lines(line_type, description, amount)"
        )
        .eq("owner_id", ownerId)
        .order("period_end", { ascending: false })
    : { data: [], error: ownerError ? { message: ownerError } : null };

  const allCards: OwnerStatementCardData[] = (statements ?? []).map((s, idx, arr) => {
    const prop = Array.isArray(s.properties) ? s.properties[0] : s.properties;
    const lines =
      (s.owner_statement_lines as {
        line_type: string;
        description: string;
        amount: number;
      }[]) ?? [];
    const projectFee = lines
      .filter((l) => l.line_type === "project_fee")
      .reduce((sum, l) => sum + Number(l.amount), 0);

    // Statements are ordered period_end desc; prior for same property is the next older one
    const priorSameProperty = arr
      .slice(idx + 1)
      .find((other) => other.property_id === s.property_id);

    return {
      id: s.id,
      property_id: s.property_id,
      statement_number: s.statement_number,
      period_start: s.period_start,
      period_end: s.period_end,
      status: s.status,
      total_collections: s.total_collections,
      total_expenses: s.total_expenses,
      management_fee: s.management_fee,
      remittance_due: s.remittance_due,
      propertyName: prop?.name ?? null,
      projectFee,
      lines,
      beginningBalance: priorSameProperty
        ? Number(priorSameProperty.remittance_due)
        : 0,
    };
  });

  const propertyOptions = Array.from(
    new Map(
      allCards
        .filter((c) => c.property_id)
        .map((c) => [
          c.property_id,
          {
            id: c.property_id,
            name: c.propertyName ?? "Property",
          },
        ])
    ).values()
  ).sort((a, b) => a.name.localeCompare(b.name));

  const periods = Array.from(
    new Set(allCards.map((c) => periodKey(c.period_end)).filter(Boolean))
  ).sort((a, b) => b.localeCompare(a));

  const propertyOk =
    !selectedProperty ||
    propertyOptions.some((p) => p.id === selectedProperty);
  const periodOk = !selectedPeriod || periods.includes(selectedPeriod);

  const filteredCards = allCards.filter((c) => {
    if (selectedProperty && propertyOk && c.property_id !== selectedProperty) {
      return false;
    }
    if (selectedPeriod && periodOk && periodKey(c.period_end) !== selectedPeriod) {
      return false;
    }
    if (selectedProperty && !propertyOk) return false;
    if (selectedPeriod && !periodOk) return false;
    return true;
  });

  let emptyMessage = "No statements have been issued yet.";
  if (allCards.length > 0 && filteredCards.length === 0) {
    const propName = propertyOk
      ? propertyOptions.find((p) => p.id === selectedProperty)?.name
      : null;
    const parts: string[] = [];
    if (propName) parts.push(propName);
    if (selectedPeriod && periodOk) parts.push(formatPeriodLabel(selectedPeriod));
    emptyMessage =
      parts.length > 0
        ? `No statements for ${parts.join(" · ")}.`
        : "No statements match these filters.";
  }

  return (
    <div className="space-y-6">
      <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-tight">
        Owner statements & remittances
      </h1>
      {error ? <p className="text-sm text-rose-700">{error.message}</p> : null}
      {!error ? (
        <>
          <OwnerStatementFilters
            properties={propertyOptions}
            periods={periods}
            selectedProperty={propertyOk ? selectedProperty : null}
            selectedPeriod={periodOk ? selectedPeriod : null}
            filteredCount={filteredCards.length}
            totalCount={allCards.length}
          />
          <OwnerStatementCards
            statements={filteredCards}
            emptyMessage={emptyMessage}
          />
        </>
      ) : null}
    </div>
  );
}
