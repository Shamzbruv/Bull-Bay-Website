const { test } = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
const path = require('node:path');

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
const { runSync } = load('lib/calendar/sync-engine');
const { GoogleApiError } = load('lib/calendar/google-api');
const core = load('lib/calendar/sync-core');
const { googleIdForSiteEvent, importedSiteEventId } = core;

const NOW = new Date('2026-10-03T12:00:00Z');
const CONN = 'conn-1';
const PROFILE = 'profile-pastor';
const ID1 = '0f3c2a10-7b1e-4c55-9a6d-2e8f4b9a1c01';
const ID2 = '1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d';

/** An in-memory Google Calendar, behaving like the real one where it matters (tombstones, 409 on reuse, PATCH merges). */
class FakeGoogle {
  constructor() { this.events = new Map(); this.clock = NOW.getTime(); this.calls = []; }
  tick() { this.clock += 1000; return new Date(this.clock).toISOString(); }
  async listWindow(min, max) {
    this.calls.push('list');
    return [...this.events.values()].filter((e) => e.status === 'cancelled' || (e.start && new Date(e.start.dateTime ?? `${e.start.date}T00:00:00-05:00`) >= new Date(min) && new Date(e.start.dateTime ?? `${e.start.date}T00:00:00-05:00`) <= new Date(max))).map((e) => structuredClone(e));
  }
  async listManaged() { this.calls.push('listManaged'); return [...this.events.values()].filter((e) => e.status !== 'cancelled' && e.extendedProperties?.private?.church_managed === 'yes').map((e) => structuredClone(e)); }
  async get(id) { this.calls.push('get'); const e = this.events.get(id); return e ? structuredClone(e) : null; }
  async insert(body) {
    if (this.events.has(body.id)) throw new GoogleApiError(409, 'The requested identifier already exists.');
    const e = { ...structuredClone(body), updated: this.tick() };
    this.events.set(e.id, e); this.calls.push('insert'); return structuredClone(e);
  }
  async patch(id, patch) {
    const e = this.events.get(id);
    if (!e || e.status === 'cancelled') throw new GoogleApiError(404, 'Not found');
    for (const [k, v] of Object.entries(structuredClone(patch))) { if (v === null) delete e[k]; else e[k] = v; }
    e.updated = this.tick(); this.calls.push('patch'); return structuredClone(e);
  }
  async replace(id, body) { const e = { ...structuredClone(body), updated: this.tick() }; this.events.set(id, e); this.calls.push('replace'); return structuredClone(e); }
  async remove(id) { const e = this.events.get(id); if (e) { e.status = 'cancelled'; e.updated = this.tick(); } this.calls.push('remove'); }
  writes() { return this.calls.filter((c) => ['insert', 'patch', 'replace', 'remove'].includes(c)); }
  resetCalls() { this.calls = []; }
  // What a person does in Google Calendar itself.
  userCreates(fields) { const e = { status: 'confirmed', ...structuredClone(fields), updated: this.tick() }; this.events.set(e.id, e); return e; }
  userEdits(id, fields) { const e = this.events.get(id); Object.assign(e, structuredClone(fields)); e.updated = this.tick(); }
  userDeletes(id) { const e = this.events.get(id); e.status = 'cancelled'; e.updated = this.tick(); }
  live() { return [...this.events.values()].filter((e) => e.status !== 'cancelled'); }
}

