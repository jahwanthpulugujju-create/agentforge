import type { LucideIcon } from 'lucide-react'

type StatCardProps = {
  title: string
  value: number | string
  icon: LucideIcon
  trend?: 'up' | 'down'
  accentColor?: string
  glowColor?: string
}

export function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  accentColor = '#00d4ff',
  glowColor = 'rgba(0, 212, 255, 0.15)',
}: StatCardProps) {
  return (
    <div
      className="relative overflow-hidden rounded-xl p-5 transition-all duration-200 hover:-translate-y-0.5"
      style={{
        background: 'linear-gradient(135deg, rgba(15, 23, 41, 0.9) 0%, rgba(10, 16, 30, 0.95) 100%)',
        border: `1px solid rgba(${hexToRgb(accentColor)}, 0.15)`,
        boxShadow: `0 4px 24px rgba(0, 0, 0, 0.3)`,
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLDivElement
        el.style.borderColor = `rgba(${hexToRgb(accentColor)}, 0.4)`
        el.style.boxShadow = `0 0 24px ${glowColor}, 0 4px 24px rgba(0,0,0,0.4)`
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLDivElement
        el.style.borderColor = `rgba(${hexToRgb(accentColor)}, 0.15)`
        el.style.boxShadow = `0 4px 24px rgba(0, 0, 0, 0.3)`
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 rounded-xl"
        style={{
          background: `radial-gradient(ellipse at top right, rgba(${hexToRgb(accentColor)}, 0.06) 0%, transparent 60%)`,
        }}
      />
      <div className="relative flex items-start justify-between">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-lg"
          style={{
            background: `rgba(${hexToRgb(accentColor)}, 0.1)`,
            border: `1px solid rgba(${hexToRgb(accentColor)}, 0.2)`,
          }}
        >
          <Icon className="h-4 w-4" style={{ color: accentColor }} />
        </div>
        <div
          className="text-[9px] font-bold uppercase tracking-widest"
          style={{ color: 'rgba(74, 85, 104, 0.8)' }}
        >
          {trend && (
            <span style={{ color: trend === 'up' ? '#00ff88' : '#ff4060' }}>
              {trend === 'up' ? '↑' : '↓'}
            </span>
          )}
        </div>
      </div>
      <div className="relative mt-4">
        <div
          className="text-3xl font-bold tracking-tight"
          style={{ color: '#e2e8f0' }}
        >
          {value}
        </div>
        <div
          className="mt-1 text-[10px] font-medium uppercase tracking-widest"
          style={{ color: '#4a5568' }}
        >
          {title}
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
