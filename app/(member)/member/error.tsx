"use client";

import { DashboardRouteError } from "@/components/dashboard-route-state";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <DashboardRouteError reset={reset} />;
}
