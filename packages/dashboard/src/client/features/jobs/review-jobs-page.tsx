import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuthContext } from '../../hooks/use-auth'
import { useSocket } from '../../providers/socket-provider'
import { cn } from '../../lib/utils'

// ── Types ──────────────────────────────────────────────────────────────────────

type Job = {
  id: string
  status: 'pending' | 'queued' | 'running' | 'completed' | 'failed' | 'cancelled'
  provider: string
  model: string
  phase: string
  progress_percent: number
  branch: string | null
  pr_number: number | null
  result: { verdict?: string; summary?: string; findings_count?: number } | null
  error_message: string | null
  tokens_used: number
  cost_usd: string
  created_at: string
  completed_at: string | null
}

type Finding = {
  id: string
  title: string
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info'
  file_path: string | null
  line_start: number | null
  line_end: number | null
  summary: string
  suggestion: string | null
  is_blocker: boolean
  reviewer_persona: string
}

// ── Agent config (matches server AGENT_META) ──────────────────────────────────

const AGENTS = [
  { role: 'architect',      label: 'The Visionary',        icon: '🏛️',  color: '#818cf8', desc: 'System design & architecture' },
  { role: 'tech-lead',      label: 'The Lead',              icon: '👑',  color: '#a78bfa', desc: 'Overall quality & blockers' },
  { role: 'security',       label: 'The Paranoid',          icon: '🛡️',  color: '#f87171', desc: 'Vulnerabilities & CVEs' },
  { role: 'performance',    label: 'The Speed Demon',       icon: '⚡',  color: '#fb923c', desc: 'Efficiency & N+1 queries' },
  { role: 'correctness',    label: 'The Pedant',            icon: '🔬',  color: '#34d399', desc: 'Logic errors & edge cases' },
  { role: 'devil-advocate', label: "The Devil's Advocate",  icon: '😈',  color: '#f472b6', desc: 'Challenges every assumption' },
] as const

const VERDICT_CONFIG = {
  APPROVE:            { color: 'text-green-400',  bg: 'bg-green-950/50 border-green-800',  label: '✓ Approved',           emoji: '✅' },
  REQUEST_CHANGES:    { color: 'text-red-400',    bg: 'bg-red-950/50 border-red-800',      label: '✗ Changes Required',   emoji: '❌' },
  NEEDS_DISCUSSION:   { color: 'text-yellow-400', bg: 'bg-yellow-950/50 border-yellow-800',label: '⚠ Needs Discussion',   emoji: '⚠️' },
}

const SEVERITY_CONFIG = {
  critical: { color: 'text-red-400',    bg: 'bg-red-950/40',    badge: 'bg-red-900 text-red-300',    label: 'CRITICAL' },
  high:     { color: 'text-orange-400', bg: 'bg-orange-950/40', badge: 'bg-orange-900 text-orange-300', label: 'HIGH' },
  medium:   { color: 'text-yellow-400', bg: 'bg-yellow-950/40', badge: 'bg-yellow-900 text-yellow-300', label: 'MEDIUM' },
  low:      { color: 'text-blue-400',   bg: 'bg-blue-950/40',   badge: 'bg-blue-900 text-blue-300',   label: 'LOW' },
  info:     { color: 'text-zinc-400',   bg: 'bg-zinc-900',      badge: 'bg-zinc-800 text-zinc-400',   label: 'INFO' },
}

const STATUS_COLORS: Record<string, string> = {
  pending:   'text-zinc-400 bg-zinc-800',
  queued:    'text-yellow-400 bg-yellow-950',
  running:   'text-blue-400 bg-blue-950 animate-pulse',
  completed: 'text-green-400 bg-green-950',
  failed:    'text-red-400 bg-red-950',
  cancelled: 'text-zinc-500 bg-zinc-800',
}

// ── Auth fetch helper ─────────────────────────────────────────────────────────

function authFetch(path: string, token: string | null, init?: RequestInit) {
  return fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers as Record<string, string> ?? {}),
    },
  })
}

// ── Agent card ────────────────────────────────────────────────────────────────

type AgentStatus = 'waiting' | 'thinking' | 'done' | 'debate'

