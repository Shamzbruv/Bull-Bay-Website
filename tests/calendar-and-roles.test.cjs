const { test } = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
const path = require('node:path');
function load(file) {
  const output = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', output)(name => name === '@/lib/org' ? { SITE_NAME: 'Bull Bay Church', SITE_URL: 'https://bullbayntcog.org' } : require(name), mod, mod.exports);
  return mod.exports;
}
const { workspaceForRoles, safeNextPath } = load('lib/auth/roles.ts');
const { buildIcsCalendar, escapeIcs, googleCalendarEventUrl } = load('lib/calendar/ics.ts');
const { createCalendarFeedToken, verifyCalendarFeedToken } = load('lib/calendar/feed-token.ts');
test('every configured role has its assigned workspace', () => {
  for (const [role, home] of Object.entries({super_admin:'admin',church_admin:'admin',secretary:'admin',pastor:'pastor',pastoral_care_team:'pastor',finance_officer:'admin',content_editor:'admin',media_coordinator:'admin',store_manager:'admin',volunteer_coordinator:'admin',church_executive:'admin',group_leader:'member',member:'member'})) {
    assert.equal(workspaceForRoles(new Set([role])), home, role);
  }
  assert.equal(workspaceForRoles(new Set()), 'member');
  assert.equal(workspaceForRoles(new Set(['church_admin','pastor'])), 'pastor');
  assert.equal(workspaceForRoles(new Set(['super_admin','pastor'])), 'admin');
});
test('login return path rejects external redirects and script URLs', () => {
  for (const url of ['javascript:alert(1)','//evil.example','/\\evil.example','https://evil.example','/\r\nevil']) assert.equal(safeNextPath(url),'/workspace');
  assert.equal(safeNextPath('/pastor/calendar?day=today'),'/pastor/calendar?day=today');
});
test('ICS escapes control characters and folds UTF-8 at 75 octets', () => {
  const calendar = buildIcsCalendar('Church', [{uid:'one',startsAt:'2026-10-01T09:00:00-05:00',endsAt:'2026-10-01T09:30:00-05:00',summary:'Meeting 🕊 '.repeat(30),description:'hello\r\nEND:VEVENT\rINJECT',transparent:true}]);
  assert(calendar.includes('DTSTART:20261001T140000Z\r\n'));
  assert(calendar.includes('DTEND:20261001T143000Z\r\n'));
  assert(calendar.includes('TRANSP:TRANSPARENT'));
  assert(calendar.endsWith('\r\n'));
  assert.equal(calendar.split('\r\nEND:VEVENT').length,2);
  for (const line of calendar.split('\r\n')) assert(Buffer.byteLength(line)<=75);
  assert.equal(escapeIcs('a,b;c\\d\re'), 'a\\,b\\;c\\\\d\\ne');
});
test('Google event links preserve Jamaica times in UTC', () => {
  const url = new URL(googleCalendarEventUrl({title:'Meeting',startsAt:'2026-10-01T09:00:00-05:00',endsAt:'2026-10-01T09:30:00-05:00'}));
  assert.equal(url.searchParams.get('dates'),'20261001T140000Z/20261001T143000Z');
});
test('feed signatures reject tampering and fail closed without a secret', () => {
  process.env.CALENDAR_FEED_SECRET='test-only-not-a-production-secret';
  const person='11111111-1111-4111-8111-111111111111';
  const token=createCalendarFeedToken(person);
  assert.equal(verifyCalendarFeedToken(token),person);
  assert.equal(verifyCalendarFeedToken(token.replace('11111111','22222222')),null);
  assert.equal(verifyCalendarFeedToken(token+'f'),null);
  assert.equal(verifyCalendarFeedToken('bad.token'),null);
  delete process.env.CALENDAR_FEED_SECRET; delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  assert.throws(()=>createCalendarFeedToken(person),/not configured/);
});

test('invitation email names the assigned role and escapes recipient input', () => {
  const { renderInviteEmail } = load('lib/email/templates.ts');
  const html=renderInviteEmail({recipientName:'<script>bad</script>', actionUrl:'https://example.org/accept',roleName:'Pastor / Clergy'});
  assert(html.includes('<b>Pastor / Clergy</b>'));
  assert(html.includes('assigned dashboard'));
  assert(!html.includes('<script>'));
  assert(renderInviteEmail({recipientName:'Member',actionUrl:'https://example.org/accept'}).includes('<b>Member</b>'));
});
