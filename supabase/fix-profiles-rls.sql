-- Fix RLS policies for profiles table
-- Drop existing policies
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Create more permissive policy for authenticated users
-- Allow authenticated users to read their own profile
CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Allow authenticated users to update their own profile
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Also allow anon to read (needed for initial load)
CREATE POLICY "Anon can read profiles" ON public.profiles
  FOR SELECT
  TO anon
  USING (true);
