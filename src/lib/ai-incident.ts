import { supabase } from "@/integrations/supabase/client";

export interface AiIncidentOutput {
  summary: string;
  severity: "low" | "medium" | "high" | "critical";
  suggested_actions: string[];
  categories: string[];
  risk_score: number;
}

export interface AnalyzeInput {
  incident_id: string;
  title: string;
  description: string;
  category?: string;
}

async function callAi(system: string, user: string): Promise<any> {
  const { data, error } = await supabase.functions.invoke("ai-gateway", {
    body: { system, user },
  });
  if (error) throw new Error(error.message || "AI request failed");
  if ((data as any)?.error) throw new Error((data as any).error);
  return (data as any).result;
}

export async function analyzeIncidentClient(input: AnalyzeInput): Promise<AiIncidentOutput> {
  const parsed = (await callAi(
    "You return concise structured JSON only.",
    `You are a senior railway safety analyst. Analyse this railway incident and respond ONLY with strict JSON matching:
{"summary": string, "severity": "low"|"medium"|"high"|"critical", "suggested_actions": string[], "categories": string[], "risk_score": number}

Incident:
Title: ${input.title}
Category: ${input.category ?? "unspecified"}
Description: ${input.description}

risk_score is 0-100 (higher = more dangerous). Return JSON only.`,
  )) as AiIncidentOutput;

  const sev = (["low", "medium", "high", "critical"] as const).includes(parsed.severity) ? parsed.severity : "medium";

  const db = supabase as unknown as { from: (t: string) => any };
  await db.from("incidents").update({
    ai_summary: parsed.summary,
    ai_severity: sev,
    ai_suggested_actions: (parsed.suggested_actions ?? []).join("\n• "),
    ai_categories: parsed.categories ?? [],
  }).eq("id", input.incident_id);

  const { data: userData } = await supabase.auth.getUser();
  await db.from("ai_runs").insert({
    incident_id: input.incident_id,
    model: "google/gemini-2.5-flash",
    output: parsed,
    created_by: userData.user?.id ?? null,
  });

  return parsed;
}

// ---- Ops / analytics AI (moved off server-fn to Supabase edge function) ----

export async function aiDailyBriefing(incidents: { title: string; severity: string; status: string; category?: string | null }[]) {
  if (incidents.length === 0) {
    return { headline: "All clear", summary: "No incidents on the board right now.", risks: [], recommendations: [] };
  }
  const list = incidents.map((i, idx) => `${idx + 1}. [${i.severity}/${i.status}] ${i.category ?? "other"}: ${i.title}`).join("\n");
  const out = await callAi(
    "You are the chief safety officer of a railway operations center. Respond ONLY in strict JSON.",
    `Generate today's operations briefing. Respond as JSON:
{"headline": string, "summary": string, "risks": string[], "recommendations": string[]}
headline: <=10 words. summary: 2-3 sentences. risks: 2-4 bullets. recommendations: 3-5 prioritised.
Incidents:
${list}`,
  );
  return {
    headline: String(out.headline ?? "Operations Briefing"),
    summary: String(out.summary ?? ""),
    risks: Array.isArray(out.risks) ? out.risks.map(String) : [],
    recommendations: Array.isArray(out.recommendations) ? out.recommendations.map(String) : [],
  };
}

export async function aiMaintenancePrioritizer(tasks: { id: string; title: string; priority: string; status: string; due_at?: string | null }[]) {
  if (tasks.length === 0) return { order: [], strategy: "No pending tasks." };
  const list = tasks.map((t, idx) => `${idx + 1}. id=${t.id} | priority=${t.priority} | status=${t.status} | due=${t.due_at ?? "none"} | ${t.title}`).join("\n");
  const out = await callAi(
    "You are a senior railway maintenance scheduler. Respond ONLY in strict JSON.",
    `Re-rank these maintenance tasks (1 = first). Respond as JSON:
{"strategy": string, "order": [{"id": string, "rank": number, "reason": string}]}
Tasks:
${list}`,
  );
  const order = Array.isArray(out.order)
    ? out.order.map((o: any) => ({ id: String(o.id ?? ""), rank: Number(o.rank ?? 0), reason: String(o.reason ?? "") })).filter((o: any) => o.id)
    : [];
  return { strategy: String(out.strategy ?? ""), order };
}

