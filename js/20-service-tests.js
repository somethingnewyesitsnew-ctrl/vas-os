// §20 ── SERVICE TESTS ───────────────────────────────────────────────────
function rSvcTest(el){
  if(!canDo('svcTest')){el.innerHTML='<div class="empty"><div class="ei">🔒</div><div class="et">Access Restricted</div><div class="es">Your membership type does not include access to Service Tests.</div></div>';return;}
  const todayDow=new Date().getDay();
  const todayStr=localDateStr();
  const mySchedules=isAdmin()?DB.testSchedules.filter(s=>s.active!==false):DB.testSchedules.filter(s=>s.member_id===CU.id&&s.active!==false);
  const todaySchedules=mySchedules.filter(s=>s.day_of_week===todayDow);
  const allChecks=DB.testChecks;
  const totalPass=allChecks.filter(c=>c.result==='pass').length;
  const totalFail=allChecks.filter(c=>c.result==='fail').length;
  const totalDone=totalPass+totalFail;
  const myActive=DB.testSessions.find(s=>s.test_date===todayStr&&s.status==='In Progress'&&(s.tester_id===CU.id||s.tester_name===CU.name));
  let h='';

  if(myActive){
    const checks=DB.testChecks.filter(c=>c.session_id===myActive.id);
    const done=checks.filter(c=>c.result!=='pending').length;
    const pct=checks.length?Math.round(done/checks.length*100):0;
    h+=`<div style="background:linear-gradient(135deg,#1e40af,#1d4ed8);border-radius:12px;padding:13px 16px;margin-bottom:12px;display:flex;align-items:center;justify-content:space-between;gap:12px;cursor:pointer" onclick="openServiceList('${myActive.id}')">
      <div>
        <div style="font-size:11px;font-weight:700;color:#93c5fd;text-transform:uppercase;letter-spacing:.06em;margin-bottom:2px">▶ Active Test</div>
        <div style="font-size:15px;font-weight:700;color:#fff">${myActive.operator_name}</div>
        <div style="font-size:11px;color:#bfdbfe">${done}/${checks.length} checks · ${pct}%</div>
        <div style="height:3px;background:rgba(255,255,255,.2);border-radius:2px;margin-top:6px;width:180px"><div style="height:100%;width:${pct}%;background:#34d399;border-radius:2px"></div></div>
      </div>
      <button class="btn" style="background:#fff;color:#1e40af;font-weight:700;font-size:13px;padding:8px 16px;border-radius:8px" onclick="event.stopPropagation();openServiceList('${myActive.id}')">▶ Continue</button>
    </div>`;
  }

  h+=`<div class="tabs" style="margin-bottom:14px">
    <div class="tab on" onclick="switchTestTab(0,this)">Today</div>
    <div class="tab" onclick="switchTestTab(1,this)">Sessions</div>
    <div class="tab" onclick="switchTestTab(2,this)">Failed</div>
    <div class="tab" onclick="switchTestTab(3,this)">Reports</div>
    ${isAdmin()?'<div class="tab" onclick="switchTestTab(4,this)">⚙ Setup</div>':''}
  </div>`;

  // ── TAB 0: TODAY ──────────────────────────────────────────────────
  h+=`<div id="stab-0">
    <div class="sg" style="margin-bottom:14px">
      <div class="stat" onclick="switchTestTab(1,document.querySelector('.tab:nth-child(2)'));document.querySelector('.tab:nth-child(2)').click()" style="cursor:pointer">
        <div class="st-bar" style="background:#2563eb"></div><div class="st-lbl">Sessions</div><div class="st-val">${DB.testSessions.length}</div>
      </div>
      <div class="stat" style="cursor:pointer" onclick="switchTestTab(3,document.querySelector('.tab:nth-child(4)'));document.querySelector('.tab:nth-child(4)').click()">
        <div class="st-bar" style="background:#15803d"></div><div class="st-lbl">Passed</div><div class="st-val" style="color:#15803d">${totalPass}</div>
      </div>
      <div class="stat" style="cursor:pointer" onclick="switchTestTab(2,document.querySelector('.tab:nth-child(3)'));document.querySelector('.tab:nth-child(3)').click()">
        <div class="st-bar" style="background:#dc2626"></div><div class="st-lbl">Failed</div><div class="st-val" style="color:#dc2626">${totalFail}</div>
      </div>
      <div class="stat" style="cursor:pointer" onclick="switchTestTab(3,document.querySelector('.tab:nth-child(4)'));document.querySelector('.tab:nth-child(4)').click()">
        <div class="st-bar" style="background:#b45309"></div><div class="st-lbl">Pass Rate</div><div class="st-val" style="color:#b45309">${totalDone?Math.round(totalPass/totalDone*100):0}%</div>
      </div>
    </div>
    ${todaySchedules.length===0
      ?`<div class="card" style="text-align:center;padding:24px"><div style="font-size:32px;margin-bottom:8px">✅</div><div style="font-weight:600;color:var(--tx2);font-size:14px">No tests scheduled today</div></div>`
      :todaySchedules.map(sch=>{
        const op=[...DB.operators,...DB.companies].find(o=>o.id===sch.operator_id);
        const m=DB.team.find(t=>t.id===sch.member_id);
        const svcs=DB.services.filter(s=>s.operator_name===op?.name);
        const existing=DB.testSessions.find(s=>s.test_date===todayStr&&(s.tester_id===sch.member_id||s.tester_name===m?.name)&&s.operator_name===op?.name&&s.status!=='Cancelled');
        if(existing?.status==='Completed') return '';
        const canStart=m?.id===CU.id||isAdmin();
        return`<div class="mc" style="margin-bottom:8px;cursor:pointer" onclick="${existing?`openServiceList('${existing.id}')`:canStart?`startTestSession('${sch.operator_id}','${m?.id||''}')`:''}" >
          <div style="display:flex;align-items:center;justify-content:space-between;gap:10px">
            <div>
              <div style="font-size:14px;font-weight:700;margin-bottom:3px">📡 ${op?.name||'Unknown'}</div>
              <div style="font-size:12px;color:var(--tx3)">
                <span style="font-weight:600;color:${m?.color||'var(--tx2)'}">${m?.name||'?'}</span> · ${svcs.length} service${svcs.length!==1?'s':''}
                ${svcs.length?`<span style="font-size:10px;color:var(--tx3)"> (${svcs.map(s=>s.name).join(', ')})</span>`:''}
              </div>
            </div>
            ${existing
              ?`<button class="btn bp bsm" onclick="event.stopPropagation();openServiceList('${existing.id}')">▶ ${existing.status==='Paused'?'Resume':'Continue'}</button>`
              :canStart
              ?`<button class="btn bp bsm" onclick="event.stopPropagation();startTestSession('${sch.operator_id}','${m?.id||''}')">▶ Start Test</button>`
              :`<span style="font-size:12px;color:var(--tx3)">Assigned to ${m?.name||'?'}</span>`}
          </div>
        </div>`;
      }).join('')}
  </div>`;

  // ── TAB 1: SESSIONS ────────────────────────────────────────────────
  const oneMonthAgo=new Date();oneMonthAgo.setDate(oneMonthAgo.getDate()-30);
  const recent=DB.testSessions.filter(s=>!s.completed_at||new Date(s.completed_at)>=oneMonthAgo||s.status!=='Completed').slice(0,50);
  h+=`<div id="stab-1" style="display:none">
    ${recent.length===0?'<div class="empty"><div class="ei">🧪</div><div class="et">No sessions yet</div></div>'
      :recent.map(s=>{
        const checks=DB.testChecks.filter(c=>c.session_id===s.id);
        const pass=checks.filter(c=>c.result==='pass').length;
        const fail=checks.filter(c=>c.result==='fail').length;
        const pct=checks.length?Math.round(pass/checks.length*100):0;
        const col=s.status==='Completed'?(pct>=80?'#15803d':pct>=50?'#b45309':'#dc2626'):'#2563eb';
        return`<div class="mc" style="margin-bottom:8px">
          <div style="display:flex;align-items:flex-start;gap:8px">
            <div onclick="openServiceList('${s.id}')" style="flex:1;cursor:pointer">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:5px">
                <div><div style="font-size:14px;font-weight:700">${s.operator_name}</div>
                <div style="font-size:11px;color:var(--tx3)">${fd(s.test_date)} · ${s.tester_name}</div></div>
                <div style="text-align:right">
                  <div style="font-size:16px;font-weight:800;color:${col}">${pct}%</div>
                  <span style="font-size:10px;padding:1px 7px;border-radius:8px;font-weight:700;background:${s.status==='Completed'?'#f0fdf4':s.status==='Paused'?'#fffbeb':'#eff6ff'};color:${s.status==='Completed'?'#15803d':s.status==='Paused'?'#d97706':'#2563eb'}">${s.status}</span>
                </div>
              </div>
              <div style="height:4px;background:var(--s2);border-radius:2px"><div style="height:100%;width:${pct}%;background:${col};border-radius:2px"></div></div>
              <div style="font-size:10px;color:var(--tx3);margin-top:4px">${pass}✓ ${fail}✗ ${checks.filter(c=>c.result==='pending').length} pending</div>
            </div>
            ${isAdmin()?`<button onclick="deleteTestSession('${s.id}')" style="padding:4px 8px;background:var(--rb);border:1px solid var(--rbr);border-radius:6px;color:var(--r);font-size:11px;font-weight:700;cursor:pointer;flex-shrink:0;margin-top:2px">✕</button>`:''}
          </div>
        </div>`;
      }).join('')}
  </div>`;

  // ── TAB 2: FAILED ──────────────────────────────────────────────────
  const failedChecks=DB.testChecks.filter(c=>c.result==='fail').slice(0,100);
  const notConverted=failedChecks.filter(c=>!c.converted_to_task);
  h+=`<div id="stab-2" style="display:none">
    ${notConverted.length>0&&isAdmin()?`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
      <span style="font-size:13px;color:var(--tx3)">${notConverted.length} not converted to tasks</span>
      <button class="btn bp bsm" onclick="convertAllFailed()">Convert All → Tasks</button>
    </div>`:''}
    ${failedChecks.length===0?'<div class="empty"><div class="ei">✅</div><div class="et">No failures recorded</div></div>'
      :failedChecks.map(c=>`<div style="border:1px solid ${c.converted_to_task?'var(--bd)':'#fca5a5'};border-radius:9px;padding:11px 13px;margin-bottom:7px;opacity:${c.converted_to_task?.6:1}">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px">
          <div style="flex:1">
            <div style="font-size:12px;font-weight:700;color:#dc2626">✗ ${c.check_name}</div>
            <div style="font-size:13px;font-weight:600">${c.service_name}</div>
            <div style="font-size:11px;color:var(--tx3)">${c.operator_name} · ${fd(c.test_date)} · ${c.tester_name}</div>
            ${c.tester_note?`<div style="font-size:11px;color:var(--tx2);background:var(--s2);border-radius:5px;padding:4px 8px;margin-top:4px">${c.tester_note}</div>`:''}
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0">
            ${ppill(c.priority)}
            ${c.converted_to_task?`<span style="font-size:10px;color:#15803d;font-weight:700">✓ Task</span>`
              :`<button onclick="convertFailToTask('${c.id}')" style="font-size:10px;background:var(--ac);color:#fff;border:none;border-radius:5px;padding:3px 9px;cursor:pointer;font-weight:700">→ Task</button>`}
          </div>
        </div>
      </div>`).join('')}
  </div>`;

  let reportsHtml='';
  try{reportsHtml=buildTestReports();}catch(e){reportsHtml='<div class="empty"><div class="ei">📊</div><div class="et">Reports unavailable</div></div>';}
  h+=`<div id="stab-3" style="display:none">${reportsHtml}</div>`;

  // ── TAB 4: SETUP (admin) ───────────────────────────────────────────
  if(isAdmin()){
    const templates=getCheckTemplates();
    const allOps=[...DB.operators,...DB.companies];
    h+=`<div id="stab-4" style="display:none">
      <div class="card" style="margin-bottom:12px">
        <div class="ct"><span class="ct-t">✅ Test Checklist Items</span><span style="font-size:10px;color:var(--tx3)">Applied to every service during testing</span></div>
        <div id="check-templates-list">
          ${templates.map((t,i)=>`<div style="display:flex;align-items:center;gap:8px;padding:9px 0;border-bottom:1px solid var(--bd)">
            <span style="font-size:13px;flex:1;color:var(--tx)">${t}</span>
            <button onclick="editCheckTemplate(${i})" style="padding:3px 9px;background:var(--s2);border:1px solid var(--bd);border-radius:6px;color:var(--tx3);cursor:pointer;font-size:12px">✏</button>
            <button onclick="deleteCheckTemplate(${i})" style="padding:3px 9px;background:var(--rb);border:1px solid var(--rbr);border-radius:6px;color:var(--r);cursor:pointer;font-size:12px">✕</button>
          </div>`).join('')}
        </div>
        <div style="display:flex;gap:8px;margin-top:12px">
          <input id="new-check-tpl" placeholder="Add new test item…" style="flex:1;padding:8px 10px;background:var(--s2);border:1px solid var(--bd);border-radius:7px;color:var(--tx);font-size:13px;outline:none;font-family:var(--fn)" onkeydown="if(event.key==='Enter')addCheckTemplate()">
          <button class="btn bp bsm" onclick="addCheckTemplate()">+ Add</button>
        </div>
      </div>
      <div class="card">
        <div class="ct"><span class="ct-t">📅 Weekly Schedule</span></div>
        ${DB.testSchedules.length?DB.testSchedules.map(s=>{
          const op=allOps.find(o=>o.id===s.operator_id);
          const m=DB.team.find(t=>t.id===s.member_id);
          return`<div style="display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--bd)">
            <div style="flex:1;font-size:13px;font-weight:600">${op?.name||'?'} <span style="color:var(--tx3);font-size:11px;font-weight:400">· ${m?.name||'?'} · ${DAYS[s.day_of_week]}</span></div>
            <button onclick="deleteSchedule('${s.id}')" style="background:none;border:none;color:var(--r);cursor:pointer;font-size:16px;padding:2px 6px">✕</button>
          </div>`;}).join(''):`<div style="color:var(--tx3);font-size:12px;padding:6px 0 10px">No schedules yet</div>`}
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;align-items:flex-end">
          <div style="flex:1;min-width:120px"><label style="font-size:10px;font-weight:700;color:var(--tx3);display:block;margin-bottom:3px">Operator</label>
            <select id="new-sched-op" style="width:100%;padding:8px;background:var(--s2);border:1px solid var(--bd);border-radius:7px;color:var(--tx);font-size:12px;outline:none">
              ${allOps.map(o=>`<option value="${o.id}">${esc(o.name)}</option>`).join('')}
            </select></div>
          <div style="flex:1;min-width:120px"><label style="font-size:10px;font-weight:700;color:var(--tx3);display:block;margin-bottom:3px">Tester</label>
            <select id="new-sched-mbr" style="width:100%;padding:8px;background:var(--s2);border:1px solid var(--bd);border-radius:7px;color:var(--tx);font-size:12px;outline:none">
              ${DB.team.map(m=>`<option value="${m.id}">${esc(m.name)}</option>`).join('')}
            </select></div>
          <div><label style="font-size:10px;font-weight:700;color:var(--tx3);display:block;margin-bottom:3px">Day</label>
            <select id="new-sched-day" style="padding:8px;background:var(--s2);border:1px solid var(--bd);border-radius:7px;color:var(--tx);font-size:12px;outline:none">
              ${DAYS.map((d,i)=>`<option value="${i}">${d}</option>`).join('')}
            </select></div>
          <button class="btn bp bsm" onclick="addScheduleNew()">+ Add</button>
        </div>
      </div>
    </div>`;
  }

  try{
    el.innerHTML=h;
  }catch(e){
    el.innerHTML=`<div class="card" style="text-align:center;padding:30px;color:var(--r)">⚠️ Failed to render: ${esc(e.message)}</div>`;
    console.error('rSvcTest error:',e);
  }
}

