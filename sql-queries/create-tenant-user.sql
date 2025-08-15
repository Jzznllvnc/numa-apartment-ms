-- Script to manually create a tenant user for testing
-- Note: This is for testing purposes. In production, users should register through the app.

-- Step 1: First, create the auth user (you can also do this through the Supabase Auth UI)
-- Go to Supabase Dashboard -> Authentication -> Users -> Add User
-- Email: tenant@example.com
-- Password: password123
-- Or use the register page at /register

-- Step 2: After creating the auth user, get their UUID from the auth.users table
-- You can find this in: Supabase Dashboard -> Authentication -> Users

-- Step 3: Insert the user profile into the public.users table
-- Replace 'YOUR_USER_UUID_HERE' with the actual UUID from step 2

/*
INSERT INTO public.users (id, full_name, phone_number, role, avatar_url) 
VALUES (
    'YOUR_USER_UUID_HERE',  -- Replace with actual UUID
    'John Doe',
    '+1-555-0123',
    'tenant',
    NULL
);
*/

-- Alternative: Update an existing user to be a tenant
-- UPDATE public.users SET role = 'tenant' WHERE email = 'tenant@example.com';

-- Recommended approach: Use the register page
-- 1. Go to http://localhost:3000/register
-- 2. Fill out the form:
--    - Full Name: John Doe
--    - Email: tenant@example.com  
--    - Phone: +1-555-0123
--    - Password: password123
-- 3. The trigger will automatically create the user profile
-- 4. User will be created with 'tenant' role by default

-- To verify the user was created:
-- SELECT * FROM public.users WHERE role = 'tenant';
