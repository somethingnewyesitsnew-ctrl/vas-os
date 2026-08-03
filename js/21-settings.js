// §21 ── SETTINGS ────────────────────────────────────────────────────────
function rSettings(el){
  if(!isAdmin()){el.innerHTML='<div class="empty"><div class="ei">🔒</div><div class="et">Admin only</div></div>';return;}
  
  // Load saved lists from localStorage
  const LISTS_KEY = 'vas_dropdown_lists';
  function getLists(){
    const def={
      serviceTypes:['Digital','IVR','USSD','SMS'],
      serviceCategories:['Content','Education','Entertainment','Gaming','Books','Other'],
      serviceStatuses:['Live','In Development','Paused','Deprecated'],
      memberDepartments:['Engineering','Design','Content','Management','Marketing','Finance','Other'],
      memberRoles:['CEO','Projects Manager','HR Manager','Super Senior Developer','Senior Developer','Front End Developer','Front End Designer','Sys Admin','Content Manager','Developer'],
      memberAccess:['Admin','Member'],
      projectStatuses:['Planning','Active','On Hold','Completed','Cancelled'],
      projectFields:['Engineering','Content','Design','Marketing','Operations','Finance','Research','Other'],
      taskTypes:['Feature','Bug Fix','Content','Design','Maintenance','Research','Meeting'],
      taskPriorities:['Critical','High','Medium','Low'],
      meetingTypes:['Internal','External','Client','Operator'],
      companyTypes:['Telecom Operator','Partner','Client','Vendor','Other'],
    };
    try{ return {...def,...JSON.parse(localStorage.getItem(LISTS_KEY)||'{}')}; }
    catch(e){ return def; }
  }
  function saveLists(l){ localStorage.setItem(LISTS_KEY,JSON.stringify(l)); applyListsToForms(l); }
  
  const lists=getLists();
  const sysName=localStorage.getItem('vas_sys_name')||'VAS OS';
  
  const listDefs=[
    {key:'serviceTypes',label:'Service Types'},
    {key:'serviceCategories',label:'Service Categories'},
    {key:'serviceStatuses',label:'Service Statuses'},
    {key:'memberDepartments',label:'Member Departments'},
    {key:'memberRoles',label:'Member Roles'},
    {key:'projectStatuses',label:'Project Statuses'},
    {key:'projectFields',label:'Project Fields of Work'},
    {key:'taskTypes',label:'Task Types'},
    {key:'taskPriorities',label:'Task Priorities'},
    {key:'meetingTypes',label:'Meeting Types'},
    {key:'companyTypes',label:'Company Types'},
  ];
  
  const cfg=getNotifCfg();
  el.innerHTML=`
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;align-items:start">
    <div>
      <div class="card" style="margin-bottom:12px">
        <div class="ct"><span class="ct-t">⚙ System</span></div>
        <div class="fgr" style="margin-bottom:10px">
          <label>System Name</label>
          <div style="display:flex;gap:8px">
            <input id="set-sysname" value="${sysName}" style="flex:1;padding:8px 10px;background:var(--s2);border:1px solid var(--bd2);border-radius:7px;color:var(--tx);font-family:var(--fn);font-size:13px;font-weight:600;outline:none">
            <button class="btn bp bsm" onclick="saveSettings()">Save</button>
          </div>
        </div>
        <div style="font-size:10px;color:var(--tx3);margin-top:6px">
          Supabase: <span id="sb-status-check" style="font-weight:600">checking…</span>
        </div>
      </div>

      <div class="card" style="margin-bottom:12px">
        <div class="ct"><span class="ct-t">📊 Google Sheets Backup</span><span style="font-size:10px;color:var(--tx3);font-weight:400">Write-only · never reads from sheet</span></div>
        <div style="font-size:11px;color:var(--tx3);margin-bottom:12px;line-height:1.7">
          Send a backup snapshot to Google Sheets automatically. Uses a Google Apps Script web app as a bridge.
          <strong style="color:var(--tx)"> Setup (5 min):</strong><br>
          1. Open <strong>script.google.com</strong> → New project → paste the script below<br>
          2. Deploy → New deployment → Web app → Execute as: Me · Access: Anyone<br>
          3. Copy the Web app URL and paste below
        </div>
        <details style="margin-bottom:10px">
          <summary style="cursor:pointer;font-size:11px;font-weight:700;color:var(--ac);padding:6px 0">▶ Show Apps Script code to paste</summary>
          <pre style="background:var(--s2);border:1px solid var(--bd);border-radius:8px;padding:10px;font-size:10px;font-family:var(--fnm);overflow-x:auto;margin-top:6px;white-space:pre-wrap;color:var(--tx2)">function doPost(e){
  try{
    const data=JSON.parse(e.postData.contents);
    const ss=SpreadsheetApp.getActiveSpreadsheet();
    const logSheet=ss.getSheetByName('Backup Log')||ss.insertSheet('Backup Log');
    logSheet.appendRow([new Date(),data.created_by,data.sys_name,
      Object.entries(data.row_counts||{}).map(([k,v])=>k+':'+v).join(', ')]);
    Object.entries(data.tables||{}).forEach(([name,rows])=>{
      if(!rows||!rows.length)return;
      let sh=ss.getSheetByName(name);
      if(!sh){sh=ss.insertSheet(name);}
      if(sh.getLastRow()===0){
        sh.appendRow(Object.keys(rows[0]));
      }
      rows.forEach(r=>sh.appendRow(Object.values(r).map(v=>
        typeof v==='object'?JSON.stringify(v):v)));
    });
    return ContentService.createTextOutput('OK');
  }catch(err){
    return ContentService.createTextOutput('Error: '+err.message);
  }
}</pre>
        </details>
        <div style="display:grid;gap:8px;margin-bottom:10px">
          <div><label style="font-size:10px;font-weight:700;color:var(--tx3);display:block;margin-bottom:3px">Apps Script Web App URL</label>
            <input id="cfg-sheets-url" value="${localStorage.getItem('vas_sheets_url')||''}" placeholder="https://script.google.com/macros/s/…/exec"
              style="width:100%;padding:7px 10px;background:var(--s);border:1px solid var(--bd);border-radius:7px;color:var(--tx);font-size:12px;font-family:var(--fnm);outline:none;box-sizing:border-box">
          </div>
          <label style="display:flex;align-items:center;gap:7px;cursor:pointer;font-size:12px;font-weight:600">
            <input type="checkbox" id="cfg-sheets-auto" ${localStorage.getItem('vas_sheets_auto')==='1'?'checked':''} style="width:15px;height:15px;accent-color:var(--ac)">
            Auto-send to Sheets on daily backup
          </label>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          <button onclick="saveSheetsCfg()" style="padding:9px;background:var(--ac);color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer">💾 Save URL</button>
          <button onclick="sendToGoogleSheets()" style="padding:9px;background:#16a34a;color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer">📤 Send Backup Now</button>
        </div>
        <div id="sheets-status" style="font-size:11px;margin-top:8px;color:var(--tx3)"></div>
      </div>
        <div style="font-size:11px;color:var(--tx3);margin-bottom:12px;line-height:1.6">Configure automatic email and Telegram alerts when tasks are assigned. Both are free with no backend required.</div>

        <div style="font-size:12px;font-weight:800;color:var(--tx2);margin-bottom:8px;display:flex;align-items:center;gap:6px">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 7 10-7"/></svg>
          Email via EmailJS
          <label style="margin-left:auto;display:flex;align-items:center;gap:5px;cursor:pointer;font-size:11px;font-weight:600">
            <input type="checkbox" id="cfg-email-enabled" ${cfg.email_enabled?'checked':''} style="width:14px;height:14px">Enable</label>
        </div>
        <div style="background:var(--s2);border:1px solid var(--bd);border-radius:8px;padding:10px;margin-bottom:12px;font-size:11px;color:var(--tx3);line-height:1.7">
          1. Create free account at <strong style="color:var(--ac)">emailjs.com</strong><br>
          2. Add an Email Service (Gmail, Outlook, etc.)<br>
          3. Create a Template — use variables: <code style="background:var(--s);padding:1px 4px;border-radius:3px">{{to_email}} {{to_name}} {{task_title}} {{task_priority}} {{task_due}} {{task_desc}} {{task_link}} {{assigned_by}}</code><br>
          4. Copy your keys below and save
        </div>
        <div style="display:grid;gap:8px;margin-bottom:12px">
          <div><label style="font-size:10px;font-weight:700;color:var(--tx3);display:block;margin-bottom:3px">Public Key</label>
            <input id="cfg-ejs-pub" value="${cfg.emailjs_public_key||''}" placeholder="user_xxxxxxxxxxxxxxx" style="width:100%;padding:7px 10px;background:var(--s);border:1px solid var(--bd);border-radius:7px;color:var(--tx);font-size:12px;font-family:var(--fnm);outline:none;box-sizing:border-box"></div>
          <div><label style="font-size:10px;font-weight:700;color:var(--tx3);display:block;margin-bottom:3px">Service ID</label>
            <input id="cfg-ejs-svc" value="${cfg.emailjs_service_id||''}" placeholder="service_xxxxxxx" style="width:100%;padding:7px 10px;background:var(--s);border:1px solid var(--bd);border-radius:7px;color:var(--tx);font-size:12px;font-family:var(--fnm);outline:none;box-sizing:border-box"></div>
          <div><label style="font-size:10px;font-weight:700;color:var(--tx3);display:block;margin-bottom:3px">Template ID</label>
            <input id="cfg-ejs-tpl" value="${cfg.emailjs_template_id||''}" placeholder="template_xxxxxxx" style="width:100%;padding:7px 10px;background:var(--s);border:1px solid var(--bd);border-radius:7px;color:var(--tx);font-size:12px;font-family:var(--fnm);outline:none;box-sizing:border-box"></div>
        </div>

        <div style="font-size:12px;font-weight:800;color:var(--tx2);margin-bottom:8px;display:flex;align-items:center;gap:6px">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="#229ED9"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.568 8.16-1.61 7.59c-.121.545-.44.679-.892.423l-2.46-1.814-1.187 1.143c-.131.131-.242.242-.497.242l.178-2.523 4.59-4.148c.199-.178-.043-.276-.31-.099l-5.67 3.572-2.44-.762c-.53-.166-.541-.53.111-.784l9.538-3.677c.442-.166.828.099.649.827z"/></svg>
          Telegram via Bot API
          <span style="margin-left:auto;background:#e0f2fe;color:#0369a1;font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;border:1px solid #bae6fd">Manual setup required</span>
        </div>
        <div style="background:var(--s2);border:1px solid var(--bd);border-radius:8px;padding:10px;margin-bottom:12px;font-size:11px;color:var(--tx3);line-height:1.8">
          1. Message <strong style="color:var(--tx)">@BotFather</strong> on Telegram → <code style="background:var(--s);padding:1px 4px;border-radius:3px">/newbot</code> → follow the prompts to get a bot token.<br>
          2. Paste that token into <code style="background:var(--s);padding:1px 4px;border-radius:3px">TG_BOT_TOKEN</code> at the top of <code style="background:var(--s);padding:1px 4px;border-radius:3px">js/00-core-preamble.js</code> and redeploy.<br>
          3. Each member opens a chat with your bot and taps <strong style="color:var(--tx)">Start</strong> — this is required, a bot can't message someone who hasn't started a chat with it first.<br>
          4. Get their numeric Chat ID (have them message <strong style="color:var(--tx)">@userinfobot</strong>, or check your bot's <code style="background:var(--s);padding:1px 4px;border-radius:3px">getUpdates</code> API response) and paste it into their profile under Team → Edit Member → Telegram Chat ID.
          <div style="margin-top:8px;padding-top:8px;border-top:1px solid var(--bd)">
            ℹ️ Unlike phone numbers, a Telegram Chat ID only works for messages sent <em>by your bot</em> — there's no "click to open chat" link an admin can share, since the ID isn't a public handle.
          </div>
        </div>
        <div style="margin-bottom:10px">
          <label style="font-size:10px;font-weight:700;color:var(--tx3);display:block;margin-bottom:4px">Your Telegram Chat ID (for test)</label>
          <div style="display:flex;gap:7px">
            <input id="cfg-tg-test-id" placeholder="e.g. 123456789" value="${CU?.telegram||''}" style="flex:1;padding:7px 10px;background:var(--s);border:1px solid var(--bd);border-radius:7px;color:var(--tx);font-size:12px;font-family:var(--fnm);outline:none">
            <button class="btn bp bsm" onclick="testTGDirect()">🧪 Test</button>
          </div>
        </div>

        <button class="btn bp" style="width:100%;padding:10px" onclick="saveNotifConfig()">💾 Save Email Settings</button>
      </div>

      <div class="card">
        <div class="ct"><span class="ct-t">🔐 Team Credentials</span></div>
        <div class="tw"><table><thead><tr><th>Name</th><th>Username</th><th>Password</th></tr></thead><tbody>
          ${DB.team.map(m=>`<tr>
            <td><span style="display:flex;align-items:center;gap:6px">
              <span style="width:18px;height:18px;border-radius:50%;background:${m.color};display:inline-flex;align-items:center;justify-content:center;font-size:7px;font-weight:700;color:#fff">${m.av}</span>
              ${m.name}
            </span></td>
            <td style="font-family:var(--fnm);color:var(--ac);font-weight:600">${m.username||m.name.toLowerCase().split(' ')[0]}</td>
            <td style="font-family:var(--fnm)">${m.password||'abohamood@1.'}</td>
          </tr>`).join('')}
        </tbody></table></div>
      </div>
    </div>

    ${buildBackupCard()}

    <div class="card">
      <div class="ct"><span class="ct-t">👥 Member Types & Permissions</span>
        <span style="font-size:10px;color:var(--tx3);font-weight:400">Define employment types and what each can access</span>
      </div>
      <div id="mt-editor">
        ${getMemberTypes().map(t=>`
        <div style="margin-bottom:12px;padding:12px;background:var(--s2);border:1px solid var(--bd);border-radius:10px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
            <span style="width:10px;height:10px;border-radius:50%;background:${t.color};flex-shrink:0"></span>
            <strong style="font-size:13px;flex:1">${t.name}</strong>
            <button onclick="deleteMemberType('${t.id}')" style="background:none;border:none;color:var(--r);cursor:pointer;font-size:12px;font-weight:700">✕ Remove</button>
          </div>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:5px">
            ${Object.entries(t.perms).map(([perm,val])=>`
            <label style="display:flex;align-items:center;gap:5px;font-size:11px;cursor:pointer;padding:4px 6px;background:var(--s);border-radius:6px;border:1px solid var(--bd)">
              <input type="checkbox" ${val?'checked':''} onchange="toggleMTPerm('${t.id}','${perm}',this.checked)" style="accent-color:var(--ac)">
              ${({'allTasks':'All Tasks','allMeetings':'All Meetings','docs':'Documents','archive':'Archive','projects':'Projects','team':'Team','backlog':'Backlog','dashboard':'Dashboard','hrComs':'HR Coms','announcements':'Announcements','todos':'Todos','svcTest':'Service Tests'})[perm]||perm}
            </label>`).join('')}
          </div>
        </div>`).join('')}
      </div>
      <div style="display:flex;gap:8px;margin-top:10px;align-items:center">
        <input id="mt-new-name" placeholder="New type name…" style="flex:1;padding:7px 10px;background:var(--s2);border:1px solid var(--bd);border-radius:7px;color:var(--tx);font-family:var(--fn);font-size:12px;outline:none">
        <input type="color" id="mt-new-color" value="#2563eb" style="width:34px;height:34px;border:1px solid var(--bd);border-radius:7px;cursor:pointer;padding:2px">
        <button class="btn bp bsm" onclick="addMemberType()">+ Add Type</button>
      </div>
    </div>

    <div class="card">
      <div class="ct"><span class="ct-t">📋 Dropdown Lists</span>
        <span style="font-size:10px;color:var(--tx3);font-weight:400">Edit options for all forms</span>
      </div>
      <div id="lists-editor">
        ${listDefs.map(({key,label})=>`
        <div style="margin-bottom:14px;padding-bottom:14px;border-bottom:1px solid var(--bd)">
          <div style="font-size:11px;font-weight:700;color:var(--tx2);margin-bottom:7px">${label}</div>
          <div id="tags-${key}" style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:7px">
            ${(lists[key]||[]).map(v=>`<span style="display:inline-flex;align-items:center;gap:3px;background:var(--al);color:var(--ac);border:1px solid var(--ac)33;font-size:11px;font-weight:600;padding:3px 9px;border-radius:20px">
              ${v}
              <span onclick="removeListItem('${key}','${v.replace(/'/g,"\'")}',this)" style="cursor:pointer;opacity:.6;font-size:10px;margin-left:2px;font-weight:700">✕</span>
            </span>`).join('')}
          </div>
          <div style="display:flex;gap:6px">
            <input id="inp-${key}" placeholder="Add option…" style="flex:1;padding:5px 9px;background:var(--s2);border:1px solid var(--bd2);border-radius:6px;color:var(--tx);font-family:var(--fn);font-size:11px;outline:none"
              onkeydown="if(event.key==='Enter'){addListItem('${key}',this.value);this.value='';}">
            <button class="btn bp bxs" onclick="const inp=document.getElementById('inp-${key}');addListItem('${key}',inp.value);inp.value=''">+</button>
          </div>
        </div>`).join('')}
      </div>
    </div>
  </div>`;
  
  // Check Supabase
  sbQ('team','limit=1').then(r=>{
    const el2=document.getElementById('sb-status-check');
    if(el2)el2.innerHTML=r!==null?'<span style="color:var(--g)">✓ Connected</span>':'<span style="color:var(--r)">✗ Error</span>';
  });
  
  // Store lists reference for add/remove
  window._currentLists=getLists;
  window._saveLists=saveLists;
}

