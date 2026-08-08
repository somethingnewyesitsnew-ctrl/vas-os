// §19 ── MEETINGS ────────────────────────────────────────────────────────
function rMeetings(el){
  const sc={Scheduled:'#2563eb',Started:'#15803d',Completed:'#64748b',Cancelled:'#dc2626'};
  const tc={Internal:'#7c3aed',External:'#0891b2',Client:'#15803d',Operator:'#b45309'};
  const today=new Date().toISOString().split('T')[0];

  // Filter my meetings — strict: only show own meetings unless allMeetings permission
  const myMeetings=canDo('allMeetings')?DB.meetings:DB.meetings.filter(m=>m.created_by===CU.name||m.invitees?.includes(CU.name));

  // 1-month retention: completed meetings older than 30 days are hidden
  const oneMonthAgo=new Date();oneMonthAgo.setDate(oneMonthAgo.getDate()-30);
  const visibleCompleted=myMeetings.filter(m=>
    m.status==='Completed'&&
    (!m.ended_at||new Date(m.ended_at)>=oneMonthAgo)
  );

  // Active lists — never show Completed or Cancelled
  const upcoming=myMeetings.filter(m=>m.meeting_date>=today&&!['Completed','Cancelled'].includes(m.status));
  const today_meetings=myMeetings.filter(m=>m.meeting_date===today&&!['Completed','Cancelled'].includes(m.status));
  const completed=visibleCompleted.sort((a,b)=>new Date(b.ended_at||b.meeting_date)-new Date(a.ended_at||a.meeting_date));
  const cancelled=myMeetings.filter(m=>m.status==='Cancelled');

  // Calendar view — current month
  const now=new Date();
  const yr=now.getFullYear(), mo=now.getMonth();
  const monthName=now.toLocaleString('en',{month:'long',year:'numeric'});
  const firstDay=new Date(yr,mo,1).getDay();
  const daysInMonth=new Date(yr,mo+1,0).getDate();

  let cal=`<div class="card" style="margin-bottom:12px">
    <div class="ct"><span class="ct-t">📅 ${monthName}</span></div>
    <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px;text-align:center">
      ${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=>`<div style="font-size:9px;font-weight:700;color:var(--tx3);padding:3px">${d}</div>`).join('')}
      ${Array(firstDay).fill('<div></div>').join('')}
      ${Array.from({length:daysInMonth},(_,i)=>{
        const d=i+1;
        const dateStr=`${yr}-${String(mo+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        const dayMeetings=myMeetings.filter(m=>m.meeting_date===dateStr&&!['Completed','Cancelled'].includes(m.status));
        const isToday=dateStr===today;
        return`<div style="padding:3px;border-radius:5px;cursor:pointer;background:${isToday?'var(--ac)':'transparent'};min-height:28px" onclick="openDayMeetings('${dateStr}')" title="${dayMeetings.length?dayMeetings.map(m=>m.title).join(', '):'Click to add meeting'}">
          <div style="font-size:11px;font-weight:${isToday?'700':'400'};color:${isToday?'#fff':dayMeetings.length?'var(--ac)':'var(--tx2)'}">${d}</div>
          ${dayMeetings.length?`<div style="display:flex;justify-content:center;gap:1px">${dayMeetings.slice(0,3).map(m=>`<div style="width:4px;height:4px;border-radius:50%;background:${sc[m.status]||'#2563eb'}"></div>`).join('')}</div>`:''}
        </div>`;
      }).join('')}
    </div>
  </div>`;

  // Meetings list
  function renderList(meetings, title){
    if(!meetings.length) return `<div style="padding:8px 0;font-size:11px;color:var(--tx3)">None</div>`;
    return meetings.map(m=>{
      const col=sc[m.status]||'#2563eb';
      const tCol=tc[m.meeting_type]||'#64748b';
      const invCount=m.invitees?.length||0;
      const presentCount=Object.values(m.attendance||{}).filter(v=>v==='present').length;
      const canEdit=m.created_by===CU.name||isAdmin();
      return`<div class="mc" onclick="openMeetingDetail('${m.id}')" style="margin-bottom:8px">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:5px">
          <div style="flex:1">
            <div style="font-size:13px;font-weight:700;margin-bottom:2px">${escapeHtml(m.title)}</div>
            <div style="font-size:10px;color:var(--tx3);display:flex;gap:10px;flex-wrap:wrap">
              <span>📅 ${fd(m.meeting_date)}</span>
              <span>🕐 ${m.meeting_time}</span>
              <span>⏱ ${m.duration_minutes}min</span>
              ${m.location?`<span>📍 ${m.location}</span>`:''}
            </div>
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0">
            <span style="background:${col}18;color:${col};border:1px solid ${col}28;font-size:9px;font-weight:700;padding:2px 7px;border-radius:20px">${m.status}</span>
            <span style="background:${tCol}12;color:${tCol};font-size:9px;font-weight:600;padding:1px 5px;border-radius:4px">${m.meeting_type}</span>
          </div>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between">
          <div style="font-size:10px;color:var(--tx3)">
            👤 ${m.created_by} · ${invCount} invited ${m.status==='Completed'?`· ${presentCount}/${invCount} attended`:''}
          </div>
          ${canEdit?`<div class="ac" onclick="event.stopPropagation()">
            ${m.status==='Scheduled'?`<button class="btn bk bxs" onclick="event.stopPropagation();startMeeting('${m.id}')">▶ Start</button>`:''}
            ${m.status==='Started'?`<button class="btn bg2 bxs" onclick="event.stopPropagation();endMeetingWithOutcomes('${m.id}')">■ End</button>`:''}
            ${m.status==='Scheduled'||m.status==='Started'?`<button class="btn bd2 bxs" onclick="event.stopPropagation();cancelMeetingFull('${m.id}')">✕</button>`:''}
            <div class="ib edt" onclick="event.stopPropagation();openMeetingModal('${m.id}')">✏</div>
            <div class="ib del" onclick="event.stopPropagation();delItem('meetings','${m.id}','${m.title.replace(/'/g,"\'")}')">🗑</div>
          </div>`:''}
        </div>
      </div>`;
    }).join('');
  }

  let h=cal;
  const activeMtg=myMeetings.filter(m=>m.status==='Started');
  h+=`<div class="tabs" style="margin-bottom:12px">
    <div class="tab on" onclick="switchMeetingTab(0,this)">Upcoming (${upcoming.length})</div>
    <div class="tab" onclick="switchMeetingTab(1,this)" style="${activeMtg.length?'color:#15803d;font-weight:800':''}">Active${activeMtg.length?' ('+activeMtg.length+')':'(0)'}</div>
    <div class="tab" onclick="switchMeetingTab(2,this)">Today (${today_meetings.length})</div>
    <div class="tab" onclick="switchMeetingTab(3,this)">Completed (${completed.length})</div>
    <div class="tab" onclick="switchMeetingTab(4,this)">Cancelled (${cancelled.length})</div>
  </div>`;
  h+=`<div id="mtab-0">${renderList(upcoming,'Upcoming')}</div>`;
  h+=`<div id="mtab-1" style="display:none">${activeMtg.length?'<div style="background:#f0fdf4;border:1px solid #86efac;border-radius:10px;padding:12px 16px;margin-bottom:12px;font-size:13px;font-weight:600;color:#15803d">🟢 '+activeMtg.length+' meeting'+(activeMtg.length>1?'s are':' is')+' happening right now</div>'+renderList(activeMtg,'Active'):'<div class="empty"><div class="ei">🟢</div><div class="et">No active meetings right now</div></div>'}</div>`;
  h+=`<div id="mtab-2" style="display:none">${renderList(today_meetings,'Today')}</div>`;
  h+=`<div id="mtab-3" style="display:none">${renderList(completed,'Completed')}</div>`;
  h+=`<div id="mtab-4" style="display:none">${renderList(cancelled,'Cancelled')}</div>`;
  el.innerHTML=h;
}

window.switchMeetingTab=(idx,el)=>{
  document.querySelectorAll('#mtab-0,#mtab-1,#mtab-2,#mtab-3,#mtab-4').forEach((t,i)=>t.style.display=i===idx?'':'none');
  el.closest('.tabs').querySelectorAll('.tab').forEach(t=>t.classList.remove('on'));
  el.classList.add('on');
};

window.openDayMeetings=(dateStr)=>{
  const ms=DB.meetings.filter(m=>m.meeting_date===dateStr);
  const ptEl=document.getElementById('sp-t');
  if(ptEl)ptEl.textContent=`📅 ${fd(dateStr)}`;
  const bdEl=document.getElementById('sp-bd');
  if(bdEl){
    let h=`<button class="btn bp bsm" style="width:100%;margin-bottom:12px" onclick="closeSP();const m=document.getElementById('mf-date');openMeetingModal(null);setTimeout(()=>{if(m)m.value='${dateStr}';},50)">+ Schedule Meeting on this day</button>`;
    if(ms.length){
      h+=ms.map(m=>{
        const col={Scheduled:'#2563eb',Started:'#15803d',Completed:'#64748b',Cancelled:'#dc2626'}[m.status]||'#2563eb';
        return`<div onclick="openMeetingDetail('${m.id}')" style="padding:9px 0;border-bottom:1px solid var(--bd);cursor:pointer;display:flex;align-items:center;gap:8px">
          <div style="width:7px;height:7px;border-radius:50%;background:${col};flex-shrink:0"></div>
          <div><div style="font-weight:600;font-size:12px">${escapeHtml(m.title)}</div><div style="font-size:10px;color:var(--tx3)">${m.meeting_time} · ${m.duration_minutes}min · ${m.status}</div></div>
        </div>`;
      }).join('');
    } else {
      h+=`<div style="text-align:center;padding:20px 0;color:var(--tx3);font-size:12px">No meetings this day</div>`;
    }
    bdEl.innerHTML=h;
  }
  document.getElementById('sp-pnl')?.classList.add('open');
};

window.openMeetingDetail=(id)=>{
  const m=DB.meetings.find(x=>x.id===id);if(!m)return;
  const sc={Scheduled:'#2563eb',Started:'#15803d',Completed:'#64748b',Cancelled:'#dc2626'};
  const col=sc[m.status]||'#2563eb';
  const canEdit=m.created_by===CU.name||isAdmin();
  const invCount=m.invitees?.length||0;
  const presentCount=Object.values(m.attendance||{}).filter(v=>v==='present').length;

  let body=`<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">
    <span style="background:${col}18;color:${col};border:1px solid ${col}28;font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px">${m.status}</span>
    <span class="pill p-n">${m.meeting_type}</span>
  </div>
  <div class="sg2">
    <div class="spf"><div class="spl">Date</div><div class="spv">${fd(m.meeting_date)}</div></div>
    <div class="spf"><div class="spl">Time</div><div class="spv">${m.meeting_time}</div></div>
    <div class="spf"><div class="spl">Duration</div><div class="spv">${m.duration_minutes} minutes</div></div>
    <div class="spf"><div class="spl">Created by</div><div class="spv">${m.created_by}</div></div>
    ${m.location?`<div class="spf" style="grid-column:1/-1"><div class="spl">Location</div><div class="spv">${/^https?:\/\//i.test(m.location)?`<a href="${m.location}" target="_blank" style="color:var(--ac)">${m.location}</a>`:m.location}</div></div>`:''}
  </div>
  ${m.description?`<div class="spf"><div class="spl">Agenda / Description</div><div class="spnote">${escapeHtml(m.description)}</div></div>`:''}`;

  // Attendance section
  if(m.invitees?.length){
    body+=`<div class="sps">Invitees & Attendance (${presentCount}/${invCount} present)</div>`;
    m.invitees.forEach(name=>{
      const att=m.attendance?.[name]||'pending';
      const mbr=DB.team.find(x=>x.name===name);
      const attColor={present:'#15803d',absent:'#dc2626',pending:'#94a3b8'};
      const attBg={present:'#f0fdf4',absent:'#fef2f2',pending:'var(--s2)'};
      body+=`<div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--bd)">
        ${mbr?`<span style="width:22px;height:22px;border-radius:50%;background:${mbr.color};display:inline-flex;align-items:center;justify-content:center;font-size:8px;font-weight:700;color:#fff;flex-shrink:0">${mbr.av}</span>`:''}
        <span style="flex:1;font-size:12px;font-weight:500">${name}</span>
        ${canEdit&&m.status==='Completed'?`<div style="display:flex;gap:4px">
          <button class="btn bxs" style="background:${att==='present'?'#f0fdf4':'var(--s2)'};color:${att==='present'?'#15803d':'var(--tx3)'};border:1px solid ${att==='present'?'#86efac':'var(--bd)'}" onclick="markAttendance('${m.id}','${name}','present')">✓</button>
          <button class="btn bxs" style="background:${att==='absent'?'#fef2f2':'var(--s2)'};color:${att==='absent'?'#dc2626':'var(--tx3)'};border:1px solid ${att==='absent'?'#fca5a5':'var(--bd)'}" onclick="markAttendance('${m.id}','${name}','absent')">✗</button>
        </div>`:`<span style="background:${attBg[att]};color:${attColor[att]};font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;border:1px solid ${attColor[att]}22">${att}</span>`}
      </div>`;
    });
  }

  // Timeline
  body+=`<div class="sps">Timeline</div>
  <div class="tl">
    <div class="tl-it"><div class="tld td-done"></div><div class="tl-lbl">Meeting created</div><div class="tl-ts">${fdt(m.created_at)}</div></div>
    ${m.started_at?`<div class="tl-it"><div class="tld td-done"></div><div class="tl-lbl">Meeting started</div><div class="tl-ts">${fdt(m.started_at)}</div></div>`:''}
    ${m.ended_at?`<div class="tl-it"><div class="tld td-done"></div><div class="tl-lbl">Meeting ended</div><div class="tl-ts">${fdt(m.ended_at)}</div></div>`:''}
    ${m.cancelled_at?`<div class="tl-it"><div class="tld td-fail"></div><div class="tl-lbl">Cancelled</div><div class="tl-ts">${fdt(m.cancelled_at)}</div>${m.cancel_reason?`<div class="tl-sub">${m.cancel_reason}</div>`:''}</div>`:''}
  </div>`;

  // Tasks created from this meeting
  const mTasks=DB.tasks.filter(t=>t.meetingId===m.id||(t.desc&&t.desc.includes(`meeting: "${m.title}"`))|| (t.desc&&t.desc.includes(`meeting on`)&&t.desc.includes(m.title)));
  body+=`<div class="sps" style="display:flex;align-items:center;justify-content:space-between">
    <span>Action Items / Tasks (${mTasks.length})</span>
    <div style="display:flex;gap:8px;align-items:center">
      ${mTasks.length?`<button onclick="nav('alltasks',document.querySelector('[data-p=\\'alltasks\\']'))" style="font-size:10px;color:var(--ac);background:none;border:none;cursor:pointer;font-weight:600">View all →</button>`:''}
      <button onclick="addPostMeetingAction('${m.id}')" style="font-size:10px;font-weight:700;padding:3px 9px;background:var(--ac);color:#fff;border:none;border-radius:6px;cursor:pointer">+ Add Action Item</button>
    </div>
  </div>`;
  if(mTasks.length){
    mTasks.forEach(t=>{
      body+=`<div onclick="openTask('${t.id}')" style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--bd);cursor:pointer">
        ${spill(t.status)}
        <span style="flex:1;font-size:12px;font-weight:500">${t.title}</span>
        ${ppill(t.priority)}
        ${t.assignedTo?`<span style="font-size:10px;color:var(--tx3)">${mn(t.assignedTo)}</span>`:''}
      </div>`;
    });
  } else {
    body+=`<div style="font-size:12px;color:var(--tx3);padding:8px 0;font-style:italic">No action items yet.</div>`;
  }
  // Inline add-action-item form (hidden by default)
  const teamOpts2=DB.team.map(t=>`<option value="${t.id}">${t.name}</option>`).join('');
  const defDue2=(()=>{const d=new Date();d.setDate(d.getDate()+3);return d.toISOString().split('T')[0];})();
  body+=`<div id="post-action-form" style="display:none;background:var(--s2);border:1px solid var(--bd);border-radius:10px;padding:14px;margin-top:8px">
    <div style="font-size:11px;font-weight:800;color:var(--tx2);margin-bottom:10px;text-transform:uppercase;letter-spacing:.06em">New Action Item</div>
    <input id="pa-title" placeholder="Action item title…" style="width:100%;padding:8px 10px;background:var(--s);border:1px solid var(--bd);border-radius:7px;color:var(--tx);font-size:13px;outline:none;font-family:var(--fn);margin-bottom:10px;box-sizing:border-box">
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:8px">
      <div>
        <div style="font-size:10px;color:var(--tx3);margin-bottom:3px;font-weight:600">Assignee</div>
        <select id="pa-assignee" style="width:100%;padding:6px 8px;background:var(--s);border:1px solid var(--bd);border-radius:7px;color:var(--tx);font-size:12px;outline:none">
          <option value="">— Anyone —</option>${teamOpts2}
        </select>
      </div>
      <div>
        <div style="font-size:10px;color:var(--tx3);margin-bottom:3px;font-weight:600">Reviewer</div>
        <select id="pa-reviewer" style="width:100%;padding:6px 8px;background:var(--s);border:1px solid var(--bd);border-radius:7px;color:var(--tx);font-size:12px;outline:none">
          <option value="">— Optional —</option>${teamOpts2}
        </select>
      </div>
      <div>
        <div style="font-size:10px;color:var(--tx3);margin-bottom:3px;font-weight:600">Priority</div>
        <select id="pa-priority" style="width:100%;padding:6px 8px;background:var(--s);border:1px solid var(--bd);border-radius:7px;color:var(--tx);font-size:12px;outline:none">
          <option>Critical</option><option>High</option><option selected>Medium</option><option>Low</option>
        </select>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
      <div>
        <div style="font-size:10px;color:var(--tx3);margin-bottom:3px;font-weight:600">Due Date</div>
        <input type="date" id="pa-due" value="${defDue2}" style="width:100%;padding:6px 8px;background:var(--s);border:1px solid var(--bd);border-radius:7px;color:var(--tx);font-size:12px;outline:none;box-sizing:border-box">
      </div>
      <div>
        <div style="font-size:10px;color:var(--tx3);margin-bottom:3px;font-weight:600">Est. Hours (optional)</div>
        <input type="number" id="pa-est" placeholder="e.g. 2" min="0.5" step="0.5" style="width:100%;padding:6px 8px;background:var(--s);border:1px solid var(--bd);border-radius:7px;color:var(--tx);font-size:12px;outline:none;box-sizing:border-box">
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:12px">
      <div>
        <div style="font-size:10px;color:var(--tx3);margin-bottom:3px;font-weight:600">Project (optional)</div>
        <select id="pa-project" style="width:100%;padding:6px 8px;background:var(--s);border:1px solid var(--bd);border-radius:7px;color:var(--tx);font-size:12px;outline:none">
          <option value="">— None —</option>${DB.projects.map(p=>`<option value="${p.id}">${p.name}</option>`).join('')}
        </select>
      </div>
      <div>
        <div style="font-size:10px;color:var(--tx3);margin-bottom:3px;font-weight:600">Operator (optional)</div>
        <select id="pa-operator" style="width:100%;padding:6px 8px;background:var(--s);border:1px solid var(--bd);border-radius:7px;color:var(--tx);font-size:12px;outline:none">
          <option value="">— None —</option>${DB.operators.map(o=>`<option value="${o.id}">${o.name}</option>`).join('')}
        </select>
      </div>
      <div>
        <div style="font-size:10px;color:var(--tx3);margin-bottom:3px;font-weight:600">Company (optional)</div>
        <select id="pa-company" style="width:100%;padding:6px 8px;background:var(--s);border:1px solid var(--bd);border-radius:7px;color:var(--tx);font-size:12px;outline:none">
          <option value="">— None —</option>${DB.companies.map(c=>`<option value="${c.id}">${c.name}</option>`).join('')}
        </select>
      </div>
    </div>
    <div style="display:flex;gap:7px">
      <button class="btn bp bsm" onclick="savePostMeetingAction('${m.id}')">✓ Create Task</button>
      <button class="btn bg2 bsm" onclick="document.getElementById('post-action-form').style.display='none'">Cancel</button>
    </div>
  </div>`;

  // Notes/Outcome edit section for completed or cancelled meetings
  if(m.status==='Completed'||m.status==='Cancelled'){
    const existingNotes=m.notes||'';
    body+=`<div class="sps" style="display:flex;align-items:center;justify-content:space-between">
      <span>Meeting Notes / Outcome</span>
      <button onclick="toggleMeetingNotesEdit('${m.id}')" id="meet-notes-edit-btn" style="font-size:10px;color:var(--ac);background:none;border:none;cursor:pointer;font-weight:700">✏ Edit</button>
    </div>
    <div id="meet-notes-view" style="${existingNotes?'':'display:none'}">
      <div class="spnote" style="white-space:pre-wrap">${existingNotes||''}</div>
    </div>
    <div id="meet-notes-empty" style="${existingNotes?'display:none':''}">
      <div style="font-size:12px;color:var(--tx3);padding:8px 0;font-style:italic">No notes recorded yet — click Edit to add outcome notes.</div>
    </div>
    <div id="meet-notes-editor" style="display:none;margin-top:6px">
      <textarea id="meet-notes-ta" placeholder="Add outcome, decisions made, follow-ups…" style="width:100%;padding:10px 12px;background:var(--s2);border:1px solid var(--bd);border-radius:8px;color:var(--tx);font-family:var(--fn);font-size:13px;outline:none;resize:vertical;min-height:90px;box-sizing:border-box">${existingNotes}</textarea>
      <div style="display:flex;gap:7px;margin-top:8px">
        <button class="btn bp bsm" onclick="saveMeetingNotes('${m.id}')">💾 Save Notes</button>
        <button class="btn bg2 bsm" onclick="toggleMeetingNotesEdit('${m.id}')">Cancel</button>
      </div>
    </div>`;
  }

  body+=`<div class="spa">
    ${(m.status==='Scheduled'&&canEdit)?`<button class="btn bk bsm" onclick="startMeeting('${m.id}')">\u25b6 Start</button>`:''}
    ${(m.status==='Started'&&canEdit)?`<button class="btn bp bsm" onclick="endMeetingWithOutcomes('${m.id}')">&#9632; End + Outcomes</button>`:''}
    ${(m.status==='Scheduled'||m.status==='Started')?`<button class="btn bg2 bsm" onclick="postponeMeeting('${m.id}')">${(m.created_by===CU.name||isAdmin())?'Postpone':'Request Postpone'}</button>`:''}
    ${(m.status==='Scheduled'||m.status==='Started')?`<button class="btn bd2 bsm" onclick="cancelMeetingFull('${m.id}')">${(m.created_by===CU.name||isAdmin())?'Cancel':'Request Cancel'}</button>`:''}
    ${canEdit?`<button class="btn bg2 bsm" onclick="openMeetingModal('${m.id}')">Edit</button>`:''}
    ${(isAdmin()||m.created_by===CU.name)?`<button class="btn bd2 bsm" onclick="delItem('meetings','${m.id}','${m.title.replace(/'/g,"\\'")}');closeSP()">Delete</button>`:''}
  </div>`;

  openSP(m.title,'',body);
};

window.startMeeting=async(id)=>{
  const m=DB.meetings.find(x=>x.id===id);if(!m)return;
  m.status='Started';m.started_at=new Date().toISOString();
  await nMeetingUpd(m);toast('Meeting started ✓','ok');
  nav('meetings',document.querySelector('[data-p="meetings"]'));
  setTimeout(()=>openMeetingDetail(id),80);
};
window.endMeeting=async(id)=>{
  const m=DB.meetings.find(x=>x.id===id);if(!m)return;
  m.status='Completed';m.ended_at=new Date().toISOString();
  await nMeetingUpd(m);toast('Meeting ended ✓','ok');
  nav('meetings',document.querySelector('[data-p="meetings"]'));
};
window.cancelMeeting=async(id)=>{
  const reason=prompt('Reason for cancellation (optional):');
  const m=DB.meetings.find(x=>x.id===id);if(!m)return;
  m.status='Cancelled';m.cancelled_at=new Date().toISOString();
  if(reason)m.cancel_reason=reason;
  await nMeetingUpd(m);toast('Meeting cancelled','ok');
  nav('meetings',document.querySelector('[data-p="meetings"]'));
};
window.markAttendance=async(meetingId,memberName,status)=>{
  const m=DB.meetings.find(x=>x.id===meetingId);if(!m)return;
  if(!m.attendance)m.attendance={};
  m.attendance[memberName]=status;
  await nMeetingUpd(m);
  openMeetingDetail(meetingId); // re-render panel
};

// ── Meeting invitee tag picker ──────────────────────────────────────────
let _selectedInvitees=[];

function initInviteePicker(preselected=[]){
  _selectedInvitees=[...preselected];
  renderInviteeTags();
}

function renderInviteeTags(){
  const wrap=document.getElementById('mf-inv-tags');if(!wrap)return;
  wrap.innerHTML=_selectedInvitees.map(name=>{
    const m=DB.team.find(x=>x.name===name);
    return`<span class="atag" style="background:${m?.color||'#64748b'}">
      ${m?`<span style="width:14px;height:14px;border-radius:50%;background:rgba(255,255,255,.3);display:inline-flex;align-items:center;justify-content:center;font-size:7px;font-weight:700">${m.av}</span>`:''}
      ${name.split(' ')[0]}
      <span class="atag-x" onclick="removeInvitee('${name.replace(/'/g,"\'")}')">✕</span>
    </span>`;
  }).join('');
}

function removeInvitee(name){_selectedInvitees=_selectedInvitees.filter(x=>x!==name);renderInviteeTags();}

function filterInvSearch(q){
  const drop=document.getElementById('mf-inv-drop');if(!drop)return;
  const filtered=DB.team.filter(m=>m.name!==CU?.name&&!_selectedInvitees.includes(m.name)&&(m.name.toLowerCase().includes(q.toLowerCase())||m.role.toLowerCase().includes(q.toLowerCase())));
  if(!filtered.length){drop.style.display='none';return;}
  drop.style.display='block';
  drop.innerHTML=filtered.map(m=>`<div onclick="addInvitee('${m.name.replace(/'/g,"\'")}') " style="display:flex;align-items:center;gap:8px;padding:8px 12px;cursor:pointer;font-size:13px" onmouseenter="this.style.background='var(--al)'" onmouseleave="this.style.background=''">
    <span style="width:22px;height:22px;border-radius:50%;background:${m.color};display:inline-flex;align-items:center;justify-content:center;font-size:8px;font-weight:700;color:#fff;flex-shrink:0">${m.av}</span>
    <div><div style="font-weight:600">${m.name}</div><div style="font-size:11px;color:var(--tx3)">${m.role}</div></div>
  </div>`).join('');
}

function addInvitee(name){
  if(!_selectedInvitees.includes(name))_selectedInvitees.push(name);
  renderInviteeTags();
  const inp=document.getElementById('mf-inv-search');if(inp){inp.value='';inp.focus();}
  document.getElementById('mf-inv-drop').style.display='none';
}
function showInvDrop(){filterInvSearch(document.getElementById('mf-inv-search')?.value||'');}
function hideInvDrop(){const d=document.getElementById('mf-inv-drop');if(d)d.style.display='none';}
function getSelectedInvitees(){return[..._selectedInvitees];}


function openMeetingModal(id){
  _editId=id;
  const m=id?DB.meetings.find(x=>x.id===id):null;
  document.getElementById('m-meeting-t').textContent=m?'Edit Meeting':'New Meeting';
  document.getElementById('mf-btn').textContent=m?'Save Changes':'Create Meeting';
  document.getElementById('mf-title').value=m?.title||'';
  document.getElementById('mf-date').value=m?.meeting_date||new Date().toISOString().split('T')[0];
  document.getElementById('mf-time').value=m?.meeting_time||'09:00';
  document.getElementById('mf-duration').value=m?.duration_minutes||60;
  document.getElementById('mf-type').value=m?.meeting_type||'Internal';
  if(document.getElementById('mf-recur')) document.getElementById('mf-recur').value=m?.recur||'';
  document.getElementById('mf-location').value=m?.location||'';
  document.getElementById('mf-desc').value=m?.description||'';
  // Populate related-to dropdowns
  const projSel=document.getElementById('mf-project');
  if(projSel) projSel.innerHTML='<option value="">— None —</option>'+DB.projects.map(p=>`<option value="${p.id}" ${m?.project_id===p.id?'selected':''}>${p.name}</option>`).join('');
  const svcSel=document.getElementById('mf-service');
  if(svcSel) svcSel.innerHTML='<option value="">— None —</option>'+(DB.services||[]).map(s=>`<option value="${s.id}" ${m?.service_id===s.id?'selected':''}>${s.name}</option>`).join('');
  const opSel=document.getElementById('mf-operator');
  if(opSel) opSel.innerHTML='<option value="">— None —</option>'+([ ...DB.operators,...DB.companies]).map(o=>`<option value="${o.id}" ${m?.operator_id===o.id?'selected':''}>${o.name}</option>`).join('');
  initInviteePicker(m?.invitees||[]);
  OM('m-meeting');
}

window.saveMeeting=async()=>{
  const title=document.getElementById('mf-title').value.trim();
  if(!title){toast('Title required','bad');return;}
  const date=document.getElementById('mf-date').value;
  const time=document.getElementById('mf-time').value;
  if(!date||!time){toast('Date and time required','bad');return;}
  const invitees=getSelectedInvitees();
  const recur=document.getElementById('mf-recur')?.value||null;
  const data={
    title,
    description:document.getElementById('mf-desc').value,
    meeting_date:date,
    meeting_time:time,
    duration_minutes:parseInt(document.getElementById('mf-duration').value)||60,
    meeting_type:document.getElementById('mf-type').value,
    location:document.getElementById('mf-location').value,
    invitees,
    recur:recur||null,
    project_id:document.getElementById('mf-project')?.value||null,
    service_id:document.getElementById('mf-service')?.value||null,
    operator_id:document.getElementById('mf-operator')?.value||null,
  };
  if(_editId){
    const m=DB.meetings.find(x=>x.id===_editId);if(!m)return;
    Object.assign(m,data);
    await nMeetingUpd(m);CM('m-meeting');toast('Meeting updated ✓','ok');
  } else {
    const m={id:'meet'+gid(),...data,status:'Scheduled',created_by:CU.name,attendance:{},started_at:null,ended_at:null,cancelled_at:null,created_at:now()};
    DB.meetings.push(m);
    await nMeeting(m);CM('m-meeting');
    logAction('Meeting Created',`${CU.name} created meeting "${title}" on ${fd(date)} at ${time}`,'Info',title,`Invitees: ${invitees.join(', ')||'None'}`,{meetingId:m.id,memberName:CU.name});
    invitees.forEach(name=>{
      if(name!==CU.name){
        sendNotif(name,`You're invited to: "${title}" on ${fd(date)} at ${time}${recur?` · repeats ${recur}`:''}`, 'Mention', title, false, {meetingId:m.id});
        const inv=DB.team.find(x=>x.name===name);
        if(inv) notifyTG(inv.id,'meeting_invited',{title,date:fd(date),time,location:data.location||'',link:appLink('meetings')});
      }
    });
    // If recurring, pre-schedule next occurrence
    if(recur){
      const nextDate=calcNextDue(date,recur);
      const nextM={id:'meet'+gid(),...data,meeting_date:nextDate,status:'Scheduled',created_by:CU.name,attendance:{},started_at:null,ended_at:null,cancelled_at:null,created_at:now()};
      DB.meetings.push(nextM);
      await nMeeting(nextM);
      toast(`Meeting created ✓ · 🔁 Next ${recur} occurrence on ${fd(nextDate)}`,'ok',5000);
    } else {
      toast('Meeting created ✓','ok');
    }
  }
  nav('meetings',document.querySelector('[data-p="meetings"]'));
};


