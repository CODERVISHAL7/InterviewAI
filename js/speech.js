(function(){
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const supported = !!Recognition;
  let recognition = null, running = false, baseText = '';

  function attach({textarea,startButton,stopButton,status,onStart,onStop}) {
    if(!textarea || !startButton || !stopButton || !status) return;
    if(!supported){ startButton.disabled=true; stopButton.disabled=true; status.textContent='Voice input is not supported in this browser. Use the text box instead.'; return; }
    recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-IN';
    recognition.onstart=()=>{running=true;baseText=textarea.value.trim();startButton.disabled=true;stopButton.disabled=false;status.textContent='Listening… speak your answer.';if(onStart)onStart();};
    recognition.onresult=(event)=>{
      let finalText='', interim='';
      for(let i=event.resultIndex;i<event.results.length;i++){
        const part=event.results[i][0].transcript;
        if(event.results[i].isFinal) finalText += part + ' '; else interim += part;
      }
      const prefix=baseText ? baseText + ' ' : '';
      textarea.value=(prefix + finalText + interim).trimStart();
    };
    recognition.onerror=(event)=>{status.textContent=event.error==='not-allowed'?'Microphone permission was denied. You can type your answer instead.':`Voice input error: ${event.error}. You can continue with text.`;running=false;startButton.disabled=false;stopButton.disabled=true;};
    recognition.onend=()=>{running=false;startButton.disabled=false;stopButton.disabled=true;if(status.textContent==='Listening… speak your answer.')status.textContent='Voice input stopped. You can edit the transcript before saving.';if(onStop)onStop();};
    startButton.addEventListener('click',()=>{if(!running){baseText=textarea.value.trim();try{recognition.start();}catch(e){status.textContent='Voice input is already starting. Please try again.';}}});
    stopButton.addEventListener('click',()=>{if(running)recognition.stop();});
    stopButton.disabled=true;
  }
  function reset(){ if(running && recognition) recognition.stop(); baseText=''; }
  window.SpeechInput={supported,attach,reset};
})();
