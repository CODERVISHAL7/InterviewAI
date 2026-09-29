import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const QUESTION_SCHEMA_DESCRIPTION = `Return one JSON object with a "questions" array. Each item must contain question_text, category, and difficulty. difficulty must be Beginner, Intermediate, or Advanced.`;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildPrompt(interview: any, resumeContext: any = null) {
  const resumeBlock = resumeContext ? `\nRESUME EVIDENCE (authoritative; do not add facts):\n${JSON.stringify(resumeContext, null, 2)}\n\nSTRICT RESUME-GROUNDING RULES:\n- A question may be labeled Resume-Based ONLY when it is directly supported by the evidence above.\n- Every Resume-Based question MUST explicitly mention at least one exact project name, technology, course/concept, education item, certification, or experience item that appears in the evidence.\n- Use only technologies/frameworks/tools explicitly present in the resume evidence.\n- Never infer or invent technologies, frameworks, libraries, job experience, implementation details, responsibilities, metrics, or architecture that the resume does not state.
- A technology listed in the global Skills section does NOT prove that the technology was used in a specific project. For project-specific questions, the technology must also be explicitly mentioned in that project's own resume description.\n- If a technology is not present in the evidence, do not introduce it as something the candidate used or knows.\n- Do not label a generic technical question as Resume-Based merely because it is relevant to the job role.\n- Prefer questions about the candidate's listed projects, listed technologies, listed coursework, and documented experience.\n- When sufficient evidence exists, include at least 2 genuinely resume-grounded questions.\n` : "";
  return `You are an expert technical interviewer.
Generate exactly ${interview.total_questions} interview questions for a mock interview.

Job role: ${interview.job_role}
Company: ${interview.company || "Not specified"}
Interview type: ${interview.interview_type}
Difficulty: ${interview.difficulty}
Skills/topics: ${interview.skills || "General role fundamentals"}

Requirements:
- Questions must be relevant to the job role and listed skills.
- Avoid duplicate or near-duplicate questions.
- Mix conceptual, practical, and scenario-based questions where appropriate.
- For HR interviews, generate behavioral/people-focused questions about teamwork, conflict, communication, leadership, adaptability, motivation, strengths/weaknesses, failure, feedback, ownership, time management, and STAR-style experiences. Do NOT ask implementation, coding, framework, database, API, architecture, algorithm, debugging, or technology-design questions in HR mode. Technical context may appear only as background, never as the thing being tested.
- For Mixed interviews, balance technical questions with HR/behavioral and situational questions.
- Do not provide answers, explanations, hints, or markdown.
- Use concise, interview-ready wording.
- Keep every question appropriate for the selected difficulty.
- Return exactly ${interview.total_questions} items.
- Use category values such as Technical, Problem Solving, Practical, Scenario, or Resume-Based.
${resumeBlock}
${QUESTION_SCHEMA_DESCRIPTION}`;
}

function resumeAnchors(resumeContext: any) {
  const source = JSON.stringify(resumeContext || "");
  const candidates = new Set<string>();
  const patterns = [
    /AI-Based Smart Interview Preparation System/gi,
    /Traditional Folk Music Preservation Platform/gi,
    /BrainWars Quiz Platform/gi,
    /College Student Assistant Website/gi,
    /Bus Wally/gi,
    /Chore Hub/gi,
    /Smart India Hackathon/gi,
    /IBM AI Summer Training Program/gi,
    /JavaScript|Java|C|HTML|CSS|React|Node\.js|Express\.js|Tailwind CSS|MongoDB|MySQL|Firebase|JDBC|JSP|Servlets|Socket Programming|Computer Networks|Cybersecurity|IoT|Git|GitHub/gi,
  ];
  for (const pattern of patterns) {
    const matches = source.match(pattern) || [];
    for (const match of matches) candidates.add(match.toLowerCase());
  }
  return [...candidates].filter((x) => x.length >= 3);
}

function hasResumeAnchor(questionText: string, anchors: string[]) {
  const q = questionText.toLowerCase();
  return anchors.some((anchor) => q.includes(anchor));
}

function normalize(value: string) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9.+#-]+/g, " ").replace(/\s+/g, " ").trim();
}

