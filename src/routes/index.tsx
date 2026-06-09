import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ShieldCheck,
  Brain,
  Activity,
  MapPin,
  Bell,
  QrCode,
  Wrench,
  BarChart3,
  Train,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "RailAssist AI — Making Railways Safer, Smarter, More Efficient" },
      {
        name: "description",
        content:
          "RailAssist AI is an enterprise platform for railway incident management, AI-powered risk analysis and predictive maintenance.",
      },
      { property: "og:title", content: "RailAssist AI — Railway Intelligence Platform" },
      {
        property: "og:description",
        content: "AI incident analysis, predictive maintenance and a live safety control center for railways.",
      },
    ],
  }),
  component: HomePage,
});

const features = [
  { icon: ShieldCheck, title: "Incident Management", desc: "Capture, triage and resolve every railway incident with a full workflow." },
  { icon: Brain, title: "AI Risk Analysis", desc: "Gemini-powered scoring of severity, priority and action plan in seconds." },
  { icon: Activity, title: "Predictive Maintenance", desc: "Detect repeated failures and vulnerable infrastructure before they fail." },
  { icon: MapPin, title: "Live Railway Map", desc: "Zones, stations, incidents and risk heatmap on an interactive OpenStreetMap." },
  { icon: Bell, title: "Smart Escalation", desc: "Automatic 24h / 48h / 72h escalation keeps critical issues moving." },
  { icon: QrCode, title: "QR Incident Capture", desc: "Scan a station or asset QR code to auto-fill the report — field-first." },
  { icon: Wrench, title: "Maintenance Workflow", desc: "Track assignment, progress and history end-to-end." },
  { icon: BarChart3, title: "Analytics & Reports", desc: "KPIs, trends, zone performance, PDF / Excel / CSV exports." },
];

const stats = [
  { value: "70K+", label: "Track km in India" },
  { value: "8,300+", label: "Stations" },
  { value: "17", label: "Zonal railways" },
  { value: "23M", label: "Daily passengers" },
];

const workflow = [
  { step: "1", title: "Report", desc: "Inspector reports an incident with photo, video and GPS — even via QR code." },
  { step: "2", title: "AI Analyze", desc: "Gemini scores risk and severity and drafts a recommended action plan." },
  { step: "3", title: "Assign", desc: "Admin routes the case to the right zone, station and maintenance team." },
  { step: "4", title: "Resolve", desc: "Track progress through resolution with automatic escalation if delayed." },
];

const benefits = [
  "Faster incident response and triage",
  "AI-prioritized critical safety issues",
  "Data-driven maintenance planning",
  "Full audit trail and reporting",
  "Role-based access for zones and admins",
  "Works on mobile in the field",
];

function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-40" />
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 h-[480px] w-[1100px] rounded-full bg-primary/15 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 py-20 sm:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="secondary" className="mb-5 gap-1">
              <Brain className="h-3.5 w-3.5" /> Powered by Gemini AI
            </Badge>
            <h1 className="font-display text-4xl sm:text-6xl font-bold tracking-tight">
              Making Railways{" "}
              <span className="text-gradient-rail">Safer, Smarter</span>{" "}
              and More Efficient
            </h1>
            <p className="mt-6 text-lg text-muted-foreground">
              RailAssist AI is the enterprise control center for railway incident
              intelligence, safety monitoring and predictive maintenance — built for
              modern transport authorities.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg" className="gap-2">
                <Link to="/auth" search={{ tab: "register" }}>
                  Register as Inspector <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/features">Explore platform</Link>
              </Button>
            </div>
          </div>

          {/* stat strip */}
          <div className="mt-16 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {stats.map((s) => (
              <Card key={s.label} className="glass">
                <CardContent className="p-5 text-center">
                  <div className="font-display text-2xl sm:text-3xl font-bold text-gradient-rail">
                    {s.value}
                  </div>
                  <div className="mt-1 text-xs sm:text-sm text-muted-foreground">{s.label}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* OVERVIEW */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 py-20">
        <div className="grid gap-10 lg:grid-cols-2 items-center">
          <div>
            <Badge variant="outline" className="mb-3">Platform Overview</Badge>
            <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">
              One platform for every railway safety decision.
            </h2>
            <p className="mt-4 text-muted-foreground">
              From the inspector in the field to the operations control center,
              RailAssist AI unifies reporting, AI analysis, maintenance planning
              and reporting into a single, secure platform.
            </p>
            <ul className="mt-6 space-y-3">
              {benefits.map((b) => (
                <li key={b} className="flex items-start gap-2.5 text-sm">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 text-success" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>
          <Card className="glass shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
                  <span className="text-sm font-medium">Live Safety Score</span>
                </div>
                <Badge variant="secondary">Northern Zone</Badge>
              </div>
              <div className="mt-6 text-center">
                <div className="font-display text-6xl font-bold text-gradient-rail">94.2</div>
                <div className="mt-1 text-sm text-muted-foreground">out of 100</div>
              </div>
              <div className="mt-6 grid grid-cols-3 gap-3 text-center text-xs">
                <div className="rounded-lg bg-secondary/60 p-3">
                  <div className="font-display text-xl font-bold">128</div>
                  <div className="text-muted-foreground">Active</div>
                </div>
                <div className="rounded-lg bg-destructive/10 p-3">
                  <div className="font-display text-xl font-bold text-destructive">6</div>
                  <div className="text-muted-foreground">Critical</div>
                </div>
                <div className="rounded-lg bg-success/10 p-3">
                  <div className="font-display text-xl font-bold text-success">412</div>
                  <div className="text-muted-foreground">Resolved</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* FEATURES */}
      <section className="bg-card/40 border-y border-border/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <Badge variant="outline" className="mb-3">Key Features</Badge>
            <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">
              Everything a railway safety team needs
            </h2>
            <p className="mt-3 text-muted-foreground">
              Sixteen integrated modules covering the entire incident-to-resolution lifecycle.
            </p>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <Card key={f.title} className="group hover:shadow-md transition-all">
                <CardContent className="p-5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <f.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 font-display font-semibold">{f.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* WORKFLOW */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <Badge variant="outline" className="mb-3">Platform Workflow</Badge>
          <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">
            Report → Analyze → Assign → Resolve
          </h2>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {workflow.map((w) => (
            <Card key={w.step} className="relative overflow-hidden">
              <CardContent className="p-6">
                <div className="font-display text-5xl font-bold text-gradient-rail">{w.step}</div>
                <h3 className="mt-3 font-display font-semibold">{w.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{w.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 pb-20">
        <Card className="overflow-hidden border-none gradient-rail text-primary-foreground">
          <CardContent className="p-10 sm:p-14 text-center">
            <Train className="mx-auto h-10 w-10 opacity-80" />
            <h2 className="mt-4 font-display text-3xl sm:text-4xl font-bold tracking-tight">
              Ready to upgrade your railway operations?
            </h2>
            <p className="mt-3 text-primary-foreground/85 max-w-2xl mx-auto">
              Join the platform that thousands of inspectors will use to keep
              passengers safe across every zone.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg" variant="secondary">
                <Link to="/auth" search={{ tab: "register" }}>Register now</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="bg-transparent text-primary-foreground border-primary-foreground/50 hover:bg-primary-foreground/10 hover:text-primary-foreground">
                <Link to="/contact">Talk to us</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      <SiteFooter />
    </div>
  );
}
