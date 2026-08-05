import { RoleLayout } from "@/lib/role-layout";

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleLayout role="accounting" exact>
      {children}
    </RoleLayout>
  );
}
