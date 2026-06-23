/**
 * User AI API key management.
 *
 * GET    /api/keys           — list user's stored keys (masked)
 * POST   /api/keys           — store a new API key
 * DELETE /api/keys/:id       — delete a key
 * POST   /api/keys/:id/test  — test a stored key is valid
 */

import { Router, type Response } from 'express'
import { z } from 'zod'
import { pgOne, pgQuery, encryptApiKey, decryptApiKey, isPostgresAvailable } from '../db-postgres.js'
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js'
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'

const PROVIDERS = ['anthropic', 'openai', 'google', 'mistral'] as const

const AddKeySchema = z.object({
  provider: z.enum(PROVIDERS),
  name: z.string().min(1).max(50).default('default'),
  key: z.string().min(10),
})

export function createApiKeysRouter(): Router {
  const router = Router()

  router.use(requireAuth)

  // GET /api/keys
  router.get('/', async (req: AuthenticatedRequest, res: Response) => {
    if (!isPostgresAvailable()) {
      res.status(503).json({ error: 'Database not available' })
      return
    }

    try {
      const { rows } = await pgQuery<{
        id: string
        provider: string
        name: string
        key_prefix: string
        is_active: boolean
        last_used_at: Date | null
        created_at: Date
      }>(
        `SELECT id, provider, name, key_prefix, is_active, last_used_at, created_at
         FROM user_api_keys WHERE user_id = $1 ORDER BY created_at DESC`,
        [req.user!.sub]
      )
      res.json(rows)
    } catch {
      res.status(500).json({ error: 'Failed to fetch API keys' })
    }
  })

  // POST /api/keys
  router.post('/', async (req: AuthenticatedRequest, res: Response) => {
    if (!isPostgresAvailable()) {
      res.status(503).json({ error: 'Database not available' })
      return
    }

    const parsed = AddKeySchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation error', details: parsed.error.issues })
      return
    }

    const { provider, name, key } = parsed.data
    const keyPrefix = key.slice(0, 8) + '...'
    const keyEncrypted = encryptApiKey(key)

    try {
      const existing = await pgOne<{ id: string }>(
        'SELECT id FROM user_api_keys WHERE user_id = $1 AND provider = $2 AND name = $3',
        [req.user!.sub, provider, name]
      )

      if (existing) {
        const row = await pgOne<{ id: string; provider: string; name: string; key_prefix: string }>(
          `UPDATE user_api_keys
           SET key_encrypted = $1, key_prefix = $2, updated_at = NOW()
           WHERE id = $3 RETURNING id, provider, name, key_prefix`,
          [keyEncrypted, keyPrefix, existing.id]
        )
        res.json({ ...row, message: 'Key updated' })
        return
      }

      const row = await pgOne<{ id: string; provider: string; name: string; key_prefix: string }>(
        `INSERT INTO user_api_keys (user_id, provider, name, key_encrypted, key_prefix)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, provider, name, key_prefix`,
        [req.user!.sub, provider, name, keyEncrypted, keyPrefix]
      )
      res.status(201).json(row)
    } catch {
      res.status(500).json({ error: 'Failed to store API key' })
    }
  })

  // DELETE /api/keys/:id
  router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
    if (!isPostgresAvailable()) {
      res.status(503).json({ error: 'Database not available' })
      return
    }

    try {
      const result = await pgQuery(
        'DELETE FROM user_api_keys WHERE id = $1 AND user_id = $2',
        [req.params['id'], req.user!.sub]
      )
      if (result.rowCount === 0) {
        res.status(404).json({ error: 'Key not found' })
        return
      }
      res.json({ message: 'Key deleted' })
    } catch {
      res.status(500).json({ error: 'Failed to delete key' })
    }
  })

  // POST /api/keys/:id/test
  router.post('/:id/test', async (req: AuthenticatedRequest, res: Response) => {
    if (!isPostgresAvailable()) {
      res.status(503).json({ error: 'Database not available' })
      return
    }

    try {
      const keyRow = await pgOne<{ provider: string; key_encrypted: string }>(
        'SELECT provider, key_encrypted FROM user_api_keys WHERE id = $1 AND user_id = $2',
        [req.params['id'], req.user!.sub]
      )
      if (!keyRow) {
        res.status(404).json({ error: 'Key not found' })
        return
      }

      const apiKey = decryptApiKey(keyRow.key_encrypted)
      let valid = false
      let model = ''

      if (keyRow.provider === 'anthropic') {
        const client = new Anthropic({ apiKey })
        const msg = await client.messages.create({
          model: 'claude-haiku-4-5',
          max_tokens: 5,
          messages: [{ role: 'user', content: 'hi' }],
        })
        valid = msg.stop_reason !== null
        model = msg.model
      } else if (keyRow.provider === 'openai') {
        const client = new OpenAI({ apiKey })
        const resp = await client.chat.completions.create({
          model: 'gpt-4o-mini',
          max_tokens: 5,
          messages: [{ role: 'user', content: 'hi' }],
        })
        valid = resp.choices.length > 0
        model = resp.model
      }

      if (valid) {
        await pgQuery(
          'UPDATE user_api_keys SET last_used_at = NOW() WHERE id = $1',
          [req.params['id']]
        )
      }

      res.json({ valid, model })
    } catch (err) {
      res.json({ valid: false, error: (err as Error).message })
    }
  })

  return router
}
