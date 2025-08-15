-- Migration to add image support to units table
-- Run this in your Supabase SQL Editor

-- Add image_url column to units table
ALTER TABLE units 
ADD COLUMN image_url TEXT;

-- Add comment for the new column
COMMENT ON COLUMN units.image_url IS 'URL path to the unit image stored in Supabase Storage';

-- Update existing units with a default placeholder (optional)
-- UPDATE units SET image_url = 'placeholder-unit.jpg' WHERE image_url IS NULL; 