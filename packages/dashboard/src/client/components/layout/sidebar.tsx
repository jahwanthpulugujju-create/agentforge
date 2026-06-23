import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { LogOut, Key, ChevronDown } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useSocket } from '../../providers/socket-provider'
import { useCommandState } from '../../providers/command-state-provider'
import { useIdeConfig } from '../../hooks/use-ide-config'
import { useAuthContext } from '../../hooks/use-auth'

const NAV_ITEMS = [
  { to: '/',          label: 'overview',  shortcut: 'G H' },
  { to: '/commands',  label: 'war room',  shortcut: 'G W' },
  { to: '/reviewers', label: 'agents',    shortcut: 'G A' },
  { to: '/sessions',  label: 'sessions',  shortcut: 'G S' },
  { to: '/reviews',   label: 'findings',  shortcut: 'G F' },
] as const

const AUTH_NAV_ITEMS = [
  { to: '/jobs',             label: 'ai reviews',  shortcut: '' },
  { to: '/settings/api-keys', label: 'api keys',   shortcut: '' },
] as const

function NavLink({ to, label, shortcut, badge }: {
  to: string
  label: string
  shortcut: string
  badge?: number
}) {
  const location = useLocation()
  const active = to === '/' ? location.pathname === '/' : location.pathname.startsWith(to)

  return (
    <Link
      to={to}
      className="group flex items-center justify-between rounded px-2 py-1.5 transition-all"
      style={{
        background: active ? 'rgba(0,212,255,0.06)' : 'transparent',
        color: active ? '#e2e8f0' : '#4a5568',
      }}
      onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.color = '#94a3b8' }}
      onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLElement).style.color = '#4a5568' }}
    >
      <span className="font-mono text-xs">{label}</span>
      <div className="flex items-center gap-1.5">
        {badge != null && badge > 0 && (
          <span
            className="rounded px-1.5 py-0.5 font-mono text-[9px] font-bold"
            style={{ background: 'rgba(0,212,255,0.15)', color: '#00d4ff' }}
          >
            {badge}
          </span>
        )}
        {shortcut && (
          <span
            className="font-mono text-[9px] opacity-0 transition-opacity group-hover:opacity-100"
            style={{ color: '#2d3748' }}
          >
            {shortcut}
          </span>
        )}
      </div>
    </Link>
  )
}

function UserWidget() {
  const { user, logout } = useAuthContext()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  if (!user) {
    return (
      <div className="mt-auto px-3 pb-3">
        <Link
          to="/login"
          className="block w-full rounded px-3 py-2 text-center font-mono text-xs font-medium transition-all"
          style={{
            background: 'rgba(0,212,255,0.08)',
            border: '1px solid rgba(0,212,255,0.15)',
            color: '#00d4ff',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,212,255,0.12)' }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,212,255,0.08)' }}
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
    <div className="relative border-t px-3 pb-3 pt-3" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2.5 rounded px-2 py-1.5 text-left transition-all hover:bg-white/[0.03]"
      >
        <div
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm font-mono text-[10px] font-bold"
          style={{ background: 'rgba(0,212,255,0.1)', color: '#00d4ff', border: '1px solid rgba(0,212,255,0.2)' }}
        >
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-mono text-[11px]" style={{ color: '#94a3b8' }}>
            {user.name || user.email}
          </p>
          <p className="font-mono text-[9px]" style={{ color: '#2d3748' }}>{user.plan}</p>
        </div>
        <ChevronDown
          className={cn('h-3 w-3 shrink-0 transition-transform', open && 'rotate-180')}
          style={{ color: '#2d3748' }}
        />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div
            className="absolute bottom-full left-2 right-2 z-20 mb-1 rounded-lg border shadow-2xl overflow-hidden"
            style={{ background: '#0d1117', borderColor: 'rgba(255,255,255,0.08)' }}
          >
            <div className="px-3 py-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <p className="font-mono text-xs" style={{ color: '#e2e8f0' }}>{user.email}</p>
              <p className="font-mono text-[10px] mt-0.5" style={{ color: '#2d3748' }}>{user.plan} plan</p>
            </div>
            <div className="p-1">
              <Link
                to="/settings/api-keys"
                onClick={() => setOpen(false)}
                className="flex w-full items-center gap-2 rounded px-3 py-2 font-mono text-xs transition-all hover:bg-white/[0.04]"
                style={{ color: '#4a5568' }}
              >
                <Key className="h-3 w-3" />
                api keys
              </Link>
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2 rounded px-3 py-2 font-mono text-xs transition-all hover:bg-red-950/20"
                style={{ color: '#ff4060' }}
              >
                <LogOut className="h-3 w-3" />
                sign out
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

  const isConnected = status === 'connected'

  return (
    <aside
      className="flex h-full w-52 flex-col"
      style={{
        background: '#060a12',
        borderRight: '1px solid rgba(255,255,255,0.04)',
      }}
    >
      {/* Brand */}
      <div
        className="px-4 py-4"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
      >
        <div className="flex items-center gap-2 mb-0.5">
          <span className="font-mono text-sm font-bold" style={{ color: '#e2e8f0' }}>
            agent<span style={{ color: '#00d4ff' }}>forge</span>
          </span>
          <span
            className="rounded-sm px-1 py-px font-mono text-[8px] font-bold"
            style={{ background: 'rgba(0,212,255,0.08)', color: '#00d4ff' }}
          >
            beta
          </span>
        </div>
        {config?.workspaceName ? (
          <p className="font-mono text-[10px] truncate" style={{ color: '#2d3748' }}>
            {config.workspaceName}
            {config.gitBranch && <span style={{ color: '#1e293b' }}> · {config.gitBranch}</span>}
          </p>
        ) : (
          <p className="font-mono text-[10px]" style={{ color: '#1e293b' }}>no workspace</p>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-0.5">
        {NAV_ITEMS.map(({ to, label, shortcut }) => (
          <NavLink
            key={to}
            to={to}
            label={label}
            shortcut={shortcut}
            badge={to === '/commands' ? runningCount : undefined}
          />
        ))}

        {user && (
          <>
            <div className="my-3" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }} />
            {AUTH_NAV_ITEMS.map(({ to, label, shortcut }) => (
              <NavLink key={to} to={to} label={label} shortcut={shortcut} />
            ))}
          </>
        )}
      </nav>

      {/* Status bar */}
      <div
        className="flex items-center justify-between px-4 py-2"
        style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
      >
        <div className="flex items-center gap-1.5">
          <div
            className="h-1.5 w-1.5 rounded-full"
            style={{
              background: isConnected ? '#00ff88' : '#ff4060',
              boxShadow: isConnected ? '0 0 6px rgba(0,255,136,0.7)' : 'none',
            }}
          />
          <span className="font-mono text-[10px]" style={{ color: isConnected ? '#00ff88' : '#ff4060' }}>
            {isConnected ? 'connected' : status}
          </span>
        </div>
        <span className="font-mono text-[9px]" style={{ color: '#1e293b' }}>
          v1.8
        </span>
      </div>

      <UserWidget />
    </aside>
  )
}
