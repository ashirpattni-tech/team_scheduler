/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'

declare const self: ServiceWorkerGlobalScope

cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

self.addEventListener('push', (event) => {
  const data = event.data?.json() as
    | { title?: string; body?: string; url?: string }
    | undefined
  event.waitUntil(
    self.registration.showNotification(data?.title ?? 'Team Scheduler', {
      body: data?.body,
      icon: '/pwa-192.png',
      badge: '/pwa-192.png',
      data: data?.url ? { url: data.url } : undefined,
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data as { url?: string } | null)?.url ?? '/'
  event.waitUntil(self.clients.openWindow(url))
})
