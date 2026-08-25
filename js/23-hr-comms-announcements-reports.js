// §23 ── HR COMMS & ANNOUNCEMENTS ───────────────────────────────────────
function rHrComs(el){
  if(!canDo('hrComs')){el.innerHTML='<div class="empty"><div class="ei">🔒</div><div class="et">Access Restricted</div><div class="es">Your membership type does not include access to HR communications.</div></div>';return;}
  let tab=0;
  const tabs=isHR()||isAdmin()?['All Messages','My Messages']:['My Messages'];
  function render(t){
    tab=t;
    let list=DB.hrComs.filter(c=>canSeeHrCom(c));
    const isViewAll=(isHR()||isAdmin())&&t===0;
    if(!isViewAll) list=list.filter(c=>c.fromId===CU.id||c.fromName===CU.name);
    list=[...list].sort((a,b)=>new Date(b.at||0)-new Date(a.at||0));

    let h=`<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:8px">
      <div class="tabs" style="margin-bottom:0">
        ${tabs.map((lb,i)=>`<div class="tab ${i===t?'on':''}" style="font-size:13px;font-weight:700;${i===t?'color:var(--ac);border-bottom:3px solid var(--ac)':'color:var(--tx2)'}">${lb}</div>`).join('')}
      </div>
      <button class="btn bp bsm" onclick="openHrComModal()">+ New Message</button>
    </div>`;

    if(!list.length){
      h+=`<div class="empty"><div class="ei">💬</div><div class="et">No messages yet</div><div class="es">Send a confidential message to HR</div></div>`;
    } else {
      list.forEach(com=>{
        const sender=DB.team.find(m=>m.id===com.fromId||m.name===com.fromName);
        const unread=!com.readByHR&&(isHR()||isAdmin());
        const statusCol={Pending:'#94a3b8',Accepted:'#15803d',Rejected:'#dc2626',Replied:'#2563eb','In Review':'#b45309'}[com.status]||'#94a3b8';
        h+=`<div style="background:var(--s);border:1px solid ${unread?'var(--ac)':'var(--bd)'};border-radius:12px;padding:14px 16px;margin-bottom:10px${unread?';box-shadow:0 0 0 2px var(--ac)15':''}">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:10px">
            <div style="flex:1;min-width:0">
              <div style="font-size:14px;font-weight:800;color:var(--tx);margin-bottom:3px">${escapeHtml(com.title)}</div>
              <div style="display:flex;align-items:center;gap:7px;flex-wrap:wrap">
                ${sender?`<span style="display:inline-flex;align-items:center;gap:5px"><span style="width:18px;height:18px;border-radius:50%;background:${sender.color};display:inline-flex;align-items:center;justify-content:center;font-size:7px;color:#fff;font-weight:800">${sender.av}</span><span style="font-size:11px;font-weight:600;color:var(--tx2)">${sender.name}</span></span>`:''}
                <span style="font-size:10px;color:var(--tx3)">${fdt(com.at)}</span>
                ${unread?`<span style="background:var(--ac);color:#fff;font-size:9px;font-weight:800;padding:2px 7px;border-radius:20px">NEW</span>`:''}
              </div>
            </div>
            <span style="background:${statusCol}18;color:${statusCol};border:1px solid ${statusCol}30;font-size:10px;font-weight:800;padding:3px 9px;border-radius:20px;flex-shrink:0">${com.status}</span>
          </div>
          <div style="font-size:13px;color:var(--tx2);line-height:1.6;background:var(--s2);border-radius:8px;padding:10px 12px;margin-bottom:${com.replies?.length?'10px':'0'}">${escapeHtml(com.body)}</div>
          ${(com.replies||[]).map(r=>{
            const rSender=DB.team.find(m=>m.id===r.fromId||m.name===r.fromName);
            const rIsHr=rSender?.role?.toLowerCase().includes('hr')||rSender?.access==='HR'||isAdmin();
            return`<div style="margin-top:8px;padding:9px 12px;background:${rIsHr?'var(--al)':'var(--s2)'};border:1px solid ${rIsHr?'#bfdbfe':'var(--bd)'};border-radius:8px;border-left:3px solid ${rIsHr?'var(--ac)':'var(--bd)'}">
              <div style="display:flex;align-items:center;gap:7px;margin-bottom:5px">
                ${rSender?`<span style="width:16px;height:16px;border-radius:50%;background:${rSender.color};display:inline-flex;align-items:center;justify-content:center;font-size:6px;color:#fff;font-weight:800">${rSender.av}</span><span style="font-size:11px;font-weight:700;color:${rIsHr?'var(--ac)':'var(--tx)'}">${rSender.name}${rIsHr?' (HR)':''}</span>`:''}
                <span style="font-size:10px;color:var(--tx3);margin-left:auto">${fdt(r.at)}</span>
              </div>
              <div style="font-size:12px;color:var(--tx2);line-height:1.5">${escapeHtml(r.body)}</div>
            </div>`;
          }).join('')}
          <div style="display:flex;gap:7px;flex-wrap:wrap;margin-top:10px" onclick="event.stopPropagation()">
            ${isHR()||isAdmin()?`
              <button class="btn bg2 bsm" onclick="openHrReplyModal('${com.id}','reply')">💬 Reply</button>
              <button class="btn bk bsm" onclick="setHrComStatus('${com.id}','Accepted')">✓ Accept</button>
              <button class="btn bd2 bsm" onclick="setHrComStatus('${com.id}','Rejected')">✗ Reject</button>
              <button class="btn bg2 bsm" onclick="setHrComStatus('${com.id}','In Review')">🔍 In Review</button>
            `:''}
            ${(com.fromId===CU.id||com.fromName===CU.name)&&(isHR()||isAdmin())?'':(com.fromId===CU.id||com.fromName===CU.name)?`<button class="btn bg2 bsm" onclick="openHrReplyModal('${com.id}','followup')">↩ Follow Up</button>`:''}
            ${isAdmin()?`<button class="btn bd2 bsm" onclick="delHrCom('${com.id}')">🗑 Delete</button>`:''}
          </div>
        </div>`;
      });
    }
    el.innerHTML=h;
    el.querySelectorAll('.tab').forEach((tb,i)=>tb.onclick=()=>render(i));
    window.rr=()=>render(tab);
    // Mark unread as read for HR
    if(isHR()||isAdmin()){
      const unread=list.filter(c=>!c.readByHR);
      unread.forEach(c=>{c.readByHR=true; sbCommsUpdate('hr_communications',c.id,{read_by_hr:true});});
      if(unread.length)updateBadges();
    }
  }
  render(0);
}

window.openHrComModal=(comId,mode)=>{
  window._hrComId=comId||null;
  window._hrComMode=mode||'new';
  document.getElementById('m-hrcom-title').textContent=mode==='reply'?'💬 HR Reply':mode==='followup'?'↩ Follow Up':'💬 Send to HR';
  document.getElementById('hrcom-submit-btn').textContent=mode?'Send Reply':'Send to HR';
  document.getElementById('hrcom-title').value='';
  document.getElementById('hrcom-body').value='';
  const titleRow=document.getElementById('hrcom-title-row');
  if(titleRow)titleRow.style.display=mode?'none':'';
  OM('m-hrcom');
};
window.openHrReplyModal=(comId,mode)=>openHrComModal(comId,mode);

