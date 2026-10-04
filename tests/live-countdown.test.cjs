const { test } = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const cache = new Map();
function load(file) {
  const key = file.replace(/\.ts$/, '');
  if (cache.has(key)) return cache.get(key);
  const full = path.join(ROOT, key);
  const source = fs.readFileSync(`${full}.ts`, 'utf8');
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const mod = { exports: {} };
  cache.set(key, mod.exports);
  const localRequire = (name) => {
    if (name.startsWith('@/')) return load(name.slice(2));
    if (name.startsWith('./') || name.startsWith('../')) return load(path.relative(ROOT, path.join(path.dirname(full), name)));
    return require(name);
  };
  new Function('require', 'module', 'exports', output)(localRequire, mod, mod.exports);
  cache.set(key, mod.exports);
  return mod.exports;
}
const hubModule = load('lib/live/hub');
const { bootHub, connect, disconnect, handleEvents, isMediaInUse } = hubModule;
const state = load('lib/live/state');

const flushImmediates = () => new Promise((resolve) => setImmediate(resolve));

/** The countdown tables in the Games project, in memory. */
function fakeStore(seed = {}) {
  const calls = [];
  const settings = new Map(Object.entries(seed.settings ?? {}));
  let templates = seed.templates ?? [];
  let songs = seed.songs ?? [];
  const failing = new Set(seed.failing ?? []);
  const reads = { templates: 0 };
  const store = {
    calls,
    settings,
    reads,
    async getSetting(key) { if (failing.has(`setting:${key}`)) throw new Error('down'); return settings.has(key) ? settings.get(key) : undefined; },
    async setSetting(key, value) { calls.push(['setSetting', key]); settings.set(key, structuredClone(value)); },
    async loadTemplates() { reads.templates++; if (failing.has('templates')) throw new Error('down'); return structuredClone(templates); },
    async saveTemplate(t) { calls.push(['saveTemplate', t.id]); templates = templates.filter((x) => x.id !== t.id).concat(structuredClone(t)); },
    async deleteTemplate(id) { calls.push(['deleteTemplate', id]); templates = templates.filter((x) => x.id !== id); },
    async loadSongs() { if (failing.has('songs')) throw new Error('down'); return structuredClone(songs); },
    async saveSong(s) { calls.push(['saveSong', s.id]); songs = songs.filter((x) => x.id !== s.id).concat(structuredClone(s)); },
    async deleteSong(id) { calls.push(['deleteSong', id]); songs = songs.filter((x) => x.id !== id); },
    async listLibrary() { return []; },
    async uploadToLibrary() { throw new Error('not in tests'); },
    async deleteFromLibrary() {},
  };
  return store;
}

/** A connected screen or control panel that records what it was sent. */
function client(hub, role, isAdmin = false) {
  const received = [];
  let alive = true;
  const c = connect(hub, role, isAdmin, (event, data) => {
    if (!alive) return false;
    received.push([event, structuredClone(data)]);
    return true;
  });
  return {
    id: c.id,
    received,
    events: (name) => received.filter(([e]) => e === name).map(([, d]) => d),
    last: (name) => received.filter(([e]) => e === name).map(([, d]) => d).at(-1),
    clear: () => { received.length = 0; },
    goAway: () => { alive = false; },
  };
}

test('starts from the built-in templates when no storage is configured', async () => {
  const hub = await bootHub(null);
  assert.deepEqual(hub.templates.map((t) => t.id), ['sunday_service', 'prayer_meeting']);
  assert.equal(hub.state.forcedState, 'idle');
  assert.equal(hub.state.activeEvent, null);
});