window.switchTestTab=(idx,el)=>{
  [0,1,2,3,4].forEach(i=>{const t=document.getElementById('stab-'+i);if(t)t.style.display=i===idx?'':'none';});
  document.querySelectorAll('.tabs .tab').forEach(t=>t.classList.remove('on'));
  if(el) el.classList.add('on');
};

// ── Template management ────────────────────────────────────────────────
function getCheckTemplates(){
  try{return JSON.parse(localStorage.getItem('vas_check_templates')||'null')||[
    'Subscription / Service Access','Content Load & Display',
    'IVR/USSD Response','Billing & Charge Accuracy','Unsubscription Flow'
  ];}catch(e){return['Subscription / Service Access','Content Load & Display','IVR/USSD Response','Billing & Charge Accuracy','Unsubscription Flow'];}
}
function saveCheckTemplates(list){localStorage.setItem('vas_check_templates',JSON.stringify(list));}

window.addCheckTemplate=()=>{
  const input=document.getElementById('new-check-tpl');
  const val=input?.value.trim();if(!val)return;
  const list=getCheckTemplates();list.push(val);saveCheckTemplates(list);
  input.value='';nav('svctest',document.querySelector('[data-p="svctest"]'));
  toast('Check item added ✓','ok');
};
window.deleteCheckTemplate=(idx)=>{
  if(!confirm('Remove this check item?'))return;
  const list=getCheckTemplates();list.splice(idx,1);saveCheckTemplates(list);
  nav('svctest',document.querySelector('[data-p="svctest"]'));toast('Removed','ok');
};
window.editCheckTemplate=(idx)=>{
  const list=getCheckTemplates();
  const val=prompt('Edit check item:',list[idx]);
  if(val===null)return;
  list[idx]=val.trim()||list[idx];saveCheckTemplates(list);
  nav('svctest',document.querySelector('[data-p="svctest"]'));toast('Updated ✓','ok');
};

