// ╔══════════════════════════════════════════════════════════════════════╗
// ║                    VAS OS v2.5 — SCRIPT INDEX                      ║
// ║  Search for §XX to jump to any section                             ║
// ╠══════════════════════════════════════════════════════════════════════╣
// ║  §01  TELEGRAM / NOTIFICATIONS  (~L892)                            ║
// ║  §02  UTILITIES — toast, OM, CM, SP, share  (~L1062)              ║
// ║  §03  SUPABASE — sbQ, sbInsert, sbUpdate  (~L1122)                ║
// ║  §04  MEMBER TYPES & PERMISSIONS  (~L1182)                         ║
// ║  §05  DATA LOAD — loadFromNotion, refreshData  (~L1205)            ║
// ║  §06  TASK PAYLOAD & DB WRITES  (~L1352)                           ║
// ║  §07  NOTIFICATIONS — sendNotif, logAction  (~L1562)               ║
// ║  §08  AUTH — doLogin, startApp, nav  (~L1715)                      ║
// ║  §09  LOG — getPersistedLog, logAction v2  (~L1999)                ║
// ║  §10  DASHBOARD — rDash  (~L2248)                                  ║
// ║  §11  TASKS — rMyTasks, rAllTasks, rToReview  (~L2949)             ║
// ║  §12  TODOS & REMINDERS — rTodos, rReminders  (~L3153)             ║
// ║  §13  PROJECTS — rProjects, openProjectDetail  (~L3319)            ║
// ║  §14  TEAM & EVAL — rTeam, rEval  (~L3427)                         ║
// ║  §15  BACKLOG — rBacklog  (~L4052)                                 ║
// ║  §16  SERVICES & OPERATORS  (~L4101)                               ║
// ║  §17  LIBRARY — rLibrary, CF access  (~L4309)                      ║
// ║  §18  DOCS & ARCHIVE — rDocs, rArchive  (~L4634)                   ║
// ║  §19  MEETINGS — rMeetings, openMeetingDetail  (~L5207)            ║
// ║  §20  SERVICE TESTS — rSvcTest, sessions  (~L5792)                 ║
// ║  §21  SETTINGS — rSettings, lists, backup  (~L6377)                ║
// ║  §22  SYSTEM LOG — rSyslog  (~L6947)                               ║
// ║  §23  HR COMMS & ANNOUNCEMENTS  (~L7099)                           ║
// ║  §24  COMMENTS — rComments  (~L8003)                               ║
// ║  §25  TUTORIAL — showTutStep  (~L8196)                             ║
// ║  §26  TASK PANEL — openTask, approve, reject  (~L8256)             ║
// ║  §27  MODALS — openTaskModal, saveTask, etc  (~L8807)              ║
// ║  §28  BADGES & MOBILE NAV  (~L9369)                                ║
// ║  §29  INIT — preload, clock, mobile menu  (~L9470)                 ║
// ╚══════════════════════════════════════════════════════════════════════╝

// ══ SECURITY — real, not theater ═════════════════════════════════════
// The old "anti-inspection" block (blocking right-click / F12 / Ctrl+P /
// console.clear loop) provided zero actual security — all secrets are
// still visible in page source regardless — and it broke the Ctrl+P
// keyboard shortcut for the Reports page's "Export PDF" feature. Removed.
//
// escapeHtml() is the real fix: every place user-entered text (task
// titles/descriptions, comments, todo/backlog text, HR messages,
// announcements, library entries, meeting titles, member names/notes...)
// gets interpolated into innerHTML, it should be run through this first
// to prevent stored XSS. Usage: `${escapeHtml(t.title)}` instead of
// `${t.title}` anywhere the value came from a text input/textarea.
function escapeHtml(str){
  if(str===null||str===undefined) return '';
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
}
// Alias some code may reach for
const esc=escapeHtml;

// ══ EXTERNAL NOTIFICATIONS (EmailJS + Telegram Bot) ══════════════════
const NOTIF_CFG_KEY='vas_notif_config';
function getNotifCfg(){
  try{return JSON.parse(localStorage.getItem(NOTIF_CFG_KEY)||'{}');}catch(e){return{};}
}

// ── Deep link builder ─────────────────────────────────────────────────
function appLink(hash){ return window.location.href.split('#')[0]+(hash?'#'+hash:''); }
const SYS=()=>localStorage.getItem('vas_sys_name')||'Digital Plus OS';

