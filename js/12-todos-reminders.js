// §12 ── TODOS & REMINDERS ───────────────────────────────────────────────
function rTodos(el){
  const myTodos=isAdmin()?DB.todos:DB.todos.filter(td=>(td.owner||td.assignedTo||'')===(CU?.name||''));
  const TABS=['All','To Do','In Progress','Done'];
  let tab='All';
  function render(t){
    tab=t;
    let f=t==='All'?myTodos:myTodos.filter(td=>td.status===t);
    const cnt={};TABS.forEach(s=>cnt[s]=s==='All'?myTodos.length:myTodos.filter(td=>td.status===s).length);
    let h=`<div class="tabs">`+TABS.map(s=>`<div class="tab ${s===tab?'on':''}">${s} <span style="opacity:.4;font-size:9px">${cnt[s]}</span></div>`).join('')+`</div>`;
    if(!f.length)h+=`<div class="empty"><div class="ei">✓</div><div class="et">No todos</div><div class="es">Click "+ Add Todo" above</div></div>`;
    else{
      h+=`<div class="card">`;
      f.forEach(td=>{
        const reminderFired=td.reminder&&new Date(td.reminder)<new Date()&&td.status!=='Done';
        const reminderPending=td.reminder&&new Date(td.reminder)>=new Date()&&td.status!=='Done';
        h+=`<div class="td-it">
          <div class="td-cb ${td.status==='Done'?'checked':''}" onclick="toggleTodo('${td.id}')">✓</div>
          <div style="flex:1;cursor:pointer;min-width:0" onclick="openTodo('${td.id}')">
            <div class="td-txt ${td.status==='Done'?'done':''}">${escapeHtml(td.title)}</div>
            <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-top:2px">
              ${td.notes?`<span style="font-size:10px;color:var(--tx3)">${td.notes.slice(0,50)}${td.notes.length>50?'…':''}</span>`:''}
              ${td.due?`<span style="font-size:10px;color:${new Date(td.due)<new Date()&&td.status!=='Done'?'var(--r)':'var(--tx3)'}">📅 ${fd(td.due)}</span>`:''}
              ${reminderFired?`<span style="font-size:10px;color:var(--r);font-weight:700">⏰ Reminder passed</span>`:''}
              ${reminderPending?`<span style="font-size:10px;color:var(--ac)">⏰ ${fdt(td.reminder)}</span>`:''}
            </div>
          </div>
          ${ppill(td.priority)}
          <div class="act-c" onclick="event.stopPropagation()">
            <div class="ib edt" onclick="openTodoModal('${td.id}')" title="Edit">✏</div>
            <div class="ib" onclick="convertTodoToTask('${td.id}')" title="Convert to task" style="color:var(--ac);font-size:10px;font-weight:700">→T</div>
            <div class="ib del" onclick="delItem('todos','${td.id}','${td.title.replace(/'/g,"\\'")}')">🗑</div>
          </div>
        </div>`;
      });
      h+=`</div>`;
    }
    el.innerHTML=h;
    el.querySelectorAll('.tab').forEach((tb,i)=>tb.onclick=()=>render(TABS[i]));
  }
  render(tab);
}

window.openTodo=(id)=>{
  const td=DB.todos.find(x=>x.id===id);if(!td)return;
  document.getElementById('sp-ttl').textContent=td.title;
  document.getElementById('sp-pills').innerHTML=`${spill(td.status)} ${ppill(td.priority)}`;
  const reminderFired=td.reminder&&new Date(td.reminder)<new Date()&&td.status!=='Done';
  document.getElementById('sp-bd').innerHTML=`<div class="sp2">
    <div class="spf"><div class="spl">Status</div><div class="spv">${td.status}</div></div>
    <div class="spf"><div class="spl">Priority</div><div class="spv">${td.priority}</div></div>
    <div class="spf"><div class="spl">Due Date</div><div class="spv" style="color:${td.due&&new Date(td.due)<new Date()&&td.status!=='Done'?'var(--r)':'var(--tx)'}">${fd(td.due)||'—'}</div></div>
    <div class="spf"><div class="spl">⏰ Reminder</div><div class="spv" style="color:${reminderFired?'var(--r)':td.reminder?'var(--ac)':'var(--tx3)'}">${td.reminder?fdt(td.reminder)+(reminderFired?' (passed)':''):'Not set'}</div></div>
  </div>
  ${td.notes?`<div class="spf"><div class="spl">Notes</div><div class="spnote">${escapeHtml(td.notes)}</div></div>`:''}
  <div class="spa">
    ${td.status!=='Done'?`<button class="btn bk bsm" onclick="toggleTodo('${td.id}');closeSP()">✓ Mark Done</button>`:`<button class="btn bg2 bsm" onclick="toggleTodo('${td.id}');closeSP()">↩ Reopen</button>`}
    <button class="btn bg2 bsm" onclick="openTodoModal('${td.id}')">✏ Edit</button>
    <button class="btn bd2 bsm" onclick="delItem('todos','${td.id}','${td.title.replace(/'/g,"\\'")}');closeSP()">🗑 Delete</button>
  </div>`;
  document.getElementById('sp-pnl').classList.add('open');
};

