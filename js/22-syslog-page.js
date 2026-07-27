// §22 ── SYSTEM LOG PAGE ─────────────────────────────────────────────────
function rSyslog(el){
  // Merge in-memory + persisted log, deduplicate, keep 30 days
  const stored=getPersistedLog();
  const existingIds=new Set(syslog.map(e=>e.id));
  stored.forEach(e=>{if(!existingIds.has(e.id)){syslog.push(e);existingIds.add(e.id);}});
  syslog.sort((a,b)=>new Date(b.at)-new Date(a.at));

  const fullLog=isAdmin()?syslog:syslog.filter(e=>e.actor===CU.name||e.actorId===CU.id||e.memberId===CU.id);

  // Filter values
  const fMember=document.getElementById('lf-member')?.value||'';
  const fAction=document.getElementById('lf-action')?.value||'';
  const fSev=document.getElementById('lf-sev')?.value||'';
  const fFrom=document.getElementById('lf-from')?.value||'';
  const fTo=document.getElementById('lf-to')?.value||'';
  const fService=document.getElementById('lf-service')?.value||'';
  const fProject=document.getElementById('lf-project')?.value||'';
  const fOperator=document.getElementById('lf-operator')?.value||'';
  const fSearch=(document.getElementById('lf-search')?.value||'').toLowerCase();

  let f=fullLog.filter(e=>{
    if(fMember&&e.actor!==fMember&&e.memberName!==fMember)return false;
    if(fAction&&!e.action.toLowerCase().includes(fAction.toLowerCase()))return false;
    if(fSev&&e.severity!==fSev)return false;
    if(fFrom&&e.at<fFrom)return false;
    if(fTo&&e.at.slice(0,10)>fTo)return false;
    if(fService&&e.serviceName!==fService&&e.target!==fService)return false;
    if(fProject&&e.projectName!==fProject)return false;
    if(fOperator&&e.operatorName!==fOperator)return false;
    if(fSearch&&!e.event?.toLowerCase().includes(fSearch)&&!e.action?.toLowerCase().includes(fSearch)&&!e.actor?.toLowerCase().includes(fSearch)&&!e.target?.toLowerCase().includes(fSearch))return false;
    return true;
  });

  // Build filter dropdowns
  const members=[...new Set(fullLog.map(e=>e.actor).filter(Boolean))].sort();
  const actions=[...new Set(fullLog.map(e=>e.action).filter(Boolean))].sort();
  const services=[...new Set(fullLog.map(e=>e.serviceName).filter(Boolean))].sort();
  const projects=[...new Set(fullLog.map(e=>e.projectName).filter(Boolean))].sort();
  const operators=[...new Set(fullLog.map(e=>e.operatorName).filter(Boolean))].sort();

  const sc={Info:'var(--tx3)',Success:'var(--g)',Warning:'var(--y)',Error:'var(--r)'};
  const sb={Info:'var(--s2)',Success:'var(--gb)',Warning:'var(--yb)',Error:'var(--rb)'};
  const si={Info:'',Success:'✅ ',Warning:'⚠️ ',Error:'❌ '};

  const reload=()=>rSyslog(el);
  const inp=(id,ph,val='')=>`<input id="${id}" placeholder="${ph}" value="${val}" oninput="rSyslog(document.getElementById('content'))" style="padding:6px 10px;background:var(--s2);border:1px solid var(--bd);border-radius:7px;color:var(--tx);font-size:11px;outline:none;font-family:var(--fn)">`;
  const sel=(id,opts,val='',ph='All')=>`<select id="${id}" onchange="rSyslog(document.getElementById('content'))" style="padding:6px 10px;background:var(--s2);border:1px solid var(--bd);border-radius:7px;color:var(--tx);font-size:11px;outline:none"><option value="">${ph}</option>${opts.map(o=>`<option ${o===val?'selected':''}>${o}</option>`).join('')}</select>`;

  let h=`
  <div class="ph">
    <div>
      <div class="pt">▤ System Log</div>
      <div class="ps">${fullLog.length} entries · last 30 days · showing ${f.length}</div>
    </div>
    <button onclick="if(confirm('Clear all persisted log?')){localStorage.removeItem('${LOG_KEY}');syslog=[];rSyslog(document.getElementById('content'));}" class="btn bg2 bsm">🗑 Clear Log</button>
  </div>

  <div style="background:var(--s2);border:1px solid var(--bd);border-radius:12px;padding:12px 14px;margin-bottom:14px;display:flex;flex-wrap:wrap;gap:8px;align-items:center">
    ${inp('lf-search','🔍 Search…',fSearch)}
    ${sel('lf-member',members,fMember,'All Members')}
    ${sel('lf-action',actions,fAction,'All Actions')}
    ${sel('lf-sev',['Info','Success','Warning','Error'],fSev,'All Severity')}
    ${sel('lf-service',services,fService,'All Services')}
    ${sel('lf-project',projects,fProject,'All Projects')}
    ${sel('lf-operator',operators,fOperator,'All Operators')}
    <input id="lf-from" type="date" value="${fFrom}" onchange="rSyslog(document.getElementById('content'))" style="padding:6px 10px;background:var(--s2);border:1px solid var(--bd);border-radius:7px;color:var(--tx);font-size:11px;outline:none" title="From date">
    <input id="lf-to" type="date" value="${fTo}" onchange="rSyslog(document.getElementById('content'))" style="padding:6px 10px;background:var(--s2);border:1px solid var(--bd);border-radius:7px;color:var(--tx);font-size:11px;outline:none" title="To date">
    <button onclick="['lf-member','lf-action','lf-sev','lf-from','lf-to','lf-service','lf-project','lf-operator','lf-search'].forEach(id=>{const el2=document.getElementById(id);if(el2)el2.value=''});rSyslog(document.getElementById('content'))" class="btn bg2 bsm">✕ Clear</button>
  </div>`;

  if(!f.length){
    h+=`<div class="empty"><div class="ei">▤</div><div class="et">No log entries match</div><div class="es">Try adjusting your filters</div></div>`;
  } else {
    h+=`<div class="tw"><table><thead><tr>
      <th>Time</th><th>Action</th><th>Actor</th><th>Event</th><th>Target</th><th>Linked</th><th>Severity</th>
    </tr></thead><tbody>`;
    h+=f.slice(0,500).map(e=>{
      const m=DB.team.find(x=>x.name===e.actor||x.id===e.actorId);
      const linked=[];
      if(e.taskTitle) linked.push(`📋 ${e.taskTitle.slice(0,25)}`);
      if(e.projectName) linked.push(`◉ ${e.projectName.slice(0,20)}`);
      if(e.serviceName) linked.push(`◐ ${e.serviceName.slice(0,20)}`);
      if(e.operatorName) linked.push(`◑ ${e.operatorName.slice(0,20)}`);
      if(e.memberName&&e.memberName!==e.actor) linked.push(`👤 ${e.memberName.slice(0,20)}`);
      return`<tr style="background:${sb[e.severity]||''}22">
        <td style="font-family:var(--fnm);font-size:10px;color:var(--tx3);white-space:nowrap">${fdt(e.at)}</td>
        <td style="font-size:12px;font-weight:700;color:var(--tx);white-space:nowrap">${si[e.severity]||''}${e.action}</td>
        <td style="font-size:12px">
          ${m?`<span style="display:inline-flex;align-items:center;gap:4px">
            <span style="width:18px;height:18px;border-radius:50%;background:${m.color};display:inline-flex;align-items:center;justify-content:center;font-size:7px;color:#fff;font-weight:800">${m.av}</span>
            ${e.actor}
          </span>`:e.actor}
          ${e.actorRole?`<div style="font-size:10px;color:var(--tx3)">${e.actorRole}</div>`:''}
        </td>
        <td style="font-size:11px;color:var(--tx2);max-width:280px">${e.event||''}${e.details?`<div style="font-size:10px;color:var(--tx3)">${e.details}</div>`:''}</td>
        <td style="font-size:11px;color:var(--tx3)">${e.target||'—'}</td>
        <td style="font-size:10px;color:var(--tx2)">${linked.map(l=>`<div style="white-space:nowrap">${l}</div>`).join('')||'—'}</td>
        <td><span style="font-size:10px;font-weight:700;color:${sc[e.severity]};padding:2px 7px;border-radius:20px;background:${sb[e.severity]};white-space:nowrap">${e.severity}</span></td>
      </tr>`;
    }).join('')+`</tbody></table></div>
    ${f.length>500?`<div style="text-align:center;padding:10px;font-size:11px;color:var(--tx3)">Showing first 500 of ${f.length} entries. Use filters to narrow down.</div>`:''}`;
  }
  el.innerHTML=h;
}

