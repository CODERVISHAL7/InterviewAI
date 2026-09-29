(async function(){
  const qs = s => document.querySelector(s);
  const params = new URLSearchParams(location.search);
  const interviewId = params.get('interview_id');
  if (!interviewId) { location.replace('dashboard.html'); return; }

  const els = { text:qs('[data-question-text]'), number:qs('[data-question-number]'), category:qs('[data-category]'), difficulty:qs('[data-difficulty]'), answer:qs('[data-answer]'), voice:qs('[data-voice]'), stopVoice:qs('[data-stop-voice]'), voiceStatus:qs('[data-voice-status]'), timer:qs('[data-timer]'), progress:qs('[data-progress]'), progressLabel:qs('[data-progress-label]'), answeredLabel:qs('[data-answered-label]'), list:qs('[data-question-list]'), prev:qs('[data-prev]'), next:qs('[data-next]'), save:qs('[data-save]'), message:qs('[data-message]'), meta:qs('[data-interview-meta]'), evaluate:qs('[data-evaluate]'), evaluationPanel:qs('[data-evaluation-panel]'), evaluationScore:qs('[data-evaluation-score]'), evaluationScores:qs('[data-evaluation-scores]'), evaluationFeedback:qs('[data-evaluation-feedback]'), evaluationSuggested:qs('[data-evaluation-suggested]') };
  let session, interview, questions=[], answers=new Map(), evaluations=new Map(), current=0, secondsLeft=120, timerId=null, startedAt=Date.now(), busy=false, evaluating=false, answerMethod='text';

  const esc = v => String(v ?? '').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const message=(text,type='success')=>{els.message.textContent=text;els.message.dataset.type=type;els.message.hidden=!text;};
  const fmt=s=>`${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;

  try {
    session = await window.Auth.getSession();
    if(!session) return;
    const {data:i,error:ie}=await window.supabaseApp.client.from('interviews').select('id,job_role,company,interview_type,difficulty,total_questions,status').eq('id',interviewId).eq('user_id',session.user.id).single();
    if(ie) throw ie; interview=i;
    if(!['questions_generated','in_progress','completed'].includes(interview.status)) throw new Error('This interview does not have generated questions yet.');
    const {data:q,error:qe}=await window.supabaseApp.client.from('questions').select('id,question_text,category,difficulty,question_order').eq('interview_id',interviewId).order('question_order',{ascending:true});
    if(qe) throw qe; questions=q||[]; if(!questions.length) throw new Error('No generated questions were found.');
    const {data:a,error:ae}=await window.supabaseApp.client.from('answers').select('id,question_id,answer_text,answer_method,duration_seconds').eq('user_id',session.user.id).in('question_id',questions.map(x=>x.id));
    if(ae) throw ae; (a||[]).forEach(x=>answers.set(x.question_id,x));
    if((a||[]).length){ const {data:ev,error:ee}=await window.supabaseApp.client.from('evaluations').select('id,answer_id,question_id,score,correctness,relevance,technical_knowledge,completeness,clarity,communication,feedback,suggested_answer,provider,model,updated_at').eq('user_id',session.user.id).in('answer_id',(a||[]).map(x=>x.id)); if(ee) throw ee; (ev||[]).forEach(x=>evaluations.set(x.answer_id,x)); }
    els.meta.textContent=`${interview.job_role} · ${interview.company||'General'} · ${interview.difficulty}`;
    if(window.SpeechInput) window.SpeechInput.attach({ textarea:els.answer, startButton:els.voice, stopButton:els.stopVoice, status:els.voiceStatus, onStart:()=>{answerMethod='voice';}, onStop:()=>{answerMethod='voice';} });
    if(interview.status==='questions_generated') await window.supabaseApp.client.from('interviews').update({status:'in_progress',started_at:new Date().toISOString()}).eq('id',interviewId).eq('user_id',session.user.id);
    renderList(); renderQuestion(); startTimer();
  } catch(e){ console.error(e); message(e.message||'Unable to load interview.','error'); els.text.textContent='Interview unavailable'; }

  function renderList(){els.list.innerHTML=questions.map((q,i)=>`<button class="q-dot ${i===current?'active ':''}${answers.has(q.id)?'answered':''}" data-q="${i}" type="button">${i+1}</button>`).join('');els.list.querySelectorAll('[data-q]').forEach(b=>b.addEventListener('click',async()=>{await saveCurrent(false);current=Number(b.dataset.q);renderList();renderQuestion();resetTimer();}));}
  function renderQuestion(){const q=questions[current], a=answers.get(q.id);els.number.textContent=`Question ${current+1}`;els.text.textContent=q.question_text;els.category.textContent=q.category;els.difficulty.textContent=q.difficulty;els.answer.value=a?.answer_text||'';answerMethod=a?.answer_method||'text';if(window.SpeechInput) window.SpeechInput.reset();renderEvaluation(a?.id);els.progressLabel.textContent=`Question ${current+1} of ${questions.length}`;els.answeredLabel.textContent=`${answers.size} answered`;els.progress.style.width=`${((current+1)/questions.length)*100}%`;els.prev.disabled=current===0;els.next.textContent=current===questions.length-1?'Finish interview':'Next →';}
  async function saveCurrent(show=true){if(busy) return null; const q=questions[current], text=els.answer.value.trim(), duration=Math.max(0,120-secondsLeft);const payload={question_id:q.id,user_id:session.user.id,answer_text:text,answer_method:answerMethod,duration_seconds:duration};busy=true; const {data,error}=await window.supabaseApp.client.from('answers').upsert(payload,{onConflict:'question_id,user_id'}).select().single(); busy=false; if(error)throw error;answers.set(q.id,data);evaluations.delete(data.id);renderList();renderEvaluation(data.id);if(show)message(text?'Answer saved.':'Empty answer saved.');return data;}
  
  function renderEvaluation(answerId){
    const ev=answerId?evaluations.get(answerId):null;
    if(!ev){els.evaluationPanel.hidden=true;els.evaluate.disabled=!answerId;return;}
    els.evaluationPanel.hidden=false;els.evaluate.disabled=false;els.evaluationScore.textContent=`${Number(ev.score).toFixed(0)}/100`;
    const labels=[['Correctness',ev.correctness],['Relevance',ev.relevance],['Technical knowledge',ev.technical_knowledge],['Completeness',ev.completeness],['Clarity',ev.clarity],['Communication',ev.communication]];
    els.evaluationScores.innerHTML=labels.map(([label,value])=>`<div class="evaluation-score"><small>${esc(label)}</small><strong>${Number(value).toFixed(0)}/100</strong></div>`).join('');
    els.evaluationFeedback.textContent=ev.feedback;els.evaluationSuggested.textContent=ev.suggested_answer;
  }

  async function evaluateCurrent(){
    if(evaluating)return;
    try{
      const saved=await saveCurrent(false);
      if(!saved?.answer_text?.trim()){message('Enter an answer before requesting AI evaluation.','error');return;}
      evaluating=true;els.evaluate.disabled=true;els.evaluate.textContent='Evaluating…';message('AI is evaluating this answer…');
      const {data,error}=await window.supabaseApp.client.functions.invoke('evaluate-answer',{body:{answer_id:saved.id}});
      if(error) throw error;
      if(!data?.evaluation) throw new Error('No evaluation was returned.');
      evaluations.set(saved.id,data.evaluation);renderEvaluation(saved.id);message('AI evaluation saved.');
    }catch(e){console.error(e);message(e.message||'Unable to evaluate answer.','error');}
    finally{evaluating=false;els.evaluate.disabled=false;els.evaluate.textContent='Evaluate answer';}
  }

  function startTimer(){clearInterval(timerId);timerId=setInterval(()=>{secondsLeft--;els.timer.textContent=fmt(secondsLeft);els.timer.classList.toggle('warning',secondsLeft<=30);if(secondsLeft<=0){clearInterval(timerId);saveCurrent(false).then(()=>goNext()).catch(e=>message(e.message,'error'));}},1000);}
  function resetTimer(){secondsLeft=120;els.timer.textContent=fmt(secondsLeft);els.timer.classList.remove('warning');startTimer();}
  async function goNext(){try{await saveCurrent(false);if(current<questions.length-1){current++;renderList();renderQuestion();resetTimer();}else{clearInterval(timerId);await window.supabaseApp.client.from('interviews').update({status:'completed',completed_at:new Date().toISOString()}).eq('id',interviewId).eq('user_id',session.user.id);if(window.CameraMonitor) await window.CameraMonitor.stop(); location.href=`report.html?interview_id=${encodeURIComponent(interviewId)}`;}}catch(e){message(e.message||'Unable to save answer.','error');}}
  const cameraVideo=qs('[data-camera]'), cameraStatus=qs('[data-camera-status]'), cameraFace=qs('[data-camera-face]'), cameraMultiple=qs('[data-camera-multiple]'), cameraAway=qs('[data-camera-away]'), cameraPosture=qs('[data-camera-posture]');
  if(cameraVideo && window.CameraMonitor){
    window.CameraMonitor.start({video:cameraVideo,client:window.supabaseApp.client,userId:session.user.id,interviewId,onStatus:(t,type)=>{cameraStatus.textContent=t;cameraStatus.dataset.type=type;}});
    setInterval(()=>{const m=window.CameraMonitor.getMetrics();cameraFace.textContent=`Face presence: ${m.face_presence_seconds}s`;cameraMultiple.textContent=`Multiple faces: ${m.multiple_faces_events}`;cameraAway.textContent=`Head-away: ${m.head_away_events}`;cameraPosture.textContent=`Posture events: ${m.posture_deviation_events}`;},2000);
    window.addEventListener('beforeunload',()=>{window.CameraMonitor.stop();});
  }
  els.save.addEventListener('click',()=>saveCurrent(true).catch(e=>message(e.message,'error')));els.evaluate.addEventListener('click',evaluateCurrent);els.next.addEventListener('click',goNext);els.prev.addEventListener('click',async()=>{try{await saveCurrent(false);if(current>0){current--;renderList();renderQuestion();resetTimer();}}catch(e){message(e.message,'error')}});
})();
