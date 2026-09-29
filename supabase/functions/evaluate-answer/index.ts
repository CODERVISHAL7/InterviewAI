import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SCHEMA_DESCRIPTION = `Return exactly this JSON object shape:
{
  "score": 0,
  "correctness": 0,
  "relevance": 0,
  "technical_knowledge": 0,
  "completeness": 0,
  "clarity": 0,
  "communication": 0,
  "feedback": "",
  "suggested_answer": ""
}
All numeric values must be integers from 0 to 100. Do not include chain-of-thought, hidden reasoning, or analysis. Feedback should be concise and actionable. The suggested answer should be a strong interview-ready answer, not an explanation of your grading process.`;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function sleep(ms: number) { return new Promise((resolve) => setTimeout(resolve, ms)); }

function extractJson(text: string) {
  const cleaned = text.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
  try { return JSON.parse(cleaned); } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
    throw new Error("Invalid JSON returned by AI provider.");
  }
}

function normalizeEvaluation(raw: any) {
  const numeric = ["score", "correctness", "relevance", "technical_knowledge", "completeness", "clarity", "communication"];
  const out: any = {};
  for (const key of numeric) {
    const n = Number(raw?.[key]);
    if (!Number.isFinite(n)) throw new Error(`AI returned an invalid ${key} score.`);
    out[key] = Math.max(0, Math.min(100, Math.round(n)));
  }
  out.feedback = String(raw?.feedback || "").trim();
  out.suggested_answer = String(raw?.suggested_answer || "").trim();
  if (!out.feedback || !out.suggested_answer) throw new Error("AI returned incomplete evaluation feedback.");
  return out;
}

function buildPrompt(question: any, answer: any) {
  return `You are an expert interview evaluator.
Evaluate the candidate's answer against the interview question.

Question:
${question.question_text}

Question category: ${question.category}
Question difficulty: ${question.difficulty}

Candidate answer (${answer.answer_method}):
${answer.answer_text || "[No answer provided]"}

Evaluation rules:
- Judge the answer only against the question and the information actually provided.
- Score correctness, relevance, technical knowledge, completeness, clarity, and communication independently from 0 to 100.
- The overall score should reflect the quality of the answer across those dimensions.
- Do not penalize a voice transcript merely because it is a transcript; evaluate its substantive content and communication quality.
- Do not invent facts about the candidate.
- Provide concise, actionable feedback.
- Provide a suggested interview-ready answer that addresses the question accurately.
- Never reveal chain-of-thought or private reasoning.

${SCHEMA_DESCRIPTION}`;
}

async function callGroq(prompt: string, apiKey: string, model: string) {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, temperature: 0.2, messages: [
      { role: "system", content: "You evaluate interview answers and return valid JSON only." },
      { role: "user", content: prompt },
    ], response_format: { type: "json_object" }}),
  });
  const raw = await response.text();
  if (!response.ok) throw Object.assign(new Error("Groq request failed"), { status: response.status });
  const data = JSON.parse(raw);
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error("Groq returned no content.");
  return { data: extractJson(text), model };
}

async function callOpenRouter(prompt: string, apiKey: string, model: string) {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "HTTP-Referer": "https://supabase.com/", "X-Title": "AI Interview Preparation System" },
    body: JSON.stringify({ model, temperature: 0.2, messages: [
      { role: "system", content: "You evaluate interview answers and return valid JSON only." },
      { role: "user", content: prompt },
    ], response_format: { type: "json_object" }}),
  });
  const raw = await response.text();
  if (!response.ok) throw Object.assign(new Error("OpenRouter request failed"), { status: response.status });
  const data = JSON.parse(raw);
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error("OpenRouter returned no content.");
  return { data: extractJson(text), model };
}

async function callGemini(prompt: string, apiKey: string, model: string) {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json" } }),
  });
  const raw = await response.text();
  if (!response.ok) throw Object.assign(new Error("Gemini request failed"), { status: response.status });
  const data = JSON.parse(raw);
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini returned no content.");
  return { data: extractJson(text), model };
}

