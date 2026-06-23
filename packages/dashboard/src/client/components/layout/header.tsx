import { Link, useLocation } from 'react-router-dom'
import { Github } from 'lucide-react'

const ROUTE_LABELS: Record<string, string> = {
  '': 'overview',
  commands: 'war room',
  reviewers: 'agents',
  sessions: 'sessions',
  reviews: 'findings',
  jobs: 'ai reviews',
  settings: 'settings',
  'api-keys': 'api keys',
}

function buildBreadcrumbs(pathname: string) {
  if (pathname === '/') return [{ label: 'overview', path: '/' }]
  const parts = pathname.split('/').filter(Boolean)
  const crumbs = [{ label: 'overview', path: '/' }]
  let acc = ''
  for (const part of parts) {
    acc += `/${part}`
    crumbs.push({ label: ROUTE_LABELS[part] ?? part, path: acc })
  }
  return crumbs
}

export function Header() {
  const location = useLocation()
  const crumbs = buildBreadcrumbs(location.pathname)

  return (
    <header
      className="flex h-11 items-center justify-between px-6"
      style={{
        background: 'rgba(6,10,18,0.85)',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <nav className="flex items-center gap-1.5 font-mono text-xs" aria-label="Breadcrumb">
        {crumbs.map((c, i) => (
          <span key={c.path} className="flex items-center gap-1.5">
            {i > 0 && <span style={{ color: '#1e293b' }}>/</span>}
            {i < crumbs.length - 1 ? (
              <Link
                to={c.path}
                className="transition-colors hover:text-white"
                style={{ color: '#2d3748' }}
              >
                {c.label}
              </Link>
            ) : (
              <span style={{ color: '#94a3b8' }}>{c.label}</span>
            )}
          </span>
        ))}
      </nav>

      <a
        href="https://github.com/spencermarx/open-code-review"
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-7 w-7 items-center justify-center rounded transition-all hover:bg-white/[0.04]"
        style={{ color: '#2d3748' }}
      >
        <Github className="h-3.5 w-3.5" />
      </a>
    </header>
  )
}
