import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { User } from 'lucide-react'
import { cn, fetchApi } from '../../../lib/utils'
import { REVIEWER_ICONS } from '../../reviews/constants'

type RunningAgent = {
  uid: string
  name: string | null
  persona: string
  vendor: string | null
  resolved_model: string | null
  started_at: string
  last_heartbeat_at: string | null
}

type AgentsResponse = { agents: RunningAgent[] }

const AGENT_MESSAGES: Record<string, string[]> = {
  security: [
    'Scanning authentication flows for injection vectors…',
    'Checking JWT secret rotation policy…',
    'Auditing OAuth 2.0 state parameter handling…',
    'Reviewing session token expiry logic…',
    'Scanning for hardcoded credentials in config files…',
    'Checking CSRF protection on WebSocket endpoints…',
    'Validating bcrypt cost factor…',
    'Cross-referencing OWASP Top 10 against diff…',
  ],
  architect: [
    'Evaluating module coupling and cohesion…',
    'Checking interface contracts between layers…',
    'Reviewing dependency injection patterns…',
    'Analyzing event-driven design trade-offs…',
    'Checking for circular dependencies…',
    'Reviewing data flow architecture…',
    'Evaluating microservice boundary definitions…',
    'Assessing scalability implications of WebSocket design…',
  ],
  architecture: [
    'Evaluating module coupling and cohesion…',
    'Checking interface contracts between layers…',
    'Reviewing dependency injection patterns…',
    'Analyzing event-driven design trade-offs…',
    'Checking for circular dependencies…',
    'Reviewing data flow architecture…',
  ],
  coder: [
    'Reading implementation of auth middleware…',
    'Tracing execution path through token refresh flow…',
    'Checking error handling in async handlers…',
    'Reviewing TypeScript type safety…',
    'Scanning for unhandled promise rejections…',
    'Analyzing race conditions in concurrent writes…',
    'Checking database transaction boundaries…',
    'Reviewing input sanitization coverage…',
  ],
  devil_advocate: [
    'Stress-testing assumptions in the design…',
    'Considering worst-case failure scenarios…',
    'Probing edge cases in the OAuth flow…',
    'Challenging the WebSocket auth model…',
    'Asking: what if the token service goes down?',
    'Probing: can this be exploited in staging?',
    'Raising: rate limiting absent on refresh endpoint…',
    'Questioning: is eventual consistency acceptable here?',
  ],
  performance: [
    'Profiling database query execution plans…',
    'Checking N+1 query patterns in session lookup…',
    'Reviewing index coverage for auth queries…',
    'Measuring WebSocket message fanout cost…',
    'Analyzing memory allocation in token parsing…',
    'Checking connection pool configuration…',
    'Reviewing caching strategy for session state…',
    'Estimating p99 latency under load…',
  ],
  testing: [
    'Auditing test coverage for auth edge cases…',
    'Checking for missing error path tests…',
    'Reviewing test fixture isolation…',
    'Scanning for brittle snapshot assertions…',
    'Checking integration test coverage…',
    'Reviewing mock boundary placement…',
    'Auditing property-based test coverage…',
    'Checking for missing timeout tests…',
  ],
  reviewer: [
    'Reading through the full diff…',
    'Checking inline documentation quality…',
    'Reviewing naming conventions…',
    'Checking code style consistency…',
    'Reviewing error message clarity…',
    'Auditing API contract documentation…',
  ],
  frontend: [
    'Reviewing component accessibility…',
    'Checking for missing loading states…',
    'Auditing error boundary coverage…',
    'Reviewing responsive layout breakpoints…',
    'Checking ARIA labels on interactive elements…',
    'Reviewing client-side error handling…',
  ],
  principal: [
    'Synthesizing findings across all reviewers…',
    'Evaluating overall code quality signal…',
    'Weighing blocker severity…',
    'Drafting consensus verdict…',
    'Cross-checking reviewer agreements…',
  ],
  quality: [
    'Checking code style guidelines…',
    'Reviewing documentation completeness…',
    'Auditing naming convention adherence…',
    'Checking API response shape consistency…',
  ],
}

const FALLBACK_MESSAGES = ['Reading diff…', 'Analyzing changes…', 'Writing findings…']

