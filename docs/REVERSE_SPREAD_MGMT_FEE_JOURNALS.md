# Reverse: Spread management fee journals (Jack-Harveys-Branch)

## Database
Apply `supabase/migrations/ROLLBACK_20260806210000_spread_mgmt_fee_journals.sql` on Group-15
(deletes monthly `HL-FEE-YYYY-MM` journals `e411…001–012` and restores consolidated ENR-JE-1).

## App
No app file changes. Delete:
- `supabase/migrations/20260806210000_spread_mgmt_fee_journals.sql`
- `supabase/migrations/ROLLBACK_20260806210000_spread_mgmt_fee_journals.sql`
- this file
