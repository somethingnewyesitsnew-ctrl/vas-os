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
      markMemberPushEnabled(true);
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
    markMemberPushEnabled(false);
    updatePushToggleUI();
  } catch (e) {
    console.warn('unsubscribeFromPush error:', e);
    toast('Could not disable push notifications', 'bad');
  }
}

// Records enabled/disabled on the member's `team` row so admins can see,
// at a glance on Team cards, who has push turned on — without needing to
// query every device's subscription. Best-effort: uses the silent
// writer so it never surfaces an error toast if the column isn't there
// yet (run the SQL migration — see README / commit message).
function markMemberPushEnabled(on) {
  if (!CU) return;
  const patch = { push_enabled: !!on, push_updated_at: new Date().toISOString() };
  if (CU.id) sbUpdateSilent('team', CU.id, patch).catch?.(() => {});
  CU.push_enabled = !!on;
  const dbm = DB.team?.find((m) => m.id === CU.id);
  if (dbm) dbm.push_enabled = !!on;
}

// Self-heals team.push_enabled against this device's actual subscription
// state. Covers members who subscribed under an older build (before
// push_enabled existed) or whose browser silently re-subscribed them —
// without this, Team cards can show "Off" for someone who is genuinely
// receiving pushes. Called once per app load from startApp(); cheap and
// harmless to call again if already in sync.
async function syncPushEnabledState(){
  if(!CU || !pushSupported()) return;
  try{
    const granted = Notification.permission==='granted';
    let subscribed = granted && await isPushSubscribedHere();
    // Self-heal a dropped subscription: permission was granted at some
    // point but the actual browser subscription is gone (cleared site
    // data, browser update, service worker reset, endpoint expired,
    // etc.). Without this, that member is silently stuck receiving no
    // push until someone notices and they manually click Enable again —
    // while another member whose subscription never dropped keeps
    // working fine, making the two accounts behave differently for a
    // reason that isn't visible anywhere in the UI.
    if(granted && !subscribed){
      try{
        const reg=_swReg||(await registerPushSW());
        if(reg){
          let sub=await reg.pushManager.getSubscription();
          if(!sub){
            sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:urlBase64ToUint8Array(VAPID_PUBLIC_KEY)});
          }
          const saved=await savePushSubscription(sub.toJSON());
          if(saved){ subscribed=true; console.log('syncPushEnabledState: silently re-subscribed this device to push'); }
        }
      }catch(e){ console.warn('syncPushEnabledState: silent re-subscribe failed:',e); }
    }
    if(!!CU.push_enabled !== subscribed){
      markMemberPushEnabled(subscribed);
      renderPushStatusPill();
    }
  }catch(e){ console.warn('syncPushEnabledState error:', e); }
}

// §01b.7 ── Handle notification taps while the app is already open ──────
// sw.js posts this message instead of calling client.navigate() (which
// only changes the URL bar — the running single-page app never notices,
// so nothing actually loads). This listener does the real in-app
// navigation, so a notification click lands you on the right screen
// whether VAS OS was already open or not.
if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', (event) => {
    const data = event.data || {};
    if (data.type !== 'push-notification-click') return;
    if (!CU) return; // not logged in yet — the normal hash handling on next login covers it

    let hash = '';
    try { hash = new URL(data.url, location.href).hash; }
    catch (e) { hash = data.url && data.url.includes('#') ? '#' + data.url.split('#')[1] : ''; }

    if (hash.startsWith('#task-') && typeof openTaskDeepLink === 'function') {
      openTaskDeepLink(hash.replace('#task-', ''));
    } else if (hash === '#meetings' && typeof navTo === 'function') {
      navTo('meetings');
    } else if (hash === '#hrcoms' && typeof navTo === 'function') {
      navTo('hrcoms');
    } else if (hash === '#announcements' && typeof navTo === 'function') {
      navTo('announcements');
    }
  });
}

async function isPushSubscribedHere() {
  if (!pushSupported()) return false;
  const sub = await getExistingPushSubscription();
  return !!sub;
}

function updatePushToggleUI() {
  const el = document.getElementById('push-status-box');
  if (el) {
    isPushSubscribedHere().then((on) => {
      el.innerHTML = pushToggleHTML(on);
    });
  }
  renderPushStatusPill();
}

// §01b.5 ── Persistent header pill (all users, every page) ──────────────
// Unlike the Settings toggle (admin-only page) or the one-time dismissible
// prompt bar, this lives in #page-header next to the page title and is
// always visible/always accurate — members without Settings access still
// get a clear "notifications are off" nudge with a one-tap fix.
async function renderPushStatusPill() {
  const host = document.getElementById('push-status-pill');
  if (!host || !CU) return;
  if (!pushSupported()) { host.style.display = 'none'; return; }

  const perm = Notification.permission;
  const on = perm === 'granted' && (await isPushSubscribedHere());
  host.style.display = 'inline-flex';

  if (on) {
    host.innerHTML = `<span style="display:inline-flex;align-items:center;gap:6px;background:#dcfce7;color:#16a34a;font-size:11px;font-weight:700;padding:3px 6px 3px 10px;border-radius:20px;border:1px solid #86efac;white-space:nowrap">
      🔔 Notifications on
      <button onclick="sendTestPush()" style="background:#16a34a;color:#fff;border:none;border-radius:14px;padding:2px 9px;font-size:10px;font-weight:800;cursor:pointer">🧪 Test</button>
    </span>`;
    return;
  }
  const blocked = perm === 'denied';
  host.innerHTML = `<span style="display:inline-flex;align-items:center;gap:6px;background:#fef3c7;color:#b45309;font-size:11px;font-weight:700;padding:3px 6px 3px 10px;border-radius:20px;border:1px solid #fcd34d;white-space:nowrap">
    🔕 ${blocked ? 'Notifications blocked' : 'Notifications off'}
    <button onclick="${blocked ? "toast('Enable notifications for this site in your browser settings, then reload the page','inf',7000)" : 'subscribeToPush()'}" style="background:#b45309;color:#fff;border:none;border-radius:14px;padding:2px 10px;font-size:10px;font-weight:800;cursor:pointer">${blocked ? 'Fix' : 'Enable'}</button>
  </span>`;
}

