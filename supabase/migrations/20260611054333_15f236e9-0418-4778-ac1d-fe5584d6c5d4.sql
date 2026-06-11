
-- Seed data: zones (if needed), stations, sample incidents
-- Idempotent: only inserts when target tables are empty.

DO $$
DECLARE v_count int;
BEGIN
  SELECT count(*) INTO v_count FROM public.stations;
  IF v_count = 0 THEN
    INSERT INTO public.stations (name, code, zone_id, latitude, longitude)
    SELECT s.name, s.code, z.id, s.lat, s.lng
    FROM (VALUES
      ('New Delhi','NDLS','NR',28.6428,77.2197),
      ('Mumbai Central','BCT','WR',18.9696,72.8196),
      ('Chennai Central','MAS','SR',13.0827,80.2707),
      ('Howrah','HWH','ER',22.5851,88.3426),
      ('Bangalore City','SBC','SWR',12.9784,77.5716),
      ('Lucknow','LKO','NR',26.8467,80.9462),
      ('Ahmedabad','ADI','WR',23.0225,72.5714),
      ('Patna','PNBE','ECR',25.5941,85.1376)
    ) AS s(name, code, zcode, lat, lng)
    JOIN public.zones z ON z.code = s.zcode;
  END IF;

  SELECT count(*) INTO v_count FROM public.incidents;
  IF v_count = 0 THEN
    -- need a reporter user; use any existing inspector, else skip
    IF EXISTS (SELECT 1 FROM public.inspectors LIMIT 1) THEN
      WITH r AS (SELECT user_id FROM public.inspectors ORDER BY created_at LIMIT 1),
      data AS (
        SELECT * FROM (VALUES
          ('Signal failure at Platform 3','Signal box unresponsive for 20 minutes causing train delays on Line 4','signal','critical','open','NDLS', interval '2 hours'),
          ('Track crack detected near KM 142','Hairline fracture detected during routine inspection. Requires immediate maintenance team assessment','track','high','in_progress','HWH', interval '5 hours'),
          ('Platform edge lighting failure','LED strip failure on platform 7 causing poor visibility at night','electrical','medium','resolved','BCT', interval '1 day'),
          ('Overhead wire tension critical','OHE tension dropped 40% below minimum threshold. Train services suspended on affected section','electrical','critical','open','MAS', interval '3 hours'),
          ('Platform gap exceeds safety limit','Gap between train and platform measured at 32cm, exceeds 15cm safety limit','safety','medium','resolved','SBC', interval '2 days'),
          ('Level crossing barrier malfunction','Automatic barrier not lowering on train approach. Manual override in place','signal','critical','in_progress','NDLS', interval '1 hour'),
          ('Drainage overflow on Track 4','Monsoon drainage overflow causing minor waterlogging','track','low','resolved','BCT', interval '3 days'),
          ('Fire extinguisher batch expired','12 fire extinguishers past inspection date on platforms 1 to 3','safety','medium','open','HWH', interval '4 hours'),
          ('CCTV outage in Zone B','6 cameras offline in zone B for 8 hours. Security blind spot created','electrical','medium','in_progress','MAS', interval '8 hours'),
          ('Brake anomaly reported on Train 2847','Driver reported reduced braking response on final approach. Train taken out of service','rolling_stock','critical','in_progress','NDLS', interval '30 minutes'),
          ('Roof leak in waiting hall','Heavy rain caused roof leak in main waiting hall','infrastructure','low','resolved','PNBE', interval '4 days'),
          ('Escalator malfunction Platform 2','Escalator stopped mid-operation. Passengers using stairs','infrastructure','medium','open','ADI', interval '6 hours'),
          ('Fuel spillage near fuel depot','Minor diesel spillage near fuelling bay. Cleanup crew dispatched','safety','high','in_progress','LKO', interval '2 hours'),
          ('Point failure on junction 7','Track points not switching correctly causing routing errors','signal','high','open','SBC', interval '45 minutes'),
          ('Passenger emergency alarm false trigger','False alarm triggered by passenger accidentally in coach B4','safety','low','resolved','BCT', interval '5 days')
        ) AS t(title, description, category, severity, status, scode, age)
      )
      INSERT INTO public.incidents
        (reporter_id, zone_id, station_id, title, description, category, severity, status, location_lat, location_lng, location_text, created_at, resolved_at)
      SELECT
        (SELECT user_id FROM r),
        s.zone_id,
        s.id,
        d.title, d.description,
        d.category::incident_category,
        d.severity::incident_severity,
        d.status::incident_status,
        s.latitude, s.longitude,
        s.name,
        now() - d.age,
        CASE WHEN d.status IN ('resolved','closed') THEN now() - (d.age - interval '15 minutes') ELSE NULL END
      FROM data d
      JOIN public.stations s ON s.code = d.scode;
    END IF;
  END IF;
END $$;
