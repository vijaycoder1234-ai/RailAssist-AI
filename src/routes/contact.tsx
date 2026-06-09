import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Mail, Phone, MapPin } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — RailAssist AI" },
      { name: "description", content: "Get in touch with the RailAssist AI team." },
      { property: "og:title", content: "Contact RailAssist AI" },
      { property: "og:description", content: "Talk to us about deploying RailAssist AI for your railway authority." },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      toast.success("Thanks — we'll get back to you within 24 hours.");
      (e.target as HTMLFormElement).reset();
    }, 600);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />
      <section className="mx-auto max-w-6xl px-4 sm:px-6 py-20">
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <Badge variant="outline" className="mb-3">Contact us</Badge>
            <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight">
              Let's make your railway <span className="text-gradient-rail">safer</span>.
            </h1>
            <p className="mt-4 text-muted-foreground">
              Tell us about your zone or authority and we'll show you how RailAssist AI fits into your operations.
            </p>
            <div className="mt-8 space-y-4 text-sm">
              <div className="flex items-center gap-3"><Mail className="h-4 w-4 text-primary" /> contact@railassist.ai</div>
              <div className="flex items-center gap-3"><Phone className="h-4 w-4 text-primary" /> +91 11 0000 0000</div>
              <div className="flex items-center gap-3"><MapPin className="h-4 w-4 text-primary" /> Rail Bhavan, New Delhi</div>
            </div>
          </div>

          <Card>
            <CardContent className="p-6">
              <form onSubmit={onSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="name">Full name</Label>
                    <Input id="name" required placeholder="Your name" />
                  </div>
                  <div>
                    <Label htmlFor="org">Organization</Label>
                    <Input id="org" placeholder="Railway zone / authority" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" required placeholder="you@authority.gov.in" />
                </div>
                <div>
                  <Label htmlFor="message">Message</Label>
                  <Textarea id="message" rows={5} required placeholder="How can we help?" />
                </div>
                <Button type="submit" disabled={submitting} className="w-full">
                  {submitting ? "Sending…" : "Send message"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
