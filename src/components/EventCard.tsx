import type { Child, EventKind, SportEvent } from '../lib/types'
import { timeRange } from '../lib/date'
import { BallIcon, WhistleIcon, StarIcon, PinIcon, ClockIcon } from './icons'

function KindIcon({ kind }: { kind: EventKind }) {
  if (kind === 'game') return <BallIcon width={16} height={16} />
  if (kind === 'practice') return <WhistleIcon width={16} height={16} />
  return <StarIcon width={16} height={16} />
}

const kindLabel: Record<EventKind, string> = {
  game: 'Game',
  practice: 'Practice',
  event: 'Event',
}

export function EventCard({
  event,
  child,
  onClick,
}: {
  event: SportEvent
  child?: Child
  onClick: () => void
}) {
  const color = child?.color ?? '#94a3b8'
  return (
    <button
      onClick={onClick}
      className="flex w-full items-stretch gap-3 rounded-2xl bg-white p-3 text-left shadow-sm ring-1 ring-slate-100 transition active:scale-[.99]"
    >
      <div
        className="w-1.5 shrink-0 rounded-full"
        style={{ background: color }}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide"
            style={{ background: `${color}1a`, color }}
          >
            <KindIcon kind={event.kind} />
            {kindLabel[event.kind]}
          </span>
          {child && (
            <span className="truncate text-xs font-semibold text-slate-500">
              {child.name}
            </span>
          )}
        </div>
        <h3 className="mt-1 truncate text-[15px] font-bold text-slate-900">
          {event.title}
        </h3>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1">
            <ClockIcon width={13} height={13} />
            {event.all_day ? 'All day' : timeRange(event.starts_at, event.ends_at)}
          </span>
          {event.location && (
            <span className="inline-flex items-center gap-1 truncate">
              <PinIcon width={13} height={13} />
              <span className="truncate">{event.location}</span>
            </span>
          )}
        </div>
      </div>
    </button>
  )
}
