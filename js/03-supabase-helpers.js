// §03 ── SUPABASE HELPERS ───────────────────────────────────────────────
async function sbQ(table, params=''){
  try{
    const r = await fetch(`${SB_URL}/rest/v1/${table}?${params}`, {headers: SB_HEADERS});
    if(!r.ok){ const e=await r.json().catch(()=>({})); console.error('sbQ',table,r.status,e); return null; }
    return await r.json();
  }catch(e){ console.error('sbQ',e.message); return null; }
}

async function sbInsert(table, data){
  try{
    const r = await fetch(`${SB_URL}/rest/v1/${table}`, {method:'POST', headers:SB_HEADERS, body:JSON.stringify(data)});
    if(!r.ok){ const e=await r.json().catch(()=>({})); console.error('sbInsert',table,r.status,e.message); toast('Save error: '+(e.message||e.details||r.status),'bad'); return null; }
    const d=await r.json();
    scheduleSync();
    return Array.isArray(d)?d[0]:d;
  }catch(e){ console.error('sbInsert',e.message); return null; }
}

async function sbUpdate(table, id, data){
  try{
    const r = await fetch(`${SB_URL}/rest/v1/${table}?id=eq.${id}`, {method:'PATCH', headers:SB_HEADERS, body:JSON.stringify(data)});
    if(!r.ok){ const e=await r.json().catch(()=>({})); console.error('sbUpdate',table,r.status,e.message); toast('Update error: '+(e.message||e.details||r.status),'bad'); return null; }
    const d=await r.json();
    scheduleSync();
    return Array.isArray(d)?d[0]:d;
  }catch(e){ console.error('sbUpdate',e.message); return null; }
}

async function sbDelete(table, id){
  try{
    const r = await fetch(`${SB_URL}/rest/v1/${table}?id=eq.${id}`, {method:'DELETE', headers:{...SB_HEADERS, 'Prefer':''}});
    return r.ok;
  }catch(e){ console.error('sbDelete',e.message); return false; }
}

// Call a Postgres function (RPC). Used for anything that must be verified
// or hashed server-side instead of in the browser (e.g. login, passwords).
async function sbRpc(fn, args={}){
  try{
    const r = await fetch(`${SB_URL}/rest/v1/rpc/${fn}`, {method:'POST', headers:SB_HEADERS, body:JSON.stringify(args)});
    if(!r.ok){ const e=await r.json().catch(()=>({})); console.error('sbRpc',fn,r.status,e.message); return null; }
    return await r.json();
  }catch(e){ console.error('sbRpc',fn,e.message); return null; }
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
const isAdmin=()=>FULL.includes(CU?.name)||AROLES.includes(CU?.role);

// ── Member Type Permissions ───────────────────────────────────────────
const MT_KEY='vas_member_types';
const MT_DEFAULTS=[
  {id:'mt1',name:'Full-Time',   color:'#16a34a',perms:{allTasks:true, allMeetings:true, docs:true, archive:true, projects:true, team:true, backlog:true, dashboard:true, hrComs:true, announcements:true,  todos:true, svcTest:true}},
  {id:'mt2',name:'Part-Time',   color:'#2563eb',perms:{allTasks:true, allMeetings:true, docs:true, archive:true, projects:true, team:true, backlog:false,dashboard:true, hrComs:true, announcements:true,  todos:true, svcTest:true}},
  {id:'mt3',name:'Freelancer',  color:'#d97706',perms:{allTasks:false,allMeetings:false,docs:false,archive:false,projects:false,team:false,backlog:false,dashboard:false,hrComs:false,announcements:false, todos:true, svcTest:false}},
  {id:'mt4',name:'Subcontractor',color:'#7c3aed',perms:{allTasks:false,allMeetings:false,docs:false,archive:false,projects:true, team:false,backlog:false,dashboard:false,hrComs:false,announcements:true,  todos:true, svcTest:false}},
  {id:'mt5',name:'Per-Project', color:'#be185d',perms:{allTasks:false,allMeetings:false,docs:false,archive:false,projects:true, team:false,backlog:false,dashboard:false,hrComs:false,announcements:false, todos:true, svcTest:false}},
];