window.addListItem=(key,val)=>{
  if(!val?.trim())return;
  const lists=window._currentLists();
  if(!lists[key])lists[key]=[];
  if(lists[key].includes(val.trim()))return;
  lists[key].push(val.trim());
  window._saveLists(lists);
  // Re-render just the tags
  const wrap=document.getElementById('tags-'+key);
  if(wrap) wrap.innerHTML=lists[key].map(v=>`<span style="display:inline-flex;align-items:center;gap:3px;background:var(--al);color:var(--ac);border:1px solid var(--ac)33;font-size:11px;font-weight:600;padding:3px 9px;border-radius:20px">
    ${v}<span onclick="removeListItem('${key}','${v.replace(/'/g,"\'")}',this)" style="cursor:pointer;opacity:.6;font-size:10px;margin-left:2px;font-weight:700">✕</span>
  </span>`).join('');
};

window.removeListItem=(key,val,el)=>{
  const lists=window._currentLists();
  if(!lists[key])return;
  lists[key]=lists[key].filter(v=>v!==val);
  window._saveLists(lists);
  el.closest('span').remove();
};

window.addMemberType=()=>{
  const name=document.getElementById('mt-new-name')?.value?.trim();
  if(!name){toast('Enter a type name','bad');return;}
  const color=document.getElementById('mt-new-color')?.value||'#64748b';
  const types=getMemberTypes();
  if(types.find(t=>t.name.toLowerCase()===name.toLowerCase())){toast('Type already exists','bad');return;}
  const newType={id:'mt'+Date.now(),name,color,perms:{allTasks:false,allMeetings:false,docs:false,archive:false,projects:false,team:false,backlog:false,dashboard:false,hrComs:false,announcements:false,todos:true}};
  types.push(newType);
  saveMemberTypes(types);
  document.getElementById('mt-new-name').value='';
  nav('settings',document.querySelector('[data-p="settings"]'));
  toast(`Type "${name}" added ✓`,'ok');
};

