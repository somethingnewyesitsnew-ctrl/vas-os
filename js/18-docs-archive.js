// §18 ── DOCS & ARCHIVE ──────────────────────────────────────────────────
function rDocs(el){
  const full=canDoStrict('docs');
  const tc={'Task Documentation':'var(--ac)','Process Guide':'var(--g)','Technical Reference':'var(--p)','Meeting Notes':'var(--tx3)','SOP':'var(--o)','Policy':'var(--r)','How-To':'var(--ac)'};
  const scopedDocs=full?DB.docs:DB.docs.filter(d=>{
    if(d.author===CU?.id)return true;
    const t=d.fromTask?DB.tasks.find(x=>x.id===d.fromTask):null;
    if(!t)return false;
    return t.assignedTo===CU?.id||(t.assignees||[]).includes(CU?.id)||t.reviewer===CU?.id;
  });
  el.innerHTML=(full?renderAccessSummary('docs','Documentation'):`<div style="background:var(--al);border:1px solid #bfdbfe;border-radius:8px;padding:9px 12px;margin-bottom:12px;font-size:12px;color:var(--ac)">Showing documentation you authored or that came from your own tasks. Ask an admin for full Documentation access to see everyone's.</div>`)+`
    <div class="fb" style="flex-wrap:wrap;gap:6px;margin-bottom:10px">
      <input class="si" id="ds2" placeholder="Search docs…" oninput="fDocs()" style="min-width:160px">
      <select class="fs" id="dt2" onchange="fDocs()"><option value="">All types</option>${Object.keys(tc).map(t=>`<option>${t}</option>`).join('')}</select>
      ${full?`<select class="fs" id="df-mbr" onchange="fDocs()"><option value="">All authors</option>${DB.team.map(m=>`<option value="${m.id}">${esc(m.name)}</option>`).join('')}</select>`:''}
      <select class="fs" id="df-svc" onchange="fDocs()"><option value="">All services</option>${DB.services.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join('')}</select>
      <select class="fs" id="df-op" onchange="fDocs()"><option value="">All operators</option>${DB.operators.map(o=>`<option value="${o.id}">${esc(o.name)}</option>`).join('')}</select>
      ${full?`<select class="fs" id="df-co" onchange="fDocs()"><option value="">All companies</option>${DB.companies.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select>`:''}
      <select class="fs" id="df-proj" onchange="fDocs()"><option value="">All projects</option>${DB.projects.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join('')}</select>
      <select class="fs" id="df-date" onchange="fDocs()"><option value="">All dates</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option></select>
    </div>
    <div id="dg2" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:10px"></div>`;
  window._docsAll=scopedDocs; fDocs();
}
window.fDocs=()=>{
  const sq=(document.getElementById('ds2')?.value||'').toLowerCase();
  const dt=document.getElementById('dt2')?.value||'';
  const fMbr=document.getElementById('df-mbr')?.value||'';
  const fSvc=document.getElementById('df-svc')?.value||'';
  const fOp=document.getElementById('df-op')?.value||'';
  const fCo=document.getElementById('df-co')?.value||'';
  const fProj=document.getElementById('df-proj')?.value||'';
  const fDate=parseInt(document.getElementById('df-date')?.value||'0')||0;
  const cutoff=fDate?new Date(Date.now()-fDate*864e5):null;

  let f=(window._docsAll||[]).filter(d=>{
    if(sq&&!(d.title.toLowerCase().includes(sq)||(d.content||'').toLowerCase().includes(sq)))return false;
    if(dt&&d.type!==dt)return false;
    if(fMbr&&d.author!==fMbr)return false;
    if(cutoff&&new Date(d.at)<cutoff)return false;
    // Service: check if source task has this service
    if(fSvc){const t=d.fromTask?DB.tasks.find(x=>x.id===d.fromTask):null;if(!t||t.service!==fSvc)return false;}
    // Operator: check source task operator
    if(fOp){const t=d.fromTask?DB.tasks.find(x=>x.id===d.fromTask):null;if(!t||t.operator!==fOp)return false;}
    // Company: check source task company
    if(fCo){const t=d.fromTask?DB.tasks.find(x=>x.id===d.fromTask):null;if(!t||t.company2!==fCo)return false;}
    // Project: check source task project
    if(fProj){const t=d.fromTask?DB.tasks.find(x=>x.id===d.fromTask):null;if(!t||t.projectId!==fProj)return false;}
    return true;
  });

  const tc={'Task Documentation':'var(--ac)','Process Guide':'var(--g)','Technical Reference':'var(--p)','Meeting Notes':'var(--tx3)','SOP':'var(--o)','Policy':'var(--r)','How-To':'var(--ac)'};
  const g=document.getElementById('dg2');if(!g)return;
  g.innerHTML=f.map(d=>{const auth=DB.team.find(m=>m.id===d.author);const col=tc[d.type]||'var(--tx3)';
    return`<div class="card" style="cursor:pointer" onclick="openDoc2('${d.id}')">
      <div style="display:flex;justify-content:space-between;gap:7px;margin-bottom:5px">
        <div style="font-size:12px;font-weight:700;line-height:1.3">${esc(d.title)}${d.fromTask?'<span style="font-size:9px;font-weight:700;padding:1px 5px;background:var(--al);color:var(--ac);border-radius:4px;margin-left:5px">AUTO</span>':''}</div>
        <span style="background:${col}12;color:${col};font-size:9px;font-weight:700;padding:2px 6px;border-radius:4px;flex-shrink:0">${d.type.split(' ')[0].toUpperCase()}</span>
      </div>
      <div style="font-size:11px;color:var(--tx2);line-height:1.5;margin-bottom:7px">${(d.content||'').slice(0,100)}${(d.content||'').length>100?'…':''}</div>
      <div style="font-size:10px;color:var(--tx3);margin-bottom:8px">${auth?'✍ '+auth.name+' · ':''}${fr(d.at)}</div>
      <div class="act-c" onclick="event.stopPropagation()">
        ${isAdmin()?`<div class="ib edt" onclick="openDocModal('${d.id}')">✏</div>
        <div class="ib del" onclick="delItem('docs','${d.id}')">🗑</div>`:''}
      </div>
    </div>`;
  }).join('')+(f.length===0?'<div class="empty"><div class="ei">📚</div><div class="et">No documents match</div></div>':'');
};

window.openDoc2=(id)=>{
  const d=DB.docs.find(doc=>doc.id===id);if(!d)return;
  const auth=DB.team.find(m=>m.id===d.author);const src=d.fromTask?DB.tasks.find(t=>t.id===d.fromTask):null;
  const proj=src?.projectId?DB.projects.find(p=>p.id===src.projectId):null;
  document.getElementById('sp-ttl').textContent=d.title;
  document.getElementById('sp-pills').innerHTML=`<span class="pill sd">${d.status}</span>`;
  document.getElementById('sp-bd').innerHTML=`<div class="sp2">
    <div class="spf"><div class="spl">Author</div><div class="spv">${auth?auth.name:'—'}</div></div>
    <div class="spf"><div class="spl">Type</div><div class="spv">${d.type}</div></div>
  </div>
  ${src?`<div class="spf"><div class="spl">Source Task</div><div class="spv" style="cursor:pointer;color:var(--ac)" onclick="openTask('${src.id}')">${esc(src.title)}</div></div>`:''}
  ${proj?`<div class="spf"><div class="spl">Project</div><div class="spv" style="cursor:pointer;color:var(--ac)" onclick="openProjectDetail('${proj.id}')">◉ ${esc(proj.name)}</div></div>`:''}
  <div class="spf"><div class="spl">Content</div><div class="spnote">${d.content||''}</div></div>
  <div class="spa">
    ${isAdmin()?`<button class="btn bg2 bsm" onclick="openDocModal('${d.id}')">✏ Edit</button>
    <button class="btn bd2 bsm" onclick="delItem('docs','${d.id}');closeSP()">🗑 Delete</button>`:''}
  </div>`;
  document.getElementById('sp-pnl').classList.add('open');
};

// ══════════════════════════════════════════════════════
// ARCHIVE — fully filtered
// ══════════════════════════════════════════════════════
function rArchive(el){
  const full=canDoStrict('archive');
  function render(){
    let f=full?[...DB.archive]:DB.archive.filter(a=>a.by===CU?.id);
    let h='';
    if(full){
      h+=renderAccessSummary('archive','Archive');
      const fSvc=document.getElementById('arc-svc')?.value||'';
      const fMbr=document.getElementById('arc-mbr')?.value||'';
      const fOp=document.getElementById('arc-op')?.value||'';
      const fRev=document.getElementById('arc-rev')?.value||'';
      const fReq=document.getElementById('arc-req')?.value||'';
      const fFrom=document.getElementById('arc-from')?.value||'';
      const fTo=document.getElementById('arc-to')?.value||'';
      const sq=(document.getElementById('arc-s')?.value||'').toLowerCase();
      if(sq)f=f.filter(a=>a.title.toLowerCase().includes(sq)||(a.what||'').toLowerCase().includes(sq));
      if(fSvc)f=f.filter(a=>a.svc===fSvc);
      if(fMbr)f=f.filter(a=>a.by===fMbr);
      if(fOp)f=f.filter(a=>a.op===fOp);
      if(fRev)f=f.filter(a=>a.reviewer===fRev);
      if(fReq)f=f.filter(a=>a.reqBy===fReq||a.reqBy?.toLowerCase().includes(DB.team.find(m=>m.id===fReq)?.name?.toLowerCase()||''));
      if(fFrom)f=f.filter(a=>a.done&&a.done>=fFrom);
      if(fTo)f=f.filter(a=>a.done&&a.done<=fTo);

      h+=`<div class="fb" style="flex-wrap:wrap;gap:6px">
        <input class="si" id="arc-s" placeholder="Search archive…" oninput="arcRender()" value="${sq}" style="min-width:160px">
        <select class="fs" id="arc-svc" onchange="arcRender()"><option value="">All services</option>${DB.services.map(s=>`<option ${fSvc===s.id?'selected':''} value="${s.id}">${esc(s.name)}</option>`).join('')}</select>
        <select class="fs" id="arc-mbr" onchange="arcRender()"><option value="">All members</option>${DB.team.map(m=>`<option ${fMbr===m.id?'selected':''} value="${m.id}">${esc(m.name)}</option>`).join('')}</select>
        <select class="fs" id="arc-op" onchange="arcRender()"><option value="">All operators</option>${DB.operators.map(o=>`<option ${fOp===o.id?'selected':''} value="${o.id}">${esc(o.name)}</option>`).join('')}</select>
        <select class="fs" id="arc-rev" onchange="arcRender()"><option value="">All reviewers</option>${DB.team.map(m=>`<option ${fRev===m.id?'selected':''} value="${m.id}">${esc(m.name)}</option>`).join('')}</select>
        <select class="fs" id="arc-req" onchange="arcRender()"><option value="">All requesters</option>${DB.team.map(m=>`<option ${fReq===m.id?'selected':''} value="${m.id}">${esc(m.name)}</option>`).join('')}</select>
        <input class="fs" type="date" id="arc-from" onchange="arcRender()" value="${fFrom}" title="Completed from">
        <input class="fs" type="date" id="arc-to" onchange="arcRender()" value="${fTo}" title="Completed to">
      </div>`;
    } else {
      h+=`<div style="background:var(--al);border:1px solid #bfdbfe;border-radius:8px;padding:9px 12px;margin-bottom:12px;font-size:12px;color:var(--ac)">Showing your own completed tasks only. Ask an admin for full Archive access to see everyone's.</div>`;
    }

    if(!f.length){h+=`<div class="empty"><div class="ei">🗄</div><div class="et">${DB.archive.length?'No matches':'No archived tasks yet'}</div><div class="es">${full?(DB.archive.length?'Try adjusting filters':'Approved tasks appear here automatically'):'Your completed tasks will appear here once approved'}</div></div>`;el.innerHTML=h;return;}

    h+=`<div class="tw"><table><thead><tr><th>Title</th><th>Type</th>${full?'<th>By</th>':''}<th>Reviewer</th><th>Service</th><th>Operator</th><th>Est h</th><th>Actual h</th><th>Outcome</th><th>Completed</th><th></th></tr></thead><tbody>`;
    f.forEach(a=>{
      const cb=DB.team.find(m=>m.id===a.by);const cr=DB.team.find(m=>m.id===a.reviewer);
      const v=a.est&&a.actual?Math.round((a.actual-a.est)/a.est*100):null;
      const oc={Successful:'var(--g)',Partial:'var(--y)',Reverted:'var(--r)'}[a.outcome];
      h+=`<tr class="cl" onclick="openArcItem('${a.id}')">
        <td>${esc(a.title)}</td><td style="font-size:11px;color:var(--tx2)">${a.type||'—'}</td>
        ${full?`<td style="font-size:11px">${cb?cb.name:a.by||'—'}</td>`:''}
        <td style="font-size:11px;color:var(--tx2)">${cr?cr.name:a.reviewer||'—'}</td>
        <td style="font-size:11px;color:var(--tx2)">${sn(a.svc)}</td>
        <td style="font-size:11px;color:var(--tx2)">${opn(a.op)}</td>
        <td>${a.est||'—'}</td><td>${a.actual||'—'}</td>
        <td><span style="background:${oc||'var(--s2)'}15;color:${oc||'var(--tx3)'};font-size:10px;font-weight:600;padding:2px 7px;border-radius:5px">${a.outcome||'—'}</span></td>
        <td style="font-size:11px;color:var(--tx2)">${fd(a.done)}</td>
        <td onclick="event.stopPropagation()"><div class="act-c">${isAdmin()?`<div class="ib del" onclick="delItem('archive','${a.id}')">🗑</div>`:''}</div></td>
      </tr>`;
    });
    h+=`</tbody></table></div>`;
    el.innerHTML=h;
    window.arcRender=render;
  }
  render();
}

window.openArcItem=(id)=>{
  const a=DB.archive.find(ar=>ar.id===id);if(!a)return;
  const cb=DB.team.find(m=>m.id===a.by);const cr=DB.team.find(m=>m.id===a.reviewer);
  const v=a.est&&a.actual?Math.round((a.actual-a.est)/a.est*100):null;
  document.getElementById('sp-ttl').textContent=a.title;
  document.getElementById('sp-pills').innerHTML=`<span class="pill sd">${a.outcome||'Done'}</span>`;
  document.getElementById('sp-bd').innerHTML=`<div class="sp2">
    <div class="spf"><div class="spl">Completed By</div><div class="spv" ${cb?`style="cursor:pointer;color:var(--ac)" onclick="openMemberDetail('${a.by}')"`:''}>${cb?cb.name:a.by||'—'}</div></div>
    <div class="spf"><div class="spl">Reviewed By</div><div class="spv">${cr?cr.name:a.reviewer||'—'}</div></div>
    <div class="spf"><div class="spl">Requested By</div><div class="spv">${a.reqBy||'—'}</div></div>
    <div class="spf"><div class="spl">Completed On</div><div class="spv">${fd(a.done)}</div></div>
    <div class="spf"><div class="spl">Est. Hours</div><div class="spv">${a.est||'—'}</div></div>
    <div class="spf"><div class="spl">Actual Hours</div><div class="spv" style="color:${v!==null?(Math.abs(v)<=20?'var(--g)':Math.abs(v)<=50?'var(--y)':'var(--r)'):'var(--tx)'}">${a.actual||'—'} ${v!==null?'('+(v>0?'+':'')+v+'%)':''}</div></div>
    <div class="spf"><div class="spl">Service</div><div class="spv">${sn(a.svc)}</div></div>
    <div class="spf"><div class="spl">Operator</div><div class="spv">${opn(a.op)}</div></div>
  </div>
  <div class="sps">Time Metrics</div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-bottom:12px">
    ${[['Response Time',a.respH!=null?a.respH+'h':'—',a.respH!=null?(a.respH<=1?'var(--g)':a.respH<=4?'var(--y)':'var(--r)'):'var(--tx)','Created → Opened'],['Work Time',a.workH!=null?a.workH+'h':'—','var(--tx)','Started → Submitted'],['Review Time',a.revH!=null?a.revH+'h':'—','var(--tx)','Submitted → Reviewed'],['Total Cycle',a.cycleH!=null?a.cycleH+'h':'—','var(--tx)','Created → Archived']].map(([l,v2,c,s])=>`<div style="background:var(--s2);border-radius:8px;padding:10px"><div style="font-size:9px;color:var(--tx3);font-weight:700;margin-bottom:3px;text-transform:uppercase">${l}</div><div style="font-size:15px;font-weight:800;color:${c}">${v2}</div><div style="font-size:10px;color:var(--tx3)">${s}</div></div>`).join('')}
  </div>
  <div class="spf"><div class="spl">What Was Done</div><div class="spnote">${a.what||'—'}</div></div>`;
  document.getElementById('sp-pnl').classList.add('open');
};

// ══════════════════════════════════════════════════════
// SYSTEM LOG
// ══════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════
// MEETINGS MODULE
// ══════════════════════════════════════════════════════
// ── Meeting postpone ────────────────────────────────────────────────────
window.postponeMeeting=async(id)=>{
  const m=DB.meetings.find(x=>x.id===id);if(!m)return;
  const isCreator=m.created_by===CU.name||isAdmin();

  if(isCreator){
    // Creator/admin: postpone directly
    const newDate=prompt('New date (YYYY-MM-DD):',m.meeting_date);
    if(!newDate||!/^\d{4}-\d{2}-\d{2}$/.test(newDate)){toast('Invalid date format','bad');return;}
    const newTime=prompt('New time (HH:MM):',m.meeting_time);
    if(!newTime){return;}
    const oldDate=m.meeting_date, oldTime=m.meeting_time;
    m.meeting_date=newDate; m.meeting_time=newTime;
    await nMeetingUpd(m);
    // Notify invitees
    m.invitees?.forEach(name=>{
      if(name!==CU.name)sendNotif(name,`Meeting "${m.title}" rescheduled from ${fd(oldDate)} ${oldTime} → ${fd(newDate)} ${newTime}`,'Mention',m.title,false,{meetingId:m.id});
    });
    notifyAdmins(`${CU.name} rescheduled "${m.title}" — ${fd(oldDate)} ${oldTime} → ${fd(newDate)} ${newTime}`,'Meeting Rescheduled',m.title,{meetingId:m.id});
    notifyAdminsTG(`📆 Meeting Rescheduled\n\n${CU.name} moved "${m.title}"\n${fd(oldDate)} ${oldTime} → ${fd(newDate)} ${newTime}`,appLink('meetings'));
    toast('Meeting rescheduled ✓','ok');
    closeSP();nav('meetings',document.querySelector('[data-p="meetings"]'));
  } else {
    // Member: send postpone request
    const reason=prompt('Reason for postponement request:');
    if(reason===null)return;
    sendNotif(m.created_by,`${CU.name} requests to postpone "${m.title}" — Reason: ${reason||'Not specified'}`,'Mention',m.title,false,{meetingId:m.id});
    toast('Postponement request sent to '+m.created_by,'ok');
  }
};

// ── Meeting cancel ────────────────────────────────────────────────────
window.cancelMeetingFull=async(id)=>{
  const m=DB.meetings.find(x=>x.id===id);if(!m)return;
  const isCreator=m.created_by===CU.name||isAdmin();
  if(isCreator){
    const reason=prompt('Cancellation reason (optional):');
    if(reason===null)return;
    m.status='Cancelled';m.cancelled_at=new Date().toISOString();if(reason)m.cancel_reason=reason;
    await nMeetingUpd(m);
    m.invitees?.forEach(name=>{if(name!==CU.name)sendNotif(name,`Meeting "${m.title}" was cancelled${reason?' — '+reason:''}. `,'Mention',m.title,false,{meetingId:m.id});});
    notifyAdmins(`${CU.name} cancelled meeting "${m.title}"${reason?' — '+reason:''}`,'Meeting Cancelled',m.title,{meetingId:m.id});
    notifyAdminsTG(`❌ Meeting Cancelled\n\n${CU.name} cancelled "${m.title}"${reason?'\nReason: '+reason:''}`,appLink('meetings'));
    toast('Meeting cancelled','ok');closeSP();nav('meetings',document.querySelector('[data-p="meetings"]'));
  } else {
    const reason=prompt('Reason for cancellation request:');
    if(reason===null)return;
    sendNotif(m.created_by,`${CU.name} requests to cancel "${m.title}" — Reason: ${reason||'Not specified'}`,'Mention',m.title,false,{meetingId:m.id});
    toast('Cancellation request sent to '+m.created_by,'ok');
  }
};

// ── End meeting with attendance + outcomes ────────────────────────────
window.endMeetingWithOutcomes=async(id)=>{
  const m=DB.meetings.find(x=>x.id===id);if(!m)return;
  const isCreator=m.created_by===CU.name||isAdmin();
  if(!isCreator){toast('Only the meeting creator can end it','bad');return;}

  window._endMeetingAttendance={...m.attendance};
  window._endMeetingId=id;
  window._meetingActionItems=[];

  const teamOpts=DB.team.map(t=>`<option value="${esc(t.name)}">${esc(t.name)}</option>`).join('');
  const invList=[...new Set([m.created_by,...(m.invitees||[])])];

  let body=`
  <!-- ATTENDANCE -->
  <div style="font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--tx3);margin-bottom:8px">Attendance</div>
  <div style="margin-bottom:16px">
    ${invList.map(name=>{
      const mbr=DB.team.find(x=>x.name===name);
      const cur=m.attendance?.[name]||'pending';
      return`<div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--bd)">
        ${mbr?`<span style="width:26px;height:26px;border-radius:50%;background:${mbr.color};display:inline-flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:#fff;flex-shrink:0">${mbr.av}</span>`:'<span style="width:26px;height:26px;border-radius:50%;background:var(--s2);flex-shrink:0"></span>'}
        <span style="flex:1;font-size:13px;font-weight:500">${name}</span>
        <div style="display:flex;gap:5px">
          <button id="att-p-${name.replace(/\s/g,'_')}" onclick="setEndAttendance('${name.replace(/'/g,"\\'")}','present')" style="padding:5px 11px;border-radius:6px;border:2px solid ${cur==='present'?'#15803d':'var(--bd)'};background:${cur==='present'?'#f0fdf4':'var(--s)'};color:${cur==='present'?'#15803d':'var(--tx3)'};font-size:11px;font-weight:700;cursor:pointer">✓</button>
          <button id="att-a-${name.replace(/\s/g,'_')}" onclick="setEndAttendance('${name.replace(/'/g,"\\'")}','absent')" style="padding:5px 11px;border-radius:6px;border:2px solid ${cur==='absent'?'#dc2626':'var(--bd)'};background:${cur==='absent'?'#fef2f2':'var(--s)'};color:${cur==='absent'?'#dc2626':'var(--tx3)'};font-size:11px;font-weight:700;cursor:pointer">✗</button>
        </div>
      </div>`;
    }).join('')}
  </div>

  <!-- NOTES -->
  <div style="font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--tx3);margin-bottom:6px">Meeting Notes</div>
  <textarea id="meeting-outcomes" placeholder="Summary of what was discussed, decisions made…" style="width:100%;padding:10px 12px;background:var(--s2);border:1px solid var(--bd);border-radius:8px;color:var(--tx);font-family:var(--fn);font-size:13px;outline:none;resize:vertical;min-height:72px;box-sizing:border-box;margin-bottom:16px"></textarea>

  <!-- ACTION ITEMS -->
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
    <div style="font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--tx3)">Action Items → Tasks</div>
    <button onclick="addMeetingActionItem('${id}')" style="padding:4px 12px;background:var(--ac);color:#fff;border:none;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer">+ Add Item</button>
  </div>
  <div id="action-items-list" style="margin-bottom:6px">
    <div id="ai-empty" style="font-size:12px;color:var(--tx3);padding:10px 0;text-align:center;border:1px dashed var(--bd);border-radius:8px">No action items yet — click + Add Item to create tasks from this meeting</div>
  </div>

  <!-- FOOTER -->
  <div style="display:flex;gap:8px;margin-top:16px;padding-top:14px;border-top:1px solid var(--bd)">
    <button class="btn bp" style="flex:1;padding:10px" onclick="confirmEndMeeting('${id}')">✓ End Meeting</button>
    <button class="btn bg2 bsm" onclick="openMeetingDetail('${id}')">← Back</button>
  </div>`;

  openSP('End Meeting: '+m.title,'',body);
};

