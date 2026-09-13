"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { DAY_NAMES } from "@/lib/pastoral/reasons";

export type AvailabilityBlock = { id: string; dayOfWeek: number; startTime: string; endTime: string; label: string | null };
export type CalendarEntry = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  kind: "day_off" | "busy" | "appointment";
  visibility: "public" | "private";
};
type OpenSlot = { starts_at: string; ends_at: string };
type CalendarView = "month" | "week" | "day";

const SHORT_DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const BOOKING_WINDOW_DAYS = 90;

// -- Pure date helpers -------------------------------------------------
// Calendar navigation is deliberately done in plain browser-local calendar
// terms (like every native <input type="date"> already used elsewhere in
// this feature) — the exact instant math for "does this event touch this
// date" below is what actually has to respect Jamaica time, since that's
// what the server-side availability/slot logic is written against.
function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y ?? new Date().getFullYear(), (m ?? 1) - 1, d ?? 1, 12);
}
function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}
function startOfWeek(d: Date): Date {
  return addDays(d, -d.getDay());
}
function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1, 12);
}
function jamaicaDayBounds(dateKey: string): [Date, Date] {
  const start = new Date(`${dateKey}T00:00:00-05:00`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return [start, end];
}
function eventTouchesDate(entry: CalendarEntry, dateKey: string): boolean {
  const [dayStart, dayEnd] = jamaicaDayBounds(dateKey);
  return new Date(entry.startsAt) < dayEnd && new Date(entry.endsAt) > dayStart;
}
function todayJamaicaKey(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Jamaica" });
}
function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const hour = h ?? 0;
  const minute = m ?? 0;
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return minute ? `${hour12}:${String(minute).padStart(2, "0")} ${period}` : `${hour12} ${period}`;
}
function formatSlotTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", { timeZone: "America/Jamaica", hour: "numeric", minute: "2-digit" });
}

const ENTRY_LABEL: Record<CalendarEntry["kind"], string> = { day_off: "Day off", busy: "Busy", appointment: "Appointment" };
const ENTRY_CLASS: Record<CalendarEntry["kind"], string> = {
  day_off: "pcal-chip-dayoff",
  busy: "pcal-chip-busy",
  appointment: "pcal-chip-appointment",
};

/**
 * A real calendar — Month/Week/Day, matching what "manage my hours" and
 * "book a time with the pastoral team" both actually need instead of the
 * flat text lists this replaced. Two modes share one component so both
 * ends of pastoral scheduling look and behave the same way:
 *
 * - "manage": a pastoral team member's own calendar. availability/events
 *   are the full raw data, already fetched server-side (RLS already
 *   scopes it to their own rows) — this only ever transforms it for
 *   display; add/remove still goes through the existing forms/actions.
 * - "book": a member looking at someone else's calendar to find a time.
 *   Only day_of_week patterns and PUBLIC events are visible client-side
 *   (RLS enforces that), which is enough for Month/Week's "are they
 *   generally free" view — the actual bookable slots (which also account
 *   for private appointments the client never sees) come from the
 *   existing available_counsel_slots() RPC, fetched per visible day.
 */
