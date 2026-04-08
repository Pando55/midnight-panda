DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'app_role' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'license_duration' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.license_duration AS ENUM ('3months', '6months', '12months', 'lifetime');
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

CREATE TABLE IF NOT EXISTS public.license_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_email TEXT NOT NULL,
  license_key TEXT NOT NULL UNIQUE,
  duration public.license_duration NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by_user_id UUID,
  activated_by_user_id UUID,
  activated_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT license_key_format CHECK (license_key ~ '^P-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$')
);

CREATE TABLE IF NOT EXISTS public.user_licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  license_key_id UUID NOT NULL UNIQUE REFERENCES public.license_keys(id) ON DELETE CASCADE,
  license_key TEXT NOT NULL,
  duration public.license_duration NOT NULL,
  activated_at TIMESTAMP WITH TIME ZONE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.license_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_licenses ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.assign_profile_roles()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.user_id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;

  IF lower(NEW.email) = 'mohalethapelo93@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS assign_profile_roles_trigger ON public.profiles;
CREATE TRIGGER assign_profile_roles_trigger
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.assign_profile_roles();

CREATE OR REPLACE FUNCTION public.activate_license_key(_license_key TEXT)
RETURNS TABLE (
  license_key TEXT,
  duration public.license_duration,
  activated_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id UUID := auth.uid();
  _profile_email TEXT;
  _key_record public.license_keys%ROWTYPE;
  _activated_at TIMESTAMP WITH TIME ZONE;
  _expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT p.email
  INTO _profile_email
  FROM public.profiles p
  WHERE p.user_id = _user_id;

  IF _profile_email IS NULL THEN
    _profile_email := lower(COALESCE(auth.jwt() ->> 'email', ''));
  ELSE
    _profile_email := lower(_profile_email);
  END IF;

  SELECT *
  INTO _key_record
  FROM public.license_keys lk
  WHERE upper(lk.license_key) = upper(_license_key)
    AND lk.is_active = true
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or inactive license key';
  END IF;

  IF lower(_key_record.customer_email) <> _profile_email THEN
    RAISE EXCEPTION 'This license key is assigned to a different email address';
  END IF;

  IF _key_record.activated_by_user_id IS NOT NULL AND _key_record.activated_by_user_id <> _user_id THEN
    RAISE EXCEPTION 'This license key has already been activated';
  END IF;

  _activated_at := COALESCE(_key_record.activated_at, now());
  _expires_at := _key_record.expires_at;

  IF _key_record.activated_by_user_id IS NULL THEN
    _expires_at := CASE _key_record.duration
      WHEN '3months' THEN _activated_at + INTERVAL '90 days'
      WHEN '6months' THEN _activated_at + INTERVAL '180 days'
      WHEN '12months' THEN _activated_at + INTERVAL '365 days'
      WHEN 'lifetime' THEN NULL
    END;

    UPDATE public.license_keys
    SET activated_by_user_id = _user_id,
        activated_at = _activated_at,
        expires_at = _expires_at,
        updated_at = now()
    WHERE id = _key_record.id;
  END IF;

  UPDATE public.user_licenses
  SET is_active = false,
      updated_at = now()
  WHERE user_id = _user_id
    AND license_key_id <> _key_record.id;

  INSERT INTO public.user_licenses (
    user_id,
    license_key_id,
    license_key,
    duration,
    activated_at,
    expires_at,
    is_active
  )
  VALUES (
    _user_id,
    _key_record.id,
    _key_record.license_key,
    _key_record.duration,
    _activated_at,
    _expires_at,
    true
  )
  ON CONFLICT (user_id)
  DO UPDATE SET
    license_key_id = EXCLUDED.license_key_id,
    license_key = EXCLUDED.license_key,
    duration = EXCLUDED.duration,
    activated_at = EXCLUDED.activated_at,
    expires_at = EXCLUDED.expires_at,
    is_active = true,
    updated_at = now();

  RETURN QUERY
  SELECT
    _key_record.license_key,
    _key_record.duration,
    _activated_at,
    _expires_at,
    true;
END;
$$;

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users can create own profile" ON public.profiles;
CREATE POLICY "Users can create own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND lower(email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND lower(email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
);

DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can view all license keys" ON public.license_keys;
CREATE POLICY "Admins can view all license keys"
ON public.license_keys
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can manage all license keys" ON public.license_keys;
CREATE POLICY "Admins can manage all license keys"
ON public.license_keys
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users can view own active license" ON public.user_licenses;
CREATE POLICY "Users can view own active license"
ON public.user_licenses
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all user licenses" ON public.user_licenses;
CREATE POLICY "Admins can view all user licenses"
ON public.user_licenses
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can manage all user licenses" ON public.user_licenses;
CREATE POLICY "Admins can manage all user licenses"
ON public.user_licenses
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS profiles_user_id_idx ON public.profiles (user_id);
CREATE INDEX IF NOT EXISTS profiles_email_idx ON public.profiles (email);
CREATE INDEX IF NOT EXISTS license_keys_customer_email_idx ON public.license_keys ((lower(customer_email)));
CREATE INDEX IF NOT EXISTS license_keys_license_key_idx ON public.license_keys (license_key);
CREATE INDEX IF NOT EXISTS user_licenses_user_id_idx ON public.user_licenses (user_id);

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_license_keys_updated_at ON public.license_keys;
CREATE TRIGGER update_license_keys_updated_at
BEFORE UPDATE ON public.license_keys
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_licenses_updated_at ON public.user_licenses;
CREATE TRIGGER update_user_licenses_updated_at
BEFORE UPDATE ON public.user_licenses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();