// §21 ── SETTINGS ────────────────────────────────────────────────────────
function rSettings(el){
  if(!canOpenSettings()){
    el.innerHTML=isAdmin()
      ?'<div class="empty"><div class="ei">🔒</div><div class="et">You don\'t have access to Settings</div><div class="es">Ask the account owner to tick Settings for you under Settings → Who Gets What.</div></div>'
      :'<div class="empty"><div class="ei">🔒</div><div class="et">Admin only</div></div>';
    return;
  }
  
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
      taskTypes:['Feature','Bug Fix','Content','Design','Maintenance','Research','Meeting','Testing'],
      taskPriorities:['Critical','High','Medium','Low'],
      meetingTypes:['Internal','External','Client','Operator'],
      companyTypes:['Telecom Operator','Partner','Client','Vendor','Other'],
    };
    try{ return {...def,...JSON.parse(localStorage.getItem(LISTS_KEY)||'{}')}; }
    catch(e){ return def; }
  }
  function saveLists(l){ localStorage.setItem(LISTS_KEY,JSON.stringify(l)); applyListsToForms(l); }
  
  const lists=getLists();
  const sysName=localStorage.getItem('vas_sys_name')||'Digital Plus OS';
  
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
        <div style="font-size:11px;color:var(--tx3);margin-bottom:12px;line-height:1.6">Push is the only active notification channel — no setup required per member.</div>

        <div style="background:var(--s2);border:1px dashed var(--bd);border-radius:8px;padding:10px;margin-bottom:14px;font-size:11px;color:var(--tx3);line-height:1.7">
          ℹ️ Email (EmailJS) and Telegram bot delivery are archived to cut network calls and page weight — the Telegram token was never configured (every send was a wasted, always-failing request) and the EmailJS script was loading on every page load for a path nothing called. The working code is preserved in <code style="background:var(--s);padding:1px 4px;border-radius:3px">js/archived/legacy-notification-channels.js</code> with restore instructions in its header comment.
        </div>

        <div style="font-size:12px;font-weight:800;color:var(--tx2);margin-bottom:8px;display:flex;align-items:center;gap:6px">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          Push Notifications
          <span style="margin-left:auto;background:#e0f2fe;color:#0369a1;font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;border:1px solid #bae6fd">Per-device, no setup for members</span>
        </div>
        <div style="background:var(--s2);border:1px solid var(--bd);border-radius:8px;padding:10px;margin-bottom:12px;font-size:11px;color:var(--tx3);line-height:1.8">
          Native browser/OS notifications — arrive even when Digital Plus OS isn't open. Every member enables it once per device (button below, or the prompt on first login); no chat ID or phone number to collect.
          <div style="margin-top:8px;padding-top:8px;border-top:1px solid var(--bd)">
            ℹ️ One-time setup for <strong style="color:var(--tx)">you as admin</strong>: run <code style="background:var(--s);padding:1px 4px;border-radius:3px">SUPABASE_MIGRATION_push_subscriptions.sql</code> and deploy <code style="background:var(--s);padding:1px 4px;border-radius:3px">supabase/functions/send-push</code> (see that folder's README in the repo). Nothing else to configure per member.
          </div>
        </div>
        <div id="push-status-box" style="margin-bottom:10px">${(typeof pushToggleHTML==='function')?'Loading…':''}</div>
      </div>

      <div class="card">
        <div class="ct"><span class="ct-t">🔐 Team Logins</span></div>
        <div class="tw"><table><thead><tr><th>Name</th><th>Username</th><th></th></tr></thead><tbody>
          ${DB.team.map(m=>`<tr>
            <td><span style="display:flex;align-items:center;gap:6px">
              <span style="width:18px;height:18px;border-radius:50%;background:${m.color};display:inline-flex;align-items:center;justify-content:center;font-size:7px;font-weight:700;color:#fff">${esc(m.av)}</span>
              ${esc(m.name)}
            </span></td>
            <td style="font-family:var(--fnm);color:var(--ac);font-weight:600">${esc(m.username||m.name.toLowerCase().split(' ')[0])}</td>
            <td><button type="button" onclick="openMemberModal('${m.id}')" style="padding:5px 11px;background:var(--s2);border:1px solid var(--bd);border-radius:6px;font-size:11px;font-weight:700;cursor:pointer;color:var(--tx)">Reset Password</button></td>
          </tr>`).join('')}
        </tbody></table></div>
        <div style="font-size:10px;color:var(--tx3);padding:8px 2px 0">Passwords are verified server-side and never shown here — resetting sets a new one.</div>
      </div>
    </div>

    <div class="card" style="margin-bottom:12px">
      <div class="ct"><span class="ct-t">🧪 Test Tools</span><span style="font-size:10px;color:var(--tx3);font-weight:400">Create real test tasks to verify notifications &amp; behavior</span></div>
      <div style="font-size:11px;color:var(--tx3);margin-bottom:14px;line-height:1.6">Creates one real task per selected member — same as creating them one by one from "+ New Task". Each person gets notified (in-app + push/Telegram) and the task behaves completely normally, so you can confirm delivery and behavior across the whole team in one click. Delete them from All Tasks when you're done.</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px">
        ${DB.team.map(m=>`
        <label style="display:flex;align-items:center;gap:6px;padding:5px 10px;background:var(--s2);border:1px solid var(--bd);border-radius:20px;cursor:pointer;font-size:12px;font-weight:600">
          <input type="checkbox" class="test-task-member" value="${m.id}" style="width:14px;height:14px;cursor:pointer;accent-color:var(--ac)">
          <span style="width:16px;height:16px;border-radius:50%;background:${m.color};display:inline-flex;align-items:center;justify-content:center;font-size:6.5px;font-weight:700;color:#fff;flex-shrink:0">${esc(m.av)}</span>
          ${esc(m.name)}
        </label>`).join('')}
      </div>
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
        <button type="button" class="btn bg2 bxs" onclick="document.querySelectorAll('.test-task-member').forEach(c=>c.checked=true)">Select All</button>
        <button type="button" class="btn bg2 bxs" onclick="document.querySelectorAll('.test-task-member').forEach(c=>c.checked=false)">Select None</button>
        <input type="date" id="test-task-due" value="${new Date(Date.now()+86400000).toISOString().slice(0,10)}" style="padding:6px 10px;background:var(--s2);border:1px solid var(--bd);border-radius:7px;color:var(--tx);font-size:12px">
        <button class="btn bp bsm" onclick="createTestTasksForMembers()">🧪 Create Test Task for Selected</button>
      </div>
    </div>

    ${buildBackupCard()}

    <div class="card" style="margin-bottom:12px">
      <div class="ct"><span class="ct-t">⏰ Automatic Task Reminders</span><span style="font-size:10px;color:var(--tx3);font-weight:400">Periodic nudges about new/overdue/due-soon tasks</span></div>
      <div style="font-size:11px;color:var(--tx3);margin-bottom:14px;line-height:1.6">When enabled, everyone with "Automatic Task Reminders" checked on their profile (Team → Edit Member) gets a periodic check-in about tasks they haven't opened, tasks that are overdue, and tasks due soon — as an in-app notification and a push to their phone/computer.${AUTO_REM_CFG?.server_side?' <b style="color:var(--g)">Runs on the server, so it works even when the app is closed.</b>':''}</div>
      ${AUTO_REM_CFG?.server_side?'':`<div style="font-size:11px;line-height:1.6;margin-bottom:12px;padding:8px 10px;border-radius:7px;background:var(--ab,rgba(217,119,6,.12));border:1px solid var(--abr,rgba(217,119,6,.4));color:var(--tx2)">⚠️ Server-side reminders are not set up yet, so reminders only go out while a person has the app open in a browser tab. To make them work with the app closed, run <code style="background:var(--s);padding:1px 4px;border-radius:3px">SUPABASE_MIGRATION_server_auto_reminders.sql</code> once in the Supabase SQL Editor, then reload.</div>`}
      <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;font-weight:700">
          <input type="checkbox" id="autorem-enabled" ${AUTO_REM_CFG?.enabled?'checked':''} style="width:16px;height:16px;cursor:pointer;accent-color:var(--ac)">
          Enable system-wide
        </label>
        <div style="display:flex;align-items:center;gap:8px">
          <label style="font-size:11px;font-weight:700;color:var(--tx3)">Check every</label>
          <select id="autorem-interval" style="padding:6px 10px;background:var(--s2);border:1px solid var(--bd);border-radius:7px;color:var(--tx);font-size:12px">
            ${[1,2,4,6,8,12,24].map(h=>`<option value="${h}" ${Number(AUTO_REM_CFG?.interval_hours)===h?'selected':''}>${h} hour${h>1?'s':''}</option>`).join('')}
          </select>
        </div>
        ${AUTO_REM_CFG?.server_side?`<div style="display:flex;align-items:center;gap:8px">
          <label style="font-size:11px;font-weight:700;color:var(--tx3)">Only between</label>
          <select id="autorem-start" style="padding:6px 10px;background:var(--s2);border:1px solid var(--bd);border-radius:7px;color:var(--tx);font-size:12px">
            ${Array.from({length:24},(_,h)=>h).map(h=>`<option value="${h}" ${Number(AUTO_REM_CFG.start_hour)===h?'selected':''}>${String(h).padStart(2,'0')}:00</option>`).join('')}
          </select>
          <span style="font-size:11px;color:var(--tx3)">and</span>
          <select id="autorem-end" style="padding:6px 10px;background:var(--s2);border:1px solid var(--bd);border-radius:7px;color:var(--tx);font-size:12px">
            ${Array.from({length:24},(_,h)=>h+1).map(h=>`<option value="${h}" ${Number(AUTO_REM_CFG.end_hour)===h?'selected':''}>${String(h).padStart(2,'0')}:00</option>`).join('')}
          </select>
        </div>`:''}
        <button class="btn bp bsm" onclick="saveAutoRemSettings()">💾 Save</button>
      </div>
      <div id="autorem-weekly-table" style="margin-top:16px;padding-top:14px;border-top:1px solid var(--bd)">
        <div style="font-size:11px;color:var(--tx3)">Loading this week's reminder activity…</div>
      </div>
    </div>

    <div class="card" style="margin-bottom:12px">
      <div class="ct"><span class="ct-t">🧪 Service Test Areas</span><span style="font-size:10px;color:var(--tx3);font-weight:400">What every scheduled Service Test task asks the tester to cover</span></div>
      <div style="font-size:11px;color:var(--tx3);margin-bottom:12px;line-height:1.6">These are listed, in this order, in every automatically created Service Test task. Write the area name, plus (optionally) what you want checked. Use <b>{operator}</b> in a description to insert the operator's name. Changes apply to tasks created from now on.</div>
      <div id="sta-list" style="display:flex;flex-direction:column;gap:8px;margin-bottom:12px">${staRowsHTML(getServiceTestAreas())}</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button type="button" class="btn bg2 bsm" onclick="staAdd()">＋ Add area</button>
        <button type="button" class="btn bg2 bsm" onclick="staReset()">↩ Reset to defaults</button>
        <button type="button" class="btn bp bsm" onclick="saveTestAreas()">💾 Save</button>
      </div>
    </div>

    <div class="card" style="margin-bottom:12px">
      <div class="ct"><span class="ct-t">👋 Login Reminders</span><span style="font-size:10px;color:var(--tx3);font-weight:400">Nudge members who haven't logged in</span></div>
      <div style="font-size:11px;color:var(--tx3);margin-bottom:12px;line-height:1.6">Members you have switched ON (Team → member details → Login reminders) get a notification once they have gone this many days without logging in, then again every same number of days until they log in.</div>
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
        <label style="font-size:11px;font-weight:700;color:var(--tx3)">Remind after</label>
        <input type="number" id="lrd-days" min="1" max="60" step="1" value="${getLoginReminderDays()}" style="width:80px;padding:6px 10px;background:var(--s2);border:1px solid var(--bd);border-radius:7px;color:var(--tx);font-size:13px;font-weight:700">
        <span style="font-size:12px;color:var(--tx2)">days without login</span>
        <button type="button" class="btn bp bsm" onclick="saveLoginReminderDays()">💾 Save</button>
      </div>
    </div>

    <div class="card" style="margin-bottom:12px">
      <div class="ct"><span class="ct-t">👥 Who Gets What</span><span style="font-size:10px;color:var(--tx3);font-weight:400">Choose exactly which people receive or see each thing</span></div>
      ${APP_CFG.recipientAccess
        ?'<div style="font-size:11px;line-height:1.6;margin-bottom:10px;color:var(--tx2)"><b style="color:var(--g)">Customised.</b> Only the people ticked get or see each item. Anyone added to the team later starts with nothing ticked.</div>'
        :'<div style="font-size:11px;line-height:1.6;margin-bottom:10px;padding:8px 10px;border-radius:7px;background:var(--ab,rgba(217,119,6,.12));border:1px solid var(--abr,rgba(217,119,6,.4));color:var(--tx2)"><b>Not customised yet.</b> Right now these go to / are shown to all admins, as before. The ticks below show who that is. Change them and click <b>Save</b> to take control: after that, <b>only the people ticked</b> get or see each item.</div>'}
      <div style="overflow-x:auto"><table style="border-collapse:collapse;width:100%;min-width:640px;font-size:11px">
        <thead><tr>
          <th style="text-align:left;padding:6px 8px;color:var(--tx3);font-weight:700">Person</th>
          ${RA_COLS.map(c=>`<th style="padding:6px 4px;text-align:center;color:var(--tx3);font-weight:700;vertical-align:bottom;border-left:${c.k==='loginlog'?'2px solid var(--bd)':'0'}" title="${escapeHtml(c.title)}">
            <div style="white-space:nowrap">${c.label}</div>
            <div style="font-weight:400;font-size:10px"><a href="#" onclick="raColumn('${c.k}',true);return false" style="color:var(--ac)">all</a> · <a href="#" onclick="raColumn('${c.k}',false);return false" style="color:var(--ac)">none</a></div>
          </th>`).join('')}
        </tr></thead>
        <tbody>${raRowsHTML()}</tbody>
      </table></div>
      <div style="font-size:10px;color:var(--tx3);margin:8px 0 10px;line-height:1.6">Receive: Morning brief, Escalations and Weekly report come from the server (even when the app is closed); Admin alerts are the notifications/pushes sent to admins (for example a deleted task or a rescheduled meeting); Access requests are things waiting for approval (for example Library access). See: <b>Login history</b> is the login-reminder history in member details; <b>Settings</b> is this page. Only admins can be given the See items. You always keep your own Settings access.</div>
      <button type="button" class="btn bp bsm" onclick="saveRecipientAccess()">💾 Save</button>
    </div>

    <div class="card" style="margin-bottom:12px">
      <div class="ct"><span class="ct-t">📬 Automatic Digests</span><span style="font-size:10px;color:var(--tx3);font-weight:400">Sent by the server, even when the app is closed, to the people you tick in Who Gets What</span></div>
      <div style="font-size:11px;color:var(--tx3);margin-bottom:12px;line-height:1.6">Each one is OFF until you switch it on. They only send inside the "Only between" hours of Automatic Task Reminders above. Needs <code style="background:var(--s);padding:1px 4px;border-radius:3px">SUPABASE_MIGRATION_server_digests.sql</code> to have been run once. <b>Preview</b> shows what would be sent now, using the saved settings (click Save first).</div>
      ${(()=>{
        const mb=APP_CFG.morningBrief, es=APP_CFG.escalation, wr=APP_CFG.weeklyReport, wl=APP_CFG.workload;
        const hrs=(sel)=>Array.from({length:24},(_,h)=>`<option value="${h}" ${Number(sel)===h?'selected':''}>${String(h).padStart(2,'0')}:00</option>`).join('');
        const days=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map((d,i)=>`<option value="${i+1}" ${Number(wr.day)===i+1?'selected':''}>${d}</option>`).join('');
        const inp='padding:5px 8px;background:var(--s2);border:1px solid var(--bd);border-radius:6px;color:var(--tx);font-size:12px';
        const lbl='font-size:11px;color:var(--tx2)';
        const row='display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:10px 0;border-top:1px solid var(--bd)';
        return `
        <div style="${row};border-top:none">
          <label style="display:flex;align-items:center;gap:6px;min-width:170px;font-size:12px;font-weight:700;color:var(--tx)"><input type="checkbox" id="dg-mb-on" ${mb.enabled?'checked':''}> ☀️ Morning brief</label>
          <span style="${lbl}">every day at</span><select id="dg-mb-hour" style="${inp}">${hrs(mb.hour)}</select>
          <span style="${lbl}">— overdue, due today, waiting review, needs help, members not logging in</span>
          <button type="button" class="btn bg2 bxs" onclick="previewDigest('morning_brief')">👁 Preview</button>
        </div>
        <div style="${row}">
          <label style="display:flex;align-items:center;gap:6px;min-width:170px;font-size:12px;font-weight:700;color:var(--tx)"><input type="checkbox" id="dg-es-on" ${es.enabled?'checked':''}> 🚨 Escalation</label>
          <span style="${lbl}">overdue</span><input type="number" id="dg-es-od" min="1" max="60" value="${Number(es.overdue_days)||2}" style="${inp};width:58px">
          <span style="${lbl}">+ days → Escalations recipients · review waiting</span><input type="number" id="dg-es-rh" min="1" max="720" value="${Number(es.review_hours)||24}" style="${inp};width:64px">
          <span style="${lbl}">+ hours → the task\'s reviewer · repeat every</span><input type="number" id="dg-es-rep" min="1" max="60" value="${Number(es.repeat_days)||3}" style="${inp};width:58px"><span style="${lbl}">days</span>
          <label style="display:flex;align-items:center;gap:5px;font-size:11px;color:var(--tx2)"><input type="checkbox" id="dg-es-rev" ${es.notify_reviewers!==false?'checked':''}> nudge the task\'s reviewer (untick to send those to the Escalations recipients instead)</label>
          <button type="button" class="btn bg2 bxs" onclick="previewDigest('escalation')">👁 Preview</button>
        </div>
        <div style="${row}">
          <label style="display:flex;align-items:center;gap:6px;min-width:170px;font-size:12px;font-weight:700;color:var(--tx)"><input type="checkbox" id="dg-wr-on" ${wr.enabled?'checked':''}> 📊 Weekly report</label>
          <span style="${lbl}">every</span><select id="dg-wr-day" style="${inp}">${days}</select>
          <span style="${lbl}">at</span><select id="dg-wr-hour" style="${inp}">${hrs(wr.hour)}</select>
          <span style="${lbl}">— done, created, open, overdue, top performers</span>
          <button type="button" class="btn bg2 bxs" onclick="previewDigest('weekly_report')">👁 Preview</button>
        </div>
        <div style="${row}">
          <div style="min-width:170px;font-size:12px;font-weight:700;color:var(--tx)">⚖️ Workload warning</div>
          <span style="${lbl}">when assigning, warn if the person already has</span><input type="number" id="dg-wl-open" min="1" max="200" value="${Number(wl.open)||8}" style="${inp};width:64px">
          <span style="${lbl}">open tasks or</span><input type="number" id="dg-wl-over" min="1" max="100" value="${Number(wl.overdue)||3}" style="${inp};width:58px"><span style="${lbl}">overdue</span>
        </div>`;
      })()}
      <div style="margin-top:6px"><button type="button" class="btn bp bsm" onclick="saveDigestSettings()">💾 Save</button></div>
      <div id="dig-preview" style="margin-top:12px"></div>
      <div style="margin-top:14px;padding-top:12px;border-top:1px solid var(--bd)">
        <div style="font-size:10px;font-weight:700;letter-spacing:.05em;color:var(--tx3);text-transform:uppercase;margin-bottom:6px">Recently sent</div>
        <div id="dig-log" style="font-size:11px;color:var(--tx3)">Loading…</div>
      </div>
    </div>

    <div class="card">
      <div class="ct"><span class="ct-t">👥 Member Types & Permissions</span>
        <span style="font-size:10px;color:var(--tx3);font-weight:400">Define employment types and what each can access</span>
      </div>
      <div id="mt-editor">
        ${getMemberTypes().map(t=>`
        <div style="margin-bottom:12px;padding:12px;background:var(--s2);border:1px solid var(--bd);border-radius:10px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
            <span style="width:10px;height:10px;border-radius:50%;background:${t.color};flex-shrink:0"></span>
            <strong style="font-size:13px;flex:1">${esc(t.name)}</strong>
            <button onclick="deleteMemberType('${t.id}')" style="background:none;border:none;color:var(--r);cursor:pointer;font-size:12px;font-weight:700">✕ Remove</button>
          </div>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:5px">
            ${Object.entries(t.perms).map(([perm,val])=>`
            <label style="display:flex;align-items:center;gap:5px;font-size:11px;cursor:pointer;padding:4px 6px;background:var(--s);border-radius:6px;border:1px solid var(--bd)">
              <input type="checkbox" ${val?'checked':''} onchange="toggleMTPerm('${t.id}','${perm}',this.checked)" style="accent-color:var(--ac)">
              ${({'allTasks':'All Tasks','allMeetings':'All Meetings','docs':'Documents','archive':'Archive','projects':'Projects','services':'Services','library':'Library','comments':'Comments','reminders':'Reminders','team':'Team','backlog':'Backlog','dashboard':'Dashboard','hrComs':'HR Coms','announcements':'Announcements','todos':'Todos','svcTest':'Service Tests'})[perm]||perm}
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

  loadWeeklyReminderTable();
  loadDigestLog();

  // Push notification toggle box — reflects this device's actual subscription state
  if(typeof updatePushToggleUI==='function') updatePushToggleUI();

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
  const newType={id:'mt'+Date.now(),name,color,perms:{allTasks:false,allMeetings:false,docs:false,archive:false,projects:false,services:false,library:false,comments:false,reminders:false,team:false,backlog:false,dashboard:false,hrComs:false,announcements:false,todos:true}};
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
      taskTypes:['Feature','Bug Fix','Content','Design','Maintenance','Research','Meeting','Testing'],
      taskPriorities:['Critical','High','Medium','Low'],
      meetingTypes:['Internal','External','Client','Operator'],
      ...l
    });
  }catch(e){}
}

