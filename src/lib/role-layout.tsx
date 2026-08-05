import { AppShell } from "@/components/ui";
import { requireRole } from "@/lib/auth";

export async function RoleLayout({
  role,
  children,
}: {
  role: string;
  children: React.ReactNode;
}) {
  const { profile } = await requireRole([role]);
  return (
    <AppShell role={role} name={profile.full_name}>
      {children}
    </AppShell>
  );
}
