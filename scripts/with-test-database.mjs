import { spawnSync } from 'node:child_process';

const testUrl = process.env.TEST_DATABASE_URL;
const productionUrl = process.env.DATABASE_URL;

if (!testUrl) {
  console.error('TEST_DATABASE_URL is required. Refusing to run a database-changing test without an isolated database.');
  process.exit(1);
}
if (testUrl === productionUrl) {
  console.error('TEST_DATABASE_URL matches DATABASE_URL. Refusing to run against the production-connected database.');
  process.exit(1);
}

const [, , command, ...args] = process.argv;
if (!command) {
  console.error('Usage: node scripts/with-test-database.mjs <command> [args...]');
  process.exit(1);
}

const result = spawnSync(command, args, {
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: {
    ...process.env,
    DATABASE_URL: testUrl,
    DIRECT_URL: testUrl,
    LEJ_ALLOW_DB_SEED_MODE: '0',
    NODE_ENV: 'test',
  },
});

process.exit(result.status ?? 1);
