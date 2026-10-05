const { test } = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const cache = new Map();
function load(file) {
  const key = file.replace(/\.tsx?$/, '');
  if (cache.has(key)) return cache.get(key);
  const full = path.join(ROOT, key);
  const source = fs.readFileSync(fs.existsSync(`${full}.ts`) ? `${full}.ts` : `${full}.tsx`, 'utf8');
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const mod = { exports: {} };
  cache.set(key, mod.exports);
  new Function('require', 'module', 'exports', output)((name) => (name.startsWith('@/') ? load(name.slice(2)) : require(name)), mod, mod.exports);
  cache.set(key, mod.exports);
  return mod.exports;
}
const { documentDelivery, readOutsideRecipient, urgentReasonFrom, recipientSummary } = load('lib/documents/delivery');
const { documentTitle, primaryRoleName } = load('lib/members/name');

const member = { first_name: 'Jane', last_name: 'Brown', email: 'jane@example.com' };
const form = (entries) => { const f = new FormData(); for (const [k, v] of Object.entries(entries)) f.append(k, v); return f; };

test('a document for a member goes to the member', () => {
  assert.deepEqual(documentDelivery({ requester_profile_id: 'm1', recipient_name: null, recipient_email: null }, member), {
    email: 'jane@example.com', greetingName: 'Jane Brown', nameOnDocument: 'Jane Brown', outside: false,
  });
});

test('a document for someone outside the church goes to the typed-in address', () => {
  assert.deepEqual(documentDelivery({ requester_profile_id: null, recipient_name: 'Rev. Paul Smith', recipient_email: 'paul@example.org' }, null), {
    email: 'paul@example.org', greetingName: 'Rev. Paul Smith', nameOnDocument: 'Rev. Paul Smith', outside: true,
  });
});

test('a letter about a member sent to a third party: emailed to them, the member named on it', () => {
  const d = documentDelivery({ requester_profile_id: 'm1', recipient_name: 'Canadian High Commission', recipient_email: 'visa@example.gc.ca' }, member);
  assert.equal(d.email, 'visa@example.gc.ca', 'never to the member when an outside address was given');
  assert.equal(d.greetingName, 'Canadian High Commission');
  assert.equal(d.nameOnDocument, 'Jane Brown');
  assert.equal(d.outside, true);
});

test('refuses rather than sending a signed document nowhere or with no name', () => {
  assert.throws(() => documentDelivery({ requester_profile_id: null, recipient_name: null, recipient_email: null }, null), /Choose who this document goes to/);
  assert.throws(() => documentDelivery({ requester_profile_id: 'm1', recipient_name: null, recipient_email: null }, { ...member, email: null }), /needs an email address/);
  assert.throws(() => documentDelivery({ requester_profile_id: 'm1', recipient_name: null, recipient_email: null }, { first_name: '', last_name: null, email: 'x@example.com' }), /no name on file/);
  assert.throws(() => documentDelivery({ requester_profile_id: null, recipient_name: '  ', recipient_email: 'a@b.co' }, null), /has no name/);
});

test('the typed-in recipient is checked', () => {
  assert.deepEqual(readOutsideRecipient(form({ outside_name: '  Ministry of Education ', outside_email: ' info@moe.gov.jm ', outside_address: '' })), {
    name: 'Ministry of Education', email: 'info@moe.gov.jm', address: null,
  });
  assert.equal(readOutsideRecipient(form({ outside_name: 'A', outside_email: 'a@b.co', outside_address: '1 Main St\nKingston' })).address, '1 Main St\nKingston');
  assert.throws(() => readOutsideRecipient(form({ outside_name: '', outside_email: 'a@b.co' })), /Enter the name/);
  assert.throws(() => readOutsideRecipient(form({ outside_name: 'A', outside_email: 'not an email' })), /valid email/);
  assert.equal(readOutsideRecipient(form({ outside_name: 'x'.repeat(300), outside_email: 'a@b.co' })).name.length, 200);
});

