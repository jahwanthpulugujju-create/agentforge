import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import { RecentSessions } from './components/recent-sessions'
import { fetchApi } from '../../lib/utils'
import type { DashboardStats, SessionSummary } from '../../lib/api-types'

/* ── Tiny inline widgets — each agent gets something genuinely different ────── */

function CodeWidget() {
  return (
    <div className="rounded font-mono text-[10.5px] leading-[1.7] overflow-hidden"
      style={{ background: 'rgba(0,0,0,0.3)', padding: '10px 12px' }}>
      <div><span style={{ color: '#569cd6' }}>const</span><span style={{ color: '#9cdcfe' }}> handler</span> <span style={{ color: '#d4d4d4' }}>= async</span><span style={{ color: '#dcdcaa' }}>(req)</span> <span style={{ color: '#d4d4d4' }}>{'=>'} {'{'}</span></div>
      <div><span style={{ color: '#d4d4d4' }}>  </span><span style={{ color: '#569cd6' }}>const</span><span style={{ color: '#9cdcfe' }}> data</span> <span style={{ color: '#d4d4d4' }}>= </span><span style={{ color: '#569cd6' }}>await</span> <span style={{ color: '#9cdcfe' }}>db</span><span style={{ color: '#d4d4d4' }}>.</span><span style={{ color: '#dcdcaa' }}>query</span><span style={{ color: '#d4d4d4' }}>(sql)</span></div>
      <div style={{ color: '#6a9955' }}>  {'//'} ← no sanitization</div>
      <div><span style={{ color: '#d4d4d4' }}>  </span><span style={{ color: '#c586c0' }}>return</span><span style={{ color: '#9cdcfe' }}> res</span><span style={{ color: '#d4d4d4' }}>.</span><span style={{ color: '#dcdcaa' }}>json</span><span style={{ color: '#d4d4d4' }}>(data)</span></div>
      <div style={{ color: '#d4d4d4' }}>{'}'}</div>
    </div>
  )
}

function ArchWidget() {
  const nodes = [
    { id: 'Client', x: 12,  y: 8  },
    { id: 'API',    x: 42,  y: 40 },
    { id: 'DB',     x: 74,  y: 12 },
    { id: 'Cache',  x: 74,  y: 62 },
    { id: 'Queue',  x: 18,  y: 72 },
  ]
  const edges = [
    [0,1],[1,2],[1,3],[1,4]
  ]
  return (
    <div className="relative" style={{ height: 80 }}>
      <svg className="absolute inset-0 w-full h-full" style={{ overflow: 'visible' }}>
        {edges.map(([a,b],i) => {
          const n1 = nodes[a]; const n2 = nodes[b]
          return <line key={i}
            x1={`${n1.x + 4}%`} y1={`${n1.y + 8}%`}
            x2={`${n2.x + 4}%`} y2={`${n2.y + 8}%`}
            stroke="rgba(56,189,248,0.2)" strokeWidth="1" strokeDasharray="3 3" />
        })}
      </svg>
      {nodes.map(n => (
        <div key={n.id} className="absolute font-mono text-[9px] rounded px-1.5 py-0.5"
          style={{
            left: `${n.x}%`, top: `${n.y}%`,
            background: 'rgba(56,189,248,0.07)',
            border: '1px solid rgba(56,189,248,0.18)',
            color: '#38bdf8',
            transform: 'translateY(-50%)',
          }}>
          {n.id}
        </div>
      ))}
    </div>
  )
}

function RiskWidget() {
  const score = 8.3
  const w = (score / 10) * 100
  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-3xl font-bold" style={{ color: '#f87171' }}>{score.toFixed(1)}</span>
        <span className="font-mono text-[10px]" style={{ color: '#2d3748' }}>CVSS</span>
      </div>
      <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
        <div className="h-full rounded-full" style={{ width: `${w}%`, background: 'linear-gradient(90deg,#f87171,#fca5a5)' }} />
      </div>
      <div className="flex flex-wrap gap-1">
        {['SQLi','XSS','SSRF','Auth','Deps','Secrets'].map(v => (
          <span key={v} className="rounded font-mono text-[9px] px-1.5 py-px"
            style={{ background: 'rgba(248,113,113,0.07)', color: '#f87171', border: '1px solid rgba(248,113,113,0.15)' }}>
            {v}
          </span>
        ))}
      </div>
    </div>
  )
}

function PerfWidget() {
  const bars = [44, 71, 36, 90, 58, 67, 28, 82]
  return (
    <div className="space-y-2">
      <div className="flex items-end gap-1" style={{ height: 44 }}>
        {bars.map((h, i) => (
          <div key={i} className="flex-1 rounded-sm transition-all" style={{
            height: `${h}%`,
            background: h > 75
              ? 'linear-gradient(to top,#34d399,rgba(52,211,153,0.4))'
              : h > 45
                ? 'linear-gradient(to top,#fbbf24,rgba(251,191,36,0.4))'
                : 'linear-gradient(to top,#f87171,rgba(248,113,113,0.4))',
          }} />
        ))}
      </div>
      <div className="flex justify-between font-mono text-[9px]" style={{ color: '#2d3748' }}>
        <span>p50 · 38ms</span><span>p99 · 612ms</span>
      </div>
    </div>
  )
}