test('loads templates, songs and settings saved by the old server', async () => {
  const store = fakeStore({
    templates: [{ id: 'youth', name: 'Youth Night' }],
    songs: [{ id: 's2', title: 'Way Maker', artist: '', rawInput: 'x' }, { id: 's1', title: 'Amazing Grace', artist: '', rawInput: 'y' }],
    settings: {
      backgroundMedia: { url: 'https://x.supabase.co/storage/v1/object/public/countdown-media/backgrounds/a.mp4', kind: 'video', name: 'a', path: 'backgrounds/a.mp4' },
      musicTrack: { url: 'javascript:alert(1)', name: 'bad', path: 'audio/x' },
      textOverlay: { visible: true, text: 'old shape' },
    },
  });
  const hub = await bootHub(store);
  assert.deepEqual(hub.templates.map((t) => t.id), ['youth']);
  assert.deepEqual(hub.songs.map((s) => s.title), ['Amazing Grace', 'Way Maker']);
  assert.equal(hub.state.backgroundMedia.path, 'backgrounds/a.mp4');
  assert.equal(hub.state.musicTrack, null, 'a non-http(s) media address is not restored');
  assert.equal(hub.state.textOverlay.visible, true);
  assert.deepEqual(hub.state.textOverlay.segments, []);
  assert.equal(hub.state.textOverlay.style.fontFamily, 'heading');
  assert.deepEqual(store.calls, [], 'nothing is written at start-up when templates exist');
});

test('a failed template read is not mistaken for "no templates" (no defaults written over saved ones)', async () => {
  const store = fakeStore({ failing: ['templates'] });
  const hub = await bootHub(store);
  assert.equal(store.reads.templates, 3, 'retried before giving up');
  assert.deepEqual(hub.templates.map((t) => t.id), ['sunday_service', 'prayer_meeting']);
  assert.deepEqual(store.calls.filter(([c]) => c === 'saveTemplate'), []);
});

test('an empty template table is seeded with the defaults, as before', async () => {
  const store = fakeStore();
  await bootHub(store);
  await flushImmediates();
  assert.deepEqual(store.calls.filter(([c]) => c === 'saveTemplate').map(([, id]) => id), ['sunday_service', 'prayer_meeting']);
});

test('a countdown in progress survives a restart of the website', async () => {
  const startTime = new Date(Date.now() + 15 * 60000).toISOString();
  const store = fakeStore({
    settings: {
      countdownState: { activeEvent: { id: 'sunday_service', name: 'Sunday Service' }, forcedState: 'pre', startTime, isLive: true, music: { playing: true, volume: 0.4, loop: false } },
    },
  });
  const hub = await bootHub(store);
  assert.equal(hub.state.activeEvent.name, 'Sunday Service');
  assert.equal(hub.state.forcedState, 'pre');
  assert.equal(hub.state.startTime, startTime);
  assert.equal(hub.state.isLive, true);
  assert.deepEqual(hub.state.music, { playing: true, volume: 0.4, loop: false });
});

test('an outro still playing at restart is resumed; a finished one is not', async () => {
  const now = Date.now();
  const playing = { type: 'OUTRO', startedAt: now - 1000, durationMs: 273000, endsAt: now + 272000, media: { kind: 'audio', src: '/x.mp3' }, overlays: [], returnTo: 'IDLE' };
  const hub = await bootHub(fakeStore({ settings: { sanctuaryOverride: playing } }));
  assert.equal(hub.state.sanctuaryOverride.endsAt, playing.endsAt);
  clearTimeout(hub.outroTimer);
  const finished = await bootHub(fakeStore({ settings: { sanctuaryOverride: { ...playing, endsAt: now - 1 } } }));
  assert.equal(finished.state.sanctuaryOverride, null);
});

test('each kind of screen gets what a new Socket.IO client used to get', async () => {
  const hub = await bootHub(null);
  hub.state.sanctuaryOverride = { type: 'OUTRO', endsAt: Date.now() + 1000 };
  const tv = client(hub, 'sanctuary');
  const obs = client(hub, 'overlay');
  const panel = client(hub, 'admin', true);
  assert.deepEqual(tv.received.map(([e]) => e), ['hello', 'stateSync', 'templatesSync', 'sanctuaryOverride']);
  assert.deepEqual(obs.received.map(([e]) => e), ['hello', 'stateSync', 'templatesSync']);
  assert.deepEqual(panel.received.map(([e]) => e), ['hello', 'stateSync', 'templatesSync', 'songLibrarySync', 'sanctuaryOverride']);
  assert.equal(tv.received[0][1].id, tv.id);
  await flushImmediates();
  assert.equal(panel.last('sanctuaryCount'), 1, 'the control panel sees how many TVs are connected');
  disconnect(hub, tv.id);
  await flushImmediates();
  assert.equal(panel.last('sanctuaryCount'), 0);
});

