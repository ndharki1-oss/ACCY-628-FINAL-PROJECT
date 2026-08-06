import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { buildEmployeeAgreementPdf } from "@/lib/employee-agreements/build-pdf";
import { loadEmployeeAgreementTemplateData } from "@/lib/employee-agreements/load";
import { titleForKind } from "@/lib/employee-agreements/types";

export async function GET(
  request: Request,
  context: { params: Promise<{ vendorId: string }> }
) {
  const { vendorId } = await context.params;
  const { supabase } = await requireRole(["admin"]);
  const data = await loadEmployeeAgreementTemplateData(supabase, vendorId);

  if (!data) {
    return NextResponse.json(
      { error: "Employee agreement not found." },
      { status: 404 }
    );
  }

  const bytes = await buildEmployeeAgreementPdf(data);
  const safeName = data.workerName
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/^-|-$/g, "");
  const kindSlug =
    data.kind === "contractor" ? "Contractor-Agreement" : "Employment-Agreement";
  const filename = `${safeName || "Worker"}-${kindSlug}.pdf`;
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
      "X-Agreement-Type": titleForKind(data.kind),
    },
  });
}