export function PastoralCalendar({
  mode,
  availability,
  events,
  onRemoveAvailability,
  onRemoveEvent,
  onSlotSelect,
  selectedSlotIso,
  bookingPersonId,
  initialView = "week",
  onDaySelect,
}: {
  mode: "manage" | "book";
  availability: AvailabilityBlock[];
  events: CalendarEntry[];
  onRemoveAvailability?: (id: string) => void;
  onRemoveEvent?: (id: string) => void;
  onSlotSelect?: (startsAtIso: string, endsAtIso: string) => void;
  selectedSlotIso?: string | null;
  bookingPersonId?: string;
  initialView?: CalendarView;
  onDaySelect?: (dateKey: string) => void;
}) {
  const [view, setView] = useState<CalendarView>(initialView);
  const [cursor, setCursor] = useState<Date>(() => parseDateKey(todayJamaicaKey()));
  const todayKey = todayJamaicaKey();
  const maxBookableKey = toDateKey(addDays(parseDateKey(todayKey), BOOKING_WINDOW_DAYS));

  const availabilityByDay = useMemo(() => {
    const map = new Map<number, AvailabilityBlock[]>();
    for (const a of availability) map.set(a.dayOfWeek, [...(map.get(a.dayOfWeek) ?? []), a]);
    return map;
  }, [availability]);

  function availabilityForKey(dateKey: string): AvailabilityBlock[] {
    return availabilityByDay.get(parseDateKey(dateKey).getDay()) ?? [];
  }
  function eventsForKey(dateKey: string): CalendarEntry[] {
    return events.filter((e) => eventTouchesDate(e, dateKey));
  }
  function isBookable(dateKey: string): boolean {
    return mode === "manage" || (dateKey >= todayKey && dateKey <= maxBookableKey);
  }

  function goToday() {
    setCursor(parseDateKey(todayKey));
  }
  function goPrev() {
    setCursor((c) => (view === "month" ? startOfMonth(addDays(startOfMonth(c), -1)) : addDays(c, view === "week" ? -7 : -1)));
  }
  function goNext() {
    setCursor((c) => (view === "month" ? startOfMonth(addDays(startOfMonth(c), 32)) : addDays(c, view === "week" ? 7 : 1)));
  }
  function openDay(dateKey: string) {
    setCursor(parseDateKey(dateKey));
    setView("day");
    onDaySelect?.(dateKey);
  }

  const title = useMemo(() => {
    if (view === "month") return cursor.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    if (view === "day") return cursor.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
    const start = startOfWeek(cursor);
    const end = addDays(start, 6);
    const sameMonth = start.getMonth() === end.getMonth();
    return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${end.toLocaleDateString("en-US", sameMonth ? { day: "numeric", year: "numeric" } : { month: "short", day: "numeric", year: "numeric" })}`;
  }, [view, cursor]);

  return (
    <div className="pcal">
      <div className="pcal-toolbar">
        <div className="pcal-toolbar-nav">
          <button type="button" onClick={goPrev} aria-label="Previous">‹</button>
          <button type="button" className="pcal-today-button" onClick={goToday}>Today</button>
          <button type="button" onClick={goNext} aria-label="Next">›</button>
        </div>
        <h3 className="pcal-toolbar-title">{title}</h3>
        <div className="pcal-view-toggle" role="tablist" aria-label="Calendar view">
          {(["month", "week", "day"] as const).map((v) => (
            <button key={v} type="button" role="tab" aria-selected={view === v} className={view === v ? "is-active" : ""} onClick={() => setView(v)}>
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {view === "month" && (
        <MonthGrid
          cursor={cursor}
          todayKey={todayKey}
          mode={mode}
          availabilityForKey={availabilityForKey}
          eventsForKey={eventsForKey}
          isBookable={isBookable}
          onOpenDay={openDay}
        />
      )}
      {view === "week" && (
        <WeekGrid
          cursor={cursor}
          todayKey={todayKey}
          mode={mode}
          availabilityForKey={availabilityForKey}
          eventsForKey={eventsForKey}
          isBookable={isBookable}
          onRemoveAvailability={onRemoveAvailability}
          onRemoveEvent={onRemoveEvent}
          onSlotSelect={onSlotSelect}
          selectedSlotIso={selectedSlotIso}
          bookingPersonId={bookingPersonId}
          onOpenDay={openDay}
        />
      )}
      {view === "day" && (
        <DayAgenda
          dateKey={toDateKey(cursor)}
          mode={mode}
          availabilityForKey={availabilityForKey}
          eventsForKey={eventsForKey}
          isBookable={isBookable}
          onRemoveAvailability={onRemoveAvailability}
          onRemoveEvent={onRemoveEvent}
          onSlotSelect={onSlotSelect}
          selectedSlotIso={selectedSlotIso}
          bookingPersonId={bookingPersonId}
        />
      )}
    </div>
  );
}

function MonthGrid({
  cursor,
  todayKey,
  mode,
  availabilityForKey,
  eventsForKey,
  isBookable,
  onOpenDay,
}: {
  cursor: Date;
  todayKey: string;
  mode: "manage" | "book";
  availabilityForKey: (key: string) => AvailabilityBlock[];
  eventsForKey: (key: string) => CalendarEntry[];
  isBookable: (key: string) => boolean;
  onOpenDay: (key: string) => void;
}) {
  const monthStart = startOfMonth(cursor);
  const gridStart = startOfWeek(monthStart);
  const weeks = Math.ceil((monthStart.getDay() + new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate()) / 7);
  const days = Array.from({ length: weeks * 7 }, (_, i) => addDays(gridStart, i));

  return (
    <div className="pcal-month-grid">
      {SHORT_DAY_NAMES.map((d) => (
        <div key={d} className="pcal-month-weekday">{d}</div>
      ))}
      {days.map((date) => {
        const key = toDateKey(date);
        const outside = date.getMonth() !== cursor.getMonth();
        const dayAvailability = availabilityForKey(key);
        const dayEvents = eventsForKey(key);
        const bookable = isBookable(key);
        return (
          <button
            type="button"
            key={key}
            className={`pcal-month-cell${outside ? " is-outside" : ""}${key === todayKey ? " is-today" : ""}${!bookable ? " is-disabled" : ""}`}
            onClick={() => onOpenDay(key)}
          >
            <span className="pcal-month-date">{date.getDate()}</span>
            <span className="pcal-month-dots">
              {dayAvailability.length > 0 && <span className="pcal-dot pcal-dot-availability" title={mode === "manage" ? "Weekly hours set" : "Usually available"} />}
              {dayEvents.slice(0, 3).map((e) => (
                <span key={e.id} className={`pcal-dot pcal-dot-${e.kind}`} title={e.title} />
              ))}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function DayHours({ dateKey, availabilityForKey }: { dateKey: string; availabilityForKey: (key: string) => AvailabilityBlock[] }) {
  const hours = availabilityForKey(dateKey);
  if (hours.length === 0) return <p className="pcal-hours-caption pcal-muted">Not available</p>;
  return (
    <p className="pcal-hours-caption">
      {hours.map((h) => `${formatTime(h.startTime)}–${formatTime(h.endTime)}`).join(", ")}
    </p>
  );
}

function WeekGrid({
  cursor,
  todayKey,
  mode,
  availabilityForKey,
  eventsForKey,
  isBookable,
  onRemoveAvailability,
  onRemoveEvent,
  onSlotSelect,
  selectedSlotIso,
  bookingPersonId,
  onOpenDay,
}: {
  cursor: Date;
  todayKey: string;
  mode: "manage" | "book";
  availabilityForKey: (key: string) => AvailabilityBlock[];
  eventsForKey: (key: string) => CalendarEntry[];
  isBookable: (key: string) => boolean;
  onRemoveAvailability?: (id: string) => void;
  onRemoveEvent?: (id: string) => void;
  onSlotSelect?: (startsAtIso: string, endsAtIso: string) => void;
  selectedSlotIso?: string | null;
  bookingPersonId?: string;
  onOpenDay: (key: string) => void;
}) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(cursor), i));
  const keys = days.map(toDateKey);
  const slotsByDate = useSlotsForDates(mode === "book" ? bookingPersonId : undefined, mode === "book" ? keys : []);

  return (
    <div className="pcal-week-grid">
      {days.map((date) => {
        const key = toDateKey(date);
        const bookable = isBookable(key);
        return (
          <div key={key} className={`pcal-week-col${key === todayKey ? " is-today" : ""}${!bookable ? " is-disabled" : ""}`}>
            <button type="button" className="pcal-week-col-header" onClick={() => onOpenDay(key)}>
              <span>{SHORT_DAY_NAMES[date.getDay()]}</span>
              <strong>{date.getDate()}</strong>
            </button>
            <div className="pcal-week-col-body">
              <DayHours dateKey={key} availabilityForKey={availabilityForKey} />
              {eventsForKey(key).map((e) => (
                <EventChip key={e.id} entry={e} onRemove={mode === "manage" ? onRemoveEvent : undefined} />
              ))}
              {mode === "manage" &&
                availabilityForKey(key).map((a) => (
                  <span key={a.id} className="pcal-chip pcal-chip-availability">
                    {formatTime(a.startTime)}–{formatTime(a.endTime)}
                    {a.label && ` (${a.label})`}
                    {onRemoveAvailability && (
                      <button type="button" className="pcal-chip-remove" aria-label="Remove these hours" onClick={() => onRemoveAvailability(a.id)}>
                        ×
                      </button>
                    )}
                  </span>
                ))}
              {mode === "book" && bookable && (
                <SlotButtons slots={slotsByDate.get(key)} onSelect={onSlotSelect} selectedSlotIso={selectedSlotIso} compact />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DayAgenda({
  dateKey,
  mode,
  availabilityForKey,
  eventsForKey,
  isBookable,
  onRemoveAvailability,
  onRemoveEvent,
  onSlotSelect,
  selectedSlotIso,
  bookingPersonId,
}: {
  dateKey: string;
  mode: "manage" | "book";
  availabilityForKey: (key: string) => AvailabilityBlock[];
  eventsForKey: (key: string) => CalendarEntry[];
  isBookable: (key: string) => boolean;
  onRemoveAvailability?: (id: string) => void;
  onRemoveEvent?: (id: string) => void;
  onSlotSelect?: (startsAtIso: string, endsAtIso: string) => void;
  selectedSlotIso?: string | null;
  bookingPersonId?: string;
}) {
  const bookable = isBookable(dateKey);
  const slotsByDate = useSlotsForDates(mode === "book" && bookable ? bookingPersonId : undefined, mode === "book" && bookable ? [dateKey] : []);
  const dayEvents = eventsForKey(dateKey);
  const dayHours = availabilityForKey(dateKey);

  if (mode === "book") {
    if (!bookable) return <p className="pcal-empty">That date is outside the bookable window.</p>;
    return (
      <div className="pcal-day-view">
        <DayHours dateKey={dateKey} availabilityForKey={availabilityForKey} />
        {dayEvents.map((e) => (
          <EventChip key={e.id} entry={e} />
        ))}
        <div className="pcal-day-section">
          <h4>Available times</h4>
          <SlotButtons slots={slotsByDate.get(dateKey)} onSelect={onSlotSelect} selectedSlotIso={selectedSlotIso} />
        </div>
      </div>
    );
  }

  return (
    <div className="pcal-day-view">
      <div className="pcal-day-section">
        <h4>Weekly hours — {DAY_NAMES[parseDateKey(dateKey).getDay()]}</h4>
        {dayHours.length === 0 && <p className="pcal-empty">No hours published for this day yet.</p>}
        {dayHours.map((a) => (
          <div key={a.id} className="pcal-agenda-row">
            <span>
              {formatTime(a.startTime)}–{formatTime(a.endTime)} {a.label && <em>({a.label})</em>}
            </span>
            {onRemoveAvailability && (
              <button type="button" className="link-button" onClick={() => onRemoveAvailability(a.id)}>
                remove
              </button>
            )}
          </div>
        ))}
      </div>
      <div className="pcal-day-section">
        <h4>Entries on this date</h4>
        {dayEvents.length === 0 && <p className="pcal-empty">Nothing on the calendar for this date.</p>}
        {dayEvents.map((e) => (
          <div key={e.id} className="pcal-agenda-row">
            <span>
              <span className={`badge ${e.kind === "appointment" ? "gold" : e.kind === "day_off" ? "" : "gray"}`}>{ENTRY_LABEL[e.kind]}</span>{" "}
              {e.title}
            </span>
            {onRemoveEvent && e.kind !== "appointment" && (
              <button type="button" className="link-button" onClick={() => onRemoveEvent(e.id)}>
                remove
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function EventChip({ entry, onRemove }: { entry: CalendarEntry; onRemove?: (id: string) => void }) {
  return (
    <span className={`pcal-chip ${ENTRY_CLASS[entry.kind]}`}>
      {ENTRY_LABEL[entry.kind]}: {entry.title}
      {onRemove && entry.kind !== "appointment" && (
        <button type="button" className="pcal-chip-remove" aria-label={`Remove ${entry.title}`} onClick={() => onRemove(entry.id)}>
          ×
        </button>
      )}
    </span>
  );
}

function SlotButtons({
  slots,
  onSelect,
  selectedSlotIso,
  compact,
}: {
  slots: OpenSlot[] | undefined;
  onSelect?: (startsAtIso: string, endsAtIso: string) => void;
  selectedSlotIso?: string | null;
  compact?: boolean;
}) {
  if (slots === undefined) return <p className="pcal-muted pcal-slot-status">Loading times…</p>;
  if (slots.length === 0) return <p className="pcal-muted pcal-slot-status">No open times</p>;
  return (
    <div className={compact ? "pcal-slot-list pcal-slot-list-compact" : "pcal-slot-list"}>
      {slots.map((s) => (
        <button
          key={s.starts_at}
          type="button"
          className={`pcal-slot-button${selectedSlotIso === s.starts_at ? " is-selected" : ""}`}
          onClick={() => onSelect?.(s.starts_at, s.ends_at)}
        >
          {formatSlotTime(s.starts_at)}
        </button>
      ))}
    </div>
  );
}

/**
 * Fetches available_counsel_slots() for each of `dateKeys`, keyed by
 * `personId:dateKey` so switching people never shows a stale person's
 * slots as if they belonged to whoever's now selected — a date not yet
 * fetched for the current person is simply absent from the returned map,
 * which SlotButtons already renders as "Loading…". Nothing is cleared
 * synchronously in the effect (that's what previously tripped
 * react-hooks/set-state-in-effect): the store only ever grows via the
 * fetch's own callback, and the memo below reads back only today's
 * relevant keys.
 */
function useSlotsForDates(personId: string | undefined, dateKeys: string[]): Map<string, OpenSlot[]> {
  const [store, setStore] = useState<Map<string, OpenSlot[]>>(new Map());
  const keySignature = dateKeys.join(",");

  useEffect(() => {
    if (!personId || dateKeys.length === 0) return;
    let cancelled = false;
    const supabase = createClient();
    Promise.all(
      dateKeys.map(async (dateKey) => {
        const { data } = await supabase.rpc("available_counsel_slots", { person: personId, on_date: dateKey });
        return [`${personId}:${dateKey}`, (data ?? []) as OpenSlot[]] as const;
      }),
    ).then((results) => {
      if (cancelled) return;
      setStore((prev) => {
        const next = new Map(prev);
        for (const [key, value] of results) next.set(key, value);
        return next;
      });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personId, keySignature]);

  return useMemo(() => {
    const result = new Map<string, OpenSlot[]>();
    if (!personId) return result;
    for (const dateKey of dateKeys) {
      const value = store.get(`${personId}:${dateKey}`);
      if (value !== undefined) result.set(dateKey, value);
    }
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, personId, keySignature]);
}
