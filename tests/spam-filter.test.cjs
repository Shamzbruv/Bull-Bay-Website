const { test } = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
const path = require('node:path');
// Resolves the project's "@/..." alias by transpiling and caching the real
// file, so a module under test runs against its actual dependencies rather
// than a stub that can drift away from them.
const cache = new Map();
function load(file) {
  if (cache.has(file)) return cache.get(file);
  const full = path.join(__dirname, '..', file);
  const source = fs.readFileSync(fs.existsSync(full) ? full : `${full}.ts`, 'utf8');
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React } }).outputText;
  const mod = { exports: {} };
  cache.set(file, mod.exports);
  const localRequire = (name) => (name.startsWith('@/') ? load(name.slice(2)) : require(name));
  new Function('require', 'module', 'exports', output)(localRequire, mod, mod.exports);
  cache.set(file, mod.exports);
  return mod.exports;
}
const { scoreSubmission, checkFormShield, HONEYPOT_FIELD, TIMESTAMP_FIELD } = load('lib/spam.ts');

// Verbatim from the church's own Visitor Follow-up screen.
const REAL_SPAM = [
  { firstName:'Jackson', lastName:'Vonwiller', email:'gemma.marshall112@gmail.com', phone:'9614686610', interest:'Joining a ministry',
    message:"Hi, We run an Instagram service, where we can increase your followers both safely and effectively. We don't use bots – everything is done manually to attract real, targeted followers who care about your content. The result? Increased brand awareness, higher engagement, and ultimately, more customers. The price is just $60 (USD) per month. You can find out more information here: http://instagrow.business/ If you are interested just complete the form on the above page. If you are not interested, no problem, just ignore this email. Kind Regards, Jackson" },
  { firstName:'Hello http://bullbayntcog.org/fekal0911', lastName:'Webmaster Vance', email:'pirduhina96@gmail.com', phone:'7816698105', interest:'General question',
    message:'Hello http://bullbayntcog.org/fekal0911 Owner' },
  { firstName:'Joanna', lastName:'Riggs', email:'joannariggs3@gmail.com', phone:'913044881', interest:'General question',
    message:"Hi, I just visited bullbayntcog.org and wondered if you'd ever thought about having an engaging video to explain what you do? Our prices start from just $195 (USD). Let me know if you're interested in seeing samples of our previous work. Regards, Joanna" },
  { firstName:'Aman', lastName:'Katiyar', email:'aman@rocketdigitaltech.com', phone:'571548322', interest:'Becoming a member',
    message:"Hello http://bullbayntcog.org, I hope you're doing well. I came across your business online and thought you might be interested in improving your visibility and traffic on search engines. We specialize in helping businesses strengthen their online presence through effective SEO strategies. Once you share your target keywords and target market, I'll send a full proposal. Warm regards, Aman" },
  { firstName:'Abdul', lastName:'Mobsby', email:'domains@search-bullbayntcog.org', phone:'3798642311', interest:'General question',
    message:"Hey Register bullbayntcog.org in Google's Search Index so it can be displayed in online search results! Add bullbayntcog.org today: indexhelp.pro" },
];

// Messages the church must never lose.
const GENUINE = [
  { firstName:'Marcia', lastName:'Brown', email:'marcia.brown@gmail.com', phone:'8765551234', interest:'Planning a first visit',
    message:"Good day, my family and I are moving to Bull Bay next month and would love to visit on Sunday. What time does service start?" },
  { firstName:'Devon', lastName:'Campbell', email:'devon@yahoo.com', interest:'Becoming a member',
    message:"I have been attending for about six months now and I would like to become a member. Please let me know the next steps. Kind regards, Devon" },
  { firstName:'Sister', lastName:'Thompson', email:'sthompson@flowmail.com', interest:'Joining a ministry',
    message:"I would like to join the choir. I sang with my previous church for 12 years." },
  { firstName:'Andre', lastName:'Grant', email:'andre.grant@hotmail.com', interest:'Prayer request',
    message:"Please pray for my mother, she is in hospital." },
  { firstName:'Kemar', lastName:'Reid', email:'kemar@gmail.com', interest:'General question',
    message:"Hi, I saw the livestream on your website at bullbayntcog.org and wanted to ask if the sermon from last Sunday is posted anywhere? Thank you and God bless." },
  { firstName:'Paulette', lastName:'Service', email:'paulette@gmail.com', interest:'General question',
    message:"Do you offer transport services for elderly members who cannot drive to church?" },
];

test('every real spam submission is blocked', () => {
  for (const s of REAL_SPAM) {
    const result = scoreSubmission(s);
    assert.equal(result.verdict, 'spam', `${s.firstName} ${s.lastName} scored ${result.score}: ${result.reasons.join('; ')}`);
  }
});

test('genuine enquiries are never blocked', () => {
  for (const s of GENUINE) {
    const result = scoreSubmission(s);
    assert.notEqual(result.verdict, 'spam', `${s.firstName} ${s.lastName} scored ${result.score}: ${result.reasons.join('; ')}`);
  }
});

