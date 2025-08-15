-- Supabase Storage Setup for Unit Images
-- Run this in your Supabase SQL Editor

-- First, create the storage bucket if it doesn't exist
-- (You can also do this in the Supabase Dashboard: Storage > Create Bucket)
-- Name: "units", Public: true

-- Set up Row Level Security policies for the storage bucket

-- 1. Allow public read access to unit images (so they can be displayed)
CREATE POLICY "Public read access for unit images" ON storage.objects
FOR SELECT USING (bucket_id = 'units');

-- 2. Allow authenticated users to upload unit images
CREATE POLICY "Authenticated users can upload unit images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'units' 
  AND auth.role() = 'authenticated'
);

-- 3. Allow authenticated users to update unit images
CREATE POLICY "Authenticated users can update unit images" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'units' 
  AND auth.role() = 'authenticated'
);

-- 4. Allow authenticated users to delete unit images
CREATE POLICY "Authenticated users can delete unit images" ON storage.objects
FOR DELETE USING (
  bucket_id = 'units' 
  AND auth.role() = 'authenticated'
);

-- Alternative: More restrictive policy that only allows admin users
-- Uncomment the lines below and comment out the policies above if you want only admins to manage images

/*
-- Only allow admin users to manage unit images
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
*/ 