function extractProjectEvidence(resumeContext: any) {
  const raw = String(resumeContext?.raw_text || "");
  const lines = raw.split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
  const names = [
    "AI-Based Smart Interview Preparation System",
    "Traditional Folk Music Preservation Platform",
    "BrainWars Quiz Platform",
    "College Student Assistant Website",
    "Bus Wally",
    "Chore Hub",
  ];
  const normalizedNames = names.map((name) => ({ name, key: normalize(name) }));
  const projects: Array<{name:string,evidence:string}> = [];
  let current: {name:string,evidence:string[]}|null = null;
  for (const line of lines) {
    const hit = normalizedNames.find((n) => normalize(line).startsWith(n.key));
    if (hit) {
      if (current) projects.push({ name: current.name, evidence: current.evidence.join(" ") });
      current = { name: hit.name, evidence: [line] };
      continue;
    }
    if (/^(EXPERIENCE|CERTIFICATIONS|EDUCATION|RELEVANT COURSEWORK|SOFT SKILLS|LANGUAGES|AREAS OF INTEREST)$/i.test(line)) {
      if (current) projects.push({ name: current.name, evidence: current.evidence.join(" ") });
      current = null;
      continue;
    }
    if (current) current.evidence.push(line);
  }
  if (current) projects.push({ name: current.name, evidence: current.evidence.join(" ") });
  return projects.map((p) => ({ name: normalize(p.name), evidence: normalize(p.evidence) }));
}

function validateProjectTechnologyClaim(questionText: string, resumeContext: any) {
  const q = normalize(questionText);
  const projectNames = [
    "ai-based smart interview preparation system",
    "traditional folk music preservation platform",
    "brainwars quiz platform",
    "college student assistant website",
    "bus wally",
    "chore hub",
  ];
  const mentionedProject = projectNames.find((name) => q.includes(name));
  if (!mentionedProject) return true;

  const projectEntries = extractProjectEvidence(resumeContext);
  const projectEntry = projectEntries.find((entry) => entry.name === mentionedProject);
  if (!projectEntry) return false;
  const evidence = projectEntry.evidence;

  // Resume-Based questions must not convert a broad project claim into an
  // undocumented implementation claim. "Architected Bus Wally" does not mean
  // the resume documents a particular architecture decision, database, protocol,
  // framework, library, or implementation technique.
  const unsupportedClaimPatterns = [
    /\bwhat (?:architectural|architecture) decisions? did you make\b/,
    /\bwhat (?:technical|design) decisions? did you make\b/,
    /\bhow did you (?:implement|integrate|build|develop|deploy|host|scale|optimize|configure|design)\b/,
    /\bwhat (?:database|framework|library|protocol|api|schema|architecture|deployment|hosting|caching|websocket|technology|language) did you (?:use|choose|implement|integrate)\b/,
    /\bwhich (?:database|framework|library|protocol|api|schema|architecture|deployment|hosting|caching|websocket|technology|language) did you (?:use|choose|implement|integrate)\b/,
    /\bhow did you handle\b/,
    /\bhow did you store\b/,
    /\bhow did you connect\b/,
  ];

  const projectFacts = [
    "driver-side mobile geolocation",
    "driver-side geolocation",
    "real-time driver-side geolocation",
    "role-specific interview questions",
    "evaluates candidate responses",
    "automated feedback",
    "performance reports",
    "multiple game modes",
    "real-time leaderboards",
    "friend challenge",
    "academic resources",
    "productivity tools",
    "mind-game challenges",
    "regional wedding and folk songs",
    "categorized libraries",
    "assign chores",
    "point values",
    "redeem accumulated points",
  ];

  const asksUnsupportedClaim = unsupportedClaimPatterns.some((pattern) => pattern.test(q));
  if (asksUnsupportedClaim) {
    const directlySupported = projectFacts.some((fact) => q.includes(fact) && evidence.includes(fact));
    if (!directlySupported) return false;
  }

  const technologyTerms = [
    "spring", "spring boot", "completablefuture", "react", "node.js", "node",
    "express.js", "express", "tailwind css", "mongodb", "mysql", "firebase",
    "javascript", "java", "jdbc", "jsp", "servlets", "socket programming",
    "websockets", "python", "typescript", "supabase", "groq", "gemini",
  ];
  const mentionedTech = technologyTerms.find((tech) => q.includes(tech));
  const projectUsageClaim = /\b(did you use|used|use|implemented|built with|developed with|integrated|integrate|chosen|choose|what .*framework|which .*framework|what .*technology|which .*technology|what .*library|which .*library|what .*language|which .*language|how did you use)\b/.test(q);
  if (!projectUsageClaim || !mentionedTech) return true;

  const aliases: Record<string, string[]> = {
    "node.js": ["node.js", "node"], "node": ["node.js", "node"],
    "express.js": ["express.js", "express"], "express": ["express.js", "express"],
    "spring boot": ["spring boot", "spring"], "websockets": ["websockets", "websocket"],
  };
  const needles = aliases[mentionedTech] || [mentionedTech];
  return needles.some((needle) => evidence.includes(needle));
}

