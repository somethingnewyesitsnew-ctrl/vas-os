// ══════════════════════════════════════════════════════════════════════
// Digital Plus OS — Service Worker
// Two jobs: (1) receive Web Push events and turn them into OS
// notifications even when no tab is open, and (2) cache the app shell
// (material.html + all js/ modules + css) so a repeat launch doesn't
// have to re-fetch ~30 individual files over the network before the
// login screen becomes usable — that round-trip cost is what makes the
// splash screen linger on a slow mobile connection. Cache is
// network-first with a cache fallback: online users always get the
// latest code; offline/slow users get the last-cached version instantly
// instead of staring at a blank splash.
// ══════════════════════════════════════════════════════════════════════

const CACHE_NAME = 'dpos-shell-v' + (self.registration ? 1 : 1) + '-4.3.0';

const SHELL_ASSETS = [
  './',
  './material.html',
  './manifest.json',
  './css/material.css',
  './js/00-core-preamble.js',
  './js/01-push-notifications.js',
  './js/02-ui-utils-config.js',
  './js/03-supabase-helpers.js',
  './js/04-member-types-perms.js',
  './js/05-data-load.js',
  './js/06-task-db-writes.js',
  './js/07-notify-log.js',
  './js/08-auth-nav.js',
  './js/09-syslog-persist.js',
  './js/10-dashboard.js',
  './js/11-tasks.js',
  './js/12-todos-reminders.js',
  './js/13-projects.js',
  './js/14-team-eval.js',
  './js/15-backlog.js',
  './js/16-services-operators.js',
  './js/17-library.js',
  './js/18-docs-archive.js',
  './js/19-meetings.js',
  './js/20-service-tests.js',
  './js/21-settings.js',
  './js/23-hr-comms-announcements-reports.js',
  './js/24-comments-page.js',
  './js/25-tutorial.js',
  './js/26-task-panel.js',
  './js/27-modals-saves.js',
  './js/28-badges-updates.js',
  './js/29-init-mobile.js',
  './js/material-overrides.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/badge-96.png',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      // Best-effort — a single missing/renamed asset shouldn't block
      // install and leave the whole shell uncached.
      Promise.all(SHELL_ASSETS.map((url) => cache.add(url).catch(() => {})))
    )
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    ).then(() => self.clients.claim())
  );
});

// Network-first for our own static shell files; cache-first fallback
// when the network is slow/unreachable. Everything else (Supabase API
// calls, third-party CDN scripts) passes straight through untouched —
// this worker never intercepts those.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  const isShellAsset = SHELL_ASSETS.some((a) => url.pathname.endsWith(a.replace('./', '/')) || url.pathname === '/' );
  if (!isShellAsset) return;

  event.respondWith(
    fetch(req).then((res) => {
      const copy = res.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {});
      return res;
    }).catch(() => caches.match(req).then((cached) => cached || Response.error()))
  );
});

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (e) {
    payload = { title: 'Digital Plus OS', body: event.data ? event.data.text() : 'You have a new notification.' };
  }

  const title = payload.title || 'Digital Plus OS';
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
