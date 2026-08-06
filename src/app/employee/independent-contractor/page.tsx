import { requireRole } from "@/lib/auth";
import { PageHeading } from "@/components/page-heading";
import { Card } from "@/components/ui";
import { formatSpecialtyLabel } from "@/lib/vendors/format-specialty";

export default async function IndependentContractorPage() {
  const { supabase } = await requireRole(["vendor"]);

  const { data: contractors, error } = await supabase
    .from("vendors")
    .select("id, contact_name, company_name, email, phone, specialty")
    .eq("worker_type", "contractor")
    .eq("active", true)
    .order("company_name");

  const chen =
    (contractors ?? []).find((c) =>
      c.company_name.toLowerCase().includes("chen")
    ) ?? (contractors ?? [])[0];

  return (
    <div className="space-y-6">
      <PageHeading
        title="Independent Contractor"
        info="Retained contractor contact for Harborline maintenance support."
      />

      {error ? (
        <p className="text-sm text-rose-700">{error.message}</p>
      ) : null}

      {!error && !chen ? (
        <p className="text-sm text-slate-600">
          No independent contractor on file.
        </p>
      ) : null}

      {chen ? (
        <Card title={chen.company_name}>
          <p className="mb-4 text-sm text-slate-600">
            Independent contractor on retainer with Harborline Commercial
            Management.
          </p>
          <dl className="grid gap-4 sm:grid-cols-2 text-sm">
            <div>
              <dt className="text-xs uppercase tracking-wider text-slate-500">
                Contact
              </dt>
              <dd className="text-slate-800">{chen.contact_name}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wider text-slate-500">
                Specialty
              </dt>
              <dd className="text-slate-800">
                {formatSpecialtyLabel(chen.specialty)}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wider text-slate-500">
                Email
              </dt>
              <dd>
                <a
                  href={`mailto:${chen.email}`}
                  className="text-[#c4784a] hover:underline"
                >
                  {chen.email}
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wider text-slate-500">
                Phone
              </dt>
              <dd className="text-slate-800">{chen.phone || "—"}</dd>
            </div>
          </dl>
        </Card>
      ) : null}
    </div>
  );
}
