import type {
  CalendarSource,
  Child,
  Household,
  NewChild,
  NewEvent,
  NewSource,
  ReminderPrefs,
  SportEvent,
} from '../lib/types'

/**
 * Backend-agnostic data access. Implemented twice:
 *   - LocalDataStore     (localStorage, single device)
 *   - SupabaseDataStore  (Postgres + realtime, shared)
 *
 * The UI only ever talks to this interface, so adding sources / swapping
 * backends never touches the screens.
 */
export interface DataStore {
  readonly household: Household

  // children
  listChildren(): Promise<Child[]>
  createChild(input: NewChild): Promise<Child>
  updateChild(id: string, patch: Partial<NewChild>): Promise<Child>
  deleteChild(id: string): Promise<void>

  // events
  listEvents(): Promise<SportEvent[]>
  createEvent(input: NewEvent): Promise<SportEvent>
  updateEvent(id: string, patch: Partial<NewEvent>): Promise<SportEvent>
  deleteEvent(id: string): Promise<void>

  // calendar sources (TeamSnap / generic .ics)
  listSources(): Promise<CalendarSource[]>
  createSource(input: NewSource): Promise<CalendarSource>
  deleteSource(id: string): Promise<void>
  /** Pull events from a source's feed now. Returns number of events upserted. */
  syncSource(id: string): Promise<number>

  // reminder preferences
  getReminderPrefs(): Promise<ReminderPrefs>
  setReminderPrefs(prefs: ReminderPrefs): Promise<void>

  /** Subscribe to data changes (realtime in cloud, cross-tab locally). */
  subscribe(onChange: () => void): () => void
}

export const DEFAULT_REMINDER_PREFS: ReminderPrefs = {
  default_minutes: 60,
  enabled: true,
}