// Finds @Name mentions in comment text against DB.team full names.
// Matches longest name first so e.g. "Al Khateeb" is matched whole rather
// than a shorter name that happens to be a prefix of it being matched
// instead. Case-insensitive, deduped by member id.
function extractMentions(text){
  if(!text)return[];
  const candidates=[...DB.team].filter(m=>m.name).sort((a,b)=>b.name.length-a.name.length);
  const lower=text.toLowerCase();
  const found=new Set();
  candidates.forEach(m=>{
    if(lower.includes('@'+m.name.toLowerCase()))found.add(m.id);
  });
  return[...found];
}

window.postTaskComment=async(taskId)=>{
  const ta=document.getElementById('task-comment-ta');
  const text=ta?.value?.trim();
  if(!text){toast('Write something first','bad');return;}
  const t=DB.tasks.find(x=>x.id===taskId);if(!t)return;
  if(!t.comments)t.comments=[];
  const mentionIds=extractMentions(text).filter(id=>id!==CU.id);
  const c={id:'c'+gid(),by:CU.id,byName:CU.name,text,at:now(),taskId,taskTitle:t.title,mentions:mentionIds};
  t.comments.push(c);
  ta.value='';
  hideMentionDrop?.();
  await nUpdateTask(t);
  // Notify task assignee and reviewer (not the commenter)
  [t.assignedTo, t.reviewer].filter(Boolean).forEach(uid=>{
    if(uid!==CU.id){
      const m=DB.team.find(x=>x.id===uid);
      if(m){
        sendNotif(m.name,`${CU.name} commented on "${t.title}": ${text.slice(0,80)}`,'Comment',t.title,false,{taskId:t.id});
        notifyTG(uid,'default',{desc:`💬 New comment on task "${t.title}"\n\n${CU.name}: ${text.slice(0,200)}`,link:appLink('task-'+t.id)});
      }
    }
  });
  // Explicit @mention pings — separate from the assignee/reviewer notify
  // above, since a mentioned person may be neither (e.g. someone pulled
  // into the discussion). Deliberately still fires even if the mentioned
  // person is also the assignee/reviewer — a direct @mention is a
  // stronger signal worth its own ping alongside the general comment one.
  mentionIds.forEach(uid=>{
    const m=DB.team.find(x=>x.id===uid);
    if(!m)return;
    sendNotif(m.name,`${CU.name} mentioned you in a comment on "${t.title}": ${text.slice(0,80)}`,'Mention',t.title,false,{taskId:t.id});
    notifyTG(uid,'mention',{title:t.title,text,link:appLink('task-'+t.id)});
  });
  // Admin broadcast — in-app row via notifyAdmins() (carries proper
  // meta.taskId, unlike the old notifyAdminsWA path, so clicking it goes
  // somewhere and it's realtime-deliverable) plus the Telegram side via
  // notifyAdminsTG(), same split used across the rest of the task lifecycle.
  notifyAdmins(`${CU.name} commented on "${t.title}": ${text.slice(0,150)}`,'Comment',t.title,{taskId:t.id});
  notifyAdminsTG(`💬 New Comment\n\n${CU.name} commented on "${t.title}"\n\n"${text.slice(0,150)}"`,appLink('task-'+t.id));
  logAction('Comment Posted',`${esc(CU.name)} commented on "${esc(t.title)}"`, 'Info', t.title, text.slice(0,100),{taskId:t.id,taskTitle:t.title});
  toast('Comment posted ✓','ok');
  updateBadges();
  setTimeout(()=>openTask(taskId),60);
};