function validateHrQuestion(questionText: string) {
  const q = normalize(questionText);
  const behavioralSignals = [
    "tell me about a time", "describe a time", "describe a situation", "how did you handle",
    "how do you handle", "what did you learn", "what would you do", "how would you respond",
    "conflict", "disagreement", "team", "teammate", "collaborat", "leadership", "initiative",
    "failure", "mistake", "feedback", "criticism", "adapt", "change", "deadline", "pressure",
    "priorit", "motivat", "strength", "weakness", "communication", "difficult", "challenge",
    "ownership", "accountability", "time management", "why do you want", "why are you interested",
    "career", "goal", "star"
  ];
  const technicalImplementationSignals = [
    "write a", "write code", "implement", "implementation", "debug", "database", "mysql", "mongodb",
    "jdbc", "spring", "spring boot", "react", "node.js", "express", "api", "endpoint", "websocket",
    "algorithm", "data structure", "sql query", "css rule", "javascript method", "framework", "library",
    "architecture", "architectural", "connection pooling", "concurrency", "completablefuture", "deploy",
    "optimize the code", "coding", "programming"
  ];
  const hasBehavioral = behavioralSignals.some((x) => q.includes(x));
  const isTechnical = technicalImplementationSignals.some((x) => q.includes(x));
  return hasBehavioral && !isTechnical;
}

function extractJson(text: string) {
  const cleaned = text.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
    throw new Error("Invalid JSON returned by AI provider.");
  }
}

async function callGroq(prompt: string, apiKey: string, model: string) {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        { role: "system", content: "You generate structured interview questions. Return valid JSON only." },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    }),
  });

  const raw = await response.text();
  if (!response.ok) {
    console.error("Groq API error", response.status, raw);
    throw Object.assign(new Error("Groq request failed"), { status: response.status });
  }

  const data = JSON.parse(raw);
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error("Groq returned no content.");
  return { data: extractJson(text), model };
}

async function callOpenRouter(prompt: string, apiKey: string, model: string) {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://supabase.com/",
      "X-Title": "AI Interview Preparation System",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        { role: "system", content: "You generate structured interview questions. Return valid JSON only." },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    }),
  });

  const raw = await response.text();
  if (!response.ok) {
    console.error("OpenRouter API error", response.status, raw);
    throw Object.assign(new Error("OpenRouter request failed"), { status: response.status });
  }

  const data = JSON.parse(raw);
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error("OpenRouter returned no content.");
  return { data: extractJson(text), model };
}

