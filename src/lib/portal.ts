import type { User } from "@supabase/supabase-js";
import type { createClient } from "@/lib/supabase/server";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

export async function getLinkedOwnerId(supabase: ServerClient, user: User) {
  const { data, error } = await supabase
    .from("owners")
    .select("id, company_name")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (error) {
    return { ownerId: null as string | null, owner: null, error: error.message };
  }

  return {
    ownerId: data?.id ?? null,
    owner: data,
    error: data ? null : "This login is not linked to an owner record.",
  };
}

export async function getLinkedTenantId(supabase: ServerClient, user: User) {
  const { data, error } = await supabase
    .from("tenants")
    .select("id, company_name, email, phone")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (error) {
    return { tenantId: null as string | null, tenant: null, error: error.message };
  }

  return {
    tenantId: data?.id ?? null,
    tenant: data,
    error: data ? null : "This login is not linked to a tenant record.",
  };
}

export async function getLinkedVendorId(supabase: ServerClient, user: User) {
  const { data, error } = await supabase
    .from("vendors")
    .select("id, company_name")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (error) {
    return { vendorId: null as string | null, vendor: null, error: error.message };
  }

  return {
    vendorId: data?.id ?? null,
    vendor: data,
    error: data ? null : "This login is not linked to a vendor record.",
  };
}
