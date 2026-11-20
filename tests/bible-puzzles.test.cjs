const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

function load(file) {
  const output = ts.transpileModule(fs.readFileSync(file + ".ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const mod = { exports: {} };
  new Function("module", "exports", "require", output)(
    mod,
    mod.exports,
    (name) => load(path.resolve(path.dirname(file), name)),
  );
  return mod.exports;
}

const { createSession, currentPuzzle, projectPuzzle, puzzleCount } = load(
  path.join(__dirname, "../tools/quiz/src/lib/puzzles/session"),
);

test("the word deck contains over 100 unique, genuinely scrambled Bible words", () => {
  const count = puzzleCount("unscramble");
  const session = createSession("unscramble", count, "word-game");
  assert.ok(count > 100);
  assert.equal(new Set(session.deck.map(({ answer }) => answer.toUpperCase())).size, count);
  for (const { answer, letters } of session.deck) {
    const original = answer.toUpperCase();
    assert.match(letters, /^[A-Z]+$/);
    assert.notEqual(letters, original);
    assert.deepEqual([...letters].sort(), [...original].sort());
  }
});

test("the picture deck provides unique answers, accessible clues and Bible references", () => {
  const count = puzzleCount("pictures");
  const session = createSession("pictures", count, "picture-game");
  assert.ok(count >= 20);
  assert.equal(new Set(session.deck.map(({ answer }) => answer)).size, count);
  for (let position = 0; position < count; position++) {
    const puzzle = currentPuzzle("pictures", { ...session, position });
    assert.ok(puzzle.pictures.length >= 2);
    assert.ok(puzzle.pictures.every(([symbol, description]) => symbol && description));
    assert.match(puzzle.reference, /\d+:\d+/);
  }
});

test("the projector gets only the current clue and any hint or answer the host has revealed", () => {
  for (const mode of ["unscramble", "pictures"]) {
    const session = createSession(mode, 10, "reveal-game");
    const puzzle = currentPuzzle(mode, session);
    const hidden = projectPuzzle(mode, session);
    assert.equal(hidden.round, 1);
    assert.equal(hidden.total, 10);
    assert.equal(hidden.solution, undefined);
    assert.equal(hidden.hint, undefined);
    assert.equal(hidden.deck, undefined);
    assert.ok(hidden.clue);
    assert.equal(projectPuzzle(mode, { ...session, hint: true }).hint, puzzle.hint);

    const revealed = projectPuzzle(mode, { ...session, revealed: true });
    assert.equal(revealed.solution.answer, puzzle.answer);
    assert.equal(revealed.solution.reference, puzzle.reference);
    assert.equal(projectPuzzle(mode, { ...session, position: 1 }).solution, undefined);

    const complete = projectPuzzle(mode, { ...session, position: 10, revealed: true, hint: true });
    assert.equal(complete.clue, null);
    assert.equal(complete.solution, undefined);
    assert.equal(complete.hint, undefined);
  }
});
