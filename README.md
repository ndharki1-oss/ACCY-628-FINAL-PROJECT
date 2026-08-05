# Harborline Commercial Management

Role-based commercial property-management app for **ACCY 628** (Group-15 / Supabase project `xubpljmqxuoqbldivtxk`).

Harborline manages US commercial properties for outside owners. The company earns a **percentage of collected rent**. Rent cash is handled as an **agent** (Due to Owner), not as Harborline revenue.

## Stack

- Next.js (App Router) + TypeScript + Tailwind
- Supabase Auth, Postgres, RLS
- Branch: `brady`

## Setup

1. Copy env (already present locally as `.env.local` — **never commit**):

```env
NEXT_PUBLIC_SUPABASE_URL=https://xubpljmqxuoqbldivtxk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
SUPABASE_URL=...
SUPABASE_KEY=...
```

2. Install & run:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

> **Windows / campus network note:** This machine’s Node.js often fails TLS to Supabase (`UNABLE_TO_VERIFY_LEAF_SIGNATURE` → “fetch failed”). The npm scripts already pass `--use-system-ca`. Always start the app with `npm run dev` (not a bare `next dev`). If you still see fetch errors, stop the server and restart it with that script.

## Demo logins

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@example.com` | `Demo123!` |
| Property owner | `owner@example.com` | `Demo123!` |
| Tenant | `tenant@example.com` | `Demo123!` |
| Vendor | `vendor@example.com` | `Demo123!` |

## Roles (meaningfully different)

- **Admin** — portfolio CRUD views, billing/AR, work orders, GL/journals, period close, profitability by property/owner/lease, company P&L.
- **Owner** — own properties only; approve/reject vendor completions and spend; statements/remittances; NOI.
- **Tenant** — own lease, invoices, simulated pay + auto-pay, service requests, deposits.
- **Vendor** — assigned work orders only; submit completion + costs for owner approval.

## GAAP design (agency)

| Topic | Treatment |
|-------|-----------|
| Rent collection | Dr Cash / Cr Owner Payable (not company revenue) |
| Management fee | Recognized **when rent is collected** (% of collected); typically reduces remittance (Dr Owner Payable / Cr Fee Revenue) |
| Security deposits | Liability (escrow), not income |
| Prepaid rent | Unearned liability until earned |
| Late fees | Tenant charge; owner economics by default |
| Period close | Admin can close months; audit logged |

Evidence for recognition: lease terms, invoices, payments, WO completion **plus owner approval**, journals.

## Controls (risk → control)

| Risk | Control in app |
|------|----------------|
| Work without authorization | Vendor completion → `pending_owner_approval`; not accepted until owner approves |
| Unapproved spend | Costs over agreement threshold (default $2,500) cannot hit statements without owner approval / admin override + reason |
| Duplicate / missed rent | Invoice register with statuses; seed includes overdue/partial/disputed/void |
| Improper deposits | Deposit statuses held/applied/refunded/disputed; audit |
| Unauthorized concessions | Lease amendments tracked; rent reductions need owner acknowledgement |
| Revenue too early | Fee journals tied to collections, not billing alone |
| Closed-period tampering | Period status + close action with audit |
| Write-offs / voids | Invoice void/dispute fields; admin-visible AR |

## Seed data highlights

- ≥15 owners, 22 properties, 40 leases, 35+ invoices, 20 work orders
- Edge cases: unprofitable property, delinquent/partial pay, disputed charge, canceled/expired/renewal-pending leases, amendments, WO awaiting approval, high-dollar unapproved cost, deposit dispute, void invoices, auto-pay enabled, closed accounting period

SQL lives under `supabase/migrations/`.

## App routes

- `/login`
- `/admin/*` — dashboard, properties, leases, billing, work orders, accounting, profitability
- `/owner/*` — dashboard, properties, approvals, statements, NOI
- `/tenant/*` — dashboard, lease, invoices, requests
- `/vendor/*` — dashboard, assignments

## Profitability

- **Property NOI** ≈ tenant charges − property operating costs
- **By owner** — roll-up of property NOI
- **By lease/tenant** — billed vs direct costs
- **Company** — management fee revenue − company OpEx (corporate costs not allocated into property NOI in v1)
