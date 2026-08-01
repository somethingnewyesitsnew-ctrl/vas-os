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
function rDash(el){
  const todayStr=new Date().toISOString().split('T')[0];
  const now=new Date();
  const allTasks=DB.tasks;
  const activeTasks=allTasks.filter(t=>!['Done','Cancelled'].includes(t.status));
  const doneTasks=allTasks.filter(t=>t.status==='Done');
  const overdue=activeTasks.filter(t=>getDueStatus(t).key==='overdue');
  const inRange=(ts,from,to)=>{if(!ts)return false;const d=new Date(ts);return d>=from&&d<to;};

  const d7=new Date(now); d7.setDate(now.getDate()-7);
  const d14=new Date(now); d14.setDate(now.getDate()-14);
  const createdThis7=allTasks.filter(t=>inRange(t.tsCreated,d7,now)).length;
  const createdPrev7=allTasks.filter(t=>inRange(t.tsCreated,d14,d7)).length;
  const doneThis7=doneTasks.filter(t=>inRange(t.tsReviewed,d7,now)).length;
  const donePrev7=doneTasks.filter(t=>inRange(t.tsReviewed,d14,d7)).length;
  const rejThis7=allTasks.filter(t=>(t.rejections||[]).some(r=>inRange(r.at,d7,now))).length;
  const rejPrev7=allTasks.filter(t=>(t.rejections||[]).some(r=>inRange(r.at,d14,d7))).length;
  const cycleThis7=doneTasks.filter(t=>t.cycleH&&inRange(t.tsReviewed,d7,now));
  const cyclePrev7=doneTasks.filter(t=>t.cycleH&&inRange(t.tsReviewed,d14,d7));
  const avgCycleThis7=cycleThis7.length?Math.round(cycleThis7.reduce((a,t)=>a+t.cycleH,0)/cycleThis7.length):0;
  const avgCyclePrev7=cyclePrev7.length?Math.round(cyclePrev7.reduce((a,t)=>a+t.cycleH,0)/cyclePrev7.length):0;
  const rateThis7=createdThis7?Math.round(doneThis7/createdThis7*100):(doneThis7?100:0);
  const ratePrev7=createdPrev7?Math.round(donePrev7/createdPrev7*100):(donePrev7?100:0);

  if(!isAdmin()){
    const mine=activeTasks.filter(t=>t.assignedTo===CU.id||t.assignees?.includes(CU.id)||(t.assignedTo||'').toLowerCase()===CU.name.toLowerCase());
    const myDone=doneTasks.filter(t=>t.assignedTo===CU.id||t.assignees?.includes(CU.id));
    const myOverdue=mine.filter(t=>getDueStatus(t).key==='overdue');
    const myRev=allTasks.filter(t=>(t.reviewer===CU.id)&&t.status==='Pending Review');
    const myDoneThis7=myDone.filter(t=>inRange(t.tsReviewed,d7,now)).length;
    const myDonePrev7=myDone.filter(t=>inRange(t.tsReviewed,d14,d7)).length;
    const todayMeetings=DB.meetings.filter(m=>m.meeting_date===todayStr&&m.status==='Scheduled'&&(m.created_by===CU.name||m.invitees?.includes(CU.name)));

    let h=`<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:18px">
      <div class="stat" onclick="navTo('mytasks')"><div class="st-bar" style="background:var(--ac)"></div><div class="st-lbl">My Active Tasks</div><div class="st-val" style="color:var(--ac)">${mine.length}</div><div class="st-sub">${myDone.length} completed all-time</div></div>
      <div class="stat" onclick="navTo('mytasks')"><div class="st-bar" style="background:${myOverdue.length?'var(--r)':'var(--g)'}"></div><div class="st-lbl">Overdue</div><div class="st-val" style="color:${myOverdue.length?'var(--r)':'var(--g)'}">${myOverdue.length}</div><div class="st-sub">${myOverdue.length?'needs attention':'all on track ✓'}</div></div>
      <div class="stat" onclick="navTo('toreview')"><div class="st-bar" style="background:var(--p)"></div><div class="st-lbl">To Review</div><div class="st-val" style="color:var(--p)">${myRev.length}</div><div class="st-sub">${myRev.length?'awaiting your review':'nothing pending'}</div></div>
      <div class="stat"><div class="st-bar" style="background:var(--g)"></div><div class="st-lbl">Done This Week</div><div class="st-val" style="color:var(--g)">${myDoneThis7}</div><div style="margin-top:3px">${deltaChip(myDoneThis7,myDonePrev7,false)}</div></div>
    </div>`;

    if(todayMeetings.length){
      h+=`<div class="card" style="margin-bottom:16px"><div class="ct">📅 Today's Meetings</div>
        ${todayMeetings.map(m=>`<div onclick="openMeetingDetail('${m.id}')" style="display:flex;align-items:center;gap:12px;padding:9px 0;border-bottom:1px solid var(--bd);cursor:pointer">
          <span style="font-size:15px;font-weight:700;color:var(--ac);width:48px;flex-shrink:0">${m.meeting_time||'—'}</span>
          <div style="flex:1"><div style="font-size:13px;font-weight:600">${m.title}</div><div style="font-size:11px;color:var(--tx3)">${m.location||m.meeting_type||''} · ${m.duration_minutes||60}min</div></div>
          ${spill(m.status)}
        </div>`).join('')}
      </div>`;
    }

    h+=`<div class="card"><div class="ct">📋 My Active Tasks</div>`;
    if(mine.length){
      h+=mine.slice(0,8).map(t=>{const ds=getDueStatus(t);return`<div onclick="openTask('${t.id}')" style="display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--bd);cursor:pointer">
        ${spill(t.status)}<span style="flex:1;font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${t.title}</span>${ppill(t.priority)}<span class="due-badge ${ds.cls}" style="flex-shrink:0">${ds.label}</span>
      </div>`;}).join('');
      if(mine.length>8) h+=`<div style="font-size:11px;color:var(--ac);margin-top:10px;cursor:pointer;font-weight:600" onclick="navTo('mytasks')">View all ${mine.length} tasks →</div>`;
    } else {
      h+=`<div style="text-align:center;padding:24px 0;font-size:12px;color:var(--tx3)">No active tasks — you're all clear! 🎉</div>`;
    }
    h+=`</div>`;
    el.innerHTML=h; return;
  }

  // ── ADMIN / CEO / HR / PM VIEW ──────────────────────────────────────
  const taskCompletionRate=allTasks.length?Math.round(doneTasks.length/allTasks.length*100):0;
  const overdueRate=activeTasks.length?Math.round(overdue.length/activeTasks.length*100):0;

  // KPI row with WoW deltas
  let h=`<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:14px">
    <div onclick="navTo('alltasks')" style="background:var(--s);border:1px solid var(--bd);border-radius:16px;padding:18px;cursor:pointer">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px"><span style="font-size:11px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.05em">Created (7d)</span>${deltaChip(createdThis7,createdPrev7,false)}</div>
      <div style="font-size:32px;font-weight:500;color:var(--tx);line-height:1">${createdThis7}</div>
      <div style="font-size:11px;color:var(--tx3);margin-top:4px">vs ${createdPrev7} prior week</div>
    </div>
    <div onclick="navTo('alltasks')" style="background:var(--s);border:1px solid var(--bd);border-radius:16px;padding:18px;cursor:pointer">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px"><span style="font-size:11px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.05em">Completed (7d)</span>${deltaChip(doneThis7,donePrev7,false)}</div>
      <div style="font-size:32px;font-weight:500;color:var(--g);line-height:1">${doneThis7}</div>
      <div style="font-size:11px;color:var(--tx3);margin-top:4px">vs ${donePrev7} prior week</div>
    </div>
    <div style="background:var(--s);border:1px solid var(--bd);border-radius:16px;padding:18px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px"><span style="font-size:11px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.05em">Weekly Close Rate</span>${deltaChip(rateThis7,ratePrev7,false)}</div>
      <div style="font-size:32px;font-weight:500;color:var(--ac);line-height:1">${rateThis7}%</div>
      <div style="font-size:11px;color:var(--tx3);margin-top:4px">vs ${ratePrev7}% prior week</div>
    </div>
    <div style="background:var(--s);border:1px solid var(--bd);border-radius:16px;padding:18px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px"><span style="font-size:11px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.05em">Avg Cycle Time</span>${deltaChip(avgCycleThis7,avgCyclePrev7,true)}</div>
      <div style="font-size:32px;font-weight:500;color:var(--p);line-height:1">${avgCycleThis7||'—'}${avgCycleThis7?'h':''}</div>
      <div style="font-size:11px;color:var(--tx3);margin-top:4px">vs ${avgCyclePrev7||'—'}${avgCyclePrev7?'h':''} prior week</div>
    </div>
  </div>`;

  h+=`<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px">
    <div onclick="navTo('alltasks')" style="background:linear-gradient(135deg,#1E3A8A,#3762E4);border-radius:16px;padding:18px;cursor:pointer;color:#fff">
      <div style="font-size:11px;font-weight:700;color:#C7D6FF;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px">Overall Completion</div>
      <div style="font-size:30px;font-weight:500;line-height:1;margin-bottom:5px">${taskCompletionRate}%</div>
      <div style="font-size:12px;color:#C7D6FF">${doneTasks.length} done of ${allTasks.length} total</div>
    </div>
    <div onclick="navTo('alltasks','Overdue')" style="background:${overdueRate>20?'linear-gradient(135deg,#7A1A15,#B3261E)':overdueRate>5?'linear-gradient(135deg,#6B3A00,#8A5300)':'linear-gradient(135deg,#0E4A22,#146C2E)'};border-radius:16px;padding:18px;cursor:pointer;color:#fff">
      <div style="font-size:11px;font-weight:700;color:rgba(255,255,255,.75);text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px">Overdue Rate</div>
      <div style="font-size:30px;font-weight:500;line-height:1;margin-bottom:5px">${overdueRate}%</div>
      <div style="font-size:12px;color:rgba(255,255,255,.85)">${overdue.length} tasks overdue · ${overdueRate<=5?'On Track':overdueRate<=20?'Watch':'Critical'}</div>
    </div>
    <div onclick="navTo('svctest')" style="background:linear-gradient(135deg,#3D2E6B,#6750A4);border-radius:16px;padding:18px;cursor:pointer;color:#fff">
      <div style="font-size:11px;font-weight:700;color:#DCCFFF;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px">Rejections (7d)</div>
      <div style="font-size:30px;font-weight:500;line-height:1;margin-bottom:5px">${rejThis7}</div>
      <div style="margin-top:2px">${deltaChip(rejThis7,rejPrev7,true)}</div>
    </div>
  </div>`;

  // ── 8-week velocity trend line chart ────────────────────────────────
  const weeks=Array.from({length:8},(_,i)=>{
    const end=new Date(now); end.setDate(now.getDate()-(7*(7-i)));
    const start=new Date(end); start.setDate(end.getDate()-7);
    return{
      label:end.toLocaleDateString('en',{day:'numeric',month:'short'}),
      created:allTasks.filter(t=>inRange(t.tsCreated,start,end)).length,
      completed:doneTasks.filter(t=>inRange(t.tsReviewed,start,end)).length,
    };
  });
  const newTasks=allTasks.filter(t=>t.status==='New');
  const inProg=allTasks.filter(t=>t.status==='In Progress');
  const pendingRev=allTasks.filter(t=>t.status==='Pending Review');
  const rejected=allTasks.filter(t=>t.status==='Rejected');

  h+=`<div style="display:grid;grid-template-columns:1.6fr 1fr;gap:14px;margin-bottom:16px">
    <div class="card">
      <div class="ct"><span>📈 Velocity — 8 Week Trend</span></div>
      ${svgLineChart(weeks.map(w=>w.label),[
        {label:'Created',color:'#3762E4',data:weeks.map(w=>w.created)},
        {label:'Completed',color:'#146C2E',data:weeks.map(w=>w.completed)},
      ])}
    </div>
    <div class="card">
      <div class="ct"><span>Status Mix</span></div>
      ${donut([
        {v:newTasks.length,label:'New',color:'#767B8D'},
        {v:inProg.length,label:'In Progress',color:'#3762E4'},
        {v:pendingRev.length,label:'Review',color:'#6750A4'},
        {v:doneTasks.length,label:'Done',color:'#146C2E'},
        {v:rejected.length,label:'Rejected',color:'#B3261E'},
      ],96)}
    </div>
  </div>`;

  // ── Team load + Priority mix ────────────────────────────────────────
  const teamLoad=DB.team.map(m=>{
    const mt=activeTasks.filter(t=>t.assignedTo===m.id||t.assignees?.includes(m.id));
    return{label:m.name.split(' ')[0],value:mt.length,color:mt.some(t=>getDueStatus(t).key==='overdue')?'#B3261E':mt.length>=5?'#8A5300':'#3762E4',id:m.id};
  }).filter(x=>x.value>0).sort((a,b)=>b.value-a.value).slice(0,8);

  h+=`<div style="display:grid;grid-template-columns:1.4fr 1fr;gap:14px;margin-bottom:16px">
    <div class="card">
      <div class="ct"><span>👥 Team Workload</span><span style="font-size:11px;color:var(--tx3);font-weight:500">active tasks per person</span></div>
      ${svgHBar(teamLoad.map(t=>({...t,onclick:`openMemberDetail('${t.id}')`})))}
    </div>
    <div class="card">
      <div class="ct">🎯 Priority Mix</div>
      ${['Critical','High','Medium','Low'].map(p=>{
        const c={Critical:'#B3261E',High:'#8A4A16',Medium:'#8A5300',Low:'#146C2E'}[p];
        const v=activeTasks.filter(t=>t.priority===p).length;
        const pct=activeTasks.length?Math.round(v/activeTasks.length*100):0;
        return`<div onclick="navTo('alltasks')" style="cursor:pointer;margin-bottom:11px">
          <div style="display:flex;justify-content:space-between;margin-bottom:4px"><span style="font-size:11.5px;font-weight:700;color:${c}">${p}</span><span style="font-size:13px;font-weight:700;color:${c}">${v}</span></div>
          <div style="height:7px;background:${c}18;border-radius:100px;overflow:hidden"><div style="height:100%;width:${pct}%;background:${c};border-radius:100px"></div></div>
        </div>`;
      }).join('')}
    </div>
  </div>`;

  // ── HR panel: meeting attendance trend + department headcount ──────
  const meetWeeks=Array.from({length:8},(_,i)=>{
    const end=new Date(now); end.setDate(now.getDate()-(7*(7-i)));
    const start=new Date(end); start.setDate(end.getDate()-7);
    const ms=DB.meetings.filter(m=>m.status==='Completed'&&inRange(m.meeting_date,start,end));
    let inv=0,pres=0;
    ms.forEach(m=>Object.values(m.attendance||{}).forEach(v=>{inv++;if(v==='present')pres++;}));
    return{label:end.toLocaleDateString('en',{day:'numeric',month:'short'}),value:inv?Math.round(pres/inv*100):null};
  });
  const deptCounts={};
  DB.team.forEach(m=>{const d=m.dept||'Other';deptCounts[d]=(deptCounts[d]||0)+1;});
  const deptColors=['#3762E4','#6750A4','#146C2E','#8A5300','#B3261E','#0891B2','#767B8D'];
  const deptData=Object.entries(deptCounts).map(([l,v],i)=>({v,label:l,color:deptColors[i%deptColors.length]}));

  h+=`<div style="display:grid;grid-template-columns:1.4fr 1fr;gap:14px;margin-bottom:16px">
    <div class="card">
      <div class="ct"><span>📅 HR — Meeting Attendance Rate</span><span style="font-size:11px;color:var(--tx3);font-weight:500">last 8 weeks</span></div>
      ${miniBarColumns(meetWeeks,{height:80})}
    </div>
    <div class="card">
      <div class="ct">Team by Department</div>
      ${donut(deptData,96)}
    </div>
  </div>`;

  // ── Login / device-watch mini widget (uses activity_log if it exists) ──
  h+=`<div id="dash-login-widget" style="margin-bottom:16px"></div>`;

  // ── Task status chips + Team Performance table ──────────────────────
  h+=`<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:8px;margin-bottom:16px">
    ${[
      {l:'Total',v:allTasks.length,c:'#767B8D',click:"navTo('alltasks')"},
      {l:'New',v:newTasks.length,c:'#767B8D',click:"navTo('alltasks','New')"},
      {l:'In Progress',v:inProg.length,c:'#3762E4',click:"navTo('alltasks','In Progress')"},
      {l:'Review',v:pendingRev.length,c:'#6750A4',click:"navTo('toreview')"},
      {l:'Done',v:doneTasks.length,c:'#146C2E',click:"navTo('alltasks','Done')"},
      {l:'Rejected',v:rejected.length,c:'#B3261E',click:"navTo('alltasks','Rejected')"},
      {l:'Overdue',v:overdue.length,c:overdue.length?'#B3261E':'#146C2E',click:"navTo('alltasks','Overdue')"},
    ].map(({l,v,c,click})=>`<div onclick="${click}" style="background:var(--s);border:1px solid var(--bd);border-top:3px solid ${c};border-radius:12px;padding:12px 8px;cursor:pointer;text-align:center">
      <div style="font-size:22px;font-weight:500;color:${c};line-height:1;margin-bottom:4px">${v}</div>
      <div style="font-size:10px;font-weight:600;color:var(--tx3)">${l}</div>
    </div>`).join('')}
  </div>`;

  const teamPerf=DB.team.map(m=>{
    const mt=allTasks.filter(t=>t.assignedTo===m.id||t.assignees?.includes(m.id));
    const activeN=mt.filter(t=>!['Done','Cancelled'].includes(t.status)).length;
    const doneM=mt.filter(t=>t.status==='Done').length;
    const od=mt.filter(t=>getDueStatus(t).key==='overdue').length;
    const recentD=mt.filter(t=>t.tsReviewed&&inRange(t.tsReviewed,d7,now)&&t.status==='Done').length;
    const rate=mt.length?Math.round(doneM/mt.length*100):0;
    return{m,activeN,doneM,od,recentD,rate,tot:mt.length};
  }).filter(x=>x.tot>0).sort((a,b)=>b.activeN-a.activeN);

  h+=`<div class="card">
    <div class="ct"><span>Team Performance</span><span onclick="navTo('team')" style="font-size:12px;color:var(--ac);cursor:pointer;font-weight:600">View team →</span></div>
    <div class="tw"><table>
      <thead><tr><th>Member</th><th>Role</th><th>Active</th><th>Done (7d)</th><th>Overdue</th><th>Rate</th></tr></thead>
      <tbody>
        ${teamPerf.map(({m,activeN,doneM,od,recentD,rate})=>`<tr class="cl" onclick="openMemberDetail('${m.id}')">
          <td><span style="display:flex;align-items:center;gap:8px"><span style="width:28px;height:28px;border-radius:50%;background:${m.color};display:inline-flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#fff;flex-shrink:0">${m.av}</span><span style="font-size:13px;font-weight:600">${m.name}</span></span></td>
          <td style="font-size:12px;color:var(--tx3)">${m.role}</td>
          <td><span style="font-size:15px;font-weight:600;color:${activeN>=5?'var(--r)':activeN>=2?'var(--y)':'var(--tx)'}">${activeN}</span></td>
          <td style="font-size:14px;font-weight:600;color:var(--g)">${recentD}</td>
          <td style="${od>0?'color:var(--r);font-weight:700':'color:var(--tx3)'}">${od>0?'⚠ '+od:'—'}</td>
          <td><div style="display:flex;align-items:center;gap:7px"><div style="width:56px;height:6px;background:var(--s2);border-radius:100px;overflow:hidden"><div style="height:100%;width:${rate}%;background:${rate>=70?'var(--g)':rate>=40?'var(--y)':'var(--r)'};border-radius:100px"></div></div><span style="font-size:12px;font-weight:700;color:${rate>=70?'var(--g)':rate>=40?'var(--y)':'var(--r)'}">${rate}%</span></div></td>
        </tr>`).join('')}
      </tbody>
    </table></div>
  </div>`;

  el.innerHTML=h;
  loadDashLoginWidget();
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
    return r;
  };
})();

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
