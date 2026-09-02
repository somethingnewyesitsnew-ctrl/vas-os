// §11 ── TASKS ───────────────────────────────────────────────────────────
function rMyTasks(el){
  const myName=(CU?.name||'').toLowerCase();
  const myId=CU?.id||'';
  let tab=0;
  function render(t){
    tab=t;
    // Tab 0: assigned to me (includes Help Request tasks so helper can work them)
    const toMe=DB.tasks.filter(tk=>
      tk.assignedTo===myId||(tk.assignees||[]).includes(myId)||(myId===''&&(tk.assignedTo||'').toLowerCase()===myName)
    );
    // Tab 1: created/requested by me (assigned to others)
    const byMe=DB.tasks.filter(tk=>
      ((tk.createdBy||'').toLowerCase()===myName||(tk.reqBy||'').toLowerCase()===myName)
      &&tk.assignedTo!==myId&&!(tk.assignees||[]).includes(myId)
    );
    const list=t===0?toMe:byMe;
    const cnt=[toMe.length,byMe.length];
    const c0='#2563eb',c1='#7c3aed';
    const c=t===0?c0:c1;
    let h=`<div class="tabs" style="margin-bottom:10px">
      ${[['Assigned to Me',c0],['Assigned by Me',c1]].map(([lb,col],i)=>{
        const active=i===tab;
        return`<div class="tab ${active?'on':''}" style="font-size:13px;font-weight:700;${active?`color:${col};border-bottom:3px solid ${col}`:'color:var(--tx2)'}">
          ${lb} <span style="display:inline-flex;align-items:center;justify-content:center;min-width:20px;height:20px;padding:0 5px;background:${active?col:cnt[i]>0?col+'18':'var(--s2)'};color:${active?'#fff':cnt[i]>0?col:'var(--tx3)'};border-radius:20px;font-size:11px;font-weight:800;margin-left:4px">${cnt[i]}</span>
        </div>`;
      }).join('')}
    </div>`;
    el.innerHTML=h;
    el.querySelectorAll('.tab').forEach((tb,i)=>tb.onclick=()=>render(i));
    // Render the task table into the same element appended below tabs
    const tableEl=document.createElement('div');
    el.appendChild(tableEl);
    renderTasks(tableEl,list,t===1);
  }
  render(0);
}
function rAllTasks(el){
  if(!isAdmin()){
    const myId=CU?.id||'', myName=(CU?.name||'').toLowerCase();
    const mine=DB.tasks.filter(t=>{
      if(t.assignedTo===myId||(t.assignees||[]).includes(myId)) return true;
      if(myName&&((t.assignedTo||'').toLowerCase()===myName||(t.assignees||[]).some(a=>(a||'').toLowerCase()===myName))) return true;
      if(t.reviewer===myId||myName&&(t.reviewer||'').toLowerCase()===myName) return true;
      if((t.createdBy||'').toLowerCase()===myName) return true;
      return false;
    });
    renderTasks(el,mine,false);
  } else {
    renderTasks(el,DB.tasks,true);
  }
}

