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
} from 'lucide-react'
import { StatCard } from './components/stat-card'
import { RecentSessions } from './components/recent-sessions'
import { fetchApi } from '../../lib/utils'
import type { DashboardStats, SessionSummary } from '../../lib/api-types'

const AGENTS = [
  {
    id: 'architect',
    name: 'Architect',
    nickname: 'The Visionary',
    role: 'Designs system & API contracts',
    icon: Brain,
    color: '#00d4ff',
    glow: 'rgba(0, 212, 255, 0.25)',
    status: 'standby',
  },
  {
    id: 'coder',
    name: 'Coder',
    nickname: 'The Builder',
    role: 'Writes & fixes the code',
    icon: Zap,
    color: '#00ff88',
    glow: 'rgba(0, 255, 136, 0.25)',
    status: 'standby',
  },
  {
    id: 'security',
    name: 'Security',
    nickname: 'The Paranoid',
    role: 'Finds vulnerabilities & risks',
    icon: Shield,
    color: '#ff4060',
    glow: 'rgba(255, 64, 96, 0.25)',
    status: 'standby',
  },
  {
    id: 'performance',
    name: 'Performance',
    nickname: 'The Speed Demon',
    role: 'Analyzes speed & scalability',
    icon: TrendingUp,
    color: '#f59e0b',
    glow: 'rgba(245, 158, 11, 0.25)',
    status: 'standby',
  },
  {
    id: 'reviewer',
    name: 'Reviewer',
    nickname: 'The Perfectionist',
    role: 'Checks quality, tests, style',
    icon: Eye,
    color: '#8b5cf6',
    glow: 'rgba(139, 92, 246, 0.25)',
    status: 'standby',
  },
  {
    id: 'advocate',
    name: "Devil's Advocate",
    nickname: 'The Skeptic',
    role: 'Challenges assumptions',
    icon: Swords,
    color: '#ec4899',
    glow: 'rgba(236, 72, 153, 0.25)',
    status: 'standby',
  },
]

