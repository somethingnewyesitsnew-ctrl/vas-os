// ══════════════════════════════════════════════════════════════════════
// MATERIAL PAGE OVERRIDES — loaded ONLY by material.html, after every
// shared js/*.js module. Redefines a few render functions in place
// (function redeclaration in global scope = last one wins) so index.html
// and the shared js/ files are never modified.
// ══════════════════════════════════════════════════════════════════════

// ── 1. Version badge — informational only, not a link ──────────────────
(function(){
  function killVersionBadgeClick(){
    const el=document.getElementById('sb-version-badge');
    if(!el)return;
    el.onclick=null;
    el.style.cursor='default';
    el.removeAttribute('title');
  }
  killVersionBadgeClick();
  // The original loadVersionBadge() also re-assigns onclick asynchronously
  // once its GitHub API fetch resolves — neutralize that too.
  setTimeout(killVersionBadgeClick,1200);
  setTimeout(killVersionBadgeClick,3500);
})();

// ── Small shared helper: a trend/delta chip comparing two period values ─
// invert=true means "lower is better" (overdue, rejections, cycle time)
function deltaChip(curr,prev,invert){
  curr=curr||0; prev=prev||0;
  if(prev===0&&curr===0) return `<span style="display:inline-flex;align-items:center;gap:3px;font-size:11px;font-weight:700;color:var(--tx3);background:var(--s2);padding:2px 8px;border-radius:100px">— flat</span>`;
  let pct = prev===0 ? 100 : Math.round((curr-prev)/prev*100);
  const up = curr>prev, flat = curr===prev;
  const good = flat ? null : invert ? !up : up;
  const color = flat?'var(--tx3)':good?'#146C2E':'#B3261E';
  const bg = flat?'var(--s2)':good?'var(--gb)':'var(--rb)';
  const arrow = flat?'—':up?'▲':'▼';
  return `<span style="display:inline-flex;align-items:center;gap:3px;font-size:11px;font-weight:700;color:${color};background:${bg};padding:2px 9px;border-radius:100px;white-space:nowrap">${arrow} ${Math.abs(pct)}%</span>`;
}

