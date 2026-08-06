"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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

function revalidateAdminMessages() {
  revalidatePath("/admin");
  revalidatePath("/admin/messages");
  revalidatePath("/tenant/contact");
}

export async function markAdminMessageRead(formData: FormData) {
  const messageId = String(formData.get("message_id") ?? "").trim();
  if (!messageId) throw new Error("Message id required.");

  const { supabase } = await requireAdminClient();
  const { error } = await supabase
    .from("tenant_manager_messages")
    .update({ admin_read_at: new Date().toISOString() })
    .eq("id", messageId)
    .eq("sender_role", "tenant");

  if (error) throw new Error(error.message);
  revalidateAdminMessages();
}

export async function markAdminMessageUnread(formData: FormData) {
  const messageId = String(formData.get("message_id") ?? "").trim();
  if (!messageId) throw new Error("Message id required.");

  const { supabase } = await requireAdminClient();
  const { error } = await supabase
    .from("tenant_manager_messages")
    .update({ admin_read_at: null })
    .eq("id", messageId)
    .eq("sender_role", "tenant");

  if (error) throw new Error(error.message);
  revalidateAdminMessages();
}

export async function markAdminThreadRead(formData: FormData) {
  const tenantId = String(formData.get("tenant_id") ?? "").trim();
  if (!tenantId) throw new Error("Tenant id required.");

  const { supabase } = await requireAdminClient();
  const { error } = await supabase
    .from("tenant_manager_messages")
    .update({ admin_read_at: new Date().toISOString() })
    .eq("tenant_id", tenantId)
    .eq("sender_role", "tenant")
    .is("admin_read_at", null);

  if (error) throw new Error(error.message);
  revalidateAdminMessages();
}

export async function markAdminThreadUnread(formData: FormData) {
  const tenantId = String(formData.get("tenant_id") ?? "").trim();
  if (!tenantId) throw new Error("Tenant id required.");

  const { supabase } = await requireAdminClient();
  const { data: latestTenantMessage, error: latestError } = await supabase
    .from("tenant_manager_messages")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("sender_role", "tenant")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestError) throw new Error(latestError.message);
  if (!latestTenantMessage) return;

  const { error } = await supabase
    .from("tenant_manager_messages")
    .update({ admin_read_at: null })
    .eq("id", latestTenantMessage.id);

  if (error) throw new Error(error.message);
  revalidateAdminMessages();
}

export async function replyAdminManagerMessage(formData: FormData) {
  const tenantId = String(formData.get("tenant_id") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();

  if (!tenantId) throw new Error("Tenant is required.");
  if (!body) throw new Error("Please enter a reply.");

  const { supabase, profile } = await requireAdminClient();

  const { error } = await supabase.from("tenant_manager_messages").insert({
    tenant_id: tenantId,
    sender_role: "admin",
    sender_name: profile.full_name || "Harborline management",
    body,
  });

  if (error) throw new Error(error.message);

  await supabase
    .from("tenant_manager_messages")
    .update({ admin_read_at: new Date().toISOString() })
    .eq("tenant_id", tenantId)
    .eq("sender_role", "tenant")
    .is("admin_read_at", null);

  revalidateAdminMessages();
}
