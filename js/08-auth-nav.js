// §08 ── AUTH — LOGIN / LOGOUT / NAV ────────────────────────────────────
async function doLogin(){
  const uname=document.getElementById('lu').value.trim().toLowerCase();
  const pass=document.getElementById('lp').value;
  const remember=document.getElementById('l-remember')?.checked;
  const errEl=document.getElementById('lerr');
  errEl.style.display='none';
  if(!uname){errEl.textContent='Enter your username';errEl.style.display='block';return;}
  if(!pass){errEl.textContent='Enter your password';errEl.style.display='block';return;}

  const found=DB.team.find(m=>{
    const u=(m.username||'').toLowerCase();
    const firstName=m.name.toLowerCase().split(' ')[0];
    const fullName=m.name.toLowerCase().replace(/\s+/g,'');
    return u===uname || firstName===uname || fullName===uname || m.name.toLowerCase()===uname;
  });
  if(!found){
    errEl.textContent=`No user found for "${uname}". Try your first name`;
    errEl.style.display='block';return;
  }
  const lbtn=document.getElementById('lbtn')||document.querySelector('.lbtn');
  if(lbtn){lbtn.textContent='Signing in…';lbtn.disabled=true;}
  // Password check happens server-side via a SECURITY DEFINER RPC — the
  // `password` column is not selectable from the client at all anymore
  // (team_public excludes it, and RLS blocks direct table reads), so
  // this is the only way to verify a login. No local fallback password.
  const ok=await sbRpc('verify_login',{p_member_id:found.id,p_password:pass});
  if(lbtn){lbtn.textContent='Sign In';lbtn.disabled=false;}
  if(ok!==true){
    errEl.textContent='Incorrect password';
    errEl.style.display='block';return;
  }
  // Save credentials if remember me checked
  if(remember){
    localStorage.setItem('vas_remember',JSON.stringify({u:uname,p:pass}));
  } else {
    localStorage.removeItem('vas_remember');
  }
  CU={...found};
  if(FULL.includes(CU.name)||AROLES.includes(CU.role))CU.access='Admin';
  // last_login is stamped by verify_login() itself on success — just
  // reflect it locally so the UI doesn't need another round trip.
  CU.lastLogin=new Date().toISOString();
  const dbm=DB.team.find(m=>m.id===CU.id);if(dbm)dbm.lastLogin=CU.lastLogin;
  logAction('Login',`${esc(CU.name)} logged in`,'Info');
  startApp();
}
function buildQuickBtns(){}

