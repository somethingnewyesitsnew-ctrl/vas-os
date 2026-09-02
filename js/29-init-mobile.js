// §29 ── INIT & MOBILE NAV ───────────────────────────────────────────────
function startClock(){
  function tick(){
    const el=document.getElementById('top-clock');
    if(!el)return;
    const now=new Date();
    const h=String(now.getHours()).padStart(2,'0');
    const m=String(now.getMinutes()).padStart(2,'0');
    const s=String(now.getSeconds()).padStart(2,'0');
    const days=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    el.textContent=`${days[now.getDay()]} ${now.getDate()} ${months[now.getMonth()]} — ${h}:${m}:${s}`;
  }
  tick(); setInterval(tick,1000);
}
startClock();

// ── Version badge — shows the semantic version bundled in code.
// No external calls, no links out — deliberately self-contained so this
// works identically on any host without revealing anything about where
// the code is developed.
function loadVersionBadge(){
  const el=document.getElementById('sb-version-badge');
  if(!el) return;
  el.textContent='v'+APP_VERSION;
}
loadVersionBadge();

// ── Apply saved system name everywhere ────────────────────────────
(function(){
  const n=localStorage.getItem('vas_sys_name');
  if(!n)return;
  ['sys-name-display','sys-name-topbar','login-sys-name'].forEach(id=>{
    const el=document.getElementById(id);if(el)el.textContent=n;
  });
  document.title=n;
})();

(function(){
  // Pre-load team from Supabase so login can authenticate against real members.
  // If Supabase is unreachable or tables empty, fall back to demo data.
  async function preload(){
    const loginEl=document.getElementById('login');
    // Show a brief loading state on login screen
    const lbtn=document.getElementById('lbtn')||document.querySelector('.lbtn');
    if(lbtn){lbtn.textContent='Loading…';lbtn.disabled=true;}
    try{
      // Plain fetch() never times out on its own — on a slow/flaky mobile
      // connection this used to be able to hang indefinitely, keeping the
      // login screen hidden (it's only revealed after this try/catch
      // settles) behind a splash/blank screen with no way out. Capping it
      // at 8s guarantees the fallback-to-demo-data path below always runs
      // and the login screen always appears within a bounded time.
      const _ctrl=new AbortController();
      const _t=setTimeout(()=>_ctrl.abort(),8000);
      let r;
      try{
        r=await fetch('https://duglbebwhtuijnduwmvz.supabase.co/rest/v1/team_public?order=name',{
          signal:_ctrl.signal,
          headers:{
            'apikey':'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1Z2xiZWJ3aHR1aWpuZHV3bXZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5MzQ1NjgsImV4cCI6MjA5MTUxMDU2OH0.0VFefKrp6Zzp9FbvJybzTwxQfK1nCRa8N_ncJrd9xws',
            'Authorization':'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1Z2xiZWJ3aHR1aWpuZHV3bXZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5MzQ1NjgsImV4cCI6MjA5MTUxMDU2OH0.0VFefKrp6Zzp9FbvJybzTwxQfK1nCRa8N_ncJrd9xws'
          }
        });
      } finally { clearTimeout(_t); }
      if(r.ok){
        const team=await r.json();
        if(team&&team.length){
          // team_public excludes the password column entirely — login is
          // verified server-side via the verify_login() RPC in doLogin().
          DB.team=team.map(m=>({...m,color:m.color||mkColor(m.name),av:m.av||mkAv(m.name),
            username:m.username||(m.name.toLowerCase().split(' ')[0]),
            lastLogin:m.last_login||null}));
          setSync('live','Refresh');
        } else {
          // Tables exist but empty — load demo team so login works
          loadDemoData();
          setSync('err','No data — run SQL setup');
        }
      } else {
        loadDemoData();
        setSync('err','Supabase error');
      }
    } catch(e){
      loadDemoData();
      setSync('err', e?.name==='AbortError' ? 'Connection too slow — demo mode' : 'Offline — demo mode');
    }
    buildQuickBtns();
    if(lbtn){lbtn.textContent='Sign In';lbtn.disabled=false;}
    loginEl.style.display='flex';

    // Restore saved credentials (remember me) — never block login
    try{
      const saved=JSON.parse(localStorage.getItem('vas_remember')||'null');
      if(saved?.u&&saved?.p&&DB.team.length>0){
        const luEl=document.getElementById('lu');
        const lpEl=document.getElementById('lp');
        const rem=document.getElementById('l-remember');
        if(luEl) luEl.value=saved.u;
        if(lpEl) lpEl.value=saved.p;
        if(rem)  rem.checked=true;
        // Only auto-login if team loaded successfully
        doLogin();
      }
    }catch(e){
      localStorage.removeItem('vas_remember');
    }
  }
  preload();
})();

