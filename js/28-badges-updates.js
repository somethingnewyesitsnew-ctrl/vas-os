// §28 ── BADGES & UPDATES ────────────────────────────────────────────────
function updateBadges(){
  if(!CU)return;
  const todayStr=localDateStr();
  const todayDow=new Date().getDay();

  // My tasks (active)
  const mine=DB.tasks.filter(t=>(t.assignedTo===CU.id||t.assignees?.includes(CU.id))&&!['Done','Cancelled'].includes(t.status));
  // To review
  const rev=DB.tasks.filter(t=>(t.reviewer===CU.id||t.assignees?.includes(CU.id))&&t.status==='Pending Review');
  // Todos
  const td=DB.todos.filter(td=>(!td.assignedTo||td.assignedTo===CU.name||td.assignedTo===CU.id)&&td.status!=='Done'&&td.status!=='Cancelled');
  // Meetings today
  const myMeetings=DB.meetings.filter(m=>m.meeting_date===todayStr&&m.status==='Scheduled'&&(m.created_by===CU.name||m.invitees?.includes(CU.name)));
  // Service tests today (pending)
  const myTestScheds=DB.testSchedules.filter(s=>s.day_of_week===todayDow&&s.active!==false&&(s.member_id===CU.id||isAdmin()));
  const myTestsDone=DB.testSessions.filter(s=>s.test_date===todayStr&&(s.tester_id===CU.id||s.tester_name===CU.name)&&s.status==='Completed');
  const pendingTests=myTestScheds.filter(sch=>!myTestsDone.find(s=>s.operator_id===sch.operator_id));
  // All tasks count for admin
  const allActive=isAdmin()?DB.tasks.filter(t=>!['Done','Cancelled'].includes(t.status)).length:0;
  // Pending review count for admin
  const pendingRev=isAdmin()?DB.tasks.filter(t=>t.status==='Pending Review').length:rev.length;
  // Unread notifications
  const unread=notifs.filter(n=>{const rel=(n.to===CU.name)||(n.adminsOnly&&isAdmin());return rel&&!n.readBy?.includes(CU.name);}).length;

  function setBadge(id,count){const el=document.getElementById(id);if(el){el.textContent=count;el.style.display=count>0?'':'none';}}

  setBadge('nb1',mine.length);
  setBadge('nb2',pendingRev);
  setBadge('nb-td',td.length);
  setBadge('nb-mt',myMeetings.length);
  setBadge('nb-svct',pendingTests.length);
  setBadge('nb-at',allActive);
  setBadge('nb-pr',isAdmin()?DB.projects.filter(p=>p.status==='Active').length:0);
  setBadge('nb3',unread);
  // Help requests needing action:
  // - tasks of type Help Request assigned to me that are New/In Progress (I need to work them)
  // - help requests I sent that came back Pending Review (I need to accept/reject)
  const hrCount=DB.tasks.filter(t=>t.type==='Help Request'&&(
    ((t.assignedTo===CU?.id||(t.assignees||[]).includes(CU?.id))&&['New','In Progress'].includes(t.status))||
    (t.reqBy===CU?.name&&t.status==='Pending Review')
  )).length;
  setBadge('nb-hr',hrCount);
  // Unread reminders sent to me
  const rmCount=(DB.reminders||[]).filter(r=>(r.toId===CU?.id||r.toName===CU?.name)&&!r.read).length;
  setBadge('nb-rm',rmCount);
  // HR Communications — unread messages for HR/Admins, or pending replies for senders
  const hrcCount=(DB.hrComs||[]).filter(c=>{
    if((isHR()||isAdmin())&&!c.readByHR)return true;
    if((c.fromId===CU?.id||c.fromName===CU?.name)){const lastReply=(c.replies||[]).slice(-1)[0];return lastReply&&lastReply.fromId!==CU?.id&&!c.memberRead;}
    return false;
  }).length;
  setBadge('nb-hrc',hrcCount);
  // Announcements — unread for me
  const annCount=(DB.announcements||[]).filter(a=>{
    const forme=a.audience==='all'||(a.audienceIds||[]).includes(CU?.id)||(a.audienceIds||[]).includes(CU?.name)||isAdmin()||isHR();
    return forme&&!(a.readBy||[]).includes(CU?.id);
  }).length;
  setBadge('nb-ann',annCount);
  // Comments — unread comments on tasks I'm involved in (not by me)
  const cmCount=(()=>{
    let n=0;
    DB.tasks.forEach(t=>{
      const isMine=t.assignedTo===CU?.id||(t.assignees||[]).includes(CU?.id)||t.reviewer===CU?.id||t.createdBy===CU?.name;
      const iCommented=(t.comments||[]).some(c=>c.by===CU?.id);
      if(isMine||iCommented){
        (t.comments||[]).forEach(c=>{
          if(c.by!==CU?.id&&!(c.readBy||[]).includes(CU?.id)) n++;
        });
      }
    });
    return n;
  })();
  setBadge('nb-cm',cmCount);
  // Library access requests — red badge for admins
  if(isAdmin()){
    const libReqCount=getLibRequests().filter(r=>r.status==='Pending').length;
    const libBdg=document.getElementById('nb-lib');
    if(libBdg){libBdg.textContent=libReqCount;libBdg.style.display=libReqCount>0?'':'none';}
  }
}

function toggleND(){document.getElementById('nd').classList.toggle('open');}
function closeND(){document.getElementById('nd').classList.remove('open');}

// ══════════════════════════════════════════════════════
// CLOSE ON OUTSIDE CLICK
// ══════════════════════════════════════════════════════
document.querySelectorAll('.mo').forEach(o=>o.addEventListener('click',e=>{if(e.target===o)o.classList.remove('open');}));
document.addEventListener('click',e=>{
  const sp=document.getElementById('sp-pnl'),nd=document.getElementById('nd'),nb=document.querySelector('.nb-b');
  if(sp?.classList.contains('open')&&!sp.contains(e.target)){
    const isTrigger=e.target.closest('[onclick*="openTask"],[onclick*="openBacklog"],[onclick*="openDoc2"],[onclick*="openArcItem"],[onclick*="openSvcDetail"],[onclick*="openEntityDetail"],[onclick*="openMemberDetail"],[onclick*="openMemberReport"],[onclick*="openTodo"],tr.cl,.kb-card,.mc,.card[onclick],.stat');
    if(!isTrigger)closeSP();
  }
  if(nd?.classList.contains('open')&&!nd.contains(e.target)&&!nb?.contains(e.target))closeND();
});

// ══════════════════════════════════════════════════════
// INIT — decide which screen to show on load
// ══════════════════════════════════════════════════════
// ── Clock ──────────────────────────────────────────────
