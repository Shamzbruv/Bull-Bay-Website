# Forms

The church's own form builder: sign-ups, registrations, surveys, requests
and quizzes, with what Google Forms and Microsoft Forms offer plus a few
things only a church platform can do (members' details filled in for them,
personal invitations, spot limits, a member page).

| Who | Where |
| --- | --- |
| The office (`forms.manage`) | `/admin/forms`: templates, the builder, responses, sharing |
| Anyone with the link | `/f/<public id>` (short, unguessable; `?embed=1` for other websites) |
| Members | `/member/forms`: forms waiting for them, forms open to members, what they've sent |

Old invitation links (`/forms/<token>`) still work and redirect to the new
page.

## Building a form

Start blank or from a template: event registration, volunteer sign-up (with
spot limits), baby dedication request, youth camp registration (consent and
a parent's signature), service feedback (rating, NPS, Likert grid), Bible
quiz, ministry interest, and update your contact details.

**19 question types:** short answer, paragraph, email, phone, number,
multiple choice, checkboxes, dropdown, ranking, linear scale, rating (stars,
hearts, thumbs or numbers), Net Promoter Score, multiple-choice grid
(optionally a Likert scale), tick-box grid, date (with or without the year
or a time), time (or a length of time), file upload, signature, and an
"I agree" tick.

Questions can be required, have a description (links become clickable),
"Other" with a typed answer, shuffled choices, limits on how many boxes are
ticked, answer checks (email, number between, length, contains, a pattern…),
and a limit on how many people may pick a choice ("Saturday: 2 spots
left"). Also: titles and text, pictures, YouTube videos, and sections.

**Logic:** a section is a new page. A multiple-choice or dropdown answer can
send people to a section or straight to submit; each section can say where
to go next. Any question or text can be shown only when earlier answers
match ("show only when…": equals, contains, answered, greater than…).

Changing a question's type keeps its wording, choices and the settings both
types share. Items can be duplicated, moved, or dragged. The builder saves
as you type; if two people edit the same form, the second save is refused
with a message rather than silently overwriting the first. A form with a
problem (an empty choice, a branch to a deleted section) isn't saved until
it's fixed, and the problem is listed in plain words.

**Member details:** for signed-in members, name, email and phone questions
can be filled in from their profile.

## Settings

- **Responses:** accepting on or off (with the message people see), open and
  close times, a maximum number of responses.
- **Who:** anyone with the link, signed-in members only, or one response
  per member. Email addresses: not collected, the member's own (verified),
  or typed in.
- **After sending:** a confirmation message, "submit another response",
  emailed receipts (always, or when the person asks), changing answers
  afterwards (a private link by email, or "Change answers" on the member
  page), and a results summary people can see.
- **Presentation:** progress bar, shuffled question order, colours, a header
  picture, the font, kiosk mode (resets itself for the next person, for a
  tablet at the welcome desk), and saving unfinished answers on the device.
- **Quiz:** points and an answer key per question (accepted text answers,
  the right choices, the right order, grid answers), feedback for right and
  wrong answers, scores shown straight away or released by the office,
  whether people see what they missed, the correct answers and the points.
  Paragraph answers wait to be marked by hand.
- **Notifications:** off unless chosen, as in Google and Microsoft Forms,
  because a bell is also a phone notification. When on, secretaries, church
  executives and whoever made the form get a bell for each response. Staff
  can also be emailed every response. The baby dedication and contact
  update templates come with the bell on, since each needs action.
- **Member page:** list the form under "Open to members".

## Sharing

The Share tab has the link (with WhatsApp and email buttons), a QR code
(SVG on screen, a 1200-pixel PNG for printing), the HTML to embed the form on
another website, a pre-filled link builder, and personal invitations:
members chosen from the list get an email with their own link (valid 30
days). The office sees who has answered, can send a reminder (a fresh link;
the old one stops working) or cancel an invitation. A member who answers
through the ordinary link still counts as having answered.

## Responses

- **Summary:** a chart for each question (pie, bar, NPS breakdown, a heat
  table for grids, average place for rankings, averages for numbers) and the
  written answers. It updates as responses arrive.
- **Individual:** each response, answer by answer, with uploaded files,
  signatures, and quiz marking (points and feedback by hand). It prints
  cleanly on its own.
- **Spreadsheet:** a CSV that opens in Excel and Google Sheets (one column
  per question, a column per grid row).
- **Scores:** release them (optionally emailed) when marking is done.
- **Deleting** responses or a form deletes their uploaded files too, and a
  form's pictures, unless a copy of the form still shows them.

## How it's kept safe

- Every rule is checked again on the server (`lib/forms/validate.ts`): only
  answers to questions the person was actually shown are kept, and
  required questions, limits and formats are enforced there.
- Respondents' browsers never receive the answer key, the feedback, or the
  list of staff to email (`itemsForRespondent`, `respondentSettings`).
- Spam: a hidden field only bots fill in, and a minimum time to answer.
  Spam is told it worked and nothing is stored.
- Files go straight from the browser to a private bucket (`form-uploads`)
  with a one-time upload link, into a folder only that response knows. On
  submit the server checks each file arrived there at the size claimed. The
  office opens files through links that expire in five minutes.
- Edit links are stored only as a hash.
- Spot limits: if two people take the last spot at the same moment, the
  first keeps it and the other is asked to choose again.
- Each response keeps a copy of the questions it answered, so editing a form
  later never changes what an earlier response meant.
- Text people type can contain `{{` without stopping a receipt
  (`lib/office/email.ts` checks the template's own blanks, not the answers).

## Data

Migration `supabase/migrations/20261004200000_forms_builder.sql`:

- `office_forms`: `public_id`, `fields` (the builder's items), `settings`,
  `version`.
- `form_responses`: `answers` (by question id), `form_snapshot`, `score`,
  `max_score`, `grading`, `score_released`, `edit_token_hash`,
  `upload_session`. RLS: the office reads with `forms.manage`, members read
  their own; all writes go through the server.
- `form_assignments` (invitations): `token_hash`, `reminded_at`,
  `response_id`; deleted with their form.
- Storage: `form-uploads` (private, 25 MB) and `public-site/forms/<form id>/`
  for pictures.
- Email templates: `form-receipt`, `form-invitation`, `staff-notification`.

## Code

- `lib/forms/`: `schema.ts` (types and settings), `logic.ts` (pages,
  branching, conditions, availability), `validate.ts`, `score.ts`,
  `summary.ts` (charts and the spreadsheet), `display.ts`, `builder.ts`,
  `templates.ts`, `server.ts` (submitting, spots, receipts, notifications).
- `components/forms/`: the form as respondents see it, every input, the
  signature pad, and the charts.
- `app/f/[publicId]/`: the public page, its submit action, and results.
- `app/(admin)/admin/forms/`: the list, the builder (`[id]/editor`),
  responses, sharing, the spreadsheet and file downloads.
- `app/api/forms/[publicId]/`: upload links and QR codes.
- Tests: `tests/forms.test.cjs`.
