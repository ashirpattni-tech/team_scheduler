import { useState } from 'react'
import { CloseIcon } from './icons'
import { useInstallPrompt } from '../hooks/useInstallPrompt'

/** Top-of-app banner prompting installation. Rendered at the App root so it
 *  shows on every screen, including login/onboarding. */
export function InstallBanner() {
  const { state, install } = useInstallPrompt()
  const [dismissed, setDismissed] = useState(false)

  if (dismissed || state === 'installed' || state === 'unsupported') return null

  return (
    <div className="sticky top-0 z-40 mx-auto w-full max-w-md bg-brand px-4 py-3 text-white shadow-md">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          {state === 'android' ? (
            <>
              <p className="text-sm font-semibold">Install Team Scheduler</p>
              <p className="text-xs text-blue-100">Add to your home screen for quick access</p>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold">Add to Home Screen</p>
              <p className="text-xs text-blue-100">
                Tap the <span className="font-bold">Share</span> icon below, then{' '}
                <span className="font-bold">Add to Home Screen</span>
              </p>
            </>
          )}
        </div>

        {state === 'android' && (
          <button
            onClick={install}
            className="shrink-0 rounded-lg bg-white px-3 py-1.5 text-sm font-bold text-brand"
          >
            Install
          </button>
        )}

        <button
          onClick={() => setDismissed(true)}
          className="shrink-0 rounded-full p-1 text-white/70 hover:bg-white/20"
          aria-label="Dismiss"
        >
          <CloseIcon width={18} height={18} />
        </button>
      </div>
    </div>
  )
}
