import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Target, Eye, Heart } from "lucide-react";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — RailAssist AI" },
      { name: "description", content: "About RailAssist AI — our mission to make railways safer through AI." },
      { property: "og:title", content: "About RailAssist AI" },
      { property: "og:description", content: "Our mission, vision and values for safer, smarter railways." },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />
      <section className="mx-auto max-w-5xl px-4 sm:px-6 py-20">
        <Badge variant="outline">About us</Badge>
        <h1 className="mt-3 font-display text-4xl sm:text-5xl font-bold tracking-tight">
          Building the <span className="text-gradient-rail">control center</span> for modern railways.
        </h1>
        <p className="mt-5 text-lg text-muted-foreground max-w-3xl">
          RailAssist AI was created to give railway authorities a single, intelligent
          platform to identify, prioritize and resolve safety issues faster than ever
          before — backed by AI-driven analytics and a beautifully simple field workflow.
        </p>

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {[
            { icon: Target, title: "Mission", body: "Empower every railway authority with real-time intelligence to prevent incidents before they happen." },
            { icon: Eye, title: "Vision", body: "A world where every train journey is safer, every asset is monitored, and every decision is data-driven." },
            { icon: Heart, title: "Values", body: "Safety first. Reliability always. Transparency, accountability and continuous improvement." },
          ].map((b) => (
            <Card key={b.title}>
              <CardContent className="p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <b.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-display font-semibold">{b.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{b.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
