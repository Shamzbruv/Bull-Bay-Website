import { z } from "zod";

export const MEMBERSHIP_STATUSES = ["visitor", "returning_visitor", "attendee", "prospective_member", "member", "inactive", "deceased"] as const;
export const membershipStatus = z.enum(MEMBERSHIP_STATUSES);
export const optionalDate = z.string().trim().refine(value => {
  if (!value) return true;
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}, "Enter a valid date.").transform(value => value || null);
export const memberDetail = z.object({
  category: z.string().trim().min(1, "Choose or add a category.").max(100),
  label: z.string().trim().min(1, "Enter a detail name.").max(100),
  value: z.string().trim().min(1, "Enter the detail.").max(10000),
});
export const memberDates = z.object({ joined_at: optionalDate, deceased_at: optionalDate, date_of_birth: optionalDate }).refine(
  dates => !dates.deceased_at || dates.deceased_at <= new Date().toLocaleDateString("sv-SE", { timeZone: "America/Jamaica" }),
  "Date of death cannot be in the future.",
).refine(dates => !dates.date_of_birth || dates.date_of_birth <= new Date().toLocaleDateString("sv-SE", { timeZone: "America/Jamaica" }), "Date of birth cannot be in the future.").refine(dates => !dates.deceased_at || !dates.date_of_birth || dates.deceased_at >= dates.date_of_birth, "Date of death cannot be before date of birth.");
