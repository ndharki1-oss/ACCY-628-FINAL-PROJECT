import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { buildLeaseTemplatePdf } from "@/lib/lease-templates/build-pdf";
import { loadLeaseTemplateData } from "@/lib/lease-templates/load";

export async function GET(
  request: Request,
  context: { params: Promise<{ leaseId: string }> }
) {
  const { leaseId } = await context.params;
  const { supabase } = await requireRole(["admin"]);
  const data = await loadLeaseTemplateData(supabase, leaseId);

  if (!data) {
    return NextResponse.json({ error: "Lease not found." }, { status: 404 });
  }

  const bytes = await buildLeaseTemplatePdf(data);
  const filename = `${data.leaseNumber}-Lease.pdf`;
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
