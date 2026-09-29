(function(){
  const Vision = { FilesetResolver:null, FaceDetector:null, PoseLandmarker:null };
  let stream=null, video=null, canvas=null, ctx=null, detector=null, pose=null, interval=null;
  let userId=null, interviewId=null, client=null, onStatus=()=>{};
  let startedAt=null, lastTick=null, lastOutAt=null, lastAwayAt=null, lastPostureAt=null, lastPersistAt=0;
  let multipleCandidateSince=0, outCandidateSince=0;
  let lastValidFaceCount=0;
  let metrics={camera_permission:'unknown',face_presence_seconds:0,multiple_faces_events:0,out_of_frame_events:0,out_of_frame_seconds:0,head_away_events:0,posture_deviation_events:0};

  const MODEL_BASE='https://storage.googleapis.com/mediapipe-models';
  const FACE_MODEL=`${MODEL_BASE}/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite`;
  const POSE_MODEL=`${MODEL_BASE}/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task`;

  async function loadVision(){
    if(detector || pose) return;
    const mod=await import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/vision_bundle.mjs');
    Vision.FilesetResolver=mod.FilesetResolver; Vision.FaceDetector=mod.FaceDetector; Vision.PoseLandmarker=mod.PoseLandmarker;
    const fileset=await Vision.FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm');
    detector=await Vision.FaceDetector.createFromOptions(fileset,{baseOptions:{modelAssetPath:FACE_MODEL},runningMode:'VIDEO',minDetectionConfidence:.70});
    pose=await Vision.PoseLandmarker.createFromOptions(fileset,{baseOptions:{modelAssetPath:POSE_MODEL},runningMode:'VIDEO',numPoses:1,minPoseDetectionConfidence:.45,minTrackingConfidence:.45});
  }

  function setStatus(text,type='info'){ onStatus(text,type); }
  async function persist(final=false){
    if(!client || !userId || !interviewId) return;
    // Persist only real database columns. Internal debounce timestamps such as
    // _lastMultipleAt must never be sent to Supabase.
    const payload={
      interview_id:interviewId,
      user_id:userId,
      camera_permission:metrics.camera_permission,
      face_presence_seconds:Math.max(0,Math.floor(metrics.face_presence_seconds||0)),
      multiple_faces_events:Math.max(0,Math.floor(metrics.multiple_faces_events||0)),
      out_of_frame_events:Math.max(0,Math.floor(metrics.out_of_frame_events||0)),
      out_of_frame_seconds:Math.max(0,Math.floor(metrics.out_of_frame_seconds||0)),
      head_away_events:Math.max(0,Math.floor(metrics.head_away_events||0)),
      posture_deviation_events:Math.max(0,Math.floor(metrics.posture_deviation_events||0)),
      monitoring_started_at:metrics.monitoring_started_at||null,
      updated_at:new Date().toISOString()
    };
    if(final) payload.monitoring_ended_at=new Date().toISOString();
    const {error}=await client.from('behavior_metrics').upsert(payload,{onConflict:'interview_id'});
    if(error) console.error('behavior metrics save failed',error);
  }

  function bboxCenterAway(face){
    if(!face?.boundingBox) return false;
    const b=face.boundingBox; const cx=(b.originX+b.width/2)/(video.videoWidth||1); const cy=(b.originY+b.height/2)/(video.videoHeight||1);
    return cx<.22 || cx>.78 || cy<.18 || cy>.82;
  }
  function postureDeviation(result){
    const lm=result?.landmarks?.[0]; if(!lm) return false;
    const ls=lm[11], rs=lm[12], lh=lm[23], rh=lm[24];
    if(!ls||!rs||!lh||!rh) return false;
    const shoulderY=(ls.y+rs.y)/2, hipY=(lh.y+rh.y)/2;
    return shoulderY>0.65 || hipY>0.95 || Math.abs(ls.x-rs.x)<0.08;
  }
  async function tick(){
    if(!video || video.readyState<2 || !detector) return;
    const now=performance.now();
    let rawFaces=[];
    try{ rawFaces=detector.detectForVideo(video,now).detections||[]; }catch(e){return;}
    // Ignore tiny/edge-only detections that are commonly produced by background clutter.
    const vw=video.videoWidth||640, vh=video.videoHeight||480;
    const faces=rawFaces.filter(d=>{
      const b=d?.boundingBox;
      if(!b || b.width<=0 || b.height<=0) return false;
      const area=(b.width*b.height)/(vw*vh);
      const cx=(b.originX+b.width/2)/vw, cy=(b.originY+b.height/2)/vh;
      return area>=0.015 && cx>=-.05 && cx<=1.05 && cy>=-.05 && cy<=1.05;
    });
    const seconds=Math.max(1,Math.round((now-lastTick)/1000)); lastTick=now;
    if(faces.length===1) metrics.face_presence_seconds+=seconds;
    // Require multiple-face evidence to persist across several samples before counting it.
    if(faces.length>1){
      if(!multipleCandidateSince) multipleCandidateSince=now;
      if(now-multipleCandidateSince>=2400 && now-(metrics._lastMultipleAt||0)>7000){
        metrics.multiple_faces_events++; metrics._lastMultipleAt=now;
      }
    } else {
      multipleCandidateSince=0;
    }
    const out=faces.length===0;
    if(out){
      if(!outCandidateSince) outCandidateSince=now;
      metrics.out_of_frame_seconds+=seconds;
      if(now-outCandidateSince>=2400 && now-(metrics._lastOutEventAt||0)>7000){
        metrics.out_of_frame_events++; metrics._lastOutEventAt=now;
      }
    } else {
      outCandidateSince=0;
      lastOutAt=null;
    }
    if(faces.length===1 && bboxCenterAway(faces[0])){
      if(!lastAwayAt) lastAwayAt=now;
      if(now-(metrics._lastAwayEventAt||0)>7000){metrics.head_away_events++;metrics._lastAwayEventAt=now;}
    } else lastAwayAt=null;
    try{
      const pr=pose?.detectForVideo(video,now); if(postureDeviation(pr) && now-(metrics._lastPostureAt||0)>7000){metrics.posture_deviation_events++;metrics._lastPostureAt=now;}
    }catch(e){}
    if(now-lastPersistAt>=10000){lastPersistAt=now;await persist(false);}
    lastValidFaceCount=faces.length;
    const label=faces.length>1?'Multiple people detected':faces.length===0?'No face detected':bboxCenterAway(faces[0])?'Face near/outside frame':'Face detected';
    setStatus(label,faces.length===1&&!bboxCenterAway(faces[0])?'ok':'warn');
  }

  async function start(opts){
    ({video,canvas,client,userId,interviewId,onStatus}=opts);
    try{
      if(!navigator.mediaDevices?.getUserMedia){metrics.camera_permission='unsupported';setStatus('Camera API is not supported in this browser.','error');await persist(false);return false;}
      stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:640},height:{ideal:480}},audio:false});
      video.srcObject=stream; await video.play();
      if(canvas){canvas.width=video.videoWidth||640;canvas.height=video.videoHeight||480;ctx=canvas.getContext('2d');}
      metrics.camera_permission='granted'; metrics.monitoring_started_at=new Date().toISOString(); startedAt=lastTick=performance.now(); lastPersistAt=startedAt;
      await persist(false);
      try{await loadVision();setStatus('Camera active. Local integrity monitoring is running.','ok');}
      catch(e){console.error(e);setStatus('Camera active. Face/posture model unavailable; camera presence is still recorded.','warn');}
      clearInterval(interval); interval=setInterval(tick,1200); return true;
    }catch(e){
      metrics.camera_permission=e?.name==='NotAllowedError'?'denied':'error';setStatus(metrics.camera_permission==='denied'?'Camera permission was denied. You can continue, but monitoring is limited.':'Camera could not be started. You can continue without monitoring.','error');await persist(false);return false;
    }
  }
  async function stop(){clearInterval(interval);interval=null;if(stream)stream.getTracks().forEach(t=>t.stop());stream=null;await persist(true);}
  window.CameraMonitor={start,stop,getMetrics:()=>({...metrics})};
})();
