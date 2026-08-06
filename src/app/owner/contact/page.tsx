import { requireRole } from "@/lib/auth";
import { PageHeading } from "@/components/page-heading";
import { Card } from "@/components/ui";
import { sendOwnerManagerMessage } from "@/app/owner/actions";
import { OwnerContactConversation } from "./contact-conversation";

export default async function OwnerContactPage() {
  const { supabase, user, profile } = await requireRole(["owner"]);

  const { data: ownerRow } = await supabase
    .from("owners")
    .select("id")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (!ownerRow) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl">
            Contact Management
          </h1>
          <p className="text-slate-600">
            Owner profile not linked. Contact Harborline support.
          </p>
        </div>
      </div>
    );
  }

  const { data: messages } = await supabase
    .from("owner_manager_messages")
    .select("id, sender_role, sender_name, body, created_at")
    .eq("owner_id", ownerRow.id)
    .order("created_at", { ascending: true });

  return (
    <div className="space-y-6">
      <PageHeading
        title="Contact Management"
        info="Message chain between you and Harborline property managers."
      />

      <OwnerContactConversation messages={messages ?? []} />

      <Card title="Send a message">
        <form action={sendOwnerManagerMessage} className="space-y-3 text-sm">
          <label htmlFor="owner-contact-body" className="sr-only">
            Message
          </label>
          <textarea
            id="owner-contact-body"
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
