// Debug RLS policies - check what's happening with profiles table
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'http://66.42.117.148:8000';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkRLS() {
  // Check existing RLS policies
  const { data: policies } = await supabase.rpc('pg_catalog.pg_policies', {
    tablename: 'profiles',
    schemaname: 'public'
  });

  console.log('RLS Policies on profiles table:');
  const { data } = await supabase.from('pg_tables').select('*').eq('schemaname', 'public').eq('tablename', 'profiles');
  console.log('Table info:', data);

  // Check if RLS is enabled
  const { data: rlsStatus } = await supabase.from('pg_tables').select('rowsecurity').eq('schemaname', 'public').eq('tablename', 'profiles');
  console.log('RLS enabled:', rlsStatus);

  // Test direct profile read with service role (should work)
  const teacherId = '3af3f473-faeb-4a53-bef6-ad948f995fd5';
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', teacherId)
    .single();

  console.log('Profile with service role:', profile, error);
}

checkRLS();
