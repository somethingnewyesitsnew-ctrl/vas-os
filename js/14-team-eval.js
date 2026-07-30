// §14 ── TEAM & EVALUATION ───────────────────────────────────────────────
function rTeam(el){
  el.innerHTML=`<div class="fb"><input class="si" id="tm-s" placeholder="Search members…" oninput="fTeam()"><select class="fs" id="tm-d" onchange="fTeam()"><option value="">All departments</option>${[...new Set(DB.team.map(m=>m.dept).filter(Boolean))].map(d=>`<option>${d}</option>`).join('')}</select></div><div id="team-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:11px"></div>`;
  fTeam();
}
window.fTeam=()=>{
  const sq=(document.getElementById('tm-s')?.value||'').toLowerCase();
  const fd2=document.getElementById('tm-d')?.value||'';
  let members=[...DB.team];
  if(sq)members=members.filter(m=>m.name.toLowerCase().includes(sq)||m.role.toLowerCase().includes(sq));
  if(fd2)members=members.filter(m=>m.dept===fd2);
  const g=document.getElementById('team-grid');if(!g)return;
  const ac={Admin:'#dc2626',Manager:'#7c3aed',Member:'#2563eb'};
  g.innerHTML=members.map(m=>{
    const mt=DB.tasks.filter(t=>t.assignedTo===m.id||t.assignees?.includes(m.id));
    const md=mt.filter(t=>t.status==='Done').length,ma=mt.filter(t=>!['Done','Cancelled'].includes(t.status)).length;
    const col=ac[m.access||'Member']||'#2563eb';
    return`<div class="mc" onclick="openMemberDetail('${m.id}')">
      <div style="display:flex;gap:11px;align-items:flex-start">
        <div style="width:40px;height:40px;border-radius:50%;background:${m.color||'#4f46e5'};display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:#fff;flex-shrink:0">${m.av||m.name.slice(0,2)}</div>
        <div style="flex:1">
          <div style="font-size:13px;font-weight:700">${m.name}</div>
          <div style="font-size:10px;color:var(--tx3);margin-top:1px">${m.role} · ${m.dept||'—'}</div>
          <div style="display:flex;gap:5px;margin-top:6px;flex-wrap:wrap">
            <span style="background:${col}15;color:${col};border:1px solid ${col}25;font-size:10px;font-weight:600;padding:2px 7px;border-radius:5px">${m.access||'Member'}</span>
            <span style="background:${m.status==='Active'||!m.status?'var(--gb)':'var(--yb)'};color:${m.status==='Active'||!m.status?'var(--g)':'var(--y)'};font-size:10px;font-weight:600;padding:2px 7px;border-radius:5px;border:1px solid ${m.status==='Active'||!m.status?'var(--gbr)':'var(--ybr)'}">${m.status||'Active'}</span>
            ${(()=>{const ll=m.lastLogin;if(!ll)return'<span style="background:var(--s2);color:var(--tx3);font-size:10px;font-weight:600;padding:2px 7px;border-radius:5px;border:1px solid var(--bd)">Never logged in</span>';const ago=Math.round((Date.now()-new Date(ll))/60000);const agoStr=ago<60?ago+'m ago':ago<1440?Math.round(ago/60)+'h ago':Math.round(ago/1440)+'d ago';const isOnline=ago<30;return`<span style="background:${isOnline?'var(--gb)':'var(--s2)'};color:${isOnline?'var(--g)':'var(--tx3)'};font-size:10px;font-weight:600;padding:2px 7px;border-radius:5px;border:1px solid ${isOnline?'var(--gbr)':'var(--bd)'}">⏱ ${agoStr}</span>`;})()}
          </div>
          <div style="display:flex;gap:8px;margin-top:6px;font-size:11px;color:var(--tx3)"><span><strong style="color:var(--tx)">${ma}</strong> active</span><span><strong style="color:var(--tx)">${md}</strong> done</span></div>
          ${mt.length?`<div class="prg" style="margin-top:4px"><div class="prf" style="width:${Math.round(md/mt.length*100)}%;background:var(--g)"></div></div>`:''}
          ${m.email?`<div style="font-size:10px;color:var(--tx3);margin-top:4px">✉ ${m.email}</div>`:''}
        </div>
        <div style="display:flex;flex-direction:column;gap:4px" onclick="event.stopPropagation()">
          ${m.telegram?`<span class="btn bk bxs" title="Telegram connected" style="cursor:default">✈️</span>`:''}
          <div class="ib edt" onclick="openMemberModal('${m.id}')">✏</div>
          <div class="ib" onclick="event.stopPropagation();window._navMember='${m.id}';navTo('alltasks')" title="View tasks" style="color:var(--ac);font-size:11px;font-weight:700">📋</div>
          <div class="ib del" onclick="delItem('team','${m.id}','${m.name}')">🗑</div>
        </div>
      </div>
    </div>`;
  }).join('');
};

