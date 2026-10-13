import { z } from "zod";
export const relationshipOptions = [
  ["parent", "Parent"],
  ["child", "Child"],
  ["spouse", "Spouse"],
  ["sibling", "Sibling"],
  ["cousin", "Cousin"],
  ["grandparent", "Grandparent"],
  ["grandchild", "Grandchild"],
  ["aunt_uncle", "Aunt / uncle"],
  ["niece_nephew", "Niece / nephew"],
  ["guardian", "Guardian"],
  ["dependent", "Dependent"],
  ["step_parent", "Step-parent"],
  ["step_child", "Step-child"],
  ["in_law", "In-law"],
  ["other", "Other relative"],
] as const;
export type RelationshipKind = (typeof relationshipOptions)[number][0];
export type FamilyPerson = {
  id: string;
  name: string;
  householdId: string | null;
  updatedAt: string;
};
export type FamilyHousehold = {
  id: string;
  name: string;
  description: string;
  updatedAt: string;
};
export type FamilyLink = {
  id: string;
  sourceId: string;
  targetId: string;
  kind: RelationshipKind;
  notes: string;
  status: string;
  recipientId: string;
  requestedBy: string;
  updatedAt: string;
};
export type FamilyInvite = {
  id: string;
  householdId: string;
  sourceId: string;
  targetId: string;
  status: string;
  updatedAt: string;
};
export type FamilyData = {
  viewerId: string;
  viewerUserId: string;
  householdId: string | null;
  people: FamilyPerson[];
  households: FamilyHousehold[];
  links: FamilyLink[];
  invitations: FamilyInvite[];
  staff: boolean;
  canManage: boolean;
  readOnly?: boolean;
};
export const householdInput = z.object({
  name: z.string().trim().min(2, "Enter a family name.").max(120),
  description: z.string().trim().max(1000),
});
export const linkInput = z.object({
  kind: z.enum(relationshipOptions.map((x) => x[0])),
  notes: z.string().trim().max(1000),
  email: z.union([z.email(), z.literal("")]),
  sourceId: z.union([z.uuid(), z.literal("")]),
  targetId: z.union([z.uuid(), z.literal("")]),
});
const inverse: Partial<Record<RelationshipKind, RelationshipKind>> = {
  child: "parent",
  grandchild: "grandparent",
  niece_nephew: "aunt_uncle",
  dependent: "guardian",
  step_child: "step_parent",
};
const symmetric = new Set<RelationshipKind>([
  "spouse",
  "sibling",
  "cousin",
  "in_law",
  "other",
]);
export function normalizeLink(
  sourceId: string,
  targetId: string,
  kind: RelationshipKind,
) {
  if (sourceId === targetId) throw new Error("Choose two different people.");
  if (inverse[kind])
    return { sourceId: targetId, targetId: sourceId, kind: inverse[kind]! };
  if (symmetric.has(kind) && sourceId > targetId)
    return { sourceId: targetId, targetId: sourceId, kind };
  return { sourceId, targetId, kind };
}
export function linkSentence(
  link: Pick<FamilyLink, "sourceId" | "targetId" | "kind">,
  people: FamilyPerson[],
) {
  const a =
    people.find((p) => p.id === link.sourceId)?.name ??
    "Person no longer available";
  const b =
    people.find((p) => p.id === link.targetId)?.name ??
    "Person no longer available";
  const phrases: Record<RelationshipKind, string> = {
    parent: `${a} is a parent of ${b}`,
    child: `${a} is a child of ${b}`,
    spouse: `${a} and ${b} are spouses`,
    sibling: `${a} and ${b} are siblings`,
    cousin: `${a} and ${b} are cousins`,
    grandparent: `${a} is a grandparent of ${b}`,
    grandchild: `${a} is a grandchild of ${b}`,
    aunt_uncle: `${a} is an aunt or uncle of ${b}`,
    niece_nephew: `${a} is a niece or nephew of ${b}`,
    guardian: `${a} is a guardian of ${b}`,
    dependent: `${a} is a dependent of ${b}`,
    step_parent: `${a} is a step-parent of ${b}`,
    step_child: `${a} is a step-child of ${b}`,
    in_law: `${a} and ${b} are related by marriage`,
    other: `${a} and ${b} are relatives`,
  };
  return phrases[link.kind];
}
export function familyNodeId(person: FamilyPerson) {
  return person.householdId ?? `person:${person.id}`;
}
/** Expand through confirmed person links and household membership; never infer kinship. */
export function familyCircle(
  people: FamilyPerson[],
  links: FamilyLink[],
  root: string,
  depth: number,
) {
  const byId = new Map(people.map((p) => [p.id, p]));
  const levels = new Map<string, number>([[root, 0]]);
  const confirmed = links.filter(
    (l) =>
      l.status === "confirmed" && byId.has(l.sourceId) && byId.has(l.targetId),
  );
  for (let level = 0; level < Math.min(3, Math.max(0, depth)); level++)
    for (const l of confirmed) {
      const a = familyNodeId(byId.get(l.sourceId)!);
      const b = familyNodeId(byId.get(l.targetId)!);
      if (levels.get(a) === level && !levels.has(b)) levels.set(b, level + 1);
      if (levels.get(b) === level && !levels.has(a)) levels.set(a, level + 1);
    }
  const visible = confirmed.filter(
    (l) =>
      levels.has(familyNodeId(byId.get(l.sourceId)!)) &&
      levels.has(familyNodeId(byId.get(l.targetId)!)),
  );
  return { levels, links: visible };
}
/** Send full rosters only for the viewer's household; other families expose link participants. */
export function memberFamilyData(data: FamilyData): FamilyData {
  const viewer = data.people.find((p) => p.id === data.viewerId);
  if (!viewer)
    return { ...data, people: [], households: [], links: [], invitations: [] };
  const root = familyNodeId(viewer);
  const circle = familyCircle(data.people, data.links, root, 3);
  const ownIds = new Set(
    data.people
      .filter(
        (p) =>
          p.id === viewer.id ||
          (viewer.householdId && p.householdId === viewer.householdId),
      )
      .map((p) => p.id),
  );
  const personalLinks = data.links.filter(
    (l) => l.sourceId === viewer.id || l.targetId === viewer.id,
  );
  const links = [
    ...new Map(
      [...circle.links, ...personalLinks].map((l) => [l.id, l]),
    ).values(),
  ];
  const ids = new Set([
    ...ownIds,
    ...links.flatMap((l) => [l.sourceId, l.targetId]),
  ]);
  // An unconfirmed target's name/family is disclosed only to the recipient;
  // the requester can see the request without receiving a directory lookup.
  const confirmedIds = new Set(
    circle.links.flatMap((l) => [l.sourceId, l.targetId]),
  );
  const invitations = data.invitations.filter(
    (i) => i.sourceId === viewer.id || i.targetId === viewer.id,
  );
  for (const i of invitations)
    if (i.targetId === viewer.id) ids.add(i.sourceId);
  const hidden = new Set(
    personalLinks
      .filter(
        (l) =>
          l.status === "pending" &&
          l.requestedBy === data.viewerUserId &&
          !confirmedIds.has(l.recipientId),
      )
      .map((l) => l.recipientId),
  );
  const people = data.people
    .filter((p) => ids.has(p.id))
    .map((p) =>
      hidden.has(p.id) && !ownIds.has(p.id)
        ? { ...p, name: "Relative (confirmation pending)", householdId: null }
        : p,
    );
  const householdIds = new Set(
    people.flatMap((p) => (p.householdId ? [p.householdId] : [])),
  );
  for (const i of invitations)
    if (i.targetId === viewer.id) householdIds.add(i.householdId);
  return {
    ...data,
    people,
    households: data.households.filter((h) => householdIds.has(h.id)),
    links,
    invitations,
  };
}
