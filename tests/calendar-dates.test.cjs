const { test } = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
const path = require('node:path');
function load(file) {
  const output = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', output)(require, mod, mod.exports);
  return mod.exports;
}
const { weekRangeLabel, spansWholeDays, jamaicaDateOf } = load('lib/calendar/dates.ts');

test('a week reads the way people write it, never "2026 (day: 10)"', () => {
  assert.equal(weekRangeLabel(new Date(2026, 9, 4, 12), new Date(2026, 9, 10, 12)), 'Oct 4 – 10, 2026');
  assert.equal(weekRangeLabel(new Date(2026, 8, 27, 12), new Date(2026, 9, 3, 12)), 'Sep 27 – Oct 3, 2026');
  assert.equal(weekRangeLabel(new Date(2026, 11, 27, 12), new Date(2027, 0, 2, 12)), 'Dec 27, 2026 – Jan 2, 2027');
});

test('whole days are told apart from timed entries, in Jamaica time', () => {
  assert.equal(spansWholeDays('2026-10-12T05:00:00Z', '2026-10-13T05:00:00Z'), true);
  assert.equal(spansWholeDays('2026-10-12T05:00:00Z', '2026-10-15T05:00:00Z'), true);
  assert.equal(spansWholeDays('2026-10-12T00:00:00Z', '2026-10-13T00:00:00Z'), false, 'UTC midnight is 7 PM in Jamaica');
  assert.equal(spansWholeDays('2026-10-12T05:00:00Z', '2026-10-12T17:00:00Z'), false);
  assert.equal(jamaicaDateOf('2026-10-13T03:00:00Z'), '2026-10-12');
});
