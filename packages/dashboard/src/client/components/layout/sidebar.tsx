import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { LogOut, Key, ChevronDown } from 'lucide-react'
import { useSocket } from '../../providers/socket-provider'
import { useCommandState } from '../../providers/command-state-provider'
import { useIdeConfig } from '../../hooks/use-ide-config'
import { useAuthContext } from '../../hooks/use-auth'

const NAV = [
  { to: '/',          label: 'overview'  },
  { to: '/commands',  label: 'war room'  },
  { to: '/reviewers', label: 'agents'    },
  { to: '/sessions',  label: 'sessions'  },
  { to: '/reviews',   label: 'findings'  },
  { to: '/settings',  label: 'settings'  },
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
      className="relative flex items-center justify-between rounded-md px-3 py-[7px] transition-colors"
      style={{
        background: active ? 'rgba(255,255,255,0.07)' : 'transparent',
        color: active ? '#e2e8f0' : '#64748b',
      }}
      onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.color = '#94a3b8' }}
      onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLElement).style.color = '#64748b' }}
    >
      {active && (
        <div className="absolute left-0 inset-y-[20%] w-px"
          style={{ background: 'rgba(255,255,255,0.35)' }} />
      )}
      <span className="font-mono text-[11.5px]">{label}</span>
      {badge != null && badge > 0 && (
        <span className="rounded font-mono text-[8px] px-1.5 py-px font-semibold"
          style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}>
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
          className="block w-full rounded-md px-3 py-2 text-center font-mono text-[11px] transition-all"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8' }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.color = '#e2e8f0'
            ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.18)'
            ;(e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)'
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.color = '#94a3b8'
            ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.1)'
            ;(e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'
          }}
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
    <div className="relative px-3 pb-4 pt-3"
      style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors"
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)' }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded font-mono text-[9px] font-semibold"
          style={{ background: 'rgba(255,255,255,0.1)', color: '#94a3b8' }}>
          {initials}
        </div>
        <p className="flex-1 truncate font-mono text-[10.5px]" style={{ color: '#94a3b8' }}>
          {user.name || user.email}
        </p>
        <ChevronDown className={`h-2.5 w-2.5 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          style={{ color: '#64748b' }} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div
            className="absolute bottom-full left-2 right-2 z-20 mb-1 rounded-lg overflow-hidden shadow-2xl"
            style={{ background: '#0d0d14', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="px-3 py-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="font-mono text-[10px]" style={{ color: '#64748b' }}>{user.email}</p>
            </div>
            <div className="p-1">
              <Link to="/settings/api-keys" onClick={() => setOpen(false)}
                className="flex w-full items-center gap-2 rounded px-2.5 py-2 font-mono text-[10.5px] transition-colors"
                style={{ color: '#94a3b8' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; (e.currentTarget as HTMLElement).style.color = '#e2e8f0' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#94a3b8' }}>
                <Key className="h-3 w-3" /> api keys
              </Link>
              <button onClick={handleLogout}
                className="flex w-full items-center gap-2 rounded px-2.5 py-2 font-mono text-[10.5px] transition-colors"
                style={{ color: '#94a3b8' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(248,113,113,0.06)'; (e.currentTarget as HTMLElement).style.color = '#f87171' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#94a3b8' }}>
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
    <aside className="flex h-full w-48 shrink-0 flex-col"
      style={{
        background: 'rgba(3,3,7,0.94)',
        backdropFilter: 'blur(24px)',
        borderRight: '1px solid rgba(255,255,255,0.07)',
      }}>

      {/* Brand */}
      <div className="px-4 pt-4 pb-3.5"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="font-mono text-[13px] font-semibold" style={{ letterSpacing: '-0.02em', color: '#e2e8f0' }}>
          agent<span style={{ color: '#38bdf8' }}>forge</span>
        </div>
        {config?.workspaceName && (
          <p className="font-mono text-[9.5px] truncate mt-0.5" style={{ color: '#475569' }}>
            {config.workspaceName}
            {config.gitBranch && <> / {config.gitBranch}</>}
          </p>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-2.5 space-y-px">
        {NAV.map(({ to, label }) => (
          <NavLink key={to} to={to} label={label}
            badge={to === '/commands' ? runningCount : undefined} />
        ))}

        {user && (
          <>
            <div className="my-2.5" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }} />
            {AUTH_NAV.map(({ to, label }) => (
              <NavLink key={to} to={to} label={label} />
            ))}
          </>
        )}
      </nav>

      {/* Socket indicator */}
      <div className="flex items-center gap-1.5 px-4 py-2.5"
        style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="h-1 w-1 rounded-full"
          style={{
            background: status === 'connected' ? '#34d399' : '#475569',
            boxShadow: status === 'connected' ? '0 0 5px rgba(52,211,153,0.6)' : 'none',
          }} />
        <span className="font-mono text-[9.5px]"
          style={{ color: status === 'connected' ? '#34d399' : '#475569' }}>
          {status}
        </span>
      </div>

      <UserWidget />
    </aside>
  )
}
