-- Real Chicago-area commercial addresses with Nominatim-verified coordinates.
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS latitude numeric(9, 6),
  ADD COLUMN IF NOT EXISTS longitude numeric(9, 6);

UPDATE public.properties AS p
SET
  address_line1 = v.address_line1,
  city = v.city,
  state = v.state,
  postal_code = v.postal_code,
  latitude = v.latitude,
  longitude = v.longitude
FROM (
  VALUES
    ('20000000-0000-0000-0000-000000000019'::uuid, '5200 N Clark Street', 'Chicago', 'IL', '60640', 41.976316, -87.668768),
    ('20000000-0000-0000-0000-000000000018'::uuid, '3500 S Halsted Street', 'Chicago', 'IL', '60609', 41.830659, -87.646281),
    ('20000000-0000-0000-0000-000000000021'::uuid, '225 S Canal Street', 'Chicago', 'IL', '60606', 41.878691, -87.639261),
    ('20000000-0000-0000-0000-000000000015'::uuid, '2000 N Clybourn Avenue', 'Chicago', 'IL', '60614', 41.917348, -87.659506),
    ('20000000-0000-0000-0000-000000000003'::uuid, '1000 W Fulton Market', 'Chicago', 'IL', '60607', 41.887285, -87.652579),
    ('20000000-0000-0000-0000-000000000022'::uuid, '900 N Michigan Avenue', 'Chicago', 'IL', '60611', 41.899645, -87.625616),
    ('20000000-0000-0000-0000-000000000001'::uuid, '155 N Harbor Drive', 'Chicago', 'IL', '60601', 41.884904, -87.614817),
    ('20000000-0000-0000-0000-000000000013'::uuid, '1525 E 53rd Street', 'Chicago', 'IL', '60615', 41.799345, -87.588195),
    ('20000000-0000-0000-0000-000000000020'::uuid, '4000 W Irving Park Road', 'Chicago', 'IL', '60641', 41.953742, -87.727786),
    ('20000000-0000-0000-0000-000000000002'::uuid, '3170 N Broadway', 'Chicago', 'IL', '60657', 41.939701, -87.644738),
    ('20000000-0000-0000-0000-000000000006'::uuid, '4800 N Lincoln Avenue', 'Chicago', 'IL', '60625', 41.970395, -87.689738),
    ('20000000-0000-0000-0000-000000000010'::uuid, '2643 N Milwaukee Avenue', 'Chicago', 'IL', '60647', 41.929887, -87.708481),
    ('20000000-0000-0000-0000-000000000011'::uuid, '1765 N Elston Avenue', 'Chicago', 'IL', '60642', 41.915035, -87.664062),
    ('20000000-0000-0000-0000-000000000016'::uuid, '875 N Michigan Avenue', 'Chicago', 'IL', '60611', 41.898881, -87.623096),
    ('20000000-0000-0000-0000-000000000007'::uuid, '2000 Spring Road', 'Oak Brook', 'IL', '60523', 41.851388, -87.948373),
    ('20000000-0000-0000-0000-000000000014'::uuid, '1616 N Wells Street', 'Chicago', 'IL', '60614', 41.911659, -87.634837),
    ('20000000-0000-0000-0000-000000000017'::uuid, '1000 W Cermak Road', 'Chicago', 'IL', '60608', 41.852655, -87.651578),
    ('20000000-0000-0000-0000-000000000012'::uuid, '4636 N Ravenswood Avenue', 'Chicago', 'IL', '60640', 41.966115, -87.675068),
    ('20000000-0000-0000-0000-000000000004'::uuid, '222 W Merchandise Mart Plaza', 'Chicago', 'IL', '60654', 41.888498, -87.634456),
    ('20000000-0000-0000-0000-000000000009'::uuid, '1255 S Michigan Avenue', 'Chicago', 'IL', '60605', 41.866016, -87.623601),
    ('20000000-0000-0000-0000-000000000005'::uuid, '1000 W Washington Boulevard', 'Chicago', 'IL', '60607', 41.883344, -87.652663),
    ('20000000-0000-0000-0000-000000000008'::uuid, '1579 N Milwaukee Avenue', 'Chicago', 'IL', '60622', 41.910158, -87.676855)
) AS v(id, address_line1, city, state, postal_code, latitude, longitude)
WHERE p.id = v.id;

ALTER TABLE public.properties
  ALTER COLUMN latitude SET NOT NULL,
  ALTER COLUMN longitude SET NOT NULL;