async function startApp(){
  document.getElementById('login').style.display='none';
  document.getElementById('app').classList.add('on');
  const av=document.getElementById('sav');
  av.textContent=CU.av; av.style.background=CU.color; av.style.width='26px'; av.style.height='26px'; av.style.fontSize='9px';
  document.getElementById('sun').textContent=CU.name;
  document.getElementById('sur').textContent=CU.role;
  // Apply nav visibility based on role + member type permissions
  if(!isAdmin()){
    // Management/Operations section headers stay hidden here for the
    // first pass (before permOverrides/memberType are confirmed fresh
    // from Supabase below) — Team/Eval/Backlog/Operators/Companies remain
    // admin-only regardless, but Projects/Services can open up per-member,
    // so their section headers get re-evaluated in the second pass.
    ['sec-mgmt','sec-ops','nav-pr','nav-tm','nav-ev','nav-bl','nav-sv','nav-op','nav-co','nav-st']
      .forEach(id=>{const el=document.getElementById(id);if(el)el.style.display='none';});
    // Always show own tasks + meetings + comments + archive + docs —
    // these 4 (plus reminders, already unconditional) show a personal
    // "your own things" view for everyone by default; canDoStrict below
    // only controls whether they ALSO see everyone else's, decided inside
    // each page's own render function rather than at the nav level.
    ['nav-at','nav-mt','nav-mo','nav-cm','nav-arc','nav-doc'].forEach(id=>{const el=document.getElementById(id);if(el)el.style.display='';});
    // Hide or show based on member type permission
    const showIf=(navId,perm)=>{const el=document.getElementById(navId);if(el)el.style.display=canDo(perm)?'':'none';};
    showIf('nav-hrc','hrComs');
    showIf('nav-ann','announcements');
    showIf('nav-hr','hrComs');
    showIf('nav-svct','svcTest');
    // Projects/Services/Library are opt-in only — admin must explicitly
    // grant them (per member type or an individual override), no
    // permissive fallback for an unset type.
    const showIfStrict=(navId,perm)=>{const el=document.getElementById(navId);if(el)el.style.display=canDoStrict(perm)?'':'none';};
    showIfStrict('nav-lib','library');
    showIfStrict('nav-pr','projects');
    showIfStrict('nav-sv','services');
    if(canDoStrict('projects')){const el=document.getElementById('sec-mgmt');if(el)el.style.display='';}
    if(canDoStrict('services')){const el=document.getElementById('sec-ops');if(el)el.style.display='';}
  } else {
    // Admin — show everything (all start hidden in HTML)
    ['sec-mgmt','sec-ops','nav-at','nav-pr','nav-tm','nav-ev','nav-bl','nav-sv','nav-op','nav-co','nav-st','nav-mt','nav-mo','nav-hrc','nav-ann','nav-hr','nav-doc','nav-arc','nav-svct','nav-lib','nav-cm']
      .forEach(id=>{const el=document.getElementById(id);if(el)el.style.display='';});
  }
  document.getElementById('content').innerHTML='<div class="loading-sc"><div class="loader"></div><div class="loading-tx">Loading data…</div></div>';
  // Reload full data now that we are logged in
  const ok=await loadFromNotion();
  if(!ok){ loadDemoData(); }
  // Re-sync CU with actual Supabase member record
  const found2=DB.team.find(m=>sameName(m.name,CU.name));
  if(found2) CU={...CU,...found2,color:found2.color||CU.color,av:found2.av||CU.av,memberType:found2.memberType||CU.memberType||'',permOverrides:found2.permOverrides||CU.permOverrides||{},autoRemindersActive:found2.autoRemindersActive!==false};
  // Re-apply nav now that memberType/permOverrides are loaded fresh from DB
  if(!isAdmin()){
    // Always show own tasks + meetings + comments + archive + docs (they
    // start hidden in HTML) — see first-pass comment above for why.
    ['nav-at','nav-mt','nav-mo','nav-cm','nav-arc','nav-doc'].forEach(id=>{const el=document.getElementById(id);if(el)el.style.display='';});
    const showIf2=(navId,perm)=>{const el2=document.getElementById(navId);if(el2)el2.style.display=canDo(perm)?'':'none';};
    showIf2('nav-hrc','hrComs'); showIf2('nav-ann','announcements');
    showIf2('nav-hr','hrComs'); showIf2('nav-svct','svcTest');
    const showIf2Strict=(navId,perm)=>{const el2=document.getElementById(navId);if(el2)el2.style.display=canDoStrict(perm)?'':'none';};
    showIf2Strict('nav-lib','library');
    showIf2Strict('nav-pr','projects');
    showIf2Strict('nav-sv','services');
    const secMgmt=document.getElementById('sec-mgmt');if(secMgmt)secMgmt.style.display=canDoStrict('projects')?'':'none';
    const secOps=document.getElementById('sec-ops');if(secOps)secOps.style.display=canDoStrict('services')?'':'none';
  }
  document.getElementById('sav').textContent=CU.av;
  document.getElementById('sav').style.background=CU.color;
  document.getElementById('sur').textContent=CU.role;
  // Load persisted log (30 days) and merge with in-memory
  const storedLog=getPersistedLog();
  if(storedLog.length>syslog.length){
    const existingIds=new Set(syslog.map(e=>e.id));
    storedLog.forEach(e=>{if(!existingIds.has(e.id))syslog.push(e);});
    syslog.sort((a,b)=>new Date(b.at)-new Date(a.at));
    syslog=syslog.slice(0,2000);
  }

  // Each of these is independent — wrapped individually so a single bad
  // step (e.g. a malformed record tripping an exception in tutorial/alert
  // strip/reminders) can't silently prevent everything after it from ever
  // running. Before this, one uncaught throw here meant push registration
  // and the Realtime notification subscription below never fired for that
  // login session — the member would see nothing live and get no push,
  // while every other member with clean data was unaffected. Errors are
  // still logged to the console so real bugs stay visible.
  const safe=(label,fn)=>{ try{ fn(); }catch(e){ console.error('startApp step failed:',label,e); } };
  safe('loadNotifs',()=>loadNotifs());
  safe('updateBadges',()=>updateBadges());
  safe('loadFormLists',()=>loadFormLists());
  safe('buildAlertStrip',()=>buildAlertStrip());
  safe('initCommsData',()=>initCommsData()); // load HR coms + announcements from localStorage after DB is ready
  safe('checkFirstTimeTutorial',()=>checkFirstTimeTutorial());
  safe('nav dash',()=>nav('dash', document.querySelector('[data-p="dash"]')));

  // Handle deep link: #task-{id}
  const hash=window.location.hash;
  if(hash.startsWith('#task-')){
    const tid=hash.replace('#task-','');
    // Wait long enough for DB to be fully populated
    setTimeout(()=>openTaskDeepLink(tid), 800);
  }
  safe('startReminderChecker',()=>startReminderChecker());
  safe('startAutoTaskReminders',()=>startAutoTaskReminders());
  safe('autoBackupIfNeeded',()=>autoBackupIfNeeded());
  safe('startAutoReload',()=>startAutoReload());
  // Push notifications — always register the service worker. The soft
  // one-time enable prompt itself is only auto-fired here for returning
  // users (tutorial already completed); first-time users get it chained
  // right after the tutorial finishes instead (see 25-tutorial.js), so
  // the tutorial and the notification prompt never fight for the screen.
  safe('registerPushSW',()=>{
    if(typeof registerPushSW==='function'){
      registerPushSW().then(()=>{
        const tutorialAlreadyDone=!!localStorage.getItem('vas_tut_done_'+(CU?.id||'guest'));
        if(tutorialAlreadyDone&&typeof maybeShowPushPrompt==='function') setTimeout(maybeShowPushPrompt,1200);
      }).catch(e=>console.error('registerPushSW failed:',e));
    }
  });
  safe('renderPushStatusPill',()=>{ if(typeof renderPushStatusPill==='function') renderPushStatusPill(); });
  // Self-heal the team.push_enabled flag against this device's actual
  // subscription state — fixes Team cards showing "Off" for members who
  // are genuinely subscribed but did so before push_enabled existed, or
  // whose browser silently re-subscribed them.
  safe('syncPushEnabledState',()=>{ if(typeof syncPushEnabledState==='function') syncPushEnabledState(); });
  // Live delivery for notifications (submits, approvals, mentions, help
  // requests, etc.) — see startRealtimeNotifs in 07-notify-log.js for why
  // this exists and what it's scoped to.
  safe('startRealtimeNotifs',()=>{ if(typeof startRealtimeNotifs==='function') startRealtimeNotifs(); });
}

