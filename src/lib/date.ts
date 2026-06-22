import {
  format,
  isToday,
  isTomorrow,
  isYesterday,
  isThisWeek,
  startOfDay,
  parseISO,
} from 'date-fns'
import type { SportEvent } from './types'

export function toDate(iso: string): Date {
  return parseISO(iso)
}

/** "Today", "Tomorrow", "Sat, Jun 27" — a friendly day label. */
export function dayHeading(iso: string): string {
  const d = toDate(iso)
  if (isToday(d)) return 'Today'
  if (isTomorrow(d)) return 'Tomorrow'
  if (isYesterday(d)) return 'Yesterday'
  return format(d, 'EEE, MMM d')
}

export function dayKey(iso: string): string {
  return format(startOfDay(toDate(iso)), 'yyyy-MM-dd')
}

export function timeLabel(iso: string): string {
  return format(toDate(iso), 'h:mm a')
}

export function timeRange(start: string, end: string | null): string {
  if (!end) return timeLabel(start)
  return `${timeLabel(start)} – ${timeLabel(end)}`
}

export function isUpcoming(ev: SportEvent): boolean {
  return toDate(ev.ends_at ?? ev.starts_at).getTime() >= Date.now()
}

export function withinThisWeek(iso: string): boolean {
  return isThisWeek(toDate(iso), { weekStartsOn: 1 })
}

/** Group a sorted list of events into day buckets, preserving order. */
export function groupByDay(events: SportEvent[]): Array<{
  key: string
  heading: string
  events: SportEvent[]
}> {
  const buckets = new Map<string, SportEvent[]>()
  for (const ev of events) {
    const k = dayKey(ev.starts_at)
    if (!buckets.has(k)) buckets.set(k, [])
    buckets.get(k)!.push(ev)
  }
  return [...buckets.entries()].map(([key, evs]) => ({
    key,
    heading: dayHeading(evs[0].starts_at),
    events: evs,
  }))
}

/** Combine a yyyy-MM-dd date and HH:mm time string into an ISO datetime. */
export function combineDateTime(dateStr: string, timeStr: string): string {
  // Interpreted in the user's local timezone, then serialized to ISO/UTC.
  const [y, m, d] = dateStr.split('-').map(Number)
  const [hh, mm] = timeStr.split(':').map(Number)
  return new Date(y, m - 1, d, hh, mm).toISOString()
}

export function dateInputValue(iso: string): string {
  return format(toDate(iso), 'yyyy-MM-dd')
}

export function timeInputValue(iso: string): string {
  return format(toDate(iso), 'HH:mm')
}
