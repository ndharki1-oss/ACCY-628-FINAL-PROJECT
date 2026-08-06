import type { SupabaseClient } from "@supabase/supabase-js";

/** Posts into owner ↔ Harborline Contact / Admin Messages (no schema change). */
export async function notifyManagerOfOwnerWorkOrderDecision(
  supabase: SupabaseClient,
  input: {
    userId: string;
    propertyId: string;
    decision: "approve" | "reject";
    woNumber: string;
    title: string;
    propertyName: string;
    reason?: string;
  }
) {
  const { data: property } = await supabase
    .from("properties")
    .select("owner_id")
    .eq("id", input.propertyId)
    .maybeSingle();
  if (!property?.owner_id) return;

  const [{ data: profile }, { data: owner }] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name")
      .eq("id", input.userId)
      .maybeSingle(),
    supabase
      .from("owners")
      .select("contact_name")
      .eq("id", property.owner_id)
      .maybeSingle(),
  ]);

  const senderName =
    profile?.full_name?.trim() ||
    owner?.contact_name?.trim() ||
    "Owner";

  const decisionLabel =
    input.decision === "approve" ? "approved" : "rejected";
  const lines = [
    `Work order ${input.woNumber} ${decisionLabel}.`,
    `Property: ${input.propertyName}`,
    `Title: ${input.title}`,
  ];
  if (input.decision === "reject") {
    const reason = input.reason?.trim();
    lines.push(
      reason
        ? `Rejection reason: ${reason}`
        : "Rejection reason: (none provided)"
    );
    lines.push(
      "Please review and advise next steps. You can reply in this thread."
    );
  } else {
    lines.push("Please proceed / coordinate completion as needed.");
  }

  const { error } = await supabase.from("owner_manager_messages").insert({
    owner_id: property.owner_id,
    sender_role: "owner",
    sender_name: senderName,
    body: lines.join("\n"),
  });
  if (error) throw new Error(error.message);
}
