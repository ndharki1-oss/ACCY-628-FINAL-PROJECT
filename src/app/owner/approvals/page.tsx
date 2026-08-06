import { redirect } from "next/navigation";

/** Approvals moved into My Items. */
export default function OwnerApprovalsRedirect() {
  redirect("/owner/items");
}
