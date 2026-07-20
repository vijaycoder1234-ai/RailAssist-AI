import process from "node:process";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const BriefingInput = z.object({
  incidents: z
    .array(
      z.object({
        title: z.string(),
        severity: z.string(),
        status: z.string(),
        category: z.string().optional().nullable(),
      }),
    )
    .max(50),
});

const PrioritizerInput = z.object({
  tasks: z
    .array(
      z.object({
        id: z.string(),
        title: z.string(),
        priority: z.string(),
        status: z.string(),
        due_at: z.string().nullable().optional(),
      }),
    )
    .max(50),
});

const TrendInput = z.object({
  totals: z.object({
    open: z.number(),
    critical: z.number(),
    resolved: z.number(),
    resolutionRate: z.number(),
    avgAssetHealth: z.number(),
  }),
  byCategory: z.array(z.object({ name: z.string(), value: z.number() })).max(20),
  bySeverity: z.array(z.object({ name: z.string(), value: z.number() })).max(10),
  byZone: z.array(z.object({ name: z.string(), count: z.number() })).max(20),
  trend30d: z.array(z.object({ date: z.string(), count: z.number() })).max(60),
});

async function callGateway(systemMsg: string, userMsg: string) {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY is not configured on the server.");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: systemMsg },
        { role: "user", content: userMsg },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (res.status === 429) throw new Error("AI rate limit reached. Try again shortly.");
  if (res.status === 402) throw new Error("AI credits exhausted. Please top up Lovable AI credits.");
  if (!res.ok) throw new Error(`AI gateway error ${res.status}`);
  const json = await res.json();
  const text: string = json.choices?.[0]?.message?.content ?? "{}";
  try {
    return JSON.parse(text);
  } catch {
    const m = text.match(/\{[\s\S]*\}/);
    return m ? JSON.parse(m[0]) : {};
  }
}

/**
 * AI Daily Operations Briefing — generates an executive summary from the
 * current open / recent incident set.
 */
export const aiDailyBriefing = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => BriefingInput.parse(input))
  .handler(async ({ data }) => {
    if (data.incidents.length === 0) {
      return {
        headline: "All clear",
        summary: "No incidents on the board right now. Network operating normally.",
        risks: [] as string[],
        recommendations: [] as string[],
      };
    }
    const list = data.incidents
      .map((i, idx) => `${idx + 1}. [${i.severity}/${i.status}] ${i.category ?? "other"}: ${i.title}`)
      .join("\n");

    const out = await callGateway(
      "You are the chief safety officer of a railway operations center. You write tight, executive briefings. Respond ONLY in strict JSON.",
      `Generate today's operations briefing from these incidents. Respond as JSON:
{"headline": string, "summary": string, "risks": string[], "recommendations": string[]}

headline: <=10 words. summary: 2-3 sentences. risks: 2-4 bullets. recommendations: 3-5 prioritised actions.

Incidents:
${list}`,
    );
    return {
      headline: String(out.headline ?? "Operations Briefing"),
      summary: String(out.summary ?? ""),
      risks: Array.isArray(out.risks) ? out.risks.map(String) : [],
      recommendations: Array.isArray(out.recommendations) ? out.recommendations.map(String) : [],
    };
  });

/**
 * AI Maintenance Prioritizer — re-orders pending maintenance tasks based on
 * priority, due date, and dependency risk.
 */
export const aiMaintenancePrioritizer = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => PrioritizerInput.parse(input))
  .handler(async ({ data }) => {
    if (data.tasks.length === 0) {
      return { order: [] as { id: string; rank: number; reason: string }[], strategy: "No pending tasks." };
    }
    const list = data.tasks
      .map(
        (t, idx) =>
          `${idx + 1}. id=${t.id} | priority=${t.priority} | status=${t.status} | due=${t.due_at ?? "none"} | ${t.title}`,
      )
      .join("\n");

    const out = await callGateway(
      "You are a senior railway maintenance scheduler. You optimise repair queues for safety and uptime. Respond ONLY in strict JSON.",
      `Re-rank these maintenance tasks (1 = work on first). Use priority, due date, and operational risk. Respond as JSON:
{"strategy": string, "order": [{"id": string, "rank": number, "reason": string}]}

Strategy: 1-2 sentences on the overall approach. Reason: <=15 words per task.

Tasks:
${list}`,
    );
    const order = Array.isArray(out.order)
      ? out.order
          .map((o: { id?: unknown; rank?: unknown; reason?: unknown }) => ({
            id: String(o.id ?? ""),
            rank: Number(o.rank ?? 0),
            reason: String(o.reason ?? ""),
          }))
          .filter((o: { id: string }) => o.id)
      : [];
    return { strategy: String(out.strategy ?? ""), order };
  });

/**
 * AI Safety Trend Analyzer — inspects platform KPIs and produces an
 * executive-grade analysis of trends, hotspots, and predicted risk.
 */
export const aiTrendAnalyzer = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => TrendInput.parse(input))
  .handler(async ({ data }) => {
    const trendLine = data.trend30d.map((d) => `${d.date}:${d.count}`).join(" ");
    const cats = data.byCategory.map((c) => `${c.name}=${c.value}`).join(", ");
    const sev = data.bySeverity.map((s) => `${s.name}=${s.value}`).join(", ");
    const zones = data.byZone.map((z) => `${z.name}=${z.count}`).join(", ");

    const out = await callGateway(
      "You are the head of railway safety analytics. You transform raw KPIs into decisive, quantitative insights. Respond ONLY in strict JSON.",
      `Analyse this network's safety posture. Respond as JSON:
{"verdict": "improving"|"stable"|"worsening", "score": number, "headline": string, "summary": string, "hotspots": string[], "predictions": string[], "actions": string[]}

score: 0-100 overall safety score (higher = safer). headline: <=12 words. summary: 3-4 sentences. hotspots: 2-4 concrete zones/categories. predictions: 2-3 forward-looking risks for the next 7-14 days. actions: 3-5 prioritised interventions.

Totals: open=${data.totals.open}, critical=${data.totals.critical}, resolved=${data.totals.resolved}, resolutionRate=${data.totals.resolutionRate}%, avgAssetHealth=${data.totals.avgAssetHealth}%
Severity: ${sev}
Categories: ${cats}
Zone hotspots: ${zones}
30-day trend (date:count): ${trendLine}`,
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
  });
