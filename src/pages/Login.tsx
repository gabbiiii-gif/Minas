import { FormEvent, useEffect, useRef, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { toast } from 'sonner'
import { motion } from 'motion/react'
import { animate } from 'animejs'
import { useAuthStore } from '@/stores/auth'
import { fadeUp, staggerContainer, staggerItem, useTilt3d } from '@/lib/motion'
import { BlurText } from '@/components/reactbits/BlurText'

const VIDEO_URL =
  'https://res.cloudinary.com/dfonotyfb/video/upload/v1775585556/dds3_1_rqhg7x.mp4'

export default function Login() {
  const location = useLocation()
  const { user, signIn, loading } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const emailRef = useRef<HTMLInputElement>(null)
  const logoRef = useRef<HTMLDivElement>(null)
  const tilt = useTilt3d(8)

  useEffect(() => {
    if (logoRef.current) {
      animate(logoRef.current, {
        scale: [0.5, 1],
        opacity: [0, 1],
        rotate: ['-25deg', '0deg'],
        duration: 900,
        ease: 'outElastic(1, .6)',
      })
    }
  }, [])

  if (user) {
    const dest = (location.state as { from?: string })?.from ?? '/caixa'
    return <Navigate to={dest} replace />
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const { error } = await signIn(email.trim(), password)
    if (error) toast.error('Falha no login', { description: error })
    else toast.success('Login realizado')
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-slate-950">
      {/* Fallback gradiente (offline) */}
      <div className="absolute inset-0 z-0 bg-gradient-to-br from-slate-950 via-[#140d06] to-black" />
      {/* Vídeo de fundo */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 z-0 h-full w-full object-cover opacity-70"
      >
        <source src={VIDEO_URL} type="video/mp4" />
      </video>
      {/* Aurora animada + overlay de legibilidade */}
      <div className="aurora absolute inset-0 z-10 opacity-70 mix-blend-screen" />
      <div className="absolute inset-0 z-10 bg-gradient-to-t from-black/85 via-black/45 to-black/65" />

      {/* Card de login */}
      <div className="relative z-20 flex h-full items-center justify-center p-6">
        <motion.div variants={fadeUp} initial="hidden" animate="show" className="w-full max-w-sm">
          <div
            onPointerMove={tilt.onPointerMove}
            onPointerLeave={tilt.onPointerLeave}
            style={tilt.style}
            className="glass rounded-2xl p-8"
          >
            <motion.form
              onSubmit={onSubmit}
              variants={staggerContainer}
              initial="hidden"
              animate="show"
            >
              <motion.div variants={staggerItem} className="mb-6 flex items-center gap-3">
                <div
                  ref={logoRef}
                  className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 text-lg font-black text-white shadow-lg shadow-amber-500/40"
                >
                  M
                </div>
                <div>
                  <h1 className="text-2xl font-extrabold tracking-tight text-white">
                    <BlurText text="MinasCaixa" />
                  </h1>
                  <p className="text-xs text-amber-200/70">
                    <BlurText text="Livro Caixa — Minas Auto Peças" delay={0.3} step={0.03} />
                  </p>
                </div>
              </motion.div>

              <motion.label variants={staggerItem} className="mb-2 block text-sm font-medium text-slate-200">
                Email
              </motion.label>
              <motion.input
                variants={staggerItem}
                ref={emailRef}
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="glass-input mb-4 w-full rounded-lg px-3 py-2.5 text-sm"
              />

              <motion.label variants={staggerItem} className="mb-2 block text-sm font-medium text-slate-200">
                Senha
              </motion.label>
              <motion.input
                variants={staggerItem}
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="glass-input mb-6 w-full rounded-lg px-3 py-2.5 text-sm"
              />

              <motion.button
                variants={staggerItem}
                type="submit"
                disabled={loading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 px-3 py-2.5 text-sm font-semibold text-white shadow-lg shadow-amber-600/30 transition hover:brightness-110 disabled:opacity-50"
              >
                {loading ? 'Entrando…' : 'Entrar'}
              </motion.button>
            </motion.form>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