window.deleteMemberType=(id)=>{
  const types=getMemberTypes();
  const t=types.find(x=>x.id===id);
  if(!t)return;
  if(!confirm(`Remove member type "${t.name}"? Members with this type will lose their permission profile.`))return;
  saveMemberTypes(types.filter(x=>x.id!==id));
  nav('settings',document.querySelector('[data-p="settings"]'));
  toast('Type removed','ok');
};

window.toggleMTPerm=(typeId,perm,val)=>{
  const types=getMemberTypes();
  const t=types.find(x=>x.id===typeId);
  if(!t)return;
  t.perms[perm]=val;
  saveMemberTypes(types);
  toast('Permission updated ✓','ok');
};

// Apply lists to all forms whenever lists change
function applyListsToForms(lists){
  const map={
    'sf-type':lists.serviceTypes,
    'sf-cat':lists.serviceCategories,
    'sf-status':lists.serviceStatuses,
    'mf-dept':lists.memberDepartments,
    'mf-role':lists.memberRoles,
    'pf-status':lists.projectStatuses,
    'pf-field':lists.projectFields,
    'tf-type':lists.taskTypes,
    'tf-priority-val':lists.taskPriorities,
    'mf-type':lists.meetingTypes,
  };
  Object.entries(map).forEach(([id,opts])=>{
    const el=document.getElementById(id);
    if(!el||!opts)return;
    const cur=el.value;
    el.innerHTML=opts.map(o=>`<option value="${o}">${o}</option>`).join('');
    if(opts.includes(cur))el.value=cur;
  });
}

