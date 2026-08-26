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

// ── Telegram Bot ──────────────────────────────────────────────────────
// Create a bot via @BotFather on Telegram, paste its token below (or move
// it into Settings → a config field if you want it editable without a
// redeploy). Each team member must open a chat with the bot and press
// Start once — you then paste their numeric chat_id into their profile
// (Team → Edit Member → Telegram Chat ID). Bots cannot message a user
// who hasn't started a conversation with them first — this mirrors the
// old "member activates once" WhatsApp/CallMeBot setup.
const TG_BOT_TOKEN='PASTE_YOUR_BOT_TOKEN_HERE';
const TG_API_BASE=`https://api.telegram.org/bot${TG_BOT_TOKEN}`;

async function sendTG(member, msg){
  if(!member?.telegram) return;
  const chatId=String(member.telegram).trim();
  if(!chatId) return;
  try{
    await fetch(`${TG_API_BASE}/sendMessage`,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({chat_id:chatId, text:msg, parse_mode:'Markdown'})
    });
    logAction('Telegram Sent',`Telegram sent to ${member.name}`,'Info','','');
  } catch(e){ console.warn('Telegram error:',e); }
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
async function notifyTG(memberId, eventType, data={}){
  const member=DB.team.find(m=>m.id===memberId||(m.name||'').toLowerCase()===(memberId||'').toLowerCase());
  if(!member) return;
  if(sameName(member.name,CU?.name)) return; // never notify yourself
  // Push notification — independent of Telegram being configured. Fires
  // for every event/member regardless of whether member.telegram is set,
  // since push only needs a push_subscriptions row (see 01-push-notifications.js).
  if (typeof sendPushToMember === 'function') sendPushToMember(memberId, eventType, data).catch?.(()=>{});
  if(!member.telegram) return; // no Telegram chat id — skip Telegram send only
  const sys=SYS();
  const by=CU?.name||'System';
  const link=data.link||'';
  let msg='';

  switch(eventType){
    case 'task_assigned':
      msg=`🔔 *${sys}*\n\nHi ${member.name}! A new task has been assigned to you.\n\n📋 *${data.title||'Task'}*\n⚡ Priority: ${data.priority||'Normal'}\n📅 Due: ${data.due||'Not set'}\n👤 Assigned by: ${by}${data.desc?'\n\n'+data.desc.slice(0,200):''}${link?'\n\n🔗 '+link:''}`;
      break;
    case 'task_approved':
      msg=`✅ *${sys}*\n\nHi ${member.name}! Your task has been approved.\n\n📋 *${data.title||'Task'}*\n👤 Approved by: ${by}${data.note?'\n💬 Note: '+data.note:''}${link?'\n\n🔗 '+link:''}`;
      break;
    case 'task_rejected':
      msg=`❌ *${sys}*\n\nHi ${member.name}! Your task was rejected and needs revision.\n\n📋 *${data.title||'Task'}*\n👤 Rejected by: ${by}${data.reason?'\n💬 Reason: '+data.reason:''}${link?'\n\n🔗 '+link:''}`;
      break;
    case 'task_submitted':
      msg=`📤 *${sys}*\n\nHi ${member.name}! A task has been submitted for your review.\n\n📋 *${data.title||'Task'}*\n⚡ Priority: ${data.priority||'Normal'}\n👤 Submitted by: ${by}${link?'\n\n🔗 '+link:''}`;
      break;
    case 'review_requested':
      msg=`🔍 *${sys}*\n\nHi ${member.name}! You have a task waiting for your review.\n\n📋 *${data.title||'Task'}*\n👤 From: ${by}${link?'\n\n🔗 '+link:''}`;
      break;
    case 'help_requested':
      msg=`🤝 *${sys}*\n\nHi ${member.name}! Your help has been requested.\n\n📋 *${data.title||'Task'}*\n👤 Requested by: ${by}${data.desc?'\n\n📝 '+data.desc.slice(0,200):''}${link?'\n\n🔗 '+link:''}`;
      break;
    case 'help_accepted':
      msg=`✅ *${sys}*\n\nHi ${member.name}! Your help request was accepted.\n\n📋 *${data.title||'Task'}*\n👤 Accepted by: ${by}${link?'\n\n🔗 '+link:''}`;
      break;
    case 'help_completed':
      msg=`🏁 *${sys}*\n\nHi ${member.name}! Help has been completed on your task.\n\n📋 *${data.title||'Task'}*\n👤 Completed by: ${by}${link?'\n\n🔗 '+link:''}`;
      break;
    case 'reminder':
      msg=`⏰ *${sys}* — Reminder\n\nHi ${member.name}!\n\n${data.desc||'You have a reminder.'}\n👤 From: ${by}${link?'\n\n🔗 '+link:''}`;
      break;
    case 'meeting_invited':
      msg=`📅 *${sys}*\n\nHi ${member.name}! You've been invited to a meeting.\n\n🗓 *${data.title||'Meeting'}*\n📆 Date: ${data.date||'TBD'} at ${data.time||'TBD'}\n📍 ${data.location||'See details'}\n👤 Organised by: ${by}${link?'\n\n🔗 '+link:''}`;
      break;
    case 'meeting_starting':
      msg=`🔔 *${sys}*\n\nHi ${member.name}! Your meeting is starting now.\n\n🗓 *${data.title||'Meeting'}*\n📍 ${data.location||''}${link?'\n\n🔗 '+link:''}`;
      break;
    case 'announcement':
      msg=`📢 *${sys}* — Announcement\n\n*${data.title||'New Announcement'}*\n\n${data.desc||''}${link?'\n\n🔗 '+link:''}`;
      break;
    case 'hr_reply':
      msg=`💬 *${sys}* — HR Update\n\nHi ${member.name}! Your HR communication has received a reply.\n\n📝 Re: ${data.title||'Your message'}\n👤 From: ${by}${link?'\n\n🔗 '+link:''}`;
      break;
    case 'task_due_soon':
      msg=`⚠️ *${sys}* — Due Tomorrow\n\nHi ${member.name}! A task is due tomorrow.\n\n📋 *${data.title||'Task'}*\n⚡ Priority: ${data.priority||'Normal'}${link?'\n\n🔗 '+link:''}`;
      break;
    case 'task_overdue':
      msg=`🚨 *${sys}* — Overdue\n\nHi ${member.name}! A task is overdue.\n\n📋 *${data.title||'Task'}*\n⚡ Priority: ${data.priority||'Normal'}\n📅 Was due: ${data.due||'?'}${link?'\n\n🔗 '+link:''}`;
      break;
    case 'mention':
      msg=`💬 *${sys}*\n\nHi ${member.name}! ${by} mentioned you in a comment on "${data.title||'a task'}".\n\n${data.text?'"'+data.text.slice(0,200)+'"':''}${link?'\n\n🔗 '+link:''}`;
      break;
    default:
      msg=`🔔 *${sys}*\n\nHi ${member.name}! ${data.desc||'You have a new notification.'}${link?'\n\n🔗 '+link:''}`;
  }
  await sendTG(member, msg);
}

