import { useQuery } from '@tanstack/react-query'
import { GitBranch, Activity, FileSearch, Map, File, AlertTriangle, CheckCircle2, ArrowUpRight, Clock } from 'lucide-react'
import { Link } from 'react-router-dom'
import { RecentSessions } from './components/recent-sessions'
import { fetchApi } from '../../lib/utils'
import type { DashboardStats, SessionSummary } from '../../lib/api-types'

function MiniCodeBlock({ lines }: { lines: string[] }) {
  const colors: Record<string, string> = {
    k: '#569cd6', s: '#ce9178', c: '#6a9955', f: '#dcdcaa', p: '#9cdcfe', o: '#d4d4d4',
  }
  return (
    <div
      className="rounded-lg p-3 font-mono text-[10px] leading-5 overflow-hidden"
      style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      {lines.map((l, i) => (
        <div key={i} className="flex gap-3">
          <span style={{ color: '#3e3e3e', userSelect: 'none', minWidth: 12 }}>{i + 1}</span>
          <span dangerouslySetInnerHTML={{ __html: l }} style={{ color: '#d4d4d4' }} />
        </div>
      ))}
    </div>
  )
}

function RiskGauge({ score, label }: { score: number; label: string }) {
  const color = score > 7 ? '#ff4060' : score > 4 ? '#f59e0b' : '#00ff88'
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-2xl font-bold" style={{ color }}>{score.toFixed(1)}</span>
        <span className="text-[10px]" style={{ color: '#4a5568' }}>{label}</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${(score / 10) * 100}%`, background: color, boxShadow: `0 0 8px ${color}` }}
        />
      </div>
      <div className="grid grid-cols-3 gap-1">
        {['SQL inj.', 'XSS', 'CSRF', 'Auth', 'Deps', 'Secrets'].map((v) => (
          <div
            key={v}
            className="rounded px-1.5 py-0.5 text-center text-[9px] font-medium"
            style={{ background: 'rgba(255,64,96,0.08)', color: '#ff4060', border: '1px solid rgba(255,64,96,0.15)' }}
          >
            {v}
          </div>
        ))}
      </div>
    </div>
  )
}

function PerfChart() {
  const bars = [42, 67, 38, 88, 55, 71, 29, 95]
  return (
    <div className="space-y-2">
      <div className="flex items-end gap-1 h-12">
        {bars.map((h, i) => (
          <div key={i} className="flex-1 rounded-sm" style={{
            height: `${h}%`,
            background: h > 80
              ? 'linear-gradient(to top, #00ff88, rgba(0,255,136,0.4))'
              : h > 50
                ? 'linear-gradient(to top, #f59e0b, rgba(245,158,11,0.4))'
                : 'linear-gradient(to top, #ff4060, rgba(255,64,96,0.4))',
          }} />
        ))}
      </div>
      <div className="flex justify-between text-[9px]" style={{ color: '#4a5568' }}>
        <span>p50: 38ms</span><span>p95: 284ms</span><span>p99: 612ms</span>
      </div>
    </div>
  )
}

function CheckList() {
  const items = [
    { done: true,  text: 'Type safety — strict mode' },
    { done: true,  text: 'Error boundaries present' },
    { done: false, text: 'Unit test coverage > 80%' },
    { done: false, text: 'JSDoc on public APIs' },
    { done: true,  text: 'No console.log in prod' },
  ]
  return (
    <div className="space-y-1.5">
      {items.map(({ done, text }) => (
        <div key={text} className="flex items-center gap-2">
          <div
            className="h-3.5 w-3.5 shrink-0 rounded-sm flex items-center justify-center"
            style={{
              background: done ? 'rgba(0,212,255,0.15)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${done ? 'rgba(0,212,255,0.4)' : 'rgba(255,255,255,0.08)'}`,
            }}
          >
            {done && <CheckCircle2 className="h-2.5 w-2.5" style={{ color: '#00d4ff' }} />}
          </div>
          <span
            className="text-[10px]"
            style={{ color: done ? '#94a3b8' : '#4a5568', textDecoration: done ? 'none' : 'line-through' }}
          >
            {text}
          </span>
        </div>
      ))}
    </div>
  )
}

