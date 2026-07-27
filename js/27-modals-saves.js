// §27 ── MODALS & SAVE FUNCTIONS ────────────────────────────────────────
function openTaskModal(id){
  _editId=id; const t=id?DB.tasks.find(x=>x.id===id):null;
  document.getElementById('m-task-t').textContent=t?'Edit Task':'Create Task';
  document.getElementById('tf-btn').textContent=t?'Save Changes':'Create Task';
  // Tag-style assignee picker
  initAssignPicker(t?.assignees||( t?.assignedTo?[t.assignedTo]:[] ));
  document.getElementById('tf-reviewer').innerHTML='<option value="">None</option>'+DB.team.map(m=>`<option value="${m.id}">${m.name}</option>`).join('');
  // Company dropdown (pure companies, not operators)
  document.getElementById('tf-company').innerHTML='<option value="">None</option>'+DB.companies.map(c=>`<option value="${c.id}">${c.name}</option>`).join('');
  document.getElementById('tf-service').innerHTML='<option value="">None</option>'+DB.services.map(s=>`<option value="${s.id}">${s.name}</option>`).join('');
  document.getElementById('tf-operator').innerHTML='<option value="">None</option>'+[...DB.operators,...DB.companies].map(o=>`<option value="${o.id}">${o.name}</option>`).join('');
  if(document.getElementById('tf-project')) document.getElementById('tf-project').innerHTML='<option value="">None</option>'+DB.projects.map(p=>`<option value="${p.id}">${p.name}</option>`).join('');
  document.getElementById('tf-title').value=t?.title||'';
  document.getElementById('tf-priority').value=t?.priority||'High';
  document.getElementById('tf-type').value=t?.type||'Feature';
  // Tag picker handles restore via initAssignPicker above
  document.getElementById('tf-reviewer').value=t?.reviewer||'';
  document.getElementById('tf-service').value=t?.service||'';
  document.getElementById('tf-operator').value=t?.operator||'';
  document.getElementById('tf-due').value=t?.due||'';
  document.getElementById('tf-reqby').value=t?.reqBy||CU.name;
  document.getElementById('tf-desc').value=t?.desc||'';
  if(document.getElementById('tf-est')) document.getElementById('tf-est').value=t?.est||'';
  if(document.getElementById('tf-recur')) document.getElementById('tf-recur').value=t?.recur||'';
  if(document.getElementById('tf-project')) document.getElementById('tf-project').value=t?.projectId||'';
  // Apply current saved dropdown lists
  try{
    const saved=JSON.parse(localStorage.getItem('vas_dropdown_lists')||'{}');
    const types=saved.taskTypes||['Feature','Bug Fix','Content','Design','Maintenance','Research','Meeting'];
    const priorities=saved.taskPriorities||['Critical','High','Medium','Low'];
    const typeEl=document.getElementById('tf-type');
    const prioEl=document.getElementById('tf-priority');
    if(typeEl){const cv=typeEl.value;typeEl.innerHTML=types.map(t=>`<option ${cv===t?'selected':''}>${t}</option>`).join('');if(types.includes(cv))typeEl.value=cv;}
    if(prioEl){const cv=prioEl.value;prioEl.innerHTML=priorities.map(p=>`<option ${cv===p?'selected':''}>${p}</option>`).join('');if(priorities.includes(cv))prioEl.value=cv;}
  }catch(e){}
  OM('m-task');
}

