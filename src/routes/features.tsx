import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck, Brain, Activity, MapPin, Bell, QrCode, Wrench,
  BarChart3, FileText, Search, Layers, Users, Settings, Globe, AlertTriangle, Cpu,
} from "lucide-react";

export const Route = createFileRoute("/features")({
  head: () => ({
    meta: [
      { title: "Features — RailAssist AI" },
      { name: "description", content: "16 integrated modules: AI risk analysis, predictive maintenance, interactive maps, QR reporting and more." },
      { property: "og:title", content: "RailAssist AI — Platform Features" },
      { property: "og:description", content: "Explore the full RailAssist AI feature set." },
    ],
  }),
  component: FeaturesPage,
});

const modules = [
  { icon: ShieldCheck, title: "Incident Management", desc: "Track damage, signal failure, electrical fault, platform hazard and 9 incident types end-to-end." },
  { icon: Brain, title: "AI Incident Analysis", desc: "Gemini analyzes description and evidence to score risk, severity and suggested action." },
  { icon: Activity, title: "Predictive Maintenance", desc: "Detect repeated failures, high-risk stations and vulnerable infrastructure." },
  { icon: Layers, title: "Zone & Station Management", desc: "Create zones, divisions, stations and assign inspectors with full analytics." },
  { icon: Users, title: "Inspector Management", desc: "Directory, approval workflow, zone assignment and performance monitoring." },
  { icon: BarChart3, title: "Safety Dashboard", desc: "KPI cards, monthly incidents, severity distribution, zone performance, trends." },
  { icon: MapPin, title: "Interactive Railway Map", desc: "OpenStreetMap with live markers, risk heatmap and zone overview." },
  { icon: QrCode, title: "QR Code Reporting", desc: "Generate codes for stations / tracks / equipment and scan-to-report from the field." },
  { icon: FileText, title: "Document Management", desc: "Upload, preview and search inspection / maintenance / safety / audit reports." },
  { icon: Wrench, title: "Maintenance Management", desc: "Requests, assigned team, progress, completion and full history." },
  { icon: AlertTriangle, title: "Smart Escalation", desc: "Automatic 24h warning, 48h escalated, 72h critical alerts." },
  { icon: Bell, title: "Notification Center", desc: "Real-time alerts for assignments, status changes, critical risk and approvals." },
  { icon: Search, title: "Advanced Search", desc: "Filter by ID, station, zone, inspector, severity, date range and status." },
  { icon: FileText, title: "Reporting & Exports", desc: "Generate PDF / Excel / CSV reports for incidents, safety, maintenance and zones." },
  { icon: Cpu, title: "AI Intelligence Center", desc: "Trend detection, high-risk stations, overdue maintenance and proactive insights." },
  { icon: Globe, title: "Digital Twin Dashboard", desc: "Modern control-center UI for zones, stations, incidents and critical areas." },
];

function FeaturesPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />
      <section className="mx-auto max-w-7xl px-4 sm:px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <Badge variant="outline" className="mb-3">All Features</Badge>
          <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight">
            16 integrated modules
          </h1>
          <p className="mt-4 text-muted-foreground">
            Every capability a modern railway safety and maintenance team needs in one platform.
          </p>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((m) => (
            <Card key={m.title} className="hover:shadow-md transition-all">
              <CardContent className="p-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg gradient-rail text-primary-foreground">
                  <m.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-display font-semibold text-lg">{m.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{m.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