// Opens a #task-{id} deep link (from an OS push notification, an in-app
// notification, or a shared link) — access-checked, then routes to All
// Tasks and opens the task panel. Shared by the initial page-load hash
// handler above and by the "app already open" postMessage handler in
// 01-push-notifications.js, so both paths behave identically.
// Always fetches the current row from Supabase first (rather than trusting
// whatever's already in local DB.tasks) — this is what actually fixes a
// notification click landing on a stale copy of the task, where a submit
// or a new comment silently isn't there until a manual refresh.
async function openTaskDeepLink(tid){
  if(typeof fetchAndUpsertTask==='function') await fetchAndUpsertTask(tid);
  const t=DB.tasks.find(x=>x.id===tid);
  if(!t){toast('Task not found','bad');return;}

  // Access check — compare by id AND name to handle both storage formats
  const myId=CU.id, myName=(CU.name||'').toLowerCase();
  const isAssigned=t.assignedTo===myId||((t.assignedTo||'').toLowerCase()===myName)
    ||(t.assignees||[]).some(a=>a===myId||((a||'').toLowerCase()===myName));
  const isReviewer=t.reviewer===myId||((t.reviewer||'').toLowerCase()===myName);
  // A member who was @mentioned in a comment on this task should also be
  // able to follow the notification link in, even if they're not otherwise
  // assigned/reviewing/admin — otherwise the mention notification points
  // straight at an Access Denied wall.
  const isMentioned=(t.comments||[]).some(c=>(c.mentions||[]).includes(CU.id));
  const allowed=isAdmin()||isAssigned||isReviewer||isMentioned;

  if(!allowed){
    nav('dash',document.querySelector('[data-p="dash"]'));
    setTimeout(()=>openSP('Access Denied','',`
      <div style="text-align:center;padding:40px 20px">
        <div style="font-size:40px;margin-bottom:12px">🔒</div>
        <div style="font-size:15px;font-weight:700;margin-bottom:8px">You don't have access to this task</div>
        <div style="font-size:12px;color:var(--tx3);line-height:1.6">This link is only accessible to the assigned member and admins.</div>
      </div>`),100);
    return;
  }

  // Navigate to All Tasks then open the task panel
  const atEl=document.querySelector('[data-p="alltasks"]');
  nav('alltasks', atEl);
  setTimeout(()=>openTask(tid), 300);
}
window.openTaskDeepLink=openTaskDeepLink;

// ── Smart auto-reload ─────────────────────────────────────────────────
// Reloads data every 15 min, but only when tab is visible and user is idle
function startAutoReload(){
  const INTERVAL=15*60*1000; // 15 minutes
  let lastActivity=Date.now();

  // Track user activity
  ['click','keydown','mousemove','touchstart','scroll'].forEach(ev=>{
    document.addEventListener(ev,()=>{lastActivity=Date.now();},{passive:true});
  });

  setInterval(async()=>{
    // Skip if tab is hidden (user switched away)
    if(document.hidden) return;
    // Skip if user was active in the last 2 minutes (they're using the app, real-time handles updates)
    if(Date.now()-lastActivity<2*60*1000) return;

    // Silent full reload
    const ok=await loadFromNotion();
    if(ok){
      updateBadges();
      buildAlertStrip();
      // Re-render current page silently if content area exists
      smartRerender(page, document.getElementById('content'));
    }
  }, INTERVAL);
} // end startApp

// ── Todo reminder checker ─────────────────────────────────────────────
// ── Automatic Task Reminders (admin-configurable) ─────────────────────
// A second, independent reminder layer on top of the 30-second checker
// below — this one is admin-controlled (global on/off + how often, set
// in Settings) and can be turned off for individual members. It focuses
// specifically on due-date-driven signals the other checker doesn't
// cover: new/unopened tasks, overdue tasks, and tasks due soon, rolled
// into one consolidated ping per interval rather than one per task.
// Like the checker below, this only runs in an open browser tab — there
// is no server-side always-on scheduler behind it.
function startAutoTaskReminders(){
  if(!AUTO_REM_CFG?.enabled) return;
  if(CU?.autoRemindersActive===false) return;
  const intervalMs=Math.max(1,AUTO_REM_CFG.interval_hours||4)*3600000;

  function checkAndSend(){
    if(!CU||!DB.tasks) return;
    const LAST_KEY='vas_auto_rem_last_'+CU.id;
    const last=parseInt(localStorage.getItem(LAST_KEY)||'0');
    if(Date.now()-last<intervalMs) return;

    const myTasks=DB.tasks.filter(t=>(t.assignedTo===CU.id||(t.assignees||[]).includes(CU.id))&&!['Done','Cancelled'].includes(t.status));
    const newUnopened=myTasks.filter(t=>t.status==='New'&&!t.tsOpened);
    const overdue=myTasks.filter(t=>getDueStatus(t).key==='overdue');
    const nearDue=myTasks.filter(t=>['today','soon'].includes(getDueStatus(t).key));

    localStorage.setItem(LAST_KEY,String(Date.now()));
    if(!newUnopened.length&&!overdue.length&&!nearDue.length) return; // nothing to say this round

    const lines=[];
    if(newUnopened.length)lines.push(`📥 ${newUnopened.length} new task${newUnopened.length>1?'s':''} not opened yet`);
    if(overdue.length)lines.push(`🚨 ${overdue.length} overdue task${overdue.length>1?'s':''}`);
    if(nearDue.length)lines.push(`⏰ ${nearDue.length} task${nearDue.length>1?'s':''} due soon`);

    sendNotif(CU.name,`Task check-in: ${lines.join(' · ')}`,'Reminder','');
    notifyTG(CU.id,'default',{desc:`⏰ *Task Reminder*\n\nHi ${CU.name}!\n\n${lines.join('\n')}\n\nOpen the app to review.`,link:appLink('')});
  }

  checkAndSend(); // run once immediately on login
  // Re-check well inside the configured interval so a long-open tab (or
  // one opened partway through the window) still catches up promptly —
  // checkAndSend() itself is what actually gates on the real interval.
  setInterval(checkAndSend, Math.min(intervalMs, 30*60*1000));
}

