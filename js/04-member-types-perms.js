// §04 ── MEMBER TYPES & PERMISSIONS ─────────────────────────────────────
function getMemberTypes(){
  try{const s=localStorage.getItem(MT_KEY);return s?JSON.parse(s):MT_DEFAULTS;}catch(e){return MT_DEFAULTS;}
}
function saveMemberTypes(t){localStorage.setItem(MT_KEY,JSON.stringify(t));}
function getMTPerms(memberType){
  if(!memberType)return null;
  const types=getMemberTypes();
  return types.find(t=>t.name===memberType)?.perms||null;
}
// canDo: admins always true; members check their type perms; fallback true for safety
function canDo(perm){
  if(isAdmin())return true;
  const p=getMTPerms(CU?.memberType);
  if(!p)return true; // no type set = old member, don't lock them out
  return p[perm]===true;
}

// Whether an arbitrary member (not necessarily the logged-in CU) has a
// given permission — checked in this order: admin always has everything;
// an explicit individual override on that member's own record (set from
// the Add/Edit Member modal) always wins next; otherwise it falls back to
// their employment type's default. Unlike canDo() above, there is no
// permissive "no type set = allow" fallback here — no type and no
// override means no access. Used for the handful of areas that should be
// opt-in only (Projects, Services, Library, Documentation) per explicit
// request, while canDo() keeps its original permissive behavior for
// everything else so existing setups aren't silently broken.
function memberHasPerm(m,permKey){
  if(!m)return false;
  if(m.access==='Admin'||FULL.includes(m.name)||AROLES.includes(m.role))return true;
  if(m.permOverrides&&typeof m.permOverrides[permKey]==='boolean')return m.permOverrides[permKey];
  const p=getMTPerms(m.memberType);
  return p?p[permKey]===true:false;
}
// Same as memberHasPerm, but for the currently logged-in user.
function canDoStrict(perm){ return memberHasPerm(CU,perm); }

// ── Who gets / sees what (Settings -> Who Gets What) ─────────────────────
// APP_CFG.recipientAccess is null until an admin saves that card, and then
// everything behaves exactly as it always did (the broad built-in "admin"
// definition). Once saved it is { people: { <memberId>: { brief, escalation,
// weekly, alerts, requests, loginlog, settings } } } and ONLY people with
// that flag set get / see that item. People added later start with nothing.
//   brief / escalation / weekly = the three server digests
//   alerts   = admin broadcast notifications + pushes (deleted tasks, reschedules...)
//   requests = approval requests (e.g. Library access)
//   loginlog = the login-reminder history/switch in member details
//   settings = opening the Settings page
function isLegacyAdminMember(m){
  return !!m&&(m.access==='Admin'||FULL.includes(m.name)||AROLES.includes(m.role));
}
function recipientFlagFor(m,key,legacyFn){
  if(!m) return false;
  const ra=APP_CFG.recipientAccess;
  if(!ra||typeof ra!=='object') return (legacyFn||isLegacyAdminMember)(m);   // not customised yet
  if(key==='settings'&&FULL.includes(m.name)) return true;                  // founders can never be locked out of Settings
  return ra.people?.[m.id]?.[key]===true;
}
const canReceiveAdminAlerts=()=>recipientFlagFor(CU,'alerts');
const canSeeLoginLog=()=>isAdmin()&&recipientFlagFor(CU,'loginlog');
const canOpenSettings=()=>isAdmin()&&recipientFlagFor(CU,'settings');

// Admin-only summary of which team members currently have access to a
// permission-gated page — rendered directly on the page itself so an
// admin can see (and jump to) who's granted without opening every
// member's profile individually. Returns '' for non-admins.
function renderAccessSummary(permKey,label){
  if(!isAdmin())return '';
  const granted=DB.team.filter(m=>memberHasPerm(m,permKey));
  return `<div style="background:var(--s2);border:1px solid var(--bd);border-radius:10px;padding:9px 14px;margin-bottom:12px;display:flex;align-items:center;gap:8px;flex-wrap:wrap">
    <span style="font-size:11px;font-weight:700;color:var(--tx3);white-space:nowrap">👥 ${label} access:</span>
    ${granted.length?granted.map(m=>`<span onclick="openMemberDetail('${m.id}')" style="display:inline-flex;align-items:center;gap:5px;background:var(--s);border:1px solid var(--bd);border-radius:20px;padding:2px 9px 2px 3px;cursor:pointer;font-size:11px;font-weight:600">
      <span style="width:16px;height:16px;border-radius:50%;background:${m.color};display:inline-flex;align-items:center;justify-content:center;font-size:6px;color:#fff;font-weight:800;flex-shrink:0">${m.av}</span>${m.name}
    </span>`).join(''):'<span style="font-size:11px;color:var(--tx3)">Admins only right now</span>'}
    <button onclick="navTo('team')" style="margin-left:auto;font-size:10px;font-weight:700;color:var(--ac);background:none;border:none;cursor:pointer;white-space:nowrap">Manage in Team →</button>
  </div>`;
}

let syslog=[]; // in-memory system log
let DB={team:[],tasks:[],services:[],operators:[],companies:[],backlog:[],docs:[],archive:[],todos:[],projects:[],meetings:[],testSchedules:[],testSessions:[],testChecks:[],loginReminders:[],reminders:[],announcements:[],hrComs:[]};

// ══════════════════════════════════════════════════════
// LOAD ALL FROM SUPABASE
// ══════════════════════════════════════════════════════
