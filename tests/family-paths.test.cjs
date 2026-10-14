const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
function load(file, dependencies = {}) {
  const output = ts.transpileModule(
    fs.readFileSync(path.join(__dirname, "..", file), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText;
  const mod = { exports: {} };
  new Function("require", "module", "exports", output)(
    (name) => dependencies[name] ?? require(name),
    mod,
    mod.exports,
  );
  return mod.exports;
}
const model = load("lib/families/model.ts");
const { familyPaths, familyLabel, relationshipLabel } = load(
  "lib/families/paths.ts",
  { "./model": model },
);
const people = [
  { id: "a", name: "Alex Baker", householdId: "bakers" },
  { id: "b", name: "Jordan White", householdId: "whites" },
  { id: "c", name: "Grace Green", householdId: "greens" },
  { id: "d", name: "Morgan Williams", householdId: "bakers" },
  { id: "e", name: "Robin Brown", householdId: null },
];
const link = (
  id,
  sourceId,
  targetId,
  kind = "cousin",
  status = "confirmed",
) => ({ id, sourceId, targetId, kind, status, notes: "" });
const data = {
  people,
  households: ["bakers", "whites", "greens"].map((id) => ({
    id,
    name: `The ${id}`,
  })),
  links: [
    link("ab", "a", "b"),
    link("bc", "b", "c", "spouse"),
    link("ca", "c", "d", "sibling", "pending"),
    link("ce", "c", "e", "parent"),
  ],
};
test("a family route explains actual bridge people without inventing an indirect kinship", () => {
  const paths = familyPaths(data, "bakers", 3);
  assert.deepEqual(
    paths.get("greens").map((s) => [s.from, s.to, s.link.id]),
    [
      ["bakers", "whites", "ab"],
      ["whites", "greens", "bc"],
    ],
  );
  assert.deepEqual(
    paths.get("person:e").map((s) => s.link.id),
    ["ab", "bc", "ce"],
  );
  assert.equal(familyLabel(data, "person:e"), "Robin Brown");
  assert.equal(
    relationshipLabel("aunt_uncle"),
    "Aunt or uncle / niece or nephew",
  );
  assert.equal(
    model.linkSentence(paths.get("greens")[1].link, people),
    "Jordan White and Grace Green are spouses",
  );
});
test("routes respect connection depth, work backwards and choose shortest verified paths through cycles", () => {
  assert.equal(familyPaths(data, "bakers", 1).has("greens"), false);
  assert.deepEqual(
    familyPaths(data, "greens", 2)
      .get("bakers")
      .map((s) => s.link.id),
    ["bc", "ab"],
  );
  const cyclic = {
    ...data,
    links: [...data.links, link("direct", "a", "c", "sibling")],
  };
  assert.deepEqual(
    familyPaths(cyclic, "bakers", 3)
      .get("greens")
      .map((s) => s.link.id),
    ["direct"],
  );
  assert.equal(familyPaths(cyclic, "bakers", 3).size, 4);
  assert.equal(familyPaths(data, "bakers", 0).size, 1);
});
