import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, XCircle, Info, AlertCircle, CheckCircle2, User } from 'lucide-react'
import { cn } from '../../../lib/utils'
import { REVIEWER_ICONS } from '../../reviews/constants'

type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info'

type SimFinding = {
  id: string
  persona: string
  severity: Severity
  is_blocker: boolean
  title: string
  file: string
  line: string
}

const STREAM_FINDINGS: SimFinding[] = [
  { id: 'f01', persona: 'security',       severity: 'critical', is_blocker: true,  title: 'WebSocket upgrade endpoint missing auth middleware',      file: 'src/server/ws/index.ts',           line: '34' },
  { id: 'f02', persona: 'architect',      severity: 'high',     is_blocker: false, title: 'Event bus couples domain logic to transport layer',       file: 'src/server/events/bus.ts',          line: '12-28' },
  { id: 'f03', persona: 'performance',    severity: 'medium',   is_blocker: false, title: 'Unbounded in-memory message queue — OOM risk under load',  file: 'src/server/ws/message-queue.ts',    line: '55' },
  { id: 'f04', persona: 'devil_advocate', severity: 'high',     is_blocker: true,  title: 'No reconnect backoff — clients hammer server on drop',     file: 'src/client/hooks/use-ws.ts',        line: '88-102' },
  { id: 'f05', persona: 'coder',          severity: 'medium',   is_blocker: false, title: 'Missing error boundary around <RealtimeProvider>',         file: 'src/client/providers/realtime.tsx', line: '7' },
  { id: 'f06', persona: 'testing',        severity: 'medium',   is_blocker: false, title: 'Zero tests for WebSocket disconnect/reconnect lifecycle',  file: 'tests/ws/lifecycle.test.ts',        line: '—' },
  { id: 'f07', persona: 'security',       severity: 'high',     is_blocker: false, title: 'Rate limiting absent on ws:// broadcast endpoint',         file: 'src/server/ws/broadcast.ts',        line: '19' },
  { id: 'f08', persona: 'architect',      severity: 'low',      is_blocker: false, title: 'Presence state duplicated between client and server',      file: 'src/server/ws/presence.ts',         line: '41-67' },
  { id: 'f09', persona: 'performance',    severity: 'high',     is_blocker: false, title: 'JSON.parse called on every tick — cache parsed payloads',  file: 'src/client/hooks/use-ws.ts',        line: '113' },
  { id: 'f10', persona: 'coder',          severity: 'low',      is_blocker: false, title: 'Dead export `broadcastAll` never imported downstream',     file: 'src/server/ws/broadcast.ts',        line: '72' },
  { id: 'f11', persona: 'devil_advocate', severity: 'medium',   is_blocker: false, title: 'Presence list leaks stale users after abnormal close',     file: 'src/server/ws/presence.ts',         line: '101' },
  { id: 'f12', persona: 'testing',        severity: 'low',      is_blocker: false, title: 'Snapshot test covers UI but misses socket event payloads', file: 'tests/ui/activity-feed.test.tsx',   line: '89' },
  { id: 'f13', persona: 'security',       severity: 'medium',   is_blocker: false, title: 'CORS origin check skips wildcard validation on ws://',     file: 'src/server/ws/index.ts',            line: '61' },
  { id: 'f14', persona: 'architect',      severity: 'info',     is_blocker: false, title: 'Consider heartbeat ping/pong for connection health checks', file: 'src/server/ws/index.ts',           line: '—' },
]

