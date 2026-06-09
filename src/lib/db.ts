import { supabase } from "@/integrations/supabase/client";

// Type-erased client for tables added after the types.ts snapshot was generated.
// Use only where strict typing is unavailable; prefer typed `supabase` otherwise.
export const db = supabase as unknown as {
  from: (table: string) => any;
  storage: typeof supabase.storage;
  auth: typeof supabase.auth;
};

export type IncidentSeverity = "low" | "medium" | "high" | "critical";
export type IncidentStatus = "open" | "triaged" | "in_progress" | "resolved" | "closed";
export type IncidentCategory =
  | "signal" | "track" | "rolling_stock" | "safety" | "infrastructure"
  | "passenger" | "electrical" | "other";

export interface IncidentRow {
  id: string;
  reporter_id: string;
  zone_id: string | null;
  station_id: string | null;
  title: string;
  description: string;
  category: IncidentCategory;
  severity: IncidentSeverity;
  status: IncidentStatus;
  location_lat: number | null;
  location_lng: number | null;
  location_text: string | null;
  ai_summary: string | null;
  ai_severity: IncidentSeverity | null;
  ai_suggested_actions: string | null;
  ai_categories: string[] | null;
  assigned_to: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export type AssetType = "track" | "signal" | "bridge" | "platform" | "rolling_stock" | "electrical" | "crossing" | "other";
export type AssetStatus = "operational" | "needs_attention" | "critical" | "under_maintenance" | "decommissioned";

export interface AssetRow {
  id: string;
  zone_id: string | null;
  station_id: string | null;
  name: string;
  code: string | null;
  type: AssetType;
  location_lat: number | null;
  location_lng: number | null;
  installation_date: string | null;
  last_inspection_date: string | null;
  health_score: number;
  status: AssetStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}
