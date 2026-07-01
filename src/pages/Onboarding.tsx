import { useState } from 'react'
import { Button, Field, TextInput } from '../components/ui'
import { BallIcon } from '../components/icons'
import { useApp } from '../app/context'
import { createLocalHousehold } from '../data/local'

export function SetupPage() {
  const { refresh } = useApp()
  const [name, setName] = useState('')
  const [family, setFamily] = useState('')

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col justify-center px-6 py-12">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand text-white shadow-lg shadow-brand/30">
          <BallIcon width={32} height={32} />
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900">Team Scheduler</h1>
        <p className="mt-1 text-slate-500">One place for every child's games & practices</p>
      </div>

      <Field label="Your name">
        <TextInput
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Alex"
          autoFocus
        />
      </Field>
      <Field label="Family name" hint='Just a label, e.g. "The Smiths"'>
        <TextInput
          value={family}
          onChange={(e) => setFamily(e.target.value)}
          placeholder="The Smiths"
        />
      </Field>
      <Button
        className="mt-2 w-full"
        disabled={!name.trim() || !family.trim()}
        onClick={() => {
          createLocalHousehold(name.trim(), family.trim())
          refresh()
        }}
      >
        Get started
      </Button>
    </div>
  )
}
