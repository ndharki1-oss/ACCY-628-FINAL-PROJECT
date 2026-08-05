-- Restore readable seed labels and make each demo login show useful records.

UPDATE public.owners AS o
SET
  company_name = v.company_name,
  contact_name = v.contact_name,
  email = v.email
FROM (
  VALUES
    ('10000000-0000-0000-0000-000000000001'::uuid, 'Bennett Capital Partners', 'Olivia Bennett', 'owner@example.com'),
    ('10000000-0000-0000-0000-000000000002'::uuid, 'Lakeshore Real Estate', 'Marcus Lake', 'marcus@lakeshore.demo'),
    ('10000000-0000-0000-0000-000000000003'::uuid, 'Prairie Holdings', 'Priya Shah', 'priya@prairie.demo'),
    ('10000000-0000-0000-0000-000000000004'::uuid, 'North Star Investments', 'Noah Williams', 'noah@northstar.demo'),
    ('10000000-0000-0000-0000-000000000005'::uuid, 'Riverside Commercial', 'Elena Rivera', 'elena@riverside.demo'),
    ('10000000-0000-0000-0000-000000000006'::uuid, 'West Loop Equity', 'Daniel Brooks', 'daniel@westloop.demo'),
    ('10000000-0000-0000-0000-000000000007'::uuid, 'Midtown Asset Group', 'Maya Patel', 'maya@midtown.demo'),
    ('10000000-0000-0000-0000-000000000008'::uuid, 'Cedar Ridge LLC', 'Henry Cole', 'henry@cedarridge.demo'),
    ('10000000-0000-0000-0000-000000000009'::uuid, 'Granite Peak Partners', 'Sophia Grant', 'sophia@granitepeak.demo'),
    ('10000000-0000-0000-0000-000000000010'::uuid, 'Parkside Realty', 'Lucas Turner', 'lucas@parkside.demo'),
    ('10000000-0000-0000-0000-000000000011'::uuid, 'Horizon Commercial', 'Ava Foster', 'ava@horizon.demo'),
    ('10000000-0000-0000-0000-000000000012'::uuid, 'Maple Street Holdings', 'Ethan Ward', 'ethan@maplestreet.demo'),
    ('10000000-0000-0000-0000-000000000013'::uuid, 'Beacon Properties', 'Grace Kim', 'grace@beacon.demo'),
    ('10000000-0000-0000-0000-000000000014'::uuid, 'Summit Industrial', 'Owen Price', 'owen@summit.demo'),
    ('10000000-0000-0000-0000-000000000015'::uuid, 'Civic Square Partners', 'Natalie Fox', 'natalie@civicsquare.demo')
) AS v(id, company_name, contact_name, email)
WHERE o.id = v.id;

UPDATE public.properties AS p
SET name = v.name, address_line1 = v.address_line1
FROM (
  VALUES
    ('20000000-0000-0000-0000-000000000001'::uuid, 'Harbor Point Center', '201 Harbor Drive'),
    ('20000000-0000-0000-0000-000000000002'::uuid, 'Lakeview Exchange', '214 Franklin Street'),
    ('20000000-0000-0000-0000-000000000003'::uuid, 'Fulton Market Lofts', '227 Market Street'),
    ('20000000-0000-0000-0000-000000000004'::uuid, 'River North Plaza', '240 Harbor Drive'),
    ('20000000-0000-0000-0000-000000000005'::uuid, 'Westport Commons', '253 Franklin Street'),
    ('20000000-0000-0000-0000-000000000006'::uuid, 'Lincoln Square Shops', '266 Market Street'),
    ('20000000-0000-0000-0000-000000000007'::uuid, 'Oak Brook Offices', '279 Harbor Drive'),
    ('20000000-0000-0000-0000-000000000008'::uuid, 'Wicker Park Studios', '292 Franklin Street'),
    ('20000000-0000-0000-0000-000000000009'::uuid, 'South Loop Tower', '305 Market Street'),
    ('20000000-0000-0000-0000-000000000010'::uuid, 'Logan Square Market', '318 Harbor Drive'),
    ('20000000-0000-0000-0000-000000000011'::uuid, 'Magnolia Industrial', '331 Franklin Street'),
    ('20000000-0000-0000-0000-000000000012'::uuid, 'Ravenswood Yard', '344 Market Street'),
    ('20000000-0000-0000-0000-000000000013'::uuid, 'Hyde Park Professional', '357 Harbor Drive'),
    ('20000000-0000-0000-0000-000000000014'::uuid, 'Old Town Retail', '370 Franklin Street'),
    ('20000000-0000-0000-0000-000000000015'::uuid, 'Clybourn Commerce', '383 Market Street'),
    ('20000000-0000-0000-0000-000000000016'::uuid, 'Michigan Avenue Suites', '396 Harbor Drive'),
    ('20000000-0000-0000-0000-000000000017'::uuid, 'Pilsen Warehouse', '409 Franklin Street'),
    ('20000000-0000-0000-0000-000000000018'::uuid, 'Bridgeport Center', '422 Market Street'),
    ('20000000-0000-0000-0000-000000000019'::uuid, 'Andersonville Arcade', '435 Harbor Drive'),
    ('20000000-0000-0000-0000-000000000020'::uuid, 'Irving Park Flex', '448 Franklin Street'),
    ('20000000-0000-0000-0000-000000000021'::uuid, 'Canal Street Works', '461 Market Street'),
    ('20000000-0000-0000-0000-000000000022'::uuid, 'Gold Coast Gallery', '474 Harbor Drive')
) AS v(id, name, address_line1)
WHERE p.id = v.id;

