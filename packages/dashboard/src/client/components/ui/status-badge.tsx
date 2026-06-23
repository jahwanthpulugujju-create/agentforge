import { cn } from '../../lib/utils'
import type { SessionStatus, FindingTriage, FindingSeverity, RoundTriage } from '../../../shared/types'

type BadgeVariant = SessionStatus | FindingTriage | FindingSeverity | RoundTriage | 'default'

const VARIANT_STYLES: Record<string, { bg: string; color: string; border: string; dot?: boolean }> = {
  active:       { bg: 'rgba(0,255,136,0.08)',   color: '#00ff88', border: 'rgba(0,255,136,0.25)',   dot: true },
  closed:       { bg: 'rgba(74,85,104,0.1)',    color: '#64748b', border: 'rgba(74,85,104,0.2)' },
  unread:       { bg: 'rgba(0,212,255,0.08)',   color: '#00d4ff', border: 'rgba(0,212,255,0.2)',    dot: true },
  read:         { bg: 'rgba(74,85,104,0.1)',    color: '#64748b', border: 'rgba(74,85,104,0.2)' },
  acknowledged: { bg: 'rgba(245,158,11,0.08)', color: '#f59e0b', border: 'rgba(245,158,11,0.2)' },
  fixed:        { bg: 'rgba(0,212,255,0.08)',   color: '#00d4ff', border: 'rgba(0,212,255,0.2)' },
  wont_fix:     { bg: 'rgba(74,85,104,0.1)',    color: '#64748b', border: 'rgba(74,85,104,0.2)' },
  needs_review: { bg: 'rgba(245,158,11,0.08)', color: '#f59e0b', border: 'rgba(245,158,11,0.2)', dot: true },
  in_progress:  { bg: 'rgba(139,92,246,0.08)', color: '#8b5cf6', border: 'rgba(139,92,246,0.2)', dot: true },
  changes_made: { bg: 'rgba(0,255,136,0.08)',  color: '#00ff88', border: 'rgba(0,255,136,0.2)' },
  dismissed:    { bg: 'rgba(74,85,104,0.1)',   color: '#64748b', border: 'rgba(74,85,104,0.2)' },
  critical:     { bg: 'rgba(255,64,96,0.1)',   color: '#ff4060', border: 'rgba(255,64,96,0.3)' },
  high:         { bg: 'rgba(245,158,11,0.08)', color: '#f59e0b', border: 'rgba(245,158,11,0.25)' },
  medium:       { bg: 'rgba(0,212,255,0.06)',  color: '#00d4ff', border: 'rgba(0,212,255,0.2)' },
  low:          { bg: 'rgba(74,85,104,0.08)',  color: '#64748b', border: 'rgba(74,85,104,0.2)' },
  info:         { bg: 'rgba(74,85,104,0.08)',  color: '#64748b', border: 'rgba(74,85,104,0.2)' },
  default:      { bg: 'rgba(74,85,104,0.08)',  color: '#64748b', border: 'rgba(74,85,104,0.2)' },
}

const LABELS: Partial<Record<string, string>> = {
  wont_fix:     "Won't Fix",
  needs_review: 'Needs Review',
  in_progress:  'In Progress',
  changes_made: 'Changes Made',
}

type StatusBadgeProps = {
  variant: BadgeVariant
  label?: string
  className?: string
}

export function StatusBadge({ variant, label, className }: StatusBadgeProps) {
  const s = VARIANT_STYLES[variant] ?? VARIANT_STYLES.default
  const displayLabel = label ?? LABELS[variant] ?? (variant.charAt(0).toUpperCase() + variant.slice(1))

  return (
    <span
      className={cn('inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest', className)}
      style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}
    >
      {s.dot && (
        <span
          className="h-1 w-1 rounded-full animate-forge-pulse"
          style={{ background: s.color, boxShadow: `0 0 4px ${s.color}` }}
        />
      )}
      {displayLabel}
    </span>
  )
}
