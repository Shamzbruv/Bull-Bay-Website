/**
 * Pure date helpers shared by every calendar view.
 *
 * Calendar navigation is deliberately done in plain browser-local calendar
 * terms (like every native <input type="date"> already used in this feature)
 * — the exact instant math for "does this event touch this date" is what
 * has to respect Jamaica time, since that's what the server-side
 * availability and slot logic is written against.
 */
export function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y ?? new Date().getFullYear(), (m ?? 1) - 1, d ?? 1, 12);
}
export function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}
export function startOfWeek(d: Date): Date {
  return addDays(d, -d.getDay());
}
export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1, 12);
}
export function jamaicaDayBounds(dateKey: string): [Date, Date] {
  const start = new Date(`${dateKey}T00:00:00-05:00`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return [start, end];
}
export function todayJamaicaKey(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Jamaica" });
}
const DAY_MS = 86_400_000;
const JAMAICA_OFFSET_MS = 5 * 3_600_000;

/** True when an entry runs from one Jamaica midnight to another, in whole days. */
export function spansWholeDays(startIso: string, endIso: string): boolean {
  const start = new Date(startIso).getTime();
  const length = new Date(endIso).getTime() - start;
  return (start - JAMAICA_OFFSET_MS) % DAY_MS === 0 && length > 0 && length % DAY_MS === 0;
}

/** The Jamaica calendar date (YYYY-MM-DD) an instant falls on. */
export function jamaicaDateOf(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: "America/Jamaica" });
}

/**
 * A week's range as people write it: "Oct 4 – 10, 2026", "Sep 27 – Oct 3,
 * 2026", "Dec 27, 2026 – Jan 2, 2027". Built by hand because asking the
 * browser for just a day and a year comes back as "2026 (day: 10)".
 */
export function weekRangeLabel(start: Date, end: Date): string {
  const month = (d: Date) => d.toLocaleDateString("en-US", { month: "short" });
  if (start.getFullYear() !== end.getFullYear()) {
    return `${month(start)} ${start.getDate()}, ${start.getFullYear()} – ${month(end)} ${end.getDate()}, ${end.getFullYear()}`;
  }
  if (start.getMonth() !== end.getMonth()) return `${month(start)} ${start.getDate()} – ${month(end)} ${end.getDate()}, ${end.getFullYear()}`;
  return `${month(start)} ${start.getDate()} – ${end.getDate()}, ${end.getFullYear()}`;
}

export function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const hour = h ?? 0;
  const minute = m ?? 0;
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return minute ? `${hour12}:${String(minute).padStart(2, "0")} ${period}` : `${hour12} ${period}`;
}
export function formatSlotTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", { timeZone: "America/Jamaica", hour: "numeric", minute: "2-digit" });
}
