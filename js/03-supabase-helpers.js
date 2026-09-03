// § 03 ── SUPABASE HELPERS ───────────────────────────────────────────────
// Every fetch() below goes through this instead of the raw browser fetch.
// Without a timeout, a request that never gets a response (dropped
// connection, silent network stall, etc.) leaves its `await` hanging
// forever — since sbQ/sbInsert/etc. are called from loadFromNotion()
// inside Promise.all(), one stuck request means the whole load never
// resolves, never rejects, and the dashboard sits on "Loading data…"
// indefinitely with no console error at all (nothing ever throws — it
// just never finishes). This wraps every call in an AbortController with
// a generous 20s ceiling so that failure mode becomes a normal, visible
// error (falls back to demo data / shows "Error") instead of an
// indefinite freeze.
async function fetchWithTimeout(url, opts={}, ms=20000){
  const ctrl=new AbortController();
  const t=setTimeout(()=>ctrl.abort(),ms);
  try{
    return await fetch(url, {...opts, signal:ctrl.signal});
  } finally {
    clearTimeout(t);
  }
}

async function sbQ(table, params=''){
  try{
    const r = await fetchWithTimeout(`${SB_URL}/rest/v1/${table}?${params}`, {headers: SB_HEADERS});
    if(!r.ok){ const e=await r.json().catch(()=>({})); console.error('sbQ',table,r.status,e); return null; }
    return await r.json();
  }catch(e){ console.error('sbQ',table,e.name==='AbortError'?'timed out after 20s':e.message); return null; }
}

// Calls a Postgres RPC function via PostgREST. Used for anything that
// needs to run server-side with elevated privileges (SECURITY DEFINER) —
// e.g. verify_login() and upsert_member(), which touch the `password`
// column that RLS now hides from direct table access entirely.
async function sbRpc(fn, params={}){
  try{
    const r = await fetchWithTimeout(`${SB_URL}/rest/v1/rpc/${fn}`, {method:'POST', headers:SB_HEADERS, body:JSON.stringify(params)});
    if(!r.ok){ const e=await r.json().catch(()=>({})); console.error('sbRpc',fn,r.status,e); return null; }
    return await r.json();
  }catch(e){ console.error('sbRpc',fn,e.name==='AbortError'?'timed out after 20s':e.message); return null; }
}

async function sbInsert(table, data){
  try{
    const r = await fetchWithTimeout(`${SB_URL}/rest/v1/${table}`, {method:'POST', headers:SB_HEADERS, body:JSON.stringify(data)});
    if(!r.ok){ const e=await r.json().catch(()=>({})); console.error('sbInsert',table,r.status,e.message); toast('Save error: '+(e.message||e.details||r.status),'bad'); return null; }
    const d=await r.json();
    scheduleSync();
    return Array.isArray(d)?d[0]:d;
  }catch(e){ console.error('sbInsert',table,e.name==='AbortError'?'timed out after 20s':e.message); if(e.name==='AbortError')toast('Save timed out — check your connection','bad'); return null; }
}

async function sbUpdate(table, id, data){
  try{
    const r = await fetchWithTimeout(`${SB_URL}/rest/v1/${table}?id=eq.${id}`, {method:'PATCH', headers:SB_HEADERS, body:JSON.stringify(data)});
    if(!r.ok){ const e=await r.json().catch(()=>({})); console.error('sbUpdate',table,r.status,e.message); toast('Update error: '+(e.message||e.details||r.status),'bad'); return null; }
    const d=await r.json();
    scheduleSync();
    return Array.isArray(d)?d[0]:d;
  }catch(e){ console.error('sbUpdate',table,e.name==='AbortError'?'timed out after 20s':e.message); if(e.name==='AbortError')toast('Update timed out — check your connection','bad'); return null; }
}

