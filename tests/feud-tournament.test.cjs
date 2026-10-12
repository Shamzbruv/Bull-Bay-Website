const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs"),
  path = require("path"),
  ts = require("typescript");
const cache = new Map();
function load(name) {
  name = name.replace(/\.ts$/, "");
  if (cache.has(name)) return cache.get(name);
  const file = path.join(__dirname, "../tools/quiz/src/lib/feud", name + ".ts");
  const m = { exports: {} };
  new Function(
    "module",
    "exports",
    "require",
    ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
  )(m, m.exports, (dep) => load(path.join(path.dirname(name), dep)));
  cache.set(name, m.exports);
  return m.exports;
}
const { FAMILY_FUSION } = load("family-fusion"),
  { GENERAL_BIBLE } = load("general-bible"),
  { newFeud, feudReducer: act, feudPresenter } = load("engine"),
  {
    startTournamentState,
    activeMatch,
    uniqueBoards,
    requiredKnockoutRounds,
    tournamentQuestionDemand,
  } = load("tournament");
const make = (
  n,
  q = 2,
  rounds = requiredKnockoutRounds(n),
  pool = GENERAL_BIBLE,
) =>
  startTournamentState(
    newFeud(
      Array.from({ length: n }, (_, i) => ({
        name: `Family ${i + 1}`,
        members: "",
      })),
      pool,
      "test",
    ),
    rounds,
    q,
  );
function scoreBoard(s, id) {
  s = act(s, { type: "control", id });
  s = act(s, { type: "reveal", index: 0 });
  s = act(s, { type: "award", id });
  return act(s, { type: "next" });
}
test("PowerPoint extract has 21 main and 5 Big Money questions, retaining the supplied points", () => {
  assert.equal(FAMILY_FUSION.length, 26);
  assert.equal(
    FAMILY_FUSION.filter((q) => q.category === "big-money").length,
    5,
  );
  assert.equal(uniqueBoards(FAMILY_FUSION).length, 26);
  assert.deepEqual(
    FAMILY_FUSION[0].answers.map((a) => a.points),
    [35, 25, 15, 12, 8, 5],
  );
  for (const q of FAMILY_FUSION)
    assert.equal(
      q.answers.reduce((n, a) => n + a.points, 0),
      100,
    );
  assert.ok(FAMILY_FUSION.find((q) => q.id === "fusion-q21").hostNote);
});
test("knockout tournaments with 2–12 families finish with one champion and never reuse a question", () => {
  for (let n = 2; n <= 12; n++) {
    let s = make(n, 2);
    const seen = new Set();
    let completed = 0;
    while (s.phase !== "finished") {
      assert.ok(completed < 100);
      if (s.phase === "match_complete") {
        s = act(s, { type: "next_match" });
        continue;
      }
      const q = s.questions[s.round];
      assert.ok(!seen.has(q.id), `${n} families reused ${q.id}`);
      seen.add(q.id);
      const match = activeMatch(s);
      s = scoreBoard(s, match.families[0]);
      completed++;
    }
    assert.equal(seen.size, (n - 1) * 2);
    assert.ok(s.tournament.championId);
    assert.equal(
      s.tournament.matches.filter((m) => m.status === "complete").length,
      n - 1,
    );
  }
});
test("extra bracket slots get byes without consuming questions or inventing points", () => {
  let s = make(3, 1, 4);
  assert.equal(s.questions.length, 2);
  assert.equal(s.tournament.rounds, 4);
  assert.ok(s.tournament.matches.some((m) => m.status === "bye"));
  assert.ok(s.families.every((f) => f.score === 0));
});
test("settings needing too many questions or too few knockout rounds are rejected", () => {
  assert.throws(
    () => make(12, 3, 4, FAMILY_FUSION),
    /needs 33 unique questions/,
  );
  assert.throws(() => make(5, 1, 2), /enough knockout rounds/);
  assert.equal(tournamentQuestionDemand(8, 2), 14);
});
test("ties require a host decision; no repeated tie-break question is inserted", () => {
  let s = make(2, 2);
  s = scoreBoard(s, "family-0");
  s = act(s, { type: "control", id: "family-1" });
  s = act(s, { type: "reveal", index: 0 });
  s = act(s, { type: "award", id: "family-1" });
  const m = activeMatch(s);
  s = act(s, {
    type: "adjust",
    id: "family-1",
    points: m.scores["family-0"] - m.scores["family-1"],
  });
  s = act(s, { type: "next" });
  assert.equal(s.phase, "match_tie");
  assert.equal(s.questions.length, 2);
  assert.equal(act(s, { type: "tie_winner", id: "bad" }), s);
  s = act(s, { type: "tie_winner", id: "family-1" });
  assert.equal(s.phase, "finished");
  assert.equal(s.tournament.championId, "family-1");
});
test("outsiders cannot steal or replace a fixed knockout opponent, and match totals survive reload", () => {
  let s = make(4, 1);
  assert.equal(act(s, { type: "opponent", slot: 0, id: "family-2" }), s);
  s = act(s, { type: "control", id: s.opponents[0] });
  for (let i = 0; i < 3; i++) s = act(s, { type: "strike" });
  const outsider = s.families.find((f) => !s.opponents.includes(f.id));
  assert.equal(act(s, { type: "stealer", id: outsider.id }), s);
  const restored = JSON.parse(JSON.stringify(s));
  assert.equal(feudPresenter(restored).tournament.matches.length, 3);
  s = act(restored, { type: "reveal", index: 0 });
  assert.equal(activeMatch(s).scores[s.stealing], s.bank);
});

