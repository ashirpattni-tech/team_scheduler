import { useState } from 'react'
import type { Child, EventKind, NewEvent, SportEvent } from '../lib/types'
import { Button, Field, Select, Sheet, TextArea, TextInput } from './ui'
import {
  combineDateTime,
  dateInputValue,
  timeInputValue,
} from '../lib/date'

const KINDS: { value: EventKind; label: string }[] = [
  { value: 'game', label: '⚽ Game' },
  { value: 'practice', label: '🏃 Practice' },
  { value: 'event', label: '⭐ Other' },
]

interface Props {
  open: boolean
  onClose: () => void
  children: Child[]
  /** Existing event to edit, or null to create. */
  event: SportEvent | null
  /** Pre-selected child for new events. */
  defaultChildId?: string | null
  defaultDriver?: string
  onSubmit: (input: NewEvent) => void
  onDelete?: () => void
}

export function EventForm({
  open,
  onClose,
  children,
  event,
  defaultChildId,
  defaultDriver,
  onSubmit,
  onDelete,
}: Props) {
  const isEdit = !!event
  const now = new Date()
  const defaultDate = dateInputValue(
    event?.starts_at ?? now.toISOString(),
  )

  const [childId, setChildId] = useState(
    event?.child_id ?? defaultChildId ?? children[0]?.id ?? '',
  )
  const [kind, setKind] = useState<EventKind>(event?.kind ?? 'game')
  const [title, setTitle] = useState(event?.title ?? '')
  const [date, setDate] = useState(defaultDate)
  const [startTime, setStartTime] = useState(
    event ? timeInputValue(event.starts_at) : '17:00',
  )
  const [endTime, setEndTime] = useState(
    event?.ends_at ? timeInputValue(event.ends_at) : '',
  )
  const [location, setLocation] = useState(event?.location ?? '')
  const [opponent, setOpponent] = useState(event?.opponent ?? '')
  const [arrival, setArrival] = useState(
    event?.arrival_time ? timeInputValue(event.arrival_time) : '',
  )
  const [whatToBring, setWhatToBring] = useState(event?.what_to_bring ?? '')
  const [uniform, setUniform] = useState(event?.uniform_color ?? '')
  const [driver, setDriver] = useState(event?.driver ?? '')
  const [notes, setNotes] = useState(event?.notes ?? '')

  function handleSubmit() {
    if (!childId || !title.trim()) return
    const starts_at = combineDateTime(date, startTime)
    const input: NewEvent = {
      child_id: childId,
      source_id: event?.source_id ?? null,
      uid: event?.uid ?? null,
      title: title.trim(),
      kind,
      starts_at,
      ends_at: endTime ? combineDateTime(date, endTime) : null,
      all_day: false,
      location: location.trim() || null,
      location_url: null,
      opponent: opponent.trim() || null,
      home_away: null,
      arrival_time: arrival ? combineDateTime(date, arrival) : null,
      notes: notes.trim() || null,
      what_to_bring: whatToBring.trim() || null,
      uniform_color: uniform.trim() || null,
      driver: driver.trim() || null,
      reminder_minutes: event?.reminder_minutes ?? null,
    }
    onSubmit(input)
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit event' : 'New event'}
      footer={
        <div className="flex gap-2">
          {isEdit && onDelete && (
            <Button variant="danger" onClick={onDelete} className="px-3">
              Delete
            </Button>
          )}
          <Button
            onClick={handleSubmit}
            disabled={!childId || !title.trim()}
            className="flex-1"
          >
            {isEdit ? 'Save changes' : 'Add event'}
          </Button>
        </div>
      }
    >
      <Field label="Child">
        <Select value={childId} onChange={(e) => setChildId(e.target.value)}>
          {children.length === 0 && <option value="">Add a child first</option>}
          {children.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Type">
        <div className="grid grid-cols-3 gap-2">
          {KINDS.map((k) => (
            <button
              key={k.value}
              onClick={() => setKind(k.value)}
              className={
                'rounded-xl border py-2 text-sm font-semibold transition ' +
                (kind === k.value
                  ? 'border-brand bg-brand/10 text-brand'
                  : 'border-slate-200 bg-slate-50 text-slate-600')
              }
            >
              {k.label}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Title">
        <TextInput
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={kind === 'game' ? 'e.g. League game vs Eagles' : 'e.g. Team practice'}
        />
      </Field>

      <Field label="Date">
        <TextInput
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Start time">
          <TextInput
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
        </Field>
        <Field label="End time">
          <TextInput
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
          />
        </Field>
      </div>

      <Field label="Location" hint="Address or place name — tap to open in Maps later">
        <TextInput
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="e.g. Riverside Park, Field 4"
        />
      </Field>

      {kind === 'game' && (
        <Field label="Opponent">
          <TextInput
            value={opponent}
            onChange={(e) => setOpponent(e.target.value)}
            placeholder="e.g. Eagles"
          />
        </Field>
      )}

      <div className="my-4 rounded-2xl bg-slate-50 p-4">
        <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">
          Logistics
        </p>
        <Field label="Arrival time" hint="When to be there (before start)">
          <TextInput
            type="time"
            value={arrival}
            onChange={(e) => setArrival(e.target.value)}
          />
        </Field>
        <Field label="What to bring">
          <TextInput
            value={whatToBring}
            onChange={(e) => setWhatToBring(e.target.value)}
            placeholder="e.g. cleats, water, shin guards"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Uniform">
            <TextInput
              value={uniform}
              onChange={(e) => setUniform(e.target.value)}
              placeholder="White kit"
            />
          </Field>
          <Field label="Who's driving">
            <TextInput
              value={driver}
              onChange={(e) => setDriver(e.target.value)}
              placeholder={defaultDriver || 'Name'}
            />
          </Field>
        </div>
      </div>

      <Field label="Notes">
        <TextArea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Anything else…"
        />
      </Field>
    </Sheet>
  )
}
