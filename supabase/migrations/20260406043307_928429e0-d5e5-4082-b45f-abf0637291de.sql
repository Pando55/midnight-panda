-- Create storage bucket for chart uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('chart-uploads', 'chart-uploads', false, 5242880);

-- Allow authenticated users to upload charts
CREATE POLICY "Authenticated users can upload charts"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'chart-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow authenticated users to read their own charts
CREATE POLICY "Users can read own charts"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'chart-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow users to delete their own charts
CREATE POLICY "Users can delete own charts"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'chart-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);