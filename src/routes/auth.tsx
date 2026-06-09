import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Train } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

const authSearchSchema = z.object({
  tab: z.enum(["login", "register"]).optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: (s) => authSearchSchema.parse(s),
  head: () => ({
    meta: [
      { title: "Sign in / Register — RailAssist AI" },
      { name: "description", content: "Sign in or register as a Railway Inspector to access the RailAssist AI platform." },
    ],
  }),
  component: AuthPage,
});

interface Zone { id: string; name: string; code: string }

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { user, loading, isSuperAdmin, isInspector, isMaintenance, inspector } = useAuth();
  const [tab, setTab] = useState<"login" | "register">(search.tab ?? "login");
  const [zones, setZones] = useState<Zone[]>([]);

  useEffect(() => {
    supabase.from("zones").select("id, name, code").order("name").then(({ data }) => {
      setZones(data ?? []);
    });
  }, []);

  // Redirect logged-in users to the right place
  useEffect(() => {
    if (loading || !user) return;
    if (isSuperAdmin) navigate({ to: "/admin" });
    else if (inspector?.status !== "approved") navigate({ to: "/auth/pending" });
    else if (isMaintenance) navigate({ to: "/maintenance" });
    else if (isInspector) navigate({ to: "/dashboard" });
    else navigate({ to: "/auth/pending" });
  }, [loading, user, isSuperAdmin, isInspector, isMaintenance, inspector, navigate]);

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-background px-4 py-10">
      <div className="absolute inset-0 grid-bg opacity-30" />
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 h-[420px] w-[1000px] rounded-full bg-primary/15 blur-3xl" />

      <div className="relative w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg gradient-rail text-primary-foreground">
            <Train className="h-5 w-5" />
          </div>
          <div className="font-display text-xl font-bold">
            RailAssist <span className="text-gradient-rail">AI</span>
          </div>
        </Link>

        <Card className="glass shadow-xl">
          <CardContent className="p-6">
            <Tabs value={tab} onValueChange={(v) => setTab(v as "login" | "register")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>
              <TabsContent value="login" className="mt-5">
                <LoginForm />
              </TabsContent>
              <TabsContent value="register" className="mt-5">
                <RegisterForm zones={zones} onSuccess={() => setTab("login")} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          By continuing you agree to the RailAssist AI terms and acceptable use policy.
        </p>
      </div>
    </div>
  );
}

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Signed in");
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <Label htmlFor="login-email">Email</Label>
        <Input id="login-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@authority.gov.in" />
      </div>
      <div>
        <Label htmlFor="login-pw">Password</Label>
        <Input id="login-pw" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}

const registerSchema = z.object({
  role: z.enum(["inspector", "maintenance"]),
  full_name: z.string().trim().min(2, "Enter your full name").max(120),
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
  employee_id: z.string().trim().min(2, "Enter your employee ID").max(60),
  phone: z.string().trim().min(7, "Enter a valid phone number").max(20),
  designation: z.string().trim().min(2, "Enter your designation").max(120),
  zone_id: z.string().uuid("Please select your railway zone"),
});

function RegisterForm({ zones, onSuccess }: { zones: Zone[]; onSuccess: () => void }) {
  const [form, setForm] = useState({
    role: "inspector" as "inspector" | "maintenance",
    full_name: "", email: "", password: "",
    employee_id: "", phone: "", designation: "", zone_id: "",
  });
  const [loading, setLoading] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = registerSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    const redirectUrl = typeof window !== "undefined" ? `${window.location.origin}/auth/pending` : undefined;
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          role: parsed.data.role,
          full_name: parsed.data.full_name,
          employee_id: parsed.data.employee_id,
          phone: parsed.data.phone,
          designation: parsed.data.designation,
          zone_id: parsed.data.zone_id,
        },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Application submitted. Awaiting admin approval.");
    onSuccess();
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Label>Register as</Label>
          <Select value={form.role} onValueChange={(v) => setForm((f) => ({ ...f, role: v as "inspector" | "maintenance" }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="inspector">Railway Inspector</SelectItem>
              <SelectItem value="maintenance">Maintenance Team</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-2">
          <Label>Full name</Label>
          <Input required value={form.full_name} onChange={set("full_name")} />
        </div>
        <div className="col-span-2">
          <Label>Email</Label>
          <Input type="email" required value={form.email} onChange={set("email")} />
        </div>
        <div className="col-span-2">
          <Label>Password</Label>
          <Input type="password" required minLength={8} value={form.password} onChange={set("password")} />
        </div>
        <div>
          <Label>Employee ID</Label>
          <Input required value={form.employee_id} onChange={set("employee_id")} />
        </div>
        <div>
          <Label>Phone</Label>
          <Input required value={form.phone} onChange={set("phone")} />
        </div>
        <div className="col-span-2">
          <Label>Designation</Label>
          <Input required value={form.designation} onChange={set("designation")} placeholder="Section Engineer / Station Master / …" />
        </div>
        <div className="col-span-2">
          <Label>Railway Zone</Label>
          <Select value={form.zone_id} onValueChange={(v) => setForm((f) => ({ ...f, zone_id: v }))}>
            <SelectTrigger><SelectValue placeholder="Select your zone" /></SelectTrigger>
            <SelectContent>
              {zones.map((z) => (
                <SelectItem key={z.id} value={z.id}>{z.name} ({z.code})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Submitting…" : "Submit application"}
      </Button>
      <p className="text-xs text-muted-foreground text-center">
        Your account becomes active only after admin approval.
      </p>
    </form>
  );
}
