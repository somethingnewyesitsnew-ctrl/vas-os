// §10 ── DASHBOARD ───────────────────────────────────────────────────────
function rDash(el){
  const todayStr=localDateStr();
  const todayDow=new Date().getDay();
  const now=new Date();

  // ── Core data aggregations ──────────────────────────────────────────
  const allTasks=DB.tasks;
  const activeTasks=allTasks.filter(t=>!['Done','Cancelled'].includes(t.status));
  const doneTasks=allTasks.filter(t=>t.status==='Done');
  const myTasks=isAdmin()?activeTasks:activeTasks.filter(t=>t.assignedTo===CU.id||t.assignees?.includes(CU.id));

  const overdue=activeTasks.filter(t=>getDueStatus(t).key==='overdue');
  const pendingRev=allTasks.filter(t=>t.status==='Pending Review');
  const newTasks=allTasks.filter(t=>t.status==='New');
  const inProg=allTasks.filter(t=>t.status==='In Progress');
  const rejected=allTasks.filter(t=>t.status==='Rejected');

  // ── KPI calculations ────────────────────────────────────────────────
  const taskCompletionRate=allTasks.length?Math.round(doneTasks.length/allTasks.length*100):0;
  const overdueRate=activeTasks.length?Math.round(overdue.length/activeTasks.length*100):0;

  // Avg cycle time from done tasks that have cycle_h
  const tasksWithCycle=doneTasks.filter(t=>t.cycleH&&t.cycleH>0);
  const avgCycleH=tasksWithCycle.length?Math.round(tasksWithCycle.reduce((a,t)=>a+t.cycleH,0)/tasksWithCycle.length):null;

  // Service health (from tests)
  const testChecks=DB.testChecks||[];
  const doneChecks=testChecks.filter(c=>c.result!=='pending');
  const passChecks=testChecks.filter(c=>c.result==='pass');
  const serviceHealth=doneChecks.length?Math.round(passChecks.length/doneChecks.length*100):null;

  // Meetings this week
  const weekStart=new Date(now); weekStart.setDate(now.getDate()-now.getDay());
  const weekEnd=new Date(weekStart); weekEnd.setDate(weekStart.getDate()+6);
  const weekMeetings=DB.meetings.filter(m=>{const d=new Date(m.meeting_date);return d>=weekStart&&d<=weekEnd;});
  const todayMeetings=DB.meetings.filter(m=>m.meeting_date===todayStr&&m.status==='Scheduled'&&(m.created_by===CU.name||m.invitees?.includes(CU.name)||isAdmin()));

  // Team utilization — % of members with active tasks
  const membersWithTasks=DB.team.filter(m=>activeTasks.some(t=>t.assignedTo===m.id||t.assignees?.includes(m.id))).length;
  const teamUtilization=DB.team.length?Math.round(membersWithTasks/DB.team.length*100):0;

  // Pipeline velocity — tasks completed in last 7 days
  const last7=new Date(now); last7.setDate(now.getDate()-7);
  const recentDone=doneTasks.filter(t=>t.tsReviewed&&new Date(t.tsReviewed)>=last7).length;

  let h='';

  if(!isAdmin()){
    // ── MEMBER VIEW ─────────────────────────────────────────────────
    const mine=activeTasks.filter(t=>t.assignedTo===CU.id||t.assignees?.includes(CU.id)||(t.assignedTo||'').toLowerCase()===CU.name.toLowerCase()||(t.assignees||[]).some(a=>(a||'').toLowerCase()===CU.name.toLowerCase()));
    const myDone=doneTasks.filter(t=>t.assignedTo===CU.id||t.assignees?.includes(CU.id)||(t.assignedTo||'').toLowerCase()===CU.name.toLowerCase());
    const myOverdue=mine.filter(t=>getDueStatus(t).key==='overdue');
    const myRev=allTasks.filter(t=>(t.reviewer===CU.id||(t.reviewer||'').toLowerCase()===CU.name.toLowerCase())&&t.status==='Pending Review');
    const myRate=mine.length+myDone.length?Math.round(myDone.length/(mine.length+myDone.length)*100):0;
    const myRejected=allTasks.filter(t=>(t.assignedTo===CU.id||(t.assignedTo||'').toLowerCase()===CU.name.toLowerCase())&&t.status==='Rejected').length;

    // Done this week / month
    const last7d=new Date(now);last7d.setDate(now.getDate()-7);
    const last30d=new Date(now);last30d.setDate(now.getDate()-30);
    const doneThisWeek=myDone.filter(t=>t.tsReviewed&&new Date(t.tsReviewed)>=last7d);
    const doneThisMonth=myDone.filter(t=>t.tsReviewed&&new Date(t.tsReviewed)>=last30d);
    const doneToday=myDone.filter(t=>t.tsReviewed&&localDateStr(new Date(t.tsReviewed))===todayStr);

    // ── Performance note ──────────────────────────────────────────
    function perfNote(rate,overdue,rejected,active,doneW){
      // Grade
      let grade,color,icon,note;
      if(rate>=90&&overdue===0)      {grade='Excellent';color='#15803d';icon='🌟';}
      else if(rate>=75&&overdue<=1)  {grade='Good';color='#2563eb';icon='✅';}
      else if(rate>=50)              {grade='Average';color='#d97706';icon='📈';}
      else if(active>0&&rate<30)     {grade='Needs focus';color='#dc2626';icon='⚠️';}
      else                           {grade='Getting started';color='#6366f1';icon='🚀';}

      // Build note text
      const lines=[];
      if(doneW>0) lines.push(`You completed ${doneW} task${doneW>1?'s':''} this week — great progress.`);
      if(overdue===0&&active>0) lines.push(`All ${active} active task${active>1?'s are':' is'} on track, no overdue items.`);
      if(overdue>0) lines.push(`${overdue} task${overdue>1?'s are':' is'} overdue — prioritise ${overdue>1?'these':'this'} first.`);
      if(rejected>0) lines.push(`${rejected} task${rejected>1?'s were':' was'} rejected — review the feedback carefully.`);
      if(rate>=80) lines.push(`Your ${rate}% completion rate is strong — keep it up.`);
      else if(rate>0&&rate<50) lines.push(`Completion rate is ${rate}% — breaking tasks into smaller steps may help.`);
      if(myRev.length>0) lines.push(`${myRev.length} task${myRev.length>1?'s are':' is'} waiting for your review.`);
      if(!lines.length) lines.push('No active tasks yet. Check All Tasks for new assignments.');

      return {grade,color,icon,note:lines.join(' ')};
    }
    const {grade,color,icon,note}=perfNote(myRate,myOverdue.length,myRejected,mine.length,doneThisWeek.length);

    // ── STAT CARDS ────────────────────────────────────────────────
    h+=`<div class="sg" style="margin-bottom:14px;overflow:hidden">
      <div class="stat" style="min-width:0;overflow:hidden" onclick="navTo('mytasks')"><div class="st-bar" style="background:#2563eb"></div><div class="st-lbl">My Active Tasks</div><div class="st-val" style="color:#2563eb">${mine.length}</div><div class="st-sub">${myDone.length} completed all-time</div></div>
      <div class="stat" style="min-width:0;overflow:hidden" onclick="navTo('mytasks','Overdue')"><div class="st-bar" style="background:${myOverdue.length?'#dc2626':'#15803d'}"></div><div class="st-lbl">Overdue</div><div class="st-val" style="color:${myOverdue.length?'#dc2626':'#15803d'}">${myOverdue.length}</div><div class="st-sub">${myOverdue.length?'needs attention':'all on track ✓'}</div></div>
      <div class="stat" style="min-width:0;overflow:hidden" onclick="navTo('toreview')"><div class="st-bar" style="background:#7c3aed"></div><div class="st-lbl">To Review</div><div class="st-val" style="color:#7c3aed">${myRev.length}</div><div class="st-sub">${myRev.length?'awaiting your review':'nothing pending'}</div></div>
      <div class="stat" style="min-width:0;overflow:hidden" onclick="navTo('alltasks')"><div class="st-bar" style="background:#15803d"></div><div class="st-lbl">Completion Rate</div><div class="st-val" style="color:#15803d">${myRate}%</div><div class="st-sub">${grade}</div></div>
    </div>`;

    // ── PERFORMANCE NOTE ─────────────────────────────────────────
    h+=`<div style="background:${color}12;border:1px solid ${color}33;border-radius:12px;padding:14px 16px;margin-bottom:14px;display:flex;gap:12px;align-items:flex-start">
      <div style="font-size:28px;flex-shrink:0;line-height:1">${icon}</div>
      <div>
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
          <span style="font-size:13px;font-weight:800;color:${color}">${grade}</span>
          <span style="font-size:10px;font-weight:700;background:${color}22;color:${color};padding:2px 8px;border-radius:20px">${myRate}% rate</span>
          ${doneThisWeek.length?`<span style="font-size:10px;font-weight:700;background:#15803d22;color:#15803d;padding:2px 8px;border-radius:20px">${doneThisWeek.length} done this week</span>`:''}
        </div>
        <div style="font-size:12px;color:var(--tx2);line-height:1.6">${note}</div>
      </div>
    </div>`;

    // ── BEST OF THE WEEK (visible to all members) ────────────────
    const bowStart=new Date();bowStart.setDate(bowStart.getDate()-6);
    const bowScores=DB.team.filter(m=>m.access!=='Admin'&&!FULL.includes(m.name)&&!AROLES.includes(m.role)).map(m=>{
      const doneW=DB.tasks.filter(t=>t.status==='Done'&&t.assignedTo===m.id&&t.tsReviewed&&new Date(t.tsReviewed)>=bowStart).length;
      const overdueW=DB.tasks.filter(t=>!['Done','Cancelled'].includes(t.status)&&t.assignedTo===m.id&&getDueStatus(t).key==='overdue').length;
      return{m,doneW,overdueW,score:doneW*3-overdueW*2};
    }).filter(x=>x.doneW>0||x.overdueW>0).sort((a,b)=>b.score-a.score);
    const bow=bowScores[0];
    if(bow){
      const bowNote=DB.tasks.filter(t=>t.status==='Done'&&t.assignedTo===bow.m.id&&t.tsReviewed&&new Date(t.tsReviewed)>=bowStart).slice(0,2).map(t=>t.title).join(' · ');
      h+=`<div onclick="openMemberDetail('${bow.m.id}')" style="display:flex;align-items:center;gap:12px;background:linear-gradient(135deg,#14532d18,#15803d12);border:1px solid #86efac50;border-radius:10px;padding:10px 14px;margin-bottom:12px;cursor:pointer">
        <span style="font-size:20px;flex-shrink:0">⭐</span>
        <div style="flex:1;min-width:0">
          <div style="font-size:10px;font-weight:800;color:#15803d;text-transform:uppercase;letter-spacing:.06em;margin-bottom:2px">Employee of the Week</div>
          <div style="display:flex;align-items:center;gap:7px">
            <span style="width:22px;height:22px;border-radius:50%;background:${bow.m.color};display:inline-flex;align-items:center;justify-content:center;font-size:8px;font-weight:800;color:#fff;flex-shrink:0">${bow.m.av}</span>
            <span style="font-size:13px;font-weight:800;color:var(--tx)">${esc(bow.m.name)}</span>
            <span style="font-size:11px;color:#15803d;font-weight:600">${bow.doneW} task${bow.doneW!==1?'s':''} done</span>
          </div>
          ${bowNote?`<div style="font-size:10px;color:var(--tx3);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${bowNote}</div>`:''}
        </div>
      </div>`;
    }

    // ── MEETING ATTENDANCE BANNER ────────────────────────────────
    const ms=getMeetingStats(CU.name,30);
    if(ms.invited.length>0||ms.upcoming.length>0){
      const hasMissed=ms.missed.length>0;
      const hasAttended=ms.attended.length>0;
      const bColor=ms.missed.length>0&&ms.attended.length===0?'#dc2626':ms.rate>=80?'#15803d':ms.rate>=50?'#d97706':'#dc2626';
      const bBg=ms.missed.length>0&&ms.attended.length===0?'#fef2f2':ms.rate>=80?'#f0fdf4':ms.rate>=50?'#fffbeb':'#fef2f2';
      const bBorder=ms.missed.length>0&&ms.attended.length===0?'#fca5a5':ms.rate>=80?'#86efac':ms.rate>=50?'#fde68a':'#fca5a5';
      // Build lines
      const mLines=[];
      if(ms.missed.length>0){
        mLines.push(`⚠️ You missed ${ms.missed.length} meeting${ms.missed.length>1?'s':''} in the last 30 days: ${ms.missed.map(m=>m.title).join(', ')}.`);
        mLines.push('Missing meetings affects your evaluation score. Please ensure you attend scheduled meetings.');
      }
      if(ms.attended.length>0&&ms.missed.length===0){
        mLines.push(`✅ Great job! You attended all ${ms.attended.length} meeting${ms.attended.length>1?'s':''} in the last 30 days.`);
        mLines.push('Your perfect attendance is reflected positively in your evaluation.');
      } else if(ms.attended.length>0&&ms.missed.length>0){
        mLines.push(`📅 You attended ${ms.attended.length} of ${ms.invited.length} meetings (${ms.rate}% attendance rate).`);
      }
      if(ms.upcoming.length>0){
        mLines.push(`📌 Upcoming: ${ms.upcoming.slice(0,3).map(m=>m.title+' on '+m.meeting_date).join(', ')}.`);
      }
      const mIcon=ms.rate===null?'📅':ms.rate===100?'🏆':ms.rate>=80?'✅':ms.rate>=50?'📉':'❌';
      h+=`<div style="background:${bBg};border:1px solid ${bBorder};border-left:4px solid ${bColor};border-radius:9px;padding:9px 13px;margin-bottom:10px;display:flex;align-items:center;gap:10px">
        <span style="font-size:18px;flex-shrink:0">${mIcon}</span>
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:7px;flex-wrap:wrap">
            <span style="font-size:12px;font-weight:700;color:${bColor}">Meetings</span>
            ${ms.rate!==null?`<span style="font-size:11px;font-weight:600;background:${bColor}18;color:${bColor};padding:1px 8px;border-radius:20px">${ms.rate}% · ${ms.attended.length}/${ms.invited.length}</span>`:''}
            <span style="font-size:11px;color:var(--tx3)">${mLines[0]||''}</span>
          </div>
          ${ms.missed.length?`<div style="margin-top:5px;display:flex;flex-wrap:wrap;gap:4px">${ms.missed.slice(0,3).map(m=>`<span onclick="openMeetingDetail('${m.id}')" style="background:#fef2f2;color:#dc2626;border:1px solid #fca5a5;font-size:9px;font-weight:700;padding:2px 7px;border-radius:20px;cursor:pointer">⚠ ${esc(m.title)}</span>`).join('')}</div>`:''}
        </div>
      </div>`;
    }

    // ── DONE WIDGET ───────────────────────────────────────────────
    h+=`<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;min-width:0;overflow:hidden">
      <div class="card" style="min-width:0;overflow:hidden">
        <div class="ct"><span class="ct-t">✅ Tasks Done</span></div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px">
          ${[{l:'Today',v:doneToday.length,c:'#2563eb',day:'today'},{l:'This Week',v:doneThisWeek.length,c:'#15803d',day:'week'},{l:'This Month',v:doneThisMonth.length,c:'#7c3aed',day:'month'}].map(({l,v,c,day})=>`
          <div onclick="window._navF='Done';window._navDay='${day}';navTo('alltasks')" style="background:${c}11;border:1px solid ${c}22;border-radius:8px;padding:12px;text-align:center;cursor:pointer" onmouseenter="this.style.filter='brightness(.96)'" onmouseleave="this.style.filter=''">
            <div style="font-size:26px;font-weight:800;color:${c};line-height:1">${v}</div>
            <div style="font-size:10px;font-weight:600;color:${c};margin-top:3px">${l}</div>
          </div>`).join('')}
        </div>
        ${doneThisWeek.length?`<div style="margin-top:4px">
          ${doneThisWeek.slice(0,4).map(t=>`<div onclick="openTask('${t.id}')" style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--bd);cursor:pointer">
            <span style="width:7px;height:7px;border-radius:50%;background:#15803d;flex-shrink:0"></span>
            <span style="flex:1;font-size:12px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(t.title)}</span>
            <span style="font-size:10px;color:var(--tx3);flex-shrink:0">${fr(t.tsReviewed)}</span>
          </div>`).join('')}
          ${doneThisWeek.length>4?`<div style="font-size:11px;color:var(--ac);margin-top:6px;cursor:pointer" onclick="navTo('archive')">+${doneThisWeek.length-4} more in Archive →</div>`:''}
        </div>`:
        `<div style="text-align:center;padding:12px 0;font-size:12px;color:var(--tx3)">No completed tasks this week yet</div>`}
      </div>

      <div class="card" style="min-width:0;overflow:hidden">
        <div class="ct"><span class="ct-t">📋 My Active Tasks</span></div>
        ${mine.length?mine.slice(0,6).map(t=>{const ds=getDueStatus(t);return`<div onclick="openTask('${t.id}')" style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--bd);cursor:pointer">
          ${spill(t.status)}
          <span style="flex:1;font-size:12px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(t.title)}</span>
          <span class="${ds.cls}" style="font-size:10px;flex-shrink:0">${ds.label}</span>
        </div>`;}).join('')+
        (mine.length>6?`<div style="font-size:11px;color:var(--ac);margin-top:8px;cursor:pointer" onclick="navTo('mytasks')">View all ${mine.length} tasks →</div>`:'')
        :`<div style="text-align:center;padding:20px 0;font-size:12px;color:var(--tx3)">No active tasks — you're all clear!</div>`}
      </div>
    </div>`;

    // ── TODAY'S MEETINGS ─────────────────────────────────────────
    if(todayMeetings.length){
      h+=`<div class="card" style="margin-bottom:12px"><div class="ct">📅 Today's Meetings</div>
        ${todayMeetings.map(m=>`<div onclick="openMeetingDetail('${m.id}')" style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--bd);cursor:pointer">
          <span style="font-size:15px;font-weight:800;color:var(--ac);width:46px;flex-shrink:0">${m.meeting_time||'—'}</span>
          <div><div style="font-size:13px;font-weight:600">${esc(m.title)}</div><div style="font-size:11px;color:var(--tx3)">${m.location||m.meeting_type||''} · ${m.duration_minutes||60}min</div></div>
          ${spill(m.status)}
        </div>`).join('')}
      </div>`;
    }

    el.innerHTML=h;
    return;
  }

  // ══════════════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════════
  // ADMIN DASHBOARD
  // ══════════════════════════════════════════════════════════════════

  // Projects health KPI
  const activeProj=DB.projects.filter(p=>p.status==='Active').length;
  const completedProj=DB.projects.filter(p=>p.status==='Completed').length;
  const onHoldProj=DB.projects.filter(p=>p.status==='On Hold').length;
  const projHealth=DB.projects.length?Math.round((completedProj*1+activeProj*0.5)/Math.max(DB.projects.length,1)*100):null;

  // ROW 1: KPI Cards
  h+=`<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px">
    <div onclick="navTo('alltasks')" style="background:linear-gradient(135deg,#1e40af,#2563eb);border-radius:12px;padding:16px;cursor:pointer;position:relative;overflow:hidden">
      <div style="position:absolute;right:-8px;top:-8px;font-size:60px;opacity:.07">📋</div>
      <div style="font-size:11px;font-weight:700;color:#93c5fd;text-transform:uppercase;letter-spacing:.07em;margin-bottom:5px">Completion Rate</div>
      <div style="font-size:38px;font-weight:800;color:#fff;line-height:1;margin-bottom:3px">${taskCompletionRate}%</div>
      <div style="font-size:12px;color:#bfdbfe">${doneTasks.length} done · ${activeTasks.length} active</div>
      <div style="height:3px;background:rgba(255,255,255,.2);border-radius:2px;margin-top:10px"><div style="height:100%;width:${taskCompletionRate}%;background:#60a5fa;border-radius:2px"></div></div>
    </div>
    <div onclick="navTo('alltasks','Overdue')" style="background:linear-gradient(135deg,${overdueRate>20?'#991b1b,#dc2626':overdueRate>5?'#92400e,#d97706':'#14532d,#16a34a'});border-radius:12px;padding:16px;cursor:pointer;position:relative;overflow:hidden">
      <div style="position:absolute;right:-8px;top:-8px;font-size:60px;opacity:.07">⚠</div>
      <div style="font-size:11px;font-weight:700;color:${overdueRate>20?'#fca5a5':overdueRate>5?'#fcd34d':'#86efac'};text-transform:uppercase;letter-spacing:.07em;margin-bottom:5px">Overdue Rate</div>
      <div style="font-size:38px;font-weight:800;color:#fff;line-height:1;margin-bottom:3px">${overdueRate}%</div>
      <div style="font-size:12px;color:rgba(255,255,255,.8)">${overdue.length} tasks overdue</div>
      <div style="font-size:12px;color:rgba(255,255,255,.6);margin-top:6px">${overdueRate<=5?'On Track':overdueRate<=20?'Watch':'Critical'}</div>
    </div>
    <div onclick="navTo('projects')" style="background:linear-gradient(135deg,${projHealth===null?'#374151,#4b5563':projHealth>=70?'#14532d,#15803d':projHealth>=40?'#92400e,#b45309':'#7f1d1d,#dc2626'});border-radius:12px;padding:16px;cursor:pointer;position:relative;overflow:hidden">
      <div style="position:absolute;right:-8px;top:-8px;font-size:60px;opacity:.07">◉</div>
      <div style="font-size:11px;font-weight:700;color:${projHealth===null?'#9ca3af':projHealth>=70?'#86efac':projHealth>=40?'#fcd34d':'#fca5a5'};text-transform:uppercase;letter-spacing:.07em;margin-bottom:5px">Projects Health</div>
      <div style="font-size:38px;font-weight:800;color:#fff;line-height:1;margin-bottom:3px">${projHealth!==null?projHealth+'%':'—'}</div>
      <div style="font-size:12px;color:rgba(255,255,255,.8)">${activeProj} active · ${completedProj} done</div>
      <div style="font-size:12px;color:rgba(255,255,255,.6);margin-top:6px">${projHealth===null?'No projects':projHealth>=70?'Healthy':projHealth>=40?'Monitor':'Attention'}</div>
    </div>
    <div onclick="navTo('svctest')" style="background:linear-gradient(135deg,${serviceHealth===null?'#374151,#4b5563':serviceHealth>=80?'#14532d,#15803d':serviceHealth>=60?'#92400e,#b45309':'#7f1d1d,#dc2626'});border-radius:12px;padding:16px;cursor:pointer;position:relative;overflow:hidden">
      <div style="position:absolute;right:-8px;top:-8px;font-size:60px;opacity:.07">🧪</div>
      <div style="font-size:11px;font-weight:700;color:${serviceHealth===null?'#9ca3af':serviceHealth>=80?'#86efac':serviceHealth>=60?'#fcd34d':'#fca5a5'};text-transform:uppercase;letter-spacing:.07em;margin-bottom:5px">Service Health</div>
      <div style="font-size:38px;font-weight:800;color:#fff;line-height:1;margin-bottom:3px">${serviceHealth!==null?serviceHealth+'%':'—'}</div>
      <div style="font-size:12px;color:rgba(255,255,255,.8)">${doneChecks.length} checks · ${passChecks.length} passed</div>
      <div style="font-size:12px;color:rgba(255,255,255,.6);margin-top:6px">${serviceHealth===null?'No tests':serviceHealth>=80?'All Good':serviceHealth>=60?'Some Issues':'Failing'}</div>
    </div>
  </div>`;

  // ROW 2: Task Status (8 boxes — everything)
  h+=`<div style="display:grid;grid-template-columns:repeat(8,1fr);gap:7px;margin-bottom:14px">
    ${[
      {l:'Total',v:allTasks.length,c:'#64748b',click:"navTo('alltasks')"},
      {l:'New',v:newTasks.length,c:'#94a3b8',click:"navTo('alltasks','New')"},
      {l:'In Progress',v:inProg.length,c:'#2563eb',click:"navTo('alltasks','In Progress')"},
      {l:'Review',v:pendingRev.length,c:'#7c3aed',click:"navTo('toreview')"},
      {l:'Done',v:doneTasks.length,c:'#15803d',click:"navTo('alltasks','Done')"},
      {l:'Rejected',v:rejected.length,c:'#dc2626',click:"navTo('alltasks','Rejected')"},
      {l:'Overdue',v:overdue.length,c:overdue.length?'#dc2626':'#15803d',click:"navTo('alltasks','Overdue')"},
      {l:'Done/7d',v:recentDone,c:'#0891b2',click:"navTo('alltasks','Done')"},
    ].map(({l,v,c,click})=>`<div onclick="${click}" style="background:var(--s);border:1px solid var(--bd);border-top:3px solid ${c};border-radius:9px;padding:11px 8px;cursor:pointer;text-align:center;transition:box-shadow .15s" onmouseenter="this.style.boxShadow='var(--shmd)'" onmouseleave="this.style.boxShadow=''">
      <div style="font-size:22px;font-weight:800;color:${c};line-height:1;margin-bottom:3px">${v}</div>
      <div style="font-size:10px;font-weight:600;color:var(--tx3)">${l}</div>
    </div>`).join('')}
  </div>`;

  // ROW 3 data prep
  const last30_d=new Date(now); last30_d.setDate(now.getDate()-30);
  const last30Done=doneTasks.filter(t=>t.tsReviewed&&new Date(t.tsReviewed)>=last30_d).length;
  const last30Created=allTasks.filter(t=>t.tsCreated&&new Date(t.tsCreated)>=last30_d).length;
  const todayDone=doneTasks.filter(t=>t.tsReviewed&&localDateStr(new Date(t.tsReviewed))===todayStr).length;
  const todayCreated=allTasks.filter(t=>t.tsCreated&&localDateStr(new Date(t.tsCreated))===todayStr).length;
  const day7=Array.from({length:7},(_,i)=>{
    const d=new Date(now);d.setDate(d.getDate()-(6-i));
    const ds=localDateStr(d);
    const label=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()];
    const created=allTasks.filter(t=>t.tsCreated&&localDateStr(new Date(t.tsCreated))===ds).length;
    const done=doneTasks.filter(t=>t.tsReviewed&&localDateStr(new Date(t.tsReviewed))===ds).length;
    return{ds,label,created,done,isToday:ds===todayStr};
  });
  const maxBar=Math.max(...day7.map(d=>Math.max(d.created,d.done)),1);
  const urg=activeTasks.filter(t=>t.priority==='Critical'||getDueStatus(t).key==='overdue').slice(0,5);
  const todayTests=DB.testSchedules.filter(s=>s.day_of_week===todayDow&&s.active!==false);
  const todayTestsDone2=DB.testSessions.filter(s=>s.test_date===todayStr&&s.status==='Completed');
  const weekStart7=new Date(now);weekStart7.setDate(now.getDate()-6);
  const weekMemberScores=DB.team.filter(m=>!isAdmin()||m.access!=='Admin').filter(m=>m.access!=='Admin'&&!FULL.includes(m.name)&&!AROLES.includes(m.role)).map(m=>{
    const mt=allTasks.filter(t=>t.assignedTo===m.id||t.assignees?.includes(m.id));
    const doneW=doneTasks.filter(t=>t.assignedTo===m.id&&t.tsReviewed&&new Date(t.tsReviewed)>=weekStart7).length;
    const overdueW=mt.filter(t=>getDueStatus(t).key==='overdue').length;
    const rejW=mt.filter(t=>t.status==='Rejected').length;
    const active=mt.filter(t=>!['Done','Cancelled'].includes(t.status)).length;
    return{m,doneW,overdueW,rejW,active,score:(doneW*3)-(overdueW*2)-rejW};
  }).filter(x=>x.active>0||x.doneW>0);
  const sortedW=[...weekMemberScores].sort((a,b)=>b.score-a.score);
  const bestW=sortedW[0];
  const worstW=sortedW[sortedW.length-1];

  // ROW 3 (NEW): Velocity + Today + This Week — 3 columns
  h+=`<div style="display:grid;grid-template-columns:2fr 1fr 1fr;gap:10px;margin-bottom:14px">

    <!-- VELOCITY -->
    <div class="card" style="min-width:0">
      <div class="ct"><span class="ct-t">⚡ Velocity</span></div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-bottom:12px">
        <div onclick="window._navF='All';window._navDay='today';navTo('alltasks')" style="background:#2563eb11;border:1px solid #2563eb22;border-radius:9px;padding:10px;text-align:center;cursor:pointer" onmouseenter="this.style.boxShadow='var(--shmd)'" onmouseleave="this.style.boxShadow=''">
          <div style="font-size:9px;font-weight:700;color:#2563eb;text-transform:uppercase;margin-bottom:3px">Created Today</div>
          <div style="font-size:26px;font-weight:800;color:#2563eb;line-height:1">${todayCreated}</div>
        </div>
        <div onclick="window._navF='Done';window._navDay='today';navTo('alltasks')" style="background:#15803d11;border:1px solid #15803d22;border-radius:9px;padding:10px;text-align:center;cursor:pointer" onmouseenter="this.style.boxShadow='var(--shmd)'" onmouseleave="this.style.boxShadow=''">
          <div style="font-size:9px;font-weight:700;color:#15803d;text-transform:uppercase;margin-bottom:3px">Done Today</div>
          <div style="font-size:26px;font-weight:800;color:#15803d;line-height:1">${todayDone}</div>
        </div>
        <div onclick="window._navF='Done';window._navDay='month';navTo('alltasks')" style="background:#7c3aed11;border:1px solid #7c3aed22;border-radius:9px;padding:10px;text-align:center;cursor:pointer" onmouseenter="this.style.boxShadow='var(--shmd)'" onmouseleave="this.style.boxShadow=''">
          <div style="font-size:9px;font-weight:700;color:#7c3aed;text-transform:uppercase;margin-bottom:3px">Done (30d)</div>
          <div style="font-size:26px;font-weight:800;color:#7c3aed;line-height:1">${last30Done}</div>
        </div>
      </div>
      <div style="font-size:10px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:5px">Last 7 Days</div>
      <div style="display:flex;align-items:flex-end;gap:4px;height:52px;margin-bottom:4px">
        ${day7.map(d=>`<div style="flex:1;display:flex;flex-direction:column;align-items:center;height:100%;justify-content:flex-end;gap:1px">
          <div title="Created: ${d.created}" style="width:100%;background:#2563eb${d.isToday?'':'66'};border-radius:2px 2px 0 0;height:${Math.round(d.created/maxBar*48)+2}px;min-height:${d.created?2:1}px"></div>
          <div title="Done: ${d.done}" style="width:100%;background:#15803d${d.isToday?'':'66'};border-radius:2px 2px 0 0;height:${Math.round(d.done/maxBar*48)+2}px;min-height:${d.done?2:1}px"></div>
        </div>`).join('')}
      </div>
      <div style="display:flex;gap:4px;margin-bottom:8px">
        ${day7.map(d=>`<div style="flex:1;text-align:center;font-size:9px;font-weight:${d.isToday?800:500};color:${d.isToday?'var(--ac)':'var(--tx3)'}">${d.label}</div>`).join('')}
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;padding-top:7px;border-top:1px solid var(--bd)">
        <div style="display:flex;gap:10px">
          <span style="display:flex;align-items:center;gap:4px;font-size:10px;color:var(--tx3)"><span style="width:8px;height:8px;background:#2563eb;border-radius:2px;display:inline-block"></span>Created</span>
          <span style="display:flex;align-items:center;gap:4px;font-size:10px;color:var(--tx3)"><span style="width:8px;height:8px;background:#15803d;border-radius:2px;display:inline-block"></span>Done</span>
        </div>
        <span onclick="window._navF='Done';window._navDay='month';navTo('alltasks')" style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;cursor:pointer;background:${last30Created>last30Done?'#fef2f2':'#f0fdf4'};color:${last30Created>last30Done?'#dc2626':'#15803d'};border:1px solid ${last30Created>last30Done?'#fca5a5':'#86efac'}">
          ${last30Created>last30Done?'▲ +':'▼ -'}${Math.abs(last30Created-last30Done)} net (30d) →
        </span>
      </div>
    </div>

    <!-- TODAY / UPCOMING -->
    <div class="card" style="min-width:0">
      <div class="ct"><span class="ct-t">📅 Today & Upcoming</span><span style="font-size:10px;color:var(--tx3)">${new Date().toLocaleDateString('en',{weekday:'short',day:'numeric',month:'short'})}</span></div>
      <div style="display:flex;gap:2px;margin-bottom:10px;padding:3px;background:var(--s2);border-radius:8px;width:fit-content">
        <div id="dash-today-tab" onclick="switchDashDayTab('today')" style="padding:4px 12px;font-size:11px;font-weight:700;cursor:pointer;border-radius:6px;background:var(--s);color:var(--tx);box-shadow:var(--sh)">Today</div>
        <div id="dash-upcoming-tab" onclick="switchDashDayTab('upcoming')" style="padding:4px 12px;font-size:11px;font-weight:700;cursor:pointer;border-radius:6px;color:var(--tx2)">Upcoming 10d</div>
      </div>
      <div id="dash-today-pane">
        ${todayMeetings.length?todayMeetings.slice(0,3).map(m=>`<div onclick="openMeetingDetail('${m.id}')" style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--bd);cursor:pointer">
          <div style="min-width:34px;text-align:center;flex-shrink:0;font-size:11px;font-weight:900;color:var(--ac)">${(m.meeting_time||'—').slice(0,5)}</div>
          <div style="flex:1;min-width:0">
            <div style="font-size:12px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">📅 ${esc(m.title)}</div>
            <div style="font-size:10px;color:var(--tx3)">${m.duration_minutes||60}min · ${m.meeting_type||''}</div>
          </div>
        </div>`).join(''):''}
        ${todayTests.length?todayTests.map(s=>{const op2=[...DB.operators,...DB.companies].find(o=>o.id===s.operator_id);const done2=todayTestsDone2.find(ts=>ts.operator_id===s.operator_id);return`<div style="display:flex;align-items:center;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--bd)">
          <div style="font-size:11px;font-weight:700">🧪 ${op2?.name||'Test'}</div>
          <span style="background:${done2?'#f0fdf4':'#fffbeb'};color:${done2?'#15803d':'#d97706'};border:1px solid ${done2?'#bbf7d0':'#fde68a'};font-size:9px;font-weight:700;padding:2px 7px;border-radius:20px">${done2?'✓':'Pending'}</span>
        </div>`;}).join(''):''}
        ${!todayMeetings.length&&!todayTests.length?`<div style="text-align:center;padding:16px 0"><div style="font-size:20px;margin-bottom:5px">✅</div><div style="font-size:11px;color:var(--tx3)">Nothing scheduled today</div></div>`:''}
      </div>
      <div id="dash-upcoming-pane" style="display:none">
        ${(()=>{
          const now10=new Date(); now10.setDate(now10.getDate()+10);
          const todayS=localDateStr();
          const endS=localDateStr(now10);
          const items=[];
          // Upcoming meetings
          DB.meetings.filter(m=>m.meeting_date>todayS&&m.meeting_date<=endS&&!['Completed','Cancelled'].includes(m.status)&&(m.created_by===CU.name||m.invitees?.includes(CU.name)||isAdmin()))
            .forEach(m=>items.push({date:m.meeting_date,icon:'📅',label:m.title,sub:m.meeting_time+(m.duration_minutes?' · '+m.duration_minutes+'min':''),click:`openMeetingDetail('${m.id}')`}));
          // Tasks due in next 10 days
          allTasks.filter(t=>t.due&&t.due>todayS&&t.due<=endS&&!['Done','Cancelled'].includes(t.status))
            .forEach(t=>items.push({date:t.due,icon:'📋',label:t.title,sub:(mn(t.assignedTo)||'Unassigned')+' · '+t.status,click:`openTask('${t.id}')`}));
          items.sort((a,b)=>a.date.localeCompare(b.date));
          if(!items.length)return`<div style="text-align:center;padding:16px 0;font-size:11px;color:var(--tx3)">Nothing coming up in the next 10 days</div>`;
          let lastDate='';
          return items.map(it=>{
            let dh='';
            if(it.date!==lastDate){
              lastDate=it.date;
              const dObj=new Date(it.date+'T00:00:00');
              const dLabel=dObj.toLocaleDateString('en',{weekday:'short',day:'numeric',month:'short'});
              dh=`<div style="font-size:10px;font-weight:800;color:var(--ac);text-transform:uppercase;letter-spacing:.06em;padding:6px 0 2px;margin-top:4px">${dLabel}</div>`;
            }
            return dh+`<div onclick="${it.click}" style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--bd);cursor:pointer">
              <span style="font-size:13px;flex-shrink:0">${it.icon}</span>
              <div style="flex:1;min-width:0">
                <div style="font-size:12px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${it.label}</div>
                <div style="font-size:10px;color:var(--tx3)">${it.sub}</div>
              </div>
            </div>`;
          }).join('');
        })()}
      </div>
    </div>

    <!-- THIS WEEK -->
    <div class="card" style="min-width:0">
      <div class="ct"><span class="ct-t">⭐ This Week</span></div>
      ${weekMemberScores.length>=2?`
        <div onclick="openMemberDetail('${bestW.m.id}')" style="display:flex;align-items:center;gap:9px;padding:8px 10px;background:#f0fdf4;border:1px solid #86efac;border-radius:9px;cursor:pointer;margin-bottom:7px">
          <span style="width:30px;height:30px;border-radius:50%;background:${bestW.m.color};display:inline-flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;color:#fff;flex-shrink:0">${bestW.m.av}</span>
          <div style="flex:1;min-width:0">
            <div style="font-size:10px;font-weight:800;color:#15803d;text-transform:uppercase;letter-spacing:.05em">🏆 Best</div>
            <div style="font-size:12px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(bestW.m.name)}</div>
            <div style="font-size:10px;color:#15803d">${bestW.doneW} done</div>
          </div>
          <div style="font-size:18px;font-weight:800;color:#15803d;flex-shrink:0">${bestW.score>0?'+':''}${bestW.score}</div>
        </div>
        <div onclick="openMemberDetail('${worstW.m.id}')" style="display:flex;align-items:center;gap:9px;padding:8px 10px;background:#fef2f2;border:1px solid #fca5a5;border-radius:9px;cursor:pointer">
          <span style="width:30px;height:30px;border-radius:50%;background:${worstW.m.color};display:inline-flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;color:#fff;flex-shrink:0">${worstW.m.av}</span>
          <div style="flex:1;min-width:0">
            <div style="font-size:10px;font-weight:800;color:#dc2626;text-transform:uppercase;letter-spacing:.05em">⚠ Focus</div>
            <div style="font-size:12px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(worstW.m.name)}</div>
            <div style="font-size:10px;color:#dc2626">${worstW.overdueW>0?worstW.overdueW+' overdue':''}${worstW.doneW===0?' 0 done':''}</div>
          </div>
          <div style="font-size:18px;font-weight:800;color:#dc2626;flex-shrink:0">${worstW.score>0?'+':''}${worstW.score}</div>
        </div>
      `:`<div style="padding:16px 0;text-align:center;font-size:12px;color:var(--tx3)">Not enough data</div>`}
    </div>
  </div>`;

  // ROW 4: Recent Activity + Needs Attention + Priority Risk — 3 columns
  h+=`<div style="display:grid;grid-template-columns:2fr 1fr 1fr;gap:10px;margin-bottom:14px">

    <!-- RECENT ACTIVITY — rich who-did-what feed -->
    <div class="card" style="min-width:0">
      <div class="ct"><span class="ct-t">🕐 Recent Activity</span></div>
      ${(()=>{
        const events=[];
        const memberColor=(name)=>{const m=DB.team.find(x=>x.name===name||(x.name||'').toLowerCase()===(name||'').toLowerCase());return m?m.color:'#64748b';};
        const memberAv=(name)=>{const m=DB.team.find(x=>x.name===name||(x.name||'').toLowerCase()===(name||'').toLowerCase());return m?m.av:(name||'?')[0].toUpperCase();};
        const avatar=(name,size=20)=>`<span style="width:${size}px;height:${size}px;border-radius:50%;background:${memberColor(name)};display:inline-flex;align-items:center;justify-content:center;font-size:${Math.round(size*.38)}px;color:#fff;font-weight:800;flex-shrink:0">${memberAv(name)}</span>`;

        // ── From syslog (task actions, logins, reminders) ──
        syslog.slice(0,60).forEach(e=>{
          let icon='📋',color='#64748b',text='',targetId=null,targetType=null;
          const a=e.actor||'';
          switch(e.action){
            case'Login': icon='🔐';color='#2563eb';text=`<strong>${a}</strong> logged in`;break;
            case'Task Created': icon='➕';color='#2563eb';text=`<strong>${a}</strong> created <em>${e.event?.replace('Task created: ','')}</em>`;break;
            case'Task Submitted': icon='📤';color='#7c3aed';text=`<strong>${a}</strong> submitted <em>${e.event?.match(/"([^"]+)"/)?.[1]||''}</em> for review`;break;
            case'Approved': icon='✅';color='#15803d';text=`<strong>${a}</strong> approved <em>${e.event?.match(/"([^"]+)"/)?.[1]||''}</em>`;break;
            case'Rejected': icon='❌';color='#dc2626';text=`<strong>${a}</strong> rejected <em>${e.event?.match(/"([^"]+)"/)?.[1]||''}</em>`;break;
            case'Re-Estimated': icon='⏱';color='#d97706';text=`<strong>${a}</strong> re-estimated <em>${e.event?.match(/"([^"]+)"/)?.[1]||''}</em>`;break;
            case'Help Requested': icon='🤝';color='#ea580c';text=`<strong>${a}</strong> requested help — ${e.event?.replace('Help requested:','').trim()}`;break;
            case'Reminder Sent': icon='🔔';color='#7c3aed';text=`<strong>${a}</strong> reminded ${e.event?.match(/reminded (.+?) about/)?.[1]||'someone'}`;break;
            case'Re-Estimated': icon='⏱';color='#d97706';text=`<strong>${a}</strong> re-estimated a task`;break;
            case'Delete': icon='🗑';color='#dc2626';text=`<strong>${a}</strong> deleted ${e.event||'an item'}`;break;
            default: icon='📋';color='#64748b';text=`<strong>${a}</strong> — ${e.action}`;
          }
          if(text) events.push({ts:e.at,icon,color,text,targetId,targetType,actor:a});
        });

        // ── Task timeline events ───────────────────────────
        allTasks.forEach(t=>{
          (t.timeline||[]).forEach(ev=>{
            let icon='📋',color='#64748b',text='';
            if(ev.type==='help_requested'){icon='🤝';color='#ea580c';text=`<strong>${ev.by}</strong> requested help from ${ev.helpMember||'?'} on <em>${esc(t.title)}</em>`;}
            else if(ev.type==='help_received'){icon='✅';color='#15803d';text=`<strong>${ev.by}</strong> accepted help from ${ev.helperName||'?'} — <em>${esc(t.title)}</em> continues`;}
            else{icon='📋';color='#64748b';text=`<strong>${ev.by||'?'}</strong> — ${ev.event} on <em>${esc(t.title)}</em>`;}
            events.push({ts:ev.at,icon,color,text,targetId:t.id,targetType:'task',actor:ev.by||''});
          });
          // Task status changes derived from timestamps
          if(t.tsStarted) events.push({ts:t.tsStarted,icon:'▶',color:'#2563eb',text:`<strong>${mn(t.assignedTo)||'?'}</strong> started <em>${esc(t.title)}</em>`,targetId:t.id,targetType:'task',actor:mn(t.assignedTo)||''});
          if(t.tsSubmitted) events.push({ts:t.tsSubmitted,icon:'📤',color:'#7c3aed',text:`<strong>${mn(t.assignedTo)||'?'}</strong> submitted <em>${esc(t.title)}</em> for review`,targetId:t.id,targetType:'task',actor:mn(t.assignedTo)||''});
          if(t.tsReviewed&&t.status==='Done') events.push({ts:t.tsReviewed,icon:'✅',color:'#15803d',text:`<strong>${mn(t.reviewer)||'Admin'}</strong> approved <em>${esc(t.title)}</em>`,targetId:t.id,targetType:'task',actor:mn(t.reviewer)||''});
        });

        // ── Meetings ──────────────────────────────────────
        DB.meetings.forEach(m=>{
          const ts=m.ended_at||m.created_at||m.meeting_date;
          const creator=m.created_by||'?';
          const status=m.status;
          const icon=status==='Completed'?'✅':status==='Cancelled'?'❌':'📅';
          const color=status==='Completed'?'#15803d':status==='Cancelled'?'#dc2626':'#2563eb';
          const label=status==='Completed'?'completed meeting':'scheduled meeting';
          events.push({ts,icon,color,text:`<strong>${creator}</strong> ${label} <em>${esc(m.title)}</em>`,targetId:m.id,targetType:'meeting',actor:creator});
          // Attendance events
          Object.entries(m.attendance||{}).forEach(([name,status])=>{
            if(status==='present') events.push({ts:m.ended_at||m.meeting_date,icon:'👋',color:'#2563eb',text:`<strong>${name}</strong> attended <em>${esc(m.title)}</em>`,targetId:m.id,targetType:'meeting',actor:name});
          });
        });

        // ── Reminders from DB ─────────────────────────────
        (DB.reminders||[]).forEach(r=>{
          events.push({ts:r.at,icon:'🔔',color:'#7c3aed',text:`<strong>${r.fromName||'?'}</strong> reminded <strong>${r.toName||'?'}</strong>${r.taskTitle?' about <em>'+r.taskTitle+'</em>':''}`,targetId:r.taskId,targetType:'task',actor:r.fromName||''});
        });

        // Sort by timestamp, take top 12
        events.sort((a,b)=>new Date(b.ts||0)-new Date(a.ts||0));
        const top=events.filter(e=>e.ts).slice(0,12);

        if(!top.length) return`<div style="padding:16px 0;text-align:center;font-size:12px;color:var(--tx3)">No activity yet</div>`;

        return top.map(ev=>`<div onclick="${ev.targetType==='task'&&ev.targetId?`openTask('${ev.targetId}')`:ev.targetType==='meeting'&&ev.targetId?`openMeetingDetail('${ev.targetId}')`:''}" style="display:flex;align-items:flex-start;gap:8px;padding:6px 0;border-bottom:1px solid var(--bd);cursor:${ev.targetId?'pointer':'default'}">
          <span style="font-size:13px;flex-shrink:0;line-height:1.5">${ev.icon}</span>
          <div style="flex:1;overflow:hidden;min-width:0">
            <div style="font-size:12px;color:var(--tx);line-height:1.4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(ev.text)}</div>
            <div style="font-size:10px;color:var(--tx3);margin-top:1px">${fr(ev.ts)}</div>
          </div>
        </div>`).join('');
      })()}
    </div>

    <!-- NEEDS ATTENTION -->
    <div class="card" style="min-width:0">
      <div class="ct"><span class="ct-t">🚨 Attention</span><span style="font-size:10px;color:var(--tx3)">${urg.length}</span></div>
      ${urg.length===0?`<div style="padding:16px 0;text-align:center;font-size:12px;color:var(--g);font-weight:600">✓ All clear</div>`:
        urg.map(t=>{const ds2=getDueStatus(t);return`<div onclick="openTask('${t.id}')" style="display:flex;align-items:center;gap:7px;padding:7px 0;border-bottom:1px solid var(--bd);cursor:pointer">
          <span class="${ds2.cls}" style="font-size:9px;flex-shrink:0;white-space:nowrap">${ds2.label}</span>
          <div style="flex:1;overflow:hidden;min-width:0"><div style="font-size:11px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(t.title)}</div><div style="font-size:10px;color:var(--tx3)">${mn(t.assignedTo)||'—'}</div></div>
        </div>`;}).join('')}
    </div>

    <!-- PRIORITY RISK -->
    <div class="card" style="min-width:0">
      <div class="ct"><span class="ct-t">🎯 Priority Risk</span></div>
      <div style="display:flex;flex-direction:column;gap:7px;margin-bottom:10px">
        ${[{l:'Critical',c:'#be123c',v:activeTasks.filter(t=>t.priority==='Critical').length},
           {l:'High',c:'#c2410c',v:activeTasks.filter(t=>t.priority==='High').length},
           {l:'Medium',c:'#b45309',v:activeTasks.filter(t=>t.priority==='Medium').length},
           {l:'Low',c:'#15803d',v:activeTasks.filter(t=>t.priority==='Low').length}
        ].map(({l,c,v})=>`<div onclick="navTo('alltasks')" style="cursor:pointer">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px">
            <span style="font-size:11px;font-weight:700;color:${c}">${l}</span>
            <span style="font-size:13px;font-weight:800;color:${c}">${v}</span>
          </div>
          <div style="height:5px;background:${c}18;border-radius:3px"><div style="height:100%;width:${activeTasks.length?Math.round(v/activeTasks.length*100):0}%;background:${c};border-radius:3px"></div></div>
        </div>`).join('')}
      </div>
      ${(()=>{
        const crit=activeTasks.filter(t=>t.priority==='Critical').length;
        const high=activeTasks.filter(t=>t.priority==='High').length;
        const med=activeTasks.filter(t=>t.priority==='Medium').length;
        const score=crit*4+high*2+med+overdue.length*3;
        const max=Math.max(score,50);
        const risk=score>=30?'Critical':score>=15?'High':score>=5?'Medium':'Low';
        const rc={Critical:'#dc2626',High:'#c2410c',Medium:'#b45309',Low:'#15803d'}[risk];
        return`<div style="background:var(--s2);border-radius:8px;padding:9px;border:1px solid var(--bd)">
          <div style="font-size:10px;font-weight:700;color:var(--tx3);margin-bottom:5px;text-transform:uppercase">Overall Risk</div>
          <div style="display:flex;align-items:center;gap:8px">
            <div style="flex:1;height:7px;background:var(--bd);border-radius:4px;overflow:hidden">
              <div style="height:100%;width:${Math.min(Math.round(score/max*100),100)}%;background:${rc};border-radius:4px"></div>
            </div>
            <span style="font-size:12px;font-weight:800;color:${rc};flex-shrink:0">${risk}</span>
          </div>
        </div>`;
      })()}
    </div>
  </div>`;

  // ROW 4b: Team Load widget (full width)
  const teamLoad=DB.team.map(m=>{
    const mt2=activeTasks.filter(t=>t.assignedTo===m.id||t.assignees?.includes(m.id));
    const criticalL=mt2.filter(t=>t.priority==='Critical').length;
    const highL=mt2.filter(t=>t.priority==='High').length;
    const overdueL=mt2.filter(t=>getDueStatus(t).key==='overdue').length;
    return{m,count:mt2.length,criticalL,highL,overdueL};
  }).filter(x=>x.count>0).sort((a,b)=>b.count-a.count);
  const maxLoad=Math.max(...teamLoad.map(x=>x.count),1);
  h+=`<div class="card" style="margin-bottom:14px">
    <div class="ct"><span class="ct-t">👥 Team Load</span><span style="font-size:11px;color:var(--tx3)">${activeTasks.length} active tasks across ${teamLoad.length} member${teamLoad.length!==1?'s':''}</span></div>
    ${teamLoad.length===0?`<div style="padding:16px;text-align:center;font-size:13px;color:var(--tx3)">No active task assignments</div>`:`
    <div style="display:flex;flex-direction:column;gap:8px">
      ${teamLoad.map(({m,count,criticalL,highL,overdueL})=>{
        const pct=Math.round(count/maxLoad*100);
        const loadColor=count>=6?'#dc2626':count>=4?'#c2410c':count>=2?'#b45309':'#15803d';
        const loadLabel=count>=6?'Overloaded':count>=4?'High':count>=2?'Moderate':'Light';
        return`<div onclick="openMemberDetail('${m.id}')" style="display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:9px;background:var(--s2);cursor:pointer;border:1px solid var(--bd);transition:box-shadow .15s" onmouseenter="this.style.boxShadow='var(--shmd)'" onmouseleave="this.style.boxShadow=''">
          <span style="width:32px;height:32px;border-radius:50%;background:${m.color};display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;color:#fff;flex-shrink:0">${m.av}</span>
          <div style="flex:1;min-width:0">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
              <span style="font-size:13px;font-weight:700;color:var(--tx)">${esc(m.name)}</span>
              <div style="display:flex;align-items:center;gap:6px;flex-shrink:0">
                ${criticalL?`<span style="background:#fdf2f4;color:#be123c;border:1px solid #fca5a5;font-size:9px;font-weight:800;padding:2px 6px;border-radius:10px">🔴 ${criticalL}</span>`:''}
                ${highL?`<span style="background:#fff7f3;color:#c2410c;border:1px solid #fed7aa;font-size:9px;font-weight:800;padding:2px 6px;border-radius:10px">🟠 ${highL}</span>`:''}
                ${overdueL?`<span style="background:#fef2f2;color:#dc2626;border:1px solid #fca5a5;font-size:9px;font-weight:800;padding:2px 6px;border-radius:10px">⚠ ${overdueL}</span>`:''}
                <span style="background:${loadColor}15;color:${loadColor};border:1px solid ${loadColor}30;font-size:10px;font-weight:700;padding:3px 8px;border-radius:20px">${count} tasks</span>
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:8px">
              <div style="flex:1;height:6px;background:var(--bd);border-radius:3px;overflow:hidden">
                <div style="height:100%;width:${pct}%;background:${loadColor};border-radius:3px;transition:width .4s"></div>
              </div>
              <span style="font-size:10px;font-weight:700;color:${loadColor};flex-shrink:0;min-width:60px;text-align:right">${loadLabel}</span>
            </div>
          </div>
        </div>`;
      }).join('')}
    </div>`}
  </div>`;

  // ROW 5: Operations (full width)
  const liveServices=DB.services.filter(s=>s.status==='Live').length;
  h+=`<div class="card" style="margin-bottom:14px">
    <div class="ct"><span class="ct-t">Operations Overview</span></div>
    <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:10px">
      ${[
        {icon:'📡',label:'Operators',val:DB.operators.length,sub:DB.operators.filter(o=>o.status==='Active'||!o.status).length+' active',click:"navTo('operators')"},
        {icon:'◐',label:'Services',val:DB.services.length,sub:liveServices+' live',click:"navTo('services')"},
        {icon:'◉',label:'Projects',val:DB.projects.length,sub:activeProj+' active',click:"navTo('projects')"},
        {icon:'🏢',label:'Companies',val:DB.companies.length,sub:'',click:"navTo('companies')"},
        {icon:'👥',label:'Team',val:DB.team.length,sub:membersWithTasks+' active',click:"navTo('team')"},
      ].map(({icon,label,val,sub,click})=>`<div onclick="${click}" style="background:var(--s2);border:1px solid var(--bd);border-radius:10px;padding:16px;cursor:pointer;text-align:center;transition:box-shadow .15s" onmouseenter="this.style.boxShadow='var(--shmd)'" onmouseleave="this.style.boxShadow=''">
        <div style="font-size:24px;margin-bottom:6px">${icon}</div>
        <div style="font-size:24px;font-weight:800;color:var(--tx);line-height:1;margin-bottom:3px">${val}</div>
        <div style="font-size:13px;font-weight:600;color:var(--tx2)">${label}</div>
        ${sub?`<div style="font-size:11px;color:var(--tx3);margin-top:2px">${sub}</div>`:''}
      </div>`).join('')}
    </div>
  </div>`;

  // ROW 6: Team Performance (full width)
  const teamPerf=DB.team.map(m=>{
    const mt=allTasks.filter(t=>t.assignedTo===m.id||t.assignees?.includes(m.id));
    const active=mt.filter(t=>!['Done','Cancelled'].includes(t.status)).length;
    done=mt.filter(t=>t.status==='Done').length;
    const od=mt.filter(t=>getDueStatus(t).key==='overdue').length;
    const inrev=mt.filter(t=>t.status==='Pending Review').length;
    const recent_d=mt.filter(t=>t.tsReviewed&&new Date(t.tsReviewed)>=last30_d&&t.status==='Done').length;
    const rate=mt.length?Math.round(done/mt.length*100):0;
    return{m,active,done,od,inrev,recent_d,rate,tot:mt.length};
  }).sort((a,b)=>b.active-a.active);

  h+=`<div class="card">
    <div class="ct"><span class="ct-t">Team Performance</span><span onclick="navTo('team')" style="font-size:12px;color:var(--ac);cursor:pointer;font-weight:600">View team →</span></div>
    <div class="tw"><table>
      <thead><tr><th>Member</th><th>Role</th><th>Active</th><th>Done (30d)</th><th>Overdue</th><th>Review</th><th>Rate</th><th>Load</th></tr></thead>
      <tbody>
        ${teamPerf.map(({m,active,done,od,inrev,recent_d,rate})=>`<tr class="cl" onclick="openMemberDetail('${m.id}')">
          <td><span style="display:flex;align-items:center;gap:8px">
            <span style="width:28px;height:28px;border-radius:50%;background:${m.color};display:inline-flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#fff;flex-shrink:0">${m.av}</span>
            <span style="font-size:13px;font-weight:700">${esc(m.name)}</span>
          </span></td>
          <td style="font-size:12px;color:var(--tx3)">${m.role}</td>
          <td><span style="font-size:16px;font-weight:800;color:${active>=5?'#dc2626':active>=2?'#b45309':'var(--tx)'}">${active}</span></td>
          <td style="font-size:14px;font-weight:700;color:var(--g)">${recent_d}</td>
          <td style="${od>0?'color:#dc2626;font-weight:700':'color:var(--tx3)'}">${od>0?'⚠ '+od:'—'}</td>
          <td style="${inrev>0?'color:#7c3aed;font-weight:700':'color:var(--tx3)'}">${inrev>0?inrev+'⏳':'—'}</td>
          <td><div style="display:flex;align-items:center;gap:6px">
            <div style="width:52px;height:5px;background:var(--s2);border-radius:3px;overflow:hidden">
              <div style="height:100%;width:${rate}%;background:${rate>=70?'#15803d':rate>=40?'#b45309':'#dc2626'};border-radius:3px"></div>
            </div>
            <span style="font-size:12px;font-weight:700;color:${rate>=70?'#15803d':rate>=40?'#b45309':'#dc2626'}">${rate}%</span>
          </div></td>
          <td><span style="background:${active>=5?'#fef2f2':active>=3?'#fffbeb':'#f0fdf4'};color:${active>=5?'#dc2626':active>=3?'#b45309':'#15803d'};font-size:11px;font-weight:700;padding:3px 9px;border-radius:20px;border:1px solid ${active>=5?'#fca5a5':active>=3?'#fcd34d':'#86efac'}">${active>=5?'High':active>=3?'Med':'Low'}</span></td>
        </tr>`).join('')}
      </tbody>
    </table></div>
  </div>`;



  el.innerHTML=h;
}


// ══════════════════════════════════════════════════════
// DUE STATUS — colour-coded progress indicator
// ══════════════════════════════════════════════════════
function getDueStatus(tk){
  if(!tk.due) return {key:'none',label:'No date',cls:'ds-none'};
  done=['Done','Cancelled'].includes(tk.status);
  const dueMs=new Date(tk.due).setHours(23,59,59,999);
  const nowMs=Date.now();
  const diffDays=Math.round((dueMs-nowMs)/(1000*60*60*24));

  if(done){
    // Compare completion date against due date
    const compDate=tk.tsArchived||tk.tsReviewed;
    if(compDate){
      const compMs=new Date(compDate).getTime();
      const earlyDays=Math.round((dueMs-compMs)/(1000*60*60*24));
      if(earlyDays>0) return {key:'done-early',label:`✓ ${earlyDays}d early`,cls:'ds-early'};
      if(earlyDays===0) return {key:'done-ontime',label:'✓ On time',cls:'ds-ontime'};
      return {key:'done-late',label:`✓ ${Math.abs(earlyDays)}d late`,cls:'ds-late'};
    }
    return {key:'done-ontime',label:'✓ Done',cls:'ds-ontime'};
  }

  if(diffDays<0) return {key:'overdue',label:`${Math.abs(diffDays)}d overdue`,cls:'ds-overdue'};
  if(diffDays===0) return {key:'today',label:'Due today',cls:'ds-today'};
  if(diffDays<=2) return {key:'soon',label:`${diffDays}d left`,cls:'ds-soon'};
  return {key:'ok',label:`${diffDays}d left`,cls:'ds-ok'};
}

// ══════════════════════════════════════════════════════
// TASK TABLES
// ══════════════════════════════════════════════════════