// Call applyListsToForms on login
function loadFormLists(){
  try{
    const l=JSON.parse(localStorage.getItem('vas_dropdown_lists')||'{}');
    if(Object.keys(l).length) applyListsToForms({
      serviceTypes:['Digital','IVR','USSD','SMS'],
      serviceCategories:['Content','Education','Entertainment','Gaming','Books','Other'],
      serviceStatuses:['Live','In Development','Paused','Deprecated'],
      memberDepartments:['Engineering','Design','Content','Management','Marketing','Finance','Other'],
      memberRoles:['CEO','Projects Manager','HR Manager','Super Senior Developer','Senior Developer','Front End Developer','Front End Designer','Sys Admin','Content Manager','Developer'],
      projectStatuses:['Planning','Active','On Hold','Completed','Cancelled'],
      projectFields:['Engineering','Content','Design','Marketing','Operations','Finance','Research','Other'],
      taskTypes:['Feature','Bug Fix','Content','Design','Maintenance','Research','Meeting'],
      taskPriorities:['Critical','High','Medium','Low'],
      meetingTypes:['Internal','External','Client','Operator'],
      ...l
    });
  }catch(e){}
}

window.saveSettings=()=>{
  const name=document.getElementById('set-sysname')?.value?.trim()||'VAS OS';
  localStorage.setItem('vas_sys_name',name);
  ['sys-name-display','sys-name-topbar','login-sys-name'].forEach(id=>{
    const el=document.getElementById(id);if(el)el.textContent=name;
  });
  document.title=name;
  toast('Settings saved ✓','ok');
};

