import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getLinkedOwnerId } from "@/lib/portal";
import { buildOwnerStatementPdf } from "@/lib/owner-statements/build-pdf";
import type { OwnerStatementDocumentData } from "@/lib/owner-statements/types";

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ statementId: string }> }
) {
  const { statementId } = await context.params;
  const { supabase, user } = await requireRole(["owner"]);
  const { ownerId } = await getLinkedOwnerId(supabase, user);

  if (!ownerId) {
    return NextResponse.json({ error: "Owner not linked." }, { status: 403 });
  }

  const { data: statement, error } = await supabase
    .from("owner_statements")
    .select(
      "id, statement_number, status, period_start, period_end, total_collections, total_expenses, management_fee, remittance_due, properties(name, address_line1, city, state, postal_code), owners(company_name, contact_name), owner_statement_lines(line_type, description, amount)"
    )
    .eq("id", statementId)
    .eq("owner_id", ownerId)
    .maybeSingle();

  if (error || !statement) {
    return NextResponse.json({ error: "Statement not found." }, { status: 404 });
  }

  const property = firstRelation(statement.properties);
  const owner = firstRelation(statement.owners);
  const lines = (statement.owner_statement_lines ?? []) as {
    line_type: string;
    description: string;
    amount: number | string;
  }[];

  const projectFee = lines
    .filter((l) => l.line_type === "project_fee")
    .reduce((sum, l) => sum + Math.abs(Number(l.amount)), 0);
  const baseManagementFee = lines
    .filter((l) => l.line_type === "management_fee")
    .reduce((sum, l) => sum + Math.abs(Number(l.amount)), 0);

  const address =
    property &&
    [property.address_line1, property.city, property.state, property.postal_code]
      .filter(Boolean)
      .join(", ");

  const templateData: OwnerStatementDocumentData = {
    statementId: statement.id,
    statementNumber: statement.statement_number,
    status: statement.status,
    periodStart: statement.period_start,
    periodEnd: statement.period_end,
    propertyName: property?.name ?? "Property",
    propertyAddress: address || null,
    ownerName:
      owner?.company_name ?? owner?.contact_name ?? "Owner",
    totalCollections: Number(statement.total_collections),
    totalExpenses: Math.abs(Number(statement.total_expenses)),
    projectFee,
    managementFee: baseManagementFee,
    remittanceDue: Number(statement.remittance_due),
    lines: lines.map((line) => ({
      lineType: line.line_type,
      description: line.description ?? "",
      amount: Number(line.amount),
    })),
  };

  const bytes = await buildOwnerStatementPdf(templateData);
  const filename = `${statement.statement_number}-Owner-Statement.pdf`;
  const wantsDownload =
    new URL(request.url).searchParams.get("download") === "1";

  return new NextResponse(Buffer.from(bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": wantsDownload
        ? `attachment; filename="${filename}"`
        : `inline; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
