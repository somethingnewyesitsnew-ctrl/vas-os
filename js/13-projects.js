// §13 ── PROJECTS ────────────────────────────────────────────────────────
function rProjects(el){
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

    let h=`<div class="fb" style="margin-bottom:12px">
      <input class="si" id="prf-sq" placeholder="Search projects…" oninput="window._rPr&&window._rPr()" value="${sq}">
      <select class="fs" id="prf-co" onchange="window._rPr&&window._rPr()"><option value="">All companies</option>${allCompanies.map(c=>`<option ${fCo===c?'selected':''}>${c}</option>`).join('')}</select>
      <select class="fs" id="prf-fi" onchange="window._rPr&&window._rPr()"><option value="">All fields</option>${allFields.map(f=>`<option ${fFi===f?'selected':''}>${f}</option>`).join('')}</select>
      <select class="fs" id="prf-st" onchange="window._rPr&&window._rPr()"><option value="">All statuses</option>${['Planning','Active','On Hold','Completed','Cancelled'].map(s=>`<option ${fSt===s?'selected':''}>${s}</option>`).join('')}</select>
    </div>`;

    if(!prs.length){
      h+=`<div class="empty"><div class="ei">◉</div><div class="et">No projects${DB.projects.length?' match filters':' yet'}</div><div class="es">Click + New Project to create one</div></div>`;
      el.innerHTML=h;return;
    }

    h+=`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:10px">`;
    prs.forEach(pr=>{
      const tasks=DB.tasks.filter(t=>t.projectId===pr.id);
      const done=tasks.filter(t=>t.status==='Done').length;
      const active=tasks.filter(t=>!['Done','Cancelled'].includes(t.status)).length;
      const col=sc[pr.status]||'#64748b';
      const pct=tasks.length?Math.round(done/tasks.length*100):0;
      // Members from project.member_ids first, then from tasks
      const taskMembers=[...new Set(tasks.flatMap(t=>t.assignees?.length?t.assignees:[t.assignedTo]).filter(Boolean))];
      const projMembers=(pr.member_ids||[]);
      const members=[...new Set([...projMembers,...taskMembers])];
      h+=`<div class="mc" onclick="openProjectDetail('${pr.id}')">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px">
          <div style="font-size:13px;font-weight:700;flex:1;margin-right:8px;line-height:1.3">${pr.name}</div>
          <span style="background:${col}18;color:${col};border:1px solid ${col}28;font-size:9px;font-weight:700;padding:2px 7px;border-radius:20px;flex-shrink:0">${pr.status}</span>
        </div>
        <div style="font-size:10px;color:var(--tx3);line-height:1.9;margin-bottom:7px">
          ${(pr.ownedBy||pr.company_owner)?`<div>🏢 ${pr.ownedBy||pr.company_owner}</div>`:''}
          ${pr.field_of_work?`<div>⚙ ${pr.field_of_work}</div>`:''}
          ${pr.locationName?`<div>📍 ${pr.locationName}</div>`:''}
          ${pr.startedAt?`<div>📅 Started ${fd(pr.startedAt)}</div>`:''}
          ${pr.targetDate?`<div>🎯 Target ${fd(pr.targetDate)}</div>`:''}
          ${pr.link?`<div><a href="${pr.link}" target="_blank" onclick="event.stopPropagation()" style="color:var(--ac);font-size:10px">🔗 Link</a></div>`:''}
        </div>
        <div style="margin-bottom:7px">
          <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--tx3);margin-bottom:3px">
            <span>${tasks.length} tasks · ${done} done · ${active} active</span>
            <span style="font-weight:700;color:${col}">${pct}%</span>
          </div>
          <div class="prg"><div class="prf" style="width:${pct}%;background:${col}"></div></div>
        </div>
        ${members.length?`<div style="display:flex;flex-wrap:wrap;gap:3px;margin-bottom:8px">${members.slice(0,5).map(mid=>{const m=DB.team.find(x=>x.id===mid);return m?`<span style="background:${m.color}22;color:${m.color};border:1px solid ${m.color}33;font-size:9px;font-weight:600;padding:1px 6px;border-radius:10px">${m.name.split(' ')[0]}</span>`:''}).join('')}</div>`:''}
        <div class="ac" onclick="event.stopPropagation()">
          <div class="ib" style="color:var(--ac)" title="Add task to this project" onclick="event.stopPropagation();openTaskModal(null,'${pr.id}')">☑+</div>
          <div class="ib edt" onclick="event.stopPropagation();openProjectModal('${pr.id}')">✏</div>
          <div class="ib del" onclick="event.stopPropagation();delItem('projects','${pr.id}','${pr.name.replace(/'/g,"\'")}')">🗑</div>
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
    ${pr.desc?`<div class="spf"><div class="spl">Description</div><div class="spnote">${pr.desc}</div></div>`:''}
    <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--tx3);margin-bottom:5px;margin-top:12px"><span>${tasks.length} total tasks</span><span style="font-weight:700;color:${col}">${pct}%</span></div>
    <div class="prg" style="height:6px;margin-bottom:10px"><div class="prf" style="width:${pct}%;background:${col}"></div></div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:5px;margin-bottom:12px">
      ${[['Done',done,'#15803d'],['Active',active,'#2563eb'],['Total',tasks.length,'#64748b']].map(([l,v,c])=>`<div style="background:${c}12;border:1px solid ${c}25;border-radius:8px;padding:8px;text-align:center"><div style="font-size:9px;color:var(--tx3);font-weight:600;margin-bottom:2px;text-transform:uppercase">${l}</div><div style="font-size:16px;font-weight:700;color:${c}">${v}</div></div>`).join('')}
    </div>
    ${members.length?`<div class="spl" style="margin-bottom:6px">Team (${members.length})</div><div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:12px">${members.map(mid=>{const m=DB.team.find(x=>x.id===mid);return m?`<span style="background:${m.color}22;color:${m.color};border:1px solid ${m.color}33;font-size:10px;font-weight:600;padding:2px 9px;border-radius:20px">${m.name}</span>`:''}).join('')}</div>`:''}
    <div id="proj-tasks-wrap"></div>
    <div class="spa">
      <button class="btn bg2 bsm" onclick="openProjectModal('${pr.id}')">✏ Edit</button>
      <button class="btn bd2 bsm" onclick="delItem('projects','${pr.id}','${pr.name.replace(/'/g,"\'")}');closeSP()">Delete</button>
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
        <span style="font-size:12px;font-weight:500;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${t.title}</span>
        ${ass?`<span style="width:18px;height:18px;border-radius:50%;background:${ass.color};display:inline-flex;align-items:center;justify-content:center;font-size:7px;color:#fff;font-weight:800;flex-shrink:0" title="${ass.name}">${ass.av}</span>`:''}
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
