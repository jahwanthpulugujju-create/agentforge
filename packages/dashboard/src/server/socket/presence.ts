/**
 * WebSocket presence tracking.
 *
 * Tracks which users are connected, what sessions they're viewing,
 * and emits presence events. Supports reconnect with session resume.
 */

import type { Server as SocketIOServer, Socket } from 'socket.io'
import type { JwtPayload } from '../middleware/auth.js'

type PresenceEntry = {
  userId: string
  email: string
  socketId: string
  sessionId: string | null
  connectedAt: Date
  lastPingAt: Date
}

const presence = new Map<string, PresenceEntry>()

function getSessionPresence(sessionId: string): PresenceEntry[] {
  return [...presence.values()].filter((e) => e.sessionId === sessionId)
}

function getUserPresence(userId: string): PresenceEntry[] {
  return [...presence.values()].filter((e) => e.userId === userId)
}

export function registerPresenceHandlers(
  io: SocketIOServer,
  socket: Socket,
  user: JwtPayload | null
): void {
  if (!user) return

  const entry: PresenceEntry = {
    userId: user.sub,
    email: user.email,
    socketId: socket.id,
    sessionId: null,
    connectedAt: new Date(),
    lastPingAt: new Date(),
  }

  presence.set(socket.id, entry)

  // Join a user-specific room for job notifications
  void socket.join(`user:${user.sub}`)

  // Heartbeat
  socket.on('presence:ping', () => {
    const e = presence.get(socket.id)
    if (e) e.lastPingAt = new Date()
    socket.emit('presence:pong', { timestamp: Date.now() })
  })

  // Track session viewing
  socket.on('presence:view_session', (sessionId: string) => {
    const e = presence.get(socket.id)
    if (!e) return

    // Leave old session room
    if (e.sessionId) {
      void socket.leave(`session:${e.sessionId}`)
      io.to(`session:${e.sessionId}`).emit('presence:left', {
        userId: user.sub,
        email: user.email,
        sessionId: e.sessionId,
      })
    }

    e.sessionId = sessionId
    void socket.join(`session:${sessionId}`)

    // Notify others in the session
    io.to(`session:${sessionId}`).emit('presence:joined', {
      userId: user.sub,
      email: user.email,
      sessionId,
    })

    // Send current viewers to the joining socket
    const viewers = getSessionPresence(sessionId).map((v) => ({
      userId: v.userId,
      email: v.email,
    }))
    socket.emit('presence:viewers', { sessionId, viewers })
  })

  // Job room subscription
  socket.on('job:subscribe', (jobId: string) => {
    void socket.join(`job:${jobId}`)
  })

  socket.on('job:unsubscribe', (jobId: string) => {
    void socket.leave(`job:${jobId}`)
  })

  // Get current online users (admin use)
  socket.on('presence:list', () => {
    const list = [...presence.values()].map((e) => ({
      userId: e.userId,
      email: e.email,
      sessionId: e.sessionId,
      connectedAt: e.connectedAt,
    }))
    socket.emit('presence:list', list)
  })

  // Cleanup on disconnect
  socket.on('disconnect', () => {
    const e = presence.get(socket.id)
    if (e?.sessionId) {
      io.to(`session:${e.sessionId}`).emit('presence:left', {
        userId: user.sub,
        email: user.email,
        sessionId: e.sessionId,
      })
    }
    presence.delete(socket.id)
  })
}

export function getOnlineUserCount(): number {
  return new Set([...presence.values()].map((e) => e.userId)).size
}

export function getTotalConnections(): number {
  return presence.size
}
