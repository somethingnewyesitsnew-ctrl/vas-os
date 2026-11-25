// Maps a raw Supabase `tasks` row into the shape the rest of the app
// expects (snake_case DB columns -> camelCase fields, resolved display
// names from already-loaded lookups). Extracted out of loadFromNotion's
// bulk mapping so a single fresh row (e.g. after a notification click,
// or a Realtime insert) can be mapped and upserted into DB.tasks the
// exact same way, without needing a full reload.
function mapTaskRow(t){
  const ass  = DB.team.find(m=>m.id===t.assigned_to);
  const rev  = DB.team.find(m=>m.id===t.reviewer);
  const svc  = DB.services.find(s=>s.id===t.service_id);
  const co   = [...DB.operators,...DB.companies].find(c=>c.id===t.company_id);
  const proj = DB.projects.find(p=>p.id===t.project_id);
  return {
    ...t,
    assignedTo:   t.assigned_to,
    assignees:    t.assignees||[],
    reviewer:     t.reviewer,
    service:      t.service_id,
    operator:     t.company_id,
    company2:     t.company_id2||null,
    projectId:    t.project_id,
    link:         t.link||'',
    assigneeName: ass?.name||'',
    reviewerName: rev?.name||'',
    serviceName:  svc?.name||'',
    operatorName: co?.name||'',
    company2Name: DB.companies.find(c=>c.id===t.company_id2)?.name||'',
    projectName:  proj?.name||'',
    tsCreated:    t.created_at,
    tsAssigned:   t.ts_assigned,
    tsStarted:    t.ts_started,
    tsSubmitted:  t.ts_submitted,
    meetingId:    t.meeting_id||null,
    parentTaskId: t.parent_task_id||null,
    reEstimates:  t.re_estimates||[],
    timeline:     t.timeline||[],
    tsReviewed:   t.ts_reviewed,
    tsArchived:   t.ts_archived,
    tsOpened:     t.ts_opened,
    est: t.est, actual: t.actual,
    what: t.what||'', tech: t.tech||'', desc: t.description||'',
    rejReason: t.rej_reason||'',
    respH: t.resp_h, workH: t.work_h, revH: t.rev_h, cycleH: t.cycle_h,
    reqBy: t.req_by||'',
    createdBy: t.created_by||'',
    rejections: t.rejections||[],
    comments: t.comments||[],
  };
}

// Fetches one fresh task row from Supabase and upserts it into DB.tasks,
// mapped the same way as the bulk load. Used anywhere we're about to show
// a task in response to an external event (notification click, deep link,
// Realtime push) so the panel never displays stale local state — this is
// what actually fixes "clicked the notification but the submit/comment
// isn't there yet", independent of whether a live push already delivered it.
async function fetchAndUpsertTask(id){
  if(!id)return null;
  try{
    const rows=await sbQ('tasks',`id=eq.${id}`);
    const row=Array.isArray(rows)?rows[0]:null;
    if(!row)return null;
    const mapped=mapTaskRow(row);
    const idx=DB.tasks.findIndex(t=>t.id===mapped.id);
    if(idx>=0) DB.tasks[idx]=mapped; else DB.tasks.unshift(mapped);
    return mapped;
  }catch(e){ console.warn('fetchAndUpsertTask failed',e); return null; }
}

// Fetches one fresh meeting row and upserts it into DB.meetings — same
// idea as fetchAndUpsertTask above, for meeting-linked notifications
// (created/started/ended/cancelled/rescheduled) so the meetings page and
// dashboard's "Today's Meetings" reflect the real current state.
async function fetchAndUpsertMeeting(id){
  if(!id)return null;
  try{
    const rows=await sbQ('meetings',`id=eq.${id}`);
    const row=Array.isArray(rows)?rows[0]:null;
    if(!row)return null;
    const mapped={...row, invitees:row.invitees||[], attendance:row.attendance||{}};
    const idx=DB.meetings.findIndex(x=>x.id===mapped.id);
    if(idx>=0) DB.meetings[idx]=mapped; else DB.meetings.unshift(mapped);
    return mapped;
  }catch(e){ console.warn('fetchAndUpsertMeeting failed',e); return null; }
}

// Fetches one fresh test_sessions row plus its test_checks rows and
// upserts both into DB.testSessions/DB.testChecks — for service-test
// completion notifications, so the Service Tests page and its pass/fail
// counts reflect the real current state without a full reload.
async function fetchAndUpsertTestSession(id){
  if(!id)return null;
  try{
    const rows=await sbQ('test_sessions',`id=eq.${id}`);
    const row=Array.isArray(rows)?rows[0]:null;
    if(!row)return null;
    const idx=DB.testSessions.findIndex(x=>x.id===row.id);
    if(idx>=0) DB.testSessions[idx]=row; else DB.testSessions.unshift(row);
    const checks=await sbQ('test_checks',`session_id=eq.${id}`);
    if(Array.isArray(checks)) DB.testChecks=DB.testChecks.filter(c=>c.session_id!==id).concat(checks);
    return row;
  }catch(e){ console.warn('fetchAndUpsertTestSession failed',e); return null; }
}

