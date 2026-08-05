-- Harborline Commercial Management — rich demo seed data
-- Demo credentials: admin@harborline.demo, owner@harborline.demo,
-- tenant@harborline.demo, vendor@harborline.demo (all use Demo123!)

BEGIN;

-- Demo sign-in identities. The fixed IDs make UI/demo references deterministic.
INSERT INTO auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) VALUES
  ('a1111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'admin@harborline.demo', extensions.crypt('Demo123!', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"],"role":"admin"}', '{"full_name":"Avery Morgan"}', now(), now()),
  ('b2222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'owner@harborline.demo', extensions.crypt('Demo123!', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"],"role":"owner"}', '{"full_name":"Olivia Bennett"}', now(), now()),
  ('c3333333-3333-3333-3333-333333333333', 'authenticated', 'authenticated', 'tenant@harborline.demo', extensions.crypt('Demo123!', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"],"role":"tenant"}', '{"full_name":"Taylor Reed"}', now(), now()),
  ('d4444444-4444-4444-4444-444444444444', 'authenticated', 'authenticated', 'vendor@harborline.demo', extensions.crypt('Demo123!', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"],"role":"vendor"}', '{"full_name":"Victor Chen"}', now(), now())
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email, encrypted_password = EXCLUDED.encrypted_password,
  email_confirmed_at = EXCLUDED.email_confirmed_at,
  raw_app_meta_data = EXCLUDED.raw_app_meta_data, raw_user_meta_data = EXCLUDED.raw_user_meta_data,
  updated_at = now();

INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at, email)
VALUES
  ('a1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', '{"sub":"a1111111-1111-1111-1111-111111111111","email":"admin@harborline.demo","email_verified":true}', 'email', now(), now(), now(), 'admin@harborline.demo'),
  ('b2222222-2222-2222-2222-222222222222', 'b2222222-2222-2222-2222-222222222222', '{"sub":"b2222222-2222-2222-2222-222222222222","email":"owner@harborline.demo","email_verified":true}', 'email', now(), now(), now(), 'owner@harborline.demo'),
  ('c3333333-3333-3333-3333-333333333333', 'c3333333-3333-3333-3333-333333333333', '{"sub":"c3333333-3333-3333-3333-333333333333","email":"tenant@harborline.demo","email_verified":true}', 'email', now(), now(), now(), 'tenant@harborline.demo'),
  ('d4444444-4444-4444-4444-444444444444', 'd4444444-4444-4444-4444-444444444444', '{"sub":"d4444444-4444-4444-4444-444444444444","email":"vendor@harborline.demo","email_verified":true}', 'email', now(), now(), now(), 'vendor@harborline.demo')
ON CONFLICT (provider_id, provider) DO UPDATE SET identity_data = EXCLUDED.identity_data, email = EXCLUDED.email, updated_at = now();

INSERT INTO public.profiles (id, email, full_name, role, phone) VALUES
  ('a1111111-1111-1111-1111-111111111111', 'admin@harborline.demo', 'Avery Morgan', 'admin', '312-555-0100'),
  ('b2222222-2222-2222-2222-222222222222', 'owner@harborline.demo', 'Olivia Bennett', 'owner', '312-555-0101'),
  ('c3333333-3333-3333-3333-333333333333', 'tenant@harborline.demo', 'Taylor Reed', 'tenant', '312-555-0102'),
  ('d4444444-4444-4444-4444-444444444444', 'vendor@harborline.demo', 'Victor Chen', 'vendor', '312-555-0103')
ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, full_name = EXCLUDED.full_name, role = EXCLUDED.role, phone = EXCLUDED.phone, updated_at = now();

CREATE TEMP TABLE seed_owners (n integer PRIMARY KEY, id uuid NOT NULL, profile_id uuid, company_name text, contact_name text, email text);
INSERT INTO seed_owners
SELECT n,
       CASE WHEN n = 1 THEN '10000000-0000-0000-0000-000000000001'::uuid ELSE format('10000000-0000-0000-0000-%s', lpad(n::text, 12, '0'))::uuid END,
       CASE WHEN n = 1 THEN 'b2222222-2222-2222-2222-222222222222'::uuid END,
       (ARRAY['Bennett Capital Partners','Lakeshore Real Estate','Prairie Holdings','North Star Investments','Riverside Commercial','West Loop Equity','Midtown Asset Group','Cedar Ridge LLC','Granite Peak Partners','Parkside Realty','Horizon Commercial','Maple Street Holdings','Beacon Properties','Summit Industrial','Civic Square Partners'])[n],
       (ARRAY['Olivia Bennett','Marcus Lake','Priya Shah','Noah Williams','Elena Rivera','Daniel Brooks','Maya Patel','Henry Cole','Sophia Grant','Lucas Turner','Ava Foster','Ethan Ward','Grace Kim','Owen Price','Natalie Fox'])[n],
       lower(replace((ARRAY['Bennett','Lakeshore','Prairie','NorthStar','Riverside','WestLoop','Midtown','CedarRidge','GranitePeak','Parkside','Horizon','MapleStreet','Beacon','Summit','CivicSquare'])[n], ' ', '')) || '@owners.harborline.demo'
FROM generate_series(1, 15) n;
INSERT INTO public.owners (id, profile_id, company_name, contact_name, email, phone, mailing_address)
SELECT id, profile_id, company_name, contact_name, email, format('312-555-%s', lpad((1100+n)::text, 4, '0')), format('%s Harbor Avenue, Chicago, IL 606%s', 100+n*7, lpad((n%9+1)::text, 2, '0'))
FROM seed_owners
ON CONFLICT (id) DO UPDATE SET profile_id = EXCLUDED.profile_id, company_name = EXCLUDED.company_name, contact_name = EXCLUDED.contact_name, email = EXCLUDED.email;

CREATE TEMP TABLE seed_properties (n integer PRIMARY KEY, id uuid NOT NULL, owner_n integer NOT NULL, name text NOT NULL);
INSERT INTO seed_properties
SELECT n, format('20000000-0000-0000-0000-%s', lpad(n::text, 12, '0'))::uuid, ((n - 1) % 15) + 1,
       (ARRAY['Harbor Point Center','Lakeview Exchange','Fulton Market Lofts','River North Plaza','Westport Commons','Lincoln Square Shops','Oak Brook Offices','Wicker Park Studios','South Loop Tower','Logan Square Market','Magnolia Industrial','Ravenswood Yard','Hyde Park Professional','Old Town Retail','Clybourn Commerce','Michigan Avenue Suites','Pilsen Warehouse','Bridgeport Center','Andersonville Arcade','Irving Park Flex','Canal Street Works','Gold Coast Gallery'])[n]
FROM generate_series(1, 22) n;
INSERT INTO public.properties (id, owner_id, name, address_line1, city, state, postal_code, property_type, square_feet, status)
SELECT p.id, o.id, p.name, format('%s %s Street', 200+n*13, CASE WHEN n % 3 = 0 THEN 'Harbor' WHEN n % 3 = 1 THEN 'Franklin' ELSE 'Market' END),
       'Chicago', 'IL', format('606%02s', (n % 20)+1), CASE WHEN n % 5 = 0 THEN 'industrial' WHEN n % 4 = 0 THEN 'retail' ELSE 'office' END, 8500+n*1750, 'active'
FROM seed_properties p JOIN seed_owners o ON o.n = p.owner_n
ON CONFLICT (id) DO UPDATE SET owner_id = EXCLUDED.owner_id, name = EXCLUDED.name;
INSERT INTO public.management_agreements (property_id, owner_id, start_date, fee_percent, approval_threshold, status, notes)
SELECT p.id, o.id, '2024-01-01', 4 + (p.n % 5), 2500, 'active', 'Harborline standard commercial management agreement'
FROM seed_properties p JOIN seed_owners o ON o.n = p.owner_n
ON CONFLICT (property_id) DO UPDATE SET owner_id = EXCLUDED.owner_id, fee_percent = EXCLUDED.fee_percent, approval_threshold = 2500, status = 'active';

CREATE TEMP TABLE seed_units (property_n integer, unit_n integer, id uuid PRIMARY KEY);
INSERT INTO seed_units
SELECT p, u, format('30000000-0000-0000-%s-%s', lpad(p::text, 4, '0'), lpad(u::text, 12, '0'))::uuid
FROM generate_series(1, 22) p CROSS JOIN generate_series(1, 3) u;
INSERT INTO public.units (id, property_id, unit_code, floor, square_feet)
SELECT u.id, p.id, format('%s%s', CASE WHEN u.unit_n = 1 THEN 'Suite ' WHEN u.unit_n = 2 THEN 'Floor ' ELSE 'Bay ' END, 100+u.unit_n*10),
       u.unit_n::text, 1800 + p.n*55 + u.unit_n*250
FROM seed_units u JOIN seed_properties p ON p.n = u.property_n
ON CONFLICT (id) DO UPDATE SET property_id = EXCLUDED.property_id, unit_code = EXCLUDED.unit_code;

CREATE TEMP TABLE seed_tenants (n integer PRIMARY KEY, id uuid NOT NULL, profile_id uuid, company_name text, contact_name text);
INSERT INTO seed_tenants
SELECT n, format('40000000-0000-0000-0000-%s', lpad(n::text, 12, '0'))::uuid,
       CASE WHEN n = 1 THEN 'c3333333-3333-3333-3333-333333333333'::uuid END,
       (ARRAY['Reed Analytics LLC','Brightline Design','Northwind Coffee','Urban Wellness Group','Vertex Legal','Blue Harbor Media','Citrine Foods','Beacon Architecture','Lakefront Labs','Prairie Dental','Cobalt Logistics','Juniper Retail','Signal Works','Mosaic Learning','Atlas Advisory'])[n],
       (ARRAY['Taylor Reed','Morgan Diaz','Casey Nguyen','Jordan Lee','Riley Adams','Cameron Scott','Alexis Moore','Jamie Chen','Parker Hall','Quinn Baker','Drew Wilson','Sam Rivera','Robin Young','Blake King','Avery Stone'])[n]
FROM generate_series(1, 15) n;
INSERT INTO public.tenants (id, profile_id, company_name, contact_name, email, phone)
SELECT id, profile_id, company_name, contact_name, lower(replace(company_name, ' ', '.')) || '@tenant.harborline.demo', format('773-555-%s', lpad((2000+n)::text, 4, '0'))
FROM seed_tenants
ON CONFLICT (id) DO UPDATE SET profile_id = EXCLUDED.profile_id, company_name = EXCLUDED.company_name, contact_name = EXCLUDED.contact_name;

CREATE TEMP TABLE seed_vendors (n integer PRIMARY KEY, id uuid NOT NULL, profile_id uuid);
INSERT INTO seed_vendors VALUES
 (1, '50000000-0000-0000-0000-000000000001', 'd4444444-4444-4444-4444-444444444444'),
 (2, '50000000-0000-0000-0000-000000000002', null),
 (3, '50000000-0000-0000-0000-000000000003', null),
 (4, '50000000-0000-0000-0000-000000000004', null),
 (5, '50000000-0000-0000-0000-000000000005', null),
 (6, '50000000-0000-0000-0000-000000000006', null);
INSERT INTO public.vendors (id, profile_id, company_name, contact_name, email, phone, specialty, active)
SELECT id, profile_id, (ARRAY['Chen Building Services','Lakeside HVAC','Windy City Electrical','Great Lakes Roofing','Metro Janitorial','Prairie Fire Safety'])[n],
       (ARRAY['Victor Chen','Rosa Martinez','Miles Johnson','Tara Singh','Colin Hayes','Erin Davis'])[n],
       lower(replace((ARRAY['chen','lakeside','windycity','greatlakes','metro','prairiefire'])[n], ' ', '')) || '@vendors.harborline.demo',
       format('872-555-%s', lpad((3000+n)::text, 4, '0')),
       (ARRAY['General maintenance','HVAC','Electrical','Roofing','Janitorial','Fire life safety'])[n], true
FROM seed_vendors
ON CONFLICT (id) DO UPDATE SET profile_id = EXCLUDED.profile_id, company_name = EXCLUDED.company_name, specialty = EXCLUDED.specialty;

CREATE TEMP TABLE seed_leases (n integer PRIMARY KEY, id uuid NOT NULL, property_n integer, unit_n integer, tenant_n integer);
INSERT INTO seed_leases
SELECT n, format('60000000-0000-0000-0000-%s', lpad(n::text, 12, '0'))::uuid, ((n-1)%22)+1, ((n-1)%3)+1, ((n-1)%15)+1 FROM generate_series(1,40) n;
INSERT INTO public.leases (id, property_id, unit_id, tenant_id, lease_number, lease_type, status, start_date, end_date, base_rent_monthly, cam_monthly, percentage_rent_rate, billing_day, security_deposit_required)
SELECT l.id, p.id, u.id, t.id, format('HL-%s', lpad(l.n::text, 4, '0')),
       (ARRAY['nnn','modified_gross','full_service','percentage_rent'])[((l.n-1)%4)+1]::public.lease_type,
       CASE WHEN l.n = 37 THEN 'expired' WHEN l.n = 38 THEN 'canceled' WHEN l.n IN (39,40) THEN 'renewal_pending' ELSE 'active' END::public.lease_status,
       CASE WHEN l.n = 37 THEN '2023-01-01' WHEN l.n = 38 THEN '2025-01-01' ELSE '2024-01-01' END,
       CASE WHEN l.n = 37 THEN '2025-01-31' WHEN l.n = 38 THEN '2025-05-15' WHEN l.n IN (39,40) THEN '2026-12-31' WHEN l.n IN (16,31) THEN '2026-11-05' ELSE '2027-12-31' END,
       2800 + l.n*175, 450 + (l.n%5)*75, CASE WHEN l.n%4 = 0 THEN 6.5 ELSE null END, 1, 3500 + l.n*100
FROM seed_leases l JOIN seed_properties p ON p.n = l.property_n JOIN seed_units u ON u.property_n = l.property_n AND u.unit_n = l.unit_n JOIN seed_tenants t ON t.n = l.tenant_n
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, end_date = EXCLUDED.end_date, base_rent_monthly = EXCLUDED.base_rent_monthly;

INSERT INTO public.lease_amendments (lease_id, amendment_type, effective_date, description, rent_change, owner_acknowledged, created_by) VALUES
 ('60000000-0000-0000-0000-000000000001', 'renewal', '2026-01-01', 'Two-year renewal with market rent adjustment.', 450, true, 'a1111111-1111-1111-1111-111111111111'),
 ('60000000-0000-0000-0000-000000000002', 'expansion', '2026-03-01', 'Expanded into adjacent suite for growing operations.', 900, true, 'a1111111-1111-1111-1111-111111111111'),
 ('60000000-0000-0000-0000-000000000003', 'concession', '2026-02-01', 'One-time construction access rent concession.', -650, true, 'a1111111-1111-1111-1111-111111111111'),
 ('60000000-0000-0000-0000-000000000038', 'termination', '2025-05-15', 'Mutual early termination after relocation.', 0, true, 'a1111111-1111-1111-1111-111111111111')
ON CONFLICT DO NOTHING;

INSERT INTO public.work_orders (id, property_id, unit_id, lease_id, vendor_id, wo_number, wo_type, status, title, description, scheduled_date, completed_at, vendor_notes, owner_approved_at, owner_approved_by, rejection_reason, estimated_cost, actual_cost, requires_owner_approval) VALUES
 ('70000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','30000000-0000-0000-0001-000000000001','60000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000001','WO-1001','preventive','assigned','Quarterly HVAC service','Preventive rooftop unit inspection.','2026-08-15',null,null,null,null,null,1200,0,false),
 ('70000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000002','30000000-0000-0000-0002-000000000002','60000000-0000-0000-0000-000000000002','50000000-0000-0000-0000-000000000002','WO-1002','tenant','pending_owner_approval','Emergency HVAC replacement','Completed before owner approval; requires review.','2026-07-28','2026-07-29 17:00:00+00','Emergency repair completed to protect tenant operations.',null,null,null,4800,4650,true),
 ('70000000-0000-0000-0000-000000000003','20000000-0000-0000-0000-000000000003','30000000-0000-0000-0003-000000000003','60000000-0000-0000-0000-000000000003','50000000-0000-0000-0000-000000000003','WO-1003','capex','approved','Lobby electrical modernization','LED and panel upgrade.','2026-08-20',null,null,'2026-08-01 12:00:00+00','b2222222-2222-2222-2222-222222222222',null,7200,0,true),
 ('70000000-0000-0000-0000-000000000004','20000000-0000-0000-0000-000000000004','30000000-0000-0000-0004-000000000001','60000000-0000-0000-0000-000000000004','50000000-0000-0000-0000-000000000004','WO-1004','inspection','rejected','Roof replacement assessment','Proposal exceeds remaining useful life budget.','2026-08-10',null,null,null,null,'Defer until next capital plan review.',9800,0,true),
 ('70000000-0000-0000-0000-000000000005','20000000-0000-0000-0000-000000000005','30000000-0000-0000-0005-000000000002','60000000-0000-0000-0000-000000000005','50000000-0000-0000-0000-000000000005','WO-1005','leasing','approved','Vacancy suite turnover','Paint, clean, and replace carpet before tours.','2026-08-05',null,null,'2026-07-31 15:00:00+00','b2222222-2222-2222-2222-222222222222',null,3100,0,true)
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, completed_at = EXCLUDED.completed_at, actual_cost = EXCLUDED.actual_cost;

INSERT INTO public.cost_entries (id, property_id, owner_id, unit_id, lease_id, work_order_id, vendor_id, category, description, amount, incurred_date, owner_approved, owner_approved_at, admin_override, override_reason, billed_on_statement, created_by)
SELECT format('80000000-0000-0000-0000-%s', lpad(n::text, 12, '0'))::uuid, p.id, o.id,
       u.id, l.id, CASE WHEN n <= 5 THEN format('70000000-0000-0000-0000-%s',lpad(n::text,12,'0'))::uuid END,
       v.id, (ARRAY['labor','vendor','materials','utilities','insurance','taxes','advertising','travel','equipment','payroll','parts','other'])[((n-1)%12)+1]::public.cost_category,
       CASE WHEN n = 1 THEN 'Routine HVAC service billed on July statement' WHEN n = 2 THEN 'Emergency HVAC repair awaiting owner approval' WHEN n = 3 THEN 'Electrical modernization deposit' WHEN n = 20 THEN 'Late utility true-up entered after July statement' ELSE format('Operating cost batch %s', n) END,
       CASE WHEN n = 2 THEN 4650 WHEN n = 12 THEN 11250 WHEN n = 20 THEN 780 ELSE 250+n*110 END,
       CASE WHEN n = 20 THEN '2026-08-03' ELSE '2026-07-15'::date + n END,
       CASE WHEN n IN (2,12) THEN false ELSE true END,
       CASE WHEN n IN (2,12) THEN null ELSE now() - interval '10 days' END,
       false, null, CASE WHEN n = 1 THEN true ELSE false END, 'a1111111-1111-1111-1111-111111111111'
FROM generate_series(1, 24) n
JOIN seed_properties p ON p.n = ((n-1)%22)+1 JOIN seed_owners o ON o.n = p.owner_n JOIN seed_units u ON u.property_n = p.n AND u.unit_n = 1
JOIN seed_leases l ON l.property_n = p.n AND l.unit_n = 1
JOIN seed_vendors v ON v.n = ((n-1)%6)+1
ON CONFLICT (id) DO UPDATE SET amount = EXCLUDED.amount, owner_approved = EXCLUDED.owner_approved, billed_on_statement = EXCLUDED.billed_on_statement;

INSERT INTO public.invoices (id, invoice_number, party_type, tenant_id, lease_id, property_id, status, issue_date, due_date, period_start, period_end, subtotal, total, amount_paid, dispute_reason, void_reason)
SELECT format('90000000-0000-0000-0000-%s', lpad(n::text, 12, '0'))::uuid, format('INV-2026-%03s', n), 'tenant', t.id, l.id, p.id,
       (ARRAY['paid','partial','overdue','disputed','void','draft','sent','paid','overdue','sent']) [n]::public.invoice_status,
       '2026-07-01', CASE WHEN n IN (3,9) THEN '2026-07-10' ELSE '2026-08-10' END, '2026-07-01', '2026-07-31',
       3000+n*200, 3000+n*200, 0, CASE WHEN n=4 THEN 'Tenant disputes CAM allocation.' END, CASE WHEN n=5 THEN 'Lease canceled before billing cycle.' END
FROM generate_series(1,10) n JOIN seed_leases l ON l.n=n JOIN seed_tenants t ON t.n=l.tenant_n JOIN seed_properties p ON p.n=l.property_n
ON CONFLICT (id) DO UPDATE SET status=EXCLUDED.status, dispute_reason=EXCLUDED.dispute_reason, void_reason=EXCLUDED.void_reason;
INSERT INTO public.invoice_lines (invoice_id,line_type,description,amount,gl_hint)
SELECT format('90000000-0000-0000-0000-%s',lpad(n::text,12,'0'))::uuid, CASE WHEN n%3=0 THEN 'late_fee' WHEN n%2=0 THEN 'cam' ELSE 'rent' END,
       CASE WHEN n%3=0 THEN 'Late fee' WHEN n%2=0 THEN 'Common area maintenance' ELSE 'Base rent' END, 3000+n*200, '1100'
FROM generate_series(1,10)n ON CONFLICT DO NOTHING;
INSERT INTO public.payments (id,payment_number,party_type,tenant_id,payment_date,amount,method,is_auto_pay,reference,created_by) VALUES
 ('91000000-0000-0000-0000-000000000001','PMT-1001','tenant','40000000-0000-0000-0000-000000000001','2026-07-05',3200,'ach',true,'AUTO-1001','c3333333-3333-3333-3333-333333333333'),
 ('91000000-0000-0000-0000-000000000002','PMT-1002','tenant','40000000-0000-0000-0000-000000000002','2026-07-12',1700,'check',false,'CHK-5882','a1111111-1111-1111-1111-111111111111')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.payment_applications (payment_id,invoice_id,amount) VALUES
 ('91000000-0000-0000-0000-000000000001','90000000-0000-0000-0000-000000000001',3200),
 ('91000000-0000-0000-0000-000000000002','90000000-0000-0000-0000-000000000002',1700)
ON CONFLICT (payment_id,invoice_id) DO NOTHING;
INSERT INTO public.auto_pay_settings (tenant_id,enabled,method) VALUES ('40000000-0000-0000-0000-000000000001',true,'ach') ON CONFLICT (tenant_id) DO UPDATE SET enabled=true,method='ach',updated_at=now();

INSERT INTO public.security_deposits (id,lease_id,tenant_id,property_id,amount,status,received_date,notes) VALUES
 ('92000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001',3600,'held','2024-01-01','Held in escrow.'),
 ('92000000-0000-0000-0000-000000000002','60000000-0000-0000-0000-000000000037','40000000-0000-0000-0000-000000000007','20000000-0000-0000-0000-000000000015',5200,'disputed','2025-02-01','Tenant disputes cleaning and repair deductions.'),
 ('92000000-0000-0000-0000-000000000003','60000000-0000-0000-0000-000000000038','40000000-0000-0000-0000-000000000008','20000000-0000-0000-0000-000000000016',4100,'applied','2025-01-01','Applied to early termination balance.')
ON CONFLICT (id) DO UPDATE SET status=EXCLUDED.status,notes=EXCLUDED.notes;

INSERT INTO public.owner_statements (id,statement_number,owner_id,property_id,period_start,period_end,total_collections,total_expenses,management_fee,remittance_due,status,issued_at) VALUES
 ('93000000-0000-0000-0000-000000000001','STM-2026-07-001','10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','2026-07-01','2026-07-31',3200,360,160,2680,'issued','2026-08-01'),
 ('93000000-0000-0000-0000-000000000002','STM-2026-07-002','10000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000002','2026-07-01','2026-07-31',3400,4650,204,-1454,'issued','2026-08-01'),
 ('93000000-0000-0000-0000-000000000003','STM-2026-07-003','10000000-0000-0000-0000-000000000003','20000000-0000-0000-0000-000000000003','2026-07-01','2026-07-31',4800,11250,288,-6738,'issued','2026-08-01')
ON CONFLICT (id) DO UPDATE SET total_collections=EXCLUDED.total_collections,total_expenses=EXCLUDED.total_expenses,remittance_due=EXCLUDED.remittance_due;
INSERT INTO public.owner_statement_lines (statement_id,line_type,description,amount,reference_id) VALUES
 ('93000000-0000-0000-0000-000000000001','collections','July tenant collection',3200,'90000000-0000-0000-0000-000000000001'),
 ('93000000-0000-0000-0000-000000000001','expense','HVAC service',-360,'80000000-0000-0000-0000-000000000001'),
 ('93000000-0000-0000-0000-000000000001','management_fee','Harborline management fee',-160,null),
 ('93000000-0000-0000-0000-000000000001','remittance','Net owner remittance',2680,null)
ON CONFLICT DO NOTHING;

UPDATE public.accounting_periods SET status='closed',closed_at=now(),closed_by='a1111111-1111-1111-1111-111111111111' WHERE year=2025 AND month=12;
INSERT INTO public.journal_entries (id,entry_number,entry_date,memo,source_type,source_id,period_id,created_by) VALUES
 ('94000000-0000-0000-0000-000000000001','JE-2026-0701','2026-07-05','Recognize management fee on tenant collection','payment','91000000-0000-0000-0000-000000000001',(SELECT id FROM public.accounting_periods WHERE year=2026 AND month=7),'a1111111-1111-1111-1111-111111111111'),
 ('94000000-0000-0000-0000-000000000002','JE-2026-0702','2026-07-05','Record tenant security deposit liability','security_deposit','92000000-0000-0000-0000-000000000001',(SELECT id FROM public.accounting_periods WHERE year=2026 AND month=7),'a1111111-1111-1111-1111-111111111111')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.journal_lines (journal_entry_id,gl_account_id,debit,credit,property_id,owner_id) VALUES
 ('94000000-0000-0000-0000-000000000001',(SELECT id FROM public.gl_accounts WHERE code='2000'),160,0,'20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001'),
 ('94000000-0000-0000-0000-000000000001',(SELECT id FROM public.gl_accounts WHERE code='4000'),0,160,'20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001'),
 ('94000000-0000-0000-0000-000000000002',(SELECT id FROM public.gl_accounts WHERE code='1000'),3600,0,'20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001'),
 ('94000000-0000-0000-0000-000000000002',(SELECT id FROM public.gl_accounts WHERE code='2100'),0,3600,'20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;

INSERT INTO public.approvals (entity_type,entity_id,requested_by,approver_role,status,amount,notes,decided_by,decided_at) VALUES
 ('cost_entry','80000000-0000-0000-0000-000000000002','a1111111-1111-1111-1111-111111111111','owner','pending',4650,'Emergency repair requires owner approval.',null,null),
 ('work_order','70000000-0000-0000-0000-000000000004','a1111111-1111-1111-1111-111111111111','owner','rejected',9800,'Roof proposal deferred.','b2222222-2222-2222-2222-222222222222','2026-08-01')
ON CONFLICT DO NOTHING;
INSERT INTO public.tenant_requests (tenant_id,lease_id,property_id,title,description,status) VALUES
 ('40000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','Conference room temperature issue','Conference room remains warm in afternoon.','open'),
 ('40000000-0000-0000-0000-000000000003','60000000-0000-0000-0000-000000000003','20000000-0000-0000-0000-000000000003','Loading dock access','Request additional keycard for evening deliveries.','in_review')
ON CONFLICT DO NOTHING;
INSERT INTO public.company_expenses (category,description,amount,incurred_date) VALUES
 ('software','Property management platform subscription',890,'2026-07-01'),('marketing','Leasing campaign creative',1450,'2026-07-12'),('payroll','Regional operations team allocation',7200,'2026-07-31')
ON CONFLICT DO NOTHING;
INSERT INTO public.audit_log (actor_id,action,entity_type,entity_id,detail) VALUES
 ('a1111111-1111-1111-1111-111111111111','seed_created','property','20000000-0000-0000-0000-000000000001','{"source":"harborline_seed","scenario":"commercial portfolio"}'),
 ('b2222222-2222-2222-2222-222222222222','approved','work_order','70000000-0000-0000-0000-000000000003','{"amount":7200,"status":"approved"}'),
 ('c3333333-3333-3333-3333-333333333333','submitted','tenant_request',null,'{"title":"Conference room temperature issue"}')
ON CONFLICT DO NOTHING;

COMMIT;