UPDATE public.tenants AS t
SET company_name = v.company_name, contact_name = v.contact_name, email = v.email
FROM (
  VALUES
    ('40000000-0000-0000-0000-000000000001'::uuid, 'Reed Analytics LLC', 'Taylor Reed', 'tenant@example.com'),
    ('40000000-0000-0000-0000-000000000002'::uuid, 'Brightline Design', 'Morgan Diaz', 'morgan@brightline.demo'),
    ('40000000-0000-0000-0000-000000000003'::uuid, 'Northwind Coffee', 'Casey Nguyen', 'casey@northwind.demo'),
    ('40000000-0000-0000-0000-000000000004'::uuid, 'Urban Wellness Group', 'Jordan Lee', 'jordan@urbanwellness.demo'),
    ('40000000-0000-0000-0000-000000000005'::uuid, 'Vertex Legal', 'Riley Adams', 'riley@vertexlegal.demo'),
    ('40000000-0000-0000-0000-000000000006'::uuid, 'Blue Harbor Media', 'Cameron Scott', 'cameron@blueharbor.demo'),
    ('40000000-0000-0000-0000-000000000007'::uuid, 'Citrine Foods', 'Alexis Moore', 'alexis@citrine.demo'),
    ('40000000-0000-0000-0000-000000000008'::uuid, 'Beacon Architecture', 'Jamie Chen', 'jamie@beaconarch.demo'),
    ('40000000-0000-0000-0000-000000000009'::uuid, 'Lakefront Labs', 'Parker Hall', 'parker@lakefront.demo'),
    ('40000000-0000-0000-0000-000000000010'::uuid, 'Prairie Dental', 'Quinn Baker', 'quinn@prairiedental.demo'),
    ('40000000-0000-0000-0000-000000000011'::uuid, 'Cobalt Logistics', 'Drew Wilson', 'drew@cobalt.demo'),
    ('40000000-0000-0000-0000-000000000012'::uuid, 'Juniper Retail', 'Sam Rivera', 'sam@juniper.demo'),
    ('40000000-0000-0000-0000-000000000013'::uuid, 'Signal Works', 'Robin Young', 'robin@signalworks.demo'),
    ('40000000-0000-0000-0000-000000000014'::uuid, 'Mosaic Learning', 'Blake King', 'blake@mosaic.demo'),
    ('40000000-0000-0000-0000-000000000015'::uuid, 'Atlas Advisory', 'Avery Stone', 'avery@atlas.demo')
) AS v(id, company_name, contact_name, email)
WHERE t.id = v.id;

UPDATE public.vendors AS vnd
SET company_name = v.company_name, contact_name = v.contact_name, email = v.email, specialty = v.specialty
FROM (
  VALUES
    ('50000000-0000-0000-0000-000000000001'::uuid, 'Chen Building Services', 'Victor Chen', 'vendor@example.com', 'General maintenance'),
    ('50000000-0000-0000-0000-000000000002'::uuid, 'Lakeside HVAC', 'Rosa Martinez', 'rosa@lakeside.demo', 'HVAC'),
    ('50000000-0000-0000-0000-000000000003'::uuid, 'Windy City Electrical', 'Miles Johnson', 'miles@windycity.demo', 'Electrical'),
    ('50000000-0000-0000-0000-000000000004'::uuid, 'Great Lakes Roofing', 'Tara Singh', 'tara@greatlakes.demo', 'Roofing'),
    ('50000000-0000-0000-0000-000000000005'::uuid, 'Metro Janitorial', 'Colin Hayes', 'colin@metro.demo', 'Janitorial'),
    ('50000000-0000-0000-0000-000000000006'::uuid, 'Prairie Fire Safety', 'Erin Davis', 'erin@prairiefire.demo', 'Fire life safety')
) AS v(id, company_name, contact_name, email, specialty)
WHERE vnd.id = v.id;

