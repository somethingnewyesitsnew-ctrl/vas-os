// §17 ── LIBRARY ─────────────────────────────────────────────────────────
const LIB_KEY='vas_library';
const LIB_REQ_KEY='vas_library_requests';
function getLibrary(){try{return JSON.parse(localStorage.getItem(LIB_KEY)||'[]');}catch(e){return[];}}
function saveLibrary(items){localStorage.setItem(LIB_KEY,JSON.stringify(items));}
function getLibRequests(){try{return JSON.parse(localStorage.getItem(LIB_REQ_KEY)||'[]');}catch(e){return[];}}
function saveLibRequests(r){localStorage.setItem(LIB_REQ_KEY,JSON.stringify(r));}

// Check if current user has library access
function hasLibAccess(){
  if(isAdmin()) return true;
  // Members with a type set must explicitly have docs perm OR an approved request
  if(CU?.memberType){
    const p=getMTPerms(CU.memberType);
    if(p&&p.docs) return true;
    const reqs=getLibRequests();
    return reqs.some(r=>r.memberId===CU?.id&&r.status==='Approved');
  }
  // Members with NO type set (old accounts) — check for approved request only
  const reqs=getLibRequests();
  return reqs.some(r=>r.memberId===CU?.id&&r.status==='Approved');
}

