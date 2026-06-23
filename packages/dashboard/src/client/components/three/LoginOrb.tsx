import { useEffect, useRef } from 'react'

function CssOrb() {
  return (
    <div className="relative flex items-center justify-center" style={{ width: 420, height: 420 }}>
      <style>{`
        @keyframes orb-spin-slow   { from { transform: rotateX(60deg) rotateY(0deg);   } to { transform: rotateX(60deg) rotateY(360deg);   } }
        @keyframes orb-spin-med    { from { transform: rotateX(20deg) rotateY(0deg) rotateZ(30deg);  } to { transform: rotateX(20deg) rotateY(360deg) rotateZ(30deg); } }
        @keyframes orb-spin-fast   { from { transform: rotateX(-40deg) rotateY(0deg) rotateZ(-60deg); } to { transform: rotateX(-40deg) rotateY(360deg) rotateZ(-60deg); } }
        @keyframes orb-float       { 0%,100% { transform: translateY(0px) scale(1);   } 50% { transform: translateY(-14px) scale(1.03); } }
        @keyframes orb-pulse-core  { 0%,100% { opacity:0.85; transform: scale(1);     } 50% { opacity:1;    transform: scale(1.08); } }
        @keyframes orb-rotate-group{ from { transform: rotateY(0deg) rotateX(12deg);  } to { transform: rotateY(360deg) rotateX(12deg); } }
        @keyframes dash-anim       { to { stroke-dashoffset: -600; } }
      `}</style>

      <div style={{ animation: 'orb-float 5s ease-in-out infinite', perspective: '800px' }}>
        <div style={{ position: 'relative', width: 380, height: 380, transformStyle: 'preserve-3d', animation: 'orb-rotate-group 18s linear infinite' }}>

          {/* Ring 1 - cyan - equatorial */}
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            border: '1.5px solid rgba(0,212,255,0.55)',
            boxShadow: '0 0 12px rgba(0,212,255,0.3), inset 0 0 12px rgba(0,212,255,0.1)',
            animation: 'orb-spin-slow 6s linear infinite',
          }} />

          {/* Ring 2 - violet - tilted */}
          <div style={{
            position: 'absolute', inset: 16, borderRadius: '50%',
            border: '1.5px solid rgba(139,92,246,0.5)',
            boxShadow: '0 0 10px rgba(139,92,246,0.25)',
            animation: 'orb-spin-med 9s linear infinite',
          }} />

          {/* Ring 3 - green - tilted other way */}
          <div style={{
            position: 'absolute', inset: 30, borderRadius: '50%',
            border: '1px solid rgba(0,255,136,0.35)',
            boxShadow: '0 0 8px rgba(0,255,136,0.2)',
            animation: 'orb-spin-fast 12s linear infinite',
          }} />

          {/* Ring 4 - outer dotted cyan */}
          <div style={{
            position: 'absolute', inset: -20, borderRadius: '50%',
            border: '1px dashed rgba(0,212,255,0.2)',
            animation: 'orb-spin-slow 20s linear infinite reverse',
          }} />

          {/* Sphere body */}
          <div style={{
            position: 'absolute',
            top: '50%', left: '50%',
            transform: 'translate(-50%,-50%)',
            width: 180, height: 180,
            borderRadius: '50%',
            background: 'radial-gradient(circle at 35% 35%, rgba(0,212,255,0.25) 0%, rgba(0,80,120,0.15) 40%, rgba(0,0,0,0.6) 100%)',
            boxShadow: '0 0 60px rgba(0,212,255,0.2), 0 0 120px rgba(139,92,246,0.1), inset 0 0 40px rgba(0,212,255,0.08)',
            border: '1px solid rgba(0,212,255,0.3)',
          }} />

          {/* Core glow */}
          <div
            style={{
              position: 'absolute',
              top: '50%', left: '50%',
              transform: 'translate(-50%,-50%)',
              width: 60, height: 60,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(0,212,255,0.95) 0%, rgba(0,212,255,0.3) 60%, transparent 100%)',
              animation: 'orb-pulse-core 3s ease-in-out infinite',
            }}
          />

          {/* Orbit dot 1 */}
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            width: '100%', height: '100%',
            transform: 'translate(-50%,-50%)',
            animation: 'orb-spin-slow 4s linear infinite',
          }}>
            <div style={{
              position: 'absolute', top: -6, left: '50%',
              width: 12, height: 12, borderRadius: '50%',
              background: '#00d4ff',
              boxShadow: '0 0 16px rgba(0,212,255,0.9)',
              transform: 'translateX(-50%)',
            }} />
          </div>

          {/* Orbit dot 2 */}
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            width: '80%', height: '80%',
            transform: 'translate(-50%,-50%)',
            animation: 'orb-spin-med 7s linear infinite reverse',
          }}>
            <div style={{
              position: 'absolute', bottom: -5, left: '50%',
              width: 9, height: 9, borderRadius: '50%',
              background: '#8b5cf6',
              boxShadow: '0 0 12px rgba(139,92,246,0.9)',
              transform: 'translateX(-50%)',
            }} />
          </div>

          {/* Orbit dot 3 */}
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            width: '65%', height: '65%',
            transform: 'translate(-50%,-50%)',
            animation: 'orb-spin-fast 5s linear infinite',
          }}>
            <div style={{
              position: 'absolute', right: -5, top: '50%',
              width: 7, height: 7, borderRadius: '50%',
              background: '#00ff88',
              boxShadow: '0 0 10px rgba(0,255,136,0.9)',
              transform: 'translateY(-50%)',
            }} />
          </div>

          {/* Hexagonal grid overlay */}
          <svg
            style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%',
              opacity: 0.06, pointerEvents: 'none',
            }}
            viewBox="0 0 380 380"
          >
            <defs>
              <pattern id="hex" width="30" height="26" patternUnits="userSpaceOnUse">
                <polygon points="15,0 30,8 30,18 15,26 0,18 0,8" fill="none" stroke="#00d4ff" strokeWidth="0.8" />
              </pattern>
            </defs>
            <circle cx="190" cy="190" r="186" fill="url(#hex)" />
          </svg>
        </div>
      </div>

      {/* Ambient glow backdrop */}
      <div style={{
        position: 'absolute', inset: 0,
        borderRadius: '50%',
        background: 'radial-gradient(circle at 50% 50%, rgba(0,212,255,0.07) 0%, rgba(139,92,246,0.04) 40%, transparent 70%)',
        pointerEvents: 'none',
      }} />
    </div>
  )
}

