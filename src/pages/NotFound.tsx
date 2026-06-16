import { Link } from 'react-router-dom'
import { Compass } from 'lucide-react'
import { motion } from 'motion/react'
import { fadeUp } from '@/lib/motion'

export default function NotFound() {
  return (
    <div className="flex h-screen items-center justify-center bg-muted/30 p-6">
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="show"
        className="flex max-w-sm flex-col items-center gap-3 rounded-2xl border bg-card p-8 text-center shadow-sm"
      >
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
          <Compass size={28} />
        </span>
        <h1 className="text-3xl font-bold">404</h1>
        <p className="text-sm text-muted-foreground">Página não encontrada.</p>
        <Link
          to="/"
          className="mt-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
        >
          Voltar
        </Link>
      </motion.div>
    </div>
  )
}
