import type { SupabaseClient } from "@supabase/supabase-js";

/** Resolve property IDs owned by the signed-in owner profile. */
export async function ownerPropertyIds(
  supabase: SupabaseClient,
  userId: string
): Promise<string[]> {
  const { data: owner } = await supabase
    .from("owners")
    .select("id")
    .eq("profile_id", userId)
    .maybeSingle();
  if (!owner?.id) return [];
  const { data: properties } = await supabase
    .from("properties")
    .select("id")
    .eq("owner_id", owner.id);
  return (properties ?? []).map((p) => p.id);
}