window.saveSheetsCfg=()=>{
  const url=document.getElementById('cfg-sheets-url')?.value.trim();
  const auto=document.getElementById('cfg-sheets-auto')?.checked;
  if(url) localStorage.setItem('vas_sheets_url',url);
  localStorage.setItem('vas_sheets_auto',auto?'1':'0');
  toast('Google Sheets config saved ✓','ok');
};

window.sendToGoogleSheets=async(silent=false)=>{
  const url=localStorage.getItem('vas_sheets_url');
  if(!url){
    if(!silent) toast('Add your Apps Script URL in Settings first','bad');
    return false;
  }
  const payload=buildBackupPayload();
  const statusEl=document.getElementById('sheets-status');
  if(statusEl) statusEl.textContent='Sending…';
  if(!silent) toast('Sending to Google Sheets…','inf',4000);
  try{
    const r=await fetch(url,{
      method:'POST',
      mode:'no-cors', // Google Apps Script doesn't send CORS headers on redirect
      headers:{'Content-Type':'text/plain'}, // no-cors restricts content-type
      body:JSON.stringify(payload)
    });
    // no-cors means we can't read the response, but if it didn't throw it went through
    if(statusEl) statusEl.textContent='✓ Sent at '+new Date().toLocaleTimeString();
    if(!silent) toast('Sent to Google Sheets ✓','ok',5000);
    localStorage.setItem('vas_sheets_last_sent',new Date().toISOString());
    logAction('Sheets Backup','Backup sent to Google Sheets by '+(CU?.name||'auto'),'Info','Backup',Object.values(payload.row_counts).reduce((a,b)=>a+b,0)+' records');
    return true;
  }catch(e){
    if(statusEl) statusEl.textContent='✗ Failed: '+e.message;
    if(!silent) toast('Sheets send failed — check URL','bad');
    return false;
  }
};