function ArchDiagram() {
  return (
    <div className="relative h-20 font-mono text-[9px]" style={{ color: '#4a5568' }}>
      {[
        { label: 'Client', x: 0,   y: 0  },
        { label: 'API',    x: 40,  y: 30 },
        { label: 'DB',     x: 75,  y: 5  },
        { label: 'Cache',  x: 75,  y: 55 },
        { label: 'Queue',  x: 40,  y: 60 },
      ].map(({ label, x, y }) => (
        <div
          key={label}
          className="absolute rounded px-1.5 py-0.5 text-center"
          style={{
            left: `${x}%`, top: `${y}%`,
            background: 'rgba(0,212,255,0.06)',
            border: '1px solid rgba(0,212,255,0.2)',
            color: '#00d4ff',
            transform: 'translateX(-50%)',
          }}
        >
          {label}
        </div>
      ))}
      <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
        <line x1="8%" y1="12%" x2="40%" y2="42%" stroke="rgba(0,212,255,0.15)" strokeWidth="1" strokeDasharray="3,3" />
        <line x1="40%" y1="42%" x2="75%" y2="15%" stroke="rgba(0,212,255,0.15)" strokeWidth="1" strokeDasharray="3,3" />
        <line x1="40%" y1="42%" x2="75%" y2="65%" stroke="rgba(0,212,255,0.15)" strokeWidth="1" strokeDasharray="3,3" />
        <line x1="40%" y1="72%" x2="40%" y2="50%" stroke="rgba(0,212,255,0.15)" strokeWidth="1" strokeDasharray="3,3" />
      </svg>
    </div>
  )
}

function DevilQuote() {
  const challenges = [
    'Why REST? gRPC cuts latency 40%.',
    'JWT expiry is 7 days. That\'s a week of risk.',
    'You\'re caching the wrong layer.',
  ]
  const q = challenges[Math.floor(Date.now() / 10000) % challenges.length]
  return (
    <div
      className="rounded-lg p-3"
      style={{ background: 'rgba(236,72,153,0.05)', border: '1px solid rgba(236,72,153,0.12)' }}
    >
      <div className="text-xl leading-none mb-1" style={{ color: 'rgba(236,72,153,0.4)' }}>"</div>
      <p className="text-[11px] italic leading-relaxed" style={{ color: '#6b7280' }}>{q}</p>
    </div>
  )
}

const AGENTS = [
  {
    idx: '01',
    name: 'Architect',
    handle: 'The Visionary',
    color: '#00d4ff',
    bg: 'rgba(0,212,255,0.04)',
    border: 'rgba(0,212,255,0.12)',
    tech: 'Gemini 1.5 Pro',
    tagline: 'Designs system & API contracts before a line is written.',
    widget: <ArchDiagram />,
  },
  {
    idx: '02',
    name: 'Coder',
    handle: 'The Builder',
    color: '#00ff88',
    bg: 'rgba(0,255,136,0.04)',
    border: 'rgba(0,255,136,0.12)',
    tech: 'Claude 3.5',
    tagline: 'Implements and iterates until Security and Performance sign off.',
    widget: (
      <MiniCodeBlock lines={[
        `<span style="color:#569cd6">const</span> handler = <span style="color:#dcdcaa">async</span>(req) => {`,
        `  <span style="color:#569cd6">const</span> data = <span style="color:#569cd6">await</span> db.<span style="color:#dcdcaa">query</span>(sql)`,
        `  <span style="color:#ce9178">// ← Security flagged: no sanitize</span>`,
        `  <span style="color:#569cd6">return</span> res.<span style="color:#dcdcaa">json</span>(data)`,
        `}`,
      ]} />
    ),
  },
  {
    idx: '03',
    name: 'Security',
    handle: 'The Paranoid',
    color: '#ff4060',
    bg: 'rgba(255,64,96,0.04)',
    border: 'rgba(255,64,96,0.12)',
    tech: 'CodeLlama 13B',
    tagline: 'Attacks every route, input, and dependency with OWASP Top 10.',
    widget: <RiskGauge score={8.3} label="CVSS Score" />,
  },
  {
    idx: '04',
    name: 'Performance',
    handle: 'The Speed Demon',
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.04)',
    border: 'rgba(245,158,11,0.12)',
    tech: 'Claude 3.5',
    tagline: 'Benchmarks every hot path. bcrypt at 12 rounds = 300ms. Drop to 10.',
    widget: <PerfChart />,
  },
  {
    idx: '05',
    name: 'Reviewer',
    handle: 'The Perfectionist',
    color: '#8b5cf6',
    bg: 'rgba(139,92,246,0.04)',
    border: 'rgba(139,92,246,0.12)',
    tech: 'Gemini 1.5 Pro',
    tagline: 'Code style, test coverage, docs. Nothing ships without a tick list.',
    widget: <CheckList />,
  },
  {
    idx: '06',
    name: "Devil's Advocate",
    handle: 'The Skeptic',
    color: '#ec4899',
    bg: 'rgba(236,72,153,0.04)',
    border: 'rgba(236,72,153,0.12)',
    tech: 'Claude 3.5',
    tagline: 'Challenges the approach itself. The one who asks "should we build this at all?"',
    widget: <DevilQuote />,
  },
]

