import type { SupabaseClient } from '@supabase/supabase-js'
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

/**
 * Cloud-backed data store. Mirrors LocalDataStore but persists to Postgres with
 * Row-Level Security, so only members of the household can read/write its rows.
 * Realtime change feeds drive live updates between the two parents' devices.
 *
 * Logistics columns live on the `events` row here for simplicity of the client;
 * the sync edge function only overwrites feed-owned columns on re-import, so
 * family-entered logistics survive (see supabase/functions/sync-source).
 */
export class SupabaseDataStore implements DataStore {
  private sb: SupabaseClient
  public readonly household: Household

  constructor(sb: SupabaseClient, household: Household) {
    this.sb = sb
    this.household = household
  }

  private get hid() {
    return this.household.id
  }

  // ---- children --------------------------------------------------------
  async listChildren(): Promise<Child[]> {
    const { data, error } = await this.sb
      .from('children')
      .select('*')
      .order('name')
    if (error) throw error
    return data as Child[]
  }

  async createChild(input: NewChild): Promise<Child> {
    const { data, error } = await this.sb
      .from('children')
      .insert({ ...input, household_id: this.hid })
      .select()
      .single()
    if (error) throw error
    return data as Child
  }

  async updateChild(id: string, patch: Partial<NewChild>): Promise<Child> {
    const { data, error } = await this.sb
      .from('children')
      .update(patch)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as Child
  }

  async deleteChild(id: string): Promise<void> {
    const { error } = await this.sb.from('children').delete().eq('id', id)
    if (error) throw error
  }

  // ---- events ----------------------------------------------------------
  async listEvents(): Promise<SportEvent[]> {
    const { data, error } = await this.sb
      .from('events')
      .select('*')
      .order('starts_at')
    if (error) throw error
    return data as SportEvent[]
  }

  async createEvent(input: NewEvent): Promise<SportEvent> {
    const { data, error } = await this.sb
      .from('events')
      .insert({ ...input, household_id: this.hid })
      .select()
      .single()
    if (error) throw error
    return data as SportEvent
  }

  async updateEvent(id: string, patch: Partial<NewEvent>): Promise<SportEvent> {
    const { data, error } = await this.sb
      .from('events')
      .update(patch)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as SportEvent
  }

  async deleteEvent(id: string): Promise<void> {
    const { error } = await this.sb.from('events').delete().eq('id', id)
    if (error) throw error
  }

  // ---- sources ---------------------------------------------------------
  async listSources(): Promise<CalendarSource[]> {
    const { data, error } = await this.sb
      .from('calendar_sources')
      .select('*')
      .order('created_at')
    if (error) throw error
    return data as CalendarSource[]
  }

  async createSource(input: NewSource): Promise<CalendarSource> {
    const { data, error } = await this.sb
      .from('calendar_sources')
      .insert({ ...input, household_id: this.hid })
      .select()
      .single()
    if (error) throw error
    return data as CalendarSource
  }

  async deleteSource(id: string): Promise<void> {
    const { error } = await this.sb
      .from('calendar_sources')
      .delete()
      .eq('id', id)
    if (error) throw error
  }

  async syncSource(id: string): Promise<number> {
    // Server-side fetch+parse (avoids browser CORS on the feed host).
    const { data, error } = await this.sb.functions.invoke('sync-source', {
      body: { source_id: id },
    })
    if (error) throw error
    return (data as { count: number }).count ?? 0
  }

  // ---- reminders -------------------------------------------------------
  async getReminderPrefs(): Promise<ReminderPrefs> {
    const { data, error } = await this.sb
      .from('reminder_prefs')
      .select('default_minutes, enabled')
      .eq('household_id', this.hid)
      .maybeSingle()
    if (error) throw error
    return (data as ReminderPrefs | null) ?? { ...DEFAULT_REMINDER_PREFS }
  }

  async setReminderPrefs(prefs: ReminderPrefs): Promise<void> {
    const { error } = await this.sb
      .from('reminder_prefs')
      .upsert({ household_id: this.hid, ...prefs })
    if (error) throw error
  }

  // ---- realtime --------------------------------------------------------
  subscribe(onChange: () => void): () => void {
    const channel = this.sb
      .channel(`household-${this.hid}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'events' },
        onChange,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'children' },
        onChange,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'calendar_sources' },
        onChange,
      )
      .subscribe()
    return () => {
      this.sb.removeChannel(channel)
    }
  }
}
