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
  const req = (name) => {
    if (name.startsWith('@/')) return load(name.slice(2));
    if (name.startsWith('./')) return load(path.relative(ROOT, path.join(path.dirname(full), name)));
    return require(name);
  };
  new Function('require', 'module', 'exports', output)(req, mod, mod.exports);
  cache.set(key, mod.exports);
  return mod.exports;
}
const schema = load('lib/forms/schema');
const logic = load('lib/forms/logic');
const { checkAnswer, checkResponse, fileAllowed } = load('lib/forms/validate');
const { gradeResponse } = load('lib/forms/score');
const { summarize, responsesCsv } = load('lib/forms/summary');
const { answerToText, formatDate } = load('lib/forms/display');
const { FORM_TEMPLATES, BLANK_DEFINITION } = load('lib/forms/templates');

const q = (type, extra = {}) => ({ kind: 'question', id: extra.id ?? `q_${type}`, title: extra.title ?? type, type, required: false, ...extra });
const opts = (...labels) => labels.map((label, i) => ({ id: `o${i + 1}`, label }));

test('every church template is a valid form', () => {
  for (const t of [...FORM_TEMPLATES, { id: 'blank', definition: BLANK_DEFINITION }]) {
    const parsed = schema.definitionSchema.safeParse(t.definition);
    assert.ok(parsed.success, `${t.id}: ${parsed.success ? '' : JSON.stringify(parsed.error.issues.slice(0, 2))}`);
    assert.deepEqual(schema.checkDefinition(parsed.data), [], t.id);
  }
});

