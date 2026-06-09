import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Input = z.object({
  incident_id: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().min(1),
  category: z.string().optional(),
});

type AiOutput = {
  summary: string;
  severity: "low" | "medium" | "high" | "critical";
  suggested_actions: string[];
  categories: string[];
  risk_score: number;
};

export const analyzeIncident = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data, context }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const prompt = `You are a senior railway safety analyst. Analyse this railway incident and respond ONLY with strict JSON matching:
{"summary": string, "severity": "low"|"medium"|"high"|"critical", "suggested_actions": string[], "categories": string[], "risk_score": number}

Incident:
Title: ${data.title}
Category: ${data.category ?? "unspecified"}
Description: ${data.description}

risk_score is 0-100 (higher = more dangerous). Return JSON only, no prose.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You return concise structured JSON only." },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (res.status === 429) throw new Error("AI rate limit reached. Try again in a moment.");
    if (res.status === 402) throw new Error("AI credits exhausted. Please top up Lovable AI credits.");
    if (!res.ok) throw new Error(`AI gateway error ${res.status}`);

    const json = await res.json();
    const text: string = json.choices?.[0]?.message?.content ?? "{}";
    let parsed: AiOutput;
    try {
      parsed = JSON.parse(text);
    } catch {
      const m = text.match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : { summary: "Unable to parse", severity: "medium", suggested_actions: [], categories: [], risk_score: 50 };
    }

    const sev = (["low", "medium", "high", "critical"] as const).includes(parsed.severity) ? parsed.severity : "medium";

    await context.supabase.from("incidents").update({
      ai_summary: parsed.summary,
      ai_severity: sev,
      ai_suggested_actions: (parsed.suggested_actions ?? []).join("\n• "),
      ai_categories: parsed.categories ?? [],
    }).eq("id", data.incident_id);

    await context.supabase.from("ai_runs").insert({
      incident_id: data.incident_id,
      model: "google/gemini-3-flash-preview",
      output: parsed as unknown as Record<string, unknown>,
      created_by: context.userId,
    });

    return parsed;
  });
