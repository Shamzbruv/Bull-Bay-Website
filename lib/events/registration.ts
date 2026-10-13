import { z } from "zod";

export const registrationInput = z.object({
  isMember: z.enum(["yes", "no"], { error: "Please tell us whether you are a church member." }),
  guestName: z.string().trim().min(2, "Enter your full name.").max(200),
  guestEmail: z.email({ error: "Enter a valid email address." }).max(254).transform(value => value.toLowerCase()),
  guestPhone: z.string().trim().min(7, "Enter a contact phone number.").max(50).regex(/^[+\d\s().-]+$/, "Enter a valid phone number."),
  quantity: z.coerce.number().int().min(1).max(50),
  attendees: z.string().trim().max(5000),
  requirements: z.string().trim().max(2000),
  notes: z.string().trim().max(5000),
  consent: z.literal("yes", { error: "Please agree to share these details with the church office for this event." }),
}).superRefine((value, ctx) => {
  const names = value.attendees.split("\n").map(name => name.trim()).filter(Boolean);
  if (names.length !== value.quantity - 1) ctx.addIssue({ code: "custom", path: ["attendees"], message: "List one name per additional attendee so the names match the number attending." });
});

/** Prevent spreadsheet applications from interpreting exported user text as formulas. */
export function csvCell(value: unknown): string {
  const text = String(value ?? "");
  const safe = /^[\s]*[=+@-]/.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
}