test('only a connection opened by a signed-in admin can change anything', async () => {
  const hub = await bootHub(null);
  const tv = client(hub, 'sanctuary');
  const obs = client(hub, 'overlay');
  const startTime = new Date(Date.now() + 600000).toISOString();
  for (const intruder of [tv, obs]) {
    handleEvents(hub, intruder.id, [{ event: 'setEvent', data: { templateId: 'sunday_service', startTime, isLive: true } }, { event: 'forceState', data: 'live' }, { event: 'startOutro' }]);
  }
  assert.equal(hub.state.activeEvent, null);
  assert.equal(hub.state.forcedState, 'idle');
  assert.equal(hub.state.sanctuaryOverride, null);

  const panel = client(hub, 'admin', true);
  tv.clear();
  assert.equal(handleEvents(hub, panel.id, [{ event: 'setEvent', data: { templateId: 'prayer_meeting', startTime, isLive: true } }]), 'ok');
  assert.equal(hub.state.activeEvent.name, 'Prayer Meeting');
  assert.equal(hub.state.forcedState, 'pre');
  assert.equal(hub.state.startTime, startTime);
  assert.equal(tv.last('stateSync').activeEvent.name, 'Prayer Meeting', 'every screen is told');
  assert.equal(obs.last('stateSync').activeEvent.name, 'Prayer Meeting');
  clearTimeout(hub.saveTimer);
});

test('a connection the server does not know (it restarted) is told to reconnect', async () => {
  const hub = await bootHub(null);
  assert.equal(handleEvents(hub, 'gone', [{ event: 'forceState', data: 'live' }]), 'unknown-client');
});

test('events in one batch apply in the order they were sent', async () => {
  const hub = await bootHub(null);
  const panel = client(hub, 'admin', true);
  handleEvents(hub, panel.id, [0.2, 0.5, 0.9].map((volume) => ({ event: 'musicControl', data: { volume } })));
  assert.equal(hub.state.music.volume, 0.9);
  handleEvents(hub, panel.id, [{ event: 'musicControl', data: { volume: 7 } }]);
  assert.equal(hub.state.music.volume, 1, 'volume is clamped');
  clearTimeout(hub.saveTimer);
});

test('delay, forced state and one-time events', async () => {
  const hub = await bootHub(null);
  const panel = client(hub, 'admin', true);
  const start = new Date('2026-10-04T14:50:00.000Z');
  handleEvents(hub, panel.id, [
    { event: 'setEvent', data: { isOneTime: true, oneTimeData: { name: 'Harvest', id: 'ignored' }, startTime: start.toISOString(), isLive: false } },
    { event: 'addDelay', data: 5 },
    { event: 'forceState', data: 'delayed' },
    { event: 'forceState', data: 'party' },
    { event: 'setEvent', data: { templateId: 'sunday_service', startTime: 'not a date' } },
  ]);
  assert.equal(hub.state.activeEvent.name, 'Harvest');
  assert.equal(hub.state.activeEvent.id, 'one_time_custom');
  assert.equal(hub.state.startTime, '2026-10-04T14:55:00.000Z');
  assert.equal(hub.state.forcedState, 'delayed', 'unknown states are ignored');
  clearTimeout(hub.saveTimer);
});

test('the countdown is saved a moment after it changes, once', async () => {
  const store = fakeStore({ templates: [{ id: 't', name: 'T' }] });
  const hub = await bootHub(store);
  const panel = client(hub, 'admin', true);
  for (const volume of [0.1, 0.2, 0.3]) handleEvents(hub, panel.id, [{ event: 'musicControl', data: { volume } }]);
  assert.deepEqual(store.calls, []);
  await new Promise((resolve) => setTimeout(resolve, 1100));
  assert.deepEqual(store.calls, [['setSetting', 'countdownState']]);
  assert.equal(store.settings.get('countdownState').music.volume, 0.3);
  assert.equal('restartPulse' in store.settings.get('countdownState').music, false);
});

