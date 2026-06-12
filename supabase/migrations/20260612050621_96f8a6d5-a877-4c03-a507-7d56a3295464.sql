ALTER PUBLICATION supabase_realtime ADD TABLE public.incidents;
ALTER PUBLICATION supabase_realtime ADD TABLE public.maintenance_tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER TABLE public.incidents REPLICA IDENTITY FULL;
ALTER TABLE public.maintenance_tasks REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;