window.saveNotifConfig=()=>{
  const cfg={
    email_enabled: document.getElementById('cfg-email-enabled')?.checked||false,
    emailjs_public_key: document.getElementById('cfg-ejs-pub')?.value.trim()||'',
    emailjs_service_id: document.getElementById('cfg-ejs-svc')?.value.trim()||'',
    emailjs_template_id: document.getElementById('cfg-ejs-tpl')?.value.trim()||'',
  };
  localStorage.setItem(NOTIF_CFG_KEY,JSON.stringify(cfg));
  toast('Settings saved ✓','ok');
};

window.testTGDirect=async()=>{
  const chatId=(document.getElementById('cfg-tg-test-id')?.value||'').trim();
  if(!chatId){toast('Enter a Telegram Chat ID first','bad');return;}
  toast('Sending test message…','inf');
  try{
    const sys=SYS();
    const msg=`✅ *${sys}* — Test\n\nHi! This is a test notification from ${sys}.\n\nIf you received this, Telegram notifications are working correctly. 🎉`;
    const res=await fetch(`${TG_API_BASE}/sendMessage`,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({chat_id:chatId, text:msg, parse_mode:'Markdown'})
    });
    const data=await res.json().catch(()=>({}));
    if(data.ok){
      // Also save the chat id to CU.telegram if not set
      if(!CU.telegram){CU.telegram=chatId;const m=DB.team.find(x=>x.id===CU.id);if(m){m.telegram=chatId;await nMemberUpd(m);}}
      toast('✅ Test sent! Check your Telegram','ok',6000);
    } else {
      toast('Send failed — check the bot token and Chat ID: '+(data.description||'unknown error'),'bad',7000);
    }
  } catch(e){
    toast('Error: '+e.message,'bad');
  }
};

