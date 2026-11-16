/**
 * Behavioural tests for the v4.4.0 changes (jsdom, no network):
 *   1. Dashboard overdue box shows an actual count
 *   2. Scheduled service-test task is created as a NORMAL task (type Testing,
 *      full test brief) and Set Estimate & Start no longer routes into the
 *      Service Tests module
 *   3. Login-reminder engine: only opted-in members, only after 3 days,
 *      never self, never twice, never if the log row can't be saved
 *   4. Member detail shows login-reminder count + dates; admin toggle works
 *   5. Push: re-attaches silently on login (upsert by endpoint), respects an
 *      explicit disable
 * Usage: node tests/feature-tests-v4.4.js [repo-root]
 */
const { JSDOM } = require('jsdom');
const fs = require('fs'), path = require('path');
const REPO = process.argv[2] || '.';
const ORDER = ["00-core-preamble","01-push-notifications","02-ui-utils-config","03-supabase-helpers","04-member-types-perms","05-data-load","06-task-db-writes","07-notify-log","08-auth-nav","09-syslog-persist","10-dashboard","11-tasks","12-todos-reminders","13-projects","14-team-eval","15-backlog","16-services-operators","17-library","18-docs-archive","19-meetings","20-service-tests","21-settings","23-hr-comms-announcements-reports","24-comments-page","25-tutorial","26-task-panel","27-modals-saves","28-badges-updates","29-init-mobile"];
let html = fs.readFileSync(path.join(REPO,'material.html'),'utf8').replace(/<script[^>]*src="[^"]*"><\/script>/g,'');
const dom = new JSDOM(html,{url:'http://localhost/',runScripts:'dangerously',pretendToBeVisual:true});
const {window}=dom;
window.fetch=()=>Promise.reject(new Error('network disabled'));
window.Notification={permission:'default',requestPermission:async()=>'default'};
function chain(){const c=new Proxy(function(){},{get(t,p){if(p==='then')return r=>r({data:[],error:null});if(p==='catch')return()=>c;return()=>c;}});return c;}
window.supabase={createClient:()=>({from:()=>chain(),rpc:()=>chain(),channel:()=>({on(){return this;},subscribe(cb){cb&&cb('SUBSCRIBED');return this;}}),removeChannel(){},auth:{}})};
global.window=window;global.document=window.document;global.localStorage=window.localStorage;global.navigator=window.navigator;
const load=(code)=>{const s=window.document.createElement('script');s.textContent=code;window.document.body.appendChild(s);};
for(const m of ORDER) load(fs.readFileSync(path.join(REPO,'js',m+'.js'),'utf8'));
load(fs.readFileSync(path.join(REPO,'js','material-overrides.js'),'utf8'));

