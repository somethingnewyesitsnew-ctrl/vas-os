// ══════════════════════════════════════════════════════════════════════
// ARCHIVED — Telegram Bot + EmailJS notification channels
// ══════════════════════════════════════════════════════════════════════
// Disabled 2026-08-27 to reduce network calls and page weight:
//  - Telegram: TG_BOT_TOKEN was still the placeholder value
//    'PASTE_YOUR_BOT_TOKEN_HERE', meaning any member with a Telegram Chat
//    ID saved (via Settings → test) caused a real, always-failing fetch()
//    to api.telegram.org on every single notifyTG() call — wasted
//    round-trips on every task assignment, comment, mention, reminder,
//    meeting, HR message, and announcement across the whole team.
//  - Email: notifyMemberExternal() (the only caller of sendEmailNotif())
//    was never actually called anywhere in the live codebase — it was
//    dead code. The EmailJS CDN <script> tag was still loading on every
//    single page load in material.html and index.html for a path that
//    never executed.
//
// Push notifications (js/01-push-notifications.js, called directly from
// notifyTG() in js/00-core-preamble.js) are unaffected and remain the
// sole active delivery channel.
//
// THIS FILE IS NOT LOADED — it has no <script> tag in material.html or
// index.html, so it costs nothing at runtime. It exists purely so this
// working code doesn't have to be rewritten from scratch if these
// channels are ever needed again.
//
// ── To restore Telegram ─────────────────────────────────────────────
//  1. Add `<script src="js/archived/legacy-notification-channels.js">`
//     to BOTH material.html and index.html, in the same <script> order
//     position, right after js/00-core-preamble.js.
//  2. Paste a real bot token into TG_BOT_TOKEN below (via @BotFather).
//  3. In js/00-core-preamble.js, inside notifyTG(), after the push line,
//     add back:
//       if(!member.telegram) return;
//       const msg = buildTGMessage(member, eventType, data);
//       await sendTG(member, msg);
//
// ── To restore Email ─────────────────────────────────────────────────
//  1. Add back to material.html + index.html:
//       <script src="https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js"></script>
//  2. Add the <script> tag for this file (see above) if not already added.
//  3. Call notifyMemberExternal() (below) wherever a task-assignment
//     notification is sent, or wire sendEmailNotif() into notifyTG()
//     directly.
//  4. Restore the Email/Telegram settings UI in js/21-settings.js — see
//     git history for that file around 2026-08-27 for the removed
//     "Email via EmailJS" / "Telegram via Bot API" cards and their
//     saveNotifConfig() / testTGDirect() handlers.
// ══════════════════════════════════════════════════════════════════════

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

// ── Per-event Telegram message builder ─────────────────────────────────
// (Split out from the old inline notifyTG() switch so it can be called
// standalone when restoring — see restore instructions above.)
function buildTGMessage(member, eventType, data={}){
  const sys=SYS();
  const by=CU?.name||'System';
  const link=data.link||'';
  switch(eventType){
    case 'task_assigned':
      return `🔔 *${sys}*\n\nHi ${member.name}! A new task has been assigned to you.\n\n📋 *${data.title||'Task'}*\n⚡ Priority: ${data.priority||'Normal'}\n📅 Due: ${data.due||'Not set'}\n👤 Assigned by: ${by}${data.desc?'\n\n'+data.desc.slice(0,200):''}${link?'\n\n🔗 '+link:''}`;
    case 'task_approved':
      return `✅ *${sys}*\n\nHi ${member.name}! Your task has been approved.\n\n📋 *${data.title||'Task'}*\n👤 Approved by: ${by}${data.note?'\n💬 Note: '+data.note:''}${link?'\n\n🔗 '+link:''}`;
    case 'task_rejected':
      return `❌ *${sys}*\n\nHi ${member.name}! Your task was rejected and needs revision.\n\n📋 *${data.title||'Task'}*\n👤 Rejected by: ${by}${data.reason?'\n💬 Reason: '+data.reason:''}${link?'\n\n🔗 '+link:''}`;
    case 'task_submitted':
      return `📤 *${sys}*\n\nHi ${member.name}! A task has been submitted for your review.\n\n📋 *${data.title||'Task'}*\n⚡ Priority: ${data.priority||'Normal'}\n👤 Submitted by: ${by}${link?'\n\n🔗 '+link:''}`;
    case 'review_requested':
      return `🔍 *${sys}*\n\nHi ${member.name}! You have a task waiting for your review.\n\n📋 *${data.title||'Task'}*\n👤 From: ${by}${link?'\n\n🔗 '+link:''}`;
    case 'help_requested':
      return `🤝 *${sys}*\n\nHi ${member.name}! Your help has been requested.\n\n📋 *${data.title||'Task'}*\n👤 Requested by: ${by}${data.desc?'\n\n📝 '+data.desc.slice(0,200):''}${link?'\n\n🔗 '+link:''}`;
    case 'help_accepted':
      return `✅ *${sys}*\n\nHi ${member.name}! Your help request was accepted.\n\n📋 *${data.title||'Task'}*\n👤 Accepted by: ${by}${link?'\n\n🔗 '+link:''}`;
    case 'help_completed':
      return `🏁 *${sys}*\n\nHi ${member.name}! Help has been completed on your task.\n\n📋 *${data.title||'Task'}*\n👤 Completed by: ${by}${link?'\n\n🔗 '+link:''}`;
    case 'reminder':
      return `⏰ *${sys}* — Reminder\n\nHi ${member.name}!\n\n${data.desc||'You have a reminder.'}\n👤 From: ${by}${link?'\n\n🔗 '+link:''}`;
    case 'meeting_invited':
      return `📅 *${sys}*\n\nHi ${member.name}! You've been invited to a meeting.\n\n🗓 *${data.title||'Meeting'}*\n📆 Date: ${data.date||'TBD'} at ${data.time||'TBD'}\n📍 ${data.location||'See details'}\n👤 Organised by: ${by}${link?'\n\n🔗 '+link:''}`;
    case 'meeting_starting':
      return `🔔 *${sys}*\n\nHi ${member.name}! Your meeting is starting now.\n\n🗓 *${data.title||'Meeting'}*\n📍 ${data.location||''}${link?'\n\n🔗 '+link:''}`;
    case 'announcement':
      return `📢 *${sys}* — Announcement\n\n*${data.title||'New Announcement'}*\n\n${data.desc||''}${link?'\n\n🔗 '+link:''}`;
    case 'hr_reply':
      return `💬 *${sys}* — HR Update\n\nHi ${member.name}! Your HR communication has received a reply.\n\n📝 Re: ${data.title||'Your message'}\n👤 From: ${by}${link?'\n\n🔗 '+link:''}`;
    case 'task_due_soon':
      return `⚠️ *${sys}* — Due Tomorrow\n\nHi ${member.name}! A task is due tomorrow.\n\n📋 *${data.title||'Task'}*\n⚡ Priority: ${data.priority||'Normal'}${link?'\n\n🔗 '+link:''}`;
    case 'task_overdue':
      return `🚨 *${sys}* — Overdue\n\nHi ${member.name}! A task is overdue.\n\n📋 *${data.title||'Task'}*\n⚡ Priority: ${data.priority||'Normal'}\n📅 Was due: ${data.due||'?'}${link?'\n\n🔗 '+link:''}`;
    case 'mention':
      return `💬 *${sys}*\n\nHi ${member.name}! ${by} mentioned you in a comment on "${data.title||'a task'}".\n\n${data.text?'"'+data.text.slice(0,200)+'"':''}${link?'\n\n🔗 '+link:''}`;
    default:
      return `🔔 *${sys}*\n\nHi ${member.name}! ${data.desc||'You have a new notification.'}${link?'\n\n🔗 '+link:''}`;
  }
}

