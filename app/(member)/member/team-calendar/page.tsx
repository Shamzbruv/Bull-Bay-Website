import type { Metadata } from "next";
import { TeamCalendarView } from "./team-calendar-view";

export const metadata: Metadata = { title: "My Pastoral Calendar" };

export default async function TeamCalendarPage() {
  return <TeamCalendarView />;
}
