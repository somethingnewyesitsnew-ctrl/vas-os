// §01b ── PUSH NOTIFICATIONS (Web Push) ─────────────────────────────────
// Native OS-level push — works even when no VAS OS tab is open.
//
// How it fits together:
//  1. sw.js (service worker, root) receives the push event and shows the
//     OS notification.
//  2. This file handles the browser-side subscribe/unsubscribe flow and
//     saves the subscription to the `push_subscriptions` Supabase table.
//  3. A Supabase Edge Function (supabase/functions/send-push) holds the
//     VAPID private key and actually sends the push. sendPushToMember()
//     below just POSTs to that function.
//  4. notifyTG() in 00-core-preamble.js calls sendPushToMember() for
//     every event type alongside Telegram — one hook, every action
//     already wired to notifyTG gets push for free.
//
// Setup required (see SETTINGS → Push Notifications, or README):
//  - Run SUPABASE_MIGRATION_push_subscriptions.sql once
//  - Deploy supabase/functions/send-push (see that folder's README)
//  - Set PUSH_EDGE_FN_URL below once deployed (shown after deploy)

// Public VAPID key — safe to expose client-side by design (this is what
// the browser uses to verify pushes actually come from our server).
const VAPID_PUBLIC_KEY = 'BPE_NOrkd8udHrEJPpzznZXZNdBqR9YJ_EaHlKKPLjDqBAyw9O8JUNw92Dky-Hob0BUiyynpCdWOtgIW46z3Rnw';

// Every Supabase Edge Function lives at this fixed path once deployed —
// nothing to change here after you deploy supabase/functions/send-push.
const PUSH_EDGE_FN_URL = 'https://duglbebwhtuijnduwmvz.supabase.co/functions/v1/send-push';

const PUSH_DISMISSED_KEY = 'vas_push_prompt_dismissed';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

function pushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

let _swReg = null;

async function registerPushSW() {
  if (!pushSupported()) return null;
  try {
    _swReg = await navigator.serviceWorker.register('sw.js');
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'PUSH_RESUBSCRIBED' && event.data.subscription) {
        savePushSubscription(event.data.subscription).catch(() => {});
      }
    });
    return _swReg;
  } catch (e) {
    console.warn('SW registration failed:', e);
    return null;
  }
}

async function getExistingPushSubscription() {
  if (!pushSupported()) return null;
  const reg = _swReg || (await navigator.serviceWorker.getRegistration('sw.js'));
  if (!reg) return null;
  return reg.pushManager.getSubscription();
}

// §01b.1 ── Subscribe this device ────────────────────────────────────────
async function subscribeToPush() {
  if (!pushSupported()) { toast('Push notifications aren\'t supported on this browser', 'bad'); return false; }
  if (!CU) return false;

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    toast(permission === 'denied' ? 'Notifications blocked — enable them in browser settings' : 'Permission not granted', 'bad');
    return false;
  }

  const reg = _swReg || (await registerPushSW());
  if (!reg) { toast('Could not register service worker', 'bad'); return false; }

  try {
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }
    const saved = await savePushSubscription(sub.toJSON());
    if (saved) {
      localStorage.setItem('vas_push_enabled_' + (CU.id || CU.name), '1');
      toast('Push notifications enabled ✓', 'ok');
      updatePushToggleUI();
      return true;
    }
    toast('Subscribed, but saving to server failed — try again', 'bad');
    return false;
  } catch (e) {
    console.warn('subscribeToPush error:', e);
    toast('Could not enable push notifications', 'bad');
    return false;
  }
}

