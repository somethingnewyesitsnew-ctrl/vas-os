// §09 ── SYSTEM LOG PERSISTENCE ─────────────────────────────────────────
function getPersistedLog(){
  try{
    const raw=JSON.parse(localStorage.getItem(LOG_KEY)||'[]');
    const cutoff=Date.now()-30*24*60*60*1000;
    return raw.filter(e=>new Date(e.at).getTime()>cutoff);
  }catch(e){return[];}
}
function persistLog(log){
  try{localStorage.setItem(LOG_KEY,JSON.stringify(log.slice(0,2000)));}catch(e){}
}

function logAction(action,event,severity='Info',target='',details='',meta={}){
  const e={
    id:gid(),action,event,
    actor:CU?.name||'System',
    actorId:CU?.id||'',
    actorRole:CU?.role||'',
    target,details,severity,at:now(),
    // Rich metadata
    memberId:meta.memberId||null,
    memberName:meta.memberName||null,
    taskId:meta.taskId||null,
    taskTitle:meta.taskTitle||null,
    projectId:meta.projectId||null,
    projectName:meta.projectName||null,
    serviceId:meta.serviceId||null,
    serviceName:meta.serviceName||null,
    operatorId:meta.operatorId||null,
    operatorName:meta.operatorName||null,
    meetingId:meta.meetingId||null,
  };
  // In-memory (recent 200 for speed)
  syslog.unshift(e);
  syslog=syslog.slice(0,200);
  // Persisted (30 days, 2000 entries)
  const stored=getPersistedLog();
  stored.unshift(e);
  persistLog(stored);
  // Push to Supabase notifications table for cross-device
  nLog(e);
}

// Pings every admin via Telegram only. Pair this with notifyAdmins() at
// the call site for the in-app notification row — notifyAdmins() writes
// ONE admins_only row with proper meta.taskId/meetingId so clicking it
// actually goes somewhere, which a per-admin row here never could.
// Previously this function (then named notifyAdminsWA, from the old
// WhatsApp-era naming) ALSO wrote its own unlinked in-app row per admin
// on top of that — duplicating the notification and giving a dead click
// target. Same guard as before: skip entirely if the actor performing
// the action is themselves an admin.
function notifyAdminsTG(msg,link=''){
  if(!isAdmin())
    DB.team.filter(m=>isAdminMember(m)&&m.id!==CU?.id).forEach(m=>{
      notifyTG(m.id,'default',{desc:`🔔 *VAS Admin Alert*\n\n${msg}`,link:link||appLink('')});
    });
}
// Back-compat alias — every current call site is being updated to the new
// name alongside this change, but kept in case anything else still uses it.
const notifyAdminsWA=notifyAdminsTG;

// ══════════════════════════════════════════════════════
// NAVIGATION
// ══════════════════════════════════════════════════════
const PTITLES={dash:'Dashboard',mytasks:'My Tasks',todos:'My Todos',toreview:'To Review',alltasks:'All Tasks',projects:'Projects',meetings:'Meetings',svctest:'Service Tests',team:'Team',eval:'Team Evaluation',backlog:'Backlog',services:'Services',operators:'Operators',companies:'Companies',docs:'Documentation',archive:'Archive',settings:'Settings',syslog:'System Log'};
const PACTIONS={dash:'newTask',mytasks:'',todos:'newTodo',toreview:'',alltasks:'newTask',projects:'newProject',meetings:'newMeeting',svctest:'newTest',team:'newMember',eval:'',backlog:'newIdea',services:'newService',operators:'newOperator',companies:'newCompany',docs:'newDoc',archive:'',settings:'',syslog:''};
const BTNLBLS={newTask:'+ New Task',newMember:'+ Add Member',newIdea:'+ New Idea',newService:'+ Add Service',newOperator:'+ Add Operator',newCompany:'+ Add Company',newDoc:'+ New Doc',newTodo:'+ Add Todo',newProject:'+ New Project',newMeeting:'+ New Meeting'};