window.openMemberDetail=(id)=>{
  const m=DB.team.find(x=>x.id===id);if(!m)return;
  const mt=DB.tasks.filter(t=>t.assignedTo===m.id);
  const md=mt.filter(t=>t.status==='Done').length;
  const ma=mt.filter(t=>!['Done','Cancelled'].includes(t.status));
  document.getElementById('sp-ttl').textContent=m.name;
  document.getElementById('sp-pills').innerHTML=`<span class="pill ${m.access==='Admin'?'sj':m.access==='Manager'?'sr':'sp'}">${m.access||'Member'}</span> <span class="pill sn">${m.status||'Active'}</span>`;
  let body=`<div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
    <div style="width:52px;height:52px;border-radius:50%;background:${m.color};display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;color:#fff;flex-shrink:0">${m.av}</div>
    <div><div style="font-size:15px;font-weight:700">${m.name}</div><div style="font-size:12px;color:var(--tx3)">${m.role} · ${m.dept||'—'}</div></div>
  </div>
  <div class="sp2">
    <div class="spf"><div class="spl">Email</div><div class="spv">${m.email||'—'}</div></div>
    <div class="spf"><div class="spl">Telegram Chat ID</div><div class="spv">${m.telegram||'—'}</div></div>
    <div class="spf"><div class="spl">Active Tasks</div><div class="spv">${ma.length}</div></div>
    <div class="spf"><div class="spl">Completed</div><div class="spv">${md}</div></div>
  </div>`;
  if(m.notes)body+=`<div class="spf"><div class="spl">Notes</div><div class="spnote">${m.notes}</div></div>`;
  if(mt.length)body+=`<div class="prg" style="margin-bottom:12px"><div class="prf" style="width:${Math.round(md/mt.length*100)}%;background:var(--g)"></div></div>`;
  body+=`<div class="sps">Active Tasks (${ma.length})</div>`;
  ma.slice(0,6).forEach(t=>{
    body+=`<div onclick="openTask('${t.id}')" style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--bd);cursor:pointer">${spill(t.status)}<span style="font-size:12px;font-weight:500;flex:1">${t.title}</span>${ppill(t.priority)}</div>`;
  });
  if(ma.length>6)body+=`<div style="font-size:11px;color:var(--tx3);padding:7px 0">+${ma.length-6} more</div>`;
  if(isAdmin()) body+=`<div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:10px 12px;margin-bottom:10px">
    <div style="font-size:9px;font-weight:700;letter-spacing:.05em;color:#dc2626;text-transform:uppercase;margin-bottom:6px">🔐 Login Credentials (Admin only)</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
      <div><div class="spl">Username</div><div style="font-family:var(--fnm);font-size:13px;font-weight:600">${m.username||m.name.toLowerCase().split(' ')[0]}</div></div>
      <div><div class="spl">Password</div><div style="font-family:var(--fnm);font-size:13px;font-weight:600">${m.password||'abohamood@1.'}</div></div>
    </div>
  </div>`;
  // Eval score for this member
  const evalTasks=DB.tasks.filter(t=>t.assignedTo===m.id||(t.assignees||[]).includes(m.id));
  const evalDone=evalTasks.filter(t=>t.status==='Done').length;
  const evalRej=evalTasks.filter(t=>t.status==='Rejected').length;
  const evalOver=evalTasks.filter(t=>getDueStatus(t).key==='overdue').length;
  const evalScore=evalDone>0?Math.max(0,Math.min(100,Math.round((evalDone/(evalDone+evalRej+evalOver+.01))*100))):null;
  const evalLabel=evalScore===null?'No data':evalScore>=90?'Excellent':evalScore>=75?'Good':evalScore>=50?'Average':'Needs Improvement';
  const evalColor=evalScore===null?'#94a3b8':evalScore>=90?'#15803d':evalScore>=75?'#2563eb':evalScore>=50?'#b45309':'#dc2626';

  // Last login info
  const ll=m.lastLogin;
  const llStr=ll?(()=>{const ago=Math.round((Date.now()-new Date(ll))/60000);return ago<60?ago+'m ago':ago<1440?Math.round(ago/60)+'h ago':Math.round(ago/1440)+'d ago';})():'Never';

  body+=`<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">
    <div style="background:${evalColor}10;border:1px solid ${evalColor}25;border-radius:9px;padding:11px">
      <div style="font-size:10px;font-weight:700;color:${evalColor};text-transform:uppercase;margin-bottom:4px">📊 Evaluation</div>
      <div style="font-size:22px;font-weight:800;color:${evalColor}">${evalScore!==null?evalScore+'%':'—'}</div>
      <div style="font-size:11px;color:${evalColor};font-weight:600">${evalLabel}</div>
      <div style="font-size:10px;color:var(--tx3);margin-top:4px">${evalDone} done · ${evalRej} rej · ${evalOver} overdue</div>
    </div>
    <div style="background:var(--s2);border:1px solid var(--bd);border-radius:9px;padding:11px">
      <div style="font-size:10px;font-weight:700;color:var(--tx3);text-transform:uppercase;margin-bottom:4px">🔐 Login</div>
      <div style="font-size:13px;font-weight:700;color:${ll&&Math.round((Date.now()-new Date(ll))/60000)<30?'var(--g)':'var(--tx)'}">${ll&&Math.round((Date.now()-new Date(ll))/60000)<30?'🟢 Online':'⚫ Offline'}</div>
      <div style="font-size:11px;color:var(--tx3);margin-top:2px">Last: ${llStr}</div>
      ${isAdmin()?`<div style="font-size:10px;color:var(--tx3);margin-top:4px">👤 ${m.username||m.name.toLowerCase().split(' ')[0]}</div>`:''}
    </div>
  </div>`;

  body+=`<div class="spa" style="flex-wrap:wrap">
    ${m.telegram?`<span class="btn bk bsm" style="cursor:default">✈️ Telegram connected</span>`:''}
    <button class="btn bp bsm" onclick="closeSP();window._navMember='${m.id}';navTo('alltasks')">📋 All Tasks</button>
    <button class="btn bg2 bsm" onclick="closeSP();window._navMember='${m.id}';navTo('archive')">🗄 Archive</button>
    <button class="btn bg2 bsm" onclick="openMemberModal('${m.id}')">✏ Edit</button>
    <button class="btn bd2 bsm" onclick="delItem('team','${m.id}','${m.name}');closeSP()">🗑 Delete</button>
  </div>`;
  document.getElementById('sp-bd').innerHTML=body;
  document.getElementById('sp-pnl').classList.add('open');
};