test('honeypot catches an automated fill, empty honeypot passes', () => {
  const trapped = new FormData();
  trapped.set(HONEYPOT_FIELD, 'http://spam.example');
  assert.equal(checkFormShield(trapped).blocked, true);

  const human = new FormData();
  human.set(HONEYPOT_FIELD, '');
  assert.equal(checkFormShield(human).blocked, false);
});

test('a form filled faster than a human can type is blocked, a missing stamp is not', () => {
  const instant = new FormData();
  instant.set(TIMESTAMP_FIELD, String(Date.now() - 200));
  assert.equal(checkFormShield(instant).blocked, true);

  const considered = new FormData();
  considered.set(TIMESTAMP_FIELD, String(Date.now() - 30_000));
  assert.equal(checkFormShield(considered).blocked, false);

  // Someone browsing with JavaScript disabled still gets through.
  assert.equal(checkFormShield(new FormData()).blocked, false);
});

const { toIsoTime, openingHours } = load('lib/seo.ts');

test('service times convert to 24-hour schema times, or are dropped', () => {
  assert.equal(toIsoTime('9:50 AM'), '09:50');
  assert.equal(toIsoTime('4:30 PM'), '16:30');
  assert.equal(toIsoTime('12:00 AM'), '00:00');
  assert.equal(toIsoTime('12:15 PM'), '12:15');
  assert.equal(toIsoTime('11:05 pm'), '23:05');
  // Anything unexpected is dropped rather than guessed — publishing a wrong
  // service time to Google is worse than publishing none.
  for (const bad of ['', 'Sunday', '25:00 AM', '9:50', 'noon', '0:30 PM']) assert.equal(toIsoTime(bad), null, bad);
});

test('opening hours close after the service and skip unparseable rows', () => {
  const hours = openingHours([
    { day: 'Sunday', time: '9:50 AM', label: 'Sunday Worship Service' },
    { day: 'Friday', time: '4:30 PM', label: 'Teens Fellowship' },
    { day: 'Someday', time: '9:00 AM', label: 'Not a real day' },
    { day: 'Wednesday', time: 'whenever', label: 'Unparseable time' },
  ]);
  assert.equal(hours.length, 2);
  assert.equal(hours[0].dayOfWeek, 'https://schema.org/Sunday');
  assert.equal(hours[0].opens, '09:50');
  assert.equal(hours[0].closes, '11:20');
  assert.equal(hours[1].closes, '18:00');
});

const { fullName, greetingName, UNKNOWN_NAME_GREETING } = load('lib/members/name.ts');

test('fullName joins first and last name, and is empty (not a placeholder) when both are missing', () => {
  assert.equal(fullName({ first_name: 'Kevin', last_name: 'Page' }), 'Kevin Page');
  assert.equal(fullName({ first_name: 'Kevin', last_name: null }), 'Kevin');
  assert.equal(fullName({ first_name: null, last_name: null }), '');
  assert.equal(fullName(null), '');
  assert.equal(fullName(undefined), '');
});

test('greetingName never renders blank or the literal placeholder "there"', () => {
  // The exact shape of a brand-new invite: no existing profile at all —
  // this was the "Dear there," bug, since it always hit the `?? "there"`
  // fallback that used to sit at every one of these call sites.
  assert.equal(greetingName(null), UNKNOWN_NAME_GREETING);
  assert.equal(greetingName(undefined), UNKNOWN_NAME_GREETING);
  // A profile that exists but has no name on file — the empty-string case
  // that `fields[key] ?? fallback` could never catch, because an empty
  // string is a value, not a missing one.
  assert.equal(greetingName({ first_name: '', last_name: '' }), UNKNOWN_NAME_GREETING);
  assert.equal(greetingName({ first_name: null, last_name: null }), UNKNOWN_NAME_GREETING);
  // The ordinary case: first name only, informal.
  assert.equal(greetingName({ first_name: 'Kevin', last_name: 'Page' }), 'Kevin');
  assert.equal(greetingName({ first_name: '  ', last_name: 'Page' }), 'Page');
});

test('a template merge fills an empty-string field rather than leaving the placeholder, which is exactly how "Dear ," reached an inbox', () => {
  // Reproduces the underlying mechanism in lib/office/email.ts: fillText's
  // `fields[key] ?? fallback` treats an empty string as present, so a
  // blank name was substituted silently instead of failing loudly.
  const fillText = (text, fields) => text.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => fields[key] ?? `{{${key}}}`);
  assert.equal(fillText('Dear {{recipient_name}},', { recipient_name: '' }), 'Dear ,');
  // With greetingName's fallback applied before the field is ever built,
  // that empty string can no longer occur.
  assert.equal(fillText('Dear {{recipient_name}},', { recipient_name: greetingName(null) }), 'Dear Church family,');
});