test('the definition check catches what the schema cannot', () => {
  const items = [
    q('multiple_choice', { id: 'q_a', options: opts('Yes', 'No'), branching: true }),
    { kind: 'section', id: 's_one', title: 'One', next: 's_missing' },
    q('short_text', { id: 'q_a', showIf: [{ questionId: 'q_later', op: 'equals', value: 'x' }] }),
    q('checkboxes', { id: 'q_quiz', options: opts('A', 'B'), quiz: { points: 1, correct: ['o9'] } }),
    q('ranking', { id: 'q_rank', options: opts('A', 'B', 'C'), quiz: { points: 1, correct: ['o1', 'o2'] } }),
  ];
  items[0].options[0].goTo = 's_nowhere';
  const problems = schema.checkDefinition({ title: 't', description: '', items, settings: schema.DEFAULT_SETTINGS });
  assert.ok(problems.some((p) => /share the id "q_a"/.test(p)));
  assert.ok(problems.some((p) => /Section "One" goes to a section that no longer exists/.test(p)));
  assert.ok(problems.some((p) => /A choice in .* goes to a section/.test(p)));
  assert.ok(problems.some((p) => /depends on a question that isn't before it/.test(p)));
  assert.ok(problems.some((p) => /answer key names a choice that no longer exists/.test(p)));
  assert.ok(problems.some((p) => /must put every option in order/.test(p)));
});

test('settings saved before a setting existed still read', () => {
  const s = schema.readSettings({ requireSignIn: true, theme: { accent: '#112233' } });
  assert.equal(s.requireSignIn, true);
  assert.equal(s.theme.accent, '#112233');
  assert.equal(s.theme.font, 'serif');
  assert.equal(s.quiz.enabled, false);
  assert.deepEqual(schema.readSettings('nonsense'), schema.DEFAULT_SETTINGS);
});

// --- pages, conditions, branching ---------------------------------------

const branching = [
  q('multiple_choice', { id: 'q_member', options: [{ id: 'yes', label: 'Yes', goTo: 's_member' }, { id: 'no', label: 'No', goTo: 's_visitor' }], branching: true, required: true }),
  { kind: 'section', id: 's_member', title: 'Members', next: 'submit' },
  q('short_text', { id: 'q_ministry', required: true }),
  { kind: 'section', id: 's_visitor', title: 'Visitors' },
  q('short_text', { id: 'q_heard', required: true }),
  q('long_text', { id: 'q_more', required: true, showIf: [{ questionId: 'q_heard', op: 'contains', value: 'friend' }] }),
];

test('pages split at sections; an empty first page is dropped', () => {
  assert.equal(logic.pagesOf(branching).length, 3);
  assert.equal(logic.pagesOf([{ kind: 'section', id: 's_a', title: 'A' }, q('short_text')]).length, 1);
});

test('a choice sends the respondent to its section, and a section can end the form', () => {
  assert.deepEqual(logic.pathThrough(branching, { q_member: 'yes' }), [0, 1]);
  assert.deepEqual(logic.pathThrough(branching, { q_member: 'no' }), [0, 2]);
  assert.deepEqual(logic.pathThrough(branching, {}), [0, 1], 'no answer: carry on to the next section');
  const looping = [q('short_text'), { kind: 'section', id: 's_b', title: 'B', next: 's_b' }, q('long_text')];
  assert.deepEqual(logic.pathThrough(looping, {}), [0, 1], 'a section that points at itself ends instead of looping');
});

test('the first page can lead straight to a section or to submit', () => {
  assert.deepEqual(logic.pathThrough(branching.slice(1).concat([]), {}, undefined).length > 0, true);
  const items = [q('short_text', { id: 'q_x' }), { kind: 'section', id: 's_a', title: 'A' }, q('short_text', { id: 'q_y' }), { kind: 'section', id: 's_b', title: 'B' }, q('short_text', { id: 'q_z' })];
  assert.deepEqual(logic.pathThrough(items, {}, 's_b'), [0, 2]);
  assert.deepEqual(logic.pathThrough(items, {}, 'submit'), [0]);
});

test('conditions: equals, contains, answered, numbers, checkboxes', () => {
  const qs = logic.questionMap([q('checkboxes', { id: 'q_c', options: opts('A', 'B') }), q('number', { id: 'q_n' }), q('short_text', { id: 'q_t' })]);
  const holds = (c, a) => logic.conditionHolds(c, qs, a);
  assert.equal(holds({ questionId: 'q_c', op: 'equals', value: 'o2' }, { q_c: { ids: ['o2'] } }), true);
  assert.equal(holds({ questionId: 'q_c', op: 'not_equals', value: 'o2' }, { q_c: { ids: ['o1'] } }), true);
  assert.equal(holds({ questionId: 'q_n', op: 'greater_than', value: '5' }, { q_n: 7 }), true);
  assert.equal(holds({ questionId: 'q_n', op: 'less_than', value: '5' }, {}), false);
  assert.equal(holds({ questionId: 'q_t', op: 'contains', value: 'FRIEND' }, { q_t: 'A friend told me' }), true);
  assert.equal(holds({ questionId: 'q_t', op: 'answered' }, { q_t: '  ' }), false);
  assert.equal(holds({ questionId: 'q_t', op: 'not_answered' }, {}), true);
});

test('only the questions a respondent was asked are checked; the rest are dropped', () => {
  const visitor = checkResponse(branching, { q_member: 'no', q_heard: 'Online', q_ministry: 'smuggled in' });
  assert.deepEqual(visitor.errors, {});
  assert.deepEqual(visitor.answers, { q_member: 'no', q_heard: 'Online' });
  const friend = checkResponse(branching, { q_member: 'no', q_heard: 'a friend' });
  assert.deepEqual(Object.keys(friend.errors), ['q_more'], 'the follow-up appears, and is required');
  const member = checkResponse(branching, { q_member: 'yes' });
  assert.deepEqual(Object.keys(member.errors), ['q_ministry']);
  assert.deepEqual(Object.keys(checkResponse(branching, {}).errors).sort(), ['q_member', 'q_ministry']);
});

// --- answers ----------------------------------------------------------------

const ok = (question, raw) => { const r = checkAnswer(question, raw); assert.ok(r.ok, `${question.type} ${JSON.stringify(raw)}: ${r.error}`); return r.value; };
const bad = (question, raw, pattern) => { const r = checkAnswer(question, raw); assert.equal(r.ok, false, `${question.type} ${JSON.stringify(raw)} should fail`); if (pattern) assert.match(r.error, pattern); };

test('text answers and their validation rules', () => {
  assert.equal(ok(q('short_text'), '  hello  '), 'hello');
  bad(q('short_text', { validation: { rule: 'email' } }), 'nope', /valid email/);
  bad(q('short_text', { validation: { rule: 'between', value: '1', value2: '10' } }), '11', /between 1 and 10/);
  bad(q('short_text', { validation: { rule: 'max_length', value: '3', message: 'Keep it short' } }), 'four', /Keep it short/);
  bad(q('short_text', { validation: { rule: 'pattern', value: '[A-Z]{3}\\d{3}' } }), 'abc123', /expected format/);
  assert.equal(ok(q('short_text', { validation: { rule: 'pattern', value: '[A-Z]{3}\\d{3}' } }), 'ABC123'), 'ABC123');
  assert.equal(ok(q('short_text', { validation: { rule: 'pattern', value: '(' } }), 'anything'), 'anything', 'a broken pattern never blocks a respondent');
  bad(q('long_text'), 'x'.repeat(10001), /too long/);
  bad(q('email'), 'a@b', /valid email/);
  assert.equal(ok(q('phone'), '+1 (876) 596-3890'), '+1 (876) 596-3890');
  bad(q('phone'), 'call me', /phone/);
  assert.equal(ok(q('number', { min: 1, max: 5, integer: true }), '3'), 3);
  bad(q('number', { integer: true }), '2.5', /whole number/);
  bad(q('number', { max: 5 }), 9, /5 or less/);
});

test('choice answers, Other, and how many may be ticked', () => {
  const mc = q('multiple_choice', { options: opts('A', 'B'), other: true });
  assert.equal(ok(mc, 'o2'), 'o2');
  assert.deepEqual(ok(mc, { other: ' Something else ' }), { other: 'Something else' });
  bad(mc, 'o9');
  bad(q('dropdown', { options: opts('A') }), { other: 'x' });
  const cb = q('checkboxes', { options: opts('A', 'B', 'C'), other: true, selection: { rule: 'at_most', count: 2 } });
  assert.deepEqual(ok(cb, { ids: ['o1', 'o1', 'o3'] }), { ids: ['o1', 'o3'] });
  bad(cb, { ids: ['o1', 'o2'], other: 'and more' }, /at most 2/);
  bad(q('checkboxes', { options: opts('A', 'B'), selection: { rule: 'exactly', count: 2 } }), { ids: ['o1'] }, /exactly 2/);
  assert.equal(ok(cb, { ids: [] }), undefined);
});

test('scales, ratings, NPS, grids and ranking', () => {
  assert.equal(ok(q('linear_scale', { min: 0, max: 4 }), 0), 0);
  bad(q('linear_scale', { min: 1, max: 5 }), 6);
  bad(q('rating', { levels: 5, icon: 'star' }), 0);
  assert.equal(ok(q('nps'), '10'), 10);
  const grid = q('grid_choice', { rows: [{ id: 'r1', label: 'R1' }, { id: 'r2', label: 'R2' }], columns: [{ id: 'c1', label: 'C1' }, { id: 'c2', label: 'C2' }], requireEachRow: true, oneColumnEach: true });
  assert.deepEqual(ok(grid, { r1: 'c1', r2: 'c2' }), { r1: 'c1', r2: 'c2' });
  bad(grid, { r1: 'c1' }, /every row/);
  bad(grid, { r1: 'c1', r2: 'c1' }, /each column only once/);
  bad(grid, { r1: 'c9', r2: 'c1' });
  const gc = q('grid_checkbox', { rows: [{ id: 'r1', label: 'R1' }], columns: [{ id: 'c1', label: 'C1' }, { id: 'c2', label: 'C2' }] });
  assert.deepEqual(ok(gc, { r1: ['c1', 'c2', 'c1'] }), { r1: ['c1', 'c2'] });
  const rank = q('ranking', { options: opts('A', 'B', 'C') });
  assert.deepEqual(ok(rank, ['o3', 'o1', 'o2']), ['o3', 'o1', 'o2']);
  bad(rank, ['o3', 'o1'], /every option/);
  bad(rank, ['o1', 'o1', 'o2']);
});

test('dates, times, files, signatures and consent', () => {
  assert.equal(ok(q('date', { includeYear: true, includeTime: false }), '2026-10-04'), '2026-10-04');
  assert.equal(ok(q('date', { includeYear: false, includeTime: false }), '08-20'), '08-20');
  assert.equal(ok(q('date', { includeYear: true, includeTime: true }), '2026-10-04T09:50'), '2026-10-04T09:50');
  bad(q('date', { includeYear: true, includeTime: false }), '2026-13-01', /real date/);
  assert.equal(ok(q('time'), '09:50'), '09:50');
  bad(q('time'), '25:00');
  assert.equal(ok(q('time', { duration: true }), '1:30:00'), '1:30:00');
  const upload = q('file_upload', { maxFiles: 2, maxSizeMb: 1, accept: ['pdf', 'image'] });
  const file = { path: 'f/s/a.pdf', name: 'a.pdf', size: 1000, type: 'application/pdf' };
  assert.deepEqual(ok(upload, [file]), [file]);
  bad(upload, [file, file, file], /at most 2 files/);
  bad(upload, [{ ...file, size: 2 * 1024 * 1024 }], /under 1 MB/);
  bad(upload, [{ ...file, name: 'run.exe', type: 'application/x-msdownload' }], /isn't accepted/);
  assert.equal(fileAllowed([], 'anything.zip', 'application/zip'), true);
  assert.equal(fileAllowed(['spreadsheet'], 'giving.CSV', ''), true);
  assert.deepEqual(ok(q('signature'), { dataUrl: 'data:image/png;base64,iVBORw0KGgo=' }), { dataUrl: 'data:image/png;base64,iVBORw0KGgo=' });
  bad(q('signature'), { dataUrl: 'data:text/html;base64,PHNjcmlwdD4=' });
  assert.equal(ok(q('consent', { statement: 'I agree' }), true), true);
  assert.deepEqual(checkResponse([q('consent', { id: 'q_ok', statement: 'I agree', required: true })], {}).errors, { q_ok: 'Please agree to continue.' });
});

// --- quiz -------------------------------------------------------------------

test('the Bible quiz template marks itself', () => {
  const quiz = FORM_TEMPLATES.find((t) => t.id === 'bible_quiz').definition.items;
  const perfect = gradeResponse(quiz, { q_name: 'Ann', q_exodus: 'ex_moses', q_gospels: { ids: ['gs_luke', 'gs_mark', 'gs_matthew'] }, q_verse: '  The   WORLD ', q_books: 'bk_66', q_order: ['or_genesis', 'or_exodus', 'or_leviticus', 'or_numbers'] });
  assert.equal(perfect.score, 7);
  assert.equal(perfect.maxScore, 7);
  assert.equal(perfect.needsMarking, false);
  const partial = gradeResponse(quiz, { q_exodus: 'ex_aaron', q_gospels: { ids: ['gs_matthew', 'gs_mark'] }, q_verse: 'world' });
  assert.equal(partial.score, 1);
  assert.equal(partial.questions.q_exodus.correct, false);
  assert.equal(partial.questions.q_gospels.correct, false, 'missing one Gospel is wrong');
});

test('answers without a key wait for marking, and a mark by hand wins', () => {
  const items = [q('long_text', { id: 'q_essay', quiz: { points: 5, correct: [] } }), q('multiple_choice', { id: 'q_mc', options: opts('A', 'B'), quiz: { points: 2, correct: ['o1'] } })];
  const auto = gradeResponse(items, { q_essay: 'My answer', q_mc: 'o2' });
  assert.equal(auto.needsMarking, true);
  assert.equal(auto.questions.q_essay.correct, null);
  const marked = gradeResponse(items, { q_essay: 'My answer', q_mc: 'o2' }, { q_essay: { points: 9 }, q_mc: { points: 1 } });
  assert.equal(marked.questions.q_essay.points, 5, 'capped at the question\'s points');
  assert.equal(marked.score, 6);
  assert.equal(marked.needsMarking, false);
  assert.equal(gradeResponse(items, {}).needsMarking, false, 'nothing to mark when it was left blank');
});

// --- summaries, export, display ---------------------------------------------

test('summaries count choices (removed ones under their old label), NPS, grids and ranking', () => {
  const mc = q('multiple_choice', { id: 'q_mc', options: opts('Red', 'Blue'), other: true });
  const old = [{ ...mc, options: [...mc.options, { id: 'o3', label: 'Green' }] }];
  const s = summarize(mc, [{ answers: { q_mc: 'o1' } }, { answers: { q_mc: 'o3' }, snapshot: old }, { answers: { q_mc: { other: 'Teal' } } }, { answers: {} }]);
  assert.equal(s.answered, 3);
  assert.deepEqual(s.counts.map((c) => [c.label, c.count]), [['Red', 1], ['Blue', 0], ['Green', 1], ['Other', 1]]);
  assert.deepEqual(s.other, ['Teal']);
  const nps = summarize(q('nps', { id: 'q_n' }), [10, 9, 8, 3, 6].map((n) => ({ answers: { q_n: n } })));
  assert.deepEqual(nps.nps, { score: 0, promoters: 2, passives: 1, detractors: 2 });
  assert.equal(nps.counts.length, 11);
  const grid = q('grid_checkbox', { id: 'q_g', rows: [{ id: 'r1', label: 'Music' }], columns: [{ id: 'c1', label: 'Sun' }, { id: 'c2', label: 'Sat' }] });
  const g = summarize(grid, [{ answers: { q_g: { r1: ['c1', 'c2'] } } }, { answers: { q_g: { r1: ['c1'] } } }]);
  assert.deepEqual(g.rows[0].counts.map((c) => c.count), [2, 1]);
  const rank = summarize(q('ranking', { id: 'q_r', options: opts('A', 'B') }), [{ answers: { q_r: ['o2', 'o1'] } }, { answers: { q_r: ['o2', 'o1'] } }]);
  assert.deepEqual(rank.averages.map((a) => [a.label, a.average]), [['B', 1], ['A', 2]]);
});

test('the spreadsheet export: grid rows as columns, and no formulas sneaking in', () => {
  const items = [q('short_text', { id: 'q_t', title: 'Comment' }), q('grid_choice', { id: 'q_g', title: 'Rate', rows: [{ id: 'r1', label: 'Music' }, { id: 'r2', label: 'Word' }], columns: [{ id: 'c1', label: 'Good' }] })];
  const csv = responsesCsv(items, [{ submittedAt: '2026-10-04T14:50:00Z', name: 'Ann, B', email: null, score: 3, maxScore: 5, answers: { q_t: '=HYPERLINK("http://x")', q_g: { r1: 'c1' } } }], { quiz: true });
  assert.ok(csv.startsWith('﻿'));
  const [header, row] = csv.slice(1).trim().split('\r\n');
  assert.equal(header, 'Submitted,Name,Email,Score,Comment,Rate [Music],Rate [Word]');
  assert.match(row, /,"Ann, B",,3 \/ 5,"'=HYPERLINK\(""http:\/\/x""\)",Good,$/);
});

test('answers read as words', () => {
  assert.equal(answerToText(q('checkboxes', { options: opts('A', 'B') }), { ids: ['o2'], other: 'C' }), 'B, Other: C');
  assert.equal(answerToText(q('ranking', { options: opts('A', 'B') }), ['o2', 'o1']), '1. B, 2. A');
  assert.equal(answerToText(q('date', { includeYear: false, includeTime: false }), '08-20'), '20 August');
  assert.equal(answerToText(q('time'), '13:05'), '1:05 PM');
  assert.equal(answerToText(q('rating', { levels: 5, icon: 'star' }), 4), '4 of 5');
  assert.equal(formatDate('2026-10-04T09:50'), '4 October 2026, 9:50 AM');
});

test('availability: closed, scheduled, ended, full', () => {
  const base = { accepting: true, closedMessage: 'Closed!', opensAt: null, closesAt: null, responseLimit: null };
  const now = new Date('2026-10-04T12:00:00Z');
  assert.deepEqual(logic.availability(base, 0, now), { open: true });
  assert.equal(logic.availability({ ...base, accepting: false }, 0, now).message, 'Closed!');
  assert.equal(logic.availability({ ...base, opensAt: '2026-10-05T00:00:00Z' }, 0, now).reason, 'not_yet_open');
  assert.equal(logic.availability({ ...base, closesAt: '2026-10-04T11:59:00Z' }, 0, now).reason, 'ended');
  assert.equal(logic.availability({ ...base, responseLimit: 3 }, 3, now).reason, 'full');
});

test('shuffles are a permutation, the same for the same respondent', () => {
  const a = logic.seededShuffle([1, 2, 3, 4, 5, 6], 'respondent-1');
  assert.deepEqual([...a].sort(), [1, 2, 3, 4, 5, 6]);
  assert.deepEqual(logic.seededShuffle([1, 2, 3, 4, 5, 6], 'respondent-1'), a);
  assert.notDeepEqual(logic.seededShuffle([1, 2, 3, 4, 5, 6, 7, 8], 'someone-else'), logic.seededShuffle([1, 2, 3, 4, 5, 6, 7, 8], 'respondent-1'));
});

// --- the builder ------------------------------------------------------------

const builder = load('lib/forms/builder');
const settings = schema.DEFAULT_SETTINGS;

test('every question type can be added, and is valid as soon as it has a title', () => {
  assert.deepEqual(Object.keys(builder.TYPE_LABELS).sort(), [...schema.QUESTION_TYPES].sort());
  assert.deepEqual(builder.TYPE_GROUPS.flatMap((g) => g.types).sort(), [...schema.QUESTION_TYPES].sort(), 'each type is in the picker once');
  const taken = new Set();
  const items = schema.QUESTION_TYPES.map((type) => builder.newQuestion(type, taken, `A ${type} question`));
  assert.equal(builder.idsIn(items).size, taken.size, 'no id is used twice');
  assert.deepEqual(builder.definitionProblems({ title: 'Every type', description: '', items, settings }), []);
});

test("changing a question's type keeps its wording, choices and shared settings", () => {
  const taken = new Set(['q_pick', 'o1', 'o2', 'o3']);
  const pick = q('multiple_choice', {
    id: 'q_pick', title: 'Pick one', description: 'Help', required: true, other: true, shuffle: true, branching: true,
    showIf: [{ questionId: 'q_x', op: 'answered' }],
    options: [{ id: 'o1', label: 'A', limit: 3, goTo: 's_a' }, { id: 'o2', label: 'B' }, { id: 'o3', label: 'C' }],
    quiz: { points: 2, correct: ['o3'], feedbackCorrect: 'Yes!' },
  });
  const boxes = builder.convertQuestion(pick, 'checkboxes', taken);
  assert.deepEqual([boxes.id, boxes.title, boxes.description, boxes.required, boxes.showIf], [pick.id, pick.title, pick.description, true, pick.showIf]);
  assert.deepEqual(boxes.options, [{ id: 'o1', label: 'A', limit: 3 }, { id: 'o2', label: 'B' }, { id: 'o3', label: 'C' }], 'spot limits stay; checkboxes cannot branch');
  assert.equal(boxes.other, true);
  assert.equal(boxes.shuffle, true);
  assert.equal(boxes.branching, undefined);
  assert.deepEqual(boxes.quiz, pick.quiz);
  const dropdown = builder.convertQuestion(pick, 'dropdown', taken);
  assert.equal(dropdown.branching, true);
  assert.equal(dropdown.options[0].goTo, 's_a');
  assert.equal(dropdown.other, undefined, 'a dropdown has no Other');
  const both = { ...boxes, quiz: { points: 2, correct: ['o1', 'o3'] } };
  assert.deepEqual(builder.convertQuestion(both, 'multiple_choice', taken).quiz.correct, ['o1'], 'one right answer for a single choice');
  const ranked = builder.convertQuestion(pick, 'ranking', taken);
  assert.deepEqual(ranked.options, [{ id: 'o1', label: 'A' }, { id: 'o2', label: 'B' }, { id: 'o3', label: 'C' }]);
  assert.deepEqual(ranked.quiz, { points: 2, correct: [] }, 'points stay; the key has to be set again');
  const text = builder.convertQuestion(pick, 'short_text', taken);
  assert.equal(text.type, 'short_text');
  assert.equal('options' in text, false);
  assert.equal(builder.convertQuestion(pick, 'multiple_choice', taken), pick, 'same type: unchanged');
  const grid = builder.convertQuestion(q('grid_choice', { id: 'q_g', rows: [{ id: 'r1', label: 'R' }], columns: [{ id: 'c1', label: 'C' }], requireEachRow: true, style: 'likert' }), 'grid_checkbox', taken);
  assert.deepEqual([grid.rows, grid.columns, grid.requireEachRow, grid.style], [[{ id: 'r1', label: 'R' }], [{ id: 'c1', label: 'C' }], true, undefined]);
  const short = q('short_text', { id: 'q_s', validation: { rule: 'max_length', value: '20' } });
  assert.deepEqual(builder.convertQuestion(short, 'long_text', taken).validation, short.validation);
  assert.equal(builder.convertQuestion(q('short_text', { id: 'q_e', validation: { rule: 'email' } }), 'long_text', taken).validation, undefined);
  for (const type of schema.QUESTION_TYPES) {
    const converted = builder.convertQuestion(pick, type, taken);
    assert.ok(schema.questionSchema.safeParse(converted).success, `multiple choice → ${type} is a valid question`);
  }
});

test('a copy gets fresh ids, and its answer key follows them', () => {
  const items = [
    q('grid_choice', { id: 'q_g', title: 'Rate', rows: [{ id: 'r1', label: 'Music' }], columns: [{ id: 'c1', label: 'Good' }, { id: 'c2', label: 'Poor' }], quiz: { points: 1, correct: ['r1:c1'] } }),
    q('short_text', { id: 'q_t' }),
  ];
  const next = builder.duplicateItem(items, 'q_g');
  assert.equal(next.length, 3);
  const copy = next[1];
  assert.equal(copy.title, 'Rate (copy)');
  assert.notEqual(copy.id, 'q_g');
  assert.equal(builder.idsIn(next).size, 4 + 4 + 1, 'every id in the form is still unique (question, row, two columns, twice; and q_t)');
  assert.deepEqual(copy.quiz.correct, [`${copy.rows[0].id}:${copy.columns[0].id}`]);
  assert.deepEqual(items[0].quiz.correct, ['r1:c1'], 'the original is untouched');
  assert.equal(builder.duplicateItem(items, 'missing'), items);
});

test('removing an item clears what pointed at it; moving stays in bounds', () => {
  const items = [
    q('multiple_choice', { id: 'q_go', options: [{ id: 'o1', label: 'A', goTo: 's_b' }], branching: true }),
    { kind: 'section', id: 's_a', title: 'A', next: 's_b' },
    q('short_text', { id: 'q_name', showIf: [{ questionId: 'q_go', op: 'equals', value: 'o1' }] }),
    { kind: 'section', id: 's_b', title: 'B' },
  ];
  const noSection = builder.removeItem(items, 's_b');
  assert.equal(noSection.length, 3);
  assert.equal(noSection[0].options[0].goTo, undefined);
  assert.equal(noSection[1].next, undefined);
  assert.deepEqual(builder.removeItem(items, 'q_go')[1].showIf, []);
  assert.deepEqual(builder.moveItem(items, 3, 0).map((i) => i.id), ['s_b', 'q_go', 's_a', 'q_name']);
  assert.equal(builder.moveItem(items, 0, 9), items);
});

test("what's wrong with a form is said in plain words", () => {
  const problems = builder.definitionProblems({
    title: ' ',
    description: '',
    settings,
    items: [q('multiple_choice', { id: 'q_a', title: 'Colour', options: [{ id: 'o1', label: '' }] }), q('short_text', { id: 'q_b', title: '' }), { kind: 'image', id: 'b_img', url: '' }],
  });
  assert.deepEqual(problems, ['Give the form a title.', 'Item 1 ("Colour"): a choice is empty.', 'Item 2: add the question.', 'Item 3: choose an image.']);
});

// --- what the respondent's browser gets -------------------------------------

for (const [key, stub] of Object.entries({
  'lib/supabase/server': { createServiceRoleClient: () => { throw new Error('unit tests have no database'); } },
  'lib/office/context': { roleMembers: async () => [] },
  'lib/notifications': { notifyUsers: async () => undefined },
  'lib/office/email': { queueOfficeEmail: async () => undefined },
})) cache.set(key, stub);
const server = load('lib/forms/server');

test('respondents never receive the answer key, feedback or the staff to notify', () => {
  const items = [q('multiple_choice', { id: 'q_mc', options: opts('A', 'B'), quiz: { points: 3, correct: ['o2'], feedbackCorrect: 'Well done', feedbackIncorrect: 'It was B' } })];
  const sent = server.itemsForRespondent(items);
  assert.deepEqual(sent[0].quiz, { points: 3, correct: [] });
  assert.doesNotMatch(JSON.stringify(sent), /o2"\]|Well done|It was B/);
  const s = server.respondentSettings({ ...settings, notify: { office: true, emailProfileIds: ['p1'] } });
  assert.deepEqual(s.notify, { office: false, emailProfileIds: [] });
});

test("members' own details fill in, and a pre-filled link only fills real questions", () => {
  const items = [
    q('short_text', { id: 'q_full', prefill: 'full_name' }),
    q('short_text', { id: 'q_first', prefill: 'first_name' }),
    q('email', { id: 'q_email', prefill: true }),
    q('phone', { id: 'q_phone', prefill: false }),
  ];
  assert.deepEqual(server.prefillFor(items, { first_name: 'Ann', last_name: 'Brown', email: 'ann@example.com', phone: '876-555-0100' }), { q_full: 'Ann Brown', q_first: 'Ann', q_email: 'ann@example.com' });
  assert.deepEqual(server.prefillFor(items, null), {});
  const link = Buffer.from(JSON.stringify({ q_full: 'Visitor', q_nope: 'x' })).toString('base64url');
  assert.deepEqual(server.decodePrefill(link, items), { q_full: 'Visitor' });
  assert.deepEqual(server.decodePrefill('%%%not-base64', items), {});
  assert.deepEqual(server.decodePrefill(Buffer.from('[1,2]').toString('base64url'), items), {});
});

test('quiz results show only what the settings allow', () => {
  const items = [
    q('multiple_choice', { id: 'q_a', title: 'First book?', options: opts('Genesis', 'Exodus'), quiz: { points: 1, correct: ['o1'], feedbackIncorrect: 'In the beginning…' } }),
    q('multiple_choice', { id: 'q_b', title: 'Second book?', options: opts('Genesis', 'Exodus'), quiz: { points: 1, correct: ['o2'] } }),
  ];
  const answers = { q_a: 'o2', q_b: 'o2' };
  const quiz = (patch) => ({ ...settings, quiz: { ...settings.quiz, enabled: true, ...patch } });
  const full = server.quizOutcome(items, answers, {}, quiz({ showMissed: true, showCorrect: true }));
  assert.equal(full.score, 1);
  assert.deepEqual(full.questions.map((x) => [x.id, x.correct, x.correctAnswer, x.feedback]), [['q_a', false, 'Genesis', 'In the beginning…'], ['q_b', true, undefined, undefined]]);
  const quiet = server.quizOutcome(items, answers, {}, quiz({ showMissed: false, showCorrect: false }));
  assert.deepEqual(quiet.questions.map((x) => [x.id, x.correct]), [['q_b', null]], 'missed questions are not revealed');
});
