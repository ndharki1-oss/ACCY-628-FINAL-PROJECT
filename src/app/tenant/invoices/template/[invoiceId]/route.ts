import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getLinkedTenantId } from "@/lib/portal";
import { buildInvoiceDocumentPdf } from "@/lib/invoice-documents/build-pdf";
import type { InvoiceDocumentData } from "@/lib/invoice-documents/types";

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ invoiceId: string }> }
) {
  const { invoiceId } = await context.params;
  const { supabase, user } = await requireRole(["tenant"]);
  const { tenantId } = await getLinkedTenantId(supabase, user);

  if (!tenantId) {
    return NextResponse.json({ error: "Tenant not linked." }, { status: 403 });
  }

  const { data: invoice, error } = await supabase
    .from("invoices")
    .select(
      "id, invoice_number, status, issue_date, due_date, total, amount_paid, dispute_reason, invoice_lines(line_type, description, amount), properties(name, address_line1, city, state, postal_code), tenants(company_name, contact_name, email)"
    )
    .eq("id", invoiceId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (error || !invoice) {
    return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  }

  const property = firstRelation(invoice.properties);
  const tenant = firstRelation(invoice.tenants);
  const lines = (invoice.invoice_lines ?? []) as {
    line_type: string;
    description: string;
    amount: number | string;
  }[];

  const total = Number(invoice.total);
  const amountPaid = Number(invoice.amount_paid);
  const address =
    property &&
    [property.address_line1, property.city, property.state, property.postal_code]
      .filter(Boolean)
      .join(", ");

  const templateData: InvoiceDocumentData = {
    invoiceId: invoice.id,
    invoiceNumber: invoice.invoice_number,
    status: invoice.status,
    issueDate: invoice.issue_date,
    dueDate: invoice.due_date,
    total,
    amountPaid,
    balanceDue: Math.max(total - amountPaid, 0),
    disputeReason: invoice.dispute_reason ?? null,
    propertyName: property?.name ?? "Property",
    propertyAddress: address || null,
    tenantCompany: tenant?.company_name ?? "Tenant",
    tenantContact: tenant?.contact_name ?? null,
    tenantEmail: tenant?.email ?? null,
    lines: lines.map((line) => ({
      description: line.description,
      lineType: line.line_type,
      amount: Number(line.amount),
    })),
  };

  const bytes = await buildInvoiceDocumentPdf(templateData);
  const filename = `${invoice.invoice_number}-Invoice.pdf`;
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
