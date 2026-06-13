
CREATE OR REPLACE FUNCTION public.get_public_stats()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'incidents', (SELECT count(*) FROM public.incidents),
    'resolved', (SELECT count(*) FROM public.incidents WHERE status IN ('resolved','closed')),
    'critical', (SELECT count(*) FROM public.incidents WHERE severity = 'critical'),
    'stations', (SELECT count(*) FROM public.stations),
    'zones', (SELECT count(*) FROM public.zones),
    'inspectors', (SELECT count(*) FROM public.inspectors WHERE status = 'approved'),
    'tasks', (SELECT count(*) FROM public.maintenance_tasks),
    'resolutionRate', CASE
      WHEN (SELECT count(*) FROM public.incidents) > 0
      THEN round(((SELECT count(*) FROM public.incidents WHERE status IN ('resolved','closed'))::numeric / (SELECT count(*) FROM public.incidents)::numeric) * 100)
      ELSE 0
    END
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_public_stats() TO anon, authenticated;