window.testNotifConfig=window.testTGDirect;

// ══ BACKUP SYSTEM ══════════════════════════════════════════════════════
const BACKUP_KEY='vas_backups';
const BACKUP_MAX=10;

function getBackups(){try{return JSON.parse(localStorage.getItem(BACKUP_KEY)||'[]');}catch(e){return[];}}

function buildBackupPayload(){
  const payload={
    version:'1.0',
    sys_name:localStorage.getItem('vas_sys_name')||'VAS OS',
    created_at:new Date().toISOString(),
    created_by:CU?.name||'unknown',
    tables:{
      team:DB.team||[], tasks:DB.tasks||[], services:DB.services||[],
      operators:DB.operators||[], companies:DB.companies||[],
      projects:DB.projects||[], backlog:DB.backlog||[],
      docs:DB.docs||[], archive:DB.archive||[],
      meetings:DB.meetings||[], todos:DB.todos||[],
      test_sessions:DB.testSessions||[],
    },
    row_counts:{},
    notif_config:getNotifCfg(),
    dropdown_lists:JSON.parse(localStorage.getItem('vas_dropdown_lists')||'null'),
  };
  Object.keys(payload.tables).forEach(t=>payload.row_counts[t]=(payload.tables[t]||[]).length);
  return payload;
}

