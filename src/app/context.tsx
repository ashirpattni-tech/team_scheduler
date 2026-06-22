import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { appMode, type AppMode } from '../lib/config'
import { supabase } from '../lib/supabase'
import type { DataStore } from '../data/store'
import {
  LocalDataStore,
  getLocalDisplayName,
  hasLocalHousehold,
} from '../data/local'
import { SupabaseDataStore } from '../data/supabase'
import type { Household } from '../lib/types'

export type AppStatus =
  | 'loading'
  | 'needs-auth' // cloud: not signed in
  | 'needs-household' // cloud: signed in but no household yet
  | 'needs-local-setup' // local: first run
  | 'ready'

interface AppUser {
  id: string
  email: string | null
  name: string
}

interface AppValue {
  mode: AppMode
  status: AppStatus
  user: AppUser | null
  store: DataStore | null
  household: Household | null
  displayName: string
  signOut: () => Promise<void>
  /** Re-resolve household/store after onboarding completes. */
  refresh: () => void
}

const AppContext = createContext<AppValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AppStatus>('loading')
  const [user, setUser] = useState<AppUser | null>(null)
  const [store, setStore] = useState<DataStore | null>(null)
  const [version, setVersion] = useState(0)

  const refresh = useCallback(() => setVersion((v) => v + 1), [])

  // ---- LOCAL MODE ------------------------------------------------------
  useEffect(() => {
    if (appMode !== 'local') return
    if (!hasLocalHousehold()) {
      setStatus('needs-local-setup')
      setStore(null)
      setUser(null)
      return
    }
    const s = new LocalDataStore()
    const name = getLocalDisplayName()
    setStore(s)
    setUser({ id: 'local-user', email: null, name })
    setStatus('ready')
  }, [version])

  // ---- CLOUD MODE ------------------------------------------------------
  useEffect(() => {
    if (appMode !== 'supabase' || !supabase) return
    let cancelled = false

    async function resolve() {
      const { data } = await supabase!.auth.getSession()
      const session = data.session
      if (cancelled) return

      if (!session) {
        setUser(null)
        setStore(null)
        setStatus('needs-auth')
        return
      }

      const u = session.user
      const name =
        (u.user_metadata?.display_name as string | undefined) ??
        u.email?.split('@')[0] ??
        'Parent'
      setUser({ id: u.id, email: u.email ?? null, name })

      // Find this user's household (RLS restricts to their memberships).
      const { data: memberships, error } = await supabase!
        .from('household_members')
        .select('household:households(*)')
        .limit(1)
      if (cancelled) return

      const household = (memberships?.[0] as { household: Household } | undefined)
        ?.household
      if (error || !household) {
        setStore(null)
        setStatus('needs-household')
        return
      }
      setStore(new SupabaseDataStore(supabase!, household))
      setStatus('ready')
    }

    resolve()
    const { data: sub } = supabase.auth.onAuthStateChange(() => resolve())
    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
    }
  }, [version])

  const signOut = useCallback(async () => {
    if (appMode === 'supabase' && supabase) {
      await supabase.auth.signOut()
    }
    refresh()
  }, [refresh])

  const value = useMemo<AppValue>(
    () => ({
      mode: appMode,
      status,
      user,
      store,
      household: store?.household ?? null,
      displayName: user?.name ?? '',
      signOut,
      refresh,
    }),
    [status, user, store, signOut, refresh],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp(): AppValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}

/** Convenience: the store, asserted present (use only on ready screens). */
export function useStore(): DataStore {
  const { store } = useApp()
  if (!store) throw new Error('Store not ready')
  return store
}
