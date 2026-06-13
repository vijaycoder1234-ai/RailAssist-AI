import { supabase } from "@/integrations/supabase/client";

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

const EMPTY: PublicStats = {
  incidents: 0, resolved: 0, critical: 0, stations: 0, zones: 0,
  inspectors: 0, tasks: 0, resolutionRate: 0,
};

export async function getPublicStats(): Promise<PublicStats> {
  try {
    const { data, error } = await supabase.rpc("get_public_stats" as never);
    if (error || !data) return EMPTY;
    const d = data as Record<string, number>;
    return {
      incidents: Number(d.incidents ?? 0),
      resolved: Number(d.resolved ?? 0),
      critical: Number(d.critical ?? 0),
      stations: Number(d.stations ?? 0),
      zones: Number(d.zones ?? 0),
      inspectors: Number(d.inspectors ?? 0),
      tasks: Number(d.tasks ?? 0),
      resolutionRate: Number(d.resolutionRate ?? 0),
    };
  } catch {
    return EMPTY;
  }
}
