"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Silently re-fetches the current server-rendered page the moment one of
 * the given tables changes — used on dashboards that need to feel "live"
 * (attendance counts, pastor broadcasts, bulletin posts) without a client
 * data-fetching layer of their own. RLS still applies: a subscriber only
 * ever receives change events for rows they're allowed to select.
 */
export function RealtimeRefresh({ tables }: { tables: string[] }) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(`realtime-refresh-${tables.join("-")}`);
    for (const table of tables) {
      channel.on("postgres_changes", { event: "*", schema: "public", table }, () => router.refresh());
    }
    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tables.join(",")]);

  return null;
}