// ══════════════════════════════════════════════════════
// EVALUATION
// ══════════════════════════════════════════════════════
function rEval(el){
  const SPERIODS=['This Week','This Month','Last Month','All Time'];
  let selPeriod=window._evalPeriod||'This Month';

  function getPeriodFilter(){
    const now=new Date();
    if(selPeriod==='This Week'){const s=new Date(now);s.setDate(now.getDate()-now.getDay());return t=>new Date(t.tsReviewed||t.tsCreated||0)>=s;}
    if(selPeriod==='This Month'){const s=new Date(now.getFullYear(),now.getMonth(),1);return t=>new Date(t.tsReviewed||t.tsCreated||0)>=s;}
    if(selPeriod==='Last Month'){const s=new Date(now.getFullYear(),now.getMonth()-1,1);const e=new Date(now.getFullYear(),now.getMonth(),1);return t=>{const d=new Date(t.tsReviewed||t.tsCreated||0);return d>=s&&d<e;};}
    return ()=>true;
  }

  const filter=getPeriodFilter();
  const periodTasks=DB.tasks.filter(t=>filter(t));
  const doneTasks=periodTasks.filter(t=>t.status==='Done');
  const rejTasks=periodTasks.filter(t=>t.status==='Rejected');

  let h=`<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
    <div style="font-size:18px;font-weight:800;color:var(--tx)">Team Evaluation</div>
    <div style="display:flex;gap:6px">
      ${SPERIODS.map(p=>`<button onclick="window._evalPeriod='${p}';rEval(document.getElementById('content'))" style="padding:6px 12px;border-radius:7px;border:1px solid ${p===selPeriod?'var(--ac)':'var(--bd)'};background:${p===selPeriod?'var(--ac)':'var(--s)'};color:${p===selPeriod?'#fff':'var(--tx2)'};font-family:var(--fn);font-size:12px;font-weight:600;cursor:pointer">${p}</button>`).join('')}
    </div>
  </div>`;

  // Period summary stats
  const totalDone=doneTasks.length;
  const totalRej=rejTasks.length;
  const avgCycle=doneTasks.filter(t=>t.cycleH>0).length?
    Math.round(doneTasks.filter(t=>t.cycleH>0).reduce((a,t)=>a+t.cycleH,0)/doneTasks.filter(t=>t.cycleH>0).length):null;
  const onTime=doneTasks.filter(t=>t.due&&new Date(t.tsReviewed||0)<=new Date(t.due+'T23:59:59')).length;
  const onTimeRate=totalDone?Math.round(onTime/totalDone*100):0;

  h+=`<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px">
    <div style="background:var(--gb);border:1px solid var(--gbr);border-radius:10px;padding:14px;text-align:center">
      <div style="font-size:32px;font-weight:800;color:var(--g);margin-bottom:3px">${totalDone}</div>
      <div style="font-size:12px;font-weight:600;color:var(--g)">Tasks Completed</div>
      <div style="font-size:11px;color:var(--tx3);margin-top:2px">${selPeriod}</div>
    </div>
    <div style="background:${onTimeRate>=80?'var(--gb)':onTimeRate>=60?'var(--yb)':'var(--rb)'};border:1px solid ${onTimeRate>=80?'var(--gbr)':onTimeRate>=60?'var(--ybr)':'var(--rbr)'};border-radius:10px;padding:14px;text-align:center">
      <div style="font-size:32px;font-weight:800;color:${onTimeRate>=80?'var(--g)':onTimeRate>=60?'var(--y)':'var(--r)'};margin-bottom:3px">${onTimeRate}%</div>
      <div style="font-size:12px;font-weight:600;color:${onTimeRate>=80?'var(--g)':onTimeRate>=60?'var(--y)':'var(--r)'}"">On-Time Rate</div>
      <div style="font-size:11px;color:var(--tx3);margin-top:2px">${onTime} of ${totalDone} on time</div>
    </div>
    <div style="background:var(--pb);border:1px solid var(--pbr);border-radius:10px;padding:14px;text-align:center">
      <div style="font-size:32px;font-weight:800;color:var(--p);margin-bottom:3px">${avgCycle||'—'}</div>
      <div style="font-size:12px;font-weight:600;color:var(--p)">Avg Cycle Time</div>
      <div style="font-size:11px;color:var(--tx3);margin-top:2px">hours per task</div>
    </div>
    <div style="background:${totalRej?'var(--rb)':'var(--gb)'};border:1px solid ${totalRej?'var(--rbr)':'var(--gbr)'};border-radius:10px;padding:14px;text-align:center">
      <div style="font-size:32px;font-weight:800;color:${totalRej?'var(--r)':'var(--g)'};margin-bottom:3px">${totalRej}</div>
      <div style="font-size:12px;font-weight:600;color:${totalRej?'var(--r)':'var(--g)'}"">Rejected Tasks</div>
      <div style="font-size:11px;color:var(--tx3);margin-top:2px">${totalDone+totalRej?Math.round(totalRej/(totalDone+totalRej)*100):0}% rejection rate</div>
    </div>
  </div>`;

  // Per-member performance table
  const members=isAdmin()?DB.team:DB.team.filter(m=>m.id===CU.id);
  const memberStats=members.map(m=>{
    const mt=periodTasks.filter(t=>t.assignedTo===m.id||t.assignees?.includes(m.id));
    const done=mt.filter(t=>t.status==='Done').length;
    const rej=mt.filter(t=>t.status==='Rejected').length;
    const inprog=mt.filter(t=>t.status==='In Progress').length;
    const od=mt.filter(t=>getDueStatus(t).key==='overdue').length;
    const rev=mt.filter(t=>t.status==='Pending Review').length;
    const withCycle=mt.filter(t=>t.status==='Done'&&t.cycleH>0);
    const avgH=withCycle.length?Math.round(withCycle.reduce((a,t)=>a+t.cycleH,0)/withCycle.length):null;
    const onT=mt.filter(t=>t.status==='Done'&&t.due&&new Date(t.tsReviewed||0)<=new Date(t.due+'T23:59:59')).length;
    const rate=done+rej?Math.round(done/(done+rej)*100):null;
    return{m,done,rej,inprog,od,rev,avgH,onT,rate,tot:mt.length};
  }).sort((a,b)=>b.done-a.done);

  h+=`<div class="card" style="margin-bottom:14px">
    <div class="ct"><span class="ct-t">Individual Performance — ${selPeriod}</span></div>
    <div class="tw"><table>
      <thead><tr>
        <th>Member</th><th>Role</th><th>Completed</th><th>Rejected</th><th>In Progress</th><th>Overdue</th><th>Pending Review</th><th>Avg Cycle (h)</th><th>On Time</th><th>Quality Rate</th>
      </tr></thead>
      <tbody>
        ${memberStats.map(({m,done,rej,inprog,od,rev,avgH,onT,rate})=>`<tr class="cl" onclick="${isAdmin()?`openMemberDetail('${m.id}')`:''}" style="${isAdmin()?'cursor:pointer':''}">
          <td><span style="display:flex;align-items:center;gap:8px">
            <span style="width:28px;height:28px;border-radius:50%;background:${m.color};display:inline-flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#fff;flex-shrink:0">${m.av}</span>
            <span style="font-size:13px;font-weight:700">${m.name}</span>
          </span></td>
          <td style="font-size:12px;color:var(--tx3)">${m.role}</td>
          <td><span style="font-size:16px;font-weight:800;color:var(--g)">${done}</span></td>
          <td><span style="${rej>0?'color:var(--r);font-weight:700':'color:var(--tx3);font-size:13px'}">${rej>0?rej:'—'}</span></td>
          <td><span style="font-size:14px;font-weight:700;color:#2563eb">${inprog}</span></td>
          <td><span style="${od>0?'color:var(--r);font-weight:700':'color:var(--tx3)'}">${od>0?'⚠ '+od:'✓'}</span></td>
          <td><span style="${rev>0?'color:var(--p);font-weight:700':'color:var(--tx3)'}">${rev>0?rev+'⏳':'—'}</span></td>
          <td style="font-size:13px;font-weight:600;color:var(--tx2)">${avgH||'—'}</td>
          <td style="font-size:13px;font-weight:600;color:var(--g)">${onT||'—'}</td>
          <td>
            ${rate!==null?`<div style="display:flex;align-items:center;gap:6px">
              <div style="width:52px;height:6px;background:var(--s2);border-radius:3px;overflow:hidden">
                <div style="height:100%;width:${rate}%;background:${rate>=80?'#15803d':rate>=60?'#b45309':'#dc2626'};border-radius:3px"></div>
              </div>
              <span style="font-size:13px;font-weight:700;color:${rate>=80?'#15803d':rate>=60?'#b45309':'#dc2626'}">${rate}%</span>
            </div>`:'<span style="color:var(--tx3)">—</span>'}
          </td>
        </tr>`).join('')}
      </tbody>
    </table></div>
  </div>`;

  // Bottom 2-col: top performers + priority breakdown
  const topPerformers=[...memberStats].sort((a,b)=>b.done-a.done).slice(0,5);
  const critDone=doneTasks.filter(t=>t.priority==='Critical').length;
  const highDone=doneTasks.filter(t=>t.priority==='High').length;
  const medDone=doneTasks.filter(t=>t.priority==='Medium').length;
  const lowDone=doneTasks.filter(t=>t.priority==='Low').length;

  h+=`<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
    <div class="card">
      <div class="ct"><span class="ct-t">🏆 Top Performers</span></div>
      ${topPerformers.map(({m,done,rate},i)=>`<div onclick="${isAdmin()?`openMemberDetail('${m.id}')`:''}" style="display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--bd);cursor:pointer">
        <span style="width:22px;height:22px;border-radius:50%;background:${['#f59e0b','#94a3b8','#b45309','#64748b','#64748b'][i]};display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;color:#fff;flex-shrink:0">${i+1}</span>
        <span style="width:26px;height:26px;border-radius:50%;background:${m.color};display:inline-flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:#fff;flex-shrink:0">${m.av}</span>
        <div style="flex:1"><div style="font-size:13px;font-weight:700">${m.name}</div><div style="font-size:11px;color:var(--tx3)">${m.role}</div></div>
        <div style="text-align:right">
          <div style="font-size:16px;font-weight:800;color:var(--g)">${done}</div>
          <div style="font-size:10px;color:var(--tx3)">done</div>
        </div>
      </div>`).join('')}
    </div>
    <div class="card">
      <div class="ct"><span class="ct-t">Completed by Priority</span></div>
      ${[{l:'Critical',v:critDone,c:'#be123c',bg:'#fdf2f4'},
         {l:'High',v:highDone,c:'#c2410c',bg:'#fff7f3'},
         {l:'Medium',v:medDone,c:'#b45309',bg:'#fffbf0'},
         {l:'Low',v:lowDone,c:'#15803d',bg:'#f3fdf5'}
      ].map(({l,v,c,bg})=>{
        const pct=totalDone?Math.round(v/totalDone*100):0;
        return`<div style="margin-bottom:10px">
          <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px">
            <span style="font-weight:600;color:${c}">${l}</span>
            <span style="font-weight:700;color:var(--tx)">${v} <span style="font-weight:400;color:var(--tx3);font-size:11px">(${pct}%)</span></span>
          </div>
          <div style="height:7px;background:var(--s2);border-radius:4px;overflow:hidden">
            <div style="height:100%;width:${pct}%;background:${c};border-radius:4px;transition:width .5s"></div>
          </div>
        </div>`;
      }).join('')}
    </div>
  </div>`;

  el.innerHTML=h;
}

