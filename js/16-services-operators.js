// §16 ── SERVICES & OPERATORS ────────────────────────────────────────────
function rServices(el){
  if(!canDoStrict('services')){el.innerHTML='<div class="empty"><div class="ei">🔒</div><div class="et">Access Restricted</div><div class="es">Ask an admin to grant you Services access.</div></div>';return;}
  const sc={Live:'#15803d','In Development':'#2563eb',Paused:'#ca8a04',Deprecated:'#dc2626'};
  const tc={Digital:'#2563eb',IVR:'#7c3aed',USSD:'#ea580c',SMS:'#15803d'};

  // Build filter bar
  const allOps=[...new Set(DB.services.map(s=>s.operator_name).filter(Boolean))];
  const allCos=[...new Set(DB.services.map(s=>s.owned_by).filter(Boolean))];
  const allTypes=[...new Set(DB.services.map(s=>s.service_type||s.cat).filter(Boolean))];

  function render(){
    const fOp=document.getElementById('sf-fop')?.value||'';
    const fCo=document.getElementById('sf-fco')?.value||'';
    const fTy=document.getElementById('sf-fty')?.value||'';
    const fSt=document.getElementById('sf-fst')?.value||'';
    const sq=(document.getElementById('sf-sq')?.value||'').toLowerCase();

    let svcs=[...DB.services];
    if(fOp) svcs=svcs.filter(s=>s.operator_name===fOp);
    if(fCo) svcs=svcs.filter(s=>s.owned_by===fCo);
    if(fTy) svcs=svcs.filter(s=>(s.service_type||s.cat)===fTy);
    if(fSt) svcs=svcs.filter(s=>s.status===fSt);
    if(sq)  svcs=svcs.filter(s=>(s.name||'').toLowerCase().includes(sq));

    let h=renderAccessSummary('services','Services')+`<div class="fb" style="margin-bottom:12px">
      <input class="si" id="sf-sq" placeholder="Search services…" oninput="window._rSvc&&window._rSvc()" value="${sq}">
      <select class="fs" id="sf-fop" onchange="window._rSvc&&window._rSvc()">
        <option value="">All operators</option>${allOps.map(o=>`<option ${fOp===o?'selected':''}>${o}</option>`).join('')}
      </select>
      <select class="fs" id="sf-fco" onchange="window._rSvc&&window._rSvc()">
        <option value="">All companies</option>${allCos.map(c=>`<option ${fCo===c?'selected':''}>${c}</option>`).join('')}
      </select>
      <select class="fs" id="sf-fty" onchange="window._rSvc&&window._rSvc()">
        <option value="">All types</option>${allTypes.map(t=>`<option ${fTy===t?'selected':''}>${t}</option>`).join('')}
      </select>
      <select class="fs" id="sf-fst" onchange="window._rSvc&&window._rSvc()">
        <option value="">All statuses</option>${['Live','In Development','Paused','Deprecated'].map(s=>`<option ${fSt===s?'selected':''}>${s}</option>`).join('')}
      </select>
    </div>`;

    if(!svcs.length){
      h+=`<div class="empty"><div class="ei">📡</div><div class="et">No services match</div></div>`;
      el.innerHTML=h; return;
    }

    // Group by operator_name
    const grouped={};
    svcs.forEach(s=>{
      const grp=s.operator_name||'Unassigned';
      if(!grouped[grp])grouped[grp]=[];
      grouped[grp].push(s);
    });

    Object.entries(grouped).sort((a,b)=>a[0].localeCompare(b[0])).forEach(([opName,opSvcs])=>{
      h+=`<div style="margin-bottom:20px">
        <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.07em;color:var(--tx3);padding:6px 0 8px;border-bottom:2px solid var(--bd);margin-bottom:10px;display:flex;align-items:center;gap:8px">
          <span>📡 ${opName}</span><span style="font-weight:500;font-size:10px;color:var(--tx3)">${opSvcs.length} service${opSvcs.length!==1?'s':''}</span>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px">`;
      opSvcs.forEach(s=>{
        const tot=DB.tasks.filter(t=>t.service===s.id).length;
        const act=DB.tasks.filter(t=>t.service===s.id&&!['Done','Cancelled'].includes(t.status)).length;
        const col=sc[s.status]||'#64748b';
        const tCol=tc[s.service_type||s.cat]||'#64748b';
        h+=`<div class="mc" onclick="openSvcDetail('${s.id}')">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px">
            <div style="font-size:13px;font-weight:700;flex:1;margin-right:6px;line-height:1.3">${s.name}</div>
            <span style="background:${col}18;color:${col};border:1px solid ${col}28;font-size:9px;font-weight:700;padding:2px 6px;border-radius:20px;flex-shrink:0">${s.status}</span>
          </div>
          <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:7px">
            ${s.service_type?`<span style="background:${tCol}12;color:${tCol};border:1px solid ${tCol}22;font-size:9px;font-weight:700;padding:1px 6px;border-radius:4px">${s.service_type}</span>`:''}
            ${s.cat?`<span style="background:var(--s2);color:var(--tx3);border:1px solid var(--bd);font-size:9px;padding:1px 6px;border-radius:4px">${s.cat}</span>`:''}
          </div>
          <div style="font-size:10px;color:var(--tx3);line-height:1.9;margin-bottom:7px">
            ${s.owned_by?`<div>🏢 ${s.owned_by}</div>`:''}
            ${s.location_name?`<div>📍 ${s.location_name}</div>`:''}
            ${s.link?`<div><a href="${s.link}" target="_blank" onclick="event.stopPropagation()" style="color:var(--ac)">🔗 ${s.link.replace(/^https?:\/\//,'').slice(0,30)}${s.link.length>35?'…':''}</a></div>`:''}
            <div>📋 ${act} active · ${tot} total tasks</div>
          </div>
          <div class="ac" onclick="event.stopPropagation()">
            <div class="ib edt" onclick="event.stopPropagation();openSvcModal('${s.id}')">✏</div>
            <div class="ib del" onclick="event.stopPropagation();delItem('services','${s.id}','${s.name.replace(/'/g,"\'")}')">🗑</div>
          </div>
        </div>`;
      });
      h+=`</div></div>`;
    });
    el.innerHTML=h;
  }
  window._rSvc=render;
  render();
}


window.openSvcDetail=(id)=>{
  const s=DB.services.find(x=>x.id===id);if(!s)return;
  const tc={Digital:'#2563eb',IVR:'#7c3aed',USSD:'#ea580c',SMS:'#15803d'};
  const tasks=DB.tasks.filter(t=>t.service===s.id);
  const active=tasks.filter(t=>!['Done','Cancelled'].includes(t.status));
  const col={Live:'#15803d','In Development':'#2563eb',Paused:'#ca8a04',Deprecated:'#dc2626'}[s.status]||'#64748b';
  const tCol=tc[s.service_type||'Digital']||'#64748b';
  let body=`<div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:11px">
    <span style="background:${col}18;color:${col};border:1px solid ${col}28;font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px">${s.status}</span>
    ${s.service_type?`<span style="background:${tCol}12;color:${tCol};border:1px solid ${tCol}22;font-size:10px;font-weight:600;padding:2px 7px;border-radius:6px">${s.service_type}</span>`:''}
    ${s.cat?`<span class="pill p-n">${s.cat}</span>`:''}
  </div>
  <div class="sg2">
    <div class="spf"><div class="spl">Operator</div><div class="spv">${s.operator_name||'—'}</div></div>
    <div class="spf"><div class="spl">Owned By</div><div class="spv">${s.owned_by||'—'}</div></div>
    <div class="spf"><div class="spl">Location</div><div class="spv">${s.location_name||'—'}</div></div>
    <div class="spf"><div class="spl">Project</div><div class="spv">${s.project_name||'—'}</div></div>
    ${s.link?`<div class="spf" style="grid-column:1/-1"><div class="spl">Link</div><div class="spv"><a href="${s.link}" target="_blank" style="color:var(--ac)">${s.link}</a></div></div>`:''}
  </div>
  ${s.desc?`<div class="spf"><div class="spl">Description</div><div class="spnote">${s.desc}</div></div>`:''}
  <div class="sps">Active Tasks (${active.length})</div>
  ${active.length===0?'<div style="font-size:11px;color:var(--tx3);padding:6px 0">No active tasks</div>':active.slice(0,6).map(t=>`<div onclick="openTask('${t.id}')" style="display:flex;align-items:center;gap:7px;padding:6px 0;border-bottom:1px solid var(--bd);cursor:pointer">${spill(t.status)}<span style="font-size:12px;font-weight:500;flex:1">${t.title}</span>${ppill(t.priority)}</div>`).join('')}
  <div class="spa">
    <button class="btn bg2 bsm" onclick="openSvcModal('${s.id}')">✏ Edit Service</button>
    <button class="btn bd2 bsm" onclick="delItem('services','${s.id}','${s.name.replace(/'/g,"\'")}');closeSP()">🗑 Delete</button>
  </div>`;
  openSP(s.name,'',body);
};


function rOperators(el){
  const sc={Active:'var(--g)',Negotiating:'var(--y)',Inactive:'var(--r)'};
  el.innerHTML=`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:11px">`+
  DB.operators.map(o=>{
    const tot=DB.tasks.filter(t=>t.operator===o.id).length;
    const svcCount=DB.services.filter(s=>s.operator_name===o.name).length;
    const col=sc[o.status]||'var(--tx3)';
    return`<div class="card" style="cursor:pointer" onclick="openEntityDetail('${o.id}','op')">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:7px"><div style="font-size:14px;font-weight:700">${o.name}</div><span style="background:${col}15;color:${col};font-size:10px;font-weight:600;padding:2px 7px;border-radius:5px;border:1px solid ${col}25">${o.status||'Active'}</span></div>
      <div style="font-size:12px;color:var(--tx2)">📍 ${o.country||'—'}</div>
      ${o.contact?`<div style="font-size:11px;color:var(--tx3);margin-top:2px">👤 ${o.contact}</div>`:''}
      ${o.email?`<div style="font-size:11px;color:var(--tx3)">✉ ${o.email}</div>`:''}
      ${o.phone?`<div style="font-size:11px;color:var(--tx3)">📞 ${o.phone}</div>`:''}
      <div style="margin-top:7px;display:flex;gap:10px;font-size:10px;color:var(--tx3)">
        <span>📡 ${svcCount} service${svcCount!==1?'s':''}</span>
        <span>📋 ${tot} tasks</span>
      </div>
      <div class="act-c" style="margin-top:10px"><div class="ib edt" onclick="event.stopPropagation();openOperatorModal('${o.id}')">✏</div><div class="ib del" onclick="event.stopPropagation();delItem('operators','${o.id}','${o.name}')">🗑</div></div>
    </div>`;
  }).join('')+`</div>`;
}

// ══════════════════════════════════════════════════════
// COMPANIES
// ══════════════════════════════════════════════════════
function rCompanies(el){
  const tc={Partner:'var(--g)',Client:'var(--p)',Vendor:'var(--o)',Investor:'var(--ac)'};
  el.innerHTML=`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:11px">`+
  DB.companies.map(c=>{const col=tc[c.type]||'var(--tx3)';
    return`<div class="card" style="cursor:pointer" onclick="openEntityDetail('${c.id}','co')">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:7px"><div style="font-size:14px;font-weight:700">${c.name}</div><span style="background:${col}15;color:${col};font-size:10px;font-weight:600;padding:2px 7px;border-radius:5px;border:1px solid ${col}25">${c.type||'Partner'}</span></div>
      <div style="font-size:12px;color:var(--tx2)">📍 ${c.country||'—'}</div>
      ${c.contact?`<div style="font-size:11px;color:var(--tx3);margin-top:2px">👤 ${c.contact}</div>`:''}
      ${c.email?`<div style="font-size:11px;color:var(--tx3)">✉ ${c.email}</div>`:''}
      ${c.notes?`<div style="margin-top:6px;font-size:11px;color:var(--tx2);font-style:italic">${c.notes}</div>`:''}
      <div class="act-c" style="margin-top:10px"><div class="ib edt" onclick="event.stopPropagation();openCompanyModal('${c.id}')">✏</div><div class="ib del" onclick="event.stopPropagation();delItem('companies','${c.id}','${c.name}')">🗑</div></div>
    </div>`;
  }).join('')+`</div>`;
}

window.openEntityDetail=(id,type)=>{
  const items=type==='op'?DB.operators:DB.companies;
  const c=items.find(x=>x.id===id);if(!c)return;
  const tasks=DB.tasks.filter(t=>t.operator===id);
  document.getElementById('sp-ttl').textContent=c.name;
  document.getElementById('sp-pills').innerHTML=`<span class="pill sp">${c.type||c.status||'Active'}</span>`;
  const relServices=type==='op'
    ? DB.services.filter(s=>s.operator_name===c.name)
    : DB.services.filter(s=>s.owned_by===c.name);
  const relProjects=type==='op'
    ? DB.projects.filter(p=>p.owner_company_id===c.id||p.ownedBy===c.name||p.ownedBy===c.id)
    : DB.projects.filter(p=>p.owner_company_id===c.id||p.ownedBy===c.name||p.ownedBy===c.id);
  document.getElementById('sp-bd').innerHTML=`<div class="sp2">
    <div class="spf"><div class="spl">Country</div><div class="spv">${c.country||'—'}</div></div>
    <div class="spf"><div class="spl">Contact</div><div class="spv">${c.contact||'—'}</div></div>
    <div class="spf"><div class="spl">Email</div><div class="spv">${c.email||'—'}</div></div>
    <div class="spf"><div class="spl">Phone</div><div class="spv">${c.phone||'—'}</div></div>
  </div>
  ${c.notes?`<div class="spf"><div class="spl">Notes</div><div class="spnote">${c.notes}</div></div>`:''}
  ${relServices.length?`<div class="sps">Services (${relServices.length})</div>
  ${relServices.map(s=>{const sc={Live:'#15803d','In Development':'#2563eb',Paused:'#ca8a04',Deprecated:'#dc2626'};const col=sc[s.status]||'#64748b';return`<div onclick="openSvcDetail('${s.id}')" style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--bd);cursor:pointer">
    <span style="background:${col}18;color:${col};border:1px solid ${col}28;font-size:9px;font-weight:700;padding:2px 6px;border-radius:20px;flex-shrink:0">${s.status}</span>
    <span style="font-size:12px;font-weight:600;flex:1">${s.name}</span>
    ${s.service_type?`<span style="font-size:10px;color:var(--tx3)">${s.service_type}</span>`:''}
  </div>`;}).join('')}`:''}
  ${relProjects.length?`<div class="sps">Projects (${relProjects.length})</div>
  ${relProjects.map(p=>{const pc={Active:'#2563eb',Planning:'#7c3aed',Completed:'#15803d','On Hold':'#ca8a04',Cancelled:'#dc2626'};const col=pc[p.status]||'#64748b';return`<div onclick="openProjectDetail('${p.id}')" style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--bd);cursor:pointer">
    <span style="background:${col}18;color:${col};border:1px solid ${col}28;font-size:9px;font-weight:700;padding:2px 6px;border-radius:20px;flex-shrink:0">${p.status}</span>
    <span style="font-size:12px;font-weight:600;flex:1">${p.name}</span>
  </div>`;}).join('')}`:''}
  <div class="sps">Related Tasks (${tasks.length})</div>
  ${tasks.slice(0,5).map(t=>`<div onclick="openTask('${t.id}')" style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--bd);cursor:pointer">${spill(t.status)}<span style="font-size:12px;font-weight:500;flex:1">${t.title}</span></div>`).join('')}
  <div class="spa">
    <button class="btn bg2 bsm" onclick="${type==='op'?`openOperatorModal('${c.id}')`:`openCompanyModal('${c.id}')`}">✏ Edit</button>
    <button class="btn bd2 bsm" onclick="delItem('${type==='op'?'operators':'companies'}','${c.id}','${c.name}');closeSP()">🗑 Delete</button>
  </div>`;
  document.getElementById('sp-pnl').classList.add('open');
};

// ══════════════════════════════════════════════════════
// DOCS
// ══════════════════════════════════════════════════════
// ══ LIBRARY ══════════════════════════════════════════════════════════
