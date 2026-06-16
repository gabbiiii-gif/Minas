import type { ReactNode, PointerEvent, HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface Props extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  className?: string
}

/**
 * React Bits — SpotlightCard. Luz radial âmbar segue o ponteiro (var CSS --mx/--my,
 * consumida por .spotlight-card::before em globals.css).
 * Repassa props extras (style, onPointerMove de tilt, etc.); chama o handler do caller também.
 */
export function SpotlightCard({ children, className, onPointerMove, ...rest }: Props) {
  function handleMove(e: PointerEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect()
    e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`)
    e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`)
    onPointerMove?.(e)
  }
  return (
    <div {...rest} onPointerMove={handleMove} className={cn('spotlight-card', className)}>
      {children}
    </div>
  )
}
