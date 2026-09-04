import type { Metadata } from "next";
import { TeamCalendarView } from "@/app/(member)/member/team-calendar/team-calendar-view";

export const metadata: Metadata = { title: "My Pastoral Calendar" };

export default async function PastorCalendarPage() {
  return <TeamCalendarView />;
}