window.submitHrCom=async()=>{
  const title=document.getElementById('hrcom-title').value.trim();
  const body=document.getElementById('hrcom-body').value.trim();
  if(!body){toast('Write your message','bad');return;}
  const mode=window._hrComMode||'new';
  if(mode==='new'){
    if(!title){toast('Add a title','bad');return;}
    const row={id:'hrc'+gid(),from_id:CU.id,from_name:CU.name,title,body,status:'Pending',read_by_hr:false,member_read:false,replies:[],at:now()};
    const saved=await sbCommsInsert('hr_communications',row);
    if(!saved){toast('Failed to send — check connection','bad');return;}
    DB.hrComs=DB.hrComs||[];
    DB.hrComs.unshift({id:row.id,fromId:CU.id,fromName:CU.name,title,body,status:'Pending',readByHR:false,memberRead:false,replies:[],at:row.at});
    DB.team.filter(m=>m.role?.toLowerCase().includes('hr')||m.access==='HR').forEach(m=>{
      sendNotif(m.name,`${CU.name} sent an HR message: "${title}"`,'HR Message',title,false,{hrComId:row.id});
      notifyTG(m.id,'default',{desc:`💬 *New HR Communication*\n\nFrom: ${CU.name}\nTitle: "${title}"\n\n${body.slice(0,200)}`,link:appLink('hrcoms')});
    });
    // Also notify admins
    DB.team.filter(m=>isAdminMember(m)&&!m.role?.toLowerCase().includes('hr')).forEach(m=>{
      notifyTG(m.id,'default',{desc:`💬 *HR Message Received*\n\n${CU.name} sent an HR message: "${title}"`,link:appLink('hrcoms')});
    });
    toast('Message sent to HR ✓','ok');
  } else {
    const com=DB.hrComs.find(c=>c.id===window._hrComId);if(!com)return;
    com.replies=com.replies||[];
    com.replies.push({fromId:CU.id,fromName:CU.name,body,at:now()});
    if(isHR()||isAdmin())com.status='Replied';
    await sbCommsUpdate('hr_communications',com.id,{replies:com.replies,status:com.status,read_by_hr:true});
    if(com.fromId!==CU.id){
      const sender=DB.team.find(m=>m.id===com.fromId);
      if(sender){
        sendNotif(sender.name,`HR replied to your message: "${com.title}"`,'HR Reply',com.title,false,{hrComId:com.id});
        notifyTG(sender.id,'hr_reply',{title:com.title,link:appLink('hrcoms')});
      }
    }
    toast('Reply sent ✓','ok');
  }
  CM('m-hrcom'); updateBadges();
  if(window._renders?.hrcoms){const el=document.getElementById('content');if(el&&page==='hrcoms')rHrComs(el);}
};

window.setHrComStatus=async(comId,status)=>{
  const com=DB.hrComs.find(c=>c.id===comId);if(!com)return;
  com.status=status;
  await sbCommsUpdate('hr_communications',comId,{status,read_by_hr:true});
  const sender=DB.team.find(m=>m.id===com.fromId);
  if(sender){
    sendNotif(sender.name,`Your HR message "${com.title}" is now: ${status}`,'HR Update',com.title,false,{hrComId:com.id});
    notifyTG(sender.id,'hr_reply',{title:`Your HR message status updated to: ${status} — "${com.title}"`,link:appLink('hrcoms')});
  }
  toast(`Status updated to ${status}`,'ok');
  updateBadges();
  if(window._renders?.hrcoms){const el=document.getElementById('content');if(el&&page==='hrcoms')rHrComs(el);}
};

// ══════════════════════════════════════════════════════
// ANNOUNCEMENTS
// ══════════════════════════════════════════════════════
function rAnnouncements(el){
  if(!canDo('announcements')){el.innerHTML='<div class="empty"><div class="ei">🔒</div><div class="et">Access Restricted</div><div class="es">Your membership type does not include access to announcements.</div></div>';return;}
  const list=[...DB.announcements].sort((a,b)=>new Date(b.at||0)-new Date(a.at||0));
  const myList=list.filter(a=>a.audience==='all'||(a.audienceIds||[]).includes(CU.id)||(a.audienceIds||[]).includes(CU.name)||isAdmin()||isHR());
  const unread=myList.filter(a=>!(a.readBy||[]).includes(CU.id));
  const prioColor={Urgent:'#dc2626',Important:'#c2410c',Normal:'#2563eb'};
  const prioIcon={Urgent:'🚨',Important:'⚠️',Normal:'📢'};

  let h=`<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:8px">
    <div>
      <div style="font-size:16px;font-weight:800;color:var(--tx)">📢 Announcements</div>
      ${unread.length?`<div style="font-size:11px;color:var(--ac);font-weight:600">${unread.length} unread</div>`:''}
    </div>
    ${isAdmin()||isHR()?`<button class="btn bp bsm" onclick="openAnnouncementModal()">+ New Announcement</button>`:''}
  </div>`;

  if(!myList.length){
    h+=`<div class="empty"><div class="ei">📢</div><div class="et">No announcements yet</div></div>`;
  } else {
    myList.forEach(a=>{
      const isUnread=!(a.readBy||[]).includes(CU.id);
      const author=DB.team.find(m=>m.id===a.fromId||m.name===a.fromName);
      const col=prioColor[a.priority]||'#2563eb';
      h+=`<div onclick="markAnnRead('${a.id}')" style="background:var(--s);border:1px solid ${isUnread?col:'var(--bd)'};border-left:4px solid ${col};border-radius:12px;padding:14px 16px;margin-bottom:10px;cursor:pointer${isUnread?';box-shadow:0 0 0 2px '+col+'18':''}">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:8px">
          <div style="flex:1;min-width:0">
            <div style="display:flex;align-items:center;gap:7px;margin-bottom:4px;flex-wrap:wrap">
              <span style="font-size:14px">${prioIcon[a.priority]||'📢'}</span>
              <span style="font-size:14px;font-weight:800;color:var(--tx)">${escapeHtml(a.title)}</span>
              ${isUnread?`<span style="background:${col};color:#fff;font-size:9px;font-weight:800;padding:2px 7px;border-radius:20px">NEW</span>`:''}
            </div>
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
              ${author?`<span style="display:inline-flex;align-items:center;gap:4px"><span style="width:16px;height:16px;border-radius:50%;background:${author.color};display:inline-flex;align-items:center;justify-content:center;font-size:6px;color:#fff;font-weight:800">${author.av}</span><span style="font-size:11px;color:var(--tx2);font-weight:600">${author.name}</span></span>`:''}
              <span style="font-size:10px;color:var(--tx3)">${fdt(a.at)}</span>
              <span style="background:${col}15;color:${col};font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px">${a.priority}</span>
              <span style="font-size:10px;color:var(--tx3)">${a.audience==='all'?'👥 Everyone':`👤 ${(a.audienceNames||[]).join(', ')}`}</span>
            </div>
          </div>
          ${isAdmin()||isHR()?`<div onclick="event.stopPropagation();delAnnouncement('${a.id}')" style="color:var(--tx3);cursor:pointer;font-size:12px;padding:4px;border-radius:5px" title="Delete">🗑</div>`:''}
        </div>
        <div style="font-size:13px;color:var(--tx2);line-height:1.6;white-space:pre-wrap">${escapeHtml(a.body)}</div>
        <div style="font-size:10px;color:var(--tx3);margin-top:8px">${(a.readBy||[]).length} member${(a.readBy||[]).length!==1?'s':''} read</div>
      </div>`;
    });
  }
  el.innerHTML=h;
  // Mark all visible as read
  const toMark=myList.filter(a=>!(a.readBy||[]).includes(CU.id));
  toMark.forEach(a=>{a.readBy=a.readBy||[];a.readBy.push(CU.id);sbCommsUpdate('announcements',a.id,{read_by:a.readBy});});
  if(toMark.length)updateBadges();
}

window.openAnnouncementModal=()=>{
  const list=document.getElementById('ann-audience-list');
  if(list) list.innerHTML=DB.team.map(m=>`
    <label style="display:flex;align-items:center;gap:8px;padding:5px 0;cursor:pointer;font-size:12px;font-weight:600">
      <input type="checkbox" value="${m.id}" style="width:15px;height:15px;cursor:pointer">
      <span style="width:22px;height:22px;border-radius:50%;background:${m.color};display:inline-flex;align-items:center;justify-content:center;font-size:8px;color:#fff;font-weight:800;flex-shrink:0">${m.av}</span>
      ${m.name} <span style="color:var(--tx3);font-weight:400;font-size:11px">${m.role||''}</span>
    </label>`).join('');
  document.getElementById('ann-title').value='';
  document.getElementById('ann-body').value='';
  document.getElementById('ann-priority').value='Normal';
  OM('m-ann');
};
window.submitAnnouncement=async()=>{
  const title=document.getElementById('ann-title').value.trim();
  const body=document.getElementById('ann-body').value.trim();
  const priority=document.getElementById('ann-priority').value;
  if(!title||!body){toast('Title and message are required','bad');return;}
  const checked=[...document.querySelectorAll('#ann-audience-list input[type=checkbox]:checked')].map(cb=>cb.value);
  const isAll=checked.length===0;
  const audienceIds=isAll?[]:checked;
  const audienceNames=isAll?[]:checked.map(id=>DB.team.find(m=>m.id===id)?.name||id);
  const row={id:'ann'+gid(),from_id:CU.id,from_name:CU.name,title,body,priority,audience:isAll?'all':'specific',audience_ids:audienceIds,audience_names:audienceNames,read_by:[],at:now()};
  const saved=await sbCommsInsert('announcements',row);
  if(!saved){toast('Failed to publish — check connection','bad');return;}
  DB.announcements=DB.announcements||[];
  DB.announcements.unshift({id:row.id,fromId:CU.id,fromName:CU.name,title,body,priority,audience:row.audience,audienceIds,audienceNames,readBy:[],at:row.at});
  logAction('Announcement Posted',`${CU.name} posted "${title}" (${priority}) to ${row.audience==='all'?'everyone':audienceNames.join(', ')||'selected members'}`,'Info',title,'',{memberName:CU.name});
  const recipients=isAll?DB.team:DB.team.filter(m=>audienceIds.includes(m.id));
  recipients.filter(m=>m.id!==CU.id).forEach(m=>{
    sendNotif(m.name,`New ${priority} announcement: "${title}"`,`${priority} Announcement`,title,false,{annId:row.id});
    notifyTG(m.id,'announcement',{title,desc:body.slice(0,300),link:appLink('announcements')});
  });
  CM('m-ann'); toast(`Announcement published to ${isAll?'everyone':audienceNames.join(', ')} ✓`,'ok');
  updateBadges();
  const el=document.getElementById('content'); if(el&&page==='announcements')rAnnouncements(el);
};
window.markAnnRead=async(id)=>{
  const a=DB.announcements.find(x=>x.id===id);if(!a)return;
  a.readBy=a.readBy||[];
  if(!a.readBy.includes(CU.id)){
    a.readBy.push(CU.id);
    await sbCommsUpdate('announcements',id,{read_by:a.readBy});
    updateBadges();
  }
};
window.delAnnouncement=async(id)=>{
  if(!confirm('Delete this announcement?'))return;
  DB.announcements=DB.announcements.filter(a=>a.id!==id);
  await sbCommsDelete('announcements',id);
  updateBadges();
  const el=document.getElementById('content');if(el&&page==='announcements')rAnnouncements(el);
};




