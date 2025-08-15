# 🚀 Apartment Management System Setup

## Step 1: Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Create a new project
3. Wait for the project to be ready (2-3 minutes)

## Step 2: Configure Environment Variables

1. Copy `.env.local.example` to `.env.local`:
   ```bash
   cp .env.local.example .env.local
   ```

2. Go to your Supabase Dashboard → Settings → API
3. Copy your Project URL and anon public key
4. Update `.env.local` with your actual credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```

## Step 3: Set Up Database

1. Go to your Supabase Dashboard → SQL Editor
2. Copy the entire SQL schema from `temp/SQL Schema.txt`
3. Paste and execute it in the SQL Editor
4. This will create all tables, policies, and triggers

## Step 4: Test the Setup

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Go to http://localhost:3000
3. Register a new account
4. In Supabase Dashboard → Authentication → Users, find your user
5. In Supabase Dashboard → Table Editor → users table, change your role to 'admin'
6. Try logging in again

## Troubleshooting Login Issues

If you get "Error fetching user data":

1. ✅ Check that environment variables are set in `.env.local`
2. ✅ Verify database tables exist in Supabase
3. ✅ Ensure user exists in both `auth.users` and `public.users` tables
4. ✅ Check that RLS policies are properly set up
