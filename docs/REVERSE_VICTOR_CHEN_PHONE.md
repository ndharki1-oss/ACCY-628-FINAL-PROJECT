# Reverse: Victor Chen demo phone (Jack-Harveys-Branch)

## Database
Apply `supabase/migrations/ROLLBACK_20260806200000_victor_chen_phone.sql` on Group-15
(sets `vendors.phone` back to NULL for Victor only).

## App
No app file changes. Delete:
- `supabase/migrations/20260806200000_victor_chen_phone.sql`
- `supabase/migrations/ROLLBACK_20260806200000_victor_chen_phone.sql`
- this file
