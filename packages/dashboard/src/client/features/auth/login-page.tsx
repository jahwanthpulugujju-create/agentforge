import { useState, Suspense, lazy } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../hooks/use-auth'
import { Eye, EyeOff, ArrowRight } from 'lucide-react'
import { NebulaBackground } from '../../components/three/NebulaBackground'

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

  const inputStyle = {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)',
    color: '#e2e8f0',
    outline: 'none',
    width: '100%',
    borderRadius: 8,
    padding: '12px 16px',
    fontSize: 14,
    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
    fontFamily: 'inherit',
  }

  return (
    <div className="relative min-h-screen flex overflow-hidden" style={{ background: '#07090f' }}>
      <NebulaBackground opacity={0.7} />

      {/* Radial vignette toward edges */}
      <div className="pointer-events-none fixed inset-0 z-[1]"
        style={{ background: 'radial-gradient(ellipse 85% 85% at 50% 50%, transparent 20%, rgba(7,9,15,0.7) 100%)' }} />

      {/* Left — Orb */}
      <div className="relative z-10 hidden lg:flex lg:flex-1 flex-col items-center justify-center gap-16">
        <div style={{ width: 480, height: 480 }}>
          <Suspense fallback={null}>
            <LoginOrb />
          </Suspense>
        </div>

        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-6">
            {[
              { color: '#38bdf8', label: 'Architect' },
              { color: '#34d399', label: 'Coder' },
              { color: '#f87171', label: 'Security' },
              { color: '#fbbf24', label: 'Performance' },
              { color: '#a78bfa', label: 'Reviewer' },
              { color: '#f472b6', label: "Devil's Advocate" },
            ].map(({ color, label }) => (
              <div key={label} className="flex flex-col items-center gap-1.5">
                <div className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
                <span className="font-mono text-[9px]" style={{ color: '#1e293b' }}>{label}</span>
              </div>
            ))}
          </div>
          <p className="font-mono text-xs" style={{ color: '#1e293b' }}>
            Six agents. One consensus. Zero compromises.
          </p>
        </div>
      </div>

      {/* Right — Form */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-8 lg:max-w-[480px]">
        <div className="w-full max-w-sm animate-forge-fade-in">

          {/* Brand */}
          <div className="mb-10">
            <div className="font-mono text-base font-semibold mb-6" style={{ color: '#e2e8f0' }}>
              agent<span style={{ color: '#38bdf8' }}>forge</span>
            </div>
            <h1 className="text-[2rem] font-bold leading-tight mb-2" style={{ color: '#f0f4f8', letterSpacing: '-0.025em' }}>
              Welcome back.
            </h1>
            <p className="text-sm" style={{ color: '#334155' }}>Your squad is standing by.</p>
          </div>

          {/* Form panel */}
          <div className="rounded-xl p-7"
            style={{
              background: 'rgba(255,255,255,0.025)',
              border: '1px solid rgba(255,255,255,0.08)',
              backdropFilter: 'blur(32px)',
            }}>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block font-mono text-[10px] mb-2 uppercase tracking-widest" style={{ color: '#334155' }}>
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={inputStyle}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(255,255,255,0.03)'
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label className="block font-mono text-[10px] mb-2 uppercase tracking-widest" style={{ color: '#334155' }}>
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    style={{ ...inputStyle, paddingRight: 44 }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(255,255,255,0.03)'
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
                      e.currentTarget.style.boxShadow = 'none'
                    }}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 transition-colors"
                    style={{ color: '#1e293b' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#475569' }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#1e293b' }}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="rounded-lg px-4 py-3 text-sm"
                  style={{ background: 'rgba(248,113,113,0.07)', border: '1px solid rgba(248,113,113,0.18)', color: '#f87171' }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg py-3 text-sm font-semibold transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
                style={{
                  background: loading ? 'rgba(56,189,248,0.08)' : '#38bdf8',
                  color: loading ? '#334155' : '#07090f',
                  border: 'none',
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    (e.currentTarget as HTMLElement).style.background = '#7dd3fc'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loading) {
                    (e.currentTarget as HTMLElement).style.background = '#38bdf8'
                  }
                }}
              >
                {loading ? 'Authenticating…' : (
                  <>Enter the War Room <ArrowRight className="h-4 w-4" /></>
                )}
              </button>
            </form>

            <p className="mt-5 text-center text-xs" style={{ color: '#1e293b' }}>
              No account?{' '}
              <Link to="/register" className="transition-colors" style={{ color: '#38bdf8' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#7dd3fc' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#38bdf8' }}>
                Deploy your squad →
              </Link>
            </p>
          </div>

          <p className="mt-6 text-center font-mono text-[9px] uppercase tracking-widest" style={{ color: '#0f1929' }}>
            6 agents · adversarial review · consensus required
          </p>
        </div>
      </div>
    </div>
  )
}