export function HomePage() {
  const statsQuery = useQuery<DashboardStats>({
    queryKey: ['stats'],
    queryFn: () => fetchApi<DashboardStats>('/api/stats'),
  })
  const sessionsQuery = useQuery<SessionSummary[]>({
    queryKey: ['sessions', 'recent'],
    queryFn: () => fetchApi<SessionSummary[]>('/api/sessions?limit=10'),
  })
  const stats = statsQuery.data

  return (
    <div className="max-w-5xl space-y-16">

      {/* ── Hero ─────────────────────────────────────────────── */}
      <div className="pt-2">
        <p className="text-xs font-mono mb-3" style={{ color: '#374151' }}>
          agentforge / dashboard
        </p>
        <h1
          className="text-5xl font-black leading-[1.05] tracking-tight mb-5"
          style={{ color: '#f1f5f9' }}
        >
          Code review,<br />
          <span style={{ color: '#00d4ff' }}>done by committee.</span>
        </h1>
        <p className="text-base leading-relaxed max-w-lg" style={{ color: '#4a5568' }}>
          Six agents argue about your code before it ships. One writes it.
          One breaks it. One questions whether it should exist at all.
        </p>

        <div className="flex items-center gap-6 mt-8">
          {[
            { n: stats?.totalSessions ?? '—',    l: 'sessions' },
            { n: stats?.completedReviews ?? '—', l: 'reviews done' },
            { n: stats?.unresolvedBlockers ?? '—', l: 'open blockers' },
            { n: stats?.filesTracked ?? '—',     l: 'files tracked' },
          ].map(({ n, l }) => (
            <div key={l}>
              <div
                className="text-3xl font-black font-mono leading-none"
                style={{ color: '#e2e8f0' }}
              >
                {n}
              </div>
              <div className="text-[11px] mt-0.5 font-mono" style={{ color: '#374151' }}>{l}</div>
            </div>
          ))}
          <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.04)' }} />
          <div className="flex items-center gap-2">
            <div
              className="h-2 w-2 rounded-full"
              style={{ background: '#00ff88', boxShadow: '0 0 8px #00ff88', animation: 'forge-pulse 2s infinite' }}
            />
            <span className="font-mono text-[11px]" style={{ color: '#00ff88' }}>online</span>
          </div>
        </div>
      </div>

      {/* ── Agent Roster ─────────────────────────────────────── */}
      <div>
        <div className="flex items-baseline justify-between mb-8">
          <h2 className="text-xl font-bold" style={{ color: '#e2e8f0' }}>The Squad</h2>
          <span className="font-mono text-xs" style={{ color: '#374151' }}>6 agents · adversarial loop</span>
        </div>

        <div className="grid grid-cols-1 gap-px" style={{ background: 'rgba(255,255,255,0.04)' }}>
          {/* Row headers */}
          <div
            className="grid gap-4 px-5 py-2 font-mono text-[10px] uppercase tracking-widest"
            style={{ gridTemplateColumns: '2rem 1fr 1fr 180px', color: '#2d3748', background: '#030712' }}
          >
            <span>#</span><span>Agent</span><span>Capability preview</span><span>Model</span>
          </div>

          {AGENTS.map((a, i) => (
            <div
              key={a.idx}
              className="grid gap-4 px-5 py-5 transition-all duration-200 group"
              style={{
                gridTemplateColumns: '2rem 1fr 1fr 180px',
                background: '#030712',
                borderLeft: '2px solid transparent',
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLDivElement
                el.style.background = a.bg
                el.style.borderLeftColor = a.color
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLDivElement
                el.style.background = '#030712'
                el.style.borderLeftColor = 'transparent'
              }}
            >
              {/* Index */}
              <div
                className="font-mono text-sm font-bold pt-1"
                style={{ color: a.color, opacity: 0.5 }}
              >
                {a.idx}
              </div>

              {/* Identity */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold" style={{ color: '#e2e8f0' }}>{a.name}</span>
                  <span
                    className="rounded-sm px-1.5 py-0.5 font-mono text-[9px]"
                    style={{ background: `rgba(${hexToRgb(a.color)},0.1)`, color: a.color }}
                  >
                    {a.handle}
                  </span>
                </div>
                <p className="text-xs leading-relaxed max-w-xs" style={{ color: '#4a5568' }}>
                  {a.tagline}
                </p>
              </div>

              {/* Widget */}
              <div>{a.widget}</div>

              {/* Tech */}
              <div className="flex flex-col justify-center gap-2">
                <div>
                  <div className="font-mono text-[10px]" style={{ color: '#2d3748' }}>model</div>
                  <div className="font-mono text-xs font-medium mt-0.5" style={{ color: '#6b7280' }}>{a.tech}</div>
                </div>
                <div
                  className="flex items-center gap-1.5"
                >
                  <div className="h-1.5 w-1.5 rounded-full" style={{ background: '#2d3748' }} />
                  <span className="font-mono text-[10px]" style={{ color: '#2d3748' }}>standby</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── How the loop works ───────────────────────────────── */}
      <div className="grid grid-cols-2 gap-10">
        <div>
          <h2 className="text-xl font-bold mb-4" style={{ color: '#e2e8f0' }}>
            The adversarial loop
          </h2>
          <p className="text-sm leading-relaxed mb-6" style={{ color: '#4a5568' }}>
            Agents don't just review — they vote. If Security and Performance
            both reject, the code goes back to Architect. Consensus is required
            to ship. No single agent can unblock a bad PR.
          </p>
          <div className="space-y-1 font-mono text-xs" style={{ color: '#374151' }}>
            {[
              ['01', 'Coder writes initial implementation'],
              ['02', 'Security attacks it'],
              ['03', 'Performance benchmarks it'],
              ['04', 'Reviewer checks quality'],
              ['05', "Devil's Advocate challenges approach"],
              ['06', 'Vote — if rejected, back to 01'],
              ['07', 'Consensus → PR generated'],
            ].map(([n, step]) => (
              <div key={n} className="flex gap-3 py-1.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                <span style={{ color: '#2d3748', minWidth: 20 }}>{n}</span>
                <span>{step}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent sessions */}
        <div>
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-xl font-bold" style={{ color: '#e2e8f0' }}>Recent</h2>
            <Link
              to="/sessions"
              className="flex items-center gap-1 text-xs transition-colors hover:text-white"
              style={{ color: '#4a5568' }}
            >
              all sessions <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          {sessionsQuery.isLoading ? (
            <p className="font-mono text-xs" style={{ color: '#2d3748' }}>loading…</p>
          ) : (
            <RecentSessions sessions={sessionsQuery.data ?? []} />
          )}
        </div>
      </div>

      {(statsQuery.isError || sessionsQuery.isError) && (
        <div
          className="rounded-lg p-4 text-sm font-mono"
          style={{ background: 'rgba(255,64,96,0.06)', border: '1px solid rgba(255,64,96,0.2)', color: '#ff4060' }}
        >
          Server unreachable. Check that the backend is running.
        </div>
      )}
    </div>
  )
}

function hexToRgb(hex: string): string {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return r ? `${parseInt(r[1],16)},${parseInt(r[2],16)},${parseInt(r[3],16)}` : '0,212,255'
}
