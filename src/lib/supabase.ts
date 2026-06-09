import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

// Projeto Supabase do MinasCaixa. A anon key é PUBLISHABLE (client-side):
// já é embarcada em qualquer bundle do navegador e o acesso é protegido por RLS.
// Servem de fallback quando as env vars não estão definidas no build (ex.: deploy
// Vercel sem variáveis configuradas). Para apontar pra outro projeto, defina
// VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY no .env (têm prioridade).
const FALLBACK_URL = 'https://mwyzixmpmjpbfuhvkyhi.supabase.co'
const FALLBACK_ANON =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13eXppeG1wbWpwYmZ1aHZreWhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4OTkzNTEsImV4cCI6MjA5NTQ3NTM1MX0.Cs3_vCaEU7dLAEop_9LCHkfTEFQ-ZuCNwiuHwzdsUuU'

const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || FALLBACK_URL
const anon = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) || FALLBACK_ANON

export const supabase = createClient<Database>(url, anon, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
  realtime: {
    params: { eventsPerSecond: 5 },
  },
})

export type SupabaseClient = typeof supabase
