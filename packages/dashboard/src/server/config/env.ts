/**
 * Centralized environment configuration with validation.
 * All process.env reads should go through this module.
 */

function requireEnv(key: string): string {
  const val = process.env[key]
  if (!val) throw new Error(`Missing required environment variable: ${key}`)
  return val
}

function optionalEnv(key: string, fallback = ''): string {
  return process.env[key] ?? fallback
}

export const env = {
  NODE_ENV: optionalEnv('NODE_ENV', 'development'),
  PORT: parseInt(optionalEnv('PORT', '5000'), 10),

  // PostgreSQL
  DATABASE_URL: optionalEnv('DATABASE_URL'),
  PGHOST: optionalEnv('PGHOST'),
  PGPORT: parseInt(optionalEnv('PGPORT', '5432'), 10),
  PGUSER: optionalEnv('PGUSER'),
  PGPASSWORD: optionalEnv('PGPASSWORD'),
  PGDATABASE: optionalEnv('PGDATABASE'),

  // JWT
  JWT_SECRET: optionalEnv('JWT_SECRET', 'change-me-in-production-use-256-bit-secret'),
  JWT_EXPIRES_IN: optionalEnv('JWT_EXPIRES_IN', '7d'),
  JWT_REFRESH_EXPIRES_IN: optionalEnv('JWT_REFRESH_EXPIRES_IN', '30d'),

  // Redis (optional — enables BullMQ job queues)
  REDIS_URL: optionalEnv('REDIS_URL'),

  // AI Provider Keys (system-level fallbacks; users can override with their own keys)
  ANTHROPIC_API_KEY: optionalEnv('ANTHROPIC_API_KEY'),
  OPENAI_API_KEY: optionalEnv('OPENAI_API_KEY'),

  // Feature flags
  ENABLE_REGISTRATION: optionalEnv('ENABLE_REGISTRATION', 'true') === 'true',
  ENABLE_JOB_QUEUE: optionalEnv('ENABLE_JOB_QUEUE', 'true') === 'true',

  // Rate limiting
  RATE_LIMIT_WINDOW_MS: parseInt(optionalEnv('RATE_LIMIT_WINDOW_MS', '900000'), 10), // 15 min
  RATE_LIMIT_MAX: parseInt(optionalEnv('RATE_LIMIT_MAX', '100'), 10),

  // CORS
  ALLOWED_ORIGINS: optionalEnv('ALLOWED_ORIGINS', ''),

  // Encryption key for storing user API keys
  ENCRYPTION_KEY: optionalEnv('ENCRYPTION_KEY', 'change-me-32-char-encryption-key!'),
} as const

export type Env = typeof env

export function isProduction(): boolean {
  return env.NODE_ENV === 'production'
}

export function hasPostgres(): boolean {
  return !!(env.DATABASE_URL || (env.PGHOST && env.PGUSER))
}

export function hasRedis(): boolean {
  return !!env.REDIS_URL
}

export function hasAnthropicKey(): boolean {
  return !!env.ANTHROPIC_API_KEY
}

export function hasOpenAIKey(): boolean {
  return !!env.OPENAI_API_KEY
}
