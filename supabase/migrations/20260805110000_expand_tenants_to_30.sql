-- Expand to 30 tenants; rebalance 40 leases (min 1, max 2 per tenant)

-- 1) Insert 15 new tenants with credit ratings cycling AAA–CCC
INSERT INTO public.tenants (id, profile_id, company_name, contact_name, email, phone, credit_rating)
VALUES
  ('40000000-0000-0000-0000-000000000016', NULL, 'Summit Robotics Inc', 'Elena Vargas', 'elena@summitrobotics.example', '555-201-1601', 'AAA'),
  ('40000000-0000-0000-0000-000000000017', NULL, 'Lakeshore Logistics', 'Marcus Chen', 'marcus@lakeshorelog.example', '555-201-1602', 'AA'),
  ('40000000-0000-0000-0000-000000000018', NULL, 'Copperfield Accounting', 'Priya Nair', 'priya@copperfieldcpa.example', '555-201-1603', 'A'),
  ('40000000-0000-0000-0000-000000000019', NULL, 'Harbor Dental Group', 'James Ortega', 'james@harbordental.example', '555-201-1604', 'BBB'),
  ('40000000-0000-0000-0000-000000000020', NULL, 'Pinecone Outdoor Co', 'Sara Klein', 'sara@pineconeoutdoor.example', '555-201-1605', 'BB'),
  ('40000000-0000-0000-0000-000000000021', NULL, 'Nova Biotech Labs', 'David Okonkwo', 'david@novabio.example', '555-201-1606', 'B'),
  ('40000000-0000-0000-0000-000000000022', NULL, 'Redwood Insurance Brokers', 'Amy Tran', 'amy@redwoodins.example', '555-201-1607', 'CCC'),
  ('40000000-0000-0000-0000-000000000023', NULL, 'Cascade Marketing', 'Noah Brooks', 'noah@cascademarketing.example', '555-201-1608', 'AAA'),
  ('40000000-0000-0000-0000-000000000024', NULL, 'Ironclad Security LLC', 'Mia Patel', 'mia@ironcladsec.example', '555-201-1609', 'AA'),
  ('40000000-0000-0000-0000-000000000025', NULL, 'Willow Creek Brewing', 'Tom Reyes', 'tom@willowcreekbrew.example', '555-201-1610', 'A'),
  ('40000000-0000-0000-0000-000000000026', NULL, 'Atlas Print Services', 'Hannah Lee', 'hannah@atlasprint.example', '555-201-1611', 'BBB'),
  ('40000000-0000-0000-0000-000000000027', NULL, 'Brightpath Tutoring', 'Owen Marsh', 'owen@brightpath.example', '555-201-1612', 'BB'),
  ('40000000-0000-0000-0000-000000000028', NULL, 'Silverline Software', 'Grace Kim', 'grace@silverlinesw.example', '555-201-1613', 'B'),
  ('40000000-0000-0000-0000-000000000029', NULL, 'Oak & Stone Interiors', 'Chris Diaz', 'chris@oakstone.example', '555-201-1614', 'CCC'),
  ('40000000-0000-0000-0000-000000000030', NULL, 'Frontier Telecom', 'Nina Shah', 'nina@frontiertel.example', '555-201-1615', 'AAA')
ON CONFLICT (id) DO UPDATE SET
  company_name = EXCLUDED.company_name,
  contact_name = EXCLUDED.contact_name,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  credit_rating = EXCLUDED.credit_rating;

-- 2) Select 15 excess leases and reassign to new tenants (keep preferred leases for existing tenants)
WITH ranked AS (
  SELECT
    l.id AS lease_id,
    l.tenant_id AS old_tenant_id,
    ROW_NUMBER() OVER (
      PARTITION BY l.tenant_id
      ORDER BY
        CASE l.status
          WHEN 'active' THEN 0
          WHEN 'renewal_pending' THEN 1
          ELSE 2
        END,
        l.lease_number
    ) AS keep_rank,
    COUNT(*) OVER (PARTITION BY l.tenant_id) AS lease_cnt
  FROM public.leases l
),
to_move AS (
  SELECT
    lease_id,
    old_tenant_id,
    ROW_NUMBER() OVER (ORDER BY old_tenant_id, keep_rank DESC) AS move_ord
  FROM ranked
  WHERE (lease_cnt >= 3 AND keep_rank >= 3)
     OR (lease_cnt = 2 AND keep_rank = 2)
),
new_tenants AS (
  SELECT
    id AS new_tenant_id,
    ROW_NUMBER() OVER (ORDER BY id) AS move_ord
  FROM public.tenants
  WHERE id BETWEEN '40000000-0000-0000-0000-000000000016'::uuid
              AND '40000000-0000-0000-0000-000000000030'::uuid
),
pairs AS (
  SELECT m.lease_id, m.old_tenant_id, n.new_tenant_id
  FROM to_move m
  JOIN new_tenants n ON n.move_ord = m.move_ord
)
UPDATE public.leases l
SET tenant_id = p.new_tenant_id
FROM pairs p
WHERE l.id = p.lease_id;

-- 3) Sync denormalized tenant_id on related rows for reassigned leases
UPDATE public.invoices i
SET tenant_id = l.tenant_id
FROM public.leases l
WHERE i.lease_id = l.id
  AND i.party_type = 'tenant'
  AND i.tenant_id IS DISTINCT FROM l.tenant_id;

UPDATE public.security_deposits sd
SET tenant_id = l.tenant_id
FROM public.leases l
WHERE sd.lease_id = l.id
  AND sd.tenant_id IS DISTINCT FROM l.tenant_id;

UPDATE public.tenant_requests tr
SET tenant_id = l.tenant_id
FROM public.leases l
WHERE tr.lease_id = l.id
  AND tr.tenant_id IS DISTINCT FROM l.tenant_id;

UPDATE public.payments p
SET tenant_id = i.tenant_id
FROM public.payment_applications pa
JOIN public.invoices i ON i.id = pa.invoice_id
WHERE pa.payment_id = p.id
  AND p.party_type = 'tenant'
  AND i.party_type = 'tenant'
  AND p.tenant_id IS DISTINCT FROM i.tenant_id;

-- 4) Refresh property agreement fee averages from active-lease tenant credits
UPDATE public.management_agreements ma
SET fee_percent = COALESCE(sub.avg_fee, 7.5)
FROM (
  SELECT
    p.id AS property_id,
    ROUND(AVG(public.management_fee_percent(t.credit_rating)), 3) AS avg_fee
  FROM public.properties p
  LEFT JOIN public.leases l
    ON l.property_id = p.id
   AND l.status IN ('active', 'renewal_pending')
  LEFT JOIN public.tenants t ON t.id = l.tenant_id
  GROUP BY p.id
) sub
WHERE ma.property_id = sub.property_id;
