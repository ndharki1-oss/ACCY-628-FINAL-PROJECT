import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getLinkedOwnerId } from "@/lib/portal";
import { buildManagementAgreementPdf } from "@/lib/management-agreements/build-pdf";
import { loadManagementAgreementTemplateData } from "@/lib/management-agreements/load";

export async function GET(
  request: Request,
  context: { params: Promise<{ agreementId: string }> }
) {
  const { agreementId } = await context.params;
  const { supabase, user } = await requireRole(["owner"]);
  const { ownerId } = await getLinkedOwnerId(supabase, user);

  if (!ownerId) {
    return NextResponse.json({ error: "Owner not linked." }, { status: 403 });
  }

  const templateData = await loadManagementAgreementTemplateData(
    supabase,
    agreementId,
    { ownerId }
  );

  if (!templateData) {
    return NextResponse.json(
      { error: "Management agreement not found." },
      { status: 404 }
    );
  }

  const bytes = await buildManagementAgreementPdf(templateData);
  const safeName = templateData.propertyName
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/^-|-$/g, "");
  const filename = `${safeName || "Property"}-Management-Agreement.pdf`;
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
