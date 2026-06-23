import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { LogOut, Key, ChevronDown } from 'lucide-react'
import { useSocket } from '../../providers/socket-provider'
import { useCommandState } from '../../providers/command-state-provider'
import { useIdeConfig } from '../../hooks/use-ide-config'
import { useAuthContext } from '../../hooks/use-auth'

const NAV = [
  { to: '/',           label: 'overview'  },
  { to: '/commands',   label: 'war room'  },
  { to: '/reviewers',  label: 'agents'    },
  { to: '/sessions',   label: 'sessions'  },
  { to: '/reviews',    label: 'findings'  },
] as const

const AUTH_NAV = [
  { to: '/jobs',              label: 'ai reviews' },
  { to: '/settings/api-keys', label: 'api keys'   },
] as const

function NavLink({ to, label, badge }: { to: string; label: string; badge?: number }) {
  const { pathname } = useLocation()
  const active = to === '/' ? pathname === '/' : pathname.startsWith(to)

  return (
    <Link
      to={to}
      className="group relative flex items-center justify-between rounded-md px-3 py-2 transition-colors"
      style={{
        background: active ? 'rgba(255,255,255,0.05)' : 'transparent',
        color: active ? '#e2e8f0' : '#334155',
      }}
      onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.color = '#64748b' }}
      onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLElement).style.color = '#334155' }}
    >
      {active && (
        <div className="absolute left-0 top-1/4 h-1/2 w-px rounded-full"
          style={{ background: 'rgba(255,255,255,0.3)' }} />
      )}
      <span className="font-mono text-[12px]">{label}</span>
      {badge != null && badge > 0 && (
        <span className="rounded font-mono text-[9px] px-1.5 py-px font-semibold"
          style={{ background: 'rgba(56,189,248,0.1)', color: '#38bdf8' }}>
          {badge}
        </span>
      )}
    </Link>
  )
}

function UserWidget() {
  const { user, logout } = useAuthContext()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  if (!user) {
    return (
      <div className="px-3 pb-4">
        <Link
          to="/login"
          className="block w-full rounded-md px-3 py-2 text-center font-mono text-[12px] transition-all"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: '#64748b',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#e2e8f0'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.14)' }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#64748b'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)' }}
        >
          sign in →
        </Link>
      </div>
    )
  }

  const initials = user.name
    ? user.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
    : user.email.slice(0, 2).toUpperCase()

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <div className="relative px-3 pb-4 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left transition-colors hover:bg-white/[0.03]"
      >
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded font-mono text-[10px] font-semibold"
          style={{ background: 'rgba(255,255,255,0.07)', color: '#94a3b8' }}>
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-mono text-[11px]" style={{ color: '#64748b' }}>
            {user.name || user.email}
          </p>
        </div>
        <ChevronDown className={`h-3 w-3 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          style={{ color: '#1e293b' }} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div
            className="absolute bottom-full left-2 right-2 z-20 mb-1 rounded-lg overflow-hidden shadow-2xl"
            style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <div className="px-3 py-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <p className="font-mono text-[11px]" style={{ color: '#64748b' }}>{user.email}</p>
            </div>
            <div className="p-1">
              <Link to="/settings/api-keys" onClick={() => setOpen(false)}
                className="flex w-full items-center gap-2 rounded px-3 py-2 font-mono text-[11px] transition-colors hover:bg-white/[0.04]"
                style={{ color: '#475569' }}>
                <Key className="h-3 w-3" /> api keys
              </Link>
              <button onClick={handleLogout}
                className="flex w-full items-center gap-2 rounded px-3 py-2 font-mono text-[11px] transition-colors"
                style={{ color: '#f87171' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(248,113,113,0.06)' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
                <LogOut className="h-3 w-3" /> sign out
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export function Sidebar() {
  const { status } = useSocket()
  const { runningCount } = useCommandState()
  const { data: config } = useIdeConfig()
  const { user } = useAuthContext()

  useEffect(() => {
    document.title = config?.workspaceName
      ? `${config.workspaceName} — AgentForge`
      : 'AgentForge'
  }, [config?.workspaceName])

  return (
    <aside
      className="flex h-full w-48 flex-col"
      style={{
        background: 'rgba(4,6,10,0.85)',
        backdropFilter: 'blur(20px)',
        borderRight: '1px solid rgba(255,255,255,0.05)',
      }}
    >
      {/* Brand */}
      <div className="px-4 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="font-mono text-[13px] font-semibold" style={{ color: '#e2e8f0', letterSpacing: '-0.02em' }}>
          agent<span style={{ color: '#38bdf8' }}>forge</span>
        </div>
        {config?.workspaceName ? (
          <p className="font-mono text-[10px] truncate mt-0.5" style={{ color: '#1e293b' }}>
            {config.workspaceName}
            {config.gitBranch && <span> / {config.gitBranch}</span>}
          </p>
        ) : null}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-px">
        {NAV.map(({ to, label }) => (
          <NavLink key={to} to={to} label={label}
            badge={to === '/commands' ? runningCount : undefined} />
        ))}

        {user && (
          <>
            <div className="my-3" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }} />
            {AUTH_NAV.map(({ to, label }) => (
              <NavLink key={to} to={to} label={label} />
            ))}
          </>
        )}
      </nav>

      {/* Socket status */}
      <div className="flex items-center gap-1.5 px-4 py-2.5"
        style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="h-1.5 w-1.5 rounded-full"
          style={{
            background: status === 'connected' ? '#34d399' : '#f87171',
            boxShadow: status === 'connected' ? '0 0 6px rgba(52,211,153,0.6)' : 'none',
          }} />
        <span className="font-mono text-[10px]" style={{ color: status === 'connected' ? '#34d399' : '#f87171' }}>
          {status === 'connected' ? 'connected' : status}
        </span>
      </div>

      <UserWidget />
    </aside>
  )
}
