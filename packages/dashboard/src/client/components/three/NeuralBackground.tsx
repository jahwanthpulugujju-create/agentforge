import { useEffect, useRef } from 'react'

interface Particle {
  x: number; y: number; z: number
  vx: number; vy: number; vz: number
  r: number; g: number; b: number
}

const PARTICLE_COUNT = 110
const CONNECTION_DIST = 160
const SPEED = 0.35

function createParticles(w: number, h: number): Particle[] {
  const palette: [number, number, number][] = [
    [0, 212, 255],
    [139, 92, 246],
    [0, 255, 136],
  ]
  return Array.from({ length: PARTICLE_COUNT }, () => {
    const [r, g, b] = palette[Math.floor(Math.random() * palette.length)]
    return {
      x: Math.random() * w,
      y: Math.random() * h,
      z: Math.random(),
      vx: (Math.random() - 0.5) * SPEED,
      vy: (Math.random() - 0.5) * SPEED,
      vz: (Math.random() - 0.5) * 0.002,
      r, g, b,
    }
  })
}

export function NeuralBackground({ opacity = 1 }: { opacity?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef    = useRef<number>(0)
  const particles = useRef<Particle[]>([])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width  = window.innerWidth
      canvas.height = window.innerHeight
      particles.current = createParticles(canvas.width, canvas.height)
    }
    resize()
    window.addEventListener('resize', resize)

    const draw = () => {
      const { width: w, height: h } = canvas
      ctx.clearRect(0, 0, w, h)

      const pts = particles.current
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i]
        p.x += p.vx; p.y += p.vy; p.z += p.vz
        if (p.x < 0 || p.x > w) p.vx *= -1
        if (p.y < 0 || p.y > h) p.vy *= -1
        if (p.z < 0 || p.z > 1) p.vz *= -1
      }

      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x
          const dy = pts[i].y - pts[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < CONNECTION_DIST) {
            const alpha = (1 - dist / CONNECTION_DIST) * 0.45
            const mr = Math.round((pts[i].r + pts[j].r) / 2)
            const mg = Math.round((pts[i].g + pts[j].g) / 2)
            const mb = Math.round((pts[i].b + pts[j].b) / 2)
            ctx.beginPath()
            ctx.moveTo(pts[i].x, pts[i].y)
            ctx.lineTo(pts[j].x, pts[j].y)
            ctx.strokeStyle = `rgba(${mr},${mg},${mb},${alpha})`
            ctx.lineWidth = 0.7
            ctx.stroke()
          }
        }
      }

      for (const p of pts) {
        const size = 1.8 + p.z * 1.5
        const alpha = 0.5 + p.z * 0.5
        ctx.beginPath()
        ctx.arc(p.x, p.y, size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${p.r},${p.g},${p.b},${alpha})`
        ctx.fill()

        if (p.z > 0.7) {
          ctx.beginPath()
          ctx.arc(p.x, p.y, size + 3, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(${p.r},${p.g},${p.b},0.08)`
          ctx.fill()
        }
      }

      rafRef.current = requestAnimationFrame(draw)
    }

    draw()
    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(rafRef.current)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-0"
      style={{ opacity, mixBlendMode: 'screen' }}
    />
  )
}