// ── Email ────────────────────────────────────────────────────────────
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

// ── Legacy shim so existing calls still work if restored ─────────────
async function notifyMemberExternal(memberId, taskTitle, taskPriority, taskDue, taskDesc, taskId){
  const member=DB.team.find(m=>m.id===memberId||(m.name||'').toLowerCase()===(memberId||'').toLowerCase());
  if(!member||member.name===CU?.name) return;
  const cfg=getNotifCfg();
  const link=appLink('task-'+taskId);
  await sendTG(member, buildTGMessage(member,'task_assigned',{title:taskTitle,priority:taskPriority,due:taskDue,desc:taskDesc,link}));
  if(cfg.email_enabled&&member.email) await sendEmailNotif(member,taskTitle,taskPriority,taskDue,taskDesc,taskId);
}
// legacy alias
const sendTGNotif=notifyMemberExternal;

// ── Settings UI (for reference — was in js/21-settings.js) ────────────
// The "Email via EmailJS" / "Telegram via Bot API" cards, their
// saveNotifConfig() / testTGDirect() / testNotifConfig handlers, were
// removed from js/21-settings.js on 2026-08-27. Reference implementations:

window.saveNotifConfig=()=>{
  const cfg={
    email_enabled: document.getElementById('cfg-email-enabled')?.checked||false,
    emailjs_public_key: document.getElementById('cfg-ejs-pub')?.value.trim()||'',
    emailjs_service_id: document.getElementById('cfg-ejs-svc')?.value.trim()||'',
    emailjs_template_id: document.getElementById('cfg-ejs-tpl')?.value.trim()||'',
  };
  localStorage.setItem(NOTIF_CFG_KEY,JSON.stringify(cfg));
  toast('Settings saved ✓','ok');
};

window.testTGDirect=async()=>{
  const chatId=(document.getElementById('cfg-tg-test-id')?.value||'').trim();
  if(!chatId){toast('Enter a Telegram Chat ID first','bad');return;}
  toast('Sending test message…','inf');
  try{
    const sys=SYS();
    const msg=`✅ *${sys}* — Test\n\nHi! This is a test notification from ${sys}.\n\nIf you received this, Telegram notifications are working correctly. 🎉`;
    const res=await fetch(`${TG_API_BASE}/sendMessage`,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({chat_id:chatId, text:msg, parse_mode:'Markdown'})
    });
    const data=await res.json().catch(()=>({}));
    if(data.ok){
      if(!CU.telegram){CU.telegram=chatId;const m=DB.team.find(x=>x.id===CU.id);if(m){m.telegram=chatId;await nMemberUpd(m);}}
      toast('✅ Test sent! Check your Telegram','ok',6000);
    } else {
      toast('Send failed — check the bot token and Chat ID: '+(data.description||'unknown error'),'bad',7000);
    }
  } catch(e){
    toast('Error: '+e.message,'bad');
  }
};

window.testNotifConfig=window.testTGDirect;
