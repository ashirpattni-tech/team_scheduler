// Shared domain types used by both the local and Supabase data stores.

export type ID = string

export type EventKind = 'game' | 'practice' | 'event'
export type HomeAway = 'home' | 'away' | null
export type SourceType = 'ics_teamsnap' | 'ics_generic'

/** Palette offered when creating a child (value = tailwind-ish hex). */
export const CHILD_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // amber
  '#22c55e', // green
  '#14b8a6', // teal
  '#3b82f6', // blue
  '#6366f1', // indigo
  '#a855f7', // purple
  '#ec4899', // pink
] as const

export interface Household {
  id: ID
  name: string
  invite_code: string
  created_at: string
}

export interface Child {
  id: ID
  household_id: ID
  name: string
  color: string
  created_at: string
}

export interface CalendarSource {
  id: ID
  household_id: ID
  child_id: ID
  type: SourceType
  url: string
  team_name: string | null
  last_synced_at: string | null
  sync_error: string | null
  created_at: string
}

/**
 * A single calendar item. Manual + imported events share this shape.
 * Logistics fields live here in the app model; in Supabase they are stored in a
 * separate `event_logistics` table and merged in by the data store so a re-sync
 * of imported events never wipes family-entered logistics.
 */
export interface SportEvent {
  id: ID
  household_id: ID
  child_id: ID
  source_id: ID | null
  /** External iCal UID (for dedupe across re-syncs); null for manual events. */
  uid: string | null
  title: string
  kind: EventKind
  starts_at: string // ISO
  ends_at: string | null // ISO
  all_day: boolean
  location: string | null
  location_url: string | null
  opponent: string | null
  home_away: HomeAway
  /** ISO time the child should arrive (logistics). */
  arrival_time: string | null
  notes: string | null

  // ---- logistics (own table in Supabase) ----
  what_to_bring: string | null
  uniform_color: string | null
  driver: string | null
  /** Per-event reminder override in minutes before start; null = use default. */
  reminder_minutes: number | null

  created_at: string
  updated_at: string
}

export interface ReminderPrefs {
  /** Default minutes-before-start used when an event has no override. */
  default_minutes: number
  /** Master switch for sending reminders. */
  enabled: boolean
}

/** New-event input (store fills ids/timestamps). */
export type NewEvent = Omit<
  SportEvent,
  'id' | 'household_id' | 'created_at' | 'updated_at'
>

export type NewChild = Pick<Child, 'name' | 'color'>
export type NewSource = Pick<
  CalendarSource,
  'child_id' | 'type' | 'url' | 'team_name'
>
