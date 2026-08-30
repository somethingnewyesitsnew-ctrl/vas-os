// §24 ── COMMENTS PAGE ──────────────────────────────────────────────────
function rComments(el){
  const canAll=canDoStrict('comments');
  let tab=localStorage.getItem('vas_cm_tab')||'mine';
  if(tab==='system'&&!canAll)tab='mine'; // access may have been revoked since last visit

  // Gather ALL comments across all tasks
  const allComments=[];
  DB.tasks.forEach(t=>{
    (t.comments||[]).forEach(c=>{
      allComments.push({
        ...c,
        taskId:t.id,
        taskTitle:t.title,
        taskStatus:t.status,
        taskAssignee:t.assignedTo,
        taskReviewer:t.reviewer,
        taskPriority:t.priority,
      });
    });
  });
  allComments.sort((a,b)=>new Date(b.at)-new Date(a.at));

  // Tab: Mine — comments on my tasks OR replies to my comments
  const mineComments=allComments.filter(c=>{
    const t=DB.tasks.find(x=>x.id===c.taskId);if(!t)return false;
    const onMyTask=t.assignedTo===CU?.id||(t.assignees||[]).includes(CU?.id)||t.reviewer===CU?.id||t.createdBy===CU?.name;
    const replyToMe=(t.comments||[]).some(x=>x.by===CU?.id)&&c.by!==CU?.id;
    const myOwnComment=c.by===CU?.id;
    return onMyTask||replyToMe||myOwnComment;
  });

  // Tab: System — every comment from everyone
  const systemComments=allComments;

  const list=tab==='mine'?mineComments:systemComments;
  const unreadMine=mineComments.filter(c=>c.by!==CU?.id&&!(c.readBy||[]).includes(CU?.id)).length;

  function renderList(comments){
    if(!comments.length){
      return`<div class="empty"><div class="ei">💬</div><div class="et">No comments yet</div><div class="es">${tab==='mine'?'Comments on your tasks or replies to your comments appear here.':'All task comments across the system appear here.'}</div></div>`;
    }
    return comments.map(c=>{
      const author=DB.team.find(m=>m.id===c.by);
      const task=DB.tasks.find(t=>t.id===c.taskId);
      const isUnread=c.by!==CU?.id&&!(c.readBy||[]).includes(CU?.id);
      const isMe=c.by===CU?.id;
      return`<div onclick="openTask('${c.taskId}')" style="background:${isUnread?'var(--al)':'var(--s2)'};border:1px solid ${isUnread?'var(--ac)44':'var(--bd)'};border-radius:12px;padding:12px 14px;margin-bottom:8px;cursor:pointer;transition:all .15s" onmouseenter="this.style.borderColor='var(--ac)'" onmouseleave="this.style.borderColor='${isUnread?'var(--ac)44':'var(--bd)'}'">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
          <span style="width:26px;height:26px;border-radius:50%;background:${author?.color||'#64748b'};display:inline-flex;align-items:center;justify-content:center;font-size:9px;font-weight:800;color:#fff;flex-shrink:0">${author?.av||(c.byName||'?')[0].toUpperCase()}</span>
          <div style="flex:1;min-width:0">
            <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
              <span style="font-size:12px;font-weight:800;color:${isMe?'var(--ac)':'var(--tx)'}">${isMe?'You':escapeHtml(c.byName||'?')}</span>
              ${isUnread?`<span style="background:var(--ac);color:#fff;font-size:9px;font-weight:800;padding:1px 6px;border-radius:10px">NEW</span>`:''}
              <span style="font-size:10px;color:var(--tx3);margin-left:auto;white-space:nowrap">${fdt(c.at)}</span>
            </div>
          </div>
        </div>
        <div style="font-size:13px;color:var(--tx);line-height:1.5;margin-bottom:8px;padding:8px 10px;background:var(--s);border-radius:8px;border-left:3px solid ${isMe?'var(--ac)':'var(--bd2)'}">${escapeHtml(c.text)}</div>
        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
          <span style="font-size:10px;font-weight:600;color:var(--tx3)">on task:</span>
          <span style="display:inline-flex;align-items:center;gap:4px;background:var(--s);border:1px solid var(--bd);border-radius:6px;padding:3px 8px;font-size:11px;font-weight:700;color:var(--tx2);max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
            📋 ${c.taskTitle||'Unknown task'}
          </span>
          ${task?`${spill(task.status)} ${ppill(task.priority)}`:''}
        </div>
      </div>`;
    }).join('');
  }

  const h=`
  <div class="ph">
    <div>
      <div class="pt">💬 Comments</div>
      <div class="ps">Comments across all tasks you're involved in</div>
    </div>
  </div>
  <div class="tabs" style="margin-bottom:16px">
    <div class="tab ${tab==='mine'?'on':''}" onclick="localStorage.setItem('vas_cm_tab','mine');rComments(document.getElementById('content'))" style="font-size:13px;font-weight:700;cursor:pointer;${tab==='mine'?'color:var(--ac);border-bottom:3px solid var(--ac)':'color:var(--tx2)'}">
      💬 My Comments
      <span style="display:inline-flex;align-items:center;justify-content:center;min-width:20px;height:20px;padding:0 5px;background:${tab==='mine'?'var(--ac)':mineComments.length?'var(--ac)18':'var(--s2)'};color:${tab==='mine'?'#fff':mineComments.length?'var(--ac)':'var(--tx3)'};border-radius:20px;font-size:11px;font-weight:800;margin-left:4px">${mineComments.length}</span>
      ${unreadMine>0?`<span style="background:var(--r);color:#fff;font-size:9px;font-weight:800;padding:1px 6px;border-radius:10px;margin-left:4px">${unreadMine} new</span>`:''}
    </div>
    ${canAll?`<div class="tab ${tab==='system'?'on':''}" onclick="localStorage.setItem('vas_cm_tab','system');rComments(document.getElementById('content'))" style="font-size:13px;font-weight:700;cursor:pointer;${tab==='system'?'color:var(--ac);border-bottom:3px solid var(--ac)':'color:var(--tx2)'}">
      🌐 All Comments
      <span style="display:inline-flex;align-items:center;justify-content:center;min-width:20px;height:20px;padding:0 5px;background:${tab==='system'?'var(--ac)':systemComments.length?'var(--s2)':'var(--s2)'};color:${tab==='system'?'#fff':'var(--tx3)'};border-radius:20px;font-size:11px;font-weight:800;margin-left:4px">${systemComments.length}</span>
    </div>`:''}
  </div>
  ${!canAll?`<div style="background:var(--al);border:1px solid #bfdbfe;border-radius:8px;padding:9px 12px;margin-bottom:12px;font-size:12px;color:var(--ac)">Showing comments related to your own tasks only. Ask an admin for full Comments access to see everyone's.</div>`:''}
  <div id="cm-list">${renderList(list)}</div>`;
  el.innerHTML=h;
}

function rReminders(el){
  const canAll=canDoStrict('reminders');
  const TABS=canAll?['Sent to Me','Sent by Me','All Reminders']:['Sent to Me','Sent by Me'];
  let tab=0;
  function render(t){
    tab=t;
    const toMe=DB.reminders.filter(r=>r.toId===CU.id||r.toName===CU.name);
    const byMe=DB.reminders.filter(r=>r.fromId===CU.id||r.fromName===CU.name);
    const allR=canAll?[...DB.reminders]:[];
    const list=t===0?toMe:t===1?byMe:allR;
    const cnt=canAll?[toMe.length,byMe.length,allR.length]:[toMe.length,byMe.length];

    let h=`<div class="tabs" style="margin-bottom:14px">
      ${TABS.map((lb,i)=>`<div class="tab ${i===tab?'on':''}" style="font-size:13px;font-weight:700;${i===tab?'color:var(--ac);border-bottom:3px solid var(--ac)':'color:var(--tx2)'}">
        ${lb} <span style="display:inline-flex;align-items:center;justify-content:center;min-width:20px;height:20px;padding:0 5px;background:${i===tab?'var(--ac)':cnt[i]>0?'var(--ac)18':'var(--s2)'};color:${i===tab?'#fff':cnt[i]>0?'var(--ac)':'var(--tx3)'};border-radius:20px;font-size:11px;font-weight:800;margin-left:4px">${cnt[i]}</span>
      </div>`).join('')}
    </div>`;
    if(!canAll)h+=`<div style="background:var(--al);border:1px solid #bfdbfe;border-radius:8px;padding:9px 12px;margin-bottom:12px;font-size:12px;color:var(--ac)">Only your own reminders are shown. Ask an admin for full Reminders access to see everyone's.</div>`;

    if(!list.length){
      h+=`<div class="empty"><div class="ei">🔔</div><div class="et">${tab===0?'No reminders received':tab===1?'No reminders sent':'No reminders yet'}</div></div>`;
    } else {
      h+=`<div style="display:flex;flex-direction:column;gap:8px">`;
      [...list].sort((a,b)=>new Date(b.at||0)-new Date(a.at||0)).forEach(r=>{
        const task=r.taskId?DB.tasks.find(tk=>tk.id===r.taskId):null;
        const fromM=DB.team.find(m=>m.id===r.fromId||m.name===r.fromName);
        const toM=DB.team.find(m=>m.id===r.toId||m.name===r.toName);
        const shown=tab===0?fromM:tab===1?toM:null;
        const shownLabel=tab===0?'From':'To';
        h+=`<div style="background:var(--s);border:1px solid var(--bd);border-radius:11px;padding:13px 15px;display:flex;gap:12px;align-items:flex-start">
          <div style="font-size:22px;flex-shrink:0;line-height:1;margin-top:2px">${r.read&&tab===0?'🔕':'🔔'}</div>
          <div style="flex:1;min-width:0">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px;flex-wrap:wrap">
              ${tab===2?`<span style="display:inline-flex;align-items:center;gap:4px;font-size:12px;font-weight:700;color:var(--tx)">${fromM?.name||r.fromName||'?'} <span style="color:var(--tx3);font-weight:500">→</span> ${toM?.name||r.toName||'?'}</span>`:`
              <span style="font-size:10px;font-weight:700;color:var(--tx3);text-transform:uppercase">${shownLabel}:</span>
              ${shown?`<span style="display:inline-flex;align-items:center;gap:5px"><span style="width:20px;height:20px;border-radius:50%;background:${shown.color};display:inline-flex;align-items:center;justify-content:center;font-size:8px;color:#fff;font-weight:800">${shown.av}</span><span style="font-size:12px;font-weight:700;color:var(--tx)">${esc(shown.name)}</span></span>`:'<span style="font-size:12px;color:var(--tx3)">Unknown</span>'}`}
              <span style="font-size:10px;color:var(--tx3);margin-left:auto">${fdt(r.at)}</span>
            </div>
            ${(()=>{
              // Find the linked item — task, help request, or meeting
              const linkedTask=r.taskId?DB.tasks.find(tk=>tk.id===r.taskId):null;
              const linkedMeeting=r.meetingId?DB.meetings.find(m=>m.id===r.meetingId):null;
              let chips='';
              if(linkedTask){
                const isHelp=linkedTask.type==='Help Request';
                chips+=`<div onclick="openTask('${linkedTask.id}')" style="display:inline-flex;align-items:center;gap:6px;background:${isHelp?'#fff7ed':'var(--al)'};border:1px solid ${isHelp?'#fed7aa':'#bfdbfe'};border-radius:7px;padding:6px 11px;margin-bottom:8px;cursor:pointer;font-size:11px;font-weight:700;color:${isHelp?'#c2410c':'var(--ac)'}">
                  ${isHelp?'🤝':'☑'} ${esc(linkedTask.title)}
                  <span style="font-weight:500;margin-left:4px">${spill(linkedTask.status)}</span>
                  ${linkedTask.due?`<span style="font-size:10px;color:var(--tx3)">· Due ${fd(linkedTask.due)}</span>`:''}
                </div>`;
              }
              if(linkedMeeting){
                chips+=`<div onclick="openMeetingDetail('${linkedMeeting.id}')" style="display:inline-flex;align-items:center;gap:6px;background:#f5f3ff;border:1px solid #ddd6fe;border-radius:7px;padding:6px 11px;margin-bottom:8px;cursor:pointer;font-size:11px;font-weight:700;color:#7c3aed">
                  📅 ${esc(linkedMeeting.title)}
                  <span style="font-size:10px;color:var(--tx3)">· ${fd(linkedMeeting.meeting_date)}</span>
                </div>`;
              }
              return chips?`<div>${chips}</div>`:'';
            })()}
            <div style="font-size:13px;color:var(--tx);line-height:1.5;padding:8px 11px;background:var(--s2);border-radius:8px;border-left:3px solid ${tab===0?'var(--ac)':'var(--bd)'}">${r.msg||'No message'}</div>
            <div style="display:flex;gap:6px;margin-top:8px">
              ${tab===0&&!r.read?`<button onclick="event.stopPropagation();(async()=>{r.read=true;await sbCommsUpdate('reminders','${r.id}',{read:true});updateBadges();rr();})()" style="padding:4px 12px;background:var(--s2);border:1px solid var(--bd);border-radius:6px;font-size:11px;font-weight:600;cursor:pointer;color:var(--tx3)">✓ Mark read</button>`:''}
              ${isAdmin()?`<button onclick="event.stopPropagation();delReminder('${r.id}')" style="padding:4px 12px;background:var(--rb);border:1px solid var(--rbr);border-radius:6px;font-size:11px;font-weight:600;cursor:pointer;color:var(--r)">🗑 Delete</button>`:''}
            </div>
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
// TUTORIAL OVERLAY SYSTEM
// ══════════════════════════════════════════════════════
const TUTORIAL_STEPS_ALL=[
  {title:'👋 Welcome to Digital Plus OS',body:'This quick tour walks you through the features available to you. Use the arrows to navigate or press <strong>Skip</strong> to exit.',target:null,position:'center',action:null,perm:null},
  {title:'📌 The Sidebar',body:'The sidebar organises your workspace. Only the sections you have access to are shown — based on your membership type.',target:'nav.sb',position:'right',action:null,perm:null},
  {title:'⬛ Dashboard',body:'Your live overview — KPI stats, task velocity, upcoming meetings, and items needing your attention.',target:'[data-p="dash"]',position:'right',action:()=>navTo('dash'),perm:null},
  {title:'☑ My Tasks',body:'Shows tasks <strong>assigned to you</strong> (tab 1) and tasks you <strong>assigned to others</strong> (tab 2). Click any task to open its full detail panel with the timeline and action buttons.',target:'[data-p="mytasks"]',position:'right',action:()=>navTo('mytasks'),perm:null},
  {title:'➕ Creating a Task',body:'Click <strong>+ Task</strong> in the top bar. Fill in the title, assign it to a member, set priority and due date, and optionally link it to a service or project.',target:'.tb-r',position:'bottom',action:null,perm:null},
  {title:'🔄 Task Lifecycle',body:'<strong>New</strong> → set estimate → <strong>In Progress</strong> → work done → <strong>Submit for Review</strong> → <strong>Pending Review</strong> → reviewer approves → <strong>Done</strong> (auto-archived & documented).<br><br>Tasks can be rejected or put On Hold.',target:null,position:'center',action:null,perm:null},
  {title:'🤝 Help Requests',body:'While <strong>In Progress</strong>, click <strong>🤝 Request Help</strong> in the task panel. Pick a teammate, describe what you need. The helper works it and submits back — your task returns to In Progress automatically.',target:'[data-p="helprequests"]',position:'right',action:()=>navTo('helprequests'),perm:null},
  {title:'◎ To Review',body:'<strong>Tab 1 — To Review by Me:</strong> tasks waiting for your approval. Click ✓ Approve or ✗ Reject.<br><br><strong>Tab 2 — Submitted by Me:</strong> your submitted tasks awaiting review.',target:'[data-p="toreview"]',position:'right',action:()=>navTo('toreview'),perm:null},
  {title:'✓ My Todos',body:'Quick personal notes that aren\'t formal tasks yet. Convert any todo into a task with one click.',target:'[data-p="todos"]',position:'right',action:()=>navTo('todos'),perm:'todos'},
  {title:'🔔 Reminders',body:'From any task panel, click <strong>🔔 Remind</strong> to notify a teammate. Reminders appear here with the linked task and message.',target:'[data-p="reminders"]',position:'right',action:()=>navTo('reminders'),perm:null},
  {title:'💬 HR Communications',body:'Send a confidential message to HR — leave requests, concerns, or queries. Only you, HR members, and admins can see it.',target:'[data-p="hrcoms"]',position:'right',action:()=>navTo('hrcoms'),perm:'hrComs'},
  {title:'📢 Announcements',body:'Admins and HR post announcements to everyone or specific members. Priority levels are colour-coded. Unread announcements show a badge.',target:'[data-p="announcements"]',position:'right',action:()=>navTo('announcements'),perm:'announcements'},
  {title:'◉ Projects',body:'Projects group related tasks. Each project shows status, team members, linked tasks, and progress. You can link tasks to a project when creating or editing them.',target:'[data-p="projects"]',position:'right',action:()=>navTo('projects'),perm:'projects'},
  {title:'≡ All Tasks',body:'All tasks you have access to. Filter by status, priority, date, member, project, service, or operator.',target:'[data-p="alltasks"]',position:'right',action:()=>navTo('alltasks'),perm:'allTasks'},
  {title:'◈ Team & Evaluation',body:'The <strong>Team</strong> page shows members with task counts and completion rates. The <strong>Evaluation</strong> leaderboard scores each member on completion rate, overdue tasks, rejections, and more.',target:'[data-p="team"]',position:'right',action:()=>navTo('team'),perm:'team'},
  {title:'◆ Backlog',body:'Tasks that are parked or not yet scheduled. Move them to active when ready.',target:'[data-p="backlog"]',position:'right',action:()=>navTo('backlog'),perm:'backlog'},
  {title:'◐ Services & Operators',body:'<strong>Services</strong> are your products/services, grouped by operator. Click any card to see related services, projects, and tasks in one panel.',target:'[data-p="services"]',position:'right',action:()=>navTo('services'),perm:'_admin'},
  {title:'📅 Meetings',body:'Schedule and track meetings with date, time, location, and invited members. End a meeting to create action item tasks for each outcome.',target:'[data-p="meetings"]',position:'right',action:()=>navTo('meetings'),perm:null},
  {title:'🧪 Service Tests',body:'Schedule recurring checklist sessions for your operators. Walk through each service item — mark ✓ Working or ✗ Fail. Failed items convert to tasks.',target:'[data-p="svctest"]',position:'right',action:()=>navTo('svctest'),perm:'svcTest'},
  {title:'📚 Docs & Archive',body:'<strong>Docs</strong> — When a task is approved, its description is auto-saved here.<br><br><strong>Archive</strong> — Approved tasks land here with estimated vs actual hours and variance.',target:'[data-p="docs"]',position:'right',action:()=>navTo('docs'),perm:'docs'},
  {title:'🔄 Live Refresh',body:'Click <strong>🔄 Refresh</strong> in the sidebar to manually sync everything. The system also auto-syncs after every action.',target:'#nsync',position:'right',action:null,perm:null},
  {title:'🎉 You\'re all set!',body:'Quick cheat sheet:<br><br>📋 <strong>Create tasks</strong> with + Task<br>▶ <strong>Start</strong> → set estimate → work → submit → review<br>🤝 <strong>Need help?</strong> → Request Help from a task panel<br><br>Click <strong>🎓 Tutorial</strong> anytime to replay this tour.',target:null,position:'center',action:()=>navTo('dash'),perm:null}
];

// Build filtered steps for the current user's permissions
