"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function vendorCompleteWorkOrder(formData: FormData) {
  const id = String(formData.get("id"));
  const notes = String(formData.get("notes") ?? "");
  const actualCost = Number(formData.get("actual_cost") ?? 0);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: vendor } = await supabase
    .from("vendors")
    .select("id")
    .eq("profile_id", user.id)
    .single();

  const { error } = await supabase
    .from("work_orders")
    .update({
      status: "pending_owner_approval",
      vendor_notes: notes,
      actual_cost: actualCost,
      completed_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("vendor_id", vendor?.id ?? "");

  if (error) throw new Error(error.message);

  if (actualCost > 0 && vendor) {
    const { data: wo } = await supabase
      .from("work_orders")
      .select("property_id, lease_id, unit_id, title")
      .eq("id", id)
      .single();
    if (wo) {
      const { data: prop } = await supabase
        .from("properties")
        .select("owner_id")
        .eq("id", wo.property_id)
        .single();
      await supabase.from("cost_entries").insert({
        property_id: wo.property_id,
        owner_id: prop?.owner_id,
        unit_id: wo.unit_id,
        lease_id: wo.lease_id,
        work_order_id: id,
        vendor_id: vendor.id,
        category: "vendor",
        description: `WO cost: ${wo.title}`,
        amount: actualCost,
        incurred_date: new Date().toISOString().slice(0, 10),
        owner_approved: false,
        created_by: user.id,
      });
    }
  }

  await supabase.rpc("write_audit", {
    p_action: "vendor_complete_wo",
    p_entity_type: "work_order",
    p_entity_id: id,
    p_detail: { notes, actualCost },
  });

  revalidatePath("/vendor");
  revalidatePath("/owner/approvals");
}

export async function ownerApproveWorkOrder(formData: FormData) {
  const id = String(formData.get("id"));
  const decision = String(formData.get("decision"));
  const reason = String(formData.get("reason") ?? "");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("work_orders")
    .update({
      status: decision === "approve" ? "approved" : "rejected",
      owner_approved_at: decision === "approve" ? new Date().toISOString() : null,
      owner_approved_by: user?.id,
      rejection_reason: decision === "reject" ? reason : null,
    })
    .eq("id", id);

  if (error) throw new Error(error.message);

  if (decision === "approve") {
    await supabase
      .from("cost_entries")
      .update({
        owner_approved: true,
        owner_approved_at: new Date().toISOString(),
      })
      .eq("work_order_id", id);
  }

  await supabase.rpc("write_audit", {
    p_action: decision === "approve" ? "owner_approve_wo" : "owner_reject_wo",
    p_entity_type: "work_order",
    p_entity_id: id,
    p_detail: { reason },
  });

  revalidatePath("/owner/approvals");
  revalidatePath("/admin/work-orders");
}

export async function ownerApproveCost(formData: FormData) {
  const id = String(formData.get("id"));
  const supabase = await createClient();
  const { error } = await supabase
    .from("cost_entries")
    .update({
      owner_approved: true,
      owner_approved_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  await supabase.rpc("write_audit", {
    p_action: "owner_approve_cost",
    p_entity_type: "cost_entry",
    p_entity_id: id,
    p_detail: {},
  });
  revalidatePath("/owner/approvals");
}

export async function tenantPayInvoice(formData: FormData) {
  const invoiceId = String(formData.get("invoice_id"));
  const amount = Number(formData.get("amount"));
  const isAuto = String(formData.get("auto_pay") ?? "") === "true";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id")
    .eq("profile_id", user!.id)
    .single();

  const payNum = `PAY-${Date.now()}`;
  const { data: payment, error: pErr } = await supabase
    .from("payments")
    .insert({
      payment_number: payNum,
      party_type: "tenant",
      tenant_id: tenant!.id,
      payment_date: new Date().toISOString().slice(0, 10),
      amount,
      method: "ach",
      is_auto_pay: isAuto,
      created_by: user!.id,
    })
    .select("id")
    .single();

  if (pErr) throw new Error(pErr.message);

  const { error: aErr } = await supabase.from("payment_applications").insert({
    payment_id: payment.id,
    invoice_id: invoiceId,
    amount,
  });
  if (aErr) throw new Error(aErr.message);

  // Agency GAAP: collection increases owner payable; fee recognized on collection via admin statement process.
  // Record audit for recognition trail.
  await supabase.rpc("write_audit", {
    p_action: "tenant_payment",
    p_entity_type: "payment",
    p_entity_id: payment.id,
    p_detail: { invoiceId, amount, agency: true, fee_on_collection: true },
  });

  revalidatePath("/tenant/invoices");
  revalidatePath("/tenant");
}

export async function toggleAutoPay(formData: FormData) {
  const enabled = String(formData.get("enabled")) === "true";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: tenant } = await supabase
    .from("tenants")
    .select("id")
    .eq("profile_id", user!.id)
    .single();

  const { data: existing } = await supabase
    .from("auto_pay_settings")
    .select("id")
    .eq("tenant_id", tenant!.id)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("auto_pay_settings")
      .update({ enabled, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
  } else {
    await supabase.from("auto_pay_settings").insert({
      tenant_id: tenant!.id,
      enabled,
    });
  }
  revalidatePath("/tenant/invoices");
}

export async function createTenantRequest(formData: FormData) {
  const title = String(formData.get("title"));
  const description = String(formData.get("description") ?? "");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: tenant } = await supabase
    .from("tenants")
    .select("id")
    .eq("profile_id", user!.id)
    .single();
  const { data: lease } = await supabase
    .from("leases")
    .select("id, property_id")
    .eq("tenant_id", tenant!.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  await supabase.from("tenant_requests").insert({
    tenant_id: tenant!.id,
    lease_id: lease?.id,
    property_id: lease?.property_id,
    title,
    description,
  });
  revalidatePath("/tenant/requests");
}

export async function closeAccountingPeriod(formData: FormData) {
  const id = String(formData.get("id"));
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "accounting" && profile?.role !== "admin") {
    throw new Error("Not authorized");
  }

  const { error } = await supabase
    .from("accounting_periods")
    .update({
      status: "closed",
      closed_at: new Date().toISOString(),
      closed_by: user.id,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  await supabase.rpc("write_audit", {
    p_action: "close_period",
    p_entity_type: "accounting_period",
    p_entity_id: id,
    p_detail: {},
  });
  revalidatePath("/accounting");
  revalidatePath("/admin/accounting");
}