function renderTasks(el,tasks,showMember){
  const TABS=['All','New','In Progress','Pending Help','Pending Review','Done','Rejected','On Hold'];
  const DUE_OPTS=[
    {v:'',label:'All due statuses'},
    {v:'overdue',label:'🔴 Overdue'},
    {v:'today',label:'🟡 Due today'},
    {v:'soon',label:'🟠 Due in ≤2 days'},
    {v:'ok',label:'🟢 On track'},
    {v:'done-early',label:'✅ Completed early'},
    {v:'done-ontime',label:'✅ Completed on time'},
    {v:'done-late',label:'⚠️ Completed late'},
    {v:'none',label:'— No due date'},
  ];
  let initTab=window._navF||'All';
  let initDue=window._navDue||'';
  let initMember=window._navMember||'';
  let initDay=window._navDay||'';
  let initProj=window._navProject||'';
  if(initTab==='Overdue'){initDue='overdue';initTab='All';}
  window._navF=null; window._navDue=null; window._navMember=null; window._navDay=null; window._navProject=null;

  const TAB_COLORS={All:'#64748b',New:'#94a3b8','In Progress':'#2563eb','Pending Help':'#ea580c','Pending Review':'#7c3aed',Done:'#15803d',Rejected:'#dc2626','On Hold':'#ca8a04'};

  function render(t){
    el.dataset.tab=t;
    let f=t==='All'?[...tasks]:[...tasks.filter(tk=>tk.status===t)];
    const sq=document.getElementById('t-s')?.value?.toLowerCase()||'';
    const fp=document.getElementById('t-fp')?.value||'';
    const fa=document.getElementById('t-fa')?.value||initMember;
    const fsvc=document.getElementById('t-fsvc')?.value||'';
    const fop=document.getElementById('t-fop')?.value||'';
    const fdue=document.getElementById('t-fdue')?.value||'';
    const fday=document.getElementById('t-fday')?.value||initDay;
    const fproj=document.getElementById('t-fproj')?.value||initProj;
    const fco=document.getElementById('t-fco')?.value||'';
    if(sq)f=f.filter(tk=>tk.title.toLowerCase().includes(sq)||(tk.desc||'').toLowerCase().includes(sq));
    if(fp)f=f.filter(tk=>tk.priority===fp);
    if(fa)f=f.filter(tk=>tk.assignedTo===fa||tk.reviewer===fa||(tk.assignees||[]).includes(fa));
    if(fsvc)f=f.filter(tk=>tk.service===fsvc);
    if(fop)f=f.filter(tk=>tk.operator===fop);
    if(fproj)f=f.filter(tk=>tk.projectId===fproj);
    if(fco)f=f.filter(tk=>tk.company2===fco||tk.operator===fco);
    if(fdue)f=f.filter(tk=>getDueStatus(tk).key===fdue);
    if(fday){
      const now2=new Date();
      if(fday==='today'){const ds=localDateStr(now2);f=f.filter(tk=>tk.due===ds||(tk.tsCreated?localDateStr(new Date(tk.tsCreated)):undefined)===ds||(tk.tsReviewed?localDateStr(new Date(tk.tsReviewed)):undefined)===ds);}
      else if(fday==='week'){const d=new Date(now2);d.setDate(d.getDate()-7);f=f.filter(tk=>new Date(tk.tsCreated||0)>=d||new Date(tk.due||0)>=d||new Date(tk.tsReviewed||0)>=d);}
      else if(fday==='month'){const d=new Date(now2);d.setDate(d.getDate()-30);f=f.filter(tk=>new Date(tk.tsCreated||0)>=d||new Date(tk.due||0)>=d||new Date(tk.tsReviewed||0)>=d);}
    }
    const cnt={};TABS.forEach(s=>cnt[s]=s==='All'?tasks.length:tasks.filter(tk=>tk.status===s).length);
    const urgCnt=tasks.filter(tk=>['overdue','today','soon'].includes(getDueStatus(tk).key)).length;

    let h=`<div class="tabs" style="gap:4px;margin-bottom:10px">`+TABS.map(s=>{
      const c=TAB_COLORS[s]||'#64748b';
      const active=s===t;
      const n=cnt[s];
      return`<div class="tab ${active?'on':''}" style="font-size:13px;font-weight:700;${active?`color:${c};border-bottom:3px solid ${c}`:'color:var(--tx2)'}">
        ${s}
        <span style="display:inline-flex;align-items:center;justify-content:center;min-width:20px;height:20px;padding:0 5px;background:${active?c:n>0?c+'18':'var(--s2)'};color:${active?'#fff':n>0?c:'var(--tx3)'};border-radius:20px;font-size:11px;font-weight:800;margin-left:4px;border:${!active&&n>0?`1px solid ${c}40`:''}">${n}</span>
      </div>`;
    }).join('')+`</div>
    <div class="fb" style="flex-wrap:wrap">
      <input class="si" id="t-s" placeholder="Search tasks…" oninput="rr()" value="${sq}" style="min-width:160px">
      <select class="fs" id="t-fp" onchange="rr()"><option value="">All priorities</option>${['Critical','High','Medium','Low'].map(p=>`<option ${fp===p?'selected':''} value="${p}">${p}</option>`).join('')}</select>
      <select class="fs" id="t-fday" onchange="rr()" style="${fday?'border-color:var(--ac);color:var(--ac)':''}"><option value="">All dates</option><option value="today" ${fday==='today'?'selected':''}>📅 Today</option><option value="week" ${fday==='week'?'selected':''}>📅 Last 7 days</option><option value="month" ${fday==='month'?'selected':''}>📅 Last 30 days</option></select>
      <select class="fs" id="t-fdue" onchange="rr()" style="${fdue?'border-color:var(--ac);color:var(--ac)':''}">${DUE_OPTS.map(o=>`<option value="${o.v}" ${fdue===o.v?'selected':''}>${o.label}</option>`).join('')}</select>
      ${showMember?`<select class="fs" id="t-fa" onchange="rr()"><option value="">All members</option>${DB.team.map(m=>`<option ${fa===m.id?'selected':''} value="${m.id}">${esc(m.name)}</option>`).join('')}</select>`:''}
      <select class="fs" id="t-fproj" onchange="rr()"><option value="">All projects</option>${DB.projects.map(p=>`<option value="${p.id}" ${fproj===p.id?'selected':''}>${esc(p.name)}</option>`).join('')}</select>
      <select class="fs" id="t-fco" onchange="rr()"><option value="">All companies</option>${[...DB.companies,...DB.operators].map(c=>`<option value="${c.id}" ${fco===c.id?'selected':''}>${esc(c.name)}</option>`).join('')}</select>
      <select class="fs" id="t-fsvc" onchange="rr()"><option value="">All services</option>${DB.services.map(s=>`<option ${fsvc===s.id?'selected':''} value="${s.id}">${esc(s.name)}</option>`).join('')}</select>
      <select class="fs" id="t-fop" onchange="rr()"><option value="">All operators</option>${[...DB.operators,...DB.companies].map(o=>`<option ${fop===o.id?'selected':''} value="${o.id}">${esc(o.name)}</option>`).join('')}</select>
    </div>
    ${urgCnt&&!fdue?`<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px">
      ${tasks.filter(tk=>getDueStatus(tk).key==='overdue').length?`<span class="due-badge ds-overdue" onclick="setDueFilter('overdue')" style="cursor:pointer">${tasks.filter(tk=>getDueStatus(tk).key==='overdue').length} overdue</span>`:''}
      ${tasks.filter(tk=>getDueStatus(tk).key==='today').length?`<span class="due-badge ds-today" onclick="setDueFilter('today')" style="cursor:pointer">${tasks.filter(tk=>getDueStatus(tk).key==='today').length} due today</span>`:''}
      ${tasks.filter(tk=>getDueStatus(tk).key==='soon').length?`<span class="due-badge ds-soon" onclick="setDueFilter('soon')" style="cursor:pointer">${tasks.filter(tk=>getDueStatus(tk).key==='soon').length} due soon</span>`:''}
    </div>`:''}`;

    if(!f.length)h+=`<div class="empty"><div class="ei">📋</div><div class="et">No tasks match</div><div class="es">Try adjusting filters</div></div>`;
    else{
      const isMob=window.innerWidth<=768;
      // Admin bulk delete toolbar
      const bulkToolbar=isAdmin()?`<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;padding:8px 10px;background:var(--s2);border:1px solid var(--bd);border-radius:9px">
        <input type="checkbox" id="bulk-all" onchange="document.querySelectorAll('.bulk-chk').forEach(c=>c.checked=this.checked)" style="width:15px;height:15px;cursor:pointer">
        <span style="font-size:12px;font-weight:600;color:var(--tx3)">Select all</span>
        <button class="btn bd2 bsm" onclick="(async()=>{const ids=[...document.querySelectorAll('.bulk-chk:checked')].map(c=>c.value);if(!ids.length){toast('Select tasks first','bad');return;}if(!confirm('Delete '+ids.length+' task(s)?'))return;for(const id of ids){DB.tasks=DB.tasks.filter(t=>t.id!==id);await sbDelete('tasks',id);}toast(ids.length+' task(s) deleted','ok');rr();updateBadges();})()" style="margin-left:auto">🗑 Delete Selected</button>
      </div>`:'';
      h+=bulkToolbar;
      h+=`<div class="tw"><table><thead><tr>${isAdmin()?'<th></th>':''}<th>#</th><th>Task</th><th>Status</th><th>Priority</th>${showMember&&!isMob?'<th>Assigned</th>':''}<th>Project</th><th>Requested By</th><th>Operator</th><th>Est h</th><th>Service</th><th>Due Status</th><th>Due Date</th>${isAdmin()?'<th>Work h</th><th>Cycle h</th>':''}<th></th></tr></thead><tbody>`;
      h+=f.map((tk,i)=>{
        const ds=getDueStatus(tk);
        const op=[...DB.operators,...DB.companies].find(o=>o.id===tk.operator);
        const isDone=tk.status==='Done';
        const isRej=tk.status==='Rejected';
        const rowStyle=isDone?'background:#f0fdf4':isRej?'background:#fef2f2':'';
        const titleStyle=isDone?'color:#15803d;font-weight:700':isRej?'color:#dc2626;font-weight:700':'color:var(--tx);font-weight:700';
        const assigneeHtml=(()=>{
          const ids=tk.assignees?.length?tk.assignees:[tk.assignedTo].filter(Boolean);
          const mbrs=ids.map(id=>DB.team.find(x=>x.id===id)).filter(Boolean);
          return mbrs.length?mbrs.slice(0,3).map(mb=>`<span style="display:inline-flex;align-items:center;gap:4px;margin-right:4px;white-space:nowrap"><span style="width:20px;height:20px;border-radius:50%;background:${mb.color};display:inline-flex;align-items:center;justify-content:center;font-size:8px;color:#fff;font-weight:800;flex-shrink:0">${mb.av}</span><span style="font-size:12px;font-weight:600;color:var(--tx)">${esc(mb.name)}</span></span>`).join(''):'<span style="color:var(--tx3);font-size:12px">—</span>';
        })();
        return`<tr class="cl" style="${rowStyle}" onclick="openTask('${tk.id}')">
          ${isAdmin()?`<td onclick="event.stopPropagation()"><input type="checkbox" class="bulk-chk" value="${tk.id}" style="width:14px;height:14px;cursor:pointer"></td>`:''}
          <td style="font-family:var(--fnm);font-size:12px;color:var(--tx3);font-weight:700">#${i+1}</td>
          <td style="max-width:200px">
            <div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:13px;${titleStyle}">${escapeHtml(tk.title)}</div>
            ${isMob&&assigneeHtml!=='<span style="color:var(--tx3);font-size:12px">—</span>'?`<div style="display:flex;align-items:center;gap:3px;margin-top:3px">${(()=>{const ids=tk.assignees?.length?tk.assignees:[tk.assignedTo].filter(Boolean);return ids.map(id=>DB.team.find(x=>x.id===id)).filter(Boolean).slice(0,2).map(mb=>`<span style="display:inline-flex;align-items:center;gap:3px"><span style="width:15px;height:15px;border-radius:50%;background:${mb.color};display:inline-flex;align-items:center;justify-content:center;font-size:6px;color:#fff;font-weight:800">${mb.av}</span><span style="font-size:10px;font-weight:600;color:var(--tx3)">${mb.name.split(' ')[0]}</span></span>`).join('<span style="color:var(--bd);font-size:9px;margin:0 1px">·</span>');})()}</div>`:``}
          </td>
          <td>${spill(tk.status)}</td><td>${ppill(tk.priority)}</td>
          ${showMember&&!isMob?`<td>${assigneeHtml}</td>`:''}
          <td style="font-size:12px;color:var(--tx2);font-weight:500">${(()=>{const pr=DB.projects.find(p=>p.id===tk.projectId);return pr?`<span style="background:var(--al);color:var(--ac);border:1px solid #bfdbfe;font-size:10px;font-weight:700;padding:2px 7px;border-radius:20px">${esc(pr.name)}</span>`:'—';})()}</td>
          <td style="font-size:12px;color:var(--tx2);font-weight:500">${tk.reqBy||'—'}</td>
          <td style="font-size:12px;color:var(--tx2);font-weight:500">${op?.name||'—'}</td>
          <td style="font-family:var(--fnm);font-size:12px;color:var(--tx2);font-weight:600">${tk.est!=null?tk.est+'h':'—'}</td>
          <td style="font-size:12px;color:var(--tx2);font-weight:500">${sn(tk.service)}</td>
          <td><span class="due-badge ${ds.cls}">${ds.label}</span></td>
          <td style="font-size:12px;font-family:var(--fnm);font-weight:600;color:${isDone?'#15803d':'var(--tx2)'}">${tk.due?tk.due:'—'}</td>
          ${isAdmin()?`<td style="font-family:var(--fnm);font-size:12px;color:var(--tx2);font-weight:600">${tk.workH!=null?tk.workH+'h':'—'}</td>
          <td style="font-family:var(--fnm);font-size:12px;color:var(--tx2);font-weight:600">${tk.cycleH!=null?tk.cycleH+'h':'—'}</td>`:''}
          <td onclick="event.stopPropagation()"><div class="act-c">
            <div class="ib edt" onclick="openTaskModal('${tk.id}')" title="Edit">✏</div>
            <div class="ib" onclick="duplicateTask('${tk.id}')" title="Duplicate — same assignee/service/operator/reviewer, new name">⎘</div>
            <div class="ib del" onclick="delItem('tasks','${tk.id}')">🗑</div>
          </div></td>
        </tr>`;
      }).join('')+`</tbody></table></div>`;
    }
    el.innerHTML=h;
    el.querySelectorAll('.tab').forEach((tb,i)=>tb.onclick=()=>render(TABS[i]));
    const dueEl=document.getElementById('t-fdue');
    if(dueEl&&fdue)dueEl.value=fdue;
    window.rr=()=>render(t);
    window.setDueFilter=(v)=>{const el2=document.getElementById('t-fdue');if(el2){el2.value=v;el2.style.borderColor='var(--ac)';el2.style.color='var(--ac)';}window.rr();};
  }
  render(initTab);
  if(initDue){
    setTimeout(()=>{
      const el2=document.getElementById('t-fdue');
      if(el2){el2.value=initDue;el2.style.borderColor='var(--ac)';el2.style.color='var(--ac)';}
      window.rr&&window.rr();
    },0);
  }
  if(initMember){
    setTimeout(()=>{
      const el2=document.getElementById('t-fa');
      if(el2){el2.value=initMember;}
      window.rr&&window.rr();
    },0);
  }
  if(initProj){
    setTimeout(()=>{
      const el2=document.getElementById('t-fproj');
      if(el2){el2.value=initProj;el2.style.borderColor='var(--ac)';el2.style.color='var(--ac)';}
      window.rr&&window.rr();
    },0);
  }
}

// ══════════════════════════════════════════════════════
// TODOS
// ══════════════════════════════════════════════════════
