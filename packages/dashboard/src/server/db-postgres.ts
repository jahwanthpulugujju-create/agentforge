/**
 * PostgreSQL client pool for the production database layer.
 *
 * Provides:
 * - Connection pooling via pg.Pool
 * - Schema bootstrap (users, api_keys, review_jobs, etc.)
 * - Typed query helpers
 * - Graceful fallback when DATABASE_URL is not set
 */

import pg from 'pg'
import { env } from './config/env.js'
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

const { Pool } = pg

let pool: pg.Pool | null = null

export function getPool(): pg.Pool {
  if (!pool) {
    throw new Error('PostgreSQL pool not initialized. Call initPostgres() first.')
  }
  return pool
}

export async function initPostgres(): Promise<boolean> {
  if (!env.DATABASE_URL && !env.PGHOST) {
    console.log('  PostgreSQL:        not configured (set DATABASE_URL to enable)')
    return false
  }

  try {
    const config: pg.PoolConfig = env.DATABASE_URL
      ? { connectionString: env.DATABASE_URL, ssl: env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false }
      : {
          host: env.PGHOST,
          port: env.PGPORT,
          user: env.PGUSER,
          password: env.PGPASSWORD,
          database: env.PGDATABASE,
          ssl: false,
        }

    pool = new Pool({
      ...config,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    })

    pool.on('error', (err) => {
      console.error('PostgreSQL pool error:', err)
    })

    await pool.query('SELECT 1')
    await runMigrations(pool)

    console.log('  PostgreSQL:        connected ✓')
    return true
  } catch (err) {
    console.error('  PostgreSQL:        connection failed —', (err as Error).message)
    pool = null
    return false
  }
}

export async function closePostgres(): Promise<void> {
  if (pool) {
    await pool.end()
    pool = null
  }
}

export function isPostgresAvailable(): boolean {
  return pool !== null
}

// ── Schema migrations ──

const MIGRATIONS = [
  {
    version: 1,
    description: 'Initial production schema — users, api_keys, review_jobs',
    sql: `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        description TEXT NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL DEFAULT '',
        plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'team', 'enterprise')),
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        is_verified BOOLEAN NOT NULL DEFAULT FALSE,
        avatar_url TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

      CREATE TABLE IF NOT EXISTS user_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash TEXT UNIQUE NOT NULL,
        refresh_token_hash TEXT UNIQUE,
        ip_address TEXT,
        user_agent TEXT,
        last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_sessions_user ON user_sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(token_hash);

      CREATE TABLE IF NOT EXISTS user_api_keys (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        provider TEXT NOT NULL CHECK (provider IN ('anthropic', 'openai', 'google', 'mistral')),
        name TEXT NOT NULL DEFAULT 'default',
        key_encrypted TEXT NOT NULL,
        key_prefix TEXT NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        last_used_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(user_id, provider, name)
      );
      CREATE INDEX IF NOT EXISTS idx_api_keys_user ON user_api_keys(user_id);

      CREATE TABLE IF NOT EXISTS review_jobs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status TEXT NOT NULL DEFAULT 'pending'
          CHECK (status IN ('pending', 'queued', 'running', 'completed', 'failed', 'cancelled')),
        diff_content TEXT,
        repo_url TEXT,
        branch TEXT,
        pr_number INTEGER,
        config JSONB NOT NULL DEFAULT '{}',
        result JSONB,
        error_message TEXT,
        model TEXT NOT NULL DEFAULT 'claude-opus-4-5',
        provider TEXT NOT NULL DEFAULT 'anthropic',
        phase TEXT NOT NULL DEFAULT 'pending',
        phase_number INTEGER NOT NULL DEFAULT 0,
        total_phases INTEGER NOT NULL DEFAULT 8,
        progress_percent INTEGER NOT NULL DEFAULT 0,
        tokens_used INTEGER NOT NULL DEFAULT 0,
        cost_usd NUMERIC(10, 6) NOT NULL DEFAULT 0,
        worker_id TEXT,
        started_at TIMESTAMPTZ,
        completed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_jobs_user ON review_jobs(user_id);
      CREATE INDEX IF NOT EXISTS idx_jobs_status ON review_jobs(status);
      CREATE INDEX IF NOT EXISTS idx_jobs_created ON review_jobs(created_at DESC);

      CREATE TABLE IF NOT EXISTS review_findings_pg (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        job_id UUID NOT NULL REFERENCES review_jobs(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low', 'info')),
        file_path TEXT,
        line_start INTEGER,
        line_end INTEGER,
        summary TEXT,
        code_snippet TEXT,
        suggestion TEXT,
        is_blocker BOOLEAN NOT NULL DEFAULT FALSE,
        reviewer_persona TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_findings_job ON review_findings_pg(job_id);
      CREATE INDEX IF NOT EXISTS idx_findings_severity ON review_findings_pg(severity);

      CREATE TABLE IF NOT EXISTS job_events (
        id BIGSERIAL PRIMARY KEY,
        job_id UUID NOT NULL REFERENCES review_jobs(id) ON DELETE CASCADE,
        event_type TEXT NOT NULL,
        payload JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_job_events_job ON job_events(job_id);

      CREATE TABLE IF NOT EXISTS audit_log (
        id BIGSERIAL PRIMARY KEY,
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        action TEXT NOT NULL,
        resource_type TEXT,
        resource_id TEXT,
        ip_address TEXT,
        user_agent TEXT,
        metadata JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id);
      CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_log(action);
      CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at DESC);
    `,
  },
  {
    version: 2,
    description: 'Organizations and team support',
    sql: `
      CREATE TABLE IF NOT EXISTS organizations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        plan TEXT NOT NULL DEFAULT 'free',
        max_members INTEGER NOT NULL DEFAULT 5,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS org_members (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
        joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(org_id, user_id)
      );
      CREATE INDEX IF NOT EXISTS idx_org_members_org ON org_members(org_id);
      CREATE INDEX IF NOT EXISTS idx_org_members_user ON org_members(user_id);

      ALTER TABLE review_jobs ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
    `,
  },
]