test("four families play the first pair, then the second pair, then a winners-only final", () => {
  let s = make(4, 1);
  assert.deepEqual(s.opponents, ["family-0", "family-1"]);
  s = scoreBoard(s, "family-1");
  assert.equal(s.phase, "match_complete");
  s = act(s, { type: "next_match" });
  assert.deepEqual(s.opponents, ["family-2", "family-3"]);
  s = scoreBoard(s, "family-3");
  s = act(s, { type: "next_match" });
  assert.deepEqual(s.opponents, ["family-1", "family-3"]);
  s = scoreBoard(s, "family-3");
  assert.equal(s.tournament.championId, "family-3");
});
test("padded brackets finish even when the final advancement is a bye", () => {
  for (let n = 2; n <= 12; n++)
    for (let rounds = requiredKnockoutRounds(n); rounds <= 4; rounds++) {
      let s = make(n, 1, rounds);
      let boards = 0;
      while (s.phase !== "finished") {
        assert.ok(boards < n);
        if (s.phase === "match_complete") {
          s = act(s, { type: "next_match" });
          continue;
        }
        s = scoreBoard(s, activeMatch(s).families[0]);
        boards++;
      }
      assert.equal(boards, n - 1);
      assert.ok(s.tournament.championId);
    }
});
test("standard is a separate format with cumulative scores and no eliminations", () => {
  const { startStandardState } = load("tournament");
  let s = startStandardState(
    newFeud(
      Array.from({ length: 4 }, (_, i) => ({
        name: `Family ${i}`,
        members: "",
      })),
      GENERAL_BIBLE,
      "standard",
    ),
    2,
    2,
  );
  assert.equal(s.tournament, undefined);
  assert.equal(s.questions.length, 4);
  s = scoreBoard(s, "family-0");
  assert.deepEqual(s.opponents, ["family-0", "family-1"]);
  s = scoreBoard(s, "family-0");
  assert.deepEqual(s.opponents, ["family-2", "family-3"]);
  s = scoreBoard(s, "family-2");
  s = scoreBoard(s, "family-2");
  assert.equal(s.phase, "finished");
  assert.equal(s.families.length, 4);
  assert.ok(s.families[0].score > 0);
  assert.ok(s.families[2].score > 0);
  assert.throws(
    () =>
      startStandardState(
        newFeud(
          [
            { name: "A", members: "" },
            { name: "B", members: "" },
          ],
          FAMILY_FUSION,
          "too-long",
        ),
        10,
        3,
      ),
    /needs 30 unique questions/,
  );
});