async function callGemini(prompt: string, apiKey: string, model: string) {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" },
    }),
  });

  const raw = await response.text();
  if (!response.ok) {
    console.error("Gemini API error", response.status, raw);
    throw Object.assign(new Error("Gemini request failed"), { status: response.status });
  }

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

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json({ error: "Server Supabase configuration is incomplete." }, 500);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "Authentication required." }, 401);

  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) return json({ error: "Invalid or expired session." }, 401);

  let body: { interview_id?: string };
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON body." }, 400); }
  if (!body.interview_id) return json({ error: "interview_id is required." }, 400);

  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  const { data: interview, error: interviewError } = await adminClient
    .from("interviews")
    .select("id, user_id, job_role, company, interview_type, difficulty, skills, total_questions, status, resume_id")
    .eq("id", body.interview_id)
    .eq("user_id", userData.user.id)
    .single();

  if (interviewError || !interview) return json({ error: "Interview not found." }, 404);

  let resumeContext = null;
  if ((interview as any).resume_id) {
    const { data: resume } = await adminClient.from("resumes").select("id, status, parsed_data, raw_text").eq("id", (interview as any).resume_id).eq("user_id", userData.user.id).single();
    if (resume?.status === "processed") resumeContext = { ...(resume.parsed_data || {}), raw_text: resume.raw_text || "" };
  }

  const prompt = buildPrompt(interview, resumeContext);
  let result: { data: any; model: string } | null = null;
  let lastError: unknown = null;
  const maxAttempts = provider === "gemini" ? 3 : 2;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      result = await generateWithProvider(provider, prompt);
      break;
    } catch (error) {
      lastError = error;
      const status = Number((error as any)?.status || 0);
      const retryable = status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
      if (!retryable || attempt === maxAttempts - 1) break;
      await sleep(2000 * (2 ** attempt));
    }
  }

  if (!result) {
    const status = Number((lastError as any)?.status || 0);
    if (status === 429) return json({ error: `${provider} rate limit/quota reached. Please try again later or switch AI_PROVIDER.` }, 429);
    if (status >= 500) return json({ error: `${provider} is temporarily unavailable. Please try again later.` }, 503);
    return json({ error: lastError instanceof Error ? lastError.message : "AI question generation failed." }, 502);
  }

  const generated = Array.isArray(result.data?.questions) ? result.data.questions : [];
  if (generated.length !== interview.total_questions) {
    return json({ error: `AI returned ${generated.length} questions; expected ${interview.total_questions}.` }, 502);
  }

  if (resumeContext) {
    const anchors = resumeAnchors(resumeContext);
    for (const item of generated) {
      const category = String(item.category || "").trim().toLowerCase();
      const text = String(item.question_text || "").trim();
      if (category === "resume-based" && !hasResumeAnchor(text, anchors)) {
        return json({
          error: "AI produced a Resume-Based question without an identifiable resume anchor. Please regenerate questions.",
        }, 502);
      }
      if (category === "resume-based" && !validateProjectTechnologyClaim(text, resumeContext)) {
        return json({
          error: "AI produced a Resume-Based question that claims a technology was used in a project without explicit project-level evidence in the resume. Please regenerate questions.",
        }, 502);
      }
      if (String(interview.interview_type || "").trim().toLowerCase() === "hr" && !validateHrQuestion(text)) {
        return json({
          error: "AI produced a non-behavioral or implementation-focused question in HR mode. Please regenerate questions.",
        }, 502);
      }
    }
  }

  const questions = generated.map((item: any, index: number) => ({
    interview_id: interview.id,
    question_text: String(item.question_text || "").trim(),
    category: String(item.category || "Technical").trim(),
    difficulty: interview.difficulty,
    question_order: index + 1,
    source: `AI-generated (${provider})`,
  }));

  if (questions.some((q: any) => !q.question_text)) return json({ error: "AI returned an empty question." }, 502);

  const { error: deleteError } = await adminClient.from("questions").delete().eq("interview_id", interview.id);
  if (deleteError) return json({ error: "Unable to reset existing questions." }, 500);

  const { data: inserted, error: insertError } = await adminClient
    .from("questions")
    .insert(questions)
    .select("id, question_text, category, difficulty, question_order, source, created_at")
    .order("question_order", { ascending: true });

  if (insertError) return json({ error: "Unable to save generated questions." }, 500);

  const { error: updateError } = await adminClient
    .from("interviews")
    .update({ status: "questions_generated" })
    .eq("id", interview.id)
    .eq("user_id", userData.user.id);

  if (updateError) return json({ error: "Questions were saved, but interview status could not be updated." }, 500);

  return json({ interview_id: interview.id, questions: inserted, count: inserted?.length || 0, provider, model: result.model });
});