function openMemberModal(id){
  _editId=id; const m=id?DB.team.find(x=>x.id===id):null;
  document.getElementById('m-mbr-t').textContent=m?'Edit Team Member':'Add Team Member';
  document.getElementById('mf-btn').textContent=m?'Save Changes':'Add Member';
  document.getElementById('mf-name').value=m?.name||'';
  document.getElementById('mf-role').value=m?.role||'Content Manager';
  document.getElementById('mf-dept').value=m?.dept||'Engineering';
  document.getElementById('mf-access').value=m?.access||'Member';
  document.getElementById('mf-email').value=m?.email||'';
  // Populate employment type dropdown
  const mtEl=document.getElementById('mf-mtype');
  if(mtEl){
    const types=getMemberTypes();
    mtEl.innerHTML='<option value="">— None —</option>'+types.map(t=>`<option value="${t.name}" ${m?.memberType===t.name?'selected':''}>${t.name}</option>`).join('');
  }
  if(document.getElementById('mf-username'))document.getElementById('mf-username').value=m?.username||'';
  if(document.getElementById('mf-password'))document.getElementById('mf-password').value=m?.password||'abohamood@1.';
  document.getElementById('mf-wa').value=m?.wa||'';
  if(document.getElementById('mf-wa-apikey'))document.getElementById('mf-wa-apikey').value=m?.wa_apikey||'';
  // Apply saved lists to role/dept selects
  try{
    const saved=JSON.parse(localStorage.getItem('vas_dropdown_lists')||'{}');
    const roles=saved.memberRoles||['CEO','Projects Manager','HR Manager','Super Senior Developer','Senior Developer','Front End Developer','Front End Designer','Sys Admin','Content Manager','Developer'];
    const depts=saved.memberDepartments||['Engineering','Design','Content','Management','Marketing','Finance','Other'];
    const roleEl=document.getElementById('mf-role');
    const deptEl=document.getElementById('mf-dept');
    if(roleEl){const cv=roleEl.value;roleEl.innerHTML=roles.map(r=>`<option ${cv===r?'selected':''}>${r}</option>`).join('');if(roles.includes(cv))roleEl.value=cv;}
    if(deptEl){const cv=deptEl.value;deptEl.innerHTML=depts.map(d=>`<option ${cv===d?'selected':''}>${d}</option>`).join('');if(depts.includes(cv))deptEl.value=cv;}
  }catch(e){}
  OM('m-mbr');
}

function openServiceModal(id){
  _editId=id; const s=id?DB.services.find(x=>x.id===id):null;
  document.getElementById('m-svc-t').textContent=s?'Edit Service':'Add Service';
  document.getElementById('sf-btn').textContent=s?'Save Changes':'Add Service';
  document.getElementById('sf-name').value=s?.name||'';
  if(document.getElementById('sf-type')) document.getElementById('sf-type').value=s?.service_type||'Digital';
  document.getElementById('sf-cat').value=s?.cat||'Content';
  document.getElementById('sf-status').value=s?.status||'Live';
  document.getElementById('sf-desc').value=s?.desc||'';
  // Apply current saved lists to dropdowns
  try{
    const saved=JSON.parse(localStorage.getItem('vas_dropdown_lists')||'{}');
    const types=saved.serviceTypes||['Digital','IVR','USSD','SMS'];
    const cats=saved.serviceCategories||['Content','Education','Entertainment','Gaming','Books','Other'];
    const stats=saved.serviceStatuses||['Live','In Development','Paused','Deprecated'];
    const typeEl=document.getElementById('sf-type');
    const catEl=document.getElementById('sf-cat');
    const statEl=document.getElementById('sf-status');
    if(typeEl) typeEl.innerHTML=types.map(t=>`<option value="${t}" ${(s?.service_type||'Digital')===t?'selected':''}>${t}</option>`).join('');
    if(catEl)  catEl.innerHTML=cats.map(t=>`<option value="${t}" ${(s?.cat||'')===t?'selected':''}>${t}</option>`).join('');
    if(statEl) statEl.innerHTML=stats.map(t=>`<option value="${t}" ${(s?.status||'Live')===t?'selected':''}>${t}</option>`).join('');
  }catch(e){}
  OM('m-svc');
}

function openOperatorModal(id){
  _editId=id; const o=id?DB.operators.find(x=>x.id===id):null;
  document.getElementById('m-op-t').textContent=o?'Edit Operator':'Add Operator';
  document.getElementById('of-btn').textContent=o?'Save Changes':'Add Operator';
  document.getElementById('of-name').value=o?.name||'';
  document.getElementById('of-country').value=o?.country||'Sudan';
  document.getElementById('of-status').value=o?.status||'Active';
  document.getElementById('of-contact').value=o?.contact||'';
  document.getElementById('of-email').value=o?.email||'';
  document.getElementById('of-phone').value=o?.phone||'';
  document.getElementById('of-notes').value=o?.notes||'';
  OM('m-op');
}

function openCompanyModal(id){
  _editId=id; const c=id?DB.companies.find(x=>x.id===id):null;
  document.getElementById('m-co-t').textContent=c?'Edit Company':'Add Company';
  document.getElementById('cf-btn').textContent=c?'Save Changes':'Add Company';
  document.getElementById('cf-name').value=c?.name||'';
  document.getElementById('cf-type').value=c?.type||'Partner';
  document.getElementById('cf-country').value=c?.country||'Sudan';
  document.getElementById('cf-contact').value=c?.contact||'';
  document.getElementById('cf-email').value=c?.email||'';
  document.getElementById('cf-notes').value=c?.notes||'';
  OM('m-co');
}

