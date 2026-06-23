import { useRef, useCallback, type ReactNode } from 'react'

type TiltCardProps = {
  children: ReactNode
  className?: string
  style?: React.CSSProperties
  maxTilt?: number
  glowColor?: string
}

export function TiltCard({ children, className, style, maxTilt = 12, glowColor = 'rgba(0,212,255,0.2)' }: TiltCardProps) {
  const cardRef = useRef<HTMLDivElement>(null!)
  const rafRef  = useRef<number>(0)

  const handleMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => {
      const card  = cardRef.current
      if (!card) return
      const rect  = card.getBoundingClientRect()
      const cx    = rect.left + rect.width  / 2
      const cy    = rect.top  + rect.height / 2
      const dx    = (e.clientX - cx) / (rect.width  / 2)
      const dy    = (e.clientY - cy) / (rect.height / 2)
      const rotY  =  dx * maxTilt
      const rotX  = -dy * maxTilt
      card.style.transform = `perspective(800px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale3d(1.04,1.04,1.04)`
      card.style.boxShadow = `0 20px 60px rgba(0,0,0,0.5), 0 0 30px ${glowColor}`
    })
  }, [maxTilt, glowColor])

  const handleLeave = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    const card = cardRef.current
    if (!card) return
    card.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)'
    card.style.boxShadow = ''
  }, [])

  return (
    <div
      ref={cardRef}
      className={className}
      style={{
        ...style,
        transition: 'transform 0.15s ease-out, box-shadow 0.15s ease-out',
        transformStyle: 'preserve-3d',
        willChange: 'transform',
      }}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
    >
      {children}
    </div>
  )
}
