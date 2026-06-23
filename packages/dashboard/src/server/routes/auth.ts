/**
 * Authentication routes.
 *
 * POST /api/auth/register  — create a new user account
 * POST /api/auth/login     — authenticate and receive JWT pair
 * POST /api/auth/refresh   — exchange refresh token for new access token
 * POST /api/auth/logout    — invalidate session
 * GET  /api/auth/me        — get current user profile
 * PATCH /api/auth/me       — update profile
 */

import { Router, type Request, type Response } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import {
  pgOne,
  pgQuery,
  pgTransaction,
  type UserRow,
} from '../db-postgres.js'
import {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  requireAuth,
  type AuthenticatedRequest,
} from '../middleware/auth.js'
import { env } from '../config/env.js'
import { isPostgresAvailable } from '../db-postgres.js'
import crypto from 'node:crypto'

const BCRYPT_ROUNDS = 12

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(100).optional(),
})

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

function userPublic(user: UserRow) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    plan: user.plan,
    is_verified: user.is_verified,
    avatar_url: user.avatar_url,
    created_at: user.created_at,
  }
}

function pgRequired(res: Response): boolean {
  if (!isPostgresAvailable()) {
    res.status(503).json({
      error: 'Database not available. Auth features require PostgreSQL.',
    })
    return false
  }
  return true
}

