import { redirect } from "next/navigation";

/** Accounting moved to the accounting-department portal. */
export default function AdminAccountingRedirect() {
  redirect("/admin");
}
