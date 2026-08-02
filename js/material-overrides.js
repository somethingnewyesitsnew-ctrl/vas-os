// ══════════════════════════════════════════════════════════════════════
// MATERIAL PAGE OVERRIDES v2 — loaded ONLY by material.html, after every
// shared js/*.js module. Redefines specific render functions in place
// (last declaration wins in global scope) so index.html and the shared
// js/ files that power your production app are never modified.
//
// Needs one Supabase table to unlock the System Log + device-sharing
// features — see the SQL block at the very bottom of this file. Until
// that table exists, everything else here still works fine; the System
// Log page will just show a "run setup" message instead of data.
// ══════════════════════════════════════════════════════════════════════

// ── Version badge — informational only, not a link ──────────────────────
(function(){
  function killVersionBadgeClick(){
    const el=document.getElementById('sb-version-badge');
    if(!el)return;
    el.onclick=null; el.style.cursor='default'; el.removeAttribute('title');
  }
  killVersionBadgeClick();
  setTimeout(killVersionBadgeClick,1200);
  setTimeout(killVersionBadgeClick,3500);
})();

// ══════════════════════════════════════════════════════════════════════
// SHARED VISUAL HELPERS
// ══════════════════════════════════════════════════════════════════════
function deltaChip(curr,prev,invert){
  curr=curr||0; prev=prev||0;
  if(prev===0&&curr===0) return `<span style="display:inline-flex;align-items:center;gap:3px;font-size:11px;font-weight:700;color:var(--tx3);background:var(--s2);padding:2px 8px;border-radius:100px">— flat</span>`;
  let pct = prev===0 ? 100 : Math.round((curr-prev)/prev*100);
  const up = curr>prev, flat = curr===prev;
  const good = flat ? null : invert ? !up : up;
  const color = flat?'var(--tx3)':good?'#146C2E':'#B3261E';
  const bg = flat?'var(--s2)':good?'var(--gb)':'var(--rb)';
  const arrow = flat?'—':up?'▲':'▼';
  return `<span style="display:inline-flex;align-items:center;gap:3px;font-size:11px;font-weight:700;color:${color};background:${bg};padding:2px 9px;border-radius:100px;white-space:nowrap">${arrow} ${Math.abs(pct)}%</span>`;
}

function icon(name,size=14){
  const paths={
    building:'<path d="M3 21V7l7-4v18M14 21V11l7 4v6"/><path d="M9 9h.01M9 13h.01M9 17h.01"/>',
    pin:'<path d="M12 21s-7-6.5-7-11a7 7 0 0 1 14 0c0 4.5-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
    target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    link:'<path d="M9 15l6-6"/><path d="M10 6l1-1a4 4 0 0 1 6 6l-1 1"/><path d="M14 18l-1 1a4 4 0 0 1-6-6l1-1"/>',
    list:'<path d="M8 6h13M8 12h13M8 18h13"/><path d="M3 6h.01M3 12h.01M3 18h.01"/>',
    alert:'<path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>',
    users:'<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    gauge:'<path d="M12 14 15 9"/><circle cx="12" cy="14" r="1.5"/><path d="M4 15a8 8 0 1 1 16 0"/>',
    shield:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  };
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;vertical-align:-2px">${paths[name]||''}</svg>`;
}

// Multi-series line chart, hand-rolled SVG (no external chart dependency)
function svgLineChart(categories,series){
  const W=560,H=190,padL=34,padB=22,padT=10,padR=8;
  const innerW=W-padL-padR, innerH=H-padT-padB;
  const maxV=Math.max(1,...series.flatMap(s=>s.data));
  const stepX=innerW/((categories.length-1)||1);
  const yFor=v=>padT+innerH-(v/maxV*innerH);
  const xFor=i=>padL+i*stepX;
  let grid='';
  const gridLines=4;
  for(let i=0;i<=gridLines;i++){
    const y=padT+innerH-(innerH/gridLines*i);
    const val=Math.round(maxV/gridLines*i);
    grid+=`<line x1="${padL}" y1="${y}" x2="${W-padR}" y2="${y}" stroke="var(--bd)" stroke-width="1"/><text x="${padL-6}" y="${y+3}" text-anchor="end" font-size="9" fill="var(--tx3)">${val}</text>`;
  }
  let paths='';
  series.forEach(s=>{
    const pts=s.data.map((v,i)=>`${xFor(i)},${yFor(v)}`).join(' ');
    paths+=`<polyline points="${pts}" fill="none" stroke="${s.color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>`;
    paths+=s.data.map((v,i)=>`<circle cx="${xFor(i)}" cy="${yFor(v)}" r="3" fill="${s.color}"/>`).join('');
  });
  const labels=categories.map((c,i)=>`<text x="${xFor(i)}" y="${H-4}" text-anchor="middle" font-size="9" fill="var(--tx3)">${c}</text>`).join('');
  const legend=series.map(s=>`<span style="display:inline-flex;align-items:center;gap:5px;font-size:11px;color:var(--tx2);font-weight:600"><span style="width:10px;height:10px;border-radius:3px;background:${s.color};display:inline-block"></span>${s.label}</span>`).join('');
  return `<div><svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block">${grid}${paths}${labels}</svg><div style="display:flex;gap:16px;margin-top:8px;flex-wrap:wrap">${legend}</div></div>`;
}

function svgHBar(items,opts={}){
  const max=Math.max(1,...items.map(i=>i.value));
  return items.map(i=>{
    const pct=Math.round(i.value/max*100);
    return `<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;cursor:${i.onclick?'pointer':'default'}" ${i.onclick?`onclick="${i.onclick}"`:''}>
      <div style="width:${opts.labelW||96}px;font-size:12px;color:var(--tx2);font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex-shrink:0">${i.label}</div>
      <div style="flex:1;height:10px;background:var(--s2);border-radius:100px;overflow:hidden"><div style="height:100%;width:${pct}%;background:${i.color};border-radius:100px;transition:width .5s"></div></div>
      <div style="width:26px;font-size:12px;font-weight:700;color:${i.color};text-align:right;flex-shrink:0">${i.value}</div>
    </div>`;
  }).join('')||`<div style="font-size:12px;color:var(--tx3);text-align:center;padding:14px 0">No data</div>`;
}

function miniBarColumns(items,opts={}){
  const h=opts.height||64;
  const cols=items.map(it=>{
    const v=it.value==null?0:it.value;
    const col=it.color||(v>=80?'#146C2E':v>=50?'#8A5300':'#B3261E');
    return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%">
      <div title="${it.label}: ${it.value==null?'no data':it.value+'%'}" style="width:100%;max-width:22px;background:${it.value==null?'var(--s2)':col};border-radius:4px 4px 0 0;height:${it.value==null?2:Math.max(3,v/100*h)}px;transition:height .5s"></div>
    </div>`;
  }).join('');
  const labels=items.map(it=>`<div style="flex:1;text-align:center;font-size:8.5px;color:var(--tx3);font-weight:600">${it.label}</div>`).join('');
  return `<div style="display:flex;align-items:flex-end;gap:5px;height:${h}px;margin-bottom:6px">${cols}</div><div style="display:flex;gap:5px">${labels}</div>`;
}

function projectCountdown(pr){
  if(!pr.targetDate) return '';
  if(pr.status==='Completed') return `<span style="display:inline-flex;align-items:center;gap:4px;font-size:10.5px;font-weight:700;color:var(--g);background:var(--gb);padding:2px 9px;border-radius:100px">✓ Completed</span>`;
  const diff=Math.round((new Date(pr.targetDate)-new Date())/86400000);
  if(diff<0) return `<span style="display:inline-flex;align-items:center;gap:4px;font-size:10.5px;font-weight:700;color:var(--r);background:var(--rb);padding:2px 9px;border-radius:100px">${Math.abs(diff)}d overdue</span>`;
  if(diff===0) return `<span style="display:inline-flex;align-items:center;gap:4px;font-size:10.5px;font-weight:700;color:var(--y);background:var(--yb);padding:2px 9px;border-radius:100px">Due today</span>`;
  if(diff<=7) return `<span style="display:inline-flex;align-items:center;gap:4px;font-size:10.5px;font-weight:700;color:var(--o);background:var(--ob);padding:2px 9px;border-radius:100px">${diff}d left</span>`;
  return `<span style="display:inline-flex;align-items:center;gap:4px;font-size:10.5px;font-weight:600;color:var(--tx3);background:var(--s2);padding:2px 9px;border-radius:100px">${diff}d left</span>`;
}

// ══════════════════════════════════════════════════════════════════════
// PROJECTS — portfolio-grade card redesign + quick status filter chips
// ══════════════════════════════════════════════════════════════════════
function rProjects(el){
  const sc={Active:'#3762E4',Planning:'#8A5300',Completed:'#146C2E','On Hold':'#8A4A16',Cancelled:'#B3261E'};
  const allCompanies=[...new Set(DB.projects.map(p=>p.ownedBy||p.company_owner).filter(Boolean))];
  const allFields=[...new Set(DB.projects.map(p=>p.field_of_work).filter(Boolean))];
  const STATUS_CHIPS=['All','Active','Planning','On Hold','Completed','At Risk'];

  function render(){
    const chipSel=document.getElementById('prf-chip')?.dataset.val||'All';
    const fCo=document.getElementById('prf-co')?.value||'';
    const fFi=document.getElementById('prf-fi')?.value||'';
    const sq=(document.getElementById('prf-sq')?.value||'').toLowerCase();
    let prs=[...DB.projects];
    if(fCo) prs=prs.filter(p=>(p.ownedBy||p.company_owner)===fCo);
    if(fFi) prs=prs.filter(p=>p.field_of_work===fFi);
    if(sq)  prs=prs.filter(p=>(p.name||'').toLowerCase().includes(sq));
    if(chipSel==='At Risk'){
      prs=prs.filter(p=>DB.tasks.some(t=>t.projectId===p.id&&!['Done','Cancelled'].includes(t.status)&&getDueStatus(t).key==='overdue'));
    } else if(chipSel!=='All'){
      prs=prs.filter(p=>p.status===chipSel);
    }

    const totalP=DB.projects.length;
    const activeP=DB.projects.filter(p=>p.status==='Active').length;
    const atRiskP=DB.projects.filter(p=>DB.tasks.some(t=>t.projectId===p.id&&!['Done','Cancelled'].includes(t.status)&&getDueStatus(t).key==='overdue')).length;
    const completedP=DB.projects.filter(p=>p.status==='Completed').length;

    let h=`<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px">
      ${[{l:'Total Projects',v:totalP,c:'#3762E4',ic:'list'},{l:'Active',v:activeP,c:'#146C2E',ic:'gauge'},{l:'At Risk',v:atRiskP,c:atRiskP?'#B3261E':'#146C2E',ic:'alert'},{l:'Completed',v:completedP,c:'#6750A4',ic:'shield'}]
      .map(k=>`<div style="background:var(--s);border:1px solid var(--bd);border-radius:16px;padding:14px 16px;display:flex;align-items:center;gap:12px">
        <div style="width:38px;height:38px;border-radius:12px;background:${k.c}18;color:${k.c};display:flex;align-items:center;justify-content:center;flex-shrink:0">${icon(k.ic,18)}</div>
        <div><div style="font-size:20px;font-weight:500;color:${k.c};line-height:1">${k.v}</div><div style="font-size:10.5px;font-weight:600;color:var(--tx3);margin-top:3px">${k.l}</div></div>
      </div>`).join('')}
    </div>`;

    h+=`<div style="display:flex;gap:6px;margin-bottom:12px;flex-wrap:wrap" id="prf-chip-row">
      ${STATUS_CHIPS.map(s=>`<div class="prf-chip" data-val="${s}" onclick="window._rPrChip('${s}')" style="padding:7px 16px;border-radius:100px;font-size:12.5px;font-weight:600;cursor:pointer;transition:all .15s;${s===chipSel?'background:var(--ac);color:#fff':'background:var(--s2);color:var(--tx2)'}">${s}</div>`).join('')}
    </div>`;

    h+=`<div class="fb" style="margin-bottom:16px">
      <input class="si" id="prf-sq" placeholder="Search projects…" oninput="window._rPr&&window._rPr()" value="${sq}">
      <select class="fs" id="prf-co" onchange="window._rPr&&window._rPr()"><option value="">All companies</option>${allCompanies.map(c=>`<option ${fCo===c?'selected':''}>${c}</option>`).join('')}</select>
      <select class="fs" id="prf-fi" onchange="window._rPr&&window._rPr()"><option value="">All fields</option>${allFields.map(f=>`<option ${fFi===f?'selected':''}>${f}</option>`).join('')}</select>
    </div>
    <input type="hidden" id="prf-chip" data-val="${chipSel}">`;

    if(!prs.length){
      h+=`<div class="empty"><div class="ei">◉</div><div class="et">No projects${DB.projects.length?' match filters':' yet'}</div><div class="es">Click + New Project to create one</div></div>`;
      el.innerHTML=h;return;
    }

    h+=`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(330px,1fr));gap:14px">`;
    prs.forEach(pr=>{
      const tasks=DB.tasks.filter(t=>t.projectId===pr.id);
      const done=tasks.filter(t=>t.status==='Done').length;
      const activeArr=tasks.filter(t=>!['Done','Cancelled'].includes(t.status));
      const overdue=activeArr.filter(t=>getDueStatus(t).key==='overdue').length;
      const activeOk=activeArr.length-overdue;
      const col=sc[pr.status]||'#767B8D';
      const tot=Math.max(tasks.length,1);
      const pctDone=Math.round(done/tot*100), pctOk=Math.round(activeOk/tot*100), pctOd=Math.round(overdue/tot*100);
      const taskMembers=[...new Set(tasks.flatMap(t=>t.assignees?.length?t.assignees:[t.assignedTo]).filter(Boolean))];
      const projMembers=(pr.member_ids||[]);
      const members=[...new Set([...projMembers,...taskMembers])].map(mid=>DB.team.find(m=>m.id===mid)).filter(Boolean);
      const owner=pr.ownedBy||pr.company_owner;
      const relLibCount=(typeof getLibrary==='function'&&(typeof hasLibAccess!=='function'||hasLibAccess()))?getLibrary().filter(it=>it.projectId===pr.id).length:0;
      const relDocCount=DB.docs.filter(d=>{const t=d.fromTask?DB.tasks.find(x=>x.id===d.fromTask):null;return t&&t.projectId===pr.id;}).length;

      h+=`<div class="mc" onclick="openProjectDetail('${pr.id}')" style="padding:0;overflow:hidden;position:relative;display:flex;flex-direction:column">
        <div style="padding:16px 18px 14px">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:10px">
            <span style="background:${col}18;color:${col};font-size:10.5px;font-weight:700;padding:3px 11px;border-radius:100px;display:inline-flex;align-items:center;gap:5px"><span style="width:6px;height:6px;border-radius:50%;background:${col};display:inline-block"></span>${pr.status}</span>
            ${projectCountdown(pr)}
          </div>
          <div style="font-size:16px;font-weight:600;line-height:1.3;color:var(--tx);margin-bottom:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${pr.name}</div>
          <div style="display:flex;flex-wrap:wrap;gap:11px;margin-bottom:13px;color:var(--tx3)">
            ${owner?`<span style="display:inline-flex;align-items:center;gap:5px;font-size:11.5px;color:var(--tx2);font-weight:500">${icon('building')} ${owner}</span>`:''}
            ${pr.locationName?`<span style="display:inline-flex;align-items:center;gap:5px;font-size:11.5px;color:var(--tx2);font-weight:500">${icon('pin')} ${pr.locationName}</span>`:''}
            ${pr.link?`<a href="${pr.link}" target="_blank" onclick="event.stopPropagation()" style="display:inline-flex;align-items:center;gap:5px;font-size:11.5px;color:var(--ac);font-weight:600;text-decoration:none">${icon('link')} Link</a>`:''}
          </div>

          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:5px">
            <span style="font-size:11px;font-weight:600;color:var(--tx3)">${tasks.length} task${tasks.length!==1?'s':''}</span>
            <span style="font-size:13px;font-weight:700;color:${col}">${pctDone}% done</span>
          </div>
          <div style="display:flex;height:8px;border-radius:100px;overflow:hidden;background:var(--s2);margin-bottom:10px">
            ${pctDone?`<div style="width:${pctDone}%;background:#146C2E" title="${done} done"></div>`:''}
            ${pctOk?`<div style="width:${pctOk}%;background:#3762E4" title="${activeOk} active"></div>`:''}
            ${pctOd?`<div style="width:${pctOd}%;background:#B3261E" title="${overdue} overdue"></div>`:''}
          </div>
          <div style="display:flex;gap:12px;flex-wrap:wrap;font-size:11px;color:var(--tx3);font-weight:600;margin-bottom:${members.length||relLibCount||relDocCount?'12px':'0'}">
            <span style="color:#146C2E">● ${done} done</span>
            <span style="color:#3762E4">● ${activeOk} active</span>
            ${overdue?`<span style="color:#B3261E">● ${overdue} overdue</span>`:''}
            ${relLibCount?`<span>📖 ${relLibCount}</span>`:''}
            ${relDocCount?`<span>📚 ${relDocCount}</span>`:''}
          </div>
          ${members.length?`<div style="display:flex;align-items:center;justify-content:space-between">
            <div style="display:flex;align-items:center">
              ${members.slice(0,5).map((m,i)=>`<span title="${m.name}" style="width:26px;height:26px;border-radius:50%;background:${m.color};display:inline-flex;align-items:center;justify-content:center;font-size:9.5px;font-weight:700;color:#fff;border:2px solid var(--s);margin-left:${i>0?'-8px':'0'};flex-shrink:0">${m.av}</span>`).join('')}
              ${members.length>5?`<span style="width:26px;height:26px;border-radius:50%;background:var(--s2);border:2px solid var(--s);display:inline-flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:var(--tx3);margin-left:-8px">+${members.length-5}</span>`:''}
            </div>
            <span style="font-size:10.5px;color:var(--tx3);font-weight:600">${members.length} member${members.length!==1?'s':''}</span>
          </div>`:''}
        </div>
        <div class="ac" onclick="event.stopPropagation()" style="display:flex;gap:4px;padding:10px 14px;border-top:1px solid var(--bd);background:var(--s2);margin-top:auto">
          <div class="ib" style="color:var(--ac)" title="Add task to this project" onclick="event.stopPropagation();openTaskModal(null,'${pr.id}')">${icon('list',13)}</div>
          <div class="ib edt" onclick="event.stopPropagation();openProjectModal('${pr.id}')">✏</div>
          <div class="ib del" style="margin-left:auto" onclick="event.stopPropagation();delItem('projects','${pr.id}','${pr.name.replace(/'/g,"\\'")}')">🗑</div>
        </div>
      </div>`;
    });
    h+=`</div>`;
    el.innerHTML=h;
  }
  window._rPr=render;
  window._rPrChip=function(s){
    const hid=document.getElementById('prf-chip'); if(hid) hid.dataset.val=s;
    render();
  };
  render();
}

