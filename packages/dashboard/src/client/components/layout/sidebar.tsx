import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Home, GitBranch, FileSearch, Terminal, Users, Key, Cpu, LogOut, ChevronDown } from 'lucide-react'
import { cn } from '../../lib/utils'
import { OcrLogoIcon } from '../ocr-logo'
import { useSocket } from '../../providers/socket-provider'
import { useCommandState } from '../../providers/command-state-provider'
import { useIdeConfig } from '../../hooks/use-ide-config'
import { useAuthContext } from '../../hooks/use-auth'

const NAV_ITEMS = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/commands', label: 'Commands', icon: Terminal },
  { to: '/reviewers', label: 'Team', icon: Users },
  { to: '/sessions', label: 'Sessions', icon: GitBranch },
  { to: '/reviews', label: 'Reviews', icon: FileSearch },
] as const

const AUTH_NAV_ITEMS = [
  { to: '/jobs', label: 'AI Reviews', icon: Cpu },
  { to: '/settings/api-keys', label: 'API Keys', icon: Key },
] as const

const STATUS_COLORS: Record<string, string> = {
  connected: 'bg-emerald-500',
  connecting: 'bg-amber-500 animate-pulse',
  reconnecting: 'bg-amber-500 animate-pulse',
  disconnected: 'bg-red-500',
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
        'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
        active
          ? 'bg-zinc-200 font-medium text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100'
          : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100',
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {label}
      {badge != null && badge > 0 && (
        <span className="ml-auto inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-indigo-500 px-1.5 text-[10px] font-semibold text-white">
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
      <div className="border-t border-zinc-200 p-3 dark:border-zinc-800">
        <Link
          to="/login"
          className="flex w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-500 transition-colors"
        >
          Sign in
        </Link>
      </div>
    )
  }

  const initials = user.name
    ? user.name
        .split(' ')
        .map((w) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : user.email.slice(0, 2).toUpperCase()

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <div className="relative border-t border-zinc-200 p-2 dark:border-zinc-800">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-900"
      >
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[11px] font-semibold text-white">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-zinc-900 dark:text-zinc-100">
            {user.name || user.email}
          </p>
          {user.name && (
            <p className="truncate text-[10px] text-zinc-500 dark:text-zinc-400">{user.email}</p>
          )}
        </div>
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 shrink-0 text-zinc-400 transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full left-2 right-2 z-20 mb-1 rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
            <div className="border-b border-zinc-100 px-3 py-2 dark:border-zinc-800">
              <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
                {user.name || 'Account'}
              </p>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">{user.email}</p>
              <span className="mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-medium capitalize bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                {user.plan}
              </span>
            </div>
            <div className="p-1">
              <Link
                to="/settings/api-keys"
                onClick={() => setOpen(false)}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                <Key className="h-3.5 w-3.5" />
                API Keys
              </Link>
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
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
      document.title = `${config.workspaceName}${branch} — OCR Dashboard`
    } else {
      document.title = 'OCR Dashboard'
    }
  }, [config?.workspaceName, config?.gitBranch])

  return (
    <aside className="flex h-full w-56 flex-col border-r border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="group/brand relative flex h-14 items-center gap-2.5 border-b border-zinc-200 px-4 dark:border-zinc-800">
        <OcrLogoIcon className="h-6 w-auto shrink-0 text-zinc-900 dark:text-zinc-100" />
        <div className="min-w-0 flex-1">
          <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            OCR Dashboard
          </span>
          {config?.workspaceName && (
            <span className="block truncate text-[11px] text-zinc-500 dark:text-zinc-400">
              {config.workspaceName}
              {config.gitBranch && (
                <span className="ml-1 text-zinc-400 dark:text-zinc-500">
                  ({config.gitBranch})
                </span>
              )}
            </span>
          )}
        </div>

        {config?.workspaceName && (
          <div className="pointer-events-none absolute left-full top-2 z-50 ml-2 min-w-[280px] max-w-sm opacity-0 transition-opacity delay-300 group-hover/brand:opacity-100">
            <div className="absolute -left-1 top-3 h-2 w-2 rotate-45 bg-zinc-900 dark:bg-zinc-700" />
            <div className="relative rounded-lg bg-zinc-900 px-3 py-2 text-xs shadow-lg dark:bg-zinc-700">
              <div className="font-medium text-white">{config.workspaceName}</div>
              {config.gitBranch && (
                <div className="mt-0.5 font-mono text-emerald-400">{config.gitBranch}</div>
              )}
              <div className="mt-1.5 break-words border-t border-zinc-700 pt-1.5 font-mono text-[10px] text-zinc-400 dark:border-zinc-600">
                {config.projectRoot}
              </div>
            </div>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
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
            <div className="my-2 border-t border-zinc-200 dark:border-zinc-800" />
            {AUTH_NAV_ITEMS.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} label={label} icon={Icon} />
            ))}
          </>
        )}
      </nav>

      <div className="border-t border-zinc-200 px-3 py-2 dark:border-zinc-800">
        <div
          role="status"
          aria-label={`Connection status: ${status}`}
          className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400"
        >
          <div
            className={cn('h-2 w-2 rounded-full', STATUS_COLORS[status] ?? 'bg-zinc-400')}
            aria-hidden="true"
          />
          <span className="capitalize">{status}</span>
        </div>
      </div>

      <UserWidget />
    </aside>
  )
}
