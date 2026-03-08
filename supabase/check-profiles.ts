// Check demo accounts profile status
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'http://66.42.117.148:8000';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkProfiles() {
  const { data: users } = await supabase.auth.admin.listUsers();

  const demoUsers = users?.users.filter(u =>
    u.email === 'demo-student@omniscience.app' ||
    u.email === 'demo-teacher@omniscience.app'
  );

  console.log('Demo users in auth.users:');
  for (const u of demoUsers || []) {
    console.log(`  - ${u.email}: id=${u.id}`);
  }

  // Check profiles
  const userIds = demoUsers?.map(u => u.id) || [];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .in('id', userIds);

  console.log('\nProfiles:');
  if (profiles?.length === 0) {
    console.log('  No profiles found!');
  } else {
    for (const p of profiles || []) {
      console.log(`  - id=${p.id}: role=${p.role}, display_name=${p.display_name}`);
    }
  }

  // Find users without profiles
  const profileIds = profiles?.map(p => p.id) || [];
  const missing = demoUsers?.filter(u => !profileIds.includes(u.id)) || [];
  if (missing.length > 0) {
    console.log('\nUsers without profiles:');
    for (const u of missing) {
      console.log(`  - ${u.email}`);
    }
  }
}

checkProfiles();
