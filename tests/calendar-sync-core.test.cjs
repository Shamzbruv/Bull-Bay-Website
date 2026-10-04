const { test } = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
const path = require('node:path');

// Same loader as the other suites: transpile the real file, resolving "@/..." to the repo.
const cache = new Map();
function load(file) {
  if (cache.has(file)) return cache.get(file);
  const full = path.join(__dirname, '..', file);
  const source = fs.readFileSync(fs.existsSync(full) ? full : `${full}.ts`, 'utf8');
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const mod = { exports: {} };
  cache.set(file, mod.exports);
  new Function('require', 'module', 'exports', output)((name) => (name.startsWith('@/') ? load(name.slice(2)) : require(name)), mod, mod.exports);
  cache.set(file, mod.exports);
  return mod.exports;
}
const core = load('lib/calendar/sync-core.ts');
const {
  googleIdForSiteEvent, siteEventIdFromGoogleId, importedSiteEventId, contentOfSite, contentOfGoogle, hashContent, googleBodyForSite,
  googlePatchForSite, descriptionWithVideoLink, planHours, mergeEvents, findMissing, kindForImport, changedFields, isAvailabilityEntry,
} = core;

const ID = '0f3c2a10-7b1e-4c55-9a6d-2e8f4b9a1c01';
const ID2 = '1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d';
const T0 = '2026-10-10T14:00:00.000Z';
const T1 = '2026-10-10T15:00:00.000Z';

function site(over = {}) {
  return { id: ID, title: 'Staff meeting', startsAt: T0, endsAt: T1, kind: 'meeting', visibility: 'public', location: null, meetingUrl: null, updatedAt: '2026-10-01T00:00:00Z', readOnly: false, ...over };
}
/** A Google event exactly as the website would have written it, as Google would list it back. */
function mirrored(s, over = {}) {
  return { ...googleBodyForSite(s), updated: '2026-10-01T00:00:00.000Z', ...over };
}
function native(over = {}) {
  return { id: 'abcdefghij1234567890', status: 'confirmed', summary: 'Visit Sis. Brown', start: { dateTime: '2026-10-11T13:00:00-05:00' }, end: { dateTime: '2026-10-11T14:00:00-05:00' }, updated: '2026-10-02T00:00:00.000Z', ...over };
}
function linkFor(s, g, syncedHash) {
  return { eventId: s.id, googleEventId: g.id, syncedHash: syncedHash ?? hashContent(contentOfSite(s)), googleUpdated: g.updated ?? null };
}
const merge = (input) => mergeEvents({ connectionId: 'conn-1', confirmedGone: new Set(), links: [], google: [], site: [], ...input });
const types = (ops) => ops.map((o) => o.type);

// -- identifiers ----------------------------------------------------------
test('website entries keep a Google id that points back to them, using only characters Google allows', () => {
  const gid = googleIdForSiteEvent(ID);
  assert.match(gid, /^[a-v0-9]{5,1024}$/);
  assert.equal(siteEventIdFromGoogleId(gid), ID);
  assert.equal(siteEventIdFromGoogleId('abcdefghij1234567890'), null);
  assert.equal(siteEventIdFromGoogleId(`${gid}_20261010T140000Z`), null);
});