function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef    = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const W = canvas.width  = 520
    const H = canvas.height = 520
    const cx = W / 2, cy = H / 2

    interface P { angle: number; radius: number; speed: number; size: number; r: number; g: number; b: number }
    const palette: [number,number,number][] = [[0,212,255],[139,92,246],[0,255,136]]
    const pts: P[] = Array.from({ length: 80 }, () => {
      const [r,g,b] = palette[Math.floor(Math.random()*palette.length)]
      return { angle: Math.random()*Math.PI*2, radius: 60 + Math.random()*180, speed: (Math.random()-0.5)*0.004, size: 1+Math.random()*2, r,g,b }
    })

    const draw = () => {
      ctx.clearRect(0, 0, W, H)
      for (const p of pts) {
        p.angle += p.speed
        const x = cx + Math.cos(p.angle) * p.radius
        const y = cy + Math.sin(p.angle) * p.radius
        ctx.beginPath()
        ctx.arc(x, y, p.size, 0, Math.PI*2)
        ctx.fillStyle = `rgba(${p.r},${p.g},${p.b},0.55)`
        ctx.fill()
      }
      rafRef.current = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute', inset: '-50px',
        pointerEvents: 'none',
        mixBlendMode: 'screen',
        opacity: 0.7,
      }}
    />
  )
}

export function LoginOrb() {
  return (
    <div style={{ position: 'relative', width: 520, height: 520, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <ParticleCanvas />
      <CssOrb />
    </div>
  )
}
