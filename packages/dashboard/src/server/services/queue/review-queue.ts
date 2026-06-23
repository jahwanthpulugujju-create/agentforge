/**
 * Review job queue — PostgreSQL-backed, horizontally scalable.
 *
 * Uses PostgreSQL advisory locks + polling. 6 agents + debate + synthesis.
 * Job lifecycle: pending → queued → running → completed | failed | cancelled
 */

import { pgQuery, pgOne, pgTransaction, isPostgresAvailable, type ReviewJobRow } from '../../db-postgres.js'
import { runDirectReview, type ReviewAgentConfig, type ReviewStreamEvent } from '../ai-api/index.js'
import type { Server as SocketIOServer } from 'socket.io'

export type JobSubmission = {
  userId: string
  diff_content?: string
  repo_url?: string
  branch?: string
  pr_number?: number
  requirements?: string
  model?: string
  provider?: 'anthropic' | 'openai'
}

const WORKER_ID = `worker-${process.pid}-${Date.now()}`
const POLL_INTERVAL_MS = 3000
const JOB_TIMEOUT_MS = 15 * 60 * 1000 // 15 min — War Room takes longer with 6 agents

let pollTimer: ReturnType<typeof setInterval> | null = null
let io: SocketIOServer | null = null

// ── Queue operations ──

export async function submitJob(submission: JobSubmission): Promise<ReviewJobRow> {
  if (!isPostgresAvailable()) throw new Error('Database not available')

  const config: ReviewAgentConfig = {
    model: submission.model,
    provider: submission.provider,
    repo_url: submission.repo_url,
    branch: submission.branch,
    pr_number: submission.pr_number,
    requirements: submission.requirements,
  }

  const job = await pgOne<ReviewJobRow>(
    `INSERT INTO review_jobs
       (user_id, diff_content, repo_url, branch, pr_number, config, model, provider, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
     RETURNING *`,
    [
      submission.userId,
      submission.diff_content ?? null,
      submission.repo_url ?? null,
      submission.branch ?? null,
      submission.pr_number ?? null,
      JSON.stringify(config),
      submission.model ?? 'claude-opus-4-5',
      submission.provider ?? 'anthropic',
    ]
  )

  if (!job) throw new Error('Failed to create job')
  return job
}

export async function getJob(jobId: string, userId: string): Promise<ReviewJobRow | null> {
  return pgOne<ReviewJobRow>(
    'SELECT * FROM review_jobs WHERE id = $1 AND user_id = $2',
    [jobId, userId]
  )
}