function AgentCard({
  agent,
  status,
  findingsCount,
  liveText,
  onClick,
  isActive,
}: {
  agent: typeof AGENTS[number]
  status: AgentStatus
  findingsCount: number
  liveText: string
  onClick: () => void
  isActive: boolean
}) {
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (status === 'thinking') endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [liveText, status])

  return (
    <button
      onClick={onClick}
      className={cn(
        'relative flex flex-col rounded-xl border p-4 text-left transition-all duration-200',
        isActive ? 'border-white/20 bg-zinc-800 shadow-lg' : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700 hover:bg-zinc-800/60',
        status === 'thinking' && 'border-blue-800/60'
      )}
      style={isActive ? { boxShadow: `0 0 0 1px ${agent.color}40, 0 4px 24px ${agent.color}20` } : undefined}
    >
      {/* Status indicator dot */}
      <div className={cn(
        'absolute right-3 top-3 h-2 w-2 rounded-full',
        status === 'waiting'  && 'bg-zinc-600',
        status === 'thinking' && 'bg-blue-400 animate-pulse',
        status === 'done'     && 'bg-green-500',
        status === 'debate'   && 'bg-yellow-400 animate-pulse',
      )} />

      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl leading-none">{agent.icon}</span>
        <div className="min-w-0">
          <p className="text-xs font-semibold" style={{ color: agent.color }}>{agent.label}</p>
          <p className="text-[10px] text-zinc-500 truncate">{agent.desc}</p>
        </div>
      </div>

      {/* Live text preview */}
      <div className="flex-1 overflow-hidden">
        {status === 'waiting' && (
          <p className="text-[10px] text-zinc-600 italic">Waiting for turn…</p>
        )}
        {(status === 'thinking' || status === 'debate') && liveText && (
          <div className="text-[10px] text-zinc-400 leading-relaxed line-clamp-4 font-mono">
            {liveText.slice(-400)}
            <span className="animate-pulse">▋</span>
            <div ref={endRef} />
          </div>
        )}
        {status === 'done' && (
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs font-semibold text-green-400">{findingsCount}</span>
            <span className="text-[10px] text-zinc-500">finding{findingsCount !== 1 ? 's' : ''}</span>
          </div>
        )}
      </div>

      {status === 'thinking' && (
        <div className="mt-2 h-0.5 w-full overflow-hidden rounded-full bg-zinc-700">
          <div className="h-full bg-blue-400 animate-[slide_1.5s_ease-in-out_infinite]" style={{ width: '40%' }} />
        </div>
      )}
    </button>
  )
}

// ── War Room view ─────────────────────────────────────────────────────────────

