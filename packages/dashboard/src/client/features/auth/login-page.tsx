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

  const inputBase: React.CSSProperties = {
    width: '100%',
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 8,
    padding: '11px 14px',
    fontSize: 14,
    color: '#e2e8f0',
    outline: 'none',
    fontFamily: 'inherit',
    transition: 'border-color 0.15s, box-shadow 0.15s',
  }

  return (
    <div className="relative min-h-screen flex overflow-hidden" style={{ background: '#030305' }}>
      <NebulaBackground opacity={0.55} />

      {/* Edge vignette — keeps corners very black */}
      <div className="pointer-events-none fixed inset-0 z-[1]"
        style={{ background: 'radial-gradient(ellipse 80% 80% at 50% 50%, transparent 25%, rgba(3,3,5,0.75) 100%)' }} />

      {/* Left — Orb */}
      <div className="relative z-10 hidden lg:flex lg:flex-1 flex-col items-center justify-center gap-14">
        <div style={{ width: 460, height: 460 }}>
          <Suspense fallback={null}>
            <LoginOrb />
          </Suspense>
        </div>

        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-5">
            {[
              { color: '#38bdf8', label: 'Architect' },
              { color: '#34d399', label: 'Coder' },
              { color: '#f87171', label: 'Security' },
              { color: '#fbbf24', label: 'Performance' },
              { color: '#a78bfa', label: 'Reviewer' },
              { color: '#f472b6', label: "Devil's Advocate" },
            ].map(({ color, label }) => (
              <div key={label} className="flex flex-col items-center gap-1.5">
                <div className="h-1 w-1 rounded-full" style={{ background: color, opacity: 0.5 }} />
                <span className="font-mono text-[8px] uppercase tracking-wider" style={{ color: '#111827' }}>
                  {label}
                </span>
              </div>
            ))}
          </div>
          <p className="font-mono text-[10px]" style={{ color: '#0f172a' }}>
            Six agents. One consensus.
          </p>
        </div>
      </div>

      {/* Right — Form */}
      <div className="relative z-10 flex flex-1 items-center justify-center px-8 lg:max-w-[440px]">
        <div className="w-full max-w-[320px] animate-forge-fade-in">

          <div className="font-mono text-[13px] font-semibold mb-8" style={{ letterSpacing: '-0.02em' }}>
            agent<span style={{ color: '#38bdf8' }}>forge</span>
          </div>

          <h1 className="text-[2.25rem] font-bold mb-1.5" style={{ color: '#f8fafc', letterSpacing: '-0.03em' }}>
            Welcome back.
          </h1>
          <p className="text-sm mb-8" style={{ color: '#1f2937' }}>
            Your squad is standing by.
          </p>

          {/* Panel */}
          <div className="rounded-xl p-6"
            style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.07)',
              backdropFilter: 'blur(40px)',
            }}>
            <form onSubmit={handleSubmit} className="space-y-4">

              <div>
                <label className="block font-mono text-[9px] uppercase tracking-widest mb-2" style={{ color: '#1f2937' }}>
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  style={inputBase}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.16)'
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(255,255,255,0.02)'
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                />
              </div>

              <div>
                <label className="block font-mono text-[9px] uppercase tracking-widest mb-2" style={{ color: '#1f2937' }}>
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    style={{ ...inputBase, paddingRight: 40 }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.16)'
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(255,255,255,0.02)'
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'
                      e.currentTarget.style.boxShadow = 'none'
                    }}
                  />
                  <button type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                    style={{ color: '#111827' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#374151' }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#111827' }}>
                    {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="rounded-lg px-3.5 py-2.5 text-[12.5px]"
                  style={{ background: 'rgba(248,113,113,0.05)', border: '1px solid rgba(248,113,113,0.14)', color: '#f87171' }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-1 flex items-center justify-center gap-2 rounded-lg py-3 text-[13.5px] font-semibold transition-all disabled:opacity-40"
                style={{ background: '#f8fafc', color: '#030305', border: 'none' }}
                onMouseEnter={(e) => { if (!loading) (e.currentTarget as HTMLElement).style.background = '#ffffff' }}
                onMouseLeave={(e) => { if (!loading) (e.currentTarget as HTMLElement).style.background = '#f8fafc' }}
              >
                {loading ? 'Authenticating…' : <> Enter the War Room <ArrowRight className="h-3.5 w-3.5" /></>}
              </button>
            </form>
          </div>

          <p className="mt-5 text-center text-[11.5px]" style={{ color: '#111827' }}>
            No account?{' '}
            <Link to="/register"
              style={{ color: '#1f2937' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#374151' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#1f2937' }}>
              Deploy your squad →
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