// ══════════════════════════════════════════════════════════════════════
// SERVICE TEST MODULE
// ══════════════════════════════════════════════════════════════════════

// ── State ──────────────────────────────────────────────────────────────
let _activeSession = null;   // current live test session object
let _activeChecks  = [];     // current live check items

const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

// ══ MEETING OUTCOMES ══════════════════════════════════════════════════
function rMeetingOutcomes(el){
  const oneMonthAgo=new Date();oneMonthAgo.setDate(oneMonthAgo.getDate()-30);
  const completed=DB.meetings.filter(m=>
    m.status==='Completed'&&
    (!m.ended_at||new Date(m.ended_at)>=oneMonthAgo)&&
    (isAdmin()||m.created_by===CU?.name||m.invitees?.includes(CU?.name))
  ).sort((a,b)=>new Date(b.ended_at||b.meeting_date)-new Date(a.ended_at||a.meeting_date));

  function getOutcomes(m){
    if(!m.description) return '';
    const i1=m.description.indexOf('--- Notes ---');
    if(i1>=0) return m.description.slice(i1+13).trim();
    const i2=m.description.indexOf('--- Outcomes ---');
    if(i2>=0) return m.description.slice(i2+16).trim();
    return '';
  }
  function getMeetingTasks(m){
    // Primary: tasks that have meetingId set (new tasks)
    const byId=DB.tasks.filter(t=>t.meetingId===m.id);
    if(byId.length) return byId;
    // Fallback: tasks created within 6h of meeting end with type=Meeting
    const mt=new Date(m.ended_at||m.meeting_date||m.created_at);
    return DB.tasks.filter(t=>
      t.type==='Meeting'&&t.reqBy===m.created_by&&t.tsCreated&&
      Math.abs(new Date(t.tsCreated)-mt)<1000*60*60*6
    );
  }

  if(!completed.length){
    el.innerHTML=`<div class="empty"><div class="ei">📝</div><div class="et">No completed meetings yet</div><div class="es">Outcomes appear here after meetings are ended. Kept for 30 days.</div></div>`;
    return;
  }

  let h=`<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:8px">
    <div>
      <div style="font-size:20px;font-weight:800;letter-spacing:-.4px">Meeting Outcomes</div>
      <div style="font-size:12px;color:var(--tx3);margin-top:2px">${completed.length} completed meetings · kept for 30 days</div>
    </div>
    <input id="mo-search" placeholder="Search…" oninput="filterMO(this.value)"
      style="padding:7px 12px;background:var(--s);border:1px solid var(--bd);border-radius:8px;color:var(--tx);font-size:12px;outline:none;font-family:var(--fn);width:180px">
  </div>
  <div id="mo-list">`;

  completed.forEach(m=>{
    const outcomes=getOutcomes(m);
    const tasks=getMeetingTasks(m);
    const d=new Date(m.meeting_date||m.ended_at);
    const dayName=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()];
    h+=`<div class="mc" style="margin-bottom:10px">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:${outcomes||tasks.length?'10px':'0'}">
        <div style="flex:1">
          <div style="font-size:14px;font-weight:800;margin-bottom:3px">${escapeHtml(m.title)}</div>
          <div style="display:flex;gap:10px;flex-wrap:wrap;font-size:11px;color:var(--tx3)">
            <span>📅 ${dayName} ${fd(m.meeting_date)}</span>
            ${m.meeting_time?`<span>🕐 ${m.meeting_time}</span>`:''}
            <span>👤 ${m.created_by}</span>
            ${(m.invitees||[]).length?`<span>👥 ${m.invitees.length}</span>`:''}
            ${m.meeting_type?`<span style="background:var(--s2);border:1px solid var(--bd);padding:1px 7px;border-radius:10px">${m.meeting_type}</span>`:''}
          </div>
        </div>
        <div style="display:flex;gap:6px;flex-shrink:0">
          <button onclick="openMeetingDetail('${m.id}')" style="padding:4px 10px;background:var(--s2);border:1px solid var(--bd);border-radius:7px;font-size:11px;font-weight:600;cursor:pointer;color:var(--tx2)">📋 View</button>
          ${isAdmin()||m.created_by===CU?.name?`<button onclick="convertOutcomeToTask('${m.id}')" style="padding:4px 10px;background:var(--ac);border:none;border-radius:7px;font-size:11px;font-weight:700;cursor:pointer;color:#fff">+ Task</button>`:''}
        </div>
      </div>
      ${outcomes?`<div style="background:var(--s2);border-left:3px solid var(--ac);border-radius:0 8px 8px 0;padding:10px 12px;margin-bottom:${tasks.length?'8px':'0'}">
        <div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:var(--tx3);margin-bottom:4px">Notes / Outcomes</div>
        <div style="font-size:12px;color:var(--tx);line-height:1.65;white-space:pre-wrap;max-height:100px;overflow-y:auto">${outcomes}</div>
      </div>`:''}
      ${tasks.length?`<div>
        <div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:var(--tx3);margin-bottom:6px">📋 Action Items (${tasks.length})</div>
        <div style="display:flex;flex-direction:column;gap:6px">
          ${tasks.map(t=>{
            const ds=getDueStatus(t);
            const ass=DB.team.find(mb=>mb.id===t.assignedTo);
            return`<div onclick="openTask('${t.id}')" style="display:flex;align-items:center;gap:9px;padding:9px 11px;background:var(--s2);border:1px solid var(--bd);border-radius:8px;cursor:pointer" onmouseenter="this.style.boxShadow='var(--shmd)'" onmouseleave="this.style.boxShadow=''">
              ${spill(t.status)}
              <span style="flex:1;font-size:12px;font-weight:700;color:var(--tx);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${t.title.replace('Meeting Outcome: ','')}</span>
              ${ppill(t.priority)}
              ${ass?`<span style="display:inline-flex;align-items:center;gap:4px;flex-shrink:0"><span style="width:18px;height:18px;border-radius:50%;background:${ass.color};display:inline-flex;align-items:center;justify-content:center;font-size:7px;color:#fff;font-weight:800">${ass.av}</span><span style="font-size:11px;color:var(--tx2);font-weight:600">${ass.name}</span></span>`:'<span style="font-size:11px;color:var(--tx3)">Unassigned</span>'}
              <span class="due-badge ${ds.cls}" style="flex-shrink:0">${ds.label}</span>
            </div>`;
          }).join('')}
        </div>
      </div>`:''}
      ${!outcomes&&!tasks.length?`<div style="display:flex;align-items:center;gap:8px;padding:10px 12px;background:var(--s2);border-radius:8px;font-size:12px;color:var(--tx3)">
        <span>No outcomes or action items recorded for this meeting</span>
        ${isAdmin()||m.created_by===CU?.name?`<button onclick="convertOutcomeToTask('${m.id}')" style="margin-left:auto;padding:4px 10px;background:var(--ac);border:none;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer;color:#fff;flex-shrink:0">+ Add Task</button>`:''}
      </div>`:''}
    </div>`;
  });
  h+=`</div>`;
  el.innerHTML=h;
}