test('lyrics overlay: patches, clamped verse, and only allowed styles', async () => {
  const hub = await bootHub(null);
  const panel = client(hub, 'admin', true);
  handleEvents(hub, panel.id, [
    { event: 'updateTextOverlay', data: { rawInput: 'v1\n\nv2', segments: [{ label: 'Verse 1', text: 'v1' }, { label: 'Verse 2', text: 'v2' }, { label: 'Empty', text: '' }], currentIndex: 0, songTitle: 'Song' } },
    { event: 'updateTextOverlay', data: { currentIndex: 9 } },
    { event: 'updateTextOverlay', data: { style: { textColor: 'red; background:url(x)', fontSize: 3, fontFamily: 'script', align: 'justify' } } },
  ]);
  const to = hub.state.textOverlay;
  assert.equal(to.segments.length, 2);
  assert.equal(to.currentIndex, 1);
  assert.equal(to.style.textColor, '#f8f9fa');
  assert.equal(to.style.fontSize, 3);
  assert.equal(to.style.fontFamily, 'script');
  assert.equal(to.style.align, 'center');
});

test('the outro reaches TVs and the control panel only, and ends once', async () => {
  const hub = await bootHub(null);
  const tv = client(hub, 'sanctuary');
  const obs = client(hub, 'overlay');
  const panel = client(hub, 'admin', true);
  handleEvents(hub, panel.id, [{ event: 'startOutro' }]);
  const outro = tv.last('sanctuaryOverride');
  assert.equal(outro.type, 'OUTRO');
  assert.equal(outro.durationMs, 273000);
  assert.equal(outro.media.src, '/tools/live/media/Go%20in%20Peace.mp3');
  assert.equal(panel.events('sanctuaryOverride').length, 1);
  assert.equal(obs.events('sanctuaryOverride').length, 0);

  const startedAt = hub.state.sanctuaryOverride.startedAt;
  handleEvents(hub, panel.id, [{ event: 'startOutro' }]);
  assert.equal(hub.state.sanctuaryOverride.startedAt, startedAt, 'a second start is ignored');

  handleEvents(hub, obs.id, [{ event: 'sanctuaryOutroEnded' }]);
  assert.ok(hub.state.sanctuaryOverride, 'an OBS overlay cannot end it');
  handleEvents(hub, tv.id, [{ event: 'sanctuaryOutroEnded' }]);
  assert.equal(hub.state.sanctuaryOverride, null);
  assert.equal(hub.outroTimer, null);
  assert.equal(tv.events('sanctuaryOverrideClear').length, 1);
  assert.equal(panel.events('sanctuaryOverrideClear').length, 1);
  assert.equal(obs.events('sanctuaryOverrideClear').length, 0);
});

test('a TV whose audio was blocked is reported to the control panel', async () => {
  const hub = await bootHub(null);
  const tv = client(hub, 'sanctuary');
  const panel = client(hub, 'admin', true);
  handleEvents(hub, tv.id, [{ event: 'audioBlocked', data: { reason: 'NotAllowedError', extra: '<b>x</b>' } }]);
  assert.deepEqual(panel.last('audioBlocked'), { socketId: tv.id, reason: 'NotAllowedError' });
});

test('song library and templates', async () => {
  const store = fakeStore({ templates: [{ id: 'a', name: 'A' }] });
  const hub = await bootHub(store);
  const tv = client(hub, 'sanctuary');
  const panel = client(hub, 'admin', true);
  handleEvents(hub, panel.id, [
    { event: 'saveSong', data: { title: '  Zion  ', artist: 'Choir', rawInput: 'words' } },
    { event: 'saveSong', data: { title: 'Abide', rawInput: 'more words' } },
    { event: 'saveSong', data: { title: '', rawInput: 'no title' } },
  ]);
  assert.deepEqual(hub.songs.map((s) => s.title), ['Abide', 'Zion']);
  assert.equal(tv.events('songLibrarySync').length, 0, 'the song library is not sent to screens');
  assert.deepEqual(panel.last('songLibrarySync').map((s) => s.title), ['Abide', 'Zion']);
  const zion = hub.songs.find((s) => s.title === 'Zion');
  handleEvents(hub, panel.id, [{ event: 'saveSong', data: { id: zion.id, title: 'Zion (live)', rawInput: 'words' } }, { event: 'deleteSong', data: hub.songs[0].id }]);
  assert.deepEqual(hub.songs.map((s) => [s.id, s.title]), [[zion.id, 'Zion (live)']]);

  handleEvents(hub, panel.id, [{ event: 'saveTemplate', data: { name: 'Watchnight' } }, { event: 'saveTemplate', data: { id: 'a', name: 'A2' } }]);
  assert.deepEqual(hub.templates.map((t) => t.name), ['A2', 'Watchnight']);
  assert.match(hub.templates[1].id, /^tpl_\d+$/);
  handleEvents(hub, panel.id, [{ event: 'deleteTemplate', data: 'a' }]);
  assert.deepEqual(tv.last('templatesSync').map((t) => t.name), ['Watchnight']);
  await flushImmediates();
  assert.deepEqual(store.calls.map(([c]) => c), ['saveSong', 'saveSong', 'saveSong', 'deleteSong', 'saveTemplate', 'saveTemplate', 'deleteTemplate']);
});