function rTeam(el){
  el.innerHTML=`<div class="fb"><input class="si" id="tm-s" placeholder="Search members…" oninput="fTeam()"><select class="fs" id="tm-d" onchange="fTeam()"><option value="">All departments</option>${[...new Set(DB.team.map(m=>m.dept).filter(Boolean))].map(d=>`<option>${d}</option>`).join('')}</select></div><div id="team-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:11px"></div>`;
  fTeam();
}
window.fTeam=()=>{
  const sq=(document.getElementById('tm-s')?.value||'').toLowerCase();
  const fd2=document.getElementById('tm-d')?.value||'';
  let members=[...DB.team];
  if(sq)members=members.filter(m=>m.name.toLowerCase().includes(sq)||m.role.toLowerCase().includes(sq));
  if(fd2)members=members.filter(m=>m.dept===fd2);
  const g=document.getElementById('team-grid');if(!g)return;
  const ac={Admin:'#dc2626',Manager:'#7c3aed',Member:'#2563eb'};
  g.innerHTML=members.map(m=>{
    const mt=DB.tasks.filter(t=>t.assignedTo===m.id||t.assignees?.includes(m.id));
    const md=mt.filter(t=>t.status==='Done').length,ma=mt.filter(t=>!['Done','Cancelled'].includes(t.status)).length;
    const col=ac[m.access||'Member']||'#2563eb';
    return`<div class="mc" onclick="openMemberDetail('${m.id}')">
      <div style="display:flex;gap:11px;align-items:flex-start">
        <div style="width:40px;height:40px;border-radius:50%;background:${m.color||'#4f46e5'};display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:#fff;flex-shrink:0">${m.av||m.name.slice(0,2)}</div>
        <div style="flex:1">
          <div style="font-size:13px;font-weight:700">${m.name}</div>
          <div style="font-size:10px;color:var(--tx3);margin-top:1px">${m.role} · ${m.dept||'—'}</div>
          <div style="display:flex;gap:5px;margin-top:6px;flex-wrap:wrap">
            <span style="background:${col}15;color:${col};border:1px solid ${col}25;font-size:10px;font-weight:600;padding:2px 7px;border-radius:5px">${m.access||'Member'}</span>
            ${m.memberType?(()=>{const mt2=getMemberTypes().find(t=>t.name===m.memberType);return`<span style="background:${mt2?.color||'#64748b'}18;color:${mt2?.color||'#64748b'};border:1px solid ${mt2?.color||'#64748b'}30;font-size:10px;font-weight:600;padding:2px 7px;border-radius:5px">${m.memberType}</span>`})():''}
            <span style="background:${m.status==='Active'||!m.status?'var(--gb)':'var(--yb)'};color:${m.status==='Active'||!m.status?'var(--g)':'var(--y)'};font-size:10px;font-weight:600;padding:2px 7px;border-radius:5px;border:1px solid ${m.status==='Active'||!m.status?'var(--gbr)':'var(--ybr)'}">${m.status||'Active'}</span>
            ${(()=>{const ll=m.lastLogin;if(!ll)return'<span style="background:var(--s2);color:var(--tx3);font-size:10px;font-weight:600;padding:2px 7px;border-radius:5px;border:1px solid var(--bd)">Never logged in</span>';const ago=Math.round((Date.now()-new Date(ll))/60000);const agoStr=ago<60?ago+'m ago':ago<1440?Math.round(ago/60)+'h ago':Math.round(ago/1440)+'d ago';const isOnline=ago<30;return`<span style="background:${isOnline?'var(--gb)':'var(--s2)'};color:${isOnline?'var(--g)':'var(--tx3)'};font-size:10px;font-weight:600;padding:2px 7px;border-radius:5px;border:1px solid ${isOnline?'var(--gbr)':'var(--bd)'}">⏱ ${agoStr}</span>`;})()}
          </div>
          <div style="display:flex;gap:8px;margin-top:6px;font-size:11px;color:var(--tx3)"><span><strong style="color:var(--tx)">${ma}</strong> active</span><span><strong style="color:var(--tx)">${md}</strong> done</span></div>
          ${mt.length?`<div class="prg" style="margin-top:4px"><div class="prf" style="width:${Math.round(md/mt.length*100)}%;background:var(--g)"></div></div>`:''}
          ${m.email?`<div style="font-size:10px;color:var(--tx3);margin-top:4px">✉ ${m.email}</div>`:''}
        </div>
        <div style="display:flex;flex-direction:column;gap:4px" onclick="event.stopPropagation()">
          ${m.telegram?`<span class="btn bk bxs" title="Telegram connected" style="cursor:default">✈️</span>`:''}
          <div class="ib edt" onclick="openMemberModal('${m.id}')">✏</div>
          <div class="ib" onclick="event.stopPropagation();window._navMember='${m.id}';navTo('alltasks')" title="View tasks" style="color:var(--ac);font-size:11px;font-weight:700">📋</div>
          <div class="ib del" onclick="delItem('team','${m.id}','${m.name}')">🗑</div>
        </div>
      </div>
    </div>`;
  }).join('');
};

