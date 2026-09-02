/**
 * All money is stored as integer minor units (JMD cents) — see
 * docs/DATA_MODEL.md. These helpers are the only place formatting/parsing
 * happens so the rule can't quietly drift.
 */

export function formatJmd(minorUnits: number): string {
  return new Intl.NumberFormat("en-JM", {
    style: "currency",
    currency: "JMD",
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(minorUnits / 100);
}

/** Parses a user-entered JMD amount (e.g. "2,500" or "2500.50") into minor units. */
export function parseJmdToMinorUnits(input: string): number | null {
  const cleaned = input.replace(/[^0-9.]/g, "");
  if (!cleaned) return null;
  const value = Number.parseFloat(cleaned);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100);
}
