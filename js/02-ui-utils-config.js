// §02 ── UTILITIES ──────────────────────────────────────────────────────
function toast(msg,type='inf',dur=3500){const s=document.getElementById('ts-stk');const t=document.createElement('div');t.className=`ts ${type}`;t.textContent=msg;s.appendChild(t);setTimeout(()=>{t.style.opacity='0';t.style.transform='translateX(14px)';t.style.transition='all .3s';setTimeout(()=>t.remove(),300)},dur)}
function OM(id){document.getElementById(id).classList.add('open')}
function CM(id){document.getElementById(id).classList.remove('open')}
function closeSP(){document.getElementById('sp-pnl').classList.remove('open')}

function shareTaskCopy(){
  const s=window._share;
  if(!s?.link){toast('No task selected','bad');return;}
  // Build human-readable task summary
  const lines=[
    '📋 Task: '+s.title,
    '━━━━━━━━━━━━━━━━━━━━',
    'Status   : '+s.status,
    'Priority : '+s.priority,
    'Type     : '+(s.type||'—'),
    'Due      : '+(s.due||'Not set'),
    'Assigned : '+(s.assignee||'—'),
    s.service?'Service  : '+s.service:'',
    s.desc?'\n'+s.desc.slice(0,300)+(s.desc.length>300?'…':''):'',
    '',
    '🔗 Open task:',
    s.link
  ].filter(l=>l!==null&&l!==undefined).join('\n').replace(/\n{3,}/g,'\n\n').trim();

  if(navigator.clipboard&&navigator.clipboard.writeText){
    navigator.clipboard.writeText(lines).then(()=>toast('Task details + link copied ✓','ok')).catch(()=>{
      const el=document.createElement('textarea');el.value=lines;document.body.appendChild(el);el.select();document.execCommand('copy');el.remove();toast('Task details + link copied ✓','ok');
    });
  } else {
    const el=document.createElement('textarea');el.value=lines;document.body.appendChild(el);el.select();document.execCommand('copy');el.remove();toast('Task details + link copied ✓','ok');
  }
}
function openSP(title,pills,body){
  document.getElementById('sp-ttl').textContent=title;
  document.getElementById('sp-pills').innerHTML=pills||'';
  document.getElementById('sp-bd').innerHTML=body;
  document.getElementById('sp-pnl').classList.add('open');
}
function showSaving(v){document.getElementById('tb-sav').classList.toggle('on',v)}

// ══════════════════════════════════════════════════════
// SUPABASE CONFIG
// ══════════════════════════════════════════════════════
const SB_URL = 'https://duglbebwhtuijnduwmvz.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1Z2xiZWJ3aHR1aWpuZHV3bXZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5MzQ1NjgsImV4cCI6MjA5MTUxMDU2OH0.0VFefKrp6Zzp9FbvJybzTwxQfK1nCRa8N_ncJrd9xws';
const SB_HEADERS = {'apikey': SB_KEY, 'Authorization': 'Bearer '+SB_KEY, 'Content-Type': 'application/json', 'Prefer': 'return=representation'};

// Realtime client — separate from the raw REST helpers below (sbQ/sbInsert/
// etc.), which stay as-is. Only used for live subscriptions (see
// startRealtimeNotifs in 07-notify-log.js); every normal read/write still
// goes through the REST helpers unchanged. Guarded because it depends on
// the @supabase/supabase-js CDN script tag loading before this file — if
// that ever fails (offline CDN, ad blocker, etc.) the rest of the app must
// keep working exactly as it did before Realtime existed, just without live push.
const sbClient = (typeof window.supabase !== 'undefined' && window.supabase.createClient)
  ? window.supabase.createClient(SB_URL, SB_KEY)
  : null;
if(!sbClient) console.warn('Supabase Realtime client unavailable — live updates disabled, REST calls unaffected.');

// Supabase REST helpers