window.switchDashDayTab=(tab)=>{
  const todayPane=document.getElementById('dash-today-pane');
  const upPane=document.getElementById('dash-upcoming-pane');
  const todayTab=document.getElementById('dash-today-tab');
  const upTab=document.getElementById('dash-upcoming-tab');
  if(!todayPane||!upPane)return;
  const isToday=tab==='today';
  todayPane.style.display=isToday?'block':'none';
  upPane.style.display=isToday?'none':'block';
  if(todayTab){todayTab.style.background=isToday?'var(--s)':'transparent';todayTab.style.color=isToday?'var(--tx)':'var(--tx2)';todayTab.style.boxShadow=isToday?'var(--sh)':'';}
  if(upTab){upTab.style.background=isToday?'transparent':'var(--s)';upTab.style.color=isToday?'var(--tx2)':'var(--tx)';upTab.style.boxShadow=isToday?'':'var(--sh)';}
};

window.addPostMeetingAction=(id)=>{
  const form=document.getElementById('post-action-form');
  if(!form)return;
  form.style.display=form.style.display==='none'?'block':'none';
  if(form.style.display==='block')setTimeout(()=>document.getElementById('pa-title')?.focus(),50);
};

window.savePostMeetingAction=async(meetingId)=>{
  const m=DB.meetings.find(x=>x.id===meetingId);if(!m)return;
  const title=document.getElementById('pa-title')?.value?.trim();
  if(!title){toast('Enter a title','bad');return;}
  const assigneeId=document.getElementById('pa-assignee')?.value||null;
  const reviewerId=document.getElementById('pa-reviewer')?.value||null;
  const priority=document.getElementById('pa-priority')?.value||'Medium';
  const due=document.getElementById('pa-due')?.value||null;
  const est=parseFloat(document.getElementById('pa-est')?.value)||null;
  const projectId=document.getElementById('pa-project')?.value||null;
  const operatorId=document.getElementById('pa-operator')?.value||null;
  const companyId=document.getElementById('pa-company')?.value||null;
  const assigneeMember=assigneeId?DB.team.find(x=>x.id===assigneeId):null;
  const reviewerMember=reviewerId?DB.team.find(x=>x.id===reviewerId):null;
  const proj=projectId?DB.projects.find(p=>p.id===projectId):null;
  const op=operatorId?DB.operators.find(o=>o.id===operatorId):null;
  const co=companyId?DB.companies.find(c=>c.id===companyId):null;
  const t={
    id:'t'+gid(),
    title:'Meeting Outcome: '+title,
    status:'New',priority,type:'Meeting',
    assignedTo:assigneeMember?.id||null,
    assignees:assigneeMember?[assigneeMember.id]:[],
    reviewer:reviewerMember?.id||null,
    reqBy:m.created_by,createdBy:CU?.name||'',
    due,est,recur:null,
    meetingId:m.id,
    // Map to existing task fields so taskPayload works correctly
    project:proj?.name||null,
    projectId:projectId||null,
    operator:operatorId||null,        // maps to company_id in taskPayload
    company2:companyId||null,         // maps to company_id2 in taskPayload
    service:null,
    desc:`Action item from meeting: "${esc(m.title)}" on ${fd(m.meeting_date)}`,
    link:'',
    tsCreated:now(),tsAssigned:assigneeMember?now():null,tsOpened:null,tsStarted:null,
    tsSubmitted:null,tsReviewed:null,tsArchived:null,
    actual:null,what:'',tech:'',rejReason:'',rejections:[],comments:[]
  };
  DB.tasks.unshift(t);
  const r=await nCreateTask(t,t.id);
  if(r?.id){t.id=r.id;}
  // Notify assignee and reviewer
  if(assigneeMember&&assigneeMember.name!==CU?.name){
    sendNotif(assigneeMember.name,`Action item from meeting "${m.title}": ${title}`,'Task Assigned',title,false,{taskId:t.id});
    notifyTG(assigneeMember.id,'task_assigned',{title:'Meeting Outcome: '+title,priority,due,link:appLink('task-'+t.id)});
  }
  if(reviewerMember&&reviewerMember.name!==CU?.name){
    notifyTG(reviewerMember.id,'review_requested',{title:'Meeting Outcome: '+title,link:appLink('task-'+t.id)});
  }
  toast('Action item created ✓','ok');
  updateBadges();
  setTimeout(()=>openMeetingDetail(meetingId),80);
};


