
-- ========== ENUMS ==========
CREATE TYPE public.app_role AS ENUM ('super_admin', 'inspector');
CREATE TYPE public.inspector_status AS ENUM ('pending', 'approved', 'rejected', 'suspended');

-- ========== PROFILES ==========
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  employee_id TEXT,
  designation TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ========== USER ROLES ==========
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- ========== ZONES ==========
CREATE TABLE public.zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  region TEXT,
  headquarters TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.zones TO authenticated;
GRANT ALL ON public.zones TO service_role;
ALTER TABLE public.zones ENABLE ROW LEVEL SECURITY;

-- ========== STATIONS ==========
CREATE TABLE public.stations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID NOT NULL REFERENCES public.zones(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  division TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.stations TO authenticated;
GRANT ALL ON public.stations TO service_role;
ALTER TABLE public.stations ENABLE ROW LEVEL SECURITY;

-- ========== INSPECTORS ==========
CREATE TABLE public.inspectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  employee_id TEXT,
  phone TEXT,
  designation TEXT,
  zone_id UUID REFERENCES public.zones(id) ON DELETE SET NULL,
  avatar_url TEXT,
  status public.inspector_status NOT NULL DEFAULT 'pending',
  rejection_reason TEXT,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.inspectors TO authenticated;
GRANT ALL ON public.inspectors TO service_role;
ALTER TABLE public.inspectors ENABLE ROW LEVEL SECURITY;

-- ========== POLICIES ==========
-- profiles
CREATE POLICY "Users read own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Admins update any profile" ON public.profiles
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));

-- user_roles
CREATE POLICY "Users read own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Admins manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- zones
CREATE POLICY "Auth read zones" ON public.zones
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage zones" ON public.zones
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- stations
CREATE POLICY "Auth read stations" ON public.stations
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage stations" ON public.stations
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- inspectors
CREATE POLICY "Inspectors read own" ON public.inspectors
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Admins update inspectors" ON public.inspectors
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Users update own inspector" ON public.inspectors
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ========== updated_at trigger ==========
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER profiles_set_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER inspectors_set_updated BEFORE UPDATE ON public.inspectors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER zones_set_updated BEFORE UPDATE ON public.zones
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER stations_set_updated BEFORE UPDATE ON public.stations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========== Handle new user trigger ==========
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_full_name TEXT;
  v_employee_id TEXT;
  v_phone TEXT;
  v_designation TEXT;
  v_zone_id UUID;
  v_avatar_url TEXT;
  v_is_super BOOLEAN;
BEGIN
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email);
  v_employee_id := NEW.raw_user_meta_data->>'employee_id';
  v_phone := NEW.raw_user_meta_data->>'phone';
  v_designation := NEW.raw_user_meta_data->>'designation';
  v_avatar_url := NEW.raw_user_meta_data->>'avatar_url';
  BEGIN
    v_zone_id := NULLIF(NEW.raw_user_meta_data->>'zone_id', '')::uuid;
  EXCEPTION WHEN OTHERS THEN v_zone_id := NULL;
  END;

  v_is_super := lower(NEW.email) = 'vk1719676@gmail.com';

  INSERT INTO public.profiles (id, full_name, email, phone, employee_id, designation, avatar_url)
  VALUES (NEW.id, v_full_name, NEW.email, v_phone, v_employee_id, v_designation, v_avatar_url);

  IF v_is_super THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'super_admin')
    ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'inspector')
    ON CONFLICT DO NOTHING;

    INSERT INTO public.inspectors (
      user_id, full_name, email, employee_id, phone, designation, zone_id, avatar_url, status
    ) VALUES (
      NEW.id, v_full_name, NEW.email, v_employee_id, v_phone, v_designation, v_zone_id, v_avatar_url, 'pending'
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ========== Seed Indian Railway zones ==========
INSERT INTO public.zones (name, code, region, headquarters) VALUES
  ('Central Railway', 'CR', 'West', 'Mumbai CSMT'),
  ('Eastern Railway', 'ER', 'East', 'Kolkata'),
  ('East Central Railway', 'ECR', 'East', 'Hajipur'),
  ('East Coast Railway', 'ECoR', 'East', 'Bhubaneswar'),
  ('Northern Railway', 'NR', 'North', 'New Delhi'),
  ('North Central Railway', 'NCR', 'North', 'Prayagraj'),
  ('North Eastern Railway', 'NER', 'North East', 'Gorakhpur'),
  ('Northeast Frontier Railway', 'NFR', 'North East', 'Guwahati'),
  ('North Western Railway', 'NWR', 'North West', 'Jaipur'),
  ('Southern Railway', 'SR', 'South', 'Chennai'),
  ('South Central Railway', 'SCR', 'South', 'Secunderabad'),
  ('South Eastern Railway', 'SER', 'East', 'Kolkata'),
  ('South East Central Railway', 'SECR', 'Central', 'Bilaspur'),
  ('South Western Railway', 'SWR', 'South West', 'Hubballi'),
  ('Western Railway', 'WR', 'West', 'Mumbai Churchgate'),
  ('West Central Railway', 'WCR', 'Central', 'Jabalpur'),
  ('Konkan Railway', 'KR', 'West', 'Navi Mumbai');
