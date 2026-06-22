// Runtime configuration. The app runs in one of two modes:
//
//   - "local"    : no backend. All data is stored in this browser (localStorage).
//                  Great for trying the app instantly and for offline single-device
//                  use. Sharing across devices is NOT available in this mode.
//
//   - "supabase" : cloud backend with accounts, realtime sync and co-parent
//                  sharing. Enabled automatically once the two env vars below are
//                  present (see .env.example).

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabaseConfig =
  url && anonKey ? { url, anonKey } : null

export type AppMode = 'local' | 'supabase'

export const appMode: AppMode = supabaseConfig ? 'supabase' : 'local'

export const isCloud = appMode === 'supabase'
