"use client";

import { DashboardRouteError } from "@/components/dashboard-route-state";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <DashboardRouteError error={error} reset={reset} />;
}