test('media selection: only real addresses, and the one in use cannot be deleted', async () => {
  const hub = await bootHub(null);
  const panel = client(hub, 'admin', true);
  handleEvents(hub, panel.id, [
    { event: 'selectBackgroundMedia', data: { url: 'javascript:alert(1)', kind: 'video', name: 'x', path: 'backgrounds/x' } },
    { event: 'selectMusicTrack', data: { url: 'https://cdn.example/audio/hymn.mp3', name: 'Hymn', path: 'audio/hymn.mp3' } },
  ]);
  assert.equal(hub.state.backgroundMedia, null);
  assert.equal(hub.state.musicTrack.name, 'Hymn');
  assert.equal(isMediaInUse(hub, 'audio/hymn.mp3'), true);
  assert.equal(isMediaInUse(hub, 'audio/other.mp3'), false);
});

test('a screen that went away is dropped on the next broadcast', async () => {
  const hub = await bootHub(null);
  const tv = client(hub, 'sanctuary');
  const panel = client(hub, 'admin', true);
  tv.goAway();
  handleEvents(hub, panel.id, [{ event: 'forceState', data: 'live' }]);
  assert.equal(hub.clients.has(tv.id), false);
  assert.equal(hub.clients.has(panel.id), true);
  clearTimeout(hub.saveTimer);
});

test('saved text overlay from an older version is upgraded safely', () => {
  const current = state.initialLiveState().textOverlay;
  const restored = state.restoreTextOverlay({ visible: true, segments: [{ text: 'a' }, { label: 5, text: 'b' }], currentIndex: 1, style: { position: 'top', letterSpacing: 9 } }, current);
  assert.deepEqual(restored.segments, [{ label: 'Part', text: 'a' }, { label: 'Part', text: 'b' }]);
  assert.equal(restored.style.position, 'top');
  assert.equal(restored.style.letterSpacing, 0);
  assert.equal(state.restoreTextOverlay(null, current), current);
});

// ---------------------------------------------------------------------------
// public/tools/live/live-socket.js: the io() the old pages call, in a fake browser
// ---------------------------------------------------------------------------

function fakeBrowser() {
  const sources = [];
  const posts = [];
  class FakeEventSource {
    constructor(url) { this.url = url; this.readyState = 0; this.listeners = {}; this.closed = false; sources.push(this); }
    addEventListener(name, fn) { (this.listeners[name] = this.listeners[name] || []).push(fn); }
    close() { this.closed = true; this.readyState = 2; }
    deliver(name, data) { for (const fn of this.listeners[name] || []) fn({ data: JSON.stringify(data) }); }
    fail(readyState) { this.readyState = readyState; this.onerror?.(); }
  }
  const pending = [];
  const fetch = (url, init) => new Promise((resolve, reject) => {
    const body = JSON.parse(init.body);
    posts.push(body);
    pending.push({ body, reply: (status) => resolve({ status }), drop: () => reject(new TypeError('network')) });
  });
  const timers = [];
  const context = {
    window: {},
    EventSource: FakeEventSource,
    fetch,
    console,
    setTimeout: (fn, ms) => { timers.push({ fn, ms }); return timers.length; },
    encodeURIComponent,
    JSON,
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'public/tools/live/live-socket.js'), 'utf8'), context);
  const runTimers = () => { while (timers.length) timers.shift().fn(); };
  return { io: context.window.io, sources, posts, pending, runTimers };
}
const settle = () => new Promise((resolve) => setImmediate(resolve));

