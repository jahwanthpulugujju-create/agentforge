import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import { RecentSessions } from './components/recent-sessions'
import { fetchApi } from '../../lib/utils'
import type { DashboardStats, SessionSummary } from '../../lib/api-types'

/* ── Capability widgets — one per agent ─────────────────────────────────── */

function ArchWidget() {
  const nodes = [
    { id: 'Client',  x: 8,  y: 6  },
    { id: 'Gateway', x: 40, y: 38 },
    { id: 'Service', x: 72, y: 6  },
    { id: 'Cache',   x: 72, y: 58 },
    { id: 'Queue',   x: 14, y: 70 },
  ]
  const edges = [[0,1],[1,2],[1,3],[1,4]]
  return (
    <div className="relative" style={{ height: 78 }}>
      <svg className="absolute inset-0 w-full h-full" style={{ overflow: 'visible' }}>
        {edges.map(([a,b],i) => {
          const n1 = nodes[a]; const n2 = nodes[b]
          return <line key={i}
            x1={`${n1.x+3.5}%`} y1={`${n1.y+8}%`}
            x2={`${n2.x+3.5}%`} y2={`${n2.y+8}%`}
            stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
        })}
      </svg>
      {nodes.map(n => (
        <div key={n.id} className="absolute font-mono text-[9px] rounded px-1.5 py-0.5"
          style={{ left: `${n.x}%`, top: `${n.y}%`,
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)',
            color: 'rgba(255,255,255,0.4)', transform: 'translateY(-50%)' }}>
          {n.id}
        </div>
      ))}
    </div>
  )
}

function CodeWidget() {
  return (
    <div className="rounded font-mono text-[10px] leading-[1.75] overflow-hidden"
      style={{ background: 'rgba(0,0,0,0.4)', padding: '9px 12px', border: '1px solid rgba(255,255,255,0.05)' }}>
      <div><span style={{ color: '#569cd6' }}>const</span><span style={{ color: '#9cdcfe' }}> query</span><span style={{ color: '#d4d4d4' }}> = </span><span style={{ color: '#ce9178' }}>`SELECT * FROM users`</span></div>
      <div style={{ color: '#608b4e' }}>{'// ← no parameterization'}</div>
      <div><span style={{ color: '#569cd6' }}>await</span><span style={{ color: '#d4d4d4' }}> db.</span><span style={{ color: '#dcdcaa' }}>query</span><span style={{ color: '#d4d4d4' }}>(query)</span></div>
      <div style={{ color: '#f87171', fontSize: 9 }}>█ SQL injection risk</div>
    </div>
  )
}

function RiskWidget() {
  const score = 8.3
  return (
    <div className="space-y-2.5">
      <div className="flex items-baseline gap-2">
        <span className="font-mono text-[2.25rem] font-bold leading-none" style={{ color: '#f8fafc' }}>
          {score.toFixed(1)}
        </span>
        <span className="font-mono text-[9px]" style={{ color: '#1f2937' }}>CVSS / 10</span>
      </div>
      <div className="h-px w-full" style={{ background: 'rgba(255,255,255,0.05)' }}>
        <div className="h-px" style={{ width: `${score * 10}%`, background: '#f87171' }} />
      </div>
      <div className="flex flex-wrap gap-1">
        {['SQLi','XSS','SSRF','Auth bypass','Secrets'].map(v => (
          <span key={v} className="rounded font-mono text-[8.5px] px-1.5 py-px"
            style={{ background: 'rgba(248,113,113,0.06)', color: 'rgba(248,113,113,0.55)', border: '1px solid rgba(248,113,113,0.12)' }}>
            {v}
          </span>
        ))}
      </div>
    </div>
  )
}

function PerfWidget() {
  const bars = [44, 71, 36, 90, 58, 67, 28, 82, 61, 77]
  return (
    <div className="space-y-1.5">
      <div className="flex items-end gap-0.5" style={{ height: 46 }}>
        {bars.map((h, i) => (
          <div key={i} className="flex-1 rounded-sm" style={{
            height: `${h}%`,
            background: h > 70
              ? 'rgba(255,255,255,0.18)'
              : h > 45
                ? 'rgba(255,255,255,0.08)'
                : 'rgba(255,255,255,0.04)',
          }} />
        ))}
      </div>
      <div className="flex justify-between font-mono text-[8.5px]" style={{ color: '#1f2937' }}>
        <span>p50 · 38ms</span><span>p99 · 612ms</span>
      </div>
    </div>
  )
}

