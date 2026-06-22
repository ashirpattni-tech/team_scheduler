import { useState } from 'react'
import { Button, Field, TextInput } from '../components/ui'
import { BallIcon } from '../components/icons'
import { useApp } from '../app/context'
import { createLocalHousehold } from '../data/local'
import { supabase } from '../lib/supabase'

function Shell({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: React.ReactNode
}) {
  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col justify-center px-6 py-12">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand text-white shadow-lg shadow-brand/30">
          <BallIcon width={32} height={32} />
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900">{title}</h1>
        <p className="mt-1 text-slate-500">{subtitle}</p>
      </div>
      {children}
    </div>
  )
}

/** Local mode first-run: collect a name + family name, no account needed. */
export function LocalSetupPage() {
  const { refresh } = useApp()
  const [name, setName] = useState('')
  const [family, setFamily] = useState('')

  return (
    <Shell
      title="Team Scheduler"
      subtitle="One place for every child's games & practices"
    >
      <Field label="Your name">
        <TextInput
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Alex"
          autoFocus
        />
      </Field>
      <Field label="Family name" hint="Just a label, e.g. “The Patels”">
        <TextInput
          value={family}
          onChange={(e) => setFamily(e.target.value)}
          placeholder="The Smiths"
        />
      </Field>
      <Button
        className="mt-2 w-full"
        disabled={!name.trim() || !family.trim()}
        onClick={() => {
          createLocalHousehold(name.trim(), family.trim())
          refresh()
        }}
      >
        Get started
      </Button>
      <p className="mt-4 text-center text-xs text-slate-400">
        Runs entirely on this device. Add cloud sync later to share with a
        co-parent.
      </p>
    </Shell>
  )
}

/** Cloud mode: magic-link sign in. */
export function LoginPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function send() {
    if (!supabase) return
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    })
    setLoading(false)
    if (error) setError(error.message)
    else setSent(true)
  }

  return (
    <Shell title="Welcome back" subtitle="Sign in to your family schedule">
      {sent ? (
        <div className="rounded-2xl bg-brand/5 p-6 text-center">
          <p className="font-semibold text-slate-800">Check your email 📬</p>
          <p className="mt-1 text-sm text-slate-500">
            We sent a magic sign-in link to <b>{email}</b>. Open it on this
            device.
          </p>
        </div>
      ) : (
        <>
          <Field label="Email">
            <TextInput
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoCapitalize="off"
              autoFocus
            />
          </Field>
          {error && <p className="mb-3 text-sm text-red-500">{error}</p>}
          <Button
            className="w-full"
            disabled={!email.includes('@') || loading}
            onClick={send}
          >
            {loading ? 'Sending…' : 'Email me a sign-in link'}
          </Button>
        </>
      )}
    </Shell>
  )
}

/** Cloud mode: signed in but no household — create or join one. */
export function HouseholdSetupPage() {
  const { refresh, user } = useApp()
  const [tab, setTab] = useState<'create' | 'join'>('create')
  const [familyName, setFamilyName] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function createHousehold() {
    if (!supabase) return
    setLoading(true)
    setError(null)
    const { error } = await supabase.rpc('create_household', {
      p_name: familyName.trim(),
      p_display_name: user?.name ?? null,
    })
    setLoading(false)
    if (error) setError(error.message)
    else refresh()
  }

  async function joinHousehold() {
    if (!supabase) return
    setLoading(true)
    setError(null)
    const { error } = await supabase.rpc('join_household', {
      p_code: code.trim().toUpperCase(),
    })
    setLoading(false)
    if (error) setError(error.message)
    else refresh()
  }

  return (
    <Shell title="Set up your family" subtitle="Create a household or join one">
      <div className="mb-5 flex rounded-xl bg-slate-100 p-1">
        {(['create', 'join'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={
              'flex-1 rounded-lg py-2 text-sm font-semibold transition ' +
              (tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500')
            }
          >
            {t === 'create' ? 'Create new' : 'Join existing'}
          </button>
        ))}
      </div>

      {error && <p className="mb-3 text-sm text-red-500">{error}</p>}

      {tab === 'create' ? (
        <>
          <Field label="Family name">
            <TextInput
              value={familyName}
              onChange={(e) => setFamilyName(e.target.value)}
              placeholder="The Smiths"
              autoFocus
            />
          </Field>
          <Button
            className="w-full"
            disabled={!familyName.trim() || loading}
            onClick={createHousehold}
          >
            {loading ? 'Creating…' : 'Create household'}
          </Button>
        </>
      ) : (
        <>
          <Field label="Invite code" hint="Ask your co-parent for the code from their Settings">
            <TextInput
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="TEAM-XXXX"
              autoCapitalize="characters"
              autoFocus
            />
          </Field>
          <Button
            className="w-full"
            disabled={code.trim().length < 4 || loading}
            onClick={joinHousehold}
          >
            {loading ? 'Joining…' : 'Join household'}
          </Button>
        </>
      )}
    </Shell>
  )
}
