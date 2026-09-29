import { createClient } from "npm:@supabase/supabase-js@2";
import pdfParse from "npm:pdf-parse@1.1.1";
import mammoth from "npm:mammoth@1.8.0";
import WordExtractor from "npm:word-extractor@1.0.4";
import { Buffer } from "node:buffer";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
function cleanText(value: string) {
  return value.replace(/\r/g, "").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}
function parseSections(text: string) {
  const lines = text.split(/\n+/).map((x) => x.trim()).filter(Boolean);
  const headings = /^(education|academic|skills?|technical skills?|projects?|experience|work experience|internships?|certifications?|achievements?|summary|profile|objective)\b/i;
  const sections: Record<string, string[]> = { education: [], skills: [], projects: [], experience: [], certifications: [] };
  let current = "";
  for (const line of lines) {
    if (headings.test(line)) {
      const h = line.toLowerCase();
      if (h.startsWith("edu") || h.startsWith("academic")) current = "education";
      else if (h.startsWith("skill") || h.startsWith("technical skill")) current = "skills";
      else if (h.startsWith("project")) current = "projects";
      else if (h.startsWith("experience") || h.startsWith("work") || h.startsWith("intern")) current = "experience";
      else if (h.startsWith("cert")) current = "certifications";
      else current = "";
      continue;
    }
    if (current) sections[current].push(line);
  }
  return Object.fromEntries(Object.entries(sections).map(([k, v]) => [k, v.join("\n").slice(0, 12000)]));
}
async function extractText(buffer: Uint8Array, mime: string, name: string) {
  const lower = name.toLowerCase();
  if (mime.includes("pdf") || lower.endsWith(".pdf")) {
    const result = await pdfParse(Buffer.from(buffer));
    return cleanText(result.text || "");
  }
  if (mime.includes("wordprocessingml") || lower.endsWith(".docx")) {
    const result = await mammoth.extractRawText({ buffer: Buffer.from(buffer) });
    return cleanText(result.value || "");
  }
  if (mime === "application/msword" || lower.endsWith(".doc")) {
    const extractor = new WordExtractor();
    const document = await extractor.extract(Buffer.from(buffer));
    return cleanText(document.getBody() || "");
  }
  throw new Error("Unsupported resume format. Please upload PDF, DOC, or DOCX.");
}
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) return json({ error: "Server Supabase configuration is incomplete." }, 500);
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "Authentication required." }, 401);
  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: userData } = await userClient.auth.getUser();
  if (!userData.user) return json({ error: "Invalid or expired session." }, 401);
  let body: { resume_id?: string };
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON body." }, 400); }
  if (!body.resume_id) return json({ error: "resume_id is required." }, 400);
  const admin = createClient(supabaseUrl, serviceRoleKey);
  const { data: resume, error: resumeError } = await admin.from("resumes").select("*").eq("id", body.resume_id).eq("user_id", userData.user.id).single();
  if (resumeError || !resume) return json({ error: "Resume not found." }, 404);
  await admin.from("resumes").update({ status: "processing", error_message: null }).eq("id", resume.id);
  try {
    const { data: file, error: downloadError } = await admin.storage.from("resumes").download(resume.file_path);
    if (downloadError || !file) throw new Error("Unable to read uploaded resume.");
    const buffer = new Uint8Array(await file.arrayBuffer());
    if (buffer.byteLength > 10 * 1024 * 1024) throw new Error("Resume file is too large. Maximum size is 10 MB.");
    const text = await extractText(buffer, resume.mime_type, resume.file_name);
    if (text.length < 80) throw new Error("Could not extract enough readable text from the resume.");
    const parsed = parseSections(text);
    await admin.from("resumes").update({ status: "processed", raw_text: text.slice(0, 30000), parsed_data: parsed, error_message: null }).eq("id", resume.id);
    return json({ resume_id: resume.id, status: "processed", parsed_data: parsed, text_length: text.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Resume processing failed.";
    await admin.from("resumes").update({ status: "failed", error_message: message }).eq("id", resume.id);
    return json({ error: message }, 422);
  }
});
