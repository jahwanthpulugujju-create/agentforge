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
        background: 'rgba(4,4,10,0.88)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        backdropFilter: 'blur(12px)',
      }}
    >
      <nav className="flex items-center gap-1.5 font-mono text-xs" aria-label="Breadcrumb">
        {crumbs.map((c, i) => (
          <span key={c.path} className="flex items-center gap-1.5">
            {i > 0 && <span style={{ color: '#334155' }}>/</span>}
            {i < crumbs.length - 1 ? (
              <Link
                to={c.path}
                className="transition-colors"
                style={{ color: '#475569' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#94a3b8' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#475569' }}
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
        href="https://github.com/jahwanthpulugujju-create/agentforge"
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-7 w-7 items-center justify-center rounded-md transition-all"
        style={{ color: '#64748b' }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#94a3b8'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)' }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#64748b'; (e.currentTarget as HTMLElement).style.background = 'transparent' }}
      >
        <Github className="h-3.5 w-3.5" />
      </a>
    </header>
  )
}
