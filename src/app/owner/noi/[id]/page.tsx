import { redirect } from "next/navigation";
import { parseNoiRange } from "@/lib/owner/noi-period";

/** Old property NOI URLs redirect into the merged `/owner/noi` page. */
export default async function OwnerNoiPropertyRedirect({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ range?: string }>;
}) {
  const { id } = await params;
  const range = parseNoiRange((await searchParams).range);
  const qs = new URLSearchParams();
  qs.set("property", id);
  if (range !== "month") qs.set("range", range);
  redirect(`/owner/noi?${qs.toString()}`);
}
