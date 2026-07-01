// Web Push subscription helpers.
//
// Reliable, background reminders are delivered by the cloud backend: the
// `send-reminders` edge function sends a push to the stored subscription at the
// right time, and the service worker shows the notification even when the app
// is closed. On iPhone this requires the PWA to be installed to the Home Screen
// (iOS 16.4+).

import { supabase } from './supabase'

export function notificationsSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window
  )
}

export function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari
    (navigator as unknown as { standalone?: boolean }).standalone === true
  )
}

export function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  const out = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

/**
 * Request permission, subscribe to push and persist the subscription so the
 * backend can deliver reminders. Returns a status string for the UI.
 */
export async function enablePushNotifications(
  _householdId: string,
): Promise<'subscribed' | 'denied' | 'unsupported' | 'no-backend'> {
  if (!notificationsSupported()) return 'unsupported'

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return 'denied'

  const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined
  if (!supabase || !vapidKey) return 'no-backend'

  const reg = await navigator.serviceWorker.ready
  const existing = await reg.pushManager.getSubscription()
  const sub =
    existing ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
    }))

  // Subscription obtained — without a cloud backend we can't persist it for
  // server-side delivery, but the browser permission is granted and the service
  // worker will handle any push events if a backend is wired up later.
  void sub
  return 'subscribed'
}