export async function listJobs(
  userId: string,
  opts: { limit?: number; offset?: number; status?: string } = {}
): Promise<{ jobs: ReviewJobRow[]; total: number }> {
  const { limit = 20, offset = 0, status } = opts
  const statusClause = status ? 'AND status = $4' : ''
  const params: unknown[] = [userId, limit, offset]
  if (status) params.push(status)

  const { rows: jobs } = await pgQuery<ReviewJobRow>(
    `SELECT * FROM review_jobs
     WHERE user_id = $1 ${statusClause}
     ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
    params
  )

  const { rows: countRows } = await pgQuery<{ count: string }>(
    `SELECT COUNT(*) as count FROM review_jobs WHERE user_id = $1 ${statusClause}`,
    status ? [userId, status] : [userId]
  )

  return { jobs, total: parseInt(countRows[0]?.count ?? '0', 10) }
}

export async function cancelJob(jobId: string, userId: string): Promise<boolean> {
  const result = await pgQuery(
    `UPDATE review_jobs
     SET status = 'cancelled', updated_at = NOW()
     WHERE id = $1 AND user_id = $2 AND status IN ('pending', 'queued')`,
    [jobId, userId]
  )
  return (result.rowCount ?? 0) > 0
}

// ── Worker ──

async function claimNextJob(): Promise<ReviewJobRow | null> {
  return pgTransaction(async (client) => {
    const { rows } = await client.query<ReviewJobRow>(
      `SELECT * FROM review_jobs
       WHERE status = 'pending'
       ORDER BY created_at ASC
       LIMIT 1
       FOR UPDATE SKIP LOCKED`
    )
    const job = rows[0]
    if (!job) return null

    await client.query(
      `UPDATE review_jobs
       SET status = 'queued', worker_id = $1, started_at = NOW(), updated_at = NOW()
       WHERE id = $2`,
      [WORKER_ID, job.id]
    )
    return job
  })
}

// 6 agents + debate + synthesis = 8 total phases
const ALL_PHASES = ['architect', 'tech-lead', 'security', 'performance', 'correctness', 'devil-advocate', 'debate', 'synthesis']

const PHASE_NUMBERS: Record<string, number> = {
  'architect':      1,
  'tech-lead':      2,
  'security':       3,
  'performance':    4,
  'correctness':    5,
  'devil-advocate': 6,
  'debate':         7,
  'synthesis':      8,
}

async function processJob(job: ReviewJobRow): Promise<void> {
  const jobId = job.id
  const userId = job.user_id

  async function updateProgress(phase: string, phaseNumber: number, progressPercent: number) {
    await pgQuery(
      `UPDATE review_jobs
       SET phase = $1, phase_number = $2, progress_percent = $3, status = 'running', updated_at = NOW()
       WHERE id = $4`,
      [phase, phaseNumber, progressPercent, jobId]
    )
    io?.to(`user:${userId}`).emit('job:progress', {
      jobId,
      phase,
      phase_number: phaseNumber,
      progress_percent: progressPercent,
    })
  }

  await updateProgress('starting', 0, 0)

  const config: ReviewAgentConfig = {
    model: job.model,
    provider: job.provider as 'anthropic' | 'openai',
    repo_url: job.repo_url ?? undefined,
    branch: job.branch ?? undefined,
    pr_number: job.pr_number ?? undefined,
    requirements: (job.config as Record<string, string>)['requirements'],
  }

  const onEvent = async (event: ReviewStreamEvent) => {
    if (event.type === 'phase_start' || event.type === 'debate_start') {
      const phaseName = event.type === 'debate_start' ? 'debate' : event.phase
      const phaseNum = PHASE_NUMBERS[phaseName] ?? 0
      const pct = Math.round((phaseNum / ALL_PHASES.length) * 90)
      await updateProgress(phaseName, phaseNum, pct).catch(() => {})
    }

    if (event.type === 'token') {
      io?.to(`job:${jobId}`).emit('job:token', {
        jobId,
        phase: event.phase,
        text: event.text,
      })
    }

    if (event.type === 'debate_turn') {
      io?.to(`job:${jobId}`).emit('job:debate', {
        jobId,
        agent: event.agent,
        text: event.text,
      })
    }

    if (event.type === 'phase_complete') {
      io?.to(`job:${jobId}`).emit('job:phase_complete', {
        jobId,
        phase: event.phase,
        findings_count: event.findings_count,
      })
    }

    if (event.type === 'review_complete') {
      io?.to(`job:${jobId}`).emit('job:complete', {
        jobId,
        verdict: event.verdict,
        findings_count: event.findings_count,
      })
    }
  }

  const diff = job.diff_content ?? ''
  const result = await runDirectReview(diff, config, userId, onEvent)

  for (const finding of result.findings) {
    await pgQuery(
      `INSERT INTO review_findings_pg
         (job_id, title, severity, file_path, line_start, line_end, summary, suggestion, is_blocker, reviewer_persona)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        jobId,
        finding.title,
        finding.severity,
        finding.file_path ?? null,
        finding.line_start ?? null,
        finding.line_end ?? null,
        finding.summary,
        finding.suggestion ?? null,
        finding.is_blocker,
        finding.reviewer_persona,
      ]
    )
  }

  await pgQuery(
    `UPDATE review_jobs
     SET status = 'completed', phase = 'complete', progress_percent = 100,
         result = $1, tokens_used = $2, cost_usd = $3,
         completed_at = NOW(), updated_at = NOW()
     WHERE id = $4`,
    [
      JSON.stringify({
        verdict: result.verdict,
        summary: result.summary,
        findings_count: result.findings.length,
      }),
      result.total_tokens,
      result.total_cost_usd.toFixed(6),
      jobId,
    ]
  )

  io?.to(`user:${userId}`).emit('job:done', { jobId, verdict: result.verdict })
}

async function poll(): Promise<void> {
  if (!isPostgresAvailable()) return

  try {
    const job = await claimNextJob()
    if (!job) return

    void processJob(job).catch(async (err) => {
      console.error(`Job ${job.id} failed:`, err)
      await pgQuery(
        `UPDATE review_jobs
         SET status = 'failed', error_message = $1, updated_at = NOW()
         WHERE id = $2`,
        [(err as Error).message, job.id]
      ).catch(() => {})
      io?.to(`user:${job.user_id}`).emit('job:failed', {
        jobId: job.id,
        error: (err as Error).message,
      })
    })
  } catch (err) {
    console.error('Queue poll error:', err)
  }
}

export function startWorker(socketIo: SocketIOServer): void {
  io = socketIo
  if (!isPostgresAvailable()) {
    console.log('  Job queue:         disabled (no database)')
    return
  }
  pollTimer = setInterval(() => void poll(), POLL_INTERVAL_MS)
  void poll() // run immediately on start
  console.log(`  Job queue:         started (worker ${WORKER_ID})`)
}

export function stopWorker(): void {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null }
}
