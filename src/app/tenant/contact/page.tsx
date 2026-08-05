import { requireRole } from "@/lib/auth";
import { Card } from "@/components/ui";
import { sendTenantManagerMessage } from "@/app/tenant/actions";

function formatMessageDate(iso: string) {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

function roleLabel(role: string) {
  if (role === "admin") return "Harborline management";
  if (role === "owner") return "Property owner";
  if (role === "tenant") return "You";
  return role;
}

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

      <Card title="Conversation">
        {(messages ?? []).length === 0 ? (
          <p className="text-sm text-slate-600">
            No messages yet. Send a note below to start the conversation.
          </p>
        ) : (
          <ul className="space-y-5">
            {(messages ?? []).map((m) => {
              const fromTenant = m.sender_role === "tenant";
              return (
                <li
                  key={m.id}
                  className={`flex flex-col ${fromTenant ? "items-end" : "items-start"}`}
                >
                  <p className="mb-1 text-xs text-slate-500">
                    {formatMessageDate(m.created_at)}
                  </p>
                  <div
                    className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                      fromTenant
                        ? "bg-[#0c1f2e] text-[#f3efe6]"
                        : "border border-slate-200 bg-slate-50 text-slate-800"
                    }`}
                  >
                    <p
                      className={`text-xs font-medium ${
                        fromTenant ? "text-slate-300" : "text-slate-500"
                      }`}
                    >
                      {roleLabel(m.sender_role)} · {m.sender_name}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap">{m.body}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

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
