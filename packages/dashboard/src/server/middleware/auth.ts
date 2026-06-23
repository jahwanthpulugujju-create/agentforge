/**
 * JWT authentication middleware.
 *
 * Provides:
 * - verifyJwt: Express middleware that validates JWT and attaches user to req
 * - optionalAuth: Same but doesn't block unauthenticated requests
 * - generateTokens: Creates access + refresh token pair
 * - verifyRefreshToken: Validates refresh token
 */

import { type Request, type Response, type NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'

export type JwtPayload = {
  sub: string
  email: string
  plan: string
  iat?: number
  exp?: number
}

export type AuthenticatedRequest = Request & {
  user?: JwtPayload
}

// ── Token generation ──

export function generateAccessToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    algorithm: 'HS256',
  })
}

export function generateRefreshToken(userId: string): string {
  return jwt.sign({ sub: userId, type: 'refresh' }, env.JWT_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    algorithm: 'HS256',
  })
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] }) as JwtPayload
}

// ── Middleware ──

export function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: missing bearer token' })
    return
  }

  const token = authHeader.slice(7)
  try {
    const payload = verifyToken(token)
    req.user = payload
    next()
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: 'Unauthorized: token expired', code: 'TOKEN_EXPIRED' })
    } else {
      res.status(401).json({ error: 'Unauthorized: invalid token' })
    }
  }
}

export function optionalAuth(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    next()
    return
  }

  const token = authHeader.slice(7)
  try {
    req.user = verifyToken(token)
  } catch {
    // Non-fatal — request continues unauthenticated
  }
  next()
}

// ── Socket.IO JWT auth ──

export function verifySocketToken(token: string): JwtPayload | null {
  try {
    return verifyToken(token)
  } catch {
    return null
  }
}
