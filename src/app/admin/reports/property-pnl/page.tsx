import { redirect } from "next/navigation";

/** Combined under Admin → Profitability. Charts live on the Admin Dashboard. */
export default function AdminPropertyPnLPage() {
  redirect("/admin/profitability");
}
