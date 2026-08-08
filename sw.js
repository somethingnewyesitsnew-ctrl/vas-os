// ══════════════════════════════════════════════════════════════════════
// VAS OS — Service Worker (push notifications only)
// No offline caching / no asset interception — this file's only job is
// to receive Web Push events and turn them into OS notifications, even
// when no VAS OS tab is open. Keep it minimal and easy to reason about.
// ══════════════════════════════════════════════════════════════════════

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (e) {
    payload = { title: 'VAS OS', body: event.data ? event.data.text() : 'You have a new notification.' };
  }

  const title = payload.title || 'VAS OS';
  const options = {
    body: payload.body || '',
    icon: payload.icon || 'icons/icon-192.png',
    badge: payload.badge || 'icons/badge-96.png',
    data: { url: payload.url || './' },
    tag: payload.tag || undefined,
    renotify: !!payload.tag,
    vibrate: [80, 40, 80],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Tap a notification: focus an already-open VAS OS tab and navigate it
// to the deep link, or open a new tab if none is open.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || './';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          // The app is already open — tell it to navigate in place via
          // postMessage instead of client.navigate(). navigate() only
          // changes the URL bar; the running single-page app never gets
          // told about it (no hashchange handling), so nothing actually
          // loads. The page listens for this message and does the real
          // in-app navigation itself.
          try { client.postMessage({ type: 'push-notification-click', url: targetUrl }); } catch (e) {}
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// If the browser invalidates the subscription (rotation, expiry), drop a
// message the main app can pick up next time it's open — the app will
// re-subscribe and re-save automatically via pushsubscriptionchange.
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    self.registration.pushManager
      .subscribe(event.oldSubscription ? { applicationServerKey: event.oldSubscription.options.applicationServerKey, userVisibleOnly: true } : undefined)
      .then((newSub) => {
        return self.clients.matchAll().then((clientList) => {
          clientList.forEach((c) => c.postMessage({ type: 'PUSH_RESUBSCRIBED', subscription: newSub.toJSON() }));
        });
      })
      .catch(() => {})
  );
});
