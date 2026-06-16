import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { springModal } from '@/lib/motion'
import { cn } from '@/lib/utils'

interface Props {
  open: boolean
  onClose: () => void
  children: ReactNode
  /** Classes do card interno (largura, padding, etc.). */
  className?: string
}

/**
 * Casca de modal: backdrop com fade + blur, card com mola (entrada e saída),
 * fecha ao clicar fora. Respeita prefers-reduced-motion (springModal suave).
 */
export function ModalShell({ open, onClose, children, className }: Props) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            variants={springModal}
            initial="hidden"
            animate="show"
            exit="exit"
            className={cn('border bg-card shadow-2xl', className)}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
