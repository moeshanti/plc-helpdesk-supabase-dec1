-- Create the 'attachments' bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('attachments', 'attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Policy to allow public read access to all files in the 'attachments' bucket
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'attachments' );

-- Policy to allow authenticated users to upload files to the 'attachments' bucket
CREATE POLICY "Authenticated Users can Upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'attachments' AND
  auth.role() = 'authenticated'
);

-- Policy to allow users to update their own files (optional, but good for completeness)
CREATE POLICY "Users can Update Own Files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'attachments' AND
  auth.uid() = owner
);

-- Policy to allow users to delete their own files
CREATE POLICY "Users can Delete Own Files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'attachments' AND
  auth.uid() = owner
);
