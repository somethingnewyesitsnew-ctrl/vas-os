// §06 ── TASK PAYLOAD & DB WRITES ───────────────────────────────────────
function taskPayload(t){
  const p={
    title: t.title,
    status: t.status,
    priority: t.priority,
    type: t.type,
    assigned_to: t.assignedTo||null,
    reviewer: t.reviewer||null,
    service_id: t.service||null,
    company_id: t.operator||null,
    project_id: t.projectId||null,
    req_by: t.reqBy||'',
    due: t.due||null,
    actual: t.actual??null,
    what: t.what||'',
    tech: t.tech||'',
    rej_reason: t.rejReason||'',
    description: t.desc||'',
    assignees: t.assignees||[],
    company_id2: t.company2||null,
    link: t.link||'',
    ts_started: t.tsStarted||null,
    ts_submitted: t.tsSubmitted||null,
    ts_reviewed: t.tsReviewed||null,
    ts_archived: t.tsArchived||null,
    ts_opened: t.tsOpened||null,
    work_h: t.workH??null,
    resp_h: t.respH??null,
    rev_h: t.revH??null,
    cycle_h: t.cycleH??null,
    rejections: t.rejections||[],
    recur: t.recur||null,
    ...(t.comments?.length?{comments:t.comments}:{}),
    ...(t.meetingId?{meeting_id:t.meetingId}:{}),
    ...(t.parentTaskId?{parent_task_id:t.parentTaskId}:{}),
    ...(t.reEstimates?.length?{re_estimates:t.reEstimates}:{}),
    ...(t.timeline?.length?{timeline:t.timeline}:{}),
  };
  // Optional columns — only send if set (avoids schema cache errors when column missing)
  if(t.createdBy) p.created_by=t.createdBy;
  if(t.est!=null)  p.est=t.est;
  return p;
}

async function nCreateTask(t, lid){
  showSaving(true);
  const r = await sbInsert('tasks', taskPayload(t));
  showSaving(false);
  if(r?.id){ t.id=r.id; setSync('live','🔄 Refresh'); scheduleSync(); return r; }
  setSync('err','Save failed'); return null;
}

async function nUpdateTask(t){
  if(!t.id)return nCreateTask(t,t.id);
  showSaving(true);
  const r = await sbUpdate('tasks', t.id, taskPayload(t));
  showSaving(false);
  if(r!==null){ setSync('live','🔄 Refresh'); scheduleSync(); } else setSync('err','Update failed');
  return r;
}

async function nMember(m, lid){
  showSaving(true);
  const r = await sbInsert('team', {name:m.name,role:m.role,dept:m.dept,access:m.access||'Member',status:'Active',email:m.email||'',telegram:m.telegram||'',color:m.color,av:m.av,username:m.username||m.name.toLowerCase().split(' ')[0],password:m.password||'abohamood@1.',member_type:m.memberType||'',perm_overrides:m.permOverrides||{}});
  showSaving(false);
  if(r?.id) m.id=r.id;
  return r;
}
async function nMemberUpd(m){
  showSaving(true);
  const r = await sbUpdate('team', m.id, {name:m.name,role:m.role,dept:m.dept,access:m.access,email:m.email||'',telegram:m.telegram||'',username:m.username||m.name.toLowerCase().split(' ')[0],password:m.password||'abohamood@1.',member_type:m.memberType||'',perm_overrides:m.permOverrides||{}});
  showSaving(false); return r;
}

async function nService(s, lid){
  showSaving(true);
  const r = await sbInsert('services', {name:s.name,cat:s.cat,status:s.status,service_type:s.service_type||'Digital',description:s.desc||'',operator_name:s.operator_name||'',owned_by:s.owned_by||'',location_name:s.location_name||'',project_name:s.project_name||'',link:s.link||''});
  showSaving(false);
  if(r?.id) s.id=r.id; return r;
}
async function nServiceUpd(s){
  showSaving(true);
  const r = await sbUpdate('services', s.id, {name:s.name,cat:s.cat,status:s.status,service_type:s.service_type||'Digital',description:s.desc||'',operator_name:s.operator_name||'',owned_by:s.owned_by||'',location_name:s.location_name||'',link:s.link||''});
  showSaving(false); return r;
}

