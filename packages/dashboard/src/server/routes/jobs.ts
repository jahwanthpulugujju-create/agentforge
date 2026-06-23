/**
 * Review job management API.
 *
 * POST   /api/jobs                — submit a new review job
 * POST   /api/jobs/fetch-pr       — fetch diff from a GitHub PR URL (no auth required for public)
 * GET    /api/jobs                — list user's jobs
 * GET    /api/jobs/:id            — get job status + result
 * DELETE /api/jobs/:id            — cancel a pending job
 * GET    /api/jobs/:id/findings   — get job findings
 */

import { Router, type Response } from 'express'
import { z } from 'zod'
import https from 'node:https'
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
  diff_content:   z.string().min(10).max(500_000).optional(),
  github_pr_url:  z.string().url().optional(),
  github_token:   z.string().optional(),
  repo_url:       z.string().url().optional(),
  branch:         z.string().max(255).optional(),
  pr_number:      z.number().int().positive().optional(),
  requirements:   z.string().max(10_000).optional(),
  model:          z.string().optional(),
  provider:       z.enum(['anthropic', 'openai']).optional(),
}).refine(
  (d) => d.diff_content || d.github_pr_url || d.repo_url,
  { message: 'Either diff_content, github_pr_url, or repo_url is required' }
)

// Fetch a GitHub PR diff given a URL like https://github.com/owner/repo/pull/123
async function fetchGithubPrDiff(prUrl: string, token?: string): Promise<{ diff: string; branch: string; prNumber: number }> {
  const match = prUrl.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/)
  if (!match) throw new Error('Invalid GitHub PR URL. Expected: https://github.com/owner/repo/pull/123')

  const [, owner, repo, prNumberStr] = match
  const prNumber = parseInt(prNumberStr!, 10)

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: `/repos/${owner}/${repo}/pulls/${prNumber}`,
      headers: {
        'Accept': 'application/vnd.github.v3.diff',
        'User-Agent': 'OpenCodeReview/1.0',
        ...(token ? { 'Authorization': `token ${token}` } : {}),
      },
    }

    const req = https.get(options, (res) => {
      if (res.statusCode === 404) {
        reject(new Error('PR not found. For private repos, provide a GitHub token.'))
        return
      }
      if (res.statusCode === 403) {
        reject(new Error('GitHub rate limit hit or private repo. Provide a GitHub token.'))
        return
      }
      if ((res.statusCode ?? 0) >= 400) {
        reject(new Error(`GitHub API error: ${res.statusCode}`))
        return
      }

      // Follow redirect
      if (res.statusCode === 301 || res.statusCode === 302) {
        reject(new Error('Redirect not supported — use the canonical URL.'))
        return
      }

      let data = ''
      res.on('data', (chunk: Buffer) => { data += chunk.toString() })
      res.on('end', () => {
        // Get the branch name from PR JSON endpoint
        const branchOptionsJson = {
          hostname: 'api.github.com',
          path: `/repos/${owner}/${repo}/pulls/${prNumber}`,
          headers: {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'OpenCodeReview/1.0',
            ...(token ? { 'Authorization': `token ${token}` } : {}),
          },
        }
        const jsonReq = https.get(branchOptionsJson, (jsonRes) => {
          let jsonData = ''
          jsonRes.on('data', (c: Buffer) => { jsonData += c.toString() })
          jsonRes.on('end', () => {
            try {
              const pr = JSON.parse(jsonData) as { head?: { ref?: string } }
              resolve({ diff: data, branch: pr.head?.ref ?? `pr-${prNumber}`, prNumber })
            } catch {
              resolve({ diff: data, branch: `pr-${prNumber}`, prNumber })
            }
          })
        })
        jsonReq.on('error', () => resolve({ diff: data, branch: `pr-${prNumber}`, prNumber }))
      })
    })

    req.on('error', (err: Error) => reject(new Error(`Failed to fetch PR: ${err.message}`)))
    req.setTimeout(15000, () => {
      req.destroy()
      reject(new Error('GitHub request timed out'))
    })
  })
}

export function createJobsRouter(): Router {
  const router = Router()
  router.use(requireAuth)

  // POST /api/jobs/fetch-pr — preview the diff before submitting
  router.post('/fetch-pr', async (req: AuthenticatedRequest, res: Response) => {
    const { github_pr_url, github_token } = req.body as { github_pr_url?: string; github_token?: string }
    if (!github_pr_url) {
      res.status(400).json({ error: 'github_pr_url is required' })
      return
    }
    try {
      const result = await fetchGithubPrDiff(github_pr_url, github_token)
      res.json({
        diff_preview: result.diff.slice(0, 500),
        diff_length: result.diff.length,
        branch: result.branch,
        pr_number: result.prNumber,
        diff: result.diff,
      })
    } catch (err) {
      res.status(400).json({ error: (err as Error).message })
    }
  })

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

    let { diff_content, github_pr_url, github_token, repo_url, branch, pr_number, requirements, model, provider } = parsed.data
    const userId = req.user!.sub

    // If GitHub PR URL provided, fetch the diff automatically
    if (github_pr_url && !diff_content) {
      try {
        const fetched = await fetchGithubPrDiff(github_pr_url, github_token)
        diff_content = fetched.diff
        branch = branch ?? fetched.branch
        pr_number = pr_number ?? fetched.prNumber
        repo_url = repo_url ?? github_pr_url.split('/pull/')[0]
      } catch (err) {
        res.status(400).json({ error: (err as Error).message })
        return
      }
    }

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
      const result = await listJobs(req.user!.sub, { limit, offset, status: status || undefined })
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
      if (!job) { res.status(404).json({ error: 'Job not found' }); return }
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
      if (!job) { res.status(404).json({ error: 'Job not found' }); return }

      const severity = String(req.query['severity'] ?? '')
      const severityClause = severity ? 'AND severity = $2' : ''

      const { rows: findings } = await pgQuery(
        `SELECT * FROM review_findings_pg
         WHERE job_id = $1 ${severityClause}
         ORDER BY
           CASE severity
             WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3
             WHEN 'low' THEN 4 ELSE 5
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