test('live-socket: connects with its role and passes server events to the page', () => {
  const b = fakeBrowser();
  const socket = b.io({ query: { role: 'overlay' } });
  const seen = [];
  socket.on('connect', () => seen.push('connect'));
  socket.on('stateSync', (s) => seen.push(['stateSync', s.forcedState]));
  assert.equal(b.sources[0].url, '/tools/live/api/stream?role=overlay');
  b.sources[0].deliver('hello', { id: 'c1' });
  b.sources[0].deliver('stateSync', { forcedState: 'pre' });
  assert.deepEqual(seen, ['connect', ['stateSync', 'pre']]);
  assert.equal(socket.connected, true);
});

test('live-socket: emits wait for the connection, go in order, one request at a time', async () => {
  const b = fakeBrowser();
  const socket = b.io({ query: { role: 'admin' } });
  socket.emit('forceState', 'pre');
  assert.equal(b.posts.length, 0, 'nothing sent before connecting');
  b.sources[0].deliver('hello', { id: 'c1' });
  assert.deepEqual(b.posts[0], { clientId: 'c1', events: [{ event: 'forceState', data: 'pre' }] });
  socket.emit('musicControl', { volume: 0.2 });
  socket.emit('musicControl', { volume: 0.7 });
  socket.emit('musicRestart');
  assert.equal(b.posts.length, 1, 'waits for the first request');
  b.pending.shift().reply(200);
  await settle();
  assert.deepEqual(b.posts[1].events, [
    { event: 'musicControl', data: { volume: 0.2 } },
    { event: 'musicControl', data: { volume: 0.7 } },
    { event: 'musicRestart', data: null },
  ]);
});

test('live-socket: after a server restart (409) it reconnects and sends the same events again', async () => {
  const b = fakeBrowser();
  const socket = b.io({ query: { role: 'admin' } });
  const seen = [];
  socket.on('disconnect', () => seen.push('disconnect'));
  socket.on('connect', () => seen.push('connect'));
  b.sources[0].deliver('hello', { id: 'old' });
  socket.emit('addDelay', 5);
  b.pending.shift().reply(409);
  await settle();
  assert.equal(b.sources[0].closed, true);
  b.runTimers();
  assert.equal(b.sources.length, 2, 'reconnected');
  b.sources[1].deliver('hello', { id: 'new' });
  assert.deepEqual(b.posts[1], { clientId: 'new', events: [{ event: 'addDelay', data: 5 }] });
  assert.deepEqual(seen, ['connect', 'disconnect', 'connect']);
});

test('live-socket: a dropped request is not resent (it may have arrived), like Socket.IO', async () => {
  const b = fakeBrowser();
  const socket = b.io({ query: { role: 'admin' } });
  b.sources[0].deliver('hello', { id: 'c1' });
  socket.emit('addDelay', 5);
  b.pending.shift().drop();
  await settle();
  socket.emit('addDelay', 1);
  assert.deepEqual(b.posts.map((p) => p.events[0].data), [5, 1]);
});

test('live-socket: sign-in expired stops reconnecting and tells the page', () => {
  const b = fakeBrowser();
  const socket = b.io({ query: { role: 'admin' } });
  let authError = 0;
  socket.on('authError', () => authError++);
  b.sources[0].deliver('authError', 'Please sign in');
  assert.equal(authError, 1);
  assert.equal(b.sources[0].closed, true);
  b.sources[0].fail(2);
  b.runTimers();
  assert.equal(b.sources.length, 1, 'no reconnect after an auth error');
});

test('live-socket: keeps trying when the browser gives up on the stream (site redeploying)', () => {
  const b = fakeBrowser();
  b.io({ query: { role: 'sanctuary' } });
  b.sources[0].fail(0);
  b.runTimers();
  assert.equal(b.sources.length, 1, 'the browser retries a dropped stream itself');
  b.sources[0].fail(2);
  b.runTimers();
  assert.equal(b.sources.length, 2);
  assert.equal(b.sources[1].url, '/tools/live/api/stream?role=sanctuary');
});
