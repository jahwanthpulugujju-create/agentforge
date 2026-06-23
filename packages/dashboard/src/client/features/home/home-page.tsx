import { useQuery } from '@tanstack/react-query'
import {
  GitBranch,
  Activity,
  FileSearch,
  Map,
  File,
  AlertTriangle,
  Shield,
  Zap,
  Eye,
  Brain,
  TrendingUp,
  Swords,
  Clock,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react'
import { StatCard } from './components/stat-card'
import { RecentSessions } from './components/recent-sessions'
import { TiltCard } from '../../components/three/TiltCard'
import { fetchApi } from '../../lib/utils'
import type { DashboardStats, SessionSummary } from '../../lib/api-types'

const AGENTS = [
  {
    id: 'architect',
    name: 'Architect',
    nickname: 'The Visionary',
    role: 'Designs system architecture & API contracts',
    icon: Brain,
    color: '#00d4ff',
    glow: 'rgba(0,212,255,0.3)',
    tech: 'Gemini 1.5 Pro',
  },
  {
    id: 'coder',
    name: 'Coder',
    nickname: 'The Builder',
    role: 'Writes & fixes the implementation',
    icon: Zap,
    color: '#00ff88',
    glow: 'rgba(0,255,136,0.3)',
    tech: 'Claude 3.5',
  },
  {
    id: 'security',
    name: 'Security',
    nickname: 'The Paranoid',
    role: 'Finds vulnerabilities & OWASP risks',
    icon: Shield,
    color: '#ff4060',
    glow: 'rgba(255,64,96,0.3)',
    tech: 'CodeLlama 13B',
  },
  {
    id: 'performance',
    name: 'Performance',
    nickname: 'The Speed Demon',
    role: 'Benchmarks speed & scalability',
    icon: TrendingUp,
    color: '#f59e0b',
    glow: 'rgba(245,158,11,0.3)',
    tech: 'Claude 3.5',
  },
  {
    id: 'reviewer',
    name: 'Reviewer',
    nickname: 'The Perfectionist',
    role: 'Checks quality, tests & style',
    icon: Eye,
    color: '#8b5cf6',
    glow: 'rgba(139,92,246,0.3)',
    tech: 'Gemini 1.5 Pro',
  },
  {
    id: 'advocate',
    name: "Devil's Advocate",
    nickname: 'The Skeptic',
    role: 'Challenges every assumption',
    icon: Swords,
    color: '#ec4899',
    glow: 'rgba(236,72,153,0.3)',
    tech: 'Claude 3.5',
  },
]

function AgentCard({ agent }: { agent: (typeof AGENTS)[number] }) {
  const Icon = agent.icon
  const rgb = hexToRgb(agent.color)

  return (
    <TiltCard
      glowColor={agent.glow}
      className="relative overflow-hidden rounded-2xl p-5 cursor-default"
      style={{
        background: `linear-gradient(135deg, rgba(15,23,41,0.95) 0%, rgba(10,16,30,0.98) 100%)`,
        border: `1px solid rgba(${rgb},0.18)`,
      }}
    >
      {/* Corner glow */}
      <div
        className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full blur-2xl"
        style={{ background: `rgba(${rgb},0.12)` }}
      />

      {/* Status row */}
      <div className="flex items-center justify-between mb-4">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl"
          style={{
            background: `rgba(${rgb},0.1)`,
            border: `1px solid rgba(${rgb},0.25)`,
            boxShadow: `0 0 16px rgba(${rgb},0.15)`,
          }}
        >
          <Icon className="h-5 w-5" style={{ color: agent.color }} />
        </div>
        <div className="flex items-center gap-1.5">
          <div
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: '#2d3748' }}
          />
          <span
            className="text-[9px] font-bold uppercase tracking-widest"
            style={{ color: '#374151' }}
          >
            Standby
          </span>
        </div>
      </div>

      {/* Name + nickname */}
      <div
        className="text-sm font-bold"
        style={{ color: '#e2e8f0' }}
      >
        {agent.name}
      </div>
      <div
        className="text-[10px] font-bold uppercase tracking-widest mt-0.5"
        style={{ color: agent.color }}
      >
        {agent.nickname}
      </div>

      {/* Role */}
      <p
        className="mt-2 text-[11px] leading-relaxed"
        style={{ color: '#374151' }}
      >
        {agent.role}
      </p>

      {/* Tech pill */}
      <div className="mt-3 flex items-center justify-between">
        <span
          className="inline-block rounded-lg px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest"
          style={{ background: `rgba(${rgb},0.08)`, color: `rgba(${rgb.split(',').map(n => parseInt(n))},0.9)` || agent.color }}
        >
          {agent.tech}
        </span>
        <ArrowRight
          className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ color: agent.color }}
        />
      </div>

      {/* Bottom border glow */}
      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, rgba(${rgb},0.4), transparent)` }}
      />
    </TiltCard>
  )
}

function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return '0,212,255'
  return `${parseInt(result[1], 16)},${parseInt(result[2], 16)},${parseInt(result[3], 16)}`
}

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
    <div className="space-y-10 animate-forge-fade-in">
      {/* Hero header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div
              className="h-px w-12"
              style={{ background: 'linear-gradient(90deg, #00d4ff, transparent)' }}
            />
            <span
              className="text-[9px] font-bold uppercase tracking-widest"
              style={{ color: '#00d4ff' }}
            >
              AgentForge // Command Center
            </span>
          </div>
          <h1 className="text-3xl font-black tracking-tight leading-tight" style={{ color: '#e2e8f0' }}>
            Agent{' '}
            <span
              style={{
                background: 'linear-gradient(135deg, #00d4ff 0%, #8b5cf6 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              War Room
            </span>
          </h1>
          <p className="mt-1.5 text-sm" style={{ color: '#374151' }}>
            Six AI agents review, debate, and assure your code before you push.
          </p>
        </div>
        <div
          className="flex items-center gap-2.5 rounded-xl px-4 py-2.5"
          style={{
            background: 'rgba(0,255,136,0.06)',
            border: '1px solid rgba(0,255,136,0.18)',
            boxShadow: '0 0 24px rgba(0,255,136,0.05)',
          }}
        >
          <div
            className="h-2 w-2 rounded-full"
            style={{
              background: '#00ff88',
              boxShadow: '0 0 10px rgba(0,255,136,0.8)',
              animation: 'forge-pulse 2s ease-in-out infinite',
            }}
          />
          <span
            className="text-[10px] font-bold uppercase tracking-widest"
            style={{ color: '#00ff88' }}
          >
            System Online
          </span>
        </div>
      </div>

      {(statsQuery.isError || sessionsQuery.isError) && (
        <div
          className="rounded-xl p-4 text-sm"
          style={{
            background: 'rgba(255,64,96,0.06)',
            border: '1px solid rgba(255,64,96,0.2)',
            color: '#ff4060',
          }}
        >
          Failed to load dashboard data. Check that the server is running.
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard title="Total Sessions"   value={stats?.totalSessions      ?? 0} icon={GitBranch}    accentColor="#00d4ff" glowColor="rgba(0,212,255,0.18)" />
        <StatCard title="Active"           value={stats?.activeSessions      ?? 0} icon={Activity}     accentColor="#00ff88" glowColor="rgba(0,255,136,0.18)" />
        <StatCard title="Completed"        value={stats?.completedReviews    ?? 0} icon={CheckCircle2} accentColor="#8b5cf6" glowColor="rgba(139,92,246,0.18)" />
        <StatCard title="Maps Run"         value={stats?.completedMaps       ?? 0} icon={Map}          accentColor="#f59e0b" glowColor="rgba(245,158,11,0.18)" />
        <StatCard title="Files Tracked"   value={stats?.filesTracked        ?? 0} icon={File}         accentColor="#00d4ff" glowColor="rgba(0,212,255,0.18)" />
        <StatCard title="Blockers"        value={stats?.unresolvedBlockers  ?? 0} icon={AlertTriangle} accentColor="#ff4060" glowColor="rgba(255,64,96,0.18)" />
      </div>

      {/* Agent Roster */}
      <div>
        <div className="flex items-center gap-3 mb-6">
          <span
            className="text-[10px] font-bold uppercase tracking-widest"
            style={{ color: '#374151' }}
          >
            Agent Roster
          </span>
          <div
            className="flex-1 h-px"
            style={{ background: 'linear-gradient(90deg, rgba(0,212,255,0.18), transparent)' }}
          />
          <span
            className="rounded-lg px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest"
            style={{ background: 'rgba(0,212,255,0.08)', color: '#00d4ff', border: '1px solid rgba(0,212,255,0.15)' }}
          >
            6 Agents
          </span>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {AGENTS.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      </div>

      {/* Adversarial Loop Diagram */}
      <div
        className="rounded-2xl p-6 overflow-hidden relative"
        style={{
          background: 'linear-gradient(135deg, rgba(15,23,41,0.9) 0%, rgba(10,16,30,0.95) 100%)',
          border: '1px solid rgba(0,212,255,0.1)',
        }}
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse 60% 60% at 50% 0%, rgba(0,212,255,0.04) 0%, transparent 70%)',
          }}
        />
        <div className="relative">
          <div className="flex items-center gap-3 mb-5">
            <span
              className="text-[10px] font-bold uppercase tracking-widest"
              style={{ color: '#374151' }}
            >
              Adversarial Review Loop
            </span>
            <div
              className="flex-1 h-px"
              style={{ background: 'linear-gradient(90deg, rgba(0,212,255,0.15), transparent)' }}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {[
              { label: 'Coder writes', color: '#00ff88' },
              { label: '→' },
              { label: 'Security attacks', color: '#ff4060' },
              { label: '→' },
              { label: 'Coder fixes', color: '#00ff88' },
              { label: '→' },
              { label: 'Performance benchmarks', color: '#f59e0b' },
              { label: '→' },
              { label: 'Reviewer critiques', color: '#8b5cf6' },
              { label: '→' },
              { label: "Devil's Advocate challenges", color: '#ec4899' },
              { label: '→' },
              { label: 'Consensus vote', color: '#00d4ff' },
            ].map((step, i) =>
              step.label === '→' ? (
                <span key={i} className="text-sm" style={{ color: '#2d3748' }}>→</span>
              ) : (
                <span
                  key={i}
                  className="rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest"
                  style={{
                    background: `rgba(${hexToRgb(step.color!)},0.08)`,
                    border: `1px solid rgba(${hexToRgb(step.color!)},0.2)`,
                    color: step.color,
                  }}
                >
                  {step.label}
                </span>
              )
            )}
          </div>
          <p className="mt-4 text-xs" style={{ color: '#374151' }}>
            If Security + Performance both reject → code goes back to Architect. Consensus required to ship.
          </p>
        </div>
      </div>

      {/* Recent Sessions */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <span
            className="text-[10px] font-bold uppercase tracking-widest"
            style={{ color: '#374151' }}
          >
            Recent Sessions
          </span>
          <div
            className="flex-1 h-px"
            style={{ background: 'linear-gradient(90deg, rgba(0,212,255,0.15), transparent)' }}
          />
          <Clock className="h-3.5 w-3.5" style={{ color: '#374151' }} />
        </div>
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(15,23,41,0.9) 0%, rgba(10,16,30,0.95) 100%)',
            border: '1px solid rgba(0,212,255,0.1)',
          }}
        >
          {sessionsQuery.isLoading ? (
            <div className="flex items-center gap-3 p-6">
              <div
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: '#00d4ff', animation: 'forge-pulse 1.5s infinite', boxShadow: '0 0 6px #00d4ff' }}
              />
              <span className="text-xs" style={{ color: '#374151' }}>Loading sessions…</span>
            </div>
          ) : (
            <RecentSessions sessions={sessionsQuery.data ?? []} />
          )}
        </div>
      </div>
    </div>
  )
}
