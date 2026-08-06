"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function sendOwnerManagerMessage(formData: FormData) {
  const body = String(formData.get("body") ?? "").trim();
  if (!body) throw new Error("Please enter a message.");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("You must be signed in.");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  const { data: owner } = await supabase
    .from("owners")
    .select("id, contact_name")
    .eq("profile_id", user.id)
    .maybeSingle();
  if (!owner) throw new Error("Owner profile not found.");

  const { error } = await supabase.from("owner_manager_messages").insert({
    owner_id: owner.id,
    sender_role: "owner",
    sender_name: profile?.full_name ?? owner.contact_name ?? "Owner",
    body,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/owner/contact");
  revalidatePath("/admin/messages");
  revalidatePath("/admin");
}

export async function deleteOwnerManagerMessages(formData: FormData) {
  const messageIds = formData
    .getAll("message_id")
    .map((v) => String(v).trim())
    .filter(Boolean);
  if (messageIds.length === 0) throw new Error("No messages selected.");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("You must be signed in.");

  const { data: owner } = await supabase
    .from("owners")
    .select("id")
    .eq("profile_id", user.id)
    .maybeSingle();
  if (!owner) throw new Error("Owner profile not found.");

  const { error } = await supabase
    .from("owner_manager_messages")
    .delete()
    .in("id", messageIds)
    .eq("owner_id", owner.id)
    .eq("sender_role", "owner");
  if (error) throw new Error(error.message);

  revalidatePath("/owner/contact");
}
