import { useState } from 'react'
import { Header } from '../components/Layout'
import {
  Button,
  EmptyState,
  Field,
  Select,
  Sheet,
  TextInput,
} from '../components/ui'
import { PlusIcon, SyncIcon, TrashIcon } from '../components/icons'
import {
  useChildren,
  useSources,
  useSourceMutations,
} from '../data/hooks'
import { useApp } from '../app/context'
import type { CalendarSource, SourceType } from '../lib/types'
import { formatDistanceToNow } from 'date-fns'
import { toDate } from '../lib/date'

export function SourcesPage() {
  const { mode } = useApp()
  const { data: children = [] } = useChildren()
  const { data: sources = [] } = useSources()
  const { create, remove, sync } = useSourceMutations()
  const [adding, setAdding] = useState(false)
  const [syncingId, setSyncingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const childName = (id: string) =>
    children.find((c) => c.id === id)?.name ?? 'Unknown'

  async function doSync(id: string) {
    setSyncingId(id)
    setError(null)
    try {
      const n = await sync.mutateAsync(id)
      setError(`Imported ${n} event${n === 1 ? '' : 's'}.`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sync failed')
    } finally {
      setSyncingId(null)
    }
  }

  return (
    <>
      <Header
        title="Imports"
        subtitle="Pull schedules from TeamSnap & more"
        action={
          <Button
            onClick={() => setAdding(true)}
            className="!px-3 !py-2"
            disabled={children.length === 0}
          >
            <PlusIcon width={18} height={18} />
            Add
          </Button>
        }
      />

      {mode === 'local' && (
        <p className="mx-5 mt-3 rounded-xl bg-amber-50 px-4 py-3 text-xs text-amber-700">
          Heads up: in local mode the browser fetches the feed directly, which
          many calendar hosts block. Calendar import works reliably once you
          connect the cloud backend (Supabase), which fetches feeds server-side.
        </p>
      )}

      {error && (
        <p className="mx-5 mt-3 rounded-xl bg-slate-100 px-4 py-3 text-xs text-slate-600">
          {error}
        </p>
      )}

      {children.length === 0 ? (
        <EmptyState icon={<SyncIcon width={28} height={28} />} title="Add a child first">
          Calendar imports attach to a child. Add your children, then connect
          their team calendars here.
        </EmptyState>
      ) : sources.length === 0 ? (
        <EmptyState icon={<SyncIcon width={28} height={28} />} title="No calendars connected">
          Connect a TeamSnap (or any iCal) calendar link to automatically pull
          in games and practices.
        </EmptyState>
      ) : (
        <ul className="space-y-2 px-5 py-4">
          {sources.map((s) => (
            <SourceRow
              key={s.id}
              source={s}
              childName={childName(s.child_id)}
              syncing={syncingId === s.id}
              onSync={() => doSync(s.id)}
              onDelete={() => {
                if (confirm('Remove this calendar? Imported events are kept.'))
                  remove.mutate(s.id)
              }}
            />
          ))}
        </ul>
      )}

      <AddSourceSheet
        open={adding}
        onClose={() => setAdding(false)}
        children={children}
        onAdd={async (input) => {
          const src = await create.mutateAsync(input)
          setAdding(false)
          doSync(src.id)
        }}
      />
    </>
  )
}

function SourceRow({
  source,
  childName,
  syncing,
  onSync,
  onDelete,
}: {
  source: CalendarSource
  childName: string
  syncing: boolean
  onSync: () => void
  onDelete: () => void
}) {
  return (
    <li className="rounded-2xl bg-white p-3.5 shadow-sm ring-1 ring-slate-100">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <div className="font-bold text-slate-900">
            {source.team_name || 'Team calendar'}
          </div>
          <div className="text-xs text-slate-400">
            {childName} ·{' '}
            {source.type === 'ics_teamsnap' ? 'TeamSnap' : 'iCal feed'}
          </div>
          <div className="mt-1 text-xs text-slate-400">
            {source.sync_error ? (
              <span className="text-red-500">{source.sync_error}</span>
            ) : source.last_synced_at ? (
              `Synced ${formatDistanceToNow(toDate(source.last_synced_at), {
                addSuffix: true,
              })}`
            ) : (
              'Not synced yet'
            )}
          </div>
        </div>
        <button
          onClick={onSync}
          disabled={syncing}
          className="rounded-lg p-2 text-brand hover:bg-brand/10 disabled:opacity-50"
          aria-label="Sync now"
        >
          <SyncIcon
            width={18}
            height={18}
            className={syncing ? 'animate-spin' : ''}
          />
        </button>
        <button
          onClick={onDelete}
          className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
          aria-label="Remove"
        >
          <TrashIcon width={18} height={18} />
        </button>
      </div>
    </li>
  )
}

function AddSourceSheet({
  open,
  onClose,
  children,
  onAdd,
}: {
  open: boolean
  onClose: () => void
  children: { id: string; name: string }[]
  onAdd: (input: {
    child_id: string
    type: SourceType
    url: string
    team_name: string | null
  }) => void
}) {
  const [childId, setChildId] = useState(children[0]?.id ?? '')
  const [type, setType] = useState<SourceType>('ics_teamsnap')
  const [url, setUrl] = useState('')
  const [teamName, setTeamName] = useState('')

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Connect a calendar"
      footer={
        <Button
          className="w-full"
          disabled={!childId || !url.trim()}
          onClick={() =>
            onAdd({
              child_id: childId,
              type,
              url: url.trim(),
              team_name: teamName.trim() || null,
            })
          }
        >
          Connect & sync
        </Button>
      }
    >
      <div className="mb-4 rounded-xl bg-brand/5 p-4 text-xs leading-relaxed text-slate-600">
        <p className="mb-1 font-bold text-slate-700">Where to find the link</p>
        In TeamSnap (web): open the team → <b>Schedule</b> → <b>Settings</b> →{' '}
        <b>Sync Calendar / Export</b>, then copy the iCal / WebCal link and paste
        it below.
      </div>

      <Field label="Child">
        <Select value={childId} onChange={(e) => setChildId(e.target.value)}>
          {children.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Source">
        <Select
          value={type}
          onChange={(e) => setType(e.target.value as SourceType)}
        >
          <option value="ics_teamsnap">TeamSnap</option>
          <option value="ics_generic">Other iCal / WebCal feed</option>
        </Select>
      </Field>

      <Field label="Team name (optional)">
        <TextInput
          value={teamName}
          onChange={(e) => setTeamName(e.target.value)}
          placeholder="e.g. U10 Tigers"
        />
      </Field>

      <Field label="Calendar link" hint="Starts with webcal:// or https:// and ends in .ics">
        <TextInput
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="webcal://…"
          autoCapitalize="off"
          autoCorrect="off"
        />
      </Field>
    </Sheet>
  )
}
