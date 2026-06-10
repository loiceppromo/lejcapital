/**
 * Environment variable validation.
 * Call `validateEnv()` during server startup to fail fast on missing config.
 * In development / seed-data mode, most variables are optional.
 */

interface EnvVar {
  key: string;
  /** Required in production (when DATABASE_URL is set)? */
  requiredInProduction: boolean;
  /** Human description for error messages */
  description: string;
}

const ENV_VARS: EnvVar[] = [
  { key: 'DATABASE_URL', requiredInProduction: true, description: 'PostgreSQL connection string' },
  { key: 'NEXT_PUBLIC_SUPABASE_URL', requiredInProduction: true, description: 'Supabase project URL' },
  { key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', requiredInProduction: true, description: 'Supabase anonymous key' },
  { key: 'SUPABASE_SERVICE_ROLE_KEY', requiredInProduction: false, description: 'Supabase service role key (for admin operations)' },
];

export interface EnvValidationResult {
  valid: boolean;
  mode: 'production' | 'seed-data';
  errors: string[];
  warnings: string[];
}

export function validateEnv(): EnvValidationResult {
  if (process.env.SKIP_ENV_VALIDATION === '1') {
    return { valid: true, mode: 'seed-data', errors: [], warnings: [] };
  }

  const hasDatabase = !!process.env.DATABASE_URL;
  const mode = hasDatabase ? 'production' as const : 'seed-data' as const;
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const envVar of ENV_VARS) {
    const value = process.env[envVar.key];
    if (!value) {
      if (envVar.requiredInProduction && hasDatabase) {
        errors.push(`Missing required env var: ${envVar.key} — ${envVar.description}`);
      } else if (envVar.requiredInProduction) {
        warnings.push(`${envVar.key} not set — running in seed-data mode`);
      }
    }
  }

  // Validate DATABASE_URL format if present
  if (hasDatabase) {
    const dbUrl = process.env.DATABASE_URL!;
    if (!dbUrl.startsWith('postgres://') && !dbUrl.startsWith('postgresql://')) {
      errors.push('DATABASE_URL must start with postgres:// or postgresql://');
    }
  }

  // Validate Supabase URL format if present
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (supabaseUrl && !supabaseUrl.startsWith('https://')) {
    warnings.push('NEXT_PUBLIC_SUPABASE_URL should use HTTPS in production');
  }

  return {
    valid: errors.length === 0,
    mode,
    errors,
    warnings,
  };
}

/**
 * Log env validation result on server startup.
 * Call this from the instrumentation file or layout.
 */
export function logEnvValidation(): void {
  const result = validateEnv();

  if (result.warnings.length > 0) {
    for (const warning of result.warnings) {
      console.warn(`[LEJ env] ⚠ ${warning}`);
    }
  }

  if (!result.valid) {
    console.error('[LEJ env] ❌ Environment validation failed:');
    for (const error of result.errors) {
      console.error(`  → ${error}`);
    }
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`LEJ Capital: ${result.errors.length} environment error(s). See logs above.`);
    }
  } else {
    console.info(`[LEJ env] ✓ Running in ${result.mode} mode`);
  }
}