// ── Universal notifier — one function for every event type ────────────
// eventType: 'task_assigned' | 'task_approved' | 'task_rejected' | 'task_submitted'
//            | 'task_started' | 'task_overdue' | 'task_due_soon'
//            | 'help_requested' | 'help_accepted' | 'help_completed'
//            | 'reminder' | 'meeting_invited' | 'meeting_starting'
//            | 'announcement' | 'hr_reply' | 'review_requested'
//
// PUSH IS THE ONLY ACTIVE CHANNEL (as of 2026-08-27). Telegram Bot API and
// EmailJS delivery were archived to cut wasted network calls (dead-token
// Telegram sends were firing on every event) and page weight (the EmailJS
// CDN script tag loaded on every session for a code path nothing ever
// called). Full working implementations — sendTG(), the per-event message
// builder, sendEmailNotif(), and the notifyMemberExternal()/sendTGNotif
// legacy shim — are preserved in js/archived/legacy-notification-channels.js
// (not loaded by material.html/index.html). To restore either channel:
//   1. Re-add the EmailJS <script> tag to material.html + index.html (for email)
//   2. Add js/archived/legacy-notification-channels.js as a <script> tag
//      (same order position, after this file) to both HTML files
//   3. Uncomment the `await sendTG(member, msg)` call this function used to
//      end with, rebuilding `msg` via the archived switch statement, or call
//      notifyMemberExternal() directly wherever notifyTG() is called for
//      task-assignment events if you want email back too
async function notifyTG(memberId, eventType, data={}){
  const member=DB.team.find(m=>m.id===memberId||(m.name||'').toLowerCase()===(memberId||'').toLowerCase());
  if(!member) return;
  if(sameName(member.name,CU?.name)) return; // never notify yourself
  // Push notification — the sole active delivery channel. Fires for every
  // event/member since push only needs a push_subscriptions row (see
  // 01-push-notifications.js).
  if (typeof sendPushToMember === 'function') sendPushToMember(memberId, eventType, data).catch?.(()=>{});
}


// NOTION DB IDs — verified exact schemas
// ══════════════════════════════════════════════════════
// ══ APP VERSION ══════════════════════════════════════════════════════
// Bumped by hand on every commit that changes app behavior (not just
// docs/comments). Combined at runtime with the live commit SHA fetched
// from GitHub (see loadVersionBadge() in 29-init-mobile.js) so the
// sidebar always shows exactly what's deployed, automatically.
const APP_VERSION='4.3.0';
const APP_REPO='somethingnewyesitsnew-ctrl/vas-os';

const NDB={
  tasks:'4abbbc95-3f15-4f9e-83dc-ee63b1439ccc',
  team:'bd03669e-f3c8-482c-b817-476f4878a695',
  services:'3741c99b-4f46-4dfd-98ee-0b08751666cc',
  companies:'dfc81ed6-95ed-4d0e-9053-d3748496cdc3', // operators too
  backlog:'9a9576d1-f2d5-4a10-9fc2-061430d66ba0',
  docs:'92a34ab5-e48e-424c-a6c3-e761a7809577',
  archive:'4c255b57-db98-4adb-82ea-608b6509a72a',
  syslog:'db7c0457-3e12-4c47-b920-3f0c33ebdfe4',
  todos:'3168766f-dc17-402b-9852-6648c4a33d17',
};

// Maps local id → Notion page URL (for updates/deletes)
// NID removed — Supabase uses table UUIDs directly

// ══════════════════════════════════════════════════════
// UTILS
// ══════════════════════════════════════════════════════
const now=()=>new Date().toISOString();

function calcNextDue(currentDue, recur){
  const base=currentDue?new Date(currentDue):new Date();
  const d=new Date(base);
  switch(recur){
    case 'daily':    d.setDate(d.getDate()+1); break;
    case 'weekly':   d.setDate(d.getDate()+7); break;
    case 'biweekly': d.setDate(d.getDate()+14); break;
    case 'monthly':  d.setMonth(d.getMonth()+1); break;
    default:         d.setDate(d.getDate()+7);
  }
  return d.toISOString().split('T')[0];
}
const gid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,5);
const fd=(d)=>{if(!d)return'—';return new Date(d).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})};
const fdt=(d)=>{if(!d)return'—';const dt=new Date(d);return fd(d)+' '+String(dt.getHours()).padStart(2,'0')+':'+String(dt.getMinutes()).padStart(2,'0')};
const fr=(d)=>{if(!d)return'';const m=Math.floor((Date.now()-new Date(d))/60000);if(m<1)return'just now';if(m<60)return m+'m ago';const h=Math.floor(m/60);if(h<24)return h+'h ago';return Math.floor(h/24)+'d ago'};
const hb=(a,b)=>{if(!a||!b)return null;const ms=new Date(b)-new Date(a);if(isNaN(ms)||ms<0)return null;return Math.round(ms/36000)/100;};
const dur=(h)=>{if(h===null)return'—';return h<1?Math.round(h*60)+'m':h+'h'};
const mkColor=(n)=>{const c=['#4f46e5','#7c3aed','#0369a1','#047857','#b45309','#be185d','#dc2626','#374151'];let h=0;for(let i=0;i<(n||'').length;i++)h=(n||'').charCodeAt(i)+((h<<5)-h);return c[Math.abs(h)%c.length]};
const mkAv=(n)=>(n||'??').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
// Case/whitespace-tolerant name match — used wherever a member's name is
// compared against CU.name to decide if a notification/event is theirs.
// A plain === here is fragile: a single stray trailing space or a casing
// difference introduced whenever a team record was created/edited is
// enough to make a specific member silently stop matching, while every
// other member (whose name happens to be clean) keeps working fine.
const sameName=(a,b)=>!!a&&!!b&&String(a).trim().toLowerCase()===String(b).trim().toLowerCase();
