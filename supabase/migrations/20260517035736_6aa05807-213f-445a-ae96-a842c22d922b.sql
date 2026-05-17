-- Add 18months to license_duration enum
ALTER TYPE public.license_duration ADD VALUE IF NOT EXISTS '18months';

-- Update activate_license_key function to handle 18months
CREATE OR REPLACE FUNCTION public.activate_license_key(_license_key text)
 RETURNS TABLE(license_key text, duration license_duration, activated_at timestamp with time zone, expires_at timestamp with time zone, is_active boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  SELECT p.email INTO _profile_email FROM public.profiles p WHERE p.user_id = _user_id;
  IF _profile_email IS NULL THEN
    _profile_email := lower(COALESCE(auth.jwt() ->> 'email', ''));
  ELSE
    _profile_email := lower(_profile_email);
  END IF;

  SELECT * INTO _key_record FROM public.license_keys lk
  WHERE upper(lk.license_key) = upper(_license_key) AND lk.is_active = true FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Invalid or inactive license key'; END IF;
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
      WHEN '18months' THEN _activated_at + INTERVAL '547 days'
      WHEN 'lifetime' THEN NULL
    END;

    UPDATE public.license_keys
    SET activated_by_user_id = _user_id, activated_at = _activated_at,
        expires_at = _expires_at, updated_at = now()
    WHERE id = _key_record.id;
  END IF;

  UPDATE public.user_licenses SET is_active = false, updated_at = now()
  WHERE user_id = _user_id AND license_key_id <> _key_record.id;

  INSERT INTO public.user_licenses (user_id, license_key_id, license_key, duration, activated_at, expires_at, is_active)
  VALUES (_user_id, _key_record.id, _key_record.license_key, _key_record.duration, _activated_at, _expires_at, true)
  ON CONFLICT (user_id) DO UPDATE SET
    license_key_id = EXCLUDED.license_key_id, license_key = EXCLUDED.license_key,
    duration = EXCLUDED.duration, activated_at = EXCLUDED.activated_at,
    expires_at = EXCLUDED.expires_at, is_active = true, updated_at = now();

  RETURN QUERY SELECT _key_record.license_key, _key_record.duration, _activated_at, _expires_at, true;
END;
$function$;