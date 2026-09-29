(()=>{
  const qs=s=>document.querySelector(s);
  const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const formatDate=v=>v?new Date(v).toLocaleString(undefined,{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}):'—';
  const message=(t,type='success')=>{const e=qs('#historyMessage');e.textContent=t;e.dataset.type=type;e.hidden=!t};
  (async()=>{
    try{
      const session=await window.Auth.getSession();if(!session)return;
      const client=window.supabaseApp.client;
      const [{data:interviews,error:ie},{data:reports,error:re}]=await Promise.all([
        client.from('interviews').select('id,job_role,company,interview_type,difficulty,total_questions,status,created_at,completed_at').eq('user_id',session.user.id).order('created_at',{ascending:false}),
        client.from('performance_reports').select('interview_id,overall_score,answered_questions,evaluated_questions,created_at').eq('user_id',session.user.id)
      ]);
      if(ie)throw ie;if(re)throw re;
      const map=new Map((reports||[]).map(r=>[r.interview_id,r]));
      const list=qs('#historyList');
      if(!interviews?.length){qs('#historyEmpty').hidden=false;qs('#historyLoading').hidden=true;return;}
      list.innerHTML=interviews.map(i=>{const r=map.get(i.id);const status=i.status||'setup';const statusLabel=status.replace('_',' ');return `<article class="history-card"><div class="history-main"><div><span class="status-pill">${esc(statusLabel)}</span><h2>${esc(i.job_role)}</h2><p>${esc(i.company||'General')} · ${esc(i.interview_type)} · ${esc(i.difficulty)}</p><small>${formatDate(i.created_at)} · ${Number(i.total_questions||0)} questions</small></div><div class="history-score"><small>Overall score</small><strong>${r?`${Number(r.overall_score).toFixed(0)}/100`:'—'}</strong></div></div><div class="history-meta"><span>${r?`${r.evaluated_questions}/${r.answered_questions} evaluated`:'No report yet'}</span><span>${i.completed_at?`Completed ${formatDate(i.completed_at)}`:'Not completed'}</span><span>${r?`Report saved ${formatDate(r.created_at)}`:''}</span></div><div class="history-actions">${r?`<a class="btn btn-primary btn-sm" href="report.html?interview_id=${encodeURIComponent(i.id)}">View report</a>`:`<a class="btn btn-secondary btn-sm" href="mock-interview.html?interview_id=${encodeURIComponent(i.id)}">Open interview</a>`}</div></article>`}).join('');
      qs('#historyLoading').hidden=true;qs('#historyContent').hidden=false;
    }catch(e){console.error(e);qs('#historyLoading').hidden=true;message(e.message||'Unable to load interview history.','error');}
  })();
})();
