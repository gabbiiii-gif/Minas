import { create } from 'zustand'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'

type Profile = Database['public']['Tables']['profiles']['Row']

interface AuthState {
  user: User | null
  session: Session | null
  profile: Profile | null
  loading: boolean
  initialized: boolean
  init: () => Promise<void>
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
  if (error) {
    console.error('[auth] fetchProfile falhou', error)
    return null
  }
  return data
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  profile: null,
  loading: true,
  initialized: false,

  init: async () => {
    if (get().initialized) return
    set({ loading: true })
    const { data } = await supabase.auth.getSession()
    const session = data.session
    const user = session?.user ?? null
    const profile = user ? await fetchProfile(user.id) : null
    set({ session, user, profile, loading: false, initialized: true })

    supabase.auth.onAuthStateChange(async (_event, newSession) => {
      const newUser = newSession?.user ?? null
      const newProfile = newUser ? await fetchProfile(newUser.id) : null
      set({ session: newSession, user: newUser, profile: newProfile, loading: false })
    })
  },

  signIn: async (email, password) => {
    set({ loading: true })
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    set({ loading: false })
    return { error: error?.message ?? null }
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null, session: null, profile: null })
  },
}))