/** An in-memory database for one connection. */
class FakeStore {
  constructor() { this.events = new Map(); this.links = new Map(); this.logs = []; this.hours = []; this.locked = false; this.outcome = null; this.foreign = []; this.failCreateFor = null; this.failSetLinkOnce = false; }
  addSite(e) { this.events.set(e.id, { profileId: PROFILE, source: 'platform', updatedAt: '2026-10-01T00:00:00Z', visibility: 'public', kind: 'meeting', location: null, meetingUrl: null, readOnly: false, ...e }); }
  async claim() { if (this.locked) return false; this.locked = true; return true; }
  async release() { this.locked = false; }
  async loadSiteEvents(profileId, linkedIds, windowStartIso) {
    const own = [...this.events.values()].filter((e) => e.profileId === profileId && (new Date(e.endsAt) >= new Date(windowStartIso) || linkedIds.includes(e.id)));
    return [...own, ...this.foreign].map(({ profileId: _p, source: _s, ...rest }) => ({ ...rest }));
  }
  async loadHours() { return this.hours; }
  async loadLinks() { return [...this.links.values()]; }
  async setLink(_c, link) { if (this.failSetLinkOnce) { this.failSetLinkOnce = false; throw new Error('link write failed'); } this.links.set(link.eventId, { ...link }); }
  async removeLink(_c, eventId) { this.links.delete(eventId); }
  async createSiteEvent(ev) {
    if (this.failCreateFor && ev.title === this.failCreateFor) throw new Error('constraint violated');
    if (this.events.has(ev.id)) return;
    this.events.set(ev.id, { id: ev.id, profileId: ev.profile_id, title: ev.title, startsAt: ev.starts_at, endsAt: ev.ends_at, kind: ev.kind, visibility: ev.visibility, location: ev.location, meetingUrl: ev.meeting_url, source: ev.source, updatedAt: new Date().toISOString(), readOnly: false });
  }
  async updateSiteEvent(profileId, id, c) { const e = this.events.get(id); assert.equal(e.profileId, profileId); Object.assign(e, { title: c.title, startsAt: c.starts_at, endsAt: c.ends_at, visibility: c.visibility, location: c.location, meetingUrl: c.meeting_url, updatedAt: '2026-10-03T12:30:00Z' }); }
  async deleteSiteEvent(profileId, id) { const e = this.events.get(id); assert.equal(e.profileId, profileId); this.events.delete(id); }
  async siteEventExists(profileId, id) { return this.events.get(id)?.profileId === profileId; }
  async writeLog(_c, entries) { this.logs.push(...entries); }
  async finish(_c, outcome) { this.outcome = outcome; }
  titles() { return [...this.events.values()].filter((e) => e.profileId === PROFILE).map((e) => e.title).sort(); }
}

const run = (store, google) => runSync({ target: { connectionId: CONN, profileId: PROFILE }, store, google, now: NOW });
const standard = (over = {}) => ({ id: ID1, title: 'Staff meeting', startsAt: '2026-10-10T14:00:00Z', endsAt: '2026-10-10T15:00:00Z', ...over });
const nativeEvent = (over = {}) => ({ id: 'natv1abc', summary: 'Visit Sis. Brown', start: { dateTime: '2026-10-11T13:00:00-05:00' }, end: { dateTime: '2026-10-11T14:00:00-05:00' }, ...over });

test('website entries reach Google once, and a second sync changes nothing', async () => {
  const store = new FakeStore(); const google = new FakeGoogle();
  store.addSite(standard()); store.addSite(standard({ id: ID2, title: 'Visit', startsAt: '2026-10-12T14:00:00Z', endsAt: '2026-10-12T15:00:00Z' }));
  const first = await run(store, google);
  assert.equal(first.toGoogle.created, 2);
  assert.equal(google.live().length, 2);
  assert.ok(google.events.has(googleIdForSiteEvent(ID1)));
  assert.equal(store.links.size, 2);
  google.resetCalls();
  const second = await run(store, google);
  assert.deepEqual(google.writes(), []);
  assert.deepEqual([second.toGoogle, second.fromGoogle], [{ created: 0, updated: 0, deleted: 0 }, { created: 0, updated: 0, deleted: 0 }]);
  assert.equal(store.outcome.error, null);
  assert.equal(store.locked, false);
});

test('an entry created in Google appears on the website, once, and is left alone afterwards', async () => {
  const store = new FakeStore(); const google = new FakeGoogle();
  google.userCreates(nativeEvent({ visibility: 'private', location: 'Hall' }));
  const result = await run(store, google);
  assert.equal(result.fromGoogle.created, 1);
  const imported = [...store.events.values()][0];
  assert.equal(imported.id, importedSiteEventId(CONN, 'natv1abc'));
  assert.deepEqual([imported.title, imported.source, imported.kind, imported.visibility, imported.location], ['Visit Sis. Brown', 'google', 'meeting', 'private', 'Hall']);
  assert.match(store.logs.at(-1).detail, /Added .Visit Sis\. Brown. from Google Calendar/);
  google.resetCalls();
  await run(store, google);
  assert.deepEqual(google.writes(), []);
  assert.equal(store.events.size, 1);
  assert.equal(google.live().length, 1);
});

test('an edit made in Google changes the website entry, including its time', async () => {
  const store = new FakeStore(); const google = new FakeGoogle();
  google.userCreates(nativeEvent());
  await run(store, google);
  google.userEdits('natv1abc', { summary: 'Visit Sis. Brown (moved)', start: { dateTime: '2026-10-11T15:00:00-05:00' }, end: { dateTime: '2026-10-11T16:00:00-05:00' } });
  const result = await run(store, google);
  assert.equal(result.fromGoogle.updated, 1);
  const row = [...store.events.values()][0];
  assert.equal(row.title, 'Visit Sis. Brown (moved)');
  assert.equal(row.startsAt, '2026-10-11T20:00:00Z');
  assert.match(store.logs.at(-1).detail, /Updated .*from Google Calendar \(title, time\)/);
});

