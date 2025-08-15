-- Admin-Only Storage Setup for Unit Images
-- This restricts image upload/edit/delete to admin users only

-- Allow public read access (so unit images can be displayed to everyone)
CREATE POLICY "Public read access for unit images" ON storage.objects
FOR SELECT USING (bucket_id = 'units');

-- Only allow admin users to upload, update, and delete unit images
CREATE POLICY "Admin users can manage unit images" ON storage.objects
FOR ALL USING (
  bucket_id = 'units' 
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
);

-- Verification queries (optional - run these to check setup)
-- Check if you're an admin user:
-- SELECT id, role FROM users WHERE id = auth.uid();

-- Check current policies:
-- SELECT * FROM pg_policies WHERE tablename = 'objects' AND policyname LIKE '%unit%'; 