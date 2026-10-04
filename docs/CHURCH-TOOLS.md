# Church tools: Live Countdown and Quiz Night

Two apps that used to run as separate Railway services now run inside this
site. Admins reach them from **Service tools → Live countdown & quiz**
(`/admin/tools`).

| Address | Who | What |
| --- | --- | --- |
| `/tools/live` | anyone | Sanctuary TV display |
| `/tools/live/overlay.html` | anyone | OBS countdown overlay (browser source) |
| `/tools/live/text-overlay.html` | anyone | OBS lyrics & text overlay |
| `/tools/live/admin` | admins | Countdown control panel |
| `/tools/quiz` and everything under it | admins | Quiz Night |
| `/tools/quiz/game/<id>/buzzer` | anyone | A player's phone buzzer (from the QR code) |

"Admins" means anyone whose workspace is Church Admin: every staff role and
the super administrator, not pastors or members (`lib/tools/access.ts`).
A super administrator previewing another role gets that role's answer.

## Where the data lives

Both apps keep using the separate **Bull Bay NTCOG Games** Supabase project
(`jywpbmhbyjxrfuzdczom`), not the church database:

- Countdown: tables `countdown_settings`, `countdown_templates`,
  `countdown_songs` and the `countdown-media` storage bucket. Row level
  security is on with no policies; only the server, with that project's
  service-role key, reads or writes them.
- Quiz: its own tables, read and written from the browser with that
  project's anon key (see `tools/quiz/supabase/migrations`).

Settings on the Railway service:

| Variable | Used | Value |
| --- | --- | --- |
| `COUNTDOWN_SUPABASE_URL` | server, at run time | Games project URL |
| `COUNTDOWN_SUPABASE_SERVICE_KEY` | server, at run time | Games project service-role key |
| `VITE_SUPABASE_URL` | quiz build | Games project URL |
| `VITE_SUPABASE_ANON_KEY` | quiz build, ends up in the browser | Games project anon key |

## Live Countdown

The pages in `public/tools/live` are the original app's, unchanged except
for addresses and sign-in. The control panel page is `tools/live/admin.html`,
served by `app/tools/live/admin/route.ts` after the admin check, so it
can't be fetched from `public/` around it.

The original server used Socket.IO, which a Next.js server can't host. Its
logic moved to `lib/live/hub.ts` (one hub per server process, on
`globalThis`), and the transport became:

- `GET /tools/live/api/stream?role=sanctuary|overlay|admin`: a Server-Sent
  Events stream. The first event, `hello`, carries the connection's id; then
  the same events Socket.IO sent (`stateSync`, `templatesSync`,
  `sanctuaryOverride`, …).
- `POST /tools/live/api/emit` with `{ clientId, events: [{ event, data }] }`:
  what the page sends, applied in order.
- `public/tools/live/live-socket.js` gives the pages the same `io()`,
  `socket.on()` and `socket.emit()` they were written against. It sends one
  request at a time and batches whatever queued meanwhile, so a dragged
  volume slider can't arrive out of order.

Whether a connection may change anything is decided when it opens, from the
church sign-in, as the old server decided from its login cookie: only an
`admin` stream opened by a signed-in admin may send control-panel events;
only a `sanctuary` stream may report the outro ending or audio being blocked.

These API routes are left out of the session middleware (`middleware.ts`):
screens hold the stream open for hours, the volume slider posts on every
step, and media uploads (up to 50 MB) would be cut at the middleware's 10 MB
body buffer. The routes check the sign-in themselves.

Differences from the old server, on purpose:

- The countdown itself (event, start time, live/forced state, music) is now
  saved (`countdown_settings` key `countdownState`) and restored at start,
  because this server restarts with every website deploy. Without it, a
  deploy during a service would send every TV back to idle.
- A failed read of the templates at start no longer writes the two default
  templates over the saved ones.
- Sign-in, sign-out and password change are the church site's; the app's
  own password is gone.

## Quiz Night

`tools/quiz` is the original Vite + React app with its base path set to
`/tools/quiz/`. `npm run build` runs `build:tools` first, which installs the
quiz's dependencies, builds it into `public/tools/quiz` (git-ignored), moves
the HTML page to `tools/quiz/dist-shell/index.html` (also git-ignored) and
removes the quiz's `node_modules`. `app/tools/quiz/[[...path]]/route.ts`
hands that page out after the admin check, except for players' buzzer pages.

The quiz's own host PIN was removed: the church sign-in replaces it.

To work on the quiz alone: `cd tools/quiz && npm ci && npm run dev` (it runs
at `http://localhost:5173/tools/quiz/`).

## Known gaps

- The quiz tables in the Games project accept writes from anyone holding the
  anon key, which ships in the quiz's JavaScript (as it did before the
  merge). Tightening that means moving the quiz's writes behind the server.
- Two copies of the countdown (this one and the old Railway service, while
  it still runs) don't share the live countdown, only templates, songs and
  media. Screens follow whichever address they were opened on.
