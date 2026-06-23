import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  GitBranch,
  FileSearch,
  Swords,
  Users,
  Key,
  Cpu,
  LogOut,
  ChevronDown,
  Zap,
  Shield,
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { OcrLogoIcon } from '../ocr-logo'
import { useSocket } from '../../providers/socket-provider'
import { useCommandState } from '../../providers/command-state-provider'
import { useIdeConfig } from '../../hooks/use-ide-config'
import { useAuthContext } from '../../hooks/use-auth'

const NAV_ITEMS = [
  { to: '/', label: 'Command Center', icon: LayoutDashboard },
  { to: '/commands', label: 'War Room', icon: Swords },
  { to: '/reviewers', label: 'Agents', icon: Users },
  { to: '/sessions', label: 'Sessions', icon: GitBranch },
  { to: '/reviews', label: 'Findings', icon: FileSearch },
] as const

const AUTH_NAV_ITEMS = [
  { to: '/jobs', label: 'AI Reviews', icon: Cpu },
  { to: '/settings/api-keys', label: 'API Keys', icon: Key },
] as const

const STATUS_COLORS: Record<string, string> = {
  connected: '#00ff88',
  connecting: '#f59e0b',
  reconnecting: '#f59e0b',
  disconnected: '#ff4060',
}
const STATUS_LABELS: Record<string, string> = {
  connected: 'LIVE',
  connecting: 'CONNECTING',
  reconnecting: 'RECONNECTING',
  disconnected: 'OFFLINE',
}

