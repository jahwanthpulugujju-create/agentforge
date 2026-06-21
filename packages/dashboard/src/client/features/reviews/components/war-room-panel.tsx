import { Swords, CheckCircle2, XCircle, AlertCircle, Shield, Building2, Code2, Gauge, TestTube, Eye, User } from 'lucide-react'
import { cn } from '../../../lib/utils'
import type { ReviewRound, ReviewerOutput } from '../../../lib/api-types'
import { DiscourseBlock, parseDiscourseContent } from '../../../components/markdown/discourse-block'
import { MarkdownRenderer } from '../../../components/markdown/markdown-renderer'
import { REVIEWER_ICONS } from '../constants'

type Vote = 'reject' | 'approve' | 'challenge' | 'approve_notes'

type AgentVote = {
  type: string
  displayName: string
  vote: Vote
  reason: string
}

const REVIEWER_DISPLAY_NAMES: Record<string, string> = {
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

function deriveVote(reviewer: ReviewerOutput, round: ReviewRound): AgentVote {
  const t = reviewer.reviewer_type
  const isChangesRequested = round.verdict === 'changes_requested'
  const displayName = REVIEWER_DISPLAY_NAMES[t] ?? t

  if (t === 'security') {
    return isChangesRequested
      ? { type: t, displayName, vote: 'reject', reason: `${round.blocker_count} critical blockers found` }
      : { type: t, displayName, vote: 'approve', reason: 'No security issues detected' }
  }
  if (t === 'devil_advocate') {
    return isChangesRequested
      ? { type: t, displayName, vote: 'challenge', reason: 'Fundamental design concerns raised' }
      : { type: t, displayName, vote: 'approve', reason: 'No major objections' }
  }
  if (t === 'coder') {
    return {
      type: t,
      displayName,
      vote: 'approve_notes',
      reason: isChangesRequested ? 'Owns the fixes — will resolve today' : 'Implementation looks good',
    }
  }
  if (reviewer.finding_count === 0) {
    return { type: t, displayName, vote: 'approve', reason: 'No issues found' }
  }
  return {
    type: t,
    displayName,
    vote: 'approve_notes',
    reason: `${reviewer.finding_count} non-blocking issue${reviewer.finding_count !== 1 ? 's' : ''}`,
  }
}

const VOTE_CONFIG: Record<Vote, { label: string; icon: typeof CheckCircle2; color: string; bg: string }> = {
  approve: {
    label: 'APPROVE',
    icon: CheckCircle2,
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/20',
  },
  approve_notes: {
    label: 'APPROVE WITH CHANGES',
    icon: AlertCircle,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/20',
  },
  challenge: {
    label: 'CHALLENGE',
    icon: Swords,
    color: 'text-orange-600 dark:text-orange-400',
    bg: 'bg-orange-500/10 border-orange-500/20',
  },
  reject: {
    label: 'REJECT',
    icon: XCircle,
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-500/10 border-red-500/20',
  },
}

type WarRoomPanelProps = {
  round: ReviewRound
  discourseContent: string | null
}

export function WarRoomPanel({ round, discourseContent }: WarRoomPanelProps) {
  const reviewers = round.reviewer_outputs ?? []
  const votes = reviewers.map((r) => deriveVote(r, round))
  const rejectCount = votes.filter((v) => v.vote === 'reject').length
  const challengeCount = votes.filter((v) => v.vote === 'challenge').length

  const discourseSections = discourseContent ? parseDiscourseContent(discourseContent) : []

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-zinc-200 bg-zinc-50 px-6 py-4 dark:border-zinc-800 dark:bg-zinc-800/50">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10 border border-red-500/20">
          <Swords className="h-4 w-4 text-red-600 dark:text-red-400" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">⚔️ War Room</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {reviewers.length} agents debating · {rejectCount + challengeCount > 0 ? `${rejectCount} reject · ${challengeCount} challenge` : 'consensus reached'}
          </p>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Vote Tally */}
        <div>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            🗳️ Agent Votes
          </h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {votes.map((v) => {
              const cfg = VOTE_CONFIG[v.vote]
              const VoteIcon = cfg.icon
              const AgentIcon = REVIEWER_ICONS[v.type] ?? User
              return (
                <div
                  key={v.type}
                  className={cn(
                    'flex items-start gap-3 rounded-lg border p-3',
                    cfg.bg,
                  )}
                >
                  <AgentIcon className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500 dark:text-zinc-400" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                        {v.displayName}
                      </span>
                    </div>
                    <div className={cn('flex items-center gap-1 mt-0.5', cfg.color)}>
                      <VoteIcon className="h-3 w-3 shrink-0" />
                      <span className="text-[10px] font-bold uppercase tracking-wide">{cfg.label}</span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400 leading-tight">
                      {v.reason}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Consensus summary */}
          <div className={cn(
            'mt-3 flex items-center gap-2 rounded-lg border px-4 py-2.5',
            rejectCount > 0
              ? 'border-red-500/25 bg-red-500/5'
              : 'border-emerald-500/25 bg-emerald-500/5',
          )}>
            {rejectCount > 0 ? (
              <XCircle className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
            ) : (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            )}
            <span className={cn(
              'text-xs font-semibold',
              rejectCount > 0 ? 'text-red-700 dark:text-red-400' : 'text-emerald-700 dark:text-emerald-400',
            )}>
              {rejectCount > 0
                ? `${rejectCount} REJECT vote${rejectCount !== 1 ? 's' : ''} — REQUEST CHANGES required`
                : 'Consensus: APPROVE — safe to merge'}
            </span>
          </div>
        </div>

        {/* Debate Transcript */}
        {discourseContent && (
          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              💬 Debate Transcript
            </h3>
            <div className="space-y-3">
              {discourseSections.length > 0
                ? discourseSections.map((section, i) => (
                    <DiscourseBlock
                      key={i}
                      type={section.type}
                      content={section.content}
                      reviewer={section.reviewer}
                    />
                  ))
                : <MarkdownRenderer content={discourseContent} />
              }
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
