import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export type InstallState =
  | 'unsupported'   // not a PWA context or already installed
  | 'android'       // beforeinstallprompt available — show button
  | 'ios'           // iOS Safari — show manual Share instructions
  | 'installed'     // running in standalone mode

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  )
}

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) &&
    !('MSStream' in window)
}

export function useInstallPrompt() {
  const [state, setState] = useState<InstallState>('unsupported')
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    if (isStandalone()) {
      setState('installed')
      return
    }

    if (isIos()) {
      setState('ios')
      return
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setPrompt(e as BeforeInstallPromptEvent)
      setState('android')
    }

    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', () => setState('installed'))

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  async function install() {
    if (!prompt) return
    await prompt.prompt()
    const { outcome } = await prompt.userChoice
    if (outcome === 'accepted') setState('installed')
    setPrompt(null)
  }

  return { state, install }
}