window.openMemberDetail=(id)=>{
  const m=DB.team.find(x=>x.id===id);if(!m)return;
  const mt=DB.tasks.filter(t=>t.assignedTo===m.id);
  const md=mt.filter(t=>t.status==='Done').length;
  const ma=mt.filter(t=>!['Done','Cancelled'].includes(t.status));
  document.getElementById('sp-ttl').textContent=m.name;
  document.getElementById('sp-pills').innerHTML=`<span class="pill ${m.access==='Admin'?'sj':m.access==='Manager'?'sr':'sp'}">${m.access||'Member'}</span> <span class="pill sn">${m.status||'Active'}</span>`;
  let body=`<div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
    <div style="width:52px;height:52px;border-radius:50%;background:${m.color};display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;color:#fff;flex-shrink:0">${m.av}</div>
    <div><div style="font-size:15px;font-weight:700">${m.name}</div><div style="font-size:12px;color:var(--tx3)">${m.role} · ${m.dept||'—'}</div></div>
  </div>
  <div class="sp2">
    <div class="spf"><div class="spl">Email</div><div class="spv">${m.email||'—'}</div></div>
    <div class="spf"><div class="spl">Telegram Chat ID</div><div class="spv">${m.telegram||'—'}</div></div>
    <div class="spf"><div class="spl">Active Tasks</div><div class="spv">${ma.length}</div></div>
    <div class="spf"><div class="spl">Completed</div><div class="spv">${md}</div></div>
  </div>`;
  if(m.notes)body+=`<div class="spf"><div class="spl">Notes</div><div class="spnote">${m.notes}</div></div>`;
  if(mt.length)body+=`<div class="prg" style="margin-bottom:12px"><div class="prf" style="width:${Math.round(md/mt.length*100)}%;background:var(--g)"></div></div>`;
  body+=`<div class="sps">Active Tasks (${ma.length})</div>`;
  ma.slice(0,6).forEach(t=>{
    body+=`<div onclick="openTask('${t.id}')" style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--bd);cursor:pointer">${spill(t.status)}<span style="font-size:12px;font-weight:500;flex:1">${t.title}</span>${ppill(t.priority)}</div>`;
  });
  if(ma.length>6)body+=`<div style="font-size:11px;color:var(--tx3);padding:7px 0">+${ma.length-6} more</div>`;
  if(isAdmin()) body+=`<div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:10px 12px;margin-bottom:10px">
    <div style="font-size:9px;font-weight:700;letter-spacing:.05em;color:#dc2626;text-transform:uppercase;margin-bottom:6px">🔐 Login Credentials (Admin only)</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
      <div><div class="spl">Username</div><div style="font-family:var(--fnm);font-size:13px;font-weight:600">${m.username||m.name.toLowerCase().split(' ')[0]}</div></div>
      <div><div class="spl">Password</div><div style="font-family:var(--fnm);font-size:13px;font-weight:600">${m.password||'abohamood@1.'}</div></div>
    </div>
  </div>`;
  // Eval score for this member
  const evalTasks=DB.tasks.filter(t=>t.assignedTo===m.id||(t.assignees||[]).includes(m.id));
  const evalDone=evalTasks.filter(t=>t.status==='Done').length;
  const evalRej=evalTasks.filter(t=>t.status==='Rejected').length;
  const evalOver=evalTasks.filter(t=>getDueStatus(t).key==='overdue').length;
  const evalScore=evalDone>0?Math.max(0,Math.min(100,Math.round((evalDone/(evalDone+evalRej+evalOver+.01))*100))):null;
  const evalLabel=evalScore===null?'No data':evalScore>=90?'Excellent':evalScore>=75?'Good':evalScore>=50?'Average':'Needs Improvement';
  const evalColor=evalScore===null?'#94a3b8':evalScore>=90?'#15803d':evalScore>=75?'#2563eb':evalScore>=50?'#b45309':'#dc2626';

  // Last login info
  const ll=m.lastLogin;
  const llStr=ll?(()=>{const ago=Math.round((Date.now()-new Date(ll))/60000);return ago<60?ago+'m ago':ago<1440?Math.round(ago/60)+'h ago':Math.round(ago/1440)+'d ago';})():'Never';

  body+=`<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">
    <div style="background:${evalColor}10;border:1px solid ${evalColor}25;border-radius:9px;padding:11px">
      <div style="font-size:10px;font-weight:700;color:${evalColor};text-transform:uppercase;margin-bottom:4px">📊 Evaluation</div>
      <div style="font-size:22px;font-weight:800;color:${evalColor}">${evalScore!==null?evalScore+'%':'—'}</div>
      <div style="font-size:11px;color:${evalColor};font-weight:600">${evalLabel}</div>
      <div style="font-size:10px;color:var(--tx3);margin-top:4px">${evalDone} done · ${evalRej} rej · ${evalOver} overdue</div>
    </div>
    <div style="background:var(--s2);border:1px solid var(--bd);border-radius:9px;padding:11px">
      <div style="font-size:10px;font-weight:700;color:var(--tx3);text-transform:uppercase;margin-bottom:4px">🔐 Login</div>
      <div style="font-size:13px;font-weight:700;color:${ll&&Math.round((Date.now()-new Date(ll))/60000)<30?'var(--g)':'var(--tx)'}">${ll&&Math.round((Date.now()-new Date(ll))/60000)<30?'🟢 Online':'⚫ Offline'}</div>
      <div style="font-size:11px;color:var(--tx3);margin-top:2px">Last: ${llStr}</div>
      ${isAdmin()?`<div style="font-size:10px;color:var(--tx3);margin-top:4px">👤 ${m.username||m.name.toLowerCase().split(' ')[0]}</div>`:''}
    </div>
  </div>`;

  body+=`<div class="spa" style="flex-wrap:wrap">
    ${m.telegram?`<span class="btn bk bsm" style="cursor:default">✈️ Telegram connected</span>`:''}
    <button class="btn bp bsm" onclick="closeSP();window._navMember='${m.id}';navTo('alltasks')">📋 All Tasks</button>
    <button class="btn bg2 bsm" onclick="closeSP();window._navMember='${m.id}';navTo('archive')">🗄 Archive</button>
    <button class="btn bg2 bsm" onclick="openMemberModal('${m.id}')">✏ Edit</button>
    <button class="btn bd2 bsm" onclick="delItem('team','${m.id}','${m.name}');closeSP()">🗑 Delete</button>
  </div>`;
  document.getElementById('sp-bd').innerHTML=body;
  document.getElementById('sp-pnl').classList.add('open');
};

