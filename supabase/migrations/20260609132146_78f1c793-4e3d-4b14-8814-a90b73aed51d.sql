-- Allow public (unauthenticated) read of zones and stations for the signup form
GRANT SELECT ON public.zones TO anon;
GRANT SELECT ON public.stations TO anon;

DROP POLICY IF EXISTS "Public read zones" ON public.zones;
CREATE POLICY "Public read zones" ON public.zones FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Public read stations" ON public.stations;
CREATE POLICY "Public read stations" ON public.stations FOR SELECT TO anon USING (true);