window.saveSettings=()=>{
  const name=document.getElementById('set-sysname')?.value?.trim()||'Digital Plus OS';
  localStorage.setItem('vas_sys_name',name);
  ['sys-name-display','sys-name-topbar','login-sys-name'].forEach(id=>{
    const el=document.getElementById(id);if(el)el.textContent=name;
  });
  document.title=name;
  toast('Settings saved ✓','ok');
};

// ── Who Gets What ─────────────────────────────────────────────────────────
const RA_COLS=[
  {k:'brief',     label:'☀️ Morning brief',  title:'Daily summary of what needs attention'},
  {k:'escalation',label:'🚨 Escalations',     title:'Tasks overdue for days, and reviews nobody has picked up'},
  {k:'weekly',    label:'📊 Weekly report',   title:'Weekly team numbers'},
  {k:'alerts',    label:'🔔 Admin alerts',    title:'Notifications and pushes sent to admins, e.g. a task was deleted or a meeting rescheduled'},
  {k:'requests',  label:'📚 Access requests', title:'Requests waiting for approval, e.g. Library access'},
  {k:'loginlog',  label:'📨 Login history',   title:'See the login-reminder history and switch in member details', adminOnly:true},
  {k:'settings',  label:'⚙️ Settings',        title:'Open this Settings page', adminOnly:true}
];
// What each item does today if nobody has customised yet (mirrors the built-in rules)
function raDefault(m,k){
  if(k==='brief'||k==='escalation'||k==='weekly') return m.access==='Admin';   // the server digests: active Admins
  if(k==='requests') return isAdminMember(m);
  return isLegacyAdminMember(m);
}
function raChecked(m,k){ return APP_CFG.recipientAccess?recipientFlagFor(m,k):raDefault(m,k); }
function raRowsHTML(){
  const active=DB.team.filter(m=>(m.status||'Active')==='Active')
    .sort((a,b)=>(isLegacyAdminMember(b)-isLegacyAdminMember(a))||String(a.name).localeCompare(String(b.name)));
  return active.map(m=>{
    const adm=isLegacyAdminMember(m);
    return `<tr style="border-top:1px solid var(--bd)">
      <td style="padding:6px 8px"><div style="display:flex;align-items:center;gap:7px">
        <span style="width:22px;height:22px;border-radius:50%;background:${m.color};display:inline-flex;align-items:center;justify-content:center;font-size:8px;font-weight:700;color:#fff;flex-shrink:0">${escapeHtml(m.av||'')}</span>
        <div><div style="font-weight:600;color:var(--tx)">${escapeHtml(m.name)}${m.id===CU?.id?' <span style="font-weight:400;color:var(--tx3)">(you)</span>':''}</div>
        <div style="font-size:10px;color:var(--tx3)">${escapeHtml(m.role||'')}${adm?' · Admin':''}</div></div></div></td>
      ${RA_COLS.map(c=>{
        const locked=c.adminOnly&&!adm;
        const forced=c.k==='settings'&&(m.id===CU?.id||FULL.includes(m.name));
        const on=forced||(!locked&&raChecked(m,c.k));
        return `<td style="padding:6px 4px;text-align:center;border-left:${c.k==='loginlog'?'2px solid var(--bd)':'0'}"><input type="checkbox" id="ra-${m.id}-${c.k}" ${on?'checked':''} ${locked||forced?'disabled':''} title="${locked?'Only admins can be given this':forced?'You always keep your own Settings access':''}"></td>`;
      }).join('')}
    </tr>`;
  }).join('')||'<tr><td colspan="8" style="padding:10px;color:var(--tx3)">No active members</td></tr>';
}
window.raColumn=(k,on)=>{
  DB.team.forEach(m=>{ const el=document.getElementById(`ra-${m.id}-${k}`); if(el&&!el.disabled) el.checked=!!on; });
};
window.saveRecipientAccess=async()=>{
  if(!canOpenSettings()) return;
  const people={};
  DB.team.filter(m=>(m.status||'Active')==='Active').forEach(m=>{
    const f={};
    RA_COLS.forEach(c=>{ const el=document.getElementById(`ra-${m.id}-${c.k}`); if(el&&el.checked) f[c.k]=true; });
    if(m.id===CU.id||FULL.includes(m.name)) f.settings=true;   // never lock out yourself / the founders
    if(Object.keys(f).length) people[m.id]=f;
  });
  const empty=RA_COLS.filter(c=>c.k!=='loginlog'&&c.k!=='settings'&&!Object.values(people).some(f=>f[c.k])).map(c=>c.label);
  if(empty.length&&!confirm('Nobody is ticked for:\n'+empty.join('\n')+'\n\nNothing will be sent for those. Save anyway?')) return;
  const value={people,saved_by:CU.name,saved_at:new Date().toISOString()};
  showSaving(true);
  const r=await saveAppSetting('recipient_access',value);
  showSaving(false);
  if(!r){ toast('Could not save — run SUPABASE_MIGRATION_app_settings.sql in Supabase first','bad',7000); return; }
  APP_CFG.recipientAccess=value;
  applySettingsNavAccess();
  logAction('Settings Updated',`${esc(CU.name)} changed who gets/sees digests, alerts, requests and Settings (${Object.keys(people).length} people ticked)`,'Info','Who Gets What','');
  toast('Saved — only the people ticked will now get or see these ✓','ok',4500);
  nav('settings',document.getElementById('nav-st'));
};