// ══════════════════════════════════════════════════════
// EVALUATION
// ══════════════════════════════════════════════════════
function rEval(el){
  const period=window._evalPeriod||'30d';
  const now_=new Date();
  function inPeriod(d){
    if(!d) return true;
    return(now_-new Date(d))/86400000<={all:36500,'30d':30,'90d':90,'7d':7}[period];
  }

  function calc(m){
    const myId=m.id, myName=(m.name||'').toLowerCase();
    function match(t){
      if(!t) return false;
      if(t.assignedTo===myId||(t.assignees||[]).includes(myId)) return true;
      if(myName&&((t.assignedTo||'').toLowerCase()===myName||(t.assignees||[]).some(a=>(a||'').toLowerCase()===myName))) return true;
      return false;
    }
    const seen=new Set();
    const tasks=DB.tasks.filter(t=>match(t)&&inPeriod(t.tsCreated)).filter(t=>{if(seen.has(t.id))return false;seen.add(t.id);return true;});
    if(!tasks.length) return null;
    const archSeen=new Set();
    const arch=DB.archive.filter(a=>{
      if(!inPeriod(a.at)) return false;
      return a.by===myId||myName&&(a.by||'').toLowerCase()===myName;
    }).filter(a=>{if(archSeen.has(a.id))return false;archSeen.add(a.id);return true;});
    const taskIds=new Set(tasks.map(t=>t.id));
    const done=tasks.filter(t=>t.status==='Done').length+arch.filter(a=>!taskIds.has(a.id)).length;
    const active=tasks.filter(t=>!['Done','Cancelled','Rejected'].includes(t.status));
    const overdue=active.filter(t=>t.due&&new Date(t.due)<now_).length;
    const rejected=new Set(tasks.filter(t=>t.status==='Rejected'||(t.rejections?.length>0)).map(t=>t.id)).size;
    const tot=tasks.length;
    const cr=tot?Math.round(done/tot*100):0;
    const jr=tot?Math.round(rejected/tot*100):0;
    const or_=active.length?Math.round(overdue/active.length*100):0;
    // Speed: avg cycle hours from archive
    const cycled=arch.filter(a=>a.cycleH>0);
    const avgCycle=cycled.length?Math.round(cycled.reduce((s,a)=>s+a.cycleH,0)/cycled.length):null;
    // Work hours: total actual hours logged
    const totalWorkH=arch.filter(a=>a.workH>0).reduce((s,a)=>s+(a.workH||0),0);
    // Avg response time (hours from created to opened)
    const respTasks=tasks.filter(t=>t.tsOpened&&t.tsCreated);
    const avgResp=respTasks.length?Math.round(respTasks.reduce((s,t)=>{const h=hb(t.tsCreated,t.tsOpened);return s+(h||0);},0)/respTasks.length):null;
    // Tasks done per day (velocity)
    const periodDays={all:365,'30d':30,'90d':90,'7d':7}[period]||30;
    const velocity=done?+(done/periodDays*7).toFixed(1):0; // tasks per week
    // Help requests given/received
    const helpGiven=DB.tasks.filter(t=>t.type==='Help Request'&&t.assignedTo===m.id&&t.status==='Done').length;
    const helpReceived=DB.tasks.filter(t=>t.type==='Help Request'&&t.reqBy===m.name&&t.status==='Done').length;
    const reEstCount=DB.tasks.filter(t=>t.assignedTo===m.id&&t.reEstimates?.length>0).reduce((a,t)=>a+(t.reEstimates?.length||0),0);
    // Help given is a positive signal (+2 per help), re-estimates are slight negative (-1 per re-estimate)
    const helpBonus=helpGiven*2-reEstCount;

    // Meeting attendance
    const mStats=getMeetingStats(m.name,{all:365,'30d':30,'90d':90,'7d':7}[period]||30);
    const meetRate=mStats.rate!==null?mStats.rate:null;
    // Score — meetings can bonus +8 (perfect) or penalise -10 (never attended)
    const meetBonus=meetRate===null?0:meetRate===100?8:meetRate>=80?4:meetRate>=50?0:meetRate>0?-5:-10;
    let score=Math.max(0,Math.min(100,Math.round(50+(cr-50)*.4-jr*.5-or_*.3+(avgCycle!==null&&avgCycle<24?5:0)+meetBonus+Math.max(-5,Math.min(5,helpBonus)))));
    return{cr,jr,or:or_,avgCycle,totalWorkH:Math.round(totalWorkH),avgResp,velocity,score,tot,done,active:active.length,overdue,rejected,mStats,meetRate,helpGiven,reEstCount};
  }

  function grade(s){
    if(s>=85)return{g:'Excellent',c:'#15803d',bg:'#f0fdf4',bc:'#bbf7d0'};
    if(s>=70)return{g:'Good',c:'#2563eb',bg:'#eff6ff',bc:'#bfdbfe'};
    if(s>=55)return{g:'Average',c:'#d97706',bg:'#fffbeb',bc:'#fde68a'};
    if(s>=40)return{g:'Needs Work',c:'#ea580c',bg:'#fff7ed',bc:'#fed7aa'};
    return{g:'Poor',c:'#dc2626',bg:'#fef2f2',bc:'#fecaca'};
  }

  function genNote(m, ev){
    const {g}=grade(ev.score);
    const lines=[];
    // Opening
    if(ev.cr>=85&&ev.overdue===0) lines.push(`${m.name} is performing at a high level — completing ${ev.cr}% of tasks with zero overdue items.`);
    else if(ev.cr>=70) lines.push(`${m.name} is on track with a ${ev.cr}% completion rate.`);
    else if(ev.cr>=40) lines.push(`${m.name} has a ${ev.cr}% completion rate — there is room for improvement.`);
    else lines.push(`${m.name}'s completion rate of ${ev.cr}% needs urgent attention.`);
    // Overdue
    if(ev.overdue===0&&ev.active>0) lines.push(`All ${ev.active} active tasks are within deadline.`);
    else if(ev.overdue>0) lines.push(`${ev.overdue} task${ev.overdue>1?'s are':' is'} currently overdue — these should be prioritised immediately.`);
    // Rejections
    if(ev.rejected===0&&ev.done>0) lines.push(`Work quality is strong with no rejections.`);
    else if(ev.jr>20) lines.push(`The ${ev.jr}% rejection rate suggests quality checks or clarity of requirements need attention.`);
    else if(ev.jr>0) lines.push(`There ${ev.rejected===1?'was':'were'} ${ev.rejected} rejection${ev.rejected>1?'s':''} — minor quality issue.`);
    // Speed
    if(ev.avgCycle!==null){
      if(ev.avgCycle<12) lines.push(`Task turnaround is very fast at ${ev.avgCycle}h average cycle time.`);
      else if(ev.avgCycle<48) lines.push(`Average cycle time is ${ev.avgCycle}h — a healthy pace.`);
      else lines.push(`Average cycle time of ${ev.avgCycle}h is on the slower side.`);
    }
    // Velocity
    if(ev.velocity>=3) lines.push(`Completing ~${ev.velocity} tasks per week shows strong throughput.`);
    else if(ev.velocity>0) lines.push(`Current velocity is ~${ev.velocity} tasks per week.`);
    // Work hours
    if(ev.totalWorkH>0) lines.push(`Logged ${ev.totalWorkH}h of work in this period.`);
    // Meetings
    if(ev.meetRate!==null){
      if(ev.meetRate===100) lines.push(`🏆 Perfect meeting attendance — attended all ${ev.mStats.attended.length} scheduled meetings.`);
      else if(ev.meetRate>=80) lines.push(`📅 Good meeting attendance at ${ev.meetRate}% (${ev.mStats.attended.length}/${ev.mStats.invited.length} meetings).`);
      else if(ev.meetRate>=50) lines.push(`📉 Meeting attendance is ${ev.meetRate}% — missed ${ev.mStats.missed.length} meeting${ev.mStats.missed.length>1?'s':''}.`);
      else if(ev.meetRate>0) lines.push(`⚠️ Low meeting attendance: ${ev.meetRate}% — missed ${ev.mStats.missed.length} meeting${ev.mStats.missed.length>1?'s':''}.`);
      else lines.push(`❌ No meetings attended in this period — ${ev.mStats.missed.length} missed.`);
    }
    return lines.join(' ');
  }

  // ── SVG horizontal bar chart ─────────────────────────────────────────
  function hBarChart(data, maxVal, colorFn, unit=''){
    if(!data.length) return '<div style="font-size:11px;color:var(--tx3);text-align:center;padding:12px">No data</div>';
    const rowH=28, pad=4;
    const nameW=80, valW=36, barAreaW=180;
    const totalH=data.length*(rowH+pad);
    let rows='';
    data.forEach((d,i)=>{
      const y=i*(rowH+pad);
      const pct=maxVal>0?Math.min(d.v/maxVal,1):0;
      const bw=Math.max(pct*barAreaW,pct>0?3:0);
      const col=colorFn(d.v,maxVal);
      rows+=`
        <text x="${nameW-6}" y="${y+rowH/2+4}" text-anchor="end" font-size="11" font-weight="600" fill="var(--tx2)" font-family="var(--fn)">${(d.l||'').slice(0,10)}</text>
        <rect x="${nameW}" y="${y+4}" width="${barAreaW}" height="${rowH-8}" rx="4" fill="var(--s2)"/>
        <rect x="${nameW}" y="${y+4}" width="${bw}" height="${rowH-8}" rx="4" fill="${col}"/>
        <text x="${nameW+bw+5}" y="${y+rowH/2+4}" font-size="10" font-weight="700" fill="${col}" font-family="var(--fn)">${d.v>0?d.v+unit:''}</text>`;
    });
    return`<div style="overflow:hidden"><svg viewBox="0 0 ${nameW+barAreaW+valW} ${totalH}" style="width:100%;display:block">${rows}</svg></div>`;
  }

  const PERIODS=[{k:'7d',l:'7 Days'},{k:'30d',l:'30 Days'},{k:'90d',l:'90 Days'},{k:'all',l:'All Time'}];
  const evals=DB.team.map(m=>({m,ev:calc(m)})).filter(x=>x.ev).sort((a,b)=>b.ev.score-a.ev.score);

  // ── Header ────────────────────────────────────────────────────────────
  let h=`<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:8px">
    <div style="font-size:20px;font-weight:800;letter-spacing:-.4px">Team Evaluation</div>
    <div style="display:flex;gap:5px;flex-wrap:wrap">
      ${PERIODS.map(p=>`<button onclick="window._evalPeriod='${p.k}';rEval(document.getElementById('content'))"
        style="padding:5px 14px;border-radius:20px;border:1px solid ${p.k===period?'var(--ac)':'var(--bd)'};background:${p.k===period?'var(--ac)':'transparent'};color:${p.k===period?'#fff':'var(--tx3)'};font-size:11px;font-weight:600;cursor:pointer">${p.l}</button>`).join('')}
    </div>
  </div>`;

  if(!evals.length){
    h+=`<div class="empty"><div class="ei">📊</div><div class="et">No task data yet</div><div class="es">Assign and complete tasks to see performance</div></div>`;
    el.innerHTML=h;return;
  }

  // ── 3 charts row ─────────────────────────────────────────────────────
  const maxActive=Math.max(...evals.map(x=>x.ev.active),1);
  const maxCycle =Math.max(...evals.map(x=>x.ev.avgCycle||0),1);
  const maxWorkH =Math.max(...evals.map(x=>x.ev.totalWorkH||0),1);

  const workloadData =evals.map(({m,ev})=>({l:m.name.split(' ')[0],v:ev.active}));
  const speedData    =evals.map(({m,ev})=>({l:m.name.split(' ')[0],v:ev.avgCycle||0}));
  const timeData     =evals.map(({m,ev})=>({l:m.name.split(' ')[0],v:ev.totalWorkH||0}));

  h+=`<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px">
    <div class="card">
      <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.07em;color:var(--tx3);margin-bottom:12px">⚡ Workload — Active Tasks</div>
      ${hBarChart(workloadData,maxActive,(v,mx)=>v/mx>0.7?'#dc2626':v/mx>0.4?'#d97706':'#15803d','')}
    </div>
    <div class="card">
      <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.07em;color:var(--tx3);margin-bottom:12px">🚀 Speed — Avg Cycle Time</div>
      ${hBarChart(speedData,maxCycle,(v,mx)=>v/mx<0.3?'#15803d':v/mx<0.6?'#d97706':'#dc2626','h')}
    </div>
    <div class="card">
      <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.07em;color:var(--tx3);margin-bottom:12px">🕐 Time in Tasks — Work Hours</div>
      ${hBarChart(timeData,maxWorkH,(v,mx)=>v/mx>0.6?'#2563eb':v/mx>0.3?'#7c3aed':'#94a3b8','h')}
    </div>
  </div>`;

  // ── Leaderboard table ─────────────────────────────────────────────────
  h+=`<div class="card" style="padding:0;overflow:hidden;margin-bottom:16px">
    <table style="width:100%;border-collapse:collapse">
      <thead><tr style="background:var(--s2);border-bottom:2px solid var(--bd)">
        <th style="padding:11px 14px;text-align:left;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.07em;color:var(--tx3)">#</th>
        <th style="padding:11px 14px;text-align:left;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.07em;color:var(--tx3)">Member</th>
        <th style="padding:11px 14px;text-align:center;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.07em;color:var(--tx3)">Score</th>
        <th style="padding:11px 14px;text-align:center;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.07em;color:var(--tx3)">Done</th>
        <th style="padding:11px 14px;text-align:center;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.07em;color:var(--tx3)">Rate</th>
        <th style="padding:11px 14px;text-align:center;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.07em;color:var(--tx3)">Overdue</th>
        <th style="padding:11px 14px;text-align:center;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.07em;color:var(--tx3)">Rejected</th>
        <th style="padding:11px 14px;text-align:center;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.07em;color:var(--tx3)">Cycle</th>
        <th style="padding:11px 14px;text-align:center;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.07em;color:var(--tx3)">Work h</th>
        <th style="padding:11px 14px;text-align:center;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.07em;color:var(--tx3)">📅 Meetings</th>
        <th style="padding:11px 14px;text-align:left;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.07em;color:var(--tx3)">Progress</th>
      </tr></thead>
      <tbody>`;

  const medals=['🥇','🥈','🥉'];
  evals.forEach(({m,ev},i)=>{
    const {g,c}=grade(ev.score);
    const rowBg=i===0?'var(--al)':i%2?'var(--s)':'var(--s2)';
    h+=`<tr onclick="openMemberDetail('${m.id}')" style="background:${rowBg};border-bottom:1px solid var(--bd);cursor:pointer;transition:filter .12s" onmouseenter="this.style.filter='brightness(.97)'" onmouseleave="this.style.filter=''">
      <td style="padding:11px 14px;font-size:13px;color:var(--tx3);font-weight:700;text-align:center">${i<3?medals[i]:i+1}</td>
      <td style="padding:11px 14px"><div style="display:flex;align-items:center;gap:8px">
        <div style="width:30px;height:30px;border-radius:50%;background:${m.color};display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#fff;flex-shrink:0;border:2px solid ${c}55">${m.av}</div>
        <div><div style="font-size:13px;font-weight:700">${m.name}</div><div style="font-size:10px;color:var(--tx3)">${m.role}</div></div>
      </div></td>
      <td style="padding:11px 14px;text-align:center"><span style="font-size:17px;font-weight:900;color:${c}">${ev.score}</span><div style="font-size:9px;color:${c};font-weight:700">${g}</div></td>
      <td style="padding:11px 14px;text-align:center;font-size:13px;font-weight:700">${ev.done}<span style="color:var(--tx3);font-size:10px">/${ev.tot}</span></td>
      <td style="padding:11px 14px;text-align:center;font-size:13px;font-weight:800;color:${ev.cr>=70?'#15803d':ev.cr>=40?'#d97706':'#dc2626'}">${ev.cr}%</td>
      <td style="padding:11px 14px;text-align:center;font-size:13px;font-weight:800;color:${ev.overdue===0?'#15803d':ev.overdue<=2?'#d97706':'#dc2626'}">${ev.overdue}</td>
      <td style="padding:11px 14px;text-align:center;font-size:13px;font-weight:800;color:${ev.jr===0?'#15803d':ev.jr<=20?'#d97706':'#dc2626'}">${ev.jr}%</td>
      <td style="padding:11px 14px;text-align:center;font-size:12px;font-weight:700;color:var(--tx3)">${ev.avgCycle!=null?ev.avgCycle+'h':'—'}</td>
      <td style="padding:11px 14px;text-align:center;font-size:12px;font-weight:700;color:#2563eb">${ev.totalWorkH>0?ev.totalWorkH+'h':'—'}</td>
      <td style="padding:11px 14px;text-align:center">
        ${ev.meetRate!==null?`<div style="font-size:13px;font-weight:800;color:${ev.meetRate===100?'#15803d':ev.meetRate>=80?'#2563eb':ev.meetRate>=50?'#d97706':'#dc2626'}">${ev.meetRate}%</div>
        <div style="font-size:9px;color:var(--tx3)">${ev.mStats.attended.length}/${ev.mStats.invited.length}</div>`:'<span style="color:var(--tx3);font-size:11px">—</span>'}
      </td>
      <td style="padding:11px 22px 11px 14px;min-width:110px"><div style="height:5px;background:var(--s2);border-radius:3px;overflow:hidden;border:1px solid var(--bd)">
        <div style="height:100%;width:${ev.cr}%;background:${ev.cr>=70?'#15803d':ev.cr>=40?'#d97706':'#dc2626'};border-radius:3px;transition:width .8s ease"></div>
      </div></td>
    </tr>`;
  });
  h+=`</tbody></table></div>`;

  // ── Member notes ──────────────────────────────────────────────────────
  h+=`<div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.07em;color:var(--tx3);margin-bottom:10px">📝 Performance Notes</div>`;
  h+=`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:10px;margin-bottom:14px">`;
  evals.forEach(({m,ev})=>{
    const {g,c,bg,bc}=grade(ev.score);
    const note=genNote(m,ev);
    h+=`<div style="background:${bg};border:1px solid ${bc};border-radius:11px;padding:14px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
        <div style="width:30px;height:30px;border-radius:50%;background:${m.color};display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#fff;flex-shrink:0">${m.av}</div>
        <div style="flex:1"><div style="font-size:12px;font-weight:700;color:var(--tx)">${m.name}</div><div style="font-size:9px;color:var(--tx3)">${m.role}</div></div>
        <span style="font-size:10px;font-weight:800;color:${c};background:${c}18;border:1px solid ${c}33;padding:2px 9px;border-radius:20px">${g}</span>
      </div>
      <div style="font-size:12px;color:var(--tx2);line-height:1.65">${note}</div>
    </div>`;
  });
  h+=`</div>`;

  // ── Legend ─────────────────────────────────────────────────────────────
  h+=`<div style="display:flex;gap:14px;flex-wrap:wrap;padding:9px 14px;background:var(--s);border:1px solid var(--bd);border-radius:9px;font-size:11px;color:var(--tx3)">
    Score = completion rate (40%) · overdue penalty (30%) · rejection penalty (50%) · cycle speed bonus · meeting attendance (±10)
    &nbsp;&nbsp;<span style="color:#15803d;font-weight:700">■</span> ≥70%
    <span style="color:#d97706;font-weight:700">■</span> ≥40%
    <span style="color:#dc2626;font-weight:700">■</span> &lt;40%
    &nbsp;|&nbsp; 📅 Perfect attendance +8pts · No attendance −10pts
  </div>`;

  el.innerHTML=h;
}


// ══════════════════════════════════════════════════════
// BACKLOG
// ══════════════════════════════════════════════════════
