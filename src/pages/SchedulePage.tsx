import { useMemo, useState } from 'react'
import { Header } from '../components/Layout'
import { ChildFilter } from '../components/ChildFilter'
import { EventCard } from '../components/EventCard'
import { EventDetail } from '../components/EventDetail'
import { EventForm } from '../components/EventForm'
import { Button, EmptyState } from '../components/ui'
import { CalendarIcon, PlusIcon } from '../components/icons'
import {
  useChildren,
  useEvents,
  useEventMutations,
} from '../data/hooks'
import { useApp } from '../app/context'
import { groupByDay, isUpcoming, toDate, withinThisWeek } from '../lib/date'
import type { NewEvent, SportEvent } from '../lib/types'
import { classNames } from '../lib/util'

type Segment = 'upcoming' | 'week' | 'past'

const SEGMENTS: { id: Segment; label: string }[] = [
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'week', label: 'This week' },
  { id: 'past', label: 'Past' },
]

export function SchedulePage() {
  const { displayName } = useApp()
  const { data: children = [] } = useChildren()
  const { data: events = [] } = useEvents()
  const { create, update, remove } = useEventMutations()

  const [childFilter, setChildFilter] = useState<string | null>(null)
  const [segment, setSegment] = useState<Segment>('upcoming')
  const [detail, setDetail] = useState<SportEvent | null>(null)
  const [editing, setEditing] = useState<SportEvent | null>(null)
  const [creating, setCreating] = useState(false)

  const childMap = useMemo(
    () => new Map(children.map((c) => [c.id, c])),
    [children],
  )

  const filtered = useMemo(() => {
    let list = events
    if (childFilter) list = list.filter((e) => e.child_id === childFilter)
    if (segment === 'upcoming') list = list.filter(isUpcoming)
    else if (segment === 'week')
      list = list.filter((e) => withinThisWeek(e.starts_at))
    else
      list = list
        .filter((e) => !isUpcoming(e))
        .sort((a, b) => b.starts_at.localeCompare(a.starts_at))
    return list
  }, [events, childFilter, segment])

  const groups = useMemo(() => groupByDay(filtered), [filtered])

  function submitEvent(input: NewEvent) {
    if (editing) {
      update.mutate({ id: editing.id, patch: input })
    } else {
      create.mutate(input)
    }
    setEditing(null)
    setCreating(false)
  }

  const formOpen = creating || !!editing

  return (
    <>
      <Header
        title="Schedule"
        subtitle={
          children.length
            ? `${children.length} ${children.length === 1 ? 'child' : 'children'}`
            : 'Add your children to begin'
        }
        action={
          <Button
            onClick={() => setCreating(true)}
            className="!px-3 !py-2"
            disabled={children.length === 0}
          >
            <PlusIcon width={18} height={18} />
            Add
          </Button>
        }
      />

      <ChildFilter
        children={children}
        selected={childFilter}
        onSelect={setChildFilter}
      />

      <div className="px-5">
        <div className="flex rounded-xl bg-slate-100 p-1">
          {SEGMENTS.map((s) => (
            <button
              key={s.id}
              onClick={() => setSegment(s.id)}
              className={classNames(
                'flex-1 rounded-lg py-1.5 text-sm font-semibold transition',
                segment === s.id
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500',
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {children.length === 0 ? (
        <EmptyState
          icon={<CalendarIcon width={28} height={28} />}
          title="No children yet"
        >
          Head to the Children tab to add your kids, then their games and
          practices will show up here.
        </EmptyState>
      ) : groups.length === 0 ? (
        <EmptyState
          icon={<CalendarIcon width={28} height={28} />}
          title={
            segment === 'past' ? 'Nothing in the past' : 'Nothing scheduled'
          }
        >
          {segment === 'past'
            ? 'Past events will appear here once they happen.'
            : 'Tap “Add” to create a game or practice, or import a team calendar from the Imports tab.'}
        </EmptyState>
      ) : (
        <div className="space-y-5 px-5 py-4">
          {groups.map((g) => (
            <section key={g.key}>
              <h2 className="mb-2 px-1 text-sm font-bold text-slate-500">
                {g.heading}
                <span className="ml-2 font-normal text-slate-400">
                  {toDateLabel(g.events[0].starts_at)}
                </span>
              </h2>
              <div className="space-y-2">
                {g.events.map((ev) => (
                  <EventCard
                    key={ev.id}
                    event={ev}
                    child={childMap.get(ev.child_id)}
                    onClick={() => setDetail(ev)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <EventDetail
        open={!!detail && !formOpen}
        onClose={() => setDetail(null)}
        event={detail}
        child={detail ? childMap.get(detail.child_id) : undefined}
        onEdit={() => {
          setEditing(detail)
          setDetail(null)
        }}
      />

      {/* Mounted only while open so fields initialize fresh each time. */}
      {formOpen && (
        <EventForm
          open
          onClose={() => {
            setEditing(null)
            setCreating(false)
          }}
          children={children}
          event={editing}
          defaultChildId={childFilter}
          defaultDriver={displayName}
          onSubmit={submitEvent}
          onDelete={
            editing
              ? () => {
                  remove.mutate(editing.id)
                  setEditing(null)
                }
              : undefined
          }
        />
      )}
    </>
  )
}

function toDateLabel(iso: string): string {
  return toDate(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}