test('an imported entry always gets the same website id, and different ones differ', () => {
  const a = importedSiteEventId('conn-1', 'g1');
  assert.match(a, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.equal(importedSiteEventId('conn-1', 'g1'), a);
  assert.notEqual(importedSiteEventId('conn-1', 'g2'), a);
  assert.notEqual(importedSiteEventId('conn-2', 'g1'), a);
});

// -- content mapping ------------------------------------------------------
test('fingerprints ignore line-ending and surrounding-space differences', () => {
  const a = contentOfSite(site({ title: '  Staff meeting ', location: 'Office\r\nRoom 2' }));
  const b = contentOfSite(site({ title: 'Staff meeting', location: 'Office\nRoom 2' }));
  assert.equal(hashContent(a), hashContent(b));
});

test('a Google event reads back the same as the website entry it was written from (no ping-pong)', () => {
  const variants = [
    site(),
    site({ location: "Pastor's office" }),
    site({ meetingUrl: 'https://meet.google.com/abc-defg-hij' }),
    site({ location: 'Sanctuary', meetingUrl: 'https://meet.google.com/abc-defg-hij' }),
    site({ visibility: 'private' }),
    site({ kind: 'day_off', startsAt: '2026-10-12T05:00:00.000Z', endsAt: '2026-10-13T05:00:00.000Z' }),
    site({ title: 'Quotes "and" <tags> & ünïcode ✝' }),
  ];
  for (const s of variants) {
    const back = contentOfGoogle(mirrored(s));
    assert.equal(hashContent(back), hashContent(contentOfSite(s)), JSON.stringify(s));
  }
});

test('whole-day website entries are sent to Google as all-day events', () => {
  const body = googleBodyForSite(site({ startsAt: '2026-10-12T05:00:00.000Z', endsAt: '2026-10-14T05:00:00.000Z' }));
  assert.deepEqual(body.start, { date: '2026-10-12' });
  assert.deepEqual(body.end, { date: '2026-10-14' });
  const back = contentOfGoogle({ ...body, updated: 'x' });
  assert.equal(back.startsAt, '2026-10-12T05:00:00Z');
  assert.equal(back.endsAt, '2026-10-14T05:00:00Z');
});

test('Google events are read in Jamaica time, whatever zone they were saved in', () => {
  const c = contentOfGoogle(native({ start: { dateTime: '2026-10-11T18:00:00Z' }, end: { dateTime: '2026-10-11T19:00:00Z' } }));
  assert.equal(c.startsAt, '2026-10-11T18:00:00Z');
  const allDay = contentOfGoogle(native({ start: { date: '2026-10-20' }, end: { date: '2026-10-21' } }));
  assert.equal(allDay.startsAt, '2026-10-20T05:00:00Z');
  assert.equal(allDay.endsAt, '2026-10-21T05:00:00Z');
});

test('unusable Google events are rejected or repaired rather than imported broken', () => {
  assert.equal(contentOfGoogle({ id: 'x', summary: 'No times' }), null);
  const zero = contentOfGoogle(native({ end: { dateTime: '2026-10-11T13:00:00-05:00' } }));
  assert.equal(new Date(zero.endsAt) - new Date(zero.startsAt), 30 * 60_000);
  assert.equal(contentOfGoogle(native({ summary: '   ' })).title, '(No title)');
  assert.equal(contentOfGoogle(native({ location: 'x'.repeat(300) })).location.length, 200);
});

test('a Google Meet link and a "Video call:" line both become the video link, the website line first', () => {
  assert.equal(contentOfGoogle(native({ hangoutLink: 'https://meet.google.com/aaa-bbbb-ccc' })).meetingUrl, 'https://meet.google.com/aaa-bbbb-ccc');
  const both = contentOfGoogle(native({ hangoutLink: 'https://meet.google.com/aaa-bbbb-ccc', description: 'Notes\n\nVideo call: https://zoom.us/j/123' }));
  assert.equal(both.meetingUrl, 'https://zoom.us/j/123');
  assert.equal(contentOfGoogle(native({ hangoutLink: 'http://insecure.example/x' })).meetingUrl, null);
});

test('a location that is only the video link is not treated as an address', () => {
  const c = contentOfGoogle(native({ location: 'https://meet.google.com/aaa-bbbb-ccc' }));
  assert.equal(c.location, null);
  assert.equal(c.meetingUrl, 'https://meet.google.com/aaa-bbbb-ccc');
  assert.equal(contentOfGoogle(native({ location: 'Church hall' })).location, 'Church hall');
});

test('Google private/confidential entries are private on the website; default is public', () => {
  assert.equal(contentOfGoogle(native({ visibility: 'private' })).isPrivate, true);
  assert.equal(contentOfGoogle(native({ visibility: 'confidential' })).isPrivate, true);
  assert.equal(contentOfGoogle(native({ visibility: 'default' })).isPrivate, false);
  assert.equal(contentOfGoogle(native()).isPrivate, false);
});

test('imported entries become "meeting" when they say where or how, otherwise "busy"', () => {
  assert.equal(kindForImport(contentOfGoogle(native())), 'busy');
  assert.equal(kindForImport(contentOfGoogle(native({ location: 'Hall' }))), 'meeting');
  assert.equal(kindForImport(contentOfGoogle(native({ hangoutLink: 'https://meet.google.com/a-b-c' }))), 'meeting');
});

test('changedFields names what differs', () => {
  const a = contentOfSite(site());
  assert.deepEqual(changedFields(a, contentOfSite(site({ title: 'New', location: 'Hall' }))), ['title', 'location']);
  assert.deepEqual(changedFields(a, contentOfSite(site({ endsAt: '2026-10-10T16:00:00Z' }))), ['time']);
  assert.deepEqual(changedFields(a, a), []);
});

// -- writing to Google ----------------------------------------------------
test('a patch to an existing Google event keeps what the person wrote and only sets the synced line', () => {
  const s = site({ meetingUrl: 'https://meet.google.com/new-link-xyz', title: 'Renamed' });
  const patch = googlePatchForSite(s, 'Bring the budget.\n\nVideo call: https://old.example/x');
  assert.equal(patch.summary, 'Renamed');
  assert.equal(patch.description, 'Video call: https://meet.google.com/new-link-xyz\n\nBring the budget.');
  assert.equal(patch.location, 'https://meet.google.com/new-link-xyz');
  const cleared = googlePatchForSite(site(), 'Bring the budget.\n\nVideo call: https://old.example/x');
  assert.equal(cleared.description, 'Bring the budget.');
  assert.equal(cleared.location, null);
  assert.equal(descriptionWithVideoLink(undefined, null), '');
});

test('a new Google event is marked as the platform\'s and carries the video link in its description', () => {
  const body = googleBodyForSite(site({ location: 'Office', meetingUrl: 'https://meet.google.com/a-b-c' }));
  assert.equal(body.location, 'Office');
  assert.match(body.description, /^Video call: https:\/\/meet\.google\.com\/a-b-c/);
  assert.equal(body.extendedProperties.private.church_event_id, ID);
  assert.equal(body.id, googleIdForSiteEvent(ID));
});

// -- working hours --------------------------------------------------------
const block = { id: '9b8a7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d', dayOfWeek: 2, startTime: '09:00:00', endTime: '17:00:00', label: 'In the office' };

test('working hours are created once, left alone while unchanged, and updated or removed with the website', () => {
  const first = planHours([block], []);
  assert.deepEqual(types(first.map((o) => ({ type: o.type }))), ['create']);
  const listed = { ...first[0].body, updated: 'x' };
  assert.deepEqual(planHours([block], [listed]), []);
  const relabelled = planHours([{ ...block, label: 'Counselling' }], [listed]);
  assert.deepEqual(relabelled.map((o) => o.type), ['update']);
  assert.deepEqual(planHours([], [listed]).map((o) => o.type), ['delete']);
});

test('working-hours cleanup never touches entries the platform did not make', () => {
  const stranger = { id: 'a' + 'f'.repeat(32), summary: 'Mine', start: { dateTime: T0 }, end: { dateTime: T1 } };
  assert.deepEqual(planHours([], [stranger]), []);
  assert.equal(googleBodyForSite(site()).transparency, 'opaque');
  assert.equal(isAvailabilityEntry({ id: `a${'0'.repeat(32)}_20261013T140000Z` }), true);
  assert.equal(isAvailabilityEntry({ id: 'x', recurringEventId: `a${'0'.repeat(32)}` }), true);
  assert.equal(isAvailabilityEntry(native()), false);
});

// -- merge: new things ----------------------------------------------------
test('a new website entry is created in Google', () => {
  assert.deepEqual(types(merge({ site: [site()] })), ['google_create']);
});

test('an entry created in Google is imported, with a sensible kind and privacy', () => {
  const ops = merge({ google: [native({ visibility: 'private', location: 'Hall' })] });
  assert.equal(ops.length, 1);
  assert.equal(ops[0].type, 'site_create');
  assert.equal(ops[0].kind, 'meeting');
  assert.equal(ops[0].content.isPrivate, true);
  assert.equal(ops[0].googleEventId, 'abcdefghij1234567890');
});

test('Google entries that should not become website entries are skipped', () => {
  const instance = { ...native({ id: `a${'1'.repeat(32)}_20261013T140000Z` }), recurringEventId: `a${'1'.repeat(32)}`, extendedProperties: { private: { church_managed: 'yes' } } };
  assert.deepEqual(merge({ google: [native({ status: 'cancelled' }), native({ id: 'free', transparency: 'transparent' }), instance, { id: 'nostart', summary: 'x' }] }), []);
});

// -- merge: in step and edits --------------------------------------------
test('nothing happens when both sides already agree', () => {
  const s = site();
  const g = mirrored(s);
  assert.deepEqual(merge({ site: [s], google: [g], links: [linkFor(s, g)] }), []);
});

test('a website edit goes to Google, and a Google edit comes to the website', () => {
  const base = site();
  const g = mirrored(base);
  const link = linkFor(base, g);
  const edited = site({ title: 'Staff meeting (moved)', updatedAt: '2026-10-03T00:00:00Z' });
  const push = merge({ site: [edited], google: [g], links: [link] });
  assert.deepEqual(types(push), ['google_update']);
  assert.deepEqual(push[0].fields, ['title']);

  const googleEdited = mirrored(base, { summary: 'Renamed in Google', start: { dateTime: '2026-10-10T10:30:00-05:00', timeZone: 'America/Jamaica' }, updated: '2026-10-03T00:00:00.000Z' });
  const pull = merge({ site: [base], google: [googleEdited], links: [link] });
  assert.deepEqual(types(pull), ['site_update']);
  assert.deepEqual(pull[0].fields, ['title', 'time']);
  assert.equal(pull[0].content.title, 'Renamed in Google');
});

test('when both sides were edited, the more recent edit wins', () => {
  const base = site();
  const link = linkFor(base, mirrored(base));
  const websiteEdit = site({ title: 'Website version', updatedAt: '2026-10-05T12:00:00Z' });
  const olderGoogle = mirrored(base, { summary: 'Google version', updated: '2026-10-04T12:00:00.000Z' });
  assert.deepEqual(types(merge({ site: [websiteEdit], google: [olderGoogle], links: [link] })), ['google_update']);
  const newerGoogle = mirrored(base, { summary: 'Google version', updated: '2026-10-06T12:00:00.000Z' });
  const ops = merge({ site: [websiteEdit], google: [newerGoogle], links: [link] });
  assert.deepEqual(types(ops), ['site_update']);
  assert.match(ops[0].reason, /newer/);
});

test('the remembered fingerprint is refreshed when only Google\'s timestamp moved', () => {
  const s = site();
  const g = mirrored(s);
  const ops = merge({ site: [s], google: [{ ...g, updated: '2026-10-09T00:00:00.000Z' }], links: [linkFor(s, g)] });
  assert.deepEqual(types(ops), ['link_set']);
});

// -- merge: deletions -----------------------------------------------------
test('an entry deleted in Google is removed from the website, but only once Google confirms it is gone', () => {
  const s = site();
  const g = mirrored(s);
  const link = linkFor(s, g);
  assert.deepEqual(merge({ site: [s], google: [], links: [link] }), []);
  assert.deepEqual(types(merge({ site: [s], google: [], links: [link], confirmedGone: new Set([g.id]) })), ['site_delete']);
  assert.deepEqual(types(merge({ site: [s], google: [{ ...g, status: 'cancelled' }], links: [link] })), ['site_delete']);
});

test('an entry deleted on the website is deleted from Google; a mirror already gone just loses its link', () => {
  const s = site();
  const g = mirrored(s);
  const ops = merge({ site: [], google: [g], links: [linkFor(s, g)] });
  assert.deepEqual(types(ops), ['google_delete']);
  assert.equal(ops[0].title, 'Staff meeting');
  assert.deepEqual(types(merge({ site: [], google: [], links: [linkFor(s, g)] })), ['link_remove']);
});

test('only entries wholly inside the listed window can be called missing', () => {
  const inside = site();
  const outside = site({ id: ID2, startsAt: '2030-01-01T10:00:00Z', endsAt: '2030-01-01T11:00:00Z' });
  const links = [linkFor(inside, mirrored(inside)), linkFor(outside, mirrored(outside))];
  const missing = findMissing([inside, outside], [], links, new Date('2026-07-01T00:00:00Z'), new Date('2027-12-01T00:00:00Z'));
  assert.deepEqual(missing, [googleIdForSiteEvent(ID)]);
  assert.deepEqual(findMissing([inside], [mirrored(inside)], [links[0]], new Date('2026-07-01T00:00:00Z'), new Date('2027-12-01T00:00:00Z')), []);
});

// -- merge: platform-owned appointments ----------------------------------
test('a member\'s counselling appointment is put back if it is edited or deleted in Google', () => {
  const appt = site({ kind: 'appointment', visibility: 'private', title: 'Pastoral appointment', readOnly: true });
  const g = mirrored(appt);
  const link = linkFor(appt, g);
  const moved = mirrored(appt, { start: { dateTime: '2026-10-10T16:00:00-05:00' }, end: { dateTime: '2026-10-10T17:00:00-05:00' } });
  const edit = merge({ site: [appt], google: [moved], links: [link] });
  assert.deepEqual(types(edit), ['google_update']);
  assert.equal(edit[0].restored, true);
  const gone = merge({ site: [appt], google: [{ ...g, status: 'cancelled' }], links: [link] });
  assert.deepEqual(types(gone), ['google_create']);
  assert.equal(gone[0].restored, true);
});

// -- merge: taking over the earlier one-way sync's entries ----------------
test('entries the old one-way sync wrote are adopted, not duplicated or deleted', () => {
  const s = site();
  const g = mirrored(s);
  assert.deepEqual(types(merge({ site: [s], google: [g] })), ['link_set']);
});

test('a platform-written Google entry whose website entry is gone is tidied away, but a native entry is never mistaken for one', () => {
  const orphan = mirrored(site());
  assert.deepEqual(types(merge({ google: [orphan] })), ['google_delete']);
  const flagged = native({ extendedProperties: { private: { church_managed: 'yes' } } });
  assert.deepEqual(types(merge({ google: [flagged] })), ['site_create']);
});

test('an imported entry whose link was lost is recognised and re-linked, not duplicated back into Google', () => {
  const g = native();
  const row = site({ id: importedSiteEventId('conn-1', g.id), title: 'Visit Sis. Brown', startsAt: '2026-10-11T18:00:00Z', endsAt: '2026-10-11T19:00:00Z' });
  const ops = merge({ site: [row], google: [g] });
  assert.deepEqual(types(ops), ['link_set']);
  assert.equal(ops[0].link.googleEventId, g.id);
});