async function savePushSubscription(subJson) {
  if (!CU || !subJson?.endpoint) return null;
  const row = {
    member_id: CU.id || null,
    member_name: CU.name || '',
    endpoint: subJson.endpoint,
    p256dh: subJson.keys?.p256dh || '',
    auth: subJson.keys?.auth || '',
    user_agent: navigator.userAgent,
  };
  // Upsert by endpoint (unique) so re-subscribing on the same device doesn't duplicate rows
  try {
    const r = await fetch(`${SB_URL}/rest/v1/push_subscriptions`, {
      method: 'POST',
      headers: { ...SB_HEADERS, Prefer: 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify(row),
    });
    if (!r.ok) { console.warn('savePushSubscription failed', await r.text().catch(() => '')); return null; }
    return await r.json();
  } catch (e) {
    console.warn('savePushSubscription error:', e);
    return null;
  }
}

// §01b.2 ── Unsubscribe this device ──────────────────────────────────────
async function unsubscribeFromPush() {
  try {
    const sub = await getExistingPushSubscription();
    if (sub) {
      const endpoint = sub.endpoint;
      await sub.unsubscribe();
      try {
        await fetch(`${SB_URL}/rest/v1/push_subscriptions?endpoint=eq.${encodeURIComponent(endpoint)}`, {
          method: 'DELETE',
          headers: SB_HEADERS,
        });
      } catch (e) {}
    }
    localStorage.removeItem('vas_push_enabled_' + (CU?.id || CU?.name));
    toast('Push notifications disabled', 'ok');
    updatePushToggleUI();
  } catch (e) {
    console.warn('unsubscribeFromPush error:', e);
    toast('Could not disable push notifications', 'bad');
  }
}

async function isPushSubscribedHere() {
  if (!pushSupported()) return false;
  const sub = await getExistingPushSubscription();
  return !!sub;
}

function updatePushToggleUI() {
  const el = document.getElementById('push-status-box');
  if (!el) return;
  isPushSubscribedHere().then((on) => {
    el.innerHTML = pushToggleHTML(on);
  });
}

function pushToggleHTML(isOn) {
  if (!pushSupported()) {
    return `<div style="font-size:11px;color:var(--tx3)">Not supported on this browser/device.</div>`;
  }
  if (Notification.permission === 'denied') {
    return `<div style="font-size:11px;color:var(--r)">Blocked — enable notifications for this site in your browser settings, then reload.</div>`;
  }
  return isOn
    ? `<div style="display:flex;align-items:center;gap:8px">
         <span style="background:#dcfce7;color:#16a34a;font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;border:1px solid #86efac">✓ Enabled on this device</span>
         <button onclick="unsubscribeFromPush()" class="btn bg2 bxs">Disable</button>
         <button onclick="sendTestPush()" class="btn bp bxs">🧪 Test</button>
       </div>`
    : `<button onclick="subscribeToPush()" class="btn bp bsm">🔔 Enable Push on This Device</button>`;
}

// §01b.3 ── First-login soft prompt (once per device, dismissible) ──────
async function maybeShowPushPrompt() {
  if (!pushSupported()) return;
  if (Notification.permission !== 'default') return; // already granted or denied — nothing to ask
  if (localStorage.getItem(PUSH_DISMISSED_KEY)) return;

  const bar = document.createElement('div');
  bar.id = 'push-prompt-bar';
  bar.style.cssText = 'position:fixed;left:16px;right:16px;bottom:16px;z-index:9998;max-width:420px;margin:0 auto;background:var(--s);border:1px solid var(--bd);border-radius:12px;box-shadow:var(--shlg);padding:14px 16px;display:flex;align-items:center;gap:12px';
  bar.innerHTML = `
    <div style="font-size:22px;flex-shrink:0">🔔</div>
    <div style="flex:1;min-width:0">
      <div style="font-size:13px;font-weight:700;color:var(--tx)">Enable notifications?</div>
      <div style="font-size:11px;color:var(--tx3)">Get alerted about tasks, reminders and meetings — even with the app closed.</div>
    </div>
    <button id="push-prompt-yes" style="background:var(--ac);color:#fff;border:none;border-radius:7px;padding:7px 12px;font-size:12px;font-weight:700;cursor:pointer;flex-shrink:0">Enable</button>
    <button id="push-prompt-no" style="background:none;border:none;color:var(--tx3);font-size:16px;cursor:pointer;flex-shrink:0;padding:0 4px">✕</button>`;
  document.body.appendChild(bar);

  document.getElementById('push-prompt-yes').onclick = async () => {
    bar.remove();
    localStorage.setItem(PUSH_DISMISSED_KEY, '1');
    await subscribeToPush();
  };
  document.getElementById('push-prompt-no').onclick = () => {
    bar.remove();
    localStorage.setItem(PUSH_DISMISSED_KEY, '1');
  };
}

// §01b.4 ── Sending — called from notifyTG for every event type ─────────
// Short title/body only (OS notification banners truncate aggressively).
const PUSH_TITLES = {
  task_assigned: '📋 New task assigned',
  task_approved: '✅ Task approved',
  task_rejected: '❌ Task rejected',
  task_submitted: '📤 Task submitted for review',
  task_started: '▶ Task started',
  task_overdue: '🚨 Task overdue',
  task_due_soon: '⚠️ Task due tomorrow',
  help_requested: '🤝 Help requested',
  help_accepted: '✅ Help request accepted',
  help_completed: '🏁 Help completed',
  reminder: '⏰ Reminder',
  meeting_invited: '📅 Meeting invite',
  meeting_starting: '🔔 Meeting starting now',
  announcement: '📢 New announcement',
  hr_reply: '💬 HR replied',
  review_requested: '🔍 Review needed',
};

function pushBodyFor(eventType, data, sys) {
  const title = data.title || data.desc || '';
  switch (eventType) {
    case 'task_assigned':   return `"${title}" — ${data.priority || 'Normal'} priority${data.due ? ', due ' + data.due : ''}`;
    case 'task_approved':   return `"${title}" was approved`;
    case 'task_rejected':   return `"${title}" — ${data.reason || 'needs revision'}`;
    case 'task_submitted':  return `"${title}" is ready for your review`;
    case 'help_requested':  return `Help needed on "${title}"`;
    case 'reminder':        return data.desc || 'You have a reminder';
    case 'meeting_invited': return `"${title}" on ${data.date || 'TBD'} at ${data.time || 'TBD'}`;
    case 'announcement':    return data.desc ? data.desc.slice(0, 120) : title;
    case 'hr_reply':        return `Re: ${title}`;
    default:                return title || data.desc || 'You have a new notification';
  }
}

async function sendPushToMember(memberId, eventType, data = {}) {
  const member = DB.team.find((m) => m.id === memberId || (m.name || '').toLowerCase() === (memberId || '').toLowerCase());
  if (!member) return;
  if (member.name === CU?.name) return; // never push to yourself

  const title = PUSH_TITLES[eventType] || `🔔 ${SYS()}`;
  const body = pushBodyFor(eventType, data, SYS());
  const url = data.link || appLink('');

  try {
    await fetch(PUSH_EDGE_FN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
      body: JSON.stringify({ member_id: member.id, title, body, url }),
    });
  } catch (e) {
    console.warn('sendPushToMember error:', e); // never block the rest of notifyTG on push failure
  }
}

async function sendTestPush() {
  if (!CU) return;
  toast('Sending test push…', 'inf');
  try {
    const r = await fetch(PUSH_EDGE_FN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
      body: JSON.stringify({ member_id: CU.id, title: '✅ VAS OS — Test', body: 'If you see this, push notifications are working 🎉', url: appLink('') }),
    });
    if (r.ok) toast('Test sent — check your device', 'ok', 6000);
    else toast('Edge Function error — deploy send-push first (see Settings)', 'bad');
  } catch (e) {
    toast('Could not reach the push function — deploy send-push first', 'bad');
  }
}