// ── Service list view ──────────────────────────────────────────────────
window.openServiceList=(sessionId)=>{
  const session=DB.testSessions.find(s=>s.id===sessionId);
  if(!session){toast('Session not found','bad');return;}
  const checks=DB.testChecks.filter(c=>c.session_id===sessionId);
  const serviceNames=[...new Set(checks.map(c=>c.service_name))];
  const isActive=session.status==='In Progress';
  const canEdit=session.tester_name===CU.name||session.tester_id===CU.id||isAdmin();
  const pass=checks.filter(c=>c.result==='pass').length;
  const fail=checks.filter(c=>c.result==='fail').length;
  const pct=checks.length?Math.round(pass/checks.length*100):0;
  const allDone=checks.every(c=>c.result!=='pending');

  let body=`
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-bottom:10px">
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:10px;text-align:center">
      <div style="font-size:20px;font-weight:800;color:#15803d">${pass}</div>
      <div style="font-size:9px;font-weight:700;color:#15803d;text-transform:uppercase">Passed</div>
    </div>
    <div style="background:${fail?'#fef2f2':'var(--s2)'};border:1px solid ${fail?'#fecaca':'var(--bd)'};border-radius:8px;padding:10px;text-align:center">
      <div style="font-size:20px;font-weight:800;color:${fail?'#dc2626':'var(--tx3)'}">${fail}</div>
      <div style="font-size:9px;font-weight:700;color:${fail?'#dc2626':'var(--tx3)'};text-transform:uppercase">Failed</div>
    </div>
    <div style="background:var(--s2);border:1px solid var(--bd);border-radius:8px;padding:10px;text-align:center">
      <div style="font-size:20px;font-weight:800;color:var(--tx3)">${checks.filter(c=>c.result==='pending').length}</div>
      <div style="font-size:9px;font-weight:700;color:var(--tx3);text-transform:uppercase">Pending</div>
    </div>
  </div>
  <div style="height:5px;background:var(--s2);border-radius:3px;margin-bottom:14px;overflow:hidden;display:flex">
    <div style="width:${checks.length?Math.round(pass/checks.length*100):0}%;background:#15803d;height:100%"></div>
    <div style="width:${checks.length?Math.round(fail/checks.length*100):0}%;background:#dc2626;height:100%"></div>
  </div>
  <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:var(--tx3);margin-bottom:10px">Click a service to test it</div>`;

  serviceNames.forEach(sn=>{
    const svc=DB.services.find(s=>s.name===sn);
    const sc=checks.filter(c=>c.service_name===sn);
    const sp=sc.filter(c=>c.result==='pass').length;
    const sf=sc.filter(c=>c.result==='fail').length;
    const spd=sc.filter(c=>c.result==='pending').length;
    const spct=sc.length?Math.round(sp/sc.length*100):0;
    const isServiceDone=spd===0;
    const col=isServiceDone?(sf>0?'#dc2626':'#15803d'):'#2563eb';
    body+=`<div onclick="${canEdit&&isActive?`openServiceChecklist('${sessionId}','${sn.replace(/'/g,"\\'")}')`:''}" style="border:1px solid ${sf>0?'#fca5a5':isServiceDone?'#86efac':'var(--bd)'};border-radius:10px;padding:13px;margin-bottom:8px;cursor:${canEdit&&isActive?'pointer':'default'};background:${sf>0?'#fff8f8':isServiceDone?'#f8fff8':'var(--s)'};transition:filter .12s" ${canEdit&&isActive?'onmouseenter="this.style.filter=\'brightness(.97)\'" onmouseleave="this.style.filter=\'\'"':''}>
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:6px">
        <div style="flex:1;min-width:0">
          <div style="font-size:14px;font-weight:800;color:var(--tx)">${sn}</div>
          <div style="font-size:11px;color:var(--tx3);margin-top:1px">${sp}✓ ${sf}✗ ${spd} pending</div>
        </div>
        <div style="text-align:right;flex-shrink:0">
          ${isServiceDone
            ?`<span style="font-size:13px;font-weight:800;color:${col}">${spct}%</span>`
            :`<span style="font-size:13px;font-weight:800;color:#2563eb">${(sc.length-spd)}/${sc.length}</span>`}
          ${canEdit&&isActive?`<div style="font-size:11px;color:var(--ac);font-weight:700;margin-top:2px">${isServiceDone?'View →':'Test →'}</div>`:''}
        </div>
      </div>
      <div style="height:5px;background:var(--s2);border-radius:3px;overflow:hidden;display:flex">
        <div style="width:${sc.length?Math.round(sp/sc.length*100):0}%;background:#15803d;height:100%"></div>
        <div style="width:${sc.length?Math.round(sf/sc.length*100):0}%;background:#dc2626;height:100%"></div>
      </div>
    </div>`;
  });

  body+=`<div style="display:flex;gap:8px;margin-top:14px;padding-top:12px;border-top:1px solid var(--bd)">
    ${canEdit&&isActive?`<button onclick="completeSessionFlow('${sessionId}')" style="flex:1;padding:11px;background:${allDone?'var(--ac)':'var(--s2)'};color:${allDone?'#fff':'var(--tx3)'};border:${allDone?'none':'1px solid var(--bd)'};border-radius:9px;font-size:13px;font-weight:800;cursor:pointer">✓ Finish Test${!allDone?' ('+checks.filter(c=>c.result==='pending').length+' pending)':''}</button>`:''}
    ${canEdit&&isActive?`<button onclick="pauseSession('${sessionId}')" style="padding:11px 14px;background:var(--s2);border:1px solid var(--bd);border-radius:9px;font-size:12px;font-weight:700;cursor:pointer;color:var(--tx2)">⏸ Pause</button>`:''}
    <button onclick="window._chkSession=null;navTo('svctest')" style="padding:11px 14px;background:var(--s2);border:1px solid var(--bd);border-radius:9px;font-size:12px;font-weight:700;cursor:pointer;color:var(--tx2)">✕ Exit</button>
  </div>`;

  // Render inline in main page area instead of side panel
  const pageEl=document.getElementById('content');
  if(pageEl){
    pageEl.innerHTML=`<button class="btn bg2 bsm" onclick="window._chkSession=null;navTo('svctest')" style="margin-bottom:14px">← Back to Tests</button>
    <div style="font-size:18px;font-weight:800;margin-bottom:4px">${session.operator_name}</div>
    <div style="font-size:11px;color:var(--tx3);margin-bottom:14px">${fd(session.test_date)} · ${session.status}</div>`+body;
  }
};

// ── Single-service checklist ───────────────────────────────────────────
window.openServiceChecklist=(sessionId,serviceName)=>{
  // Store globally — avoids all string-escaping issues in onclick attributes
  window._chkSession=sessionId;
  window._chkService=serviceName;

  const session=DB.testSessions.find(s=>s.id===sessionId);if(!session)return;
  const svc=DB.services.find(s=>s.name===serviceName);
  const checks=DB.testChecks.filter(c=>c.session_id===sessionId&&c.service_name===serviceName);
  const isActive=session.status==='In Progress';
  const canEdit=session.tester_name===CU.name||session.tester_id===CU.id||isAdmin();
  const pass=checks.filter(c=>c.result==='pass').length;
  const fail=checks.filter(c=>c.result==='fail').length;
  const pending=checks.filter(c=>c.result==='pending').length;

  let body='';
  if(svc){
    body+=`<div style="background:var(--s2);border:1px solid var(--bd);border-radius:10px;padding:11px 13px;margin-bottom:12px;display:flex;align-items:center;justify-content:space-between;gap:8px">
      <div>
        <div style="font-size:14px;font-weight:800">${esc(svc.name)}</div>
        <div style="font-size:11px;color:var(--tx3)">${svc.service_type||''} ${svc.cat?'· '+svc.cat:''}</div>
      </div>
      ${svc.link?`<a href="${svc.link}" target="_blank" style="background:var(--ac);color:#fff;font-size:12px;font-weight:700;padding:7px 14px;border-radius:8px;text-decoration:none;white-space:nowrap">🔗 Open ↗</a>`:''}
    </div>`;
  }

  body+=`<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;font-size:11px;color:var(--tx3)">
    <div style="flex:1;height:4px;background:var(--s2);border-radius:2px;overflow:hidden;display:flex">
      <div style="width:${checks.length?Math.round(pass/checks.length*100):0}%;background:#15803d;height:100%"></div>
      <div style="width:${checks.length?Math.round(fail/checks.length*100):0}%;background:#dc2626;height:100%"></div>
    </div>
    <span>${pass}✓ ${fail}✗ ${pending} left</span>
  </div>`;

  checks.forEach(c=>{
    const pColor={Critical:'#be123c',High:'#c2410c',Medium:'#b45309',Low:'#15803d'}[c.priority]||'#64748b';
    const done=c.result!=='pending';
    body+=`<div id="chk-${c.id}" style="border:1px solid ${c.result==='pass'?'#86efac':c.result==='fail'?'#fca5a5':'var(--bd)'};border-radius:10px;padding:12px;margin-bottom:8px;background:${c.result==='pass'?'#f0fdf4':c.result==='fail'?'#fef2f2':'var(--s)'}">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:${done?'6px':'10px'}">
        <div style="font-size:13px;font-weight:600;color:var(--tx);flex:1">${c.check_name}</div>
        ${isActive&&canEdit?`<select data-cid="${c.id}" onchange="_chkPriority(this)" style="font-size:11px;padding:3px 6px;background:var(--s2);border:1px solid var(--bd);border-radius:6px;color:${pColor};font-weight:700;outline:none">
          ${['Critical','High','Medium','Low'].map(p=>`<option ${c.priority===p?'selected':''}>${p}</option>`).join('')}
        </select>`:`<span style="font-size:10px;font-weight:700;color:${pColor};background:${pColor}12;border:1px solid ${pColor}22;padding:2px 7px;border-radius:10px">${c.priority}</span>`}
        ${done&&canEdit&&isActive?`<button data-cid="${c.id}" onclick="_chkReset(this)" style="padding:3px 8px;background:var(--s2);border:1px solid var(--bd);border-radius:6px;color:var(--tx3);font-size:10px;cursor:pointer;font-weight:600">↺</button>`:''}
      </div>
      ${done?`<div style="font-size:13px;font-weight:700;color:${c.result==='pass'?'#15803d':'#dc2626'}">${c.result==='pass'?'✓ Working':'✗ Not Working'}</div>`:''}
      ${isActive&&canEdit&&!done?`<div style="display:flex;gap:8px">
        <button data-cid="${c.id}" data-res="pass" onclick="_chkMark(this)" style="flex:1;padding:11px;border-radius:8px;border:2px solid #86efac;background:#f0fdf4;color:#15803d;font-weight:800;font-size:14px;cursor:pointer">✓ Working</button>
        <button data-cid="${c.id}" data-res="fail" onclick="_chkMark(this)" style="flex:1;padding:11px;border-radius:8px;border:2px solid #fca5a5;background:#fef2f2;color:#dc2626;font-weight:800;font-size:14px;cursor:pointer">✗ Fail</button>
      </div>`:''}
      ${(c.result==='fail'||(canEdit&&isActive))?`<textarea data-cid="${c.id}" placeholder="${c.result==='fail'?'Describe the issue…':'Optional note…'}" onblur="_chkNote(this)" style="width:100%;margin-top:8px;padding:8px 10px;background:var(--s2);border:1px solid var(--bd);border-radius:7px;color:var(--tx);font-family:var(--fn);font-size:12px;outline:none;resize:vertical;min-height:50px;box-sizing:border-box">${c.tester_note||''}</textarea>`:''}
    </div>`;
  });

  body+=`<div style="display:flex;gap:8px;margin-top:12px;padding-top:12px;border-top:1px solid var(--bd)">
    ${canEdit&&isActive?`<button onclick="openServiceList(window._chkSession)" style="flex:1;padding:11px;background:${pending===0?'#15803d':'var(--s2)'};color:${pending===0?'#fff':'var(--tx2)'};border:${pending===0?'none':'1px solid var(--bd)'};border-radius:9px;font-size:13px;font-weight:800;cursor:pointer">${pending===0?'✓ Done — Next Service':'← Back to Services'}</button>`:''}
    ${fail>0&&canEdit&&isAdmin()?`<button onclick="convertServiceFails(window._chkSession,window._chkService)" style="padding:11px 14px;background:var(--ac);color:#fff;border:none;border-radius:9px;font-size:12px;font-weight:700;cursor:pointer">→ Tasks</button>`:''}
  </div>`;

  const pageEl=document.getElementById('content');
  if(pageEl){
    pageEl.innerHTML=`<button class="btn bg2 bsm" onclick="openServiceList(window._chkSession)" style="margin-bottom:14px">← Back to Services</button>
    <div style="font-size:18px;font-weight:800;margin-bottom:4px">${serviceName}</div>
    <div style="font-size:11px;color:var(--tx3);margin-bottom:14px">${checks.filter(c=>c.result!=='pending').length}/${checks.length} done</div>`+body;
  }
};

// Safe helpers — read checkId from data-cid, session/service from globals
function _chkMark(btn){
  const cid=btn.dataset.cid, res=btn.dataset.res;
  const c=DB.testChecks.find(x=>x.id===cid);if(!c)return;
  c.result=res;c.tested_at=new Date().toISOString();
  sbSaveCheck(c).then(()=>openServiceChecklist(window._chkSession,window._chkService));
}
function _chkReset(btn){
  const c=DB.testChecks.find(x=>x.id===btn.dataset.cid);if(!c)return;
  c.result='pending';c.tested_at=null;c.tester_note='';
  sbSaveCheck(c).then(()=>openServiceChecklist(window._chkSession,window._chkService));
}
function _chkPriority(sel){
  const c=DB.testChecks.find(x=>x.id===sel.dataset.cid);if(!c)return;
  c.priority=sel.value;
  sbSaveCheck(c);
}
function _chkNote(ta){
  const c=DB.testChecks.find(x=>x.id===ta.dataset.cid);if(!c)return;
  c.tester_note=ta.value;
  sbSaveCheck(c);
}


window.markCheck=async(checkId,result,sessionId,serviceName)=>{
  window._chkSession=sessionId;window._chkService=serviceName;
  const c=DB.testChecks.find(x=>x.id===checkId);if(!c)return;
  c.result=result;c.tested_at=new Date().toISOString();
  await sbSaveCheck(c);
  openServiceChecklist(sessionId,serviceName);
};
window.resetCheck=async(checkId,sessionId,serviceName)=>{
  window._chkSession=sessionId;window._chkService=serviceName;
  const c=DB.testChecks.find(x=>x.id===checkId);if(!c)return;
  c.result='pending';c.tested_at=null;c.tester_note='';
  await sbSaveCheck(c);
  openServiceChecklist(sessionId,serviceName);
};
window.setCheckPriority=async(checkId,p)=>{const c=DB.testChecks.find(x=>x.id===checkId);if(!c)return;c.priority=p;await sbSaveCheck(c);};
window.saveCheckNote=async(checkId,note)=>{const c=DB.testChecks.find(x=>x.id===checkId);if(!c)return;c.tester_note=note;await sbSaveCheck(c);};

window.pauseSession=async(sid)=>{const s=DB.testSessions.find(x=>x.id===sid);if(!s)return;s.status='Paused';await sbUpdateSession({...s,status:'Paused'});toast('Paused — tap Continue to resume','inf');openServiceList(sid);};
window.stopSession=async(sid)=>{if(!confirm('Cancel this session?'))return;const s=DB.testSessions.find(x=>x.id===sid);if(!s)return;s.status='Cancelled';await sbUpdateSession({...s,status:'Cancelled'});toast('Cancelled','inf');navTo('svctest');};

window.deleteTestSession=async(sid)=>{
  if(!confirm('Delete this test session and all its checks? This cannot be undone.'))return;
  // Delete all checks for this session
  const checks=DB.testChecks.filter(c=>c.session_id===sid);
  for(const c of checks){
    if(c.id&&!c.id.startsWith('chk')) await sbDelete('test_checks',c.id);
  }
  // Delete the session
  await sbDelete('test_sessions',sid);
  DB.testChecks=DB.testChecks.filter(c=>c.session_id!==sid);
  DB.testSessions=DB.testSessions.filter(s=>s.id!==sid);
  toast('Session deleted ✓','ok');
  nav('svctest',document.querySelector('[data-p="svctest"]'));
};
window.completeSession=window.completeSessionFlow=async(sid)=>{
  const s=DB.testSessions.find(x=>x.id===sid);if(!s)return;
  const checks=DB.testChecks.filter(c=>c.session_id===sid);
  const pending=checks.filter(c=>c.result==='pending').length;
  if(pending>0&&!confirm(pending+' check'+(pending>1?'s':'')+' still pending. Finish anyway?'))return;
  s.status='Completed';s.completed_at=new Date().toISOString();
  s.total_checks=checks.length;
  s.passed_checks=checks.filter(c=>c.result==='pass').length;
  s.failed_checks=checks.filter(c=>c.result==='fail').length;
  await sbUpdateSession(s);
  // Notify admins
  const tester=DB.team.find(m=>m.id===s.tester_id)||CU;
  // Admin broadcast — in-app row via notifyAdmins() with meta.testSessionId
  // so it's clickable and realtime-deliverable (the old notifyAdminsWA-only
  // call had no way to attach a link), plus the Telegram side separately.
  notifyAdmins(`🧪 Service Test Completed — ${s.tester_name} · ${s.operator_name}: ${s.passed_checks}✓ ${s.failed_checks}✗ of ${s.total_checks}`,'Service Test Completed','',{testSessionId:s.id});
  notifyAdminsTG(`🧪 Service Test Completed\n\n👤 Tester: ${s.tester_name}\n🏢 Operator: ${s.operator_name}\n✅ Passed: ${s.passed_checks}  ❌ Failed: ${s.failed_checks}  📋 Total: ${s.total_checks}${s.failed_checks>0?'\n\n⚠️ Failed items have been converted to tasks.':''}`,appLink('svctest'));
  logAction('Service Test Completed',`${s.tester_name} completed service test for ${s.operator_name} — ${s.passed_checks}/${s.total_checks} passed`,'Success',s.operator_name,`Failed: ${s.failed_checks}`,{operatorName:s.operator_name,memberName:s.tester_name,memberId:s.tester_id});
  toast('Test complete — '+s.passed_checks+'✓ '+s.failed_checks+'✗','ok',5000);
  window._chkSession=null;

  // Close out the auto-created "Service Test" task this session belongs to,
  // if one exists — otherwise it would sit open in the assignee's My Tasks forever.
  const linkedTask=DB.tasks.find(t=>t.type==='Service Test'&&t.operator===s.operator_id&&(t.assignedTo===s.tester_id||(t.assignees||[]).includes(s.tester_id))&&t.due===s.test_date&&!['Done','Cancelled'].includes(t.status));
  if(linkedTask){
    linkedTask.what=`Completed service test for ${s.operator_name}: ${s.passed_checks} passed, ${s.failed_checks} failed out of ${s.total_checks} checks.${s.failed_checks>0?' Failures were converted to tasks.':''}`;
    await approveTask(linkedTask.id);
  }

  // Stay on the page — show the completed service list
  openServiceList(sid);
};

window.startTestSession=async(operatorId,memberId)=>{
  const op=[...DB.operators,...DB.companies].find(o=>o.id===operatorId);
  const m=DB.team.find(t=>t.id===memberId)||CU;
  if(!op){toast('Operator not found','bad');return;}
  const todayStr=localDateStr();
  const svcs=DB.services.filter(s=>s.operator_name===op.name);
  if(!svcs.length){toast('No services linked to '+op.name+'. Add services first.','bad');return;}
  toast('Starting…','inf',3000);
  const session={operator_id:operatorId,tester_id:m.id,tester_name:m.name,operator_name:op.name,test_date:todayStr,status:'In Progress'};
  const r=await sbCreateSession(session);if(!r?.id){toast('Failed to create session','bad');return;}
  session.id=r.id;
  const checkNames=getCheckTemplates();
  const checks=[];
  for(const svc of svcs){
    for(const name of checkNames){
      const c={session_id:session.id,service_id:svc.id,service_name:svc.name,operator_name:op.name,check_name:name,result:'pending',priority:'High',tester_note:'',tested_at:null,test_date:todayStr,tester_name:m.name};
      const cr=await sbSaveCheck(c);
      if(cr?.id)c.id=cr.id; else c.id='chk'+gid();
      checks.push(c);
    }
  }
  session.total_checks=checks.length;
  await sbUpdateSession({...session,total_checks:checks.length});
  DB.testSessions.unshift(session);DB.testChecks.unshift(...checks);
  toast('Test started ✓ · tap a service to begin','ok',4000);
  openServiceList(session.id);
};

window.convertServiceFails=async(sessionId,serviceName)=>{
  const fails=DB.testChecks.filter(c=>c.session_id===sessionId&&c.service_name===serviceName&&c.result==='fail'&&!c.converted_to_task);
  if(!fails.length){toast('No unconverted failures for this service','inf');return;}
  let count=0;
  for(const c of fails) await convertFailToTask(c.id).then(()=>count++).catch(()=>{});
  toast(count+' task'+(count>1?'s':'')+' created ✓','ok');
  openServiceChecklist(sessionId,serviceName);
};

// Turns one failed check into a Bug Fix task, so it shows up in the normal
// task workflow instead of just sitting flagged in the Failed tab.
window.convertFailToTask=async(checkId)=>{
  const c=DB.testChecks.find(x=>x.id===checkId);
  if(!c) throw new Error('Check not found');
  if(c.converted_to_task) return c.task_id;

  const svc=DB.services.find(s=>s.id===c.service_id||s.name===c.service_name);
  const op=[...DB.operators,...DB.companies].find(o=>o.name===c.operator_name);
  const tester=DB.team.find(m=>m.name===c.tester_name);

  const t={
    id:'t'+gid(), title:`🧪 Service Test Fail: ${c.check_name} — ${c.service_name}`,
    status:'New', priority:c.priority||'High', type:'Bug Fix',
    assignedTo:tester?.id||'', assignees:tester?[tester.id]:[],
    reviewer:'', service:svc?.id||'', operator:op?.id||'',
    reqBy:c.tester_name||CU?.name||'', createdBy:CU?.name||'',
    due:null, est:null, recur:null,
    desc:`Found during service testing on ${fd(c.test_date)} by ${c.tester_name||'?'}.\n\n🏢 Operator: ${c.operator_name}\n📡 Service: ${c.service_name}\n✗ Check: ${c.check_name}${c.tester_note?`\n\n📝 Tester notes:\n${c.tester_note}`:''}`,
    link:'', tsCreated:now(), tsAssigned:tester?now():null, tsOpened:null, tsStarted:null,
    tsSubmitted:null, tsReviewed:null, tsArchived:null,
    actual:null, what:'', tech:'', rejReason:'', rejections:[], comments:[],
  };
  DB.tasks.unshift(t);
  const r=await nCreateTask(t,t.id);
  if(r?.id) t.id=r.id;

  c.converted_to_task=true; c.task_id=t.id;
  await sbMarkCheckConverted(checkId,t.id);

  if(tester&&tester.name!==CU?.name){
    sendNotif(tester.name,`Test failure converted to task: "${c.check_name}" (${c.service_name})`,'Task Assigned',t.title);
    notifyTG(tester.id,'task_assigned',{title:t.title,priority:t.priority,due:'Not set',desc:t.desc,link:appLink('task-'+t.id)});
  }
  logAction('Task Created',`Service test failure converted to task: "${esc(t.title)}"`,'Warning',t.title,'',{taskId:t.id,taskTitle:t.title});
  updateBadges();
  return t.id;
};

// Bulk-converts every not-yet-converted failure across all sessions (Failed tab button)
window.convertAllFailed=async()=>{
  const fails=DB.testChecks.filter(c=>c.result==='fail'&&!c.converted_to_task);
  if(!fails.length){toast('Nothing to convert','inf');return;}
  toast(`Converting ${fails.length} failure${fails.length>1?'s':''}…`,'inf',4000);
  let count=0;
  for(const c of fails){ try{ await convertFailToTask(c.id); count++; }catch(e){} }
  toast(`${count} task${count!==1?'s':''} created ✓`,'ok');
  nav('svctest',document.querySelector('[data-p="svctest"]'));
};
function buildTestReports(){
  if(!DB.testChecks) return '<div class="empty"><div class="ei">📊</div><div class="et">No test data yet</div></div>';
  const checks=(DB.testChecks||[]).filter(c=>c&&c.result!=='pending');
  if(!checks.length)return'<div class="empty"><div class="ei">📊</div><div class="et">No test data yet</div></div>';
  const opNames=[...new Set(checks.map(c=>c.operator_name))];
  const opStats=opNames.map(op=>{const oc=checks.filter(c=>c.operator_name===op);const pass=oc.filter(c=>c.result==='pass').length;const fail=oc.filter(c=>c.result==='fail').length;return{op,pass,fail,pct:pass+fail?Math.round(pass/(pass+fail)*100):0};}).sort((a,b)=>b.pct-a.pct);
  const svcNames=[...new Set(checks.map(c=>c.service_name))];
  const svcStats=svcNames.map(svc=>{const sc=checks.filter(c=>c.service_name===svc);const pass=sc.filter(c=>c.result==='pass').length;const fail=sc.filter(c=>c.result==='fail').length;return{svc,pass,fail,pct:pass+fail?Math.round(pass/(pass+fail)*100):0};}).sort((a,b)=>b.pct-a.pct);
  const failGroups={};checks.filter(c=>c.result==='fail').forEach(c=>{const k=c.service_name+'||'+c.check_name;if(!failGroups[k])failGroups[k]={service:c.service_name,check:c.check_name,count:0,priority:c.priority};failGroups[k].count++;});
  const topFails=Object.values(failGroups).sort((a,b)=>b.count-a.count).slice(0,10);
  let h='<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">';
  h+=`<div class="card"><div class="ct"><span class="ct-t">Operator Health</span></div>${opStats.map(({op,pass,fail,pct})=>{const col=pct>=80?'#15803d':pct>=50?'#b45309':'#dc2626';return`<div style="margin-bottom:9px"><div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px"><span style="font-weight:600">${op}</span><span style="font-weight:700;color:${col}">${pct}%</span></div><div style="height:7px;background:var(--s2);border-radius:4px;overflow:hidden"><div style="height:100%;width:${pct}%;background:${col};border-radius:4px"></div></div></div>`;}).join('')}</div>`;
  h+=`<div class="card"><div class="ct"><span class="ct-t">Service Health</span></div>${svcStats.map(({svc,pass,fail,pct})=>{const col=pct>=80?'#15803d':pct>=50?'#b45309':'#dc2626';return`<div style="margin-bottom:9px"><div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px"><span style="font-weight:600">${svc}</span><span style="font-weight:700;color:${col}">${pct}%</span></div><div style="height:7px;background:var(--s2);border-radius:4px;overflow:hidden"><div style="height:100%;width:${pct}%;background:${col};border-radius:4px"></div></div></div>`;}).join('')}</div>`;
  h+='</div>';
  if(topFails.length)h+=`<div class="card"><div class="ct"><span class="ct-t">Most Common Failures</span></div><div class="tw"><table><thead><tr><th>Service</th><th>Check</th><th>Times</th><th>Priority</th></tr></thead><tbody>${topFails.map(f=>`<tr><td style="font-weight:600">${f.service}</td><td>${f.check}</td><td><span style="background:var(--rb);color:var(--r);border:1px solid var(--rbr);padding:1px 8px;border-radius:20px;font-weight:700">${f.count}×</span></td><td>${ppill(f.priority)}</td></tr>`).join('')}</tbody></table></div></div>`;
  return h;
}

function buildScheduleEditor(){
  const allOps=[...DB.operators,...DB.companies.filter(c=>c.type!=='Partner')];
  const defaultReviewer=DB.team.find(t=>t.name==='Aymen');
  return`<div class="card"><div class="ct"><span class="ct-t">Test Schedule</span></div>
    <div class="tw" style="margin-bottom:14px"><table><thead><tr><th>Operator</th><th>Tester</th><th>Day</th><th>Reviewer</th><th>Status</th><th></th></tr></thead><tbody>
      ${DB.testSchedules.length===0?'<tr><td colspan="6" style="text-align:center;color:var(--tx3);padding:16px">No schedules yet</td></tr>':
        DB.testSchedules.map(s=>{const op=[...DB.operators,...DB.companies].find(o=>o.id===s.operator_id);const m=DB.team.find(t=>t.id===s.member_id);return`<tr>
          <td style="font-weight:600">📡 ${op?.name||'?'}</td>
          <td><span style="display:flex;align-items:center;gap:5px">${m?`<span style="width:18px;height:18px;border-radius:50%;background:${m.color};display:inline-flex;align-items:center;justify-content:center;font-size:7px;font-weight:700;color:#fff">${m.av}</span>`:''} ${m?.name||'?'}</span></td>
          <td>${DAYS[s.day_of_week]}</td>
          <td><select onchange="updateScheduleReviewer('${s.id}',this.value)" style="padding:5px 7px;background:var(--s2);border:1px solid var(--bd);border-radius:6px;color:var(--tx);font-size:12px;outline:none">
            <option value="" ${!s.reviewer_id?'selected':''}>Default${defaultReviewer?` (${esc(defaultReviewer.name)})`:''}</option>
            ${DB.team.map(t=>`<option value="${t.id}" ${s.reviewer_id===t.id?'selected':''}>${esc(t.name)}</option>`).join('')}
          </select></td>
          <td><span style="background:${s.active!==false?'var(--gb)':'var(--s2)'};color:${s.active!==false?'var(--g)':'var(--tx3)'};font-size:10px;font-weight:700;padding:2px 7px;border-radius:10px">${s.active!==false?'Active':'Inactive'}</span></td>
          <td><button class="btn bd2 bxs" onclick="deleteSchedule('${s.id}')">✕</button></td>
        </tr>`;}).join('')}
    </tbody></table></div>
    <div style="font-size:12px;font-weight:700;color:var(--tx2);margin-bottom:8px">Add Entry</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end">
      <div style="flex:1;min-width:130px"><label style="font-size:11px;font-weight:700;color:var(--tx3);display:block;margin-bottom:4px">Operator</label>
        <select id="new-sched-op" style="width:100%;padding:8px 10px;background:var(--s2);border:1px solid var(--bd);border-radius:7px;color:var(--tx);font-size:13px;outline:none">
          ${allOps.map(o=>`<option value="${o.id}">${esc(o.name)}</option>`).join('')}
        </select></div>
      <div style="flex:1;min-width:130px"><label style="font-size:11px;font-weight:700;color:var(--tx3);display:block;margin-bottom:4px">Member</label>
        <select id="new-sched-mbr" style="width:100%;padding:8px 10px;background:var(--s2);border:1px solid var(--bd);border-radius:7px;color:var(--tx);font-size:13px;outline:none">
          ${DB.team.map(m=>`<option value="${m.id}">${esc(m.name)}</option>`).join('')}
        </select></div>
      <div><label style="font-size:11px;font-weight:700;color:var(--tx3);display:block;margin-bottom:4px">Day</label>
        <select id="new-sched-day" style="padding:8px 10px;background:var(--s2);border:1px solid var(--bd);border-radius:7px;color:var(--tx);font-size:13px;outline:none">
          ${DAYS.map((d,i)=>`<option value="${i}">${d}</option>`).join('')}
        </select></div>
      <div style="min-width:130px"><label style="font-size:11px;font-weight:700;color:var(--tx3);display:block;margin-bottom:4px">Reviewer</label>
        <select id="new-sched-rev" style="width:100%;padding:8px 10px;background:var(--s2);border:1px solid var(--bd);border-radius:7px;color:var(--tx);font-size:13px;outline:none">
          <option value="">Default${defaultReviewer?` (${esc(defaultReviewer.name)})`:''}</option>
          ${DB.team.map(t=>`<option value="${t.id}">${esc(t.name)}</option>`).join('')}
        </select></div>
      <button class="btn bp" style="padding:9px 16px;font-size:13px" onclick="addScheduleNew()">+ Add</button>
    </div>
  </div>`;
}

window.addScheduleNew=async()=>{
  const operatorId=document.getElementById('new-sched-op')?.value;const memberId=document.getElementById('new-sched-mbr')?.value;const dayOfWeek=parseInt(document.getElementById('new-sched-day')?.value||'1');const reviewerId=document.getElementById('new-sched-rev')?.value||null;
  if(!operatorId||!memberId){toast('Select operator and member','bad');return;}
  const exists=DB.testSchedules.find(s=>s.operator_id===operatorId&&s.member_id===memberId&&s.day_of_week===dayOfWeek&&s.active!==false);
  if(exists){toast('Already scheduled','bad');return;}
  const s={operator_id:operatorId,member_id:memberId,day_of_week:dayOfWeek,active:true,reviewer_id:reviewerId};
  const r=await sbSaveSchedule(s);if(r?.id){s.id=r.id;DB.testSchedules.push(s);toast('Added ✓','ok');nav('svctest',document.querySelector('[data-p="svctest"]'));}
};
window.addSchedule=window.addScheduleNew;
window.updateScheduleReviewer=async(id,reviewerId)=>{
  const s=DB.testSchedules.find(x=>x.id===id);if(!s)return;
  s.reviewer_id=reviewerId||null;
  await sbUpdateScheduleReviewer(id,s.reviewer_id);
  toast('Reviewer updated ✓','ok');
};
window.deleteSchedule=async(id)=>{await sbDelSchedule(id);DB.testSchedules=DB.testSchedules.filter(s=>s.id!==id);nav('svctest',document.querySelector('[data-p="svctest"]'));};



function buildBackupCard(){
  const backups=getBackups();
  const payload=buildBackupPayload();
  const total=Object.values(payload.row_counts).reduce((a,b)=>a+b,0);
  let bRows='';
  if(backups.length){
    backups.forEach(b=>{
      const t=Object.values(b.row_counts||{}).reduce((a,c)=>a+c,0);
      bRows+='<div style="display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--bd)">'+
        '<div style="flex:1;min-width:0">'+
          '<div style="font-size:12px;font-weight:600">'+b.label+'</div>'+
          '<div style="font-size:10px;color:var(--tx3)">'+t+' records · by '+b.created_by+'</div>'+
        '</div>'+
        '<button onclick="restoreFromLocal(\''+b.id+'\')" style="padding:4px 10px;background:var(--al);color:var(--ac);border:1px solid #bfdbfe;border-radius:6px;font-size:10px;font-weight:700;cursor:pointer">↩ Restore</button>'+
        '<button onclick="downloadLocalBackup(\''+b.id+'\')" style="padding:4px 10px;background:var(--s2);color:var(--tx3);border:1px solid var(--bd);border-radius:6px;font-size:10px;font-weight:700;cursor:pointer">⬇</button>'+
        '<button onclick="deleteLocalBackup(\''+b.id+'\')" style="padding:4px 10px;background:var(--rb);color:var(--r);border:1px solid var(--rbr);border-radius:6px;font-size:10px;font-weight:700;cursor:pointer">✕</button>'+
      '</div>';
    });
  } else {
    bRows='<div style="text-align:center;padding:16px;font-size:12px;color:var(--tx3)">No local snapshots yet — click Download to create one</div>';
  }
  return '<div class="card" style="margin-bottom:12px">'+
    '<div class="ct"><span class="ct-t">🗄 Backup &amp; Restore</span>'+
    '<span style="font-size:10px;color:var(--tx3);font-weight:400">Auto-saved daily · '+backups.length+' of '+BACKUP_MAX+' snapshots</span></div>'+
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px">'+
      '<button onclick="downloadBackup()" style="padding:10px;background:var(--ac);color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer">⬇ Download ('+total+' records)</button>'+
      '<button onclick="triggerRestoreFile()" style="padding:10px;background:var(--s2);color:var(--tx2);border:1px solid var(--bd);border-radius:8px;font-size:12px;font-weight:700;cursor:pointer">↩ Restore from File</button>'+
    '</div>'+
    '<div style="font-size:11px;font-weight:700;color:var(--tx3);margin-bottom:8px;text-transform:uppercase;letter-spacing:.06em">Local Snapshots ('+backups.length+'/'+BACKUP_MAX+')</div>'+
    bRows+'</div>';
}
