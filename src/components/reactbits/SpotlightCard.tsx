import type { ReactNode, PointerEvent } from 'react'
import { cn } from '@/lib/utils'

interface Props {
  children: ReactNode
  className?: string
}

/**
 * React Bits — SpotlightCard. Luz radial âmbar segue o ponteiro (var CSS --mx/--my,
 * consumida por .spotlight-card::before em globals.css).
 */
export function SpotlightCard({ children, className }: Props) {
  function onMove(e: PointerEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect()
    e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`)
    e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`)
  }
  return (
    <div onPointerMove={onMove} className={cn('spotlight-card', className)}>
      {children}
    </div>
  )
}
