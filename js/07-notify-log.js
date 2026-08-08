// §07 ── NOTIFICATIONS & LOGGING ────────────────────────────────────────
async function loadNotifs(){
  if(!CU)return;
  const params = `order=created_at.desc&limit=40&or=(to_name.eq.${CU.name},admins_only.eq.true)`;
  const data = await sbQ('notifications', params);
  if(Array.isArray(data)){
    notifs = data.map(n=>({...n, readBy: n.read_by||[], time: n.created_at, linkType: n.link_type||null, linkId: n.link_id||null}));
  } else {
    notifs = JSON.parse(localStorage.getItem('v8_notifs_local')||'[]');
  }
  renderNotifs(); updateBadges();
}

// NOTE: sendNotif/notifyAdmins are redeclared (with link_type/link_id
// support) later in 27-modals-saves.js, which loads after this file and
// wins at runtime — kept here only for source consistency in case this
// file is ever loaded standalone. Keep both in sync.
async function sendNotif(toName, text, type='Mention', taskTitle='', adminsOnly=false, meta={}){
  if(!toName&&!adminsOnly) return;
  const linkType=meta?.taskId?'task':meta?.meetingId?'meeting':meta?.hrComId?'hrcom':meta?.annId?'announcement':null;
  const linkId=meta?.taskId||meta?.meetingId||meta?.hrComId||meta?.annId||null;
  const n={id:'n'+gid(),to:toName||'',from:CU?.name||'',text,type,taskTitle,linkType,linkId,adminsOnly,readBy:[],time:now()};
  notifs.unshift(n); notifs=notifs.slice(0,60);
  if(n.to===CU?.name||(n.adminsOnly&&isAdmin())) renderNotifs();
  updateBadges();
  // Write to Supabase async (silent — never toast on failure for this)
  (typeof sbInsertSilent==='function'?sbInsertSilent:sbInsert)('notifications',{to_name:toName||'',from_name:CU?.name||'',message:text,type,task_title:taskTitle||'',admins_only:adminsOnly,read_by:[],link_type:linkType,link_id:linkId}).then(r=>{ if(r?.id) n.id=r.id; }).catch(()=>{});
  localStorage.setItem('v8_notifs_local',JSON.stringify(notifs.slice(0,30)));
}

function notifyAdmins(text, type='Mention', taskTitle='', meta={}){
  sendNotif('', text, type, taskTitle, true, meta);
}

