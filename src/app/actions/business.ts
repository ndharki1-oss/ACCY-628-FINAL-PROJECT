"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  feePercentFromCredit,
  managementFeeFromCollection,
} from "@/lib/utils";

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

  const { data: workOrder, error: woLookupError } = await supabase
    .from("work_orders")
    .select("id, property_id")
    .eq("id", id)
    .maybeSingle();
  if (woLookupError) throw new Error(woLookupError.message);

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

  revalidatePath("/owner");
  revalidatePath("/owner/approvals");
  revalidatePath("/owner/properties");
  if (workOrder?.property_id) {
    revalidatePath(`/owner/properties/${workOrder.property_id}`);
  }
  revalidatePath("/admin/work-orders");
}

export async function ownerApproveCost(formData: FormData) {
  const id = String(formData.get("id"));
  const decision = String(formData.get("decision") ?? "approve");
  const reason = String(formData.get("reason") ?? "").trim();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: cost, error: costLookupError } = await supabase
    .from("cost_entries")
    .select("id, amount, property_id")
    .eq("id", id)
    .maybeSingle();
  if (costLookupError) throw new Error(costLookupError.message);
  if (!cost) throw new Error("Cost entry not found");

  if (decision === "deny") {
    const { error } = await supabase.from("approvals").insert({
      entity_type: "cost_entry",
      entity_id: id,
      approver_role: "owner",
      status: "rejected",
      amount: cost.amount,
      notes: reason || "Owner denied expenditure",
      decided_by: user.id,
      decided_at: new Date().toISOString(),
    });
    if (error) throw new Error(error.message);
    await supabase.rpc("write_audit", {
      p_action: "owner_deny_cost",
      p_entity_type: "cost_entry",
      p_entity_id: id,
      p_detail: { reason },
    });
  } else {
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
  }

  revalidatePath("/owner");
  revalidatePath("/owner/approvals");
  revalidatePath("/owner/properties");
  if (cost.property_id) {
    revalidatePath(`/owner/properties/${cost.property_id}`);
  }
}

export async function ownerReviewTenantRequest(formData: FormData) {
  const id = String(formData.get("id"));
  const decision = String(formData.get("decision"));
  const notes = String(formData.get("notes") ?? "").trim();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: request, error: requestLookupError } = await supabase
    .from("tenant_requests")
    .select("id, property_id")
    .eq("id", id)
    .maybeSingle();
  if (requestLookupError) throw new Error(requestLookupError.message);

  const status = decision === "approve" ? "approved" : "declined";
  const { error } = await supabase
    .from("tenant_requests")
    .update({ status })
    .eq("id", id)
    .eq("status", "open");

  if (error) throw new Error(error.message);

  await supabase.rpc("write_audit", {
    p_action:
      decision === "approve" ? "owner_approve_request" : "owner_decline_request",
    p_entity_type: "tenant_request",
    p_entity_id: id,
    p_detail: { notes },
  });

  revalidatePath("/owner");
  revalidatePath("/owner/approvals");
  revalidatePath("/owner/properties");
  if (request?.property_id) {
    revalidatePath(`/owner/properties/${request.property_id}`);
  }
  revalidatePath("/tenant/requests");
}

export async function createTenantPaymentIntent(input: {
  invoiceId: string;
  amount: number;
  method: "ach" | "credit_card" | "debit_card";
}): Promise<
  | { mode: "simulated" }
  | { mode: "stripe"; clientSecret: string; paymentIntentId: string }
  | { mode: "stripe"; clientSecret: null; error: string }
> {
  const { getStripe, isStripeConfigured } = await import(
    "@/lib/payments/stripe"
  );
  if (!isStripeConfigured()) {
    return { mode: "simulated" };
  }

  const stripe = getStripe();
  if (!stripe) {
    return {
      mode: "stripe",
      clientSecret: null,
      error: "Stripe secret key is not configured.",
    };
  }

  const amountCents = Math.round(Number(input.amount) * 100);
  if (!Number.isFinite(amountCents) || amountCents < 50) {
    return {
      mode: "stripe",
      clientSecret: null,
      error: "Amount must be at least $0.50.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { mode: "stripe", clientSecret: null, error: "Not authenticated." };
  }

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id")
    .eq("profile_id", user.id)
    .single();

  const { data: invoice } = await supabase
    .from("invoices")
    .select("id, tenant_id, total, amount_paid")
    .eq("id", input.invoiceId)
    .single();

  if (!invoice || invoice.tenant_id !== tenant?.id) {
    return {
      mode: "stripe",
      clientSecret: null,
      error: "Invoice not found for this tenant.",
    };
  }

  const due = Number(invoice.total) - Number(invoice.amount_paid);
  if (amountCents > Math.round(due * 100) + 1) {
    return {
      mode: "stripe",
      clientSecret: null,
      error: "Amount exceeds balance due.",
    };
  }

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: "usd",
      automatic_payment_methods: { enabled: true },
      metadata: {
        invoice_id: input.invoiceId,
        tenant_id: tenant!.id,
        preferred_method: input.method,
        app: "harborline",
      },
    });

    if (!paymentIntent.client_secret) {
      return {
        mode: "stripe",
        clientSecret: null,
        error: "Stripe did not return a client secret.",
      };
    }

    return {
      mode: "stripe",
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    };
  } catch (err) {
    return {
      mode: "stripe",
      clientSecret: null,
      error:
        err instanceof Error ? err.message : "Could not create PaymentIntent.",
    };
  }
}