// ══════════════════════════════════════════════════════
// HR COMMUNICATIONS
// ══════════════════════════════════════════════════════
// ── Supabase helpers for comms ────────────────────────────────────────────
async function sbCommsGet(table){
  try{
    const r=await fetch(`${SB_URL}/rest/v1/${table}?order=at.desc&limit=200`,{headers:SB_HEADERS});
    if(!r.ok)return[];
    return await r.json();
  }catch(e){return[];}
}
async function sbCommsInsert(table,row){
  try{
    const r=await fetch(`${SB_URL}/rest/v1/${table}`,{method:'POST',headers:{...SB_HEADERS,'Prefer':'return=representation'},body:JSON.stringify(row)});
    if(!r.ok){const e=await r.json().catch(()=>({}));console.error('sbCommsInsert',table,e);return null;}
    const d=await r.json();return Array.isArray(d)?d[0]:d;
  }catch(e){console.error(e);return null;}
}
async function sbCommsUpdate(table,id,data){
  try{
    await fetch(`${SB_URL}/rest/v1/${table}?id=eq.${id}`,{method:'PATCH',headers:SB_HEADERS,body:JSON.stringify(data)});
  }catch(e){console.error(e);}
}
async function sbCommsDelete(table,id){
  try{await fetch(`${SB_URL}/rest/v1/${table}?id=eq.${id}`,{method:'DELETE',headers:SB_HEADERS});}catch(e){}
}