function openDocModal(id){
  _editId=id; const d=id?DB.docs.find(x=>x.id===id):null;
  document.getElementById('m-doc-t').textContent=d?'Edit Document':'Add Documentation';
  document.getElementById('df-btn').textContent=d?'Save Changes':'Save Document';
  document.getElementById('df-title').value=d?.title||'';
  document.getElementById('df-type').value=d?.type||'Task Documentation';
  document.getElementById('df-status').value=d?.status||'Published';
  document.getElementById('df-content').value=d?.content||'';
  OM('m-doc');
}

function openTodoModal(id){
  _editId=id; const td=id?DB.todos.find(x=>x.id===id):null;
  document.getElementById('m-todo-t').textContent=td?'Edit Todo':'Add Todo';
  document.getElementById('todo-btn').textContent=td?'Save Changes':'Save Todo';
  document.getElementById('todo-title').value=td?.title||'';
  document.getElementById('todo-prio').value=td?.priority||'High';
  document.getElementById('todo-due').value=td?.due||'';
  document.getElementById('todo-reminder').value=td?.reminder?td.reminder.slice(0,16):'';
  document.getElementById('todo-notes').value=td?.notes||'';
  OM('m-todo');
}

// ══════════════════════════════════════════════════════
// FORM SAVES
// ══════════════════════════════════════════════════════
window.saveTask=async()=>{
  const title=document.getElementById('tf-title').value.trim();
  if(!title){toast('Task title required','bad');return;}
  if(_editId){
    const t=DB.tasks.find(x=>x.id===_editId);if(!t)return;
    t.title=title; t.priority=document.getElementById('tf-priority').value; t.type=document.getElementById('tf-type').value;
    const newAssignees=getSelectedAssignees();
    if(newAssignees.length){t.assignees=newAssignees;t.assignedTo=newAssignees[0];}
    t.reviewer=document.getElementById('tf-reviewer').value; t.service=document.getElementById('tf-service').value;
    t.operator=document.getElementById('tf-operator').value;
    t.company2=document.getElementById('tf-company').value||null;
    t.link=document.getElementById('tf-link').value||'';
    t.projectId=document.getElementById('tf-project')?.value||null;
    t.due=document.getElementById('tf-due').value;
    t.reqBy=document.getElementById('tf-reqby').value; t.desc=document.getElementById('tf-desc').value;
    logAction('Task Updated',`${CU.name} updated "${title}"`,'Info',title,'');
    await nUpdateTask(t);
    CM('m-task'); toast('Task updated ✓','ok');
    if(page==='alltasks'||page==='mytasks')nav(page,document.querySelector('.ni.on'));
  } else {
    const assignees=getSelectedAssignees();
    const assignedTo2=assignees[0]||'';
    const t={id:'t'+gid(),title,status:'New',priority:document.getElementById('tf-priority').value,type:document.getElementById('tf-type').value,
      assignedTo:assignedTo2,assignees,
      reviewer:document.getElementById('tf-reviewer').value,
      service:document.getElementById('tf-service').value,
      operator:document.getElementById('tf-operator').value,
      company2:document.getElementById('tf-company').value||null,
      link:document.getElementById('tf-link').value||'',
      projectId:document.getElementById('tf-project')?.value||null,
      reqBy:document.getElementById('tf-reqby').value,due:document.getElementById('tf-due').value,
      est:parseFloat(document.getElementById('tf-est')?.value)||null,
      recur:document.getElementById('tf-recur')?.value||null,
      actual:null,what:'',tech:'',rejReason:'',createdBy:CU?.name||'',tsCreated:now(),tsOpened:null,tsStarted:null,tsSubmitted:null,tsReviewed:null,tsArchived:null,rejections:[],
      desc:document.getElementById('tf-desc').value,respH:null,workH:null,revH:null,cycleH:null};
    DB.tasks.unshift(t);
    const ass=DB.team.find(m=>m.id===assignedTo2);
    logAction('Task Created',`${CU.name} created "${title}" → ${ass?.name||'?'}`,'Success',title,'');
    const r=await nCreateTask(t,t.id); if(r?.id) t.id=r.id; // use Supabase UUID
    // If converted from a Todo, remove it
    if(window._pendingTodoId){
      const tid=window._pendingTodoId; window._pendingTodoId=null;
      DB.todos=DB.todos.filter(x=>x.id!==tid);
      try{await sbDelete('todos',tid);}catch(e){}
    }
    // Notify assignee
    // Notify all assignees — in-app + WhatsApp
    const allAssigneeIds=t.assignees?.length?t.assignees:[t.assignedTo].filter(Boolean);
    allAssigneeIds.forEach(aid=>{
      const am=DB.team.find(m=>m.id===aid);
      if(am&&am.name!==CU?.name){
        sendNotif(am.name,`New task assigned: "${title}" — ${t.priority} priority`,"Task Assigned",title);
        notifyWA(aid,'task_assigned',{title,priority:t.priority,due:t.due||'Not set',desc:t.desc||'',link:appLink('task-'+t.id)});
      }
    });
    // Notify reviewer — in-app + WhatsApp
    const rev=DB.team.find(m=>m.id===t.reviewer);
    if(rev&&rev.name!==CU?.name&&rev.name!==ass?.name){
      sendNotif(rev.name,`You are reviewer for new task: "${title}" (assigned to ${ass?.name||'?'})`,'Task Assigned',title);
      notifyWA(rev.id,'review_requested',{title,priority:t.priority,link:appLink('task-'+t.id)});
    }
    // Notify all admins
    notifyAdmins(`${CU.name} created new task: "${title}" → assigned to ${ass?.name||'unassigned'}`,'Task Assigned',title);
    CM('m-task'); updateBadges(); toast('Task created — member notified ✓','ok');
    if(page==='alltasks'||page==='dash')nav(page,document.querySelector('.ni.on'));
    // Copy task link to clipboard after creation
    try{const tLink=window.location.href.split('#')[0]+'#task-'+t.id;navigator.clipboard.writeText(tLink).then(()=>toast('Task link copied ✓','ok')).catch(()=>{});}catch(e){}
  }
};

