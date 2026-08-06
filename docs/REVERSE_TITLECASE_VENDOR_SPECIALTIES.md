# Reverse: title-case vendor specialties (Jack-Harveys-Branch)

## Database
Apply `supabase/migrations/ROLLBACK_20260806190000_titlecase_vendor_specialties.sql`
on Group-15.

## App
Restore employee portal specialty display (or delete the format helper usage):
- `src/lib/vendors/format-specialty.ts`
- `src/app/employee/directory/page.tsx`
- `src/app/employee/independent-contractor/page.tsx`

Delete:
- `supabase/migrations/20260806190000_titlecase_vendor_specialties.sql`
- `supabase/migrations/ROLLBACK_20260806190000_titlecase_vendor_specialties.sql`
- this file
