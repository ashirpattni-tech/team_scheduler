import type { DataStore } from './store'
import { DEFAULT_REMINDER_PREFS } from './store'
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
import { newId, newInviteCode, nowIso } from '../lib/util'
import { classifyKind, extractOpponent, parseIcs } from '../lib/ics'

const KEY = 'team-scheduler:v1'

interface Db {
  household: Household
  children: Child[]
  events: SportEvent[]
  sources: CalendarSource[]
  reminders: ReminderPrefs
  identity: { displayName: string }
}

function seed(displayName: string, householdName: string): Db {
  return {
    household: {
      id: newId(),
      name: householdName,
      invite_code: newInviteCode(),
      created_at: nowIso(),
    },
    children: [],
    events: [],
    sources: [],
    reminders: { ...DEFAULT_REMINDER_PREFS },
    identity: { displayName },
  }
}

function load(): Db | null {
  const raw = localStorage.getItem(KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as Db
  } catch {
    return null
  }
}

function save(db: Db) {
  localStorage.setItem(KEY, JSON.stringify(db))
  // notify other tabs + this tab
  window.dispatchEvent(new CustomEvent('team-scheduler:changed'))
}

/** Has the user finished local onboarding? */
export function hasLocalHousehold(): boolean {
  return load() !== null
}

export function createLocalHousehold(displayName: string, householdName: string) {
  save(seed(displayName, householdName))
}

export function getLocalDisplayName(): string {
  return load()?.identity.displayName ?? ''
}

export function resetLocal() {
  localStorage.removeItem(KEY)
  window.dispatchEvent(new CustomEvent('team-scheduler:changed'))
}

export class LocalDataStore implements DataStore {
  private db: Db

  constructor() {
    const existing = load()
    if (!existing) throw new Error('No local household — onboard first')
    this.db = existing
  }

  get household(): Household {
    return this.db.household
  }

  private commit() {
    save(this.db)
  }

  // ---- children --------------------------------------------------------
  async listChildren(): Promise<Child[]> {
    return [...this.db.children].sort((a, b) => a.name.localeCompare(b.name))
  }

  async createChild(input: NewChild): Promise<Child> {
    const child: Child = {
      id: newId(),
      household_id: this.db.household.id,
      name: input.name,
      color: input.color,
      created_at: nowIso(),
    }
    this.db.children.push(child)
    this.commit()
    return child
  }

  async updateChild(id: string, patch: Partial<NewChild>): Promise<Child> {
    const c = this.db.children.find((x) => x.id === id)
    if (!c) throw new Error('Child not found')
    Object.assign(c, patch)
    this.commit()
    return c
  }

  async deleteChild(id: string): Promise<void> {
    this.db.children = this.db.children.filter((c) => c.id !== id)
    this.db.events = this.db.events.filter((e) => e.child_id !== id)
    this.db.sources = this.db.sources.filter((s) => s.child_id !== id)
    this.commit()
  }

  // ---- events ----------------------------------------------------------
  async listEvents(): Promise<SportEvent[]> {
    return [...this.db.events].sort(
      (a, b) => a.starts_at.localeCompare(b.starts_at),
    )
  }

  async createEvent(input: NewEvent): Promise<SportEvent> {
    const ev: SportEvent = {
      ...input,
      id: newId(),
      household_id: this.db.household.id,
      created_at: nowIso(),
      updated_at: nowIso(),
    }
    this.db.events.push(ev)
    this.commit()
    return ev
  }

  async updateEvent(id: string, patch: Partial<NewEvent>): Promise<SportEvent> {
    const ev = this.db.events.find((x) => x.id === id)
    if (!ev) throw new Error('Event not found')
    Object.assign(ev, patch, { updated_at: nowIso() })
    this.commit()
    return ev
  }

  async deleteEvent(id: string): Promise<void> {
    this.db.events = this.db.events.filter((e) => e.id !== id)
    this.commit()
  }

  // ---- sources ---------------------------------------------------------
  async listSources(): Promise<CalendarSource[]> {
    return [...this.db.sources]
  }

  async createSource(input: NewSource): Promise<CalendarSource> {
    const src: CalendarSource = {
      id: newId(),
      household_id: this.db.household.id,
      child_id: input.child_id,
      type: input.type,
      url: input.url,
      team_name: input.team_name,
      last_synced_at: null,
      sync_error: null,
      created_at: nowIso(),
    }
    this.db.sources.push(src)
    this.commit()
    return src
  }

  async deleteSource(id: string): Promise<void> {
    this.db.sources = this.db.sources.filter((s) => s.id !== id)
    // keep imported events but detach them so they're not re-synced
    for (const ev of this.db.events) {
      if (ev.source_id === id) ev.source_id = null
    }
    this.commit()
  }

  async syncSource(id: string): Promise<number> {
    const src = this.db.sources.find((s) => s.id === id)
    if (!src) throw new Error('Source not found')

    let text: string
    try {
      // webcal:// → https:// for fetch
      const url = src.url.replace(/^webcal:/i, 'https:')
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      text = await res.text()
    } catch (err) {
      src.sync_error =
        'Could not fetch the calendar in local mode (the calendar host blocks ' +
        'browser requests). Cloud mode fetches it server-side. ' +
        (err instanceof Error ? `(${err.message})` : '')
      this.commit()
      throw new Error(src.sync_error)
    }

    const parsed = parseIcs(text)
    let count = 0
    for (const item of parsed) {
      const existing = this.db.events.find(
        (e) => e.source_id === src.id && e.uid === item.uid,
      )
      const base = {
        child_id: src.child_id,
        source_id: src.id,
        uid: item.uid,
        title: item.summary,
        kind: classifyKind(item.summary),
        starts_at: item.start,
        ends_at: item.end,
        all_day: item.allDay,
        location: item.location,
        location_url: null,
        opponent: extractOpponent(item.summary),
        home_away: null,
        notes: item.description,
      }
      if (existing) {
        // Preserve family-entered logistics; refresh feed-owned fields only.
        Object.assign(existing, base, { updated_at: nowIso() })
      } else {
        this.db.events.push({
          ...base,
          arrival_time: null,
          what_to_bring: null,
          uniform_color: null,
          driver: null,
          reminder_minutes: null,
          id: newId(),
          household_id: this.db.household.id,
          created_at: nowIso(),
          updated_at: nowIso(),
        })
      }
      count++
    }
    src.last_synced_at = nowIso()
    src.sync_error = null
    this.commit()
    return count
  }

  // ---- reminders -------------------------------------------------------
  async getReminderPrefs(): Promise<ReminderPrefs> {
    return { ...this.db.reminders }
  }

  async setReminderPrefs(prefs: ReminderPrefs): Promise<void> {
    this.db.reminders = { ...prefs }
    this.commit()
  }

  // ---- change notifications -------------------------------------------
  subscribe(onChange: () => void): () => void {
    const handler = () => {
      const fresh = load()
      if (fresh) this.db = fresh
      onChange()
    }
    window.addEventListener('team-scheduler:changed', handler)
    window.addEventListener('storage', handler)
    return () => {
      window.removeEventListener('team-scheduler:changed', handler)
      window.removeEventListener('storage', handler)
    }
  }
}