window.saveMember=async()=>{
  const name=document.getElementById('mf-name').value.trim();if(!name){toast('Name required','bad');return;}
  if(_editId){
    const m=DB.team.find(x=>x.id===_editId);if(!m)return;
    m.name=name; m.role=document.getElementById('mf-role').value; m.dept=document.getElementById('mf-dept').value;
    m.access=document.getElementById('mf-access').value; m.email=document.getElementById('mf-email').value;
    m.memberType=document.getElementById('mf-mtype')?.value||m.memberType||'';
    m.wa=document.getElementById('mf-wa').value;
    m.wa_apikey=document.getElementById('mf-wa-apikey')?.value.trim()||m.wa_apikey||'';
    m.av=mkAv(name);
    if(document.getElementById('mf-username')?.value) m.username=document.getElementById('mf-username').value.trim().toLowerCase();
    if(document.getElementById('mf-password')?.value) m.password=document.getElementById('mf-password').value;
    logAction('Member Updated',`${CU.name} updated "${name}"`,'Info',name,'');
    await nMemberUpd(m); CM('m-mbr'); toast('Member updated ✓','ok');
    if(page==='team')nav('team',document.querySelector('.ni.on'));
  } else {
    const colors=['#4f46e5','#7c3aed','#0369a1','#047857','#b45309','#be185d','#dc2626'];
    const m={id:'u'+gid(),name,role:document.getElementById('mf-role').value,dept:document.getElementById('mf-dept').value,access:document.getElementById('mf-access').value,memberType:document.getElementById('mf-mtype')?.value||'',status:'Active',email:document.getElementById('mf-email').value,wa:document.getElementById('mf-wa').value,wa_apikey:document.getElementById('mf-wa-apikey')?.value.trim()||'',av:mkAv(name),color:colors[Math.floor(Math.random()*colors.length)],notes:''};
    DB.team.push(m);
    logAction('Member Added',`${CU.name} added "${name}"`,'Success',name,'');
    const r=await nMember(m,m.id); if(r?.url)NID[m.id]=r.url;
    CM('m-mbr'); toast(`${name} added ✓`,'ok');
    if(page==='team')nav('team',document.querySelector('.ni.on'));
  }
};


