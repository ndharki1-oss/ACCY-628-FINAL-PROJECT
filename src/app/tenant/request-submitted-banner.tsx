"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui";
import { pushTenantNotification } from "@/lib/tenant-notifications-store";

const THANK_YOU =
  "Thank you for submitting a maintenance request. We will review your request and get back to you as soon as possible.";

export function RequestSubmittedBanner({
  viaLabels,
  email,
  phone,
  via,
}: {
  viaLabels: string[];
  email?: string | null;
  phone?: string | null;
  via: string[];
}) {
  const router = useRouter();
  const [visible, setVisible] = useState(true);
  const didNotify = useRef(false);

  useEffect(() => {
    if (!didNotify.current) {
      didNotify.current = true;
      pushTenantNotification({
        fromRole: "system",
        fromName: "Harborline",
        subject: "Maintenance request submitted",
        preview: THANK_YOU,
        href: "/tenant/requests",
      });
    }

    const hideTimer = window.setTimeout(() => {
      setVisible(false);
      router.replace("/tenant/requests");
    }, 15_000);

    return () => window.clearTimeout(hideTimer);
  }, [router]);

  if (!visible) return null;

  return (
    <Card title="Request Submitted">
      <p className="text-sm text-[#0c1f2e]">{THANK_YOU}</p>
      {viaLabels.length > 0 ? (
        <p className="mt-3 text-sm text-slate-600">
          A copy of your maintenance request was sent by{" "}
          {viaLabels.join(" and ")}
          {email && via.includes("email") ? ` to ${email}` : ""}
          {phone && via.includes("sms")
            ? `${via.includes("email") ? " and" : " to"} ${phone}`
            : ""}
          .
        </p>
      ) : null}
      <p className="mt-2 text-xs text-slate-500">
        Delivery is simulated for this demo environment. A matching work order
        was also created for the property management team.
      </p>
      <p className="mt-2 text-xs text-slate-400">
        This message will disappear in 15 seconds.
      </p>
    </Card>
  );
}