function nav(p,el,f=null){
  page=p; _editId=null; window._navF=f;
  const ptEl=document.getElementById('page-title-display');
  if(ptEl) ptEl.textContent=PTITLES[p]||p;
  buildAlertStrip();
  document.querySelectorAll('.ni').forEach(n=>n.classList.remove('on'));
  if(el)el.classList.add('on');
  document.getElementById('tb-t').textContent=PTITLES[p]||p;
  const a=PACTIONS[p]; const btn=document.getElementById('tb-btn');
  if(a&&BTNLBLS[a]){btn.style.display='inline-flex';btn.textContent=BTNLBLS[a];}else btn.style.display='none';
  closeND(); closeSP();
  window._renders=window._renders||{}; const renders=window._renders={dash:rDash,mytasks:rMyTasks,todos:rTodos,toreview:rToReview,alltasks:rAllTasks,projects:rProjects,team:rTeam,eval:rEval,backlog:rBacklog,services:rServices,operators:rOperators,companies:rCompanies,docs:rDocs,archive:rArchive,meetings:rMeetings,moutcomes:rMeetingOutcomes,svctest:rSvcTest,settings:rSettings,syslog:rSyslog,helprequests:rHelpRequests,reminders:rReminders,hrcoms:rHrComs,announcements:rAnnouncements,reports:rReports,library:rLibrary,comments:rComments};
  const c=document.getElementById('content'); c.innerHTML='';
  if(renders[p])renders[p](c);
}

function tbAct(){
  const fns={
    newTask:()=>openTaskModal(null),
    newMember:()=>openMemberModal(null),
    newIdea:()=>OM('m-bl'),
    newService:()=>openSvcModal(null),
    newOperator:()=>openOperatorModal(null),
    newCompany:()=>openCompanyModal(null),
    newDoc:()=>openDocModal(null),
    newTodo:()=>openTodoModal(null),newProject:()=>openProjectModal(null),newMeeting:()=>openMeetingModal(null),
  };
  const a=PACTIONS[page]; if(fns[a])fns[a]();
}

function navTo(p,f=null){const el=document.querySelector(`[data-p="${p}"]`);nav(p,el,f);}

// ══════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════
const mn=(id)=>DB.team.find(m=>m.id===id)?.name||id||'—';
const sn=(id)=>DB.services.find(s=>s.id===id)?.name||'—';
const opn=(id)=>[...DB.operators,...DB.companies].find(o=>o.id===id)?.name||'—';

function spill(s){const m={New:'sn','In Progress':'sp','Pending Help':'sh','Pending Review':'sr',Done:'sd',Rejected:'sj','On Hold':'sh',Cancelled:'sc','To Do':'sn'};return`<span class="pill ${m[s]||'sn'}">${s}</span>`;}
function ppill(p){const m={Critical:'pc',High:'ph',Medium:'pm',Low:'pl'};return`<span class="${m[p]||'pl'}">${p||'—'}</span>`;}

function donut(data,size=88){
  const total=data.reduce((s,d)=>s+d.v,0);if(!total)return'<div style="font-size:11px;color:var(--tx3)">No data yet</div>';
  const r=size/2-7,cx=size/2,cy=size/2,c=2*Math.PI*r;
  let paths='',offset=0;
  data.forEach(d=>{const pct=d.v/total,dash=pct*c,gap=c-dash;
    paths+=`<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${d.color}" stroke-width="11" stroke-dasharray="${dash} ${gap}" stroke-dashoffset="${-(offset*c)}" transform="rotate(-90 ${cx} ${cy})"/>`;offset+=pct;});
  return`<div class="donut-w"><svg width="${size}" height="${size}" style="flex-shrink:0">${paths}<text x="${cx}" y="${cy+5}" text-anchor="middle" font-size="14" font-weight="800" fill="var(--tx)" font-family="var(--fn)">${total}</text></svg>
  <div class="dlgd">${data.map(d=>`<div class="dlr"><div class="dldot" style="background:${d.color}"></div><span>${d.label}</span><strong style="margin-left:auto;padding-left:8px">${d.v}</strong></div>`).join('')}</div></div>`;
}