function rLibrary(el){
  // Members without access see request screen
  if(!hasLibAccess()){
    const myReq=getLibRequests().find(r=>r.memberId===CU?.id&&r.status==='Pending');
    el.innerHTML=`<div class="empty" style="max-width:400px;margin:60px auto;text-align:center">
      <div class="ei">📖</div>
      <div class="et">Library Access Required</div>
      <div class="es" style="margin-bottom:20px">The Library is a shared knowledge base. Request access from an admin or project manager.</div>
      ${myReq
        ? `<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:12px;font-size:12px;color:#92400e;font-weight:600">⏳ Your request is pending approval</div>`
        : `<div style="margin-bottom:10px"><textarea id="lib-req-reason" placeholder="Why do you need library access? (optional)" rows="3" style="width:100%;padding:9px 12px;background:var(--s2);border:1px solid var(--bd);border-radius:8px;color:var(--tx);font-size:13px;font-family:var(--fn);outline:none;resize:none;box-sizing:border-box"></textarea></div>
           <button class="btn bp" style="width:100%;padding:11px" onclick="requestLibAccess()">📩 Request Library Access</button>`
      }
    </div>`;
    return;
  }

  const items=getLibrary();
  const view=localStorage.getItem('vas_lib_view')||'cards';
  const fSearch=(document.getElementById('lb-search')?.value||'').toLowerCase();
  const fProj=(document.getElementById('lb-fproj')?.value||'');
  const fSvc=(document.getElementById('lb-fsvc')?.value||'');
  const fOp=(document.getElementById('lb-fop')?.value||'');

  let filtered=items.filter(it=>{
    if(fSearch&&!it.topic.toLowerCase().includes(fSearch)&&!it.desc?.toLowerCase().includes(fSearch)&&!it.notes?.toLowerCase().includes(fSearch)&&!(it.tags||[]).join(' ').toLowerCase().includes(fSearch))return false;
    if(fProj&&it.projectId!==fProj)return false;
    if(fSvc&&it.serviceId!==fSvc)return false;
    if(fOp&&it.operatorId!==fOp)return false;
    return true;
  }).sort((a,b)=>new Date(b.at||0)-new Date(a.at||0));

  const projOpts=DB.projects.map(p=>`<option value="${p.id}">${p.name}</option>`).join('');
  const svcOpts=(DB.services||[]).map(s=>`<option value="${s.id}">${s.name}</option>`).join('');
  const opOpts=[...DB.operators,...DB.companies].map(o=>`<option value="${o.id}">${o.name}</option>`).join('');

  const pendingReqs=getLibRequests().filter(r=>r.status==='Pending');

  let h=`
  <div style="margin-bottom:20px">
    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:16px">
      <div>
        <div style="font-size:22px;font-weight:900;color:var(--tx);display:flex;align-items:center;gap:8px">📖 Library <span style="font-size:13px;font-weight:600;color:var(--tx3);margin-top:2px">${filtered.length} entr${filtered.length===1?'y':'ies'}</span></div>
        <div style="font-size:12px;color:var(--tx3);margin-top:2px">Team knowledge base — guides, references, links & notes</div>
      </div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        ${isAdmin()&&pendingReqs.length?`<button onclick="showLibRequests()" style="display:flex;align-items:center;gap:5px;background:#fef2f2;color:#dc2626;border:1px solid #fecaca;font-size:11px;font-weight:700;padding:6px 12px;border-radius:8px;cursor:pointer">📩 ${pendingReqs.length} Access Request${pendingReqs.length>1?'s':''}</button>`:''}
        <button onclick="openLibModal(null)" style="display:flex;align-items:center;gap:5px;background:var(--ac);color:#fff;border:none;font-size:12px;font-weight:700;padding:7px 14px;border-radius:8px;cursor:pointer">+ Add Entry</button>
      </div>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;background:var(--s2);border:1px solid var(--bd);border-radius:10px;padding:10px 12px">
      <input id="lb-search" placeholder="🔍 Search…" oninput="rLibrary(document.getElementById('content'))" style="flex:1;min-width:140px;padding:6px 10px;background:var(--s);border:1px solid var(--bd);border-radius:7px;color:var(--tx);font-size:12px;outline:none;font-family:var(--fn)">
      <select id="lb-fproj" onchange="rLibrary(document.getElementById('content'))" style="padding:6px 10px;background:var(--s);border:1px solid var(--bd);border-radius:7px;color:var(--tx);font-size:12px;outline:none;max-width:140px">
        <option value="">All Projects</option>${projOpts}</select>
      <select id="lb-fsvc" onchange="rLibrary(document.getElementById('content'))" style="padding:6px 10px;background:var(--s);border:1px solid var(--bd);border-radius:7px;color:var(--tx);font-size:12px;outline:none;max-width:140px">
        <option value="">All Services</option>${svcOpts}</select>
      <select id="lb-fop" onchange="rLibrary(document.getElementById('content'))" style="padding:6px 10px;background:var(--s);border:1px solid var(--bd);border-radius:7px;color:var(--tx);font-size:12px;outline:none;max-width:140px">
        <option value="">All Operators</option>${opOpts}</select>
      <div style="display:flex;gap:2px;background:var(--s);border:1px solid var(--bd);border-radius:7px;padding:2px;flex-shrink:0">
        <button onclick="localStorage.setItem('vas_lib_view','cards');rLibrary(document.getElementById('content'))" style="width:30px;height:26px;border:none;border-radius:5px;cursor:pointer;font-size:14px;background:${view==='cards'?'var(--ac)':'transparent'};color:${view==='cards'?'#fff':'var(--tx3)'}">⊞</button>
        <button onclick="localStorage.setItem('vas_lib_view','table');rLibrary(document.getElementById('content'))" style="width:30px;height:26px;border:none;border-radius:5px;cursor:pointer;font-size:14px;background:${view==='table'?'var(--ac)':'transparent'};color:${view==='table'?'#fff':'var(--tx3)'}">≡</button>
      </div>
    </div>
  </div>`;

  if(!filtered.length){
    h+=`<div style="text-align:center;padding:60px 20px">
      <div style="font-size:48px;margin-bottom:12px">📖</div>
      <div style="font-size:16px;font-weight:800;color:var(--tx);margin-bottom:6px">${items.length?'No matches found':'Library is empty'}</div>
      <div style="font-size:13px;color:var(--tx3);max-width:300px;margin:0 auto">${items.length?'Try adjusting your search or filters':'Start building your team knowledge base.'}</div>
      ${!items.length?`<button onclick="openLibModal(null)" style="margin-top:20px;background:var(--ac);color:#fff;border:none;font-size:13px;font-weight:700;padding:10px 22px;border-radius:9px;cursor:pointer">+ Add First Entry</button>`:''}
    </div>`;
  } else if(view==='cards'){
    h+=`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px">`;
    filtered.forEach(it=>{
      const proj=DB.projects.find(p=>p.id===it.projectId);
      const svc=(DB.services||[]).find(s=>s.id===it.serviceId);
      const op=[...DB.operators,...DB.companies].find(o=>o.id===it.operatorId);
      const canEdit=isAdmin()||it.createdBy===CU?.name;
      const authorM=DB.team.find(m=>m.name===it.createdBy);
      h+=`<div style="background:var(--s);border:1px solid var(--bd);border-radius:14px;overflow:hidden;display:flex;flex-direction:column;transition:all .15s" onmouseenter="this.style.borderColor='var(--ac)';this.style.boxShadow='0 4px 20px #0002'" onmouseleave="this.style.borderColor='var(--bd)';this.style.boxShadow='none'">
        <div onclick="openLibEntry('${it.id}')" style="padding:16px;flex:1;display:flex;flex-direction:column;gap:10px;cursor:pointer">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px">
            <div style="display:flex;align-items:flex-start;gap:10px;flex:1;min-width:0">
              <div style="width:36px;height:36px;border-radius:10px;background:var(--al);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">📖</div>
              <div style="flex:1;min-width:0">
                <div style="font-size:14px;font-weight:800;color:var(--tx);line-height:1.3;margin-bottom:3px">${it.topic}</div>
                ${it.desc?`<div style="font-size:12px;color:var(--tx3);line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${it.desc}</div>`:''}
              </div>
            </div>
            ${canEdit?`<div style="display:flex;gap:2px;flex-shrink:0" onclick="event.stopPropagation()">
              <button onclick="openLibModal('${it.id}')" style="width:26px;height:26px;border-radius:6px;background:var(--s2);border:1px solid var(--bd);color:var(--ac);cursor:pointer;font-size:11px">✏</button>
              <button onclick="deleteLibEntry('${it.id}')" style="width:26px;height:26px;border-radius:6px;background:var(--s2);border:1px solid var(--bd);color:var(--r);cursor:pointer;font-size:11px">✕</button>
            </div>`:''}
          </div>
          ${it.notes?`<div style="background:var(--s2);border-left:3px solid var(--ac);padding:8px 10px;border-radius:0 7px 7px 0;font-size:11px;color:var(--tx2);line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${it.notes}</div>`:''}
          ${it.link?`<div style="display:flex;align-items:center;gap:5px;color:var(--ac);font-size:11px;font-weight:600;overflow:hidden">🔗<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-left:3px">${it.link.replace(/^https?:\/\//, '').slice(0,50)}</span></div>`:''}
          <div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:auto;padding-top:6px">
            ${proj?`<span style="background:var(--al);color:var(--ac);border:1px solid var(--ac)22;font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px">◉ ${proj.name}</span>`:''}
            ${svc?`<span style="background:#f0fdf4;color:#15803d;border:1px solid #bbf7d0;font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px">◐ ${svc.name}</span>`:''}
            ${op?`<span style="background:#faf5ff;color:#7c3aed;border:1px solid #e9d5ff;font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px">◑ ${op.name}</span>`:''}
            ${(it.tags||[]).map(t=>`<span style="background:var(--s2);border:1px solid var(--bd);font-size:10px;font-weight:600;padding:2px 7px;border-radius:20px;color:var(--tx3)">#${t.trim()}</span>`).join('')}
          </div>
        </div>
        <div style="padding:8px 14px;border-top:1px solid var(--bd);background:var(--s2);display:flex;align-items:center;justify-content:space-between">
          <span style="font-size:10px;color:var(--tx3);display:flex;align-items:center;gap:5px">
            <span style="width:18px;height:18px;border-radius:50%;background:${authorM?.color||'#64748b'};display:inline-flex;align-items:center;justify-content:center;font-size:7px;font-weight:800;color:#fff">${(it.createdBy||'?')[0].toUpperCase()}</span>
            ${it.createdBy||'?'}
          </span>
          <span style="font-size:10px;color:var(--tx3)">${fd(it.at?.slice(0,10)||'')}</span>
        </div>
      </div>`;
    });
    h+='</div>';
  } else {
    h+=`<div class="tw"><table><thead><tr><th>Topic</th><th>Description</th><th>Link</th><th>Project</th><th>Tags</th><th>By</th><th>Date</th>${isAdmin()?'<th></th>':''}</tr></thead><tbody>`;
    filtered.forEach(it=>{
      const proj=DB.projects.find(p=>p.id===it.projectId);
      const canEdit=isAdmin()||it.createdBy===CU?.name;
      h+=`<tr onclick="openLibEntry('${it.id}')" class="cl" style="cursor:pointer">
        <td style="font-weight:700;min-width:140px"><div style="display:flex;align-items:center;gap:6px"><span>📖</span>${it.topic}</div></td>
        <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--tx2);font-size:11px">${it.desc||'—'}</td>
        <td>${it.link?`<a href="${it.link}" target="_blank" onclick="event.stopPropagation()" style="color:var(--ac);font-size:11px;font-weight:600;text-decoration:none">🔗 Link</a>`:'—'}</td>
        <td style="font-size:11px">${proj?.name||'—'}</td>
        <td>${(it.tags||[]).slice(0,3).map(t=>`<span style="background:var(--s2);border:1px solid var(--bd);font-size:9px;padding:1px 5px;border-radius:10px">#${t}</span>`).join(' ')}</td>
        <td style="font-size:11px;white-space:nowrap">${it.createdBy||'—'}</td>
        <td style="font-size:10px;color:var(--tx3);white-space:nowrap">${fd(it.at?.slice(0,10)||'')}</td>
        ${canEdit?`<td onclick="event.stopPropagation()" style="white-space:nowrap">
          <button onclick="openLibModal('${it.id}')" style="background:none;border:none;color:var(--ac);cursor:pointer;font-size:12px;margin-right:4px">✏</button>
          <button onclick="deleteLibEntry('${it.id}')" style="background:none;border:none;color:var(--r);cursor:pointer;font-size:12px">✕</button>
        </td>`:(isAdmin()?'<td></td>':'')}
      </tr>`;
    });
    h+='</tbody></table></div>';
  }
  el.innerHTML=h;
}

// Open library entry in side panel
window.openLibEntry=(id)=>{
  const it=getLibrary().find(x=>x.id===id);if(!it)return;
  const proj=DB.projects.find(p=>p.id===it.projectId);
  const svc=(DB.services||[]).find(s=>s.id===it.serviceId);
  const op=[...DB.operators,...DB.companies].find(o=>o.id===it.operatorId);
  let body=`<div class="sph"><div class="spt">📖 ${it.topic}</div></div>`;
  body+=`<div class="sps">Details</div>`;
  if(it.desc) body+=`<div style="font-size:13px;color:var(--tx2);line-height:1.6;margin-bottom:8px">${it.desc}</div>`;
  if(it.link) body+=`<a href="${it.link}" target="_blank" style="display:inline-flex;align-items:center;gap:6px;color:var(--ac);font-size:12px;font-weight:600;margin-bottom:12px;text-decoration:none;word-break:break-all">🔗 ${it.link}</a>`;
  if(it.notes){
    body+=`<div class="sps">Notes</div>`;
    body+=`<div style="background:var(--s2);border:1px solid var(--bd);border-radius:8px;padding:10px 12px;font-size:12px;color:var(--tx2);white-space:pre-wrap;line-height:1.6;margin-bottom:12px">${it.notes}</div>`;
  }
  if(proj||svc||op){
    body+=`<div class="sps">Linked To</div>`;
    if(proj) body+=`<div onclick="openProjectDetail('${proj.id}')" style="font-size:12px;margin-bottom:5px;cursor:pointer;color:var(--ac)">◉ <strong>Project:</strong> ${proj.name}</div>`;
    if(svc) body+=`<div onclick="openSvcDetail('${svc.id}')" style="font-size:12px;margin-bottom:5px;cursor:pointer;color:var(--ac)">◐ <strong>Service:</strong> ${svc.name}</div>`;
    if(op) body+=`<div onclick="openEntityDetail('${op.id}','${DB.operators.find(o=>o.id===op.id)?'op':'co'}')" style="font-size:12px;margin-bottom:5px;cursor:pointer;color:var(--ac)">◑ <strong>Operator:</strong> ${op.name}</div>`;
  }
  if((it.tags||[]).length){
    body+=`<div class="sps">Tags</div>`;
    body+=`<div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:12px">${it.tags.map(t=>`<span style="background:var(--s2);border:1px solid var(--bd);font-size:11px;font-weight:600;padding:3px 9px;border-radius:20px;color:var(--tx2)">#${t}</span>`).join('')}</div>`;
  }
  body+=`<div style="font-size:11px;color:var(--tx3);margin-top:8px">Added by ${it.createdBy||'?'} on ${fd(it.at?.slice(0,10)||'')}${it.updatedAt?' · Updated '+fd(it.updatedAt?.slice(0,10)):''}</div>`;
  if(isAdmin()||it.createdBy===CU?.name){
    body+=`<div class="spa"><button class="btn bp bsm" onclick="openLibModal('${it.id}')">✏ Edit</button><button class="btn bd2 bsm" onclick="deleteLibEntry('${it.id}');closeSP()">Delete</button></div>`;
  }
  openSP('📖 Library Entry',body);
};

