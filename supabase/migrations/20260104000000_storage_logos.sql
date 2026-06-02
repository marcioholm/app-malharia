-- ============================================================
-- ConfecOS - v4: Storage bucket for company logos
-- ============================================================

-- Create the storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'logos',
  'logos',
  true,
  5242880,
  ARRAY['image/png', 'image/jpeg', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to read any file in logos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Users can view logos'
  ) THEN
    CREATE POLICY "Users can view logos"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'logos' AND auth.role() = 'authenticated');
  END IF;
END
$$;

-- Allow authenticated users to upload files to logos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Users can upload logos'
  ) THEN
    CREATE POLICY "Users can upload logos"
      ON storage.objects FOR INSERT
      WITH CHECK (bucket_id = 'logos' AND auth.role() = 'authenticated');
  END IF;
END
$$;

-- Allow users to update files in logos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Users can update logos'
  ) THEN
    CREATE POLICY "Users can update logos"
      ON storage.objects FOR UPDATE
      USING (bucket_id = 'logos' AND auth.role() = 'authenticated')
      WITH CHECK (bucket_id = 'logos' AND auth.role() = 'authenticated');
  END IF;
END
$$;

-- Allow users to delete files from logos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Users can delete logos'
  ) THEN
    CREATE POLICY "Users can delete logos"
      ON storage.objects FOR DELETE
      USING (bucket_id = 'logos' AND auth.role() = 'authenticated');
  END IF;
END
$$;