// ── Service Test Areas editor + Login Reminder days (shared app_settings) ──
function staRowsHTML(list){
  return list.map((a,i)=>`<div class="sta-row" style="display:flex;gap:8px;align-items:flex-start;background:var(--s2);border:1px solid var(--bd);border-radius:8px;padding:8px">
    <div style="font-size:12px;font-weight:800;color:var(--tx3);padding-top:8px;min-width:18px">${i+1}.</div>
    <div style="flex:1;display:flex;flex-direction:column;gap:6px;min-width:0">
      <input class="sta-name" value="${escapeHtml(a.name||'')}" placeholder="Area name, e.g. Speed test" style="padding:6px 9px;background:var(--s);border:1px solid var(--bd);border-radius:6px;color:var(--tx);font-size:13px;font-weight:700;width:100%;box-sizing:border-box">
      <textarea class="sta-desc" rows="2" placeholder="What to check (optional)" style="padding:6px 9px;background:var(--s);border:1px solid var(--bd);border-radius:6px;color:var(--tx);font-size:12px;width:100%;box-sizing:border-box;resize:vertical;font-family:inherit">${escapeHtml(a.desc||'')}</textarea>
    </div>
    <button type="button" class="btn bg2 bxs" title="Remove" onclick="staRemove(${i})" style="flex-shrink:0">✕</button>
  </div>`).join('');
}
function staReadDOM(){
  return [...document.querySelectorAll('#sta-list .sta-row')].map(r=>({
    name:r.querySelector('.sta-name').value.trim(),
    desc:r.querySelector('.sta-desc').value.trim()
  }));
}
function staRender(list){ const el=document.getElementById('sta-list'); if(el) el.innerHTML=staRowsHTML(list); }
window.staAdd=()=>{
  const l=staReadDOM(); l.push({name:'',desc:''}); staRender(l);
  const names=document.querySelectorAll('#sta-list .sta-name'); names[names.length-1]?.focus();
};
window.staRemove=(i)=>{ const l=staReadDOM(); l.splice(i,1); staRender(l); };
window.staReset=()=>{
  if(!confirm('Replace the list with the built-in default areas? (Click Save afterwards to keep them.)')) return;
  staRender(DEFAULT_TEST_AREAS.map(a=>({...a})));
};
window.saveTestAreas=async()=>{
  if(!isAdmin()) return;
  const list=staReadDOM().filter(a=>a.name);
  if(!list.length){ toast('Keep at least one test area','bad'); return; }
  showSaving(true);
  const r=await saveAppSetting('service_test_areas',list);
  showSaving(false);
  if(!r){ toast('Could not save — run SUPABASE_MIGRATION_app_settings.sql in Supabase first','bad',7000); return; }
  APP_CFG.serviceTestAreas=list;
  staRender(list);
  logAction('Settings Updated',`${esc(CU.name)} updated the Service Test areas (${list.length})`,'Info','Service Tests','');
  toast('Service test areas saved ✓','ok');
};
window.saveLoginReminderDays=async()=>{
  if(!isAdmin()) return;
  const n=parseInt(document.getElementById('lrd-days')?.value,10);
  if(!(n>=1&&n<=60)){ toast('Enter a number of days between 1 and 60','bad'); return; }
  showSaving(true);
  const r=await saveAppSetting('login_reminder_days',n);
  showSaving(false);
  if(!r){ toast('Could not save — run SUPABASE_MIGRATION_app_settings.sql in Supabase first','bad',7000); return; }
  APP_CFG.loginReminderDays=n;
  logAction('Settings Updated',`${esc(CU.name)} set login reminders to ${n} day${n===1?'':'s'} without login`,'Info','Login Reminders','');
  toast(`Login reminders will go out after ${n} day${n===1?'':'s'} ✓`,'ok');
};