// §01b.6 ── Team-card badge — who has push on/off ────────────────────────
// Reads the member's `push_enabled` column (kept in sync by
// markMemberPushEnabled above). Falls back to a neutral "unknown" pill
// for members who've never touched the setting so it never looks like a
// false "off" for someone who simply predates this feature.
function pushBadgeHTML(member) {
  if (member?.push_enabled === true) {
    return `<span title="Push notifications enabled" style="background:#dcfce7;color:#16a34a;border:1px solid #86efac;font-size:10px;font-weight:600;padding:2px 7px;border-radius:5px">🔔 On</span>`;
  }
  if (member?.push_enabled === false) {
    return `<span title="Push notifications not enabled" style="background:var(--s2);color:var(--tx3);border:1px solid var(--bd);font-size:10px;font-weight:600;padding:2px 7px;border-radius:5px">🔕 Off</span>`;
  }
  return `<span title="Notification status unknown — not yet set up" style="background:var(--s2);color:var(--tx3);border:1px solid var(--bd);font-size:10px;font-weight:600;padding:2px 7px;border-radius:5px">🔕 Not set up</span>`;
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

// Who-did-what phrasing for the push title, e.g. "✅ Aymoon approved your
// task" instead of a bare "Task approved" — the banner used to say what
// happened but never who did it. Deliberately excludes the automated/
// system-triggered types (task_overdue, task_due_soon, meeting_starting)
// since those aren't performed by a specific person.
const PUSH_ACTIONS = {
  task_assigned: 'assigned you a task',
  task_approved: 'approved your task',
  task_rejected: 'rejected your task',
  task_submitted: 'submitted a task for review',
  task_started: 'started a task',
  help_requested: 'requested help',
  help_accepted: 'accepted your help request',
  help_completed: 'completed a help request',
  reminder: 'sent you a reminder',
  meeting_invited: 'invited you to a meeting',
  announcement: 'posted an announcement',
  hr_reply: 'replied to HR',
  review_requested: 'needs your review',
};

function pushTitleFor(eventType, actorName) {
  const base = PUSH_TITLES[eventType] || `🔔 ${SYS()}`;
  const action = PUSH_ACTIONS[eventType];
  if (!action || !actorName) return base;
  const icon = base.split(' ')[0]; // reuse the type's existing emoji
  return `${icon} ${actorName} ${action}`;
}

function pushBodyFor(eventType, data, sys) {
  const title = data.title || data.desc || '';
  switch (eventType) {
    case 'task_assigned':   return `"${title}" — ${data.priority || 'Normal'} priority${data.due ? ', due ' + data.due : ''}`;
    case 'task_approved':   return `"${title}"`;
    case 'task_rejected':   return `"${title}" — ${data.reason || 'needs revision'}`;
    case 'task_submitted':  return `"${title}"`;
    case 'help_requested':  return `"${title}"`;
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
  if(sameName(member.name,CU?.name)) return; // never push to yourself

  const title = pushTitleFor(eventType, CU?.name || '');
  const body = pushBodyFor(eventType, data, SYS());
  const url = data.link || appLink('');

  try {
    const r = await fetch(PUSH_EDGE_FN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
      body: JSON.stringify({ member_id: member.id, title, body, url }),
    });
    // The function answers 200 even with nothing to send to (no
    // push_subscriptions row for this member) — surface that in the
    // console instead of it being silently indistinguishable from a
    // real successful delivery.
    if (r.ok) {
      const result = await r.json().catch(() => null);
      if (result && result.sent === 0) {
        console.warn(`sendPushToMember: 0 devices reached for ${member.name} — no active push subscription`);
      }
    }
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
      body: JSON.stringify({ member_id: CU.id, title: '✅ Digital Plus OS — Test', body: 'If you see this, push notifications are working 🎉', url: appLink('') }),
    });
    if (!r.ok) { toast('Edge Function error — deploy send-push first (see Settings)', 'bad'); return; }
    // The function itself always answers 200, even when there was nothing
    // to send to — a member with no push_subscriptions row (never
    // completed subscribing, or their subscription got pruned as dead)
    // gets { sent: 0 } back with no HTTP-level error at all. Checking
    // only r.ok used to show "Test sent — check your device" in that case
    // too, which hid exactly the problem it should have revealed.
    let result = null;
    try { result = await r.json(); } catch (e) {}
    if (result && result.sent > 0) {
      toast(`Test sent to ${result.sent} device${result.sent>1?'s':''} — check your device`, 'ok', 6000);
    } else {
      toast('No active push subscription found for your account — tap "Enable" on the notification pill and grant permission again', 'bad', 8000);
    }
  } catch (e) {
    toast('Could not reach the push function — deploy send-push first', 'bad');
  }
}
