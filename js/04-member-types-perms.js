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
let DB={team:[],tasks:[],services:[],operators:[],companies:[],backlog:[],docs:[],archive:[],todos:[],projects:[],meetings:[],testSchedules:[],testSessions:[],testChecks:[]};

// ══════════════════════════════════════════════════════
// LOAD ALL FROM SUPABASE
// ══════════════════════════════════════════════════════