async function generateWithProvider(provider: string, prompt: string) {
  if (provider === "groq") {
    const key = Deno.env.get("GROQ_API_KEY");
    if (!key) throw new Error("GROQ_API_KEY is not configured.");
    return callGroq(prompt, key, Deno.env.get("GROQ_MODEL") || "openai/gpt-oss-20b");
  }
  if (provider === "openrouter") {
    const key = Deno.env.get("OPENROUTER_API_KEY");
    if (!key) throw new Error("OPENROUTER_API_KEY is not configured.");
    return callOpenRouter(prompt, key, Deno.env.get("OPENROUTER_MODEL") || "openrouter/free");
  }
  if (provider === "gemini") {
    const key = Deno.env.get("GEMINI_API_KEY");
    if (!key) throw new Error("GEMINI_API_KEY is not configured.");
    return callGemini(prompt, key, Deno.env.get("GEMINI_MODEL") || "gemini-3.8-flash");
  }
  throw new Error(`Unsupported AI_PROVIDER: ${provider}`);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const provider = (Deno.env.get("AI_PROVIDER") || "groq").toLowerCase();
  if (!supabaseUrl || !anonKey || !serviceRoleKey) return json({ error: "Server Supabase configuration is incomplete." }, 500);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "Authentication required." }, 401);

  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) return json({ error: "Invalid or expired session." }, 401);

  let body: { answer_id?: string };
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON body." }, 400); }
  if (!body.answer_id) return json({ error: "answer_id is required." }, 400);

  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  const { data: answer, error: answerError } = await adminClient
    .from("answers")
    .select("id, question_id, user_id, answer_text, answer_method")
    .eq("id", body.answer_id)
    .eq("user_id", userData.user.id)
    .single();
  if (answerError || !answer) return json({ error: "Answer not found." }, 404);

  const { data: question, error: questionError } = await adminClient
    .from("questions")
    .select("id, interview_id, question_text, category, difficulty")
    .eq("id", answer.question_id)
    .single();
  if (questionError || !question) return json({ error: "Question not found." }, 404);

  const { data: interview, error: interviewError } = await adminClient
    .from("interviews")
    .select("id, user_id")
    .eq("id", question.interview_id)
    .eq("user_id", userData.user.id)
    .single();
  if (interviewError || !interview) return json({ error: "Answer ownership could not be verified." }, 403);

  const prompt = buildPrompt(question, answer);
  let result: { data: any; model: string } | null = null;
  let lastError: unknown = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try { result = await generateWithProvider(provider, prompt); break; }
    catch (error) {
      lastError = error;
      const status = Number((error as any)?.status || 0);
      const retryable = status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
      if (!retryable || attempt === 1) break;
      await sleep(2000);
    }
  }
  if (!result) {
    const status = Number((lastError as any)?.status || 0);
    if (status === 429) return json({ error: `${provider} rate limit/quota reached. Please try again later or switch AI_PROVIDER.` }, 429);
    if (status >= 500) return json({ error: `${provider} is temporarily unavailable. Please try again later.` }, 503);
    return json({ error: lastError instanceof Error ? lastError.message : "AI answer evaluation failed." }, 502);
  }

  let evaluation;
  try { evaluation = normalizeEvaluation(result.data); }
  catch (error) { return json({ error: error instanceof Error ? error.message : "Invalid AI evaluation." }, 502); }

  const row = {
    answer_id: answer.id,
    question_id: answer.question_id,
    user_id: userData.user.id,
    ...evaluation,
    provider,
    model: result.model,
  };

  const { data: saved, error: saveError } = await adminClient
    .from("evaluations")
    .upsert(row, { onConflict: "answer_id" })
    .select("id,answer_id,question_id,score,correctness,relevance,technical_knowledge,completeness,clarity,communication,feedback,suggested_answer,provider,model,created_at,updated_at")
    .single();
  if (saveError) return json({ error: "AI evaluation was generated but could not be saved." }, 500);

  return json({ evaluation: saved });
});
