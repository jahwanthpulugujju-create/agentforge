import { Link } from 'react-router-dom'
import { GitBranch, Map, FileSearch, ArrowRight } from 'lucide-react'
import { StatusBadge } from '../../../components/ui/status-badge'
import { timeAgo } from '../../../lib/date-utils'
import type { SessionSummary } from '../../../lib/api-types'

type RecentSessionsProps = {
  sessions: SessionSummary[]
}

export function RecentSessions({ sessions }: RecentSessionsProps) {
  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
        <div
          className="flex h-12 w-12 items-center justify-center rounded-xl mb-4"
          style={{
            background: 'rgba(0, 212, 255, 0.06)',
            border: '1px solid rgba(0, 212, 255, 0.15)',
          }}
        >
          <GitBranch className="h-5 w-5" style={{ color: '#00d4ff' }} />
        </div>
        <p className="text-sm font-medium" style={{ color: '#4a5568' }}>No sessions yet</p>
        <p className="text-xs mt-1" style={{ color: 'rgba(74, 85, 104, 0.6)' }}>
          Run a code review or map to get started.
        </p>
      </div>
    )
  }

  return (
    <div className="divide-y" style={{ borderColor: 'rgba(0, 212, 255, 0.06)' }}>
      {sessions.map((session) => {
        const WorkflowIcon = session.workflow_type === 'map' ? Map : FileSearch
        return (
          <Link
            key={session.id}
            to={`/sessions/${session.id}`}
            className="group flex items-center gap-4 px-5 py-3.5 transition-all hover:bg-white/[0.02]"
          >
            <div
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
              style={{
                background: 'rgba(0, 212, 255, 0.06)',
                border: '1px solid rgba(0, 212, 255, 0.12)',
              }}
            >
              <WorkflowIcon className="h-3.5 w-3.5" style={{ color: 'rgba(0, 212, 255, 0.6)' }} />
            </div>
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <GitBranch className="h-3.5 w-3.5 shrink-0" style={{ color: 'rgba(0, 212, 255, 0.4)' }} />
              <span className="min-w-0 flex-1 truncate text-xs font-medium" style={{ color: '#e2e8f0' }}>
                {session.branch}
              </span>
            </div>
            <StatusBadge variant={session.status} />
            <span className="shrink-0 text-[10px]" style={{ color: '#4a5568' }}>
              {timeAgo(session.updated_at)}
            </span>
            <ArrowRight
              className="h-3.5 w-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
              style={{ color: '#00d4ff' }}
            />
          </Link>
        )
      })}
    </div>
  )
}
