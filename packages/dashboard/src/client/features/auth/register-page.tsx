import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../hooks/use-auth'
import { Zap, Eye, EyeOff, ArrowRight, Shield, CheckCircle2 } from 'lucide-react'

const PERKS = [
  { icon: Zap, text: '6 specialized AI agents', color: '#00d4ff' },
  { icon: Shield, text: 'Security-first review loop', color: '#ff4060' },
  { icon: CheckCircle2, text: 'Pre-commit code assurance', color: '#00ff88' },
]

export function RegisterPage() {
  const navigate = useNavigate()
  const { register } = useAuth()
  const [name, setName] = useState('')
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
      await register(email, password, name)
      navigate('/')
    } catch (err) {
      setError((err as Error).message || 'Registration failed')
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
          background: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(139, 92, 246, 0.08) 0%, transparent 70%)',
        }}
      />

      <div className="relative z-10 w-full max-w-md animate-forge-fade-in">
        <div className="mb-8 text-center">
          <div className="mb-4 flex items-center justify-center gap-2">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{
                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(0, 212, 255, 0.1))',
                border: '1px solid rgba(139, 92, 246, 0.3)',
              }}
            >
              <Zap className="h-5 w-5" style={{ color: '#8b5cf6' }} />
            </div>
          </div>
          <h1 className="text-3xl font-black tracking-tight" style={{ color: '#e2e8f0' }}>
            Agent<span style={{
              background: 'linear-gradient(135deg, #8b5cf6 0%, #00d4ff 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>Forge</span>
          </h1>
          <p className="mt-2 text-xs uppercase tracking-widest" style={{ color: '#4a5568' }}>
            Join the future of code review
          </p>
        </div>

        <div className="mb-4 flex items-center justify-center gap-4">
          {PERKS.map((perk) => {
            const Icon = perk.icon
            return (
              <div
                key={perk.text}
                className="flex items-center gap-1.5 rounded-lg px-2 py-1"
                style={{
                  background: `rgba(${hexToRgb(perk.color)}, 0.06)`,
                  border: `1px solid rgba(${hexToRgb(perk.color)}, 0.15)`,
                }}
              >
                <Icon className="h-3 w-3" style={{ color: perk.color }} />
                <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: perk.color }}>
                  {perk.text}
                </span>
              </div>
            )
          })}
        </div>

        <div
          className="rounded-2xl p-8"
          style={{
            background: 'linear-gradient(135deg, rgba(15, 23, 41, 0.95) 0%, rgba(10, 16, 30, 0.98) 100%)',
            border: '1px solid rgba(139, 92, 246, 0.15)',
            boxShadow: '0 0 60px rgba(139, 92, 246, 0.04), 0 32px 64px rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(20px)',
          }}
        >
          <div className="mb-6">
            <h2 className="text-lg font-bold" style={{ color: '#e2e8f0' }}>Create your account</h2>
            <p className="mt-1 text-xs" style={{ color: '#4a5568' }}>Deploy your personal agent squad</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest" style={{ color: '#4a5568' }}>
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl px-4 py-3 text-sm transition-all"
                style={{
                  background: 'rgba(13, 17, 23, 0.8)',
                  border: '1px solid rgba(139, 92, 246, 0.15)',
                  color: '#e2e8f0',
                  outline: 'none',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.5)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(139, 92, 246, 0.08)' }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.15)'; e.currentTarget.style.boxShadow = 'none' }}
                placeholder="Your name"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest" style={{ color: '#4a5568' }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-xl px-4 py-3 text-sm transition-all"
                style={{
                  background: 'rgba(13, 17, 23, 0.8)',
                  border: '1px solid rgba(139, 92, 246, 0.15)',
                  color: '#e2e8f0',
                  outline: 'none',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.5)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(139, 92, 246, 0.08)' }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.15)'; e.currentTarget.style.boxShadow = 'none' }}
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
                  minLength={8}
                  className="w-full rounded-xl px-4 py-3 pr-12 text-sm transition-all"
                  style={{
                    background: 'rgba(13, 17, 23, 0.8)',
                    border: '1px solid rgba(139, 92, 246, 0.15)',
                    color: '#e2e8f0',
                    outline: 'none',
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.5)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(139, 92, 246, 0.08)' }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.15)'; e.currentTarget.style.boxShadow = 'none' }}
                  placeholder="8+ characters"
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
                  ? 'rgba(139, 92, 246, 0.1)'
                  : 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
                color: loading ? '#4a5568' : '#ffffff',
                boxShadow: loading ? 'none' : '0 0 24px rgba(139, 92, 246, 0.3)',
              }}
            >
              <span className="relative flex items-center justify-center gap-2">
                {loading ? 'Deploying agents...' : (
                  <>
                    Deploy My Squad
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </span>
            </button>
          </form>

          <div className="mt-6 flex items-center gap-3">
            <div className="flex-1 h-px" style={{ background: 'rgba(139, 92, 246, 0.08)' }} />
            <span className="text-[10px] uppercase tracking-widest" style={{ color: '#374151' }}>or</span>
            <div className="flex-1 h-px" style={{ background: 'rgba(139, 92, 246, 0.08)' }} />
          </div>

          <p className="mt-4 text-center text-xs" style={{ color: '#4a5568' }}>
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-semibold transition-colors hover:underline"
              style={{ color: '#8b5cf6' }}
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return '0, 212, 255'
  return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
}
