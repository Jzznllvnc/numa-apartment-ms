# Storage Bucket Error Troubleshooting

## Error: "new row violates row-level security policy"

This error occurs when the Supabase storage bucket doesn't exist or doesn't have proper Row Level Security (RLS) policies configured.

## 🔧 Quick Fix Steps

### Step 1: Create the Storage Bucket

1. **Go to Supabase Dashboard** → **Storage**
2. **Click "Create Bucket"**
3. **Bucket name**: `units`
4. **Make it public**: ✅ Enable "Public bucket"
5. **Click "Create bucket"**

### Step 2: Set Up Storage Policies

**Option A: Using SQL Editor (Recommended)**

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Run the SQL from `supabase-storage-setup.sql`:

```sql
-- Allow public read access to unit images
CREATE POLICY "Public read access for unit images" ON storage.objects
FOR SELECT USING (bucket_id = 'units');

-- Allow authenticated users to upload unit images
CREATE POLICY "Authenticated users can upload unit images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'units' 
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to update unit images
CREATE POLICY "Authenticated users can update unit images" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'units' 
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to delete unit images
CREATE POLICY "Authenticated users can delete unit images" ON storage.objects
FOR DELETE USING (
  bucket_id = 'units' 
  AND auth.role() = 'authenticated'
);
```

**Option B: Using Dashboard**

1. Go to **Storage** → **Policies**
2. **Click "New Policy"** on `storage.objects`
3. **Create these policies**:
   - **SELECT**: `bucket_id = 'units'` (for public read)
   - **INSERT**: `bucket_id = 'units' AND auth.role() = 'authenticated'`
   - **UPDATE**: `bucket_id = 'units' AND auth.role() = 'authenticated'`
   - **DELETE**: `bucket_id = 'units' AND auth.role() = 'authenticated'`

### Step 3: Verify Setup

1. **Check bucket exists**: Storage → should see "units" bucket
2. **Check policies**: Storage → Policies → should see 4 policies for "units"
3. **Test upload**: Try uploading a unit image again

## 🔍 Additional Troubleshooting

### If you still get errors:

#### Check Authentication
```sql
-- In SQL Editor, check if you're properly authenticated
SELECT auth.uid(), auth.role();
```

#### Check User Role
```sql
-- Check your user's role in the users table
SELECT id, role FROM users WHERE id = auth.uid();
```

#### Alternative: Admin-Only Policy
If you want only admin users to upload images:

```sql
-- Delete existing policies first
DROP POLICY IF EXISTS "Authenticated users can upload unit images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update unit images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete unit images" ON storage.objects;

-- Create admin-only policy
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
```

### Bucket Configuration Issues

If the bucket was created incorrectly:

1. **Delete the bucket**: Storage → units → Settings → Delete bucket
2. **Recreate it**: Make sure "Public bucket" is enabled
3. **Re-run the policies**: Use the SQL script above

## 🚨 Common Mistakes

1. **Bucket not public**: Must enable "Public bucket" when creating
2. **Wrong bucket name**: Must be exactly "units" (case-sensitive)
3. **Missing policies**: Need at least SELECT policy for public read
4. **Authentication issues**: Make sure you're logged in as an admin user

## ✅ Verification Checklist

- [ ] Bucket "units" exists in Storage dashboard
- [ ] Bucket is marked as "Public"
- [ ] At least 4 policies exist for storage.objects with bucket_id = 'units'
- [ ] You're logged in as an authenticated user
- [ ] Your user has 'admin' role in the users table

After completing these steps, the image upload should work correctly! 