async function nCompany(c, lid){
  showSaving(true);
  const r = await sbInsert('companies', {name:c.name,type:c.type||'Partner',country:c.country||'',contact:c.contact||'',email:c.email||'',phone:c.phone||'',notes:c.notes||'',status:c.status||'Active'});
  showSaving(false);
  if(r?.id) c.id=r.id; return r;
}
async function nCompanyUpd(c){
  showSaving(true);
  const r = await sbUpdate('companies', c.id, {name:c.name,type:c.type||'Partner',contact:c.contact||'',email:c.email||'',notes:c.notes||''});
  showSaving(false); return r;
}

async function nDoc(d, lid){
  showSaving(true);
  const r = await sbInsert('docs', {title:d.title,type:d.type,status:d.status,content:d.content||'',author_name:d.author||CU?.name||'',from_task_id:d.fromTask||null});
  showSaving(false);
  if(r?.id) d.id=r.id; return r;
}
async function nDocUpd(d){
  showSaving(true);
  const r = await sbUpdate('docs', d.id, {title:d.title,type:d.type,status:d.status,content:d.content||''});
  showSaving(false); return r;
}

async function nBacklog(b, lid){
  showSaving(true);
  const r = await sbInsert('backlog', {title:b.title,status:'New Idea',cat:b.cat,priority:b.priority,by_name:b.by||CU?.name||'',description:b.desc||'',why:b.why||'',notes:''});
  showSaving(false);
  if(r?.id) b.id=r.id; return r;
}
async function nBacklogUpd(b){
  showSaving(true);
  const r = await sbUpdate('backlog', b.id, {status:b.status,notes:b.notes||'',status_updated_at:new Date().toISOString()});
  showSaving(false); return r;
}

async function nProject(p, lid){
  showSaving(true);
  const r = await sbInsert('projects', {name:p.name,status:p.status||'Planning',description:p.desc||'',location_name:p.locationName||'',owned_by:p.ownedBy||'',owner_company_id:p.ownerCompanyId||null,started_at:p.startedAt||null,target_date:p.targetDate||null,budget:p.budget??null,link:p.link||'',field_of_work:p.field_of_work||'',member_ids:p.member_ids||[]});
  showSaving(false);
  if(r?.id) p.id=r.id; return r;
}
async function nProjectUpd(p){
  showSaving(true);
  const r = await sbUpdate('projects', p.id, {name:p.name,status:p.status,description:p.desc||'',location_name:p.locationName||'',owned_by:p.ownedBy||'',owner_company_id:p.ownerCompanyId||null,started_at:p.startedAt||null,target_date:p.targetDate||null,budget:p.budget??null,link:p.link||'',field_of_work:p.field_of_work||'',member_ids:p.member_ids||[]});
  showSaving(false); return r;
}

async function nTodo(td, lid){
  showSaving(true);
  const r = await sbInsert('todos', {title:td.title,status:td.status||'To Do',priority:td.priority||'High',assigned_to_name:td.assignedTo||CU?.name||'',owner_name:CU?.name||'',due:td.due||null,notes:td.notes||'',reminder:td.reminder||null});
  showSaving(false);
  if(r?.id) td.id=r.id; return r;
}
async function nMeeting(m){
  showSaving(true);
  const r=await sbInsert('meetings',{title:m.title,description:m.description||'',meeting_date:m.meeting_date,meeting_time:m.meeting_time,duration_minutes:m.duration_minutes||60,location:m.location||'',meeting_type:m.meeting_type||'Internal',status:m.status||'Scheduled',created_by:m.created_by||CU?.name||'',invitees:m.invitees||[],attendance:m.attendance||{},started_at:m.started_at||null,ended_at:m.ended_at||null,cancelled_at:m.cancelled_at||null,cancel_reason:m.cancel_reason||'',project_id:m.project_id||null,service_id:m.service_id||null,operator_id:m.operator_id||null});
  showSaving(false);if(r?.id)m.id=r.id;return r;
}
// ── Service Test DB helpers ──────────────────────────────────────────────
async function sbSaveSchedule(s){
  if(s.id&&!s.id.startsWith('sch')){ return sbUpdate('test_schedules',s.id,{operator_id:s.operator_id,member_id:s.member_id,day_of_week:s.day_of_week,active:s.active!==false}); }
  const r=await sbInsert('test_schedules',{operator_id:s.operator_id,member_id:s.member_id,day_of_week:s.day_of_week,active:true});
  if(r?.id)s.id=r.id; return r;
}
async function sbDelSchedule(id){ return sbDelete('test_schedules',id); }

