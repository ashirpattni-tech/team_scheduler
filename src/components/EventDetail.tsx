import type { Child, SportEvent } from '../lib/types'
import { Button, Sheet } from './ui'
import { dayHeading, timeLabel, timeRange } from '../lib/date'
import { mapsUrl } from '../lib/util'
import {
  ClockIcon,
  PinIcon,
  EditIcon,
  BallIcon,
  WhistleIcon,
  StarIcon,
} from './icons'
import type { ReactNode } from 'react'

function Row({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex gap-3 py-2.5">
      <div className="mt-0.5 text-slate-400">{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          {label}
        </div>
        <div className="text-[15px] text-slate-800">{children}</div>
      </div>
    </div>
  )
}

export function EventDetail({
  open,
  onClose,
  event,
  child,
  onEdit,
}: {
  open: boolean
  onClose: () => void
  event: SportEvent | null
  child?: Child
  onEdit: () => void
}) {
  if (!event) return null
  const color = child?.color ?? '#94a3b8'
  const KindIcon =
    event.kind === 'game' ? BallIcon : event.kind === 'practice' ? WhistleIcon : StarIcon

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Event"
      footer={
        <Button onClick={onEdit} className="w-full" variant="subtle">
          <EditIcon width={18} height={18} />
          Edit event
        </Button>
      }
    >
      <div className="mb-4 flex items-start gap-3">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white"
          style={{ background: color }}
        >
          <KindIcon width={22} height={22} />
        </div>
        <div className="min-w-0">
          <h3 className="text-xl font-extrabold leading-tight text-slate-900">
            {event.title}
          </h3>
          {child && (
            <span className="text-sm font-semibold" style={{ color }}>
              {child.name}
            </span>
          )}
        </div>
      </div>

      <div className="divide-y divide-slate-100">
        <Row icon={<ClockIcon width={18} height={18} />} label="When">
          {dayHeading(event.starts_at)} ·{' '}
          {event.all_day ? 'All day' : timeRange(event.starts_at, event.ends_at)}
        </Row>

        {event.location && (
          <Row icon={<PinIcon width={18} height={18} />} label="Where">
            <a
              href={event.location_url ?? mapsUrl(event.location)}
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-brand underline-offset-2 hover:underline"
            >
              {event.location}
            </a>
          </Row>
        )}

        {event.opponent && (
          <Row icon={<BallIcon width={18} height={18} />} label="Opponent">
            {event.opponent}
          </Row>
        )}

        {event.arrival_time && (
          <Row icon={<ClockIcon width={18} height={18} />} label="Arrive by">
            {timeLabel(event.arrival_time)}
          </Row>
        )}

        {event.what_to_bring && (
          <Row icon={<StarIcon width={18} height={18} />} label="Bring">
            {event.what_to_bring}
          </Row>
        )}

        {event.uniform_color && (
          <Row icon={<StarIcon width={18} height={18} />} label="Uniform">
            {event.uniform_color}
          </Row>
        )}

        {event.driver && (
          <Row icon={<StarIcon width={18} height={18} />} label="Driving">
            {event.driver}
          </Row>
        )}

        {event.notes && (
          <Row icon={<StarIcon width={18} height={18} />} label="Notes">
            <span className="whitespace-pre-wrap">{event.notes}</span>
          </Row>
        )}
      </div>

      {event.source_id && (
        <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-400">
          Imported from a calendar feed. Your logistics notes are kept on re-sync.
        </p>
      )}
    </Sheet>
  )
}