function openSvcModal(id){
  _editId=id;
  const s=id?DB.services.find(x=>x.id===id):null;
  document.getElementById('m-svc-t').textContent=s?'Edit Service':'Add Service';
  document.getElementById('sf-btn').textContent=s?'Save Changes':'Add Service';
  document.getElementById('sf-name').value=s?.name||'';
  if(document.getElementById('sf-status'))document.getElementById('sf-status').value=s?.status||'Live';
  if(document.getElementById('sf-type'))document.getElementById('sf-type').value=s?.service_type||'Digital';
  if(document.getElementById('sf-cat'))document.getElementById('sf-cat').value=s?.cat||'Content';
  if(document.getElementById('sf-desc'))document.getElementById('sf-desc').value=s?.desc||'';
  if(document.getElementById('sf-link'))document.getElementById('sf-link').value=s?.link||'';
  if(document.getElementById('sf-location'))document.getElementById('sf-location').value=s?.location_name||'';
  // Populate operator dropdown
  const opEl=document.getElementById('sf-operator');
  if(opEl){
    opEl.innerHTML='<option value="">None</option>'+DB.operators.map(o=>`<option value="${o.name}" ${s?.operator_name===o.name?'selected':''}>${o.name}</option>`).join('');
    if(s?.operator_name)opEl.value=s.operator_name;
  }
  // Populate company dropdown
  const coEl=document.getElementById('sf-owned');
  if(coEl){
    coEl.innerHTML='<option value="">None</option>'+[...DB.companies,...DB.operators].map(c=>`<option value="${c.name}" ${s?.owned_by===c.name?'selected':''}>${c.name}</option>`).join('');
    if(s?.owned_by)coEl.value=s.owned_by;
  }
  OM('m-svc');
}
window.saveService=async()=>{
  const name=document.getElementById('sf-name').value.trim();if(!name){toast('Name required','bad');return;}
  if(_editId){
    const s=DB.services.find(x=>x.id===_editId);if(!s)return;
    s.name=name;
    s.cat=document.getElementById('sf-cat')?.value||'';
    s.status=document.getElementById('sf-status').value;
    s.service_type=document.getElementById('sf-type')?.value||'Digital';
    s.desc=document.getElementById('sf-desc').value;
    s.operator_name=document.getElementById('sf-operator')?.value||'';
    s.owned_by=document.getElementById('sf-owned')?.value||'';
    s.location_name=document.getElementById('sf-location')?.value||'';
    s.link=document.getElementById('sf-link')?.value||'';
    await nServiceUpd(s); CM('m-svc'); toast('Service updated ✓','ok');
    if(page==='services')nav('services',document.querySelector('.ni.on'));
  } else {
        const s={
      id:'s'+gid(), name,
      cat: document.getElementById('sf-cat')?.value||'',
      status: document.getElementById('sf-status').value,
      service_type: document.getElementById('sf-type')?.value||'Digital',
      desc: document.getElementById('sf-desc').value,
      operator_name: document.getElementById('sf-operator')?.value||'',
      owned_by: document.getElementById('sf-owned')?.value||'',
      location_name: document.getElementById('sf-location')?.value||'',
      link: document.getElementById('sf-link')?.value||'',
    };
    DB.services.push(s);
    const r=await nService(s,s.id); if(r?.url)NID[s.id]=r.url;
    CM('m-svc'); toast(`${name} added ✓`,'ok');
    if(page==='services')nav('services',document.querySelector('.ni.on'));
  }
};

window.saveProject=async()=>{
  const name=document.getElementById('pf-name')?.value?.trim();
  if(!name){toast('Project name required','bad');return;}
  const ownedEl=document.getElementById('pf-owned');
  const ownedName=ownedEl?.options[ownedEl.selectedIndex]?.text||'';
  const memberIds=Array.from(document.getElementById('pf-members')?.selectedOptions||[]).map(o=>o.value);
  const data={
    name, status:document.getElementById('pf-status').value,
    locationName:document.getElementById('pf-location').value,
    field_of_work:document.getElementById('pf-field')?.value||'',
    ownedBy:ownedName,
    company_owner:ownedName,
    ownerCompanyId:document.getElementById('pf-owned').value||null,
    startedAt:document.getElementById('pf-started').value||null,
    targetDate:document.getElementById('pf-target').value||null,
    member_ids:memberIds,
    link:document.getElementById('pf-link').value||'',
    desc:document.getElementById('pf-desc').value||'',
  };
  if(_editId){
    const pr=DB.projects.find(x=>x.id===_editId);if(!pr)return;
    Object.assign(pr,data);
    await nProjectUpd(pr);CM('m-proj');toast('Project updated ✓','ok');
  } else {
    const pr={id:'p'+gid(),...data,completedAt:null};
    DB.projects.push(pr);
    await nProject(pr,pr.id);CM('m-proj');toast('Project created ✓','ok');
  }
  nav(page,document.querySelector('.ni.on'));
};

