// §25 ── TUTORIAL ────────────────────────────────────────────────────────
function getTutorialSteps(){
  return TUTORIAL_STEPS_ALL.filter(s=>{
    if(!s.perm) return true;
    if(s.perm==='_admin') return isAdmin();
    return canDo(s.perm)||isAdmin();
  });
}

let _tutStep=0;
let _tutFiltered=[];
window.startTutorial=()=>{ _tutStep=0; _tutFiltered=getTutorialSteps(); localStorage.removeItem('vas_tut_done_'+(CU?.id||'guest')); showTutStep(); };
window.tutNext=()=>{ _tutStep++; showTutStep(); };
window.tutPrev=()=>{ if(_tutStep>0){_tutStep--;showTutStep();} };
window.skipTutorial=window.endTutorial=()=>{
  document.getElementById('tut-overlay')?.remove();
  document.querySelectorAll('.tut-hl').forEach(e=>e.classList.remove('tut-hl'));
  localStorage.setItem('vas_tut_done_'+(CU?.id||'guest'),'1');
  // First-login flow: tutorial → push prompt → mobile setup guide (each
  // waits for the previous overlay to clear so they never stack).
  // No-ops if already granted/denied/dismissed — see maybeShowPushPrompt
  // and maybeShowMobileGuide.
  if(typeof maybeShowPushPrompt==='function') setTimeout(maybeShowPushPrompt,500);
  if(typeof maybeShowMobileGuide==='function') setTimeout(maybeShowMobileGuide,5000);
};

function showTutStep(){
  document.getElementById('tut-overlay')?.remove();
  document.querySelectorAll('.tut-hl').forEach(e=>e.classList.remove('tut-hl'));
  if(!_tutFiltered.length) _tutFiltered=getTutorialSteps();
  if(_tutStep>=_tutFiltered.length){endTutorial();return;}
  const step=_tutFiltered[_tutStep],total=_tutFiltered.length;
  if(step.action)try{step.action();}catch(e){}
  let targetEl=step.target?document.querySelector(step.target):null;
  if(targetEl)targetEl.classList.add('tut-hl');
  const ov=document.createElement('div');ov.id='tut-overlay';
  ov.innerHTML=`<div onclick="skipTutorial()" style="position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:3000"></div>`;
  const box=document.createElement('div');
  const pct=Math.round((_tutStep+1)/total*100);
  box.style.cssText='position:fixed;z-index:3001;background:var(--s);border-radius:14px;padding:22px 24px;width:320px;max-width:90vw;box-shadow:0 20px 60px rgba(0,0,0,.4),0 0 0 1px var(--bd)';
  box.innerHTML=`<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
    <span style="font-size:10px;font-weight:800;color:var(--ac);text-transform:uppercase;letter-spacing:.07em">${_tutStep+1} / ${total}</span>
    <button onclick="skipTutorial()" style="background:none;border:none;font-size:16px;color:var(--tx3);cursor:pointer;padding:0;line-height:1">✕</button>
  </div>
  <div style="height:3px;background:var(--bd);border-radius:2px;margin-bottom:14px;overflow:hidden"><div style="height:100%;width:${pct}%;background:linear-gradient(90deg,#7c3aed,#2563eb);border-radius:2px;transition:width .3s"></div></div>
  <div style="font-size:16px;font-weight:800;color:var(--tx);margin-bottom:9px;line-height:1.3">${esc(step.title)}</div>
  <div style="font-size:13px;color:var(--tx2);line-height:1.7;margin-bottom:18px">${step.body}</div>
  <div style="display:flex;align-items:center;gap:7px">
    ${_tutStep>0?`<button onclick="tutPrev()" style="padding:8px 14px;background:var(--s2);border:1px solid var(--bd);border-radius:9px;font-size:12px;font-weight:700;cursor:pointer;color:var(--tx)">← Back</button>`:''}
    <button onclick="tutNext()" style="flex:1;padding:9px 14px;background:linear-gradient(135deg,#7c3aed,#2563eb);color:#fff;border:none;border-radius:9px;font-size:13px;font-weight:800;cursor:pointer">${_tutStep===total-1?'🎉 Finish':'Next →'}</button>
    <button onclick="skipTutorial()" style="padding:8px 11px;background:var(--s2);border:1px solid var(--bd);border-radius:9px;font-size:11px;font-weight:600;cursor:pointer;color:var(--tx3)">Skip</button>
  </div>`;
  ov.appendChild(box);document.body.appendChild(ov);
  // Position
  if(!targetEl||step.position==='center'){box.style.top='50%';box.style.left='50%';box.style.transform='translate(-50%,-50%)';}
  else{
    const r=targetEl.getBoundingClientRect(),bw=320,pad=14;
    const vw=window.innerWidth,vh=window.innerHeight;
    let top=r.top+r.height/2-120,left=r.right+pad;
    if(step.position==='bottom'){top=r.bottom+pad;left=r.left+r.width/2-bw/2;}
    if(left+bw>vw-pad)left=Math.max(pad,r.left-bw-pad);
    top=Math.max(pad,Math.min(top,vh-280-pad));left=Math.max(pad,Math.min(left,vw-bw-pad));
    box.style.top=top+'px';box.style.left=left+'px';box.style.transform='none';
    // Scroll target into view
    targetEl.scrollIntoView({behavior:'smooth',block:'nearest'});
  }
}

