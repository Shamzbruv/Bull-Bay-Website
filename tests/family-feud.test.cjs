const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
let ts;
try {
  ts = require("typescript");
} catch {
  ts = require("../tools/quiz/node_modules/typescript");
}
function load(file) {
  const output = ts.transpileModule(
    fs.readFileSync(
      path.join(__dirname, "..", "tools/quiz/src/lib/feud", file + ".ts"),
      "utf8",
    ),
    { compilerOptions: { module: ts.ModuleKind.CommonJS } },
  ).outputText;
  const mod = { exports: {} };
  new Function("module", "exports", "require", output)(
    mod,
    mod.exports,
    (name) => load(name.replace(/^\.\//, "")),
  );
  return mod.exports;
}
const { KINGS_THREE } = load("questions");
const { newFeud, feudReducer: act, feudPresenter } = load("engine");
const start = () =>
  newFeud(
    [
      { name: "Baker", members: "Shamar" },
      { name: "Page", members: "" },
      { name: "Williams", members: "" },
    ],
    KINGS_THREE,
    "test-game",
  );
const controlled = () => act(start(), { type: "control", id: "family-0" });
function threeStrikes(s) {
  for (let n = 0; n < 3; n++) s = act(s, { type: "strike" });
  return s;
}
test("all twelve boards have factual answer references and exactly 100 game points", () => {
  assert.equal(KINGS_THREE.length, 12);
  assert.equal(new Set(KINGS_THREE.map((q) => q.id)).size, 12);
  for (const q of KINGS_THREE) {
    assert.equal(
      q.answers.reduce((sum, a) => sum + a.points, 0),
      100,
    );
    assert.ok(q.answers.length >= 3);
    for (const a of q.answers) assert.match(a.reference, /^1 Kings 3:\d/);
  }
});
test("unrevealed answers and future boards never reach the audience payload", () => {
  const s = start(),
    view = feudPresenter(s);
  assert.ok(view.answers.every((a) => a === null));
  assert.ok(!JSON.stringify(view).includes("His own house"));
  assert.ok(!JSON.stringify(view).includes("Truthfulness"));
  assert.equal(view.questions, undefined);
  const revealed = feudPresenter(act(s, { type: "reveal", index: 0 }));
  assert.equal(revealed.answers[0].text, "His own house");
  assert.equal(revealed.answers[1], null);
});
test("reveal is idempotent and points are awarded exactly once", () => {
  let s = controlled();
  s = act(s, { type: "reveal", index: 0 });
  assert.equal(s.bank, 40);
  assert.equal(s.families[0].score, 0);
  assert.equal(act(s, { type: "reveal", index: 0 }), s);
  assert.equal(act(s, { type: "reveal", index: -1 }), s);
  s = act(s, { type: "award", id: "family-0" });
  assert.equal(s.families[0].score, 40);
  assert.equal(s.phase, "settled");
  assert.equal(act(s, { type: "award", id: "family-0" }), s);
  const all = act(s, { type: "showAll" });
  assert.equal(all.bank, 40);
  assert.equal(all.families[0].score, 40);
});
test("three strikes permit a successful steal, including a third family selected by host", () => {
  let s = act(controlled(), { type: "reveal", index: 0 });
  s = threeStrikes(s);
  assert.equal(s.phase, "steal");
  assert.equal(s.stealing, "family-1");
  assert.equal(act(s, { type: "award", id: "family-0" }), s);
  s = act(s, { type: "stealer", id: "family-2" });
  s = act(s, { type: "reveal", index: 1 });
  assert.equal(s.phase, "settled");
  assert.equal(s.families[2].score, 75);
  assert.equal(feudPresenter(s).control, "family-2");
  assert.equal(s.families[0].score, 0);
  assert.equal(act(s, { type: "stealFailed" }), s);
});
test("failed steal returns bank to original controlling family", () => {
  let s = threeStrikes(act(controlled(), { type: "reveal", index: 0 }));
  s = act(s, { type: "stealFailed" });
  assert.equal(s.families[0].score, 40);
  assert.equal(s.families[1].score, 0);
});
test("face-off points carry into play, and multipliers cannot change after a reveal", () => {
  let s = act(start(), { type: "multiplier", value: 3 });
  s = act(s, { type: "reveal", index: 0 });
  assert.equal(s.bank, 120);
  assert.equal(act(s, { type: "multiplier", value: 2 }), s);
  s = act(s, { type: "control", id: "family-1" });
  s = act(s, { type: "award", id: "family-1" });
  assert.equal(s.families[1].score, 120);
});
test("full boards reject strikes; next resets board and rotates families", () => {
  let s = controlled();
  for (let i = 0; i < 3; i++) s = act(s, { type: "reveal", index: i });
  assert.equal(act(s, { type: "strike" }), s);
  s = act(s, { type: "award", id: "family-0" });
  const next = act(s, { type: "next" });
  assert.equal(next.round, 1);
  assert.deepEqual(next.opponents, ["family-1", "family-2"]);
  assert.equal(next.bank, 0);
  assert.equal(next.strikes, 0);
  assert.deepEqual(next.revealed, []);
  assert.equal(next.families[0].score, 100);
});
test("every family gets a face-off across twelve boards; last board ends cleanly", () => {
  let s = newFeud(
    Array.from({ length: 12 }, (_, i) => ({
      name: `Family ${i}`,
      members: "",
    })),
    KINGS_THREE,
    "many",
  );
  const participants = new Set();
  for (let i = 0; i < 12; i++) {
    s.opponents.forEach((id) => participants.add(id));
    s = act(s, { type: "control", id: s.opponents[0] });
    s = act(s, { type: "award", id: s.control });
    s = act(s, { type: "next" });
  }
  assert.equal(participants.size, 12);
  assert.equal(s.phase, "finished");
  assert.equal(s.round, 11);
});
test("invalid team and score actions cannot corrupt totals; save and resume is faithful", () => {
  const s = controlled();
  assert.equal(act(s, { type: "award", id: "bad" }), s);
  assert.equal(act(s, { type: "adjust", id: "family-0", points: NaN }), s);
  assert.equal(act(s, { type: "adjust", id: "family-0", points: 1.5 }), s);
  assert.equal(
    act(s, { type: "adjust", id: "family-0", points: -50 }).families[0].score,
    0,
  );
  const restored = JSON.parse(JSON.stringify(s));
  assert.equal(
    JSON.stringify(feudPresenter(restored)),
    JSON.stringify(feudPresenter(s)),
  );
  assert.equal(
    JSON.stringify(act(restored, { type: "reveal", index: 0 })),
    JSON.stringify(act(s, { type: "reveal", index: 0 })),
  );
  assert.throws(() =>
    newFeud(
      [
        { name: "Baker", members: "" },
        { name: " baker ", members: "" },
      ],
      KINGS_THREE,
      "bad",
    ),
  );
});

test("renaming families updates audience labels without losing game progress", () => {
  const s = act(act(controlled(), { type: "reveal", index: 0 }), {
    type: "award",
    id: "family-0",
  });
  const renamed = act(s, {
    type: "rename",
    names: {
      "family-0": "Brown family",
      "family-1": "Smith family",
      "family-2": "Baker family",
    },
  });
  assert.equal(feudPresenter(renamed).families[0].name, "Brown family");
  assert.equal(renamed.families[0].score, 40);
  assert.equal(renamed.phase, s.phase);
  assert.deepEqual(renamed.revealed, s.revealed);
  assert.equal(
    act(s, {
      type: "rename",
      names: { "family-0": "Same", "family-1": "same", "family-2": "Baker" },
    }),
    s,
  );
});