// Request access
window.requestLibAccess=()=>{
  const reason=document.getElementById('lib-req-reason')?.value?.trim()||'';
  const reqs=getLibRequests();
  if(reqs.some(r=>r.memberId===CU?.id&&r.status==='Pending')){toast('Request already pending','bad');return;}
  const req={id:'lr'+gid(),memberId:CU.id,memberName:CU.name,reason,status:'Pending',at:now()};
  reqs.push(req);
  saveLibRequests(reqs);
  logAction('Library Access Requested',`${CU.name} requested library access${reason?' — Reason: '+reason:''}`, 'Info','Library','');
  toast('Request sent ✓ — admins have been notified','ok',5000);
  // Notify all admins + PMs
  DB.team.filter(m=>isAdminMember(m)).forEach(m=>{
    sendNotif(m.name,`${CU.name} requested Library access${reason?' — '+reason:''}`, 'Library Request','Library');
    notifyTG(m.id,'default',{desc:`📚 Library Access Request\n\n${CU.name} is requesting access to the Library.${reason?'\n\nReason: '+reason:''}\n\nPlease review in the app.`,link:appLink('library')});
  });
  nav('library',document.querySelector('[data-p="library"]'));
};

// Check if member is admin/PM/CEO for notifications
function isAdminMember(m){
  return AROLES.includes(m.role)||m.access==='Admin'||FULL.includes(m.name)||['CEO','Projects Manager','Project Manager'].includes(m.role);
}

