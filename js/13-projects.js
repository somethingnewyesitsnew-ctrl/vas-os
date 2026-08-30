// §13 ── PROJECTS ────────────────────────────────────────────────────────
function rProjects(el){
  if(!canDoStrict('projects')){el.innerHTML='<div class="empty"><div class="ei">🔒</div><div class="et">Access Restricted</div><div class="es">Ask an admin to grant you Projects access.</div></div>';return;}
  const sc={Active:'#2563eb',Planning:'#ca8a04',Completed:'#15803d','On Hold':'#ea580c',Cancelled:'#dc2626'};
  const allCompanies=[...new Set(DB.projects.map(p=>p.ownedBy||p.company_owner).filter(Boolean))];
  const allFields=[...new Set(DB.projects.map(p=>p.field_of_work).filter(Boolean))];

  function render(){
    const fCo=document.getElementById('prf-co')?.value||'';
    const fSt=document.getElementById('prf-st')?.value||'';
    const fFi=document.getElementById('prf-fi')?.value||'';
    const sq=(document.getElementById('prf-sq')?.value||'').toLowerCase();
    let prs=[...DB.projects];
    if(fCo) prs=prs.filter(p=>(p.ownedBy||p.company_owner)===fCo);
    if(fSt) prs=prs.filter(p=>p.status===fSt);
    if(fFi) prs=prs.filter(p=>p.field_of_work===fFi);
    if(sq)  prs=prs.filter(p=>(p.name||'').toLowerCase().includes(sq));

    let h=renderAccessSummary('projects','Projects')+`<div class="fb" style="margin-bottom:12px">
      <input class="si" id="prf-sq" placeholder="Search projects…" oninput="window._rPr&&window._rPr()" value="${sq}">
      <select class="fs" id="prf-co" onchange="window._rPr&&window._rPr()"><option value="">All companies</option>${allCompanies.map(c=>`<option ${fCo===c?'selected':''}>${c}</option>`).join('')}</select>
      <select class="fs" id="prf-fi" onchange="window._rPr&&window._rPr()"><option value="">All fields</option>${allFields.map(f=>`<option ${fFi===f?'selected':''}>${f}</option>`).join('')}</select>
      <select class="fs" id="prf-st" onchange="window._rPr&&window._rPr()"><option value="">All statuses</option>${['Planning','Active','On Hold','Completed','Cancelled'].map(s=>`<option ${fSt===s?'selected':''}>${s}</option>`).join('')}</select>
    </div>`;

    if(!prs.length){
      h+=`<div class="empty"><div class="ei">◉</div><div class="et">No projects${DB.projects.length?' match filters':' yet'}</div><div class="es">Click + New Project to create one</div></div>`;
      el.innerHTML=h;return;
    }

    h+=`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px">`;
    prs.forEach(pr=>{
      const tasks=DB.tasks.filter(t=>t.projectId===pr.id);
      const done=tasks.filter(t=>t.status==='Done').length;
      const active=tasks.filter(t=>!['Done','Cancelled'].includes(t.status));
      const overdue=active.filter(t=>getDueStatus(t).key==='overdue').length;
      const col=sc[pr.status]||'#64748b';
      const pct=tasks.length?Math.round(done/tasks.length*100):0;
      // Members from project.member_ids first, then from tasks
      const taskMembers=[...new Set(tasks.flatMap(t=>t.assignees?.length?t.assignees:[t.assignedTo]).filter(Boolean))];
      const projMembers=(pr.member_ids||[]);
      const members=[...new Set([...projMembers,...taskMembers])].map(mid=>DB.team.find(m=>m.id===mid)).filter(Boolean);
      const owner=pr.ownedBy||pr.company_owner;
      const relLibCount=(typeof getLibrary==='function'&&(typeof hasLibAccess!=='function'||hasLibAccess()))?getLibrary().filter(it=>it.projectId===pr.id).length:0;
      const relDocCount=DB.docs.filter(d=>{const t=d.fromTask?DB.tasks.find(x=>x.id===d.fromTask):null;return t&&t.projectId===pr.id;}).length;

      h+=`<div class="mc" onclick="openProjectDetail('${pr.id}')" style="padding:0;overflow:hidden;border-left:3px solid ${col}">
        <div style="padding:14px 16px 12px">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:8px">
            <div style="flex:1;min-width:0">
              <div style="font-size:14px;font-weight:800;line-height:1.3;color:var(--tx);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(pr.name)}</div>
              ${pr.field_of_work?`<div style="font-size:10px;color:var(--tx3);font-weight:600;margin-top:1px">${pr.field_of_work}</div>`:''}
            </div>
            <span style="background:${col}18;color:${col};border:1px solid ${col}30;font-size:9px;font-weight:800;padding:3px 9px;border-radius:20px;flex-shrink:0;white-space:nowrap">${pr.status}</span>
          </div>

          <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px">
            ${owner?`<span style="display:inline-flex;align-items:center;gap:4px;font-size:10px;color:var(--tx2);font-weight:600">🏢 ${owner}</span>`:''}
            ${pr.locationName?`<span style="display:inline-flex;align-items:center;gap:4px;font-size:10px;color:var(--tx2);font-weight:600">📍 ${pr.locationName}</span>`:''}
            ${pr.targetDate?`<span style="display:inline-flex;align-items:center;gap:4px;font-size:10px;color:var(--tx2);font-weight:600">🎯 ${fd(pr.targetDate)}</span>`:''}
            ${pr.link?`<a href="${pr.link}" target="_blank" onclick="event.stopPropagation()" style="display:inline-flex;align-items:center;gap:4px;font-size:10px;color:var(--ac);font-weight:600;text-decoration:none">🔗 Link</a>`:''}
          </div>

          <div style="display:flex;align-items:center;gap:8px;margin-bottom:${members.length?'10px':'2px'}">
            <div style="flex:1;height:6px;background:var(--s2);border-radius:3px;overflow:hidden"><div style="height:100%;width:${pct}%;background:${col};border-radius:3px;transition:width .4s"></div></div>
            <span style="font-size:11px;font-weight:800;color:${col};flex-shrink:0;min-width:30px;text-align:right">${pct}%</span>
          </div>
          <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:${members.length?'10px':'0'}">
            <span style="background:var(--s2);border:1px solid var(--bd);font-size:9px;font-weight:700;padding:2px 8px;border-radius:20px;color:var(--tx2)">${tasks.length} tasks</span>
            <span style="background:#f0fdf4;border:1px solid #bbf7d0;font-size:9px;font-weight:700;padding:2px 8px;border-radius:20px;color:#15803d">${done} done</span>
            <span style="background:var(--al);border:1px solid #bfdbfe;font-size:9px;font-weight:700;padding:2px 8px;border-radius:20px;color:var(--ac)">${active.length} active</span>
            ${overdue?`<span style="background:#fef2f2;border:1px solid #fca5a5;font-size:9px;font-weight:700;padding:2px 8px;border-radius:20px;color:#dc2626">⚠ ${overdue} overdue</span>`:''}
            ${relLibCount?`<span style="background:#faf5ff;border:1px solid #e9d5ff;font-size:9px;font-weight:700;padding:2px 8px;border-radius:20px;color:#7c3aed">📖 ${relLibCount}</span>`:''}
            ${relDocCount?`<span style="background:#f0fdf4;border:1px solid #bbf7d0;font-size:9px;font-weight:700;padding:2px 8px;border-radius:20px;color:#15803d">📚 ${relDocCount}</span>`:''}
          </div>

          ${members.length?`<div style="display:flex;align-items:center">
            ${members.slice(0,5).map((m,i)=>`<span title="${esc(m.name)}" style="width:24px;height:24px;border-radius:50%;background:${m.color};display:inline-flex;align-items:center;justify-content:center;font-size:9px;font-weight:800;color:#fff;border:2px solid var(--s);margin-left:${i>0?'-7px':'0'};flex-shrink:0">${m.av}</span>`).join('')}
            ${members.length>5?`<span style="width:24px;height:24px;border-radius:50%;background:var(--s2);border:2px solid var(--s);display:inline-flex;align-items:center;justify-content:center;font-size:8px;font-weight:800;color:var(--tx3);margin-left:-7px">+${members.length-5}</span>`:''}
          </div>`:''}
        </div>

        <div class="ac" onclick="event.stopPropagation()" style="display:flex;gap:5px;padding:8px 12px;border-top:1px solid var(--bd);background:var(--s2)">
          <div class="ib" style="color:var(--ac)" title="Add task to this project" onclick="event.stopPropagation();openTaskModal(null,'${pr.id}')">☑+</div>
          <div class="ib edt" onclick="event.stopPropagation();openProjectModal('${pr.id}')">✏</div>
          <div class="ib del" style="margin-left:auto" onclick="event.stopPropagation();delItem('projects','${pr.id}')">🗑</div>
        </div>
      </div>`;
    });
    h+=`</div>`;
    el.innerHTML=h;
  }
  window._rPr=render;
  render();
}


