"use client";

import { useState, useTransition } from "react";
import {
  adminNotifyTenantRejectedWorkOrder,
  adminSendRejectedWorkOrderToEmployee,
} from "@/app/actions/business";
import { pushEmployeeNotification } from "@/lib/employee-notifications-store";
import { pushTenantNotification } from "@/lib/tenant-notifications-store";

type Props = {
  workOrderId: string;
  woNumber: string;
  title: string;
  propertyName?: string | null;
  rejectionReason?: string | null;
  vendorId?: string | null;
  tenantId?: string | null;
};

export function AdminWorkOrderNotifyActions({
  workOrderId,
  woNumber,
  title,
  propertyName,
  rejectionReason,
  vendorId,
  tenantId,
}: Props) {
  const [employeeNotified, setEmployeeNotified] = useState(false);
  const [sentToEmployee, setSentToEmployee] = useState(false);
  const [tenantSent, setTenantSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const place = propertyName ? ` at ${propertyName}` : "";
  const reasonBit = rejectionReason ? ` Reason: ${rejectionReason}` : "";
  const employeePreview = `${title}${place} needs follow-up after owner rejection.${reasonBit}`;
  const tenantMessage = `Your maintenance work order ${woNumber} ("${title}"${place}) was rejected.${reasonBit} Please reply here on Contact Management if you have questions or need to submit a new request.`;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {vendorId ? (
          <button
            type="button"
            disabled={employeeNotified || pending}
            onClick={() => {
              pushEmployeeNotification({
                fromRole: "admin",
                fromName: "Harborline Management",
                subject: `${woNumber} was rejected`,
                preview: employeePreview,
                href: `/employee/work-orders#assignment-${workOrderId}`,
              });
              setEmployeeNotified(true);
              setError(null);
            }}
            className="cursor-pointer rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-default disabled:opacity-60"
          >
            {employeeNotified ? "Employee notified" : "Notify Employee"}
          </button>
        ) : null}

        <button
          type="button"
          disabled={sentToEmployee || pending}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              try {
                const formData = new FormData();
                formData.set("id", workOrderId);
                await adminSendRejectedWorkOrderToEmployee(formData);
                pushEmployeeNotification({
                  fromRole: "admin",
                  fromName: "Harborline Management",
                  subject: `${woNumber} sent to you`,
                  preview: `Rejected work was reassigned for follow-up: ${employeePreview}`,
                  href: `/employee/work-orders#assignment-${workOrderId}`,
                });
                setSentToEmployee(true);
              } catch (e) {
                setError(
                  e instanceof Error ? e.message : "Could not send to employee."
                );
              }
            });
          }}
          className="cursor-pointer rounded bg-[#0c1f2e] px-3 py-1.5 text-xs font-medium text-white transition hover:bg-[#163246] disabled:cursor-default disabled:opacity-60"
        >
          {sentToEmployee ? "Sent to employee" : "Send to Employee"}
        </button>

        {tenantId ? (
          <button
            type="button"
            disabled={tenantSent || pending}
            onClick={() => {
              setError(null);
              startTransition(async () => {
                try {
                  const formData = new FormData();
                  formData.set("tenant_id", tenantId);
                  formData.set("body", tenantMessage);
                  await adminNotifyTenantRejectedWorkOrder(formData);
                  pushTenantNotification({
                    fromRole: "admin",
                    fromName: "Harborline Management",
                    subject: `Update on ${woNumber}`,
                    preview: tenantMessage,
                    href: "/tenant/contact",
                  });
                  setTenantSent(true);
                } catch (e) {
                  setError(
                    e instanceof Error
                      ? e.message
                      : "Could not notify tenant."
                  );
                }
              });
            }}
            className="cursor-pointer rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-default disabled:opacity-60"
          >
            {tenantSent ? "Tenant notified" : "Notify Tenant"}
          </button>
        ) : null}
      </div>
      {error ? <p className="text-xs text-rose-700">{error}</p> : null}
    </div>
  );
}