function ReviewWidget() {
  const items = [
    { done: true,  text: 'Strict type safety' },
    { done: true,  text: 'Error boundary coverage' },
    { done: false, text: 'Unit test coverage ≥ 80%' },
    { done: false, text: 'Public APIs documented' },
    { done: true,  text: 'No debug output in prod' },
  ]
  return (
    <div className="space-y-1.5">
      {items.map(({ done, text }) => (
        <div key={text} className="flex items-center gap-2">
          <div className="h-3 w-3 shrink-0 rounded-sm flex items-center justify-center"
            style={{
              background: done ? 'rgba(167,139,250,0.1)' : 'transparent',
              border: `1px solid ${done ? 'rgba(167,139,250,0.35)' : 'rgba(255,255,255,0.07)'}`,
            }}>
            {done && <svg viewBox="0 0 10 10" className="h-2 w-2"><polyline points="1.5,5 4,7.5 8.5,2.5" fill="none" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
          </div>
          <span className="text-[10px]" style={{ color: done ? '#475569' : '#1e293b', textDecoration: done ? 'none' : 'line-through' }}>
            {text}
          </span>
        </div>
      ))}
    </div>
  )
}

function DevilWidget() {
  return (
    <div className="rounded space-y-2" style={{ background: 'rgba(244,114,182,0.05)', padding: '10px 12px', border: '1px solid rgba(244,114,182,0.1)' }}>
      <p className="text-[22px] leading-none" style={{ color: 'rgba(244,114,182,0.25)' }}>"</p>
      <p className="text-[11px] italic leading-relaxed" style={{ color: '#374151' }}>
        Why REST? gRPC reduces latency by 40% and gives you a typed contract for free.
      </p>
    </div>
  )
}

const AGENTS = [
  { idx: '01', name: 'Architect',        handle: 'The Visionary',    color: '#38bdf8', tech: 'Gemini 1.5 Pro', tagline: 'Designs system topology and API contracts before implementation begins.', widget: <ArchWidget /> },
  { idx: '02', name: 'Coder',            handle: 'The Builder',      color: '#34d399', tech: 'Claude 3.5',     tagline: 'Implements and iterates until Security and Performance sign off.',        widget: <CodeWidget /> },
  { idx: '03', name: 'Security',         handle: 'The Paranoid',     color: '#f87171', tech: 'CodeLlama 13B',  tagline: 'Attacks every input vector, route, and dependency with OWASP Top 10.',   widget: <RiskWidget /> },
  { idx: '04', name: 'Performance',      handle: 'The Speed Demon',  color: '#fbbf24', tech: 'Claude 3.5',     tagline: 'Benchmarks every hot path. bcrypt at 12 rounds = 300ms. Drop to 10.',    widget: <PerfWidget /> },
  { idx: '05', name: 'Reviewer',         handle: 'The Perfectionist',color: '#a78bfa', tech: 'Gemini 1.5 Pro', tagline: 'Style, coverage, docs. Nothing ships without a complete tick list.',       widget: <ReviewWidget /> },
  { idx: '06', name: "Devil's Advocate", handle: 'The Skeptic',      color: '#f472b6', tech: 'Claude 3.5',     tagline: 'Challenges the approach itself. The one who asks why at every turn.',      widget: <DevilWidget /> },
]

const LOOP_STEPS = [
  'Coder writes the first implementation',
  'Security attacks it with OWASP Top 10',
  'Performance benchmarks every hot path',
  'Reviewer checks coverage and style',
  "Devil's Advocate challenges the design",
  'Vote — if blocked, return to step 1',
  'Consensus reached → PR generated',
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
    <div className="max-w-5xl space-y-20 pb-16">

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="pt-4 space-y-8">
        <p className="font-mono text-xs" style={{ color: '#1e293b' }}>
          agentforge / dashboard
        </p>

        <div>
          <h1 className="text-[3.6rem] font-bold leading-[1.04] tracking-tight" style={{ color: '#f0f4f8', letterSpacing: '-0.025em' }}>
            Code review,<br />
            <span style={{ color: '#38bdf8' }}>done by committee.</span>
          </h1>
          <p className="mt-5 text-[1.0625rem] leading-relaxed max-w-md" style={{ color: '#374151' }}>
            Six agents debate every line before it merges. One writes it.
            One breaks it. One questions whether it should exist at all.
          </p>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-0 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {[
            { n: s?.totalSessions ?? '—',      l: 'sessions' },
            { n: s?.completedReviews ?? '—',   l: 'reviews' },
            { n: s?.unresolvedBlockers ?? '—', l: 'blockers' },
            { n: s?.filesTracked ?? '—',       l: 'files tracked' },
          ].map(({ n, l }, i) => (
            <div key={l} className="flex-1 pt-6">
              {i > 0 && <div className="absolute inset-y-0 left-0" style={{ borderLeft: '1px solid rgba(255,255,255,0.05)' }} />}
              <div className="relative pl-6 first:pl-0">
                <div className="text-[2.75rem] font-bold font-mono leading-none" style={{ color: '#e2e8f0', letterSpacing: '-0.03em' }}>
                  {n}
                </div>
                <div className="font-mono text-[10px] mt-1.5" style={{ color: '#2d3748' }}>{l}</div>
              </div>
            </div>
          ))}

          <div className="flex items-center gap-2 pl-8">
            <div className="h-1.5 w-1.5 rounded-full animate-forge-pulse" style={{ background: '#34d399' }} />
            <span className="font-mono text-[11px]" style={{ color: '#34d399' }}>live</span>
          </div>
        </div>
      </section>

      {/* ── Agent grid ────────────────────────────────────────────────────── */}
      <section>
        <div className="flex items-baseline justify-between mb-8">
          <h2 className="text-xl font-semibold" style={{ color: '#e2e8f0', letterSpacing: '-0.01em' }}>
            The Six
          </h2>
          <span className="font-mono text-[11px]" style={{ color: '#1e293b' }}>adversarial loop · consensus required</span>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {AGENTS.map((a) => (
            <div
              key={a.idx}
              className="relative rounded-lg flex flex-col"
              style={{
                background: 'rgba(255,255,255,0.025)',
                border: '1px solid rgba(255,255,255,0.07)',
                backdropFilter: 'blur(12px)',
                overflow: 'hidden',
              }}
            >
              {/* Color accent bar — agent's ONLY color usage */}
              <div className="h-[2px] w-full" style={{ background: a.color, opacity: 0.8 }} />

              <div className="p-5 flex flex-col flex-1 gap-4">
                {/* Identity */}
                <div>
                  <div className="flex items-baseline justify-between mb-1">
                    <span className="text-base font-semibold" style={{ color: '#e2e8f0', letterSpacing: '-0.01em' }}>
                      {a.name}
                    </span>
                    <span className="font-mono text-[9px]" style={{ color: a.color, opacity: 0.7 }}>
                      {a.idx}
                    </span>
                  </div>
                  <p className="text-[11px] leading-relaxed" style={{ color: '#334155' }}>
                    {a.tagline}
                  </p>
                </div>

                {/* Widget */}
                <div className="flex-1">{a.widget}</div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <span className="font-mono text-[9px]" style={{ color: '#1e293b' }}>{a.tech}</span>
                  <div className="flex items-center gap-1.5">
                    <div className="h-1 w-1 rounded-full" style={{ background: '#1e293b' }} />
                    <span className="font-mono text-[9px]" style={{ color: '#1e293b' }}>standby</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Loop + Recent ─────────────────────────────────────────────────── */}
      <section className="grid grid-cols-2 gap-12">
        {/* Loop */}
        <div>
          <h2 className="text-xl font-semibold mb-6" style={{ color: '#e2e8f0', letterSpacing: '-0.01em' }}>
            The adversarial loop
          </h2>
          <p className="text-sm leading-relaxed mb-8" style={{ color: '#334155' }}>
            Agents vote. If Security and Performance both reject, the code
            returns to the Architect. No single agent can unblock a bad PR.
          </p>
          <ol className="space-y-0">
            {LOOP_STEPS.map((step, i) => (
              <li
                key={i}
                className="flex gap-4 py-3"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
              >
                <span className="font-mono text-[10px] mt-[3px] shrink-0" style={{ color: '#1e293b' }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="text-[13px] leading-snug" style={{ color: '#475569' }}>{step}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Recent sessions */}
        <div>
          <div className="flex items-baseline justify-between mb-6">
            <h2 className="text-xl font-semibold" style={{ color: '#e2e8f0', letterSpacing: '-0.01em' }}>
              Recent
            </h2>
            <Link
              to="/sessions"
              className="flex items-center gap-1 text-xs transition-colors hover:text-white"
              style={{ color: '#2d3748' }}
            >
              all <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          {sessionsQ.isLoading ? (
            <p className="font-mono text-xs" style={{ color: '#1e293b' }}>loading…</p>
          ) : (
            <RecentSessions sessions={sessionsQ.data ?? []} />
          )}
        </div>
      </section>

      {(statsQ.isError || sessionsQ.isError) && (
        <div className="rounded-lg p-4 font-mono text-sm"
          style={{ background: 'rgba(248,113,113,0.05)', border: '1px solid rgba(248,113,113,0.15)', color: '#f87171' }}>
          Server unreachable — check that the backend is running.
        </div>
      )}
    </div>
  )
}
