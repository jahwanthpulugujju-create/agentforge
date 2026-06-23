import { useEffect, useRef } from 'react'

interface Cloud {
  x: number; y: number         // canvas px
  vx: number; vy: number       // drift velocity (very slow)
  radius: number               // gradient radius in px
  r: number; g: number; b: number
  alpha: number                // peak opacity of this cloud
  phase: number                // for breathing / pulsing
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

interface Dust {
  x: number; y: number
  vx: number; vy: number
  size: number
  alpha: number
  r: number; g: number; b: number
}

// ── palette ───────────────────────────────────────────────────────────────────
// Screen blend mode needs bright, saturated values to show up on near-black.
// Deep/muted colors disappear with screen blend — use vivid hues at full sat.
const CLOUD_PALETTE: [number, number, number][] = [
  [100,  40, 255],  // vivid violet
  [140,  60, 255],  // purple
  [40,  160, 255],  // bright cyan-blue
  [0,   200, 255],  // electric cyan
  [255,  60, 160],  // hot magenta
  [200,  40, 255],  // violet-pink
  [60,   80, 255],  // cobalt
  [255,  80, 220],  // pink
  [0,   230, 180],  // teal-green
]

const STAR_PALETTE: [number, number, number][] = [
  [255, 255, 255],
  [200, 220, 255],
  [180, 200, 255],
  [255, 200, 200],
  [200, 255, 240],
  [230, 200, 255],
]

const CLOUD_COUNT  = 9
const STAR_COUNT   = 380
const DUST_COUNT   = 70

function rand(min: number, max: number) { return min + Math.random() * (max - min) }
function randInt(min: number, max: number) { return Math.floor(rand(min, max + 1)) }

function initClouds(w: number, h: number): Cloud[] {
  return Array.from({ length: CLOUD_COUNT }, () => {
    const [r, g, b] = CLOUD_PALETTE[randInt(0, CLOUD_PALETTE.length - 1)]
    return {
      x: rand(0, w),
      y: rand(0, h),
      vx: rand(-0.12, 0.12),
      vy: rand(-0.08, 0.08),
      radius: rand(Math.min(w, h) * 0.25, Math.min(w, h) * 0.55),
      r, g, b,
      alpha: rand(0.07, 0.18),
      phase: rand(0, Math.PI * 2),
      phaseSpeed: rand(0.0004, 0.0012),
    }
  })
}

function initStars(w: number, h: number): Star[] {
  return Array.from({ length: STAR_COUNT }, () => {
    const [r, g, b] = STAR_PALETTE[randInt(0, STAR_PALETTE.length - 1)]
    return {
      x: rand(0, w),
      y: rand(0, h),
      size: rand(0.25, 1.6),
      baseAlpha: rand(0.35, 1.0),
      phase: rand(0, Math.PI * 2),
      phaseSpeed: rand(0.0008, 0.003),
      r, g, b,
    }
  })
}

function initDust(w: number, h: number): Dust[] {
  return Array.from({ length: DUST_COUNT }, () => {
    const [r, g, b] = CLOUD_PALETTE[randInt(0, CLOUD_PALETTE.length - 1)]
    return {
      x: rand(0, w),
      y: rand(0, h),
      vx: rand(-0.18, 0.18),
      vy: rand(-0.14, 0.14),
      size: rand(1.2, 3.0),
      alpha: rand(0.06, 0.22),
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
    let dust:   Dust[]  = []
    let t = 0

    const resize = () => {
      canvas.width  = window.innerWidth
      canvas.height = window.innerHeight
      clouds = initClouds(canvas.width, canvas.height)
      stars  = initStars(canvas.width, canvas.height)
      dust   = initDust(canvas.width, canvas.height)
    }
    resize()
    window.addEventListener('resize', resize)

    const draw = () => {
      t++
      const { width: w, height: h } = canvas
      ctx.clearRect(0, 0, w, h)

      // ── 1. Nebula clouds (additive screen blend) ────────────────────────────
      ctx.save()
      ctx.globalCompositeOperation = 'screen'

      for (const c of clouds) {
        // slow drift
        c.x += c.vx; c.y += c.vy

        // wrap around with a soft margin
        const margin = c.radius * 0.5
        if (c.x < -margin) c.x = w + margin
        if (c.x > w + margin) c.x = -margin
        if (c.y < -margin) c.y = h + margin
        if (c.y > h + margin) c.y = -margin

        c.phase += c.phaseSpeed

        // breathing: alpha oscillates ±30% of base
        const breathAlpha = c.alpha * (0.7 + 0.3 * Math.sin(c.phase))
        const breathRadius = c.radius * (0.85 + 0.15 * Math.sin(c.phase * 0.7))

        const grad = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, breathRadius)
        grad.addColorStop(0,   `rgba(${c.r},${c.g},${c.b},${breathAlpha})`)
        grad.addColorStop(0.4, `rgba(${c.r},${c.g},${c.b},${breathAlpha * 0.45})`)
        grad.addColorStop(1,   `rgba(${c.r},${c.g},${c.b},0)`)

        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(c.x, c.y, breathRadius, 0, Math.PI * 2)
        ctx.fill()
      }

      ctx.restore()

      // ── 2. Bright star cores ────────────────────────────────────────────────
      ctx.save()
      ctx.globalCompositeOperation = 'screen'

      for (const s of stars) {
        s.phase += s.phaseSpeed
        const alpha = s.baseAlpha * (0.4 + 0.6 * Math.abs(Math.sin(s.phase)))

        // soft glow for brighter stars
        if (s.size > 1.0) {
          const glowR = s.size * 3.5
          const gGrad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, glowR)
          gGrad.addColorStop(0,   `rgba(${s.r},${s.g},${s.b},${alpha * 0.4})`)
          gGrad.addColorStop(1,   `rgba(${s.r},${s.g},${s.b},0)`)
          ctx.fillStyle = gGrad
          ctx.beginPath()
          ctx.arc(s.x, s.y, glowR, 0, Math.PI * 2)
          ctx.fill()
        }

        // core point
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.size * 0.6, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${s.r},${s.g},${s.b},${alpha})`
        ctx.fill()
      }

      ctx.restore()

      // ── 3. Dust motes (normal blend, very subtle) ───────────────────────────
      ctx.save()
      ctx.globalCompositeOperation = 'screen'

      for (const d of dust) {
        d.x += d.vx; d.y += d.vy
        if (d.x < 0) d.x = w; if (d.x > w) d.x = 0
        if (d.y < 0) d.y = h; if (d.y > h) d.y = 0

        const dGrad = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, d.size)
        dGrad.addColorStop(0, `rgba(${d.r},${d.g},${d.b},${d.alpha})`)
        dGrad.addColorStop(1, `rgba(${d.r},${d.g},${d.b},0)`)
        ctx.fillStyle = dGrad
        ctx.beginPath()
        ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2)
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