function NavLink({
  to,
  label,
  icon: Icon,
  badge,
}: {
  to: string
  label: string
  icon: React.ElementType
  badge?: number
}) {
  const location = useLocation()
  const active = to === '/' ? location.pathname === '/' : location.pathname.startsWith(to)

  return (
    <Link
      to={to}
      className={cn(
        'group relative flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-xs font-medium transition-all duration-200',
        active
          ? 'text-white'
          : 'text-slate-400 hover:text-slate-200',
      )}
      style={active ? {
        background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.12) 0%, rgba(139, 92, 246, 0.06) 100%)',
        borderLeft: '2px solid #00d4ff',
        paddingLeft: '10px',
        boxShadow: 'inset 0 0 16px rgba(0, 212, 255, 0.04)',
      } : {}}
    >
      {!active && (
        <span
          className="absolute inset-0 rounded-lg opacity-0 transition-opacity duration-200 group-hover:opacity-100"
          style={{ background: 'rgba(0, 212, 255, 0.04)' }}
        />
      )}
      <Icon
        className="h-3.5 w-3.5 shrink-0 transition-colors"
        style={{ color: active ? '#00d4ff' : undefined }}
      />
      <span className="tracking-wide uppercase" style={{ fontSize: '10px', letterSpacing: '0.08em' }}>{label}</span>
      {badge != null && badge > 0 && (
        <span
          className="ml-auto inline-flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-bold"
          style={{
            background: 'linear-gradient(135deg, #00d4ff, #8b5cf6)',
            color: '#030712',
          }}
        >
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
      <div className="border-t p-3" style={{ borderColor: 'rgba(0, 212, 255, 0.1)' }}>
        <Link
          to="/login"
          className="forge-btn-primary flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold tracking-widest uppercase transition-all"
          style={{
            background: 'linear-gradient(135deg, #00d4ff, #0099cc)',
            color: '#030712',
          }}
        >
          Sign In
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
    <div className="relative border-t p-2" style={{ borderColor: 'rgba(0, 212, 255, 0.1)' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-xs transition-all hover:bg-white/5"
      >
        <div
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold"
          style={{
            background: 'linear-gradient(135deg, #00d4ff, #8b5cf6)',
            color: '#030712',
          }}
        >
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-slate-200">{user.name || user.email}</p>
          {user.name && (
            <p className="truncate text-[10px]" style={{ color: '#4a5568' }}>{user.email}</p>
          )}
        </div>
        <ChevronDown
          className={cn('h-3 w-3 shrink-0 transition-transform', open && 'rotate-180')}
          style={{ color: '#4a5568' }}
        />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div
            className="absolute bottom-full left-2 right-2 z-20 mb-1 rounded-xl border shadow-2xl"
            style={{
              background: 'linear-gradient(135deg, #0d1117, #0f1729)',
              borderColor: 'rgba(0, 212, 255, 0.2)',
            }}
          >
            <div className="border-b px-3 py-2.5" style={{ borderColor: 'rgba(0, 212, 255, 0.1)' }}>
              <p className="text-xs font-medium text-slate-200">{user.name || 'Account'}</p>
              <p className="text-[10px]" style={{ color: '#4a5568' }}>{user.email}</p>
              <span
                className="mt-1.5 inline-block rounded-md px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest"
                style={{ background: 'rgba(0, 212, 255, 0.1)', color: '#00d4ff' }}
              >
                {user.plan}
              </span>
            </div>
            <div className="p-1">
              <Link
                to="/settings/api-keys"
                onClick={() => setOpen(false)}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs transition-all hover:bg-white/5"
                style={{ color: '#64748b' }}
              >
                <Key className="h-3.5 w-3.5" />
                API Keys
              </Link>
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs transition-all hover:bg-red-950/20"
                style={{ color: '#ff4060' }}
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign out
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export function Sidebar() {
  const location = useLocation()
  const { status } = useSocket()
  const { runningCount } = useCommandState()
  const { data: config } = useIdeConfig()
  const { user } = useAuthContext()

  useEffect(() => {
    if (config?.workspaceName) {
      const branch = config.gitBranch ? ` (${config.gitBranch})` : ''
      document.title = `${config.workspaceName}${branch} — AgentForge`
    } else {
      document.title = 'AgentForge'
    }
  }, [config?.workspaceName, config?.gitBranch])

  const statusColor = STATUS_COLORS[status] ?? '#4a5568'
  const statusLabel = STATUS_LABELS[status] ?? status.toUpperCase()

  return (
    <aside
      className="relative flex h-full w-56 flex-col"
      style={{
        background: 'linear-gradient(180deg, #080d1a 0%, #060b16 100%)',
        borderRight: '1px solid rgba(0, 212, 255, 0.1)',
      }}
    >
      <div
        className="flex h-14 items-center gap-2.5 px-4"
        style={{ borderBottom: '1px solid rgba(0, 212, 255, 0.1)' }}
      >
        <div
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
          style={{ background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.2), rgba(139, 92, 246, 0.1))', border: '1px solid rgba(0, 212, 255, 0.3)' }}
        >
          <Zap className="h-3.5 w-3.5" style={{ color: '#00d4ff' }} />
        </div>
        <div className="min-w-0 flex-1">
          <span className="text-sm font-bold tracking-tight" style={{ color: '#e2e8f0' }}>
            Agent<span style={{ color: '#00d4ff' }}>Forge</span>
          </span>
          {config?.workspaceName && (
            <span className="block truncate text-[9px] uppercase tracking-widest" style={{ color: '#4a5568' }}>
              {config.workspaceName}
            </span>
          )}
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-2 pt-3">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            label={label}
            icon={Icon}
            badge={to === '/commands' ? runningCount : undefined}
          />
        ))}

        {user && (
          <>
            <div className="my-3 border-t" style={{ borderColor: 'rgba(0, 212, 255, 0.08)' }} />
            {AUTH_NAV_ITEMS.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} label={label} icon={Icon} />
            ))}
          </>
        )}
      </nav>

      <div
        className="flex items-center justify-between px-4 py-2"
        style={{ borderTop: '1px solid rgba(0, 212, 255, 0.08)' }}
      >
        <div className="flex items-center gap-1.5">
          <div
            className="h-1.5 w-1.5 rounded-full"
            style={{
              backgroundColor: statusColor,
              boxShadow: `0 0 6px ${statusColor}`,
              animation: status === 'connected' ? undefined : 'forge-pulse 1.5s infinite',
            }}
          />
          <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: statusColor }}>
            {statusLabel}
          </span>
        </div>
        <Shield className="h-3 w-3" style={{ color: 'rgba(0, 212, 255, 0.3)' }} />
      </div>

      <UserWidget />
    </aside>
  )
}
