import { requireRole } from "@/lib/auth";
import { PageHeading } from "@/components/page-heading";
import { Card } from "@/components/ui";
import { formatSpecialtyLabel } from "@/lib/vendors/format-specialty";

export default async function EmployeeDirectoryPage() {
  const { supabase } = await requireRole(["vendor"]);

  const { data: staff, error } = await supabase
    .from("vendors")
    .select("id, contact_name, company_name, email, phone, specialty")
    .eq("worker_type", "staff")
    .eq("active", true)
    .order("contact_name");

  return (
    <div className="space-y-6">
      <PageHeading
        title="Employee Directory"
        info="Harborline maintenance staff and basic contact information."
      />

      {error ? (
        <p className="text-sm text-rose-700">{error.message}</p>
      ) : null}

      {!error && (staff ?? []).length === 0 ? (
        <p className="text-sm text-slate-600">No Harborline staff listed yet.</p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        {(staff ?? []).map((person) => (
          <Card key={person.id} title={person.contact_name}>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-xs uppercase tracking-wider text-slate-500">
                  Company
                </dt>
                <dd className="text-slate-800">{person.company_name}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wider text-slate-500">
                  Specialty
                </dt>
                <dd className="text-slate-800">
                  {formatSpecialtyLabel(person.specialty)}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wider text-slate-500">
                  Email
                </dt>
                <dd>
                  <a
                    href={`mailto:${person.email}`}
                    className="text-[#c4784a] hover:underline"
                  >
                    {person.email}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wider text-slate-500">
                  Phone
                </dt>
                <dd className="text-slate-800">{person.phone || "—"}</dd>
              </div>
            </dl>
          </Card>
        ))}
      </div>
    </div>
  );
}
