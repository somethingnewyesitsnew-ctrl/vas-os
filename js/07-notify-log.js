// ── Realtime — live delivery for notifications ───────────────────────
// Subscribes to INSERT events on the `notifications` table (not raw
// `tasks` changes, which would be noisy) so a submit-for-review, an
// approval/rejection, a mention, a comment, a reminder, a meeting update,
// or a service-test completion shows up without anyone needing to click
// Refresh or reload the page. This is what was actually missing before —
// sendNotif()/notifyAdmins() only rendered live on the *sender's own*
// screen (an optimistic local render), never on anyone else's, including
// admins watching admin-only broadcasts: their session had no way to
// find out short of loadNotifs() re-running at next login/manual
// refresh. Realtime fixes that for every open session, admin or not,
// since Postgres delivers the INSERT to all subscribed clients and each
// one decides locally whether it's relevant.
const REALTIME_NOTIF_TYPES=['Task Assigned','Task Started','Task Submitted','Review Needed','Task Approved','Task Rejected','Task Deleted','Status Changed','Re-Estimate','Help Request','Help Accepted','Mention','Reminder','Comment','Meeting Created','Meeting Started','Meeting Ended','Meeting Cancelled','Meeting Rescheduled','Service Test Completed','Normal Announcement','Important Announcement','Urgent Announcement'];
let _rtChannel=null;

function startRealtimeNotifs(){
  if(!CU||_rtChannel)return; // not logged in, or already subscribed this session
  if(!sbClient){
    // Supabase SDK didn't load (CDN blocked/slow/failed) — this used to
    // fail completely silently, leaving that session with no live
    // notifications and no live dashboard updates and no visible sign why.
    // Log it clearly and retry shortly rather than giving up for the rest
    // of the session.
    console.error('startRealtimeNotifs: sbClient not ready (Supabase SDK failed to load?) — retrying in 5s');
    setTimeout(()=>{ if(CU&&!_rtChannel) startRealtimeNotifs(); },5000);
    return;
  }
  _rtChannel=sbClient
    .channel('notifications-inserts')
    .on('postgres_changes',{event:'INSERT',schema:'public',table:'notifications'},handleRealtimeNotif)
    .subscribe((status,err)=>{
      if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'||status==='CLOSED'){
        console.error('Realtime notifications connection issue:',status,err||'');
        if(sbClient&&_rtChannel){ sbClient.removeChannel(_rtChannel); }
        _rtChannel=null;
        // Retry with a short backoff instead of leaving this session with
        // no live delivery until the next full page reload.
        setTimeout(()=>{ if(CU) startRealtimeNotifs(); },8000);
      }
    });
}

function stopRealtimeNotifs(){
  if(_rtChannel&&sbClient){ sbClient.removeChannel(_rtChannel); _rtChannel=null; }
}

// Pages whose render function pulls directly from DB.tasks/DB.meetings/
// DB.testSessions/DB.testChecks/DB.reminders — i.e. anywhere a live event
// could visibly change what's on screen, including the Dashboard's
// velocity chart (task-derived) and today's-meetings section (meeting-
// derived), so both admin and member dashboard views pick up live changes
// the same way the task-specific list pages do.
const REALTIME_RERENDER_PAGES=['dash','mytasks','alltasks','toreview','helprequests','meetings','svctest','comments','reminders','announcements','hrcoms'];

async function handleRealtimeNotif(payload){
  const row=payload?.new;
  if(!row||!CU)return;
  if(!REALTIME_NOTIF_TYPES.includes(row.type))return;

  const isOwnEcho=sameName(row.from_name,CU.name);
  const isRelevant=sameName(row.to_name,CU.name)||(row.admins_only&&isAdmin());

  // Personal bell/notifs list: only for events actually addressed to
  // this user (or admin broadcasts), and never our own echoed action —
  // sendNotif() already rendered that locally the instant it happened.
  if(isRelevant&&!isOwnEcho&&!notifs.some(n=>n.id===row.id)){
    const n={
      id:row.id, to:row.to_name||'', from:row.from_name||'',
      text:row.message, type:row.type, taskTitle:row.task_title||'',
      linkType:row.link_type||null, linkId:row.link_id||null,
      adminsOnly:row.admins_only, readBy:row.read_by||[], time:row.created_at
    };
    notifs.unshift(n); notifs=notifs.slice(0,60);
    renderNotifs();
    updateBadges();
  }

  // Data/dashboard refresh runs for EVERY team event regardless of who
  // it's addressed to — not gated by isRelevant. Dashboards (including
  // non-admin member dashboards) show team-wide numbers — leaderboard,
  // tasks-done counts, Employee of the Week — that change whenever
  // anyone on the team does anything, not just when something is
  // addressed to the person currently looking at the screen. Gating
  // this on isRelevant used to mean non-admins' dashboards only ever
  // refreshed live for their own tasks or admin broadcasts, and sat
  // stale for everything else happening elsewhere on the team, while
  // admin appeared to update "instantly" only because nearly every
  // action also fires an admins_only broadcast admin always qualifies
  // for.
  const linkType=row.link_type||null, linkId=row.link_id||null;
  if(linkType==='task'&&linkId&&typeof fetchAndUpsertTask==='function'){
    await fetchAndUpsertTask(linkId);
  } else if(linkType==='meeting'&&linkId&&typeof fetchAndUpsertMeeting==='function'){
    await fetchAndUpsertMeeting(linkId);
  } else if(linkType==='testsession'&&linkId&&typeof fetchAndUpsertTestSession==='function'){
    await fetchAndUpsertTestSession(linkId);
  } else if((row.type==='Reminder'||linkType==='announcement'||linkType==='hrcom')&&typeof initCommsData==='function'){
    // Reminders/announcements/HR comms all live in their own tables,
    // loaded in bulk together (see initCommsData) rather than one row at
    // a time — cheap and infrequent enough that re-fetching that small
    // set is fine, and keeps all three fresh regardless of which one
    // actually triggered this.
    await initCommsData();
  }

  if(REALTIME_RERENDER_PAGES.includes(page)){
    smartRerender(page, document.getElementById('content'));
  }
}

