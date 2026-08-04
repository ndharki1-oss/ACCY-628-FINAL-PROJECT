import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function requireRole(allowed: string[]) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  if (profile.role !== "admin" && !allowed.includes(profile.role)) {
    redirect(`/${profile.role}`);
  }

  return { supabase, user, profile };
}
