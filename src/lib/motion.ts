import { useRef } from 'react'
import type { Variants } from 'motion/react'
import { useReducedMotion } from 'motion/react'

export { useReducedMotion }

/** Entrada suave de baixo pra cima. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
}

/** Container que escalona a entrada dos filhos. */
export const staggerContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
}

/** Item filho de um staggerContainer. */
export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
}

/** Transição de modal com mola. */
export const springModal: Variants = {
  hidden: { opacity: 0, scale: 0.96, y: 8 },
  show: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 320, damping: 26 } },
  exit: { opacity: 0, scale: 0.97, y: 6, transition: { duration: 0.15 } },
}

/** Transição de troca de página/rota. */
export const pageTransition: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.18 } },
}

/**
 * Hook de tilt 3D: retorna handlers de pointer que inclinam o elemento
 * conforme a posição do mouse. Desliga quando o usuário pede reduced-motion.
 */
export function useTilt3d(maxDeg = 10) {
  const ref = useRef<HTMLElement | null>(null)
  const reduce = useReducedMotion()

  function onPointerMove(e: React.PointerEvent<HTMLElement>) {
    if (reduce) return
    const el = e.currentTarget
    const r = el.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width - 0.5
    const py = (e.clientY - r.top) / r.height - 0.5
    el.style.transform = `perspective(800px) rotateX(${(-py * maxDeg).toFixed(2)}deg) rotateY(${(px * maxDeg).toFixed(2)}deg)`
    // alimenta o efeito spotlight (var CSS)
    el.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`)
    el.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`)
  }
  function onPointerLeave(e: React.PointerEvent<HTMLElement>) {
    e.currentTarget.style.transform = ''
  }

  return { ref, onPointerMove, onPointerLeave, style: { transition: 'transform 0.2s ease' } as React.CSSProperties }
}