// Init — load from Supabase after DB is ready
async function initCommsData(){
  const [hrc,ann,rem]=await Promise.all([
    sbCommsGet('hr_communications'),
    sbCommsGet('announcements'),
    sbCommsGet('reminders')
  ]);
  DB.hrComs=hrc.map(r=>({id:r.id,fromId:r.from_id,fromName:r.from_name,title:r.title,body:r.body,status:r.status,readByHR:r.read_by_hr,memberRead:r.member_read,replies:r.replies||[],at:r.at}));
  DB.announcements=ann.map(r=>({id:r.id,fromId:r.from_id,fromName:r.from_name,title:r.title,body:r.body,priority:r.priority,audience:r.audience,audienceIds:r.audience_ids||[],audienceNames:r.audience_names||[],readBy:r.read_by||[],at:r.at}));
  DB.reminders=rem.map(r=>({id:r.id,fromId:r.from_id,fromName:r.from_name,toId:r.to_id,toName:r.to_name,taskId:r.task_id,taskTitle:r.task_title,meetingId:r.meeting_id,msg:r.msg,read:r.read,at:r.at}));
  updateBadges();
}

// Determine who is HR (role includes 'HR' or access is 'HR')
function isHR(){ return CU&&(CU.role?.toLowerCase().includes('hr')||CU.access==='HR'); }
function canSeeHrCom(com){
  // Visible only to: the sender, HR members, Admins
  return com.fromId===CU.id||com.fromName===CU.name||isHR()||isAdmin();
}
