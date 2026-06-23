import { useEffect, useRef } from 'react'

interface Cloud {
  x: number; y: number
  vx: number; vy: number
  radius: number
  r: number; g: number; b: number
  alpha: number
  phase: number
  phaseSpeed: number
}

interface Star {
  x: number; y: number
  size: number
  baseAlpha: number
  phase: number
  phaseSpeed: number
  r: number; g: number; b: number
}

// Cool-only palette — deep blues and violets. Screen blend on near-black
// gives a very subtle, cold, premium space feel. No warm or saturated tones.
const CLOUD_PALETTE: [number, number, number][] = [
  [40,  60, 180],  // deep navy
  [60,  40, 200],  // deep violet
  [30,  80, 200],  // cobalt
  [50,  50, 160],  // indigo
  [20,  60, 150],  // midnight blue
  [70,  40, 180],  // purple-navy
]

const STAR_PALETTE: [number, number, number][] = [
  [255, 255, 255],  // pure white
  [210, 225, 255],  // cool blue-white
  [190, 210, 255],  // ice blue
  [230, 235, 255],  // near-white
]

const CLOUD_COUNT = 6
const STAR_COUNT  = 420

function rand(min: number, max: number) { return min + Math.random() * (max - min) }
function randInt(min: number, max: number) { return Math.floor(rand(min, max + 1)) }

function initClouds(w: number, h: number): Cloud[] {
  return Array.from({ length: CLOUD_COUNT }, () => {
    const [r, g, b] = CLOUD_PALETTE[randInt(0, CLOUD_PALETTE.length - 1)]
    return {
      x: rand(0, w), y: rand(0, h),
      vx: rand(-0.06, 0.06), vy: rand(-0.04, 0.04),
      radius: rand(Math.min(w, h) * 0.3, Math.min(w, h) * 0.65),
      r, g, b,
      alpha: rand(0.04, 0.09),   // very restrained — barely perceptible
      phase: rand(0, Math.PI * 2),
      phaseSpeed: rand(0.0003, 0.0009),
    }
  })
}

function initStars(w: number, h: number): Star[] {
  return Array.from({ length: STAR_COUNT }, () => {
    const [r, g, b] = STAR_PALETTE[randInt(0, STAR_PALETTE.length - 1)]
    return {
      x: rand(0, w), y: rand(0, h),
      size: rand(0.2, 1.4),
      baseAlpha: rand(0.25, 0.85),
      phase: rand(0, Math.PI * 2),
      phaseSpeed: rand(0.0006, 0.0022),
      r, g, b,
    }
  })
}

export function NebulaBackground({ opacity = 1 }: { opacity?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef    = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let clouds: Cloud[] = []
    let stars:  Star[]  = []

    const resize = () => {
      canvas.width  = window.innerWidth
      canvas.height = window.innerHeight
      clouds = initClouds(canvas.width, canvas.height)
      stars  = initStars(canvas.width, canvas.height)
    }
    resize()
    window.addEventListener('resize', resize)

    const draw = () => {
      const { width: w, height: h } = canvas
      ctx.clearRect(0, 0, w, h)

      // ── Nebula clouds (additive screen) ─────────────────────────────────
      ctx.save()
      ctx.globalCompositeOperation = 'screen'

      for (const c of clouds) {
        c.x += c.vx; c.y += c.vy
        const margin = c.radius * 0.5
        if (c.x < -margin) c.x = w + margin
        if (c.x > w + margin) c.x = -margin
        if (c.y < -margin) c.y = h + margin
        if (c.y > h + margin) c.y = -margin
        c.phase += c.phaseSpeed

        const breathAlpha  = c.alpha * (0.75 + 0.25 * Math.sin(c.phase))
        const breathRadius = c.radius * (0.9 + 0.1 * Math.sin(c.phase * 0.6))

        const grad = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, breathRadius)
        grad.addColorStop(0,   `rgba(${c.r},${c.g},${c.b},${breathAlpha})`)
        grad.addColorStop(0.45, `rgba(${c.r},${c.g},${c.b},${breathAlpha * 0.3})`)
        grad.addColorStop(1,   `rgba(${c.r},${c.g},${c.b},0)`)

        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(c.x, c.y, breathRadius, 0, Math.PI * 2)
        ctx.fill()
      }

      ctx.restore()

      // ── Stars ────────────────────────────────────────────────────────────
      ctx.save()
      ctx.globalCompositeOperation = 'screen'

      for (const s of stars) {
        s.phase += s.phaseSpeed
        const alpha = s.baseAlpha * (0.35 + 0.65 * Math.abs(Math.sin(s.phase)))

        // subtle glow halo on larger stars
        if (s.size > 0.9) {
          const glowR = s.size * 4
          const gGrad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, glowR)
          gGrad.addColorStop(0, `rgba(${s.r},${s.g},${s.b},${alpha * 0.3})`)
          gGrad.addColorStop(1, `rgba(${s.r},${s.g},${s.b},0)`)
          ctx.fillStyle = gGrad
          ctx.beginPath()
          ctx.arc(s.x, s.y, glowR, 0, Math.PI * 2)
          ctx.fill()
        }

        // core pixel
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.size * 0.55, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${s.r},${s.g},${s.b},${alpha})`
        ctx.fill()
      }

      ctx.restore()

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
      className="pointer-events-none fixed inset-0"
      style={{ opacity, zIndex: 0 }}
    />
  )
}