window.filterMO=(q)=>{
  document.querySelectorAll('#mo-list .mc').forEach(c=>{
    c.style.display=!q||c.textContent.toLowerCase().includes(q.toLowerCase())?'':'none';
  });
};

window.convertOutcomeToTask=(meetingId)=>{
  const m=DB.meetings.find(x=>x.id===meetingId);if(!m)return;
  const outcomes=m.description?.includes('--- Notes ---')
    ?m.description.split('--- Notes ---')[1]?.trim()
    :m.description?.includes('--- Outcomes ---')
    ?m.description.split('--- Outcomes ---')[1]?.trim()
    :'';
  openTaskModal(null);
  setTimeout(()=>{
    const tTitle=document.getElementById('tf-title');
    const tDesc=document.getElementById('tf-desc');
    const tType=document.getElementById('tf-type');
    const tReqBy=document.getElementById('tf-reqby');
    if(tTitle) tTitle.value='Follow-up: '+m.title;
    if(tDesc)  tDesc.value='From meeting: '+m.title+'\nDate: '+fd(m.meeting_date)+(m.meeting_time?' at '+m.meeting_time:'')+(outcomes?'\n\n'+outcomes:'');
    if(tType)  tType.value='Meeting';
    if(tReqBy) tReqBy.value=m.created_by||'';
    tTitle?.focus();
  },80);
};

window.addOutcomeTask=window.convertOutcomeToTask;

// ── Main render ────────────────────────────────────────────────────────
