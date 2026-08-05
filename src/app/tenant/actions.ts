"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createTenantRequest(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const serviceType = String(formData.get("service_type") ?? "").trim();
  const recurringRaw = String(formData.get("recurring_issue") ?? "no");
  const description = String(formData.get("description") ?? "").trim();
  const requestDate = String(formData.get("request_date") ?? "").trim();
  const notifyEmail = formData.get("notify_email") === "on";
  const notifySms = formData.get("notify_sms") === "on";

  if (!title || !serviceType || !description || !requestDate) {
    throw new Error("Please complete all required fields.");
  }

  if (!notifyEmail && !notifySms) {
    throw new Error("Choose email and/or text message to receive a copy.");
  }

  const recurringIssue =
    recurringRaw === "yes" || recurringRaw === "true" || recurringRaw === "on";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("You must be signed in.");

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, email, phone")
    .eq("profile_id", user.id)
    .single();
  if (!tenant) throw new Error("Tenant profile not found.");

  if (notifyEmail && !tenant.email) {
    throw new Error("No email is on file for your tenant account.");
  }
  if (notifySms && !tenant.phone) {
    throw new Error("No phone number is on file for your tenant account.");
  }

  const { data: lease } = await supabase
    .from("leases")
    .select("id, property_id")
    .eq("tenant_id", tenant.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("tenant_requests").insert({
    tenant_id: tenant.id,
    lease_id: lease?.id,
    property_id: lease?.property_id,
    title,
    description,
    service_type: serviceType,
    recurring_issue: recurringIssue,
    request_date: requestDate,
  });
  if (error) throw new Error(error.message);

  // Simulated delivery for coursework demo (no real email/SMS provider configured).
  const channels: string[] = [];
  if (notifyEmail) channels.push("email");
  if (notifySms) channels.push("sms");

  revalidatePath("/tenant/requests");
  revalidatePath("/tenant");
  revalidatePath("/admin/work-orders");
  revalidatePath("/employee/work-orders");
  redirect(
    `/tenant/requests?submitted=1&via=${encodeURIComponent(channels.join(","))}`
  );
}

export async function cancelTenantRequest(formData: FormData) {
  const requestId = String(formData.get("request_id") ?? "").trim();
  if (!requestId) throw new Error("Missing request id.");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("You must be signed in.");

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id")
    .eq("profile_id", user.id)
    .single();
  if (!tenant) throw new Error("Tenant profile not found.");

  const { data: existing, error: existingError } = await supabase
    .from("tenant_requests")
    .select("id, status")
    .eq("id", requestId)
    .eq("tenant_id", tenant.id)
    .single();
  if (existingError || !existing) {
    throw new Error("Request not found.");
  }

  const active = new Set(["open", "in_review", "in_progress", "assigned"]);
  if (!active.has(existing.status)) {
    throw new Error("Only open requests can be canceled.");
  }

  const { error } = await supabase
    .from("tenant_requests")
    .update({ status: "canceled" })
    .eq("id", requestId)
    .eq("tenant_id", tenant.id);
  if (error) throw new Error(error.message);

  revalidatePath("/tenant/requests");
  revalidatePath("/tenant");
  revalidatePath("/admin/work-orders");
  revalidatePath("/employee/work-orders");
}

export async function sendTenantManagerMessage(formData: FormData) {
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

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, contact_name")
    .eq("profile_id", user.id)
    .maybeSingle();
  if (!tenant) throw new Error("Tenant profile not found.");

  const { error } = await supabase.from("tenant_manager_messages").insert({
    tenant_id: tenant.id,
    sender_role: "tenant",
    sender_name: profile?.full_name ?? tenant.contact_name ?? "Tenant",
    body,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/tenant/contact");
}