window.toggleTodo=async(id)=>{
  const td=DB.todos.find(x=>x.id===id);if(!td)return;
  td.status=td.status==='Done'?'To Do':'Done';
  nTodoUpd(td);
  toast(td.status==='Done'?'Done ✓':'Reopened','ok');
  nav(page,document.querySelector('.ni.on'));updateBadges();
};

// ══════════════════════════════════════════════════════
// TO REVIEW
// ══════════════════════════════════════════════════════
function rToReview(el){
  let tab=0;
  function render(t){
    tab=t;
    const myId=CU?.id||'';
    const myName=(CU?.name||'').toLowerCase();
    // Tab 0: tasks I need to review
    const toReview=DB.tasks.filter(tk=>
      tk.status==='Pending Review'&&
      (isAdmin()||tk.reviewer===myId||(tk.reviewer||'').toLowerCase()===myName)
    );
    // Tab 1: tasks I submitted and waiting review
    const mySubmitted=DB.tasks.filter(tk=>
      tk.status==='Pending Review'&&
      (tk.assignedTo===myId||(tk.assignees||[]).includes(myId)||(myId===''&&(tk.assignedTo||'').toLowerCase()===myName))
    );
    const list=t===0?toReview:mySubmitted;
    const cnt=[toReview.length,mySubmitted.length];

    // Notification banners
    let notifBanner='';
    if(t===0&&toReview.length>0){
      notifBanner=`<div style="display:flex;align-items:center;gap:10px;background:linear-gradient(135deg,#4c1d9518,#7c3aed12);border:1px solid #7c3aed40;border-radius:10px;padding:10px 14px;margin-bottom:14px">
        <span style="font-size:20px">🔔</span>
        <div>
          <div style="font-size:12px;font-weight:800;color:#a78bfa">You have ${toReview.length} task${toReview.length>1?'s':''} waiting for your review</div>
          <div style="font-size:11px;color:var(--tx3);margin-top:2px">Click any task to approve or reject. Submitters are waiting on your decision.</div>
        </div>
      </div>`;
    } else if(t===1&&mySubmitted.length>0){
      // Find oldest submitted task
      const oldest=mySubmitted.slice().sort((a,b)=>new Date(a.tsSubmitted||0)-new Date(b.tsSubmitted||0))[0];
      const hoursWaiting=oldest?.tsSubmitted?Math.floor((Date.now()-new Date(oldest.tsSubmitted))/3600000):0;
      notifBanner=`<div style="display:flex;align-items:center;gap:10px;background:linear-gradient(135deg,#1e3a8a18,#2563eb12);border:1px solid #2563eb40;border-radius:10px;padding:10px 14px;margin-bottom:14px">
        <span style="font-size:20px">⏳</span>
        <div>
          <div style="font-size:12px;font-weight:800;color:#60a5fa">${mySubmitted.length} task${mySubmitted.length>1?'s':''} submitted — waiting for review</div>
          <div style="font-size:11px;color:var(--tx3);margin-top:2px">${hoursWaiting>0?`Oldest submitted ${hoursWaiting}h ago. `:''} Reviewers have been notified.</div>
        </div>
      </div>`;
    }

    let h=`<div class="tabs" style="margin-bottom:14px">
      ${['🔍 To Review by Me','📤 Submitted by Me'].map((lb,i)=>{
        const c=i===0?'#7c3aed':'#2563eb';
        const active=i===tab;
        return`<div class="tab ${active?'on':''}" onclick="render(${i})" style="font-size:13px;font-weight:700;cursor:pointer;${active?`color:${c};border-bottom:3px solid ${c}`:'color:var(--tx2)'}">
          ${lb} <span style="display:inline-flex;align-items:center;justify-content:center;min-width:20px;height:20px;padding:0 5px;background:${active?c:cnt[i]>0?c+'18':'var(--s2)'};color:${active?'#fff':cnt[i]>0?c:'var(--tx3)'};border-radius:20px;font-size:11px;font-weight:800;margin-left:4px">${cnt[i]}</span>
        </div>`;
      }).join('')}
    </div>
    ${notifBanner}`;

    if(!list.length){
      h+=`<div class="empty"><div class="ei">${t===0?'🔍':'📤'}</div><div class="et">${t===0?'Nothing to review ✓':'No pending submissions'}</div><div class="es">${t===0?'When team members submit tasks assigned to you for review, they appear here.':'Tasks you submit for review appear here while waiting for approval.'}</div></div>`;
    } else {
      h+=`<div class="tw"><table><thead><tr><th>Task</th><th>${t===0?'Submitted By':'Reviewer'}</th><th>Priority</th><th>Service</th><th>Submitted</th><th>Est</th><th>Actual</th><th>Variance</th>${t===0?'<th>Actions</th>':''}</tr></thead><tbody>`;
      h+=list.map(tk=>{
        const v=tk.est&&tk.actual?Math.round((tk.actual-tk.est)/tk.est*100):null;
        const varCol=v===null?'var(--tx3)':Math.abs(v)<=20?'var(--g)':Math.abs(v)<=50?'var(--y)':'var(--r)';
        const rev=DB.team.find(m=>m.id===tk.reviewer);
        const ass=DB.team.find(m=>m.id===tk.assignedTo);
        const hoursWaiting=tk.tsSubmitted?Math.floor((Date.now()-new Date(tk.tsSubmitted))/3600000):0;
        const waitColor=hoursWaiting>48?'var(--r)':hoursWaiting>24?'var(--y)':'var(--tx3)';
        return`<tr class="cl" onclick="openTask('${tk.id}')">
          <td>
            <div style="font-size:13px;font-weight:700;color:var(--tx)">${tk.title}</div>
            ${hoursWaiting>0?`<div style="font-size:10px;color:${waitColor};margin-top:1px">⏱ Waiting ${hoursWaiting}h</div>`:''}
          </td>
          <td style="font-size:12px">${t===0?(ass?`<span style="display:inline-flex;align-items:center;gap:4px"><span style="width:18px;height:18px;border-radius:50%;background:${ass.color};display:inline-flex;align-items:center;justify-content:center;font-size:7px;color:#fff;font-weight:800">${ass.av}</span>${ass.name}</span>`:'—'):(rev?`<span style="display:inline-flex;align-items:center;gap:4px"><span style="width:18px;height:18px;border-radius:50%;background:${rev.color};display:inline-flex;align-items:center;justify-content:center;font-size:7px;color:#fff;font-weight:800">${rev.av}</span>${rev.name}</span>`:'<span style="color:var(--tx3);font-size:11px">No reviewer</span>')}</td>
          <td>${ppill(tk.priority)}</td>
          <td style="font-size:11px;color:var(--tx2)">${sn(tk.service)}</td>
          <td style="font-size:11px;color:var(--tx3);font-family:var(--fnm)">${fr(tk.tsSubmitted)}</td>
          <td style="font-size:12px;font-weight:600;color:var(--tx2)">${tk.est!=null?tk.est+'h':'—'}</td>
          <td style="font-size:12px;font-weight:600;color:var(--tx2)">${tk.actual!=null?tk.actual+'h':'—'}</td>
          <td style="font-family:var(--fnm);font-size:12px;font-weight:700;color:${varCol}">${v!==null?(v>0?'+':'')+v+'%':'—'}</td>
          ${t===0?`<td onclick="event.stopPropagation()"><div class="act-c">
            <button class="btn bk bxs" onclick="approveTask('${tk.id}')">✓ Approve</button>
            <button class="btn bd2 bxs" onclick="rejectTask('${tk.id}')">✗ Reject</button>
          </div></td>`:''}
        </tr>`;
      }).join('')+`</tbody></table></div>`;
    }
    el.innerHTML=h;
    el.querySelectorAll('.tab').forEach((tb,i)=>tb.onclick=()=>render(i));
    window.rr=()=>render(tab);
  }
  render(0);
}

// ══════════════════════════════════════════════════════
// TEAM
// ══════════════════════════════════════════════════════