function startReminderChecker(){
  const FIRED_KEY='vas_reminded_'+CU?.name;
  const fired=new Set(JSON.parse(localStorage.getItem(FIRED_KEY)||'[]'));

  const SVC_TEST_FIRED_KEY='vas_svctest_fired_'+new Date().toISOString().split('T')[0];
  const svcTestFired=new Set(JSON.parse(localStorage.getItem(SVC_TEST_FIRED_KEY)||'[]'));

  function checkReminders(){
    if(!CU||!DB.todos)return;
    const now2=new Date();
    const myTodos=DB.todos.filter(td=>(td.owner||td.assignedTo||'')===(CU?.name||''));
    myTodos.forEach(td=>{
      if(!td.reminder||td.status==='Done'||fired.has(td.id))return;
      const remTime=new Date(td.reminder);
      if(remTime<=now2){
        fired.add(td.id);
        localStorage.setItem(FIRED_KEY,JSON.stringify([...fired]));
        const reminderToast=document.createElement('div');
        reminderToast.className='ts inf';
        reminderToast.style.cssText='cursor:pointer';
        reminderToast.innerHTML=`⏰ <strong>Reminder:</strong> ${esc(td.title)}<div style="font-size:10px;opacity:.7;margin-top:2px">Click to open</div>`;
        reminderToast.onclick=()=>{navTo('todos');reminderToast.remove();};
        document.getElementById('ts-stk').appendChild(reminderToast);
        setTimeout(()=>{reminderToast.style.opacity='0';reminderToast.style.transform='translateX(14px)';reminderToast.style.transition='all .3s';setTimeout(()=>reminderToast.remove(),300);},30000);
        sendNotif(CU.name,`⏰ Todo reminder: "${td.title}"${td.due?' · Due '+fd(td.due):''}`, 'Mention', td.title);
        const nb=document.getElementById('nb-td');
        if(nb){nb.style.animation='none';setTimeout(()=>nb.style.animation='',50);}
      }
    });

    // ── Auto task reminders ──────────────────────────────────────────
    const TASK_REM_KEY='vas_task_rem_'+CU?.id+'_'+new Date().toISOString().split('T')[0];
    const taskRemFired=new Set(JSON.parse(localStorage.getItem(TASK_REM_KEY)||'[]'));
    function saveTaskRemFired(){localStorage.setItem(TASK_REM_KEY,JSON.stringify([...taskRemFired]));}
    const myActiveTasks=DB.tasks.filter(t=>(t.assignedTo===CU?.id||(t.assignees||[]).includes(CU?.id))&&['New','In Progress'].includes(t.status));
    myActiveTasks.forEach(t=>{
      // 1. Not opened after 2 hours
      if(t.status==='New'&&t.tsCreated&&!t.tsOpened){
        const minsOld=Math.floor((Date.now()-new Date(t.tsCreated))/60000);
        if(minsOld>=120&&!taskRemFired.has('notopened_'+t.id)){
          taskRemFired.add('notopened_'+t.id);saveTaskRemFired();
          sendNotif(CU.name,`⏰ Task not opened: "${t.title}" assigned ${Math.floor(minsOld/60)}h ago`,'Reminder',t.title);
          notifyTG(CU.id,'default',{desc:`⏰ *Task Not Started*\n\nHi ${CU.name}!\n\n"${t.title}" was assigned ${Math.floor(minsOld/60)}h ago and hasn't been opened.\n\nPlease open and start it.`,link:''});
          toast(`⏰ "${t.title.slice(0,30)}" not opened yet`,'warn',8000);
        }
      }
      // 2. Open more than 12 hours
      if(t.status==='In Progress'&&t.tsStarted){
        const hrsOpen=Math.floor((Date.now()-new Date(t.tsStarted))/3600000);
        if(hrsOpen>=12&&!taskRemFired.has('open12_'+t.id)){
          taskRemFired.add('open12_'+t.id);saveTaskRemFired();
          sendNotif(CU.name,`⚠️ Task open ${hrsOpen}h: "${t.title}"`,'Reminder',t.title);
          notifyTG(CU.id,'default',{desc:`⚠️ *Task Duration Alert*\n\nHi ${CU.name}!\n\n"${t.title}" has been in progress for ${hrsOpen} hours.\n\nPlease submit or update.`,link:''});
          toast(`⚠️ "${t.title.slice(0,30)}" open ${hrsOpen}h`,'warn',8000);
        }
      }
      // 3. Over estimate
      if(t.status==='In Progress'&&t.est&&t.tsStarted){
        const hrsActual=(Date.now()-new Date(t.tsStarted))/3600000;
        if(hrsActual>t.est&&!taskRemFired.has('overest_'+t.id)){
          taskRemFired.add('overest_'+t.id);saveTaskRemFired();
          const over=Math.round((hrsActual-t.est)*10)/10;
          sendNotif(CU.name,`🚨 "${t.title}" is ${over}h over ${t.est}h estimate`,'Reminder',t.title);
          notifyTG(CU.id,'default',{desc:`🚨 *Over Estimate*\n\nHi ${CU.name}!\n\n"${t.title}" exceeded its estimate.\n⏱ Est: ${t.est}h | Actual: ${Math.round(hrsActual*10)/10}h (+${over}h)\n\nConsider submitting or re-estimating.`,link:''});
          toast(`🚨 "${t.title.slice(0,30)}" ${over}h over estimate`,'warn',8000);
        }
      }
    });

    // ── Service test reminders + task creation ───────────────────────
    // Task creation runs BROAD: triggered by ANY team member's app load,
    // for ALL schedules due today — not just the logged-in member's own.
    // This means a due test always gets its task+notification created
    // even if the assigned member never opens the app that day, as long
    // as someone on the team does. Personal nudge reminders (tomorrow /
    // 8am / noon) stay scoped to the assigned member's own device, since
    // they're just supplementary heads-ups, not the source of truth.
    if(DB.testSchedules?.length){
      const todayDow=new Date().getDay();
      const todayStr=new Date().toISOString().split('T')[0];
      const tomorrowDow=new Date(Date.now()+86400000).getDay();
      const tomorrowStr=new Date(Date.now()+86400000).toISOString().split('T')[0];
      const hr=new Date().getHours();
      const allTodayScheds=DB.testSchedules.filter(s=>s.day_of_week===todayDow&&s.active!==false);
      const myScheds=allTodayScheds.filter(s=>s.member_id===CU?.id);
      const tomorrowScheds=DB.testSchedules.filter(s=>s.day_of_week===tomorrowDow&&s.active!==false&&s.member_id===CU?.id);
      const defaultReviewerId=DB.team.find(t=>t.name==='Aymen')?.id||null;

      // Tomorrow reminder (self only)
      tomorrowScheds.forEach(s=>{
        const remKey='tomorrow_'+s.id+'_'+tomorrowStr;
        if(!svcTestFired.has(remKey)){
          svcTestFired.add(remKey);localStorage.setItem(SVC_TEST_FIRED_KEY,JSON.stringify([...svcTestFired]));
          const op=[...DB.operators,...DB.companies].find(o=>o.id===s.operator_id);
          notifyTG(CU.id,'default',{desc:`📅 *Test Reminder — Tomorrow*\n\nHi ${CU.name}! You have a service test TOMORROW.\n\n🏢 Operator: ${op?.name||'?'}\n📅 ${tomorrowStr}\n\nBe ready to complete all test items.`,link:''});
          sendNotif(CU.name,`Service test tomorrow: ${op?.name||'?'}`,'Mention','Service Test');
          toast(`📅 Service test tomorrow: ${op?.name||''}`,'inf',8000);
        }
      });

      // Task creation (broad — any schedule due today, any member)
      allTodayScheds.forEach(s=>{
        const m=DB.team.find(t=>t.id===s.member_id);
        if(!m)return;
        const op=[...DB.operators,...DB.companies].find(o=>o.id===s.operator_id);
        const opName=op?.name||'?';

        const taskKey='task_'+s.id+'_'+todayStr;
        if(!svcTestFired.has(taskKey)){
          const hasTask=DB.tasks.some(t=>t.title?.includes('Service Test')&&t.assignedTo===m.id&&t.due===todayStr&&(t.operator===s.operator_id||t.desc?.includes(opName)));
          if(!hasTask){
            svcTestFired.add(taskKey);localStorage.setItem(SVC_TEST_FIRED_KEY,JSON.stringify([...svcTestFired]));
            const opSvcs=(DB.services||[]).filter(sv=>sv.operator_name===opName||(sv.company_id||sv.operator_id)===s.operator_id).map(sv=>sv.name).join(', ')||'All services';
            const checks=getCheckTemplates().map((c,i)=>`${i+1}. ${c}`).join('\n');
            const reviewerId=s.reviewer_id||defaultReviewerId;
            const newTask={
              id:'t'+gid(),title:`Service Test — ${opName} (${todayStr})`,
              status:'New',priority:'High',type:'Service Test',
              assignedTo:m.id,assignees:[m.id],reviewer:reviewerId,
              reqBy:'System',createdBy:'System',due:todayStr,est:null,actual:null,
              operator:s.operator_id,service:null,
              desc:`🧪 Service Test Task\n\n🏢 Operator: ${opName}\n📡 Services: ${opSvcs}\n📅 Date: ${todayStr}\n\n✅ Test Items:\n${checks}\n\nClick ▶ Set Estimate & Start below — it'll take you straight into the checklist for each service. Mark each item working or fail, add a note if something's broken. Any fails you flag get turned into tasks automatically.`,
              link:'',recur:null,tsCreated:now(),tsOpened:null,tsStarted:null,
              tsSubmitted:null,tsReviewed:null,tsArchived:null,
              what:'',tech:'',rejReason:'',rejections:[],comments:[]
            };
            DB.tasks.unshift(newTask);
            nCreateTask(newTask,newTask.id).then(r=>{if(r?.id)newTask.id=r.id;});
            updateBadges();
            notifyTG(m.id,'task_assigned',{title:newTask.title,priority:'High',due:todayStr,desc:newTask.desc,link:appLink('task-'+newTask.id)});
            sendNotif(m.name,`New task assigned: "${newTask.title}" — High priority`,'Task Assigned',newTask.title);
            if(reviewerId){
              const rev=DB.team.find(t=>t.id===reviewerId);
              if(rev&&rev.id!==m.id){
                sendNotif(rev.name,`You are reviewer for new task: "${newTask.title}" (assigned to ${m.name})`,'Task Assigned',newTask.title);
                notifyTG(rev.id,'review_requested',{title:newTask.title,priority:'High',link:appLink('task-'+newTask.id)});
              }
            }
            if(m.id===CU?.id) toast(`🧪 Test task created: ${opName}`,'ok',8000);
          }
        }
      });

      // Same-day personal nudges (self only — supplementary to the task's own due-date reminders)
      myScheds.forEach(s=>{
        const op=[...DB.operators,...DB.companies].find(o=>o.id===s.operator_id);
        const opName=op?.name||'?';
        const alreadyDone=DB.testSessions?.some(ts=>ts.test_date===todayStr&&ts.tester_id===CU?.id&&ts.operator_id===s.operator_id&&ts.status==='Completed');
        if(alreadyDone)return;

        // 8am reminder
        const key8=`8am_${s.id}_${todayStr}`;
        if(hr>=8&&hr<9&&!svcTestFired.has(key8)){
          svcTestFired.add(key8);localStorage.setItem(SVC_TEST_FIRED_KEY,JSON.stringify([...svcTestFired]));
          notifyTG(CU.id,'default',{desc:`🌅 *Good Morning — Test Reminder*\n\nHi ${CU.name}!\n\nYou have a service test to complete today.\n\n🏢 Operator: ${opName}\n📅 ${todayStr}\n\nPlease complete all test items and submit for review.`,link:''});
          toast(`🧪 8am: Service test due today — ${opName}`,'inf',10000);
        }
        // 12pm reminder
        const key12=`12pm_${s.id}_${todayStr}`;
        if(hr>=12&&hr<13&&!svcTestFired.has(key12)){
          svcTestFired.add(key12);localStorage.setItem(SVC_TEST_FIRED_KEY,JSON.stringify([...svcTestFired]));
          notifyTG(CU.id,'default',{desc:`⏰ *Noon Reminder — Test Pending*\n\nHi ${CU.name}! You still have a pending service test.\n\n🏢 Operator: ${opName}\n⏰ Please complete before end of day.`,link:''});
          toast(`⏰ 12pm: Test still pending — ${opName}`,'warn',10000);
        }
      });
    }
  }

  checkReminders(); // run once immediately
  setInterval(checkReminders, 30000);
}

