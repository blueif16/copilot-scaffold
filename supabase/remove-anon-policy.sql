-- Remove anon profile policy (no longer needed since auth works)
DROP POLICY IF EXISTS "Anon can read profiles" ON public.profiles;

-- Verify remaining policies
SELECT policyname, cmd, qual FROM pg_policies
WHERE tablename = 'profiles' AND schemaname = 'public';
