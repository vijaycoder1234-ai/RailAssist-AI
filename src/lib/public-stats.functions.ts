import { createServerFn } from "@tanstack/react-start";

export interface PublicStats {
  incidents: number;
  resolved: number;
  critical: number;
  stations: number;
  zones: number;
  inspectors: number;
  tasks: number;
  resolutionRate: number;
}

export const getPublicStats = createServerFn({ method: "GET" }).handler(async (): Promise<PublicStats> => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const counts = await Promise.all([
    supabaseAdmin.from("incidents").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("incidents").select("*", { count: "exact", head: true }).in("status", ["resolved", "closed"]),
    supabaseAdmin.from("incidents").select("*", { count: "exact", head: true }).eq("severity", "critical"),
    supabaseAdmin.from("stations").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("zones").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("inspectors").select("*", { count: "exact", head: true }).eq("status", "approved"),
    supabaseAdmin.from("maintenance_tasks").select("*", { count: "exact", head: true }),
  ]);
  const [inc, res, crit, stn, zn, insp, tasks] = counts.map((r) => r.count ?? 0);
  return {
    incidents: inc,
    resolved: res,
    critical: crit,
    stations: stn,
    zones: zn,
    inspectors: insp,
    tasks: tasks,
    resolutionRate: inc > 0 ? Math.round((res / inc) * 100) : 0,
  };
});