function ReviewWidget() {
  const items = [
    { done: true,  text: 'Type safety enforced' },
    { done: true,  text: 'Error boundaries present' },
    { done: false, text: 'Test coverage ≥ 80%' },
    { done: false, text: 'Public APIs documented' },
    { done: true,  text: 'No debug output in prod' },
  ]
  return (
    <div className="space-y-1.5">
      {items.map(({ done, text }) => (
        <div key={text} className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 shrink-0 rounded-sm flex items-center justify-center"
            style={{
              background: done ? 'rgba(255,255,255,0.06)' : 'transparent',
              border: `1px solid ${done ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.05)'}`,
            }}>
            {done && <svg viewBox="0 0 10 10" className="h-1.5 w-1.5"><polyline points="1.5,5 4,7.5 8.5,2.5" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
          </div>
          <span className="text-[10px]" style={{ color: done ? '#374151' : '#111827' }}>
            {text}
          </span>
        </div>
      ))}
    </div>
  )
}

function DevilWidget() {
  return (
    <div className="space-y-2" style={{ padding: '10px 12px', background: 'rgba(0,0,0,0.3)', borderRadius: 6, border: '1px solid rgba(255,255,255,0.05)' }}>
      <p className="text-[1.75rem] leading-none" style={{ color: 'rgba(255,255,255,0.07)' }}>"</p>
      <p className="text-[11px] italic leading-relaxed" style={{ color: '#1f2937' }}>
        Why REST when gRPC cuts latency by 40% and gives you a typed contract for free?
      </p>
    </div>
  )
}

const AGENTS = [
  { idx: '01', name: 'Architect',          handle: 'The Visionary',     color: '#38bdf8', tech: 'Gemini 1.5 Pro',  tagline: 'Designs topology and API contracts before a single line ships.',         widget: <ArchWidget /> },
  { idx: '02', name: 'Coder',              handle: 'The Builder',        color: '#34d399', tech: 'Claude 3.5',      tagline: 'Iterates until Security and Performance both sign off.',                  widget: <CodeWidget /> },
  { idx: '03', name: 'Security',           handle: 'The Paranoid',       color: '#f87171', tech: 'CodeLlama 13B',   tagline: 'Attacks every vector, route, and dependency with OWASP Top 10.',         widget: <RiskWidget /> },
  { idx: '04', name: 'Performance',        handle: 'The Speed Demon',    color: '#fbbf24', tech: 'Claude 3.5',      tagline: 'Benchmarks every hot path. bcrypt @ rounds=12 is 300ms. Drop it.',        widget: <PerfWidget /> },
  { idx: '05', name: 'Reviewer',           handle: 'The Perfectionist',  color: '#a78bfa', tech: 'Gemini 1.5 Pro',  tagline: 'Style, coverage, documentation. Nothing merges with a red checkbox.',       widget: <ReviewWidget /> },
  { idx: '06', name: "Devil's Advocate",   handle: 'The Skeptic',        color: '#f472b6', tech: 'Claude 3.5',      tagline: 'Challenges the approach itself. Always asks why.',                         widget: <DevilWidget /> },
]

const LOOP_STEPS = [
  'Architect designs the system and API surface',
  'Coder writes the first implementation',
  'Security runs OWASP Top 10 and dep audit',
  'Performance benchmarks every hot path',
  'Reviewer checks coverage, style, and docs',
  "Devil's Advocate challenges the fundamental approach",
  'Vote — blocked means return to step 1',
  'Consensus → PR generated automatically',
]

export function HomePage() {
  const statsQ = useQuery<DashboardStats>({
    queryKey: ['stats'],
    queryFn: () => fetchApi<DashboardStats>('/api/stats'),
  })
  const sessionsQ = useQuery<SessionSummary[]>({
    queryKey: ['sessions', 'recent'],
    queryFn: () => fetchApi<SessionSummary[]>('/api/sessions?limit=8'),
  })
  const s = statsQ.data

  return (
    <div className="max-w-5xl space-y-20 pb-20">

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="pt-6 space-y-8">
        <p className="font-mono text-[11px]" style={{ color: '#111827' }}>
          agentforge / overview
        </p>

        <div>
          <h1 className="text-[3.75rem] font-bold leading-[1.02]"
            style={{ color: '#f8fafc', letterSpacing: '-0.03em' }}>
            Code review,<br />
            done by committee.
          </h1>
          <p className="mt-5 text-base leading-relaxed max-w-[38ch]" style={{ color: '#1f2937' }}>
            Six agents argue about your code before it ships. One writes it.
            One breaks it. One questions whether it should exist at all.
          </p>
        </div>

        {/* Stats — monumental numbers on black */}
        <div className="flex items-stretch pt-8" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          {[
            { n: s?.totalSessions    ?? '—', l: 'sessions'     },
            { n: s?.completedReviews ?? '—', l: 'reviews done' },
            { n: s?.unresolvedBlockers ?? '—', l: 'blockers'   },
            { n: s?.filesTracked     ?? '—', l: 'files'        },
          ].map(({ n, l }, i) => (
            <div key={l} className="flex-1 relative">
              {i > 0 && (
                <div className="absolute left-0 top-0 bottom-0 w-px"
                  style={{ background: 'rgba(255,255,255,0.05)' }} />
              )}
              <div className={`${i > 0 ? 'pl-8' : ''}`}>
                <div className="text-[3.25rem] font-bold font-mono leading-none tracking-tight"
                  style={{ color: '#f8fafc' }}>
                  {n}
                </div>
                <div className="font-mono text-[9px] mt-2 uppercase tracking-widest" style={{ color: '#111827' }}>
                  {l}
                </div>
              </div>
            </div>
          ))}
          <div className="flex items-start pt-1 pl-8">
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full animate-forge-pulse" style={{ background: '#34d399' }} />
              <span className="font-mono text-[10px]" style={{ color: '#34d399' }}>live</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Agent grid ────────────────────────────────────────────────────── */}
      <section>
        <div className="flex items-baseline justify-between mb-8">
          <h2 className="text-lg font-semibold" style={{ color: '#e2e8f0', letterSpacing: '-0.01em' }}>
            The Six
          </h2>
          <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: '#111827' }}>
            adversarial · consensus required
          </span>
        </div>

        <div className="grid grid-cols-3 gap-px" style={{ background: 'rgba(255,255,255,0.05)' }}>
          {AGENTS.map((a) => (
            <div key={a.idx} className="flex flex-col"
              style={{ background: '#030305' }}>
              {/* Agent color — 2px accent strip, the ONLY color on the card */}
              <div style={{ height: 2, background: a.color, opacity: 0.7 }} />

              <div className="flex flex-col flex-1 gap-4 p-5">
                <div>
                  <div className="flex items-baseline justify-between mb-1.5">
                    <span className="text-[15px] font-semibold" style={{ color: '#e2e8f0' }}>
                      {a.name}
                    </span>
                    <span className="font-mono text-[8px]" style={{ color: 'rgba(255,255,255,0.1)' }}>
                      {a.idx}
                    </span>
                  </div>
                  <p className="text-[11px] leading-relaxed" style={{ color: '#1f2937' }}>
                    {a.tagline}
                  </p>
                </div>

                <div className="flex-1">{a.widget}</div>

                <div className="flex items-center justify-between"
                  style={{ borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: 10 }}>
                  <span className="font-mono text-[8.5px]" style={{ color: '#111827' }}>{a.tech}</span>
                  <div className="flex items-center gap-1.5">
                    <div className="h-1 w-1 rounded-full" style={{ background: '#1f2937' }} />
                    <span className="font-mono text-[8.5px]" style={{ color: '#111827' }}>standby</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Loop + Recent ─────────────────────────────────────────────────── */}
      <section className="grid grid-cols-2 gap-16">

        {/* Adversarial loop */}
        <div>
          <h2 className="text-lg font-semibold mb-4" style={{ color: '#e2e8f0', letterSpacing: '-0.01em' }}>
            The adversarial loop
          </h2>
          <p className="text-[13px] leading-relaxed mb-8" style={{ color: '#1f2937' }}>
            Agents vote. Both Security and Performance must approve. No single
            agent can unblock a bad PR.
          </p>

          <ol className="space-y-0">
            {LOOP_STEPS.map((step, i) => (
              <li key={i} className="flex gap-4 py-3"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <span className="font-mono text-[9px] shrink-0 mt-[3px]"
                  style={{ color: 'rgba(255,255,255,0.08)' }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="text-[12.5px] leading-snug" style={{ color: '#374151' }}>
                  {step}
                </span>
              </li>
            ))}
          </ol>
        </div>

        {/* Recent sessions */}
        <div>
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-lg font-semibold" style={{ color: '#e2e8f0', letterSpacing: '-0.01em' }}>
              Recent
            </h2>
            <Link to="/sessions"
              className="flex items-center gap-1 text-[11px] transition-colors"
              style={{ color: '#1f2937' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#6b7280' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#1f2937' }}>
              all sessions <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          {sessionsQ.isLoading ? (
            <p className="font-mono text-[11px]" style={{ color: '#111827' }}>loading…</p>
          ) : (
            <RecentSessions sessions={sessionsQ.data ?? []} />
          )}
        </div>
      </section>

      {(statsQ.isError || sessionsQ.isError) && (
        <div className="rounded p-4 font-mono text-[12px]"
          style={{ background: 'rgba(248,113,113,0.04)', border: '1px solid rgba(248,113,113,0.12)', color: '#f87171' }}>
          Server unreachable — check the backend is running.
        </div>
      )}
    </div>
  )
}
