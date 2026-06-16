import { supabase } from "@/integrations/supabase/client";
import { analyzeIncidentAi } from "@/lib/ai-incident.functions";

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
 * Calls the Lovable AI gateway via a TanStack server function and persists
 * results via the authenticated Supabase browser client (RLS enforced).
 */
export async function analyzeIncidentClient(input: AnalyzeInput): Promise<AiIncidentOutput> {
  const parsed = (await analyzeIncidentAi({
    data: {
      title: input.title,
      description: input.description,
      category: input.category,
    },
  })) as AiIncidentOutput;

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