// Global automatic-reminder settings — a single-row admin config
// (enabled + how many hours between checks). Loaded once per full data
// load, read by startAutoTaskReminders() in 08-auth-nav.js.
// server_side=true means the database scheduler (pg_cron, see
// SUPABASE_MIGRATION_server_auto_reminders.sql) sends these even when no app is
// open; start_hour/end_hour are the allowed sending window in the server's timezone.
let AUTO_REM_CFG={enabled:false,interval_hours:4,server_side:false,start_hour:8,end_hour:20};
async function loadAutoRemCfg(){
  try{
    const rows=await sbQ('auto_reminder_settings','id=eq.1');
    const row=Array.isArray(rows)?rows[0]:null;
    if(row) AUTO_REM_CFG={
      enabled:!!row.enabled,
      interval_hours:Number(row.interval_hours)||4,
      server_side:row.server_side===true,
      start_hour:Number.isInteger(row.start_hour)?row.start_hour:8,
      end_hour:Number.isInteger(row.end_hour)?row.end_hour:20
    };
  }catch(e){ console.warn('loadAutoRemCfg failed',e); }
}

// ── Shared app settings (service test areas, login-reminder days) ──────
// Stored in the app_settings table (key -> json value) rather than
// localStorage, because the scheduled service-test task is created from
// whichever team member's tab happens to be open, and the login reminder is
// sent the same way. Both must read ONE shared value, not a per-browser one.
// {name} lines below may contain {operator}, replaced with the operator's name.
const DEFAULT_TEST_AREAS=[
  {name:'Full cycle test',desc:'Run every service end to end (subscribe → use → billing/charging → unsubscribe) and confirm each step works.'},
  {name:'Content test',desc:'Content loads, is correct, up to date and in the right language, with no broken or missing items.'},
  {name:'UI test',desc:'Layout, buttons, links, images and text display correctly on the screens and devices you can check.'},
  {name:'UX test',desc:'The journey is clear and easy to follow, with sensible messages, no dead ends and no confusing steps.'},
  {name:'Speed test',desc:'Pages, menus and responses load quickly; note anything slow and roughly how slow.'},
  {name:'Complete services test',desc:'Go through every service under {operator}, not only the main ones, and confirm each is live and working.'}
];
let APP_CFG={
  serviceTestAreas:null,loginReminderDays:3,
  // Server-side digests (SUPABASE_MIGRATION_server_digests.sql reads the same app_settings keys)
  morningBrief:{enabled:false,hour:8},
  escalation:{enabled:false,overdue_days:2,review_hours:24,repeat_days:3},
  weeklyReport:{enabled:false,day:1,hour:8},
  // Warn before assigning to someone with this many open / overdue tasks
  workload:{open:8,overdue:3},
  // null = never customised -> built-in admin behaviour; see recipientFlagFor() in 04
  recipientAccess:null
};
function getServiceTestAreas(){
  const a=APP_CFG.serviceTestAreas;
  const clean=Array.isArray(a)?a.filter(x=>x&&String(x.name||'').trim()).map(x=>({name:String(x.name).trim(),desc:String(x.desc||'').trim()})):[];
  return clean.length?clean:DEFAULT_TEST_AREAS;
}
function getLoginReminderDays(){
  const n=Math.floor(Number(APP_CFG.loginReminderDays));
  return n>=1&&n<=60?n:3;
}
async function loadAppSettings(){
  try{
    const rows=await sbQ('app_settings','select=key,value');
    if(!Array.isArray(rows)) return; // table missing -> built-in defaults
    rows.forEach(r=>{
      if(r.key==='service_test_areas'&&Array.isArray(r.value)) APP_CFG.serviceTestAreas=r.value;
      if(r.key==='login_reminder_days'&&r.value!=null) APP_CFG.loginReminderDays=Number(r.value);
      const obj=(v)=>v&&typeof v==='object'&&!Array.isArray(v)?v:null;
      if(r.key==='morning_brief'&&obj(r.value)) APP_CFG.morningBrief={...APP_CFG.morningBrief,...r.value};
      if(r.key==='escalation'&&obj(r.value)) APP_CFG.escalation={...APP_CFG.escalation,...r.value};
      if(r.key==='weekly_report'&&obj(r.value)) APP_CFG.weeklyReport={...APP_CFG.weeklyReport,...r.value};
      if(r.key==='workload_warning'&&obj(r.value)) APP_CFG.workload={...APP_CFG.workload,...r.value};
      if(r.key==='recipient_access'&&obj(r.value)&&obj(r.value.people)) APP_CFG.recipientAccess=r.value;
    });
  }catch(e){ console.warn('loadAppSettings failed',e); }
}
// Upsert one setting. Returns the saved row, or null if it could not be saved.
async function saveAppSetting(key,value){
  try{
    const r=await fetchWithTimeout(`${SB_URL}/rest/v1/app_settings?on_conflict=key`,{
      method:'POST',
      headers:{...SB_HEADERS,Prefer:'resolution=merge-duplicates,return=representation'},
      body:JSON.stringify({key,value,updated_at:new Date().toISOString(),updated_by:CU?.name||''})
    });
    if(!r.ok){ console.warn('saveAppSetting',key,r.status,await r.text().catch(()=>'')); return null; }
    const d=await r.json();
    return Array.isArray(d)?(d[0]||{key}):d;
  }catch(e){ console.warn('saveAppSetting',key,e.message); return null; }
}

