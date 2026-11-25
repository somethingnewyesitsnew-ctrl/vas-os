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

  // ---------- 9. VAPID key rotation ----------
  const NEWKEY=urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
  const OLDKEY=urlBase64ToUint8Array('BPE_NOrkd8udHrEJPpzznZXZNdBqR9YJ_EaHlKKPLjDqBAyw9O8JUNw92Dky-Hob0BUiyynpCdWOtgIW46z3Rnw');
  ok('client now uses a NEW public key (not the exposed one)', VAPID_PUBLIC_KEY!=='BPE_NOrkd8udHrEJPpzznZXZNdBqR9YJ_EaHlKKPLjDqBAyw9O8JUNw92Dky-Hob0BUiyynpCdWOtgIW46z3Rnw'&&NEWKEY.length===65&&NEWKEY[0]===4);
  const rot={unsub:0,subscribed:0,saved:0};
  const mkSub=(key,ep)=>({endpoint:ep,options:{applicationServerKey:key?key.buffer.slice(key.byteOffset,key.byteOffset+key.byteLength):null},toJSON(){return {endpoint:ep,keys:{p256dh:'p',auth:'a'}};},unsubscribe:async()=>{rot.unsub++;current=null;return true;}});
  let current=null;
  const regR={pushManager:{getSubscription:async()=>current,subscribe:async(o)=>{rot.subscribed++;const got=new Uint8Array(o.applicationServerKey);current=mkSub(got,'https://push.example/new');return current;}}};
  Object.defineProperty(window.navigator,'serviceWorker',{configurable:true,value:{register:async()=>regR,ready:Promise.resolve(regR),getRegistration:async()=>regR,addEventListener(){}}});
  _swReg=regR; // the app caches its registration; point it at this test's fake
  window.Notification={permission:'granted',requestPermission:async()=>'granted'};
  window.fetch=async(url,opts)=>{ if(String(url).includes('push_subscriptions')) rot.saved++; return {ok:true,json:async()=>[{id:'x'}],text:async()=>''}; };
  CU={id:'a',name:'Away On',access:'Member'}; localStorage.clear();
  // device still holding a subscription made with the OLD key
  current=mkSub(OLDKEY,'https://push.example/old');
  ok('an old-key subscription is NOT reported as working', (await isPushSubscribedHere())===false);
  await ensurePushOnLogin();
  ok('login drops the old-key subscription and creates a new one silently', rot.unsub===1&&rot.subscribed===1&&rot.saved===1, JSON.stringify(rot));
  ok('the replacement is bound to the NEW key', current&&current.endpoint==='https://push.example/new'&&(await isPushSubscribedHere())===true);
  // already on the new key -> left alone
  rot.unsub=rot.subscribed=rot.saved=0; current=mkSub(NEWKEY,'https://push.example/keep');
  await ensurePushOnLogin();
  ok('a subscription already on the new key is kept (no churn)', rot.unsub===0&&rot.subscribed===0&&rot.saved===1, JSON.stringify(rot));
  // browser that does not expose the key -> kept
  rot.unsub=rot.subscribed=rot.saved=0; current=mkSub(null,'https://push.example/nokey');
  await ensurePushOnLogin();
  ok('if the browser does not expose the key, the subscription is kept', rot.unsub===0&&rot.subscribed===0);
  // manual Enable path also replaces stale subscriptions
  rot.unsub=rot.subscribed=rot.saved=0; current=mkSub(OLDKEY,'https://push.example/old2'); localStorage.clear();
  const okEnable=await subscribeToPush();
  ok('clicking Enable also replaces an old-key subscription', okEnable===true&&rot.unsub===1&&rot.subscribed===1, JSON.stringify(rot));
  window.fetch=()=>Promise.reject(new Error('network disabled'));

  // ---------- 10. Workload warning ----------
  loadDemoData();
  CU={id:'u1',name:'Demo CEO',role:'CEO',color:'#4f46e5',av:'DC',access:'Admin',email:'x@example.com'};
  const tdy=localDateStr(new Date()), past=localDateStr(new Date(Date.now()-3*86400000)), fut=localDateStr(new Date(Date.now()+9*86400000));
  const mkT=(i,o)=>({id:'w'+i,title:'W'+i,status:'In Progress',assignedTo:'u2',assignees:['u2'],due:fut,...o});
  APP_CFG.workload={open:8,overdue:3};
  DB.tasks=[
    ...[1,2,3,4,5,6,7].map(i=>mkT(i,{})),                         // 7 open for u2
    mkT(8,{status:'Done'}), mkT(9,{status:'Cancelled'}),          // not counted
    mkT(10,{assignedTo:'u3',assignees:['u3','u2']}),              // co-assignee counts for u2 -> 8 open
    mkT(11,{due:past}),                                           // overdue for u2 -> 9 open, 1 overdue
    mkT(12,{assignedTo:'u4',assignees:['u4'],due:past}),          // u4: 1 open, 1 overdue
  ];
  let w=memberWorkload('u2');
  ok('workload counts open tasks incl. co-assigned, ignoring Done/Cancelled', w.open===9&&w.overdue===1, JSON.stringify(w));
  ok('workload can exclude the task being edited', memberWorkload('u2','w11').open===8&&memberWorkload('u2','w11').overdue===0);
  ok('level: 9 open with limit 8 is HIGH', workloadLevel(w)==='high');
  ok('level: 1 open + 1 overdue is BUSY', workloadLevel(memberWorkload('u4'))==='busy');
  ok('level: nothing assigned is OK', workloadLevel(memberWorkload('u5'))==='ok');
  ok('level: overdue limit alone triggers HIGH', workloadLevel({open:2,overdue:3})==='high');
  APP_CFG.workload={open:20,overdue:10}; ok('limits come from Settings (raised -> same person is no longer HIGH)', workloadLevel(w)!=='high'); APP_CFG.workload={open:8,overdue:3};

  openTaskModal(null);
  _selectedAssignees=['u2','u5']; renderAssignTags();
  let hint=document.getElementById('tf-load-hint');
  ok('assign form shows each picked person\\'s load', !!hint&&hint.textContent.includes(': 9 open · 1 overdue')&&hint.textContent.includes(': 0 open · 0 overdue'), hint&&hint.textContent);
  ok('overloaded person is flagged with a warning mark', hint.textContent.includes('⚠️'));
  _selectedAssignees=[]; renderAssignTags(); ok('hint clears when nobody is picked', document.getElementById('tf-load-hint').textContent==='');

  // saveTask asks before overloading
  let asked=[]; window.confirm=(m)=>{asked.push(m);return false;};
  openTaskModal(null); document.getElementById('tf-title').value='New thing'; _selectedAssignees=['u2']; renderAssignTags();
  const nBefore=DB.tasks.length; await saveTask();
  ok('assigning to an overloaded person asks first', asked.length===1&&asked[0].includes('already has 9 open tasks (1 overdue)')&&asked[0].includes('Assign anyway?'), asked[0]);
  ok('cancelling the question creates nothing', DB.tasks.length===nBefore);
  asked=[]; _selectedAssignees=['u5']; renderAssignTags(); await saveTask();
  ok('a lightly loaded person is not questioned', asked.length===0);
  // editing: people already on the task are not re-asked
  asked=[]; window.confirm=(m)=>{asked.push(m);return true;};
  openTaskModal('w1'); document.getElementById('tf-title').value='W1 edited';
  _selectedAssignees=['u2']; renderAssignTags(); await saveTask();
  ok('editing a task does not re-ask about the person already on it', asked.length===0, asked[0]);
  asked=[]; openTaskModal('w1'); document.getElementById('tf-title').value='W1 again'; _selectedAssignees=['u2','u3']; await saveTask();
  ok('...but a newly added overloaded co-assignee is asked about only if over the limit', asked.length===0 || !asked[0].includes('Demo Member'));

  // ---------- 11. Automatic Digests settings ----------
  CU={id:'u1',name:'Demo CEO',role:'CEO',color:'#4f46e5',av:'DC',access:'Admin',email:'x@example.com'};
  window.sbQ=async(table)=>{ if(table==='digest_log') return [
      {kind:'morning_brief',recipient_name:'Aymoon',message:'M1',sent_at:new Date().toISOString()},
      {kind:'escalation_overdue',recipient_name:null,message:'ESC batch',sent_at:'2026-11-19T08:07:11Z'},
      {kind:'escalation_overdue',recipient_name:null,message:'ESC batch',sent_at:'2026-11-19T08:07:11Z'},
      {kind:'escalation_overdue',recipient_name:null,message:'ESC batch',sent_at:'2026-11-19T08:07:12Z'}];
    return []; };
  const dEl=document.createElement('div'); rSettings(dEl); document.body.appendChild(dEl);
  ok('Settings has the Automatic Digests card with all three digests + workload', ['☀️ Morning brief','🚨 Escalation','📊 Weekly report','Workload warning'].every(x=>dEl.innerHTML.includes(x)));
  ok('all digests start OFF', !document.getElementById('dg-mb-on').checked&&!document.getElementById('dg-es-on').checked&&!document.getElementById('dg-wr-on').checked);
  await sleep(30);
  ok('recently-sent list shows batches once (3 identical escalation rows -> 1)', (document.getElementById('dig-log').innerHTML.match(/ESC batch/g)||[]).length===1&&document.getElementById('dig-log').innerHTML.includes('M1'), document.getElementById('dig-log').innerHTML.slice(0,300));
  const puts=[]; window.fetch=async(url,opts)=>{ if(String(url).includes('app_settings')) puts.push(JSON.parse(opts.body)); return {ok:true,json:async()=>[{key:'x'}],text:async()=>''}; };
  document.getElementById('dg-mb-on').checked=true; document.getElementById('dg-mb-hour').value='7';
  document.getElementById('dg-es-on').checked=true; document.getElementById('dg-es-od').value='3'; document.getElementById('dg-es-rh').value='12'; document.getElementById('dg-es-rep').value='2';
  document.getElementById('dg-wr-on').checked=true; document.getElementById('dg-wr-day').value='7'; document.getElementById('dg-wr-hour').value='9';
  document.getElementById('dg-wl-open').value='6'; document.getElementById('dg-wl-over').value='2';
  await saveDigestSettings();
  const by=Object.fromEntries(puts.map(x=>[x.key,x.value]));
  ok('Save writes four app_settings keys', Object.keys(by).sort().join()==='escalation,morning_brief,weekly_report,workload_warning', Object.keys(by).join());
  ok('morning brief saved (on, 07:00)', by.morning_brief&&by.morning_brief.enabled===true&&by.morning_brief.hour===7);
  ok('escalation saved (3 days, 12 h, repeat 2)', by.escalation&&by.escalation.enabled&&by.escalation.overdue_days===3&&by.escalation.review_hours===12&&by.escalation.repeat_days===2, JSON.stringify(by.escalation));
  ok('weekly report saved (Sunday = 7, 09:00)', by.weekly_report&&by.weekly_report.day===7&&by.weekly_report.hour===9&&by.weekly_report.enabled===true);
  ok('workload limits saved and live', by.workload_warning&&by.workload_warning.open===6&&APP_CFG.workload.open===6&&APP_CFG.workload.overdue===2);
  ok('live config updated after save', APP_CFG.morningBrief.enabled===true&&APP_CFG.escalation.overdue_days===3&&APP_CFG.weeklyReport.day===7);
  // validation
  puts.length=0; document.getElementById('dg-mb-hour').value='99'; await saveDigestSettings();
  ok('an impossible hour is rejected without saving', puts.length===0);
  document.getElementById('dg-mb-hour').value='7'; document.getElementById('dg-es-od').value='0'; await saveDigestSettings();
  ok('0 overdue days is rejected', puts.length===0);
  document.getElementById('dg-es-od').value='3';
  // failure leaves live config alone
  const keepCfg=JSON.stringify(APP_CFG.escalation); document.getElementById('dg-es-od').value='9';
  window.fetch=async()=>({ok:false,status:404,json:async()=>({}),text:async()=>'no table'});
  await saveDigestSettings(); ok('a failed save leaves the live settings untouched', JSON.stringify(APP_CFG.escalation)===keepCfg);
  // members cannot save
  puts.length=0; window.fetch=async(url,opts)=>{puts.push(1);return {ok:true,json:async()=>[{}],text:async()=>''};}; const savedAdmin=CU; CU={id:'a',name:'X',access:'Member'}; await saveDigestSettings(); ok('members cannot save digest settings', puts.length===0); CU=savedAdmin;
  // preview
  window.sbRpc=async(fn,a)=>{ window.__pv={fn,a}; return [{recipient:'Aymoon',message:'☀️ Morning brief: 🚨 3 overdue <b>x</b>'}]; };
  await previewDigest('morning_brief');
  ok('Preview calls digest_preview and shows the text (HTML-escaped)', window.__pv.fn==='digest_preview'&&window.__pv.a.p_kind==='morning_brief'&&document.getElementById('dig-preview').innerHTML.includes('3 overdue &lt;b&gt;x&lt;/b&gt;')&&document.getElementById('dig-preview').innerHTML.includes('nothing was sent'));
  window.sbRpc=async()=>[]; await previewDigest('escalation'); ok('empty preview says nothing to send', document.getElementById('dig-preview').textContent.includes('Nothing to send'));
  window.sbRpc=async()=>null; await previewDigest('weekly_report'); ok('preview without the migration explains what to run', document.getElementById('dig-preview').textContent.includes('SUPABASE_MIGRATION_server_digests.sql'));
  // loading saved config
  window.sbQ=async(t)=>t==='app_settings'?[{key:'morning_brief',value:{enabled:true,hour:6}},{key:'workload_warning',value:{open:12}},{key:'escalation',value:'junk'}]:[];
  APP_CFG.morningBrief={enabled:false,hour:8}; APP_CFG.workload={open:8,overdue:3}; APP_CFG.escalation={enabled:false,overdue_days:2,review_hours:24,repeat_days:3};
  await loadAppSettings();
  ok('loadAppSettings merges saved digest/workload settings over defaults', APP_CFG.morningBrief.hour===6&&APP_CFG.morningBrief.enabled===true&&APP_CFG.workload.open===12&&APP_CFG.workload.overdue===3);
  ok('a malformed saved value is ignored', APP_CFG.escalation.overdue_days===2);
  window.fetch=()=>Promise.reject(new Error('network disabled'));

  // ---------- 12. Who Gets What ----------
  const mkM=(id,name,access,role,status)=>({id,name,access,role:role||'Dev',status:status||'Active',color:'#4f46e5',av:name.slice(0,2).toUpperCase(),email:''});
  DB.team=[mkM('a1','Aymoon','Admin','Owner'),mkM('a2','Sara','Admin'),mkM('m1','Ann','Member'),mkM('m2','Bob','Member','Project Manager'),mkM('x1','Gone','Admin','Dev','Inactive'),mkM('f1','Aziz','Admin')];
  const asUser=(id)=>{ const m=DB.team.find(x=>x.id===id); CU={...m}; };
  window.sbQ=async()=>[]; window.nav=(p)=>{window.__nav=p;}; window.logAction=()=>{};
  // -- legacy: not customised -> exactly the old behaviour
  APP_CFG.recipientAccess=null;
  asUser('a2'); ok('legacy: an admin receives admin alerts, sees login history, opens Settings', canReceiveAdminAlerts()&&canSeeLoginLog()&&canOpenSettings());
  asUser('m1'); ok('legacy: a plain member gets/sees none of it', !canReceiveAdminAlerts()&&!canSeeLoginLog()&&!canOpenSettings());
  // -- customised
  APP_CFG.recipientAccess={people:{a1:{alerts:true,loginlog:true,settings:true,brief:true},m1:{alerts:true,requests:true}}};
  asUser('a1'); ok('configured: ticked admin gets alerts / login history / Settings', canReceiveAdminAlerts()&&canSeeLoginLog()&&canOpenSettings());
  asUser('a2'); ok('configured: an admin who is NOT ticked gets and sees nothing', !canReceiveAdminAlerts()&&!canSeeLoginLog()&&!canOpenSettings());
  asUser('m1'); ok('configured: a non-admin can be given admin alerts', canReceiveAdminAlerts());
  ok('configured: ...but not the admin-only "see" items', !canSeeLoginLog()&&!canOpenSettings());
  asUser('f1'); ok('configured: a founder can never be locked out of Settings', canOpenSettings());
  // -- Settings page + nav
  asUser('a2'); let gate=document.createElement('div'); rSettings(gate);
  ok('an un-ticked admin sees "no access" instead of Settings', gate.innerHTML.includes("don't have access to Settings")&&!gate.innerHTML.includes('ct-t'), gate.innerHTML.slice(0,200));
  asUser('m1'); gate=document.createElement('div'); rSettings(gate); ok('a member still just sees "Admin only"', gate.innerHTML.includes('Admin only'));
  const navSt=document.getElementById('nav-st'); navSt.style.display='';
  asUser('a2'); applySettingsNavAccess(); ok('Settings menu item is hidden for an un-ticked admin', navSt.style.display==='none');
  asUser('a1'); applySettingsNavAccess(); ok('...and shown for a ticked one', navSt.style.display==='');
  // -- admin broadcast notifications (in-app)
  const bell=(uid)=>{ asUser(uid); notifs=[{id:'n1',to:'Nobody',from:'X',text:'ADMIN-BROADCAST',type:'Mention',task:'',adminsOnly:true,readBy:[],time:new Date().toISOString()}]; renderNotifs(); return document.getElementById('nd-list').innerHTML; };
  ok('ticked person sees the admin broadcast in their bell', bell('a1').includes('ADMIN-BROADCAST'));
  ok('un-ticked admin does NOT see it', !bell('a2').includes('ADMIN-BROADCAST'));
  ok('a ticked non-admin member DOES see it', bell('m1').includes('ADMIN-BROADCAST'));
  ok('another member does not', !bell('m2').includes('ADMIN-BROADCAST'));
  // -- admin push broadcast
  const pushed=[]; window.notifyTG=(id)=>{pushed.push(id);};
  asUser('m2'); notifyAdminsTG('something happened');   // a non-admin triggered it
  ok('push alerts go only to the ticked people (a1, m1), not every admin', pushed.sort().join()==='a1,m1', pushed.join());
  APP_CFG.recipientAccess=null; pushed.length=0; asUser('m1'); notifyAdminsTG('x');
  ok('legacy: push alerts still go to every admin-type member (incl. Project Manager role)', pushed.sort().join()==='a1,a2,f1,m2', pushed.join());
  // -- approval requests (e.g. Library)
  ok('legacy: library requests go to admin-type members', ['a1','a2','m2','f1'].every(id=>recipientFlagFor(DB.team.find(x=>x.id===id),'requests',isAdminMember))&&!recipientFlagFor(DB.team.find(x=>x.id==='m1'),'requests',isAdminMember));
  APP_CFG.recipientAccess={people:{m1:{requests:true}}};
  ok('configured: library requests go ONLY to the ticked person', DB.team.filter(m=>recipientFlagFor(m,'requests',isAdminMember)).map(m=>m.id).join()==='m1');
  // -- login history in member details
  APP_CFG.recipientAccess={people:{a1:{loginlog:true,settings:true}}};
  asUser('a2'); openMemberDetail('m1'); ok('member details hide login history from an un-ticked admin', !document.getElementById('sp-bd').innerHTML.includes('Login reminders'));
  asUser('a1'); openMemberDetail('m1'); ok('...and show it to a ticked admin', document.getElementById('sp-bd').innerHTML.includes('Login reminders'));

  // -- the card
  APP_CFG.recipientAccess=null; asUser('a1');
  const wEl=document.createElement('div'); rSettings(wEl); document.body.appendChild(wEl);
  ok('Settings has the Who Gets What card, flagged as not customised', wEl.innerHTML.includes('Who Gets What')&&wEl.innerHTML.includes('Not customised yet'));
  ok('only ACTIVE people are listed (5 rows, not the inactive one)', (wEl.innerHTML.match(/id="ra-[a-z0-9]+-brief"/g)||[]).length===5&&!document.getElementById('ra-x1-brief'));
  const ck=(id,k)=>document.getElementById('ra-'+id+'-'+k);
  ok('defaults mirror today: admins ticked for the digests', ck('a1','brief').checked&&ck('a2','weekly').checked&&!ck('m1','brief').checked);
  ok('defaults mirror today: alerts to admin-type members incl. Project Manager role? (alerts = admin rule only)', ck('a1','alerts').checked&&!ck('m2','alerts').checked&&ck('m2','requests').checked);
  ok('login history / Settings boxes are locked for non-admins', ck('m1','loginlog').disabled&&ck('m1','settings').disabled&&!ck('m1','settings').checked);
  ok('your own Settings box is ticked and locked', ck('a1','settings').checked&&ck('a1','settings').disabled);
  ok('founder Settings box is ticked and locked', ck('f1','settings').checked&&ck('f1','settings').disabled);
  // column all / none
  raColumn('weekly',false); ok('"none" clears a column', !ck('a1','weekly').checked&&!ck('a2','weekly').checked);
  raColumn('weekly',true); ok('"all" ticks every enabled box in a column', ck('m1','weekly').checked&&ck('a2','weekly').checked);
  raColumn('settings',true); ok('"all" never touches locked boxes', !ck('m1','settings').checked);
  raColumn('weekly',false);
  // save
  const saved=[]; window.fetch=async(url,opts)=>{ if(String(url).includes('app_settings')) saved.push(JSON.parse(opts.body)); return {ok:true,json:async()=>[{key:'x'}],text:async()=>''}; };
  let asked2=[]; window.confirm=(m)=>{asked2.push(m);return false;};
  await saveRecipientAccess();
  ok('saving with nobody ticked for the weekly report asks first', asked2.length===1&&asked2[0].includes('Weekly report'), asked2[0]);
  ok('cancelling that question saves nothing', saved.length===0&&APP_CFG.recipientAccess===null);
  window.confirm=()=>true; ck('a2','brief').checked=false; ck('m1','weekly').checked=true; ck('m1','alerts').checked=true;
  await saveRecipientAccess();
  const rv=saved.find(x=>x.key==='recipient_access'); const pp=rv&&rv.value.people;
  ok('save writes the recipient_access setting', !!rv&&!!pp, JSON.stringify(saved));
  ok('Aymoon ticks stored', pp&&pp.a1&&pp.a1.brief===true&&pp.a1.escalation===true&&pp.a1.settings===true, JSON.stringify(pp&&pp.a1));
  ok('un-ticked box is not stored (Sara no brief)', pp&&pp.a2&&!pp.a2.brief&&pp.a2.escalation===true);
  ok('a non-admin can be stored as a recipient (Ann weekly + alerts)', pp&&pp.m1&&pp.m1.weekly===true&&pp.m1.alerts===true&&!pp.m1.settings);
  ok('your own Settings access is always kept', pp&&pp.a1.settings===true);
  ok('the inactive person is not stored', pp&&!pp.x1);
  ok('live config switched to customised and the page was refreshed', APP_CFG.recipientAccess&&JSON.stringify(APP_CFG.recipientAccess.people)===JSON.stringify(pp)&&window.__nav==='settings');
  // failure leaves it alone
  const before2=JSON.stringify(APP_CFG.recipientAccess); window.fetch=async()=>({ok:false,status:404,json:async()=>({}),text:async()=>''});
  ck('a1','brief').checked=false; await saveRecipientAccess();
  ok('a failed save changes nothing', JSON.stringify(APP_CFG.recipientAccess)===before2);
  // only people allowed into Settings can save
  saved.length=0; window.fetch=async(url,opts)=>{saved.push(1);return {ok:true,json:async()=>[{}],text:async()=>''};}; asUser('a2'); APP_CFG.recipientAccess={people:{a1:{settings:true}}}; await saveRecipientAccess();
  ok('an admin without Settings access cannot save it', saved.length===0);
  // reviewer option in the digests card
  APP_CFG.recipientAccess=null; asUser('a1'); const dEl2=document.createElement('div'); rSettings(dEl2); document.body.appendChild(dEl2);
  ok('digests card has the reviewer option, ticked by default', document.getElementById('dg-es-rev')&&document.getElementById('dg-es-rev').checked);
  const puts2=[]; window.fetch=async(url,opts)=>{ if(String(url).includes('app_settings')) puts2.push(JSON.parse(opts.body)); return {ok:true,json:async()=>[{key:'x'}],text:async()=>''}; };
  document.getElementById('dg-es-rev').checked=false; await saveDigestSettings();
  ok('the reviewer option is saved in the escalation settings', (puts2.find(x=>x.key==='escalation')||{value:{}}).value.notify_reviewers===false, JSON.stringify(puts2.find(x=>x.key==='escalation')));
  window.fetch=()=>Promise.reject(new Error('network disabled'));
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