window.downloadBackup=()=>{
  showSaving(true);
  const payload=buildBackupPayload();
  const total=Object.values(payload.row_counts).reduce((a,b)=>a+b,0);
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  const sysName=(localStorage.getItem('vas_sys_name')||'VAS_OS').replace(/\s/g,'_');
  a.href=url;a.download=`${sysName}_backup_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);
  showSaving(false);
  saveLocalBackup(payload);
  toast(`Backup downloaded — ${total} records ✓`,'ok',5000);
  logAction('Backup','Full backup downloaded by '+CU?.name,'Info','Backup',`${total} records`);
  nav('settings',document.querySelector('[data-p="settings"]'));
};

function saveLocalBackup(payload){
  const backups=getBackups();
  backups.unshift({id:'bk'+Date.now(),created_at:payload.created_at,created_by:payload.created_by,
    label:new Date(payload.created_at).toLocaleString(),row_counts:payload.row_counts,data:payload});
  if(backups.length>BACKUP_MAX)backups.splice(BACKUP_MAX);
  try{localStorage.setItem(BACKUP_KEY,JSON.stringify(backups));}
  catch(e){backups.splice(BACKUP_MAX-3);try{localStorage.setItem(BACKUP_KEY,JSON.stringify(backups));}catch(e2){}}
}

function autoBackupIfNeeded(){
  const key='vas_last_auto_backup';
  const today=new Date().toISOString().split('T')[0];
  if(localStorage.getItem(key)===today)return;
  setTimeout(()=>{
    if(!DB.tasks?.length)return;
    saveLocalBackup(buildBackupPayload());
    localStorage.setItem(key,today);
    if(localStorage.getItem('vas_sheets_auto')==='1'){
      sendToGoogleSheets(true);
    }
  },5000);
}

window.triggerRestoreFile=()=>{
  const input=document.createElement('input');input.type='file';input.accept='.json';
  input.onchange=async(e)=>{
    const file=e.target.files[0];if(!file)return;
    let payload;try{payload=JSON.parse(await file.text());}catch(err){toast('Invalid backup file','bad');return;}
    if(!payload.tables||!payload.version){toast('Not a valid VAS OS backup','bad');return;}
    previewRestore(payload);
  };
  input.click();
};

window.restoreFromLocal=(id)=>{
  const snap=getBackups().find(b=>b.id===id);
  if(!snap){toast('Snapshot not found','bad');return;}
  previewRestore(snap.data);
};

function previewRestore(payload){
  const counts=Object.entries(payload.row_counts||{}).filter(([,c])=>c>0)
    .map(([t,c])=>`<span style="background:var(--s2);border:1px solid var(--bd);border-radius:5px;padding:2px 7px;font-size:10px;font-weight:600">${t}: ${c}</span>`).join(' ');
  window._restorePayload=payload;
  openSP('Restore Backup','',`
    <div style="background:var(--rb);border:1px solid var(--rbr);border-radius:10px;padding:14px;margin-bottom:14px">
      <div style="font-size:13px;font-weight:800;color:var(--r);margin-bottom:5px">⚠️ This will upsert backup data into Supabase</div>
      <div style="font-size:12px;color:var(--tx2);line-height:1.6">Records from the backup will be added or updated. Existing records not in the backup are untouched.</div>
    </div>
    <div style="background:var(--s2);border:1px solid var(--bd);border-radius:10px;padding:12px;margin-bottom:14px">
      <div style="font-size:12px;font-weight:700;color:var(--tx);margin-bottom:4px">📅 ${new Date(payload.created_at).toLocaleString()}</div>
      <div style="font-size:12px;color:var(--tx3);margin-bottom:8px">Created by: ${payload.created_by} · System: ${payload.sys_name}</div>
      <div style="display:flex;flex-wrap:wrap;gap:4px">${counts}</div>
    </div>
    <div style="display:flex;gap:8px">
      <button class="btn bp" style="flex:1;padding:11px" onclick="confirmRestore(window._restorePayload)">✓ Restore This Backup</button>
      <button class="btn bg2 bsm" onclick="closeSP()">Cancel</button>
    </div>`);
}

window.confirmRestore=async(payload)=>{
  if(!payload){toast('No backup loaded','bad');return;}
  closeSP();toast('Restoring…','inf',8000);showSaving(true);
  let restored=0,errors=0;
  for(const[table,rows]of Object.entries(payload.tables)){
    if(!rows?.length)continue;
    for(const row of rows){
      try{
        const r=await fetch(`${SB_URL}/rest/v1/${table}`,{method:'POST',
          headers:{...SB_HEADERS,'Prefer':'resolution=merge-duplicates,return=minimal'},
          body:JSON.stringify(row)});
        if(r.ok||r.status===409)restored++;else errors++;
      }catch(e){errors++;}
    }
  }
  showSaving(false);
  toast(errors===0?`Restore complete — ${restored} records synced ✓`:`Restored ${restored} — ${errors} errors`,errors===0?'ok':'bad',6000);
  logAction('Restore',`Backup restored by ${CU?.name} — ${restored} records`,'Success','Restore','');
  setTimeout(async()=>{await loadFromNotion();nav(page,document.querySelector('.ni.on'));},1000);
};

window.deleteLocalBackup=(id)=>{
  localStorage.setItem(BACKUP_KEY,JSON.stringify(getBackups().filter(b=>b.id!==id)));
  toast('Snapshot deleted','ok');nav('settings',document.querySelector('[data-p="settings"]'));
};

window.downloadLocalBackup=(id)=>{
  const snap=getBackups().find(b=>b.id===id);
  if(!snap){toast('Snapshot not found','bad');return;}
  const blob=new Blob([JSON.stringify(snap.data,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;a.download=`VAS_OS_snapshot_${snap.created_at.split('T')[0]}.json`;
  document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);
  toast('Snapshot downloaded ✓','ok');
};