// §05 ── DATA LOAD ───────────────────────────────────────────────────────
async function loadFromNotion(){ // kept as loadFromNotion for compatibility
  setSync('syncing','Loading…');
  try{
    // Phase 1: load lookups first (team, services, companies, projects)
    const [team,svcs,cos,projs] = await Promise.all([
      sbQ('team_public','order=name'),
      sbQ('services','order=name'),
      sbQ('companies','order=name'),
      sbQ('projects','order=name'),
      loadAutoRemCfg(),
      loadAppSettings(),
    ]);

    if(!team){ setSync('err','Failed — run SQL setup first'); return false; }

    // NOTE: this now reads from the `team_public` view, which does not
    // expose the `password` column at all — passwords never reach the
    // client. Login is verified server-side via the verify_login() RPC
    // (see doLogin() in 08-auth-nav.js).
    DB.team = (team||[]).map(m=>({...m, name:(m.name||'').trim(), color:m.color||mkColor(m.name), av:m.av||mkAv(m.name), username:m.username||(m.name.toLowerCase().split(' ')[0]), lastLogin:m.last_login||null, memberType:m.member_type||'', permOverrides:m.perm_overrides||{}, autoRemindersActive:m.auto_reminders_active!==false, loginReminderActive:m.login_reminder_active===true}));
    DB.services = (svcs||[]).map(s=>({...s, desc: s.description||'', service_type: s.service_type||'Digital'}));
    DB.operators = (cos||[]).filter(c=>c.type==='Telecom Operator'||['Zain','MTN','Sudani'].some(n=>(c.name||'').includes(n)));
    DB.companies = (cos||[]).filter(c=>!DB.operators.find(o=>o.id===c.id));
    if(!DB.operators.length&&(cos||[]).length) DB.operators=[...(cos||[])];
    DB.projects = (projs||[]).map(p=>({...p, desc: p.description||'', ownedBy: DB.companies.find(c=>c.id===p.owner_company_id)?.name||p.owned_by||'', locationName: p.location_name||'', startedAt: p.started_at||null, targetDate: p.target_date||null, link: p.link||'', field_of_work: p.field_of_work||'', member_ids: p.member_ids||[], budget: p.budget??null}));

    // Load test schedules (needs operators + team from phase 1)
    const schedules = await sbQ('test_schedules','order=created_at') || [];
    DB.testSchedules = schedules;

    // Phase 2: load tasks + other data (tasks mapping needs lookups above)
    const [tasks,bl,docs,arc,todos,meetings,sessions,checks] = await Promise.all([
      sbQ('tasks','order=created_at.desc'),
      sbQ('backlog','order=created_at.desc'),
      sbQ('docs','order=created_at.desc'),
      sbQ('archive','order=created_at.desc'),
      sbQ('todos','order=created_at.desc'),
      sbQ('meetings','order=meeting_date.asc,meeting_time.asc'),
      sbQ('test_sessions','order=test_date.desc&limit=200'),
      sbQ('test_checks','order=created_at.desc&limit=1000'),
    ]);

    DB.tasks = (tasks||[]).map(mapTaskRow);

    DB.backlog = (bl||[]).map(b=>({...b, 
  by: b.by_name||'', 
  desc: b.description||'',
  status_updated_at: b.status_updated_at||b.created_at,
}));
    DB.docs = (docs||[]).map(d=>({...d, author: d.author_name||'', fromTask: d.from_task_id, at: d.created_at, content: d.content||''}));
    DB.archive = (arc||[]).map(a=>({...a, by: a.by_name||'', reviewer: a.reviewer_name||'', svc: a.service_name||'', op: a.operator_name||'', done: a.done_date, reqBy: a.req_by||'', at: a.created_at, workH: a.work_h, respH: a.resp_h, revH: a.rev_h, cycleH: a.cycle_h}));
    DB.todos = (todos||[]).map(td=>({...td, assignedTo: td.assigned_to_name||'', owner: td.owner_name||td.assigned_to_name||'', due: td.due, reminder: td.reminder||null}));
    DB.meetings = (meetings||[]).map(m=>({...m,
      invitees: m.invitees||[],
      attendance: m.attendance||{},
    }));
    DB.testSessions = (sessions||[]);
    DB.testChecks = (checks||[]);
    // Login-reminder log (who was nudged to log in, and when). Returns null if the
    // table doesn't exist yet (migration not run) -> treated as "no history".
    DB.loginReminders = (await sbQ('login_reminders','order=sent_at.desc&limit=500'))||[];

    setSync('live','Refresh');
    return true;
  }catch(e){ console.error('loadFromNotion:',e); setSync('err','Error'); return false; }
}