// ── 2. PROJECTS — corporate card redesign ───────────────────────────────
function rProjects(el){
  const sc={Active:'#3762E4',Planning:'#8A5300',Completed:'#146C2E','On Hold':'#8A4A16',Cancelled:'#B3261E'};
  const allCompanies=[...new Set(DB.projects.map(p=>p.ownedBy||p.company_owner).filter(Boolean))];
  const allFields=[...new Set(DB.projects.map(p=>p.field_of_work).filter(Boolean))];

  function donutRing(pct,col,size=52){
    const r=(size-8)/2, c=2*Math.PI*r, off=c*(1-pct/100);
    return `<svg width="${size}" height="${size}" style="flex-shrink:0;transform:rotate(-90deg)">
      <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="var(--s2)" stroke-width="6"/>
      <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="${col}" stroke-width="6" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${off}" style="transition:stroke-dashoffset .6s ease"/>
    </svg>`;
  }

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

    // Portfolio summary strip
    const totalP=DB.projects.length;
    const activeP=DB.projects.filter(p=>p.status==='Active').length;
    const atRiskP=DB.projects.filter(p=>{
      const ts=DB.tasks.filter(t=>t.projectId===p.id&&!['Done','Cancelled'].includes(t.status));
      return ts.some(t=>getDueStatus(t).key==='overdue');
    }).length;
    const completedP=DB.projects.filter(p=>p.status==='Completed').length;

    let h=`<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px">
      ${[
        {l:'Total Projects',v:totalP,c:'#3762E4'},
        {l:'Active',v:activeP,c:'#146C2E'},
        {l:'At Risk',v:atRiskP,c:atRiskP?'#B3261E':'#146C2E'},
        {l:'Completed',v:completedP,c:'#6750A4'},
      ].map(k=>`<div style="background:var(--s);border:1px solid var(--bd);border-radius:16px;padding:14px 16px">
        <div style="font-size:22px;font-weight:500;color:${k.c};line-height:1">${k.v}</div>
        <div style="font-size:11px;font-weight:600;color:var(--tx3);margin-top:4px">${k.l}</div>
      </div>`).join('')}
    </div>`;

    h+=`<div class="fb" style="margin-bottom:16px">
      <input class="si" id="prf-sq" placeholder="Search projects…" oninput="window._rPr&&window._rPr()" value="${sq}">
      <select class="fs" id="prf-co" onchange="window._rPr&&window._rPr()"><option value="">All companies</option>${allCompanies.map(c=>`<option ${fCo===c?'selected':''}>${c}</option>`).join('')}</select>
      <select class="fs" id="prf-fi" onchange="window._rPr&&window._rPr()"><option value="">All fields</option>${allFields.map(f=>`<option ${fFi===f?'selected':''}>${f}</option>`).join('')}</select>
      <select class="fs" id="prf-st" onchange="window._rPr&&window._rPr()"><option value="">All statuses</option>${['Planning','Active','On Hold','Completed','Cancelled'].map(s=>`<option ${fSt===s?'selected':''}>${s}</option>`).join('')}</select>
    </div>`;

    if(!prs.length){
      h+=`<div class="empty"><div class="ei">◉</div><div class="et">No projects${DB.projects.length?' match filters':' yet'}</div><div class="es">Click + New Project to create one</div></div>`;
      el.innerHTML=h;return;
    }

    h+=`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:14px">`;
    prs.forEach(pr=>{
      const tasks=DB.tasks.filter(t=>t.projectId===pr.id);
      const done=tasks.filter(t=>t.status==='Done').length;
      const active=tasks.filter(t=>!['Done','Cancelled'].includes(t.status));
      const overdue=active.filter(t=>getDueStatus(t).key==='overdue').length;
      const col=sc[pr.status]||'#767B8D';
      const pct=tasks.length?Math.round(done/tasks.length*100):0;
      const taskMembers=[...new Set(tasks.flatMap(t=>t.assignees?.length?t.assignees:[t.assignedTo]).filter(Boolean))];
      const projMembers=(pr.member_ids||[]);
      const members=[...new Set([...projMembers,...taskMembers])].map(mid=>DB.team.find(m=>m.id===mid)).filter(Boolean);
      const owner=pr.ownedBy||pr.company_owner;
      const relLibCount=(typeof getLibrary==='function'&&(typeof hasLibAccess!=='function'||hasLibAccess()))?getLibrary().filter(it=>it.projectId===pr.id).length:0;
      const relDocCount=DB.docs.filter(d=>{const t=d.fromTask?DB.tasks.find(x=>x.id===d.fromTask):null;return t&&t.projectId===pr.id;}).length;
      const dueSoon=pr.targetDate?getDueStatus({due:pr.targetDate,status:pr.status==='Completed'?'Done':'Active',tsReviewed:pr.completedAt}):null;

      h+=`<div class="mc" onclick="openProjectDetail('${pr.id}')" style="padding:0;overflow:hidden;position:relative">
        <div style="height:4px;background:${col}"></div>
        <div style="padding:16px 18px 14px">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:12px">
            <div style="flex:1;min-width:0">
              <div style="font-size:15px;font-weight:600;line-height:1.35;color:var(--tx);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${pr.name}</div>
              <div style="display:flex;align-items:center;gap:6px;margin-top:4px;flex-wrap:wrap">
                <span style="background:${col}18;color:${col};font-size:10.5px;font-weight:700;padding:2px 10px;border-radius:100px">${pr.status}</span>
                ${pr.field_of_work?`<span style="font-size:10.5px;color:var(--tx3);font-weight:600">· ${pr.field_of_work}</span>`:''}
              </div>
            </div>
            <div style="position:relative;flex-shrink:0">
              ${donutRing(pct,col)}
              <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:${col}">${pct}%</div>
            </div>
          </div>

          ${(owner||pr.locationName||pr.targetDate||pr.link)?`<div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid var(--bd)">
            ${owner?`<span style="display:inline-flex;align-items:center;gap:5px;font-size:11.5px;color:var(--tx2);font-weight:500">🏢 ${owner}</span>`:''}
            ${pr.locationName?`<span style="display:inline-flex;align-items:center;gap:5px;font-size:11.5px;color:var(--tx2);font-weight:500">📍 ${pr.locationName}</span>`:''}
            ${pr.targetDate?`<span style="display:inline-flex;align-items:center;gap:5px;font-size:11.5px;font-weight:600;color:${dueSoon&&dueSoon.key==='overdue'?'var(--r)':'var(--tx2)'}">🎯 ${fd(pr.targetDate)}</span>`:''}
            ${pr.link?`<a href="${pr.link}" target="_blank" onclick="event.stopPropagation()" style="display:inline-flex;align-items:center;gap:5px;font-size:11.5px;color:var(--ac);font-weight:600;text-decoration:none">🔗 Link</a>`:''}
          </div>`:''}

          <div style="display:grid;grid-template-columns:repeat(${overdue?4:3},1fr);gap:8px;margin-bottom:${members.length?'14px':'2px'}">
            <div style="text-align:center;background:var(--s2);border-radius:12px;padding:8px 4px">
              <div style="font-size:16px;font-weight:600;color:var(--tx)">${tasks.length}</div>
              <div style="font-size:9.5px;font-weight:600;color:var(--tx3);text-transform:uppercase;margin-top:2px">Tasks</div>
            </div>
            <div style="text-align:center;background:var(--gb);border-radius:12px;padding:8px 4px">
              <div style="font-size:16px;font-weight:600;color:var(--g)">${done}</div>
              <div style="font-size:9.5px;font-weight:600;color:var(--g);text-transform:uppercase;margin-top:2px">Done</div>
            </div>
            <div style="text-align:center;background:var(--al);border-radius:12px;padding:8px 4px">
              <div style="font-size:16px;font-weight:600;color:var(--ad)">${active.length}</div>
              <div style="font-size:9.5px;font-weight:600;color:var(--ad);text-transform:uppercase;margin-top:2px">Active</div>
            </div>
            ${overdue?`<div style="text-align:center;background:var(--rb);border-radius:12px;padding:8px 4px">
              <div style="font-size:16px;font-weight:600;color:var(--r)">${overdue}</div>
              <div style="font-size:9.5px;font-weight:600;color:var(--r);text-transform:uppercase;margin-top:2px">Overdue</div>
            </div>`:''}
          </div>

          ${(relLibCount||relDocCount)?`<div style="display:flex;gap:6px;margin-bottom:${members.length?'12px':'0'}">
            ${relLibCount?`<span style="background:var(--pb);color:var(--p);font-size:10px;font-weight:700;padding:2px 9px;border-radius:100px">📖 ${relLibCount}</span>`:''}
            ${relDocCount?`<span style="background:var(--gb);color:var(--g);font-size:10px;font-weight:700;padding:2px 9px;border-radius:100px">📚 ${relDocCount}</span>`:''}
          </div>`:''}

          ${members.length?`<div style="display:flex;align-items:center;justify-content:space-between">
            <div style="display:flex;align-items:center">
              ${members.slice(0,5).map((m,i)=>`<span title="${m.name}" style="width:26px;height:26px;border-radius:50%;background:${m.color};display:inline-flex;align-items:center;justify-content:center;font-size:9.5px;font-weight:700;color:#fff;border:2px solid var(--s);margin-left:${i>0?'-8px':'0'};flex-shrink:0">${m.av}</span>`).join('')}
              ${members.length>5?`<span style="width:26px;height:26px;border-radius:50%;background:var(--s2);border:2px solid var(--s);display:inline-flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:var(--tx3);margin-left:-8px">+${members.length-5}</span>`:''}
            </div>
            <span style="font-size:10.5px;color:var(--tx3);font-weight:600">${members.length} member${members.length!==1?'s':''}</span>
          </div>`:''}
        </div>

        <div class="ac" onclick="event.stopPropagation()" style="display:flex;gap:4px;padding:10px 14px;border-top:1px solid var(--bd);background:var(--s2)">
          <div class="ib" style="color:var(--ac)" title="Add task to this project" onclick="event.stopPropagation();openTaskModal(null,'${pr.id}')">☑+</div>
          <div class="ib edt" onclick="event.stopPropagation();openProjectModal('${pr.id}')">✏</div>
          <div class="ib del" style="margin-left:auto" onclick="event.stopPropagation();delItem('projects','${pr.id}','${pr.name.replace(/'/g,"\\'")}')">🗑</div>
        </div>
      </div>`;
    });
    h+=`</div>`;
    el.innerHTML=h;
  }
  window._rPr=render;
  render();
}