// ══════════════════════════════════════════════════════════════════════
// PROJECT DETAIL PANEL — event-delegated (no fragile inline onclick
// string interpolation), sections reordered: Tasks → Library → Docs.
// This also fixes the "clicking a task tab closes the panel" bug: every
// interactive row now uses data-attributes + a single delegated
// listener on #sp-bd instead of dozens of inline onclick handlers, and
// every handler calls stopPropagation so nothing can bubble out.
// ══════════════════════════════════════════════════════════════════════
window.openProjectDetail=(id)=>{
  const pr=DB.projects.find(x=>x.id===id);if(!pr)return;
  const col={Active:'#3762E4',Planning:'#8A5300',Completed:'#146C2E','On Hold':'#8A4A16',Cancelled:'#B3261E'}[pr.status]||'#767B8D';
  const tasks=DB.tasks.filter(t=>t.projectId===pr.id);
  const done=tasks.filter(t=>t.status==='Done').length;
  const active=tasks.filter(t=>!['Done','Cancelled'].includes(t.status)).length;
  const pct=tasks.length?Math.round(done/tasks.length*100):0;
  const members=[...new Set(tasks.flatMap(t=>t.assignees?.length?t.assignees:[t.assignedTo]).filter(Boolean))];

  let body=`<div class="sg2">
      <div class="spf"><div class="spl">Location</div><div class="spv">${pr.locationName||'—'}</div></div>
      <div class="spf"><div class="spl">Owner</div><div class="spv">${pr.ownedBy||'—'}</div></div>
      <div class="spf"><div class="spl">Started</div><div class="spv">${fd(pr.startedAt)}</div></div>
      <div class="spf"><div class="spl">Target</div><div class="spv">${fd(pr.targetDate)}</div></div>
      ${pr.budget?`<div class="spf"><div class="spl">Budget</div><div class="spv">$${pr.budget.toLocaleString()}</div></div>`:''}
      ${pr.link?`<div class="spf" style="grid-column:1/-1"><div class="spl">Link</div><div class="spv"><a href="${pr.link}" target="_blank" style="color:var(--ac)">${pr.link}</a></div></div>`:''}
    </div>
    ${pr.desc?`<div class="spf"><div class="spl">Description</div><div class="spnote">${pr.desc}</div></div>`:''}
    <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--tx3);margin-bottom:5px;margin-top:12px"><span>${tasks.length} total tasks</span><span style="font-weight:700;color:${col}">${pct}%</span></div>
    <div class="prg" style="height:6px;margin-bottom:10px"><div class="prf" style="width:${pct}%;background:${col}"></div></div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:5px;margin-bottom:12px">
      ${[['Done',done,'#146C2E'],['Active',active,'#3762E4'],['Total',tasks.length,'#767B8D']].map(([l,v,c])=>`<div style="background:${c}12;border:1px solid ${c}25;border-radius:8px;padding:8px;text-align:center"><div style="font-size:9px;color:var(--tx3);font-weight:600;margin-bottom:2px;text-transform:uppercase">${l}</div><div style="font-size:16px;font-weight:700;color:${c}">${v}</div></div>`).join('')}
    </div>
    ${members.length?`<div class="spl" style="margin-bottom:6px">Team (${members.length})</div><div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:14px">${members.map(mid=>{const m=DB.team.find(x=>x.id===mid);return m?`<span style="background:${m.color}22;color:${m.color};border:1px solid ${m.color}33;font-size:10px;font-weight:600;padding:2px 9px;border-radius:20px">${m.name}</span>`:''}).join('')}</div>`:''}

    <div id="proj-tasks-wrap"></div>

    <div id="proj-lib-wrap" style="margin-top:16px"></div>

    <div id="proj-docs-wrap" style="margin-top:16px"></div>

    <div class="spa">
      <button class="btn bg2 bsm" data-act="edit-project">✏ Edit</button>
      <button class="btn bd2 bsm" data-act="delete-project">Delete</button>
    </div>`;

  openSP(pr.name,`<span style="background:${col}18;color:${col};border:none;font-size:10px;font-weight:700;padding:2px 10px;border-radius:100px">${pr.status}</span>`,body);

  // ── single delegated click handler for the whole panel — robust
  // against quote-escaping issues and prevents any bubble-out closes ──
  const spBd=document.getElementById('sp-bd');
  if(spBd && !spBd._projDelegated){
    spBd._projDelegated=true;
    spBd.addEventListener('click',(e)=>{
      const actEl=e.target.closest('[data-act]');
      if(!actEl) return;
      e.preventDefault(); e.stopPropagation();
      const act=actEl.dataset.act;
      const pid=actEl.dataset.pid;
      const tid=actEl.dataset.tid;
      const did=actEl.dataset.did;
      const lid=actEl.dataset.lid;
      const tab=actEl.dataset.tab;
      if(act==='edit-project') openProjectModal(spBd._curProjectId);
      else if(act==='delete-project'){const p=DB.projects.find(x=>x.id===spBd._curProjectId);if(p)delItem('projects',p.id,p.name.replace(/'/g,"'"));closeSP();}
      else if(act==='open-task') openTask(tid);
      else if(act==='add-task') openTaskModal(null,spBd._curProjectId);
      else if(act==='view-all-tasks'){closeSP();window._navProject=spBd._curProjectId;navTo('alltasks');}
      else if(act==='task-tab') renderProjectTasksList(spBd._curProjectId,tab);
      else if(act==='open-lib') openLibEntry(lid);
      else if(act==='add-lib') openLibModal(null,spBd._curProjectId);
      else if(act==='open-doc') openDoc2(did);
    });
  }
  spBd._curProjectId=pr.id;

  renderProjectTasksList(pr.id);
  renderProjectLibraryList(pr.id);
  renderProjectDocsList(pr.id);
};

// Tasks section (first, per request) — data-attributes only, no inline onclick
window.renderProjectTasksList=(projectId,tab)=>{
  const wrap=document.getElementById('proj-tasks-wrap');
  if(!wrap) return;
  tab=tab||wrap.dataset.tab||'Active';
  wrap.dataset.tab=tab;
  const all=DB.tasks.filter(t=>t.projectId===projectId);
  const TABS=['Active','Done','All'];
  const filtered=tab==='All'?all:tab==='Done'?all.filter(t=>t.status==='Done'):all.filter(t=>!['Done','Cancelled'].includes(t.status));
  const shown=filtered.slice(0,15);

  let h=`<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:9px;flex-wrap:wrap;gap:6px">
    <div class="spl" style="margin-bottom:0">📋 Tasks (${all.length})</div>
    <button class="btn bp bxs" data-act="add-task">+ Add Task</button>
  </div>
  <div class="tabs" style="margin-bottom:9px">
    ${TABS.map(tb=>`<div class="tab ${tb===tab?'on':''}" data-act="task-tab" data-tab="${tb}" style="font-size:12px">${tb} <span style="opacity:.5;font-size:10px">${tb==='All'?all.length:tb==='Done'?all.filter(t=>t.status==='Done').length:all.filter(t=>!['Done','Cancelled'].includes(t.status)).length}</span></div>`).join('')}
  </div>`;

  if(!filtered.length){
    h+=`<div style="text-align:center;padding:16px 0;font-size:12px;color:var(--tx3)">No ${tab==='All'?'':tab.toLowerCase()+' '}tasks yet${tab!=='Done'?' — click + Add Task above':''}</div>`;
  } else {
    h+=shown.map(t=>{
      const ds=getDueStatus(t);
      const ass=DB.team.find(m=>m.id===t.assignedTo);
      return`<div data-act="open-task" data-tid="${t.id}" style="display:flex;align-items:center;gap:7px;padding:8px 0;border-bottom:1px solid var(--bd);cursor:pointer">
        ${spill(t.status)}
        <span style="font-size:12px;font-weight:500;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${t.title}</span>
        ${ass?`<span style="width:18px;height:18px;border-radius:50%;background:${ass.color};display:inline-flex;align-items:center;justify-content:center;font-size:7px;color:#fff;font-weight:800;flex-shrink:0" title="${ass.name}">${ass.av}</span>`:''}
        ${ppill(t.priority)}
        <span class="due-badge ${ds.cls}" style="flex-shrink:0">${ds.label}</span>
      </div>`;
    }).join('');
    if(filtered.length>shown.length){
      h+=`<div data-act="view-all-tasks" style="text-align:center;padding:9px 0;font-size:11px;color:var(--ac);font-weight:700;cursor:pointer">+${filtered.length-shown.length} more — view all in All Tasks →</div>`;
    } else if(all.length){
      h+=`<div data-act="view-all-tasks" style="text-align:center;padding:9px 0;font-size:11px;color:var(--ac);font-weight:700;cursor:pointer">View in All Tasks →</div>`;
    }
  }
  wrap.innerHTML=h;
};

// Library section (second)
window.renderProjectLibraryList=(projectId)=>{
  const wrap=document.getElementById('proj-lib-wrap');
  if(!wrap) return;
  if(typeof hasLibAccess==='function' && !hasLibAccess()){ wrap.innerHTML=''; return; }
  const relLib=(typeof getLibrary==='function'?getLibrary():[]).filter(it=>it.projectId===projectId);
  const chips=relLib.map(it=>`<span data-act="open-lib" data-lid="${it.id}" style="cursor:pointer;background:var(--al);color:var(--ac);border:none;font-size:10.5px;font-weight:700;padding:4px 11px;border-radius:100px">📖 ${it.topic}</span>`).join('');
  wrap.innerHTML=`<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
    <div class="spl" style="margin-bottom:0">📖 Library (${relLib.length})</div>
    <button class="btn bp bxs" data-act="add-lib">+ Add</button>
  </div>
  <div style="display:flex;flex-wrap:wrap;gap:6px">
    ${chips||'<span style="font-size:11px;color:var(--tx3)">No entries linked yet</span>'}
  </div>`;
};

// Documentation section (third)
window.renderProjectDocsList=(projectId)=>{
  const wrap=document.getElementById('proj-docs-wrap');
  if(!wrap) return;
  const relDocs=DB.docs.filter(d=>{const t=d.fromTask?DB.tasks.find(x=>x.id===d.fromTask):null;return t&&t.projectId===projectId;});
  if(!relDocs.length){ wrap.innerHTML=''; return; }
  wrap.innerHTML=`<div class="spl" style="margin-bottom:8px">📚 Documentation (${relDocs.length})</div>
  <div style="display:flex;flex-wrap:wrap;gap:6px">${relDocs.map(d=>`<span data-act="open-doc" data-did="${d.id}" style="cursor:pointer;background:var(--gb);color:var(--g);border:none;font-size:10.5px;font-weight:700;padding:4px 11px;border-radius:100px">📚 ${d.title}</span>`).join('')}</div>`;
};

// ══════════════════════════════════════════════════════════════════════
// DASHBOARD — corporate, chart-driven, built for CEO / HR / PM / Team Lead
// ══════════════════════════════════════════════════════════════════════
// §10 ── DASHBOARD ───────────────────────────────────────────────────────
function rDash(el){
  const todayStr=new Date().toISOString().split('T')[0];
  const todayDow=new Date().getDay();
  const now=new Date();

  // ── Core data aggregations ──────────────────────────────────────────
  const allTasks=DB.tasks;
  const activeTasks=allTasks.filter(t=>!['Done','Cancelled'].includes(t.status));
  const doneTasks=allTasks.filter(t=>t.status==='Done');
  const myTasks=isAdmin()?activeTasks:activeTasks.filter(t=>t.assignedTo===CU.id||t.assignees?.includes(CU.id));

  const overdue=activeTasks.filter(t=>getDueStatus(t).key==='overdue');
  const pendingRev=allTasks.filter(t=>t.status==='Pending Review');
  const newTasks=allTasks.filter(t=>t.status==='New');
  const inProg=allTasks.filter(t=>t.status==='In Progress');
  const rejected=allTasks.filter(t=>t.status==='Rejected');

  // ── KPI calculations ────────────────────────────────────────────────
  const taskCompletionRate=allTasks.length?Math.round(doneTasks.length/allTasks.length*100):0;
  const overdueRate=activeTasks.length?Math.round(overdue.length/activeTasks.length*100):0;

  // Avg cycle time from done tasks that have cycle_h
  const tasksWithCycle=doneTasks.filter(t=>t.cycleH&&t.cycleH>0);
  const avgCycleH=tasksWithCycle.length?Math.round(tasksWithCycle.reduce((a,t)=>a+t.cycleH,0)/tasksWithCycle.length):null;

  // Service health (from tests)
  const testChecks=DB.testChecks||[];
  const doneChecks=testChecks.filter(c=>c.result!=='pending');
  const passChecks=testChecks.filter(c=>c.result==='pass');
  const serviceHealth=doneChecks.length?Math.round(passChecks.length/doneChecks.length*100):null;

  // Meetings this week
  const weekStart=new Date(now); weekStart.setDate(now.getDate()-now.getDay());
  const weekEnd=new Date(weekStart); weekEnd.setDate(weekStart.getDate()+6);
  const weekMeetings=DB.meetings.filter(m=>{const d=new Date(m.meeting_date);return d>=weekStart&&d<=weekEnd;});
  const todayMeetings=DB.meetings.filter(m=>m.meeting_date===todayStr&&m.status==='Scheduled'&&(m.created_by===CU.name||m.invitees?.includes(CU.name)||isAdmin()));

  // Team utilization — % of members with active tasks
  const membersWithTasks=DB.team.filter(m=>activeTasks.some(t=>t.assignedTo===m.id||t.assignees?.includes(m.id))).length;
  const teamUtilization=DB.team.length?Math.round(membersWithTasks/DB.team.length*100):0;

  // Pipeline velocity — tasks completed in last 7 days
  const last7=new Date(now); last7.setDate(now.getDate()-7);
  const recentDone=doneTasks.filter(t=>t.tsReviewed&&new Date(t.tsReviewed)>=last7).length;

  let h='';

  if(!isAdmin()){
    // ── MEMBER VIEW ─────────────────────────────────────────────────
    const mine=activeTasks.filter(t=>t.assignedTo===CU.id||t.assignees?.includes(CU.id)||(t.assignedTo||'').toLowerCase()===CU.name.toLowerCase()||(t.assignees||[]).some(a=>(a||'').toLowerCase()===CU.name.toLowerCase()));
    const myDone=doneTasks.filter(t=>t.assignedTo===CU.id||t.assignees?.includes(CU.id)||(t.assignedTo||'').toLowerCase()===CU.name.toLowerCase());
    const myOverdue=mine.filter(t=>getDueStatus(t).key==='overdue');
    const myRev=allTasks.filter(t=>(t.reviewer===CU.id||(t.reviewer||'').toLowerCase()===CU.name.toLowerCase())&&t.status==='Pending Review');
    const myRate=mine.length+myDone.length?Math.round(myDone.length/(mine.length+myDone.length)*100):0;
    const myRejected=allTasks.filter(t=>(t.assignedTo===CU.id||(t.assignedTo||'').toLowerCase()===CU.name.toLowerCase())&&t.status==='Rejected').length;

    // Done this week / month
    const last7d=new Date(now);last7d.setDate(now.getDate()-7);
    const last30d=new Date(now);last30d.setDate(now.getDate()-30);
    const doneThisWeek=myDone.filter(t=>t.tsReviewed&&new Date(t.tsReviewed)>=last7d);
    const doneThisMonth=myDone.filter(t=>t.tsReviewed&&new Date(t.tsReviewed)>=last30d);
    const doneToday=myDone.filter(t=>t.tsReviewed&&t.tsReviewed.slice(0,10)===todayStr);

    // ── Performance note ──────────────────────────────────────────
    function perfNote(rate,overdue,rejected,active,doneW){
      // Grade
      let grade,color,icon,note;
      if(rate>=90&&overdue===0)      {grade='Excellent';color='#15803d';icon='🌟';}
      else if(rate>=75&&overdue<=1)  {grade='Good';color='#2563eb';icon='✅';}
      else if(rate>=50)              {grade='Average';color='#d97706';icon='📈';}
      else if(active>0&&rate<30)     {grade='Needs focus';color='#dc2626';icon='⚠️';}
      else                           {grade='Getting started';color='#6366f1';icon='🚀';}

      // Build note text
      const lines=[];
      if(doneW>0) lines.push(`You completed ${doneW} task${doneW>1?'s':''} this week — great progress.`);
      if(overdue===0&&active>0) lines.push(`All ${active} active task${active>1?'s are':' is'} on track, no overdue items.`);
      if(overdue>0) lines.push(`${overdue} task${overdue>1?'s are':' is'} overdue — prioritise ${overdue>1?'these':'this'} first.`);
      if(rejected>0) lines.push(`${rejected} task${rejected>1?'s were':' was'} rejected — review the feedback carefully.`);
      if(rate>=80) lines.push(`Your ${rate}% completion rate is strong — keep it up.`);
      else if(rate>0&&rate<50) lines.push(`Completion rate is ${rate}% — breaking tasks into smaller steps may help.`);
      if(myRev.length>0) lines.push(`${myRev.length} task${myRev.length>1?'s are':' is'} waiting for your review.`);
      if(!lines.length) lines.push('No active tasks yet. Check All Tasks for new assignments.');

      return {grade,color,icon,note:lines.join(' ')};
    }
    const {grade,color,icon,note}=perfNote(myRate,myOverdue.length,myRejected,mine.length,doneThisWeek.length);

    // ── DAY REPORT (shown from 4:30pm onward each day) ──────────────
    h+=`<div id="day-report-card"></div>`;

    // ── STAT CARDS ────────────────────────────────────────────────
    h+=`<div class="sg" style="margin-bottom:14px;overflow:hidden">
      <div class="stat" style="min-width:0;overflow:hidden" onclick="navTo('mytasks')"><div class="st-bar" style="background:#2563eb"></div><div class="st-lbl">My Active Tasks</div><div class="st-val" style="color:#2563eb">${mine.length}</div><div class="st-sub">${myDone.length} completed all-time</div></div>
      <div class="stat" style="min-width:0;overflow:hidden" onclick="navTo('mytasks','Overdue')"><div class="st-bar" style="background:${myOverdue.length?'#dc2626':'#15803d'}"></div><div class="st-lbl">Overdue</div><div class="st-val" style="color:${myOverdue.length?'#dc2626':'#15803d'}">${myOverdue.length}</div><div class="st-sub">${myOverdue.length?'needs attention':'all on track ✓'}</div></div>
      <div class="stat" style="min-width:0;overflow:hidden" onclick="navTo('toreview')"><div class="st-bar" style="background:#7c3aed"></div><div class="st-lbl">To Review</div><div class="st-val" style="color:#7c3aed">${myRev.length}</div><div class="st-sub">${myRev.length?'awaiting your review':'nothing pending'}</div></div>
      <div class="stat" style="min-width:0;overflow:hidden"><div class="st-bar" style="background:#15803d"></div><div class="st-lbl">Completion Rate</div><div class="st-val" style="color:#15803d">${myRate}%</div><div class="st-sub">${grade}</div></div>
    </div>`;

    // ── PERFORMANCE NOTE ─────────────────────────────────────────
    h+=`<div style="background:${color}12;border:1px solid ${color}33;border-radius:12px;padding:14px 16px;margin-bottom:14px;display:flex;gap:12px;align-items:flex-start">
      <div style="font-size:28px;flex-shrink:0;line-height:1">${icon}</div>
      <div>
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
          <span style="font-size:13px;font-weight:800;color:${color}">${grade}</span>
          <span style="font-size:10px;font-weight:700;background:${color}22;color:${color};padding:2px 8px;border-radius:20px">${myRate}% rate</span>
          ${doneThisWeek.length?`<span style="font-size:10px;font-weight:700;background:#15803d22;color:#15803d;padding:2px 8px;border-radius:20px">${doneThisWeek.length} done this week</span>`:''}
        </div>
        <div style="font-size:12px;color:var(--tx2);line-height:1.6">${note}</div>
      </div>
    </div>`;

    // ── BEST OF THE WEEK (visible to all members) ────────────────
    const bowStart=new Date();bowStart.setDate(bowStart.getDate()-6);
    const bowScores=DB.team.filter(m=>m.access!=='Admin'&&!FULL.includes(m.name)&&!AROLES.includes(m.role)).map(m=>{
      const doneW=DB.tasks.filter(t=>t.status==='Done'&&t.assignedTo===m.id&&t.tsReviewed&&new Date(t.tsReviewed)>=bowStart).length;
      const overdueW=DB.tasks.filter(t=>!['Done','Cancelled'].includes(t.status)&&t.assignedTo===m.id&&getDueStatus(t).key==='overdue').length;
      return{m,doneW,overdueW,score:doneW*3-overdueW*2};
    }).filter(x=>x.doneW>0||x.overdueW>0).sort((a,b)=>b.score-a.score);
    const bow=bowScores[0];
    if(bow){
      const bowNote=DB.tasks.filter(t=>t.status==='Done'&&t.assignedTo===bow.m.id&&t.tsReviewed&&new Date(t.tsReviewed)>=bowStart).slice(0,2).map(t=>t.title).join(' · ');
      h+=`<div onclick="openMemberDetail('${bow.m.id}')" style="display:flex;align-items:center;gap:12px;background:linear-gradient(135deg,#14532d18,#15803d12);border:1px solid #86efac50;border-radius:10px;padding:10px 14px;margin-bottom:12px;cursor:pointer">
        <span style="font-size:20px;flex-shrink:0">⭐</span>
        <div style="flex:1;min-width:0">
          <div style="font-size:10px;font-weight:800;color:#15803d;text-transform:uppercase;letter-spacing:.06em;margin-bottom:2px">Employee of the Week</div>
          <div style="display:flex;align-items:center;gap:7px">
            <span style="width:22px;height:22px;border-radius:50%;background:${bow.m.color};display:inline-flex;align-items:center;justify-content:center;font-size:8px;font-weight:800;color:#fff;flex-shrink:0">${bow.m.av}</span>
            <span style="font-size:13px;font-weight:800;color:var(--tx)">${bow.m.name}</span>
            <span style="font-size:11px;color:#15803d;font-weight:600">${bow.doneW} task${bow.doneW!==1?'s':''} done</span>
          </div>
          ${bowNote?`<div style="font-size:10px;color:var(--tx3);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${bowNote}</div>`:''}
        </div>
      </div>`;
    }

    // ── MEETING ATTENDANCE BANNER ────────────────────────────────
    const ms=getMeetingStats(CU.name,30);
    if(ms.invited.length>0||ms.upcoming.length>0){
      const hasMissed=ms.missed.length>0;
      const hasAttended=ms.attended.length>0;
      const bColor=ms.missed.length>0&&ms.attended.length===0?'#dc2626':ms.rate>=80?'#15803d':ms.rate>=50?'#d97706':'#dc2626';
      const bBg=ms.missed.length>0&&ms.attended.length===0?'#fef2f2':ms.rate>=80?'#f0fdf4':ms.rate>=50?'#fffbeb':'#fef2f2';
      const bBorder=ms.missed.length>0&&ms.attended.length===0?'#fca5a5':ms.rate>=80?'#86efac':ms.rate>=50?'#fde68a':'#fca5a5';
      // Build lines
      const mLines=[];
      if(ms.missed.length>0){
        mLines.push(`⚠️ You missed ${ms.missed.length} meeting${ms.missed.length>1?'s':''} in the last 30 days: ${ms.missed.map(m=>m.title).join(', ')}.`);
        mLines.push('Missing meetings affects your evaluation score. Please ensure you attend scheduled meetings.');
      }
      if(ms.attended.length>0&&ms.missed.length===0){
        mLines.push(`✅ Great job! You attended all ${ms.attended.length} meeting${ms.attended.length>1?'s':''} in the last 30 days.`);
        mLines.push('Your perfect attendance is reflected positively in your evaluation.');
      } else if(ms.attended.length>0&&ms.missed.length>0){
        mLines.push(`📅 You attended ${ms.attended.length} of ${ms.invited.length} meetings (${ms.rate}% attendance rate).`);
      }
      if(ms.upcoming.length>0){
        mLines.push(`📌 Upcoming: ${ms.upcoming.slice(0,3).map(m=>m.title+' on '+m.meeting_date).join(', ')}.`);
      }
      const mIcon=ms.rate===null?'📅':ms.rate===100?'🏆':ms.rate>=80?'✅':ms.rate>=50?'📉':'❌';
      h+=`<div style="background:${bBg};border:1px solid ${bBorder};border-left:4px solid ${bColor};border-radius:9px;padding:9px 13px;margin-bottom:10px;display:flex;align-items:center;gap:10px">
        <span style="font-size:18px;flex-shrink:0">${mIcon}</span>
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:7px;flex-wrap:wrap">
            <span style="font-size:12px;font-weight:700;color:${bColor}">Meetings</span>
            ${ms.rate!==null?`<span style="font-size:11px;font-weight:600;background:${bColor}18;color:${bColor};padding:1px 8px;border-radius:20px">${ms.rate}% · ${ms.attended.length}/${ms.invited.length}</span>`:''}
            <span style="font-size:11px;color:var(--tx3)">${mLines[0]||''}</span>
          </div>
          ${ms.missed.length?`<div style="margin-top:5px;display:flex;flex-wrap:wrap;gap:4px">${ms.missed.slice(0,3).map(m=>`<span onclick="openMeetingDetail('${m.id}')" style="background:#fef2f2;color:#dc2626;border:1px solid #fca5a5;font-size:9px;font-weight:700;padding:2px 7px;border-radius:20px;cursor:pointer">⚠ ${m.title}</span>`).join('')}</div>`:''}
        </div>
      </div>`;
    }

    // ── DONE WIDGET ───────────────────────────────────────────────
    h+=`<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;min-width:0;overflow:hidden">
      <div class="card" style="min-width:0;overflow:hidden">
        <div class="ct"><span class="ct-t">✅ Tasks Done</span></div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px">
          ${[{l:'Today',v:doneToday.length,c:'#2563eb'},{l:'This Week',v:doneThisWeek.length,c:'#15803d'},{l:'This Month',v:doneThisMonth.length,c:'#7c3aed'}].map(({l,v,c})=>`
          <div style="background:${c}11;border:1px solid ${c}22;border-radius:8px;padding:12px;text-align:center">
            <div style="font-size:26px;font-weight:800;color:${c};line-height:1">${v}</div>
            <div style="font-size:10px;font-weight:600;color:${c};margin-top:3px">${l}</div>
          </div>`).join('')}
        </div>
        ${doneThisWeek.length?`<div style="margin-top:4px">
          ${doneThisWeek.slice(0,4).map(t=>`<div onclick="openTask('${t.id}')" style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--bd);cursor:pointer">
            <span style="width:7px;height:7px;border-radius:50%;background:#15803d;flex-shrink:0"></span>
            <span style="flex:1;font-size:12px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${t.title}</span>
            <span style="font-size:10px;color:var(--tx3);flex-shrink:0">${fr(t.tsReviewed)}</span>
          </div>`).join('')}
          ${doneThisWeek.length>4?`<div style="font-size:11px;color:var(--ac);margin-top:6px;cursor:pointer" onclick="navTo('archive')">+${doneThisWeek.length-4} more in Archive →</div>`:''}
        </div>`:
        `<div style="text-align:center;padding:12px 0;font-size:12px;color:var(--tx3)">No completed tasks this week yet</div>`}
      </div>

      <div class="card" style="min-width:0;overflow:hidden">
        <div class="ct"><span class="ct-t">📋 My Active Tasks</span></div>
        ${mine.length?mine.slice(0,6).map(t=>{const ds=getDueStatus(t);return`<div onclick="openTask('${t.id}')" style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--bd);cursor:pointer">
          ${spill(t.status)}
          <span style="flex:1;font-size:12px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${t.title}</span>
          <span class="${ds.cls}" style="font-size:10px;flex-shrink:0">${ds.label}</span>
        </div>`;}).join('')+
        (mine.length>6?`<div style="font-size:11px;color:var(--ac);margin-top:8px;cursor:pointer" onclick="navTo('mytasks')">View all ${mine.length} tasks →</div>`:'')
        :`<div style="text-align:center;padding:20px 0;font-size:12px;color:var(--tx3)">No active tasks — you're all clear!</div>`}
      </div>
    </div>`;

    // ── TODAY'S MEETINGS ─────────────────────────────────────────
    if(todayMeetings.length){
      h+=`<div class="card" style="margin-bottom:12px"><div class="ct">📅 Today's Meetings</div>
        ${todayMeetings.map(m=>`<div onclick="openMeetingDetail('${m.id}')" style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--bd);cursor:pointer">
          <span style="font-size:15px;font-weight:800;color:var(--ac);width:46px;flex-shrink:0">${m.meeting_time||'—'}</span>
          <div><div style="font-size:13px;font-weight:600">${m.title}</div><div style="font-size:11px;color:var(--tx3)">${m.location||m.meeting_type||''} · ${m.duration_minutes||60}min</div></div>
          ${spill(m.status)}
        </div>`).join('')}
      </div>`;
    }

    el.innerHTML=h;
    loadDayReportCard();
    return;
  }

  // ══════════════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════════
  // ADMIN DASHBOARD
  // ══════════════════════════════════════════════════════════════════

  // Projects health KPI
  const activeProj=DB.projects.filter(p=>p.status==='Active').length;
  const completedProj=DB.projects.filter(p=>p.status==='Completed').length;
  const onHoldProj=DB.projects.filter(p=>p.status==='On Hold').length;
  const projHealth=DB.projects.length?Math.round((completedProj*1+activeProj*0.5)/Math.max(DB.projects.length,1)*100):null;

  // ROW 1: KPI Cards
  h+=`<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px">
    <div onclick="navTo('alltasks')" style="background:linear-gradient(135deg,#1e40af,#2563eb);border-radius:12px;padding:16px;cursor:pointer;position:relative;overflow:hidden">
      <div style="position:absolute;right:-8px;top:-8px;font-size:60px;opacity:.07">📋</div>
      <div style="font-size:11px;font-weight:700;color:#93c5fd;text-transform:uppercase;letter-spacing:.07em;margin-bottom:5px">Completion Rate</div>
      <div style="font-size:38px;font-weight:800;color:#fff;line-height:1;margin-bottom:3px">${taskCompletionRate}%</div>
      <div style="font-size:12px;color:#bfdbfe">${doneTasks.length} done · ${activeTasks.length} active</div>
      <div style="height:3px;background:rgba(255,255,255,.2);border-radius:2px;margin-top:10px"><div style="height:100%;width:${taskCompletionRate}%;background:#60a5fa;border-radius:2px"></div></div>
    </div>
    <div onclick="navTo('alltasks','Overdue')" style="background:linear-gradient(135deg,${overdueRate>20?'#991b1b,#dc2626':overdueRate>5?'#92400e,#d97706':'#14532d,#16a34a'});border-radius:12px;padding:16px;cursor:pointer;position:relative;overflow:hidden">
      <div style="position:absolute;right:-8px;top:-8px;font-size:60px;opacity:.07">⚠</div>
      <div style="font-size:11px;font-weight:700;color:${overdueRate>20?'#fca5a5':overdueRate>5?'#fcd34d':'#86efac'};text-transform:uppercase;letter-spacing:.07em;margin-bottom:5px">Overdue Rate</div>
      <div style="font-size:38px;font-weight:800;color:#fff;line-height:1;margin-bottom:3px">${overdueRate}%</div>
      <div style="font-size:12px;color:rgba(255,255,255,.8)">${overdue.length} tasks overdue</div>
      <div style="font-size:12px;color:rgba(255,255,255,.6);margin-top:6px">${overdueRate<=5?'On Track':overdueRate<=20?'Watch':'Critical'}</div>
    </div>
    <div onclick="navTo('projects')" style="background:linear-gradient(135deg,${projHealth===null?'#374151,#4b5563':projHealth>=70?'#14532d,#15803d':projHealth>=40?'#92400e,#b45309':'#7f1d1d,#dc2626'});border-radius:12px;padding:16px;cursor:pointer;position:relative;overflow:hidden">
      <div style="position:absolute;right:-8px;top:-8px;font-size:60px;opacity:.07">◉</div>
      <div style="font-size:11px;font-weight:700;color:${projHealth===null?'#9ca3af':projHealth>=70?'#86efac':projHealth>=40?'#fcd34d':'#fca5a5'};text-transform:uppercase;letter-spacing:.07em;margin-bottom:5px">Projects Health</div>
      <div style="font-size:38px;font-weight:800;color:#fff;line-height:1;margin-bottom:3px">${projHealth!==null?projHealth+'%':'—'}</div>
      <div style="font-size:12px;color:rgba(255,255,255,.8)">${activeProj} active · ${completedProj} done</div>
      <div style="font-size:12px;color:rgba(255,255,255,.6);margin-top:6px">${projHealth===null?'No projects':projHealth>=70?'Healthy':projHealth>=40?'Monitor':'Attention'}</div>
    </div>
    <div onclick="navTo('svctest')" style="background:linear-gradient(135deg,${serviceHealth===null?'#374151,#4b5563':serviceHealth>=80?'#14532d,#15803d':serviceHealth>=60?'#92400e,#b45309':'#7f1d1d,#dc2626'});border-radius:12px;padding:16px;cursor:pointer;position:relative;overflow:hidden">
      <div style="position:absolute;right:-8px;top:-8px;font-size:60px;opacity:.07">🧪</div>
      <div style="font-size:11px;font-weight:700;color:${serviceHealth===null?'#9ca3af':serviceHealth>=80?'#86efac':serviceHealth>=60?'#fcd34d':'#fca5a5'};text-transform:uppercase;letter-spacing:.07em;margin-bottom:5px">Service Health</div>
      <div style="font-size:38px;font-weight:800;color:#fff;line-height:1;margin-bottom:3px">${serviceHealth!==null?serviceHealth+'%':'—'}</div>
      <div style="font-size:12px;color:rgba(255,255,255,.8)">${doneChecks.length} checks · ${passChecks.length} passed</div>
      <div style="font-size:12px;color:rgba(255,255,255,.6);margin-top:6px">${serviceHealth===null?'No tests':serviceHealth>=80?'All Good':serviceHealth>=60?'Some Issues':'Failing'}</div>
    </div>
  </div>`;

  // ── TEAM DAY REPORT (admin — all members, end-of-day activity) ──────
  h+=`<div id="team-day-report" style="margin-bottom:14px"></div>`;

  // ROW 2: Task Status (8 boxes — everything)
  h+=`<div style="display:grid;grid-template-columns:repeat(8,1fr);gap:7px;margin-bottom:14px">
    ${[
      {l:'Total',v:allTasks.length,c:'#64748b',click:"navTo('alltasks')"},
      {l:'New',v:newTasks.length,c:'#94a3b8',click:"navTo('alltasks','New')"},
      {l:'In Progress',v:inProg.length,c:'#2563eb',click:"navTo('alltasks','In Progress')"},
      {l:'Review',v:pendingRev.length,c:'#7c3aed',click:"navTo('toreview')"},
      {l:'Done',v:doneTasks.length,c:'#15803d',click:"navTo('alltasks','Done')"},
      {l:'Rejected',v:rejected.length,c:'#dc2626',click:"navTo('alltasks','Rejected')"},
      {l:'Overdue',v:overdue.length,c:overdue.length?'#dc2626':'#15803d',click:"navTo('alltasks','Overdue')"},
      {l:'Done/7d',v:recentDone,c:'#0891b2',click:"navTo('alltasks','Done')"},
    ].map(({l,v,c,click})=>`<div onclick="${click}" style="background:var(--s);border:1px solid var(--bd);border-top:3px solid ${c};border-radius:9px;padding:11px 8px;cursor:pointer;text-align:center;transition:box-shadow .15s" onmouseenter="this.style.boxShadow='var(--shmd)'" onmouseleave="this.style.boxShadow=''">
      <div style="font-size:22px;font-weight:800;color:${c};line-height:1;margin-bottom:3px">${v}</div>
      <div style="font-size:10px;font-weight:600;color:var(--tx3)">${l}</div>
    </div>`).join('')}
  </div>`;

  // ROW 3 data prep
  const last30_d=new Date(now); last30_d.setDate(now.getDate()-30);
  const last30Done=doneTasks.filter(t=>t.tsReviewed&&new Date(t.tsReviewed)>=last30_d).length;
  const last30Created=allTasks.filter(t=>t.tsCreated&&new Date(t.tsCreated)>=last30_d).length;
  const todayDone=doneTasks.filter(t=>t.tsReviewed&&t.tsReviewed.slice(0,10)===todayStr).length;
  const todayCreated=allTasks.filter(t=>t.tsCreated&&t.tsCreated.slice(0,10)===todayStr).length;
  const day7=Array.from({length:7},(_,i)=>{
    const d=new Date(now);d.setDate(d.getDate()-(6-i));
    const ds=d.toISOString().split('T')[0];
    const label=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()];
    const created=allTasks.filter(t=>t.tsCreated&&t.tsCreated.slice(0,10)===ds).length;
    const done=doneTasks.filter(t=>t.tsReviewed&&t.tsReviewed.slice(0,10)===ds).length;
    return{ds,label,created,done,isToday:ds===todayStr};
  });
  const maxBar=Math.max(...day7.map(d=>Math.max(d.created,d.done)),1);
  const urg=activeTasks.filter(t=>t.priority==='Critical'||getDueStatus(t).key==='overdue').slice(0,5);
  const todayTests=DB.testSchedules.filter(s=>s.day_of_week===todayDow&&s.active!==false);
  const todayTestsDone2=DB.testSessions.filter(s=>s.test_date===todayStr&&s.status==='Completed');
  const weekStart7=new Date(now);weekStart7.setDate(now.getDate()-6);
  const weekMemberScores=DB.team.filter(m=>!isAdmin()||m.access!=='Admin').filter(m=>m.access!=='Admin'&&!FULL.includes(m.name)&&!AROLES.includes(m.role)).map(m=>{
    const mt=allTasks.filter(t=>t.assignedTo===m.id||t.assignees?.includes(m.id));
    const doneW=doneTasks.filter(t=>t.assignedTo===m.id&&t.tsReviewed&&new Date(t.tsReviewed)>=weekStart7).length;
    const overdueW=mt.filter(t=>getDueStatus(t).key==='overdue').length;
    const rejW=mt.filter(t=>t.status==='Rejected').length;
    const active=mt.filter(t=>!['Done','Cancelled'].includes(t.status)).length;
    return{m,doneW,overdueW,rejW,active,score:(doneW*3)-(overdueW*2)-rejW};
  }).filter(x=>x.active>0||x.doneW>0);
  const sortedW=[...weekMemberScores].sort((a,b)=>b.score-a.score);
  const bestW=sortedW[0];
  const worstW=sortedW[sortedW.length-1];

  // ROW 3 (NEW): Velocity + Today + This Week — 3 columns
  h+=`<div style="display:grid;grid-template-columns:2fr 1fr 1fr;gap:10px;margin-bottom:14px">

    <!-- VELOCITY -->
    <div class="card" style="min-width:0">
      <div class="ct"><span class="ct-t">⚡ Velocity</span></div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-bottom:12px">
        <div onclick="window._navF='All';window._navDay='today';navTo('alltasks')" style="background:#2563eb11;border:1px solid #2563eb22;border-radius:9px;padding:10px;text-align:center;cursor:pointer" onmouseenter="this.style.boxShadow='var(--shmd)'" onmouseleave="this.style.boxShadow=''">
          <div style="font-size:9px;font-weight:700;color:#2563eb;text-transform:uppercase;margin-bottom:3px">Created Today</div>
          <div style="font-size:26px;font-weight:800;color:#2563eb;line-height:1">${todayCreated}</div>
        </div>
        <div onclick="window._navF='Done';window._navDay='today';navTo('alltasks')" style="background:#15803d11;border:1px solid #15803d22;border-radius:9px;padding:10px;text-align:center;cursor:pointer" onmouseenter="this.style.boxShadow='var(--shmd)'" onmouseleave="this.style.boxShadow=''">
          <div style="font-size:9px;font-weight:700;color:#15803d;text-transform:uppercase;margin-bottom:3px">Done Today</div>
          <div style="font-size:26px;font-weight:800;color:#15803d;line-height:1">${todayDone}</div>
        </div>
        <div onclick="window._navF='Done';window._navDay='month';navTo('alltasks')" style="background:#7c3aed11;border:1px solid #7c3aed22;border-radius:9px;padding:10px;text-align:center;cursor:pointer" onmouseenter="this.style.boxShadow='var(--shmd)'" onmouseleave="this.style.boxShadow=''">
          <div style="font-size:9px;font-weight:700;color:#7c3aed;text-transform:uppercase;margin-bottom:3px">Done (30d)</div>
          <div style="font-size:26px;font-weight:800;color:#7c3aed;line-height:1">${last30Done}</div>
        </div>
      </div>
      <div style="font-size:10px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:5px">Last 7 Days</div>
      <div style="display:flex;align-items:flex-end;gap:4px;height:52px;margin-bottom:4px">
        ${day7.map(d=>`<div style="flex:1;display:flex;flex-direction:column;align-items:center;height:100%;justify-content:flex-end;gap:1px">
          <div title="Created: ${d.created}" style="width:100%;background:#2563eb${d.isToday?'':'66'};border-radius:2px 2px 0 0;height:${Math.round(d.created/maxBar*48)+2}px;min-height:${d.created?2:1}px"></div>
          <div title="Done: ${d.done}" style="width:100%;background:#15803d${d.isToday?'':'66'};border-radius:2px 2px 0 0;height:${Math.round(d.done/maxBar*48)+2}px;min-height:${d.done?2:1}px"></div>
        </div>`).join('')}
      </div>
      <div style="display:flex;gap:4px;margin-bottom:8px">
        ${day7.map(d=>`<div style="flex:1;text-align:center;font-size:9px;font-weight:${d.isToday?800:500};color:${d.isToday?'var(--ac)':'var(--tx3)'}">${d.label}</div>`).join('')}
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;padding-top:7px;border-top:1px solid var(--bd)">
        <div style="display:flex;gap:10px">
          <span style="display:flex;align-items:center;gap:4px;font-size:10px;color:var(--tx3)"><span style="width:8px;height:8px;background:#2563eb;border-radius:2px;display:inline-block"></span>Created</span>
          <span style="display:flex;align-items:center;gap:4px;font-size:10px;color:var(--tx3)"><span style="width:8px;height:8px;background:#15803d;border-radius:2px;display:inline-block"></span>Done</span>
        </div>
        <span onclick="window._navF='Done';window._navDay='month';navTo('alltasks')" style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;cursor:pointer;background:${last30Created>last30Done?'#fef2f2':'#f0fdf4'};color:${last30Created>last30Done?'#dc2626':'#15803d'};border:1px solid ${last30Created>last30Done?'#fca5a5':'#86efac'}">
          ${last30Created>last30Done?'▲ +':'▼ -'}${Math.abs(last30Created-last30Done)} net (30d) →
        </span>
      </div>
    </div>

    <!-- TODAY / UPCOMING -->
    <div class="card" style="min-width:0">
      <div class="ct"><span class="ct-t">📅 Today & Upcoming</span><span style="font-size:10px;color:var(--tx3)">${new Date().toLocaleDateString('en',{weekday:'short',day:'numeric',month:'short'})}</span></div>
      <div style="display:flex;gap:2px;margin-bottom:10px;padding:3px;background:var(--s2);border-radius:8px;width:fit-content">
        <div id="dash-today-tab" onclick="switchDashDayTab('today')" style="padding:4px 12px;font-size:11px;font-weight:700;cursor:pointer;border-radius:6px;background:var(--s);color:var(--tx);box-shadow:var(--sh)">Today</div>
        <div id="dash-upcoming-tab" onclick="switchDashDayTab('upcoming')" style="padding:4px 12px;font-size:11px;font-weight:700;cursor:pointer;border-radius:6px;color:var(--tx2)">Upcoming 10d</div>
      </div>
      <div id="dash-today-pane">
        ${todayMeetings.length?todayMeetings.slice(0,3).map(m=>`<div onclick="openMeetingDetail('${m.id}')" style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--bd);cursor:pointer">
          <div style="min-width:34px;text-align:center;flex-shrink:0;font-size:11px;font-weight:900;color:var(--ac)">${(m.meeting_time||'—').slice(0,5)}</div>
          <div style="flex:1;min-width:0">
            <div style="font-size:12px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">📅 ${m.title}</div>
            <div style="font-size:10px;color:var(--tx3)">${m.duration_minutes||60}min · ${m.meeting_type||''}</div>
          </div>
        </div>`).join(''):''}
        ${todayTests.length?todayTests.map(s=>{const op2=[...DB.operators,...DB.companies].find(o=>o.id===s.operator_id);const done2=todayTestsDone2.find(ts=>ts.operator_id===s.operator_id);return`<div style="display:flex;align-items:center;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--bd)">
          <div style="font-size:11px;font-weight:700">🧪 ${op2?.name||'Test'}</div>
          <span style="background:${done2?'#f0fdf4':'#fffbeb'};color:${done2?'#15803d':'#d97706'};border:1px solid ${done2?'#bbf7d0':'#fde68a'};font-size:9px;font-weight:700;padding:2px 7px;border-radius:20px">${done2?'✓':'Pending'}</span>
        </div>`;}).join(''):''}
        ${!todayMeetings.length&&!todayTests.length?`<div style="text-align:center;padding:16px 0"><div style="font-size:20px;margin-bottom:5px">✅</div><div style="font-size:11px;color:var(--tx3)">Nothing scheduled today</div></div>`:''}
      </div>
      <div id="dash-upcoming-pane" style="display:none">
        ${(()=>{
          const now10=new Date(); now10.setDate(now10.getDate()+10);
          const todayS=new Date().toISOString().split('T')[0];
          const endS=now10.toISOString().split('T')[0];
          const items=[];
          // Upcoming meetings
          DB.meetings.filter(m=>m.meeting_date>todayS&&m.meeting_date<=endS&&!['Completed','Cancelled'].includes(m.status)&&(m.created_by===CU.name||m.invitees?.includes(CU.name)||isAdmin()))
            .forEach(m=>items.push({date:m.meeting_date,icon:'📅',label:m.title,sub:m.meeting_time+(m.duration_minutes?' · '+m.duration_minutes+'min':''),click:`openMeetingDetail('${m.id}')`}));
          // Tasks due in next 10 days
          allTasks.filter(t=>t.due&&t.due>todayS&&t.due<=endS&&!['Done','Cancelled'].includes(t.status))
            .forEach(t=>items.push({date:t.due,icon:'📋',label:t.title,sub:(mn(t.assignedTo)||'Unassigned')+' · '+t.status,click:`openTask('${t.id}')`}));
          items.sort((a,b)=>a.date.localeCompare(b.date));
          if(!items.length)return`<div style="text-align:center;padding:16px 0;font-size:11px;color:var(--tx3)">Nothing coming up in the next 10 days</div>`;
          let lastDate='';
          return items.map(it=>{
            let dh='';
            if(it.date!==lastDate){
              lastDate=it.date;
              const dObj=new Date(it.date+'T00:00:00');
              const dLabel=dObj.toLocaleDateString('en',{weekday:'short',day:'numeric',month:'short'});
              dh=`<div style="font-size:10px;font-weight:800;color:var(--ac);text-transform:uppercase;letter-spacing:.06em;padding:6px 0 2px;margin-top:4px">${dLabel}</div>`;
            }
            return dh+`<div onclick="${it.click}" style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--bd);cursor:pointer">
              <span style="font-size:13px;flex-shrink:0">${it.icon}</span>
              <div style="flex:1;min-width:0">
                <div style="font-size:12px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${it.label}</div>
                <div style="font-size:10px;color:var(--tx3)">${it.sub}</div>
              </div>
            </div>`;
          }).join('');
        })()}
      </div>
    </div>

    <!-- THIS WEEK -->
    <div class="card" style="min-width:0">
      <div class="ct"><span class="ct-t">⭐ This Week</span></div>
      ${weekMemberScores.length>=2?`
        <div onclick="openMemberDetail('${bestW.m.id}')" style="display:flex;align-items:center;gap:9px;padding:8px 10px;background:#f0fdf4;border:1px solid #86efac;border-radius:9px;cursor:pointer;margin-bottom:7px">
          <span style="width:30px;height:30px;border-radius:50%;background:${bestW.m.color};display:inline-flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;color:#fff;flex-shrink:0">${bestW.m.av}</span>
          <div style="flex:1;min-width:0">
            <div style="font-size:10px;font-weight:800;color:#15803d;text-transform:uppercase;letter-spacing:.05em">🏆 Best</div>
            <div style="font-size:12px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${bestW.m.name}</div>
            <div style="font-size:10px;color:#15803d">${bestW.doneW} done</div>
          </div>
          <div style="font-size:18px;font-weight:800;color:#15803d;flex-shrink:0">${bestW.score>0?'+':''}${bestW.score}</div>
        </div>
        <div onclick="openMemberDetail('${worstW.m.id}')" style="display:flex;align-items:center;gap:9px;padding:8px 10px;background:#fef2f2;border:1px solid #fca5a5;border-radius:9px;cursor:pointer">
          <span style="width:30px;height:30px;border-radius:50%;background:${worstW.m.color};display:inline-flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;color:#fff;flex-shrink:0">${worstW.m.av}</span>
          <div style="flex:1;min-width:0">
            <div style="font-size:10px;font-weight:800;color:#dc2626;text-transform:uppercase;letter-spacing:.05em">⚠ Focus</div>
            <div style="font-size:12px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${worstW.m.name}</div>
            <div style="font-size:10px;color:#dc2626">${worstW.overdueW>0?worstW.overdueW+' overdue':''}${worstW.doneW===0?' 0 done':''}</div>
          </div>
          <div style="font-size:18px;font-weight:800;color:#dc2626;flex-shrink:0">${worstW.score>0?'+':''}${worstW.score}</div>
        </div>
      `:`<div style="padding:16px 0;text-align:center;font-size:12px;color:var(--tx3)">Not enough data</div>`}
    </div>
  </div>`;

  // ROW 4: Recent Activity + Needs Attention + Priority Risk — 3 columns
  h+=`<div style="display:grid;grid-template-columns:2fr 1fr 1fr;gap:10px;margin-bottom:14px">

    <!-- RECENT ACTIVITY — rich who-did-what feed -->
    <div class="card" style="min-width:0">
      <div class="ct"><span class="ct-t">🕐 Recent Activity</span></div>
      ${(()=>{
        const events=[];
        const memberColor=(name)=>{const m=DB.team.find(x=>x.name===name||(x.name||'').toLowerCase()===(name||'').toLowerCase());return m?m.color:'#64748b';};
        const memberAv=(name)=>{const m=DB.team.find(x=>x.name===name||(x.name||'').toLowerCase()===(name||'').toLowerCase());return m?m.av:(name||'?')[0].toUpperCase();};
        const avatar=(name,size=20)=>`<span style="width:${size}px;height:${size}px;border-radius:50%;background:${memberColor(name)};display:inline-flex;align-items:center;justify-content:center;font-size:${Math.round(size*.38)}px;color:#fff;font-weight:800;flex-shrink:0">${memberAv(name)}</span>`;

        // ── From syslog (task actions, logins, reminders) ──
        syslog.slice(0,60).forEach(e=>{
          let icon='📋',color='#64748b',text='',targetId=null,targetType=null;
          const a=e.actor||'';
          switch(e.action){
            case'Login': icon='🔐';color='#2563eb';text=`<strong>${a}</strong> logged in`;break;
            case'Task Created': icon='➕';color='#2563eb';text=`<strong>${a}</strong> created <em>${e.event?.replace('Task created: ','')}</em>`;break;
            case'Task Submitted': icon='📤';color='#7c3aed';text=`<strong>${a}</strong> submitted <em>${e.event?.match(/"([^"]+)"/)?.[1]||''}</em> for review`;break;
            case'Approved': icon='✅';color='#15803d';text=`<strong>${a}</strong> approved <em>${e.event?.match(/"([^"]+)"/)?.[1]||''}</em>`;break;
            case'Rejected': icon='❌';color='#dc2626';text=`<strong>${a}</strong> rejected <em>${e.event?.match(/"([^"]+)"/)?.[1]||''}</em>`;break;
            case'Re-Estimated': icon='⏱';color='#d97706';text=`<strong>${a}</strong> re-estimated <em>${e.event?.match(/"([^"]+)"/)?.[1]||''}</em>`;break;
            case'Help Requested': icon='🤝';color='#ea580c';text=`<strong>${a}</strong> requested help — ${e.event?.replace('Help requested:','').trim()}`;break;
            case'Reminder Sent': icon='🔔';color='#7c3aed';text=`<strong>${a}</strong> reminded ${e.event?.match(/reminded (.+?) about/)?.[1]||'someone'}`;break;
            case'Re-Estimated': icon='⏱';color='#d97706';text=`<strong>${a}</strong> re-estimated a task`;break;
            case'Delete': icon='🗑';color='#dc2626';text=`<strong>${a}</strong> deleted ${e.event||'an item'}`;break;
            default: icon='📋';color='#64748b';text=`<strong>${a}</strong> — ${e.action}`;
          }
          if(text) events.push({ts:e.at,icon,color,text,targetId,targetType,actor:a});
        });

        // ── Task timeline events ───────────────────────────
        allTasks.forEach(t=>{
          (t.timeline||[]).forEach(ev=>{
            let icon='📋',color='#64748b',text='';
            if(ev.type==='help_requested'){icon='🤝';color='#ea580c';text=`<strong>${ev.by}</strong> requested help from ${ev.helpMember||'?'} on <em>${t.title}</em>`;}
            else if(ev.type==='help_received'){icon='✅';color='#15803d';text=`<strong>${ev.by}</strong> accepted help from ${ev.helperName||'?'} — <em>${t.title}</em> continues`;}
            else{icon='📋';color='#64748b';text=`<strong>${ev.by||'?'}</strong> — ${ev.event} on <em>${t.title}</em>`;}
            events.push({ts:ev.at,icon,color,text,targetId:t.id,targetType:'task',actor:ev.by||''});
          });
          // Task status changes derived from timestamps
          if(t.tsStarted) events.push({ts:t.tsStarted,icon:'▶',color:'#2563eb',text:`<strong>${mn(t.assignedTo)||'?'}</strong> started <em>${t.title}</em>`,targetId:t.id,targetType:'task',actor:mn(t.assignedTo)||''});
          if(t.tsSubmitted) events.push({ts:t.tsSubmitted,icon:'📤',color:'#7c3aed',text:`<strong>${mn(t.assignedTo)||'?'}</strong> submitted <em>${t.title}</em> for review`,targetId:t.id,targetType:'task',actor:mn(t.assignedTo)||''});
          if(t.tsReviewed&&t.status==='Done') events.push({ts:t.tsReviewed,icon:'✅',color:'#15803d',text:`<strong>${mn(t.reviewer)||'Admin'}</strong> approved <em>${t.title}</em>`,targetId:t.id,targetType:'task',actor:mn(t.reviewer)||''});
        });

        // ── Meetings ──────────────────────────────────────
        DB.meetings.forEach(m=>{
          const ts=m.ended_at||m.created_at||m.meeting_date;
          const creator=m.created_by||'?';
          const status=m.status;
          const icon=status==='Completed'?'✅':status==='Cancelled'?'❌':'📅';
          const color=status==='Completed'?'#15803d':status==='Cancelled'?'#dc2626':'#2563eb';
          const label=status==='Completed'?'completed meeting':'scheduled meeting';
          events.push({ts,icon,color,text:`<strong>${creator}</strong> ${label} <em>${m.title}</em>`,targetId:m.id,targetType:'meeting',actor:creator});
          // Attendance events
          Object.entries(m.attendance||{}).forEach(([name,status])=>{
            if(status==='present') events.push({ts:m.ended_at||m.meeting_date,icon:'👋',color:'#2563eb',text:`<strong>${name}</strong> attended <em>${m.title}</em>`,targetId:m.id,targetType:'meeting',actor:name});
          });
        });

        // ── Reminders from DB ─────────────────────────────
        (DB.reminders||[]).forEach(r=>{
          events.push({ts:r.at,icon:'🔔',color:'#7c3aed',text:`<strong>${r.fromName||'?'}</strong> reminded <strong>${r.toName||'?'}</strong>${r.taskTitle?' about <em>'+r.taskTitle+'</em>':''}`,targetId:r.taskId,targetType:'task',actor:r.fromName||''});
        });

        // Sort by timestamp, take top 12
        events.sort((a,b)=>new Date(b.ts||0)-new Date(a.ts||0));
        const top=events.filter(e=>e.ts).slice(0,12);

        if(!top.length) return`<div style="padding:16px 0;text-align:center;font-size:12px;color:var(--tx3)">No activity yet</div>`;

        return top.map(ev=>`<div onclick="${ev.targetType==='task'&&ev.targetId?`openTask('${ev.targetId}')`:ev.targetType==='meeting'&&ev.targetId?`openMeetingDetail('${ev.targetId}')`:''}" style="display:flex;align-items:flex-start;gap:8px;padding:6px 0;border-bottom:1px solid var(--bd);cursor:${ev.targetId?'pointer':'default'}">
          <span style="font-size:13px;flex-shrink:0;line-height:1.5">${ev.icon}</span>
          <div style="flex:1;overflow:hidden;min-width:0">
            <div style="font-size:12px;color:var(--tx);line-height:1.4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${ev.text}</div>
            <div style="font-size:10px;color:var(--tx3);margin-top:1px">${fr(ev.ts)}</div>
          </div>
        </div>`).join('');
      })()}
    </div>

    <!-- NEEDS ATTENTION -->
    <div class="card" style="min-width:0">
      <div class="ct"><span class="ct-t">🚨 Attention</span><span style="font-size:10px;color:var(--tx3)">${urg.length}</span></div>
      ${urg.length===0?`<div style="padding:16px 0;text-align:center;font-size:12px;color:var(--g);font-weight:600">✓ All clear</div>`:
        urg.map(t=>{const ds2=getDueStatus(t);return`<div onclick="openTask('${t.id}')" style="display:flex;align-items:center;gap:7px;padding:7px 0;border-bottom:1px solid var(--bd);cursor:pointer">
          <span class="${ds2.cls}" style="font-size:9px;flex-shrink:0;white-space:nowrap">${ds2.label}</span>
          <div style="flex:1;overflow:hidden;min-width:0"><div style="font-size:11px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${t.title}</div><div style="font-size:10px;color:var(--tx3)">${mn(t.assignedTo)||'—'}</div></div>
        </div>`;}).join('')}
    </div>

    <!-- PRIORITY RISK -->
    <div class="card" style="min-width:0">
      <div class="ct"><span class="ct-t">🎯 Priority Risk</span></div>
      <div style="display:flex;flex-direction:column;gap:7px;margin-bottom:10px">
        ${[{l:'Critical',c:'#be123c',v:activeTasks.filter(t=>t.priority==='Critical').length},
           {l:'High',c:'#c2410c',v:activeTasks.filter(t=>t.priority==='High').length},
           {l:'Medium',c:'#b45309',v:activeTasks.filter(t=>t.priority==='Medium').length},
           {l:'Low',c:'#15803d',v:activeTasks.filter(t=>t.priority==='Low').length}
        ].map(({l,c,v})=>`<div onclick="navTo('alltasks')" style="cursor:pointer">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px">
            <span style="font-size:11px;font-weight:700;color:${c}">${l}</span>
            <span style="font-size:13px;font-weight:800;color:${c}">${v}</span>
          </div>
          <div style="height:5px;background:${c}18;border-radius:3px"><div style="height:100%;width:${activeTasks.length?Math.round(v/activeTasks.length*100):0}%;background:${c};border-radius:3px"></div></div>
        </div>`).join('')}
      </div>
      ${(()=>{
        const crit=activeTasks.filter(t=>t.priority==='Critical').length;
        const high=activeTasks.filter(t=>t.priority==='High').length;
        const med=activeTasks.filter(t=>t.priority==='Medium').length;
        const score=crit*4+high*2+med+overdue.length*3;
        const max=Math.max(score,50);
        const risk=score>=30?'Critical':score>=15?'High':score>=5?'Medium':'Low';
        const rc={Critical:'#dc2626',High:'#c2410c',Medium:'#b45309',Low:'#15803d'}[risk];
        return`<div style="background:var(--s2);border-radius:8px;padding:9px;border:1px solid var(--bd)">
          <div style="font-size:10px;font-weight:700;color:var(--tx3);margin-bottom:5px;text-transform:uppercase">Overall Risk</div>
          <div style="display:flex;align-items:center;gap:8px">
            <div style="flex:1;height:7px;background:var(--bd);border-radius:4px;overflow:hidden">
              <div style="height:100%;width:${Math.min(Math.round(score/max*100),100)}%;background:${rc};border-radius:4px"></div>
            </div>
            <span style="font-size:12px;font-weight:800;color:${rc};flex-shrink:0">${risk}</span>
          </div>
        </div>`;
      })()}
    </div>
  </div>`;

  // ROW 4b: Team Load widget (full width)
  const teamLoad=DB.team.map(m=>{
    const mt2=activeTasks.filter(t=>t.assignedTo===m.id||t.assignees?.includes(m.id));
    const criticalL=mt2.filter(t=>t.priority==='Critical').length;
    const highL=mt2.filter(t=>t.priority==='High').length;
    const overdueL=mt2.filter(t=>getDueStatus(t).key==='overdue').length;
    return{m,count:mt2.length,criticalL,highL,overdueL};
  }).filter(x=>x.count>0).sort((a,b)=>b.count-a.count);
  const maxLoad=Math.max(...teamLoad.map(x=>x.count),1);
  h+=`<div class="card" style="margin-bottom:14px">
    <div class="ct"><span class="ct-t">👥 Team Load</span><span style="font-size:11px;color:var(--tx3)">${activeTasks.length} active tasks across ${teamLoad.length} member${teamLoad.length!==1?'s':''}</span></div>
    ${teamLoad.length===0?`<div style="padding:16px;text-align:center;font-size:13px;color:var(--tx3)">No active task assignments</div>`:`
    <div style="display:flex;flex-direction:column;gap:8px">
      ${teamLoad.map(({m,count,criticalL,highL,overdueL})=>{
        const pct=Math.round(count/maxLoad*100);
        const loadColor=count>=6?'#dc2626':count>=4?'#c2410c':count>=2?'#b45309':'#15803d';
        const loadLabel=count>=6?'Overloaded':count>=4?'High':count>=2?'Moderate':'Light';
        return`<div onclick="openMemberDetail('${m.id}')" style="display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:9px;background:var(--s2);cursor:pointer;border:1px solid var(--bd);transition:box-shadow .15s" onmouseenter="this.style.boxShadow='var(--shmd)'" onmouseleave="this.style.boxShadow=''">
          <span style="width:32px;height:32px;border-radius:50%;background:${m.color};display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;color:#fff;flex-shrink:0">${m.av}</span>
          <div style="flex:1;min-width:0">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
              <span style="font-size:13px;font-weight:700;color:var(--tx)">${m.name}</span>
              <div style="display:flex;align-items:center;gap:6px;flex-shrink:0">
                ${criticalL?`<span style="background:#fdf2f4;color:#be123c;border:1px solid #fca5a5;font-size:9px;font-weight:800;padding:2px 6px;border-radius:10px">🔴 ${criticalL}</span>`:''}
                ${highL?`<span style="background:#fff7f3;color:#c2410c;border:1px solid #fed7aa;font-size:9px;font-weight:800;padding:2px 6px;border-radius:10px">🟠 ${highL}</span>`:''}
                ${overdueL?`<span style="background:#fef2f2;color:#dc2626;border:1px solid #fca5a5;font-size:9px;font-weight:800;padding:2px 6px;border-radius:10px">⚠ ${overdueL}</span>`:''}
                <span style="background:${loadColor}15;color:${loadColor};border:1px solid ${loadColor}30;font-size:10px;font-weight:700;padding:3px 8px;border-radius:20px">${count} tasks</span>
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:8px">
              <div style="flex:1;height:6px;background:var(--bd);border-radius:3px;overflow:hidden">
                <div style="height:100%;width:${pct}%;background:${loadColor};border-radius:3px;transition:width .4s"></div>
              </div>
              <span style="font-size:10px;font-weight:700;color:${loadColor};flex-shrink:0;min-width:60px;text-align:right">${loadLabel}</span>
            </div>
          </div>
        </div>`;
      }).join('')}
    </div>`}
  </div>`;

  // ROW 5: Operations (full width)
  const liveServices=DB.services.filter(s=>s.status==='Live').length;
  h+=`<div class="card" style="margin-bottom:14px">
    <div class="ct"><span class="ct-t">Operations Overview</span></div>
    <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:10px">
      ${[
        {icon:'📡',label:'Operators',val:DB.operators.length,sub:DB.operators.filter(o=>o.status==='Active'||!o.status).length+' active',click:"navTo('operators')"},
        {icon:'◐',label:'Services',val:DB.services.length,sub:liveServices+' live',click:"navTo('services')"},
        {icon:'◉',label:'Projects',val:DB.projects.length,sub:activeProj+' active',click:"navTo('projects')"},
        {icon:'🏢',label:'Companies',val:DB.companies.length,sub:'',click:"navTo('companies')"},
        {icon:'👥',label:'Team',val:DB.team.length,sub:membersWithTasks+' active',click:"navTo('team')"},
      ].map(({icon,label,val,sub,click})=>`<div onclick="${click}" style="background:var(--s2);border:1px solid var(--bd);border-radius:10px;padding:16px;cursor:pointer;text-align:center;transition:box-shadow .15s" onmouseenter="this.style.boxShadow='var(--shmd)'" onmouseleave="this.style.boxShadow=''">
        <div style="font-size:24px;margin-bottom:6px">${icon}</div>
        <div style="font-size:24px;font-weight:800;color:var(--tx);line-height:1;margin-bottom:3px">${val}</div>
        <div style="font-size:13px;font-weight:600;color:var(--tx2)">${label}</div>
        ${sub?`<div style="font-size:11px;color:var(--tx3);margin-top:2px">${sub}</div>`:''}
      </div>`).join('')}
    </div>
  </div>`;

  // ── EXTRA: HR panel + Recent Logins (Material dashboard addition) ──
  const _now2=new Date();
  const _inRange2=(ts,from,to)=>{if(!ts)return false;const d=new Date(ts);return d>=from&&d<to;};
  const meetWeeks=Array.from({length:8},(_,i)=>{
    const end=new Date(_now2); end.setDate(_now2.getDate()-(7*(7-i)));
    const start=new Date(end); start.setDate(end.getDate()-7);
    const ms=DB.meetings.filter(m=>m.status==='Completed'&&_inRange2(m.meeting_date,start,end));
    let inv=0,pres=0;
    ms.forEach(m=>Object.values(m.attendance||{}).forEach(v=>{inv++;if(v==='present')pres++;}));
    return{label:end.toLocaleDateString('en',{day:'numeric',month:'short'}),value:inv?Math.round(pres/inv*100):null};
  });
  const deptCounts={};
  DB.team.forEach(m=>{const d=m.dept||'Other';deptCounts[d]=(deptCounts[d]||0)+1;});
  const deptColors=['#3762E4','#6750A4','#146C2E','#8A5300','#B3261E','#0891B2','#767B8D'];
  const deptData=Object.entries(deptCounts).map(([l,v],i)=>({v,label:l,color:deptColors[i%deptColors.length]}));

  h+=`<div style="display:grid;grid-template-columns:1.4fr 1fr 1fr;gap:14px;margin-bottom:14px">
    <div class="card">
      <div class="ct"><span class="ct-t">📅 HR — Meeting Attendance Rate</span><span style="font-size:11px;color:var(--tx3);font-weight:500">last 8 weeks</span></div>
      ${miniBarColumns(meetWeeks,{height:74})}
    </div>
    <div class="card">
      <div class="ct"><span class="ct-t">Team by Department</span></div>
      ${donut(deptData,88)}
    </div>
    <div id="dash-login-widget"></div>
  </div>`;

  // ROW 6: Team Performance (full width)
  const teamPerf=DB.team.map(m=>{
    const mt=allTasks.filter(t=>t.assignedTo===m.id||t.assignees?.includes(m.id));
    const active=mt.filter(t=>!['Done','Cancelled'].includes(t.status)).length;
    done=mt.filter(t=>t.status==='Done').length;
    const od=mt.filter(t=>getDueStatus(t).key==='overdue').length;
    const inrev=mt.filter(t=>t.status==='Pending Review').length;
    const recent_d=mt.filter(t=>t.tsReviewed&&new Date(t.tsReviewed)>=last30_d&&t.status==='Done').length;
    const rate=mt.length?Math.round(done/mt.length*100):0;
    return{m,active,done,od,inrev,recent_d,rate,tot:mt.length};
  }).sort((a,b)=>b.active-a.active);

  h+=`<div class="card">
    <div class="ct"><span class="ct-t">Team Performance</span><span onclick="navTo('team')" style="font-size:12px;color:var(--ac);cursor:pointer;font-weight:600">View team →</span></div>
    <div class="tw"><table>
      <thead><tr><th>Member</th><th>Role</th><th>Active</th><th>Done (30d)</th><th>Overdue</th><th>Review</th><th>Rate</th><th>Load</th></tr></thead>
      <tbody>
        ${teamPerf.map(({m,active,done,od,inrev,recent_d,rate})=>`<tr class="cl" onclick="openMemberDetail('${m.id}')">
          <td><span style="display:flex;align-items:center;gap:8px">
            <span style="width:28px;height:28px;border-radius:50%;background:${m.color};display:inline-flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#fff;flex-shrink:0">${m.av}</span>
            <span style="font-size:13px;font-weight:700">${m.name}</span>
          </span></td>
          <td style="font-size:12px;color:var(--tx3)">${m.role}</td>
          <td><span style="font-size:16px;font-weight:800;color:${active>=5?'#dc2626':active>=2?'#b45309':'var(--tx)'}">${active}</span></td>
          <td style="font-size:14px;font-weight:700;color:var(--g)">${recent_d}</td>
          <td style="${od>0?'color:#dc2626;font-weight:700':'color:var(--tx3)'}">${od>0?'⚠ '+od:'—'}</td>
          <td style="${inrev>0?'color:#7c3aed;font-weight:700':'color:var(--tx3)'}">${inrev>0?inrev+'⏳':'—'}</td>
          <td><div style="display:flex;align-items:center;gap:6px">
            <div style="width:52px;height:5px;background:var(--s2);border-radius:3px;overflow:hidden">
              <div style="height:100%;width:${rate}%;background:${rate>=70?'#15803d':rate>=40?'#b45309':'#dc2626'};border-radius:3px"></div>
            </div>
            <span style="font-size:12px;font-weight:700;color:${rate>=70?'#15803d':rate>=40?'#b45309':'#dc2626'}">${rate}%</span>
          </div></td>
          <td><span style="background:${active>=5?'#fef2f2':active>=3?'#fffbeb':'#f0fdf4'};color:${active>=5?'#dc2626':active>=3?'#b45309':'#15803d'};font-size:11px;font-weight:700;padding:3px 9px;border-radius:20px;border:1px solid ${active>=5?'#fca5a5':active>=3?'#fcd34d':'#86efac'}">${active>=5?'High':active>=3?'Med':'Low'}</span></td>
        </tr>`).join('')}
      </tbody>
    </table></div>
  </div>`;



  el.innerHTML=h;
  loadDashLoginWidget();
  loadTeamDayReport();
}

async function loadDashLoginWidget(){
  const box=document.getElementById('dash-login-widget');
  if(!box) return;
  try{
    const data=await sbQ('activity_log','action=eq.Login&order=created_at.desc&limit=40');
    if(!Array.isArray(data)){ box.innerHTML=''; return; }
    const byDevice={};
    data.forEach(e=>{ (byDevice[e.device_id]=byDevice[e.device_id]||new Set()).add(e.actor_name); });
    const shared=Object.entries(byDevice).filter(([,names])=>names.size>1);
    const recent=data.slice(0,6);
    box.innerHTML=`<div class="card">
      <div class="ct"><span>🔐 Recent Logins</span><span onclick="navTo('syslog')" style="font-size:11px;color:var(--ac);cursor:pointer;font-weight:600">Full system log →</span></div>
      ${shared.length?`<div style="background:var(--rb);border-radius:12px;padding:10px 12px;margin-bottom:10px;font-size:11.5px;color:var(--r);font-weight:600">⚠ ${shared.length} device${shared.length>1?'s have':' has'} been used to log in as more than one account — check System Log</div>`:''}
      ${recent.map(e=>{
        const m=DB.team.find(x=>x.name===e.actor_name);
        const flagged=byDevice[e.device_id]&&byDevice[e.device_id].size>1;
        return`<div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid var(--bd)">
          ${m?`<span style="width:24px;height:24px;border-radius:50%;background:${m.color};display:inline-flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:#fff;flex-shrink:0">${m.av}</span>`:'<span style="width:24px;height:24px;border-radius:50%;background:var(--s2);flex-shrink:0"></span>'}
          <span style="flex:1;font-size:12.5px;font-weight:600">${e.actor_name||'Unknown'}${flagged?' <span style="color:var(--r)" title="Device also used by another account">⚠</span>':''}</span>
          <span style="font-size:10.5px;color:var(--tx3)">${fr?fr(e.created_at):new Date(e.created_at).toLocaleString()}</span>
        </div>`;
      }).join('')}
    </div>`;
  }catch(err){ box.innerHTML=''; }
}

// ══════════════════════════════════════════════════════════════════════
// SYSTEM LOG — reads from Supabase (activity_log), visible to every
// admin regardless of device/browser. Flags devices shared across
// more than one account.
// ══════════════════════════════════════════════════════════════════════
let _syslogCache=[];

function rSyslog(el){
  if(!isAdmin()){
    el.innerHTML=`<div class="empty"><div class="ei">🔒</div><div class="et">Admin only</div></div>`;
    return;
  }
  el.innerHTML=`<div class="loading-sc"><div class="loader"></div><div class="loading-tx">Loading activity log from the database…</div></div>`;
  loadSyslogData();
}

async function loadSyslogData(){
  const data=await sbQ('activity_log','order=created_at.desc&limit=1000');
  if(!Array.isArray(data)){
    const el=document.getElementById('content');
    if(el && page==='syslog') el.innerHTML=`<div class="empty">
      <div class="ei">🗄</div>
      <div class="et">Activity Log table not set up yet</div>
      <div class="es" style="max-width:420px;margin:0 auto">Run the <code>activity_log</code> setup SQL once in your Supabase SQL editor, then click Refresh. Every action across the whole team will then be logged here with timestamps — not just on this device.</div>
      <button class="btn bp bsm" style="margin-top:14px" onclick="loadSyslogData()">🔄 Retry</button>
    </div>`;
    return;
  }
  _syslogCache=data;
  renderSyslogPage();
}

function parseUA(ua){
  ua=ua||'';
  let browser='Unknown',os='Unknown';
  if(/Edg\//.test(ua))browser='Edge';
  else if(/Chrome\//.test(ua)&&!/Chromium/.test(ua))browser='Chrome';
  else if(/Firefox\//.test(ua))browser='Firefox';
  else if(/Safari\//.test(ua)&&!/Chrome/.test(ua))browser='Safari';
  if(/Windows/.test(ua))os='Windows';
  else if(/Mac OS/.test(ua))os='macOS';
  else if(/Android/.test(ua))os='Android';
  else if(/iPhone|iPad/.test(ua))os='iOS';
  else if(/Linux/.test(ua))os='Linux';
  return browser==='Unknown'&&os==='Unknown'?'—':`${browser} · ${os}`;
}

function renderSyslogPage(){
  const el=document.getElementById('content');
  if(!el||page!=='syslog')return;
  const data=_syslogCache;

  const logins=data.filter(e=>e.action==='Login');
  const byDevice={};
  logins.forEach(e=>{ (byDevice[e.device_id]=byDevice[e.device_id]||new Set()).add(e.actor_name); });
  const sharedDevices=Object.entries(byDevice).filter(([,names])=>names.size>1);

  const fMember=document.getElementById('lf-member')?.value||'';
  const fAction=document.getElementById('lf-action')?.value||'';
  const fSev=document.getElementById('lf-sev')?.value||'';
  const fSearch=(document.getElementById('lf-search')?.value||'').toLowerCase();

  let f=data.filter(e=>{
    if(fMember&&e.actor_name!==fMember)return false;
    if(fAction&&!(e.action||'').toLowerCase().includes(fAction.toLowerCase()))return false;
    if(fSev&&e.severity!==fSev)return false;
    if(fSearch&&!((e.event||'').toLowerCase().includes(fSearch)||(e.action||'').toLowerCase().includes(fSearch)||(e.actor_name||'').toLowerCase().includes(fSearch)))return false;
    return true;
  });

  const members=[...new Set(data.map(e=>e.actor_name).filter(Boolean))].sort();
  const actions=[...new Set(data.map(e=>e.action).filter(Boolean))].sort();

  let h=`<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:10px">
    <div><div style="font-size:20px;font-weight:500">▤ System Log</div><div style="font-size:12px;color:var(--tx3)">${data.length} events from the database · every user, every device</div></div>
    <button class="btn bg2 bsm" onclick="loadSyslogData()">🔄 Refresh</button>
  </div>`;

  if(sharedDevices.length){
    h+=`<div style="background:var(--rb);border-radius:16px;padding:14px 16px;margin-bottom:16px">
      <div style="font-size:13px;font-weight:700;color:var(--r);margin-bottom:8px">⚠ ${sharedDevices.length} device${sharedDevices.length>1?'s':''} used to log in as more than one account</div>
      <div style="display:flex;flex-direction:column;gap:6px">
        ${sharedDevices.map(([dev,names])=>`<div style="font-size:12px;color:var(--tx2)"><code style="background:var(--s);padding:1px 7px;border-radius:6px;font-size:10px">${(dev||'?').slice(0,16)}…</code> → ${[...names].join(', ')}</div>`).join('')}
      </div>
      <div style="font-size:10.5px;color:var(--tx3);margin-top:8px">Heuristic based on browser device fingerprint — a shared work computer can trigger this legitimately, review before assuming credential sharing.</div>
    </div>`;
  }

  h+=`<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px">
    <input id="lf-search" placeholder="🔍 Search…" oninput="renderSyslogPage()" value="${fSearch}" style="padding:9px 16px;background:var(--s2);border:1px solid transparent;border-radius:100px;font-size:12.5px;outline:none;min-width:170px;font-family:var(--fn)">
    <select id="lf-member" onchange="renderSyslogPage()" style="padding:9px 16px;background:var(--s2);border-radius:100px;border:none;font-size:12.5px"><option value="">All members</option>${members.map(m=>`<option ${fMember===m?'selected':''}>${m}</option>`).join('')}</select>
    <select id="lf-action" onchange="renderSyslogPage()" style="padding:9px 16px;background:var(--s2);border-radius:100px;border:none;font-size:12.5px"><option value="">All actions</option>${actions.map(a=>`<option ${fAction===a?'selected':''}>${a}</option>`).join('')}</select>
    <select id="lf-sev" onchange="renderSyslogPage()" style="padding:9px 16px;background:var(--s2);border-radius:100px;border:none;font-size:12.5px"><option value="">All severity</option>${['Info','Success','Warning','Error'].map(s=>`<option ${fSev===s?'selected':''}>${s}</option>`).join('')}</select>
  </div>`;

  if(!f.length){
    h+=`<div class="empty"><div class="ei">▤</div><div class="et">No matching events</div></div>`;
  } else {
    const sc={Info:'var(--tx3)',Success:'var(--g)',Warning:'var(--y)',Error:'var(--r)'};
    h+=`<div class="tw"><table><thead><tr><th>Time</th><th>Actor</th><th>Action</th><th>Event</th><th>Device</th><th>Severity</th></tr></thead><tbody>`;
    h+=f.slice(0,400).map(e=>{
      const m=DB.team.find(x=>x.name===e.actor_name);
      const devFlag=byDevice[e.device_id]&&byDevice[e.device_id].size>1;
      return`<tr>
        <td style="font-family:var(--fnm);font-size:10.5px;color:var(--tx3);white-space:nowrap">${fdt?fdt(e.created_at):e.created_at}</td>
        <td style="font-size:12px">${m?`<span style="display:inline-flex;align-items:center;gap:5px"><span style="width:18px;height:18px;border-radius:50%;background:${m.color};display:inline-flex;align-items:center;justify-content:center;font-size:7px;color:#fff;font-weight:700">${m.av}</span>${e.actor_name}</span>`:(e.actor_name||'—')}</td>
        <td style="font-size:12px;font-weight:600">${e.action||'—'}${devFlag&&e.action==='Login'?' <span title="This device has logged in as multiple accounts" style="color:var(--r)">⚠</span>':''}</td>
        <td style="font-size:11.5px;color:var(--tx2);max-width:320px">${e.event||''}</td>
        <td style="font-size:10.5px;color:var(--tx3)">${parseUA(e.user_agent)}</td>
        <td><span style="font-size:10px;font-weight:700;color:${sc[e.severity]||'var(--tx3)'};background:${sc[e.severity]||'var(--tx3)'}18;padding:2px 9px;border-radius:100px">${e.severity||'Info'}</span></td>
      </tr>`;
    }).join('')+`</tbody></table></div>`;
    if(f.length>400) h+=`<div style="text-align:center;padding:10px;font-size:11px;color:var(--tx3)">Showing first 400 of ${f.length} matches</div>`;
  }
  el.innerHTML=h;
}

// ══════════════════════════════════════════════════════════════════════
// DEVICE FINGERPRINT + DATABASE-BACKED ACTIVITY LOG WIRING
// ══════════════════════════════════════════════════════════════════════
function getDeviceId(){
  let id=localStorage.getItem('vas_device_id');
  if(!id){
    id='dev_'+Math.random().toString(36).slice(2,10)+Date.now().toString(36);
    localStorage.setItem('vas_device_id',id);
  }
  return id;
}

// Override nLog so every EXISTING logAction() call across the whole app
// (tasks, meetings, HR comms, library, backlog, logins, everything)
// also persists to the activity_log Supabase table — silently, so it
// never spams a toast if the table hasn't been created yet.
async function nLog(e){
  try{
    await fetch(`${SB_URL}/rest/v1/activity_log`,{
      method:'POST',
      headers:{...SB_HEADERS,'Prefer':'return=minimal'},
      body:JSON.stringify({
        actor_id:e.actorId||'', actor_name:e.actor||'System', actor_role:e.actorRole||'',
        action:e.action||'', event:e.event||'', target:e.target||'', details:e.details||'',
        severity:e.severity||'Info', device_id:getDeviceId(), user_agent:navigator.userAgent,
        meta:{memberId:e.memberId,memberName:e.memberName,taskId:e.taskId,taskTitle:e.taskTitle,
              projectId:e.projectId,projectName:e.projectName,serviceId:e.serviceId,serviceName:e.serviceName,
              operatorId:e.operatorId,operatorName:e.operatorName,meetingId:e.meetingId}
      })
    });
  }catch(err){ /* silent — table probably not set up yet, see SQL at bottom of this file */ }
}

// Wrap startApp (assignment, not a `function` redeclaration, so hoisting
// can't clobber the original before we capture it) to surface a warning
// if this device previously logged in as a different account.
(function(){
  const _origStartApp = startApp;
  startApp = async function(){
    const r = await _origStartApp.apply(this, arguments);
    try{
      const devId=getDeviceId();
      const prior=await sbQ('activity_log',`action=eq.Login&device_id=eq.${devId}&order=created_at.desc&limit=30`);
      if(Array.isArray(prior)){
        const others=[...new Set(prior.map(p=>p.actor_name).filter(n=>n&&n!==CU?.name))];
        if(others.length) toast(`⚠ This device previously logged in as: ${others.join(', ')}`,'bad',9000);
      }
    }catch(err){}
    startHeartbeat();
    startDayReportChecker();
    injectDailyReportNavItem();
    return r;
  };
})();

// ── Sidebar item: "Daily Report" (admin only) + routing ─────────────────
function injectDailyReportNavItem(){
  if(!isAdmin()) return;
  if(document.querySelector('[data-p="dailyreport"]')) return;
  const anchor=document.querySelector('[data-p="backlog"]')||document.querySelector('[data-p="team"]')||document.querySelector('[data-p="dash"]');
  if(!anchor) return;
  const item=document.createElement('div');
  item.className='ni';
  item.id='nav-dr';
  item.setAttribute('data-p','dailyreport');
  item.innerHTML='<span class="ni-i">📋</span>Daily Report';
  item.addEventListener('click',()=>nav('dailyreport',item));
  anchor.insertAdjacentElement('afterend',item);
}

(function(){
  const _origNav=nav;
  nav=function(p,el,f){
    if(p==='dailyreport'){
      page='dailyreport'; _editId=null; window._navF=f||null;
      const ptEl=document.getElementById('page-title-display'); if(ptEl) ptEl.textContent='Daily Report';
      document.querySelectorAll('.ni').forEach(n=>n.classList.remove('on'));
      if(el) el.classList.add('on');
      const tbT=document.getElementById('tb-t'); if(tbT) tbT.textContent='Daily Report';
      const btn=document.getElementById('tb-btn'); if(btn) btn.style.display='none';
      if(typeof closeND==='function') closeND();
      if(typeof closeSP==='function') closeSP();
      const c=document.getElementById('content');
      if(c){ c.innerHTML=''; rDailyReportPage(c); }
      return;
    }
    return _origNav(p,el,f);
  };
})();

function dayBoundsISO(dateStr){
  const start=new Date(dateStr+'T00:00:00');
  const end=new Date(start); end.setDate(end.getDate()+1);
  return{start:start.toISOString(),end:end.toISOString()};
}

async function fetchActivityForDate(dateStr){
  try{
    const {start,end}=dayBoundsISO(dateStr);
    const data=await sbQ('activity_log',`created_at=gte.${encodeURIComponent(start)}&created_at=lt.${encodeURIComponent(end)}&action=in.(Heartbeat,Login)&order=created_at.asc&limit=5000`);
    if(!Array.isArray(data)) return null;
    const byMember={};
    data.forEach(e=>{
      const key=e.actor_name||'Unknown';
      (byMember[key]=byMember[key]||{heartbeats:[],logins:[]});
      if(e.action==='Heartbeat') byMember[key].heartbeats.push(e.created_at);
      else if(e.action==='Login') byMember[key].logins.push(e.created_at);
    });
    return byMember;
  }catch(e){ return null; }
}

function rDailyReportPage(el){
  if(!isAdmin()){
    el.innerHTML=`<div class="empty"><div class="ei">🔒</div><div class="et">Admin only</div></div>`;
    return;
  }
  const today=new Date().toISOString().split('T')[0];
  const selDate=window._drSelDate||today;
  window._drSelDate=selDate;

  el.innerHTML=`<div class="loading-sc"><div class="loader"></div><div class="loading-tx">Loading daily report…</div></div>`;
  renderDailyReportPage();
}

async function renderDailyReportPage(){
  const el=document.getElementById('content');
  if(!el||page!=='dailyreport') return;
  const selDate=window._drSelDate||new Date().toISOString().split('T')[0];
  const isToday=selDate===new Date().toISOString().split('T')[0];
  const activity=await fetchActivityForDate(selDate);
  if(!el||page!=='dailyreport') return; // guard against a nav change while fetch was in flight

  if(!activity){
    el.innerHTML=`<div class="empty">
      <div class="ei">🗄</div>
      <div class="et">Activity Log table not set up yet</div>
      <div class="es" style="max-width:420px;margin:0 auto">Daily Report reads from the same <code>activity_log</code> table as the System Log. Run its setup SQL once, then refresh.</div>
    </div>`;
    return;
  }

  const members=DB.team;
  const rows=members.map(m=>{
    const a=activity[m.name]||{heartbeats:[],logins:[]};
    const doneOnDate=DB.tasks.filter(t=>t.status==='Done'&&t.tsReviewed&&t.tsReviewed.slice(0,10)===selDate&&(t.assignedTo===m.id||(t.assignees||[]).includes(m.id))).length;
    const task=memberTaskSummary(m.id,m.name);
    return{m,activeMin:computeActiveMinutes(a.heartbeats),loggedIn:a.logins.length>0,firstLogin:a.logins[0]||null,doneOnDate,...task};
  });

  const loggedInCount=rows.filter(r=>r.loggedIn).length;
  const avgActive=rows.filter(r=>r.loggedIn).length?Math.round(rows.filter(r=>r.loggedIn).reduce((s,r)=>s+r.activeMin,0)/rows.filter(r=>r.loggedIn).length):0;
  const totalDone=rows.reduce((s,r)=>s+r.doneOnDate,0);

  let h=`<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:10px">
    <div>
      <div style="font-size:20px;font-weight:500">📋 Daily Report</div>
      <div style="font-size:12px;color:var(--tx3)">Attendance and activity, per member${isToday?' · live, updates as the day goes on':''}</div>
    </div>
    <div style="display:flex;gap:8px;align-items:center">
      <input type="date" id="dr-date" value="${selDate}" max="${new Date().toISOString().split('T')[0]}" onchange="window._drSelDate=this.value;renderDailyReportPage()" style="padding:8px 12px;background:var(--s2);border:1px solid transparent;border-radius:10px;font-size:12.5px;outline:none;font-family:var(--fn)">
      ${!isToday?`<button class="btn bg2 bsm" onclick="window._drSelDate=new Date().toISOString().split('T')[0];renderDailyReportPage()">Today</button>`:`<button class="btn bg2 bsm" onclick="renderDailyReportPage()">🔄 Refresh</button>`}
    </div>
  </div>`;

  h+=`<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px">
    <div style="background:var(--s);border:1px solid var(--bd);border-radius:16px;padding:16px">
      <div style="font-size:11px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px">Logged In</div>
      <div style="font-size:28px;font-weight:500;color:var(--ac);line-height:1">${loggedInCount}<span style="font-size:15px;color:var(--tx3);font-weight:500"> / ${members.length}</span></div>
    </div>
    <div style="background:var(--s);border:1px solid var(--bd);border-radius:16px;padding:16px">
      <div style="font-size:11px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px">Avg Time In System</div>
      <div style="font-size:28px;font-weight:500;color:var(--p);line-height:1">${fmtMinutes(avgActive)}</div>
    </div>
    <div style="background:var(--s);border:1px solid var(--bd);border-radius:16px;padding:16px">
      <div style="font-size:11px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px">Tasks Completed</div>
      <div style="font-size:28px;font-weight:500;color:var(--g);line-height:1">${totalDone}</div>
    </div>
  </div>`;

  h+=`<div class="card">
    <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap">
      <input id="dr-search" placeholder="🔍 Filter members…" oninput="filterDailyReportRows()" style="flex:1;min-width:160px;padding:8px 14px;background:var(--s2);border:1px solid transparent;border-radius:100px;font-size:12.5px;outline:none">
      <label style="display:flex;align-items:center;gap:6px;font-size:12.5px;color:var(--tx2);cursor:pointer">
        <input type="checkbox" id="dr-only-absent" onchange="filterDailyReportRows()"> Not logged in only
      </label>
    </div>
    <div id="dr-table-wrap"></div>
  </div>`;

  el.innerHTML=h;
  window._drRows=rows;
  window._drIsToday=isToday;
  window.filterDailyReportRows();
}

window.filterDailyReportRows=function(){
  const wrap=document.getElementById('dr-table-wrap');
  if(!wrap) return;
  const q=(document.getElementById('dr-search')?.value||'').toLowerCase();
  const onlyAbsent=document.getElementById('dr-only-absent')?.checked;
  let rows=window._drRows||[];
  if(q) rows=rows.filter(r=>r.m.name.toLowerCase().includes(q));
  if(onlyAbsent) rows=rows.filter(r=>!r.loggedIn);

  if(!rows.length){
    wrap.innerHTML=`<div style="text-align:center;padding:20px;font-size:12px;color:var(--tx3)">No members match</div>`;
    return;
  }

  const isToday=window._drIsToday;
  wrap.innerHTML=`<div class="tw"><table><thead><tr>
    <th>Member</th><th>Role</th><th>Logged In</th><th>First Login</th>${isToday?'<th>Active Tasks</th><th>Overdue</th>':''}<th>Completed</th><th>Time In System</th>
  </tr></thead><tbody>
    ${rows.map(r=>`<tr class="cl" onclick="openMemberDetail('${r.m.id}')">
      <td><span style="display:flex;align-items:center;gap:8px"><span style="width:26px;height:26px;border-radius:50%;background:${r.m.color};display:inline-flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:#fff;flex-shrink:0">${r.m.av}</span><span style="font-size:13px;font-weight:600">${r.m.name}</span></span></td>
      <td style="font-size:12px;color:var(--tx3)">${r.m.role||'—'}</td>
      <td>${r.loggedIn?`<span style="background:var(--gb);color:var(--g);font-size:10px;font-weight:700;padding:2px 9px;border-radius:100px">✓ Yes</span>`:`<span style="background:var(--rb);color:var(--r);font-size:10px;font-weight:700;padding:2px 9px;border-radius:100px">✗ No</span>`}</td>
      <td style="font-size:11.5px;color:var(--tx2);font-family:var(--fnm)">${r.firstLogin?new Date(r.firstLogin).toLocaleTimeString('en',{hour:'2-digit',minute:'2-digit'}):'—'}</td>
      ${isToday?`<td style="font-size:13px;font-weight:600">${r.active}</td><td style="${r.overdue?'color:var(--r);font-weight:700':'color:var(--tx3)'}">${r.overdue||'—'}</td>`:''}
      <td style="color:var(--g);font-weight:600">${r.doneOnDate||'—'}</td>
      <td style="font-size:12px;color:var(--tx2);font-weight:600">${r.loggedIn?fmtMinutes(r.activeMin):'—'}</td>
    </tr>`).join('')}
  </tbody></table></div>`;
};

// ══════════════════════════════════════════════════════════════════════
// DAY REPORT — per-member end-of-day activity summary (task status,
// time last logged in, time spent in the system today), visible on the
// member's own dashboard from 4:30pm onward, and on the admin dashboard
// for every member at any time. Built entirely on top of the activity_log
// table already set up for the System Log — no further setup needed.
// ══════════════════════════════════════════════════════════════════════
const HEARTBEAT_MIN=3;          // how often we ping while the tab is visible
const DAY_REPORT_CUTOFF_H=16;   // 4:30pm
const DAY_REPORT_CUTOFF_M=30;

let _heartbeatTimer=null;
function startHeartbeat(){
  if(_heartbeatTimer||!CU) return;
  const ping=async()=>{
    if(document.visibilityState!=='visible'||!CU) return;
    try{
      await fetch(`${SB_URL}/rest/v1/activity_log`,{
        method:'POST',
        headers:{...SB_HEADERS,'Prefer':'return=minimal'},
        body:JSON.stringify({
          actor_id:CU.id||'', actor_name:CU.name||'', actor_role:CU.role||'',
          action:'Heartbeat', event:'', target:'', details:'',
          severity:'Info', device_id:getDeviceId(), user_agent:navigator.userAgent, meta:{}
        })
      });
    }catch(e){ /* silent — table may not be set up yet */ }
  };
  ping();
  _heartbeatTimer=setInterval(ping,HEARTBEAT_MIN*60*1000);
}

function isPastDayReportCutoff(){
  const n=new Date();
  return n.getHours()>DAY_REPORT_CUTOFF_H || (n.getHours()===DAY_REPORT_CUTOFF_H && n.getMinutes()>=DAY_REPORT_CUTOFF_M);
}

// One toast the moment 4:30pm passes while the tab is open, so members
// don't have to be looking at the dashboard already to notice.
let _dayReportCheckerTimer=null;
function startDayReportChecker(){
  if(_dayReportCheckerTimer) return;
  const key='vas_day_report_shown_'+(CU?.id||'guest')+'_'+new Date().toISOString().split('T')[0];
  const check=()=>{
    if(isPastDayReportCutoff() && !localStorage.getItem(key)){
      localStorage.setItem(key,'1');
      toast('📋 Your Day Report is ready — check your dashboard','inf',7000);
      if(page==='dash') nav('dash',document.querySelector('[data-p="dash"]'));
    }
  };
  check();
  _dayReportCheckerTimer=setInterval(check,60000);
}

function todayStartISO(){
  const d=new Date(); d.setHours(0,0,0,0);
  return d.toISOString();
}

// Sum up real "active" minutes from a sorted list of heartbeat timestamps —
// gaps larger than 2x the heartbeat interval mean the tab was closed/hidden
// and don't count as active time.
function computeActiveMinutes(timestamps){
  if(!timestamps.length) return 0;
  let total=Math.min(HEARTBEAT_MIN,5);
  for(let i=1;i<timestamps.length;i++){
    const gapMin=(new Date(timestamps[i])-new Date(timestamps[i-1]))/60000;
    if(gapMin>0 && gapMin<=HEARTBEAT_MIN*2) total+=gapMin;
  }
  return Math.round(total);
}

function fmtMinutes(min){
  if(min<1) return 'less than a minute';
  if(min<60) return min+'m';
  const h=Math.floor(min/60), m=min%60;
  return h+'h'+(m?' '+m+'m':'');
}

// One shared fetch: every Login + Heartbeat event across the WHOLE team
// since midnight today, grouped by member — avoids one query per member.
async function fetchTodayActivityAll(){
  try{
    const since=todayStartISO();
    const data=await sbQ('activity_log',`created_at=gte.${encodeURIComponent(since)}&action=in.(Heartbeat,Login)&order=created_at.asc&limit=5000`);
    if(!Array.isArray(data)) return null;
    const byMember={};
    data.forEach(e=>{
      const key=e.actor_name||'Unknown';
      (byMember[key]=byMember[key]||{heartbeats:[],logins:[]});
      if(e.action==='Heartbeat') byMember[key].heartbeats.push(e.created_at);
      else if(e.action==='Login') byMember[key].logins.push(e.created_at);
    });
    return byMember;
  }catch(e){ return null; }
}

// Most recent Login for a member strictly BEFORE today — i.e. their last
// session prior to today's, so we can say "you were last active on...".
async function fetchLastLoginBeforeToday(memberName){
  try{
    const since=todayStartISO();
    const rows=await sbQ('activity_log',`action=eq.Login&actor_name=eq.${encodeURIComponent(memberName)}&created_at=lt.${encodeURIComponent(since)}&order=created_at.desc&limit=1`);
    return Array.isArray(rows)&&rows.length?rows[0].created_at:null;
  }catch(e){ return null; }
}

function memberTaskSummary(memberId,memberName){
  const mine=DB.tasks.filter(t=>t.assignedTo===memberId||(t.assignees||[]).includes(memberId)||(t.assignedTo||'').toLowerCase()===(memberName||'').toLowerCase());
  const active=mine.filter(t=>!['Done','Cancelled'].includes(t.status));
  const overdue=active.filter(t=>getDueStatus(t).key==='overdue');
  const doneToday=mine.filter(t=>t.status==='Done'&&t.tsReviewed&&t.tsReviewed.slice(0,10)===new Date().toISOString().split('T')[0]);
  return{active:active.length,overdue:overdue.length,doneToday:doneToday.length};
}

async function loadDayReportCard(){
  const box=document.getElementById('day-report-card');
  if(!box||!CU) return;
  if(!isPastDayReportCutoff()){ box.innerHTML=''; return; }
  try{
    const [allActivity,lastLoginBefore]=await Promise.all([
      fetchTodayActivityAll(),
      fetchLastLoginBeforeToday(CU.name)
    ]);
    if(!allActivity){ box.innerHTML=''; return; }
    const mine=allActivity[CU.name]||{heartbeats:[],logins:[]};
    const activeMin=computeActiveMinutes(mine.heartbeats);
    const task=memberTaskSummary(CU.id,CU.name);
    const lastLoginText=lastLoginBefore?fr(lastLoginBefore):null;

    box.innerHTML=`<div style="background:linear-gradient(135deg,#1A2B6B,#3762E4);border-radius:16px;padding:18px 20px;margin-bottom:14px;color:#fff">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
        <span style="font-size:18px">📋</span>
        <span style="font-size:14px;font-weight:700">Day Report — ${CU.name}</span>
        <span style="margin-left:auto;font-size:10.5px;color:#C7D6FF;font-weight:600">as of ${new Date().toLocaleTimeString('en',{hour:'2-digit',minute:'2-digit'})}</span>
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px">
        <div style="background:rgba(255,255,255,.1);border-radius:12px;padding:12px">
          <div style="font-size:10px;font-weight:700;color:#C7D6FF;text-transform:uppercase;letter-spacing:.05em;margin-bottom:5px">Task Status</div>
          <div style="font-size:13px;font-weight:600">${task.active} active${task.overdue?` · <span style="color:#FCA5A5">${task.overdue} overdue</span>`:''}</div>
          <div style="font-size:11px;color:#C7D6FF;margin-top:2px">${task.doneToday} completed today</div>
        </div>
        <div style="background:rgba(255,255,255,.1);border-radius:12px;padding:12px">
          <div style="font-size:10px;font-weight:700;color:#C7D6FF;text-transform:uppercase;letter-spacing:.05em;margin-bottom:5px">Previous Login</div>
          <div style="font-size:13px;font-weight:600">${lastLoginText?lastLoginText:'No earlier session found'}</div>
        </div>
        <div style="background:rgba(255,255,255,.1);border-radius:12px;padding:12px">
          <div style="font-size:10px;font-weight:700;color:#C7D6FF;text-transform:uppercase;letter-spacing:.05em;margin-bottom:5px">Time In System Today</div>
          <div style="font-size:13px;font-weight:600">${fmtMinutes(activeMin)}</div>
        </div>
      </div>
    </div>`;
  }catch(err){ box.innerHTML=''; }
}

async function loadTeamDayReport(){
  const box=document.getElementById('team-day-report');
  if(!box) return;
  try{
    const allActivity=await fetchTodayActivityAll();
    if(!allActivity){
      box.innerHTML='';
      return;
    }
    const members=DB.team;
    const rowsData=members.map(m=>{
      const a=allActivity[m.name]||{heartbeats:[],logins:[]};
      const task=memberTaskSummary(m.id,m.name);
      return{m,activeMin:computeActiveMinutes(a.heartbeats),loggedInToday:a.logins.length>0,...task};
    });

    box.innerHTML=`<div class="card">
      <div class="ct"><span class="ct-t">📋 Team Day Report</span><span style="font-size:11px;color:var(--tx3);font-weight:500">today's activity, per member</span></div>
      <div style="display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap">
        <input id="tdr-search" placeholder="🔍 Filter members…" oninput="renderTeamDayReportRows()" style="flex:1;min-width:160px;padding:7px 12px;background:var(--s2);border:1px solid var(--bd);border-radius:8px;font-size:12px;outline:none">
        <label style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--tx2);cursor:pointer">
          <input type="checkbox" id="tdr-only-inactive" onchange="renderTeamDayReportRows()"> Not logged in today only
        </label>
      </div>
      <div id="tdr-table-wrap"></div>
    </div>`;

    window._tdrRows=rowsData;
    window.renderTeamDayReportRows=function(){
      const wrap=document.getElementById('tdr-table-wrap');
      if(!wrap) return;
      const q=(document.getElementById('tdr-search')?.value||'').toLowerCase();
      const onlyInactive=document.getElementById('tdr-only-inactive')?.checked;
      let rows=window._tdrRows||[];
      if(q) rows=rows.filter(r=>r.m.name.toLowerCase().includes(q));
      if(onlyInactive) rows=rows.filter(r=>!r.loggedInToday);

      if(!rows.length){
        wrap.innerHTML=`<div style="text-align:center;padding:16px;font-size:12px;color:var(--tx3)">No members match</div>`;
        return;
      }

      wrap.innerHTML=`<div class="tw"><table><thead><tr>
        <th>Member</th><th>Logged In Today</th><th>Active Tasks</th><th>Overdue</th><th>Done Today</th><th>Time In System</th>
      </tr></thead><tbody>
        ${rows.map(r=>`<tr class="cl" onclick="openMemberDetail('${r.m.id}')">
          <td><span style="display:flex;align-items:center;gap:8px"><span style="width:26px;height:26px;border-radius:50%;background:${r.m.color};display:inline-flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:#fff;flex-shrink:0">${r.m.av}</span><span style="font-size:13px;font-weight:600">${r.m.name}</span></span></td>
          <td>${r.loggedInToday?`<span style="background:var(--gb);color:var(--g);font-size:10px;font-weight:700;padding:2px 9px;border-radius:100px">✓ Yes</span>`:`<span style="background:var(--rb);color:var(--r);font-size:10px;font-weight:700;padding:2px 9px;border-radius:100px">✗ No</span>`}</td>
          <td style="font-size:13px;font-weight:600">${r.active}</td>
          <td style="${r.overdue?'color:var(--r);font-weight:700':'color:var(--tx3)'}">${r.overdue||'—'}</td>
          <td style="color:var(--g);font-weight:600">${r.doneToday||'—'}</td>
          <td style="font-size:12px;color:var(--tx2);font-weight:600">${r.loggedInToday?fmtMinutes(r.activeMin):'—'}</td>
        </tr>`).join('')}
      </tbody></table></div>`;
    };
    window.renderTeamDayReportRows();
  }catch(err){ if(box) box.innerHTML=''; }
}

/* ════════════════════════════════════════════════════════════════════
   ONE-TIME SUPABASE SETUP — run this once in your Supabase SQL editor
   to unlock the System Log page + device-sharing detection above.
   Nothing else in this file depends on it; everything else already works.
   ════════════════════════════════════════════════════════════════════

create table if not exists activity_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  actor_id text,
  actor_name text,
  actor_role text,
  action text,
  event text,
  target text,
  details text,
  severity text default 'Info',
  device_id text,
  user_agent text,
  meta jsonb default '{}'::jsonb
);

alter table activity_log enable row level security;

create policy "activity_log_select_anon" on activity_log
  for select using (true);

create policy "activity_log_insert_anon" on activity_log
  for insert with check (true);

   ════════════════════════════════════════════════════════════════════ */
