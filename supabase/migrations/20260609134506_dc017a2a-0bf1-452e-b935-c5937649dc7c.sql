
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'maintenance';

DO $$ BEGIN CREATE TYPE public.incident_severity AS ENUM ('low','medium','high','critical'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.incident_status AS ENUM ('open','triaged','in_progress','awaiting_verification','resolved','closed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.incident_category AS ENUM ('signal','track','rolling_stock','safety','infrastructure','passenger','electrical','other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.asset_type AS ENUM ('track','signal','bridge','platform','rolling_stock','electrical','crossing','other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.asset_status AS ENUM ('operational','needs_attention','critical','under_maintenance','decommissioned'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.task_status AS ENUM ('assigned','accepted','in_progress','awaiting_verification','completed','rejected'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.task_priority AS ENUM ('low','medium','high','critical'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  zone_id UUID REFERENCES public.zones(id) ON DELETE SET NULL,
  station_id UUID REFERENCES public.stations(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category public.incident_category NOT NULL DEFAULT 'other',
  severity public.incident_severity NOT NULL DEFAULT 'medium',
  status public.incident_status NOT NULL DEFAULT 'open',
  location_lat DOUBLE PRECISION,
  location_lng DOUBLE PRECISION,
  location_text TEXT,
  ai_summary TEXT,
  ai_severity public.incident_severity,
  ai_suggested_actions TEXT,
  ai_categories TEXT[],
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.incidents TO authenticated;
GRANT ALL ON public.incidents TO service_role;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read visible incidents" ON public.incidents FOR SELECT TO authenticated USING (reporter_id = auth.uid() OR assigned_to = auth.uid() OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "Insert own incidents" ON public.incidents FOR INSERT TO authenticated WITH CHECK (reporter_id = auth.uid());
CREATE POLICY "Reporter updates own" ON public.incidents FOR UPDATE TO authenticated USING (reporter_id = auth.uid());
CREATE POLICY "Admin manages incidents" ON public.incidents FOR ALL TO authenticated USING (public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "Assignee updates incident" ON public.incidents FOR UPDATE TO authenticated USING (assigned_to = auth.uid());
CREATE INDEX IF NOT EXISTS incidents_reporter_idx ON public.incidents(reporter_id);
CREATE INDEX IF NOT EXISTS incidents_zone_idx ON public.incidents(zone_id);
CREATE INDEX IF NOT EXISTS incidents_status_idx ON public.incidents(status);
CREATE TRIGGER incidents_set_updated BEFORE UPDATE ON public.incidents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.incident_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  mime_type TEXT,
  kind TEXT NOT NULL DEFAULT 'photo',
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.incident_media TO authenticated;
GRANT ALL ON public.incident_media TO service_role;
ALTER TABLE public.incident_media ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read media on visible" ON public.incident_media FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.incidents i WHERE i.id = incident_id AND (i.reporter_id = auth.uid() OR i.assigned_to = auth.uid() OR public.has_role(auth.uid(),'super_admin'))));
CREATE POLICY "Insert media own" ON public.incident_media FOR INSERT TO authenticated WITH CHECK (
  uploaded_by = auth.uid() AND EXISTS (SELECT 1 FROM public.incidents i WHERE i.id = incident_id AND (i.reporter_id = auth.uid() OR i.assigned_to = auth.uid() OR public.has_role(auth.uid(),'super_admin'))));

CREATE TABLE IF NOT EXISTS public.assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID REFERENCES public.zones(id) ON DELETE SET NULL,
  station_id UUID REFERENCES public.stations(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  code TEXT UNIQUE,
  type public.asset_type NOT NULL DEFAULT 'other',
  location_lat DOUBLE PRECISION,
  location_lng DOUBLE PRECISION,
  installation_date DATE,
  last_inspection_date DATE,
  health_score INTEGER NOT NULL DEFAULT 100 CHECK (health_score BETWEEN 0 AND 100),
  status public.asset_status NOT NULL DEFAULT 'operational',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assets TO authenticated;
GRANT ALL ON public.assets TO service_role;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read assets" ON public.assets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manages assets" ON public.assets FOR ALL TO authenticated USING (public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin'));
CREATE TRIGGER assets_set_updated BEFORE UPDATE ON public.assets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.maintenance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  performed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  notes TEXT,
  performed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  next_due_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.maintenance_logs TO authenticated;
GRANT ALL ON public.maintenance_logs TO service_role;
ALTER TABLE public.maintenance_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read mlogs" ON public.maintenance_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manages mlogs" ON public.maintenance_logs FOR ALL TO authenticated USING (public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin'));

CREATE TABLE IF NOT EXISTS public.maintenance_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  assigned_to UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  priority public.task_priority NOT NULL DEFAULT 'medium',
  status public.task_status NOT NULL DEFAULT 'assigned',
  due_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  verified_at TIMESTAMPTZ,
  before_photos TEXT[],
  after_photos TEXT[],
  notes TEXT,
  completion_report TEXT,
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.maintenance_tasks TO authenticated;
GRANT ALL ON public.maintenance_tasks TO service_role;
ALTER TABLE public.maintenance_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read related tasks" ON public.maintenance_tasks FOR SELECT TO authenticated USING (
  assigned_to = auth.uid() OR public.has_role(auth.uid(),'super_admin')
  OR EXISTS (SELECT 1 FROM public.incidents i WHERE i.id = incident_id AND i.reporter_id = auth.uid()));
CREATE POLICY "Assignee updates task" ON public.maintenance_tasks FOR UPDATE TO authenticated USING (assigned_to = auth.uid());
CREATE POLICY "Admin manages tasks" ON public.maintenance_tasks FOR ALL TO authenticated USING (public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin'));
CREATE INDEX IF NOT EXISTS tasks_assigned_idx ON public.maintenance_tasks(assigned_to);
CREATE TRIGGER tasks_set_updated BEFORE UPDATE ON public.maintenance_tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User reads own notif" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "User updates own notif" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Insert notif" ON public.notifications FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'super_admin') OR user_id = auth.uid());
CREATE INDEX IF NOT EXISTS notif_user_idx ON public.notifications(user_id, read, created_at DESC);

CREATE TABLE IF NOT EXISTS public.ai_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID REFERENCES public.incidents(id) ON DELETE CASCADE,
  model TEXT NOT NULL,
  output JSONB,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_runs TO authenticated;
GRANT ALL ON public.ai_runs TO service_role;
ALTER TABLE public.ai_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read ai runs" ON public.ai_runs FOR SELECT TO authenticated USING (
  created_by = auth.uid() OR public.has_role(auth.uid(),'super_admin')
  OR EXISTS (SELECT 1 FROM public.incidents i WHERE i.id = incident_id AND i.reporter_id = auth.uid()));
CREATE POLICY "Insert own ai run" ON public.ai_runs FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_full_name TEXT; v_employee_id TEXT; v_phone TEXT; v_designation TEXT;
  v_zone_id UUID; v_avatar_url TEXT; v_role TEXT; v_is_super BOOLEAN;
BEGIN
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email);
  v_employee_id := NEW.raw_user_meta_data->>'employee_id';
  v_phone := NEW.raw_user_meta_data->>'phone';
  v_designation := NEW.raw_user_meta_data->>'designation';
  v_avatar_url := NEW.raw_user_meta_data->>'avatar_url';
  v_role := COALESCE(NEW.raw_user_meta_data->>'role','inspector');
  BEGIN v_zone_id := NULLIF(NEW.raw_user_meta_data->>'zone_id','')::uuid;
  EXCEPTION WHEN OTHERS THEN v_zone_id := NULL; END;

  v_is_super := lower(NEW.email) = 'vk1719676@gmail.com';

  INSERT INTO public.profiles (id, full_name, email, phone, employee_id, designation, avatar_url)
  VALUES (NEW.id, v_full_name, NEW.email, v_phone, v_employee_id, v_designation, v_avatar_url);

  IF v_is_super THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'super_admin') ON CONFLICT DO NOTHING;
  ELSIF v_role = 'maintenance' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'maintenance') ON CONFLICT DO NOTHING;
    INSERT INTO public.inspectors (user_id, full_name, email, employee_id, phone, designation, zone_id, avatar_url, status)
    VALUES (NEW.id, v_full_name, NEW.email, v_employee_id, v_phone, COALESCE(v_designation,'Maintenance Staff'), v_zone_id, v_avatar_url, 'pending');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'inspector') ON CONFLICT DO NOTHING;
    INSERT INTO public.inspectors (user_id, full_name, email, employee_id, phone, designation, zone_id, avatar_url, status)
    VALUES (NEW.id, v_full_name, NEW.email, v_employee_id, v_phone, v_designation, v_zone_id, v_avatar_url, 'pending');
  END IF;

  RETURN NEW;
END;
$$;