test('an edit made on the website reaches Google without disturbing what was set up there', async () => {
  const store = new FakeStore(); const google = new FakeGoogle();
  google.userCreates(nativeEvent({ description: 'Bring the casserole', attendees: [{ email: 'sis.brown@example.com' }], reminders: { useDefault: false } }));
  await run(store, google);
  const row = [...store.events.values()][0];
  row.title = 'Visit Sis. Brown at home'; row.location = 'Her house'; row.updatedAt = '2026-10-04T00:00:00Z';
  const result = await run(store, google);
  assert.equal(result.toGoogle.updated, 1);
  const g = google.events.get('natv1abc');
  assert.equal(g.summary, 'Visit Sis. Brown at home');
  assert.equal(g.location, 'Her house');
  assert.match(g.description, /Bring the casserole/);
  assert.deepEqual(g.attendees, [{ email: 'sis.brown@example.com' }]);
  assert.equal(google.calls.includes('replace'), false);
  google.resetCalls();
  await run(store, google);
  assert.deepEqual(google.writes(), []);
});

test('deleting in Google removes the website entry; deleting on the website removes the Google entry', async () => {
  const store = new FakeStore(); const google = new FakeGoogle();
  store.addSite(standard());
  google.userCreates(nativeEvent());
  await run(store, google);
  assert.equal(store.events.size, 2);

  google.userDeletes('natv1abc');
  const pulled = await run(store, google);
  assert.equal(pulled.fromGoogle.deleted, 1);
  assert.deepEqual(store.titles(), ['Staff meeting']);
  assert.equal(store.links.size, 1);

  store.events.delete(ID1);
  const pushed = await run(store, google);
  assert.equal(pushed.toGoogle.deleted, 1);
  assert.equal(google.live().length, 0);
  assert.equal(store.links.size, 0);
});

test('a conflict goes to whichever side was edited more recently', async () => {
  for (const [websiteStamp, expected] of [['2026-10-09T00:00:00Z', 'website'], ['2026-10-01T00:00:00Z', 'google']]) {
    const store = new FakeStore(); const google = new FakeGoogle();
    store.addSite(standard());
    await run(store, google);
    google.userEdits(googleIdForSiteEvent(ID1), { summary: 'Google edit' });
    const row = store.events.get(ID1); row.title = 'Website edit'; row.updatedAt = websiteStamp;
    google.events.get(googleIdForSiteEvent(ID1)).updated = '2026-10-05T00:00:00.000Z';
    await run(store, google);
    const winner = expected === 'website' ? 'Website edit' : 'Google edit';
    assert.equal(store.events.get(ID1).title, winner, expected);
    assert.equal(google.events.get(googleIdForSiteEvent(ID1)).summary, winner, expected);
  }
});

test('a member\'s appointment is put back when someone deletes or moves it in Google', async () => {
  const store = new FakeStore(); const google = new FakeGoogle();
  store.addSite(standard({ kind: 'appointment', visibility: 'private', title: 'Pastoral appointment', readOnly: true }));
  await run(store, google);
  const gid = googleIdForSiteEvent(ID1);

  google.userEdits(gid, { start: { dateTime: '2026-10-10T18:00:00-05:00' }, end: { dateTime: '2026-10-10T19:00:00-05:00' } });
  const reverted = await run(store, google);
  assert.equal(reverted.toGoogle.updated, 1);
  assert.equal(google.events.get(gid).start.dateTime, '2026-10-10T14:00:00Z');
  assert.match(store.logs.at(-1).detail, /can only be changed in the church platform/);

  google.userDeletes(gid);
  const restored = await run(store, google); // the old id is a tombstone: insert gets 409 and the engine writes over it
  assert.equal(restored.toGoogle.created, 1);
  assert.equal(google.events.get(gid).status, 'confirmed');
  assert.equal(store.events.has(ID1), true);
  assert.ok(google.calls.includes('replace'));
});

