// §26 ── TASK PANEL ──────────────────────────────────────────────────────

// Sums up every "paused" interval on a task (time spent waiting on a Help
// Request, or manually parked On Hold) so that work-hour calculations only
// count time actually worked, not idle waiting time. Derived entirely from
// the task's own timeline — no schema changes required.
function getTaskPausedHours(t){
  const tl=t.timeline||[];
  let total=0;
  tl.filter(e=>e.type==='help_requested').forEach(o=>{
    const closeEv=tl.find(e=>e.type==='help_received'&&e.helpTaskId===o.helpTaskId);
    if(closeEv){ const h=hb(o.at,closeEv.at); if(h) total+=h; }
  });
  tl.filter(e=>e.type==='on_hold_start').forEach(o=>{
    const closeEv=tl.find(e=>e.type==='on_hold_end'&&e.at>o.at);
    if(closeEv){ const h=hb(o.at,closeEv.at); if(h) total+=h; }
  });
  return Math.round(total*100)/100;
}
// ── @Mention autocomplete for task comments ──────────────────────────
// The plain <textarea id="task-comment-ta"> needs cursor-position-aware
// "@partial" detection — the existing tag pickers (tf-assign-search,
// mf-inv-search) are separate dedicated <input> fields with their own
// wrapper markup and don't apply to free-form textarea text, so this is
// new logic (it borrows the general filter/dropdown-render style from
// those, but the detection itself has to work off selectionStart).
function getMentionQuery(textarea){
  const val=textarea.value;
  const pos=textarea.selectionStart;
  const upToCursor=val.slice(0,pos);
  const m=upToCursor.match(/(?:^|\s)@([a-zA-Z][\w' -]*)$/);
  if(!m)return null;
  return{query:m[1],start:pos-m[1].length-1}; // start includes the leading @
}

function filterMentionDrop(ev){
  const ta=ev.target;
  const drop=document.getElementById('task-comment-mention-drop');
  if(!drop)return;
  const hit=getMentionQuery(ta);
  if(!hit){drop.style.display='none';return;}
  const q=hit.query.toLowerCase();
  const matches=DB.team.filter(m=>m.name.toLowerCase().includes(q));
  if(!matches.length){drop.style.display='none';return;}
  drop.style.display='block';
  drop.innerHTML=matches.slice(0,8).map(m=>
    `<div onmousedown="event.preventDefault();insertMention('${m.name.replace(/'/g,"\\'")}',${hit.start})" style="display:flex;align-items:center;gap:8px;padding:7px 11px;cursor:pointer;font-size:12px" onmouseenter="this.style.background='var(--al)'" onmouseleave="this.style.background=''">
      <span style="width:20px;height:20px;border-radius:50%;background:${m.color};display:inline-flex;align-items:center;justify-content:center;font-size:8px;font-weight:700;color:#fff;flex-shrink:0">${m.av}</span>
      <span style="font-weight:600">${esc(m.name)}</span>
    </div>`
  ).join('');
}

function insertMention(name,atIndex){
  const ta=document.getElementById('task-comment-ta');
  if(!ta)return;
  const val=ta.value;
  const cursor=ta.selectionStart;
  const before=val.slice(0,atIndex);
  const after=val.slice(cursor);
  const insertedText='@'+name+' ';
  ta.value=before+insertedText+after;
  const newPos=(before+insertedText).length;
  hideMentionDrop();
  ta.focus();
  ta.setSelectionRange(newPos,newPos);
}

function hideMentionDrop(){
  const drop=document.getElementById('task-comment-mention-drop');
  if(drop)drop.style.display='none';
}

function mentionKeydown(ev){
  if(ev.key==='Escape')hideMentionDrop();
}

window.openTask=(id)=>{
  const t=DB.tasks.find(tk=>tk.id===id);if(!t)return;
  const ass=DB.team.find(m=>m.id===t.assignedTo),rev=DB.team.find(m=>m.id===t.reviewer);
  const svc=DB.services.find(s=>s.id===t.service),op=[...DB.operators,...DB.companies].find(o=>o.id===t.operator);
  const isMine=t.assignedTo===CU.id||(t.assignees||[]).includes(CU.id)||(CU.id===''&&(t.assignedTo||'').toLowerCase()===(CU.name||'').toLowerCase());
  const isRevMine=t.reviewer===CU.id||(CU.id===''&&(t.reviewer||'').toLowerCase()===(CU.name||'').toLowerCase());
  const canEdit=isAdmin()||isMine||isRevMine;
  const od=t.due&&new Date(t.due)<new Date()&&!['Done','Cancelled'].includes(t.status);

  // Short clean deep link — no base64 bloat
  const taskLink=window.location.href.split('#')[0]+'#task-'+t.id;
  window._share={
    link:taskLink,
    title:t.title, status:t.status, priority:t.priority,
    type:t.type, due:t.due?fd(t.due):null,
    assignee:ass?.name||null, service:svc?.name||null,
    desc:t.desc||null
  };

  // Auto-open timestamp — records when member first views the task
  if(isMine&&!t.tsOpened){
    t.tsOpened=now();
    t.respH=hb(t.tsCreated,t.tsOpened);
    logAction('Task Opened',`${esc(CU.name)} opened task "${esc(t.title)}"`,'Info',t.title,'First view — timestamp recorded');
    nUpdateTask(t);
    toast('Task opened — timestamp recorded ⏱','inf');
  }

  document.getElementById('sp-ttl').textContent=t.title;
  document.getElementById('sp-pills').innerHTML=`${spill(t.status)} ${ppill(t.priority)} <span style="background:var(--s2);border:1px solid var(--bd);color:var(--tx2);font-size:10px;font-weight:600;padding:2px 7px;border-radius:5px">${t.type}</span>`;

  const rh=hb(t.tsCreated,t.tsOpened),wh=hb(t.tsStarted,t.tsSubmitted),rvh=hb(t.tsSubmitted,t.tsReviewed),ch=hb(t.tsCreated,t.tsArchived);

  // Share bar — copy only, no WA/email
  let body=`<div style="display:flex;align-items:center;gap:8px;padding:10px 12px;background:var(--s2);border:1px solid var(--bd);border-radius:10px;margin-bottom:14px">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--tx3)" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
    <span style="flex:1;font-size:10px;color:var(--tx3);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${taskLink}</span>
    <button onclick="shareTaskCopy()" style="padding:5px 14px;background:var(--ac);border:none;border-radius:6px;color:#fff;font-size:11px;font-weight:700;cursor:pointer;flex-shrink:0">📋 Copy Link</button>
  </div>`;

  body+=`<div class="sp2">
    <div class="spf"><div class="spl">Assigned To</div><div class="spv" ${ass?`style="cursor:pointer;color:var(--ac)" onclick="openMemberDetail('${t.assignedTo}')"`:''}>${ass?`<span style="display:flex;align-items:center;gap:5px"><span style="width:18px;height:18px;border-radius:50%;background:${ass.color};display:inline-flex;align-items:center;justify-content:center;font-size:7px;color:#fff">${ass.av}</span>${esc(ass.name)}</span>`:'—'}</div></div>
    <div class="spf"><div class="spl">Reviewer</div><div class="spv">${rev?rev.name:'—'}</div></div>
    <div class="spf"><div class="spl">Service</div><div class="spv" ${svc?`style="cursor:pointer;color:var(--ac)" onclick="openSvcDetail('${t.service}')"`:''}>${svc?svc.name:'—'}</div></div>
    <div class="spf"><div class="spl">Operator</div><div class="spv">${op?op.name:'—'}</div></div>
    <div class="spf"><div class="spl">Due Date</div><div class="spv" style="color:${od?'var(--r)':'var(--tx)'}${od?';font-weight:700':''}">${fd(t.due)}${od?' ⚠️':''}</div></div>
    <div class="spf"><div class="spl">Requested By</div><div class="spv">${t.reqBy||'—'}</div></div>
    ${t.est!=null?`<div class="spf"><div class="spl">Estimated</div><div class="spv">${t.est}h</div></div>`:''}
    ${t.actual!=null?`<div class="spf"><div class="spl">Actual</div><div class="spv" style="color:${t.est?Math.abs(t.actual-t.est)/t.est<=.2?'var(--g)':Math.abs(t.actual-t.est)/t.est<=.5?'var(--y)':'var(--r)':'var(--tx)'}">${t.actual}h${t.est?' ('+(Math.round((t.actual-t.est)/t.est*100)>0?'+':'')+Math.round((t.actual-t.est)/t.est*100)+'%)':''}</div></div>`:''}
  </div>`;

  if(t.desc)body+=`<div class="spf"><div class="spl">Description</div><div class="spnote">${escapeHtml(t.desc)}</div></div>`;
  if(t.what)body+=`<div class="spf"><div class="spl">What Was Done</div><div class="spnote">${escapeHtml(t.what)}</div></div>`;
  if(t.tech)body+=`<div class="spf"><div class="spl">Technical Notes</div><div class="spnote">${escapeHtml(t.tech)}</div></div>`;
  if(t.rejReason)body+=`<div class="spf"><div class="spl" style="color:var(--r)">Rejection Reason</div><div class="spnote" style="border-color:var(--rbr);background:var(--rb)">${escapeHtml(t.rejReason)}</div></div>`;
  if(t.rejections?.length>1){body+=`<div class="sps">Rejection History (${t.rejections.length})</div>`;t.rejections.forEach(r=>{const rb=DB.team.find(m=>m.id===r.by);body+=`<div style="background:var(--rb);border:1px solid var(--rbr);border-radius:8px;padding:8px;margin-bottom:5px;font-size:11px"><div style="color:var(--r);font-weight:600;margin-bottom:2px">${rb?rb.name:'Reviewer'} · ${fdt(r.at)}</div><div style="color:var(--tx2)">${r.reason}</div></div>`;});}

  // Re-estimate history
  if(t.reEstimates?.length){
    body+=`<div class="sps">⏱ Re-Estimate History</div>`;
    t.reEstimates.forEach(re=>{
      body+=`<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:9px 12px;margin-bottom:6px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:3px">
          <span style="font-size:11px;font-weight:700;color:#b45309">${re.oldEst}h → ${re.newEst}h</span>
          <span style="font-size:10px;color:var(--tx3)">${fdt(re.at)}</span>
        </div>
        <div style="font-size:12px;color:var(--tx2)">${re.reason}</div>
      </div>`;
    });
  }

  // Linked help requests
  const helpTasks=DB.tasks.filter(h=>h.parentTaskId===t.id&&h.type==='Help Request');
  if(helpTasks.length){
    body+=`<div class="sps">🤝 Help Requests (${helpTasks.length})</div>`;
    helpTasks.forEach(h=>{
      const helper=DB.team.find(m=>m.id===h.assignedTo);
      const hds=getDueStatus(h);
      body+=`<div onclick="openTask('${h.id}')" style="display:flex;align-items:center;gap:9px;padding:9px 11px;background:var(--s2);border:1px solid var(--bd);border-radius:8px;cursor:pointer;margin-bottom:6px">
        ${spill(h.status)}
        <div style="flex:1;min-width:0">
          <div style="font-size:12px;font-weight:700">${esc(h.title)}</div>
          <div style="font-size:10px;color:var(--tx3)">${helper?helper.name:'?'} · ${fdt(h.tsCreated)}</div>
        </div>
        <span class="due-badge ${hds.cls}">${hds.label}</span>
      </div>`;
    });
  }

  // Full cycle timeline with accurate timestamps and durations
  const steps=[
    {key:'tsCreated',lbl:'Task Created',sub:`By ${t.reqBy||'Manager'}`,st:'tdone'},
    {key:'tsOpened',lbl:'Opened by Assignee',sub:ass?ass.name:'—',st:t.tsOpened?'tdone':isMine?'tact':'tpend',dur:rh,durT:rh!==null?`Took ${dur(rh)} to open`:null,dc:rh!==null?(rh<=1?'#16a34a':rh<=8?'#ca8a04':'#dc2626'):null},
    {key:'tsStarted',lbl:'Work Started',sub:'Estimate set',st:t.tsStarted?'tdone':t.status==='In Progress'?'tact':'tpend'},
    {key:'tsSubmitted',lbl:'Submitted for Review',sub:rev?'Reviewer: '+rev.name:'—',st:t.tsSubmitted?'tdone':t.status==='Pending Review'?'tact':'tpend',dur:wh,durT:wh!==null?`Work took ${dur(wh)}`:null,dc:'#2563eb'},
    {key:'tsReviewed',lbl:t.status==='Rejected'?'Rejected':'Approved by Reviewer',sub:rev?rev.name:'—',st:t.tsReviewed?(t.status==='Rejected'?'tfail':'tdone'):'tpend',dur:rvh,durT:rvh!==null?`Review took ${dur(rvh)}`:null,dc:'#7c3aed'},
    {key:'tsArchived',lbl:'Archived + Doc Created',sub:'Auto-archived on approval',st:t.tsArchived?'tdone':'tpend',dur:ch,durT:ch!==null?`Full cycle: ${dur(ch)}`:null,dc:'#16a34a'},
  ];
  body+=`<div class="sps">Cycle Timeline</div><div class="tl">`;
  steps.forEach(s=>{
    const ts=t[s.key];
    body+=`<div class="tl-it"><div class="tld ${s.st}"></div>
      <div class="tl-lbl" style="color:${s.st==='tpend'?'var(--tx3)':'var(--tx)'}">${s.lbl}</div>
      <div class="tl-sub">${s.sub}</div>
      ${ts?`<div class="tl-ts">${fdt(ts)}</div>`:''}
      ${s.durT&&ts?`<div class="tl-dur" style="color:${s.dc||'var(--ac)'}">${s.durT}</div>`:''}
    </div>`;
  });
  body+=`</div>`;

  // Mark comments as read for current user
  if(t.comments?.length){
    let changed=false;
    t.comments.forEach(c=>{
      if(c.by!==CU?.id){if(!c.readBy)c.readBy=[];if(!c.readBy.includes(CU?.id)){c.readBy.push(CU.id);changed=true;}}
    });
    if(changed){nUpdateTask(t);setTimeout(updateBadges,200);}
  }

  // ── Comments ────────────────────────────────────────────
  const comments=t.comments||[];
  body+=`<div class="sps" style="display:flex;align-items:center;justify-content:space-between">
    <span>💬 Comments (${comments.length})</span>
  </div>`;
  if(comments.length){
    comments.forEach(c=>{
      const cm=DB.team.find(m=>m.id===c.by);
      body+=`<div style="display:flex;gap:8px;margin-bottom:10px">
        <span style="width:24px;height:24px;border-radius:50%;background:${cm?.color||'#64748b'};display:inline-flex;align-items:center;justify-content:center;font-size:8px;font-weight:800;color:#fff;flex-shrink:0;margin-top:2px">${cm?.av||(c.byName||'?')[0].toUpperCase()}</span>
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:7px;margin-bottom:3px">
            <span style="font-size:12px;font-weight:700">${escapeHtml(c.byName||cm?.name||'?')}</span>
            <span style="font-size:10px;color:var(--tx3)">${fdt(c.at)}</span>
          </div>
          <div style="background:var(--s2);border:1px solid var(--bd);border-radius:8px;padding:8px 10px;font-size:12px;color:var(--tx2);white-space:pre-wrap;line-height:1.5">${escapeHtml(c.text)}</div>
        </div>
      </div>`;
    });
  } else {
    body+=`<div style="font-size:12px;color:var(--tx3);font-style:italic;padding:6px 0 10px">No comments yet.</div>`;
  }
  body+=`<div style="display:flex;gap:8px;align-items:flex-end;margin-bottom:14px">
    <div style="flex:1;position:relative">
      <textarea id="task-comment-ta" placeholder="Add a comment… (@ to mention someone)" rows="2" oninput="filterMentionDrop(event)" onkeydown="mentionKeydown(event)" onblur="setTimeout(hideMentionDrop,200)" style="width:100%;padding:8px 10px;background:var(--s2);border:1px solid var(--bd);border-radius:8px;color:var(--tx);font-family:var(--fn);font-size:13px;outline:none;resize:vertical;box-sizing:border-box"></textarea>
      <div id="task-comment-mention-drop" style="display:none;position:absolute;bottom:100%;left:0;right:0;margin-bottom:4px;z-index:300;background:var(--s);border:1px solid var(--bd);border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,.12);max-height:160px;overflow-y:auto"></div>
    </div>
    <button class="btn bp bsm" onclick="postTaskComment('${t.id}')" style="flex-shrink:0;height:36px">Post</button>
  </div>`;

  // Action buttons
  if(canEdit){
    body+=`<div class="spa" style="flex-wrap:wrap">`;
    if(isMine&&(t.status==='New'||t.status==='Rejected'))body+=`<button class="btn bp bsm" onclick="reqStart('${t.id}')">▶ Set Estimate & Start</button>`;
    if(isMine&&t.status==='In Progress'){
      body+=`<button class="btn bp bsm" onclick="reqSubmit('${t.id}')">📤 Submit for Review</button>`;
      body+=`<button class="btn bg2 bsm" onclick="reqReEstimate('${t.id}')">⏱ Re-Estimate</button>`;
      body+=`<button class="btn bg2 bsm" onclick="reqHelp('${t.id}')">🤝 Request Help</button>`;
    }
    if(isMine&&t.status==='Pending Help'){
      // Check if any linked help tasks are done — if so, status should have updated
      const activeHelp=DB.tasks.filter(h=>h.parentTaskId===t.id&&h.type==='Help Request'&&!['Done','Cancelled','Rejected'].includes(h.status));
      if(activeHelp.length===0&&t.status==='Pending Help'){
        // All help tasks are done — force status back to In Progress
        t.status='In Progress';
        sbUpdate('tasks',t.id,{status:'In Progress'}).then(()=>{});
      } else {
        body+=`<div style="background:#fff7ed;border:1px solid #fed7aa;border-left:3px solid #c2410c;border-radius:9px;padding:9px 13px;font-size:12px;color:#c2410c;margin-bottom:6px">⏸ Waiting for help. When help is accepted, your task returns to In Progress automatically.</div>`;
      }
    }
    if(isMine||isRevMine||isAdmin())body+=`<button class="btn bg2 bsm" onclick="reqRemind('${t.id}')">🔔 Remind</button>`;
    if((isAdmin()||isRevMine)&&t.status==='Pending Review'){
      body+=`<button class="btn bk bsm" onclick="approveTask('${t.id}')">✓ Approve</button>`;
      body+=`<button class="btn bd2 bsm" onclick="rejectTask('${t.id}')">✗ Reject</button>`;
    }
    // Help request acceptance (requester reviews helper's submission)
    if(t.type==='Help Request'&&t.status==='Pending Review'&&t.reqBy===CU.name){
      body+=`<button class="btn bk bsm" onclick="approveTask('${t.id}')">✓ Accept Help</button>`;
      body+=`<button class="btn bd2 bsm" onclick="rejectTask('${t.id}')">✗ Reject Help</button>`;
    }
    if(isAdmin()){
      body+=`<button class="btn bg2 bsm" onclick="openTaskModal('${t.id}');closeSP()">✏ Edit</button>`;
      body+=`<button class="btn bg2 bsm" onclick="duplicateTask('${t.id}')" title="Create a new task with the same assignee/service/operator/reviewer">⎘ Duplicate</button>`;
      body+=`<select onchange="chStatus('${t.id}',this.value)" style="padding:5px 9px;background:var(--s2);border:1px solid var(--bd);border-radius:8px;color:var(--tx);font-family:var(--fn);font-size:11px;outline:none;cursor:pointer">
        ${['New','In Progress','Pending Help','Pending Review','Done','Rejected','On Hold','Cancelled'].map(s=>`<option ${t.status===s?'selected':''} value="${s}">${s}</option>`).join('')}
      </select>`;
    }
    body+=`</div>`;
  }
  document.getElementById('sp-bd').innerHTML=body;
  document.getElementById('sp-pnl').classList.add('open');
};

// ══════════════════════════════════════════════════════
// TASK LIFECYCLE ACTIONS
// ══════════════════════════════════════════════════════
window.reqStart=(id)=>{
  const t=DB.tasks.find(tk=>tk.id===id);
  _pendTask=id;document.getElementById('est-h').value=t?.est||'';OM('m-est');
};

// Service Test tasks are auto-created when a scheduled test day arrives.
// They go through the normal "Set Estimate & Start" step like any task —
// see confirmStart(), which routes into the checklist afterward instead
// of opening the normal task detail view.
window.startServiceTestTask=async(taskId)=>{
  const t=DB.tasks.find(tk=>tk.id===taskId);if(!t)return;
  closeSP();
  const todayStr=new Date().toISOString().split('T')[0];
  const op=[...DB.operators,...DB.companies].find(o=>o.id===t.operator);
  let session=DB.testSessions.find(s=>s.test_date===todayStr&&(s.tester_id===CU.id||s.tester_name===CU.name)&&s.operator_name===op?.name&&s.status!=='Cancelled');
  navTo('svctest');
  if(session){
    openServiceList(session.id);
  } else if(op){
    await startTestSession(t.operator,CU.id);
  } else {
    toast('This test task has no operator linked — open Service Tests to start manually','bad');
  }
};

// ── RE-ESTIMATE ──────────────────────────────────────────────────────────
window.reqReEstimate=(id)=>{
  _pendTask=id;
  const t=DB.tasks.find(tk=>tk.id===id);if(!t)return;
  document.getElementById('reest-current').value=t.est?t.est+'h':'Not set';
  document.getElementById('reest-h').value='';
  document.getElementById('reest-reason').value='';
  OM('m-reest');
};
window.confirmReEstimate=async()=>{
  const newEst=parseFloat(document.getElementById('reest-h').value);
  const reason=document.getElementById('reest-reason').value.trim();
  if(!newEst||newEst<=0){toast('Enter a valid new estimate','bad');return;}
  if(!reason){toast('Explain what stopped you','bad');return;}
  const t=DB.tasks.find(tk=>tk.id===_pendTask);if(!t)return;
  const oldEst=t.est;
  t.reEstimates=t.reEstimates||[];
  t.reEstimates.push({oldEst,newEst,reason,at:now(),by:CU.name});
  t.est=newEst;
  logAction('Re-Estimated',`${esc(CU.name)} re-estimated "${esc(t.title)}" from ${oldEst}h to ${newEst}h — ${reason}`,'Warning',t.title,'');
  notifyAdmins(`${CU.name} re-estimated "${t.title}": ${oldEst}h → ${newEst}h. Reason: ${reason}`,'Re-Estimate',t.title,{taskId:t.id});
  if(t.reviewer){const rv=DB.team.find(m=>m.id===t.reviewer);if(rv)sendNotif(rv.name,`${CU.name} re-estimated "${t.title}": ${oldEst}h → ${newEst}h. Reason: ${reason}`,'Re-Estimate',t.title,false,{taskId:t.id});}
  await nUpdateTask(t);
  CM('m-reest');toast(`Estimate updated to ${newEst}h ✓`,'ok');openTask(_pendTask);
};

// ── HELP REQUEST ─────────────────────────────────────────────────────────
window.reqHelp=(id)=>{
  _pendTask=id;
  const t=DB.tasks.find(tk=>tk.id===id);if(!t)return;
  const sel=document.getElementById('help-member');
  sel.innerHTML=DB.team.filter(m=>m.id!==CU.id&&m.id!==t.assignedTo).map(m=>`<option value="${m.id}">${esc(m.name)}</option>`).join('');
  document.getElementById('help-due').value=t.due||'';
  document.getElementById('help-desc').value='';
  OM('m-help');
};
window.confirmHelpRequest=async()=>{
  const helperId=document.getElementById('help-member').value;
  const desc=document.getElementById('help-desc').value.trim();
  const due=document.getElementById('help-due').value;
  if(!helperId){toast('Select a member','bad');return;}
  if(!desc){toast('Describe what you need help with','bad');return;}
  const t=DB.tasks.find(tk=>tk.id===_pendTask);if(!t)return;
  const helper=DB.team.find(m=>m.id===helperId);
  const helpTask={
    id:'t'+gid(),
    title:`🤝 Help Needed: ${esc(t.title)}`,
    status:'New',priority:t.priority,
    type:'Help Request',
    assignedTo:helperId,assignees:[helperId],
    reviewer:CU.id,  // requester reviews the help — accept/reject like normal
    reqBy:CU.name,createdBy:CU.name,
    parentTaskId:t.id,
    due:due||null,est:null,recur:null,
    desc:`${esc(CU.name)} needs your help with task "${esc(t.title)}".\n\nWhat's needed:\n${desc}\n\nWork this task normally — set your estimate, start, then submit when done. ${esc(CU.name)} will review and accept or reject your submission.`,
    link:'',tsCreated:now(),tsAssigned:now(),tsOpened:null,tsStarted:null,
    tsSubmitted:null,tsReviewed:null,tsArchived:null,
    actual:null,what:'',tech:'',rejReason:'',rejections:[]
  };
  // Mark parent task as Pending Help
  t.status='Pending Help';
  t.timeline=t.timeline||[];
  t.timeline.push({
    event:`⏸ Pending help from ${helper?.name||'?'}`,
    at:now(),by:CU.name,
    desc:`Help requested: ${desc}`,
    type:'help_requested',
    helpMember:helper?.name||'?',
    helpTaskId:helpTask.id
  });
  await nUpdateTask(t);
  const r=await nCreateTask(helpTask,helpTask.id);
  if(r?.id)helpTask.id=r.id;
  DB.tasks.unshift(helpTask);
  if(helper)sendNotif(helper.name,`${CU.name} needs your help with "${t.title}". Please review and submit when done.`,'Help Request',helpTask.title,false,{taskId:helpTask.id});
  notifyAdmins(`${CU.name} requested help from ${helper?.name||'?'} on "${t.title}"`,'Help Request',t.title,{taskId:t.id});
  if(helper) notifyTG(helper.id,'help_requested',{title:t.title,desc,link:appLink('task-'+helpTask.id)});
  notifyAdminsTG(`🤝 Help Request\n\n${CU.name} requested help from ${helper?.name||'?'}\nTask: "${t.title}"`,appLink('task-'+t.id));
  logAction('Help Requested',`${esc(CU.name)} requested help from ${helper?.name||'?'} for "${esc(t.title)}"`,'Info',t.title,'',{taskId:t.id,taskTitle:t.title,memberId:helper?.id,memberName:helper?.name});
  CM('m-help');toast(`Help request sent to ${helper?.name||'?'} ✓`,'ok');openTask(_pendTask);updateBadges();
};

// ── ADMIN DELETE FOR COMMS ───────────────────────────────────────────────
window.delHrCom=async(id)=>{
  if(!isAdmin())return;
  if(!confirm('Delete this HR message?'))return;
  DB.hrComs=DB.hrComs.filter(c=>c.id!==id);
  await sbCommsDelete('hr_communications',id);
  toast('Deleted','ok'); updateBadges();
  const el=document.getElementById('content');if(el&&page==='hrcoms')rHrComs(el);
};
window.delReminder=async(id)=>{
  if(!isAdmin())return;
  if(!confirm('Delete this reminder?'))return;
  DB.reminders=DB.reminders.filter(r=>r.id!==id);
  await sbCommsDelete('reminders',id);
  toast('Deleted','ok'); updateBadges();
  const el=document.getElementById('content');if(el&&page==='reminders')rReminders(el);
};
window.delHelpTask=async(id)=>{
  if(!isAdmin())return;
  if(!confirm('Delete this help request?'))return;
  DB.tasks=DB.tasks.filter(t=>t.id!==id);
  await sbDelete('tasks',id);
  toast('Deleted','ok'); updateBadges();
  const el=document.getElementById('content');if(el&&page==='helprequests')rHelpRequests(el);
};
// Builds a specific "why you're being reminded" sentence from the task's
// actual state, instead of a generic "please take action" — this becomes
// the pre-filled (but still editable) message text.
function reminderContextMsg(t){
  const ds=getDueStatus(t);
  if(ds.key==='overdue') return `"${esc(t.title)}" is ${ds.label.replace('d overdue','day(s) overdue')} — it was due ${fd(t.due)}. Please take action.`;
  if(t.status==='New'&&t.tsCreated&&!t.tsOpened){
    const hrs=Math.floor((Date.now()-new Date(t.tsCreated))/3600000);
    return `"${esc(t.title)}" was assigned ${hrs>=24?Math.floor(hrs/24)+'d':hrs+'h'} ago and hasn't been opened yet. Please take a look.`;
  }
  if(t.status==='In Progress'&&t.tsStarted){
    const hrs=Math.floor((Date.now()-new Date(t.tsStarted))/3600000);
    if(hrs>=12) return `"${esc(t.title)}" has been In Progress for ${hrs>=24?Math.floor(hrs/24)+'d':hrs+'h'} with no update. How's it going?`;
  }
  return `Reminder: "${esc(t.title)}" is still ${t.status}. Please take action.`;
}

window.reqRemind=(id)=>{
  _pendTask=id;
  const t=DB.tasks.find(tk=>tk.id===id);if(!t)return;
  const sel=document.getElementById('remind-member');
  const candidates=[t.assignedTo,t.reviewer,...(t.assignees||[])].filter((x,i,a)=>x&&a.indexOf(x)===i&&x!==CU.id);
  sel.innerHTML=candidates.map(mid=>{const m=DB.team.find(x=>x.id===mid);return m?`<option value="${m.id}">${esc(m.name)}</option>`:''}).join('')||DB.team.filter(m=>m.id!==CU.id).map(m=>`<option value="${m.id}">${esc(m.name)}</option>`).join('');
  // Pre-fill with a message specific to why this task needs a nudge —
  // admin can edit or clear it before sending; not just decoration.
  document.getElementById('remind-msg').value=reminderContextMsg(t);
  OM('m-remind');
};
window.confirmRemind=async()=>{
  const mid=document.getElementById('remind-member').value;
  const msg=document.getElementById('remind-msg').value.trim();
  const t=DB.tasks.find(tk=>tk.id===_pendTask);if(!t)return;
  const m=DB.team.find(x=>x.id===mid);if(!m)return;
  const defaultMsg=reminderContextMsg(t);
  const row={id:'r'+gid(),from_id:CU.id,from_name:CU.name,to_id:m.id,to_name:m.name,task_id:t.id,task_title:t.title,meeting_id:null,msg:msg||defaultMsg,read:false,at:now()};
  const saved=await sbCommsInsert('reminders',row);
  if(saved){
    DB.reminders=DB.reminders||[];
    DB.reminders.unshift({id:row.id,fromId:CU.id,fromName:CU.name,toId:m.id,toName:m.name,taskId:t.id,taskTitle:t.title,msg:row.msg,read:false,at:row.at});
  }
  sendNotif(m.name,msg||defaultMsg,'Reminder',t.title,false,{taskId:t.id});
  notifyTG(m.id,'reminder',{desc:`${msg||defaultMsg}\n\n📋 Task: "${t.title}"\nStatus: ${t.status}`,link:appLink('task-'+t.id)});
  // Admins are watching this too, same as the rest of the task lifecycle
  // notifications — a reminder is a signal something needs attention.
  notifyAdmins(`${CU.name} reminded ${m.name} about "${t.title}"`,'Reminder',t.title,{taskId:t.id});
  logAction('Reminder Sent',`${esc(CU.name)} reminded ${esc(m.name)} about "${esc(t.title)}"`,'Info',t.title,'',{taskId:t.id,taskTitle:t.title,memberId:m.id,memberName:m.name});
  CM('m-remind');toast(`Reminder sent to ${m.name} ✓`,'ok');
  updateBadges();
};
window.confirmStart=async()=>{
  const h=parseFloat(document.getElementById('est-h').value);
  if(!h||h<=0){toast('Enter a valid estimate','bad');return;}
  const t=DB.tasks.find(tk=>tk.id===_pendTask);if(!t)return;
  t.est=h; t.status='In Progress'; t.tsStarted=now();
  logAction('Task Started',`${esc(CU.name)} started "${esc(t.title)}" — ${h}h estimate`,'Success',t.title,'',{taskId:t.id,taskTitle:t.title});
  const revMember=DB.team.find(m=>m.id===t.reviewer);
  if(revMember) sendNotif(revMember.name,`${CU.name} started "${t.title}" (Est: ${h}h) — awaiting review when done`,'Task Started',t.title,false,{taskId:t.id});
  notifyAdmins(`${CU.name} started task: "${t.title}" — ${h}h estimated`,'Task Started',t.title,{taskId:t.id});
  notifyAdminsTG(`▶ Task Started\n\n${CU.name} started working on "${t.title}"\nEstimate: ${h}h`,appLink('task-'+t.id));
  await nUpdateTask(t);
  CM('m-est'); toast(`Started — ${h}h estimated ✓`,'ok'); updateBadges();
  if(t.type==='Service Test'){ startServiceTestTask(t.id); } else { openTask(_pendTask); }
};

window.reqSubmit=(id)=>{
  _pendTask=id;const t=DB.tasks.find(tk=>tk.id===id);if(!t)return;
  // Auto-calculate time spent from tsStarted to now, minus any time spent
  // waiting on a Help Request or parked On Hold (that isn't "work" time)
  const rawAutoH=t.tsStarted?hb(t.tsStarted,now()):null;
  const pausedPreview=getTaskPausedHours(t);
  const autoH=rawAutoH!==null?Math.max(0,Math.round((rawAutoH-pausedPreview)*100)/100):null;
  const estEl=document.getElementById('sub-est-val');
  const autoEl=document.getElementById('sub-auto-h');
  const noteEl=document.getElementById('sub-auto-note');
  const startEl=document.getElementById('sub-started-at');
  if(estEl) estEl.textContent=t.est?t.est+'h':'Not set';
  if(autoEl) autoEl.textContent=autoH!==null?autoH+'h':'—';
  if(noteEl){
    if(autoH!==null&&t.est){
      const diff=Math.round((autoH-t.est)/t.est*100);
      noteEl.textContent=diff>0?`${diff}% over estimate`:diff<0?`${Math.abs(diff)}% under estimate`:'Exactly on estimate';
      noteEl.style.color=Math.abs(diff)<=20?'var(--g)':Math.abs(diff)<=50?'var(--y)':'var(--r)';
    } else {
      noteEl.textContent='Auto-calculated from start time';
      noteEl.style.color='var(--tx3)';
    }
  }
  if(startEl) startEl.textContent=t.tsStarted?fdt(t.tsStarted):'Not started';
  document.getElementById('sub-what').value=t.what||'';
  document.getElementById('sub-tech').value=t.tech||'';
  OM('m-sub');
};
window.confirmSubmit=async()=>{
  const what=document.getElementById('sub-what').value.trim();
  if(!what){toast('Describe what was done — this becomes a documentation entry','bad');return;}
  const t=DB.tasks.find(tk=>tk.id===_pendTask);if(!t)return;
  // Auto-calculate actual hours from tsStarted to now, excluding any time
  // spent waiting on a Help Request or parked On Hold
  const submitTime=now();
  const rawActual=hb(t.tsStarted,submitTime);
  const pausedAtSubmit=getTaskPausedHours(t);
  const actual=rawActual!==null?Math.max(0,Math.round((rawActual-pausedAtSubmit)*100)/100):null;
  t.actual=actual;
  t.what=what; t.tech=document.getElementById('sub-tech').value;
  t.status='Pending Review'; t.tsSubmitted=submitTime;
  t.workH=actual;
  logAction('Task Submitted',`${esc(CU.name)} submitted "${esc(t.title)}" — ${actual?actual+'h actual':'time not tracked'}`,'Success',t.title,'');
  const revMember2=DB.team.find(m=>m.id===t.reviewer);
  if(revMember2) sendNotif(revMember2.name,`Review needed: "${t.title}" — ${actual?actual+'h actual':'auto-timed'} by ${CU.name}`,'Review Needed',t.title,false,{taskId:t.id});
  notifyAdmins(`${CU.name} submitted "${t.title}" for review (${actual?actual+'h':' time auto-tracked'})`,'Task Submitted',t.title,{taskId:t.id});
  if(revMember2) notifyTG(revMember2.id,'task_submitted',{title:t.title,priority:t.priority,link:appLink('task-'+t.id)});
  notifyAdminsTG(`📤 Task Submitted for Review\n\n${CU.name} submitted "${t.title}"\n${actual?'Actual: '+actual+'h':''}\nReviewer: ${revMember2?.name||'Not set'}`,appLink('task-'+t.id));
  logAction('Task Submitted',`${esc(CU.name)} submitted "${esc(t.title)}" for review`,'Info',t.title,actual?`Actual: ${actual}h`:'',{taskId:t.id,taskTitle:t.title,memberId:revMember2?.id,memberName:revMember2?.name});
  await nUpdateTask(t);
  CM('m-sub'); toast('Submitted for review ✓','ok'); openTask(_pendTask); updateBadges();
};

window.approveTask=async(id)=>{
  const t=DB.tasks.find(tk=>tk.id===id);if(!t)return;
  t.status='Done'; t.tsReviewed=now(); t.tsArchived=now();
  const rh=hb(t.tsCreated,t.tsOpened);
  const rawWh=hb(t.tsStarted,t.tsSubmitted);
  const pausedAtApprove=getTaskPausedHours(t);
  const wh=rawWh!==null?Math.max(0,Math.round((rawWh-pausedAtApprove)*100)/100):null;
  const rvh=hb(t.tsSubmitted,t.tsReviewed),ch=hb(t.tsCreated,t.tsArchived);
  t.respH=rh; t.workH=wh; t.revH=rvh; t.cycleH=ch;

  // Create archive entry
  const archEntry={id:'a'+gid(),title:t.title,by:t.assignedTo,reviewer:CU.id,svc:t.service,op:t.operator,type:t.type,priority:t.priority,est:t.est,actual:t.actual,done:new Date().toISOString().split('T')[0],what:t.what||'',outcome:'Successful',respH:rh,workH:wh,revH:rvh,cycleH:ch,reqBy:t.reqBy,at:now()};
  DB.archive.unshift(archEntry);
  nArchive(archEntry, archEntry.id);

  // Auto-create documentation from what was done
  if(t.what){
    const doc={id:'d'+gid(),title:`${esc(t.title)} — Documentation`,type:'Task Documentation',status:'Published',author:t.assignedTo,fromTask:t.id,content:`${t.what}${t.tech?'\n\nTechnical Notes:\n'+t.tech:''}`,at:now()};
    DB.docs.unshift(doc); window._docsAll=[...DB.docs];
    nDoc(doc, doc.id);
    logAction('Document Created',`Auto-doc: "${esc(doc.title)}"`,'Success',doc.title,'Auto from task approval');
  }

  logAction('Task Approved',`${esc(CU.name)} approved "${esc(t.title)}"`,'Success',t.title,`Cycle: ${ch}h`);
  await nUpdateTask(t);
  const assMember=DB.team.find(m=>m.id===t.assignedTo);
  if(assMember) sendNotif(assMember.name,`Your task "${t.title}" was APPROVED by ${CU.name} — archived + doc created`,'Task Approved',t.title,false,{taskId:t.id});
  notifyAdmins(`${CU.name} approved "${t.title}" — cycle time: ${ch?ch+'h':'unknown'}`,'Task Approved',t.title,{taskId:t.id});
  if(assMember) notifyTG(assMember.id,'task_approved',{title:t.title,link:appLink('task-'+t.id)});
  logAction('Task Approved',`${esc(CU.name)} approved "${esc(t.title)}"`, 'Success', t.title, `Cycle: ${ch?ch+'h':'?'}`,{taskId:t.id,taskTitle:t.title,memberId:assMember?.id,memberName:assMember?.name});

  // Auto-spawn next recurrence if set
  if(t.recur){
    const nextDue=calcNextDue(t.due,t.recur);
    const recurTask={
      id:'t'+gid(), title:t.title, status:'New',
      priority:t.priority, type:t.type,
      assignedTo:t.assignedTo, assignees:t.assignees||[],
      reviewer:t.reviewer, service:t.service, operator:t.operator,
      reqBy:t.reqBy, createdBy:t.createdBy||CU?.name||'',
      due:nextDue, est:t.est, recur:t.recur,
      desc:t.desc, link:t.link||'',
      tsCreated:now(), tsAssigned:t.assignedTo?now():null, tsOpened:null, tsStarted:null,
      tsSubmitted:null, tsReviewed:null, tsArchived:null,
      actual:null, what:'', tech:'', rejReason:'', rejections:[],
      respH:null, workH:null, revH:null, cycleH:null
    };
    DB.tasks.unshift(recurTask);
    const rr=await nCreateTask(recurTask,recurTask.id);
    if(rr?.id) recurTask.id=rr.id;
    if(assMember) sendNotif(assMember.name,`🔁 Recurring task created: "${recurTask.title}" — due ${fd(nextDue)}`,'Task Assigned',recurTask.title,false,{taskId:recurTask.id});
    toast(`Approved ✓ · 🔁 Next recurrence created — due ${fd(nextDue)}`,'ok',5000);
  } else {
    toast('Approved — archived + doc created ✓','ok');
  }
  closeSP(); updateBadges();
  if(page==='toreview')nav('toreview',document.querySelector('.ni.on'));
};


// When a Help Request task is approved, mark the parent task back to
// In Progress and show a confirmation popup. Wrapping the base approveTask
// like this (defined AFTER it) is required so _origApprove below actually
// captures the real implementation — previously this wrapper was declared
// BEFORE the base function, silently overwritten by it, so this entire
// help-accept flow never actually ran.
const _origApprove=window.approveTask;
window.approveTask=async(id)=>{
  const t=DB.tasks.find(tk=>tk.id===id);if(!t)return;
  if(t.type==='Help Request'&&t.parentTaskId){
    const parentId=t.parentTaskId;
    const parent=DB.tasks.find(tk=>tk.id===parentId);
    const helperName=DB.team.find(m=>m.id===t.assignedTo)?.name||'?';
    const parentTitle=parent?.title||'your task';

    // 1. Update parent in Supabase FIRST
    if(parent){
      parent.status='In Progress';
      parent.timeline=parent.timeline||[];
      parent.timeline.push({
        event:`✅ Help received from ${helperName} — continuing task`,
        at:now(),by:CU.name,
        desc:`Help accepted. ${helperName} submitted: ${t.what||'(no notes)'}`,
        type:'help_received',helperName,helpTaskId:id
      });
      // Direct Supabase write — skips scheduleSync queue
      await sbUpdate('tasks', parent.id, {status:'In Progress', timeline:parent.timeline});
      const parentAss=DB.team.find(m=>m.id===parent.assignedTo);
      if(parentAss&&parentAss.id!==CU.id)
        sendNotif(parentAss.name,`Help from ${helperName} accepted ✓. "${parentTitle}" is back In Progress.`,'Help Accepted',parentTitle,false,{taskId:parent.id});
    }

    // 2. Approve the help task itself (marks it Done, archives it) — this
    //    now correctly calls the real base implementation above
    await _origApprove(id);

    // 3. Re-stamp parent status in memory (Supabase already updated in step 1)
    if(parent) parent.status='In Progress';

    // 4. Re-save parent once more after a short delay to beat any race condition
    setTimeout(async()=>{
      await sbUpdate('tasks', parentId, {status:'In Progress'});
      const freshParent=DB.tasks.find(tk=>tk.id===parentId);
      if(freshParent) freshParent.status='In Progress';
    }, 3000);

    closeSP();

    // 5. Popup
    const ov=document.createElement('div');
    ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:2000;display:flex;align-items:center;justify-content:center';
    ov.innerHTML=`<div style="background:var(--s);border-radius:16px;padding:28px 32px;max-width:400px;width:90%;text-align:center;box-shadow:0 20px 60px #0005">
      <div style="font-size:42px;margin-bottom:12px">✅</div>
      <div style="font-size:18px;font-weight:800;color:var(--tx);margin-bottom:8px">Help Accepted!</div>
      <div style="font-size:13px;color:var(--tx2);line-height:1.6;margin-bottom:12px"><strong>${helperName}</strong>'s contribution has been accepted and logged on the timeline.</div>
      <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:10px;padding:12px 14px;margin-bottom:20px;text-align:left">
        <div style="font-size:10px;font-weight:800;color:#15803d;text-transform:uppercase;margin-bottom:4px">What's next</div>
        <div style="font-size:12px;color:#15803d;line-height:1.8">1. <strong>"${parentTitle}"</strong> is now <strong>In Progress</strong><br>2. Continue working on it normally<br>3. Submit for review when done</div>
      </div>
      <button id="_help-continue-btn" style="width:100%;padding:13px;background:var(--ac);color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:800;cursor:pointer">▶ Open My Task & Continue</button>
      <button onclick="this.closest('.help-ov').remove()" style="width:100%;padding:10px;background:transparent;color:var(--tx3);border:none;font-size:12px;cursor:pointer;margin-top:4px">Dismiss</button>
    </div>`;
    ov.classList.add('help-ov');
    ov.querySelector('#_help-continue-btn').onclick=async()=>{
      ov.remove();
      await sbUpdate('tasks', parentId, {status:'In Progress'});
      const freshParent=DB.tasks.find(tk=>tk.id===parentId);
      if(freshParent) freshParent.status='In Progress';
      openTask(parentId);
    };
    document.body.appendChild(ov);
    updateBadges();
    return;
  }
  return _origApprove(id);
};

window.rejectTask=async(id)=>{
  const reason=prompt('Rejection reason (be specific so the member knows what to fix):');if(!reason)return;
  const t=DB.tasks.find(tk=>tk.id===id);if(!t)return;
  t.rejReason=reason; t.status='Rejected'; t.tsReviewed=now();
  if(!t.rejections)t.rejections=[];
  t.rejections.push({at:now(),by:CU.id,reason});
  logAction('Task Rejected',`${esc(CU.name)} rejected "${esc(t.title)}"`,'Warning',t.title,reason);
  await nUpdateTask(t);
  const assMember2=DB.team.find(m=>m.id===t.assignedTo);
  if(assMember2) sendNotif(assMember2.name,`Your task "${t.title}" was REJECTED by ${CU.name}. Reason: ${reason}`,'Task Rejected',t.title,false,{taskId:t.id});
  notifyAdmins(`${CU.name} rejected "${t.title}" — reason: ${reason}`,'Task Rejected',t.title,{taskId:t.id});
  if(assMember2) notifyTG(assMember2.id,'task_rejected',{title:t.title,reason,link:appLink('task-'+t.id)});
  logAction('Task Rejected',`${esc(CU.name)} rejected "${esc(t.title)}" — ${reason}`,'Warning',t.title,'',{taskId:t.id,taskTitle:t.title,memberId:assMember2?.id,memberName:assMember2?.name});
  toast('Rejected — member notified ✓','ok'); closeSP(); updateBadges();
  if(page==='toreview')nav('toreview',document.querySelector('.ni.on'));
};

window.chStatus=async(id,status)=>{
  const t=DB.tasks.find(tk=>tk.id===id);if(!t)return;
  const old=t.status; t.status=status;
  t.timeline=t.timeline||[];

  // Track manual On Hold periods so they're excluded from work-hour totals,
  // the same way Help Request waiting time already is.
  if(status==='On Hold'&&old!=='On Hold'){
    t.timeline.push({event:'⏸ Manually put On Hold',at:now(),by:CU.name,type:'on_hold_start'});
  }
  if(old==='On Hold'&&status!=='On Hold'){
    t.timeline.push({event:'▶ Resumed from On Hold',at:now(),by:CU.name,type:'on_hold_end'});
  }

  // Moving INTO "In Progress": if this is a genuine restart (task was
  // previously finished/rejected/cancelled), reset ALL the downstream
  // timestamps too — otherwise old tsSubmitted/tsReviewed/tsArchived values
  // from a PRIOR completion cycle stay attached, and the next time this task
  // is marked Done its workH/cycleH get computed against stale data from
  // months ago instead of this rework cycle. This was producing wildly
  // inflated durations whenever an admin manually reopened a finished task.
  if(status==='In Progress'){
    if(!t.tsStarted || ['Done','Cancelled','Rejected'].includes(old)){
      t.tsStarted=now();
      t.tsSubmitted=null; t.tsReviewed=null; t.tsArchived=null;
    }
  }
  if(status==='Pending Review'&&!t.tsSubmitted)t.tsSubmitted=now();
  if(status==='Done'){
    t.tsReviewed=now();
    t.tsArchived=now();
    // Recompute every duration fresh and consistently — same formula and
    // paused-time exclusion used by the normal submit/approve flow, so a
    // task marked Done via this admin override reports identical, correct
    // numbers instead of silently-wrong ones.
    const rawWh=hb(t.tsStarted,t.tsSubmitted);
    const pausedH=getTaskPausedHours(t);
    t.respH=hb(t.tsCreated,t.tsOpened);
    t.workH=rawWh!==null?Math.max(0,Math.round((rawWh-pausedH)*100)/100):null;
    t.revH=hb(t.tsSubmitted,t.tsReviewed);
    t.cycleH=hb(t.tsCreated,t.tsArchived);
  }
  logAction('Status Changed',`${esc(CU.name)}: "${esc(t.title)}" → ${status}`,'Info',t.title,'');
  await nUpdateTask(t);
  const assMbr=DB.team.find(m=>m.id===t.assignedTo);
  if(assMbr&&assMbr.name!==CU?.name) sendNotif(assMbr.name,`Your task "${t.title}" status changed to: ${status} (by ${CU.name})`,'Status Changed',t.title,false,{taskId:t.id});
  notifyAdmins(`${CU.name} changed "${t.title}" → ${status}`,'Status Changed',t.title,{taskId:t.id});
  toast(`Status → ${status}`,'ok'); openTask(id); updateBadges();
};

// ══════════════════════════════════════════════════════
// MODAL OPENERS
// ══════════════════════════════════════════════════════