window.openProjectDetail=(id)=>{
  const pr=DB.projects.find(x=>x.id===id);if(!pr)return;
  const tasks=DB.tasks.filter(t=>t.projectId===pr.id);
  const done=tasks.filter(t=>t.status==='Done').length;
  const active=tasks.filter(t=>!['Done','Cancelled'].includes(t.status)).length;
  const pct=tasks.length?Math.round(done/tasks.length*100):0;
  const col={Active:'#2563eb',Planning:'#ca8a04',Completed:'#15803d','On Hold':'#ea580c',Cancelled:'#dc2626'}[pr.status]||'#64748b';
  const members=[...new Set(tasks.flatMap(t=>t.assignees?.length?t.assignees:[t.assignedTo]).filter(Boolean))];
  openSP(pr.name,
    `<span style="background:${col}18;color:${col};border:1px solid ${col}28;font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px">${pr.status}</span>`,
    `<div class="sg2">
      <div class="spf"><div class="spl">Location</div><div class="spv">${pr.locationName||'—'}</div></div>
      <div class="spf"><div class="spl">Owner</div><div class="spv">${pr.ownedBy||'—'}</div></div>
      <div class="spf"><div class="spl">Started</div><div class="spv">${fd(pr.startedAt)}</div></div>
      <div class="spf"><div class="spl">Target</div><div class="spv">${fd(pr.targetDate)}</div></div>
      ${pr.budget?`<div class="spf"><div class="spl">Budget</div><div class="spv">$${pr.budget.toLocaleString()}</div></div>`:''}
      ${pr.link?`<div class="spf" style="grid-column:1/-1"><div class="spl">Link</div><div class="spv"><a href="${pr.link}" target="_blank" style="color:var(--ac)">${pr.link}</a></div></div>`:''}
    </div>
    ${pr.desc?`<div class="spf"><div class="spl">Description</div><div class="spnote">${esc(pr.desc)}</div></div>`:''}
    ${renderAboutBenefitsBlock(pr)}
    <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--tx3);margin-bottom:5px;margin-top:12px"><span>${tasks.length} total tasks</span><span style="font-weight:700;color:${col}">${pct}%</span></div>
    <div class="prg" style="height:6px;margin-bottom:10px"><div class="prf" style="width:${pct}%;background:${col}"></div></div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:5px;margin-bottom:12px">
      ${[['Done',done,'#15803d'],['Active',active,'#2563eb'],['Total',tasks.length,'#64748b']].map(([l,v,c])=>`<div style="background:${c}12;border:1px solid ${c}25;border-radius:8px;padding:8px;text-align:center"><div style="font-size:9px;color:var(--tx3);font-weight:600;margin-bottom:2px;text-transform:uppercase">${l}</div><div style="font-size:16px;font-weight:700;color:${c}">${v}</div></div>`).join('')}
    </div>
    ${members.length?`<div class="spl" style="margin-bottom:6px">Team (${members.length})</div><div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:12px">${members.map(mid=>{const m=DB.team.find(x=>x.id===mid);return m?`<span style="background:${m.color}22;color:${m.color};border:1px solid ${m.color}33;font-size:10px;font-weight:600;padding:2px 9px;border-radius:20px">${esc(m.name)}</span>`:''}).join('')}</div>`:''}
    ${(()=>{
      if(typeof hasLibAccess==='function' && !hasLibAccess()) return ''; // respect Library access control
      const relLib=(typeof getLibrary==='function'?getLibrary():[]).filter(it=>it.projectId===pr.id);
      const chips=relLib.map(it=>`<span onclick="openLibEntry('${it.id}')" style="cursor:pointer;background:var(--al);color:var(--ac);border:1px solid #bfdbfe;font-size:10px;font-weight:700;padding:3px 10px;border-radius:20px">📖 ${it.topic}</span>`).join('');
      return `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
        <div class="spl" style="margin-bottom:0">📖 Library (${relLib.length})</div>
        <button class="btn bp bxs" onclick="openLibModal(null,'${pr.id}')">+ Add</button>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:12px">
        ${chips||'<span style="font-size:11px;color:var(--tx3)">No entries linked yet</span>'}
      </div>`;
    })()}
    ${(()=>{
      const relDocs=DB.docs.filter(d=>{const t=d.fromTask?DB.tasks.find(x=>x.id===d.fromTask):null;return t&&t.projectId===pr.id;});
      if(!relDocs.length) return '';
      return `<div class="spl" style="margin-bottom:6px">📚 Documentation (${relDocs.length})</div><div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:12px">${relDocs.map(d=>`<span onclick="openDoc2('${d.id}')" style="cursor:pointer;background:#f0fdf4;color:#15803d;border:1px solid #bbf7d0;font-size:10px;font-weight:700;padding:3px 10px;border-radius:20px">📚 ${esc(d.title)}</span>`).join('')}</div>`;
    })()}
    ${renderFuturePlansBlock('projects',pr)}
    <div id="proj-tasks-wrap"></div>
    <div class="spa">
      <button class="btn bg2 bsm" onclick="openProjectModal('${pr.id}')">✏ Edit</button>
      <button class="btn bd2 bsm" onclick="delItem('projects','${pr.id}');closeSP()">Delete</button>
    </div>`
  );
  renderProjectTasksList(pr.id);
};

// ── Task list inside a project's side panel ──────────────────────────
// Separate render function (rather than baked into openProjectDetail's
// one-shot HTML string) so the tab clicks below can re-render just this
// block without rebuilding/reopening the whole panel.
window.renderProjectTasksList=(projectId, tab)=>{
  const wrap=document.getElementById('proj-tasks-wrap');
  if(!wrap) return;
  tab=tab||wrap.dataset.tab||'Active';
  wrap.dataset.tab=tab;
  const all=DB.tasks.filter(t=>t.projectId===projectId);
  const TABS=['Active','Done','All'];
  const filtered=tab==='All'?all:tab==='Done'?all.filter(t=>t.status==='Done'):all.filter(t=>!['Done','Cancelled'].includes(t.status));
  const shown=filtered.slice(0,15);

  let h=`<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;flex-wrap:wrap;gap:6px">
    <div class="spl" style="margin-bottom:0">Tasks (${all.length})</div>
    <button class="btn bp bxs" onclick="openTaskModal(null,'${projectId}')">+ Add Task</button>
  </div>
  <div class="tabs" style="margin-bottom:8px">
    ${TABS.map(tb=>`<div class="tab ${tb===tab?'on':''}" onclick="renderProjectTasksList('${projectId}','${tb}')" style="font-size:12px">${tb} <span style="opacity:.5;font-size:10px">${tb==='All'?all.length:tb==='Done'?all.filter(t=>t.status==='Done').length:all.filter(t=>!['Done','Cancelled'].includes(t.status)).length}</span></div>`).join('')}
  </div>`;

  if(!filtered.length){
    h+=`<div style="text-align:center;padding:16px 0;font-size:12px;color:var(--tx3)">No ${tab==='All'?'':tab.toLowerCase()+' '}tasks yet${tab!=='Done'?' — click + Add Task above':''}</div>`;
  } else {
    h+=shown.map(t=>{
      const ds=getDueStatus(t);
      const ass=DB.team.find(m=>m.id===t.assignedTo);
      return`<div onclick="openTask('${t.id}')" style="display:flex;align-items:center;gap:7px;padding:7px 0;border-bottom:1px solid var(--bd);cursor:pointer">
        ${spill(t.status)}
        <span style="font-size:12px;font-weight:500;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(t.title)}</span>
        ${ass?`<span style="width:18px;height:18px;border-radius:50%;background:${ass.color};display:inline-flex;align-items:center;justify-content:center;font-size:7px;color:#fff;font-weight:800;flex-shrink:0" title="${esc(ass.name)}">${ass.av}</span>`:''}
        ${ppill(t.priority)}
        <span class="due-badge ${ds.cls}" style="flex-shrink:0">${ds.label}</span>
      </div>`;
    }).join('');
    if(filtered.length>shown.length){
      h+=`<div onclick="closeSP();window._navProject='${projectId}';navTo('alltasks')" style="text-align:center;padding:9px 0;font-size:11px;color:var(--ac);font-weight:700;cursor:pointer">+${filtered.length-shown.length} more — view all in All Tasks →</div>`;
    } else if(all.length){
      h+=`<div onclick="closeSP();window._navProject='${projectId}';navTo('alltasks')" style="text-align:center;padding:9px 0;font-size:11px;color:var(--ac);font-weight:700;cursor:pointer">View in All Tasks →</div>`;
    }
  }
  wrap.innerHTML=h;
};

// ── About / Benefits / Future Plans — shared by Projects & Services ──
// entityType is 'projects' or 'services'; both tables carry the same
// about/benefits/future_plans columns (see Supabase migration).
function renderAboutBenefitsBlock(entity){
  let h='';
  if(entity.about) h+=`<div class="spf"><div class="spl">About</div><div class="spnote">${entity.about}</div></div>`;
  if(entity.benefits) h+=`<div class="spf"><div class="spl">Benefits</div><div class="spnote">${entity.benefits}</div></div>`;
  return h;
}

function renderFuturePlansBlock(entityType,entity){
  const plans=entity.future_plans||[];
  return `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
      <div class="spl" style="margin-bottom:0">🗺 Future Plans (${plans.length})</div>
      <button class="btn bp bxs" onclick="addFuturePlan('${entityType}','${entity.id}')">+ Add Plan</button>
    </div>
    <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:12px">
      ${plans.length?plans.map(p=>`<div style="display:flex;align-items:center;gap:8px;padding:8px 10px;background:var(--s2);border:1px solid var(--bd);border-radius:8px">
        <span style="flex:1;font-size:12px;color:var(--tx)">${esc(p.text)}</span>
        ${p.taskId?`<span onclick="openTask('${p.taskId}')" style="cursor:pointer;font-size:10px;font-weight:700;color:#15803d;background:#15803d18;padding:2px 8px;border-radius:100px;flex-shrink:0;white-space:nowrap">✓ Task created</span>`
          :`<button class="btn bg2 bxs" onclick="convertFuturePlanToTask('${entityType}','${entity.id}','${p.id}')">→ Convert to Task</button>`}
        <span onclick="deleteFuturePlan('${entityType}','${entity.id}','${p.id}')" style="cursor:pointer;color:var(--tx3);font-size:13px;flex-shrink:0" title="Remove plan">🗑</span>
      </div>`).join(''):'<div style="font-size:11px;color:var(--tx3)">No future plans yet — click + Add Plan</div>'}
    </div>`;
}

function _fpFindEntity(entityType,entityId){
  const list=entityType==='projects'?DB.projects:DB.services;
  return list.find(x=>x.id===entityId);
}
function _fpSave(entityType,entity){
  return entityType==='projects'?nProjectUpd(entity):nServiceUpd(entity);
}
function _fpReopen(entityType,entityId){
  entityType==='projects'?openProjectDetail(entityId):openSvcDetail(entityId);
}

window.addFuturePlan=async(entityType,entityId)=>{
  const text=prompt('Describe the future plan / next step:');
  if(!text||!text.trim())return;
  const ent=_fpFindEntity(entityType,entityId);if(!ent)return;
  ent.future_plans=ent.future_plans||[];
  ent.future_plans.push({id:'fp'+gid(),text:text.trim(),taskId:null,at:now()});
  await _fpSave(entityType,ent);
  toast('Plan added ✓','ok');
  _fpReopen(entityType,entityId);
};

window.deleteFuturePlan=async(entityType,entityId,planId)=>{
  const ent=_fpFindEntity(entityType,entityId);if(!ent)return;
  ent.future_plans=(ent.future_plans||[]).filter(p=>p.id!==planId);
  await _fpSave(entityType,ent);
  _fpReopen(entityType,entityId);
};

window.convertFuturePlanToTask=async(entityType,entityId,planId)=>{
  const ent=_fpFindEntity(entityType,entityId);if(!ent)return;
  const plan=(ent.future_plans||[]).find(p=>p.id===planId);
  if(!plan||plan.taskId)return;
  const t={id:'t'+gid(),title:plan.text,status:'New',priority:'Medium',type:'Feature',
    assignedTo:'',assignees:[],reviewer:'',
    service:entityType==='services'?entityId:'',
    operator:'',company2:null,link:'',
    projectId:entityType==='projects'?entityId:null,
    reqBy:CU?.name||'',due:'',est:null,recur:null,actual:null,
    what:'',tech:'',rejReason:'',createdBy:CU?.name||'',
    tsCreated:now(),tsAssigned:null,tsOpened:null,tsStarted:null,tsSubmitted:null,tsReviewed:null,tsArchived:null,
    rejections:[],desc:`Converted from ${entityType==='projects'?'project':'service'} future plan: "${esc(plan.text)}"`,
    respH:null,workH:null,revH:null,cycleH:null};
  DB.tasks.unshift(t);
  const r=await nCreateTask(t,t.id); if(r?.id) t.id=r.id;
  plan.taskId=t.id;
  await _fpSave(entityType,ent);
  if(typeof logAction==='function') logAction('Task Created',`${CU?.name||'Someone'} converted a future plan into task "${esc(plan.text)}"`,'Success',plan.text,'');
  if(typeof updateBadges==='function') updateBadges();
  toast('Converted to task ✓','ok');
  _fpReopen(entityType,entityId);
};