// ── Automatic Digests (morning brief / escalation / weekly report) + workload warning ──
window.saveDigestSettings=async()=>{
  if(!isAdmin()) return;
  const num=(id)=>parseInt(document.getElementById(id)?.value,10);
  const inR=(v,a,b)=>Number.isInteger(v)&&v>=a&&v<=b;
  const mb={enabled:!!document.getElementById('dg-mb-on')?.checked,hour:num('dg-mb-hour')};
  const es={enabled:!!document.getElementById('dg-es-on')?.checked,overdue_days:num('dg-es-od'),review_hours:num('dg-es-rh'),repeat_days:num('dg-es-rep'),notify_reviewers:!!document.getElementById('dg-es-rev')?.checked};
  const wr={enabled:!!document.getElementById('dg-wr-on')?.checked,day:num('dg-wr-day'),hour:num('dg-wr-hour')};
  const wl={open:num('dg-wl-open'),overdue:num('dg-wl-over')};
  if(!inR(mb.hour,0,23)||!inR(wr.hour,0,23)||!inR(wr.day,1,7)){ toast('Check the hours and weekday','bad'); return; }
  if(!inR(es.overdue_days,1,60)||!inR(es.review_hours,1,720)||!inR(es.repeat_days,1,60)){ toast('Escalation: days must be 1-60 and review hours 1-720','bad'); return; }
  if(!inR(wl.open,1,200)||!inR(wl.overdue,1,100)){ toast('Workload warning: enter whole numbers','bad'); return; }
  showSaving(true);
  const results=await Promise.all([
    saveAppSetting('morning_brief',mb),saveAppSetting('escalation',es),
    saveAppSetting('weekly_report',wr),saveAppSetting('workload_warning',wl)
  ]);
  showSaving(false);
  if(results.some(r=>!r)){ toast('Could not save — run SUPABASE_MIGRATION_app_settings.sql in Supabase first','bad',7000); return; }
  APP_CFG.morningBrief=mb; APP_CFG.escalation=es; APP_CFG.weeklyReport=wr; APP_CFG.workload=wl;
  const on=[mb.enabled&&'morning brief',es.enabled&&'escalation',wr.enabled&&'weekly report'].filter(Boolean);
  logAction('Settings Updated',`${esc(CU.name)} updated automatic digests (on: ${on.join(', ')||'none'})`,'Info','Automatic Digests','');
  toast('Digest settings saved ✓','ok');
};
window.previewDigest=async(kind)=>{
  const host=document.getElementById('dig-preview'); if(!host) return;
  host.innerHTML='<div style="font-size:11px;color:var(--tx3)">Loading preview…</div>';
  const res=await sbRpc('digest_preview',{p_kind:kind});
  if(!Array.isArray(res)){
    host.innerHTML='<div style="font-size:11px;color:var(--r,#dc2626)">Could not preview. Run <code>SUPABASE_MIGRATION_server_digests.sql</code> once in the Supabase SQL Editor, then try again.</div>';
    return;
  }
  host.innerHTML=res.length
    ?`<div style="font-size:10px;font-weight:700;letter-spacing:.05em;color:var(--tx3);text-transform:uppercase;margin-bottom:6px">Preview — what would be sent now (nothing was sent)</div>`+
      res.map(r=>`<div style="padding:8px 10px;background:var(--s2);border:1px solid var(--bd);border-radius:7px;margin-bottom:5px"><div style="font-size:10px;color:var(--tx3);margin-bottom:2px">To ${escapeHtml(r.recipient||'')}</div><div style="font-size:12px;color:var(--tx);line-height:1.5">${escapeHtml(r.message||'')}</div></div>`).join('')
    :'<div style="font-size:11px;color:var(--tx3)">Nothing to send right now — no task matches these rules (or no active Admin exists).</div>';
};
async function loadDigestLog(){
  const host=document.getElementById('dig-log'); if(!host) return;
  const rows=await sbQ('digest_log','order=sent_at.desc&limit=40');
  if(!Array.isArray(rows)){ host.textContent='Not available yet — run SUPABASE_MIGRATION_server_digests.sql.'; return; }
  const label={morning_brief:'☀️ Brief',weekly_report:'📊 Weekly',escalation_overdue:'🚨 Overdue',escalation_review:'🔍 Review'};
  const seen=new Set(), out=[];
  for(const r of rows){            // escalation logs one row per task: show each batch once
    const k=r.kind+'|'+(r.recipient_name||'')+'|'+(r.message||'')+'|'+String(r.sent_at||'').slice(0,16);
    if(seen.has(k)) continue; seen.add(k); out.push(r);
    if(out.length>=10) break;
  }
  host.innerHTML=out.length?out.map(r=>`<div style="padding:5px 0;border-bottom:1px solid var(--bd)"><span style="color:var(--tx2);font-weight:600">${label[r.kind]||escapeHtml(r.kind)}</span> <span>${fdt(r.sent_at)}</span>${r.recipient_name?` · to ${escapeHtml(r.recipient_name)}`:''}<div style="color:var(--tx3);margin-top:1px">${escapeHtml(String(r.message||'').slice(0,170))}</div></div>`).join(''):'Nothing sent yet.';
}

