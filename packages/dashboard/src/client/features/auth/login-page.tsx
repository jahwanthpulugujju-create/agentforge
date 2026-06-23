import { useState, Suspense, lazy } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../hooks/use-auth'
import { Zap, Eye, EyeOff, ArrowRight } from 'lucide-react'

const LoginOrb = lazy(() =>
  import('../../components/three/LoginOrb').then((m) => ({ default: m.LoginOrb }))
)

export function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/')
    } catch (err) {
      setError((err as Error).message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="relative min-h-screen flex overflow-hidden"
      style={{ background: '#030712' }}
    >
      {/* 3D grid */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0, 212, 255, 0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 212, 255, 0.04) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />
      {/* Radial glow top */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            'radial-gradient(ellipse 90% 55% at 50% -5%, rgba(0, 212, 255, 0.12) 0%, transparent 65%)',
        }}
      />
      {/* Bottom-left violet glow */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            'radial-gradient(ellipse 60% 40% at 0% 100%, rgba(139, 92, 246, 0.08) 0%, transparent 60%)',
        }}
      />

      {/* Left — 3D Orb panel */}
      <div className="relative hidden lg:flex lg:flex-1 items-center justify-center">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 70% 60% at 50% 50%, rgba(0, 212, 255, 0.07) 0%, transparent 70%)',
          }}
        />

        <div style={{ width: 520, height: 520 }}>
          <Suspense fallback={null}>
            <LoginOrb />
          </Suspense>
        </div>

        <div className="absolute bottom-12 left-0 right-0 text-center">
          <div className="flex items-center justify-center gap-8">
            {[
              { color: '#00d4ff', label: 'Architect' },
              { color: '#00ff88', label: 'Coder' },
              { color: '#ff4060', label: 'Security' },
              { color: '#f59e0b', label: 'Performance' },
              { color: '#8b5cf6', label: 'Reviewer' },
              { color: '#ec4899', label: "Devil's Advocate" },
            ].map(({ color, label }) => (
              <div key={label} className="flex flex-col items-center gap-1">
                <div
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: color, boxShadow: `0 0 8px ${color}` }}
                />
                <span
                  className="text-[9px] font-bold uppercase tracking-widest"
                  style={{ color: 'rgba(74,85,104,0.7)' }}
                >
                  {label}
                </span>
              </div>
            ))}
          </div>
          <p
            className="mt-6 text-xs font-medium"
            style={{
              background: 'linear-gradient(135deg, #00d4ff, #8b5cf6)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Six agents. One consensus. Zero compromises.
          </p>
        </div>
      </div>

      {/* Right — Auth panel */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-8 lg:max-w-lg">
        <div className="w-full max-w-md animate-forge-fade-in">
          {/* Logo */}
          <div className="mb-10 flex flex-col items-start">
            <div className="mb-5 flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl"
                style={{
                  background:
                    'linear-gradient(135deg, rgba(0,212,255,0.2), rgba(139,92,246,0.1))',
                  border: '1px solid rgba(0,212,255,0.35)',
                  boxShadow: '0 0 24px rgba(0,212,255,0.15)',
                }}
              >
                <Zap className="h-5 w-5" style={{ color: '#00d4ff' }} />
              </div>
              <span
                className="text-2xl font-black tracking-tight"
                style={{ color: '#e2e8f0' }}
              >
                Agent
                <span
                  style={{
                    background: 'linear-gradient(135deg, #00d4ff 0%, #8b5cf6 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  Forge
                </span>
              </span>
            </div>
            <h1
              className="text-3xl font-black leading-tight"
              style={{ color: '#e2e8f0' }}
            >
              Welcome back,
              <br />
              <span
                style={{
                  background: 'linear-gradient(135deg, #00d4ff, #8b5cf6)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                Engineer.
              </span>
            </h1>
            <p className="mt-2 text-sm" style={{ color: '#4a5568' }}>
              Your squad is standing by in the War Room.
            </p>
          </div>

          {/* Form card */}
          <div
            className="rounded-2xl p-8"
            style={{
              background:
                'linear-gradient(135deg, rgba(15,23,41,0.95) 0%, rgba(10,16,30,0.98) 100%)',
              border: '1px solid rgba(0,212,255,0.18)',
              boxShadow:
                '0 0 0 1px rgba(0,212,255,0.04), 0 32px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(0,212,255,0.08)',
              backdropFilter: 'blur(24px)',
            }}
          >
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  className="mb-2 block text-[10px] font-bold uppercase tracking-widest"
                  style={{ color: '#4a5568' }}
                >
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-xl px-4 py-3.5 text-sm transition-all"
                  style={{
                    background: 'rgba(8,12,20,0.8)',
                    border: '1px solid rgba(0,212,255,0.12)',
                    color: '#e2e8f0',
                    outline: 'none',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(0,212,255,0.5)'
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,212,255,0.08)'
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(0,212,255,0.12)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label
                  className="mb-2 block text-[10px] font-bold uppercase tracking-widest"
                  style={{ color: '#4a5568' }}
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full rounded-xl px-4 py-3.5 pr-12 text-sm transition-all"
                    style={{
                      background: 'rgba(8,12,20,0.8)',
                      border: '1px solid rgba(0,212,255,0.12)',
                      color: '#e2e8f0',
                      outline: 'none',
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(0,212,255,0.5)'
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,212,255,0.08)'
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(0,212,255,0.12)'
                      e.currentTarget.style.boxShadow = 'none'
                    }}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 transition-colors"
                    style={{ color: '#374151' }}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div
                  className="rounded-xl px-4 py-3 text-sm"
                  style={{
                    background: 'rgba(255,64,96,0.08)',
                    border: '1px solid rgba(255,64,96,0.25)',
                    color: '#ff4060',
                  }}
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="group relative w-full overflow-hidden rounded-xl px-4 py-3.5 text-sm font-bold uppercase tracking-widest transition-all disabled:opacity-60"
                style={{
                  background: loading
                    ? 'rgba(0,212,255,0.08)'
                    : 'linear-gradient(135deg, #00d4ff 0%, #0099cc 100%)',
                  color: loading ? '#4a5568' : '#030712',
                  boxShadow: loading
                    ? 'none'
                    : '0 0 32px rgba(0,212,255,0.35), 0 4px 16px rgba(0,0,0,0.3)',
                }}
              >
                {!loading && (
                  <span
                    className="pointer-events-none absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100"
                    style={{
                      background:
                        'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 100%)',
                    }}
                  />
                )}
                <span className="relative flex items-center justify-center gap-2">
                  {loading ? (
                    'Authenticating…'
                  ) : (
                    <>
                      Enter War Room
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </span>
              </button>
            </form>

            <div className="mt-6 flex items-center gap-3">
              <div
                className="flex-1 h-px"
                style={{ background: 'rgba(0,212,255,0.07)' }}
              />
              <span
                className="text-[10px] uppercase tracking-widest"
                style={{ color: '#2d3748' }}
              >
                or
              </span>
              <div
                className="flex-1 h-px"
                style={{ background: 'rgba(0,212,255,0.07)' }}
              />
            </div>

            <p
              className="mt-5 text-center text-xs"
              style={{ color: '#374151' }}
            >
              New to AgentForge?{' '}
              <Link
                to="/register"
                className="font-semibold transition-colors hover:underline"
                style={{ color: '#00d4ff' }}
              >
                Deploy your squad →
              </Link>
            </p>
          </div>

          <p
            className="mt-6 text-center text-[10px] uppercase tracking-widest"
            style={{ color: 'rgba(74,85,104,0.4)' }}
          >
            6 agents · adversarial review · pre-commit assurance
          </p>
        </div>
      </div>
    </div>
  )
}
