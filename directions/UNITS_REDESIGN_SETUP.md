# Units Page Redesign Setup Guide

## Overview
The units page has been redesigned with a new card layout featuring:
- **Image on top** of each card
- **Portrait layout** (taller cards)
- **New information hierarchy**: Rent amount → Unit number → Floor → Bed/Bath/Size with icons
- **Status badge** overlaid on the image
- **Edit/Delete buttons** positioned outside the top-right corner
- **Image upload** functionality in the unit form

## Setup Instructions

### 1. Database Migration
Run the SQL migration to add image support to your units table:

```sql
-- Add image_url column to units table
ALTER TABLE units 
ADD COLUMN image_url TEXT;

-- Add comment for the new column
COMMENT ON COLUMN units.image_url IS 'URL path to the unit image stored in Supabase Storage';
```

### 2. Create Supabase Storage Bucket

1. **Go to Supabase Dashboard** → Storage
2. **Create a new bucket** named `units`
3. **Set bucket to public** (so images can be displayed)
4. **Configure bucket policies** (optional, for more control):

```sql
-- Allow public read access to unit images
CREATE POLICY "Public read access for unit images" ON storage.objects
FOR SELECT USING (bucket_id = 'units');

-- Allow authenticated users to upload unit images
CREATE POLICY "Authenticated users can upload unit images" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'units' AND auth.role() = 'authenticated');

-- Allow authenticated users to update unit images
CREATE POLICY "Authenticated users can update unit images" ON storage.objects
FOR UPDATE USING (bucket_id = 'units' AND auth.role() = 'authenticated');

-- Allow authenticated users to delete unit images
CREATE POLICY "Authenticated users can delete unit images" ON storage.objects
FOR DELETE USING (bucket_id = 'units' AND auth.role() = 'authenticated');
```

### 3. Add Placeholder Image

A placeholder image has been created for units without photos:

1. **Already included**: `public/placeholder-unit.svg` - A simple building icon placeholder
2. **Alternative options**: You can replace this with:
   - A custom image (400x300px recommended)
   - A stock image of an apartment interior
   - A branded placeholder with your company logo

The current placeholder shows a simple building outline with windows and includes helpful text indicating that users can upload a photo to replace it.

### 4. Update Next.js Configuration

Make sure your `next.config.js` includes your Supabase domain for images:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      'your-supabase-project.supabase.co', // Replace with your actual domain
      'via.placeholder.com' // For placeholder images
    ],
  },
}

module.exports = nextConfig
```

### 5. Test the Setup

1. **Go to Admin → Units page**
2. **Click "Add Unit"** to test image upload
3. **Upload an image** to verify storage works
4. **Check that images display** properly in the cards
5. **Test edit/delete** functionality with the new button positioning

## Features Included

### ✅ New Card Layout
- **420px height** for portrait orientation
- **Image section**: 192px height (48% of card)
- **Content section**: 172px height with proper spacing
- **Hover effects**: Shadow and button visibility transitions

### ✅ Image Management
- **Upload validation**: 5MB max, image files only
- **Storage integration**: Supabase storage with signed URLs
- **Preview functionality**: Real-time preview during upload
- **Error handling**: Graceful fallbacks to placeholder

### ✅ Enhanced UX
- **Floating action buttons**: Edit/delete buttons appear on hover
- **Status badge overlay**: Positioned on top-left of image
- **Icon-based details**: Bed, Bath, and Square footage with lucide icons
- **Responsive grid**: 1-4 columns based on screen size

### ✅ Database Integration
- **Image field added**: `image_url` in units table
- **Storage cleanup**: Images deleted when units are removed
- **Optimistic updates**: UI updates immediately with local preview

## Troubleshooting

### Images Not Loading
- Check Supabase storage bucket is public
- Verify bucket policies allow read access
- Ensure correct domain in `next.config.js`

### Upload Errors
- Check file size (must be < 5MB)
- Verify file type is an image
- Ensure user is authenticated
- Check bucket exists and has write permissions

### Storage Bucket Issues
- Make sure bucket is named exactly `units`
- Check bucket is set to public
- Verify storage policies are correctly configured

## Storage Bucket Structure
```
units/
├── 1640995200000-abc123.jpg
├── 1640995260000-def456.png
└── 1640995320000-ghi789.jpg
```

Files are named with timestamp and random string to avoid conflicts.

## Next Steps

1. **Add bulk image upload** for multiple units
2. **Image optimization** (resize, compress automatically)
3. **Multiple images per unit** (gallery view)
4. **Image categories** (exterior, interior, amenities)
5. **AI-generated descriptions** based on uploaded images

---

The redesigned units page now provides a modern, visual approach to property management with an improved user experience and better visual hierarchy. 