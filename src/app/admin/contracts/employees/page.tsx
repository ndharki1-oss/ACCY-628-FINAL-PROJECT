import { requireRole } from "@/lib/auth";
import { PageHeading } from "@/components/page-heading";
import { Badge, Card } from "@/components/ui";
import { EmployeeAgreementDocumentButton } from "@/app/admin/contracts/employees/employee-agreement-button";
import { loadAdminEmployeeContracts } from "@/lib/employee-agreements/load";
import { titleForKind } from "@/lib/employee-agreements/types";

function formatDate(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

export default async function AdminEmployeeContractsPage() {
  const { supabase } = await requireRole(["admin"]);
  const contracts = await loadAdminEmployeeContracts(supabase);

  const staff = contracts.filter((c) => c.kind === "staff");
  const contractors = contracts.filter((c) => c.kind === "contractor");

  return (
    <div className="space-y-6">
      <PageHeading
        title="Employee Contracts"
        info="Employment agreements for Harborline maintenance staff and independent contractor agreements for retained contractors. Staff hourly rates follow Harborline's specialty-based labor schedule. Contractor rates vary by the type of work performed on each assignment. Engagement dates come from work activity when available."
      />

      {contracts.length === 0 ? (
        <Card title="No employee contracts">
          <p className="text-sm text-slate-600">
            No active Harborline staff or contractors were found.
          </p>
        </Card>
      ) : (
        <>
          <Card
            title="Harborline Staff"
            action={
              <span className="text-xs text-slate-500">
                {staff.length} agreement{staff.length === 1 ? "" : "s"}
              </span>
            }
          >
            {staff.length === 0 ? (
              <p className="text-sm text-slate-600">No staff agreements.</p>
            ) : (
              <WorkerTable rows={staff} />
            )}
          </Card>

          <Card
            title="Independent Contractors"
            action={
              <span className="text-xs text-slate-500">
                {contractors.length} agreement
                {contractors.length === 1 ? "" : "s"}
              </span>
            }
          >
            {contractors.length === 0 ? (
              <p className="text-sm text-slate-600">
                No contractor agreements.
              </p>
            ) : (
              <WorkerTable rows={contractors} />
            )}
          </Card>
        </>
      )}
    </div>
  );
}

function WorkerTable({
  rows,
}: {
  rows: Awaited<ReturnType<typeof loadAdminEmployeeContracts>>;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[800px] text-left text-sm">
        <thead className="border-b text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="py-2 pr-3">Worker</th>
            <th className="py-2 pr-3">Company</th>
            <th className="py-2 pr-3">Type</th>
            <th className="py-2 pr-3">Specialty</th>
            <th className="py-2 pr-3">Start</th>
            <th className="py-2 pr-3">Status</th>
            <th className="py-2">Contract</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.vendorId} className="border-b border-slate-100">
              <td className="py-3 pr-3">
                <div className="font-medium text-[#0c1f2e]">{row.workerName}</div>
                <div className="text-xs text-slate-500">{row.email}</div>
              </td>
              <td className="py-3 pr-3">{row.companyName}</td>
              <td className="py-3 pr-3">{titleForKind(row.kind)}</td>
              <td className="py-3 pr-3">{row.specialtyLabel}</td>
              <td className="py-3 pr-3">{formatDate(row.startDate)}</td>
              <td className="py-3 pr-3">
                <Badge status={row.status} />
              </td>
              <td className="py-3">
                <EmployeeAgreementDocumentButton vendorId={row.vendorId} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