const DISPLAY_NAMES: Record<string, string> = {
  security: 'Security',
  architect: 'Architect',
  architecture: 'Architect',
  coder: 'Coder',
  devil_advocate: "Devil's Advocate",
  performance: 'Performance',
  testing: 'Testing',
  reviewer: 'Reviewer',
  principal: 'Principal',
  quality: 'Quality',
  frontend: 'Frontend',
}

const AGENT_COLORS: Record<string, string> = {
  security: 'text-amber-600 dark:text-amber-400',
  architect: 'text-indigo-600 dark:text-indigo-400',
  architecture: 'text-indigo-600 dark:text-indigo-400',
  coder: 'text-cyan-600 dark:text-cyan-400',
  devil_advocate: 'text-red-600 dark:text-red-400',
  performance: 'text-orange-600 dark:text-orange-400',
  testing: 'text-emerald-600 dark:text-emerald-400',
  reviewer: 'text-teal-600 dark:text-teal-400',
  principal: 'text-violet-600 dark:text-violet-400',
  quality: 'text-blue-600 dark:text-blue-400',
  frontend: 'text-pink-600 dark:text-pink-400',
}

const DOT_INTERVAL_MS = 500
const MSG_INTERVAL_MS = 4000

function TypingDots() {
  const [dots, setDots] = useState(1)
  useEffect(() => {
    const id = setInterval(() => setDots((d) => (d % 3) + 1), DOT_INTERVAL_MS)
    return () => clearInterval(id)
  }, [])
  return (
    <span className="inline-block w-4 text-left tabular-nums text-zinc-400 dark:text-zinc-500">
      {'•'.repeat(dots)}
    </span>
  )
}

type AgentRowProps = {
  agent: RunningAgent
  offset: number
}

function AgentRow({ agent, offset }: AgentRowProps) {
  const messages = AGENT_MESSAGES[agent.persona] ?? FALLBACK_MESSAGES
  const [msgIdx, setMsgIdx] = useState(() => offset % messages.length)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const id = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setMsgIdx((i) => (i + 1) % messages.length)
        setVisible(true)
      }, 200)
    }, MSG_INTERVAL_MS + offset * 600)
    return () => clearInterval(id)
  }, [messages.length, offset])

  const Icon = REVIEWER_ICONS[agent.persona] ?? User
  const color = AGENT_COLORS[agent.persona] ?? 'text-zinc-500 dark:text-zinc-400'
  const displayName = DISPLAY_NAMES[agent.persona] ?? agent.name ?? agent.persona

  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-zinc-100 dark:border-zinc-800/60 last:border-0">
      <div className={cn('mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-zinc-100 dark:bg-zinc-800', color)}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={cn('text-xs font-semibold', color)}>{displayName}</span>
          {agent.resolved_model && (
            <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
              {agent.resolved_model.replace('claude-', '').replace('-latest', '')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 mt-0.5">
          <span
            className={cn(
              'text-xs text-zinc-600 dark:text-zinc-300 transition-opacity duration-200',
              visible ? 'opacity-100' : 'opacity-0',
            )}
          >
            {messages[msgIdx]}
          </span>
          <TypingDots />
        </div>
      </div>
      <div className="mt-1 flex h-2 w-2 shrink-0 items-center justify-center">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
      </div>
    </div>
  )
}

type LiveAgentStatusProps = {
  sessionId: string
}

export function LiveAgentStatus({ sessionId }: LiveAgentStatusProps) {
  const { data, isLoading } = useQuery<AgentsResponse>({
    queryKey: ['session-agents', sessionId],
    queryFn: () => fetchApi<AgentsResponse>(`/api/sessions/${sessionId}/agents`),
    enabled: !!sessionId,
    refetchInterval: 15_000,
  })

  if (isLoading || !data || data.agents.length === 0) return null

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50 px-4 py-2.5 dark:border-zinc-800 dark:bg-zinc-800/40">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
          <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
            Agents Working
          </span>
        </div>
        <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          {data.agents.length} running
        </span>
      </div>
      <div className="divide-y divide-zinc-100 px-4 dark:divide-zinc-800/60">
        {data.agents.map((agent, i) => (
          <AgentRow key={agent.uid} agent={agent} offset={i} />
        ))}
      </div>
    </div>
  )
}
