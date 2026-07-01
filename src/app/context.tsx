import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { DataStore } from '../data/store'
import {
  LocalDataStore,
  getLocalDisplayName,
  hasLocalHousehold,
} from '../data/local'
import type { Household } from '../lib/types'

export type AppStatus = 'loading' | 'needs-setup' | 'ready'

interface AppValue {
  status: AppStatus
  displayName: string
  store: DataStore | null
  household: Household | null
  refresh: () => void
}

const AppContext = createContext<AppValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AppStatus>('loading')
  const [store, setStore] = useState<DataStore | null>(null)
  const [version, setVersion] = useState(0)

  const refresh = useCallback(() => setVersion((v) => v + 1), [])

  useEffect(() => {
    if (!hasLocalHousehold()) {
      setStatus('needs-setup')
      setStore(null)
      return
    }
    setStore(new LocalDataStore())
    setStatus('ready')
  }, [version])

  const value = useMemo<AppValue>(
    () => ({
      status,
      displayName: getLocalDisplayName(),
      store,
      household: store?.household ?? null,
      refresh,
    }),
    [status, store, refresh],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp(): AppValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}

export function useStore(): DataStore {
  const { store } = useApp()
  if (!store) throw new Error('Store not ready')
  return store
}