window.toggleMeetingNotesEdit=(id)=>{
  const editor=document.getElementById('meet-notes-editor');
  const view=document.getElementById('meet-notes-view');
  const empty=document.getElementById('meet-notes-empty');
  const btn=document.getElementById('meet-notes-edit-btn');
  if(!editor)return;
  const isOpen=editor.style.display!=='none';
  editor.style.display=isOpen?'none':'block';
  if(view)view.style.display=isOpen&&document.getElementById('meet-notes-ta')?.value?'block':'none';
  if(btn)btn.textContent=isOpen?'✏ Edit':'Cancel';
  if(!isOpen)setTimeout(()=>document.getElementById('meet-notes-ta')?.focus(),50);
};

window.saveMeetingNotes=async(id)=>{
  const m=DB.meetings.find(x=>x.id===id);if(!m)return;
  const notes=document.getElementById('meet-notes-ta')?.value||'';
  m.notes=notes;
  await nMeetingUpd(m);
  toast('Notes saved ✓','ok');
  setTimeout(()=>openMeetingDetail(id),80);
};



window.addMeetingActionItem=(meetingId)=>{
  const idx=window._aiCounter++;
  const m=DB.meetings.find(x=>x.id===meetingId);
  const teamOpts=DB.team.map(t=>`<option value="${esc(t.name)}">${esc(t.name)}</option>`).join('');
  const todayPlus=new Date();todayPlus.setDate(todayPlus.getDate()+3);
  const defDue=todayPlus.toISOString().split('T')[0];

  // hide empty state
  const empty=document.getElementById('ai-empty');if(empty)empty.style.display='none';

  window._meetingActionItems.push({idx,title:'',assignee:'',priority:'Medium',due:''});

  const row=document.createElement('div');
  row.id=`ai-row-${idx}`;
  row.style.cssText='background:var(--s2);border:1px solid var(--bd);border-radius:10px;padding:12px;margin-bottom:8px';
  row.innerHTML=`
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
      <input id="ai-title-${idx}" placeholder="Action item / task title…" oninput="updateAI(${idx},'title',this.value)"
        style="flex:1;padding:7px 10px;background:var(--s);border:1px solid var(--bd);border-radius:7px;color:var(--tx);font-size:13px;outline:none;font-family:var(--fn)">
      <button onclick="removeAI(${idx})" style="width:24px;height:24px;border-radius:50%;background:var(--r);color:#fff;border:none;font-size:13px;cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center">✕</button>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">
      <div>
        <div style="font-size:10px;color:var(--tx3);margin-bottom:3px;font-weight:600">Assignee</div>
        <select id="ai-assignee-${idx}" onchange="updateAI(${idx},'assignee',this.value)"
          style="width:100%;padding:6px 8px;background:var(--s);border:1px solid var(--bd);border-radius:7px;color:var(--tx);font-size:12px;outline:none">
          <option value="">— Anyone —</option>${teamOpts}
        </select>
      </div>
      <div>
        <div style="font-size:10px;color:var(--tx3);margin-bottom:3px;font-weight:600">Priority</div>
        <select id="ai-priority-${idx}" onchange="updateAI(${idx},'priority',this.value)"
          style="width:100%;padding:6px 8px;background:var(--s);border:1px solid var(--bd);border-radius:7px;color:var(--tx);font-size:12px;outline:none">
          <option>Critical</option><option>High</option><option selected>Medium</option><option>Low</option>
        </select>
      </div>
      <div>
        <div style="font-size:10px;color:var(--tx3);margin-bottom:3px;font-weight:600">Due Date</div>
        <input type="date" id="ai-due-${idx}" value="${defDue}" onchange="updateAI(${idx},'due',this.value)"
          style="width:100%;padding:6px 8px;background:var(--s);border:1px solid var(--bd);border-radius:7px;color:var(--tx);font-size:12px;outline:none;box-sizing:border-box">
      </div>
    </div>`;
  document.getElementById('action-items-list').appendChild(row);
  document.getElementById(`ai-title-${idx}`)?.focus();
};

