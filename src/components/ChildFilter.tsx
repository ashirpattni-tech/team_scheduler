import type { Child } from '../lib/types'
import { classNames, contrastText } from '../lib/util'

/** Horizontal scrollable chips to filter the schedule by child. */
export function ChildFilter({
  children,
  selected,
  onSelect,
}: {
  children: Child[]
  selected: string | null // child id, or null = all
  onSelect: (id: string | null) => void
}) {
  if (children.length === 0) return null
  return (
    <div className="no-scrollbar flex gap-2 overflow-x-auto px-5 py-3">
      <Chip active={selected === null} onClick={() => onSelect(null)}>
        Everyone
      </Chip>
      {children.map((c) => {
        const active = selected === c.id
        return (
          <Chip
            key={c.id}
            active={active}
            onClick={() => onSelect(c.id)}
            activeStyle={
              active
                ? { background: c.color, color: contrastText(c.color) }
                : undefined
            }
            dot={c.color}
          >
            {c.name}
          </Chip>
        )
      })}
    </div>
  )
}

function Chip({
  active,
  onClick,
  children,
  activeStyle,
  dot,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  activeStyle?: React.CSSProperties
  dot?: string
}) {
  return (
    <button
      onClick={onClick}
      style={activeStyle}
      className={classNames(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold transition',
        active ? 'shadow-sm' : 'bg-white text-slate-600 ring-1 ring-slate-200',
        active && !activeStyle ? 'bg-brand text-white' : '',
      )}
    >
      {dot && !active && (
        <span
          className="h-2 w-2 rounded-full"
          style={{ background: dot }}
        />
      )}
      {children}
    </button>
  )
}