export function createAuthRouter(): Router {
  const router = Router()

  // POST /api/auth/register
  router.post('/register', async (req: Request, res: Response) => {
    if (!pgRequired(res)) return
    if (!env.ENABLE_REGISTRATION) {
      res.status(403).json({ error: 'Registration is currently disabled' })
      return
    }

    const parsed = RegisterSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation error', details: parsed.error.issues })
      return
    }

    const { email, password, name = '' } = parsed.data

    try {
      const existing = await pgOne<{ id: string }>(
        'SELECT id FROM users WHERE email = $1',
        [email.toLowerCase()]
      )
      if (existing) {
        res.status(409).json({ error: 'An account with this email already exists' })
        return
      }

      const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS)

      const user = await pgOne<UserRow>(
        `INSERT INTO users (email, password_hash, name)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [email.toLowerCase(), passwordHash, name]
      )

      if (!user) throw new Error('Failed to create user')

      const accessToken = generateAccessToken({
        sub: user.id,
        email: user.email,
        plan: user.plan,
      })
      const refreshToken = generateRefreshToken(user.id)
      const tokenHash = crypto.createHash('sha256').update(accessToken).digest('hex')
      const refreshHash = crypto.createHash('sha256').update(refreshToken).digest('hex')

      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      await pgQuery(
        `INSERT INTO user_sessions (user_id, token_hash, refresh_token_hash, ip_address, user_agent, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [user.id, tokenHash, refreshHash, req.ip, req.headers['user-agent'] ?? null, expiresAt]
      )

      res.status(201).json({
        user: userPublic(user),
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_in: 7 * 24 * 60 * 60,
      })
    } catch (err) {
      console.error('Registration error:', err)
      res.status(500).json({ error: 'Registration failed' })
    }
  })

  // POST /api/auth/login
  router.post('/login', async (req: Request, res: Response) => {
    if (!pgRequired(res)) return

    const parsed = LoginSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation error', details: parsed.error.issues })
      return
    }

    const { email, password } = parsed.data

    try {
      const user = await pgOne<UserRow>(
        'SELECT * FROM users WHERE email = $1 AND is_active = TRUE',
        [email.toLowerCase()]
      )

      if (!user) {
        res.status(401).json({ error: 'Invalid email or password' })
        return
      }

      const passwordValid = await bcrypt.compare(password, user.password_hash)
      if (!passwordValid) {
        res.status(401).json({ error: 'Invalid email or password' })
        return
      }

      const accessToken = generateAccessToken({
        sub: user.id,
        email: user.email,
        plan: user.plan,
      })
      const refreshToken = generateRefreshToken(user.id)
      const tokenHash = crypto.createHash('sha256').update(accessToken).digest('hex')
      const refreshHash = crypto.createHash('sha256').update(refreshToken).digest('hex')

      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      await pgQuery(
        `INSERT INTO user_sessions (user_id, token_hash, refresh_token_hash, ip_address, user_agent, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [user.id, tokenHash, refreshHash, req.ip, req.headers['user-agent'] ?? null, expiresAt]
      )

      await pgQuery('UPDATE users SET updated_at = NOW() WHERE id = $1', [user.id])

      res.json({
        user: userPublic(user),
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_in: 7 * 24 * 60 * 60,
      })
    } catch (err) {
      console.error('Login error:', err)
      res.status(500).json({ error: 'Login failed' })
    }
  })

  // POST /api/auth/refresh
  router.post('/refresh', async (req: Request, res: Response) => {
    if (!pgRequired(res)) return

    const { refresh_token } = req.body as { refresh_token?: string }
    if (!refresh_token) {
      res.status(400).json({ error: 'refresh_token is required' })
      return
    }

    try {
      const payload = verifyToken(refresh_token)
      const refreshHash = crypto.createHash('sha256').update(refresh_token).digest('hex')

      const session = await pgOne<{ user_id: string; expires_at: Date }>(
        'SELECT user_id, expires_at FROM user_sessions WHERE refresh_token_hash = $1',
        [refreshHash]
      )

      if (!session || new Date(session.expires_at) < new Date()) {
        res.status(401).json({ error: 'Invalid or expired refresh token' })
        return
      }

      const user = await pgOne<UserRow>(
        'SELECT * FROM users WHERE id = $1 AND is_active = TRUE',
        [session.user_id]
      )

      if (!user) {
        res.status(401).json({ error: 'User not found' })
        return
      }

      const newAccessToken = generateAccessToken({
        sub: user.id,
        email: user.email,
        plan: user.plan,
      })
      const newTokenHash = crypto.createHash('sha256').update(newAccessToken).digest('hex')

      await pgQuery(
        'UPDATE user_sessions SET token_hash = $1, last_active_at = NOW() WHERE refresh_token_hash = $2',
        [newTokenHash, refreshHash]
      )

      res.json({
        access_token: newAccessToken,
        expires_in: 7 * 24 * 60 * 60,
      })
    } catch {
      res.status(401).json({ error: 'Invalid refresh token' })
    }
  })

  // POST /api/auth/logout
  router.post('/logout', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    if (!pgRequired(res)) return

    const authHeader = req.headers.authorization ?? ''
    const token = authHeader.slice(7)
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')

    try {
      await pgQuery('DELETE FROM user_sessions WHERE token_hash = $1', [tokenHash])
      res.json({ message: 'Logged out successfully' })
    } catch {
      res.status(500).json({ error: 'Logout failed' })
    }
  })

  // GET /api/auth/me
  router.get('/me', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    if (!pgRequired(res)) return

    try {
      const user = await pgOne<UserRow>(
        'SELECT * FROM users WHERE id = $1',
        [req.user!.sub]
      )
      if (!user) {
        res.status(404).json({ error: 'User not found' })
        return
      }
      res.json(userPublic(user))
    } catch {
      res.status(500).json({ error: 'Failed to fetch profile' })
    }
  })

  // PATCH /api/auth/me
  router.patch('/me', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    if (!pgRequired(res)) return

    const UpdateSchema = z.object({
      name: z.string().min(1).max(100).optional(),
    })

    const parsed = UpdateSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation error', details: parsed.error.issues })
      return
    }

    const { name } = parsed.data

    try {
      const user = await pgOne<UserRow>(
        `UPDATE users SET name = COALESCE($1, name), updated_at = NOW()
         WHERE id = $2 RETURNING *`,
        [name ?? null, req.user!.sub]
      )
      if (!user) {
        res.status(404).json({ error: 'User not found' })
        return
      }
      res.json(userPublic(user))
    } catch {
      res.status(500).json({ error: 'Failed to update profile' })
    }
  })

  return router
}