// ── Mobile Navigation ─────────────────────────────────────────────────
function setMobNav(activeId){
  document.querySelectorAll('.mn-it').forEach(el=>el.classList.remove('on'));
  const el=document.getElementById(activeId);if(el) el.classList.add('on');
}
function toggleMobFab(){
  const fab=document.getElementById('mob-fab-menu');
  const more=document.getElementById('mob-more-menu');
  const ov=document.getElementById('mob-overlay');
  const showing=fab.style.display!=='none';
  more.style.display='none';
  fab.style.display=showing?'none':'block';
  ov.style.display=showing?'none':'block';
}
function toggleMobMenu(){
  const more=document.getElementById('mob-more-menu');
  const fab=document.getElementById('mob-fab-menu');
  const ov=document.getElementById('mob-overlay');
  const showing=more.style.display==='flex';
  fab.style.display='none';
  more.style.display=showing?'none':'flex';
  ov.style.display=showing?'none':'block';
  if(!showing) buildMobMore();
}
function hideMobFab(){
  document.getElementById('mob-fab-menu').style.display='none';
  document.getElementById('mob-overlay').style.display='none';
}
function hideMobMore(){
  document.getElementById('mob-more-menu').style.display='none';
  document.getElementById('mob-overlay').style.display='none';
}
function buildMobMore(){
  const list=document.getElementById('mob-more-list');if(!list)return;

  // Get live badge counts
  const myTasks=DB.tasks.filter(t=>t.assignedTo===CU?.id||(t.assignees||[]).includes(CU?.id)||(t.assignedTo||'').toLowerCase()===(CU?.name||'').toLowerCase());
  const toReview=DB.tasks.filter(t=>t.status==='Pending Review'&&(t.reviewer===CU?.id||t.reviewer===CU?.name));
  const helpReqs=DB.tasks.filter(t=>t.type==='Help'&&t.assignedTo===CU?.id&&t.status==='Pending Help');
  const reminders=DB.reminders?.filter(r=>!r.read&&(r.toId===CU?.id||r.toName===CU?.name))||[];
  const hrComs=DB.hrComs?.filter(c=>c.fromId===CU?.id&&c.replies?.some(r=>!c.readByOwner))||[];
  const announcements=DB.announcements?.filter(a=>!(a.readBy||[]).includes(CU?.id)&&(a.audience==='all'||(a.audienceIds||[]).includes(CU?.id)))||[];
  const todayMeet=DB.meetings?.filter(m=>m.meeting_date===new Date().toISOString().split('T')[0]&&(m.created_by===CU?.name||m.invitees?.includes(CU?.name)))||[];
  const todos=DB.todos?.filter(t=>t.status!=='Done'&&(t.assignedTo===CU?.name||t.owner_name===CU?.name))||[];
  const allT=DB.tasks.filter(t=>!['Done','Cancelled'].includes(t.status));

  const bdg=(n)=>n>0?`<span style="min-width:16px;height:16px;border-radius:8px;background:var(--ac);color:#fff;font-size:9px;font-weight:800;display:inline-flex;align-items:center;justify-content:center;padding:0 4px;margin-left:auto">${n}</span>`:'';

  // Sections mirroring the sidebar exactly, filtered by permissions
  const sections=[];

  // My Space
  const mySpace=[];
  mySpace.push({p:'todos',l:'My Todos',i:'✓',b:todos.length});
  mySpace.push({p:'toreview',l:'To Review',i:'◎',b:toReview.length});
  mySpace.push({p:'helprequests',l:'Help Requests',i:'🤝',b:helpReqs.length});
  mySpace.push({p:'reminders',l:'Reminders',i:'🔔',b:reminders.length});
  // Comments badge — unread comments on my tasks
  const cmUnread=(()=>{let n=0;DB.tasks.forEach(t=>{const isMine=t.assignedTo===CU?.id||(t.assignees||[]).includes(CU?.id)||t.reviewer===CU?.id;const iCommented=(t.comments||[]).some(c=>c.by===CU?.id);if(isMine||iCommented)(t.comments||[]).forEach(c=>{if(c.by!==CU?.id&&!(c.readBy||[]).includes(CU?.id))n++;});});return n;})();
  mySpace.push({p:'comments',l:'Comments',i:'💬',b:cmUnread});
  sections.push({title:'My Space',items:mySpace});

  // Communications
  const comms=[];
  if(canDo('hrComs')) comms.push({p:'hrcoms',l:'HR Comms',i:'💬',b:hrComs.length});
  if(canDo('announcements')) comms.push({p:'announcements',l:'Announcements',i:'📢',b:announcements.length});
  if(comms.length) sections.push({title:'Communications',items:comms});

  // Management (admin only)
  if(isAdmin()){
    sections.push({title:'Management',items:[
      {p:'projects',l:'Projects',i:'◉',b:0},
      {p:'alltasks',l:'All Tasks',i:'≡',b:allT.length},
      {p:'team',l:'Team',i:'◈',b:0},
      {p:'eval',l:'Evaluation',i:'📊',b:0},
      {p:'backlog',l:'Backlog',i:'◆',b:0},
    ]});
    sections.push({title:'Operations',items:[
      {p:'services',l:'Services',i:'◐',b:0},
      {p:'operators',l:'Operators',i:'◑',b:0},
      {p:'companies',l:'Companies',i:'◧',b:0},
    ]});
  } else {
    const mgmt=[];
    if(canDo('allTasks')) mgmt.push({p:'alltasks',l:'All Tasks',i:'≡',b:allT.length});
    if(canDo('projects')) mgmt.push({p:'projects',l:'Projects',i:'◉',b:0});
    if(canDo('team')) mgmt.push({p:'team',l:'Team',i:'◈',b:0});
    if(canDo('backlog')) mgmt.push({p:'backlog',l:'Backlog',i:'◆',b:0});
    if(mgmt.length) sections.push({title:'Management',items:mgmt});
  }

  // Collaboration
  const collab=[];
  if(canDo('svcTest')) collab.push({p:'svctest',l:'Service Tests',i:'🧪',b:0});
  collab.push({p:'moutcomes',l:'Meeting Outcomes',i:'📝',b:0});
  if(collab.length) sections.push({title:'Collaboration',items:collab});

  // Knowledge
  const know=[];
  if(canDo('docs')) know.push({p:'docs',l:'Docs',i:'📚',b:0});
  if(canDo('archive')) know.push({p:'archive',l:'Archive',i:'🗄',b:0});
  know.push({p:'library',l:'Library',i:'📖',b:0});
  if(isAdmin()){
    know.push({p:'settings',l:'Settings',i:'⚙',b:0});
    know.push({p:'syslog',l:'System Log',i:'▤',b:0});
  }
  if(know.length) sections.push({title:'Knowledge',items:know});

  list.innerHTML=`
    <div style="margin-bottom:14px">
      <div style="font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:var(--tx3);padding:4px 2px 6px">Notifications</div>
      <div id="mob-push-status"><div style="font-size:11px;color:var(--tx3);padding:8px 0">Checking…</div></div>
    </div>` + sections.map(sec=>`
    <div style="margin-bottom:10px">
      <div style="font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:var(--tx3);padding:4px 2px 6px">${esc(sec.title)}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
        ${sec.items.map(pg=>`
        <button onclick="hideMobMore();navTo('${pg.p}');setMobNav('')"
          style="padding:11px 10px;background:var(--s2);border:1px solid var(--bd);border-radius:10px;font-size:12px;font-weight:700;cursor:pointer;color:var(--tx);display:flex;align-items:center;gap:7px;text-align:left;position:relative">
          <span style="font-size:14px;flex-shrink:0">${pg.i}</span>
          <span style="flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${pg.l}</span>
          ${bdg(pg.b)}
        </button>`).join('')}
      </div>
    </div>`).join('') + `
    <div style="margin-top:6px;padding-top:14px;border-top:1px solid var(--bd)">
      <button onclick="hideMobMore();doLogout()" style="width:100%;padding:12px;background:var(--rb);border:1px solid var(--rbr);border-radius:10px;font-size:13px;font-weight:700;color:var(--r);cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px">
        <span style="font-size:15px">←</span> Sign Out
      </button>
    </div>`;
  if(typeof renderMobPushStatus==='function') renderMobPushStatus();
}

