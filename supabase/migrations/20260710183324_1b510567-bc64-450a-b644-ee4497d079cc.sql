
-- 1. Restrict EXECUTE on SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.assign_profile_roles() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.activate_license_key(text) FROM PUBLIC, anon;
-- has_role remains callable by authenticated (needed inside RLS policies).
-- activate_license_key remains callable by authenticated (user RPC).
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.activate_license_key(text) TO authenticated;

-- 2. Storage: add UPDATE policy scoped to file owner for chart-uploads
CREATE POLICY "Users can update own charts"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'chart-uploads' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'chart-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 3. Realtime: restrict channel subscriptions to authenticated users on known chat topic
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read community-chat channel"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  (realtime.topic() = 'community-chat')
  AND (extension IN ('broadcast', 'presence', 'postgres_changes'))
);

CREATE POLICY "Authenticated can send to community-chat channel"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  (realtime.topic() = 'community-chat')
  AND (extension IN ('broadcast', 'presence'))
);