// Same as sbInsert/sbUpdate but never surfaces a toast on failure — for
// best-effort metadata (e.g. optional columns that may not exist yet on
// a given deployment until its SQL migration has been run). The write
// silently no-ops instead of showing "column not found" to every user.
async function sbInsertSilent(table, data){
  try{
    const r = await fetchWithTimeout(`${SB_URL}/rest/v1/${table}`, {method:'POST', headers:SB_HEADERS, body:JSON.stringify(data)});
    if(!r.ok){ console.warn('sbInsertSilent',table,r.status); return null; }
    const d=await r.json();
    return Array.isArray(d)?d[0]:d;
  }catch(e){ console.warn('sbInsertSilent',table,e.name==='AbortError'?'timed out':e.message); return null; }
}
async function sbUpdateSilent(table, id, data){
  try{
    const r = await fetchWithTimeout(`${SB_URL}/rest/v1/${table}?id=eq.${id}`, {method:'PATCH', headers:SB_HEADERS, body:JSON.stringify(data)});
    if(!r.ok){ console.warn('sbUpdateSilent',table,r.status); return null; }
    const d=await r.json();
    return Array.isArray(d)?d[0]:d;
  }catch(e){ console.warn('sbUpdateSilent',table,e.name==='AbortError'?'timed out':e.message); return null; }
}

async function sbDelete(table, id){
  try{
    const r = await fetchWithTimeout(`${SB_URL}/rest/v1/${table}?id=eq.${id}`, {method:'DELETE', headers:{...SB_HEADERS, 'Prefer':''}});
    return r.ok;
  }catch(e){ console.error('sbDelete',table,e.name==='AbortError'?'timed out':e.message); return false; }
}

// Reminders / HR communications / announcements were calling these but
// they were never defined — every "Send" on those forms silently threw
// a ReferenceError (unhandled promise rejection, no visible error) and
// nothing ever got inserted. Same behavior as sbInsert/sbDelete; kept as
// distinctly-named wrappers since that's what the callers already expect.
async function sbCommsInsert(table, data){ return sbInsert(table, data); }
async function sbCommsDelete(table, id){ return sbDelete(table, id); }
// Was called in 3 places (mark-read, HR reply/status, task-panel reminder
// mark-read) but never defined — those calls threw immediately, so reads
// never got marked, HR reply status never saved, etc. Mirrors
// sbCommsInsert/sbCommsDelete's thin-wrapper pattern.
async function sbCommsUpdate(table, id, data){ return sbUpdate(table, id, data); }

// Loads HR Communications, Announcements, and Reminders from Supabase
// into DB.hrComs / DB.announcements / DB.reminders. Was called from 5
// places (startApp, refreshData, realtime-notif handler) but never
// defined anywhere — so these three arrays never actually loaded real
// data in production; they stayed permanently undefined, which is also
// why rReminders/rAnnouncements/rHrComs crashed outright when opened.
async function initCommsData(){
  try{
    const [hrComs,announcements,reminders] = await Promise.all([
      sbQ('hr_communications','order=at.desc'),
      sbQ('announcements','order=at.desc'),
      sbQ('reminders','order=at.desc'),
    ]);
    DB.hrComs = (hrComs||[]).map(c=>({...c, fromId:c.from_id, fromName:c.from_name, readByHR:c.read_by_hr, memberRead:c.member_read, replies:c.replies||[]}));
    DB.announcements = (announcements||[]).map(a=>({...a, fromId:a.from_id, fromName:a.from_name, audienceIds:a.audience_ids||[], audienceNames:a.audience_names||[], readBy:a.read_by||[]}));
    DB.reminders = (reminders||[]).map(r=>({...r, fromId:r.from_id, fromName:r.from_name, toId:r.to_id, toName:r.to_name, taskId:r.task_id, taskTitle:r.task_title, meetingId:r.meeting_id||null}));
  }catch(e){
    console.error('initCommsData:',e);
    // Fall back to empty arrays rather than leaving them undefined —
    // undefined is what caused the hard crashes this function fixes.
    DB.hrComs=DB.hrComs||[]; DB.announcements=DB.announcements||[]; DB.reminders=DB.reminders||[];
  }
}