window.showLibRequests=()=>{
  // Navigate to library page first so side panel renders in context
  nav('library',document.querySelector('[data-p="library"]'));
  setTimeout(()=>{
    const reqs=getLibRequests().filter(r=>r.status==='Pending');
    let body=`<div class="sph"><div class="spt">📩 Library Access Requests</div></div>`;
    if(!reqs.length){
      body+=`<div style="font-size:12px;color:var(--tx3);padding:10px 0">No pending requests</div>`;
    } else {
      reqs.forEach(r=>{
        const m=DB.team.find(x=>x.id===r.memberId);
        body+=`<div style="background:var(--s2);border:1px solid var(--bd);border-radius:10px;padding:12px;margin-bottom:10px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
            <span style="width:30px;height:30px;border-radius:50%;background:${m?.color||'#64748b'};display:inline-flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;color:#fff;flex-shrink:0">${m?.av||r.memberName[0]}</span>
            <div style="flex:1">
              <div style="font-size:13px;font-weight:700">${r.memberName}</div>
              <div style="font-size:10px;color:var(--tx3)">${m?.role||''} · ${fdt(r.at)}</div>
            </div>
          </div>
          ${r.reason?`<div style="font-size:12px;color:var(--tx2);background:var(--s);border-radius:7px;padding:7px 9px;margin-bottom:8px;font-style:italic">"${r.reason}"</div>`:''}
          <div style="display:flex;gap:6px">
            <button class="btn bp bsm" onclick="approveLibAccess('${r.id}')">✓ Approve</button>
            <button class="btn bd2 bsm" onclick="rejectLibAccess('${r.id}')">✕ Reject</button>
          </div>
        </div>`;
      });
    }
    openSP('Library Access Requests',body);
  },100);
};

