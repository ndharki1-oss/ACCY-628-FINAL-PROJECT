import { requireRole } from "@/lib/auth";
import { PageHeading } from "@/components/page-heading";
import { Badge, Card } from "@/components/ui";
import Link from "next/link";

type AvailableListing = {
  unit_id: string;
  unit_code: string;
  floor: string | null;
  square_feet: number | null;
  property_name: string;
  address_line1: string;
  city: string;
  state: string;
  postal_code: string;
  property_type: string;
};

export default async function TenantAvailableLeasesPage() {
  const { supabase } = await requireRole(["tenant"]);

  const { data: listings } = await supabase
    .from("available_rental_listings")
    .select(
      "unit_id, unit_code, floor, square_feet, property_name, address_line1, city, state, postal_code, property_type"
    )
    .order("property_name")
    .order("unit_code");

  const available = (listings ?? []) as AvailableListing[];

  return (
    <div className="space-y-6">
      <PageHeading
        title="Available Leases"
        info="Vacant units in the Harborline network that are not currently leased."
      />
      {available.length === 0 ? (
        <p className="text-sm text-slate-600">
          No vacant units right now. Check back later.
        </p>
      ) : (
        available.map((u) => (
          <Card
            key={u.unit_id}
            title={`${u.property_name} · ${u.unit_code}`}
            action={<Badge status="available" />}
          >
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <p>
                Address: {u.address_line1}, {u.city}, {u.state} {u.postal_code}
              </p>
              <p className="capitalize">Type: {u.property_type}</p>
              <p>Floor: {u.floor ?? "—"}</p>
              <p>
                Size:{" "}
                {u.square_feet != null
                  ? `${u.square_feet.toLocaleString()} sq ft`
                  : "—"}
              </p>
            </div>
            <p className="mt-4">
              <Link
                href={`/tenant/contact?property=${encodeURIComponent(u.property_name)}`}
                className="text-sm text-[#c4784a] hover:underline"
              >
                Contact management
              </Link>
            </p>
          </Card>
        ))
      )}
    </div>
  );
}