// Delete modal
function confirmDel(msg,cb){document.getElementById('del-msg').textContent=msg;_delCb=cb;OM('m-del');}
function doDelete(){CM('m-del');if(_delCb)_delCb();_delCb=null;}
const TABLE_MAP={tasks:'tasks',team:'team',services:'services',operators:'companies',companies:'companies',backlog:'backlog',docs:'docs',archive:'archive',todos:'todos',projects:'projects'};
function delItem(col,id,name){
  confirmDel(`Delete "${name}"? This cannot be undone.`,async()=>{
    // Capture task details before removal — the row is about to be gone
    // from DB.tasks, so this is the only chance to know who to notify.
    const deletedTask=col==='tasks'?DB.tasks.find(x=>x.id===id):null;
    DB[col]=DB[col].filter(x=>x.id!==id);
    sbDelete(TABLE_MAP[col]||col, id);
    logAction('Delete',`Deleted ${col}: ${name}`,'Warning',name,'');
    toast(`"${name}" deleted`,'ok');
    if(deletedTask){
      // No meta/link here — the task no longer exists, so there's
      // nowhere for a click to go. clickNotif already handles a missing
      // task gracefully ("it may have been deleted") for exactly this case.
      const recipientIds=[deletedTask.assignedTo,deletedTask.reviewer,...(deletedTask.assignees||[])]
        .filter((v,i,a)=>v&&a.indexOf(v)===i&&v!==CU?.id);
      recipientIds.forEach(uid=>{
        const m=DB.team.find(x=>x.id===uid);
        if(m){
          sendNotif(m.name,`${CU.name} deleted the task "${name}"`,'Task Deleted','');
          notifyTG(m.id,'default',{desc:`🗑 *Task Deleted*\n\n${CU.name} deleted "${name}"`,link:''});
        }
      });
      notifyAdmins(`${CU.name} deleted task "${name}"`,'Task Deleted','');
      notifyAdminsTG(`🗑 Task Deleted\n\n${CU.name} deleted "${name}"`,'');
    }
    nav(page, document.querySelector('.ni.on'));
  });
}