window.updateAI=(idx,field,val)=>{
  const item=window._meetingActionItems.find(x=>x.idx===idx);
  if(item)item[field]=val;
};

window.removeAI=(idx)=>{
  window._meetingActionItems=window._meetingActionItems.filter(x=>x.idx!==idx);
  const row=document.getElementById(`ai-row-${idx}`);if(row)row.remove();
  if(!window._meetingActionItems.length){
    const empty=document.getElementById('ai-empty');if(empty)empty.style.display='';
  }
};

window._endMeetingAttendance={};
window._endMeetingId=null;

window.setEndAttendance=(name,status)=>{
  window._endMeetingAttendance[name]=status;
  const safeName=name.replace(/\s/g,'_');
  const pBtn=document.getElementById('att-p-'+safeName);
  const aBtn=document.getElementById('att-a-'+safeName);
  if(pBtn){pBtn.style.borderColor=status==='present'?'#15803d':'var(--bd)';pBtn.style.background=status==='present'?'#f0fdf4':'var(--s)';pBtn.style.color=status==='present'?'#15803d':'var(--tx3)';}
  if(aBtn){aBtn.style.borderColor=status==='absent'?'#dc2626':'var(--bd)';aBtn.style.background=status==='absent'?'#fef2f2':'var(--s)';aBtn.style.color=status==='absent'?'#dc2626':'var(--tx3)';}
};