export async function tenantPayInvoice(formData: FormData) {
  const invoiceId = String(formData.get("invoice_id"));
  const amount = Number(formData.get("amount"));
  const isAuto = String(formData.get("auto_pay") ?? "") === "true";
  const methodRaw = String(formData.get("payment_method") ?? "ach");
  const method =
    methodRaw === "credit_card" || methodRaw === "debit_card"
      ? methodRaw
      : "ach";
  const processor = String(formData.get("processor") ?? "stripe_test_sim");
  const processorPaymentId = String(
    formData.get("processor_payment_id") ?? ""
  ).trim();
  const processorPaymentMethodId = String(
    formData.get("processor_payment_method_id") ?? ""
  ).trim();
  const cardBrand = String(formData.get("card_brand") ?? "").trim() || null;
  const cardLast4Raw = String(formData.get("card_last4") ?? "").replace(
    /\D/g,
    ""
  );
  // Only accept processor last4 — never a full PAN.
  const last4Safe = cardLast4Raw.length === 4 ? cardLast4Raw : null;

  if (!processorPaymentId || !processorPaymentMethodId) {
    throw new Error(
      "Payment processor token missing. Complete the secure payment step first."
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, credit_rating")
    .eq("profile_id", user!.id)
    .single();

  const { data: invoice } = await supabase
    .from("invoices")
    .select("id, property_id, owner_id, lease_id, tenant_id")
    .eq("id", invoiceId)
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
      method,
      is_auto_pay: isAuto,
      created_by: user!.id,
      processor,
      processor_payment_id: processorPaymentId,
      processor_payment_method_id: processorPaymentMethodId,
      card_brand: cardBrand,
      card_last4: last4Safe,
      reference: `${processor}:${processorPaymentId}`,
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

  // Agency GAAP: rent collection is Due to Owner; fee % from tenant credit (4–12%).
  const credit = tenant?.credit_rating as string | undefined;
  const feePct = feePercentFromCredit(credit);
  const feeAmount = managementFeeFromCollection(amount, credit);

  const { data: accounts } = await supabase
    .from("gl_accounts")
    .select("id, code")
    .in("code", ["2000", "4000"]);
  const ownerPayable = accounts?.find((a) => a.code === "2000")?.id;
  const feeRevenue = accounts?.find((a) => a.code === "4000")?.id;

  if (ownerPayable && feeRevenue && feeAmount > 0) {
    const entryNumber = `JE-FEE-${Date.now()}`;
    const { data: period } = await supabase
      .from("accounting_periods")
      .select("id")
      .eq("year", new Date().getFullYear())
      .eq("month", new Date().getMonth() + 1)
      .maybeSingle();

    const { data: je } = await supabase
      .from("journal_entries")
      .insert({
        entry_number: entryNumber,
        entry_date: new Date().toISOString().slice(0, 10),
        memo: `Management fee ${feePct}% of collection (credit ${credit ?? "BBB"})`,
        source_type: "payment",
        source_id: payment.id,
        period_id: period?.id,
        created_by: user!.id,
      })
      .select("id")
      .single();

    if (je) {
      await supabase.from("journal_lines").insert([
        {
          journal_entry_id: je.id,
          gl_account_id: ownerPayable,
          debit: feeAmount,
          credit: 0,
          property_id: invoice?.property_id,
          owner_id: invoice?.owner_id,
        },
        {
          journal_entry_id: je.id,
          gl_account_id: feeRevenue,
          debit: 0,
          credit: feeAmount,
          property_id: invoice?.property_id,
          owner_id: invoice?.owner_id,
        },
      ]);
    }
  }

  await supabase.rpc("write_audit", {
    p_action: "tenant_payment",
    p_entity_type: "payment",
    p_entity_id: payment.id,
    p_detail: {
      invoiceId,
      amount,
      method,
      processor,
      processor_payment_id: processorPaymentId,
      processor_payment_method_id: processorPaymentMethodId,
      card_brand: cardBrand,
      card_last4: last4Safe,
      agency: true,
      fee_on_collection: true,
      credit_rating: credit,
      management_fee_percent: feePct,
      management_fee_amount: feeAmount,
    },
  });

  revalidatePath("/tenant/invoices");
  revalidatePath("/tenant");
  revalidatePath("/admin/accounting");
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
  const preferredVendor = String(formData.get("preferred_vendor") ?? "").trim();
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
    preferred_vendor: preferredVendor || null,
  });
  revalidatePath("/tenant/requests");
  revalidatePath("/owner");
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
