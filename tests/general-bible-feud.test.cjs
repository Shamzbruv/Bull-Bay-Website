const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const root = path.join(__dirname, "../tools/quiz/src");
let database;
function load(file, cache = new Map()) {
  const key = file.replace(/\.ts$/, "");
  if (key === "lib/storage/supabaseClient") return { supabase: database };
  if (cache.has(key)) return cache.get(key);
  const full = path.join(root, key + ".ts");
  const output = ts.transpileModule(fs.readFileSync(full, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const mod = { exports: {} };
  new Function("module", "exports", "require", output)(
    mod,
    mod.exports,
    (name) =>
      load(path.relative(root, path.resolve(path.dirname(full), name)), cache),
  );
  cache.set(key, mod.exports);
  return mod.exports;
}
const { GENERAL_BIBLE, FEUD_CATEGORIES, selectGeneralBoards } = load(
  "lib/feud/general-bible",
);
const { KINGS_THREE } = load("lib/feud/questions");
const { quiz1Kings3 } = load("data/seed/1-kings-chapter-3");
const { validateQuiz } = load("types/quiz");
test("general Bible bank has 60 distinct factual boards and ten in each category", () => {
  assert.equal(GENERAL_BIBLE.length, 60);
  assert.equal(new Set(GENERAL_BIBLE.map((q) => q.id)).size, 60);
  assert.equal(new Set(GENERAL_BIBLE.map((q) => q.prompt)).size, 60);
  for (const category of Object.keys(FEUD_CATEGORIES))
    assert.equal(
      GENERAL_BIBLE.filter((q) => q.category === category).length,
      10,
    );
  for (const q of GENERAL_BIBLE) {
    assert.ok(q.answers.length >= 2 && q.answers.length <= 6);
    assert.equal(
      q.answers.reduce((sum, a) => sum + a.points, 0),
      100,
    );
    assert.ok(q.answers.every((a) => a.reference && a.text && a.points > 0));
  }
});
test("round selection filters categories, caps counts and shuffles without mutating the bank", () => {
  const original = GENERAL_BIBLE.map((q) => q.id);
  assert.equal(selectGeneralBoards("all", 20, false).length, 20);
  const filtered = selectGeneralBoards("gospels", 60, true, () => 0);
  assert.equal(filtered.length, 10);
  assert.ok(filtered.every((q) => q.category === "gospels"));
  assert.equal(new Set(filtered.map((q) => q.id)).size, 10);
  assert.notDeepEqual(
    filtered.map((q) => q.id),
    GENERAL_BIBLE.filter((q) => q.category === "gospels").map((q) => q.id),
  );
  assert.deepEqual(
    GENERAL_BIBLE.map((q) => q.id),
    original,
  );
});
test("1 Kings 3 keeps all twelve original prompts and all their answer facts in a valid regular quiz", () => {
  assert.deepEqual(validateQuiz(quiz1Kings3), []);
  assert.equal(quiz1Kings3.questions.length, 12);
  quiz1Kings3.questions.forEach((q, i) => {
    assert.equal(q.type, "short_answer");
    assert.equal(q.question, KINGS_THREE[i].prompt);
    for (const a of KINGS_THREE[i].answers) {
      assert.ok(q.correctAnswer.includes(a.text));
      assert.ok(q.explanation.includes(a.reference));
    }
  });
});
test("existing local libraries gain the new chapter without replacing quizzes the host edited", async () => {
  const data = new Map([
    [
      "bbntcog-quizzes",
      JSON.stringify([
        { id: "1-kings-chapter-1", title: "My custom title", questions: [] },
      ]),
    ],
  ]);
  global.localStorage = {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
  };
  const { LocalStorageAdapter } = load("lib/storage/localAdapter");
  const db = new LocalStorageAdapter();
  const quizzes = await db.listQuizzes();
  assert.equal(
    quizzes.find((q) => q.id === "1-kings-chapter-1").title,
    "My custom title",
  );
  assert.equal(
    quizzes.find((q) => q.id === "1-kings-chapter-3").questions.length,
    12,
  );
  assert.equal(
    (await db.listQuizzes()).filter((q) => q.id === "1-kings-chapter-3").length,
    1,
  );
});
function fakeDatabase() {
  const rows = { quizzes: [], questions: [] };
  const writes = [];
  let failQuestions = false;
  return {
    rows,
    writes,
    failNextQuestions: () => {
      failQuestions = true;
    },
    from(table) {
      const filters = [];
      const query = {
        select() {
          return query;
        },
        order() {
          return query;
        },
        eq(key, value) {
          filters.push([key, value]);
          return query;
        },
        maybeSingle: async () => ({
          data:
            rows[table].find((row) =>
              filters.every(([key, value]) => row[key] === value),
            ) ?? null,
          error: null,
        }),
        then(resolve, reject) {
          return Promise.resolve({
            data: rows[table].filter((row) =>
              filters.every(([key, value]) => row[key] === value),
            ),
            error: null,
          }).then(resolve, reject);
        },
        async upsert(payload, options) {
          writes.push({ table, options });
          if (table === "questions" && failQuestions) {
            failQuestions = false;
            return { error: new Error("Temporary failure") };
          }
          for (const row of Array.isArray(payload) ? payload : [payload])
            if (!rows[table].some((existing) => existing.id === row.id))
              rows[table].push({ ...row });
          return { error: null };
        },
      };
      return query;
    },
  };
}
test("Supabase-backed library seeds chapter 3 once using non-overwriting inserts", async () => {
  database = fakeDatabase();
  const { SupabaseAdapter } = load("lib/storage/supabaseAdapter");
  const db = new SupabaseAdapter();
  const first = await db.listQuizzes();
  assert.equal(first[0].questions.length, 12);
  database.rows.quizzes[0].title = "Host edited chapter 3";
  const next = await db.listQuizzes();
  assert.equal(next[0].title, "Host edited chapter 3");
  assert.equal(database.writes.length, 2);
  assert.ok(database.writes.every((write) => write.options.ignoreDuplicates));
});
test("a partial Supabase seed is repaired on retry without overwriting existing quiz metadata", async () => {
  database = fakeDatabase();
  database.failNextQuestions();
  const { SupabaseAdapter } = load("lib/storage/supabaseAdapter");
  const db = new SupabaseAdapter();
  await assert.rejects(db.listQuizzes(), /Temporary failure/);
  database.rows.quizzes[0].title = "Preserve this";
  const recovered = await db.listQuizzes();
  assert.equal(recovered.length, 1);
  assert.equal(recovered[0].title, "Preserve this");
  assert.equal(recovered[0].questions.length, 12);
});