function AgentCard({
  agent,
}: {
  agent: (typeof AGENTS)[number]
}) {
  const Icon = agent.icon

  return (
    <div
      className="group relative overflow-hidden rounded-xl p-4 transition-all duration-300 hover:-translate-y-1 cursor-default"
      style={{
        background: 'linear-gradient(135deg, rgba(15, 23, 41, 0.9) 0%, rgba(10, 16, 30, 0.95) 100%)',
        border: `1px solid rgba(${hexToRgb(agent.color)}, 0.15)`,
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLDivElement
        el.style.borderColor = `rgba(${hexToRgb(agent.color)}, 0.4)`
        el.style.boxShadow = `0 0 28px ${agent.glow}, 0 8px 32px rgba(0,0,0,0.4)`
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLDivElement
        el.style.borderColor = `rgba(${hexToRgb(agent.color)}, 0.15)`
        el.style.boxShadow = 'none'
      }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at top right, rgba(${hexToRgb(agent.color)}, 0.05) 0%, transparent 60%)`,
        }}
      />
      <div className="relative">
        <div className="flex items-start justify-between">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg"
            style={{
              background: `rgba(${hexToRgb(agent.color)}, 0.1)`,
              border: `1px solid rgba(${hexToRgb(agent.color)}, 0.25)`,
            }}
          >
            <Icon className="h-4 w-4" style={{ color: agent.color }} />
          </div>
          <div className="flex items-center gap-1.5">
            <div
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: '#4a5568' }}
            />
            <span
              className="text-[9px] font-bold uppercase tracking-widest"
              style={{ color: '#4a5568' }}
            >
              STANDBY
            </span>
          </div>
        </div>
        <div className="mt-3">
          <div className="text-sm font-bold" style={{ color: '#e2e8f0' }}>{agent.name}</div>
          <div
            className="text-[10px] font-semibold uppercase tracking-widest"
            style={{ color: agent.color }}
          >
            {agent.nickname}
          </div>
          <div className="mt-1.5 text-[11px] leading-relaxed" style={{ color: '#4a5568' }}>
            {agent.role}
          </div>
        </div>
      </div>
    </div>
  )
}

function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return '0, 212, 255'
  return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
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
    <div className="space-y-8 animate-forge-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div
              className="h-px flex-1 max-w-[3rem]"
              style={{ background: 'linear-gradient(90deg, #00d4ff, transparent)' }}
            />
            <span
              className="text-[9px] font-bold uppercase tracking-widest"
              style={{ color: '#00d4ff' }}
            >
              AgentForge // Command Center
            </span>
          </div>
          <h1
            className="text-2xl font-black tracking-tight"
            style={{ color: '#e2e8f0' }}
          >
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
          <p className="mt-1 text-xs" style={{ color: '#4a5568' }}>
            Six specialized AI agents ready to review, debate, and assure your code quality.
          </p>
        </div>
        <div
          className="flex items-center gap-2 rounded-xl px-4 py-2"
          style={{
            background: 'rgba(0, 255, 136, 0.06)',
            border: '1px solid rgba(0, 255, 136, 0.15)',
          }}
        >
          <div
            className="h-2 w-2 rounded-full"
            style={{ background: '#00ff88', boxShadow: '0 0 8px rgba(0, 255, 136, 0.6)', animation: 'forge-pulse 2s infinite' }}
          />
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#00ff88' }}>
            System Online
          </span>
        </div>
      </div>

      {(statsQuery.isError || sessionsQuery.isError) && (
        <div
          className="rounded-xl p-4 text-sm"
          style={{
            background: 'rgba(255, 64, 96, 0.06)',
            border: '1px solid rgba(255, 64, 96, 0.2)',
            color: '#ff4060',
          }}
        >
          Failed to load dashboard data. Check that the server is running.
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard
          title="Total Sessions"
          value={stats?.totalSessions ?? 0}
          icon={GitBranch}
          accentColor="#00d4ff"
          glowColor="rgba(0, 212, 255, 0.15)"
        />
        <StatCard
          title="Active"
          value={stats?.activeSessions ?? 0}
          icon={Activity}
          accentColor="#00ff88"
          glowColor="rgba(0, 255, 136, 0.15)"
        />
        <StatCard
          title="Completed"
          value={stats?.completedReviews ?? 0}
          icon={CheckCircle2}
          accentColor="#8b5cf6"
          glowColor="rgba(139, 92, 246, 0.15)"
        />
        <StatCard
          title="Maps Run"
          value={stats?.completedMaps ?? 0}
          icon={Map}
          accentColor="#f59e0b"
          glowColor="rgba(245, 158, 11, 0.15)"
        />
        <StatCard
          title="Files Tracked"
          value={stats?.filesTracked ?? 0}
          icon={File}
          accentColor="#00d4ff"
          glowColor="rgba(0, 212, 255, 0.15)"
        />
        <StatCard
          title="Blockers"
          value={stats?.unresolvedBlockers ?? 0}
          icon={AlertTriangle}
          accentColor="#ff4060"
          glowColor="rgba(255, 64, 96, 0.15)"
        />
      </div>

      <div>
        <div className="flex items-center gap-3 mb-5">
          <span
            className="text-[10px] font-bold uppercase tracking-widest"
            style={{ color: '#4a5568' }}
          >
            Agent Roster
          </span>
          <div
            className="flex-1 h-px"
            style={{ background: 'linear-gradient(90deg, rgba(0, 212, 255, 0.15), transparent)' }}
          />
          <span
            className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded"
            style={{ background: 'rgba(0, 212, 255, 0.08)', color: '#00d4ff' }}
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

      <div>
        <div className="flex items-center gap-3 mb-4">
          <span
            className="text-[10px] font-bold uppercase tracking-widest"
            style={{ color: '#4a5568' }}
          >
            Recent Sessions
          </span>
          <div
            className="flex-1 h-px"
            style={{ background: 'linear-gradient(90deg, rgba(0, 212, 255, 0.15), transparent)' }}
          />
          <Clock className="h-3 w-3" style={{ color: '#4a5568' }} />
        </div>
        <div
          className="rounded-xl overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(15, 23, 41, 0.9) 0%, rgba(10, 16, 30, 0.95) 100%)',
            border: '1px solid rgba(0, 212, 255, 0.1)',
          }}
        >
          {sessionsQuery.isLoading ? (
            <div className="flex items-center gap-3 p-6">
              <div
                className="h-1.5 w-1.5 rounded-full animate-forge-pulse"
                style={{ background: '#00d4ff' }}
              />
              <span className="text-xs" style={{ color: '#4a5568' }}>Loading sessions...</span>
            </div>
          ) : (
            <RecentSessions sessions={sessionsQuery.data ?? []} />
          )}
        </div>
      </div>
    </div>
  )
}