// ── 3. DASHBOARD — corporate KPIs with week-over-week trend deltas ─────
function rDash(el){
  const todayStr=new Date().toISOString().split('T')[0];
  const now=new Date();
  const allTasks=DB.tasks;
  const activeTasks=allTasks.filter(t=>!['Done','Cancelled'].includes(t.status));
  const doneTasks=allTasks.filter(t=>t.status==='Done');
  const overdue=activeTasks.filter(t=>getDueStatus(t).key==='overdue');

  const d7=new Date(now); d7.setDate(now.getDate()-7);
  const d14=new Date(now); d14.setDate(now.getDate()-14);
  const inRange=(ts,from,to)=>{if(!ts)return false;const d=new Date(ts);return d>=from&&d<to;};

  // Current 7d window vs prior 7d window — used for every WoW delta below
  const createdThis7=allTasks.filter(t=>inRange(t.tsCreated,d7,now)).length;
  const createdPrev7=allTasks.filter(t=>inRange(t.tsCreated,d14,d7)).length;
  const doneThis7=doneTasks.filter(t=>inRange(t.tsReviewed,d7,now)).length;
  const donePrev7=doneTasks.filter(t=>inRange(t.tsReviewed,d14,d7)).length;
  const rejThis7=allTasks.filter(t=>(t.rejections||[]).some(r=>inRange(r.at,d7,now))).length;
  const rejPrev7=allTasks.filter(t=>(t.rejections||[]).some(r=>inRange(r.at,d14,d7))).length;
  const cycleThis7=doneTasks.filter(t=>t.cycleH&&inRange(t.tsReviewed,d7,now));
  const cyclePrev7=doneTasks.filter(t=>t.cycleH&&inRange(t.tsReviewed,d14,d7));
  const avgCycleThis7=cycleThis7.length?Math.round(cycleThis7.reduce((a,t)=>a+t.cycleH,0)/cycleThis7.length):0;
  const avgCyclePrev7=cyclePrev7.length?Math.round(cyclePrev7.reduce((a,t)=>a+t.cycleH,0)/cyclePrev7.length):0;
  const rateThis7=createdThis7?Math.round(doneThis7/createdThis7*100):(doneThis7?100:0);
  const ratePrev7=createdPrev7?Math.round(donePrev7/createdPrev7*100):(donePrev7?100:0);

  let h='';

  if(!isAdmin()){
    // ── MEMBER VIEW ────────────────────────────────────────────────
    const mine=activeTasks.filter(t=>t.assignedTo===CU.id||t.assignees?.includes(CU.id)||(t.assignedTo||'').toLowerCase()===CU.name.toLowerCase());
    const myDone=doneTasks.filter(t=>t.assignedTo===CU.id||t.assignees?.includes(CU.id));
    const myOverdue=mine.filter(t=>getDueStatus(t).key==='overdue');
    const myRev=allTasks.filter(t=>(t.reviewer===CU.id)&&t.status==='Pending Review');
    const myDoneThis7=myDone.filter(t=>inRange(t.tsReviewed,d7,now)).length;
    const myDonePrev7=myDone.filter(t=>inRange(t.tsReviewed,d14,d7)).length;
    const myRate=mine.length+myDone.length?Math.round(myDone.length/(mine.length+myDone.length)*100):0;
    const todayMeetings=DB.meetings.filter(m=>m.meeting_date===todayStr&&m.status==='Scheduled'&&(m.created_by===CU.name||m.invitees?.includes(CU.name)));

    h+=`<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:18px">
      <div class="stat" onclick="navTo('mytasks')"><div class="st-bar" style="background:var(--ac)"></div><div class="st-lbl">My Active Tasks</div><div class="st-val" style="color:var(--ac)">${mine.length}</div><div class="st-sub">${myDone.length} completed all-time</div></div>
      <div class="stat" onclick="navTo('mytasks')"><div class="st-bar" style="background:${myOverdue.length?'var(--r)':'var(--g)'}"></div><div class="st-lbl">Overdue</div><div class="st-val" style="color:${myOverdue.length?'var(--r)':'var(--g)'}">${myOverdue.length}</div><div class="st-sub">${myOverdue.length?'needs attention':'all on track ✓'}</div></div>
      <div class="stat" onclick="navTo('toreview')"><div class="st-bar" style="background:var(--p)"></div><div class="st-lbl">To Review</div><div class="st-val" style="color:var(--p)">${myRev.length}</div><div class="st-sub">${myRev.length?'awaiting your review':'nothing pending'}</div></div>
      <div class="stat"><div class="st-bar" style="background:var(--g)"></div><div class="st-lbl">Done This Week</div><div class="st-val" style="color:var(--g)">${myDoneThis7}</div><div style="margin-top:3px">${deltaChip(myDoneThis7,myDonePrev7,false)}</div></div>
    </div>`;

    if(todayMeetings.length){
      h+=`<div class="card" style="margin-bottom:16px"><div class="ct">📅 Today's Meetings</div>
        ${todayMeetings.map(m=>`<div onclick="openMeetingDetail('${m.id}')" style="display:flex;align-items:center;gap:12px;padding:9px 0;border-bottom:1px solid var(--bd);cursor:pointer">
          <span style="font-size:15px;font-weight:700;color:var(--ac);width:48px;flex-shrink:0">${m.meeting_time||'—'}</span>
          <div style="flex:1"><div style="font-size:13px;font-weight:600">${m.title}</div><div style="font-size:11px;color:var(--tx3)">${m.location||m.meeting_type||''} · ${m.duration_minutes||60}min</div></div>
          ${spill(m.status)}
        </div>`).join('')}
      </div>`;
    }

    h+=`<div class="card"><div class="ct">📋 My Active Tasks</div>`;
    if(mine.length){
      h+=mine.slice(0,8).map(t=>{const ds=getDueStatus(t);return`<div onclick="openTask('${t.id}')" style="display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--bd);cursor:pointer">
        ${spill(t.status)}
        <span style="flex:1;font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${t.title}</span>
        ${ppill(t.priority)}
        <span class="due-badge ${ds.cls}" style="flex-shrink:0">${ds.label}</span>
      </div>`;}).join('');
      if(mine.length>8) h+=`<div style="font-size:11px;color:var(--ac);margin-top:10px;cursor:pointer;font-weight:600" onclick="navTo('mytasks')">View all ${mine.length} tasks →</div>`;
    } else {
      h+=`<div style="text-align:center;padding:24px 0;font-size:12px;color:var(--tx3)">No active tasks — you're all clear! 🎉</div>`;
    }
    h+=`</div>`;
    el.innerHTML=h; return;
  }

  // ── ADMIN VIEW ───────────────────────────────────────────────────
  const taskCompletionRate=allTasks.length?Math.round(doneTasks.length/allTasks.length*100):0;
  const overdueRate=activeTasks.length?Math.round(overdue.length/activeTasks.length*100):0;

  // KPI ROW — corporate, each with a WoW delta chip
  h+=`<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:14px">
    <div onclick="navTo('alltasks')" style="background:var(--s);border:1px solid var(--bd);border-radius:16px;padding:18px;cursor:pointer">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <span style="font-size:11px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.05em">Created (7d)</span>
        ${deltaChip(createdThis7,createdPrev7,false)}
      </div>
      <div style="font-size:32px;font-weight:500;color:var(--tx);line-height:1">${createdThis7}</div>
      <div style="font-size:11px;color:var(--tx3);margin-top:4px">vs ${createdPrev7} prior week</div>
    </div>
    <div onclick="navTo('alltasks')" style="background:var(--s);border:1px solid var(--bd);border-radius:16px;padding:18px;cursor:pointer">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <span style="font-size:11px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.05em">Completed (7d)</span>
        ${deltaChip(doneThis7,donePrev7,false)}
      </div>
      <div style="font-size:32px;font-weight:500;color:var(--g);line-height:1">${doneThis7}</div>
      <div style="font-size:11px;color:var(--tx3);margin-top:4px">vs ${donePrev7} prior week</div>
    </div>
    <div style="background:var(--s);border:1px solid var(--bd);border-radius:16px;padding:18px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <span style="font-size:11px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.05em">Weekly Close Rate</span>
        ${deltaChip(rateThis7,ratePrev7,false)}
      </div>
      <div style="font-size:32px;font-weight:500;color:var(--ac);line-height:1">${rateThis7}%</div>
      <div style="font-size:11px;color:var(--tx3);margin-top:4px">vs ${ratePrev7}% prior week</div>
    </div>
    <div style="background:var(--s);border:1px solid var(--bd);border-radius:16px;padding:18px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <span style="font-size:11px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.05em">Avg Cycle Time</span>
        ${deltaChip(avgCycleThis7,avgCyclePrev7,true)}
      </div>
      <div style="font-size:32px;font-weight:500;color:var(--p);line-height:1">${avgCycleThis7||'—'}${avgCycleThis7?'h':''}</div>
      <div style="font-size:11px;color:var(--tx3);margin-top:4px">vs ${avgCyclePrev7||'—'}${avgCyclePrev7?'h':''} prior week</div>
    </div>
  </div>`;

  // OVERALL HEALTH row (snapshot, not WoW — current standing)
  h+=`<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px">
    <div onclick="navTo('alltasks')" style="background:linear-gradient(135deg,#1E3A8A,#3762E4);border-radius:16px;padding:18px;cursor:pointer;color:#fff">
      <div style="font-size:11px;font-weight:700;color:#C7D6FF;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px">Overall Completion</div>
      <div style="font-size:30px;font-weight:500;line-height:1;margin-bottom:5px">${taskCompletionRate}%</div>
      <div style="font-size:12px;color:#C7D6FF">${doneTasks.length} done of ${allTasks.length} total</div>
    </div>
    <div onclick="navTo('alltasks','Overdue')" style="background:${overdueRate>20?'linear-gradient(135deg,#7A1A15,#B3261E)':overdueRate>5?'linear-gradient(135deg,#6B3A00,#8A5300)':'linear-gradient(135deg,#0E4A22,#146C2E)'};border-radius:16px;padding:18px;cursor:pointer;color:#fff">
      <div style="font-size:11px;font-weight:700;color:rgba(255,255,255,.75);text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px">Overdue Rate</div>
      <div style="font-size:30px;font-weight:500;line-height:1;margin-bottom:5px">${overdueRate}%</div>
      <div style="font-size:12px;color:rgba(255,255,255,.85)">${overdue.length} tasks overdue · ${overdueRate<=5?'On Track':overdueRate<=20?'Watch':'Critical'}</div>
    </div>
    <div onclick="navTo('svctest')" style="background:linear-gradient(135deg,#3D2E6B,#6750A4);border-radius:16px;padding:18px;cursor:pointer;color:#fff">
      <div style="font-size:11px;font-weight:700;color:#DCCFFF;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px">Rejections (7d)</div>
      <div style="font-size:30px;font-weight:500;line-height:1;margin-bottom:5px">${rejThis7}</div>
      <div style="margin-top:2px">${deltaChip(rejThis7,rejPrev7,true)}</div>
    </div>
  </div>`;

  // Task status breakdown chips
  const newTasks=allTasks.filter(t=>t.status==='New');
  const inProg=allTasks.filter(t=>t.status==='In Progress');
  const pendingRev=allTasks.filter(t=>t.status==='Pending Review');
  const rejected=allTasks.filter(t=>t.status==='Rejected');
  h+=`<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:8px;margin-bottom:16px">
    ${[
      {l:'Total',v:allTasks.length,c:'#767B8D',click:"navTo('alltasks')"},
      {l:'New',v:newTasks.length,c:'#767B8D',click:"navTo('alltasks','New')"},
      {l:'In Progress',v:inProg.length,c:'#3762E4',click:"navTo('alltasks','In Progress')"},
      {l:'Review',v:pendingRev.length,c:'#6750A4',click:"navTo('toreview')"},
      {l:'Done',v:doneTasks.length,c:'#146C2E',click:"navTo('alltasks','Done')"},
      {l:'Rejected',v:rejected.length,c:'#B3261E',click:"navTo('alltasks','Rejected')"},
      {l:'Overdue',v:overdue.length,c:overdue.length?'#B3261E':'#146C2E',click:"navTo('alltasks','Overdue')"},
    ].map(({l,v,c,click})=>`<div onclick="${click}" style="background:var(--s);border:1px solid var(--bd);border-top:3px solid ${c};border-radius:12px;padding:12px 8px;cursor:pointer;text-align:center;transition:box-shadow .15s" onmouseenter="this.style.boxShadow='var(--shmd)'" onmouseleave="this.style.boxShadow=''">
      <div style="font-size:22px;font-weight:500;color:${c};line-height:1;margin-bottom:4px">${v}</div>
      <div style="font-size:10px;font-weight:600;color:var(--tx3)">${l}</div>
    </div>`).join('')}
  </div>`;

  // Team load
  const teamLoad=DB.team.map(m=>{
    const mt=activeTasks.filter(t=>t.assignedTo===m.id||t.assignees?.includes(m.id));
    const overdueL=mt.filter(t=>getDueStatus(t).key==='overdue').length;
    return{m,count:mt.length,overdueL};
  }).filter(x=>x.count>0).sort((a,b)=>b.count-a.count);
  const maxLoad=Math.max(...teamLoad.map(x=>x.count),1);

  h+=`<div style="display:grid;grid-template-columns:1.4fr 1fr;gap:14px;margin-bottom:16px">
    <div class="card">
      <div class="ct"><span>👥 Team Load</span><span style="font-size:11px;color:var(--tx3);font-weight:500">${activeTasks.length} active across ${teamLoad.length} member${teamLoad.length!==1?'s':''}</span></div>
      ${teamLoad.length?teamLoad.slice(0,8).map(({m,count,overdueL})=>{
        const pct=Math.round(count/maxLoad*100);
        const loadColor=count>=6?'var(--r)':count>=4?'var(--o)':count>=2?'var(--y)':'var(--g)';
        return`<div onclick="openMemberDetail('${m.id}')" style="display:flex;align-items:center;gap:11px;padding:9px 0;border-bottom:1px solid var(--bd);cursor:pointer">
          <span style="width:32px;height:32px;border-radius:50%;background:${m.color};display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff;flex-shrink:0">${m.av}</span>
          <div style="flex:1;min-width:0">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:5px">
              <span style="font-size:13px;font-weight:600">${m.name}</span>
              <span style="display:flex;align-items:center;gap:6px">${overdueL?`<span style="background:var(--rb);color:var(--r);font-size:9px;font-weight:700;padding:1px 7px;border-radius:100px">⚠ ${overdueL}</span>`:''}<span style="font-size:11px;font-weight:700;color:${loadColor}">${count} tasks</span></span>
            </div>
            <div style="height:6px;background:var(--s2);border-radius:100px;overflow:hidden"><div style="height:100%;width:${pct}%;background:${loadColor};border-radius:100px"></div></div>
          </div>
        </div>`;
      }).join(''):`<div style="text-align:center;padding:20px 0;font-size:12px;color:var(--tx3)">No active assignments</div>`}
    </div>

    <div class="card">
      <div class="ct">🎯 Priority Mix</div>
      ${['Critical','High','Medium','Low'].map(p=>{
        const c={Critical:'#B3261E',High:'#8A4A16',Medium:'#8A5300',Low:'#146C2E'}[p];
        const v=activeTasks.filter(t=>t.priority===p).length;
        const pct=activeTasks.length?Math.round(v/activeTasks.length*100):0;
        return`<div onclick="navTo('alltasks')" style="cursor:pointer;margin-bottom:11px">
          <div style="display:flex;justify-content:space-between;margin-bottom:4px">
            <span style="font-size:11.5px;font-weight:700;color:${c}">${p}</span>
            <span style="font-size:13px;font-weight:700;color:${c}">${v}</span>
          </div>
          <div style="height:7px;background:${c}18;border-radius:100px;overflow:hidden"><div style="height:100%;width:${pct}%;background:${c};border-radius:100px"></div></div>
        </div>`;
      }).join('')}
    </div>
  </div>`;

  // Team performance table
  const teamPerf=DB.team.map(m=>{
    const mt=allTasks.filter(t=>t.assignedTo===m.id||t.assignees?.includes(m.id));
    const active=mt.filter(t=>!['Done','Cancelled'].includes(t.status)).length;
    const doneM=mt.filter(t=>t.status==='Done').length;
    const od=mt.filter(t=>getDueStatus(t).key==='overdue').length;
    const recentD=mt.filter(t=>t.tsReviewed&&inRange(t.tsReviewed,d7,now)&&t.status==='Done').length;
    const rate=mt.length?Math.round(doneM/mt.length*100):0;
    return{m,active,doneM,od,recentD,rate,tot:mt.length};
  }).filter(x=>x.tot>0).sort((a,b)=>b.active-a.active);

  h+=`<div class="card">
    <div class="ct"><span>Team Performance</span><span onclick="navTo('team')" style="font-size:12px;color:var(--ac);cursor:pointer;font-weight:600">View team →</span></div>
    <div class="tw"><table>
      <thead><tr><th>Member</th><th>Role</th><th>Active</th><th>Done (7d)</th><th>Overdue</th><th>Rate</th></tr></thead>
      <tbody>
        ${teamPerf.map(({m,active,doneM,od,recentD,rate})=>`<tr class="cl" onclick="openMemberDetail('${m.id}')">
          <td><span style="display:flex;align-items:center;gap:8px">
            <span style="width:28px;height:28px;border-radius:50%;background:${m.color};display:inline-flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#fff;flex-shrink:0">${m.av}</span>
            <span style="font-size:13px;font-weight:600">${m.name}</span>
          </span></td>
          <td style="font-size:12px;color:var(--tx3)">${m.role}</td>
          <td><span style="font-size:15px;font-weight:600;color:${active>=5?'var(--r)':active>=2?'var(--y)':'var(--tx)'}">${active}</span></td>
          <td style="font-size:14px;font-weight:600;color:var(--g)">${recentD}</td>
          <td style="${od>0?'color:var(--r);font-weight:700':'color:var(--tx3)'}">${od>0?'⚠ '+od:'—'}</td>
          <td><div style="display:flex;align-items:center;gap:7px">
            <div style="width:56px;height:6px;background:var(--s2);border-radius:100px;overflow:hidden"><div style="height:100%;width:${rate}%;background:${rate>=70?'var(--g)':rate>=40?'var(--y)':'var(--r)'};border-radius:100px"></div></div>
            <span style="font-size:12px;font-weight:700;color:${rate>=70?'var(--g)':rate>=40?'var(--y)':'var(--r)'}">${rate}%</span>
          </div></td>
        </tr>`).join('')}
      </tbody>
    </table></div>
  </div>`;

  el.innerHTML=h;
}
