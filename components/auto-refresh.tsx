"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Re-fetches the current server-rendered page on a timer while the tab is
 * visible — the safety net under RealtimeRefresh for data that changes
 * without a database event this user can see (a Google Calendar edit that
 * lands in a private row, say). Client state such as the selected day is
 * kept; only the server data underneath changes.
 */
export function AutoRefresh({ seconds = 60 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, seconds * 1000);
    return () => clearInterval(timer);
  }, [router, seconds]);
  return null;
}
