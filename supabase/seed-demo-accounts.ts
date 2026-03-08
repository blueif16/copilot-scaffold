// Seed demo accounts for testing
// Run: npx tsx supabase/seed-demo-accounts.ts

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'http://66.42.117.148:8000';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function seedDemoAccounts() {
  console.log('Creating demo accounts...');

  const demoUsers = [
    { email: 'demo-student@omniscience.app', password: 'demo123', role: 'student' },
    { email: 'demo-teacher@omniscience.app', password: 'demo123', role: 'teacher' },
  ];

  for (const user of demoUsers) {
    try {
      // Check if user already exists
      const { data: existing } = await supabase.auth.admin.listUsers();
      const existingUser = existing?.users.find(u => u.email === user.email);

      if (existingUser) {
        console.log(`User ${user.email} already exists, skipping...`);
        continue;
      }

      // Create user
      const { data, error } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: { role: user.role }
      });

      if (error) {
        console.error(`Error creating ${user.email}:`, error.message);
      } else {
        console.log(`Created ${user.email} with role: ${user.role}`);
      }
    } catch (err) {
      console.error(`Failed to create ${user.email}:`, err);
    }
  }

  console.log('Done!');
}

seedDemoAccounts();
