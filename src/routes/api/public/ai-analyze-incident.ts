import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/ai-analyze-incident")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        let body: { title?: string; description?: string; category?: string };
        try {
          body = await request.json();
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        const title = (body.title ?? "").toString().trim();
        const description = (body.description ?? "").toString().trim();
        if (!title || !description) {
          return new Response("title and description required", { status: 400 });
        }

        const prompt = `You are a senior railway safety analyst. Analyse this railway incident and respond ONLY with strict JSON matching:
{"summary": string, "severity": "low"|"medium"|"high"|"critical", "suggested_actions": string[], "categories": string[], "risk_score": number}

Incident:
Title: ${title}
Category: ${body.category ?? "unspecified"}
Description: ${description}

risk_score is 0-100 (higher = more dangerous). Return JSON only, no prose.`;

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

        if (aiRes.status === 429) return new Response("AI rate limit reached. Try again in a moment.", { status: 429 });
        if (aiRes.status === 402) return new Response("AI credits exhausted. Please top up Lovable AI credits.", { status: 402 });
        if (!aiRes.ok) return new Response(`AI gateway error ${aiRes.status}`, { status: 502 });

        const json = await aiRes.json();
        const text: string = json.choices?.[0]?.message?.content ?? "{}";
        let parsed: unknown;
        try {
          parsed = JSON.parse(text);
        } catch {
          const m = text.match(/\{[\s\S]*\}/);
          parsed = m
            ? JSON.parse(m[0])
            : { summary: "Unable to parse", severity: "medium", suggested_actions: [], categories: [], risk_score: 50 };
        }

        return new Response(JSON.stringify(parsed), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
