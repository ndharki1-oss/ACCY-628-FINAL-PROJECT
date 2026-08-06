"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { AdminMessageChannel } from "@/lib/admin-messages";

async function requireAdminClient() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("You must be signed in.");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, full_name")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    throw new Error("Admin access required.");
  }

  return { supabase, profile };
}

function parseChannel(formData: FormData): AdminMessageChannel {
  const raw = String(formData.get("channel") ?? "tenant").trim();
  return raw === "owner" ? "owner" : "tenant";
}

function messageTable(channel: AdminMessageChannel) {
  return channel === "owner"
    ? "owner_manager_messages"
    : "tenant_manager_messages";
}

function partyColumn(channel: AdminMessageChannel) {
  return channel === "owner" ? "owner_id" : "tenant_id";
}

function partySenderRole(channel: AdminMessageChannel) {
  return channel === "owner" ? "owner" : "tenant";
}

function revalidateAdminMessages(channel: AdminMessageChannel) {
  revalidatePath("/admin");
  revalidatePath("/admin/messages");
  if (channel === "owner") {
    revalidatePath("/owner/contact");
  } else {
    revalidatePath("/tenant/contact");
  }
}

export async function markAdminMessageRead(formData: FormData) {
  const messageId = String(formData.get("message_id") ?? "").trim();
  if (!messageId) throw new Error("Message id required.");

  const channel = parseChannel(formData);
  const { supabase } = await requireAdminClient();
  const { error } = await supabase
    .from(messageTable(channel))
    .update({ admin_read_at: new Date().toISOString() })
    .eq("id", messageId)
    .eq("sender_role", partySenderRole(channel));

  if (error) throw new Error(error.message);
  revalidateAdminMessages(channel);
}

export async function markAdminMessageUnread(formData: FormData) {
  const messageId = String(formData.get("message_id") ?? "").trim();
  if (!messageId) throw new Error("Message id required.");

  const channel = parseChannel(formData);
  const { supabase } = await requireAdminClient();
  const { error } = await supabase
    .from(messageTable(channel))
    .update({ admin_read_at: null })
    .eq("id", messageId)
    .eq("sender_role", partySenderRole(channel));

  if (error) throw new Error(error.message);
  revalidateAdminMessages(channel);
}

export async function markAdminThreadRead(formData: FormData) {
  const channel = parseChannel(formData);
  const partyId = String(
    formData.get("party_id") ?? formData.get("tenant_id") ?? ""
  ).trim();
  if (!partyId) throw new Error("Conversation id required.");

  const { supabase } = await requireAdminClient();
  const { error } = await supabase
    .from(messageTable(channel))
    .update({ admin_read_at: new Date().toISOString() })
    .eq(partyColumn(channel), partyId)
    .eq("sender_role", partySenderRole(channel))
    .is("admin_read_at", null);

  if (error) throw new Error(error.message);
  revalidateAdminMessages(channel);
}

export async function markAdminThreadUnread(formData: FormData) {
  const channel = parseChannel(formData);
  const partyId = String(
    formData.get("party_id") ?? formData.get("tenant_id") ?? ""
  ).trim();
  if (!partyId) throw new Error("Conversation id required.");

  const { supabase } = await requireAdminClient();
  const { data: latestPartyMessage, error: latestError } = await supabase
    .from(messageTable(channel))
    .select("id")
    .eq(partyColumn(channel), partyId)
    .eq("sender_role", partySenderRole(channel))
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestError) throw new Error(latestError.message);
  if (!latestPartyMessage) return;

  const { error } = await supabase
    .from(messageTable(channel))
    .update({ admin_read_at: null })
    .eq("id", latestPartyMessage.id);

  if (error) throw new Error(error.message);
  revalidateAdminMessages(channel);
}

export async function replyAdminManagerMessage(formData: FormData) {
  const channel = parseChannel(formData);
  const partyId = String(
    formData.get("party_id") ?? formData.get("tenant_id") ?? ""
  ).trim();
  const body = String(formData.get("body") ?? "").trim();

  if (!partyId) throw new Error("Recipient is required.");
  if (!body) throw new Error("Please enter a reply.");

  const { supabase, profile } = await requireAdminClient();
  const senderName = profile.full_name || "Harborline management";

  if (channel === "owner") {
    const { error } = await supabase.from("owner_manager_messages").insert({
      owner_id: partyId,
      sender_role: "admin",
      sender_name: senderName,
      body,
    });
    if (error) throw new Error(error.message);

    await supabase
      .from("owner_manager_messages")
      .update({ admin_read_at: new Date().toISOString() })
      .eq("owner_id", partyId)
      .eq("sender_role", "owner")
      .is("admin_read_at", null);
  } else {
    const { error } = await supabase.from("tenant_manager_messages").insert({
      tenant_id: partyId,
      sender_role: "admin",
      sender_name: senderName,
      body,
    });
    if (error) throw new Error(error.message);

    await supabase
      .from("tenant_manager_messages")
      .update({ admin_read_at: new Date().toISOString() })
      .eq("tenant_id", partyId)
      .eq("sender_role", "tenant")
      .is("admin_read_at", null);
  }

  revalidateAdminMessages(channel);
}
