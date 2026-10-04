"use client";

import { useMemo, useState, useSyncExternalStore, type CSSProperties } from "react";
import type { CalendarItem, CalendarLayer } from "@/lib/calendar/church-calendar";
import { addDays, formatSlotTime, formatTime, jamaicaDayBounds, parseDateKey, startOfMonth, startOfWeek, toDateKey, todayJamaicaKey, weekRangeLabel } from "@/lib/calendar/dates";
import { DAY_NAMES } from "@/lib/pastoral/reasons";

type View = "month" | "week" | "agenda";

const SHORT_DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const AGENDA_STEP_DAYS = 45;
const MAX_PILLS = 3;

type Prepared = CalendarItem & { startMs: number; endMs: number };

const narrowQuery = "(max-width: 640px)";
function subscribeNarrow(callback: () => void) {
  const query = window.matchMedia(narrowQuery);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}
function useIsNarrow(): boolean {
  return useSyncExternalStore(
    subscribeNarrow,
    () => window.matchMedia(narrowQuery).matches,
    () => false,
  );
}

function safeHref(url: string | null): string | null {
  return url && /^https?:\/\//i.test(url) ? url : null;
}

function jamaicaDateKeyOf(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: "America/Jamaica" });
}

/** "9:00 AM – 10:30 AM", "All day", or the part of a multi-day entry that falls on this date. */
function timeLabelForDay(item: Prepared, dateKey: string): string {
  if (item.allDay) return "All day";
  const startsToday = jamaicaDateKeyOf(item.startsAt) === dateKey;
  const endsToday = jamaicaDateKeyOf(item.endsAt) === dateKey;
  if (startsToday && endsToday) return `${formatSlotTime(item.startsAt)} – ${formatSlotTime(item.endsAt)}`;
  if (startsToday) return `From ${formatSlotTime(item.startsAt)}`;
  if (endsToday) return `Until ${formatSlotTime(item.endsAt)}`;
  return "All day";
}

function hoursLabel(layer: CalendarLayer, dayOfWeek: number): string | null {
  const blocks = layer.hours.filter((h) => h.dayOfWeek === dayOfWeek).sort((a, b) => a.startTime.localeCompare(b.startTime));
  return blocks.length ? blocks.map((b) => `${formatTime(b.startTime)}–${formatTime(b.endTime)}`).join(", ") : null;
}

function layerStyle(color: string): CSSProperties {
  return { "--layer": color } as CSSProperties;
}

/**
 * The member-facing church calendar: church events and the schedule of the
 * pastor and pastoral team on one calendar, with a colour layer per person
 * that can be switched on and off. Read-only — booking time with someone is
 * done from "Pastor & calendar", and the people who own a schedule edit it
 * from their own calendar page.
 */
