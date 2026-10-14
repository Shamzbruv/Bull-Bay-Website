import {
  familyCircle,
  familyNodeId,
  type FamilyData,
  type FamilyLink,
} from "./model";

export type FamilyPathStep = { from: string; to: string; link: FamilyLink };

/** Shortest verified household route. A route explains bridges, never inferred kinship. */
export function familyPaths(data: FamilyData, root: string, depth: number) {
  const circle = familyCircle(data.people, data.links, root, depth);
  const people = new Map(data.people.map((p) => [p.id, p]));
  const paths = new Map<string, FamilyPathStep[]>([[root, []]]);
  const queue = [root];
  for (let index = 0; index < queue.length; index++) {
    const from = queue[index]!;
    const path = paths.get(from)!;
    if (path.length >= depth) continue;
    for (const link of circle.links) {
      const a = familyNodeId(people.get(link.sourceId)!);
      const b = familyNodeId(people.get(link.targetId)!);
      const to = a === from ? b : b === from ? a : null;
      if (!to || paths.has(to)) continue;
      paths.set(to, [...path, { from, to, link }]);
      queue.push(to);
    }
  }
  return paths;
}

export function familyLabel(data: FamilyData, id: string) {
  return (
    data.households.find((h) => h.id === id)?.name ??
    data.people.find((p) => familyNodeId(p) === id)?.name ??
    "Household not assigned"
  );
}

export function relationshipLabel(kind: FamilyLink["kind"]) {
  const labels: Record<FamilyLink["kind"], string> = {
    parent: "Parent / child",
    child: "Child / parent",
    spouse: "Spouses",
    sibling: "Siblings",
    cousin: "Cousins",
    grandparent: "Grandparent / grandchild",
    grandchild: "Grandchild / grandparent",
    aunt_uncle: "Aunt or uncle / niece or nephew",
    niece_nephew: "Niece or nephew / aunt or uncle",
    guardian: "Guardian / dependent",
    dependent: "Dependent / guardian",
    step_parent: "Step-parent / child",
    step_child: "Step-child / parent",
    in_law: "Related by marriage",
    other: "Relatives",
  };
  return labels[kind];
}