test('one failing change is reported without stopping the others', async () => {
  const store = new FakeStore(); const google = new FakeGoogle();
  google.userCreates(nativeEvent({ id: 'bad1', summary: 'Cursed entry' }));
  google.userCreates(nativeEvent({ id: 'good1', summary: 'Fine entry', start: { dateTime: '2026-10-13T13:00:00-05:00' }, end: { dateTime: '2026-10-13T14:00:00-05:00' } }));
  store.failCreateFor = 'Cursed entry';
  const result = await run(store, google);
  assert.deepEqual(store.titles(), ['Fine entry']);
  assert.equal(result.errors.length, 1);
  assert.match(store.logs.find((l) => l.action === 'error').detail, /Could not add .Cursed entry.: constraint violated/);
  assert.match(store.outcome.error, /1 change could not be synced/);
  assert.equal(store.locked, false);
});

test('a second sync that starts while one is running steps aside without touching Google', async () => {
  const store = new FakeStore(); const google = new FakeGoogle();
  store.locked = true;
  const result = await run(store, google);
  assert.equal(result.skipped, true);
  assert.deepEqual(google.calls, []);
  assert.equal(store.locked, true);
});

test('a crash between creating the website entry and saving its link does not create a duplicate', async () => {
  const store = new FakeStore(); const google = new FakeGoogle();
  google.userCreates(nativeEvent());
  store.failSetLinkOnce = true;
  const crashed = await run(store, google);
  assert.equal(crashed.errors.length, 1);
  assert.equal(store.events.size, 1);
  assert.equal(store.links.size, 0);
  await run(store, google);
  assert.equal(store.events.size, 1);
  assert.equal(store.links.size, 1);
  assert.equal(google.live().length, 1);
});

test('entries outside the listed window, or that Google merely failed to list, are never deleted', async () => {
  const store = new FakeStore(); const google = new FakeGoogle();
  store.addSite(standard());
  store.addSite(standard({ id: ID2, title: 'Far future', startsAt: '2030-06-01T14:00:00Z', endsAt: '2030-06-01T15:00:00Z' }));
  await run(store, google);
  // The list omits both (outside the window / eventual consistency) but a direct lookup still finds the first.
  const realList = google.listWindow.bind(google);
  google.listWindow = async (a, b) => (await realList(a, b)).filter((e) => e.id !== googleIdForSiteEvent(ID1) && e.id !== googleIdForSiteEvent(ID2));
  const result = await run(store, google);
  assert.equal(result.fromGoogle.deleted, 0);
  assert.deepEqual(store.titles(), ['Far future', 'Staff meeting']);
});

test('working hours follow the website, one way, and cost nothing while unchanged', async () => {
  const store = new FakeStore(); const google = new FakeGoogle();
  store.hours = [{ id: '9b8a7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d', dayOfWeek: 2, startTime: '09:00:00', endTime: '17:00:00', label: 'In the office' }];
  await run(store, google);
  assert.equal(google.live().filter((e) => e.recurrence).length, 1);
  google.resetCalls();
  await run(store, google);
  assert.deepEqual(google.writes(), []);
  store.hours = [{ ...store.hours[0], label: 'Counselling' }];
  await run(store, google);
  assert.match([...google.events.values()].find((e) => e.recurrence).summary, /Counselling/);
  store.hours = [];
  await run(store, google);
  assert.equal(google.live().filter((e) => e.recurrence).length, 0);
  // Working hours are never imported back as ordinary entries.
  assert.equal(store.events.size, 0);
});

test('a recurring entry made in Google arrives as its separate occurrences, each editable on its own', async () => {
  const store = new FakeStore(); const google = new FakeGoogle();
  for (const [i, day] of ['12', '19', '26'].entries()) {
    google.userCreates({ id: `weekly_2026101${i}`, recurringEventId: 'weekly', summary: 'Prayer meeting', start: { dateTime: `2026-10-${day}T19:00:00-05:00` }, end: { dateTime: `2026-10-${day}T20:00:00-05:00` } });
  }
  await run(store, google);
  assert.equal(store.events.size, 3);
  google.userEdits('weekly_20261011', { summary: 'Prayer meeting (extended)' });
  await run(store, google);
  assert.deepEqual(store.titles(), ['Prayer meeting', 'Prayer meeting', 'Prayer meeting (extended)']);
});

test('a platform entry in Google whose website entry no longer exists is tidied away, but never one that still exists', async () => {
  const store = new FakeStore(); const google = new FakeGoogle();
  store.addSite(standard());
  await run(store, google);
  // Lose the link while the website entry is still there: it must be re-adopted, never deleted.
  store.links.clear();
  const readopted = await run(store, google);
  assert.equal(readopted.toGoogle.deleted, 0);
  assert.equal(google.live().length, 1);
  assert.equal(store.links.size, 1);
});
