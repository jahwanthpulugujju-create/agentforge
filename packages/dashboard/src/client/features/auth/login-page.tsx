import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../hooks/use-auth'
import { Zap, Shield, Eye, EyeOff, ArrowRight, Brain, TrendingUp, Swords } from 'lucide-react'

const FLOATING_AGENTS = [
  { label: 'Architect', color: '#00d4ff', icon: Brain, pos: { top: '15%', left: '8%' } },
  { label: 'Security', color: '#ff4060', icon: Shield, pos: { top: '25%', right: '6%' } },
  { label: 'Performance', color: '#f59e0b', icon: TrendingUp, pos: { bottom: '30%', left: '5%' } },
  { label: 'Skeptic', color: '#ec4899', icon: Swords, pos: { bottom: '20%', right: '8%' } },
]

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
      className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden"
      style={{ background: '#030712' }}
    >
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0, 212, 255, 0.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 212, 255, 0.035) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
        }}
      />
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(0, 212, 255, 0.1) 0%, transparent 70%)',
        }}
      />
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background: 'radial-gradient(ellipse 60% 40% at 80% 80%, rgba(139, 92, 246, 0.05) 0%, transparent 60%)',
        }}
      />

      {FLOATING_AGENTS.map((agent) => {
        const Icon = agent.icon
        return (
          <div
            key={agent.label}
            className="pointer-events-none fixed hidden lg:flex items-center gap-2 rounded-xl px-3 py-2"
            style={{
              ...agent.pos,
              background: `rgba(${hexToRgb(agent.color)}, 0.06)`,
              border: `1px solid rgba(${hexToRgb(agent.color)}, 0.15)`,
              backdropFilter: 'blur(8px)',
              animation: 'forge-float 4s ease-in-out infinite',
              animationDelay: `${Math.random() * 2}s`,
            }}
          >
            <Icon className="h-3.5 w-3.5" style={{ color: agent.color }} />
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: agent.color }}>
              {agent.label}
            </span>
          </div>
        )
      })}

      <div className="relative z-10 w-full max-w-md animate-forge-fade-in">
        <div className="mb-8 text-center">
          <div className="mb-4 flex items-center justify-center gap-2">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{
                background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.2), rgba(139, 92, 246, 0.1))',
                border: '1px solid rgba(0, 212, 255, 0.3)',
              }}
            >
              <Zap className="h-5 w-5" style={{ color: '#00d4ff' }} />
            </div>
          </div>
          <h1 className="text-3xl font-black tracking-tight" style={{ color: '#e2e8f0' }}>
            Agent<span style={{
              background: 'linear-gradient(135deg, #00d4ff 0%, #8b5cf6 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>Forge</span>
          </h1>
          <p className="mt-2 text-xs uppercase tracking-widest" style={{ color: '#4a5568' }}>
            Multi-Agent Code Assurance Platform
          </p>
        </div>

        <div
          className="rounded-2xl p-8"
          style={{
            background: 'linear-gradient(135deg, rgba(15, 23, 41, 0.95) 0%, rgba(10, 16, 30, 0.98) 100%)',
            border: '1px solid rgba(0, 212, 255, 0.15)',
            boxShadow: '0 0 60px rgba(0, 212, 255, 0.04), 0 32px 64px rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(20px)',
          }}
        >
          <div className="mb-6">
            <h2 className="text-lg font-bold" style={{ color: '#e2e8f0' }}>Welcome back</h2>
            <p className="mt-1 text-xs" style={{ color: '#4a5568' }}>Sign in to access the War Room</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest" style={{ color: '#4a5568' }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="forge-input w-full rounded-xl px-4 py-3 text-sm transition-all"
                style={{
                  background: 'rgba(13, 17, 23, 0.8)',
                  border: '1px solid rgba(0, 212, 255, 0.15)',
                  color: '#e2e8f0',
                }}
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest" style={{ color: '#4a5568' }}>
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="forge-input w-full rounded-xl px-4 py-3 pr-12 text-sm transition-all"
                  style={{
                    background: 'rgba(13, 17, 23, 0.8)',
                    border: '1px solid rgba(0, 212, 255, 0.15)',
                    color: '#e2e8f0',
                  }}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 transition-colors"
                  style={{ color: '#4a5568' }}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div
                className="rounded-xl px-4 py-3 text-sm"
                style={{
                  background: 'rgba(255, 64, 96, 0.08)',
                  border: '1px solid rgba(255, 64, 96, 0.25)',
                  color: '#ff4060',
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="group relative w-full overflow-hidden rounded-xl px-4 py-3 text-sm font-bold uppercase tracking-widest transition-all disabled:opacity-50"
              style={{
                background: loading
                  ? 'rgba(0, 212, 255, 0.1)'
                  : 'linear-gradient(135deg, #00d4ff, #0099cc)',
                color: loading ? '#4a5568' : '#030712',
              }}
            >
              <span className="relative flex items-center justify-center gap-2">
                {loading ? 'Authenticating...' : (
                  <>
                    Enter War Room
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </span>
            </button>
          </form>

          <div className="mt-6 flex items-center gap-3">
            <div className="flex-1 h-px" style={{ background: 'rgba(0, 212, 255, 0.08)' }} />
            <span className="text-[10px] uppercase tracking-widest" style={{ color: '#374151' }}>or</span>
            <div className="flex-1 h-px" style={{ background: 'rgba(0, 212, 255, 0.08)' }} />
          </div>

          <p className="mt-4 text-center text-xs" style={{ color: '#4a5568' }}>
            New to AgentForge?{' '}
            <Link
              to="/register"
              className="font-semibold transition-colors hover:underline"
              style={{ color: '#00d4ff' }}
            >
              Create your account
            </Link>
          </p>
        </div>

        <p className="mt-6 text-center text-[10px] uppercase tracking-widest" style={{ color: 'rgba(74, 85, 104, 0.5)' }}>
          6 agents · adversarial review · code assurance
        </p>
      </div>
    </div>
  )
}

function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return '0, 212, 255'
  return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
}
