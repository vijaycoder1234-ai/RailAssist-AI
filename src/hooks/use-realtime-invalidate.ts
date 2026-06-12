import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Subscribe to Postgres changes on one or more Supabase tables and invoke a
 * callback whenever any of them change. Use this to refetch/invalidate data
 * so UI (maps, counters, lists) updates live without a page reload.
 */
export function useRealtimeInvalidate(tables: string[], onChange: () => void) {
  useEffect(() => {
    const channels = tables.map((table) =>
      supabase
        .channel(`rt-${table}-${Math.random().toString(36).slice(2, 8)}`)
        .on(
          "postgres_changes" as never,
          { event: "*", schema: "public", table },
          () => onChange(),
        )
        .subscribe(),
    );
    return () => {
      channels.forEach((c) => supabase.removeChannel(c));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tables.join(",")]);
}
