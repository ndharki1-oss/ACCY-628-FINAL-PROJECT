# Reverse tenant WO → staff specialty assign (Jack-Harveys-Branch)

## Database
Apply `supabase/migrations/ROLLBACK_20260806180000_tenant_wo_staff_assign.sql` on Group-15
(or re-run that SQL via Supabase).

## App
```bash
git checkout HEAD -- src/app/admin/work-orders/page.tsx
```
Delete:
- `supabase/migrations/20260806180000_tenant_wo_staff_assign.sql`
- `supabase/migrations/ROLLBACK_20260806180000_tenant_wo_staff_assign.sql`
- this file

Does not remove Harborline staff rows or change other seed.
