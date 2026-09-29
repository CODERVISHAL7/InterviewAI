(()=>{
  const qs=s=>document.querySelector(s);
  const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const set=(sel,v)=>{const e=qs(sel);if(e)e.textContent=v};
  const formatDate=v=>v?new Date(v).toLocaleDateString(undefined,{day:'2-digit',month:'short',year:'numeric'}):'—';
  const message=(t,type='success')=>{const e=qs('#dashboardMessage');e.textContent=t;e.dataset.type=type;e.hidden=!t};
  let trendChart=null;
  (async()=>{
    try{
      const session=await window.Auth.getSession(); if(!session)return;
      set('[data-user-email]',session.user.email||'your account');
      const client=window.supabaseApp.client;
      const [{data:interviews,error:ie},{data:reports,error:re},{data:answers,error:ae}]=await Promise.all([
        client.from('interviews').select('id,job_role,company,interview_type,difficulty,total_questions,status,created_at,completed_at').eq('user_id',session.user.id).order('created_at',{ascending:false}),
        client.from('performance_reports').select('interview_id,overall_score,correctness,relevance,technical_knowledge,completeness,clarity,communication,answered_questions,evaluated_questions,created_at').eq('user_id',session.user.id).order('created_at',{ascending:true}),
        client.from('answers').select('id,question_id').eq('user_id',session.user.id)
      ]);
      if(ie)throw ie;if(re)throw re;if(ae)throw ae;
      const reportMap=new Map((reports||[]).map(r=>[r.interview_id,r]));
      const total=interviews?.length||0;
      const scored=reports||[];
      const avg=scored.length?scored.reduce((s,r)=>s+Number(r.overall_score||0),0)/scored.length:null;
      const answered=answers?.length||0;
      set('[data-total-interviews]',total);set('[data-average-score]',avg===null?'—':`${avg.toFixed(0)}/100`);set('[data-questions-answered]',answered);
      const focus=computeFocus(scored);set('[data-focus-area]',focus||'—');
      const recent=(interviews||[]).slice(0,5);
      const list=qs('[data-recent-list]');
      if(!recent.length){qs('[data-recent-empty]').hidden=false;list.innerHTML='';}
      else {qs('[data-recent-empty]').hidden=true;list.innerHTML=recent.map(i=>{const r=reportMap.get(i.id);return `<article class="history-row"><div><strong>${esc(i.job_role)}</strong><span>${esc(i.company||'General')} · ${esc(i.interview_type)} · ${esc(i.difficulty)}</span><small>${formatDate(i.created_at)} · ${esc(i.status||'setup')}</small></div><div class="history-score">${r?`${Number(r.overall_score).toFixed(0)}/100`:'—'}</div><div>${r?`<a class="btn btn-secondary btn-sm" href="report.html?interview_id=${encodeURIComponent(i.id)}">View report</a>`:'<span class="muted">No report</span>'}</div></article>`}).join('');}
      renderChart(scored);
      qs('#dashboardLoading').hidden=true;qs('#dashboardContent').hidden=false;
    }catch(e){console.error(e);qs('#dashboardLoading').hidden=true;message(e.message||'Unable to load dashboard.','error');}
  })();
  function computeFocus(rows){
    if(!rows.length)return '';
    const dims=['correctness','relevance','technical_knowledge','completeness','clarity','communication'];
    const labels={correctness:'Correctness',relevance:'Relevance',technical_knowledge:'Technical knowledge',completeness:'Completeness',clarity:'Clarity',communication:'Communication'};
    const avg=Object.fromEntries(dims.map(d=>[d,rows.reduce((s,r)=>s+Number(r[d]||0),0)/rows.length]));
    return labels[dims.reduce((a,b)=>avg[a]<=avg[b]?a:b)];
  }
  function renderChart(rows){
    const canvas=qs('#scoreTrend'); if(!canvas)return;
    if(!rows.length){qs('#trendEmpty').hidden=false;canvas.hidden=true;return;}
    if(!window.Chart)return;
    const labels=rows.map((r,i)=>`Interview ${i+1}`);
    trendChart=new Chart(canvas,{type:'line',data:{labels,datasets:[{label:'Overall score',data:rows.map(r=>Number(r.overall_score||0)),tension:.3,fill:false,borderWidth:2,pointRadius:4}]},options:{responsive:true,maintainAspectRatio:false,scales:{y:{min:0,max:100,ticks:{stepSize:20}}},plugins:{legend:{display:false}}}});
  }
})();