test('urgent needs a reason; not ticked means not urgent', () => {
  assert.equal(urgentReasonFrom(form({ urgent_reason: 'ignored without the box' })), null);
  assert.equal(urgentReasonFrom(form({ urgent: 'on', urgent_reason: '  Embassy deadline at 3 pm  ' })), 'Embassy deadline at 3 pm');
  assert.throws(() => urgentReasonFrom(form({ urgent: 'on', urgent_reason: '   ' })), /can't wait for the Pastor/);
});

test('office lists say who it is for and where it went', () => {
  assert.equal(recipientSummary({ requester_profile_id: 'm1', recipient_name: null, recipient_email: null }, member), 'Jane Brown');
  assert.equal(recipientSummary({ requester_profile_id: null, recipient_name: 'Rev. Paul Smith', recipient_email: 'p@x.org' }, null), 'Rev. Paul Smith (not a member)');
  assert.equal(recipientSummary({ requester_profile_id: 'm1', recipient_name: 'Embassy', recipient_email: 'e@x.org' }, member), 'Jane Brown, sent to Embassy');
  assert.equal(recipientSummary({ requester_profile_id: 'm1', recipient_name: null, recipient_email: null }, { first_name: null, last_name: null }), '(no name on file)');
});

test('the secretary signs documents as Admin Secretary; other roles keep their name', () => {
  assert.equal(documentTitle({ code: 'secretary', name: 'Admin Assistant' }), 'Admin Secretary');
  assert.equal(documentTitle({ code: 'church_executive', name: 'Executive Assistant' }), 'Executive Assistant');
  assert.equal(documentTitle(null), undefined);
});

test('primaryRoleName reads the role code so the document title can be chosen', async () => {
  const asked = [];
  const db = { from: (table) => { const q = { select: (cols) => { asked.push([table, cols]); return q; }, eq: () => q, limit: () => q, maybeSingle: async () => ({ data: { roles: { code: 'secretary', name: 'Admin Assistant' } } }) }; return q; } };
  assert.equal(await primaryRoleName(db, 'org', 'user'), 'Admin Secretary');
  assert.deepEqual(asked, [['user_roles', 'roles(code, name)']]);
});

test('a dedication certificate is presented to the child, while the parents get the email', () => {
  const { nameOnDocument } = load('lib/documents/delivery');
  const request = { requester_profile_id: null, recipient_name: 'Romario & Rene Rowe', recipient_email: 'rowe@example.com', details: { child_name: ' Samora Rowe ', birth_date: '20 August 2026' } };
  const d = documentDelivery(request, null);
  assert.equal(d.nameOnDocument, 'Samora Rowe');
  assert.equal(d.greetingName, 'Romario & Rene Rowe');
  assert.equal(d.email, 'rowe@example.com');
  assert.equal(nameOnDocument({ ...request, details: { child_name: 'Samora Rowe' } }, member), 'Samora Rowe', 'even when a parent who is a member was chosen');
  assert.equal(nameOnDocument({ requester_profile_id: null, recipient_name: 'Assistant', recipient_email: 'a@x.org', details: { member_name: 'Rev. Guest Speaker' } }, null), 'Rev. Guest Speaker', 'the honoree the office typed, not whoever receives the email');
  assert.equal(nameOnDocument({ requester_profile_id: 'm1', recipient_name: null, recipient_email: null, details: { member_name: 'Sis. Jane' } }, member), 'Jane Brown', 'a member keeps their name on file');
  assert.equal(nameOnDocument({ requester_profile_id: null, recipient_name: null, recipient_email: null }, null), '');
});

const { mergeTemplate, markBlanks } = load('lib/documents/merge');

test('a preview shows what is still blank in plain words', () => {
  const body = 'This certifies that {{member_name}} was baptized on {{ baptism_date }} at {{baptism_place}}.';
  const merged = mergeTemplate(body, { member_name: 'Jane Brown', baptism_date: '4 October 2026' }).join('\n\n');
  assert.equal(markBlanks(merged), 'This certifies that Jane Brown was baptized on 4 October 2026 at [Baptism place].');
  assert.equal(markBlanks('No blanks here.'), 'No blanks here.');
});
