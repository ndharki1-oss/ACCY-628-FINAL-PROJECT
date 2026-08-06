import { requireRole } from "@/lib/auth";
import { PageHeading } from "@/components/page-heading";
import { Card } from "@/components/ui";
import { sendTenantManagerMessage } from "@/app/tenant/actions";
import { ContactConversation } from "./contact-conversation";

export default async function TenantContactPage({
  searchParams,
}: {
  searchParams: Promise<{ property?: string }>;
}) {
  const params = await searchParams;
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
    .neq("sender_role", "owner")
    .order("created_at", { ascending: true });

  const propertyName = params.property?.trim();
  const draftMessage = propertyName
    ? `I am interested in ${propertyName}.`
    : undefined;

  return (
    <div className="space-y-6">
      <PageHeading
        title="Contact Management"
        info="Message chain between you and Harborline managers."
      />

      <ContactConversation messages={messages ?? []} />

      <Card title="Send a Message">
        <form action={sendTenantManagerMessage} className="space-y-3 text-sm">
          <label htmlFor="contact-body" className="sr-only">
            Message
          </label>
          <textarea
            id="contact-body"
            name="body"
            required
            rows={4}
            defaultValue={draftMessage}
            placeholder={`Write to Harborline Management${profile.full_name ? ` as ${profile.full_name}` : ""}…`}
            className="w-full rounded border border-slate-300 px-3 py-2"
          />
          <button
            type="submit"
            className="rounded bg-[#0c1f2e] px-4 py-2 text-white"
          >
            Send Message
          </button>
        </form>
      </Card>
    </div>
  );
}