// Notification enable/disable + live status, reachable from the mobile
// More menu by anyone — admin or member. The desktop equivalent
// (push-status-box) only lives inside the admin-only Settings page, which
// members can't reach at all, so this is a separate, always-accessible
// control rather than trying to surface Settings itself on mobile.
async function renderMobPushStatus(){
  const host=document.getElementById('mob-push-status');
  if(!host)return;
  if(typeof pushSupported!=='function'||!pushSupported()){
    host.innerHTML=`<div style="font-size:11px;color:var(--tx3);padding:8px 0">Push notifications aren't supported on this browser.</div>`;
    return;
  }
  const perm=Notification.permission;
  const on=perm==='granted'&&await isPushSubscribedHere();
  if(on){
    host.innerHTML=`<div style="display:flex;align-items:center;gap:8px;padding:11px 12px;background:var(--gb);border:1px solid var(--gbr);border-radius:10px">
      <span style="font-size:16px">🔔</span>
      <span style="flex:1;font-size:12px;font-weight:700;color:var(--g)">Notifications on</span>
      <button onclick="unsubscribeFromPush().then(renderMobPushStatus)" style="background:var(--s);border:1px solid var(--bd);border-radius:8px;padding:5px 11px;font-size:11px;font-weight:700;color:var(--tx2);cursor:pointer">Disable</button>
    </div>`;
    return;
  }
  const blocked=perm==='denied';
  host.innerHTML=`<div style="display:flex;align-items:center;gap:8px;padding:11px 12px;background:var(--yb);border:1px solid var(--ybr);border-radius:10px">
    <span style="font-size:16px">🔕</span>
    <span style="flex:1;font-size:12px;font-weight:700;color:var(--y)">${blocked?'Notifications blocked':'Notifications off'}</span>
    <button onclick="${blocked?"toast('Enable notifications for this site in your phone\\'s browser settings, then reload','inf',7000)":'subscribeToPush().then(renderMobPushStatus)'}" style="background:var(--y);border:none;border-radius:8px;padding:5px 12px;font-size:11px;font-weight:800;color:#fff;cursor:pointer">${blocked?'Fix':'Enable'}</button>
  </div>`;
}
// Update mobile nav badges
function updateMobBadges(){
  const my=DB.tasks.filter(t=>t.assignedTo===CU?.id||(t.assignees||[]).includes(CU?.id)||(t.assignedTo||'').toLowerCase()===(CU?.name||'').toLowerCase());
  const active=my.filter(t=>!['Done','Cancelled','Rejected'].includes(t.status));
  const bdg=document.getElementById('mn-bdg-tasks');
  if(bdg){bdg.textContent=active.length||'';bdg.style.display=active.length?'flex':'none';}
  const meetings=DB.meetings.filter(m=>m.meeting_date===new Date().toISOString().split('T')[0]&&m.status==='Scheduled'&&(m.created_by===CU?.name||m.invitees?.includes(CU?.name)));
  const mbdg=document.getElementById('mn-bdg-meet');
  if(mbdg){mbdg.textContent=meetings.length||'';mbdg.style.display=meetings.length?'flex':'none';}
  // Comments badge
  let cmN=0;
  DB.tasks.forEach(t=>{
    const isMine=t.assignedTo===CU?.id||(t.assignees||[]).includes(CU?.id)||t.reviewer===CU?.id||t.createdBy===CU?.name;
    const iCommented=(t.comments||[]).some(c=>c.by===CU?.id);
    if(isMine||iCommented)(t.comments||[]).forEach(c=>{if(c.by!==CU?.id&&!(c.readBy||[]).includes(CU?.id))cmN++;});
  });
  const cmbdg=document.getElementById('nb-cm');
  if(cmbdg){cmbdg.textContent=cmN;cmbdg.style.display=cmN>0?'':'none';}
  // Small nudge on the "More" tab itself when push isn't enabled on this
  // device — the full status + enable/disable control lives inside the
  // More menu (renderMobPushStatus), this is just the always-visible cue.
  (async()=>{
    const notifBdg=document.getElementById('mn-bdg-notif');
    if(!notifBdg||typeof pushSupported!=='function')return;
    if(!pushSupported()){notifBdg.style.display='none';return;}
    const on=Notification.permission==='granted'&&typeof isPushSubscribedHere==='function'&&await isPushSubscribedHere();
    notifBdg.textContent=on?'':'!';
    notifBdg.style.display=on?'none':'flex';
  })();
}
// Hook into updateBadges
const _origUpdateBadges=window.updateBadges;
window.updateBadges=function(){if(_origUpdateBadges)_origUpdateBadges();updateMobBadges();};