const SEV_CONFIG: Record<Severity, { icon: typeof XCircle; label: string; badge: string; dot: string }> = {
  critical: { icon: XCircle,       label: 'CRITICAL', badge: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',         dot: 'bg-red-500' },
  high:     { icon: AlertTriangle, label: 'HIGH',     badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400', dot: 'bg-orange-500' },
  medium:   { icon: AlertCircle,   label: 'MEDIUM',   badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',   dot: 'bg-amber-500' },
  low:      { icon: Info,          label: 'LOW',      badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',       dot: 'bg-blue-400' },
  info:     { icon: CheckCircle2,  label: 'INFO',     badge: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',          dot: 'bg-zinc-400' },
}

const AGENT_COLORS: Record<string, string> = {
  security:      'text-amber-600 dark:text-amber-400',
  architect:     'text-indigo-600 dark:text-indigo-400',
  architecture:  'text-indigo-600 dark:text-indigo-400',
  coder:         'text-cyan-600 dark:text-cyan-400',
  devil_advocate:'text-red-600 dark:text-red-400',
  performance:   'text-orange-600 dark:text-orange-400',
  testing:       'text-emerald-600 dark:text-emerald-400',
}

const AGENT_DISPLAY: Record<string, string> = {
  security:       'Security',
  architect:      'Architect',
  architecture:   'Architect',
  coder:          'Coder',
  devil_advocate: "Devil's Advocate",
  performance:    'Performance',
  testing:        'Testing',
}

const INTERVAL_MS = 2800
const MAX_VISIBLE = 7

type FindingRowProps = {
  finding: SimFinding
  isNew: boolean
}

function FindingRow({ finding, isNew }: FindingRowProps) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(id)
  }, [])

  const sev = SEV_CONFIG[finding.severity]
  const SevIcon = sev.icon
  const AgentIcon = REVIEWER_ICONS[finding.persona] ?? User
  const agentColor = AGENT_COLORS[finding.persona] ?? 'text-zinc-500'
  const agentLabel = AGENT_DISPLAY[finding.persona] ?? finding.persona

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-lg border px-3 py-2.5 transition-all duration-500',
        isNew
          ? 'border-emerald-400/50 bg-emerald-50/80 dark:border-emerald-500/30 dark:bg-emerald-900/10'
          : 'border-zinc-100 bg-white dark:border-zinc-800 dark:bg-zinc-900',
        mounted ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0',
      )}
    >
      {/* Severity dot */}
      <div className="mt-1.5 flex h-2 w-2 shrink-0 items-center justify-center">
        <span className={cn('h-2 w-2 rounded-full', sev.dot)} />
      </div>

      {/* Body */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Severity badge */}
          <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide', sev.badge)}>
            {sev.label}
          </span>
          {finding.is_blocker && (
            <span className="rounded border border-red-400/40 bg-red-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-600 dark:bg-red-900/20 dark:text-red-400">
              BLOCKER
            </span>
          )}
          {/* Finding title */}
          <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
            {finding.title}
          </span>
        </div>

        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-zinc-500 dark:text-zinc-400">
          {/* Agent */}
          <span className={cn('flex items-center gap-1', agentColor)}>
            <AgentIcon className="h-3 w-3" />
            {agentLabel}
          </span>
          <span>·</span>
          {/* File */}
          <span className="font-mono">{finding.file}:{finding.line}</span>
        </div>
      </div>

      {/* New badge */}
      {isNew && (
        <span className="mt-0.5 shrink-0 rounded bg-emerald-500 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
          NEW
        </span>
      )}
    </div>
  )
}

type LiveFindingStreamProps = {
  sessionId: string
}

export function LiveFindingStream({ sessionId: _sessionId }: LiveFindingStreamProps) {
  const [visible, setVisible] = useState<SimFinding[]>([])
  const [newestId, setNewestId] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const idxRef = useRef(0)

  useEffect(() => {
    // Random initial offset so it doesn't always start at finding #1
    idxRef.current = Math.floor(Math.random() * 3)

    const tick = () => {
      if (idxRef.current >= STREAM_FINDINGS.length) {
        setDone(true)
        return
      }
      const next = STREAM_FINDINGS[idxRef.current]
      if (!next) return
      idxRef.current++
      setNewestId(next.id)
      setVisible((prev) => {
        if (prev.some((p) => p.id === next.id)) return prev
        return [next, ...prev].slice(0, MAX_VISIBLE) as SimFinding[]
      })
    }

    // First finding immediately, then one every INTERVAL_MS
    tick()
    const interval = setInterval(tick, INTERVAL_MS)

    return () => {
      clearInterval(interval)
    }
  }, [])

  const totalShown = visible.length + (done ? 0 : 0)

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-2.5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center gap-2">
          {done ? (
            <span className="h-2 w-2 rounded-full bg-zinc-400" />
          ) : (
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
          )}
          <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
            Live Finding Stream
          </span>
        </div>
        <div className="flex items-center gap-3">
          {visible.length > 0 && (
            <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              {visible.length} detected
            </span>
          )}
          {done && (
            <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
              round complete
            </span>
          )}
        </div>
      </div>

      {/* Stream */}
      <div className="space-y-1.5 p-3">
        {visible.length === 0 ? (
          <p className="py-4 text-center text-xs text-zinc-400 dark:text-zinc-500">
            Waiting for agents to surface findings…
          </p>
        ) : (
          visible.map((f) => (
            <FindingRow key={f.id} finding={f} isNew={f.id === newestId} />
          ))
        )}
      </div>
    </div>
  )
}
