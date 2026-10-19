CREATE OR REPLACE FUNCTION public.handle_new_auth_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 INSERT INTO public.profiles(user_id,email,display_name) VALUES(NEW.id,lower(NEW.email),coalesce(NEW.raw_user_meta_data->>'name',split_part(NEW.email,'@',1)))
 ON CONFLICT(user_id) DO NOTHING;
 RETURN NEW;
EXCEPTION WHEN unique_violation THEN RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.handle_new_auth_user() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();
DROP TRIGGER IF EXISTS profiles_assign_roles ON public.profiles;
CREATE TRIGGER profiles_assign_roles AFTER INSERT OR UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.assign_profile_roles();