window.saveAutoRemSettings=async()=>{
  const enabled=document.getElementById('autorem-enabled')?.checked||false;
  const interval_hours=parseInt(document.getElementById('autorem-interval')?.value||'4');
  const patch={enabled,interval_hours,updated_at:new Date().toISOString()};
  // The sending-hours window only exists once the server-side migration has been run
  if(AUTO_REM_CFG?.server_side){
    const start_hour=parseInt(document.getElementById('autorem-start')?.value||'8');
    const end_hour=parseInt(document.getElementById('autorem-end')?.value||'20');
    if(!(end_hour>start_hour)){ toast('"Only between" must end after it starts (e.g. 08:00 to 20:00)','bad'); return; }
    patch.start_hour=start_hour; patch.end_hour=end_hour;
  }
  showSaving(true);
  const r=await sbUpdate('auto_reminder_settings',1,patch);
  showSaving(false);
  if(r!==null){
    AUTO_REM_CFG={...AUTO_REM_CFG,enabled,interval_hours,...(patch.start_hour!==undefined?{start_hour:patch.start_hour,end_hour:patch.end_hour}:{})};
    logAction('Settings Updated',`${esc(CU.name)} ${enabled?'enabled':'disabled'} automatic task reminders (every ${interval_hours}h${patch.start_hour!==undefined?', '+String(patch.start_hour).padStart(2,'0')+':00–'+String(patch.end_hour).padStart(2,'0')+':00':''})`,'Info','Automatic Reminders','');
    toast('Reminder settings saved ✓','ok');
  } else {
    toast('Failed to save — check connection','bad');
  }
};

