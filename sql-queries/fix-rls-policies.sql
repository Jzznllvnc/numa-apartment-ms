-- Fix for infinite recursion in RLS policies
-- This fixes the circular reference in user role checking

-- First, drop the problematic policies
DROP POLICY IF EXISTS "Users can view their own profile." ON users;
DROP POLICY IF EXISTS "Users can update their own profile." ON users;
DROP POLICY IF EXISTS "Admins can view all user profiles." ON users;

-- Create a security definer function to safely check user roles
CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
RETURNS user_role AS $$
DECLARE
    user_role_result user_role;
BEGIN
    SELECT role INTO user_role_result
    FROM public.users
    WHERE id = user_id;
    
    RETURN COALESCE(user_role_result, 'tenant'::user_role);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create new, safe policies for users table
CREATE POLICY "Users can view their own profile." 
ON users FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile." 
ON users FOR UPDATE 
USING (auth.uid() = id);

-- Safe admin policy using the security definer function
CREATE POLICY "Admins can view all user profiles." 
ON users FOR SELECT 
TO authenticated 
USING (
    auth.uid() = id OR 
    public.get_user_role(auth.uid()) = 'admin'
);

-- Also fix other policies that might have the same issue
DROP POLICY IF EXISTS "Admins can manage units." ON units;
CREATE POLICY "Admins can manage units." 
ON units FOR ALL 
USING (public.get_user_role(auth.uid()) = 'admin');

DROP POLICY IF EXISTS "Admins can manage all leases." ON leases;
CREATE POLICY "Admins can manage all leases." 
ON leases FOR ALL 
USING (public.get_user_role(auth.uid()) = 'admin');

DROP POLICY IF EXISTS "Admins can manage all payments." ON payments;
CREATE POLICY "Admins can manage all payments." 
ON payments FOR ALL 
USING (public.get_user_role(auth.uid()) = 'admin');

DROP POLICY IF EXISTS "Admins can manage all maintenance requests." ON maintenance_requests;
CREATE POLICY "Admins can manage all maintenance requests." 
ON maintenance_requests FOR ALL 
USING (public.get_user_role(auth.uid()) = 'admin');

DROP POLICY IF EXISTS "Admins can create announcements." ON announcements;
CREATE POLICY "Admins can create announcements." 
ON announcements FOR INSERT 
WITH CHECK (public.get_user_role(auth.uid()) = 'admin');

DROP POLICY IF EXISTS "Admins can update/delete announcements." ON announcements;
CREATE POLICY "Admins can update/delete announcements." 
ON announcements FOR UPDATE 
USING (public.get_user_role(auth.uid()) = 'admin');
