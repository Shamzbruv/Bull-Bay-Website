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
const { googleRestApi, GoogleApiError } = load('lib/calendar/google-api');

/** A stand-in for fetch that answers from a queue and records every request. */
function fakeFetch(...responses) {
  const requests = [];
  const impl = async (url, init = {}) => {
    requests.push({ url: new URL(url), method: init.method ?? 'GET', body: init.body ? JSON.parse(init.body) : undefined, auth: init.headers?.Authorization });
    const next = responses.shift();
    if (!next) throw new Error('unexpected extra request');
    return new Response(next.body === undefined ? null : JSON.stringify(next.body), { status: next.status ?? 200, headers: next.headers ?? {} });
  };
  return { impl, requests };
}

test('listing a window asks Google for expanded occurrences including deleted ones, and follows every page', async () => {
  const f = fakeFetch({ body: { items: [{ id: 'a' }], nextPageToken: 'p2' } }, { body: { items: [{ id: 'b' }] } });
  const api = googleRestApi('church@group.calendar.google.com', 'tok', f.impl);
  const events = await api.listWindow('2026-07-01T00:00:00Z', '2027-11-01T00:00:00Z');
  assert.deepEqual(events.map((e) => e.id), ['a', 'b']);
  const first = f.requests[0].url;
  assert.equal(first.pathname, '/calendar/v3/calendars/church%40group.calendar.google.com/events');
  assert.equal(first.searchParams.get('singleEvents'), 'true');
  assert.equal(first.searchParams.get('showDeleted'), 'true');
  assert.equal(first.searchParams.get('timeMin'), '2026-07-01T00:00:00Z');
  assert.equal(f.requests[1].url.searchParams.get('pageToken'), 'p2');
  assert.equal(f.requests[0].auth, 'Bearer tok');
});

test('the platform\'s own entries are found by their marker, as single master entries', async () => {
  const f = fakeFetch({ body: { items: [] } });
  await googleRestApi('c', 't', f.impl).listManaged();
  const q = f.requests[0].url.searchParams;
  assert.equal(q.get('privateExtendedProperty'), 'church_managed=yes');
  assert.equal(q.get('singleEvents'), 'false');
});

test('only the fields the sync reads are requested', async () => {
  const f = fakeFetch({ body: { items: [] } });
  await googleRestApi('c', 't', f.impl).listWindow('a', 'b');
  const fields = f.requests[0].url.searchParams.get('fields');
  for (const needed of ['id', 'status', 'summary', 'location', 'start', 'end', 'updated', 'visibility', 'hangoutLink', 'recurringEventId', 'extendedProperties/private']) assert.ok(fields.includes(needed), needed);
  assert.equal(fields.includes('attendees'), false);
});

test('a missing entry reads as null, so "deleted in Google" can be told from a failure', async () => {
  const gone = fakeFetch({ status: 404, body: { error: { message: 'Not Found' } } });
  assert.equal(await googleRestApi('c', 't', gone.impl).get('x'), null);
  const deleted = fakeFetch({ status: 410, body: {} });
  assert.equal(await googleRestApi('c', 't', deleted.impl).get('x'), null);
  const broken = fakeFetch({ status: 403, body: { error: { message: 'Forbidden' } } });
  await assert.rejects(() => googleRestApi('c', 't', broken.impl).get('x'), (e) => e instanceof GoogleApiError && e.status === 403 && /Reconnect/.test(e.message));
});

test('creating sends a POST, changing sends a PATCH with only the given fields, and replacing sends a PUT', async () => {
  const f = fakeFetch({ body: { id: 'n' } }, { body: { id: 'n' } }, { body: { id: 'n' } });
  const api = googleRestApi('c', 't', f.impl);
  await api.insert({ id: 'n', summary: 'New' });
  await api.patch('n', { summary: 'Changed', location: null, description: 'd', start: { date: '2026-10-12' }, end: { date: '2026-10-13' }, visibility: 'default' });
  await api.replace('n', { id: 'n', summary: 'Whole' });
  assert.deepEqual(f.requests.map((r) => r.method), ['POST', 'PATCH', 'PUT']);
  assert.equal(f.requests[1].url.pathname.endsWith('/events/n'), true);
  assert.equal(f.requests[1].body.location, null);
  assert.equal('attendees' in f.requests[1].body, false);
});

test('an id that already exists comes back as a 409 the engine can recognise', async () => {
  const f = fakeFetch({ status: 409, body: { error: { message: 'The requested identifier already exists.' } } });
  await assert.rejects(() => googleRestApi('c', 't', f.impl).insert({ id: 'n' }), (e) => e instanceof GoogleApiError && e.status === 409);
});

test('deleting something already gone is not an error', async () => {
  const f = fakeFetch({ status: 410 }, { status: 404 }, { status: 204 });
  const api = googleRestApi('c', 't', f.impl);
  await api.remove('a'); await api.remove('b'); await api.remove('c');
  assert.equal(f.requests.length, 3);
});

test('a rate-limited or briefly failing request is retried, then succeeds', async () => {
  const f = fakeFetch({ status: 429, headers: { 'retry-after': '0' }, body: {} }, { status: 503, body: {} }, { body: { items: [{ id: 'ok' }] } });
  const events = await googleRestApi('c', 't', f.impl).listManaged();
  assert.deepEqual(events.map((e) => e.id), ['ok']);
  assert.equal(f.requests.length, 3);
});

test('a request that keeps failing gives up with a clear error rather than looping', async () => {
  const f = fakeFetch(...Array.from({ length: 4 }, () => ({ status: 500, headers: { 'retry-after': '0' }, body: { error: { message: 'Backend Error' } } })));
  await assert.rejects(() => googleRestApi('c', 't', f.impl).listManaged(), (e) => e instanceof GoogleApiError && e.status === 500 && /Backend Error/.test(e.message));
  assert.equal(f.requests.length, 4);
});