function setSync(s,l){
  const el=document.getElementById('nsync');
  el.className='nsync'+(s==='live'?' live':s==='err'?' err':s==='syncing'?' syncing':'');
  document.getElementById('nsync-lbl').textContent=l||s;
}

// ══════════════════════════════════════════════════════
// STATE
// ══════════════════════════════════════════════════════
let CU=null, page='dash', _editId=null, _pendTask=null, _delCb=null;
let notifs=[];

const FULL=['Aziz','Aymen','Maysa'];
const AROLES=['CEO','Projects Manager','HR Manager'];
// isAdmin checks the actual Access field on the member record first —
// this is what the Add/Edit Member form's Access dropdown sets, and what
// isAdminMember() (used elsewhere for admin lists/Telegram broadcasts)
// already checks. FULL/AROLES are kept as a legacy fallback for the
// original founder accounts, but the Access field is the real source of
// truth for anyone made an admin through the normal UI — without this,
// any such admin fails every isAdmin() check in the app (nav visibility,
// admin-broadcast notification relevance, etc.) even though they show as
// "Admin" everywhere else.
const isAdmin=()=>CU?.access==='Admin'||FULL.includes(CU?.name)||AROLES.includes(CU?.role);
// Specifically "is this member the HR Manager" — distinct from isAdmin
// (which is also true for CEO/Projects Manager via AROLES). Used to gate
// HR Comms visibility/moderation separately from general admin rights.
// NOTE: previously called in 9 places across HR Comms + badge-counting
// but never defined — every call site threw a ReferenceError, which is
// why the HR Comms page could not render for anyone (see also
// initCommsData/sbCommsUpdate below, fixed alongside this).
const isHR=()=>CU?.role==='HR Manager';

// Visibility gate for a single HR Communication record — HR/Admin can
// see everything, everyone else only their own. Was called once (in
// rHrComs' list filter) but never defined, so the whole HR Comms page
// threw the moment it tried to filter the list, same failure class as
// isHR/initCommsData/sbCommsUpdate above.
const canSeeHrCom=(c)=>isHR()||isAdmin()||c.fromId===CU?.id||c.fromName===CU?.name;

// ── Member Type Permissions ───────────────────────────────────────────
const MT_KEY='vas_member_types';
const MT_DEFAULTS=[
  {id:'mt1',name:'Full-Time',   color:'#16a34a',perms:{allTasks:true, allMeetings:true, docs:true, archive:true, projects:true, services:true, library:true, comments:true, reminders:true, team:true, backlog:true, dashboard:true, hrComs:true, announcements:true,  todos:true, svcTest:true}},
  {id:'mt2',name:'Part-Time',   color:'#2563eb',perms:{allTasks:true, allMeetings:true, docs:true, archive:true, projects:true, services:false,library:true, comments:true, reminders:false,team:true, backlog:false,dashboard:true, hrComs:true, announcements:true,  todos:true, svcTest:true}},
  {id:'mt3',name:'Freelancer',  color:'#d97706',perms:{allTasks:false,allMeetings:false,docs:false,archive:false,projects:false,services:false,library:false,comments:false,reminders:false,team:false,backlog:false,dashboard:false,hrComs:false,announcements:false, todos:true, svcTest:false}},
  {id:'mt4',name:'Subcontractor',color:'#7c3aed',perms:{allTasks:false,allMeetings:false,docs:false,archive:false,projects:true, services:false,library:false,comments:false,reminders:false,team:false,backlog:false,dashboard:false,hrComs:false,announcements:true,  todos:true, svcTest:false}},
  {id:'mt5',name:'Per-Project', color:'#be185d',perms:{allTasks:false,allMeetings:false,docs:false,archive:false,projects:true, services:false,library:false,comments:false,reminders:false,team:false,backlog:false,dashboard:false,hrComs:false,announcements:false, todos:true, svcTest:false}},
];
