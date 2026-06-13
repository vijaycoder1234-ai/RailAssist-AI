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

/**
 * Calls the Lovable AI gateway server function and persists results via the
 * authenticated Supabase browser client (RLS enforced).
 */
export async function analyzeIncidentClient(input: AnalyzeInput): Promise<AiIncidentOutput> {
  const res = await fetch("/api/public/ai-analyze-incident", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: input.title,
      description: input.description,
      category: input.category,
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `AI gateway error ${res.status}`);
  }
  const parsed = (await res.json()) as AiIncidentOutput;

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
    model: "google/gemini-3-flash-preview",
    output: parsed,
    created_by: userData.user?.id ?? null,
  });

  return parsed;
}