// ── Email (unchanged) ─────────────────────────────────────────────────
async function sendEmailNotif(member, taskTitle, taskPriority, taskDue, taskDesc, taskId){
  const cfg=getNotifCfg();
  if(!cfg.emailjs_public_key||!cfg.emailjs_service_id||!cfg.emailjs_template_id)return;
  if(!member?.email){return;}
  try{
    emailjs.init(cfg.emailjs_public_key);
    const taskLink=appLink('task-'+taskId);
    await emailjs.send(cfg.emailjs_service_id, cfg.emailjs_template_id,{
      to_email: member.email, to_name: member.name,
      task_title: taskTitle, task_priority: taskPriority||'Normal',
      task_due: taskDue||'Not set',
      task_desc: taskDesc?taskDesc.slice(0,300):'No description',
      task_link: taskLink, assigned_by: CU?.name||'System',
      sys_name: SYS()
    });
    logAction('Email Sent',`Email sent to ${member.name} for task "${taskTitle}"`,'Info',taskTitle,'');
  } catch(e){ console.warn('EmailJS error:',e); }
}

// ── Legacy shim so existing calls still work ─────────────────────────
async function notifyMemberExternal(memberId, taskTitle, taskPriority, taskDue, taskDesc, taskId){
  const member=DB.team.find(m=>m.id===memberId||(m.name||'').toLowerCase()===(memberId||'').toLowerCase());
  if(!member||member.name===CU?.name) return;
  const cfg=getNotifCfg();
  const link=appLink('task-'+taskId);
  await notifyTG(memberId,'task_assigned',{title:taskTitle,priority:taskPriority,due:taskDue,desc:taskDesc,link});
  if(cfg.email_enabled&&member.email) await sendEmailNotif(member,taskTitle,taskPriority,taskDue,taskDesc,taskId);
}
// legacy alias
const sendTGNotif=notifyMemberExternal;


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
