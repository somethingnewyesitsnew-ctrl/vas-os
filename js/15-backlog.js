// §15 ── BACKLOG ─────────────────────────────────────────────────────────
function rBacklog(el){
  const cols=['New Idea','Under Review','Approved','Converted to Task','Parked','Rejected'];
  const cc={'New Idea':'#64748b','Under Review':'#ca8a04','Approved':'#16a34a','Converted to Task':'#2563eb','Parked':'#ea580c','Rejected':'#dc2626'};
  if(isAdmin()){
    el.innerHTML=`<div class="kanban">`+cols.map(s=>{const items=DB.backlog.filter(b=>b.status===s);return`<div class="kb-col"><div class="kb-ch" style="color:${cc[s]}">${s}<span class="kb-cnt">${items.length}</span></div>${items.map(b=>`<div class="kb-card" onclick="openBacklog('${b.id}')"><div style="font-size:12px;font-weight:600;margin-bottom:5px;line-height:1.3">${escapeHtml(b.title)}</div><div style="display:flex;gap:4px;justify-content:space-between;align-items:center">${ppill(b.priority)}<div class="act-c" onclick="event.stopPropagation()"><div class="ib" onclick="convertBacklogToTask('${b.id}')" title="Convert to task" style="color:var(--ac);font-size:10px;font-weight:700">→T</div><div class="ib del" onclick="delItem('backlog','${b.id}')">🗑</div></div></div></div>`).join('')}</div>`;}).join('')+`</div>`;
  } else {
    el.innerHTML=`<div style="background:var(--al);border:1px solid #bfdbfe;border-radius:8px;padding:9px 12px;margin-bottom:12px;font-size:12px;color:var(--ac)">Submit ideas below. Only managers can change status or convert to tasks.</div>
    <div class="tw"><table><thead><tr><th>Idea</th><th>Category</th><th>Priority</th><th>Status</th><th>By</th></tr></thead><tbody>`+
    DB.backlog.map(b=>`<tr class="cl" onclick="openBacklog('${b.id}')"><td>${escapeHtml(b.title)}</td><td style="font-size:11px;color:var(--tx2)">${b.cat}</td><td>${ppill(b.priority)}</td><td><span style="background:${cc[b.status]}15;color:${cc[b.status]};font-size:10px;font-weight:600;padding:2px 7px;border-radius:5px">${b.status}</span></td><td style="font-size:11px;color:var(--tx2)">${b.by}</td></tr>`).join('')+`</tbody></table></div>`;
  }
}

window.openBacklog=(id)=>{
  const b=DB.backlog.find(bl=>bl.id===id);if(!b)return;
  const cc={'New Idea':'#64748b','Under Review':'#ca8a04','Approved':'#16a34a','Converted to Task':'#2563eb','Parked':'#ea580c','Rejected':'#dc2626'};
  document.getElementById('sp-ttl').textContent=b.title;
  document.getElementById('sp-pills').innerHTML=`<span style="background:${cc[b.status]}15;color:${cc[b.status]};font-size:10px;font-weight:600;padding:2px 8px;border-radius:5px;border:1px solid ${cc[b.status]}25">${b.status}</span> ${ppill(b.priority)}`;
  let body=`<div class="sp2"><div class="spf"><div class="spl">Category</div><div class="spv">${b.cat}</div></div><div class="spf"><div class="spl">By</div><div class="spv">${b.by}</div></div></div>
  <div class="spf"><div class="spl">Description</div><div class="spnote">${b.desc||'—'}</div></div>
  <div class="spf"><div class="spl">Why It Matters</div><div class="spnote">${b.why||'—'}</div></div>`;
  if(b.notes)body+=`<div class="spf"><div class="spl">Admin Notes</div><div class="spnote">${escapeHtml(b.notes)}</div></div>`;
  if(isAdmin()){
    body+=`<div class="spa">
      <select onchange="chBLStatus('${b.id}',this.value)" style="padding:5px 9px;background:var(--s2);border:1px solid var(--bd);border-radius:8px;color:var(--tx);font-family:var(--fn);font-size:11px;outline:none;cursor:pointer">
        ${['New Idea','Under Review','Approved','Converted to Task','Parked','Rejected'].map(s=>`<option ${b.status===s?'selected':''} value="${s}">${s}</option>`).join('')}
      </select>
      ${b.status==='Approved'?`<button class="btn bp bsm" onclick="convertBL('${b.id}')">→ Convert to Task</button>`:''}
      <button class="btn bd2 bsm" onclick="delItem('backlog','${b.id}');closeSP()">🗑 Delete</button>
    </div>
    <div style="margin-top:10px"><div class="fgr"><label>ADMIN NOTES</label><textarea id="bl-n" style="background:var(--s2);border:1px solid var(--bd);border-radius:8px;color:var(--tx);padding:7px 10px;font-family:var(--fn);font-size:12px;outline:none;width:100%;resize:vertical;min-height:55px">${b.notes||''}</textarea></div>
    <button class="btn bg2 bsm" style="margin-top:6px" onclick="saveBLNotes('${b.id}')">Save Notes</button></div>`;
  }
  document.getElementById('sp-bd').innerHTML=body;
  document.getElementById('sp-pnl').classList.add('open');
};
window.chBLStatus=(id,status)=>{const b=DB.backlog.find(bl=>bl.id===id);if(b){b.status=status;toast(`Status → ${status}`,'ok');openBacklog(id);if(page==='backlog')nav('backlog',document.querySelector('.ni.on'));}};
window.saveBLNotes=(id)=>{const b=DB.backlog.find(bl=>bl.id===id);const n=document.getElementById('bl-n')?.value;if(b&&n!==undefined){b.notes=n;toast('Saved','ok');}};
window.convertBL=(id)=>{
  const b=DB.backlog.find(bl=>bl.id===id);if(!b)return;
  const t={id:'t'+gid(),title:b.title,status:'New',priority:b.priority,type:({Feature:'Feature','Bug Report':'Bug Fix','Process Improvement':'Research',Infrastructure:'Maintenance','Content Strategy':'Content',Design:'Design',Research:'Research'}[b.cat]||'Feature'),assignedTo:'',reviewer:'',service:'',operator:'',reqBy:b.by,due:'',est:null,actual:null,what:'',tech:'',rejReason:'',tsCreated:now(),tsOpened:null,tsStarted:null,tsSubmitted:null,tsReviewed:null,tsArchived:null,rejections:[],desc:b.desc+(b.why?'\n\nWhy: '+b.why:''),respH:null,workH:null,revH:null,cycleH:null};
  DB.tasks.unshift(t); b.status='Converted to Task';
  nCreateTask(t,t.id);
  logAction('Backlog Converted',`"${esc(b.title)}" converted to task`,'Success',b.title,'');
  toast('Task created ✓','ok'); closeSP(); nav('alltasks',document.querySelector('[data-p="alltasks"]'));
};

// ══════════════════════════════════════════════════════
// SERVICES
// ══════════════════════════════════════════════════════