async function sbCreateSession(s){
  const r=await sbInsert('test_sessions',{operator_id:s.operator_id||null,tester_id:s.tester_id||null,tester_name:s.tester_name,operator_name:s.operator_name,test_date:s.test_date,status:'In Progress',started_at:new Date().toISOString(),total_checks:0,passed_checks:0,failed_checks:0});
  if(r?.id)s.id=r.id; return r;
}
async function sbUpdateSession(s){
  return sbUpdate('test_sessions',s.id,{status:s.status,completed_at:s.completed_at||null,total_checks:s.total_checks||0,passed_checks:s.passed_checks||0,failed_checks:s.failed_checks||0});
}

async function sbSaveCheck(c){
  const payload={session_id:c.session_id,service_id:c.service_id||null,service_name:c.service_name,operator_name:c.operator_name,check_name:c.check_name,result:c.result||'pending',priority:c.priority||'High',tester_note:c.tester_note||'',tested_at:c.tested_at||null,test_date:c.test_date,tester_name:c.tester_name,converted_to_task:false};
  if(c.id&&!c.id.startsWith('chk')){ return sbUpdate('test_checks',c.id,{result:c.result,tester_note:c.tester_note||'',tested_at:c.tested_at||null,priority:c.priority}); }
  const r=await sbInsert('test_checks',payload);
  if(r?.id)c.id=r.id; return r;
}
async function sbMarkCheckConverted(checkId,taskId){
  return sbUpdate('test_checks',checkId,{converted_to_task:true,task_id:taskId});
}

async function nMeetingUpd(m){
  showSaving(true);
  const r=await sbUpdate('meetings',m.id,{title:m.title,description:m.description||'',meeting_date:m.meeting_date,meeting_time:m.meeting_time,duration_minutes:m.duration_minutes||60,location:m.location||'',meeting_type:m.meeting_type||'Internal',status:m.status||'Scheduled',invitees:m.invitees||[],attendance:m.attendance||{},started_at:m.started_at||null,ended_at:m.ended_at||null,cancelled_at:m.cancelled_at||null,cancel_reason:m.cancel_reason||'',notes:m.notes||'',project_id:m.project_id||null,service_id:m.service_id||null,operator_id:m.operator_id||null});
  showSaving(false);return r;
}

async function nTodoUpd(td){
  showSaving(true);
  const r = await sbUpdate('todos', td.id, {status:td.status,title:td.title,priority:td.priority,due:td.due||null,notes:td.notes||'',reminder:td.reminder||null});
  showSaving(false); return r;
}

async function nArchive(a, lid){
  showSaving(true);
  const r = await sbInsert('archive', {title:a.title,outcome:a.outcome||'Successful',est:a.est??null,actual:a.actual??null,by_name:a.by||'',reviewer_name:a.reviewer||'',service_name:a.svc||'',operator_name:a.op||'',type:a.type||'',priority:a.priority||'',done_date:a.done||null,what:a.what||'',req_by:a.reqBy||'',resp_h:a.respH??null,work_h:a.workH??null,rev_h:a.revH??null,cycle_h:a.cycleH??null});
  showSaving(false);
  if(r?.id) a.id=r.id; return r;
}

// nDelete is now handled via sbDelete in delItem

async function nLog(e){
  // Supabase: just console.log for now, extend later if needed
  console.log('LOG:', e.action, e.event);
}

// ── Notifications via Supabase ──