function openProjectModal(id){
  _editId=id; const pr=id?DB.projects.find(x=>x.id===id):null;
  document.getElementById('m-proj-t').textContent=pr?'Edit Project':'New Project';
  document.getElementById('pf-btn').textContent=pr?'Save Changes':'Save Project';
  document.getElementById('pf-name').value=pr?.name||'';
  document.getElementById('pf-status').value=pr?.status||'Planning';
  document.getElementById('pf-location').value=pr?.locationName||'';
  document.getElementById('pf-started').value=pr?.startedAt||'';
  document.getElementById('pf-target').value=pr?.targetDate||'';
  document.getElementById('pf-link').value=pr?.link||'';
  document.getElementById('pf-desc').value=pr?.desc||'';
  if(document.getElementById('pf-field')) document.getElementById('pf-field').value=pr?.field_of_work||'';
  // Populate members multi-select
  const pMbrEl=document.getElementById('pf-members');
  if(pMbrEl){
    pMbrEl.innerHTML=DB.team.map(m=>`<option value="${m.id}" ${(pr?.member_ids||[]).includes(m.id)?'selected':''}>${m.name} — ${m.role}</option>`).join('');
  }
  document.getElementById('pf-owned').innerHTML='<option value="">None</option>'+
    [...DB.companies,...DB.operators].map(c=>`<option value="${c.id}" ${pr?.ownerCompanyId===c.id?'selected':''}>${c.name}</option>`).join('');
  if(pr?.ownerCompanyId) document.getElementById('pf-owned').value=pr.ownerCompanyId;
  // Apply saved project lists
  try{
    const saved=JSON.parse(localStorage.getItem('vas_dropdown_lists')||'{}');
    const stats=saved.projectStatuses||['Planning','Active','On Hold','Completed','Cancelled'];
    const fields=saved.projectFields||['Engineering','Content','Design','Marketing','Operations','Finance','Research','Other'];
    const stEl=document.getElementById('pf-status');
    const fiEl=document.getElementById('pf-field');
    if(stEl){const cv=stEl.value;stEl.innerHTML=stats.map(s=>`<option ${cv===s?'selected':''}>${s}</option>`).join('');if(stats.includes(cv))stEl.value=cv;}
    if(fiEl){const cv=fiEl.value;fiEl.innerHTML='<option value="">Select…</option>'+fields.map(f=>`<option ${cv===f?'selected':''}>${f}</option>`).join('');if(fields.includes(cv))fiEl.value=cv;}
  }catch(e){}
  OM('m-proj');
}
window.saveOperator=async()=>{
  const name=document.getElementById('of-name').value.trim();if(!name){toast('Name required','bad');return;}
  const data={name,type:'Telecom Operator',country:document.getElementById('of-country').value,status:document.getElementById('of-status').value,contact:document.getElementById('of-contact').value,email:document.getElementById('of-email').value,phone:document.getElementById('of-phone').value,notes:document.getElementById('of-notes').value};
  if(_editId){
    const o=DB.operators.find(x=>x.id===_editId);if(!o)return;
    Object.assign(o,data); await nCompanyUpd(o); CM('m-op'); toast('Operator updated ✓','ok');
    if(page==='operators')nav('operators',document.querySelector('.ni.on'));
  } else {
    const o={id:'o'+gid(),...data};
    DB.operators.push(o);
    const r=await nCompany(o,o.id); if(r?.url)NID[o.id]=r.url;
    CM('m-op'); toast(`${name} added ✓`,'ok');
    if(page==='operators')nav('operators',document.querySelector('.ni.on'));
  }
};

window.saveCompany=async()=>{
  const name=document.getElementById('cf-name').value.trim();if(!name){toast('Name required','bad');return;}
  const data={name,type:document.getElementById('cf-type').value,country:document.getElementById('cf-country').value,contact:document.getElementById('cf-contact').value,email:document.getElementById('cf-email').value,notes:document.getElementById('cf-notes').value};
  if(_editId){
    const c=DB.companies.find(x=>x.id===_editId);if(!c)return;
    Object.assign(c,data); await nCompanyUpd(c); CM('m-co'); toast('Company updated ✓','ok');
    if(page==='companies')nav('companies',document.querySelector('.ni.on'));
  } else {
    const c={id:'c'+gid(),...data};
    DB.companies.push(c);
    const r=await nCompany(c,c.id); if(r?.url)NID[c.id]=r.url;
    CM('m-co'); toast(`${name} added ✓`,'ok');
    if(page==='companies')nav('companies',document.querySelector('.ni.on'));
  }
};