window.approveLibAccess=(reqId)=>{
  const reqs=getLibRequests();
  const r=reqs.find(x=>x.id===reqId);if(!r)return;
  r.status='Approved';r.approvedBy=CU.name;r.approvedAt=now();
  saveLibRequests(reqs);
  const m=DB.team.find(x=>x.id===r.memberId);
  if(m){
    sendNotif(m.name,`Your Library access request has been approved by ${CU.name}`,'Library Access','Library');
    notifyTG(m.id,'default',{desc:`✅ Library Access Approved\n\nHi ${m.name}! ${CU.name} has approved your Library access. You can now access the Library.`,link:appLink('library')});
  }
  logAction('Library Access Approved',`${CU.name} approved library access for ${r.memberName}`,'Success','Library',`Requested: ${fd(r.at?.slice(0,10))}`);
  toast(`Access granted to ${r.memberName} ✓`,'ok');
  closeSP();
  nav('library',document.querySelector('[data-p="library"]'));
};

window.rejectLibAccess=(reqId)=>{
  const reqs=getLibRequests();
  const r=reqs.find(x=>x.id===reqId);if(!r)return;
  r.status='Rejected';r.rejectedBy=CU.name;r.rejectedAt=now();
  saveLibRequests(reqs);
  const m=DB.team.find(x=>x.id===r.memberId);
  if(m){
    sendNotif(m.name,`Your Library access request was declined by ${CU.name}`,'Library Access','Library');
    notifyTG(m.id,'default',{desc:`❌ Library Access Declined\n\nHi ${m.name}! Your Library access request was not approved by ${CU.name}. Contact your manager for more info.`,link:appLink('')});
  }
  logAction('Library Access Rejected',`${CU.name} rejected library access for ${r.memberName}`,'Warning','Library','');
  toast(`Request rejected`,'ok');
  closeSP();
  nav('library',document.querySelector('[data-p="library"]'));
};

