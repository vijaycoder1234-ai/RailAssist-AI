import process from "node:process";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  category: z.string().optional(),
});

export const analyzeIncidentAi = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY is not configured on the server.");

    const prompt = `You are a senior railway safety analyst. Analyse this railway incident and respond ONLY with strict JSON matching:
{"summary": string, "severity": "low"|"medium"|"high"|"critical", "suggested_actions": string[], "categories": string[], "risk_score": number}

Incident:
Title: ${data.title}
Category: ${data.category ?? "unspecified"}
Description: ${data.description}

risk_score is 0-100 (higher = more dangerous). Return JSON only.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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

    if (aiRes.status === 429) throw new Error("AI rate limit reached. Try again shortly.");
    if (aiRes.status === 402) throw new Error("AI credits exhausted. Please top up Lovable AI credits.");
    if (!aiRes.ok) throw new Error(`AI gateway error ${aiRes.status}`);

    const json = await aiRes.json();
    const text: string = json.choices?.[0]?.message?.content ?? "{}";
    try {
      return JSON.parse(text);
    } catch {
      const m = text.match(/\{[\s\S]*\}/);
      return m
        ? JSON.parse(m[0])
        : { summary: "Unable to parse", severity: "medium", suggested_actions: [], categories: [], risk_score: 50 };
    }
  });
