import { motion } from 'motion/react'
import { useReducedMotion } from '@/lib/motion'

interface Props {
  text: string
  className?: string
  /** Atraso inicial em segundos antes de começar a animar. */
  delay?: number
  /** Atraso entre palavras (s). */
  step?: number
}

/**
 * React Bits — BlurText. Cada palavra aparece desfocada → nítida, em sequência.
 * Respeita prefers-reduced-motion (renderiza texto estático).
 */
export function BlurText({ text, className, delay = 0, step = 0.08 }: Props) {
  const reduce = useReducedMotion()
  if (reduce) return <span className={className}>{text}</span>

  const words = text.split(' ')
  return (
    <span className={className} aria-label={text}>
      {words.map((w, i) => (
        <motion.span
          key={`${w}-${i}`}
          aria-hidden
          style={{ display: 'inline-block', willChange: 'filter, transform, opacity' }}
          initial={{ opacity: 0, filter: 'blur(10px)', y: '0.3em' }}
          animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
          transition={{ duration: 0.55, delay: delay + i * step, ease: [0.22, 1, 0.36, 1] }}
        >
          {w}
          {i < words.length - 1 ? ' ' : ''}
        </motion.span>
      ))}
    </span>
  )
}