window.confirmEndMeeting=async(id)=>{
  const m=DB.meetings.find(x=>x.id===id);if(!m)return;
  const outcomes=document.getElementById('meeting-outcomes')?.value||'';
  m.status='Completed';
  m.ended_at=new Date().toISOString();
  m.attendance=window._endMeetingAttendance||{};
  if(outcomes) m.description=(m.description||'')+'\n\n--- Notes ---\n'+outcomes;
  await nMeetingUpd(m);

  // Create tasks from action items
  const items=(window._meetingActionItems||[]).filter(ai=>ai.title&&ai.title.trim());
  let created=0;
  for(const ai of items){
    const assigneeMember=DB.team.find(x=>x.name===ai.assignee||x.id===ai.assignee);
    const t={
      id:'t'+gid(),
      title:'Meeting Outcome: '+ai.title.trim(),
      status:'New',
      priority:ai.priority||'Medium',
      type:'Meeting',
      assignedTo:assigneeMember?.id||null,
      assignees:assigneeMember?[assigneeMember.id]:[],
      reviewer:null,
      reqBy:m.created_by,
      createdBy:CU?.name||'',
      due:ai.due||null,
      est:null, recur:null,
      meetingId:m.id,   // ← link back to the meeting
      desc:`Action item from meeting: "${esc(m.title)}" on ${fd(m.meeting_date)}${outcomes?'\n\nMeeting notes:\n'+outcomes:''}`,
      link:'',
      tsCreated:now(),tsAssigned:assigneeMember?now():null,tsOpened:null,tsStarted:null,
      tsSubmitted:null,tsReviewed:null,tsArchived:null,
      actual:null,what:'',tech:'',rejReason:'',rejections:[]
    };
    DB.tasks.unshift(t);
    const r=await nCreateTask(t,t.id);
    if(r?.id){
      t.id=r.id;
      if(assigneeMember&&assigneeMember.name!==CU?.name)
        sendNotif(assigneeMember.name,`New action item from meeting "${m.title}": ${ai.title}`,'Task Assigned',ai.title,false,{taskId:t.id});
      created++;
    }
  }

  const msg=created>0?`Meeting ended · ${created} task${created>1?'s':''} created ✓`:'Meeting ended ✓';
  toast(msg,'ok',5000);

  const presentCount=Object.values(m.attendance||{}).filter(v=>v==='present').length;
  const invitedCount=Object.keys(m.attendance||{}).length;
  notifyAdmins(`${CU.name} ended meeting "${m.title}" — ${presentCount}/${invitedCount} attended${created>0?' · '+created+' action item'+(created>1?'s':'')+' created':''}`,'Meeting Ended',m.title,{meetingId:m.id});
  notifyAdminsTG(`✅ Meeting Ended\n\n${CU.name} ended "${m.title}"\nAttendance: ${presentCount}/${invitedCount}${created>0?'\nAction items: '+created:''}`,appLink('meetings'));

  // Notify external assignees
  const extIds=[...new Set(items.filter(ai=>ai.assignee).map(ai=>{
    const mbr=DB.team.find(x=>x.name===ai.assignee||x.id===ai.assignee);return mbr?.id;
  }).filter(Boolean))];
  if(extIds.length) showExternalNotifySheet(extIds,`Action items from: ${esc(m.title)}`,'Meeting action items — see All Tasks for details',null);

  window._meetingActionItems=[];
  closeSP();
  // Navigate to meetings — completed meeting will appear in Completed tab only
  nav('meetings',document.querySelector('[data-p="meetings"]'));
};