window.openLibModal=(id, presetProjectId)=>{
  const items=getLibrary();
  const it=id?items.find(x=>x.id===id):null;
  document.getElementById('m-lib-t').textContent=it?'Edit Library Entry':'Add Library Entry';
  document.getElementById('lb-btn').textContent=it?'Save Changes':'Save Entry';
  document.getElementById('lb-topic').value=it?.topic||'';
  document.getElementById('lb-desc').value=it?.desc||'';
  document.getElementById('lb-link').value=it?.link||'';
  document.getElementById('lb-notes').value=it?.notes||'';
  document.getElementById('lb-tags').value=(it?.tags||[]).join(', ');
  const projSel=document.getElementById('lb-project');
  projSel.innerHTML='<option value="">— None —</option>'+DB.projects.map(p=>`<option value="${p.id}" ${(it?.projectId||presetProjectId)===p.id?'selected':''}>${p.name}</option>`).join('');
  const svcSel=document.getElementById('lb-service');
  svcSel.innerHTML='<option value="">— None —</option>'+(DB.services||[]).map(s=>`<option value="${s.id}" ${it?.serviceId===s.id?'selected':''}>${s.name}</option>`).join('');
  const opSel=document.getElementById('lb-operator');
  opSel.innerHTML='<option value="">— None —</option>'+([ ...DB.operators,...DB.companies]).map(o=>`<option value="${o.id}" ${it?.operatorId===o.id?'selected':''}>${o.name}</option>`).join('');
  document.getElementById('lb-btn').dataset.editId=id||'';
  OM('m-lib');
};

window.saveLibEntry=()=>{
  const topic=document.getElementById('lb-topic').value.trim();
  if(!topic){toast('Enter a topic/title','bad');return;}
  const items=getLibrary();
  const editId=document.getElementById('lb-btn').dataset.editId;
  const tags=document.getElementById('lb-tags').value.split(',').map(t=>t.trim()).filter(Boolean);
  const data={topic,desc:document.getElementById('lb-desc').value.trim(),link:document.getElementById('lb-link').value.trim(),notes:document.getElementById('lb-notes').value.trim(),projectId:document.getElementById('lb-project').value||null,serviceId:document.getElementById('lb-service').value||null,operatorId:document.getElementById('lb-operator').value||null,tags};
  if(editId){
    const it=items.find(x=>x.id===editId);
    if(it){Object.assign(it,data);it.updatedAt=now();}
    logAction('Library Updated',`${CU.name} updated library entry "${topic}"`,'Info','Library','');
  } else {
    items.unshift({id:'lb'+gid(),...data,createdBy:CU?.name||'',at:now()});
    logAction('Library Entry Added',`${CU.name} added library entry "${topic}"`,'Success','Library','');
  }
  saveLibrary(items);
  CM('m-lib');
  toast(editId?'Entry updated ✓':'Entry added ✓','ok');
  nav('library',document.querySelector('[data-p="library"]'));
};

window.deleteLibEntry=(id)=>{
  const it=getLibrary().find(x=>x.id===id);
  if(!confirm(`Delete "${it?.topic||'this entry'}"?`))return;
  saveLibrary(getLibrary().filter(x=>x.id!==id));
  logAction('Library Deleted',`${CU.name} deleted library entry "${it?.topic||id}"`,'Warning','Library','');
  toast('Entry deleted','ok');
  nav('library',document.querySelector('[data-p="library"]'));
};