// One query for every Reminder-type notification sent this week, grouped
// per member — cheaper than querying per-member individually, and gives
// admins a single at-a-glance view of who's getting reminded (and how
// often) across the whole team. "This week" resets naturally every
// Monday since it's a live date filter, not a stored counter.
async function loadWeeklyReminderTable(){
  const host=document.getElementById('autorem-weekly-table');
  if(!host)return;
  try{
    const monday=getWeekStartISO();
    const rows=await sbQ('notifications',`type=eq.Reminder&created_at=gte.${monday}&order=created_at.desc&limit=500`);
    const list=Array.isArray(rows)?rows:[];
    const byMember={};
    list.forEach(r=>{
      const name=r.to_name||'—';
      if(!byMember[name])byMember[name]=[];
      byMember[name].push(r);
    });
    const rowsSorted=Object.entries(byMember).sort((a,b)=>b[1].length-a[1].length);
    if(!rowsSorted.length){
      host.innerHTML=`<div style="font-size:11px;color:var(--tx3)">No reminders sent to anyone yet this week.</div>`;
      return;
    }
    host.innerHTML=`<div style="font-size:11px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">This Week, By Member (${list.length} total)</div>
    <div style="display:flex;flex-direction:column;gap:5px">
      ${rowsSorted.map(([name,items])=>{
        const mObj=DB.team.find(m=>m.name===name);
        return `<div onclick="${mObj?`openMemberDetail('${mObj.id}')`:''}" style="display:flex;align-items:center;gap:8px;padding:7px 10px;background:var(--s2);border-radius:8px;${mObj?'cursor:pointer':''}">
          ${mObj?`<span style="width:20px;height:20px;border-radius:50%;background:${mObj.color};display:inline-flex;align-items:center;justify-content:center;font-size:8px;color:#fff;font-weight:800;flex-shrink:0">${mObj.av}</span>`:''}
          <span style="flex:1;font-size:12px;font-weight:600;color:var(--tx)">${name}</span>
          <span style="font-size:12px;font-weight:800;color:var(--ac)">${items.length}</span>
        </div>`;
      }).join('')}
    </div>`;
  }catch(e){
    host.innerHTML=`<div style="font-size:11px;color:var(--tx3)">Couldn't load reminder activity.</div>`;
    console.warn('loadWeeklyReminderTable failed',e);
  }
}

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

// (Email/Telegram save+test handlers archived — see
// js/archived/legacy-notification-channels.js)

// ══ BACKUP SYSTEM ══════════════════════════════════════════════════════
const BACKUP_KEY='vas_backups';
const BACKUP_MAX=10;

function getBackups(){try{return JSON.parse(localStorage.getItem(BACKUP_KEY)||'[]');}catch(e){return[];}}

function buildBackupPayload(){
  const payload={
    version:'1.0',
    sys_name:localStorage.getItem('vas_sys_name')||'Digital Plus OS',
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
  const sysName=(localStorage.getItem('vas_sys_name')||'Digital_Plus_OS').replace(/\s/g,'_');
  a.href=url;a.download=`${sysName}_backup_${localDateStr()}.json`;
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
  const today=localDateStr();
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
    if(!payload.tables||!payload.version){toast('Not a valid Digital Plus OS backup','bad');return;}
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
  logAction('Restore',`Backup restored by ${esc(CU?.name)} — ${restored} records`,'Success','Restore','');
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
