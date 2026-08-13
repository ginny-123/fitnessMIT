const CACHE = 'fittrack-v1'
const SHELL = ['/', '/index.html', '/manifest.webmanifest']
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL))))
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()))
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return
  event.respondWith(fetch(event.request).then(response => {
    const copy = response.clone()
    caches.open(CACHE).then(cache => cache.put(event.request, copy))
    return response
  }).catch(() => caches.match(event.request).then(hit => hit || caches.match('/'))))
})
self.addEventListener('notificationclick', event => {
  event.notification.close()
  event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(windows => windows[0]?.focus() || clients.openWindow('/')))
})