function doLogout(){logAction('Logout',`${esc(CU.name)} logged out`,'Info');if(typeof stopRealtimeNotifs==='function')stopRealtimeNotifs();CU=null;document.getElementById('app').classList.remove('on');document.getElementById('login').style.display='flex';}

// ══════════════════════════════════════════════════════
// DEMO DATA (fallback when offline)
// ══════════════════════════════════════════════════════
function loadDemoData(){
  const pw='abohamood@1.';
  DB.team=[
    {id:'u1',name:'Aziz',role:'CEO',dept:'Management',access:'Admin',status:'Active',email:'aziz@vas.sd',wa:'+249911000001',color:'#4f46e5',av:'AZ',notes:'',username:'aziz',password:pw},
    {id:'u2',name:'Aymen',role:'Projects Manager',dept:'Management',access:'Admin',status:'Active',email:'aymen@vas.sd',wa:'',color:'#7c3aed',av:'AY',notes:'',username:'aymen',password:pw},
    {id:'u3',name:'Maysa',role:'HR Manager',dept:'Management',access:'Admin',status:'Active',email:'maysa@vas.sd',wa:'',color:'#b45309',av:'MA',notes:'',username:'maysa',password:pw},
    {id:'u4',name:'Al Khateeb',role:'Super Senior Developer',dept:'Engineering',access:'Member',status:'Active',email:'khateeb@vas.sd',wa:'+249911000004',color:'#0369a1',av:'AK',notes:'',username:'alkhateeb',password:pw},
    {id:'u5',name:'Abd Allah Hisham',role:'Senior Developer',dept:'Engineering',access:'Member',status:'Active',email:'ab@vas.sd',wa:'',color:'#0369a1',av:'AB',notes:'',username:'abdallah',password:pw},
    {id:'u6',name:'Tibyan',role:'Front End Designer',dept:'Design',access:'Member',status:'Active',email:'tibyan@vas.sd',wa:'',color:'#be185d',av:'TI',notes:'',username:'tibyan',password:pw},
    {id:'u7',name:'Roa',role:'Content Manager',dept:'Content',access:'Member',status:'Active',email:'roa@vas.sd',wa:'',color:'#047857',av:'RO',notes:'',username:'roa',password:pw},
    {id:'u8',name:'Ahmed Al Tayef',role:'Sys Admin',dept:'Engineering',access:'Member',status:'Active',email:'ahmed@vas.sd',wa:'',color:'#374151',av:'AT',notes:'',username:'ahmed',password:pw},
    {id:'u9',name:'Hussam Adil',role:'Developer',dept:'Engineering',access:'Member',status:'Active',email:'hussam@vas.sd',wa:'',color:'#0369a1',av:'HA',notes:'',username:'hussam',password:pw},
    {id:'u10',name:'TR',role:'Developer',dept:'Engineering',access:'Member',status:'Active',email:'tr@vas.sd',wa:'',color:'#0369a1',av:'TR',notes:'',username:'tr',password:pw},
  ];
  DB.services=[{id:'s1',name:'Zaytoon',cat:'Content',status:'Live',desc:'Arabic content on Zain Sudan'},{id:'s2',name:'Coursat Plus',cat:'Education',status:'Live',desc:'Online education on MTN'},{id:'s3',name:'Qawafi',cat:'Entertainment',status:'Live',desc:'Arabic poetry on Sudani'},{id:'s4',name:'Games Club',cat:'Gaming',status:'Live',desc:'Mobile gaming on MTN'},{id:'s5',name:'Booktown',cat:'Books',status:'Live',desc:'Digital books on Sudani'}];
  DB.operators=[{id:'o1',name:'Zain Sudan',type:'Telecom Operator',country:'Sudan',status:'Active',contact:'Zain Tech',email:'tech@zain.sd',phone:'+249156000000',notes:''},{id:'o2',name:'MTN Sudan',type:'Telecom Operator',country:'Sudan',status:'Active',contact:'MTN Partners',email:'partners@mtn.sd',phone:'+249924000000',notes:''},{id:'o3',name:'Sudani',type:'Telecom Operator',country:'Sudan',status:'Active',contact:'Sudani Business',email:'biz@sudani.sd',phone:'+249181000000',notes:''}];
  DB.companies=[{id:'c1',name:'Arab Soft',type:'Partner',country:'Sudan',contact:'Mohammed Ali',email:'m.ali@arabsoft.sd',notes:'Tech partner'},{id:'c2',name:'Digital Bridge',type:'Client',country:'UAE',contact:'Sarah Hassan',email:'s.hassan@digitalbridge.ae',notes:'UAE client'}];
  DB.tasks=[
    {id:'t1',title:'Build Qawafi Android app',status:'In Progress',priority:'Critical',type:'Feature',assignedTo:'u4',reviewer:'u2',service:'s3',operator:'o3',reqBy:'Aziz',due:'2026-03-20',est:40,actual:null,what:'',tech:'',rejReason:'',tsCreated:'2026-02-15T09:00:00Z',tsOpened:'2026-02-15T09:47:00Z',tsStarted:'2026-02-15T10:30:00Z',tsSubmitted:null,tsReviewed:null,tsArchived:null,rejections:[],desc:'Full Android app for Qawafi. Poem browsing, submission, rating, poet profiles.',respH:0.8,workH:null,revH:null,cycleH:null},
    {id:'t2',title:'Booktown full-text search',status:'Pending Review',priority:'High',type:'Feature',assignedTo:'u5',reviewer:'u4',service:'s5',operator:'o3',reqBy:'Aymen',due:'2026-03-12',est:12,actual:13,what:'Elasticsearch done. Arabic analyzer working. Demo at /booktown/search on staging.',tech:'ES 8.x with Arabic analyzer. Index rebuilt nightly via cron.',rejReason:'',tsCreated:'2026-03-01T08:00:00Z',tsOpened:'2026-03-01T08:22:00Z',tsStarted:'2026-03-01T09:15:00Z',tsSubmitted:'2026-03-13T16:00:00Z',tsReviewed:null,tsArchived:null,rejections:[],desc:'Elasticsearch for Arabic book search.',respH:0.4,workH:55,revH:null,cycleH:null},
    {id:'t3',title:'Server security audit',status:'New',priority:'Critical',type:'Maintenance',assignedTo:'u8',reviewer:'u4',service:'s4',operator:'o1',reqBy:'Aziz',due:'2026-03-15',est:null,actual:null,what:'',tech:'',rejReason:'',tsCreated:'2026-03-08T09:00:00Z',tsOpened:null,tsStarted:null,tsSubmitted:null,tsReviewed:null,tsArchived:null,rejections:[],desc:'Full audit of all production endpoints.',respH:null,workH:null,revH:null,cycleH:null},
    {id:'t4',title:'Fix Coursat iOS video crash',status:'Done',priority:'Critical',type:'Bug Fix',assignedTo:'u5',reviewer:'u4',service:'s2',operator:'o2',reqBy:'Aziz',due:'2026-02-05',est:6,actual:8,what:'Fixed AVPlayer conflict. Tested iOS 15/16/17. No crashes since deployment.',tech:'Deferred AVPlayer init until native bridge ready.',rejReason:'',tsCreated:'2026-01-28T09:00:00Z',tsOpened:'2026-01-28T09:15:00Z',tsStarted:'2026-01-28T09:30:00Z',tsSubmitted:'2026-02-05T16:00:00Z',tsReviewed:'2026-02-06T10:00:00Z',tsArchived:'2026-02-06T10:05:00Z',rejections:[],desc:'iOS crash on video player.',respH:0.25,workH:8,revH:18,cycleH:226},
    {id:'t5',title:'Redesign Coursat course page',status:'In Progress',priority:'High',type:'Design',assignedTo:'u6',reviewer:'u4',service:'s2',operator:'o2',reqBy:'Aymen',due:'2026-03-18',est:10,actual:null,what:'',tech:'',rejReason:'',tsCreated:'2026-03-05T10:00:00Z',tsOpened:'2026-03-05T11:30:00Z',tsStarted:'2026-03-06T09:00:00Z',tsSubmitted:null,tsReviewed:null,tsArchived:null,rejections:[],desc:'Mobile-first course page redesign.',respH:1.5,workH:null,revH:null,cycleH:null},
    {id:'t6',title:'April social media plan',status:'In Progress',priority:'High',type:'Content',assignedTo:'u7',reviewer:'u3',service:'s1',operator:'o1',reqBy:'Maysa',due:'2026-03-18',est:8,actual:null,what:'',tech:'',rejReason:'',tsCreated:'2026-03-10T10:00:00Z',tsOpened:'2026-03-10T14:00:00Z',tsStarted:'2026-03-11T09:00:00Z',tsSubmitted:null,tsReviewed:null,tsArchived:null,rejections:[],desc:'April social media plan for all 5 services.',respH:4,workH:null,revH:null,cycleH:null},
    {id:'t7',title:'Games Club leaderboard',status:'Rejected',priority:'High',type:'Feature',assignedTo:'u5',reviewer:'u4',service:'s4',operator:'o2',reqBy:'Aymen',due:'2026-03-10',est:14,actual:16,what:'Built with WebSocket real-time updates.',tech:'Socket.io for real-time.',rejReason:'Missing operator filter + pagination broken.',tsCreated:'2026-02-20T10:00:00Z',tsOpened:'2026-02-20T10:45:00Z',tsStarted:'2026-02-20T11:30:00Z',tsSubmitted:'2026-03-10T14:00:00Z',tsReviewed:'2026-03-10T17:00:00Z',tsArchived:null,rejections:[{at:'2026-03-10T17:00:00Z',by:'u4',reason:'Missing operator filter + pagination broken.'}],desc:'Real-time gaming leaderboard.',respH:0.75,workH:null,revH:3,cycleH:null},
  ];
  DB.backlog=[{id:'b1',title:'AI content recommendations',status:'Approved',cat:'Feature',priority:'High',by:'Aziz',desc:'ML recommendations from user history.',why:'Reduces churn, increases engagement.',notes:'Approved for Q2.'},{id:'b2',title:'Offline reading — Booktown',status:'Under Review',cat:'Feature',priority:'High',by:'Aymen',desc:'Download books for offline reading.',why:'Critical for Sudan connectivity issues.',notes:''},{id:'b3',title:'Games Club daily challenge',status:'Under Review',cat:'Feature',priority:'High',by:'Aziz',desc:'24h daily gaming challenge.',why:'Improves DAU significantly.',notes:'Needs leaderboard first.'}];
  DB.docs=[{id:'d1',title:'Task Workflow Guide',type:'Process Guide',status:'Published',author:'u2',fromTask:null,content:'New → In Progress → Pending Review → Done/Rejected\n\n1. Open task — timestamp recorded\n2. Set Estimated Hours before starting (required)\n3. Start → In Progress — timestamp recorded\n4. Write What Was Done before submitting\n5. Fill Actual Hours\n6. Submit → Pending Review — timestamp recorded\n7. Reviewer approves → auto-archived + auto-doc created',at:'2026-01-15T10:00:00Z'},{id:'d2',title:'Arabic Content Standards',type:'Policy',status:'Published',author:'u7',fromTask:null,content:'Use Modern Standard Arabic for all formal content.\nAll translations reviewed by a second team member before publishing.\nSocial media: Arabic + English hashtags required on all posts.',at:'2026-02-01T10:00:00Z'}];
  DB.archive=[{id:'a1',title:'Fix Coursat iOS video crash',by:'u5',reviewer:'u4',svc:'s2',op:'o2',type:'Bug Fix',priority:'Critical',est:6,actual:8,done:'2026-02-06',what:'Fixed AVPlayer conflict. Tested iOS 15/16/17. No crashes since deployment.',outcome:'Successful',respH:0.25,workH:8,revH:18,cycleH:226,reqBy:'Aziz',at:'2026-02-06T10:05:00Z'}];
  DB.testSchedules=[];
  DB.testSessions=[];
  DB.testChecks=[];
  DB.meetings=[
    {id:'m1',title:'Q1 Review',description:'Review Q1 progress',meeting_date:'2026-04-20',meeting_time:'10:00',duration_minutes:60,location:'Conference Room A',meeting_type:'Internal',status:'Scheduled',created_by:'Aziz',invitees:['Aymen','Maysa','Al Khateeb'],attendance:{},started_at:null,ended_at:null,created_at:new Date().toISOString()},
    {id:'m2',title:'Zain Sudan Sync',description:'Monthly operator sync',meeting_date:'2026-04-18',meeting_time:'14:00',duration_minutes:45,location:'Online - Zoom',meeting_type:'External',status:'Completed',created_by:'Aymen',invitees:['Aziz','Al Khateeb'],attendance:{Aziz:'present',Aymen:'present','Al Khateeb':'absent'},started_at:'2026-04-18T14:00:00Z',ended_at:'2026-04-18T14:45:00Z',created_at:new Date().toISOString()},
  ];
  DB.todos=[{id:'td1',title:'Review Q1 performance reports',status:'To Do',priority:'High',assignedTo:'Aziz',due:'2026-03-20',notes:''},{id:'td2',title:'Set up Make.com automations',status:'In Progress',priority:'Medium',assignedTo:'Aymen',due:'2026-03-18',notes:'Task notification automation first'},{id:'td3',title:'Onboard new content team member',status:'To Do',priority:'High',assignedTo:'Maysa',due:'2026-03-22',notes:''}];
}

// ══════════════════════════════════════════════════════
// LOGGING
// ══════════════════════════════════════════════════════
const LOG_KEY='vas_syslog_v2';