async function runMigrations(p: pg.Pool): Promise<void> {
  await p.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      description TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)

  const { rows } = await p.query<{ version: number }>(
    'SELECT version FROM schema_migrations ORDER BY version'
  )
  const appliedVersions = new Set(rows.map((r) => r.version))

  for (const migration of MIGRATIONS) {
    if (appliedVersions.has(migration.version)) continue

    const client = await p.connect()
    try {
      await client.query('BEGIN')
      await client.query(migration.sql)
      await client.query(
        'INSERT INTO schema_migrations (version, description) VALUES ($1, $2)',
        [migration.version, migration.description]
      )
      await client.query('COMMIT')
      console.log(`  DB migration v${migration.version}: ${migration.description}`)
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  }
}

// ── Encryption helpers for API keys ──

function getEncryptionKey(): Buffer {
  const key = env.ENCRYPTION_KEY
  return Buffer.from(key.slice(0, 32).padEnd(32, '0'), 'utf-8')
}

export function encryptApiKey(plaintext: string): string {
  const key = getEncryptionKey()
  const iv = randomBytes(16)
  const cipher = createCipheriv('aes-256-cbc', key, iv)
  let encrypted = cipher.update(plaintext, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return iv.toString('hex') + ':' + encrypted
}

export function decryptApiKey(encrypted: string): string {
  const [ivHex, data] = encrypted.split(':')
  if (!ivHex || !data) throw new Error('Invalid encrypted format')
  const key = getEncryptionKey()
  const iv = Buffer.from(ivHex, 'hex')
  const decipher = createDecipheriv('aes-256-cbc', key, iv)
  let decrypted = decipher.update(data, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}

// ── Typed query helpers ──

export type UserRow = {
  id: string
  email: string
  password_hash: string
  name: string
  plan: string
  is_active: boolean
  is_verified: boolean
  avatar_url: string | null
  created_at: Date
  updated_at: Date
}

export type ReviewJobRow = {
  id: string
  user_id: string
  status: string
  diff_content: string | null
  repo_url: string | null
  branch: string | null
  pr_number: number | null
  config: Record<string, unknown>
  result: Record<string, unknown> | null
  error_message: string | null
  model: string
  provider: string
  phase: string
  phase_number: number
  total_phases: number
  progress_percent: number
  tokens_used: number
  cost_usd: string
  worker_id: string | null
  started_at: Date | null
  completed_at: Date | null
  created_at: Date
  updated_at: Date
}

export async function pgQuery<T extends pg.QueryResultRow>(
  sql: string,
  params?: unknown[]
): Promise<pg.QueryResult<T>> {
  return getPool().query<T>(sql, params)
}

export async function pgOne<T extends pg.QueryResultRow>(
  sql: string,
  params?: unknown[]
): Promise<T | null> {
  const result = await getPool().query<T>(sql, params)
  return result.rows[0] ?? null
}

export async function pgTransaction<T>(
  fn: (client: pg.PoolClient) => Promise<T>
): Promise<T> {
  const client = await getPool().connect()
  try {
    await client.query('BEGIN')
    const result = await fn(client)
    await client.query('COMMIT')
    return result
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}
