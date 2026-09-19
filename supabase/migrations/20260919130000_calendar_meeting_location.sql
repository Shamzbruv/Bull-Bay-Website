-- Adding a calendar entry had no way to say where it was or how to join
-- it — the Executive Assistant or Admin Assistant booking something onto
-- the pastor's calendar could only give it a title and a time. A "meeting"
-- kind, a location, and a video-call link let the pastor actually see
-- where he needs to be or what to click, straight from the calendar entry
-- itself (and, once synced, from the Google Calendar event too).

alter table public.pastoral_calendar_events
  add column if not exists location text,
  add column if not exists meeting_url text;

alter table public.pastoral_calendar_events
  drop constraint if exists pastoral_calendar_events_kind_check;
alter table public.pastoral_calendar_events
  add constraint pastoral_calendar_events_kind_check
  check (kind in ('day_off', 'busy', 'appointment', 'meeting'));

-- A location worth showing "vividly" is short by nature (an address, a
-- room name, "Google Meet") — bounded so nobody pastes a whole email
-- into it. The URL gets more room since Meet/Zoom links carry long
-- tokens, and is checked for a scheme so it's always safe to render as a
-- real link rather than plain text.
alter table public.pastoral_calendar_events
  add constraint pastoral_calendar_events_location_length check (location is null or char_length(location) <= 200),
  add constraint pastoral_calendar_events_meeting_url_length check (meeting_url is null or char_length(meeting_url) <= 500),
  add constraint pastoral_calendar_events_meeting_url_format check (meeting_url is null or meeting_url ~* '^https://');
