/**
 * Demo Panel — zero-setup hackathon demo mode.
 *
 * Emits `demo:run` via Socket.IO which the server handles by streaming
 * the exact same command:started → command:event × N → command:finished
 * events that a live AI CLI execution would produce. The EventStreamRenderer
 * renders everything with full styling, agent rails, thinking blocks, etc.
 */

import { useState } from 'react'
import { Zap, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react'
import { useSocket } from '../../../providers/socket-provider'

const DEMO_PROMPTS = [
  'Build a user authentication system with JWT tokens and refresh token rotation',
  'Add rate-limited REST API endpoints with PostgreSQL and connection pooling',
  'Implement a file upload service with S3, virus scanning, and signed URLs',
  'Build a real-time notification system using WebSockets and Redis pub/sub',
]

const AGENT_PILLS = [
  { name: 'Architect',       color: '#38bdf8' },
  { name: 'Coder',           color: '#34d399' },
  { name: 'Security',        color: '#f87171' },
  { name: 'Performance',     color: '#fbbf24' },
  { name: "Devil's Advocate", color: '#f472b6' },
  { name: 'Reviewer',        color: '#a78bfa' },
]

type DemoPanelProps = {
  /** When true the panel renders as the primary / hero element (CLI not available). */
  hero?: boolean
}

export function DemoPanel({ hero = false }: DemoPanelProps) {
  const { socket } = useSocket()
  const [prompt, setPrompt] = useState(DEMO_PROMPTS[0]!)
  const [running, setRunning] = useState(false)
  const [expanded, setExpanded] = useState(hero)

  function loadRandom() {
    const next = DEMO_PROMPTS[Math.floor(Math.random() * DEMO_PROMPTS.length)]!
    setPrompt(next)
  }

  function runDemo() {
    if (!socket || running) return
    setRunning(true)
    socket.emit('demo:run', { prompt })
    // Re-enable after the demo sequence finishes (~22 s)
    setTimeout(() => setRunning(false), 23_000)
  }

  if (!hero) {
    /* ── Collapsed secondary mode (CLI is available) ────────────────── */
    return (
      <div className="rounded-lg overflow-hidden"
        style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors"
          style={{ background: 'transparent' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)' }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
        >
          <div className="flex items-center gap-2.5">
            <Zap className="h-3.5 w-3.5" style={{ color: '#fbbf24' }} />
            <span className="font-mono text-[12px]" style={{ color: '#94a3b8' }}>
              hackathon demo mode
            </span>
          </div>
          {expanded
            ? <ChevronUp className="h-3.5 w-3.5" style={{ color: '#475569' }} />
            : <ChevronDown className="h-3.5 w-3.5" style={{ color: '#475569' }} />
          }
        </button>

        {expanded && (
          <div className="px-4 pb-4 pt-1 space-y-3"
            style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <DemoBody
              prompt={prompt}
              setPrompt={setPrompt}
              running={running}
              onLoad={loadRandom}
              onRun={runDemo}
            />
          </div>
        )}
      </div>
    )
  }

  /* ── Hero / primary mode (no CLI installed) ─────────────────────────── */
  return (
    <div className="rounded-xl overflow-hidden"
      style={{
        border: '1px solid rgba(251,191,36,0.2)',
        background: 'rgba(251,191,36,0.04)',
        boxShadow: '0 0 40px rgba(251,191,36,0.04)',
      }}>

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.2)' }}>
            <Zap className="h-4 w-4" style={{ color: '#fbbf24' }} />
          </div>
          <div>
            <p className="text-[13px] font-semibold" style={{ color: '#f0f4f8' }}>
              Hackathon Demo Mode
            </p>
            <p className="text-[11px]" style={{ color: '#64748b' }}>
              No Claude Code or OpenCode CLI required
            </p>
          </div>
        </div>

        {/* Agent pills */}
        <div className="hidden sm:flex items-center gap-1">
          {AGENT_PILLS.map((a) => (
            <div key={a.name}
              className="rounded-full px-2 py-px font-mono text-[8.5px]"
              style={{
                background: `${a.color}12`,
                border: `1px solid ${a.color}30`,
                color: a.color,
              }}>
              {a.name}
            </div>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="px-5 py-5 space-y-4">
        {/* What this does */}
        <p className="text-[12.5px] leading-relaxed" style={{ color: '#64748b' }}>
          Runs a scripted 6-agent review debate through the live event stream — Security finds real bugs,
          agents argue, consensus rejects, the code is auto-revised, and consensus approves. Same UI,
          same renderer, zero API keys needed.
        </p>

        <DemoBody
          prompt={prompt}
          setPrompt={setPrompt}
          running={running}
          onLoad={loadRandom}
          onRun={runDemo}
          large
        />

        {/* Judge guide */}
        <div className="rounded-lg px-4 py-3 space-y-1.5"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <p className="font-mono text-[10px] uppercase tracking-widest" style={{ color: '#475569' }}>
            judge walkthrough
          </p>
          {[
            '1. Click "Run Demo" → watch the 6 agents activate in the tab below',
            '2. Security finds 3 critical bugs → casts REJECT → consensus fails (42/100)',
            '3. Coder auto-revises → Security re-scans → all agents approve (85/100)',
            '4. See the full agent debate in the live event stream timeline',
          ].map((s) => (
            <p key={s} className="text-[11.5px]" style={{ color: '#94a3b8' }}>{s}</p>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── Shared body ─────────────────────────────────────────────────────────── */

function DemoBody({
  prompt,
  setPrompt,
  running,
  onLoad,
  onRun,
  large = false,
}: {
  prompt: string
  setPrompt: (s: string) => void
  running: boolean
  onLoad: () => void
  onRun: () => void
  large?: boolean
}) {
  return (
    <div className={`space-y-${large ? '3' : '2.5'}`}>
      {/* Prompt input */}
      <div className="flex gap-2">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={large ? 2 : 1}
          placeholder="Describe a feature to review…"
          className="flex-1 resize-none rounded-lg px-3 py-2 font-mono text-[12px] leading-relaxed transition-colors"
          style={{
            background: 'rgba(0,0,0,0.3)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#e2e8f0',
            outline: 'none',
          }}
          onFocus={(e) => { (e.target as HTMLTextAreaElement).style.borderColor = 'rgba(255,255,255,0.2)' }}
          onBlur={(e) => { (e.target as HTMLTextAreaElement).style.borderColor = 'rgba(255,255,255,0.1)' }}
        />
        <button
          type="button"
          onClick={onLoad}
          title="Load a random demo prompt"
          className="flex shrink-0 items-center justify-center rounded-lg transition-all"
          style={{
            width: 36,
            height: large ? 64 : 36,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#64748b',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.color = '#94a3b8'
            ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.18)'
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.color = '#64748b'
            ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.1)'
          }}
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Run button */}
      <button
        type="button"
        disabled={running}
        onClick={onRun}
        className="flex w-full items-center justify-center gap-2 rounded-lg py-2.5 font-mono text-[12px] font-semibold transition-all"
        style={{
          background: running
            ? 'rgba(251,191,36,0.06)'
            : 'rgba(251,191,36,0.14)',
          border: running
            ? '1px solid rgba(251,191,36,0.15)'
            : '1px solid rgba(251,191,36,0.35)',
          color: running ? '#78716c' : '#fbbf24',
          cursor: running ? 'not-allowed' : 'pointer',
        }}
        onMouseEnter={(e) => {
          if (!running) {
            (e.currentTarget as HTMLElement).style.background = 'rgba(251,191,36,0.2)'
            ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(251,191,36,0.5)'
          }
        }}
        onMouseLeave={(e) => {
          if (!running) {
            (e.currentTarget as HTMLElement).style.background = 'rgba(251,191,36,0.14)'
            ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(251,191,36,0.35)'
          }
        }}
      >
        <Zap className={`h-3.5 w-3.5 ${running ? '' : ''}`} />
        {running ? 'Demo running — watch the tab below…' : 'Run Hackathon Demo'}
      </button>
    </div>
  )
}
