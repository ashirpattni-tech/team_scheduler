import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { classNames } from '../lib/util'
import { CalendarIcon, UsersIcon, SyncIcon, SettingsIcon, CloseIcon } from './icons'
import type { ReactNode } from 'react'
import { useInstallPrompt } from '../hooks/useInstallPrompt'

const tabs = [
  { to: '/', label: 'Schedule', Icon: CalendarIcon, end: true },
  { to: '/children', label: 'Children', Icon: UsersIcon },
  { to: '/sources', label: 'Imports', Icon: SyncIcon },
  { to: '/settings', label: 'Settings', Icon: SettingsIcon },
]

export function Layout() {
  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col bg-slate-50">
      <InstallBanner />
      <main className="flex-1 pb-24">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md border-t border-slate-200 bg-white/95 backdrop-blur pb-safe">
        <div className="grid grid-cols-4">
          {tabs.map(({ to, label, Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                classNames(
                  'flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition',
                  isActive ? 'text-brand' : 'text-slate-400',
                )
              }
            >
              <Icon width={22} height={22} />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}

function InstallBanner() {
  const { state, install } = useInstallPrompt()
  const [dismissed, setDismissed] = useState(false)

  if (dismissed || state === 'installed' || state === 'unsupported') return null

  return (
    <div className="sticky top-0 z-40 mx-auto w-full max-w-md bg-brand px-4 py-3 text-white shadow-md">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          {state === 'android' ? (
            <>
              <p className="text-sm font-semibold">Install Team Scheduler</p>
              <p className="text-xs text-blue-100">Add to your home screen for quick access</p>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold">Add to Home Screen</p>
              <p className="text-xs text-blue-100">
                Tap the <span className="font-bold">Share</span> icon below, then{' '}
                <span className="font-bold">Add to Home Screen</span>
              </p>
            </>
          )}
        </div>

        {state === 'android' && (
          <button
            onClick={install}
            className="shrink-0 rounded-lg bg-white px-3 py-1.5 text-sm font-bold text-brand"
          >
            Install
          </button>
        )}

        <button
          onClick={() => setDismissed(true)}
          className="shrink-0 rounded-full p-1 text-white/70 hover:bg-white/20"
          aria-label="Dismiss"
        >
          <CloseIcon width={18} height={18} />
        </button>
      </div>
    </div>
  )
}

export function Header({
  title,
  subtitle,
  action,
}: {
  title: string
  subtitle?: string
  action?: ReactNode
}) {
  return (
    <header className="sticky top-0 z-20 flex items-end justify-between border-b border-slate-100 bg-slate-50/95 px-5 pb-3 pt-safe backdrop-blur">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
          {title}
        </h1>
        {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </header>
  )
}