// §07 ── NOTIFICATIONS & LOGGING ────────────────────────────────────────
async function loadNotifs(){
  if(!CU)return;
  const myName=(CU.name||'').trim();
  const params = `order=created_at.desc&limit=40&or=(to_name.ilike.${encodeURIComponent(myName)},admins_only.eq.true)`;
  const data = await sbQ('notifications', params);
  if(Array.isArray(data)){
    notifs = data.map(n=>({...n, readBy: n.read_by||[], time: n.created_at, linkType: n.link_type||null, linkId: n.link_id||null}));
  } else {
    notifs = JSON.parse(localStorage.getItem('v8_notifs_local')||'[]');
  }
  renderNotifs(); updateBadges();
}

// sendNotif/notifyAdmins live in 27-modals-saves.js (the version with
// sameName()-based matching and _linkFromMeta() link support). A stale
// duplicate pair used to live here too, annotated "keep both in sync" —
// but they'd drifted out of sync (this copy used strict === name
// matching and a shorter link-type list) and were fully shadowed by the
// later definitions anyway, so they were dead code either way. Removed
// rather than re-synced, to keep one source of truth.

// ── External notify sheet (Telegram auto-sent + Email manual link) ────
window._notifyMembers={};
function showExternalNotifySheet(memberIds, taskTitle, taskDesc, taskId){
  const members=memberIds.map(id=>DB.team.find(m=>m.id===id)).filter(Boolean).filter(m=>m.telegram||m.email);
  if(!members.length) return;
  const taskLink=taskId?(window.location.href.split('#')[0]+'#task-'+taskId):'';

  // Telegram messages already went out automatically via notifyTG() at
  // task-creation time (a bot can't be "clicked open" the way wa.me could,
  // so there's nothing manual to do here for it — just show status).
  // Email still needs a manual click since we don't have an EmailJS call
  // wired into this particular flow.
  window._notifyMembers={};
  members.forEach(m=>{
    const safeId='nm_'+m.id.replace(/[^a-z0-9]/gi,'_');
    const emailSubj='New Task Assigned: '+taskTitle;
    const emailText='Hi '+m.name+',\n\nYou have been assigned a new task in '+SYS()+':\n\nTitle: '+taskTitle+'\n'+(taskDesc?'Details: '+taskDesc+'\n':'')+'\n'+(taskLink?'Open the task directly:\n'+taskLink+'\n':'')+'Regards,\n'+(CU?.name||SYS());
    window._notifyMembers[safeId]={
      email: m.email?'mailto:'+m.email+'?subject='+encodeURIComponent(emailSubj)+'&body='+encodeURIComponent(emailText):null
    };
  });

  const rows=members.map(m=>{
    const safeId='nm_'+m.id.replace(/[^a-z0-9]/gi,'_');
    return`<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--bd)">
      <span style="width:32px;height:32px;border-radius:50%;background:${m.color};display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff;flex-shrink:0">${m.av}</span>
      <div style="flex:1">
        <div style="font-size:13px;font-weight:600">${esc(m.name)}</div>
        <div style="font-size:10px;color:var(--tx3)">${m.role||''}${m.telegram?' · Telegram':''}${m.email?' · '+m.email:''}</div>
      </div>
      <div style="display:flex;gap:6px">
        ${m.telegram?`<span style="display:inline-flex;align-items:center;gap:4px;padding:6px 12px;background:#e0f2fe;color:#0369a1;border:1px solid #bae6fd;border-radius:7px;font-size:11px;font-weight:700">✈️ Sent via Telegram</span>`:''}
        ${m.email?`<button onclick="openNotifyEmail('${safeId}')" style="display:inline-flex;align-items:center;gap:4px;padding:6px 12px;background:#2563eb18;color:#2563eb;border:1px solid #2563eb33;border-radius:7px;font-size:11px;font-weight:700;cursor:pointer">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 7 10-7"/></svg> Email</button>`:''}
      </div>
    </div>`;
  }).join('');

  document.getElementById('ext-notify-sheet')?.remove();
  const el=document.createElement('div');
  el.id='ext-notify-sheet';
  el.style.cssText='position:fixed;bottom:0;left:0;right:0;z-index:9999;background:var(--bg);border-top:2px solid var(--bd);border-radius:16px 16px 0 0;padding:20px 20px 28px;max-width:560px;margin:0 auto;box-shadow:0 -8px 32px #0005;animation:slideUp .22s ease';
  el.innerHTML=`
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
      <div style="font-size:14px;font-weight:800">Notify Assignees</div>
      <button onclick="document.getElementById('ext-notify-sheet')?.remove()" style="background:none;border:none;font-size:20px;color:var(--tx3);cursor:pointer">✕</button>
    </div>
    <div style="font-size:11px;color:var(--tx3);margin-bottom:12px">Task: <strong style="color:var(--tx)">${taskTitle}</strong></div>
    ${rows}
    <button onclick="document.getElementById('ext-notify-sheet')?.remove()" style="width:100%;margin-top:14px;padding:10px;background:var(--s2);border:1px solid var(--bd);border-radius:8px;color:var(--tx3);font-size:12px;font-weight:600;cursor:pointer">Done</button>`;
  document.body.appendChild(el);
  setTimeout(()=>document.getElementById('ext-notify-sheet')?.remove(),60000);
}

window.openNotifyEmail=(safeId)=>{
  const url=window._notifyMembers?.[safeId]?.email;
  if(url) window.open(url,'_blank'); else toast('No email for this member','bad');
};

// (logAction lives in 09-syslog-persist.js — the richer version with
// syslog persistence + metadata. A stale duplicate stub used to live
// here too; it was always shadowed by the later definition and so was
// dead code. Removed to avoid confusion/regression risk on refactor.)

// ══════════════════════════════════════════════════════
// AUTH
// ══════════════════════════════════════════════════════
// ── Tag-style multi-assignee picker ──────────────────────────────────
let _selectedAssignees = []; // array of member ids

function initAssignPicker(preselected=[]) {
  _selectedAssignees = [...preselected];
  renderAssignTags();
}

function renderAssignTags() {
  const wrap = document.getElementById('tf-assign-tags');
  if (!wrap) return;
  wrap.innerHTML = _selectedAssignees.map(id => {
    const m = DB.team.find(x => x.id === id);
    if (!m) return '';
    return `<span class="atag" style="background:${m.color}">
      <span style="width:14px;height:14px;border-radius:50%;background:rgba(255,255,255,.25);display:inline-flex;align-items:center;justify-content:center;font-size:7px;font-weight:700">${m.av}</span>
      ${m.name.split(' ')[0]}
      <span class="atag-x" onclick="removeAssignTag('${id}')">✕</span>
    </span>`;
  }).join('');
}

function removeAssignTag(id) {
  _selectedAssignees = _selectedAssignees.filter(x => x !== id);
  renderAssignTags();
}

function filterAssignSearch(q) {
  const drop = document.getElementById('tf-assign-drop');
  if (!drop) return;
  const filtered = DB.team.filter(m =>
    !_selectedAssignees.includes(m.id) &&
    (m.name.toLowerCase().includes(q.toLowerCase()) || m.role.toLowerCase().includes(q.toLowerCase()))
  );
  if (!filtered.length) { drop.style.display = 'none'; return; }
  drop.style.display = 'block';
  drop.innerHTML = filtered.map(m =>
    `<div onmousedown="event.preventDefault();addAssignTag('${m.id}')" style="display:flex;align-items:center;gap:8px;padding:7px 11px;cursor:pointer;font-size:12px" onmouseenter="this.style.background='var(--al)'" onmouseleave="this.style.background=''">
      <span style="width:22px;height:22px;border-radius:50%;background:${m.color};display:inline-flex;align-items:center;justify-content:center;font-size:8px;font-weight:700;color:#fff;flex-shrink:0">${m.av}</span>
      <div><div style="font-weight:600">${esc(m.name)}</div><div style="font-size:10px;color:var(--tx3)">${m.role}</div></div>
    </div>`
  ).join('');
}

function addAssignTag(id) {
  if (!_selectedAssignees.includes(id)) {
    _selectedAssignees.push(id);
    renderAssignTags();
  }
  const inp = document.getElementById('tf-assign-search');
  if (inp) { inp.value = ''; }
  document.getElementById('tf-assign-drop').style.display = 'none';
  // keep focus
  setTimeout(() => inp && inp.focus(), 50);
}

function showAssignDrop() {
  filterAssignSearch(document.getElementById('tf-assign-search')?.value || '');
}

function hideAssignDrop() {
  const drop = document.getElementById('tf-assign-drop');
  if (drop) drop.style.display = 'none';
}

function getSelectedAssignees() {
  return [..._selectedAssignees];
}