// ══════════════════════════════════════════════════════
// REPORTS MODULE (Admin only)
// ══════════════════════════════════════════════════════
function rReports(el){
  if(!isAdmin()){el.innerHTML='<div class="empty"><div class="ei">🔒</div><div class="et">Admin only</div></div>';return;}
  const getPeriodRange=(period)=>{
    const now=new Date(),y=now.getFullYear(),m=now.getMonth();
    return{today:{label:'Today',from:new Date(now.toDateString()),to:now},
      week:{label:'Last 7 Days',from:new Date(now-6*864e5),to:now},
      month:{label:now.toLocaleString('default',{month:'long',year:'numeric'}),from:new Date(y,m,1),to:now},
      q1:{label:'Q1 (Jan–Mar)',from:new Date(y,0,1),to:new Date(y,2,31,23,59,59)},
      q2:{label:'Q2 (Apr–Jun)',from:new Date(y,3,1),to:new Date(y,5,30,23,59,59)},
      q3:{label:'Q3 (Jul–Sep)',from:new Date(y,6,1),to:new Date(y,8,30,23,59,59)},
      q4:{label:'Q4 (Oct–Dec)',from:new Date(y,9,1),to:new Date(y,11,31,23,59,59)},
      year:{label:'Year '+y,from:new Date(y,0,1),to:now},
      all:{label:'All Time',from:new Date(0),to:now}
    }[period]||{label:'All Time',from:new Date(0),to:now};
  };
  const inR=(ts,f,t)=>{if(!ts)return false;const d=new Date(ts);return d>=f&&d<=t;};
  const ST=(t)=>`<div style="font-size:11px;font-weight:800;color:var(--tx);text-transform:uppercase;letter-spacing:.07em;margin:18px 0 10px;padding-bottom:8px;border-bottom:2px solid var(--bd)">${t}</div>`;

  let period=el._repPeriod||'month';
  const {label,from,to}=getPeriodRange(period);

  const tasks=DB.tasks.filter(t=>inR(t.tsCreated,from,to));
  const doneTasks=DB.tasks.filter(t=>t.status==='Done'&&inR(t.tsReviewed,from,to));
  const activeTasks=DB.tasks.filter(t=>!['Done','Cancelled'].includes(t.status));
  const meetings=DB.meetings.filter(m=>inR(m.meeting_date,from,to));
  const completedMeetings=meetings.filter(m=>m.status==='Completed');
  const testSessions=DB.testSessions.filter(s=>inR(s.test_date,from,to));
  const totalHours=Math.round(doneTasks.reduce((s,t)=>s+(t.actual||0),0)*10)/10;
  const estHours=Math.round(doneTasks.reduce((s,t)=>s+(t.est||0),0)*10)/10;
  const variance=estHours>0?Math.round((totalHours-estHours)/estHours*100):null;
  const avgCycle=(()=>{const ct=doneTasks.filter(t=>t.cycleH);return ct.length?Math.round(ct.reduce((s,t)=>s+t.cycleH,0)/ct.length*10)/10:null;})();
  const overdueList=activeTasks.filter(t=>getDueStatus(t).key==='overdue');
  const rejCount=tasks.filter(t=>t.status==='Rejected'||(t.rejections||[]).length>0).length;

  let h=`<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:16px">
    <div><div style="font-size:20px;font-weight:800">📊 Reports</div><div style="font-size:12px;color:var(--tx3)">Admin analytics — ${label}</div></div>
    <div style="display:flex;gap:5px;flex-wrap:wrap">
      ${['today','week','month','q1','q2','q3','q4','year','all'].map(p=>`<button onclick="document.getElementById('content')._repPeriod='${p}';rReports(document.getElementById('content'))" style="padding:5px 11px;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;border:1px solid ${period===p?'var(--ac)':'var(--bd)'};background:${period===p?'var(--ac)':'var(--s2)'};color:${period===p?'#fff':'var(--tx2)'}">
        ${{today:'Today',week:'7d',month:'Month',q1:'Q1',q2:'Q2',q3:'Q3',q4:'Q4',year:'Year',all:'All'}[p]}</button>`).join('')}
    </div>
  </div>`;

  // ── 1. Executive KPIs ─────────────────────────────────
  h+=ST('📋 Executive Summary');
  const kpis=[
    {l:'Tasks Created',v:tasks.length,c:'#2563eb',i:'📋'},
    {l:'Completed',v:doneTasks.length,c:'#15803d',i:'✅'},
    {l:'Completion Rate',v:tasks.length?Math.round(doneTasks.length/tasks.length*100)+'%':'—',c:'#7c3aed',i:'📈'},
    {l:'Active Tasks',v:activeTasks.length,c:'#ea580c',i:'⚡'},
    {l:'Overdue',v:overdueList.length,c:overdueList.length?'#dc2626':'#15803d',i:'⚠️'},
    {l:'Rejections',v:rejCount,c:rejCount?'#dc2626':'#64748b',i:'❌'},
    {l:'Hours Logged',v:totalHours+'h',c:'#0891b2',i:'⏱'},
    {l:'Avg Cycle Time',v:avgCycle?avgCycle+'h':'—',c:'#7c3aed',i:'🔄'},
    {l:'Est vs Actual',v:variance!==null?(variance>0?'+':'')+variance+'%':'—',c:variance===null?'#64748b':Math.abs(variance)<=20?'#15803d':Math.abs(variance)<=50?'#d97706':'#dc2626',i:'📐'},
    {l:'Meetings Held',v:completedMeetings.length,c:'#2563eb',i:'📅'},
    {l:'Tests Done',v:testSessions.filter(s=>s.status==='Completed').length,c:'#15803d',i:'🧪'},
    {l:'Critical Tasks',v:tasks.filter(t=>t.priority==='Critical').length,c:'#be123c',i:'🚨'},
  ];
  h+=`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px;margin-bottom:4px">`;
  h+=kpis.map(({l,v,c,i})=>`<div style="background:var(--s);border:1px solid var(--bd);border-radius:10px;padding:13px;border-top:3px solid ${c}">
    <div style="font-size:16px;margin-bottom:4px">${i}</div>
    <div style="font-size:21px;font-weight:800;color:${c};line-height:1;margin-bottom:4px">${v}</div>
    <div style="font-size:10px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.04em">${l}</div>
  </div>`).join('');
  h+=`</div>`;

  // ── 2. Status + Priority breakdown ───────────────────
  h+=ST('📊 Task Breakdown');
  const statusColors={'New':'#94a3b8','In Progress':'#2563eb','Pending Help':'#ea580c','Pending Review':'#7c3aed','Done':'#15803d','Rejected':'#dc2626','On Hold':'#ca8a04','Cancelled':'#64748b'};
  const prioColors={'Critical':'#be123c','High':'#c2410c','Medium':'#b45309','Low':'#15803d'};
  h+=`<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
    <div class="card"><div style="font-size:11px;font-weight:800;color:var(--tx3);text-transform:uppercase;margin-bottom:10px">By Status (all time)</div>
      ${Object.entries(statusColors).map(([s,c])=>{const n=DB.tasks.filter(t=>t.status===s).length;if(!n)return'';const pct=DB.tasks.length?Math.round(n/DB.tasks.length*100):0;
      return`<div style="display:flex;align-items:center;gap:8px;margin-bottom:7px">
        <span style="font-size:10px;font-weight:700;color:${c};min-width:95px">${s}</span>
        <div style="flex:1;height:6px;background:${c}20;border-radius:3px"><div style="height:100%;width:${pct}%;background:${c};border-radius:3px"></div></div>
        <span style="font-size:11px;font-weight:800;color:${c};min-width:24px;text-align:right">${n}</span>
      </div>`;}).join('')}
    </div>
    <div class="card"><div style="font-size:11px;font-weight:800;color:var(--tx3);text-transform:uppercase;margin-bottom:10px">By Priority — ${label}</div>
      ${Object.entries(prioColors).map(([p,c])=>{const n=tasks.filter(t=>t.priority===p).length;if(!n)return'';const pct=tasks.length?Math.round(n/tasks.length*100):0;
      return`<div style="display:flex;align-items:center;gap:8px;margin-bottom:7px">
        <span style="font-size:10px;font-weight:700;color:${c};min-width:65px">${p}</span>
        <div style="flex:1;height:6px;background:${c}20;border-radius:3px"><div style="height:100%;width:${pct}%;background:${c};border-radius:3px"></div></div>
        <span style="font-size:11px;font-weight:800;color:${c};min-width:24px;text-align:right">${n}</span>
      </div>`;}).join('')}
    </div>
  </div>`;

  // ── 3. Team Performance table ─────────────────────────
  h+=ST('👥 Team Performance — '+label);
  const memberStats=DB.team.filter(m=>m.access!=='Admin'&&!FULL.includes(m.name)).map(m=>{
    const mt=DB.tasks.filter(t=>inR(t.tsCreated,from,to)&&(t.assignedTo===m.id||(t.assignees||[]).includes(m.id)));
    const done=mt.filter(t=>t.status==='Done').length;
    const ov=DB.tasks.filter(t=>t.assignedTo===m.id&&getDueStatus(t).key==='overdue').length;
    const rej=mt.filter(t=>(t.rejections||[]).length>0).length;
    const wh=Math.round(mt.reduce((s,t)=>s+(t.actual||0),0)*10)/10;
    const cr=mt.length?Math.round(done/mt.length*100):0;
    // 7-day spark
    const spark=[0,1,2,3,4,5,6].map(i=>{const d=new Date(to);d.setDate(d.getDate()-(6-i));const ds=d.toISOString().split('T')[0];return DB.tasks.filter(t=>t.status==='Done'&&t.assignedTo===m.id&&t.tsReviewed?.slice(0,10)===ds).length;});
    const mx=Math.max(...spark,1);
    const sparkSvg=`<svg width="55" height="18" viewBox="0 0 55 18"><polyline points="${spark.map((v,i)=>`${i*9},${18-Math.round(v/mx*16)}`).join(' ')}" fill="none" stroke="${cr>=70?'#15803d':cr>=40?'#d97706':'#dc2626'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    return{m,total:mt.length,done,ov,rej,wh,cr,sparkSvg};
  }).filter(x=>x.total>0||x.ov>0).sort((a,b)=>b.cr-a.cr||b.done-a.done);

  h+=`<div class="card"><div class="tw"><table><thead><tr>
    <th>Member</th><th>Role</th><th>Tasks</th><th>Done</th><th>Rate</th><th>Overdue</th><th>Rejected</th><th>Hours</th><th style="min-width:60px">7-Day Trend</th>
  </tr></thead><tbody>`;
  memberStats.forEach(({m,total,done,ov,rej,wh,cr,sparkSvg})=>{
    const c=cr>=70?'#15803d':cr>=40?'#d97706':'#dc2626';
    h+=`<tr class="cl" onclick="window._navMember='${m.id}';navTo('alltasks')">
      <td><span style="display:inline-flex;align-items:center;gap:6px"><span style="width:20px;height:20px;border-radius:50%;background:${m.color};display:inline-flex;align-items:center;justify-content:center;font-size:7px;color:#fff;font-weight:800">${m.av}</span><span style="font-size:12px;font-weight:700">${m.name}</span></span></td>
      <td style="font-size:11px;color:var(--tx3)">${m.role||'—'}</td>
      <td style="font-weight:700">${total}</td>
      <td style="font-weight:700;color:#15803d">${done}</td>
      <td><div style="display:flex;align-items:center;gap:5px"><div style="width:40px;height:5px;background:var(--bd);border-radius:3px;overflow:hidden"><div style="height:100%;width:${cr}%;background:${c}"></div></div><span style="font-size:11px;font-weight:800;color:${c}">${cr}%</span></div></td>
      <td style="font-weight:700;color:${ov?'#dc2626':'var(--tx3)'}">${ov||'—'}</td>
      <td style="font-weight:700;color:${rej?'#dc2626':'var(--tx3)'}">${rej||'—'}</td>
      <td style="color:#0891b2;font-weight:700">${wh?wh+'h':'—'}</td>
      <td>${sparkSvg}</td>
    </tr>`;
  });
  h+=`</tbody></table></div></div>`;

  // ── 4. Service Performance ────────────────────────────
  const svcStats=DB.services.map(s=>{
    const st=tasks.filter(t=>t.service===s.id);
    const done=st.filter(t=>t.status==='Done').length;
    const active=st.filter(t=>!['Done','Cancelled'].includes(t.status)).length;
    const ov=st.filter(t=>getDueStatus(t).key==='overdue').length;
    return{s,total:st.length,done,active,ov};
  }).filter(x=>x.total>0).sort((a,b)=>b.total-a.total);
  if(svcStats.length){
    h+=ST('📡 Service Performance — '+label);
    h+=`<div class="card"><div class="tw"><table><thead><tr><th>Service</th><th>Operator</th><th>Status</th><th>Tasks</th><th>Done</th><th>Active</th><th>Overdue</th></tr></thead><tbody>`;
    svcStats.forEach(({s,total,done,active,ov})=>{
      const c={Live:'#15803d','In Development':'#2563eb',Paused:'#ca8a04',Deprecated:'#dc2626'}[s.status]||'#64748b';
      h+=`<tr class="cl" onclick="openSvcDetail('${s.id}')">
        <td style="font-size:12px;font-weight:700">${s.name}</td>
        <td style="font-size:11px;color:var(--tx2)">${s.operator_name||'—'}</td>
        <td><span style="background:${c}18;color:${c};font-size:9px;font-weight:700;padding:2px 7px;border-radius:20px">${s.status}</span></td>
        <td style="font-weight:700">${total}</td>
        <td style="color:#15803d;font-weight:700">${done}</td>
        <td style="color:#2563eb;font-weight:700">${active}</td>
        <td style="color:${ov?'#dc2626':'var(--tx3)'};font-weight:700">${ov||'—'}</td>
      </tr>`;
    });
    h+=`</tbody></table></div></div>`;
  }

  // ── 5. Meetings ───────────────────────────────────────
  if(meetings.length){
    h+=ST('📅 Meetings — '+label);
    const avgDur=meetings.filter(m=>m.duration_minutes).length?Math.round(meetings.reduce((s,m)=>s+(m.duration_minutes||0),0)/meetings.filter(m=>m.duration_minutes).length):null;
    h+=`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px">
      ${[{l:'Total',v:meetings.length,c:'#2563eb',i:'📅'},{l:'Completed',v:completedMeetings.length,c:'#15803d',i:'✅'},{l:'Scheduled',v:meetings.filter(m=>m.status==='Scheduled').length,c:'#7c3aed',i:'📆'},{l:'Avg Duration',v:avgDur?avgDur+'min':'—',c:'#0891b2',i:'⏱'},{l:'Action Items',v:DB.tasks.filter(t=>t.type==='Meeting'&&inR(t.tsCreated,from,to)).length,c:'#ea580c',i:'📋'}]
      .map(({l,v,c,i})=>`<div style="background:var(--s);border:1px solid var(--bd);border-radius:10px;padding:12px;border-top:3px solid ${c}"><div style="font-size:16px;margin-bottom:4px">${i}</div><div style="font-size:20px;font-weight:800;color:${c};margin-bottom:3px">${v}</div><div style="font-size:10px;font-weight:700;color:var(--tx3);text-transform:uppercase">${l}</div></div>`).join('')}
    </div>`;
  }

  // ── 6. Overdue tasks ─────────────────────────────────
  if(overdueList.length){
    h+=ST('🚨 Overdue Tasks (immediate attention required)');
    h+=`<div class="card"><div class="tw"><table><thead><tr><th>Task</th><th>Assigned To</th><th>Priority</th><th>Due Date</th><th>Overdue By</th><th>Service</th></tr></thead><tbody>`;
    overdueList.slice(0,10).sort((a,b)=>new Date(a.due||0)-new Date(b.due||0)).forEach(t=>{
      const m=DB.team.find(x=>x.id===t.assignedTo);
      const days=t.due?Math.round((new Date()-new Date(t.due))/864e5):null;
      const svc=DB.services.find(s=>s.id===t.service);
      h+=`<tr class="cl" onclick="openTask('${t.id}')">
        <td style="font-size:12px;font-weight:700;color:#dc2626">${t.title}</td>
        <td>${m?`<span style="display:inline-flex;align-items:center;gap:5px"><span style="width:18px;height:18px;border-radius:50%;background:${m.color};display:inline-flex;align-items:center;justify-content:center;font-size:6px;color:#fff;font-weight:800">${m.av}</span>${m.name}</span>`:'—'}</td>
        <td>${ppill(t.priority)}</td>
        <td style="font-size:11px;font-weight:700;color:#dc2626">${t.due||'—'}</td>
        <td style="font-size:12px;font-weight:800;color:#dc2626">${days!==null?days+'d':'—'}</td>
        <td style="font-size:11px;color:var(--tx2)">${svc?.name||'—'}</td>
      </tr>`;
    });
    h+=`</tbody></table></div></div>`;
  }

  // ── 7. Service Tests ─────────────────────────────────
  if(testSessions.length){
    h+=ST('🧪 Service Tests — '+label);
    const passed=testSessions.reduce((s,t)=>s+(t.passed_checks||0),0);
    const failed=testSessions.reduce((s,t)=>s+(t.failed_checks||0),0);
    const total2=passed+failed;
    h+=`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px">
      ${[{l:'Sessions',v:testSessions.length,c:'#7c3aed',i:'🧪'},{l:'Completed',v:testSessions.filter(s=>s.status==='Completed').length,c:'#15803d',i:'✅'},{l:'Pass Rate',v:total2?Math.round(passed/total2*100)+'%':'—',c:total2&&passed/total2>=0.8?'#15803d':'#dc2626',i:'📊'},{l:'Total Checks',v:total2,c:'#2563eb',i:'☑'},{l:'Failed',v:failed,c:failed?'#dc2626':'#15803d',i:'❌'}]
      .map(({l,v,c,i})=>`<div style="background:var(--s);border:1px solid var(--bd);border-radius:10px;padding:12px;border-top:3px solid ${c}"><div style="font-size:16px;margin-bottom:4px">${i}</div><div style="font-size:20px;font-weight:800;color:${c};margin-bottom:3px">${v}</div><div style="font-size:10px;font-weight:700;color:var(--tx3);text-transform:uppercase">${l}</div></div>`).join('')}
    </div>`;
  }

  // Member report cards
  h+=`<div style="font-size:11px;font-weight:800;color:var(--tx);text-transform:uppercase;letter-spacing:.06em;margin:18px 0 10px;padding-bottom:6px;border-bottom:2px solid var(--bd)">👤 Individual Member Reports</div>`;
  h+=`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px;margin-bottom:18px">`;
  DB.team.filter(m=>m.access!=='Admin'&&!FULL.includes(m.name)).forEach(m=>{
    const mt=DB.tasks.filter(t=>t.assignedTo===m.id||(t.assignees||[]).includes(m.id));
    const done=mt.filter(t=>t.status==='Done').length;
    const active=mt.filter(t=>!['Done','Cancelled'].includes(t.status)).length;
    const ov=mt.filter(t=>getDueStatus(t).key==='overdue').length;
    const wh=Math.round(mt.reduce((s,t)=>s+(t.actual||0),0));
    const cr=mt.length?Math.round(done/mt.length*100):0;
    const cc=cr>=70?'#15803d':cr>=40?'#d97706':'#dc2626';
    const ll=m.lastLogin;
    const llStr=ll?(()=>{const ago=Math.round((Date.now()-new Date(ll))/60000);return ago<60?ago+'m ago':ago<1440?Math.round(ago/60)+'h ago':Math.round(ago/1440)+'d ago';})():'Never';
    h+=`<div style="background:var(--s);border:1px solid var(--bd);border-radius:11px;padding:14px">
      <div style="display:flex;align-items:center;gap:9px;margin-bottom:10px">
        <span style="width:34px;height:34px;border-radius:50%;background:${m.color};display:inline-flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;color:#fff;flex-shrink:0">${m.av}</span>
        <div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:800">${m.name}</div><div style="font-size:10px;color:var(--tx3)">${m.role||'Member'}</div></div>
        <div style="text-align:right"><div style="font-size:16px;font-weight:800;color:${cc}">${cr}%</div><div style="font-size:9px;color:${cc};font-weight:700">RATE</div></div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:5px;margin-bottom:9px">
        <div style="text-align:center;background:var(--s2);border-radius:7px;padding:6px"><div style="font-size:14px;font-weight:800;color:#2563eb">${active}</div><div style="font-size:9px;color:var(--tx3)">Active</div></div>
        <div style="text-align:center;background:var(--s2);border-radius:7px;padding:6px"><div style="font-size:14px;font-weight:800;color:#15803d">${done}</div><div style="font-size:9px;color:var(--tx3)">Done</div></div>
        <div style="text-align:center;background:${ov?'#fef2f2':'var(--s2)'};border-radius:7px;padding:6px"><div style="font-size:14px;font-weight:800;color:${ov?'#dc2626':'var(--tx3)'}">${ov}</div><div style="font-size:9px;color:var(--tx3)">Late</div></div>
      </div>
      <div style="font-size:10px;color:var(--tx3);margin-bottom:8px">⏱ ${wh}h · 🔐 ${llStr}</div>
      <div style="height:4px;background:var(--bd);border-radius:2px;margin-bottom:10px;overflow:hidden"><div style="height:100%;width:${cr}%;background:${cc};border-radius:2px"></div></div>
      <button onclick="openMemberReport('${m.id}')" style="width:100%;padding:7px;background:var(--ac);color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer">📋 View Full Report</button>
    </div>`;
  });
  h+=`</div>`;

  h+=`<div style="margin-top:4px;background:var(--s2);border:1px solid var(--bd);border-radius:10px;padding:12px 16px;display:flex;align-items:center;gap:10px;font-size:12px;color:var(--tx3)">
    <span>💡</span>System overview: <button onclick="window.print()" style="padding:3px 10px;background:var(--ac);color:#fff;border:none;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer">🖨 Export PDF</button> &nbsp; Member reports open in the side panel with their own export button.
  </div>`;
  el.innerHTML=h;
  el._repPeriod=period;
}

// ══════════════════════════════════════════════════════
// MEMBER REPORT — full individual report with all activity
// ══════════════════════════════════════════════════════
window.openMemberReport=(memberId)=>{
  const m=DB.team.find(x=>x.id===memberId);if(!m)return;
  const PERIODS={week:{label:'Last 7 Days',days:7},month:{label:'Last 30 Days',days:30},q:{label:'Last 3 Months',days:90},half:{label:'Last 6 Months',days:180},year:{label:'Last Year',days:365}};
  // Always open on the past week by default — that's the window people
  // actually want to see first when checking in on someone.
  const selPeriod='week';
  window.renderMemberReport=(mid,per)=>{ window._mrPeriod=per; openMemberReport(mid); };
  // Open in side panel with a loading placeholder, then render for real.
  openSP(`📋 ${m.name}'s Report`,'',`<div id="mr-body"></div>`);
  setTimeout(()=>openMemberReport_render(m,selPeriod,PERIODS),50);
};

// Internal: does actual render into sp-bd. Async because it needs to pull
// this specific member's notification history from Supabase — the local
// `notifs` array only ever holds notifications for whoever is currently
// logged in (the person viewing this report), never for the member being
// reported on, so whether THEY were actually notified — and whether they
// read it — has to be fetched fresh each time this report opens or the
// period is switched.
async function openMemberReport_render(m,period,PERIODS){
  const {label,days}=PERIODS[period];
  const from=new Date(Date.now()-days*864e5);
  const to=new Date();
  const inR=(ts)=>{if(!ts)return false;const d=new Date(ts);return d>=from&&d<=to;};

  const spLoading=document.getElementById('sp-bd');
  if(spLoading) spLoading.innerHTML='<div class="loading-sc" style="height:160px"><div class="loader"></div><div class="loading-tx">Loading report…</div></div>';

  try {
    await openMemberReport_renderInner(m,period,PERIODS,from,to,inR,label);
  } catch(e) {
    console.error('openMemberReport_render failed:', e);
    const sp=document.getElementById('sp-bd');
    if(sp) sp.innerHTML=`<div style="padding:20px;text-align:center">
      <button onclick="closeSP()" style="padding:6px 12px;background:var(--s2);border:1px solid var(--bd);border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;margin-bottom:16px">← Back</button>
      <div style="font-size:14px;font-weight:700;color:var(--r);margin-top:10px">Couldn't build this report</div>
      <div style="font-size:12px;color:var(--tx3);margin-top:6px">Something in ${escapeHtml(m?.name||'this member')}'s activity data caused an error. Check the browser console for details, or try a shorter period.</div>
    </div>`;
  }
}

async function openMemberReport_renderInner(m,period,PERIODS,from,to,inR,label){
  let memberNotifs=[];
  try{
    const rows=await sbQ('notifications', `to_name=eq.${encodeURIComponent(m.name)}&created_at=gte.${from.toISOString()}&order=created_at.desc&limit=150`);
    if(Array.isArray(rows)) memberNotifs=rows.map(r=>({
      id:r.id, type:r.type||'Mention', message:r.message||'', taskTitle:r.task_title||'',
      linkType:r.link_type||null, linkId:r.link_id||null,
      at:r.created_at, read:Array.isArray(r.read_by)&&r.read_by.includes(m.name)
    }));
  }catch(e){ console.warn('member report notification fetch failed',e); }
  const notifsRead=memberNotifs.filter(n=>n.read).length;
  const NOTIF_ICONS={'Task Assigned':'📬','Task Started':'▶️','Task Submitted':'📤','Task Approved':'✅','Task Rejected':'🔴','Review Needed':'🔍','Status Changed':'🔄','Re-Estimate':'⏱','Mention':'💬','Comment':'💬','Reminder':'🔔','Help Request':'🤝','Help Accepted':'✅','Meeting Created':'📅','Meeting Started':'🔔','Meeting Ended':'✅','Meeting Cancelled':'❌','Meeting Rescheduled':'📆','Service Test Completed':'🧪'};

  const myTasks=DB.tasks.filter(t=>t.assignedTo===m.id||(t.assignees||[]).includes(m.id));
  const periodTasks=myTasks.filter(t=>inR(t.tsCreated));
  const periodDone=myTasks.filter(t=>t.status==='Done'&&inR(t.tsReviewed));
  const periodStarted=myTasks.filter(t=>inR(t.tsStarted));
  const periodSubmitted=myTasks.filter(t=>inR(t.tsSubmitted));
  const overdueNow=myTasks.filter(t=>getDueStatus(t).key==='overdue');
  const rejectedP=myTasks.filter(t=>(t.rejections||[]).length>0&&inR(t.tsCreated));
  const workHours=Math.round(periodDone.reduce((s,t)=>s+(t.actual||0),0)*10)/10;
  const estHours=Math.round(periodDone.reduce((s,t)=>s+(t.est||0),0)*10)/10;
  const variance=estHours>0?Math.round((workHours-estHours)/estHours*100):null;
  const avgCycle=(()=>{const ct=periodDone.filter(t=>t.cycleH);return ct.length?Math.round(ct.reduce((s,t)=>s+t.cycleH,0)/ct.length*10)/10:null;})();
  const reviewedByMe=DB.tasks.filter(t=>t.reviewer===m.id&&t.status==='Done'&&inR(t.tsReviewed));
  const rejectedByMe=DB.tasks.filter(t=>t.reviewer===m.id&&(t.rejections||[]).some(r=>inR(r?.at)));
  const myMeetings=DB.meetings.filter(mt=>inR(mt.meeting_date)&&((mt.invitees||[]).some(n=>(n||'').toLowerCase()===m.name.toLowerCase())||mt.created_by===m.name));
  const helpGiven=DB.tasks.filter(t=>t.type==='Help Request'&&t.assignedTo===m.id&&inR(t.tsCreated));
  const helpRequested=DB.tasks.filter(t=>t.type==='Help Request'&&t.reqBy===m.name&&inR(t.tsCreated));
  const remSent=(DB.reminders||[]).filter(r=>(r.fromId===m.id||r.fromName===m.name)&&inR(r.at));
  const remReceived=(DB.reminders||[]).filter(r=>(r.toId===m.id||r.toName===m.name)&&inR(r.at));
  const hrComs=(DB.hrComs||[]).filter(c=>(c.fromId===m.id||c.fromName===m.name)&&inR(c.at));
  const reests=myTasks.reduce((arr,t)=>{(t.reEstimates||[]).filter(r=>inR(r.at)).forEach(r=>arr.push({...r,taskTitle:t.title}));return arr;},[]);
  const loginEvents=syslog.filter(e=>e.action==='Login'&&e.actor===m.name&&inR(e.at));
  const periodTasksDoneNow=periodTasks.filter(t=>t.status==='Done').length;
  const cr=periodTasks.length?Math.round(periodTasksDoneNow/periodTasks.length*100):null;
  const crCol=cr===null?'#64748b':cr>=70?'#15803d':cr>=40?'#d97706':'#dc2626';

  const SP=(t)=>`<div style="font-size:11px;font-weight:800;color:var(--tx);text-transform:uppercase;letter-spacing:.06em;margin:14px 0 8px;padding-bottom:6px;border-bottom:2px solid var(--bd)">${t}</div>`;
  const PILL=(v,c)=>`<span style="background:${c}18;color:${c};border:1px solid ${c}30;font-size:10px;font-weight:800;padding:2px 7px;border-radius:20px">${v}</span>`;
  const ST=(i,l,v,c='var(--tx)')=>`<div style="background:var(--s);border:1px solid var(--bd);border-radius:9px;padding:10px;border-top:3px solid ${c};text-align:center"><div style="font-size:14px;margin-bottom:3px">${i}</div><div style="font-size:18px;font-weight:800;color:${c};line-height:1;margin-bottom:2px">${v}</div><div style="font-size:9px;font-weight:700;color:var(--tx3);text-transform:uppercase">${l}</div></div>`;

  let h=`<!-- Period switcher -->
  <div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:14px">
    ${Object.entries(PERIODS).map(([p,{label:l}])=>`<button onclick="window._mrPeriod='${p}';openMemberReport_render(DB.team.find(x=>x.id==='${m.id}'),'${p}',{week:{label:'Last 7 Days',days:7},month:{label:'Last 30 Days',days:30},q:{label:'Last 3 Months',days:90},half:{label:'Last 6 Months',days:180},year:{label:'Last Year',days:365}})" style="padding:4px 10px;border-radius:7px;font-size:11px;font-weight:700;cursor:pointer;border:1px solid ${period===p?'var(--ac)':'var(--bd)'};background:${period===p?'var(--ac)':'var(--s2)'};color:${period===p?'#fff':'var(--tx2)'}">${l}</button>`).join('')}
    <button onclick="window.print()" style="padding:4px 12px;background:#dc2626;color:#fff;border:none;border-radius:7px;font-size:11px;font-weight:700;cursor:pointer;margin-left:auto">🖨 Export PDF</button>
  </div>

  <!-- Identity -->
  <div style="display:flex;align-items:center;gap:12px;background:var(--s2);border:1px solid var(--bd);border-radius:10px;padding:12px 14px;margin-bottom:14px">
    <span style="width:40px;height:40px;border-radius:50%;background:${m.color};display:inline-flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;color:#fff;flex-shrink:0">${m.av}</span>
    <div style="flex:1"><div style="font-size:14px;font-weight:800">${m.name}</div>
    <div style="display:flex;gap:5px;flex-wrap:wrap;margin-top:3px">${PILL(m.role||'Member','#2563eb')}${PILL(m.access||'Member','#7c3aed')}${PILL(m.status||'Active',m.status==='Active'||!m.status?'#15803d':'#d97706')}</div></div>
  </div>

  ${SP('⚡ Overview — '+label)}
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-bottom:4px">
    ${ST('📋','Assigned',periodTasks.length,'#2563eb')}${ST('✅','Done',periodDone.length,'#15803d')}${ST('📈','Completion',cr!==null?cr+'%':'—',crCol)}
    ${ST('⚠️','Overdue Now',overdueNow.length,overdueNow.length?'#dc2626':'#15803d')}${ST('⏱','Hours',workHours+'h','#0891b2')}${ST('🔄','Avg Cycle',avgCycle?avgCycle+'h':'—','#7c3aed')}
  </div>

  ${SP('🔔 Notifications Sent to '+m.name.split(' ')[0]+' ('+memberNotifs.length+' · '+notifsRead+' read)')}
  ${memberNotifs.length?`<div style="display:flex;flex-direction:column;gap:5px;max-height:280px;overflow-y:auto;margin-bottom:4px">
  ${memberNotifs.map(n=>{
    const icon=NOTIF_ICONS[n.type]||'🔔';
    return`<div style="display:flex;align-items:flex-start;gap:8px;padding:7px 10px;background:var(--s2);border-radius:7px">
      <span style="font-size:13px;flex-shrink:0;line-height:1.4">${icon}</span>
      <div style="flex:1;min-width:0">
        <div style="font-size:11px;color:var(--tx);line-height:1.4">${n.message}</div>
        <div style="font-size:9px;color:var(--tx3);margin-top:2px">${n.type}${n.taskTitle?' · '+n.taskTitle:''} · ${fdt(n.at)}</div>
      </div>
      <span style="font-size:9px;font-weight:800;padding:2px 8px;border-radius:20px;flex-shrink:0;white-space:nowrap;background:${n.read?'#f0fdf4':'#fffbeb'};color:${n.read?'#15803d':'#b45309'};border:1px solid ${n.read?'#86efac':'#fde68a'}">${n.read?'✓ Read':'◌ Unread'}</span>
    </div>`;
  }).join('')}
  </div>`:`<div style="font-size:12px;color:var(--tx3);padding:8px 0;margin-bottom:4px">No notifications were sent to ${m.name} in this period.</div>`}

  ${periodTasks.length?SP('📋 Tasks ('+periodTasks.length+')'):''}
  ${periodTasks.length?`<div class="tw" style="max-height:260px;overflow-y:auto"><table><thead><tr><th>Task</th><th>Status</th><th>Est</th><th>Actual</th><th>Var</th></tr></thead><tbody>
  ${periodTasks.map(t=>{const v=t.est&&t.actual?Math.round((t.actual-t.est)/t.est*100):null;const vc=v===null?'var(--tx3)':Math.abs(v)<=20?'#15803d':Math.abs(v)<=50?'#d97706':'#dc2626';return`<tr onclick="openTask('${t.id}')" class="cl"><td style="font-size:11px;font-weight:700;max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${t.title}</td><td>${spill(t.status)}</td><td style="font-size:10px">${t.est!=null?t.est+'h':'—'}</td><td style="font-size:10px;color:#0891b2">${t.actual!=null?t.actual+'h':'—'}</td><td style="font-size:10px;font-weight:700;color:${vc}">${v!==null?(v>0?'+':'')+v+'%':'—'}</td></tr>`;}).join('')}
  </tbody></table></div>`:''}

  ${reviewedByMe.length?SP('🔍 Reviews Done ('+reviewedByMe.length+')'):''}
  ${reviewedByMe.length?`<div style="display:flex;flex-direction:column;gap:4px">${reviewedByMe.slice(0,5).map(t=>`<div onclick="openTask('${t.id}')" style="display:flex;align-items:center;gap:7px;padding:6px 9px;background:var(--s2);border-radius:7px;cursor:pointer;font-size:12px"><span style="font-size:10px">✅</span><span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${t.title}</span><span style="font-size:10px;color:var(--tx3)">${fdt(t.tsReviewed)}</span></div>`).join('')}</div>`:''}

  ${myMeetings.length?SP('📅 Meetings ('+myMeetings.length+')'):''}
  ${myMeetings.length?`<div style="display:flex;flex-direction:column;gap:4px">${myMeetings.slice(0,6).map(mt=>{const k=Object.keys(mt.attendance||{}).find(k=>k.toLowerCase()===m.name.toLowerCase());const att=k?mt.attendance[k]:'invited';return`<div onclick="openMeetingDetail('${mt.id}')" style="display:flex;align-items:center;gap:7px;padding:6px 9px;background:var(--s2);border-radius:7px;cursor:pointer;font-size:12px"><span style="font-size:10px">${att==='present'?'✅':att==='absent'?'❌':'📅'}</span><span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${mt.title}</span><span style="font-size:10px;color:var(--tx3)">${fd(mt.meeting_date)}</span></div>`;}).join('')}</div>`:''}

  ${helpGiven.length||helpRequested.length?SP('🤝 Help Requests'):''}
  ${helpGiven.length?`<div style="font-size:10px;font-weight:700;color:#15803d;margin-bottom:4px">GIVEN (${helpGiven.length})</div><div style="display:flex;flex-direction:column;gap:3px">${helpGiven.map(t=>`<div onclick="openTask('${t.id}')" style="display:flex;align-items:center;gap:7px;padding:5px 9px;background:#f0fdf4;border-radius:7px;cursor:pointer;font-size:11px"><span>🤝</span><span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${t.title}</span>${spill(t.status)}</div>`).join('')}</div>`:''}
  ${helpRequested.length?`<div style="font-size:10px;font-weight:700;color:#ea580c;margin:6px 0 4px">REQUESTED (${helpRequested.length})</div><div style="display:flex;flex-direction:column;gap:3px">${helpRequested.map(t=>`<div onclick="openTask('${t.id}')" style="display:flex;align-items:center;gap:7px;padding:5px 9px;background:#fff7ed;border-radius:7px;cursor:pointer;font-size:11px"><span>⏸</span><span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${t.title}</span>${spill(t.status)}</div>`).join('')}</div>`:''}

  ${remSent.length||remReceived.length?SP('🔔 Reminders (Sent: '+remSent.length+' · Received: '+remReceived.length+')'):''}
  ${remSent.slice(0,4).map(r=>`<div style="background:var(--s2);border-radius:7px;padding:6px 10px;margin-bottom:4px;font-size:11px"><strong>→ ${r.toName}</strong>${r.taskTitle?' · '+r.taskTitle:''} <span style="color:var(--tx3);font-size:10px">${fdt(r.at)}</span></div>`).join('')}
  ${remReceived.slice(0,4).map(r=>`<div style="background:var(--al);border:1px solid #bfdbfe;border-radius:7px;padding:6px 10px;margin-bottom:4px;font-size:11px"><strong>← ${r.fromName}</strong>${r.taskTitle?' · '+r.taskTitle:''} <span style="color:var(--tx3);font-size:10px">${fdt(r.at)}</span></div>`).join('')}

  ${hrComs.length?SP('💬 HR Communications ('+hrComs.length+')'):''}
  ${hrComs.slice(0,3).map(c=>{const cBody=c.body||'';return`<div style="background:var(--s2);border:1px solid var(--bd);border-radius:8px;padding:8px 10px;margin-bottom:5px;font-size:11px"><div style="display:flex;justify-content:space-between;margin-bottom:3px"><strong>${escapeHtml(c.title||'')}</strong>${PILL(c.status,'#64748b')}</div><div style="color:var(--tx2)">${escapeHtml(cBody.slice(0,80))}${cBody.length>80?'…':''}</div><div style="color:var(--tx3);font-size:10px;margin-top:2px">${fdt(c.at)}${(c.replies||[]).length?' · '+(c.replies||[]).length+' replies':''}</div></div>`;}).join('')}

  ${reests.length?SP('⏱ Re-Estimates ('+reests.length+')'):''}
  ${reests.map(r=>`<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:7px;padding:7px 10px;margin-bottom:4px;font-size:11px"><strong>${r.taskTitle}</strong> · ${r.oldEst}h → ${r.newEst}h<div style="color:var(--tx2);margin-top:2px">${r.reason}</div></div>`).join('')}

  ${(()=>{const libEvents=syslog.filter(e=>(e.action==='Library Access Approved'||e.action==='Library Access Requested'||e.action==='Library Entry Added'||e.action==='Library Updated'||e.action==='Library Deleted')&&(e.actor===m.name||e.details?.includes(m.name))&&inR(e.at));return libEvents.length?SP('📖 Library Activity ('+ libEvents.length+')')+libEvents.map(e=>`<div style="background:var(--s2);border:1px solid var(--bd);border-radius:7px;padding:7px 10px;margin-bottom:4px;font-size:11px;display:flex;align-items:center;gap:7px"><span>${e.action.includes('Approved')?'✅':e.action.includes('Rejected')?'❌':e.action.includes('Added')?'➕':'📖'}</span><div style="flex:1"><strong>${e.action}</strong>${e.event?' — '+e.event:''}</div><span style="color:var(--tx3);font-size:10px;white-space:nowrap">${fdt(e.at)}</span></div>`).join(''):'';})()}

  ${loginEvents.length?SP('🔐 Login Sessions ('+loginEvents.length+')'):''}
  ${loginEvents.length?`<div style="display:flex;flex-wrap:wrap;gap:4px">${loginEvents.map(e=>`<span style="background:var(--al);color:var(--ac);font-size:10px;font-weight:600;padding:2px 8px;border-radius:20px;border:1px solid #bfdbfe">${fdt(e.at)}</span>`).join('')}</div>`:''}

  <div style="margin-top:14px;padding:10px 12px;background:var(--s2);border:1px solid var(--bd);border-radius:9px;display:flex;align-items:center;gap:8px;font-size:11px;color:var(--tx3)">
    <span>💡</span><span>Click <button onclick="window.print()" style="padding:2px 9px;background:var(--ac);color:#fff;border:none;border-radius:5px;font-size:10px;font-weight:700;cursor:pointer">🖨 Print</button> to export as PDF</span>
  </div>`;

  const sp=document.getElementById('sp-bd');
  if(sp)sp.innerHTML=h;
}

// Hook into openMemberDetail to add "Full Report" button
const _origOpenMD=window.openMemberDetail;
window.openMemberDetail=async(id)=>{
  await _origOpenMD(id);
  // Add report button after panel renders
  setTimeout(()=>{
    const spa=document.querySelector('#sp-bd .spa');
    if(spa&&!spa.querySelector('.mr-btn')){
      const btn=document.createElement('button');
      btn.className='btn bg2 bsm mr-btn';
      btn.textContent='📋 Full Report';
      btn.onclick=(e)=>{e.stopPropagation();openMemberReport(id);};
      spa.insertBefore(btn,spa.firstChild);
    }
  },100);
};


// ══════════════════════════════════════════════════════
function rHelpRequests(el){
  const TABS=['Requested by Me','Requested from Me'];
  let tab=0;
  function render(t){
    tab=t;
    const byMe=DB.tasks.filter(tk=>tk.type==='Help Request'&&tk.reqBy===CU.name);
    const fromMe=DB.tasks.filter(tk=>tk.type==='Help Request'&&(tk.assignedTo===CU.id||(tk.assignees||[]).includes(CU.id)));
    const list=t===0?byMe:fromMe;
    const cnt=[byMe.length,fromMe.length];
    const pendByMe=byMe.filter(tk=>tk.status==='New'||tk.status==='Pending Review').length;
    const pendFromMe=fromMe.filter(tk=>tk.status==='New'||tk.status==='In Progress').length;

    let h=`<div class="tabs" style="margin-bottom:14px">
      ${TABS.map((lb,i)=>`<div class="tab ${i===tab?'on':''}" style="font-size:13px;font-weight:700;${i===tab?'color:var(--ac);border-bottom:3px solid var(--ac)':'color:var(--tx2)'}">
        ${lb} <span style="display:inline-flex;align-items:center;justify-content:center;min-width:20px;height:20px;padding:0 5px;background:${i===tab?'var(--ac)':cnt[i]>0?'var(--ac)18':'var(--s2)'};color:${i===tab?'#fff':cnt[i]>0?'var(--ac)':'var(--tx3)'};border-radius:20px;font-size:11px;font-weight:800;margin-left:4px">${cnt[i]}</span>
      </div>`).join('')}
    </div>`;

    if(!list.length){
      h+=`<div class="empty"><div class="ei">🤝</div><div class="et">${tab===0?'No help requests sent':'No help requests received'}</div><div class="es">${tab===0?'Request help from a task panel while it\'s In Progress':'Other members can request your help from their tasks'}</div></div>`;
    } else {
      h+=`<div style="display:flex;flex-direction:column;gap:10px">`;
      list.sort((a,b)=>new Date(b.tsCreated||0)-new Date(a.tsCreated||0)).forEach(tk=>{
        const parent=tk.parentTaskId?DB.tasks.find(x=>x.id===tk.parentTaskId):null;
        const helper=DB.team.find(m=>m.id===tk.assignedTo);
        const requester=DB.team.find(m=>m.name===tk.reqBy);
        const ds=getDueStatus(tk);
        const statusColor={New:'#94a3b8','In Progress':'#2563eb','Pending Review':'#7c3aed',Done:'#15803d',Rejected:'#dc2626','On Hold':'#ca8a04'}[tk.status]||'#94a3b8';
        const isActionable=(tab===0&&tk.status==='Pending Review')||(tab===1&&(tk.status==='New'||tk.status==='In Progress'));
        h+=`<div onclick="openTask('${tk.id}')" style="background:var(--s);border:1px solid ${isActionable?'var(--ac)':'var(--bd)'};border-radius:12px;padding:14px 16px;cursor:pointer;transition:box-shadow .15s${isActionable?';box-shadow:0 0 0 2px var(--ac)22':''}" onmouseenter="this.style.boxShadow='var(--shmd)'" onmouseleave="this.style.boxShadow='${isActionable?'0 0 0 2px var(--ac)22':''}'">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:10px">
            <div style="flex:1;min-width:0">
              <div style="font-size:13px;font-weight:800;color:var(--tx);margin-bottom:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${tk.title}</div>
              ${parent?`<div style="font-size:11px;color:var(--tx3)">↳ For task: <span style="color:var(--ac);font-weight:600;cursor:pointer" onclick="event.stopPropagation();openTask('${parent.id}')">${parent.title}</span></div>`:''}
            </div>
            <span style="background:${statusColor}18;color:${statusColor};border:1px solid ${statusColor}30;font-size:10px;font-weight:800;padding:3px 9px;border-radius:20px;flex-shrink:0">${tk.status}</span>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">
            <div style="background:var(--s2);border-radius:8px;padding:9px 11px">
              <div style="font-size:9px;font-weight:700;color:var(--tx3);text-transform:uppercase;margin-bottom:4px">${tab===0?'Helping Member':'Requested By'}</div>
              ${(tab===0?helper:requester)?`<div style="display:flex;align-items:center;gap:7px">
                <span style="width:24px;height:24px;border-radius:50%;background:${(tab===0?helper:requester)?.color};display:inline-flex;align-items:center;justify-content:center;font-size:9px;color:#fff;font-weight:800">${(tab===0?helper:requester)?.av}</span>
                <span style="font-size:12px;font-weight:700;color:var(--tx)">${(tab===0?helper:requester)?.name}</span>
              </div>`:'<span style="font-size:12px;color:var(--tx3)">—</span>'}
            </div>
            <div style="background:var(--s2);border-radius:8px;padding:9px 11px">
              <div style="font-size:9px;font-weight:700;color:var(--tx3);text-transform:uppercase;margin-bottom:4px">Due / Created</div>
              <div style="font-size:11px;font-weight:700;color:${ds.cls==='ds-overdue'?'#dc2626':'var(--tx)'}">${tk.due?fd(tk.due):'No due date'}</div>
              <div style="font-size:10px;color:var(--tx3);margin-top:2px">${fr(tk.tsCreated)}</div>
            </div>
          </div>
          ${tk.desc?`<div style="font-size:12px;color:var(--tx2);line-height:1.5;border-top:1px solid var(--bd);padding-top:9px">${tk.desc.slice(0,160)}${tk.desc.length>160?'…':''}</div>`:''}
          <div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--bd);display:flex;gap:8px;flex-wrap:wrap" onclick="event.stopPropagation()">
            ${isActionable?`${tab===0&&tk.status==='Pending Review'?`<button class="btn bk bsm" onclick="approveTask('${tk.id}');rr()">✓ Accept Help</button><button class="btn bd2 bsm" onclick="rejectTask('${tk.id}');rr()">✗ Reject Help</button>`:''}
            ${tab===1&&tk.status==='New'?`<button class="btn bp bsm" onclick="reqStart('${tk.id}')">▶ Start</button>`:''}
            ${tab===1&&tk.status==='In Progress'?`<button class="btn bp bsm" onclick="reqSubmit('${tk.id}')">📤 Submit</button>`:''}`:''}
            ${isAdmin()?`<button class="btn bd2 bsm" onclick="delHelpTask('${tk.id}')">🗑 Delete</button>`:''}
          </div>
        </div>`;
      });
      h+=`</div>`;
    }
    el.innerHTML=h;
    el.querySelectorAll('.tab').forEach((tb,i)=>tb.onclick=()=>render(i));
    window.rr=()=>render(tab);
  }
  render(0);
}

// ══════════════════════════════════════════════════════
// REMINDERS PAGE
// ══════════════════════════════════════════════════════
// Reminders — loaded from Supabase via initCommsData()
window._saveReminders=()=>{}; // no-op, Supabase is source of truth

// ══ COMMENTS PAGE ════════════════════════════════════════════════════