async function refreshData(){
  toast('Refreshing…','inf');
  const ok = await loadFromNotion();
  await initCommsData(); // also refresh HR coms, announcements, reminders
  if(ok){ toast('Synced ✓','ok'); updateBadges(); }
  else { loadDemoData(); toast('Could not reach Supabase — showing demo data','bad'); }
  nav(page, document.querySelector('.ni.on'));
}

// ══════════════════════════════════════════════════════
// SUPABASE WRITE HELPERS
// ══════════════════════════════════════════════════════
// showSaving(v) lives in 02-ui-utils-config.js — removed the identical duplicate that used to be here

// Auto-sync: after every successful write, refresh data in background
let _syncTimer=null;
let _syncTable=null;
function toggleSidebar(){
  const sb=document.getElementById('sb-nav');
  const btn=document.getElementById('sb-toggle');
  const collapsed=sb.classList.toggle('collapsed');
  btn.classList.toggle('sb-open',!collapsed);
  btn.textContent=collapsed?'☰':'✕';
}

// ══════════════════════════════════════════════════════
// FLICKER-FREE BACKGROUND RE-RENDER
// Renders the page into an invisible off-screen copy first,
// diffs it against what's on screen, and only touches the
// visible DOM if something actually changed — with a soft
// crossfade instead of an instant hard swap. Never interrupts
// the user while they're typing/selecting inside #content.
// ══════════════════════════════════════════════════════
function smartRerender(p, el){
  if(!el || !p || !window._renders?.[p]) return;
  const active=document.activeElement;
  if(active && el.contains(active) && (active.tagName==='INPUT'||active.tagName==='TEXTAREA'||active.isContentEditable)) return;

  const shadow=document.createElement('div');
  shadow.style.cssText='position:absolute;top:-9999px;left:-9999px;visibility:hidden;pointer-events:none';
  shadow.style.width=el.clientWidth+'px';
  document.body.appendChild(shadow);
  let newHTML;
  try{ window._renders[p](shadow); newHTML=shadow.innerHTML; }
  catch(e){ console.error('smartRerender:',e); document.body.removeChild(shadow); return; }
  document.body.removeChild(shadow);

  if(newHTML===el.innerHTML) return; // nothing actually changed on screen — skip entirely, zero flicker

  const scrollTop=el.scrollTop;
  el.style.transition='opacity .12s ease';
  el.style.opacity='0';
  setTimeout(()=>{
    el.innerHTML=newHTML;
    el.scrollTop=scrollTop;
    requestAnimationFrame(()=>{ el.style.opacity='1'; });
  },120);
}

function scheduleSync(table){
  if(table) _syncTable=table;
  clearTimeout(_syncTimer);
  _syncTimer=setTimeout(async()=>{
    try{
      const tbl=_syncTable; _syncTable=null;
      if(tbl&&_tableMap[tbl]) await _tableMap[tbl]();
      else await loadFromNotion();
      // Always refresh comms tables too
      await initCommsData();
      updateBadges();
    }catch(e){ console.error('scheduleSync:',e); }
    updateBadges();
    // Only re-render if side panel is CLOSED — never interrupt an open panel
    const panelOpen=document.getElementById('sp-pnl')?.classList.contains('open');
    // Never interrupt an active service test session
    if(!panelOpen && !window._chkSession){
      smartRerender(page, document.getElementById('content'));
    }
  }, 2000);
}
