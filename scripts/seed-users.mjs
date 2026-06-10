#!/usr/bin/env node
/**
 * Seed the initial Fund Manager user in Supabase Auth.
 *
 * Usage:
 *   node scripts/seed-users.mjs
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY and LEJ_ADMIN_PASSWORD in .env.local
 */
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const adminPassword = process.env.LEJ_ADMIN_PASSWORD;

if (!url || !serviceKey || !adminPassword) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or LEJ_ADMIN_PASSWORD in .env.local');
  process.exit(1);
}

// Admin client bypasses RLS and can create users directly
const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const USERS = [
  {
    email: 'loiceppromo@gmail.com',
    password: adminPassword,
    user_metadata: { name: 'Loic Eppromo', role: 'FUND_MANAGER' },
  },
];

async function seed() {
  for (const user of USERS) {
    console.log(`Creating user: ${user.email}...`);

    const { data, error } = await supabase.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true, // skip email verification
      user_metadata: user.user_metadata,
    });

    if (error) {
      if (error.message.includes('already been registered')) {
        console.log(`  ⤷ Already exists, skipping.`);
      } else {
        console.error(`  ✗ ${error.message}`);
      }
    } else {
      console.log(`  ✓ Created: ${data.user.id}`);
    }
  }

  console.log('\nDone! Admin user is configured for loiceppromo@gmail.com.');
}

seed().catch(console.error);
