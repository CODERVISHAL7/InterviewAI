import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const corsHeaders={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...corsHeaders,"Content-Type":"application/json"}});
function clamp(n:number){return Math.max(0,Math.min(100,n));}
function build(report:any, interview:any){
 const dims=[['Correctness',Number(report.correctness||0),'correctness'],['Relevance',Number(report.relevance||0),'relevance'],['Technical knowledge',Number(report.technical_knowledge||0),'technical_knowledge'],['Completeness',Number(report.completeness||0),'completeness'],['Clarity',Number(report.clarity||0),'clarity'],['Communication',Number(report.communication||0),'communication']].sort((a,b)=>Number(a[1])-Number(b[1]));
 const focus=dims.slice(0,3).map(([label,score])=>({area:label,score:clamp(Number(score))}));
 const topicMap:any={
  'Correctness':{topic:'Core concepts and accuracy',action:'Review the core concepts behind each question type and practice explaining the correct approach before coding.',hr:'When unsure, state assumptions clearly and verify the requirement before answering.'},
  'Relevance':{topic:'Requirement-focused answering',action:'Practice answering the exact question first, then add only supporting details that directly help the interviewer.',hr:'Use a concise STAR-style structure and keep examples tied to the question.'},
  'Technical knowledge':{topic:'Technical fundamentals',action:'Choose 2–3 weak technical topics from this interview and solve small implementation problems for each.',hr:'Explain technical choices in simple language and connect them to practical outcomes.'},
  'Completeness':{topic:'Complete answer structure',action:'Use a checklist: approach, implementation, edge cases, trade-offs, and result where applicable.',hr:'For behavioral answers, include context, action, and measurable or observable result when available.'},
  'Clarity':{topic:'Clear technical communication',action:'Practice 60–90 second explanations using a simple structure: context → approach → example → conclusion.',hr:'Avoid long introductions; lead with the main point and support it with one concrete example.'},
  'Communication':{topic:'Interview communication',action:'Practice speaking answers aloud and reduce filler words while maintaining a steady, structured explanation.',hr:'Use confident, concise responses and pause briefly before answering difficult questions.'}
 };
 const topics=focus.map(({area,score})=>({area,score:Number(score),topic:topicMap[area as string].topic}));
 const actions=focus.map(({area})=>topicMap[area as string].action);
 const hrTips=focus.map(({area})=>topicMap[area as string].hr);
 return {focus_areas:topics,recommended_topics:topics.map(x=>x.topic),action_plan:actions,hr_practice_tips:hrTips,interview_type:interview.interview_type};
}
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:corsHeaders});
 if(req.method!=='POST')return json({error:'Method not allowed'},405);
 const url=Deno.env.get('SUPABASE_URL'),anon=Deno.env.get('SUPABASE_ANON_KEY'),service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
 if(!url||!anon||!service)return json({error:'Server Supabase configuration is incomplete.'},500);
 const auth=req.headers.get('Authorization');if(!auth?.startsWith('Bearer '))return json({error:'Authentication required.'},401);
 const userClient=createClient(url,anon,{global:{headers:{Authorization:auth}}});const {data:{user},error:ue}=await userClient.auth.getUser();if(ue||!user)return json({error:'Invalid authentication token.'},401);
 let body:any={};try{body=await req.json()}catch{return json({error:'Invalid JSON body.'},400)};
 const interviewId=String(body.interview_id||'');if(!interviewId)return json({error:'interview_id is required.'},400);
 const admin=createClient(url,service);
 const {data:interview,error:ie}=await admin.from('interviews').select('id,user_id,job_role,interview_type,difficulty').eq('id',interviewId).eq('user_id',user.id).single();if(ie||!interview)return json({error:'Interview not found.'},404);
 const {data:report,error:re}=await admin.from('performance_reports').select('*').eq('interview_id',interviewId).eq('user_id',user.id).single();if(re||!report)return json({error:'Generate the interview report before requesting learning recommendations.'},400);
 const recommendation=build(report,interview);
 const {data:saved,error:se}=await admin.from('learning_recommendations').upsert({interview_id:interviewId,user_id:user.id,focus_areas:recommendation.focus_areas,recommended_topics:recommendation.recommended_topics,action_plan:recommendation.action_plan,hr_practice_tips:recommendation.hr_practice_tips},{onConflict:'interview_id'}).select('*').single();
 if(se)return json({error:'Recommendations could not be saved.'},500);
 return json({recommendations:saved});
});