export function ChurchCalendar({ layers, items }: { layers: CalendarLayer[]; items: CalendarItem[] }) {
  const narrow = useIsNarrow();
  const [chosenView, setChosenView] = useState<View | null>(null);
  const view: View = chosenView ?? (narrow ? "agenda" : "month");
  const todayKey = todayJamaicaKey();
  const [cursor, setCursor] = useState<Date>(() => parseDateKey(todayKey));
  const [selectedKey, setSelectedKey] = useState<string>(todayKey);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [agendaDays, setAgendaDays] = useState(AGENDA_STEP_DAYS);

  const layerById = useMemo(() => new Map(layers.map((l) => [l.id, l])), [layers]);
  const prepared = useMemo<Prepared[]>(
    () => items.map((i) => ({ ...i, startMs: new Date(i.startsAt).getTime(), endMs: new Date(i.endsAt).getTime() })),
    [items],
  );
  const visibleItems = useMemo(() => prepared.filter((i) => !hidden.has(i.layerId)), [prepared, hidden]);

  function itemsForKey(dateKey: string): Prepared[] {
    const [dayStart, dayEnd] = jamaicaDayBounds(dateKey);
    const from = dayStart.getTime();
    const to = dayEnd.getTime();
    return visibleItems
      .filter((i) => i.startMs < to && i.endMs > from)
      .sort((a, b) => Number(b.allDay) - Number(a.allDay) || a.startMs - b.startMs);
  }

  function toggleLayer(id: string) {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function goToday() {
    setCursor(parseDateKey(todayKey));
    setSelectedKey(todayKey);
    setAgendaDays(AGENDA_STEP_DAYS);
  }
  function goPrev() {
    setCursor((c) => (view === "month" ? startOfMonth(addDays(startOfMonth(c), -1)) : addDays(c, -7)));
  }
  function goNext() {
    setCursor((c) => (view === "month" ? startOfMonth(addDays(startOfMonth(c), 32)) : addDays(c, 7)));
  }

  const title = useMemo(() => {
    if (view === "agenda") return "Coming up";
    if (view === "month") return cursor.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    const start = startOfWeek(cursor);
    return weekRangeLabel(start, addDays(start, 6));
  }, [view, cursor]);

  const peopleLayers = layers.filter((l) => !l.isChurch);

  return (
    <div className="pcal ccal">
      <div className="ccal-legend" role="group" aria-label="Whose calendar to show">
        {layers.map((layer) => {
          const on = !hidden.has(layer.id);
          return (
            <button key={layer.id} type="button" className={`ccal-layer${on ? " is-on" : ""}`} style={layerStyle(layer.color)} aria-pressed={on} onClick={() => toggleLayer(layer.id)}>
              <span className="ccal-layer-dot" aria-hidden="true" />
              <span>
                {layer.label}
                {layer.roleTitle && layer.roleTitle !== layer.label && <small>{layer.roleTitle}</small>}
              </span>
            </button>
          );
        })}
      </div>

      <div className="pcal-toolbar">
        {view !== "agenda" ? (
          <div className="pcal-toolbar-nav">
            <button type="button" onClick={goPrev} aria-label="Previous">‹</button>
            <button type="button" className="pcal-today-button" onClick={goToday}>Today</button>
            <button type="button" onClick={goNext} aria-label="Next">›</button>
          </div>
        ) : (
          <div className="pcal-toolbar-nav">
            <button type="button" className="pcal-today-button" onClick={goToday}>Today</button>
          </div>
        )}
        <h3 className="pcal-toolbar-title">{title}</h3>
        <div className="pcal-view-toggle" role="tablist" aria-label="Calendar view">
          {(["month", "week", "agenda"] as const).map((v) => (
            <button key={v} type="button" role="tab" aria-selected={view === v} className={view === v ? "is-active" : ""} onClick={() => setChosenView(v)}>
              {v === "agenda" ? "Agenda" : v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {view === "month" && (
        <MonthGrid cursor={cursor} todayKey={todayKey} selectedKey={selectedKey} itemsForKey={itemsForKey} layerById={layerById} onSelect={setSelectedKey} />
      )}
      {view === "week" && <WeekGrid cursor={cursor} todayKey={todayKey} itemsForKey={itemsForKey} layerById={layerById} />}
      {view === "agenda" && (
        <Agenda
          startKey={todayKey}
          days={agendaDays}
          itemsForKey={itemsForKey}
          layerById={layerById}
          onShowMore={() => setAgendaDays((d) => d + AGENDA_STEP_DAYS)}
        />
      )}

      {view === "month" && (
        <DayPanel dateKey={selectedKey} items={itemsForKey(selectedKey)} layerById={layerById} peopleLayers={peopleLayers.filter((l) => !hidden.has(l.id))} />
      )}
    </div>
  );
}

function MonthGrid({
  cursor,
  todayKey,
  selectedKey,
  itemsForKey,
  layerById,
  onSelect,
}: {
  cursor: Date;
  todayKey: string;
  selectedKey: string;
  itemsForKey: (key: string) => Prepared[];
  layerById: Map<string, CalendarLayer>;
  onSelect: (key: string) => void;
}) {
  const monthStart = startOfMonth(cursor);
  const gridStart = startOfWeek(monthStart);
  const weeks = Math.ceil((monthStart.getDay() + new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate()) / 7);
  const days = Array.from({ length: weeks * 7 }, (_, i) => addDays(gridStart, i));

  return (
    <div className="pcal-month-grid ccal-month">
      {SHORT_DAY_NAMES.map((d) => (
        <div key={d} className="pcal-month-weekday">{d}</div>
      ))}
      {days.map((date) => {
        const key = toDateKey(date);
        const dayItems = itemsForKey(key);
        const outside = date.getMonth() !== cursor.getMonth();
        return (
          <button
            type="button"
            key={key}
            className={`ccal-cell${outside ? " is-outside" : ""}${key === todayKey ? " is-today" : ""}${key === selectedKey ? " is-selected" : ""}`}
            aria-label={`${date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}, ${dayItems.length} ${dayItems.length === 1 ? "entry" : "entries"}`}
            aria-pressed={key === selectedKey}
            onClick={() => onSelect(key)}
          >
            <span className="pcal-month-date">{date.getDate()}</span>
            <span className="ccal-pills">
              {dayItems.slice(0, MAX_PILLS).map((item) => (
                <span key={item.id} className={`ccal-pill${item.hidden ? " is-busy" : ""}`} style={layerStyle(layerById.get(item.layerId)?.color ?? "#64748b")}>
                  {item.title}
                </span>
              ))}
              {dayItems.length > MAX_PILLS && <span className="ccal-more">+{dayItems.length - MAX_PILLS} more</span>}
            </span>
            <span className="ccal-dots" aria-hidden="true">
              {dayItems.slice(0, 4).map((item) => (
                <span key={item.id} className="ccal-dot" style={layerStyle(layerById.get(item.layerId)?.color ?? "#64748b")} />
              ))}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function WeekGrid({
  cursor,
  todayKey,
  itemsForKey,
  layerById,
}: {
  cursor: Date;
  todayKey: string;
  itemsForKey: (key: string) => Prepared[];
  layerById: Map<string, CalendarLayer>;
}) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(cursor), i));
  return (
    <div className="pcal-week-grid">
      {days.map((date) => {
        const key = toDateKey(date);
        const dayItems = itemsForKey(key);
        return (
          <div key={key} className={`pcal-week-col${key === todayKey ? " is-today" : ""}`}>
            <div className="pcal-week-col-header">
              <span>{SHORT_DAY_NAMES[date.getDay()]}</span>
              <strong>{date.getDate()}</strong>
            </div>
            <div className="pcal-week-col-body">
              {dayItems.length === 0 && <p className="pcal-hours-caption pcal-muted">Nothing scheduled</p>}
              {dayItems.map((item) => (
                <div key={item.id} className={`ccal-week-item${item.hidden ? " is-busy" : ""}`} style={layerStyle(layerById.get(item.layerId)?.color ?? "#64748b")}>
                  <span className="ccal-week-time">{timeLabelForDay(item, key)}</span>
                  <strong>{item.title}</strong>
                  <span className="ccal-week-who">{layerById.get(item.layerId)?.label}</span>
                  {item.location && <span className="ccal-week-where">📍 {item.location}</span>}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DayPanel({
  dateKey,
  items,
  layerById,
  peopleLayers,
}: {
  dateKey: string;
  items: Prepared[];
  layerById: Map<string, CalendarLayer>;
  peopleLayers: CalendarLayer[];
}) {
  const date = parseDateKey(dateKey);
  const dayOfWeek = date.getDay();
  return (
    <section className="ccal-day-panel" aria-live="polite">
      <h4>{date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</h4>
      {peopleLayers.length > 0 && (
        <ul className="ccal-hours-list">
          {peopleLayers.map((layer) => {
            const hours = hoursLabel(layer, dayOfWeek);
            return (
              <li key={layer.id} style={layerStyle(layer.color)}>
                <span className="ccal-layer-dot" aria-hidden="true" />
                <strong>{layer.label}</strong>
                <span className={hours ? "" : "pcal-muted"}>{hours ? `usually available ${hours}` : `no regular hours on ${DAY_NAMES[dayOfWeek]}s`}</span>
              </li>
            );
          })}
        </ul>
      )}
      {items.length === 0 ? <p className="pcal-empty">Nothing scheduled for this day.</p> : items.map((item) => <ItemRow key={item.id} item={item} dateKey={dateKey} layer={layerById.get(item.layerId)} />)}
    </section>
  );
}

function Agenda({
  startKey,
  days,
  itemsForKey,
  layerById,
  onShowMore,
}: {
  startKey: string;
  days: number;
  itemsForKey: (key: string) => Prepared[];
  layerById: Map<string, CalendarLayer>;
  onShowMore: () => void;
}) {
  const groups = Array.from({ length: days }, (_, i) => {
    const key = toDateKey(addDays(parseDateKey(startKey), i));
    return { key, items: itemsForKey(key) };
  }).filter((g) => g.items.length > 0);

  return (
    <div className="ccal-agenda">
      {groups.length === 0 && <p className="pcal-empty">Nothing scheduled in the next {days} days.</p>}
      {groups.map((group) => (
        <section key={group.key} className="ccal-agenda-day">
          <h4>{parseDateKey(group.key).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</h4>
          {group.items.map((item) => (
            <ItemRow key={`${group.key}-${item.id}`} item={item} dateKey={group.key} layer={layerById.get(item.layerId)} />
          ))}
        </section>
      ))}
      <button type="button" className="secondary-button compact" onClick={onShowMore}>
        Show the next {AGENDA_STEP_DAYS} days
      </button>
    </div>
  );
}

function ItemRow({ item, dateKey, layer }: { item: Prepared; dateKey: string; layer: CalendarLayer | undefined }) {
  const link = safeHref(item.meetingUrl);
  return (
    <div className={`ccal-item${item.hidden ? " is-busy" : ""}`} style={layerStyle(layer?.color ?? "#64748b")}>
      <div className="ccal-item-time">{timeLabelForDay(item, dateKey)}</div>
      <div className="ccal-item-body">
        <div className="ccal-item-title">
          <strong>{item.title}</strong>
          {layer && <span className="ccal-item-who">{layer.label}</span>}
          {item.category && <span className="badge gray">{item.category}</span>}
        </div>
        {(item.location || link) && (
          <div className="pcal-agenda-details">
            {item.location && (
              <span className="pcal-location">
                <span aria-hidden="true">📍</span> {item.location}
              </span>
            )}
            {link && (
              <a className="pcal-join-link" href={link} target="_blank" rel="noopener noreferrer">
                🎥 {item.kind === "church" ? "Join online" : "Join video call"} →
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