window.saveDoc=async()=>{
  const title=document.getElementById('df-title').value.trim();
  const content=document.getElementById('df-content').value.trim();
  if(!title||!content){toast('Title and content required','bad');return;}
  if(_editId){
    const d=DB.docs.find(x=>x.id===_editId);if(!d)return;
    d.title=title; d.type=document.getElementById('df-type').value; d.status=document.getElementById('df-status').value; d.content=content;
    logAction('Document Updated',`${CU.name} updated doc "${title}"`,'Info',title,'');
    await nDocUpd(d); CM('m-doc'); toast('Document updated ✓','ok');
    window._docsAll=[...DB.docs];
    if(page==='docs')nav('docs',document.querySelector('.ni.on'));
  } else {
    const doc={id:'d'+gid(),title,type:document.getElementById('df-type').value,status:document.getElementById('df-status').value,author:CU.id||'',fromTask:null,content,at:now()};
    DB.docs.unshift(doc); window._docsAll=[...DB.docs];
    logAction('Document Created',`${CU.name} created doc "${title}"`,'Success',title,'');
    const r=await nDoc(doc,doc.id); if(r?.url)NID[doc.id]=r.url;
    CM('m-doc'); toast('Document saved ✓','ok');
    if(page==='docs')nav('docs',document.querySelector('.ni.on'));
  }
};

window.saveBacklog=async()=>{
  const title=document.getElementById('bf-title').value.trim();if(!title){toast('Title required','bad');return;}
  const b={id:'b'+gid(),title,status:'New Idea',cat:document.getElementById('bf-cat').value,priority:document.getElementById('bf-prio').value,by:CU.name,desc:document.getElementById('bf-desc').value,why:document.getElementById('bf-why').value,notes:'',at:now()};
  DB.backlog.unshift(b);
  logAction('Backlog Submitted',`${CU.name} submitted idea "${title}"`,'Info',title,'');
  const r=await nBacklog(b,b.id); if(r?.url)NID[b.id]=r.url;
  CM('m-bl'); toast('Idea submitted ✓','ok');
  if(page==='backlog')nav('backlog',document.querySelector('.ni.on'));
};

window.saveTodo=async()=>{
  const title=document.getElementById('todo-title')?.value.trim();
  if(!title){toast('Title required','bad');return;}
  const priority=document.getElementById('todo-prio')?.value||'High';
  const due=document.getElementById('todo-due')?.value||null;
  const notes=document.getElementById('todo-notes')?.value||'';
  const reminder=document.getElementById('todo-reminder')?.value||null;

  if(_editId){
    const td=DB.todos.find(x=>x.id===_editId);if(!td){toast('Todo not found','bad');return;}
    td.title=title; td.priority=priority; td.due=due; td.notes=notes; td.reminder=reminder;
    // If todo has a real Supabase id (not local), update it
    if(td.id&&!td.id.startsWith('td')){
      await nTodoUpd(td);
    } else {
      // Still local — try to save to Supabase now
      const r=await nTodo(td,td.id);
      if(r?.id) td.id=r.id;
    }
    CM('m-todo'); toast('Todo updated ✓','ok');
    updateBadges(); if(page==='todos')nav('todos',document.querySelector('.ni.on'));
  } else {
    const td={
      id:'td'+gid(), title, status:'To Do', priority,
      assignedTo:CU?.name||'', owner:CU?.name||'',
      due, notes, reminder, at:now()
    };
    DB.todos.unshift(td);
    // Try full insert first, fall back to minimal if columns missing
    let r=null;
    try{
      r=await nTodo(td,td.id);
    }catch(e){
      // Fallback: minimal insert without new columns
      showSaving(true);
      r=await sbInsert('todos',{title:td.title,status:'To Do',priority:td.priority,assigned_to_name:td.assignedTo,due:td.due||null,notes:td.notes||''});
      showSaving(false);
    }
    if(r?.id) td.id=r.id;
    CM('m-todo'); toast('Todo added ✓','ok'); updateBadges();
    if(page==='todos')nav('todos',document.querySelector('.ni.on'));
  }
};

