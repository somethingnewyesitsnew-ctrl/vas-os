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
let AUTO_REM_CFG={enabled:false,interval_hours:4};
async function loadAutoRemCfg(){
  try{
    const rows=await sbQ('auto_reminder_settings','id=eq.1');
    const row=Array.isArray(rows)?rows[0]:null;
    if(row) AUTO_REM_CFG={enabled:!!row.enabled,interval_hours:Number(row.interval_hours)||4};
  }catch(e){ console.warn('loadAutoRemCfg failed',e); }
}

// §05 ── DATA LOAD ───────────────────────────────────────────────────────
async function loadFromNotion(){ // kept as loadFromNotion for compatibility
  setSync('syncing','Loading…');
  try{
    // Phase 1: load lookups first (team, services, companies, projects)
    const [team,svcs,cos,projs] = await Promise.all([
      sbQ('team','order=name'),
      sbQ('services','order=name'),
      sbQ('companies','order=name'),
      sbQ('projects','order=name'),
      loadAutoRemCfg(),
    ]);

    if(!team){ setSync('err','Failed — run SQL setup first'); return false; }

    DB.team = (team||[]).map(m=>({...m, color:m.color||mkColor(m.name), av:m.av||mkAv(m.name), username:m.username||(m.name.toLowerCase().split(' ')[0]), password:m.password||'abohamood@1.', lastLogin:m.last_login||null, memberType:m.member_type||'', permOverrides:m.perm_overrides||{}, autoRemindersActive:m.auto_reminders_active!==false}));
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
function showSaving(v){ document.getElementById('tb-sav').classList.toggle('on',v); }

// Auto-sync: after every successful write, refresh data in background
let _syncTimer=null;
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
