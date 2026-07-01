import { NavLink, Outlet } from 'react-router-dom'
import { classNames } from '../lib/util'
import { CalendarIcon, UsersIcon, SyncIcon, SettingsIcon } from './icons'
import type { ReactNode } from 'react'

const tabs = [
  { to: '/', label: 'Schedule', Icon: CalendarIcon, end: true },
  { to: '/children', label: 'Children', Icon: UsersIcon },
  { to: '/sources', label: 'Imports', Icon: SyncIcon },
  { to: '/settings', label: 'Settings', Icon: SettingsIcon },
]

export function Layout() {
  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col bg-slate-50">
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