function WarRoom({
  job,
  onBack,
  token,
}: {
  job: Job
  onBack: () => void
  token: string | null
}) {
  const { socket } = useSocket()
  const [agentTexts, setAgentTexts] = useState<Record<string, string>>({})
  const [agentStatus, setAgentStatus] = useState<Record<string, AgentStatus>>({})
  const [agentFindings, setAgentFindings] = useState<Record<string, number>>({})
  const [debateTexts, setDebateTexts] = useState<Record<string, string>>({})
  const [activeAgent, setActiveAgent] = useState<string | null>(null)
  const [findings, setFindings] = useState<Finding[]>([])
  const [liveJob, setLiveJob] = useState<Job>(job)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const verdictCfg = liveJob.result?.verdict
    ? VERDICT_CONFIG[liveJob.result.verdict as keyof typeof VERDICT_CONFIG]
    : null

  // Reload job state via polling
  const pollJob = useCallback(async () => {
    try {
      const res = await authFetch(`/api/jobs/${job.id}`, token)
      if (res.ok) {
        const updated = await res.json() as Job
        setLiveJob(updated)
        if (updated.status === 'completed' || updated.status === 'failed' || updated.status === 'cancelled') {
          if (pollRef.current) clearInterval(pollRef.current)
          if (updated.status === 'completed') {
            const fRes = await authFetch(`/api/jobs/${job.id}/findings`, token)
            if (fRes.ok) setFindings(await fRes.json() as Finding[])
          }
        }
      }
    } catch { /* ignore */ }
  }, [job.id, token])

  useEffect(() => {
    // Subscribe to job room for live streaming
    socket?.emit('job:subscribe', job.id)

    socket?.on('job:token', (data: { jobId: string; phase: string; text: string }) => {
      if (data.jobId !== job.id) return
      setAgentTexts((prev) => ({ ...prev, [data.phase]: (prev[data.phase] ?? '') + data.text }))
      setAgentStatus((prev) => ({ ...prev, [data.phase]: 'thinking' }))
    })

    socket?.on('job:debate', (data: { jobId: string; agent: string; text: string }) => {
      if (data.jobId !== job.id) return
      setDebateTexts((prev) => ({ ...prev, [data.agent]: (prev[data.agent] ?? '') + data.text }))
      setAgentStatus((prev) => ({ ...prev, [data.agent]: 'debate' }))
    })

    socket?.on('job:phase_complete', (data: { jobId: string; phase: string; findings_count: number }) => {
      if (data.jobId !== job.id) return
      setAgentStatus((prev) => ({ ...prev, [data.phase]: 'done' }))
      setAgentFindings((prev) => ({ ...prev, [data.phase]: data.findings_count }))
    })

    socket?.on('job:progress', (data: { jobId: string; phase: string }) => {
      if (data.jobId !== job.id) return
      setAgentStatus((prev) => {
        if (prev[data.phase] === 'done') return prev
        return { ...prev, [data.phase]: 'thinking' }
      })
    })

    socket?.on('job:done', (data: { jobId: string }) => {
      if (data.jobId !== job.id) return
      void pollJob()
    })

    socket?.on('job:failed', (data: { jobId: string }) => {
      if (data.jobId !== job.id) return
      void pollJob()
    })

    // Poll job state every 4s as fallback
    pollRef.current = setInterval(() => void pollJob(), 4000)
    void pollJob()

    return () => {
      socket?.emit('job:unsubscribe', job.id)
      socket?.off('job:token')
      socket?.off('job:debate')
      socket?.off('job:phase_complete')
      socket?.off('job:progress')
      socket?.off('job:done')
      socket?.off('job:failed')
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [job.id, socket, pollJob])

  // Fetch findings if job already completed
  useEffect(() => {
    if (job.status === 'completed') {
      authFetch(`/api/jobs/${job.id}/findings`, token)
        .then((r) => (r.ok ? r.json() : []))
        .then((f) => setFindings(f as Finding[]))
        .catch(() => {})
    }
  }, [job.id, job.status, token])

  const isRunning = liveJob.status === 'running' || liveJob.status === 'queued' || liveJob.status === 'pending'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          ← Back
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg font-semibold text-zinc-100">⚔️ War Room</h1>
            <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', STATUS_COLORS[liveJob.status])}>
              {liveJob.status}
            </span>
            {liveJob.branch && (
              <span className="text-xs text-zinc-500 font-mono bg-zinc-800 px-2 py-0.5 rounded">
                {liveJob.branch}
              </span>
            )}
            {liveJob.pr_number && (
              <span className="text-xs text-zinc-500">PR #{liveJob.pr_number}</span>
            )}
            <span className="text-xs text-zinc-600 capitalize">{liveJob.provider} · {liveJob.model}</span>
          </div>
        </div>
      </div>

      {/* Overall progress bar */}
      {isRunning && (
        <div>
          <div className="flex justify-between text-xs text-zinc-500 mb-1.5">
            <span className="capitalize">{liveJob.phase.replace(/-/g, ' ')}</span>
            <span>{liveJob.progress_percent}%</span>
          </div>
          <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{
                width: `${liveJob.progress_percent}%`,
                background: 'linear-gradient(90deg, #818cf8, #f472b6)',
              }}
            />
          </div>
          <p className="text-[11px] text-zinc-600 mt-1">
            6 agents reviewing in sequence — debate round — consensus synthesis
          </p>
        </div>
      )}

      {/* Agent grid */}
      <div>
        <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">Review Agents</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {AGENTS.map((agent) => (
            <AgentCard
              key={agent.role}
              agent={agent}
              status={agentStatus[agent.role] ?? 'waiting'}
              findingsCount={agentFindings[agent.role] ?? 0}
              liveText={agentTexts[agent.role] ?? ''}
              onClick={() => setActiveAgent(activeAgent === agent.role ? null : agent.role)}
              isActive={activeAgent === agent.role}
            />
          ))}
        </div>
      </div>

      {/* Expanded agent output */}
      {activeAgent && (agentTexts[activeAgent] || agentStatus[activeAgent] === 'done') && (
        <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-4">
          <div className="flex items-center gap-2 mb-3">
            <span>{AGENTS.find((a) => a.role === activeAgent)?.icon}</span>
            <span className="text-sm font-medium" style={{ color: AGENTS.find((a) => a.role === activeAgent)?.color }}>
              {AGENTS.find((a) => a.role === activeAgent)?.label}
            </span>
            <span className="text-xs text-zinc-500">— Raw output</span>
          </div>
          <pre className="text-[11px] text-zinc-300 font-mono whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
            {agentTexts[activeAgent] ?? ''}
            {agentStatus[activeAgent] === 'thinking' && <span className="animate-pulse">▋</span>}
          </pre>
        </div>
      )}

      {/* Debate section */}
      {Object.keys(debateTexts).length > 0 && (
        <div className="rounded-xl border border-yellow-800/50 bg-yellow-950/20 p-4">
          <h2 className="text-sm font-semibold text-yellow-400 mb-3">⚔️ War Room Debate</h2>
          <div className="space-y-4">
            {Object.entries(debateTexts).map(([agent, text]) => {
              const agentCfg = AGENTS.find((a) => a.role === agent)
              return (
                <div key={agent}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-base">{agentCfg?.icon ?? '🤖'}</span>
                    <span className="text-xs font-semibold" style={{ color: agentCfg?.color ?? '#fff' }}>
                      {agentCfg?.label ?? agent}
                    </span>
                    <span className="text-[10px] text-zinc-600">responds:</span>
                  </div>
                  <p className="text-sm text-zinc-300 leading-relaxed pl-6">
                    {text}
                    {agentStatus[agent] === 'debate' && <span className="animate-pulse">▋</span>}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Synthesis streaming */}
      {agentTexts['synthesis'] && (
        <div className="rounded-xl border border-blue-800/50 bg-blue-950/20 p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">🧠</span>
            <h2 className="text-sm font-semibold text-blue-400">Consensus Engine</h2>
            {agentStatus['synthesis'] === 'thinking' && (
              <span className="text-[10px] text-blue-500 animate-pulse">synthesizing…</span>
            )}
          </div>
          <pre className="text-[11px] text-zinc-300 font-mono whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto">
            {agentTexts['synthesis']}
            {agentStatus['synthesis'] === 'thinking' && <span className="animate-pulse">▋</span>}
          </pre>
        </div>
      )}

      {/* Verdict */}
      {liveJob.result?.verdict && verdictCfg && (
        <div className={cn('rounded-xl border p-5', verdictCfg.bg)}>
          <div className="flex items-start gap-4">
            <span className="text-3xl">{verdictCfg.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className={cn('text-lg font-bold', verdictCfg.color)}>{verdictCfg.label}</p>
              {liveJob.result.summary && (
                <p className="text-sm text-zinc-300 mt-1 leading-relaxed">{liveJob.result.summary}</p>
              )}
              <div className="flex items-center gap-4 mt-2 text-xs text-zinc-500">
                {liveJob.result.findings_count !== undefined && (
                  <span>{liveJob.result.findings_count} total findings</span>
                )}
                {liveJob.tokens_used > 0 && (
                  <span>{liveJob.tokens_used.toLocaleString()} tokens · ${parseFloat(liveJob.cost_usd).toFixed(4)}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {liveJob.error_message && (
        <div className="rounded-xl border border-red-800 bg-red-950/30 p-4">
          <p className="text-sm font-medium text-red-400 mb-1">Review failed</p>
          <p className="text-sm text-zinc-400">{liveJob.error_message}</p>
        </div>
      )}

      {/* Findings table */}
      {findings.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-zinc-400 mb-3">{findings.length} Findings</h2>
          <div className="space-y-2">
            {findings.map((f) => {
              const sev = SEVERITY_CONFIG[f.severity] ?? SEVERITY_CONFIG.info
              const agentCfg = AGENTS.find((a) => a.role === f.reviewer_persona)
              return (
                <div key={f.id} className={cn('rounded-lg border border-zinc-800 p-4', sev.bg)}>
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded', sev.badge)}>
                          {sev.label}
                        </span>
                        {f.is_blocker && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-900 text-red-300">
                            BLOCKER
                          </span>
                        )}
                        <span className="text-sm font-medium text-zinc-100">{f.title}</span>
                      </div>
                      {f.file_path && (
                        <p className="text-[11px] font-mono text-zinc-500 mb-1">
                          {f.file_path}
                          {f.line_start ? `:${f.line_start}` : ''}
                          {f.line_end && f.line_end !== f.line_start ? `-${f.line_end}` : ''}
                        </p>
                      )}
                      <p className="text-sm text-zinc-300 leading-relaxed">{f.summary}</p>
                      {f.suggestion && (
                        <div className="mt-2 rounded-lg bg-zinc-800/60 px-3 py-2">
                          <p className="text-[10px] text-zinc-500 font-medium mb-0.5">Suggestion</p>
                          <p className="text-xs text-zinc-300">{f.suggestion}</p>
                        </div>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="text-base" title={agentCfg?.label}>{agentCfg?.icon ?? '🤖'}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Submit form ───────────────────────────────────────────────────────────────

function SubmitForm({
  onSuccess,
  token,
  onClose,
}: {
  onSuccess: (job: Job) => void
  token: string | null
  onClose: () => void
}) {
  const [inputMode, setInputMode] = useState<'diff' | 'github'>('diff')
  const [diff, setDiff] = useState('')
  const [githubUrl, setGithubUrl] = useState('')
  const [githubToken, setGithubToken] = useState('')
  const [fetchingPr, setFetchingPr] = useState(false)
  const [fetchedDiff, setFetchedDiff] = useState<{ diff: string; branch: string; pr_number: number } | null>(null)
  const [fetchError, setFetchError] = useState('')
  const [branch, setBranch] = useState('')
  const [provider, setProvider] = useState('anthropic')
  const [model, setModel] = useState('claude-opus-4-5')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  async function fetchPr() {
    if (!githubUrl) return
    setFetchingPr(true)
    setFetchError('')
    setFetchedDiff(null)
    try {
      const res = await authFetch('/api/jobs/fetch-pr', token, {
        method: 'POST',
        body: JSON.stringify({ github_pr_url: githubUrl, github_token: githubToken || undefined }),
      })
      const data = await res.json() as { diff?: string; branch?: string; pr_number?: number; error?: string }
      if (!res.ok || data.error) { setFetchError(data.error ?? 'Failed to fetch PR'); return }
      setFetchedDiff({ diff: data.diff!, branch: data.branch!, pr_number: data.pr_number! })
      setBranch(data.branch!)
    } catch {
      setFetchError('Failed to fetch PR diff')
    } finally {
      setFetchingPr(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError('')
    setSubmitting(true)
    try {
      const body: Record<string, unknown> = { provider, model }
      if (inputMode === 'github' && fetchedDiff) {
        body['diff_content'] = fetchedDiff.diff
        body['branch'] = fetchedDiff.branch
        body['pr_number'] = fetchedDiff.pr_number
        body['github_pr_url'] = githubUrl
      } else {
        body['diff_content'] = diff
        if (branch) body['branch'] = branch
      }

      const res = await authFetch('/api/jobs', token, { method: 'POST', body: JSON.stringify(body) })
      const data = await res.json() as Job & { error?: string }
      if (!res.ok) { setSubmitError(data.error ?? 'Failed to submit'); return }
      onSuccess(data)
    } catch {
      setSubmitError('Failed to submit review')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 mb-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-sm font-semibold text-zinc-200">New War Room Review</h2>
        <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 text-sm">✕</button>
      </div>

      {/* Input mode tabs */}
      <div className="flex gap-1 mb-5 bg-zinc-800 rounded-lg p-1 w-fit">
        <button
          onClick={() => setInputMode('diff')}
          className={cn('px-3 py-1.5 text-xs rounded-md transition-colors font-medium', inputMode === 'diff' ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200')}
        >
          Paste Diff
        </button>
        <button
          onClick={() => setInputMode('github')}
          className={cn('px-3 py-1.5 text-xs rounded-md transition-colors font-medium', inputMode === 'github' ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200')}
        >
          GitHub PR URL
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {inputMode === 'diff' ? (
          <>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Git Diff *</label>
              <textarea
                value={diff}
                onChange={(e) => setDiff(e.target.value)}
                required
                rows={10}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Paste your git diff here…"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Branch (optional)</label>
              <input
                type="text"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                placeholder="feature/..."
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm"
              />
            </div>
          </>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-zinc-400 mb-1">GitHub PR URL *</label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  placeholder="https://github.com/owner/repo/pull/123"
                  className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm"
                />
                <button
                  type="button"
                  onClick={fetchPr}
                  disabled={!githubUrl || fetchingPr}
                  className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 text-zinc-200 text-sm rounded-lg transition-colors"
                >
                  {fetchingPr ? 'Fetching…' : 'Fetch'}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">GitHub Token (for private repos)</label>
              <input
                type="password"
                value={githubToken}
                onChange={(e) => setGithubToken(e.target.value)}
                placeholder="ghp_... (optional for public repos)"
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm"
              />
            </div>
            {fetchError && (
              <div className="rounded-lg bg-red-950/50 border border-red-800 px-3 py-2">
                <p className="text-xs text-red-400">{fetchError}</p>
              </div>
            )}
            {fetchedDiff && (
              <div className="rounded-lg bg-green-950/50 border border-green-800 px-3 py-2">
                <p className="text-xs text-green-400">
                  ✓ Fetched diff for PR #{fetchedDiff.pr_number} · branch: {fetchedDiff.branch} · {Math.round(fetchedDiff.diff.length / 1024)}KB
                </p>
              </div>
            )}
          </div>
        )}

        {/* Model selection */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Provider</label>
            <select
              value={provider}
              onChange={(e) => {
                setProvider(e.target.value)
                setModel(e.target.value === 'anthropic' ? 'claude-opus-4-5' : 'gpt-4o')
              }}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm"
            >
              <option value="anthropic">Anthropic (Claude)</option>
              <option value="openai">OpenAI (GPT)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Model</label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm"
            >
              {provider === 'anthropic' ? (
                <>
                  <option value="claude-opus-4-5">Claude Opus (best)</option>
                  <option value="claude-sonnet-4-5">Claude Sonnet (faster)</option>
                  <option value="claude-haiku-4-5">Claude Haiku (cheapest)</option>
                </>
              ) : (
                <>
                  <option value="gpt-4o">GPT-4o (best)</option>
                  <option value="gpt-4o-mini">GPT-4o Mini (faster)</option>
                  <option value="o1-preview">o1 Preview</option>
                </>
              )}
            </select>
          </div>
        </div>

        <div className="rounded-lg bg-zinc-800/60 px-3 py-2">
          <p className="text-[10px] text-zinc-500">
            🤖 6 agents will review in sequence: The Visionary, The Lead, The Paranoid, The Speed Demon, The Pedant, The Devil's Advocate → Debate Round → Consensus Engine
          </p>
        </div>

        {submitError && (
          <div className="rounded-lg bg-red-950/50 border border-red-800 px-3 py-2">
            <p className="text-sm text-red-400">{submitError}</p>
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={submitting || (inputMode === 'github' && !fetchedDiff)}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {submitting ? 'Starting War Room…' : 'Launch War Room ⚔️'}
          </button>
          <button type="button" onClick={onClose} className="px-4 py-2 text-zinc-400 hover:text-zinc-200 text-sm">
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function ReviewJobsPage() {
  const { getAccessToken } = useAuthContext()
  const token = getAccessToken()

  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [showSubmit, setShowSubmit] = useState(false)
  const [activeJob, setActiveJob] = useState<Job | null>(null)

  async function loadJobs() {
    try {
      const res = await authFetch('/api/jobs?limit=30', token)
      if (res.ok) {
        const data = await res.json() as { jobs: Job[] }
        setJobs(data.jobs ?? [])
      }
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadJobs()
    const interval = setInterval(() => void loadJobs(), 8000)
    return () => clearInterval(interval)
  }, [token])

  function handleJobCreated(job: Job) {
    setShowSubmit(false)
    setJobs((prev) => [job, ...prev])
    setActiveJob(job)
  }

  if (activeJob) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4">
        <WarRoom
          job={activeJob}
          onBack={() => {
            setActiveJob(null)
            void loadJobs()
          }}
          token={token}
        />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100">⚔️ AI War Room</h1>
          <p className="text-zinc-400 text-sm mt-0.5">6-agent code review · debate round · consensus engine</p>
        </div>
        <button
          onClick={() => setShowSubmit(true)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          Launch War Room ⚔️
        </button>
      </div>

      {/* Submit form */}
      {showSubmit && (
        <SubmitForm
          onSuccess={handleJobCreated}
          token={token}
          onClose={() => setShowSubmit(false)}
        />
      )}

      {/* Agent legend */}
      {!showSubmit && (
        <div className="grid grid-cols-3 gap-2 mb-6 sm:grid-cols-6">
          {AGENTS.map((a) => (
            <div key={a.role} className="flex flex-col items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-900 p-2 text-center">
              <span className="text-xl">{a.icon}</span>
              <span className="text-[10px] font-medium leading-tight" style={{ color: a.color }}>{a.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Jobs list */}
      <div className="space-y-2">
        {loading && <p className="text-zinc-500 text-sm">Loading…</p>}
        {!loading && jobs.length === 0 && (
          <div className="text-center py-16 text-zinc-500">
            <p className="text-4xl mb-3">⚔️</p>
            <p className="text-sm font-medium text-zinc-400 mb-1">No reviews yet</p>
            <p className="text-xs text-zinc-600 mb-4">Launch a War Room to get 6 AI agents debating your code</p>
            <button onClick={() => setShowSubmit(true)} className="text-indigo-400 hover:text-indigo-300 text-sm">
              Launch your first War Room →
            </button>
          </div>
        )}

        {jobs.map((job) => {
          const verdictCfg = job.result?.verdict ? VERDICT_CONFIG[job.result.verdict as keyof typeof VERDICT_CONFIG] : null
          return (
            <button
              key={job.id}
              onClick={() => setActiveJob(job)}
              className="w-full text-left rounded-xl border border-zinc-800 bg-zinc-900 p-4 hover:border-zinc-700 hover:bg-zinc-800/60 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', STATUS_COLORS[job.status])}>
                      {job.status}
                    </span>
                    {verdictCfg && (
                      <span className={cn('text-xs font-semibold', verdictCfg.color)}>
                        {verdictCfg.label}
                      </span>
                    )}
                    <span className="text-xs text-zinc-500 capitalize">{job.provider} · {job.model}</span>
                    {job.branch && (
                      <span className="text-xs text-zinc-500 font-mono bg-zinc-800 px-1.5 py-0.5 rounded">
                        {job.branch}
                      </span>
                    )}
                  </div>

                  {job.status === 'running' && (
                    <div className="mt-2 mb-2">
                      <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
                        <span className="capitalize">{job.phase.replace(/-/g, ' ')}</span>
                        <span>{job.progress_percent}%</span>
                      </div>
                      <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-1000"
                          style={{
                            width: `${job.progress_percent}%`,
                            background: 'linear-gradient(90deg, #818cf8, #f472b6)',
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {job.result?.summary && (
                    <p className="text-sm text-zinc-400 line-clamp-2 mt-1">{job.result.summary}</p>
                  )}

                  {job.error_message && (
                    <p className="text-sm text-red-400 mt-1 line-clamp-1">{job.error_message}</p>
                  )}

                  <div className="flex items-center gap-3 mt-1.5 text-xs text-zinc-500">
                    {job.result?.findings_count !== undefined && (
                      <span>{job.result.findings_count} findings</span>
                    )}
                    {job.tokens_used > 0 && (
                      <span>{job.tokens_used.toLocaleString()} tokens · ${parseFloat(job.cost_usd).toFixed(4)}</span>
                    )}
                    <span>{new Date(job.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="shrink-0 text-xs text-zinc-600">
                  {job.status === 'running' ? '⚔️ Live' : 'View →'}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
