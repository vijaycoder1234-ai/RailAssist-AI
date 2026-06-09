import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "super_admin" | "inspector" | "maintenance";
export type InspectorStatus = "pending" | "approved" | "rejected" | "suspended";

export interface AuthProfile {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
}

export interface InspectorRecord {
  status: InspectorStatus;
  zone_id: string | null;
  designation: string | null;
  employee_id: string | null;
  rejection_reason: string | null;
}

interface AuthCtx {
  loading: boolean;
  session: Session | null;
  user: User | null;
  profile: AuthProfile | null;
  roles: AppRole[];
  isSuperAdmin: boolean;
  isInspector: boolean;
  isMaintenance: boolean;
  inspector: InspectorRecord | null;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [inspector, setInspector] = useState<InspectorRecord | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (uid: string) => {
    const [{ data: prof }, { data: roleRows }, { data: insp }] = await Promise.all([
      supabase.from("profiles").select("id, full_name, email, avatar_url").eq("id", uid).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", uid),
      supabase
        .from("inspectors")
        .select("status, zone_id, designation, employee_id, rejection_reason")
        .eq("user_id", uid)
        .maybeSingle(),
    ]);
    setProfile(prof ?? null);
    setRoles((roleRows ?? []).map((r) => r.role as AppRole));
    setInspector((insp as InspectorRecord | null) ?? null);
  };

  useEffect(() => {
    let mounted = true;

    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      if (!mounted) return;
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        // defer to avoid deadlock in callback
        setTimeout(() => {
          loadProfile(sess.user.id).catch(console.error);
        }, 0);
      } else {
        setProfile(null);
        setRoles([]);
        setInspector(null);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) {
        loadProfile(data.session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthCtx>(
    () => ({
      loading,
      session,
      user,
      profile,
      roles,
      isSuperAdmin: roles.includes("super_admin"),
      isInspector: roles.includes("inspector"),
      isMaintenance: roles.includes("maintenance"),
      inspector,
      refresh: async () => {
        if (user) await loadProfile(user.id);
      },
      signOut: async () => {
        await supabase.auth.signOut();
      },
    }),
    [loading, session, user, profile, roles, inspector],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
