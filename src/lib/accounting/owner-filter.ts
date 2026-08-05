import type { SupabaseClient } from "@supabase/supabase-js";

export type OwnerFilterOption = {
  id: string;
  company_name: string;
};

export async function listOwnersForFilter(
  supabase: SupabaseClient
): Promise<OwnerFilterOption[]> {
  const { data } = await supabase
    .from("owners")
    .select("id, company_name")
    .order("company_name");
  return data ?? [];
}

/** Property IDs for an owner, or undefined when showing all owners. */
export async function propertyIdsForOwnerFilter(
  supabase: SupabaseClient,
  ownerId: string | null
): Promise<string[] | undefined> {
  if (!ownerId) return undefined;
  const { data } = await supabase
    .from("properties")
    .select("id")
    .eq("owner_id", ownerId);
  return (data ?? []).map((p) => p.id);
}

export function resolveSelectedOwnerId(
  param: string | undefined,
  owners: OwnerFilterOption[]
): string | null {
  if (!param || param === "all") return null;
  return owners.some((o) => o.id === param) ? param : null;
}
