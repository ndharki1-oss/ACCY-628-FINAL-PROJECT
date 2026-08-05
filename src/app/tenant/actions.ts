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
  redirect(
    `/tenant/requests?submitted=1&via=${encodeURIComponent(channels.join(","))}`
  );
}
