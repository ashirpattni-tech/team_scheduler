import { useState } from 'react'
import { Header } from '../components/Layout'
import { Button, EmptyState, Field, Sheet, TextInput } from '../components/ui'
import { PlusIcon, TrashIcon, UsersIcon, EditIcon } from '../components/icons'
import { useChildren, useChildMutations, useEvents } from '../data/hooks'
import { CHILD_COLORS, type Child } from '../lib/types'
import { classNames, contrastText } from '../lib/util'

export function ChildrenPage() {
  const { data: children = [] } = useChildren()
  const { data: events = [] } = useEvents()
  const { create, update, remove } = useChildMutations()
  const [editing, setEditing] = useState<Child | null>(null)
  const [creating, setCreating] = useState(false)

  const counts = events.reduce<Record<string, number>>((acc, e) => {
    acc[e.child_id] = (acc[e.child_id] ?? 0) + 1
    return acc
  }, {})

  return (
    <>
      <Header
        title="Children"
        subtitle="Color-coded across the schedule"
        action={
          <Button onClick={() => setCreating(true)} className="!px-3 !py-2">
            <PlusIcon width={18} height={18} />
            Add
          </Button>
        }
      />

      {children.length === 0 ? (
        <EmptyState
          icon={<UsersIcon width={28} height={28} />}
          title="Add your first child"
        >
          Give each child a name and a color. Their games and practices will be
          tagged with that color everywhere.
        </EmptyState>
      ) : (
        <ul className="space-y-2 px-5 py-4">
          {children.map((c) => (
            <li
              key={c.id}
              className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-100"
            >
              <span
                className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold"
                style={{ background: c.color, color: contrastText(c.color) }}
              >
                {c.name.slice(0, 1).toUpperCase()}
              </span>
              <div className="flex-1">
                <div className="font-bold text-slate-900">{c.name}</div>
                <div className="text-xs text-slate-400">
                  {counts[c.id] ?? 0} events
                </div>
              </div>
              <button
                onClick={() => setEditing(c)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
              >
                <EditIcon width={18} height={18} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <ChildSheet
        open={creating || !!editing}
        child={editing}
        onClose={() => {
          setCreating(false)
          setEditing(null)
        }}
        onSave={(name, color) => {
          if (editing) update.mutate({ id: editing.id, patch: { name, color } })
          else create.mutate({ name, color })
          setCreating(false)
          setEditing(null)
        }}
        onDelete={
          editing
            ? () => {
                if (
                  confirm(
                    `Remove ${editing.name}? Their events will also be removed.`,
                  )
                ) {
                  remove.mutate(editing.id)
                  setEditing(null)
                }
              }
            : undefined
        }
      />
    </>
  )
}

function ChildSheet({
  open,
  child,
  onClose,
  onSave,
  onDelete,
}: {
  open: boolean
  child: Child | null
  onClose: () => void
  onSave: (name: string, color: string) => void
  onDelete?: () => void
}) {
  const [name, setName] = useState(child?.name ?? '')
  const [color, setColor] = useState(child?.color ?? CHILD_COLORS[5])

  // reset when opening for a different child
  const [seen, setSeen] = useState<string | null>(null)
  if (open && seen !== (child?.id ?? 'new')) {
    setSeen(child?.id ?? 'new')
    setName(child?.name ?? '')
    setColor(child?.color ?? CHILD_COLORS[Math.floor(Math.random() * CHILD_COLORS.length)])
  }
  if (!open && seen !== null) setSeen(null)

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={child ? 'Edit child' : 'Add child'}
      footer={
        <div className="flex gap-2">
          {onDelete && (
            <Button variant="danger" onClick={onDelete} className="!px-3">
              <TrashIcon width={18} height={18} />
            </Button>
          )}
          <Button
            onClick={() => name.trim() && onSave(name.trim(), color)}
            disabled={!name.trim()}
            className="flex-1"
          >
            {child ? 'Save' : 'Add child'}
          </Button>
        </div>
      }
    >
      <Field label="Name">
        <TextInput
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Maya"
          autoFocus
        />
      </Field>
      <Field label="Color">
        <div className="flex flex-wrap gap-2.5 pt-1">
          {CHILD_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={classNames(
                'h-9 w-9 rounded-full transition',
                color === c
                  ? 'ring-2 ring-slate-900 ring-offset-2'
                  : 'ring-1 ring-black/5',
              )}
              style={{ background: c }}
              aria-label={c}
            />
          ))}
        </div>
      </Field>
    </Sheet>
  )
}
