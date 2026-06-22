import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { useEffect } from 'react'
import { useStore } from '../app/context'
import type {
  NewChild,
  NewEvent,
  NewSource,
  ReminderPrefs,
} from '../lib/types'

const keys = {
  children: ['children'] as const,
  events: ['events'] as const,
  sources: ['sources'] as const,
  reminders: ['reminders'] as const,
}

/** Invalidate all data queries when the store reports a change (realtime/cross-tab). */
export function useRealtimeSync() {
  const store = useStore()
  const qc = useQueryClient()
  useEffect(() => {
    return store.subscribe(() => {
      qc.invalidateQueries()
    })
  }, [store, qc])
}

export function useChildren() {
  const store = useStore()
  return useQuery({ queryKey: keys.children, queryFn: () => store.listChildren() })
}

export function useEvents() {
  const store = useStore()
  return useQuery({ queryKey: keys.events, queryFn: () => store.listEvents() })
}

export function useSources() {
  const store = useStore()
  return useQuery({ queryKey: keys.sources, queryFn: () => store.listSources() })
}

export function useReminderPrefs() {
  const store = useStore()
  return useQuery({
    queryKey: keys.reminders,
    queryFn: () => store.getReminderPrefs(),
  })
}

export function useChildMutations() {
  const store = useStore()
  const qc = useQueryClient()
  const inval = () => qc.invalidateQueries({ queryKey: keys.children })
  return {
    create: useMutation({
      mutationFn: (input: NewChild) => store.createChild(input),
      onSuccess: inval,
    }),
    update: useMutation({
      mutationFn: (v: { id: string; patch: Partial<NewChild> }) =>
        store.updateChild(v.id, v.patch),
      onSuccess: inval,
    }),
    remove: useMutation({
      mutationFn: (id: string) => store.deleteChild(id),
      onSuccess: () => qc.invalidateQueries(),
    }),
  }
}

export function useEventMutations() {
  const store = useStore()
  const qc = useQueryClient()
  const inval = () => qc.invalidateQueries({ queryKey: keys.events })
  return {
    create: useMutation({
      mutationFn: (input: NewEvent) => store.createEvent(input),
      onSuccess: inval,
    }),
    update: useMutation({
      mutationFn: (v: { id: string; patch: Partial<NewEvent> }) =>
        store.updateEvent(v.id, v.patch),
      onSuccess: inval,
    }),
    remove: useMutation({
      mutationFn: (id: string) => store.deleteEvent(id),
      onSuccess: inval,
    }),
  }
}

export function useSourceMutations() {
  const store = useStore()
  const qc = useQueryClient()
  return {
    create: useMutation({
      mutationFn: (input: NewSource) => store.createSource(input),
      onSuccess: () => qc.invalidateQueries(),
    }),
    remove: useMutation({
      mutationFn: (id: string) => store.deleteSource(id),
      onSuccess: () => qc.invalidateQueries(),
    }),
    sync: useMutation({
      mutationFn: (id: string) => store.syncSource(id),
      onSuccess: () => qc.invalidateQueries(),
    }),
  }
}

export function useReminderMutation() {
  const store = useStore()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (prefs: ReminderPrefs) => store.setReminderPrefs(prefs),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.reminders }),
  })
}