const TESTS = `
window.__R=[];
const ok=(name,cond,extra)=>window.__R.push({name,pass:!!cond,extra:cond?'':String(extra||'')});
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
(async()=>{ try{
  CU={id:'u1',name:'Demo CEO',role:'CEO',color:'#4f46e5',av:'DC',access:'Admin',email:'x@example.com'};
  loadDemoData();

  // ---------- 1. Overdue card ----------
  const od=[{due:'2020-01-01'},{due:'2020-01-05'},{due:'2020-01-02'}];
  let card=overdueCardHTML(od,10,30,{overdueCount:1});
  ok('overdue card shows the real count (3)', /font-size:38px[^>]*>3</.test(card), card.slice(0,400));
  ok('overdue card no longer shows a % figure as the big number', !/font-size:38px[^>]*>\\d+%</.test(card));
  ok('overdue card says "of 10 active tasks"', card.includes('of 10 active tasks'));
  ok('overdue card shows longest delay in days', /longest \\d+d late/.test(card));
  ok('overdue card shows change vs yesterday (+2)', card.includes('+2 since yesterday'), card);
  ok('overdue card with zero overdue is calm', overdueCardHTML([],10,0,null).includes('nothing late'));
  const dashEl=document.getElementById('content')||document.createElement('div');
  try{ rDash(dashEl); ok('dashboard renders "Overdue Tasks" label, not "Overdue Rate"', dashEl.innerHTML.includes('Overdue Tasks')&&!dashEl.innerHTML.includes('Overdue Rate')); }
  catch(e){ ok('rDash renders', false, e.stack); }

  // ---------- 2. Service-test task is a normal task ----------
  const today=new Date().getDay();
  DB.operators=[{id:'op1',name:'Zain'}];
  DB.services=[{id:'sv1',name:'Zain Games',operator_id:'op1',operator_name:'Zain'},{id:'sv2',name:'Zain Music',operator_id:'op1',operator_name:'Zain'}];
  DB.testSchedules=[{id:'sch1',day_of_week:today,member_id:'u2',operator_id:'op1',active:true,reviewer_id:'u3'}];
  DB.tasks=[]; localStorage.clear();
  startReminderChecker();   // creates the task synchronously (a later async demo-data reload would reset DB.tasks)
  const t=DB.tasks.find(x=>x.title&&x.title.startsWith('Service Test — Zain'));
  ok('scheduled test auto-creates a task', !!t, 'tasks now: '+JSON.stringify(DB.tasks.map(x=>x.title))+' team ids: '+DB.team.map(m=>m.id).join()+' scheds: '+JSON.stringify(DB.testSchedules));
  if(t){
    ok('task type is "Testing" (not the old module-bound "Service Test")', t.type==='Testing', t.type);
    ok('assigned to the scheduled tester', t.assignedTo==='u2');
    ok('has the reviewer from the schedule', t.reviewer==='u3');
    for(const k of ['Full cycle test','Content test','UI test','UX test','Speed test','Complete services test'])
      ok('brief requests: '+k, t.desc.includes(k));
    ok('brief names the operator and its services', t.desc.includes('Zain')&&t.desc.includes('Zain Games')&&t.desc.includes('Zain Music'));
    ok('brief no longer sends people to the Service Tests checklist page', !t.desc.includes('checklist for each service'));
    // starting it: must open the normal task, not the service-test module
    let spyModule=0, spyTask=0;
    window.startServiceTestTask=()=>{spyModule++;}; window.openTask=()=>{spyTask++;};
    CU=DB.team.find(m=>m.id==='u2'); _pendTask=t.id;
    document.getElementById('est-h').value='2';
    await window.confirmStart();
    ok('Set Estimate & Start opens the normal task panel', spyTask===1&&spyModule===0, 'task='+spyTask+' module='+spyModule);
    ok('task moved to In Progress like any task', t.status==='In Progress');
    CU={id:'u1',name:'Demo CEO',role:'CEO',color:'#4f46e5',av:'DC',access:'Admin',email:'x@example.com'};
  }
  // second run must not create a duplicate
  const before=DB.tasks.filter(x=>x.title&&x.title.startsWith('Service Test — Zain')).length;
  startReminderChecker();
  ok('no duplicate test task on re-run', DB.tasks.filter(x=>x.title&&x.title.startsWith('Service Test — Zain')).length===before);

  // ---------- 3. Login-reminder engine ----------
  const DAY=86400000, ago=(d)=>new Date(Date.now()-d*DAY).toISOString();
  DB.team=[
    {id:'u1',name:'Demo CEO',access:'Admin',status:'Active',lastLogin:ago(9),loginReminderActive:true,created_at:ago(100)},        // self -> never
    {id:'a',name:'Away On',access:'Member',status:'Active',lastLogin:ago(5),loginReminderActive:true,created_at:ago(100)},         // SHOULD get one
    {id:'b',name:'Away Off',access:'Member',status:'Active',lastLogin:ago(7),loginReminderActive:false,created_at:ago(100)},        // feature off
    {id:'c',name:'Recent On',access:'Member',status:'Active',lastLogin:ago(1),loginReminderActive:true,created_at:ago(100)},        // only 1 day
    {id:'d',name:'Never On',access:'Member',status:'Active',lastLogin:null,loginReminderActive:true,created_at:ago(10)},           // never logged in, 10d old account -> SHOULD
    {id:'e',name:'Inactive Acct',access:'Member',status:'Inactive',lastLogin:ago(20),loginReminderActive:true,created_at:ago(100)}, // deactivated -> never
  ];
  DB.loginReminders=[];
  const sent=[], inserted=[]; let insertOk=true, serverLastLogin=null;
  window.sendNotif=(to,text,type)=>{sent.push({to,text,type});};
  window.notifyTG=(id,ev,data)=>{sent.push({push:id,ev,data});};
  window.logAction=()=>{};
  window.sbQ=async(table,params)=>{
    if(table==='team_public'){const id=/id=eq\\.([^&]+)/.exec(params)[1];const m=DB.team.find(x=>x.id===id);return [{last_login:serverLastLogin||m.lastLogin,login_reminder_active:m.loginReminderActive===true}];}
    if(table==='login_reminders'){const id=/member_id=eq\\.([^&]+)/.exec(params)[1];return inserted.filter(r=>r.member_id===id);}
    return [];
  };
  window.sbInsertSilent=async(table,row)=>{ if(!insertOk) return null; const r={id:'lr'+inserted.length,sent_at:new Date().toISOString(),...row}; inserted.push(r); return r; };
  startLoginReminderCheck(); await sleep(80);
  const notifTo=sent.filter(s=>s.to).map(s=>s.to).sort();
  ok('reminders go ONLY to opted-in members who are 3+ days away (incl. never-logged-in)', JSON.stringify(notifTo)==='["Away On","Never On"]', JSON.stringify(notifTo));
  ok('push (notifyTG) fired for the same two', sent.filter(s=>s.push).map(s=>s.push).sort().join()==='a,d', JSON.stringify(sent.filter(s=>s.push)));
  ok('each reminder is logged with days away', inserted.length===2&&inserted.find(r=>r.member_id==='a').days_inactive===5&&inserted.find(r=>r.member_id==='d').days_inactive===10, JSON.stringify(inserted));
  ok('message tells them how long they were away', sent.find(s=>s.to==='Away On').text.includes('5 days'));
  ok('admin who is the one running it is never reminded', !notifTo.includes('Demo CEO'));
  // re-run: no repeats within 3 days
  const n1=sent.length; startLoginReminderCheck(); await sleep(80);
  ok('no repeat reminder within 3 days', sent.length===n1);
  // a member who logged in on another device since this tab loaded must be skipped
  DB.loginReminders=[]; inserted.length=0; sent.length=0; serverLastLogin=ago(0.1);
  startLoginReminderCheck(); await sleep(80);
  ok('fresh server last_login (they just logged in) cancels the reminder', sent.length===0, JSON.stringify(sent));
  // if the log row cannot be saved (migration not run) -> nothing is sent, so no spam
  serverLastLogin=null; DB.loginReminders=[]; sent.length=0; insertOk=false;
  startLoginReminderCheck(); await sleep(80);
  ok('if the log row cannot be saved, NOTHING is sent', sent.length===0, JSON.stringify(sent));
  insertOk=true;

  // ---------- 4. Member detail panel ----------
  DB.loginReminders=[
    {id:'1',member_id:'a',sent_at:ago(2),days_inactive:5,sent_by:'Demo CEO'},
    {id:'2',member_id:'a',sent_at:ago(8),days_inactive:3,sent_by:'Demo CEO'},
    {id:'3',member_id:'d',sent_at:ago(1),days_inactive:10,sent_by:'Demo CEO'},
  ];
  openMemberDetail('a');
  let bd=document.getElementById('sp-bd').innerHTML;
  ok('member detail shows the login-reminder section', bd.includes('Login reminders'));
  ok('member detail shows the count (2) for that member only', />2<\\/span>/.test(bd.split('Login reminders')[1].slice(0,400)));
  ok('member detail lists "5 days without login" and "3 days without login"', bd.includes('5 days without login')&&bd.includes('3 days without login'));
  ok('toggle shows ON for opted-in member', bd.includes('● ON'));
  openMemberDetail('b'); bd=document.getElementById('sp-bd').innerHTML;
  ok('toggle shows OFF for member not opted in', bd.includes('○ OFF')&&bd.includes('No login reminders will be sent')||bd.includes('○ OFF'));
  window.sbRpc=async(fn,p)=>{ window.__rpc={fn,p}; return true; };
  await toggleLoginReminder('b');
  ok('admin toggle calls set_login_reminder and flips the member ON', window.__rpc&&window.__rpc.fn==='set_login_reminder'&&window.__rpc.p.p_active===true&&DB.team.find(m=>m.id==='b').loginReminderActive===true, JSON.stringify(window.__rpc));
  window.sbRpc=async()=>null; await toggleLoginReminder('b');
  ok('failed save (migration missing) leaves the switch unchanged', DB.team.find(m=>m.id==='b').loginReminderActive===true);
  // non-admin cannot toggle
  const savedCU=CU; CU={id:'a',name:'Away On',access:'Member'}; window.__rpc=null; window.sbRpc=async(fn,p)=>{window.__rpc={fn,p};return true;};
  await toggleLoginReminder('c'); ok('members cannot toggle the setting', window.__rpc===null); CU=savedCU;

  // ---------- 5. Push persists across logout/login ----------
  const calls={save:[],subscribe:0};
  const fakeSub={endpoint:'https://push.example/abc',toJSON(){return {endpoint:this.endpoint,keys:{p256dh:'p',auth:'a'}};}};
  let existing=fakeSub;
  const reg={pushManager:{getSubscription:async()=>existing,subscribe:async()=>{calls.subscribe++;existing=fakeSub;return fakeSub;}}};
  Object.defineProperty(window.navigator,'serviceWorker',{configurable:true,value:{register:async()=>reg,ready:Promise.resolve(reg),getRegistration:async()=>reg,addEventListener(){}}});
  window.PushManager=function(){};
  window.Notification={permission:'granted',requestPermission:async()=>'granted'};
  window.fetch=async(url,opts)=>{ calls.save.push({url:String(url),opts}); return {ok:true,json:async()=>[{id:'x'}],text:async()=>''}; };
  CU={id:'a',name:'Away On',access:'Member'}; localStorage.clear();
  await ensurePushOnLogin();
  const saveCall=calls.save.find(c=>c.url.includes('push_subscriptions'));
  ok('login re-saves this device for the member (no click)', !!saveCall && JSON.parse(saveCall.opts.body).member_id==='a');
  ok('save is an upsert by endpoint (fixes duplicate-endpoint conflict)', saveCall&&saveCall.url.includes('on_conflict=endpoint'), saveCall&&saveCall.url);
  ok('browser subscription reused, not recreated', calls.subscribe===0);
  ok('enabled flag remembered for the member', localStorage.getItem('vas_push_enabled_a')==='1');
  // subscription dropped by the browser but permission still granted -> silent re-subscribe
  existing=null; calls.save.length=0; await ensurePushOnLogin();
  ok('dropped subscription is silently re-created on login', calls.subscribe===1&&calls.save.some(c=>c.url.includes('push_subscriptions')));
  // deliberate disable is respected
  existing=null; calls.subscribe=0; calls.save.length=0; localStorage.setItem('vas_push_disabled_a','1');
  await ensurePushOnLogin();
  ok('a member who switched push OFF is not silently re-enabled', calls.subscribe===0&&calls.save.length===0);
  // permission not granted -> never prompts or subscribes on its own
  localStorage.clear(); window.Notification={permission:'default',requestPermission:async()=>{window.__prompted=true;return 'granted';}}; calls.subscribe=0;
  await ensurePushOnLogin();
  ok('never auto-prompts for permission when not yet granted', !window.__prompted&&calls.subscribe===0);

  // ---------- 6. Editable service-test areas (Settings) ----------
  window.sbQ=async()=>[]; // keep the demo-data reload quiet
  loadDemoData(); // earlier sections replaced DB.team with synthetic members
  APP_CFG.serviceTestAreas=[{name:'Billing check',desc:'Check {operator} charging is correct.'},{name:'Speed test',desc:''}];
  DB.operators=[{id:'op1',name:'Zain'}]; DB.tasks=[]; localStorage.clear();
  DB.testSchedules=[{id:'sch1',day_of_week:new Date().getDay(),member_id:'u2',operator_id:'op1',active:true,reviewer_id:'u3'}];
  CU={id:'u1',name:'Demo CEO',role:'CEO',color:'#4f46e5',av:'DC',access:'Admin',email:'x@example.com'};
  startReminderChecker();
  let t2=DB.tasks.find(x=>x.title&&x.title.startsWith('Service Test — Zain'));
  ok('custom areas appear in the task, in order, with {operator} filled in', !!t2&&t2.desc.includes('1. Billing check — Check Zain charging is correct.')&&t2.desc.includes('2. Speed test'), t2&&t2.desc);
  ok('areas not in the list are NOT in the task', !!t2&&!t2.desc.includes('Full cycle test')&&!t2.desc.includes('Content test'));
  ok('the old Settings "extra checks" block is gone', !!t2&&!t2.desc.includes('Extra checks from Settings'));
  APP_CFG.serviceTestAreas=[]; ok('empty/blank list falls back to the 6 defaults', getServiceTestAreas().length===6);
  APP_CFG.serviceTestAreas=[{name:'  ',desc:'x'}]; ok('blank-named rows are ignored', getServiceTestAreas().length===6);
  APP_CFG.serviceTestAreas=null;

  // Settings page shows both cards, with the current values
  APP_CFG.loginReminderDays=5;
  const setEl=document.createElement('div'); rSettings(setEl);
  ok('Settings shows the Service Test Areas card with all 6 defaults', setEl.innerHTML.includes('Service Test Areas')&&(setEl.innerHTML.match(/class="sta-row"/g)||[]).length===6);
  ok('Settings shows the Login Reminders card with the saved days (5)', setEl.innerHTML.includes('Login Reminders')&&/id="lrd-days"[^>]*value="5"/.test(setEl.innerHTML));
  document.body.appendChild(setEl);
  // edit through the real handlers
  staAdd(); const nm=document.querySelectorAll('#sta-list .sta-name'); nm[nm.length-1].value='Roaming test';
  ok('Add area adds a row', document.querySelectorAll('#sta-list .sta-row').length===7);
  staRemove(0); ok('Remove drops that row', document.querySelectorAll('#sta-list .sta-row').length===6&&document.querySelector('#sta-list .sta-name').value==='Content test');
  const saves=[]; window.fetch=async(url,opts)=>{saves.push({url:String(url),body:JSON.parse(opts.body)});return {ok:true,json:async()=>[{key:'x'}],text:async()=>''};};
  await saveTestAreas();
  const sv=saves.find(c=>c.url.includes('app_settings'));
  ok('Save upserts service_test_areas by key', !!sv&&sv.url.includes('on_conflict=key')&&sv.body.key==='service_test_areas'&&sv.body.value.length===6&&sv.body.value[5].name==='Roaming test', JSON.stringify(sv));
  ok('shared config is updated after save', APP_CFG.serviceTestAreas&&APP_CFG.serviceTestAreas.length===6);
  // failure (table missing) must not change anything
  const keep=JSON.stringify(APP_CFG.serviceTestAreas);
  window.fetch=async()=>({ok:false,status:404,json:async()=>({}),text:async()=>'relation does not exist'});
  document.querySelector('#sta-list .sta-name').value='Changed but unsaved'; await saveTestAreas();
  ok('failed save leaves the live setting untouched', JSON.stringify(APP_CFG.serviceTestAreas)===keep);
  // cannot save an empty list
  window.fetch=async(url,opts)=>{saves.push({url:String(url),body:JSON.parse(opts.body)});return {ok:true,json:async()=>[{}],text:async()=>''};};
  saves.length=0; document.querySelectorAll('#sta-list .sta-name').forEach(i=>i.value=''); await saveTestAreas();
  ok('saving with no areas is refused', saves.length===0);
  // members cannot save settings
  const cu2=CU; CU={id:'a',name:'Away On',access:'Member'}; saves.length=0; document.querySelector('#sta-list .sta-name').value='Hack'; await saveTestAreas(); await saveLoginReminderDays();
  ok('non-admins cannot save settings', saves.length===0); CU=cu2;

  // ---------- 7. Login-reminder days from Settings ----------
  saves.length=0;
  window.fetch=async(url,opts)=>{saves.push({url:String(url),body:JSON.parse(opts.body)});return {ok:true,json:async()=>[{}],text:async()=>''};};
  document.getElementById('lrd-days').value='0'; await saveLoginReminderDays();
  ok('0 days is rejected', saves.length===0);
  document.getElementById('lrd-days').value='100'; await saveLoginReminderDays();
  ok('100 days is rejected', saves.length===0);
  document.getElementById('lrd-days').value='7'; await saveLoginReminderDays();
  const dv=saves.find(c=>c.url.includes('app_settings'));
  ok('valid days are saved as login_reminder_days', !!dv&&dv.body.key==='login_reminder_days'&&dv.body.value===7, JSON.stringify(dv));
  ok('getLoginReminderDays now returns 7', getLoginReminderDays()===7);
  APP_CFG.loginReminderDays='junk'; ok('junk value falls back to 3', getLoginReminderDays()===3);

  // engine honours the setting: member away 5 days
  const ago2=(d)=>new Date(Date.now()-d*86400000).toISOString();
  const run=async(days)=>{
    APP_CFG.loginReminderDays=days;
    DB.team=[{id:'u1',name:'Demo CEO',access:'Admin',status:'Active',lastLogin:ago2(1),loginReminderActive:false,created_at:ago2(100)},
             {id:'a',name:'Away On',access:'Member',status:'Active',lastLogin:ago2(5),loginReminderActive:true,created_at:ago2(100)}];
    DB.loginReminders=[]; const got=[]; const ins=[];
    window.sendNotif=(to)=>{got.push(to);}; window.notifyTG=()=>{}; window.logAction=()=>{};
    window.sbQ=async(table,params)=>{ if(table==='team_public') return [{last_login:ago2(5),login_reminder_active:true}]; return []; };
    window.sbInsertSilent=async(tb,row)=>{const r={id:'z',sent_at:new Date().toISOString(),...row};ins.push(r);return r;};
    startLoginReminderCheck(); await sleep(80); return got;
  };
  ok('with the setting at 7 days, someone away 5 days is NOT reminded', (await run(7)).length===0);
  ok('with the setting at 2 days, the same person IS reminded', (await run(2)).join()==='Away On');
  ok('with the setting at 5 days, exactly 5 days away IS reminded', (await run(5)).join()==='Away On');
  window.fetch=()=>Promise.reject(new Error('network disabled'));
  // member panel text follows the setting
  APP_CFG.loginReminderDays=4; openMemberDetail('a');
  ok('member details text shows the configured days (4)', document.getElementById('sp-bd').innerHTML.includes('<b>4 days</b>'));

  // ---------- 8. Server-side automatic task reminders ----------
  document.querySelectorAll('#sta-list').forEach(e=>e.closest('div[class]')&&0); try{setEl.remove();}catch(e){}
  loadDemoData();
  CU={id:'u2',name:'Demo Member',role:'Dev',color:'#4f46e5',av:'DM',access:'Member',autoRemindersActive:true};
  DB.tasks=[{id:'tt1',title:'Unopened',status:'New',tsOpened:null,assignedTo:'u2',assignees:['u2'],due:null}];
  const tabSends=[]; window.sendNotif=(to,text)=>{tabSends.push(text);}; window.notifyTG=()=>{}; localStorage.clear();
  AUTO_REM_CFG={enabled:true,interval_hours:4,server_side:false,start_hour:8,end_hour:20};
  startAutoTaskReminders();
  ok('before the server migration, an open tab still sends the reminder (old behaviour kept)', tabSends.length===1&&tabSends[0].includes('1 new task'), JSON.stringify(tabSends));
  tabSends.length=0; localStorage.clear();
  AUTO_REM_CFG={enabled:true,interval_hours:4,server_side:true,start_hour:8,end_hour:20};
  startAutoTaskReminders();
  ok('once the server job is active, open tabs send NOTHING (no duplicates)', tabSends.length===0, JSON.stringify(tabSends));

  CU={id:'u1',name:'Demo CEO',role:'CEO',color:'#4f46e5',av:'DC',access:'Admin',email:'x@example.com'};
  AUTO_REM_CFG={enabled:true,interval_hours:4,server_side:false,start_hour:8,end_hour:20};
  let sEl=document.createElement('div'); rSettings(sEl);
  ok('Settings warns the server job is not set up yet, and hides the hours', sEl.innerHTML.includes('Server-side reminders are not set up yet')&&!sEl.innerHTML.includes('id="autorem-start"'));
  AUTO_REM_CFG={enabled:true,interval_hours:6,server_side:true,start_hour:9,end_hour:18};
  sEl=document.createElement('div'); rSettings(sEl);
  ok('Settings says it runs on the server and shows the allowed hours (09:00-18:00)', sEl.innerHTML.includes('works even when the app is closed')&&/<option value="9" selected(="")?>09:00/.test(sEl.innerHTML)&&/<option value="18" selected(="")?>18:00/.test(sEl.innerHTML), (sEl.innerHTML.match(/id="autorem-start"[\s\S]{0,200}/)||[''])[0]);
  ok('the "not set up" warning is gone once server-side is active', !sEl.innerHTML.includes('Server-side reminders are not set up yet'));
  document.body.appendChild(sEl);
  let upd=null; window.sbUpdate=async(tbl,id,patch)=>{upd={tbl,id,patch};return {ok:1};};
  document.getElementById('autorem-start').value='7'; document.getElementById('autorem-end').value='21';
  await saveAutoRemSettings();
  ok('saving sends start/end hours with enabled/interval', upd&&upd.tbl==='auto_reminder_settings'&&upd.patch.start_hour===7&&upd.patch.end_hour===21&&upd.patch.interval_hours===6, JSON.stringify(upd));
  ok('live config updated after save', AUTO_REM_CFG.start_hour===7&&AUTO_REM_CFG.end_hour===21&&AUTO_REM_CFG.server_side===true);
  upd=null; document.getElementById('autorem-start').value='20'; document.getElementById('autorem-end').value='8';
  await saveAutoRemSettings();
  ok('an end hour not after the start hour is refused', upd===null);
  AUTO_REM_CFG={enabled:true,interval_hours:4,server_side:false,start_hour:8,end_hour:20};
  sEl.remove(); sEl=document.createElement('div'); rSettings(sEl); document.body.appendChild(sEl);
  upd=null; await saveAutoRemSettings();
  ok('without the migration, saving only sends the old columns (no failing hour columns)', upd&&upd.patch.start_hour===undefined&&upd.patch.end_hour===undefined&&upd.patch.interval_hours===4, JSON.stringify(upd));
}catch(e){ window.__R.push({name:'TEST CRASH',pass:false,extra:e.stack}); }
window.__done=true; })();
`;
load(TESTS);
(async()=>{
  for(let i=0;i<200&&!window.__done;i++) await new Promise(r=>setTimeout(r,50));
  let fail=0;
  for(const r of window.__R){ console.log((r.pass?'PASS ':'FAIL ')+r.name+(r.pass?'':'\n     -> '+r.extra)); if(!r.pass) fail++; }
  console.log(`\n${window.__R.length-fail}/${window.__R.length} passed`);
  process.exit(fail?1:0);
})();
