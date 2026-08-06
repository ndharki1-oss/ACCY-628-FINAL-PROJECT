import { requireRole } from "@/lib/auth";
import { Card } from "@/components/ui";
import { sendTenantManagerMessage } from "@/app/tenant/actions";
import { ContactConversation } from "./contact-conversation";

export default async function TenantContactPage() {
  const { supabase, user, profile } = await requireRole(["tenant"]);

  const { data: tenantRow } = await supabase
    .from("tenants")
    .select("id")
    .eq("profile_id", user.id)
    .maybeSingle();
  const tenantId =
    tenantRow?.id ??
    (await supabase.from("tenants").select("id").limit(1).single()).data?.id;

  const { data: messages } = await supabase
    .from("tenant_manager_messages")
    .select("id, sender_role, sender_name, body, created_at")
    .eq("tenant_id", tenantId!)
    .order("created_at", { ascending: true });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl">
          Contact Management
        </h1>
        <p className="text-slate-600">
          Message chain between you and Harborline managers.
        </p>
      </div>

      <ContactConversation messages={messages ?? []} />

      <Card title="Send a message">
        <form action={sendTenantManagerMessage} className="space-y-3 text-sm">
          <label htmlFor="contact-body" className="sr-only">
            Message
          </label>
          <textarea
            id="contact-body"
            name="body"
            required
            rows={4}
            placeholder={`Write to Harborline management${profile.full_name ? ` as ${profile.full_name}` : ""}…`}
            className="w-full rounded border border-slate-300 px-3 py-2"
          />
          <button
            type="submit"
            className="rounded bg-[#0c1f2e] px-4 py-2 text-white"
          >
            Send message
          </button>
        </form>
      </Card>
    </div>
  );
}