window.convertTodoToTask=async(todoId)=>{
  const td=DB.todos.find(x=>x.id===todoId);if(!td)return;
  openTaskModal(null);
  setTimeout(()=>{
    const tf=document.getElementById('tf-title');
    const df=document.getElementById('tf-desc');
    const pf=document.getElementById('tf-priority');
    const rf=document.getElementById('tf-reqby');
    const duef=document.getElementById('tf-due');
    if(tf) tf.value=td.title;
    if(df) df.value=td.notes||'';
    if(pf) pf.value=td.priority||'Medium';
    if(rf) rf.value=CU?.name||'';
    if(duef&&td.due) duef.value=td.due;
    // Pre-select current user
    initAssignPicker([CU.id].filter(Boolean));
    window._pendingTodoId=todoId;
    // Pre-fill desc with "from Todos" label
    if(df && !df.value) df.value='[From Todos]';
    else if(df && df.value && !df.value.startsWith('[From Todos]')) df.value='[From Todos] '+df.value;
  },120);
  toast('Fill in task details and save','inf');
};


window.convertBacklogToTask=async(backlogId)=>{
  const b=DB.backlog.find(x=>x.id===backlogId);if(!b)return;
  openTaskModal(null);
  setTimeout(()=>{
    const tf=document.getElementById('tf-title');
    const df=document.getElementById('tf-desc');
    const pf=document.getElementById('tf-priority');
    const rf=document.getElementById('tf-reqby');
    if(tf) tf.value=b.title;
    if(df) df.value=(b.desc||'')+(b.why?'\n\nWhy it matters: '+b.why:'');
    if(pf) pf.value=b.priority||'Medium';
    if(rf) rf.value=b.by||CU?.name||'';
    window._pendingBacklogId=backlogId;
  },120);
  toast('Fill in task details and save','inf');
};