function checkFirstTimeTutorial(){if(!localStorage.getItem('vas_tut_done_'+(CU?.id||'guest')))setTimeout(()=>{if(!document.getElementById('tut-overlay')){_tutFiltered=getTutorialSteps();_tutStep=0;showTutStep();}},2000);}

// ── Mobile setup / notifications guide — shown once per member, same
// pattern as the tutorial (localStorage flag, keyed by member id). Fires
// after the tutorial+push-prompt sequence for new members (see
// skipTutorial above) and after the push prompt for returning members
// (see registerPushSW in 08-auth-nav.js). Both call sites are mutually
// exclusive per login, so this never double-shows.
function maybeShowMobileGuide(){
  if(document.getElementById('mobile-guide-overlay')) return;
  if(localStorage.getItem('vas_mobile_guide_seen_'+(CU?.id||'guest'))) return;
  const ov=document.createElement('div');
  ov.id='mobile-guide-overlay';
  ov.innerHTML=`<div onclick="dismissMobileGuide()" style="position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:4000"></div>`;
  const box=document.createElement('div');
  box.style.cssText='position:fixed;z-index:4001;top:50%;left:50%;transform:translate(-50%,-50%);background:var(--s);border-radius:14px;padding:22px 24px;width:380px;max-width:92vw;max-height:85vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.4),0 0 0 1px var(--bd)';
  box.innerHTML=`
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
      <div style="font-size:16px;font-weight:800;color:var(--tx)">📱 Get the Most Out of Digital Plus</div>
      <button onclick="dismissMobileGuide()" style="background:none;border:none;font-size:16px;color:var(--tx3);cursor:pointer;padding:0;line-height:1">✕</button>
    </div>
    <div style="font-size:12.5px;color:var(--tx2);line-height:1.7">
      <div style="font-weight:800;color:var(--tx);margin-bottom:4px">🍎 iPhone (Safari)</div>
      <ol style="margin:0 0 14px 18px;padding:0">
        <li>Tap the Share icon in Safari</li>
        <li>Scroll down → <b>Add to Home Screen</b></li>
        <li>Open the app from that new icon (not from Safari) — required for notifications to work on iPhone</li>
        <li>Log in, then tap <b>Enable Notifications</b> on the Dashboard</li>
      </ol>
      <div style="font-weight:800;color:var(--tx);margin-bottom:4px">🤖 Android (Chrome)</div>
      <ol style="margin:0 0 14px 18px;padding:0">
        <li>Tap the ⋮ menu → <b>Add to Home screen</b> / <b>Install app</b></li>
        <li>Open the app from the new icon</li>
        <li>Log in, then tap <b>Enable Notifications</b></li>
      </ol>
      <div style="font-weight:800;color:var(--tx);margin-bottom:4px">💻 Desktop</div>
      <ol style="margin:0 0 4px 18px;padding:0">
        <li>Tap <b>Enable Notifications</b> at the top of the Dashboard and allow when your browser asks</li>
      </ol>
    </div>
    <button onclick="dismissMobileGuide()" style="width:100%;margin-top:16px;padding:10px 14px;background:linear-gradient(135deg,#7c3aed,#2563eb);color:#fff;border:none;border-radius:9px;font-size:13px;font-weight:800;cursor:pointer">Got it</button>`;
  ov.appendChild(box);document.body.appendChild(ov);
}
window.maybeShowMobileGuide=maybeShowMobileGuide;
window.dismissMobileGuide=()=>{
  document.getElementById('mobile-guide-overlay')?.remove();
  localStorage.setItem('vas_mobile_guide_seen_'+(CU?.id||'guest'),'1');
};

// ══════════════════════════════════════════════════════
