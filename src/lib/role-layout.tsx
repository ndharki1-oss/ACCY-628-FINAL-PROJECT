import { AppShell } from "@/components/ui";
import { requireExactRole, requireRole } from "@/lib/auth";
import { roleShellKey } from "@/lib/utils";

export async function RoleLayout({
  role,
  shellRole,
  exact = false,
  children,
}: {
  role: string;
  shellRole?: string;
  exact?: boolean;
  children: React.ReactNode;
}) {
  const { profile } = exact
    ? await requireExactRole([role])
    : await requireRole([role]);
  return (
    <AppShell
      role={shellRole ?? roleShellKey(role)}
      name={profile.full_name}
    >
      {children}
    </AppShell>
  );
}
