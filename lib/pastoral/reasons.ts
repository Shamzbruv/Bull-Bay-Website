/**
 * Hardcoded reasons a member can request time with the pastor or pastoral
 * team about. Kept as a fixed list (rather than free text) so requests are
 * easy to triage at a glance — "Other" always covers anything not listed.
 */
export const COUNSEL_REQUEST_REASONS = [
  "Pastoral counselling — general",
  "Marriage or pre-marital counselling",
  "Grief & bereavement support",
  "Spiritual guidance / discipleship",
  "Family or relationship matter",
  "Financial hardship guidance",
  "Baptism or membership discussion",
  "Hospital or home visitation request",
  "Conflict resolution / mediation",
  "Document, certificate, or letter follow-up",
  "Other pastoral matter",
] as const;

export const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;
