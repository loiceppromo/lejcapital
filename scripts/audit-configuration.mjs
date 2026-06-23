import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';

const requiredFiles = [
  'prisma/schema.prisma',
  'prisma.config.ts',
  'src/lib/env.ts',
  'src/lib/auth/server.ts',
  'src/proxy.ts',
  'vercel.json',
];

const failures = [];
for (const file of requiredFiles) {
  if (!existsSync(file)) failures.push(`Required release configuration file is absent: ${file}`);
}

const envExample = existsSync('.env.example') ? await readFile('.env.example', 'utf8') : '';
for (const variable of ['DATABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY']) {
  if (!new RegExp(`^${variable}=`, 'm').test(envExample)) {
    failures.push(`.env.example does not document ${variable}`);
  }
}

const vercelConfig = existsSync('vercel.json') ? JSON.parse(await readFile('vercel.json', 'utf8')) : null;
const headers = vercelConfig?.headers ?? [];
const allHeaderKeys = headers.flatMap((entry) => entry.headers?.map((header) => header.key) ?? []);
for (const header of ['X-Frame-Options', 'X-Content-Type-Options', 'Referrer-Policy', 'Content-Security-Policy']) {
  if (!allHeaderKeys.includes(header)) failures.push(`Vercel security header missing: ${header}`);
}

if (failures.length > 0) {
  console.error('Configuration audit failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Configuration audit passed. No environment values or secrets were read.');
