/**
 * Review job management API.
 *
 * POST   /api/jobs           — submit a new review job
 * GET    /api/jobs           — list user's jobs
 * GET    /api/jobs/:id       — get job status + result
 * DELETE /api/jobs/:id       — cancel a pending job
 * GET    /api/jobs/:id/findings — get job findings
 */

import { Router, type Response } from 'express'
import { z } from 'zod'
import {
  submitJob,
  getJob,
  listJobs,
  cancelJob,
} from '../services/queue/review-queue.js'
import { pgQuery, isPostgresAvailable } from '../db-postgres.js'
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js'
import { getAvailableProviders } from '../services/ai-api/index.js'

const SubmitJobSchema = z.object({
  diff_content: z.string().min(10).max(500_000).optional(),
  repo_url: z.string().url().optional(),
  branch: z.string().max(255).optional(),
  pr_number: z.number().int().positive().optional(),
  requirements: z.string().max(10_000).optional(),
  model: z.string().optional(),
  provider: z.enum(['anthropic', 'openai']).optional(),
}).refine(
  (d) => d.diff_content || d.repo_url,
  { message: 'Either diff_content or repo_url is required' }
)

export function createJobsRouter(): Router {
  const router = Router()
  router.use(requireAuth)

  // POST /api/jobs
  router.post('/', async (req: AuthenticatedRequest, res: Response) => {
    if (!isPostgresAvailable()) {
      res.status(503).json({ error: 'Database not available' })
      return
    }

    const parsed = SubmitJobSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation error', details: parsed.error.issues })
      return
    }

    const { diff_content, repo_url, branch, pr_number, requirements, model, provider } = parsed.data
    const userId = req.user!.sub

    try {
      const providers = await getAvailableProviders(userId)
      const chosenProvider = provider ?? (providers.anthropic ? 'anthropic' : 'openai')

      if (!providers[chosenProvider]) {
        res.status(400).json({
          error: `No ${chosenProvider} API key available. Add your key in Settings → API Keys.`,
          providers,
        })
        return
      }

      const job = await submitJob({
        userId,
        diff_content,
        repo_url,
        branch,
        pr_number,
        requirements,
        model,
        provider: chosenProvider,
      })

      res.status(201).json(job)
    } catch (err) {
      console.error('Job submit error:', err)
      res.status(500).json({ error: (err as Error).message })
    }
  })

  // GET /api/jobs
  router.get('/', async (req: AuthenticatedRequest, res: Response) => {
    if (!isPostgresAvailable()) {
      res.status(503).json({ error: 'Database not available' })
      return
    }

    const limit = Math.min(parseInt(String(req.query['limit'] ?? '20'), 10), 100)
    const offset = Math.max(parseInt(String(req.query['offset'] ?? '0'), 10), 0)
    const status = String(req.query['status'] ?? '')

    try {
      const result = await listJobs(req.user!.sub, {
        limit,
        offset,
        status: status || undefined,
      })
      res.json(result)
    } catch (err) {
      console.error('Job list error:', err)
      res.status(500).json({ error: 'Failed to list jobs' })
    }
  })

  // GET /api/jobs/:id
  router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
    if (!isPostgresAvailable()) {
      res.status(503).json({ error: 'Database not available' })
      return
    }

    try {
      const job = await getJob(req.params['id']!, req.user!.sub)
      if (!job) {
        res.status(404).json({ error: 'Job not found' })
        return
      }
      res.json(job)
    } catch {
      res.status(500).json({ error: 'Failed to fetch job' })
    }
  })

  // DELETE /api/jobs/:id
  router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
    if (!isPostgresAvailable()) {
      res.status(503).json({ error: 'Database not available' })
      return
    }

    try {
      const cancelled = await cancelJob(req.params['id']!, req.user!.sub)
      if (!cancelled) {
        res.status(400).json({ error: 'Job cannot be cancelled (not pending/queued, or not found)' })
        return
      }
      res.json({ message: 'Job cancelled' })
    } catch {
      res.status(500).json({ error: 'Failed to cancel job' })
    }
  })

  // GET /api/jobs/:id/findings
  router.get('/:id/findings', async (req: AuthenticatedRequest, res: Response) => {
    if (!isPostgresAvailable()) {
      res.status(503).json({ error: 'Database not available' })
      return
    }

    try {
      const job = await getJob(req.params['id']!, req.user!.sub)
      if (!job) {
        res.status(404).json({ error: 'Job not found' })
        return
      }

      const severity = String(req.query['severity'] ?? '')
      const severityClause = severity ? 'AND severity = $2' : ''

      const { rows: findings } = await pgQuery(
        `SELECT * FROM review_findings_pg
         WHERE job_id = $1 ${severityClause}
         ORDER BY
           CASE severity
             WHEN 'critical' THEN 1
             WHEN 'high' THEN 2
             WHEN 'medium' THEN 3
             WHEN 'low' THEN 4
             ELSE 5
           END, created_at`,
        severity ? [req.params['id'], severity] : [req.params['id']]
      )

      res.json(findings)
    } catch {
      res.status(500).json({ error: 'Failed to fetch findings' })
    }
  })

  return router
}
