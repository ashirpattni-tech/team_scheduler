import { useState } from 'react'
import { Header } from '../components/Layout'
import { Button } from '../components/ui'
import { BellIcon } from '../components/icons'
import { useApp } from '../app/context'
import { useReminderPrefs, useReminderMutation } from '../data/hooks'
import {
  enablePushNotifications,
  isIos,
  isStandalone,
  notificationsSupported,
} from '../lib/push'
import { resetLocal } from '../data/local'

const LEAD_OPTIONS = [
  { value: 30, label: '30 min before' },
  { value: 60, label: '1 hour before' },
  { value: 120, label: '2 hours before' },
  { value: 1440, label: '1 day before' },
]

export function SettingsPage() {
  const { mode, household, user, signOut } = useApp()
  const { data: prefs } = useReminderPrefs()
  const savePrefs = useReminderMutation()
  const [pushStatus, setPushStatus] = useState<string | null>(null)

  async function handleEnablePush() {
    if (!household) return
    const result = await enablePushNotifications(household.id)
    const messages: Record<string, string> = {
      subscribed: 'Notifications are on for this device. 🎉',
      denied: 'Notifications were blocked. Enable them in your browser settings.',
      unsupported: "This browser doesn't support push notifications.",
      'no-backend':
        'Permission granted. Connect the cloud backend (Supabase + VAPID key) to deliver reminders in the background.',
    }
    setPushStatus(messages[result])
  }

  const iosNeedsInstall = isIos() && !isStandalone()

  return (
    <>
      <Header title="Settings" />

      <div className="space-y-6 px-5 py-4">
        {/* Reminders */}
        <Section title="Reminders">
          <label className="mb-3 flex items-center justify-between">
            <span className="text-[15px] text-slate-700">Send reminders</span>
            <Toggle
              checked={prefs?.enabled ?? true}
              onChange={(enabled) =>
                prefs && savePrefs.mutate({ ...prefs, enabled })
              }
            />
          </label>
          <div className="text-sm font-semibold text-slate-700">
            Default reminder time
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {LEAD_OPTIONS.map((o) => (
              <button
                key={o.value}
                onClick={() =>
                  prefs &&
                  savePrefs.mutate({ ...prefs, default_minutes: o.value })
                }
                className={
                  'rounded-xl border py-2 text-sm font-semibold transition ' +
                  ((prefs?.default_minutes ?? 60) === o.value
                    ? 'border-brand bg-brand/10 text-brand'
                    : 'border-slate-200 bg-slate-50 text-slate-600')
                }
              >
                {o.label}
              </button>
            ))}
          </div>
        </Section>

        {/* Notifications */}
        <Section title="Notifications on this device">
          {iosNeedsInstall && (
            <p className="mb-3 rounded-xl bg-amber-50 px-4 py-3 text-xs text-amber-700">
              On iPhone, add this app to your Home Screen first (Share →{' '}
              <b>Add to Home Screen</b>), then open it from there to enable
              notifications.
            </p>
          )}
          <Button
            variant="subtle"
            onClick={handleEnablePush}
            disabled={!notificationsSupported()}
            className="w-full"
          >
            <BellIcon width={18} height={18} />
            Enable notifications
          </Button>
          {pushStatus && (
            <p className="mt-2 text-xs text-slate-500">{pushStatus}</p>
          )}
        </Section>

        {/* Sharing */}
        <Section title="Sharing">
          {mode === 'supabase' ? (
            <>
              <p className="text-sm text-slate-600">
                Share this code with your co-parent so they can join{' '}
                <b>{household?.name}</b> and see the same schedule:
              </p>
              <div className="mt-2 rounded-xl bg-slate-100 px-4 py-3 text-center text-2xl font-extrabold tracking-widest text-slate-800">
                {household?.invite_code}
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-600">
              You're in <b>local mode</b> — data lives only on this device. To
              share the schedule with a co-parent across phones, connect the
              cloud backend (see the README). Your invite code will be{' '}
              <b>{household?.invite_code}</b>.
            </p>
          )}
        </Section>

        {/* Account */}
        <Section title="Account">
          <div className="mb-3 text-sm text-slate-500">
            {mode === 'supabase'
              ? `Signed in as ${user?.email ?? user?.name}`
              : `Local profile: ${user?.name}`}
          </div>
          {mode === 'supabase' ? (
            <Button variant="ghost" onClick={signOut} className="w-full">
              Sign out
            </Button>
          ) : (
            <Button
              variant="danger"
              onClick={() => {
                if (
                  confirm(
                    'Reset wipes all local data on this device. Continue?',
                  )
                ) {
                  resetLocal()
                  location.reload()
                }
              }}
              className="w-full"
            >
              Reset local data
            </Button>
          )}
        </Section>

        <p className="pb-4 text-center text-xs text-slate-400">
          Team Scheduler · {mode === 'supabase' ? 'Cloud sync' : 'Local mode'}
        </p>
      </div>
    </>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
      <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">
        {title}
      </h2>
      {children}
    </section>
  )
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={
        'relative h-7 w-12 rounded-full transition ' +
        (checked ? 'bg-brand' : 'bg-slate-300')
      }
    >
      <span
        className={
          'absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition ' +
          (checked ? 'left-[22px]' : 'left-0.5')
        }
      />
    </button>
  )
}