-- Tenant demo invoices: one paid, one partial, one overdue/payable.
UPDATE public.invoices
SET
  invoice_number = 'INV-2026-001',
  status = 'overdue',
  amount_paid = 0,
  due_date = '2026-07-10',
  dispute_reason = NULL
WHERE id = '242b367d-171c-4ac3-9918-3520c2d81328';

UPDATE public.invoices
SET
  invoice_number = 'INV-2026-016',
  status = 'partial',
  amount_paid = 1500,
  due_date = '2026-08-15'
WHERE id = 'e0000000-0000-0000-0000-000000000016';

UPDATE public.invoices
SET invoice_number = 'INV-2026-101'
WHERE id = 'e0000000-0000-0000-0000-000000000001';

UPDATE public.tenant_requests
SET
  title = 'Lobby HVAC blowing warm air',
  description = 'Suite lobby is warm in the afternoon. Please inspect the rooftop unit before Friday client meetings.',
  status = 'open'
WHERE tenant_id = '40000000-0000-0000-0000-000000000001';

UPDATE public.security_deposits d
SET notes = CASE
  WHEN d.status = 'held' THEN 'Held in escrow — not Harborline revenue'
  WHEN d.status = 'applied' THEN 'Partially applied to last month after move-out review'
  ELSE d.notes
END
WHERE d.lease_id IN (
  SELECT id FROM public.leases WHERE tenant_id = '40000000-0000-0000-0000-000000000001'
);

UPDATE public.lease_amendments
SET description = 'Two-year renewal with $450 market rent adjustment. Owner acknowledged.'
WHERE lease_id = '60000000-0000-0000-0000-000000000001';

INSERT INTO public.auto_pay_settings (tenant_id, enabled, method)
VALUES ('40000000-0000-0000-0000-000000000001', true, 'simulated_ach')
ON CONFLICT (tenant_id) DO UPDATE SET enabled = true, method = 'simulated_ach';

-- Vendor demo work orders: active job, pending approval, canceled, rejected.
UPDATE public.work_orders
SET
  wo_number = 'WO-1001',
  wo_type = 'preventive',
  status = 'pending_owner_approval',
  title = 'Quarterly HVAC service — Harbor Point',
  description = 'Preventive rooftop unit inspection and filter replacement for Reed Analytics.',
  scheduled_date = '2026-08-04',
  completed_at = '2026-08-04 16:30:00+00',
  vendor_notes = 'Completed inspection. Condenser coil cleaning recommended. Awaiting owner approval.',
  estimated_cost = 1200,
  actual_cost = 1850,
  requires_owner_approval = true
WHERE id = '94a58c9e-8114-4fda-a2b8-ede5da9c2388';

UPDATE public.work_orders
SET
  wo_number = 'WO-1101',
  wo_type = 'tenant',
  status = 'assigned',
  title = 'Suite thermostat recalibration',
  description = 'Tenant reported uneven temperatures on floor 2. Recalibrate zone controls.',
  scheduled_date = CURRENT_DATE + 1,
  completed_at = NULL,
  vendor_notes = NULL,
  rejection_reason = NULL,
  estimated_cost = 930,
  actual_cost = 0,
  requires_owner_approval = true
WHERE id = 'e2000000-0000-0000-0000-000000000001';

UPDATE public.work_orders
SET
  wo_number = 'WO-1107',
  status = 'canceled',
  title = 'After-hours dock lighting upgrade',
  description = 'Canceled after owner deferred capex to next budget cycle.',
  scheduled_date = '2026-08-20',
  estimated_cost = 2910
WHERE id = 'e2000000-0000-0000-0000-000000000007';

UPDATE public.work_orders
SET
  wo_number = 'WO-1113',
  status = 'rejected',
  title = 'Emergency water heater replacement',
  description = 'Submitted completion; owner rejected pending alternate quote.',
  scheduled_date = '2026-08-01',
  rejection_reason = 'Obtain a second quote before replacing the unit.',
  estimated_cost = 4890,
  actual_cost = 4890
WHERE id = 'e2000000-0000-0000-0000-000000000013';