// ══════════════════════════════════════════════════════
// DASHBOARD
// ══════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════
// ALERT STRIP — today & tomorrow warnings
// ══════════════════════════════════════════════════════
function buildAlertStrip(){
  const strip=document.getElementById('alert-strip');
  if(!strip||!CU)return;

  const todayStr=new Date().toISOString().split('T')[0];
  const tomorrowDate=new Date(); tomorrowDate.setDate(tomorrowDate.getDate()+1);
  const tomorrowStr=tomorrowDate.toISOString().split('T')[0];
  const todayDow=new Date().getDay();
  const tomorrowDow=tomorrowDate.getDay();

  const alerts=[];

  // Today's meetings (I'm invited or created)
  const todayMeetings=DB.meetings.filter(m=>
    m.meeting_date===todayStr && m.status==='Scheduled' &&
    (m.created_by===CU.name||m.invitees?.includes(CU.name)||isAdmin())
  );
  if(todayMeetings.length){
    alerts.push({type:'meeting',color:'#2563eb',bg:'#eff4ff',icon:'📅',
      text:`Today: ${todayMeetings.length} meeting${todayMeetings.length>1?'s':''} — ${todayMeetings.map(m=>m.title+' at '+m.meeting_time).join(', ')}`,
      onclick:`nav('meetings',document.querySelector('[data-p="meetings"]'))`
    });
  }

  // Today's tests
  const myTodayScheds=DB.testSchedules.filter(s=>
    s.day_of_week===todayDow && s.active!==false &&
    (s.member_id===CU.id||isAdmin())
  );
  const todayTestsDone=DB.testSessions.filter(s=>s.test_date===todayStr&&s.status==='Completed');
  const todayTestsPending=myTodayScheds.filter(sch=>
    !DB.testSessions.find(s=>s.test_date===todayStr&&(s.tester_id===sch.member_id)&&s.status==='Completed')
  );
  if(todayTestsPending.length){
    alerts.push({type:'test',color:'#7c3aed',bg:'#f5f3ff',icon:'🧪',
      text:`Today: ${todayTestsPending.length} service test${todayTestsPending.length>1?'s':''} scheduled`,
      onclick:`nav('svctest',document.querySelector('[data-p="svctest"]'))`
    });
  }

  // Tomorrow's meetings
  const tomorrowMeetings=DB.meetings.filter(m=>
    m.meeting_date===tomorrowStr && m.status==='Scheduled' &&
    (m.created_by===CU.name||m.invitees?.includes(CU.name)||isAdmin())
  );
  if(tomorrowMeetings.length){
    alerts.push({type:'meeting-tmr',color:'#0891b2',bg:'#ecfeff',icon:'📆',
      text:`Tomorrow: ${tomorrowMeetings.length} meeting${tomorrowMeetings.length>1?'s':''} — ${tomorrowMeetings.map(m=>m.title).join(', ')}`,
      onclick:`nav('meetings',document.querySelector('[data-p="meetings"]'))`
    });
  }

  // Tomorrow's tests
  const tomorrowScheds=DB.testSchedules.filter(s=>
    s.day_of_week===tomorrowDow && s.active!==false &&
    (s.member_id===CU.id||isAdmin())
  );
  if(tomorrowScheds.length){
    alerts.push({type:'test-tmr',color:'#6d28d9',bg:'#f5f3ff',icon:'🔔',
      text:`Tomorrow: ${tomorrowScheds.length} service test${tomorrowScheds.length>1?'s':''} coming up`,
      onclick:`nav('svctest',document.querySelector('[data-p="svctest"]'))`
    });
  }

  if(!alerts.length){strip.style.display='none';return;}

  strip.style.display='block';
  strip.innerHTML=alerts.map((a,i)=>`
    <div data-ai="${i}" style="background:${a.bg};border-bottom:2px solid ${a.color}22;padding:9px 16px;display:flex;align-items:center;gap:9px;cursor:pointer;transition:filter .15s" onmouseenter="this.style.filter='brightness(.96)'" onmouseleave="this.style.filter=''">
      <span style="font-size:15px;flex-shrink:0">${a.icon}</span>
      <span style="font-size:12px;font-weight:600;color:${a.color};flex:1;line-height:1.4">${a.text}</span>
      <span style="font-size:14px;color:${a.color};opacity:.7;font-weight:700">→</span>
    </div>`).join('');

  // Safe click binding — no nested quotes in HTML attributes
  strip.querySelectorAll('[data-ai]').forEach(el=>{
    const a=alerts[parseInt(el.dataset.ai)];
    el.addEventListener('click',()=>{
      const pageNav={
        'meeting':'meetings','meeting-tmr':'meetings',
        'test':'svctest','test-tmr':'svctest',
        'overdue':'alltasks','review':'toreview','todo':'todos'
      };
      const pg=pageNav[a.type]||'dash';
      const navEl=document.querySelector('[data-p="'+pg+'"]');
      if(navEl) nav(pg,navEl);
    });
  });
}


// ── Meeting attendance helper ─────────────────────────────────────────────
function getMeetingStats(memberName, periodDays=30){
  const cutoff=new Date(); cutoff.setDate(cutoff.getDate()-periodDays);
  // Completed meetings the member was invited to
  const invitedMeetings=DB.meetings.filter(m=>
    m.status==='Completed' &&
    new Date(m.meeting_date)>=cutoff &&
    (m.invitees||[]).some(n=>(n||'').toLowerCase()===(memberName||'').toLowerCase())
  );
  const attended=invitedMeetings.filter(m=>{
    const key=Object.keys(m.attendance||{}).find(k=>k.toLowerCase()===memberName.toLowerCase());
    return key && m.attendance[key]==='present';
  });
  const missed=invitedMeetings.filter(m=>{
    const key=Object.keys(m.attendance||{}).find(k=>k.toLowerCase()===memberName.toLowerCase());
    return key && m.attendance[key]==='absent';
  });
  // Upcoming meetings
  const todayStr=new Date().toISOString().split('T')[0];
  const upcoming=DB.meetings.filter(m=>
    m.status==='Scheduled' &&
    m.meeting_date>=todayStr &&
    (m.invitees||[]).some(n=>(n||'').toLowerCase()===(memberName||'').toLowerCase())
  );
  const rate=invitedMeetings.length?Math.round(attended.length/invitedMeetings.length*100):null;
  return{invited:invitedMeetings,attended,missed,upcoming,rate};
}