// ── External notify sheet (Telegram auto-sent + Email manual link) ────
window._notifyMembers={};
function showExternalNotifySheet(memberIds, taskTitle, taskDesc, taskId){
  const members=memberIds.map(id=>DB.team.find(m=>m.id===id)).filter(Boolean).filter(m=>m.telegram||m.email);
  if(!members.length) return;
  const taskLink=taskId?(window.location.href.split('#')[0]+'#task-'+taskId):'';

  // Telegram messages already went out automatically via notifyTG() at
  // task-creation time (a bot can't be "clicked open" the way wa.me could,
  // so there's nothing manual to do here for it — just show status).
  // Email still needs a manual click since we don't have an EmailJS call
  // wired into this particular flow.
  window._notifyMembers={};
  members.forEach(m=>{
    const safeId='nm_'+m.id.replace(/[^a-z0-9]/gi,'_');
    const emailSubj='New Task Assigned: '+taskTitle;
    const emailText='Hi '+m.name+',\n\nYou have been assigned a new task in VAS OS:\n\nTitle: '+taskTitle+'\n'+(taskDesc?'Details: '+taskDesc+'\n':'')+'\n'+(taskLink?'Open the task directly:\n'+taskLink+'\n':'')+'Regards,\n'+(CU?.name||'VAS OS');
    window._notifyMembers[safeId]={
      email: m.email?'mailto:'+m.email+'?subject='+encodeURIComponent(emailSubj)+'&body='+encodeURIComponent(emailText):null
    };
  });

  const rows=members.map(m=>{
    const safeId='nm_'+m.id.replace(/[^a-z0-9]/gi,'_');
    return`<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--bd)">
      <span style="width:32px;height:32px;border-radius:50%;background:${m.color};display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff;flex-shrink:0">${m.av}</span>
      <div style="flex:1">
        <div style="font-size:13px;font-weight:600">${m.name}</div>
        <div style="font-size:10px;color:var(--tx3)">${m.role||''}${m.telegram?' · Telegram':''}${m.email?' · '+m.email:''}</div>
      </div>
      <div style="display:flex;gap:6px">
        ${m.telegram?`<span style="display:inline-flex;align-items:center;gap:4px;padding:6px 12px;background:#e0f2fe;color:#0369a1;border:1px solid #bae6fd;border-radius:7px;font-size:11px;font-weight:700">✈️ Sent via Telegram</span>`:''}
        ${m.email?`<button onclick="openNotifyEmail('${safeId}')" style="display:inline-flex;align-items:center;gap:4px;padding:6px 12px;background:#2563eb18;color:#2563eb;border:1px solid #2563eb33;border-radius:7px;font-size:11px;font-weight:700;cursor:pointer">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 7 10-7"/></svg> Email</button>`:''}
      </div>
    </div>`;
  }).join('');

  document.getElementById('ext-notify-sheet')?.remove();
  const el=document.createElement('div');
  el.id='ext-notify-sheet';
  el.style.cssText='position:fixed;bottom:0;left:0;right:0;z-index:9999;background:var(--bg);border-top:2px solid var(--bd);border-radius:16px 16px 0 0;padding:20px 20px 28px;max-width:560px;margin:0 auto;box-shadow:0 -8px 32px #0005;animation:slideUp .22s ease';
  el.innerHTML=`
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
      <div style="font-size:14px;font-weight:800">Notify Assignees</div>
      <button onclick="document.getElementById('ext-notify-sheet')?.remove()" style="background:none;border:none;font-size:20px;color:var(--tx3);cursor:pointer">✕</button>
    </div>
    <div style="font-size:11px;color:var(--tx3);margin-bottom:12px">Task: <strong style="color:var(--tx)">${taskTitle}</strong></div>
    ${rows}
    <button onclick="document.getElementById('ext-notify-sheet')?.remove()" style="width:100%;margin-top:14px;padding:10px;background:var(--s2);border:1px solid var(--bd);border-radius:8px;color:var(--tx3);font-size:12px;font-weight:600;cursor:pointer">Done</button>`;
  document.body.appendChild(el);
  setTimeout(()=>document.getElementById('ext-notify-sheet')?.remove(),60000);
}

window.openNotifyEmail=(safeId)=>{
  const url=window._notifyMembers?.[safeId]?.email;
  if(url) window.open(url,'_blank'); else toast('No email for this member','bad');
};

function logAction(action, event, severity='Info', target='', details=''){
  nLog({action,event,actor:CU?.name||'',actorRole:CU?.role||'',severity,target});
}

// ══════════════════════════════════════════════════════
// AUTH
// ══════════════════════════════════════════════════════
// ── Tag-style multi-assignee picker ──────────────────────────────────
let _selectedAssignees = []; // array of member ids

function initAssignPicker(preselected=[]) {
  _selectedAssignees = [...preselected];
  renderAssignTags();
}

function renderAssignTags() {
  const wrap = document.getElementById('tf-assign-tags');
  if (!wrap) return;
  wrap.innerHTML = _selectedAssignees.map(id => {
    const m = DB.team.find(x => x.id === id);
    if (!m) return '';
    return `<span class="atag" style="background:${m.color}">
      <span style="width:14px;height:14px;border-radius:50%;background:rgba(255,255,255,.25);display:inline-flex;align-items:center;justify-content:center;font-size:7px;font-weight:700">${m.av}</span>
      ${m.name.split(' ')[0]}
      <span class="atag-x" onclick="removeAssignTag('${id}')">✕</span>
    </span>`;
  }).join('');
}

function removeAssignTag(id) {
  _selectedAssignees = _selectedAssignees.filter(x => x !== id);
  renderAssignTags();
}

function filterAssignSearch(q) {
  const drop = document.getElementById('tf-assign-drop');
  if (!drop) return;
  const filtered = DB.team.filter(m =>
    !_selectedAssignees.includes(m.id) &&
    (m.name.toLowerCase().includes(q.toLowerCase()) || m.role.toLowerCase().includes(q.toLowerCase()))
  );
  if (!filtered.length) { drop.style.display = 'none'; return; }
  drop.style.display = 'block';
  drop.innerHTML = filtered.map(m =>
    `<div onclick="addAssignTag('${m.id}')" style="display:flex;align-items:center;gap:8px;padding:7px 11px;cursor:pointer;font-size:12px" onmouseenter="this.style.background='var(--al)'" onmouseleave="this.style.background=''">
      <span style="width:22px;height:22px;border-radius:50%;background:${m.color};display:inline-flex;align-items:center;justify-content:center;font-size:8px;font-weight:700;color:#fff;flex-shrink:0">${m.av}</span>
      <div><div style="font-weight:600">${m.name}</div><div style="font-size:10px;color:var(--tx3)">${m.role}</div></div>
    </div>`
  ).join('');
}

function addAssignTag(id) {
  if (!_selectedAssignees.includes(id)) {
    _selectedAssignees.push(id);
    renderAssignTags();
  }
  const inp = document.getElementById('tf-assign-search');
  if (inp) { inp.value = ''; }
  document.getElementById('tf-assign-drop').style.display = 'none';
  // keep focus
  setTimeout(() => inp && inp.focus(), 50);
}

function showAssignDrop() {
  filterAssignSearch(document.getElementById('tf-assign-search')?.value || '');
}

function hideAssignDrop() {
  const drop = document.getElementById('tf-assign-drop');
  if (drop) drop.style.display = 'none';
}

function getSelectedAssignees() {
  return [..._selectedAssignees];
}
