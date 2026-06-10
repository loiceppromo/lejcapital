#!/usr/bin/env node
/**
 * Seed users in Supabase Auth + Prisma User table.
 *
 * Creates three accounts (one per role) so you can test role-based access:
 *   - Fund Manager:  loiceppromo@gmail.com  (admin)
 *   - Operator:      operator@lejcapital.com
 *   - Investor:      investor@lejcapital.com
 *
 * Usage:
 *   node scripts/seed-users.mjs
 *
 * Requires in .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   LEJ_ADMIN_PASSWORD        — password for admin account
 *   DATABASE_URL               — Prisma connection string
 */
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import pg from 'pg';

config({ path: '.env.local' });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const adminPassword = process.env.LEJ_ADMIN_PASSWORD;
const databaseUrl = process.env.DATABASE_URL;

if (!url || !serviceKey || !adminPassword) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or LEJ_ADMIN_PASSWORD in .env.local');
  process.exit(1);
}

// Admin client bypasses RLS
const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const USERS = [
  {
    email: 'loiceppromo@gmail.com',
    name: 'Loic Eppromo',
    password: adminPassword,
    role: 'FUND_MANAGER',
  },
  {
    email: 'operator@lejcapital.com',
    name: 'LEJ Operator',
    password: adminPassword, // same password for convenience in dev
    role: 'OPERATOR',
  },
  {
    email: 'investor@lejcapital.com',
    name: 'LEJ Investor',
    password: adminPassword,
    role: 'INVESTOR',
  },
];

async function seedAuth() {
  console.log('=== Seeding Supabase Auth ===\n');

  for (const user of USERS) {
    console.log(`  ${user.email} (${user.role})...`);

    const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) {
      console.error(`    ✗ ${listError.message}`);
      continue;
    }

    const existing = existingUsers.users.find(
      (candidate) => candidate.email?.toLowerCase() === user.email.toLowerCase(),
    );

    if (existing) {
      const { error } = await supabase.auth.admin.updateUserById(existing.id, {
        password: user.password,
        email_confirm: true,
        user_metadata: { name: user.name, role: user.role },
      });

      if (error) {
        console.error(`    ✗ ${error.message}`);
      } else {
        console.log(`    ✓ Updated existing auth user.`);
      }
      continue;
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true,
      user_metadata: { name: user.name, role: user.role },
    });

    if (error) {
      console.error(`    ✗ ${error.message}`);
    } else {
      console.log(`    ✓ Created: ${data.user.id}`);
    }
  }
}

async function seedDbUsers() {
  if (!databaseUrl) {
    console.log('\n⚠ DATABASE_URL not set — skipping Prisma User table seeding.\n');
    return;
  }

  console.log('\n=== Seeding Prisma User table ===\n');

  const pool = new pg.Pool({ connectionString: databaseUrl });

  try {
    for (const user of USERS) {
      console.log(`  ${user.email} (${user.role})...`);

      // Check if user already exists
      const existing = await pool.query('SELECT id, role FROM "User" WHERE email = $1', [user.email]);

      if (existing.rows.length > 0) {
        // Update role if it changed
        if (existing.rows[0].role !== user.role) {
          await pool.query('UPDATE "User" SET role = $1, "updatedAt" = NOW() WHERE email = $2', [user.role, user.email]);
          console.log(`    ✓ Updated role to ${user.role}.`);
        } else {
          console.log(`    ✓ Already exists with correct role.`);
        }
        continue;
      }

      // Create user
      const id = `usr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      await pool.query(
        'INSERT INTO "User" (id, name, email, role, active, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, true, NOW(), NOW())',
        [id, user.name, user.email, user.role],
      );
      console.log(`    ✓ Created in User table.`);
    }
  } finally {
    await pool.end();
  }
}

async function main() {
  await seedAuth();
  await seedDbUsers();
  console.log('\n✅ Done! Users seeded for all three roles.\n');
  console.log('Test accounts:');
  for (const u of USERS) {
    console.log(`  ${u.role.padEnd(14)} ${u.email}`);
  }
  console.log(`\nAll accounts use the LEJ_ADMIN_PASSWORD.\n`);
}

main().catch(console.error);
