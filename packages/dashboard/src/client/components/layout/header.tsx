import { Link, useLocation } from 'react-router-dom'
import { Sun, Moon, Monitor, Github, ChevronRight } from 'lucide-react'
import { useTheme } from '../../providers/theme-provider'
import { cn } from '../../lib/utils'

const THEME_ICONS = {
  system: Monitor,
  light: Sun,
  dark: Moon,
} as const

function buildBreadcrumbs(pathname: string): { label: string; path: string }[] {
  const labels: Record<string, string> = {
    '': 'Command Center',
    commands: 'War Room',
    reviewers: 'Agents',
    sessions: 'Sessions',
    reviews: 'Findings',
    jobs: 'AI Reviews',
    settings: 'Settings',
    'api-keys': 'API Keys',
    maps: 'Map Run',
  }

  if (pathname === '/') return [{ label: 'Command Center', path: '/' }]

  const parts = pathname.split('/').filter(Boolean)
  const crumbs = [{ label: 'Command Center', path: '/' }]

  let accumulated = ''
  for (const part of parts) {
    accumulated += `/${part}`
    const label = labels[part] ?? (part.charAt(0).toUpperCase() + part.slice(1).replace(/-/g, ' '))
    crumbs.push({ label, path: accumulated })
  }

  return crumbs
}

export function Header() {
  const { mode, cycle } = useTheme()
  const location = useLocation()
  const breadcrumbs = buildBreadcrumbs(location.pathname)

  const ThemeIcon = THEME_ICONS[mode]

  return (
    <header
      className="flex h-14 items-center justify-between px-6"
      style={{
        background: 'rgba(6, 11, 22, 0.8)',
        borderBottom: '1px solid rgba(0, 212, 255, 0.08)',
        backdropFilter: 'blur(12px)',
      }}
    >
      <nav className="flex items-center gap-1" aria-label="Breadcrumb">
        {breadcrumbs.map((crumb, i) => (
          <span key={crumb.path} className="flex items-center gap-1">
            {i > 0 && (
              <ChevronRight className="h-3 w-3" style={{ color: 'rgba(0, 212, 255, 0.3)' }} />
            )}
            {i < breadcrumbs.length - 1 ? (
              <Link
                to={crumb.path}
                className="text-[10px] font-medium uppercase tracking-widest transition-colors hover:text-white"
                style={{ color: '#4a5568' }}
              >
                {crumb.label}
              </Link>
            ) : (
              <span
                className="text-[10px] font-bold uppercase tracking-widest"
                style={{ color: '#e2e8f0' }}
              >
                {crumb.label}
              </span>
            )}
          </span>
        ))}
      </nav>

      <div className="flex items-center gap-1">
        <a
          href="https://github.com/spencermarx/open-code-review"
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-8 w-8 items-center justify-center rounded-lg transition-all hover:bg-white/5"
          style={{ color: '#4a5568' }}
          aria-label="GitHub"
        >
          <Github className="h-3.5 w-3.5" />
        </a>
        <button
          onClick={cycle}
          className="flex h-8 w-8 items-center justify-center rounded-lg transition-all hover:bg-white/5"
          style={{ color: '#4a5568' }}
          aria-label={`Theme: ${mode}`}
        >
          <ThemeIcon className="h-3.5 w-3.5" />
        </button>
      </div>
    </header>
  )
}
