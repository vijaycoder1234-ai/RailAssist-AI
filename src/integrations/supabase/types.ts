export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ai_runs: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          incident_id: string | null
          model: string
          output: Json | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          incident_id?: string | null
          model: string
          output?: Json | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          incident_id?: string | null
          model?: string
          output?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_runs_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
        ]
      }
      assets: {
        Row: {
          code: string | null
          created_at: string
          health_score: number
          id: string
          installation_date: string | null
          last_inspection_date: string | null
          location_lat: number | null
          location_lng: number | null
          name: string
          notes: string | null
          station_id: string | null
          status: Database["public"]["Enums"]["asset_status"]
          type: Database["public"]["Enums"]["asset_type"]
          updated_at: string
          zone_id: string | null
        }
        Insert: {
          code?: string | null
          created_at?: string
          health_score?: number
          id?: string
          installation_date?: string | null
          last_inspection_date?: string | null
          location_lat?: number | null
          location_lng?: number | null
          name: string
          notes?: string | null
          station_id?: string | null
          status?: Database["public"]["Enums"]["asset_status"]
          type?: Database["public"]["Enums"]["asset_type"]
          updated_at?: string
          zone_id?: string | null
        }
        Update: {
          code?: string | null
          created_at?: string
          health_score?: number
          id?: string
          installation_date?: string | null
          last_inspection_date?: string | null
          location_lat?: number | null
          location_lng?: number | null
          name?: string
          notes?: string | null
          station_id?: string | null
          status?: Database["public"]["Enums"]["asset_status"]
          type?: Database["public"]["Enums"]["asset_type"]
          updated_at?: string
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assets_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "stations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      incident_media: {
        Row: {
          created_at: string
          file_path: string
          id: string
          incident_id: string
          kind: string
          mime_type: string | null
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          file_path: string
          id?: string
          incident_id: string
          kind?: string
          mime_type?: string | null
          uploaded_by: string
        }
        Update: {
          created_at?: string
          file_path?: string
          id?: string
          incident_id?: string
          kind?: string
          mime_type?: string | null
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "incident_media_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
        ]
      }
      incidents: {
        Row: {
          ai_categories: string[] | null
          ai_severity: Database["public"]["Enums"]["incident_severity"] | null
          ai_suggested_actions: string | null
          ai_summary: string | null
          assigned_to: string | null
          category: Database["public"]["Enums"]["incident_category"]
          created_at: string
          description: string
          id: string
          location_lat: number | null
          location_lng: number | null
          location_text: string | null
          reporter_id: string
          resolved_at: string | null
          severity: Database["public"]["Enums"]["incident_severity"]
          station_id: string | null
          status: Database["public"]["Enums"]["incident_status"]
          title: string
          updated_at: string
          zone_id: string | null
        }
        Insert: {
          ai_categories?: string[] | null
          ai_severity?: Database["public"]["Enums"]["incident_severity"] | null
          ai_suggested_actions?: string | null
          ai_summary?: string | null
          assigned_to?: string | null
          category?: Database["public"]["Enums"]["incident_category"]
          created_at?: string
          description: string
          id?: string
          location_lat?: number | null
          location_lng?: number | null
          location_text?: string | null
          reporter_id: string
          resolved_at?: string | null
          severity?: Database["public"]["Enums"]["incident_severity"]
          station_id?: string | null
          status?: Database["public"]["Enums"]["incident_status"]
          title: string
          updated_at?: string
          zone_id?: string | null
        }
        Update: {
          ai_categories?: string[] | null
          ai_severity?: Database["public"]["Enums"]["incident_severity"] | null
          ai_suggested_actions?: string | null
          ai_summary?: string | null
          assigned_to?: string | null
          category?: Database["public"]["Enums"]["incident_category"]
          created_at?: string
          description?: string
          id?: string
          location_lat?: number | null
          location_lng?: number | null
          location_text?: string | null
          reporter_id?: string
          resolved_at?: string | null
          severity?: Database["public"]["Enums"]["incident_severity"]
          station_id?: string | null
          status?: Database["public"]["Enums"]["incident_status"]
          title?: string
          updated_at?: string
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "incidents_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "stations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      inspectors: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          avatar_url: string | null
          created_at: string
          designation: string | null
          email: string
          employee_id: string | null
          full_name: string
          id: string
          phone: string | null
          rejection_reason: string | null
          status: Database["public"]["Enums"]["inspector_status"]
          updated_at: string
          user_id: string
          zone_id: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          avatar_url?: string | null
          created_at?: string
          designation?: string | null
          email: string
          employee_id?: string | null
          full_name: string
          id?: string
          phone?: string | null
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["inspector_status"]
          updated_at?: string
          user_id: string
          zone_id?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          avatar_url?: string | null
          created_at?: string
          designation?: string | null
          email?: string
          employee_id?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["inspector_status"]
          updated_at?: string
          user_id?: string
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inspectors_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_logs: {
        Row: {
          action: string
          asset_id: string
          created_at: string
          id: string
          next_due_at: string | null
          notes: string | null
          performed_at: string
          performed_by: string | null
        }
        Insert: {
          action: string
          asset_id: string
          created_at?: string
          id?: string
          next_due_at?: string | null
          notes?: string | null
          performed_at?: string
          performed_by?: string | null
        }
        Update: {
          action?: string
          asset_id?: string
          created_at?: string
          id?: string
          next_due_at?: string | null
          notes?: string | null
          performed_at?: string
          performed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_logs_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_tasks: {
        Row: {
          accepted_at: string | null
          after_photos: string[] | null
          assigned_by: string | null
          assigned_to: string
          before_photos: string[] | null
          completed_at: string | null
          completion_report: string | null
          created_at: string
          due_at: string | null
          id: string
          incident_id: string
          notes: string | null
          priority: Database["public"]["Enums"]["task_priority"]
          remarks: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["task_status"]
          updated_at: string
          verified_at: string | null
        }
        Insert: {
          accepted_at?: string | null
          after_photos?: string[] | null
          assigned_by?: string | null
          assigned_to: string
          before_photos?: string[] | null
          completed_at?: string | null
          completion_report?: string | null
          created_at?: string
          due_at?: string | null
          id?: string
          incident_id: string
          notes?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          remarks?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          updated_at?: string
          verified_at?: string | null
        }
        Update: {
          accepted_at?: string | null
          after_photos?: string[] | null
          assigned_by?: string | null
          assigned_to?: string
          before_photos?: string[] | null
          completed_at?: string | null
          completion_report?: string | null
          created_at?: string
          due_at?: string | null
          id?: string
          incident_id?: string
          notes?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          remarks?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          updated_at?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_tasks_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          designation: string | null
          email: string
          employee_id: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          designation?: string | null
          email: string
          employee_id?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          designation?: string | null
          email?: string
          employee_id?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      stations: {
        Row: {
          code: string
          created_at: string
          division: string | null
          id: string
          latitude: number | null
          longitude: number | null
          name: string
          updated_at: string
          zone_id: string
        }
        Insert: {
          code: string
          created_at?: string
          division?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name: string
          updated_at?: string
          zone_id: string
        }
        Update: {
          code?: string
          created_at?: string
          division?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          updated_at?: string
          zone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stations_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      zones: {
        Row: {
          code: string
          created_at: string
          description: string | null
          headquarters: string | null
          id: string
          name: string
          region: string | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          headquarters?: string | null
          id?: string
          name: string
          region?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          headquarters?: string | null
          id?: string
          name?: string
          region?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_public_stats: { Args: never; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "super_admin" | "inspector" | "maintenance"
      asset_status:
        | "operational"
        | "needs_attention"
        | "critical"
        | "under_maintenance"
        | "decommissioned"
      asset_type:
        | "track"
        | "signal"
        | "bridge"
        | "platform"
        | "rolling_stock"
        | "electrical"
        | "crossing"
        | "other"
      incident_category:
        | "signal"
        | "track"
        | "rolling_stock"
        | "safety"
        | "infrastructure"
        | "passenger"
        | "electrical"
        | "other"
      incident_severity: "low" | "medium" | "high" | "critical"
      incident_status:
        | "open"
        | "triaged"
        | "in_progress"
        | "awaiting_verification"
        | "resolved"
        | "closed"
      inspector_status: "pending" | "approved" | "rejected" | "suspended"
      task_priority: "low" | "medium" | "high" | "critical"
      task_status:
        | "assigned"
        | "accepted"
        | "in_progress"
        | "awaiting_verification"
        | "completed"
        | "rejected"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["super_admin", "inspector", "maintenance"],
      asset_status: [
        "operational",
        "needs_attention",
        "critical",
        "under_maintenance",
        "decommissioned",
      ],
      asset_type: [
        "track",
        "signal",
        "bridge",
        "platform",
        "rolling_stock",
        "electrical",
        "crossing",
        "other",
      ],
      incident_category: [
        "signal",
        "track",
        "rolling_stock",
        "safety",
        "infrastructure",
        "passenger",
        "electrical",
        "other",
      ],
      incident_severity: ["low", "medium", "high", "critical"],
      incident_status: [
        "open",
        "triaged",
        "in_progress",
        "awaiting_verification",
        "resolved",
        "closed",
      ],
      inspector_status: ["pending", "approved", "rejected", "suspended"],
      task_priority: ["low", "medium", "high", "critical"],
      task_status: [
        "assigned",
        "accepted",
        "in_progress",
        "awaiting_verification",
        "completed",
        "rejected",
      ],
    },
  },
} as const
