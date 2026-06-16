import { useEffect, useRef, useState } from 'react'
import { animate, useInView } from 'motion/react'
import { useReducedMotion } from '@/lib/motion'

interface Props {
  value: number
  /** Formata o número exibido (ex.: centsToBRL). Default: inteiro. */
  format?: (n: number) => string
  duration?: number
  className?: string
}

/**
 * React Bits — CountUp. Anima do valor anterior até o novo quando entra em view
 * ou quando `value` muda. Respeita prefers-reduced-motion.
 */
export function CountUp({ value, format, duration = 0.8, className }: Props) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: false, margin: '-10% 0px' })
  const reduce = useReducedMotion()
  const [display, setDisplay] = useState(value)
  const prev = useRef(value)

  useEffect(() => {
    if (reduce) {
      setDisplay(value)
      prev.current = value
      return
    }
    if (!inView) return
    const controls = animate(prev.current, value, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setDisplay(v),
    })
    prev.current = value
    return () => controls.stop()
  }, [value, inView, reduce, duration])

  const fmt = format ?? ((n: number) => Math.round(n).toString())
  return (
    <span ref={ref} className={className}>
      {fmt(display)}
    </span>
  )
}
