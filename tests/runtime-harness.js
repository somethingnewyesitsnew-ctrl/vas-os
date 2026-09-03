/**
 * Runtime smoke test — actually executes the app's JS in a simulated
 * browser (jsdom), logs in as a demo admin, loads demo data, and
 * renders every major page. Catches real runtime errors (undefined
 * functions, undefined properties, typos in object keys) that a plain
 * `node -c` syntax check cannot, because syntax checking never actually
 * runs the code.
 *
 * No real network/Supabase access is used or needed — Supabase calls
 * are stubbed out, and the app's existing offline fallback
 * (loadDemoData) is used to populate realistic test data.
 *
 * Setup (one-time):
 *   npm install jsdom
 *
 * Usage:
 *   node tests/runtime-harness.js [path-to-repo-root]
 *   (path defaults to the current directory)
 *
 * Exits non-zero if any module fails to load or any page fails to
 * render, so it can be used as a CI gate as well as run ad hoc.
 */
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

const REPO = process.argv[2] || '.';
const ORDER = ["00-core-preamble","01-push-notifications","02-ui-utils-config","03-supabase-helpers",
"04-member-types-perms","05-data-load","06-task-db-writes","07-notify-log","08-auth-nav",
"09-syslog-persist","10-dashboard","11-tasks","12-todos-reminders","13-projects","14-team-eval",
"15-backlog","16-services-operators","17-library","18-docs-archive","19-meetings","20-service-tests",
"21-settings","23-hr-comms-announcements-reports","24-comments-page","25-tutorial","26-task-panel",
"27-modals-saves","28-badges-updates","29-init-mobile"];

let html = fs.readFileSync(path.join(REPO,'material.html'),'utf8');
html = html.replace(/<script[^>]*src="[^"]*"><\/script>/g, '');

const errors = [];
const dom = new JSDOM(html, {
  url: 'http://localhost/',
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  resources: undefined
});
const { window } = dom;

window.addEventListener('error', (e) => {
  errors.push({phase: global.__phase||'?', message: e.error ? (e.error.stack||e.error.message) : e.message});
});

// ── Stubs for browser/network APIs unavailable (and undesired) in a
// headless test — deliberately left absent rather than defined-as-
// undefined where the app code checks `'x' in navigator`, since that
// distinction matters (see harness history / commit notes).
window.fetch = () => Promise.reject(new Error('network disabled in test'));
window.Notification = { permission: 'default', requestPermission: async()=>'default' };

// Chainable fake Supabase client — every method returns itself, and
// it's thenable (resolves to {data:[],error:null}), so any
// `await sbClient.from(...).select(...)`-style chain resolves without
// throwing, regardless of which methods a given code path happens to
// call.
function makeFakeChain(){
  const handler = {
    get(target, prop){
      if(prop === 'then') return (resolve)=>resolve({data:[],error:null});
      if(prop === 'catch') return ()=>chain;
      return (...args)=>chain;
    }
  };
  const chain = new Proxy(function(){}, handler);
  return chain;
}
window.supabase = {
  createClient: () => ({
    from: () => makeFakeChain(),
    rpc: () => makeFakeChain(),
    channel: () => ({ on: function(){return this;}, subscribe: (cb)=>{ if(cb) cb('SUBSCRIBED'); return this; } }),
    removeChannel: () => {},
    auth: { signInWithPassword: async()=>({data:null,error:{message:'stub'}}), signOut: async()=>({}) }
  })
};

global.window = window;
global.document = window.document;
global.localStorage = window.localStorage;
global.navigator = window.navigator;

// ── Inject each module as an inline <script> in order — this matters:
// it replicates real browser <script src> semantics for top-level
// const/let sharing a single lexical scope across files, which Node's
// vm/Function-based eval does NOT replicate.
for(const mod of ORDER){
  const code = fs.readFileSync(path.join(REPO,'js',mod+'.js'),'utf8');
  global.__phase = 'load:'+mod;
  const scriptEl = window.document.createElement('script');
  scriptEl.textContent = code;
  try{ window.document.body.appendChild(scriptEl); }
  catch(e){ errors.push({phase:'load:'+mod, message: e.stack||e.message}); }
}
try{
  const overrides = fs.readFileSync(path.join(REPO,'js','material-overrides.js'),'utf8');
  global.__phase = 'load:material-overrides';
  const scriptEl = window.document.createElement('script');
  scriptEl.textContent = overrides;
  window.document.body.appendChild(scriptEl);
}catch(e){
  errors.push({phase:'load:material-overrides', message: e.stack||e.message});
}

console.log('=== MODULE LOAD ERRORS ===');
if(errors.length===0) console.log('None — all 29 modules + overrides loaded without throwing.');
else errors.forEach(e=>console.log(`[${e.phase}] ${e.message}`));

// ── Simulate a logged-in admin with demo data, then render every major
// page and catch anything that throws.
const renderErrors = [];
const pagesToTest = [
  ['dash','rDash'],['mytasks','rMyTasks'],['todos','rTodos'],['toreview','rToReview'],
  ['alltasks','rAllTasks'],['projects','rProjects'],['team','rTeam'],['eval','rEval'],
  ['backlog','rBacklog'],['services','rServices'],['operators','rOperators'],
  ['companies','rCompanies'],['docs','rDocs'],['archive','rArchive'],
  ['meetings','rMeetings'],['moutcomes','rMeetingOutcomes'],['svctest','rSvcTest'],
  ['settings','rSettings'],['helprequests','rHelpRequests'],['reminders','rReminders'],
  ['hrcoms','rHrComs'],['announcements','rAnnouncements'],['reports','rReports'],
  ['library','rLibrary'],['comments','rComments']
];

const setupScript = window.document.createElement('script');
setupScript.textContent = `
  try{
    CU={id:'u1',name:'Demo CEO',role:'CEO',color:'#4f46e5',av:'DC',access:'Admin',email:'demo.ceo@example.com'};
    loadDemoData();
    window.__setupOk = true;
  }catch(e){
    window.__setupOk = false;
    window.__setupErr = e.stack||e.message;
  }
`;
global.__phase = 'setup:login+demodata';
window.document.body.appendChild(setupScript);

if(!window.__setupOk){
  renderErrors.push({phase:'setup', message: window.__setupErr});
} else {
  if(!window.document.getElementById('content')){
    const c = window.document.createElement('div');
    c.id='content';
    window.document.body.appendChild(c);
  }
  for(const [pageId, fnName] of pagesToTest){
    const script = window.document.createElement('script');
    script.textContent = `
      try{
        const el=document.getElementById('content');
        if(typeof ${fnName}==='function'){ ${fnName}(el); window.__lastOk = true; }
        else { window.__lastOk = 'MISSING_FN'; }
      }catch(e){
        window.__lastOk = false;
        window.__lastErr = e.stack||e.message;
      }
    `;
    global.__phase = 'render:'+pageId;
    window.document.body.appendChild(script);
    if(window.__lastOk === 'MISSING_FN'){
      renderErrors.push({phase:'render:'+pageId, message:`function ${fnName} is not defined`});
    } else if(window.__lastOk === false){
      renderErrors.push({phase:'render:'+pageId, message: window.__lastErr});
    }
  }
}

console.log('\n=== RENDER-TIME ERRORS (' + pagesToTest.length + ' pages tested) ===');
if(renderErrors.length===0) console.log('None — every page rendered successfully against demo data.');
else renderErrors.forEach(e=>console.log(`[${e.phase}] ${e.message}\n`));

const exitCode = (errors.length + renderErrors.length) > 0 ? 1 : 0;
process.exit(exitCode);