export async function aiTrendAnalyzer(data: {
  totals: { open: number; critical: number; resolved: number; resolutionRate: number; avgAssetHealth: number };
  byCategory: { name: string; value: number }[];
  bySeverity: { name: string; value: number }[];
  byZone: { name: string; count: number }[];
  trend30d: { date: string; count: number }[];
}) {
  const trendLine = data.trend30d.map((d) => `${d.date}:${d.count}`).join(" ");
  const cats = data.byCategory.map((c) => `${c.name}=${c.value}`).join(", ");
  const sev = data.bySeverity.map((s) => `${s.name}=${s.value}`).join(", ");
  const zones = data.byZone.map((z) => `${z.name}=${z.count}`).join(", ");
  const out = await callAi(
    "You are the head of railway safety analytics. Respond ONLY in strict JSON.",
    `Analyse this network's safety posture. JSON:
{"verdict":"improving"|"stable"|"worsening","score":number,"headline":string,"summary":string,"hotspots":string[],"predictions":string[],"actions":string[]}
Totals: open=${data.totals.open}, critical=${data.totals.critical}, resolved=${data.totals.resolved}, resolutionRate=${data.totals.resolutionRate}%, avgAssetHealth=${data.totals.avgAssetHealth}%
Severity: ${sev}
Categories: ${cats}
Zone hotspots: ${zones}
30-day trend: ${trendLine}`,
  );
  return {
    verdict: (["improving", "stable", "worsening"] as const).includes(out.verdict) ? out.verdict : "stable",
    score: Number(out.score ?? 0),
    headline: String(out.headline ?? "Safety Analysis"),
    summary: String(out.summary ?? ""),
    hotspots: Array.isArray(out.hotspots) ? out.hotspots.map(String) : [],
    predictions: Array.isArray(out.predictions) ? out.predictions.map(String) : [],
    actions: Array.isArray(out.actions) ? out.actions.map(String) : [],
  };
}

// ---- New AI-powered helper features ----

export async function aiRootCauseAnalysis(incident: { title: string; description: string; category?: string }) {
  const out = await callAi(
    "You are a forensic railway incident investigator. Respond ONLY in strict JSON.",
    `Perform 5-Whys root cause analysis. JSON:
{"root_cause": string, "chain": string[], "contributing_factors": string[], "prevention": string[]}
Incident:
Title: ${incident.title}
Category: ${incident.category ?? "unspecified"}
Description: ${incident.description}`,
  );
  return {
    root_cause: String(out.root_cause ?? ""),
    chain: Array.isArray(out.chain) ? out.chain.map(String) : [],
    contributing_factors: Array.isArray(out.contributing_factors) ? out.contributing_factors.map(String) : [],
    prevention: Array.isArray(out.prevention) ? out.prevention.map(String) : [],
  };
}

export async function aiIncidentTranslate(text: string, targetLang: string) {
  const out = await callAi(
    "You are a railway operations translator. Respond ONLY in strict JSON.",
    `Translate the following railway incident text into ${targetLang}. Keep technical terms accurate. JSON:
{"translated": string}
Text:
${text}`,
  );
  return String(out.translated ?? "");
}

export async function aiPublicAlertDraft(incident: { title: string; description: string; severity: string }) {
  const out = await callAi(
    "You draft short public safety alerts for railway passengers. Respond ONLY in strict JSON.",
    `Write a public alert (<=280 chars) + SMS variant (<=160 chars) for this incident. JSON:
{"public_alert": string, "sms": string, "twitter": string}
Title: ${incident.title}
Severity: ${incident.severity}
Details: ${incident.description}`,
  );
  return {
    public_alert: String(out.public_alert ?? ""),
    sms: String(out.sms ?? ""),
    twitter: String(out.twitter ?? ""),
  };
}