// ══════════════════════════════════════════════════════
// NOTIFICATIONS — clickable with action callbacks
// ══════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════
// NOTIFICATIONS — Notion-backed, visible to all users
// ══════════════════════════════════════════════════════
async function sendNotif(toName, text, type='Mention', taskTitle='', adminsOnly=false){
  if(!toName&&!adminsOnly)return;
  const n={
    id:gid(),nid:null,
    to:toName||'',from:CU?.name||'',
    text,type,taskTitle,
    adminsOnly,readBy:[],time:now()
  };
  notifs.unshift(n);notifs=notifs.slice(0,60);
  // Show immediately for current user if relevant
  if(n.to===CU?.name||(n.adminsOnly&&isAdmin()))renderNotifs();
  updateBadges();
  // Persist to Supabase async (non-blocking)
  sbInsert('notifications',{to_name:toName||'',from_name:CU?.name||'',message:text,type,task_title:taskTitle||'',admins_only:adminsOnly,read_by:[]}).then(r=>{if(r?.id)n.id=r.id;}).catch(()=>{});
  // Also always keep in localStorage as fast cache
  localStorage.setItem('v8_notifs_local',JSON.stringify(notifs.slice(0,30)));
}

// Send to all admins
function notifyAdmins(text, type='Mention', taskTitle=''){
  // Store as admins-only notification
  sendNotif('', text, type, taskTitle, true);
}

// Send to both assignee and all admins
function notifyTaskEvent(task, text, type){
  const ass=DB.team.find(m=>m.id===task.assignedTo);
  const rev=DB.team.find(m=>m.id===task.reviewer);
  if(ass&&ass.name!==CU?.name) sendNotif(ass.name, text, type, task.title, false);
  if(rev&&rev.name!==CU?.name&&rev.name!==ass?.name) sendNotif(rev.name, text, type, task.title, false);
  // Always notify admins (as an admin-only broadcast)
  sendNotif('', text, type, task.title, true);
}

function renderNotifs(){
  const list=document.getElementById('nd-list');if(!list)return;
  const mine=notifs.filter(n=>{
    if(n.to===CU?.name)return true;
    if(n.adminsOnly&&isAdmin())return true;
    return false;
  });
  if(!mine.length){list.innerHTML='<div style="padding:16px;text-align:center;font-size:12px;color:var(--tx3)">All caught up! ✓</div>';updateBadges();return;}
  list.innerHTML=mine.slice(0,12).map(n=>{
    const isRead=n.readBy.includes(CU?.name);
    const typeIcons={'Task Assigned':'📬','Task Started':'▶️','Task Submitted':'📤','Task Approved':'✅','Task Rejected':'🔴','Review Needed':'🔍','Task Updated':'✏️','Status Changed':'🔄','Mention':'💬'};
    const icon=typeIcons[n.type]||'🔔';
    return`<div class="ndi ${isRead?'':'unr'}" onclick="clickNotif('${n.id}')">
      <div class="nd-d ${isRead?'r':''}"></div>
      <div style="flex:1"><div class="nd-txt">${icon} ${n.text}</div>
      ${n.taskTitle?`<div style="font-size:10px;color:var(--ac);margin-top:1px;font-weight:500">${n.taskTitle}</div>`:''}
      <div class="nd-m">${n.from?`From ${n.from} · `:''}${fr(n.time)}</div></div>
    </div>`;
  }).join('');
  updateBadges();
}

window.clickNotif=(id)=>{
  const n=notifs.find(no=>no.id===id);if(!n)return;
  if(!n.readBy.includes(CU?.name)){
    n.readBy.push(CU.name);
    localStorage.setItem('v8_notifs_local',JSON.stringify(notifs.slice(0,30)));
    // Update read_by in Supabase async
    if(n.id&&!n.id.startsWith('n')){
      sbUpdate('notifications', n.id, {read_by: n.readBy}).catch(()=>{});
    }
    renderNotifs();
  }
  // Navigate to task if taskTitle matches
  if(n.taskTitle){
    const t=DB.tasks.find(tk=>tk.title===n.taskTitle);
    if(t)openTask(t.id);
  }
  closeND();
};

window.markAllRead=()=>{
  notifs.forEach(n=>{if(!n.readBy.includes(CU?.name))n.readBy.push(CU.name);});
  localStorage.setItem('v8_notifs_local',JSON.stringify(notifs.slice(0,30)));
  renderNotifs();
};
