/**
 * Bull Bay launches as a single organization/campus, but the schema is
 * multi-tenant/multi-campus from day one (per blueprint recommendation) so
 * nothing has to be redesigned if a second campus or congregation joins the
 * platform later.
 */
export const ORGANIZATION_SLUG = process.env.NEXT_PUBLIC_ORGANIZATION_SLUG ?? "bull-bay";
export const PRIMARY_CAMPUS_SLUG = "bull-bay";

export const SITE_NAME = "New Testament Church of God, Bull Bay";
export const SITE_SHORT_NAME = "NTCOG Bull Bay";
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
