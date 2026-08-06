import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";

export default async function AdminContractsIndexPage() {
  await requireRole(["admin"]);
  redirect("/admin/contracts/owners");
}
