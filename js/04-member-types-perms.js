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

let syslog=[]; // in-memory system log
let DB={team:[],tasks:[],services:[],operators:[],companies:[],backlog:[],docs:[],archive:[],todos:[],projects:[],meetings:[],testSchedules:[],testSessions:[],testChecks:[]};

// ══════════════════════════════════════════════════════
// LOAD ALL FROM SUPABASE
// ══════════════════════════════════════════════════════
